// Test thứ tự gọi AI (CEO chốt 04/10): Gemini miễn phí xoay vòng → nhà cung cấp dự phòng
// (MiniMax) → khóa Gemini trả phí chỉ khi premium hoặc không còn đường nào. fetch giả lập,
// không gọi mạng.
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
for (const k of ['GEMINI_API_KEY', 'GEMINI_FREE_KEYS', 'HERMES_API_KEY', 'HERMES_BASE_URL', 'MINIMAX_API_KEY', 'OPENROUTER_API_KEY', 'BYTEPLUS_API_KEY']) delete process.env[k];

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};

// Khóa giả: free-ok trả lời được; free-day hết lượt ngày; free-min hết lượt phút; paid trả lời được.
const calls = [];
globalThis.fetch = async (url) => {
  const u = String(url);
  if (u.includes('generativelanguage.googleapis.com')) {
    const key = new URL(u).searchParams.get('key');
    calls.push(`gemini:${key}`);
    if (key === 'free-day') return new Response('{"error":{"status":"RESOURCE_EXHAUSTED","message":"Quota exceeded for metric generate_content_free_tier_requests, limit: 250, PerDay"}}', { status: 429 });
    if (key === 'free-min') return new Response('{"error":{"status":"RESOURCE_EXHAUSTED","message":"Quota exceeded ... PerMinute"}}', { status: 429 });
    if (key === 'free-500') return new Response('boom', { status: 500 });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: `{"who":"${key}"}` }] } }] }), { status: 200 });
  }
  if (u.includes('api.minimax.io')) {
    calls.push('minimax');
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"who":"minimax"}' } }] }), { status: 200 });
  }
  throw new Error(`unexpected fetch ${u}`);
};

const tier = require('../lib/llm-tier.js');
const { callLLMJson, llmStatus, _internal } = tier;
const reset = () => { calls.length = 0; _internal.cooldown.clear(); };

// 1. Khóa miễn phí đầu dùng được → không đụng MiniMax, không đụng khóa trả phí
process.env.GEMINI_FREE_KEYS = 'free-ok';
process.env.MINIMAX_API_KEY = 'mm';
process.env.GEMINI_API_KEY = 'paid';
reset();
let r = await callLLMJson('sys', 'user');
check('free key dùng được → gemini-free', r.provider === 'gemini-free' && r.json.who === 'free-ok' && calls.join() === 'gemini:free-ok', JSON.stringify({ r, calls }));

// 2. Khóa đầu hết lượt ngày → sang khóa thứ hai; khóa đầu bị cho nghỉ, lượt sau bỏ qua luôn
process.env.GEMINI_FREE_KEYS = 'free-day,free-ok';
reset();
r = await callLLMJson('sys', 'user');
check('hết lượt ngày → xoay sang khóa kế', r.provider === 'gemini-free' && r.json.who === 'free-ok', JSON.stringify(calls));
calls.length = 0;
await callLLMJson('sys', 'user');
check('khóa hết lượt ngày bị bỏ qua ở lượt sau', calls.join() === 'gemini:free-ok', JSON.stringify(calls));
const until = _internal.cooldown.get('free-day');
check('nghỉ tới nửa đêm giờ Thái Bình Dương (≤ 24h)', until > Date.now() + 60 * 1000 && until <= Date.now() + 24 * 3600 * 1000, String(until - Date.now()));

// 3. Mọi khóa miễn phí hết lượt → MiniMax, KHÔNG dùng khóa trả phí
process.env.GEMINI_FREE_KEYS = 'free-day,free-min';
reset();
r = await callLLMJson('sys', 'user');
check('hết khóa miễn phí → MiniMax, không gọi khóa trả phí', r.provider === 'minimax' && !calls.includes('gemini:paid'), JSON.stringify(calls));
check('hết lượt phút → nghỉ ~65 giây', _internal.cooldown.get('free-min') - Date.now() <= 66 * 1000);
check('health: 0 khóa còn lượt, đang dùng dự phòng', llmStatus().geminiFreeAvailable === 0 && llmStatus().ok && /dự phòng/.test(llmStatus().note || ''), JSON.stringify(llmStatus()));

// 4. Lỗi khác (500) không làm khóa bị cho nghỉ
process.env.GEMINI_FREE_KEYS = 'free-500,free-ok';
reset();
r = await callLLMJson('sys', 'user');
check('lỗi 500 → thử khóa kế, khóa lỗi không bị nghỉ', r.json.who === 'free-ok' && !_internal.cooldown.has('free-500'));

// 5. premium: hết khóa miễn phí thì mới dùng khóa trả phí, trước MiniMax
process.env.GEMINI_FREE_KEYS = 'free-day';
reset();
r = await callLLMJson('sys', 'user', { tier: 'premium' });
check('premium → khóa trả phí sau khi hết khóa miễn phí', r.provider === 'gemini' && r.json.who === 'paid', JSON.stringify(calls));

// 6. Không khóa miễn phí, không dự phòng → khóa trả phí (để dịch vụ không chết)
delete process.env.GEMINI_FREE_KEYS;
delete process.env.MINIMAX_API_KEY;
reset();
r = await callLLMJson('sys', 'user');
check('chỉ có khóa trả phí → vẫn chạy', r.provider === 'gemini' && r.json.who === 'paid');
check('health: thứ tự gemini-paid', llmStatus().order.join() === 'gemini-paid', JSON.stringify(llmStatus().order));

// 7. Không khóa miễn phí, có MiniMax → MiniMax, không tốn khóa trả phí
process.env.MINIMAX_API_KEY = 'mm';
reset();
r = await callLLMJson('sys', 'user');
check('không khóa miễn phí + có MiniMax → MiniMax', r.provider === 'minimax' && !calls.includes('gemini:paid'), JSON.stringify(calls));
check('health không in khóa', !JSON.stringify(llmStatus()).includes('paid"') && !JSON.stringify(llmStatus()).includes('mm"'));

// 8. Không gì cả → ném lỗi rõ
for (const k of ['GEMINI_API_KEY', 'MINIMAX_API_KEY']) delete process.env[k];
reset();
let threw = null;
try { await callLLMJson('sys', 'user'); } catch (e) { threw = e; }
check('không provider → lỗi LLM_NOT_CONFIGURED', threw?.code === 'LLM_NOT_CONFIGURED', String(threw));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
