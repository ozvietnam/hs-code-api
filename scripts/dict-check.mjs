#!/usr/bin/env node
/**
 * MỘT lệnh nghiệm thu một nhóm 4 số — agent chạy trước khi commit, CEO chạy khi
 * nhận hàng. Chuẩn 2026-09-17: đơn vị việc là BẢNG QUYẾT ĐỊNH theo thuộc tính
 * (data/decision-tables/<nhóm>.json) phân giải được MỌI lá của nhóm; từ điển tên
 * chỉ cần đưa hàng tới nhóm.
 *
 *   [1] test-decision-tables + test-trade-synonyms   (cấu trúc, mã chết, phanh)
 *   [2] bảng của nhóm: có, hợp lệ, mọi lá có đường tới
 *   [3] lint chất lượng bảng + mục từ điển chạm nhóm
 *   [4] tests/decision-cases.json: mọi lá có ca chốt ra nó; ca search cho mục từ điển
 *   [4b] DỮ LIỆU THẬT: cụm tờ khai Oz của nhóm chốt ≥ 50 % (không Oz: ca câu chữ ≥ 60 % lá)
 *   [5] benchmark holdout delta
 *
 *   npm run dict:check -- 8536
 *   npm run dict:check -- 8536 --no-bench      # khi đang soạn dở; không được commit khi chưa chạy
 *
 * Nhóm đã `done` chỉ bị CẢNH BÁO ở [3]/[4]; nhóm mới thì đó là điều kiện nhận.
 */
import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { ROOT, isHeading, leavesOf, loadProgress, loadTax, loadThesaurus, norm } from './dict-lib.mjs';

const require = createRequire(import.meta.url);
const dt = require(join(ROOT, 'lib', 'decision-tables.js'));
const { parseCommodityQuery } = require(join(ROOT, 'lib', 'query-parse.js'));

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
  const tail = (r.stdout || '').trim().split('\n').filter(Boolean).slice(-1).join(' ');
  if (r.status === 0) ok(`${label} — ${tail}`);
  else {
    bad(label);
    console.log((r.stdout || '').split('\n').filter((l) => /✗|❌/.test(l)).join('\n') + (r.stderr || ''));
  }
  return r.status === 0;
}

console.log(`\n=== dict:check ${heading} — ${isDone ? 'đã done (lint chỉ cảnh báo)' : 'nhóm mới (lint = điều kiện nhận)'} ===`);

console.log('\n[1] Cấu trúc, mã chết, phanh');
run('test-decision-tables', ['scripts/test-decision-tables.mjs']);
run('test-trade-synonyms', ['scripts/test-trade-synonyms.mjs']);

console.log('\n[2] Bảng quyết định của nhóm');
const leaves = leavesOf(tax, heading);
const cov = dt.tableCoverage(heading, tax);
const table = dt.loadTable(heading);
if (!leaves.length) bad(`nhóm ${heading} không có trong biểu thuế`);
else if (!cov.hasTable) bad(`chưa có data/decision-tables/${heading}.json — chạy: npm run dict:table -- ${heading} --init`);
else {
  const errors = dt.validateTable(table, tax);
  if (errors.length) bad(`cấu trúc: ${errors.slice(0, 6).join(' | ')}`);
  else ok(`cấu trúc hợp lệ: ${table.inputs.length} thuộc tính, ${table.rules.length} luật`);
  if (cov.missingHs.length) bad(`${cov.missingHs.length}/${leaves.length} lá chưa có đường tới: ${cov.missingHs.slice(0, 10).join(', ')}${cov.missingHs.length > 10 ? '…' : ''}`);
  else ok(`mọi lá có đường tới (${cov.covered.length}/${leaves.length})`);
  if (cov.badHs.length) bad(`luật trỏ ra ngoài nhóm: ${cov.badHs.join(', ')}`);
}

console.log('\n[3] Lint chất lượng');
if (table) {
  if (!/\?/.test(table.essenceTestVi || '')) warn('essenceTestVi nên là CÂU HỎI bản chất (có dấu ?)');
  for (const inp of table.inputs) {
    if (inp.type === 'enum') {
      const empty = (inp.domain || []).filter((v) => !(inp.detect?.[v] || []).length && inp.assumeIfUnknown !== v);
      if (empty.length) warn(`thuộc tính ${inp.attribute}: giá trị ${empty.join('/')} không có cụm nhận diện — chỉ chốt được khi hỏi`);
    }
    if (inp.type === 'number' && !inp.fromSpec) warn(`thuộc tính số ${inp.attribute} không lấy từ parser (fromSpec) — chỉ chốt được khi hỏi`);
  }
  for (const r of table.rules) if (!r.source) warn(`luật ${r.id}: thiếu source (dòng biểu thuế / chú giải)`);
  const tv = table.verified === true;
  console.log(`  ${tv ? '✓' : '·'} verified: ${tv ? `${table.verifiedBy} ${table.verifiedAt}` : 'chưa — trích dẫn ra người dùng là HEURISTIC cho tới khi CEO duyệt'}`);
}
{
  // Mục từ điển chạm nhóm: cụm va chạm dấu, ứng viên lá quá nhiều (nay dùng cấp nhóm), thiếu mã bẫy.
  const entries = thesaurus.entries.filter((e) => (e.candidates || []).some((c) => String(c.hs).startsWith(heading) || heading.startsWith(String(c.hs))));
  const rows = Object.entries(tax).filter(([k]) => /^\d{8}$/.test(k)).map(([k, v]) => ({ k, raw: String(v.vn || '').toLowerCase(), n: ` ${norm(v.vn)} ` }));
  for (const e of entries) {
    const myHeads = new Set((e.candidates || []).map((c) => String(c.hs).slice(0, 4)));
    for (const t of e.terms || []) {
      const key = norm(t);
      const rawKey = String(t).toLowerCase().trim();
      if (!key || /^\d+$/.test(key) || rawKey === key) continue;
      const collide = rows.filter((r) => !myHeads.has(r.k.slice(0, 4)) && r.n.includes(` ${key} `) && !r.raw.includes(rawKey));
      if (collide.length) warn(`${e.id}: cụm "${t}" bỏ dấu trùng chữ khác nghĩa ở ${collide.length} dòng ngoài nhóm (vd ${collide[0].k}) — câu không dấu vẫn có thể dính; đổi cụm dài hơn`);
    }
    const leafCands = (e.candidates || []).filter((c) => String(c.hs).length === 8);
    if (leafCands.length > 8) warn(`${e.id}: ${leafCands.length} ứng viên lá — tên gọi chỉ tới nhóm; đổi sang một ứng viên cấp nhóm (hs 4/6 số) và để bảng chốt lá`);
    if (!(e.avoid || []).length && !(e.excludeIfAny || []).length) warn(`${e.id}: không có avoid lẫn excludeIfAny — chưa nghĩ tới mã bẫy`);
  }
  ok(`${entries.length} mục từ điển chạm nhóm đã soát`);
}

console.log('\n[4] Ca kiểm');
{
  const cases = JSON.parse(readFileSync(join(ROOT, 'tests', 'decision-cases.json'), 'utf8')).cases.filter((c) => c.heading === heading);
  if (table) {
    let pass = 0;
    for (const c of cases) {
      const r = dt.resolveHeading(heading, { text: c.text || '', parsed: parseCommodityQuery(c.text || ''), facts: c.facts || {} });
      const good = c.expectHs ? r.status === 'RESOLVED' && r.hs === c.expectHs : r.status === 'INSUFFICIENT' && (c.expectAsk || []).every((a) => r.missingFacts.some((m) => m.attribute === a));
      if (good) pass++;
      else bad(`ca ${c.id}: nhận ${r.status} ${r.hs || ''} hỏi ${(r.missingFacts || []).map((m) => m.attribute).join(',')}`);
    }
    if (cases.length) ok(`${pass}/${cases.length} ca quyết định đúng`);
    const hit = new Set(cases.filter((c) => c.expectHs).map((c) => c.expectHs));
    const miss = leaves.filter((hs) => !hit.has(hs));
    if (miss.length) bad(`${miss.length} lá chưa có ca nào chốt ra nó (tests/decision-cases.json): ${miss.slice(0, 8).join(', ')}`);
    else ok('mọi lá có ca chốt ra nó');
    if (!cases.some((c) => c.expectAsk)) warn('chưa có ca "thiếu dữ kiện thì hỏi" (expectAsk) cho nhóm này');
  }
  const sc = JSON.parse(readFileSync(join(ROOT, 'tests', 'search-cases.json'), 'utf8'));
  const inHeading = (Array.isArray(sc) ? sc : sc.cases || []).filter((c) => c.topHsPrefix && (c.topHsPrefix.startsWith(heading) || heading.startsWith(c.topHsPrefix)));
  if (!inHeading.length) warn('chưa có ca search nào (tests/search-cases.json) gõ tên hàng về nhóm này');
  else ok(`${inHeading.length} ca search về nhóm`);
  run('test-search', ['scripts/test-search.mjs']);
}

console.log('\n[4b] Dữ liệu thật — tên hàng trong tờ khai Oz / ca câu chữ');
if (table) {
  const aliases = require(join(ROOT, 'data', 'hs-aliases.json')).aliases || [];
  const allCases = JSON.parse(readFileSync(join(ROOT, 'tests', 'decision-cases.json'), 'utf8')).cases;
  const g = dt.acceptanceGate(heading, { aliases, cases: allCases, taxData: tax, parse: parseCommodityQuery });
  const line = g.mode === 'oz'
    ? `chốt ${g.resolved}/${g.n} cụm tờ khai Oz (${Math.round(g.ratio * 100)}%)${g.disagree.length ? `, LỆCH tiền lệ ${g.disagree.length}` : ''}`
    : `ca câu chữ (không facts) chốt đúng ${g.resolved}/${g.leaves} lá (${Math.round(g.ratio * 100)}%)`;
  if (g.pass) ok(`${line} — ${g.thresholdVi}`);
  else {
    bad(`${line} — cần: ${g.thresholdVi}`);
    if (g.mode === 'oz') {
      for (const u of g.unresolved.slice(0, 8)) console.log(`      ${String(u.count).padStart(4)}×  ${u.phrase.padEnd(32)} → hỏi ${u.ask.join('/')}`);
      for (const d of g.disagree.slice(0, 5)) console.log(`      LỆCH  ${d.phrase}: bảng ${d.table} / Oz ${d.oz} ×${d.count}`);
      console.log(`      (npm run dict:table -- ${heading} --oz để xem đủ)`);
    } else {
      for (const w of g.wrong.slice(0, 5)) console.log(`      ${w.id}: "${w.text}" → ${w.got}`);
      if (g.missingLeaves.length) console.log(`      lá chưa có ca câu chữ chốt ra: ${g.missingLeaves.slice(0, 10).join(', ')}`);
    }
  }
}

if (!argv.includes('--no-bench')) {
  console.log('\n[5] Benchmark holdout (delta)');
  run('bench:delta', ['scripts/bench-delta.mjs']);
} else console.log('\n[5] Benchmark — BỎ QUA (--no-bench). Không được commit khi chưa chạy.');

console.log(`\n${failed ? `❌ ${failed} lỗi` : '✅ đạt'}${warned ? ` · ${warned} cảnh báo` : ''} — ${heading}\n`);
process.exit(failed ? 1 : 0);
