#!/usr/bin/env node
// scripts/kiem-pham-vi-the.mjs — PR mang mã thẻ [M-xx] chỉ được đụng tệp của thẻ đó (docs/mong/phan-cong.json). Không mạng, không AI.
//   node scripts/kiem-pham-vi-the.mjs "<tiêu đề PR>" "<nhánh>" < danh-sach-tep
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const reCuaMau = (g) => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*')}$`);
/** @returns {{ok: boolean, ma: string|null, ngoai: string[], loi?: string}} */
export function kiemPhamVi({ tieuDe, nhanh, tep, phanCong }) {
  const ma = /\[(M-\d{2})\]/.exec(tieuDe || '')?.[1] || null;
  if (!ma) return /^mong\//.test(nhanh || '') ? { ok: false, ma, ngoai: [], loi: 'nhánh mong/* mà tiêu đề PR thiếu mã [M-xx]' } : { ok: true, ma, ngoai: [] };
  const t = phanCong.the[ma];
  if (!t) return { ok: false, ma, ngoai: [], loi: `không có thẻ ${ma}` };
  const mau = [...t.tep, ...(phanCong.chung || [])].map(reCuaMau);
  const ngoai = tep.filter((f) => !mau.some((r) => r.test(f)));
  return { ok: ngoai.length === 0, ma, ngoai };
}
/** Hai thẻ không được cùng sở hữu một mẫu tệp. */
export function trungSoHuu(phanCong) {
  const chu = new Map(); const trung = [];
  for (const [ma, t] of Object.entries(phanCong.the)) for (const g of t.tep) { if (chu.has(g) && !(t.sau || []).includes(chu.get(g)) ) trung.push(`${g}: ${chu.get(g)} và ${ma}`); chu.set(g, ma); }
  return trung;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const phanCong = JSON.parse(fs.readFileSync(new URL('../docs/mong/phan-cong.json', import.meta.url), 'utf8'));
  const tep = fs.readFileSync(0, 'utf8').split('\n').map((x) => x.trim()).filter(Boolean);
  const r = kiemPhamVi({ tieuDe: process.argv[2], nhanh: process.argv[3], tep, phanCong });
  if (r.ok) { console.log(`PASS phạm vi ${r.ma || '(không phải thẻ móng)'}`); process.exit(0); }
  console.log(`FAIL phạm vi ${r.ma || ''}: ${r.loi || `${r.ngoai.length} tệp ngoài thẻ`}`); for (const f of r.ngoai.slice(0, 30)) console.log(`  ✗ ${f}`); process.exit(1);
}
