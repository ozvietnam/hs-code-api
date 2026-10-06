#!/usr/bin/env node
/** lib/notes-coverage.js: câu trả lời phải nói rõ khi chú giải còn thiếu hoặc bị cắt. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { notesCoverage, notesCoverageWarning } = require('../lib/notes-coverage.js');

let passed = 0;
let failed = 0;
const assert = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${extra}`}`);
  if (ok) passed += 1; else failed += 1;
};
const ids = (hs) => notesCoverage(hs).gaps.map((g) => g.id);

assert('8471: chú giải nhóm bị cắt ở 2.000 ký tự được báo', ids('84713020').includes('heading-note-truncated'), JSON.stringify(ids('84713020')));
assert('8481: chú giải nhóm trống được báo', ids('84818099').includes('heading-note-missing'), JSON.stringify(ids('84818099')));
assert('Chương 52: thiếu chú giải chương được báo', ids('52051100').includes('chapter-note-missing'));
assert('Chương 50 (HS không có chú giải chương) không bị báo thiếu chú giải chương', !ids('50040000').includes('chapter-note-missing'));
assert('Chương 98 (quốc gia) không đòi chú giải chi tiết WCO', !ids('98040000').some((x) => x.startsWith('heading-')));
const full = Object.keys(require('../data/chu-giai-heading.json')).map((h) => `${h}0000`).find((hs) => notesCoverage(hs).complete);
assert('có nhóm đủ chú giải → complete=true, không cảnh báo', full && notesCoverageWarning(full) === null, full);
const w = notesCoverageWarning('84713020');
assert('cảnh báo notes-incomplete có mô tả + cách xử lý', w && w.id === 'notes-incomplete' && /8471/.test(w.description) && w.fix);
assert('nêu lệch bản HS 2017 / biểu 2022', notesCoverage('84713020').caveats.some((c) => /HS 2017/.test(c)));

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
