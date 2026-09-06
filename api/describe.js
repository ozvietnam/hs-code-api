const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { getTaxRecord, normalizeHs } = require('../lib/data');
const { mapTaxRecord } = require('../lib/tax-mapper');
const { geminiGenerateJson } = require('../lib/gemini');
const { SYSTEM_PROMPT, buildChapterFieldsPrompt } = require('../lib/customs-prompt');
const { composeWithMeta } = require('../lib/describe-compose');
const { validateDeclaration, normalizeDeclaration } = require('../lib/declaration-validator');
const { captureError } = require('../lib/error-monitor');
const { checkTrademarkRisk } = require('../lib/trademark-watch');

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (requireAuth(req, res)) return;

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const hsCode = normalizeHs(body?.hsCode || body?.hs);
  if (!hsCode || hsCode === '00000000') {
    return res.status(400).json({ error: 'hsCode is required' });
  }

  const tariff = getTaxRecord(hsCode);
  if (!tariff) {
    return res.status(404).json({
      found: false,
      message: `HS code ${hsCode} not found in tariff data`,
    });
  }

  const mapped = mapTaxRecord(tariff);
  const context = {
    productName: body?.productName || mapped.nameVi,
    brand: body?.brand || null,
    model: body?.model || null,
    origin: body?.origin || null,
    material: body?.material || null,
    condition: body?.condition || null,
    technicalSpec: body?.technicalSpec || null,
    purpose: body?.purpose || null,
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

    try {
      const chapterHint = buildChapterFieldsPrompt(hsCode.slice(0, 2), hsCode);
      const { json, model } = await geminiGenerateJson({
        systemPrompt: SYSTEM_PROMPT + chapterHint,
        userPrompt: JSON.stringify(payload, null, 2),
        modelEnv: 'GEMINI_DESCRIBE_MODEL',
        defaultModel: 'gemini-2.5-flash',
      });
      llmModel = model;
      declaration = normalizeDeclaration(json, context);
    } catch (error) {
      captureError(error, { endpoint: 'describe', hsCode });
      if (error.code === 'GEMINI_NOT_CONFIGURED') {
        return res.status(503).json({ error: 'Gemini is not configured', detail: error.message });
      }
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

  return res.status(200).json({
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
};
