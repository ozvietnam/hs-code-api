/**
 * lib/tu-vung.js — từ vựng dữ kiện có kiểu (spec hồ sơ phân loại §8.2, plan L1-3a, #570; tu-vung@2 #577).
 *
 * MỘT nguồn khoá dữ kiện cho phân loại, viết mô tả, soát và câu hỏi gửi ERP/addon. Runtime + công cụ nạp
 * data/tu-vung/tu-vung@2.json (TEP_TU_VUNG) — SIÊU TẬP của tu-vung@1: 53 khoá @1 giữ nguyên + khoá mới cho ranh giới
 * 6→8 số (docs/giao-viec/so-tay/de-xuat-tu-vung-2.md). tu-vung@1.json KHÔNG sửa: bench lát 1 khoá băm theo @1
 * (data/bench/ho-so-lat-1.tu-vung.json) — scripts/check-tu-vung.mjs đo độ phủ trên @1 (taiTuVung('tu-vung@1')) và kiểm
 * siêu tập (kiemSieuTap). Bảng ánh xạ từ 9 bộ từ vựng cũ ở data/tu-vung/anh-xa-cu.json.
 *
 * Sáu kiểu (spec §8.2):
 *   SO                    — số + đơn vị; quy đổi về donViChuan (chiều dài: mm, hàng dài: m — CEO), giữ giá trị gốc
 *   CO_KHONG              — có/không; phủ định Vi/En/Zh ("không", "chưa", "ko", "无", "非", "non-", "without")
 *   LIET_KE               — một giá trị trong giaTriHopLe; giá trị ngoài danh sách ⇒ CHUA_BIET
 *   CHAT_LIEU_THEO_VI_TRI — [{ viTri, chatLieu }]; tên vật liệu chung (plastic, cao su, giấy, gỗ, kim loại, thủy tinh,
 *                           gốm sứ, vải dệt) dùng LẠI mẫu của lib/so-tay-gates.js (op LA của dieuKienSo) — không chép
 *   CONG_DUNG             — cụm chữ sau "dùng cho / dùng để / 用于 …"
 *   TEN_LOAI              — tên gọi: danh từ đầu của tên hàng (productHead của so-tay-gates) hoặc chữ sau nhãn
 *                           ("model:", "nhãn hiệu:", "NSX:")
 *
 * Máy đọc là LUẬT, không gọi LLM. `bangChung` luôn là đoạn con NGUYÊN VĂN của chữ đầu vào (spec §8.1: máy kiểm câu
 * trích có trong đầu vào). Đọc không chắc ⇒ CHUA_BIET (không đoán): hai giá trị trái nhau, giá trị bị phủ định, số
 * chiều dài không có chữ ngữ cảnh.
 *
 * Không ghi gì: chỉ đọc data/ qua dataReadPath.
 */
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { dataReadPath } = require('./data-paths');
const { NHAN_MUC_SOAN } = require('./nguon-loai');
const gates = require('./so-tay-gates');
const { STOPWORDS } = require('./vi-tokens');

const TEP_TU_VUNG = 'tu-vung/tu-vung@2.json';
/** Phiên bản bench lát 1 khoá băm theo (data/bench/ho-so-lat-1.tu-vung.json, docs/bench/khoa-bo-de-lat-1.txt). */
const PHIEN_BAN_KHOA_BENCH = 'tu-vung@1';
const tepCua = (ten) => (ten ? `tu-vung/${ten}.json` : TEP_TU_VUNG);
const KIEU = ['SO', 'CO_KHONG', 'LIET_KE', 'CHAT_LIEU_THEO_VI_TRI', 'CONG_DUNG', 'TEN_LOAI'];
/** Viết tắt CEO đã duyệt (spec §6). Thêm mục mới = quyết định CEO — máy kiểm ĐỎ với vietTat ngoài danh mục. */
const DANH_MUC_VIET_TAT = Object.freeze({ KT: 'kích thước', NSX: 'nhà sản xuất', 'ĐA': 'điện áp', CS: 'công suất', CL: 'chất liệu' });
const OP_SO = ['<=', '<', '>=', '>', '='];
const OP_KHAC = ['LA', 'KHONG_LA'];
const LANG = ['vi', 'en', 'zh'];

const _tvTheoTen = new Map();
let _idx = null;
/**
 * Nạp từ vựng. Không tham số ⇒ bản runtime (tu-vung@2). `ten` ('tu-vung@1', 'tu-vung@2') ⇒ đúng tệp đó — chỉ dùng để kiểm
 * (lược đồ, siêu tập, độ phủ bench lát 1); máy đọc docGiaTri/vietCum luôn dùng bản runtime.
 */
function taiTuVung(ten) {
  const tep = tepCua(ten);
  if (!/^tu-vung\/tu-vung@\d+\.json$/.test(tep)) throw new Error(`tu-vung: phiên bản không hợp lệ "${ten}"`);
  if (!_tvTheoTen.has(tep)) _tvTheoTen.set(tep, JSON.parse(fs.readFileSync(dataReadPath(tep), 'utf8')));
  return _tvTheoTen.get(tep);
}
function index() {
  if (!_idx) _idx = new Map(taiTuVung().khoa.map((k) => [k.khoa, k]));
  return _idx;
}
function layKhoa(khoa) {
  const k = index().get(khoa);
  if (!k) throw new Error(`tu-vung: khoá "${khoa}" không có trong ${taiTuVung().phienBan}`);
  return k;
}

function sha256Tep(rel) {
  const p = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}
/** Phiên bản cho HoSoPhanLoai.phienBan.tuVung (spec §8.1). `ten` như taiTuVung. */
function phienBan(ten) {
  return { ten: taiTuVung(ten).phienBan, sha256: crypto.createHash('sha256').update(fs.readFileSync(dataReadPath(tepCua(ten)))).digest('hex') };
}

// ── Mẫu chữ ──────────────────────────────────────────────────────────────────────────────────────────────────
const CJK = /[㐀-鿿]/u;
const CHU = '[\\p{L}\\p{M}]';
/** Mẫu Vi/En bọc ranh giới chữ Unicode (`\b` của JS chỉ biết ASCII — xem #434 ở so-tay-gates); mẫu Zh không bọc. */
const boc = (src) => (CJK.test(src) ? `(?:${src})` : `(?<!${CHU})(?:${src})(?!${CHU})`);
const _reCache = new Map();
function reCua(list, flags = 'giu') {
  const srcs = (list || []).filter(Boolean);
  if (!srcs.length) return null;
  const key = `${flags}|${srcs.join('\u0001')}`;
  if (!_reCache.has(key)) _reCache.set(key, new RegExp(srcs.map(boc).join('|'), flags));
  return _reCache.get(key);
}
const mauCua = (cd) => (cd ? [...(cd.vi || []), ...(cd.en || []), ...(cd.zh || [])] : []);
/** Mọi lần khớp (không chồng nhau trong cùng một regex) — { s, e, text }. */
function khop(re, text) {
  if (!re) return [];
  const out = [];
  re.lastIndex = 0;
  for (const m of text.matchAll(re)) if (m[0]) out.push({ s: m.index, e: m.index + m[0].length, text: m[0], m });
  return out;
}

// Phủ định: chữ phủ định đứng trước trong CÙNG mệnh đề, cách tối đa hai từ ("không có", "chưa lắp", "non-", "无").
const RANH_MENH_DE = /[,;.\n()，。；（）]/g;
function truocTrongMenhDe(text, s, max = 40) {
  const t = text.slice(Math.max(0, s - max), s);
  let cut = -1;
  for (const m of t.matchAll(RANH_MENH_DE)) cut = m.index;
  return t.slice(cut + 1);
}
// Tính từ ghép chứa chữ phủ định mà KHÔNG phủ định cụm sau ("không dây", "thép không gỉ", "无线", "不锈钢", "Model No"):
// xoá (thay bằng khoảng trắng cùng độ dài) trước khi dò phủ định. Danh sách ở khongPhaiPhuDinh của từ vựng. Từ tu-vung@2 danh
// sách gồm cả cụm DANH TỪ chứa "không" của #667 (trước là hằng CUM_DANH_TU_KHONG của mã): "không khí/gian/trung" luôn là một
// khối; "chân không", "hàng không" chỉ khi chữ ngay sau KHÔNG phải chữ hay theo sau phủ định (mẫu có lookahead).
function boGiaPhuDinh(t) {
  const ds = taiTuVung().khongPhaiPhuDinh || [];
  return t.replace(reCua(ds, 'giu'), (m) => ' '.repeat(m.length));
}
// Chữ khẳng định xen giữa chữ phủ định và cụm ("không dây CÓ khung chụp", "No X WITH camera") ⇒ không phủ định.
// Chỉ tính từ thứ hai trở đi: từ đứng NGAY sau chữ phủ định thuộc về phủ định ("chưa có", "không được trang bị").
// Tiếng Trung không áp: "不带", "没有" là chính chữ phủ định.
const coKhangDinh = (xen) => {
  const ds = taiTuVung().khangDinhXen || [];
  const sau = String(xen || '').trim().split(/\s+/).slice(1).join(' ');
  return ds.length > 0 && sau.length > 0 && reCua(ds.filter((x) => !CJK.test(x)), 'iu').test(sau);
};
// "không phải X, Y, Z" phủ định CẢ DANH SÁCH tới hết đoạn (ranh đoạn: gạch ngang có cách, ";", xuống dòng, dấu chấm câu).
const RANH_DOAN = /\s[—–-]\s|[;\n；。]|(?<!\d)\.(?!\d)/g;
function phuDinhCaDoan(text, s) {
  const ds = taiTuVung().phuDinhCaDoan || [];
  if (!ds.length) return false;
  const t = text.slice(Math.max(0, s - 160), s);
  let cut = 0;
  for (const m of t.matchAll(RANH_DOAN)) cut = m.index + m[0].length;
  // xoá giả phủ định trên CẢ chữ rồi mới cắt: mẫu cần chữ phía sau ("chân không" + lookahead) và mẫu bị lát cắt chặt đôi
  const doan = boGiaPhuDinh(text).slice(Math.max(0, s - 160), s).slice(cut);
  const latin = ds.filter((p) => !CJK.test(p));
  const han = ds.filter((p) => CJK.test(p));
  return (latin.length && new RegExp(`(?<!${CHU})(?:${latin.join('|')})(?!${CHU})`, 'iu').test(doan)) || (han.length && new RegExp(han.join('|'), 'u').test(doan));
}
const daiTruoc = (ds) => [...ds].sort((a, b) => b.length - a.length);
/** Phần trước trong cùng mệnh đề, đã xoá giả phủ định trên CẢ chữ (cùng độ dài nên vị trí giữ nguyên). */
function truocTrongMenhDeBo(text, s, max = 40) {
  const bo = boGiaPhuDinh(text);
  const t = text.slice(Math.max(0, s - max), s);
  let cut = -1;
  for (const m of t.matchAll(RANH_MENH_DE)) cut = m.index;
  return bo.slice(Math.max(0, s - max), s).slice(cut + 1);
}
function biPhuDinh(text, s, phuDinh) {
  if (phuDinhCaDoan(text, s)) return true;
  if (!phuDinh?.length) return false;
  const truoc = truocTrongMenhDeBo(text, s);
  const latin = daiTruoc(phuDinh.filter((p) => !CJK.test(p)));
  const han = daiTruoc(phuDinh.filter((p) => CJK.test(p)));
  const mL = latin.length ? truoc.match(new RegExp(`(?<!${CHU})(?:${latin.join('|')})((?:\\s*${CHU}+){0,2})[\\s-]*$`, 'iu')) : null;
  if (mL && !coKhangDinh(mL[1])) return true;
  const mH = han.length ? truoc.match(new RegExp(`(?:${han.join('|')})[㐀-鿿]{0,2}\\s*$`, 'u')) : null;
  if (mH) return true;
  return false;
}
const phuDinhCua = (k) => [...new Set([...(k.cachDoc?.phuDinh || []), ...(taiTuVung().phuDinhChung || [])])];

// ── Số + đơn vị ─────────────────────────────────────────────────────────────────────────────────────────────
/**
 * "1.000" (nghìn kiểu Việt) = 1000; "0,3" = 0.3; "12.9" = 12.9; "1,000,000" = 1e6.
 * "1,500" (một nhóm ba số sau dấu phẩy, đầu khác 0) MƠ HỒ: 1,5 kiểu Việt hay 1500 kiểu Anh ⇒ NaN (người gọi trả CHUA_BIET).
 */
function parseSo(s) {
  const t = String(s).trim();
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ''));
  if (/^\d{1,3}(,\d{3}){2,}$/.test(t)) return Number(t.replace(/,/g, ''));
  if (/^[1-9]\d{0,2},\d{3}$/.test(t)) return NaN;
  return Number(t.replace(',', '.'));
}
const tron = (x) => Number(Number(x).toPrecision(12));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
function bietDanh(tv = taiTuVung()) {
  return tv.bietDanhDonVi || {};
}
/** Đơn vị (chữ bất kỳ) → đơn vị chuẩn tên trong heDonVi, hoặc null. "MW", "MV", "MA" (M hoa = mega) ⇒ null, không hạ thành mili. */
function chuanDonVi(u, tv = taiTuVung()) {
  if (u == null) return null;
  const raw = String(u).trim();
  const bd = bietDanh(tv);
  if (bd[raw] !== undefined) return bd[raw];
  if (/^M[WVA]$/.test(raw)) return null;
  if (bd[raw.toLowerCase()] !== undefined) return bd[raw.toLowerCase()];
  for (const he of Object.values(tv.heDonVi || {})) if (Object.prototype.hasOwnProperty.call(he, raw)) return raw;
  return null;
}
function heSo(k, u, tv = taiTuVung()) {
  const he = (tv.heDonVi || {})[k.heDonVi] || {};
  const c = chuanDonVi(u, tv);
  return c != null && Number.isFinite(he[c]) ? { donVi: c, f: he[c] } : null;
}
function quyDoi(k, so, u, tv = taiTuVung()) {
  const a = heSo(k, u, tv);
  const b = heSo(k, k.donViChuan, tv);
  if (!a || !b || !Number.isFinite(so)) return null;
  return tron((so * a.f) / b.f);
}
function reDonVi(k, tv = taiTuVung()) {
  const he = (tv.heDonVi || {})[k.heDonVi] || {};
  const alias = Object.entries(bietDanh(tv)).filter(([, c]) => Object.prototype.hasOwnProperty.call(he, c)).map(([a]) => a);
  const all = [...new Set([...Object.keys(he), ...alias])].sort((x, y) => y.length - x.length);
  // đơn vị Latin không được dính chữ Latin/số phía sau ("5G" không phải 5 g); chữ Hán phía sau thì được ("220V交流", "1000V以下")
  return all.map((a) => (CJK.test(a) ? esc(a) : `${esc(a)}(?![\\p{Script=Latin}\\p{M}\\d])`)).join('|');
}
const SO = '(\\d+(?:[.,]\\d+)*)';

/**
 * Số này có phải một đại lượng đứng riêng không (nhìn chữ ngay trước nó):
 *  - dính sau chữ Latin ("M8", "AB12", "GA22") ⇒ không — trừ tiền tố "AC"/"DC" ("DC12V") và ký hiệu đường kính "Ø20";
 *  - nối gạch / gạch dưới vào một mã ("MDY-11-20W", "KB-2200W") ⇒ không;
 *  - đứng sau "<số>/" (phân số "1/2 inch", cặp "50/60Hz") ⇒ không (đọc mỗi vế sau là sai).
 * Chữ Hán liền trước thì được ("电压220V").
 */
function soDungRieng(text, s) {
  const truoc = text.slice(Math.max(0, s - 12), s);
  if (/(?<![\p{L}\p{N}])(?:AC|DC)[\s-]?$/iu.test(truoc)) return true;
  if (/[ØøΦφ⌀]\s?$/u.test(truoc)) return true;
  if (/[A-Za-zÀ-ỹĐđ]$/u.test(truoc)) return false;
  if (/[\p{L}\p{N}][-_]$/u.test(truoc)) return false;
  if (/\d\s*\/\s*$/u.test(truoc)) return false;
  return true;
}

/** Từ so sánh ngay trước số ("không quá", "trên", "max", "≤", "不超过") hoặc ngay sau đơn vị ("以下", "以上") ⇒ { op, s, e }. */
function soSanhQuanh(text, s, e) {
  const ss = taiTuVung().soSanh || {};
  const truoc = text.slice(Math.max(0, s - 30), s);
  let best = null;
  for (const [op, ds] of Object.entries(ss.truoc || {})) {
    const re = new RegExp(`(?:${daiTruoc(ds).map(boc).join('|')})\\s*[:：]?\\s*$`, 'iu');
    const m = truoc.match(re);
    if (m && (!best || m[0].length > best.len)) best = { op, len: m[0].length };
  }
  const sau = text.slice(e, e + 4);
  for (const [op, ds] of Object.entries(ss.sau || {})) {
    const m = sau.match(new RegExp(`^\\s*(?:${daiTruoc(ds).map(esc).join('|')})`, 'u'));
    if (m) return { op, s: best ? s - best.len : s, e: e + m[0].length };
  }
  return best ? { op: best.op, s: s - best.len, e } : null;
}

function docSo(k, text, tv) {
  const units = reDonVi(k, tv);
  const ngucanh = reCua(mauCua(k.cachDoc), 'iu');
  const coNguCanh = (s) => {
    if (!k.canNguCanh) return true;
    const w = text.slice(Math.max(0, s - 30), s);
    return Boolean(ngucanh && ngucanh.test(w));
  };
  const ket = (so, u, s, e, cac, ss) => {
    const v = so.map((x) => quyDoi(k, x, u, tv));
    if (v.some((x) => x == null)) return null;
    const giaTri = k.soChieu ? v : v[0];
    const cacV = cac && cac.length > 1 ? cac.map((x) => quyDoi(k, x, u, tv)) : null;
    if (cacV && cacV.some((x) => x == null)) return null;
    return {
      giaTri, donVi: k.donViChuan, ...(ss ? { op: ss.op } : {}),
      goc: { giaTri: k.soChieu ? so : so[0], donVi: chuanDonVi(u, tv) },
      bangChung: text.slice(ss ? ss.s : s, ss ? ss.e : e), trangThai: 'DA_CO', ...(cacV ? { cacGiaTri: cacV } : {}),
    };
  };
  if (k.soChieu) {
    const re = new RegExp(`${SO}\\s*[x×*X]\\s*${SO}(?:\\s*[x×*X]\\s*${SO})?\\s*(${units})`, 'giu');
    for (const m of text.matchAll(re)) {
      const so = [m[1], m[2], m[3]].filter((x) => x != null).map(parseSo);
      if (!k.soChieu.includes(so.length) || !coNguCanh(m.index) || !soDungRieng(text, m.index)) continue;
      const r = ket(so, m[4], m.index, m.index + m[0].length);
      if (r) return r;
    }
    return null;
  }
  const re = new RegExp(`${SO}(?:\\s*(?:-|–|~|đến|tới|to)\\s*${SO})?\\s*(${units})`, 'giu');
  for (const m of text.matchAll(re)) {
    if (!coNguCanh(m.index) || !soDungRieng(text, m.index)) continue;
    const so = [parseSo(m[1]), ...(m[2] != null ? [parseSo(m[2])] : [])];
    const e = m.index + m[0].length;
    const ss = m[2] == null ? soSanhQuanh(text, m.index, e) : null; // khoảng "10-20 mm" không mang op
    const r = ket([so[0]], m[3], m.index, e, so, ss);
    if (r) return r;
  }
  for (const d of k.docThem || []) {
    const r2 = new RegExp(d.mau, 'giu');
    for (const m of text.matchAll(r2)) {
      const r = ket([parseSo(m[1])], d.donVi, m.index, m.index + m[0].length);
      if (r) return r;
    }
  }
  return null;
}

/**
 * Khoá SO đếm (`demSo`, tu-vung@2: soLoi, soSoi): số (chữ số hoặc số chữ `soChu` — "hai", "two", "两") + đơn vị đếm, có thể
 * kèm chữ so sánh sau số/đơn vị (`soSanhDem`: "hoặc hơn", "trở lên", "or more", "及以上" ⇒ >=) hoặc trước số (soSanh: "không
 * quá", "ít nhất"…). Số chữ đứng sau một số chữ khác / chữ số ghép (`soChuGhep`: "mười hai", "twenty two", "十二") ⇒ không đọc.
 */
function docDem(k, text, tv) {
  const units = reDonVi(k, tv);
  const chu = daiTruoc(Object.keys(tv.soChu || {}));
  const ghep = daiTruoc([...chu, ...(tv.soChuGhep || [])]);
  const chuL = chu.filter((x) => !CJK.test(x)).map(esc); const chuH = chu.filter((x) => CJK.test(x)).map(esc);
  const ghepL = ghep.filter((x) => !CJK.test(x)).map(esc); const ghepH = ghep.filter((x) => CJK.test(x)).map(esc);
  const alts = ['(?<![\\d.,])\\d+'];
  if (chuL.length) alts.push(`(?<!${CHU})${ghepL.length ? `(?<!(?:${ghepL.join('|')})[\\s-]+)` : ''}(?:${chuL.join('|')})(?!${CHU})`);
  if (chuH.length) alts.push(`${ghepH.length ? `(?<!${ghepH.join('|')})` : ''}(?:${chuH.join('|')})${ghepH.length ? `(?!${ghepH.join('|')})` : ''}`);
  const ssDs = Object.entries(tv.soSanhDem || {}).flatMap(([op, ds]) => ds.map((d) => ({ op, d })));
  const ssSrc = daiTruoc(ssDs.map((x) => x.d)).map((d) => (CJK.test(d) ? esc(d) : `${esc(d)}(?!${CHU})`)).join('|');
  const opCua = (t) => (t ? (ssDs.find((x) => x.d.toLowerCase() === t.toLowerCase()) || {}).op : undefined);
  const SS = ssSrc ? `(?:\\s+(${ssSrc}))?` : '()';
  const SS2 = ssSrc ? `(?:\\s*(${ssSrc}))?` : '()';
  const re = new RegExp(`(${alts.join('|')})${SS}\\s*(${units})${SS2}`, 'giu');
  for (const m of text.matchAll(re)) {
    const so = /^\d+$/.test(m[1]) ? Number(m[1]) : (tv.soChu || {})[m[1].toLowerCase()] ?? (tv.soChu || {})[m[1]];
    if (!Number.isFinite(so)) continue;
    if (/^\d/.test(m[1]) && !soDungRieng(text, m.index)) continue;
    const v = quyDoi(k, so, m[3], tv);
    if (v == null) continue;
    const e = m.index + m[0].length;
    const opSau = opCua(m[2]) || opCua(m[4]);
    const ss = opSau ? null : soSanhQuanh(text, m.index, e);
    const s0 = ss ? ss.s : m.index;
    return {
      giaTri: v, donVi: k.donViChuan, ...(opSau ? { op: opSau } : (ss ? { op: ss.op } : {})),
      goc: { giaTri: so, donVi: chuanDonVi(m[3], tv) }, bangChung: text.slice(s0, ss ? Math.max(e, ss.e) : e), trangThai: 'DA_CO',
    };
  }
  return null;
}

/**
 * Tỉ lệ dạng phân số (`docPhanSo`, tu-vung@2: tiLe): "1/10", "1:8" ⇒ 0,1 / 0,125 — chỉ khi có chữ tỉ lệ (cachDoc) trong 30 ký
 * tự trước, hoặc (riêng "a/b") tên kích thước (`phanSo.sauLa`) đứng ngay sau ("trên 1/10 đường kính"). Từ so sánh trước số ⇒ op.
 * "1/2 inch", "50/60Hz" ⇒ không đọc (rơi về docSo, nơi soDungRieng chặn số sau "<số>/").
 */
function docPhanSo(k, text) {
  const ngu = reCua(mauCua(k.cachDoc), 'iu');
  const sauDs = mauCua(k.phanSo?.sauLa);
  const sau = sauDs.length ? new RegExp(`^\\s*(?:${daiTruoc(sauDs).map((x) => (CJK.test(x) ? `(?:${x})` : `(?:${x})(?!${CHU})`)).join('|')})`, 'iu') : null;
  const re = /(\d+(?:[.,]\d+)?)\s*([/:])\s*(\d+(?:[.,]\d+)?)/gu;
  for (const m of text.matchAll(re)) {
    const s = m.index; const e = s + m[0].length;
    if (!soDungRieng(text, s) || /[\d/:]$/.test(text.slice(0, s)) || /^[\d/:]/.test(text.slice(e))) continue;
    const coNgu = Boolean(ngu && ngu.test(text.slice(Math.max(0, s - 30), s)));
    const mSau = m[2] === '/' && sau ? text.slice(e).match(sau) : null;
    if (!coNgu && !mSau) continue;
    const a = parseSo(m[1]); const b = parseSo(m[3]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) continue;
    const ss = soSanhQuanh(text, s, e);
    const cuoi = Math.max(mSau ? e + mSau[0].length : e, ss ? ss.e : e);
    return { giaTri: tron(a / b), donVi: k.donViChuan, ...(ss ? { op: ss.op } : {}), goc: { giaTri: tron(a / b), donVi: k.donViChuan }, bangChung: text.slice(ss ? ss.s : s, cuoi), trangThai: 'DA_CO' };
  }
  return null;
}

// ── Đọc theo kiểu ───────────────────────────────────────────────────────────────────────────────────────────
const CHUA_BIET = (extra = {}) => ({ trangThai: 'CHUA_BIET', ...extra });

/**
 * Cấu trúc câu đọc thêm cho một khoá CO_KHONG — dữ liệu `cauTrucCo[<khoá>] = [{ mau, truLaiTruoc }]` của từ vựng (tu-vung@2;
 * trước là hằng CAU_TRUC_CO của mã). `mau` có nhóm 1 = các chữ đứng trước; bỏ lần khớp khi chữ cuối của nhóm 1 khớp
 * `truLaiTruoc`. laBoPhan (#675): "<X> rời của <Y>" ⇒ bộ phận; trừ "tháo/dạng/để/chưa rời của" (hàng tháo rời, GIR 2(a)).
 */
const _cauTruc = new Map();
function cauTrucCua(khoa) {
  if (!_cauTruc.has(khoa)) {
    _cauTruc.set(khoa, ((taiTuVung().cauTrucCo || {})[khoa] || []).map((c) => ({
      re: new RegExp(c.mau, 'giu'), truLaiTruoc: c.truLaiTruoc ? new RegExp(c.truLaiTruoc, 'iu') : null,
    })));
  }
  return _cauTruc.get(khoa);
}
function khopCauTruc(khoa, text) {
  const out = [];
  for (const { re, truLaiTruoc } of cauTrucCua(khoa)) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const truoc = m[1].trim().split(/\s+/).pop();
      if (truLaiTruoc && truLaiTruoc.test(truoc)) continue;
      out.push({ s: m.index, e: m.index + m[0].length, text: m[0], m });
    }
  }
  return out;
}

function docCoKhong(k, text) {
  const pd = phuDinhCua(k);
  const co = [...khop(reCua(mauCua(k.cachDoc)), text), ...khopCauTruc(k.khoa, text)];
  const khong = khop(reCua(mauCua(k.cachDocKhong)), text);
  const ketQua = [];
  for (const x of co) { const pdx = biPhuDinh(text, x.s, pd); ketQua.push({ ...x, v: !pdx, phuDinh: pdx }); }
  // cụm mang giá trị KHÔNG mà bị phủ định ("không hoàn chỉnh", "chưa hoàn chỉnh"): không phải bằng chứng cho giá trị nào
  // (hàng chưa hoàn chỉnh vẫn có thể là hàng hoàn chỉnh theo GIR 2(a)) ⇒ bỏ, không đoán (#667)
  for (const x of khong) if (!biPhuDinh(text, x.s, pd)) ketQua.push({ ...x, v: false, phuDinh: false });
  if (!ketQua.length) return CHUA_BIET();
  // cùng một chỗ: giữ cụm dài nhất ("gắn đầu nối" thắng "đầu nối")
  ketQua.sort((a, b) => (b.e - b.s) - (a.e - a.s) || a.s - b.s);
  const giu = [];
  for (const x of ketQua) if (!giu.some((g) => x.s < g.e && g.s < x.e)) giu.push(x);
  const vals = new Set(giu.map((x) => x.v));
  if (vals.size > 1) return CHUA_BIET({ mauThuan: giu.map((x) => ({ giaTri: x.v, bangChung: x.text })) });
  const x = giu.sort((a, b) => a.s - b.s)[0];
  let s = x.s;
  if (x.phuDinh) { // bằng chứng phủ định gồm cả chữ phủ định đứng trước (chỉ khi giá trị đến từ phủ định — không phải cachDocKhong)
    const truoc = truocTrongMenhDeBo(text, x.s);
    const m = truoc.match(new RegExp(`(?:${pd.map((p) => (CJK.test(p) ? p : `(?<!${CHU})${p}`)).join('|')})(?:\\s*${CHU}+){0,2}[\\s-]*$`, 'iu'));
    if (m) s = x.s - (truoc.length - m.index);
  }
  return { giaTri: x.v, bangChung: text.slice(s, x.e), trangThai: 'DA_CO' };
}

function docLietKe(k, text) {
  const pd = phuDinhCua(k);
  const thay = [];
  for (const v of k.giaTriHopLe || []) {
    for (const x of khop(reCua(mauCua(k.moTaGiaTri?.[v]?.cachDoc)), text)) {
      if (!biPhuDinh(text, x.s, pd)) thay.push({ ...x, v });
    }
  }
  if (!thay.length) return CHUA_BIET();
  let ds = thay;
  if (k.cumDaiThang) { // tu-vung@2: cụm chồng nhau ⇒ cụm dài thắng ("đột dập và kéo giãn" thắng "dập"); khoá @1 không bật
    ds = [];
    for (const x of [...thay].sort((a, b) => (b.e - b.s) - (a.e - a.s) || a.s - b.s)) if (!ds.some((g) => x.s < g.e && g.s < x.e)) ds.push(x);
  }
  const vals = [...new Set(ds.map((x) => x.v))];
  if (vals.length > 1) return CHUA_BIET({ ungVien: vals });
  const x = ds.sort((a, b) => a.s - b.s)[0];
  return { giaTri: x.v, bangChung: x.text, trangThai: 'DA_CO' };
}

function mauVatLieu(k, cl) {
  const mt = k.moTaGiaTri?.[cl] || {};
  const list = [...mauCua(mt.cachDoc)];
  let gatesRe = null;
  if (mt.dungMau) {
    const [tep, ten] = String(mt.dungMau).split('#');
    if (tep === 'so-tay-gates') gatesRe = gates.chatLieuRegex(ten);
  }
  return { re: reCua(list), gatesRe: gatesRe ? new RegExp(gatesRe.source, `${gatesRe.flags.replace('g', '')}g`) : null, gatesTen: gatesRe ? String(mt.dungMau).split('#')[1] : null };
}

/**
 * Chữ bề ngoài / lớp phủ ngay trước tên vật liệu ("mạ kẽm", "phủ nhựa", "vân gỗ") — không phải chất liệu của hàng.
 * Động từ gia công sau tên máy/dụng cụ ("máy cắt thép", "đá mài inox", "dùng để cắt thép") — vật liệu là PHÔI, không phải
 * chất liệu hàng: dùng LẠI luật GIA_CONG_TRUOC của lib/so-tay-gates.js (không chép).
 */
function beNgoai(text, s) {
  if (gates.GIA_CONG_TRUOC && gates.GIA_CONG_TRUOC.test(text.slice(Math.max(0, s - 40), s))) return true;
  const ds = taiTuVung().beNgoaiTruoc || [];
  if (!ds.length) return false;
  return new RegExp(`(?<!${CHU})(?:${ds.join('|')})\\s+$`, 'iu').test(text.slice(Math.max(0, s - 15), s));
}
function docChatLieu(k, text) {
  const pd = phuDinhCua(k);
  const coTheoGates = new Set(gates.chatLieuTrong(text)); // luật "vân gỗ / giả gỗ / máy cắt thép" của so-tay-gates
  const thay = [];
  for (const cl of k.giaTriHopLe || []) {
    const { re, gatesRe, gatesTen } = mauVatLieu(k, cl);
    const ms = [...khop(re, text)];
    if (gatesRe && coTheoGates.has(gatesTen)) ms.push(...khop(gatesRe, text));
    for (const x of ms) if (!biPhuDinh(text, x.s, pd) && !beNgoai(text, x.s)) thay.push({ ...x, cl, chung: Boolean(k.moTaGiaTri?.[cl]?.chung) });
  }
  if (!thay.length) return CHUA_BIET();
  // cụm dài thắng; dài bằng nhau thì tên cụ thể ("đồng", "nhôm") thắng tên chung ("kim loại")
  thay.sort((a, b) => (b.e - b.s) - (a.e - a.s) || Number(a.chung) - Number(b.chung) || a.s - b.s);
  const giu = [];
  for (const x of thay) if (!giu.some((g) => x.s < g.e && g.s < x.e)) giu.push(x);
  giu.sort((a, b) => a.s - b.s);
  const out = [];
  for (const x of giu) {
    const truoc = truocTrongMenhDe(text, x.s, 30);
    let viTri = 'CHINH'; let best = -1;
    for (const vt of k.viTri || []) {
      if (vt === 'CHINH') continue;
      for (const y of khop(reCua(mauCua(k.moTaViTri?.[vt]?.cachDoc)), truoc)) if (y.s > best) { best = y.s; viTri = vt; }
    }
    if (!out.some((o) => o.viTri === viTri && o.chatLieu === x.cl)) out.push({ viTri, chatLieu: x.cl, bangChung: x.text });
  }
  return { giaTri: out.map(({ viTri, chatLieu }) => ({ viTri, chatLieu })), chiTiet: out, bangChung: out[0].bangChung, trangThai: 'DA_CO' };
}

// "và" KHÔNG cắt: "sạc pin và truyền dữ liệu" là một công dụng hai vế (cắt ở "và" làm rơi vế quyết định nhánh).
const DUNG_CHU = /[,;\n()，。；、（）:]|(?<!\d)\.|\.(?!\d)|\s+(?:kèm|có|với|bằng|loại|model|nhãn|hiệu|công suất|điện áp|kích thước|màu)\s/iu;
function docSauNhan(k, text) {
  const pd = phuDinhCua(k);
  for (const dd of Object.entries(k.giaTriDacBiet || {})) {
    const [v, def] = dd;
    const x = khop(reCua(mauCua(def.cachDoc)), text)[0];
    if (x) return { giaTri: v, bangChung: x.text, trangThai: 'DA_CO' };
  }
  for (const x of khop(reCua(mauCua(k.cachDoc)), text)) {
    if (biPhuDinh(text, x.s, pd)) continue;
    const sau = text.slice(x.e);
    const lead = sau.match(/^\s*[:：]?\s*/u)[0];
    const rest = sau.slice(lead.length);
    const cut = rest.search(k.kieu === 'TEN_LOAI' ? /[,;\n()，。；（）]/u : DUNG_CHU);
    const val = (cut >= 0 ? rest.slice(0, cut) : rest).slice(0, 80).trim();
    if (!val) continue;
    const e = x.e + lead.length + rest.indexOf(val) + val.length;
    return { giaTri: val, bangChung: text.slice(x.s, e), trangThai: 'DA_CO' };
  }
  return CHUA_BIET();
}

function docTenLoai(k, text) {
  if (mauCua(k.cachDoc).length || k.giaTriDacBiet) return docSauNhan(k, text);
  const head = gates.productHead(text);
  if (!head.length) return CHUA_BIET();
  const re = new RegExp(head.map(esc).join('\\s+'), 'iu');
  const m = text.normalize('NFC').match(re);
  if (!m) return CHUA_BIET();
  return { giaTri: head.join(' '), bangChung: m[0], trangThai: 'DA_CO' };
}

/**
 * Tên hàng ĐẦY ĐỦ cho hồ sơ (#680): như docTenLoai (danh từ đầu — productHead), nhưng cụm khongPhaiPhuDinh của từ vựng
 * ("chân không", "không khí", "không gỉ", "không dây") là MỘT khối — không bị cắt ở chữ "không" như từ mở định ngữ. Chữ "không"
 * ngoài các cụm đó vẫn cắt ("Bình giữ nhiệt không nhãn hiệu" ⇒ "bình giữ nhiệt"). Cụm mà chữ ngay sau "không" tự là từ mở định
 * ngữ / hư từ ("không chỉ", "không những") không gộp — đó là câu, không phải tên.
 * KHÔNG thay docGiaTri('tenLoai'): cách đọc khoá @1 khoá theo vân tay (bench lát 1 — scripts/vang-doc-tu-vung-1.mjs).
 */
const NOI_CUM = '\u01C2'; // chữ (\p{L}) không gặp trong mô tả hàng — nối các âm tiết của một cụm thành một "âm tiết" cho productHead
function docTenLoaiDayDu(text) {
  const t = String(text || '').normalize('NFC');
  if (!t.trim()) return CHUA_BIET();
  const k = layKhoa('tenLoai');
  if (mauCua(k.cachDoc).length || k.giaTriDacBiet) return docSauNhan(k, t);
  const ds = taiTuVung().khongPhaiPhuDinh || [];
  const gop = !ds.length ? t : t.replace(reCua(ds, 'giu'), (m) => {
    const w = m.toLowerCase().split(/\s+/);
    const i = w.indexOf('không');
    const sau = i >= 0 ? w[i + 1] : null;
    if (sau && (gates.QUALIFIER.has(sau) || STOPWORDS.has(sau))) return m;
    return m.replace(/\s+/g, NOI_CUM);
  });
  const head = gates.productHead(gop).flatMap((w) => w.split(NOI_CUM));
  if (!head.length) return CHUA_BIET();
  const mm = t.match(new RegExp(head.map(esc).join('\\s+'), 'iu'));
  if (!mm) return CHUA_BIET();
  return { giaTri: head.join(' '), bangChung: mm[0], trangThai: 'DA_CO' };
}

/**
 * Đọc giá trị của `khoa` từ chữ. Trả { giaTri, donVi?, goc?, bangChung, trangThai: 'DA_CO'|'CHUA_BIET' }.
 * `lang` (vi|en|zh) chỉ là gợi ý — máy luôn thử mẫu cả ba thứ tiếng.
 */
function docGiaTri(khoa, text, lang) { // eslint-disable-line no-unused-vars
  const k = layKhoa(khoa);
  const t = String(text || '').normalize('NFC');
  if (!t.trim()) return CHUA_BIET();
  switch (k.kieu) {
    case 'SO': return (k.demSo ? docDem(k, t, taiTuVung()) : null) || (k.docPhanSo ? docPhanSo(k, t) : null) || docSo(k, t, taiTuVung()) || CHUA_BIET();
    case 'CO_KHONG': return docCoKhong(k, t);
    case 'LIET_KE': return docLietKe(k, t);
    case 'CHAT_LIEU_THEO_VI_TRI': return docChatLieu(k, t);
    case 'CONG_DUNG': return docSauNhan(k, t);
    case 'TEN_LOAI': return docTenLoai(k, t);
    default: return CHUA_BIET();
  }
}

/** Kiểm một giá trị có cấu trúc (khách khai / ERP gửi) theo kiểu của khoá. Sai kiểu / ngoài danh sách ⇒ CHUA_BIET. */
function kiemGiaTriTheo(k, giaTri) {
  const bad = (lyDo) => ({ trangThai: 'CHUA_BIET', lyDo });
  switch (k.kieu) {
    case 'SO': {
      const arr = Array.isArray(giaTri) ? giaTri : [giaTri];
      if (!arr.length || !arr.every((x) => typeof x === 'number' && Number.isFinite(x))) return bad('khong-phai-so');
      if (k.soChieu && Array.isArray(giaTri) && !k.soChieu.includes(giaTri.length)) return bad('sai-so-chieu');
      return { trangThai: 'DA_CO', giaTri };
    }
    case 'CO_KHONG': return typeof giaTri === 'boolean' ? { trangThai: 'DA_CO', giaTri } : bad('khong-phai-boolean');
    case 'LIET_KE': {
      const arr = Array.isArray(giaTri) ? giaTri : [giaTri];
      return arr.length && arr.every((v) => (k.giaTriHopLe || []).includes(v)) ? { trangThai: 'DA_CO', giaTri } : bad('ngoai-gia-tri-hop-le');
    }
    case 'CHAT_LIEU_THEO_VI_TRI': {
      const arr = Array.isArray(giaTri) ? giaTri : [giaTri];
      const ok = arr.length && arr.every((x) => x && (k.viTri || []).includes(x.viTri) && (k.giaTriHopLe || []).includes(x.chatLieu));
      return ok ? { trangThai: 'DA_CO', giaTri: arr } : bad('vat-lieu-hoac-vi-tri-la');
    }
    case 'CONG_DUNG':
    case 'TEN_LOAI':
      return (typeof giaTri === 'string' && giaTri.trim()) ? { trangThai: 'DA_CO', giaTri } : bad('chuoi-rong');
    default: return bad('kieu-la');
  }
}
const kiemGiaTri = (khoa, giaTri) => kiemGiaTriTheo(layKhoa(khoa), giaTri);

// ── Viết ────────────────────────────────────────────────────────────────────────────────────────────────────
const fmtSo = (n) => String(tron(n)).replace('.', ',');
const dien = (mau, v) => String(mau || '{giaTri}').replace('{giaTri}', v);
/**
 * Cụm chữ của một dữ kiện trong mô tả (khuôn cachViet). `tat`: dùng viết tắt chuẩn. Giá trị sai kiểu ⇒ null.
 * LIET_KE giá trị gộp nhiều loại (moTaGiaTri[v].cachViet === null, vd loaiCongTac NGAT_SOC_DONG) ⇒ null: người viết
 * lấy cụm từ tenLoai ("công tắc micro"), không chép cả danh sách của dòng biểu thuế vào mô tả.
 */
function vietCum(khoa, giaTri, { tat = false } = {}) {
  const k = layKhoa(khoa);
  if (kiemGiaTriTheo(k, giaTri).trangThai !== 'DA_CO') return null;
  const cv = k.cachViet || {};
  const mau = tat && cv.viTat ? cv.viTat : cv.vi;
  switch (k.kieu) {
    case 'SO': {
      const so = Array.isArray(giaTri) ? giaTri.map(fmtSo).join('x') : fmtSo(giaTri);
      // đơn vị ghi MỘT lần ở cuối, không cách (CEO: KT: 129x82x42mm); đơn vị đếm chữ (tu-vung@2 donViCachRieng: "2 lõi") có cách
      return dien(mau, `${so}${k.donViCachRieng ? ' ' : ''}${k.donViChuan}`);
    }
    case 'CO_KHONG': return giaTri ? cv.vi : cv.viPhuDinh;
    case 'LIET_KE': {
      // moTaGiaTri[v].cachViet: cụm riêng khi nhãn có chú thích; null = giá trị gộp nhiều loại của dòng 8 số ⇒ null
      const ds = (Array.isArray(giaTri) ? giaTri : [giaTri]).map((v) => {
        const mt = k.moTaGiaTri[v];
        return Object.prototype.hasOwnProperty.call(mt, 'cachViet') ? mt.cachViet : dien(mau, mt.nhanVi);
      });
      return ds.some((x) => x === null) ? null : ds.join(', ');
    }
    case 'CHAT_LIEU_THEO_VI_TRI':
      return (Array.isArray(giaTri) ? giaTri : [giaTri]).map((x) => {
        if (x.viTri === 'CHINH') return dien(mau, x.chatLieu);
        const vt = k.moTaViTri[x.viTri].cachViet || {};
        return dien(tat && vt.viTat ? vt.viTat : vt.vi, x.chatLieu);
      }).join(', ');
    default: {
      const dd = k.giaTriDacBiet?.[giaTri];
      return dd ? dd.cachViet : dien(mau, giaTri);
    }
  }
}

function cauHoiCho(khoa, lang = 'vi') {
  const k = layKhoa(khoa);
  return (k.cauHoi && k.cauHoi[lang]) || k.cauHoi.vi;
}

/** Cụm không hợp chuỗi ECUS: chú thích ngoặc, chấm phẩy (dấu ngăn của 1.68), " / " liệt kê, "xuất xứ" (CEO bỏ). */
const CUM_XAU = /[();]|\s\/\s|xuất xứ/iu;
// ── Máy kiểm lược đồ ────────────────────────────────────────────────────────────────────────────────────────
function kiemTuVung(tv) {
  const loi = [];
  const add = (ma, khoa) => loi.push(`${ma}:${khoa}`);
  if (!tv || !Array.isArray(tv.khoa)) return ['tu-vung-khong-co-khoa:'];
  const thay = new Set();
  const mauHopLe = (src, khoa) => { try { new RegExp(boc(src), 'giu'); } catch { add('mau-khong-hop-le', `${khoa}:${src}`); } };
  const kiemCachDoc = (cd, khoa, batBuoc) => {
    if (!cd || LANG.some((l) => !Array.isArray(cd[l]))) { add('thieu-cach-doc', khoa); return; }
    for (const s of [...mauCua(cd), ...(cd.phuDinh || [])]) mauHopLe(s, khoa);
    if (batBuoc && !mauCua(cd).length) add('cach-doc-rong', khoa);
  };
  // danh sách mẫu chung (phủ định, giả phủ định, khẳng định xen, từ so sánh) phải là regex hợp lệ
  const mauChung = [...(tv.phuDinhChung || []), ...(tv.phuDinhCaDoan || []), ...(tv.khongPhaiPhuDinh || []), ...(tv.khangDinhXen || []),
    ...Object.values(tv.soSanh?.truoc || {}).flat(), ...Object.values(tv.soSanh?.sau || {}).flat()];
  for (const src of mauChung) mauHopLe(src, '(chung)');
  // tu-vung@2: cấu trúc câu CO_KHONG, số chữ, chữ so sánh của khoá đếm
  const theoTen = new Map(tv.khoa.map((k) => [k?.khoa, k]));
  for (const [khoa, ds] of Object.entries(tv.cauTrucCo || {})) {
    if (theoTen.get(khoa)?.kieu !== 'CO_KHONG') add('cau-truc-khoa-khong-phai-co-khong', khoa);
    for (const c of Array.isArray(ds) ? ds : [ds]) {
      try { new RegExp(c?.mau, 'giu'); if (!c?.mau) throw new Error(); } catch { add('mau-khong-hop-le', `cauTrucCo.${khoa}:${c?.mau}`); }
      if (c?.truLaiTruoc !== undefined) { try { new RegExp(c.truLaiTruoc, 'iu'); } catch { add('mau-khong-hop-le', `cauTrucCo.${khoa}:${c.truLaiTruoc}`); } }
    }
  }
  for (const [w, n] of Object.entries(tv.soChu || {})) if (!Number.isInteger(n) || n <= 0) add('so-chu-khong-phai-so-nguyen-duong', w);
  for (const [op, ds] of Object.entries(tv.soSanhDem || {})) if (!OP_SO.includes(op) || !Array.isArray(ds) || !ds.every((d) => typeof d === 'string' && d.trim())) add('so-sanh-dem-khong-hop-le', op);
  for (const k of tv.khoa) {
    const id = k?.khoa || '?';
    if (thay.has(id)) add('khoa-trung', id);
    thay.add(id);
    if (!/^[a-z][a-zA-Z0-9]*$/.test(id)) add('khoa-khong-camel', id);
    if (!KIEU.includes(k.kieu)) { add('kieu-la', id); continue; }
    for (const [f, ma] of [['nhanVi', 'thieu-nhan-vi'], ['nhanEn', 'thieu-nhan-en'], ['nhanZh', 'thieu-nhan-zh']]) if (!String(k[f] || '').trim()) add(ma, id);
    if (!String(k.cauHoi?.vi || '').trim()) add('thieu-cau-hoi-vi', id);
    if (!String(k.cauHoi?.zh || '').trim()) add('thieu-cau-hoi-zh', id);
    if (!k.cachViet || typeof k.cachViet.vi !== 'string') add('thieu-cach-viet', id);
    for (const [co, kieu] of [['demSo', 'SO'], ['docPhanSo', 'SO'], ['phanSo', 'SO'], ['donViCachRieng', 'SO'], ['cumDaiThang', 'LIET_KE']]) {
      if (k[co] !== undefined && k.kieu !== kieu) add('co-chi-cho-kieu', `${id}:${co}:${kieu}`);
    }
    if (k.phanSo?.sauLa) kiemCachDoc(k.phanSo.sauLa, `${id}:phanSo.sauLa`, false);
    if (k.vietTat !== undefined && !Object.prototype.hasOwnProperty.call(DANH_MUC_VIET_TAT, k.vietTat)) add('viet-tat-ngoai-danh-muc', `${id}:${k.vietTat}`);
    if (!NHAN_MUC_SOAN.includes(k.nguonLoai)) add('nguon-loai-khong-hop-le', `${id}:${k.nguonLoai}`);
    kiemCachDoc(k.cachDoc, id, ['CO_KHONG', 'CONG_DUNG'].includes(k.kieu) || (k.kieu === 'SO' && k.canNguCanh));
    if (k.cachDocKhong) kiemCachDoc(k.cachDocKhong, id, false);
    for (const [v, dd] of Object.entries(k.giaTriDacBiet || {})) {
      kiemCachDoc(dd.cachDoc, `${id}:${v}`, true);
      if (typeof dd.cachViet !== 'string') add('gia-tri-dac-biet-thieu-cach-viet', `${id}:${v}`);
    }
    if (k.kieu === 'SO') {
      const he = (tv.heDonVi || {})[k.heDonVi];
      if (!he) add('so-thieu-he-don-vi', id);
      else if (!Object.prototype.hasOwnProperty.call(he, k.donViChuan)) add('so-don-vi-chuan-ngoai-he', `${id}:${k.donViChuan}`);
      if (k.heDonVi === 'dai' && !['mm', 'm'].includes(k.donViChuan)) add('so-dai-don-vi-chuan', `${id}:${k.donViChuan}`);
      for (const d of k.docThem || []) { try { new RegExp(d.mau, 'giu'); } catch { add('mau-khong-hop-le', `${id}:${d.mau}`); } if (he && !Object.prototype.hasOwnProperty.call(he, d.donVi)) add('so-doc-them-don-vi', id); }
    }
    if (k.kieu === 'CO_KHONG') {
      if (!Array.isArray(k.cachDoc?.phuDinh) || !k.cachDoc.phuDinh.length) add('co-khong-thieu-phu-dinh', id);
      if (typeof k.cachViet?.viPhuDinh !== 'string') add('co-khong-thieu-viet-phu-dinh', id);
    }
    if (k.kieu === 'LIET_KE' || k.kieu === 'CHAT_LIEU_THEO_VI_TRI') {
      const ds = k.giaTriHopLe;
      if (!Array.isArray(ds) || !ds.length) { add('liet-ke-rong', id); continue; }
      for (const v of ds) {
        const mt = k.moTaGiaTri?.[v];
        const coMau = mt && (mauCua(mt.cachDoc).length || (mt.dungMau && gates.chatLieuRegex(String(mt.dungMau).split('#')[1])));
        if (!mt || !mt.nhanVi || !mt.nhanEn || !mt.nhanZh || !coMau) add('liet-ke-thieu-mo-ta-gia-tri', `${id}:${v}`);
        if (mt?.cachDoc) kiemCachDoc(mt.cachDoc, `${id}:${v}`, false);
        if (mt?.dungMau && !gates.chatLieuRegex(String(mt.dungMau).split('#')[1])) add('chat-lieu-mau-khong-co', `${id}:${mt.dungMau}`);
      }
      for (const v of Object.keys(k.moTaGiaTri || {})) if (!ds.includes(v)) add('liet-ke-mo-ta-thua', `${id}:${v}`);
      if (k.kieu === 'LIET_KE') {
        for (const v of ds) {
          const mt = k.moTaGiaTri?.[v];
          if (!mt) continue;
          const coCV = Object.prototype.hasOwnProperty.call(mt, 'cachViet');
          if (!coCV && CUM_XAU.test(String(mt.nhanVi || ''))) add('liet-ke-thieu-cach-viet', `${id}:${v}`);
          if (coCV && mt.cachViet !== null && (typeof mt.cachViet !== 'string' || !mt.cachViet.trim() || CUM_XAU.test(mt.cachViet))) add('liet-ke-cach-viet-xau', `${id}:${v}`);
        }
      }
    }
    if (k.kieu === 'CHAT_LIEU_THEO_VI_TRI') {
      if (!Array.isArray(k.viTri) || !k.viTri.includes('CHINH')) add('chat-lieu-thieu-vi-tri-chinh', id);
      for (const vt of (k.viTri || []).filter((x) => x !== 'CHINH')) {
        const m = k.moTaViTri?.[vt];
        if (!m || !mauCua(m.cachDoc).length || typeof m.cachViet?.vi !== 'string' || !m.nhanVi || !m.nhanEn || !m.nhanZh) add('chat-lieu-vi-tri-thieu-mo-ta', `${id}:${vt}`);
        else kiemCachDoc(m.cachDoc, `${id}:${vt}`, true);
      }
    }
  }
  return loi;
}

// ── Siêu tập phiên bản ─────────────────────────────────────────────────────────────────────────────────────────
const DANH_SACH_CHUNG = ['phuDinhChung', 'phuDinhCaDoan', 'beNgoaiTruoc', 'khongPhaiPhuDinh', 'khangDinhXen'];
const BANG_CHUNG = ['heDonVi', 'bietDanhDonVi', 'soSanh'];
const giongHet = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/**
 * `moi` là siêu tập của `cu` (tu-vung@2 ⊇ tu-vung@1): mọi khoá cũ có trong bản mới và GIỐNG HỆT (so JSON, kể cả thứ tự trường),
 * khoá cũ giữ thứ tự ở đầu danh sách; mỗi danh sách mẫu chung của bản cũ là TIỀN TỐ của bản mới (chỉ được thêm ở cuối); mỗi mục
 * của bảng chung (heDonVi, bietDanhDonVi, soSanh) giữ nguyên. Trường mô tả (phienBan, ngay, ghiChu, chamDuyetDocLap…) bỏ qua.
 */
function kiemSieuTap(cu, moi) {
  const loi = [];
  const m = new Map((moi?.khoa || []).map((k) => [k.khoa, k]));
  (cu?.khoa || []).forEach((k, i) => {
    if (!m.has(k.khoa)) loi.push(`sieu-tap-thieu-khoa:${k.khoa}`);
    else if (!giongHet(k, m.get(k.khoa))) loi.push(`sieu-tap-khoa-lech:${k.khoa}`);
    else if (moi.khoa[i]?.khoa !== k.khoa) loi.push(`sieu-tap-thu-tu-khoa:${k.khoa}`);
  });
  for (const f of DANH_SACH_CHUNG) {
    const a = cu?.[f] || []; const b = moi?.[f] || [];
    if (!Array.isArray(b) || b.length < a.length || a.some((x, i) => !giongHet(x, b[i]))) loi.push(`sieu-tap-danh-sach:${f}`);
  }
  for (const f of BANG_CHUNG) {
    for (const [ten, v] of Object.entries(cu?.[f] || {})) if (!giongHet(v, moi?.[f]?.[ten])) loi.push(`sieu-tap-bang:${f}.${ten}`);
  }
  return loi;
}

// ── Bảng ánh xạ bộ từ vựng cũ ───────────────────────────────────────────────────────────────────────────────
const _src = new Map();
const docJson = (rel) => { if (!_src.has(rel)) _src.set(rel, JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), 'utf8'))); return _src.get(rel); };
let _factSoTay = null;
function factSoTay() {
  if (_factSoTay) return _factSoTay;
  _factSoTay = new Set();
  const dir = path.join(process.cwd(), 'data', 'so-tay');
  for (const f of fs.readdirSync(dir)) {
    if (!/^\d{4}\.json$/.test(f)) continue;
    let s; try { s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    for (const d of s.dieuKienVao || []) if (d.fact) _factSoTay.add(d.fact);
    for (const d of s.dong8 || []) for (const c of d.dieuKienSo || []) {
      if (c.fact) _factSoTay.add(c.fact);
      for (const alt of c.phuongAn || []) for (const cc of alt || []) if (cc.fact) _factSoTay.add(cc.fact);
    }
  }
  return _factSoTay;
}
/** Khoá cũ `<tệp>#<khoá>[=<giá trị>]` có thật ở nguồn không. */
function coKhoaCu(ref) {
  const [tep, rest] = ref.split('#');
  if (!tep || rest === undefined) return false;
  const [khoa, gt] = rest.split('=');
  try {
    if (tep === 'data/attributes.json') { const a = docJson(tep).attributes[khoa]; return Boolean(a) && (gt === undefined || (a.domain || []).includes(gt)); }
    if (tep === 'data/attribute-synonyms-zh.json') return Boolean(docJson(tep).keys[khoa]);
    if (tep === 'data/chapter-declaration-fields.json') return Boolean(docJson(tep).fields[khoa]);
    if (tep === 'data/attribute-frames.json') return Boolean(docJson(tep).truongBuoc12[khoa]);
    if (tep === 'data/parts-zh.json') return Boolean(docJson(tep).parts[khoa]);
    if (tep === 'data/heading-declaration-fields.json') return Object.values(docJson(tep).headings).some((h) => (h.required || []).includes(khoa) || (h.recommended || []).includes(khoa));
    if (/^data\/decision-tables\//.test(tep)) {
      const inp = (docJson(tep).inputs || []).find((i) => i.attribute === khoa);
      return Boolean(inp) && (gt === undefined || (inp.domain || []).includes(gt));
    }
    if (/^data\/taxonomy\/[a-z]+\.json$/.test(tep)) { const d = docJson(tep); return khoa === '*' || Object.keys(d).some((x) => x.toLowerCase() === khoa.toLowerCase()); }
    if (tep === 'lib/so-tay-gates.js') {
      if (gt !== undefined) return false;
      if (gates.chatLieuRegex(khoa)) return true;
      return new RegExp(`\\n\\s*${esc(khoa)}: \\{ ctx:`).test(fs.readFileSync(path.join(process.cwd(), tep), 'utf8'));
    }
    if (tep === 'data/so-tay/*.json') return factSoTay().has(khoa);
  } catch { return false; }
  return false;
}
function kiemAnhXaCu(ax, tv = taiTuVung()) {
  const loi = [];
  const ten = new Map(tv.khoa.map((k) => [k.khoa, k]));
  if (!Array.isArray(ax?.boTuVung) || ax.boTuVung.length !== 9) loi.push(`bo-tu-vung-khong-du-9:${ax?.boTuVung?.length}`);
  for (const b of ax?.boTuVung || []) for (const t of b.tep || []) {
    const p = t.replace(/\/\*\.json$/, '');
    if (!fs.existsSync(path.join(process.cwd(), p))) loi.push(`anh-xa-tep-khong-co:${t}`);
  }
  for (const [cu, moi] of Object.entries(ax?.anhXa || {})) {
    if (!ten.has(moi)) loi.push(`anh-xa-khoa-moi-khong-co:${cu}→${moi}`);
    if (!coKhoaCu(cu)) loi.push(`anh-xa-khoa-cu-khong-co:${cu}`);
  }
  for (const [cu, moi] of Object.entries(ax?.anhXaGiaTri || {})) {
    const [khoa, gt] = String(moi).split('=');
    const k = ten.get(khoa);
    if (!k) { loi.push(`anh-xa-khoa-moi-khong-co:${cu}→${moi}`); continue; }
    const v = k.kieu === 'CO_KHONG' ? gt === 'true' : (k.kieu === 'CHAT_LIEU_THEO_VI_TRI' ? [{ viTri: 'CHINH', chatLieu: gt }] : gt);
    if (k.kieu === 'CO_KHONG' && !['true', 'false'].includes(gt)) loi.push(`anh-xa-gia-tri-khong-hop-le:${cu}→${moi}`);
    else if (kiemGiaTriTheo(k, v).trangThai !== 'DA_CO') loi.push(`anh-xa-gia-tri-khong-hop-le:${cu}→${moi}`);
    if (!coKhoaCu(cu)) loi.push(`anh-xa-khoa-cu-khong-co:${cu}`);
  }
  return loi;
}

// ── Độ phủ dữ kiện quyết định của bộ đề ─────────────────────────────────────────────────────────────────────
/**
 * Mọi dữ kiện quyết định (ca.duKienQuyetDinh[i]) của bộ đề phải ánh xạ được về ≥ 1 khoá tu-vung@1 với giá trị đúng kiểu.
 * anhXaBoDe.anhXa: { "<caId>#<i>": [{ khoa, giaTri, op?, donVi? , viTri? }] }. Chỉ đọc tên dữ kiện, không đọc đáp án.
 */
function doPhuBoDe(boDe, anhXaBoDe, tv = taiTuVung()) {
  const ten = new Map(tv.khoa.map((k) => [k.khoa, k]));
  const ids = new Map();
  for (const ca of boDe?.ca || []) (ca.duKienQuyetDinh || []).forEach((d, i) => ids.set(`${ca.id}#${i}`, d));
  const ax = anhXaBoDe?.anhXa || {};
  const thieu = []; const loi = []; const theoKhoa = {}; const docThu = { thu: 0, khop: 0 };
  let daAnhXa = 0;
  for (const [id, d] of ids) {
    const ds = ax[id];
    if (!Array.isArray(ds) || !ds.length) { thieu.push(id); continue; }
    let ok = true;
    for (const e of ds) {
      const k = ten.get(e?.khoa);
      if (!k) { loi.push(`${id}:khoa-khong-co:${e?.khoa}`); ok = false; continue; }
      if (k.kieu === 'SO') {
        if (e.op !== undefined && !OP_SO.includes(e.op)) { loi.push(`${id}:op-khong-hop-le:${e.op}`); ok = false; }
        if (kiemGiaTriTheo(k, e.giaTri).trangThai !== 'DA_CO') { loi.push(`${id}:gia-tri-khong-hop-le:${e.khoa}`); ok = false; }
        if (!heSo(k, e.donVi, tv)) { loi.push(`${id}:don-vi-lech-he:${e.khoa}:${e.donVi}`); ok = false; }
      } else {
        if (e.op !== undefined && !OP_KHAC.includes(e.op)) { loi.push(`${id}:op-khong-hop-le:${e.op}`); ok = false; }
        if (kiemGiaTriTheo(k, e.giaTri).trangThai !== 'DA_CO') { loi.push(`${id}:gia-tri-khong-hop-le:${e.khoa}:${JSON.stringify(e.giaTri)}`); ok = false; }
      }
      theoKhoa[e.khoa] = (theoKhoa[e.khoa] || 0) + 1;
      if (ok && ['SO', 'CO_KHONG', 'LIET_KE'].includes(k.kieu) && (!e.op || ['=', 'LA'].includes(e.op))) {
        // đọc thử: máy đọc chữ dữ kiện của bộ đề có ra đúng giá trị ánh xạ không (chỉ báo cáo, không chặn)
        docThu.thu += 1;
        try {
          const r = docGiaTri(e.khoa, d.duKien);
          const want = k.kieu === 'SO' ? quyDoi(k, Array.isArray(e.giaTri) ? e.giaTri[0] : e.giaTri, e.donVi, tv) : e.giaTri;
          const got = Array.isArray(r.giaTri) ? r.giaTri[0] : r.giaTri;
          if (r.trangThai === 'DA_CO' && got === want) docThu.khop += 1;
        } catch { /* khoá giả trong test */ }
      }
    }
    if (ok) daAnhXa += 1;
  }
  for (const id of Object.keys(ax)) if (!ids.has(id)) loi.push(`${id}:khong-co-trong-bo-de`);
  return { tong: ids.size, daAnhXa, thieu, loi, theoKhoa, docThu };
}

module.exports = {
  TEP_TU_VUNG, PHIEN_BAN_KHOA_BENCH, KIEU, DANH_MUC_VIET_TAT,
  taiTuVung, layKhoa, phienBan, sha256Tep, kiemSieuTap,
  docGiaTri, docTenLoaiDayDu, kiemGiaTri, vietCum, cauHoiCho, quyDoi: (khoa, so, u) => quyDoi(layKhoa(khoa), so, u), chuanDonVi,
  kiemTuVung, kiemAnhXaCu, doPhuBoDe, coKhoaCu,
};
