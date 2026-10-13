#!/usr/bin/env node
/**
 * lib/usage-context.js (AsyncLocalStorage gom usage theo request) + việc lib/llm.mjs / lib/gemini.js
 * ghi nhận usage từ phản hồi nhà cung cấp. fetch được giả lập — không mạng, không ghi data/.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { withUsage, recordUsage } = require('../lib/usage-context.js');

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const U = (provider, n) => ({ provider, model: 'm', inputTokens: n, outputTokens: n + 1 });

// 1. gom đúng thứ tự, trả cả result
const a = U('a', 1); const b = U('b', 2);
const r1 = await withUsage(async () => { recordUsage(a); await sleep(2); recordUsage(b); return 'kq'; });
check('withUsage trả result', r1.result === 'kq');
check('withUsage trả usage [a,b] đúng thứ tự', JSON.stringify(r1.usage) === JSON.stringify([a, b]), JSON.stringify(r1.usage));

// 2. ngoài context: no-op, không ném lỗi
let threw = false;
try { recordUsage(a); } catch { threw = true; }
check('recordUsage ngoài context là no-op', !threw);

// 3. song song không lẫn
const [p1, p2] = await Promise.all([
  withUsage(async () => { recordUsage(U('x', 1)); await sleep(15); recordUsage(U('x', 2)); }),
  withUsage(async () => { await sleep(5); recordUsage(U('y', 9)); await sleep(20); }),
]);
check('song song: ngữ cảnh 1 chỉ có usage x', p1.usage.length === 2 && p1.usage.every((u) => u.provider === 'x'), JSON.stringify(p1.usage));
check('song song: ngữ cảnh 2 chỉ có usage y', p2.usage.length === 1 && p2.usage[0].provider === 'y', JSON.stringify(p2.usage));

// 4. lỗi trong fn: ném lại, không nuốt
let err = null;
try { await withUsage(async () => { recordUsage(a); throw new Error('boom'); }); } catch (e) { err = e; }
check('withUsage ném lại lỗi của fn', err && err.message === 'boom');
check('usage đã ghi trước lỗi vẫn lấy được (err.usage)', Array.isArray(err?.usage) && err.usage.length === 1);

// 5. mảng trả về là bản sao (ghi tiếp không làm đổi)
const r5 = await withUsage(async () => { recordUsage(a); });
r5.usage.push(b);
check('usage trả về độc lập', r5.usage.length === 2);

// 6. llm.mjs chat(): đọc usage kiểu OpenAI
const realFetch = globalThis.fetch;
const ENV = ['MINIMAX_API_KEY', 'HERMES_API_KEY', 'OPENROUTER_API_KEY'];
for (const k of ENV) delete process.env[k];
process.env.MINIMAX_API_KEY = 'k-minimax';
const jsonRes = (obj) => ({ ok: true, status: 200, text: async () => JSON.stringify(obj), json: async () => obj });
const { chat } = await import('../lib/llm.mjs');

globalThis.fetch = async () => jsonRes({ choices: [{ message: { content: 'xin chào' } }], usage: { prompt_tokens: 11, completion_tokens: 7 } });
const r6 = await withUsage(() => chat([{ role: 'user', content: 'hi' }]));
check('chat: content vẫn trả như cũ', r6.result.content === 'xin chào' && r6.result.provider === 'minimax');
check('chat: ghi usage OpenAI (prompt/completion)', r6.usage.length === 1 && r6.usage[0].provider === 'minimax' && r6.usage[0].inputTokens === 11 && r6.usage[0].outputTokens === 7 && typeof r6.usage[0].model === 'string', JSON.stringify(r6.usage));

// 7. nhà cung cấp không trả usage → -1
globalThis.fetch = async () => jsonRes({ choices: [{ message: { content: 'ok' } }] });
const r7 = await withUsage(() => chat([{ role: 'user', content: 'hi' }]));
check('chat: không có usage → token -1', r7.usage.length === 1 && r7.usage[0].inputTokens === -1 && r7.usage[0].outputTokens === -1, JSON.stringify(r7.usage));

// 8. gọi chat ngoài context vẫn chạy bình thường
const r8 = await chat([{ role: 'user', content: 'hi' }]);
check('chat ngoài context không lỗi', r8.content === 'ok');

// 9. gemini.js: usageMetadata
process.env.GEMINI_API_KEY = 'k-gem';
const { geminiGenerateJson } = require('../lib/gemini.js');
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"a":1}' }] } }], usageMetadata: { promptTokenCount: 21, candidatesTokenCount: 5 } }) });
const r9 = await withUsage(() => geminiGenerateJson({ systemPrompt: 's', userPrompt: 'u', modelEnv: 'X_MODEL', defaultModel: 'gemini-2.5-flash' }));
check('gemini: json vẫn trả như cũ', r9.result.json.a === 1);
check('gemini: ghi usage từ usageMetadata', r9.usage.length === 1 && r9.usage[0].provider === 'gemini' && r9.usage[0].inputTokens === 21 && r9.usage[0].outputTokens === 5 && /gemini-2.5-flash/.test(r9.usage[0].model), JSON.stringify(r9.usage));

globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"a":1}' }] } }] }) });
const r10 = await withUsage(() => geminiGenerateJson({ systemPrompt: 's', userPrompt: 'u', modelEnv: 'X_MODEL', defaultModel: 'gemini-2.5-flash' }));
check('gemini: thiếu usageMetadata → -1', r10.usage[0]?.inputTokens === -1 && r10.usage[0]?.outputTokens === -1, JSON.stringify(r10.usage));

globalThis.fetch = realFetch;
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
