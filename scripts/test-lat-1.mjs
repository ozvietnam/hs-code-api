#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * L1-1 (#563) — chốt 50 phân nhóm lát 1 bằng script + đo trần Pareto + tỉ lệ máy chốt thật.
 * Dữ liệu GIẢ nhỏ: không đọc oz-gold, không gọi LLM, không gọi mạng.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const L = require('../lib/ho-so/lat-1.js');

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };

// ── Biểu giả: 3 phân nhóm nhiều dòng (một cùng mức, hai chênh) + 1 phân nhóm một dòng ─────────────────────────
const tax = {
  11111110: { vn: '- - Loại A', mfn: '5' },
  11111190: { vn: '- - Loại khác', mfn: '5' },            // 111111: cùng mức → không chênh
  22222210: { vn: '- - Cáp điện cách điện bằng plastic', mfn: '17' },
  22222290: { vn: '- - Loại khác', mfn: '10' },           // 222222: chênh
  22222295: { vn: '- - Loại B', mfn: '*' },               // không phải số → bỏ khỏi so sánh
  33333310: { vn: '- - Khóa, khóa điều chỉnh', mfn: '12' },
  33333320: { vn: '- - Loại C', mfn: '0' },
  33333390: { vn: '- - Loại khác', mfn: '12' },           // 333333: chênh
  44444400: { vn: 'Hàng một dòng', mfn: '3' },            // 444444: một dòng
  55555510: { vn: '- - Loại D', mfn: 'Theo hướng dẫn tại khoản 1.1 Chương 98' },
  55555590: { vn: '- - Loại khác', mfn: '7' },            // 555555: một mức số duy nhất → không chênh
};

// 1. phanNhomChenhThue
const chenh = L.phanNhomChenhThue(tax);
check('phanNhomChenhThue trả đúng 2 phân nhóm chênh', chenh.size === 2 && chenh.has('222222') && chenh.has('333333'), [...chenh.keys()]);
check('mức không phải số bị bỏ khỏi so sánh và ghi vào khongSoDuoc',
  !chenh.get('222222').dong8.includes('22222295') && chenh.khongSoDuoc.includes('22222295') && chenh.khongSoDuoc.includes('55555510'), chenh.khongSoDuoc);
check('dong8 và mfn thẳng hàng', JSON.stringify(chenh.get('333333')) === JSON.stringify({ dong8: ['33333310', '33333320', '33333390'], mfn: [12, 0, 12] }), chenh.get('333333'));
check('soMfn chỉ nhận số thuần', L.soMfn('17') === 17 && L.soMfn('2,5') === 2.5 && L.soMfn('*') === null && L.soMfn('') === null && L.soMfn('30 (NHN: 80)') === null);

// 2. chỉ tờ khai nhập
check('laToKhaiNhap: loaiToKhai NHAP/XUAT thắng; không có thì xuất xứ VN = xuất',
  L.laToKhaiNhap({ origin: 'CN' }) && !L.laToKhaiNhap({ origin: 'VN' }) && L.laToKhaiNhap({ loaiToKhai: 'NHAP', origin: 'VN' }) && !L.laToKhaiNhap({ loaiToKhai: 'XUAT', origin: 'CN' }));

// 3. lượt theo phân nhóm
const rows = [
  { hsCode: '22222290', ozCount: 30, origin: 'CN' },
  { hsCode: '22222210', ozCount: 10, origin: 'CN' },
  { hsCode: '33333390', ozCount: 40, origin: 'CN' },
  { hsCode: '11111110', ozCount: 15, origin: 'CN' },
  { hsCode: '44444400', ozCount: 5, origin: 'CN' },
  { hsCode: '99999999', ozCount: 999, origin: 'VN' },     // tờ khai xuất → bị loại
];
const luot = L.luotTheoPn6(rows.filter(L.laToKhaiNhap));
check('luotTheoPn6 cộng ozCount, bỏ tờ khai xuất', luot.get('222222') === 40 && luot.get('333333') === 40 && !luot.has('999999') && luot.size === 4, [...luot]);

// 4. chonLat1 tất định khi hoà (40 = 40 → mã tăng dần)
const chon = L.chonLat1(luot, chenh, 50);
check('chonLat1 chỉ lấy phân nhóm chênh, hoà thì mã tăng dần',
  JSON.stringify(chon.map((x) => [x.pn6, x.hang])) === JSON.stringify([['222222', 1], ['333333', 2]]), chon);
check('tiLeLuot là % trên tổng lượt nhập, làm tròn 0,1', chon[0].tiLeLuot === 40, chon[0]);
const chonDao = L.chonLat1(new Map([...luot].reverse()), chenh, 50);
check('chonLat1 không phụ thuộc thứ tự đầu vào', JSON.stringify(chonDao) === JSON.stringify(chon));
check('chonLat1 cắt đúng n', L.chonLat1(luot, chenh, 1).length === 1);

// 5. máy chốt thật: CHOT / LOAI_KHAC một dòng → đúng/lệch; còn lại → không chốt
check('phanLoaiMayChot', L.phanLoaiMayChot({ ketQua: 'CHOT', hs: '22222210' }, '22222210') === 'CHOT_DUNG'
  && L.phanLoaiMayChot({ ketQua: 'LOAI_KHAC', hs: '22222290' }, '22222210') === 'CHOT_LECH'
  && L.phanLoaiMayChot({ ketQua: 'THIEU_SO_LIEU' }, '22222210') === 'KHONG_CHOT'
  && L.phanLoaiMayChot({ ketQua: 'TRANH_CAP', dongThoa: ['a', 'b'] }, '22222210') === 'KHONG_CHOT');
const chotGia = ({ hs, productText }) => (hs === '222222' && /plastic/.test(productText) ? { ketQua: 'CHOT', hs: '22222210' }
  : hs === '222222' ? { ketQua: 'LOAI_KHAC', hs: '22222290' } : { ketQua: 'KHONG_THE_CHOT', lyDo: 'ranh-gioi-chua-so-hoa' });
const mau = [
  { hsCode: '22222210', ozCount: 10, sampleDesc: 'cáp bọc plastic' },   // đúng
  { hsCode: '22222290', ozCount: 20, sampleDesc: 'cáp trần' },          // LK đúng
  { hsCode: '22222290', ozCount: 10, sampleDesc: 'cáp plastic' },       // lệch
  { hsCode: '33333390', ozCount: 40, sampleDesc: 'khóa' },              // không chốt
];
const may = L.doMayChot(mau, new Set(['222222', '333333']), chotGia);
check('doMayChot đếm theo lượt (ozCount)', may.tong === 80 && may.CHOT_DUNG === 30 && may.CHOT_LECH === 10 && may.KHONG_CHOT === 40, may);
check('doMayChot ghi phân bố ketQua + theo phân nhóm', may.theoKetQua['KHONG_THE_CHOT:ranh-gioi-chua-so-hoa'] === 40 && may.theoPn6['222222'].CHOT_DUNG === 30, may);

// 6. Pareto: phân nhóm một dòng + lượt máy chốt đúng là nền; thêm phân nhóm theo lượt còn lại
const par = L.tranPareto({ luot, soDong8: L.soDong8TheoPn6(tax), chotDung: new Map([['222222', 30]]), moc: [50, 80, 95] });
// tổng 100; nền = 5 (444444) + 30 = 35 (35 %). Còn lại: 333333 (40), 111111 (15), 222222 (10).
check('tranPareto: nền = một dòng + máy chốt đúng', par.nen === 35, par);
check('tranPareto: số phân nhóm cần số hoá theo mốc', par.moc['50'] === 1 && par.moc['80'] === 2 && par.moc['95'] === 3, par.moc);

// 7. trạng thái số hoá từ sổ tay
const soTay = { dong8: [
  { hs: '2222.22.10', dieuKienSo: [{ fact: 'x', op: '<=', value: 5, donVi: 'mm' }] },
  { hs: '2222.22.95' },
  { hs: '2222.22.90', loaiKhac: true },
] };
check('trangThaiSoHoa', L.trangThaiSoHoa('222222', () => soTay) === 'MOT_PHAN'
  && L.trangThaiSoHoa('222222', () => null) === 'CHUA_CO_SO_TAY'
  && L.trangThaiSoHoa('222222', () => ({ dong8: [{ hs: '22222210' }, { hs: '22222290', loaiKhac: true }] })) === 'CHUA_SO_HOA'
  && L.trangThaiSoHoa('222222', () => ({ dong8: [{ hs: '22222210', dieuKienSo: [{}] }, { hs: '22222290', loaiKhac: true }] })) === 'DU');

// 8. cờ cần hiệu chỉnh tiền lệ
const precedents = {
  22222290: [{ sourceType: 'TB-TCHQ', tbTchqNumber: '1/TB-TCHQ', productName: 'Dây cáp bọc nhựa PVC, có đầu nối' }],
  33333390: [{ sourceType: 'TB-TCHQ', tbTchqNumber: '2/TB-TCHQ', productName: 'Khóa hãm nhựa dùng cho cốp xe' }],
  33333320: [{ sourceType: 'TB-TCHQ', tbTchqNumber: '3/TB-TCHQ', productName: 'Loại C bằng gỗ' }],
  11111190: [{ sourceType: 'WCO_OP', productName: 'Loại A bằng nhựa' }],
};
const hc2 = L.canHieuChinhTienLe('222222', { taxData: tax, precedents, breadcrumb: {} });
check('TB-TCHQ kết luận "Loại khác" mà mang vật liệu của dòng anh em có tên → cờ', hc2.co && hc2.tinHieu.some((t) => t.tinHieu === 'LK_TRUNG_VAT_LIEU_ANH_EM' && t.dongAnhEm === '22222210' && t.soHieu === '1/TB-TCHQ'), hc2);
const hcVL = L.canHieuChinhTienLe('222222', { taxData: tax, precedents, breadcrumb: { 22222210: { vi: ['Sản phẩm bằng plastic'] } } });
check('vật liệu đã có ở tên tổ tiên (cả phân nhóm cùng vật liệu) không tính', !hcVL.tinHieu.some((t) => t.tinHieu === 'LK_TRUNG_VAT_LIEU_ANH_EM'), hcVL);
const hc3 = L.canHieuChinhTienLe('333333', { taxData: tax, precedents, breadcrumb: {} });
check('TB-TCHQ kết luận "Loại khác" mà tên hàng mở đầu bằng tên dòng anh em → cờ', hc3.co && hc3.tinHieu.some((t) => t.tinHieu === 'LK_TRUNG_TEN_ANH_EM' && t.dongAnhEm === '33333310'), hc3);
check('tín hiệu không mang chữ của tiền lệ (chỉ số hiệu + mã)', hc3.tinHieu.every((t) => Object.keys(t).sort().join(',') === 'dongAnhEm,maKetLuan,soHieu,tinHieu'), hc3.tinHieu);
check('nguồn không phải TB-TCHQ hoặc kết luận vào dòng có tên → không cờ', !L.canHieuChinhTienLe('111111', { taxData: tax, precedents, breadcrumb: {} }).co);
const hai = L.canHieuChinhTienLe('444444', { taxData: { 44444410: { vn: '- - Nút vặn' }, 44444420: { vn: '- - Loại E' } }, breadcrumb: {},
  precedents: { 44444410: [{ sourceType: 'TB-TCHQ', tbTchqNumber: '7/TB-TCHQ', productName: 'Nút vặn điều chỉnh dây giày H4' }],
    44444420: [{ sourceType: 'TB-TCHQ', tbTchqNumber: '8/TB-TCHQ', productName: 'Nút vặn điều chỉnh dây giày M4' }] } });
check('hai TB-TCHQ mô tả gần giống kết luận hai dòng khác nhau → TIEN_LE_HAI_DONG', hai.co && hai.tinHieu.some((t) => t.tinHieu === 'TIEN_LE_HAI_DONG'), hai);

// 9. tệp lat-1.json: không có số lượt tuyệt đối
const out = L.dungLat1Json({
  bieuThue: { phienBan: 'v-test' }, chenh, luot, chon, pareto: par, paretoChenh: { moc: { 80: 1, 95: 2 } },
  mayChot: may, chiTietPn6: { 222222: { canHieuChinhTienLe: hc2, trangThaiSoHoa: 'MOT_PHAN' }, 333333: { canHieuChinhTienLe: hc3, trangThaiSoHoa: 'CHUA_SO_HOA' } },
  ngayDo: '2026-10-30', soMauNhapBiLoai: 0,
});
const s = JSON.stringify(out);
check('lat-1.json không có khoá soLuot / tong / ozCount', !/"(soLuot|tong|ozCount|luot)"\s*:/.test(s), s);
check('lat-1.json có đủ trường hợp đồng', ['phienBan', 'bieuThue', 'tongPhanNhomChenh', 'tiLeLuotTong', 'tiLeLuotLat1', 'pareto', 'mayChot', 'phanNhom'].every((k) => k in out), Object.keys(out));
check('lat-1.json: tỉ lệ đúng, phanNhom có cờ', out.tongPhanNhomChenh === 2 && out.tiLeLuotTong === 80 && out.tiLeLuotLat1 === 80
  && out.phanNhom[0].pn6 === '222222' && out.phanNhom[0].canHieuChinhTienLe === true && out.mayChot.chotDung === 37.5, out);
check('lat-1.json: số tuyệt đối duy nhất là số phân nhóm (không có số nào > 100 ngoài khoá pareto/hang)',
  out.phanNhom.every((p) => Object.values(p).every((v) => typeof v !== 'number' || v <= 100)));
let nem = false; try { L.kiemKhongCoSoLuot({ a: [{ soLuot: 3 }] }); } catch { nem = true; }
check('kiemKhongCoSoLuot ném khi có khoá số lượt ở bất kỳ độ sâu', nem);

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
