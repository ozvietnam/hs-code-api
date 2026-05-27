#!/usr/bin/env node
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { matchProducts } = require('../lib/product-match.js');

let passed = 0;
let failed = 0;

function assert(name, cond, detail) {
  if (cond) {
    console.log('PASS', name);
    passed += 1;
  } else {
    console.log('FAIL', name, detail || '');
    failed += 1;
  }
}

const r = matchProducts({
  titleZh: '半自动缠绕膜机',
  titleVi: 'Máy quấn màng bán tự động',
  specs: [{ key: '功率', value: '2kW' }],
  topK: 5,
});

assert('ok true', r.ok === true);
assert('top 5 matches', r.matches.length <= 5 && r.matches.length > 0);
assert('dotted code', /^\d{4}\.\d{2}\.\d{2}$/.test(r.matches[0].code));
assert('confidence range', r.matches[0].confidence > 0 && r.matches[0].confidence <= 1);

try {
  matchProducts({});
  assert('validation throws', false);
} catch (e) {
  assert('validation throws', e.code === 'VALIDATION');
}

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
