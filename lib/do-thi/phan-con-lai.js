// lib/do-thi/phan-con-lai.js — MỘT hàm nhận diện "phần còn lại" của một tiêu đề biểu thuế, dùng chung cho cạnh C11
// (lib/do-thi/dung-bang-canh.js) và cổng tiêu chí 6 số (lib/do-thi/tieu-chi-6.js). Tất định, không LLM.
//
// Ba kiểu tiêu đề:
//   'DU'            phần còn lại trần: "Loại khác", "Thiết bị khác", "Các loại máy khác"
//   'DU_CO_PHAM_VI' phần còn lại có nội dung: "Thiết bị bảo vệ mạch điện khác", "Loại khác, dùng cho xe có động cơ",
//                   "Chất màu khác và các chế phẩm khác" — vẫn là phần còn lại của các anh em đứng trước, cộng phạm vi riêng
//   'CO_TEN'        tên riêng. Kể cả "X và các Y khác" / "X hoặc các Y khác" mà vế đầu X KHÔNG kết thúc bằng "khác"
//                   ("Tượng nhỏ và các đồ trang trí khác", "Lecithins và các phosphoaminolipid khác"): chữ "khác" so với X
//                   trong chính tiêu đề, không so với phân nhóm anh em.
'use strict';

/** Bỏ gạch đầu dòng, dấu ":" cuối, "(SEN)", dấu chấm cuối. */
const gotTen = (t) => String(t || '').replace(/^[-\s]+/, '').replace(/\s*[:：]\s*$/, '').replace(/\s*\(SEN\)\s*$/i, '').replace(/\.\s*$/, '').trim();

const RE_LOAI_KHAC = /^lo[aạ]i kh[aá]c(\s|,|$)/iu;
const RE_PHAY_KHAC = /^(?:giày,\s*dép|dụng\s+cụ,\s*thiết\s+bị(?:\s+và\s+máy)?)\s+khác(?=\s|,|;|$)/iu;
const RE_DU_TRAN = /^(?:loại khác|giày,\s*dép khác|dụng cụ,\s*thiết bị(?: và máy)? khác|(?:các )?(?:loại|thiết bị|máy|máy móc|sản phẩm|hàng hoá|hàng hóa|mặt hàng|dạng|dụng cụ|đồ dùng|vật phẩm|chế phẩm)(?: (?:và|hoặc) (?:thiết bị|máy|dụng cụ|sản phẩm))? khác)$/u;
// "X và các Y khác" / "X hoặc các Y khác": "khác" thuộc liệt kê bên trong tiêu đề.
const RE_KHAC_NOI_BO = /^(.+?)\s(?:và|hoặc)\s+các\s+[^,;()]+\skhác$/iu;

/** Kiểu của một tiêu đề: 'DU' | 'DU_CO_PHAM_VI' | 'CO_TEN'; null khi rỗng. */
function kieuTieuDe(ten) {
  const t = gotTen(ten).normalize('NFC');
  if (!t) return null;
  const thuong = t.toLowerCase();
  const loaiKhac = RE_LOAI_KHAC.test(t);
  const dauPhayKhac = RE_PHAY_KHAC.test(t);
  const dau = t.split(/[,(;]/)[0].trim();
  if (!loaiKhac && !dauPhayKhac && !/(^|\s)kh[aá]c$/iu.test(dau)) return 'CO_TEN';
  if (!loaiKhac && !dauPhayKhac) { const m = RE_KHAC_NOI_BO.exec(dau); if (m && !/(^|\s)kh[aá]c$/iu.test(m[1].trim())) return 'CO_TEN'; }
  return RE_DU_TRAN.test(thuong) ? 'DU' : 'DU_CO_PHAM_VI';
}

/**
 * Hạng "dư" cho cạnh C11: 2 = "Loại khác…" (kể cả "Loại khác, <vế>"), 1 = phần còn lại có tên ("Thiết bị khác",
 * "Động cơ khác", "Thiết bị bảo vệ mạch điện khác"), 0 = tên riêng, null = không tên. Cùng luật với kieuTieuDe().
 */
function hangDu(ten) {
  const k = kieuTieuDe(ten);
  if (k === null) return null;
  if (k === 'CO_TEN') return 0;
  return RE_LOAI_KHAC.test(gotTen(ten)) ? 2 : 1;
}

module.exports = { kieuTieuDe, hangDu, gotTen };
