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

/** Nút không phải "Loại khác" thuần / loaiKhacCoVe nhưng mệnh đề chính của tên biểu thuế là nhánh phần bù "… khác"
 *  (ví dụ "- Máy và thiết bị khác:", "- Dụng cụ, thiết bị và máy khác:", "- Từ các vật liệu dệt khác", "- Các bộ phận khác (SEN)").
 *  Loại trừ các cụm liệt kê nội bộ ("và các … khác", "hoặc … khác", "kể cả … khác", "chưa được chi tiết hoặc ghi ở nơi khác", "kết hợp với … khác", "ở dạng khác"). */
export function laPhanBuCoTen(nutId, L, bieuMeta = null) {
  if (!nutId || /^bieu:\d{2,4}$/.test(nutId) || /^(?:phan|chuong|gir):/.test(nutId)) return false;
  if (laLoaiKhacThuan(nutId, L, bieuMeta) || laLoaiKhacCoVe(nutId, L, bieuMeta)) return false;
  const ten = L?.cay?.theoId?.get(nutId)?.ten || bieuMeta?.get(nutId)?.nguyenVan || '';
  const s = boGachTen(ten);
  if (!s || !/\bkhác\b/iu.test(s)) return false;
  const menhDeDau = s.split(';')[0].replace(/\s*\([^)]*\)/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!/\bkhác\b/iu.test(menhDeDau)) return false;
  if (/chưa\s+(?:được\s+)?(?:chi\s+tiết|ghi)/iu.test(menhDeDau)) return false;
  const truocPhuNgu = menhDeDau
    .split(/,\s*(?:kể\s+cả|trừ|có\s+hoặc\s+không|đã\s+hoặc\s+chưa|ở\s+dạng|một\s+pha|đa\s+pha|đã\s+lắp|chưa\s+lắp)/iu)[0]
    .replace(/^của\s+/iu, '')
    .split(/\s+(?:để|dùng\s+cho|dùng\s+để|cho|của|kết\s+hợp\s+với|thuộc|truyền\s+hoặc|thu\s*,)\s+/iu)[0]
    .trim();
  if (!/\bkhác$/iu.test(truocPhuNgu)) return false;
  if (/\b(?:hoặc|kể\s+cả|kèm\s+theo)\s+[^;]*\bkhác$/iu.test(truocPhuNgu)) return false;
  if (/\bvà\s+các\s+[^;]*\bkhác$/iu.test(truocPhuNgu)) return false;
  return true;
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

const QUY_DOI_DON_VI = new Map([
  ['w', ['w', 1]],
  ['kw', ['w', 1e3]],
  ['mw', ['w', 1e6]],
  ['va', ['va', 1]],
  ['kva', ['va', 1e3]],
  ['mva', ['va', 1e6]],
  ['v', ['v', 1]],
  ['kv', ['v', 1e3]],
  ['m', ['m', 1]],
  ['cm', ['m', 1e-2]],
  ['mm', ['m', 1e-3]],
  ['km', ['m', 1e3]],
  ['kg', ['kg', 1]],
  ['g', ['kg', 1e-3]],
  ['tấn', ['kg', 1e3]],
]);

export function chuanNguongSo(n) {
  if (!n) return null;
  const dl = chuanSo(n.daiLuong).toLowerCase();
  const dvRaw = chuanSo(n.donVi ?? '').toLowerCase();
  const qd = QUY_DOI_DON_VI.get(dvRaw);
  const dv = qd ? qd[0] : dvRaw;
  const heSo = qd ? qd[1] : 1;
  return {
    khoa: `${dl}|${dv}`,
    tu: n.tu === null || n.tu === undefined ? null : n.tu * heSo,
    den: n.den === null || n.den === undefined ? null : n.den * heSo,
    gomTu: Boolean(n.gomTu),
    gomDen: Boolean(n.gomDen),
  };
}

const chuanCauHoi = (s) => chuanSo(s).toLowerCase().replace(/[?？.]+$/, '').trim();
const chuanTruc = (d) => (d?.truc ? chuanSo(d.truc).toLowerCase() : '');
const chuanTap = (tap) => new Set((tap || []).map((v) => chuanSo(v).toLowerCase()).filter(Boolean));
const tapBangNhau = (sa, sb) => sa.size === sb.size && [...sa].every((v) => sb.has(v));
const tapTapCon = (con, cha) => con.size > 0 && [...con].every((v) => cha.has(v));
const khoaTrucGiaTri = (d) => (chuanTruc(d) ? `truc:${chuanTruc(d)}` : '');

function khoangChua(ngoai, trong) {
  if (!ngoai || !trong) return false;
  const duTu = ngoai.tu === null
    || (trong.tu !== null && (trong.tu > ngoai.tu || (trong.tu === ngoai.tu && (!trong.gomTu || ngoai.gomTu))));
  const duDen = ngoai.den === null
    || (trong.den !== null && (trong.den < ngoai.den || (trong.den === ngoai.den && (!trong.gomDen || ngoai.gomDen))));
  return duTu && duDen;
}

/** Hai điều kiện là phủ định bù nhau theo cấu trúc (ADR-0009 mục 1: cấm so chuỗi con `trich`). */
export function laPhuCuaNhau(a, b, nguongById = new Map()) {
  if (!a || !b || Boolean(a.phu) === Boolean(b.phu) || a.kieu !== b.kieu) return false;
  if (a.kieu === 'SO') {
    if (a.nguong && a.nguong === b.nguong) return true;
    const na = chuanNguongSo(nguongById.get(a.nguong)?.nguong);
    const nb = chuanNguongSo(nguongById.get(b.nguong)?.nguong);
    return Boolean(
      na && nb
      && na.khoa === nb.khoa
      && na.tu === nb.tu && na.den === nb.den
      && na.gomTu === nb.gomTu && na.gomDen === nb.gomDen,
    );
  }
  if (a.kieu === 'GIA_TRI') {
    const ta = chuanTruc(a);
    const tb = chuanTruc(b);
    return Boolean(ta && ta === tb && tapBangNhau(chuanTap(a.tap), chuanTap(b.tap)));
  }
  if (a.kieu === 'CO_KHONG') {
    const qa = chuanCauHoi(a.cauHoi);
    const qb = chuanCauHoi(b.cauHoi);
    return Boolean(qa && qa === qb);
  }
  return false;
}

/** Hai nút mỗi bên đúng 1 điều kiện SO không phu, cùng đại lượng + đơn vị quy đổi, khoảng số giao nhau (ADR-0009 mục 3). */
export function laChongSoTrungTruc(dksA, dksB, nguongById = new Map()) {
  const a = (dksA || []).filter((d) => d && (!d.loai || d.loai === 'DIEU_KIEN'));
  const b = (dksB || []).filter((d) => d && (!d.loai || d.loai === 'DIEU_KIEN'));
  if (a.length !== 1 || b.length !== 1) return false;
  if (a[0].kieu !== 'SO' || b[0].kieu !== 'SO' || a[0].phu || b[0].phu) return false;
  const na = chuanNguongSo(nguongById.get(a[0].nguong)?.nguong);
  const nb = chuanNguongSo(nguongById.get(b[0].nguong)?.nguong);
  return Boolean(na && nb && na.khoa === nb.khoa && chongKhoang(na, nb));
}

/** Hai nhánh VÀ (một vế) rời nhau chứng minh được bằng máy. */
export function veRoiNhau(veA, veB, nguongById = new Map()) {
  for (const a of veA) {
    for (const b of veB) {
      if (laPhuCuaNhau(a, b, nguongById)) return true;
      if (a.kieu === 'SO' && b.kieu === 'SO') {
        const na = chuanNguongSo(nguongById.get(a.nguong)?.nguong);
        const nb = chuanNguongSo(nguongById.get(b.nguong)?.nguong);
        if (na && nb && na.khoa === nb.khoa) {
          if (!a.phu && !b.phu && !chongKhoang(na, nb)) return true;
          if (!a.phu && b.phu && khoangChua(nb, na)) return true;
          if (a.phu && !b.phu && khoangChua(na, nb)) return true;
        }
      }
      if (a.kieu === 'GIA_TRI' && b.kieu === 'GIA_TRI') {
        const ta = chuanTruc(a);
        const tb = chuanTruc(b);
        if (ta && ta === tb) {
          const sa = chuanTap(a.tap);
          const sb = chuanTap(b.tap);
          if (!a.phu && !b.phu && !a.daTri && !b.daTri && sa.size && sb.size && ![...sa].some((v) => sb.has(v))) return true;
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
    if (d.daTri !== undefined) item.daTri = d.daTri;
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
      const tk = chuanTruc(d);
      const tapK = [...chuanTap(d.tap)].sort().join('\u0001');
      if (tk && tapK) key = `GT:${tk}|${tapK}`;
    } else {
      const q = chuanCauHoi(d.cauHoi);
      if (q) key = `CK_Q:${q}`;
    }
    if (key && varKeyIndex.has(key)) {
      const idx = varKeyIndex.get(key);
      varOfId.set(d.id, idx);
      return idx;
    }
    // Khớp dự phòng theo laPhuCuaNhau theo cấu trúc (ADR-0009 mục 1)
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

/** Tính danh sách anh em bị trừ (`truAnhEm`) của một nút con `childId` trong `con` của `chaId`:
 *  1) `laLoaiKhacCoVe`: lấy từ `meta.phamViTru` (lọc những anh em chưa rời nhau sẵn theo `haiNutRoiNhau`);
 *  2) `GIAI_CHONG` `{ cap: [A, B], cach: 'TRU', nguon }` của `chaId` mà câu `nguon` thuộc về `childId` (chưa rời nhau sẵn);
 *  3) `laPhanBuCoTen`: khi `childId` chưa có `GIAI_CHONG TRU` riêng, gom các anh em đứng trước `con.slice(0, idx)` (trừ `laLoaiKhacThuan`, trừ cặp đã có `GIAI_CHONG` khác `TRU`, và trừ cặp đã rời nhau sẵn theo `haiNutRoiNhau`). */
export function tinhTruAnhEm(childId, chaId, con, L, bieuMeta, dkTheoNut, giaiChongCuaCha = [], nguongById = new Map()) {
  if (!childId || !Array.isArray(con) || con.length < 2) return [];
  if (laLoaiKhacThuan(childId, L, bieuMeta)) return [];
  const conSet = new Set(con);
  const dksChild = dkTheoNut.get(childId) || [];
  const capCoGcKhacTru = new Set();
  const truTuGc = [];
  for (const g of giaiChongCuaCha || []) {
    if (!Array.isArray(g?.cap) || g.cap.length !== 2) continue;
    const [a, b] = g.cap;
    if (a !== childId && b !== childId) continue;
    const other = a === childId ? b : a;
    if (!conSet.has(other)) continue;
    if (g.cach === 'TRU') {
      const chuNguon = G.chuCuaCau(g.nguon || '');
      if (chuNguon === childId) truTuGc.push(other);
    } else {
      capCoGcKhacTru.add(other);
    }
  }
  const ketQua = [];
  const them = (id) => {
    if (!id || id === childId || !conSet.has(id) || ketQua.includes(id)) return;
    if (laLoaiKhacThuan(id, L, bieuMeta)) return;
    if (capCoGcKhacTru.has(id)) return;
    if (haiNutRoiNhau(dkTheoNut.get(id) || [], dksChild, nguongById)) return;
    ketQua.push(id);
  };
  if (laLoaiKhacCoVe(childId, L, bieuMeta)) {
    const meta = bieuMeta?.get(childId);
    for (const id of meta?.phamViTru || []) them(id);
  }
  for (const id of truTuGc) them(id);
  if (!truTuGc.length && laPhanBuCoTen(childId, L, bieuMeta)) {
    const idx = con.indexOf(childId);
    for (let i = 0; i < idx; i += 1) them(con[i]);
  }
  return ketQua;
}

export function taoBanDoTruAnhEm(chaId, con, L, bieuMeta, dkTheoNut, giaiChongCuaCha = [], nguongById = new Map()) {
  const m = new Map();
  for (const childId of con || []) {
    const tru = tinhTruAnhEm(childId, chaId, con, L, bieuMeta, dkTheoNut, giaiChongCuaCha, nguongById);
    if (tru.length) m.set(childId, tru);
  }
  return m;
}

function rangBuocChaTheoKhoa(ancDks, nguongById) {
  const theoNut = new Map();
  for (const d of ancDks || []) {
    const k = d.nut || '__cha__';
    if (!theoNut.has(k)) theoNut.set(k, []);
    if (!theoNut.get(k).some((x) => x.id === d.id)) theoNut.get(k).push(d);
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
        const ng = chuanNguongSo(nguongById.get(dk.nguong)?.nguong);
        if (!ng) continue;
        m.set(ng.khoa, ng);
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

/** Giải thoả có điều kiện phạm vi cha (`Cha ∧ ChuoiCha ⟹ ⋁ Con_i`) trên miền hữu hạn `GIA_TRI` đơn trị + khoảng sơ cấp `SO` + biến boolean `CO_KHONG`/`daTri`. */
function chungMinhPhuKinCoDieuKienCha(con, dkTheoNut, nguongById, chaDks, chuoiChaDks, opts = {}) {
  if (!Array.isArray(con) || con.length < 2) return false;
  if (con.some((id) => !(dkTheoNut.get(id) || []).length)) return false;
  const { L = null, bieuMeta = null, truTheoNut = null } = opts;

  const ancByNut = new Map();
  for (const d of [...(chuoiChaDks || []), ...(chaDks || [])]) {
    if (!d || (d.loai && d.loai !== 'DIEU_KIEN')) continue;
    const k = d.nut || '__cha__';
    if (!ancByNut.has(k)) ancByNut.set(k, []);
    if (!ancByNut.get(k).some((x) => x.id === d.id)) ancByNut.get(k).push(d);
  }

  const buildNutFormula = (dks) => {
    const map = new Map((dks || []).map((d) => [d.id, d]));
    return chiaVeDieuKien(dks).cacVe
      .filter((v) => v.cacDieuKien.length > 0)
      .map((v) => v.cacDieuKien.map((it) => map.get(it.id) || it));
  };

  const ancFormulas = [];
  for (const dks of ancByNut.values()) {
    const f = buildNutFormula(dks);
    if (f.length) ancFormulas.push(f);
  }

  const nutFormulaCache = new Map();
  const getNutFormula = (nutId) => {
    if (!nutFormulaCache.has(nutId)) {
      nutFormulaCache.set(nutId, buildNutFormula(dkTheoNut.get(nutId) || []));
    }
    return nutFormulaCache.get(nutId);
  };

  const childSpecs = con.map((id) => ({
    id,
    veList: getNutFormula(id),
    truList: (truTheoNut?.get(id) || []).map((tid) => getNutFormula(tid)).filter((f) => f.length > 0),
  }));
  if (childSpecs.some((c) => !c.veList.length)) return false;

  const allDks = [];
  const seenDkIds = new Set();
  const collectFormula = (f) => {
    for (const ve of f) {
      for (const d of ve) {
        if (d?.id && !seenDkIds.has(d.id)) {
          seenDkIds.add(d.id);
          allDks.push(d);
        }
      }
    }
  };
  for (const f of ancFormulas) collectFormula(f);
  for (const cs of childSpecs) {
    collectFormula(cs.veList);
    for (const tf of cs.truList) collectFormula(tf);
  }
  if (!allDks.length) return false;

  // 1. Chiều SO theo đại lượng quy đổi
  const soPointsByKhoa = new Map();
  for (const d of allDks) {
    if (d.kieu !== 'SO') continue;
    const ng = chuanNguongSo(nguongById.get(d.nguong)?.nguong);
    if (!ng) return false;
    if (!soPointsByKhoa.has(ng.khoa)) soPointsByKhoa.set(ng.khoa, new Set());
    if (ng.tu !== null) soPointsByKhoa.get(ng.khoa).add(ng.tu);
    if (ng.den !== null) soPointsByKhoa.get(ng.khoa).add(ng.den);
  }
  const soDomainByKhoa = new Map();
  for (const [kk, ptsSet] of soPointsByKhoa) {
    const pts = [...ptsSet].sort((a, b) => a - b);
    const samples = [];
    if (!pts.length) {
      samples.push(0);
    } else {
      samples.push(pts[0] - 1);
      for (let i = 0; i < pts.length; i += 1) {
        samples.push(pts[i]);
        if (i + 1 < pts.length) samples.push((pts[i] + pts[i + 1]) / 2);
      }
      samples.push(pts[pts.length - 1] + 1);
    }
    soDomainByKhoa.set(kk, samples);
  }

  // 2. Chiều GIA_TRI đơn trị (!daTri)
  const gtValsByTruc = new Map();
  const gtHasPhuByTruc = new Map();
  for (const d of allDks) {
    if (d.kieu !== 'GIA_TRI' || d.daTri) continue;
    const t = chuanTruc(d);
    if (!t) continue;
    if (!gtValsByTruc.has(t)) gtValsByTruc.set(t, new Set());
    for (const v of chuanTap(d.tap)) gtValsByTruc.get(t).add(v);
    if (d.phu) gtHasPhuByTruc.set(t, true);
  }

  // Nhận diện điều kiện miền chung (vd 6110.90: laPhanBuCoTen có 1 GIA_TRI dương nêu miền chung + phu:true phủ hết tập dương anh em trước)
  const universePosDkIds = new Set();
  if (L) {
    for (const cId of con) {
      if (!laPhanBuCoTen(cId, L, bieuMeta)) continue;
      const dksC = dkTheoNut.get(cId) || [];
      for (const [t] of gtValsByTruc) {
        const posC = dksC.filter((d) => d.kieu === 'GIA_TRI' && !d.daTri && !d.phu && chuanTruc(d) === t);
        const negC = dksC.filter((d) => d.kieu === 'GIA_TRI' && !d.daTri && d.phu && chuanTruc(d) === t);
        if (posC.length !== 1 || !negC.length) continue;
        const otherPosVals = new Set();
        for (const oId of con) {
          if (oId === cId) continue;
          for (const d of dkTheoNut.get(oId) || []) {
            if (d.kieu === 'GIA_TRI' && !d.daTri && !d.phu && chuanTruc(d) === t) {
              for (const v of chuanTap(d.tap)) otherPosVals.add(v);
            }
          }
        }
        const coveredByNeg = new Set();
        for (const d of negC) for (const v of chuanTap(d.tap)) coveredByNeg.add(v);
        if (otherPosVals.size > 0 && [...otherPosVals].every((v) => coveredByNeg.has(v))) {
          universePosDkIds.add(posC[0].id);
        }
      }
    }
  }

  // Các trục chính đã bị Cha/ChuoiCha khoá miền hữu hạn (mọi vế của ít nhất 1 nút cha đều ràng buộc dương trên trục đó)
  const primaryAxes = new Set();
  for (const f of ancFormulas) {
    if (!f.length) continue;
    const axesPerVe = f.map((ve) => new Set(
      ve.filter((d) => d.kieu === 'GIA_TRI' && !d.daTri && !d.phu && chuanTruc(d)).map((d) => chuanTruc(d)),
    ));
    for (const ax of axesPerVe[0]) {
      if (axesPerVe.every((s) => s.has(ax))) primaryAxes.add(ax);
    }
  }

  // Kiểm tra điều kiện đóng trục thứ cấp (vd 85.01 gốc): khi một anh em trước mang ngưỡng SO mà phần phi-SO không tự rời với anh em phần bù có tên đứng sau, nhánh phần bù phải có phu SO hoặc truAnhEm
  let choPhepDongTrucPhu = primaryAxes.size > 0 && Boolean(L);
  if (choPhepDongTrucPhu) {
    for (const sSo of childSpecs) {
      for (const veSo of sSo.veList) {
        const dSoList = veSo.filter((d) => d.kieu === 'SO' && !d.phu);
        if (!dSoList.length) continue;
        const veSoPhiSo = veSo.filter((d) => d.kieu !== 'SO');
        for (const sBu of childSpecs) {
          if (sBu.id === sSo.id || !laPhanBuCoTen(sBu.id, L, bieuMeta)) continue;
          for (const veBu of sBu.veList) {
            const veBuPhiSo = veBu.filter((d) => d.kieu !== 'SO');
            if (veRoiNhau(veSoPhiSo, veBuPhiSo, nguongById)) continue;
            const duPhuSo = dSoList.every((dSo) => veBu.some((dBu) => dBu.kieu === 'SO' && dBu.phu && laPhuCuaNhau(dSo, dBu, nguongById)));
            if (!duPhuSo) {
              choPhepDongTrucPhu = false;
              break;
            }
          }
          if (!choPhepDongTrucPhu) break;
        }
        if (!choPhepDongTrucPhu) break;
      }
      if (!choPhepDongTrucPhu) break;
    }
  }

  const gtDomainByTruc = new Map();
  const secondaryClosedAxes = new Set();
  for (const [t, valsSet] of gtValsByTruc) {
    const vals = [...valsSet];
    const isBinaryKhong = vals.length === 2 && (
      vals[0] === `không ${vals[1]}` || vals[1] === `không ${vals[0]}`
    );
    if (isBinaryKhong || primaryAxes.has(t)) {
      gtDomainByTruc.set(t, vals);
    } else if (choPhepDongTrucPhu && !gtHasPhuByTruc.get(t) && vals.length >= 2) {
      secondaryClosedAxes.add(t);
      gtDomainByTruc.set(t, vals);
    } else {
      gtDomainByTruc.set(t, [...vals, '__khac__']);
    }
  }

  // 3. Chiều boolean cho CO_KHONG và GIA_TRI đa trị (daTri: true)
  const boolKeys = [];
  const boolKeySet = new Set();
  const boolKeyOfDk = new Map();
  for (const d of allDks) {
    if (d.kieu === 'CO_KHONG') {
      const k = `CK:${chuanCauHoi(d.cauHoi) || d.id}`;
      boolKeyOfDk.set(d.id, k);
      if (!boolKeySet.has(k)) { boolKeySet.add(k); boolKeys.push(k); }
    } else if (d.kieu === 'GIA_TRI' && d.daTri) {
      const k = `GTDT:${chuanTruc(d)}|${[...chuanTap(d.tap)].sort().join('\u0001')}`;
      boolKeyOfDk.set(d.id, k);
      if (!boolKeySet.has(k)) { boolKeySet.add(k); boolKeys.push(k); }
    }
  }

  // Danh sách biến duyệt: ưu tiên primaryAxes -> các biến xuất hiện ở Cha -> còn lại
  const dims = [];
  const ancRefKeys = new Set();
  for (const f of ancFormulas) {
    for (const ve of f) {
      for (const d of ve) {
        if (d.kieu === 'SO') ancRefKeys.add(`SO:${chuanNguongSo(nguongById.get(d.nguong)?.nguong)?.khoa}`);
        else if (d.kieu === 'GIA_TRI' && !d.daTri) ancRefKeys.add(`GT:${chuanTruc(d)}`);
        else ancRefKeys.add(`BL:${boolKeyOfDk.get(d.id)}`);
      }
    }
  }
  for (const [t, dom] of gtDomainByTruc) dims.push({ kind: 'GT', key: t, fullKey: `GT:${t}`, domain: dom, prio: primaryAxes.has(t) ? 0 : (ancRefKeys.has(`GT:${t}`) ? 1 : (secondaryClosedAxes.has(t) ? 2 : 3)) });
  for (const [kk, dom] of soDomainByKhoa) dims.push({ kind: 'SO', key: kk, fullKey: `SO:${kk}`, domain: dom, prio: ancRefKeys.has(`SO:${kk}`) ? 1 : 3 });
  for (const bk of boolKeys) dims.push({ kind: 'BL', key: bk, fullKey: `BL:${bk}`, domain: [false, true], prio: ancRefKeys.has(`BL:${bk}`) ? 1 : 4 });
  dims.sort((a, b) => a.prio - b.prio);

  const state = { GT: new Map(), SO: new Map(), BL: new Map() };

  const evalAtom = (d) => {
    let raw;
    if (d.kieu === 'SO') {
      const ng = chuanNguongSo(nguongById.get(d.nguong)?.nguong);
      if (!ng || !state.SO.has(ng.khoa)) return undefined;
      const x = state.SO.get(ng.khoa);
      raw = (ng.tu === null || x > ng.tu || (x === ng.tu && ng.gomTu))
        && (ng.den === null || x < ng.den || (x === ng.den && ng.gomDen));
    } else if (d.kieu === 'GIA_TRI' && !d.daTri) {
      const t = chuanTruc(d);
      if (!state.GT.has(t)) return undefined;
      const v = state.GT.get(t);
      const tap = chuanTap(d.tap);
      raw = tap.has(v) || (v === '__khac__' && universePosDkIds.has(d.id));
    } else {
      const bk = boolKeyOfDk.get(d.id);
      if (!state.BL.has(bk)) return undefined;
      raw = state.BL.get(bk);
    }
    return d.phu ? !raw : raw;
  };

  const evalVeList = (veList) => {
    let hasUndef = false;
    for (const ve of veList) {
      let veUndef = false;
      let veFalse = false;
      for (const d of ve) {
        const r = evalAtom(d);
        if (r === false) { veFalse = true; break; }
        if (r === undefined) veUndef = true;
      }
      if (!veFalse && !veUndef) return true;
      if (!veFalse && veUndef) hasUndef = true;
    }
    return hasUndef ? undefined : false;
  };

  const evalChild = (cs) => {
    for (const tf of cs.truList) {
      const rt = evalVeList(tf);
      if (rt === true) return false;
      if (rt === undefined) return undefined;
    }
    return evalVeList(cs.veList);
  };

  const domainForSecondaryAxis = (t, baseDom) => {
    if (!secondaryClosedAxes.has(t)) return baseDom;
    const compatVals = new Set();
    for (const cs of childSpecs) {
      for (const ve of cs.veList) {
        let compat = true;
        for (const pAx of primaryAxes) {
          if (!state.GT.has(pAx)) continue;
          const pv = state.GT.get(pAx);
          const dP = ve.filter((d) => d.kieu === 'GIA_TRI' && !d.daTri && chuanTruc(d) === pAx);
          for (const dp of dP) {
            const inTap = chuanTap(dp.tap).has(pv);
            if (dp.phu ? inTap : !inTap) { compat = false; break; }
          }
          if (!compat) break;
        }
        if (!compat) continue;
        for (const d of ve) {
          if (d.kieu === 'GIA_TRI' && !d.daTri && !d.phu && chuanTruc(d) === t) {
            for (const v of chuanTap(d.tap)) compatVals.add(v);
          }
        }
      }
    }
    if (compatVals.size === 0) return [baseDom[0]];
    if (compatVals.size >= 2) return [...compatVals];
    return [...compatVals, '__khac__'];
  };

  let visited = 0;
  let validParentCount = 0;
  let aborted = false;
  const MAX_VISITED = 60000;

  const dfs = (idx) => {
    visited += 1;
    if (visited > MAX_VISITED) { aborted = true; return false; }
    for (const af of ancFormulas) {
      if (evalVeList(af) === false) return true;
    }
    // Cắt tỉa sớm khi đã có ít nhất một nút con chắc chắn true và mọi nút cha đã thoả
    const allAncTrue = ancFormulas.every((af) => evalVeList(af) === true);
    if (allAncTrue && childSpecs.some((cs) => evalChild(cs) === true)) {
      validParentCount += 1;
      return true;
    }
    if (idx === dims.length) {
      if (!allAncTrue) return true;
      validParentCount += 1;
      return childSpecs.some((cs) => evalChild(cs) === true);
    }
    const dim = dims[idx];
    const map = state[dim.kind];
    const dom = dim.kind === 'GT' ? domainForSecondaryAxis(dim.key, dim.domain) : dim.domain;
    for (const val of dom) {
      map.set(dim.key, val);
      const ok = dfs(idx + 1);
      map.delete(dim.key);
      if (!ok || aborted) return false;
    }
    return true;
  };

  const proven = dfs(0);
  return proven && !aborted && validParentCount > 0;
}

/** Kiểm các phân hoạch kín theo cấu trúc biểu thuế:
 *  (a) Cụm "X và/; bộ phận của nó/chúng" trên cùng một trục `GIA_TRI` đơn trị (`!daTri`), có nhánh "Bộ phận" và nhánh hàng nguyên chiếc (hoặc cặp chưa lắp + đã lắp hoàn chỉnh);
 *  (b) Cụm Nguyên chiếc + Bộ phận + Phần bù có tên (`laPhanBuCoTen`). */
function chungMinhPhanHoachCauTruc(con, dkTheoNut, nguongById = new Map(), opts = {}) {
  const { chaId = null, L = null, bieuMeta = null } = opts;
  if (!L || !Array.isArray(con) || con.length < 2) return false;
  if (con.some((id) => !(dkTheoNut.get(id) || []).length)) return false;

  const boNgoac = (s) => boGachTen(s).replace(/\s*\([^)]*\)/gu, ' ').replace(/\s+/g, ' ').trim();
  const tenNut = (id) => L.cay?.theoId?.get(id)?.ten || bieuMeta?.get(id)?.nguyenVan || '';
  const layCacVeDayDu = (id) => {
    const dks = dkTheoNut.get(id) || [];
    const map = new Map(dks.map((d) => [d.id, d]));
    return chiaVeDieuKien(dks).cacVe
      .filter((v) => v.cacDieuKien.length > 0)
      .map((v) => v.cacDieuKien.map((it) => map.get(it.id) || it));
  };
  const duPhuNguongTruoc = (idxCon, cacVeBu) => {
    for (let i = 0; i < idxCon; i += 1) {
      for (const veSo of layCacVeDayDu(con[i])) {
        const dSoList = veSo.filter((d) => d.kieu === 'SO' && !d.phu);
        if (!dSoList.length) continue;
        const veSoPhiSo = veSo.filter((d) => d.kieu !== 'SO');
        for (const veBu of cacVeBu) {
          const veBuPhiSo = veBu.filter((d) => d.kieu !== 'SO');
          if (veRoiNhau(veSoPhiSo, veBuPhiSo, nguongById)) continue;
          const ok = dSoList.every((dSo) => veBu.some((dBu) => dBu.kieu === 'SO' && dBu.phu && laPhuCuaNhau(dSo, dBu, nguongById)));
          if (!ok) return false;
        }
      }
    }
    return true;
  };

  // (a) Cụm "X và/; bộ phận của nó/chúng" trên cùng trục GIA_TRI đơn trị (!daTri)
  const donGt = [];
  for (const id of con) {
    const dks = dkTheoNut.get(id) || [];
    const map = new Map(dks.map((d) => [d.id, d]));
    const cacVe = chiaVeDieuKien(dks).cacVe;
    if (cacVe.length !== 1 || cacVe[0].cacDieuKien.length !== 1) { donGt.length = 0; break; }
    const d = map.get(cacVe[0].cacDieuKien[0].id);
    if (!d || d.kieu !== 'GIA_TRI' || d.phu || d.daTri || !chuanTruc(d)) { donGt.length = 0; break; }
    donGt.push({ id, truc: chuanTruc(d), tap: [...chuanTap(d.tap)] });
  }
  if (donGt.length === con.length && new Set(donGt.map((x) => x.truc)).size === 1) {
    const boPhanItems = donGt.filter((x) => x.tap.length === 1 && /^bộ\s+phận$/iu.test(x.tap[0]));
    const conLai = donGt.filter((x) => !(x.tap.length === 1 && /^bộ\s+phận$/iu.test(x.tap[0])));
    if (boPhanItems.length === 1 && conLai.length >= 1) {
      if (
        conLai.length === 2
        && conLai.some((x) => x.tap.some((v) => /^chưa\s+lắp(?:\s+ráp)?\s+hoàn\s+chỉnh$/iu.test(v)))
        && conLai.some((x) => x.tap.some((v) => /^đã\s+lắp(?:\s+ráp)?\s+hoàn\s+chỉnh$/iu.test(v)))
      ) {
        return true;
      }
      if (conLai.length === 1 && chaId) {
        const duongCha = G.duongDiNut(chaId, L.cay) || [{ nut: chaId }];
        const coChaNguyenBoPhan = duongCha.some((b) => {
          const tCha = boNgoac(tenNut(b.nut)).toLowerCase();
          return /bộ\s+phận\s+của\s+(?:nó|chúng)/iu.test(tCha)
            && conLai[0].tap.every((v) => chuanSo(tCha).includes(v));
        });
        if (coChaNguyenBoPhan) return true;
      }
    }
  }

  // (b) Cụm Nguyên chiếc + Bộ phận + Phần bù có tên (`laPhanBuCoTen`)
  if (con.length >= 3) {
    const dsPhanBu = con.filter((id) => (
      laPhanBuCoTen(id, L, bieuMeta)
      && !(dkTheoNut.get(id) || []).some((d) => d.kieu === 'SO' && !d.phu)
    ));
    if (dsPhanBu.length > 0) {
      const laVeKhongThuHep = (ve) => (
        ve.length > 0
        && !ve.some((d) => !d.phu && (d.kieu === 'GIA_TRI' || d.kieu === 'SO'))
        && ve.filter((d) => !d.phu && d.kieu === 'CO_KHONG').length <= 1
      );
      // (b1) Phần bù có tên cho hàng nguyên chiếc + nhánh "Bộ phận (và phụ kiện)" (vd 84.79, 85.17, 85.43, 90.31)
      const coPhanBuNguyenChiec = dsPhanBu.some((id) => {
        if (/bộ\s+phận/iu.test(boNgoac(tenNut(id)))) return false;
        const cacVe = layCacVeDayDu(id);
        if (!cacVe.some(laVeKhongThuHep)) return false;
        return duPhuNguongTruoc(con.indexOf(id), cacVe);
      });
      const coNhanhBoPhan = con.some((id) => {
        if (!/^(?:các\s+)?bộ\s+phận(?:\s+và\s+phụ\s+kiện)?$/iu.test(boNgoac(tenNut(id)))) return false;
        return layCacVeDayDu(id).some(laVeKhongThuHep);
      });
      if (coPhanBuNguyenChiec && coNhanhBoPhan) return true;

      // (b2) Cha dạng "<Hàng> và bộ phận của chúng" + nhánh hàng nguyên chiếc khớp tên cha + nhánh "Các bộ phận khác" trên cùng trục GIA_TRI đơn trị (vd 8708.99.2)
      if (chaId) {
        const tCha = boNgoac(tenNut(chaId)).toLowerCase();
        const mCha = /^(.+?)\s+và\s+(?:các\s+)?bộ\s+phận\s+của\s+(?:nó|chúng)\s*[:;.]*$/iu.exec(tCha);
        const dsPhanBuBoPhan = dsPhanBu.filter((id) => /bộ\s+phận\s+khác/iu.test(boNgoac(tenNut(id))));
        if (mCha && dsPhanBuBoPhan.length > 0) {
          const tenChinhCha = chuanSo(mCha[1]).toLowerCase().trim();
          const trucs = con.map((id) => {
            const gtPos = (dkTheoNut.get(id) || []).filter((d) => d.kieu === 'GIA_TRI' && !d.phu && !d.daTri && chuanTruc(d));
            return gtPos.length ? chuanTruc(gtPos[0]) : null;
          });
          if (trucs.every(Boolean) && new Set(trucs).size === 1) {
            const truc0 = trucs[0];
            const coConNguyenChiecKhopCha = con.some((id) => {
              if (dsPhanBuBoPhan.includes(id)) return false;
              return layCacVeDayDu(id).some((ve) => {
                if (ve.length !== 1) return false;
                const d = ve[0];
                if (d.kieu !== 'GIA_TRI' || d.phu || d.daTri || chuanTruc(d) !== truc0) return false;
                const tap = chuanTap(d.tap);
                return tap.size === 1 && tap.has(tenChinhCha);
              });
            });
            const coPhanBuBoPhanHopLe = dsPhanBuBoPhan.some((id) => {
              const cacVe = layCacVeDayDu(id);
              if (!cacVe.length || !duPhuNguongTruoc(con.indexOf(id), cacVe)) return false;
              return cacVe.some((ve) => {
                const duong = ve.filter((d) => !d.phu);
                return duong.length === 1
                  && duong[0].kieu === 'GIA_TRI'
                  && !duong[0].daTri
                  && chuanTruc(duong[0]) === truc0;
              });
            });
            if (coConNguyenChiecKhopCha && coPhanBuBoPhanHopLe) return true;
          }
        }
      }
    }
  }

  return false;
}

/** Kiểm chứng minh phủ kín phạm vi cha khi nhóm KHÔNG có nút "Loại khác". */
export function chungMinhPhuKin(con, dkTheoNut, nguongById = new Map(), chaDks = [], chuoiChaDks = [], opts = {}) {
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

  // 2. Mọi anh em đều có ngưỡng đơn kieu SO trên cùng đại lượng quy đổi phủ kín phạm vi cha (hoặc (-∞, +∞))
  const mucTieuCha = rangBuocChaTheoKhoa([...(chuoiChaDks || []), ...(chaDks || [])], nguongById);
  const theoTruc = new Map();
  for (const id of con) {
    const dks = dkTheoNut.get(id) || [];
    const ve1 = chiaVeDieuKien(dks).cacVe;
    if (ve1.length !== 1 || ve1[0].cacDieuKien.length !== 1) continue;
    const dk = ve1[0].cacDieuKien[0];
    if (dk.kieu !== 'SO' || dk.phu) continue;
    const ng = chuanNguongSo(nguongById.get(dk.nguong)?.nguong);
    if (!ng) continue;
    if (!theoTruc.has(ng.khoa)) theoTruc.set(ng.khoa, new Map());
    theoTruc.get(ng.khoa).set(id, ng);
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
      if (!k) continue;
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

  // 4. Giải thoả có điều kiện phạm vi cha trên miền hữu hạn GIA_TRI + khoảng sơ cấp SO + CO_KHONG
  if (chungMinhPhuKinCoDieuKienCha(con, dkTheoNut, nguongById, chaDks, chuoiChaDks, opts)) return true;

  // 5. Phân hoạch kín theo cấu trúc biểu thuế (Nguyên chiếc + Bộ phận / Phần bù có tên)
  if (chungMinhPhanHoachCauTruc(con, dkTheoNut, nguongById, opts)) return true;

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
    const chaBuoc = L.cay.theoId.get(buoc.nut)?.cha || meta?.cha || null;
    const conChaBuoc = chaBuoc ? G.conCua(chaBuoc, L.cay) : [];
    let truAnhEm = [];
    const truCongThuc = {};
    if (laLK) {
      const aeCha = meta?.phamViTru?.length
        ? meta.phamViTru
        : G.anhEmCua(buoc.nut, L.cay).filter((x) => !laLoaiKhacThuan(x, L, bieuMeta));
      truAnhEm = aeCha;
    } else if (chaBuoc && conChaBuoc.length >= 2) {
      truAnhEm = tinhTruAnhEm(
        buoc.nut,
        chaBuoc,
        conChaBuoc,
        L,
        bieuMeta,
        dkTheoNut,
        giaiChongTheoCha.get(chaBuoc) || [],
        nguongById,
      );
    } else if (laLoaiKhacCoVe(buoc.nut, L, bieuMeta) && meta?.phamViTru?.length) {
      truAnhEm = [...meta.phamViTru];
    }
    for (const aeId of truAnhEm) {
      const aeDks = dkTheoNut.get(aeId) || [];
      dksChuoiCha.push(...aeDks);
      truCongThuc[aeId] = chiaVeDieuKien(aeDks);
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
  const giaiChongCuaCha = giaiChongTheoCha.get(chaId) || [];
  const truTheoNut = taoBanDoTruAnhEm(chaId, con, L, bieuMeta, dkTheoNut, giaiChongCuaCha, nguongById);

  const anhEm = con.map((childId) => {
    const ten = L.cay.theoId.get(childId)?.ten || bieuMeta.get(childId)?.nguyenVan || '';
    const laLK = laLoaiKhacThuan(childId, L, bieuMeta);
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

    const truAnhEm = truTheoNut.get(childId) || [];
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
  const giaiChong = giaiChongCuaCha.map((g) => ({
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
  if (!coLoaiKhac && !chungMinhPhuKin(con, dkTheoNut, nguongById, dkTheoNut.get(chaId) || [], dksDuongCha, { chaId, L, bieuMeta, truTheoNut })) co.add('HO_PHU');

  for (let i = 0; i < coTen.length; i += 1) {
    for (let j = i + 1; j < coTen.length; j += 1) {
      const capKey = [coTen[i], coTen[j]].sort().join('|');
      if (giaiChongSet.has(capKey)) continue;
      if (vungChongSet.has(capKey)) {
        co.add('VUNG_CHONG');
        continue;
      }
      if ((truTheoNut.get(coTen[i]) || []).includes(coTen[j]) || (truTheoNut.get(coTen[j]) || []).includes(coTen[i])) continue;
      const dksA = dkTheoNut.get(coTen[i]) || [];
      const dksB = dkTheoNut.get(coTen[j]) || [];
      if (haiNutRoiNhau(dksA, dksB, nguongById)) continue;
      if (laChongSoTrungTruc(dksA, dksB, nguongById)) {
        co.add('VUNG_CHONG');
      } else {
        co.add('CHUA_CHUNG_MINH_TACH');
      }
    }
  }

  const tatCaDk = [...dksChuoiCha, ...dkCoTen];
  if (tatCaDk.some((d) => d.mo === 'NGHIA_THUONG')) co.add('NGHIA_THUONG');

  const tatCaDkChoVanTay = [...dksChuoiCha, ...con.flatMap((id) => dkTheoNut.get(id) || [])];
  const vanTayCau = {};
  if (typeof L?.chuCau === 'function') {
    const cauIds = new Set();
    for (const d of tatCaDkChoVanTay) {
      if (typeof d?.nguon === 'string' && d.nguon && !/^tb:/.test(d.nguon)) cauIds.add(d.nguon);
      if (typeof d?.moNguon === 'string' && d.moNguon && !/^tb:/.test(d.moNguon)) cauIds.add(d.moNguon);
      else if (Array.isArray(d?.moNguon)) {
        for (const mnId of d.moNguon) {
          if (typeof mnId === 'string' && mnId && !/^tb:/.test(mnId)) cauIds.add(mnId);
        }
      }
    }
    for (const cauId of [...cauIds].sort()) {
      const chu = L.chuCau(cauId);
      if (chu !== null && chu !== undefined) vanTayCau[cauId] = sha256(chu);
    }
  }

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
    ...(Object.keys(vanTayCau).length ? { vanTayCau } : {}),
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

function napChuCauBang(thuMuc) {
  if (!thuMuc || !fs.existsSync(thuMuc)) return null;
  const nut = new Map();
  const cau = new Map();
  for (const f of fs.readdirSync(thuMuc).filter((x) => x.endsWith('.jsonl') && x !== 'thong-bao.jsonl').sort()) {
    for (const n of G.docJsonl(path.join(thuMuc, f))) {
      if (n.lop !== 'TIEN_LE' && typeof n.nguyenVan === 'string') nut.set(n.id, n.nguyenVan);
    }
  }
  const tmCau = path.join(thuMuc, 'cau');
  if (fs.existsSync(tmCau)) {
    for (const f of fs.readdirSync(tmCau).filter((x) => x.endsWith('.jsonl') && x !== 'thong-bao.jsonl').sort()) {
      for (const c of G.docJsonl(path.join(tmCau, f))) {
        const nId = String(c.id || '').split('#')[0];
        if (nut.has(nId)) cau.set(c.id, { nut: nId, tu: c.tu, den: c.den });
      }
    }
  }
  return (id) => {
    const c = cau.get(id);
    return c ? nut.get(c.nut).slice(c.tu, c.den) : null;
  };
}

/** Chuẩn bị chỉ mục dữ liệu từ kho hồ sơ + luật để dựng bảng anh em. */
export function chuanBiDuLieuBang({ luat = G.LUAT_MAC_DINH, hoSo = G.HO_SO_MAC_DINH, L = null, viDu = [], vungChong = [] } = {}) {
  const bieuMeta = napBieuMeta(luat);
  const cay = L?.cay || G.napLuat(luat);
  const chuCau = typeof L?.chuCau === 'function' ? L.chuCau : napChuCauBang(luat);
  const L_full = L ? { ...L, cay, ...(chuCau ? { chuCau } : {}) } : { thuMuc: luat, cay, ...(chuCau ? { chuCau } : {}) };
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

function nhom4CuaNut(nutId) {
  const m = /^bieu:(\d{4})/.exec(nutId || '');
  return m ? m[1] : null;
}

/** Sinh toàn bộ bảng anh em cho một chương (hoặc danh sách nút cha / nhóm 4 số cụ thể). */
export function dungBangAnhEm({ chuong, chaIds = null, nhom4s = null, chiNhomCoDieuKien = false, luat = G.LUAT_MAC_DINH, hoSo = G.HO_SO_MAC_DINH, L = null, viDu = [], vungChong = [] } = {}) {
  const prep = chuanBiDuLieuBang({ luat, hoSo, L, viDu, vungChong });
  const ch = String(chuong).padStart(2, '0');
  let dsCha = chaIds || cacNutChaCuaChuong(ch, prep.L.cay);
  if (!chaIds) {
    if (Array.isArray(nhom4s) && nhom4s.length > 0) {
      const nhomSet = new Set(nhom4s.map((s) => String(s).replace(/\D/g, '').slice(0, 4)).filter((s) => s.length === 4));
      dsCha = dsCha.filter((id) => nhomSet.has(nhom4CuaNut(id)));
    }
    if (chiNhomCoDieuKien) {
      const nhomCoDk = new Set();
      for (const nutId of prep.duLieu.dkTheoNut.keys()) {
        const n4 = nhom4CuaNut(nutId);
        if (n4) nhomCoDk.add(n4);
      }
      dsCha = dsCha.filter((id) => nhomCoDk.has(nhom4CuaNut(id)));
    }
  }
  const bang = dsCha.map((chaId) => taoBangChoCha(chaId, prep.L, prep.duLieu));
  for (const b of bang) {
    const err = kiemBangAnhEm(b);
    if (err.length) throw new Error(`Bảng anh em ${b.cha} sai khuôn: ${err.join('; ')}`);
  }
  return { chuong: ch, bang, kho: prep.kho, duLieu: prep.duLieu };
}

/** Sinh và (tuỳ chọn) ghi data/ho-so-ma/bang-anh-em/<chương>.jsonl. */
export function sinhBangAnhEm({ chuong, chaIds = null, nhom4s = null, chiNhomCoDieuKien = false, luat = G.LUAT_MAC_DINH, hoSo = G.HO_SO_MAC_DINH, ra = null, ghi = false, viDu = [], vungChong = [] } = {}) {
  const res = dungBangAnhEm({ chuong, chaIds, nhom4s, chiNhomCoDieuKien, luat, hoSo, viDu, vungChong });
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
  const layNhieu = (k) => {
    const ds = [];
    a.forEach((x, i) => {
      if (x === k && a[i + 1]) {
        for (const p of String(a[i + 1]).split(',').map((s) => s.trim()).filter(Boolean)) ds.push(p);
      }
    });
    return ds;
  };
  const chuong = lay('--chuong');
  if (!chuong) {
    console.error('Thiếu --chuong <NN> (vd: --chuong 85 [--nhom 8501,8517] [--chi-nhom-co-dieu-kien] [--ghi])');
    process.exit(2);
  }
  const luat = path.resolve(lay('--luat') || G.LUAT_MAC_DINH);
  const hoSo = path.resolve(lay('--ho-so') || G.HO_SO_MAC_DINH);
  const ra = lay('--ra') ? path.resolve(lay('--ra')) : hoSo;
  const ghi = a.includes('--ghi');
  const nhom4s = layNhieu('--nhom');
  const chiNhomCoDieuKien = a.includes('--chi-nhom-co-dieu-kien');
  const r = sinhBangAnhEm({ chuong, nhom4s: nhom4s.length ? nhom4s : null, chiNhomCoDieuKien, luat, hoSo, ra, ghi });
  console.log(`PASS bang-anh-em chương ${r.chuong}: ${r.bang.length} bảng${ghi ? ` -> ${r.tep}` : ' (dry-run)'}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
