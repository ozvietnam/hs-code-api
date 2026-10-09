#!/usr/bin/env node
/**
 * Chia các nhóm 4 số CHƯA có sổ tay thành lô giao ngoài → docs/giao-viec/so-tay-lo.csv,
 * xếp theo ƯU TIÊN (không theo chương): nhóm Oz khai nhiều nhất làm trước, để độ phủ tờ khai thật tăng nhanh nhất.
 *
 * Tín hiệu ưu tiên:
 *   1. Số tờ khai thật theo nhóm — data/oz-gold-final.jsonl (trọng số ozCount). Chỉ đếm tổng theo nhóm, không đọc tên hàng/khách.
 *   2. Nhu cầu hàng thật từ ERP — tuỳ chọn: --demand=<tệp JSON là kết quả của GET /api/demand>. Nhóm xuất hiện trong
 *      ktcn2026 / brands / missingFields / noHeadingTemplate được cộng điểm theo mức Cao 3 / Vừa 2 / Thấp 1 (× 50 tờ khai).
 *      Không có tệp thì chỉ dùng tín hiệu 1 (ERP hiện mới có rất ít tín hiệu).
 *   Nhóm không có tín hiệu nào đứng cuối, xếp theo số nhóm.
 *
 * Mỗi lô ≤ 6 nhóm và ≤ 350 nghìn ký tự nguồn (đã áp trần như build-so-tay). Giữ trang_thai/nguoi_lam/pr của lô cũ nếu danh sách
 * nhóm trùng. Cột uu_tien ghi lý do, cột phu_cum ghi độ phủ tờ khai (%) SAU khi xong lô đó (tính cả các nhóm đã có sổ tay).
 *
 * Chạy lại sau mỗi đợt nạp: node scripts/gen-so-tay-lo.mjs [--demand=tmp/demand.json]
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
const ERP_WEIGHT = { Cao: 3, 'Vừa': 2, Thấp: 1 };
const ERP_POINTS = 50; // 1 mức ưu tiên ERP = 50 tờ khai lịch sử

const arg = (name) => { const a = process.argv.find((x) => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : null; };

const kindOf = (id) => (id.startsWith('tax.') || id.startsWith('wco.') ? null : id.endsWith('.nhom') ? 'nhom' : id.endsWith('.chuong') ? 'chuong' : id.startsWith('phan') ? 'phan' : id.startsWith('sen.') ? 'sen' : 'other');
const size = (h) => Object.entries(sourcesFor(h)).reduce((n, [id, t]) => n + Math.min(t.length, kindOf(id) ? CAP[kindOf(id)] : Infinity), 0);

const H = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'chu-giai-heading.json'), 'utf8'));
const done = new Set(fs.readdirSync(path.join(ROOT, 'data', 'so-tay')).filter((f) => /^\d{4}\.json$/.test(f)).map((f) => f.slice(0, 4)));
const all = Object.keys(H).filter((h) => !h.startsWith('98')).sort();

// 1. Tờ khai thật theo nhóm
const oz = {};
let ozTong = 0;
const gold = path.join(ROOT, 'data', 'oz-gold-final.jsonl');
if (fs.existsSync(gold)) {
  for (const l of fs.readFileSync(gold, 'utf8').split('\n')) {
    if (!l.trim()) continue;
    let r; try { r = JSON.parse(l); } catch { continue; }
    const h = String(r.hsCode || '').replace(/\D/g, '').slice(0, 4);
    if (h.length !== 4) continue;
    const w = Number(r.ozCount) || 1;
    oz[h] = (oz[h] || 0) + w;
    ozTong += w;
  }
}

// 2. Nhu cầu ERP (tuỳ chọn)
const erp = {};
const demandFile = arg('demand');
if (demandFile) {
  const d = JSON.parse(fs.readFileSync(path.resolve(demandFile), 'utf8'));
  const add = (h, pri) => { const k = String(h || '').replace(/\D/g, '').slice(0, 4); if (k.length === 4) erp[k] = Math.max(erp[k] || 0, ERP_WEIGHT[pri] || 1); };
  for (const x of d.ktcn2026 || []) add(x.hs, x.priority);
  for (const x of d.brands || []) for (const h of x.headings || []) add(h, x.priority);
  for (const x of d.missingFields || []) add(String(x.key || x.k || '').split(':')[0] || (x.heading ?? ''), x.priority);
  for (const x of d.noHeadingTemplate || []) add(x.heading ?? x.hs ?? x.h, x.priority);
}

const score = (h) => (oz[h] || 0) + (erp[h] || 0) * ERP_POINTS;
const todo = all.filter((h) => !done.has(h)).sort((a, b) => score(b) - score(a) || a.localeCompare(b));
const lyDo = (h) => {
  const p = [];
  if (oz[h]) p.push(`oz:${oz[h]}`);
  if (erp[h]) p.push(`erp:${erp[h]}`);
  return p.join('+') || 'khong-co-tin-hieu';
};

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

let phu = [...done].reduce((s, h) => s + (oz[h] || 0), 0);
const rows = lots.map((x, i) => {
  const nhom = x.l.join(' ');
  phu += x.l.reduce((s, h) => s + (oz[h] || 0), 0);
  const o = old.get(nhom) || { tt: 'chua-lam', ai: '', pr: '' };
  const lydo = x.l.map(lyDo).join(' ');
  return `${String(i + 1).padStart(3, '0')},${nhom},${x.l.length},${x.n},${o.tt},${o.ai},${o.pr},${lydo},${ozTong ? (phu / ozTong * 100).toFixed(1) : ''}`;
});
fs.writeFileSync(csvPath, ['lo,nhom,so_nhom,ky_tu_nguon,trang_thai,nguoi_lam,pr,uu_tien,phu_cum_pct', ...rows].join('\n') + '\n');
const phuNay = ozTong ? ([...done].reduce((s, h) => s + (oz[h] || 0), 0) / ozTong * 100).toFixed(1) : '?';
console.log(`${todo.length} nhóm chưa có sổ tay → ${lots.length} lô xếp theo ưu tiên (${csvPath}). Độ phủ tờ khai hiện tại ${phuNay}%${demandFile ? '' : ' (không có tín hiệu ERP)'}`);
