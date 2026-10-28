// scripts/ra-soat-kdtv-494.mjs — rà toàn bộ biểu thuế: mã nào bị cột cs gắn KDTV sai chiều
// so với bảng TỪNG DÒNG của TT 01/2024/TT-BNNPTNT Phụ lục I (issue #494, việc 2).
//
// Chạy: node scripts/ra-soat-kdtv-494.mjs
// 3 lớp kết quả:
//   (1) bảng CSV liệt kê đúng dòng → giữ KDTV;
//   (2) CSV thiếu dòng + ĐÃ đối chiếu PDF xác nhận vắng (data/kdtv-010124-xac-minh.json) → tắt;
//   (3) CSV thiếu dòng nhưng PDF còn (CSV bóc tách bị gộp dòng) → GIỮ NGUYÊN, chờ oz-wiki bóc lại.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { taxData } = require('../lib/data.js');
const { trangThai } = require('../lib/kdtv-010124.js');
const { dataReadPath } = require('../lib/data-paths.js');

const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const xacMinh = JSON.parse(fs.readFileSync(dataReadPath('kdtv-010124-xac-minh.json'), 'utf8')).nhomKhongCoTrongVanBan || {};

const khop = [], daXacMinh = new Map(), thieuCsv = new Map();
for (const r of Object.values(taxData)) {
  const cs = fold(r.cs || '');
  if (!/kiem dich/.test(cs) || !/01\/2024\/tt-bnnptnt/.test(cs)) continue;
  const loai = /thuc vat/.test(cs) ? 'KIEM_DICH_THUC_VAT' : 'KIEM_DICH_DONG_VAT';
  const st = trangThai(r.hs, loai);
  if (!st || st.thuocDien === true) { khop.push(r.hs); continue; }
  const h6 = r.hs.slice(0, 6);
  if (xacMinh[h6]) {
    if (!daXacMinh.has(h6)) daXacMinh.set(h6, []);
    daXacMinh.get(h6).push(r.hs);
  } else {
    if (!thieuCsv.has(h6)) thieuCsv.set(h6, []);
    thieuCsv.get(h6).push(r.hs);
  }
}

console.log(`Mã dẫn 01/2024/TT-BNNPTNT cho diện kiểm dịch: ${khop.length + [...daXacMinh.values()].flat().length + [...thieuCsv.values()].flat().length}`);
console.log(`├─ (1) Bảng liệt kê đúng dòng — giữ KDTV: ${khop.length}`);
console.log(`├─ (2) Vắng sạch khỏi PDF gốc (đã xác minh) — TẮT KDTV: ${[...daXacMinh.values()].flat().length} mã / ${daXacMinh.size} nhóm`);
for (const [g, mas] of [...daXacMinh].sort()) console.log(`│    ${g}: ${mas.join(', ')} — ${xacMinh[g].ghiChu || ''}`);
console.log(`└─ (3) CSV registry thiếu dòng (PDF còn mã — bóc tách gộp dòng) — GIỮ NGUYÊN: ${[...thieuCsv.values()].flat().length} mã / ${thieuCsv.size} nhóm — chờ oz-wiki-plhq bóc lại bảng`);
const mau = [...thieuCsv].slice(0, 8).map(([g, m]) => `${g}(${m.length})`);
console.log(`     vd: ${mau.join(', ')}…`);
