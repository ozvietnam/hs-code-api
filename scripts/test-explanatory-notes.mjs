#!/usr/bin/env node
// A4 (#46) — Test lib/explanatory-notes.js (index O(1) theo hsCode + headingCode).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { getByHs, getByHeading, hasNote, getCoverageStats } = require('../lib/explanatory-notes.js');

let fail = 0;
const ok = (c, m) => { if (!c) { console.error('FAIL', m); fail += 1; } };

// 1. getByHs trả note cho mã đã biết có trong dataset.
const sample = getByHs('10041000');
ok(sample && sample.noteVi && sample.noteVi.length > 0, 'getByHs(10041000) phải có noteVi');
ok(sample && sample.hsCode === '10041000', 'getByHs trả đúng hsCode');

// 2. normalize: mã có dấu chấm vẫn tra được.
ok(!!getByHs('1004.10.00'), 'getByHs phải normalize mã có dấu chấm');

// 3. mã không tồn tại → null, hasNote=false.
ok(getByHs('00000000') === null, 'mã lạ phải trả null');
ok(hasNote('00000000') === false, 'hasNote mã lạ phải false');

// 4. getByHeading gom đúng theo nhóm 4-số.
const h = getByHeading('1004');
ok(Array.isArray(h) && h.length >= 1, 'getByHeading(1004) phải có ≥1 note');
ok(h.every((n) => String(n.headingCode || n.hsCode.slice(0, 4)) === '1004'), 'note trong nhóm phải cùng heading');

// 5. coverage stats hợp lệ.
const s = getCoverageStats();
ok(s.totalNotes > 8000, 'totalNotes phải > 8000');
ok(s.taxCoveragePct > 0 && s.taxCoveragePct <= 100, 'taxCoveragePct trong (0,100]');
ok(s.distinctChapters > 90, 'distinctChapters phải > 90');

if (fail) { console.error(`\n${fail} test FAIL`); process.exit(1); }
console.log('PASS explanatory-notes —', s.totalNotes, 'notes,', s.taxCoveragePct + '% tax coverage,', s.distinctChapters, 'chương');
