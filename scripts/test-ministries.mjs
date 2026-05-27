#!/usr/bin/env node
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { getMinistry, getMinistriesByChapter, expandMinistryCodes, listMinistries } = require('../lib/ministries.js');

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

assert('14 ministries', listMinistries().length >= 14);
assert('BCT full name', getMinistry('BCT')?.fullNameVi?.includes('Công Thương'));
assert('chapter 85 includes BTTTT', getMinistriesByChapter('85').some((m) => m.code === 'BTTTT'));
const expanded = expandMinistryCodes(['BCT', 'BTTTT']);
assert('expand structured', expanded[0].fullNameVi && expanded[0].domain);

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
