const { notesData, explanatoryNotesData, taxData, normalizeHs } = require('./data');
const { dataReadPath } = require('./data-paths');
const { loadJson } = require('./data-cache');

let sectionsMeta = null;
try {
  sectionsMeta = require('../data/hs-sections.json').sections || [];
} catch {
  sectionsMeta = [];
}

const chapterToSection = new Map();
for (const sec of sectionsMeta) {
  for (const ch of sec.chapters || []) {
    chapterToSection.set(String(parseInt(ch, 10)), sec);
  }
}

function chapterKey(chapterNum) {
  return String(parseInt(chapterNum, 10));
}

// ---- Nguồn 2022 (bản HS 2022 toàn tập, nhập 07/10/2026) — NGUỒN CHÍNH ----
// chu-giai-chuong.json: { "84": { chuong, phan, phien_ban: '2022' } } — `phan`
// là văn bản Phần, trùng nhau trên mọi chương của Phần.
function chuGiaiChuongData() {
  return loadJson(dataReadPath('chu-giai-chuong.json'), {});
}
// chu-giai-heading.json: { "8481": { nhom, phan_biet, tinh_chat, sen, ten_nhom,
// bao_gom, khong_bao_gom, loai_tru, nhom_day_du, phien_ban } }
function headingNotesData() {
  return loadJson(dataReadPath('chu-giai-heading.json'), {});
}

// Tách phần PHÁP LÝ (Chú giải + Chú giải phân nhóm) khỏi phần THUYẾT MINH
// (KHÁI QUÁT CHUNG / TỔNG QUÁT) trong văn bản HS 2022. Pháp lý trả NGUYÊN VĂN,
// không cắt; thuyết minh không trả mặc định — chỉ khi caller xin `full` (OZV-715).
function splitLegalOverview(raw) {
  const full = String(raw || '').replace(/\r\n/g, '\n').trim();
  if (!full) return { legal: '', overview: '', hasOverview: false };
  const lines = full.split('\n');
  let ovIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^(khái quát chung|tổng quát)([:. –-]|$)/i.test(lines[i].trim())) { ovIdx = i; break; }
  }
  if (ovIdx === -1) return { legal: full, overview: '', hasOverview: false };
  return {
    legal: lines.slice(0, ovIdx).join('\n').trim(),
    overview: lines.slice(ovIdx).join('\n').trim(),
    hasOverview: true,
  };
}

function entry({ level, code, parentCode, titleVi, noteVi, noteType, sourceDocument, extra }) {
  return {
    level,
    code,
    parentCode: parentCode || null,
    titleVi: titleVi || null,
    noteType: noteType || 'GENERAL',
    noteVi: noteVi || null,
    noteEn: null,
    sourceDocument: sourceDocument || null,
    sourcePage: null,
    ...extra,
  };
}

function sectionForChapter(chapterNum) {
  return chapterToSection.get(chapterKey(chapterNum)) || null;
}

// Thuyết minh bị lược bớt ở tầng nào → ghi rõ độ dài + cách lấy toàn văn.
function dienGiaiThuyetMinh(overview, hsCode, levelName) {
  return {
    dienGiai: {
      soKyTu: String(overview || '').length,
      cachLay: `/api/notes?hs=${hsCode || 'X'}&level=${levelName}&full=1`,
      ghiChu: 'noteVi chỉ gồm phần PHÁP LÝ (Chú giải) nguyên văn; phần KHÁI QUÁT CHUNG (thuyết minh) không trả mặc định — lấy theo cachLay khi cần.',
    },
  };
}

// `.phan` trùng trên mọi chương của cùng Phần; chương mình trống thì MƯỢN của
// chương khác trong Phần (vd 54 trống nhưng 50–55 cùng Phần XI có).
function sectionPhanText(sec, ownKey) {
  const order = [ownKey, ...(sec.chapters || []).map((c) => String(parseInt(c, 10))).filter((c) => c !== ownKey)];
  for (const ch of order) {
    const raw = chuGiaiChuongData()[ch]?.phan;
    if (String(raw || '').trim()) {
      return { raw: String(raw), muonTuChuong: ch === ownKey ? null : ch };
    }
  }
  return null;
}

function buildSectionNote(chapterNum, { hsCode, full } = {}) {
  const sec = sectionForChapter(chapterNum);
  if (!sec) return null;
  const key = chapterKey(chapterNum);
  const found = sectionPhanText(sec, key);

  if (!found) {
    // Phần thực sự KHÔNG có chú giải trong biểu gốc (vd Phần V: chương 25–27;
    // Phần I, IX, XX) — nói thẳng, đừng bịa, đừng để trống (OZV-715).
    return entry({
      level: 'SECTION',
      code: sec.code,
      parentCode: null,
      titleVi: sec.titleVi,
      noteVi: `Phần ${sec.code} — ${sec.titleVi}: biểu gốc HS 2022 KHÔNG CÓ chú giải cho Phần này; phân loại căn cứ Chú giải Chương ${key} và Chú giải nhóm (GIR 1, GIR 6).`,
      noteType: 'GENERAL',
      sourceDocument: 'Chú giải HS 2022 — biểu gốc không có chú giải Phần (chu-giai-chuong.json)',
    });
  }

  const { legal, overview, hasOverview } = splitLegalOverview(found.raw);
  const extra = {};
  if (found.muonTuChuong) extra.muonChuongCungPhan = found.muonTuChuong;
  if (hasOverview && overview) {
    extra.dienGiai = dienGiaiThuyetMinh(overview, hsCode, 'SECTION').dienGiai;
  }
  let noteVi = legal;
  if (!legal) {
    noteVi = `Phần ${sec.code} — ${sec.titleVi}: bản trích HS 2022 không có đoạn Chú giải riêng, chỉ có phần KHÁI QUÁT CHUNG (thuyết minh) — xem dienGiai.cachLay.`;
  } else if (full && overview) {
    noteVi = `${legal}\n\n${overview}`;
  }
  return entry({
    level: 'SECTION',
    code: sec.code,
    parentCode: null,
    titleVi: sec.titleVi,
    noteVi,
    noteType: 'GENERAL',
    sourceDocument: `Chú giải HS 2022 (chu-giai-chuong.json, phien_ban 2022${found.muonTuChuong ? `; mượn của chương ${found.muonTuChuong} cùng Phần` : ''})`,
    extra,
  });
}

function buildChapterNote(chapterNum, { hsCode, full } = {}) {
  const key = chapterKey(chapterNum);
  const raw2022 = chuGiaiChuongData()[key]?.chuong;

  if (String(raw2022 || '').trim()) {
    let { legal, overview, hasOverview } = splitLegalOverview(raw2022);
    // "legal" chỉ là dòng tiêu đề chương rồi tới thuyết minh (vd ch 50/53/81) —
    // biểu gốc KHÔNG có chú giải chương; đừng đưa tiêu đề ra làm chú giải.
    if (hasOverview && legal.length < 200 && /^chương \d+/i.test(legal)) legal = '';
    const extra = {};
    if (hasOverview && overview) {
      extra.dienGiai = dienGiaiThuyetMinh(overview, hsCode, 'CHAPTER').dienGiai;
    }
    let noteVi = legal;
    if (!legal && notesData[key]) {
      // Bản 2022 không có chú giải chương nhưng notes.json (TT31) có → dùng dự phòng.
      return entry({
        level: 'CHAPTER',
        code: key,
        parentCode: sectionForChapter(chapterNum)?.code || null,
        titleVi: `Chương ${key}`,
        noteVi: String(notesData[key]),
        noteType: 'GENERAL',
        sourceDocument: 'Danh mục HHDM XNK Việt Nam - TT31/2022/TT-BTC (dự phòng: bản HS 2022 không có chú giải chương này)',
      });
    }
    if (!legal) {
      noteVi = `Chương ${key}: biểu gốc HS 2022 KHÔNG CÓ chú giải riêng cho chương này — phân loại căn cứ Chú giải Phần (nếu có) và Chú giải nhóm; phần TỔNG QUÁT (thuyết minh) lấy theo dienGiai.cachLay.`;
    } else if (full && overview) {
      noteVi = `${legal}\n\n${overview}`;
    }
    return entry({
      level: 'CHAPTER',
      code: key,
      parentCode: sectionForChapter(chapterNum)?.code || null,
      titleVi: `Chương ${key}`,
      noteVi,
      noteType: 'GENERAL',
      sourceDocument: 'Chú giải HS 2022 (chu-giai-chuong.json, phien_ban 2022)',
      extra,
    });
  }

  // Dự phòng: notes.json (TT31/2022) — chỉ dùng khi bản HS 2022 trống (OZV-715).
  const raw = notesData[key];
  if (!raw) return null;
  return entry({
    level: 'CHAPTER',
    code: key,
    parentCode: sectionForChapter(chapterNum)?.code || null,
    titleVi: `Chương ${key}`,
    noteVi: String(raw), // notes.json vốn là chú giải pháp lý — trả nguyên văn, không cắt 500 ký tự như trước
    noteType: 'GENERAL',
    sourceDocument: 'Danh mục HHDM XNK Việt Nam - TT31/2022/TT-BTC (dự phòng: bản HS 2022 chưa có chương này)',
  });
}

function taxNameForCode(hsPrefix) {
  const rec = taxData[hsPrefix] || taxData[normalizeHs(hsPrefix)];
  return rec?.vn || null;
}

function buildHeadingNote(chapterNum, headingCode, { hsCode } = {}) {
  if (!headingCode) return null;
  const code = String(headingCode).padStart(4, '0');
  const H = headingNotesData()[code];
  const nhom = String(H?.nhom || '').trim();

  if (H && nhom) {
    // Toàn văn nhóm (nhom_day_du) đã gồm mọi đoạn "không bao gồm"; bản bị cắt
    // (nhom_day_du = false) thì bổ sung từ trường riêng để không hụt trường hợp loại trừ.
    const kemTheo = [];
    const them = (nhan, v) => { const t = String(v || '').trim(); if (t) kemTheo.push(`${nhan} ${t}`); };
    them('Phân biệt:', H.phan_biet);
    them('SEN:', H.sen);
    if (!H.nhom_day_du) {
      them('Không bao gồm:', H.khong_bao_gom);
      them('Bao gồm:', H.bao_gom);
      them('Loại trừ:', H.loai_tru);
    }
    return entry({
      level: 'HEADING',
      code,
      parentCode: chapterKey(chapterNum),
      titleVi: String(H.ten_nhom || '').trim() || `Nhóm ${code.slice(0, 2)}.${code.slice(2)}`,
      noteVi: kemTheo.length ? `${nhom}\n\n${kemTheo.join('\n\n')}` : nhom,
      noteType: 'CLASSIFICATION_RULE',
      sourceDocument: 'Chú giải HS 2022 (chu-giai-heading.json, phien_ban 2022)',
      extra: { tenNhom: H.ten_nhom || null, tinhChat: H.tinh_chat || null },
    });
  }

  // Không có dữ liệu nhóm → giữ stub cũ (tên từ biểu thuế), ghi rõ đây là stub.
  return entry({
    level: 'HEADING',
    code,
    parentCode: chapterKey(chapterNum),
    titleVi: `Nhóm ${code.slice(0, 2)}.${code.slice(2)}`,
    noteVi: taxNameForCode(`${code}0000`) || null,
    noteType: 'CLASSIFICATION_RULE',
    sourceDocument: 'Biểu thuế 2026 / WCO HS Explanatory Notes (heading stub — chưa có chú giải nhóm trong dữ liệu)',
  });
}

function buildSubheadingNote(chapterNum, headingCode, subheadingCode) {
  if (!subheadingCode) return null;
  const code = String(subheadingCode).padStart(6, '0');
  return entry({
    level: 'SUBHEADING',
    code,
    parentCode: String(headingCode || code.slice(0, 4)).padStart(4, '0'),
    titleVi: `Phân nhóm ${code.slice(0, 4)}.${code.slice(4)}`,
    noteVi: taxNameForCode(`${code}00`) || null,
    noteType: 'CLASSIFICATION_RULE',
    sourceDocument: 'Biểu thuế 2026 / WCO HS Explanatory Notes (subheading stub)',
  });
}

function buildNationalNote(hsCode) {
  const note = explanatoryNotesData[hsCode];
  if (!note) return null;
  return entry({
    level: 'NATIONAL',
    code: hsCode,
    parentCode: note.parentCode || hsCode.slice(0, 6),
    titleVi: taxNameForCode(hsCode),
    noteVi: note.noteVi || null,
    noteType: note.noteType === 'bao_gom' ? 'INCLUDES' : (note.noteType || 'GENERAL').toUpperCase(),
    sourceDocument: note.sourceFile || 'bao_gom_index.json',
    // Cấp NATIONAL lấy từ explanatory-notes.json = chữ AI chưa kiểm (lib/nguon-loai.js); các cấp trên là nguyên văn.
    extra: { headingCode: note.headingCode, chapterCode: note.chapterCode, nguonLoai: 'AI_CHUA_KIEM', ghiChu: 'Chữ AI rút từ bao_gom_index, gán giả cấp 8 số, chưa kiểm — chỉ gợi ý; không dùng làm căn cứ.' },
  });
}

/**
 * Build GIR note chain for an 8-digit HS code (Issue #18; OZV-715: 3 tầng
 * Phần/Chương/Nhóm lấy NGUYÊN VĂN chú giải pháp lý HS 2022, tách khỏi thuyết minh).
 * @param {string} hs
 * @param {{ levelFilter?: string, full?: boolean|string }} opts — `full` kèm cả phần KHÁI QUÁT CHUNG
 */
function buildNoteChain(hs, { levelFilter = 'all', full } = {}) {
  const hsCode = normalizeHs(hs);
  const chapterNum = parseInt(hsCode.slice(0, 2), 10);
  const national = explanatoryNotesData[hsCode];
  const headingCode = national?.headingCode || hsCode.slice(0, 4);
  const subheadingCode = national?.parentCode || hsCode.slice(0, 6);
  const muonFull = full === true || full === '1' || full === 'true' || full === 'all';

  const chain = [
    buildSectionNote(chapterNum, { hsCode, full: muonFull }),
    buildChapterNote(chapterNum, { hsCode, full: muonFull }),
    buildHeadingNote(chapterNum, headingCode, { hsCode }),
    buildSubheadingNote(chapterNum, headingCode, subheadingCode),
    buildNationalNote(hsCode),
  ].filter(Boolean);

  if (levelFilter && levelFilter !== 'all') {
    const want = String(levelFilter).toUpperCase();
    return chain.filter((n) => n.level === want);
  }
  return chain;
}

function countByLevel(entries, level) {
  return entries.filter((e) => e.level === level).length;
}

function getNotesCoverage() {
  const nationalCount = Object.keys(explanatoryNotesData).length;
  const chapterCount = Object.keys(notesData).length;
  const sectionCount = sectionsMeta.length;

  const headingCodes = new Set();
  const subheadingCodes = new Set();
  for (const note of Object.values(explanatoryNotesData)) {
    if (note.headingCode) headingCodes.add(String(note.headingCode).padStart(4, '0'));
    if (note.parentCode) subheadingCodes.add(String(note.parentCode).padStart(6, '0'));
  }

  return {
    totalStructured: sectionCount + chapterCount + headingCodes.size + subheadingCodes.size + nationalCount,
    bySection: sectionCount,
    byChapter: chapterCount,
    byHeading: headingCodes.size,
    bySubheading: subheadingCodes.size,
    byNational: nationalCount,
    targetTotal: 7400,
    pctOfTarget: Math.round(
      ((sectionCount + chapterCount + headingCodes.size + subheadingCodes.size + nationalCount) / 7400) * 1000,
    ) / 10,
  };
}

module.exports = {
  buildNoteChain,
  buildChapterNote,
  getNotesCoverage,
  sectionForChapter,
  splitLegalOverview,
};
