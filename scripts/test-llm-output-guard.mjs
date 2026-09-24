#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * /api/suggest: LLM chỉ được CHỌN trong ứng viên, không được sáng tác mã.
 * Trước đây mã giả "99999999" đi thẳng lên top-1; LLM lỗi thì 502 và vứt
 * luôn các ứng viên đã tìm được. Mock callLLMJson TRƯỚC khi require handler.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

process.env.HS_API_TOKEN = 'test-token';

const llmTier = require('../lib/llm-tier');
let mode = 'fake';
let pickFrom = [];
llmTier.callLLMJson = async (system) => {
  // Bước đề xuất nhóm 4 số trong retrieve-candidates — không cần cho test này.
  if (!/chọn tối đa 3 mã|suggestions/i.test(system)) return { json: { headings: [] }, model: 'mock' };
  if (mode === 'throw') throw Object.assign(new Error('rate limit'), { status: 429 });
  if (mode === 'fake') {
    return { json: { suggestions: [
      { hsCode: '99999999', confidence: 99, nameVi: 'bịa' },
      { hsCode: '847130', confidence: 95 },
    ] }, model: 'mock' };
  }
  // mode 'valid': chọn đúng ứng viên + kèm rác để xem có bị lọc không
  return { json: { suggestions: [
    { hsCode: '99999999', confidence: 99 },
    { hsCode: pickFrom[0], confidence: 250, nameVi: 'Tên LLM tự đặt', girRulesApplied: ['GIR 1'], evil: 'x', gir: 'GIR 1' },
  ] }, model: 'mock' };
};

const { sanitizeLlmSuggestions, deterministicSuggestions } = require('../lib/llm-output-guard');
const { taxData } = require('../lib/data');
const handler = require('../api/suggest.js');

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };

// ── Unit ──
const ev = [{ hsCode: '84137011', score: 900 }, { hsCode: '84137019', score: 800 }];
const g = sanitizeLlmSuggestions([
  { hsCode: '99999999' }, { hsCode: '847130' }, { hsCode: '85171300' },
  { hsCode: '8413.70.11', confidence: 130, nameVi: 'x', girRulesApplied: ['GIR 1'] },
  { hsCode: '84137011' },
], { evidence: ev, taxData, limit: 3 });
check('unit: loại mã không có trong biểu', g.rejected.some((r) => r.reason === 'NOT_IN_TARIFF'));
check('unit: loại mã không đủ 8 số', g.rejected.some((r) => r.reason === 'NOT_8_DIGITS'));
check('unit: loại mã ngoài ứng viên', g.rejected.some((r) => r.hsCode === '85171300' && r.reason === 'NOT_IN_CANDIDATES'));
check('unit: giữ mã hợp lệ có dấu chấm', g.suggestions.length === 1 && g.suggestions[0].hsCode === '84137011', g.suggestions);
check('unit: nameVi lấy từ biểu thuế', g.suggestions[0].nameVi === taxData['84137011'].vn);
check('unit: confidence kẹp ≤100', g.suggestions[0].confidence === 100);
check('unit: bỏ girRulesApplied LLM tự gắn', !('girRulesApplied' in g.suggestions[0]));
const d = deterministicSuggestions(ev, { taxData, limit: 3 });
check('unit: deterministic confidence=null', d.length === 2 && d.every((s) => s.confidence === null));

// ── /api/classify: validateClassifyResults ──
const { validateClassifyResults } = require('../lib/classify');
const vc = validateClassifyResults([
  { hs: '99999999', confidence: 90 },
  { hs: '847130', confidence: 95 },     // 6 số có thật, nhưng nhóm 8471 không nằm trong ứng viên
  { hs: '84137011', confidence: 120 },
  { hs: '84137050', confidence: 80 },   // 8 số không có thật, 841370 có thật → hạ về 6 số
  { hs: '841399', confidence: 50 },
], ['8413']);
check('classify: loại mã bịa', vc.rejected.some((r) => r.hs === '99999999'));
check('classify: loại mã ngoài nhóm ứng viên', vc.rejected.some((r) => r.reason === 'NOT_IN_CANDIDATE_HEADINGS'));
check('classify: giữ 8 số có thật, kẹp confidence', vc.results[0]?.hs === '84137011' && vc.results[0]?.confidence === 100, vc.results);
check('classify: 8 số không có thật → hạ về 6 số', vc.results.some((r) => r.hs === '841370' && r.downgradedFrom === '84137050' && r.confidence <= 70), vc.results);
check('classify: 6 số không có thật bị loại', !vc.results.some((r) => r.hs === '841399'));

// ── Handler ──
function mockRes() {
  return { _s: 0, _j: null, setHeader() {}, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
}
async function call(body) {
  const req = { method: 'POST', url: '/api/suggest', query: {}, headers: { authorization: 'Bearer test-token' }, body };
  const res = mockRes();
  await handler(req, res);
  return res;
}

mode = 'fake';
const r1 = await call({ description: 'máy bơm nước ly tâm trục ngang' });
const codes1 = (r1._j?.suggestions || []).map((s) => s.hsCode);
check('fake: status 200', r1._s === 200, r1._j);
check('fake: không có mã bịa trong kết quả', !codes1.includes('99999999') && !codes1.includes('84713000'), codes1);
check('fake: mọi mã đều có trong biểu thuế', codes1.length > 0 && codes1.every((c) => taxData[c]), codes1);
check('fake: engine=deterministic, degraded', r1._j?.engine === 'deterministic' && r1._j?.degraded === true);
check('fake: báo llmRejectedCodes', (r1._j?.llmRejectedCodes || []).length === 2);
check('fake: confidence=null ở chế độ deterministic', r1._j?.suggestions.every((s) => s.confidence === null));

mode = 'throw';
const r2 = await call({ description: 'máy bơm nước ly tâm trục đứng' });
check('throw: 200 thay vì 502', r2._s === 200, r2._s);
check('throw: vẫn còn ứng viên', (r2._j?.suggestions || []).length > 0);
check('throw: có llmError', r2._j?.llmError?.code !== undefined);

mode = 'valid';
pickFrom = (r1._j?.evidence || []).map((e) => e.hsCode);
const r3 = await call({ description: 'máy bơm nước ly tâm dùng điện' });
const top = r3._j?.suggestions?.[0];
check('valid: engine=llm', r3._j?.engine === 'llm', r3._j?.engine);
check('valid: top-1 là mã LLM chọn hợp lệ', top?.hsCode === pickFrom[0], [top?.hsCode, pickFrom[0]]);
check('valid: nameVi từ biểu thuế, không phải của LLM', top?.nameVi === taxData[pickFrom[0]]?.vn);
check('valid: không lọt trường lạ / girRulesApplied của LLM', top && !('evil' in top) && !('girRulesApplied' in top));

// Cache: facts khác nhau phải cho kết quả mới, không trả bản cache cũ
const r4 = await call({ description: 'máy bơm nước ly tâm dùng điện' });
check('cache: cùng câu hỏi → cached', r4._j?.cached === true);
const r5 = await call({ description: 'máy bơm nước ly tâm dùng điện', facts: { power: 'electric' } });
check('cache: có facts → không dùng bản cache cũ', r5._j?.cached !== true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
