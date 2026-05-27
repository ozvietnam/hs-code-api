const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { taxData } = require('../lib/data');
const { enrichedEntryCount } = require('../lib/enriched-data');
const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (requireAuth(req, res)) return;

  const rows = Object.values(taxData);
  const chapters = new Set(rows.map((r) => r.hs.slice(0, 2)));
  const withWarnings = rows.filter((r) => r.cs && String(r.cs).trim()).length;
  const enrichedPolicies = enrichedEntryCount();

  const enrichedPath = path.join(process.cwd(), 'data', 'tax-enriched.json');
  let lastEnrichedAt = null;
  if (fs.existsSync(enrichedPath)) {
    lastEnrichedAt = fs.statSync(enrichedPath).mtime.toISOString();
  }

  return res.status(200).json({
    totalHsCodes: rows.length,
    chapters: chapters.size,
    tariffCoverage: {
      withMfn: rows.filter((r) => r.mfn !== null && r.mfn !== '').length,
      withAcfta: rows.filter((r) => r.acfta !== null && r.acfta !== '').length,
      withVat: rows.filter((r) => r.vat !== null && r.vat !== '').length,
    },
    withWarnings,
    enrichedPolicies,
    lastEnrichedAt,
  });
};
