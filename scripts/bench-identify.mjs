#!/usr/bin/env node
// Bước 12 (A-2) — đo 20 mẫu vàng bằng LLM thật cho /api/identify (nghiệm thu thẻ A-2, #299).
// Chỉ số: tỉ lệ frame đạt CORROBORATED trở lên (mục tiêu ≥80%), p50/p90 ms (<30s), degraded,
// Chỉ số phụ: đúng chương dự đoán (tham khảo — identify không xếp mã).
// Chạy: node scripts/bench-identify.mjs [--file=data/bench/identify-gold-20.jsonl] [--out=kq.json] [--conc=2]
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
await import('./test-isolate-data.mjs');
const require = createRequire(join(here, 'x.js'));
const { identify } = require('../lib/identify.js');

const items = readFileSync(argv.file || join(ROOT, 'data/bench/identify-gold-20.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const out = [];
let next = 0;
const conc = Number(argv.conc || 2);
async function worker() {
  while (next < items.length) {
    const it = items[next++];
    const t0 = Date.now();
    try {
      const r = await Promise.race([
        identify({ tenHang: it.tenHang, model: it.model || null, thuongHieu: it.thuongHieu || null, moTa: it.moTa || null, anhUrl: it.anhUrl || [] }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT_90S')), 90000)),
      ]);
      out.push({ id: it.id, loai: it.loai, chuongMongDoi: it.chuongMongDoi, ms: r.ms ?? (Date.now() - t0), muc: r.xacMinh?.muc || (r.degraded ? 'DEGRADED' : null), chuong: r.frame?.chuong || null, thieuN: (r.thieuTruong || []).length, degraded: !!r.degraded, llmError: r.llmError?.code || null, anhVanBan: r.anh?.vanBan?.slice(0, 4) || null, anhBoVi: r.anhBoVi || null });
    } catch (e) {
      out.push({ id: it.id, loai: it.loai, chuongMongDoi: it.chuongMongDoi, ms: Date.now() - t0, error: String(e.message).slice(0, 80) });
    }
    process.stderr.write(`\ridentify ${out.length}/${items.length}`);
  }
}
await Promise.all(Array.from({ length: conc }, worker));
process.stderr.write('\n');
const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : null);
const okItems = out.filter((o) => !o.error && !o.degraded);
const sorted = okItems.map((o) => o.ms).sort((a, b) => a - b);
const sum = {
  n: out.length, errors: out.filter((o) => o.error).length, degraded: out.filter((o) => o.degraded).length,
  muc: Object.fromEntries(['VERIFIED', 'CORROBORATED', 'HYPOTHESIS', 'KHONG_NGUON', 'DEGRADED'].map((m) => [m, out.filter((o) => o.muc === m).length])),
  corroboratedTroLen: pct(out.filter((o) => o.muc === 'VERIFIED' || o.muc === 'CORROBORATED').length, out.length),
  p50Ms: sorted[Math.floor(sorted.length / 2)] || null, p90Ms: sorted[Math.floor(sorted.length * 0.9)] || null,
  dungChuong: pct(out.filter((o) => o.chuong && o.chuongMongDoi && o.chuong === String(o.chuongMongDoi).padStart(2, '0')).length, out.filter((o) => o.chuong).length),
  thieuTrungBinh: okItems.length ? Math.round(10 * okItems.reduce((s, o) => s + o.thieuN, 0) / okItems.length) / 10 : null,
};
console.log(JSON.stringify(sum, null, 1));
if (argv.out) writeFileSync(argv.out, JSON.stringify({ summary: sum, items: out }, null, 1));
