#!/usr/bin/env node
// Merge tiêu đề ĐÃ VERIFY (data/legal-doc-titles.json) vào index văn bản
// pháp luật (data/legal-docs.json). Idempotent — chạy lại an toàn.
//
// Nguồn verify là single source of truth; index có thể rebuild từ tax-enriched,
// script này chỉ "sơn" tiêu đề thật + metadata lên các doc đã có trong index.
//
//   node scripts/apply-verified-titles.mjs [--dry-run]

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry-run');

const ISSUER_FULL = {
  CP: 'Chính phủ',
  BCT: 'Bộ Công Thương',
  BTC: 'Bộ Tài chính',
  BYT: 'Bộ Y tế',
  BNNPTNT: 'Bộ Nông nghiệp và Phát triển nông thôn',
  BTTTT: 'Bộ Thông tin và Truyền thông',
  BKHCN: 'Bộ Khoa học và Công nghệ',
  BGTVT: 'Bộ Giao thông vận tải',
  BTNMT: 'Bộ Tài nguyên và Môi trường',
  BXD: 'Bộ Xây dựng',
  BQP: 'Bộ Quốc phòng',
  BCA: 'Bộ Công an',
  QH: 'Quốc hội',
  TTg: 'Thủ tướng Chính phủ',
};

const idxPath = join(root, 'data', 'legal-docs.json');
const titlesPath = join(root, 'data', 'legal-doc-titles.json');

const idx = JSON.parse(readFileSync(idxPath, 'utf8'));
const titlesRaw = JSON.parse(readFileSync(titlesPath, 'utf8'));
const titles = titlesRaw.titles || titlesRaw;
const documents = idx.documents || {};

let applied = 0;
const skipped = [];

for (const [code, t] of Object.entries(titles)) {
  const doc = documents[code];
  if (!doc) {
    skipped.push(code);
    continue;
  }
  if (t.titleVi) doc.titleVi = t.titleVi;
  if (t.url) doc.url = t.url;
  if (t.status) doc.status = t.status;
  if (t.issuedDate) doc.issuedDate = t.issuedDate;
  if (t.effectiveDate) doc.effectiveDate = t.effectiveDate;
  if (t.replaces) doc.replaces = t.replaces;
  if (t.replacedBy) doc.replacedBy = t.replacedBy;
  if (t.domain) doc.domain = t.domain;
  if (t.note) doc.note = t.note;
  // Sửa issuer sai (typo enrichment) — vd 12/2018/TT-BTC → thực là BCT
  if (t.issuerOverride) {
    doc.issuer = t.issuerOverride;
    doc.issuerFullVi = ISSUER_FULL[t.issuerOverride] || doc.issuerFullVi;
  }
  doc.verified = true;
  doc.verifiedSource = t.verifiedSource || 'manual';
  if (t.issuedDate) doc.year = +t.issuedDate.slice(0, 4);
  applied += 1;
}

const verifiedCount = Object.values(documents).filter((d) => d.verified).length;
idx.verifiedTitles = verifiedCount;
idx.verifiedTitlesUpdatedAt = new Date().toISOString().slice(0, 10);

console.log(`Index: ${Object.keys(documents).length} văn bản`);
console.log(`Áp tiêu đề verify: ${applied} (tổng verified trong index: ${verifiedCount})`);
if (skipped.length) console.log(`Bỏ qua (không có trong index): ${skipped.length} → ${skipped.join(', ')}`);

if (DRY) {
  console.log('\n[dry-run] không ghi file.');
} else {
  writeFileSync(idxPath, JSON.stringify(idx, null, 2) + '\n');
  console.log(`\nĐã ghi ${idxPath}`);
}
