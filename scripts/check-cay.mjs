#!/usr/bin/env node
/**
 * MÁY KIỂM CÂY (#236 việc 2): sổ tay data/so-tay/*.json có khớp cây HS theo chữ số hiện hành (lib/hs-tree.js) không.
 *   ĐỎ (exit 1): khối `cay.nut` lệch cây (biểu thuế đổi → dựng lại), dong8 trỏ mã không có trong cây,
 *                 `cay.tenDien` trỏ nút không có / nút đã có tên.
 *   BÁO (không đỏ): dòng lá chưa có trong dong8, nút ảo chưa điền tên, phân nhóm 6 số chưa có tieuChi6 — là việc của vòng soạn.
 *   node scripts/check-cay.mjs [--nhom=8504,…] [--raw=<thư mục bản nháp>] [--chi-tiet]
 * Chạy trong npm test (sau check-so-tay).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { kiemCay } = require('../lib/so-tay.js');

const arg = (n) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : null; };
const only = arg('nhom') ? arg('nhom').split(',') : null;
const SRC = arg('raw') ? path.resolve(arg('raw')) : path.join(ROOT, 'data', 'so-tay');
const chiTiet = process.argv.includes('--chi-tiet');
const files = (fs.existsSync(SRC) ? fs.readdirSync(SRC).filter((f) => /^\d{4}\.json$/.test(f)) : []).filter((f) => !only || only.includes(f.slice(0, 4))).sort();
let loi = 0; const tong = {}; let nhomDu = 0;
for (const f of files) {
  const h4 = f.slice(0, 4);
  let s; try { s = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8')); } catch (e) { loi += 1; console.log(`FAIL ${h4}: không đọc được JSON (${e.message})`); continue; }
  const r = kiemCay(s, h4);
  for (const l of r.loi) { loi += 1; console.log(`FAIL ${h4} ${l}`); }
  for (const c of r.canhBao) { const k = c.split(':')[0]; tong[k] = (tong[k] || 0) + 1; if (chiTiet) console.log(`  báo ${h4} ${c}`); }
  if (!r.canhBao.length) nhomDu += 1;
}
console.log(`máy kiểm cây: ${files.length} nhóm, ${loi} lỗi lệch cây, ${nhomDu} nhóm đủ (có cây, đủ dong8, đủ tên nút ảo, đủ tiêu chí 6 số)`);
for (const [k, v] of Object.entries(tong).sort()) console.log(`  còn trống: ${k} × ${v}`);
process.exit(loi ? 1 : 0);
