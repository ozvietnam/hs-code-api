#!/usr/bin/env node
/**
 * #237 J1 — dữ liệu khách KHÔNG BAO GIỜ đi qua tầng LLM miễn phí.
 *   - withPrivateData() / opts.containsCustomerData / HS_LLM_PRIVATE_ALL → chỉ nhà cung cấp trong LLM_NO_TRAIN_PROVIDERS
 *     (mặc định minimax + khoá Gemini TRẢ PHÍ), không Gemini miễn phí, không mẫu ":free", không Hermes.
 *   - hết nhà cung cấp hợp lệ → lỗi code NO_PRIVATE_LLM (502), không rơi xuống tầng miễn phí.
 *   - cờ tắt → hành vi cũ (scripts/test-llm-tier.mjs vẫn là chuẩn cho thứ tự thường).
 *   - handler describe/classify với khoá dịch vụ → bọc riêng tư; /api/health báo nhà cung cấp nhận dữ liệu khách.
 * fetch giả lập, không mạng, không ghi data/.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
for (const k of ['GEMINI_API_KEY', 'GEMINI_FREE_KEYS', 'HERMES_API_KEY', 'HERMES_BASE_URL', 'MINIMAX_API_KEY', 'MINIMAX_MODEL',
  'MINIMAX_ENRICH_MODEL', 'MINIMAX_FALLBACK_MODEL', 'OPENROUTER_API_KEY', 'OPENROUTER_ENRICH_MODEL', 'BYTEPLUS_API_KEY',
  'LLM_NO_TRAIN_PROVIDERS', 'HS_LLM_PRIVATE_ALL', 'HS_PUBLIC_LLM', 'HS_MATCH_PUBLIC']) delete process.env[k];
process.env.HS_API_TOKEN = 'legacy-token';
process.env.HS_SERVICE_TOKENS = 'cong-oz:khoa-cong';
process.env.HS_ACCESS_LOG = '0';
process.env.HS_CLASSIFY_CROSSCHECK = '0';
console.error = () => {};
console.warn = () => {};

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};

let minimaxMode = 'ok';
const calls = [];
const okJson = (who) => new Response(JSON.stringify({ choices: [{ message: { content: `{"who":"${who}","headings":["8509"],"results":[],"declaration":{"tenHang":"x"}}` } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }), { status: 200 });
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const body = JSON.parse(init.body || '{}');
  if (u.includes('generativelanguage.googleapis.com')) {
    const key = new URL(u).searchParams.get('key');
    calls.push(`gemini:${key}`);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: `{"who":"gemini-${key}"}` }] } }] }), { status: 200 });
  }
  if (u.includes('api.minimax.io')) {
    calls.push(`minimax:${body.model}`);
    if (minimaxMode === 'down') return new Response('upstream error', { status: 500 });
    return okJson(body.model);
  }
  if (u.includes('hermes.test')) { calls.push(`hermes:${body.model}`); return okJson('hermes'); }
  if (u.includes('openrouter.ai')) { calls.push(`openrouter:${body.model}`); return okJson(body.model); }
  throw new Error(`unexpected fetch ${u}`);
};

const { callLLMJson, llmStatus } = require('../lib/llm-tier.js');
const { withPrivateData, isPrivate, privateAllowed, noTrainProviders } = require('../lib/llm-privacy.js');
const reset = () => { calls.length = 0; };
const noFree = () => !calls.some((c) => c.startsWith('gemini:free') || c.startsWith('hermes') || /:free$/.test(c));

// ── đơn vị: danh sách trắng ──
check('mặc định danh sách trắng = minimax,gemini', noTrainProviders().join() === 'minimax,gemini');
check('gemini-free luôn bị chặn dù "gemini" trong danh sách trắng', privateAllowed('gemini-free', 'x') === false && privateAllowed('gemini', 'x') === true);
check('mẫu ":free" bị chặn kể cả nhà cung cấp hợp lệ', privateAllowed('minimax', 'abc:free') === false);
check('hermes mặc định bị chặn', privateAllowed('hermes', 'reasoning') === false);
process.env.LLM_NO_TRAIN_PROVIDERS = 'minimax, hermes';
check('LLM_NO_TRAIN_PROVIDERS mở Hermes khi CEO chốt', privateAllowed('hermes', 'reasoning') === true && privateAllowed('gemini', 'x') === false);
delete process.env.LLM_NO_TRAIN_PROVIDERS;

// ── 1. Riêng tư + MiniMax chạy → MiniMax, không đụng tầng miễn phí ──
process.env.MINIMAX_API_KEY = 'mm';
process.env.GEMINI_FREE_KEYS = 'free-ok';
process.env.HERMES_API_KEY = 'hk';
process.env.HERMES_BASE_URL = 'https://hermes.test/v1';
process.env.OPENROUTER_API_KEY = 'or';
minimaxMode = 'ok';
reset();
let r = await callLLMJson('sys', 'user', { containsCustomerData: true });
check('riêng tư: MiniMax trả lời', r.provider === 'minimax', JSON.stringify({ r, calls }));
check('riêng tư: không gọi tầng miễn phí', noFree(), JSON.stringify(calls));

// ── 2. Riêng tư + MiniMax sập + có free keys/Hermes/OpenRouter :free, không khoá trả phí → NO_PRIVATE_LLM ──
minimaxMode = 'down';
reset();
let threw = null;
try { await callLLMJson('sys', 'user', { containsCustomerData: true }); } catch (e) { threw = e; }
check('riêng tư, MiniMax sập → NO_PRIVATE_LLM (502)', threw?.code === 'NO_PRIVATE_LLM' && threw?.status === 502, String(threw));
check('riêng tư, MiniMax sập → KHÔNG rơi xuống Gemini miễn phí / Hermes / :free', noFree(), JSON.stringify(calls));
check('riêng tư: thông điệp giữ lỗi gốc để phân loại gọi lại (500)', /500/.test(String(threw?.message)), String(threw?.message));
check('riêng tư: chỉ MiniMax được gọi', calls.every((c) => c.startsWith('minimax')), JSON.stringify(calls));

// ── 3. Cùng cấu hình, KHÔNG riêng tư → hành vi cũ (Gemini miễn phí dự phòng) ──
reset();
r = await callLLMJson('sys', 'user');
check('không riêng tư: vẫn rơi về Hermes/Gemini miễn phí như cũ', ['hermes', 'gemini-free'].includes(r.provider), JSON.stringify({ r, calls }));

// ── 4. Riêng tư + MiniMax sập + khoá Gemini TRẢ PHÍ → dùng khoá trả phí ──
process.env.GEMINI_API_KEY = 'paid';
reset();
r = await callLLMJson('sys', 'user', { containsCustomerData: true });
check('riêng tư: khoá Gemini trả phí là dự phòng hợp lệ', r.provider === 'gemini' && calls.includes('gemini:paid'), JSON.stringify({ r, calls }));
check('riêng tư: vẫn không gọi khoá miễn phí', !calls.includes('gemini:free-ok'), JSON.stringify(calls));
delete process.env.GEMINI_API_KEY;

// ── 5. Chỉ có khoá miễn phí (không MiniMax) + riêng tư → NO_PRIVATE_LLM, không gọi gì ──
delete process.env.MINIMAX_API_KEY;
delete process.env.HERMES_API_KEY;
delete process.env.OPENROUTER_API_KEY;
reset();
threw = null;
try { await callLLMJson('sys', 'user', { containsCustomerData: true }); } catch (e) { threw = e; }
check('chỉ khoá miễn phí + riêng tư → NO_PRIVATE_LLM, 0 lượt gọi', threw?.code === 'NO_PRIVATE_LLM' && calls.length === 0, JSON.stringify({ threw: String(threw), calls }));
check('health: private.ok=false + note', llmStatus().private.ok === false && /NO_PRIVATE_LLM/.test(llmStatus().private.note || ''), JSON.stringify(llmStatus().private));

// ── 6. OpenRouter trong danh sách trắng: mẫu trả phí được gọi, mẫu ":free" vẫn bị chặn ──
process.env.OPENROUTER_API_KEY = 'or';
process.env.LLM_NO_TRAIN_PROVIDERS = 'openrouter';
process.env.OPENROUTER_ENRICH_MODEL = 'openai/gpt-4o-mini';
reset();
r = await callLLMJson('sys', 'user', { containsCustomerData: true });
check('danh sách trắng có openrouter + mẫu trả phí → gọi được', r.provider === 'openrouter' && calls[0] === 'openrouter:openai/gpt-4o-mini', JSON.stringify(calls));
check('health: private.providers = [openrouter]', llmStatus().private.providers.join() === 'openrouter', JSON.stringify(llmStatus().private));
process.env.OPENROUTER_ENRICH_MODEL = 'google/gemma-3-27b-it:free';
reset();
threw = null;
try { await callLLMJson('sys', 'user', { containsCustomerData: true }); } catch (e) { threw = e; }
check('danh sách trắng có openrouter nhưng mẫu ":free" → vẫn chặn', threw?.code === 'NO_PRIVATE_LLM' && calls.length === 0, JSON.stringify({ threw: String(threw), calls }));
check('health: mẫu ":free" → không tính là nhận dữ liệu khách', llmStatus().private.providers.length === 0, JSON.stringify(llmStatus().private));
delete process.env.LLM_NO_TRAIN_PROVIDERS;
delete process.env.OPENROUTER_ENRICH_MODEL;
delete process.env.OPENROUTER_API_KEY;

// ── 7. Ngữ cảnh withPrivateData lan qua await; ngoài ngữ cảnh không riêng tư; HS_LLM_PRIVATE_ALL ──
process.env.MINIMAX_API_KEY = 'mm';
minimaxMode = 'down';
reset();
const inner = await withPrivateData(async () => { await new Promise((res) => setTimeout(res, 5)); return isPrivate(); });
check('withPrivateData: cờ lan qua await', inner === true && isPrivate() === false);
threw = null;
try { await withPrivateData(() => callLLMJson('sys', 'user')); } catch (e) { threw = e; }
check('withPrivateData: callLLMJson bên trong không rơi về Gemini miễn phí', threw?.code === 'NO_PRIVATE_LLM' && noFree(), JSON.stringify({ threw: String(threw), calls }));
reset();
r = await callLLMJson('sys', 'user');
check('ngoài withPrivateData: hành vi cũ', r.provider === 'gemini-free', JSON.stringify(calls));
process.env.HS_LLM_PRIVATE_ALL = 'true';
reset();
threw = null;
try { await callLLMJson('sys', 'user'); } catch (e) { threw = e; }
check('HS_LLM_PRIVATE_ALL=true: mọi lượt riêng tư', threw?.code === 'NO_PRIVATE_LLM' && noFree(), JSON.stringify({ threw: String(threw), calls }));
check('health: private.all=true', llmStatus().private.all === true);
delete process.env.HS_LLM_PRIVATE_ALL;
check('cờ tường minh false thắng ngữ cảnh', (await withPrivateData(() => callLLMJson('sys', 'user', { containsCustomerData: false }))).provider === 'gemini-free');

// ── 8. Handler: khoá dịch vụ → riêng tư; HS_API_TOKEN / công khai → như cũ ──
const mkRes = () => ({ _s: 0, _j: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } });
const mkReq = (token, body) => ({ method: 'POST', url: '/x', query: {}, headers: token ? { authorization: `Bearer ${token}` } : {}, body });
const describe = require('../api/describe.js');
const { taxData } = require('../lib/data');
const HS = Object.keys(taxData)[0];
{
  minimaxMode = 'down';
  reset();
  const res = mkRes();
  await describe(mkReq('khoa-cong', { hsCode: HS, productName: 'hàng thử của khách', material: 'thép' }), res);
  check('describe + khoá dịch vụ: 200 degraded, llmError NO_PRIVATE_LLM', res._s === 200 && res._j?.degraded === true && res._j?.llmError?.code === 'NO_PRIVATE_LLM', JSON.stringify({ s: res._s, d: res._j?.degraded, e: res._j?.llmError }));
  check('describe + khoá dịch vụ: không gọi Gemini miễn phí', noFree(), JSON.stringify(calls));
  check('describe + khoá dịch vụ: vẫn có usage (MiniMax đã bị tính)', Array.isArray(res._j?.usage), JSON.stringify(res._j?.usage));
  reset();
  const res2 = mkRes();
  await describe(mkReq('legacy-token', { hsCode: HS, productName: 'hàng thử nội bộ', material: 'thép' }), res2);
  check('describe + HS_API_TOKEN: hành vi cũ (Gemini miễn phí dự phòng)', res2._s === 200 && !res2._j?.degraded && calls.includes('gemini:free-ok'), JSON.stringify({ s: res2._s, d: res2._j?.degraded, calls }));
}
{
  const classify = require('../api/classify.js');
  minimaxMode = 'down';
  reset();
  const res = mkRes();
  await classify(mkReq('khoa-cong', { tenHang: 'máy xay sinh tố của khách', chatLieu: 'nhựa' }), res);
  check('classify + khoá dịch vụ: không gọi Gemini miễn phí / Hermes', noFree(), JSON.stringify(calls));
  check('classify + khoá dịch vụ: trả 200, báo lỗi LLM rõ (không im lặng)', res._s === 200 && /NO_PRIVATE_LLM/.test(JSON.stringify(res._j?.llmError || res._j?.status || '')), JSON.stringify({ s: res._s, st: res._j?.status, e: res._j?.llmError }).slice(0, 300));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
