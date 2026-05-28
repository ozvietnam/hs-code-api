#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const tax = require('../data/tax.json');

const total = Object.keys(tax).length;
const withNameEn = Object.values(tax).filter((r) => r.en && String(r.en).trim()).length;
const coverage = withNameEn / total;

if (coverage < 0.75) {
  console.error('FAIL nameEn coverage <75%', { withNameEn, total, coverage });
  process.exit(1);
}
if (!tax['85171300']?.en) {
  console.error('FAIL expected 85171300 to have nameEn');
  process.exit(1);
}
console.log('PASS augment-english coverage', (coverage * 100).toFixed(2) + '%');
