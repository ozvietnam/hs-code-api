#!/usr/bin/env node
// Test index văn bản pháp luật (data/legal-docs.json) + lib/legal-docs.js
// + cấu trúc data quality report.
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const { getDocByCode, listDocs, enrichLegalCitations } = require('./lib/legal-docs.js');

let passed = 0;
let failed = 0;

function assert(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log('PASS', name);
  } else {
    failed += 1;
    console.error('FAIL', name, detail);
  }
}

// ── legal-docs.json index ────────────────────────────────────────────────────

const idx = JSON.parse(readFileSync(join(root, 'data', 'legal-docs.json'), 'utf8'));
const docs = Object.values(idx.documents || {});

assert('index có ≥ 80 văn bản (từ enriched, không còn 32 stub)', docs.length >= 80, `total=${docs.length}`);
assert('mọi doc có code + type + issuer + url + status',
  docs.every((d) => d.code && d.type && d.issuer && d.url && d.status));
assert('mọi doc có citedInHsCount ≥ 1 + scopeHsChapters không rỗng',
  docs.every((d) => d.citedInHsCount >= 1 && Array.isArray(d.scopeHsChapters) && d.scopeHsChapters.length > 0));
assert('key document đã normalize (không còn Đ)',
  Object.keys(idx.documents).every((k) => !k.includes('Đ')));
assert('doc trích dẫn nhiều nhất ≥ 1000 mã (42/2019/TT-BCT)',
  docs.some((d) => d.citedInHsCount >= 1000));
assert('severityMax là enum hợp lệ',
  docs.every((d) => ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(d.severityMax)));

// ── lib/legal-docs.js trên index mới ────────────────────────────────────────

const lookup = getDocByCode('211/2025/NĐ-CP');
assert('getDocByCode normalize NĐ → ND', lookup && lookup.code === '211/2025/ND-CP',
  JSON.stringify(lookup));
assert('listDocs filter chapter 85 non-empty', listDocs({ chapter: '85' }).length > 0);
assert('listDocs filter issuer BYT non-empty', listDocs({ issuer: 'BYT' }).length > 0);

const cites = enrichLegalCitations('Theo 08/2023/TT-BCT hàng cần giấy phép NK');
assert('enrichLegalCitations resolve doc từ text',
  cites.length === 1 && cites[0].code === '08/2023/TT-BCT' && cites[0].type === 'Thông tư',
  JSON.stringify(cites));

// ── data-quality-report.json ─────────────────────────────────────────────────

const reportPath = join(root, 'data', 'data-quality-report.json');
assert('data-quality-report.json tồn tại (npm run data:quality-report)', existsSync(reportPath));
if (existsSync(reportPath)) {
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  assert('report có stats + findings', !!report.stats && !!report.findings);
  assert('stats.taxRows > 11000', report.stats.taxRows > 11000, `taxRows=${report.stats.taxRows}`);
  assert('enriched coverage 100%', report.stats.enrichedCoveragePct === 100,
    `coverage=${report.stats.enrichedCoveragePct}`);
  assert('không có category ERROR nào dính lỗi', report.stats.categoriesWithErrors === 0,
    `errors=${report.stats.categoriesWithErrors}`);
  const f = Object.values(report.findings);
  assert('mọi finding có severity + count + samples',
    f.every((x) => ['info', 'warn', 'error'].includes(x.severity) && typeof x.count === 'number' && Array.isArray(x.samples)));
}

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
