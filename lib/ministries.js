const ministriesData = require('../data/ministries-vn.json');

const ALIASES = {
  BVHTT_DL: 'BVHTTDL',
};

function getMinistry(code) {
  const key = ALIASES[code] || code;
  return ministriesData[key] || null;
}

// So theo SỐ: dữ liệu ghi "01".."09" còn tham số có thể là "1" hoặc "01".
// Trước đây so chuỗi '01' !== '1' → chương 01–09 không khớp bộ nào.
function chapterInRange(chapter, spec) {
  if (!spec) return false;
  if (spec === '*') return true;
  const n = parseInt(chapter, 10);
  if (String(spec).includes('-')) {
    const [a, b] = String(spec).split('-').map((x) => parseInt(x, 10));
    return n >= a && n <= b;
  }
  return parseInt(spec, 10) === n;
}

/**
 * Bộ hiện hành theo chương. Các bộ đã sáp nhập (03/2025 — BNNPTNT, BTNMT,
 * BTTTT, BGTVT, BLĐTBXH) KHÔNG trả ở đây; phạm vi của họ đã chuyển sang bộ kế
 * thừa (BNNMT, BKHCN, BXD, BNV) trong data/ministries-vn.json.
 */
function getMinistriesByChapter(chapter) {
  const ch = String(parseInt(chapter, 10)).padStart(2, '0');
  return Object.values(ministriesData).filter((m) =>
    m.status !== 'MERGED' && (m.responsibleChapters || []).some((spec) => chapterInRange(ch, spec)),
  );
}

function expandMinistryCodes(codes) {
  const seen = new Set();
  const out = [];
  for (const code of codes || []) {
    const m = getMinistry(code);
    if (!m || seen.has(m.code)) continue;
    seen.add(m.code);
    out.push({
      code: m.code,
      fullNameVi: m.fullNameVi,
      fullNameEn: m.fullNameEn,
      domain: m.domain || [],
      websiteUrl: m.websiteUrl || null,
      hotline: m.hotline || null,
      licenseTypes: m.licenseTypes || [],
      // Văn bản do bộ cũ ban hành vẫn hiệu lực đến khi bị thay thế — giữ mã gốc
      // để truy văn bản, kèm bộ đang quản lý để người khai biết liên hệ ai.
      ...(m.status === 'MERGED' && getMinistry(m.successorCode)
        ? {
            status: 'MERGED',
            currentMinistry: {
              code: m.successorCode,
              fullNameVi: getMinistry(m.successorCode).fullNameVi,
              websiteUrl: getMinistry(m.successorCode).websiteUrl || null,
            },
            noteVi: `${m.fullNameVi} đã sáp nhập vào ${getMinistry(m.successorCode).fullNameVi} từ ${m.mergedEffectiveDate}. Văn bản cũ còn hiệu lực đến khi được thay thế.`,
          }
        : {}),
    });
  }
  return out;
}

function listMinistries({ includeMerged = true } = {}) {
  return Object.values(ministriesData).filter((m) => includeMerged || m.status !== 'MERGED');
}

module.exports = {
  getMinistry,
  getMinistriesByChapter,
  expandMinistryCodes,
  listMinistries,
};
