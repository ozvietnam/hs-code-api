#!/usr/bin/env node
/**
 * OZV-726 (PR A — CEO 13/11/2026): cụm khoá Gemini xoay vòng cho ĐƯỜNG PHÂN LOẠI CỦA KHÁCH.
 *   - HS_GEMINI_FREE_CHO_KHACH (mặc định TẮT = hành vi cũ nguyên vẹn): bật thì lượt riêng tư được dùng
 *     cụm khoá Gemini miễn phí làm LƯỚI CUỐI, sau khoá trả phí (bước 0) và chuỗi chính (bước 1).
 *   - Khoá treo (timeout) nghỉ GEMINI_FREE_NGHI_KHI_TREO_MS (mặc định 900000 = 15 phút) rồi xoay khoá kế.
 *   - attempted đếm cả tầng cụm khoá; NO_PRIVATE_LLM nói rõ "cụm khoá: N khoá, 0 còn lượt, hồi lúc …".
 *   - /api/health (llmStatus) báo cuKhoaGemini: choKhach / tongKhoa / conDungDuoc / hoiSomNhat, không in khoá.
 * fetch giả lập, không gọi mạng (hạn mức thật đang cạn). Không ghi data/.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
for (const k of ['GEMINI_API_KEY', 'GEMINI_FREE_KEYS', 'HERMES_API_KEY', 'HERMES_BASE_URL', 'MINIMAX_API_KEY',
  'MINIMAX_MODEL', 'MINIMAX_ENRICH_MODEL', 'MINIMAX_FALLBACK_MODEL', 'OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY',
  'GEMINI_TRA_PHI_CHOT_CUOI', 'PREMIUM_PROVIDER', 'LLM_NO_TRAIN_PROVIDERS', 'HS_LLM_PRIVATE_ALL',
  'HS_GEMINI_FREE_CHO_KHACH', 'GEMINI_FREE_NGHI_KHI_TREO_MS']) delete process.env[k];

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};

// minimaxMode: ok | down (500) | rate (429 — hết hạn mức tuần)
let minimaxMode = 'down';
const calls = [];
globalThis.fetch = async (url) => {
  const u = String(url);
  if (u.includes('generativelanguage.googleapis.com')) {
    const key = new URL(u).searchParams.get('key');
    calls.push(`gemini:${key}`);
    if (key === 'paid') return new Response('{"error":{"code":402,"message":"Insufficient funds"}}', { status: 402 });
    if (key === 'free-day') return new Response('{"error":{"status":"RESOURCE_EXHAUSTED","message":"Quota exceeded for metric generate_content_free_tier_requests, limit: 20, PerDay"}}', { status: 429 });
    if (key === 'free-min') return new Response('{"error":{"status":"RESOURCE_EXHAUSTED","message":"Quota exceeded ... PerMinute"}}', { status: 429 });
    if (key === 'free-treo') return new Promise(() => {}); // khoá treo: không bao giờ trả lời
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: `{"who":"${key}"}` }] } }] }), { status: 200 });
  }
  if (u.includes('api.minimax.io')) {
    calls.push('minimax');
    if (minimaxMode === 'down') return new Response('upstream error', { status: 500 });
    if (minimaxMode === 'rate') return new Response('{"base_resp":{"status_code":1027,"status_msg":"rate limit (weekly quota) exceeded"}}', { status: 429 });
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"who":"minimax"}' } }] }), { status: 200 });
  }
  throw new Error(`unexpected fetch ${u}`);
};

const { callLLMJson, llmStatus, _internal } = require('../lib/llm-tier.js');
const { privateAllowed, geminiFreeChoKhach } = require('../lib/llm-privacy.js');
const reset = () => { calls.length = 0; _internal.cooldown.clear(); _internal.ngatMach.clear(); };

// ── đơn vị: công tắc ──
check('mặc định TẮT: geminiFreeChoKhach()=false, privateAllowed(gemini-free)=false', geminiFreeChoKhach() === false && privateAllowed('gemini-free', 'gemini-2.5-flash') === false);
process.env.HS_GEMINI_FREE_CHO_KHACH = 'on';
check('công tắc BẬT: privateAllowed(gemini-free)=true', geminiFreeChoKhach() === true && privateAllowed('gemini-free', 'gemini-2.5-flash') === true);
process.env.LLM_NO_TRAIN_PROVIDERS = 'minimax';
check('bỏ "gemini" khỏi danh sách trắng → chặn hẳn cả cụm khoá miễn phí', privateAllowed('gemini-free', 'gemini-2.5-flash') === false);
delete process.env.LLM_NO_TRAIN_PROVIDERS;

// ── (a) riêng tư + công tắc TẮT ⇒ không đụng cụm khoá, lỗi như cũ ──
delete process.env.HS_GEMINI_FREE_CHO_KHACH;
process.env.MINIMAX_API_KEY = 'mm';
process.env.GEMINI_FREE_KEYS = 'free-ok';
reset();
let threw = null;
try { await callLLMJson('sys', 'user', { containsCustomerData: true }); } catch (e) { threw = e; }
check('(a) công tắc tắt: không gọi khoá miễn phí nào', !calls.some((c) => c.startsWith('gemini:free')), JSON.stringify(calls));
check('(a) công tắc tắt: NO_PRIVATE_LLM như cũ, "1 nhà cung cấp hợp lệ đã thử"',
  threw?.code === 'NO_PRIVATE_LLM' && /1 nhà cung cấp hợp lệ đã thử/.test(threw.message), String(threw));

// ── (b) riêng tư + công tắc BẬT + khoá trả phí 402 (bước 0, premium) + MiniMax 429 ⇒ cụm khoá gánh ──
process.env.HS_GEMINI_FREE_CHO_KHACH = 'on';
process.env.GEMINI_API_KEY = 'paid';
minimaxMode = 'rate';
reset();
let r = await callLLMJson('sys', 'user', { tier: 'premium', containsCustomerData: true });
check('(b) cụm khoá được gọi, trả kết quả cho lượt khách', r.provider === 'gemini-free' && r.json.who === 'free-ok', JSON.stringify({ r, calls }));
check('(b) thứ tự giữ nguyên: khoá trả phí (402) → MiniMax (429) → cụm khoá',
  calls.join() === 'gemini:paid,minimax,gemini:free-ok', JSON.stringify(calls));
// ── (b-bis) VÁ THỨ TỰ (GĐ 13/11/2026): khoá trả phí CÒN SỐNG (200) phải chặn cụm miễn phí ──
// Trước bản vá: lượt standard (mặc định) và premium+PREMIUM_PROVIDER=minimax đều cho ra
// [minimax → gemini:free-ok] và khách được trả lời bằng tầng miễn phí TRONG KHI khoá trả phí vẫn sống.
process.env.GEMINI_API_KEY = 'paid-song'; // fetch giả lập: khoá lạ ⇒ 200
minimaxMode = 'down';
reset();
r = await callLLMJson('sys', 'user', { containsCustomerData: true }); // KHÔNG truyền tier ⇒ standard
check('(b-bis) standard + khoá trả phí sống: khoá trả phí trả lời, cụm miễn phí KHÔNG bị gọi',
  r.provider === 'gemini' && !calls.some((c) => c.startsWith('gemini:free')), JSON.stringify({ provider: r.provider, calls }));
check('(b-bis) standard: thứ tự = MiniMax → khoá trả phí', calls.join() === 'minimax,gemini:paid-song', JSON.stringify(calls));

process.env.PREMIUM_PROVIDER = 'minimax'; // cấu hình prod (CEO 14/10/2026)
reset();
r = await callLLMJson('sys', 'user', { tier: 'premium', containsCustomerData: true });
check('(b-bis) premium + PREMIUM_PROVIDER=minimax: khoá trả phí trả lời, cụm miễn phí KHÔNG bị gọi',
  r.provider === 'gemini' && !calls.some((c) => c.startsWith('gemini:free')), JSON.stringify({ provider: r.provider, calls }));
check('(b-bis) premium+minimax: thứ tự = MiniMax → khoá trả phí', calls.join() === 'minimax,gemini:paid-song', JSON.stringify(calls));

// khoá trả phí LỖI ⇒ cụm miễn phí mới là lưới cuối, và khoá trả phí chỉ bị gọi ĐÚNG MỘT lần mỗi lượt
process.env.GEMINI_API_KEY = 'paid';
reset();
r = await callLLMJson('sys', 'user', { containsCustomerData: true });
check('(b-bis) khoá trả phí 402 → cụm miễn phí gánh (lưới cuối đúng vai)', r.provider === 'gemini-free' && r.json.who === 'free-ok', JSON.stringify({ provider: r.provider, calls }));
check('(b-bis) khoá trả phí chỉ bị gọi 1 lần/lượt (không gọi lại ở bước 3)',
  calls.filter((c) => c === 'gemini:paid').length === 1 && calls.join() === 'minimax,gemini:paid,gemini:free-ok', JSON.stringify(calls));
delete process.env.PREMIUM_PROVIDER;

// lượt CÔNG KHAI (không phải dữ liệu khách) giữ nguyên hành vi cũ: cụm miễn phí trước khoá trả phí
reset();
r = await callLLMJson('sys', 'user', {});
check('(b-bis) lượt công khai KHÔNG đổi: cụm miễn phí vẫn đứng trước khoá trả phí',
  r.provider === 'gemini-free' && calls.join() === 'minimax,gemini:free-ok', JSON.stringify({ provider: r.provider, calls }));

delete process.env.GEMINI_API_KEY;
minimaxMode = 'rate';

// ── (c) khoá 1 hết lượt NGÀY ⇒ nghỉ tới nửa đêm Thái Bình Dương, khoá 2 chạy trong CÙNG lượt ──
process.env.GEMINI_FREE_KEYS = 'free-day,free-ok';
minimaxMode = 'down';
reset();
r = await callLLMJson('sys', 'user', { containsCustomerData: true });
check('(c) xoay khoá trong cùng lượt: free-day 429 → free-ok trả lời', r.provider === 'gemini-free' && r.json.who === 'free-ok'
  && calls.includes('gemini:free-day') && calls.includes('gemini:free-ok'), JSON.stringify({ r, calls }));
const until = _internal.cooldown.get('free-day');
check('(c) khoá hết lượt ngày nghỉ tới nửa đêm Thái Bình Dương (>1 phút, ≤24h)', until > Date.now() + 60 * 1000 && until <= Date.now() + 24 * 3600 * 1000, String(until - Date.now()));

// (c-bis) CẢ CỤM hết lượt ⇒ NO_PRIVATE_LLM nói rõ tình trạng cụm khoá, attempted đếm đủ
process.env.GEMINI_FREE_KEYS = 'free-day,free-min';
reset();
threw = null;
try { await callLLMJson('sys', 'user', { containsCustomerData: true }); } catch (e) { threw = e; }
check('(c-bis) cả cụm hết lượt → NO_PRIVATE_LLM nói "cụm khoá gemini-free: 2 khoá, 0 còn lượt, hồi lúc …"',
  threw?.code === 'NO_PRIVATE_LLM' && /cụm khoá gemini-free: 2 khoá, 0 còn lượt, hồi lúc \d{4}-\d{2}-\d{2}T/.test(threw.message), String(threw));
check('(c-bis) attempted đếm đủ: 3 nhà cung cấp hợp lệ đã thử (MiniMax + 2 khoá)', /3 nhà cung cấp hợp lệ đã thử/.test(threw?.message || ''), String(threw));

// ── (d) khoá TREO ⇒ nghỉ 15 phút (GEMINI_FREE_NGHI_KHI_TREO_MS), xoay khoá kế ──
process.env.GEMINI_FREE_KEYS = 'free-treo,free-ok';
reset();
const t0 = Date.now();
r = await callLLMJson('sys', 'user', { containsCustomerData: true, geminiTimeoutMs: 40 });
check('(d) khoá treo → xoay sang khoá kế trong cùng lượt', r.json.who === 'free-ok' && calls.includes('gemini:free-treo') && calls.includes('gemini:free-ok'), JSON.stringify({ r, calls }));
const treoUntil = _internal.cooldown.get('free-treo');
check('(d) khoá treo nghỉ ~15 phút (mặc định 900000)', treoUntil > t0 + 14 * 60 * 1000 && treoUntil <= Date.now() + 16 * 60 * 1000, String(treoUntil - t0));
process.env.GEMINI_FREE_NGHI_KHI_TREO_MS = '60000';
_internal.cooldown.clear();
reset();
r = await callLLMJson('sys', 'user', { containsCustomerData: true, geminiTimeoutMs: 40 });
const treoUntil2 = _internal.cooldown.get('free-treo');
check('(d) GEMINI_FREE_NGHI_KHI_TREO_MS=60000 được tôn trọng', treoUntil2 > t0 && treoUntil2 <= Date.now() + 61 * 1000, String(treoUntil2 - t0));
delete process.env.GEMINI_FREE_NGHI_KHI_TREO_MS;

// khoá treo đang nghỉ → lượt sau KHÔNG đụng lại khoá đó (giữ nguyên cooldown, chỉ xoá log calls)
calls.length = 0;
r = await callLLMJson('sys', 'user', { containsCustomerData: true, geminiTimeoutMs: 40 });
check('(d) lượt sau bỏ qua khoá đang nghỉ treo', !calls.includes('gemini:free-treo') && r.json.who === 'free-ok', JSON.stringify(calls));

// ── (e) /api/health (llmStatus) nói thật về cụm khoá ──
// dựng trạng thái tất định: free-treo nghỉ treo (15 phút), free-day nghỉ hạn mức ngày (1 giờ), free-ok dùng được
process.env.GEMINI_FREE_KEYS = 'free-treo,free-day,free-ok';
_internal.cooldown.clear();
_internal.cooldown.set('free-treo', Date.now() + 900000);
_internal.cooldown.set('free-day', Date.now() + 3600 * 1000);
const s = llmStatus();
check('(e) health: cuKhoaGemini đếm đúng (3 khoá, 1 còn dùng — free-treo nghỉ treo, free-day nghỉ hạn mức)',
  s.cuKhoaGemini.tongKhoa === 3 && s.cuKhoaGemini.conDungDuoc === 1, JSON.stringify(s.cuKhoaGemini));
check('(e) health: choKhach=true khi công tắc bật, hoiSomNhat là ISO', s.cuKhoaGemini.choKhach === true && typeof s.cuKhoaGemini.hoiSomNhat === 'string' && /\d{4}-\d{2}-\d{2}T/.test(s.cuKhoaGemini.hoiSomNhat), JSON.stringify(s.cuKhoaGemini));
check('(e) health: gemini-free nằm trong private.providers khi bật', s.private.providers.includes('gemini-free'), JSON.stringify(s.private.providers));
check('(e) health KHÔNG in khoá', !JSON.stringify(s).includes('free-ok') && !JSON.stringify(s).includes('free-treo') && !JSON.stringify(s).includes('paid'));
delete process.env.HS_GEMINI_FREE_CHO_KHACH;
const sOff = llmStatus();
check('(e) health: choKhach=false khi công tắc tắt, gemini-free rời private.providers',
  sOff.cuKhoaGemini.choKhach === false && !sOff.private.providers.includes('gemini-free'), JSON.stringify({ cuKhoa: sOff.cuKhoaGemini, private: sOff.private.providers }));
check('(e) health: mọi khoá dùng được → hoiSomNhat=null', _internal.cooldown.clear() === undefined && llmStatus().cuKhoaGemini.hoiSomNhat === null, JSON.stringify(llmStatus().cuKhoaGemini));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
