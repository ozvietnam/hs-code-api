// Router LLM (CEO chốt 04/10/2026):
//   1. MiniMax (gói trả phí, gọi thẳng, model highspeed) → Hermes → OpenRouter — lib/llm.mjs.
//      CEO: không phụ thuộc vào Gemini miễn phí.
//   2. Chuỗi trên lỗi hết → Gemini MIỄN PHÍ (GEMINI_FREE_KEYS, xoay vòng; khóa hết lượt
//      429/RESOURCE_EXHAUSTED thì nghỉ tới khi hạn mức hồi). Chỉ là dự phòng, có thể để trống.
//   3. GEMINI_API_KEY coi là khóa TRẢ PHÍ: chỉ dùng cho tier "premium" (NV bấm "auto", gọi
//      trước), hoặc khi máy không có nhà cung cấp nào khác.

const { parseJsonLoose } = require('./parse-json');

// Nhà cung cấp chính, đúng thứ tự gọi của lib/llm.mjs.
const FALLBACK_PROVIDERS = [
  { name: 'minimax', envKey: 'MINIMAX_API_KEY' },
  { name: 'hermes', envKey: 'HERMES_API_KEY' },
  { name: 'openrouter', envKey: 'OPENROUTER_API_KEY' },
  { name: 'byteplus', envKey: 'BYTEPLUS_API_KEY' },
];

const PER_MINUTE_COOLDOWN_MS = 65 * 1000;
// Khóa đang nghỉ: key → thời điểm (ms) được dùng lại. Giữ trong bộ nhớ tiến trình.
const cooldown = new Map();

function freeKeys() {
  return String(process.env.GEMINI_FREE_KEYS || '')
    .split(/[,\s]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

function configuredFallbacks() {
  return FALLBACK_PROVIDERS.filter((p) => Boolean(process.env[p.envKey])).map((p) => p.name);
}

/** 00:00 giờ Thái Bình Dương kế tiếp — mốc Google hồi hạn mức theo ngày của gói miễn phí. */
function nextPacificMidnight(now = Date.now()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(now)).map((p) => [p.type, p.value]),
  );
  const elapsedToday = ((Number(parts.hour) % 24) * 3600 + Number(parts.minute) * 60 + Number(parts.second)) * 1000;
  return now - elapsedToday + 24 * 3600 * 1000;
}

/** Lỗi do hết lượt? Trả thời điểm được dùng lại, hoặc null nếu là lỗi khác. */
function quotaResetAt(err, now = Date.now()) {
  const msg = String(err?.message || '');
  if (err?.status !== 429 && !/\b429\b|RESOURCE_EXHAUSTED|quota/i.test(msg)) return null;
  return /per ?day|PerDay|daily/i.test(msg) ? nextPacificMidnight(now) : now + PER_MINUTE_COOLDOWN_MS;
}

function availableFreeKeys(now = Date.now()) {
  return freeKeys().filter((k) => (cooldown.get(k) || 0) <= now);
}

/**
 * Trạng thái LLM để /api/health + admin overview báo trung thực.
 * Không in khóa: chỉ đếm số khóa.
 */
function llmStatus() {
  const free = freeKeys();
  const freeAvailable = availableFreeKeys().length;
  const paid = Boolean(process.env.GEMINI_API_KEY);
  const fallbacks = configuredFallbacks();
  const ok = free.length > 0 || paid || fallbacks.length > 0;
  const order = [
    ...fallbacks,
    ...(free.length ? ['gemini-free'] : []),
    ...(paid && !free.length && !fallbacks.length ? ['gemini-paid'] : []),
  ];
  return {
    ok,
    gemini: free.length > 0 || paid,
    geminiFreeKeys: free.length,
    geminiFreeAvailable: freeAvailable,
    geminiPaid: paid,
    fallbacks,
    order,
    // Chỉ còn khóa Gemini miễn phí và tất cả đang hết lượt.
    degraded: ok && fallbacks.length === 0 && !paid && free.length > 0 && freeAvailable === 0,
    note: !ok
      ? 'KHÔNG có provider LLM nào — /api/suggest + /api/describe chạy chế độ không AI (degraded).'
      : !fallbacks.includes('minimax')
        ? 'Chưa có MINIMAX_API_KEY — nhà cung cấp chính (MiniMax) bị bỏ qua.'
        : null,
  };
}

async function callGemini(apiKey, systemPrompt, userPrompt, timeoutMs, modelEnv = 'GEMINI_RERANK_MODEL') {
  const { geminiGenerateJson } = require('./gemini');
  let timer;
  try {
    return await Promise.race([
      geminiGenerateJson({ systemPrompt, userPrompt, modelEnv, defaultModel: 'gemini-2.5-flash', apiKey }),
      new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('gemini timeout')), timeoutMs); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * callLLMJson(systemPrompt, userPrompt, { tier, maxTokens, timeoutMs, geminiTimeoutMs, geminiModelEnv })
 *   → { json, provider, model, tier }
 * provider: 'minimax' | 'hermes' | 'openrouter' | 'gemini-free' | 'gemini' (khóa trả phí).
 */
/**
 * Hồ sơ MiniMax theo BƯỚC (E-3, 06/10/2026): M2.7 không tắt được phần "suy nghĩ" (30–120 s/lượt,
 * dao động mạnh); MiniMax-M3 tắt được (thinking disabled, ~2 s), M3.1-Flash chỉnh độ sâu.
 * Cấu hình: LLM_STEP_<BƯỚC>="<model>[:off|:low|:medium|:high]" — vd LLM_STEP_HEADINGS="MiniMax-M3:off",
 * LLM_STEP_GIR="MiniMax-M3.1-Flash-Preview:low". Không đặt = hành vi cũ (mẫu mặc định).
 */
function stepProfile(step) {
  if (!step) return null;
  const raw = process.env[`LLM_STEP_${String(step).toUpperCase()}`];
  if (!raw) return null;
  const [model, mode] = raw.split(':').map((s) => s.trim());
  if (!model) return null;
  let extraBody;
  if (mode === 'off') extraBody = { thinking: { type: 'disabled' } };
  else if (['low', 'medium', 'high', 'xhigh', 'max'].includes(mode)) extraBody = { reasoning_effort: mode };
  return { model, extraBody };
}

async function callLLMJson(systemPrompt, userPrompt, opts = {}) {
  const tier = opts.tier === 'premium' ? 'premium' : 'standard';
  const fallbacks = configuredFallbacks();
  const paidKey = process.env.GEMINI_API_KEY || '';
  let lastErr = null;

  // Premium (NV chủ động bấm "auto"): khóa Gemini trả phí trước, giới hạn thời gian ngắn.
  if (tier === 'premium' && paidKey) {
    try {
      const { json, model } = await callGemini(paidKey, systemPrompt, userPrompt,
        opts.geminiTimeoutMs || Number(process.env.GEMINI_RACE_MS) || 8000, opts.geminiModelEnv);
      return { json, provider: 'gemini', model, tier };
    } catch (e) {
      lastErr = e;
    }
  }

  // 1. Nhà cung cấp chính: MiniMax → Hermes → OpenRouter (lib/llm.mjs).
  if (fallbacks.length) {
    try {
      const { chat } = await import('./llm.mjs');
      const { content, provider, model } = await chat(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        { json: true, maxTokens: opts.maxTokens || 4000, timeoutMs: opts.timeoutMs || 60000, ...(opts.temperature != null ? { temperature: opts.temperature } : {}), ...((opts.minimax || stepProfile(opts.step)) ? { minimax: opts.minimax || stepProfile(opts.step) } : {}) },
      );
      let parsed;
      try { parsed = parseJsonLoose(content); } catch (pe) {
        // Giữ 300 ký tự đầu/cuối để chẩn đoán (mẫu mới trả reasoning trong content, JSON bị cắt…).
        const c = String(content || '');
        throw new Error(`${pe.message} [${provider}/${model}, ${c.length} ký tự: "${c.slice(0, 200).replace(/\s+/g, ' ')}" … "${c.slice(-120).replace(/\s+/g, ' ')}"]`);
      }
      return { json: parsed, provider, model, tier: 'standard' };
    } catch (e) {
      lastErr = e;
    }
  }

  // 2. Dự phòng: Gemini miễn phí, xoay vòng.
  for (const key of availableFreeKeys()) {
    try {
      const { json, model } = await callGemini(key, systemPrompt, userPrompt,
        opts.geminiTimeoutMs || Number(process.env.GEMINI_FREE_TIMEOUT_MS) || 20000, opts.geminiModelEnv);
      return { json, provider: 'gemini-free', model, tier };
    } catch (e) {
      lastErr = e;
      const until = quotaResetAt(e);
      if (until) cooldown.set(key, until);
    }
  }

  // 3. Khóa trả phí khi máy không có nhà cung cấp nào khác (để dịch vụ không chết).
  if (paidKey && tier !== 'premium' && !fallbacks.length && !freeKeys().length) {
    const { json, model } = await callGemini(paidKey, systemPrompt, userPrompt, opts.timeoutMs || 45000, opts.geminiModelEnv);
    return { json, provider: 'gemini', model, tier };
  }

  throw lastErr || Object.assign(new Error('Không có provider LLM nào được cấu hình'), { code: 'LLM_NOT_CONFIGURED' });
}

module.exports = {
  stepProfile,
  callLLMJson, llmStatus, FALLBACK_PROVIDERS,
  // cho test
  _internal: { quotaResetAt, nextPacificMidnight, availableFreeKeys, cooldown },
};
