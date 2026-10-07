#!/usr/bin/env node
/**
 * npm run so-tay:check — kiểm lại MỌI mục của data/so-tay/*.json với nguồn nguyên văn hiện hành
 * (sau mỗi lần nhập lại chú giải/SEN/biểu thuế, câu trích cũ có thể không còn đúng).
 * Đỏ khi có mục không kiểm được → sửa tay data/so-tay/<nhom>.json hoặc dựng lại nhóm đó
 * (node scripts/build-so-tay.mjs --nhom=<nhom> --force). Chưa có sổ tay nào thì xanh.
 * --raw=<thư mục> [nhom…]: kiểm BẢN NHÁP <nhom>.json do người/agent soạn trước khi nạp (in lý do từng mục).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(ROOT, 'data', 'so-tay');
const { verifySoTay } = require('../lib/so-tay.js');

// Kiểm bản nháp của người/agent soạn (chưa nạp): node scripts/check-so-tay.mjs --raw=<thư mục> [nhom…]
const rawArg = process.argv.find((a) => a.startsWith('--raw='));
const only = process.argv.slice(2).filter((a) => /^\d{4}$/.test(a));
const SRC = rawArg ? path.resolve(rawArg.slice(6)) : DIR;
const files = (fs.existsSync(SRC) ? fs.readdirSync(SRC).filter((f) => /^\d{4}\.json$/.test(f)) : [])
  .filter((f) => !only.length || only.includes(f.slice(0, 4)));
let bad = 0;
let items = 0;
for (const f of files) {
  const s = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
  const h4 = f.slice(0, 4);
  const { loai, tong, dat } = verifySoTay(s, h4);
  items += tong;
  if (rawArg) console.log(`${h4}: đạt ${dat}/${tong}`);
  for (const x of loai) {
    bad += 1;
    console.log(`${rawArg ? '  LOẠI' : 'FAIL'} ${h4} ${x.kind}: ${x.lyDo} — ${JSON.stringify(x.item).slice(0, 200)}`);
  }
}
console.log(`sổ tay${rawArg ? ' (bản nháp)' : ''}: ${files.length} nhóm, ${items} mục, ${bad} mục không kiểm được nguồn`);
// Bản nháp: chỉ báo, không đỏ (mục bị loại sẽ bị bỏ khi nạp). Dữ liệu đã nạp: đỏ nếu có mục hỏng.
process.exit(bad && !rawArg ? 1 : 0);
