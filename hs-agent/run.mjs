#!/usr/bin/env node
// Runner của agent tự hành hs-code-api (docs/vps-agent-tu-hanh.md §2.2).
//   node hs-agent/run.mjs <job> [--dry-run]
// --dry-run: làm đủ các bước nhưng KHÔNG push, KHÔNG mở PR, KHÔNG gửi Telegram.
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { APP_DIR, STOP_FILE, ensureDirs } from './lib/paths.mjs';
import { lock, load, save } from './lib/store.mjs';
import { createLogger } from './lib/log.mjs';
import { createRunBudget, BudgetExceeded } from './lib/budget.mjs';
import { sendTelegram } from './lib/notify.mjs';

const JOBS = {
  'legal-watch': './jobs/legal-watch.mjs',
  'precedent-extract': './jobs/precedent-extract.mjs',
  'bench-night': './jobs/bench-night.mjs',
  freshness: './jobs/freshness.mjs',
  digest: './jobs/digest.mjs',
};

const [job, ...rest] = process.argv.slice(2);
const dryRun = rest.includes('--dry-run') || process.env.HS_AGENT_DRY_RUN === '1';

if (!job || !JOBS[job]) {
  console.error(`Dùng: node hs-agent/run.mjs <${Object.keys(JOBS).join('|')}> [--dry-run]`);
  process.exit(2);
}

ensureDirs();
const log = createLogger(job);

if (existsSync(STOP_FILE)) {
  log.warn(`Có ${STOP_FILE} — công tắc tắt đang bật, bỏ qua ${job}.`);
  process.exit(0);
}

const release = lock(job);
if (!release) {
  log.warn(`${job} đang chạy ở tiến trình khác — bỏ qua lần này.`);
  process.exit(0);
}

const cfg = JSON.parse(readFileSync(join(APP_DIR, 'config', 'jobs.json'), 'utf8')).jobs[job] || {};
const budget = createRunBudget(cfg.budget || {});
const started = new Date();
let summary = { status: 'error', lines: [] };

try {
  const mod = await import(JOBS[job]);
  log.info(`bắt đầu${dryRun ? ' (dry-run)' : ''} — ngân sách ${JSON.stringify(cfg.budget || {})}`);
  summary = (await mod.default({ job, cfg, log, budget, dryRun })) || { status: 'ok', lines: [] };
} catch (e) {
  const exhausted = e instanceof BudgetExceeded;
  summary = { status: exhausted ? 'budget' : 'error', lines: [exhausted ? `Dừng vì ${e.message}.` : `Lỗi: ${e.message}`] };
  log.error(e.stack || e.message);
} finally {
  release();
}

const run = {
  job,
  startedAt: started.toISOString(),
  seconds: Math.round((Date.now() - started.getTime()) / 1000),
  dryRun,
  used: budget.used,
  ...summary,
};
const runs = load('runs', []);
runs.push(run);
save('runs', runs.slice(-500));
log.info(`xong: ${run.status} · ${run.seconds}s · dùng ${JSON.stringify(budget.used)}`);
for (const l of run.lines || []) log.info(`  ${l}`);

// Lỗi 3 lần liên tiếp → báo ngay, không chờ digest (§2.7).
const recent = runs.filter((r) => r.job === job).slice(-3);
if (!dryRun && recent.length === 3 && recent.every((r) => r.status === 'error')) {
  await sendTelegram(`⚠️ hs-agent: job ${job} lỗi 3 lần liên tiếp.\n${(run.lines || []).join('\n')}\nLog: ${log.file}`);
}
process.exit(run.status === 'error' ? 1 : 0);
