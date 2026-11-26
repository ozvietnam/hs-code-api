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
export const BO_QUA = 'BO_QUA';
export const TRANG_THAI = Object.freeze(['KHOP', 'LECH_PHIEU', 'VENH']);
const LOP = new Set(['LUAT', 'HUONG_DAN']);
const RE_NUT = /^(?:phan:[IVX]+|chuong:\d{2}(?::pc:[IVX]+)?|bieu:\d{4,8}(?::td\d+)*)$/;
const RE_CAU = /^(?:gir|phan|chuong|nhom|pn|bieu|sen|wco|tb):[^#\s]+#\d+$/;
const RE_DICH = /^(?:phan:[IVX]+|chuong:\d{2}(?::pc:[IVX]+)?|bieu:\d{2,8}(?::td\d+)*|gir:[1-6](?::[a-c])?)$/;
const RE_ANH_EM = /^(?:chuong:\d{2}(?::pc:[IVX]+)?|bieu:\d{4,8}(?::td\d+)*)$/;
const RE_VAN = /^[0-9a-f]{64}$/;
const TRUONG_VAN_DE = new Set(['id', 'nut', 'loai', 'dieuKien', 'trich', 'cau', 'tu', 'den', 'voi', 'nguong', 'duKien', 'lop', 'nguon', 'van', 'trangThai', 'phieu', 'ghiChu']);
const TRUONG_BO_QUA = new Set(['id', 'nut', 'loai', 'cau', 'lyDo', 'van', 'ghiChu']);
const CO_DEN = new Set(['KHONG_DUOC_LA', 'PHAI_LA', 'CHI_LIET_KE']);
const CO_VOI = new Set(['TACH_ANH_EM', 'NGUONG']);
const chuoi = (v) => typeof v === 'string' && v.trim().length > 0;
const soHoacNull = (v) => v === null || (typeof v === 'number' && Number.isFinite(v));

/** Lỗi hình thức của một bản ghi (vấn đề hoặc BỎ QUA). [] = đúng khuôn. */
export function kiemBanGhi(x) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return ['không phải đối tượng JSON'];
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
  const loi = []; const banGhi = [];
  const m = /^([a-z-]+)\/([0-9A-Z]+)\.jsonl$/.exec(tuongDoi.split(path.sep).join('/'));
  if (!m || !G.THU_MUC.includes(m[1])) return { loi: [`${tuongDoi}: tệp lạ (chỉ ${G.THU_MUC.map((t) => `${t}/<khoá>.jsonl`).join(', ')})`], banGhi };
  noiDung.split('\n').forEach((l, i) => {
    if (!l.trim()) return;
    let x; try { x = JSON.parse(l); } catch { loi.push(`${tuongDoi}:${i + 1}: không phải JSON`); return; }
    const l1 = kiemBanGhi(x).map((e) => `${tuongDoi}:${i + 1}: ${e}`);
    if (!l1.length && G.tepCuaNut(x.nut, m[1]) !== m[2]) l1.push(`${tuongDoi}:${i + 1}: ${x.id}: nút ${x.nut} không được ghi ở tệp này (đúng: ${G.THU_MUC.filter((t) => G.tepCuaNut(x.nut, t)).map((t) => `${t}/${G.tepCuaNut(x.nut, t)}.jsonl`).join(' hoặc ')})`);
    loi.push(...l1);
    banGhi.push({ ...x, _tep: tuongDoi, _dong: i + 1, _hong: l1.length > 0 });
  });
  return { loi, banGhi };
}

/** Kiểm cả kho hồ sơ. Trả mọi bản ghi (bản ghi hỏng mang _hong). Thư mục chưa có = kho rỗng. */
export function kiemKhoHoSo(goc = G.HO_SO_MAC_DINH) {
  const loi = []; const banGhi = []; let soTep = 0;
  if (!fs.existsSync(goc)) return { loi, banGhi, soTep };
  for (const e of fs.readdirSync(goc, { withFileTypes: true })) if (!e.isDirectory() || !G.THU_MUC.includes(e.name)) loi.push(`${e.name}: lạ ở gốc kho hồ sơ (chỉ ${G.THU_MUC.join(', ')})`);
  for (const tm of G.THU_MUC) {
    if (!fs.existsSync(path.join(goc, tm))) continue;
    for (const f of fs.readdirSync(path.join(goc, tm)).sort()) {
      soTep += 1;
      const r = kiemTep(`${tm}/${f}`, fs.readFileSync(path.join(goc, tm, f), 'utf8'));
      loi.push(...r.loi); banGhi.push(...r.banGhi);
    }
  }
  const daThay = new Map();
  for (const x of banGhi) {
    if (!x.id) continue;
    if (daThay.has(x.id)) { loi.push(`${x._tep}:${x._dong}: trùng id ${x.id} (đã có ở ${daThay.get(x.id)})`); x._hong = true; } else daThay.set(x.id, `${x._tep}:${x._dong}`);
  }
  return { loi, banGhi, soTep };
}

function main() {
  const a = process.argv.slice(2); const i = a.indexOf('--ho-so');
  const goc = i >= 0 ? path.resolve(a[i + 1]) : G.HO_SO_MAC_DINH;
  const r = kiemKhoHoSo(goc);
  console.log(`${r.loi.length ? 'FAIL' : 'PASS'} khuôn ${G.KHUON}: ${r.soTep} tệp, ${r.banGhi.length} bản ghi, ${r.loi.length} lỗi${fs.existsSync(goc) ? '' : ' (chưa có kho hồ sơ)'}`);
  for (const l of r.loi.slice(0, 60)) console.log(`  ✗ ${l}`);
  process.exit(r.loi.length ? 1 : 0);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
