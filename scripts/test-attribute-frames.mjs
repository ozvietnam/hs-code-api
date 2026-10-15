// lib/attribute-frames.js — khung thuộc tính + tam giác kiểm chứng (bước 12, A-1). Tất định.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { frameFor, doanChuong, tenMien, tamGiacKiemChung, validateFrameInstance, kiemTrichDanEn, locTuVungEn } = require('../lib/attribute-frames.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };

// ── Khung theo chương: ghép TT39 + bước 12 ──
const fr84 = frameFor('84');
check('khung chương 84: có trường TT39 (machineFunction, power) + bước 12 (nguyenLyHoatDong)', fr84?.truong.some((t) => t.key === 'power' && t.batBuoc && t.goc === 'TT39') && fr84.truong.some((t) => t.key === 'nguyenLyHoatDong' && t.batBuoc && t.goc === 'BUOC12'), JSON.stringify(fr84?.truong.map((t) => t.key)));
check('khung chương 90 có doChinhXac bắt buộc + chương lạ → null', frameFor('90')?.truong.some((t) => t.key === 'doChinhXac') && frameFor('12') === null);
check('doanChuong: "máy nén khí không dầu" → 84 đứng đầu', doanChuong('máy nén khí không dầu, công suất 7,5kW')[0]?.chuong === '84');
check('doanChuong không khớp → []', doanChuong('abcxyz').length === 0);
// #308: khung/template phải có tenDongNghia {vi[],en[],zh[]} + tuVungChucNang {en[],zh[]} (khuyến nghị — không phá luồng identify A-2).
check('khung 84 có tenDongNghia + tuVungChucNang (BUOC12, khuyến nghị)', fr84?.truong.some((t) => t.key === 'tenDongNghia' && t.goc === 'BUOC12' && t.batBuoc === false) && fr84.truong.some((t) => t.key === 'tuVungChucNang' && t.goc === 'BUOC12'), JSON.stringify(fr84?.truong.map((t) => t.key)));
check('khung 39 (hàng tiêu dùng) cũng có tenDongNghia + tuVungChucNang', frameFor('39')?.truong.some((t) => t.key === 'tenDongNghia') && frameFor('39')?.truong.some((t) => t.key === 'tuVungChucNang'));

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

// ── #308: MÁY KIỂM TRÍCH DẪN NGUỒN — mọi cụm EN phải xuất hiện trong nguồn đã khai ──
// (hoặc trong tầng pháp lý EN: data/wco-hs-international.csv, data/wco-op/opinions.json — không qua kiểm = LOẠI, không tự chế từ)
let kd = kiemTrichDanEn(['glovebox', 'inert atmosphere workstation'], [
  { loai: 'nsx', url: 'https://www.mbraun.com/product/mb-200mod', trich: 'MB-200MOD Universal Glovebox — inert atmosphere workstation', retrievedAt: '2026-10-15' },
]);
check('cụm EN có trong trich nguồn đã khai → qua, căn cứ NGUON_KHAI', kd.length === 2 && kd[0]?.qua === true && kd[0]?.canCu === 'NGUON_KHAI' && kd[1]?.qua === true, JSON.stringify(kd));
kd = kiemTrichDanEn(['vacuum flasks'], []);
check('cụm EN trong tầng pháp lý (wco-hs-international.csv nhóm 9617) → qua, căn cứ TANG_PHAP_LY kèm mã', kd[0]?.qua === true && kd[0]?.canCu === 'TANG_PHAP_LY' && String(kd[0]?.nguon?.ma || '').startsWith('9617'), JSON.stringify(kd));
kd = kiemTrichDanEn(['pure-bred breeding animals'], []);
check('cụm EN trong tầng pháp lý (csv 0101) → qua', kd[0]?.qua === true && kd[0]?.canCu === 'TANG_PHAP_LY', JSON.stringify(kd));
kd = kiemTrichDanEn(['quantum deluxe gizmo'], [{ loai: 'phu', url: 'https://x.example.com/a', trich: 'trang không chứa cụm này', retrievedAt: '2026-10-15' }]);
check('cụm EN chế (không trong trich, không trong tầng pháp lý) → KHÔNG qua', kd[0]?.qua === false && kd[0]?.viDo, JSON.stringify(kd));
const LOC_IN = {
  tenDongNghia: { vi: ['buồng găng'], en: ['glovebox', 'cumCheKhongCoNguon'], zh: ['手套箱'] },
  tuVungChucNang: { en: ['gas purification'], zh: ['气体净化'] },
  nguon: [{ loai: 'nsx', url: 'https://www.mbraun.com/product/mb-200mod', trich: 'MB-200MOD Universal Glovebox — inert atmosphere workstation with gas purification', retrievedAt: '2026-10-15' }],
};
const locOut = locTuVungEn(LOC_IN);
check('locTuVungEn: cụm qua kiểm GIỮ nguyên văn, cụm chế bị LOẠI, vi/zh nguyên vẹn', locOut.tenDongNghia.en.join('|') === 'glovebox' && locOut.tenDongNghia.zh.includes('手套箱') && locOut.tenDongNghia.vi.length === 1 && locOut.tuVungChucNang.en.join('|') === 'gas purification' && locOut.baoCao.loai.some((l) => l.cum === 'cumchekhongconguon' && l.qua === false) && locOut.baoCao.giu.length === 2, JSON.stringify(locOut)); // baoCao.loai ghi cụm đã chuẩn hoá (lower)

// ── #308: nguon[] bắt buộc retrievedAt (nhãn do tamGiacKiemChung gán + URL + retrievedAt) ──
check('nguồn thiếu retrievedAt → lỗi validate', validateFrameInstance({ chuong: '39', truong: { polymerType: 'PP', form: 'bình', chatLieuCuThe: 'PP' }, nguon: [{ loai: 'phu', url: 'https://x.example.com/a', trich: 'bình PP' }] }).loi.some((l) => l.includes('retrievedAt')));
check('retrievedAt sai dạng (không YYYY-MM-DD) → lỗi validate', validateFrameInstance({ chuong: '39', truong: { polymerType: 'PP', form: 'bình', chatLieuCuThe: 'PP' }, nguon: [{ loai: 'phu', url: 'https://x.example.com/a', trich: 'bình PP', retrievedAt: 'hôm qua' }] }).loi.some((l) => l.includes('retrievedAt')));
check('tenDongNghia sai shape (en không phải mảng chuỗi) → lỗi validate', validateFrameInstance({ chuong: '39', truong: { polymerType: 'PP', form: 'bình', chatLieuCuThe: 'PP' }, tenDongNghia: { en: 'không phải mảng' }, nguon: [] }).loi.some((l) => l.includes('tenDongNghia')));

// ── Nghiệm thu A-1 (#308: điền ĐỦ tenDongNghia/tuVungChucNang/nguon retrievedAt): 3 case thật ──
// Case 1 — glovebox MBraun MB-200MOD (bài học 15/10): NSX manual → VERIFIED, frame 84 đủ.
// trich là fixture theo lời trang NSX (mbraun.com chưa đối chiếu online được tại phiên 15/10 — xem báo cáo #308);
// máy kiểm trích dẫn vẫn buộc mọi cụm EN xuất hiện trong trich/tầng pháp lý nên không thể chế từ ngoài nguồn.
const GLOVEBOX = {
  chuong: '84',
  truong: { machineFunction: 'buồng cách khí thao tác dưới khí trơ (glovebox) tích hợp bộ làm sạch khí', power: 'không ghi (thiết bị phòng thí nghiệm)', nguyenLyHoatDong: 'buồng kín kín khí + găng nhúng + vòng lọc khí O₂/ẩm giữ môi trường <1ppm', cauThanhModule: 'buồng kín, găng nhúng, bộ lọc khí, hộp chuyển bốc', chucNangChinh: 'làm việc với vật liệu nhạy khí trong môi trường trơ' },
  tenDongNghia: { vi: ['buồng găng', 'tủ găng', 'hộp găng tay cách khí'], en: ['glovebox', 'inert atmosphere workstation'], zh: ['手套箱'] },
  tuVungChucNang: { en: ['gas purification'], zh: ['气体净化', '惰性气氛'] },
  nguon: [{ loai: 'nsx', url: 'https://www.mbraun.com/product/mb-200mod', trich: 'MB-200MOD Universal Glovebox — inert atmosphere workstation with gas purification', retrievedAt: '2026-10-15' }],
};
let v = validateFrameInstance(GLOVEBOX);
check('case glovebox: frame 84 hợp lệ, mức VERIFIED', v.ok && tamGiacKiemChung(GLOVEBOX.nguon).muc === 'VERIFIED', JSON.stringify(v));
check('case glovebox #308: en đủ "glovebox"+"inert atmosphere workstation", zh đủ "手套箱", qua hết máy kiểm trích dẫn', GLOVEBOX.tenDongNghia.en.includes('glovebox') && GLOVEBOX.tenDongNghia.en.includes('inert atmosphere workstation') && GLOVEBOX.tenDongNghia.zh.includes('手套箱') && locTuVungEn(GLOVEBOX).baoCao.loai.length === 0 && v.enLoai?.length === 0, JSON.stringify(locTuVungEn(GLOVEBOX).baoCao));
// Case 2 — máy TQ đóng gói: 2 nguồn phụ khác miền → CORROBORATED.
const MAYDONGGOI = {
  chuong: '84',
  truong: { machineFunction: 'máy đóng gói hút chân không', power: '1,2kW', nguyenLyHoatDong: 'bơm hút chân không + thanh hàn nhiệt bịt miệng túi', chucNangChinh: 'đóng gói chân không thực phẩm' },
  tenDongNghia: { vi: ['máy đóng gói hút chân không', 'máy hàn miệng túi hút chân không'], en: ['vacuum sealing machine'], zh: ['真空封口机', '真空包装机'] },
  tuVungChucNang: { en: ['vacuum sealing'], zh: ['真空包装'] },
  nguon: [
    { loai: 'phu', url: 'https://supplier1.example.com/vacuum-sealer', trich: 'DZ-400 vacuum sealing machine', retrievedAt: '2026-10-15' },
    { loai: 'phu', url: 'https://www.alibaba2.example.vn/machine', trich: 'máy hút chân không DZ-400', retrievedAt: '2026-10-15' },
  ],
};
v = validateFrameInstance(MAYDONGGOI);
check('case máy TQ: CORROBORATED (2 miền độc lập)', v.ok && tamGiacKiemChung(MAYDONGGOI.nguon).muc === 'CORROBORATED', JSON.stringify(v));
check('case máy TQ #308: EN "vacuum sealing machine"/"vacuum sealing" qua kiểm từ trich nguồn đã khai', locTuVungEn(MAYDONGGOI).baoCao.loai.length === 0 && kiemTrichDanEn(MAYDONGGOI.tenDongNghia.en, MAYDONGGOI.nguon)[0]?.canCu === 'NGUON_KHAI', JSON.stringify(locTuVungEn(MAYDONGGOI).baoCao));
// Case 3 — hàng tiêu dùng (bình giữ nhiệt, chương 39): 1 nguồn → HYPOTHESIS; thiếu polymerType bị bắt.
// EN lấy từ tầng pháp lý: wco-hs-international.csv nhóm 9617 "Vacuum flasks and other vacuum vessels…" (không tự chế từ).
const BINHGIUNHIET = {
  chuong: '39',
  truong: { polymerType: 'PP', form: 'vỏ bình giữ nhiệt', chatLieuCuThe: 'PP + thép 304' },
  tenDongNghia: { vi: ['bình giữ nhiệt'], en: ['vacuum flasks'], zh: ['保温瓶'] },
  tuVungChucNang: { en: ['vacuum vessels'], zh: ['保温容器'] },
  nguon: [{ loai: 'phu', url: 'https://shop.example.com/binh-giu-nhiet', trich: 'bình giữ nhiệt vỏ PP', retrievedAt: '2026-10-15' }],
};
v = validateFrameInstance(BINHGIUNHIET);
check('case hàng tiêu dùng: đủ trường → ok, 1 nguồn → HYPOTHESIS', v.ok && tamGiacKiemChung(BINHGIUNHIET.nguon).muc === 'HYPOTHESIS', JSON.stringify(v));
check('case hàng tiêu dùng #308: EN qua kiểm nhờ TẦNG PHÁP LÝ (csv 9617) dù trich tiếng Việt', locTuVungEn(BINHGIUNHIET).baoCao.loai.length === 0 && kiemTrichDanEn(BINHGIUNHIET.tenDongNghia.en, BINHGIUNHIET.nguon)[0]?.canCu === 'TANG_PHAP_LY', JSON.stringify(kiemTrichDanEn(BINHGIUNHIET.tenDongNghia.en, BINHGIUNHIET.nguon)));
check('case hàng tiêu dùng: thiếu polymerType → bị bắt', validateFrameInstance({ ...BINHGIUNHIET, truong: { form: 'vỏ' } }).thieu.includes('polymerType'));
check('nguồn thiếu trích → lỗi validate', validateFrameInstance({ chuong: '39', truong: { chatLieuCuThe: 'PP' }, nguon: [{ url: 'https://x.example.com/a' }] }).loi.some((l) => l.includes('trich')));

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
