// Router LLM (CEO chốt 04/10/2026):
//   1. MiniMax (gói trả phí, gọi thẳng, model highspeed) → DeepSeek gọi thẳng → Hermes → OpenRouter — lib/llm.mjs.
//      CEO: không phụ thuộc vào Gemini miễn phí.
//   2. Chuỗi trên lỗi hết → Gemini MIỄN PHÍ (GEMINI_FREE_KEYS, xoay vòng; khóa hết lượt
//      429/RESOURCE_EXHAUSTED thì nghỉ tới khi hạn mức hồi; khóa treo nghỉ 15 phút — OZV-726).
//      Chỉ là dự phòng, có thể để trống. Dữ liệu khách chỉ đi tầng này khi HS_GEMINI_FREE_CHO_KHACH=on
//      (OZV-726, CEO 13/11/2026: lưới cuối sau các tầng không-huấn-luyện; mặc định tắt).
//   3. GEMINI_API_KEY coi là khóa TRẢ PHÍ: chỉ dùng cho tier "premium" (NV bấm "auto", gọi
//      trước), hoặc khi máy không có nhà cung cấp nào khác. PREMIUM_PROVIDER=minimax (CEO chốt
//      14/10/2026 — Gemini trả phí đốt quá nhanh): tier premium đi chuỗi chuẩn trước, khóa trả
//      phí chỉ còn là chốt cuối khi chuỗi chết.
//   4. GEMINI_TRA_PHI_CHOT_CUOI (mặc định on — CEO chốt 30/10/2026, #578, tạm thời khi MiniMax hết hạn mức):
//      tier "standard" (lượt công khai) cũng lùi về khóa trả phí làm CHỐT CUỐI, chỉ sau khi mọi nhà cung cấp
//      khác (chuỗi chuẩn + Gemini miễn phí) đã thử và lỗi. off = đúng hành vi trước #578.

const { parseJsonLoose } = require('./parse-json');
// Dữ liệu khách (#237 J1): lượt trong withPrivateData() hoặc opts.containsCustomerData chỉ đi nhà cung cấp
// trong LLM_NO_TRAIN_PROVIDERS, không bao giờ qua Gemini miễn phí / mẫu ":free" / Hermes (mặc định).
const { isPrivate, privateAllowed, noTrainProviders, noPrivateLlmError, isFreeModel, geminiFreeChoKhach } = require('./llm-privacy');

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

// #725 lỗi 45 — ngắt mạch THANH TOÁN, theo NHÀ CUNG CẤP (mọi bước, khoá `${provider}|*`). Khoá Gemini trả phí trả 402 (hết
// tiền nạp trước — CEO 02/11/2026 chọn KHÔNG nạp), 401/403 (khoá sai/bị khoá) thì CHẮC CHẮN lỗi ở mọi bước cho tới khi có người
// nạp tiền/đổi khoá: không thử lại ở từng bước, từng lượt. Mở NGAY từ lần lỗi đầu (không chờ đủ ngưỡng như timeout), nghỉ
// LLM_NGAT_MACH_THANH_TOAN_MS (mặc định 900000 = 15 phút: một lời gọi dò 402 tốn < 1 s và 0 đồng; nạp tiền xong tối đa 15 phút
// là khoá được dùng lại, không phải khởi động lại). Hết giờ nghỉ → thử lại một lần; vẫn lỗi → mở lại; thành công → đóng.
const NGAT_MACH_MOI_BUOC = '*';
const ngatMachThanhToanNghiMs = () => envInt('LLM_NGAT_MACH_THANH_TOAN_MS') || 900000;

/** Lỗi thanh toán/khoá (402 hết tiền nạp, 401/403 khoá sai/bị khoá) — thử lại vô ích tới khi người nạp tiền/đổi khoá. */
function laLoiThanhToan(err) {
  if ([401, 402, 403].includes(Number(err?.status))) return true;
  return /\b(?:error|HTTP) (?:401|402|403)\b|credits? (?:are|is) depleted|API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(String(err?.message || ''));
}

/** Mạch (provider, step) đang mở? → provider bị bỏ qua cho bước này. Mạch thanh toán (provider, '*') chặn mọi bước. */
function ngatMachDangMo(provider, step) {
  const t = clock.now();
  const e = ngatMach.get(ngatMachKey(provider, step));
  const tt = ngatMach.get(ngatMachKey(provider, NGAT_MACH_MOI_BUOC));
  return Boolean((e && e.nghiToi > t) || (tt && tt.nghiToi > t));
}

/** Lỗi thanh toán/khoá → mở mạch (provider, mọi bước) ngay; log một dòng (không in khoá). */
function ngatMachGhiThanhToan(provider, err) {
  const key = ngatMachKey(provider, NGAT_MACH_MOI_BUOC);
  const e = ngatMach.get(key) || { loi: 0, nghiToi: 0, lyDo: 'THANH_TOAN' };
  e.loi += 1;
  e.nghiToi = clock.now() + ngatMachThanhToanNghiMs();
  ngatMach.set(key, e);
  console.warn(`[llm] ngắt mạch MỞ: ${provider} MỌI bước — lỗi thanh toán/khoá (${String(err?.status || '').trim() || '?'}: ${String(err?.message || err).slice(0, 80)}), nghỉ ${Math.round(ngatMachThanhToanNghiMs() / 1000)} s tới ${new Date(e.nghiToi).toISOString()}`);
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
  for (const key of [ngatMachKey(provider, step), ngatMachKey(provider, NGAT_MACH_MOI_BUOC)]) {
    const e = ngatMach.get(key);
    if (!e) continue;
    if (e.nghiToi) console.warn(`[llm] ngắt mạch ĐÓNG: ${provider} bước ${key.split('|')[1]} — gọi lại thành công`);
    ngatMach.delete(key);
  }
}

/**
 * Danh sách mạch đang mở cho /api/health: [{provider, step, nghiToi(ISO), lyDo}] — rỗng khi không có. Không in khoá.
 * lyDo: 'TIMEOUT' (theo bước) | 'THANH_TOAN' (step '*' = mọi bước, #725 lỗi 45).
 */
function ngatMachTrangThai() {
  const t = clock.now();
  const out = [];
  for (const [key, e] of ngatMach) {
    if (e.nghiToi > t) {
      const [provider, step] = key.split('|');
      out.push({ provider, step: step === '-' ? null : step, nghiToi: new Date(e.nghiToi).toISOString(), lyDo: e.lyDo || 'TIMEOUT' });
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

/** #578: khoá Gemini trả phí làm chốt cuối cho tier standard? Mặc định on; chỉ 'off'/'false'/'0' mới tắt. */
function geminiTraPhiChotCuoiBat() {
  const v = String(process.env.GEMINI_TRA_PHI_CHOT_CUOI ?? 'on').trim().toLowerCase();
  return !['off', 'false', '0', 'no'].includes(v);
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
  // OZV-726: công tắc bật + có khoá miễn phí → cụm khoá cũng là đường hợp lệ cho dữ liệu khách (lưới cuối).
  if (freeKeys().length && privateAllowed('gemini-free', 'gemini-2.5-flash')) out.push('gemini-free');
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

/** Lỗi do hết lượt? Trả thời điểm được dùng lại, hoặc null nếu là lỗi khác.
 * OZV-749: dò chữ PerDay trên `err.quotaId` + `err.body` (lib/gemini.js gắn đầy đủ) TRƯỚC — message bị
 * cắt 300 ký tự nên mất chữ PerDay nằm ở vị trí 431 của thân 429 thật (557 ký tự), khiến khoá cạn hạn mức
 * NGÀY chỉ bị nghỉ 65 giây. Lỗi từ nơi khác (không qua lib/gemini.js, chỉ có message) vẫn nhận ra như cũ. */
function quotaResetAt(err, now = Date.now()) {
  const msg = String(err?.message || '');
  if (err?.status !== 429 && !/\b429\b|RESOURCE_EXHAUSTED|quota/i.test(msg)) return null;
  const tinHieu = [err?.quotaId, err?.body, msg].filter(Boolean).join(' ');
  return /per ?day|PerDay|daily/i.test(tinHieu) ? nextPacificMidnight(now) : now + PER_MINUTE_COOLDOWN_MS;
}

function availableFreeKeys(now = Date.now()) {
  return freeKeys().filter((k) => (cooldown.get(k) || 0) <= now);
}

// OZV-726: khoá treo (timeout — QT đo 2/11 khoá treo hẳn) không được ăn hết ngân sách của mọi lượt:
// nghỉ GEMINI_FREE_NGHI_KHI_TREO_MS (mặc định 900000 = 15 phút) rồi xoay sang khoá kế.
function nghiKhiTreoMs() {
  return envInt('GEMINI_FREE_NGHI_KHI_TREO_MS') || 900000;
}

/** Lỗi treo/hết giờ của một lời gọi (race 'gemini timeout' hoặc AbortSignal.timeout của fetch). */
function laLoiTreo(err) {
  return /\btime-?out\b|timed out/i.test(String(err?.message || '')) || ['TimeoutError', 'AbortError'].includes(err?.name);
}

/** Mốc hồi SỚM NHẤT của cụm khoá miễn phí (khoá đang nghỉ, gần hồi nhất) — null khi mọi khoá đều dùng được. */
function freeKeysHoiSomNhat(now = Date.now()) {
  let min = null;
  for (const k of freeKeys()) {
    const t = cooldown.get(k) || 0;
    if (t > now && (min == null || t < min)) min = t;
  }
  return min;
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
    ...(paid && ((!free.length && !fallbacks.length) || geminiTraPhiChotCuoiBat()) ? ['gemini-paid'] : []),
  ];
  const privateList = privateProviders();
  // OZV-726: trạng thái cụm khoá Gemini miễn phí CHO ĐƯỜNG DỮ LIỆU KHÁCH — nói thật cho giám đốc đọc /api/health.
  // Không in khoá: chỉ đếm và mốc thời gian.
  const hoiSomNhat = freeKeysHoiSomNhat();
  return {
    ok,
    gemini: free.length > 0 || paid,
    geminiFreeKeys: free.length,
    geminiFreeAvailable: freeAvailable,
    geminiPaid: paid,
    fallbacks,
    order,
    // OZV-726 (CEO 13/11/2026): cụm khoá Gemini miễn phí cho lượt có dữ liệu khách (HS_GEMINI_FREE_CHO_KHACH,
    // lưới cuối sau các tầng không-huấn-luyện). choKhach=false (mặc định) = dữ liệu khách không đụng tầng miễn phí.
    cuKhoaGemini: {
      choKhach: geminiFreeChoKhach(),
      tongKhoa: free.length,
      conDungDuoc: freeAvailable,
      hoiSomNhat: hoiSomNhat != null ? new Date(hoiSomNhat).toISOString() : null,
    },
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
 * callLLMJson(systemPrompt, userPrompt, { tier, maxTokens, timeoutMs, geminiTimeoutMs, geminiModelEnv, step, hanChotMs })
 *   step: tên bước ('understand' | 'gir' | 'describe' | …) — chọn LLM_STEP_<STEP>, LLM_TIMEOUT_MS_<STEP> và khoá ngắt mạch (#425).
 *   hanChotMs: HẠN CHÓT tuyệt đối (ms, theo Date.now) của cả lượt gọi — do bên giữ ngân sách (engine-loop) truyền. Mọi tầng
 *   (chuỗi chính, Gemini miễn phí, khoá trả phí) chỉ chờ tới hạn này: trước #725-45 tầng dự phòng nhận LẠI trọn timeoutMs nên
 *   một lời gọi có thể kéo 2× timeoutMs và vượt trần request 300 s của server.js. Không truyền → như cũ.
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
  // #725-45: lỗi của CHUỖI CHÍNH (MiniMax…) giữ riêng — tầng dự phòng lỗi sau (vd Gemini 402) không được che mất nó. Bên gọi
  // (engine-loop callWithFallback) đọc thông điệp để quyết "gọi lại tắt suy nghĩ" khi JSON cụt / quá giờ; trước đây lỗi 402
  // của Gemini đè lên → lưới an toàn không chạy → ENGINE_TIMEOUT ngay vòng 0 dù MiniMax vẫn sống.
  let loiChuoiChinh = null;
  const boQua = []; // tầng bị bỏ qua (ngắt mạch, hết hạn lượt) — ghi vào thông điệp lỗi để chẩn đoán
  // #425: timeout theo bước (LLM_TIMEOUT_MS_<STEP> / _DEFAULT là trần; không đặt → như opts.timeoutMs cũ).
  // #725-45: và không vượt hạn chót của lượt (opts.hanChotMs) nếu bên gọi có truyền.
  const hanChot = Number(opts.hanChotMs) > 0 ? Number(opts.hanChotMs) : null;
  const theoHan = (ms) => (hanChot ? Math.min(ms, hanChot - Date.now()) : ms);
  const HAN_SAN_MS = 1000; // còn dưới 1 s tới hạn chót → không mở lời gọi mới (chắc chắn hết giờ, chỉ tốn tiền)
  const hetHan = (ms) => hanChot != null && ms < HAN_SAN_MS; // chỉ khi bên gọi có truyền hạn chót (không đụng timeout env ngắn của test #425)
  const timeoutMs = theoHan(stepTimeoutMs(opts.step, opts.timeoutMs));
  const geminiTraPhiDuocGoi = () => {
    if (ngatMachDangMo('gemini', opts.step)) { boQua.push('gemini: bỏ qua — ngắt mạch thanh toán/khoá đang mở'); return false; }
    return true;
  };
  const ghiLoiGeminiTraPhi = (e) => { if (laLoiThanhToan(e)) ngatMachGhiThanhToan('gemini', e); };

  // Premium (NV chủ động bấm "auto"): khóa Gemini trả phí trước, giới hạn thời gian ngắn.
  // PREMIUM_PROVIDER=minimax (CEO chốt 14/10/2026 — Gemini trả phí đốt quá nhanh): bỏ bước này,
  // tier premium đi chuỗi chuẩn trước (MiniMax); khóa trả phí còn lại đúng vai chốt cuối ở mục 3.
  const premiumGeminiFirst = String(process.env.PREMIUM_PROVIDER || 'gemini').trim().toLowerCase() !== 'minimax';
  // OZV-726 vá thứ tự (GĐ 13/11/2026): khoá trả phí chỉ được gọi MỘT lần mỗi lượt — bước 0 (premium), bước
  // 2a (lưới cuối của lượt dữ liệu khách) hoặc bước 3 (chốt cuối), cái nào tới trước.
  let daThuTraPhi = false;
  if (tier === 'premium' && paidKey && paidGeminiOk && premiumGeminiFirst && geminiTraPhiDuocGoi()) {
    attempted += 1;
    daThuTraPhi = true;
    try {
      const { json, model } = await callGemini(paidKey, systemPrompt, userPrompt,
        theoHan(opts.geminiTimeoutMs || Number(process.env.GEMINI_RACE_MS) || 8000), opts.geminiModelEnv);
      ngatMachGhiThanhCong('gemini', opts.step);
      return { json, provider: 'gemini', model, tier };
    } catch (e) {
      ghiLoiGeminiTraPhi(e);
      lastErr = e;
    }
  }

  // 1. Nhà cung cấp chính: MiniMax → Hermes → OpenRouter (lib/llm.mjs). Chế độ riêng tư: chat() tự bỏ qua
  //    nhà cung cấp ngoài danh sách trắng và mẫu ":free"; không gọi được ai thì ném NO_PRIVATE_LLM.
  if (fallbacks.length && hetHan(timeoutMs)) boQua.push(`chuỗi chính: bỏ qua — còn ${Math.max(0, timeoutMs)}ms tới hạn chót lượt`);
  else if (fallbacks.length) {
    let daGoiDuoc = false; // chat() đã trả nội dung → nhà cung cấp đã được gọi; lỗi parse sau đó KHÔNG đếm thêm lần nữa
    try {
      const { chat } = await import('./llm.mjs');
      const { content, provider, model, finishReason } = await chat(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        { json: true, private: priv, maxTokens: opts.maxTokens || 4000, timeoutMs, step: opts.step, ...(opts.temperature != null ? { temperature: opts.temperature } : {}), ...((opts.minimax || stepProfile(opts.step)) ? { minimax: opts.minimax || stepProfile(opts.step) } : {}) },
      );
      attempted += 1;
      daGoiDuoc = true;
      let parsed;
      try { parsed = parseJsonLoose(content); } catch (pe) {
        // Giữ 300 ký tự đầu/cuối để chẩn đoán (mẫu mới trả reasoning trong content, JSON bị cắt…).
        const c = String(content || '');
        // #725-46: finish_reason=length → JSON cụt vì chạm maxTokens (engine-loop mở "ngắt suy nghĩ" cho bước đó).
        throw new Error(`${pe.message} [${provider}/${model}, ${c.length} ký tự${finishReason ? `, finish_reason=${finishReason}` : ''}: "${c.slice(0, 200).replace(/\s+/g, ' ')}" … "${c.slice(-120).replace(/\s+/g, ' ')}"]`);
      }
      return { json: parsed, provider, model, tier: 'standard', ...(finishReason ? { finishReason } : {}) };
    } catch (e) {
      if (e?.code === 'NO_PRIVATE_LLM') { lastErr = lastErr || e; } // không nhà cung cấp nào được gọi — chưa "thử"
      else {
        lastErr = e; loiChuoiChinh = e;
        // #725-45: trước đây lỗi parse sau khi chat() trả nội dung bị đếm HAI lần ("3 nhà cung cấp hợp lệ đã thử" khi danh
        // sách trắng chỉ có minimax + gemini).
        if (!daGoiDuoc) attempted += 1;
      }
    }
  }

  // Hạn còn lại cho một lời gọi khoá trả phí — tính LÚC GỌI (ngân sách lượt đã bị các bước trước ăn bớt).
  const chotCuoiMsNow = () => theoHan(opts.timeoutMs ? stepTimeoutMs(opts.step, opts.timeoutMs) : stepTimeoutMs(opts.step, 45000));

  // 2a. OZV-726 vá thứ tự (GĐ 13/11/2026): với lượt DỮ LIỆU KHÁCH, khoá trả phí trong danh sách trắng phải
  //     được thử TRƯỚC cụm miễn phí — bất kể tier và bất kể PREMIUM_PROVIDER. Cụm miễn phí là LƯỚI CUỐI:
  //     chỉ chạy khi khoá trả phí không có hoặc đã lỗi. Trước bản vá này, lượt standard (mặc định) và lượt
  //     premium với PREMIUM_PROVIDER=minimax đều đẩy dữ liệu khách xuống tầng miễn phí trong khi khoá trả
  //     phí vẫn sống — trái luật "Dữ liệu khách không ra tầng miễn phí" (CLAUDE.md).
  if (priv && paidKey && paidGeminiOk && !daThuTraPhi) {
    const msTraPhi = chotCuoiMsNow();
    if (hetHan(msTraPhi)) boQua.push('gemini: bỏ qua — hết hạn chót lượt');
    else if (geminiTraPhiDuocGoi()) {
      attempted += 1;
      daThuTraPhi = true;
      try {
        const { json, model } = await callGemini(paidKey, systemPrompt, userPrompt, msTraPhi, opts.geminiModelEnv);
        ngatMachGhiThanhCong('gemini', opts.step);
        return { json, provider: 'gemini', model, tier };
      } catch (e) {
        ghiLoiGeminiTraPhi(e);
        lastErr = e;
      }
    }
  }

  // 2. Dự phòng: Gemini miễn phí, xoay vòng. Dữ liệu khách: KHÔNG BAO GIỜ, NGOẠI TRỪ OZV-726 (CEO 13/11/2026)
  //    HS_GEMINI_FREE_CHO_KHACH=on — cụm khoá là LƯỚI CUỐI, chỉ sau khi các tầng không-huấn-luyện (khoá trả phí
  //    bước 0, chuỗi chính MiniMax bước 1) đã thử và lỗi. Mặc định tắt = hành vi cũ nguyên vẹn.
  const freeOk = !priv || privateAllowed('gemini-free', 'gemini-2.5-flash');
  for (const key of freeOk ? availableFreeKeys() : []) {
    const conMs = theoHan(opts.geminiTimeoutMs || Number(process.env.GEMINI_FREE_TIMEOUT_MS) || 20000);
    if (hetHan(conMs)) { boQua.push('gemini-free: bỏ qua — hết hạn chót lượt'); break; }
    if (priv) attempted += 1; // OZV-726: đếm đúng số nhà cung cấp hợp lệ đã thử, kể cả tầng cụm khoá
    try {
      const { json, model } = await callGemini(key, systemPrompt, userPrompt,
        conMs, opts.geminiModelEnv, 'gemini-free');
      return { json, provider: 'gemini-free', model, tier };
    } catch (e) {
      lastErr = e;
      const until = quotaResetAt(e);
      if (until) cooldown.set(key, until);
      // OZV-726: khoá treo (timeout) cũng phải nghỉ — không để một khoá chết ăn hết ngân sách của mọi lượt.
      else if (laLoiTreo(e)) cooldown.set(key, clock.now() + nghiKhiTreoMs());
    }
  }
  // OZV-726: cụm khoá là đường dự phòng của lượt khách mà cả cụm hết lượt → nói rõ trong thông điệp lỗi
  // (bên gọi lẫn giám đốc đọc /api/health + log đều thấy hồi lúc nào, không phải đoán "AI bận").
  if (priv && freeOk && freeKeys().length > 0 && availableFreeKeys().length === 0) {
    const hoi = freeKeysHoiSomNhat();
    boQua.push(`cụm khoá gemini-free: ${freeKeys().length} khoá, 0 còn lượt, hồi lúc ${new Date(hoi ?? 0).toISOString()}`);
  }

  // 3. Khóa trả phí khi máy không có nhà cung cấp nào khác (để dịch vụ không chết).
  //    Dữ liệu khách: khoá trả phí (trong danh sách trắng) là đường dự phòng thay cho tầng miễn phí.
  //    Premium + PREMIUM_PROVIDER=minimax: chuỗi chuẩn đã thử xong → khoá trả phí là chốt cuối.
  //    #578 GEMINI_TRA_PHI_CHOT_CUOI (mặc định on): standard cũng tới đây sau khi mọi nhà cung cấp khác đã lỗi.
  const geminiTraPhiChotCuoi = tier !== 'premium'
    ? (priv || (!fallbacks.length && !freeKeys().length) || geminiTraPhiChotCuoiBat())
    : !premiumGeminiFirst;
  const chotCuoiMs = chotCuoiMsNow();
  // daThuTraPhi: bước 0 hoặc 2a đã gọi khoá trả phí và nó lỗi → không gọi lại lần hai trong cùng lượt.
  if (!daThuTraPhi && paidKey && paidGeminiOk && geminiTraPhiChotCuoi && hetHan(chotCuoiMs)) boQua.push('gemini: bỏ qua — hết hạn chót lượt');
  else if (!daThuTraPhi && paidKey && paidGeminiOk && geminiTraPhiChotCuoi && geminiTraPhiDuocGoi()) {
    attempted += 1;
    try {
      const { json, model } = await callGemini(paidKey, systemPrompt, userPrompt, chotCuoiMs, opts.geminiModelEnv);
      ngatMachGhiThanhCong('gemini', opts.step);
      return { json, provider: 'gemini', model, tier };
    } catch (e) {
      ghiLoiGeminiTraPhi(e);
      if (!priv) {
        // #725-45: giữ lỗi chuỗi chính trong thông điệp (status/code của lỗi Gemini giữ nguyên).
        if (loiChuoiChinh && loiChuoiChinh !== e) e.message = `${e.message} [chuỗi chính trước đó: ${String(loiChuoiChinh.message || loiChuoiChinh).slice(0, 200)}]`;
        throw e;
      }
      lastErr = e;
    }
  }

  // Dữ liệu khách: hết nhà cung cấp hợp lệ (không có, hoặc có mà lỗi) → NO_PRIVATE_LLM, không rơi xuống tầng
  // miễn phí. Giữ nguyên lỗi gốc trong thông điệp để describe/classify vẫn phân loại được "nên gọi lại" (500/429…).
  // #725-45: lỗi CHUỖI CHÍNH đứng TRƯỚC (thông điệp bị cắt ở 120–240 ký tự phía sau), lỗi tầng dự phòng đứng sau.
  if (priv) {
    const thu = lastErr && lastErr.code !== 'NO_PRIVATE_LLM';
    const chiTiet = !thu ? (boQua.length ? boQua.join('; ') : null)
      : [
        `${attempted} nhà cung cấp hợp lệ đã thử`,
        loiChuoiChinh ? `chuỗi chính: ${String(loiChuoiChinh.message || loiChuoiChinh).slice(0, 200)}` : null,
        lastErr !== loiChuoiChinh ? `lỗi cuối: ${String(lastErr.message || lastErr).slice(0, 200)}` : null,
        boQua.length ? boQua.join('; ') : null,
      ].filter(Boolean).join(', ');
    throw noPrivateLlmError(chiTiet);
  }
  throw lastErr || Object.assign(new Error(boQua.length ? `Không gọi được nhà cung cấp LLM nào: ${boQua.join('; ')}` : 'Không có provider LLM nào được cấu hình'), { code: boQua.length ? 'LLM_SKIPPED' : 'LLM_NOT_CONFIGURED' });
}

module.exports = {
  stepProfile, stepTimeoutMs,
  // #425: ngắt mạch theo (provider, step) — lib/llm.mjs gọi khi chọn/ghi nhận provider.
  ngatMachDangMo, ngatMachGhiTimeout, ngatMachGhiThanhCong, ngatMachTrangThai,
  // #725-45: ngắt mạch thanh toán (402/401/403) theo nhà cung cấp, mọi bước.
  ngatMachGhiThanhToan, laLoiThanhToan,
  callLLMJson, llmStatus, FALLBACK_PROVIDERS, privateProviders, providerModel, isFreeModel,
  // cho test
  _internal: { quotaResetAt, nextPacificMidnight, availableFreeKeys, freeKeysHoiSomNhat, nghiKhiTreoMs, laLoiTreo, cooldown, ngatMach, clock },
};
