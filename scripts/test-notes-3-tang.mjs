#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-715 — /api/notes trả chú giải THẬT 3 tầng (Phần / Chương / Nhóm):
 *  - 8481: Phần XVI nguyên văn (có "Theo Chú giải 1 của Phần này"), Chương 84
 *    có "Chú giải phân nhóm", Nhóm 8481 có toàn văn (không còn heading stub),
 *    coverage.complete=true và JSON ≤ 30.000 ký tự.
 *  - 5401: chương 54 không có `.phan` → mượn chú giải Phần XI của chương cùng Phần.
 *  - 2501: Phần V không có chú giải trong biểu gốc → NÓI THẲNG "không có chú giải",
 *    không bỏ trống, không bịa; coverage.complete=true.
 *  - 52: chương không có trong notes.json vẫn trả đủ từ bản HS 2022.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.HS_API_TOKEN = 'test-token';

const handler = require('../api/notes.js');

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 400))); };
function mockRes() {
  return { _s: 0, _j: null, setHeader() {}, getHeader() { return undefined; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
}
async function get(query) {
  const res = mockRes();
  await handler({ method: 'GET', url: '/api/notes', query, headers: { authorization: 'Bearer test-token' } }, res);
  return res;
}
const tang = (chain, level) => (chain || []).find((e) => e.level === level) || null;

// ---- 8481: đủ 3 tầng thật + vừa trần ~30.000 ký tự ----
{
  const r = await get({ hs: '8481' });
  const j = r._j;
  check('8481: 200 + found', r._s === 200 && j.found === true, j);
  const phan = tang(j.chain, 'SECTION');
  const nhom = tang(j.chain, 'HEADING');
  check('8481: PHẦN nguyên văn Phần XVI — có "Theo Chú giải 1 của Phần này"', phan && /Theo Chú giải 1 của Phần này/.test(phan.noteVi || ''), phan && phan.noteVi?.slice(0, 120));
  check('8481: content (pháp lý Chương 84) có "Chú giải phân nhóm"', typeof j.content === 'string' && j.content.includes('Chú giải phân nhóm'), j.content?.slice(0, 80));
  check('8481: NHÓM có chú giải thật (hết heading stub), noteVi≠null', nhom && nhom.noteVi && nhom.noteVi.length > 1000 && !/heading stub/.test(nhom.sourceDocument || ''), nhom && { len: nhom.noteVi?.length, src: nhom.sourceDocument });
  check('8481: coverage.complete=true, gaps=[]', j.coverage?.complete === true && (j.coverage.gaps || []).length === 0, j.coverage);
  const size = JSON.stringify(j).length;
  check('8481: JSON ≤ 30.000 ký tự', size <= 30000, { size });
  check('8481: PHẦN ghi rõ độ dài + cách lấy phần KHÁI QUÁT CHUNG (dienGiai)', phan?.dienGiai?.soKyTu > 0 && /level=SECTION&full=1/.test(phan?.dienGiai?.cachLay || ''), phan?.dienGiai);
  const chEnt = tang(j.chain, 'CHAPTER');
  check('8481: chain không lặp toàn văn Chương (đã có ở content)', chEnt && chEnt.noteVi === null && /content/.test(chEnt.ghiChu || ''), chEnt);
}

// ---- 5401: mượn chú giải Phần XI từ chương cùng Phần ----
{
  const r = await get({ hs: '5401' });
  const phan = tang(r._j?.chain, 'SECTION');
  check('5401: PHẦN là Phần XI có chú giải thật (mượn chương cùng Phần)', phan && phan.code === 'XI' && (phan.noteVi || '').length > 5000, phan && { code: phan.code, len: phan.noteVi?.length });
  check('5401: ghi rõ mượn của chương nào', !!phan?.muonChuongCungPhan, phan?.muonChuongCungPhan);
}

// ---- 2501: Phần V không có chú giải trong biểu gốc — nói thẳng ----
{
  const r = await get({ hs: '2501' });
  const phan = tang(r._j?.chain, 'SECTION');
  check('2501: PHẦN nói rõ "không có chú giải" (không trống, không bịa)', phan && /không có chú giải/i.test(phan.noteVi || ''), phan?.noteVi?.slice(0, 160));
  check('2501: coverage.complete=true (biểu gốc không có ≠ thiếu dữ liệu)', r._j?.coverage?.complete === true, r._j?.coverage);
}

// ---- Chương 52 không có trong notes.json vẫn trả đủ từ bản HS 2022 ----
{
  const r = await get({ chapter: '52' });
  check('52: 200 + content có "Chú giải phân nhóm" từ bản 2022', r._s === 200 && r._j.found === true && /Chú giải phân nhóm/.test(r._j.content || ''), r._j?.content?.slice(0, 80));
  check('52: nguồn ghi rõ bản HS 2022', /chu-giai-chuong\.json/.test(r._j?.source || ''), r._j?.source);
}

// ---- Chương 81: biểu gốc không có chú giải chương → nói thẳng, không trả tiêu đề làm chú giải ----
{
  const r = await get({ chapter: '81' });
  check('81: 200 + nói rõ KHÔNG CÓ chú giải chương', r._s === 200 && /KHÔNG CÓ chú giải/i.test(r._j?.content || ''), r._j?.content?.slice(0, 120));
}

// ---- full=1: có phần KHÁI QUÁT CHUNG; guard kích thước tắt khi caller xin full ----
{
  const r = await get({ hs: '8481', level: 'all', full: '1' });
  const phan = tang(r._j?.chain, 'SECTION');
  check('8481 full=1: PHẦN kèm cả "KHÁI QUÁT CHUNG"', phan && /KHÁI QUÁT CHUNG/.test(phan.noteVi || ''), phan?.noteVi?.length);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
