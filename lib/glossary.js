const glossaryData = require('../data/glossary-xnk.json');

const entries = glossaryData.entries || {};
const sortedKeys = Object.keys(entries).sort((a, b) => b.length - a.length);

function lookup(term) {
  const key = String(term || '').toLowerCase();
  return entries[key] || entries[term] || null;
}

function translateToVi(text) {
  let out = String(text || '');
  for (const key of sortedKeys) {
    const re = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const entry = entries[key];
    if (entry?.vi) out = out.replace(re, entry.vi);
  }
  return out.replace(/\s+/g, ' ').trim();
}

function getBrandHint(text) {
  const lower = String(text || '').toLowerCase();
  for (const key of sortedKeys) {
    const entry = entries[key];
    if (entry?.category !== 'brand' && !entry?.hsHint) continue;
    if (lower.includes(key.toLowerCase())) {
      return { term: key, hsHint: entry.hsHint || null, vi: entry.vi };
    }
  }
  return null;
}

function getCategoryHint(text) {
  const lower = String(text || '').toLowerCase();
  const hints = [];
  for (const key of sortedKeys) {
    const entry = entries[key];
    if (!entry?.category || entry.category === 'brand') continue;
    if (lower.includes(key.toLowerCase())) {
      hints.push({ term: key, category: entry.category, vi: entry.vi });
    }
  }
  return hints;
}

function glossaryExpansionTerms(text) {
  const terms = new Set();
  const lower = String(text || '').toLowerCase();
  for (const key of sortedKeys) {
    if (!lower.includes(key.toLowerCase())) continue;
    const entry = entries[key];
    if (entry?.vi) {
      terms.add(entry.vi);
      entry.vi.split(/\s+/).forEach((w) => {
        if (w.length >= 4) terms.add(w);
      });
    }
    if (entry?.expansion) terms.add(entry.expansion);
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
