#!/usr/bin/env node
/**
 * OZV-2369 — Bộ lọc nguồn / EMI line filter (CW4E-20A-S):
 * - Search/từ điển kéo 8543 (không lệch 8421 lọc dầu/xăng)
 * - Không khai phanBiet 8504↔8543 (không có đoạn trích đồng thời cả hai mã trong luật gốc)
 * - verifySoTay 8504 + 8543 sạch loai
 */
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { searchCandidates } = require('../lib/search-utils.js');
const { expandSearchQuery } = require('../lib/search-query-expand.js');
const { verifySoTay } = require('../lib/so-tay.js');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MO_TA = 'lọc nguồn 20a loại 1 pha cw4e-20a-s';

function loadSoTay(h4) {
  return JSON.parse(readFileSync(join(ROOT, 'data', 'so-tay', `${h4}.json`), 'utf8'));
}

function topHs(q, n = 10) {
  const r = searchCandidates(q, { limit: n });
  const arr = r.candidates || r.results || r || [];
  const list = Array.isArray(arr) ? arr : arr.items || [];
  return list.map((x) => String(x.hs || x.hsCode || ''));
}

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL ${name}: ${e.message}`);
  }
}

check('expandSearchQuery gắn gợi ý nhóm 8543 cho «lọc nguồn»', () => {
  const ex = expandSearchQuery(MO_TA);
  const blob = JSON.stringify(ex);
  assert.ok(blob.includes('8543'), `expand phải gợi 8543, được: ${blob.slice(0, 400)}`);
});

check('searchCandidates top có 85437090, không để 8421 thắng', () => {
  const hs = topHs(MO_TA, 15);
  assert.ok(hs.some((h) => h.startsWith('8543')), `thiếu 8543 trong ${hs.join(',')}`);
  assert.equal(hs[0].slice(0, 4), '8543', `top phải 8543, được ${hs[0]}`);
  const i8421 = hs.findIndex((h) => h.startsWith('8421'));
  const i8543 = hs.findIndex((h) => h.startsWith('8543'));
  if (i8421 >= 0) assert.ok(i8543 < i8421, `8543 phải trước 8421: ${hs.join(',')}`);
});

check('verifySoTay 8543 không loai', () => {
  const r = verifySoTay(loadSoTay('8543'), '8543');
  assert.equal(r.loai.length, 0, `loai: ${JSON.stringify(r.loai)}`);
});

check('verifySoTay 8504 không loai', () => {
  const r = verifySoTay(loadSoTay('8504'), '8504');
  assert.equal(r.loai.length, 0, `loai: ${JSON.stringify(r.loai)}`);
});

check('ổn định search 3 lần cùng câu', () => {
  const runs = [1, 2, 3].map(() => topHs(MO_TA, 5).join('|'));
  assert.equal(runs[0], runs[1], `lần 1≠2: ${runs[0]} vs ${runs[1]}`);
  assert.equal(runs[1], runs[2], `lần 2≠3: ${runs[1]} vs ${runs[2]}`);
  assert.ok(runs[0].startsWith('8543'), runs[0]);
});

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nOK loc-nguon-emi');
process.exit(0);
