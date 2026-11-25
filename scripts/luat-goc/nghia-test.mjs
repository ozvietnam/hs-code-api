#!/usr/bin/env node
// scripts/luat-goc/nghia-test.mjs — bài kiểm ghép hai phiếu nghĩa cạnh (M-33). Tất định, không mạng, không AI.
import { viec, ghep, kiemPhieu, trongNguon, tuNhac } from './nghia.mjs';
let dat = 0; let hong = 0; const kiem = (t, d, c = '') => { if (d) { dat += 1; console.log(`PASS ${t}`); } else { hong += 1; console.log(`FAIL ${t} ${JSON.stringify(c)}`); } };
const v = { cau: 'nhom:7616:ct:9#1', nguon: 'nhom:7616:ct:9', dan: ['Nhóm này không bao gồm:'], chu: '(a) Vải dệt thoi từ sợi kim loại (nhóm 58.09).', canh: [{ e: 'E1', den: 'bieu:5809' }] };
const L = (dieuKien, loai = 'LOAI_SANG') => ({ loai, dieuKien }); const D = 'bieu:5809';
kiem('hai phiếu cùng loại trừ: KHOP, lấy điều kiện dài', (() => { const r = ghep(v, D, L('Vải dệt thoi'), L('Vải dệt thoi từ sợi kim loại')); return r.trangThai === 'KHOP' && r.loai === 'LOAI_SANG' && r.dieuKien === 'Vải dệt thoi từ sợi kim loại'; })());
kiem('một phiếu chép sai chữ: dùng bản nguyên văn của phiếu kia', ghep(v, D, L('Vải dệt từ kim loại'), L('Vải dệt thoi')).dieuKien === 'Vải dệt thoi');
kiem('CA NGƯỢC loại trừ mà không bản nào nguyên văn', ghep(v, D, L('xyz tự nghĩ'), L('abc tự nghĩ')).trangThai === 'CHUA_RO');
kiem('CA NGƯỢC một nói loại trừ một nói gồm', ghep(v, D, L('Vải dệt thoi'), L('', 'GOM')).trangThai === 'CHUA_RO');
kiem('CA NGƯỢC một phiếu KHONG_RO', ghep(v, D, L('Vải dệt thoi'), L('', 'KHONG_RO')).trangThai === 'CHUA_RO');
kiem('CA NGƯỢC nhãn lạ', ghep(v, D, L('Vải dệt thoi', 'CHAC_LA'), L('Vải dệt thoi')).trangThai === 'CHUA_RO');
kiem('GOM / DINH_NGHIA lẫn nhau: không đổi đường đi', ghep(v, D, L('', 'GOM'), L('', 'DINH_NGHIA')).loai === 'GIU');
kiem('đích trong phạm vi nguồn', trongNguon('chuong:84:kq:1', 'bieu:8436') && trongNguon('phan:XVI:kq:1', 'bieu:8413') && trongNguon('nhom:7616:ct:1', 'bieu:76169990'));
kiem('CA NGƯỢC đích ngoài phạm vi nguồn', !trongNguon('chuong:84:kq:1', 'bieu:8509') && !trongNguon('phan:XVI:kq:1', 'bieu:7318') && !trongNguon('nhom:7616:ct:9', 'bieu:7615'));
const vc = { ...v, nguon: 'chuong:84:kq:1', chu: 'Máy ấp trứng gia cầm (nhóm 84.36).' };
kiem('Chương nói hàng thuộc nhóm con: PHAN_VE', ghep(vc, 'bieu:8436', L('Máy ấp trứng gia cầm'), L('Máy ấp trứng gia cầm', 'GOM')).loai === 'PHAN_VE');
kiem('CA NGƯỢC đích ngoài chương không thành PHAN_VE', ghep(vc, 'bieu:8509', L('Máy ấp trứng gia cầm'), L('Máy ấp trứng gia cầm', 'GOM')).trangThai === 'CHUA_RO');
kiem('câu tự nhắc mã mình không phải dẫn chiếu', tuNhac('sen:73089040:1', 'bieu:73089040') && !tuNhac('sen:73089040:1', 'bieu:730890'));
kiem('phiếu loại trừ thiếu điều kiện là hỏng', kiemPhieu(v, L('')).length > 0 && kiemPhieu(v, L('Vải dệt thoi')).length === 0);
const nut = [{ id: 'nhom:7616:ct:8', nguyenVan: 'Không bao gồm:' }, { id: 'nhom:7616:ct:9', nguyenVan: '(a) Vải (nhóm 58.09).' }, { id: 'bieu:5809', nguyenVan: 'Vải dệt thoi' }];
const cau = [{ id: 'nhom:7616:ct:8#1', tu: 0, den: 14 }, { id: 'nhom:7616:ct:9#1', tu: 0, den: 21, dan: 'nhom:7616:ct:8#1' }];
const V = viec({ nut, cau, canh: [{ tu: 'nhom:7616:ct:9#1', tuNut: 'nhom:7616:ct:9', den: 'bieu:5809', trich: 'nhóm 58.09' }, { tu: 'bieu:5809#1', tuNut: 'bieu:5809', den: 'bieu:7616', trich: '' }] });
kiem('việc mang câu dẫn; nguồn là biểu thì bỏ', V.length === 1 && V[0].dan[0] === 'Không bao gồm:' && V[0].canh[0].ten === 'Vải dệt thoi', V);
console.log(`nghia-test: ${dat} passed, ${hong} failed`); process.exit(hong ? 1 : 0);
