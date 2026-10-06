const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { suggestCore, FALLBACK_PROMPT } = require('../lib/suggest-core');
const { getCandidateEvidence } = require('../lib/suggest-candidates');
const { callLLMJson } = require('../lib/llm-tier');
const { buildEvidenceTrace } = require('../lib/suggest-evidence');
const { applyGirRules } = require('../lib/gir-engine');
const { applyPrecedentBoost, detectSet } = require('../lib/precedent-search');
const { translateToVi, getBrandHint } = require('../lib/glossary');
const { understandQuery } = require('../lib/query-understand');
const { checkSubheading, checkPolarity } = require('../lib/subheading-check');
const { originAssessment } = require('../lib/origin-hints');
const { removeDiacritics } = require('../lib/search-utils');
const { searchOzByKeyword } = require('../lib/oz-precedent-search');
const { applyHistoricalSignals } = require('../lib/suggest-confidence');
const { appendSuggestLog } = require('../lib/ml-log');
// B4: shared knowledge layer — cùng conflicts/explanatory-notes với /api/classify
const { getNoteSummaryForHs } = require('../lib/explanatory-notes-index');
const { getProducts, getGeneratedProducts, isLoaiKhac } = require('../lib/loai-khac-products');
const { captureError } = require('../lib/error-monitor');
// Nguồn chân lý duy nhất cho trích dẫn GIR — mọi nhãn phải có căn cứ + bằng chứng.
const { determineGir, DISCLAIMER_VI } = require('../lib/gir');
const { resolveHeading, toResolverShape } = require('../lib/decision-tables');
const { parseCommodityQuery } = require('../lib/query-parse');
// Cảnh báo thiên vị mã cụ thể — KHÔNG tự đổi đáp án, chỉ nêu để người khai quyết.
const { checkResidualPreference } = require('../lib/residual-guard');
const { applyLearnedCorrections } = require('../lib/learned-corrections');
const { getSuggestCache, setSuggestCache } = require('../lib/suggest-cache');
const { getPrompt } = require('../lib/prompt-version');
const { buildSuggestStatus, LOW_CONFIDENCE } = require('../lib/suggest-status');
const { conflictsData, taxData } = require('../lib/data');
const { sanitizeLlmSuggestions, deterministicSuggestions } = require('../lib/llm-output-guard');

/**
 * productExamples = tên hàng THẬT từ tờ khai; productExamplesGenerated = câu máy
 * sinh, chưa kiểm chứng (chỉ gửi khi không có hàng thật).
 */
function withExamples(s, limit) {
  const real = getProducts(s.hsCode, limit);
  const generated = real.length ? [] : getGeneratedProducts(s.hsCode, limit);
  return {
    ...s,
    productExamples: real,
    ...(generated.length ? { productExamplesGenerated: generated } : {}),
  };
}
const { confusionAlertsFor } = require('../lib/confusion-pairs');

function conflictsDb() {
  return conflictsData;
}



module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (requireAuth(req, res)) return;

  const started = Date.now();
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  // --- BATCH MODE: body.items = [{id, description, ...}] ---
  if (Array.isArray(body?.items)) {
    return handleBatch(req, res, body, started);
  }

  const description = String(body?.description || '').trim();
  if (description.length < 3) {
    return res.status(400).json({ error: 'description is required (min 3 chars)' });
  }

  const topCandidates = Math.min(Math.max(parseInt(body?.options?.topCandidates, 10) || 10, 3), 20);
  const topReranked = Math.min(Math.max(parseInt(body?.options?.topReranked, 10) || 3, 1), 5);

  const facts = body?.facts && typeof body.facts === 'object' && !Array.isArray(body.facts) ? body.facts : {};

  const out = await suggestCore({ description, topCandidates, topReranked, facts }, { started });
  if (out.code === 200) res.setHeader('Cache-Control', 'private, max-age=300');
  return res.status(out.code).json(out.json);
};

/**
 * Batch mode: POST /api/suggest { items: [{id, description, origin?}], options? }
 * - Runs candidate search in parallel for all items
 * - One LLM call per item (capped at 20 items/batch to respect timeouts)
 * - Cache-checked per item before calling LLM
 */
async function handleBatch(req, res, body, started) {
  const rawItems = body.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }
  const MAX_BATCH = 20;
  const items = rawItems.slice(0, MAX_BATCH).map((it, i) => ({
    id: String(it?.id ?? i),
    description: String(it?.description || '').trim(),
  })).filter(it => it.description.length >= 3);

  if (items.length === 0) {
    return res.status(400).json({ error: 'No valid items (description min 3 chars)' });
  }

  const topReranked = Math.min(Math.max(parseInt(body?.options?.topReranked, 10) || 3, 1), 5);
  const topCandidates = Math.min(Math.max(parseInt(body?.options?.topCandidates, 10) || 10, 3), 20);

  // Run all items in parallel
  const results = await Promise.all(items.map(async (item) => {
    const itemStart = Date.now();
    try {
      // Check cache first
      const cached = getSuggestCache(item.description, topReranked, { mode: 'batch' });
      if (cached) {
        return { id: item.id, cached: true, ms: 0, ...cached };
      }

      const understood = await understandQuery(item.description);
      const matchText = understood.searchText || item.description;
      const { candidates: evidence } = await getCandidateEvidence(matchText, { topCandidates });
      if (evidence.length === 0) {
        return { id: item.id, suggestions: [], evidence: [], ms: Date.now() - itemStart };
      }

      const glossaryVi = translateToVi(item.description);
      const brandHint = getBrandHint(item.description);
      const audit = buildEvidenceTrace(matchText, evidence);

      const userPrompt = JSON.stringify({
        description: item.description,
        ...(understood.applied ? { productFactsVi: understood.facts } : {}),
        glossaryTranslation: glossaryVi !== item.description ? glossaryVi : undefined,
        brandHint,
        candidates: evidence.map(({ hsCode, nameVi, policyByHs, score }) => ({ hsCode, nameVi, policyByHs, score })),
        chapterGuidance: audit.chapterGuidance,
        topReranked,
      }, null, 2);

      const { promptText: batchPrompt } = getPrompt(FALLBACK_PROMPT);
      let json = null;
      let model = null;
      let llmError = null;
      try {
        ({ json, model } = await callLLMJson(batchPrompt, userPrompt, { tier: 'premium', timeoutMs: 25000 }));
      } catch (error) {
        captureError(error, { endpoint: 'suggest/batch', stage: 'llm', itemId: item.id });
        llmError = { code: error.code || 'LLM_FAILED', message: String(error.message || '').slice(0, 200) };
      }
      const guarded = sanitizeLlmSuggestions(json?.suggestions, {
      evidence, taxData, limit: topReranked,
      contextText: evidence.map((e) => e.policyByHs || '').join('\n'),
    });
      const engine = guarded.suggestions.length ? 'llm' : 'deterministic';
      const rawSuggestions = engine === 'llm'
        ? guarded.suggestions
        : deterministicSuggestions(evidence, { taxData, limit: topReranked });
      const girRanked = applyGirRules(rawSuggestions, matchText);
      const precedentRanked = applyPrecedentBoost(girRanked.suggestions, matchText);
      const suggestions = precedentRanked.suggestions.map(s => {
        const base = engine === 'deterministic' ? { ...s, confidence: null } : s;
        if (!isLoaiKhac(base.hsCode)) return base;
        return withExamples(base, 3);
      });

      const batchGir = determineGir({
        description: matchText,
        candidates: precedentRanked.suggestions,
        pickedHs: precedentRanked.suggestions?.[0]?.hsCode || null,
        isSet: detectSet(matchText),
        precedentDrove: Boolean(precedentRanked.precedentDrove),
      });

      const result = {
        id: item.id,
        suggestions,
        evidence: evidence.map(({ hsCode, source, score }) => ({ hsCode, source, score })),
        girRulesApplied: batchGir.determinations,
        girDisclaimer: batchGir.disclaimer,
        chapterGuidance: audit.chapterGuidance,
        llmModel: model,
        engine,
        degraded: engine !== 'llm',
        ...(guarded.rejected.length ? { llmRejectedCodes: guarded.rejected } : {}),
        ...(llmError ? { llmError } : {}),
        ms: Date.now() - itemStart,
      };
      if (engine === 'llm') {
        setSuggestCache(item.description, topReranked, { suggestions: result.suggestions, evidence: result.evidence, girRulesApplied: result.girRulesApplied, llmModel: model, engine }, { mode: 'batch' });
      }
      return result;
    } catch (err) {
      captureError(err, { endpoint: 'suggest/batch', itemId: item.id, description: item.description.slice(0, 80) });
      return { id: item.id, error: err.message, suggestions: [], ms: Date.now() - itemStart };
    }
  }));

  return res.status(200).json({
    total: results.length,
    truncated: rawItems.length > MAX_BATCH,
    results,
    totalMs: Date.now() - started,
  });
}
