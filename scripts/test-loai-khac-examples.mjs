#!/usr/bin/env node
import './test-isolate-data.mjs';
/** Ví dụ "Loại khác": hàng thật và câu máy sinh không được trộn lẫn. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lk = require('../lib/loai-khac-products');
const fs = require('fs');

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };

const rows = fs.readFileSync('data/loai-khac-products.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const real = new Set(rows.filter((r) => r.source === 'oz-gold').map((r) => `${r.hs}|${r.tenHang}`));
const codes = [...new Set(rows.map((r) => r.hs))];
const leaked = codes.flatMap((hs) => lk.getProducts(hs, 50).map((t) => `${hs}|${t}`)).filter((k) => !real.has(k));
check('getProducts chỉ trả tên hàng thật (oz-gold)', leaked.length === 0, leaked.slice(0, 3));
const fallbackText = rows.filter((r) => r.source === 'rule-fallback').map((r) => r.tenHang);
const genLeak = codes.flatMap((hs) => lk.getGeneratedProducts(hs, 50)).filter((t) => fallbackText.includes(t));
check('câu rỗng nghĩa rule-fallback không bao giờ được trả', genLeak.length === 0, genLeak.slice(0, 3));
check('isLoaiKhac vẫn phủ đủ mã', codes.every((hs) => lk.isLoaiKhac(hs)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
