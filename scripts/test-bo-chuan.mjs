#!/usr/bin/env node
/**
 * Cổng máy #1636 Việc 1 (ADR-0004 §5 & §6): Bộ chuẩn gắn nhãn theo luật (bản 1).
 * ĐỎ khi:
 *  - thiếu một trong 6 ca mẫu của ADR-0004 §5;
 *  - ca nào thiếu quy tắc quyết định ở bất kỳ tầng nào hoặc thiếu câu hỏi khi DUNG_HOI;
 *  - trích dẫn `{ tep, khoa, nguyenVan }` không trỏ tới khoá có thật hoặc không khớp nguyên văn;
 *  - mục 1097/TB-TCHQ năm 2020 (29313900) vẫn còn ghép chuỗi Bột nhão nhôm / ALUMINUM PASTE.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { GOC, doc, docJson, co, boKiem } from './lib-luat.mjs';

process.chdir(GOC);
const require = createRequire(import.meta.url);
const { squash } = require('../lib/so-tay.js');

const { kiem, xong } = boKiem('test-bo-chuan');

const cgc = docJson('data/chu-giai-chuong.json');
const cgh = docJson('data/chu-giai-heading.json');
const tax = docJson('data/tax.json');
const ops = docJson('data/wco-op/opinions.json');
const opsById = new Map(ops.map((o) => [o.id, o]));
const wcoCsv = new Map();
for (const l of doc('data/wco-hs-international.csv').split('\n').slice(1)) {
  const m = l.match(/^[^,]*,(\d{6}),("(?:[^"]|"")*"|[^,]*),(\d+),6\s*$/);
  if (m) wcoCsv.set(m[1], m[2].replace(/^"|"$/g, '').replace(/""/g, '"'));
}
const CAC_TRUONG_NHOM_KHO = new Set(['nhom', 'ten_nhom']);

/** Trả nội dung gốc theo `{ tep, khoa }`, hoặc null nếu khoá / tệp không tồn tại. */
export function docNguonTheoKhoa(tep, khoa) {
  if (!tep || !khoa || !co(tep)) return null;
  if (tep === 'data/chu-giai-chuong.json') {
    const [ch, field] = String(khoa).split('.');
    if (!['chuong', 'phan'].includes(field)) return null;
    const v = cgc[ch] && cgc[ch][field];
    return typeof v === 'string' && v.trim() ? v : null;
  }
  if (tep === 'data/chu-giai-heading.json') {
    const [h4, field] = String(khoa).split('.');
    if (!CAC_TRUONG_NHOM_KHO.has(field)) return null;
    const v = cgh[h4] && cgh[h4][field];
    return typeof v === 'string' && v.trim() ? v : null;
  }
  if (tep === 'data/tax.json') {
    const [hs8, field] = String(khoa).split('.');
    if (!['vn', 'en'].includes(field)) return null;
    const v = tax[hs8] && tax[hs8][field];
    return typeof v === 'string' && v.trim() ? v : null;
  }
  if (tep === 'data/wco-op/opinions.json') {
    const dot = String(khoa).lastIndexOf('.');
    if (dot <= 0) return null;
    const id = khoa.slice(0, dot);
    const field = khoa.slice(dot + 1);
    const o = opsById.get(id);
    const v = o && o[field];
    return typeof v === 'string' && v.trim() ? v : null;
  }
  if (tep === 'data/wco-hs-international.csv') {
    const v = wcoCsv.get(String(khoa));
    return typeof v === 'string' && v.trim() ? v : null;
  }
  return null;
}

/** Kiểm một câu trích đơn lẻ: khoá tồn tại + nguyên văn xuất hiện trong nguồn. */
export function kiemTrich(tr) {
  if (!tr || typeof tr !== 'object') return 'khong-phai-object';
  const goc = docNguonTheoKhoa(tr.tep, tr.khoa);
  if (!goc) return `khoa-khong-ton-tai:${tr.tep}#${tr.khoa}`;
  const nv = String(tr.nguyenVan || '').trim();
  if (!nv) return 'thieu-nguyen-van';
  if (goc.includes(nv)) return null;
  const sGoc = squash(goc);
  const sNv = squash(nv);
  if (sNv.length >= 6 && sGoc.includes(sNv)) return null;
  return `khong-khop-nguyen-van:${tr.tep}#${tr.khoa}`;
}

// ── 1. Sự hiện diện của Bộ chuẩn v1 & Hướng dẫn gắn nhãn ─────────────────────────────────────────────
kiem('có tệp data/bo-chuan/bo-chuan-v1.json', co('data/bo-chuan/bo-chuan-v1.json'));
kiem('có tài liệu hướng dẫn data/bo-chuan/HUONG-DAN-GAN-NHAN.md', co('data/bo-chuan/HUONG-DAN-GAN-NHAN.md') && doc('data/bo-chuan/HUONG-DAN-GAN-NHAN.md').includes('DUNG_HOI'));

const boChuan = docJson('data/bo-chuan/bo-chuan-v1.json');
const dsCa = Array.isArray(boChuan.ca) ? boChuan.ca : [];

const CA_BAT_BUOC = [
  'Con lăn vận thăng, thép',
  'Bát sen nhựa ABS',
  'Dép xốp trong nhà',
  'Bạc trục ty máy khoan',
  'Giá đỡ chổi than',
  'Bột nhão nhôm',
];
for (const ten of CA_BAT_BUOC) {
  kiem(`bộ chuẩn có ca mẫu ADR-0004 §5: "${ten}"`, dsCa.some((c) => c.tenHang === ten));
}

// ── 2. Kiểm mọi ca: quy tắc từng tầng, trích dẫn trỏ tới khoá thật, câu hỏi khi DUNG_HOI ─────────
let thieuQuyTac = 0;
let loiTrich = [];
let tongTrich = 0;

for (const c of dsCa) {
  const kq = c.ketQua || {};
  const trangThaiHopLe = kq.trangThai === 'CHOT' || kq.trangThai === 'DUNG_HOI';
  const maHopLe = kq.trangThai === 'CHOT'
    ? /^\d{8}$/.test(String(kq.ma || '')) && Boolean(tax[kq.ma])
    : Array.isArray(kq.maUngVien) && kq.maUngVien.length >= 2 && kq.maUngVien.every((m) => /^\d{8}$/.test(m) && Boolean(tax[m])) && typeof kq.cauHoi === 'string' && kq.cauHoi.trim().length > 10;
  kiem(`${c.id} (${c.tenHang}): trạng thái ${kq.trangThai} và mã/câu hỏi hợp lệ`, trangThaiHopLe && maHopLe, JSON.stringify(kq));

  const tangs = Array.isArray(c.cacTang) ? c.cacTang : [];
  kiem(`${c.id}: đủ các tầng B0 → B1 → B6_6SO → B6_8SO`, ['B0', 'B1', 'B6_6SO', 'B6_8SO'].every((t) => tangs.some((x) => x.tang === t)));

  for (const t of tangs) {
    if (typeof t.quyTac !== 'string' || !t.quyTac.trim()) thieuQuyTac += 1;
    if (!Array.isArray(t.trich) || !t.trich.length) loiTrich.push(`${c.id}.${t.tang}:thieu-trich`);
    if (t.ketLuan === 'DUNG_HOI' && (typeof t.cauHoi !== 'string' || !t.cauHoi.trim())) {
      loiTrich.push(`${c.id}.${t.tang}:dung-hoi-thieu-cau-hoi`);
    }
    for (const tr of t.trich || []) {
      tongTrich += 1;
      const err = kiemTrich(tr);
      if (err) loiTrich.push(`${c.id}.${t.tang}:${err}`);
    }
  }
}

kiem(`0 tầng thiếu quy tắc trên ${dsCa.length} ca`, thieuQuyTac === 0, `thiếu ${thieuQuyTac}`);
kiem(`mọi trích dẫn (${tongTrich} mục) trỏ khoá có thật & khớp nguyên văn`, loiTrich.length === 0, loiTrich.join('; '));

// ── 3. Đối chiếu đúng từng đáp án ADR-0004 §5 ───────────────────────────────────────────────────────
const theoTen = (t) => dsCa.find((c) => c.tenHang === t);
kiem('§5 Con lăn vận thăng, thép → DUNG_HOI [84313110, 84313120]', (() => {
  const k = theoTen('Con lăn vận thăng, thép')?.ketQua;
  return k?.trangThai === 'DUNG_HOI' && k.maUngVien.includes('84313110') && k.maUngVien.includes('84313120') && /chở người/i.test(k.cauHoi);
})());
kiem('§5 Bát sen nhựa ABS → CHOT 39249090 (có điều kiện kèm theo nếu có van → 8481.80)', (() => {
  const k = theoTen('Bát sen nhựa ABS')?.ketQua;
  return k?.trangThai === 'CHOT' && k.ma === '39249090' && /8481/.test(k.dieuKienKemTheo || '');
})());
kiem('§5 Dép xốp trong nhà → DUNG_HOI (maTam 64029990, hỏi kiểu quai vs 64022000)', (() => {
  const k = theoTen('Dép xốp trong nhà')?.ketQua;
  return k?.trangThai === 'DUNG_HOI' && k.maTam === '64029990' && k.maUngVien.includes('64022000') && /quai|chốt cài/i.test(k.cauHoi);
})());
kiem('§5 Bạc trục ty máy khoan → DUNG_HOI [84833090, 84314300] (trục quay vs tịnh tiến)', (() => {
  const k = theoTen('Bạc trục ty máy khoan')?.ketQua;
  return k?.trangThai === 'DUNG_HOI' && k.maUngVien.includes('84833090') && k.maUngVien.includes('84314300') && /quay/i.test(k.cauHoi);
})());
kiem('§5 Giá đỡ chổi than → CHOT 85030090', (() => {
  const k = theoTen('Giá đỡ chổi than')?.ketQua;
  return k?.trangThai === 'CHOT' && k.ma === '85030090';
})());
kiem('§5 Bột nhão nhôm → CHOT 32129011', (() => {
  const k = theoTen('Bột nhão nhôm')?.ketQua;
  return k?.trangThai === 'CHOT' && k.ma === '32129011';
})());

// ── 4. Sửa mục 1097/TB-TCHQ năm 2020 bị ghép sai trong precedents.json & community ────────────────────
const prec = docJson('data/precedents.json');
const muc2931 = (prec['29313900'] || []).filter((x) => x.tbTchqNumber === '1097/TB-TCHQ' && x.year === 2020);
kiem('1097/TB-TCHQ năm 2020 (29313900) vẫn tồn tại trong precedents.json và không còn dính "Bột nhão nhôm / ALUMINUM PASTE"',
  muc2931.length === 1
  && !/Bột nhão nhôm|ALUMINUM PASTE/i.test(muc2931[0].productName)
  && /819UV/i.test(muc2931[0].productName)
  && /Phenylbis/i.test(muc2931[0].productName),
  JSON.stringify(muc2931[0] || null));

const goi32 = docJson('data/community/tb-tchq/legal-customs-2026-10-13-goi-032.json');
const recGoi = (goi32.records || []).filter((r) => r.hsCode === '29313900' && r.source?.reference === '1097/TB-TCHQ');
kiem('tệp gốc community goi-032 khớp 1097/TB-TCHQ năm 2020 cũng đã gỡ chuỗi ghép sai',
  recGoi.length === 1 && !/Bột nhão nhôm|ALUMINUM PASTE/i.test(recGoi[0].description) && /Phenylbis/i.test(recGoi[0].description));

// ── 5. Ca ngược (bắt trích giả / khoá không có thật / tóm tắt KG không hợp lệ) ───────────────────────
kiem('ca ngược: trích sai khoá hoặc câu bịa phải bị từ chối',
  /khoa-khong-ton-tai/.test(kiemTrich({ tep: 'data/chu-giai-heading.json', khoa: '8545.loai_tru', nguyenVan: 'Bộ phận giữ chổi than' }) || '')
  && /khoa-khong-ton-tai/.test(kiemTrich({ tep: 'data/tax.json', khoa: '99999999.vn', nguyenVan: 'không có' }) || '')
  && /khong-khop-nguyen-van/.test(kiemTrich({ tep: 'data/chu-giai-heading.json', khoa: '8503.nhom', nguyenVan: 'Câu luật không hề tồn tại trong chú giải 8503' }) || ''));

xong();
