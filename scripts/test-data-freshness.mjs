#!/usr/bin/env node
import './test-isolate-data.mjs';
/** Tính trạng thái độ mới dữ liệu + cảnh báo VAT hết hạn (thời gian cố định, không phụ thuộc hôm nay). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { evaluateSource, freshnessReport } = require('../lib/data-freshness');

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };
const at = (d) => new Date(`${d}T12:00:00Z`);

check('trong hạn → OK', evaluateSource('x', { lastCheckedAt: '2026-01-01', checkEveryDays: 30 }, at('2026-01-20')).status === 'OK');
check('quá hạn đối chiếu → DUE', evaluateSource('x', { lastCheckedAt: '2026-01-01', checkEveryDays: 30 }, at('2026-03-01')).status === 'DUE');
check('sắp hết hiệu lực → EXPIRING', evaluateSource('x', { validUntil: '2026-12-31', warnBeforeDays: 60 }, at('2026-12-01')).status === 'EXPIRING');
check('hết hiệu lực → EXPIRED', evaluateSource('x', { validUntil: '2026-12-31' }, at('2027-01-02')).status === 'EXPIRED');
const rep = freshnessReport();
check('manifest có tariff + vatReduction', ['tariff', 'vatReduction'].every((k) => rep.sources.some((s) => s.key === k)));

// VAT: sau 31/12/2026 dòng đang giảm phải báo hết hạn, không im lặng báo 8%.
const vr = require('../lib/vat-reduction');
const realNow = Date.now;
const row = { vat: '8/10', giam_vat: '' };
check('VAT trong hạn: eligible=true, có validUntil', vr.vatReductionOf(row).eligible === true && vr.vatReductionOf(row).validUntil === '2026-12-31');
Date.now = () => at('2027-01-05').getTime();
const OrigDate = Date;
globalThis.Date = class extends OrigDate { constructor(...a) { super(...(a.length ? a : [at('2027-01-05').getTime()])); } static now() { return at('2027-01-05').getTime(); } };
const exp = vr.vatReductionOf(row);
globalThis.Date = OrigDate;
Date.now = realNow;
check('VAT sau hạn: eligible=null + cảnh báo', exp.eligible === null && exp.severity === 'warning' && /hết hạn/.test(exp.noteVi), exp);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
