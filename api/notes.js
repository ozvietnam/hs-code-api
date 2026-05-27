const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { notesData, explanatoryNotesData, normalizeHs } = require('../lib/data');

module.exports = function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (requireAuth(req, res)) return;

  const { chapter, heading, hs } = req.query;

  if (!chapter && !heading && !hs) {
    return res.status(400).json({
      error: 'chapter, heading, or hs parameter required',
      examples: ['/api/notes?chapter=85', '/api/notes?heading=8509', '/api/notes?hs=85171300'],
      availableChapters: Object.keys(notesData).map(Number).sort((a, b) => a - b),
    });
  }

  const hsCode = hs ? normalizeHs(hs) : null;
  const chapterFromHs = hsCode ? String(parseInt(hsCode.slice(0, 2), 10)) : null;
  const chapNum = chapter
    ? String(parseInt(chapter, 10))
    : heading
      ? String(parseInt(String(heading || '').replace(/\./g, '').slice(0, 2), 10))
      : chapterFromHs;

  if (!notesData[chapNum]) {
    return res.status(404).json({
      found: false,
      message: `No notes for chapter ${chapNum}`,
    });
  }

  const hierarchy = [];
  if (hsCode) {
    const codes = [hsCode.slice(0, 2).padEnd(8, '0'), hsCode.slice(0, 4).padEnd(8, '0'), hsCode.slice(0, 6).padEnd(8, '0'), hsCode];
    for (const code of codes) {
      const note = explanatoryNotesData[code];
      if (note) hierarchy.push(note);
    }
  }

  return res.status(200).json({
    found: true,
    chapter: parseInt(chapNum, 10),
    hsCode,
    content: notesData[chapNum],
    explanatoryHierarchy: hierarchy,
    source: 'Danh mục HHDM XNK Việt Nam - TT31/2022/TT-BTC',
  });
};
