// lib/chi-muc-luat.js — CHỈ MỤC NGHĨA TRÊN NÚT LUẬT (M-37, #1924). Chỉ là CỬA VÀO, không phải kết luận.
//
// Trả: id câu + câu + câu dẫn + nút + đường dẫn cha (Phần › Chương › Nhóm). KHÔNG trả mã 8 số như kết luận,
// KHÔNG tờ khai, KHÔNG từ điển tên thương mại, KHÔNG tiền lệ (lop TIEN_LE / tb:*), KHÔNG BO_TRO / THUC_TE, KHÔNG WCO bản scan (ocr:true).
// Không nối vào đường khách nào (không ai require tệp này ngoài chỗ cắm `timNghia` của M-41 và script dựng).
//
// Chỉ mục (data/luat-goc/chi-muc/): vec.bin (int8, chuẩn hoá, 384 chiều) · id.json · meta.json (sha256 các kho nguồn).
// Kho nguồn lệch sha so với lúc dựng → trả {trangThai:'CU'}, không trả kết quả cũ.
// Mô hình: dùng lại pipeline `khoiTaoModel()` của lib/embed-pool.js (Xenova/multilingual-e5-small q8) — không nạp bản thứ hai.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const GOC_MAC_DINH = path.join(__dirname, '..', 'data', 'luat-goc');
const SECTIONS_MAC_DINH = path.join(__dirname, '..', 'data', 'hs-sections.json');
const DIM = 384;
const SCALE = 127;
const KHUON = 'chi-muc-luat@1';
const TIEN_TO_PASSAGE = 'passage: ';
/** Kho vào chỉ mục. Không có: gir, wco (bản scan OCR), thong-bao (tiền lệ). */
const KHO = Object.freeze(['phan', 'chuong', 'nhom', 'phan-nhom', 'sen', 'bieu']);
/** Từ biểu chỉ lấy TÊN cấp chương / nhóm / phân nhóm 6 số; không dòng 8 số, không tiêu đề không mã. */
const CAP_BIEU_VAO = new Set(['CHUONG', 'NHOM', 'PHAN_NHOM']);
const KHO_THEO_TIEN_TO = Object.freeze({ phan: 'phan', chuong: 'chuong', nhom: 'nhom', pn: 'phan-nhom', sen: 'sen', bieu: 'bieu' });

// ───────────────────────────── đọc kho ─────────────────────────────
function docJsonl(tep) {
  if (!fs.existsSync(tep)) return [];
  return fs.readFileSync(tep, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const shaTep = (tep) => (fs.existsSync(tep) ? sha256(fs.readFileSync(tep)) : null);
const gon = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const cat = (s, n) => (s.length > n ? `${s.slice(0, n).trim()}…` : s);

/** Các tệp nguồn của chỉ mục: tên ngắn → đường dẫn. */
function tepNguon(thuMuc = GOC_MAC_DINH, sections = SECTIONS_MAC_DINH) {
  const ra = {};
  for (const k of KHO) { ra[`${k}.jsonl`] = path.join(thuMuc, `${k}.jsonl`); ra[`cau/${k}.jsonl`] = path.join(thuMuc, 'cau', `${k}.jsonl`); }
  ra['hs-sections.json'] = sections;
  return ra;
}
function shaNguon(thuMuc, sections) {
  const ra = {};
  for (const [ten, tep] of Object.entries(tepNguon(thuMuc, sections))) ra[ten] = shaTep(tep);
  return ra;
}

/** Nút nào KHÔNG BAO GIỜ vào chỉ mục (cổng M-23 + lời giao thẻ). */
function laNutCam(x) {
  if (!x || !x.id) return true;
  if (x.lop === 'TIEN_LE' || x.lop === 'BO_TRO' || x.lop === 'THUC_TE') return true;
  if (x.loai === 'THONG_BAO' || x.loai === 'Y_KIEN_WCO' || x.loai === 'BO_TRO' || x.loai === 'THUC_TE') return true;
  if (/^(tb|wco):/.test(x.id)) return true;
  if (x.ocr === true) return true;
  return false;
}
function nutVaoChiMuc(x, kho) {
  if (laNutCam(x)) return false;
  if (kho === 'bieu') return CAP_BIEU_VAO.has(x.cap) && /^bieu:(\d{2}|\d{4}|\d{6})$/.test(x.id);
  return true;
}
const khoCuaId = (id) => KHO_THEO_TIEN_TO[String(id).split(':')[0]] || null;
const nutCuaCau = (cauId) => cauId.slice(0, cauId.lastIndexOf('#'));

// ───────────────────────────── bảng tên & đường dẫn cha ─────────────────────────────
/** Tên Phần / Chương / Nhóm / Phân nhóm 6 số (chỉ chữ in trong kho gốc) + chương → phần. */
function taoBangTen({ phan = [], chuong = [], bieu = [], sections = null } = {}) {
  const b = { phan: new Map(), chuong: new Map(), nhom: new Map(), pn: new Map(), chuongPhan: new Map() };
  for (const x of phan) { const m = /^phan:([IVX]+)$/.exec(x.id); if (m && x.loai === 'TEN') b.phan.set(m[1], gon(x.nguyenVan)); }
  for (const x of chuong) { const m = /^chuong:(\d{2})$/.exec(x.id); if (m && x.loai === 'TEN') b.chuong.set(m[1], gon(x.nguyenVan)); }
  for (const x of bieu) {
    if (laNutCam(x)) continue;
    const ten = gon(String(x.nguyenVan).replace(/^[-–\s]+/, '').replace(/\s*:\s*$/, ''));
    let m = /^bieu:(\d{4})$/.exec(x.id);
    if (m && x.cap === 'NHOM') b.nhom.set(m[1], `Nhóm ${x.so || `${m[1].slice(0, 2)}.${m[1].slice(2)}`}: ${ten}`);
    m = /^bieu:(\d{6})$/.exec(x.id);
    if (m && x.cap === 'PHAN_NHOM') b.pn.set(m[1], `Phân nhóm ${x.so || `${m[1].slice(0, 4)}.${m[1].slice(4)}`}: ${ten}`);
  }
  for (const s of (sections && sections.sections) || []) for (const c of s.chapters || []) b.chuongPhan.set(String(c).padStart(2, '0'), s.code);
  return b;
}

/** Đường dẫn cha của một nút, từ id. Mảng [{id, ten}] theo thứ tự Phần › Chương › Nhóm (› Phân nhóm 6 số). Không bao giờ có mã 8 số. */
function duongDanCha(id, b) {
  const ra = [];
  const them = (kieu, ma) => {
    if (kieu === 'phan' && b.phan.has(ma)) ra.push({ id: `phan:${ma}`, ten: b.phan.get(ma) });
    if (kieu === 'chuong' && b.chuong.has(ma)) ra.push({ id: `chuong:${ma}`, ten: b.chuong.get(ma) });
    if (kieu === 'nhom' && b.nhom.has(ma)) ra.push({ id: `bieu:${ma}`, ten: b.nhom.get(ma) });
    if (kieu === 'pn' && b.pn.has(ma)) ra.push({ id: `bieu:${ma}`, ten: b.pn.get(ma) });
  };
  const tuChuong = (c2, toiNhom, toiPn) => {
    them('phan', b.chuongPhan.get(c2)); them('chuong', c2);
    if (toiNhom) them('nhom', toiNhom);
    if (toiPn) them('pn', toiPn);
  };
  let m;
  if ((m = /^phan:([IVX]+)(:|$)/.exec(id))) { if (id !== `phan:${m[1]}`) them('phan', m[1]); return ra; }
  if ((m = /^chuong:(\d{2})(:|$)/.exec(id))) { them('phan', b.chuongPhan.get(m[1])); if (id !== `chuong:${m[1]}`) them('chuong', m[1]); return ra; }
  if ((m = /^nhom:(\d{4}):/.exec(id))) { tuChuong(m[1].slice(0, 2), m[1]); return ra; }
  if ((m = /^pn:(\d{6}):/.exec(id))) { tuChuong(m[1].slice(0, 2), m[1].slice(0, 4), m[1]); return ra; }
  if ((m = /^sen:(\d{4,8}):/.exec(id))) { tuChuong(m[1].slice(0, 2), m[1].slice(0, 4), m[1].length >= 6 ? m[1].slice(0, 6) : null); return ra; }
  if ((m = /^sen:chuong:(\d{2}):/.exec(id))) { tuChuong(m[1]); return ra; }
  if ((m = /^sen:phan:([IVX]+):/.exec(id))) { them('phan', m[1]); return ra; }
  if ((m = /^bieu:(\d{2})$/.exec(id))) { them('phan', b.chuongPhan.get(m[1])); return ra; }
  if ((m = /^bieu:(\d{4})$/.exec(id))) { tuChuong(m[1].slice(0, 2)); return ra; }
  if ((m = /^bieu:(\d{6})$/.exec(id))) { tuChuong(m[1].slice(0, 2), m[1].slice(0, 4)); return ra; }
  return ra;
}

/** Tiêu đề cha không mã của một dòng biểu ("Ngựa:") làm câu dẫn; rỗng nếu không có. */
function tieuDeCha(n, bieuTheoId) {
  const tieuDe = []; let cur = bieuTheoId.get(n.cha);
  for (let hop = 0; cur && hop < 3 && cur.cap !== 'NHOM' && cur.cap !== 'CHUONG'; hop += 1) {
    if (cur.cap === 'TIEU_DE_PHAN_NHOM' || cur.cap === 'PHAN_NHOM') tieuDe.unshift(gon(String(cur.nguyenVan).replace(/^[-–\s]+/, '').replace(/\s*:\s*$/, '')));
    cur = bieuTheoId.get(cur.cha);
  }
  return tieuDe.length ? cat(tieuDe.join(' › '), 200) : null;
}

// ───────────────────────────── mục chỉ mục (dùng chung với script dựng) ─────────────────────────────
/**
 * Mọi mục của một kho: {id, nut, kho, chu, dan, danId, duong[], laDan}. `chu` = nguyenVan.slice(tu, den).
 * Câu dẫn của biểu = tiêu đề cha không mã ("Ngựa:"); của kho khác = `dan` trong kho câu M-31.
 */
function mucCuaKho(kho, dongNut, dongCau, b, bieuTheoId = null) {
  const nut = new Map(); for (const x of dongNut) nut.set(x.id, x);
  const chuCau = new Map(); const cauTheoId = new Map();
  for (const c of dongCau) {
    const n = nut.get(nutCuaCau(c.id)); if (!n) continue;
    chuCau.set(c.id, gon(String(n.nguyenVan).slice(c.tu, c.den))); cauTheoId.set(c.id, c);
  }
  const laDanCuaAi = new Set(); for (const c of dongCau) if (c.dan) laDanCuaAi.add(c.dan);
  const ra = [];
  for (const c of dongCau) {
    const n = nut.get(nutCuaCau(c.id));
    if (!n || !nutVaoChiMuc(n, kho)) continue;
    const chu = chuCau.get(c.id); if (!chu || chu.replace(/[^\p{L}\p{N}]/gu, '').length < 3) continue;
    // Câu dẫn trần ("Nhóm này không bao gồm:") không thành mục riêng: các mục con mang nó.
    const laDan = kho !== 'bieu' && laDanCuaAi.has(c.id) && /:\s*$/.test(chu); //   tên trong biểu luôn là mục (tên phân nhóm 6 số có thể kết bằng dấu hai chấm)
    if (laDan) continue;
    let dan = null; let danId = null;
    if (c.dan && chuCau.has(c.dan)) { dan = cat(chuCau.get(c.dan), 200); danId = c.dan; }
    else if (kho === 'bieu' && n.cha && bieuTheoId) {
      const td = tieuDeCha(n, bieuTheoId); if (td) { dan = td; danId = n.cha; }
    }
    ra.push({ id: c.id, nut: n.id, kho, chu: cat(chu, 800), dan, danId, duong: duongDanCha(n.id, b).map((p) => p.ten) });
  }
  return ra;
}
/** Chữ đưa vào mô hình (chưa có tiền tố "passage: "): "đường dẫn cha | câu dẫn | câu". */
/** Mỗi cấp cắt ngắn (Phần 60, Chương 70, Nhóm/Phân nhóm 80 ký tự) để tên Phần dài không lấn câu. */
const CAT_CAP = [60, 70, 80, 80];
const chuNhung = (m) => [m.duong.map((t, i) => cat(t, CAT_CAP[Math.min(i, 3)])).join(' › '), m.dan, m.chu].filter(Boolean).join(' | ');

// ───────────────────────────── nạp & tìm ─────────────────────────────
const CACHE = new Map();
const CACHE_KHO = new Map();
function datLai() { CACHE.clear(); CACHE_KHO.clear(); }

/**
 * Nạp chỉ mục từ đĩa. {trangThai:'OK', ...} | {trangThai:'THIEU'} | {trangThai:'CU', tepLech[]} | {trangThai:'HONG', lyDo}.
 * Đủ điều kiện mới trả OK: meta khớp tệp, và sha256 mọi kho nguồn trùng với lúc dựng.
 */
function napChiMuc(thuMuc = GOC_MAC_DINH, { sections = SECTIONS_MAC_DINH } = {}) {
  const khoa = `${path.resolve(thuMuc)}|${sections}`;
  if (CACHE.has(khoa)) return CACHE.get(khoa);
  const dir = path.join(thuMuc, 'chi-muc');
  const tM = path.join(dir, 'meta.json'); const tI = path.join(dir, 'id.json'); const tV = path.join(dir, 'vec.bin');
  let kq;
  if (![tM, tI, tV].every((t) => fs.existsSync(t))) kq = { trangThai: 'THIEU', lyDo: 'chưa có chỉ mục (node scripts/luat-goc/chi-muc.mjs)' };
  else {
    try {
      const meta = JSON.parse(fs.readFileSync(tM, 'utf8')); const idf = JSON.parse(fs.readFileSync(tI, 'utf8')); const buf = fs.readFileSync(tV);
      const ids = Array.isArray(idf) ? idf : idf.ids;
      if (meta.khuon !== KHUON || meta.dim !== DIM) kq = { trangThai: 'HONG', lyDo: 'khuôn/chiều không khớp' };
      else if (!Array.isArray(ids) || ids.length !== meta.soMuc || buf.byteLength !== meta.soMuc * DIM) kq = { trangThai: 'HONG', lyDo: 'vec.bin / id.json không khớp meta.soMuc' };
      else if (sha256(buf) !== meta.vecSha256) kq = { trangThai: 'HONG', lyDo: 'vec.bin sai sha256' };
      else {
        const nay = shaNguon(thuMuc, sections); const lech = Object.keys(meta.nguon || {}).filter((k) => nay[k] !== meta.nguon[k]);
        const vec = new Int8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
        kq = lech.length
          ? { trangThai: 'CU', lyDo: 'kho luật gốc đã đổi sau lúc dựng chỉ mục — dựng lại: node scripts/luat-goc/chi-muc.mjs', tepLech: lech, meta }
          : { trangThai: 'OK', meta, ids, gom: Array.isArray(idf) ? {} : (idf.gom || {}), vec, thuMuc, sections };
      }
    } catch (e) { kq = { trangThai: 'HONG', lyDo: String(e.message || e).slice(0, 160) }; }
  }
  CACHE.set(khoa, kq);
  return kq;
}

/** Tích trong int8 / SCALE, lấy k mục cao điểm nhất (ổn định: bằng điểm thì mục đứng trước thắng). */
function topK(q, vec, soMuc, k) {
  const gt = new Int32Array(k).fill(-1); const diem = new Float32Array(k).fill(-Infinity); let thap = 0; let vt = -Infinity;
  const inv = 1 / SCALE;
  for (let i = 0; i < soMuc; i += 1) {
    const b = i * DIM; let s = 0;
    for (let d = 0; d < DIM; d += 1) s += q[d] * vec[b + d];
    s *= inv;
    if (s > vt) {
      diem[thap] = s; gt[thap] = i; thap = 0; vt = diem[0];
      for (let j = 1; j < k; j += 1) if (diem[j] < vt) { vt = diem[j]; thap = j; }
    }
  }
  const ra = []; for (let j = 0; j < k; j += 1) if (gt[j] >= 0) ra.push({ i: gt[j], diem: diem[j] });
  return ra.sort((a, b) => (b.diem - a.diem) || (a.i - b.i));
}

function khoDaNap(thuMuc, kho) {
  const khoa = `${path.resolve(thuMuc)}|${kho}`;
  if (!CACHE_KHO.has(khoa)) {
    const nut = new Map(); for (const x of docJsonl(path.join(thuMuc, `${kho}.jsonl`))) nut.set(x.id, x);
    const cau = new Map(); for (const c of docJsonl(path.join(thuMuc, 'cau', `${kho}.jsonl`))) cau.set(c.id, c);
    CACHE_KHO.set(khoa, { nut, cau });
  }
  return CACHE_KHO.get(khoa);
}
function chuCauTu(thuMuc, cauId) {
  const kho = khoCuaId(cauId); if (!kho) return null;
  const { nut, cau } = khoDaNap(thuMuc, kho); const c = cau.get(cauId); const n = c && nut.get(nutCuaCau(cauId));
  return n ? gon(String(n.nguyenVan).slice(c.tu, c.den)) : null;
}
let BANG_TEN = null; let BANG_KHOA = null;
function bangTenCua(thuMuc, sections) {
  const khoa = `${path.resolve(thuMuc)}|${sections}`;
  if (BANG_KHOA !== khoa) {
    const sec = fs.existsSync(sections) ? JSON.parse(fs.readFileSync(sections, 'utf8')) : null;
    BANG_TEN = taoBangTen({ phan: [...khoDaNap(thuMuc, 'phan').nut.values()], chuong: [...khoDaNap(thuMuc, 'chuong').nut.values()], bieu: [...khoDaNap(thuMuc, 'bieu').nut.values()], sections: sec });
    BANG_KHOA = khoa;
  }
  return BANG_TEN;
}

/**
 * Tìm theo nghĩa. Trả nút (gộp theo nút, giữ câu nhắc), KHÔNG kết luận, KHÔNG mã 8 số.
 * @param {string} q lời thường của người dùng
 * @param {{limit?:number, thuMuc?:string, sections?:string, embedder?:(q:string)=>Promise<ArrayLike<number>|null>}} opts
 * @returns {Promise<{trangThai:'OK'|'CU'|'THIEU'|'HONG'|'LOI', ketQua:Array, ...}>}
 */
async function timNghia(q, { limit = 10, thuMuc = GOC_MAC_DINH, sections = SECTIONS_MAC_DINH, embedder = null } = {}) {
  const gioHan = Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 50);
  const chiMuc = napChiMuc(thuMuc, { sections });
  if (chiMuc.trangThai !== 'OK') return { trangThai: chiMuc.trangThai, lyDo: chiMuc.lyDo, ...(chiMuc.tepLech ? { tepLech: chiMuc.tepLech } : {}), ketQua: [] };
  const hoi = gon(q).slice(0, 600);
  if (hoi.replace(/[^\p{L}\p{N}]/gu, '').length < 2) return { trangThai: 'LOI', lyDo: 'câu hỏi quá ngắn', ketQua: [] };
  let vec = null;
  try {
    if (typeof embedder === 'function') vec = await embedder(hoi);
    else vec = await require('./embed-pool.js').embedCau(hoi); //   dùng chung pipeline khoiTaoModel(), tiền tố "query: "
  } catch { vec = null; }
  if (!vec || vec.length !== DIM) return { trangThai: 'LOI', lyDo: 'không nhúng được câu hỏi (mô hình chưa nạp?)', ketQua: [] };

  const { ids, gom, vec: v, meta } = chiMuc;
  const trung = topK(Float32Array.from(vec), v, meta.soMuc, Math.min(meta.soMuc, Math.max(gioHan * 12, 80)));
  const theoNut = new Map();
  for (const { i, diem } of trung) {
    const cauId = ids[i]; if (/^(tb|wco):/.test(cauId)) continue; //   phòng xa: dù chỉ mục có lẫn cũng không trả tiền lệ / WCO
    const nutId = nutCuaCau(cauId);
    if (!theoNut.has(nutId)) theoNut.set(nutId, { nutId, diem, cau: [] });
    theoNut.get(nutId).cau.push({ id: cauId, diem: +diem.toFixed(4) });
  }
  const b = bangTenCua(thuMuc, sections);
  const ketQua = [...theoNut.values()].sort((x, y) => (y.diem - x.diem) || (x.nutId < y.nutId ? -1 : 1)).slice(0, gioHan).map((n) => {
    const kho = khoCuaId(n.nutId); const nut = khoDaNap(thuMuc, kho).nut.get(n.nutId);
    return {
      nut: n.nutId, kho, lop: nut?.lop || null, loai: nut?.loai || null, trang: nut?.nguon?.trang ?? null, diem: +n.diem.toFixed(4),
      duongDan: duongDanCha(n.nutId, b),
      cau: n.cau.slice(0, 3).map((c) => {
        const cung = gom[c.id] || [c.id]; const c0 = khoDaNap(thuMuc, kho).cau.get(c.id);
        const danId = c0?.dan || (kho === 'bieu' ? nut?.cha || null : null); const danChu = c0?.dan ? chuCauTu(thuMuc, c0.dan) : (kho === 'bieu' && nut?.cha ? tieuDeCha(nut, khoDaNap(thuMuc, 'bieu').nut) : null);
        return { id: c.id, diem: c.diem, chu: cung.map((x) => chuCauTu(thuMuc, x)).filter(Boolean).join(' '), ...(cung.length > 1 ? { gom: cung } : {}), dan: danChu ? { id: danId, chu: cat(danChu, 300) } : null };
      }),
    };
  });
  return { trangThai: 'OK', moHinh: meta.moHinh, soMuc: meta.soMuc, tong: ketQua.length, ketQua, luuY: 'Cửa vào để gọi phaiDoc, không phải kết luận; không có mã 8 số, không tiền lệ, không tờ khai.' };
}

module.exports = {
  KHUON, DIM, SCALE, KHO, TIEN_TO_PASSAGE, GOC_MAC_DINH, SECTIONS_MAC_DINH,
  timNghia, napChiMuc, datLai, topK,
  tepNguon, shaNguon, sha256, docJsonl, gon, cat,
  laNutCam, nutVaoChiMuc, khoCuaId, nutCuaCau,
  taoBangTen, duongDanCha, mucCuaKho, chuNhung, tieuDeCha,
};
