// Bảng trục vật liệu — cổng 2 dùng để so hai điều kiện "là vật liệu X" ở hai KHOÁ KHÁC NHAU.
// Vấn đề (#1102): sắt/thép, plastic, nhôm, gỗ chỉ đọc được qua `chatLieu` (@1 đóng băng),
// titan, carbon-graphit chỉ có ở `vatLieuKhac` (@2). Cổng 2 không biết hai khoá cùng
// trục vật liệu nên báo chồng lấn giả (902129, 962000).

'use strict';

// Các khoá cùng trục VẬT LIỆU (một chỗ để cổng 2 tra)
const KHOA_VAT_LIEU = new Set(['chatLieu', 'vatLieuKhac', 'kimLoaiCoBanKhac']);

// Quan hệ bao-nhau giữa giá trị vật liệu (giá trị bao ⊃ giá trị bị bao)
// Cặp rời nhau: sắt/thép vs titan, carbon-graphit vs plastic/sắt/nhôm/gỗ...
const BAO = [
  { bao: 'kim loại', nhom: ['sắt', 'thép', 'titan', 'nhôm', 'đồng', 'chì', 'kẽm', 'thiếc', 'niken', 'magie'] },
  { bao: 'nhựa', nhom: ['plastic', 'nhựa', 'polyme'] },
  { bao: 'gỗ', nhom: ['gỗ', 'tre'] },
];

function chuanHoa(s) { return String(s || '').toLowerCase().trim(); }

/** Hai giá trị vật liệu rời nhau (không giao, không bao nhau)? */
function roiNhau(a, b) {
  const A = chuanHoa(a), B = chuanHoa(b);
  if (!A || !B || A === B) return false;
  // Kiểm tra bao nhau
  for (const { bao, nhom } of BAO) {
    const aBao = A.includes(bao) || nhom.some(x => A.includes(x));
    const bBao = B.includes(bao) || nhom.some(x => B.includes(x));
    // Cả hai thuộc cùng nhóm bao → không rời
    if (aBao && bBao && (A.includes(bao) || B.includes(bao))) {
      // Một cái là "kim loại" chung, cái kia cụ thể → BAO, không rời
      return false;
    }
  }
  // "sắt hoặc thép" vs "titan": cả hai kim loại nhưng khác cụ thể → rời
  return true;
}

/** Hai điều kiện có phải cặp vật liệu cùng trục (khác khoá) cần so đặc biệt? */
function laCapVatLieuKhacKhoa(dkA, dkB) {
  if (!dkA || !dkB) return false;
  const aKhoa = dkA.fact, bKhoa = dkB.fact;
  if (aKhoa === bKhoa) return false; // cùng khoá — cổng 2 cũ xử lý
  return KHOA_VAT_LIEU.has(aKhoa) && KHOA_VAT_LIEU.has(bKhoa)
    && ['LA', 'TRONG'].includes(dkA.op) && ['LA', 'TRONG'].includes(dkB.op);
}

/** So cặp: hai điều kiện vật liệu khác khoá có rời nhau (không chồng lấn)? */
function capVatLieuRoi(dkA, dkB) {
  if (!laCapVatLieuKhacKhoa(dkA, dkB)) return null; // không phải cặp này
  const giaTriA = Array.isArray(dkA.value) ? dkA.value : [dkA.value];
  const giaTriB = Array.isArray(dkB.value) ? dkB.value : [dkB.value];
  // MỌI cặp giá trị đều rời → hai điều kiện rời nhau
  for (const a of giaTriA) {
    for (const b of giaTriB) {
      if (!roiNhau(a, b)) return false; // có cặp giao/bao → không rời hoàn toàn
    }
  }
  return giaTriA.length > 0 && giaTriB.length > 0;
}

module.exports = { KHOA_VAT_LIEU, roiNhau, laCapVatLieuKhacKhoa, capVatLieuRoi };
