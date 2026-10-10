#!/usr/bin/env node
// Bước 2 của sổ tay (docs/backlog/08-so-tay-chu-giai.md): CHẠY KHÔ các cổng sổ tay — KHÔNG gọi AI.
//
// Trên tập GIỮ RIÊNG của oz-gold (lib/holdout.js; kho tiền lệ bỏ tập này — HS_EVAL_EXCLUDE_HOLDOUT=1):
//   (A) chọn = mã đúng       → mọi lần cổng bật là BẬT OAN. Nghiệm thu: cổng nào bật oan > 10 % thì không nối.
//   (B) chọn = mã của luồng không AI (suggest-core khi mọi lời gọi AI đều lỗi) → bật khi mã sai = BẬT ĐÚNG,
//       bật khi mã đúng = BẬT OAN; với cổng loại trừ đếm thêm số lần cổng CHỈ ĐÚNG nhóm của mã đúng.
// Nhóm ứng viên trong hồ sơ vụ việc (pool) = danh sách ứng viên của chính luồng không AI (từ khoá + tiền lệ +
// chú giải) — gần với pool của động cơ hai vòng (giả thuyết AI + tiền lệ + made-in-china), nhưng không có AI.
// Dạng hàng (bộ phận / hoàn chỉnh) đoán bằng từ khoá trong 60 ký tự đầu mô tả (động cơ thật dùng ô `form` của vòng 1).
//
// Chạy: node scripts/so-tay-dry-run.mjs [--limit=200] [--write]
//   --write  ghi số liệu tổng hợp (không chép mô tả hàng) vào data/so-tay/bao-cao/chay-kho.json
// Nhãn đúng là mã Oz đã khai (không phải phán quyết Hải quan) — đủ để đo bật oan, không đủ để chấm luật.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const argv = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
process.env.MIC_OFF = '1';
await import('./test-isolate-data.mjs');
const require = createRequire(import.meta.url);
const llmTier = require('../lib/llm-tier.js');
llmTier.callLLMJson = async () => { throw Object.assign(new Error('dry-run: no LLM'), { code: 'NO_PROVIDER' }); };
const origLog = console.log;
console.error = () => {}; console.warn = () => {}; console.log = () => {};
const { isHeldOut } = require('../lib/holdout.js');
const { suggestCore } = require('../lib/suggest-core.js');
const { soTayGates, loadSoTay } = require('../lib/so-tay-gates.js');

const nz = (s) => String(s || '').replace(/\D/g, '');
let items = readFileSync(join(ROOT, 'data', 'oz-gold-final.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  .filter((g) => isHeldOut(g))
  .map((g) => ({ desc: String(g.sampleDesc || '').trim(), truth: nz(g.hsCode) }))
  .filter((x) => x.desc.length >= 20 && x.truth.length === 8);
if (argv.limit) items = items.slice(0, Number(argv.limit));

const VARIANTS = ['pool', 'phrase', 'pool+phrase', 'pool|phrase'];
const GATES = ['SO_TAY_LOAI_TRU', 'SO_TAY_NGUONG', 'SO_TAY_BO_PHAN', 'SO_TAY_DONG8'];
const PARTS_RE = /bộ phận|linh kiện|phụ tùng|phụ kiện/i;
const zero = () => Object.fromEntries(GATES.map((g) => [g, 0]));
const A = Object.fromEntries(VARIANTS.map((v) => [v, { checked: 0, fires: zero() }]));
const B = Object.fromEntries(VARIANTS.map((v) => [v, { checked: 0, wrong4: 0, wrong8: 0, trueFire: zero(), falseFire: zero(), pointsToTruth: 0 }]));
const examples = [];
let detTop4 = 0; let detTop8 = 0; let coveredTruth = 0;

let i = 0;
for (const it of items) {
  i += 1;
  if (i % 50 === 0) process.stderr.write(`  ${i}/${items.length}\n`);
  let j = {};
  try { j = (await suggestCore({ description: it.desc })).json || {}; } catch { j = {}; }
  const det = nz(j.suggestions?.[0]?.hsCode);
  const pool = (j.evidence || []).slice(0, 10).map((e) => ({ h4: nz(e.hsCode).slice(0, 4), from: e.source || 'candidate' }));
  const form = PARTS_RE.test(it.desc.slice(0, 60)) ? 'bộ phận' : 'hoàn chỉnh';
  if (det.slice(0, 4) === it.truth.slice(0, 4)) detTop4 += 1;
  if (det === it.truth) detTop8 += 1;
  if (loadSoTay(it.truth.slice(0, 4))) coveredTruth += 1;
  for (const v of VARIANTS) {
    const ga = soTayGates({ hs: it.truth, productText: it.desc, form, pool }, { loaiTruRequire: v });
    if (ga.checked) {
      A[v].checked += 1;
      for (const g of new Set(ga.challenges.map((c) => c.gate))) A[v].fires[g] += 1;
      if (v === 'phrase' && ga.challenges.length && examples.length < 25) examples.push({ kind: 'A-bat-oan', truth: it.truth, gates: ga.challenges.map((c) => `${c.gate}:${c.target || ''}${c.matched ? `("${c.matched}")` : ''}`) });
    }
    if (det.length === 8) {
      const gb = soTayGates({ hs: det, productText: it.desc, form, pool }, { loaiTruRequire: v });
      if (!gb.checked) continue;
      const b = B[v];
      b.checked += 1;
      const ok4 = det.slice(0, 4) === it.truth.slice(0, 4);
      const ok8 = det === it.truth;
      if (!ok4) b.wrong4 += 1;
      if (!ok8) b.wrong8 += 1;
      for (const g of new Set(gb.challenges.map((c) => c.gate))) {
        const ok = (g === 'SO_TAY_LOAI_TRU' || g === 'SO_TAY_NGUONG') ? ok4 : ok8;
        if (ok) b.falseFire[g] += 1; else b.trueFire[g] += 1;
      }
      if (!ok4 && gb.challenges.some((c) => c.gate === 'SO_TAY_LOAI_TRU' && c.target === it.truth.slice(0, 4))) b.pointsToTruth += 1;
      if (v === 'phrase' && gb.challenges.length && examples.length < 50) examples.push({ kind: ok8 ? 'B-bat-oan' : 'B-bat-dung', det, truth: it.truth, gates: gb.challenges.map((c) => `${c.gate}:${c.target || ''}${c.matched ? `("${c.matched}")` : ''}`) });
    }
  }
}

console.log = origLog;
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const report = {
  updatedAt: new Date().toISOString(),
  method: 'Chạy khô cổng sổ tay, không AI, trên tập giữ riêng oz-gold (xem đầu scripts/so-tay-dry-run.mjs). A: chọn = mã đúng → bật = bật oan. B: chọn = mã luồng không AI.',
  samples: items.length,
  soTayHeadings: (await import('fs')).readdirSync(join(ROOT, 'data', 'so-tay')).filter((f) => /^\d{4}\.json$/.test(f)).length,
  truthHeadingHasSoTay: coveredTruth,
  detAccuracy: { top1Heading4: pct(detTop4, items.length), top1Exact8: pct(detTop8, items.length) },
  variants: Object.fromEntries(VARIANTS.map((v) => [v, {
    A_truePick: { checked: A[v].checked, falseFirePct: Object.fromEntries(GATES.map((g) => [g, pct(A[v].fires[g], A[v].checked)])) },
    B_detPick: {
      checked: B[v].checked, wrongHeading4: B[v].wrong4, wrongExact8: B[v].wrong8,
      trueFire: B[v].trueFire, falseFire: B[v].falseFire,
      loaiTruPointsToTruthHeading: B[v].pointsToTruth,
    },
  }])),
  examples,
};
console.log(JSON.stringify(report.variants, null, 1));
console.log(`samples=${report.samples} truthHasSoTay=${coveredTruth} det4=${report.detAccuracy.top1Heading4}% det8=${report.detAccuracy.top1Exact8}%`);
if (argv.write) {
  const out = join(ROOT, 'data', 'so-tay', 'bao-cao');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'chay-kho.json'), `${JSON.stringify(report, null, 1)}\n`);
  console.log('→ data/so-tay/bao-cao/chay-kho.json');
}
