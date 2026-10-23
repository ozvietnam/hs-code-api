const inflight = require('../lib/inflight');
const { taxData } = require('../lib/data');
const { isApiTokenConfigured } = require('../lib/auth');
const { ozGoldStats } = require('../lib/oz-precedent-search');
const { setCors, handleOptions } = require('../lib/cors');
// Soi đúng chuỗi fallback thật, không chỉ mỗi Gemini — nếu không, mất sạch key
// mà health vẫn báo "healthy" trong khi /api/suggest + /api/describe đã chết.
const { llmStatus } = require('../lib/llm-tier');
// Dữ liệu có thể lỗi thời mà service vẫn "healthy" — báo riêng, không đổi mã HTTP.
const { freshnessReport } = require('../lib/data-freshness');

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
  const freshness = freshnessReport();
  // #418: đang xả (SIGTERM) → 503 'draining' để healthcheck/LB ngừng đưa lượt mới; lượt đang chạy vẫn được chờ.
  const draining = inflight.laDangXa();

  return res.status(healthy && !draining ? 200 : 503).json({
    service: 'hs-code-api',
    version: '2.0.0',
    status: draining ? 'draining' : healthy ? 'healthy' : 'degraded',
    // 'stale' = có nguồn quá hạn đối chiếu / sắp hoặc đã hết hiệu lực (xem checks.dataFreshness).
    dataStatus: freshness.ok ? 'fresh' : 'stale',
    checks: {
      taxData: { ok: rows > 0, rows },
      ozGold: ozGoldStats(),
      llm,
      geminiKey: { ok: llm.gemini },
      apiToken: { ok: apiToken },
      dataFreshness: freshness,
      // #418: số lượt HTTP đang chạy (classify dài) + cờ đang xả — deploy-safe.sh đọc trước khi thay container.
      engine: { inflight: inflight.soDangChay(), draining },
    },
    stats: {
      withPolicyWarnings: withPolicy,
    },
    timestamp: new Date().toISOString(),
  });
};
