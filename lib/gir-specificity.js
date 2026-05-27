const { taxData, normalizeHs } = require('./data');
const fs = require('fs');
const path = require('path');

const STOP = new Set([
  'loai', 'khac', 'sen', 'va', 'cua', 'cho', 'tu', 'den', 'cac', 'theo', 'dung', 'trong', 'bang',
]);

let specificityCache = null;

function loadSpecificityFile() {
  if (specificityCache) return specificityCache;
  const fullPath = path.join(__dirname, '..', 'data', 'specificity.json');
  if (!fs.existsSync(fullPath)) {
    specificityCache = {};
    return specificityCache;
  }
  try {
    specificityCache = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch {
    specificityCache = {};
  }
  return specificityCache;
}

function indentationLevel(vn) {
  const s = String(vn || '').trimStart();
  const m = s.match(/^((?:-\s*)+)/);
  if (!m) return 0;
  return (m[1].match(/-/g) || []).length;
}

function tokenizeVi(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w));
}

function buildSpecificityRecord(hs, rec) {
  const vn = rec?.vn || '';
  const indent = indentationLevel(vn);
  const specificityTags = [...new Set(tokenizeVi(vn))].slice(0, 12);
  let specificityScore = Math.min(100, 30 + indent * 15 + specificityTags.length * 5);
  const vnNorm = String(vn)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/loai khac/.test(vnNorm)) {
    specificityScore = 28;
  } else if (/00$/.test(hs) && hs.endsWith('0000')) {
    specificityScore -= 25;
  }
  if (/long cuu|len dong vat/.test(vnNorm)) specificityScore -= 12;
  specificityScore = Math.max(10, specificityScore);
  const essentialCharacteristics = specificityTags.slice(0, 5).map((feature) => ({
    feature,
    required: indent >= 2,
  }));
  return {
    hsCode: normalizeHs(hs),
    specificityScore,
    specificityTags,
    essentialCharacteristics,
    indentationLevel: indent,
    incompleteVariants: [],
    knockdownAllowed: indent <= 1,
    primarySubstance: null,
    predominantThreshold: null,
  };
}

function getSpecificityForHs(hs) {
  const key = normalizeHs(hs);
  const file = loadSpecificityFile();
  if (file[key]) return file[key];
  const rec = taxData[key];
  if (!rec) return buildSpecificityRecord(key, { vn: '' });
  return buildSpecificityRecord(key, rec);
}

module.exports = {
  indentationLevel,
  tokenizeVi,
  buildSpecificityRecord,
  getSpecificityForHs,
  loadSpecificityFile,
};
