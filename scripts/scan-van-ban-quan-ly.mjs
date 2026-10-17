#!/usr/bin/env node
// Quét 200 HS codes có `cs` chứa mã văn bản — xác minh không ai trả mảng
// trùng lặp hoặc cắt cụt. Dùng để rà triệu chứng tương tự #328.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { buildTaxLookup } = require('../lib/tax-lookup');
const { taxData } = require('../lib/data');

const candidates = Object.values(taxData)
  .filter((r) => /\d+\/\d{4}\//.test(String(r.cs || '')))
  .slice(0, 200);
let bad = 0;
for (const row of candidates) {
  const r = buildTaxLookup(row.hs);
  const arr = r.vanBanQuanLy || [];
  const truncated = arr.filter((c) => /\d+\/\d{4}\/[NĐD]$/.test(c));
  const seen = new Set();
  const dup = arr.find((c) => {
    const k = c.replace(/Đ/g, 'D');
    if (seen.has(k)) return true;
    seen.add(k);
    return false;
  });
  if (truncated.length || dup) {
    bad++;
    console.log('BAD', row.hs, JSON.stringify(arr), 'truncated:', truncated, 'dup:', dup);
  }
}
console.log('Total scanned:', candidates.length, 'Bad:', bad);