#!/usr/bin/env node
/**
 * Đo /api/suggest THẬT (qua handler, không phải chỉ tầng tìm kiếm) trên tập giữ
 * riêng của data/oz-gold-final.jsonl, theo từng "chế độ mô hình".
 *
 * VÌ SAO: mục tiêu dự án là "mô hình yếu nhất vẫn dùng được". Muốn biết điều
 * đó đúng hay sai thì phải đo — trước đây chỉ có số của Gemini trên 57 mẫu.
 *
 * Chế độ (--models=, phân tách bằng dấu phẩy):
 *   none  — không có AI nào (mọi lời gọi LLM đều lỗi) → engine deterministic.
 *           Đây là SÀN: mô hình yếu nhất cũng không được tệ hơn mức này.
 *   live  — dùng chuỗi provider đang cấu hình qua biến môi trường
 *           (GEMINI_API_KEY / MINIMAX_API_KEY / OPENROUTER_API_KEY ...).
 *           Muốn đo một mô hình cụ thể: chỉ đặt key của provider đó rồi chạy.
 *
 * Chống rò tập test: HS_EVAL_EXCLUDE_HOLDOUT=1 → kho tiền lệ bỏ tập giữ riêng.
 * Mọi ghi (ml-log, error-log) rơi vào thư mục tạm (test-isolate-data).
 *
 *   node scripts/bench-matrix.mjs --models=none --limit=200
 *   node scripts/bench-matrix.mjs --models=none,live --write
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};
const DEPTHS = [2, 4, 6, 8];

// ── Tiến trình con: chạy MỘT chế độ, in JSON kết quả ra stdout ──────────────
if (arg('child-mode', null)) {
  await runChild(arg('child-mode'), Number(arg('limit', 0)));
  process.exit(0);
}

async function runChild(mode, limit) {
  await import('./test-isolate-data.mjs');
  process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
  process.env.HS_API_TOKEN = 'bench-token';
  const { isHeldOut } = require('../lib/holdout.js');

  if (mode === 'none') {
    const llmTier = require('../lib/llm-tier');
    llmTier.callLLMJson = async () => {
      throw Object.assign(new Error('bench: no LLM'), { code: 'NO_PROVIDER' });
    };
  }
  // Tắt log lỗi ồn ào của error-monitor trong lúc chấm.
  const origErr = console.error;
  const origWarn = console.warn;
  console.error = () => {};
  console.warn = () => {};

  const handler = require('../api/suggest.js');
  const gold = readFileSync(join(ROOT, 'data', 'oz-gold-final.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  let items = gold
    .filter((g) => isHeldOut(g))
    .map((g) => ({ desc: String(g.sampleDesc || g.tenHang || '').trim(), truth: String(g.hsCode).replace(/\D/g, '') }))
    .filter((it) => it.desc.length >= 20 && it.truth.length === 8);
  if (limit > 0) items = items.slice(0, limit);

  const hit = { top1: {}, top3: {} };
  for (const d of DEPTHS) { hit.top1[d] = 0; hit.top3[d] = 0; }
  const status = {};
  let invalidCodes = 0;
  let degraded = 0;
  let llmErrors = 0;
  let errors = 0;
  let totalMs = 0;

  for (const it of items) {
    const res = { _s: 0, _j: null, setHeader() {}, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
    const t0 = Date.now();
    try {
      await handler({ method: 'POST', url: '/api/suggest', query: {}, headers: { authorization: 'Bearer bench-token' }, body: { description: it.desc } }, res);
    } catch {
      errors += 1;
      continue;
    }
    totalMs += Date.now() - t0;
    const j = res._j || {};
    if (res._s !== 200) { errors += 1; continue; }
    status[j.status || 'UNKNOWN'] = (status[j.status || 'UNKNOWN'] || 0) + 1;
    if ((j.llmRejectedCodes || []).length) invalidCodes += 1;
    if (j.degraded) degraded += 1;
    if (j.llmError) llmErrors += 1;
    const codes = (j.suggestions || []).map((s) => String(s.hsCode || ''));
    for (const d of DEPTHS) {
      const want = it.truth.slice(0, d);
      if (codes[0]?.slice(0, d) === want) hit.top1[d] += 1;
      if (codes.slice(0, 3).some((c) => c.slice(0, d) === want)) hit.top3[d] += 1;
    }
  }
  console.error = origErr;
  console.warn = origWarn;

  const n = items.length;
  const pct = (x) => Math.round((x / Math.max(1, n)) * 1000) / 10;
  process.stdout.write(`${JSON.stringify({
    mode,
    samples: n,
    top1: Object.fromEntries(DEPTHS.map((d) => [d, pct(hit.top1[d])])),
    top3: Object.fromEntries(DEPTHS.map((d) => [d, pct(hit.top3[d])])),
    invalidCodeRate: pct(invalidCodes),
    degradedRate: pct(degraded),
    llmErrorRate: pct(llmErrors),
    httpErrors: errors,
    status,
    avgMs: Math.round(totalMs / Math.max(1, n)),
  })}\n`);
}

// ── Tiến trình cha: mỗi chế độ một tiến trình con (handler nạp mock lúc require) ──
const models = arg('models', 'none').split(',').map((m) => m.trim()).filter(Boolean);
const limit = Number(arg('limit', 0));
const results = [];
for (const mode of models) {
  if (!['none', 'live'].includes(mode)) {
    console.error(`Chế độ không hỗ trợ: ${mode} (dùng none | live)`);
    process.exit(1);
  }
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--child-mode=${mode}`, `--limit=${limit}`], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: process.env,
  });
  const line = (r.stdout || '').trim().split('\n').filter((l) => l.startsWith('{')).pop();
  if (r.status !== 0 || !line) {
    console.error(`Chế độ ${mode} lỗi:\n${(r.stderr || '').slice(-2000)}`);
    process.exit(1);
  }
  const res = JSON.parse(line);
  res.wallSec = Math.round((Date.now() - t0) / 1000);
  results.push(res);
}

console.log(`\n=== bench:matrix — /api/suggest trên tập giữ riêng (${results[0]?.samples} tờ khai) ===\n`);
const pad = (s, n) => String(s).padStart(n);
console.log(`${'chế độ'.padEnd(8)} ${pad('4 số top1', 10)} ${pad('4 số top3', 10)} ${pad('8 số top1', 10)} ${pad('8 số top3', 10)} ${pad('mã bịa', 8)} ${pad('degraded', 9)} ${pad('ms/lượt', 8)}`);
for (const r of results) {
  console.log(`${r.mode.padEnd(8)} ${pad(`${r.top1[4]}%`, 10)} ${pad(`${r.top3[4]}%`, 10)} ${pad(`${r.top1[8]}%`, 10)} ${pad(`${r.top3[8]}%`, 10)} ${pad(`${r.invalidCodeRate}%`, 8)} ${pad(`${r.degradedRate}%`, 9)} ${pad(r.avgMs, 8)}`);
}
for (const r of results) console.log(`\n[${r.mode}] status: ${JSON.stringify(r.status)} · lỗi HTTP: ${r.httpErrors} · llmError: ${r.llmErrorRate}%`);

if (argv.includes('--write')) {
  const out = join(ROOT, 'data', 'bench-matrix-latest.json');
  writeFileSync(out, `${JSON.stringify({
    updatedAt: new Date().toISOString(),
    method: 'Gọi handler /api/suggest thật trên tập giữ riêng oz-gold (HS_EVAL_EXCLUDE_HOLDOUT=1 — kho tiền lệ bỏ tập này). none = không có AI nào (sàn cho mô hình yếu nhất); live = chuỗi provider đang cấu hình.',
    limit: limit || null,
    results,
  }, null, 2)}\n`);
  console.log(`\nĐã ghi ${out}`);
}
