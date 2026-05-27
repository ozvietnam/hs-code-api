const fs = require('fs');
const path = require('path');

const LEGAL_PATH = path.join(__dirname, '..', 'data', 'legal-docs.json');

let cache = null;

function loadLegalDocs() {
  if (cache) return cache;
  if (!fs.existsSync(LEGAL_PATH)) {
    cache = { documents: {} };
    return cache;
  }
  cache = JSON.parse(fs.readFileSync(LEGAL_PATH, 'utf8'));
  return cache;
}

function normalizeDocCode(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/Đ/g, 'D')
    .replace(/NĐ/g, 'ND')
    .replace(/QĐ/g, 'QD')
    .trim();
}

function getDocByCode(code) {
  const key = normalizeDocCode(code);
  const data = loadLegalDocs();
  return data.documents[key] || null;
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
  listDocs,
  extractDocCodesFromText,
  enrichLegalCitations,
  normalizeDocCode,
};
