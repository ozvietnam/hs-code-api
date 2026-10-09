#!/usr/bin/env node
/**
 * Chia các nhóm 4 số CHƯA có sổ tay thành lô giao ngoài → docs/giao-viec/so-tay-lo.csv.
 * Mỗi lô ≤ 6 nhóm liền nhau và ≤ 350 nghìn ký tự nguồn (đã áp trần như build-so-tay). Giữ nguyên trang_thai/nguoi_lam/pr
 * của lô cũ nếu danh sách nhóm trùng. Chạy lại sau mỗi đợt nạp: node scripts/gen-so-tay-lo.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { sourcesFor } = require('../lib/so-tay.js');
const CAP = { nhom: 30000, chuong: 40000, phan: 25000, sen: 4000, other: 4000 };
const MAX_NHOM = 6;
const MAX_CHARS = 350000;

const kindOf = (id) => (id.startsWith('tax.') || id.startsWith('wco.') ? null : id.endsWith('.nhom') ? 'nhom' : id.endsWith('.chuong') ? 'chuong' : id.startsWith('phan') ? 'phan' : id.startsWith('sen.') ? 'sen' : 'other');
const size = (h) => Object.entries(sourcesFor(h)).reduce((n, [id, t]) => n + Math.min(t.length, kindOf(id) ? CAP[kindOf(id)] : Infinity), 0);

const H = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'chu-giai-heading.json'), 'utf8'));
const done = new Set(fs.readdirSync(path.join(ROOT, 'data', 'so-tay')).filter((f) => /^\d{4}\.json$/.test(f)).map((f) => f.slice(0, 4)));
const todo = Object.keys(H).filter((h) => !h.startsWith('98') && !done.has(h)).sort();

const csvPath = path.join(ROOT, 'docs', 'giao-viec', 'so-tay-lo.csv');
const old = new Map();
if (fs.existsSync(csvPath)) {
  for (const l of fs.readFileSync(csvPath, 'utf8').split('\n').slice(1).filter(Boolean)) {
    const [, nhom, , , tt, ai, pr] = l.split(',');
    old.set(nhom, { tt, ai, pr });
  }
}
const lots = [];
let cur = { l: [], n: 0 };
for (const h of todo) {
  const s = size(h);
  if (cur.l.length && (cur.l.length >= MAX_NHOM || cur.n + s > MAX_CHARS)) { lots.push(cur); cur = { l: [], n: 0 }; }
  cur.l.push(h); cur.n += s;
}
if (cur.l.length) lots.push(cur);
const rows = lots.map((x, i) => {
  const nhom = x.l.join(' ');
  const o = old.get(nhom) || { tt: 'chua-lam', ai: '', pr: '' };
  return `${String(i + 1).padStart(3, '0')},${nhom},${x.l.length},${x.n},${o.tt},${o.ai},${o.pr}`;
});
fs.writeFileSync(csvPath, ['lo,nhom,so_nhom,ky_tu_nguon,trang_thai,nguoi_lam,pr', ...rows].join('\n') + '\n');
console.log(`${todo.length} nhóm chưa có sổ tay → ${lots.length} lô (${csvPath})`);
