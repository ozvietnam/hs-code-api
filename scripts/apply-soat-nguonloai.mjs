#!/usr/bin/env node
/**
 * Sau khi build-so-tay --tu-tep nạp raw (đã soát độc lập) vào data/so-tay/<nhom>.json,
 * mọi mục mang nguonLoai = AI_DA_KIEM. Theo luật 11 (docs/giao-viec/so-tay-giao-ngoai.md)
 * chỉ NGƯỜI SOÁT ĐỘC LẬP mới đổi sang NGUOI_DUYET — script này thực hiện việc đó,
 * CHỈ trên các mảng đã rà: phamVi, boPhan, dieuKienVao, loaiTru, phanBiet.
 * (tieuChi6, dong8, cay.tenDien, yKienWco — NGOÀI phạm vi soát đợt này, giữ nguyên.)
 *
 * Cú pháp: node scripts/apply-soat-nguonloai.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(ROOT, 'data', 'so-tay');
const DRY = process.argv.includes('--dry');
const SCOPED = new Set(['phamVi', 'dieuKienVao', 'loaiTru', 'phanBiet']);

function isScopedArray(name) {
  return SCOPED.has(name);
}
function isBoPhanWithObject(item) {
  return item && typeof item === 'object' && Object.keys(item).length > 0;
}
function upgrade(item, count) {
  if (item && typeof item === 'object' && 'nguonLoai' in item && item.nguonLoai === 'AI_DA_KIEM') {
    item.nguonLoai = 'NGUOI_DUYET';
    count.changed += 1;
  }
}
function walk(node, parentKey, count) {
  if (!node) return count;
  if (Array.isArray(node)) {
    for (const it of node) upgrade(it, count);
    return count;
  }
  // single object (vd phamVi hoặc boPhan)
  upgrade(node, count);
  return count;
}

let totalChanged = 0;
const groups = ['5208', '5309', '6001', '6101', '7117'];
const report = [];

for (const h4 of groups) {
  const p = path.join(DIR, `${h4}.json`);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const count = { changed: 0 };
  for (const k of SCOPED) walk(j[k], k, count);
  // boPhan: nếu là object có nội dung (không null) thì cũng thuộc phạm vi.
  if (j.boPhan && typeof j.boPhan === 'object') {
    walk([j.boPhan], 'boPhan', count);
  }
  totalChanged += count.changed;
  report.push({ h4, changed: count.changed });
  if (!DRY) fs.writeFileSync(p, JSON.stringify(j, null, 1));
}

console.log(`${DRY ? '[DRY] ' : ''}Đổi nguonLoai AI_DA_KIEM → NGUOI_DUYET (chỉ mảng soát): tổng ${totalChanged} mục`);
console.log('Theo nhóm:');
for (const r of report) console.log(`  ${r.h4}: ${r.changed} mục`);
