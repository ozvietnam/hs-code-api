// lib/kho-dap-an.js — Kho đáp án khép vòng ("cuốn sổ thứ tư", G5 · OZV-760) — PR 1a: CHẾ ĐỘ BÓNG.
//
// Thiết kế: docs/design/2026-11-14-kho-dap-an-khep-vong.md (v2.1, Board/QT duyệt 15/11).
//
// PR 1a chỉ có hai chế độ (biến HS_KHO_DAP_AN):
//   off    — mặc định: không đọc, không ghi, endpoint chạy y như cũ.
//   shadow — SAU KHI động cơ đã trả lời: đọc kho (trần HS_KHO_DAP_AN_TIMEOUT_MS = 150 ms), so mã kho với mã động cơ,
//            ghi một dòng log JSON `type:"kho_dap_an"`, rồi ghi bản NHAP / CHI_DU_KIEN. KHÔNG trả gì cho khách.
//   Giá trị khác (kể cả "on") ⇒ coi như off: nhánh trả đáp án thật CHƯA có trong PR 1a.
//
// Hai khoá tách cứng (mục 2 + 3 thiết kế; lưu ý bắt buộc của GĐ 15/11: "cùng tên khác thông số không được trả mã"):
//   khoa_dap_an  = sha256{ten, chatLieu, congDung, chucNang, thongSo, xuatXu, thuongHieu, model, nameZh, supplierHs,
//                         facts, duKienQuyetDinh, tier} — tính trên bản ĐÃ LỌC RIÊNG TƯ.
//   khoa_du_kien = sha256{ten, thuongHieu, model} — chỉ để lấy lại dữ kiện web, KHÔNG để trả mã.
//
// Nguyên tắc: mọi hàm KHÔNG BAO GIỜ ném (lỗi DB = bỏ qua); không log nội dung hàng (log chỉ có mã HS, cờ, số ms);
// thiếu HS_DATABASE_URL ⇒ layPool() = null ⇒ no-op.

const crypto = require('crypto');
const { layPool, maLoi } = require('./db');
const { khongDau, phienBanDuLieu } = require('./classify-cache');
const { loadJson } = require('./data-cache');
const { dataReadPath } = require('./data-paths');

const HAN_DOC_MAC_DINH = 150;
const TRANG_THAI_CAM_GHI = new Set(['NEED_FACTS', 'NEEDS_EXPERT', 'NO_CANDIDATES', 'QUA_GIO']);

/** Chế độ hiện hành: 'off' | 'shadow'. PR 1a KHÔNG có 'on'. */
function cheDoKhoDapAn() {
  const v = String(process.env.HS_KHO_DAP_AN || 'off').trim().toLowerCase();
  return v === 'shadow' ? 'shadow' : 'off';
}

/** Trần đọc kho (ms) — DB chậm hơn mức này thì bỏ qua, không chờ connectionTimeoutMillis 2000 của pool. */
function hanDocMs() {
  const v = Number(process.env.HS_KHO_DAP_AN_TIMEOUT_MS);
  return Number.isFinite(v) && v > 0 ? v : HAN_DOC_MAC_DINH;
}

/** Chạy `p` trong hạn: { ok:true, v } | { quaHan:true } | { loi }. Cùng khuôn voiHan của lib/ho-so/api.js. */
async function voiHan(p, ms) {
  let hen;
  const het = new Promise((r) => { hen = setTimeout(() => r({ quaHan: true }), ms); if (hen.unref) hen.unref(); });
  try {
    return await Promise.race([Promise.resolve(p).then((v) => ({ ok: true, v }), (loi) => ({ loi })), het]);
  } finally { clearTimeout(hen); }
}

// ── Bộ lọc riêng tư (mục 4.2 thiết kế) ─────────────────────────────────────────────────────────────────────────
// Ranh giới chữ có dấu: \b của JS chỉ hiểu ASCII ⇒ dùng lookaround \p{L}\p{N}.
const KHONG_CHU_TRUOC = '(?<![\\p{L}\\p{N}])';
const KHONG_CHU_SAU = '(?![\\p{L}\\p{N}])';
const NHAN_TIEN = `${KHONG_CHU_TRUOC}(?:đơn\\s+giá|trị\\s+giá|thành\\s+tiền|giá|unit\\s+price|price)`;
const MAU_LOC = [
  // Số lượng thương mại có nhãn: "SL: 10", "số lượng 20 cái", "qty 5 pcs".
  new RegExp(`${KHONG_CHU_TRUOC}(?:sl|số lượng|so luong|qty|quantity)\\s*[:=]?\\s*\\d+(?:[.,]\\d+)?(?:\\s*(?:cái|cai|chiếc|chiec|bộ|bo|pcs|pc|units?))?${KHONG_CHU_SAU}`, 'giu'),
  // Số lượng theo đơn vị đóng gói: "10 thùng", "2 kiện", "1 pallet", "5 cartons", "3 lô".
  new RegExp(`${KHONG_CHU_TRUOC}\\d+(?:[.,]\\d+)?\\s*(?:thùng|thung|kiện|kien|pallets?|cartons?|ctns?|lô)${KHONG_CHU_SAU}`, 'giu'),
  // Số chứng từ có nhãn: invoice/PO/HĐ/SO/bill/AWB/BL + mã có ít nhất một chữ số.
  new RegExp(`${KHONG_CHU_TRUOC}(?:invoice|inv|po|hđ|hd|so|bill|awb|b/l|bl)[\\s#:.\\-]*(?=[a-z0-9\\-/]*\\d)[a-z0-9\\-/]{4,}${KHONG_CHU_SAU}`, 'giu'),
  // Số tờ khai hải quan 11–12 chữ số (kèm nhãn "số tờ khai"/"TK" đứng trước nếu có).
  new RegExp(`(?:${KHONG_CHU_TRUOC}(?:(?:số\\s+)?tờ\\s+khai|stk|tk)[\\s:#.]*)?(?<!\\d)\\d{11,12}(?!\\d)`, 'giu'),
  // Đơn giá / số tiền: ký hiệu đứng trước ("$120", "¥300") hoặc đơn vị tiền đứng sau ("120 USD", "2.500.000đ"),
  // kèm nhãn "đơn giá"/"giá"/"trị giá"/"thành tiền"/"price" đứng trước nếu có.
  new RegExp(`(?:${NHAN_TIEN}[\\s:=]*)?[$¥€]\\s*\\d+(?:[.,]\\d+)*`, 'giu'),
  new RegExp(`(?:${NHAN_TIEN}[\\s:=]*)?${KHONG_CHU_TRUOC}\\d+(?:[.,]\\d+)*\\s*(?:usd|vnd|vnđ|cny|rmb|eur|jpy|đồng|đ)${KHONG_CHU_SAU}`, 'giu'),
];

/**
 * Cắt số liệu thương mại / chứng từ khỏi một chuỗi hàng hoá, GIỮ NGUYÊN thông số kỹ thuật
 * (kW, HP, V, A, Hz, mm, cm, m, kg, g, ml, l, %, °C, DN…). Trả chuỗi đã gọn khoảng trắng / dấu câu thừa.
 */
function locChuoiHangHoa(s) {
  if (s == null) return '';
  let t = String(s).normalize('NFC').slice(0, 4000); // chặn trần trước khi chạy regex (chữ khách có thể rất dài)
  for (const re of MAU_LOC) t = t.replace(re, ' ');
  return t
    .replace(/\s+([,;.])/g, '$1')
    .replace(/([,;])(?:\s*[,;])+/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;.:\-]+|[\s,;:\-]+$/g, '')
    .slice(0, 500);
}

/** Thông số: chuỗi, hoặc object {k:v} (ghép "k: v" theo thứ tự khoá), hoặc mảng. */
function chuoiThongSo(v) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(chuoiThongSo).filter(Boolean).join('; ');
  if (typeof v === 'object') {
    return Object.keys(v).sort().map((k) => `${k}: ${chuoiThongSo(v[k])}`).join('; ');
  }
  return '';
}

// Trường hàng hoá chính (danh sách trắng) + trường KHÔNG BAO GIỜ nhận (định danh khách/đơn/tờ khai).
const TRUONG_CHINH = ['tenHang', 'nameZh', 'chatLieu', 'congDung', 'chucNang', 'specs', 'thuongHieu', 'model', 'xuatXu', 'facts', 'supplierHs'];
const TRUONG_CAM = new Set([
  'luotId', 'orderCode', 'directorNote', 'chosenBy', 'customerDescription', 'bangChung', 'evidence', 'phan_hoi',
  'phanHoi', 'soToKhai', 'invoice', 'loaiToKhai', 'manufacturer', 'packaging', 'condition', 'dimensions', 'duKien',
  'brand', 'origin', 'thongSo', 'technicalSpec', 'name', 'productName', 'material', 'purpose', 'attributes', 'tier',
  'auto', 'debug', 'hsCode', 'hs',
]);
const KHOA_HOP_LE = /^[A-Za-z][A-Za-z0-9_.]{0,60}$/;

/**
 * Lọc riêng tư đầu vào trước khi tính khoá / ghi kho. Chỉ nhận danh sách trắng trường hàng hoá; mọi chuỗi đi qua
 * locChuoiHangHoa(). `facts` chỉ giữ {key, value, unit} (bỏ bằng chứng nguyên văn). Thuộc tính chuẩn khác
 * (registry data/attributes.json, vd voltage) giữ trong `duKienQuyetDinh` — chúng quyết định mã nên PHẢI vào khoá.
 */
function locRiengTuKhoDapAn(dauVao = {}) {
  const v = dauVao && typeof dauVao === 'object' ? dauVao : {};
  const s = (x) => locChuoiHangHoa(x);
  const facts = (Array.isArray(v.facts) ? v.facts : [])
    .map((f) => {
      if (!f || typeof f !== 'object') return null;
      const key = String(f.key ?? f.fact ?? f.attribute ?? '').trim();
      if (!KHOA_HOP_LE.test(key)) return null;
      const value = s(f.valueVi ?? f.value ?? f.giaTri ?? '');
      if (!value) return null;
      const unit = f.unit ?? f.donVi;
      return unit ? { key, value, unit: s(unit) } : { key, value };
    })
    .filter(Boolean)
    .slice(0, 30);
  const duKienQuyetDinh = {};
  for (const k of Object.keys(v).sort()) {
    if (TRUONG_CHINH.includes(k) || TRUONG_CAM.has(k) || !KHOA_HOP_LE.test(k)) continue;
    const x = v[k];
    if (x == null || typeof x === 'object' || typeof x === 'function') continue;
    const sx = s(x);
    if (sx) duKienQuyetDinh[k] = sx;
  }
  const sup = v.supplierHs && typeof v.supplierHs === 'object' ? v.supplierHs.code : v.supplierHs;
  const supCode = String(sup || '').replace(/\D/g, '').slice(0, 10);
  return {
    tenHang: s(v.tenHang),
    nameZh: s(v.nameZh),
    chatLieu: s(v.chatLieu),
    congDung: s(v.congDung),
    chucNang: s(v.chucNang),
    thongSo: s(chuoiThongSo(v.specs ?? v.thongSo)),
    thuongHieu: s(v.thuongHieu ?? v.brand),
    model: s(v.model),
    xuatXu: s(v.xuatXu ?? v.origin),
    supplierHs: supCode.length >= 6 ? supCode : '',
    facts,
    duKienQuyetDinh,
  };
}

// ── Hai khoá ───────────────────────────────────────────────────────────────────────────────────────────────────
const sha = (o) => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
/** Chuẩn thông số cho khoá: bỏ dấu + thường-hoa + bỏ khoảng trắng giữa số và đơn vị ("0,37 kW" ≡ "0,37kw"). */
const chuanThongSo = (t) => khongDau(t).replace(/(\d)\s+(?=[a-z%°])/g, '$1');

/** khoa_dap_an (nghiêm) — `sach` là kết quả locRiengTuKhoDapAn(). */
function khoaDapAn(sach, tier = 'standard') {
  const factsChuan = (sach.facts || [])
    .map((f) => `${khongDau(f.key)}=${chuanThongSo(f.value)}${f.unit ? ` ${khongDau(f.unit)}` : ''}`)
    .sort();
  const duKienQuyetDinhChuan = {};
  for (const k of Object.keys(sach.duKienQuyetDinh || {}).sort()) duKienQuyetDinhChuan[k] = chuanThongSo(sach.duKienQuyetDinh[k]);
  return sha({
    tenChuan: khongDau(sach.tenHang),
    chatLieuChuan: khongDau(sach.chatLieu),
    congDungChuan: khongDau(sach.congDung),
    chucNangChuan: khongDau(sach.chucNang),
    thongSoChuan: chuanThongSo(sach.thongSo),
    xuatXuChuan: khongDau(sach.xuatXu),
    thuongHieuChuan: khongDau(sach.thuongHieu),
    modelChuan: khongDau(sach.model),
    nameZhChuan: khongDau(sach.nameZh),
    supplierHsChuan: sach.supplierHs || '',
    factsChuan,
    duKienQuyetDinhChuan,
    tier: tier === 'premium' ? 'premium' : 'standard',
  });
}

/** khoa_du_kien (lỏng) — chỉ để lấy lại dữ kiện web, KHÔNG để trả mã. */
function khoaDuKien(sach) {
  return sha({ tenChuan: khongDau(sach.tenHang), thuongHieuChuan: khongDau(sach.thuongHieu), modelChuan: khongDau(sach.model) });
}

/** khoa_hang_model — "thương hiệu|model" khi có đủ cả hai, ngược lại null. */
function khoaHangModel(sach) {
  const th = khongDau(sach.thuongHieu);
  const md = khongDau(sach.model);
  return th && md ? `${th}|${md}`.slice(0, 160) : null;
}

// ── Luật ghi (mục 4.1) ─────────────────────────────────────────────────────────────────────────────────────────
let _bieu = null;
function bieuThue() {
  if (_bieu) return _bieu;
  let t = {};
  try { t = loadJson(dataReadPath('tax.json')) || {}; } catch { t = {}; }
  const ma8 = new Set(Object.keys(t).filter((k) => /^\d{8}$/.test(k)));
  const ma6 = new Set([...ma8].map((k) => k.slice(0, 6)));
  _bieu = { ma8, ma6 };
  return _bieu;
}
/** Mã 6 hoặc 8 số có thật trong data/tax.json. */
function maHopLe(hs) {
  const m = String(hs ?? '').replace(/\D/g, '');
  if (m.length !== 6 && m.length !== 8) return false;
  const { ma8, ma6 } = bieuThue();
  return m.length === 8 ? ma8.has(m) : ma6.has(m);
}

/**
 * Quyết định ghi gì từ một kết quả động cơ. Trả:
 *   { ghi: 'NHAP', maHs, capDaChac } | { ghi: 'CHI_DU_KIEN' } | { ghi: null, lyDo }.
 * `nguCanh.quaGio = true` ⇒ lượt đã trả 503 QUA_GIO cho khách ⇒ cấm ghi.
 */
function quyetDinhGhi(result, nguCanh = {}) {
  if (!result || typeof result !== 'object') return { ghi: null, lyDo: 'KHONG_CO_KET_QUA' };
  if (nguCanh.quaGio === true) return { ghi: null, lyDo: 'QUA_GIO' };
  if (result.degraded === true) return { ghi: null, lyDo: 'DEGRADED' };
  const status = String(result.status || '');
  const hint = result.webHint;
  const coWeb = !!(hint && Array.isArray(hint.nguon) && hint.nguon.length > 0);
  if (status === 'NEED_FACTS') return coWeb ? { ghi: 'CHI_DU_KIEN' } : { ghi: null, lyDo: 'NEED_FACTS' };
  if (TRANG_THAI_CAM_GHI.has(status)) return { ghi: null, lyDo: status };
  const hs = String(result.results?.[0]?.hs ?? '').replace(/\D/g, '');
  if (!maHopLe(hs)) return { ghi: null, lyDo: 'MA_KHONG_HOP_LE' };
  let cap = Number(result.hoSo?.capDaChac);
  if (cap !== 6 && cap !== 8) {
    const conThieu = Array.isArray(result.missing) && result.missing.length > 0;
    cap = hs.length === 8 && !conThieu ? 8 : 6;
  }
  return { ghi: 'NHAP', maHs: cap === 6 ? hs.slice(0, 6) : hs, capDaChac: cap };
}

/** Dữ kiện lưu kho: dữ kiện khách (KHÔNG bằng chứng) + nguồn web công khai (url, trích đoạn) — mục 2 nhóm 3. */
function duKienLuu(sach, result) {
  const ngay = new Date().toISOString().slice(0, 10);
  const out = (sach.facts || []).map((f) => ({ fact: f.key, giaTri: f.value, donVi: f.unit || null, nguon: 'KHACH', ngayThuThap: ngay }));
  const hint = result?.webHint;
  if (hint && Array.isArray(hint.nguon)) {
    for (const n of hint.nguon.slice(0, 4)) {
      const url = typeof n === 'string' ? n : n?.url;
      if (!/^https?:\/\//i.test(String(url || ''))) continue;
      out.push({ fact: 'webHint', giaTri: null, nguon: 'WEB', url: String(url).slice(0, 300), trichDoanWeb: String(hint.cauTraLoi || '').slice(0, 600), ngayThuThap: ngay });
    }
  }
  return out;
}

/** Phản hồi chuẩn để dựng lại (PR sau) — chỉ khối phân loại, không attrs/usage/ms/thông tin gọi. */
function phanHoiChuan(result) {
  if (!result) return null;
  const { results, girRulesApplied, candidates, missing, status } = result;
  return JSON.parse(JSON.stringify({ results, girRulesApplied, candidates, missing, status }));
}

// ── DB ─────────────────────────────────────────────────────────────────────────────────────────────────────────
let _dbChoTest = null;
function layDb(opts = {}) {
  if (Object.prototype.hasOwnProperty.call(opts, 'db')) return opts.db;
  if (_dbChoTest) return _dbChoTest;
  return layPool();
}
/** Chỉ dành cho test: gán DB dùng chung (null = quay về layPool()). */
function ganDbChoTest(db) { _dbChoTest = db; }

/** Đọc kho theo hai khoá. Trả { dapAn: dòng|null, duKien: dòng|null }. NÉM khi lỗi DB (soiBong bắt). */
async function docKho(kDapAn, kDuKien, opts = {}) {
  const db = layDb(opts);
  if (!db) return { dapAn: null, duKien: null, khongCoDb: true };
  const { rows } = await db.query(
    `SELECT khoa_dap_an, khoa_du_kien, ma_hs, cap_da_chac, trang_thai, tier, phien_ban_bieu, han_xem_lai
       FROM kho_dap_an WHERE khoa_dap_an = $1 OR khoa_du_kien = $2 LIMIT 5`,
    [kDapAn, kDuKien]
  );
  const ds = rows || [];
  const dapAn = ds.find((r) => String(r.khoa_dap_an).trim() === kDapAn) || null;
  const duKien = ds.find((r) => String(r.khoa_dap_an).trim() !== kDapAn) || null;
  return { dapAn, duKien };
}

/**
 * Ghi bản NHAP / CHI_DU_KIEN (upsert theo khoa_dap_an; gặp lại ⇒ so_lan_gap + 1, KHÔNG đè mã đã có).
 * Trả { ghi, lyDo? }. KHÔNG ném.
 */
async function ghiKhoDapAn(sach, result, nguCanh = {}, opts = {}) {
  const qd = quyetDinhGhi(result, nguCanh);
  if (!qd.ghi) return { ghi: null, lyDo: qd.lyDo };
  const db = layDb(opts);
  if (!db) return { ghi: null, lyDo: 'KHONG_CO_DB' };
  const tier = nguCanh.tier === 'premium' ? 'premium' : 'standard';
  try {
    await db.query(
      `INSERT INTO kho_dap_an (khoa_dap_an, khoa_du_kien, khoa_hang_model, tier, ten_chuan_vi, ten_zh_chuan, thong_so_chuan,
         du_kien, du_kien_quyet_dinh, ma_hs, cap_da_chac, phan_hoi_chuan, phien_ban_bieu, trang_thai)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12::jsonb, $13, $14)
       ON CONFLICT (khoa_dap_an) DO UPDATE SET
         so_lan_gap = kho_dap_an.so_lan_gap + 1,
         cap_nhat_luc = now(),
         ma_hs = COALESCE(kho_dap_an.ma_hs, EXCLUDED.ma_hs),
         cap_da_chac = COALESCE(kho_dap_an.cap_da_chac, EXCLUDED.cap_da_chac),
         phan_hoi_chuan = COALESCE(kho_dap_an.phan_hoi_chuan, EXCLUDED.phan_hoi_chuan),
         trang_thai = CASE WHEN kho_dap_an.trang_thai = 'CHI_DU_KIEN' AND EXCLUDED.trang_thai = 'NHAP'
                           THEN 'NHAP' ELSE kho_dap_an.trang_thai END`,
      [
        khoaDapAn(sach, tier), khoaDuKien(sach), khoaHangModel(sach), tier,
        sach.tenHang || null, sach.nameZh || null, sach.thongSo || null,
        JSON.stringify(duKienLuu(sach, result)), JSON.stringify(sach.duKienQuyetDinh || {}),
        qd.ghi === 'NHAP' ? qd.maHs : null, qd.ghi === 'NHAP' ? qd.capDaChac : null,
        qd.ghi === 'NHAP' ? JSON.stringify(phanHoiChuan(result)) : null,
        String(nguCanh.phienBan || phienBanDuLieu()).slice(0, 20), qd.ghi,
      ]
    );
    return { ghi: qd.ghi };
  } catch (e) {
    console.warn(`[kho-dap-an] ghiKhoDapAn loi: ${maLoi(e)}`);
    return { ghi: null, lyDo: 'LOI_DB' };
  }
}

/** Thêm một mâu thuẫn và hạ trạng thái về CHO_CHAM (không lưu luotId). Trả true/false, KHÔNG ném. */
async function ghiMauThuan(kDapAn, mt, opts = {}) {
  const db = layDb(opts);
  if (!db) return false;
  try {
    await db.query(
      `UPDATE kho_dap_an SET mau_thuan = mau_thuan || $2::jsonb, trang_thai = 'CHO_CHAM', cap_nhat_luc = now()
        WHERE khoa_dap_an = $1`,
      [kDapAn, JSON.stringify([{ maHs: mt.maHs, capDaChac: mt.capDaChac ?? null, ngay: new Date().toISOString().slice(0, 10), lyDo: mt.lyDo || 'SHADOW_LECH_MA' }])]
    );
    return true;
  } catch (e) {
    console.warn(`[kho-dap-an] ghiMauThuan loi: ${maLoi(e)}`);
    return false;
  }
}

/**
 * Bản ghi kho có ĐƯỢC trả làm đáp án không (7 điều kiện cấm, mục 3) — PR 1a chỉ dùng để ĐO (`leRaTra` trong log),
 * không trả cho khách.
 */
function duocTraDapAn(dong, nguCanh = {}) {
  if (!dong || !dong.ma_hs) return false;
  if (nguCanh.debug || nguCanh.holdout) return false;
  if (dong.trang_thai !== 'DUYET' || Number(dong.cap_da_chac) !== 8) return false;
  if ((nguCanh.tier || 'standard') !== dong.tier) return false;
  if (nguCanh.phienBan && dong.phien_ban_bieu !== nguCanh.phienBan) return false;
  if (dong.han_xem_lai && new Date(dong.han_xem_lai).getTime() < Date.now()) return false;
  return true;
}

/**
 * CHẾ ĐỘ BÓNG — chạy sau khi động cơ đã có kết quả (gọi fire-and-forget, không chặn khách):
 *   1) đọc kho trong trần hanDocMs(); 2) phân loại TRUNG_DAP_AN / TRUNG_DU_KIEN / KHONG_TRUNG (hoặc QUA_HAN / LOI_DOC);
 *   3) cùng khoa_dap_an mà mã động cơ khác mã kho ⇒ mau_thuan[] + CHO_CHAM; 4) ghi bản NHAP / CHI_DU_KIEN;
 *   5) một dòng log JSON. Trả object log (để test). KHÔNG ném.
 * nguCanh: { tier, phienBan, quaGio, soLuotLlm, ghiLog?: (dong) => void }
 */
async function soiBong(dauVao, result, nguCanh = {}, opts = {}) {
  const log = { type: 'kho_dap_an', cheDo: 'shadow', ts: new Date().toISOString() };
  try {
    const tier = nguCanh.tier === 'premium' ? 'premium' : 'standard';
    const phienBan = nguCanh.phienBan || phienBanDuLieu();
    const sach = locRiengTuKhoDapAn(dauVao);
    const kDA = khoaDapAn(sach, tier);
    const kDK = khoaDuKien(sach);
    const t0 = Date.now();
    const doc = await voiHan(docKho(kDA, kDK, opts), opts.hanDocMs ?? hanDocMs());
    log.msDocKho = Date.now() - t0;
    const hsDongCo = String(result?.results?.[0]?.hs ?? '').replace(/\D/g, '') || null;
    log.soLuotLlm = Number.isFinite(nguCanh.soLuotLlm) ? nguCanh.soLuotLlm : null;
    if (doc.quaHan) { log.ketQua = 'QUA_HAN'; } else if (doc.loi) {
      log.ketQua = 'LOI_DOC';
      log.maLoi = maLoi(doc.loi);
    } else if (doc.v?.khongCoDb) {
      log.ketQua = 'KHONG_CO_DB';
    } else if (doc.v?.dapAn && doc.v.dapAn.ma_hs) {
      const d = doc.v.dapAn;
      const maKho = String(d.ma_hs).trim();
      log.ketQua = 'TRUNG_DAP_AN';
      log.maKho = maKho;
      log.maDongCo = hsDongCo;
      log.trangThaiKho = d.trang_thai;
      log.leRaTra = duocTraDapAn(d, { tier, phienBan });
      log.mauThuan = !!(hsDongCo && hsDongCo.slice(0, maKho.length) !== maKho);
      if (log.mauThuan) {
        await ghiMauThuan(kDA, { maHs: hsDongCo, capDaChac: hsDongCo.length === 8 ? 8 : 6, lyDo: 'SHADOW_LECH_MA' }, opts);
      }
    } else if (doc.v?.dapAn || doc.v?.duKien) {
      log.ketQua = 'TRUNG_DU_KIEN';
      log.maDongCo = hsDongCo;
    } else {
      log.ketQua = 'KHONG_TRUNG';
      log.maDongCo = hsDongCo;
    }
    if (log.mauThuan === undefined) log.mauThuan = false;
    if (log.ketQua === 'QUA_HAN' || log.ketQua === 'LOI_DOC') {
      // DB chậm/lỗi ⇒ không ghi thêm (không dồn việc lên một DB đang yếu).
      log.ghi = null;
      log.khongGhiVi = log.ketQua;
      throw Object.assign(new Error('bo-qua'), { boQua: true });
    }
    const g = await ghiKhoDapAn(sach, result, { tier, phienBan, quaGio: nguCanh.quaGio === true }, opts);
    log.ghi = g.ghi || null;
    if (!g.ghi) log.khongGhiVi = g.lyDo;
  } catch (e) {
    if (!e?.boQua) {
      log.ketQua = log.ketQua || 'LOI_DOC';
      log.maLoi = maLoi(e);
    }
  }
  try {
    if (typeof nguCanh.ghiLog === 'function') nguCanh.ghiLog(log);
    else process.stdout.write(`${JSON.stringify(log)}\n`);
  } catch { /* log hỏng không làm hỏng lượt chính */ }
  return log;
}

module.exports = {
  cheDoKhoDapAn, hanDocMs, voiHan,
  locChuoiHangHoa, locRiengTuKhoDapAn,
  khoaDapAn, khoaDuKien, khoaHangModel,
  maHopLe, quyetDinhGhi, duocTraDapAn,
  docKho, ghiKhoDapAn, ghiMauThuan, soiBong, ganDbChoTest,
};
