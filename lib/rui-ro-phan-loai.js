// lib/rui-ro-phan-loai.js — tín hiệu Danh mục rủi ro phân loại QĐ 2079/QĐ-TCHQ (L0g, #545).
//
// CHỈ NỘI BỘ OZ. Bản bên thứ ba đăng, bậc C, theo AHTN 2017 → dùng làm TÍN HIỆU SOÁT, KHÔNG phải căn cứ pháp lý:
//   - không bao giờ vào canCuPhapLy / girRulesApplied / trích dẫn điều luật (luật 6, 7a);
//   - không bao giờ trả cho lượt công khai, HS_API_TOKEN hay khoá cong-oz (Cổng phục vụ khách ngoài).
// Người gọi truyền noiBo = laNoiBoOz(req) (lib/auth.js). noiBo !== true ⇒ [] TRƯỚC KHI chạm DB.
// DB chưa cấu hình / lỗi ⇒ [] (tầng tuỳ chọn, không bao giờ làm hỏng lượt chính).
//
// L0 chưa nơi nào gọi hàm này — nối vào soát/hồ sơ ở L1-5b (lọc quyền ở nguồn, `locTheoQuyen`).

const { layPool, maLoi } = require('./db');

const NHAN = 'QD_2079_BAC_C_NOI_BO';
const GHI_CHU = 'Tín hiệu nội bộ (bản bên thứ ba đăng, bậc C, theo AHTN 2017) — không phải căn cứ pháp lý, không đưa nguyên văn ra khách.';

/** Tiền tố 8/6/4 số (không trùng) của mã HS; mã không hợp lệ ⇒ []. */
function tienTo(maHs) {
  const so = String(maHs ?? '').replace(/[\s.]/g, '');
  if (!/^[0-9]{4,10}$/.test(so)) return [];
  return [...new Set([8, 6, 4].filter((n) => so.length >= n).map((n) => so.slice(0, n)))];
}

/**
 * @param {string} maHs
 * @param {{ noiBo?: boolean, db?: { query: Function } | null }} [opts] — db mặc định layPool() (chỉ khi noiBo === true)
 * @returns {Promise<Array<{ loai: 'DANH_MUC_RUI_RO', maLienQuan: string, maKhop: string, tenHang?: string, nhan: string, ghiChu: string }>>}
 */
async function tinHieuDanhMuc(maHs, opts = {}) {
  if (!opts || opts.noiBo !== true) return [];
  const ma = tienTo(maHs);
  if (!ma.length) return [];
  const db = Object.prototype.hasOwnProperty.call(opts, 'db') ? opts.db : layPool();
  if (!db) return [];
  let rows;
  try {
    ({ rows } = await db.query(
      'SELECT ma_a, ma_b, ten_hang FROM rui_ro_phan_loai WHERE ma_a = ANY($1::text[]) OR ma_b = ANY($1::text[]) ORDER BY id LIMIT 50',
      [ma],
    ));
  } catch (e) {
    console.warn(`[rui-ro-phan-loai] đọc DB lỗi: ${maLoi(e)}`);
    return [];
  }
  const out = [];
  const daCo = new Set();
  for (const r of rows || []) {
    const khopA = ma.includes(r.ma_a);
    const maKhop = khopA ? r.ma_a : r.ma_b;
    const maLienQuan = khopA ? r.ma_b : r.ma_a;
    if (!maLienQuan || daCo.has(maLienQuan)) continue;
    daCo.add(maLienQuan);
    out.push({
      loai: 'DANH_MUC_RUI_RO',
      maLienQuan,
      maKhop,
      ...(r.ten_hang ? { tenHang: String(r.ten_hang) } : {}),
      nhan: NHAN,
      ghiChu: GHI_CHU,
    });
  }
  return out;
}

module.exports = { tinHieuDanhMuc, NHAN, GHI_CHU };
