/**
 * Hàm dùng chung cho bench mô tả ECUS (Đợt 0C): scripts/bench-mo-ta.mjs + scripts/check-mo-ta-bo-de.mjs.
 * Chỉ đọc data/, không ghi gì. Không chứa dữ liệu Oz.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

/** Bỏ dấu tiếng Việt + hạ chữ thường (đ → d). */
export function fold(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

/** Chuỗi có khớp TẤT CẢ biểu thức trong tuKhoa không (so cả bản có dấu và bỏ dấu). */
export function khopTuKhoa(text, tuKhoa = []) {
  const t = String(text || '').toLowerCase();
  const f = fold(text);
  return tuKhoa.every((re) => {
    try {
      return new RegExp(re, 'iu').test(t) || new RegExp(fold(re), 'i').test(f);
    } catch { return false; }
  });
}

/** Token hoá để đo Jaccard (bỏ dấu, tách theo ký tự không phải chữ/số). */
export function tokens(s) {
  return new Set(fold(s).split(/[^a-z0-9%]+/).filter((w) => w.length >= 2));
}
export function jaccard(a, b) {
  const A = tokens(a); const B = tokens(b);
  if (!A.size && !B.size) return 1;
  let i = 0; for (const x of A) if (B.has(x)) i += 1;
  return i / (A.size + B.size - i);
}

// ── Đọc tệp data/ để kiểm chuỗi trích ────────────────────────────────────────────────────────────────────────────────
const cache = new Map();
/** Nạp tệp nguồn (json | jsonl | jsonl.gz) → { kind, value | lines }. */
export function loadSource(rel) {
  if (cache.has(rel)) return cache.get(rel);
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { cache.set(rel, null); return null; }
  let raw = fs.readFileSync(p);
  if (rel.endsWith('.gz')) raw = zlib.gunzipSync(raw);
  const txt = raw.toString('utf8');
  let out;
  if (/\.jsonl(\.gz)?$/.test(rel)) out = { kind: 'jsonl', value: txt.split('\n').filter(Boolean).map((l) => JSON.parse(l)) };
  else out = { kind: 'json', value: JSON.parse(txt) };
  cache.set(rel, out);
  return out;
}

/** Mọi chuỗi lá trong một giá trị JSON. */
export function stringLeaves(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) for (const x of v) stringLeaves(x, out);
  else if (v && typeof v === 'object') for (const x of Object.values(v)) stringLeaves(x, out);
  return out;
}

/** "85444299[9].productName" | "9403.nhom" → giá trị tại đường dẫn (khoá đầu là khoá object, có thể là số). */
export function atPath(root, viTri) {
  const toks = String(viTri).match(/\[\d+\]|[^.[\]]+/g) || [];
  let cur = root;
  for (const t of toks) {
    if (cur == null) return undefined;
    if (t.startsWith('[')) cur = cur[Number(t.slice(1, -1))];
    else cur = cur[t];
  }
  return cur;
}

const leafCache = new Map();
/** Chuỗi trích có NGUYÊN VĂN trong tệp (tại viTri nếu có) không. */
export function trichCoThat(rel, trich, viTri) {
  const src = loadSource(rel);
  if (!src) return { ok: false, lyDo: `không có tệp ${rel}` };
  if (!trich || typeof trich !== 'string') return { ok: false, lyDo: 'thiếu trich' };
  const scope = viTri ? atPath(src.value, viTri) : src.value;
  if (scope === undefined) return { ok: false, lyDo: `không có viTri ${viTri} trong ${rel}` };
  // Cả tệp (không viTri): gom lá một lần rồi dùng lại — bộ đề lát 1 có hàng trăm chuỗi trích trên cùng biểu thuế.
  let leaves;
  if (viTri) leaves = stringLeaves(scope);
  else { if (!leafCache.has(rel)) leafCache.set(rel, stringLeaves(scope)); leaves = leafCache.get(rel); }
  const ok = leaves.some((s) => s.includes(trich));
  return ok ? { ok: true } : { ok: false, lyDo: `không thấy nguyên văn trong ${rel}${viTri ? `#${viTri}` : ''}: "${trich.slice(0, 80)}"` };
}

// ── Chỉ số chuỗi mô tả (dùng cho bench) ───────────────────────────────────────────────────────────────────────────────
export const CHU_CAM = [
  { ma: 'cac_loai', re: /các loại/i },
  { ma: 'loai_khac', re: /loại khác/i },
  { ma: 'hoac', re: /(^|[\s,(])hoặc([\s,)]|$)/i },
  { ma: 'ke_ca', re: /kể cả/i },
  { ma: 'khong_gom', re: /không gồm/i },
];

let fieldCatalog = null;
function catalog() {
  if (!fieldCatalog) fieldCatalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'chapter-declaration-fields.json'), 'utf8'));
  return fieldCatalog;
}

/** Trường bắt buộc của chương (data/chapter-declaration-fields.json) có mặt trong chuỗi: { apDung, co, thieu[] }. */
export function truongBatBuoc(text, chuong) {
  const cat = catalog();
  const rule = cat.chapters?.[chuong];
  if (!rule || !rule.required?.length) return { apDung: false, co: 0, tong: 0, thieu: [] };
  const raw = String(text || ''); const folded = fold(raw);
  const thieu = [];
  for (const key of rule.required) {
    const f = cat.fields?.[key];
    const pats = f?.patterns || [];
    const hit = pats.some((p) => {
      try { return new RegExp(p, 'iu').test(raw) || new RegExp(fold(p), 'i').test(folded); } catch { return false; }
    });
    if (!hit) thieu.push(key);
  }
  return { apDung: true, co: rule.required.length - thieu.length, tong: rule.required.length, thieu };
}

/** Bộ chỉ số tất định của một chuỗi mô tả. Có `hoSo` (đường mới, ho-so@1) thì đo thêm "giá trị truy được nguồn". */
export function chiSoMoTa(text, chuong, { hoSo = null } = {}) {
  const s = String(text || '');
  const tb = truongBatBuoc(s, chuong);
  return {
    truyNguon: truyNguon(s, hoSo),
    doDai: s.length,
    le200: s.length <= 200,
    coDauNgan: /[,;]/.test(s),
    coXuatXu: /xuất xứ/i.test(s),
    chuCam: CHU_CAM.filter((c) => c.re.test(s)).map((c) => c.ma),
    coHieu: /(hiệu|nhãn hiệu|thương hiệu|brand)\s*[:]?\s*\S|không (nhãn )?hiệu|no brand/i.test(s),
    coKT: /\b(kt|kích thước)\b|\d+(?:[.,]\d+)?\s*(?:x|\*|×)\s*\d+|\b\d+(?:[.,]\d+)?\s*(?:mm|cm|m)\b/i.test(s),
    truongBatBuoc: tb,
  };
}

/** Đọc bộ đề công khai. */
export function docBoDe(p = path.join(ROOT, 'data', 'bench', 'mo-ta-bo-de.json')) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// ── Bench lát 1 (L1-2b, #569) ────────────────────────────────────────────────────────────────────────────────────
const require = createRequire(import.meta.url);

/**
 * "Giá trị trong mô tả truy được nguồn" (spec §10). Mô tả tách thành đoạn theo dấu phẩy/chấm phẩy; mỗi đoạn phải chứa
 * (hoặc nằm trong) một giá trị CÓ NGUỒN của hồ sơ: hang.tenVi, duKien[].giaTri (+ donVi) có trangThai ≠ CHUA_BIET và
 * nguon ≠ AI_CHUA_KIEM (spec §8.1: AI_CHUA_KIEM không vào moTaEcus), nhanDien, kiemHoa, loaiTru[].menhDe.
 * Không có hồ sơ (đường cũ) ⇒ apDung: false. Đây là thước đo xấp xỉ theo chữ; L1-5c có bảng giải trình thì đo chặt hơn.
 */
export function truyNguon(text, hoSo) {
  if (!hoSo || typeof hoSo !== 'object') return { apDung: false, tong: 0, co: 0, tiLe: null, khongNguon: [] };
  const gt = [];
  if (hoSo.hang?.tenVi) gt.push(hoSo.hang.tenVi);
  for (const d of hoSo.duKien || []) {
    if (!d || d.giaTri == null || d.trangThai === 'CHUA_BIET' || d.nguon === 'AI_CHUA_KIEM') continue;
    gt.push(String(d.giaTri)); if (d.donVi) gt.push(`${d.giaTri} ${d.donVi}`, `${d.giaTri}${d.donVi}`);
  }
  for (const v of Object.values(hoSo.nhanDien || {})) if (typeof v === 'string' && v) gt.push(v);
  for (const k of hoSo.kiemHoa || []) if (k?.giaTri != null) gt.push(String(k.giaTri));
  for (const l of hoSo.loaiTru || []) if (l?.menhDe) gt.push(l.menhDe);
  const vals = gt.map((v) => fold(v).replace(/\s+/g, ' ').trim()).filter((v) => v.length >= 2);
  const doan = String(text || '').split(/\s*[,;]\s*/).map((x) => x.trim()).filter(Boolean);
  const khongNguon = doan.filter((d) => { const f = fold(d).replace(/\s+/g, ' '); return !vals.some((v) => f.includes(v) || v.includes(f)); });
  return { apDung: true, tong: doan.length, co: doan.length - khongNguon.length, tiLe: doan.length ? (doan.length - khongNguon.length) / doan.length : 1, khongNguon };
}

/**
 * "Trích dẫn sai" (spec §10, luật 6 + 7a): GIR phải là đối tượng do lib/gir.js dựng (basis hợp lệ, rule/textVi đúng bảng
 * GIR_RULES, có evidence + source); căn cứ pháp lý phải qua lib/legal-basis.js (mọi id trong mảng `canCu` có trong CLAUSES;
 * đối tượng trích TT85/TT121 có `trich` đúng nguyên văn cite()/citeChiTieu()). Quét phản hồi gốc và khối hoSo.canCu.
 * Chú giải/tiền lệ: L1-5c thêm khi bảng giải trình có hình dạng chốt.
 */
export function trichDanSai(json) {
  const gir = require('../lib/gir.js');
  const lb = require('../lib/legal-basis.js');
  const chiTiet = []; let tong = 0;
  const sai = (lyDo) => chiTiet.push(lyDo);
  const girs = [...(Array.isArray(json?.girRulesApplied) ? json.girRulesApplied : []), ...(Array.isArray(json?.hoSo?.canCu?.girRulesApplied) ? json.hoSo.canCu.girRulesApplied : [])];
  for (const g of girs) {
    tong += 1;
    const r = gir.GIR_RULES[g?.ruleKey];
    if (!g || !gir.BASIS[g.basis]) sai(`GIR thiếu/sai basis (${g?.rule || '?'})`);
    else if (!r || g.rule !== r.id || g.textVi !== r.textVi) sai(`GIR ${g.rule || '?'} không khớp bảng GIR_RULES của lib/gir.js`);
    else if (!('evidence' in g) || !g.source) sai(`GIR ${g.rule} thiếu evidence/source`);
  }
  const quet = (v) => {
    if (Array.isArray(v)) { v.forEach(quet); return; }
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v.canCu)) for (const id of v.canCu) { tong += 1; if (typeof id !== 'string' || !lb.CLAUSES[id]) sai(`căn cứ ${id} không có trong lib/legal-basis.js CLAUSES`); }
    if (typeof v.id === 'string' && typeof v.trich === 'string' && typeof v.vanBan === 'string') {
      tong += 1;
      let goc = null;
      try { goc = v.vanBan === lb.TT121.soHieu ? lb.citeChiTieu(v.id) : v.vanBan === lb.TT85.soHieu ? lb.cite(v.id) : null; } catch { goc = null; }
      if (!goc) sai(`trích ${v.vanBan} ${v.id} không có trong lib/legal-basis.js`);
      else if (goc.trich !== v.trich) sai(`trích ${v.vanBan} ${v.id} khác nguyên văn lib/legal-basis.js`);
    }
    for (const [k, x] of Object.entries(v)) if (k !== 'canCu') quet(x);
  };
  quet(json?.canCuPhapLy);
  quet(json?.hoSo?.canCu?.canCuPhapLy);
  return { tong, sai: chiTiet.length, chiTiet };
}

/** Tập pn6 của danh sách lát 1 (data/ho-so/lat-1.json). */
export function docLat1Pn6(p = path.join(ROOT, 'data', 'ho-so', 'lat-1.json')) {
  return new Set((JSON.parse(fs.readFileSync(p, 'utf8')).phanNhom || []).map((x) => String(x.pn6)));
}

/**
 * (b) Tập giữ riêng Oz của lát 1: mã 8 số còn trong biểu, 6 số đầu thuộc lát 1, thuộc tập giữ riêng của lib/holdout.js,
 * tờ khai nhập (lib/ho-so/lat-1.js#laToKhaiNhap), có câu chuẩn (sampleDesc) và tên hàng. Hàm thuần, tham số tiêm vào.
 */
export function locGiuRiengLat1(gold, { pn6, taxData, isHeldOut, laToKhaiNhap }) {
  return gold.filter((g) => {
    const ma = String(g?.hsCode || '');
    return /^\d{8}$/.test(ma) && pn6.has(ma.slice(0, 6)) && taxData[ma] && g.sampleDesc && g.tenHang && laToKhaiNhap(g) && isHeldOut(g);
  });
}

/** (a) Ca bộ đề #543 có mã thuộc lát 1 mà bộ đề lát 1 CHƯA gộp (ca đã gộp mang gopTu.id) — để bench không bỏ sót, không đếm hai lần. */
export function gopCa543Lat1(boDeLat1, boDe543, pn6) {
  const daGop = new Set((boDeLat1.ca || []).map((c) => c.gopTu?.id).filter(Boolean));
  return (boDe543.ca || []).filter((c) => pn6.has(String(c.maHs).slice(0, 6)) && !daGop.has(c.id)).map((c) => ({ ...c, lat: 1, pn6: String(c.maHs).slice(0, 6) }));
}

// ── (d) Ca âm CV 755 ──────────────────────────────────────────────────────────────────────────────────────────────
export const TEP_WIKI_CV755 = 'oz-wiki:wiki/sources/755-tchq-gsql-2020.md';
/** Đúng 6 ví dụ CV 755 mục 1 đoạn 2 (trang wiki L0h): không bịa thêm ví dụ "giống CV 755". */
export const ID_CV755 = ['CV755-NK-1', 'CV755-NK-2', 'CV755-NK-3', 'CV755-XK-1', 'CV755-XK-2', 'CV755-XK-3'];

export function docCaAm(p = path.join(ROOT, 'data', 'bench', 'cv755-am.json')) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/** Kiểm cấu trúc bộ ca âm: đúng 6 id, moTaSoSai nằm trong câu trích, bậc nguồn, phạm vi lát 1, mã chạy máy có trong biểu. */
export function kiemCaAm(boAm) {
  const loi = [];
  const tax = loadSource('data/tax.json').value;
  const ca = Array.isArray(boAm?.ca) ? boAm.ca : [];
  const ids = ca.map((c) => c.id);
  for (const id of ids) if (!ID_CV755.includes(id)) loi.push(`${id}: không phải một trong 6 ví dụ CV 755 (không bịa thêm ví dụ "giống CV 755")`);
  for (const id of ID_CV755) if (!ids.includes(id)) loi.push(`${id}: thiếu`);
  if (new Set(ids).size !== ids.length) loi.push('id trùng');
  for (const c of ca) {
    const id = c.id || '(không id)';
    if (!c.moTaSoSai) loi.push(`${id}: thiếu moTaSoSai`);
    if (!c.viSaoKhongDat) loi.push(`${id}: thiếu viSaoKhongDat`);
    if (c.bacNguon !== 'B') loi.push(`${id}: bacNguon phải là B (trích đoạn LuatVietnam, chưa đối chiếu bản có dấu đỏ)`);
    if (c.nguon?.tep !== TEP_WIKI_CV755) loi.push(`${id}: nguon.tep phải là ${TEP_WIKI_CV755}`);
    if (!c.nguon?.trich) loi.push(`${id}: thiếu nguon.trich`);
    else if (c.moTaSoSai && !c.nguon.trich.includes(c.moTaSoSai)) loi.push(`${id}: moTaSoSai không nằm nguyên văn trong nguon.trich`);
    const xuat = /^CV755-XK-/.test(id);
    if (c.loaiToKhai !== (xuat ? 'XUAT' : 'NHAP')) loi.push(`${id}: loaiToKhai phải là ${xuat ? 'XUAT' : 'NHAP'}`);
    if (xuat) {
      if (c.ngoaiPhamViLat1 !== true) loi.push(`${id}: ca tờ khai xuất phải ghi ngoaiPhamViLat1: true (lát 1 chỉ tờ khai nhập)`);
      if (c.maHsChay) loi.push(`${id}: ca ngoài phạm vi lát 1 không chạy máy — bỏ maHsChay`);
    } else {
      const m = c.maHsChay;
      if (!m || !/^\d{8}$/.test(m.ma || '')) loi.push(`${id}: ca nhập cần maHsChay.ma 8 số (mã để chạy máy — CV 755 không ghi mã)`);
      else {
        if (!tax[m.ma]) loi.push(`${id}: maHsChay ${m.ma} không có trong data/tax.json`);
        if (m.khongPhaiDapAn !== true) loi.push(`${id}: maHsChay phải ghi khongPhaiDapAn: true`);
        if (!m.nguon || !m.trich) loi.push(`${id}: maHsChay cần nguon + trich (chữ biểu thuế của nhóm)`);
        else { const r = trichCoThat(m.nguon, m.trich, m.viTri); if (!r.ok) loi.push(`${id}: maHsChay — ${r.lyDo}`); }
      }
    }
  }
  return { loi };
}

/** Đối chiếu NGUYÊN VĂN với trang wiki CV 755 (khi có bản trang wiki trên máy). */
export function kiemCaAmVoiWiki(boAm, wikiText) {
  const loi = [];
  const w = String(wikiText || '').normalize('NFC');
  for (const c of boAm?.ca || []) {
    if (!c.moTaSoSai || !w.includes(`"${String(c.moTaSoSai).normalize('NFC')}"`)) loi.push(`${c.id}: moTaSoSai không có nguyên văn (trong ngoặc kép) ở trang wiki`);
    if (!c.nguon?.trich || !w.includes(String(c.nguon.trich).normalize('NFC'))) loi.push(`${c.id}: nguon.trich không có nguyên văn ở trang wiki`);
  }
  return { loi };
}

const CO_CO = (m) => (m?.nhom === 'K1' || m?.nhom === 'K2') && (m.trangThai === 'CANH_BAO' || m.trangThai === 'LOI');

/** Soát ca âm: bắt được khi có ít nhất một mục K1/K2 CANH_BAO|LOI (hoặc cờ K2 tất định gọi thẳng). */
export function chamAmSoat(kiem = [], det = []) {
  const co = [...kiem.filter(CO_CO).map((m) => `${m.nhom}:${m.ma}`), ...det];
  return { bat: co.length > 0, co };
}

/**
 * Sinh từ đầu vào sơ sài: đường mới (có hoSo) phải trả ketLuan.trangThai ≠ DU_CAN_CU (spec: THIEU_DU_KIEN, không sinh
 * moTaEcus "đạt"); đường cũ (chưa có hoSo) coi là từ chối khi compliance WEAK/REJECT hoặc không qua audit.
 */
export function chamAmSinh(json) {
  const tt = json?.hoSo?.ketLuan?.trangThai || json?.ketLuan?.trangThai;
  if (tt) return { tuChoi: tt !== 'DU_CAN_CU', theo: 'hoSo', trangThai: tt };
  const c = json?.compliance || {};
  return { tuChoi: c.level === 'WEAK' || c.level === 'REJECT' || c.passesCustomsAudit === false, theo: 'compliance', trangThai: c.level || null };
}

/** Báo oan LOI trên ca chuẩn (spec §10, ngưỡng ≤ 5 %): ca chuẩn có mục K1/K2 trạng thái LOI. */
export function baoOanLoi(rows) {
  const chuan = rows.filter((r) => r.loai === 'chuan');
  return { n: chuan.length, loi: chuan.filter((r) => (r.kiem || []).some((m) => (m.nhom === 'K1' || m.nhom === 'K2') && m.trangThai === 'LOI')).length };
}

/** Ghi JSONL chứa dữ liệu Oz — chỉ khi đường dẫn bị gitignore trong kho `root` (git check-ignore), không thì từ chối, trả null. */
export function ghiRiengTu(root, file, rows) {
  const rel = path.relative(root, file);
  let ignored = false;
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
    try { execFileSync('git', ['-C', root, 'check-ignore', '-q', rel], { stdio: 'ignore' }); ignored = true; } catch { ignored = false; }
  }
  if (!ignored) { console.error(`TỪ CHỐI GHI: ${rel} không bị gitignore — chi tiết có câu Oz, không được nằm ở chỗ commit được.`); return null; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return rel;
}
