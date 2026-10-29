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
const thamChieu178 = (() => { try { return require('../lib/legal-basis.js').citeChiTieu('1.78.1').tham_chieu; } catch { return null; } })();
assert('chương 84: có legalRefs + version; căn cứ đầu đúng bằng citeChiTieu(1.78.1).tham_chieu', Array.isArray(r._j.legalRefs) && r._j.legalRefs[0] === thamChieu178 && !r._j.legalRefs.some((x) => /^chiTieu:/.test(x)) && typeof r._j.version === 'string', { legalRefs: r._j.legalRefs, version: r._j.version });
assert('chương 84: trường đồng shape declaration-fields (key + questionVi + required)', r._j.fields.every((f) => f.key && f.questionVi && typeof f.required === 'boolean'));

// Nhận ?hs= (lấy 2 số đầu làm chương).
r = await call({ hs: '85171300' });
assert('?hs=85171300 → chương 85', r._s === 200 && r._j.chapter === '85' && r._j.fields.length > 0, r._j);

// Chương không có khuôn → 404 (không 500).
assert('chương 99 (không có khuôn) → 404', (await call({ chapter: '99' }))._s === 404);

// Thiếu/sai tham số → 400.
assert('chương 1 chữ số → 400', (await call({ chapter: '8' }))._s === 400);
assert('không chapter/hs → 400', (await call({}))._s === 400);

// Đợt 0A / H5: trường upperMaterial = MŨ giày (phần trên), không phải MŨI giày (toe cap — tiêu chí dòng 6402.99.10/20).
r = await call({ chapter: '64' });
const upper = (r._j.fields || []).find((f) => f.key === 'upperMaterial');
assert('chương 64: nhãn upperMaterial là "mũ giày (phần trên)", không "mũi"', Boolean(upper) && /mũ giày/.test(upper.labelVi) && !/mũi/.test(upper.labelVi), upper);
{
  // patterns của khuôn này còn được declaration-validator dùng để coi trường là "đã khai".
  const { collectChapterFieldRequirements } = require('../lib/declaration-validator');
  const thieu = (s) => collectChapterFieldRequirements({ productName: s, chapterSpecific: {} }, '64029990', { customerDescription: s }).missing.map((m) => m.key);
  assert('validator: "mũi giày gắn bảo vệ" KHÔNG thay cho chất liệu mũ giày', thieu('Giày có mũi giày gắn bảo vệ, đế cao su').includes('upperMaterial'));
  assert('validator: "quai bằng nhựa giả da PU, đế ngoài bằng nhựa" → đủ mũ + đế', !thieu('Dép, quai bằng nhựa giả da PU, đế ngoài bằng nhựa, mũi không gắn bảo vệ').some((k) => k === 'upperMaterial' || k === 'soleMaterial'));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
