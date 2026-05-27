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

function listAntiPatterns() {
  return antiPatternsData.patterns || [];
}

module.exports = {
  iso3166Data,
  unitsTchqData,
  chapterRulesData,
  antiPatternsData,
  getCountryByAlpha2,
  getCountryByName,
  getUnitByCode,
  getChapterRules,
  listAntiPatterns,
};
