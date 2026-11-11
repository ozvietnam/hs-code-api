/**
 * lib/cum-tuy-chon.js — MỘT nơi nhận biết "cụm TUỲ CHỌN" ("có hoặc không …", whether or not …).
 *
 * Vì sao có tệp này (#1109, OZV-276): cụm "có hoặc không có X" / "whether or not X" nghĩa là X KHÔNG
 * ràng buộc — hàng có X hay không có X đều vào dòng đó. Đọc nó thành PHỦ ĐỊNH ("không có X") là sai
 * ngược nghĩa. Repo đã vấp đúng bẫy này ba lần ở ba chỗ rời nhau, nên gom bảng mẫu về một tệp để lần
 * sau ai sửa cũng sửa đúng một chỗ:
 *
 *   1. `lib/subheading-check.js#polarityText` — gặp thật khi đo 5.058 tờ khai: nhãn "có hoặc không có
 *      đầu, đuôi" và tờ khai viết tắt "ko có". Xoá cụm trước khi dò cực tính.
 *   2. `lib/ho-so/tach-ve.js` — dấu hiệu `TUY_CHON` + `giaDauHieu()` che cụm để chữ "không" bên trong
 *      không cắt thành vế phủ định.
 *   3. `lib/so-tay.js#CAU_CHO_PHEP` — câu CHO PHÉP ("… ngay cả khi …", "đã hoặc chưa …") không phải
 *      điều kiện vào nhóm.
 *
 * HAI MỨC, đừng trộn (đây là lý do không gộp được thành một hàm duy nhất):
 *
 *   - MỨC CỤM (`RE_CUM_TUY_CHON`, `boCumTuyChon`): chỉ cái liên từ "có hoặc không" / "whether or not".
 *     Dùng khi đang đọc CỰC TÍNH của một cụm trong câu (`lib/dieu-kien-so.js#khopCumTrongChu`,
 *     `subheading-check`): xoá liên từ đi rồi hãy dò phủ định.
 *   - MỨC CÂU (`RE_CAU_CHO_PHEP`): cả câu là câu cho phép ("vẫn được phân loại ở đây ngay cả khi…").
 *     Dùng khi quyết định câu đó CÓ PHẢI điều kiện hay không (`lib/so-tay.js`). "ngay cả khi không có
 *     đầu" vẫn chứa phủ định thật ở mức cụm — chỉ ở mức CÂU nó mới thành không-ràng-buộc. Nhập hai
 *     mức vào nhau sẽ xoá mất phủ định thật.
 *
 * Dạng chữ thực tế (quét toàn `data/tax.json`, 11.871 dòng): 51 biến thể tiếng Việt — "có hoặc không
 * có" (21), "đã hoặc chưa cắt" (9), "đã hoặc không ghép" (3), "có hoặc không kèm"… ; tiếng Anh
 * "whether or not" 1.255 dòng, "with or without" 88 dòng. Dạng gạch chéo ("có/không") KHÔNG có trong
 * biểu — không thêm vào để tránh đụng "và/hoặc".
 */

'use strict';

// Ranh giới chữ theo Unicode (không dùng \b — \b không hiểu chữ có dấu).
const TRUOC = '(?<![\\p{L}\\p{M}])';
const SAU = '(?![\\p{L}\\p{M}])';

// "có|đã|được hoặc không|chưa|ko|k" — gồm cả dạng viết tắt "ko"/"k" mà subheading-check gặp ngoài
// production ("có hoặc ko có"). Chỉ liên từ, KHÔNG ăn luôn động từ theo sau ("cắt", "có", "kèm"):
// động từ đứng lại là vô hại, còn ăn thêm thì dễ ăn lẹm sang chữ mang nghĩa.
const CUM_TUY_CHON_SRC = [
  `${TRUOC}(?:có|đã|được)\\s+hoặc\\s+(?:không|ko|k|chưa)${SAU}`,
  `${TRUOC}whether\\s+or\\s+not${SAU}`,
  `${TRUOC}with\\s+or\\s+without${SAU}`,
].join('|');

/** Mức CỤM — nhận biết liên từ tuỳ chọn. Không cờ `g` (dùng cho .test, tránh lastIndex dính). */
const RE_CUM_TUY_CHON = new RegExp(CUM_TUY_CHON_SRC, 'iu');
const RE_CUM_TUY_CHON_G = new RegExp(CUM_TUY_CHON_SRC, 'giu');

/**
 * Chữ đã bỏ dấu + chỉ còn [a-z0-9 ] (khuôn chữ của lib/subheading-check.js#polarityText).
 *
 * KHÁC bản có dấu ở MỘT chỗ, và khác có lý do — đo ra mới biết (OZV-276): bản này ăn luôn ĐỘNG TỪ
 * "co|chua" đứng sau liên từ. Vì bên polarityText, mục tiêu là đặc tính đó thành KHÔNG CÓ CỰC TÍNH —
 * không dương, không âm. Nếu chỉ xoá liên từ, "co hoac khong co ga" còn lại "co ga" ⇒ `POS_FEATURE`
 * đọc thành đặc tính DƯƠNG "ga", tức nhãn "Nước tăng lực có hoặc không có ga" (22021020) bị coi là
 * "có ga" và máy đem nó ra làm dòng gợi ý thay thế. Em làm đúng lỗi đó ở lượt đầu: `test-erp-input`
 * đỏ 2 ca ("không có ga" vs mô tả "có ga"), `main` xanh 33/33 — nên đây là hồi quy của em, không phải
 * máy. Bản có dấu ở `khopCumTrongChu` thì KHÔNG được ăn động từ: ở đó cụm tuỳ chọn phải ra KHẲNG ĐỊNH
 * (không ràng buộc = khớp được), chỉ cần chặn nhánh phủ định.
 */
const CUM_TUY_CHON_ASCII_SRC = '(?<![a-z])(?:co|da|duoc)\\s+hoac\\s+(?:khong|ko|k|chua)(?:\\s+(?:co|chua))?(?![a-z])'
  + '|(?<![a-z])whether\\s+or\\s+not(?![a-z])'
  + '|(?<![a-z])with\\s+or\\s+without(?![a-z])';
const RE_CUM_TUY_CHON_ASCII_G = new RegExp(CUM_TUY_CHON_ASCII_SRC, 'gi');

/** Mức CÂU — câu CHO PHÉP, không phải điều kiện vào nhóm. Nguồn: lib/so-tay.js (07/10/2026). */
const RE_CAU_CHO_PHEP = /ngay cả khi|vẫn (được phân loại|thuộc nhóm|được xếp|nằm trong nhóm)|đã hoặc chưa|whether or not|even if/i;

/** Có cụm tuỳ chọn trong chữ? */
function coCumTuyChon(s) {
  return RE_CUM_TUY_CHON.test(String(s || ''));
}

/**
 * Xoá cụm tuỳ chọn khỏi chữ, thay bằng KHOẢNG TRẮNG cùng độ dài (giữ nguyên độ dài + ranh giới từ, để
 * hai chữ hai bên không bị dán vào nhau thành từ lạ).
 */
function boCumTuyChon(s) {
  return String(s || '').replace(RE_CUM_TUY_CHON_G, (m) => ' '.repeat(m.length));
}

/** Bản cho chữ đã bỏ dấu (subheading-check): xoá cụm, thay bằng một khoảng trắng. */
function boCumTuyChonAscii(s) {
  return String(s || '').replace(RE_CUM_TUY_CHON_ASCII_G, ' ');
}

module.exports = {
  RE_CUM_TUY_CHON,
  RE_CAU_CHO_PHEP,
  coCumTuyChon,
  boCumTuyChon,
  boCumTuyChonAscii,
};
