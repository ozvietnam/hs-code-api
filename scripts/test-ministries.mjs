#!/usr/bin/env node
import './test-isolate-data.mjs';
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
// Sau sáp nhập 01/03/2025: BTTTT → BKHCN, BNNPTNT+BTNMT → BNNMT, BGTVT → BXD, BLĐTBXH → BNV.
assert('chương 85 → BKHCN (kế thừa BTTTT)', getMinistriesByChapter('85').some((m) => m.code === 'BKHCN'));
assert('không trả bộ đã sáp nhập theo chương', ['01', '28', '85', '87'].every((c) => getMinistriesByChapter(c).every((m) => m.status !== 'MERGED')));
assert('chương 01 → BNNMT', getMinistriesByChapter('01').some((m) => m.code === 'BNNMT'));
assert('chương 87 → BXD', getMinistriesByChapter('87').some((m) => m.code === 'BXD'));
const old = expandMinistryCodes(['BNNPTNT'])[0];
assert('mã bộ cũ vẫn giải được + chỉ bộ hiện hành', old?.code === 'BNNPTNT' && old.currentMinistry?.code === 'BNNMT', JSON.stringify(old));
assert('mọi successorCode trỏ tới bộ có thật', listMinistries().filter((m) => m.status === 'MERGED').every((m) => getMinistry(m.successorCode)));
const expanded = expandMinistryCodes(['BCT', 'BTTTT']);
assert('expand structured', expanded[0].fullNameVi && expanded[0].domain);

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
