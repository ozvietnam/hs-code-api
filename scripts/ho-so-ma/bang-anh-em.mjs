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

/** Hai điều kiện là phủ định bù nhau trên cùng trục/câu. */
export function laPhuCuaNhau(a, b) {
  if (!a || !b || a.phu === b.phu) return false;
  if (a.nguon === b.nguon) {
    const ta = chuanSo(a.trich).toLowerCase();
    const tb = chuanSo(b.trich).toLowerCase();
    if (ta && tb && (ta === tb || ta.includes(tb) || tb.includes(ta))) return true;
  }
  if (a.kieu === b.kieu && chuanCauHoi(a.cauHoi) && chuanCauHoi(a.cauHoi) === chuanCauHoi(b.cauHoi)) {
    if (a.kieu === 'GIA_TRI') {
      const sa = new Set((a.tap || []).map((v) => chuanSo(v).toLowerCase()));
      const sb = new Set((b.tap || []).map((v) => chuanSo(v).toLowerCase()));
      return sa.size === sb.size && [...sa].every((v) => sb.has(v));
    }
    if (a.kieu === 'SO') return a.nguong === b.nguong;
    return true;
  }
  return false;
}

/** Hai nhánh VÀ (một vế) rời nhau chứng minh được bằng máy. */
export function veRoiNhau(veA, veB, nguongById = new Map()) {
  for (const a of veA) {
    for (const b of veB) {
      if (laPhuCuaNhau(a, b)) return true;
      if (a.kieu === 'SO' && b.kieu === 'SO' && !a.phu && !b.phu) {
        const na = nguongById.get(a.nguong)?.nguong;
        const nb = nguongById.get(b.nguong)?.nguong;
        if (na && nb && khoaNguong(na) === khoaNguong(nb) && !chongKhoang(na, nb)) return true;
      }
      if (a.kieu === 'GIA_TRI' && b.kieu === 'GIA_TRI' && !a.phu && !b.phu) {
        const cungTruc = (a.nguon === b.nguon) || (chuanCauHoi(a.cauHoi) && chuanCauHoi(a.cauHoi) === chuanCauHoi(b.cauHoi));
        if (cungTruc) {
          const sa = new Set((a.tap || []).map((v) => chuanSo(v).toLowerCase()));
          const sb = new Set((b.tap || []).map((v) => chuanSo(v).toLowerCase()));
          if (sa.size && sb.size && ![...sa].some((v) => sb.has(v))) return true;
        }
      }
    }
  }
  return false;
}

/** Gom danh sách DIEU_KIEN của một nút theo `ve` -> { loai: 'HOAC_CUA_VA', cacVe: [...] }. */
export function chiaVeDieuKien(dks, truAnhEm = null) {
  const theoVe = new Map();
  const xep = [...(dks || [])].sort((a, b) => (a.ve - b.ve) || String(a.id).localeCompare(String(b.id)));
  for (const d of xep) {
    if (!theoVe.has(d.ve)) theoVe.set(d.ve, []);
    const item = { id: d.id, phu: d.phu, kieu: d.kieu };
    if (d.nguong !== undefined) item.nguong = d.nguong;
    if (d.tap !== undefined) item.tap = [...d.tap];
    theoVe.get(d.ve).push(item);
  }
  const cacVe = [...theoVe.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ve, cacDieuKien]) => ({ ve, cacDieuKien }));
  const ct = { loai: 'HOAC_CUA_VA', cacVe };
  if (Array.isArray(truAnhEm) && truAnhEm.length) ct.truAnhEm = [...truAnhEm];
  return ct;
}

/** Hai nút có tên rời nhau chứng minh được bằng máy (mọi cặp vế đều rời nhau). */
export function haiNutRoiNhau(dksA, dksB, nguongById = new Map()) {
  const va = chiaVeDieuKien(dksA).cacVe.map((v) => v.cacDieuKien);
  const vb = chiaVeDieuKien(dksB).cacVe.map((v) => v.cacDieuKien);
  if (!va.length || !vb.length) return false;
  for (const a of va) {
    for (const b of vb) {
      if (!veRoiNhau(a, b, nguongById)) return false;
    }
  }
  return true;
}

/** Kiểm chứng minh phủ kín phạm vi cha khi nhóm KHÔNG có nút "Loại khác". */
export function chungMinhPhuKin(con, dkTheoNut, nguongById = new Map(), chaDks = []) {
  // 1. Có cặp anh em bù nhau bởi `phu` (mỗi bên là điều kiện đơn 1 vế, 1 điều kiện)
  const don = new Map();
  for (const id of con) {
    const dks = dkTheoNut.get(id) || [];
    if (dks.length === 1) don.set(id, dks[0]);
  }
  const donIds = [...don.keys()];
  for (let i = 0; i < donIds.length; i += 1) {
    for (let j = i + 1; j < donIds.length; j += 1) {
      if (laPhuCuaNhau(don.get(donIds[i]), don.get(donIds[j]))) return true;
    }
  }

  // 2. Mọi anh em đều có ngưỡng đơn kieu SO trên cùng (daiLuong, donVi) phủ kín (-∞, +∞)
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
  for (const m of theoTruc.values()) {
    if (m.size !== con.length) continue;
    const ds = [...m.values()].sort((a, b) => (a.tu ?? -Infinity) - (b.tu ?? -Infinity));
    if (ds[0].tu !== null) continue;
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
    if (kin && denHienTai === null) return true;
  }

  // 3. Tập GIA_TRI của các con phủ hết tập GIA_TRI do nút cha khai báo trên cùng trục
  const chaGiaTri = (chaDks || []).filter((d) => d.kieu === 'GIA_TRI' && !d.phu && Array.isArray(d.tap) && d.tap.length);
  if (chaGiaTri.length) {
    const tapChaTheoTruc = new Map();
    for (const d of chaGiaTri) {
      const k = chuanCauHoi(d.cauHoi) || d.nguon;
      if (!tapChaTheoTruc.has(k)) tapChaTheoTruc.set(k, new Set());
      for (const v of d.tap) tapChaTheoTruc.get(k).add(chuanSo(v).toLowerCase());
    }
    for (const [k, tapCha] of tapChaTheoTruc) {
      const tapCon = new Set();
      let soConKhop = 0;
      for (const id of con) {
        const dks = (dkTheoNut.get(id) || []).filter((d) => d.kieu === 'GIA_TRI' && !d.phu && (chuanCauHoi(d.cauHoi) === k || d.nguon === k || tapCha.size > 0));
        const khop = dks.filter((d) => (d.tap || []).some((v) => tapCha.has(chuanSo(v).toLowerCase())));
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
  for (const buoc of duong) {
    const dks = dkTheoNut.get(buoc.nut) || [];
    const laLK = laLoaiKhacThuan(buoc.nut, L, bieuMeta);
    const meta = bieuMeta.get(buoc.nut);
    let truAnhEm = [];
    if (laLK || (laLoaiKhacCoVe(buoc.nut, L, bieuMeta) && meta?.phamViTru?.length)) {
      const aeCha = meta?.phamViTru?.length
        ? meta.phamViTru
        : G.anhEmCua(buoc.nut, L.cay).filter((x) => !laLoaiKhacThuan(x, L, bieuMeta));
      truAnhEm = aeCha;
      for (const aeId of aeCha) dksChuoiCha.push(...(dkTheoNut.get(aeId) || []));
    }
    dksChuoiCha.push(...dks);
    chuoiCha.push({
      nut: buoc.nut,
      laLoaiKhac: laLK,
      congThuc: laLK
        ? { loai: 'KHONG_HOP_VA_CHA', phuCua: truAnhEm, chuoiCha: [] }
        : chiaVeDieuKien(dks, truAnhEm.length ? truAnhEm : null),
      dieuKienIds: dks.map((x) => x.id),
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
  if (!coLoaiKhac && !chungMinhPhuKin(con, dkTheoNut, nguongById, dkTheoNut.get(chaId) || [])) co.add('HO_PHU');

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

/** Đánh giá công thức một anh em với bản đồ gán { [dkId]: true | false } -> true | false | undefined. */
export function danhGiaCongThuc(congThuc, ganDieuKien = {}, bang = null) {
  if (!congThuc || typeof congThuc !== 'object') return undefined;
  if (congThuc.loai === 'HOAC_CUA_VA') {
    if (Array.isArray(congThuc.truAnhEm) && congThuc.truAnhEm.length && bang) {
      for (const tid of congThuc.truAnhEm) {
        const ae = bang.anhEm.find((x) => x.nut === tid);
        if (ae && danhGiaCongThuc(ae.congThuc, ganDieuKien, bang) === true) return false;
      }
    }
    const cacVe = congThuc.cacVe || [];
    if (!cacVe.length) return undefined;
    let coChuaRo = false;
    for (const v of cacVe) {
      const kqVe = danhGiaMotVe(v.cacDieuKien || [], ganDieuKien);
      if (kqVe === true) return true;
      if (kqVe === undefined) coChuaRo = true;
    }
    return coChuaRo ? undefined : false;
  }
  if (congThuc.loai === 'KHONG_HOP_VA_CHA') {
    for (const dkId of congThuc.chuoiCha || []) {
      if (ganDieuKien[dkId] === false) return false;
    }
    const phuCua = congThuc.phuCua || [];
    let coChuaRo = false;
    for (const aeId of phuCua) {
      const ae = bang?.anhEm?.find((x) => x.nut === aeId);
      if (!ae) { coChuaRo = true; continue; }
      const r = danhGiaCongThuc(ae.congThuc, ganDieuKien, bang);
      if (r === true) return false;
      if (r === undefined) coChuaRo = true;
    }
    return coChuaRo ? undefined : true;
  }
  return undefined;
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
