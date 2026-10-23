// #425 — timeout theo bước (LLM_TIMEOUT_MS_<STEP>) + ngắt mạch theo (provider, step) + quan sát được.
// Không gọi mạng: fetch giả lập tôn trọng signal (hang tới khi bị abort) để tạo timeout thật nhưng ngắn.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
for (const k of ['GEMINI_API_KEY', 'GEMINI_FREE_KEYS', 'HERMES_API_KEY', 'HERMES_BASE_URL', 'MINIMAX_API_KEY', 'MINIMAX_MODEL',
  'MINIMAX_ENRICH_MODEL', 'MINIMAX_FALLBACK_MODEL', 'OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY', 'LLM_TIMEOUT_MS_DEFAULT',
  'LLM_TIMEOUT_MS_UNDERSTAND', 'LLM_TIMEOUT_MS_GIR', 'LLM_NGAT_MACH_LOI_LIEN_TIEP', 'LLM_NGAT_MACH_NGHI_MS', 'LOOP_PROVIDER']) delete process.env[k];

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };
const warnings = [];
console.warn = (...a) => { warnings.push(a.join(' ')); };
console.error = () => {};

// minimaxMode: 'hang' (treo tới khi abort) | 'ok'
let minimaxMode = 'hang';
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const model = JSON.parse(init.body || '{}').model;
  if (u.includes('api.minimax.io')) {
    calls.push(`minimax:${model}`);
    if (minimaxMode === 'hang') {
      return new Promise((_, rej) => init.signal?.addEventListener('abort', () => rej(Object.assign(new Error('This operation was aborted'), { name: 'AbortError' }))));
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: `{"who":"minimax"}` } }] }), { status: 200 });
  }
  if (u.includes('api.deepseek.com')) {
    calls.push(`deepseek:${model}`);
    return new Response(JSON.stringify({ choices: [{ message: { content: `{"who":"deepseek"}` } }] }), { status: 200 });
  }
  if (u.includes('generativelanguage.googleapis.com')) {
    calls.push('gemini-free');
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"who":"gemini"}' }] } }] }), { status: 200 });
  }
  throw new Error(`unexpected fetch ${u}`);
};

const llmTier = require('../lib/llm-tier.js');
const { callLLMJson, llmStatus, stepTimeoutMs, _internal } = llmTier;
const reset = () => { calls.length = 0; warnings.length = 0; _internal.ngatMach.clear(); _internal.clock.now = () => Date.now(); };

// ── 1. Timeout theo bước: hàm phân giải thuần ──
check('không đặt env, không base → 60000 (hành vi cũ)', stepTimeoutMs('understand') === 60000);
check('không đặt env, có base → giữ base', stepTimeoutMs('understand', 100000) === 100000);
process.env.LLM_TIMEOUT_MS_UNDERSTAND = '5000';
check('LLM_TIMEOUT_MS_UNDERSTAND=5000 → 5000 (không phải 60000)', stepTimeoutMs('understand') === 5000);
check('env theo bước là TRẦN: không vượt ngân sách lượt gọi', stepTimeoutMs('understand', 3000) === 3000 && stepTimeoutMs('understand', 100000) === 5000);
check('bước khác không bị ảnh hưởng', stepTimeoutMs('gir', 160000) === 160000);
process.env.LLM_TIMEOUT_MS_DEFAULT = '7000';
check('LLM_TIMEOUT_MS_DEFAULT áp cho bước chưa đặt riêng', stepTimeoutMs('gir', 160000) === 7000 && stepTimeoutMs(undefined) === 7000);
check('bước đặt riêng thắng DEFAULT', stepTimeoutMs('understand') === 5000);
process.env.LLM_TIMEOUT_MS_DEFAULT = 'abc';
check('giá trị env rác → bỏ qua', stepTimeoutMs('gir', 160000) === 160000);
delete process.env.LLM_TIMEOUT_MS_DEFAULT;
delete process.env.LLM_TIMEOUT_MS_UNDERSTAND;

// ── 2. Tích hợp: timeout theo bước đi tới provider + ngắt mạch theo (provider, step) ──
// Chuỗi chat() dùng MỘT đồng hồ cho cả chuỗi (như prod): MiniMax hết giờ → provider sau không được thử →
// callLLMJson rơi sang Gemini dự phòng. Đây chính là đường "providers: [gemini, gemini]" trong #425.
process.env.MINIMAX_API_KEY = 'mm';
process.env.DEEPSEEK_API_KEY = 'ds';
process.env.GEMINI_FREE_KEYS = 'free-ok';
process.env.LLM_TIMEOUT_MS_UNDERSTAND = '40'; // ngắn để test chạy nhanh; thật thì 25–30 s
process.env.LLM_NGAT_MACH_NGHI_MS = '300000';
reset();
const t0 = Date.now();
let r = await callLLMJson('sys', 'user', { step: 'understand', timeoutMs: 100000 });
const ms1 = Date.now() - t0;
check('lần 1: MiniMax treo → timeout theo bước (40 ms, không chờ 100 s) → Gemini dự phòng', r.provider === 'gemini-free' && ms1 < 5000, JSON.stringify({ r, ms1, calls }));
check('MiniMax được gọi 1 lần (không lùi model khi timeout); DeepSeek không bị gọi oan sau khi hết giờ', calls.filter((c) => c.startsWith('minimax')).length === 1 && !calls.some((c) => c.startsWith('deepseek')), JSON.stringify(calls));
check('chưa mở mạch sau 1 lỗi', llmStatus().ngatMach.length === 0, JSON.stringify(llmStatus().ngatMach));

calls.length = 0;
r = await callLLMJson('sys', 'user', { step: 'understand', timeoutMs: 100000 });
check('lần 2: vẫn thử MiniMax (lỗi thứ 2) rồi Gemini', calls[0]?.startsWith('minimax') && r.provider === 'gemini-free', JSON.stringify(calls));
const nm = llmStatus().ngatMach;
check('2 timeout liên tiếp → mở mạch (minimax, understand)', nm.length === 1 && nm[0].provider === 'minimax' && nm[0].step === 'understand' && typeof nm[0].nghiToi === 'string', JSON.stringify(nm));
check('log một dòng khi MỞ mạch', warnings.some((w) => /ngắt mạch/i.test(w) && /MỞ/.test(w)), JSON.stringify(warnings));

// lần 3: MiniMax đã "sống" lại — nhưng mạch đang mở nên KHÔNG được gọi, đi thẳng DeepSeek
minimaxMode = 'ok';
calls.length = 0;
const t3 = Date.now();
r = await callLLMJson('sys', 'user', { step: 'understand', timeoutMs: 100000 });
check('lần 3: bỏ qua MiniMax, đi thẳng provider kế trong chuỗi (DeepSeek), không chờ', r.provider === 'deepseek' && !calls.some((c) => c.startsWith('minimax')) && Date.now() - t3 < 1000, JSON.stringify(calls));

// bước KHÁC cùng provider không bị ngắt
calls.length = 0;
r = await callLLMJson('sys', 'user', { step: 'gir', timeoutMs: 100000 });
check('bước khác (gir) vẫn gọi MiniMax bình thường', r.provider === 'minimax' && calls[0] === 'minimax:MiniMax-M2.7-highspeed', JSON.stringify(calls));

// hết thời gian nghỉ (giả lập đồng hồ) → thử lại MiniMax; thành công → đóng mạch
_internal.clock.now = () => Date.now() + 300001;
calls.length = 0; warnings.length = 0;
r = await callLLMJson('sys', 'user', { step: 'understand', timeoutMs: 100000 });
check('hết NGHI_MS → thử lại MiniMax, thành công', r.provider === 'minimax' && calls[0]?.startsWith('minimax'), JSON.stringify(calls));
check('thành công → đóng mạch, health rỗng', llmStatus().ngatMach.length === 0, JSON.stringify(llmStatus().ngatMach));
check('log một dòng khi ĐÓNG mạch', warnings.some((w) => /ngắt mạch/i.test(w) && /ĐÓNG/.test(w)), JSON.stringify(warnings));

// hết nghỉ nhưng vẫn timeout → mở lại ngay (không cần đủ N lần nữa)
minimaxMode = 'hang';
reset();
await callLLMJson('sys', 'user', { step: 'understand', timeoutMs: 100000 });
await callLLMJson('sys', 'user', { step: 'understand', timeoutMs: 100000 });
_internal.clock.now = () => Date.now() + 300001;
calls.length = 0;
await callLLMJson('sys', 'user', { step: 'understand', timeoutMs: 100000 });
check('hết nghỉ, thử lại vẫn timeout → mở lại', calls[0]?.startsWith('minimax') && llmStatus().ngatMach.length === 1, JSON.stringify(calls));

// lỗi KHÔNG phải timeout (500) không đếm vào ngắt mạch
reset();
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const model = JSON.parse(init.body || '{}').model;
  if (u.includes('api.minimax.io')) { calls.push(`minimax:${model}`); return new Response('upstream error', { status: 500 }); }
  if (u.includes('generativelanguage.googleapis.com')) { calls.push('gemini-free'); return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"who":"gemini"}' }] } }] }), { status: 200 }); }
  calls.push(`deepseek:${model}`);
  return new Response(JSON.stringify({ choices: [{ message: { content: `{"who":"deepseek"}` } }] }), { status: 200 });
};
await callLLMJson('sys', 'user', { step: 'understand' });
await callLLMJson('sys', 'user', { step: 'understand' });
await callLLMJson('sys', 'user', { step: 'understand' });
check('lỗi 500 (không timeout) → không mở mạch', llmStatus().ngatMach.length === 0 && calls.filter((c) => c.startsWith('minimax')).length === 3, JSON.stringify(calls));

// ── 3. engine-loop: thinking-off retry dùng ≤ 30000 và lấy timeout theo bước ──
process.env.LLM_TIMEOUT_MS_UNDERSTAND = '50000';
const engineLoop = require('../lib/engine-loop.js');
const seen = [];
const origCall = llmTier.callLLMJson;
llmTier.callLLMJson = async (s, u, opts) => {
  seen.push(opts);
  if (seen.length === 1) throw new Error('All providers failed: minimax/MiniMax-M3: timeout sau 50000ms');
  return { json: { ok: 1 }, provider: 'stub', model: 'stub' };
};
const log = [];
r = await engineLoop.callWithFallback('sys', 'user', { step: 'understand', timeoutMs: 100000, minimax: { model: 'MiniMax-M3' } }, log);
check('callWithFallback: lần 1 dùng timeout theo bước (50000, không phải 100000)', seen[0]?.timeoutMs === 50000, JSON.stringify(seen[0]));
check('thinking-off retry: timeout ≤ 30000 + thinking disabled', seen[1]?.timeoutMs === 30000 && seen[1]?.minimax?.extraBody?.thinking?.type === 'disabled', JSON.stringify(seen[1]));
check('engine.log ghi fallback kèm cause + timeoutMs', log.some((e) => e.fallback === 'thinking-off' && /timeout/.test(e.cause) && e.timeoutMs === 50000), JSON.stringify(log));
check('kết quả có fallback: true', r.fallback === true && r.json.ok === 1);
process.env.LLM_TIMEOUT_MS_UNDERSTAND = '20000';
seen.length = 0;
await engineLoop.callWithFallback('sys', 'user', { step: 'understand', timeoutMs: 100000 }, []);
check('bước 20000 → thinking-off dùng min(20000, 30000) = 20000', seen[1]?.timeoutMs === 20000, JSON.stringify(seen.map((o) => o.timeoutMs)));
llmTier.callLLMJson = origCall;
delete process.env.LLM_TIMEOUT_MS_UNDERSTAND;

// ── 4. /api/health có llm.ngatMach là mảng, không lộ khoá ──
reset();
const health = require('../api/health.js');
let body = null; let status = 0;
const res = { setHeader() {}, status(s) { status = s; return this; }, json(b) { body = b; return this; }, end() {} };
health({ method: 'GET', headers: {}, query: {} }, res);
check('/api/health: checks.llm.ngatMach là mảng (rỗng khi không có)', Array.isArray(body?.checks?.llm?.ngatMach) && body.checks.llm.ngatMach.length === 0, JSON.stringify(body?.checks?.llm));
_internal.ngatMach.set('minimax|understand', { loi: 2, nghiToi: Date.now() + 60000 });
body = null;
health({ method: 'GET', headers: {}, query: {} }, res);
check('/api/health: mạch đang mở → [{provider, step, nghiToi}]', body?.checks?.llm?.ngatMach?.[0]?.provider === 'minimax' && body.checks.llm.ngatMach[0].step === 'understand' && /^\d{4}-/.test(body.checks.llm.ngatMach[0].nghiToi), JSON.stringify(body?.checks?.llm?.ngatMach));
check('health không in khoá', !JSON.stringify(body).includes('"mm"') && !JSON.stringify(body).includes('"ds"'));

// ── 5. classify trả engine.log khi debug ──
{
  process.env.HS_CLASSIFY_ENGINE = 'loop';
  process.env.MIC_OFF = '1';
  process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
  const R1 = { product: { nameVi: 'dao hái cau cán dài', nameEn: 'pole knife', nameZh: '摘割槟榔刀', purpose: 'hái quả cau', mechanism: 'cơ-tay', material: 'hợp kim nhôm', evidence: {} }, hypotheses: [{ chapter: '82', heading4: '8201', subheading6: '820190', why: 'dụng cụ cầm tay', confidence: 80 }], verify: { searchVi: ['dao hái cau'], notesChapters: ['82'], codes8: ['82019000'], micQuery: null, unknowns: [] } };
  const R2 = { decision: 'CHOT', hs: '82019000', confidence: 88, reason: 'dụng cụ cầm tay nông nghiệp', gir: 'GIR 1', basis: [], conditions: [], alternatives: [], questions: [] };
  let script = [R1, R2];
  llmTier.callLLMJson = async () => ({ json: script.shift(), provider: 'stub', model: 'stub' });
  const { classify } = require('../lib/classify.js');
  const attrs = { tenHang: '加粗防电摘割槟榔刀伸缩杆加长12米铝合金', specs: '材质: 铝合金' };
  let out = await classify(attrs, {});
  check('không debug → engine.log KHÔNG có (shape cũ giữ nguyên, gates vẫn có)', out.engine && !('log' in out.engine) && Array.isArray(out.engine.gates), JSON.stringify(Object.keys(out.engine || {})));
  script = [R1, R2];
  out = await classify(attrs, { debug: true });
  check('debug → engine.log là mảng + engine.llm.timeoutMs theo bước', Array.isArray(out.engine?.log) && out.engine.llm && Number.isFinite(out.engine.llm.timeoutMs?.understand) && Number.isFinite(out.engine.llm.timeoutMs?.gir) && Array.isArray(out.engine.llm.ngatMach), JSON.stringify(out.engine?.llm));
  llmTier.callLLMJson = origCall;

  // api/classify.js: body.debug / ?debug=1 → đẩy vào opts
  const classifyMod = require('../lib/classify.js');
  const seenOpts = [];
  const origClassify = classifyMod.classify;
  classifyMod.classify = async (a, o) => { seenOpts.push(o); return { results: [] }; };
  const handler = require('../api/classify.js');
  const mk = (bodyIn, query = {}) => ({ method: 'POST', headers: {}, query, body: bodyIn });
  const res2 = { setHeader() {}, status() { return this; }, json() { return this; }, end() {} };
  await handler(mk({ tenHang: 'ốc vít thép M6x20' }), res2);
  await handler(mk({ tenHang: 'ốc vít thép M6x20', debug: true }), res2);
  await handler(mk({ tenHang: 'ốc vít thép M6x20' }, { debug: '1' }), res2);
  check('api/classify: body.debug=true hoặc ?debug=1 → opts.debug (mặc định tắt)', seenOpts.length === 3 && !seenOpts[0].debug && seenOpts[1].debug === true && seenOpts[2].debug === true, JSON.stringify(seenOpts));
  classifyMod.classify = origClassify;
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
