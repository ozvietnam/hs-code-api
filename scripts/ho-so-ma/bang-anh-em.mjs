#!/usr/bin/env node
// scripts/ho-so-ma/bang-anh-em.mjs — M-81 (#2410, ADR-0007): sinh bảng quyết định anh em (bang-anh-em@1) tất định, không LLM.
//   node scripts/ho-so-ma/bang-anh-em.mjs --chuong 85 [--luat data/luat-goc] [--ho-so data/ho-so-ma] [--ra <dir>] [--ghi]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { CO_BANG_ANH_EM, kiemBanGhi, kiemBangAnhEm, kiemKhoHoSo } from './khuon.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');

export const CO_BANG = CO_BANG_ANH_EM;

const gon = (s) => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
export const chuanSo = (s) => gon(s).replace(/ ?([-–—/]) ?/g, '$1');
const sha256 = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');

export function boGachTen(ten) {
  return gon(ten).replace(/^(?:[-–—]\s*)+/, '').replace(/:\s*$/, '').trim();
}

/** Đọc siêu dữ liệu loaiKhac / loaiKhacCoVe / khongMa / suyRa / cungDong / phamViTru từ bieu.jsonl (do G.napLuat không giữ). */
export function napBieuMeta(thuMuc = G.LUAT_MAC_DINH) {
  const meta = new Map();
  const tep = path.join(thuMuc, 'bieu.jsonl');
  for (const n of G.docJsonl(tep)) {
    meta.set(n.id, {
      id: n.id,
      cha: n.cha ?? null,
      cap: n.cap ?? null,
      nguyenVan: n.nguyenVan ?? '',
      loaiKhac: Boolean(n.loaiKhac),
      loaiKhacCoVe: Boolean(n.loaiKhacCoVe),
      khongMa: Boolean(n.khongMa),
      suyRa: Boolean(n.suyRa),
      cungDong: n.cungDong ?? null,
      phamViTru: Array.isArray(n.phamViTru) ? [...n.phamViTru] : [],
    });
  }
  return meta;
}

/** Nút là "Loại khác" thuần (không có vế riêng). */
export function laLoaiKhacThuan(nutId, L, bieuMeta = null) {
  const m = bieuMeta?.get(nutId);
  if (m) {
    if (m.loaiKhacCoVe) return false;
    if (m.loaiKhac) return true;
    return false;
  }
  const ten = L?.cay?.theoId?.get(nutId)?.ten || '';
  return /^(?:loại\s+khác|khác)$/iu.test(boGachTen(ten));
}

/** Nút dạng "Loại khác, <điều kiện thêm>" (loaiKhacCoVe: true). */
export function laLoaiKhacCoVe(nutId, L, bieuMeta = null) {
  const m = bieuMeta?.get(nutId);
  if (m) return Boolean(m.loaiKhacCoVe);
  const ten = L?.cay?.theoId?.get(nutId)?.ten || '';
  return /^(?:loại\s+khác|khác)\s*,/iu.test(boGachTen(ten));
}

/** Đếm số đoạn tách bởi ";" ở cấp ngoài ngoặc đơn (...) trong tên nút. */
export function demDoanChamPhay(ten) {
  const s = boGachTen(ten);
  if (!s) return 0;
  let depth = 0;
  let doan = 1;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === '(') depth += 1;
    else if (ch === ')' && depth > 0) depth -= 1;
    else if (ch === ';' && depth === 0) {
      if (s.slice(i + 1).trim()) doan += 1;
    }
  }
  return doan;
}

export const chongKhoang = (a, b) => {
  const truoc = (x, y) => x.den !== null && y.tu !== null && (x.den < y.tu || (x.den === y.tu && !(x.gomDen && y.gomTu)));
  return !truoc(a, b) && !truoc(b, a);
};

export const khoaNguong = (n) => `${chuanSo(n.daiLuong).toLowerCase()}|${chuanSo(n.donVi ?? '').toLowerCase()}`;

const chuanCauHoi = (s) => chuanSo(s).toLowerCase().replace(/[?？.]+$/, '').trim();
const chuanTruc = (d) => (d?.truc ? chuanSo(d.truc).toLowerCase() : '');
const chuanTap = (tap) => new Set((tap || []).map((v) => chuanSo(v).toLowerCase()).filter(Boolean));
const tapBangNhau = (sa, sb) => sa.size === sb.size && [...sa].every((v) => sb.has(v));
const tapTapCon = (con, cha) => con.size > 0 && [...con].every((v) => cha.has(v));
const khoaTrucGiaTri = (d) => (
  chuanTruc(d)
    ? `truc:${chuanTruc(d)}`
    : (chuanCauHoi(d?.cauHoi) ? `cau:${chuanCauHoi(d.cauHoi)}` : `nguon:${d?.nguon || ''}`)
);

function khoangChua(ngoai, trong) {
  if (!ngoai || !trong) return false;
  const duTu = ngoai.tu === null
    || (trong.tu !== null && (trong.tu > ngoai.tu || (trong.tu === ngoai.tu && (!trong.gomTu || ngoai.gomTu))));
  const duDen = ngoai.den === null
    || (trong.den !== null && (trong.den < ngoai.den || (trong.den === ngoai.den && (!trong.gomDen || ngoai.gomDen))));
  return duTu && duDen;
}

/** Hai điều kiện là phủ định bù nhau trên cùng trục/câu. */
export function laPhuCuaNhau(a, b, nguongById = new Map()) {
  if (!a || !b || a.phu === b.phu) return false;
  if (a.kieu === 'SO' && b.kieu === 'SO') {
    if (a.nguong && a.nguong === b.nguong) return true;
    const na = nguongById.get(a.nguong)?.nguong;
    const nb = nguongById.get(b.nguong)?.nguong;
    if (na && nb && khoaNguong(na) === khoaNguong(nb)
      && na.tu === nb.tu && na.den === nb.den && na.gomTu === nb.gomTu && na.gomDen === nb.gomDen) {
      return true;
    }
  }
  if (a.kieu === 'GIA_TRI' && b.kieu === 'GIA_TRI') {
    const ta = chuanTruc(a);
    const tb = chuanTruc(b);
    const cungTruc = (ta && tb)
      ? ta === tb
      : (Boolean(chuanCauHoi(a.cauHoi)) && chuanCauHoi(a.cauHoi) === chuanCauHoi(b.cauHoi));
    if (cungTruc && tapBangNhau(chuanTap(a.tap), chuanTap(b.tap))) return true;
  }
  if (a.nguon && a.nguon === b.nguon) {
    const ta = chuanSo(a.trich).toLowerCase();
    const tb = chuanSo(b.trich).toLowerCase();
    if (ta && tb && (ta === tb || ta.includes(tb) || tb.includes(ta))) return true;
  }
  if (a.kieu === b.kieu && chuanCauHoi(a.cauHoi) && chuanCauHoi(a.cauHoi) === chuanCauHoi(b.cauHoi)) {
    if (a.kieu === 'GIA_TRI') return tapBangNhau(chuanTap(a.tap), chuanTap(b.tap));
    if (a.kieu === 'SO') return a.nguong === b.nguong;
    return true;
  }
  return false;
}

/** Hai nhánh VÀ (một vế) rời nhau chứng minh được bằng máy. */
export function veRoiNhau(veA, veB, nguongById = new Map()) {
  for (const a of veA) {
    for (const b of veB) {
      if (laPhuCuaNhau(a, b, nguongById)) return true;
      if (a.kieu === 'SO' && b.kieu === 'SO') {
        const na = nguongById.get(a.nguong)?.nguong;
        const nb = nguongById.get(b.nguong)?.nguong;
        if (na && nb && khoaNguong(na) === khoaNguong(nb)) {
          if (!a.phu && !b.phu && !chongKhoang(na, nb)) return true;
          if (!a.phu && b.phu && khoangChua(nb, na)) return true;
          if (a.phu && !b.phu && khoangChua(na, nb)) return true;
        }
      }
      if (a.kieu === 'GIA_TRI' && b.kieu === 'GIA_TRI') {
        const ta = chuanTruc(a);
        const tb = chuanTruc(b);
        const cungTruc = (ta && tb)
          ? ta === tb
          : ((a.nguon && a.nguon === b.nguon) || (chuanCauHoi(a.cauHoi) && chuanCauHoi(a.cauHoi) === chuanCauHoi(b.cauHoi)));
        if (cungTruc) {
          const sa = chuanTap(a.tap);
          const sb = chuanTap(b.tap);
          if (!a.phu && !b.phu && sa.size && sb.size && ![...sa].some((v) => sb.has(v))) return true;
          if (!a.phu && b.phu && tapTapCon(sa, sb)) return true;
          if (a.phu && !b.phu && tapTapCon(sb, sa)) return true;
        }
      }
    }
  }
  return false;
}

/** Gom danh sách DIEU_KIEN của một nút theo `ve` -> { loai: 'HOAC_CUA_VA', cacVe: [...] }.
 *  Quy ước ve: 0 = điều kiện chung áp cho mọi vế: nhân (AND) vào từng vế >= 1, hoặc gom thành 1 vế nếu chỉ có ve: 0. */
export function chiaVeDieuKien(dks, truAnhEm = null) {
  const toItem = (d) => {
    const item = { id: d.id, phu: d.phu, kieu: d.kieu };
    if (d.truc !== undefined) item.truc = d.truc;
    if (d.nguong !== undefined) item.nguong = d.nguong;
    if (d.tap !== undefined) item.tap = [...d.tap];
    return item;
  };
  const xep = [...(dks || [])]
    .filter((d) => d && (!d.loai || d.loai === 'DIEU_KIEN'))
    .sort((a, b) => (a.ve - b.ve) || String(a.id).localeCompare(String(b.id)));
  const dks0 = xep.filter((d) => d.ve === 0).map(toItem);
  const theoVe = new Map();
  for (const d of xep) {
    if (d.ve === 0) continue;
    if (!theoVe.has(d.ve)) theoVe.set(d.ve, []);
    theoVe.get(d.ve).push(toItem(d));
  }
  let cacVe;
  if (theoVe.size > 0) {
    cacVe = [...theoVe.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([ve, cacDieuKien]) => ({ ve, cacDieuKien: dks0.length ? [...cacDieuKien, ...dks0] : cacDieuKien }));
  } else if (dks0.length > 0) {
    cacVe = [{ ve: 1, cacDieuKien: dks0 }];
  } else {
    cacVe = [];
  }
  const ct = { loai: 'HOAC_CUA_VA', cacVe };
  if (Array.isArray(truAnhEm) && truAnhEm.length) ct.truAnhEm = [...truAnhEm];
  return ct;
}

/** Hai nút có tên rời nhau chứng minh được bằng máy (mọi cặp vế đều rời nhau). */
export function haiNutRoiNhau(dksA, dksB, nguongById = new Map()) {
  const dkById = new Map([...(dksA || []), ...(dksB || [])].map((d) => [d.id, d]));
  const va = chiaVeDieuKien(dksA).cacVe.map((v) => v.cacDieuKien.map((x) => dkById.get(x.id) || x));
  const vb = chiaVeDieuKien(dksB).cacVe.map((v) => v.cacDieuKien.map((x) => dkById.get(x.id) || x));
  if (!va.length || !vb.length) return false;
  for (const a of va) {
    for (const b of vb) {
      if (!veRoiNhau(a, b, nguongById)) return false;
    }
  }
  return true;
}

function chungMinhHangDungLogic(con, dkTheoNut, nguongById) {
  const allDks = con.flatMap((id) => dkTheoNut.get(id) || []);
  if (!allDks.length) return false;

  // Nhóm các điều kiện thành biến boolean chuẩn hoá
  const varOfId = new Map();
  const varKeyIndex = new Map();
  const vars = []; // đại diện đầu tiên của mỗi biến

  const getVarIndex = (d) => {
    if (varOfId.has(d.id)) return varOfId.get(d.id);
    let key = null;
    if (d.kieu === 'SO') {
      const ng = nguongById.get(d.nguong)?.nguong;
      key = ng
        ? `SO:${khoaNguong(ng)}|${ng.tu}|${ng.den}|${ng.gomTu}|${ng.gomDen}`
        : `SO_ID:${d.nguong}`;
    } else if (d.kieu === 'GIA_TRI') {
      const tk = chuanTruc(d) || chuanCauHoi(d.cauHoi) || d.nguon;
      const tapK = [...chuanTap(d.tap)].sort().join('\u0001');
      key = `GT:${tk}|${tapK}`;
    } else {
      const q = chuanCauHoi(d.cauHoi);
      if (q) key = `CK_Q:${q}`;
    }
    if (key && varKeyIndex.has(key)) {
      const idx = varKeyIndex.get(key);
      varOfId.set(d.id, idx);
      return idx;
    }
    // Khớp thêm theo laPhuCuaNhau (ví dụ CO_KHONG cùng nguồn có trích lồng nhau nhưng câu hỏi viết khác)
    for (let i = 0; i < vars.length; i += 1) {
      if (laPhuCuaNhau(d, vars[i], nguongById)) {
        varOfId.set(d.id, i);
        return i;
      }
    }
    const idx = vars.length;
    vars.push(d);
    if (key) varKeyIndex.set(key, idx);
    varOfId.set(d.id, idx);
    return idx;
  };

  for (const d of allDks) getVarIndex(d);
  const V = vars.length;
  if (V === 0 || V > 12) return false;

  const cacNhanh = [];
  for (const id of con) {
    const dks = dkTheoNut.get(id) || [];
    const dkById = new Map(dks.map((d) => [d.id, d]));
    for (const v of chiaVeDieuKien(dks).cacVe) {
      if (!v.cacDieuKien.length) continue;
      cacNhanh.push(v.cacDieuKien.map((item) => {
        const full = dkById.get(item.id) || item;
        return { idx: varOfId.get(full.id), phu: Boolean(full.phu) };
      }));
    }
  }
  if (!cacNhanh.length) return false;

  const total = 1 << V;
  for (let mask = 0; mask < total; mask += 1) {
    let rowOk = false;
    for (const nhanh of cacNhanh) {
      let branchOk = true;
      for (const lit of nhanh) {
        const bit = ((mask >> lit.idx) & 1) === 1;
        if (lit.phu ? bit : !bit) {
          branchOk = false;
          break;
        }
      }
      if (branchOk) {
        rowOk = true;
        break;
      }
    }
    if (!rowOk) return false;
  }
  return true;
}

function rangBuocChaTheoKhoa(ancDks, nguongById) {
  const theoNut = new Map();
  for (const d of ancDks || []) {
    const k = d.nut || '__cha__';
    if (!theoNut.has(k)) theoNut.set(k, []);
    theoNut.get(k).push(d);
  }
  const mucTieu = new Map();
  for (const dks of theoNut.values()) {
    const veList = chiaVeDieuKien(dks).cacVe;
    if (!veList.length) continue;
    // Khoảng ràng buộc chỉ áp toàn nút nếu mọi vế của nút cha đều chứa ngưỡng SO đó
    const dkById = new Map(dks.map((d) => [d.id, d]));
    const giaoTheoVe = veList.map((v) => {
      const m = new Map();
      for (const item of v.cacDieuKien) {
        const dk = dkById.get(item.id) || item;
        if (dk.kieu !== 'SO' || dk.phu) continue;
        const ng = nguongById.get(dk.nguong)?.nguong;
        if (!ng) continue;
        const kk = khoaNguong(ng);
        m.set(kk, ng);
      }
      return m;
    });
    for (const [kk, ng0] of giaoTheoVe[0]) {
      if (!giaoTheoVe.every((m) => m.has(kk))) continue;
      for (const m of giaoTheoVe) {
        const ng = m.get(kk);
        const cur = mucTieu.get(kk) || { tu: null, den: null, gomTu: false, gomDen: false };
        let tu = cur.tu;
        let gomTu = cur.gomTu;
        if (ng.tu !== null && (tu === null || ng.tu > tu || (ng.tu === tu && !ng.gomTu))) {
          tu = ng.tu;
          gomTu = ng.gomTu;
        }
        let den = cur.den;
        let gomDen = cur.gomDen;
        if (ng.den !== null && (den === null || ng.den < den || (ng.den === den && !ng.gomDen))) {
          den = ng.den;
          gomDen = ng.gomDen;
        }
        mucTieu.set(kk, { tu, den, gomTu, gomDen });
      }
      void ng0;
    }
  }
  return mucTieu;
}

/** Kiểm chứng minh phủ kín phạm vi cha khi nhóm KHÔNG có nút "Loại khác". */
export function chungMinhPhuKin(con, dkTheoNut, nguongById = new Map(), chaDks = [], chuoiChaDks = []) {
  // 1. Chứng minh hằng đúng logic (tautology) trên công thức các anh em (hỗ trợ cả đơn và đa điều kiện: 02.01, 850110)
  if (chungMinhHangDungLogic(con, dkTheoNut, nguongById)) return true;
  // Dự phòng cho trường hợp số biến lớn (>12): kiểm cặp đơn bù nhau bởi `phu`
  const don = new Map();
  for (const id of con) {
    const dks = dkTheoNut.get(id) || [];
    if (dks.length === 1) don.set(id, dks[0]);
  }
  const donIds = [...don.keys()];
  for (let i = 0; i < donIds.length; i += 1) {
    for (let j = i + 1; j < donIds.length; j += 1) {
      if (laPhuCuaNhau(don.get(donIds[i]), don.get(donIds[j]), nguongById)) return true;
    }
  }

  // 2. Mọi anh em đều có ngưỡng đơn kieu SO trên cùng (daiLuong, donVi) phủ kín phạm vi cha (hoặc (-∞, +∞))
  const mucTieuCha = rangBuocChaTheoKhoa([...(chuoiChaDks || []), ...(chaDks || [])], nguongById);
  const theoTruc = new Map();
  for (const id of con) {
    const dks = dkTheoNut.get(id) || [];
    const ve1 = chiaVeDieuKien(dks).cacVe;
    if (ve1.length !== 1 || ve1[0].cacDieuKien.length !== 1) continue;
    const dk = ve1[0].cacDieuKien[0];
    if (dk.kieu !== 'SO' || dk.phu) continue;
    const ng = nguongById.get(dk.nguong)?.nguong;
    if (!ng) continue;
    const kk = khoaNguong(ng);
    if (!theoTruc.has(kk)) theoTruc.set(kk, new Map());
    theoTruc.get(kk).set(id, ng);
  }
  for (const [kk, m] of theoTruc) {
    if (m.size !== con.length) continue;
    const target = mucTieuCha.get(kk) || { tu: null, den: null, gomTu: false, gomDen: false };
    const ds = [...m.values()].sort((a, b) => (a.tu ?? -Infinity) - (b.tu ?? -Infinity));
    const batDauDu = target.tu === null
      ? ds[0].tu === null
      : (ds[0].tu === null || ds[0].tu < target.tu || (ds[0].tu === target.tu && (ds[0].gomTu || !target.gomTu)));
    if (!batDauDu) continue;
    let kin = true;
    let denHienTai = ds[0].den;
    let gomDenHienTai = ds[0].gomDen;
    for (let i = 1; i < ds.length; i += 1) {
      if (denHienTai === null) break;
      const b = ds[i];
      if (b.tu !== null && (denHienTai < b.tu || (denHienTai === b.tu && !gomDenHienTai && !b.gomTu))) {
        kin = false;
        break;
      }
      if (b.den === null) {
        denHienTai = null;
        gomDenHienTai = false;
      } else if (b.den > denHienTai || (b.den === denHienTai && b.gomDen)) {
        denHienTai = b.den;
        gomDenHienTai = b.gomDen;
      }
    }
    const ketThucDu = target.den === null
      ? denHienTai === null
      : (denHienTai === null || denHienTai > target.den || (denHienTai === target.den && (gomDenHienTai || !target.gomDen)));
    if (kin && ketThucDu) return true;
  }

  // 3. Tập GIA_TRI của các con phủ hết tập GIA_TRI do nút cha khai báo trên cùng `truc`
  const chaGiaTri = (chaDks || []).filter((d) => d.kieu === 'GIA_TRI' && !d.phu && Array.isArray(d.tap) && d.tap.length);
  if (chaGiaTri.length) {
    const tapChaTheoTruc = new Map();
    for (const d of chaGiaTri) {
      const k = khoaTrucGiaTri(d);
      if (!tapChaTheoTruc.has(k)) tapChaTheoTruc.set(k, new Set());
      for (const v of d.tap) tapChaTheoTruc.get(k).add(chuanSo(v).toLowerCase());
    }
    for (const [k, tapCha] of tapChaTheoTruc) {
      const tapCon = new Set();
      let soConKhop = 0;
      for (const id of con) {
        const dks = dkTheoNut.get(id) || [];
        const dkById = new Map(dks.map((d) => [d.id, d]));
        const veDon = chiaVeDieuKien(dks).cacVe
          .filter((v) => v.cacDieuKien.length === 1)
          .map((v) => dkById.get(v.cacDieuKien[0].id))
          .filter((d) => d && d.kieu === 'GIA_TRI' && !d.phu && khoaTrucGiaTri(d) === k);
        const khop = veDon.filter((d) => (d.tap || []).some((v) => tapCha.has(chuanSo(v).toLowerCase())));
        if (khop.length) {
          soConKhop += 1;
          for (const d of khop) for (const v of d.tap || []) tapCon.add(chuanSo(v).toLowerCase());
        }
      }
      if (soConKhop === con.length && [...tapCha].every((v) => tapCon.has(v))) return true;
    }
  }

  return false;
}

const tomTatCauHoi = (dk) => ({
  id: dk.id,
  nut: dk.nut,
  cauHoi: dk.cauHoi,
  mo: dk.mo,
  kieu: dk.kieu,
  nguon: dk.nguon,
});

function gopCauHoi(...lists) {
  const da = new Set();
  const ra = [];
  for (const list of lists) {
    for (const dk of list || []) {
      if (!dk || !dk.id || da.has(dk.id)) continue;
      da.add(dk.id);
      ra.push(tomTatCauHoi(dk));
    }
  }
  return ra;
}

/** Dựng một bảng bang-anh-em@1 cho nút cha `chaId`. */
export function taoBangChoCha(chaId, L, duLieu) {
  const {
    bieuMeta = new Map(),
    dkTheoNut = new Map(),
    giaiChongTheoCha = new Map(),
    nguongById = new Map(),
    viDu = [],
    vungChong = [],
  } = duLieu;

  const con = G.conCua(chaId, L.cay);
  const conSet = new Set(con);
  const chuong = G.chuongCuaNut(chaId) || (/^phan:/.test(chaId) ? chaId.slice(5) : 'gir');

  // Chuỗi cha từ Phần -> Chương -> ... -> chaId
  const duong = G.duongDiNut(chaId, L.cay) || [{ cap: G.capCuaNut(chaId), nut: chaId }];
  const chuoiCha = [];
  const dksChuoiCha = [];
  const dksDuongCha = [];
  for (const buoc of duong) {
    const dks = dkTheoNut.get(buoc.nut) || [];
    const laLK = laLoaiKhacThuan(buoc.nut, L, bieuMeta);
    const meta = bieuMeta.get(buoc.nut);
    let truAnhEm = [];
    const truCongThuc = {};
    if (laLK || (laLoaiKhacCoVe(buoc.nut, L, bieuMeta) && meta?.phamViTru?.length)) {
      const aeCha = meta?.phamViTru?.length
        ? meta.phamViTru
        : G.anhEmCua(buoc.nut, L.cay).filter((x) => !laLoaiKhacThuan(x, L, bieuMeta));
      truAnhEm = aeCha;
      for (const aeId of aeCha) {
        const aeDks = dkTheoNut.get(aeId) || [];
        dksChuoiCha.push(...aeDks);
        truCongThuc[aeId] = chiaVeDieuKien(aeDks);
      }
    }
    dksChuoiCha.push(...dks);
    dksDuongCha.push(...dks);
    chuoiCha.push({
      nut: buoc.nut,
      laLoaiKhac: laLK,
      congThuc: laLK
        ? { loai: 'KHONG_HOP_VA_CHA', phuCua: truAnhEm, chuoiCha: [] }
        : chiaVeDieuKien(dks, truAnhEm.length ? truAnhEm : null),
      dieuKienIds: dks.map((x) => x.id),
      ...(truAnhEm.length ? { truCongThuc } : {}),
    });
  }
  const chuoiChaDkIds = [...new Set(dksChuoiCha.map((x) => x.id))];

  const coTen = con.filter((id) => !laLoaiKhacThuan(id, L, bieuMeta));
  const dkCoTen = coTen.flatMap((id) => dkTheoNut.get(id) || []);

  const anhEm = con.map((childId) => {
    const ten = L.cay.theoId.get(childId)?.ten || bieuMeta.get(childId)?.nguyenVan || '';
    const laLK = laLoaiKhacThuan(childId, L, bieuMeta);
    const laLKCV = laLoaiKhacCoVe(childId, L, bieuMeta);
    const meta = bieuMeta.get(childId);
    const dks = dkTheoNut.get(childId) || [];

    if (laLK) {
      const truHopLe = (meta?.phamViTru || []).filter((id) => conSet.has(id));
      const phuCua = truHopLe.length ? truHopLe : coTen;
      const dksPhu = phuCua.flatMap((id) => dkTheoNut.get(id) || []);
      return {
        nut: childId,
        ten,
        laLoaiKhac: true,
        congThuc: {
          loai: 'KHONG_HOP_VA_CHA',
          phuCua,
          chuoiCha: chuoiChaDkIds,
        },
        dieuKienIds: dks.map((x) => x.id),
        cauHoiToiThieu: gopCauHoi(dks, dksPhu, dksChuoiCha),
      };
    }

    const truAnhEm = laLKCV ? (meta?.phamViTru || []).filter((id) => conSet.has(id)) : [];
    const dksTru = truAnhEm.flatMap((id) => dkTheoNut.get(id) || []);
    return {
      nut: childId,
      ten,
      laLoaiKhac: false,
      congThuc: chiaVeDieuKien(dks, truAnhEm.length ? truAnhEm : null),
      dieuKienIds: dks.map((x) => x.id),
      cauHoiToiThieu: gopCauHoi(dks, dksTru, dksChuoiCha),
    };
  });

  // Giải chồng và cờ bảng
  const giaiChong = (giaiChongTheoCha.get(chaId) || []).map((g) => ({
    ...(g.id ? { id: g.id } : {}),
    cap: [...g.cap],
    cach: g.cach,
    nguon: g.nguon,
    trich: g.trich,
  }));
  const giaiChongSet = new Set(giaiChong.map((g) => [...g.cap].sort().join('|')));
  const vungChongSet = new Set(
    (vungChong || [])
      .filter((v) => !v.nut || v.nut === chaId)
      .map((v) => [...(v.cap || [])].sort().join('|'))
      .filter(Boolean),
  );

  const co = new Set();
  const coLoaiKhac = anhEm.some((x) => x.laLoaiKhac);
  if (!coLoaiKhac && !chungMinhPhuKin(con, dkTheoNut, nguongById, dkTheoNut.get(chaId) || [], dksDuongCha)) co.add('HO_PHU');

  for (let i = 0; i < coTen.length; i += 1) {
    for (let j = i + 1; j < coTen.length; j += 1) {
      const capKey = [coTen[i], coTen[j]].sort().join('|');
      if (giaiChongSet.has(capKey)) continue;
      if (vungChongSet.has(capKey)) {
        co.add('VUNG_CHONG');
        continue;
      }
      if (!haiNutRoiNhau(dkTheoNut.get(coTen[i]) || [], dkTheoNut.get(coTen[j]) || [], nguongById)) {
        co.add('CHUA_CHUNG_MINH_TACH');
      }
    }
  }

  const tatCaDk = [...dksChuoiCha, ...dkCoTen];
  if (tatCaDk.some((d) => d.mo === 'NGHIA_THUONG')) co.add('NGHIA_THUONG');

  if (coLoaiKhac) {
    const lienQuan = new Set([chaId, ...con]);
    const coViDu = (viDu || []).some((vd) => {
      if (lienQuan.has(vd.dich)) return true;
      const duongDich = G.duongDiNut(vd.dich, L.cay) || [];
      return duongDich.some((b) => lienQuan.has(b.nut));
    });
    if (!coViDu) co.add('THIEU_VI_DU');
  }

  const coList = CO_BANG.filter((f) => co.has(f));
  const payload = {
    khuon: 'bang-anh-em@1',
    cha: chaId,
    chuong,
    chuoiCha,
    anhEm,
    giaiChong,
    co: coList,
  };
  return {
    ...payload,
    vanTay: sha256(JSON.stringify(payload)),
  };
}

function timCongThucAnhEm(nutId, bang, truCongThuc = null) {
  if (truCongThuc && Object.hasOwn(truCongThuc, nutId)) return truCongThuc[nutId];
  return bang?.anhEm?.find((x) => x.nut === nutId)?.congThuc || null;
}

function danhGiaBuocCha(cha, ganDieuKien, bang, _daTham) {
  if (!cha?.congThuc) return undefined;
  const ct = cha.congThuc;
  if (ct.loai === 'KHONG_HOP_VA_CHA') {
    let coChuaRo = false;
    for (const aeId of ct.phuCua || []) {
      const f = timCongThucAnhEm(aeId, bang, cha.truCongThuc);
      if (!f) { coChuaRo = true; continue; }
      const r = danhGiaCongThuc(f, ganDieuKien, bang, _daTham, cha.truCongThuc || null);
      if (r === true) return false;
      if (r === undefined) coChuaRo = true;
    }
    return coChuaRo ? undefined : true;
  }
  if (ct.loai === 'HOAC_CUA_VA') {
    if (!ct.cacVe?.length && !ct.truAnhEm?.length) return undefined;
    return danhGiaCongThuc(ct, ganDieuKien, bang, _daTham, cha.truCongThuc || null);
  }
  return undefined;
}

/** Đánh giá công thức một anh em với bản đồ gán { [dkId]: true | false } -> true | false | undefined. */
export function danhGiaCongThuc(congThuc, ganDieuKien = {}, bang = null, _daTham = new Set(), truCongThuc = null) {
  if (!congThuc || typeof congThuc !== 'object') return undefined;
  if (_daTham.has(congThuc)) return undefined;
  _daTham.add(congThuc);
  try {
    if (congThuc.loai === 'HOAC_CUA_VA') {
      let truChuaRo = false;
      if (Array.isArray(congThuc.truAnhEm) && congThuc.truAnhEm.length) {
        for (const tid of congThuc.truAnhEm) {
          const fTru = timCongThucAnhEm(tid, bang, truCongThuc);
          if (!fTru) {
            truChuaRo = true;
            continue;
          }
          const r = danhGiaCongThuc(fTru, ganDieuKien, bang, _daTham, truCongThuc);
          if (r === true) return false;
          if (r === undefined) truChuaRo = true;
        }
      }
      const cacVe = congThuc.cacVe || [];
      if (!cacVe.length) return undefined;
      let coChuaRo = false;
      let coTrue = false;
      for (const v of cacVe) {
        const kqVe = danhGiaMotVe(v.cacDieuKien || [], ganDieuKien);
        if (kqVe === true) { coTrue = true; break; }
        if (kqVe === undefined) coChuaRo = true;
      }
      if (coTrue) return truChuaRo ? undefined : true;
      return coChuaRo ? undefined : false;
    }
    if (congThuc.loai === 'KHONG_HOP_VA_CHA') {
      let coChuaRo = false;
      if (Array.isArray(bang?.chuoiCha) && bang.chuoiCha.length) {
        for (const cha of bang.chuoiCha) {
          if (!cha.congThuc) continue;
          if (cha.congThuc.loai === 'HOAC_CUA_VA' && !cha.congThuc.cacVe?.length && !cha.congThuc.truAnhEm?.length) continue;
          if (cha.congThuc.loai === 'KHONG_HOP_VA_CHA' && !(cha.congThuc.phuCua || []).length) continue;
          const rCha = danhGiaBuocCha(cha, ganDieuKien, bang, _daTham);
          if (rCha === false) return false;
          if (rCha === undefined) coChuaRo = true;
        }
      } else {
        for (const dkId of congThuc.chuoiCha || []) {
          if (ganDieuKien[dkId] === false) return false;
          if (ganDieuKien[dkId] === undefined) coChuaRo = true;
        }
      }
      const phuCua = congThuc.phuCua || [];
      for (const aeId of phuCua) {
        const f = timCongThucAnhEm(aeId, bang, truCongThuc);
        if (!f) { coChuaRo = true; continue; }
        const r = danhGiaCongThuc(f, ganDieuKien, bang, _daTham, truCongThuc);
        if (r === true) return false;
        if (r === undefined) coChuaRo = true;
      }
      return coChuaRo ? undefined : true;
    }
    return undefined;
  } finally {
    _daTham.delete(congThuc);
  }
}

function danhGiaMotVe(dks, ganDieuKien) {
  if (!dks.length) return undefined;
  let coChuaRo = false;
  for (const d of dks) {
    const val = ganDieuKien[d.id];
    if (val === undefined) {
      coChuaRo = true;
      continue;
    }
    const kq = d.phu ? !Boolean(val) : Boolean(val);
    if (!kq) return false;
  }
  return coChuaRo ? undefined : true;
}

/** Định tuyến một ca thử { ganDieuKien } từ bảng cha `chaId` đi xuống tối đa qua các bảng con. */
export function doBangAnhEm(chaId, ganDieuKien, bangTheoCha, { L = null } = {}) {
  let hienTai = chaId;
  const daDi = [];
  for (let buoc = 0; buoc < 12; buoc += 1) {
    const bang = bangTheoCha.get(hienTai);
    if (!bang) return { trangThai: 'DUNG_NUT', dich: hienTai, duong: daDi };
    for (const cha of bang.chuoiCha || []) {
      const rCha = danhGiaBuocCha(cha, ganDieuKien, bang, new Set());
      if (rCha === false) {
        return { trangThai: 'NGOAI_PHAM_VI', cha: hienTai, nutLoai: cha.nut, duong: daDi };
      }
    }
    const coTen = bang.anhEm.filter((x) => !x.laLoaiKhac);
    const loaiKhac = bang.anhEm.filter((x) => x.laLoaiKhac);

    const trung = [];
    const chuaRo = [];
    for (const ae of coTen) {
      const r = danhGiaCongThuc(ae.congThuc, ganDieuKien, bang);
      if (r === true) trung.push(ae);
      else if (r === undefined) chuaRo.push(ae);
    }

    if (trung.length > 1) {
      const giai = new Set((bang.giaiChong || []).map((g) => [...g.cap].sort().join('|')));
      let hetChong = true;
      for (let i = 0; i < trung.length; i += 1) {
        for (let j = i + 1; j < trung.length; j += 1) {
          if (!giai.has([trung[i].nut, trung[j].nut].sort().join('|'))) hetChong = false;
        }
      }
      if (!hetChong) {
        return { trangThai: 'CHONG_LAP', cha: hienTai, ungVien: trung.map((x) => x.nut), duong: daDi };
      }
    }

    if (trung.length >= 1) {
      const chon = trung[0].nut;
      daDi.push(chon);
      if (bangTheoCha.has(chon)) { hienTai = chon; continue; }
      return { trangThai: 'DICH', dich: chon, duong: daDi };
    }

    if (chuaRo.length > 0) {
      const cauHoi = loaiKhac.length
        ? loaiKhac[0].cauHoiToiThieu
        : gopCauHoi(...chuaRo.map((x) => x.cauHoiToiThieu));
      const thieuIds = cauHoi.filter((c) => ganDieuKien[c.id] === undefined).map((c) => c.id);
      return {
        trangThai: 'RE_NHANH',
        cha: hienTai,
        chuaRo: chuaRo.map((x) => x.nut),
        thieuIds,
        cauHoiToiThieu: cauHoi,
        duong: daDi,
      };
    }

    // Mọi anh em có tên đều false -> rơi vào "Loại khác" nếu có
    if (loaiKhac.length === 1) {
      const chon = loaiKhac[0].nut;
      daDi.push(chon);
      if (bangTheoCha.has(chon)) { hienTai = chon; continue; }
      return { trangThai: 'DICH', dich: chon, duong: daDi };
    }
    return { trangThai: 'HO_PHU', cha: hienTai, duong: daDi };
  }
  return { trangThai: 'DUNG_NUT', dich: hienTai, duong: daDi };
}

/** Chuẩn bị chỉ mục dữ liệu từ kho hồ sơ + luật để dựng bảng anh em. */
export function chuanBiDuLieuBang({ luat = G.LUAT_MAC_DINH, hoSo = G.HO_SO_MAC_DINH, L = null, viDu = [], vungChong = [] } = {}) {
  const bieuMeta = napBieuMeta(luat);
  const cay = L?.cay || G.napLuat(luat);
  const L_full = L ? { ...L, cay } : { thuMuc: luat, cay };
  const kho = kiemKhoHoSo(hoSo);
  const dkTheoNut = new Map();
  const giaiChongTheoCha = new Map();
  const canhTranhTheoNut = new Map();
  const nguongById = new Map();

  for (const x of kho.banGhi) {
    if (x._hong) continue;
    if (x.loai === 'NGUONG') nguongById.set(x.id, x);
    else if (x.loai === 'DIEU_KIEN') {
      if (!dkTheoNut.has(x.nut)) dkTheoNut.set(x.nut, []);
      dkTheoNut.get(x.nut).push(x);
    } else if (x.loai === 'GIAI_CHONG') {
      if (!giaiChongTheoCha.has(x.nut)) giaiChongTheoCha.set(x.nut, []);
      giaiChongTheoCha.get(x.nut).push(x);
    } else if (x.loai === 'CANH_TRANH') {
      if (!canhTranhTheoNut.has(x.nut)) canhTranhTheoNut.set(x.nut, []);
      canhTranhTheoNut.get(x.nut).push(x);
    }
  }
  return {
    L: L_full,
    kho,
    duLieu: { bieuMeta, dkTheoNut, giaiChongTheoCha, canhTranhTheoNut, nguongById, viDu, vungChong },
  };
}

/** Tìm mọi nút cha trong một chương có từ 2 con trở lên, xếp thứ tự tất định. */
export function cacNutChaCuaChuong(chuong, cay) {
  const ch = String(chuong).padStart(2, '0');
  const ds = [];
  const chuongId = `chuong:${ch}`;
  if (G.conCua(chuongId, cay).length >= 2) ds.push(chuongId);
  for (const pc of cay.pcCuaChuong.get(ch) || []) {
    if (G.conCua(pc.id, cay).length >= 2) ds.push(pc.id);
  }
  const bieuIds = [...cay.theoId.keys()]
    .filter((id) => id.startsWith(`bieu:${ch}`) && !/^bieu:\d{2}$/.test(id) && (cay.con.get(id) || []).length >= 2)
    .sort();
  ds.push(...bieuIds);
  return ds;
}

/** Sinh toàn bộ bảng anh em cho một chương (hoặc danh sách nút cha cụ thể). */
export function dungBangAnhEm({ chuong, chaIds = null, luat = G.LUAT_MAC_DINH, hoSo = G.HO_SO_MAC_DINH, L = null, viDu = [], vungChong = [] } = {}) {
  const prep = chuanBiDuLieuBang({ luat, hoSo, L, viDu, vungChong });
  const ch = String(chuong).padStart(2, '0');
  const dsCha = chaIds || cacNutChaCuaChuong(ch, prep.L.cay);
  const bang = dsCha.map((chaId) => taoBangChoCha(chaId, prep.L, prep.duLieu));
  for (const b of bang) {
    const err = kiemBangAnhEm(b);
    if (err.length) throw new Error(`Bảng anh em ${b.cha} sai khuôn: ${err.join('; ')}`);
  }
  return { chuong: ch, bang, kho: prep.kho, duLieu: prep.duLieu };
}

/** Sinh và (tuỳ chọn) ghi data/ho-so-ma/bang-anh-em/<chương>.jsonl. */
export function sinhBangAnhEm({ chuong, chaIds = null, luat = G.LUAT_MAC_DINH, hoSo = G.HO_SO_MAC_DINH, ra = null, ghi = false, viDu = [], vungChong = [] } = {}) {
  const res = dungBangAnhEm({ chuong, chaIds, luat, hoSo, viDu, vungChong });
  const outRoot = ra || hoSo;
  const outPath = path.join(outRoot, 'bang-anh-em', `${res.chuong}.jsonl`);
  if (ghi) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const text = res.bang.length ? `${res.bang.map((b) => JSON.stringify(b)).join('\n')}\n` : '';
    fs.writeFileSync(outPath, text, 'utf8');
  }
  return { ...res, tep: outPath };
}

function main() {
  const a = process.argv.slice(2);
  const lay = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const chuong = lay('--chuong');
  if (!chuong) {
    console.error('Thiếu --chuong <NN> (vd: --chuong 85)');
    process.exit(2);
  }
  const luat = path.resolve(lay('--luat') || G.LUAT_MAC_DINH);
  const hoSo = path.resolve(lay('--ho-so') || G.HO_SO_MAC_DINH);
  const ra = lay('--ra') ? path.resolve(lay('--ra')) : hoSo;
  const ghi = a.includes('--ghi');
  const r = sinhBangAnhEm({ chuong, luat, hoSo, ra, ghi });
  console.log(`PASS bang-anh-em chương ${r.chuong}: ${r.bang.length} bảng${ghi ? ` -> ${r.tep}` : ' (dry-run)'}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
