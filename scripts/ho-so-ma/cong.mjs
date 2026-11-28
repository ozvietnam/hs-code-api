#!/usr/bin/env node
// scripts/ho-so-ma/cong.mjs — M-71 (#1963, ADR-0006) + M-81 (#2410, ADR-0007, ADR-0010): mười bốn cổng máy của hồ sơ vấn đề mã 8 số. Tất định, không mạng, không AI.
//   (1) ĐỦ       mọi câu có sức pháp lý trên đường đi đã thành vấn đề hoặc có BỎ QUA kèm lý do
//   (2) LOẠI     mọi cạnh LOAI_SANG / PHAN_VE / CHUA_RO (M-33) xuất phát từ câu trên đường đi có vấn đề tương ứng, đích khớp;
//                cạnh ĐI VÀO (câu ở nơi khác, đích trên đường đi, KHOP) có PHAI_LA ở nút đích mang tu = câu nguồn; CHUA_RO đi vào chỉ cảnh báo
//   (3) ANH EM   mỗi cặp nút cùng cha được tách (TACH_ANH_EM hoặc NGUONG không chồng); không hai anh em trùng bộ điều kiện; dải không hở
//   (4) TRÍCH    trích nguyên văn câu, id câu thật, lop / nguon khớp nút nguồn, dữ kiện có trong chữ luật, câu thuộc đường đi của nút
//   (5) VÂN TAY  van = sha256 chữ câu hiện hành; lệch thì đỏ kèm lệnh dựng lại
//   (6) TÁCH     mỗi nút có tên >= 1 DIEU_KIEN; số vế >= số đoạn tách bởi ";" trong tên; trich nguyên văn, vanTay khớp, NGUONG thật
//   (7) PHỦ      nhóm không có "Loại khác" phải chứng minh phủ kín phạm vi cha (tapDu phải có tapDuNguon + tapDuTrich); không chứng minh được -> HO_PHU
//   (8) CHỒNG    rời nhau khi cùng trục SO không giao, cùng trục GIA_TRI đơn trị (!daTri) có tapDu kèm nguồn hợp lệ và khác tập, hoặc cặp phu bù nhau theo cấu trúc (hoặc GIAI_CHONG); thiếu tapDu/nguồn hoặc daTri:true -> CHUA_CHUNG_MINH_TACH (xếp cặp cùng trục lên đầu, không chặn); VUNG_CHONG (kể cả chồng khoảng SO cùng đại lượng) chưa giải -> chặn
//   (9) HỎI      cauHoiToiThieu sinh được cho mọi "Loại khác"; không nút nào thiếu chuỗi cha
//  (10) DÒ       mỗi ca thử ví dụ chú giải/SEN chạy qua bảng anh em ra đúng đích hoặc rẽ nhánh đúng dữ kiện thiếu
//  (11) MỞ       100% DIEU_KIEN có mo hợp lệ; NGHIA_THUONG đếm đủ và có cauHoi (không đòi về 0)
//  (12) BÙ       mọi nhóm "chưa được chi tiết hoặc ghi ở nơi khác" có CANH_TRANH hợp lệ
//  (13) PHỦ CẠNH TRANH  mọi ứng viên trong canhTranhTimThay có trong CANH_TRANH (phepThu nguyên văn) hoặc khongCanhTranh (trich nguyên văn)
//  (14) ĐỦ CHUỖI  với mỗi mã 8 số, đi dọc 4 → 6 → 8 đòi câu dẫn nguyên văn của chính bậc + điều kiện loại trich nguyên văn cho mọi anh em cùng cấp; trả 3 ô ĐÚNG / SAI / CHƯA ĐỦ DỮ KIỆN
//
//   node scripts/ho-so-ma/cong.mjs --pham-vi <76 | chuong:76 | phan:XV | chuong:28:pc:II | 7605 | 760519 | 76051910 | bieu:…> [--pham-vi …]
//        [--chi-trong]  chỉ câu / anh em bên trong phạm vi, bỏ các cấp phía trên (cho thẻ tách từng cấp)
//        [--toi-cap phan|chuong|4|6|8]  chỉ xét nút tới cấp đó (gồm cả cấp đó): nút sâu hơn không vào cổng 1–3, anh em sâu hơn không đòi tách
//                       (thẻ tách Phần/Chương dùng chuong, thẻ nhóm 4 số dùng 4; tiêu đề 5 số đi cùng cấp 6 số)
//        [--cong 1,2,3,4,5 | 6..12 | 6..14 | 1..14] [--vi-du <tep.jsonl>] [--vung-chong <tep.jsonl>] [--luat <data/luat-goc>] [--ho-so <data/ho-so-ma>]
//   Không --pham-vi: mặc định chạy khuôn + cổng 4, 5 trên mọi bản ghi (giữ nguyên tương thích 100%).
//   node scripts/ho-so-ma/cong.mjs --dinh-cau <id câu>   in chữ câu hiện hành, vân tay mới và mọi bản ghi dính câu đó (để dựng lại)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { kiemKhoHoSo, BO_QUA, LOAI_DIEU_KIEN, MO_DIEU_KIEN } from './khuon.mjs';
import * as GoiNhomMod from './goi-nhom.mjs';
import {
  napBieuMeta,
  laLoaiKhacThuan,
  phanXuCapGiaiChong,
  taoBanDoTruAnhEm,
  demDoanChamPhay,
  haiNutRoiNhau,
  veRoiNhau,
  chiaVeDieuKien,
  laChongSoTrungTruc,
  layTapDuHopLeTheoTruc,
  moRongCayCon,
  laCauCapDuoiCon,
  khoaTapDuNguon,
  chungMinhPhuKin,
  taoBangChoCha,
  doBangAnhEm,
  khoaNguong,
} from './bang-anh-em.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');
const { CHUONG_SANG_PHAN } = require('../../lib/do-thi/dan-chieu.js');

// Cùng phép chuẩn hoá với scripts/kiem-luat-goc.mjs (gon + chuanSo): NFC, gộp khoảng trắng, bỏ khoảng trắng quanh dấu nối.
function gon(s) {
  return String(s).normalize('NFC').replace(/\s+/g, ' ').trim();
}
export function chuanSo(s) {
  return gon(s).replace(/ ?([-–—/]) ?/g, '$1');
}
export function vanTay(chu) {
  return crypto.createHash('sha256').update(chu, 'utf8').digest('hex');
}

const KHO_BO = new Set(['thong-bao.jsonl']); // tiền lệ không vào hồ sơ
const LOAI_CANH_BAT_BUOC = new Set(['LOAI_SANG', 'PHAN_VE', 'DINH_NGHIA']); // câu HUONG_DAN mang cạnh này ⇒ có sức tạo điều kiện

/** Nạp đủ luật cho cổng: nút (chữ, lop, nguon), câu (tu/den), cạnh nghĩa, cây. */
export function napLuatCong(thuMuc = G.LUAT_MAC_DINH) {
  const nut = new Map(); const cau = new Map(); const canhTheoTu = new Map(); const canhTheoDen = new Map();
  for (const f of fs.readdirSync(thuMuc).filter((x) => x.endsWith('.jsonl') && !KHO_BO.has(x)).sort()) {
    for (const n of G.docJsonl(path.join(thuMuc, f))) if (n.lop !== 'TIEN_LE') nut.set(n.id, { lop: n.lop, nguon: n.nguon?.vanBan ?? null, v: n.nguyenVan });
  }
  const tmCau = path.join(thuMuc, 'cau');
  if (fs.existsSync(tmCau)) {
    for (const f of fs.readdirSync(tmCau).filter((x) => x.endsWith('.jsonl') && !KHO_BO.has(x)).sort()) {
      for (const c of G.docJsonl(path.join(tmCau, f))) { const nId = c.id.split('#')[0]; if (nut.has(nId)) cau.set(c.id, { nut: nId, tu: c.tu, den: c.den, dan: c.dan }); }
    }
  }
  const tmCanh = path.join(thuMuc, 'nghia-canh');
  if (fs.existsSync(tmCanh)) {
    for (const f of fs.readdirSync(tmCanh).filter((x) => x.endsWith('.jsonl')).sort()) {
      for (const e of G.docJsonl(path.join(tmCanh, f))) { if (!canhTheoTu.has(e.tu)) canhTheoTu.set(e.tu, []); canhTheoTu.get(e.tu).push(e); if (!canhTheoDen.has(e.den)) canhTheoDen.set(e.den, []); canhTheoDen.get(e.den).push(e); }
    }
  }
  const chuCau = (id) => { const c = cau.get(id); return c ? nut.get(c.nut).v.slice(c.tu, c.den) : null; };
  return { thuMuc, nut, cau, canhTheoTu, canhTheoDen, chuCau, cay: G.napLuat(thuMuc) };
}

/** Loại vấn đề một cạnh đòi; null = cạnh không thuộc cổng 2. */
export function loaiCanhDoi(e) {
  if (e.trangThai === 'CHUA_RO') return /LOAI_SANG|PHAN_VE/.test(e.vi || '') ? ['KHONG_DUOC_LA', 'PHAI_LA'] : null;
  if (e.loai === 'LOAI_SANG') return ['KHONG_DUOC_LA'];
  if (e.loai === 'PHAN_VE') return ['KHONG_DUOC_LA', 'PHAI_LA'];
  return null;
}
/** Cạnh đi vào nút đích: 'DO' = phải có PHAI_LA, 'CANH_BAO' = CHUA_RO chỉ cảnh báo, null = không xét. */
export function loaiCanhVao(e) {
  if (e.trangThai === 'CHUA_RO') return /LOAI_SANG|PHAN_VE/.test(e.vi || '') ? 'CANH_BAO' : null;
  return e.trangThai === 'KHOP' && (e.loai === 'LOAI_SANG' || e.loai === 'PHAN_VE') ? 'DO' : null;
}
/** Câu nguồn ở "nơi khác" so với nút đích: không phải chính nút, không phải nút trên/dưới nó trên cùng đường đi, không áp chung. */
function laNoiKhac(cauId, den, L) {
  const chu = G.chuCuaCau(cauId);
  if (!chu || chu === G.CHUNG) return false;
  if ((G.duongDiNut(chu, L.cay) || []).some((x) => x.nut === den)) return false;
  return !G.trenCua(den, L.cay).includes(chu) && chu !== den;
}
/** Đích của cạnh là nút phân loại (nơi hàng chuyển tới được) — cùng ngữ pháp `den` của khuôn. Cạnh trỏ vào câu chú giải
 *  (phan:XV:cg:1, chuong:64:cg:2) là dẫn chiếu tới câu luật, không phải nơi chuyển: cổng 2 chỉ cảnh báo, không đòi den. */
const RE_NOI_CHUYEN = /^(?:phan:[IVX]+|chuong:\d{2}(?::pc:[IVX]+)?|bieu:\d{2,8}(?::td\d+)*|gir:[1-6](?::[a-c])?)$/;
const canhTaoDieuKien = (e) => (e.trangThai === 'CHUA_RO' ? /LOAI_SANG|PHAN_VE|DINH_NGHIA/.test(e.vi || '') : LOAI_CANH_BAT_BUOC.has(e.loai));

/** Phạm vi: nút gốc, các nút bên trong (gồm gốc), các nút phía trên. */
export function giaiPhamVi(chuoi, L) {
  const s = String(chuoi).trim();
  let goc = null;
  if (/^phan:[IVX]+$/.test(s) || /^chuong:\d{2}(?::pc:[IVX]+)?$/.test(s) || /^bieu:\d{4,8}(?::td\d+)*$/.test(s)) goc = s;
  else if (/^\d{2}$/.test(s)) goc = `chuong:${s}`;
  else if (G.chuanMa(s)) goc = `bieu:${G.chuanMa(s)}`;
  if (!goc) throw new Error(`phạm vi lạ "${s}"`);
  if (!G.duongDiNut(goc, L.cay)) throw new Error(`phạm vi ${goc} không có trong kho luật`);
  const duoi = new Set();
  const di = (id) => { duoi.add(id); if (/^chuong:\d{2}$/.test(id)) for (const pc of L.cay.pcCuaChuong.get(id.slice(7)) || []) duoi.add(pc.id); for (const c of G.conCua(id, L.cay)) di(c); };
  di(goc);
  return { goc, duoi, tren: new Set(G.trenCua(goc, L.cay)) };
}

/** Khoảng [tu, den] có chồng nhau không (null = vô cùng). */
function chong(a, b) {
  const truoc = (x, y) => x.den !== null && y.tu !== null && (x.den < y.tu || (x.den === y.tu && !(x.gomDen && y.gomTu)));
  return !truoc(a, b) && !truoc(b, a);
}
/** Thứ bậc cấp nút để giới hạn --toi-cap. Tiêu đề 5 số xếp cùng bậc 6 số (anh em của nó là phân nhóm 6 số). */
const BAC_CAP = { PHAN: 0, CHUONG: 1, PHAN_CHUONG: 1, NHOM: 2, TIEU_DE_5: 3, PHAN_NHOM: 3, TIEU_DE_7: 4, DONG: 4 };
export const TOI_CAP = Object.freeze({ phan: 0, chuong: 1, 4: 2, 6: 3, 8: 4 });
export function giaiToiCap(v) {
  if (v === null || v === undefined) return null;
  const k = String(v).trim().toLowerCase();
  if (!(k in TOI_CAP)) throw new Error(`--toi-cap lạ "${v}" (chỉ ${Object.keys(TOI_CAP).join(' | ')})`);
  return TOI_CAP[k];
}
const trongCap = (id, toiCap) => toiCap === null || (BAC_CAP[G.capCuaNut(id)] ?? 99) <= toiCap;

export function parseCongArg(raw) {
  if (!raw) return [1, 2, 3, 4, 5];
  const out = [];
  for (const part of String(raw).split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = /^(\d+)(?:\.\.|-)(\d+)$/.exec(part);
    if (m) {
      const a = Number(m[1]); const b = Number(m[2]);
      if (a < 1 || b > 14 || a > b) throw new Error(`--cong dải không hợp lệ "${part}" (chỉ 1..14)`);
      for (let k = a; k <= b; k += 1) out.push(k);
    } else {
      const k = Number(part);
      if (!Number.isInteger(k) || k < 1 || k > 14) throw new Error(`--cong lạ "${part}" (chỉ 1..14)`);
      out.push(k);
    }
  }
  return [...new Set(out)];
}

export function cacNutCungDong(nutId, L, bieuMeta, cungDongNguoc = null) {
  if (!nutId) return [];
  const daTham = new Set([nutId]);
  const hangDoi = [nutId];
  const them = (id) => {
    if (id && !daTham.has(id)) {
      daTham.add(id);
      hangDoi.push(id);
    }
  };
  while (hangDoi.length) {
    const u = hangDoi.shift();
    const m = bieuMeta?.get(u);
    if (m?.cungDong) them(m.cungDong);
    if (cungDongNguoc) {
      for (const nguonId of cungDongNguoc.get(u) || []) them(nguonId);
    } else if (bieuMeta) {
      const chaM = m?.cha || L?.cay?.theoId?.get(u)?.cha;
      if (chaM && bieuMeta.get(chaM)?.cungDong === u) them(chaM);
      for (const conId of G.conCua(u, L.cay)) {
        if (bieuMeta.get(conId)?.cungDong === u) them(conId);
      }
    }
    const conU = G.conCua(u, L.cay);
    if (conU.length === 1 && (m?.suyRa || bieuMeta?.get(conU[0])?.suyRa)) {
      them(conU[0]);
    }
    const chaU = m?.cha || L?.cay?.theoId?.get(u)?.cha;
    if (chaU && G.conCua(chaU, L.cay).length === 1 && (m?.suyRa || bieuMeta?.get(chaU)?.suyRa)) {
      them(chaU);
    }
  }
  return [...daTham];
}

function layCapTapDu(x) {
  if (x?.tapDuNguon === undefined && x?.tapDuTrich === undefined) return { hopLeCap: true, cap: [] };
  if (typeof x.tapDuNguon === 'string' && typeof x.tapDuTrich === 'string') {
    return { hopLeCap: true, cap: [[x.tapDuNguon, x.tapDuTrich]] };
  }
  if (
    Array.isArray(x.tapDuNguon)
    && Array.isArray(x.tapDuTrich)
    && x.tapDuNguon.length > 0
    && x.tapDuNguon.length === x.tapDuTrich.length
  ) {
    return { hopLeCap: true, cap: x.tapDuNguon.map((n, i) => [n, x.tapDuTrich[i]]) };
  }
  return { hopLeCap: false, cap: [] };
}

function kiemTapDuNguonTrenBanGhi(x, idRec, L, { laGir, tren, cungDongSet, ngan }, dsLoi) {
  if (x.tapDuNguon === undefined && x.tapDuTrich === undefined) return;
  const { hopLeCap, cap: capTd } = layCapTapDu(x);
  if (!hopLeCap) {
    dsLoi.push(`${idRec}: tapDuNguon và tapDuTrich phải đi theo cặp đối xứng`);
    return;
  }
  for (const [tdNguon, tdTrich] of capTd) {
    if (/^(?:tb|wco):/.test(tdNguon || '')) {
      dsLoi.push(`${idRec}: tapDuNguon không được trích tb:/wco: (${tdNguon})`);
      continue;
    }
    const tdChu = L.chuCau(tdNguon);
    if (tdChu === null) {
      dsLoi.push(`${idRec}: tapDuNguon ${tdNguon} không có trong kho luật gốc`);
      continue;
    }
    const tdChu0 = G.chuCuaCau(tdNguon);
    const tdVao = (L.canhTheoTu.get(tdNguon) || []).some((e) => e.den === x.nut && loaiCanhVao(e));
    const tdNutCau = L.cau.get(tdNguon).nut;
    // Không cho anhEm.has(tdChu0) và cấm mượn cungDongSet đi xuống nút nằm nghiêm ngặt bên dưới x.nut
    const namDuoiNut = Boolean(tdChu0 && G.trenCua(tdChu0, L.cay).includes(x.nut));
    const tdDungDuong = laGir
      ? (tdNutCau === x.nut || tdNutCau.startsWith(`${x.nut}:`))
      : !namDuoiNut && (/^gir:/.test(tdNguon) || tdVao || tdChu0 === G.CHUNG || tdChu0 === x.nut || tren.has(tdChu0) || Boolean(cungDongSet?.has(tdChu0)));
    if (!tdDungDuong) {
      dsLoi.push(`${idRec}: tapDuNguon ${tdNguon} thuộc ${tdChu0 || tdNutCau}, không nằm trên đường đi của ${x.nut}`);
    }
    if (typeof tdTrich !== 'string' || !tdTrich.trim() || !chuanSo(tdChu).includes(chuanSo(tdTrich))) {
      dsLoi.push(`${idRec}: tapDuTrich không nguyên văn câu ${tdNguon} — "${ngan(String(tdTrich ?? ''))}"`);
    }
  }
  if (Array.isArray(x.tapDu)) {
    const dsTrichChuan = capTd
      .map(([, tdTrich]) => (typeof tdTrich === 'string' ? chuanSo(tdTrich).toLowerCase() : ''))
      .filter(Boolean);
    for (const rawVal of x.tapDu) {
      const vChuan = chuanSo(String(rawVal ?? '')).toLowerCase();
      if (!vChuan || !dsTrichChuan.some((tr) => tr.includes(vChuan))) {
        dsLoi.push(`${idRec}: giá trị tapDu "${rawVal}" không xuất hiện nguyên văn trong bất kỳ tapDuTrich nào`);
      }
    }
  }
}

/**
 * Chạy các cổng 1..14. Mặc định chỉ chạy cổng 1..5 để giữ tương thích 100% với các bài kiểm cũ.
 * @param {{luat?: string, hoSo?: string, phamVi?: string[], chiTrong?: boolean, toiCap?: string|number|null, cong?: number[], L?: object, viDu?: object[], vungChong?: object[], canhTranhTimThayTheoNhom?: Map<string, any>|Record<string, any>|null}} o
 */
export function chayCong({ luat = G.LUAT_MAC_DINH, hoSo = G.HO_SO_MAC_DINH, phamVi = [], chiTrong = false, toiCap = null, cong = [1, 2, 3, 4, 5], L = null, kho: khoDaNap = null, bieuMeta: bieuMetaDaNap = null, dungBangTrongKho = true, viDu = [], vungChong = [], canhTranhTimThayTheoNhom = null } = {}) {
  L = L || napLuatCong(luat);
  const cap = typeof toiCap === 'number' ? toiCap : giaiToiCap(toiCap);
  const kho = khoDaNap || kiemKhoHoSo(hoSo);
  const tot = kho.banGhi.filter((x) => !x._hong);
  const totCu = tot.filter((x) => !LOAI_DIEU_KIEN.includes(x.loai));
  const totDk = tot.filter((x) => x.loai === 'DIEU_KIEN');
  const totGc = tot.filter((x) => x.loai === 'GIAI_CHONG');
  const totCt = tot.filter((x) => x.loai === 'CANH_TRANH');

  const theoCau = new Map(); const vanDeTheoNut = new Map(); const nguongById = new Map();
  for (const x of totCu) {
    if (!theoCau.has(x.cau)) theoCau.set(x.cau, []); theoCau.get(x.cau).push(x);
    if (x.loai !== BO_QUA) { if (!vanDeTheoNut.has(x.nut)) vanDeTheoNut.set(x.nut, []); vanDeTheoNut.get(x.nut).push(x); }
    if (x.loai === 'NGUONG') nguongById.set(x.id, x);
  }
  const dkTheoNut = new Map();
  for (const x of totDk) { if (!dkTheoNut.has(x.nut)) dkTheoNut.set(x.nut, []); dkTheoNut.get(x.nut).push(x); }
  const giaiChongTheoCha = new Map();
  for (const x of totGc) { if (!giaiChongTheoCha.has(x.nut)) giaiChongTheoCha.set(x.nut, []); giaiChongTheoCha.get(x.nut).push(x); }
  const canhTranhTheoNut = new Map();
  for (const x of totCt) { if (!canhTranhTheoNut.has(x.nut)) canhTranhTheoNut.set(x.nut, []); canhTranhTheoNut.get(x.nut).push(x); }

  const pv = phamVi.map((p) => giaiPhamVi(p, L));
  const N = new Set(); const NTrong = new Set();
  for (const p of pv) { for (const id of p.duoi) if (trongCap(id, cap)) { N.add(id); NTrong.add(id); } if (!chiTrong) for (const id of p.tren) N.add(id); }
  const ra = {
    1: { ten: 'ĐỦ', loi: [], soKiem: 0 },
    2: { ten: 'LOẠI', loi: [], canhBao: [], soKiem: 0 },
    3: { ten: 'ANH EM', loi: [], soKiem: 0 },
    4: { ten: 'TRÍCH', loi: [], soKiem: 0 },
    5: { ten: 'VÂN TAY', loi: [], soKiem: 0 },
    6: { ten: 'TÁCH', loi: [], canhBao: [], soKiem: 0 },
    7: { ten: 'PHỦ', loi: [], canhBao: [], soKiem: 0 },
    8: { ten: 'CHỒNG', loi: [], canhBao: [], dem: { roiNhau: 0, chuaChungMinhTach: 0, cungTruc: 0, vungChong: 0, giaiChong: 0 }, soKiem: 0 },
    9: { ten: 'HỎI', loi: [], canhBao: [], soKiem: 0 },
    10: { ten: 'DÒ', loi: [], canhBao: [], thieuViDu: 0, soKiem: 0 },
    11: { ten: 'MỞ', loi: [], canhBao: [], dem: { tong: 0, nghiaThuong: 0, dinhNghiaLuat: 0, nguong: 0, moTaHuongDan: 0 }, soKiem: 0 },
    12: { ten: 'BÙ', loi: [], canhBao: [], soKiem: 0 },
    13: { ten: 'PHỦ CẠNH TRANH', soKiem: 0, loi: [], canhBao: [] },
    14: { ten: 'ĐỦ CHUỖI', soKiem: 0, loi: [], canhBao: [], dem: { tongDong8: 0, duBangChungTuDong: 0, chuaDuDuKienCoCauHoi: 0, thieuBangChungSai: 0 }, theoDong8: {} },
  };
  const ngan = (t) => (t.length > 90 ? `${t.slice(0, 90)}…` : t).replace(/\n/g, ' ');

  // Câu trên đường đi của phạm vi.
  const S = [];
  if (pv.length) for (const id of L.cau.keys()) { const c = G.chuCuaCau(id); if (c && N.has(c)) S.push(id); }

  if (pv.length && cong.includes(1)) {
    for (const c of S) {
      const n = L.nut.get(L.cau.get(c).nut);
      const batBuoc = n.lop === 'LUAT' || (n.lop === 'HUONG_DAN' && (L.canhTheoTu.get(c) || []).some(canhTaoDieuKien));
      if (!batBuoc) continue;
      ra[1].soKiem += 1;
      if (!theoCau.has(c)) ra[1].loi.push(`${c} (${n.lop}) chưa thành vấn đề, chưa có BỎ QUA — "${ngan(L.chuCau(c))}"`);
    }
  }

  if (pv.length && cong.includes(2)) {
    for (const c of S) {
      for (const e of L.canhTheoTu.get(c) || []) {
        let doi = loaiCanhDoi(e);
        if (!doi) continue;
        if (!RE_NOI_CHUYEN.test(e.den)) { ra[2].canhBao.push(`${c} → ${e.den} (${e.trangThai === 'CHUA_RO' ? `CHUA_RO ${e.vi}` : e.loai}): đích là câu chú giải, không phải nơi chuyển — không đòi den`); continue; }
        ra[2].soKiem += 1;
        // Đích nằm BÊN TRONG nút chủ của câu (Phần XV → Chương 82): không thể "loại khỏi" nút đó; câu phân về nút con ⇒ đòi PHAI_LA.
        const chu = G.chuCuaCau(c);
        if (chu && chu !== G.CHUNG && G.trenCua(e.den, L.cay).includes(chu)) doi = ['PHAI_LA'];
        const co = (theoCau.get(c) || []).some((x) => doi.includes(x.loai) && (x.den || []).includes(e.den));
        if (!co) ra[2].loi.push(`${c} → ${e.den} (${e.trangThai === 'CHUA_RO' ? `CHUA_RO ${e.vi}` : e.loai}) chưa có vấn đề ${doi.join(' / ')} với den chứa ${e.den}`);
      }
    }
    // Cạnh đi vào: đích là nút trên đường đi, câu nguồn ở nơi khác.
    for (const den of N) {
      for (const e of L.canhTheoDen.get(den) || []) {
        const k = loaiCanhVao(e);
        if (!k || !L.cau.has(e.tu) || !laNoiKhac(e.tu, den, L)) continue;
        const co = (vanDeTheoNut.get(den) || []).some((x) => x.loai === 'PHAI_LA' && x.tu === e.tu);
        if (co) { ra[2].soKiem += 1; continue; }
        if (k === 'DO') { ra[2].soKiem += 1; ra[2].loi.push(`${e.tu} → ${den} (đi vào, ${e.loai}) chưa có PHAI_LA ở ${den} mang tu ${e.tu}`); } else ra[2].canhBao.push(`${e.tu} → ${den} (đi vào, CHUA_RO ${e.vi}) chưa có PHAI_LA — cảnh báo, chờ hai phiếu khớp`);
      }
    }
  }

  if (pv.length && cong.includes(3)) {
    const nhom = []; // {cha, con[], chiVoi?: nút}
    const daCo = new Set();
    for (const id of NTrong) {
      const con = G.conCua(id, L.cay).filter((x) => trongCap(x, cap));
      if (con.length >= 2 && !daCo.has(id)) { daCo.add(id); nhom.push({ cha: id, con }); }
    }
    if (!chiTrong) {
      for (const p of pv) {
        for (const a of [...p.tren, p.goc]) {
          if (/^phan:/.test(a)) continue;
          const ae = G.anhEmCua(a, L.cay).filter((x) => trongCap(x, cap));
          if (ae.length) nhom.push({ cha: `cha của ${a}`, con: [a, ...ae], chiVoi: a });
        }
      }
    }
    const vd = (id) => vanDeTheoNut.get(id) || [];
    const daCap = new Set(); const daSoatVoi = new Set();
    for (const g of nhom) {
      const anhEm = new Set(g.con);
      for (let i = 0; i < g.con.length; i += 1) {
        for (let j = i + 1; j < g.con.length; j += 1) {
          const A = g.con[i]; const B = g.con[j];
          if (g.chiVoi && A !== g.chiVoi && B !== g.chiVoi) continue;
          const k = [A, B].sort().join('|');
          if (daCap.has(k)) continue;
          daCap.add(k); ra[3].soKiem += 1;
          const tachBoi = (P, Q) => vd(P).some((x) => (x.loai === 'TACH_ANH_EM' && x.voi.includes(Q)) || (x.phuDinh || []).includes(Q)); // phuDinh: "Loại khác" phủ định anh em có tên
          const tach = tachBoi(A, B) || tachBoi(B, A);
          let tachNguong = false;
          for (const qa of vd(A).filter((x) => x.loai === 'NGUONG')) {
            for (const qb of vd(B).filter((x) => x.loai === 'NGUONG')) {
              if (khoaNguong(qa.nguong) !== khoaNguong(qb.nguong)) continue;
              if (chong(qa.nguong, qb.nguong)) ra[3].loi.push(`${A} và ${B}: NGUONG chồng dải "${qa.nguong.daiLuong}" (${qa.id} / ${qb.id})`);
              else tachNguong = true;
            }
          }
          if (!tach && !tachNguong) ra[3].loi.push(`${A} và ${B} (${g.cha}): chưa có TACH_ANH_EM giữa hai nút, chưa có NGUONG phân dải`);
          const boDk = (id) => new Set(vd(id).map((x) => `${x.loai}|${chuanSo(x.dieuKien).toLowerCase()}`));
          const da = boDk(A); const db = boDk(B);
          if (da.size && da.size === db.size && [...da].every((x) => db.has(x))) ra[3].loi.push(`${A} và ${B}: trùng bộ điều kiện (${da.size} điều kiện y hệt)`);
        }
      }
      // TACH_ANH_EM / NGUONG trỏ tới nút không phải anh em.
      for (const id of g.con) {
        if ((g.chiVoi && id !== g.chiVoi) || daSoatVoi.has(id)) continue;
        daSoatVoi.add(id);
        for (const x of vd(id)) for (const v of x.voi || []) if (!anhEm.has(v) || v === id) ra[3].loi.push(`${x.id}: voi ${v} không phải anh em cùng cha của ${id}`);
      }
      // Dải hở: mọi anh em cùng có NGUONG trên một đại lượng thì các dải phải nối liền.
      if (!g.chiVoi) {
        const theoKhoa = new Map();
        for (const id of g.con) for (const x of vd(id).filter((y) => y.loai === 'NGUONG')) { const kk = khoaNguong(x.nguong); if (!theoKhoa.has(kk)) theoKhoa.set(kk, new Map()); theoKhoa.get(kk).set(id, x.nguong); }
        for (const [kk, m] of theoKhoa) {
          if (m.size !== g.con.length) continue;
          const ds = [...m.values()].sort((a, b) => (a.tu ?? -Infinity) - (b.tu ?? -Infinity));
          for (let i = 1; i < ds.length; i += 1) {
            const a = ds[i - 1]; const b = ds[i];
            if (a.den === null || b.tu === null) continue;
            if (a.den < b.tu || (a.den === b.tu && !a.gomDen && !b.gomTu)) ra[3].loi.push(`${g.cha}: dải "${kk.split('|')[0]}" hở giữa ${a.den} và ${b.tu}`);
          }
        }
      }
    }
  }

  // Cổng 4, 5: chạy cho MỌI bản ghi trong phạm vi — gồm cả bản ghi cũ và DIEU_KIEN / GIAI_CHONG / CANH_TRANH (ADR-0009 mục 4; không phạm vi: mọi bản ghi).
  const R = pv.length ? totCu.filter((x) => N.has(x.nut) || G.capCuaNut(x.nut) === 'GIR') : totCu; // Quy tắc tổng quát nằm trên mọi đường đi
  const R_DK = pv.length ? totDk.filter((x) => N.has(x.nut) || G.capCuaNut(x.nut) === 'GIR') : totDk;
  const R_GC = pv.length ? totGc.filter((x) => N.has(x.nut)) : totGc;
  const R_CT = pv.length ? totCt.filter((x) => N.has(x.nut)) : totCt;
  const R_MOI = [...R_DK, ...R_GC, ...R_CT];
  const chayMoi = cong.some((c) => c >= 6 && c <= 14);
  const canBieuMeta = chayMoi || (cong.includes(4) && R_DK.length > 0);
  const bieuMeta = canBieuMeta ? (bieuMetaDaNap || napBieuMeta(L.thuMuc)) : null;
  const cungDongNguoc = new Map();
  if (bieuMeta) {
    for (const [id, m] of bieuMeta) {
      if (!m?.cungDong) continue;
      if (!cungDongNguoc.has(m.cungDong)) cungDongNguoc.set(m.cungDong, []);
      cungDongNguoc.get(m.cungDong).push(id);
    }
  }
  const coThat = (id) => L.nut.has(id) || L.cay.theoId.has(id) || (/^chuong:(\d{2})$/.test(id) && !!CHUONG_SANG_PHAN[id.slice(7)]) || (/^phan:[IVX]+$/.test(id) && Object.values(CHUONG_SANG_PHAN).includes(id.slice(5)));
  if (cong.includes(4)) {
    for (const x of R) {
      ra[4].soKiem += 1;
      if (/^tb:/.test(x.cau)) { ra[4].loi.push(`${x.id}: trích câu tiền lệ ${x.cau} — hồ sơ không chứa tiền lệ`); continue; }
      const chu = L.chuCau(x.cau);
      if (chu === null) { ra[4].loi.push(`${x.id}: câu ${x.cau} không có trong kho luật gốc`); continue; }
      const nNguon = L.nut.get(L.cau.get(x.cau).nut);
      const chu0 = G.chuCuaCau(x.cau);
      const tren = new Set(G.trenCua(x.nut, L.cay));
      const anhEm = new Set(G.anhEmCua(x.nut, L.cay));
      const vao = x.tu !== undefined && (L.canhTheoTu.get(x.cau) || []).some((e) => e.den === x.nut && loaiCanhVao(e));
      if (x.tu !== undefined && !vao) ra[4].loi.push(`${x.id}: tu ${x.tu} không có cạnh LOAI_SANG / PHAN_VE nào đi vào ${x.nut}`);
      const nutCau = L.cau.get(x.cau).nut;
      const laGir = G.capCuaNut(x.nut) === 'GIR';
      const dungCho = laGir ? (nutCau === x.nut || nutCau.startsWith(`${x.nut}:`)) // Quy tắc tổng quát: câu của chính quy tắc đó
        : x.loai === BO_QUA ? chu0 === x.nut
        : vao || chu0 === G.CHUNG || chu0 === x.nut || tren.has(chu0) || ((x.loai === 'TACH_ANH_EM' || x.loai === 'NGUONG') && anhEm.has(chu0));
      for (const d of x.phuDinh || []) if (!anhEm.has(d)) ra[4].loi.push(`${x.id}: phuDinh ${d} không phải anh em cùng cha của ${x.nut}`);
      if (!dungCho) ra[4].loi.push(`${x.id}: câu ${x.cau} thuộc ${laGir ? nutCau : chu0 || '(ngoài hồ sơ)'}, không nằm trên đường đi của ${x.nut}${x.loai === BO_QUA ? ' (BỎ QUA phải ghi ở đúng nút của câu)' : ''}`);
      if (x.loai === BO_QUA) continue;
      const cs = chuanSo(chu); const csThuong = cs.toLowerCase();
      if (!cs.includes(chuanSo(x.trich))) ra[4].loi.push(`${x.id}: trích không nguyên văn câu ${x.cau} — "${ngan(x.trich)}"`);
      if (x.lop !== nNguon.lop) ra[4].loi.push(`${x.id}: lop ${x.lop} khác nút nguồn (${nNguon.lop})`);
      if (x.nguon !== nNguon.nguon) ra[4].loi.push(`${x.id}: nguon "${ngan(String(x.nguon))}" khác nút nguồn "${ngan(String(nNguon.nguon))}"`);
      for (const d of x.duKien) if (!csThuong.includes(chuanSo(d).toLowerCase())) ra[4].loi.push(`${x.id}: dữ kiện "${d}" không có trong chữ câu ${x.cau} (chỉ rút từ chữ luật)`);
      if (x.loai === 'KHONG_DUOC_LA') for (const d of x.den || []) if (G.trenCua(d, L.cay).includes(x.nut)) ra[4].loi.push(`${x.id}: nơi chuyển ${d} nằm trong chính ${x.nut} — KHONG_DUOC_LA phải chuyển ra ngoài nút (câu phân về nút con là PHAI_LA)`);
      if (x.loai === 'DINH_NGHIA' && x.thuatNgu) {
        const dan = L.cau.get(x.cau).dan; const nen = `${chuanSo(nNguon.v).toLowerCase()} ${dan && L.chuCau(dan) ? chuanSo(L.chuCau(dan)).toLowerCase() : ''}`; // định nghĩa nhiều câu: thuật ngữ ở câu đầu của cùng nút
        if (!nen.includes(chuanSo(x.thuatNgu).toLowerCase())) ra[4].loi.push(`${x.id}: thuatNgu "${x.thuatNgu}" không có nguyên chữ trong nút của câu ${x.cau} hay câu dẫn`);
      }
      for (const d of [...(x.den || []), ...(x.voi || [])]) if (!coThat(d)) ra[4].loi.push(`${x.id}: nút ${d} không có trong kho luật`);
    }
    for (const x of R_MOI) {
      ra[4].soKiem += 1;
      const idRec = x.id || `${x.loai}(${x.nut})`;
      if (/^tb:/.test(x.nguon || '')) { ra[4].loi.push(`${idRec}: trích câu tiền lệ ${x.nguon} — hồ sơ không chứa tiền lệ`); continue; }
      const chu = L.chuCau(x.nguon);
      if (chu === null) { ra[4].loi.push(`${idRec}: nguon ${x.nguon} không có trong kho luật gốc`); continue; }
      if (!chuanSo(chu).includes(chuanSo(x.trich))) {
        ra[4].loi.push(`${idRec}: trich không nguyên văn câu ${x.nguon} — "${ngan(x.trich)}"`);
      }
      if (x.loai === 'DIEU_KIEN') {
        const chu0 = G.chuCuaCau(x.nguon);
        const tren = new Set(G.trenCua(x.nut, L.cay));
        const anhEm = new Set(G.anhEmCua(x.nut, L.cay));
        const vao = (L.canhTheoTu.get(x.nguon) || []).some((e) => e.den === x.nut && loaiCanhVao(e));
        const laGir = G.capCuaNut(x.nut) === 'GIR';
        const nutCau = L.cau.get(x.nguon).nut;
        const cungDongSet = laGir ? null : new Set(cacNutCungDong(x.nut, L, bieuMeta, cungDongNguoc));
        const dungDuong = laGir
          ? (nutCau === x.nut || nutCau.startsWith(`${x.nut}:`))
          : vao || chu0 === G.CHUNG || chu0 === x.nut || tren.has(chu0) || anhEm.has(chu0) || cungDongSet.has(chu0);
        if (!dungDuong) ra[4].loi.push(`${idRec}: nguon ${x.nguon} thuộc ${chu0 || nutCau}, không nằm trên đường đi của ${x.nut}`);
        if (x.mo === 'DINH_NGHIA_LUAT' || x.mo === 'MO_TA_HUONG_DAN') {
          const mnIds = Array.isArray(x.moNguon) ? x.moNguon : (x.moNguon ? [x.moNguon] : []);
          for (const mnId of mnIds) {
            if (/^tb:/.test(mnId)) ra[4].loi.push(`${idRec}: moNguon không được trích tiền lệ ${mnId}`);
            else if (L.chuCau(mnId) === null) ra[4].loi.push(`${idRec}: moNguon ${mnId} không có trong kho luật gốc`);
          }
        }
        kiemTapDuNguonTrenBanGhi(x, idRec, L, { laGir, tren, cungDongSet, ngan }, ra[4].loi);
      } else if (x.loai === 'GIAI_CHONG') {
        const conCha = new Set(G.conCua(x.nut, L.cay));
        if (!conCha.has(x.cap[0]) || !conCha.has(x.cap[1])) {
          ra[4].loi.push(`${idRec}: GIAI_CHONG cap [${x.cap.join(', ')}] không phải anh em con trực tiếp của ${x.nut}`);
        }
        for (const d of x.cap) if (!coThat(d)) ra[4].loi.push(`${idRec}: nút ${d} không có trong kho luật`);
      } else if (x.loai === 'CANH_TRANH') {
        if (/^wco:/.test(x.nguon || '')) {
          ra[4].loi.push(`${idRec}: CANH_TRANH không được trích wco: (${x.nguon})`);
        }
        for (const d of x.nhomCanhTranh || []) {
          if (!coThat(d)) ra[4].loi.push(`${idRec}: nhomCanhTranh "${d}" không có trong kho luật`);
        }
        for (const p of x.phepThu || []) {
          const pNguon = typeof p === 'string' ? p : p?.nguon;
          if (/^(?:tb|wco):/.test(pNguon || '')) {
            ra[4].loi.push(`${idRec}: phepThu không trích tiền lệ hoặc WCO ${pNguon}`);
            continue;
          }
          if (typeof p === 'object' && p?.nhom !== undefined && !coThat(p.nhom)) {
            ra[4].loi.push(`${idRec}: phepThu nhom "${p.nhom}" không có trong kho luật`);
          }
          const pChu = L.chuCau(pNguon);
          if (pChu === null) ra[4].loi.push(`${idRec}: phepThu "${pNguon}" không có trong kho luật`);
          else if (typeof p === 'object' && !chuanSo(pChu).includes(chuanSo(p.trich || ''))) {
            ra[4].loi.push(`${idRec}: phepThu "${pNguon}" trích không nguyên văn`);
          }
        }
        for (const m of x.khongCanhTranh || []) {
          if (!m || typeof m !== 'object') continue;
          if (!coThat(m.nhom)) {
            ra[4].loi.push(`${idRec}: khongCanhTranh "${m.nhom}" không có trong kho luật`);
          }
          if (/^(?:tb|wco):/.test(m.nguon || '')) {
            ra[4].loi.push(`${idRec}: khongCanhTranh không trích tiền lệ hoặc WCO ${m.nguon}`);
            continue;
          }
          const mChu = L.chuCau(m.nguon);
          if (mChu === null) {
            ra[4].loi.push(`${idRec}: khongCanhTranh "${m.nguon}" không có trong kho luật`);
          } else if (typeof m.trich !== 'string' || !m.trich.trim() || !chuanSo(mChu).includes(chuanSo(m.trich))) {
            ra[4].loi.push(`${idRec}: khongCanhTranh "${m.nguon}" trích không nguyên văn`);
          }
        }
      }
    }
  }
  if (cong.includes(5)) {
    for (const x of R) {
      const chu = /^tb:/.test(x.cau) ? null : L.chuCau(x.cau);
      if (chu === null) continue; // id câu hỏng đã đỏ ở cổng 4
      ra[5].soKiem += 1;
      if (vanTay(chu) !== x.van) ra[5].loi.push(`${x.id}: vân tay lệch câu ${x.cau} (luật đổi chữ) — dựng lại: node scripts/ho-so-ma/cong.mjs --dinh-cau '${x.cau}' rồi tách lại vấn đề của ${x.nut}`);
    }
    for (const x of R_MOI) {
      const idRec = x.id || `${x.loai}(${x.nut})`;
      const chu = /^(?:tb|wco):/.test(x.nguon || '') ? null : L.chuCau(x.nguon);
      if (chu !== null) {
        ra[5].soKiem += 1;
        if (!x.vanTay || vanTay(chu) !== x.vanTay) {
          ra[5].loi.push(`${idRec}: vân tay ${x.vanTay ? 'lệch' : 'thiếu cho'} câu ${x.nguon} (luật đổi chữ) — dựng lại: node scripts/ho-so-ma/cong.mjs --dinh-cau '${x.nguon}' rồi cập nhật ${x.nut}`);
        }
      }
      if (x.loai === 'CANH_TRANH') {
        for (const p of x.phepThu || []) {
          if (!p || typeof p !== 'object' || p.vanTay === undefined) continue;
          const pChu = /^(?:tb|wco):/.test(p.nguon || '') ? null : L.chuCau(p.nguon);
          if (pChu === null) continue;
          ra[5].soKiem += 1;
          if (vanTay(pChu) !== p.vanTay) {
            ra[5].loi.push(`${idRec}: phepThu vanTay lệch câu ${p.nguon} (luật đổi chữ)`);
          }
        }
        for (const m of x.khongCanhTranh || []) {
          if (!m || typeof m !== 'object' || m.vanTay === undefined) continue;
          const mChu = /^(?:tb|wco):/.test(m.nguon || '') ? null : L.chuCau(m.nguon);
          if (mChu === null) continue;
          ra[5].soKiem += 1;
          if (vanTay(mChu) !== m.vanTay) {
            ra[5].loi.push(`${idRec}: khongCanhTranh vanTay lệch câu ${m.nguon} (luật đổi chữ)`);
          }
        }
      }
      if (x.loai === 'DIEU_KIEN' && x.moNguonVanTay !== undefined) {
        const capMn = typeof x.moNguonVanTay === 'string'
          ? (typeof x.moNguon === 'string' ? [[x.moNguon, x.moNguonVanTay]] : [])
          : (x.moNguonVanTay && typeof x.moNguonVanTay === 'object' ? Object.entries(x.moNguonVanTay) : []);
        for (const [mnId, vt] of capMn) {
          const mnChu = /^tb:/.test(mnId || '') ? null : L.chuCau(mnId);
          if (mnChu === null) continue;
          ra[5].soKiem += 1;
          if (vanTay(mnChu) !== vt) {
            ra[5].loi.push(`${idRec}: moNguonVanTay lệch câu ${mnId} (luật đổi chữ)`);
          }
        }
      }
      if (x.loai === 'DIEU_KIEN' && x.tapDuNguonVanTay !== undefined) {
        const capTdVt = typeof x.tapDuNguonVanTay === 'string'
          ? (typeof x.tapDuNguon === 'string' ? [[x.tapDuNguon, x.tapDuNguonVanTay]] : [])
          : (x.tapDuNguonVanTay && typeof x.tapDuNguonVanTay === 'object' ? Object.entries(x.tapDuNguonVanTay) : []);
        for (const [tdId, vt] of capTdVt) {
          const tdChu = /^(?:tb|wco):/.test(tdId || '') ? null : L.chuCau(tdId);
          if (tdChu === null) continue;
          ra[5].soKiem += 1;
          if (vanTay(tdChu) !== vt) {
            ra[5].loi.push(`${idRec}: tapDuNguonVanTay lệch câu ${tdId} (luật đổi chữ)`);
          }
        }
      }
    }
    const R_BANG_5 = (kho.bangAnhEm || []).filter((b) => !b._hong && (!pv.length || (chiTrong ? NTrong.has(b.cha) : N.has(b.cha))));
    for (const b of R_BANG_5) {
      if (!b.vanTayCau || typeof b.vanTayCau !== 'object') continue;
      for (const [cid, vt] of Object.entries(b.vanTayCau)) {
        const bChu = /^tb:/.test(cid || '') ? null : L.chuCau(cid);
        if (bChu === null) continue;
        ra[5].soKiem += 1;
        if (vanTay(bChu) !== vt) {
          ra[5].loi.push(`bang-anh-em(${b.cha}): vanTayCau lệch câu ${cid} (luật đổi chữ)`);
        }
      }
    }
  }

  // ---------- Cổng 6..12 (M-81, ADR-0007 mục 4) ----------
  if (chayMoi) {

    const nhomMoi = [];
    const daNhomMoi = new Set();
    if (pv.length) {
      for (const id of NTrong) {
        const con = G.conCua(id, L.cay).filter((x) => trongCap(x, cap));
        if (con.length >= 2 && !daNhomMoi.has(id)) { daNhomMoi.add(id); nhomMoi.push({ cha: id, con }); }
      }
    }

    // Cổng 6 TÁCH
    if (cong.includes(6)) {
      for (const x of R_DK) {
        ra[6].soKiem += 1;
        if (/^tb:/.test(x.nguon)) { ra[6].loi.push(`${x.id}: trích câu tiền lệ ${x.nguon} — điều kiện không trích tiền lệ`); continue; }
        const chu = L.chuCau(x.nguon);
        if (chu === null) { ra[6].loi.push(`${x.id}: nguon ${x.nguon} không có trong kho luật gốc`); continue; }
        const chu0 = G.chuCuaCau(x.nguon);
        const tren = new Set(G.trenCua(x.nut, L.cay));
        const anhEm = new Set(G.anhEmCua(x.nut, L.cay));
        const vao = (L.canhTheoTu.get(x.nguon) || []).some((e) => e.den === x.nut && loaiCanhVao(e));
        const laGir = G.capCuaNut(x.nut) === 'GIR';
        const nutCau = L.cau.get(x.nguon).nut;
        const cungDongSet = laGir ? null : new Set(cacNutCungDong(x.nut, L, bieuMeta, cungDongNguoc));
        const dungDuong = laGir
          ? (nutCau === x.nut || nutCau.startsWith(`${x.nut}:`))
          : vao || chu0 === G.CHUNG || chu0 === x.nut || tren.has(chu0) || anhEm.has(chu0) || cungDongSet.has(chu0);
        if (!dungDuong) ra[6].loi.push(`${x.id}: nguon ${x.nguon} thuộc ${chu0 || nutCau}, không nằm trên đường đi của ${x.nut}`);
        if (!chuanSo(chu).includes(chuanSo(x.trich))) ra[6].loi.push(`${x.id}: trich không nguyên văn câu ${x.nguon} — "${ngan(x.trich)}"`);
        if (vanTay(chu) !== x.vanTay) ra[6].loi.push(`${x.id}: vanTay lệch câu ${x.nguon}`);
        if (!Number.isInteger(x.ve) || x.ve < 0) ra[6].loi.push(`${x.id}: ve phải là số nguyên >= 0`);
        if (x.kieu === 'GIA_TRI' && (typeof x.truc !== 'string' || !x.truc.trim() || /\n/.test(x.truc))) {
          ra[6].loi.push(`${x.id}: kieu GIA_TRI phải có truc hợp lệ`);
        }
        if (x.kieu === 'SO') {
          const ngRec = nguongById.get(x.nguong);
          if (!ngRec) ra[6].loi.push(`${x.id}: kieu SO trỏ nguong "${x.nguong}" không có trong hồ sơ NGUONG`);
          else if (!ngRec.nguong?.daiLuong || typeof ngRec.nguong.daiLuong !== 'string' || !ngRec.nguong.daiLuong.trim()) {
            ra[6].loi.push(`${x.id}: nguong "${x.nguong}" thiếu daiLuong`);
          }
        }
        if (x.mo === 'DINH_NGHIA_LUAT' || x.mo === 'MO_TA_HUONG_DAN') {
          const mnIds = Array.isArray(x.moNguon) ? x.moNguon : (x.moNguon ? [x.moNguon] : []);
          if (!mnIds.length) {
            ra[6].loi.push(`${x.id}: mo ${x.mo} thiếu moNguon`);
          } else {
            for (const mnId of mnIds) {
              if (/^tb:/.test(mnId)) ra[6].loi.push(`${x.id}: moNguon không được trích tiền lệ ${mnId}`);
              else if (L.chuCau(mnId) === null) ra[6].loi.push(`${x.id}: moNguon ${mnId} không có trong kho luật gốc`);
            }
          }
        }
        kiemTapDuNguonTrenBanGhi(x, x.id, L, { laGir, tren, cungDongSet, ngan }, ra[6].loi);
      }
      if (pv.length) {
        for (const id of NTrong) {
          if (!/^bieu:\d{4,8}/.test(id)) continue;
          if (laLoaiKhacThuan(id, L, bieuMeta)) continue;
          const meta = bieuMeta.get(id);
          const dksRieng = dkTheoNut.get(id) || [];
          const cungDongIds = cacNutCungDong(id, L, bieuMeta, cungDongNguoc);
          const cungDongSet = new Set(cungDongIds);
          const dksHieuLuc = dksRieng.length > 0
            ? dksRieng
            : cungDongIds.flatMap((nid) => (nid === id ? [] : (dkTheoNut.get(nid) || [])));
          ra[6].soKiem += 1;
          if (dksHieuLuc.length === 0) {
            ra[6].loi.push(`${id}: nút có tên chưa có bản ghi DIEU_KIEN nào`);
            continue;
          }
          const ten = L.cay.theoId.get(id)?.ten || meta?.nguyenVan || '';
          const soDoan = demDoanChamPhay(ten);
          const veDuong = new Set(dksHieuLuc.filter((d) => d.ve >= 1).map((d) => d.ve));
          const coVeDuong = veDuong.size > 0;
          const dks0 = dksHieuLuc.filter((d) => d.ve === 0);
          const soVeHieuLuc = coVeDuong ? veDuong.size : (dks0.length > 0 ? 1 : 0);
          if (soDoan > 1 && soVeHieuLuc < soDoan) {
            ra[6].loi.push(`${id}: tên có ${soDoan} đoạn tách bởi ";" nhưng mới có ${soVeHieuLuc} vế DIEU_KIEN`);
          }
          for (const d of dks0) {
            if (d.phu) continue;
            const hopLeVe0 = !coVeDuong || soDoan <= 1 || veDuong.size >= 2 || !cungDongSet.has(G.chuCuaCau(d.nguon));
            if (!hopLeVe0) {
              ra[6].loi.push(`${d.id}: ve: 0 chỉ đi với phu: true hoặc điều kiện chung của nút`);
            }
          }
        }
        // Kiểm tính nhất quán của tapDu theo từng gia đình anh em nhomMoi (ADR-0009 điểm 5)
        for (const g of nhomMoi) {
          const duongCha = G.duongDiNut(g.cha, L.cay) || [{ nut: g.cha }];
          const dksCha = duongCha.flatMap((b) => dkTheoNut.get(b.nut) || []);
          const dksCon = g.con.flatMap((cid) => dkTheoNut.get(cid) || []);
          const trucSet = new Set();
          for (const d of [...dksCha, ...dksCon]) {
            if (d.kieu === 'GIA_TRI' && typeof d.truc === 'string' && d.truc.trim()) {
              trucSet.add(chuanSo(d.truc).toLowerCase());
            }
          }
          for (const t of trucSet) {
            const chaTruc = dksCha.filter((d) => d.kieu === 'GIA_TRI' && typeof d.truc === 'string' && chuanSo(d.truc).toLowerCase() === t);
            const conTruc = dksCon.filter((d) => d.kieu === 'GIA_TRI' && typeof d.truc === 'string' && chuanSo(d.truc).toLowerCase() === t);
            const tatCaCoTapDu = [...chaTruc, ...conTruc].filter((d) => Array.isArray(d.tapDu));
            if (!tatCaCoTapDu.length) continue;
            ra[6].soKiem += 1;
            if ([...chaTruc, ...conTruc].some((d) => d.daTri === true)) {
              ra[6].loi.push(`${g.cha}: trục "${t}" có bản ghi daTri:true nên không được khai tapDu`);
              continue;
            }
            const khoaTapDuSet = new Set(
              tatCaCoTapDu.map((d) => [...new Set(d.tapDu.map((v) => chuanSo(v).toLowerCase()).filter(Boolean))].sort().join('\u0001')),
            );
            if (khoaTapDuSet.size > 1) {
              ra[6].loi.push(`${g.cha}: trục "${t}" khai tapDu không thống nhất giữa các bản ghi`);
              continue;
            }
            const tapDuChuan = new Set(tatCaCoTapDu[0].tapDu.map((v) => chuanSo(v).toLowerCase()).filter(Boolean));
            for (const d of [...chaTruc, ...conTruc]) {
              const ngoai = (d.tap || []).filter((v) => !tapDuChuan.has(chuanSo(v).toLowerCase()));
              if (ngoai.length) {
                ra[6].loi.push(`${g.cha}: ${d.id} trên trục "${t}" có giá trị tap ngoài tapDu (${ngoai.join(', ')})`);
              }
            }
            const chaCoTapDu = chaTruc.some((d) => Array.isArray(d.tapDu));
            if (!chaCoTapDu && conTruc.some((d) => Array.isArray(d.tapDu)) && conTruc.some((d) => !Array.isArray(d.tapDu))) {
              ra[6].loi.push(`${g.cha}: trục "${t}" khai tapDu ở anh em thì phải khai trên mọi anh em cùng trục (hoặc khai một lần ở nút cha)`);
            }
            const conSet = new Set(g.con);
            const cayConSet = moRongCayCon(conSet, L);
            const nutConTruc = [...new Set(conTruc.map((d) => d.nut))];
            const laChaConCapDuoi = !chaCoTapDu
              && nutConTruc.length === 1
              && G.conCua(nutConTruc[0], L.cay).some((cid) => (
                (dkTheoNut.get(cid) || []).some((cd) => cd.kieu === 'GIA_TRI' && typeof cd.truc === 'string' && chuanSo(cd.truc).toLowerCase() === t)
              ));
            if (!laChaConCapDuoi) {
              for (const d of tatCaCoTapDu) {
                const dsTdNguon = Array.isArray(d.tapDuNguon) ? d.tapDuNguon : (typeof d.tapDuNguon === 'string' ? [d.tapDuNguon] : []);
                for (const tdNguon of dsTdNguon) {
                  if (laCauCapDuoiCon(tdNguon, conSet, { L, cayConSet, cacNutCungTruc: nutConTruc })) {
                    ra[6].loi.push(`${g.cha}: tapDuNguon "${tdNguon}" trích dòng biểu của chính anh em con hoặc nguồn cấp dưới (phải trích câu luật/chú giải hoặc lời văn nút cha)`);
                  }
                }
              }
              if (tatCaCoTapDu.some((d) => d.tapDuNguon !== undefined)) {
                const khoaNguonSet = new Set(tatCaCoTapDu.map(khoaTapDuNguon));
                if (khoaNguonSet.size > 1) {
                  ra[6].loi.push(`${g.cha}: trục "${t}" khai tapDuNguon không thống nhất giữa các bản ghi`);
                }
              }
            }
          }
        }
      }
    }

    // Cổng 7 PHỦ
    if (cong.includes(7)) {
      for (const g of nhomMoi) {
        ra[7].soKiem += 1;
        if (g.con.some((id) => laLoaiKhacThuan(id, L, bieuMeta))) continue;
        const duongCha = G.duongDiNut(g.cha, L.cay) || [];
        const dksDuongCha = duongCha.flatMap((b) => dkTheoNut.get(b.nut) || []);
        const tapDuTheoTruc = layTapDuHopLeTheoTruc(g.con, dkTheoNut, dkTheoNut.get(g.cha) || [], dksDuongCha, { L });
        const truTheoNut = taoBanDoTruAnhEm(g.cha, g.con, L, bieuMeta, dkTheoNut, giaiChongTheoCha.get(g.cha) || [], nguongById, { tapDuTheoTruc });
        if (!chungMinhPhuKin(g.con, dkTheoNut, nguongById, dkTheoNut.get(g.cha) || [], dksDuongCha, { chaId: g.cha, L, bieuMeta, truTheoNut })) {
          ra[7].loi.push(`${g.cha}: HO_PHU — nhóm không có "Loại khác" nhưng chưa chứng minh phủ kín phạm vi cha`);
        }
      }
    }

    // Cổng 8 CHỒNG
    if (cong.includes(8)) {
      const giaiChongHopLe = new Set();
      for (const g of R_GC) {
        ra[8].soKiem += 1;
        const conCha = new Set(G.conCua(g.nut, L.cay));
        if (!conCha.has(g.cap[0]) || !conCha.has(g.cap[1])) {
          ra[8].loi.push(`${g.id || g.nut}: GIAI_CHONG cap [${g.cap.join(', ')}] không phải anh em con trực tiếp của ${g.nut}`);
          continue;
        }
        if (/^tb:/.test(g.nguon)) { ra[8].loi.push(`${g.id || g.nut}: GIAI_CHONG không trích tiền lệ ${g.nguon}`); continue; }
        const chu = L.chuCau(g.nguon);
        if (chu === null || !chuanSo(chu).includes(chuanSo(g.trich))) {
          ra[8].loi.push(`${g.id || g.nut}: GIAI_CHONG trich không nguyên văn câu ${g.nguon}`);
          continue;
        }
        if (g.vanTay !== undefined && vanTay(chu) !== g.vanTay) {
          ra[8].loi.push(`${g.id || g.nut}: GIAI_CHONG vanTay lệch câu ${g.nguon}`);
          continue;
        }
        giaiChongHopLe.add(`${g.nut}|${[...g.cap].sort().join('|')}`);
      }
      const vungChongSet = new Set(
        (vungChong || [])
          .filter((v) => Array.isArray(v?.cap) && v.cap.length === 2)
          .map((v) => `${v.nut || '*'}|${[...v.cap].sort().join('|')}`),
      );
      const canhBaoCungTruc = [];
      const canhBaoKhacTruc = [];
      for (const g of nhomMoi) {
        const coTen = g.con.filter((id) => !laLoaiKhacThuan(id, L, bieuMeta));
        const gcHopLeCha = (giaiChongTheoCha.get(g.cha) || []).filter(
          (x) => giaiChongHopLe.has(`${g.cha}|${[...x.cap].sort().join('|')}`),
        );
        const duongCha = G.duongDiNut(g.cha, L.cay) || [];
        const dksDuongCha = duongCha.flatMap((b) => dkTheoNut.get(b.nut) || []);
        const tapDuTheoTruc = layTapDuHopLeTheoTruc(g.con, dkTheoNut, dkTheoNut.get(g.cha) || [], dksDuongCha, { L });
        const truTheoNut = taoBanDoTruAnhEm(g.cha, g.con, L, bieuMeta, dkTheoNut, gcHopLeCha, nguongById, { tapDuTheoTruc });
        for (let i = 0; i < coTen.length; i += 1) {
          for (let j = i + 1; j < coTen.length; j += 1) {
            const A = coTen[i]; const B = coTen[j];
            const pairKey = [A, B].sort().join('|');
            ra[8].soKiem += 1;
            if (giaiChongHopLe.has(`${g.cha}|${pairKey}`)) {
              ra[8].dem.giaiChong += 1;
              continue;
            }
            if (vungChongSet.has(`${g.cha}|${pairKey}`) || vungChongSet.has(`*|${pairKey}`)) {
              ra[8].dem.vungChong += 1;
              ra[8].loi.push(`${g.cha}: VUNG_CHONG giữa ${A} và ${B} chưa có GIAI_CHONG trích luật`);
              continue;
            }
            if ((truTheoNut.get(A) || []).includes(B) || (truTheoNut.get(B) || []).includes(A)) {
              ra[8].dem.roiNhau += 1;
              continue;
            }
            const dksA = dkTheoNut.get(A) || [];
            const dksB = dkTheoNut.get(B) || [];
            if (haiNutRoiNhau(dksA, dksB, nguongById, { tapDuTheoTruc })) {
              ra[8].dem.roiNhau += 1;
              continue;
            }
            // Kiểm thêm chồng số chứng minh được bằng máy (ADR-0009 mục 3: đồng bộ cờ VUNG_CHONG với bang-anh-em.mjs)
            if (laChongSoTrungTruc(dksA, dksB, nguongById)) {
              ra[8].dem.vungChong += 1;
              ra[8].loi.push(`${g.cha}: VUNG_CHONG giữa ${A} và ${B} chưa có GIAI_CHONG trích luật`);
            } else {
              ra[8].dem.chuaChungMinhTach += 1;
              const layTapTruc = (dks) => new Set(
                dks
                  .filter((d) => d.kieu === 'GIA_TRI' && typeof d.truc === 'string' && d.truc.trim())
                  .map((d) => chuanSo(d.truc).toLowerCase()),
              );
              const trucsA = layTapTruc(dksA);
              const trucsB = layTapTruc(dksB);
              const dsTrucChung = [...trucsA].filter((t) => trucsB.has(t));
              if (dsTrucChung.length > 0) {
                ra[8].dem.cungTruc += 1;
                const dksChung = [...dksA, ...dksB].filter(
                  (d) => d.kieu === 'GIA_TRI' && typeof d.truc === 'string' && dsTrucChung.includes(chuanSo(d.truc).toLowerCase()),
                );
                const coDaTri = dksChung.some((d) => d.daTri === true);
                const thieuTapDu = !coDaTri && dsTrucChung.some((t) => !tapDuTheoTruc.has(t));
                const lyDoPhu = coDaTri ? ' — daTri:true' : (thieuTapDu ? ' — thiếu tapDu' : '');
                canhBaoCungTruc.push(`${g.cha}: [cùng trục: ${dsTrucChung.join(', ')}${lyDoPhu}] CHUA_CHUNG_MINH_TACH giữa ${A} và ${B} (cần phiếu hoặc GIAI_CHONG nếu gặp hàng chồng)`);
              } else {
                canhBaoKhacTruc.push(`${g.cha}: [khác trục] CHUA_CHUNG_MINH_TACH giữa ${A} và ${B} (cần phiếu hoặc GIAI_CHONG nếu gặp hàng chồng)`);
              }
            }
          }
        }
      }
      ra[8].canhBao.push(...canhBaoCungTruc, ...canhBaoKhacTruc);
    }

    // Dựng bảng anh em trong bộ nhớ (kết hợp bảng có sẵn trong kho) phục vụ Cổng 9 và 10
    const bangTheoCha = new Map();
    if (cong.includes(9) || cong.includes(10)) {
      if (dungBangTrongKho) {
        for (const b of kho.bangAnhEm || []) {
          if (!b._hong && (!pv.length || NTrong.has(b.cha))) bangTheoCha.set(b.cha, b);
        }
      }
      const duLieuBang = { bieuMeta, dkTheoNut, giaiChongTheoCha, canhTranhTheoNut, nguongById, viDu, vungChong };
      for (const g of nhomMoi) {
        if (!bangTheoCha.has(g.cha)) bangTheoCha.set(g.cha, taoBangChoCha(g.cha, L, duLieuBang));
      }
    }

    // Cổng 9 HỎI
    if (cong.includes(9)) {
      if (pv.length) {
        for (const id of NTrong) {
          if (!G.duongDiNut(id, L.cay)) ra[9].loi.push(`${id}: thiếu hoặc đứt chuỗi cha`);
        }
      }
      for (const b of bangTheoCha.values()) {
        for (const ae of b.anhEm) {
          if (!ae.laLoaiKhac) continue;
          ra[9].soKiem += 1;
          if (!ae.cauHoiToiThieu.length) {
            ra[9].loi.push(`${ae.nut} (cha ${b.cha}): không sinh được cauHoiToiThieu cho "Loại khác"`);
          } else {
            for (const c of ae.cauHoiToiThieu) {
              if (!c?.cauHoi || typeof c.cauHoi !== 'string' || !c.cauHoi.trim() || /\n/.test(c.cauHoi)) {
                ra[9].loi.push(`${ae.nut}: cauHoiToiThieu chứa câu hỏi rỗng hoặc nhiều dòng (${c?.id || '?'})`);
              }
            }
          }
        }
      }
    }

    // Cổng 10 DÒ
    if (cong.includes(10)) {
      const cacBangCoLK = [...bangTheoCha.values()].filter((b) => b.anhEm.some((ae) => ae.laLoaiKhac));
      const bangDuocPhu = new Set();
      for (const vd of viDu || []) {
        ra[10].soKiem += 1;
        const gan = vd.ganDieuKien || vd.gan || {};
        const duongDich = (vd.dich && vd.dich !== 'NGOAI_PHAM_VI') ? (G.duongDiNut(vd.dich, L.cay) || []).map((x) => x.nut) : [];
        const cacChaTrenDuong = duongDich.filter((id) => bangTheoCha.has(id));
        let startCha = vd.cha || null;
        if (!startCha && cacChaTrenDuong.length) {
          startCha = cacChaTrenDuong.find((chaId) => {
            const b = bangTheoCha.get(chaId);
            if (!b) return false;
            return b.anhEm.some((ae) => (ae.dieuKienIds || []).some((id) => Object.hasOwn(gan, id)));
          }) || cacChaTrenDuong.at(-1);
        }
        if (!startCha) {
          const keys = new Set([...Object.keys(gan), ...(vd.duKien || [])]);
          for (const b of bangTheoCha.values()) {
            if (b.anhEm.some((ae) => ae.dieuKienIds.some((id) => keys.has(id)))) { startCha = b.cha; break; }
          }
          if (!startCha) {
            for (const b of bangTheoCha.values()) {
              if ((b.chuoiCha || []).some((c) => (c.dieuKienIds || []).some((id) => keys.has(id)))) { startCha = b.cha; break; }
            }
          }
        }
        if (!startCha || !bangTheoCha.has(startCha)) {
          ra[10].loi.push(`ví dụ "${ngan(vd.trich || vd.dich || '')}": không tìm thấy bảng anh em cho đích ${vd.dich || vd.cha}`);
          continue;
        }
        bangDuocPhu.add(startCha);
        const kq = doBangAnhEm(startCha, gan, bangTheoCha, { L, nguongById, hoSo });
        for (const buoc of kq.duong || []) {
          const chaBuoc = L.cay.theoId.get(buoc)?.cha;
          if (chaBuoc && bangTheoCha.has(chaBuoc)) bangDuocPhu.add(chaBuoc);
        }
        if (vd.ngoaiPhamVi || vd.dich === 'NGOAI_PHAM_VI') {
          if (kq.trangThai !== 'NGOAI_PHAM_VI') {
            ra[10].loi.push(`ví dụ ngoài phạm vi "${ngan(vd.trich || '')}": kỳ vọng NGOAI_PHAM_VI, bảng trả ${kq.trangThai} (${kq.dich || ''})`);
          }
        } else if (vd.duKien?.length && !vd.dich) {
          const thieuSet = new Set([...(kq.thieuIds || []), ...((kq.cauHoiToiThieu || []).map((c) => c.id))]);
          const khopThieu = kq.trangThai === 'RE_NHANH' && vd.duKien.some((d) => thieuSet.has(d) || (kq.cauHoiToiThieu || []).some((c) => chuanSo(c.cauHoi).toLowerCase().includes(chuanSo(d).toLowerCase())));
          if (!khopThieu) ra[10].loi.push(`ví dụ thiếu dữ kiện "${ngan(vd.trich || '')}": kỳ vọng rẽ nhánh hỏi [${vd.duKien.join(', ')}], nhận ${kq.trangThai}`);
        } else if (vd.dich) {
          const soleChild = kq.dich && G.conCua(kq.dich, L.cay).length === 1 && G.conCua(kq.dich, L.cay)[0] === vd.dich;
          const dungDich = (kq.trangThai === 'DICH' || kq.trangThai === 'DUNG_NUT') && (kq.dich === vd.dich || soleChild);
          if (!dungDich) {
            ra[10].loi.push(`ví dụ "${ngan(vd.trich || '')}" → kỳ vọng ${vd.dich}, bảng trả ${kq.trangThai} (${kq.dich || (kq.ungVien || kq.thieuIds || []).join(', ')})`);
          }
        }
      }
      for (const b of cacBangCoLK) {
        if (!bangDuocPhu.has(b.cha)) {
          ra[10].thieuViDu += 1;
          ra[10].canhBao.push(`${b.cha}: THIEU_VI_DU — có "Loại khác" nhưng chưa có ca thử ví dụ chú giải/SEN`);
        }
      }
    }

    // Cổng 11 MỞ
    if (cong.includes(11)) {
      for (const x of R_DK) {
        ra[11].soKiem += 1;
        ra[11].dem.tong += 1;
        if (!MO_DIEU_KIEN.includes(x.mo)) {
          ra[11].loi.push(`${x.id}: mo không hợp lệ "${x.mo}"`);
          continue;
        }
        if (x.mo === 'DINH_NGHIA_LUAT') ra[11].dem.dinhNghiaLuat += 1;
        else if (x.mo === 'NGUONG') ra[11].dem.nguong += 1;
        else if (x.mo === 'MO_TA_HUONG_DAN') ra[11].dem.moTaHuongDan += 1;
        if (x.mo === 'DINH_NGHIA_LUAT' || x.mo === 'MO_TA_HUONG_DAN') {
          const mnIds = Array.isArray(x.moNguon) ? x.moNguon : (x.moNguon ? [x.moNguon] : []);
          if (!mnIds.length) {
            ra[11].loi.push(`${x.id}: mo ${x.mo} thiếu moNguon`);
          } else {
            for (const mnId of mnIds) {
              if (/^tb:/.test(mnId)) ra[11].loi.push(`${x.id}: moNguon không được trích tiền lệ ${mnId}`);
              else if (L.chuCau(mnId) === null) ra[11].loi.push(`${x.id}: moNguon ${mnId} không có trong kho luật gốc`);
            }
          }
        }
        if (x.mo === 'NGHIA_THUONG') {
          ra[11].dem.nghiaThuong += 1;
          if (!x.cauHoi || typeof x.cauHoi !== 'string' || !x.cauHoi.trim() || /\n/.test(x.cauHoi)) {
            ra[11].loi.push(`${x.id}: NGHIA_THUONG phải có cauHoi một dòng để dừng hỏi`);
          } else {
            ra[11].canhBao.push(`${x.id}: NGHIA_THUONG ("${ngan(x.trich)}") — có câu hỏi: "${ngan(x.cauHoi)}"`);
          }
        }
      }
    }

    // Cổng 12 BÙ
    if (cong.includes(12)) {
      const RE_CHUA_CHI_TIET = /chưa\s+(?:được\s+)?chi\s+tiết.*(?:ở\s+)?nơi\s+khác/iu;
      if (pv.length) {
        for (const id of NTrong) {
          const ten = L.cay.theoId.get(id)?.ten || bieuMeta.get(id)?.nguyenVan || '';
          if (!RE_CHUA_CHI_TIET.test(ten)) continue;
          ra[12].soKiem += 1;
          const cungDongIds = cacNutCungDong(id, L, bieuMeta, cungDongNguoc);
          const coCanhTranhBu = cungDongIds.some((nid) => (
            (canhTranhTheoNut.get(nid) || []).some(
              (ct) => Array.isArray(ct.nhomCanhTranh) && ct.nhomCanhTranh.length > 0 && Array.isArray(ct.phepThu) && ct.phepThu.length > 0,
            )
          ));
          if (!coCanhTranhBu) {
            ra[12].loi.push(`${id}: nhóm "chưa được chi tiết hoặc ghi ở nơi khác" chưa có bản ghi CANH_TRANH`);
          }
        }
      }
      for (const ct of R_CT) {
        ra[12].soKiem += 1;
        if (/^(?:tb|wco):/.test(ct.nguon || '')) { ra[12].loi.push(`${ct.id || ct.nut}: CANH_TRANH không trích tiền lệ hoặc WCO ${ct.nguon}`); continue; }
        const chu = L.chuCau(ct.nguon);
        if (chu === null || !chuanSo(chu).includes(chuanSo(ct.trich))) {
          ra[12].loi.push(`${ct.id || ct.nut}: CANH_TRANH trich không nguyên văn câu ${ct.nguon}`);
        } else if (ct.vanTay !== undefined && vanTay(chu) !== ct.vanTay) {
          ra[12].loi.push(`${ct.id || ct.nut}: CANH_TRANH vanTay lệch câu ${ct.nguon}`);
        }
        for (const d of ct.nhomCanhTranh || []) {
          if (!coThat(d)) ra[12].loi.push(`${ct.id || ct.nut}: nhomCanhTranh "${d}" không có trong kho luật`);
        }
        for (const p of ct.phepThu || []) {
          const pNguon = typeof p === 'string' ? p : p?.nguon;
          if (/^(?:tb|wco):/.test(pNguon || '')) {
            ra[12].loi.push(`${ct.id || ct.nut}: phepThu không trích tiền lệ hoặc WCO ${pNguon}`);
            continue;
          }
          if (typeof p === 'object' && p?.nhom !== undefined && !coThat(p.nhom)) {
            ra[12].loi.push(`${ct.id || ct.nut}: phepThu nhom "${p.nhom}" không có trong kho luật`);
          }
          const pChu = L.chuCau(pNguon);
          if (pChu === null) ra[12].loi.push(`${ct.id || ct.nut}: phepThu "${pNguon}" không có trong kho luật`);
          else if (typeof p === 'object' && !chuanSo(pChu).includes(chuanSo(p.trich || ''))) {
            ra[12].loi.push(`${ct.id || ct.nut}: phepThu "${pNguon}" trích không nguyên văn`);
          } else if (typeof p === 'object' && p.vanTay !== undefined && vanTay(pChu) !== p.vanTay) {
            ra[12].loi.push(`${ct.id || ct.nut}: phepThu "${pNguon}" vanTay lệch câu`);
          }
        }
        for (const m of ct.khongCanhTranh || []) {
          if (!m || typeof m !== 'object') continue;
          if (!coThat(m.nhom)) {
            ra[12].loi.push(`${ct.id || ct.nut}: khongCanhTranh "${m.nhom}" không có trong kho luật`);
          }
          if (/^(?:tb|wco):/.test(m.nguon || '')) {
            ra[12].loi.push(`${ct.id || ct.nut}: khongCanhTranh không trích tiền lệ hoặc WCO ${m.nguon}`);
            continue;
          }
          const mChu = L.chuCau(m.nguon);
          if (mChu === null) {
            ra[12].loi.push(`${ct.id || ct.nut}: khongCanhTranh "${m.nguon}" không có trong kho luật`);
          } else if (typeof m.trich !== 'string' || !m.trich.trim() || !chuanSo(mChu).includes(chuanSo(m.trich))) {
            ra[12].loi.push(`${ct.id || ct.nut}: khongCanhTranh "${m.nguon}" trích không nguyên văn`);
          } else if (m.vanTay !== undefined && vanTay(mChu) !== m.vanTay) {
            ra[12].loi.push(`${ct.id || ct.nut}: khongCanhTranh "${m.nguon}" vanTay lệch câu`);
          }
        }
      }
    }

    // Cổng 13 PHỦ CẠNH TRANH (ADR-0010 mục 3: chỉ kiểm cấu trúc và chuỗi con nguyên văn, 0 regex đoán nghĩa)
    if (cong.includes(13) && pv.length) {
      const nhom4Set = new Set();
      for (const id of NTrong) {
        const m4 = /^bieu:(\d{4})$/.exec(id);
        if (m4) nhom4Set.add(m4[1]);
      }
      if (!nhom4Set.size && (cap === null || cap >= BAC_CAP.NHOM)) {
        for (const p of pv) {
          const m4 = /^bieu:(\d{4})/.exec(p.goc);
          if (m4) nhom4Set.add(m4[1]);
        }
      }

      const chuanHoaDanhSachUngVien = (dsRaw, nhom4) => {
        let mang = [];
        if (Array.isArray(dsRaw)) {
          mang = dsRaw;
        } else if (dsRaw && typeof dsRaw === 'object') {
          if (Array.isArray(dsRaw.ungVien)) mang = dsRaw.ungVien;
          else if (Array.isArray(dsRaw.danhSach)) mang = dsRaw.danhSach;
          else if (Array.isArray(dsRaw.nhom)) mang = dsRaw.nhom;
          else if (Array.isArray(dsRaw.muc)) mang = dsRaw.muc;
        }
        const daCo = new Set();
        const kq = [];
        for (const muc of mang) {
          const raw = typeof muc === 'string'
            ? muc
            : (muc && typeof muc === 'object' ? (muc.nut || muc.nhom || muc.ma || muc.id || '') : '');
          const bonSo = String(raw).trim().replace(/^bieu:/i, '').replace(/[.\s]/g, '');
          if (!/^\d{4}$/.test(bonSo) || bonSo === nhom4) continue;
          const nutId = `bieu:${bonSo}`;
          if (daCo.has(nutId)) continue;
          daCo.add(nutId);
          kq.push(nutId);
        }
        return kq;
      };

      const layUngVienCanhTranh = (nhom4) => {
        if (canhTranhTimThayTheoNhom instanceof Map) {
          if (canhTranhTimThayTheoNhom.has(nhom4)) {
            return chuanHoaDanhSachUngVien(canhTranhTimThayTheoNhom.get(nhom4), nhom4);
          }
          if (canhTranhTimThayTheoNhom.has(`bieu:${nhom4}`)) {
            return chuanHoaDanhSachUngVien(canhTranhTimThayTheoNhom.get(`bieu:${nhom4}`), nhom4);
          }
        } else if (canhTranhTimThayTheoNhom && typeof canhTranhTimThayTheoNhom === 'object') {
          if (Object.hasOwn(canhTranhTimThayTheoNhom, nhom4)) {
            return chuanHoaDanhSachUngVien(canhTranhTimThayTheoNhom[nhom4], nhom4);
          }
          if (Object.hasOwn(canhTranhTimThayTheoNhom, `bieu:${nhom4}`)) {
            return chuanHoaDanhSachUngVien(canhTranhTimThayTheoNhom[`bieu:${nhom4}`], nhom4);
          }
        }
        const luatPath = L.thuMuc || luat;
        const dsRaw = typeof GoiNhomMod.timCanhTranhTimThay === 'function'
          ? GoiNhomMod.timCanhTranhTimThay(nhom4, { luat: luatPath, L, bieuMeta })
          : (typeof GoiNhomMod.dungGoiNhom === 'function'
            ? (GoiNhomMod.dungGoiNhom(nhom4, { luat: luatPath, hoSo, L, bieuMeta, kho }).canhTranhTimThay || [])
            : []);
        return chuanHoaDanhSachUngVien(dsRaw, nhom4);
      };

      const banThanCtHopLe = (ct) => {
        if (!ct || typeof ct !== 'object') return false;
        if (/^(?:tb|wco):/.test(ct.nguon || '')) return false;
        const chuCt = L.chuCau(ct.nguon);
        if (chuCt === null) return false;
        if (typeof ct.trich !== 'string' || !ct.trich.trim()) return false;
        if (!chuanSo(chuCt).includes(chuanSo(ct.trich))) return false;
        if (ct.vanTay !== undefined && vanTay(chuCt) !== ct.vanTay) return false;
        return true;
      };

      const phepThuNguyenVanHopLeCho = (ct, candNut) => {
        if (!banThanCtHopLe(ct)) return false;
        if (!Array.isArray(ct.phepThu) || ct.phepThu.length === 0) return false;
        let coObjTrichChoUngVien = false;
        for (const p of ct.phepThu) {
          if (typeof p === 'string') {
            if (/^(?:tb|wco):/.test(p) || L.chuCau(p) === null) return false;
          } else if (p && typeof p === 'object' && !Array.isArray(p)) {
            if (/^(?:tb|wco):/.test(p.nguon || '')) return false;
            const pChu = L.chuCau(p.nguon);
            if (pChu === null) return false;
            if (typeof p.trich !== 'string' || !p.trich.trim()) return false;
            if (!chuanSo(pChu).includes(chuanSo(p.trich))) return false;
            if (p.vanTay !== undefined && vanTay(pChu) !== p.vanTay) return false;
            if (p.nhom !== undefined && !coThat(p.nhom)) return false;
            if (p.nhom === undefined || p.nhom === candNut) coObjTrichChoUngVien = true;
          } else {
            return false;
          }
        }
        return coObjTrichChoUngVien;
      };

      const khongCanhTranhHopLeCho = (m, candNut) => {
        if (!m || typeof m !== 'object' || Array.isArray(m)) return false;
        if (m.nhom !== candNut || !coThat(m.nhom)) return false;
        if (/^(?:tb|wco):/.test(m.nguon || '')) return false;
        const chuKct = L.chuCau(m.nguon);
        if (chuKct === null) return false;
        if (typeof m.trich !== 'string' || !m.trich.trim()) return false;
        if (!chuanSo(chuKct).includes(chuanSo(m.trich))) return false;
        if (m.vanTay !== undefined && vanTay(chuKct) !== m.vanTay) return false;
        return true;
      };

      for (const nhom4 of [...nhom4Set].sort()) {
        const dsUngVien = layUngVienCanhTranh(nhom4);
        const cungDongIds = cacNutCungDong(`bieu:${nhom4}`, L, bieuMeta, cungDongNguoc);
        const cts = cungDongIds.flatMap((nid) => canhTranhTheoNut.get(nid) || []);

        const tapCtNhom = new Set(cts.flatMap((ct) => ct.nhomCanhTranh || []));
        const tapKctNhom = new Set(cts.flatMap((ct) => (ct.khongCanhTranh || []).map((m) => m?.nhom).filter(Boolean)));
        const mauThuanSet = new Set([...tapCtNhom].filter((d) => tapKctNhom.has(d)));
        for (const d of [...mauThuanSet].sort()) {
          ra[13].loi.push(`bieu:${nhom4}: ứng viên ${d} vừa nằm trong CANH_TRANH vừa nằm trong khongCanhTranh (mâu thuẫn)`);
        }

        if (dsUngVien.length === 0) {
          ra[13].soKiem += 1;
          continue;
        }

        for (const candNut of dsUngVien) {
          ra[13].soKiem += 1;
          if (mauThuanSet.has(candNut)) continue;
          const coTrongCanhTranh = cts.some(
            (ct) => phepThuNguyenVanHopLeCho(ct, candNut) && coThat(candNut) && (ct.nhomCanhTranh || []).includes(candNut),
          );
          const coTrongKhongCanhTranh = cts.some(
            (ct) => banThanCtHopLe(ct) && (ct.khongCanhTranh || []).some((m) => khongCanhTranhHopLeCho(m, candNut)),
          );
          if (coTrongCanhTranh && coTrongKhongCanhTranh) {
            ra[13].loi.push(`bieu:${nhom4}: ứng viên ${candNut} vừa nằm trong CANH_TRANH vừa nằm trong khongCanhTranh (mâu thuẫn)`);
          } else if (!coTrongCanhTranh && !coTrongKhongCanhTranh) {
            ra[13].loi.push(`bieu:${nhom4}: thiếu trả lời cho ứng viên cạnh tranh ${candNut} trong canhTranhTimThay (phải có trong CANH_TRANH kèm phepThu trích nguyên văn hoặc khongCanhTranh kèm trich nguyên văn)`);
          }
        }
      }
    }

    // Cổng 14 ĐỦ CHUỖI (ADR-0010 mục 7: đòi bằng chứng câu dẫn 4 → 6 → 8 và điều kiện loại trich nguyên văn cho mọi anh em cùng cấp)
    if (cong.includes(14) && pv.length) {
      const dkById = new Map();
      for (const ds of dkTheoNut.values()) {
        for (const d of ds) if (d?.id) dkById.set(d.id, d);
      }
      const cacDong8 = [...NTrong]
        .filter((id) => /^bieu:\d{8}(?::td\d+)*$/.test(id) && G.conCua(id, L.cay).length === 0)
        .sort();
      const cacDong8Set = new Set(cacDong8);
      const daCanhBaoHoPhu = new Set();

      const optsChuoi = {
        luat: L.thuMuc || luat,
        hoSo,
        L,
        bieuMeta,
        cungDongNguoc,
        dkTheoNut,
        dkById,
        giaiChongTheoCha,
        nguongById,
        phamViNutSet: chiTrong ? N : null,
      };

      for (const dong8Id of cacDong8) {
        ra[14].soKiem += 1;
        ra[14].dem.tongDong8 += 1;
        const kqRong = danhGiaChuoi468(dong8Id, {}, optsChuoi);
        const coLoiCauTruc = Array.isArray(kqRong.loiCauTruc) && kqRong.loiCauTruc.length > 0;
        const khongPhaiChuaDu = kqRong.o !== 'CHUA_DU_DU_KIEN' || !Array.isArray(kqRong.cauHoi) || kqRong.cauHoi.length === 0;
        if (coLoiCauTruc || khongPhaiChuaDu) {
          ra[14].dem.thieuBangChungSai += 1;
          if (coLoiCauTruc) {
            for (const errMsg of kqRong.loiCauTruc) ra[14].loi.push(errMsg);
          } else {
            ra[14].loi.push(`${dong8Id}: khi chưa có dữ kiện phải trả CHUA_DU_DU_KIEN kèm cauHoi không rỗng (nhận ${kqRong.o})`);
          }
          ra[14].theoDong8[dong8Id] = {
            trangThaiChuoi: 'THIEU_BANG_CHUNG',
            loi: kqRong.loiCauTruc || [],
            soCauHoi: (kqRong.cauHoi || []).length,
          };
          continue;
        }
        const dsHoPhu = kqRong.matHoPhu || [];
        const soAnhEmMo = kqRong.soAnhEmMo || 0;
        if (dsHoPhu.length > 0 || soAnhEmMo > 0) {
          ra[14].dem.chuaDuDuKienCoCauHoi += 1;
          ra[14].theoDong8[dong8Id] = {
            trangThaiChuoi: 'CAN_HOI_ANH_EM',
            matHoPhu: dsHoPhu,
            soAnhEmMo,
            soCauHoi: kqRong.cauHoi.length,
          };
          for (const chaHp of dsHoPhu) {
            if (daCanhBaoHoPhu.has(chaHp)) continue;
            daCanhBaoHoPhu.add(chaHp);
            const mauCauHoi = kqRong.cauHoi.slice(0, 2).map((c) => `"${ngan(c.cauHoi)}"`).join('; ');
            ra[14].canhBao.push(`${chaHp}: mắt HO_PHU tự ghi CHUA_DU_DU_KIEN kèm câu hỏi (${mauCauHoi})`);
          }
        } else {
          ra[14].dem.duBangChungTuDong += 1;
          ra[14].theoDong8[dong8Id] = {
            trangThaiChuoi: 'DU_CHUOI_TU_DONG',
            soCauHoi: kqRong.cauHoi.length,
          };
        }
      }

      for (const vd of viDu || []) {
        if (!vd || vd.ngoaiPhamVi || vd.dich === 'NGOAI_PHAM_VI' || !vd.dich || !cacDong8Set.has(vd.dich)) continue;
        ra[14].soKiem += 1;
        const ganVd = vd.ganDieuKien || vd.gan || {};
        const kqVd = danhGiaChuoi468(vd.dich, ganVd, optsChuoi);
        if (kqVd.o === 'SAI') {
          const dsVp = (kqVd.viPham || []).map((v) => `${v.idDieuKien || v.nut} (${v.nguon})`).join(', ');
          ra[14].loi.push(`ví dụ "${ngan(vd.trich || vd.dich)}" → ${vd.dich} vi phạm chuỗi 4→6→8 (SAI): ${dsVp}`);
        } else if (kqVd.o === 'CHUA_DU_DU_KIEN') {
          const dsCh = (kqVd.cauHoi || []).slice(0, 3).map((c) => `${c.id}: "${ngan(c.cauHoi)}"`).join('; ');
          ra[14].canhBao.push(`ví dụ "${ngan(vd.trich || vd.dich)}" → ${vd.dich}: CHUA_DU_DU_KIEN trên chuỗi 4→6→8 (cần hỏi ${dsCh})`);
        }
      }
    }
  }

  return { khuon: kho.loi, soBanGhi: kho.banGhi.length, phamVi: pv.map((p) => p.goc), toiCap: cap, cong: Object.fromEntries(cong.map((k) => [k, ra[k]])) };
}

function taoCungDongNguocTuMeta(bieuMeta) {
  const m = new Map();
  if (!bieuMeta) return m;
  for (const [id, meta] of bieuMeta) {
    if (!meta?.cungDong) continue;
    if (!m.has(meta.cungDong)) m.set(meta.cungDong, []);
    m.get(meta.cungDong).push(id);
  }
  return m;
}

function kiemDieuKienHopLeChoChuoi(d, { L, bieuMeta, cungDongNguoc, nguongById }) {
  if (!d || d.loai !== 'DIEU_KIEN') return { ok: false, lyDo: 'không phải bản ghi DIEU_KIEN' };
  if (/^tb:/.test(d.nguon || '')) return { ok: false, lyDo: `nguon ${d.nguon} trích tiền lệ` };
  const chu = L.chuCau(d.nguon);
  if (chu === null) return { ok: false, lyDo: `nguon ${d.nguon} không có trong kho luật gốc` };
  const chu0 = G.chuCuaCau(d.nguon);
  const tren = new Set(G.trenCua(d.nut, L.cay));
  const anhEm = new Set(G.anhEmCua(d.nut, L.cay));
  const vao = (L.canhTheoTu.get(d.nguon) || []).some((e) => e.den === d.nut && loaiCanhVao(e));
  const laGir = G.capCuaNut(d.nut) === 'GIR';
  const nutCau = L.cau.get(d.nguon).nut;
  const cungDongSet = laGir ? null : new Set(cacNutCungDong(d.nut, L, bieuMeta, cungDongNguoc));
  const dungDuong = laGir
    ? (nutCau === d.nut || nutCau.startsWith(`${d.nut}:`))
    : vao || chu0 === G.CHUNG || chu0 === d.nut || tren.has(chu0) || anhEm.has(chu0) || cungDongSet.has(chu0);
  if (!dungDuong) return { ok: false, lyDo: `nguon ${d.nguon} không nằm trên đường đi của ${d.nut}` };
  if (typeof d.trich !== 'string' || !d.trich.trim() || !chuanSo(chu).includes(chuanSo(d.trich))) {
    return { ok: false, lyDo: `trich không nguyên văn câu ${d.nguon}` };
  }
  if (!d.vanTay || vanTay(chu) !== d.vanTay) {
    return { ok: false, lyDo: `vanTay lệch câu ${d.nguon}` };
  }
  if (typeof d.cauHoi !== 'string' || !d.cauHoi.trim() || /\n/.test(d.cauHoi)) {
    return { ok: false, lyDo: 'thiếu hoặc sai cauHoi một dòng' };
  }
  if (d.kieu === 'SO' && !nguongById.has(d.nguong)) {
    return { ok: false, lyDo: `kieu SO thiếu NGUONG ${d.nguong}` };
  }
  return { ok: true };
}

function danhGiaDksMotNut(dks, dkById, ganDieuKien) {
  const ct = chiaVeDieuKien(dks);
  const cacVe = ct.cacVe || [];
  if (!cacVe.length) {
    return { kq: undefined, veTrue: [], veMo: [], dkTrue: null, cacDkTrue: [], dkFalseList: [], dkChuaRoList: [] };
  }
  const veTrue = [];
  const veMo = [];
  const dkFalseMap = new Map();
  const dkChuaRoMap = new Map();

  for (const v of cacVe) {
    const fullItems = (v.cacDieuKien || []).map((it) => dkById.get(it.id) || it);
    const saiItems = [];
    const chuaRoItems = [];
    for (const d of fullItems) {
      const val = ganDieuKien[d.id];
      if (val === undefined) {
        chuaRoItems.push(d);
        continue;
      }
      const dat = d.phu ? !Boolean(val) : Boolean(val);
      if (!dat) saiItems.push(d);
    }
    if (saiItems.length > 0) {
      const df = saiItems[0];
      if (df?.id && !dkFalseMap.has(df.id)) dkFalseMap.set(df.id, df);
    } else if (chuaRoItems.length > 0) {
      veMo.push(fullItems);
      for (const dc of chuaRoItems) {
        if (dc?.id && !dkChuaRoMap.has(dc.id)) dkChuaRoMap.set(dc.id, dc);
      }
    } else {
      veTrue.push(fullItems);
    }
  }

  if (veTrue.length > 0) {
    return {
      kq: true,
      veTrue,
      veMo,
      dkTrue: veTrue[0][0] || null,
      cacDkTrue: veTrue[0],
      dkFalseList: [],
      dkChuaRoList: [],
    };
  }
  if (veMo.length > 0) {
    return {
      kq: undefined,
      veTrue: [],
      veMo,
      dkTrue: null,
      cacDkTrue: [],
      dkFalseList: [],
      dkChuaRoList: [...dkChuaRoMap.values()],
    };
  }
  return {
    kq: false,
    veTrue: [],
    veMo: [],
    dkTrue: null,
    cacDkTrue: [],
    dkFalseList: [...dkFalseMap.values()],
    dkChuaRoList: [],
  };
}

/**
 * Đánh giá chuỗi 4 → 6 → 8 cho một mã 8 số (ADR-0010 mục 7 — Cổng 14 ĐỦ CHUỖI).
 * Trả một trong ba ô:
 *   - { o: 'SAI', ma8So, viPham: [{ nut, idDieuKien, nguon, trich, lyDo }] }
 *   - { o: 'CHUA_DU_DU_KIEN', ma8So, cauHoi: [{ id, nut, cauHoi, nguon, trich }] }
 *   - { o: 'DUNG', ma8So, bangChung468: [...], bangChungLoaiAnhEm: [...] }
 */
export function danhGiaChuoi468(dong8Id, ganDieuKien = {}, opts = {}) {
  const luat = opts.luat || G.LUAT_MAC_DINH;
  const hoSo = opts.hoSo || G.HO_SO_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const bieuMeta = opts.bieuMeta || napBieuMeta(L.thuMuc || luat);
  const cungDongNguoc = opts.cungDongNguoc || taoCungDongNguocTuMeta(bieuMeta);

  let dkTheoNut = opts.dkTheoNut || null;
  let dkById = opts.dkById || null;
  let giaiChongTheoCha = opts.giaiChongTheoCha || null;
  let nguongById = opts.nguongById || null;
  if (!dkTheoNut || !giaiChongTheoCha || !nguongById) {
    const kho = opts.kho || kiemKhoHoSo(hoSo);
    dkTheoNut = new Map();
    dkById = new Map();
    giaiChongTheoCha = new Map();
    nguongById = new Map();
    for (const x of kho.banGhi || []) {
      if (x._hong) continue;
      if (x.loai === 'NGUONG') nguongById.set(x.id, x);
      else if (x.loai === 'DIEU_KIEN') {
        if (!dkTheoNut.has(x.nut)) dkTheoNut.set(x.nut, []);
        dkTheoNut.get(x.nut).push(x);
        if (x.id) dkById.set(x.id, x);
      } else if (x.loai === 'GIAI_CHONG') {
        if (!giaiChongTheoCha.has(x.nut)) giaiChongTheoCha.set(x.nut, []);
        giaiChongTheoCha.get(x.nut).push(x);
      }
    }
  } else if (!dkById) {
    dkById = new Map();
    for (const ds of dkTheoNut.values()) {
      for (const d of ds) if (d?.id) dkById.set(d.id, d);
    }
  }

  let ma8Id = String(dong8Id ?? '').trim();
  if (!ma8Id.startsWith('bieu:')) {
    const chuan = G.chuanMa(ma8Id);
    if (chuan) ma8Id = `bieu:${chuan}`;
  }

  const duongDayDu = G.duongDiNut(ma8Id, L.cay);
  if (!duongDayDu || !/^bieu:\d{8}(?::td\d+)*$/.test(ma8Id)) {
    return {
      o: 'CHUA_DU_DU_KIEN',
      ma8So: ma8Id,
      cauHoi: [],
      loiCauTruc: [`${ma8Id}: không phải mã 8 số hợp lệ hoặc thiếu đường đi trong biểu thuế`],
      matHoPhu: [],
      soAnhEmMo: 0,
    };
  }

  const cacBuoc468 = duongDayDu
    .map((b) => b.nut)
    .filter((id) => /^bieu:\d{4,8}(?::td\d+)*$/.test(id));
  const loiCauTruc = [];
  if (!cacBuoc468.length || !/^bieu:\d{4}$/.test(cacBuoc468[0]) || cacBuoc468.at(-1) !== ma8Id) {
    loiCauTruc.push(`${ma8Id}: đứt chuỗi bậc 4 → 6 → 8`);
  }

  const cacBuocXet = opts.phamViNutSet
    ? cacBuoc468.filter((id) => opts.phamViNutSet.has(id))
    : cacBuoc468;
  if (!cacBuocXet.length) {
    loiCauTruc.push(`${ma8Id}: không có bậc nào trong phạm vi xét`);
  }

  const ctx = { L, bieuMeta, cungDongNguoc, nguongById };
  const layDksHieuLuc = (nutId) => {
    const rieng = dkTheoNut.get(nutId) || [];
    if (rieng.length > 0) return rieng;
    return cacNutCungDong(nutId, L, bieuMeta, cungDongNguoc)
      .flatMap((nid) => (nid === nutId ? [] : (dkTheoNut.get(nid) || [])));
  };

  const viPham = [];
  const cauHoiMap = new Map();
  const bangChung468 = [];
  const bangChungLoaiAnhEm = [];
  const matHoPhu = [];
  let soAnhEmMo = 0;

  const themCauHoi = (d) => {
    if (d?.id && !cauHoiMap.has(d.id)) {
      cauHoiMap.set(d.id, {
        id: d.id,
        nut: d.nut,
        cauHoi: d.cauHoi || '',
        nguon: d.nguon || '',
        trich: d.trich || '',
      });
    }
  };

  let tongAnhEmCanLoai = 0;

  for (const nutId of cacBuocXet) {
    const laLkNut = laLoaiKhacThuan(nutId, L, bieuMeta);
    let evalNut = null;
    let dksNut = [];

    if (!laLkNut) {
      dksNut = layDksHieuLuc(nutId);
      if (dksNut.length === 0) {
        loiCauTruc.push(`${ma8Id}: bậc ${nutId} thiếu DIEU_KIEN câu dẫn nguyên văn`);
      } else {
        for (const d of dksNut) {
          const kt = kiemDieuKienHopLeChoChuoi(d, ctx);
          if (!kt.ok) loiCauTruc.push(`${ma8Id}: bậc ${nutId} có ${d.id} không hợp lệ (${kt.lyDo})`);
        }
        evalNut = danhGiaDksMotNut(dksNut, dkById, ganDieuKien);
        if (evalNut.kq === false) {
          for (const df of evalNut.dkFalseList) {
            viPham.push({
              nut: nutId,
              idDieuKien: df.id,
              nguon: df.nguon,
              trich: df.trich,
              lyDo: `vi phạm điều kiện của bậc ${nutId}`,
            });
          }
        } else if (evalNut.kq === true && evalNut.dkTrue) {
          bangChung468.push({
            nut: nutId,
            laLoaiKhac: false,
            dieuKienIds: evalNut.cacDkTrue.map((x) => x.id),
            nguon: evalNut.dkTrue.nguon,
            trich: evalNut.dkTrue.trich,
          });
        } else {
          for (const dc of evalNut.dkChuaRoList) themCauHoi(dc);
        }
      }
    } else {
      const cauIdLk = cacNutCungDong(nutId, L, bieuMeta, cungDongNguoc)
        .map((nid) => `${nid}#1`)
        .find((cid) => L.chuCau(cid) !== null) || null;
      if (!cauIdLk) {
        loiCauTruc.push(`${ma8Id}: bậc "Loại khác" ${nutId} thiếu câu biểu gốc #1`);
      } else {
        bangChung468.push({
          nut: nutId,
          laLoaiKhac: true,
          nguon: cauIdLk,
          trich: gon(L.chuCau(cauIdLk)),
        });
      }
    }

    const chaId = L.cay.theoId.get(nutId)?.cha || bieuMeta.get(nutId)?.cha || null;
    if (!chaId || !/^bieu:\d{4,8}(?::td\d+)*$/.test(chaId)) continue;
    if (opts.phamViNutSet && !opts.phamViNutSet.has(chaId)) continue;
    const dsCon = G.conCua(chaId, L.cay);
    if (dsCon.length < 2) continue;

    const conSet = new Set(dsCon);
    const coLkCon = dsCon.some((id) => laLoaiKhacThuan(id, L, bieuMeta));
    const duongCha = G.duongDiNut(chaId, L.cay) || [];
    const dksDuongCha = duongCha.flatMap((b) => dkTheoNut.get(b.nut) || []);
    const dksCha = dkTheoNut.get(chaId) || [];
    const tapDuTheoTruc = layTapDuHopLeTheoTruc(dsCon, dkTheoNut, dksCha, dksDuongCha, { L });
    const gcHopLeCha = (giaiChongTheoCha.get(chaId) || []).filter((g) => (
      conSet.has(g.cap?.[0])
      && conSet.has(g.cap?.[1])
      && !/^(?:tb|wco):/.test(g.nguon || '')
      && L.chuCau(g.nguon) !== null
      && chuanSo(L.chuCau(g.nguon)).includes(chuanSo(g.trich || ''))
      && (g.vanTay === undefined || vanTay(L.chuCau(g.nguon)) === g.vanTay)
    ));
    const truTheoNut = taoBanDoTruAnhEm(chaId, dsCon, L, bieuMeta, dkTheoNut, gcHopLeCha, nguongById, { tapDuTheoTruc });
    const phuKin = coLkCon
      ? true
      : chungMinhPhuKin(dsCon, dkTheoNut, nguongById, dksCha, dksDuongCha, { chaId, L, bieuMeta, truTheoNut });
    if (!phuKin) matHoPhu.push(chaId);
    if (laLkNut && !dsCon.some((id) => id !== nutId && !laLoaiKhacThuan(id, L, bieuMeta))) {
      loiCauTruc.push(`${ma8Id}: bậc ${chaId} chỉ có "Loại khác" mà thiếu anh em có tên`);
    }

    for (const aeId of dsCon) {
      if (aeId === nutId) continue;
      tongAnhEmCanLoai += 1;

      if (laLoaiKhacThuan(aeId, L, bieuMeta)) {
        if (evalNut?.kq === true && evalNut.dkTrue) {
          bangChungLoaiAnhEm.push({
            cha: chaId,
            nut: nutId,
            anhEm: aeId,
            cachLoai: 'LOAI_KHAC_THUA_ANH_EM_CO_TEN',
            idDieuKien: evalNut.dkTrue.id,
            nguon: evalNut.dkTrue.nguon,
            trich: evalNut.dkTrue.trich,
          });
        }
        continue;
      }

      const dksAe = layDksHieuLuc(aeId);
      if (dksAe.length === 0) {
        loiCauTruc.push(`${ma8Id}: ở bậc ${chaId}, anh em cùng cấp ${aeId} thiếu DIEU_KIEN kèm trich nguyên văn để loại`);
        continue;
      }
      for (const d of dksAe) {
        const ktAe = kiemDieuKienHopLeChoChuoi(d, ctx);
        if (!ktAe.ok) loiCauTruc.push(`${ma8Id}: ở bậc ${chaId}, anh em ${aeId} có ${d.id} không hợp lệ (${ktAe.lyDo})`);
      }

      const nutBiTruBoiAe = laLkNut || (truTheoNut.get(nutId) || []).includes(aeId);
      const nutThangAeMotChieu = !laLkNut && (truTheoNut.get(aeId) || []).includes(nutId);
      const gcCap = gcHopLeCha.find((g) => g.cap.includes(nutId) && g.cap.includes(aeId)) || null;
      const roiNhauTinh = !laLkNut && !nutBiTruBoiAe && haiNutRoiNhau(dksNut, dksAe, nguongById, { tapDuTheoTruc, L });
      if (!roiNhauTinh && !nutThangAeMotChieu) {
        soAnhEmMo += 1;
      }

      const evalAe = danhGiaDksMotNut(dksAe, dkById, ganDieuKien);
      if (evalAe.kq === false) {
        const dBacBo = evalAe.dkFalseList[0] || dksAe[0];
        bangChungLoaiAnhEm.push({
          cha: chaId,
          nut: nutId,
          anhEm: aeId,
          cachLoai: 'BAC_BO_DIEU_KIEN',
          idDieuKien: dBacBo.id,
          nguon: dBacBo.nguon,
          trich: dBacBo.trich,
        });
      } else if (evalAe.kq === true) {
        const dAeTrue = evalAe.dkTrue || dksAe[0];
        if (nutBiTruBoiAe) {
          viPham.push({
            nut: nutId,
            anhEmThang: aeId,
            idDieuKien: dAeTrue.id,
            nguon: dAeTrue.nguon,
            trich: dAeTrue.trich,
            lyDo: `thỏa điều kiện anh em ưu tiên ${aeId}`,
          });
        } else if (nutThangAeMotChieu) {
          if (evalNut?.kq === true && evalNut.dkTrue) {
            const canCu = gcCap || evalNut.dkTrue;
            bangChungLoaiAnhEm.push({
              cha: chaId,
              nut: nutId,
              anhEm: aeId,
              cachLoai: 'UU_TIEN_TRU',
              nguon: canCu.nguon,
              trich: canCu.trich,
            });
          }
        } else if (gcCap) {
          if (evalNut?.kq === true) {
            const px = phanXuCapGiaiChong(nutId, aeId, gcHopLeCha, dsCon);
            const canCuPx = px.canCu || gcCap;
            if (px.thang === nutId) {
              bangChungLoaiAnhEm.push({
                cha: chaId,
                nut: nutId,
                anhEm: aeId,
                cachLoai: 'GIAI_CHONG',
                nguon: canCuPx.nguon,
                trich: canCuPx.trich,
              });
            } else if (px.thua === nutId) {
              viPham.push({
                nut: nutId,
                anhEmThang: aeId,
                idDieuKien: canCuPx.id || dAeTrue.id,
                nguon: canCuPx.nguon,
                trich: canCuPx.trich,
                lyDo: `thua anh em cùng cấp ${aeId} theo GIAI_CHONG (${canCuPx.nguon})`,
              });
            } else {
              const idHoiGc = canCuPx.id || `gc:${chaId}:${[nutId, aeId].sort().join('|')}`;
              if (!cauHoiMap.has(idHoiGc)) {
                cauHoiMap.set(idHoiGc, {
                  id: idHoiGc,
                  nut: chaId,
                  cauHoi: `Giữa ${nutId} và ${aeId} cùng thỏa điều kiện, mặt hàng thuộc nhánh nào theo quy tắc phân xử (${canCuPx.nguon})?`,
                  nguon: canCuPx.nguon,
                  trich: canCuPx.trich,
                });
              }
            }
          }
        } else if (evalNut?.kq === true) {
          viPham.push({
            nut: nutId,
            anhEmThang: aeId,
            idDieuKien: dAeTrue.id,
            nguon: dAeTrue.nguon,
            trich: dAeTrue.trich,
            lyDo: `chồng lấp với anh em cùng cấp ${aeId} chưa có GIAI_CHONG`,
          });
        }
      } else {
        const tuRoiNhauDong = !laLkNut
          && !nutBiTruBoiAe
          && evalNut?.kq === true
          && evalNut.veTrue.some((vt) => evalAe.veMo.every((vu) => veRoiNhau(vt, vu, nguongById, { tapDuTheoTruc, L })));
        const tuThangTru = !laLkNut && !nutBiTruBoiAe && nutThangAeMotChieu && evalNut?.kq === true && Boolean(evalNut.dkTrue);
        if (tuRoiNhauDong) {
          const dAeRef = dksAe[0];
          bangChungLoaiAnhEm.push({
            cha: chaId,
            nut: nutId,
            anhEm: aeId,
            cachLoai: 'ROI_NHAU_CAU_TRUC',
            idDieuKien: dAeRef.id,
            nguon: dAeRef.nguon,
            trich: dAeRef.trich,
          });
        } else if (tuThangTru) {
          const canCu = gcCap || evalNut.dkTrue;
          bangChungLoaiAnhEm.push({
            cha: chaId,
            nut: nutId,
            anhEm: aeId,
            cachLoai: 'UU_TIEN_TRU',
            nguon: canCu.nguon,
            trich: canCu.trich,
          });
        } else {
          for (const dc of evalAe.dkChuaRoList) themCauHoi(dc);
        }
      }
    }
  }

  if (viPham.length > 0) {
    return {
      o: 'SAI',
      ma8So: ma8Id,
      viPham,
      ...(loiCauTruc.length ? { loiCauTruc } : {}),
    };
  }

  const duMat468 = bangChung468.length === cacBuocXet.length
    && bangChung468.every((b) => typeof b.nguon === 'string' && b.nguon && typeof b.trich === 'string' && b.trich.trim().length > 0);
  const duMatAnhEm = bangChungLoaiAnhEm.length === tongAnhEmCanLoai
    && bangChungLoaiAnhEm.every((b) => typeof b.nguon === 'string' && b.nguon && typeof b.trich === 'string' && b.trich.trim().length > 0);

  if (loiCauTruc.length > 0 || cauHoiMap.size > 0 || !duMat468 || !duMatAnhEm) {
    return {
      o: 'CHUA_DU_DU_KIEN',
      ma8So: ma8Id,
      cauHoi: [...cauHoiMap.values()],
      ...(loiCauTruc.length ? { loiCauTruc } : {}),
      matHoPhu: [...new Set(matHoPhu)],
      soAnhEmMo,
    };
  }

  return {
    o: 'DUNG',
    ma8So: ma8Id,
    bangChung468,
    bangChungLoaiAnhEm,
  };
}

/** Chữ câu, vân tay hiện hành và mọi bản ghi dính câu. */
export function dinhCau(cauId, { luat = G.LUAT_MAC_DINH, hoSo = G.HO_SO_MAC_DINH } = {}) {
  const L = napLuatCong(luat);
  const chu = L.chuCau(cauId);
  return { cau: cauId, chu, van: chu === null ? null : vanTay(chu), banGhi: kiemKhoHoSo(hoSo).banGhi.filter((x) => x.cau === cauId || x.nguon === cauId).map((x) => ({ id: x.id, tep: x._tep, dong: x._dong, van: x.van || x.vanTay, khop: chu !== null && (x.van || x.vanTay) === vanTay(chu) })) };
}

function docDanhSachTuyChon(tep) {
  if (!tep) return [];
  const raw = fs.readFileSync(path.resolve(tep), 'utf8').trim();
  if (!raw) return [];
  if (raw.startsWith('[')) return JSON.parse(raw);
  return raw.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

function main() {
  const a = process.argv.slice(2);
  const lay = (k) => { const ds = []; a.forEach((x, i) => { if (x === k && a[i + 1]) ds.push(a[i + 1]); }); return ds; };
  const luat = path.resolve(lay('--luat')[0] || G.LUAT_MAC_DINH);
  const hoSo = path.resolve(lay('--ho-so')[0] || G.HO_SO_MAC_DINH);
  if (lay('--dinh-cau').length) { console.log(JSON.stringify(dinhCau(lay('--dinh-cau')[0], { luat, hoSo }), null, 2)); return; }
  const cong = lay('--cong')[0] ? parseCongArg(lay('--cong')[0]) : [1, 2, 3, 4, 5];
  const viDu = docDanhSachTuyChon(lay('--vi-du')[0]);
  const vungChong = docDanhSachTuyChon(lay('--vung-chong')[0]);
  const r = chayCong({ luat, hoSo, phamVi: lay('--pham-vi'), chiTrong: a.includes('--chi-trong'), toiCap: lay('--toi-cap')[0] ?? null, cong, viDu, vungChong });
  let do_ = r.khuon.length ? 1 : 0;
  console.log(`${r.khuon.length ? 'FAIL' : 'PASS'} khuôn: ${r.soBanGhi} bản ghi, ${r.khuon.length} lỗi`);
  for (const l of r.khuon.slice(0, 30)) console.log(`  ✗ ${l}`);
  const nhan = r.phamVi.length ? `phạm vi ${r.phamVi.join(', ')}${a.includes('--chi-trong') ? ' (chỉ trong)' : ''}${r.toiCap !== null ? ` (tới cấp ${lay('--toi-cap')[0]})` : ''}` : 'mọi bản ghi';
  for (const [k, c] of Object.entries(r.cong)) {
    const numK = Number(k);
    if (!r.phamVi.length && (numK <= 3 || numK === 7 || numK === 8 || numK === 9 || numK === 10 || numK === 12 || numK === 13 || numK === 14)) {
      console.log(`---- cổng ${k} ${c.ten}: cần --pham-vi`);
      continue;
    }
    console.log(`${c.loi.length ? 'FAIL' : 'PASS'} cổng ${k} ${c.ten} — ${nhan}: ${c.soKiem} mục kiểm, ${c.loi.length} lỗi${c.canhBao?.length ? `, ${c.canhBao.length} cảnh báo` : ''}`);
    for (const l of c.loi.slice(0, 40)) console.log(`  ✗ ${l}`);
    for (const l of (c.canhBao || [])) console.log(`  ! ${l}`);
    if (c.loi.length > 40) console.log(`  … còn ${c.loi.length - 40} lỗi`);
    if (c.loi.length) do_ = 1;
  }
  process.exit(do_);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
