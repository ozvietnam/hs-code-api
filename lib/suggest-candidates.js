// Hybrid candidate generation: LLM heading-4 → expand 8-digit subcodes + precedent + keyword backup.

const { searchData, taxData, normalizeHs } = require('./data');
const { searchCandidates, removeDiacritics } = require('./search-utils');
const { getCandidates } = require('./retrieve-candidates');

const DEFAULT_OPTS = {
  topCandidates: 12,
  perHeading: 6,
  maxHeadings: 6,
  includePrecedent: true,
  tier: 'standard',
  timeoutMs: 15000,
};

let _byHeading = null;
function headingIndex() {
  if (_byHeading) return _byHeading;
  _byHeading = new Map();
  for (const it of searchData) {
    const h4 = String(it.hs).slice(0, 4);
    if (!_byHeading.has(h4)) _byHeading.set(h4, []);
    _byHeading.get(h4).push(it);
  }
  return _byHeading;
}

function tokenize(text) {
  return removeDiacritics(String(text || '').toLowerCase())
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !/^\d+$/.test(w));
}

function nameScore(descTokens, vnPlain) {
  let s = 0;
  for (const t of descTokens) if (vnPlain.includes(t)) s += 1;
  return s;
}

function makeEvidence(hs, { score, source }) {
  const code = normalizeHs(hs);
  const full = taxData[code] || {};
  return {
    hsCode: code,
    nameVi: full.vn || full.en || '',
    score,
    source,
    taxNkPreferential: full.mfn || null,
    taxAcfta: full.acfta || null,
    taxVat: full.vat || null,
    policyByHs: full.cs || null,
    hasPolicyWarning: Boolean(String(full.cs || '').trim()),
  };
}

async function buildSuggestCandidates(description, opts = {}) {
  const topCandidates = opts.topCandidates || DEFAULT_OPTS.topCandidates;
  const perHeading = opts.perHeading || DEFAULT_OPTS.perHeading;
  const maxHeadings = opts.maxHeadings || DEFAULT_OPTS.maxHeadings;
  const includePrecedent = opts.includePrecedent !== false;
  const descTokens = tokenize(description);

  const attrs = { tenHang: description };
  const [candResult, keyword] = await Promise.all([
    getCandidates(attrs, {
      tier: opts.tier || DEFAULT_OPTS.tier,
      timeoutMs: opts.timeoutMs || DEFAULT_OPTS.timeoutMs,
      limit: 8,
    }).catch(() => ({ headings: [], precedentCodes: [] })),
    searchCandidates(description, { topCandidates }),
  ]);

  const headings = (candResult.headings || [])
    .map((h) => h.code4)
    .slice(0, maxHeadings);
  const precedent = includePrecedent
    ? (candResult.precedentCodes || []).map((c) => ({
      hsCode: c.hs,
      ozCount: c.ozCount,
      matchCoverage: c.coverage,
    }))
    : [];
  const idx = headingIndex();
  const pool = new Map();
  const add = (hs, score, source) => {
    const code = normalizeHs(hs);
    if (!code || code.length < 4) return;
    const prev = pool.get(code);
    if (!prev || score > prev.score) pool.set(code, makeEvidence(code, { score, source }));
  };

  for (const it of precedent) {
    const cov = it.matchCoverage || 0;
    add(it.hsCode, 900 + cov + Math.min(50, it.ozCount || 1), 'precedent');
  }

  headings.forEach((h4, hi) => {
    const items = idx.get(String(h4).slice(0, 4)) || [];
    const ranked = items
      .map((it) => ({ it, s: nameScore(descTokens, removeDiacritics((it.vn || '').toLowerCase())) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, perHeading);
    const headBase = 500 - hi * 20;
    ranked.forEach(({ it, s }, ri) => add(it.hs, headBase + s * 5 - ri, 'llm-heading'));
  });

  for (const e of keyword) add(e.hsCode, Math.min(400, e.score), e.source);

  const candidates = [...pool.values()].sort((a, b) => b.score - a.score).slice(0, topCandidates);

  return {
    candidates,
    meta: {
      headings,
      precedent,
      precedentCount: precedent.length,
      keywordCount: keyword.length,
      poolSize: pool.size,
      usedLlmHeadings: headings.length > 0,
    },
  };
}

/** Shared entry for /api/suggest and accuracy-benchmark.mjs */
async function getCandidateEvidence(description, opts = {}) {
  const topCandidates = opts.topCandidates || 10;
  const hybrid = opts.hybrid !== false && process.env.SUGGEST_HYBRID_CANDIDATES !== '0';
  if (!hybrid) {
    return {
      candidates: searchCandidates(description, { topCandidates }),
      ozPrecedents: [],
    };
  }
  try {
    const { candidates, meta } = await buildSuggestCandidates(description, {
      ...DEFAULT_OPTS,
      topCandidates: Math.max(topCandidates, DEFAULT_OPTS.topCandidates),
      ...opts,
    });
    return {
      candidates: candidates.length ? candidates : searchCandidates(description, { topCandidates }),
      ozPrecedents: meta.precedent || [],
    };
  } catch {
    return {
      candidates: searchCandidates(description, { topCandidates }),
      ozPrecedents: [],
    };
  }
}

module.exports = { buildSuggestCandidates, getCandidateEvidence, DEFAULT_OPTS };
