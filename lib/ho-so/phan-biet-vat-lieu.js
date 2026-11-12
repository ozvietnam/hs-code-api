/**
 * lib/ho-so/phan-biet-vat-lieu.js — phân biệt VẬT LIỆU ở TẦNG TIÊU ĐỀ 6 SỐ (#OZV-558, OZV-540 T2).
 *
 * Có nhóm HS mà các TIÊU ĐỀ 6 SỐ ANH EM phân biệt nhau bằng VẬT LIỆU (vd 8546: 854610 "Bằng thuỷ tinh" ·
 * 854620 "Bằng gốm, sứ" · 854690 "Loại khác" — bazan nóng chảy, cao su cứng, plastic, vật liệu cách điện
 * tổng hợp theo chú giải nhóm). Khi mô tả hàng nêu vật liệu thì VẬT LIỆU quyết định TIÊU ĐỀ, chứ không
 * chỉ đuôi 8 số. Máy chốt dòng 8 số theo CÙNG phân nhóm (`lib/so-tay-gates.js#chotDong8` lọc ứng viên
 * theo đúng 6 số) nên không bao giờ vượt biên phân nhóm ⇒ hàng nhựa/cao su hỏi ở 854620 vẫn bị chốt
 * 85462010 (gốm sứ). Đây là lỗi T2 của OZV-540, sửa ở OZV-558.
 *
 * Dữ liệu: `data/ho-so/phan-biet-vat-lieu/<nhom4>.json` — mỗi nhóm TỰ KHAI (opt-in) ⇒ phạm vi thay đổi
 * đúng bằng nhóm khai báo, không nới thước chung. Mỗi vế mang `nguon` + `trich` chép NGUYÊN VĂN chú giải
 * nhóm (nhãn loại nguồn: `lib/nguon-loai.js` — TEP `ho-so/phan-biet-vat-lieu/*.json`).
 *
 * Quy tắc an toàn: vật liệu KHÔNG đọc được (mô tả không nêu, hoặc nêu vật liệu chưa có trong bảng đọc)
 * ⇒ KHÔNG suy ra vế nào ⇒ giữ nguyên hành vi cũ (chốt theo tiêu đề đang hỏi). "Trích sai mã tệ hơn không trích".
 */
const fs = require('fs');
const { dataReadPath } = require('../data-paths');

const cache = new Map();

/** Hồ sơ phân biệt vật liệu của nhóm 4 số, hoặc null nếu nhóm chưa khai báo / tệp hỏng. */
function loadPhanBietVatLieu(h4) {
  const k = String(h4 || '').replace(/\D/g, '').slice(0, 4);
  if (k.length !== 4) return null;
  const p = dataReadPath('ho-so', 'phan-biet-vat-lieu', `${k}.json`);
  if (!cache.has(p)) {
    let v = null;
    try { v = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { v = null; }
    cache.set(p, v && v.nhom === k && Array.isArray(v.vay) && v.vay.length ? v : null);
  }
  return cache.get(p);
}

/** Vế phân biệt ứng với vật liệu đã đọc được (tên vật liệu canonical của bảng đọc), hoặc null. */
function vayTheoVatLieu(h4, vatLieu) {
  const pb = loadPhanBietVatLieu(h4);
  if (!pb) return null;
  const v = (pb.vay || []).find((x) => x && x.vatLieu === vatLieu && /^\d{6}$/.test(String(x.pn6 || '')));
  return v ? { ...v, nguon: pb.nguon, trich: pb.trich, nguonLoai: pb.nguonLoai } : null;
}

/** Tập tên vật liệu mà nhóm này khai phân biệt (dùng để lọc vật liệu đọc được). */
function vatLieuDaKhai(h4) {
  const pb = loadPhanBietVatLieu(h4);
  return new Set((pb?.vay || []).map((x) => x?.vatLieu).filter(Boolean));
}

module.exports = { loadPhanBietVatLieu, vayTheoVatLieu, vatLieuDaKhai };
