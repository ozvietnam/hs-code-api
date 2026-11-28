// OZV-2253 — Thực địa A3: MiniMax bước understand timeout liên tiếp → ngắt mạch MỞ 4 lần/30 phút.
// Kiểm chứng cơ chế gốc trong lib/llm-tier.js + 3 giả thuyết (a)(b)(c) + ca ngược (L3, Quy tắc 5):
//   1. Khi LOOP_PROVIDER=gemini (engine-loop truyền geminiModelEnv='LOOP_GEMINI_MODEL', minimax=undefined,
//      geminiTimeoutMs=r1Timeout=30000) mà Gemini trả phí đang ngắt mạch 402 (THANH_TOAN):
//      callLLMJson bước 1 phải giữ mẫu vòng lặp (LOOP_MODEL || 'MiniMax-M3') cho bước understand/gir,
//      KHÔNG rơi về mẫu batch MiniMax-M2.7-highspeed (mẫu suy nghĩ 15–35+ s làm understand chạm trần 30 s
//      2 lần liên tiếp → mở mạch minimax|understand 300 s).
//   2. Khi mạch gemini|* hết 15 phút nghỉ và bước 0 dò lại Gemini trả phí với geminiModelEnv='LOOP_GEMINI_MODEL':
//      trần dò bước 0 bị kẹp theo GEMINI_RACE_MS (không chờ trọn 30 s r1Timeout), và sau khi bước 0 lỗi thì
//      timeoutMs của bước 1 MiniMax được tính lại theo hạn chót còn lại (theoHan).
//   3. Giả thuyết (c): khi mạch minimax|understand đang MỞ 300 s, bước understand bỏ qua MiniMax ngay (0 fetch)
//      và lùi thẳng sang gemini-free; bước khác (gir) không bị chặn.
//   4. Ca ngược: caller ngoài engine-loop (không có geminiModelEnv='LOOP_GEMINI_MODEL') giữ nguyên
//      MiniMax-M2.7-highspeed; LLM_STEP_UNDERSTAND / LOOP_MODEL / opts.minimax tường minh vẫn thắng.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ENV_KEYS = [
  'GEMINI_API_KEY', 'GEMINI_FREE_KEYS', 'HERMES_API_KEY', 'HERMES_BASE_URL', 'MINIMAX_API_KEY',
  'MINIMAX_MODEL', 'MINIMAX_ENRICH_MODEL', 'MINIMAX_FALLBACK_MODEL', 'OPENROUTER_API_KEY',
  'DEEPSEEK_API_KEY', 'LLM_TIMEOUT_MS_DEFAULT', 'LLM_TIMEOUT_MS_UNDERSTAND', 'LLM_TIMEOUT_MS_GIR',
  'LLM_NGAT_MACH_LOI_LIEN_TIEP', 'LLM_NGAT_MACH_NGHI_MS', 'LLM_NGAT_MACH_THANH_TOAN_MS',
  'LOOP_PROVIDER', 'LOOP_MODEL', 'LOOP_GEMINI_MODEL', 'PREMIUM_PROVIDER', 'GEMINI_TRA_PHI_CHOT_CUOI',
  'GEMINI_RACE_MS', 'GEMINI_FREE_TIMEOUT_MS', 'HS_LLM_PRIVATE_ALL', 'LLM_NO_TRAIN_PROVIDERS',
  'HS_GEMINI_FREE_CHO_KHACH', 'LLM_STEP_UNDERSTAND', 'LLM_STEP_GIR', 'HS_BENCH_ONLY_9ROUTER',
];
for (const k of ENV_KEYS) delete process.env[k];

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) {
    pass += 1;
    console.log(`PASS ${name}`);
  } else {
    fail += 1;
    console.log(`FAIL ${name} ${String(extra).slice(0, 500)}`);
  }
};

const origFetch = globalThis.fetch;
const origWarn = console.warn;
const warnings = [];
console.warn = (...a) => { warnings.push(a.join(' ')); };

const llmTier = require('../lib/llm-tier.js');
const { callLLMJson, llmStatus, _internal } = llmTier;

const reset = () => {
  warnings.length = 0;
  _internal.ngatMach.clear();
  _internal.cooldown.clear();
  _internal.clock.now = () => Date.now();
};

try {
  // ── Ca 1: Tái hiện đúng cấu hình bản thật (LOOP_PROVIDER=gemini, gemini|* mở vì 402, r1Timeout=30s) ──
  // Nếu rơi về MiniMax-M2.7-highspeed thì treo tới abort (timeout) → 2 lượt liên tiếp mở mạch minimax|understand!
  // Nếu giữ đúng MiniMax-M3 thì trả JSON ngay → 0 timeout, mạch minimax|understand ĐÓNG.
  {
    reset();
    process.env.MINIMAX_API_KEY = 'mm-key';
    process.env.GEMINI_API_KEY = 'gm-paid';
    process.env.GEMINI_FREE_KEYS = 'gm-free-1';
    process.env.LOOP_PROVIDER = 'gemini';
    _internal.ngatMach.set('gemini|*', { loi: 1, nghiToi: Date.now() + 900000, lyDo: 'THANH_TOAN' });

    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      const u = String(url);
      if (u.includes('api.minimax.io')) {
        const body = JSON.parse(init.body || '{}');
        calls.push(`minimax:${body.model}`);
        // Tái hiện M2.7-highspeed suy nghĩ vượt trần bước understand, còn M3 trả kịp
        if (body.model === 'MiniMax-M2.7-highspeed') {
          return new Promise((_, rej) => {
            init.signal?.addEventListener('abort', () => rej(Object.assign(new Error('This operation was aborted'), { name: 'AbortError' })));
          });
        }
        return new Response(JSON.stringify({
          choices: [{ message: { content: `{"modelUsed":"${body.model}"}` }, finish_reason: 'stop' }],
        }), { status: 200 });
      }
      if (u.includes('generativelanguage.googleapis.com')) {
        calls.push('gemini-free');
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"modelUsed":"gemini-free"}' }] } }],
        }), { status: 200 });
      }
      throw new Error(`unexpected fetch ${u}`);
    };

    // Đúng opts mà engine-loop.js truyền khi LOOP_PROVIDER=gemini (...providerOpts(r1Timeout) ghi đè minimax: undefined)
    const loopUnderstandOpts = {
      step: 'understand',
      minimax: undefined,
      tier: 'premium',
      maxTokens: 6000,
      timeoutMs: 60,
      temperature: 0.1,
      geminiTimeoutMs: 60,
      geminiModelEnv: 'LOOP_GEMINI_MODEL',
    };

    const r1 = await callLLMJson('sys', 'user 1', loopUnderstandOpts);
    const r2 = await callLLMJson('sys', 'user 2', loopUnderstandOpts);

    check(
      'Ca 1a (bản thật LOOP_PROVIDER=gemini + mạch gemini|* mở): bước understand gọi MiniMax-M3, không rơi về MiniMax-M2.7-highspeed',
      r1.provider === 'minimax' && r1.model === 'MiniMax-M3' && r2.provider === 'minimax' && r2.model === 'MiniMax-M3'
        && calls.every((c) => c === 'minimax:MiniMax-M3'),
      JSON.stringify({ r1, r2, calls }),
    );
    check(
      'Ca 1b: 2 lượt understand liên tiếp không còn timeout ở M2.7 → mạch minimax|understand KHÔNG mở',
      !llmTier.ngatMachDangMo('minimax', 'understand')
        && !warnings.some((w) => /ngắt mạch MỞ: minimax bước understand/.test(w)),
      JSON.stringify({ ngatMach: llmStatus().ngatMach, warnings }),
    );
  }

  // ── Ca 2: Khi mạch gemini|* hết 15 phút nghỉ, bước 0 dò Gemini trả phí chỉ chờ GEMINI_RACE_MS (không chờ trọn r1Timeout)
  //         và bước 1 MiniMax tính lại timeoutMs theo hạn chót còn lại (hanChotMs, trên sàn HAN_SAN_MS=1000ms) ──
  {
    reset();
    process.env.MINIMAX_API_KEY = 'mm-key';
    process.env.GEMINI_API_KEY = 'gm-paid';
    process.env.LOOP_PROVIDER = 'gemini';
    process.env.GEMINI_RACE_MS = '200'; // trần race ngắn 200 ms (nhỏ hơn nhiều so với geminiTimeoutMs=3000 của bước)

    let minimaxAbortMs = null;
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      const u = String(url);
      if (u.includes('generativelanguage.googleapis.com')) {
        calls.push('gemini-paid-hang');
        // Giả lập Gemini trả phí treo: callGemini phải cắt ở GEMINI_RACE_MS (200 ms), không chờ 3000 ms
        return new Promise(() => {});
      }
      if (u.includes('api.minimax.io')) {
        const body = JSON.parse(init.body || '{}');
        calls.push(`minimax:${body.model}`);
        const tStart = Date.now();
        return new Promise((_, rej) => {
          init.signal?.addEventListener('abort', () => {
            minimaxAbortMs = Date.now() - tStart;
            rej(Object.assign(new Error('This operation was aborted'), { name: 'AbortError' }));
          });
        });
      }
      throw new Error(`unexpected fetch ${u}`);
    };

    const t0 = Date.now();
    const hanChotMs = t0 + 1300; // tổng ngân sách lượt 1300 ms (bước 0 ăn ~200 ms → bước 1 chỉ còn ~1100 ms ≥ HAN_SAN_MS 1000 ms, không được cầm 1300 ms cũ)
    let err = null;
    try {
      await callLLMJson('sys', 'user', {
        step: 'understand',
        minimax: undefined,
        tier: 'premium',
        timeoutMs: 3000,
        geminiTimeoutMs: 3000,
        geminiModelEnv: 'LOOP_GEMINI_MODEL',
        hanChotMs,
      });
    } catch (e) {
      err = e;
    }
    const totalMs = Date.now() - t0;

    check(
      'Ca 2a: bước 0 dò Gemini trả phí của LOOP_GEMINI_MODEL bị kẹp theo GEMINI_RACE_MS (200 ms), không chờ 3000 ms',
      calls[0] === 'gemini-paid-hang' && calls[1] === 'minimax:MiniMax-M3' && totalMs < 1550 && err != null,
      JSON.stringify({ calls, totalMs, minimaxAbortMs, err: err?.message }),
    );
    check(
      'Ca 2b: sau khi bước 0 tiêu ~200 ms, timeoutMs của bước 1 MiniMax được tính lại theo hanChotMs (≤ 1180 ms, không giữ 1300 ms cũ)',
      minimaxAbortMs != null && minimaxAbortMs <= 1180,
      JSON.stringify({ minimaxAbortMs, totalMs }),
    );
    delete process.env.GEMINI_RACE_MS;
  }

  // ── Ca 3: Giả thuyết (c) — khi mạch minimax|understand mở 300 s, bước understand bỏ qua MiniMax ngay (0 ms)
  //         và lùi thẳng sang gemini-free; bước gir vẫn gọi MiniMax-M3 bình thường ──
  {
    reset();
    process.env.MINIMAX_API_KEY = 'mm-key';
    process.env.GEMINI_API_KEY = 'gm-paid';
    process.env.GEMINI_FREE_KEYS = 'gm-free-1';
    process.env.HS_GEMINI_FREE_CHO_KHACH = 'on';
    process.env.LOOP_PROVIDER = 'gemini';
    _internal.ngatMach.set('gemini|*', { loi: 1, nghiToi: Date.now() + 900000, lyDo: 'THANH_TOAN' });
    _internal.ngatMach.set('minimax|understand', { loi: 2, nghiToi: Date.now() + 300000 });

    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      const u = String(url);
      if (u.includes('api.minimax.io')) {
        const body = JSON.parse(init.body || '{}');
        calls.push(`minimax:${body.model}`);
        return new Response(JSON.stringify({
          choices: [{ message: { content: `{"from":"${body.model}"}` }, finish_reason: 'stop' }],
        }), { status: 200 });
      }
      if (u.includes('generativelanguage.googleapis.com')) {
        calls.push('gemini-free');
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"from":"gemini-free"}' }] } }],
        }), { status: 200 });
      }
      throw new Error(`unexpected fetch ${u}`);
    };

    const rUnderstand = await callLLMJson('sys', 'user', {
      step: 'understand',
      minimax: undefined,
      tier: 'premium',
      timeoutMs: 30000,
      geminiTimeoutMs: 30000,
      geminiModelEnv: 'LOOP_GEMINI_MODEL',
      containsCustomerData: true,
    });
    check(
      'Ca 3a (giả thuyết c): khi mạch minimax|understand mở 300 s, bước understand không gọi MiniMax, lùi thẳng sang gemini-free',
      rUnderstand.provider === 'gemini-free'
        && calls.length === 1
        && calls[0] === 'gemini-free'
        && /minimax: bỏ qua — ngắt mạch đang mở cho bước understand/.test(rUnderstand.loiChuoiChinh || ''),
      JSON.stringify({ rUnderstand, calls }),
    );

    calls.length = 0;
    const rGir = await callLLMJson('sys', 'user', {
      step: 'gir',
      minimax: undefined,
      tier: 'premium',
      timeoutMs: 30000,
      geminiTimeoutMs: 30000,
      geminiModelEnv: 'LOOP_GEMINI_MODEL',
      containsCustomerData: true,
    });
    check(
      'Ca 3b (CA NGƯỢC theo bước): mạch minimax|understand mở nhưng bước gir vẫn gọi thẳng MiniMax-M3',
      rGir.provider === 'minimax' && rGir.model === 'MiniMax-M3' && calls.length === 1 && calls[0] === 'minimax:MiniMax-M3',
      JSON.stringify({ rGir, calls }),
    );
  }

  // ── Ca 4: CA NGƯỢC — tôn trọng LLM_STEP_UNDERSTAND, LOOP_MODEL, và giữ nguyên MiniMax-M2.7-highspeed cho caller ngoài loop ──
  {
    reset();
    for (const k of ENV_KEYS) delete process.env[k];
    process.env.MINIMAX_API_KEY = 'mm-key';

    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      const body = JSON.parse(init.body || '{}');
      calls.push({ model: body.model, reasoning: body.reasoning_effort || null, thinking: body.thinking?.type || null });
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }],
      }), { status: 200 });
    };

    // 4a: Caller ngoài engine-loop (không có geminiModelEnv='LOOP_GEMINI_MODEL', không truyền opts.minimax) → giữ MiniMax-M2.7-highspeed
    await callLLMJson('sys', 'user', { step: 'gir', timeoutMs: 10000 });
    check(
      'Ca 4a (CA NGƯỢC caller ngoài engine-loop): không có geminiModelEnv=LOOP_GEMINI_MODEL → giữ nguyên MiniMax-M2.7-highspeed',
      calls.length === 1 && calls[0].model === 'MiniMax-M2.7-highspeed',
      JSON.stringify(calls),
    );

    // 4b: Đặt LOOP_MODEL tuỳ chỉnh khi geminiModelEnv='LOOP_GEMINI_MODEL' → lấy đúng LOOP_MODEL
    calls.length = 0;
    process.env.LOOP_MODEL = 'MiniMax-M3-Custom';
    await callLLMJson('sys', 'user', {
      step: 'understand',
      minimax: undefined,
      geminiModelEnv: 'LOOP_GEMINI_MODEL',
      timeoutMs: 10000,
    });
    check(
      'Ca 4b (CA NGƯỢC LOOP_MODEL): có LOOP_MODEL thì dùng LOOP_MODEL thay vì MiniMax-M3 mặc định',
      calls.length === 1 && calls[0].model === 'MiniMax-M3-Custom',
      JSON.stringify(calls),
    );
    delete process.env.LOOP_MODEL;

    // 4c: Đặt LLM_STEP_UNDERSTAND="MiniMax-M3:low" → stepProfile thắng mặc định LOOP_MODEL
    calls.length = 0;
    process.env.LLM_STEP_UNDERSTAND = 'MiniMax-M3:low';
    await callLLMJson('sys', 'user', {
      step: 'understand',
      minimax: undefined,
      geminiModelEnv: 'LOOP_GEMINI_MODEL',
      timeoutMs: 10000,
    });
    check(
      'Ca 4c (CA NGƯỢC LLM_STEP_UNDERSTAND): LLM_STEP_UNDERSTAND thắng và truyền đủ reasoning_effort',
      calls.length === 1 && calls[0].model === 'MiniMax-M3' && calls[0].reasoning === 'low',
      JSON.stringify(calls),
    );
    delete process.env.LLM_STEP_UNDERSTAND;
  }
} finally {
  globalThis.fetch = origFetch;
  console.warn = origWarn;
  reset();
  for (const k of ENV_KEYS) delete process.env[k];
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
