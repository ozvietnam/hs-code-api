// OZV-1267 — khi MiniMax ĐÃ ngắt mạch TIMEOUT cho bước understand: trần ≤15 s + không thinking-off.
// Không gọi mạng: callLLMJson giả. Đỏ trước khi vá, xanh sau.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
for (const k of [
  'GEMINI_API_KEY', 'GEMINI_FREE_KEYS', 'HERMES_API_KEY', 'HERMES_BASE_URL', 'MINIMAX_API_KEY',
  'MINIMAX_MODEL', 'MINIMAX_ENRICH_MODEL', 'MINIMAX_FALLBACK_MODEL', 'OPENROUTER_API_KEY',
  'DEEPSEEK_API_KEY', 'LLM_TIMEOUT_MS_DEFAULT', 'LLM_TIMEOUT_MS_UNDERSTAND', 'LLM_TIMEOUT_MS_GIR',
  'LLM_NGAT_MACH_LOI_LIEN_TIEP', 'LLM_NGAT_MACH_NGHI_MS', 'LOOP_PROVIDER', 'LOOP_THINKING_OFF_TIMEOUT_MS',
  'LOOP_R1_TIMEOUT_MS', 'HS_CLASSIFY_FAST_FIRST', 'HS_UNDERSTAND_FAILFAST_MS',
]) delete process.env[k];

let pass = 0; let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); }
  else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 400)}`); }
};

const llmTier = require('../lib/llm-tier.js');
const engineLoop = require('../lib/engine-loop.js');
const { _internal } = llmTier;

process.env.MINIMAX_API_KEY = 'mm';

const reset = () => {
  _internal.ngatMach.clear();
  _internal.clock.now = () => Date.now();
};

// ── 1. Mạch đóng: understand GIỮ ngân sách bên gọi (không kẹp 15 s — MiniMax khoẻ cần 20–74 s) ──
{
  reset();
  const seen = [];
  const orig = llmTier.callLLMJson;
  llmTier.callLLMJson = async (_s, _u, opts) => {
    seen.push(opts.timeoutMs);
    return { json: { ok: 1 }, provider: 'stub', model: 'stub' };
  };
  await engineLoop.callWithFallback('sys', 'user', { step: 'understand', timeoutMs: 100000, minimax: { model: 'MiniMax-M3' } }, []);
  check('mạch đóng: understand giữ timeoutMs=100000', seen[0] === 100000, JSON.stringify(seen));
  llmTier.callLLMJson = orig;
}

// ── 2. MiniMax đã ngắt mạch understand → kẹp ≤ 15 s dù xin 100 s ──
{
  reset();
  _internal.ngatMach.set('minimax|understand', { loi: 2, nghiToi: Date.now() + 300000 });
  const seen = [];
  const orig = llmTier.callLLMJson;
  llmTier.callLLMJson = async (_s, _u, opts) => {
    seen.push({ timeoutMs: opts.timeoutMs, thinking: opts.minimax?.extraBody?.thinking?.type || null });
    return { json: { ok: 1 }, provider: 'stub', model: 'stub' };
  };
  await engineLoop.callWithFallback('sys', 'user', { step: 'understand', timeoutMs: 100000, minimax: { model: 'MiniMax-M3' } }, []);
  check(
    'ngắt mạch understand: timeoutMs ≤ 15000 dù xin 100000',
    seen.length === 1 && seen[0].timeoutMs <= 15000 && seen[0].thinking == null,
    JSON.stringify(seen),
  );
  llmTier.callLLMJson = orig;
}

// ── 3. Env HS_UNDERSTAND_FAILFAST_MS thắng khi đang ngắt mạch ──
{
  reset();
  process.env.HS_UNDERSTAND_FAILFAST_MS = '8000';
  _internal.ngatMach.set('minimax|understand', { loi: 2, nghiToi: Date.now() + 300000 });
  const seen = [];
  const orig = llmTier.callLLMJson;
  llmTier.callLLMJson = async (_s, _u, opts) => {
    seen.push(opts.timeoutMs);
    return { json: { ok: 1 }, provider: 'stub', model: 'stub' };
  };
  await engineLoop.callWithFallback('sys', 'user', { step: 'understand', timeoutMs: 100000 }, []);
  check('HS_UNDERSTAND_FAILFAST_MS=8000 → timeoutMs=8000 khi ngắt mạch', seen[0] === 8000, JSON.stringify(seen));
  delete process.env.HS_UNDERSTAND_FAILFAST_MS;
  llmTier.callLLMJson = orig;
}

// ── 4. Bước gir + ngắt mạch understand: gir KHÔNG bị kẹp (mạch theo bước) ──
{
  reset();
  _internal.ngatMach.set('minimax|understand', { loi: 2, nghiToi: Date.now() + 300000 });
  const seen = [];
  const orig = llmTier.callLLMJson;
  llmTier.callLLMJson = async (_s, _u, opts) => {
    seen.push(opts.timeoutMs);
    return { json: { ok: 1 }, provider: 'stub', model: 'stub' };
  };
  await engineLoop.callWithFallback('sys', 'user', { step: 'gir', timeoutMs: 60000 }, []);
  check('gir: giữ 60000 dù understand đang ngắt mạch', seen[0] === 60000, JSON.stringify(seen));
  llmTier.callLLMJson = orig;
}

// ── 5. Ngắt mạch understand + lần 1 lỗi → KHÔNG thinking-off, tường < 2 s ──
{
  reset();
  _internal.ngatMach.set('minimax|understand', { loi: 2, nghiToi: Date.now() + 300000 });
  const seen = [];
  const orig = llmTier.callLLMJson;
  llmTier.callLLMJson = async (_s, _u, opts) => {
    seen.push({ timeoutMs: opts.timeoutMs, thinking: opts.minimax?.extraBody?.thinking?.type || null });
    throw new Error('All providers failed: timeout sau 100ms');
  };
  const t0 = Date.now();
  let err = null;
  try {
    await engineLoop.callWithFallback('sys', 'user', { step: 'understand', timeoutMs: 100000, minimax: { model: 'MiniMax-M3' } }, []);
  } catch (e) { err = e; }
  const ms = Date.now() - t0;
  check(
    'ngắt mạch: chỉ 1 lần gọi, không thinking-off',
    seen.length === 1 && seen[0].thinking == null && err,
    JSON.stringify({ seen, err: String(err?.message || err), ms }),
  );
  check(
    'ngắt mạch: timeoutMs ≤ 15000 và tường < 2 s',
    seen[0]?.timeoutMs <= 15000 && ms < 2000,
    JSON.stringify({ timeoutMs: seen[0]?.timeoutMs, ms }),
  );
  llmTier.callLLMJson = orig;
}

// ── 6. Mạch đóng + timeout → vẫn thinking-off (hành vi cũ #725-45) ──
{
  reset();
  const seen = [];
  const orig = llmTier.callLLMJson;
  llmTier.callLLMJson = async (_s, _u, opts) => {
    seen.push({ timeoutMs: opts.timeoutMs, thinking: opts.minimax?.extraBody?.thinking?.type || null });
    if (seen.length === 1) throw new Error('minimax/MiniMax-M3: timeout sau 50000ms');
    return { json: { ok: 1 }, provider: 'stub', model: 'stub' };
  };
  const r = await engineLoop.callWithFallback('sys', 'user', { step: 'understand', timeoutMs: 100000, minimax: { model: 'MiniMax-M3' } }, []);
  check(
    'mạch đóng: vẫn thinking-off sau timeout',
    r.fallback === true && seen.length === 2 && seen[1].thinking === 'disabled' && seen[0].timeoutMs === 100000,
    JSON.stringify(seen),
  );
  llmTier.callLLMJson = orig;
}

// ── 7. Mạch vừa mở SAU timeout lần 1 → lần thinking-off bị chặn ──
{
  reset();
  const seen = [];
  const orig = llmTier.callLLMJson;
  llmTier.callLLMJson = async (_s, _u, opts) => {
    seen.push({ timeoutMs: opts.timeoutMs, thinking: opts.minimax?.extraBody?.thinking?.type || null });
    // Giả lập: lần 1 timeout làm mở mạch (như prod sau 2 lỗi — đây giả mở ngay).
    _internal.ngatMach.set('minimax|understand', { loi: 2, nghiToi: Date.now() + 300000 });
    throw new Error('minimax/MiniMax-M3: timeout sau 100ms');
  };
  let err = null;
  try {
    await engineLoop.callWithFallback('sys', 'user', { step: 'understand', timeoutMs: 100000, minimax: { model: 'MiniMax-M3' } }, []);
  } catch (e) { err = e; }
  check(
    'mạch mở sau timeout lần 1 → không thinking-off',
    seen.length === 1 && seen[0].thinking == null && err,
    JSON.stringify({ seen, err: String(err?.message || err) }),
  );
  llmTier.callLLMJson = orig;
}

console.log(`\n${fail ? 'FAILED' : 'OK'} — pass ${pass}, fail ${fail}`);
process.exit(fail ? 1 : 0);
