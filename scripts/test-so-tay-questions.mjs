#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * POST /api/so-tay-questions — câu hỏi phân loại TẤT ĐỊNH lấy từ sổ tay thật.
 * Khoá: không LLM / không engine-loop / không cờ HS_SO_TAY; nhóm có sổ tay → câu hỏi number
 * đúng đặc điểm; nhóm không có sổ tay → coSoTay:false (không 500); đầu vào xấu → 400.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

let passed = 0; let failed = 0;
const assert = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${JSON.stringify(extra).slice(0, 300)}`}`); if (ok) passed += 1; else failed += 1; };

delete process.env.HS_API_TOKEN; // công khai: không token vẫn gọi được
delete process.env.HS_PUBLIC_READ;
delete process.env.HS_SO_TAY; // chứng minh KHÔNG phụ thuộc cờ
const handler = require('../api/so-tay-questions.js');
const call = async (body, method = 'POST') => {
  const res = { _s: 0, _j: null, _h: {}, getHeader(k) { return this._h[String(k).toLowerCase()]; }, setHeader(k, v) { this._h[String(k).toLowerCase()] = v; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
  await handler({ method, url: '/api/so-tay-questions', headers: {}, body }, res);
  return res;
};

// 1) Nhóm CÓ sổ tay (van, 8481): dòng "Loại khác" 84811019 thiếu đường kính → hỏi đặc điểm số đúng (đường kính, cm).
let r = await call({ hs: '84811019', productText: 'van công nghiệp' });
assert('8481: 200 + coSoTay:true + nhom 8481', r._s === 200 && r._j.coSoTay === true && r._j.nhom === '8481', r._j);
assert('8481: có nguonSoTay nhắc nhóm', typeof r._j.nguonSoTay === 'string' && r._j.nguonSoTay.includes('8481'), r._j.nguonSoTay);
const dk = (r._j.questions || []).find((q) => q.key === 'duong_kinh');
assert('8481: có câu hỏi number "đường kính" đơn vị cm (đặc điểm chốt đuôi 8 số)', Boolean(dk) && dk.type === 'number' && dk.unit === 'cm' && /[Đđ]ường kính/.test(dk.questionVi), dk);
assert('8481: mọi câu hỏi đúng contract (key/questionVi/type ∈ choice|number/required bool)', (r._j.questions || []).length > 0 && r._j.questions.every((q) => q.key && q.questionVi && ['choice', 'number'].includes(q.type) && typeof q.required === 'boolean'), r._j.questions);
assert('8481: câu number có unit và KHÔNG kèm options', r._j.questions.filter((q) => q.type === 'number').every((q) => q.unit && !q.options));

// hs 4 số cũng nhận (chỉ cổng + trường khai, chưa chốt đuôi) — vẫn coSoTay:true.
r = await call({ hs: '8481' });
assert('8481 (4 số): coSoTay:true', r._s === 200 && r._j.coSoTay === true, r._j);

// 2) Nhóm KHÔNG có sổ tay → coSoTay:false + questions rỗng (portal tự fallback), KHÔNG 500.
r = await call({ hs: '9999' });
assert('nhóm không sổ tay: 200 + coSoTay:false + questions rỗng', r._s === 200 && r._j.coSoTay === false && Array.isArray(r._j.questions) && r._j.questions.length === 0, r._j);

// 3) Không hỏi lại đặc điểm khách đã trả lời trong facts.
r = await call({ hs: '84811019', productText: 'van công nghiệp', facts: { duong_kinh: 3 } });
assert('facts đã có duong_kinh → không hỏi lại', !(r._j.questions || []).some((q) => q.key === 'duong_kinh'), r._j.questions);

// 4) Đầu vào xấu → 400 (không throw, không 500).
assert('hs < 4 số → 400', (await call({ hs: '12' }))._s === 400);
assert('thiếu hs → 400', (await call({}))._s === 400);

// 5) Method khác POST → 405.
assert('GET → 405', (await call({ hs: '8481' }, 'GET'))._s === 405);

// 6) Body dạng chuỗi JSON vẫn đọc được; chuỗi hỏng → 400.
r = await call('{"hs":"84811019"}');
assert('body chuỗi JSON: 200 + coSoTay:true', r._s === 200 && r._j.coSoTay === true, r._j);
assert('body chuỗi JSON hỏng → 400', (await call('{hỏng'))._s === 400);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
