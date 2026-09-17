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

  const { hs } = req.query;
  if (!hs) {
    return res.status(400).json({
      error: 'Missing hs parameter',
      example: '/api/tax?hs=39261000',
    });
  }

  const result = buildTaxLookup(hs);
  if (!result.found) {
    return res.status(404).json(result);
  }

  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
  return res.status(200).json(result);
};
