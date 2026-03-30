const searchData = require('../data/search.json');
const taxData = require('../data/tax.json');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const { q, cs_only, limit = '20' } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      error: 'Tham số q phải có ít nhất 2 ký tự',
      vi_du: ['/api/search?q=bàn+chải', '/api/search?q=8509', '/api/search?q=nhựa&cs_only=1']
    });
  }

  const keyword = q.trim().toLowerCase();
  const limitNum = Math.min(parseInt(limit) || 20, 50);
  const onlyCS = cs_only === '1' || cs_only === 'true';
  const isHSQuery = /^\d{4,}/.test(keyword);

  const results = searchData
    .filter(item => {
      if (onlyCS && item.cs !== '1') return false;
      if (isHSQuery) return item.hs.startsWith(keyword.replace(/\./g, ''));
      return item.vn.toLowerCase().includes(keyword);
    })
    .slice(0, limitNum)
    .map(item => {
      const full = taxData[item.hs] || {};
      return {
        hs: item.hs,
        mo_ta: item.vn,
        nk_mfn: full.mfn || null,
        acfta: full.acfta || null,
        vat: full.vat || null,
        canh_bao_cs: item.cs === '1',
      };
    });

  return res.status(200).json({
    keyword: q,
    total: results.length,
    results,
  });
};
