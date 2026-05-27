const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { buildVersionsListResponse } = require('../lib/tariff-versions');

module.exports = function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (requireAuth(req, res)) return;

  try {
    const payload = buildVersionsListResponse();
    return res.status(200).json(payload);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to read versions', detail: e.message });
  }
};
