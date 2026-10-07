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

assert('1509 (giữ bản sửa đổi 2022, bị cắt 2.000 ký tự) vẫn báo bị cắt', ids('15091000').includes('heading-note-truncated'), JSON.stringify(ids('15091000')));
assert('7108 (tập PDF không có 71.06–71.18) báo thiếu chú giải nhóm', ids('71081200').includes('heading-note-missing'), JSON.stringify(ids('71081200')));
const H = require('../data/chu-giai-heading.json');
assert('8471 đã nhập toàn văn: không còn báo cắt, có cả phần "không bao gồm"', !ids('84713020').includes('heading-note-truncated') && H['8471'].nhom_day_du && H['8471'].nhom.length > 10000 && /không bao gồm/.test(H['8471'].nhom), JSON.stringify(ids('84713020')));
assert('8481 (trước trống) nay có toàn văn', !ids('84818099').length && H['8481'].nhom.length > 5000, JSON.stringify(ids('84818099')));
assert('Chương 52, 81 (trước trống) nay có chú giải chương', !ids('52051100').includes('chapter-note-missing') && !ids('81019400').includes('chapter-note-missing'));
assert('Tối thiểu 1.150 nhóm có toàn văn — không để dữ liệu thụt lùi', Object.values(H).filter((r) => r.nhom_day_du).length >= 1150);
assert('Chương 50 (HS không có chú giải chương) không bị báo thiếu chú giải chương', !ids('50040000').includes('chapter-note-missing'));
assert('Chương 98 (quốc gia) không đòi chú giải chi tiết WCO', !ids('98040000').some((x) => x.startsWith('heading-')));
const full = Object.keys(require('../data/chu-giai-heading.json')).map((h) => `${h}0000`).find((hs) => notesCoverage(hs).complete);
assert('có nhóm đủ chú giải → complete=true, không cảnh báo', full && notesCoverageWarning(full) === null, full);
const w = notesCoverageWarning('71081200');
assert('cảnh báo notes-incomplete có mô tả + cách xử lý', w && w.id === 'notes-incomplete' && /7108/.test(w.description) && w.fix);
assert('nêu lệch bản HS 2017 / biểu 2022', notesCoverage('84713020').caveats.some((c) => /HS 2017/.test(c)));

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
