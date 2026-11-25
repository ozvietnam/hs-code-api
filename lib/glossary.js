const glossaryData = require('../data/glossary-xnk.json');

const entries = glossaryData.entries || {};
const sortedKeys = Object.keys(entries).sort((a, b) => b.length - a.length);
const RULES = sortedKeys.map((key) => {
  const entry = entries[key];
  const vi = entry?.vi || null;
  return {
    key,
    keyLower: key.toLowerCase(),
    re: new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
    entry,
    vi,
    viWords: vi ? vi.split(/\s+/).filter((w) => w.length >= 4) : [],
    expansion: entry?.expansion || null,
    isBrandHint: Boolean(entry?.category === 'brand' || entry?.hsHint),
    hasCategory: Boolean(entry?.category && entry.category !== 'brand'),
  };
});

function lookup(term) {
  const key = String(term || '').toLowerCase();
  return entries[key] || entries[term] || null;
}

function translateToVi(text) {
  let out = String(text || '');
  for (let i = 0; i < RULES.length; i += 1) {
    const r = RULES[i];
    if (r.vi) out = out.replace(r.re, r.vi);
  }
  return out.replace(/\s+/g, ' ').trim();
}

function getBrandHint(text) {
  const lower = String(text || '').toLowerCase();
  for (let i = 0; i < RULES.length; i += 1) {
    const r = RULES[i];
    if (!r.isBrandHint) continue;
    if (lower.includes(r.keyLower)) {
      return { term: r.key, hsHint: r.entry.hsHint || null, vi: r.vi };
    }
  }
  return null;
}

function getCategoryHint(text) {
  const lower = String(text || '').toLowerCase();
  const hints = [];
  for (let i = 0; i < RULES.length; i += 1) {
    const r = RULES[i];
    if (!r.hasCategory) continue;
    if (lower.includes(r.keyLower)) {
      hints.push({ term: r.key, category: r.entry.category, vi: r.vi });
    }
  }
  return hints;
}

function glossaryExpansionTerms(text) {
  const terms = new Set();
  const lower = String(text || '').toLowerCase();
  for (let i = 0; i < RULES.length; i += 1) {
    const r = RULES[i];
    if (!lower.includes(r.keyLower)) continue;
    if (r.vi) {
      terms.add(r.vi);
      for (let j = 0; j < r.viWords.length; j += 1) terms.add(r.viWords[j]);
    }
    if (r.expansion) terms.add(r.expansion);
  }
  return [...terms];
}

module.exports = {
  glossaryData,
  translateToVi,
  getBrandHint,
  getCategoryHint,
  glossaryExpansionTerms,
  lookup,
};
