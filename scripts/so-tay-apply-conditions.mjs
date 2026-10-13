#!/usr/bin/env node
// #195 bước 3 — ĐỒNG BỘ (full-sync) điều kiện số từ nháp vào data/so-tay/<nhóm>.json:
//   - dòng có DE_XUAT trong nháp → đặt dieuKienSo (có kiểm trích lần nữa);
//   - dòng còn dieuKienSo nhưng KHÔNG còn trong nháp → XOÁ (thanh tẩy điều kiện cũ — luật đổi thì data phải theo);
//   - không đụng gì khác. Idempotent: chạy lại cho cùng kết quả.
// Sau khi ốp: `npm run so-tay:check` phải xanh.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(import.meta.dirname, '..', 'data', 'so-tay');
const draft = JSON.parse(readFileSync(join(DIR, 'dieu-kien-so-draft.json'), 'utf8'));
const map = new Map();
for (const d of draft.dong || []) if (d.dieuKienSo?.length) map.set(`${d.nhom}/${d.hs}`, d);

function* lines(node, nhom) {
  if (Array.isArray(node)) { for (const x of node) yield* lines(x, nhom); return; }
  if (node && typeof node === 'object') {
    if (node.hs && node.dieuKien) { yield { nhom, line: node }; return; }
    for (const v of Object.values(node)) yield* lines(v, nhom);
  }
}

let dat = 0, xoa = 0, giu = 0, boLo = 0; const files = new Set();
for (const f of readdirSync(DIR).filter((x) => /^\d{4}\.json$/.test(x))) {
  const nhom = f.slice(0, 4);
  let j;
  try { j = JSON.parse(readFileSync(join(DIR, f), 'utf8')); } catch { continue; }
  let changed = false;
  for (const { line } of lines(j.dong8 || [], nhom)) {
    const key = `${nhom}/${String(line.hs).replace(/\D/g, '')}`;
    if (map.has(key)) {
      const trich = String(line.trich || '');
      const soTrongTrich = (v) => new RegExp('(?<!\\d)' + String(v).replace('.', '[.,]') + '(?!\\d)').test(trich);
      const dung = (c) => {
        if (c.op === 'LA') return true; // đã kiểm alias trong nháp lúc bóc; check-so-tay kiểm lại
        if (c.op === 'HOAC') return (c.phuongAn || []).every((alt) => alt.every((cc) => soTrongTrich(cc.value)));
        return soTrongTrich(c.value);
      };
      const conds = map.get(key).dieuKienSo
        .map((c) => (c.op === 'HOAC'
          ? { op: 'HOAC', phuongAn: c.phuongAn.map((alt) => alt.map(({ fact, op, value, donVi }) => ({ fact, op, value, donVi }))) }
          : { fact: c.fact, op: c.op, value: c.value, ...(c.op === 'LA' ? {} : { donVi: c.donVi }) }))
        .filter(dung);
      if (!conds.length) { boLo++; continue; }
      line.dieuKienSo = conds; dat += conds.length; changed = true;
    } else if (line.dieuKienSo) { delete line.dieuKienSo; xoa++; changed = true; } else { giu++; }
  }
  if (changed) { writeFileSync(join(DIR, f), JSON.stringify(j, null, 1) + '\n'); files.add(nhom); }
}
console.log(JSON.stringify({ nhom: files.size, dieuKienDat: dat, dongXoaDieuKienCu: xoa, boLoKhiDat: boLo, dongGiuNguyen: giu }, null, 1));
