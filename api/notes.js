const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { notesData } = require('../lib/data');

module.exports = function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (requireAuth(req, res)) return;

  const { chapter, heading } = req.query;

  if (!chapter && !heading) {
    return res.status(400).json({
      error: 'chapter or heading parameter required',
      examples: ['/api/notes?chapter=85', '/api/notes?heading=8509'],
      availableChapters: Object.keys(notesData).map(Number).sort((a, b) => a - b),
    });
  }

  const chapNum = chapter
    ? String(parseInt(chapter, 10))
    : String(parseInt(String(heading || '').replace(/\./g, '').slice(0, 2), 10));

  if (!notesData[chapNum]) {
    return res.status(404).json({
      found: false,
      message: `No notes for chapter ${chapNum}`,
    });
  }

  return res.status(200).json({
    found: true,
    chapter: parseInt(chapNum, 10),
    content: notesData[chapNum],
    source: 'Danh mục HHDM XNK Việt Nam - TT31/2022/TT-BTC',
  });
};
