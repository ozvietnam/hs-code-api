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

console.log(`\nvật liệu tổng hợp (composite) — OZV-581 / OZV-540 PA-3: ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
