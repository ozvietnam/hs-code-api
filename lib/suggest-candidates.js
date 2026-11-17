// Hybrid candidate generation: LLM heading-4 → expand 8-digit subcodes + precedent + keyword backup.

const { searchData, taxData, normalizeHs } = require('./data');
const { acftaForOrigin } = require('./acfta');
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
    taxAcftaChina: acftaForOrigin(full.acfta, 'CN', full.mfn),
    taxVat: full.vat || null,
    policyByHs: full.cs || null,
    hasPolicyWarning: Boolean(String(full.cs || '').trim()),
  };
}

function precedentCandidateScore(it, headingSet) {
  const cov = Math.min(100, Math.max(0, Number(it.matchCoverage) || 0));
  if (cov < 35) return 0;
  const h4 = String(it.hsCode || '').slice(0, 4);
  const inHeading = headingSet.has(h4);
  // Cross-heading chỉ khi match rất mạnh — chặn 84099137/90049090 loãng
  if (!inHeading && cov < 72) return 0;
  const freq = Math.min(40, Math.log10((it.ozCount || 1) + 1) * 18);
  const raw = 860 + cov + freq;
  if (!inHeading) return Math.min(raw, 410);
  return raw;
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
  const headingSet = new Set(headings.map((h) => String(h).slice(0, 4)));
  const add = (hs, score, source) => {
    if (!score || score <= 0) return;
    const code = normalizeHs(hs);
    if (!code || code.length < 4) return;
    const prev = pool.get(code);
    if (!prev || score > prev.score) pool.set(code, makeEvidence(code, { score, source }));
  };

  // Mã bẫy từ từ điển tay (avoid[]) — loại cả nhánh tiền lệ/heading, không chỉ keyword.
  // OZV-1323: ưu tiên avoidPrefixes đủ từ searchCandidates; avoidedByTradeRules chỉ
  // liệt kê mã đã bị loại — thiếu khi hybrid expand heading bơm lại mã bẫy mới.
  const avoidPrefixes = [];
  for (const p of keyword.avoidPrefixes || []) {
    if (p) avoidPrefixes.push(String(p));
  }
  for (const a of keyword.avoidedByTradeRules || []) {
    if (a?.prefix) avoidPrefixes.push(String(a.prefix));
  }
  for (const m of keyword.tradeTermMatches || []) {
    for (const a of m.avoid || []) {
      if (a?.prefix) avoidPrefixes.push(String(a.prefix));
    }
  }
  const biCam = (hs) => avoidPrefixes.some((p) => String(hs).startsWith(p));

  for (const it of precedent) {
    if (biCam(it.hsCode)) continue;
    const ps = precedentCandidateScore(it, headingSet);
    add(it.hsCode, ps, 'precedent');
  }

  headings.forEach((h4, hi) => {
    if (biCam(h4)) return;
    const items = idx.get(String(h4).slice(0, 4)) || [];
    const scored = items
      .map((it) => ({ it, s: nameScore(descTokens, removeDiacritics((it.vn || '').toLowerCase())) }))
      .sort((a, b) => b.s - a.s);
    // Không chữ nào của mô tả khớp nhãn dòng con (mô tả ngoại ngữ, tên thương mại)
    // thì thứ tự chỉ là thứ tự biểu thuế: cắt perHeading dòng đầu sẽ bỏ sót dòng
    // đúng (sạc dự phòng → chỉ còn ắc quy chì 8507.10). Lấy rộng gấp đôi để LLM chọn.
    const noLexicalSignal = !scored.length || scored[0].s === 0;
    const ranked = scored.slice(0, noLexicalSignal ? perHeading * 2 : perHeading);
    const headBase = 500 - hi * 20;
    ranked.forEach(({ it, s }, ri) => {
      if (biCam(it.hs)) return;
      add(it.hs, headBase + s * 5 - ri, 'llm-heading');
    });
  });

  // Từ điển tay (trade-synonyms) lấp lỗ hổng ngành Oz chưa nhập — không bị trần 400
  // và phải thắng tiền lệ Oz nhiễu (điểm ~860–910) khi đã khớp tên chợ có căn cứ.
  for (const e of keyword) {
    if (biCam(e.hsCode)) continue;
    const trade = e.source === 'trade-synonyms' || Boolean(e.tradeMatch);
    const score = trade ? Math.max(Number(e.score) || 0, 1000) : Math.min(400, e.score);
    add(e.hsCode, score, e.source || (trade ? 'trade-synonyms' : 'keyword'));
  }

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
