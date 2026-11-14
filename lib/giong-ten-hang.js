// lib/giong-ten-hang.js — ĐỘ GIỐNG TÊN HÀNG giữa hàng đang phân loại và tên hàng của một tiền lệ (TB-TCHQ / ý kiến WCO).
// #725 lỗi 46: "41 nguồn độc lập đồng thuận mã 85369094" đếm MỌI TB kết luận mã đó cho hàng khác (pinblock, POGO board,
// nắp chụp tụ…), còn ba TB cùng loại hàng (terminal đồng mạ thiếc bấm đầu dây → 85369012) thì máy không nhìn ra.
//
// Máy so bằng từ khoá, không AI, THẬN TRỌNG (đếm thiếu tốt hơn đếm oan — đây là tín hiệu, không phải căn cứ GIR/pháp lý):
//   1. DANH TỪ CHÍNH của hàng (2 âm tiết đầu tên hàng, lib/soat-luat-re.js#dauDanhTu, kể cả đồng nghĩa biểu thuế:
//      "chân pin"/"cos"/"terminal" là một loại "đầu nối" — lib/truong-dac-thu.js#moRongDongNghia) phải có trong tên tiền lệ;
//   2. ≥ NGUONG_PHU (60 %) số từ của TÊN LÕI tiền lệ (≤ 10 từ có nghĩa đầu tiên, bỏ nhãn "TM:", "Thành phần, cấu tạo…",
//      bỏ mã model có chữ số) có trong mô tả hàng, và ≥ NGUONG_CHUNG (3) từ chung.
// Ngưỡng đo trên ca #725-46 + bộ ca báo oan ở scripts/test-725-46-chot-sai.mjs: TB terminal cùng loại 0,7–0,8; TB khác loại
// cùng mã (pinblock, mạch in POGO, nắp chụp tụ) và đầu nối tròn/phích cắm (nhóm 85.36.69) không qua cổng danh từ hoặc < 0,3.

const { dauDanhTu, chuan, TU_DUNG } = require('./soat-luat-re');
const { moRongDongNghia } = require('./truong-dac-thu');

const NGUONG_PHU = 0.6;
const NGUONG_CHUNG = 3;
const TU_LOI_TOI_DA = 10;
const TU_LOI_MO_RONG = 18;

// Nhãn trình bày hay đứng đầu tên hàng trong TB (không nói gì về hàng).
const NHAN_TB = /(?:^|[\s|;.])(?:tm|tên gọi|tên hàng|tên thương mại|tên thương mại|thành phần,? cấu tạo,? công thức hóa học|thành phần,? cấu tạo,? công thức hoá học|cơ chế hoạt động,? cách thức sử dụng|theo hồ sơ (?:đề nghị )?xác định trước mã số,? thông tin mặt hàng như sau|thông tin do doanh nghiệp cung cấp tại đơn đề nghị xác định trước mã số)\s*:?/giu;

/** Tỷ lệ phần trăm thành phần trong mô tả (vd "59%", "95,2%"), bỏ "mới 100%" / "new 100%". */
function tyLePhanTram(s) {
  const sach = String(s || '').normalize('NFC').toLowerCase().replace(/\b(?:hàng\s+)?(?:mới|new)\s*100\s*%/gu, ' ');
  return [...new Set((sach.match(/\d+(?:[.,]\d+)?\s*%/gu) || []).map((x) => x.replace(/\s+/g, '').replace('.', ',')))];
}

/** Bỏ khúc có chữ số (mã model "SSF-01T-P1.4AB", "1000V", "16A") trước khi tách từ — từ vụn của mã model không phải từ về hàng. */
const boKhucSo = (s) => String(s || '').split(/\s+/).filter((w) => !/\d/.test(w)).join(' ');

/** Danh sách từ có nghĩa theo thứ tự (chữ thường, giữ dấu, bỏ từ dừng / chữ số / một ký tự). */
function tuCoNghia(s) {
  return chuan(boKhucSo(s)).split(' ').filter((w) => w.length >= 2 && !TU_DUNG.has(w));
}

/** Tên lõi của tiền lệ: bỏ nhãn trình bày, lấy ≤ TU_LOI_TOI_DA từ có nghĩa KHÁC NHAU đầu tiên (kèm từ đồng nghĩa biểu thuế). */
function tenLoi(ten) {
  const sach = String(ten || '').normalize('NFC').toLowerCase().replace(NHAN_TB, ' ');
  const tu = [];
  const tuMoRong = [];
  for (const w of tuCoNghia(sach)) {
    if (!tu.includes(w) && tu.length < TU_LOI_TOI_DA) tu.push(w);
    if (!tuMoRong.includes(w)) tuMoRong.push(w);
    if (tuMoRong.length >= TU_LOI_MO_RONG) break;
  }
  const chuoi = tu.join(' ');
  return { tu, tuMoRong, tyLe: tyLePhanTram(sach), chuoiMoRong: ` ${chuan(moRongDongNghia(chuoi))} ` };
}

/** Danh từ chính của hàng + các tên đồng nghĩa biểu thuế ("chân pin" → ["chân pin", "đầu nối"]). */
function danhTuChinh(tenHang) {
  const d = dauDanhTu(tenHang);
  if (!d) return [];
  const mo = chuan(moRongDongNghia(d));
  const them = mo === d ? [] : mo.slice(d.length).trim().split(/\s+/);
  const out = [d];
  for (let i = 0; i + 1 < them.length; i += 2) out.push(`${them[i]} ${them[i + 1]}`);
  return [...new Set(out)];
}

/**
 * doGiongTenHang({ tenHang, moTa }, tenTienLe) → { diem, chung, khopDanhTu, giong, diemMoRong, chungMoRong, khopPhanTram }
 *   tenHang: tên hàng (để lấy danh từ chính); moTa: toàn bộ chữ mô tả hàng (tên + chất liệu + công dụng + thông số).
 *   diem = tỉ lệ từ của tên lõi tiền lệ có trong mô tả (0..1); giong = qua cả ba cổng (danh từ, NGUONG_PHU, NGUONG_CHUNG).
 *   diemMoRong / khopPhanTram (OZV-822): dùng khi xét mức "trùng khít chắc chắn" (tránh trùng oan ở 10 từ mở đầu song ngữ/nhãn
 *   trước khi tới thành phần chất liệu hoặc tỷ lệ %).
 */
function doGiongTenHang({ tenHang, moTa }, tenTienLe) {
  const loi = tenLoi(tenTienLe);
  if (!loi.tu.length) return { diem: 0, chung: 0, khopDanhTu: false, giong: false, diemMoRong: 0, chungMoRong: 0, khopPhanTram: true };
  const moTaChu = String(moTa || tenHang || '').normalize('NFC').toLowerCase();
  const P = new Set(tuCoNghia(moRongDongNghia(moTaChu)));
  const chung = loi.tu.filter((w) => P.has(w)).length;
  const diem = chung / loi.tu.length;
  const chungMoRong = loi.tuMoRong.filter((w) => P.has(w)).length;
  const diemMoRong = loi.tuMoRong.length ? Math.round((chungMoRong / loi.tuMoRong.length) * 100) / 100 : 0;
  const tyLeHang = new Set(tyLePhanTram(moTaChu));
  const khopPhanTram = !loi.tyLe.length || !tyLeHang.size || loi.tyLe.every((p) => tyLeHang.has(p));
  const khopDanhTu = danhTuChinh(tenHang || moTa).some((d) => loi.chuoiMoRong.includes(` ${d} `));
  return {
    diem: Math.round(diem * 100) / 100,
    chung,
    khopDanhTu,
    giong: khopDanhTu && chung >= NGUONG_CHUNG && diem >= NGUONG_PHU,
    diemMoRong,
    chungMoRong,
    khopPhanTram,
  };
}

module.exports = { doGiongTenHang, tenLoi, danhTuChinh, tuCoNghia, tyLePhanTram, NGUONG_PHU, NGUONG_CHUNG, TU_LOI_TOI_DA, TU_LOI_MO_RONG };
