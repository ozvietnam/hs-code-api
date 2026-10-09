const { requireAuthUnlessPublic } = require('../lib/public-access');
const { setCors, handleOptions } = require('../lib/cors');
// Toàn bộ phần làm giàu nằm trong lib/tax-lookup.js — dùng chung với bản tĩnh
// scripts/build-static.mjs, để hai mặt không bao giờ lệch nhau.
const { buildTaxLookup } = require('../lib/tax-lookup');

module.exports = function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (requireAuthUnlessPublic(req, res, { endpoint: 'tax' })) return;

  // name/purpose (tuỳ chọn): tên hàng + công dụng để dò cờ chính sách theo tên (CEO 08/10/2026).
  // Nhận cả query lẫn body (ERP có thể gửi JSON); thiếu thì vẫn khớp bằng tên dòng biểu thuế.
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { hs, origin } = req.query;
  const name = String(req.query.name || body.name || '').trim().slice(0, 500) || null;
  const purpose = String(req.query.purpose || body.purpose || '').trim().slice(0, 500) || null;
  if (!hs) {
    return res.status(400).json({
      error: 'Missing hs parameter',
      example: '/api/tax?hs=39261000',
    });
  }

  const result = buildTaxLookup(hs, { ...(origin ? { origin } : {}), name, purpose });
  if (!result.found) {
    return res.status(404).json(result);
  }

  // Có name/purpose → kết quả phụ thuộc đầu vào riêng, không cache chung.
  res.setHeader('Cache-Control', name || purpose ? 'no-store' : 'public, max-age=86400, stale-while-revalidate=3600');
  return res.status(200).json(result);
};
