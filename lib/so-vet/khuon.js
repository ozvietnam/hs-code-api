// lib/so-vet/khuon.js — M-51 (#1919): Khuôn dữ liệu & hàm ghi Sổ ghi vết từng bước (ADR-0004, ADR-0005).
//
// Thuần ghi cấu trúc, không LLM, không chọn mã, không sửa nguyên văn câu trích.
'use strict';

const { MA_LOI: MA_LOI_ADR } = require('../cong-adr-0004');

const KHUON_SO_VET = 'so-vet@1';

const LOAI_BUOC = Object.freeze([
  'VAO_CUA',
  'LOC',
  'CHON',
  'KIEM',
  'CHUYEN_HUONG',
  'QUAY_LUI',
  'HOI',
  'KET_LUAN',
]);

const TRA_LOI_CANH = Object.freeze(['THOA', 'KHONG', 'CHUA_BIET']);

const TRUONG_BAT_BUOC_BUOC = Object.freeze([
  'loai',
  'nut',
  'cungCapDaThay',
  'daDoc',
  'trich',
  'chuKhach',
  'quyetDinh',
  'daSoKhongChon',
  'quyTacGir',
]);

const MA_LOI_SO_VET = Object.freeze({
  ...MA_LOI_ADR,
  SO_VET_RONG: 'Sổ ghi vết rỗng hoặc chưa có bước nào.',
  LOAI_BUOC_KHONG_HOP_LE: 'Loại bước không thuộc 8 bước hợp lệ: VAO_CUA, LOC, CHON, KIEM, CHUYEN_HUONG, QUAY_LUI, HOI, KET_LUAN.',
  THIEU_TRUONG_BUOC: 'Bước trong sổ thiếu trường bắt buộc (nút đứng, cùng cấp đã thấy, đã đọc, trích, chữ khách, quyết định, nút khác đã so, quy tắc GIR).',
  TRICH_KHONG_CO_TRONG_CAU: 'Câu trích hoặc id câu trong sổ không khớp nguyên văn câu luật gốc.',
  THIEU_NUT_BAT_BUOC_PHAI_DOC: 'Chưa đọc đủ các nút luật bắt buộc theo phaiDoc() trước khi quyết định.',
  CHON_NGOAI_CUNG_CAP_NHANH: 'Bước CHON chọn nút nằm ngoài danh sách nút cùng cấp cùng nhánh hợp lệ.',
  KIEM_SOT_CANH_LOAI_TRU: 'Bước KIEM bỏ sót cạnh loại trừ bắt buộc của nút theo phaiDoc().',
  KIEM_TRA_LOI_CANH_KHONG_HOP_LE: 'Mỗi mục trả lời cạnh ở bước KIEM phải ghi kết quả (THOA / KHONG / CHUA_BIET) kèm chữ khách.',
  CHUA_BIET_KHONG_CO_HOI: 'Cạnh loại trừ ở trạng thái CHUA_BIET nhưng sổ không có bước HOI (hoặc vẫn chốt mã khi chưa biết).',
  SAI_THU_TU_TANG_4_6_8: 'Vi phạm thứ tự chọn mã theo tầng 4 → 6 → 8 (nhảy cóc hoặc chốt thiếu tầng).',
  QUAY_LUI_THIEU_LY_DO: 'Bước QUAY_LUI bắt buộc phải ghi rõ lý do và nút đích quay về.',
  CHUYEN_HUONG_THIEU_DICH: 'Bước CHUYEN_HUONG bắt buộc phải ghi nút đích và căn cứ trích luật chuyển hướng.',
  LOC_KHONG_PHU_DU: 'Bước LOC phải giữ hoặc bỏ (kèm lý do) đúng mọi nhóm đã thấy, không sót, không trùng, không thêm nhóm lạ.',
  KIEM_NGOAI_LOC: 'Sổ có bước LOC nhưng KIEM một nhóm không do LOC giữ và cũng không do CHUYEN_HUONG chỉ sang.',
  TIEN_LE_TRONG_SO_VET: 'Cấm dùng nút tiền lệ (tb:* / TIEN_LE) làm nút đọc hoặc căn cứ pháp lý trong sổ ghi vết.',
});

function chuanHoaTraLoiCanh(v) {
  const s = String(v == null ? '' : v)
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (s === 'thoa' || s === 'thoả' || s === 'thỏa') return 'THOA';
  if (s === 'khong' || s === 'không') return 'KHONG';
  if (s === 'chua_biet' || s === 'chưa_biết' || s === 'chuabiet') return 'CHUA_BIET';
  return null;
}

/**
 * Khởi tạo một Sổ ghi vết mới (chỉ giữ khung dữ liệu, không chọn mã).
 */
function taoSoVet({
  moTaKhach = '',
  nguon = null,
  laBoPhan = false,
  mayChu = null,
  qt1SoNhom = null,
  ungVienSauQt1 = null,
  kiemBoPhan = null,
} = {}) {
  return {
    khuon: KHUON_SO_VET,
    moTaKhach: String(moTaKhach || ''),
    nguon,
    laBoPhan: Boolean(laBoPhan || String(mayChu || '').trim()),
    mayChu: mayChu ? String(mayChu) : null,
    qt1SoNhom: Number.isInteger(qt1SoNhom) ? qt1SoNhom : null,
    ungVienSauQt1: Array.isArray(ungVienSauQt1) ? [...ungVienSauQt1] : null,
    kiemBoPhan: kiemBoPhan && typeof kiemBoPhan === 'object' ? { ...kiemBoPhan } : null,
    cacBuoc: [],
  };
}

/**
 * Ghi nguyên vẹn một bước vào Sổ ghi vết (không biến đổi hay sửa nguyên văn trích).
 */
function ghiBuoc(so, buoc) {
  if (!so || !Array.isArray(so.cacBuoc)) {
    throw new Error('Sổ ghi vết không hợp lệ khi gọi ghiBuoc().');
  }
  const b = buoc && typeof buoc === 'object' ? { ...buoc } : {};
  so.cacBuoc.push(b);
  return so;
}

module.exports = {
  KHUON_SO_VET,
  LOAI_BUOC,
  TRA_LOI_CANH,
  TRUONG_BAT_BUOC_BUOC,
  MA_LOI_SO_VET,
  chuanHoaTraLoiCanh,
  taoSoVet,
  ghiBuoc,
};
