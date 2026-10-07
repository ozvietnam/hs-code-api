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

const H = require('../data/chu-giai-heading.json');
const C = require('../data/chu-giai-chuong.json');
const hs = Object.keys(H).filter((h) => !h.startsWith('98'));
assert('Mọi nhóm (trừ ch.98) có toàn văn bản HS 2022', hs.every((h) => H[h].nhom_day_du && H[h].phien_ban === '2022'), hs.filter((h) => H[h].phien_ban !== '2022').join(' '));
assert('Mọi nhóm (trừ ch.98) đủ chú giải → không cảnh báo', hs.every((h) => notesCoverage(`${h}0000`).complete), hs.filter((h) => !notesCoverage(`${h}0000`).complete).join(' '));
assert('8471 toàn văn, có cả phần "không bao gồm"', H['8471'].nhom.length > 10000 && /không bao gồm/.test(H['8471'].nhom));
assert('Nhóm mới HS 2022 có chú giải (8485 in 3D, 8524 màn hình dẹt, 3827)', ['8485', '8524', '3827'].every((h) => H[h].nhom.length > 400));
assert('71.06–71.18 (kim loại quý) có chú giải', ['7106', '7108', '7110', '7113', '7118'].every((h) => H[h].nhom.length > 300));
assert('8548 theo HS 2022: phế liệu pin đã chuyển sang 85.49', !/PHẾ LIỆU VÀ PHẾ THẢI CỦA CÁC LOẠI PIN/.test(H['8548'].nhom) && /pin/i.test(H['8549'].nhom));
assert('Chương 52, 81 có chú giải chương; 96 chương bản 2022', !ids('52051100').includes('chapter-note-missing') && Object.values(C).filter((c) => c.phien_ban === '2022').length >= 96);
assert('Không nhóm nào lẫn chú giải Phần/chương sau', !hs.some((h) => /(^|\n)(PHẦN|Phần)\s+[IVXL]+\s*:|(^|\n)Ch(ư|u)(ơ|o)ng\s+\d+\s*:/.test(H[h].nhom)));
assert('Chương 50 (HS không có chú giải chương) không bị báo thiếu chú giải chương', !ids('50040000').includes('chapter-note-missing'));
assert('Chương 98 (quốc gia) không đòi chú giải chi tiết WCO', !ids('98040000').some((x) => x.startsWith('heading-')));
assert('nhóm đủ chú giải → không cảnh báo', notesCoverageWarning('84713020') === null);
const w = notesCoverageWarning('00000000');
assert('mã không có chú giải → cảnh báo notes-incomplete có mô tả + cách xử lý', w && w.id === 'notes-incomplete' && w.description && w.fix);
assert('nhóm bản 2022 không còn lưu ý lệch HS 2017', !notesCoverage('84713020').caveats.some((c) => /HS 2017/.test(c)));

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
