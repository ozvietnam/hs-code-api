#!/usr/bin/env node
// Máy KIỂM kết quả đợt cào SHTT (docs/giao-viec/shtt-cao-dem.md). Đỏ khi thiếu, bịa, hoặc không có nguồn gốc.
//   node scripts/shtt/kiem.mjs [--dir=data/shtt] [--ung-vien=<tệp.json>]   (mã thoát 1 khi FAIL)
// Luật: mọi bản ghi phải có nguon{url,layLuc,sha256}; sha256 phải nằm trong raw-index.json (bằng chứng bản thô);
// nguồn ghi trạng thái OK trong bao-cao thì tệp phải có đúng số dòng; recordal (TCHQ, GACC) bắt buộc số hồ sơ;
// bản ghi registry phải trỏ về một ứng viên; không lặp; tốc độ gọi lịch sự (≤ 5 % khoảng cách < 500 ms).
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };

export const NGUON = {
  'vn-tchq-giam-sat': { tep: 'vn-tchq-giam-sat.jsonl', loai: 'RECORDAL', batBuoc: ['nhan', 'chuSoHuu', 'soHoSo'], ngay: ['hieuLucDen'] },
  'vn-ipvietnam-dang-ky': { tep: 'vn-ipvietnam-dang-ky.jsonl', loai: 'REGISTRY', batBuoc: ['nhan', 'soDon', 'tinhTrang', 'ungVien'], ngay: ['ngayNop'] },
  'tmview-cn-vn': { tep: 'tmview-cn-vn.jsonl', loai: 'REGISTRY', batBuoc: ['nhan', 'office', 'soDon', 'tinhTrang', 'ungVien'], ngay: ['ngayNop'] },
  'cn-cnipa-dang-ky': { tep: 'cn-cnipa-dang-ky.jsonl', loai: 'REGISTRY', batBuoc: ['nhan', 'soDon', 'tinhTrang', 'ungVien'], ngay: ['ngayNop'] },
  'cn-gacc-beian': { tep: 'cn-gacc-beian.jsonl', loai: 'RECORDAL', batBuoc: ['nhan', 'chuSoHuu', 'soHoSo', 'loaiQuyen'], ngay: ['hieuLucDen'] },
};
const TINH_TRANG = new Set(['DANG_KY', 'DANG_XU_LY', 'HET_HAN', 'TU_CHOI', 'KHAC']);
const LOAI_QUYEN = new Set(['NHAN_HIEU', 'BAN_QUYEN', 'SANG_CHE', 'KIEU_DANG', 'KHAC']);
const TRANG_THAI_NGUON = new Set(['OK', 'CHAN', 'CAPTCHA', 'LOI', 'BO_QUA']);
const laNgay = (s) => s == null || /^\d{4}-\d{2}-\d{2}$/.test(String(s));
const laIso = (s) => typeof s === 'string' && !Number.isNaN(Date.parse(s));
const docJsonl = (p) => fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l, i) => { try { return JSON.parse(l); } catch { return { __loi: `dòng ${i + 1} không phải JSON` }; } }) : null;

/** Kiểm một thư mục kết quả; trả { loi[], canhBao[], tomTat }. Thuần, không in. */
export function kiem(dir, { ungVien = null } = {}) {
  const loi = [], canhBao = [], tomTat = {};
  const bcPath = join(dir, 'bao-cao.json');
  if (!fs.existsSync(bcPath)) return { loi: ['thiếu bao-cao.json'], canhBao, tomTat };
  let bc; try { bc = JSON.parse(fs.readFileSync(bcPath, 'utf8')); } catch (e) { return { loi: [`bao-cao.json hỏng: ${e.message}`], canhBao, tomTat }; }
  for (const k of ['ngay', 'may', 'batDau', 'ketThuc', 'nguon', 'camKet']) if (bc[k] == null) loi.push(`bao-cao thiếu ${k}`);
  if (bc.camKet && bc.camKet.khongLachCaptcha !== true) loi.push('bao-cao.camKet.khongLachCaptcha phải là true (không lách captcha/anti-bot)');
  const rawIdx = new Map();
  const riPath = join(dir, 'raw-index.json');
  if (fs.existsSync(riPath)) { try { for (const r of JSON.parse(fs.readFileSync(riPath, 'utf8')).tho || []) rawIdx.set(r.sha256, r); } catch (e) { loi.push(`raw-index.json hỏng: ${e.message}`); } }
  else loi.push('thiếu raw-index.json (danh mục bản thô: sha256, url, layLuc, bytes)');
  const uv = ungVien ? new Set(ungVien.map((u) => u.chuan)) : null;
  const daKhai = new Map((bc.nguon || []).map((n) => [n.ma, n]));
  for (const [ma, cau] of Object.entries(NGUON)) {
    const khai = daKhai.get(ma);
    const p = join(dir, cau.tep);
    if (!khai) { loi.push(`bao-cao không khai nguồn ${ma} (ghi trạng thái OK/CHAN/CAPTCHA/LOI/BO_QUA kèm ghiChu)`); continue; }
    if (!TRANG_THAI_NGUON.has(khai.trangThai)) loi.push(`${ma}: trangThai "${khai.trangThai}" không hợp lệ`);
    if (khai.trangThai !== 'OK') { if (!khai.ghiChu) loi.push(`${ma}: trạng thái ${khai.trangThai} phải có ghiChu (vì sao, URL, ảnh chụp)`); tomTat[ma] = { trangThai: khai.trangThai, soBanGhi: 0 }; continue; }
    const rows = docJsonl(p);
    if (!rows) { loi.push(`${ma}: trạng thái OK nhưng thiếu tệp ${cau.tep}`); continue; }
    if (rows.length !== Number(khai.soBanGhi)) loi.push(`${ma}: bao-cao ghi ${khai.soBanGhi} bản ghi, tệp có ${rows.length}`);
    const khoa = new Set(); const moc = [];
    rows.forEach((r, i) => {
      const o = `${ma} dòng ${i + 1}`;
      if (r.__loi) { loi.push(`${o}: ${r.__loi}`); return; }
      for (const f of cau.batBuoc) if (r[f] == null || String(r[f]).trim() === '') loi.push(`${o}: thiếu ${f}`);
      for (const f of cau.ngay) if (!laNgay(r[f])) loi.push(`${o}: ${f} phải YYYY-MM-DD hoặc null`);
      if (r.nhomNice != null && (!Array.isArray(r.nhomNice) || r.nhomNice.some((n) => !Number.isInteger(n) || n < 1 || n > 45))) loi.push(`${o}: nhomNice phải là mảng số 1–45`);
      if (cau.loai === 'REGISTRY' && r.tinhTrang && !TINH_TRANG.has(r.tinhTrang)) loi.push(`${o}: tinhTrang "${r.tinhTrang}" không hợp lệ`);
      if (ma === 'cn-gacc-beian' && r.loaiQuyen && !LOAI_QUYEN.has(r.loaiQuyen)) loi.push(`${o}: loaiQuyen "${r.loaiQuyen}" không hợp lệ`);
      if (ma === 'tmview-cn-vn' && !['CN', 'VN'].includes(r.office)) loi.push(`${o}: office phải CN hoặc VN`);
      if (uv && r.ungVien != null && !uv.has(r.ungVien)) loi.push(`${o}: ungVien "${r.ungVien}" không có trong danh sách ứng viên`);
      const ng = r.nguon || {};
      if (!/^https?:\/\//.test(String(ng.url || ''))) loi.push(`${o}: nguon.url thiếu/không phải http(s)`);
      if (!laIso(ng.layLuc)) loi.push(`${o}: nguon.layLuc thiếu/không phải ISO`); else moc.push(Date.parse(ng.layLuc));
      if (!/^[0-9a-f]{64}$/.test(String(ng.sha256 || ''))) loi.push(`${o}: nguon.sha256 thiếu (sha256 bản thô)`);
      else if (!rawIdx.has(ng.sha256)) loi.push(`${o}: sha256 ${ng.sha256.slice(0, 12)}… không có trong raw-index.json`);
      if (bc.batDau && laIso(ng.layLuc) && Date.parse(ng.layLuc) < Date.parse(bc.batDau) - 60000) loi.push(`${o}: layLuc trước lúc bắt đầu đợt`);
      const k = [r.soHoSo, r.soDon, r.office, r.nhan].filter(Boolean).join('|');
      if (khoa.has(k)) loi.push(`${o}: lặp (${k.slice(0, 60)})`); khoa.add(k);
    });
    moc.sort((a, b) => a - b); let nhanh = 0;
    for (let i = 1; i < moc.length; i++) if (moc[i] - moc[i - 1] < 500) nhanh += 1;
    if (moc.length > 20 && nhanh / (moc.length - 1) > 0.05) loi.push(`${ma}: ${nhanh}/${moc.length - 1} khoảng cách gọi < 500 ms — vượt tốc độ lịch sự`);
    tomTat[ma] = { trangThai: 'OK', soBanGhi: rows.length };
  }
  // Độ phủ ứng viên: tìm thấy + không tìm thấy = đã tra
  const ktt = docJsonl(join(dir, 'khong-tim-thay.jsonl')) || [];
  ktt.forEach((r, i) => { if (!r.ungVien || !r.nguonMa || !r.nguon?.url || !laIso(r.nguon?.layLuc)) loi.push(`khong-tim-thay dòng ${i + 1}: cần ungVien, nguonMa, nguon.url, nguon.layLuc`); if (uv && r.ungVien && !uv.has(r.ungVien)) loi.push(`khong-tim-thay dòng ${i + 1}: ungVien không có trong danh sách`); });
  if (uv) {
    const uu1 = ungVien.filter((u) => u.uuTien === 1).map((u) => u.chuan);
    for (const ma of ['vn-ipvietnam-dang-ky', 'tmview-cn-vn', 'cn-cnipa-dang-ky']) {
      if (tomTat[ma]?.trangThai !== 'OK') continue;
      const daTra = new Set([...(docJsonl(join(dir, NGUON[ma].tep)) || []).map((r) => r.ungVien), ...ktt.filter((r) => r.nguonMa === ma).map((r) => r.ungVien)]);
      const phu = uu1.filter((c) => daTra.has(c)).length;
      tomTat[ma].phuUuTien1 = `${phu}/${uu1.length}`;
      if (phu < uu1.length) canhBao.push(`${ma}: mới tra ${phu}/${uu1.length} ứng viên ưu tiên 1 (thiếu phải ghi vào khong-tim-thay hoặc bao-cao.ghiChu)`);
    }
  }
  return { loi, canhBao, tomTat };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = join(ROOT, arg('dir', 'data/shtt'));
  const uvPath = join(ROOT, arg('ung-vien', 'data/shtt/ung-vien-nhan-hieu.json'));
  const ungVien = fs.existsSync(uvPath) ? JSON.parse(fs.readFileSync(uvPath, 'utf8')).ungVien : null;
  const { loi, canhBao, tomTat } = kiem(dir, { ungVien });
  console.log(JSON.stringify(tomTat, null, 1));
  for (const c of canhBao) console.log(`CẢNH BÁO ${c}`);
  for (const l of loi.slice(0, 60)) console.log(`LỖI ${l}`);
  if (loi.length > 60) console.log(`… và ${loi.length - 60} lỗi nữa`);
  console.log(loi.length ? `FAIL kiểm SHTT: ${loi.length} lỗi` : 'PASS kiểm SHTT');
  process.exit(loi.length ? 1 : 0);
}
