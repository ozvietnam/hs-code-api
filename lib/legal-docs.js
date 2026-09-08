const fs = require('fs');
const path = require('path');

const LEGAL_PATH = path.join(__dirname, '..', 'data', 'legal-docs.json');

let cache = null;
let aliasIndex = null;

function loadLegalDocs() {
  if (cache) return cache;
  if (!fs.existsSync(LEGAL_PATH)) {
    cache = { documents: {} };
    aliasIndex = new Map();
    return cache;
  }
  cache = JSON.parse(fs.readFileSync(LEGAL_PATH, 'utf8'));
  aliasIndex = null;
  return cache;
}

function normalizeDocCode(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/Đ/g, 'D')
    .replace(/NĐ/g, 'ND')
    .replace(/QĐ/g, 'QD')
    .replace(/\./g, '/')
    .replace(/\s+NG[AÀÁẠ]Y\s+\d{1,2}[/.]\d{1,2}[/.]\d{2,4}/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tách số hiệu văn bản thành number / year / type-issuer.
 * Chịu được các dạng hay gặp trong enrichment: 2310/QD-BCT-2025,
 * 2310/QD-BCT 2025, 1182/2021/QD-BCT, 45/2023/TT-BCT-PL1.
 */
function parseDocCode(code) {
  const n = normalizeDocCode(code);
  let m = n.match(/^(\d+)\/(\d{4})\/([A-Z0-9]+(?:-[A-Z0-9]+)*?)(?:-PL(\d+))?$/);
  if (m) return { number: m[1], year: m[2], typeIssuer: m[3], annex: m[4] || null, raw: n };
  m = n.match(/^(\d+)\/([A-Z0-9]+(?:-[A-Z0-9]+)*?)-(\d{4})(?:-PL(\d+))?$/);
  if (m) return { number: m[1], year: m[3], typeIssuer: m[2], annex: m[4] || null, raw: n };
  m = n.match(/^(\d+)\/([A-Z0-9]+(?:-[A-Z0-9]+)*?)\s+(\d{4})(?:-PL(\d+))?$/);
  if (m) return { number: m[1], year: m[3], typeIssuer: m[2], annex: m[4] || null, raw: n };
  m = n.match(/^(\d+)\/([A-Z0-9]+(?:-[A-Z0-9]+)*?)(?:-PL(\d+))?$/);
  if (m) return { number: m[1], year: null, typeIssuer: m[2], annex: m[3] || null, raw: n };
  return { number: null, year: null, typeIssuer: null, annex: null, raw: n };
}

function aliasKeys(code) {
  const p = parseDocCode(code);
  const keys = new Set([normalizeDocCode(code)]);
  if (!p.number || !p.typeIssuer) return [...keys];
  const { number, year, typeIssuer, annex } = p;
  keys.add(`${number}/${typeIssuer}`);
  if (year) {
    keys.add(`${number}/${year}/${typeIssuer}`);
    keys.add(`${number}/${typeIssuer}-${year}`);
    keys.add(`${number}/${typeIssuer} ${year}`);
  }
  if (annex) {
    keys.add(`${number}/${typeIssuer}-PL${annex}`);
    if (year) keys.add(`${number}/${year}/${typeIssuer}-PL${annex}`);
  }
  // Typo hay gặp: BTTT (thiếu một T) ↔ BTTTT
  if (/BTTT$/.test(typeIssuer) && !/BTTTT$/.test(typeIssuer)) {
    const fixed = typeIssuer.replace(/BTTT$/, 'BTTTT');
    keys.add(`${number}/${fixed}`);
    if (year) keys.add(`${number}/${year}/${fixed}`);
  }
  return [...keys];
}

function buildAliasIndex(data) {
  const map = new Map();
  const add = (alias, key) => {
    if (!alias) return;
    if (!map.has(alias)) map.set(alias, []);
    const arr = map.get(alias);
    if (!arr.includes(key)) arr.push(key);
  };
  for (const [key, doc] of Object.entries(data.documents || {})) {
    for (const a of aliasKeys(key)) add(a, key);
    for (const extra of doc.aliases || []) {
      for (const a of aliasKeys(extra)) add(a, key);
    }
  }
  return map;
}

function rankDocs(docs) {
  return [...docs].sort((a, b) => {
    const av = a.verified ? 1 : 0;
    const bv = b.verified ? 1 : 0;
    if (bv !== av) return bv - av;
    return (b.citedInHsCount || 0) - (a.citedInHsCount || 0);
  });
}

function findDocsByCode(code) {
  const data = loadLegalDocs();
  if (!aliasIndex) aliasIndex = buildAliasIndex(data);
  const found = new Map();
  for (const k of aliasKeys(code)) {
    const doc = data.documents[k];
    if (doc) found.set(doc.code || k, doc);
    for (const key of aliasIndex.get(k) || []) {
      const hit = data.documents[key];
      if (hit) found.set(hit.code || key, hit);
    }
  }
  return rankDocs([...found.values()]);
}

function getDocByCode(code) {
  const hits = findDocsByCode(code);
  return hits[0] || null;
}

function listDocs({ chapter, status, issuer } = {}) {
  const data = loadLegalDocs();
  return Object.values(data.documents || {}).filter((doc) => {
    if (chapter && !(doc.scopeHsChapters || []).includes(String(chapter).padStart(2, '0'))) {
      return false;
    }
    if (status && doc.status !== status) return false;
    if (issuer && doc.issuer !== issuer) return false;
    return true;
  });
}

const DOC_INLINE_RE = /\d{1,4}\/\d{4}\/(?:TT|NĐ|ND|QĐ|QD|CV)-[A-ZĐ]+/gi;

function extractDocCodesFromText(text) {
  const found = new Set();
  const matches = String(text || '').match(DOC_INLINE_RE) || [];
  for (const raw of matches) {
    found.add(normalizeDocCode(raw));
  }
  return [...found];
}

function enrichLegalCitations(text) {
  const codes = extractDocCodesFromText(text);
  return codes.map((code) => {
    const doc = getDocByCode(code);
    if (!doc) {
      return { code, titleVi: null, url: `https://vbpl.vn/search?q=${encodeURIComponent(code)}`, status: 'UNKNOWN' };
    }
    return {
      code: doc.code,
      type: doc.type,
      issuer: doc.issuer,
      issuerFullVi: doc.issuerFullVi,
      titleVi: doc.titleVi,
      url: doc.url,
      status: doc.status,
    };
  });
}

module.exports = {
  loadLegalDocs,
  getDocByCode,
  findDocsByCode,
  listDocs,
  extractDocCodesFromText,
  enrichLegalCitations,
  normalizeDocCode,
  parseDocCode,
  aliasKeys,
};
