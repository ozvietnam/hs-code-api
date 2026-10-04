#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Test /api/describe KHÔNG fail-silent khi LLM lỗi (Issue #67).
 * Mock llmTier.callLLMJson TRƯỚC khi require handler.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

process.env.HS_API_TOKEN = 'test-token';

// ── mock LLM: /api/describe gọi qua lib/llm-tier (Gemini miễn phí → dự phòng → khóa trả phí) ──
const llmTier = require('../lib/llm-tier');
let mode = 'ok';
let lastPrompt = null;
let lastSystem = null;
llmTier.callLLMJson = async (system, user) => {
  lastSystem = system;
  lastPrompt = user;
  if (mode === 'retryable') throw Object.assign(new Error('rate limit exceeded'), { status: 429 });
  if (mode === 'fatal') throw new Error('unexpected token in JSON at position 0');
  if (mode === 'none') throw Object.assign(new Error('Không có provider LLM nào được cấu hình'), { code: 'LLM_NOT_CONFIGURED' });
  if (mode === 'fallback') return { json: { declaration: { tenHang: 'Sản phẩm fallback' } }, model: 'minimax-test', provider: 'minimax' };
  return { json: { declaration: { tenHang: 'Sản phẩm test' } }, model: 'gemini-2.5-flash', provider: 'gemini-free' };
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

// 4. Gemini miễn phí hết lượt, router trả nhà cung cấp dự phòng → dùng được, không degraded
mode = 'fallback';
const r4 = await call({ hsCode: HS, productName: 'Bơm test' });
check('fallback: status 200', r4._s === 200);
check('fallback: dùng model dự phòng', r4._j?.llmModel === 'minimax-test');
check('fallback: degraded=false', r4._j?.degraded === false);

// 5. Không có provider nào → vẫn 200 + bản khai dựng sẵn, degraded (không 503)
mode = 'none';
const r5 = await call({ hsCode: HS, productName: 'Bơm test' });
check('no-provider: status 200 (không 503)', r5._s === 200);
check('no-provider: degraded=true', r5._j?.degraded === true);
check('no-provider: vẫn có declaration', !!r5._j?.declaration);
check('no-provider: có warning DESCRIPTION_DEGRADED', hasWarn(r5, 'DESCRIPTION_DEGRADED'));

// 6. H5: thông số chuẩn hóa đi vào mô tả; giá trị còn chữ Hán bị bỏ và báo lại
mode = 'ok';
const r6 = await call({ hsCode: HS, productName: 'Máy xay sinh tố', attributes: { material: 'inox 304', power: '1500W', fiberContent: '100%棉' } });
const sent = JSON.parse(lastPrompt || '{}');
check('attributes: material vào ô chất liệu gửi AI', sent.material === 'inox 304');
check('attributes: công suất vào thông số kỹ thuật', /Công suất: 1500W/.test(sent.technicalSpec || ''));
check('attributes: không gửi chữ Hán cho AI', !/[\u3400-\u9fff]/.test(lastPrompt || ''));
check('attributes: báo attributesUsed + attributesSkipped', (r6._j?.attributesUsed || []).includes('power') && (r6._j?.attributesSkipped || [])[0]?.key === 'fiberContent');

// 7. PR #108: quy tắc bám dữ liệu người khai thật sự được gửi cho AI và khớp validator
const { INPUT_FIELDS, SHORT_NAME_EXAMPLE, INPUT_FIDELITY_RULES } = require('../lib/customs-prompt');
const { validateDeclaration, normalizeDeclaration } = require('../lib/declaration-validator');
mode = 'ok';
lastSystem = null;
await call({
  hsCode: '19059090', productName: 'bánh mè 500g/gói', origin: 'China', brand: 'X', model: 'M1',
  material: 'bột mì, mè', purpose: 'thực phẩm', technicalSpec: '500g/gói', customerDescription: 'bánh mè giòn',
});
check('prompt: quy tắc bám dữ liệu người khai nằm trong system prompt gửi AI',
  typeof INPUT_FIDELITY_RULES === 'string' && (lastSystem || '').includes(INPUT_FIDELITY_RULES));
const sent7 = JSON.parse(lastPrompt || '{}');
const absent = (INPUT_FIELDS || ['?']).filter((f) => !(f in sent7));
check(`prompt: mọi trường quy tắc 3 nhắc tới có trong payload gửi AI${absent.length ? ` (thiếu: ${absent})` : ''}`, absent.length === 0);
check('prompt: dặn dịch chữ Hán, không chép xuất xứ/quy cách vào tenHang',
  /chữ Hán[^.]*DỊCH sang tiếng Việt/.test(INPUT_FIDELITY_RULES || '') && /KHÔNG đưa xuất xứ, quy cách/.test(INPUT_FIDELITY_RULES || ''));
const tenHangOk = (t) => {
  const d = normalizeDeclaration({ declaration: { tenHang: t } }, {});
  const c = validateDeclaration(d, '19059090', {});
  return !c.missingRequired.includes('tenHang') && !c.warnings.some((w) => w.field === 'tenHang' && w.code === 'TOO_GENERIC');
};
check('prompt: ví dụ tên ngắn trong prompt tự qua validator tenHang (≥10 ký tự, không mơ hồ)',
  !!SHORT_NAME_EXAMPLE && tenHangOk(SHORT_NAME_EXAMPLE.tenHang) && !tenHangOk(SHORT_NAME_EXAMPLE.input));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
