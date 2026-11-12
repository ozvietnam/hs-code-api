#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-558 — ca kiểm MỚI: VẬT LIỆU quyết định TIÊU ĐỀ 6 SỐ (PA-B).
 *
 * Tệp ca: `tests/phan-biet-vat-lieu-tieu-de-6-so.json` (TỆP RIÊNG — không sửa tệp cổng của GĐ
 * `tests/ca-doi-chung-vat-lieu-8546-8547.json`, không sửa `scripts/bo-kiem-luat.mjs`,
 * không sửa `scripts/test-ca-doi-chung-vat-lieu.mjs`).
 *
 * Bốn chiều theo đặc tả GĐ:
 *   I   hàng nhựa/cao su ⇒ chốt 85469000 (trước vá: 85462010 — gốm sứ, SAI VẬT LIỆU)
 *   II  hàng gốm sứ ⇒ vẫn 85462010 (không hồi quy chiều ngược)
 *   III hàng KHÔNG nêu vật liệu ⇒ hành vi Y HỆT main (không mất chốt)
 *   IV  hàng "composite" ⇒ hành vi Y HỆT main (T3, ngoài phạm vi thẻ)
 *
 * Mỗi ca mang `nenMain` = hành vi đo được trên `origin/main` (5cd1e855) bằng chính tệp này (chế độ `--do`).
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

const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'phan-biet-vat-lieu-tieu-de-6-so.json'), 'utf8'));
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

console.log(`\nphân biệt vật liệu ở tầng tiêu đề 6 số (OZV-558): ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
