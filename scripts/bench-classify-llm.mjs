#!/usr/bin/env node
// Đo bước chọn mã (/api/classify lõi) bằng AI THẬT — so bản cũ/bản mới trên cùng dữ liệu.
//   --lib=<thư mục lib>   bản code cần đo (mặc định ../lib)
//   --set=gold            tờ khai Oz giữ riêng (có đáp án): --limit=80 --seed=7
//   --set=file --from=x.json   món thật [{id,titleZh,specs,facts?,truth?}]
//   --facts               (set=file) gửi kèm dữ kiện phiếu hồ sơ nếu có
//   --concurrency=4 --out=kq.json
// Chỉ số: đúng 4/8 số (mã đầu), đúng 8 số trong 3 mã, "tự tin ≥80 mà sai", tỉ lệ mã đầu thiếu căn cứ.
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const argv = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const here = dirname(fileURLToPath(import.meta.url));
const libDir = argv.lib || join(here, '..', 'lib');
const require = createRequire(join(libDir, 'x.js'));
const { classify } = require(join(libDir, 'classify.js'));
const conc = Number(argv.concurrency || 4);

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

let items;
if (argv.set === 'gold') {
  const root = join(libDir, '..');
  const { isHeldOut } = await import(join(root, 'scripts', 'build-hs-aliases.mjs'));
  const meta = JSON.parse(readFileSync(join(root, 'data', 'hs-aliases.json'), 'utf8')).meta.holdout;
  const all = readFileSync(join(root, 'data', 'oz-gold-final.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    .filter((g) => isHeldOut(g, meta.ratio, meta.seed))
    .map((g) => ({ id: String(g.hsCode) + ':' + String(g.sampleDesc).slice(0, 20), tenHang: String(g.sampleDesc || '').trim(), truth: String(g.hsCode).replace(/\D/g, '') }))
    .filter((x) => x.tenHang.length >= 20 && x.truth.length === 8);
  const r = rng(Number(argv.seed || 7));
  items = all.map((x) => [r(), x]).sort((a, b) => a[0] - b[0]).slice(0, Number(argv.limit || 80)).map((p) => p[1]);
} else {
  items = JSON.parse(readFileSync(argv.from, 'utf8')).map((x) => ({ id: x.id, tenHang: x.titleZh, nameZh: x.titleZh, specs: x.specs, facts: argv.facts ? (x.facts || []) : undefined, truth: x.truth || null }));
}

const out = [];
let next = 0;
async function worker() {
  while (next < items.length) {
    const it = items[next++];
    const t = Date.now();
    try {
      const attrs = { tenHang: it.tenHang, nameZh: it.nameZh || null, specs: it.specs || null, ...(it.facts ? { facts: it.facts } : {}) };
      const res = await classify(attrs, {});
      const rs = res.results || [];
      out.push({ id: it.id, truth: it.truth, top: rs[0]?.hs || null, conf: rs[0]?.confidence ?? null, grounded: rs[0]?.grounded ?? null, top3: rs.map((r) => r.hs), unsupported: (res.missing || []).filter((m) => /^Chưa có căn cứ/.test(m)), reason: String(rs[0]?.reason || '').slice(0, 160), ms: Date.now() - t });
    } catch (e) {
      out.push({ id: it.id, truth: it.truth, error: String(e.message).slice(0, 120), ms: Date.now() - t });
    }
    process.stderr.write(`\r${out.length}/${items.length}`);
  }
}
await Promise.all(Array.from({ length: conc }, worker));
const withTruth = out.filter((o) => o.truth && !o.error);
const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : null);
const sum = {
  n: out.length, errors: out.filter((o) => o.error).length,
  acc4: pct(withTruth.filter((o) => o.top?.slice(0, 4) === o.truth.slice(0, 4)).length, withTruth.length),
  acc8: pct(withTruth.filter((o) => o.truth.length === 8 && o.top === o.truth).length, withTruth.filter((o) => o.truth.length === 8).length),
  top3acc8: pct(withTruth.filter((o) => o.truth.length === 8 && o.top3.includes(o.truth)).length, withTruth.filter((o) => o.truth.length === 8).length),
  confidentWrong4: pct(withTruth.filter((o) => (o.conf ?? 0) >= 80 && o.top?.slice(0, 4) !== o.truth.slice(0, 4)).length, withTruth.length),
  confidentWrong8: pct(withTruth.filter((o) => o.truth.length === 8 && (o.conf ?? 0) >= 80 && o.top !== o.truth).length, withTruth.filter((o) => o.truth.length === 8).length),
  ungroundedTop: pct(out.filter((o) => o.grounded === false).length, out.length),
  avgSec: Math.round(out.reduce((a, o) => a + o.ms, 0) / Math.max(1, out.length) / 1000),
};
process.stderr.write('\n');
console.log(JSON.stringify(sum));
if (argv.out) writeFileSync(argv.out, JSON.stringify({ summary: sum, items: out }, null, 1));
