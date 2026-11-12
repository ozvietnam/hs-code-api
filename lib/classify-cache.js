// lib/classify-cache.js — cache kết quả /api/classify theo hash hồ sơ, Postgres KÍN (OZV-507 việc 1).
//
// Bối cảnh: độ trễ phan_loai_hs ~ nguyên realised lời gọi LLM (báo cáo OZV-502, GĐ duyệt phương án 3);
// bước 0 đo trên 7 ngày lượt gọi Cổng: 463 lượt / 400 hồ sơ khác nhau = 13,6% lượt trùng ≥ ngưỡng 10% GĐ đặt
// (OZV-511, QT chạy 12/11) ⇒ được làm cache.
//
// Nguyên tắc:
//   - CHỈ lượt khoá dịch vụ dùng (api/classify.js cắm ở nhánh serviceCaller) — lượt công khai không đụng
//     DB private để không trả phản hồi (có attrs hồ sơ) của khách này cho caller công khai khác.
//   - Khoá = sha256 của HỒ SƠ CHUẨN HOÁ (bỏ dấu/thường-hoa/gọn khoảng trắng) + ngữ cảnh quyết định kết quả:
//     tier, kenhGoi, noiBo, facts, supplierHs, attributes, và các trường hồ sơ khai báo (loaiToKhai,
//     manufacturer…). Bài học lib/suggest-cache.js: bỏ `facts` khỏi khoá ⇒ trả lại câu hỏi missingFacts cũ
//     vô hạn — nên facts NẰM TRONG khoá (sắp thứ tự ổn định để cùng bộ facts cho cùng khoá).
//   - Giá trị = toàn bộ phản hồi `result` đã tính (gồm khối hoSo/ecus do ganHoSoClassify gắn — bước đó có
//     thể gọi LLM nên cũng phải nằm trong giá trị cache để lượt trúng KHÔNG gọi LLM).
//   - Hiệu lực theo PHIÊN BẢN DỮ LIỆU (tariff-versions loadIndex().current): truy vấn luôn kèm điều kiện
//     phien_ban; đổi phiên bản ⇒ miss, dòng cũ bị dọn (một lần mỗi tiến trình) bằng lệnh dọn giữ lại phiên bản mới.
//   - KHÔNG log nội dung hồ sơ: mọi log lỗi chỉ ghi mã lỗi (maLoi); bảng chỉ chứa hash + phiên bản + phản hồi.
//   - Thiếu HS_DATABASE_URL ⇒ layPool() = null ⇒ mọi hàm no-op (tính năng tự tắt, endpoint chạy như cũ).
//     Tắt riêng bằng HS_CLASSIFY_CACHE=false. Mọi hàm KHÔNG BAO GIỜ ném — lỗi DB = cache miss.

const crypto = require('crypto');
const { layPool, maLoi } = require('./db');
const { loadIndex } = require('./tariff-versions');

/** Cache bật? (mặc định on; HS_CLASSIFY_CACHE=false tắt riêng, không đụng DB khác) */
function cacheBat() {
  return String(process.env.HS_CLASSIFY_CACHE || 'on').toLowerCase() !== 'false';
}

/** Chuẩn hoá một chuỗi: NFD bỏ dấu (đ→d riêng), thường-hoa, gọn khoảng trắng. */
function khongDau(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chuẩn hoá giá trị tuỳ ý (chuỗi / số / mảng / object) cho khoá: chuỗi bỏ dấu, khoá sắp xếp, mảng giữ thứ tự. */
function chuanHoaGiaTri(v) {
  if (v == null) return null;
  if (typeof v === 'string') return khongDau(v);
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.map(chuanHoaGiaTri);
  if (typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) {
      if (v[k] == null || v[k] === '') continue; // trường trống = trường vắng: cùng một hồ sơ
      out[k] = chuanHoaGiaTri(v[k]);
    }
    return out;
  }
  return khongDau(String(v));
}

/**
 * Chuẩn hoá hồ sơ cho khoá cache. `facts` sắp thứ tự ổn định (cùng bộ dữ kiện ⇒ cùng khoá),
 * trường trống bỏ khỏi khoá. Chỉ đụng BẢN SAO — không sửa attrs/attrsHoSo của người gọi.
 */
function chuanHoaHoSo(attrs = {}, attrsHoSo = {}, nguCanh = {}) {
  const hoSo = {
    attrs: chuanHoaGiaTri({
      ...attrs,
      facts: Array.isArray(attrs.facts)
        ? attrs.facts.map(chuanHoaGiaTri).map((f) => JSON.stringify(f)).sort()
        : [],
    }),
    hoSoKhaiBao: chuanHoaGiaTri({
      loaiToKhai: attrsHoSo.loaiToKhai, manufacturer: attrsHoSo.manufacturer, dimensions: attrsHoSo.dimensions,
      condition: attrsHoSo.condition, packaging: attrsHoSo.packaging, brand: attrsHoSo.brand,
      model: attrsHoSo.model, duKien: attrsHoSo.duKien,
    }),
    tier: nguCanh.tier || 'standard',
    kenhGoi: nguCanh.kenhGoi ?? null,
    noiBo: nguCanh.noiBo === true,
  };
  return hoSo;
}

/** Khoá cache = sha256(hex 64) của hồ sơ + ngữ cảnh đã chuẩn hoá. */
function khoaCache(attrs, attrsHoSo, nguCanh = {}) {
  return crypto.createHash('sha256').update(JSON.stringify(chuanHoaHoSo(attrs, attrsHoSo, nguCanh))).digest('hex');
}

/** Phiên bản dữ liệu hiện hành — mốc hiệu lực của cache (đổi phiên bản ⇒ kết quả cũ hết hiệu lực). */
function phienBanDuLieu() {
  try { return loadIndex().current || 'khong-co-phien-ban'; } catch { return 'khong-co-phien-ban'; }
}

let _dbChoTest = null; // chỉ scripts/test-classify-cache.mjs gán (ganDbChoTest) — PGlite/thu ghi
function layDb(opts = {}) {
  if (Object.prototype.hasOwnProperty.call(opts, 'db')) return opts.db;
  if (_dbChoTest) return _dbChoTest;
  return layPool();
}

/**
 * Đọc cache. Trả null khi: chưa bật, chưa có DB, lỗi, hoặc dòng tìm thấy thuộc phiên bản dữ liệu khác.
 * KHÔNG ném, KHÔNG log nội dung hồ sơ.
 */
async function docCache(khoa, phienBan, opts = {}) {
  if (!cacheBat() || typeof khoa !== 'string' || !phienBan) return null;
  const db = layDb(opts);
  if (!db) return null;
  try {
    const { rows } = await db.query(
      'SELECT phan_hoi FROM classify_cache WHERE khoa = $1 AND phien_ban = $2 LIMIT 1',
      [khoa, String(phienBan)]
    );
    if (!rows || !rows.length) return null;
    const v = rows[0].phan_hoi;
    return typeof v === 'string' ? JSON.parse(v) : v;
  } catch (e) {
    console.warn(`[classify-cache] docCache loi: ${maLoi(e)}`);
    return null;
  }
}

/** Ghi/đè dòng cache (upsert theo khoá). Trả true/false, KHÔNG ném. */
async function ghiCache(khoa, phienBan, phanHoi, opts = {}) {
  if (!cacheBat() || typeof khoa !== 'string' || !phienBan) return false;
  if (!phanHoi || typeof phanHoi !== 'object') return false;
  const db = layDb(opts);
  if (!db) return false;
  try {
    await db.query(
      `INSERT INTO classify_cache (khoa, phien_ban, phan_hoi) VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (khoa) DO UPDATE SET phien_ban = EXCLUDED.phien_ban, phan_hoi = EXCLUDED.phan_hoi, tao_luc = now()`,
      [khoa, String(phienBan), JSON.stringify(phanHoi)]
    );
    return true;
  } catch (e) {
    console.warn(`[classify-cache] ghiCache loi: ${maLoi(e)}`);
    return false;
  }
}

/**
 * Dọn dòng thuộc phiên bản dữ liệu KHÁC (đổi phiên bản ⇒ kết quả cũ hết hiệu lực). Trả số dòng dọn, KHÔNG ném.
 * Không dọn dòng cùng phiên bản — cache còn hiệu lực.
 */
async function xoaTheoPhienBan(giuLai, opts = {}) {
  const db = layDb(opts);
  if (!db || !giuLai) return 0;
  try {
    const r = await db.query('DELETE FROM classify_cache WHERE phien_ban <> $1', [String(giuLai)]);
    return r.rowCount || 0;
  } catch (e) {
    console.warn(`[classify-cache] xoaTheoPhienBan loi: ${maLoi(e)}`);
    return 0;
  }
}

let _phienBanDaDon = null;
/**
 * Dọn phiên bản cũ MỘT LẦN mỗi tiến trình cho mỗi phiên bản (tránh DELETE mỗi lượt gọi).
 * Test truyền opts.db ⇒ luôn chạy (không nhớ trong tiến trình).
 */
async function donPhienBanCu(phienBan, opts = {}) {
  const laTest = Object.prototype.hasOwnProperty.call(opts, 'db') || _dbChoTest;
  if (!laTest && _phienBanDaDon === phienBan) return 0;
  const n = await xoaTheoPhienBan(phienBan, opts);
  if (!laTest) _phienBanDaDon = phienBan;
  return n;
}

/** Chỉ dành cho test: gán DB dùng chung cho mọi hàm (null = quay về layPool()). */
function ganDbChoTest(db) { _dbChoTest = db; _phienBanDaDon = null; }

module.exports = {
  cacheBat, khongDau, chuanHoaHoSo, khoaCache, phienBanDuLieu,
  docCache, ghiCache, xoaTheoPhienBan, donPhienBanCu, ganDbChoTest,
};
