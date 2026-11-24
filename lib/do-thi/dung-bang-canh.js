// lib/do-thi/dung-bang-canh.js — DỰNG BẢNG CẠNH của đồ thị tri thức HS (ADR-0002, giai đoạn 1 của
// docs/ke-hoach-do-thi-tri-thuc-hs.md).
//
// Tất định, không LLM, không mạng, không ghi tệp. Sinh từ các tệp gốc ĐANG CÓ; không soạn tay, không sửa tệp gốc:
//   C5  Loại-trừ            data/so-tay/<nhóm>.json  loaiTru[]            A → B
//   C6  Loại-trừ-ngược      đảo C5 (1-1), giữ nguyên trích của bên A      B → A   (sinhTuDong, goc = id cạnh C5)
//   C7  Phân-biệt           data/so-tay/<nhóm>.json  phanBiet[]           neuCo ↔ neuKhong
//   C8  Dễ-nhầm             data/confusion-pairs.json + confusedWith của data/precedents.json   khai ↔ đúng
//   C9  Chú-giải-chi-phối   data/chu-giai-chuong.json (+ hs-sections.json)  Phần ('P:<LA_MA>') / Chương ('01'..'98') → nhóm 4 số  (sinhTuDong)
//   C10 Tách-phân-nhóm      data/so-tay/<nhóm>.json  tieuChi6[]           nhóm → phân nhóm 6 số, kèm tiêu chí
//       (+ C13 Cần-dữ-kiện: trường `khoaDuKien` = khoá tu-vung của tiêu chí; khuôn g6@1 mang thêm thuTu / tuKhoa / uuTien / tienLe)
//   C17 Nhắc-tên-nhau         data/do-thi/canh-nhac-nhom.json canh[]       chú giải nhóm tu nhắc nhóm den (trích nguyên văn bằng máy, quanHe do LLM gắn, AI_NHAP bậc 4)
//   C16 Phân-biệt-theo-nghĩa  data/do-thi/ban-do-4so/<nhóm>.json canh[]    nhóm ↔ nhóm láng giềng, kèm đặc điểm quan sát được (AI_NHAP qua cổng bd4@1)
//   C11 Tên-riêng-thắng-loại-khác   cây biểu thuế (lib/hs-tree.js)        dư → tên riêng, mức 6 số và mức 8 số
//   C1  Gọi-là (gộp)        các kho cụm từ → một chỉ mục cụm → nhóm / phân nhóm / mã
//
// Nút = chuỗi chuẩn: phần `P:<LA_MA>`, chương 2 số, nhóm 4 số, phân nhóm 6 số, dòng 8 số — kiểm trên cây biểu thuế hiện hành
// (lib/hs-tree.js + data/tax.json). Mã không còn: đếm vào `maKhongConTrongBieu`, không xuất cạnh, không cắt ngắn về nhóm.
// Cạnh thiếu `trich` hoặc `nguon`: không xuất, đếm theo lý do.
// Thứ bậc `bac` (kế hoạch mục 4.5): 1 = luật có trích nguyên văn (C5, C6, C7, C9, C10, C11 — chữ của sổ tay / chú giải / biểu thuế);
// 2 = thông báo phân loại của hải quan (C8 từ TB-TCHQ); 4 = từ điển chưa duyệt, chỉ gợi ý (C8 từ confusion-pairs,
// mọi mục `verified: false`). Bậc 3 (tờ khai OZ) không có cạnh tĩnh — xem lib/do-thi/tien-le-ung-ho.js.
'use strict';

const fs = require('fs');
const crypto = require('crypto');
const { dataReadPath } = require('../data-paths');
const { taxData, precedentsData } = require('../data');
const T = require('../hs-tree');
const { khongDau, tuKhoa } = require('./tu-khoa');
const { hangDu, gotTen } = require('./phan-con-lai');

const LOAI_CANH = ['C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'LOAI_TRU', 'WCO', 'C16', 'C17'];
const BAC = { LUAT: 1, THONG_BAO: 2, TO_KHAI: 3, TU_DIEN_CHUA_DUYET: 4 };
const TRICH_TB_TOI_DA = 240;
const TRICH_C9_TOI_DA = 600;

const so = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const bam = (...phan) => crypto.createHash('sha1').update(JSON.stringify(phan)).digest('hex').slice(0, 12);
const chu = (v) => (typeof v === 'string' ? v.trim() : '');
const docJson = (...p) => JSON.parse(fs.readFileSync(dataReadPath(...p), 'utf8'));
const tachMa = (v) => String(v == null ? '' : v).split(/[|,;\s]+/).filter((x) => so(x).length >= 4);
const tachMaHoacChuong = (v) => String(v == null ? '' : v).split(/[|,;\s]+/).filter((x) => { const l = so(x).length; return l === 2 || l >= 4; });

// ───────────────────────────────────────── Nút ─────────────────────────────────────────
let _nut = null;
/** Tập nút hợp lệ theo biểu thuế hiện hành: dòng 8 số, phân nhóm 6 số, nhóm 4 số, chương 2 số, phần `P:<LA_MA>`. */
function tapNut() {
  if (_nut) return _nut;
  const ma8 = new Set(Object.keys(taxData).filter((c) => /^\d{8}$/.test(c)));
  const pn6 = new Set(); const nhom = new Set();
  for (const c of ma8) { pn6.add(c.slice(0, 6)); nhom.add(c.slice(0, 4)); }
  const t = T.tree();
  const phan = new Set(); const chuong = new Set();
  for (const node of t.nodes.values()) {
    if (node.cap === 'PHAN') phan.add(node.id);
    else if (node.cap === 2) chuong.add(node.id);
  }
  _nut = { ma8, pn6, nhom, chuong, phan };
  return _nut;
}
/**
 * Mã/nút bất kỳ ("P:XVI", "84", "8481.20", "84812090", "8481") → nút ở ĐÚNG độ chính xác đã ghi
 * (kiểm theo cây biểu thuế T.tree() và data/tax.json), hoặc null khi không còn / không tồn tại.
 */
function chuanNut(ma) {
  const n = tapNut();
  const s = String(ma == null ? '' : ma).trim();
  if (/^P:/i.test(s)) {
    const p = `P:${s.slice(2).toUpperCase()}`;
    return n.phan.has(p) ? p : null;
  }
  const d = so(s);
  if (d.length >= 8) return n.ma8.has(d.slice(0, 8)) ? d.slice(0, 8) : null;
  if (d.length >= 6) return n.pn6.has(d.slice(0, 6)) ? d.slice(0, 6) : null;
  if (d.length >= 4) return n.nhom.has(d.slice(0, 4)) ? d.slice(0, 4) : null;
  if (d.length === 2) return n.chuong.has(d) ? d : null;
  return null;
}
const coNut = (nut) => typeof nut === 'string' && chuanNut(nut) === nut;

// ───────────────────────────────────────── Sổ đếm cạnh bị loại ─────────────────────────────────────────
function soDem() {
  const m = {};
  return { them(loai, lyDo) { m[loai] ||= {}; m[loai][lyDo] = (m[loai][lyDo] || 0) + 1; }, ra() { return sapKhoa(m); } };
}
function sapKhoa(o) {
  if (Array.isArray(o) || !o || typeof o !== 'object') return o;
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, sapKhoa(o[k])]));
}

// ───────────────────────────────────────── C5 / C6 / C7 từ sổ tay ─────────────────────────────────────────
function docSoTay() {
  let tep = [];
  try { tep = fs.readdirSync(dataReadPath('so-tay')).filter((f) => /^\d{4}\.json$/.test(f)).sort(); } catch { tep = []; }
  const ra = [];
  for (const f of tep) {
    const a = f.slice(0, 4);
    let s = null;
    try { s = docJson('so-tay', f); } catch { s = null; }
    if (s && s.nhom === a) ra.push(s);
  }
  return ra;
}

/**
 * Một vế của câu phân biệt ("9026|9032", hoặc hàng chục dòng 8 số của cùng một nhóm) → danh sách nút. Nhiều mã CÙNG nhóm 4
 * số được gom về nút chung gần nhất (tiền tố chung dài nhất, cắt về 8 / 6 / 4 số) — không nhân chéo từng dòng với từng dòng
 * (một câu của sổ 8409 từng nở thành 2.863 cạnh). Nguyên văn hai vế vẫn giữ ở `neuCo` / `neuKhong` của cạnh.
 */
function gomBen(v) {
  const theoNhom = new Map(); let hong = 0;
  for (const t of tachMa(v)) {
    const n = chuanNut(t);
    if (!n) { hong += 1; continue; }
    const h = n.slice(0, 4);
    if (!theoNhom.has(h)) theoNhom.set(h, []);
    theoNhom.get(h).push(n);
  }
  const nut = [];
  for (const ds of theoNhom.values()) {
    let p = ds[0];
    for (const d of ds) while (!d.startsWith(p)) p = p.slice(0, -1);
    nut.push(p.length >= 8 ? p.slice(0, 8) : p.length >= 6 ? p.slice(0, 6) : p.slice(0, 4));
  }
  return { nut: [...new Set(nut)].sort(), hong };
}

function canhSoTay(dem) {
  const c5 = []; const c7 = []; const loaiTru = [];
  for (const s of docSoTay()) {
    const a = s.nhom;
    if (!coNut(a)) { dem.them('C5', 'maKhongConTrongBieu'); continue; }
    (s.loaiTru || []).forEach((x, i) => {
      const trich = chu(x && x.trich); const nguon = chu(x && x.nguon); const dieuKien = chu(x && x.dieuKien);
      const laMoi = Boolean(x && x.loai === 'LOAI_TRU');
      const loai = laMoi ? 'LOAI_TRU' : 'C5';
      const danhSach = laMoi ? tachMaHoacChuong(x && x.sangNhom) : tachMa(x && x.sangNhom);
      for (const t of danhSach) {
        const b = chuanNut(t);
        if (!b) { dem.them(loai, 'maKhongConTrongBieu'); continue; }
        if (b === a || (b.length === 2 && b === a.slice(0, 2))) { dem.them(loai, 'tuTrungToi'); continue; }
        if (!trich) { dem.them(loai, 'thieuTrich'); continue; }
        if (!nguon) { dem.them(loai, 'thieuNguon'); continue; }
        const edge = {
          id: `${loai}:${a}>${b}:${bam(loai, a, b, nguon, trich, dieuKien)}`, loai, bac: BAC.LUAT, tu: a, toi: b,
          dieuKien, tuKhoaDieuKien: tuKhoa(dieuKien), trich, nguon, ...(x.nguonGhi ? { nguonGhi: x.nguonGhi } : {}),
          ...(x.canCuLoaiTru ? { canCuLoaiTru: x.canCuLoaiTru } : {}),
          nguonLoai: x.nguonLoai || null, viTri: `data/so-tay/${a}.json#loaiTru[${i}]`, sinhTuDong: laMoi,
        };
        if (laMoi) loaiTru.push(edge); else c5.push(edge);
      }
    });
    (s.phanBiet || []).forEach((x, i) => {
      const trich = chu(x && x.trich); const nguon = chu(x && x.nguon); const hoi = chu(x && x.hoi);
      const co_ = gomBen(x && x.neuCo); const khong_ = gomBen(x && x.neuKhong);
      for (let k = 0; k < co_.hong + khong_.hong; k += 1) dem.them('C7', 'maKhongConTrongBieu');
      for (const co of co_.nut) {
        for (const khong of khong_.nut) {
          if (co === khong) { dem.them('C7', 'cungNutSauKhiGom'); continue; }
          if (!trich) { dem.them('C7', 'thieuTrich'); continue; }
          if (!nguon) { dem.them('C7', 'thieuNguon'); continue; }
          c7.push({
            id: `C7:${co}>${khong}:${bam('C7', co, khong, nguon, trich, hoi)}`, loai: 'C7', bac: BAC.LUAT, tu: co, toi: khong,
            haiChieu: true, hoi, neuCo: String(x.neuCo), neuKhong: String(x.neuKhong), trich, nguon, ...(x.nguonGhi ? { nguonGhi: x.nguonGhi } : {}),
            nguonLoai: x.nguonLoai || null, soTay: a, viTri: `data/so-tay/${a}.json#phanBiet[${i}]`, sinhTuDong: false,
          });
        }
      }
    });
  }
  return { c5, c7, loaiTru };
}

/** C6 = đảo từng cạnh C5, đúng 1-1. `daCoChieuThuan`: sổ tay của nhóm B đã tự ghi loại trừ sang A hay chưa. */
function daoLoaiTru(c5) {
  const thuan = new Set(c5.map((e) => `${e.tu.slice(0, 4)}>${e.toi.slice(0, 4)}`));
  return c5.map((e) => ({
    id: `C6:${e.toi}>${e.tu}:${e.id.split(':').pop()}`, loai: 'C6', bac: BAC.LUAT, tu: e.toi, toi: e.tu,
    dieuKien: e.dieuKien, tuKhoaDieuKien: e.tuKhoaDieuKien, trich: e.trich, nguon: e.nguon,
    ...(e.nguonGhi ? { nguonGhi: e.nguonGhi } : {}),
    ...(e.canCuLoaiTru ? { canCuLoaiTru: e.canCuLoaiTru } : {}),
    nguonLoai: e.nguonLoai, viTri: e.viTri, sinhTuDong: true, goc: e.id,
    daCoChieuThuan: thuan.has(`${e.toi.slice(0, 4)}>${e.tu.slice(0, 4)}`),
  }));
}

// ───────────────────────────────────────── C10 (+ C13) từ tieuChi6 ─────────────────────────────────────────
let _khoaTV = null;
/** Khoá có trong từ vựng runtime (lib/tu-vung.js) hay không — nạp chậm; không nạp được thì coi như không có khoá nào. */
function laKhoaTuVung(fact) {
  if (!fact) return false;
  if (_khoaTV === null) { try { _khoaTV = require('../tu-vung.js').layKhoa; } catch { _khoaTV = false; } }
  try { return Boolean(_khoaTV && _khoaTV(fact)); } catch { return false; }
}
/**
 * C10 = mỗi mục `tieuChi6[]` của sổ tay là một cạnh nhóm 4 số → phân nhóm 6 số. Bậc 1 (luật có trích nguyên văn).
 * `khoaDuKien` (C13): khoá tu-vung mà cạnh cần để quyết — null khi mục dùng `fact` tự do của khuôn cũ hoặc là phân nhóm dư.
 * `thuTu`: thứ tự xét (khuôn g6@1, do máy xếp) — phân nhóm có tên riêng trước, phân nhóm dư sau; `uuTien`: câu luật cho phép xét trước.
 * `chuaSoHoa`: chữ luật có tiêu chí nhưng từ vựng chưa có khoá hợp — cạnh chỉ mang trích, chưa đi được bằng máy.
 * `tienLe`: ví dụ bậc 2 (thông báo phân loại) — KHÔNG phải điều kiện.
 */
function canhTieuChi6(dem) {
  const ra = [];
  for (const s of docSoTay()) {
    const a = s.nhom;
    if (!coNut(a)) { if ((s.tieuChi6 || []).length) dem.them('C10', 'maKhongConTrongBieu'); continue; }
    (s.tieuChi6 || []).forEach((x, i) => {
      const b = chuanNut(x && x.hs6);
      if (!b || b.length !== 6 || !b.startsWith(a)) { dem.them('C10', 'maKhongConTrongBieu'); return; }
      const trich = chu(x.trich); const nguon = chu(x.nguon);
      if (!trich) { dem.them('C10', 'thieuTrich'); return; }
      if (!nguon) { dem.them('C10', 'thieuNguon'); return; }
      const du = x.phanConLai === true;
      const chuaSo = !du && typeof x.chuaSoHoa === 'string' && x.chuaSoHoa.trim().length > 0;
      const kieu = du || chuaSo ? null : { fact: x.fact, op: x.op, value: x.value, ...(x.donVi ? { donVi: x.donVi } : {}), ...(x.chieu ? { chieu: x.chieu } : {}) };
      const dieuKien = chu(x.dieuKien) || (du ? 'phần còn lại của tầng' : chuaSo ? `chưa số hoá: ${chu(x.chuaSoHoa)}` : `${x.fact} ${x.op} ${JSON.stringify(x.value)}${x.donVi ? ` ${x.donVi}` : ''}`);
      ra.push({
        id: `C10:${a}>${b}:${bam('C10', a, b, nguon, trich, dieuKien, kieu)}`, loai: 'C10', bac: BAC.LUAT, tu: a, toi: b,
        dieuKien, ...(du ? { phanConLai: true } : chuaSo ? { chuaSoHoa: true } : kieu), khoaDuKien: kieu && laKhoaTuVung(x.fact) ? x.fact : null,
        ...(Number.isInteger(x.thuTu) ? { thuTu: x.thuTu } : {}),
        ...(Array.isArray(x.tuKhoa) && x.tuKhoa.length ? { tuKhoa: x.tuKhoa.map(String) } : {}),
        ...(x.uuTien && chu(x.uuTien.trich) && chu(x.uuTien.nguon) ? { uuTien: { nguon: chu(x.uuTien.nguon), trich: chu(x.uuTien.trich) } } : {}),
        ...(Array.isArray(x.tienLe) && x.tienLe.length ? { tienLe: x.tienLe.map((t) => ({ so: String(t.so), ma: so(t.ma), bac: BAC.THONG_BAO })) } : {}),
        trich, nguon, nguonLoai: x.nguonLoai || null, viTri: `data/so-tay/${a}.json#tieuChi6[${i}]`, sinhTuDong: false,
      });
    });
  }
  return ra;
}

// ───────────────────────────────────────── C8 ─────────────────────────────────────────
function canhDeNham(dem) {
  const ra = [];
  let cp = { entries: [] };
  try { cp = docJson('confusion-pairs.json'); } catch { cp = { entries: [] }; }
  const muc = [...(cp.entries || [])].sort((x, y) => String(x.id).localeCompare(String(y.id)));
  for (const e of muc) {
    const trich = chu(e.essenceTestVi); const nguon = e.id ? `data/confusion-pairs.json#${e.id}` : '';
    for (const d of e.declaredHs || []) {
      for (const c of e.correctHs || []) {
        const tu = chuanNut(d); const toi = chuanNut(c);
        if (!tu || !toi) { dem.them('C8', 'maKhongConTrongBieu'); continue; }
        if (tu === toi || tu.startsWith(toi) || toi.startsWith(tu)) { dem.them('C8', 'tuTrungToi'); continue; }
        if (!trich) { dem.them('C8', 'thieuTrich'); continue; }
        if (!nguon) { dem.them('C8', 'thieuNguon'); continue; }
        ra.push({
          id: `C8:${tu}>${toi}:${bam('C8', tu, toi, nguon, trich)}`, loai: 'C8', bac: BAC.TU_DIEN_CHUA_DUYET, tu, toi, haiChieu: true,
          dieuKien: trich, trich, nguon, nguonKho: 'confusion-pairs', tenHang: chu(e.nameVi) || null,
          ...(chu(e.legalBasisVi) ? { canCu: chu(e.legalBasisVi) } : {}), daDuyet: Boolean(e.verified),
          ...(e.oldTariff ? { bieuThueCu: true } : {}), sinhTuDong: false,
        });
      }
    }
  }
  for (const khoa of Object.keys(precedentsData || {}).sort()) {
    const ds = Array.isArray(precedentsData[khoa]) ? precedentsData[khoa] : [];
    ds.forEach((p, i) => {
      const cw = Array.isArray(p && p.confusedWith) ? p.confusedWith : [];
      if (!cw.length) return;
      const loaiNguon = chu(p.sourceType) || 'TB-TCHQ';
      const toi = chuanNut(p.outcome) || chuanNut(khoa);
      const ten = chu(p.productName);
      const trich = ten.length > TRICH_TB_TOI_DA ? `${ten.slice(0, TRICH_TB_TOI_DA - 1)}…` : ten;
      const nguon = chu(p.tbTchqNumber) ? `${loaiNguon} ${chu(p.tbTchqNumber)}` : '';
      for (const c of cw) {
        const tu = chuanNut(c);
        if (!tu || !toi) { dem.them('C8', 'maKhongConTrongBieu'); continue; }
        if (tu === toi || tu.startsWith(toi) || toi.startsWith(tu)) { dem.them('C8', 'tuTrungToi'); continue; }
        if (!trich) { dem.them('C8', 'thieuTrich'); continue; }
        if (!nguon) { dem.them('C8', 'thieuNguon'); continue; }
        ra.push({
          id: `C8:${tu}>${toi}:${bam('C8', tu, toi, nguon, trich)}`, loai: 'C8', bac: loaiNguon === 'TB-TCHQ' ? BAC.THONG_BAO : BAC.TU_DIEN_CHUA_DUYET,
          tu, toi, haiChieu: true, dieuKien: null, trich, nguon, nguonKho: 'precedents', loaiNguon,
          viTri: `data/precedents.json#${khoa}[${i}]`, sinhTuDong: false,
        });
      }
    });
  }
  return ra;
}

// ───────────────────────────────────────── C11 ─────────────────────────────────────────
// Nhận diện "phần còn lại": MỘT hàm dùng chung với cổng tiêu chí 6 số (lib/do-thi/phan-con-lai.js).
const KIEU_DU = { 1: 'PHAN_CON_LAI_CO_TEN', 2: 'LOAI_KHAC' };

function canhTenRieng(dem) {
  const t = T.tree();
  const ra = [];
  const nguonBieu = `bieu-thue@${t.bieuThue || 'chua-ro'}`;
  const nguonCua = (n) => n.tenNguon || (n.cap === 8 ? 'data/tax.json' : nguonBieu);
  const pn6Cua = (n) => (n.cap === 6 ? n.id : n.cap === 8 && typeof n.laPhanNhom === 'string' && n.laPhanNhom.length === 6 ? n.laPhanNhom : null);
  const them = (cap, tu, toi, tieuDeTu, tieuDeToi, kieuDu, nguon, khac = {}) => {
    if (!coNut(tu) || !coNut(toi)) { dem.them('C11', 'maKhongConTrongBieu'); return; }
    if (tu === toi) { dem.them('C11', 'tuTrungToi'); return; }
    if (!tieuDeToi || !tieuDeTu) { dem.them('C11', 'thieuTrich'); return; }
    if (!nguon) { dem.them('C11', 'thieuNguon'); return; }
    ra.push({
      id: `C11:${tu}>${toi}:${bam('C11', cap, tu, toi, tieuDeTu, tieuDeToi)}`, loai: 'C11', bac: BAC.LUAT, cap, tu, toi, kieuDu,
      tieuDeTu, tieuDeToi, tuKhoaTuTieuDe: tuKhoa(tieuDeToi), trich: tieuDeToi, nguon, sinhTuDong: true, ...khac,
    });
  };

  // ── Mức 6 số: trong một nhóm 4 số, tầng một gạch và tầng hai gạch ──
  const nhom4 = [...tapNut().nhom].sort();
  for (const h of nhom4) {
    const H = t.nodes.get(h);
    if (!H) continue;
    // muc = một ô của tầng một gạch: phân nhóm 6 số, hoặc nhóm một gạch `xxxxx` chứa các phân nhóm hai gạch.
    const tang = [];
    for (const cid of H.children) {
      const X = t.nodes.get(cid);
      if (!X) continue;
      if (X.cap === 'NHOM_MOT_GACH') {
        const tv = X.children.map((id) => t.nodes.get(id)).map((n) => ({ pn6: n && pn6Cua(n), ten: n && gotTen(n.tenVi), nut: n })).filter((m) => m.pn6);
        tang.push({ ten: gotTen(X.tenVi), nhomGach: X.id, nut: X, thanhVien: tv });
      } else {
        const p = pn6Cua(X);
        if (p) tang.push({ ten: gotTen(X.tenVi), nut: X, thanhVien: [{ pn6: p, ten: gotTen(X.tenVi), nut: X, chinhNo: true }] });
      }
    }
    const tieuDe = (muc, tv) => (tv.chinhNo ? tv.ten : [muc.ten, tv.ten].filter(Boolean).join(' > '));
    // Thành viên bị coi là KHÔNG có tiêu đề dùng được: tên rỗng, hoặc "Loại khác" trần mà nhóm một gạch bị lược tên.
    const dungDuoc = (muc, tv) => Boolean(tv.ten) && !(hangDu(tv.ten) === 2 && !tv.chinhNo && !muc.ten);
    for (const R of tang) {
      const r = hangDu(R.ten);
      if (r) {
        for (const S of tang) {
          if (S === R) continue;
          const s = hangDu(S.ten);
          if (s !== null && s >= r) continue; // chỉ thua ô có tên riêng hơn mình; ô bị lược tên (null) coi là có tên riêng
          for (const mr of R.thanhVien) {
            for (const ms of S.thanhVien) {
              if (!dungDuoc(S, ms)) { dem.them('C11', 'thieuTrich'); continue; }
              them(6, mr.pn6, ms.pn6, tieuDe(R, mr), tieuDe(S, ms), KIEU_DU[r], nguonCua(ms.nut), { tang: h });
            }
          }
        }
      }
      // tầng hai gạch bên trong nhóm một gạch
      if (R.nhomGach) {
        for (const mr of R.thanhVien) {
          const r2 = hangDu(mr.ten);
          if (!r2) continue;
          for (const ms of R.thanhVien) {
            if (ms === mr) continue;
            const s2 = hangDu(ms.ten);
            if (s2 === null) { dem.them('C11', 'thieuTrich'); continue; }
            if (s2 >= r2) continue;
            them(6, mr.pn6, ms.pn6, tieuDe(R, mr), tieuDe(R, ms), KIEU_DU[r2], nguonCua(ms.nut), { tang: R.nhomGach });
          }
        }
      }
    }
  }

  // ── Mức 8 số: dòng "Loại khác" → từng dòng có tên mà nó phải trừ (lib/hs-tree.js loaiKhacOf, đủ mọi tầng) ──
  const duongTen = (ma, tren) => [...T.tieuDeGiua(ma, tren).map((x) => gotTen(x.tenVi) || '(tiêu đề bị lược tên)'), gotTen(T.nodeOf(ma).tenVi)].join(' > ');
  for (const c of t.codes) {
    const n = t.nodes.get(c);
    if (!n || !n.loaiKhac) continue;
    const lk = T.loaiKhacOf(c);
    if (!lk) continue;
    const tieuDeTu = duongTen(c, lk.toTienCoTen);
    for (const g of T.exclusionLeavesByTier(c)) {
      for (const la of g.la) {
        const L = T.nodeOf(la);
        if (!L || !gotTen(L.tenVi)) { dem.them('C11', 'thieuTrich'); continue; }
        them(8, c, la, tieuDeTu, duongTen(la, g.nut), n.loaiKhacTran ? 'LOAI_KHAC' : 'LOAI_KHAC_CO_VE', 'data/tax.json', {
          tang: g.nut, cungPhanNhom: c.slice(0, 6) === la.slice(0, 6), ...(lk.dinhNghiaDuoc ? {} : { dinhNghiaDuoc: false }),
        });
      }
    }
  }
  return ra;
}

// ───────────────────────────────────────── C9 Chú-giải-chi-phối ─────────────────────────────────────────
const RE_MA_NHOM_C9 = /(?<!\d)(?<!\d\.)(\d{2})\.(\d{2})(?!\d)(?!\.\d)/g;

/** Tách văn bản chú giải thành các đoạn/điều khoản giữ nguyên từng ký tự gốc (rawText.includes(doan) === true). */
function tachDoanChuGiai(txt) {
  const blocks = /\n\s*\n/.test(txt) ? txt.split(/\n\s*\n/) : [txt];
  const out = [];
  for (const b of blocks) {
    if (b.length <= TRICH_C9_TOI_DA) { out.push(b); continue; }
    const lines = b.split('\n');
    let cur = '';
    for (const ln of lines) {
      const isStart = /^(?:\d{1,2}(?:\.-|[.)](?!\d))|\([a-z0-9ivx]+\)|\([A-ZIVX]+\)|Chú giải|TỔNG QUÁT|KHÁI QUÁT)/i.test(ln.trim());
      if (cur && isStart) { out.push(cur); cur = ln; }
      else cur = cur ? `${cur}\n${ln}` : ln;
    }
    if (cur) out.push(cur);
  }
  return out;
}

/** Rút đoạn nguyên văn <= 600 ký tự chứa nguyên mã đích (không chèn '…' để giữ khớp 100% chuỗi con trong data/chu-giai-chuong.json). */
function rutTrichChuGiai(doan, matchIdx, matchText) {
  const trimmed = doan.trim();
  if (trimmed.length <= TRICH_C9_TOI_DA) return trimmed;
  let start = 0;
  let end = doan.length;
  if (matchIdx + matchText.length <= TRICH_C9_TOI_DA - 20) {
    end = Math.min(doan.length, TRICH_C9_TOI_DA);
    const cut = Math.max(doan.lastIndexOf(' ', end), doan.lastIndexOf('\n', end));
    if (cut > matchIdx + matchText.length) end = cut;
  } else {
    start = Math.max(0, matchIdx - 220);
    if (start > 0) {
      const cands = [doan.indexOf(' ', start), doan.indexOf('\n', start)].filter((x) => x >= 0 && x < matchIdx);
      if (cands.length) start = Math.min(...cands) + 1;
    }
    end = Math.min(doan.length, start + TRICH_C9_TOI_DA);
    if (end < doan.length) {
      const cut = Math.max(doan.lastIndexOf(' ', end), doan.lastIndexOf('\n', end));
      if (cut > matchIdx + matchText.length) end = cut;
    }
  }
  let res = doan.slice(start, end).trim();
  if (res.length > TRICH_C9_TOI_DA || !res.includes(matchText)) {
    const s2 = Math.max(0, Math.min(matchIdx, doan.length - TRICH_C9_TOI_DA));
    const e2 = Math.min(doan.length, s2 + TRICH_C9_TOI_DA);
    res = doan.slice(s2, e2).trim();
  }
  return res;
}

/**
 * C9 = tham chiếu từ Chú giải Phần (`P:<LA_MA>`) và Chú giải Chương (`01`..`98`) tới mã nhóm 4 số trong biểu thuế.
 * Dùng cùng luật `phanHopLe` như lib/so-tay.js để không gán nhầm văn bản Phần VI sang Phần VII (ch.39–40).
 */
function canhChuGiaiChiPhoi(dem) {
  let cg = {}; let sections = [];
  try { cg = docJson('chu-giai-chuong.json') || {}; } catch { cg = {}; }
  try { sections = docJson('hs-sections.json').sections || []; } catch { sections = []; }

  const secOf = {};
  for (const s of sections) for (const c of s.chapters || []) secOf[String(c).padStart(2, '0')] = s.code;
  const groups = {};
  for (const [c, v] of Object.entries(cg)) {
    const t = chu(v && v.phan);
    if (t) (groups[t.slice(0, 200)] ||= []).push(String(c).padStart(2, '0'));
  }
  const phanOk = new Set();
  for (const chs of Object.values(groups)) {
    const count = {};
    for (const c of chs) if (secOf[c]) count[secOf[c]] = (count[secOf[c]] || 0) + 1;
    const major = Object.entries(count).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0];
    for (const c of chs) if (secOf[c] && secOf[c] === major) phanOk.add(c);
  }

  const ra = [];
  const quet = (tu, nguon, viTri, rawText) => {
    if (!coNut(tu)) { dem.them('C9', 'maKhongConTrongBieu'); return; }
    if (!chu(nguon)) { dem.them('C9', 'thieuNguon'); return; }
    if (!chu(rawText)) return;
    const thayToi = new Set();
    for (const doan of tachDoanChuGiai(rawText)) {
      for (const m of doan.matchAll(RE_MA_NHOM_C9)) {
        const before = doan.slice(Math.max(0, m.index - 15), m.index);
        const after = doan.slice(m.index + m[0].length, m.index + m[0].length + 15);
        // Bỏ số thập phân trong công thức tính toán / phần trăm (vd "x 28.22", "99.94 %").
        if (/\bx\s*$/i.test(before) || /^\s*%/.test(after)) continue;
        const toi = chuanNut(`${m[1]}${m[2]}`);
        if (!toi || toi.length !== 4) { dem.them('C9', 'maKhongConTrongBieu'); continue; }
        if (toi === tu) { dem.them('C9', 'tuTrungToi'); continue; }
        if (thayToi.has(toi)) { dem.them('C9', 'trungLap'); continue; }
        const trich = rutTrichChuGiai(doan, m.index, m[0]);
        if (!trich) { dem.them('C9', 'thieuTrich'); continue; }
        thayToi.add(toi);
        ra.push({
          id: `C9:${tu}>${toi}:${bam('C9', tu, toi, nguon, trich)}`,
          loai: 'C9', bac: BAC.LUAT, tu, toi, trich, nguon, viTri, sinhTuDong: true,
        });
      }
    }
  };

  for (const s of sections) {
    const ch = (s.chapters || []).map((c) => String(c).padStart(2, '0')).find((c) => phanOk.has(c));
    if (!ch) continue;
    const raw = cg[ch] && cg[ch].phan;
    if (chu(raw)) quet(`P:${s.code}`, `phan${ch}.phan`, `data/chu-giai-chuong.json#${ch}.phan`, String(raw));
  }
  for (const k of Object.keys(cg).sort()) {
    const ch = String(k).padStart(2, '0');
    const raw = cg[k] && cg[k].chuong;
    if (chu(raw)) quet(ch, `ch${ch}.chuong`, `data/chu-giai-chuong.json#${k}.chuong`, String(raw));
  }
  return ra;
}

// ───────────────────────────────────────── C1 gộp ─────────────────────────────────────────
const KHO_C1 = ['trade-synonyms', 'hs-aliases', 'vn-product-synonyms', 'synonyms', 'search-zh', 'ten-khac', 'english-product-map', 'brand-product-map'];

function chiMucGoiLa() {
  const cum = new Map(); // khoá không dấu → { cum: dạng gốc gặp đầu tiên, dich: Map("ma|kho" → mục) }
  const boQua = {};
  const bo = (kho, lyDo) => { boQua[kho] ||= {}; boQua[kho][lyDo] = (boQua[kho][lyDo] || 0) + 1; };
  const them = (kho, cumGoc, ma, khac = {}) => {
    const k = khongDau(cumGoc);
    if (k.length < 2) { bo(kho, 'cumQuaNgan'); return; }
    if (so(ma).length < 4) { bo(kho, 'capChuongKhongNhan'); return; }
    const nut = chuanNut(ma);
    if (!nut) { bo(kho, 'maKhongConTrongBieu'); return; }
    if (!cum.has(k)) cum.set(k, { cum: String(cumGoc).trim(), dich: new Map() });
    const d = cum.get(k).dich; const kd = `${nut}|${kho}`;
    if (!d.has(kd)) d.set(kd, { ma: nut, cap: nut.length, nguonKho: kho, ...khac });
  };
  const thu = (ham) => { try { ham(); } catch { /* thiếu kho thì bỏ qua kho đó; số theo kho trong thống kê sẽ lộ ra */ } };

  thu(() => { for (const e of docJson('trade-synonyms.json').entries || []) for (const term of e.terms || []) for (const c of e.candidates || []) them('trade-synonyms', term, c.hs, { muc: e.id }); });
  thu(() => {
    for (const a of docJson('hs-aliases.json').aliases || []) {
      them('hs-aliases', a.phrase, a.hsCode, { soLan: a.count || 0 });
      for (const x of a.alternatives || []) them('hs-aliases', a.phrase, x.hsCode, { soLan: x.count || 0, phu: true });
    }
  });
  thu(() => { const d = docJson('vn-product-synonyms.json'); for (const k of Object.keys(d)) for (const v of Array.isArray(d[k]) ? d[k] : []) if (/^\d{4,8}$/.test(String(v))) them('vn-product-synonyms', k, v); });
  thu(() => { const d = docJson('synonyms.json').muc || {}; for (const ma of Object.keys(d)) for (const m of d[ma] || []) if (m && m.en) them('synonyms', m.en, ma, { nhan: m.nhan || null }); });
  thu(() => { for (const s of docJson('search.json')) { const zh = chu(s && s.zh); if (!zh) continue; if (/^其他/.test(zh)) { bo('search-zh', 'tenDu'); continue; } them('search-zh', zh, s.hs); } });
  thu(() => {
    for (const f of fs.readdirSync(dataReadPath('tu-vung')).filter((x) => /^ten-khac-\d{4}\.json$/.test(x)).sort()) {
      const j = docJson('tu-vung', f);
      for (const m of j.muc || []) {
        if (!m) continue;
        // Bỏ TRAI_NGHIA (vd "chốt cài" ở 85395210, "26K-Plate terminal" ở 87141010..70) — từ trái nghĩa chỉ dùng chặn chốt, không phải tên đồng nghĩa vào C1.
        if (m.loai === 'TRAI_NGHIA') { bo('ten-khac', 'traiNghia'); continue; }
        for (const ng of ['vi', 'en', 'zh']) for (const c of (m.cachDoc && m.cachDoc[ng]) || []) them('ten-khac', c, m.ma || j.nhom, { kieu: m.kieu || null });
      }
    }
  });

  // Hai kho cụm → cụm (không có mã): giải qua các kho có mã ở trên, khớp NGUYÊN cụm, quy về nhóm 4 số.
  const biDanh = [];
  const trucTiep = new Map([...cum].map(([k, v]) => [k, [...new Set([...v.dich.values()].map((d) => d.ma.slice(0, 4)))].sort()]));
  for (const [kho, tep] of [['english-product-map', 'english-product-map.json'], ['brand-product-map', 'brand-product-map.json']]) {
    thu(() => {
      const d = docJson(tep);
      for (const k of Object.keys(d).sort()) {
        for (const v of Array.isArray(d[k]) ? d[k] : []) {
          const nhom = trucTiep.get(khongDau(v));
          if (!nhom) { biDanh.push({ cum: k, sang: String(v), nguonKho: kho }); continue; }
          for (const h of nhom) them(kho, k, h, { qua: String(v) });
        }
      }
    });
  }

  const xep = [...cum.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => [k, { cum: v.cum, dich: [...v.dich.values()].sort((x, y) => (x.ma + x.nguonKho < y.ma + y.nguonKho ? -1 : 1)) }]);
  biDanh.sort((a, b) => (`${a.nguonKho}|${a.cum}|${a.sang}` < `${b.nguonKho}|${b.cum}|${b.sang}` ? -1 : 1));

  // Thống kê trùng / mâu thuẫn GIỮA các kho (không tự xử): cùng cụm, ≥ 2 kho; mâu thuẫn = có hai kho không chung nhóm 4 số nào.
  const theoKho = Object.fromEntries(KHO_C1.map((k) => [k, 0]));
  let soDich = 0; let cumNhieuKho = 0; const mauThuan = [];
  for (const [k, v] of xep) {
    const nhomTheoKho = {};
    for (const d of v.dich) { soDich += 1; (nhomTheoKho[d.nguonKho] ||= new Set()).add(d.ma.slice(0, 4)); }
    const kho = Object.keys(nhomTheoKho).sort();
    for (const x of kho) theoKho[x] += 1;
    if (kho.length < 2) continue;
    cumNhieuKho += 1;
    let lech = false;
    for (let i = 0; i < kho.length && !lech; i += 1) for (let j = i + 1; j < kho.length; j += 1) if (![...nhomTheoKho[kho[i]]].some((h) => nhomTheoKho[kho[j]].has(h))) { lech = true; break; }
    if (lech) mauThuan.push({ khoa: k, cum: v.cum, theoKho: Object.fromEntries(kho.map((x) => [x, [...nhomTheoKho[x]].sort()])) });
  }
  return {
    cum: xep, biDanh, mauThuan,
    thongKe: { soCum: xep.length, soDich, cumTheoKho: theoKho, cumNhieuKho, cumMauThuanNhom: mauThuan.length, biDanhChuaGiai: biDanh.length, boQua: sapKhoa(boQua) },
  };
}

// ───────────────────────────────────────── WCO opinions (#1636 Việc 3) ───────────────────────────────
function canhWco(dem) {
  let ops = []; let viMap = {};
  try { ops = docJson('wco-op', 'opinions.json'); } catch { ops = []; }
  try { viMap = docJson('wco-op', 'vi.json'); } catch { viMap = {}; }
  const wcoOp = require('../wco-op');
  const ra = [];
  for (const o of Array.isArray(ops) ? ops : []) {
    const hs = so(o && o.hs);
    const toi = chuanNut(hs);
    const tu = hs.length === 6 ? chuanNut(hs.slice(0, 4)) : hs.length === 4 ? chuanNut(hs.slice(0, 2)) : null;
    if (!toi || !tu) { dem.them('WCO', 'maKhongConTrongBieu'); continue; }
    if (tu === toi) { dem.them('WCO', 'tuTrungToi'); continue; }
    const txt = chu(o.text);
    if (!txt) { dem.them('WCO', 'thieuTrich'); continue; }
    const trich = txt.length > TRICH_C9_TOI_DA ? `${txt.slice(0, TRICH_C9_TOI_DA - 1)}…` : txt;
    const nguon = `wco-op.${hs}.${o.ord}`;
    const vi = viMap[o.line]?.vi || null;
    ra.push({
      id: `WCO:${tu}>${toi}:${o.id}`, loai: 'WCO', bac: o.headingSuspect ? BAC.THONG_BAO : BAC.LUAT,
      tu, toi, idWco: o.id, hs, thuTu: o.ord, soIn: o.ordPrinted ?? null,
      namThongQua: o.adoption ?? null, quyTacWco: chu(o.application) || null,
      trich, banDichVi: vi, nguon,
      doTinCay: o.headingSuspect ? 'NGHI_NGO_OCR' : wcoOp.doTinCay(o),
      headingSuspect: Boolean(o.headingSuspect), headingContinued: Boolean(o.headingContinued),
      viTri: `data/wco-op/opinions.json#${o.id}`, sinhTuDong: true,
    });
  }
  return ra;
}

// ───────────────────────────────────────── C16 Phân-biệt-theo-nghĩa (bản đồ tầng 4 số) ───────────────────────────────
/**
 * C16 = mỗi mục `canh[]` của data/do-thi/ban-do-4so/<nhóm>.json (khuôn bd4@1, nguonLoai AI_NHAP, soạn ở Studio, đã qua
 * scripts/kiem-ban-do-4so.mjs) là một cạnh hai chiều nhóm ↔ láng giềng. Bậc 1 CHỈ KHI cả hai điều kiện: (1) bản đã chấm chéo `chamCheo === 'DUYET'`
 * (QUY-TRINH-BAN-DO-4SO.md), (2) MỌI căn cứ của cạnh còn là chuỗi con nguyên văn của đoạn nguồn (kiểm lại ngay khi dựng, không tin cờ trong tệp).
 * Ngược lại bậc 4: chỉ để gợi ý, không để chốt.
 */
/** C17 = chú giải chi tiết nhóm `tu` nhắc tên nhóm `den` mà các loại cạnh khác chưa có. Trích nguyên văn, quanHe do mô hình gắn nên bậc 4. */
function canhNhacNhom(dem) {
  let d;
  try { d = docJson('do-thi', 'canh-nhac-nhom.json'); } catch { return []; }
  const ra = [];
  for (const x of d.canh || []) {
    const a = chuanNut(x.tu); const b = chuanNut(x.den);
    if (!a || !b || a.length !== 4 || b.length !== 4) { dem.them('C17', 'maKhongConTrongBieu'); continue; }
    if (a === b) { dem.them('C17', 'tuTrungToi'); continue; }
    if (!x.trich) { dem.them('C17', 'thieuTrich'); continue; }
    ra.push({ id: `C17:${a}>${b}:${bam('C17', a, b, x.quanHe, x.trich)}`, loai: 'C17', bac: BAC.TU_DIEN_CHUA_DUYET, sinhTuDong: true, tu: a, toi: b, quanHe: x.quanHe, ...(x.chuaChac ? { chuaChac: true } : {}), trich: x.trich, nguon: x.nguon });
  }
  return ra;
}
function canhBanDo4So(dem) {
  const B = require('./ban-do-4so');
  let tep = [];
  try { tep = fs.readdirSync(dataReadPath('do-thi', 'ban-do-4so')).filter((f) => /^\d{4}\.json$/.test(f)).sort(); } catch { tep = []; }
  const ra = [];
  for (const f of tep) {
    let b = null;
    try { b = docJson('do-thi', 'ban-do-4so', f); } catch { dem.them('C16', 'tepHong'); continue; }
    const a = chuanNut(b && b.nhom);
    if (!a || a.length !== 4 || a !== f.slice(0, 4)) { dem.them('C16', 'maKhongConTrongBieu'); continue; }
    if (b.chamCheo === 'BO') { dem.them('C16', 'chamCheoBo'); continue; }
    (Array.isArray(b.canh) ? b.canh : []).forEach((c, i) => {
      const den = chuanNut(c && c.den);
      if (!den || den.length !== 4) { dem.them('C16', 'maKhongConTrongBieu'); return; }
      if (den === a) { dem.them('C16', 'tuTrungToi'); return; }
      const canCu = (Array.isArray(c.canCu) ? c.canCu : []).filter((x) => chu(x && x.nguon) && chu(x && x.trich));
      if (!canCu.length) { dem.them('C16', 'thieuCanCu'); return; }
      const dung = canCu.every((x) => B.vanBanTheoId(x.nguon).some((vb) => B.trichNguyenVan(x.trich, vb)));
      const bacCanh = b.chamCheo === 'DUYET' && dung && canCu.length === c.canCu.length ? BAC.LUAT : BAC.TU_DIEN_CHUA_DUYET;
      const dieuKien = chu(c.neu);
      ra.push({
        id: `C16:${a}>${den}:${bam('C16', a, den, chu(c.dacDiem), dieuKien, canCu.map((x) => x.nguon + x.trich))}`, loai: 'C16', bac: bacCanh, tu: a, toi: den, haiChieu: true,
        loaiQuanHe: chu(c.loai), dacDiem: chu(c.dacDiem), dieuKien, tuKhoaDieuKien: tuKhoa(`${chu(c.dacDiem)} ${dieuKien}`),
        neu: dieuKien, thi: chu(c.thi), conNeu: chu(c.conNeu), thiKia: chu(c.thiKia), quyTac: chu(c.quyTac) || null,
        canCu: canCu.map((x) => ({ nguon: chu(x.nguon), trich: chu(x.trich) })), canCuNguyenVan: dung,
        trich: chu(canCu[0].trich), nguon: chu(canCu[0].nguon),
        nguonLoai: b.nguonLoai || 'AI_NHAP', chamCheo: b.chamCheo || null, viTri: `data/do-thi/ban-do-4so/${f}#canh[${i}]`, sinhTuDong: false,
      });
    });
  }
  return ra;
}

// ───────────────────────────────────────── Dựng toàn bộ ─────────────────────────────────────────
const THU_TU = Object.fromEntries(LOAI_CANH.map((l, i) => [l, i]));
const soSanhCanh = (a, b) => THU_TU[a.loai] - THU_TU[b.loai] || (a.tu < b.tu ? -1 : a.tu > b.tu ? 1 : 0) || (a.toi < b.toi ? -1 : a.toi > b.toi ? 1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Dựng bảng cạnh + chỉ mục C1 từ tệp gốc. Kết quả chỉ phụ thuộc nội dung tệp: cùng tệp ⇒ cùng `bam` (sha256).
 * @returns {{canh: object[], c1: object, biLoai: object, thongKe: object, bam: string}}
 */
function getCanhDataset(dem, filterTypes = null) {
  const { c5: c5Tho, c7, loaiTru: loaiTruTho } = canhSoTay(dem);
  const gop = (ds, loai) => {
    const m = new Map();
    for (const e of ds) { if (m.has(e.id)) dem.them(loai, 'trungLap'); else m.set(e.id, e); }
    return [...m.values()];
  };
  const c5 = gop(c5Tho, 'C5');
  const c6 = daoLoaiTru(c5);

  const result = [];
  const builders = {
    'C5': () => c5,
    'C6': () => c6,
    'C7': () => gop(c7, 'C7'),
    'C8': () => gop(canhDeNham(dem), 'C8'),
    'C9': () => gop(canhChuGiaiChiPhoi(dem), 'C9'),
    'C10': () => gop(canhTieuChi6(dem), 'C10'),
    'C11': () => gop(canhTenRieng(dem), 'C11'),
    'LOAI_TRU': () => gop(loaiTruTho, 'LOAI_TRU'),
    'WCO': () => gop(canhWco(dem), 'WCO'),
    'C16': () => gop(canhBanDo4So(dem), 'C16'),
    'C17': () => gop(canhNhacNhom(dem), 'C17'),
  };

  if (!filterTypes) {
    for (const l of LOAI_CANH) result.push(...(builders[l] ? builders[l]() : []));
  } else {
    for (const l of filterTypes) result.push(...(builders[l] ? builders[l]() : []));
  }
  return result.sort(soSanhCanh);
}

function dungCanhNgang() {
  const dem = soDem();
  return getCanhDataset(dem, ['C5', 'C6', 'C7', 'C8', 'LOAI_TRU', 'C16', 'C17']);
}

function dungBangCanh() {
  const dem = soDem();
  const canh = getCanhDataset(dem);
  const c1 = chiMucGoiLa();
  const biLoai = dem.ra();

  const soCanh = Object.fromEntries(LOAI_CANH.map((l) => [l, 0]));
  const theoBac = {};
  for (const e of canh) { soCanh[e.loai] += 1; theoBac[e.bac] = (theoBac[e.bac] || 0) + 1; }
  const dem2 = (loc) => canh.filter(loc).length;
  let maKhongCon = 0;
  for (const l of Object.keys(biLoai)) maKhongCon += biLoai[l].maKhongConTrongBieu || 0;
  for (const k of Object.keys(c1.thongKe.boQua)) maKhongCon += c1.thongKe.boQua[k].maKhongConTrongBieu || 0;
  const thongKe = {
    soCanh, tongCanh: canh.length, theoBac: sapKhoa(theoBac),
    c6: { tong: soCanh.C6, chuaCoChieuThuan: dem2((e) => e.loai === 'C6' && !e.daCoChieuThuan), daCoChieuThuan: dem2((e) => e.loai === 'C6' && e.daCoChieuThuan) },
    c8: { tuTuDienCapDeNham: dem2((e) => e.loai === 'C8' && e.nguonKho === 'confusion-pairs'), tuThongBaoPhanLoai: dem2((e) => e.loai === 'C8' && e.nguonKho === 'precedents') },
    c9: {
      tong: soCanh.C9,
      soPhan: new Set(canh.filter((e) => e.loai === 'C9' && e.tu.startsWith('P:')).map((e) => e.tu)).size,
      soChuong: new Set(canh.filter((e) => e.loai === 'C9' && /^\d{2}$/.test(e.tu)).map((e) => e.tu)).size,
      soNhomDich: new Set(canh.filter((e) => e.loai === 'C9').map((e) => e.toi)).size,
      tuPhan: dem2((e) => e.loai === 'C9' && e.tu.startsWith('P:')),
      tuChuong: dem2((e) => e.loai === 'C9' && /^\d{2}$/.test(e.tu)),
    },
    c10: {
      tong: soCanh.C10, soNhom: new Set(canh.filter((e) => e.loai === 'C10').map((e) => e.tu)).size, soPhanNhom: new Set(canh.filter((e) => e.loai === 'C10').map((e) => e.toi)).size,
      coKhoaDuKien: dem2((e) => e.loai === 'C10' && e.khoaDuKien), phanConLai: dem2((e) => e.loai === 'C10' && e.phanConLai), coThuTu: dem2((e) => e.loai === 'C10' && Number.isInteger(e.thuTu)),
    },
    c11: { cap6: dem2((e) => e.loai === 'C11' && e.cap === 6), cap8: dem2((e) => e.loai === 'C11' && e.cap === 8), cap8CungPhanNhom: dem2((e) => e.loai === 'C11' && e.cap === 8 && e.cungPhanNhom), cap8KhongDinhNghiaDuoc: dem2((e) => e.loai === 'C11' && e.dinhNghiaDuoc === false) },
    loaiTru: { tong: soCanh.LOAI_TRU, nhomNguon: new Set(canh.filter((e) => e.loai === 'LOAI_TRU').map((e) => e.tu)).size, toiChuong: dem2((e) => e.loai === 'LOAI_TRU' && e.toi.length === 2) },
    wco: { tong: soCanh.WCO, nhomDich: new Set(canh.filter((e) => e.loai === 'WCO').map((e) => e.toi)).size, tinCayCao: dem2((e) => e.loai === 'WCO' && !e.headingSuspect), nghiNgoOcr: dem2((e) => e.loai === 'WCO' && e.headingSuspect) },
    c16: { tong: soCanh.C16, soNhom: new Set(canh.filter((e) => e.loai === 'C16').map((e) => e.tu)).size, bac1: dem2((e) => e.loai === 'C16' && e.bac === 1), bac4: dem2((e) => e.loai === 'C16' && e.bac === 4), canCuHong: dem2((e) => e.loai === 'C16' && e.canCuNguyenVan === false) },
    biLoai, maKhongConTrongBieu: maKhongCon, c1: c1.thongKe,
  };
  const bamTong = crypto.createHash('sha256').update(JSON.stringify({ canh, c1: { cum: c1.cum, biDanh: c1.biDanh } })).digest('hex');
  return { canh, c1, biLoai, thongKe, bam: bamTong };
}

module.exports = { dungBangCanh, dungCanhNgang, chuanNut, coNut, tapNut, hangDu, LOAI_CANH, BAC, KHO_C1 };
