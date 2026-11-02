#!/usr/bin/env node
/**
 * Lát 2 (#577 tiếp) — lập 100 phân nhóm 6 số cần soạn ranh giới, BÁM sổ tay nhóm 4 số đã có. Tất định, chạy lại được.
 *
 *   node scripts/lap-lat-2.mjs [--n=100] [--ngay=YYYY-MM-DD] [--khong-ghi]
 *
 * Thứ tự nhóm: theo cột ưu tiên sẵn có của docs/giao-viec/so-tay-lo.csv (số lô tăng dần, trong lô theo thứ tự cột `nhom`);
 * nhóm có sổ tay mà không có trong csv xếp sau, theo mã. Trong nhóm: PN6 theo mã tăng dần.
 * PN6 nhận: ≥ 2 dòng 8 số trong biểu (data/tax.json); bỏ 50 PN6 lát 1 (data/ho-so/lat-1.json); bỏ chương 98.
 * KHÔNG đọc tờ khai Oz, bench, oz-gold: không có tỉ lệ lượt khai. Cờ canHieuChinhTienLe tính bằng hàm công khai
 * (lib/ho-so/lat-1.js, tiền lệ TB-TCHQ). Ghi data/ho-so/lat-2.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT); // lib/data-paths.js lấy data/ theo cwd
const arg = (n, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const N = Number(arg('n', 100));
const NGAY = arg('ngay', new Date().toISOString().slice(0, 10));
const KHONG_GHI = process.argv.includes('--khong-ghi');
// 7 mã lát 1 chưa duyệt (CEO nêu 02/11/2026): ghi riêng, không tính vào N.
const CON_TON = ['392690', '401699', '848180', '853650', '853690', '852351', '950300'];

const L = require('../lib/ho-so/lat-1.js');
const { taxData } = require('../lib/data.js');
const nz = (s) => String(s ?? '').replace(/\D/g, '');

const lat1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ho-so/lat-1.json'), 'utf8'));
const tapLat1 = new Set(lat1.phanNhom.map((p) => p.pn6));
const soDong8 = L.soDong8TheoPn6(taxData);

// Nhóm có sổ tay
const coSoTay = new Set(fs.readdirSync(path.join(ROOT, 'data/so-tay')).filter((f) => /^\d{4}\.json$/.test(f)).map((f) => f.slice(0, 4)));

// Thứ tự nhóm theo csv (số lô, rồi thứ tự trong ô `nhom`); nhóm ngoài csv xếp sau theo mã
const csv = fs.readFileSync(path.join(ROOT, 'docs/giao-viec/so-tay-lo.csv'), 'utf8').trim().split('\n').slice(1)
  .map((l) => { const c = l.split(','); return { lo: Number(c[0]), nhom: (c[1] || '').split(/\s+/).filter(Boolean) }; })
  .sort((a, b) => a.lo - b.lo);
const thuTuNhom = [];
const daCo = new Set();
for (const { nhom } of csv) for (const g of nhom) if (coSoTay.has(g) && !daCo.has(g)) { daCo.add(g); thuTuNhom.push(g); }
const ngoaiCsv = [...coSoTay].filter((g) => !daCo.has(g)).sort();
const nhomTheoThuTu = [...thuTuNhom, ...ngoaiCsv];

// PN6 ≥ 2 dòng 8 số theo nhóm
const pn6TheoNhom = new Map();
for (const [p, n] of soDong8) {
  if (n < 2 || p.startsWith('98') || tapLat1.has(p)) continue;
  const g = p.slice(0, 4);
  if (!pn6TheoNhom.has(g)) pn6TheoNhom.set(g, []);
  pn6TheoNhom.get(g).push(p);
}

const phanNhom = [];
const nhomDung = new Set();
for (const g of nhomTheoThuTu) {
  for (const p of (pn6TheoNhom.get(g) || []).sort()) {
    if (phanNhom.length >= N) break;
    const ct = L.canHieuChinhTienLeTuDuLieu(p);
    phanNhom.push({
      pn6: p, nhom4: g, thuTu: phanNhom.length + 1, soDong8: soDong8.get(p), canHieuChinhTienLe: ct.co,
      ...(ct.tinHieu.length ? { tienLeLech: ct.tinHieu } : {}),
    });
    nhomDung.add(g);
  }
  if (phanNhom.length >= N) break;
}

const out = {
  phienBan: 'lat-2@1',
  ngayLap: NGAY,
  bieuThue: lat1.bieuThue,
  nguon: 'data/tax.json + data/so-tay/<nhom4>.json + docs/giao-viec/so-tay-lo.csv (thứ tự nhóm) + data/precedents.json (cờ tiền lệ) — không dùng tờ khai Oz',
  tieuChi: 'PN6 có ≥ 2 dòng 8 số trong biểu, thuộc nhóm 4 số đã có sổ tay; nhóm xếp theo lô của so-tay-lo.csv, PN6 theo mã tăng dần; bỏ 50 PN6 lát 1 và chương 98',
  soNhom4: nhomDung.size,
  conTonLat1: CON_TON,
  phanNhom,
};
L.kiemKhongCoSoLuot(out);

if (!KHONG_GHI) {
  fs.writeFileSync(path.join(ROOT, 'data/ho-so/lat-2.json'), `${JSON.stringify(out, null, 1)}\n`);
  console.error('Đã ghi data/ho-so/lat-2.json');
}
console.log(`Lát 2: ${phanNhom.length} PN6 · ${nhomDung.size} nhóm 4 số · ${phanNhom.filter((p) => p.canHieuChinhTienLe).length} có cờ tiền lệ`);
console.log(`Nhóm: ${[...nhomDung].join(' ')}`);
console.log(`Cờ tiền lệ: ${phanNhom.filter((p) => p.canHieuChinhTienLe).map((p) => p.pn6).join(' ')}`);
