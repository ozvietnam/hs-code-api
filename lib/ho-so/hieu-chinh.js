/**
 * lib/ho-so/hieu-chinh.js — BẢNG HIỆU CHỈNH TIỀN LỆ (plan L1-4b; spec hồ sơ §8.1 `duongDiPhapLy[].hieuChinh`, §11).
 *
 * Khi TB-TCHQ kết luận vào một dòng 8 số khác dòng mà chữ biểu thuế trỏ tới (vd 8544.42.99: cáp sạc bọc plastic lõi < 5 mm,
 * chữ biểu .94, TB-TCHQ 1709 xếp .99), đường đi pháp lý phải ghi CẢ HAI và KHÔNG tự chọn bên. Bảng
 * data/ho-so/hieu-chinh-tien-le.json (phiên bản `hieu-chinh-tien-le@1`) giữ các mục:
 *
 *   { id, maHs, dongChuBieu, loai, dieuKien?, tbTchq[], chuBieu[], lyDo, duyetBoi, phanXu?, ghiChu?, nguonLoai }
 *
 *   maHs         dòng 8 số TB-TCHQ kết luận (khoá của bản ghi trong precedents.json).
 *   dongChuBieu  dòng 8 số anh em mà chữ biểu (đọc thuần) trỏ tới / tín hiệu lat-1 nghi.
 *   loai         TIEN_LE_THAY_CHU_BIEU — tiền lệ thay chữ biểu trong phạm vi `dieuKien`: CHỈ khi ≥ 2 TB-TCHQ (số hiệu khác
 *                                        nhau, đuôi /TB-TCHQ) cùng kết luận maHs, hoặc người đã phân xử (duyetBoi NGUOI_DUYET +
 *                                        phanXu đủ {nguoi, ngay YYYY-MM-DD, quyetDinh, kenh}). Máy/AI không bao giờ tự
 *                                        ghi NGUOI_DUYET: chỉ chép lại quyết định của người, kèm kênh (phiên/issue) ghi nhận nó.
 *                LECH_CHUA_PHAN_XU     — lệch chưa ai phân xử ⇒ L1-5b gán ketQua CHUA_SO_HOA cho ranh giới đó và
 *                                        ketLuan.trangThai CAN_CHUYEN_GIA.
 *                KHONG_LECH            — (mở rộng của plan, ghi trong PR L1-4b) tín hiệu máy nghi của lat-1 đã soát: hàng trong
 *                                        TB-TCHQ không thoả chữ của dongChuBieu (câu trích hai bên chứng minh) ⇒ không có lệch;
 *                                        ghi lại để không ai soát lại và để cổng duyệt ranh giới biết phân nhóm đã được soát.
 *   dieuKien     phạm vi hàng mà mục áp (một điều kiện có kiểu hoặc mảng VÀ; khoá tu-vung@1) — mọi giá trị phải có trong câu
 *                trích TB-TCHQ kết luận maHs (máy kiểm bằng lib/dieu-kien-so.js#kiemDieuKien). Không có ⇒ cả ranh giới.
 *   tbTchq[]     { soHieu, viTri: 'precedents.json#<khoá>[i]', trich } — trích NGUYÊN VĂN từ productName + technicalSpec của
 *                đúng bản ghi (đoạn lược "…" đúng thứ tự), phải kèm mã kết luận (chữ số của <khoá>). Khoá = maHs hoặc dongChuBieu.
 *   chuBieu[]    { nguon: tax.<id> | tieuDe.<id> | sen.<id>, trich } — chữ biểu thuế / SEN nguyên văn của dongChuBieu (hoặc tiêu
 *                đề tổ tiên của nó). Không nhận nguồn AI_CHUA_KIEM hay tóm tắt KG.
 *   duyetBoi     null | 'NGUOI_DUYET'. NGUOI_DUYET ⇔ có phanXu đủ bốn trường; không nhận cho LECH_CHUA_PHAN_XU (đã phân xử thì đổi loại).
 *   phanXu       { nguoi, ngay, quyetDinh, kenh } — ai quyết, ngày (YYYY-MM-DD), quyết định gì, qua kênh nào (đường dẫn phiên/issue).
 *   ghiChu       chữ tự do của người (vd "chưa chốt, hỏi lại người khai") — KHÔNG phải phân xử, không đổi loại hay ngưỡng.
 *
 * Tất định, chỉ đọc (dataReadPath), không gọi LLM.
 */
const fs = require('fs');
const S = require('../so-tay');
const DK = require('../dieu-kien-so');
const { nhanCuaTep, NHAN_MUC_SOAN } = require('../nguon-loai');
const { dataReadPath } = require('../data-paths');

const PHIEN_BAN = 'hieu-chinh-tien-le@1';
const TEP_BANG = ['ho-so', 'hieu-chinh-tien-le.json'];
const LOAI = ['TIEN_LE_THAY_CHU_BIEU', 'LECH_CHUA_PHAN_XU', 'KHONG_LECH'];
const NGUONG_TIEN_LE = 2;
const TEP_CHU_BIEU = { tax: 'tax.json', tieuDe: 'bieu-thue/ten-nut/ten-nut.json', sen: 'sen-2022.json' };
const TRICH_TOI_DA = 600;
const TRUONG_PHAN_XU = ['nguoi', 'ngay', 'quyetDinh', 'kenh'];
const laNgay = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v).trim());
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
};

const nz = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const mang = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const laTbTchq = (so) => /\/TB-TCHQ$/i.test(String(so || '').trim());

let _prec = null; let _lat1 = null;
function precedentsThat() { if (!_prec) _prec = JSON.parse(fs.readFileSync(dataReadPath('precedents.json'), 'utf8')); return _prec; }
function lat1That() { if (!_lat1) _lat1 = JSON.parse(fs.readFileSync(dataReadPath('ho-so', 'lat-1.json'), 'utf8')); return _lat1; }
const _nguon = new Map();
function nguonChuBieuThat(h4) {
  if (!_nguon.has(h4)) _nguon.set(h4, { ...S.sourcesFor(h4), ...S.nguonTieuDe(h4) });
  return _nguon.get(h4);
}

/** Mọi đoạn lược ("…"/"...") có trong nguồn, đúng thứ tự (so sau squash: bỏ dấu câu/khoảng trắng, giữ dấu tiếng Việt). */
function coNguyenVan(trich, src) {
  const frags = String(trich || '').split(/…|\.{3,}/).map(S.squash).filter(Boolean);
  if (!frags.length) return false;
  const s = S.squash(src); let pos = 0;
  for (const f of frags) { const i = s.indexOf(f, pos); if (i < 0) return false; pos = i + f.length; }
  return true;
}

const RE_VI_TRI = /^precedents\.json#(\d{4,10})\[(\d+)\]$/;
function docViTri(viTri, prec) {
  const m = RE_VI_TRI.exec(String(viTri || ''));
  if (!m) return null;
  const ban = prec?.[m[1]]?.[Number(m[2])];
  return ban ? { khoa: m[1], i: Number(m[2]), ban } : null;
}

/** Nguồn chữ biểu có đúng nút không: tax/sen = chính dongChuBieu; tieuDe = tiêu đề tổ tiên của dongChuBieu. */
function nguonDungNut(loai, id, dong) {
  if (loai === 'tax' || loai === 'sen') return id === dong;
  if (loai === 'tieuDe') return id.length < 8 && dong.startsWith(id);
  return false;
}

function kiemMuc(m, idx, ctx) {
  const loi = [];
  const id = String(m?.id || `#${idx}`);
  const L = (ma, them = '') => loi.push(`hc-${ma}:${id}${them ? `:${them}` : ''}`);
  if (!m || typeof m !== 'object') { L('muc-khong-hop-le'); return loi; }
  if (!LOAI.includes(m.loai)) L('loai', String(m.loai || ''));
  const maHs = nz(m.maHs); const dong = nz(m.dongChuBieu);
  if (maHs.length !== 8) L('ma-hs', String(m.maHs || ''));
  if (!ctx.pn6Lat1.has(maHs.slice(0, 6))) L('ngoai-lat-1', maHs);
  if (dong.length !== 8 || dong === maHs || dong.slice(0, 6) !== maHs.slice(0, 6)) L('dong-chu-bieu', String(m.dongChuBieu || ''));
  if (!String(m.lyDo || '').trim()) L('ly-do-thieu');
  if (!NHAN_MUC_SOAN.includes(m.nguonLoai)) L('nguon-loai', String(m.nguonLoai || ''));
  if (nhanCuaTep('precedents.json') !== 'NGUYEN_VAN') L('tb-khong-nguyen-van');

  // Duyệt / phân xử
  if (m.duyetBoi != null && m.duyetBoi !== 'NGUOI_DUYET') L('duyet-boi', String(m.duyetBoi));
  const nguoiDuyet = m.duyetBoi === 'NGUOI_DUYET';
  if (nguoiDuyet) {
    const px = m.phanXu && typeof m.phanXu === 'object' ? m.phanXu : null;
    if (!px) L('nguoi-duyet-thieu-phan-xu');
    else {
      for (const k of TRUONG_PHAN_XU) if (typeof px[k] !== 'string' || !px[k].trim()) L('nguoi-duyet-thieu-phan-xu', k);
      if (typeof px.ngay === 'string' && px.ngay.trim() && !laNgay(px.ngay)) L('phan-xu-ngay', px.ngay);
    }
  } else if (m.phanXu != null) L('phan-xu-khong-nguoi-duyet');
  if (nguoiDuyet && m.loai === 'LECH_CHUA_PHAN_XU') L('lech-da-duyet');
  if (m.ghiChu !== undefined && (typeof m.ghiChu !== 'string' || !m.ghiChu.trim())) L('ghi-chu');
  // Dữ kiện phân biệt (factPhanBiet): khoá tu-vung runtime — PHAN_XU_TIEN_LE hỏi người khai đúng các dữ kiện này (lib/ho-so/doi-chieu.js)
  if (m.factPhanBiet !== undefined) {
    if (!Array.isArray(m.factPhanBiet) || !m.factPhanBiet.length) L('fact-phan-biet', 'khong-phai-mang');
    else for (const f of m.factPhanBiet) if (typeof f !== 'string' || !DK.laFactTuVung(f)) L('fact-phan-biet', String(f));
  }

  // TB-TCHQ
  const tbs = mang(m.tbTchq);
  if (!tbs.length) L('tb-thieu');
  const ketLuanMaHs = []; // trích của các TB-TCHQ kết luận maHs (dùng kiểm dieuKien)
  const soHieuMaHs = new Set();
  let nguocChieu = false;
  tbs.forEach((t, j) => {
    const v = docViTri(t?.viTri, ctx.precedents);
    if (!v) { L('tb-vi-tri', String(t?.viTri || j)); return; }
    const { khoa, ban } = v;
    if (String(ban.tbTchqNumber || '').trim() !== String(t.soHieu || '').trim()) L('tb-so-hieu-lech', `${t.viTri}:${t.soHieu}≠${ban.tbTchqNumber}`);
    if (String(ban.sourceType || '') !== 'TB-TCHQ') L('tb-khong-phai-tb-tchq', t.viTri);
    const tr = String(t.trich || '');
    if (tr.length > TRICH_TOI_DA || S.squash(tr).length < 12) L('tb-trich-do-dai', t.viTri);
    if (!coNguyenVan(tr, `${ban.productName || ''}\n${ban.technicalSpec || ''}`)) L('tb-trich-khong-co', t.viTri);
    if (!S.squash(tr).includes(khoa)) L('tb-trich-thieu-ma-ket-luan', t.viTri);
    if (khoa === maHs) { ketLuanMaHs.push(tr); soHieuMaHs.add(String(ban.tbTchqNumber).trim()); } else if (khoa === dong) nguocChieu = true;
    else L('tb-ngoai-cap', `${t.viTri}`);
  });
  if (tbs.length && !ketLuanMaHs.length) L('tb-khong-ket-luan-ma-hs', maHs);

  // Ngưỡng TIEN_LE_THAY_CHU_BIEU
  if (m.loai === 'TIEN_LE_THAY_CHU_BIEU') {
    if (nguocChieu) L('tb-nguoc-chieu');
    const soTb = [...soHieuMaHs].filter(laTbTchq).length;
    if (soTb < NGUONG_TIEN_LE && !nguoiDuyet) L('tien-le-thieu-2-tb', `${soTb}`);
  }

  // Chữ biểu
  const cbs = mang(m.chuBieu);
  if (!cbs.length) L('chu-bieu-thieu');
  const h4 = (dong || maHs).slice(0, 4);
  cbs.forEach((c, j) => {
    const s = String(c?.nguon || ''); const k = s.indexOf('.');
    const loai = s.slice(0, k); const cid = nz(s.slice(k + 1));
    if (!TEP_CHU_BIEU[loai]) { L('chu-bieu-nguon', s || String(j)); return; }
    if (nhanCuaTep(TEP_CHU_BIEU[loai]) !== 'NGUYEN_VAN') L('chu-bieu-khong-nguyen-van', s);
    if (!nguonDungNut(loai, cid, dong)) L('chu-bieu-sai-nut', s);
    const src = ctx.nguonChuBieu(h4)[s];
    if (src == null) { L('chu-bieu-nguon', s); return; }
    if (String(c.trich || '').length > TRICH_TOI_DA || !coNguyenVan(c.trich, src)) L('chu-bieu-trich-khong-co', s);
  });

  // Điều kiện phạm vi
  const dks = mang(m.dieuKien);
  const trTb = ketLuanMaHs.join('\n');
  for (const c of dks) {
    const l = DK.kiemDieuKien(c, trTb);
    if (l) L('dieu-kien', l);
  }
  return loi;
}

/**
 * Kiểm bảng hiệu chỉnh. `opts.phuKin` (mặc định true): mọi phân nhóm lat-1 cờ canHieuChinhTienLe phải có ≥ 1 mục.
 * Cảnh báo (không chặn): số hiệu trong tín hiệu `tienLeLech` của lat-1 mà chưa mục nào của phân nhóm nhắc tới.
 * @returns {{hopLe:boolean, loi:string[], canhBao:string[]}}
 */
function kiemBang(bang, opts = {}) {
  const ctx = {
    precedents: opts.precedents || precedentsThat(),
    nguonChuBieu: opts.nguonChuBieu || nguonChuBieuThat,
    lat1: opts.lat1 || lat1That(),
  };
  ctx.pn6Lat1 = new Set((ctx.lat1.phanNhom || []).map((p) => nz(p.pn6)));
  const loi = []; const canhBao = [];
  if (!bang || typeof bang !== 'object') return { hopLe: false, loi: ['hc-bang-khong-hop-le'], canhBao };
  if (bang.phienBan !== PHIEN_BAN) loi.push(`hc-phien-ban:${bang.phienBan || ''}`);
  if (!Array.isArray(bang.muc)) return { hopLe: false, loi: [...loi, 'hc-muc-khong-phai-mang'], canhBao };
  const thay = new Set();
  bang.muc.forEach((m, i) => {
    const id = String(m?.id || '');
    if (!id) loi.push(`hc-id-thieu:#${i}`);
    else if (thay.has(id)) loi.push(`hc-id-trung:${id}`);
    thay.add(id);
    loi.push(...kiemMuc(m, i, ctx));
  });
  // ghiNhanKhac[]: ghi chép soát ngoài phạm vi cờ (vd 401699) — trích tiền lệ vẫn phải nguyên văn.
  for (const g of mang(bang.ghiNhanKhac)) {
    for (const t of mang(g?.tienLe)) {
      const v = docViTri(t?.viTri, ctx.precedents);
      const id = `ghiNhanKhac.${nz(g?.pn6)}`;
      if (!v) { loi.push(`hc-tb-vi-tri:${id}:${t?.viTri || ''}`); continue; }
      if (String(v.ban.tbTchqNumber || '').trim() !== String(t.soHieu || '').trim()) loi.push(`hc-tb-so-hieu-lech:${id}:${t.viTri}`);
      if (!coNguyenVan(t.trich, `${v.ban.productName || ''}\n${v.ban.technicalSpec || ''}`)) loi.push(`hc-tb-trich-khong-co:${id}:${t.viTri}`);
      if (!S.squash(t.trich).includes(v.khoa)) loi.push(`hc-tb-trich-thieu-ma-ket-luan:${id}:${t.viTri}`);
    }
  }
  const coCo = (ctx.lat1.phanNhom || []).filter((p) => p.canHieuChinhTienLe);
  for (const p of coCo) {
    const pn6 = nz(p.pn6);
    const cua = bang.muc.filter((m) => nz(m?.maHs).startsWith(pn6));
    if (opts.phuKin !== false && !cua.length) loi.push(`hc-thieu-muc-cho-pn6:${pn6}`);
    if (!cua.length) continue;
    const daNhac = new Set(cua.flatMap((m) => mang(m.tbTchq).map((t) => String(t?.soHieu || '').trim())));
    for (const t of p.tienLeLech || []) {
      for (const so of String(t.soHieu || '').split(';').map((x) => x.trim()).filter(Boolean)) {
        if (!daNhac.has(so)) canhBao.push(`hc-tin-hieu-chua-soat:${pn6}:${so}`);
      }
    }
  }
  return { hopLe: loi.length === 0, loi, canhBao: [...new Set(canhBao)] };
}

/** Bảng commit (đọc qua dataReadPath). Không có ⇒ { muc: [] }. */
function taiBang() {
  try { return JSON.parse(fs.readFileSync(dataReadPath(...TEP_BANG), 'utf8')); } catch { return { phienBan: PHIEN_BAN, muc: [] }; }
}
/** Các mục của một dòng 8 số (maHs hoặc dongChuBieu) — cho tầng hồ sơ (L1-5b). */
function mucCua(ma, bang = taiBang()) {
  const k = nz(ma);
  return (bang.muc || []).filter((m) => nz(m.maHs) === k);
}
/** Các mục chạm một dòng 8 số ở bất kỳ phía nào (maHs hoặc dongChuBieu). */
function mucCham(ma, bang = taiBang()) {
  const k = nz(ma);
  return (bang.muc || []).filter((m) => nz(m.maHs) === k || nz(m.dongChuBieu) === k);
}

module.exports = { PHIEN_BAN, LOAI, NGUONG_TIEN_LE, TRUONG_PHAN_XU, kiemBang, taiBang, mucCua, mucCham, coNguyenVan };
