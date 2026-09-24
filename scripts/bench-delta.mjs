#!/usr/bin/env node
/**
 * Benchmark holdout CHÍNH XÁC nhưng chỉ chấm lại bản ghi bị ảnh hưởng.
 *
 * Bài toán: bench:aliases chạy đủ 763 tờ khai mất ~11 phút. Trong vòng lặp
 * từ điển, mỗi nhóm 4 số phải chạy một lần — agent bắt đầu cắt --limit=200
 * (đã xảy ra ở commit 5fcb947) và tập con từng cho kết luận ngược tập đủ.
 *
 * Nhận xét làm nên script này: một mục từ điển chỉ tác động lên câu CHỨA một
 * cụm của nó (lib/trade-synonyms.js khớp cụm nguyên; không khớp thì mục không
 * bơm ứng viên, không loại mã bẫy). Vì thế khi chỉ trade-synonyms.json đổi,
 * bản ghi không chứa cụm nào của mục đã thêm/sửa/xoá thì kết quả KHÔNG THỂ đổi
 * — lấy lại từ cache là đúng tuyệt đối, không phải xấp xỉ.
 *
 * Khi thứ khác đổi (lib/, tax.json, hs-aliases, mechanisms, numericTermContext…)
 * thì mọi bản ghi đều có thể đổi → chạy đủ, ghi cache mới. Cache nằm ở
 * data/.bench-cache/ (gitignored) vì nó chứa mã thật của tờ khai giữ riêng.
 *
 * "TRƯỚC" là gì: là kết quả của từ điển ĐÃ COMMIT (bản trong git HEAD), không
 * phải lần chấm gần nhất. Agent sửa đi sửa lại mười lần thì cả mười lần đều so
 * với mốc đã commit — không có chuyện "lần này giảm so với lần thử sai trước".
 * Khi từ điển đang làm việc trùng bản HEAD, mốc được ghi lại từ lần chấm đó.
 *
 *   npm run bench:delta                 # so với mốc HEAD; chưa có cache thì chạy đủ (một lần)
 *   npm run bench:delta -- --full       # ép chạy đủ và ghi cache
 */
import './test-isolate-data.mjs';
import { createHash } from 'crypto';
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { isHeldOut } from './build-hs-aliases.mjs';
import { ROOT, THESAURUS_PATH, norm } from './dict-lib.mjs';

const require = createRequire(import.meta.url);
const GOLD = join(ROOT, 'data', 'oz-gold-final.jsonl');
const CACHE_DIR = join(ROOT, 'data', '.bench-cache');
const CACHE = join(CACHE_DIR, 'holdout.json');
const argv = process.argv.slice(2);
const forceFull = argv.includes('--full');
const DEPTHS = [2, 4, 6, 8];

if (!existsSync(GOLD)) {
  console.error('Không thấy data/oz-gold-final.jsonl — không chấm được.');
  process.exit(1);
}

/* ---------- tập chấm: y hệt benchmark-alias-holdout.mjs ---------- */
const aliasMeta = require(join(ROOT, 'data', 'hs-aliases.json')).meta;
const holdout = aliasMeta?.holdout;
if (!holdout?.excludedRecords) {
  console.error('data/hs-aliases.json không có tập giữ riêng — chạy npm run data:build-aliases.');
  process.exit(1);
}
const all = readFileSync(GOLD, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const items = all
  .filter((g) => isHeldOut(g, holdout.ratio, holdout.seed))
  .map((g) => ({ desc: String(g.sampleDesc || '').trim(), truth: String(g.hsCode).replace(/\D/g, '') }))
  .filter((it) => it.desc.length >= 20 && it.truth.length === 8);

/* ---------- dấu vân tay của mọi thứ ảnh hưởng tìm kiếm, TRỪ từ điển ---------- */
function sha(buf) {
  return createHash('sha1').update(buf).digest('hex');
}
function codeFingerprint() {
  const h = createHash('sha1');
  const libDir = join(ROOT, 'lib');
  const libFiles = readdirSync(libDir).filter((f) => f.endsWith('.js') || f.endsWith('.mjs')).sort();
  const dataFiles = new Set();
  for (const f of libFiles) {
    const src = readFileSync(join(libDir, f), 'utf8');
    h.update(f).update(src);
    // bắt cả require('../data/x.json') — trước đây dấu '/' làm lọt 3 tệp từ điển
    for (const m of src.matchAll(/['"`](?:[\w./-]*\/)?([\w.-]+\.json)['"`]/g)) dataFiles.add(m[1]);
  }
  dataFiles.delete('trade-synonyms.json');
  for (const f of [...dataFiles].sort()) {
    const p = join(ROOT, 'data', f);
    if (existsSync(p)) h.update(f).update(readFileSync(p));
  }
  // Bảng quyết định đổi kết quả tìm kiếm (lá được chốt lên đầu) → tính vào vân tay.
  const tablesDir = join(ROOT, 'data', 'decision-tables');
  if (existsSync(tablesDir)) {
    for (const f of readdirSync(tablesDir).filter((x) => x.endsWith('.json')).sort()) h.update(f).update(readFileSync(join(tablesDir, f)));
  }
  h.update('gold').update(readFileSync(GOLD));
  return h.digest('hex');
}

/* ---------- ảnh chụp từ điển để biết mục nào đổi ---------- */
const thesaurus = JSON.parse(readFileSync(THESAURUS_PATH, 'utf8'));
function snapshot(t) {
  const entries = {};
  for (const e of t.entries) entries[e.id] = { terms: (e.terms || []).map(norm), hash: sha(JSON.stringify(e)) };
  return { context: sha(JSON.stringify(t.numericTermContext || [])), entries };
}
const snapNow = snapshot(thesaurus);
const workingHash = sha(readFileSync(THESAURUS_PATH));
let headHash = null;
try {
  headHash = sha(execFileSync('git', ['show', 'HEAD:data/trade-synonyms.json'], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }));
} catch {
  headHash = null; // không có git — coi lần chấm gần nhất là mốc
}
const workingIsCommitted = headHash !== null && headHash === workingHash;

/* ---------- chấm ---------- */
function loadSearch() {
  delete require.cache[require.resolve(join(ROOT, 'lib', 'search-utils.js'))];
  return require(join(ROOT, 'lib', 'search-utils.js')).searchCandidates;
}
function scoreOne(searchCandidates, it) {
  return searchCandidates(it.desc, { topCandidates: 3 }).map((c) => c.hsCode);
}
function totals(records) {
  const hit = { top1: {}, top3: {} };
  for (const d of DEPTHS) {
    hit.top1[d] = 0;
    hit.top3[d] = 0;
  }
  for (const r of records) {
    for (const d of DEPTHS) {
      const want = r.truth.slice(0, d);
      if (r.top[0]?.slice(0, d) === want) hit.top1[d]++;
      if (r.top.some((h) => h.slice(0, d) === want)) hit.top3[d]++;
    }
  }
  const pct = (n) => Math.round((n / records.length) * 1000) / 10;
  return {
    top1: Object.fromEntries(DEPTHS.map((d) => [d, pct(hit.top1[d])])),
    top3: Object.fromEntries(DEPTHS.map((d) => [d, pct(hit.top3[d])])),
  };
}

const fp = codeFingerprint();
let cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : null;
// Mốc so sánh: bản đã commit (baseline) nếu có, không thì lần chấm gần nhất.
const ref = cache?.baseline?.records?.length === items.length ? cache.baseline : cache;
const cacheUsable =
  cache && cache.fingerprint === fp && ref?.records?.length === items.length && ref?.snapshot?.context === snapNow.context;

let mode;
let records;
let before = null;
const t0 = Date.now();
process.env.HS_ALIAS_SEARCH = 'on';
const searchCandidates = loadSearch();

if (forceFull || !cacheUsable) {
  mode = forceFull ? 'ĐỦ (ép --full)' : cache ? 'ĐỦ (mã/data ngoài từ điển đã đổi → cache vô hiệu)' : 'ĐỦ (chưa có cache)';
  console.log(`\n=== bench:delta — chạy ${mode}, ${items.length} tờ khai ===`);
  records = items.map((it) => ({ truth: it.truth, top: scoreOne(searchCandidates, it) }));
  if (cache && cache.fingerprint === fp) before = totals(ref.records);
} else {
  // Mục nào đổi? Lấy HỢP các cụm cũ + mới của mục đó — câu chứa bất kỳ cụm nào là "bị chạm".
  const touchedTerms = new Set();
  const changed = [];
  const ids = new Set([...Object.keys(ref.snapshot.entries), ...Object.keys(snapNow.entries)]);
  for (const id of ids) {
    const a = ref.snapshot.entries[id];
    const b = snapNow.entries[id];
    if (a && b && a.hash === b.hash) continue;
    changed.push(`${id}${!a ? ' (mới)' : !b ? ' (xoá)' : ''}`);
    for (const t of [...(a?.terms || []), ...(b?.terms || [])]) if (t) touchedTerms.add(t);
  }
  const affected = [];
  const normDesc = items.map((it) => ` ${norm(it.desc)} `);
  for (let i = 0; i < items.length; i++) {
    for (const t of touchedTerms) {
      if (normDesc[i].includes(` ${t} `)) {
        affected.push(i);
        break;
      }
    }
  }
  mode = `DELTA so với ${ref === cache.baseline ? 'bản đã commit' : 'lần chấm trước'} — ${changed.length} mục đổi, ${affected.length}/${items.length} tờ khai bị chạm`;
  console.log(`\n=== bench:delta — ${mode} ===`);
  if (changed.length) console.log(`   mục: ${changed.join(', ')}`);
  records = ref.records.map((r) => ({ ...r }));
  before = totals(ref.records);
  for (const i of affected) records[i] = { truth: items[i].truth, top: scoreOne(searchCandidates, items[i]) };
  const moved = affected.filter((i) => ref.records[i].top[0] !== records[i].top[0]);
  if (moved.length) {
    console.log(`   top-1 đổi ở ${moved.length} tờ khai:`);
    for (const i of moved.slice(0, 20)) {
      const ok = (h) => (h?.slice(0, 8) === items[i].truth ? '✓' : h?.slice(0, 4) === items[i].truth.slice(0, 4) ? '~' : '✗');
      console.log(
        `     #${i} đúng ${items[i].truth}: ${ref.records[i].top[0] || '-'} ${ok(ref.records[i].top[0])} → ${records[i].top[0] || '-'} ${ok(records[i].top[0])}`
      );
    }
  }
}

const after = totals(records);
const LABEL = { 2: 'Đúng chương (2 số)', 4: 'Đúng nhóm  (4 số)', 6: 'Đúng phân nhóm (6 số)', 8: 'Đúng đủ mã (8 số)' };
let regressed = [];
for (const key of ['top1', 'top3']) {
  console.log(`\n--- ${key === 'top1' ? 'Top-1' : 'Top-3'} ---`);
  console.log('  Mức độ                 trước     sau     chênh');
  for (const d of DEPTHS) {
    const b = before ? before[key][d] : null;
    const a = after[key][d];
    const diff = b == null ? null : Math.round((a - b) * 10) / 10;
    const flag = diff != null && diff < 0 ? '  ⚠ GIẢM' : '';
    if (diff != null && diff < 0) regressed.push(`${key} ${d} số`);
    console.log(
      `  ${LABEL[d].padEnd(22)} ${b == null ? '    -' : String(b).padStart(5) + '%'}  ${String(a).padStart(6)}%  ${
        diff == null ? '      -' : ((diff > 0 ? '+' : '') + diff).padStart(7)
      }${flag}`
    );
  }
}
console.log(`\n(${Math.round((Date.now() - t0) / 100) / 10}s)`);

mkdirSync(CACHE_DIR, { recursive: true });
const baseline = workingIsCommitted
  ? { thesaurusHash: workingHash, snapshot: snapNow, records }
  : cache?.fingerprint === fp && cache?.baseline
    ? cache.baseline
    : null;
writeFileSync(
  CACHE,
  JSON.stringify({ updatedAt: new Date().toISOString(), fingerprint: fp, snapshot: snapNow, records, baseline })
);
if (workingIsCommitted) console.log('(từ điển trùng bản HEAD → ghi làm mốc so sánh)');

if (regressed.length) {
  console.log(`\n❌ GIẢM so với lần chấm trước ở: ${regressed.join(', ')}. Mục của bạn đang đè lên tiền lệ thật.`);
  process.exit(1);
}
console.log(before ? '\n✅ Không mức nào giảm.' : '\n✅ Đã ghi cache; lần sau chỉ chấm lại bản ghi bị chạm.');
