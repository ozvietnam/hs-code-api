#!/usr/bin/env node
// Rà soát các mã có cột `vat` rỗng trong data/tax.json và nhóm theo chương.
// Kết quả: xác nhận toàn bộ mã thiếu VAT thuộc Chương 98 (mã ưu đãi riêng),
// VAT khai theo mã gốc Ch.1–97 nên rỗng là đúng bản chất.
//
//   node scripts/report-vat-missing.mjs [--json]

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const AS_JSON = process.argv.includes('--json');

const tax = JSON.parse(readFileSync(join(root, 'data', 'tax.json'), 'utf8'));
const rows = Object.values(tax);

const missing = rows.filter((r) => !r.vat || String(r.vat).trim() === '');
const byChapter = {};
for (const r of missing) {
  const ch = String(r.hs).slice(0, 2);
  (byChapter[ch] = byChapter[ch] || []).push(r);
}

const ch98 = missing.filter((r) => String(r.hs).slice(0, 2) === '98');
const ch98NoMfn = ch98.filter((r) => !r.mfn || String(r.mfn).trim() === '');

const summary = {
  totalRows: rows.length,
  missingVat: missing.length,
  chaptersAffected: Object.keys(byChapter).sort(),
  chapter98: ch98.length,
  chapter98WithMfn: ch98.length - ch98NoMfn.length,
  chapter98NoMfn: ch98NoMfn.length,
  missingOutsideCh98: missing.length - ch98.length,
};

if (AS_JSON) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`Tổng mã: ${summary.totalRows}`);
  console.log(`Thiếu VAT (rỗng): ${summary.missingVat}`);
  console.log(`Chương bị ảnh hưởng: ${summary.chaptersAffected.join(', ')}`);
  console.log(`Chương 98: ${summary.chapter98} (có MFN: ${summary.chapter98WithMfn}, thiếu MFN: ${summary.chapter98NoMfn})`);
  console.log(`Thiếu VAT ngoài Ch.98: ${summary.missingOutsideCh98}`);
  console.log(
    summary.missingOutsideCh98 === 0 && summary.chapter98NoMfn === 0
      ? '\n=> KẾT LUẬN: 100% mã thiếu VAT thuộc Ch.98 (mã ưu đãi riêng), đều có MFN. VAT rỗng là đúng bản chất, không phải lỗi.'
      : '\n=> Có mã thiếu VAT ngoài Ch.98 hoặc Ch.98 thiếu MFN — cần rà soát thêm.'
  );
}
