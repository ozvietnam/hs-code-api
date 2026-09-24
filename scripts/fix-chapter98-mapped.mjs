#!/usr/bin/env node
/**
 * Sửa lệch cột chương 98 trong data/tax.json (idempotent).
 *
 * Ở chương 98 (Mục II Phụ lục II biểu thuế), cột thứ ba của biểu gốc là
 * "Mã hàng tương ứng tại Mục I" — KHÔNG phải đơn vị tính. Khi nạp dữ liệu, cột
 * này bị đổ vào `dvt`: 444/457 dòng có dvt là một mã 8 số (VD 98041500 →
 * "03061500"), 2 dòng là nhóm 4 số (7228, 7229), 8 dòng là câu "Tùy theo bản
 * chất mặt hàng...". ERP đọc `unitVi = "03061500"` là sai.
 *
 * Việc làm:
 *   · chuyển giá trị gốc sang trường mới `ma_tuong_ung`;
 *   · `dvt` = đơn vị tính của mã tương ứng (khi đó là mã 8 số có trong biểu),
 *     còn lại để trống — chương 98 tính theo đơn vị của mã gốc.
 * KHÔNG tự điền VAT/ACFTA: API trả kèm thông tin mã tương ứng để người khai
 * đối chiếu (lib/tax-mapper.js → mappedHs).
 *
 *   node scripts/fix-chapter98-mapped.mjs          # dry-run
 *   node scripts/fix-chapter98-mapped.mjs --apply
 */
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { dataPath, dataReadPath } = require('../lib/data-paths.js');

const apply = process.argv.includes('--apply');
const tax = JSON.parse(fs.readFileSync(dataReadPath('tax.json'), 'utf8'));

let moved = 0;
let unitFilled = 0;
for (const row of Object.values(tax)) {
  if (!row.hs.startsWith('98')) continue;
  if ('ma_tuong_ung' in row) continue; // đã sửa
  const orig = String(row.dvt || '').trim();
  row.ma_tuong_ung = orig;
  const mapped = /^\d{8}$/.test(orig) ? tax[orig] : null;
  row.dvt = mapped && !mapped.hs.startsWith('98') ? mapped.dvt : '';
  moved += 1;
  if (row.dvt) unitFilled += 1;
}

console.log(`Chương 98: chuyển ${moved} dòng sang ma_tuong_ung, điền ĐVT từ mã gốc cho ${unitFilled} dòng.`);
if (!apply) {
  console.log('[DRY RUN] Chạy lại với --apply để ghi.');
} else if (moved) {
  fs.writeFileSync(dataPath('tax.json'), JSON.stringify(tax));
  console.log('Đã ghi data/tax.json');
}
