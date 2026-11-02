#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Lát 2 (#577 tiếp) — danh sách data/ho-so/lat-2.json + cổng tiền lệ cho mã ngoài lát 1.
 * Dữ liệu thật công khai (biểu, TB-TCHQ); không đọc tờ khai Oz, bench, oz-gold; không gọi LLM/mạng.
 */
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const L = require('../lib/ho-so/lat-1.js');
const { taxData } = require('../lib/data.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x)}`); } };

const lat1 = JSON.parse(fs.readFileSync('data/ho-so/lat-1.json', 'utf8'));
const lat2 = JSON.parse(fs.readFileSync('data/ho-so/lat-2.json', 'utf8'));
const ds = lat2.phanNhom;
const soDong8 = L.soDong8TheoPn6(taxData);
const tap1 = new Set(lat1.phanNhom.map((p) => p.pn6));

// 1. Tệp lát 2
check('1a đủ 100 PN6, thuTu 1…100 liên tục', ds.length === 100 && ds.every((p, i) => p.thuTu === i + 1));
check('1b không trùng, không PN6 lát 1, không chương 98', new Set(ds.map((p) => p.pn6)).size === 100 && ds.every((p) => !tap1.has(p.pn6) && !p.pn6.startsWith('98')));
check('1c mỗi PN6 ≥ 2 dòng 8 số, soDong8 khớp biểu, nhom4 khớp', ds.every((p) => p.soDong8 >= 2 && p.soDong8 === soDong8.get(p.pn6) && p.nhom4 === p.pn6.slice(0, 4)));
check('1d nhóm 4 số đều đã có sổ tay', ds.every((p) => fs.existsSync(`data/so-tay/${p.nhom4}.json`)));
check('1e cờ ghi trong tệp = cờ tính lại trên dữ liệu công khai', ds.every((p) => p.canHieuChinhTienLe === L.canHieuChinhTienLeTuDuLieu(p.pn6).co));
check('1f không có số lượt tuyệt đối', (() => { try { L.kiemKhongCoSoLuot(lat2); return true; } catch { return false; } })());
check('1g 7 mã lát 1 còn tồn ghi riêng, không nằm trong 100', lat2.conTonLat1.length === 7 && lat2.conTonLat1.every((m) => !ds.some((p) => p.pn6 === m)));
check('1h phanNhomLat2() đọc đúng thứ tự', C.phanNhomLat2().join() === ds.map((p) => p.pn6).join());

// 2. Cổng tiền lệ: mã ngoài lát 1 và lát 2
check('2a 870829 (ngoài lát) có cờ tiền lệ', L.canHieuChinhTienLeTuDuLieu('870829').co === true && C.canHieuChinh('870829') === true);
check('2b 392690 (lát 1) vẫn có cờ', C.canHieuChinh('392690') === true);
check('2c PN6 lát 2 có cờ trong tệp → cổng cũng thấy', ds.filter((p) => p.canHieuChinhTienLe).every((p) => C.canHieuChinh(p.pn6)));
check('2d PN6 lát 2 không cờ → cổng không chặn', ds.filter((p) => !p.canHieuChinhTienLe).every((p) => !C.canHieuChinh(p.pn6)));
const loi = (f) => { try { f(); return ''; } catch (e) { return e.message; } };
const nhap = { phienBan: 'ranh-gioi@1', pn6: '870829', nhom: '8708', trangThai: 'DUYET', soanBoi: { phien: 'a' }, dong8: [], dieuKienNut: [] };
check('2e duyệt 870829 chưa có bảng hiệu chỉnh → chặn', /can-bang-hieu-chinh-tien-le:870829/.test(loi(() => C.duyet({ ...nhap, trangThai: 'NHAP' }, { phien: 'https://claude.ai/code/session_X#soat-B', ngay: '2026-11-02' }))));
check('2f áp vào sổ tay 870829 chưa có bảng → chặn', /can-bang-hieu-chinh-tien-le:870829/.test(loi(() => C.apDung(nhap, { nhom: '8708' }))));
const goi = C.goiSoan('870829');
check('2g --goi 870829 mang cờ + chưa có bảng (in [CẦN BẢNG HIỆU CHỈNH TIỀN LỆ])', goi.canHieuChinhTienLe === true && goi.coHieuChinhTienLe === false, { c: goi.canHieuChinhTienLe, h: goi.coHieuChinhTienLe });

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
