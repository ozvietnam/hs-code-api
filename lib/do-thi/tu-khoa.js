// lib/do-thi/tu-khoa.js — rút từ khoá BẰNG LUẬT (không LLM) cho bảng cạnh (ADR-0002).
//
// Dùng ở hai chỗ:
//   - `tuKhoaTuTieuDe` của cạnh C11: từ nội dung của tiêu đề có tên riêng trong biểu thuế.
//   - `tuKhoaDieuKien` của cạnh C5 / C6: từ nội dung của chính dòng loại trừ gốc (`dieuKien`).
// Mọi từ khoá ở dạng KHÔNG DẤU, chữ thường (khách gõ "thuỷ"/"thủy"/"thuy" đều khớp). Đây là âm tiết, không phải từ đã
// tách nghĩa: "khí nén" → ["khi", "nen"]. Chỉ để SO KHỚP với mô tả hàng, không phải căn cứ (căn cứ là `trich`).
'use strict';

/** Bỏ dấu, đ→d, chữ thường; mọi ký tự không phải chữ / số thành dấu cách. Giữ chữ Hán. */
function khongDau(s) {
  return String(s == null ? '' : s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// Từ dừng (không dấu): hư từ, từ chỉ quan hệ, từ khung của biểu thuế / chú giải. Sửa danh sách này làm đổi bảng cạnh:
// chạy lại `node scripts/dung-bang-canh.mjs --ghi`.
const TU_DUNG = new Set(`va hoac cua cho co khong loai khac dung bang tu tren duoi cac nhung da hay the nay voi trong ngoai
duoc la thuoc ke ca tru den qua nhung tro len xuong chua mot hai theo nhu tai de khi ma o ra vao nhom phan chuong
muc chi tiet neu thi do boi ve so luc viec su bi phai can nao gi ay do day kia sen tuong tu chung rieng moi
other of or and the for with not than in to a an`.split(/\s+/).filter(Boolean));

// Âm tiết đứng đầu quá chung: một mình nó khớp thì chưa nói được gì ("máy …", "bộ …", "thiết bị …").
const DAU_QUA_CHUNG = new Set(`may bo thiet san hang do vat dung chat bo phan phu tam thanh ong day bang mieng
phe lieu linh kien chi tiet cum he thong`.split(/\s+/).filter(Boolean));

/** Từ khoá nội dung của một câu: bỏ từ dừng, bỏ số trần, bỏ âm tiết 1 ký tự; giữ thứ tự xuất hiện, bỏ trùng. */
function tuKhoa(cau) {
  const ra = [];
  const thay = new Set();
  for (const w of khongDau(cau).split(' ')) {
    if (w.length < 2 || TU_DUNG.has(w) || /^\d+$/.test(w) || thay.has(w)) continue;
    thay.add(w);
    ra.push(w);
  }
  return ra;
}

/**
 * Điều kiện của một dòng loại trừ có KHỚP mô tả hàng không. Luật (tất định):
 *   - âm tiết nội dung ĐẦU TIÊN của điều kiện (tiếng Việt: danh từ chính đứng đầu) phải có trong mô tả;
 *   - nếu âm tiết đầu thuộc nhóm quá chung ("máy", "bộ", "thiết"…) thì âm tiết nội dung THỨ HAI cũng phải có.
 * Trả null khi không khớp; khớp thì trả { soKhop, tyLe } để xếp hạng.
 * @param {string[]} tuKhoaDieuKien  từ khoá của điều kiện (đã rút bằng tuKhoa())
 * @param {Set<string>} tuMoTa        tập âm tiết không dấu của mô tả hàng
 */
function khopDieuKien(tuKhoaDieuKien, tuMoTa) {
  const k = tuKhoaDieuKien || [];
  if (!k.length || !tuMoTa || !tuMoTa.size) return null;
  if (!tuMoTa.has(k[0])) return null;
  if (DAU_QUA_CHUNG.has(k[0]) && !(k.length > 1 && tuMoTa.has(k[1]))) return null;
  let soKhop = 0;
  for (const w of k) if (tuMoTa.has(w)) soKhop += 1;
  return { soKhop, tyLe: Number((soKhop / k.length).toFixed(3)) };
}

/** Tập âm tiết không dấu của mô tả hàng (để truyền vào khopDieuKien). */
function tapTuMoTa(moTa) {
  return new Set(khongDau(moTa).split(' ').filter((w) => w.length >= 2));
}

module.exports = { khongDau, tuKhoa, khopDieuKien, tapTuMoTa, TU_DUNG, DAU_QUA_CHUNG };
