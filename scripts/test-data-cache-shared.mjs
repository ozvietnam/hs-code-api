#!/usr/bin/env node
// #239 goal 1: mỗi tệp data chỉ MỘT bản trong RAM — nhiều module nhận cùng đối tượng (===).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let passed = 0;
let failed = 0;
const assert = (n, c, d) => { if (c) { passed += 1; console.log('PASS', n); } else { failed += 1; console.log('FAIL', n, d != null ? '→ ' + d : ''); } };

const { loadJson } = require('../lib/data-cache.js');
const { dataReadPath } = require('../lib/data-paths.js');
const data = require('../lib/data.js');

// tax.json: data.js phải trỏ cùng đối tượng với data-cache (classify.js/so-tay.js cũng gọi
// loadJson(dataReadPath('tax.json')) → cùng ô cache theo path).
const taxShared = loadJson(dataReadPath('tax.json'));
assert('data.js taxData === loadJson(tax.json)', data.taxData === taxShared);
assert('loadJson(tax.json) ổn định (cùng ===)', loadJson(dataReadPath('tax.json')) === taxShared);

// explanatory-notes: data.js === bản dùng chung
assert('data.js explanatoryNotesData === loadJson(explanatory-notes)', data.explanatoryNotesData === loadJson(dataReadPath('explanatory-notes.json'), {}));

// chu-giai-heading: loadJson ổn định (classify/so-tay/notes-coverage/declaration-options cùng ô)
const headShared = loadJson(dataReadPath('chu-giai-heading.json'), {});
assert('loadJson(chu-giai-heading) ổn định (cùng ===)', loadJson(dataReadPath('chu-giai-heading.json'), {}) === headShared);

// smoke: mọi module vừa sửa load được (bắt circular/require lỗi)
for (const m of ['../lib/classify.js', '../lib/so-tay.js', '../lib/notes-coverage.js', '../lib/declaration-options.js', '../lib/explanatory-notes-index.js']) {
  try { require(m); assert(`require ${m} OK`, true); } catch (e) { assert(`require ${m} OK`, false, e.message); }
}

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
