#!/usr/bin/env node
// Máy kiểm kho văn bản chuyên ngành (#1101): mọi nguyenVan phải có (squash) trong tệp chữ nguồn;
// in hiệu lực từng văn bản. Chạy: node scripts/check-van-ban-chuyen-nganh.mjs [--id=<id>] [--text=<tệp>]
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// squash giống lib/so-tay.js: bỏ khoảng trắng/dấu câu, thường hoá
const squash = (s) => String(s || '').toLowerCase().normalize('NFC').replace(/[\s.,;:!?()|[\]{}"'…–—-]/g, '');
const arg = (k) => process.argv.find((x) => x.startsWith(`--${k}=`))?.slice(k.length + 3);

const kho = JSON.parse(readFileSync(arg('kho') || join(ROOT, 'data/van-ban-chuyen-nganh/van-ban.json'), 'utf8'));
const locId = arg('id');
let loi = 0;
for (const vb of kho.vanBan || []) {
  if (locId && vb.id !== locId) continue;
  const tepChu = arg('text') || join(ROOT, 'data/van-ban-chuyen-nganh', vb.nguonChu);
  const hetHan = vb.hieuLuc?.den && vb.hieuLuc.den < new Date().toISOString().slice(0, 10);
  console.log(`— ${vb.soHieu} (${vb.id}) HL ${vb.hieuLuc?.tu}→${vb.hieuLuc?.den || '∞'}${hetHan ? '  ⚠ HẾT HIỆU LỰC' : ''}`);
  if (!existsSync(tepChu)) { console.log(`  ✗ thiếu tệp chữ nguồn: ${tepChu}`); loi++; continue; }
  const chu = squash(readFileSync(tepChu, 'utf8'));
  for (const d of vb.doan || []) {
    const ok = chu.includes(squash(d.nguyenVan));
    if (!ok) loi++;
    console.log(`  ${ok ? '✓' : '✗'} ${vb.id}.${d.id} [${d.dieu} ${d.khoan}${d.diem ? ' đ' + d.diem : ''}] — ${d.apDungCho.join(', ')}`);
  }
}
if (loi) { console.error(`\nĐỎ — ${loi} lỗi`); process.exit(1); }
console.log('\nXANH');
