#!/usr/bin/env node
/**
 * npm run so-tay:check — kiểm lại MỌI mục của data/so-tay/*.json với nguồn nguyên văn hiện hành
 * (sau mỗi lần nhập lại chú giải/SEN/biểu thuế, câu trích cũ có thể không còn đúng).
 * Đỏ khi có mục không kiểm được → sửa tay data/so-tay/<nhom>.json hoặc dựng lại nhóm đó
 * (node scripts/build-so-tay.mjs --nhom=<nhom> --force). Chưa có sổ tay nào thì xanh.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(ROOT, 'data', 'so-tay');
const { verifySoTay } = require('../lib/so-tay.js');

const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /^\d{4}\.json$/.test(f)) : [];
let bad = 0;
let items = 0;
for (const f of files) {
  const s = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const h4 = f.slice(0, 4);
  const { loai, tong } = verifySoTay(s, h4);
  items += tong;
  for (const x of loai) {
    bad += 1;
    console.log(`FAIL ${h4} ${x.kind}: ${x.lyDo} — ${JSON.stringify(x.item).slice(0, 160)}`);
  }
}
console.log(`sổ tay: ${files.length} nhóm, ${items} mục, ${bad} mục không kiểm được nguồn`);
process.exit(bad ? 1 : 0);
