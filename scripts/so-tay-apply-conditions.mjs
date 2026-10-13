#!/usr/bin/env node
// #195 bước 3 — ốp điều kiện số đã qua máy kiểm (DE_XUAT trong dieu-kien-so-draft.json) vào
// data/so-tay/<nhóm>.json: mỗi dòng 8 số nhận trường `dieuKienSo: [{fact, op, value, donVi}]`.
//   - CHỈ ốp điều kiện trạngThai DE_XUAT (số + đơn vị có nguyên văn trong trích — đã kiểm lúc bóc).
//   - Giữ nguyên mọi trường khác của dòng; không đụng dòng "Loại khác" (chốt bằng phủ định ở runtime).
//   - Idempotent: chạy lại chỉ thay thế dieuKienSo bằng bản mới nhất từ nháp.
// Sau khi ốp: `npm run so-tay:check` phải xanh (lib/so-tay.js kiểm số + đơn vị trong trich).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(import.meta.dirname, '..', 'data', 'so-tay');
const draft = JSON.parse(readFileSync(join(DIR, 'dieu-kien-so-draft.json'), 'utf8'));

function* dong8Lines(node) {
  if (Array.isArray(node)) { for (const x of node) yield* dong8Lines(x); return; }
  if (node && typeof node === 'object') {
    if (node.hs && node.dieuKien) { yield node; return; }
    for (const v of Object.values(node)) yield* dong8Lines(v);
  }
}

let apDong = 0; let apDieuKien = 0; const nhoms = new Set(); const boLo = [];
for (const d of draft.dong || []) {
  if (!d.dieuKienSo?.length) continue;
  const f = join(DIR, `${d.nhom}.json`);
  let j;
  try { j = JSON.parse(readFileSync(f, 'utf8')); } catch { boLo.push(`${d.nhom}: không đọc được file`); continue; }
  let target = null;
  for (const l of dong8Lines(j.dong8 || [])) if (String(l.hs).replace(/\D/g, '') === d.hs) { target = l; break; }
  if (!target) { boLo.push(`${d.nhom}/${d.hs}: không tìm thấy dòng trong sổ tay`); continue; }
  target.dieuKienSo = d.dieuKienSo.map(({ fact, op, value, donVi }) => ({ fact, op, value, donVi }));
  // Số + đơn vị phải vẫn còn nguyên văn trong trích của dòng (kiểm lần nữa lúc ốp — phòng nháp lệch)
  for (const c of target.dieuKienSo) {
    const soOk = new RegExp('(?<!\\d)' + String(c.value).replace('.', '[.,]') + '(?!\\d)').test(String(target.trich || ''));
    if (!soOk) { c.bo = `số ${c.value} không nguyên văn trong trích`; }
  }
  target.dieuKienSo = target.dieuKienSo.filter((c) => !c.bo);
  if (!target.dieuKienSo.length) { delete target.dieuKienSo; boLo.push(`${d.nhom}/${d.hs}: điều kiện mất trích khi ốp`); continue; }
  nhoms.add(d.nhom); apDong++; apDieuKien += target.dieuKienSo.length;
  writeFileSync(f, JSON.stringify(j, null, 1) + '\n');
}
console.log(JSON.stringify({ nhom: nhoms.size, dongDaAp: apDong, dieuKienDaAp: apDieuKien, boLo: boLo.length, chiTietBoLo: boLo.slice(0, 8) }, null, 1));
