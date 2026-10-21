#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * GET /api/chapter-declaration-fields (resource chapter_declaration_fields của /api/dataset):
 * khuôn khai CHUNG theo chương 2 số — dữ liệu tĩnh, công khai (vá sống: data đã có, chỉ thiếu cửa).
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

let passed = 0; let failed = 0;
const assert = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${JSON.stringify(extra).slice(0, 300)}`}`); if (ok) passed += 1; else failed += 1; };

delete process.env.HS_API_TOKEN; // công khai: không token vẫn đọc được
const handler = require('../api/dataset.js');
const call = async (query) => {
  const res = { _s: 0, _j: null, _h: {}, getHeader(k) { return this._h[k]; }, setHeader(k, v) { this._h[k] = v; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
  await handler({ method: 'GET', url: '/api/chapter-declaration-fields', query: { resource: 'chapter_declaration_fields', ...query }, headers: {} }, res);
  return res;
};

// Chương có khuôn (84 = máy móc) — công khai, trả data.
let r = await call({ chapter: '84' });
assert('chương 84: 200 công khai, source=chapter, có trường', r._s === 200 && r._j.chapter === '84' && r._j.source === 'chapter' && Array.isArray(r._j.fields) && r._j.fields.length > 0, r._j);
assert('chương 84: có legalRefs (TT 39/2018) + version', Array.isArray(r._j.legalRefs) && r._j.legalRefs.length > 0 && typeof r._j.version === 'string', { legalRefs: r._j.legalRefs, version: r._j.version });
assert('chương 84: trường đồng shape declaration-fields (key + questionVi + required)', r._j.fields.every((f) => f.key && f.questionVi && typeof f.required === 'boolean'));

// Nhận ?hs= (lấy 2 số đầu làm chương).
r = await call({ hs: '85171300' });
assert('?hs=85171300 → chương 85', r._s === 200 && r._j.chapter === '85' && r._j.fields.length > 0, r._j);

// Chương không có khuôn → 404 (không 500).
assert('chương 99 (không có khuôn) → 404', (await call({ chapter: '99' }))._s === 404);

// Thiếu/sai tham số → 400.
assert('chương 1 chữ số → 400', (await call({ chapter: '8' }))._s === 400);
assert('không chapter/hs → 400', (await call({}))._s === 400);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
