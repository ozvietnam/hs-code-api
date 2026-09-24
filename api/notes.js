const { requireAuthUnlessPublic } = require('../lib/public-access');
const { setCors, handleOptions } = require('../lib/cors');
const { notesData, normalizeHs } = require('../lib/data');
const { buildNoteChain } = require('../lib/gir-notes');
const fs = require('fs');
const { dataReadPath } = require('../lib/data-paths');

// notes.json thiếu 9 chương (50, 52, 53, 75, 76, 78, 79, 80, 81). Chương 75–80
// có chú giải trong chu-giai-chuong.json → dùng làm nguồn dự phòng thay vì 404.
let _cgc = null;
function chuGiaiChuong(chapNum) {
  if (!_cgc) {
    try { _cgc = JSON.parse(fs.readFileSync(dataReadPath('chu-giai-chuong.json'), 'utf8')); } catch { _cgc = {}; }
  }
  const e = _cgc[String(chapNum).padStart(2, '0')];
  return e && String(e.chuong || '').trim() ? String(e.chuong) : null;
}

module.exports = function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (requireAuthUnlessPublic(req, res, { endpoint: 'notes' })) return;

  const { chapter, heading, hs, level } = req.query;
  const levelFilter = String(level || '').trim() || null;

  if (!chapter && !heading && !hs) {
    return res.status(400).json({
      error: 'chapter, heading, or hs parameter required',
      examples: [
        '/api/notes?chapter=85',
        '/api/notes?heading=8509',
        '/api/notes?hs=85171300',
        '/api/notes?hs=85171300&level=all',
      ],
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

  if (hsCode && (levelFilter === 'all' || levelFilter)) {
    const chain = buildNoteChain(hsCode, { levelFilter: levelFilter || 'all' });
    if (chain.length === 0) {
      return res.status(404).json({
        found: false,
        hsCode,
        message: `No GIR note chain for ${hsCode}`,
      });
    }
    return res.status(200).json({
      found: true,
      hsCode,
      level: levelFilter || 'all',
      chain,
      source: 'GIR 5-level chain (section → chapter → heading → subheading → national)',
    });
  }

  const fallback = notesData[chapNum] ? null : chuGiaiChuong(chapNum);
  if (!notesData[chapNum] && !fallback) {
    return res.status(404).json({
      found: false,
      chapter: parseInt(chapNum, 10),
      message: `Dữ liệu không có chú giải chương ${chapNum} (có thể biểu gốc không có chú giải chương này — đối chiếu Danh mục TT 31/2022/TT-BTC).`,
    });
  }

  const chain = hsCode ? buildNoteChain(hsCode) : null;

  return res.status(200).json({
    found: true,
    chapter: parseInt(chapNum, 10),
    hsCode,
    content: notesData[chapNum] || fallback,
    chain,
    source: notesData[chapNum]
      ? 'Danh mục HHDM XNK Việt Nam - TT31/2022/TT-BTC'
      : 'Danh mục HHDM XNK Việt Nam - TT31/2022/TT-BTC (data/chu-giai-chuong.json)',
  });
};
