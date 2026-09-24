#!/usr/bin/env node
/**
 * Dựng data/search.json từ data/tax.json: [{hs, vn, cs: '1'|'0'}] sắp theo mã.
 *
 * Trước đây search.json không có script dựng, bị lệch với biểu thuế: 12.000 mục
 * cho 11.871 mã (78 mã chương 98 lặp, 98050000 lặp 9 lần). Chạy lại sau mỗi lần
 * đổi tax.json; scripts/test-search-index.mjs kiểm hai file luôn khớp.
 *
 *   node scripts/build-search-index.mjs
 */
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { dataPath, dataReadPath } = require('../lib/data-paths.js');

export function buildSearchIndex(tax) {
  return Object.keys(tax).sort().map((hs) => ({
    hs,
    vn: tax[hs].vn,
    cs: String(tax[hs].cs || '').trim() ? '1' : '0',
  }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tax = JSON.parse(fs.readFileSync(dataReadPath('tax.json'), 'utf8'));
  const index = buildSearchIndex(tax);
  fs.writeFileSync(dataPath('search.json'), JSON.stringify(index));
  console.log(`search.json: ${index.length} mã`);
}
