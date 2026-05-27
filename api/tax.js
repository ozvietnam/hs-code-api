const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { mapTaxLookup } = require('../lib/tax-mapper');

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
      error: 'Missing hs parameter',
      example: '/api/tax?hs=39261000',
    });
  }

  const result = mapTaxLookup(hs);
  return res.status(result.found ? 200 : 404).json(result);
};
