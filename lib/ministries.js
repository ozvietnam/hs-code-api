const ministriesData = require('../data/ministries-vn.json');

const ALIASES = {
  BVHTT_DL: 'BVHTTDL',
};

function getMinistry(code) {
  const key = ALIASES[code] || code;
  return ministriesData[key] || null;
}

function chapterInRange(chapter, spec) {
  if (!spec) return false;
  if (spec === '*') return true;
  const ch = String(parseInt(chapter, 10));
  if (spec === ch) return true;
  if (spec.includes('-')) {
    const [a, b] = spec.split('-').map((x) => parseInt(x, 10));
    const n = parseInt(ch, 10);
    return n >= a && n <= b;
  }
  return spec === ch;
}

function getMinistriesByChapter(chapter) {
  const ch = String(parseInt(chapter, 10)).padStart(2, '0');
  return Object.values(ministriesData).filter((m) =>
    (m.responsibleChapters || []).some((spec) => chapterInRange(ch, spec)),
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
    });
  }
  return out;
}

function listMinistries() {
  return Object.values(ministriesData);
}

module.exports = {
  getMinistry,
  getMinistriesByChapter,
  expandMinistryCodes,
  listMinistries,
};
