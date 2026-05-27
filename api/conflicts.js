const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { conflictsData, normalizeHs } = require('../lib/data');

module.exports = function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (requireAuth(req, res)) return;

  const { hs } = req.query;
  if (!hs) {
    return res.status(400).json({
      error: 'hs parameter required',
      example: '/api/conflicts?hs=19011020',
    });
  }

  const hsCode = normalizeHs(hs);
  const payload = conflictsData[hsCode];
  if (!payload) {
    return res.status(404).json({
      found: false,
      hsCode,
      message: `No conflict data for ${hsCode}`,
    });
  }

  return res.status(200).json({
    found: true,
    hsCode,
    ...payload,
  });
};
