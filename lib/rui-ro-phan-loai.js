// lib/rui-ro-phan-loai.js — tín hiệu Danh mục rủi ro phân loại QĐ 2079/QĐ-TCHQ (L0g, #545).
//
// CÔNG KHAI từ 30/10/2026 (CEO đảo quyết định 29/10 "chỉ nội bộ"): QĐ 2079 là văn bản nhà nước, ai cũng cần để tuân thủ
// → trả cho MỌI người gọi (công khai, cong-oz, ERP). Không lọc quyền ở đây; tham số `noiBo` cũ bị bỏ qua.
//
// Vẫn là TÍN HIỆU SOÁT, KHÔNG phải căn cứ pháp lý (bản bên thứ ba đăng, bậc C, theo AHTN 2017 — luật chính xác 6/7a):
//   - không bao giờ vào canCuPhapLy / girRulesApplied / trích dẫn điều luật;
//   - mã theo AHTN 2017 → người dùng đối chiếu biểu hiện hành trước khi dựa vào.
// `MO_TA_GIONG_MA_KHAC` (đếm từ kho tờ khai Oz) là chuyện khác: vẫn chỉ nội bộ (lib/auth.js#laNoiBoOz) — không ở tệp này.
//
// Nguồn (gộp, bỏ trùng theo mã liên quan):
//   1. Bảng TĨNH data/rui-ro-phan-loai/qd-2079.json (chỉ đọc, versioned bằng git) — chưa có tệp ⇒ bỏ qua;
//   2. Postgres bảng rui_ro_phan_loai (tuỳ chọn) — HS_DATABASE_URL chưa đặt / lỗi ⇒ bỏ qua.
// Không nguồn nào có dữ liệu ⇒ [] và trangThaiDanhMuc() báo CHUA_CO_DU_LIEU. Không bao giờ làm hỏng lượt chính.

const fs = require('fs');
const { layPool, maLoi, dbDaCauHinh } = require('./db');
const { dataReadPath } = require('./data-paths');
const { docVaKiem } = require('./nap-qd2079');

const NHAN = 'QD_2079_BAC_C';
/** Nhãn cũ (29/10, thời "nội bộ") — giữ làm bí danh cho ai còn đọc nhãn này. */
const NHAN_CU = 'QD_2079_BAC_C_NOI_BO';
const GHI_CHU = 'Tín hiệu rủi ro phân loại (Danh mục rủi ro về phân loại hàng hóa kèm QĐ 2079/QĐ-TCHQ; bản bên thứ ba đăng, bậc C, theo AHTN 2017) — không phải căn cứ pháp lý; đối chiếu mã với biểu thuế hiện hành.';
const TEP_TINH = 'rui-ro-phan-loai/qd-2079.json';

function laNhanQd2079(nhan) {
  return nhan === NHAN || nhan === NHAN_CU;
}

/** Tiền tố 8/6/4 số (không trùng) của mã HS; mã không hợp lệ ⇒ []. */
function tienTo(maHs) {
  const so = String(maHs ?? '').replace(/[\s.]/g, '');
  if (!/^[0-9]{4,10}$/.test(so)) return [];
  return [...new Set([8, 6, 4].filter((n) => so.length >= n).map((n) => so.slice(0, n)))];
}

const boNho = new Map(); // đường dẫn → { mtimeMs, size, cap }

/** Các cặp hợp lệ của bảng tĩnh (mặc định data/rui-ro-phan-loai/qd-2079.json). Không có tệp / hỏng ⇒ []. */
function capTepTinh(file) {
  const p = file || dataReadPath(TEP_TINH);
  let st;
  try { st = fs.statSync(p); } catch { return []; }
  if (!st.isFile()) return [];
  const c = boNho.get(p);
  if (c && c.mtimeMs === st.mtimeMs && c.size === st.size) return c.cap;
  let cap = [];
  try {
    cap = docVaKiem(fs.readFileSync(p)).hopLe;
  } catch (e) {
    console.warn(`[rui-ro-phan-loai] bảng tĩnh không đọc được: ${String(e?.message || e).slice(0, 120)}`);
  }
  boNho.set(p, { mtimeMs: st.mtimeMs, size: st.size, cap });
  return cap;
}

function layDb(opts) {
  return Object.prototype.hasOwnProperty.call(opts, 'db') ? opts.db : layPool();
}

/**
 * @param {string} maHs
 * @param {{ db?: { query: Function } | null, file?: string }} [opts] — db mặc định layPool(); file mặc định bảng tĩnh
 * @returns {Promise<Array<{ loai: 'DANH_MUC_RUI_RO', maLienQuan: string, maKhop: string, tenHang?: string, nguon: 'TEP_TINH'|'POSTGRES', nhan: string, ghiChu: string }>>}
 */
async function tinHieuDanhMuc(maHs, opts = {}) {
  opts = opts || {};
  const ma = tienTo(maHs);
  if (!ma.length) return [];
  const out = [];
  const daCo = new Set();
  const them = (a, b, tenHang, nguon) => {
    const khopA = ma.includes(a);
    const maKhop = khopA ? a : b;
    const maLienQuan = khopA ? b : a;
    if (!maLienQuan || daCo.has(maLienQuan)) return;
    daCo.add(maLienQuan);
    out.push({
      loai: 'DANH_MUC_RUI_RO',
      maLienQuan,
      maKhop,
      ...(tenHang ? { tenHang: String(tenHang) } : {}),
      nguon,
      nhan: NHAN,
      ghiChu: GHI_CHU,
    });
  };

  for (const r of capTepTinh(opts.file)) {
    if (ma.includes(r.maA) || ma.includes(r.maB)) them(r.maA, r.maB, r.tenHang, 'TEP_TINH');
    if (out.length >= 50) return out;
  }

  const db = layDb(opts);
  if (!db) return out;
  let rows;
  try {
    ({ rows } = await db.query(
      'SELECT ma_a, ma_b, ten_hang FROM rui_ro_phan_loai WHERE ma_a = ANY($1::text[]) OR ma_b = ANY($1::text[]) ORDER BY id LIMIT 50',
      [ma],
    ));
  } catch (e) {
    console.warn(`[rui-ro-phan-loai] đọc DB lỗi: ${maLoi(e)}`);
    return out;
  }
  for (const r of rows || []) them(r.ma_a, r.ma_b, r.ten_hang, 'POSTGRES');
  return out;
}

/**
 * Danh mục đã có dữ liệu chưa (để phân biệt "chưa nạp" với "mã không có trong danh mục").
 * @returns {Promise<{ trangThai: 'CO_DU_LIEU'|'CHUA_CO_DU_LIEU', soCapTepTinh: number, postgres: boolean }>}
 */
async function trangThaiDanhMuc(opts = {}) {
  opts = opts || {};
  const soCapTepTinh = capTepTinh(opts.file).length;
  const coDb = Object.prototype.hasOwnProperty.call(opts, 'db') ? Boolean(opts.db) : dbDaCauHinh();
  return { trangThai: soCapTepTinh > 0 || coDb ? 'CO_DU_LIEU' : 'CHUA_CO_DU_LIEU', soCapTepTinh, postgres: coDb };
}

module.exports = { tinHieuDanhMuc, trangThaiDanhMuc, laNhanQd2079, tienTo, NHAN, NHAN_CU, GHI_CHU, TEP_TINH };
