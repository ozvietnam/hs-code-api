#!/usr/bin/env node
// scripts/luat-goc/tom-tat-test.mjs — bài kiểm tóm tắt nút (M-36). Tất định, không mạng, không AI.
import { nap, goi, kiemY, napTraLoi, loiDan } from './tom-tat.mjs';
let dat = 0; let hong = 0; const kiem = (t, d, c = '') => { if (d) { dat += 1; console.log(`PASS ${t}`); } else { hong += 1; console.log(`FAIL ${t} ${c}`); } };
const N = (id, nguyenVan, o = {}) => JSON.stringify({ id, loai: 'CHU_GIAI_CHI_TIET', nguyenVan, cha: null, so: null, ...o });
const T = (id, nguyenVan, cha) => N(id, nguyenVan, { loai: 'TEN', cha });
const KHO = {
  bieu: [T('bieu:76', 'Nhôm', null), T('bieu:7606', 'Nhôm tấm, chiều dày trên 0,2 mm', 'bieu:76'), T('bieu:7607', 'Nhôm lá mỏng không quá 0,2 mm', 'bieu:76'), T('bieu:760710', '- Chưa bồi', 'bieu:7607'), T('bieu:760720', '- Đã bồi', 'bieu:7607'), T('bieu:760790', '- Loại khác', 'bieu:7607')],
  phan: [N('phan:XV:cg:1', '1. Phần này không bao gồm:', { loai: 'CHU_GIAI' })], chuong: [N('chuong:76:cgpn:1', '1. Bảng: mỗi nguyên tố 0.1(2) như Chương 72 và 74.', { loai: 'CHU_GIAI' })],
  nhom: [N('nhom:7607:ct:1', 'Nhóm này không bao gồm:'), N('nhom:7607:ct:2', '(a) Giấy lót nhôm (nhóm 48.11).', { cha: 'nhom:7607:ct:1', so: '(a)' }), N('nhom:7607:ct:3', '(b) Tấm dày (nhóm 76.06).', { cha: 'nhom:7607:ct:1', so: '(b)' })], 'phan-nhom': [], sen: [],
};
const kho = nap(undefined, (k) => KHO[k]); const g = goi(kho, '7607', () => 'XV'); const C = (id) => g.so.get(id);
kiem('gói có đủ nút, nút cùng cấp, câu chú giải', g.nut.length === 4 && g.cungCap.join() === 'bieu:7606' && C('nhom:7607:ct:2#1') && C('phan:XV:cg:1#1'));
kiem('gói ghi mục dưới câu dẫn', loiDan(kho, g).includes(`(mục dưới ${C('nhom:7607:ct:1#1')})`));
const y = (o) => ({ y: 'Không gồm giấy lót nhôm.', cau: ['nhom:7607:ct:2#1'], den: ['48.11'], ...o });
kiem('ý đúng: đạt', kiemY(kho, y(), 'khongGom', 'bieu:7607').length === 0);
kiem('CA NGƯỢC đích không có trong câu', kiemY(kho, y({ den: ['48.10'] }), 'khongGom', 'bieu:7607').length > 0);
kiem('CA NGƯỢC số đo lấy từ trí nhớ', kiemY(kho, y({ y: 'Giấy dày 0,15 mm.' }), 'khongGom', 'bieu:7607').length > 0);
kiem('CA NGƯỢC câu không có thật', kiemY(kho, y({ cau: ['nhom:9999:ct:1#1'] }), 'khongGom', 'bieu:7607').length > 0);
kiem('CA NGƯỢC không câu nào', kiemY(kho, y({ cau: [] }), 'khongGom', 'bieu:7607').length > 0);
kiem('bản in 0.1 đọc như 0,1', kiemY(kho, { y: 'Mỗi nguyên tố không quá 0,1.', cau: ['chuong:76:cgpn:1#1'] }, 'gom', 'bieu:7607').length === 0);
kiem('đích "Chương 74" trong "Chương 72 và 74"', kiemY(kho, { y: 'x', cau: ['chuong:76:cgpn:1#1'], den: ['Chương 74'] }, 'khongGom', 'bieu:7607').length === 0);
kiem('CA NGƯỢC đích "Chương 7" không khớp "Chương 72"', kiemY(kho, { y: 'x', cau: ['chuong:76:cgpn:1#1'], den: ['Chương 7'] }, 'khongGom', 'bieu:7607').length > 0);
kiem('CA NGƯỢC tách với nút khác cha', kiemY(kho, { y: 'x', cau: ['bieu:760710#1'], voi: 'bieu:7606' }, 'tachVoi', 'bieu:760710').length > 0);
const tra = (kg) => `\`\`\`json\n${JSON.stringify([{ nut: 'bieu:7607', gom: [], khongGom: kg, tachVoi: [] }, { nut: 'bieu:760710', gom: [], khongGom: [], tachVoi: [] }, { nut: 'bieu:760720', gom: [], khongGom: [], tachVoi: [] }, { nut: 'bieu:760790', gom: [{ y: 'Là phần còn lại dày 9 mm.', cau: ['C1'] }], khongGom: [], tachVoi: [] }])}\n\`\`\``;
const du = [{ y: 'Không gồm giấy.', cau: [C('nhom:7607:ct:2#1')], den: ['48.11'] }, { y: 'Không gồm tấm.', cau: [C('nhom:7607:ct:3#1')], den: ['76.06'] }];
kiem('nạp đủ loại trừ: không lỗi', napTraLoi(kho, g, tra(du)).loi.length === 0, napTraLoi(kho, g, tra(du)).loi);
kiem('CA NGƯỢC thiếu một loại trừ của chú giải nhóm', napTraLoi(kho, g, tra(du.slice(1))).loi.some((l) => l.includes('thiếu loại trừ nhom:7607:ct:2#1')));
const lk = napTraLoi(kho, g, tra(du)).ra.find((r) => r.nut === 'bieu:760790');
kiem('"Loại khác" do máy ghi, bỏ ý của mô hình', lk.gom.length === 1 && lk.gom[0].may === true && lk.gom[0].y.includes('Chưa bồi | Đã bồi') && kiemY(kho, lk.gom[0], 'gom', lk.nut).length === 0, JSON.stringify(lk));
kiem('CA NGƯỢC trả lời không phải JSON', napTraLoi(kho, g, 'xin lỗi').loi.length > 0);
console.log(`tom-tat-test: ${dat} passed, ${hong} failed`); process.exit(hong ? 1 : 0);
