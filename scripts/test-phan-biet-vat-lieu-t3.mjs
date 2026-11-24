#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-581 (OZV-540 PA-3 — T3) — ca kiểm MỚI: vật liệu "vật liệu tổng hợp" (composite).
 *
 * Tệp ca: `tests/phan-biet-vat-lieu-t3-composite.json` (TỆP RIÊNG — không sửa tệp cổng của GĐ
 * `tests/ca-doi-chung-vat-lieu-8546-8547.json`, không sửa `scripts/test-ca-doi-chung-vat-lieu.mjs`,
 * không sửa `scripts/bo-kiem-luat.mjs`).
 *
 * Bốn chiều theo đặc tả GĐ (OZV-581):
 *   I   mô tả nêu composite làm vật liệu của hàng ⇒ chốt 85469000 (trước vá: 85462010 — gốm sứ)
 *   II  gốm sứ ⇒ vẫn 85462010 (không hồi quy chiều ngược)
 *   III không nêu vật liệu ⇒ hành vi Y HỆT main (không mất chốt)
 *   IV  ÂM TÍNH — mô tả có chữ "composite" nhưng KHÔNG phải chất liệu của hàng ⇒ Y HỆT main (không đoán)
 *
 * Mỗi ca mang `nenMain` = hành vi đo được trên `origin/main` (781c3789) bằng chính tệp này (chế độ `--do`).
 * Có hai kiểm chống bản-vá-rỗng (quy tắc 5 OZV-290):
 *   - ca `giuYHieuMain` ⇒ hành vi hiện tại PHẢI BẰNG `nenMain` (đổi hành vi ở ca không nêu vật liệu ⇒ đỏ)
 *   - ca còn lại ⇒ hành vi hiện tại PHẢI KHÁC `nenMain` (vá rỗng / vá sai vế ⇒ đỏ)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { chotDong8 } = require('../lib/so-tay-gates.js');

const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'phan-biet-vat-lieu-t3-composite.json'), 'utf8'));
const doMode = process.argv.includes('--do');

const thuc = (c) => {
  const r = chotDong8({ hs: c.pn6, productText: c.moTa }) || {};
  return { ketQua: r.ketQua || null, hs: r.hs || null };
};
const bang = (a, b) => !!a && !!b && a.ketQua === b.ketQua && (a.hs || null) === (b.hs || null);

if (doMode) {
  // Chế độ đo nền: in kết quả THẬT của từng ca (dùng để chốt `nenMain` trên origin/main).
  console.log(JSON.stringify(fixture.ca.map((c) => ({ id: c.id, huong: c.huong, ...thuc(c) })), null, 1));
  process.exit(0);
}

let passed = 0;
let failed = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || extra === undefined ? '' : ` ${JSON.stringify(extra).slice(0, 400)}`}`);
  if (ok) passed += 1; else failed += 1;
};

for (const c of fixture.ca) {
  const hienTai = thuc(c);
  check(`${c.id} (${c.huong}) ${c.moTa.slice(0, 60)} ⇒ ${c.mong.ketQua}${c.mong.hs ? ' ' + c.mong.hs : ''}`,
    bang(hienTai, c.mong), { mong: c.mong, hienTai });
  if (c.giuYHieuMain) {
    check(`${c.id} giữ hành vi y hệt main (nenMain: ${c.nenMain.ketQua} ${c.nenMain.hs || ''})`,
      bang(hienTai, c.nenMain), { nenMain: c.nenMain, hienTai });
  } else {
    check(`${c.id} vá CÓ TÁC DỤNG (khác nền main: ${c.nenMain.ketQua} ${c.nenMain.hs || ''})`,
      !bang(hienTai, c.nenMain), { nenMain: c.nenMain, hienTai });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Quy tắc 6b (OZV-290) — regex MỚI ăn dữ liệu thật ⇒ (1) rã mẫu từng nhánh trên dữ liệu thật,
// (2) 1 ca ReDoS ~40.000 từ lặp phải < 2 giây.
// (1) rã mẫu: quét MỌI văn bản thật của kho (tên dòng tax.json + mô tả tiền lệ) — "vật liệu tổng hợp"
//     được đọc ra IFF văn bản thật sự nhắc composite / vật liệu tổng hợp (không bắt nhầm, không bỏ sót).
// (2) ReDoS: mẫu "composites" lặp 40.000 từ + khoảng trắng dài ⇒ phải < 2 giây.
const { chatLieuTrong } = require('../lib/so-tay-gates.js');
const TEN_VAT_LIEU = 'vật liệu tổng hợp';
// KỲ VỌNG phải soi theo ĐÚNG luật ranh giới chữ của máy (`W()`): "composite" phải đứng riêng —
// "Aluminum compositepanel" (tiền lệ 39199099#1) là chữ dính ⇒ máy KHÔNG đọc, và kỳ vọng cũng vậy.
// ⚠️ BẮT BUỘC có cờ `u`: không có `u` thì `\p{L}` là identity escape ⇒ `[\p{L}\p{M}]` thành tập KÝ TỰ
// LITERAL `[p{L}M]` ⇒ "compositeness" bị coi là khớp (sai với máy) — lỗi do soat-khac chỉ ra, GĐ vá.
// Mẫu phải soi Y HỆT `MATERIALS` trong lib/so-tay-gates.js: `vật liệu tổng hợp` · `vật liệu composite`
// · `W('composites?')` (chữ dính bị loại) · 2 mẫu Trung Quốc.
const NHAC_COMPOSITE = /vật\s+liệu(?:\s+cách\s+điện)?\s+tổng\s+hợp|vật\s+liệu\s+composite|(?<![\p{L}\p{M}])composites?(?![\p{L}\p{M}])|复合绝缘子|复合材料/iu;

const vanBanThat = [];
try {
  const tax = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tax.json'), 'utf8'));
  const dong = Array.isArray(tax) ? tax : Object.values(tax.items || tax.rows || tax);
  for (const r of dong) {
    if (!r || typeof r !== 'object') continue;
    const hs = String(r.hs || r.code || r.ma || '');
    if (r.vn) vanBanThat.push([`tax:${hs}.vn`, String(r.vn)]);
    if (r.en) vanBanThat.push([`tax:${hs}.en`, String(r.en)]);
  }
  const pre = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'precedents.json'), 'utf8'));
  for (const [ma, lst] of Object.entries(pre)) {
    for (const [i, p] of (Array.isArray(lst) ? lst : []).entries()) {
      const t = `${p.productName || ''} ${p.technicalSpec || ''}`.trim();
      if (t) vanBanThat.push([`pre:${ma}#${i}`, t]);
    }
  }
} catch (e) {
  check('đọc dữ liệu thật (tax.json + precedents.json) để rã mẫu', false, String(e.message));
}

// Ca biên: kỳ vọng phải khớp ĐÚNG luật của máy — "compositeness" là chữ dính ⇒ MÁY không đọc,
// và kỳ vọng cũng phải không đọc (trước khi vá, mẫu thiếu cờ `u` ⇒ kỳ vọng SAI ở ca này).
for (const bien of ['compositeness', 'Aluminum compositepanel', 'composites', 'vật liệu tổng hợp']) {
  const mong = NHAC_COMPOSITE.test(bien);
  const co = chatLieuTrong(bien).includes(TEN_VAT_LIEU);
  check(`ca biên "${bien}": kỳ vọng khớp đúng luật máy (${co ? 'có' : 'không'})`, mong === co, { mong, co });
}

let lech = 0;
const lechList = [];
for (const [nguon, txt] of vanBanThat) {
  const co = chatLieuTrong(txt).includes(TEN_VAT_LIEU);
  const mong = NHAC_COMPOSITE.test(txt);
  if (co !== mong) { lech += 1; if (lechList.length < 8) lechList.push({ nguon, mong, co, txt: txt.slice(0, 90) }); }
}
check(`rã mẫu trên ${vanBanThat.length} văn bản THẬT: đọc "${TEN_VAT_LIEU}" đúng IFF văn bản nhắc composite`,
  lech === 0, { lech, lechList });

const REDOS_LAU = `vật liệu composite ${'composites '.repeat(40000)}`;
const t0 = Date.now();
const ketRedos = chatLieuTrong(REDOS_LAU);
const msRedos = Date.now() - t0;
check(`ReDoS: 40.000 từ lặp (${REDOS_LAU.length} ký tự) chạy ${msRedos} ms (< 2000 ms)`,
  msRedos < 2000, { msRedos, ketRedos });

// ─────────────────────────────────────────────────────────────────────────────
// OZV-2102 — Cạnh loại trừ 2 chiều 82.01 ↔ 70.19 cho ca 38 tầng 4 số ('Sào rút / sợi thủy tinh / hái hoa quả')
{
  const D = require('../lib/do-thi/index.js');
  const ST = require('../lib/so-tay.js');
  const H = require('../lib/hoi-theo-so-tay.js');
  const { soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');

  const s8201 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '8201.json'), 'utf8'));
  const s7019 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '7019.json'), 'utf8'));
  const v8201 = ST.verifySoTay(s8201, '8201');
  const v7019 = ST.verifySoTay(s7019, '7019');
  check('OZV-2102: verifySoTay 8201 và 7019 đạt 100% (0 mục bị loại)',
    v8201.loai.length === 0 && v7019.loai.length === 0,
    { loai8201: v8201.loai, loai7019: v7019.loai });

  const c5_8201_7019 = D.canhTu('8201', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '7019');
  const c5_7019_8201 = D.canhTu('7019', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8201');
  const c6_7019_8201 = D.canhTu('7019', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8201');
  const c6_8201_7019 = D.canhTu('8201', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '7019');
  check('OZV-2102: đồ thị 2 chiều C5/C6 giữa 8201 ↔ 7019 giữ đủ trích nguồn + canCuLoaiTru',
    c5_8201_7019.some((e) => e.nguon === 'nhom8201.nhom' && e.canCuLoaiTru?.nguon === 'nhom7019.nhom')
    && c5_7019_8201.some((e) => e.nguon === 'nhom7019.nhom' && e.canCuLoaiTru?.nguon === 'nhom8201.nhom')
    && c6_7019_8201.length >= 1
    && c6_8201_7019.length >= 1,
    { c5_8201_7019: c5_8201_7019.length, c5_7019_8201: c5_7019_8201.length });

  const moTaCa38 = 'Sào rút / sợi thủy tinh / hái hoa quả';
  const mo8201 = D.moRongUngVien(['8201'], moTaCa38, { toiDa: 10 });
  const mo7019 = D.moRongUngVien(['7019'], moTaCa38, { toiDa: 10 });
  check('OZV-2102: moRongUngVien kéo 2 chiều 8201 ↔ 7019 trên ca 38 "Sào rút / sợi thủy tinh / hái hoa quả"',
    mo8201.some((x) => x.nhom === '7019') && mo7019.some((x) => x.nhom === '8201'),
    { tu8201: mo8201.map((x) => x.nhom), tu7019: mo7019.map((x) => x.nhom) });

  const rel8201 = nhomLienQuanSoTay('8201');
  const rel7019 = nhomLienQuanSoTay('7019');
  check('OZV-2102: nhomLienQuanSoTay hai chiều 8201 ↔ 7019',
    rel8201.includes('7019') && rel7019.includes('8201'),
    { rel8201, rel7019 });

  const g8201To7019 = soTayGates({
    hs: '82019000',
    productText: 'Thân sào bằng sợi thủy tinh đơn thuần chưa gắn đầu dụng cụ nông nghiệp',
    productName: 'Thân sào bằng sợi thủy tinh đơn thuần chưa gắn đầu dụng cụ nông nghiệp',
    candidateHeadings: ['8201', '7019'],
  });
  const g7019To8201 = soTayGates({
    hs: '70199090',
    productText: 'Dụng cụ cầm tay sử dụng trong nông nghiệp hái hoa quả có đầu cắt gắn trên sào rút bằng sợi thủy tinh',
    productName: 'Dụng cụ cầm tay sử dụng trong nông nghiệp hái hoa quả có đầu cắt gắn trên sào rút bằng sợi thủy tinh',
    candidateHeadings: ['7019', '8201'],
  });
  check('OZV-2102 (thuận soTayGates): kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 8201 → 7019 và 7019 → 8201',
    (g8201To7019.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('7019'))
    && (g7019To8201.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8201')),
    { g8201To7019: g8201To7019.challenges, g7019To8201: g7019To8201.challenges });

  const gDoi8201 = soTayGates({
    hs: '82011000',
    productText: 'Mai và xẻng bằng thép dùng trong nông nghiệp',
    productName: 'Mai và xẻng bằng thép dùng trong nông nghiệp',
    candidateHeadings: ['8201', '7019'],
  });
  const gDoi7019 = soTayGates({
    hs: '70198010',
    productText: 'Len thủy tinh cách nhiệt dạng cuộn',
    productName: 'Len thủy tinh cách nhiệt dạng cuộn',
    candidateHeadings: ['7019', '8201'],
  });
  check('OZV-2102 (đối chứng soTayGates): hàng thật của 8201 (mai và xẻng) và 7019 (len thủy tinh) không kích hoạt oan 8201 ↔ 7019',
    !(gDoi8201.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('7019'))
    && !(gDoi7019.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8201')),
    { gDoi8201: gDoi8201.challenges, gDoi7019: gDoi7019.challenges });

  const pb8201 = H.cauPhanBietNhom('8201', ['8201', '7019'], moTaCa38);
  const pb7019 = H.cauPhanBietNhom('7019', ['7019', '8201'], moTaCa38);
  check('OZV-2102 (thuận cauPhanBietNhom): sinh câu PHAN_BIET_NHOM 2 chiều 82.01 ↔ 70.19 cho ca 38',
    pb8201.length === 1 && pb8201[0].nguon === 'nhom8201.nhom' && /70\.19/.test(pb8201[0].questionVi)
    && pb7019.length === 1 && pb7019[0].nguon === 'nhom7019.nhom' && /82\.01/.test(pb7019[0].questionVi),
    { pb8201, pb7019 });

  const pbDoi8201 = H.cauPhanBietNhom('8201', ['8201', '7019'], 'Mai và xẻng bằng thép dùng trong nông nghiệp');
  const pbDoi7019 = H.cauPhanBietNhom('7019', ['7019', '8201'], 'Len thủy tinh cách nhiệt dạng cuộn');
  check('OZV-2102 (đối chứng cauPhanBietNhom): không hỏi oan 82.01 ↔ 70.19 trên hàng không liên quan',
    pbDoi8201.length === 0 && pbDoi7019.length === 0,
    { pbDoi8201, pbDoi7019 });
}

console.log(`\nvật liệu tổng hợp (composite) — OZV-581 / OZV-540 PA-3: ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
