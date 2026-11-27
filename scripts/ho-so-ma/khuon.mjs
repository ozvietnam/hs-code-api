#!/usr/bin/env node
// scripts/ho-so-ma/khuon.mjs — M-71 (#1963): kiểm từng bản ghi hồ sơ vấn đề theo khuôn ho-so-ma@1 (docs/mong/khuon-ho-so-ma.md)
// và chỗ đặt tệp data/ho-so-ma/<thư mục>/<khoá>.jsonl. Chỉ kiểm hình thức; đối chiếu với luật là việc của cong.mjs.
// Tất định, không mạng, không AI.
//   node scripts/ho-so-ma/khuon.mjs [--ho-so <thư mục>]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');

export const LOAI = Object.freeze(['PHAI_LA', 'KHONG_DUOC_LA', 'TACH_ANH_EM', 'DINH_NGHIA', 'NGUONG', 'CHI_LIET_KE']);
export const LOAI_DIEU_KIEN = Object.freeze(['DIEU_KIEN', 'GIAI_CHONG', 'CANH_TRANH']);
export const LOAI_MOI = LOAI_DIEU_KIEN;
export const TAT_CA_LOAI = Object.freeze([...LOAI, ...LOAI_DIEU_KIEN]);
export const KIEU_DIEU_KIEN = Object.freeze(['CO_KHONG', 'SO', 'GIA_TRI']);
export const MO_DIEU_KIEN = Object.freeze(['DINH_NGHIA_LUAT', 'NGUONG', 'MO_TA_HUONG_DAN', 'NGHIA_THUONG']);
export const CACH_GIAI_CHONG = Object.freeze(['TRU', 'QUY_TAC_3', 'CHU_GIAI', 'NGUONG']);
export const CO_BANG_ANH_EM = Object.freeze(['HO_PHU', 'VUNG_CHONG', 'CHUA_CHUNG_MINH_TACH', 'NGHIA_THUONG', 'THIEU_VI_DU']);
export const THU_MUC_DIEU_KIEN = 'dieu-kien';
export const THU_MUC_BANG_ANH_EM = 'bang-anh-em';
export const THU_MUC_HO_SO = Object.freeze([...G.THU_MUC, THU_MUC_DIEU_KIEN]);
export const THU_MUC_KHO = Object.freeze([...THU_MUC_HO_SO, THU_MUC_BANG_ANH_EM]);
export const TEN_TEP_THU_TU = 'thu-tu-cuon-chieu.json';
export const BO_QUA = 'BO_QUA';
export const TRANG_THAI = Object.freeze(['KHOP', 'LECH_PHIEU', 'VENH']);
const LOP = new Set(['LUAT', 'HUONG_DAN']);
const RE_NUT = /^(?:gir:[1-6](?::[a-c])?|phan:[IVX]+|chuong:\d{2}(?::pc:[IVX]+)?|bieu:\d{4,8}(?::td\d+)*)$/;
const RE_CAU = /^(?:gir|phan|chuong|nhom|pn|bieu|sen|wco|tb):[^#\s]+#\d+$/;
const RE_DICH = /^(?:phan:[IVX]+|chuong:\d{2}(?::pc:[IVX]+)?|bieu:\d{2,8}(?::td\d+)*|gir:[1-6](?::[a-c])?)$/;
const RE_ANH_EM = /^(?:chuong:\d{2}(?::pc:[IVX]+)?|bieu:\d{4,8}(?::td\d+)*)$/;
const RE_VAN = /^[0-9a-f]{64}$/;
const RE_ID_NGUONG = /^hs:.+:\d+$/;
const TRUONG_VAN_DE = new Set(['id', 'nut', 'loai', 'dieuKien', 'trich', 'cau', 'tu', 'den', 'voi', 'nguong', 'thuatNgu', 'phuDinh', 'duKien', 'lop', 'nguon', 'van', 'trangThai', 'phieu', 'ghiChu']);
const TRUONG_BO_QUA = new Set(['id', 'nut', 'loai', 'cau', 'lyDo', 'van', 'ghiChu']);
const TRUONG_DIEU_KIEN = new Set(['id', 'nut', 'loai', 've', 'phu', 'kieu', 'truc', 'daTri', 'nguong', 'tap', 'tapDu', 'tapDuNguon', 'tapDuTrich', 'tapDuNguonVanTay', 'mo', 'moNguon', 'moNguonVanTay', 'cauHoi', 'trich', 'nguon', 'vanTay', 'trangThai', 'phieu', 'ghiChu']);
const TRUONG_GIAI_CHONG = new Set(['id', 'nut', 'loai', 'cap', 'cach', 'trich', 'nguon', 'vanTay', 'trangThai', 'phieu', 'ghiChu']);
const TRUONG_CANH_TRANH = new Set(['id', 'nut', 'loai', 'nhomCanhTranh', 'phepThu', 'trich', 'nguon', 'vanTay', 'trangThai', 'phieu', 'ghiChu']);
const TRUONG_BANG_ANH_EM = new Set(['khuon', 'cha', 'chuong', 'chuoiCha', 'anhEm', 'giaiChong', 'co', 'vanTayCau', 'vanTay']);
const CO_DEN = new Set(['KHONG_DUOC_LA', 'PHAI_LA', 'CHI_LIET_KE']);
const CO_VOI = new Set(['TACH_ANH_EM', 'NGUONG']);
const chuoi = (v) => typeof v === 'string' && v.trim().length > 0;
const soHoacNull = (v) => v === null || (typeof v === 'number' && Number.isFinite(v));
const gon = (s) => String(s).normalize('NFC').replace(/\s+/g, ' ').trim();
const chuanSoKhuon = (s) => gon(s).replace(/ ?([-–—/]) ?/g, '$1');

/** Khoá tệp cho thư mục hồ sơ (mở rộng cục bộ thêm dieu-kien/ và bang-anh-em/ mà không sửa lib/ho-so-ma/ghep.js). */
export function tepCuaNutKhuon(nutId, thuMuc) {
  if (G.THU_MUC.includes(thuMuc)) return G.tepCuaNut(nutId, thuMuc);
  if (thuMuc === THU_MUC_DIEU_KIEN || thuMuc === THU_MUC_BANG_ANH_EM) {
    const cap = G.capCuaNut(nutId);
    if (!cap || (cap === 'CHUONG' && /^bieu:/.test(nutId))) return null;
    if (cap === 'GIR') return 'gir';
    if (cap === 'PHAN') return nutId.slice(5);
    return G.chuongCuaNut(nutId);
  }
  return null;
}

function kiemId81(x, loi, batBuoc = true) {
  const o = x.id || '(thiếu id)';
  if (x.id === undefined) {
    if (batBuoc) loi.push(`${o}: thiếu id (phải là hs:<nut>:8[1-9]NN)`);
    return;
  }
  if (!chuoi(x.id) || !x.id.startsWith(`hs:${x.nut}:`) || !/^8[1-9]\d{2,}$/.test(x.id.slice(`hs:${x.nut}:`.length))) {
    loi.push(`${o}: id phải là hs:<nut>:8[1-9]NN`);
  }
}

function hopLeMoNguon(v) {
  const cauHopLe = (s) => typeof s === 'string' && RE_CAU.test(s) && !/^tb:/.test(s);
  if (cauHopLe(v)) return true;
  return Array.isArray(v) && v.length > 0 && v.every(cauHopLe);
}

const cauHopLeTapDu = (s) => typeof s === 'string' && RE_CAU.test(s) && !/^(?:tb|wco):/.test(s);

function kiemDieuKien(x) {
  const loi = []; const o = x.id || '(thiếu id)';
  for (const k of Object.keys(x)) if (!TRUONG_DIEU_KIEN.has(k)) loi.push(`${o}: trường lạ "${k}"`);
  if (!RE_NUT.test(x.nut || '')) loi.push(`${o}: nut sai ngữ pháp "${x.nut}"`);
  kiemId81(x, loi, true);
  if (!Number.isInteger(x.ve) || x.ve < 0) loi.push(`${o}: ve phải là số nguyên >= 0`);
  if (typeof x.phu !== 'boolean') loi.push(`${o}: phu phải là boolean`);
  if (!KIEU_DIEU_KIEN.includes(x.kieu)) loi.push(`${o}: kieu lạ "${x.kieu}" (chỉ ${KIEU_DIEU_KIEN.join(' | ')})`);
  if (x.kieu === 'SO') {
    if (!chuoi(x.nguong) || !RE_ID_NGUONG.test(x.nguong)) loi.push(`${o}: kieu SO phải có nguong là id bản ghi NGUONG (không lặp số)`);
    if (x.tap !== undefined) loi.push(`${o}: kieu SO không mang tap`);
    if (x.tapDu !== undefined) loi.push(`${o}: kieu SO không mang tapDu`);
    if (x.truc !== undefined) loi.push(`${o}: kieu SO không mang truc (lấy từ nguong.daiLuong)`);
    if (x.daTri !== undefined) loi.push(`${o}: kieu SO không mang daTri`);
  } else if (x.kieu === 'GIA_TRI') {
    if (!chuoi(x.truc) || /\n/.test(x.truc)) loi.push(`${o}: kieu GIA_TRI phải có truc là tên trục một dòng không rỗng`);
    if (x.daTri !== undefined && typeof x.daTri !== 'boolean') loi.push(`${o}: daTri phải là boolean`);
    const tapHopLe = Array.isArray(x.tap) && x.tap.length > 0 && x.tap.every(chuoi);
    if (!tapHopLe) loi.push(`${o}: kieu GIA_TRI phải có tap là mảng chuỗi không rỗng`);
    if (x.tapDu !== undefined) {
      if (x.daTri === true) {
        loi.push(`${o}: tapDu chỉ dùng cho trục GIA_TRI đơn trị (!daTri)`);
      }
      if (!Array.isArray(x.tapDu) || !x.tapDu.length || !x.tapDu.every(chuoi)) {
        loi.push(`${o}: tapDu phải là mảng chuỗi không rỗng`);
      } else {
        const tapDuSet = new Set(x.tapDu.map((v) => chuanSoKhuon(v).toLowerCase()).filter(Boolean));
        if (tapDuSet.size < 2) {
          loi.push(`${o}: tapDu phải có ít nhất 2 giá trị phân biệt sau chuẩn hoá`);
        } else if (tapHopLe) {
          const ngoai = x.tap.filter((v) => !tapDuSet.has(chuanSoKhuon(v).toLowerCase()));
          if (ngoai.length) loi.push(`${o}: tap chứa giá trị nằm ngoài tapDu (${ngoai.join(', ')})`);
        }
      }
    }
    if (x.nguong !== undefined) loi.push(`${o}: kieu GIA_TRI không mang nguong`);
  } else {
    if (x.nguong !== undefined) loi.push(`${o}: kieu ${x.kieu} không mang nguong`);
    if (x.tap !== undefined) loi.push(`${o}: kieu ${x.kieu} không mang tap`);
    if (x.tapDu !== undefined) loi.push(`${o}: kieu ${x.kieu} không mang tapDu`);
    if (x.truc !== undefined) loi.push(`${o}: kieu ${x.kieu} không mang truc`);
    if (x.daTri !== undefined) loi.push(`${o}: kieu ${x.kieu} không mang daTri`);
  }
  if (x.tapDuNguon !== undefined || x.tapDuTrich !== undefined) {
    if (x.kieu !== 'GIA_TRI' || x.daTri || x.tapDu === undefined) {
      loi.push(`${o}: tapDuNguon/tapDuTrich chỉ dùng khi kieu GIA_TRI đơn trị có khai tapDu`);
    }
    if (x.tapDuNguon === undefined || x.tapDuTrich === undefined) {
      loi.push(`${o}: tapDuNguon và tapDuTrich phải đi theo cặp`);
    } else if (typeof x.tapDuNguon === 'string' && typeof x.tapDuTrich === 'string') {
      if (!cauHopLeTapDu(x.tapDuNguon)) loi.push(`${o}: tapDuNguon phải là id câu luật hợp lệ (cấm tb: và wco:)`);
      if (!chuoi(x.tapDuTrich)) loi.push(`${o}: tapDuTrich phải là chuỗi không rỗng`);
    } else if (Array.isArray(x.tapDuNguon) && Array.isArray(x.tapDuTrich)) {
      if (!x.tapDuNguon.length || !x.tapDuNguon.every(cauHopLeTapDu)) {
        loi.push(`${o}: tapDuNguon mảng phải không rỗng và mọi phần tử là id câu luật hợp lệ (cấm tb: và wco:)`);
      }
      if (!x.tapDuTrich.length || !x.tapDuTrich.every(chuoi)) {
        loi.push(`${o}: tapDuTrich mảng phải gồm các chuỗi không rỗng`);
      }
      if (x.tapDuTrich.length !== x.tapDuNguon.length) {
        loi.push(`${o}: tapDuNguon và tapDuTrich mảng phải cùng độ dài (${x.tapDuNguon.length} vs ${x.tapDuTrich.length})`);
      }
    } else {
      loi.push(`${o}: tapDuNguon và tapDuTrich phải cùng là chuỗi đơn hoặc cùng là mảng song song cùng độ dài >= 1`);
    }
  }
  if (x.tapDuNguonVanTay !== undefined) {
    if (x.tapDuNguon === undefined) {
      loi.push(`${o}: không mang tapDuNguonVanTay khi chưa khai tapDuNguon`);
    } else if (typeof x.tapDuNguon === 'string') {
      const okStr = typeof x.tapDuNguonVanTay === 'string' && RE_VAN.test(x.tapDuNguonVanTay);
      const okObj = Boolean(x.tapDuNguonVanTay) && typeof x.tapDuNguonVanTay === 'object' && !Array.isArray(x.tapDuNguonVanTay)
        && Object.keys(x.tapDuNguonVanTay).length === 1
        && Object.hasOwn(x.tapDuNguonVanTay, x.tapDuNguon)
        && RE_VAN.test(x.tapDuNguonVanTay[x.tapDuNguon] || '');
      if (!okStr && !okObj) loi.push(`${o}: tapDuNguonVanTay phải là sha256 hex hoặc object { [cauId]: sha256 } khớp tapDuNguon`);
    } else if (Array.isArray(x.tapDuNguon)) {
      const tdSet = new Set(x.tapDuNguon);
      const okObj = Boolean(x.tapDuNguonVanTay) && typeof x.tapDuNguonVanTay === 'object' && !Array.isArray(x.tapDuNguonVanTay)
        && Object.entries(x.tapDuNguonVanTay).every(([k, v]) => tdSet.has(k) && RE_VAN.test(v || ''))
        && x.tapDuNguon.every((tdId) => Object.hasOwn(x.tapDuNguonVanTay, tdId));
      if (!okObj) loi.push(`${o}: tapDuNguonVanTay phải là object { [cauId]: sha256 } khớp mọi phần tử tapDuNguon`);
    }
  }
  if (!MO_DIEU_KIEN.includes(x.mo)) loi.push(`${o}: mo lạ "${x.mo}" (chỉ ${MO_DIEU_KIEN.join(' | ')})`);
  if (x.mo === 'DINH_NGHIA_LUAT' || x.mo === 'MO_TA_HUONG_DAN') {
    if (!hopLeMoNguon(x.moNguon)) loi.push(`${o}: mo ${x.mo} phải có moNguon là id câu định nghĩa/hướng dẫn hợp lệ (không tb:)`);
  } else if (x.moNguon !== undefined) {
    loi.push(`${o}: mo ${x.mo} không mang moNguon`);
  }
  if (x.moNguonVanTay !== undefined) {
    if (x.mo !== 'DINH_NGHIA_LUAT' && x.mo !== 'MO_TA_HUONG_DAN') {
      loi.push(`${o}: mo ${x.mo} không mang moNguonVanTay`);
    } else if (typeof x.moNguon === 'string') {
      const okStr = typeof x.moNguonVanTay === 'string' && RE_VAN.test(x.moNguonVanTay);
      const okObj = Boolean(x.moNguonVanTay) && typeof x.moNguonVanTay === 'object' && !Array.isArray(x.moNguonVanTay)
        && Object.keys(x.moNguonVanTay).length === 1
        && Object.hasOwn(x.moNguonVanTay, x.moNguon)
        && RE_VAN.test(x.moNguonVanTay[x.moNguon] || '');
      if (!okStr && !okObj) loi.push(`${o}: moNguonVanTay phải là sha256 hex hoặc object { [cauId]: sha256 } khớp moNguon`);
    } else if (Array.isArray(x.moNguon)) {
      const mnSet = new Set(x.moNguon);
      const okObj = Boolean(x.moNguonVanTay) && typeof x.moNguonVanTay === 'object' && !Array.isArray(x.moNguonVanTay)
        && Object.entries(x.moNguonVanTay).every(([k, v]) => mnSet.has(k) && RE_VAN.test(v || ''))
        && x.moNguon.every((mnId) => Object.hasOwn(x.moNguonVanTay, mnId));
      if (!okObj) loi.push(`${o}: moNguonVanTay phải là object { [cauId]: sha256 } khớp mọi phần tử moNguon`);
    }
  }
  if (!chuoi(x.cauHoi)) loi.push(`${o}: thiếu cauHoi`);
  else if (/\n/.test(x.cauHoi) || x.cauHoi.length > 600) loi.push(`${o}: cauHoi phải là một câu hỏi ngắn (một dòng, ≤ 600 ký tự)`);
  if (!chuoi(x.trich)) loi.push(`${o}: thiếu trich`);
  if (!RE_CAU.test(x.nguon || '')) loi.push(`${o}: nguon sai ngữ pháp "${x.nguon}" (dạng <id nút>#<số câu>)`);
  if (!RE_VAN.test(x.vanTay || '')) loi.push(`${o}: vanTay phải là sha256 hex của chữ câu`);
  if (x.trangThai !== undefined && !TRANG_THAI.includes(x.trangThai)) loi.push(`${o}: trangThai lạ "${x.trangThai}"`);
  if (x.phieu !== undefined && !Array.isArray(x.phieu)) loi.push(`${o}: phieu phải là mảng`);
  if (x.ghiChu !== undefined && typeof x.ghiChu !== 'string') loi.push(`${o}: ghiChu phải là chuỗi`);
  return loi;
}

function kiemGiaiChong(x) {
  const loi = []; const o = x.id || `GIAI_CHONG(${x.nut || '?'})`;
  for (const k of Object.keys(x)) if (!TRUONG_GIAI_CHONG.has(k)) loi.push(`${o}: trường lạ "${k}"`);
  if (!RE_NUT.test(x.nut || '')) loi.push(`${o}: nut sai ngữ pháp "${x.nut}"`);
  kiemId81(x, loi, false);
  if (!Array.isArray(x.cap) || x.cap.length !== 2 || !x.cap.every((d) => RE_ANH_EM.test(d || '')) || x.cap[0] === x.cap[1]) {
    loi.push(`${o}: cap phải là mảng 2 id anh em khác nhau [A, B]`);
  }
  if (!CACH_GIAI_CHONG.includes(x.cach)) loi.push(`${o}: cach lạ "${x.cach}" (chỉ ${CACH_GIAI_CHONG.join(' | ')})`);
  if (!chuoi(x.trich)) loi.push(`${o}: thiếu trich`);
  if (!RE_CAU.test(x.nguon || '')) loi.push(`${o}: nguon sai ngữ pháp "${x.nguon}" (dạng <id nút>#<số câu>)`);
  if (x.vanTay !== undefined && !RE_VAN.test(x.vanTay)) loi.push(`${o}: vanTay phải là sha256 hex`);
  if (x.trangThai !== undefined && !TRANG_THAI.includes(x.trangThai)) loi.push(`${o}: trangThai lạ "${x.trangThai}"`);
  if (x.phieu !== undefined && !Array.isArray(x.phieu)) loi.push(`${o}: phieu phải là mảng`);
  if (x.ghiChu !== undefined && typeof x.ghiChu !== 'string') loi.push(`${o}: ghiChu phải là chuỗi`);
  return loi;
}

function kiemCanhTranh(x) {
  const loi = []; const o = x.id || `CANH_TRANH(${x.nut || '?'})`;
  for (const k of Object.keys(x)) if (!TRUONG_CANH_TRANH.has(k)) loi.push(`${o}: trường lạ "${k}"`);
  if (!RE_NUT.test(x.nut || '')) loi.push(`${o}: nut sai ngữ pháp "${x.nut}"`);
  kiemId81(x, loi, false);
  if (!Array.isArray(x.nhomCanhTranh) || !x.nhomCanhTranh.length || !x.nhomCanhTranh.every((d) => RE_DICH.test(d || ''))) {
    loi.push(`${o}: nhomCanhTranh phải là mảng không rỗng các id nút đích`);
  }
  const phepThuHopLe = Array.isArray(x.phepThu) && x.phepThu.length > 0 && x.phepThu.every((p) => (
    (typeof p === 'string' && RE_CAU.test(p))
    || (p && typeof p === 'object' && !Array.isArray(p) && RE_CAU.test(p.nguon || '') && chuoi(p.trich))
  ));
  if (!phepThuHopLe) loi.push(`${o}: phepThu phải là mảng không rỗng id câu hoặc {nguon, trich}`);
  if (!chuoi(x.trich)) loi.push(`${o}: thiếu trich`);
  if (!RE_CAU.test(x.nguon || '')) loi.push(`${o}: nguon sai ngữ pháp "${x.nguon}" (dạng <id nút>#<số câu>)`);
  if (x.vanTay !== undefined && !RE_VAN.test(x.vanTay)) loi.push(`${o}: vanTay phải là sha256 hex`);
  if (x.trangThai !== undefined && !TRANG_THAI.includes(x.trangThai)) loi.push(`${o}: trangThai lạ "${x.trangThai}"`);
  if (x.phieu !== undefined && !Array.isArray(x.phieu)) loi.push(`${o}: phieu phải là mảng`);
  if (x.ghiChu !== undefined && typeof x.ghiChu !== 'string') loi.push(`${o}: ghiChu phải là chuỗi`);
  return loi;
}

const TRUONG_CHUOI_CHA = new Set(['nut', 'laLoaiKhac', 'congThuc', 'dieuKienIds', 'truCongThuc']);

/** Kiểm khuôn một bảng bang-anh-em@1. [] = đúng khuôn. */
export function kiemBangAnhEm(x) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return ['không phải đối tượng JSON'];
  const loi = []; const o = x.cha || '(thiếu cha)';
  for (const k of Object.keys(x)) if (!TRUONG_BANG_ANH_EM.has(k)) loi.push(`${o}: trường lạ "${k}" trong bang-anh-em@1`);
  if (x.khuon !== 'bang-anh-em@1') loi.push(`${o}: khuon phải là "bang-anh-em@1", nhận "${x.khuon}"`);
  if (!RE_NUT.test(x.cha || '')) loi.push(`${o}: cha sai ngữ pháp "${x.cha}"`);
  if (!chuoi(x.chuong) || !/^(?:\d{2}|[IVX]+|gir)$/.test(x.chuong)) loi.push(`${o}: chuong sai ngữ pháp "${x.chuong}"`);
  if (!Array.isArray(x.chuoiCha)) {
    loi.push(`${o}: chuoiCha phải là mảng`);
  } else {
    for (const cha of x.chuoiCha) {
      if (!cha || typeof cha !== 'object' || Array.isArray(cha)) { loi.push(`${o}: phần tử chuoiCha không phải object`); continue; }
      for (const k of Object.keys(cha)) if (!TRUONG_CHUOI_CHA.has(k)) loi.push(`${o}: chuoiCha[${cha.nut || '?'}] có trường lạ "${k}"`);
      if (!RE_NUT.test(cha.nut || '')) loi.push(`${o}: chuoiCha.nut sai ngữ pháp "${cha.nut}"`);
      if (typeof cha.laLoaiKhac !== 'boolean') loi.push(`${o}: chuoiCha[${cha.nut || '?'}].laLoaiKhac phải là boolean`);
      if (!cha.congThuc || typeof cha.congThuc !== 'object' || Array.isArray(cha.congThuc)) loi.push(`${o}: chuoiCha[${cha.nut || '?'}].congThuc phải là object`);
      if (!Array.isArray(cha.dieuKienIds) || !cha.dieuKienIds.every(chuoi)) loi.push(`${o}: chuoiCha[${cha.nut || '?'}].dieuKienIds phải là mảng id chuỗi`);
      if (cha.truCongThuc !== undefined) {
        if (!cha.truCongThuc || typeof cha.truCongThuc !== 'object' || Array.isArray(cha.truCongThuc)) {
          loi.push(`${o}: chuoiCha[${cha.nut || '?'}].truCongThuc phải là object`);
        } else {
          for (const [k, v] of Object.entries(cha.truCongThuc)) {
            if (!RE_NUT.test(k) || !v || typeof v !== 'object' || Array.isArray(v)) {
              loi.push(`${o}: chuoiCha[${cha.nut || '?'}].truCongThuc["${k}"] không hợp lệ`);
            }
          }
        }
      }
    }
  }
  if (!Array.isArray(x.anhEm) || x.anhEm.length < 2) {
    loi.push(`${o}: anhEm phải là mảng có ít nhất 2 nút`);
  } else {
    for (const ae of x.anhEm) {
      if (!ae || typeof ae !== 'object' || Array.isArray(ae)) { loi.push(`${o}: phần tử anhEm không phải object`); continue; }
      if (!RE_NUT.test(ae.nut || '')) loi.push(`${o}: anhEm.nut sai ngữ pháp "${ae.nut}"`);
      if (typeof ae.ten !== 'string') loi.push(`${o}: anhEm[${ae.nut || '?'}].ten phải là chuỗi`);
      if (typeof ae.laLoaiKhac !== 'boolean') loi.push(`${o}: anhEm[${ae.nut || '?'}].laLoaiKhac phải là boolean`);
      if (!ae.congThuc || typeof ae.congThuc !== 'object' || Array.isArray(ae.congThuc)) loi.push(`${o}: anhEm[${ae.nut || '?'}].congThuc phải là object`);
      if (!Array.isArray(ae.dieuKienIds) || !ae.dieuKienIds.every(chuoi)) loi.push(`${o}: anhEm[${ae.nut || '?'}].dieuKienIds phải là mảng id chuỗi`);
      if (!Array.isArray(ae.cauHoiToiThieu)) loi.push(`${o}: anhEm[${ae.nut || '?'}].cauHoiToiThieu phải là mảng`);
    }
  }
  if (x.giaiChong !== undefined && !Array.isArray(x.giaiChong)) loi.push(`${o}: giaiChong phải là mảng`);
  if (!Array.isArray(x.co) || !x.co.every((c) => CO_BANG_ANH_EM.includes(c))) {
    loi.push(`${o}: co chỉ gồm ${CO_BANG_ANH_EM.join(' | ')}`);
  }
  if (x.vanTayCau !== undefined) {
    if (!x.vanTayCau || typeof x.vanTayCau !== 'object' || Array.isArray(x.vanTayCau)) {
      loi.push(`${o}: vanTayCau phải là object { [cauId]: sha256 }`);
    } else {
      for (const [k, v] of Object.entries(x.vanTayCau)) {
        if (!RE_CAU.test(k) || /^tb:/.test(k) || !RE_VAN.test(v || '')) {
          loi.push(`${o}: vanTayCau["${k}"] không hợp lệ`);
        }
      }
    }
  }
  if (!RE_VAN.test(x.vanTay || '')) loi.push(`${o}: vanTay phải là sha256 hex`);
  return loi;
}

/** Lỗi hình thức của một bản ghi (vấn đề, BỎ QUA, hoặc loại M-81 DIEU_KIEN/GIAI_CHONG/CANH_TRANH). [] = đúng khuôn. */
export function kiemBanGhi(x) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return ['không phải đối tượng JSON'];
  if (x.loai === 'DIEU_KIEN') return kiemDieuKien(x);
  if (x.loai === 'GIAI_CHONG') return kiemGiaiChong(x);
  if (x.loai === 'CANH_TRANH') return kiemCanhTranh(x);
  const loi = []; const o = x.id || '(thiếu id)';
  const boQua = x.loai === BO_QUA;
  for (const k of Object.keys(x)) if (!(boQua ? TRUONG_BO_QUA : TRUONG_VAN_DE).has(k)) loi.push(`${o}: trường lạ "${k}"${boQua ? ' trong BỎ QUA' : ''}`);
  if (!RE_NUT.test(x.nut || '')) loi.push(`${o}: nut sai ngữ pháp "${x.nut}"`);
  if (!chuoi(x.id) || !x.id.startsWith(`hs:${x.nut}:`) || !/^\d+$/.test(x.id.slice(`hs:${x.nut}:`.length))) loi.push(`${o}: id phải là hs:<nut>:<số>`);
  if (!boQua && !LOAI.includes(x.loai)) loi.push(`${o}: loai lạ "${x.loai}" (chỉ ${LOAI.join(' | ')} | ${BO_QUA})`);
  if (!RE_CAU.test(x.cau || '')) loi.push(`${o}: cau sai ngữ pháp "${x.cau}" (dạng <id nút>#<số câu>)`);
  if (!RE_VAN.test(x.van || '')) loi.push(`${o}: van phải là sha256 hex của chữ câu`);
  if (boQua) {
    if (!chuoi(x.lyDo) || x.lyDo.trim().length < 8) loi.push(`${o}: BỎ QUA phải có lyDo (ít nhất 8 ký tự)`);
    return loi;
  }
  if (!chuoi(x.dieuKien)) loi.push(`${o}: thiếu dieuKien`);
  else if (/\n/.test(x.dieuKien) || x.dieuKien.length > 300) loi.push(`${o}: dieuKien phải là một câu ngắn (một dòng, ≤ 300 ký tự)`);
  if (!chuoi(x.trich)) loi.push(`${o}: thiếu trich`);
  if (!Array.isArray(x.duKien) || !x.duKien.every(chuoi)) loi.push(`${o}: duKien phải là mảng chuỗi (rỗng được)`);
  if (!LOP.has(x.lop)) loi.push(`${o}: lop phải là LUAT hoặc HUONG_DAN, nhận "${x.lop}"`);
  if (!chuoi(x.nguon)) loi.push(`${o}: thiếu nguon`);
  if (!TRANG_THAI.includes(x.trangThai)) loi.push(`${o}: trangThai lạ "${x.trangThai}" (chỉ ${TRANG_THAI.join(' | ')})`);
  if (x.den !== undefined) {
    if (!CO_DEN.has(x.loai)) loi.push(`${o}: loai ${x.loai} không mang den`);
    else if (!Array.isArray(x.den) || !x.den.length || !x.den.every((d) => RE_DICH.test(d))) loi.push(`${o}: den phải là mảng id nút đích (bieu:/chuong:/phan:/gir:)`);
  } else if (x.loai === 'KHONG_DUOC_LA') loi.push(`${o}: KHONG_DUOC_LA phải có den (chuyển đi đâu)`);
  if (x.voi !== undefined) {
    if (!CO_VOI.has(x.loai)) loi.push(`${o}: loai ${x.loai} không mang voi`);
    else if (!Array.isArray(x.voi) || !x.voi.length || !x.voi.every((d) => RE_ANH_EM.test(d))) loi.push(`${o}: voi phải là mảng id nút anh em`);
  } else if (x.loai === 'TACH_ANH_EM') loi.push(`${o}: TACH_ANH_EM phải có voi (tách với anh em nào)`);
  if (x.phuDinh !== undefined) {
    if (!['TACH_ANH_EM', 'PHAI_LA', 'NGUONG'].includes(x.loai)) loi.push(`${o}: chỉ TACH_ANH_EM / PHAI_LA / NGUONG (dòng "Loại khác") mang phuDinh`);
    else if (!Array.isArray(x.phuDinh) || !x.phuDinh.length || !x.phuDinh.every((d) => RE_ANH_EM.test(d))) loi.push(`${o}: phuDinh phải là mảng id nút anh em bị phủ định`);
  }
  if (x.thuatNgu !== undefined && x.loai !== 'DINH_NGHIA') loi.push(`${o}: chỉ DINH_NGHIA mang thuatNgu`);
  if (x.loai === 'DINH_NGHIA' && !chuoi(x.thuatNgu)) loi.push(`${o}: DINH_NGHIA phải có thuatNgu (thuật ngữ được định nghĩa, nguyên chữ luật)`);
  if (x.nguong !== undefined && x.loai !== 'NGUONG') loi.push(`${o}: chỉ NGUONG mang nguong`);
  if (x.loai === 'NGUONG') {
    const n = x.nguong;
    if (!n || typeof n !== 'object') loi.push(`${o}: NGUONG phải có nguong {daiLuong, donVi, tu, den, gomTu, gomDen}`);
    else {
      if (!chuoi(n.daiLuong)) loi.push(`${o}: nguong.daiLuong trống`);
      if (!(n.donVi === null || chuoi(n.donVi))) loi.push(`${o}: nguong.donVi là chuỗi hoặc null`);
      if (!soHoacNull(n.tu) || !soHoacNull(n.den) || (n.tu === null && n.den === null)) loi.push(`${o}: nguong.tu / den là số hoặc null, ít nhất một số`);
      if (typeof n.gomTu !== 'boolean' || typeof n.gomDen !== 'boolean') loi.push(`${o}: nguong.gomTu / gomDen phải là true/false`);
      if (typeof n.tu === 'number' && typeof n.den === 'number' && (n.tu > n.den || (n.tu === n.den && !(n.gomTu && n.gomDen)))) loi.push(`${o}: nguong rỗng (tu > den)`);
      for (const k of Object.keys(n)) if (!['daiLuong', 'donVi', 'tu', 'den', 'gomTu', 'gomDen'].includes(k)) loi.push(`${o}: nguong có trường lạ "${k}"`);
    }
  }
  if (x.tu !== undefined) {
    if (x.loai !== 'PHAI_LA') loi.push(`${o}: chỉ PHAI_LA của cạnh đi vào mang tu`);
    else if (!RE_CAU.test(x.tu) || x.tu !== x.cau) loi.push(`${o}: tu phải là id câu nguồn của cạnh đi vào và trùng cau (trích câu nguồn)`);
  }
  if (x.phieu !== undefined && !Array.isArray(x.phieu)) loi.push(`${o}: phieu phải là mảng`);
  return loi;
}

/** Kiểm một tệp: từng dòng đúng khuôn, nút nằm đúng tệp, id không trùng trong tệp. tuongDoi = "<thư mục>/<khoá>.jsonl". */
export function kiemTep(tuongDoi, noiDung) {
  const loi = []; const banGhi = []; const bangAnhEm = [];
  const norm = tuongDoi.split(path.sep).join('/');
  const mDkPhu = /^(dieu-kien)\/(?:([0-9A-Z]+)-)?(giai-chong|canh-tranh)\.jsonl$/.exec(norm);
  const m = mDkPhu ? [mDkPhu[0], mDkPhu[1], mDkPhu[2] || null, mDkPhu[3]] : /^([a-z-]+)\/([0-9A-Z]+|gir)\.jsonl$/.exec(norm);
  if (!m || !THU_MUC_KHO.includes(m[1])) {
    return { loi: [`${tuongDoi}: tệp lạ (chỉ ${THU_MUC_KHO.map((t) => `${t}/<khoá>.jsonl`).join(', ')})`], banGhi, bangAnhEm };
  }
  const thuMuc = m[1];
  noiDung.split('\n').forEach((l, i) => {
    if (!l.trim()) return;
    let x; try { x = JSON.parse(l); } catch { loi.push(`${tuongDoi}:${i + 1}: không phải JSON`); return; }
    if (thuMuc === THU_MUC_BANG_ANH_EM) {
      const l1 = kiemBangAnhEm(x).map((e) => `${tuongDoi}:${i + 1}: ${e}`);
      if (!l1.length && x.chuong !== m[2]) l1.push(`${tuongDoi}:${i + 1}: ${x.cha}: chuong "${x.chuong}" không khớp tệp ${m[2]}.jsonl`);
      loi.push(...l1);
      bangAnhEm.push({ ...x, _tep: tuongDoi, _dong: i + 1, _hong: l1.length > 0 });
      return;
    }
    const l1 = kiemBanGhi(x).map((e) => `${tuongDoi}:${i + 1}: ${e}`);
    if (!l1.length) {
      const laMoi = LOAI_DIEU_KIEN.includes(x.loai);
      if (thuMuc === THU_MUC_DIEU_KIEN && !laMoi) l1.push(`${tuongDoi}:${i + 1}: ${x.id}: loại ${x.loai} không thuộc thư mục ${THU_MUC_DIEU_KIEN}/`);
      else if (thuMuc !== THU_MUC_DIEU_KIEN && laMoi) l1.push(`${tuongDoi}:${i + 1}: ${x.id}: loại ${x.loai} phải ghi ở thư mục ${THU_MUC_DIEU_KIEN}/`);
      else if (mDkPhu) {
        const loaiDung = m[3] === 'giai-chong' ? 'GIAI_CHONG' : 'CANH_TRANH';
        if (x.loai !== loaiDung) l1.push(`${tuongDoi}:${i + 1}: tệp ${m[3]} chỉ chứa ${loaiDung}, nhận ${x.loai}`);
        else if (m[2] && tepCuaNutKhuon(x.nut, THU_MUC_DIEU_KIEN) !== m[2]) l1.push(`${tuongDoi}:${i + 1}: nút ${x.nut} không khớp khoá ${m[2]}`);
      } else if (tepCuaNutKhuon(x.nut, thuMuc) !== m[2]) {
        const goiY = thuMuc === THU_MUC_DIEU_KIEN
          ? `${THU_MUC_DIEU_KIEN}/${tepCuaNutKhuon(x.nut, THU_MUC_DIEU_KIEN)}.jsonl`
          : G.THU_MUC.filter((t) => G.tepCuaNut(x.nut, t)).map((t) => `${t}/${G.tepCuaNut(x.nut, t)}.jsonl`).join(' hoặc ');
        l1.push(`${tuongDoi}:${i + 1}: ${x.id || x.nut}: nút ${x.nut} không được ghi ở tệp này (đúng: ${goiY})`);
      }
    }
    loi.push(...l1);
    banGhi.push({ ...x, _tep: tuongDoi, _dong: i + 1, _hong: l1.length > 0 });
  });
  return { loi, banGhi, bangAnhEm };
}

/** Kiểm định dạng tệp cấu hình data/ho-so-ma/thu-tu-cuon-chieu.json. [] = đúng khuôn. */
export function kiemThuTuCuonChieu(noiDung) {
  let parsed;
  try {
    parsed = JSON.parse(noiDung);
  } catch {
    return [`${TEN_TEP_THU_TU}: không phải JSON hợp lệ`];
  }
  let ds = null;
  if (Array.isArray(parsed)) {
    ds = parsed;
  } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.thuTu)) {
    ds = parsed.thuTu;
  } else {
    return [`${TEN_TEP_THU_TU}: phải là mảng hoặc đối tượng có mảng thuTu`];
  }
  const loi = [];
  ds.forEach((muc, i) => {
    let raw = null;
    if (typeof muc === 'string') {
      raw = muc;
    } else if (muc && typeof muc === 'object' && !Array.isArray(muc) && typeof muc.nhom === 'string') {
      raw = muc.nhom;
    } else {
      loi.push(`${TEN_TEP_THU_TU}: phần tử [${i}] phải là chuỗi mã nhóm 4 số hoặc đối tượng có trường nhom`);
      return;
    }
    const gonMa = raw.trim();
    if (!/^\d{2}\.?\d{2}$/.test(gonMa)) {
      loi.push(`${TEN_TEP_THU_TU}: phần tử [${i}] mã nhóm "${raw}" không phải 4 chữ số hợp lệ`);
    }
  });
  return loi;
}

/** Kiểm cả kho hồ sơ. Trả mọi bản ghi (bản ghi hỏng mang _hong) và bangAnhEm. Thư mục chưa có = kho rỗng. */
export function kiemKhoHoSo(goc = G.HO_SO_MAC_DINH) {
  const loi = []; const banGhi = []; const bangAnhEm = []; let soTep = 0;
  if (!fs.existsSync(goc)) return { loi, banGhi, bangAnhEm, soTep };
  for (const e of fs.readdirSync(goc, { withFileTypes: true })) {
    if (e.isFile() && e.name === TEN_TEP_THU_TU) {
      loi.push(...kiemThuTuCuonChieu(fs.readFileSync(path.join(goc, e.name), 'utf8')));
      continue;
    }
    if (!e.isDirectory() || !THU_MUC_KHO.includes(e.name)) loi.push(`${e.name}: lạ ở gốc kho hồ sơ (chỉ ${THU_MUC_KHO.join(', ')})`);
  }
  for (const tm of THU_MUC_KHO) {
    if (!fs.existsSync(path.join(goc, tm))) continue;
    for (const f of fs.readdirSync(path.join(goc, tm)).sort()) {
      soTep += 1;
      const r = kiemTep(`${tm}/${f}`, fs.readFileSync(path.join(goc, tm, f), 'utf8'));
      loi.push(...r.loi); banGhi.push(...r.banGhi); bangAnhEm.push(...r.bangAnhEm);
    }
  }
  const daThay = new Map();
  for (const x of banGhi) {
    if (!x.id) continue;
    if (daThay.has(x.id)) { loi.push(`${x._tep}:${x._dong}: trùng id ${x.id} (đã có ở ${daThay.get(x.id)})`); x._hong = true; } else daThay.set(x.id, `${x._tep}:${x._dong}`);
  }
  return { loi, banGhi, bangAnhEm, soTep };
}

function main() {
  const a = process.argv.slice(2); const i = a.indexOf('--ho-so');
  const goc = i >= 0 ? path.resolve(a[i + 1]) : G.HO_SO_MAC_DINH;
  const r = kiemKhoHoSo(goc);
  console.log(`${r.loi.length ? 'FAIL' : 'PASS'} khuôn ${G.KHUON}: ${r.soTep} tệp, ${r.banGhi.length} bản ghi${r.bangAnhEm.length ? `, ${r.bangAnhEm.length} bảng anh em` : ''}, ${r.loi.length} lỗi${fs.existsSync(goc) ? '' : ' (chưa có kho hồ sơ)'}`);
  for (const l of r.loi.slice(0, 60)) console.log(`  ✗ ${l}`);
  process.exit(r.loi.length ? 1 : 0);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
