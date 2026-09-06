const { taxData } = require('../lib/data');
const { isApiTokenConfigured } = require('../lib/auth');
const { ozGoldStats } = require('../lib/oz-precedent-search');
const { setCors, handleOptions } = require('../lib/cors');
// Soi đúng chuỗi fallback thật, không chỉ mỗi Gemini — nếu không, mất sạch key
// mà health vẫn báo "healthy" trong khi /api/suggest + /api/describe đã chết.
const { llmStatus } = require('../lib/llm-tier');

module.exports = function handler(req, res) {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  const withPolicy = Object.values(taxData).filter((r) => r.cs && String(r.cs).trim()).length;
  const rows = Object.keys(taxData).length;
  const llm = llmStatus();
  const apiToken = isApiTokenConfigured();

  // Chỉ "healthy" khi cả 3 mục tiêu lõi đều phục vụ được:
  // tra thuế (taxData) + auth (apiToken) + AI suggest/describe (llm).
  const healthy = rows > 0 && apiToken && llm.ok;

  return res.status(healthy ? 200 : 503).json({
    service: 'hs-code-api',
    version: '2.0.0',
    status: healthy ? 'healthy' : 'degraded',
    checks: {
      taxData: { ok: rows > 0, rows },
      ozGold: ozGoldStats(),
      llm,
      geminiKey: { ok: llm.gemini },
      apiToken: { ok: apiToken },
    },
    stats: {
      withPolicyWarnings: withPolicy,
    },
    timestamp: new Date().toISOString(),
  });
};
