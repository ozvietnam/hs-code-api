#!/usr/bin/env node
/**
 * Khung xương của pages-en.jsonl để chỉnh bộ tách mà KHÔNG lộ chữ WCO (an toàn dán gửi).
 *
 *   node scripts/wco-op-skeleton.mjs [--in=data/wco-op] [--around=Adoption] [--show=3] [--ctx=14]
 *
 * In ra (và ghi data/wco-op/skeleton-report.json, bị .gitignore chặn):
 *   - nhãn mẫu: các từ đầu dòng có dạng "Nhãn :" lặp lại nhiều lần (vd "Adoption"), kèm số lần;
 *   - hình dạng dòng bắt đầu bằng mã: chữ số → 9, chữ → a (vd "9999.99"), kèm số lần;
 *   - với vài lần xuất hiện dòng --around: các dòng xung quanh dưới dạng HÌNH DẠNG (chữ → a, số → 9; riêng
 *     nhãn mẫu giữ nguyên), kèm cờ đậm/cỡ chữ — đủ để thấy thứ tự: mã → tên hàng → mô tả → ... → Adoption.
 * Không in bất kỳ từ nội dung nào ngoài các nhãn mẫu lặp lại ≥ 8 lần.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (n, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const MIN_LABEL = 8;

/** Chữ → a, số → 9, giữ dấu câu; rút gọn chuỗi lặp để ngắn gọn. */
export const shapeOf = (t, keep = new Set()) => {
  const s = String(t).trim().slice(0, 40)
    .replace(/[A-Za-zÀ-ÿ]+/g, (w) => (keep.has(w) ? w : 'a'.repeat(Math.min(w.length, 12))))
    .replace(/\d/g, '9');
  return s.length >= 40 ? `${s}…` : s;
};

/** Nhãn mẫu: từ/cụm đầu dòng đứng ngay trước dấu ':' và lặp ≥ MIN_LABEL lần. */
export function findLabels(lines) {
  const c = new Map();
  for (const l of lines) {
    const m = /^\s*([A-Z][A-Za-z]{2,24}(?:\s[A-Za-z]{2,16}){0,2})\s*:/.exec(l.t);
    if (m) c.set(m[1], (c.get(m[1]) || 0) + 1);
  }
  return Object.fromEntries([...c.entries()].filter(([, n]) => n >= MIN_LABEL).sort((a, b) => b[1] - a[1]).slice(0, 40));
}

export function skeleton(lines, { around = 'Adoption', show = 3, ctx = 14 } = {}) {
  const labels = findLabels(lines);
  const keep = new Set(Object.keys(labels).flatMap((k) => k.split(/\s+/)));
  const codeShapes = new Map();
  for (const l of lines) {
    if (/^\s*\d{2,4}[.,]\d{2}/.test(l.t)) { const sh = shapeOf(l.t.slice(0, 12)); codeShapes.set(sh, (codeShapes.get(sh) || 0) + 1); }
  }
  const aroundRe = new RegExp(around, 'i');
  const hits = lines.map((l, i) => (aroundRe.test(l.t) ? i : -1)).filter((i) => i >= 0);
  const windows = hits.slice(0, show).map((i) => ({
    atLine: i, page: lines[i].pdfPage,
    lines: lines.slice(Math.max(0, i - ctx), i + Math.min(6, ctx)).map((l, k) => ({
      rel: Math.max(0, i - ctx) + k - i, shape: shapeOf(l.t, keep), bold: l.b ? 1 : 0, x: l.x, size: l.s,
    })),
  }));
  return {
    lines: lines.length, pages: new Set(lines.map((l) => l.pdfPage)).size,
    labels, codeLineShapes: Object.fromEntries([...codeShapes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)),
    aroundCount: hits.length, around, windows,
  };
}

function main() {
  const inDir = path.resolve(ROOT, arg('in', 'data/wco-op'));
  const f = path.join(inDir, 'pages-en.jsonl');
  if (!fs.existsSync(f)) { console.error(`Thiếu ${f}`); process.exit(1); }
  const lines = [];
  for (const row of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!row.trim()) continue;
    const p = JSON.parse(row);
    for (const l of p.lines) lines.push({ t: l.t, b: l.b, x: l.x, s: l.s, pdfPage: p.pdfPage });
  }
  const rep = skeleton(lines, { around: arg('around', 'Adoption'), show: Number(arg('show', 3)), ctx: Number(arg('ctx', 14)) });
  const out = path.join(inDir, 'skeleton-report.json');
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: inDir, encoding: 'utf8' });
  if (top.status === 0 && spawnSync('git', ['check-ignore', '-q', out], { cwd: top.stdout.trim() }).status !== 0) {
    console.error(`TỪ CHỐI ghi ${out}: không nằm trong .gitignore.`); process.exit(2);
  }
  fs.writeFileSync(out, JSON.stringify(rep, null, 1));
  console.log(JSON.stringify(rep, null, 1));
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) main();
