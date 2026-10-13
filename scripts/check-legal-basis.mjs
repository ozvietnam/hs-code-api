#!/usr/bin/env node
/**
 * Kiểm MỌI câu trích của lib/legal-basis.js có nguyên văn trong TT 85/2026/TT-BTC.
 *   node scripts/check-legal-basis.mjs --text=<tệp văn bản trích từ PDF Công báo>
 * Văn bản gốc: oz-wiki-plhq raw/download/congbaocdn.chinhphu.vn/2026/7/18/85-2026-tt-btc.pdf (sha256 trong lib/legal-basis.js).
 * Trích chữ: python3 -c "import fitz;print(''.join(p.get_text() for p in fitz.open('85-2026-tt-btc.pdf')))" > tt85.txt
 * (CI không có PDF nên bước này chạy tay khi sửa CLAUSES; khi kho wiki có điều khoản có cấu trúc thì chuyển sang đọc tệp đó.)
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { CLAUSES } = require('../lib/legal-basis.js');
const { squash } = require('../lib/wco-op.js');
const a = process.argv.find((x) => x.startsWith('--text='));
if (!a) { console.error('Thiếu --text=<tệp>'); process.exit(2); }
const src = squash(fs.readFileSync(a.slice(7), 'utf8'));
let bad = 0;
for (const [id, c] of Object.entries(CLAUSES)) {
  const frags = c.trich.split(/…|\.{3,}/).map(squash).filter((f) => f.length >= 6);
  const miss = frags.filter((f) => !src.includes(f));
  console.log(`${miss.length ? 'FAIL' : 'ok  '} ${id}`);
  if (miss.length) bad += 1;
}
console.log(bad ? `${bad} điều khoản KHÔNG khớp văn bản` : `${Object.keys(CLAUSES).length} điều khoản khớp nguyên văn`);
process.exit(bad ? 1 : 0);
