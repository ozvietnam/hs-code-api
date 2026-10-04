// Router LLM (CEO chốt 04/10/2026, kế hoạch chung OZSource QĐ-1):
//   1. Gemini MIỄN PHÍ trước — xoay vòng các khóa trong GEMINI_FREE_KEYS. Khóa nào báo
//      hết lượt (429/RESOURCE_EXHAUSTED) thì nghỉ tới khi hạn mức hồi, dùng khóa kế tiếp.
//   2. Hết khóa miễn phí → nhà cung cấp dự phòng (lib/llm.mjs: Hermes → MiniMax → OpenRouter…).
//   3. GEMINI_API_KEY coi là khóa TRẢ PHÍ: chỉ dùng khi gọi tier "premium", hoặc khi máy
//      không có nhà cung cấp nào khác (để dịch vụ không chết vì thiếu cấu hình).
// Khóa miễn phí nào cũng đặt vào GEMINI_FREE_KEYS (cách nhau dấu phẩy), kể cả khi khóa đó
// đang nằm ở GEMINI_API_KEY.

const { parseJsonLoose } = require('./parse-json');

// Thứ tự fallback thật (xem lib/llm.mjs).
const FALLBACK_PROVIDERS = [
  { name: 'hermes', envKey: 'HERMES_API_KEY' },
  { name: 'minimax', envKey: 'MINIMAX_API_KEY' },
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
    ...(free.length ? ['gemini-free'] : []),
    ...fallbacks,
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
    // Có khóa miễn phí nhưng tất cả đang hết lượt và không còn dự phòng (trừ khóa trả phí).
    degraded: ok && free.length > 0 && freeAvailable === 0 && fallbacks.length === 0 && !paid,
    note: !ok
      ? 'KHÔNG có provider LLM nào — /api/suggest + /api/describe chạy chế độ không AI (degraded).'
      : free.length === 0
        ? 'Chưa có GEMINI_FREE_KEYS — bỏ qua bước Gemini miễn phí.'
        : freeAvailable === 0
          ? 'Mọi khóa Gemini miễn phí đang hết lượt — đang dùng nhà cung cấp dự phòng.'
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
 * provider: 'gemini-free' | 'gemini' (khóa trả phí) | tên nhà cung cấp dự phòng.
 */
async function callLLMJson(systemPrompt, userPrompt, opts = {}) {
  const tier = opts.tier === 'premium' ? 'premium' : 'standard';
  const fallbacks = configuredFallbacks();
  const paidKey = process.env.GEMINI_API_KEY || '';
  let lastErr = null;

  // 1. Gemini miễn phí, xoay vòng. Có nơi để rơi xuống thì giới hạn thời gian chờ để
  //    lượt gọi không treo khi Google chậm.
  const hasLater = fallbacks.length > 0 || Boolean(paidKey);
  const freeTimeoutMs = hasLater
    ? (opts.geminiTimeoutMs || Number(process.env.GEMINI_FREE_TIMEOUT_MS) || 20000)
    : (opts.timeoutMs || 45000);
  for (const key of availableFreeKeys()) {
    try {
      const { json, model } = await callGemini(key, systemPrompt, userPrompt, freeTimeoutMs, opts.geminiModelEnv);
      return { json, provider: 'gemini-free', model, tier };
    } catch (e) {
      lastErr = e;
      const until = quotaResetAt(e);
      if (until) cooldown.set(key, until);
      // Lỗi khác (timeout, 5xx): thử khóa kế tiếp, khóa này không bị cho nghỉ.
    }
  }

  // 2. Khóa trả phí: chỉ khi gọi premium, hoặc khi không còn đường nào khác.
  const usePaid = Boolean(paidKey) && (tier === 'premium' || fallbacks.length === 0);
  if (usePaid) {
    const paidTimeoutMs = fallbacks.length
      ? (opts.geminiTimeoutMs || Number(process.env.GEMINI_RACE_MS) || 8000)
      : (opts.timeoutMs || 45000);
    try {
      const { json, model } = await callGemini(paidKey, systemPrompt, userPrompt, paidTimeoutMs, opts.geminiModelEnv);
      return { json, provider: 'gemini', model, tier };
    } catch (e) {
      lastErr = e;
    }
  }

  // 3. Nhà cung cấp dự phòng (MiniMax…).
  if (!fallbacks.length) {
    throw lastErr || Object.assign(new Error('Không có provider LLM nào được cấu hình'), { code: 'LLM_NOT_CONFIGURED' });
  }
  const { chat } = await import('./llm.mjs');
  const { content, provider, model } = await chat(
    [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    { json: true, maxTokens: opts.maxTokens || 4000, timeoutMs: opts.timeoutMs || 60000 },
  );
  return { json: parseJsonLoose(content), provider, model, tier: 'standard' };
}

module.exports = {
  callLLMJson, llmStatus, FALLBACK_PROVIDERS,
  // cho test
  _internal: { quotaResetAt, nextPacificMidnight, availableFreeKeys, cooldown },
};
