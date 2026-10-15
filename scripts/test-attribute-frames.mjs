// lib/attribute-frames.js — khung thuộc tính + tam giác kiểm chứng (bước 12, A-1). Tất định.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { frameFor, doanChuong, tenMien, tamGiacKiemChung, validateFrameInstance } = require('../lib/attribute-frames.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };

// ── Khung theo chương: ghép TT39 + bước 12 ──
const fr84 = frameFor('84');
check('khung chương 84: có trường TT39 (machineFunction, power) + bước 12 (nguyenLyHoatDong)', fr84?.truong.some((t) => t.key === 'power' && t.batBuoc && t.goc === 'TT39') && fr84.truong.some((t) => t.key === 'nguyenLyHoatDong' && t.batBuoc && t.goc === 'BUOC12'), JSON.stringify(fr84?.truong.map((t) => t.key)));
check('khung chương 90 có doChinhXac bắt buộc + chương lạ → null', frameFor('90')?.truong.some((t) => t.key === 'doChinhXac') && frameFor('12') === null);
check('doanChuong: "máy nén khí không dầu" → 84 đứng đầu', doanChuong('máy nén khí không dầu, công suất 7,5kW')[0]?.chuong === '84');
check('doanChuong không khớp → []', doanChuong('abcxyz').length === 0);

// ── Tam giác kiểm chứng ──
check('tên miền: www.mbraun.com → mbraun.com; sâu path không sao', tenMien('https://www.mbraun.com/product/mb-200mod') === 'mbraun.com' && tenMien('https://example.co.uk/a') === 'example.co.uk');
let tg = tamGiacKiemChung([{ loai: 'nsx', url: 'https://www.mbraun.com/glovebox', trich: 'MB-200MOD' }]);
check('nguồn NSX → VERIFIED', tg.muc === 'VERIFIED', tg.muc);
tg = tamGiacKiemChung([
  { loai: 'phu', url: 'https://www.labx.com/listing/123', trich: 'MBraun MB-200MOD glovebox' },
  { loai: 'phu', url: 'https://www.auktion-bid.com/lot/9', trich: 'MB-200 Modul glove box' },
]);
check('2 nguồn phụ khác miền → CORROBORATED', tg.muc === 'CORROBORATED' && tg.mien.length === 2, JSON.stringify(tg));
tg = tamGiacKiemChung([{ loai: 'phu', url: 'https://www.labx.com/x', trich: 'glovebox' }, { loai: 'phu', url: 'https://labx.com/y', trich: 'glovebox' }]);
check('2 nguồn CÙNG miền → chỉ HYPOTHESIS (không phải độc lập)', tg.muc === 'HYPOTHESIS', tg.muc);
tg = tamGiacKiemChung([]);
check('không nguồn → KHONG_NGUON', tg.muc === 'KHONG_NGUON');

// ── Nghiệm thu A-1: 3 case thật điền được frame ──
// Case 1 — glovebox MBraun MB-200MOD (bài học 15/10): NSX manual → VERIFIED, frame 84 đủ.
const GLOVEBOX = {
  chuong: '84',
  truong: { machineFunction: 'buồng cách khí thao tác dưới khí trơ (glovebox) tích hợp bộ làm sạch khí', power: 'không ghi (thiết bị phòng thí nghiệm)', nguyenLyHoatDong: 'buồng kín kín khí + găng nhúng + vòng lọc khí O₂/ẩm giữ môi trường <1ppm', cauThanhModule: 'buồng kín, găng nhúng, bộ lọc khí, hộp chuyển bốc', chucNangChinh: 'làm việc với vật liệu nhạy khí trong môi trường trơ' },
  nguon: [{ loai: 'nsx', url: 'https://www.mbraun.com/product/mb-200mod', trich: 'MB-200MOD Universal Glovebox' }],
};
let v = validateFrameInstance(GLOVEBOX);
check('case glovebox: frame 84 hợp lệ, mức VERIFIED', v.ok && tamGiacKiemChung(GLOVEBOX.nguon).muc === 'VERIFIED', JSON.stringify(v));
// Case 2 — máy TQ đóng gói: 2 nguồn phụ khác miền → CORROBORATED.
const MAYDONGGOI = {
  chuong: '84',
  truong: { machineFunction: 'máy đóng gói hút chân không', power: '1,2kW', nguyenLyHoatDong: 'bơm hút chân không + thanh hàn nhiệt bịt miệng túi', chucNangChinh: 'đóng gói chân không thực phẩm' },
  nguon: [
    { loai: 'phu', url: 'https://supplier1.example.com/vacuum-sealer', trich: 'DZ-400 vacuum sealing machine' },
    { loai: 'phu', url: 'https://www.alibaba2.example.vn/machine', trich: 'máy hút chân không DZ-400' },
  ],
};
v = validateFrameInstance(MAYDONGGOI);
check('case máy TQ: CORROBORATED (2 miền độc lập)', v.ok && tamGiacKiemChung(MAYDONGGOI.nguon).muc === 'CORROBORATED', JSON.stringify(v));
// Case 3 — hàng tiêu dùng (bình giữ nhiệt, chương 39): 1 nguồn → HYPOTHESIS; thiếu polymerType bị bắt.
const BINHGIUNHIET = { chuong: '39', truong: { polymerType: 'PP', form: 'vỏ bình giữ nhiệt', chatLieuCuThe: 'PP + thép 304' }, nguon: [{ loai: 'phu', url: 'https://shop.example.com/binh-giu-nhiet', trich: 'bình giữ nhiệt vỏ PP' }] };
v = validateFrameInstance(BINHGIUNHIET);
check('case hàng tiêu dùng: đủ trường → ok, 1 nguồn → HYPOTHESIS', v.ok && tamGiacKiemChung(BINHGIUNHIET.nguon).muc === 'HYPOTHESIS', JSON.stringify(v));
check('case hàng tiêu dùng: thiếu polymerType → bị bắt', validateFrameInstance({ ...BINHGIUNHIET, truong: { form: 'vỏ' } }).thieu.includes('polymerType'));
check('nguồn thiếu trích → lỗi validate', validateFrameInstance({ chuong: '39', truong: { chatLieuCuThe: 'PP' }, nguon: [{ url: 'https://x.example.com/a' }] }).loi.some((l) => l.includes('trich')));

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
