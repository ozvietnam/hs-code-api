#!/usr/bin/env node
/**
 * ACFTA: chuỗi "0 (-CN)" nghĩa là hàng Trung Quốc KHÔNG được hưởng 0%.
 * Test khoá cách đọc và quét TOÀN BỘ biểu thuế để không dòng nào rơi vào
 * định dạng lạ mà không ai hay.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { parseAcfta, acftaForOrigin } = require('../lib/acfta.js');
const { taxData } = require('../lib/data.js');
const { buildTaxLookup } = require('../lib/tax-lookup.js');

let passed = 0;
let failed = 0;
function assert(name, cond, detail) {
  if (cond) {
    console.log('PASS', name);
    passed += 1;
  } else {
    console.log('FAIL', name, detail === undefined ? '' : JSON.stringify(detail));
    failed += 1;
  }
}

// Đọc chuỗi
assert('mức đơn', parseAcfta('5').rate === 5 && parseAcfta('5').excludedCountries.length === 0);
assert('loại trừ CN', parseAcfta('0 (-KH, CN)').excludedCountries.join() === 'KH,CN');
assert('loại trừ không khoảng trắng', parseAcfta('30 (-BN,KH,ID,MY,MM,PH,CN)').excludedCountries.includes('CN'));
assert('"*" = không ưu đãi', parseAcfta('*').available === false);
assert('rỗng = null', parseAcfta('') === null);
assert('nhiều mức khác nhau → needsReview', parseAcfta('0 (-KH)/5').needsReview === true);
assert('định dạng lạ → needsReview', parseAcfta('abc').needsReview === true);

// Theo nước xuất xứ
assert('CN bị loại trừ → không eligible', acftaForOrigin('0 (-CN)', 'CN').eligible === false);
assert('TH vẫn được khi chỉ CN bị loại', acftaForOrigin('0 (-CN)', 'TH').rate === 0);
assert('"*" → không eligible', acftaForOrigin('*', 'CN').eligible === false);
assert('nước ngoài ACFTA → không eligible', acftaForOrigin('0', 'US').eligible === false);
assert('nhiều dòng con cùng mức cho CN → eligible', acftaForOrigin('0 (-MM, TH)/0/0', 'CN').rate === 0);
assert('nhiều dòng con khác mức → eligible null', acftaForOrigin('0 (-KH)/5', 'CN').eligible === null);
assert('ACFTA > MFN → cảnh báo', acftaForOrigin('50', 'CN', '30').higherThanMfn === true);
assert('MFN dạng chữ không gây lỗi', acftaForOrigin('0', 'CN', '30 (NHN: 80)').eligible === true);

// Quét toàn biểu: không dòng nào định dạng lạ, và mọi dòng "-CN" đều không eligible cho CN
const rows = Object.values(taxData);
const odd = rows.filter((r) => {
  const p = parseAcfta(r.acfta);
  return p && p.available === null;
}).map((r) => `${r.hs}:${r.acfta}`);
assert('không dòng nào định dạng ACFTA lạ', odd.length === 0, odd.slice(0, 10));

const cnRows = rows.filter((r) => /\bCN\b/.test(r.acfta) && !String(r.acfta).includes('/'));
const leaked = cnRows.filter((r) => acftaForOrigin(r.acfta, 'CN').eligible !== false).map((r) => r.hs);
assert(`${cnRows.length} dòng loại trừ CN đều không eligible cho CN`, cnRows.length > 400 && leaked.length === 0, leaked.slice(0, 10));

// Qua /api/tax
const t = buildTaxLookup('10019911');
assert('/api/tax trả acfta.forOrigin cho CN', t.acfta?.forOrigin?.eligible === false && t.taxAcftaChina?.eligible === false);
assert('/api/tax giữ taxAcfta thô cho ERP cũ', t.taxAcfta === '0 (-CN)');
assert('/api/tax origin=TH', buildTaxLookup('10019911', { origin: 'th' }).acfta.forOrigin.eligible === true);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
