#!/usr/bin/env node
import './test-isolate-data.mjs';
/** Ô chính sách trống ≠ "không có chính sách" — nhất là thuốc, vũ khí, thuốc nổ. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { mapTaxLookup } = require('../lib/tax-mapper');
const { taxData } = require('../lib/data');

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };

check('có chính sách → RECORDED', mapTaxLookup('01012100').policyStatus === 'RECORDED');
for (const hs of ['30033100', '93033010']) {
  const r = mapTaxLookup(hs);
  check(`${hs} trống → NOT_RECORDED + cảnh báo`, r.policyStatus === 'NOT_RECORDED' && r.policyNoteSeverity === 'warning', r);
}
const empty36 = Object.values(taxData).find((r) => r.hs.startsWith('36') && !String(r.cs).trim());
if (empty36) check('chương 36 trống → cảnh báo', mapTaxLookup(empty36.hs).policyNoteSeverity === 'warning');
const all = Object.keys(taxData).filter((h) => !h.startsWith('98')).slice(0, 2000).map((h) => mapTaxLookup(h));
check('mọi mã đều có policyStatus', all.every((r) => ['RECORDED', 'NOT_RECORDED'].includes(r.policyStatus)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
