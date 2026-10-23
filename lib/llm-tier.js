// Router LLM (CEO chốt 04/10/2026):
//   1. MiniMax (gói trả phí, gọi thẳng, model highspeed) → DeepSeek gọi thẳng → Hermes → OpenRouter — lib/llm.mjs.
//      CEO: không phụ thuộc vào Gemini miễn phí.
//   2. Chuỗi trên lỗi hết → Gemini MIỄN PHÍ (GEMINI_FREE_KEYS, xoay vòng; khóa hết lượt
//      429/RESOURCE_EXHAUSTED thì nghỉ tới khi hạn mức hồi). Chỉ là dự phòng, có thể để trống.
//   3. GEMINI_API_KEY coi là khóa TRẢ PHÍ: chỉ dùng cho tier "premium" (NV bấm "auto", gọi
//      trước), hoặc khi máy không có nhà cung cấp nào khác. PREMIUM_PROVIDER=minimax (CEO chốt
//      14/10/2026 — Gemini trả phí đốt quá nhanh): tier premium đi chuỗi chuẩn trước, khóa trả
//      phí chỉ còn là chốt cuối khi chuỗi chết.

const { parseJsonLoose } = require('./parse-json');
// Dữ liệu khách (#237 J1): lượt trong withPrivateData() hoặc opts.containsCustomerData chỉ đi nhà cung cấp
// trong LLM_NO_TRAIN_PROVIDERS, không bao giờ qua Gemini miễn phí / mẫu ":free" / Hermes (mặc định).
const { isPrivate, privateAllowed, noTrainProviders, noPrivateLlmError, isFreeModel } = require('./llm-privacy');

// Nhà cung cấp chính, đúng thứ tự gọi của lib/llm.mjs.
const FALLBACK_PROVIDERS = [
  { name: 'minimax', envKey: 'MINIMAX_API_KEY' },
  { name: 'deepseek', envKey: 'DEEPSEEK_API_KEY' },
  { name: 'hermes', envKey: 'HERMES_API_KEY' },
  { name: 'openrouter', envKey: 'OPENROUTER_API_KEY' },
];

const PER_MINUTE_COOLDOWN_MS = 65 * 1000;
// Khóa đang nghỉ: key → thời điểm (ms) được dùng lại. Giữ trong bộ nhớ tiến trình.
const cooldown = new Map();

// ── #425: timeout theo BƯỚC + ngắt mạch theo (provider, step) ──────────────────────────────────────
// Đồng hồ tách riêng để test giả lập thời gian (không ghi đĩa, bộ nhớ tiến trình).
const clock = { now: () => Date.now() };
const envInt = (k) => { const v = Number(process.env[k]); return Number.isFinite(v) && v > 0 ? Math.floor(v) : null; };

/**
 * stepTimeoutMs(step, baseMs) — thời gian chờ (ms) cho một lời gọi LLM theo bước.
 * Ưu tiên: LLM_TIMEOUT_MS_<STEP> > LLM_TIMEOUT_MS_DEFAULT > baseMs (do caller truyền) > 60000.
 * Giá trị env là TRẦN theo bước: không vượt baseMs khi caller đã tính theo ngân sách lượt (engine-loop).
 * Không đặt env → trả đúng baseMs như cũ (không đổi hành vi). Tên bước lấy từ opts.step của caller
 * (engine-loop: 'understand' vòng 1, 'gir' vòng 2; describe: 'describe'; suggest: 'suggest'…).
 */
function stepTimeoutMs(step, baseMs) {
  const cfg = (step ? envInt(`LLM_TIMEOUT_MS_${String(step).toUpperCase()}`) : null) || envInt('LLM_TIMEOUT_MS_DEFAULT');
  if (!cfg) return baseMs || 60000;
  return baseMs ? Math.min(cfg, baseMs) : cfg;
}

// Ngắt mạch: `${provider}|${step}` → { loi: số timeout liên tiếp, nghiToi: ms (0 = chưa mở) }.
// Sau LLM_NGAT_MACH_LOI_LIEN_TIEP (mặc định 2) timeout liên tiếp của một (provider, step) → bỏ qua provider đó
// cho bước đó trong LLM_NGAT_MACH_NGHI_MS (mặc định 300000 = 5 phút), không chờ timeout lần nữa. Thành công → xoá.
// Hết giờ nghỉ → thử lại một lần; vẫn timeout → mở lại ngay. Chỉ đếm TIMEOUT (lỗi 4xx/5xx đi đường cũ).
const ngatMach = new Map();
const ngatMachKey = (provider, step) => `${provider}|${step || '-'}`;
const ngatMachNguong = () => envInt('LLM_NGAT_MACH_LOI_LIEN_TIEP') || 2;
const ngatMachNghiMs = () => envInt('LLM_NGAT_MACH_NGHI_MS') || 300000;

/** Mạch (provider, step) đang mở? → provider bị bỏ qua cho bước này. */
function ngatMachDangMo(provider, step) {
  const e = ngatMach.get(ngatMachKey(provider, step));
  return Boolean(e && e.nghiToi > clock.now());
}

/** Ghi một lần timeout; đủ ngưỡng thì mở mạch (log một dòng). */
function ngatMachGhiTimeout(provider, step) {
  const key = ngatMachKey(provider, step);
  const e = ngatMach.get(key) || { loi: 0, nghiToi: 0 };
  e.loi += 1;
  if (e.loi >= ngatMachNguong()) {
    e.nghiToi = clock.now() + ngatMachNghiMs();
    console.warn(`[llm] ngắt mạch MỞ: ${provider} bước ${step || '-'} — ${e.loi} timeout liên tiếp, nghỉ ${Math.round(ngatMachNghiMs() / 1000)} s tới ${new Date(e.nghiToi).toISOString()}`);
  }
  ngatMach.set(key, e);
}

/** Lời gọi thành công → xoá bộ đếm; nếu mạch từng mở thì log một dòng ĐÓNG. */
function ngatMachGhiThanhCong(provider, step) {
  const key = ngatMachKey(provider, step);
  const e = ngatMach.get(key);
  if (!e) return;
  if (e.nghiToi) console.warn(`[llm] ngắt mạch ĐÓNG: ${provider} bước ${step || '-'} — gọi lại thành công`);
  ngatMach.delete(key);
}

/** Danh sách mạch đang mở cho /api/health: [{provider, step, nghiToi(ISO)}] — rỗng khi không có. Không in khoá. */
function ngatMachTrangThai() {
  const t = clock.now();
  const out = [];
  for (const [key, e] of ngatMach) {
    if (e.nghiToi > t) {
      const [provider, step] = key.split('|');
      out.push({ provider, step: step === '-' ? null : step, nghiToi: new Date(e.nghiToi).toISOString() });
    }
  }
  return out;
}

function freeKeys() {
  return String(process.env.GEMINI_FREE_KEYS || '')
    .split(/[,\s]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

function configuredFallbacks() {
  return FALLBACK_PROVIDERS.filter((p) => Boolean(process.env[p.envKey])).map((p) => p.name);
}

/** Mẫu mặc định của từng nhà cung cấp — cùng biến env với lib/llm.mjs (chỉ để báo health, không gọi). */
function providerModel(name) {
  const e = (k) => (process.env[k] == null ? undefined : String(process.env[k]).trim());
  if (name === 'minimax') return e('MINIMAX_MODEL') || e('MINIMAX_ENRICH_MODEL') || 'MiniMax-M2.7-highspeed';
  if (name === 'deepseek') return e('DEEPSEEK_MODEL') || 'deepseek-chat';
  if (name === 'hermes') return e('HERMES_ENRICH_MODEL') || e('HERMES_MODEL') || 'deepseek-chat';
  if (name === 'openrouter') return e('OPENROUTER_ENRICH_MODEL') || 'google/gemma-3-27b-it:free';
  return null;
}

/** Nhà cung cấp đang cấu hình mà được nhận dữ liệu khách (để /api/health báo và để kiểm trước khi gọi). */
function privateProviders() {
  const out = configuredFallbacks().filter((n) => privateAllowed(n, providerModel(n)));
  if (process.env.GEMINI_API_KEY && privateAllowed('gemini', 'paid')) out.push('gemini');
  return out;
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
  const privateList = privateProviders();
  return {
    ok,
    gemini: free.length > 0 || paid,
    geminiFreeKeys: free.length,
    geminiFreeAvailable: freeAvailable,
    geminiPaid: paid,
    fallbacks,
    order,
    // Dữ liệu khách (Cổng OZ, ERP) chỉ đi các nhà cung cấp này; rỗng = lượt có dữ liệu khách sẽ trả NO_PRIVATE_LLM.
    private: {
      ok: privateList.length > 0,
      providers: privateList,
      whitelist: noTrainProviders(),
      all: String(process.env.HS_LLM_PRIVATE_ALL || '').toLowerCase() === 'true',
      note: privateList.length ? null : 'KHÔNG có nhà cung cấp nào nhận dữ liệu khách — lượt từ khoá dịch vụ sẽ lỗi NO_PRIVATE_LLM (cần MINIMAX_API_KEY hoặc GEMINI_API_KEY trả phí).',
    },
    // #425: mạch đang mở theo (provider, step) — provider bị bỏ qua cho bước đó tới nghiToi. Rỗng = bình thường.
    ngatMach: ngatMachTrangThai(),
    // Chỉ còn khóa Gemini miễn phí và tất cả đang hết lượt.
    degraded: ok && fallbacks.length === 0 && !paid && free.length > 0 && freeAvailable === 0,
    note: !ok
      ? 'KHÔNG có provider LLM nào — /api/suggest + /api/describe chạy chế độ không AI (degraded).'
      : !fallbacks.includes('minimax')
        ? 'Chưa có MINIMAX_API_KEY — nhà cung cấp chính (MiniMax) bị bỏ qua.'
        : null,
  };
}

async function callGemini(apiKey, systemPrompt, userPrompt, timeoutMs, modelEnv = 'GEMINI_RERANK_MODEL', usageProvider = 'gemini') {
  const { geminiGenerateJson } = require('./gemini');
  let timer;
  try {
    return await Promise.race([
      geminiGenerateJson({ systemPrompt, userPrompt, modelEnv, defaultModel: 'gemini-2.5-flash', apiKey, usageProvider }),
      new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('gemini timeout')), timeoutMs); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * callLLMJson(systemPrompt, userPrompt, { tier, maxTokens, timeoutMs, geminiTimeoutMs, geminiModelEnv, step })
 *   step: tên bước ('understand' | 'gir' | 'describe' | …) — chọn LLM_STEP_<STEP>, LLM_TIMEOUT_MS_<STEP> và khoá ngắt mạch (#425).
 *   → { json, provider, model, tier }
 * provider: 'minimax' | 'deepseek' | 'hermes' | 'openrouter' | 'gemini-free' | 'gemini' (khóa trả phí).
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
  // Dữ liệu khách: cờ tường minh thắng ngữ cảnh; ngữ cảnh đặt bởi withPrivateData() ở handler (khoá dịch vụ).
  const priv = opts.containsCustomerData != null ? Boolean(opts.containsCustomerData) : isPrivate();
  const paidGeminiOk = !priv || privateAllowed('gemini', 'paid');
  let attempted = 0; // số nhà cung cấp HỢP LỆ đã thực sự được gọi (chỉ dùng ở chế độ riêng tư)
  // #425: timeout theo bước (LLM_TIMEOUT_MS_<STEP> / _DEFAULT là trần; không đặt → như opts.timeoutMs cũ).
  const timeoutMs = stepTimeoutMs(opts.step, opts.timeoutMs);

  // Premium (NV chủ động bấm "auto"): khóa Gemini trả phí trước, giới hạn thời gian ngắn.
  // PREMIUM_PROVIDER=minimax (CEO chốt 14/10/2026 — Gemini trả phí đốt quá nhanh): bỏ bước này,
  // tier premium đi chuỗi chuẩn trước (MiniMax); khóa trả phí còn lại đúng vai chốt cuối ở mục 3.
  const premiumGeminiFirst = String(process.env.PREMIUM_PROVIDER || 'gemini').trim().toLowerCase() !== 'minimax';
  if (tier === 'premium' && paidKey && paidGeminiOk && premiumGeminiFirst) {
    attempted += 1;
    try {
      const { json, model } = await callGemini(paidKey, systemPrompt, userPrompt,
        opts.geminiTimeoutMs || Number(process.env.GEMINI_RACE_MS) || 8000, opts.geminiModelEnv);
      return { json, provider: 'gemini', model, tier };
    } catch (e) {
      lastErr = e;
    }
  }

  // 1. Nhà cung cấp chính: MiniMax → Hermes → OpenRouter (lib/llm.mjs). Chế độ riêng tư: chat() tự bỏ qua
  //    nhà cung cấp ngoài danh sách trắng và mẫu ":free"; không gọi được ai thì ném NO_PRIVATE_LLM.
  if (fallbacks.length) {
    try {
      const { chat } = await import('./llm.mjs');
      const { content, provider, model } = await chat(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        { json: true, private: priv, maxTokens: opts.maxTokens || 4000, timeoutMs, step: opts.step, ...(opts.temperature != null ? { temperature: opts.temperature } : {}), ...((opts.minimax || stepProfile(opts.step)) ? { minimax: opts.minimax || stepProfile(opts.step) } : {}) },
      );
      attempted += 1;
      let parsed;
      try { parsed = parseJsonLoose(content); } catch (pe) {
        // Giữ 300 ký tự đầu/cuối để chẩn đoán (mẫu mới trả reasoning trong content, JSON bị cắt…).
        const c = String(content || '');
        throw new Error(`${pe.message} [${provider}/${model}, ${c.length} ký tự: "${c.slice(0, 200).replace(/\s+/g, ' ')}" … "${c.slice(-120).replace(/\s+/g, ' ')}"]`);
      }
      return { json: parsed, provider, model, tier: 'standard' };
    } catch (e) {
      if (e?.code === 'NO_PRIVATE_LLM') { lastErr = lastErr || e; } // không nhà cung cấp nào được gọi — chưa "thử"
      else { lastErr = e; attempted += 1; }
    }
  }

  // 2. Dự phòng: Gemini miễn phí, xoay vòng — KHÔNG BAO GIỜ với dữ liệu khách.
  for (const key of priv ? [] : availableFreeKeys()) {
    try {
      const { json, model } = await callGemini(key, systemPrompt, userPrompt,
        opts.geminiTimeoutMs || Number(process.env.GEMINI_FREE_TIMEOUT_MS) || 20000, opts.geminiModelEnv, 'gemini-free');
      return { json, provider: 'gemini-free', model, tier };
    } catch (e) {
      lastErr = e;
      const until = quotaResetAt(e);
      if (until) cooldown.set(key, until);
    }
  }

  // 3. Khóa trả phí khi máy không có nhà cung cấp nào khác (để dịch vụ không chết).
  //    Dữ liệu khách: khoá trả phí (trong danh sách trắng) là đường dự phòng thay cho tầng miễn phí.
  //    Premium + PREMIUM_PROVIDER=minimax: chuỗi chuẩn đã thử xong → khoá trả phí là chốt cuối.
  const geminiTraPhiChotCuoi = tier !== 'premium'
    ? (priv || (!fallbacks.length && !freeKeys().length))
    : !premiumGeminiFirst;
  if (paidKey && paidGeminiOk && geminiTraPhiChotCuoi) {
    attempted += 1;
    try {
      const { json, model } = await callGemini(paidKey, systemPrompt, userPrompt, opts.timeoutMs ? timeoutMs : stepTimeoutMs(opts.step, 45000), opts.geminiModelEnv);
      return { json, provider: 'gemini', model, tier };
    } catch (e) {
      if (!priv) throw e;
      lastErr = e;
    }
  }

  // Dữ liệu khách: hết nhà cung cấp hợp lệ (không có, hoặc có mà lỗi) → NO_PRIVATE_LLM, không rơi xuống tầng
  // miễn phí. Giữ nguyên lỗi gốc trong thông điệp để describe/classify vẫn phân loại được "nên gọi lại" (500/429…).
  if (priv) throw noPrivateLlmError(lastErr && lastErr.code !== 'NO_PRIVATE_LLM' ? `${attempted} nhà cung cấp hợp lệ đã thử, lỗi cuối: ${String(lastErr.message || lastErr).slice(0, 200)}` : null);
  throw lastErr || Object.assign(new Error('Không có provider LLM nào được cấu hình'), { code: 'LLM_NOT_CONFIGURED' });
}

module.exports = {
  stepProfile, stepTimeoutMs,
  // #425: ngắt mạch theo (provider, step) — lib/llm.mjs gọi khi chọn/ghi nhận provider.
  ngatMachDangMo, ngatMachGhiTimeout, ngatMachGhiThanhCong, ngatMachTrangThai,
  callLLMJson, llmStatus, FALLBACK_PROVIDERS, privateProviders, providerModel, isFreeModel,
  // cho test
  _internal: { quotaResetAt, nextPacificMidnight, availableFreeKeys, cooldown, ngatMach, clock },
};
