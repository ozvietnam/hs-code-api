// lib/do-thi/khoi-phan-biet.js — khối GÓI PHÂN BIỆT nối vào đầu vào vòng 2 (kế hoạch đồ thị mục 5, bước 4; HS_TIM_TRUOC=goi).
// Chỉ ĐƯA TRÍCH DẪN, không chọn mã (L3): nhóm nào còn sống do vòng 1 và tìm trước quyết, vòng 2 vẫn là bên quyết định.
'use strict';
const { goiPhanBiet } = require('./goi-phan-biet');

const TRAN_NHOM = 3; // kế hoạch mục 5 bước 3: giữ tối đa 3 nhóm
const NHAN = 'GÓI PHÂN BIỆT (DỮ LIỆU: câu loại trừ / phân biệt nguyên văn giữa các nhóm còn sống; chỉ áp dụng câu có điều kiện khớp hàng)';
const h4 = (x) => { const m = String(x ?? '').replace(/\D/g, '').slice(0, 4); return m.length === 4 ? m : null; };

/** Nhóm còn sống: nhóm vòng 1 nêu trước, rồi nhóm tìm trước, bỏ trùng, tối đa TRAN_NHOM. */
function nhomConSong(giaThiet, nhomTimTruoc) {
  const a = (Array.isArray(giaThiet) ? giaThiet : []).map((g) => h4(g && g.heading4));
  const b = (Array.isArray(nhomTimTruoc) ? nhomTimTruoc : []).map(h4);
  return [...new Set([...a, ...b].filter(Boolean))].slice(0, TRAN_NHOM);
}

/** @returns {{khoi: string, tomTat: {nhom: string[], soMuc: number, boBot: number, kyTu: number}}} khoi rỗng khi không có cạnh */
function khoiPhanBiet(giaThiet, nhomTimTruoc) {
  const g = goiPhanBiet(nhomConSong(giaThiet, nhomTimTruoc));
  return { khoi: g.vanBan ? `${NHAN}:\n${g.vanBan}` : '', tomTat: { nhom: g.nhom, soMuc: g.muc.length, boBot: g.boBot, kyTu: g.kyTu } };
}

/** Dựng sẵn cạnh ngang lúc khởi động (lần đầu vài giây) để khách đầu tiên không phải chờ. */
function lamNong() { require('./index').canhNgangGiua(['8481', '8412'], { toiDa: 1 }); }

module.exports = { khoiPhanBiet, nhomConSong, lamNong, NHAN, TRAN_NHOM };
