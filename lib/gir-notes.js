// lib/gir-notes.js — M-21 (#1908): Đọc chú giải 5 tầng từ kho luật gốc (lib/chu-giai-goc.js).
//
// Không ghép khong_bao_gom/bao_gom/loai_tru, không phan_biet AI, không tinh_chat, Phần không mượn chương khác,
// cấp gạch lấy từ kho bieu.jsonl (không hs-tree), không lấy explanatory-notes.json.
'use strict';

const { normalizeHs } = require('./data');
const {
  napKho,
  phanChoChuong,
  layPhan,
  layChuong,
  layNhom,
  layPhanNhom,
  layDongBieuVaSen,
} = require('./chu-giai-goc');

function chapterKey(chapterNum) {
  return String(parseInt(chapterNum, 10));
}

function splitLegalOverview(raw) {
  const full = String(raw || '').replace(/\r\n/g, '\n').trim();
  if (!full) return { legal: '', overview: '', hasOverview: false };
  const lines = full.split('\n');
  let ovIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^(khái quát chung|tổng quát)([:. –-]|$)/i.test(lines[i].trim())) { ovIdx = i; break; }
  }
  if (ovIdx === -1) return { legal: full, overview: '', hasOverview: false };
  return {
    legal: lines.slice(0, ovIdx).join('\n').trim(),
    overview: lines.slice(ovIdx).join('\n').trim(),
    hasOverview: true,
  };
}

function entry({ level, code, parentCode, titleVi, noteVi, noteType, sourceDocument, sourcePage = null, extra = {} }) {
  return {
    level,
    code,
    parentCode: parentCode || null,
    titleVi: titleVi || null,
    noteType: noteType || 'GENERAL',
    noteVi: noteVi || null,
    noteEn: null,
    sourceDocument: sourceDocument || null,
    sourcePage,
    ...extra,
  };
}

function sectionForChapter(chapterNum) {
  return phanChoChuong(chapterNum);
}

function dienGiaiThuyetMinh(overview, hsCode, levelName) {
  return {
    dienGiai: {
      soKyTu: String(overview || '').length,
      cachLay: `/api/notes?hs=${hsCode || 'X'}&level=${levelName}&full=1`,
      ghiChu: 'noteVi chỉ gồm phần PHÁP LÝ (Chú giải) nguyên văn từ kho luật gốc; phần KHÁI QUÁT CHUNG (thuyết minh) không trả mặc định — lấy theo cachLay khi cần.',
    },
  };
}

function buildSectionNote(chapterNum, { hsCode, full } = {}) {
  const p = layPhan(chapterNum, { full });
  if (!p) return null;
  const sec = p.section;
  const key = chapterKey(chapterNum);

  if (!p.coChuGiai) {
    return entry({
      level: 'SECTION',
      code: sec.code,
      parentCode: null,
      titleVi: sec.titleVi,
      noteVi: `Phần ${sec.code} — ${sec.titleVi}: biểu gốc HS 2022 KHÔNG CÓ chú giải cho Phần này; phân loại căn cứ Chú giải Chương ${key} và Chú giải nhóm (GIR 1, GIR 6).`,
      noteType: 'GENERAL',
      sourceDocument: 'Kho luật gốc HS 2022 (phan.jsonl — biểu gốc không có chú giải Phần)',
    });
  }

  const extra = {};
  if (p.hasOverview) {
    extra.dienGiai = dienGiaiThuyetMinh(p.overview, hsCode, 'SECTION').dienGiai;
  }
  let noteVi = p.legal;
  if (!noteVi) {
    noteVi = `Phần ${sec.code} — ${sec.titleVi}: kho luật gốc không có đoạn Chú giải riêng, chỉ có phần KHÁI QUÁT CHUNG (thuyết minh) — xem dienGiai.cachLay.`;
  } else if (full && p.overview) {
    noteVi = `${p.legal}\n\n${p.overview}`;
  }
  const nguonDau = p.nutLuat.find((n) => n.nguon)?.nguon || 'Kho luật gốc HS 2022 (phan.jsonl)';
  const trangDau = p.nutLuat.find((n) => n.trang != null)?.trang ?? null;

  return entry({
    level: 'SECTION',
    code: sec.code,
    parentCode: null,
    titleVi: sec.titleVi,
    noteVi,
    noteType: 'GENERAL',
    sourceDocument: `${nguonDau} (phan.jsonl)`,
    sourcePage: trangDau,
    extra,
  });
}

function buildChapterNote(chapterNum, { hsCode, full } = {}) {
  const ch = layChuong(chapterNum, { full });
  if (!ch) return null;
  const key = ch.chapterInt;
  const sec = sectionForChapter(chapterNum);

  const extra = {};
  if (ch.hasOverview) {
    extra.dienGiai = dienGiaiThuyetMinh(ch.overview, hsCode, 'CHAPTER').dienGiai;
  }
  let noteVi = ch.legal;
  if (!noteVi) {
    noteVi = `Chương ${key}: biểu gốc HS 2022 KHÔNG CÓ chú giải riêng cho chương này — phân loại căn cứ Chú giải Phần (nếu có) và Chú giải nhóm; phần TỔNG QUÁT (thuyết minh) lấy theo dienGiai.cachLay.`;
  } else if (full && ch.overview) {
    noteVi = `${ch.legal}\n\n${ch.overview}`;
  }

  const nguonDau = ch.nutLuat.find((n) => n.kho === 'chuong' && n.nguon)?.nguon || 'Kho luật gốc HS 2022 (chuong.jsonl)';
  const trangDau = ch.nutLuat.find((n) => n.kho === 'chuong' && n.trang != null)?.trang ?? null;

  return entry({
    level: 'CHAPTER',
    code: key,
    parentCode: sec?.code || null,
    titleVi: `Chương ${key}`,
    noteVi,
    noteType: 'GENERAL',
    sourceDocument: `${nguonDau} (chuong.jsonl)`,
    sourcePage: trangDau,
    extra,
  });
}

function buildHeadingNote(chapterNum, headingCode) {
  if (!headingCode) return null;
  const nh = layNhom(headingCode);
  if (!nh) return null;
  const nguonDau = nh.nutLuat.find((n) => n.kho === 'nhom' && n.nguon)?.nguon
    || nh.nutLuat[0]?.nguon
    || 'Kho luật gốc HS 2022 (nhom.jsonl)';
  const trangDau = nh.nutLuat.find((n) => n.kho === 'nhom' && n.trang != null)?.trang ?? null;

  return entry({
    level: 'HEADING',
    code: nh.heading,
    parentCode: chapterKey(chapterNum),
    titleVi: nh.tenNhom,
    noteVi: nh.vanBan,
    noteType: 'CLASSIFICATION_RULE',
    sourceDocument: nh.coChinhBanGoc ? `${nguonDau} (nhom.jsonl)` : 'Biểu thuế hiện hành (bieu.jsonl — chưa có chú giải chi tiết nhóm trong nhom.jsonl)',
    sourcePage: trangDau,
    extra: {
      tenNhom: nh.tenNhom,
    },
  });
}

function buildSubheadingNote(chapterNum, headingCode, subheadingCode) {
  if (!subheadingCode) return null;
  const code = String(subheadingCode).padStart(6, '0');
  const pn = layPhanNhom(code);
  const h4 = String(headingCode || code.slice(0, 4)).padStart(4, '0');
  if (!pn) {
    return entry({
      level: 'SUBHEADING',
      code,
      parentCode: h4,
      titleVi: `Phân nhóm ${code.slice(0, 4)}.${code.slice(4)}`,
      noteVi: null,
      noteType: 'CLASSIFICATION_RULE',
      sourceDocument: 'Kho luật gốc HS 2022 (bieu.jsonl / phan-nhom.jsonl — chưa có lời phân nhóm riêng)',
    });
  }
  const trangDau = pn.nutLuat.find((n) => n.trang != null)?.trang ?? null;
  return entry({
    level: 'SUBHEADING',
    code,
    parentCode: h4,
    titleVi: pn.ten,
    noteVi: pn.vanBan,
    noteType: 'CLASSIFICATION_RULE',
    sourceDocument: 'Kho luật gốc HS 2022 (bieu.jsonl, phan-nhom.jsonl)',
    sourcePage: trangDau,
    ...(pn.gach != null ? { extra: { gach: pn.gach } } : {}),
  });
}

function buildNationalNote(hsCode) {
  const code = String(hsCode || '').replace(/\D/g, '');
  if (code.length !== 8) return null;
  const { bieu, sen } = layDongBieuVaSen(code);
  if (!bieu && sen.length === 0) return null;

  const doan = [
    ...(bieu ? [bieu.nguyenVan] : []),
    ...sen.map((s) => `[SEN ${s.id}] ${s.nguyenVan}`),
  ].filter(Boolean);

  return entry({
    level: 'NATIONAL',
    code,
    parentCode: code.slice(0, 6),
    titleVi: bieu?.nguyenVan || `Dòng ${code}`,
    noteVi: doan.join('\n\n') || null,
    noteType: 'CLASSIFICATION_RULE',
    sourceDocument: sen.length ? 'Kho luật gốc (bieu.jsonl + sen.jsonl)' : 'Kho luật gốc (bieu.jsonl)',
    sourcePage: sen.find((s) => s.trang != null)?.trang ?? null,
    ...(bieu?.gach != null ? { extra: { gach: bieu.gach } } : {}),
  });
}

/**
 * Dựng chuỗi chú giải 5 tầng thuần kho luật gốc cho mã HS (M-21).
 */
function buildNoteChain(hs, { levelFilter = 'all', full } = {}) {
  const hsCode = normalizeHs(hs);
  if (!hsCode || hsCode.length < 2) return [];
  const chapterNum = parseInt(hsCode.slice(0, 2), 10);
  const headingCode = hsCode.length >= 4 ? hsCode.slice(0, 4) : null;
  const subheadingCode = hsCode.length >= 6 ? hsCode.slice(0, 6) : null;
  const muonFull = full === true || full === '1' || full === 'true' || full === 'all';

  const chain = [
    buildSectionNote(chapterNum, { hsCode, full: muonFull }),
    buildChapterNote(chapterNum, { hsCode, full: muonFull }),
    buildHeadingNote(chapterNum, headingCode),
    buildSubheadingNote(chapterNum, headingCode, subheadingCode),
    buildNationalNote(hsCode),
  ].filter(Boolean);

  if (levelFilter && levelFilter !== 'all') {
    const want = String(levelFilter).toUpperCase();
    return chain.filter((n) => n.level === want);
  }
  return chain;
}

function getNotesCoverage() {
  const kho = napKho();
  const bySection = kho.phanNodes.size;
  const byChapter = kho.chuongNodes.size;
  const byHeading = kho.nhomNodes.size;
  const bySubheading = kho.pnTheoMa.size;
  let byNational = 0;
  for (const id of kho.bieuTheoId.keys()) {
    if (/^bieu:\d{8}$/.test(id)) byNational += 1;
  }
  const totalStructured = bySection + byChapter + byHeading + bySubheading + byNational;
  return {
    totalStructured,
    bySection,
    byChapter,
    byHeading,
    bySubheading,
    byNational,
    targetTotal: 7400,
    pctOfTarget: Math.round((totalStructured / 7400) * 1000) / 10,
  };
}

module.exports = {
  buildNoteChain,
  buildChapterNote,
  getNotesCoverage,
  sectionForChapter,
  splitLegalOverview,
};
