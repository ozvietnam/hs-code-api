// lib/kho-dinh-danh.js — Kho định danh / Đồ thị hàng hoá theo hãng+model (OZV-1657 · PR1a/PR1b).
//
// Thiết kế: docs/design/2026-11-20-kho-dinh-danh-do-thi-hang-hoa.md mục 2–3, 6.
//
// Chế độ (biến HS_KHO_DINH_DANH), mặc định off:
//   off    — không đọc, không ghi; docKho trả null ngay; identify không gọi soiBong.
//   shadow — chuẩn hoá + docKho trong hạn 100 ms + log số đo; KHÔNG đổi frame khách (PR1b).
//   on     — (PR sau) trả từ kho khi đủ CORROBORATED/VERIFIED; PR1b chỉ log như shadow.
//
// PR1a: chuẩn hoá hãng/model + stub docKho + migration 0004.
// PR1b: soiBong + nối lib/identify.js (cờ off = no-op).

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

// Tiền tố nhãn model (thiết kế mục 3.1) — chỉ cắt khi có phân cách rõ
// (:, ：, #, . hoặc khoảng trắng). Không dùng '-' sau ma/pn: model thật kiểu MA-1000 / PN532A.
const TIEN_TO_MODEL_RE =
  /^(?:(?:model|mã|ma|type|part\s*no\.?|part\s*number|pn|型号)(?:\s*[:：#.]\s*|\s+)|p\/n\s*[:：#.\-]?\s*)/iu;

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
 * off → null ngay; shadow/on → stub null (chưa nối Postgres — PR sau).
 * Không ném.
 */
async function docKho(_hangChuan, _modelRutGon, _opts = {}) {
  try {
    if (cheDoKhoDinhDanh() === 'off') return null;
    // Stub — PR sau tra dd_bi_danh → dd_nut → dd_du_kien.
    return null;
  } catch {
    return null;
  }
}

/** Chạy `p` trong hạn: { ok:true, v } | { quaHan:true } | { loi }. Cùng khuôn kho-dap-an. */
async function voiHan(p, ms) {
  let hen;
  const het = new Promise((r) => { hen = setTimeout(() => r({ quaHan: true }), ms); if (hen.unref) hen.unref(); });
  try {
    return await Promise.race([Promise.resolve(p).then((v) => ({ ok: true, v }), (loi) => ({ loi })), het]);
  } finally { clearTimeout(hen); }
}

/**
 * Soi bóng: chuẩn hoá hãng+model → docKho trong hạn → ghi log số đo.
 * KHÔNG đổi ketQua (frame chuong/model/thuongHieu khách giữ nguyên). Mẫu log kho-dap-an.
 * @returns {object} log { type:'kho_dinh_danh', ketQua, msTraKho, ... }
 */
async function soiBong(dauVao = {}, ketQua = {}, nguCanh = {}, opts = {}) {
  const log = {
    type: 'kho_dinh_danh',
    cheDo: cheDoKhoDinhDanh(),
    ts: new Date().toISOString(),
  };
  try {
    if (log.cheDo === 'off') {
      log.ketQua = 'OFF';
      throw Object.assign(new Error('bo-qua'), { boQua: true });
    }
    const hangChuan = chuanHoaHang(dauVao.thuongHieu || dauVao.hang || null);
    const model = chuanHoaModel(dauVao.model || null);
    log.hangChuan = hangChuan;
    log.modelRutGon = model?.rutGon || null;
    log.khoaHangModel = hangChuan && model?.rutGon ? `${hangChuan}::${model.rutGon}`.slice(0, 200) : null;
    // Snapshot frame khách — chứng minh shadow không đè (chỉ số đo).
    log.frameKhach = {
      chuong: ketQua?.frame?.chuong ?? null,
      model: ketQua?.frame?.model ?? null,
      thuongHieu: ketQua?.frame?.thuongHieu ?? null,
    };
    if (!hangChuan || !model?.rutGon) {
      log.ketQua = 'THIEU_KHOA';
      log.msTraKho = 0;
    } else {
      const t0 = Date.now();
      const doc = await voiHan(docKho(hangChuan, model.rutGon, opts), opts.hanDocMs ?? hanDocMs());
      log.msTraKho = Date.now() - t0;
      if (doc.quaHan) {
        log.ketQua = 'QUA_HAN';
      } else if (doc.loi) {
        log.ketQua = 'LOI_DOC';
        log.maLoi = String(doc.loi?.message || doc.loi).slice(0, 80);
      } else if (doc.v == null) {
        // Stub / không có bản ghi → trượt kho (vẫn chạy identify như cũ).
        log.ketQua = 'TRUOT_KHO';
      } else {
        log.ketQua = 'TRUNG_KHO';
        log.mucKiemChung = doc.v.mucKiemChung || doc.v.muc || null;
      }
    }
  } catch (e) {
    if (!e?.boQua) {
      log.ketQua = log.ketQua || 'LOI_DOC';
      log.maLoi = String(e?.message || e).slice(0, 80);
    }
  }
  try {
    if (typeof nguCanh.ghiLog === 'function') nguCanh.ghiLog(log);
    else process.stdout.write(`${JSON.stringify(log)}\n`);
  } catch { /* log hỏng không làm hỏng lượt chính */ }
  return log;
}

/**
 * Gọi soiBong khi cờ shadow|on. Mặc định fire-and-forget (không chặn trả lời).
 * opts.awaitKhoBong = true → chờ xong (chỉ test). opts.ghiLog → hứng log.
 * @returns {Promise<object|null>|null}
 */
function chayBongNeuCan(dauVao, ketQua, opts = {}) {
  const cheDo = cheDoKhoDinhDanh();
  if (cheDo !== 'shadow' && cheDo !== 'on') return null;
  const p = soiBong(dauVao, ketQua, { ghiLog: opts.ghiLog }, opts);
  if (opts.awaitKhoBong) return p;
  p.catch(() => {});
  return null;
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
  voiHan,
  chuanHoaHang,
  chuanHoaModel,
  docKho,
  soiBong,
  chayBongNeuCan,
  khoaHangModel,
  HAN_DOC_MAC_DINH,
};
