// OZV-1296 — chốt Gemini trả phí (402 / treo) không được chờ đủ trần bước (100–160 s).
// Không gọi mạng: fetch giả. Đỏ trước khi vá chotCuoiMsNow → GEMINI_RACE_MS; xanh sau.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
for (const k of [
  'GEMINI_API_KEY', 'GEMINI_FREE_KEYS', 'HERMES_API_KEY', 'HERMES_BASE_URL', 'MINIMAX_API_KEY',
  'MINIMAX_MODEL', 'MINIMAX_ENRICH_MODEL', 'MINIMAX_FALLBACK_MODEL', 'OPENROUTER_API_KEY',
  'DEEPSEEK_API_KEY', 'LLM_TIMEOUT_MS_DEFAULT', 'LLM_TIMEOUT_MS_UNDERSTAND', 'LLM_TIMEOUT_MS_GIR',
  'LLM_NGAT_MACH_LOI_LIEN_TIEP', 'LLM_NGAT_MACH_NGHI_MS', 'LLM_NGAT_MACH_THANH_TOAN_MS',
  'LOOP_PROVIDER', 'PREMIUM_PROVIDER', 'GEMINI_TRA_PHI_CHOT_CUOI', 'GEMINI_RACE_MS',
  'HS_LLM_PRIVATE_ALL', 'LLM_NO_TRAIN_PROVIDERS', 'HS_GEMINI_FREE_CHO_KHACH',
]) delete process.env[k];

let pass = 0; let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); }
  else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 500)}`); }
};

process.env.MINIMAX_API_KEY = 'mm';
process.env.GEMINI_API_KEY = 'paid';
process.env.GEMINI_TRA_PHI_CHOT_CUOI = 'on';
process.env.PREMIUM_PROVIDER = 'minimax';

let geminiMode = '402'; // '402' | 'hang' | 'ok'
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.includes('api.minimax.io')) {
    calls.push('minimax');
    return new Response(JSON.stringify({ choices: [{ message: { content: 'not-json' } }] }), { status: 200 });
  }
  if (u.includes('generativelanguage.googleapis.com')) {
    calls.push('gemini');
    if (geminiMode === '402') {
      return new Response(JSON.stringify({ error: { code: 402, message: 'Your prepayment credits are depleted.' } }), { status: 402 });
    }
    if (geminiMode === 'ok') {
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"who":"paid"}' }] } }] }), { status: 200 });
    }
    // hang: Promise.race với callGemini timeout — KHÔNG gắn abort signal (callGemini dùng setTimeout, không AbortController)
    return new Promise(() => {});
  }
  throw new Error(`unexpected fetch ${u}`);
};

const llmTier = require('../lib/llm-tier.js');
const { withPrivateData } = require('../lib/llm-privacy.js');
const { _internal } = llmTier;
const reset = () => {
  calls.length = 0;
  geminiMode = '402';
  _internal.ngatMach.clear();
  _internal.clock.now = () => Date.now();
};

// ── 1. 402: tường < 2 s dù timeoutMs bước = 60 s ──
{
  reset();
  const t0 = Date.now();
  let err = null;
  try { await llmTier.callLLMJson('sys', 'user', { step: 'understand', timeoutMs: 60000 }); } catch (e) { err = e; }
  const ms = Date.now() - t0;
  check('402: gọi gemini một lần', calls.filter((c) => c === 'gemini').length === 1, JSON.stringify(calls));
  check('402: status 402', err?.status === 402, err?.message);
  check('402: tường < 2 s (không chờ đủ 60 s)', ms < 2000, `ms=${ms}`);
  const nm = llmTier.llmStatus().ngatMach;
  check('402: mở mạch THANH_TOAN gemini|*', nm.length === 1 && nm[0].provider === 'gemini' && nm[0].step === '*' && nm[0].lyDo === 'THANH_TOAN', JSON.stringify(nm));
}

// ── 2. Mạch THANH_TOAN đang mở → bỏ gemini-paid hẳn (lượt riêng tư — thông điệp NO_PRIVATE_LLM có boQua) ──
{
  reset();
  _internal.ngatMach.set('gemini|*', { loi: 1, nghiToi: Date.now() + 900000, lyDo: 'THANH_TOAN' });
  const t0 = Date.now();
  let err = null;
  try { await withPrivateData(() => llmTier.callLLMJson('sys', 'user', { step: 'gir', timeoutMs: 60000 })); } catch (e) { err = e; }
  const ms = Date.now() - t0;
  check('THANH_TOAN mở: không gọi gemini', !calls.includes('gemini') && calls.includes('minimax'), JSON.stringify(calls));
  check('THANH_TOAN mở: thông điệp ghi bỏ qua', /gemini: bỏ qua — ngắt mạch thanh toán/.test(err?.message || ''), err?.message);
  check('THANH_TOAN mở: tường < 2 s', ms < 2000, `ms=${ms}`);
}

// ── 3. Gemini treo ở chốt cuối: trần probe ≤ GEMINI_RACE_MS (8 s), không 60 s ──
{
  reset();
  geminiMode = 'hang';
  process.env.GEMINI_RACE_MS = '8000';
  const t0 = Date.now();
  let err = null;
  try { await llmTier.callLLMJson('sys', 'user', { step: 'understand', timeoutMs: 60000 }); } catch (e) { err = e; }
  const ms = Date.now() - t0;
  check('treo: vẫn gọi gemini một lần', calls.includes('gemini'), JSON.stringify(calls));
  check('treo: lỗi timeout gemini', /gemini timeout/i.test(err?.message || ''), err?.message);
  check('treo: tường ≥ 7 s (chờ probe) và < 12 s (không 60 s)', ms >= 7000 && ms < 12000, `ms=${ms}`);
  delete process.env.GEMINI_RACE_MS;
}

// ── 4. Env GEMINI_RACE_MS=3000 → treo chết trong ~3 s ──
{
  reset();
  geminiMode = 'hang';
  process.env.GEMINI_RACE_MS = '3000';
  const t0 = Date.now();
  let err = null;
  try { await llmTier.callLLMJson('sys', 'user', { step: 'understand', timeoutMs: 60000 }); } catch (e) { err = e; }
  const ms = Date.now() - t0;
  check('GEMINI_RACE_MS=3000: tường ≥ 2.5 s và < 5 s', ms >= 2500 && ms < 5000, `ms=${ms} err=${err?.message}`);
  delete process.env.GEMINI_RACE_MS;
}

// ── 5. timeoutMs bước ngắn (300) vẫn thắng race — không nới thành 8 s ──
{
  reset();
  geminiMode = 'hang';
  const t0 = Date.now();
  let err = null;
  try { await llmTier.callLLMJson('sys', 'user', { step: 'understand', timeoutMs: 300 }); } catch (e) { err = e; }
  const ms = Date.now() - t0;
  check('bước 300ms: tường < 1.5 s (min(race, step)=300)', ms < 1500, `ms=${ms} err=${err?.message}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
