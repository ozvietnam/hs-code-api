#!/usr/bin/env node
/**
 * MÁY KIỂM BỘ ĐỀ MÔ TẢ (Đợt 0C) — data/bench/mo-ta-bo-de.json.
 *   ĐỎ (exit 1): sai cấu trúc; mã không có trong biểu; chuỗi `trich` KHÔNG có nguyên văn trong tệp nguồn; nguồn là
 *                tệp AI_CHUA_KIEM; moTaMau > 200 ký tự, có "xuất xứ"/chữ cấm, hoặc thiếu dữ kiện của chính ca; nhãn duyệt khác CLAUDE_DUYET;
 *                ca lechTienLe thiếu căn cứ hai bên; khongDuCanCu cấp ca không khớp cấp dữ kiện;
 *                bộ đề chứa câu mô tả Oz (đối chiếu data/oz-gold-final.jsonl nếu có — tệp riêng, chỉ đọc).
 *   node scripts/check-mo-ta-bo-de.mjs [--chi-tiet] [--bo-de=<tệp>]   (--bo-de: kiểm bản sao khác data/bench/mo-ta-bo-de.json, dùng cho test)
 * Nhãn duyệt: NHAN_BO_DE của lib/nguon-loai.js (một hệ nhãn duy nhất, #550).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, docBoDe, trichCoThat, khopTuKhoa, jaccard, loadSource, CHU_CAM } from './mo-ta-bench-lib.mjs';

const require = createRequire(import.meta.url);
const { nhanCuaTep, NHAN_BO_DE } = require('../lib/nguon-loai.js');
const boDePath = process.argv.find((x) => x.startsWith('--bo-de='))?.slice(8) || path.join(ROOT, 'data', 'bench', 'mo-ta-bo-de.json');
const chiTiet = process.argv.includes('--chi-tiet');

const loi = [];
const fail = (id, msg) => loi.push(`${id}: ${msg}`);
const tax = loadSource('data/tax.json').value;
const CAP = new Set([4, 6, 8, 'LOAI_TRU']);
const CHUONG_UU_TIEN = ['85', '84', '39', '73', '64', '90', '94', '96', '40', '61'];

const rawText = fs.readFileSync(boDePath, 'utf8');
const boDe = docBoDe(boDePath);

if (boDe.duyetBoi !== NHAN_BO_DE) fail('bo-de', `duyetBoi cấp bộ đề phải là ${NHAN_BO_DE}`);
if (/NGUOI_DUYET"/.test(rawText.replace(/"quyTacChamDuyet":[^\n]*/, ''))) fail('bo-de', 'không được dùng nhãn NGUOI_DUYET');
const ca = Array.isArray(boDe.ca) ? boDe.ca : [];
if (ca.length < 30 || ca.length > 40) fail('bo-de', `cần 30–40 ca, đang có ${ca.length}`);

/** Kiểm một căn cứ { nguon, trich, viTri? }. */
let soTrich = 0;
function kiemCanCu(id, nhan, cc) {
  if (!cc || typeof cc !== 'object') { fail(id, `${nhan}: thiếu căn cứ`); return; }
  soTrich += 1;
  const rel = String(cc.nguon || '');
  if (!rel.startsWith('data/')) { fail(id, `${nhan}: nguon phải là đường dẫn tệp trong data/ (${rel})`); return; }
  const lab = nhanCuaTep(rel);
  if (lab === 'AI_CHUA_KIEM') fail(id, `${nhan}: nguồn ${rel} là AI_CHUA_KIEM — không làm căn cứ`);
  if (!lab) fail(id, `${nhan}: nguồn ${rel} chưa có nhãn trong lib/nguon-loai.js`);
  if (rel === 'data/chu-giai-heading.json' && !/\.(nhom|nhom_day_du)$/.test(cc.viTri || '')) {
    fail(id, `${nhan}: chu-giai-heading.json chỉ trường nhom/nhom_day_du là NGUYEN_VAN — cần viTri "<nhóm>.nhom"`);
  }
  const r = trichCoThat(rel, cc.trich, cc.viTri);
  if (!r.ok) fail(id, `${nhan}: ${r.lyDo}`);
}

const ids = new Set();
const theoChuong = {};
let soDuKien = 0; let soLech = 0; let soKhongDu = 0;
for (const c of ca) {
  const id = c.id || '(không id)';
  if (ids.has(id)) fail(id, 'id trùng'); ids.add(id);
  if (!/^\d{8}$/.test(c.maHs || '')) fail(id, 'maHs phải đủ 8 số');
  else if (!tax[c.maHs]) fail(id, `maHs ${c.maHs} không có trong data/tax.json`);
  if (c.chuong !== String(c.maHs || '').slice(0, 2)) fail(id, 'chuong phải là 2 số đầu của maHs');
  theoChuong[c.chuong] = (theoChuong[c.chuong] || 0) + 1;
  if (c.duyetBoi !== NHAN_BO_DE) fail(id, `duyetBoi phải là ${NHAN_BO_DE}`);
  if (!c.thongTinHang || !c.thongTinHang.tenHang) fail(id, 'thiếu thongTinHang.tenHang');
  if (!c.nguonCa || !['TB-TCHQ', 'TU_DUNG'].includes(c.nguonCa.loai)) fail(id, 'nguonCa.loai phải là TB-TCHQ | TU_DUNG');
  if (c.nguonCa?.loai === 'TB-TCHQ') {
    const src = loadSource('data/precedents.json').value;
    const m = String(c.nguonCa.viTri || '').match(/^(\w+)\[(\d+)\]$/);
    const tb = m ? src[m[1]]?.[Number(m[2])] : null;
    if (!tb) fail(id, `nguonCa.viTri ${c.nguonCa.viTri} không có trong precedents.json`);
    else {
      if (tb.tbTchqNumber !== c.nguonCa.soHieu) fail(id, `soHieu ${c.nguonCa.soHieu} ≠ ${tb.tbTchqNumber}`);
      if (String(tb.outcome).replace(/\D/g, '') !== c.maHs) fail(id, `mã ca ${c.maHs} ≠ mã kết luận TB ${tb.outcome}`);
    }
  }
  // Mô tả mẫu
  const mau = String(c.moTaMau || '');
  if (!mau) fail(id, 'thiếu moTaMau');
  if (mau.length > 200) fail(id, `moTaMau dài ${mau.length} > 200 ký tự`);
  if (/xuất xứ/i.test(mau)) fail(id, 'moTaMau không ghi "xuất xứ" (mục 36.3 — 0B bỏ "xuất xứ" khỏi chuỗi)');
  for (const cc of CHU_CAM) if (cc.re.test(mau)) fail(id, `moTaMau chứa chữ cấm (${cc.ma})`);
  // Dữ kiện quyết định
  const dk = Array.isArray(c.duKienQuyetDinh) ? c.duKienQuyetDinh : [];
  if (!dk.length) fail(id, 'thiếu duKienQuyetDinh');
  let coKhongDu = false;
  dk.forEach((d, i) => {
    soDuKien += 1;
    const nh = `duKien[${i}]`;
    if (!CAP.has(d.cap)) fail(id, `${nh}: cap phải là 4 | 6 | 8 | LOAI_TRU`);
    if (!d.duKien) fail(id, `${nh}: thiếu duKien`);
    if (!Array.isArray(d.tuKhoa) || !d.tuKhoa.length) fail(id, `${nh}: thiếu tuKhoa`);
    kiemCanCu(id, nh, d);
    if (d.bangChungHang) kiemCanCu(id, `${nh}.bangChungHang`, d.bangChungHang);
    if (d.khongDuCanCu) coKhongDu = true;
    else if (Array.isArray(d.tuKhoa) && !khopTuKhoa(mau, d.tuKhoa)) fail(id, `${nh}: moTaMau không chứa dữ kiện "${d.duKien}" (tuKhoa ${JSON.stringify(d.tuKhoa)})`);
  });
  if (Boolean(c.khongDuCanCu) !== coKhongDu) fail(id, `khongDuCanCu cấp ca (${Boolean(c.khongDuCanCu)}) phải khớp có dữ kiện khongDuCanCu (${coKhongDu})`);
  if (c.khongDuCanCu) soKhongDu += 1;
  // Nhóm cạnh tranh
  for (const [i, n] of (c.nhomCanhTranh || []).entries()) {
    if (!/^\d{4}(\d{4})?$/.test(n.ma || '')) fail(id, `nhomCanhTranh[${i}]: ma phải 4 hoặc 8 số`);
    if (String(n.ma).length === 8 && !tax[n.ma]) fail(id, `nhomCanhTranh[${i}]: ${n.ma} không có trong tax.json`);
    if (!n.lyDo) fail(id, `nhomCanhTranh[${i}]: thiếu lyDo`);
    kiemCanCu(id, `nhomCanhTranh[${i}]`, n);
  }
  // Lệch tiền lệ: hai bên đều có căn cứ, không chọn bên
  if (c.lechTienLe) {
    soLech += 1;
    const l = c.lechChiTiet || {};
    const ben = Object.entries(l).filter(([k, v]) => k !== 'ghiChu' && v && typeof v === 'object');
    if (ben.length < 2) fail(id, 'lechTienLe cần lechChiTiet có ít nhất 2 căn cứ (biểu thuế / tiền lệ)');
    for (const [k, v] of ben) kiemCanCu(id, `lechChiTiet.${k}`, v);
    if (!l.ghiChu) fail(id, 'lechTienLe cần ghiChu');
  } else if (c.lechChiTiet) fail(id, 'có lechChiTiet nhưng lechTienLe=false');
  // Ca cài lỗi
  const cl = c.caCaiLoi || {};
  for (const i of cl.boDuKien || []) if (!dk[i]) fail(id, `caCaiLoi.boDuKien: không có dữ kiện ${i}`);
  if (cl.doiAnhEm) {
    if (!mau.includes(cl.doiAnhEm.tu)) fail(id, `caCaiLoi.doiAnhEm.tu không có trong moTaMau: "${cl.doiAnhEm.tu}"`);
    const t = String(cl.doiAnhEm.maTroToi || '');
    if (!(/^\d{8}$/.test(t) && tax[t])) fail(id, `caCaiLoi.doiAnhEm.maTroToi ${t} phải là mã 8 số có trong tax.json`);
    if (t === c.maHs) fail(id, 'caCaiLoi.doiAnhEm.maTroToi trùng mã ca');
  }
}
for (const ch of CHUONG_UU_TIEN) if (!theoChuong[ch]) fail('bo-de', `chưa có ca nào của chương ${ch}`);

// Riêng tư: bộ đề không được chứa câu mô tả Oz.
const goldPath = process.env.OZ_GOLD_PATH || path.join(ROOT, 'data', 'oz-gold-final.jsonl');
let doiChieuOz = 'bỏ qua (không có data/oz-gold-final.jsonl)';
if (fs.existsSync(goldPath)) {
  const gold = fs.readFileSync(goldPath, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  let trung = 0; let maxJ = 0; let maxId = null;
  for (const g of gold) {
    const s = String(g.sampleDesc || '').trim();
    if (s.length >= 30 && rawText.includes(s)) { trung += 1; fail('rieng-tu', `bộ đề chứa nguyên câu sampleDesc Oz (mã ${g.hsCode})`); }
  }
  for (const c of ca) {
    for (const g of gold) {
      if (String(g.hsCode) !== c.maHs) continue;
      const j = jaccard(c.moTaMau, g.sampleDesc);
      if (j > maxJ) { maxJ = j; maxId = c.id; }
    }
  }
  if (maxJ >= 0.8) fail('rieng-tu', `moTaMau ${maxId} giống câu Oz cùng mã quá mức (Jaccard ${maxJ.toFixed(2)})`);
  doiChieuOz = `${gold.length} câu Oz: 0 câu bị chép (${trung}); Jaccard lớn nhất moTaMau ↔ câu Oz cùng mã = ${maxJ.toFixed(2)}${maxId ? ` (${maxId})` : ''}`;
}

const tong = `${ca.length} ca, ${soDuKien} dữ kiện, ${soTrich} chuỗi trích; lechTienLe ${soLech}, khongDuCanCu ${soKhongDu}; theo chương ${JSON.stringify(theoChuong)}`;
if (chiTiet || loi.length) for (const l of loi) console.log(`FAIL ${l}`);
console.log(`check-mo-ta-bo-de: ${tong}`);
console.log(`  đối chiếu riêng tư: ${doiChieuOz}`);
if (loi.length) { console.log(`ĐỎ — ${loi.length} lỗi`); process.exit(1); }
console.log('XANH');
