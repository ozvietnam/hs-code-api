#!/usr/bin/env node
/**
 * Kiểm MỌI câu trích của lib/legal-basis.js có nguyên văn trong văn bản gốc.
 *   node scripts/check-legal-basis.mjs --text=<tệp văn bản trích từ PDF Công báo>                       # TT 85/2026 (mặc định)
 *   node scripts/check-legal-basis.mjs --van-ban=121/2025/TT-BTC --text=<tệp trích Công báo số 60>      # chỉ tiêu TT 121/2025
 * TT 85: oz-wiki-plhq raw/download/congbaocdn.chinhphu.vn/2026/7/18/85-2026-tt-btc.pdf; bản trích sẵn
 *   tests/fixtures/legal/tt85-2026-cong-bao-409.txt (scripts/test-evidence-pack.mjs chạy lệnh này). So khớp bỏ dấu câu (như cũ).
 * TT 121: oz-wiki-plhq raw/download/congbaocdn.chinhphu.vn/2026/1/29/121-2025-tt-btc.pdf; bản trích sẵn
 *   tests/fixtures/legal/tt121-2025-cong-bao-60-trich.txt (pdftotext -layout). So khớp NGUYÊN VĂN: từng chữ, từng dấu, đúng thứ tự.
 * sha256 của PDF ghi trong lib/legal-basis.js. Sửa CLAUSES / CHI_TIEU_TT121 thì vẫn đối chiếu PDF gốc.
 * Mã thoát: 0 khớp hết · 1 có câu không khớp · 2 thiếu tham số / văn bản không có trong sổ.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { SO_VAN_BAN, TT85, kiemNguyenVan } = require('../lib/legal-basis.js');
const arg = (k) => process.argv.find((x) => x.startsWith(`--${k}=`))?.slice(k.length + 3);
const tep = arg('text');
if (!tep) { console.error('Thiếu --text=<tệp>'); process.exit(2); }
const vanBan = arg('van-ban') || TT85.soHieu;
const so = SO_VAN_BAN[vanBan];
if (!so) { console.error(`Văn bản không có trong sổ: ${vanBan} (có: ${Object.keys(SO_VAN_BAN).join(', ')})`); process.exit(2); }
const kq = kiemNguyenVan(so.muc, fs.readFileSync(tep, 'utf8'), { cheDo: so.cheDo });
for (const r of kq) {
  console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.id}`);
  if (!r.ok && so.cheDo === 'NGUYEN_VAN') for (const f of r.thieu) console.log(`       không thấy: ${f.slice(0, 120)}`);
}
const bad = kq.filter((r) => !r.ok).length;
console.log(bad ? `${bad} ${so.donVi} KHÔNG khớp văn bản` : `${kq.length} ${so.donVi} khớp nguyên văn`);
process.exit(bad ? 1 : 0);
