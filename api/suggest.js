const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { searchCandidates } = require('../lib/search-utils');
const { buildSuggestCandidates } = require('../lib/suggest-candidates');
const { callLLMJson } = require('../lib/llm-tier');
const { buildEvidenceTrace } = require('../lib/suggest-evidence');
const { applyGirRules } = require('../lib/gir-engine');
const { applyPrecedentBoost, detectSet } = require('../lib/precedent-search');
const { translateToVi, getBrandHint } = require('../lib/glossary');
const { searchOzByKeyword } = require('../lib/oz-precedent-search');
const { applyHistoricalSignals } = require('../lib/suggest-confidence');
const { appendSuggestLog } = require('../lib/ml-log');
// B4: shared knowledge layer — cùng conflicts/explanatory-notes với /api/classify
const { getNoteSummaryForHs } = require('../lib/explanatory-notes-index');
const { getProducts, isLoaiKhac } = require('../lib/loai-khac-products');
const { captureError } = require('../lib/error-monitor');
const { applyLearnedCorrections } = require('../lib/learned-corrections');
const { getSuggestCache, setSuggestCache } = require('../lib/suggest-cache');
const { getPrompt } = require('../lib/prompt-version');
const fs = require('fs');
const path = require('path');
let _conflicts;
function conflictsDb() {
  try { return (_conflicts ||= JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'conflicts.json'), 'utf8'))); }
  catch { return (_conflicts = {}); }
}

// Candidate generation: hybrid (LLM heading + precedent + keyword) mặc định bật.
// SUGGEST_HYBRID_CANDIDATES=0 → rollback về keyword thuần. buildSuggestCandidates
// đã tự fallback keyword nội bộ nếu LLM lỗi, nên không bao giờ tệ hơn tầng cũ.
const HYBRID_CANDIDATES = process.env.SUGGEST_HYBRID_CANDIDATES !== '0';
async function getCandidateEvidence(description, topCandidates) {
  if (!HYBRID_CANDIDATES) return searchCandidates(description, { topCandidates });
  try {
    const { candidates } = await buildSuggestCandidates(description, {
      topCandidates: Math.max(topCandidates, 12),
      perHeading: 6,
      includePrecedent: true,
      tier: 'standard',
      timeoutMs: 15000,
    });
    if (candidates && candidates.length) return candidates;
  } catch { /* fall back to keyword below */ }
  return searchCandidates(description, { topCandidates });
}

// Default prompt — used if data/prompts/index.json or active file is missing
const FALLBACK_PROMPT = `Bạn là chuyên gia phân loại hàng hóa hải quan Việt Nam.
Cho mô tả hàng hóa và danh sách mã HS candidate, hãy chọn tối đa 3 mã phù hợp nhất.
Áp dụng GIR và gợi ý chương (girRulesApplied) khi giải thích.
Chỉ trả JSON đúng schema:
{
  "suggestions": [
    {
      "hsCode": "85171300",
      "nameVi": "Tên hàng",
      "confidence": 92,
      "reasoning": "Giải thích ngắn",
      "disambiguationFeatures": ["brand", "model"],
      "girRulesApplied": ["GIR 1", "Chương 85: thiết bị điện hoàn chỉnh"]
    }
  ]
}
Không thêm text ngoài JSON.`;

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
  const glossaryVi = translateToVi(description);
  const brandHint = getBrandHint(description);
  const evidence = await getCandidateEvidence(description, topCandidates);
  const audit = buildEvidenceTrace(description, evidence);

  if (evidence.length === 0) {
    appendSuggestLog({
      description: description.slice(0, 120),
      top1Hs: null,
      top1Confidence: null,
      ms: Date.now() - started,
      candidates: 0,
      wasOverridden: false,
    });
    return res.status(200).json({
      suggestions: [],
      evidence: [],
      evidenceTrace: [],
      girRulesApplied: audit.girRulesApplied,
      antiPatternWarnings: audit.antiPatternWarnings,
      llmModel: null,
      ms: Date.now() - started,
      message: 'No candidates found in tariff index',
    });
  }

  // Check in-memory cache before calling LLM
  const cached = getSuggestCache(description, topReranked);
  if (cached) {
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).json({ ...cached, cached: true });
  }

  try {
    const userPrompt = JSON.stringify(
      {
        description,
        glossaryTranslation: glossaryVi !== description ? glossaryVi : undefined,
        brandHint,
        candidates: evidence.map(({ hsCode, nameVi, policyByHs, score }) => ({
          hsCode,
          nameVi,
          policyByHs,
          score,
        })),
        girRulesApplied: audit.girRulesApplied,
        antiPatternWarnings: audit.antiPatternWarnings,
        topReranked,
      },
      null,
      2
    );

    // callLLMJson: Gemini → OpenRouter fallback (see lib/llm-tier.js)
    const { promptText, variant: promptVariant, promptVersion } = getPrompt(FALLBACK_PROMPT);
    const { json, model } = await callLLMJson(promptText, userPrompt, {
      tier: 'premium',
      timeoutMs: 30000,
    });

    const rawSuggestions = (json.suggestions || []).slice(0, topReranked);
    const girRanked = applyGirRules(rawSuggestions, description);
    const precedentRanked = applyPrecedentBoost(girRanked.suggestions, description);
    const ozSearch = await searchOzByKeyword(description, { limit: 5 });
    const ozPrecedents = ozSearch.items; // [{hsCode, tenHang, ozCount, matchCoverage, ...}]
    const evidenceByHs = new Map(evidence.map((item) => [item.hsCode, item]));
    const historyAdjusted = applyHistoricalSignals({
      suggestions: precedentRanked.suggestions.slice(0, topReranked),
      ozPrecedents,
      evidenceByHs,
    });
    const suggestions = historyAdjusted.suggestions;

    appendSuggestLog({
      description: description.slice(0, 120),
      top1Hs: suggestions[0]?.hsCode || null,
      top1Confidence: suggestions[0]?.confidence ?? null,
      ms: Date.now() - started,
      candidates: evidence.length,
      girRules: [
        ...(girRanked.girRankingRules || []),
        ...(precedentRanked.girPrecedentRule ? [precedentRanked.girPrecedentRule] : []),
        ...(detectSet(description) ? ['GIR-3b'] : []),
      ],
      llmModel: model,
      promptVersion,
      promptVariant,
      wasOverridden: false,
    });

    const girRankingRules = [
      ...(girRanked.girRankingRules || []),
      ...(precedentRanked.girPrecedentRule ? [precedentRanked.girPrecedentRule] : []),
      ...(detectSet(description) ? ['GIR-3b'] : []),
    ];

    // Apply learned corrections from director feedback history
    const correctedSuggestions = applyLearnedCorrections(suggestions);

    // Attach product examples for "Loại khác" codes
    const enrichedSuggestions = correctedSuggestions.map(s => {
      if (!isLoaiKhac(s.hsCode)) return s;
      return { ...s, productExamples: getProducts(s.hsCode, 5) };
    });

    // B4: shared knowledge — conflicts + explanatory note cho mã top (cùng layer với /classify)
    const top1Hs = enrichedSuggestions[0]?.hsCode;
    const explanatoryNote  = top1Hs ? getNoteSummaryForHs(top1Hs) : null;
    const topConflict      = top1Hs ? conflictsDb()[top1Hs] : null;
    const confusionWarning = topConflict?.confusedWith?.length
      ? { riskLevel: topConflict.riskLevel, confusedWith: topConflict.confusedWith, reasonsVi: topConflict.reasonsVi || [] }
      : null;

    const responsePayload = {
      suggestions: enrichedSuggestions,
      girRankingRules,
      precedentMatches: precedentRanked.precedentMatches?.slice(0, 3) || [],
      evidence: evidence.map(({ hsCode, source, score, queryExpansion }) => ({
        hsCode,
        source,
        score,
        queryExpansion,
      })),
      evidenceTrace: {
        candidates: audit.evidenceTrace,
        matchedOzPrecedents: ozPrecedents,
      },
      girRulesApplied: audit.girRulesApplied,
      antiPatternWarnings: [
        ...audit.antiPatternWarnings,
        ...historyAdjusted.warnings,
      ],
      explanatoryNote,
      confusionWarning,
      glossaryTranslation: glossaryVi !== description ? glossaryVi : undefined,
      brandHint,
      llmModel: model,
      promptVersion,
      promptVariant,
      ms: Date.now() - started,
    };

    // Store in LRU cache for repeated identical queries
    setSuggestCache(description, topReranked, responsePayload);

    // Private cache 5 min — same product queried repeatedly in ERP session
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).json(responsePayload);
  } catch (error) {
    captureError(error, { endpoint: 'suggest', description: description.slice(0, 80) });
    if (error.code === 'GEMINI_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'Gemini is not configured', detail: error.message });
    }
    return res.status(502).json({ error: 'Suggest failed', detail: error.message });
  }
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
      const cached = getSuggestCache(item.description, topReranked);
      if (cached) {
        return { id: item.id, cached: true, ms: 0, ...cached };
      }

      const evidence = await getCandidateEvidence(item.description, topCandidates);
      if (evidence.length === 0) {
        return { id: item.id, suggestions: [], evidence: [], ms: Date.now() - itemStart };
      }

      const glossaryVi = translateToVi(item.description);
      const brandHint = getBrandHint(item.description);
      const audit = buildEvidenceTrace(item.description, evidence);

      const userPrompt = JSON.stringify({
        description: item.description,
        glossaryTranslation: glossaryVi !== item.description ? glossaryVi : undefined,
        brandHint,
        candidates: evidence.map(({ hsCode, nameVi, policyByHs, score }) => ({ hsCode, nameVi, policyByHs, score })),
        girRulesApplied: audit.girRulesApplied,
        topReranked,
      }, null, 2);

      const { promptText: batchPrompt } = getPrompt(FALLBACK_PROMPT);
      const { json, model } = await callLLMJson(batchPrompt, userPrompt, { tier: 'premium', timeoutMs: 25000 });
      const rawSuggestions = (json.suggestions || []).slice(0, topReranked);
      const girRanked = applyGirRules(rawSuggestions, item.description);
      const precedentRanked = applyPrecedentBoost(girRanked.suggestions, item.description);
      const suggestions = precedentRanked.suggestions.map(s => {
        if (!isLoaiKhac(s.hsCode)) return s;
        return { ...s, productExamples: getProducts(s.hsCode, 3) };
      });

      const result = {
        id: item.id,
        suggestions,
        evidence: evidence.map(({ hsCode, source, score }) => ({ hsCode, source, score })),
        girRulesApplied: audit.girRulesApplied,
        llmModel: model,
        ms: Date.now() - itemStart,
      };
      setSuggestCache(item.description, topReranked, { suggestions: result.suggestions, evidence: result.evidence, girRulesApplied: result.girRulesApplied, llmModel: model });
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
