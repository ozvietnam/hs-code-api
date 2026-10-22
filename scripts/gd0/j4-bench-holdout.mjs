#!/usr/bin/env node
// GĐ0-J4 (#377): đo baseline retrieval trên TẬP GIỮ RIÊNG (holdout 15%, seed 42).
// Chỉ số: top-1/top-3 @ nhóm-4 & @ PN6, độ trễ p50/p95 mỗi món (embed query + tìm).
// So với: M2.7 nhóm-4 64.9% (accuracy-latest 07/07, mốc GĐ0) và keyword thô.
// Index đã loại holdout (J2) — không rò rỉ.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const { isHeldOut } = require(join(ROOT, 'lib/holdout.js'));
const { taoExtractor, embed } = await import('./j1-harness.mjs');
const { taoRetriever } = await import('./j3-retrieve.mjs');

const gold = readFileSync(join(ROOT, 'data/oz-gold-final.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const holdout = gold.filter((g) => {
  const hs = String(g.hsCode || '').replace(/\D/g, '');
  return hs.length === 8 && String(g.sampleDesc || '').trim().length >= 20 && isHeldOut(g);
});
console.log(`tập giữ riêng: ${holdout.length} mẫu`);

const index = JSON.parse(readFileSync(join(ROOT, 'data/gd0/index-e5-small.json'), 'utf8'));
const r = taoRetriever(index);
const { ext } = await taoExtractor();

const kq = [];
const t0 = Date.now();
for (const mau of holdout) {
  const tm = Date.now();
  const [vec] = await embed(ext, String(mau.sampleDesc).slice(0, 300), { query: true });
  const { nhom4, nhom6 } = r.timTrucTiep(vec, { k: 5 });
  const truth4 = String(mau.hsCode).slice(0, 4);
  const truth6 = String(mau.hsCode).slice(0, 6);
  kq.push({
    ms: Date.now() - tm,
    dung4_t1: nhom4[0].ma === truth4, dung4_t3: nhom4.slice(0, 3).some((x) => x.ma === truth4),
    dung6_t1: nhom6[0].ma === truth6, dung6_t3: nhom6.slice(0, 3).some((x) => x.ma === truth6),
  });
}
const tongMs = Date.now() - t0;
const pct = (f) => Math.round((1000 * kq.filter(f).length) / kq.length) / 10;
const lat = kq.map((x) => x.ms).sort((a, b) => a - b);
const summary = {
  n: kq.length, tongMs,
  top1_4: pct((x) => x.dung4_t1), top3_4: pct((x) => x.dung4_t3),
  top1_6: pct((x) => x.dung6_t1), top3_6: pct((x) => x.dung6_t3),
  p50Ms: lat[Math.floor(lat.length / 2)], p95Ms: lat[Math.floor(lat.length * 0.95)],
  mốcSo: { m27_top1_4: 64.9, keyword: 1.75 },
  goDieuKien: { 'top1@4 ≥ 64.9': pct((x) => x.dung4_t1) >= 64.9, 'p50 < 1000ms': lat[Math.floor(lat.length / 2)] < 1000 },
};
console.log(JSON.stringify(summary, null, 1));
writeFileSync(join(ROOT, 'data/gd0/ket-qua-j4.json'), JSON.stringify({ summary, chiTiet: kq }, null, 1));
