const fs = require('fs');
const path = require('path');

function loadJson(fileName, fallback) {
  const fullPath = path.join(__dirname, '..', 'data', fileName);
  if (!fs.existsSync(fullPath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch {
    return fallback;
  }
}

const iso3166Data = loadJson('iso-3166-vn.json', { countries: [] });
const unitsTchqData = loadJson('units-tchq.json', { units: [] });
const chapterRulesData = loadJson('chapter-specific-rules.json', { chapters: {} });
const fieldCatalog = loadJson('chapter-declaration-fields.json', { fields: {}, chapters: {} });
const headingFieldsData = loadJson('heading-declaration-fields.json', { headings: {} });
const hsOverridesData = loadJson('hs-declaration-overrides.json', { hsCodes: {} });
const antiPatternsData = loadJson('anti-patterns.json', { patterns: [], validation: [] });

function getCountryByAlpha2(alpha2) {
  const code = String(alpha2 || '').toUpperCase();
  return iso3166Data.countries.find((c) => c.alpha2 === code) || null;
}

function getCountryByName(name) {
  const n = String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
  return (
    iso3166Data.countries.find((c) => {
      const vi = (c.nameVi || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');
      const en = (c.nameEn || '').toLowerCase();
      return vi === n || en === n || vi.includes(n) || en.includes(n);
    }) || null
  );
}

function getUnitByCode(code) {
  const u = String(code || '').toUpperCase();
  const byCode = unitsTchqData.units.find((item) => item.code === u);
  if (byCode) return byCode;
  const lower = String(code || '').toLowerCase();
  return (
    unitsTchqData.units.find(
      (item) =>
        item.nameVi?.toLowerCase() === lower ||
        item.nameEn?.toLowerCase() === lower
    ) || null
  );
}

function getChapterRules(chapter) {
  const ch = String(chapter || '').padStart(2, '0').slice(-2);
  return chapterRulesData.chapters[ch] || null;
}

function normalizeHsCode(hsCode) {
  return String(hsCode || '')
    .replace(/\D/g, '')
    .padStart(8, '0')
    .slice(0, 8);
}

function mapFieldKeys(keys) {
  const fields = fieldCatalog.fields || {};
  return (keys || []).map((key) => fields[key] || { key, labelVi: key, ecusHint: key, patterns: [] });
}

function applyHsOverride(required, recommended, hsRule) {
  let req = [...required];
  let rec = [...recommended];
  if (hsRule.replace) {
    req = [...(hsRule.required || [])];
    rec = [...(hsRule.recommended || [])];
    return { required: req, recommended: rec };
  }
  for (const key of hsRule.removeRequired || []) {
    req = req.filter((k) => k !== key);
    rec = rec.filter((k) => k !== key);
  }
  for (const key of hsRule.addRequired || []) {
    if (!req.includes(key)) req.push(key);
  }
  for (const key of hsRule.addRecommended || []) {
    if (!rec.includes(key)) rec.push(key);
  }
  return { required: req, recommended: rec };
}

/**
 * Resolve ECUS field requirements: HS 8 số → nhóm 4 số → chương 2 số.
 */
function getDeclarationFieldSpec(hsCode) {
  const hs = normalizeHsCode(hsCode);
  if (!hs || hs === '00000000') return null;

  const chapter = String(parseInt(hs.slice(0, 2), 10)).padStart(2, '0');
  const heading = hs.slice(0, 4);
  const headingRule = headingFieldsData.headings?.[heading];
  const chapterRule = fieldCatalog.chapters?.[chapter];
  const hsRule = hsOverridesData.hsCodes?.[hs];

  let required = [];
  let recommended = [];
  let source = 'none';
  let titleVi = null;
  let noteVi = null;
  let template = null;

  if (headingRule) {
    required = [...(headingRule.required || [])];
    recommended = [...(headingRule.recommended || [])];
    source = 'heading';
    titleVi = headingRule.titleVi;
    noteVi = headingRule.noteVi;
    template = headingRule.template;
  } else if (chapterRule) {
    required = [...(chapterRule.required || [])];
    recommended = [...(chapterRule.recommended || [])];
    source = 'chapter';
    titleVi = chapterRule.titleVi;
  }

  if (hsRule) {
    const merged = applyHsOverride(required, recommended, hsRule);
    required = merged.required;
    recommended = merged.recommended;
    source = 'hs';
    titleVi = hsRule.titleVi || titleVi;
    noteVi = hsRule.noteVi || noteVi;
  }

  if (!required.length && !recommended.length) return null;

  return {
    hsCode: hs,
    chapter,
    heading,
    source,
    template,
    titleVi,
    noteVi,
    required: mapFieldKeys(required),
    recommended: mapFieldKeys(recommended),
    headingMeta: headingRule
      ? { subcodeCount: headingRule.subcodeCount, sampleHs: headingRule.sampleHs }
      : null,
  };
}

/** @deprecated use getDeclarationFieldSpec */
function getChapterDeclarationSpec(chapter, hsCode) {
  return getDeclarationFieldSpec(hsCode || `${String(chapter).padStart(2, '0')}000000`);
}

function listAntiPatterns() {
  return antiPatternsData.patterns || [];
}

module.exports = {
  iso3166Data,
  unitsTchqData,
  chapterRulesData,
  fieldCatalog,
  headingFieldsData,
  hsOverridesData,
  antiPatternsData,
  getCountryByAlpha2,
  getCountryByName,
  getUnitByCode,
  getChapterRules,
  getDeclarationFieldSpec,
  getChapterDeclarationSpec,
  listAntiPatterns,
};
