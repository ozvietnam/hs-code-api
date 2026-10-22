#!/usr/bin/env node
// GĐ0-J2 (#377): index kho nhãn nhóm 4/6 số bằng embedding cục bộ.
// Nguồn nhãn: (a) data/oz-gold-final.jsonl — mô tả hàng thật gắn mã (bỏ holdout), mỗi mã gom thành 1 nhãn
//             (b) data/search.json + tax.json — tên nhóm/6 số chuẩn từ biểu thuế (phủ đủ 1.269 nhóm)
// Đầu ra: data/gd0/index-e5-small.json { hs4: [vec], hs6: [vec], nhan4: {ma: ten}, nhan6: {ma: ten}, meta }
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const { isHeldOut } = require(join(ROOT, 'lib/holdout.js'));
const { taoExtractor, embed } = await import('./j1-harness.mjs');

// Gom nhãn
const gold = readFileSync(join(ROOT, 'data/oz-gold-final.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const tax = require(join(ROOT, 'data/tax.json'));
const nz = (s) => String(s || '').replace(/\D/g, '');

const moTa4 = {}; const moTa6 = {}; // mã → mảng mô tả
let holdoutBo = 0;
for (const g of gold) {
  const hs = nz(g.hsCode);
  if (hs.length !== 8) continue;
  const desc = String(g.sampleDesc || '').trim();
  if (desc.length < 20) continue;
  if (isHeldOut(g)) { holdoutBo++; continue; } // chống rò rỉ holdout
  (moTa4[hs.slice(0, 4)] ||= []).push(desc.slice(0, 300));
  (moTa6[hs.slice(0, 6)] ||= []).push(desc.slice(0, 300));
}
// Nhãn chuẩn từ biểu thuế (phủ nhóm không có tờ khai)
const tenChuan = (hs, cap) => {
  if (cap === 4) {
    // tên nhóm = gom tên các dòng 8 số đầu tiên, bỏ gạch — lấy phần chung ngắn nhất
    const names = Object.keys(tax).filter((k) => k.startsWith(hs)).slice(0, 5).map((k) => String(tax[k].vn || '').replace(/^[-\s–]+/, ''));
    return [...new Set(names)].join(' | ').slice(0, 400);
  }
  const names = Object.keys(tax).filter((k) => k.startsWith(hs)).slice(0, 3).map((k) => String(tax[k].vn || '').replace(/^[-\s–]+/, ''));
  return [...new Set(names)].join(' | ').slice(0, 400);
};
const nhan4 = {}; const nhan6 = {};
const tatCa4 = new Set([...Object.keys(moTa4), ...Object.keys(tax).map((k) => k.slice(0, 4))]);
const tatCa6 = new Set(Object.keys(tax).map((k) => k.slice(0, 6)));
const CHI_MO_TA = process.env.GD0_CHI_MO_TA === '1'; // chỉ mô tả thật, không pha tên biểu thuế chuẩn
for (const h4 of tatCa4) nhan4[h4] = CHI_MO_TA ? (moTa4[h4] || []).slice(0, 20).join(' ¶ ') : [...(moTa4[h4] || []).slice(0, 20), tenChuan(h4, 4)].filter(Boolean).join(' ¶ ');
for (const h6 of tatCa6) nhan6[h6] = CHI_MO_TA ? (moTa6[h6] || []).slice(0, 20).join(' ¶ ') : [...(moTa6[h6] || []).slice(0, 20), tenChuan(h6, 6)].filter(Boolean).join(' ¶ ');

// CHI_MO_TA: nhóm không có tờ khai thật → bỏ khỏi index (chỉ đo khả năng của mô tả thật)
if (CHI_MO_TA) { for (const k of Object.keys(nhan4)) if (!nhan4[k]) delete nhan4[k]; for (const k of Object.keys(nhan6)) if (!nhan6[k]) delete nhan6[k]; }
console.log(`nhóm 4 số: ${Object.keys(nhan4).length} | PN6: ${Object.keys(nhan6).length} | holdout bỏ: ${holdoutBo}`);

// Embed theo lô
const { ext, taiMs } = await taoExtractor();
async function embedBatch(entries, cap) {
  const out = {};
  const keys = Object.keys(entries);
  const BATCH = 32;
  const t0 = Date.now();
  for (let i = 0; i < keys.length; i += BATCH) {
    const slice = keys.slice(i, i + BATCH);
    const vecs = await embed(ext, slice.map((k) => entries[k]));
    slice.forEach((k, j) => { out[k] = vecs[j].map((x) => +x.toFixed(5)); });
    if ((i / BATCH) % 20 === 0) process.stderr.write(`\r${i}/${keys.length}`);
  }
  process.stderr.write(`\n`);
  console.log(`embed ${cap}: ${keys.length} nhãn, ${Date.now() - t0}ms (${Math.round((Date.now() - t0) / keys.length)}ms/nhãn)`);
  return out;
}
const vec4 = await embedBatch(nhan4, 'nhóm-4');
const vec6 = await embedBatch(nhan6, 'nhóm-6');

mkdirSync(join(ROOT, 'data/gd0'), { recursive: true });
writeFileSync(join(ROOT, 'data/gd0/index-e5-small.json'), JSON.stringify({
  meta: { model: process.env.GD0_MODEL || 'Xenova/multilingual-e5-small', dtype: 'q8', taiMs, taoLuc: new Date().toISOString(), soNhom4: Object.keys(vec4).length, soPn6: Object.keys(vec6).length, holdoutBo },
  nhan4, nhan6, vec4, vec6,
}));
console.log('ghi data/gd0/index-e5-small.json');
