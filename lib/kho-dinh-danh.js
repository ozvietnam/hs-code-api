// lib/kho-dinh-danh.js — Kho định danh / Đồ thị hàng hoá theo hãng+model (OZV-1657 · PR1a).
//
// Thiết kế: docs/design/2026-11-20-kho-dinh-danh-do-thi-hang-hoa.md mục 2–3.
//
// Chế độ (biến HS_KHO_DINH_DANH), mặc định off:
//   off    — không đọc, không ghi; docKho trả null ngay.
//   shadow — (PR sau) tra thử kho + log số đo; vẫn chạy identify như cũ.
//   on     — (PR sau) trả từ kho khi đủ CORROBORATED/VERIFIED.
//
// PR1a: chỉ chuẩn hoá hãng/model + stub docKho + migration 0004. Chưa nối identify/classify.

const HAN_DOC_MAC_DINH = 100;

/** Chế độ hiện hành: 'off' | 'shadow' | 'on'. */
function cheDoKhoDinhDanh() {
  const v = String(process.env.HS_KHO_DINH_DANH || 'off').trim().toLowerCase();
  if (v === 'on') return 'on';
  if (v === 'shadow') return 'shadow';
  return 'off';
}

/** Trần đọc kho (ms) — thiết kế mục 6: < 100 ms. PR1a cố định; chưa mở env riêng. */
function hanDocMs() {
  return HAN_DOC_MAC_DINH;
}

// Hậu tố pháp nhân / từ loại bỏ ở cuối tên hãng (thiết kế mục 3.1).
const HAU_TO_HANG = [
  '股份有限公司',
  '有限公司',
  '주식회사',
  'corporation',
  'electronics',
  'electric',
  'gmbh',
  'corp\\.',
  'corp',
  'inc\\.',
  'inc',
  'ltd\\.',
  'ltd',
  'co\\.',
  'co',
  'llc\\.',
  'llc',
  'ag',
];
const HAU_TO_HANG_RE = new RegExp(
  `(?:\\s+(?:${HAU_TO_HANG.join('|')}))+$`,
  'iu',
);

/**
 * Chuẩn hoá hãng / thương hiệu → khoá chữ thường.
 * "Mitsubishi Electric Corp." → "mitsubishi"
 */
function chuanHoaHang(s) {
  if (s == null) return null;
  let t = String(s).normalize('NFKC').trim().toLowerCase();
  if (!t) return null;
  // Lặp cắt hậu tố đến khi hết (Electric Corp. → cắt corp. rồi electric).
  for (let i = 0; i < 8; i += 1) {
    const next = t.replace(HAU_TO_HANG_RE, '').replace(/\s+/g, ' ').trim();
    if (next === t) break;
    t = next;
  }
  t = t.replace(/\s+/g, ' ').trim();
  return t || null;
}

// Tiền tố nhãn model (thiết kế mục 3.1).
const TIEN_TO_MODEL_RE = /^(?:model|mã|ma|type|p\/n|part\s*no\.?|part\s*number|pn|型号)\s*[:：#.\-]?\s*/iu;

/** Đơn vị đo / mã chung chung — không tạo nút MODEL. */
const MODEL_CHUNG_RE = /^(?:\d+(?:w|v|a|kw|hp|mm|cm|kg|g|hz|vac|vdc)?|dn\d+|m\d+|r\d+)$/i;

/**
 * Chuẩn hoá model → { chuan, rutGon } hoặc null nếu bị chặn.
 * chuan: chữ hoa ASCII, giữ gạch/chấm/khoảng giữa cụm chữ-số.
 * rutGon: chỉ [a-z0-9], dùng tra cứu.
 */
function chuanHoaModel(s) {
  if (s == null) return null;
  let t = String(s).normalize('NFKC').trim();
  if (!t) return null;
  t = t.replace(TIEN_TO_MODEL_RE, '').trim();
  if (!t) return null;

  // Chữ hoa ASCII; giữ khoảng trắng / gạch / chấm / gạch chéo giữa cụm.
  const chuan = t
    .replace(/[a-z]/g, (c) => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
  const rutGon = chuan.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!rutGon || rutGon.length < 4) return null;
  if (MODEL_CHUNG_RE.test(rutGon)) return null;
  return { chuan, rutGon };
}

/**
 * Đọc kho theo hãng+model đã chuẩn hoá.
 * PR1a: off → null ngay; shadow/on → stub null (chưa nối DB / identify).
 * Không ném.
 */
async function docKho(_hangChuan, _modelRutGon, _opts = {}) {
  try {
    if (cheDoKhoDinhDanh() === 'off') return null;
    // Stub PR1a — PR bóng sau sẽ tra dd_bi_danh → dd_nut → dd_du_kien.
    return null;
  } catch {
    return null;
  }
}

/** Khoá nối với kho_dap_an: hang::model_rut_gon (thiết kế mục 2.1). */
function khoaHangModel(hang, model) {
  const h = typeof hang === 'string' ? chuanHoaHang(hang) : hang;
  const m = typeof model === 'string' ? chuanHoaModel(model) : model;
  const hangChuan = typeof h === 'string' ? h : null;
  const rut = m && typeof m === 'object' ? m.rutGon : (typeof m === 'string' ? m : null);
  if (!hangChuan || !rut) return null;
  return `${hangChuan}::${rut}`.slice(0, 200);
}

module.exports = {
  cheDoKhoDinhDanh,
  hanDocMs,
  chuanHoaHang,
  chuanHoaModel,
  docKho,
  khoaHangModel,
  HAN_DOC_MAC_DINH,
};
