// A4 (#46) — Index tra cứu chú giải chi tiết cấp mã (explanatory-notes.json).
// Mục đích: cho engine (B3 #49) tham chiếu chú giải GỒM cấp mã 8-số khi giải trình mã top.
// Ticket A4 CHỈ dựng data + index O(1) + báo cáo độ phủ — KHÔNG sửa engine.
//
// Nguồn: data/explanatory-notes.json — 8.203 mã (level=national, noteType=bao_gom),
//   key là HS 8-số, value = { hsCode, headingCode, chapterCode, noteVi, noteType, sourceFile, ... }.
//
// API:
//   getByHs(hs)        → note object | null         (O(1) theo mã 8-số)
//   getByHeading(h4)   → [note, ...]                (O(1) theo nhóm 4-số)
//   getCoverageStats() → tổng quan độ phủ trên tax.json
//   hasNote(hs)        → boolean

const { explanatoryNotesData, taxData, normalizeHs } = require('./data');

// Index nhóm 4-số → danh sách note (xây 1 lần, cache module-level).
let _byHeading;
function byHeadingIndex() {
  if (_byHeading) return _byHeading;
  _byHeading = new Map();
  for (const note of Object.values(explanatoryNotesData)) {
    const h4 = String(note.headingCode || (note.hsCode || '').slice(0, 4)).slice(0, 4);
    if (!h4) continue;
    let arr = _byHeading.get(h4);
    if (!arr) { arr = []; _byHeading.set(h4, arr); }
    arr.push(note);
  }
  return _byHeading;
}

// Note theo mã 8-số. explanatory-notes.json đã keyed theo HS 8-số → tra trực tiếp O(1).
function getByHs(hs) {
  const code = normalizeHs(hs);
  return explanatoryNotesData[code] || null;
}

function hasNote(hs) {
  return !!getByHs(hs);
}

// Tất cả note dưới 1 nhóm 4-số.
function getByHeading(h4) {
  const key = String(h4 || '').replace(/\D/g, '').slice(0, 4);
  return byHeadingIndex().get(key) || [];
}

// Độ phủ trên toàn biểu thuế tax.json (mã 8-số có note / tổng mã 8-số).
let _stats;
function getCoverageStats() {
  if (_stats) return _stats;
  const taxCodes = Object.keys(taxData).filter((k) => k.length === 8);
  const withNote = taxCodes.filter((k) => explanatoryNotesData[k]).length;
  const headings = byHeadingIndex();
  _stats = {
    totalNotes: Object.keys(explanatoryNotesData).length,
    taxCodes8: taxCodes.length,
    taxCodesWithNote: withNote,
    taxCoveragePct: taxCodes.length ? +(withNote / taxCodes.length * 100).toFixed(1) : 0,
    distinctHeadings: headings.size,
    distinctChapters: new Set(
      Object.values(explanatoryNotesData).map((n) => String(n.chapterCode || (n.hsCode || '').slice(0, 2)))
    ).size,
  };
  return _stats;
}

module.exports = { getByHs, getByHeading, hasNote, getCoverageStats };
