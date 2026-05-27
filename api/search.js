const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { taxData } = require('../lib/data');
const { mapSearchResult } = require('../lib/tax-mapper');
const { searchCandidates } = require('../lib/search-utils');

module.exports = function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (requireAuth(req, res)) return;

  const { q, cs_only, limit = '20' } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      error: 'Query q must be at least 2 characters',
      examples: ['/api/search?q=bàn+chải', '/api/search?q=8509', '/api/search?q=nhựa&cs_only=1'],
    });
  }

  const limitNum = Math.min(parseInt(limit, 10) || 20, 50);
  const onlyCS = cs_only === '1' || cs_only === 'true';
  const candidates = searchCandidates(q, { topCandidates: limitNum, csOnly: onlyCS });
  const results = candidates.map((item) => {
    const full = taxData[item.hsCode] || {};
    return mapSearchResult(
      {
        hs: item.hsCode,
        vn: item.nameVi,
        cs: item.hasPolicyWarning ? '1' : '0',
      },
      full
    );
  });

  return res.status(200).json({
    keyword: q,
    total: results.length,
    results,
  });
};
