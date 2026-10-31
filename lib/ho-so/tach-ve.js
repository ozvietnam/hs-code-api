/**
 * lib/ho-so/tach-ve.js — tách chữ biểu thuế của MỘT mục (dòng 8 số / tiêu đề có tên / tầng không mã) thành VẾ, và tìm chỗ
 * mỗi điều kiện có kiểu "đọc tới" trong chữ (neo). Phục vụ cổng 5 `cong5-ve` của lib/ho-so/cong-ranh-gioi.js (#577).
 *
 * Vì sao (soát L1-4c đợt 2, #659): 8,8% mục sai, gần hết một kiểu mà cổng 0–3 không thấy — PHẠM VI của vế bổ nghĩa:
 *   - bỏ vế MỞ ("… và các loại tương tự", "và bộ phận của chúng") ⇒ điều kiện HẸP hơn chữ;
 *   - bỏ vế GIỚI HẠN ("không nhấp nháy", "có thể thao tác …") hoặc tách định ngữ chung khỏi danh từ đầu ⇒ RỘNG hơn chữ.
 *
 * Mỗi vế (tách bằng ";" ngoài ngoặc) là một dãy MỆNH ĐỀ có loại:
 *   DAU       danh từ đầu (cụm trước dấu hiệu bổ nghĩa đầu tiên) — không đòi phủ (thường lặp tên phân nhóm/tầng cha);
 *             `lienHop` = các danh từ đầu liên hợp ("A và B", "A, B hoặc C").
 *   GIOI_HAN  vế giới hạn: "dùng cho/sử dụng/để/cho …", "không …", "có thể …", "bằng …", "của …" (ngay sau danh từ đầu),
 *             "được …", "trừ …", biên số ("có đường kính … trên 50 mm"), "(trừ …)", thuộc tính sau dấu phẩy ("…, hoàn chỉnh"),
 *             và phần sau "Loại …" ("Loại chưa ghi" ⇒ "chưa ghi").
 *   MO        vế mở: "và/hoặc (các) … tương tự", "và (các) bộ phận/phụ kiện của chúng", "và các loại … khác"; `ds` = chỉ số
 *             mệnh đề đứng ngay trước (danh sách mà vế mở nối dài).
 *   PHU       ngoặc chú thích ("(corset)", "(LPG)", "(bao gồm cả lốp)") — không đòi phủ.
 *   CON_LAI   "Loại khác," đầu vế — phần còn lại, luật đi của cây đã lo.
 *
 * Chữ VI + EN lấy NGUYÊN VĂN từ biểu thuế đã trích data/bieu-thue/<bản mới nhất>/ (bieu-chinh + tieu-de, kể cả tầng không mã;
 * tên tiêu đề có tên từ ten-nut.json). Tất định, chỉ đọc, không gọi LLM.
 */
const fs = require('fs');
const zlib = require('zlib');
const T = require('../hs-tree');
const TV = require('../tu-vung');
const DK = require('../dieu-kien-so');
const { dataReadPath } = require('../data-paths');

// ── Chữ biểu VI + EN ──────────────────────────────────────────────────────────────────────────────────────────
let cache = null;
const docJsonl = (p) => zlib.gunzipSync(fs.readFileSync(p)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
function nap() {
  if (cache) return cache;
  cache = { ver: null, ma: new Map(), theoR: new Map(), tenNut: {} };
  try {
    const goc = dataReadPath('bieu-thue');
    const ver = fs.readdirSync(goc).filter((d) => /^\d{4}\.\d{2}\.\d{2}$/.test(d)
      && ['bieu-chinh.jsonl.gz', 'tieu-de.jsonl.gz', 'ten-nut.json'].every((f) => fs.existsSync(dataReadPath('bieu-thue', d, f)))).sort().pop();
    if (!ver) return cache;
    const bc = docJsonl(dataReadPath('bieu-thue', ver, 'bieu-chinh.jsonl.gz'));
    const dem = new Map();
    for (const x of bc) if (String(x.maChuan || '').length === 8) dem.set(x.sheet, (dem.get(x.sheet) || 0) + 1);
    const sheet = [...dem.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const ma = new Map();
    for (const x of bc) if (x.sheet === sheet && x.maChuan && !ma.has(String(x.maChuan))) ma.set(String(x.maChuan), { vi: x.moTaVi || '', en: x.moTaEn || '' });
    const theoR = new Map();
    for (const x of docJsonl(dataReadPath('bieu-thue', ver, 'tieu-de.jsonl.gz'))) if (x.sheet === sheet) theoR.set(Number(x.r), { vi: x.chu || x.nguyenVan || '', en: x.chuEn || '' });
    const tenNut = JSON.parse(fs.readFileSync(dataReadPath('bieu-thue', ver, 'ten-nut.json'), 'utf8')).ten || {};
    cache = { ver, ma, theoR, tenNut };
  } catch { /* thiếu biểu thuế đã trích ⇒ chữ rỗng, cổng 5 cảnh báo cong5-khong-co-chu */ }
  return cache;
}
/** Chữ biểu nguyên văn của một mã/id: { vi, en, nguon }. Rỗng khi không tìm thấy. */
function chuBieu(id) {
  const ma = T.chuanMa(id);
  const c = nap();
  if (T.laIdTang(ma)) {
    const n = T.nodeOf(ma);
    const r = Number(n?.r ?? String(ma).split('~r')[1]);
    const x = c.theoR.get(r);
    return { vi: x?.vi || n?.tenViNguyenVan || n?.tenVi || '', en: x?.en || n?.tenEn || '', nguon: `bieu-thue@${c.ver}#r${r}` };
  }
  // Dòng có mã của biểu (8/6/4 số) trước; tên tiêu đề không mã (7/5 số) từ ten-nut.json.
  if (c.ma.has(ma)) return { ...c.ma.get(ma), nguon: `bieu-thue@${c.ver}#${ma}` };
  const tn = c.tenNut[ma];
  if (tn && (tn.tenVi || tn.tenEn)) {
    const x = Number.isFinite(Number(tn.r)) ? c.theoR.get(Number(tn.r)) : null;
    return { vi: tn.tenVi || x?.vi || '', en: tn.tenEn || x?.en || '', nguon: `bieu-thue@${c.ver}#r${tn.r}` };
  }
  const n = T.nodeOf(ma);
  return { vi: n?.tenVi || '', en: n?.tenEn || '', nguon: n ? 'cay' : null };
}

// ── Chuẩn hoá + mặt nạ ngoặc ───────────────────────────────────────────────────────────────────────────────────
const CHU = '[\\p{L}\\p{M}\\p{N}]';
/** Bọc ranh giới chữ Unicode (`\b` của JS chỉ biết ASCII). */
const W = (src, flags = 'giu') => new RegExp(`(?<!${CHU})(?:${src})(?!${CHU})`, flags);
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
/** NFC, bỏ "(SEN)", gạch đầu dòng, ":" cuối, gộp khoảng trắng. */
function chuan(s) {
  return String(s || '').normalize('NFC').replace(/\(\s*SEN\s*\)/gi, ' ').replace(/^[\s\-–—]+/, '').replace(/\s+/g, ' ')
    .replace(/[\s:：;,]+$/, '').trim();
}
const MASK = '\u0001';
/** Khoảng ngoặc cấp ngoài cùng [bd, kt) + chuỗi đã che ngoặc (cùng độ dài). */
function cheNgoac(t) {
  const ds = []; let sau = 0; let bd = -1;
  for (let i = 0; i < t.length; i += 1) {
    if (t[i] === '(') { if (sau === 0) bd = i; sau += 1; } else if (t[i] === ')' && sau > 0) { sau -= 1; if (sau === 0) ds.push([bd, i + 1]); }
  }
  let m = t;
  for (const [a, b] of ds) m = m.slice(0, a) + MASK.repeat(b - a) + m.slice(b);
  return { ngoac: ds, m };
}

// ── Dấu hiệu bổ nghĩa (VI) ─────────────────────────────────────────────────────────────────────────────────────
// Từ đo của khoá SO tu-vung@1 (tiếng Việt, cụm ≥ 2 âm tiết để không bắt nhầm "cao su", "phi kim").
const TU_DO = ['đường kính trong', 'đường kính ngoài', 'đường kính', 'dòng điện', 'điện áp', 'công suất', 'lưu lượng',
  'dung tích xi lanh', 'dung tích xy lanh', 'dung tích', 'khối lượng', 'trọng lượng', 'chiều cao', 'chiều dài', 'chiều rộng',
  'kích thước', 'tần số', 'độ dày', 'chiều dày', 'tải trọng', 'sức chứa', 'áp suất', 'nhiệt độ'];
const BIEN = '(?:trên|dưới|không quá|không vượt quá|tối đa|tối thiểu|từ)\\s+\\d';
/**
 * Mỗi dấu hiệu: loai (nhóm vế), src (regex, bọc ranh giới chữ), mạnh/yếu. Luật cắt vế (xem catVe):
 *   chiDau   — chỉ cắt khi vế đang mở là danh từ đầu ("của", "thuộc", "có" thường): trong vế công dụng nó là của tân ngữ
 *              ("dùng cho động cơ xe của Chương 87", "dùng cho xe có động cơ thuộc nhóm 87.02").
 *   yeu      — "cho", "để": không cắt vế công dụng đang mở ("dùng để nối cho dây dẫn và cáp").
 */
const DAU_HIEU = [
  { loai: 'DUNG', src: 'chỉ dùng hoặc chủ yếu dùng cho|chuyên dùng cho|phù hợp dùng cho|phù hợp dùng trong|phù hợp để|phù hợp với|phù hợp|loại dùng cho|loại sử dụng cho|loại sử dụng để|loại sử dụng trong|dùng cho|dùng để|dùng trong|dùng làm|sử dụng cho|sử dụng để|sử dụng trong|sử dụng ở|sử dụng khi|dùng khi|được sử dụng|để lắp ghép|lắp ghép với|thích hợp dùng cho|thích hợp' },
  { loai: 'DUNG', src: 'để|cho(?!\\s+phép)', yeu: true },
  // Từ đo chỉ là dấu hiệu khi có số theo sau trong vế ("dòng điện cao" không phải biên số).
  // "có dải tần số từ 300 Hz đến 3.400 Hz" (85181011, vòng 4): "dải" + từ đo là MỘT vế biên số, không cắt "có dải" riêng.
  { loai: 'SO', src: `(?:(?:loại\\s+)?(?:có|với)\\s+)?(?:dải\\s+)?(?:${TU_DO.map(esc).join('|')})(?=[^;]{0,60}?\\d)` },
  { loai: 'SO', src: BIEN, bien: true },
  { loai: 'BANG', src: 'bằng(?!\\s+cách)' },
  { loai: 'TRU', src: 'ngoại trừ|loại trừ|trừ|không kể' },
  { loai: 'KE_CA', src: 'kể cả|bao gồm cả|bao gồm|gồm cả' },
  // "gồm …" (consisting of) là GIỚI HẠN — kể cả khi đứng trong "kể cả …" (8536505 vế 2: "kể cả công tắc bảo vệ quá nhiệt điện tử
  // gồm một tranzito và một chip logic" — chữ Anh "including …, consisting of a transistor and a logic chip"). "bao gồm",
  // "gồm cả" = kể cả (PHU).
  { loai: 'GOM', src: '(?<!bao\\s)gồm(?!\\s+cả)' },
  { loai: 'CO_THE', src: 'có thể' },
  { loai: 'KHONG', src: 'không(?!\\s+(?:quá|vượt quá|kể|có\\s|phải))|chưa' },
  { loai: 'DUOC', src: 'được(?=\\s+[\\p{L}])' },
  { loai: 'CHUA', src: 'chứa' },
  { loai: 'CUA', src: 'của(?!\\s+(?:chúng|nó))', chiDau: true },
  { loai: 'THUOC', src: 'thuộc', chiDau: true },
  { loai: 'CO', src: '(?<!(?:không|khi)\\s)có(?!\\s+(?:hoặc|thể))', chiDau: true },
];
const RE_DAU_HIEU = DAU_HIEU.map((d) => ({ ...d, re: W(d.src) }));
// Vế mở (nối dài danh sách đứng trước).
const MAU_MO = [
  '(?:,\\s*)?(?:và|hoặc)\\s+(?:[\\p{L}]+\\s+){0,4}?tương\\s+tự',
  '(?:,\\s*)?(?:và|hoặc)\\s+(?:các\\s+)?(?:bộ phận|phụ kiện|phụ tùng|linh kiện)(?:\\s+(?:và|hoặc)\\s+(?:các\\s+)?(?:bộ phận|phụ kiện|phụ tùng|linh kiện))?\\s+của\\s+(?:chúng|nó)',
  '(?:,\\s*)?(?:và|hoặc)\\s+(?:các\\s+)?loại\\s+(?:[\\p{L}]+\\s+){0,4}?khác',
];
const RE_MO = W(MAU_MO.join('|'));
// Thuộc tính sau dấu phẩy ("…, hoàn chỉnh"): danh sách ngắn, tường minh (chữ đọc của tu-vung bắt nhầm danh từ như "đầu nối").
const THUOC_TINH = ['chưa hoàn chỉnh', 'hoàn chỉnh', 'nguyên chiếc', 'chưa lắp ráp', 'đã lắp ráp', 'đã ghi', 'chưa ghi',
  'đã qua sử dụng', 'mới', 'đã hoặc chưa', 'có hoặc không'];
const RE_THUOC_TINH = new RegExp(`,\\s*(?=(?:${THUOC_TINH.map(esc).join('|')})(?!${CHU}))`, 'giu');
// Cụm chứa "không"/"có" mà KHÔNG phải dấu hiệu bổ nghĩa ("chân không", "thép không gỉ", "lốp không săm"): che trước khi dò.
let reGiaDauHieu = null;
function giaDauHieu() {
  if (reGiaDauHieu) return reGiaDauHieu;
  const ds = [...(TV.taiTuVung().khongPhaiPhuDinh || []), 'chân không', 'không khí', 'không gian', 'không dây', 'không gỉ',
    'không rỉ', 'không săm', 'không trục', 'không chổi than', 'không người lái', 'có hoặc không có', 'đã hoặc chưa'];
  const ok = ds.filter((x) => /^[\p{L}\p{M}\s]+$/u.test(x));
  reGiaDauHieu = W(ok.map(esc).join('|'));
  return reGiaDauHieu;
}
const cheGia = (m) => m.replace(giaDauHieu(), (x) => x.replace(/[^\s]/g, '\u0002'));

const catDuoi = (t, bd, kt) => { // bỏ ", và/hoặc" + dấu câu ở hai đầu một mệnh đề
  let a = bd; let b = kt;
  while (a < b && /[\s,;]/.test(t[a])) a += 1;
  for (;;) {
    const s = t.slice(a, b);
    const m = s.match(/(?:[\s,;]+(?:và|hoặc|nhưng))+[\s,;]*$|[\s,;]+$/u);
    if (!m || !m[0]) break;
    b = a + m.index;
  }
  return [a, b];
};
const amTiet = (s) => String(s || '').trim().split(/\s+/).filter(Boolean);

/** Danh từ đầu liên hợp: tách cụm đầu (đã che ngoặc) ở ",", "và", "hoặc" — trừ "có hoặc không có", "và/hoặc". */
function lienHopCua(t, m, bd, kt) {
  const s = m.slice(bd, kt);
  const out = []; let dau = 0;
  const re = /\s*,\s*(?:(?:và|hoặc)\s+)?|\s+(?:và|hoặc)\s+/gu;
  for (const x of s.matchAll(re)) {
    const truoc = s.slice(Math.max(0, x.index - 3), x.index);
    if (/có$/u.test(truoc) && /hoặc/.test(x[0]) && /^\s*không/u.test(s.slice(x.index + x[0].length))) continue;
    out.push([dau, x.index]); dau = x.index + x[0].length;
  }
  out.push([dau, s.length]);
  return out.map(([a, b]) => catDuoi(t, bd + a, bd + b)).filter(([a, b]) => b > a).map(([a, b]) => ({ chu: t.slice(a, b), bd: a, kt: b }));
}

/**
 * Tách một vế [bd, kt) của chữ t (m: chữ đã che ngoặc) thành mệnh đề.
 * @returns {{loai, kieu, chu, bd, kt, dauHieu?}[]}
 */
function catVe(t, m, bd, kt, ngoac, { boNghiaChung = false } = {}) {
  const out = [];
  let a = bd;
  const lo = m.toLowerCase();
  // "Loại khác," / "Khác," đầu vế
  const cl = lo.slice(a, kt).match(/^\s*(?:loại khác|khác)\s*,\s*/u);
  if (cl) { out.push({ loai: 'CON_LAI', kieu: 'CON_LAI', chu: t.slice(a, a + cl[0].length).replace(/[\s,]+$/, ''), bd: a, kt: a + cl[0].length }); a += cl[0].length; }
  // "Loại …" / "Của loại …" ⇒ phần sau là giới hạn
  let locLoai = false;
  const fl = lo.slice(a, kt).match(/^\s*(?:của\s+)?loại\s+(?!khác(?![\p{L}]))/u);
  if (fl) { locLoai = true; a += fl[0].length; }
  // Ứng viên cắt: dấu hiệu + thuộc tính sau dấu phẩy + vế mở.
  const ung = [];
  const doan = cheGia(m.slice(0, kt));
  for (const d of RE_DAU_HIEU) {
    d.re.lastIndex = a;
    for (const x of doan.matchAll(d.re)) { if (x.index < a) continue; ung.push({ p: x.index, e: x.index + x[0].length, d }); }
  }
  RE_THUOC_TINH.lastIndex = 0;
  for (const x of doan.matchAll(RE_THUOC_TINH)) if (x.index >= a) ung.push({ p: x.index + x[0].length, e: x.index + x[0].length, d: { loai: 'THUOC_TINH' } });
  const mo = [];
  RE_MO.lastIndex = 0;
  for (const x of m.slice(0, kt).matchAll(RE_MO)) if (x.index >= a) mo.push([x.index, x.index + x[0].length]);
  ung.sort((x, y) => x.p - y.p || (y.e - y.p) - (x.e - x.p));
  // Bỏ ứng viên nằm trong vế mở, hoặc chồng lên ứng viên dài hơn đã nhận.
  const trongMo = (p) => mo.some(([x, y]) => p >= x && p < y);
  let cur = { kieu: locLoai ? 'DAU_LOAI' : 'DAU', bd: a, dauHieu: '' };
  let hetTruoc = -1;
  const dong = (p) => {
    const [x, y] = catDuoi(t, cur.bd, p);
    if (y <= x) return;
    // "kể cả …" (bao gồm thêm) và "bằng mọi loại vật liệu" (lượng từ phổ quát) không giới hạn ⇒ PHU.
    const phoQuat = /^\s*(?:mọi|tất cả|bất kỳ)(?![\p{L}])/iu.test(t.slice(x + cur.dauHieu.length, y));
    const loai = cur.kieu === 'DAU' ? 'DAU' : (cur.kieu === 'KE_CA' || phoQuat) ? 'PHU' : 'GIOI_HAN';
    out.push({ loai, kieu: cur.kieu === 'DAU_LOAI' ? 'LOAI' : cur.kieu, chu: t.slice(x, y), bd: x, kt: y, dauHieu: cur.dauHieu });
  };
  const loiCot = (p) => lo.slice(cur.bd, p).replace(new RegExp(`^\\s*${esc(cur.dauHieu.toLowerCase())}`, 'u'), '').replace(/[\s,;\u0001]/g, '').length > 0;
  const moDaDung = new Set();
  const xuLyMo = (p) => { // vế mở bắt đầu trước p chưa xử lý
    for (const [x, y] of mo) {
      if (moDaDung.has(x) || x >= p) continue;
      moDaDung.add(x);
      const kieuTruoc = cur.kieu; const dhTruoc = cur.dauHieu;
      dong(x);
      const [u, v] = catDuoi(t, x, y);
      out.push({ loai: 'MO', kieu: 'MO', chu: t.slice(u, v), bd: u, kt: v, ds: out.length - 1 });
      cur = { kieu: kieuTruoc, bd: y, dauHieu: '', sauMo: true };
      if (cur.kieu === 'DAU') cur.kieu = 'DAU_SAU'; // phần còn lại sau vế mở trong cụm đầu
    }
  };
  for (const u of ung) {
    if (u.p < hetTruoc || trongMo(u.p)) continue;
    xuLyMo(u.p);
    const d = u.d;
    const dangDau = cur.kieu === 'DAU' || cur.kieu === 'DAU_LOAI' || cur.kieu === 'DAU_SAU';
    let cat = true;
    if (d.chiDau && !dangDau) cat = false;
    if (d.yeu && cur.kieu === 'DUNG') cat = false;
    if (d.bien && cur.kieu === 'SO') cat = false;
    if (d.loai === 'KHONG' && ['DUNG', 'CUA', 'THUOC', 'SO'].includes(cur.kieu) && !/,\s*$/.test(m.slice(cur.bd, u.p))) cat = false;
    if (d.loai === 'CO_THE' && /hoặc\s+$/u.test(lo.slice(Math.max(cur.bd, u.p - 8), u.p))) cat = false;
    if (d.loai === 'SO' && !d.bien && cur.kieu === 'SO' && !loiCot(u.p)) cat = false;
    if (!loiCot(u.p) && cur.sauMo) { cur = { kieu: d.loai, bd: u.p, dauHieu: m.slice(u.p, u.e) }; hetTruoc = u.e; continue; }
    if (cat && u.p > cur.bd && !loiCot(u.p) && !dangDau) { // vế đang mở chỉ có dấu hiệu ("Phù hợp dùng trong …")
      cat = false;
      if (d.loai === 'SO') cur.kieu = 'SO'; // "dùng cho điện áp không quá …" là biên số
    }
    if (!cat) { hetTruoc = Math.max(hetTruoc, u.e); continue; }
    if (u.p > cur.bd) dong(u.p);
    cur = { kieu: d.loai, bd: u.p, dauHieu: m.slice(u.p, u.e) };
    hetTruoc = u.e;
  }
  xuLyMo(kt + 1);
  dong(kt);
  for (const x of out) if (x.kieu === 'DAU_SAU') { x.kieu = 'DAU'; x.loai = 'DAU'; }
  // Hai bổ ngữ liên hợp chung MỘT bổ ngữ đích (vòng 4, 39231020 "có hình dạng đặc biệt hoặc thích hợp để vận chuyển …" — chữ
  // Anh "specially shaped or fitted for the conveyance …"): chỉ gộp khi chữ Anh cùng dòng xác nhận cấu trúc (boNghiaChung) và
  // vế sau mở bằng "thích hợp/phù hợp" ngay sau "hoặc/và". Không chắc ⇒ giữ tách (vế giới hạn bị bỏ sót tệ hơn cờ oan).
  if (boNghiaChung) {
    for (let i = out.length - 2; i >= 0; i -= 1) {
      const p = out[i]; const q = out[i + 1];
      if (p.loai !== 'GIOI_HAN' || q.loai !== 'GIOI_HAN' || !['CO', 'DUOC'].includes(p.kieu) || q.kieu !== 'DUNG') continue;
      if (!/^(?:thích|phù)\s+hợp/iu.test(q.dauHieu || '') || !/^\s*(?:hoặc|và)\s+$/u.test(t.slice(p.kt, q.bd))) continue;
      out.splice(i, 2, { ...p, kieu: 'DUNG', chu: t.slice(p.bd, q.kt), kt: q.kt });
    }
  }
  // Ngoặc trong vế
  for (const [x, y] of ngoac) {
    if (x < bd || y > kt) continue;
    const trong = t.slice(x + 1, y - 1).trim();
    const gh = /^(?:trừ|ngoại trừ|loại trừ|không\s)/iu.test(trong);
    out.push({ loai: gh ? 'GIOI_HAN' : 'PHU', kieu: gh ? 'TRU' : 'NGOAC', chu: t.slice(x, y), bd: x, kt: y, ngoac: true });
  }
  out.sort((p, q) => p.bd - q.bd || (q.kt - q.bd) - (p.kt - p.bd));
  // ds của vế mở: chỉ số mệnh đề không phải ngoặc đứng ngay trước
  out.forEach((x, i) => { if (x.loai === 'MO') { let j = i - 1; while (j >= 0 && (out[j].ngoac || out[j].loai === 'MO')) j -= 1; x.ds = j; } });
  return out;
}

/**
 * Tách chữ biểu thành vế + mệnh đề.
 * @returns {{chu: string, ve: {chu, bd, kt, menhDe: object[], lienHop: object[]}[], en: object|null}}
 */
function tachVe(vi, en = null) {
  const t = chuan(vi);
  const { ngoac, m } = cheNgoac(t);
  // Chữ Anh có "<…ed/…able> or/and <…ed/…able> for/to" (hai bổ ngữ chung một đích) — điều kiện gộp ở catVe.
  const boNghiaChung = /(?<![\p{L}])\p{L}+(?:ed|able)\s+(?:or|and)\s+\p{L}+(?:ed|able)\s+(?:for|to)(?![\p{L}])/iu.test(String(en || ''));
  const ve = [];
  let a = 0;
  const cat = [...m.matchAll(/;/g)].map((x) => x.index);
  for (const p of [...cat, t.length]) {
    const [x, y] = catDuoi(t, a, p);
    if (y > x) {
      const md = catVe(t, m, x, y, ngoac, { boNghiaChung });
      const dau = md.find((q) => q.loai === 'DAU' && !q.ngoac);
      const lienHop = dau && dau.bd === x ? lienHopCua(t, m, dau.bd, dau.kt) : [];
      ve.push({ chu: t.slice(x, y), bd: x, kt: y, menhDe: md, lienHop });
    }
    a = p + 1;
  }
  return { chu: t, ve, en: en ? tachVeEn(en) : null };
}

// ── EN: chỉ dùng để đối chiếu cấu trúc liên hợp + định ngữ (cong5-dinh-ngu-tach) ──────────────────────────────────
const RE_EN_DAU_HIEU = /(?<![\p{L}])(?:for|of|with|without|used|suitable|designed|not|other than|excluding|exceeding|containing|consisting|incorporating|capable|having|recorded|whether|by|in|on|at)(?![\p{L}])/iu;
function tachVeEn(en) {
  const t = String(en || '').normalize('NFC').replace(/^[\s\-–—]+/, '').replace(/\s+/g, ' ').replace(/[\s:;,.]+$/, '').trim();
  const { m } = cheNgoac(t);
  const ve = [];
  let a = 0;
  for (const p of [...[...m.matchAll(/;/g)].map((x) => x.index), t.length]) {
    let s = m.slice(a, p).trim().replace(/^other\s*,\s*/i, '');
    s = s.replace(new RegExp(MASK, 'g'), ' ').replace(/\s+/g, ' ').trim();
    const x = s.match(RE_EN_DAU_HIEU);
    const dau = (x ? s.slice(0, x.index) : s).trim();
    const lienHop = dau ? dau.split(/\s*,\s*(?:(?:and|or)\s+)?|\s+(?:and|or)\s+/i).filter((q) => q.trim()) : [];
    ve.push({ chu: s, dau, lienHop, hauNgu: Boolean(x && s.slice(x.index).trim()), truocDau: Boolean(x && x.index === 0) });
    a = p + 1;
  }
  return { chu: t, ve };
}

// ── EN: bằng chứng cấu trúc cho liệt kê trong MỘT giá trị chữ tự do (vòng 5, cong3-liet-ke-trong-mot-chuoi) ─────────
// Cùng cách với boNghiaChung ở trên: chỉ nhận khi chữ Anh cùng dòng xác nhận cấu trúc; không chắc ⇒ máy coi là liệt kê (báo).
const MUC_EN = '(?:(?!\\b(?:and|or)\\b)[^,;()])+';
const enChuan = (en) => String(en || '').normalize('NFC').replace(/\s+/g, ' ').trim();
/**
 * Chữ Anh có liệt kê LIÊN HỢP đúng k mục làm bổ ngữ của giới từ — "for transport, handling and storage" (853710 .30),
 * "of instructions, data, sound and image" (85235130): một hàng làm/chứa đủ các việc đó, không phải danh sách hàng thay thế.
 * Mục đầu không có dấu phẩy, mục không chứa and/or, mục cuối nối "and" ⇒ đúng k mục (k ≥ 3).
 */
function enLienHopSauGioiTu(en, k) {
  if (!Number.isInteger(k) || k < 3) return false;
  const re = new RegExp(`(?<![\\p{L}])(?:for|of)\\s+${MUC_EN}(?:,\\s*${MUC_EN}){${k - 2}},?\\s+and\\s+${MUC_EN}`, 'iu');
  return re.test(enChuan(en));
}
/**
 * Dấu phẩy có ở cả chữ Anh mà chữ Anh KHÔNG liệt kê (không and/or) — "Slugs, round," (76169930): dấu phẩy thuộc tính của một
 * tên hàng cố định, không phải liệt kê hàng thay thế.
 */
function enPhayThuocTinh(en, soPhay) {
  const t = enChuan(en);
  return Boolean(t) && !/\b(?:and|or)\b/i.test(t) && (t.match(/,/g) || []).length >= soPhay;
}

// ── Neo: chỗ mỗi điều kiện đọc tới trong chữ ────────────────────────────────────────────────────────────────────
const khoaCua = (f) => { try { return TV.layKhoa(f); } catch { return null; } };
function moiKhop(re, t) { const out = []; if (!re) return out; re.lastIndex = 0; for (const x of t.matchAll(re)) if (x[0]) out.push([x.index, x.index + x[0].length]); return out; }
/**
 * Mẫu cách đọc của từ vựng — CÙNG cách đọc với cổng 3 (lib/dieu-kien-so.js#kiemDieuKien: coMau(mauCua(cachDoc))): mọi ngôn
 * ngữ vi + en + zh (#681: "120VDC" chỉ có ở cachDoc.en), ranh giới CHỮ không tính chữ số ("120VDC" ⇒ "VDC"; "ADC" không là
 * "DC"), mẫu Hán không bọc.
 */
const CJK = /[\u3400-\u9fff]/u;
const CHU_TV = '[\\p{L}\\p{M}]';
const reDs = (ds) => {
  const ok = (ds || []).filter((s) => { try { new RegExp(s, 'u'); return true; } catch { return false; } });
  return ok.length ? new RegExp(ok.map((s) => (CJK.test(s) ? `(?:${s})` : `(?<!${CHU_TV})(?:${s})(?!${CHU_TV})`)).join('|'), 'giu') : null;
};
const docDu = (cd) => DK.mauCua(cd);
/**
 * Neo số viết bằng chữ / phân số (khoá `demSo`, `docPhanSo` của tu-vung@2 — "hai sợi hoặc hơn", "1/10 đường kính"): dùng CHÍNH
 * bộ đọc cổng 3 dùng (lib/dieu-kien-so.js#nguongDocDuoc → tu-vung docGiaTri) — đọc được đúng giá trị (quy đổi cùng đơn vị) và op
 * không trái ⇒ neo vào bằng chứng của lần đọc. Đọc lần lượt từng đoạn còn lại của chữ (một câu có thể có nhiều số).
 */
function neoSoDocDuoc(c, k, t) {
  const out = [];
  if (!k.demSo && !k.docPhanSo) return out;
  let muon = null; try { muon = TV.quyDoi(c.fact, c.value, c.donVi); } catch { muon = null; }
  if (muon == null) return out;
  let tu = 0;
  for (let lan = 0; lan < 20 && tu < t.length; lan += 1) {
    const doan = t.slice(tu);
    let r = null; try { r = TV.docGiaTri(c.fact, doan); } catch { r = null; }
    if (!r || r.trangThai !== 'DA_CO' || !r.bangChung) break;
    const i = doan.indexOf(r.bangChung);
    if (i < 0) break;
    if (typeof r.giaTri === 'number' && Math.abs(r.giaTri - muon) < 1e-9 && (!r.op || r.op === c.op)) out.push([tu + i, tu + i + r.bangChung.length]);
    tu += i + Math.max(1, r.bangChung.length);
  }
  return out;
}
/** Số trong chữ kiểu Việt ("8.000" = 8000, "22,38" = 22.38). */
function soTrongChu(t) {
  const out = [];
  for (const x of t.matchAll(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?/g)) {
    const s = x[0];
    const v = /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(s) ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s.replace(',', '.'));
    if (Number.isFinite(v)) out.push({ v, bd: x.index, kt: x.index + s.length });
  }
  return out;
}
/** Neo của MỘT điều kiện phẳng (không HOAC) trong chữ t: mảng [bd, kt). */
function neoMot(c, t) {
  if (!c || typeof c !== 'object') return [];
  const k = khoaCua(c.fact); if (!k) return [];
  const tl = t.toLowerCase();
  const ds = (v) => (Array.isArray(v) ? v : [v]).filter((x) => x != null && String(x).trim());
  if (k.kieu === 'TEN_LOAI' || k.kieu === 'CONG_DUNG') {
    const out = [];
    for (const v of ds(c.value)) {
      const s = String(v).normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!s) continue;
      for (let i = tl.indexOf(s); i >= 0; i = tl.indexOf(s, i + 1)) out.push([i, i + s.length]);
    }
    return out;
  }
  if (k.kieu === 'SO') {
    const out = soTrongChu(t).filter((x) => Math.abs(x.v - Number(c.value)) <= 1e-9 * Math.max(1, Math.abs(x.v))).map((x) => [x.bd, x.kt]);
    return out.concat(neoSoDocDuoc(c, k, t));
  }
  if (k.kieu === 'CO_KHONG') return moiKhop(reDs([...docDu(k.cachDoc), ...docDu(k.cachDocKhong)]), t);
  if (k.kieu === 'LIET_KE') return moiKhop(reDs(ds(c.value).flatMap((v) => docDu(k.moTaGiaTri?.[v]?.cachDoc))), t);
  // chất liệu theo vị trí
  const mau = ds(c.value).flatMap((v) => [esc(String(v)), ...docDu(k.moTaGiaTri?.[v]?.cachDoc)]);
  if (c.viTri) mau.push(...docDu(k.moTaViTri?.[c.viTri]?.cachDoc));
  return moiKhop(reDs(mau), t);
}
/**
 * Neo mọi điều kiện của một mục + nhóm VÀ (DNF xấp xỉ: điều kiện cấp ngoài cùng + từng phương án của từng HOAC).
 * @returns {{neo: {id, fact, kieu, bd, kt}[], dieuKien: {id, fact, kieu, c}[], nhom: Set<number>[]}}
 */
function neoDieuKien(dieuKienSo, t) {
  const dieuKien = []; const ngoai = []; const hoac = [];
  for (const c of dieuKienSo || []) {
    if (c && c.op === 'HOAC' && Array.isArray(c.phuongAn)) {
      hoac.push(c.phuongAn.map((pa) => (Array.isArray(pa) ? pa : []).map((cc) => { const id = dieuKien.length; dieuKien.push({ id, fact: cc?.fact, kieu: khoaCua(cc?.fact)?.kieu, c: cc }); return id; })));
    } else { const id = dieuKien.length; dieuKien.push({ id, fact: c?.fact, kieu: khoaCua(c?.fact)?.kieu, c }); ngoai.push(id); }
  }
  const nhom = hoac.length ? hoac.flatMap((pas) => pas.map((pa) => new Set([...ngoai, ...pa]))) : [new Set(ngoai)];
  const neo = dieuKien.flatMap((d) => neoMot(d.c, t).map(([bd, kt]) => ({ id: d.id, fact: d.fact, kieu: d.kieu, bd, kt })));
  return { neo, dieuKien, nhom };
}

const giao = (a, b) => Math.max(0, Math.min(a.kt, b.kt) - Math.max(a.bd, b.bd));
/** Lõi chữ của mệnh đề (bỏ dấu hiệu đầu + từ đệm) để so lặp với chữ tổ tiên. */
function loiMenhDe(md) {
  let s = md.chu.normalize('NFC');
  if (md.dauHieu) s = s.slice(Math.min(s.length, md.dauHieu.length));
  return s.replace(/^\s*(?:các|loại|một|những)\s+/iu, '').replace(/[\s,;:]+$/, '').trim();
}

module.exports = { chuBieu, chuan, tachVe, tachVeEn, enLienHopSauGioiTu, enPhayThuocTinh, neoDieuKien, neoMot, giao, loiMenhDe, amTiet, W, esc, _nap: nap };
