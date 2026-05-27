const { normalizeHs } = require('./data');
const { getSpecificityForHs, tokenizeVi } = require('./gir-specificity');

const MIXTURE_CHAPTERS = new Set(['28', '29', '38', '72', '74']);

function normalizeDesc(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function matchEssential(description, essentials = []) {
  const desc = normalizeDesc(description);
  if (!essentials.length) return 0;
  let hits = 0;
  for (const e of essentials) {
    const f = normalizeDesc(e.feature || '');
    if (f.length >= 3 && desc.includes(f)) hits += e.required ? 2 : 1;
  }
  return hits;
}

function materialBoost(description, spec, hsCode) {
  const desc = normalizeDesc(description);
  const tags = (spec.specificityTags || []).join(' ');
  let boost = 0;
  if (/\bcotton\b|bong/.test(desc) && /cotton|bong/.test(tags)) boost += 15;
  if (/\bcotton\b|bong/.test(desc) && /long cuu|len|wool/.test(tags)) boost -= 18;
  if (/\bcotton\b|bong/.test(desc) && String(hsCode || '').startsWith('62059')) boost -= 10;
  if (/so mi|shirt/.test(desc) && /so mi|ao/.test(tags)) boost += 6;
  if (/so mi|shirt/.test(desc) && /ro-mooc|romooc/.test(tags)) boost -= 20;
  return boost;
}

function enrichCandidate(candidate, description) {
  const hsCode = normalizeHs(candidate.hsCode);
  const spec = getSpecificityForHs(hsCode);
  const confidence = Number(candidate.confidence) || Number(candidate.score) || 0;
  const essentialBoost = matchEssential(description, spec.essentialCharacteristics) * 5;
  const matBoost = materialBoost(description, spec, hsCode);
  return {
    ...candidate,
    hsCode,
    specificityScore: spec.specificityScore,
    specificityTags: spec.specificityTags,
    essentialCharacteristics: spec.essentialCharacteristics,
    confidence: confidence + essentialBoost + matBoost,
    _girBoost: essentialBoost + matBoost,
  };
}

/**
 * Apply GIR 2a / 3a / 3c after LLM rerank (Issue #19).
 */
function applyGirRules(candidates, description) {
  const rulesApplied = [];
  if (!candidates?.length) {
    return { suggestions: [], girRankingRules: rulesApplied };
  }

  let filtered = candidates.map((c) => enrichCandidate(c, description));

  const maxSpec = Math.max(...filtered.map((c) => c.specificityScore || 0));
  const before3a = filtered.length;
  filtered = filtered.filter((c) => (c.specificityScore || 0) >= maxSpec - 10);
  if (filtered.length < before3a) rulesApplied.push('GIR-3a');

  const essentialHits = filtered.some((c) => matchEssential(description, c.essentialCharacteristics) > 0);
  if (essentialHits) rulesApplied.push('GIR-2a');

  filtered.sort((a, b) => b.confidence - a.confidence);
  if (
    filtered.length >= 2 &&
    Math.abs(filtered[0].confidence - filtered[1].confidence) < 3
  ) {
    if (filtered[0].hsCode.localeCompare(filtered[1].hsCode) < 0) {
      [filtered[0], filtered[1]] = [filtered[1], filtered[0]];
    }
    rulesApplied.push('GIR-3c');
  }

  const ch = filtered[0]?.hsCode?.slice(0, 2);
  if (ch && MIXTURE_CHAPTERS.has(ch) && /\d+\s*%|hoa hop|hon hop|mixture/i.test(description)) {
    rulesApplied.push('GIR-2b');
  }

  return {
    suggestions: filtered.map(({ _girBoost, ...rest }) => rest),
    girRankingRules: rulesApplied,
  };
}

module.exports = { applyGirRules, enrichCandidate, matchEssential };
