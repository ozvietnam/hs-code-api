const notesData = require('../data/notes.json');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const { chapter, heading } = req.query;

  if (!chapter && !heading) {
    return res.status(400).json({
      error: 'Cần tham số chapter hoặc heading',
      vi_du: ['/api/notes?chapter=85', '/api/notes?heading=8509'],
      chapters_co_du_lieu: Object.keys(notesData).map(Number).sort((a, b) => a - b),
    });
  }

  const chapNum = chapter
    ? String(parseInt(chapter))
    : String(parseInt((heading || '').replace(/\./g, '').slice(0, 2)));

  if (!notesData[chapNum]) {
    return res.status(404).json({
      found: false,
      message: 'Không có chú giải cho Chương ' + chapNum,
    });
  }

  return res.status(200).json({
    found: true,
    chapter: parseInt(chapNum),
    noi_dung: notesData[chapNum],
    nguon: 'Danh mục HHDM XNK Việt Nam - TT31/2022/TT-BTC',
  });
};
