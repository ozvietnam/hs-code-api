#!/usr/bin/env node
/**
 * BỔ SUNG `tenMa` vào data/bieu-thue/<phien-ban>/ten-nut.json từ bieu-chinh.jsonl.gz ĐÃ TRÍCH (không cần tệp Excel gốc) — #725 lỗi 29.
 * `tenMa` = tên NGUYÊN VĂN của phân nhóm 6 số theo chính dòng có mã 6 số của sheet chính (lib/bieu-thue.js#tenTheoMa).
 * Bản trích mới (scripts/bieu-thue/trich.mjs) đã tự ghi `tenMa`; script này chỉ để nâng bản đã trích trước đó.
 *   node scripts/bieu-thue/bo-sung-ten-ma.mjs --phien-ban=2026.04.05 [--kho]   (--kho: chỉ in số liệu, không ghi)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = require('../../lib/bieu-thue.js');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const ver = arg('phien-ban'); if (!ver) { console.error('Cần --phien-ban=<YYYY.MM.DD>'); process.exit(2); }
const dir = path.join('data', 'bieu-thue', ver);
const tk = JSON.parse(fs.readFileSync(path.join(dir, 'tong-ket.json'), 'utf8'));
const dong = B.docJsonlGz(path.join(dir, 'bieu-chinh.jsonl.gz')).filter((d) => d.sheet === tk.sheetChinh);
const tenMa = B.tenTheoMa(dong);
const tepTen = path.join(dir, 'ten-nut.json');
const tn = JSON.parse(fs.readFileSync(tepTen, 'utf8'));
console.log(`biểu ${ver} sheet ${tk.sheetChinh}: ${Object.keys(tenMa).length} phân nhóm 6 số có tên theo dòng mã${tn.tenMa ? ` (đang có ${Object.keys(tn.tenMa).length})` : ''}`);
if (process.argv.includes('--kho')) process.exit(0);
fs.writeFileSync(tepTen, JSON.stringify({ ...tn, tenMa }, null, 1));
console.log(`Đã ghi ${tepTen}. Chạy tiếp: node scripts/bieu-thue/kiem.mjs --phien-ban=${ver}`);
