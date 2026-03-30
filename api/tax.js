const taxData = require('../data/tax.json');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const { hs } = req.query;
  if (!hs) {
    return res.status(400).json({
      error: 'Thiếu tham số hs',
      vi_du: '/api/tax?hs=39261000'
    });
  }

  const code = hs.replace(/\./g, '').trim();
  const r = taxData[code];

  if (r) {
    return res.status(200).json({
      found: true,
      hs: r.hs,
      mo_ta: r.vn,
      don_vi: r.dvt,
      thue: {
        nk_tt:    r.tt    || null,
        nk_mfn:   r.mfn   || null,
        vat:      r.vat   || null,
        acfta:    r.acfta || null,
        bvmt:     r.bvmt  || null,
        giam_vat: r.giam_vat || null,
      },
      chinh_sach: r.cs || null,
      canh_bao_cs: r.cs ? true : false,
    });
  }

  // Không tìm thấy — gợi ý mã liên quan
  const prefix6 = code.slice(0, 6);
  const related = Object.values(taxData)
    .filter(x => x.hs.startsWith(prefix6))
    .slice(0, 5)
    .map(x => ({ hs: x.hs, mo_ta: x.vn }));

  return res.status(404).json({
    found: false,
    message: 'Không tìm thấy mã ' + code,
    go_y_ma_lien_quan: related,
  });
};
