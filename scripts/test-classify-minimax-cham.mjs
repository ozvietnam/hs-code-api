// #725 lỗi 45 — /api/classify (engine loop, khoá dịch vụ → withPrivateData) trả NEEDS_EXPERT/ENGINE_TIMEOUT ở vòng 0 khi MiniMax là
// nhà cung cấp hợp lệ DUY NHẤT còn sống và khoá Gemini trả phí đang trả 402 (hết tiền nạp, CEO chọn không nạp).
// Không gọi mạng, không chờ thật: fetch giả lập; phần động cơ dùng ĐỒNG HỒ GIẢ (Date.now bị thay) để giả độ trễ 30–40 s.
//  A. llm-tier: lỗi chuỗi chính (MiniMax) không bị lỗi 402 của Gemini che; đếm đúng số nhà cung cấp; ngắt mạch thanh toán.
//  B. callWithFallback (đúng ca prod): MiniMax trả JSON cụt + Gemini 402 → vẫn gọi lại "tắt suy nghĩ" → ra kết quả.
//  C. Động cơ với nhà cung cấp chậm 30–40 s (đồng hồ giả) → ra mã, không ENGINE_TIMEOUT; ca xấu nhất không vượt ngân sách.
//  D. Câu `missing` khi quá giờ: ERP giữ "bấm Áp mã lại", API/MCP nhận câu trung tính.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
for (const k of ['GEMINI_API_KEY', 'GEMINI_FREE_KEYS', 'HERMES_API_KEY', 'HERMES_BASE_URL', 'MINIMAX_API_KEY', 'MINIMAX_MODEL',
  'MINIMAX_ENRICH_MODEL', 'MINIMAX_FALLBACK_MODEL', 'OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY', 'LLM_TIMEOUT_MS_DEFAULT',
  'LLM_TIMEOUT_MS_UNDERSTAND', 'LLM_TIMEOUT_MS_GIR', 'LLM_NGAT_MACH_LOI_LIEN_TIEP', 'LLM_NGAT_MACH_NGHI_MS',
  'LLM_NGAT_MACH_THANH_TOAN_MS', 'LOOP_PROVIDER', 'LOOP_THINKING_OFF_TIMEOUT_MS', 'LLM_NO_TRAIN_PROVIDERS', 'HS_LLM_PRIVATE_ALL',
  'PREMIUM_PROVIDER', 'GEMINI_TRA_PHI_CHOT_CUOI', 'CLASSIFY_BUDGET_MS', 'LOOP_R1_TIMEOUT_MS', 'LOOP_R2_TIMEOUT_MS',
  'HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'R1_MAX_TOKENS', 'GIR_MAX_TOKENS', 'HS_SO_TAY', 'HS_SO_TAY_DONG', 'HS_EMBED_POOL',
  'ZAI_WEB_FACTS', 'ZAI_SEARCH_KEY', 'LLM_STEP_UNDERSTAND', 'LLM_STEP_GIR', 'LOOP_MODEL']) delete process.env[k];
process.env.HS_CLASSIFY_ENGINE = 'loop';
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 900)}`); } };
const warnings = [];
console.warn = (...a) => { warnings.push(a.join(' ')); };
console.error = () => {};

// ── fetch giả: MiniMax (theo chế độ) + Gemini trả phí (theo chế độ) ──
// minimaxMode: 'cut' (trả <think> bị cắt — JSON cụt ở maxTokens) | 'ok' | 'hang' (treo tới khi abort)
// geminiMode: '402' | 'ok'
let minimaxMode = 'cut';
let geminiMode = '402';
const calls = [];
const R1_JSON = '{"product":{"nameVi":"chân pin bấm dây dẫn","purpose":"nối dây dẫn"},"hypotheses":[{"chapter":"85","heading4":"8536","subheading6":"853690","why":"bộ phận nối dây dẫn","confidence":80}],"verify":{"searchVi":["chân pin"],"codes8":["85369012"]}}';
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const body = JSON.parse(init.body || '{}');
  if (u.includes('api.minimax.io')) {
    const off = body.thinking?.type === 'disabled';
    calls.push(`minimax:${body.model}${off ? ':off' : ''}`);
    if (minimaxMode === 'hang' && !off) {
      return new Promise((_, rej) => init.signal?.addEventListener('abort', () => rej(Object.assign(new Error('This operation was aborted'), { name: 'AbortError' }))));
    }
    if (minimaxMode === 'cut' && !off) {
      return new Response(JSON.stringify({ choices: [{ message: { content: '<think>Hàng là chân pin bấm vào dây dẫn, xét nhóm 8536, phân nhóm 853690, tiêu đề 8536901 đầu nối cho dây dẫn' } }], usage: { prompt_tokens: 3000, completion_tokens: 6000 } }), { status: 200 });
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: R1_JSON } }] }), { status: 200 });
  }
  if (u.includes('generativelanguage.googleapis.com')) {
    calls.push('gemini');
    if (geminiMode === '402') return new Response(JSON.stringify({ error: { code: 402, message: 'Your prepayment credits are depleted. Please go to AI Studio to manage your project and billing.', status: 'RESOURCE_EXHAUSTED' } }), { status: 402 });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"who":"gemini"}' }] } }] }), { status: 200 });
  }
  throw new Error(`unexpected fetch ${u}`);
};

process.env.MINIMAX_API_KEY = 'mm';
process.env.GEMINI_API_KEY = 'paid';
const llmTier = require('../lib/llm-tier.js');
const { withPrivateData } = require('../lib/llm-privacy.js');
const { _internal } = llmTier;
const reset = () => { calls.length = 0; warnings.length = 0; _internal.ngatMach.clear(); _internal.clock.now = () => Date.now(); minimaxMode = 'cut'; geminiMode = '402'; };

// ═════════ A. llm-tier ═════════
reset();
let err = null;
try { await withPrivateData(() => llmTier.callLLMJson('sys', 'user', { step: 'understand', timeoutMs: 100000 })); } catch (e) { err = e; }
check('A1 ca prod: JSON cụt + Gemini 402 → NO_PRIVATE_LLM', err?.code === 'NO_PRIVATE_LLM', err?.message);
check('A1 thông điệp giữ lỗi CHUỖI CHÍNH (No parseable JSON của MiniMax) đứng trước lỗi 402', /chuỗi chính: No parseable JSON/.test(err?.message) && err.message.indexOf('chuỗi chính') < err.message.indexOf('402'), err?.message);
check('A1 đếm đúng: 2 nhà cung cấp hợp lệ đã thử (trước: "3" — lỗi parse bị đếm hai lần)', /— 2 nhà cung cấp hợp lệ đã thử/.test(err?.message), err?.message);
check('A1 120 ký tự đầu (engine.error cắt ở 120) vẫn có lý do đủ để quyết gọi lại', /parseable JSON|timeout/.test(String(err?.message).replace(/^NO_PRIVATE_LLM: .*?— /, '').slice(0, 120)), err?.message);
let nm = llmTier.llmStatus().ngatMach;
check('A2 Gemini 402 → ngắt mạch THANH TOÁN mở ngay (gemini, mọi bước)', nm.length === 1 && nm[0].provider === 'gemini' && nm[0].step === '*' && nm[0].lyDo === 'THANH_TOAN', JSON.stringify(nm));
check('A2 log một dòng khi mở mạch, không in khoá', warnings.some((w) => /ngắt mạch MỞ: gemini MỌI bước/.test(w)) && !warnings.join(' ').includes('paid'), JSON.stringify(warnings));

calls.length = 0;
const tA3 = Date.now();
err = null;
try { await withPrivateData(() => llmTier.callLLMJson('sys', 'user', { step: 'gir', timeoutMs: 160000 })); } catch (e) { err = e; }
check('A3 bước KHÁC, lượt sau: Gemini bị bỏ qua hẳn (không gọi lại mỗi bước)', !calls.includes('gemini') && calls.some((c) => c.startsWith('minimax')), JSON.stringify(calls));
check('A3 thông điệp: 1 nhà cung cấp hợp lệ đã thử + ghi rõ gemini bị bỏ qua', /1 nhà cung cấp hợp lệ đã thử/.test(err?.message) && /gemini: bỏ qua — ngắt mạch thanh toán/.test(err?.message), err?.message);
check('A3 nhanh (không chờ Gemini)', Date.now() - tA3 < 2000);

// hết giờ nghỉ (15 phút, đồng hồ giả) → dò lại một lần; nạp tiền xong (ok) → đóng mạch
_internal.clock.now = () => Date.now() + 900001;
geminiMode = 'ok'; calls.length = 0;
const rA4 = await withPrivateData(() => llmTier.callLLMJson('sys', 'user', { step: 'understand', timeoutMs: 100000 }));
check('A4 hết LLM_NGAT_MACH_THANH_TOAN_MS (15 phút) → dò lại Gemini, thành công → đóng mạch', rA4.provider === 'gemini' && calls.includes('gemini') && llmTier.llmStatus().ngatMach.length === 0, JSON.stringify([rA4.provider, calls, llmTier.llmStatus().ngatMach]));

// lượt công khai (không riêng tư): lỗi 402 cuối cùng vẫn mang lỗi chuỗi chính
reset();
err = null;
try { await llmTier.callLLMJson('sys', 'user', { step: 'understand', timeoutMs: 100000 }); } catch (e) { err = e; }
check('A5 lượt công khai: lỗi Gemini 402 (status giữ nguyên) kèm lỗi chuỗi chính', err?.status === 402 && /chuỗi chính trước đó: No parseable JSON/.test(err?.message), err?.message);

// hạn chót lượt: MiniMax treo tới hết hạn → Gemini (sống) KHÔNG được chờ thêm một timeout trọn nữa
reset();
geminiMode = 'ok'; minimaxMode = 'hang';
const tA6 = Date.now();
err = null;
try { await withPrivateData(() => llmTier.callLLMJson('sys', 'user', { step: 'understand', timeoutMs: 300, hanChotMs: Date.now() + 300 })); } catch (e) { err = e; }
check('A6 hanChotMs: MiniMax hết giờ đúng hạn chót → Gemini bị bỏ qua (không vượt hạn), báo rõ', !calls.includes('gemini') && /gemini: bỏ qua — hết hạn chót lượt/.test(err?.message) && Date.now() - tA6 < 1500, JSON.stringify([calls, err?.message, Date.now() - tA6]));
reset();
geminiMode = 'ok'; minimaxMode = 'hang';
const rA7 = await withPrivateData(() => llmTier.callLLMJson('sys', 'user', { step: 'understand', timeoutMs: 300 }));
check('A7 không truyền hanChotMs → như cũ: Gemini trả phí vẫn là dự phòng cho dữ liệu khách', rA7.provider === 'gemini', JSON.stringify(rA7));

// ═════════ B. callWithFallback — đúng ca prod 02/11 ═════════
const engineLoop = require('../lib/engine-loop.js');
reset();
const logB = [];
let rB = null; err = null;
try { rB = await withPrivateData(() => engineLoop.callWithFallback('sys', 'user', { step: 'understand', timeoutMs: 100000, minimax: { model: 'MiniMax-M3' } }, logB)); } catch (e) { err = e; }
check('B1 JSON cụt + Gemini 402 → lưới an toàn "tắt suy nghĩ" CHẠY → ra JSON vòng 1 từ MiniMax', rB?.provider === 'minimax' && rB.fallback === true && rB.json?.product?.nameVi === 'chân pin bấm dây dẫn', err?.message || JSON.stringify(rB));
check('B1 log ghi fallback thinking-off kèm nguyên nhân thật (parseable JSON) trong 120 ký tự, không phải 402', logB.some((e) => e.fallback === 'thinking-off' && /^NO_PRIVATE_LLM: 2 nhà cung cấp/.test(e.cause) && /parseable JSON/.test(e.cause)), JSON.stringify(logB));
check('B1 thứ tự gọi: MiniMax-M3 → Gemini (402, mở mạch) → MiniMax-M3 tắt suy nghĩ (Gemini không bị gọi lần 2)', JSON.stringify(calls) === JSON.stringify(['minimax:MiniMax-M3', 'gemini', 'minimax:MiniMax-M3:off']), JSON.stringify(calls));

// ═════════ C. Động cơ với nhà cung cấp chậm (ĐỒNG HỒ GIẢ) ═════════
const R1 = JSON.parse(R1_JSON);
const R2 = { decision: 'CHOT', hs: '85369012', confidence: 85, reason: 'chân pin bấm vào dây dẫn — bộ phận nối cho dây dẫn', gir: 'GIR 1', basis: [{ stream: 'SAN_PHAM', claim: 'bấm vào dây dẫn', evidence: 'bấm vào dây dẫn' }], conditions: [], alternatives: [], questions: [] };
const ATTRS = { tenHang: 'Chân pin bấm vào dây dẫn, bằng đồng thau mạ thiếc, dùng nối dây dẫn điện', chatLieu: 'đồng thau mạ thiếc', congDung: 'bấm vào dây dẫn để nối' };
const realNow = Date.now;
let fake = 0;
/**
 * plan[i] = { ms, ra: 'ok' | 'cut' | 'hang' } cho lời gọi thứ i. Nhà cung cấp "trả lời sau ms": nếu timeout của lời gọi < ms thì
 * đồng hồ giả tiến đúng timeout rồi ném lỗi timeout (như chat() thật); không thì tiến ms rồi trả JSON đúng vòng (hoặc JSON cụt).
 */
function giaLap(plan) {
  const seen = [];
  llmTier.callLLMJson = async (system, user, opts = {}) => {
    const p = plan[seen.length] || plan[plan.length - 1];
    seen.push({ step: opts.step, timeoutMs: opts.timeoutMs, hanChotMs: opts.hanChotMs, thinkingOff: opts.minimax?.extraBody?.thinking?.type === 'disabled', at: fake });
    if (!(opts.timeoutMs > 0)) throw new Error('NO_PRIVATE_LLM: bỏ qua — hết hạn chót lượt');
    if (p.ra === 'hang' || opts.timeoutMs < p.ms) { fake += Math.max(0, opts.timeoutMs); throw new Error(`NO_PRIVATE_LLM: — 1 nhà cung cấp hợp lệ đã thử, chuỗi chính: All providers failed: minimax/MiniMax-M3: timeout sau ${opts.timeoutMs}ms`); }
    fake += p.ms;
    if (p.ra === 'cut') throw new Error('NO_PRIVATE_LLM: — 1 nhà cung cấp hợp lệ đã thử, chuỗi chính: No parseable JSON in LLM output [minimax/MiniMax-M3, 24000 ký tự]');
    return { json: JSON.parse(JSON.stringify(String(system).startsWith('VÒNG 1') ? R1 : R2)), provider: 'minimax', model: 'MiniMax-M3' };
  };
  return seen;
}
async function chayDongCo(plan, opts = {}) {
  const seen = giaLap(plan);
  fake = realNow.call(Date);
  const t0 = fake;
  Date.now = () => fake;
  try {
    const out = await withPrivateData(() => engineLoop.classifyLoop(ATTRS, opts));
    return { out, seen, ms: fake - t0, t0 };
  } finally { Date.now = realNow; }
}
const BUDGET = 285000;
const SERVER_MS = 300000;

for (const tre of [30000, 35000, 40000]) {
  const { out, seen, ms } = await chayDongCo([{ ms: tre, ra: 'ok' }]);
  check(`C1 MiniMax ${tre / 1000} s mỗi bước → ra mã, không ENGINE_TIMEOUT`, out.nextAction?.reasonCode !== 'ENGINE_TIMEOUT' && out.results?.length > 0 && /^8536/.test(out.results[0].hs) && !out.engine.error && out.engine.rounds >= 2, JSON.stringify([out.status, out.nextAction, out.engine?.rounds, out.engine?.error]));
  check(`C1 ${tre / 1000} s: timeout mỗi bước ≥ 1,5 × độ trễ (biên an toàn) và mọi lời gọi mang hạn chót lượt`, seen.every((s) => s.timeoutMs >= tre * 1.5 && s.hanChotMs > 0), JSON.stringify(seen));
  check(`C1 ${tre / 1000} s: tổng ≤ ngân sách ${BUDGET / 1000} s`, ms <= BUDGET, String(ms));
}

// Đúng ca prod: vòng 1 JSON cụt sau ~55 s (suy nghĩ chạm maxTokens) → tắt suy nghĩ 8 s → vòng 2 90 s → ra mã.
{
  const { out, seen, ms } = await chayDongCo([{ ms: 55000, ra: 'cut' }, { ms: 8000, ra: 'ok' }, { ms: 90000, ra: 'ok' }]);
  check('C2 ca prod (vòng 1 cụt 55 s → tắt suy nghĩ → vòng 2) → ra mã thay vì ENGINE_TIMEOUT', out.results?.length > 0 && !out.engine.error && seen[1].thinkingOff && out.engine.rounds >= 2, JSON.stringify([out.status, out.engine?.error, seen]));
  check('C2 tổng ≤ ngân sách', ms <= BUDGET, String(ms));
}

// Lần "tắt suy nghĩ" rơi về mẫu không tắt được suy nghĩ (M2.7-highspeed ~30–40 s): trần mới 45 s đủ, trần cũ 30 s thì hết giờ.
{
  const { out, seen } = await chayDongCo([{ ms: 0, ra: 'hang' }, { ms: 40000, ra: 'ok' }, { ms: 40000, ra: 'ok' }]);
  check('C3 vòng 1 treo 100 s → tắt suy nghĩ trả sau 40 s (≤ trần 45 s) → vẫn ra mã', out.results?.length > 0 && !out.engine.error && seen[1].thinkingOff && seen[1].timeoutMs === 45000, JSON.stringify([out.status, out.engine?.error, seen]));
}

// Ca xấu nhất: vòng 1 treo → tắt suy nghĩ 40 s; vòng 2 treo → lần tắt suy nghĩ chỉ được phần còn lại → tổng ≤ ngân sách < 300 s.
// (Trước: lần tắt suy nghĩ luôn 30 s cứng → 100+40+135+30 = 305 s > trần 300 s của server.js → 504.)
{
  const { out, seen, ms } = await chayDongCo([{ ms: 0, ra: 'hang' }, { ms: 40000, ra: 'ok' }, { ms: 0, ra: 'hang' }, { ms: 0, ra: 'hang' }]);
  check('C4 ca xấu nhất: tổng ≤ ngân sách 285 s (< trần request 300 s)', ms <= BUDGET && ms < SERVER_MS, JSON.stringify({ ms, seen }));
  check('C4 lần tắt suy nghĩ vòng 2 bị chặn bởi hạn chót (không phải 45 s cứng)', seen.length < 4 || seen[3].timeoutMs <= BUDGET - (seen[3].at - seen[0].at), JSON.stringify(seen));
  check('C4 trả ENGINE_TIMEOUT mềm (không treo, không 504)', out.nextAction?.reasonCode === 'ENGINE_TIMEOUT' || out.status, JSON.stringify([out.status, out.nextAction]));
}
// Nhà cung cấp chết hẳn: R1 100 s + tắt suy nghĩ 45 s → dừng; không gọi lại vô hạn.
{
  const { out, seen, ms } = await chayDongCo([{ ms: 0, ra: 'hang' }]);
  check('C5 MiniMax treo hẳn → ENGINE_TIMEOUT sau ≤ 145 s, đúng 2 lời gọi', out.nextAction?.reasonCode === 'ENGINE_TIMEOUT' && seen.length === 2 && ms <= 145000, JSON.stringify({ ms, seen }));
  check('C5 engine.error giữ lý do thật trong 120 ký tự (không còn bị câu mở đầu NO_PRIVATE_LLM chiếm hết)', /^NO_PRIVATE_LLM: .*timeout sau/.test(out.engine?.error || '') && out.engine.error.length <= 120, out.engine?.error);
}

// ═════════ D. Câu missing theo kênh gọi ═════════
{
  const plan = [{ ms: 0, ra: 'hang' }];
  const mcp = (await chayDongCo(plan, { kenhGoi: 'cong-oz' })).out;
  const congKhai = (await chayDongCo(plan, {})).out;
  const erp = (await chayDongCo(plan, { kenhGoi: 'erp' })).out;
  check('D1 Cổng/MCP (cong-oz): câu trung tính, không nhắc nút "Áp mã"', mcp.missing?.[0] === 'AI bận hoặc quá thời gian — gửi lại sau ít phút.' && !/Áp mã/.test(JSON.stringify(mcp)), JSON.stringify(mcp.missing));
  check('D1 công khai / không kênh: câu trung tính', congKhai.missing?.[0] === 'AI bận hoặc quá thời gian — gửi lại sau ít phút.', JSON.stringify(congKhai.missing));
  check('D1 ERP (có nút "Áp mã"): giữ câu cũ', erp.missing?.[0] === 'Engine bận hoặc quá thời gian — bấm "Áp mã" lại', JSON.stringify(erp.missing));
  check('D1 nextAction.reasonVi vẫn trung tính ở mọi kênh', [mcp, congKhai, erp].every((o) => o.nextAction?.reasonVi === 'AI bận hoặc quá thời gian — gọi lại sau ít phút.'));

  // api/classify.js đẩy tên khoá dịch vụ vào opts.kenhGoi
  const classifyMod = require('../lib/classify.js');
  const seenOpts = [];
  const origClassify = classifyMod.classify;
  classifyMod.classify = async (a, o) => { seenOpts.push(o); return { results: [] }; };
  process.env.HS_SERVICE_TOKENS = 'cong-oz:khoa-cong,erp:khoa-erp';
  const handler = require('../api/classify.js');
  const res = { setHeader() {}, status() { return this; }, json() { return this; }, end() {} };
  const mk = (token) => ({ method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, query: {}, body: { tenHang: 'chân pin bấm dây dẫn' } });
  await handler(mk('khoa-cong'), res);
  await handler(mk('khoa-erp'), res);
  await handler(mk(null), res);
  check('D2 api/classify: kenhGoi = tên khoá dịch vụ (cong-oz / erp / null)', seenOpts.length === 3 && seenOpts[0].kenhGoi === 'cong-oz' && seenOpts[1].kenhGoi === 'erp' && seenOpts[2].kenhGoi === null, JSON.stringify(seenOpts));
  classifyMod.classify = origClassify;
  delete process.env.HS_SERVICE_TOKENS;
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
