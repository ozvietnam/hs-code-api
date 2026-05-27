const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { getTaxRecord, normalizeHs } = require('../lib/data');
const { mapTaxRecord } = require('../lib/tax-mapper');
const { geminiGenerateJson } = require('../lib/gemini');

const SYSTEM_PROMPT = `Bạn là chuyên gia soạn mô tả khai báo hải quan Việt Nam.
Sinh mô tả có đặc điểm khu biệt để tránh chất vấn.
Chỉ trả JSON đúng schema:
{
  "customsDescription": "...",
  "structure": {
    "productName": "...",
    "brand": "...",
    "model": "...",
    "origin": "...",
    "condition": "...",
    "technicalSpec": "..."
  },
  "disambiguationFeaturesIncluded": ["brand", "model"],
  "disambiguationFeaturesMissing": [],
  "warnings": []
}`;

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
  const payload = {
    hsCode,
    productName: body?.productName || mapped.nameVi,
    brand: body?.brand || null,
    model: body?.model || null,
    origin: body?.origin || null,
    material: body?.material || null,
    condition: body?.condition || null,
    technicalSpec: body?.technicalSpec || null,
    purpose: body?.purpose || null,
    customerDescription: body?.customerDescription || null,
    tariffContext: {
      nameVi: mapped.nameVi,
      unitVi: mapped.unitVi,
      policyByHs: mapped.policyByHs,
      warnings: mapped.warnings,
    },
  };

  try {
    const { json, model, ms } = await geminiGenerateJson({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: JSON.stringify(payload, null, 2),
      modelEnv: 'GEMINI_DESCRIBE_MODEL',
      defaultModel: 'gemini-2.5-flash',
    });

    return res.status(200).json({
      ...json,
      llmModel: model,
      contextUsed: {
        tariffFound: true,
        policyByHs: mapped.policyByHs,
        hsCode,
      },
      ms,
    });
  } catch (error) {
    if (error.code === 'GEMINI_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'Gemini is not configured', detail: error.message });
    }
    return res.status(502).json({ error: 'Describe failed', detail: error.message });
  }
};
