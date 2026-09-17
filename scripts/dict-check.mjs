#!/usr/bin/env node
/**
 * MỘT lệnh nghiệm thu một nhóm 4 số — agent chạy trước khi commit, CEO chạy khi
 * nhận hàng. Gộp mọi cửa kiểm mà trước đây nằm rải rác (và bị bỏ qua):
 *
 *   1. schema + mã chết + phanh              (scripts/test-trade-synonyms.mjs)
 *   2. phủ 100% lá của nhóm                  (dict-coverage)
 *   3. LINT chất lượng mục — bài học từ 7 nhóm đầu:
 *        a. whenVi chép nguyên tên dòng biểu thuế  → vô nghĩa, người tra đã thấy tên dòng
 *        b. cụm mất dấu trùng chữ khác nghĩa      → "tủ điện" khớp "tụ điện" (đã phải vá a887c05)
 *        c. mục ôm quá nhiều lá                  → "van công nghiệp" bơm 16 mã điểm bằng nhau
 *        d. high mà nhiều ứng viên               → chặn alias tiền lệ thật
 *   4. ca search cho từng mục của nhóm      (tests/search-cases.json + test-search)
 *   5. benchmark holdout delta               (bench:delta — chính xác, tính bằng giây)
 *
 *   npm run dict:check -- 8481
 *   npm run dict:check -- 8481 --strict     # coi cảnh báo lint là lỗi (mặc định cho nhóm CHƯA done)
 *   npm run dict:check -- 8481 --no-bench   # bỏ bước 5 khi đang soạn dở
 *
 * Nhóm đã done trong sổ tiến độ chỉ bị CẢNH BÁO ở bước 3 — nợ cũ ghi nhận, không
 * chặn người sau. Nhóm mới thì lint là điều kiện nhận.
 */
import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ROOT, coverageOf, isHeading, leavesOf, loadProgress, loadTax, loadThesaurus, norm } from './dict-lib.mjs';

const argv = process.argv.slice(2);
const heading = argv.find(isHeading);
if (!heading) {
  console.error('Cách dùng: node scripts/dict-check.mjs <nhóm 4 số> [--strict] [--no-bench]');
  process.exit(2);
}
const tax = loadTax();
const thesaurus = loadThesaurus();
const progress = loadProgress();
const isDone = progress.headings?.[heading]?.status === 'done';
const strict = argv.includes('--strict') || !isDone;

let failed = 0;
let warned = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  failed++;
  console.log(`  ✗ ${m}`);
};
const warn = (m) => {
  if (strict) bad(m);
  else {
    warned++;
    console.log(`  ⚠ ${m}`);
  }
};
function run(label, args) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
  const tail = (r.stdout || '').trim().split('\n').slice(-3).join(' | ');
  if (r.status === 0) ok(`${label} — ${tail}`);
  else {
    bad(`${label}`);
    console.log((r.stdout || '') + (r.stderr || ''));
  }
  return r.status === 0;
}

console.log(`\n=== dict:check ${heading} — ${isDone ? 'đã done (lint chỉ cảnh báo)' : 'nhóm mới (lint = điều kiện nhận)'} ===`);

console.log('\n[1] Schema, mã chết, phanh');
run('test-trade-synonyms', ['scripts/test-trade-synonyms.mjs']);

console.log('\n[2] Phủ 100% lá');
const leaves = leavesOf(tax, heading);
const cov = coverageOf(heading, tax, thesaurus);
if (!leaves.length) bad(`nhóm ${heading} không có trong biểu thuế`);
else if (cov.missingHs.length) {
  bad(`còn ${cov.missingHs.length}/${cov.leafCount} lá chưa có mục nào: ${cov.missingHs.slice(0, 10).join(', ')}${cov.missingHs.length > 10 ? '…' : ''}`);
} else ok(`${cov.coveredCount}/${cov.leafCount} lá, ${cov.synonymEntryIds.length} mục`);

/* mục thuộc nhóm = có ít nhất một ứng viên trong nhóm */
const entries = thesaurus.entries.filter((e) => (e.candidates || []).some((c) => c.hs.startsWith(heading)));
const primary = thesaurus.entries.filter((e) => (e.candidates?.[0]?.hs || '').startsWith(heading));

console.log(`\n[3] Lint chất lượng — ${entries.length} mục chạm nhóm`);
{
  // a. whenVi chép tên dòng
  for (const e of entries) {
    const copied = (e.candidates || []).filter((c) => {
      if (!c.hs.startsWith(heading)) return false;
      const vn = norm(tax[c.hs]?.vn).replace(/^(-\s*)+/, '');
      const w = norm(c.whenVi).replace(/^(-\s*)+/, '');
      if (!vn || !w) return false;
      return w === vn || w.startsWith(vn) || vn.startsWith(w) && w.length >= 12;
    });
    if (copied.length) warn(`${e.id}: whenVi chép nguyên tên dòng ở ${copied.length} ứng viên (${copied.slice(0, 3).map((c) => c.hs).join(', ')}) — viết ĐIỀU KIỆN người khai phân biệt được, không chép biểu thuế`);
  }
  // b. cụm mất dấu trùng chữ khác nghĩa
  const rows = Object.entries(tax).filter(([k]) => /^\d{8}$/.test(k)).map(([k, v]) => ({ k, raw: String(v.vn || '').toLowerCase(), n: ` ${norm(v.vn)} ` }));
  for (const e of entries) {
    const myHeads = new Set((e.candidates || []).map((c) => c.hs.slice(0, 4)));
    for (const t of e.terms || []) {
      const key = norm(t);
      if (!key || /^\d+$/.test(key)) continue;
      const rawKey = String(t).toLowerCase().trim();
      const hasDia = rawKey !== key;
      if (!hasDia) continue;
      const collide = rows.filter((r) => !myHeads.has(r.k.slice(0, 4)) && r.n.includes(` ${key} `) && !r.raw.includes(rawKey));
      if (collide.length) warn(`${e.id}: cụm "${t}" bỏ dấu trùng chữ khác nghĩa ở ${collide.length} dòng ngoài nhóm (vd ${collide[0].k} "${collide[0].raw.slice(0, 50)}") — đổi cụm dài hơn hoặc thêm excludeIfAny`);
    }
  }
  // c. mục ôm quá nhiều lá
  for (const e of entries) {
    const n = (e.candidates || []).length;
    if (n > 12) warn(`${e.id}: ${n} ứng viên trong một mục — người tra nhận ${n} mã điểm bằng nhau; tách theo tên thương mại thật hoặc để parser chọn theo thông số`);
  }
  // d. high mà nhiều ứng viên
  for (const e of entries) {
    const highs = (e.candidates || []).filter((c) => c.confidence === 'high').length;
    if (highs && (e.candidates || []).length > 1 && highs > 1) warn(`${e.id}: ${highs} ứng viên high trong mục nhiều ứng viên — chỉ high khi biểu thuế gọi đích danh một dòng`);
  }
  // e. mọi mục phải có avoid hoặc excludeIfAny (đã nghĩ tới mã bẫy)
  for (const e of primary) {
    if (!(e.avoid || []).length && !(e.excludeIfAny || []).length) warn(`${e.id}: không có avoid lẫn excludeIfAny — bước 3 (tìm mã bẫy) chưa làm`);
  }
  if (!failed && !warned) ok('không có cảnh báo');
}

console.log('\n[4] Ca search cho từng mục');
{
  const cases = JSON.parse(readFileSync(join(ROOT, 'tests', 'search-cases.json'), 'utf8'));
  const list = Array.isArray(cases) ? cases : cases.cases || [];
  const inHeading = list.filter((c) => c.topHsPrefix && (c.topHsPrefix.startsWith(heading) || heading.startsWith(c.topHsPrefix)));
  // mục nào có ít nhất một ca mà câu chứa một cụm của nó
  const missing = [];
  for (const e of primary) {
    const keys = (e.terms || []).map(norm).filter(Boolean);
    const hit = inHeading.some((c) => {
      const q = ` ${norm(c.query)} `;
      return keys.some((k) => q.includes(` ${k} `));
    });
    if (!hit) missing.push(e.id);
  }
  if (!primary.length) ok('nhóm không có mục chính nào (mọi mục đều lấy nhóm này làm ứng viên phụ)');
  else if (missing.length) warn(`${missing.length}/${primary.length} mục chưa có ca search nào gõ đúng cụm của nó: ${missing.join(', ')}`);
  else ok(`${inHeading.length} ca cho ${primary.length} mục chính`);
  run('test-search', ['scripts/test-search.mjs']);
}

if (!argv.includes('--no-bench')) {
  console.log('\n[5] Benchmark holdout (delta)');
  run('bench:delta', ['scripts/bench-delta.mjs']);
} else console.log('\n[5] Benchmark — BỎ QUA (--no-bench). Không được commit khi chưa chạy.');

console.log(`\n${failed ? `❌ ${failed} lỗi` : '✅ đạt'}${warned ? ` · ${warned} cảnh báo (nợ cũ của nhóm đã done)` : ''} — ${heading}\n`);
process.exit(failed ? 1 : 0);
