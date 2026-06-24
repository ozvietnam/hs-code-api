const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { mapTaxLookup } = require('../lib/tax-mapper');
const { getEnrichedForHs } = require('../lib/enriched-data');
const { getProcedures } = require('../lib/policy-procedures');

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
  if (!result.found) {
    return res.status(404).json(result);
  }

  // Attach structured policy procedures when available
  const enriched = getEnrichedForHs(hs);
  const procedures = enriched?.warnings ? getProcedures(enriched.warnings) : [];
  if (procedures.length > 0) {
    result.policyProcedures = procedures;
  }

  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
  return res.status(200).json(result);
};
