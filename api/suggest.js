const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { getCandidateEvidence } = require('../lib/suggest-candidates');
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
// Nguồn chân lý duy nhất cho trích dẫn GIR — mọi nhãn phải có căn cứ + bằng chứng.
const { determineGir, DISCLAIMER_VI } = require('../lib/gir');
const { resolveHeading, toResolverShape } = require('../lib/decision-tables');
const { parseCommodityQuery } = require('../lib/query-parse');
// Cảnh báo thiên vị mã cụ thể — KHÔNG tự đổi đáp án, chỉ nêu để người khai quyết.
const { checkResidualPreference } = require('../lib/residual-guard');
const { applyLearnedCorrections } = require('../lib/learned-corrections');
const { getSuggestCache, setSuggestCache } = require('../lib/suggest-cache');
const { getPrompt } = require('../lib/prompt-version');
const { conflictsData, taxData } = require('../lib/data');
const { sanitizeLlmSuggestions, deterministicSuggestions } = require('../lib/llm-output-guard');

function conflictsDb() {
  return conflictsData;
}

// Default prompt — used if data/prompts/index.json or active file is missing
const FALLBACK_PROMPT = `Bạn là chuyên gia phân loại hàng hóa hải quan Việt Nam.
Cho mô tả hàng hóa và danh sách mã HS candidate, hãy chọn tối đa 3 mã phù hợp nhất.
Dùng chapterGuidance (checklist dữ kiện theo chương) làm ngữ cảnh khi cân nhắc.

Về quy tắc GIR: nếu bạn thực sự dựa vào một quy tắc để chốt, ghi ĐÚNG MỘT quy tắc
vào trường "gir" (vd "GIR 3(b)") kèm lý do cụ thể trong "reasoning". KHÔNG liệt kê
quy tắc cho có — hệ thống sẽ đánh dấu phần bạn khai là CHƯA KIỂM CHỨNG và đối
chiếu độc lập. Không chắc thì để "gir": null.

Chỉ trả JSON đúng schema:
{
  "suggestions": [
    {
      "hsCode": "85171300",
      "nameVi": "Tên hàng",
      "confidence": 92,
      "reasoning": "Giải thích ngắn",
      "disambiguationFeatures": ["brand", "model"],
      "gir": "GIR 1"
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

  const facts = body?.facts && typeof body.facts === 'object' && !Array.isArray(body.facts) ? body.facts : {};

  const cached = getSuggestCache(description, topReranked, { facts });
  if (cached) {
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).json({ ...cached, cached: true });
  }

  const glossaryVi = translateToVi(description);
  const brandHint = getBrandHint(description);
  const { candidates: evidence, ozPrecedents } = await getCandidateEvidence(description, { topCandidates });
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
      girRulesApplied: [],
      chapterGuidance: audit.chapterGuidance,
      girDisclaimer: DISCLAIMER_VI,
      antiPatternWarnings: audit.antiPatternWarnings,
      llmModel: null,
      ms: Date.now() - started,
      message: 'No candidates found in tariff index',
    });
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
        chapterGuidance: audit.chapterGuidance,
        antiPatternWarnings: audit.antiPatternWarnings,
        topReranked,
      },
      null,
      2
    );

    // callLLMJson: Gemini → OpenRouter fallback (see lib/llm-tier.js)
    const { promptText, variant: promptVariant, promptVersion } = getPrompt(FALLBACK_PROMPT);
    let json = null;
    let model = null;
    let llmError = null;
    try {
      ({ json, model } = await callLLMJson(promptText, userPrompt, {
        tier: 'premium',
        timeoutMs: 30000,
      }));
    } catch (error) {
      // LLM lỗi / chưa cấu hình KHÔNG được vứt các ứng viên đã tìm được —
      // trả kết quả deterministic, đánh dấu degraded để ERP biết mà xử lý.
      captureError(error, { endpoint: 'suggest', stage: 'llm', description: description.slice(0, 80) });
      llmError = { code: error.code || 'LLM_FAILED', message: String(error.message || '').slice(0, 200) };
    }

    // LLM chỉ được CHỌN trong ứng viên — mã bịa / ngoài biểu thuế bị loại.
    const guarded = sanitizeLlmSuggestions(json?.suggestions, { evidence, taxData, limit: topReranked });
    let engine = 'llm';
    let rawSuggestions = guarded.suggestions;
    if (!rawSuggestions.length) {
      engine = 'deterministic';
      rawSuggestions = deterministicSuggestions(evidence, { taxData, limit: topReranked });
    }
    const girRanked = applyGirRules(rawSuggestions, description);
    const precedentRanked = applyPrecedentBoost(girRanked.suggestions, description);
    const ozSearchItems = ozPrecedents.length
      ? ozPrecedents
      : (await searchOzByKeyword(description, { limit: 5 })).items;
    const evidenceByHs = new Map(evidence.map((item) => [item.hsCode, item]));
    const historyAdjusted = applyHistoricalSignals({
      suggestions: precedentRanked.suggestions.slice(0, topReranked),
      ozPrecedents: ozSearchItems,
      evidenceByHs,
    });
    const suggestions = historyAdjusted.suggestions;

    appendSuggestLog({
      description: description.slice(0, 120),
      top1Hs: suggestions[0]?.hsCode || null,
      top1Confidence: suggestions[0]?.confidence ?? null,
      ms: Date.now() - started,
      candidates: evidence.length,
      girRules: determineGir({
        description,
        candidates: precedentRanked.suggestions,
        pickedHs: precedentRanked.suggestions?.[0]?.hsCode || null,
        isSet: detectSet(description),
        precedentDrove: Boolean(precedentRanked.girPrecedentRule),
      }).determinations.map((d) => `${d.rule}:${d.basis}`),
      llmModel: model,
      promptVersion,
      promptVariant,
      wasOverridden: false,
    });

    // Bảng quyết định theo nhóm: tên/chức năng đưa tới nhóm, THUỘC TÍNH chốt lá.
    // Xét các nhóm trong top gợi ý; thiếu dữ kiện thì trả missingFacts để ERP /
    // người dùng bổ sung TRƯỚC khi chốt 8 số — không đoán.
    const parsedDesc = parseCommodityQuery(description);
    const decisionHeadings = [];
    for (const sg of precedentRanked.suggestions || []) {
      const h = String(sg.hsCode || '').slice(0, 4);
      if (/^\d{4}$/.test(h) && !decisionHeadings.includes(h)) decisionHeadings.push(h);
      if (decisionHeadings.length >= 3) break;
    }
    const decisions = decisionHeadings
      .map((h) => resolveHeading(h, { text: description, parsed: parsedDesc, facts }))
      .filter((d) => d.status !== 'NO_TABLE');
    const topHeading = String(precedentRanked.suggestions?.[0]?.hsCode || '').slice(0, 4);
    const topDecision = decisions.find((d) => d.heading === topHeading) || null;
    const missingFacts = [...new Map(decisions.flatMap((d) => d.missingFacts || []).map((m) => [m.attribute, m])).values()];

    // Trích dẫn GIR: chỉ phát ra khi có căn cứ kiểm chứng được (xem lib/gir.js).
    // Bảng chưa verified đi qua gir.js thành HEURISTIC, verified mới là RULE_TABLE.
    const girVerdict = determineGir({
      description,
      candidates: precedentRanked.suggestions,
      pickedHs: precedentRanked.suggestions?.[0]?.hsCode || null,
      resolver: toResolverShape(topDecision),
      isSet: detectSet(description),
      precedentDrove: Boolean(precedentRanked.girPrecedentRule),
      llmGir: precedentRanked.suggestions?.[0]?.gir || null,
    });
    const rankingSignals = girRanked.rankingSignals || [];

    // 52% tờ khai thật có đáp án là mã "Loại khác", nhưng hệ thống thiên vị mã cụ
    // thể (74% lỗi cùng nhóm là "đúng residual, đoán cụ thể"; chiều ngược lại 0%).
    // Mô phỏng trên benchmark: can thiệp 24% mẫu, sửa 3 / hỏng 1 — lãi quá mỏng để
    // tự động ghi đè. Nên chỉ CẢNH BÁO, để người có chuyên môn chốt.
    const residualAdvisory = checkResidualPreference({
      hsCode: precedentRanked.suggestions?.[0]?.hsCode || null,
      description,
      candidates: precedentRanked.suggestions,
    });

    // Apply learned corrections from director feedback history
    const correctedSuggestions = applyLearnedCorrections(suggestions);

    // Attach product examples for "Loại khác" codes
    let enrichedSuggestions = correctedSuggestions.map(s => {
      // Chế độ deterministic: điểm tìm kiếm + boost KHÔNG phải xác suất đúng.
      const base = engine === 'deterministic' ? { ...s, confidence: null } : s;
      if (!isLoaiKhac(base.hsCode)) return base;
      return { ...base, productExamples: getProducts(base.hsCode, 5) };
    });

    // Bảng ĐÃ VERIFIED chốt được lá trong nhóm đang dẫn đầu → lá đó lên đầu (ghi
    // rõ decidedByTable). Bảng chưa verified chỉ tư vấn, không đổi thứ tự.
    if (topDecision?.status === 'RESOLVED' && topDecision.tableVerified && enrichedSuggestions[0]?.hsCode !== topDecision.hs) {
      const idx = enrichedSuggestions.findIndex((sg) => sg.hsCode === topDecision.hs);
      const picked = idx >= 0
        ? enrichedSuggestions.splice(idx, 1)[0]
        : { hsCode: topDecision.hs, confidence: enrichedSuggestions[0]?.confidence ?? null, reason: topDecision.reasonVi };
      enrichedSuggestions = [{ ...picked, decidedByTable: { heading: topDecision.heading, ruleId: topDecision.ruleId, reasonVi: topDecision.reasonVi } }, ...enrichedSuggestions];
    }

    // B4: shared knowledge — conflicts + explanatory note cho mã top (cùng layer với /classify)
    const top1Hs = enrichedSuggestions[0]?.hsCode;
    const explanatoryNote  = top1Hs ? getNoteSummaryForHs(top1Hs) : null;
    const topConflict      = top1Hs ? conflictsDb()[top1Hs] : null;
    const confusionWarning = topConflict?.confusedWith?.length
      ? { riskLevel: topConflict.riskLevel, confusedWith: topConflict.confusedWith, reasonsVi: topConflict.reasonsVi || [] }
      : null;

    const responsePayload = {
      suggestions: enrichedSuggestions,
      rankingSignals,
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
      // Rule bất biến #6: audit trail GIR. Nay chỉ chứa trích dẫn CÓ CĂN CỨ.
      girRulesApplied: girVerdict.determinations,
      girDisclaimer: girVerdict.disclaimer,
      ...(residualAdvisory ? { residualAdvisory } : {}),
      // Checklist dữ kiện theo chương — trước đây bị đặt nhầm tên girRulesApplied.
      chapterGuidance: audit.chapterGuidance,
      // Bảng quyết định theo nhóm + dữ kiện còn thiếu để chốt lá 8 số.
      ...(decisions.length
        ? {
            decisions: decisions.map((d) => ({
              heading: d.heading,
              titleVi: d.titleVi,
              status: d.status,
              ...(d.hs ? { hsCode: d.hs, ruleId: d.ruleId, reasonVi: d.reasonVi, source: d.source } : {}),
              tableVerified: d.tableVerified,
              basis: d.tableVerified ? 'RULE_TABLE' : 'HEURISTIC',
              narrowed: d.narrowed,
              missingFacts: d.missingFacts,
              factsUsed: d.factsUsed,
            })),
          }
        : {}),
      ...(missingFacts.length ? { missingFacts } : {}),
      antiPatternWarnings: [
        ...audit.antiPatternWarnings,
        ...historyAdjusted.warnings,
        ...(residualAdvisory
          ? [{
              id: 'residual-preference',
              description:
                `Mô tả chưa chứng minh điều kiện của mã cụ thể ${residualAdvisory.currentHs}. ` +
                `Cân nhắc ${residualAdvisory.suggestedHs} ("${residualAdvisory.suggestedName}").`,
              fix: 'Bổ sung dữ kiện chứng minh điều kiện của mã cụ thể, hoặc chuyển sang mã Loại khác.',
            }]
          : []),
      ],
      explanatoryNote,
      confusionWarning,
      glossaryTranslation: glossaryVi !== description ? glossaryVi : undefined,
      brandHint,
      llmModel: model,
      promptVersion,
      promptVariant,
      // engine=deterministic: LLM lỗi hoặc mọi mã LLM trả đều bị loại. Kết quả là
      // thứ tự tìm kiếm, confidence=null — BẮT BUỘC người có chuyên môn xác nhận.
      engine,
      degraded: engine !== 'llm',
      ...(guarded.rejected.length ? { llmRejectedCodes: guarded.rejected } : {}),
      ...(llmError ? { llmError } : {}),
      ms: Date.now() - started,
    };

    // Store in LRU cache for repeated identical queries — không cache bản
    // degraded để lần gọi sau còn thử lại LLM.
    if (engine === 'llm') setSuggestCache(description, topReranked, responsePayload, { facts });

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
      const cached = getSuggestCache(item.description, topReranked, { mode: 'batch' });
      if (cached) {
        return { id: item.id, cached: true, ms: 0, ...cached };
      }

      const { candidates: evidence } = await getCandidateEvidence(item.description, { topCandidates });
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
      const guarded = sanitizeLlmSuggestions(json?.suggestions, { evidence, taxData, limit: topReranked });
      const engine = guarded.suggestions.length ? 'llm' : 'deterministic';
      const rawSuggestions = engine === 'llm'
        ? guarded.suggestions
        : deterministicSuggestions(evidence, { taxData, limit: topReranked });
      const girRanked = applyGirRules(rawSuggestions, item.description);
      const precedentRanked = applyPrecedentBoost(girRanked.suggestions, item.description);
      const suggestions = precedentRanked.suggestions.map(s => {
        const base = engine === 'deterministic' ? { ...s, confidence: null } : s;
        if (!isLoaiKhac(base.hsCode)) return base;
        return { ...base, productExamples: getProducts(base.hsCode, 3) };
      });

      const batchGir = determineGir({
        description: item.description,
        candidates: precedentRanked.suggestions,
        pickedHs: precedentRanked.suggestions?.[0]?.hsCode || null,
        isSet: detectSet(item.description),
        precedentDrove: Boolean(precedentRanked.girPrecedentRule),
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
