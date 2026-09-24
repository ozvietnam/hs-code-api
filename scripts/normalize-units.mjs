#!/usr/bin/env node
/**
 * Chuẩn hoá khoảng trắng trong cột đơn vị tính (dvt) của data/tax.json (idempotent).
 * "kg/m/ chiếc" và "kg/m/chiếc" là cùng một đơn vị nhưng khác chuỗi → ERP so
 * khớp / nhóm theo ĐVT bị lệch.
 *
 *   node scripts/normalize-units.mjs [--apply]
 */
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { dataPath, dataReadPath } = require('../lib/data-paths.js');

export const normalizeUnit = (s) => String(s ?? '').replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();

if (import.meta.url === `file://${process.argv[1]}`) {
  const tax = JSON.parse(fs.readFileSync(dataReadPath('tax.json'), 'utf8'));
  let n = 0;
  for (const r of Object.values(tax)) {
    const v = normalizeUnit(r.dvt);
    if (v !== r.dvt) { r.dvt = v; n += 1; }
  }
  console.log(`Chuẩn hoá ĐVT: ${n} dòng`);
  if (process.argv.includes('--apply') && n) {
    fs.writeFileSync(dataPath('tax.json'), JSON.stringify(tax));
    console.log('Đã ghi data/tax.json');
  }
}
