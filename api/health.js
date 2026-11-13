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
// Postgres (L0g, #545) là tầng TUỲ CHỌN: chỉ báo trạng thái, không đổi mã HTTP / "healthy". Không lộ URL/host.
const { dbDaCauHinh, trangThaiDb } = require('../lib/db');
// OZV-724: bản đang chạy (SHA commit + thời điểm dựng ảnh) để mọi phép đo prod biết đang đo bản nào.
// Chỉ đọc biến môi trường do Docker build ghi vào; thiếu ⇒ null, không bao giờ ném.
const { banDung } = require('../lib/ban-dung');

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

  const ban = banDung();

  const traLoi = (db) => res.status(healthy && !draining ? 200 : 503).json({
    service: 'hs-code-api',
    version: '2.0.0',
    // SHA ngắn của bản đang chạy + thời điểm dựng ảnh (null khi build không truyền biến vào).
    commit: ban.commit,
    buildTime: ban.buildTime,
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
      // 'OK' | 'CHUA_CAU_HINH' (chưa đặt HS_DATABASE_URL — tính năng DB tắt) | 'LOI'
      db,
    },
    stats: {
      withPolicyWarnings: withPolicy,
    },
    timestamp: new Date().toISOString(),
  });

  // Chưa cấu hình DB → trả lời ĐỒNG BỘ như trước khi có DB; có DB → chờ SELECT 1 (hạn 2 s, không bao giờ ném).
  if (!dbDaCauHinh()) return traLoi('CHUA_CAU_HINH');
  return trangThaiDb().then(traLoi, () => traLoi('LOI'));
};
