#!/usr/bin/env node
/**
 * scripts/goi-soan-ban-do-4so.mjs — GÓI SOẠN "bản đồ quan hệ tầng 4 số" (khuôn bd4@1). Tất định, KHÔNG gọi LLM.
 * Khuôn (System instructions của Studio): docs/giao-viec/do-thi/SOAN-BAN-DO-4SO.md · quy trình: QUY-TRINH-BAN-DO-4SO.md
 *
 *   node scripts/goi-soan-ban-do-4so.mjs --nhom=8536,8543,9031            in gói (văn bản) ra màn hình
 *   node scripts/goi-soan-ban-do-4so.mjs --nhom=… --out=<tiền tố>          ghi <tiền tố>.txt (cho Studio) + <tiền tố>.json (cho cổng --goi=)
 *   node scripts/goi-soan-ban-do-4so.mjs --nhom=… --thong-ke               chỉ in số đo (ký tự, đoạn, láng giềng)
 *   node scripts/goi-soan-ban-do-4so.mjs --lo-tiep [--tru=a,b]            in 30 nhóm của lô kế tiếp: nhóm chiếm 80% dòng tờ khai (data/do-thi/xep-hang-luong-hang.json)
 *                                                                          theo thứ tự hạng, bỏ nhóm đã nạp ở data/do-thi/ban-do-4so/ và nhóm trong --tru
 * Tối đa 30 nhóm / gói; gói > ~150.000 ký tự thì in cảnh báo (vẫn ghi). Mã thoát: 0 · 2 dùng sai lệnh.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const GOC = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
process.chdir(GOC);
const B = require('../lib/do-thi/ban-do-4so.js');

const thamSo = (ten) => { const a = process.argv.find((x) => x.startsWith(`--${ten}=`)); return a ? a.slice(ten.length + 3) : null; };
const co = (c) => process.argv.includes(c);

if (co('--lo-tiep')) {
  const xhTep = JSON.parse(fs.readFileSync(path.join(GOC, 'data/do-thi/xep-hang-luong-hang.json'), 'utf8')); const xh = xhTep.nhom;
  const dir = path.join(GOC, 'data/do-thi/ban-do-4so');
  const bo = new Set([...(thamSo('tru') || '').split(',').filter(Boolean), ...(fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => f.slice(0, 4)) : [])]);
  const lo = [];
  for (const r of xh) { if (lo.length >= B.GIOI_HAN.nhom) break; if (!bo.has(r.nhom) && r.luyKeSoDong - (100 * r.soDong) / xhTep.tong.soDong < 80) lo.push(r.nhom); }
  console.log(lo.join(','));
  process.exit(0);
}
const ds = (thamSo('nhom') || '').split(',').map((s) => s.replace(/\D/g, '')).filter((s) => s.length === 4);
if (!ds.length) { console.error('Cần --nhom=a,b,c (mã 4 số)'); process.exit(2); }
if (new Set(ds).size > B.GIOI_HAN.nhom) { console.error(`Tối đa ${B.GIOI_HAN.nhom} nhóm / gói (đang ${new Set(ds).size})`); process.exit(2); }

const goi = B.taoGoi(ds);
const vanBan = B.renderGoi(goi);
const soDo = {
  nhom: goi.nhomThuTu.length, kyTuGoi: vanBan.length, soDoan: Object.keys(goi.nguon).length, soDieuKhoan: goi.dkThuTu.length,
  langGiengNgoai: Object.keys(goi.phamViLangGieng).length, bam: goi.bam,
  nhomKhongTonTai: goi.nhomKhongTonTai, nhomThieuChuGiai: goi.nhomThuTu.filter((h) => goi.nhom[h].chuaCoChuGiaiChiTiet),
  langGiengBiCat: Object.fromEntries(goi.nhomThuTu.filter((h) => goi.nhom[h].langGiengBiCat).map((h) => [h, goi.nhom[h].langGiengBiCat])),
};
if (vanBan.length > B.GIOI_HAN.kyTu) console.error(`CẢNH BÁO: gói ${vanBan.length} ký tự > ${B.GIOI_HAN.kyTu}. Cân nhắc tách nhóm lớn sang gói khác (ct nhóm nặng nhất: ${goi.nhomThuTu.map((h) => [h, goi.nhom[h].ct.reduce((s, id) => s + goi.nguon[id].length, 0)]).sort((a, b) => b[1] - a[1]).slice(0, 5).map((x) => x.join(':')).join(', ')}).`);
const out = thamSo('out');
if (out) {
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(`${out}.txt`, vanBan, 'utf8');
  fs.writeFileSync(`${out}.json`, `${JSON.stringify(goi)}\n`, 'utf8');
  console.error(`✓ ghi ${out}.txt và ${out}.json`);
}
if (co('--thong-ke') || out) console.error(JSON.stringify(soDo, null, 1));
if (!out && !co('--thong-ke')) process.stdout.write(vanBan);
