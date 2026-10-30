/**
 * lib/dieu-kien-so.js — lược đồ `dieuKienSo` MỚI theo từ vựng `tu-vung@1` + bộ chấm ranh giới 6→8 số
 * (plan L1-3b, #573; spec hồ sơ phân loại §8.1 `duongDiPhapLy`, §8.2, §8.3 bước 3 `doiChieu`).
 *
 * ── Lược đồ một điều kiện (`dong8[].dieuKienSo[i]`, `dieuKienNut[].dieuKienSo[i]` của data/so-tay/<nhóm>.json) ──
 * Điều kiện có KIỂU khi `fact` là khoá của tu-vung@1 (camelCase). Fact cũ (snake_case: duong_kinh, chat_lieu…) giữ
 * NGUYÊN định dạng và máy chấm cũ của lib/so-tay-gates.js — hai bộ khoá không trùng nhau (kiểm 30/10: 285 dòng cũ).
 *   kiểu SO                    { fact, op: '<='|'<'|'>='|'>', value: số, donVi }   donVi thuộc hệ đơn vị của khoá
 *   kiểu CO_KHONG              { fact, op: 'CO'|'KHONG' }
 *   kiểu LIET_KE               { fact, op: 'TRONG', value: string[] }               mọi phần tử ∈ giaTriHopLe
 *   kiểu TEN_LOAI              { fact, op: 'TEN_LOAI', value: string|string[] }     nhiều phần tử = "hoặc"
 *   kiểu CONG_DUNG             { fact, op: 'CONG_DUNG', value: string|string[] }
 *   kiểu CHAT_LIEU_THEO_VI_TRI { fact, op: 'LA', value: string|string[], viTri? }   viTri mặc định CHINH
 *   tuỳ chọn `chieu: 'PHAI_CO'|'PHAI_KHONG'` (mặc định PHAI_CO) — chỉ cho TRONG/TEN_LOAI/CONG_DUNG/LA; với CO_KHONG
 *   và SO thì dùng KHONG / đảo op (một cách viết duy nhất, để cổng "loại trừ lẫn nhau" của L1-4a so được).
 * Câu trích (`trich` của mục) phải là bằng chứng: số + đơn vị (SO), một mẫu `cachDoc` của khoá (CO_KHONG), của từng
 * giá trị (TRONG, LA), hoặc chính chữ của giá trị (TEN_LOAI, CONG_DUNG — giá trị chữ tự do không có mẫu).
 *
 * ── Ngữ nghĩa ranh giới 6→8 số (duongDiDong8) ──
 * Đi từ dòng 8 số lên tới phân nhóm 6 số. Ở mỗi tầng, nút n:
 *   - n có tên (dòng 8 số có tên, hoặc tiêu đề có tên ≠ "Loại khác")      → PHAI_CO điều kiện của chính n
 *   - n là "Loại khác" (dòng hoặc tiêu đề) hoặc tiêu đề không tên           → PHAI_KHONG từng anh em của n (bỏ "Loại khác"
 *     trần), cộng PHAI_CO điều kiện vế riêng nếu n là "Loại khác, <vế>"
 * Với dòng "Loại khác" mà mọi tầng trên đều là "Loại khác"/không tên, tập phủ định = loaiKhacOf().truDayDu (Đợt 0A).
 * Khác truDayDu ở MỘT chỗ có chủ ý: tiêu đề có tên lấy từ biểu thuế Tổng cục (suyRa nhưng có tenVi) là nút có tên →
 * PHAI_CO tiêu đề, không phủ định anh em của tiêu đề (85444219: trong "Dùng cho viễn thông, ≤ 80 V" trừ .11/.13).
 * Điều kiện của tiêu đề nằm ở `dieuKienNut[]` của sổ tay (nguồn `tieuDe.<id>` — tên nguyên văn của biểu thuế).
 *
 * ── Kết quả (spec §8.1) ── mỗi mục đường đi `ketQua`: CO (thoả theo chiều) | THIEU (chưa đủ dữ kiện) | MAU_THUAN (trái) |
 * CHUA_SO_HOA (ranh giới chưa có điều kiện). Gộp một dòng: MAU_THUAN > CHUA_SO_HOA > THIEU > CO. `tatDinh` = kết quả
 * dựa trên so số / có-không / liệt kê / chất liệu; so chữ tự do (TEN_LOAI, CONG_DUNG) là KHÔNG tất định — chỉ làm
 * cảnh báo, không bao giờ làm căn cứ LOI (Global Constraints K2). Dữ kiện `nguon: AI_CHUA_KIEM` hoặc `trangThai:
 * CHUA_BIET` không vào quyết định (spec §8.1: chỉ làm câu hỏi).
 *
 * Chỉ đọc. Không gọi LLM. Không đổi mã đã chọn ở đâu cả — người dùng (L1-5) quyết định cách dùng kết quả.
 */
const fs = require('fs');
const path = require('path');
const TV = require('./tu-vung');
const T = require('./hs-tree');
const { dataReadPath } = require('./data-paths');

const OP_SO = ['<=', '<', '>=', '>'];
const OP_MOI = ['CO', 'KHONG', 'TRONG', 'TEN_LOAI', 'CONG_DUNG'];
const CHIEU = ['PHAI_CO', 'PHAI_KHONG'];
const OP_THEO_KIEU = { SO: OP_SO, CO_KHONG: ['CO', 'KHONG'], LIET_KE: ['TRONG'], TEN_LOAI: ['TEN_LOAI'], CONG_DUNG: ['CONG_DUNG'], CHAT_LIEU_THEO_VI_TRI: ['LA'] };
const KET_QUA = ['CO', 'THIEU', 'MAU_THUAN', 'CHUA_SO_HOA'];
const UU_TIEN = { MAU_THUAN: 3, CHUA_SO_HOA: 2, THIEU: 1, CO: 0 };

// ── từ vựng ─────────────────────────────────────────────────────────────────────────────────────────────────
function khoaTV(fact) {
  try { return fact ? TV.layKhoa(fact) : null; } catch { return null; }
}
const laFactTuVung = (fact) => Boolean(khoaTV(fact));
const dsGiaTri = (v) => (Array.isArray(v) ? v : [v]);
const CJK = /[㐀-鿿]/u;
const CHU = '[\\p{L}\\p{M}]';
const boc = (src) => (CJK.test(src) ? `(?:${src})` : `(?<!${CHU})(?:${src})(?!${CHU})`);
const mauCua = (cd) => (cd ? [...(cd.vi || []), ...(cd.en || []), ...(cd.zh || [])] : []);
function coMau(list, text) {
  const ds = (list || []).filter(Boolean);
  if (!ds.length) return false;
  return new RegExp(ds.map(boc).join('|'), 'iu').test(String(text || '').normalize('NFC'));
}
/** Mẫu nhận diện một chất liệu của khoá chatLieu: cachDoc riêng + mẫu dùng chung của so-tay-gates (dungMau). */
function coChatLieu(k, cl, text) {
  const mt = k.moTaGiaTri?.[cl] || {};
  if (coMau(mauCua(mt.cachDoc), text)) return true;
  if (mt.dungMau) {
    const [tep, ten] = String(mt.dungMau).split('#');
    if (tep === 'so-tay-gates') {
      const re = require('./so-tay-gates').chatLieuRegex(ten);
      if (re && re.test(String(text || '').normalize('NFC'))) return true;
    }
  }
  return false;
}
const squash = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
/** Số trong câu trích, kể cả cách viết nghìn kiểu Việt ("1.000") và thập phân dấu phẩy ("19,5"). */
function soCoTrongTrich(value, trich) {
  const t = String(trich || '').replace(/\s/g, '');
  const s = String(value);
  const cands = new Set([s, s.replace('.', ',')]);
  if (Number.isInteger(value) && Math.abs(value) >= 1000) cands.add(String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  return [...cands].some((c) => new RegExp(`(?<![\\d.,])${c.replace(/[.]/g, '\\.')}(?![\\d]|[.,]\\d)`).test(t));
}

// ── Máy kiểm một điều kiện có kiểu ──────────────────────────────────────────────────────────────────────────
/**
 * Kiểm một điều kiện của dieuKienSo trên câu trích của mục. null = đạt; chuỗi lỗi dạng `dieu-kien-so-<op>-…`.
 * Chỉ dành cho điều kiện CÓ KIỂU (fact ∈ tu-vung@1) hoặc op mới; điều kiện cũ do lib/so-tay.js kiểm như trước.
 */
function kiemDieuKien(c, trich) {
  if (!c || typeof c !== 'object') return 'dieu-kien-so-khong-hop-le';
  const k = khoaTV(c.fact);
  if (!k) return `dieu-kien-so-fact-khong-co-trong-tu-vung:${c.fact || ''}`;
  const ops = OP_THEO_KIEU[k.kieu] || [];
  if (!ops.includes(c.op)) return `dieu-kien-so-op-sai-kieu:${c.op}:${c.fact}`;
  const opTen = String(c.op === 'LA' ? 'la' : c.op).toLowerCase().replace(/_/g, '-');
  if (c.chieu !== undefined) {
    if (!CHIEU.includes(c.chieu)) return `dieu-kien-so-chieu-khong-hop-le:${c.chieu}`;
    if (c.chieu === 'PHAI_KHONG' && (k.kieu === 'SO' || k.kieu === 'CO_KHONG')) return `dieu-kien-so-chieu-thua:${c.op}:${c.fact}`;
  }
  const tr = String(trich || '');
  switch (k.kieu) {
    case 'SO': {
      if (typeof c.value !== 'number' || !Number.isFinite(c.value)) return 'dieu-kien-so-value-khong-phai-so';
      if (!String(c.donVi || '').trim()) return 'dieu-kien-so-thieu-don-vi';
      if (TV.quyDoi(c.fact, 1, c.donVi) == null) return `dieu-kien-so-don-vi-lech-he:${c.donVi}`;
      if (!soCoTrongTrich(c.value, tr)) return `dieu-kien-so-nguong-khong-co-trong-trich:${c.value}`;
      if (!tr.toLowerCase().includes(String(c.donVi).toLowerCase())) return `dieu-kien-so-don-vi-khong-co-trong-trich:${c.donVi}`;
      return null;
    }
    case 'CO_KHONG':
      return coMau([...mauCua(k.cachDoc), ...mauCua(k.cachDocKhong)], tr) ? null : `dieu-kien-so-${opTen}-khong-co-trong-trich:${c.fact}`;
    case 'LIET_KE': {
      if (!Array.isArray(c.value) || !c.value.length || new Set(c.value).size !== c.value.length) return 'dieu-kien-so-trong-value-rong-hoac-trung';
      for (const v of c.value) if (!(k.giaTriHopLe || []).includes(v)) return `dieu-kien-so-trong-gia-tri-ngoai-danh-sach:${v}`;
      for (const v of c.value) if (!coMau(mauCua(k.moTaGiaTri?.[v]?.cachDoc), tr)) return `dieu-kien-so-trong-khong-co-trong-trich:${v}`;
      return null;
    }
    case 'TEN_LOAI':
    case 'CONG_DUNG': {
      const ds = dsGiaTri(c.value);
      if (!ds.length || ds.some((v) => typeof v !== 'string' || !v.trim())) return `dieu-kien-so-${opTen}-value-rong`;
      for (const v of ds) if (squash(v).length < 2 || !squash(tr).includes(squash(v))) return `dieu-kien-so-${opTen}-khong-co-trong-trich:${v}`;
      return null;
    }
    case 'CHAT_LIEU_THEO_VI_TRI': {
      const ds = dsGiaTri(c.value);
      if (!ds.length || ds.some((v) => !(k.giaTriHopLe || []).includes(v))) return `dieu-kien-so-la-gia-tri-ngoai-danh-sach:${ds.join('|')}`;
      if (c.viTri !== undefined && !(k.viTri || []).includes(c.viTri)) return `dieu-kien-so-la-vi-tri-khong-hop-le:${c.viTri}`;
      for (const v of ds) if (!coChatLieu(k, v, tr)) return `dieu-kien-so-la-khong-co-trong-trich:${v}`;
      if (c.viTri && c.viTri !== 'CHINH' && !coMau(mauCua(k.moTaViTri?.[c.viTri]?.cachDoc), tr)) return `dieu-kien-so-la-vi-tri-khong-co-trong-trich:${c.viTri}`;
      return null;
    }
    default: return `dieu-kien-so-op-sai-kieu:${c.op}:${c.fact}`;
  }
}

// ── Dữ kiện có kiểu ─────────────────────────────────────────────────────────────────────────────────────────
const NGUON_KHONG_DUNG = new Set(['AI_CHUA_KIEM']);
const TRANG_THAI_DUNG = new Set(['DA_CO', 'SUY_RA']);
const bangNhau = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/**
 * duKien[] (spec §8.1: { fact, giaTri, donVi?, op?, cacGiaTri?, nguon, bangChung, trangThai }) → Map fact → mục dùng được.
 * Bỏ AI_CHUA_KIEM / CHUA_BIET. Hai mục cùng khoá trái nhau → { xungDot: true } (chấm CHUA_BIET). chatLieu nhiều mục → gộp.
 */
function chuanDuKien(duKien) {
  const m = new Map();
  for (const d of Array.isArray(duKien) ? duKien : []) {
    if (!d || !d.fact || d.giaTri === undefined || d.giaTri === null) continue;
    if (NGUON_KHONG_DUNG.has(d.nguon)) continue;
    if (d.trangThai !== undefined && !TRANG_THAI_DUNG.has(d.trangThai)) continue;
    const cu = m.get(d.fact);
    const k = khoaTV(d.fact);
    if (!cu) { m.set(d.fact, { ...d }); continue; }
    if (cu.xungDot) continue;
    if (k?.kieu === 'CHAT_LIEU_THEO_VI_TRI') {
      const gop = [...dsGiaTri(cu.giaTri), ...dsGiaTri(d.giaTri)].filter((x, i, a) => a.findIndex((y) => bangNhau(x, y)) === i);
      m.set(d.fact, { ...cu, giaTri: gop });
    } else if (!bangNhau([cu.giaTri, cu.donVi, cu.op, cu.cacGiaTri], [d.giaTri, d.donVi, d.op, d.cacGiaTri])) {
      m.set(d.fact, { fact: d.fact, xungDot: true, cacMuc: [cu, d] });
    }
  }
  return m;
}

// ── Chấm một điều kiện ──────────────────────────────────────────────────────────────────────────────────────
// Khoảng số: { lo, loIn, hi, hiIn } (±Infinity cho đầu mở).
function khoangOp(op, v) {
  if (op === '<=') return { lo: -Infinity, loIn: false, hi: v, hiIn: true };
  if (op === '<') return { lo: -Infinity, loIn: false, hi: v, hiIn: false };
  if (op === '>=') return { lo: v, loIn: true, hi: Infinity, hiIn: false };
  if (op === '>') return { lo: v, loIn: false, hi: Infinity, hiIn: false };
  return { lo: v, loIn: true, hi: v, hiIn: true };
}
const tron = (x) => Number(Number(x).toPrecision(12));
function conCua(f, c) { // f ⊆ c
  const loOk = f.lo > c.lo || (f.lo === c.lo && (!f.loIn || c.loIn));
  const hiOk = f.hi < c.hi || (f.hi === c.hi && (!f.hiIn || c.hiIn));
  return loOk && hiOk;
}
function roiNhau(f, c) {
  const truoc = (x, y) => x.hi < y.lo || (x.hi === y.lo && !(x.hiIn && y.loIn));
  return truoc(f, c) || truoc(c, f);
}
function khoangDuKien(k, f) {
  const u = f.donVi || k.donViChuan;
  if (Array.isArray(f.cacGiaTri) && f.cacGiaTri.length > 1) {
    const vs = f.cacGiaTri.map((x) => TV.quyDoi(k.khoa, x, u));
    if (vs.some((x) => x == null || !Number.isFinite(x))) return null;
    return { lo: tron(Math.min(...vs)), loIn: true, hi: tron(Math.max(...vs)), hiIn: true };
  }
  if (Array.isArray(f.giaTri) || typeof f.giaTri !== 'number') return null;
  const v = TV.quyDoi(k.khoa, f.giaTri, u);
  if (v == null || !Number.isFinite(v)) return null;
  return khoangOp(f.op && f.op !== '=' ? f.op : '=', tron(v));
}

// Chất liệu cha–con (tu-vung@1 chưa ghi quan hệ; đề xuất chuyển vào tu-vung@2 trường `thuoc`).
const CHAT_LIEU_CHA = { 'sắt thép': 'kim loại', 'thép không gỉ': 'sắt thép', gang: 'sắt thép', 'đồng': 'kim loại', 'nhôm': 'kim loại', 'kẽm': 'kim loại', niken: 'kim loại' };
function thuoc(con, cha) {
  for (let x = con, i = 0; x && i < 5; x = CHAT_LIEU_CHA[x], i += 1) if (x === cha) return true;
  return false;
}

// So chữ tự do (TEN_LOAI, CONG_DUNG): bỏ hư từ, so tập âm tiết. KHÔNG tất định.
const HU_TU = new Set(['cho', 'của', 'loại', 'dùng', 'để', 'và', 'hoặc', 'các', 'những', 'bằng', 'có', 'với', 'trong', 'được', 'sử', 'dụng', 'thuộc', 'là', 'một', 'the', 'for', 'of', 'and', 'or', 'with', 'a', 'an']);
const amTiet = (s) => String(s || '').normalize('NFC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((x) => x && !HU_TU.has(x));
const KHONG_ASCII = /[^\x00-\x7F]/;
function soChu(condVals, factVal) {
  const fv = String(factVal || '');
  if (!fv.trim() || CJK.test(fv)) return 'CHUA_BIET';
  const F = new Set(amTiet(fv));
  if (!F.size) return 'CHUA_BIET';
  let moiPhuongAnLech = true; let soDuoc = false;
  for (const v of condVals) {
    // Dữ kiện toàn ASCII (tiếng Anh) so với tên tiếng Việt có dấu: không so được.
    if (!KHONG_ASCII.test(fv) && KHONG_ASCII.test(v)) { moiPhuongAnLech = false; continue; }
    soDuoc = true;
    const A = amTiet(v);
    if (A.length && A.every((x) => F.has(x))) return 'THOA';
    const fTrongA = [...F].every((x) => A.includes(x)); // dữ kiện chung hơn tên dòng ("quạt" ⊂ "quạt bàn")
    if (fTrongA) moiPhuongAnLech = false;
  }
  return soDuoc && moiPhuongAnLech ? 'TRAI' : 'CHUA_BIET';
}

const lat = (tt) => (tt === 'THOA' ? 'TRAI' : tt === 'TRAI' ? 'THOA' : tt);

/** Ánh xạ fact cũ (snake_case của sổ tay) → khoá tu-vung@1, từ data/tu-vung/anh-xa-cu.json (L1-3a). */
let _anhXa = null;
function anhXaCu() {
  if (!_anhXa) {
    _anhXa = {};
    try {
      const ax = JSON.parse(fs.readFileSync(dataReadPath(path.join('tu-vung', 'anh-xa-cu.json')), 'utf8'));
      for (const [cu, moi] of Object.entries(ax.anhXa || {})) { const m = cu.match(/^data\/so-tay\/\*\.json#(.+)$/); if (m) _anhXa[m[1]] = moi; }
    } catch { /* thiếu tệp → không ánh xạ */ }
  }
  return _anhXa;
}

/**
 * Chấm MỘT điều kiện trên MỘT mục dữ kiện đã chuẩn (chuanDuKien) — hoặc null khi chưa có.
 * Điều kiện cũ (fact snake_case) chấm qua anh-xa-cu; không ánh xạ được → CHUA_BIET, lyDo 'fact-cu-chua-anh-xa'.
 * @returns {{trangThai:'THOA'|'TRAI'|'CHUA_BIET', tatDinh:boolean, giaTriDocDuoc?:any, lyDo?:string}}
 */
function danhGiaDieuKien(c, f) {
  if (!c || typeof c !== 'object') return { trangThai: 'CHUA_BIET', tatDinh: true, lyDo: 'dieu-kien-hong' };
  if (c.op === 'HOAC') {
    let allFail = true;
    for (const alt of c.phuongAn || []) {
      const r = (alt || []).map((cc) => danhGiaDieuKien(cc, f && f._map ? f._map.get(factCuaDk(cc)) : null));
      if (r.length && r.every((x) => x.trangThai === 'THOA')) return { trangThai: 'THOA', tatDinh: true };
      if (!r.some((x) => x.trangThai === 'TRAI')) allFail = false;
    }
    return { trangThai: allFail ? 'TRAI' : 'CHUA_BIET', tatDinh: true };
  }
  let k = khoaTV(c.fact);
  let cc = c;
  if (!k) {
    const moi = anhXaCu()[c.fact];
    k = khoaTV(moi);
    if (!k) return { trangThai: 'CHUA_BIET', tatDinh: true, lyDo: 'fact-cu-chua-anh-xa' };
    cc = { ...c, fact: moi };
  }
  const tatDinh = !['TEN_LOAI', 'CONG_DUNG'].includes(k.kieu);
  const ket = (tt, extra = {}) => ({ trangThai: cc.chieu === 'PHAI_KHONG' ? lat(tt) : tt, tatDinh, ...extra });
  if (!f) return ket('CHUA_BIET', { lyDo: 'thieu-du-kien' });
  if (f.xungDot) return ket('CHUA_BIET', { lyDo: 'du-kien-trai-nhau' });
  const g = f.giaTri;
  switch (k.kieu) {
    case 'SO': {
      const fi = khoangDuKien(k, f);
      const cv = TV.quyDoi(k.khoa, cc.value, cc.donVi);
      if (!fi || cv == null) return ket('CHUA_BIET', { lyDo: 'khong-quy-doi-duoc' });
      const ci = khoangOp(cc.op, tron(cv));
      return ket(conCua(fi, ci) ? 'THOA' : roiNhau(fi, ci) ? 'TRAI' : 'CHUA_BIET', { giaTriDocDuoc: f.cacGiaTri || (f.op ? `${f.op} ${g}` : g) });
    }
    case 'CO_KHONG':
      if (typeof g !== 'boolean') return ket('CHUA_BIET', { lyDo: 'sai-kieu' });
      return ket((cc.op === 'CO') === g ? 'THOA' : 'TRAI', { giaTriDocDuoc: g });
    case 'LIET_KE': {
      const vs = dsGiaTri(g);
      if (!vs.length || vs.some((v) => !(k.giaTriHopLe || []).includes(v))) return ket('CHUA_BIET', { lyDo: 'ngoai-gia-tri-hop-le' });
      const trong = vs.filter((v) => cc.value.includes(v)).length;
      return ket(trong === vs.length ? 'THOA' : trong === 0 ? 'TRAI' : 'CHUA_BIET', { giaTriDocDuoc: g });
    }
    case 'CHAT_LIEU_THEO_VI_TRI': {
      const vt = cc.viTri || 'CHINH';
      const can = dsGiaTri(cc.value);
      const tai = dsGiaTri(g).filter((x) => x && (x.viTri || 'CHINH') === vt).map((x) => x.chatLieu);
      if (!tai.length) return ket('CHUA_BIET', { lyDo: 'chua-biet-chat-lieu-o-vi-tri' });
      if (tai.some((m) => can.some((v) => thuoc(m, v)))) return ket('THOA', { giaTriDocDuoc: tai });
      if (tai.some((m) => can.some((v) => thuoc(v, m)))) return ket('CHUA_BIET', { giaTriDocDuoc: tai, lyDo: 'chat-lieu-chung-hon' });
      return ket('TRAI', { giaTriDocDuoc: tai });
    }
    case 'TEN_LOAI':
    case 'CONG_DUNG':
      return ket(soChu(dsGiaTri(cc.value), g), { giaTriDocDuoc: g });
    default: return ket('CHUA_BIET', { lyDo: 'kieu-la' });
  }
}
function factCuaDk(c) {
  return khoaTV(c?.fact) ? c.fact : (anhXaCu()[c?.fact] || c?.fact);
}

/**
 * Chấm một điều kiện CÓ KIỂU trên chữ mô tả hàng (đường chotDong8): đọc dữ kiện bằng docGiaTri của tu-vung@1 rồi chấm
 * như trên. Trả { trangThai: THOA|TRAI|CHUA_BIET, tatDinh, giaTriDocDuoc?, bangChung? }.
 */
function danhGiaTuChu(c, text) {
  const k = khoaTV(c?.fact);
  if (!k) return { trangThai: 'CHUA_BIET', tatDinh: true, lyDo: 'fact-khong-co-trong-tu-vung' };
  let r;
  try { r = TV.docGiaTri(c.fact, text); } catch { r = null; }
  const f = r && r.trangThai === 'DA_CO' ? { fact: c.fact, ...r } : null;
  const out = danhGiaDieuKien(c, f);
  return { ...out, ...(r?.bangChung ? { bangChung: r.bangChung } : {}) };
}

// ── Đường đi 6→8 số ─────────────────────────────────────────────────────────────────────────────────────────
const nz = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const laTieuDeLoaiKhac = (n) => /^lo[aạ]i kh[aá]c\b/i.test(String(n?.tenVi || '').replace(/^[-\s–]+/, '').trim());
const laLoaiKhacTranTen = (n) => /^lo[aạ]i kh[aá]c\s*(\(SEN\))?\s*[:：]?\s*$/i.test(String(n?.tenVi || '').replace(/^[-\s–]+/, '').trim());
function napSoTay(h4, opts) {
  if (opts && Object.prototype.hasOwnProperty.call(opts, 'soTay')) return opts.soTay && opts.soTay.nhom === h4 ? opts.soTay : null;
  return require('./so-tay-gates').loadSoTay(h4);
}
function mucCua(soTay, n) {
  if (!soTay) return null;
  if (n.cap === 8) return (soTay.dong8 || []).find((d) => nz(d.hs) === n.id) || null;
  return (soTay.dieuKienNut || []).find((d) => nz(d.id) === n.id) || null;
}
const coDieuKien = (m) => Boolean(m && Array.isArray(m.dieuKienSo) && m.dieuKienSo.length);
const nguonCua = (m) => (m ? { nguonLoai: m.nguonLoai || 'AI_DA_KIEM', ma: m.nguon || null, trich: m.trich || null } : null);
const capCua = (n) => (typeof n.cap === 'number' ? n.cap : n.id.length);

/**
 * Cấu trúc ranh giới 6→8 số của dòng `hs` (không cần dữ kiện): danh sách nhóm yêu cầu
 * { cap, nut, chieu: PHAI_CO|PHAI_KHONG, dieuKien: object[]|null (null = chưa số hoá), nguon }.
 * @returns {{hs:string, pn6:string|null, nhom:object[], lyDo?:string}}
 */
function duongDiDong8(hs, opts = {}) {
  const code = nz(hs);
  const t = T.tree();
  const n0 = code.length === 8 ? t.nodes.get(code) : null;
  if (!n0 || n0.cap !== 8) return { hs: code, pn6: null, nhom: [], lyDo: 'ma-khong-co-trong-cay' };
  const pn6 = code.slice(0, 6);
  const soTay = napSoTay(code.slice(0, 4), opts);
  if (!soTay) return { hs: code, pn6, nhom: [], lyDo: 'nhom-chua-co-so-tay' };
  const nhom = [];
  const phaiCo = (n) => { const m = mucCua(soTay, n); nhom.push({ cap: capCua(n), nut: n.id, chieu: 'PHAI_CO', dieuKien: coDieuKien(m) ? m.dieuKienSo : null, nguon: nguonCua(m) }); };
  let n = n0;
  while (n && n.parent && n.id !== pn6) {
    const p = t.nodes.get(n.parent);
    if (!p) break;
    const m = mucCua(soTay, n);
    const laLK = n.cap === 8 ? Boolean(n.loaiKhac) : (laTieuDeLoaiKhac(n) || !n.tenVi);
    if (!laLK) phaiCo(n);
    else {
      // "Loại khác, <vế>" (dòng hoặc tiêu đề): vế riêng là điều kiện khẳng định
      const tran = n.cap === 8 ? Boolean(n.loaiKhacTran) : (laLoaiKhacTranTen(n) || !n.tenVi);
      if (!tran || coDieuKien(m)) phaiCo(n);
      for (const id of p.children) {
        if (id === n.id) continue;
        const s = t.nodes.get(id);
        if (s.cap === 8 && s.loaiKhacTran) continue;
        const ms = mucCua(soTay, s);
        const sTran = s.cap !== 8 && (laLoaiKhacTranTen(s) || !s.tenVi);
        nhom.push({ cap: capCua(s), nut: s.id, chieu: 'PHAI_KHONG', dieuKien: coDieuKien(ms) && !sTran ? ms.dieuKienSo : null, nguon: nguonCua(ms) });
      }
    }
    if (p.id === pn6 || p.cap === 6 || p.cap === 4) break;
    n = p;
  }
  return { hs: code, pn6, nhom };
}

const tomDk = (ds) => (ds.length === 1 ? ds[0] : { op: 'VA', cacDieuKien: ds });
function gopKetQua(ds) {
  return ds.reduce((a, b) => (UU_TIEN[b] > UU_TIEN[a] ? b : a), 'CO');
}
const tuTT = { THOA: 'CO', TRAI: 'MAU_THUAN', CHUA_BIET: 'THIEU' };

/**
 * Đối chiếu dữ kiện có kiểu với ranh giới 6→8 số của MỘT dòng (spec §8.3 bước 3, phần ranh giới).
 * @param {string} hs mã 8 số
 * @param {object[]} duKien spec §8.1 duKien[]
 * @param {{soTay?: object|null}} opts soTay tiêm (fixture); bỏ trống → data/so-tay/<nhóm>.json
 * @returns {{hs, ketQua:'CO'|'THIEU'|'MAU_THUAN'|'CHUA_SO_HOA', coCanCuTatDinh:boolean, duongDi:object[], thieu:{fact,cauHoi}[]}}
 */
function doiChieuDong8(hs, duKien, opts = {}) {
  const dd = duongDiDong8(hs, opts);
  const F = duKien instanceof Map ? duKien : chuanDuKien(duKien);
  const layF = (c) => { const f = F.get(factCuaDk(c)); return c.op === 'HOAC' ? { _map: F } : f || null; };
  const duongDi = [];
  const thieuF = new Set();
  if (!dd.nhom.length) {
    return { hs: dd.hs, ketQua: 'CHUA_SO_HOA', coCanCuTatDinh: false, duongDi: [{ cap: 8, nut: dd.hs, dieuKien: null, chieu: 'PHAI_CO', nguon: null, ketQua: 'CHUA_SO_HOA', tatDinh: true, lyDo: dd.lyDo }], thieu: [] };
  }
  for (const g of dd.nhom) {
    const base = { cap: g.cap, nut: g.nut, chieu: g.chieu, nguon: g.nguon };
    if (!g.dieuKien) { duongDi.push({ ...base, dieuKien: null, ketQua: 'CHUA_SO_HOA', tatDinh: true }); continue; }
    const r = g.dieuKien.map((c) => ({ c, ...danhGiaDieuKien(c, layF(c)) }));
    const ghiThieu = (x) => { if (x.trangThai === 'CHUA_BIET') thieuF.add(factCuaDk(x.c) || 'HOAC'); };
    if (g.chieu === 'PHAI_CO') {
      for (const x of r) {
        ghiThieu(x);
        duongDi.push({ ...base, dieuKien: x.c, ketQua: tuTT[x.trangThai], tatDinh: x.tatDinh, ...(x.giaTriDocDuoc !== undefined ? { giaTriDocDuoc: x.giaTriDocDuoc } : {}), ...(x.lyDo ? { lyDo: x.lyDo } : {}) });
      }
    } else {
      // Phủ định một anh em: hàng KHÔNG thuộc s ⇔ ít nhất một điều kiện của s TRÁI.
      const trai = r.filter((x) => x.trangThai === 'TRAI');
      let ketQua; let tatDinh;
      if (trai.length) { ketQua = 'CO'; tatDinh = trai.some((x) => x.tatDinh); } else if (r.every((x) => x.trangThai === 'THOA')) { ketQua = 'MAU_THUAN'; tatDinh = r.every((x) => x.tatDinh); } else { ketQua = 'THIEU'; tatDinh = true; r.forEach(ghiThieu); }
      duongDi.push({ ...base, dieuKien: tomDk(g.dieuKien), ketQua, tatDinh });
    }
  }
  const ketQua = gopKetQua(duongDi.map((e) => e.ketQua));
  const quyetDinh = duongDi.filter((e) => e.ketQua === ketQua);
  const coCanCuTatDinh = ketQua === 'CO' ? duongDi.every((e) => e.tatDinh) : ketQua === 'MAU_THUAN' ? quyetDinh.some((e) => e.tatDinh) : false;
  const thieu = [...thieuF].map((fact) => { const k = khoaTV(fact); return { fact, cauHoi: k ? TV.cauHoiCho(fact, 'vi') : null }; });
  return { hs: dd.hs, ketQua, coCanCuTatDinh, duongDi, thieu };
}

/** Đối chiếu mọi dòng 8 số của phân nhóm 6 số. dongCo = các dòng CO (đúng một dòng = ranh giới đã chốt). */
function doiChieuPhanNhom(pn6, duKien, opts = {}) {
  const code = nz(pn6).slice(0, 6);
  const t = T.tree();
  const la = [];
  const walk = (id) => { const x = t.nodes.get(id); if (!x) return; if (x.cap === 8) { la.push(x.id); return; } x.children.forEach(walk); };
  const goc = T.nodeOf(code);
  if (goc) walk(goc.id);
  const F = chuanDuKien(duKien);
  const dong = la.filter((h) => h.startsWith(code)).map((h) => { const r = doiChieuDong8(h, F, opts); return { hs: h, ketQua: r.ketQua, coCanCuTatDinh: r.coCanCuTatDinh }; });
  return { pn6: code, dong, dongCo: dong.filter((d) => d.ketQua === 'CO').map((d) => d.hs) };
}

/** Lời ngắn của một điều kiện (cho câu lý do / cảnh báo): "đường kính lõi <= 5 mm", "có lưới bảo vệ", "loại dòng điện: xoay chiều". */
function moTaNgan(c) {
  if (!c) return '';
  const k = khoaTV(c.fact);
  const nhan = k?.nhanVi || String(c.fact || '').replace(/_/g, ' ');
  const pk = c.chieu === 'PHAI_KHONG' ? 'không ' : '';
  if (c.op === 'CO') return nhan;
  if (c.op === 'KHONG') return `không: ${nhan}`;
  if (c.op === 'TRONG') return `${pk}${nhan}: ${dsGiaTri(c.value).map((v) => k?.moTaGiaTri?.[v]?.nhanVi || v).join(' hoặc ')}`;
  if (c.op === 'TEN_LOAI' || c.op === 'CONG_DUNG') return `${pk}${nhan}: ${dsGiaTri(c.value).join(' hoặc ')}`;
  if (c.op === 'LA') return `${pk}${nhan}${c.viTri && c.viTri !== 'CHINH' ? ` (${k?.moTaViTri?.[c.viTri]?.nhanVi || c.viTri})` : ''}: ${dsGiaTri(c.value).join(' hoặc ')}`;
  return `${nhan} ${c.op} ${c.value}${c.donVi ? ` ${c.donVi}` : ''}`;
}

module.exports = {
  OP_MOI, OP_SO, CHIEU, KET_QUA, OP_THEO_KIEU,
  laFactTuVung, kiemDieuKien, chuanDuKien, danhGiaDieuKien, danhGiaTuChu,
  duongDiDong8, doiChieuDong8, doiChieuPhanNhom, gopKetQua, moTaNgan, coMau, mauCua,
};
