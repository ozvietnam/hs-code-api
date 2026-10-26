// lib/substance-duties.js — nghĩa vụ theo chất (#322)
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { nghiaVuChat, theoMaHs, theoTenHang } = require('../lib/substance-duties.js');
const { buildTaxLookup } = require('../lib/tax-lookup.js');

let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n} ${x}`); } };

// Ca issue: 28416100 KMnO₄
const r1 = buildTaxLookup('28416100', { name: 'kali permanganat' });
check('28416100: trả khối nghiaVuChat', !!r1.nghiaVuChat?.nghiaVuChat);
check('28416100: tenChat đúng', r1.nghiaVuChat?.nghiaVuChat?.tenChat?.includes('Kalium permanganicum'));
check('28416100: nhom=1 + GP XNK + Cục Hóa chất', r1.nghiaVuChat?.nghiaVuChat?.nhom === 1 && r1.nghiaVuChat?.nghiaVuChat?.nghiaVu === 'GIAY_PHEP_XNK' && r1.nghiaVuChat?.nghiaVuChat?.coQuan?.includes('Hóa chất'));
check('28416100: mẫu 2a/PLVI + dịch vụ 2.001550', r1.nghiaVuChat?.nghiaVuChat?.mauDon?.includes('2a') && r1.nghiaVuChat?.nghiaVuChat?.dichVuCong === '2.001550');

// Ca issue: 29152400 anhydrit axetic
const r2 = buildTaxLookup('29152400', { name: 'anhydrit axetic' });
check('29152400: trả khối nghiaVuChat', !!r2.nghiaVuChat?.nghiaVuChat);
check('29152400: nhom=1 + ngưỡng ghi rõ', r2.nghiaVuChat?.nghiaVuChat?.nhom === 1 && !!r2.nghiaVuChat?.nghiaVuChat?.nguongMienGiam);

// Mã không có tiền chất → KHÔNG trả (không trả "không cần giấy phép" khi thiếu dữ liệu)
const r3 = buildTaxLookup('85044011', { name: 'UPS' });
check('85044011: không khối nghiaVuChat (đúng — không tiền chất)', !r3.nghiaVuChat);

// Tra theo tên hàng (không mã)
const r4 = theoTenHang('kali permanganat');
check('theoTên: kali permanganat → ≥1 chất', r4.length >= 1);

// Tra theo CAS (nếu cần thêm sau)
check('ghi chú: không khẳng định ROO', r1.nghiaVuChat?.ghiChu?.includes('không theo mã HS'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
