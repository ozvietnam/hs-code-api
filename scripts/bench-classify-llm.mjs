#!/usr/bin/env node
// D-4 (docs/backlog/05-decision-tables.md): đo bằng AI THẬT, cùng bộ mẫu, cho CẢ HAI cửa tra mã —
// /api/classify (đường ERP) và /api/suggest — để biết tri thức nào đang thật sự giúp.
//   --engine=classify|suggest   cửa cần đo (mặc định classify)
//   --lib=<thư mục lib>         bản code cần đo (mặc định ../lib)
//   --set=gold                  tập GIỮ RIÊNG của oz-gold (lib/holdout.js): --limit=80 --seed=7
//   --set=file --from=x.json    món thật [{id,titleZh,specs,facts?,truth?}]
//   --facts                     (set=file, classify) gửi kèm dữ kiện phiếu hồ sơ nếu có
//   --concurrency=3 --out=kq.json
// Chống "học thuộc đề": HS_EVAL_EXCLUDE_HOLDOUT=1 → kho tiền lệ Oz bỏ tập giữ riêng (cùng cơ chế
// scripts/bench-matrix.mjs). Ghi log/ml-log rơi vào thư mục tạm (test-isolate-data).
// Chỉ số: đúng 2/4/6/8 số (mã đầu + trong 3 mã), riêng nhóm "Loại khác" (D-6), tự tin ≥80 mà sai,
// và "sai mà KHÔNG bị gắn cờ xem lại" — chỉ tiêu chính (CEO 06/10/2026).
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const argv = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const here = dirname(fileURLToPath(import.meta.url));
const libDir = argv.lib || join(here, '..', 'lib');
const root = join(libDir, '..');
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
process.env.HS_API_TOKEN = process.env.HS_API_TOKEN || 'bench-token';
await import(join(here, 'test-isolate-data.mjs'));
const require = createRequire(join(libDir, 'x.js'));
const engine = argv.engine || 'classify';
const conc = Number(argv.concurrency || 3);
const DEPTHS = [2, 4, 6, 8];
// Một lượt treo (lời gọi không bao giờ trả về) không được làm mất cả đợt đo.
const ITEM_TIMEOUT_MS = Number(argv.itemTimeout || 300000);

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

let items;
if (argv.set === 'gold') {
  const { isHeldOut } = require(join(libDir, 'holdout.js'));
  const all = readFileSync(join(root, 'data', 'oz-gold-final.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    .filter((g) => isHeldOut(g))
    .map((g) => ({ id: String(g.hsCode) + ':' + String(g.sampleDesc).slice(0, 20), tenHang: String(g.sampleDesc || '').trim(), truth: String(g.hsCode).replace(/\D/g, '') }))
    .filter((x) => x.tenHang.length >= 20 && x.truth.length === 8);
  const r = rng(Number(argv.seed || 7));
  items = all.map((x) => [r(), x]).sort((a, b) => a[0] - b[0]).slice(0, Number(argv.limit || 80)).map((p) => p[1]);
} else {
  items = JSON.parse(readFileSync(argv.from, 'utf8')).map((x) => ({ id: x.id, tenHang: x.titleZh, nameZh: x.titleZh, specs: x.specs, facts: argv.facts ? (x.facts || []) : undefined, truth: x.truth || null }));
}

const nz = (s) => String(s || '').replace(/\D/g, '');
let run;
if (engine === 'suggest') {
  const handler = require(join(root, 'api', 'suggest.js'));
  run = async (it) => {
    const res = { _s: 0, _j: null, setHeader() {}, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
    const description = [it.tenHang, it.specs].filter(Boolean).join(' | ');
    await handler({ method: 'POST', url: '/api/suggest', query: {}, headers: { authorization: `Bearer ${process.env.HS_API_TOKEN}` }, body: { description } }, res);
    if (res._s !== 200) throw new Error(`HTTP ${res._s}`);
    const j = res._j || {};
    const rs = (j.suggestions || []).map((s) => ({ hs: nz(s.hsCode), confidence: s.confidence ?? null, reason: s.reasoning || s.reason || '' }));
    return { rs, missing: j.missing || [], status: j.status || null, warnings: (j.residualWarning ? 1 : 0) };
  };
} else {
  const { classify } = require(join(libDir, 'classify.js'));
  run = async (it) => {
    const res = await classify({ tenHang: it.tenHang, nameZh: it.nameZh || null, specs: it.specs || null, ...(it.facts ? { facts: it.facts } : {}) }, {});
    return { rs: (res.results || []).map((r) => ({ ...r, hs: nz(r.hs) })), missing: res.missing || [], status: res.status || null };
  };
}

const out = [];
let next = 0;
async function worker() {
  while (next < items.length) {
    const it = items[next++];
    const t = Date.now();
    try {
      const { rs, missing, status } = await Promise.race([
        run(it),
        new Promise((_, rej) => setTimeout(() => rej(new Error('BENCH_TIMEOUT')), ITEM_TIMEOUT_MS)),
      ]);
      out.push({
        id: it.id, truth: it.truth, top: rs[0]?.hs || null, conf: rs[0]?.confidence ?? null, top3: rs.slice(0, 3).map((r) => r.hs),
        status, nMissing: missing.length, grounded: rs[0]?.grounded ?? null, basis: rs[0]?.basis || [],
        reason: String(rs[0]?.reason || '').slice(0, 200), ms: Date.now() - t,
      });
    } catch (e) {
      out.push({ id: it.id, truth: it.truth, error: String(e.message).slice(0, 120), ms: Date.now() - t });
    }
    process.stderr.write(`\r${engine} ${out.length}/${items.length}`);
    if (argv.out) writeFileSync(`${argv.out}.partial`, JSON.stringify(out));
  }
}
await Promise.all(Array.from({ length: conc }, worker));

const { isLoaiKhac } = require(join(libDir, 'loai-khac-products.js'));
const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : null);
const ok = out.filter((o) => o.truth && !o.error);
const at = (o, d) => (o.top || '').slice(0, d) === o.truth.slice(0, d);
const sum = {
  engine, n: out.length, errors: out.filter((o) => o.error).length,
  top1: Object.fromEntries(DEPTHS.map((d) => [d, pct(ok.filter((o) => at(o, d)).length, ok.length)])),
  top3: Object.fromEntries(DEPTHS.map((d) => [d, pct(ok.filter((o) => o.top3.some((c) => c.slice(0, d) === o.truth.slice(0, d))).length, ok.length)])),
  loaiKhac: (() => { const lk = ok.filter((o) => o.truth.length === 8 && isLoaiKhac(o.truth)); return { n: lk.length, top1_8: pct(lk.filter((o) => o.top === o.truth).length, lk.length) }; })(),
  confidentWrong8: pct(ok.filter((o) => (o.conf ?? 0) >= 80 && o.top !== o.truth).length, ok.length),
  avgSec: Math.round(out.reduce((a, o) => a + o.ms, 0) / Math.max(1, out.length) / 1000),
};
process.stderr.write('\n');
console.log(JSON.stringify(sum));
if (argv.out) writeFileSync(argv.out, JSON.stringify({ summary: sum, items: out }, null, 1));
process.exit(0);
