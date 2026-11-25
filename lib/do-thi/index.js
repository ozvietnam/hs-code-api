// lib/do-thi/index.js — ĐỌC bảng cạnh của đồ thị tri thức HS (ADR-0002).
//
// Bảng cạnh dựng trong RAM ở lần gọi đầu (lib/do-thi/dung-bang-canh.js, tất định). KHÔNG có tệp cạnh trên đĩa: bảng cạnh ≈ 19,6 MB + chỉ mục C1 ≈ 4,8 MB, vượt
// ngưỡng 5 MB để commit; chỉ commit số đếm ở data/do-thi/thong-ke.json (cổng scripts/test-bang-canh.mjs giữ khớp).
//
// GIAI ĐOẠN 1: CHƯA đường khách nào nạp module này (data/luat/dau-noi.json mục kho.bangCanh; cổng máy đỏ nếu có tệp
// trong api/ hay lib/ ngoài lib/do-thi/ nạp nó mà bảng chưa sửa).
//
// Hai chế độ đi cạnh ngang TÁCH RIÊNG (kế hoạch mục 5, bước 2 và bước 4):
//   moRongUngVien(nhomUngVien, moTa)  — ĐƯỢC kéo nhóm CHƯA là ứng viên, nhưng chỉ khi điều kiện của chính dòng loại trừ
//                                        khớp mô tả hàng; có trần (mặc định 3).
//   canhGiuaNhomConSong(dsNhom)       — CHỈ cạnh nối giữa các nhóm đã có trong danh sách; không kéo thêm nhóm nào.
'use strict';

const { dungBangCanh, dungCanhNgang, chuanNut, coNut, tapNut, LOAI_CANH, BAC } = require('./dung-bang-canh');
const { khopDieuKien, tapTuMoTa } = require('./tu-khoa');

const LOAI_NGANG = ['C5', 'C6', 'C7', 'C8', 'C16'];
const TRAN_MAC_DINH = 50;
const BUOC_TOI_DA = 4;

let _b = null;
let _canhNgangCache = null;
function bangCanh() {
  if (_b) return _b;
  const d = dungBangCanh();
  const theoId = new Map(); const tu = new Map(); const toi = new Map(); const theoNhom = new Map();
  const day = (m, k, e) => { if (!m.has(k)) m.set(k, []); m.get(k).push(e); };
  for (const e of d.canh) {
    theoId.set(e.id, e); day(tu, e.tu, e); day(toi, e.toi, e);
    const a = e.tu.slice(0, 4); const b = e.toi.slice(0, 4);
    if (a !== b && e.loai !== 'C11' && e.loai !== 'C9') { day(theoNhom, a, e); day(theoNhom, b, e); }
  }
  _b = { ...d, theoId, tu, toi, theoNhom, c1Map: new Map(d.c1.cum) };
  return _b;
}
/** Bỏ bảng trong RAM (test, hoặc sau khi tệp gốc đổi). */
function datLai() { _b = null; _con = null; _canhNgangCache = null; }

const dsLoai = (loai) => (loai == null ? null : new Set(Array.isArray(loai) ? loai : [loai]));
const laChiC9 = (loai) => loai === 'C9' || (Array.isArray(loai) && loai.length === 1 && loai[0] === 'C9');
const khopUngVien = (nut, ds) => ds.some((u) => nut === u || (nut.length >= 4 && u.length >= 4 && /^\d+$/.test(nut) && /^\d+$/.test(u) && (nut.startsWith(u) || u.startsWith(nut))));
function locChung(ds, loai, { chiKhiCaHaiLaUngVien = null, toiDa = TRAN_MAC_DINH } = {}) {
  const L = dsLoai(loai);
  const uv = chiKhiCaHaiLaUngVien ? [...chiKhiCaHaiLaUngVien].map((x) => chuanNut(x)).filter(Boolean) : null;
  const ra = [];
  for (const e of ds) {
    if (L && !L.has(e.loai)) continue;
    if (uv && !(khopUngVien(e.tu, uv) && khopUngVien(e.toi, uv))) continue;
    ra.push(e);
    if (ra.length >= toiDa) break;
  }
  return ra;
}

/**
 * Cạnh ĐI RA từ một nút (đúng nút đó, không gồm nút con): cạnh có `tu` = nút, và cạnh hai chiều có `toi` = nút.
 * @param {string} nut  phần `P:<LA_MA>` / chương 2 số / nhóm 4 số / phân nhóm 6 số / dòng 8 số
 * @param {string|string[]} [loai]  lọc theo loại cạnh
 * @param {{chiKhiCaHaiLaUngVien?: Iterable<string>, toiDa?: number}} [tuyChon]  `chiKhiCaHaiLaUngVien`: chỉ giữ cạnh mà CẢ
 *        HAI đầu đều thuộc danh sách ứng viên (so theo tiền tố mã) — chống một nhóm bị trỏ từ hàng chục nhóm làm nổ danh sách.
 */
function canhTu(nut, loai, tuyChon) {
  const n = chuanNut(nut); if (!n) return [];
  const b = bangCanh();
  const tuyChonDung = (!tuyChon || tuyChon.toiDa === undefined) && (n.startsWith('P:') || n.length === 2 || laChiC9(loai))
    ? { ...(tuyChon || {}), toiDa: Infinity }
    : tuyChon;
  return locChung([...(b.tu.get(n) || []), ...(b.toi.get(n) || []).filter((e) => e.haiChieu)], loai, tuyChonDung);
}
/** Cạnh ĐI VÀO một nút: cạnh có `toi` = nút, và cạnh hai chiều có `tu` = nút. Tham số như canhTu. */
function canhToi(nut, loai, tuyChon) {
  const n = chuanNut(nut); if (!n) return [];
  const b = bangCanh();
  const tuyChonDung = (!tuyChon || tuyChon.toiDa === undefined) && laChiC9(loai)
    ? { ...(tuyChon || {}), toiDa: Infinity }
    : tuyChon;
  return locChung([...(b.toi.get(n) || []), ...(b.tu.get(n) || []).filter((e) => e.haiChieu)], loai, tuyChonDung);
}
/** Đầu bên kia của một cạnh, nhìn từ `nut`. */
const dauKia = (canh, nut) => (canh.tu === nut ? canh.toi : canh.tu);

// Quan hệ cha–con theo chữ số (không phải cạnh lưu): 8 số → 6 số → 4 số.
let _con = null;
function conCua(nut) {
  if (!_con) {
    _con = new Map();
    const n = tapNut();
    const day = (k, v) => { if (!_con.has(k)) _con.set(k, []); _con.get(k).push(v); };
    for (const p of [...n.pn6].sort()) day(p.slice(0, 4), p);
    for (const c of [...n.ma8].sort()) day(c.slice(0, 6), c);
  }
  return _con.get(nut) || [];
}
const chaCua = (nut) => (nut.length === 8 ? nut.slice(0, 6) : nut.length === 6 ? nut.slice(0, 4) : null);

/**
 * Đường đi ngắn nhất từ `tu` tới `toi`, tối đa `toiDaBuoc` bước (trần cứng 4). Mỗi bước là một cạnh lưu (đúng chiều; cạnh
 * hai chiều đi được cả hai hướng) hoặc — khi `quaCay` (mặc định bật) — một bước cấu trúc lên cha / xuống con theo chữ số
 * của mã (`loai: 'CAY'`, không có trích dẫn, không phải căn cứ).
 * @returns {null | {soBuoc: number, buoc: Array<{loai, tu, toi, id?: string, huong?: 'len'|'xuong'}>}}
 */
function duongDi(tu, toi, toiDaBuoc = 2, { loai = null, quaCay = true, chiKhiCaHaiLaUngVien = null } = {}) {
  const a = chuanNut(tu); const z = chuanNut(toi);
  if (!a || !z) return null;
  if (a === z) return { soBuoc: 0, buoc: [] };
  const tran = Math.max(1, Math.min(Number(toiDaBuoc) || 2, BUOC_TOI_DA));
  const truoc = new Map([[a, null]]);
  let lop = [a];
  for (let k = 0; k < tran && lop.length; k += 1) {
    const ke = [];
    for (const n of lop) {
      const buoc = canhTu(n, loai, { chiKhiCaHaiLaUngVien, toiDa: Infinity }).map((e) => ({ loai: e.loai, tu: n, toi: dauKia(e, n), id: e.id }));
      if (quaCay) {
        const cha = chaCua(n);
        if (cha && coNut(cha)) buoc.push({ loai: 'CAY', tu: n, toi: cha, huong: 'len' });
        for (const c of conCua(n)) buoc.push({ loai: 'CAY', tu: n, toi: c, huong: 'xuong' });
      }
      for (const s of buoc) {
        if (truoc.has(s.toi)) continue;
        truoc.set(s.toi, s);
        if (s.toi === z) {
          const ra = [];
          for (let x = s; x; x = truoc.get(x.tu)) ra.unshift(x);
          return { soBuoc: ra.length, buoc: ra };
        }
        ke.push(s.toi);
      }
    }
    lop = ke;
  }
  return null;
}

/** Cạnh ngang của một nhóm 4 số nhìn từ chính nhóm đó: cạnh có hướng chỉ tính khi đi RA từ nhóm; cạnh hai chiều tính cả hai. */
function canhNgangCuaNhom(nhom, loai) {
  const L = dsLoai(loai) || new Set(LOAI_NGANG);
  const chiNgang = [...L].every((l) => ['C5', 'C6', 'C7', 'C8', 'LOAI_TRU', 'C16', 'C17'].includes(l));
  return ((chiNgang ? chiMucNgang() : bangCanh().theoNhom).get(nhom) || []).filter((e) => L.has(e.loai) && (e.haiChieu || e.tu.slice(0, 4) === nhom));
}

/**
 * Các nhóm 4 số dễ nhầm với `nhom` theo cạnh ngang (C5, C6, C7, C8 — gồm cả cạnh ghi ở mức 6 / 8 số bên trong nhóm).
 * @returns {Array<{nhom: string, soCanh: number, theoLoai: object, bacCaoNhat: number, viDu: string[]}>} nhiều cạnh trước
 */
function nhomDeNham(nhom, { loai = null, chiKhiCaHaiLaUngVien = null, toiDa = 10 } = {}) {
  const h = String(nhom || '').replace(/\D/g, '').slice(0, 4);
  if (!coNut(h)) return [];
  const uv = chiKhiCaHaiLaUngVien ? new Set([...chiKhiCaHaiLaUngVien].map((x) => String(x).replace(/\D/g, '').slice(0, 4))) : null;
  const m = new Map();
  for (const e of canhNgangCuaNhom(h, loai)) {
    const kia = e.tu.slice(0, 4) === h ? e.toi.slice(0, 4) : e.tu.slice(0, 4);
    if (uv && !(uv.has(kia) && uv.has(h))) continue;
    if (!m.has(kia)) m.set(kia, { nhom: kia, soCanh: 0, theoLoai: {}, bacCaoNhat: e.bac, viDu: [] });
    const x = m.get(kia);
    x.soCanh += 1; x.theoLoai[e.loai] = (x.theoLoai[e.loai] || 0) + 1; x.bacCaoNhat = Math.min(x.bacCaoNhat, e.bac);
    if (x.viDu.length < 3) x.viDu.push(e.id);
  }
  return [...m.values()].sort((a, b) => b.soCanh - a.soCanh || (a.nhom < b.nhom ? -1 : 1)).slice(0, toiDa);
}

/**
 * BƯỚC 2 — mở rộng ứng viên: kéo thêm nhóm CHƯA có trong ứng viên, chỉ qua cạnh loại trừ (C5 / C6) mà điều kiện của
 * chính dòng loại trừ gốc KHỚP mô tả hàng (lib/do-thi/tu-khoa.js khopDieuKien). Không khớp thì không kéo, dù có cạnh.
 * @param {Iterable<string>} nhomUngVien  các nhóm 4 số đang là ứng viên
 * @param {string} moTa                   mô tả hàng của khách
 * @param {{toiDa?: number}} [tuyChon]    trần số nhóm kéo thêm (mặc định 3)
 * @returns {Array<{nhom: string, tuNhom: string, canh: string, loai: string, bac: number, soKhop: number, tyLe: number, dieuKien: string, trich: string, nguon: string}>}
 */
function moRongUngVien(nhomUngVien, moTa, { toiDa = 3 } = {}) {
  const uv = [...new Set([...(nhomUngVien || [])].map((x) => String(x).replace(/\D/g, '').slice(0, 4)).filter(coNut))].sort();
  const tuMoTa = tapTuMoTa(moTa);
  if (!uv.length || !tuMoTa.size) return [];
  const coSan = new Set(uv);
  const totNhat = new Map();
  for (const h of uv) {
    for (const e of canhNgangCuaNhom(h, ['C5', 'C6'])) {
      const kia = e.toi.slice(0, 4);
      if (coSan.has(kia)) continue;
      const k = khopDieuKien(e.tuKhoaDieuKien, tuMoTa);
      if (!k) continue;
      const cu = totNhat.get(kia);
      if (!cu || k.soKhop > cu.soKhop || (k.soKhop === cu.soKhop && (k.tyLe > cu.tyLe || (k.tyLe === cu.tyLe && e.id < cu.canh)))) {
        totNhat.set(kia, { nhom: kia, tuNhom: h, canh: e.id, loai: e.loai, bac: e.bac, soKhop: k.soKhop, tyLe: k.tyLe, dieuKien: e.dieuKien, trich: e.trich, nguon: e.nguon });
      }
    }
  }
  return [...totNhat.values()].sort((a, b) => b.soKhop - a.soKhop || b.tyLe - a.tyLe || (a.nhom < b.nhom ? -1 : 1)).slice(0, Math.max(0, toiDa));
}

function filterCanhGiua(edges, song, loaiSet, toiDa) {
  const thay = new Set();
  const ra = [];
  for (const e of edges) {
    if (thay.has(e.id) || !loaiSet.has(e.loai)) continue;
    if (!song.has(e.tu.slice(0, 4)) || !song.has(e.toi.slice(0, 4))) continue;
    thay.add(e.id);
    ra.push(e);
    if (ra.length >= toiDa) break;
  }
  return ra;
}

function collectEdgesFromNhomMap(nhomMap, song) {
  const edges = [];
  for (const h of [...song].sort()) {
    edges.push(...(nhomMap.get(h) || []));
  }
  return edges;
}

function getEdgesAndFilter(nhomMap, song, L, toiDa) {
  const edges = collectEdgesFromNhomMap(nhomMap, song);
  return filterCanhGiua(edges, song, L, toiDa);
}

/**
 * BƯỚC 4 — cạnh ngang CHỈ giữa các nhóm còn sống: cả hai đầu cạnh thuộc hai nhóm KHÁC nhau trong `dsNhom`.
 * Không bao giờ trả cạnh chạm nhóm ngoài danh sách.
 */
function canhGiuaNhomConSong(dsNhom, { loai = null, toiDa = 200 } = {}) {
  const song = new Set([...(dsNhom || [])].map((x) => String(x).replace(/\D/g, '').slice(0, 4)).filter(coNut));
  const L = dsLoai(loai) || new Set(LOAI_NGANG);
  return getEdgesAndFilter(bangCanh().theoNhom, song, L, toiDa);
}

/** Như canhGiuaNhomConSong cho bảy loại cạnh ngang, nhưng không dựng cả bảng cạnh. */
function canhNgangGiua(dsNhom, { loai = null, toiDa = 200 } = {}) {
  const song = new Set([...(dsNhom || [])].map((x) => String(x).replace(/\D/g, '').slice(0, 4)).filter(coNut));
  const L = dsLoai(loai) || new Set(LOAI_NGANG);

  const isOnlyNgang = [...L].every(l => ['C5', 'C6', 'C7', 'C8', 'LOAI_TRU', 'C16', 'C17'].includes(l));
  if (loai && !isOnlyNgang) {
    return canhGiuaNhomConSong(dsNhom, { loai, toiDa });
  }

  return getEdgesAndFilter(chiMucNgang(), song, L, toiDa);
}

/** Chỉ mục cạnh ngang theo nhóm: dùng bảng đầy đủ nếu đã dựng, không thì chỉ dựng phần cạnh ngang (nhanh hơn nhiều, ít RAM). */
function chiMucNgang() {
  if (_b) return _b.theoNhom;
  if (!_canhNgangCache) {
    const edges = dungCanhNgang();
    const theoNhom = new Map();
    for (const e of edges) {
      const a = e.tu.slice(0, 4); const b_ = e.toi.slice(0, 4);
      if (a !== b_) {
        if (!theoNhom.has(a)) theoNhom.set(a, []);
        theoNhom.get(a).push(e);
        if (!theoNhom.has(b_)) theoNhom.set(b_, []);
        theoNhom.get(b_).push(e);
      }
    }
    _canhNgangCache = { edges, theoNhom };
  }

  return _canhNgangCache.theoNhom;
}

/** C1 gộp: tra một cụm (khớp nguyên cụm, không phân biệt dấu / hoa thường) → { cum, dich: [{ma, cap, nguonKho, …}] } hoặc null. */
function timCum(cum) {
  const { khongDau } = require('./tu-khoa');
  return bangCanh().c1Map.get(khongDau(cum)) || null;
}

const canhTheoId = (id) => bangCanh().theoId.get(id) || null;
const thongKe = () => bangCanh().thongKe;

module.exports = {
  bangCanh, datLai, canhTu, canhToi, dauKia, duongDi, nhomDeNham, moRongUngVien, canhGiuaNhomConSong, canhNgangGiua, canhNgangCuaNhom,
  timCum, canhTheoId, thongKe, chuanNut, coNut, LOAI_CANH, LOAI_NGANG, BAC,
};
