const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { getTaxRecord, normalizeHs } = require('../lib/data');
const { mapTaxRecord } = require('../lib/tax-mapper');
const { geminiGenerateJson } = require('../lib/gemini');
const { SYSTEM_PROMPT } = require('../lib/customs-prompt');
const { composeCustomsDescription } = require('../lib/describe-compose');
const { validateDeclaration, normalizeDeclaration } = require('../lib/declaration-validator');

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
      const { json, model } = await geminiGenerateJson({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: JSON.stringify(payload, null, 2),
        modelEnv: 'GEMINI_DESCRIBE_MODEL',
        defaultModel: 'gemini-2.5-flash',
      });
      llmModel = model;
      declaration = normalizeDeclaration(json, context);
    } catch (error) {
      if (error.code === 'GEMINI_NOT_CONFIGURED') {
        return res.status(503).json({ error: 'Gemini is not configured', detail: error.message });
      }
      declaration = normalizeDeclaration(
        {
          declaration: {
            tenHang: context.productName,
            xuatXu: context.origin,
            donViTinh: context.unitVi,
            tinhTrang: context.condition || 'Mới 100%',
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
    }
  }

  const compliance = validateDeclaration(declaration, hsCode, context);
  const customsDescription = composeCustomsDescription(declaration);

  return res.status(200).json({
    declaration,
    customsDescription,
    compliance,
    llmModel,
    contextUsed: {
      tariffFound: true,
      policyByHs: mapped.policyByHs,
      hsCode,
    },
    ms: Date.now() - started,
  });
};
