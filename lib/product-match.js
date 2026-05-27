const { taxData, normalizeHs } = require('./data');
const { searchCandidates } = require('./search-utils');
const { translateToVi } = require('./glossary');
const { detectMaterials } = require('./material-taxonomy');

const MATCH_MODEL = 'search-hybrid-v1';

function formatHsDotted(hs) {
  const code = normalizeHs(hs);
  return `${code.slice(0, 4)}.${code.slice(4, 6)}.${code.slice(6, 8)}`;
}

function cleanLabel(vn) {
  return String(vn || '')
    .replace(/^[\s-]+/, '')
    .trim();
}

function buildMatchQuery(body) {
  const parts = [];
  if (body.titleVi) parts.push(String(body.titleVi));
  if (body.titleZh) {
    parts.push(String(body.titleZh));
    const vi = translateToVi(body.titleZh);
    if (vi && vi !== body.titleZh) parts.push(vi);
  }
  if (body.descriptionZh) parts.push(String(body.descriptionZh));
  if (body.descriptionVi) parts.push(String(body.descriptionVi));

  for (const spec of body.specs || []) {
    if (!spec || typeof spec !== 'object') continue;
    if (spec.key) parts.push(String(spec.key));
    if (spec.value) parts.push(String(spec.value));
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function matchProducts(body) {
  const titleVi = String(body?.titleVi || '').trim();
  const titleZh = String(body?.titleZh || '').trim();
  if (!titleVi && !titleZh) {
    const err = new Error('titleVi or titleZh is required');
    err.code = 'VALIDATION';
    throw err;
  }

  const query = buildMatchQuery(body);
  if (query.length < 2) {
    const err = new Error('Could not build search context from payload');
    err.code = 'VALIDATION';
    throw err;
  }

  const topK = Math.min(Math.max(parseInt(body?.topK, 10) || 5, 1), 10);
  const candidates = searchCandidates(query, { topCandidates: topK * 4 });
  const maxScore = candidates[0]?.score || 1;

  const matches = candidates.slice(0, topK).map((c) => {
    const hsCode = normalizeHs(c.hsCode);
    const row = taxData[hsCode];
    return {
      code: formatHsDotted(hsCode),
      label: cleanLabel(row?.vn || c.nameVi),
      confidence: Math.round(Math.min(0.99, (c.score / maxScore) * 0.82 + 0.12) * 1000) / 1000,
      chapter: hsCode.slice(0, 2),
      heading: hsCode.slice(0, 4),
      hsCode,
    };
  });

  return {
    ok: true,
    matches,
    materialsDetected: detectMaterials(query),
    model: MATCH_MODEL,
    matchedAt: new Date().toISOString(),
    queryUsed: query,
  };
}

module.exports = { matchProducts, buildMatchQuery, formatHsDotted, MATCH_MODEL };
