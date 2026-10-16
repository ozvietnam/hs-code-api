#!/usr/bin/env node
// Danh sách NHÃN HIỆU ỨNG VIÊN để tra cứu SHTT (đơn đặt hàng cho đợt cào đêm — docs/giao-viec/shtt-cao-dem.md).
// Nguồn: (1) nhãn trong tờ khai Oz đã ẩn danh (data/oz-gold-final.jsonl, trường brands[] + ozCount),
//        (2) data/brand-product-map.json (178 nhãn phổ biến), (3) watchlist hiện có data/trademark-watch.json.
// Không chép tên khách, số tờ khai — chỉ nhãn + chương HS + số lượt. Kết quả: data/shtt/ung-vien-nhan-hieu.{csv,json}.
//   node scripts/shtt/ung-vien.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { removeDiacritics } = require('../../lib/search-utils.js');

const chuan = (s) => removeDiacritics(String(s || '')).toLowerCase().replace(/[^a-z0-9一-鿿]+/g, ' ').trim();
const LA_CONG_TY = /\b(co\.?,?\s*ltd|company|limited|corp(oration)?|inc\b|trading|imp\s*&\s*exp|import|export|industr(y|ial)|technology co|factory|group co|有限公司)/i;
const BO = new Set(['oem', 'odm', 'khong nhan hieu', 'no brand', 'nobrand', 'none', 'n a', 'na', 'khong', 'not available', 'unbranded', 'generic', 'tq', 'china', 'trung quoc']);

const ung = new Map(); // chuan → mục
const them = (ten, nguon, { soToKhai = 0, chuong = [], nhomNice = [] } = {}) => {
  const k = chuan(ten); if (k.length < 2 || BO.has(k)) return;
  const e = ung.get(k) || { nhan: String(ten).trim(), chuan: k, nguon: [], soToKhai: 0, chuongHs: new Set(), nhomNice: new Set(), loai: LA_CONG_TY.test(ten) ? 'TEN_CONG_TY' : 'NHAN_HIEU' };
  if (!e.nguon.includes(nguon)) e.nguon.push(nguon);
  e.soToKhai += soToKhai; chuong.forEach((c) => e.chuongHs.add(c)); nhomNice.forEach((n) => e.nhomNice.add(n));
  ung.set(k, e);
};

// 1. Tờ khai Oz (đã ẩn danh)
for (const l of fs.readFileSync(join(ROOT, 'data', 'oz-gold-final.jsonl'), 'utf8').trim().split('\n')) {
  let o; try { o = JSON.parse(l); } catch { continue; }
  for (const b of o.brands || []) them(b, 'oz-gold', { soToKhai: o.ozCount || 1, chuong: [String(o.hsCode || '').slice(0, 2)].filter(Boolean) });
}
// 2. Nhãn phổ biến theo loại hàng
const bp = JSON.parse(fs.readFileSync(join(ROOT, 'data', 'brand-product-map.json'), 'utf8'));
for (const k of Object.keys(bp)) if (!k.startsWith('_')) them(k, 'brand-product-map');
// 3. Watchlist hiện có (seed + 1 nhãn đã tra tay)
const w = JSON.parse(fs.readFileSync(join(ROOT, 'data', 'trademark-watch.json'), 'utf8'));
for (const [k, v] of Object.entries(w.marks || {})) them(v.display || v.name || k, 'trademark-watch', { chuong: v.hsChapters || [], nhomNice: v.niceClasses || [] });

const ds = [...ung.values()].map((e) => {
  const uuTien = e.nguon.includes('trademark-watch') || (e.nguon.length >= 2) || e.soToKhai >= 10 ? 1 : e.soToKhai >= 3 ? 2 : 3;
  return { ...e, chuongHs: [...e.chuongHs].sort(), nhomNice: [...e.nhomNice].sort((a, b) => a - b), uuTien };
}).sort((a, b) => a.uuTien - b.uuTien || b.soToKhai - a.soToKhai || a.chuan.localeCompare(b.chuan));
const tong = { tong: ds.length, uuTien1: ds.filter((x) => x.uuTien === 1).length, uuTien2: ds.filter((x) => x.uuTien === 2).length, uuTien3: ds.filter((x) => x.uuTien === 3).length, tenCongTy: ds.filter((x) => x.loai === 'TEN_CONG_TY').length };
fs.writeFileSync(join(ROOT, 'data', 'shtt', 'ung-vien-nhan-hieu.json'), JSON.stringify({ _comment: 'Nhãn hiệu ứng viên tra cứu SHTT — sinh bằng scripts/shtt/ung-vien.mjs từ tờ khai Oz đã ẩn danh + brand-product-map + watchlist. KHÔNG sửa tay. uuTien 1 làm trước.', ngay: new Date().toISOString().slice(0, 10), ...tong, ungVien: ds }, null, 1) + '\n');
const csv = ['uu_tien,nhan,chuan,loai,so_to_khai,chuong_hs,nhom_nice,nguon', ...ds.map((e) => [e.uuTien, `"${e.nhan.replace(/"/g, '""')}"`, e.chuan, e.loai, e.soToKhai, e.chuongHs.join(';'), e.nhomNice.join(';'), e.nguon.join(';')].join(','))];
fs.writeFileSync(join(ROOT, 'data', 'shtt', 'ung-vien-nhan-hieu.csv'), csv.join('\n') + '\n');
console.log(`ung-vien: ${tong.tong} nhãn (ưu tiên 1: ${tong.uuTien1}, 2: ${tong.uuTien2}, 3: ${tong.uuTien3}; tên công ty: ${tong.tenCongTy}) → data/shtt/ung-vien-nhan-hieu.{csv,json}`);
