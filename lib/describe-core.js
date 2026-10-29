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
const { checkTrademarkRiskEnriched } = require('./trademark-watch');
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
  // #324: nhóm máy (84/85 — template bắt buộc power/voltage): thông số không bị hy sinh trước phụ đề.
  const CHUONG_MAY = new Set(['84', '85']);
  // Vòng 1 (CEO 28/10): neo mô tả vào NGÔN NGỮ BIỂU THUẾ — tên đúng nhánh 2/4/6/8,
  // dòng "Loại khác" dùng phạm vi thật. KHÔNG còn mệnh đề "không gồm": mã anh em bị trừ lấy từ data/hs-context.json
  // (AI_CHUA_KIEM) — không vào mô tả khai báo (L0c #556); loại trừ quay lại ở L1-5c từ hoSo.loaiTru đã kiểm.
  let legalHead = null;
  try {
    const { breadcrumbOf } = require('./hs-breadcrumb.js');
    const { anchorTenBieuThue, gopMoTaPhapLy } = await import('./describe-legal-head.mjs');
    const bc = breadcrumbOf(hsCode) || null;
    if (bc) {
      const neo = anchorTenBieuThue({ tenHangKhach: declaration.tenHang || context.productName, breadcrumb: bc });
      const nhanDien = [declaration.nhanHieu && declaration.nhanHieu !== 'N/A' ? `nhãn hiệu ${declaration.nhanHieu}` : null, declaration.model ? `model ${declaration.model}` : null].filter(Boolean);
      const thongSoBatBuoc = CHUONG_MAY.has(hsCode.slice(0, 2))
        ? (Array.isArray(declaration.thongSoKyThuat) ? declaration.thongSoKyThuat.filter(Boolean).filter((sp) => /\b\d+(?:[.,]\d+)?\s*(kw|w|hp|kva|v|a)\b/i.test(sp)) : []).slice(0, 2)
        : [];
      const duoi = [declaration.xuatXu?.nameVi ? `xuất xứ ${declaration.xuatXu.nameVi}` : null, declaration.tinhTrang].filter(Boolean);
      legalHead = gopMoTaPhapLy({ neo, nhanDien, thongSoBatBuoc, loaiTranh: [], duoi });
      if (legalHead && legalHead.text) legalHead._breadcrumb = { selfVi: bc.selfVi, scopeVi: bc.scopeVi || null, headingVi: bc.headingVi };
    }
  } catch { /* tầng neo pháp lý là tuỳ chọn: lỗi ở đây giữ mô tả compose cũ */ }
  const composed = legalHead && legalHead.text
    ? { text: legalHead.text, length: legalHead.text.length, fullText: legalHead.text, fullLength: legalHead.text.length, truncated: false, dropped: legalHead.dropped, maxLength: 200 }
    : composeWithMeta(declaration, { keepSpecs: CHUONG_MAY.has(hsCode.slice(0, 2)) });
  const specsVao = Array.isArray(declaration?.thongSoKyThuat) ? declaration.thongSoKyThuat.filter(Boolean).length : 0;
  const specsRa = (composed.text.match(/thông số: ([^;]*)/) ? (composed.text.split('thông số: ')[1] || '').split('; ').filter(Boolean).length : 0);
  if (specsVao > 0 && specsRa === 0 && composed.dropped.some((d) => d.startsWith('thongSoKyThuat'))) {
    compliance.warnings.push({ code: 'SPEC_DROPPED', messageVi: `Toàn bộ ${specsVao} thông số bị cắt cho vừa 200 ký tự ECUS — rút ngắn tên hàng/thành phần hoặc tách dòng để giữ công suất/điện áp (trường bắt buộc theo template chương).` });
  }

  // Không fail-silent: LLM lỗi → mô tả là fallback context thô, báo rõ vào warnings.
  if (llmError) {
    compliance.warnings.push({
      code: 'DESCRIPTION_DEGRADED',
      field: 'customsDescription',
      severity: 'warn',
      message: `Mô tả sinh ở chế độ dự phòng (không qua AI) do LLM lỗi: ${llmError.message}. ${
        llmError.retryable ? 'Lỗi tạm thời — nên gọi lại.' : 'Cần kiểm tra cấu hình/model LLM.'
      }`,
      suggestion: 'Chạy lại /api/describe khi LLM sẵn sàng để có mô tả đầy đủ.',
    });
  }

  // P2: cảnh báo rủi ro nhãn hiệu được bảo hộ (TT 13/2015 & 13/2020).
  // Tách trục riêng với điểm compliance TT 39/2018 — chỉ thêm 1 cảnh báo mềm.
  const trademarkRisk = await checkTrademarkRiskEnriched({
    brand: declaration.nhanHieu || context.brand,
    text: `${declaration.tenHang || ''} ${context.customerDescription || ''}`,
    hsCode,
    origin: declaration.xuatXu?.nameVi || declaration.xuatXu?.code || context.origin,
    importer: context.importer || context.importerName || undefined,
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

  // Vòng 2 (CEO 29/10): trường bắt buộc còn thiếu → ghi rõ "(thiếu: X, Y)" trong mô tả;
  // webFacts tự tìm được thì bổ sung vào chapterSpecific trước, còn thiếu mới mở ngoặc.
  let customsDescriptionV2 = composed.text;
  let factTuTim = null;
  try {
    const { boTruongThieuVaoMoTa, gopVong2, rutGiaTriTheoNhan } = await import('./describe-missing-inline.mjs');
    const thieu = (compliance.missingRequired || []).map((k) => {
      const key = String(k).split('.').pop();
      return { key, labelVi: key };
    });
    if (thieu.length) {
      // Tự tìm 1 lượt web theo nhãn trường thiếu (chỉ khi có key ZAI) — CHỈ nhãn hiệu/model + khoá trường,
      // không bao giờ tên hàng của khách (L0a #546): không hiệu/model thì không tra web.
      let fact = {};
      try {
        const brand = declaration.nhanHieu && declaration.nhanHieu !== 'N/A' ? declaration.nhanHieu : null;
        const model = declaration.model || null;
        const { webFacts } = require('./web-facts.js');
        const wf = (brand || model) ? await webFacts({
          brand,
          model,
          mucTieu: thieu.map((t) => t.labelVi).join(', ').slice(0, 200),
        }) : null;
        if (wf && wf.cauTraLoi) {
          const text = wf.cauTraLoi;
          for (const t of thieu) {
            const giaTri = rutGiaTriTheoNhan(text, t.labelVi);
            if (giaTri) fact[t.key] = giaTri;
          }
        }
      } catch { /* web là tuỳ chọn */ }
      factTuTim = Object.keys(fact).length ? fact : null;
      const { conThieu } = gopVong2({ missingRequired: thieu, factTimDuoc: fact });
      if (conThieu.length) {
        const rt = boTruongThieuVaoMoTa({ text: composed.text, missingRequired: conThieu });
        customsDescriptionV2 = rt.text;
      }
    }
  } catch { /* vòng 2 là tầng tuỳ chọn */ }

  return reply(200, {
    declaration,
    customsDescription: customsDescriptionV2,
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
