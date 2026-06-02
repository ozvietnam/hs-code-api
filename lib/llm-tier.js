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
  const hasMinimax = !!(process.env.MINIMAX_API_KEY || process.env.OPENROUTER_API_KEY || process.env.BYTEPLUS_API_KEY);

  if (process.env.GEMINI_API_KEY) {
    // Premium: thử Gemini với race 3s rồi fallback MiniMax (production: cả 2 có key)
    // Standard + không có MiniMax key (local dev): dùng Gemini thẳng với timeout đầy đủ
    const geminiTimeoutMs = (tier === 'premium' && hasMinimax)
      ? (opts.geminiTimeoutMs || 3000)   // production: race nhanh, MiniMax backup
      : (opts.timeoutMs || 45000);       // local dev: Gemini dùng hết timeout
    try {
      const { geminiGenerateJson } = require('./gemini');
      const { json, model } = await Promise.race([
        geminiGenerateJson({ systemPrompt, userPrompt, modelEnv: 'GEMINI_RERANK_MODEL', defaultModel: 'gemini-2.5-flash' }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('gemini timeout')), geminiTimeoutMs)),
      ]);
      return { json, provider: 'gemini', model, tier: tier === 'premium' ? 'premium' : 'standard' };
    } catch (e) {
      if (!hasMinimax) throw e; // local dev: không có fallback, báo lỗi thật
      // production: Gemini lỗi/429/timeout → rớt về MiniMax
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
