#!/usr/bin/env node
// Sinh public/community-data.json — dữ liệu CÔNG KHAI an toàn cho trang cộng đồng.
// CHỈ dữ liệu pháp quy (biểu thuế/văn bản/chú giải). TUYỆT ĐỐI không nhúng tờ khai
// khách hàng (oz-declarations) hay bất kỳ thông tin riêng tư nào.
//
//   node scripts/build-community-data.mjs

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');

const read = (f) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'));
const count = (x) => (Array.isArray(x) ? x.length : Object.keys(x || {}).length);

const tax = read('tax.json');
const taxRows = Array.isArray(tax) ? tax : Object.values(tax);
const enriched = read('tax-enriched.json');
const enrichedRows = Array.isArray(enriched) ? enriched : Object.values(enriched);
const legal = read('legal-docs.json');
const legalDocs = Object.values(legal.documents || {});
const notes = read('notes.json');
const precedents = read('precedents.json');
const conflicts = read('conflicts.json');
const ministries = read('ministries-vn.json');

// Benchmark độ chính xác (public-safe: chỉ số liệu tổng hợp, không có mô tả tờ khai).
let benchmark = null;
try { benchmark = read('accuracy-latest.json'); } catch { /* chưa có thì bỏ qua */ }

// ── Số liệu tổng quan ────────────────────────────────────────────────────────
const stats = {
  hsCodes: taxRows.length,
  policiesEnriched: enrichedRows.length,
  legalDocs: legalDocs.length,
  legalDocsVerified: legalDocs.filter((d) => d.verified).length,
  chapterNotes: count(notes),
  precedents: count(precedents),
  conflicts: count(conflicts),
  ministries: count(ministries),
};

// ── Danh sách văn bản pháp luật (chỉ field an toàn, public) ──────────────────
const docs = legalDocs
  .map((d) => ({
    code: d.code,
    type: d.type,
    issuer: d.issuer,
    issuerFullVi: d.issuerFullVi,
    titleVi: d.titleVi,
    status: d.status,
    verified: !!d.verified,
    url: d.url,
    year: d.year || null,
    citedInHsCount: d.citedInHsCount || 0,
    scopeHsChapters: d.scopeHsChapters || [],
  }))
  .sort((a, b) => b.citedInHsCount - a.citedInHsCount);

const out = {
  generatedAt: new Date().toISOString(),
  stats,
  benchmark,
  legalDocs: docs,
  meta: {
    note: 'Dữ liệu công khai phục vụ cộng đồng XNK. Không chứa thông tin khách hàng.',
    repo: 'https://github.com/ozvietnam/hs-code-api',
  },
};

const outPath = join(root, 'public', 'community-data.json');
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log('Đã ghi', outPath);
console.log('Stats:', JSON.stringify(stats));
console.log('Văn bản:', docs.length, '(verified', stats.legalDocsVerified + ')');
