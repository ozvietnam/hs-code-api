#!/usr/bin/env node
import './test-isolate-data.mjs';
/** Trường thuế đọc được bằng máy: ĐVT chuẩn hoá, hạn ngạch tách số. */
import { createRequire } from 'module';
import { normalizeUnit } from './normalize-units.mjs';
const require = createRequire(import.meta.url);
const { taxData } = require('../lib/data');
const { mapTaxLookup } = require('../lib/tax-mapper');

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };

const bad = Object.values(taxData).filter((r) => r.dvt !== normalizeUnit(r.dvt)).map((r) => `${r.hs}:${r.dvt}`);
check('ĐVT không còn khoảng trắng lệch (chạy scripts/normalize-units.mjs --apply)', bad.length === 0, bad.slice(0, 5));

const quotaRows = Object.values(taxData).filter((r) => /NHN/.test(r.mfn));
const parsed = quotaRows.filter((r) => mapTaxLookup(r.hs).tariffQuota);
check(`mọi dòng hạn ngạch (${quotaRows.length}) đều tách được số`, quotaRows.length > 0 && parsed.length === quotaRows.length, quotaRows.filter((r) => !mapTaxLookup(r.hs).tariffQuota).map((r) => r.mfn));
const q = mapTaxLookup('17011200').tariffQuota;
check('17011200: 25% trong / 80% ngoài hạn ngạch', q?.mfnInQuota === 25 && q?.mfnOutQuota === 80);
check('mã thường không có tariffQuota', !mapTaxLookup('84137011').tariffQuota);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
