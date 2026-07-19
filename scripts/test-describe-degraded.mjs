#!/usr/bin/env node
/**
 * Test /api/describe KHÔNG fail-silent khi LLM lỗi (Issue #67).
 * Mock geminiGenerateJson TRƯỚC khi require handler (handler destructure ở load-time).
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

process.env.HS_API_TOKEN = 'test-token';

// ── mock LLM: đặt trước khi require describe.js ──
const gemini = require('../lib/gemini');
let mode = 'ok';
gemini.geminiGenerateJson = async () => {
  if (mode === 'retryable') throw Object.assign(new Error('rate limit exceeded'), { status: 429 });
  if (mode === 'fatal') throw new Error('unexpected token in JSON at position 0');
  if (mode === 'notconfig') throw Object.assign(new Error('no key'), { code: 'GEMINI_NOT_CONFIGURED' });
  return { json: { declaration: { tenHang: 'Sản phẩm test' } }, model: 'gemini-2.5-flash' };
};

const handler = require('../api/describe.js');
const { taxData } = require('../lib/data');
const HS = Object.keys(taxData)[0];

let pass = 0, fail = 0;
const check = (n, c) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`)); };

function mockRes() {
  return { _s: 0, _j: null, setHeader() {}, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
}
async function call(body) {
  const req = { method: 'POST', url: '/api/describe', query: {}, headers: { authorization: 'Bearer test-token' }, body };
  const res = mockRes();
  await handler(req, res);
  return res;
}
const hasWarn = (r, code) => (r._j?.compliance?.warnings || []).some((w) => w.code === code);

// 1. LLM lỗi tạm thời (429) → 200 nhưng degraded, có cờ + warning, KHÔNG im lặng
mode = 'retryable';
const r1 = await call({ hsCode: HS, productName: 'Bơm test', brand: 'X', origin: 'China' });
check('retryable: status 200 (không nuốt lỗi thành 500)', r1._s === 200);
check('retryable: degraded=true', r1._j?.degraded === true);
check('retryable: llmError.retryable=true', r1._j?.llmError?.retryable === true);
check('retryable: llmModel=null', r1._j?.llmModel === null);
check('retryable: có warning DESCRIPTION_DEGRADED', hasWarn(r1, 'DESCRIPTION_DEGRADED'));
check('retryable: vẫn có declaration fallback', !!r1._j?.declaration);

// 2. LLM lỗi vĩnh viễn (parse) → degraded, retryable=false
mode = 'fatal';
const r2 = await call({ hsCode: HS, productName: 'Bơm test' });
check('fatal: degraded=true', r2._j?.degraded === true);
check('fatal: llmError.retryable=false', r2._j?.llmError?.retryable === false);

// 3. LLM OK → không degraded, không warning degraded
mode = 'ok';
const r3 = await call({ hsCode: HS, productName: 'Bơm test' });
check('ok: degraded=false', r3._j?.degraded === false);
check('ok: llmError=null', r3._j?.llmError === null);
check('ok: llmModel set', typeof r3._j?.llmModel === 'string');
check('ok: KHÔNG có warning degraded', !hasWarn(r3, 'DESCRIPTION_DEGRADED'));

// 4. Chưa cấu hình Gemini → 503 rõ ràng (giữ nguyên hành vi cũ)
mode = 'notconfig';
const r4 = await call({ hsCode: HS, productName: 'Bơm test' });
check('notconfig: status 503 rõ ràng', r4._s === 503);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
