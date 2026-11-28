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
export const THU_MUC_DOC_MOT_LAN = 'doc-mot-lan';
export const THU_MUC_HO_SO = Object.freeze([...G.THU_MUC, THU_MUC_DIEU_KIEN]);
export const THU_MUC_KHO = Object.freeze([...THU_MUC_HO_SO, THU_MUC_BANG_ANH_EM, THU_MUC_DOC_MOT_LAN]);
export const KET_QUA_MA8_M82 = Object.freeze(['ĐÚNG', 'SAI', 'CHƯA ĐỦ DỮ KIỆN']);
export const KET_LUAN_MO_HO_M82 = Object.freeze(['CHỐT', 'CHỐT KÈM GIẢ ĐỊNH', 'CHƯA ĐỦ DỮ KIỆN']);
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
const TRUONG_CANH_TRANH = new Set(['id', 'nut', 'loai', 'nhomCanhTranh', 'phepThu', 'khongCanhTranh', 'trich', 'nguon', 'vanTay', 'trangThai', 'phieu', 'ghiChu']);
const TRUONG_PHEP_THU_MUC = new Set(['nguon', 'trich', 'vanTay', 'nhom']);
const TRUONG_KHONG_CANH_TRANH_MUC = new Set(['nhom', 'nguon', 'trich', 'vanTay', 'lyDo']);
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
  if (x.khongCanhTranh !== undefined) {
    if (!Array.isArray(x.khongCanhTranh)) {
      loi.push(`${o}: khongCanhTranh phải là mảng`);
    } else {
      x.khongCanhTranh.forEach((m, idx) => {
        if (!m || typeof m !== 'object' || Array.isArray(m)) {
          loi.push(`${o}: khongCanhTranh[${idx}] phải là object {nhom, nguon, trich}`);
          return;
        }
        for (const k of Object.keys(m)) {
          if (!TRUONG_KHONG_CANH_TRANH_MUC.has(k)) loi.push(`${o}: khongCanhTranh[${idx}] có trường lạ "${k}"`);
        }
        if (typeof m.nhom !== 'string' || !RE_DICH.test(m.nhom)) {
          loi.push(`${o}: khongCanhTranh[${idx}].nhom phải là id nút đích hợp lệ`);
        }
        if (typeof m.nguon !== 'string' || !RE_CAU.test(m.nguon) || /^(?:tb|wco):/.test(m.nguon)) {
          loi.push(`${o}: khongCanhTranh[${idx}].nguon phải là id câu luật hợp lệ (cấm tb: và wco:)`);
        }
        if (!chuoi(m.trich)) {
          loi.push(`${o}: khongCanhTranh[${idx}].trich phải là chuỗi không rỗng`);
        }
        if (m.vanTay !== undefined && (typeof m.vanTay !== 'string' || !RE_VAN.test(m.vanTay))) {
          loi.push(`${o}: khongCanhTranh[${idx}].vanTay phải là sha256 hex`);
        }
        if (m.lyDo !== undefined && typeof m.lyDo !== 'string') {
          loi.push(`${o}: khongCanhTranh[${idx}].lyDo phải là chuỗi`);
        }
      });
    }
  }
  const coKhongCanhTranh = Array.isArray(x.khongCanhTranh) && x.khongCanhTranh.length > 0;
  if (coKhongCanhTranh) {
    if (x.nhomCanhTranh !== undefined && (!Array.isArray(x.nhomCanhTranh) || !x.nhomCanhTranh.every((d) => typeof d === 'string' && RE_DICH.test(d)))) {
      loi.push(`${o}: nhomCanhTranh phải là mảng các id nút đích`);
    }
  } else if (!Array.isArray(x.nhomCanhTranh) || !x.nhomCanhTranh.length || !x.nhomCanhTranh.every((d) => typeof d === 'string' && RE_DICH.test(d))) {
    loi.push(`${o}: nhomCanhTranh phải là mảng không rỗng các id nút đích`);
  }
  const coNhomCanhTranh = Array.isArray(x.nhomCanhTranh) && x.nhomCanhTranh.length > 0;
  const hopLeMucPhepThu = (p) => {
    if (typeof p === 'string') return RE_CAU.test(p) && !/^(?:tb|wco):/.test(p);
    if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
    if (!Object.keys(p).every((k) => TRUONG_PHEP_THU_MUC.has(k))) return false;
    if (typeof p.nguon !== 'string' || !RE_CAU.test(p.nguon) || /^(?:tb|wco):/.test(p.nguon)) return false;
    if (!chuoi(p.trich)) return false;
    if (p.vanTay !== undefined && (typeof p.vanTay !== 'string' || !RE_VAN.test(p.vanTay))) return false;
    if (p.nhom !== undefined && (typeof p.nhom !== 'string' || !RE_DICH.test(p.nhom))) return false;
    return true;
  };
  if (coKhongCanhTranh && !coNhomCanhTranh) {
    if (x.phepThu !== undefined && (!Array.isArray(x.phepThu) || !x.phepThu.every(hopLeMucPhepThu))) {
      loi.push(`${o}: phepThu phải là mảng các id câu luật hoặc {nguon, trich} hợp lệ (cấm tb: và wco:)`);
    }
  } else {
    const phepThuHopLe = Array.isArray(x.phepThu) && x.phepThu.length > 0 && x.phepThu.every(hopLeMucPhepThu);
    if (!phepThuHopLe) loi.push(`${o}: phepThu phải là mảng không rỗng id câu hoặc {nguon, trich} (cấm tb: và wco:)`);
  }
  if (Array.isArray(x.nhomCanhTranh) && Array.isArray(x.khongCanhTranh)) {
    const tapCt = new Set(x.nhomCanhTranh.filter((d) => typeof d === 'string'));
    const trung = [...new Set(
      x.khongCanhTranh
        .map((m) => (m && typeof m === 'object' ? m.nhom : null))
        .filter((d) => typeof d === 'string' && tapCt.has(d)),
    )];
    if (trung.length) {
      loi.push(`${o}: mục đích trùng nhau giữa nhomCanhTranh và khongCanhTranh (${trung.join(', ')})`);
    }
  }
  if (!chuoi(x.trich)) loi.push(`${o}: thiếu trich`);
  if (!RE_CAU.test(x.nguon || '') || /^(?:tb|wco):/.test(x.nguon || '')) loi.push(`${o}: nguon sai ngữ pháp "${x.nguon}" (dạng <id nút>#<số câu>, cấm tb: và wco:)`);
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

/** Kiểm đệ quy không lọt nguồn cấm tb:/wco: trong mọi bản ghi doc-mot-lan (M-82, ADR-0011). */
function quetNguonCamDocMotLan(obj, o, loi) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => quetNguonCamDocMotLan(v, `${o}[${i}]`, loi));
    return;
  }
  for (const k of ['idCau', 'nguon']) {
    if (typeof obj[k] === 'string' && /^(?:tb|wco):/i.test(obj[k])) {
      loi.push(`${o}.${k}: cấm nguồn ${obj[k]} trong doc-mot-lan`);
    }
  }
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') quetNguonCamDocMotLan(v, `${o}.${k}`, loi);
  }
}

function kiemCanCuDocMotLan(arr, o, loi, batBuocKhongRong = true) {
  if (!Array.isArray(arr) || (batBuocKhongRong && arr.length === 0)) {
    loi.push(`${o}: phải là mảng căn cứ${batBuocKhongRong ? ' không rỗng' : ''}`);
    return;
  }
  arr.forEach((c, i) => {
    const p = `${o}[${i}]`;
    if (!c || typeof c !== 'object' || Array.isArray(c)) { loi.push(`${p}: phải là object`); return; }
    const idCau = c.idCau ?? c.nguon;
    if (!chuoi(idCau) || !RE_CAU.test(idCau)) loi.push(`${p}: idCau sai ngữ pháp "${idCau}"`);
    else if (/^(?:tb|wco):/i.test(idCau)) loi.push(`${p}: cấm nguồn ${idCau}`);
    if (!chuoi(c.trich)) loi.push(`${p}: thiếu trich nguyên văn`);
  });
}

function kiemMucDiemMoHo(m, o, loi) {
  if (!m || typeof m !== 'object' || Array.isArray(m)) { loi.push(`${o}: điểm mơ hồ phải là object`); return; }
  if (!chuoi(m.id)) loi.push(`${o}: thiếu id`);
  if (!RE_NUT.test(m.nut || '')) loi.push(`${o}: nut sai ngữ pháp "${m.nut}"`);
  if (!chuoi(m.cauHoi)) loi.push(`${o}: thiếu cauHoi`);
  if (!Array.isArray(m.cachHieu) || m.cachHieu.length === 0 || !m.cachHieu.every(chuoi)) {
    loi.push(`${o}: cachHieu phải là mảng chuỗi không rỗng`);
  }
  kiemCanCuDocMotLan(m.canCu, `${o}.canCu`, loi, true);
}

/** Kiểm khuôn chuong.json (doc-mot-lan-chuong@1, ADR-0011). [] = đúng khuôn. */
export function kiemChuongDocMotLan(x, chuong) {
  const loi = [];
  const o = `${THU_MUC_DOC_MOT_LAN}/${chuong}/chuong.json`;
  if (!x || typeof x !== 'object' || Array.isArray(x)) return [`${o}: phải là JSON object`];
  if (x.khuon !== 'doc-mot-lan-chuong@1') loi.push(`${o}: khuon phải là "doc-mot-lan-chuong@1", nhận "${x.khuon}"`);
  if (x.ma !== chuong) loi.push(`${o}: ma "${x.ma}" không khớp thư mục "${chuong}"`);
  if (x.nut !== `chuong:${chuong}`) loi.push(`${o}: nut phải là "chuong:${chuong}", nhận "${x.nut}"`);
  if (!chuoi(x.ten)) loi.push(`${o}: thiếu ten`);
  if (!chuoi(x.nguoiDoc)) loi.push(`${o}: thiếu nguoiDoc`);
  if (!RE_VAN.test(x.vanTayGoi || '')) loi.push(`${o}: vanTayGoi phải là sha256 64 hex`);
  if (x.canCu !== undefined) kiemCanCuDocMotLan(x.canCu, `${o}.canCu`, loi, true);
  for (const k of ['phamVi', 'loaiTru', 'dinhNghia', 'uuTien', 'trucChinh', 'canhTranh', 'diemMoHo']) {
    if (!Array.isArray(x[k])) loi.push(`${o}: ${k} phải là mảng`);
  }
  if (Array.isArray(x.diemMoHo)) x.diemMoHo.forEach((m, i) => kiemMucDiemMoHo(m, `${o}.diemMoHo[${i}]`, loi));
  quetNguonCamDocMotLan(x, o, loi);
  return loi;
}

/** Kiểm khuôn <nhom>.json (doc-mot-lan-nhom@1, ADR-0011). [] = đúng khuôn. */
export function kiemNhomDocMotLan(x, chuong, nhom) {
  const loi = [];
  const o = `${THU_MUC_DOC_MOT_LAN}/${chuong}/${nhom}.json`;
  if (!x || typeof x !== 'object' || Array.isArray(x)) return [`${o}: phải là JSON object`];
  if (x.khuon !== 'doc-mot-lan-nhom@1') loi.push(`${o}: khuon phải là "doc-mot-lan-nhom@1", nhận "${x.khuon}"`);
  if (!x.nhom || typeof x.nhom !== 'object' || Array.isArray(x.nhom)) {
    loi.push(`${o}: thiếu khối nhom`);
  } else {
    if (x.nhom.ma !== nhom) loi.push(`${o}: nhom.ma "${x.nhom.ma}" không khớp tệp ${nhom}.json`);
    if (x.nhom.nut !== `bieu:${nhom}`) loi.push(`${o}: nhom.nut phải là "bieu:${nhom}", nhận "${x.nhom.nut}"`);
    if (!chuoi(x.nhom.ten)) loi.push(`${o}: thiếu nhom.ten`);
    if (!chuoi(x.nhom.nguoiDoc)) loi.push(`${o}: thiếu nhom.nguoiDoc`);
    if (!RE_VAN.test(x.nhom.vanTayGoi || '')) loi.push(`${o}: nhom.vanTayGoi phải là sha256 64 hex`);
    if (!Array.isArray(x.nhom.canhTranh)) loi.push(`${o}: nhom.canhTranh phải là mảng`);
    if (!Array.isArray(x.nhom.khongCanhTranh)) loi.push(`${o}: nhom.khongCanhTranh phải là mảng`);
  }
  if (!Array.isArray(x.dieuKien) || x.dieuKien.length === 0) {
    loi.push(`${o}: dieuKien phải là mảng không rỗng`);
  } else {
    const daThay = new Set();
    x.dieuKien.forEach((dk, i) => {
      const l1 = kiemBanGhi(dk);
      for (const e of l1) loi.push(`${o}.dieuKien[${i}]: ${e}`);
      if (!l1.length) {
        if (!LOAI_DIEU_KIEN.includes(dk.loai)) loi.push(`${o}.dieuKien[${i}]: loại ${dk.loai} không thuộc DIEU_KIEN/GIAI_CHONG/CANH_TRANH`);
        else if (tepCuaNutKhuon(dk.nut, THU_MUC_DIEU_KIEN) !== chuong) loi.push(`${o}.dieuKien[${i}]: nút ${dk.nut} không thuộc chương ${chuong}`);
      }
      if (dk?.id) {
        if (daThay.has(dk.id)) loi.push(`${o}.dieuKien[${i}]: trùng id ${dk.id}`);
        else daThay.add(dk.id);
      }
    });
  }
  if (!Array.isArray(x.ma8) || x.ma8.length === 0) {
    loi.push(`${o}: ma8 phải là mảng không rỗng`);
  } else {
    const maSeen = new Set();
    x.ma8.forEach((m, i) => {
      const p = `${o}.ma8[${i}]`;
      if (!m || typeof m !== 'object' || Array.isArray(m)) { loi.push(`${p}: phải là object`); return; }
      if (!chuoi(m.ma) || !/^bieu:\d{8}$/.test(m.ma) || !m.ma.startsWith(`bieu:${nhom}`)) {
        loi.push(`${p}: ma "${m.ma}" phải là bieu:${nhom}NNNN`);
      } else if (maSeen.has(m.ma)) {
        loi.push(`${p}: trùng mã 8 số ${m.ma}`);
      } else {
        maSeen.add(m.ma);
      }
      if (!KET_QUA_MA8_M82.includes(m.ketQua)) {
        loi.push(`${p}: ketQua lạ "${m.ketQua}" (chỉ ${KET_QUA_MA8_M82.join(' | ')})`);
      } else if (m.ketQua === 'CHƯA ĐỦ DỮ KIỆN' && !chuoi(m.cauHoi)) {
        loi.push(`${p}: ${m.ma} CHƯA ĐỦ DỮ KIỆN nhưng thiếu cauHoi`);
      }
    });
  }
  if (!Array.isArray(x.diemMoHo)) {
    loi.push(`${o}: diemMoHo phải là mảng`);
  } else {
    x.diemMoHo.forEach((m, i) => kiemMucDiemMoHo(m, `${o}.diemMoHo[${i}]`, loi));
  }
  quetNguonCamDocMotLan(x, o, loi);
  return loi;
}

/** Kiểm khuôn một dòng diem-mo-ho.jsonl (doc-mot-lan-mo-ho@1, ADR-0011). [] = đúng khuôn. */
export function kiemMoHoDocMotLan(x, chuong) {
  const loi = [];
  const o = x?.id || '(thiếu id)';
  if (!x || typeof x !== 'object' || Array.isArray(x)) return ['diem-mo-ho: phải là JSON object'];
  if (x.khuon !== 'doc-mot-lan-mo-ho@1') loi.push(`${o}: khuon phải là "doc-mot-lan-mo-ho@1", nhận "${x.khuon}"`);
  if (!chuoi(x.id)) loi.push(`${o}: thiếu id`);
  if (!RE_NUT.test(x.nut || '')) loi.push(`${o}: nut sai ngữ pháp "${x.nut}"`);
  if (!chuoi(x.nhom) || !(x.nhom === chuong || (x.nhom.startsWith(chuong) && /^\d{4}$/.test(x.nhom)))) {
    loi.push(`${o}: nhom "${x.nhom}" không khớp chương "${chuong}"`);
  }
  if (!chuoi(x.cauHoi)) loi.push(`${o}: thiếu cauHoi`);
  if (!Array.isArray(x.cachHieu) || x.cachHieu.length === 0 || !x.cachHieu.every(chuoi)) {
    loi.push(`${o}: cachHieu phải là mảng chuỗi không rỗng`);
  }
  kiemCanCuDocMotLan(x.canCuNguoiDoc, `${o}.canCuNguoiDoc`, loi, true);
  if (!chuoi(x.nguoiDoc)) loi.push(`${o}: thiếu nguoiDoc`);
  if (!chuoi(x.nguoiPhanBien)) loi.push(`${o}: thiếu nguoiPhanBien`);
  if (x.soVongPhanBien !== 1) loi.push(`${o}: soVongPhanBien phải bằng 1 theo ADR-0011 (nhận ${x.soVongPhanBien})`);
  if (!x.phanBien || typeof x.phanBien !== 'object' || Array.isArray(x.phanBien)) {
    loi.push(`${o}: thiếu khối phanBien`);
  } else {
    if (!chuoi(x.phanBien.giaiThich)) loi.push(`${o}.phanBien: thiếu giaiThich`);
    kiemCanCuDocMotLan(x.phanBien.chungMinh, `${o}.phanBien.chungMinh`, loi, true);
    if (!chuoi(x.phanBien.phanBien)) loi.push(`${o}.phanBien: thiếu phanBien`);
    if (!KET_LUAN_MO_HO_M82.includes(x.phanBien.ketLuan)) {
      loi.push(`${o}.phanBien: ketLuan lạ "${x.phanBien.ketLuan}" (chỉ ${KET_LUAN_MO_HO_M82.join(' | ')})`);
    }
  }
  if (!x.chotNguoiDoc || typeof x.chotNguoiDoc !== 'object' || Array.isArray(x.chotNguoiDoc)) {
    loi.push(`${o}: thiếu khối chotNguoiDoc`);
  } else {
    if (typeof x.chotNguoiDoc.dongYPhanBien !== 'boolean') loi.push(`${o}.chotNguoiDoc: dongYPhanBien phải là boolean`);
    if (typeof x.chotNguoiDoc.doiKetLuanSauPhanBien !== 'boolean') loi.push(`${o}.chotNguoiDoc: doiKetLuanSauPhanBien phải là boolean`);
    if (!KET_LUAN_MO_HO_M82.includes(x.chotNguoiDoc.ketLuanCuoi)) {
      loi.push(`${o}.chotNguoiDoc: ketLuanCuoi lạ "${x.chotNguoiDoc.ketLuanCuoi}"`);
    } else if (x.chotNguoiDoc.ketLuanCuoi === 'CHƯA ĐỦ DỮ KIỆN' && !chuoi(x.chotNguoiDoc.cauHoiKhach)) {
      loi.push(`${o}.chotNguoiDoc: CHƯA ĐỦ DỮ KIỆN nhưng thiếu cauHoiKhach`);
    }
    if (!chuoi(x.chotNguoiDoc.lyDo)) loi.push(`${o}.chotNguoiDoc: thiếu lyDo`);
  }
  quetNguonCamDocMotLan(x, o, loi);
  return loi;
}

/** Kiểm một tệp nằm trong doc-mot-lan/<chuong>/<tep>. */
export function kiemTepDocMotLan(tuongDoi, noiDung) {
  const loi = [];
  const norm = tuongDoi.split(path.sep).join('/');
  const m = /^doc-mot-lan\/(\d{2})\/([^/]+)$/.exec(norm);
  if (!m) return { loi: [`${tuongDoi}: đường dẫn sai khuôn (chỉ doc-mot-lan/<2-chữ-số>/<tệp>)`], soBanGhi: 0 };
  const [, chuong, tenTep] = m;
  if (tenTep === 'chuong.json') {
    let x; try { x = JSON.parse(noiDung); } catch { return { loi: [`${norm}: không phải JSON hợp lệ`], soBanGhi: 0 }; }
    return { loi: kiemChuongDocMotLan(x, chuong), soBanGhi: 1 };
  }
  const mNhom = /^(\d{4})\.json$/.exec(tenTep);
  if (mNhom) {
    if (!mNhom[1].startsWith(chuong)) return { loi: [`${norm}: nhóm ${mNhom[1]} không thuộc chương ${chuong}`], soBanGhi: 0 };
    let x; try { x = JSON.parse(noiDung); } catch { return { loi: [`${norm}: không phải JSON hợp lệ`], soBanGhi: 0 }; }
    return { loi: kiemNhomDocMotLan(x, chuong, mNhom[1]), soBanGhi: 1 };
  }
  if (tenTep === 'diem-mo-ho.jsonl') {
    const daThay = new Set(); let dem = 0;
    noiDung.split('\n').forEach((l, i) => {
      if (!l.trim()) return;
      dem += 1;
      let x; try { x = JSON.parse(l); } catch { loi.push(`${norm}:${i + 1}: không phải JSON`); return; }
      for (const e of kiemMoHoDocMotLan(x, chuong)) loi.push(`${norm}:${i + 1}: ${e}`);
      if (x?.id) {
        if (daThay.has(x.id)) loi.push(`${norm}:${i + 1}: trùng id ${x.id}`);
        else daThay.add(x.id);
      }
    });
    return { loi, soBanGhi: dem };
  }
  if (tenTep === 'dieu-kien.jsonl') {
    const daThay = new Set(); let dem = 0;
    noiDung.split('\n').forEach((l, i) => {
      if (!l.trim()) return;
      dem += 1;
      let x; try { x = JSON.parse(l); } catch { loi.push(`${norm}:${i + 1}: không phải JSON`); return; }
      const l1 = kiemBanGhi(x);
      for (const e of l1) loi.push(`${norm}:${i + 1}: ${e}`);
      if (!l1.length) {
        if (!LOAI_DIEU_KIEN.includes(x.loai)) loi.push(`${norm}:${i + 1}: loại ${x.loai} không thuộc DIEU_KIEN/GIAI_CHONG/CANH_TRANH`);
        else if (tepCuaNutKhuon(x.nut, THU_MUC_DIEU_KIEN) !== chuong) loi.push(`${norm}:${i + 1}: nút ${x.nut} không thuộc chương ${chuong}`);
      }
      if (x?.id) {
        if (daThay.has(x.id)) loi.push(`${norm}:${i + 1}: trùng id ${x.id}`);
        else daThay.add(x.id);
      }
    });
    return { loi, soBanGhi: dem };
  }
  if (tenTep === 'bang-anh-em.jsonl') {
    let dem = 0;
    noiDung.split('\n').forEach((l, i) => {
      if (!l.trim()) return;
      dem += 1;
      let x; try { x = JSON.parse(l); } catch { loi.push(`${norm}:${i + 1}: không phải JSON`); return; }
      const l1 = kiemBangAnhEm(x);
      if (!l1.length && x.chuong !== chuong) l1.push(`${x.cha}: chuong "${x.chuong}" không khớp chương ${chuong}`);
      for (const e of l1) loi.push(`${norm}:${i + 1}: ${e}`);
    });
    return { loi, soBanGhi: dem };
  }
  return { loi: [`${norm}: tệp lạ trong ${THU_MUC_DOC_MOT_LAN}/${chuong}/ (chỉ chuong.json, <nhóm>.json, diem-mo-ho.jsonl, dieu-kien.jsonl, bang-anh-em.jsonl)`], soBanGhi: 0 };
}

/** Kiểm toàn bộ thư mục data/ho-so-ma/doc-mot-lan/ (M-82, ADR-0011). Không bỏ qua im lặng. */
export function kiemThuMucDocMotLan(gocDocMotLan) {
  const loi = []; let soTep = 0; let soBanGhiDocMotLan = 0;
  if (!fs.existsSync(gocDocMotLan)) return { loi, soTep, soBanGhiDocMotLan };
  for (const e of fs.readdirSync(gocDocMotLan, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!e.isDirectory() || !/^\d{2}$/.test(e.name)) {
      loi.push(`${THU_MUC_DOC_MOT_LAN}/${e.name}: lạ trong ${THU_MUC_DOC_MOT_LAN}/ (chỉ thư mục chương 2 chữ số)`);
      continue;
    }
    const tmCh = path.join(gocDocMotLan, e.name);
    for (const f of fs.readdirSync(tmCh, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const tuongDoi = `${THU_MUC_DOC_MOT_LAN}/${e.name}/${f.name}`;
      if (!f.isFile()) {
        loi.push(`${tuongDoi}: không cho phép thư mục con trong ${THU_MUC_DOC_MOT_LAN}/${e.name}/`);
        continue;
      }
      soTep += 1;
      const r = kiemTepDocMotLan(tuongDoi, fs.readFileSync(path.join(tmCh, f.name), 'utf8'));
      loi.push(...r.loi);
      soBanGhiDocMotLan += r.soBanGhi;
    }
  }
  return { loi, soTep, soBanGhiDocMotLan };
}

/** Kiểm một tệp: từng dòng đúng khuôn, nút nằm đúng tệp, id không trùng trong tệp. tuongDoi = "<thư mục>/<khoá>.jsonl". */
export function kiemTep(tuongDoi, noiDung) {
  const loi = []; const banGhi = []; const bangAnhEm = [];
  const norm = tuongDoi.split(path.sep).join('/');
  if (norm.startsWith(`${THU_MUC_DOC_MOT_LAN}/`)) {
    const r = kiemTepDocMotLan(norm, noiDung);
    return { loi: r.loi, banGhi, bangAnhEm };
  }
  const mDkPhu = /^(dieu-kien)\/(?:([0-9A-Z]+)-)?(giai-chong|canh-tranh)\.jsonl$/.exec(norm);
  const m = mDkPhu ? [mDkPhu[0], mDkPhu[1], mDkPhu[2] || null, mDkPhu[3]] : /^([a-z-]+)\/([0-9A-Z]+|gir)\.jsonl$/.exec(norm);
  if (!m || !THU_MUC_KHO.includes(m[1]) || m[1] === THU_MUC_DOC_MOT_LAN) {
    return { loi: [`${tuongDoi}: tệp lạ (chỉ ${THU_MUC_KHO.map((t) => (t === THU_MUC_DOC_MOT_LAN ? `${t}/<ch>/<tệp>` : `${t}/<khoá>.jsonl`)).join(', ')})`], banGhi, bangAnhEm };
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
    if (tm === THU_MUC_DOC_MOT_LAN) {
      const rDml = kiemThuMucDocMotLan(path.join(goc, tm));
      loi.push(...rDml.loi);
      soTep += rDml.soTep;
      continue;
    }
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
