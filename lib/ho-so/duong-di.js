/**
 * lib/ho-so/duong-di.js — `dungDuongDi`: ĐƯỜNG ĐI PHÁP LÝ TẤT ĐỊNH của một mã HS (plan L1-5a, #648; spec hồ sơ phân loại §8.1
 * `duongDiPhapLy`/`loaiTru`/`kiemHoa`/`canCu`, §8.3 bước 1, §11).
 *
 * Máy dựng phần tất định của hồ sơ — KHÔNG cần dữ kiện về hàng, không gọi LLM, không gọi mạng, chỉ đọc:
 *   - ranh giới 6→8 số: luật đi của lib/dieu-kien-so.js#duongDiDong8 (cây theo chữ số + lớp tầng không mã của lib/hs-tree.js;
 *     dòng "Loại khác" phủ định đủ tầng như loaiKhacOf().truDayDu, không phủ định anh em không trùng của nút có tên);
 *   - điều kiện: CHỈ mục sổ tay `CLAUDE_DUYET`/`NGUOI_DUYET` (soTayDaLoc). Mục nháp/AI_DA_KIEM có `dieuKienSo` ⇒ ranh giới đó
 *     `CHUA_SO_HOA`, lyDo `chua-duyet`. Áp cho MỌI mã, không riêng lát 1 (hướng sai an toàn; cờ HS_HO_SO chỉ bật cho lát 1);
 *   - `dieuKienVao` của sổ tay KHÔNG thành dữ kiện bắt buộc (spec §8.1). Cấp 6: chỉ `tieuChi6` đã duyệt và có kiểu (tu-vung@1).
 *     Cấp 4: chỉ nhóm cạnh tranh CÓ ĐIỂM TRÙNG (`loaiTru`) — conflicts.json (DA_KIEM) + mã thay thế của lượt (`opts.maThayThe`);
 *     từ điển confusion-pairs.json chưa ai duyệt (verified:false) nên không dùng;
 *   - bảng hiệu chỉnh tiền lệ (data/ho-so/hieu-chinh-tien-le.json, lib/ho-so/hieu-chinh.js): mục chạm mã được gắn `hieuChinh`
 *     vào ranh giới liên quan — ghi CẢ HAI phía, không tự chọn bên. `LECH_CHUA_PHAN_XU` không điều kiện ⇒ ranh giới
 *     `CHUA_SO_HOA` (lyDo `hieu-chinh-lech-chua-phan-xu`); có `dieuKien` ⇒ ghi `apKhi`, doiChieu (L1-5b) xét theo dữ kiện;
 *     `KHONG_LECH` bỏ qua.
 *
 * KHÔNG BAO GIỜ CHỐT khi còn ẩn số (`chotDuoc`/`capDaChac`): một dòng 8 số chỉ "chốt được" (capDaChac 8) khi (a) không mục nào
 * trên đường đi `CHUA_SO_HOA`, (b) mọi ANH EM có tên ở mọi tầng từ dòng lên tới phân nhóm 6 số có điều kiện đã duyệt — điều kiện
 * của anh em chưa biết thì không biết anh em có lấn sang dòng này không (cổng 2 L1-4a chỉ chứng minh loại trừ lẫn nhau khi đủ),
 * (c) dòng không mang dấu `chongLanVanBan` (chữ biểu tự chồng lấn ⇒ nêu cả hai, không tự chọn), (d) không mục hiệu chỉnh
 * `LECH_CHUA_PHAN_XU` không điều kiện. Ngược lại capDaChac 6 + `chuaChot[]` ghi lý do.
 *
 * Mỗi mục `duongDiPhapLy` khớp spec §8.1: `{ cap: 4|6|8, capNut, nut, dieuKien, chieu, nguon {nguonLoai, ma, trich}, hieuChinh?,
 * ketQua, tatDinh, lyDo? }` — `cap` là cấp của RANH GIỚI (8 = ranh giới 6→8 số, kể cả tiêu đề 7/5 số và tầng không mã — cấp
 * thật của nút ở `capNut`). `ketQua`: `CHUA_SO_HOA` khi ranh giới chưa có điều kiện dùng được; `null` = chưa đối chiếu dữ kiện
 * (doiChieu L1-5b gán CO/THIEU/MAU_THUAN). `trich` nguyên văn từ mục sổ tay (máy kiểm sổ tay đã kiểm; test kiểm lại).
 *
 * Căn cứ: `canCu.girRulesApplied` CHỈ từ lib/gir.js#girTuDuongDi (luật 6; GIR 1/6 từ ranh giới đã duyệt); `canCu.canCuPhapLy` CHỈ từ lib/legal-basis.js
 * (canCuPhapLy + citeChiTieu('1.78.1') — '2.69.1' cho tờ khai xuất; luật 7a). Không nơi nào khác trong tệp này gắn nhãn GIR.
 *
 * Bộ nhớ đệm theo `${maHs}|${loaiToKhai}|${phienBan}` (nạp lười vào RAM, trả bản sao — bên gọi sửa không làm bẩn đệm).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const T = require('../hs-tree');
const DK = require('../dieu-kien-so');
const gir = require('../gir');
const LB = require('../legal-basis');
const TV = require('../tu-vung');
const HC = require('./hieu-chinh');
const { loadSoTay } = require('../so-tay-gates');
const { lyDoThayThe } = require('../ma-thay-the');
const { dataReadPath } = require('../data-paths');

const PHIEN_BAN_HO_SO = 'ho-so@1';
const NHAN_DUYET = new Set(['CLAUDE_DUYET', 'NGUOI_DUYET']);
const LOAI_TO_KHAI = ['NHAP', 'XUAT'];
const { LY_DO_CHUA_CHOT: LY, taoChuaChot } = require('./ly-do');
const LY_DO_CHUA_DUYET = LY.CHUA_DUYET;
const LY_DO_CHUA_SO_HOA = LY.CHUA_SO_HOA;
const LY_DO_LECH = LY.HIEU_CHINH_LECH;
const CHUONG_MAY = new Set(['84', '85']); // cùng quy ước "thông số bắt buộc nhóm máy" của lib/describe-core.js (#324)

const nz = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const sha16 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
const loi = (code, msg) => Object.assign(new Error(msg), { code });
const laDuyet = (m) => Boolean(m) && NHAN_DUYET.has(m.nguonLoai);
const coDk = (m) => Boolean(m && Array.isArray(m.dieuKienSo) && m.dieuKienSo.length);

// ── Phiên bản ───────────────────────────────────────────────────────────────────────────────────────────────────
const _shaTep = new Map();
function shaTep(...seg) {
  const k = seg.join('/');
  if (!_shaTep.has(k)) { let v; try { v = sha16(fs.readFileSync(dataReadPath(...seg))); } catch { v = 'KHONG_CO'; } _shaTep.set(k, v); }
  return _shaTep.get(k);
}
let _tuVung = null;
function phienBanTuVung() {
  if (!_tuVung) { try { const p = TV.phienBan(); _tuVung = `${p.ten}@${String(p.sha256).slice(0, 16)}`; } catch { _tuVung = 'KHONG_CO'; } }
  return _tuVung;
}
let _dongCo = null;
/** Commit của động cơ: biến môi trường của Coolify/CI, không có thì đọc .git (kể cả worktree), không đọc được ⇒ 'khong-ro'. */
function dongCo() {
  if (_dongCo) return _dongCo;
  const env = process.env.SOURCE_COMMIT || process.env.GIT_COMMIT || process.env.GITHUB_SHA;
  if (env) return (_dongCo = String(env).slice(0, 12));
  try {
    let g = path.join(__dirname, '..', '..', '.git');
    if (fs.statSync(g).isFile()) g = path.resolve(path.dirname(g), fs.readFileSync(g, 'utf8').replace(/^gitdir:\s*/, '').trim());
    const head = fs.readFileSync(path.join(g, 'HEAD'), 'utf8').trim();
    if (!head.startsWith('ref:')) return (_dongCo = head.slice(0, 12));
    const ref = head.slice(4).trim();
    const goc = fs.existsSync(path.join(g, 'commondir')) ? path.resolve(g, fs.readFileSync(path.join(g, 'commondir'), 'utf8').trim()) : g;
    for (const d of [g, goc]) { const f = path.join(d, ref); if (fs.existsSync(f)) return (_dongCo = fs.readFileSync(f, 'utf8').trim().slice(0, 12)); }
    const packed = fs.readFileSync(path.join(goc, 'packed-refs'), 'utf8').split('\n').find((l) => l.endsWith(` ${ref}`));
    return (_dongCo = packed ? packed.slice(0, 12) : 'khong-ro');
  } catch { return (_dongCo = 'khong-ro'); }
}
function phienBan(h4, soTayTiem) {
  return {
    hoSo: PHIEN_BAN_HO_SO,
    bieuThue: T.tree().bieuThue || null,
    soTay: soTayTiem ? `tiem@${sha16(JSON.stringify(soTayTiem))}` : shaTep('so-tay', `${h4}.json`),
    tuVung: phienBanTuVung(),
    hieuChinh: shaTep('ho-so', 'hieu-chinh-tien-le.json'),
    dongCo: dongCo(),
  };
}

// ── Sổ tay đã lọc nhãn ─────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Bản sao sổ tay chỉ giữ `dieuKienSo` của mục CLAUDE_DUYET/NGUOI_DUYET; mục khác giữ nguồn/trích nhưng `dieuKienSo: []` và dấu
 * `_chuaDuyet` (khi nó từng có điều kiện). Dùng chung cho doiChieu (L1-5b) để mọi bước đọc cùng một ranh giới.
 * @param {string} h4
 * @param {object|null} [soTayGoc] sổ tay tiêm (test); bỏ trống ⇒ data/so-tay/<h4>.json
 */
function soTayDaLoc(h4, soTayGoc) {
  const st = soTayGoc === undefined ? loadSoTay(h4) : soTayGoc;
  if (!st || st.nhom !== h4) return null;
  const loc = (m) => (coDk(m) && !laDuyet(m) ? { ...m, dieuKienSo: [], _chuaDuyet: true } : m);
  return { ...st, dong8: (st.dong8 || []).map(loc), dieuKienNut: (st.dieuKienNut || []).map(loc) };
}
function mucSoTay(st, id) {
  if (!st) return null;
  const n = T.chuanMa(id);
  return (st.dong8 || []).find((d) => nz(d.hs) === n) || (st.dieuKienNut || []).find((d) => T.chuanMa(d.id) === n) || null;
}

// ── Cây ─────────────────────────────────────────────────────────────────────────────────────────────────────────
let _tienTo = null;
/** Mọi tiền tố 4/6/8 số có dòng lá trong biểu. */
function tienToBieu() {
  if (!_tienTo) { _tienTo = new Set(); for (const c of T.tree().codes) { _tienTo.add(c.slice(0, 4)); _tienTo.add(c.slice(0, 6)); _tienTo.add(c); } }
  return _tienTo;
}
const laDong8 = (n) => Boolean(n) && n.cap === 8;
const laConLaiTran = (n) => Boolean(n) && (n.cap === 8 ? Boolean(n.loaiKhacTran) : /^lo[aạ]i kh[aá]c\s*(\(SEN\))?\s*[:：]?\s*$/i.test(String(n.tenVi || '').replace(/^[-\s–]+/, '').trim()));
/** Lá 8 số dưới một nút (kể cả nút tầng `<pn6>~r<dòng>`). */
function laDuoi(id) {
  const out = []; const thay = new Set();
  const di = (x) => { if (thay.has(x)) return; thay.add(x); const n = T.nodeOf(x); if (laDong8(n)) { out.push(n.id); return; } for (const c of T.conTang(x) || []) di(c); };
  di(id);
  return out;
}

const tatDinhDk = (c) => {
  const ds = c && c.op === 'VA' ? c.cacDieuKien : [c];
  return DK.traiPhang(ds).every((cc) => cc && !['TEN_LOAI', 'CONG_DUNG'].includes(cc.op));
};
const nguonRa = (g) => (g ? { nguonLoai: g.nguonLoai, ma: g.ma, trich: g.trich } : null);

// ── Ranh giới 6→8 số ────────────────────────────────────────────────────────────────────────────────────────────
function ranhGioi8(ma, st) {
  const out = [];
  const dd = DK.duongDiDong8(ma, { soTay: st });
  if (!dd.nhom.length) {
    out.push({ cap: 8, capNut: 8, nut: ma, chieu: 'PHAI_CO', dieuKien: null, nguon: null, ketQua: 'CHUA_SO_HOA', tatDinh: true, lyDo: dd.lyDo || LY_DO_CHUA_SO_HOA });
    return out;
  }
  for (const g of dd.nhom) {
    const base = { cap: 8, capNut: g.cap, nut: g.nut, chieu: g.chieu, nguon: nguonRa(g.nguon) };
    if (!g.dieuKien) {
      const m = mucSoTay(st, g.nut);
      out.push({ ...base, dieuKien: null, ketQua: 'CHUA_SO_HOA', tatDinh: true, lyDo: g.lyDo || (m && m._chuaDuyet ? LY_DO_CHUA_DUYET : LY_DO_CHUA_SO_HOA), ...(g.tenViNghi ? { tenViNghi: g.tenViNghi } : {}) });
    } else if (g.chieu === 'PHAI_CO') {
      for (const c of g.dieuKien) out.push({ ...base, dieuKien: c, ketQua: null, tatDinh: tatDinhDk(c) });
    } else {
      // Phủ định một anh em: hàng KHÔNG thuộc anh em ⇔ ít nhất một điều kiện của nó trái ⇒ không tách được thành từng mục.
      const c = g.dieuKien.length === 1 ? g.dieuKien[0] : { op: 'VA', cacDieuKien: g.dieuKien };
      out.push({ ...base, dieuKien: c, ketQua: null, tatDinh: tatDinhDk(c) });
    }
  }
  return out;
}

/** Anh em có tên ở mọi tầng từ dòng lên tới phân nhóm 6 số mà điều kiện chưa dùng được ⇒ lý do không chốt. */
function anhEmChuaSoHoa(ma, st) {
  const pn6 = ma.slice(0, 6); const out = [];
  let n = T.nodeOf(ma);
  while (n && n.id !== pn6) {
    const idCha = T.chaTang(n.id);
    const p = idCha ? T.nodeOf(idCha) : null;
    if (!p) break;
    for (const id of T.conTang(p.id) || []) {
      if (id === n.id) continue;
      const s = T.nodeOf(id);
      if (!s || laConLaiTran(s)) continue;
      if (!coDk(mucSoTay(st, id))) out.push(taoChuaChot(LY.ANH_EM_CHUA_SO_HOA, id));
    }
    if (p.id === pn6 || p.cap === 6 || p.cap === 4) break;
    n = p;
  }
  return out;
}

/** Gắn mục bảng hiệu chỉnh tiền lệ chạm `ma` vào ranh giới liên quan. Trả các mục đã gắn (tóm tắt) + lý do không chốt. */
function ganHieuChinh(ma, duongDi, bang) {
  const muc = (bang && Array.isArray(bang.muc) ? bang.muc : [])
    .filter((m) => m && m.loai !== 'KHONG_LECH' && (nz(m.maHs) === ma || nz(m.dongChuBieu) === ma));
  const tomTat = []; const chuaChot = [];
  for (const m of muc) {
    const kia = nz(m.maHs) === ma ? nz(m.dongChuBieu) : nz(m.maHs);
    const hc = {
      id: m.id, loai: m.loai, maHs: nz(m.maHs), dongChuBieu: nz(m.dongChuBieu),
      ...(m.dieuKien ? { apKhi: JSON.parse(JSON.stringify(m.dieuKien)) } : {}),
      tbTchq: JSON.parse(JSON.stringify(m.tbTchq || [])), chuBieu: JSON.parse(JSON.stringify(m.chuBieu || [])),
      lyDo: m.lyDo, duyetBoi: m.duyetBoi || null, ...(m.phanXu ? { phanXu: { ...m.phanXu } } : {}), nguonLoai: m.nguonLoai,
      ...(m.ghiChu ? { ghiChu: m.ghiChu } : {}), ...(Array.isArray(m.factPhanBiet) && m.factPhanBiet.length ? { factPhanBiet: [...m.factPhanBiet] } : {}),
    };
    const lechTran = m.loai === 'LECH_CHUA_PHAN_XU' && !m.dieuKien;
    const apVao = [];
    for (const e of duongDi) {
      const trung = (e.chieu === 'PHAI_CO' && e.nut === ma) || (e.chieu === 'PHAI_KHONG' && laDuoi(e.nut).includes(kia));
      if (!trung) continue;
      (e.hieuChinh || (e.hieuChinh = [])).push(hc);
      apVao.push(e.nut);
      if (lechTran && e.ketQua !== 'CHUA_SO_HOA') { e.ketQua = 'CHUA_SO_HOA'; e.lyDo = LY_DO_LECH; }
    }
    if (lechTran) chuaChot.push(taoChuaChot(LY_DO_LECH, m.id));
    // Tóm tắt mang đủ hai phía (tbTchq + chuBieu) để doiChieu (L1-5b) nêu cả hai dòng kể cả khi mục không gắn vào ranh giới nào.
    tomTat.push({
      id: m.id, loai: m.loai, maHs: hc.maHs, dongChuBieu: hc.dongChuBieu, ...(hc.apKhi ? { apKhi: hc.apKhi } : {}), apVaoNut: [...new Set(apVao)],
      tbTchq: hc.tbTchq, chuBieu: hc.chuBieu, lyDo: hc.lyDo, duyetBoi: hc.duyetBoi,
      ...(m.ghiChu ? { ghiChu: m.ghiChu } : {}), ...(Array.isArray(m.factPhanBiet) && m.factPhanBiet.length ? { factPhanBiet: [...m.factPhanBiet] } : {}),
    });
  }
  return { tomTat, chuaChot };
}

// ── Cấp 6: tieuChi6 đã duyệt, có kiểu ──────────────────────────────────────────────────────────────────────────────
function ranhGioi6(pn6, st) {
  return (st?.tieuChi6 || [])
    .filter((t) => nz(t.hs6) === pn6 && laDuyet(t) && DK.laDieuKienCoKieu(t))
    .map((t) => {
      const { hs6: _h, nguon, trich, nguonLoai, ...c } = t;
      return { cap: 6, capNut: 6, nut: pn6, chieu: 'PHAI_CO', dieuKien: c, nguon: { nguonLoai, ma: nguon, trich }, ketQua: null, tatDinh: tatDinhDk(c) };
    });
}

// ── loaiTru: nhóm / phân nhóm cạnh tranh có điểm trùng ──────────────────────────────────────────────────────────────
let _conflicts = null;
function conflicts() {
  if (!_conflicts) {
    let raw = {};
    try { raw = JSON.parse(fs.readFileSync(dataReadPath('conflicts.json'), 'utf8')); } catch { raw = {}; }
    const nguoc = new Map();
    for (const [k, v] of Object.entries(raw)) for (const c of v?.confusedWith || []) { const d = nz(c); if (!nguoc.has(d)) nguoc.set(d, new Set()); nguoc.get(d).add(nz(k)); }
    _conflicts = { raw, nguoc };
  }
  return _conflicts;
}
/** Mã cạnh tranh có điểm trùng với tiền tố `ma` theo conflicts.json (hai chiều). */
function canhTranhConflicts(ma) {
  const { raw, nguoc } = conflicts();
  const out = new Set();
  for (const [k, v] of Object.entries(raw)) {
    const dk = nz(k);
    if (dk.startsWith(ma)) for (const c of v?.confusedWith || []) out.add(nz(c));
  }
  for (const [d, ks] of nguoc) if (d.startsWith(ma) || (d.length < ma.length && ma.startsWith(d))) for (const k of ks) out.add(k);
  return out;
}
/** Cấp + mã nhóm cạnh tranh của `c` so với mã đang dựng; cùng phân nhóm 6 số (hoặc cùng tiền tố đầu vào) ⇒ null (đã ở đường đi). */
function capCanhTranh(ma, c) {
  if (c.length < 4) return null;
  if (c.slice(0, 4) !== ma.slice(0, 4)) return { cap: 4, ma: c.slice(0, 4) };
  if (ma.length >= 6 && c.length >= 6 && c.slice(0, 6) !== ma.slice(0, 6)) return { cap: 6, ma: c.slice(0, 6) };
  return null;
}
function dungLoaiTru(ma, st, maThayThe = []) {
  const nhom = new Map();
  const them = (c, lyDo) => {
    const k = capCanhTranh(ma, c);
    if (!k) return;
    if (!nhom.has(k.ma)) nhom.set(k.ma, { ...k, lyDoTrung: { ...lyDo, ma: [] } });
    const g = nhom.get(k.ma);
    if (g.lyDoTrung.nguon === lyDo.nguon) { if (!g.lyDoTrung.ma.includes(c)) g.lyDoTrung.ma.push(c); } else if (!(g.nguonKhac || []).some((x) => x.nguon === lyDo.nguon && x.maGoc === c)) (g.nguonKhac || (g.nguonKhac = [])).push({ nguon: lyDo.nguon, maGoc: c, ...(lyDo.lyDoThayThe ? { lyDoThayThe: lyDo.lyDoThayThe } : {}) });
  };
  for (const c of [...canhTranhConflicts(ma)].sort()) them(c, { nguon: 'conflicts.json', nguonLoai: 'DA_KIEM' });
  for (const c of maThayThe.map(nz).filter((x) => x.length >= 4)) {
    const lyDoTt = lyDoThayThe(c);
    them(c, { nguon: 'ma-thay-the', nguonLoai: 'NGUYEN_VAN', ...(lyDoTt ? { lyDoThayThe: lyDoTt } : {}) });
  }
  const out = [];
  for (const g of [...nhom.values()].sort((a, b) => a.ma.localeCompare(b.ma))) {
    // Ranh giới của nhóm cạnh tranh: mục loaiTru của sổ tay ĐÃ DUYỆT có `sangNhom` khớp; có `dieuKienSo` có kiểu ⇒ điều kiện.
    const m = (st?.loaiTru || []).find((x) => laDuyet(x) && nz(x.sangNhom).length >= 4 && (nz(x.sangNhom).startsWith(g.ma) || g.ma.startsWith(nz(x.sangNhom))));
    const dk = m && coDk(m) && m.dieuKienSo.every(DK.laDieuKienCoKieu) ? JSON.parse(JSON.stringify(m.dieuKienSo)) : null;
    out.push({
      ma: g.ma, cap: g.cap, lyDoTrung: g.lyDoTrung, ...(g.nguonKhac ? { nguonKhac: g.nguonKhac } : {}),
      dieuKienKhongThoa: dk, menhDe: null,
      nguon: m ? { nguonLoai: m.nguonLoai, ma: m.nguon, trich: m.trich } : null,
      ketQua: 'CHUA_LOAI', ...(dk ? {} : { lyDo: 'chua-co-ranh-gioi-duyet' }),
    });
  }
  return out;
}
/** Mục loaiTru có điều kiện đã duyệt ⇒ mục cấp 4/6 bắt buộc trên đường đi (PHAI_KHONG điều kiện vào nhóm cạnh tranh). */
const tuLoaiTru = (lt) => lt.filter((x) => x.dieuKienKhongThoa).map((x) => {
  const c = x.dieuKienKhongThoa.length === 1 ? x.dieuKienKhongThoa[0] : { op: 'VA', cacDieuKien: x.dieuKienKhongThoa };
  return { cap: x.cap, capNut: x.cap, nut: x.ma, chieu: 'PHAI_KHONG', dieuKien: c, nguon: x.nguon, ketQua: null, tatDinh: tatDinhDk(c), tuLoaiTru: true };
});

// ── kiemHoa ─────────────────────────────────────────────────────────────────────────────────────────────────────
function dungKiemHoa(ma, duongDi) {
  const ds = [];
  const them = (fact, lyDo) => {
    if (ds.some((x) => x.fact === fact)) return;
    let k = null; try { k = TV.layKhoa(fact); } catch { k = null; }
    if (k) ds.push({ fact, nhanVi: k.nhanVi, ...(k.donViChuan ? { donViChuan: k.donViChuan } : {}), lyDo, nguonLoai: 'MAY_SUY' });
  };
  them('kichThuoc', 'kich-thuoc-kiem-hoa');
  if (CHUONG_MAY.has(ma.slice(0, 2))) { them('congSuat', 'thong-so-bat-buoc-nhom-may'); them('dienAp', 'thong-so-bat-buoc-nhom-may'); }
  for (const e of duongDi) {
    if (!e.dieuKien) continue;
    const ds2 = DK.traiPhang(e.dieuKien.op === 'VA' ? e.dieuKien.cacDieuKien : [e.dieuKien]);
    for (const c of ds2) { let k = null; try { k = TV.layKhoa(c.fact); } catch { k = null; } if (k && k.kieu === 'SO') them(c.fact, 'du-kien-so-tren-duong-di'); }
  }
  return ds;
}

// ── Căn cứ ──────────────────────────────────────────────────────────────────────────────────────────────────────
function dungCanCu(ma, loaiToKhai, capDaChac, duongDi) {
  // GIR qua lib/gir.js#girTuDuongDi (quyết định 1 của người điều phối, L1-5b): GIR 1 + GIR 6, basis RULE_TABLE, bằng chứng là
  // câu trích nguyên văn của ranh giới ĐÃ DUYỆT trên đường đi. Gọi qua đối tượng module (gir.girTuDuongDi) để spy của test thấy.
  const g = gir.girTuDuongDi(duongDi);
  // 4/6 số: còn ranh giới mở ⇒ THIEU_DU_KIEN. 8 số chốt được ⇒ người khai xác nhận. 8 số không chốt được (ranh giới chưa số
  // hoá, chữ biểu chồng lấn, tiền lệ lệch chưa phân xử) ⇒ hệ thống chưa xác định được.
  const status = ma.length < 8 ? 'NEED_FACTS' : capDaChac === 8 ? 'REVIEW' : 'NEEDS_EXPERT';
  const ccpl = LB.canCuPhapLy({ status, topHs: ma, girDeterminations: g.determinations.length });
  return {
    girRulesApplied: g.determinations,
    girDisclaimer: g.disclaimer,
    canCuPhapLy: { ...ccpl, chiTieuMoTa: [LB.citeChiTieu(loaiToKhai === 'XUAT' ? '2.69.1' : '1.78.1')] },
  };
}

// ── Lõi ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function dung(ma, loaiToKhai, opts) {
  const h4 = ma.slice(0, 4);
  const st = soTayDaLoc(h4, Object.prototype.hasOwnProperty.call(opts, 'soTay') ? opts.soTay : undefined);
  const bang = opts.bangHieuChinh || HC.taiBang();
  const duongDi = []; let capDaChac = ma.length; let chuaChot = []; let hieuChinh = []; let chongLan = []; let dong8ConMo;
  const loaiTru = dungLoaiTru(ma, st);
  if (ma.length >= 6) duongDi.push(...ranhGioi6(ma.slice(0, 6), st));
  duongDi.push(...tuLoaiTru(loaiTru));
  if (ma.length === 8) {
    const n0 = T.nodeOf(ma);
    const r8 = n0 && n0.laPhanNhom ? [] : ranhGioi8(ma, st); // dòng duy nhất của phân nhóm: không có ranh giới 6→8 số
    const hc = ganHieuChinh(ma, r8, bang);
    hieuChinh = hc.tomTat;
    const goc = mucSoTay(st, ma);
    chongLan = (goc && Array.isArray(goc.chongLanVanBan) ? goc.chongLanVanBan : []).map((c) => ({ voi: nz(c.voi), lyDo: c.lyDo }));
    duongDi.push(...r8);
    const daNeu = new Set(r8.filter((e) => e.ketQua === 'CHUA_SO_HOA').map((e) => e.nut));
    chuaChot = [...new Set([
      ...r8.filter((e) => e.ketQua === 'CHUA_SO_HOA').map((e) => taoChuaChot(e.lyDo || LY_DO_CHUA_SO_HOA, e.nut)),
      ...hc.chuaChot,
      // anh em chưa số hoá mà đường đi đã nêu (PHAI_KHONG CHUA_SO_HOA) thì không ghi lặp
      ...(n0 && n0.laPhanNhom ? [] : anhEmChuaSoHoa(ma, st).filter((x) => !daNeu.has(x.slice(x.indexOf(':') + 1)))),
      ...chongLan.map((c) => taoChuaChot(LY.CHONG_LAN_VAN_BAN, c.voi)),
    ])];
    capDaChac = chuaChot.length ? 6 : 8;
  } else if (ma.length === 6) {
    dong8ConMo = T.tree().codes.filter((c) => c.startsWith(ma));
  }
  return {
    maHs: ma,
    loaiToKhai,
    phienBan: phienBan(h4, Object.prototype.hasOwnProperty.call(opts, 'soTay') ? opts.soTay : null),
    duongDiPhapLy: duongDi,
    loaiTru,
    kiemHoa: dungKiemHoa(ma, duongDi),
    canCu: dungCanCu(ma, loaiToKhai, capDaChac, duongDi),
    capDaChac,
    chotDuoc: ma.length === 8 && chuaChot.length === 0,
    chuaChot,
    ...(hieuChinh.length ? { hieuChinh } : {}),
    ...(chongLan.length ? { chongLanVanBan: chongLan } : {}),
    ...(dong8ConMo ? { dong8ConMo } : {}),
    nhanDuocDung: [...NHAN_DUYET],
    ...(loaiToKhai === 'XUAT' ? { khuonChuaHoTro: '2.69' } : {}),
  };
}

const _dem = new Map();
/**
 * Đường đi pháp lý tất định của một mã (spec §8.3 bước 1).
 * @param {string} maHs 4, 6 hoặc 8 chữ số (cho phép dấu chấm)
 * @param {'NHAP'|'XUAT'} loaiToKhai
 * @param {{maThayThe?: string[], soTay?: object|null, bangHieuChinh?: object}} [opts] `maThayThe` — mã thay thế của lượt phân
 *   loại (thêm nhóm cạnh tranh vào loaiTru); `soTay`/`bangHieuChinh` — tiêm cho test (bỏ qua bộ nhớ đệm).
 * @returns {import('./index').KetQuaDuongDi}
 * @throws {Error} code MA_KHONG_HOP_LE | LOAI_TO_KHAI_KHONG_HOP_LE | MA_KHONG_CO_TRONG_BIEU
 */
function dungDuongDi(maHs, loaiToKhai, opts = {}) {
  const ma = nz(maHs);
  if (![4, 6, 8].includes(ma.length)) throw loi('MA_KHONG_HOP_LE', `maHs phải 4, 6 hoặc 8 chữ số: ${maHs}`);
  const loai = String(loaiToKhai || '').toUpperCase();
  if (!LOAI_TO_KHAI.includes(loai)) throw loi('LOAI_TO_KHAI_KHONG_HOP_LE', `loaiToKhai phải NHAP hoặc XUAT: ${loaiToKhai}`);
  if (!tienToBieu().has(ma)) throw loi('MA_KHONG_CO_TRONG_BIEU', `mã không có trong biểu thuế: ${ma}`);
  const tiem = Object.prototype.hasOwnProperty.call(opts, 'soTay') || Object.prototype.hasOwnProperty.call(opts, 'bangHieuChinh');
  let kq;
  if (tiem) kq = dung(ma, loai, opts);
  else {
    const pb = phienBan(ma.slice(0, 4), null);
    const khoa = `${ma}|${loai}|${pb.bieuThue}|${pb.soTay}|${pb.tuVung}|${pb.hieuChinh}|${pb.dongCo}`;
    if (!_dem.has(khoa)) _dem.set(khoa, dung(ma, loai, {}));
    kq = structuredClone(_dem.get(khoa));
  }
  const mtt = Array.isArray(opts.maThayThe) ? opts.maThayThe : [];
  if (mtt.length) {
    const st = soTayDaLoc(ma.slice(0, 4), Object.prototype.hasOwnProperty.call(opts, 'soTay') ? opts.soTay : undefined);
    kq.loaiTru = dungLoaiTru(ma, st, mtt);
    const moi = tuLoaiTru(kq.loaiTru).filter((e) => !kq.duongDiPhapLy.some((x) => x.tuLoaiTru && x.nut === e.nut));
    kq.duongDiPhapLy.push(...moi);
    kq.kiemHoa = dungKiemHoa(ma, kq.duongDiPhapLy);
    kq.canCu = dungCanCu(ma, loai, kq.capDaChac, kq.duongDiPhapLy);
  }
  return kq;
}

/** Xoá bộ nhớ đệm (test / nạp lại dữ liệu). */
function reset() { _dem.clear(); _shaTep.clear(); _tuVung = null; _conflicts = null; _tienTo = null; }

module.exports = { PHIEN_BAN_HO_SO, LOAI_TO_KHAI, NHAN_DUYET, dungDuongDi, soTayDaLoc, dungCanCu, laDuoi, reset };
