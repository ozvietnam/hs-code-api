// Vòng 1 (CEO 28/10, sửa Đợt 0B 29/10): biểu thuế dùng để KIỂM tên hàng, không THAY tên hàng.
//
// Bản 28/10 thay tên khách bằng chữ dòng 8 số / nhóm 4 số ("Các loại giày, dép khác…", "…hoặc…hoặc…",
// "kể cả chuột, bút quang…") → chuỗi chung chung, đúng kiểu mô tả mơ hồ TT 39/CV 5189 muốn tránh, và ngược thực tế
// khai của Oz (tên càng gần sản phẩm thật càng tốt). Nay:
//   - giữ tên hàng thật (tên khách hoặc tên LLM đã chuẩn hoá);
//   - chỉ thay khi tên mơ hồ (rỗng, chữ Hán, tên ngoại ngữ/lóng 1–2 từ như "laptop") — khi đó lấy DANH TỪ cụ thể đầu
//     dòng biểu thuế, KHÔNG BAO GIỜ dùng chuỗi chứa "các loại", "loại khác", "hoặc", "kể cả";
//   - tên lệch danh từ của nhánh → cảnh báo, không thay;
//   - bỏ mệnh đề "không gồm …" chép từ biểu thuế (sai dạng; mệnh đề loại trừ đúng làm ở đợt sau).
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { composeWithMeta } = require('./describe-compose.js');

const CJK = /[㐀-鿿豈-﫿]/;
const VI_RE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const CAM_RE = /(?<![\p{L}])(các loại|loại khác|khác|hoặc|kể cả)(?![\p{L}])/iu;
const STOP = new Set(['cac', 'loai', 'khac', 'hoac', 'bang', 'cua', 'cho', 'voi', 'khong', 'nhung', 'tren', 'duoi', 'dung', 'trong', 'mot', 'nho', 'chi', 'tiet', 'phan', 'san', 'pham', 'hang', 'nhom', 'tu', 'den', 'the', 'chua', 'duoc', 'hay']);

/** Chuẩn hoá tiếng Việt đơn giản để so khớp từ khoá (bỏ dấu, chữ thường). */
export function chuanTiengViet(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

const sach = (s) => String(s || '').replace(/\(\+\)/g, '').replace(/^[\s-]+|[\s.-]+$/g, '').replace(/\s+/g, ' ').trim();
const tuLoi = (s) => new Set(chuanTiengViet(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOP.has(t)));

/** Tên mơ hồ: rỗng, còn chữ Hán, hoặc tên ngoại ngữ/lóng 1–2 từ không dấu ("laptop", "tablet pc"). */
export function laTenMoHo(ten) {
  const t = sach(ten);
  if (!t || t.length < 3) return true;
  if (CJK.test(t)) return true;
  if (!VI_RE.test(t) && t.split(' ').length <= 2) return true;
  return false;
}

/**
 * Danh từ cụ thể đầu một tên biểu thuế: cắt ở dấu ngăn/"kể cả"/"hoặc"/ngoặc, bỏ tiền tố "Các loại".
 * Kết quả còn chữ cấm ("khác", "hoặc", "kể cả", "các loại") hoặc quá ngắn → null (không dùng).
 */
export function danhTuCuThe(tenBieu) {
  let t = sach(tenBieu).replace(/^(các loại|các|loại)\s+/iu, '');
  t = t.split(/\s*[;:(]\s*|,\s+|\s+(?:kể cả|hoặc|trừ|loại trừ|có hoặc không)(?![\p{L}])/iu)[0];
  t = sach(t);
  if (!t || t.length < 4 || CAM_RE.test(t)) return null;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Chọn tên hàng cho mô tả: GIỮ tên thật; biểu thuế chỉ để kiểm.
 * → { ten, thayDoi, lyDo, canhBao: [{ code, messageVi }] }
 */
export function chonTenHang({ tenHangKhach, breadcrumb }) {
  const khach = sach(tenHangKhach);
  const canhBao = [];
  if (!breadcrumb) return { ten: khach, thayDoi: false, lyDo: 'KHONG_CO_CAY', canhBao };
  const selfVi = sach(breadcrumb.selfVi);
  const laLoaiKhac = !selfVi || chuanTiengViet(selfVi).includes('loai khac');
  const nguonDanhTu = [laLoaiKhac ? null : selfVi, breadcrumb.headingVi].filter(Boolean);

  if (laTenMoHo(khach)) {
    const danhTu = nguonDanhTu.map(danhTuCuThe).find(Boolean) || null;
    if (danhTu) {
      return {
        ten: danhTu,
        thayDoi: true,
        lyDo: 'TEN_MO_HO',
        canhBao: [{ code: 'TEN_HANG_DA_THAY', messageVi: `Tên hàng "${khach || '(trống)'}" mơ hồ/ngoại ngữ — dùng danh từ biểu thuế "${danhTu}". Kiểm lại tên thương mại thật của hàng.` }],
      };
    }
    canhBao.push({ code: 'TEN_HANG_MO_HO', messageVi: `Tên hàng "${khach || '(trống)'}" mơ hồ và không rút được danh từ cụ thể từ biểu thuế — cần tên hàng tiếng Việt cụ thể.` });
    return { ten: khach, thayDoi: false, lyDo: 'TEN_MO_HO_KHONG_THAY', canhBao };
  }

  // Kiểm: tên khách không trùng chữ lõi nào của nhánh (dòng 8 số + nhóm 4 số) → cảnh báo, KHÔNG thay.
  const loiNhanh = new Set([...tuLoi(laLoaiKhac ? '' : selfVi), ...tuLoi(breadcrumb.headingVi)]);
  const loiKhach = tuLoi(khach);
  if (loiNhanh.size && loiKhach.size && ![...loiKhach].some((t) => loiNhanh.has(t))) {
    canhBao.push({
      code: 'TEN_LECH_NHANH',
      messageVi: `Tên hàng "${khach}" không chứa danh từ nào của nhánh ${breadcrumb.hsCode || ''} ("${danhTuCuThe(laLoaiKhac ? breadcrumb.headingVi : selfVi) || sach(breadcrumb.headingVi).slice(0, 80)}") — kiểm lại mã HS hoặc tên hàng.`,
    });
  }
  return { ten: khach, thayDoi: false, lyDo: 'GIU_TEN_KHACH', canhBao };
}

/** Tương thích: trả về tên đã chọn (chuỗi). */
export function anchorTenBieuThue({ tenHangKhach, breadcrumb }) {
  return chonTenHang({ tenHangKhach, breadcrumb }).ten;
}

/**
 * Ghép mô tả ≤ 200 ký tự theo khuôn Oz (describe-compose): tên → đặc trưng phân loại → kích thước →
 * model, hiệu/"không hiệu", NSX → tình trạng; dấu phẩy; không "xuất xứ"; không "không gồm…".
 */
export function gopMoTaPhapLy({ declaration, tenHang, hsCode, keepSpecs = false, maxLength } = {}) {
  const d = { ...(declaration || {}), ...(tenHang ? { tenHang } : {}) };
  return composeWithMeta(d, { hsCode, keepSpecs, ...(maxLength ? { maxLength } : {}) });
}
