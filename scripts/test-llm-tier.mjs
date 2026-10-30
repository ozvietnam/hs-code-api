// Test thứ tự gọi AI (CEO chốt 04/10): MiniMax gọi thẳng (highspeed, lùi về M2.7 nếu gói
// không cho) → Hermes/OpenRouter → Gemini miễn phí xoay vòng (dự phòng) → khóa Gemini trả phí
// chỉ khi premium hoặc không còn đường nào. fetch giả lập, không gọi mạng.
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
for (const k of ['GEMINI_API_KEY', 'GEMINI_FREE_KEYS', 'HERMES_API_KEY', 'HERMES_BASE_URL', 'MINIMAX_API_KEY', 'MINIMAX_MODEL', 'MINIMAX_ENRICH_MODEL', 'MINIMAX_FALLBACK_MODEL', 'OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY', 'GEMINI_TRA_PHI_CHOT_CUOI', 'PREMIUM_PROVIDER', 'LLM_NO_TRAIN_PROVIDERS', 'HS_LLM_PRIVATE_ALL']) delete process.env[k];

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};

// minimaxMode: ok | no-highspeed (400 cho bản highspeed) | down (500) | quota (402 — hết hạn mức gói)
let minimaxMode = 'ok';
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.includes('generativelanguage.googleapis.com')) {
    const key = new URL(u).searchParams.get('key');
    calls.push(`gemini:${key}`);
    if (key === 'free-day') return new Response('{"error":{"status":"RESOURCE_EXHAUSTED","message":"Quota exceeded for metric generate_content_free_tier_requests, limit: 250, PerDay"}}', { status: 429 });
    if (key === 'free-min') return new Response('{"error":{"status":"RESOURCE_EXHAUSTED","message":"Quota exceeded ... PerMinute"}}', { status: 429 });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: `{"who":"${key}"}` }] } }] }), { status: 200 });
  }
  if (u.includes('api.minimax.io')) {
    const model = JSON.parse(init.body || '{}').model;
    calls.push(`minimax:${model}`);
    if (minimaxMode === 'down') return new Response('upstream error', { status: 500 });
    if (minimaxMode === 'quota') return new Response('{"base_resp":{"status_code":1008,"status_msg":"insufficient balance"}}', { status: 402 });
    if (minimaxMode === 'no-highspeed' && /highspeed/.test(model)) return new Response('{"base_resp":{"status_msg":"your plan does not support this model"}}', { status: 400 });
    return new Response(JSON.stringify({ choices: [{ message: { content: `<think>…</think>{"who":"${model}"}` } }] }), { status: 200 });
  }
  throw new Error(`unexpected fetch ${u}`);
};

const { callLLMJson, llmStatus, _internal } = require('../lib/llm-tier.js');
const reset = () => { calls.length = 0; _internal.cooldown.clear(); };

// 1. MiniMax có → gọi MiniMax highspeed trước, không đụng Gemini
process.env.MINIMAX_API_KEY = 'mm';
process.env.GEMINI_FREE_KEYS = 'free-ok';
process.env.GEMINI_API_KEY = 'paid';
minimaxMode = 'ok';
reset();
let r = await callLLMJson('sys', 'user');
check('MiniMax là nhà cung cấp chính, model highspeed', r.provider === 'minimax' && r.model === 'MiniMax-M2.7-highspeed' && r.json.who === 'MiniMax-M2.7-highspeed', JSON.stringify({ r, calls }));
check('không gọi Gemini khi MiniMax chạy', !calls.some((c) => c.startsWith('gemini')), JSON.stringify(calls));
check('health: thứ tự minimax → gemini-free → gemini-paid (chốt cuối, mặc định bật)', llmStatus().order.join() === 'minimax,gemini-free,gemini-paid', JSON.stringify(llmStatus().order));
process.env.GEMINI_TRA_PHI_CHOT_CUOI = 'off';
check('health: GEMINI_TRA_PHI_CHOT_CUOI=off → thứ tự như cũ', llmStatus().order.join() === 'minimax,gemini-free', JSON.stringify(llmStatus().order));
delete process.env.GEMINI_TRA_PHI_CHOT_CUOI;

// 2. Gói không cho bản highspeed (400) → lùi về MiniMax-M2.7 trong cùng nhà cung cấp
minimaxMode = 'no-highspeed';
reset();
r = await callLLMJson('sys', 'user');
check('highspeed bị từ chối → MiniMax-M2.7', r.provider === 'minimax' && r.model === 'MiniMax-M2.7', JSON.stringify(calls));
process.env.MINIMAX_MODEL = 'MiniMax-M2.5-highspeed';
reset();
r = await callLLMJson('sys', 'user');
check('MINIMAX_MODEL đổi được model', calls[0] === 'minimax:MiniMax-M2.5-highspeed', JSON.stringify(calls));
delete process.env.MINIMAX_MODEL;

// 3. MiniMax sập (500) → không lùi model, sang Gemini miễn phí
minimaxMode = 'down';
reset();
r = await callLLMJson('sys', 'user');
check('MiniMax 500 → không thử model khác', calls.filter((c) => c.startsWith('minimax')).length === 1, JSON.stringify(calls));
check('MiniMax sập → Gemini miễn phí dự phòng', r.provider === 'gemini-free' && r.json.who === 'free-ok', JSON.stringify(calls));

// 4. Khóa miễn phí hết lượt ngày → xoay khóa, khóa đó nghỉ tới nửa đêm giờ Thái Bình Dương
process.env.GEMINI_FREE_KEYS = 'free-day,free-ok';
reset();
r = await callLLMJson('sys', 'user');
check('hết lượt ngày → xoay sang khóa kế', r.json.who === 'free-ok', JSON.stringify(calls));
const until = _internal.cooldown.get('free-day');
check('nghỉ ≤ 24h, > 1 phút', until > Date.now() + 60 * 1000 && until <= Date.now() + 24 * 3600 * 1000, String(until - Date.now()));

// 5. MiniMax sập + mọi khóa miễn phí hết lượt + GEMINI_TRA_PHI_CHOT_CUOI=off → lỗi, KHÔNG đốt khóa trả phí (hành vi cũ)
process.env.GEMINI_FREE_KEYS = 'free-day,free-min';
process.env.GEMINI_TRA_PHI_CHOT_CUOI = 'off';
reset();
let threw = null;
try { await callLLMJson('sys', 'user'); } catch (e) { threw = e; }
check('off: hết đường → ném lỗi, không gọi khóa trả phí', threw && !calls.includes('gemini:paid'), JSON.stringify(calls));
delete process.env.GEMINI_TRA_PHI_CHOT_CUOI;

// 5b. GEMINI_TRA_PHI_CHOT_CUOI mặc định bật (CEO chốt 30/10/2026, #578): cùng tình huống → khoá trả phí là chốt cuối,
//     chỉ sau khi MiniMax + mọi khoá miễn phí đã thử.
reset();
_internal.cooldown.clear();
r = await callLLMJson('sys', 'user');
check('mặc định: chuỗi chuẩn + miễn phí lỗi hết → Gemini trả phí chốt cuối', r.provider === 'gemini' && r.json.who === 'paid', JSON.stringify(calls));
check('mặc định: khoá trả phí gọi SAU CÙNG (MiniMax đầu, miễn phí giữa)', calls[0]?.startsWith('minimax') && calls.at(-1) === 'gemini:paid' && calls.includes('gemini:free-day') && calls.includes('gemini:free-min'), JSON.stringify(calls));

// 5c. Tình huống prod 30/10: MiniMax 402 (hết hạn mức), không khoá miễn phí, có khoá trả phí.
delete process.env.GEMINI_FREE_KEYS;
minimaxMode = 'quota';
reset();
{
  const { withUsage } = require('../lib/usage-context.js');
  const { result, usage } = await withUsage(() => callLLMJson('sys', 'user'));
  check('MiniMax 402 → lượt công khai trả provider gemini', result.provider === 'gemini' && result.json.who === 'paid', JSON.stringify({ result, calls }));
  check('MiniMax 402 → MiniMax vẫn gọi trước', calls[0]?.startsWith('minimax') && calls.at(-1) === 'gemini:paid', JSON.stringify(calls));
  check('MiniMax 402 → usage ghi provider gemini (bộ đếm chi phí công khai đếm được)', usage.some((u) => u.provider === 'gemini'), JSON.stringify(usage));
}
process.env.GEMINI_TRA_PHI_CHOT_CUOI = 'off';
reset();
threw = null;
try { await callLLMJson('sys', 'user'); } catch (e) { threw = e; }
check('off + MiniMax 402 → vẫn lỗi như cũ, không gọi khoá trả phí', threw && !calls.includes('gemini:paid'), JSON.stringify(calls));

// 5d. Đường dữ liệu khách KHÔNG đổi theo công tắc: danh sách trắng mặc định (minimax,gemini) → khoá trả phí như cũ,
//     cả khi off; danh sách trắng không có gemini → NO_PRIVATE_LLM, không gọi khoá trả phí, cả khi on.
for (const sw of ['off', 'on']) {
  process.env.GEMINI_TRA_PHI_CHOT_CUOI = sw;
  reset();
  r = await callLLMJson('sys', 'user', { containsCustomerData: true });
  check(`riêng tư (${sw}) + MiniMax 402 → Gemini trả phí như hôm nay`, r.provider === 'gemini' && r.json.who === 'paid', JSON.stringify(calls));
  process.env.LLM_NO_TRAIN_PROVIDERS = 'minimax';
  reset();
  threw = null;
  try { await callLLMJson('sys', 'user', { containsCustomerData: true }); } catch (e) { threw = e; }
  check(`riêng tư (${sw}) + gemini ngoài danh sách trắng → NO_PRIVATE_LLM, không gọi khoá trả phí`, threw?.code === 'NO_PRIVATE_LLM' && !calls.includes('gemini:paid'), JSON.stringify({ calls, code: threw?.code }));
  delete process.env.LLM_NO_TRAIN_PROVIDERS;
}
delete process.env.GEMINI_TRA_PHI_CHOT_CUOI;
process.env.GEMINI_FREE_KEYS = 'free-day,free-min';

// 6. premium → khóa trả phí trước
minimaxMode = 'ok';
reset();
r = await callLLMJson('sys', 'user', { tier: 'premium' });
check('premium → Gemini trả phí trước', r.provider === 'gemini' && calls[0] === 'gemini:paid', JSON.stringify(calls));

// 6b. PREMIUM_PROVIDER=minimax (CEO chốt 14/10/2026, hạ chi phí Gemini trả phí):
// premium đi chuỗi chuẩn trước — MiniMax làm việc, khoá trả phí chỉ còn là chốt cuối.
process.env.PREMIUM_PROVIDER = 'minimax';
reset();
r = await callLLMJson('sys', 'user', { tier: 'premium' });
check('premium + PREMIUM_PROVIDER=minimax → MiniMax trước, không đụng Gemini', r.provider === 'minimax' && !calls.some((c) => c.startsWith('gemini')), JSON.stringify(calls));

// Chuỗi chuẩn chết hẳn + không khoá miễn phí → khoá trả phí là chốt cuối (dịch vụ không chết).
delete process.env.GEMINI_FREE_KEYS;
minimaxMode = 'down';
reset();
r = await callLLMJson('sys', 'user', { tier: 'premium' });
check('premium + chuỗi chết → lùi về Gemini trả phí làm chốt cuối', calls[0]?.startsWith('minimax') && r.provider === 'gemini' && r.json.who === 'paid', JSON.stringify(calls));

// Dữ liệu khách: chốt cuối vẫn là khoá trả phí (danh sách trắng nhận dữ liệu khách).
reset();
r = await callLLMJson('sys', 'user', { tier: 'premium', containsCustomerData: true });
check('premium + dữ liệu khách + chuỗi chết → Gemini trả phí chốt cuối', r.provider === 'gemini' && r.json.who === 'paid', JSON.stringify(calls));

// Bỏ đặt → hành vi cũ nguyên vẹn (Gemini trả phí trước).
delete process.env.PREMIUM_PROVIDER;
process.env.GEMINI_FREE_KEYS = 'free-day,free-min';
minimaxMode = 'ok';
reset();
r = await callLLMJson('sys', 'user', { tier: 'premium' });
check('bỏ PREMIUM_PROVIDER → premium Gemini trả phí trước như cũ', r.provider === 'gemini' && calls[0] === 'gemini:paid', JSON.stringify(calls));


// 7. Không MiniMax, không khóa miễn phí, chỉ khóa trả phí → vẫn chạy
delete process.env.MINIMAX_API_KEY;
delete process.env.GEMINI_FREE_KEYS;
reset();
r = await callLLMJson('sys', 'user');
check('chỉ có khóa trả phí → vẫn chạy', r.provider === 'gemini' && r.json.who === 'paid');
check('health: báo thiếu MINIMAX_API_KEY', /MINIMAX_API_KEY/.test(llmStatus().note || ''), JSON.stringify(llmStatus()));
check('health không in khóa', !JSON.stringify(llmStatus()).includes('"paid"'));

// 8. Không gì cả → lỗi rõ
delete process.env.GEMINI_API_KEY;
reset();
threw = null;
try { await callLLMJson('sys', 'user'); } catch (e) { threw = e; }
check('không provider → LLM_NOT_CONFIGURED', threw?.code === 'LLM_NOT_CONFIGURED', String(threw));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
