/**
 * Tra nghĩa vụ quản lý theo CHẤT (không theo mã HS) — #322.
 * Tiền chất bảng I/II quản theo tên chất + CAS, không theo mã HS 8 số.
 * Khi /api/tax hoặc tra_thu_tuc_nhap_khau tra theo mã HS mà không thấy giấy phép →
 * móc vào đây: mã HS có trong maHsPhoBien hoặc tên hàng chứa tenChat → trả khối nghiaVuChat.
 */
const fs = require('fs');
const { dataReadPath } = require('./data-paths');

let _db = null;
function db() {
  if (_db) return _db;
  try { _db = JSON.parse(fs.readFileSync(dataReadPath('substance-duties.json'), 'utf8')); }
  catch { _db = { chat: [] }; }
  return _db;
}

/** Chuẩn hoá tên chất để so khớp (bỏ dấu, lowercase, bỏ khoảng trắng thừa). */
const boDau = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Tra theo mã HS — trả mọi chất có maHsPhoBien chứa mã này.
 * @returns {Array<object>} các mục chat khớp
 */
function theoMaHs(hsCode) {
  const hs = String(hsCode || '').replace(/\D/g, '').slice(0, 8);
  if (!hs) return [];
  return db().chat.filter((c) => (c.maHsPhoBien || []).includes(hs));
}

/**
 * Tra theo tên hàng — tên chất có trong mô tả (bỏ dấu, lowercase).
 * @returns {Array<object>}
 */
function theoTenHang(text) {
  const t = boDau(text);
  if (!t || t.length < 4) return [];
  return db().chat.filter((c) => {
    if (!c.tenChat) return false;
    // tên chính (trước ngoặc) — vd "Kalium permanganicum"
    const tenChinh = boDau(c.tenChat.split('(')[0]);
    // tên gọi thường (trong ngoặc, trước dấu phẩy/dấu chấm) — vd "Kali permanganat"
    const trongNgoac = c.tenChat.match(/\(([^)]+)\)/)?.[1] || '';
    const tenThuong = boDau(trongNgoac.split(/[,;]/)[0]);
    // khớp: tên chính trong text, HOẶC tên thường (≥4 ký tự) trong text
    return (tenChinh.length >= 4 && t.includes(tenChinh)) || (tenThuong.length >= 4 && t.includes(tenThuong));
  });
}

/**
 * Tra nghĩa vụ chat — dùng cho /api/tax.
 * @param {string} hsCode 8 số
 * @param {string} tenHang tên hàng (tuỳ chọn)
 * @returns {null|{nghiaVuChat: object, nguon: string[]}} — null khi không khớp
 */
function nghiaVuChat(hsCode, tenHang = '') {
  let khop = theoMaHs(hsCode);
  if (!khop.length && tenHang) khop = theoTenHang(tenHang);
  if (!khop.length) return null;
  const c = khop[0]; // lấy chất đầu tiên khớp — nhiều chất cùng mã hiếm
  return {
    nghiaVuChat: {
      tenChat: c.tenChat,
      cas: c.cas,
      nhom: c.nhom,
      nghiaVu: c.nghiaVu,
      coQuan: c.coQuan,
      dichVuCong: c.dichVuCong,
      mauDon: c.mauDon,
      thoiHanGiaiQuyet: c.thoiHanGiaiQuyet,
      nguongMienGiam: c.nguongMienGiam,
    },
    nguon: c.vanBan,
    ghiChu: 'Nghĩa vụ quản lý theo CHẤT (NĐ 113/2017 sđ 82/2022), không theo mã HS — mã HS chỉ tham khảo.',
  };
}

module.exports = { nghiaVuChat, theoMaHs, theoTenHang };
