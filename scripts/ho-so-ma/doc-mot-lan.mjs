#!/usr/bin/env node
// scripts/ho-so-ma/doc-mot-lan.mjs — M-82 (#2483, ADR-0011):
//   1. Máy kiểm tất định duy nhất một điều: mọi câu trích (canCu, trich, chungMinh, phepThu, khongCanhTranh, tapDuTrich)
//      có thật nguyên văn trong data/luat-goc và gắn đúng câu nguồn, cộng khuôn QT mục 3 (tương thích 100% với khuon.mjs)
//      và phủ đủ nút Chương / Nhóm 4 số / Phân nhóm 6 số / Dòng 8 số.
//   2. Dựng tất định bang-anh-em.jsonl và khối ma6 / ma8 (kèm ketQua ĐÚNG / CHƯA ĐỦ DỮ KIỆN + cauHoi) trong <nhóm>.json.
//   3. Cổng 6–14 cũ chỉ chạy ở chế độ CẢNH BÁO (không phải điều kiện nghiệm thu, không làm đỏ mã thoát).
//
//   node scripts/ho-so-ma/doc-mot-lan.mjs --kiem --chuong 94 [--luat data/luat-goc] [--ho-so data/ho-so-ma]
//   node scripts/ho-so-ma/doc-mot-lan.mjs --dung-bang --chuong 94 --nguoi-doc <model> [--luat data/luat-goc] [--ho-so data/ho-so-ma]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { napLuatCong, chayCong, danhGiaChuoi468, chuanSo, vanTay } from './cong.mjs';
import { napBieuMeta, laLoaiKhacThuan, taoBangChoCha } from './bang-anh-em.mjs';
import { kiemBanGhi, kiemBangAnhEm, LOAI_DIEU_KIEN, THU_MUC_DIEU_KIEN, tepCuaNutKhuon } from './khuon.mjs';
import { chuanChuong2, dungGoiChuong } from './goi-chuong.mjs';
import { dungGoiNhom, lietKeNhom4, thuThapCayNhom } from './goi-nhom.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');

export const THU_MUC_DOC_MOT_LAN = 'doc-mot-lan';
export const KET_QUA_MA8_M82 = Object.freeze(['ĐÚNG', 'SAI', 'CHƯA ĐỦ DỮ KIỆN']);
export const KET_LUAN_MO_HO_M82 = Object.freeze(['CHỐT', 'CHỐT KÈM GIẢ ĐỊNH', 'CHƯA ĐỦ DỮ KIỆN']);

const RE_NUT = /^(?:gir:[1-6](?::[a-c])?|phan:[IVX]+|chuong:\d{2}(?::pc:[IVX]+)?|bieu:\d{4,8}(?::td\d+)*)$/;
const RE_CAU = /^(?:gir|phan|chuong|nhom|pn|bieu|sen|wco|tb):[^#\s]+#\d+$/;
const RE_VAN = /^[0-9a-f]{64}$/;

const chuoi = (v) => typeof v === 'string' && v.trim().length > 0;
const gon = (s) => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

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
export function kiemMoHoDocMotLan(x, chuong = null) {
  const loi = [];
  const o = x?.id || '(thiếu id)';
  if (!x || typeof x !== 'object' || Array.isArray(x)) return ['diem-mo-ho: phải là JSON object'];
  if (x.khuon !== 'doc-mot-lan-mo-ho@1') loi.push(`${o}: khuon phải là "doc-mot-lan-mo-ho@1", nhận "${x.khuon}"`);
  if (!chuoi(x.id)) loi.push(`${o}: thiếu id`);
  if (!RE_NUT.test(x.nut || '')) loi.push(`${o}: nut sai ngữ pháp "${x.nut}"`);
  if (!chuoi(x.nhom) || (chuong && !(x.nhom === chuong || (x.nhom.startsWith(chuong) && /^\d{4}$/.test(x.nhom))))) {
    loi.push(`${o}: nhom "${x.nhom}" không khớp chương "${chuong || '?'}"`);
  }
  if (!chuoi(x.cauHoi)) loi.push(`${o}: thiếu cauHoi`);
  if (!Array.isArray(x.cachHieu) || x.cachHieu.length < 2 || !x.cachHieu.every(chuoi)) {
    loi.push(`${o}: cachHieu phải là mảng có ít nhất 2 cách hiểu không rỗng`);
  }
  kiemCanCuDocMotLan(x.canCuNguoiDoc, `${o}.canCuNguoiDoc`, loi, true);
  if (!chuoi(x.nguoiDoc)) loi.push(`${o}: thiếu nguoiDoc`);
  if (!chuoi(x.nguoiPhanBien)) {
    loi.push(`${o}: thiếu nguoiPhanBien`);
  } else if (chuoi(x.nguoiDoc) && x.nguoiPhanBien.trim() === x.nguoiDoc.trim()) {
    loi.push(`${o}: nguoiPhanBien phải là mô hình khác với nguoiDoc ("${x.nguoiDoc}")`);
  }
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

/** Kiểm một tệp nằm trong doc-mot-lan/<chuong>/<tep> (tương thích 100% với khuon.mjs M-82). */
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

/** Kiểm toàn bộ thư mục data/ho-so-ma/doc-mot-lan/ (tách độc lập không sửa trùng khuon.mjs với PR #2484). */
export function kiemKhoDocMotLan(hoSo = G.HO_SO_MAC_DINH) {
  const gocDocMotLan = path.join(hoSo, THU_MUC_DOC_MOT_LAN);
  const loi = []; let soTep = 0; let soBanGhiDocMotLan = 0;
  if (!fs.existsSync(gocDocMotLan)) return { loi, soTep, soBanGhiDocMotLan };
  for (const e of fs.readdirSync(gocDocMotLan, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!e.isDirectory() || !/^\d{2}$/.test(e.name)) {
      loi.push(`${THU_MUC_DOC_MOT_LAN}/${e.name}: lạ trong ${THU_MUC_DOC_MOT_LAN}/ (chỉ thư mục chương 2 chữ số)`);
      continue;
    }
    const tmCh = path.join(gocDocMotLan, e.name);
    const entries = fs.readdirSync(tmCh, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    if (entries.length === 0) {
      loi.push(`${THU_MUC_DOC_MOT_LAN}/${e.name}: thư mục chương rỗng`);
      continue;
    }
    for (const f of entries) {
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

/** Kiểm một cặp (idCau, trich) có tồn tại thật trong data/luat-goc (cấm tb:/wco:) và trich là chuỗi con nguyên văn của câu nguồn. */
export function kiemTrichNguyenVan(idCau, trich, L) {
  if (typeof idCau !== 'string' || !idCau.includes('#')) {
    return { ok: false, lyDo: `idCau sai ngữ pháp "${idCau}"` };
  }
  if (/^(?:tb|wco):/i.test(idCau)) {
    return { ok: false, lyDo: `idCau "${idCau}" thuộc nguồn cấm (tb:/wco:)` };
  }
  if (!L.cau.has(idCau)) {
    return { ok: false, lyDo: `không có câu nguồn "${idCau}" trong data/luat-goc` };
  }
  const chu = L.chuCau(idCau);
  if (typeof trich !== 'string' || !gon(trich)) {
    return { ok: false, lyDo: `trich rỗng tại câu "${idCau}"` };
  }
  const gChu = gon(chu);
  const gTrich = gon(trich);
  if (gChu.includes(gTrich) || chuanSo(chu).includes(chuanSo(trich))) {
    return { ok: true, chu, vanTay: vanTay(chu) };
  }
  return {
    ok: false,
    lyDo: `trich "${gTrich.slice(0, 120)}" không khớp nguyên văn câu "${idCau}" ("${gChu.slice(0, 140)}")`,
  };
}

function docJsonlTep(fp) {
  if (!fs.existsSync(fp)) return [];
  return fs.readFileSync(fp, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function ghiJsonlTep(fp, arr) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, arr.length ? `${arr.map((x) => JSON.stringify(x)).join('\n')}\n` : '', 'utf8');
}

/** Quét đệ quy mọi cặp (idCau|nguon, trich) và tapDuNguon/tapDuTrich trong một đối tượng JSON để kiểm nguyên văn. */
function thuThapCapTrichDeQuy(obj, duongDan, capOut) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => thuThapCapTrichDeQuy(v, `${duongDan}[${i}]`, capOut));
    return;
  }
  if (typeof obj.trich === 'string') {
    const idCau = obj.idCau ?? obj.nguon;
    if (idCau !== undefined) {
      capOut.push({ nhan: duongDan, idCau, trich: obj.trich, vanTay: obj.vanTay });
    }
  }
  if (obj.tapDuNguon !== undefined && obj.tapDuTrich !== undefined) {
    if (typeof obj.tapDuNguon === 'string' && typeof obj.tapDuTrich === 'string') {
      capOut.push({ nhan: `${duongDan}.tapDuNguon`, idCau: obj.tapDuNguon, trich: obj.tapDuTrich });
    } else if (Array.isArray(obj.tapDuNguon) && Array.isArray(obj.tapDuTrich)) {
      obj.tapDuNguon.forEach((ng, i) => capOut.push({ nhan: `${duongDan}.tapDuNguon[${i}]`, idCau: ng, trich: obj.tapDuTrich[i] }));
    }
  }
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') thuThapCapTrichDeQuy(v, `${duongDan}.${k}`, capOut);
  }
}

/**
 * Dựng tất định `bang-anh-em.jsonl` và điền `ma6` + `ma8` vào từng `<nhóm>.json` trong `data/ho-so-ma/doc-mot-lan/<ch>/`
 * từ `dieu-kien.jsonl`.
 */
export function dungBangVaKetQuaDocMotLan(chuongArg, opts = {}) {
  const ch = chuanChuong2(chuongArg);
  const luat = opts.luat || G.LUAT_MAC_DINH;
  const hoSo = opts.hoSo || G.HO_SO_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const bieuMeta = opts.bieuMeta || napBieuMeta(luat);
  const dmlDir = path.join(hoSo, THU_MUC_DOC_MOT_LAN, ch);
  const dkList = docJsonlTep(path.join(dmlDir, 'dieu-kien.jsonl'));

  const nguongTep = path.join(hoSo, 'nguong', `${ch}.jsonl`);
  const nguongSanCo = fs.existsSync(nguongTep)
    ? docJsonlTep(nguongTep).filter((x) => x.loai === 'NGUONG')
    : [];

  const dkTheoNut = new Map();
  const dkById = new Map();
  const giaiChongTheoCha = new Map();
  const nguongById = new Map(nguongSanCo.map((x) => [x.id, x]));

  for (const x of dkList) {
    if (x.loai === 'DIEU_KIEN') {
      if (!dkTheoNut.has(x.nut)) dkTheoNut.set(x.nut, []);
      dkTheoNut.get(x.nut).push(x);
      if (x.id) dkById.set(x.id, x);
    } else if (x.loai === 'GIAI_CHONG') {
      if (!giaiChongTheoCha.has(x.nut)) giaiChongTheoCha.set(x.nut, []);
      giaiChongTheoCha.get(x.nut).push(x);
    }
  }

  const layDkNut = (nid) => {
    const direct = dkTheoNut.get(nid) || [];
    if (direct.length > 0) return direct;
    const m = bieuMeta.get(nid);
    if (m?.cungDong && (dkTheoNut.get(m.cungDong) || []).length > 0) {
      return dkTheoNut.get(m.cungDong);
    }
    for (const [otherId, om] of bieuMeta.entries()) {
      if (om?.cungDong === nid && (dkTheoNut.get(otherId) || []).length > 0) {
        return dkTheoNut.get(otherId);
      }
    }
    return [];
  };

  const dsNhom = lietKeNhom4({ chuong: ch, luat, L });
  const bangAnhEmList = [];
  const maKetQuaAll = [];

  // Nạp các điểm mơ hồ cấp phân nhóm/dòng (nut dưới cấp 4 số, vd bieu:940110, bieu:9405199...) có kết luận CHƯA ĐỦ DỮ KIỆN
  const dmhList = docJsonlTep(path.join(dmlDir, 'diem-mo-ho.jsonl'));
  const dmhMoTheoNutCon = new Map();
  for (const dmh of dmhList) {
    const klCuoi = dmh?.chotNguoiDoc?.ketLuanCuoi || dmh?.ketLuan;
    if (klCuoi !== 'CHƯA ĐỦ DỮ KIỆN') continue;
    const nutDmh = String(dmh?.nut || '');
    // Chỉ truyền xuống ma6/ma8 các điểm mơ hồ gắn trực tiếp vào phân nhóm/dòng con dưới cấp 4 số (không lấy cửa nhóm 4 số chung)
    if (!/^bieu:\d{5,8}(?::td\d+)*$/.test(nutDmh)) continue;
    if (!dmhMoTheoNutCon.has(nutDmh)) dmhMoTheoNutCon.set(nutDmh, []);
    dmhMoTheoNutCon.get(nutDmh).push(dmh);
  }

  for (const nhom4 of dsNhom) {
    const { cayBieu, nhomAnhEm } = thuThapCayNhom(nhom4, L, bieuMeta);

    for (const g of nhomAnhEm) {
      if (g.con.length < 2) continue;
      const bang = taoBangChoCha(g.cha, L, {
        bieuMeta,
        dkTheoNut,
        giaiChongTheoCha,
        nguongById,
      });
      if (bang) bangAnhEmList.push(bang);
    }

    const ma6Nhom = [];
    const ma8Nhom = [];

    for (const n of cayBieu) {
      if (n.khongMa || !/^bieu:\d{6}(?:\d{2})?$/.test(n.id)) continue;
      const maSo = n.id.slice(5);
      const cap = maSo.length;
      const laLk = laLoaiKhacThuan(n.id, L, bieuMeta);

      const duong = G.duongDiNut(n.id, L.cay) || [];
      const buocTrenDuong = duong
        .map((b) => b.nut)
        .filter((id) => /^bieu:\d{4,8}(?::td\d+)*$/.test(id));

      const canCuMap = new Map();
      const themCanCu = (idCau, trich) => {
        if (!idCau || !trich || /^(?:tb|wco):/i.test(idCau) || !L.cau.has(idCau)) return;
        const key = `${idCau}\0${gon(trich)}`;
        if (!canCuMap.has(key)) canCuMap.set(key, { idCau, trich });
      };

      for (const cid of n.cauIds || []) {
        if (L.cau.has(cid)) themCanCu(cid, L.chuCau(cid));
      }

      const dieuKienIds = [];
      const loaiAnhEm = [];
      const cauHoiSet = new Set();
      let duDieuKienDuongDi = true;
      let duLoaiAnhEm = true;

      for (const buocId of buocTrenDuong) {
        const lkBuoc = laLoaiKhacThuan(buocId, L, bieuMeta);
        const dksBuoc = layDkNut(buocId);
        const dksDuong = dksBuoc.filter((d) => !d.phu);
        if (!lkBuoc) {
          if (dksDuong.length === 0) {
            duDieuKienDuongDi = false;
          } else {
            for (const d of dksBuoc) {
              dieuKienIds.push(d.id);
              themCanCu(d.nguon, d.trich);
              if (d.mo === 'NGHIA_THUONG' && d.cauHoi) cauHoiSet.add(d.cauHoi);
            }
          }
        }

        const chaNode = L.cay.theoId.get(buocId)?.cha;
        const siblings = chaNode ? (G.conCua(chaNode, L.cay) || []).filter((s) => s !== buocId) : [];
        for (const sibId of siblings) {
          const lkSib = laLoaiKhacThuan(sibId, L, bieuMeta);
          if (lkSib) {
            if (!lkBuoc && dksDuong.length > 0) {
              loaiAnhEm.push({ anhEm: sibId, idCau: dksDuong[0].nguon, trich: dksDuong[0].trich });
            } else {
              duLoaiAnhEm = false;
            }
          } else {
            const dksSib = layDkNut(sibId);
            const dksSibDuong = dksSib.filter((d) => !d.phu);
            const dkDaiDien = dksSibDuong[0] || dksSib[0];
            if (dkDaiDien) {
              loaiAnhEm.push({ anhEm: sibId, idCau: dkDaiDien.nguon, trich: dkDaiDien.trich });
              themCanCu(dkDaiDien.nguon, dkDaiDien.trich);
              if (lkBuoc) {
                for (const ds of dksSib) {
                  if (ds.mo === 'NGHIA_THUONG' && ds.cauHoi) cauHoiSet.add(ds.cauHoi);
                }
              }
            } else {
              duLoaiAnhEm = false;
            }
          }
        }
      }

      let chuoi8Ok = true;
      if (cap === 8) {
        const ganThu = {};
        for (const buocId of buocTrenDuong) {
          const chaNode = L.cay.theoId.get(buocId)?.cha;
          const siblings = chaNode ? (G.conCua(chaNode, L.cay) || []).filter((s) => s !== buocId) : [];
          for (const sibId of siblings) {
            for (const ds of layDkNut(sibId)) ganThu[ds.id] = ds.phu ? true : false;
          }
        }
        for (const buocId of buocTrenDuong) {
          for (const db of layDkNut(buocId)) ganThu[db.id] = db.phu ? false : true;
        }
        const dg = danhGiaChuoi468(n.id, ganThu, {
          luat,
          L,
          bieuMeta,
          dkTheoNut,
          dkById,
          giaiChongTheoCha,
          nguongById,
        });
        if (dg.o !== 'DUNG') {
          chuoi8Ok = false;
          for (const chItem of dg.cauHoi || []) {
            if (chItem.cauHoi) cauHoiSet.add(chItem.cauHoi);
          }
        }
      }

      let coDmhConChuaDu = false;
      for (const buocId of buocTrenDuong) {
        for (const dmh of dmhMoTheoNutCon.get(buocId) || []) {
          coDmhConChuaDu = true;
          const qKhach = dmh?.chotNguoiDoc?.cauHoiKhach || dmh?.cauHoi;
          if (qKhach) cauHoiSet.add(qKhach);
        }
      }

      const duLuat = duDieuKienDuongDi && duLoaiAnhEm && chuoi8Ok && !coDmhConChuaDu;
      const ketQua = duLuat ? 'ĐÚNG' : 'CHƯA ĐỦ DỮ KIỆN';
      const dsCauHoi = [...cauHoiSet];
      if (ketQua === 'CHƯA ĐỦ DỮ KIỆN' && dsCauHoi.length === 0) {
        dsCauHoi.push(`Cần xác minh thêm thông số kỹ thuật của hàng hoá để phân định mã ${maSo} với các anh em cùng cấp.`);
      }

      const recMa = {
        ma: n.id,
        maSo,
        cap,
        ten: n.ten,
        laLoaiKhac: laLk,
        ketQua,
        cauHoi: ketQua === 'CHƯA ĐỦ DỮ KIỆN' ? dsCauHoi.join(' ') : (dsCauHoi.length ? dsCauHoi.join(' ') : null),
        dieuKienIds: [...new Set(dieuKienIds)],
        loaiAnhEm,
        canCu: [...canCuMap.values()],
      };
      if (cap === 6) ma6Nhom.push(recMa);
      else ma8Nhom.push(recMa);
      maKetQuaAll.push(recMa);
    }

    const nhomJsonPath = path.join(dmlDir, `${nhom4}.json`);
    if (opts.ghi !== false && fs.existsSync(nhomJsonPath)) {
      const objNhom = JSON.parse(fs.readFileSync(nhomJsonPath, 'utf8'));
      objNhom.ma6 = ma6Nhom;
      objNhom.ma8 = ma8Nhom;
      fs.writeFileSync(nhomJsonPath, `${JSON.stringify(objNhom, null, 2)}\n`, 'utf8');
    }
  }

  if (opts.ghi !== false) {
    ghiJsonlTep(path.join(dmlDir, 'bang-anh-em.jsonl'), bangAnhEmList);
  }

  return { bangAnhEm: bangAnhEmList, maKetQua: maKetQuaAll };
}

/**
 * Máy kiểm tất định cho `data/ho-so-ma/doc-mot-lan/<ch>/` (ADR-0011 mục 1, 2.5 & 3):
 *   - Đúng khuôn chuẩn QT (`chuong.json`, `<nhóm>.json`, `diem-mo-ho.jsonl`, `dieu-kien.jsonl`, `bang-anh-em.jsonl`);
 *   - 100% câu trích có thật nguyên văn trong `data/luat-goc` và khớp vân tay sha256;
 *   - Phủ đủ `chuong.json`, toàn bộ `<nhóm>.json` (kèm mọi ứng viên `timCgct` xếp trên nhóm), và toàn bộ mã 6 & 8 số;
 *   - Chạy cổng 6–14 ở chế độ cảnh báo (không làm đỏ kết quả nghiệm thu).
 */
export function kiemDocMotLanChuong(chuongArg, opts = {}) {
  const ch = chuanChuong2(chuongArg);
  const luat = opts.luat || G.LUAT_MAC_DINH;
  const hoSo = opts.hoSo || G.HO_SO_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const bieuMeta = opts.bieuMeta || napBieuMeta(luat);
  const dmlDir = path.join(hoSo, THU_MUC_DOC_MOT_LAN, ch);

  const loiKhuon = [];
  const loiTrich = [];
  const loiPhu = [];

  if (!fs.existsSync(dmlDir)) {
    return {
      ok: false,
      chuong: ch,
      loiKhuon: [`Chưa có thư mục ${THU_MUC_DOC_MOT_LAN}/${ch}/`],
      loiTrich: [],
      loiPhu: [],
      thongKe: null,
      canhBaoCong614: null,
    };
  }

  const kho = kiemKhoDocMotLan(hoSo);
  for (const l of kho.loi) {
    if (l.startsWith(`${THU_MUC_DOC_MOT_LAN}/${ch}/`) || l.startsWith(`${THU_MUC_DOC_MOT_LAN}:`)) {
      loiKhuon.push(l);
    }
  }

  const dsMaNhom4 = lietKeNhom4({ chuong: ch, luat, L });
  const batBuocTep = ['chuong.json', ...dsMaNhom4.map((m) => `${m}.json`), 'diem-mo-ho.jsonl', 'dieu-kien.jsonl', 'bang-anh-em.jsonl'];
  for (const tenTep of batBuocTep) {
    if (!fs.existsSync(path.join(dmlDir, tenTep))) {
      loiPhu.push(`Thiếu tệp bắt buộc ${THU_MUC_DOC_MOT_LAN}/${ch}/${tenTep}`);
    }
  }

  let tongCauTrichDaKiem = 0;
  const kiemCapTrichTrongObj = (obj, nhanGoc) => {
    const caps = [];
    thuThapCapTrichDeQuy(obj, nhanGoc, caps);
    for (const c of caps) {
      tongCauTrichDaKiem += 1;
      const kt = kiemTrichNguyenVan(c.idCau, c.trich, L);
      if (!kt.ok) {
        loiTrich.push(`${c.nhan}: ${kt.lyDo}`);
      } else if (c.vanTay && c.vanTay !== kt.vanTay) {
        loiTrich.push(`${c.nhan}: vanTay lệch sha256 câu "${c.idCau}"`);
      }
    }
  };

  // 1. Kiểm chuong.json
  let chuongObj = null;
  const chuongPath = path.join(dmlDir, 'chuong.json');
  if (fs.existsSync(chuongPath)) {
    try {
      chuongObj = JSON.parse(fs.readFileSync(chuongPath, 'utf8'));
      kiemCapTrichTrongObj(chuongObj, `doc-mot-lan/${ch}/chuong.json`);
      const tenChuongBieu = gon(L.cay.theoId.get(`bieu:${ch}`)?.ten || L.nut.get(`bieu:${ch}`)?.v || '');
      if (tenChuongBieu && gon(chuongObj.ten) !== tenChuongBieu) {
        loiPhu.push(`chuong.json: ten "${gon(chuongObj.ten)}" không khớp nguyên văn biểu "${tenChuongBieu}"`);
      }
    } catch { /* đã bắt ở loiKhuon */ }
  }

  // 2. Kiểm từng <nhóm>.json
  const ma6All = [];
  const ma8All = [];
  let soNhomHopLe = 0;
  for (const ma4 of dsMaNhom4) {
    const np = path.join(dmlDir, `${ma4}.json`);
    if (!fs.existsSync(np)) continue;
    let nhomObj;
    try { nhomObj = JSON.parse(fs.readFileSync(np, 'utf8')); } catch { continue; }
    soNhomHopLe += 1;
    kiemCapTrichTrongObj(nhomObj, `doc-mot-lan/${ch}/${ma4}.json`);

    const tenBieu4 = gon(L.cay.theoId.get(`bieu:${ma4}`)?.ten || '');
    if (tenBieu4 && gon(nhomObj.nhom?.ten) !== tenBieu4) {
      loiPhu.push(`${ma4}.json: nhom.ten không khớp nguyên văn biểu`);
    }

    const goiNhom = dungGoiNhom(ma4, { luat, hoSo, L, bieuMeta, soanMu: true });
    const daXet = new Set([
      ...(nhomObj.nhom?.canhTranh || []),
      ...(nhomObj.nhom?.khongCanhTranh || []),
    ].flatMap((m) => {
      const raw = m?.nhom ?? m?.dich;
      const arr = Array.isArray(raw) ? raw : [raw];
      return arr.map((s) => String(s || '').replace(/^bieu:/, ''));
    }));
    const thieuCt = goiNhom.canhTranhTimThay.map((u) => u.nhom).filter((u4) => !daXet.has(u4));
    if (thieuCt.length > 0) {
      loiPhu.push(`${ma4}.json: thiếu ${thieuCt.length} ứng viên timCgct trong canhTranh/khongCanhTranh (${thieuCt.join(', ')})`);
    }

    const ma6ById = new Map((nhomObj.ma6 || []).map((m) => [m.ma, m]));
    const ma8ById = new Map((nhomObj.ma8 || []).map((m) => [m.ma, m]));
    ma6All.push(...(nhomObj.ma6 || []));
    ma8All.push(...(nhomObj.ma8 || []));

    const { cayBieu } = thuThapCayNhom(ma4, L, bieuMeta);
    for (const n of cayBieu) {
      if (n.khongMa) continue;
      if (/^bieu:\d{8}$/.test(n.id)) {
        const mk = ma8ById.get(n.id);
        if (!mk) loiPhu.push(`${ma4}.json: thiếu mã 8 số ${n.id} trong ma8`);
        else if (mk.ten && gon(mk.ten) !== gon(n.ten)) loiPhu.push(`${ma4}.json: ma8 ${n.id} lệch tên biểu`);
      } else if (/^bieu:\d{6}$/.test(n.id) && Array.isArray(nhomObj.ma6)) {
        const mk6 = ma6ById.get(n.id);
        if (!mk6) loiPhu.push(`${ma4}.json: thiếu mã 6 số ${n.id} trong ma6`);
      }
    }
  }

  // 3. Kiểm dieu-kien.jsonl, diem-mo-ho.jsonl, bang-anh-em.jsonl
  const dsDkRec = docJsonlTep(path.join(dmlDir, 'dieu-kien.jsonl'));
  dsDkRec.forEach((x, idx) => kiemCapTrichTrongObj(x, `doc-mot-lan/${ch}/dieu-kien.jsonl:${idx + 1}`));

  const dsMoHoRec = docJsonlTep(path.join(dmlDir, 'diem-mo-ho.jsonl'));
  dsMoHoRec.forEach((x, idx) => kiemCapTrichTrongObj(x, `doc-mot-lan/${ch}/diem-mo-ho.jsonl:${idx + 1}`));

  const dsBangRec = docJsonlTep(path.join(dmlDir, 'bang-anh-em.jsonl'));
  dsBangRec.forEach((x, idx) => {
    for (const [cid, vt] of Object.entries(x.vanTayCau || {})) {
      tongCauTrichDaKiem += 1;
      if (!L.cau.has(cid) || /^(?:tb|wco):/i.test(cid)) {
        loiTrich.push(`doc-mot-lan/${ch}/bang-anh-em.jsonl:${idx + 1}: vanTayCau["${cid}"] không tồn tại trong data/luat-goc`);
      } else if (vanTay(L.chuCau(cid)) !== vt) {
        loiTrich.push(`doc-mot-lan/${ch}/bang-anh-em.jsonl:${idx + 1}: vanTayCau["${cid}"] lệch sha256 câu hiện hành`);
      }
    }
  });

  // 4. Chạy cổng 6–14 ở chế độ CẢNH BÁO (tuyệt đối không chặn kết quả ok)
  let canhBaoCong614 = null;
  if (opts.canhBaoCong !== false && dsDkRec.length > 0) {
    const nguongTep = path.join(hoSo, 'nguong', `${ch}.jsonl`);
    const nguongSanCo = fs.existsSync(nguongTep)
      ? docJsonlTep(nguongTep).filter((x) => x.loai === 'NGUONG')
      : [];
    const khoGia = {
      loi: [],
      banGhi: [...nguongSanCo, ...dsDkRec],
      bangAnhEm: dsBangRec,
      soTep: 2,
    };
    const rCong = chayCong({
      luat,
      hoSo,
      L,
      bieuMeta,
      kho: khoGia,
      phamVi: [`chuong:${ch}`],
      chiTrong: true,
      cong: [6, 7, 8, 9, 10, 11, 12, 13, 14],
    });
    canhBaoCong614 = {};
    for (const so of [6, 7, 8, 9, 10, 11, 12, 13, 14]) {
      const c = rCong.cong[so];
      if (!c) continue;
      canhBaoCong614[so] = {
        ten: c.ten,
        soLoiCanhBao: c.loi.length,
        soCanhBao: (c.canhBao || []).length,
        mauLoi: c.loi.slice(0, 5),
        ...(c.dem ? { dem: c.dem } : {}),
      };
    }
  }

  const demKetQua = (arr) => ({
    tong: arr.length,
    dung: arr.filter((x) => x.ketQua === 'ĐÚNG').length,
    chuaDuDuKien: arr.filter((x) => x.ketQua === 'CHƯA ĐỦ DỮ KIỆN').length,
  });

  const thongKe = {
    chuong: ch,
    soBanGhiChuong: chuongObj ? 1 : 0,
    soBanGhiNhom: soNhomHopLe,
    soDieuKien: dsDkRec.filter((x) => x.loai === 'DIEU_KIEN').length,
    soGiaiChong: dsDkRec.filter((x) => x.loai === 'GIAI_CHONG').length,
    soCanhTranh: dsDkRec.filter((x) => x.loai === 'CANH_TRANH').length,
    soBangAnhEm: dsBangRec.length,
    ma6So: demKetQua(ma6All),
    ma8So: demKetQua(ma8All),
    soDiemMoHo: dsMoHoRec.length,
    soDoiKetLuanSauPhanBien: dsMoHoRec.filter((x) => x.chotNguoiDoc?.doiKetLuanSauPhanBien === true).length,
    tongCauTrichDaKiem,
  };

  const ok = loiKhuon.length === 0 && loiTrich.length === 0 && loiPhu.length === 0;
  return {
    ok,
    chuong: ch,
    loiKhuon,
    loiTrich,
    loiPhu,
    thongKe,
    canhBaoCong614,
  };
}

function main() {
  const a = process.argv.slice(2);
  const lay = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const chuongArg = lay('--chuong');
  if (!chuongArg) {
    console.error('Thiếu --chuong <2so> (vd: --chuong 94)');
    process.exit(2);
  }
  const luat = path.resolve(lay('--luat') || G.LUAT_MAC_DINH);
  const hoSo = path.resolve(lay('--ho-so') || G.HO_SO_MAC_DINH);

  if (a.includes('--dung-bang')) {
    const nguoiDoc = lay('--nguoi-doc') || 'gemini-4-hydrogen-tiered-xhigh';
    const kq = dungBangVaKetQuaDocMotLan(chuongArg, { luat, hoSo, nguoiDoc, ghi: true });
    console.log(JSON.stringify({
      ok: true,
      chuong: chuanChuong2(chuongArg),
      soBangAnhEm: kq.bangAnhEm.length,
      soMaKetQua: kq.maKetQua.length,
    }, null, 2));
    return;
  }

  const canhBaoCong = !a.includes('--tat-canh-bao-cong');
  const kq = kiemDocMotLanChuong(chuongArg, { luat, hoSo, canhBaoCong });
  console.log(`${kq.ok ? 'PASS' : 'FAIL'} doc-mot-lan Chương ${kq.chuong}: khuôn=${kq.loiKhuon.length} lỗi, trích=${kq.loiTrich.length} lỗi, phủ=${kq.loiPhu.length} lỗi (đã kiểm ${kq.thongKe?.tongCauTrichDaKiem || 0} câu trích nguyên văn)`);
  for (const l of [...kq.loiKhuon, ...kq.loiTrich, ...kq.loiPhu].slice(0, 50)) {
    console.log(`  ✗ ${l}`);
  }
  if (kq.thongKe) {
    console.log('THỐNG KÊ:', JSON.stringify(kq.thongKe));
  }
  if (kq.canhBaoCong614) {
    console.log('CẢNH BÁO CỔNG 6–14 (tham khảo, không chặn):', JSON.stringify(kq.canhBaoCong614));
  }
  process.exit(kq.ok ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
export { dungGoiChuong };
