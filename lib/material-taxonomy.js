const path = require('path');
const fs = require('fs');

const TAXONOMY_FILES = ['polymers', 'woods', 'fibers', 'chemicals', 'metals', 'rubbers', 'textiles'];

let mergedIndex = null;

function loadTaxonomyFile(name) {
  const fullPath = path.join(__dirname, '..', 'data', 'taxonomy', `${name}.json`);
  if (!fs.existsSync(fullPath)) return {};
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function buildIndex() {
  if (mergedIndex) return mergedIndex;
  mergedIndex = [];
  for (const file of TAXONOMY_FILES) {
    const data = loadTaxonomyFile(file);
    for (const [key, meta] of Object.entries(data)) {
      mergedIndex.push({
        key: key.toLowerCase(),
        family: file,
        ...meta,
      });
      if (meta.nameVi) {
        const normVi = normalizeText(meta.nameVi);
        // Min 3 chars: Vietnamese material words are typically 3-4 syllables
        // (sắt/sat, thép/thep, nhựa/nhua, vải/vai, gỗ/go, đồng/dong).
        // The 5-char minimum previously excluded ALL Vietnamese material aliases,
        // causing materialsDetected=[] for every Vietnamese query and breaking the
        // spam-chapter penalty logic in search-utils (49070060/84864020/59111000).
        // Collisions from short normalized forms ("soi") are resolved by requiring
        // word-boundary matching in detectMaterials (\\b), not just substring.
        if (normVi.length >= 3) {
          mergedIndex.push({
            key: normVi,
            family: file,
            aliasOf: key,
            ...meta,
          });
        }
      }
    }
  }
  return mergedIndex;
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function detectMaterials(text) {
  const norm = normalizeText(text);
  const hits = [];
  const seen = new Set();

  for (const entry of buildIndex()) {
    const key = entry.key;
    if (key.length < 2) continue;
    const pattern = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (!pattern.test(norm) && !norm.includes(key)) continue;
    const id = entry.aliasOf || entry.key;
    if (seen.has(id)) continue;
    seen.add(id);
    hits.push({
      material: id,
      family: entry.family,
      nameVi: entry.nameVi || null,
      category: entry.category || entry.type || null,
      hsHints: entry.hsHints || [],
    });
  }

  return hits;
}

function materialExpansionTerms(text) {
  const materials = detectMaterials(text);
  const terms = new Set();
  const chapterPrefixes = new Set();

  for (const m of materials) {
    if (m.nameVi) terms.add(m.nameVi);
    terms.add(m.material);
    for (const hint of m.hsHints || []) {
      if (hint.length >= 2) {
        terms.add(hint);
        chapterPrefixes.add(hint.slice(0, 2));
      }
    }
  }

  return {
    materials,
    terms: [...terms],
    preferChapterPrefixes: [...chapterPrefixes],
  };
}

function listTaxonomySummary() {
  return TAXONOMY_FILES.map((name) => ({
    family: name,
    count: Object.keys(loadTaxonomyFile(name)).length,
  }));
}

module.exports = {
  detectMaterials,
  materialExpansionTerms,
  listTaxonomySummary,
};
