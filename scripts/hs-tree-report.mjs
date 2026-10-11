#!/usr/bin/env node
/**
 * Báo cáo cây HS dựng từ chữ số (#236): thống kê toàn biểu thuế, bất thường, và in cây các nhóm chỉ định.
 *   node scripts/hs-tree-report.mjs                 # thống kê + bất thường
 *   node scripts/hs-tree-report.mjs --nhom=8504,8539 # in cây
 *   node scripts/hs-tree-report.mjs --loai-khac=85042119
 * Chỉ đọc, không ghi.
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const T = require('../lib/hs-tree.js');
const arg = (n) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : null; };

const s = T.stats();
console.log('== Thống kê cây (từ data/tax.json + data/wco-hs-international.csv)');
for (const [k, v] of Object.entries(s)) console.log(`  ${k}: ${v}`);
const { anomalies } = T.tree();
if (anomalies.length) {
  console.log(`\n== Bất thường (${anomalies.length}) — gạch lệch với tầng chữ số: chỉ ghi chú chất lượng dữ liệu, cấu trúc không đổi`);
  const byType = {};
  for (const a of anomalies) (byType[a.loai] ||= []).push(a.ma);
  for (const [k, v] of Object.entries(byType)) console.log(`  ${k}: ${v.length} — ${v.slice(0, 20).join(', ')}${v.length > 20 ? '…' : ''}`);
}
const nhom = arg('nhom');
if (nhom) for (const h of nhom.split(',')) { console.log(`\n${T.render(h)}`); }
const lk = arg('loai-khac');
if (lk) console.log(JSON.stringify(T.loaiKhacOf(lk), null, 2));
