// lib/describe-core.js — lõi của POST /api/describe, tách khỏi handler để
// /api/declaration-sheet (phiếu hồ sơ khai báo) dùng lại đúng một đường sinh mô tả.
// Trả { status, json } thay vì ghi thẳng vào res.

const { understandQuery } = require('./query-understand');
const { getTaxRecord, normalizeHs } = require('./data');
const { mapTaxRecord } = require('./tax-mapper');
// Gọi qua module (không destructure) để test mock được chuỗi fallback.
const llmTier = require('./llm-tier');
const { SYSTEM_PROMPT, buildChapterFieldsPrompt } = require('./customs-prompt');
const { composeWithMeta } = require('./describe-compose');
const { validateDeclaration, normalizeDeclaration } = require('./declaration-validator');
const { captureError } = require('./error-monitor');
const { checkTrademarkRisk } = require('./trademark-watch');
const { describeAttributes } = require('./describe-attributes');

const reply = (status, json) => ({ status, json });

/** describeProduct(body) → { status, json } — cùng hợp đồng với POST /api/describe. */
async function describeProduct(body) {
  const hsCode = normalizeHs(body?.hsCode || body?.hs);
  if (!hsCode || hsCode === '00000000') {
    return reply(400, { error: 'hsCode is required' });
  }

  const tariff = getTaxRecord(hsCode);
  if (!tariff) {
    return reply(404, {
      found: false,
      message: `HS code ${hsCode} not found in tariff data`,
    });
  }

  const mapped = mapTaxRecord(tariff);
  // Tên hàng tiếng Trung (tiêu đề Taobao) → tên hàng tiếng Việt trước khi soạn mô
  // tả; bản gốc giữ lại để kiểm xuất xứ (vd 墨西哥 → hàng Mexico, không phải TQ).
  const rawName = String(body?.productName || '').trim();
  const understood = rawName ? await understandQuery(rawName) : { applied: false, facts: null };
  // H5: thông số đã chuẩn hóa từ ERP (khóa chuẩn → giá trị tiếng Việt) — dùng thay chữ
  // Trung thô khi soạn mô tả. Giá trị còn chữ Hán bị bỏ, báo lại ở attributesSkipped.
  const attrs = describeAttributes(body?.attributes);
  const context = {
    productName: understood.applied
      ? [understood.facts.tenHangVi, understood.facts.quyCach].filter(Boolean).join(', ')
      : (body?.productName || mapped.nameVi),
    sourceText: [rawName, body?.customerDescription].filter(Boolean).join(' | ') || null,
    detectedOrigin: understood.facts?.noiSanXuat || null,
    brand: body?.brand || attrs.brand || understood.facts?.thuongHieu || null,
    model: body?.model || attrs.model || null,
    origin: body?.origin || null,
    material: body?.material || attrs.material || understood.facts?.chatLieu || null,
    condition: body?.condition || null,
    technicalSpec: [body?.technicalSpec, attrs.technicalSpec].filter(Boolean).join('; ') || null,
    purpose: body?.purpose || attrs.purpose || understood.facts?.congDung || null,
    customerDescription: body?.customerDescription || null,
    unitVi: mapped.unitVi,
    tariffNameVi: mapped.nameVi,
  };

  const started = Date.now();
  let declaration;
  let llmModel = null;
  // Cờ báo LLM lỗi → mô tả rơi về fallback context thô (không im lặng nữa).
  let llmError = null;

  if (body?.declaration && body?.validateOnly) {
    declaration = normalizeDeclaration(body, context);
  } else {
    const payload = {
      hsCode,
      chapter: hsCode.slice(0, 2),
      ...context,
      tariffContext: {
        nameVi: mapped.nameVi,
        unitVi: mapped.unitVi,
        policyByHs: mapped.policyByHs,
        warnings: mapped.warnings,
      },
    };

    const chapterHint = buildChapterFieldsPrompt(hsCode.slice(0, 2), hsCode);
    const systemPrompt = SYSTEM_PROMPT + chapterHint;
    const userPrompt = JSON.stringify(payload, null, 2);
    try {
      // Cùng thứ tự với mọi endpoint (lib/llm-tier.js): Gemini miễn phí → dự phòng
      // (MiniMax…) → khóa Gemini trả phí chỉ khi không còn đường nào.
      const result = await llmTier.callLLMJson(systemPrompt, userPrompt, {
        step: 'describe', tier: 'standard', timeoutMs: 45000, geminiModelEnv: 'GEMINI_DESCRIBE_MODEL',
      });
      llmModel = result.model;
      declaration = normalizeDeclaration(result.json, context);
    } catch (error) {
      captureError(error, { endpoint: 'describe', hsCode });
      // Hết provider vẫn trả bản khai dựng từ dữ kiện người dùng (degraded),
      // KHÔNG 503 — mô hình/ERP phía trên vẫn có khung để làm việc tiếp.
      declaration = normalizeDeclaration(
        {
          declaration: {
            tenHang: context.productName,
            xuatXu: context.origin,
            donViTinh: context.unitVi,
            tinhTrang: context.condition,
            nhanHieu: context.brand,
            model: context.model,
            thongSoKyThuat: context.technicalSpec ? [context.technicalSpec] : [],
            thanhPhanCauTao: context.material,
            congDung: context.purpose,
          },
        },
        context
      );
      llmModel = null;
      // Phân loại lỗi tạm thời (nên retry) vs vĩnh viễn — để MCP/ERP xử đúng.
      const errText = `${error.code || ''} ${error.status || ''} ${error.message || ''}`;
      const retryable = /429|rate|quota|timeout|etimedout|econnreset|503|500|overload|unavailable/i.test(errText);
      llmError = {
        code: error.code || 'GEMINI_ERROR',
        message: error.message || 'LLM generation failed',
        retryable,
      };
    }
  }

  const compliance = validateDeclaration(declaration, hsCode, context);
  const composed = composeWithMeta(declaration);

  // Không fail-silent: LLM lỗi → mô tả là fallback context thô, báo rõ vào warnings.
  if (llmError) {
    compliance.warnings.push({
      code: 'DESCRIPTION_DEGRADED',
      field: 'customsDescription',
      severity: 'warn',
      message: `Mô tả sinh ở chế độ dự phòng (không qua AI) do LLM lỗi: ${llmError.message}. ${
        llmError.retryable ? 'Lỗi tạm thời — nên gọi lại.' : 'Cần kiểm tra cấu hình/model LLM.'
      }`,
      suggestion: 'Chạy lại /api/describe khi LLM sẵn sàng để có mô tả chuẩn TT 39/2018.',
    });
  }

  // P2: cảnh báo rủi ro nhãn hiệu được bảo hộ (TT 13/2015 & 13/2020).
  // Tách trục riêng với điểm compliance TT 39/2018 — chỉ thêm 1 cảnh báo mềm.
  const trademarkRisk = checkTrademarkRisk({
    brand: declaration.nhanHieu || context.brand,
    text: `${declaration.tenHang || ''} ${context.customerDescription || ''}`,
    hsCode,
    origin: declaration.xuatXu?.nameVi || declaration.xuatXu?.code || context.origin,
  });
  if (trademarkRisk.matched) {
    compliance.warnings.push({
      code: 'TRADEMARK_WATCH',
      field: 'nhanHieu',
      severity: trademarkRisk.riskLevel === 'CRITICAL' || trademarkRisk.riskLevel === 'HIGH' ? 'error' : 'warn',
      message: trademarkRisk.summary,
      suggestion: trademarkRisk.matches[0]?.recommendations?.[0],
    });
  }

  return reply(200, {
    declaration,
    customsDescription: composed.text,
    descriptionMeta: {
      length: composed.length,
      maxLength: composed.maxLength,
      truncated: composed.truncated,
      fullLength: composed.fullLength,
      dropped: composed.dropped,
      ...(composed.truncated ? { fullText: composed.fullText } : {}),
    },
    compliance,
    trademarkRisk,
    attributesUsed: attrs.used,
    ...(attrs.skipped.length ? { attributesSkipped: attrs.skipped } : {}),
    llmModel,
    degraded: llmError !== null,
    llmError,
    contextUsed: {
      tariffFound: true,
      policyByHs: mapped.policyByHs,
      hsCode,
    },
    ms: Date.now() - started,
  });
}

module.exports = { describeProduct };
