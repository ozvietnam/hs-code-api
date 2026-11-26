#!/usr/bin/env node
/**
 * OZV-2369 — Bộ lọc nguồn / EMI line filter (CW4E-20A-S):
 * - Search/từ điển kéo 8543 (không lệch 8421 lọc dầu/xăng)
 * - phanBiet sổ tay 8504↔8543 khớp câu «lọc nguồn…» khi hai nhóm cùng ứng viên
 * - Cuộn cảm/choke riêng lẻ không kích câu lọc nguồn
 */
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { searchCandidates } = require('../lib/search-utils.js');
const H = require('../lib/hoi-theo-so-tay.js');
const { expandSearchQuery } = require('../lib/search-query-expand.js');

const MO_TA = 'lọc nguồn 20a loại 1 pha cw4e-20a-s';
const UNG = ['8543', '8504', '8536', '8421'];

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
  const hints = ex.hintGroups4 || ex.groupHints || ex.hs4Hints || [];
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

check('cauPhanBietNhom từ 8543/8504 hỏi lọc nguồn → 8543 / cuộn cảm → 8504', () => {
  const a = H.cauPhanBietNhom('8543', UNG, MO_TA);
  const b = H.cauPhanBietNhom('8504', UNG, MO_TA);
  const all = [...a, ...b];
  assert.ok(all.length >= 1, 'phải có ít nhất 1 câu phanBiet');
  const hit = all.find((q) => /lọc nguồn|EMI|nhiễu/i.test(q.questionVi || ''));
  assert.ok(hit, `không thấy câu lọc nguồn/EMI trong ${JSON.stringify(all)}`);
  assert.match(hit.questionVi, /85\.43|8543/);
  assert.match(hit.questionVi, /85\.04|8504/);
  assert.ok(hit.canCu && hit.nguon, 'câu phải có canCu + nguon (L2)');
});

check('cuộn cảm riêng lẻ không kích câu lọc nguồn EMI', () => {
  const moTaChoke = 'cuộn cảm common mode choke ferrite 10mH dùng mạch nguồn';
  const all = [
    ...H.cauPhanBietNhom('8504', UNG, moTaChoke),
    ...H.cauPhanBietNhom('8543', UNG, moTaChoke),
  ];
  const hit = all.find((q) => /lọc nguồn|EMI line|lọc nhiễu EMI/i.test(q.questionVi || ''));
  assert.equal(hit, undefined, `không được hỏi lọc nguồn cho choke: ${JSON.stringify(hit)}`);
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
