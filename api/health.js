const { taxData } = require('../lib/data');
const { isApiTokenConfigured } = require('../lib/auth');
const { ozGoldStats } = require('../lib/oz-precedent-search');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const withPolicy = Object.values(taxData).filter((r) => r.cs && String(r.cs).trim()).length;

  return res.status(200).json({
    service: 'hs-code-api',
    version: '2.0.0',
    status: 'healthy',
    checks: {
      taxData: { ok: true, rows: Object.keys(taxData).length },
      ozGold: ozGoldStats(),
      geminiKey: { ok: Boolean(process.env.GEMINI_API_KEY) },
      apiToken: { ok: isApiTokenConfigured() },
    },
    stats: {
      withPolicyWarnings: withPolicy,
    },
    timestamp: new Date().toISOString(),
  });
};
