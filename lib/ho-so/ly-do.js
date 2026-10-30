/**
 * lib/ho-so/ly-do.js — LÝ DO CHƯA CHỐT của hồ sơ phân loại (enum đông cứng; plan L1-5b, quyết định 3 của người điều phối).
 *
 * `chuaChot[]` của dungDuongDi (L1-5a) và `ketLuan.chuaChot[]` của doiChieu (L1-5b) là chuỗi "<lyDo>:<mã>" với lyDo ∈ bảng dưới
 * — một nguồn duy nhất để Cổng/ERP rẽ nhánh theo lý do mà không phải đoán chuỗi. Xuất lại qua lib/ho-so/index.js.
 * Tách tệp riêng chỉ để tránh vòng nạp index.js ↔ duong-di.js.
 */
const LY_DO_CHUA_CHOT = Object.freeze({
  /** mục sổ tay có điều kiện nhưng chưa CLAUDE_DUYET/NGUOI_DUYET */
  CHUA_DUYET: 'chua-duyet',
  /** ranh giới chưa có điều kiện số hoá */
  CHUA_SO_HOA: 'chua-so-hoa',
  /** bảng hiệu chỉnh tiền lệ: LECH_CHUA_PHAN_XU áp vào hàng (không điều kiện, hoặc apKhi thoả/chưa biết) */
  HIEU_CHINH_LECH: 'hieu-chinh-lech-chua-phan-xu',
  /** tiêu đề 7/5 số bị lược tên trong cây theo chữ số */
  TIEU_DE_BI_LUOC_TEN: 'tieu-de-bi-luoc-ten',
  /** cây theo chữ số đã lược một tầng có tên */
  TANG_BI_LUOC: 'tang-bi-luoc',
  /** nhóm 4 số chưa có sổ tay */
  NHOM_CHUA_CO_SO_TAY: 'nhom-chua-co-so-tay',
  /** mã không có trong cây */
  MA_KHONG_CO_TRONG_CAY: 'ma-khong-co-trong-cay',
  /** anh em có tên (mọi tầng tới phân nhóm 6 số) chưa có điều kiện đã duyệt */
  ANH_EM_CHUA_SO_HOA: 'anh-em-chua-so-hoa',
  /** chữ biểu tự chồng lấn với dòng khác — nêu cả hai */
  CHONG_LAN_VAN_BAN: 'chong-lan-van-ban',
});
const GIA_TRI = new Set(Object.values(LY_DO_CHUA_CHOT));

/** Lý do lạ (luật đi của dieu-kien-so thêm lý do mới mà chưa khai ở đây) ⇒ quy về CHUA_SO_HOA (vẫn không chốt). */
const chuanLyDo = (lyDo) => (GIA_TRI.has(lyDo) ? lyDo : LY_DO_CHUA_CHOT.CHUA_SO_HOA);
/** "<lyDo>:<mã>" — lyDo luôn thuộc enum. */
const taoChuaChot = (lyDo, ma) => `${chuanLyDo(lyDo)}:${ma}`;
/** Tách "<lyDo>:<mã>" (mã có thể chứa "~"). */
function tachChuaChot(s) {
  const t = String(s || ''); const i = t.indexOf(':');
  return i < 0 ? { lyDo: t, ma: null } : { lyDo: t.slice(0, i), ma: t.slice(i + 1) };
}

module.exports = { LY_DO_CHUA_CHOT, chuanLyDo, taoChuaChot, tachChuaChot };
