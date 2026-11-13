const { requireAuthUnlessPublic } = require('../lib/public-access');
const { setCors, handleOptions } = require('../lib/cors');
const { notesData, normalizeHs } = require('../lib/data');
const { buildNoteChain, buildChapterNote } = require('../lib/gir-notes');
const { notesCoverage } = require('../lib/notes-coverage');
const { senFor } = require('../lib/sen');

// OZV-715 — chú giải 3 tầng (Phần / Chương / Nhóm) trả NGUYÊN VĂN:
//  - Chương: data/chu-giai-chuong.json (HS 2022 toàn tập) là NGUỒN CHÍNH;
//    data/notes.json (TT31/2022) chỉ còn là dự phòng khi bản 2022 trống.
//  - Phần: `.phan` của chương, trống thì mượn chương cùng Phần; Phần không có
//    chú giải trong biểu gốc (vd Phần V) thì NÓI THẲNG, không bỏ trống.
//  - Pháp lý (Chú giải / Chú giải phân nhóm) trả nguyên văn, không cắt;
//    thuyết minh (KHÁI QUÁT CHUNG) chỉ trả khi caller xin ?full=1.
const SIZE_CAP = 29500; // trần ~30.000 ký tự JSON: cắt thuyết minh NHÓM trước, pháp lý không bao giờ cắt

function xinFull(v) {
  const s = String(v || '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'all' || s === 'phan' || s === 'chuong';
}

// Đáp ứng trần ~30.000 ký tự: cắt dần chú giải NHÓM (thuyết minh), pháp lý giữ nguyên văn.
function gioiHanKichThuoc(payload, hsCode) {
  if (JSON.stringify(payload).length <= SIZE_CAP) return payload;
  for (const lim of [6000, 3000, 1200, 0]) {
    const h = (payload.chain || []).find((e) => e.level === 'HEADING' && e.noteVi);
    if (!h) break;
    h.noteVi = lim
      ? `${String(h.noteVi).slice(0, lim).replace(/\s+\S*$/, '')}… [cắt cho vừa trần ~30.000 ký tự — toàn văn: /api/notes?hs=${hsCode}&level=HEADING&full=1]`
      : null;
    h.biCatChoVua = true;
    if (JSON.stringify(payload).length <= SIZE_CAP) break;
  }
  if (JSON.stringify(payload).length > SIZE_CAP) return payload; // đã cố hết — pháp lý không cắt
  if (payload.coverage) {
    payload.coverage.complete = false;
    payload.coverage.gaps = [...(payload.coverage.gaps || []), {
      id: 'heading-note-shortened-for-size',
      tang: 'NHOM',
      description: `Chú giải nhóm bị cắt ngắn cho vừa trần ~30.000 ký tự của phản hồi — toàn văn: /api/notes?hs=${hsCode}&level=HEADING&full=1.`,
    }];
  }
  return payload;
}

module.exports = function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (requireAuthUnlessPublic(req, res, { endpoint: 'notes' })) return;

  const { chapter, heading, hs, level, full } = req.query;
  const levelFilter = String(level || '').trim() || null;
  const muonFull = xinFull(full);

  if (!chapter && !heading && !hs) {
    return res.status(400).json({
      error: 'chapter, heading, or hs parameter required',
      examples: [
        '/api/notes?chapter=85',
        '/api/notes?heading=8509',
        '/api/notes?hs=85171300',
        '/api/notes?hs=85171300&level=all',
        '/api/notes?hs=85171300&full=1 (kèm cả phần KHÁI QUÁT CHUNG)',
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
    const chain = buildNoteChain(hsCode, { levelFilter: levelFilter || 'all', full: muonFull });
    if (chain.length === 0) {
      return res.status(404).json({
        found: false,
        hsCode,
        message: `No GIR note chain for ${hsCode}`,
      });
    }
    // Chú giải còn thiếu/bị cắt ở tầng nào — câu trả lời thiếu mà không nói là thiếu thì nguy hại hơn không trả lời.
    let payload = {
      found: true,
      hsCode,
      level: levelFilter || 'all',
      coverage: notesCoverage(hsCode),
      sen: senFor(hsCode), // Chú giải bổ sung SEN 2022 của đúng mã 8 số (null nếu SEN không có)
      chain,
      source: 'GIR 5-level chain (section → chapter → heading → subheading → national)',
    };
    if (!muonFull) payload = gioiHanKichThuoc(payload, hsCode);
    return res.status(200).json(payload);
  }

  // Chương: bản HS 2022 là nguồn chính (nguyên văn phần pháp lý); notes.json dự phòng.
  const chapEntry = chapNum ? buildChapterNote(chapNum) : null;
  const content = chapEntry ? chapEntry.noteVi : null;
  if (!notesData[chapNum] && !content) {
    return res.status(404).json({
      found: false,
      chapter: parseInt(chapNum, 10),
      message: `Dữ liệu không có chú giải chương ${chapNum} (có thể biểu gốc không có chú giải chương này — đối chiếu Danh mục TT 31/2022/TT-BTC).`,
    });
  }

  const chain = hsCode ? buildNoteChain(hsCode, { full: muonFull }) : null;
  // Toàn văn Chú giải Chương đã nằm ở `content` — không lặp lại trong chain (tiết kiệm kích thước).
  const chEnt = chain && chain.find((e) => e.level === 'CHAPTER');
  if (chEnt && content && chEnt.noteVi === content) {
    chEnt.noteVi = null;
    chEnt.ghiChu = 'Toàn văn Chú giải Chương nằm ở trường `content` — không lặp lại ở đây.';
  }

  let payload = {
    found: true,
    chapter: parseInt(chapNum, 10),
    hsCode,
    content,
    coverage: notesCoverage(hsCode || String(heading || '').replace(/\D/g, '') || String(chapNum).padStart(2, '0')),
    sen: hsCode ? senFor(hsCode) : null,
    chain,
    source: chapEntry
      ? chapEntry.sourceDocument
      : 'Danh mục HHDM XNK Việt Nam - TT31/2022/TT-BTC',
  };
  if (!muonFull) payload = gioiHanKichThuoc(payload, hsCode);
  return res.status(200).json(payload);
};
