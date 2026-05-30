// Router LLM theo TIER (CEO duyệt 2026-05-30):
//   standard (mặc định) = MiniMax flat-rate, $0 — NV bấm tay, chấp nhận ~20-25s.
//   premium (opt-in "auto") = Gemini trả phí — nhanh + chính xác hơn, NV review sau.
// Default LUÔN là standard để không đốt Gemini ngoài ý muốn.

const { parseJsonLoose } = require('./parse-json');

/**
 * callLLMJson(systemPrompt, userPrompt, { tier, maxTokens, timeoutMs })
 *   → { json, provider, model }
 * premium → Gemini (gemini.js sẵn có); lỗi/thiếu key → tự fallback standard.
 */
async function callLLMJson(systemPrompt, userPrompt, opts = {}) {
  const tier = opts.tier === 'premium' ? 'premium' : 'standard';

  if (tier === 'premium' && process.env.GEMINI_API_KEY) {
    try {
      const { geminiGenerateJson } = require('./gemini');
      // Cap thời gian thử Gemini — lỗi/chậm thì fallback NHANH, "auto" không chậm hơn standard
      const { json, model } = await Promise.race([
        geminiGenerateJson({ systemPrompt, userPrompt, modelEnv: 'GEMINI_RERANK_MODEL', defaultModel: 'gemini-2.5-flash' }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('gemini timeout')), opts.geminiTimeoutMs || 3000)),
      ]);
      return { json, provider: 'gemini', model, tier: 'premium' };
    } catch (e) {
      // Gemini lỗi (key sai/429/timeout...) → KHÔNG chặn NV, rớt về MiniMax
    }
  }

  const { chat } = await import('./llm.mjs');
  const { content, provider, model } = await chat(
    [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    { json: true, maxTokens: opts.maxTokens || 4000, timeoutMs: opts.timeoutMs || 60000 },
  );
  return { json: parseJsonLoose(content), provider, model, tier: 'standard' };
}

module.exports = { callLLMJson };
