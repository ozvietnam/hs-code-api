#!/usr/bin/env node
// scripts/luat-goc/cau-test.mjs — bài kiểm tách câu (M-31). Tất định, không mạng, không AI.
import { tachCau, tachKho, kiemCau } from './cau.mjs';
let dat = 0; let hong = 0; const kiem = (t, d, c = '') => { if (d) { dat += 1; console.log(`PASS ${t}`); } else { hong += 1; console.log(`FAIL ${t} ${c}`); } };
const cat = (v) => tachCau(v).map(([a, b]) => v.slice(a, b));
for (const v of ['A.', '', 'Nhóm này gồm:\n\n(1) Đinh;\n\n(2) Vít (nhóm 73.18). Câu hai.', 'x\n\n\ny', '   đầu trắng. Sau.']) kiem(`ghép lại đúng ${JSON.stringify(v).slice(0, 30)}`, cat(v).join('') === v);
kiem('không cắt ở 73.17, 1.000 g, v.v.', cat('Các hàng thuộc nhóm 73.17 và 73.18, nặng 1.000 g, v.v. của nhóm.').length === 1);
kiem('cắt hai câu', cat('Nhóm này gồm đinh. Không gồm vít.').length === 2);
kiem('". (nhóm 96.04)." đi cùng câu trước', cat('Sàng thô và sàng tay. (nhóm 96.04). Câu hai.').length === 2);
kiem('cắt mục đánh số sau xuống dòng', cat('Không bao gồm:\n(a) Vải (nhóm 58.09).\n(ij) Sàng.').length === 3);
kiem('CA NGƯỢC số đầu khoản "1. Chương này" không thành câu riêng', cat('1. Chương này không bao gồm:').length === 1);
const N = (id, nguyenVan, o = {}) => JSON.stringify({ id, loai: 'CHU_GIAI_CHI_TIET', nguyenVan, cha: null, ...o });
const k = tachKho([N('nhom:7616:ct:1', 'Nhóm này gồm đinh.'), N('nhom:7616:ct:2', 'Nhóm này không bao gồm:'), N('nhom:7616:ct:3', '(a) Vải (nhóm 58.09).'), N('nhom:7616:ct:4', '(b) Sàng (nhóm 96.04). Kể cả sàng tay.'), N('nhom:7616:ct:5', 'Đoạn khác hẳn.')]);
const d = Object.fromEntries(k.map((c) => [c.id, c.dan]));
kiem('mục nối câu dẫn ở đoạn trước', d['nhom:7616:ct:3#1'] === 'nhom:7616:ct:2#1' && d['nhom:7616:ct:4#1'] === 'nhom:7616:ct:2#1' && d['nhom:7616:ct:4#2'] === 'nhom:7616:ct:2#1');
kiem('CA NGƯỢC đoạn văn mới hết phạm vi câu dẫn', d['nhom:7616:ct:5#1'] === undefined && d['nhom:7616:ct:1#1'] === undefined);
const k3 = tachKho([N('nhom:1:ct:1', 'Không bao gồm:'), N('nhom:1:ct:2', '(a) X, kể cả:', { cha: 'nhom:1:ct:1', so: '(a)' }), N('nhom:1:ct:3', '(i) Y.', { cha: 'nhom:1:ct:2', so: '(i)' }), N('nhom:1:ct:4', '(b) Z.', { cha: 'nhom:1:ct:1', so: '(b)' }), N('nhom:1:ct:5', 'Mặt khác, nhóm này bao gồm W.', { cha: 'nhom:1:ct:4' })]);
const d3 = Object.fromEntries(k3.map((c) => [c.id, c.dan]));
kiem('danh sách lồng: mục theo cha, không theo thứ tự', d3['nhom:1:ct:3#1'] === 'nhom:1:ct:2#1' && d3['nhom:1:ct:4#1'] === 'nhom:1:ct:1#1' && d3['nhom:1:ct:2#1'] === 'nhom:1:ct:1#1');
kiem('CA NGƯỢC đoạn văn dưới mục không thừa kế câu loại trừ', d3['nhom:1:ct:5#1'] === undefined);
const c2 = tachKho([N('phan:XV:cg:1', '1. Phần này không bao gồm:', { loai: 'CHU_GIAI' }), N('phan:XV:cg:1:a', '(a) Sơn;', { loai: 'CHU_GIAI', cha: 'phan:XV:cg:1' }), N('phan:XV:cg:2', '2. Khái niệm A.', { loai: 'CHU_GIAI' })]);
kiem('nút con nối câu dẫn của cha', c2[1].dan === 'phan:XV:cg:1#1' && c2[2].dan === undefined);
const dk = [N('nhom:7616:ct:1', 'A b. C d.')]; const dc = tachKho(dk).map((x) => JSON.stringify(x));
kiem('kiểm: đạt', kiemCau(dk, dc).length === 0); kiem('CA NGƯỢC thiếu đuôi', kiemCau(dk, dc.slice(0, 1)).length > 0); kiem('CA NGƯỢC câu mồ côi', kiemCau([], dc).length > 0);
console.log(`cau-test: ${dat} passed, ${hong} failed`); process.exit(hong ? 1 : 0);
