#!/usr/bin/env node
// #261 — xoay/xoá nhật ký runtime theo thời hạn giữ đã công bố (docs/retention-log.md).
// Cắt các dòng ts cũ hơn HS_LOG_RETENTION_DAYS (mặc định 90) khỏi access-log.jsonl và ml-log.jsonl;
// feedback.jsonl giữ theo hạn riêng (HS_FEEDBACK_RETENTION_DAYS, mặc định 365 — là dữ liệu huấn luyện đã duyệt).
// Viết atomic (tệp tạm + rename). Chạy hằng ngày qua cron trên .120; idempotent.
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { dataPath } from '../lib/data-paths.js';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const argOf = (k, d) => { const m = args.find((a) => a.startsWith(`--${k}=`)); return m ? Number(m.split('=')[1]) : (args.includes(`--${k}`) ? true : d); };
const DRY = argOf('dry', false);

function prune(file, days) {
  const path = dataPath(file);
  if (!existsSync(path)) return { file, trc: 0, sau: 0, cat: 0 };
  const limit = Date.now() - days * 86400000;
  const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean);
  const keep = [];
  let hong = 0;
  for (const l of lines) {
    let ts = 0;
    try { ts = Date.parse(JSON.parse(l).ts || ''); } catch { hong++; continue; }
    if (!Number.isFinite(ts) || ts >= limit) keep.push(l);
  }
  if (!DRY && keep.length !== lines.length) {
    const tmp = path + '.prune.tmp';
    writeFileSync(tmp, keep.join('\n') + '\n');
    renameSync(tmp, path);
  }
  return { file, trc: lines.length, sau: keep.length, hong };
}

const ket = [
  prune('access-log.jsonl', argOf('days', Number(process.env.HS_LOG_RETENTION_DAYS) || 90)),
  prune('ml-log.jsonl', argOf('days', Number(process.env.HS_LOG_RETENTION_DAYS) || 90)),
  prune('feedback.jsonl', argOf('feedback-days', Number(process.env.HS_FEEDBACK_RETENTION_DAYS) || 365)),
];
console.log(JSON.stringify({ dry: DRY, ketQua: ket, thoiDiem: new Date().toISOString() }, null, 1));
