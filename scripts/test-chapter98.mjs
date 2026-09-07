#!/usr/bin/env node
/**
 * Chương 98 là mã thuế ưu đãi RIÊNG, không phải kết luận phân loại.
 *
 * Test này vừa khoá hành vi, vừa ĐO LẠI bằng chứng trên benchmark thật để con số
 * trong lib/chapter98.js không trở thành lời đồn: nếu sau này dữ liệu đổi mà
 * chương 98 bắt đầu xuất hiện trong đáp án thật, test sẽ báo để xem lại chính
 * sách này.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  isChapter98,
  userAskedForChapter98,
  filterChapter98,
  chapter98Warning,
} = require('../lib/chapter98.js');

let passed = 0;
let failed = 0;
function assert(name, cond, detail) {
  if (cond) {
    console.log('PASS', name);
    passed += 1;
  } else {
    console.log('FAIL', name, detail === undefined ? '' : JSON.stringify(detail));
    failed += 1;
  }
}

// --- Nhận diện ----------------------------------------------------------------
assert('98452000 là chương 98', isChapter98('98452000') === true);
assert('84137090 không phải chương 98', isChapter98('84137090') === false);
assert('9845 (4 số) là chương 98', isChapter98('9845') === true);
assert('null không sập', isChapter98(null) === false);

// --- Người dùng chủ động hỏi thì phải giữ lại ---------------------------------
for (const q of ['9845', '98', '98.45', 'chương 98', 'Chương 98', 'chapter 98', 'thuế ưu đãi riêng']) {
  assert(`nhận ra chủ động hỏi: "${q}"`, userAskedForChapter98(q) === true);
}
for (const q of ['máy bơm', '8413', 'kính cường lực', '', null]) {
  assert(`KHÔNG nhầm là chủ động hỏi: ${JSON.stringify(q)}`, userAskedForChapter98(q) === false);
}

// --- Lọc ----------------------------------------------------------------------
const mixed = [
  { hsCode: '70072990' }, { hsCode: '98452000' }, { hsCode: '84137090' }, { hsCode: '98343900' },
];
const filtered = filterChapter98(mixed, { query: 'kính cường lực' });
assert('loại đúng 2 mã chương 98', filtered.removed === 2, filtered);
assert('giữ lại mã thường', filtered.items.every((i) => !isChapter98(i.hsCode)));
assert('có nêu lý do', typeof filtered.reason === 'string' && filtered.reason.length > 10);

const asked = filterChapter98(mixed, { query: '9845' });
assert('người dùng hỏi ch.98 → giữ nguyên', asked.removed === 0 && asked.items.length === 4);

const forced = filterChapter98(mixed, { query: 'kính', include: true });
assert('include=true → giữ nguyên', forced.removed === 0);

// Không bao giờ trả rỗng chỉ vì lọc — thà đưa kèm cảnh báo còn hơn bỏ trắng.
const all98 = filterChapter98([{ hsCode: '98452000' }, { hsCode: '98343900' }], { query: 'kính' });
assert('không trả rỗng khi mọi ứng viên đều là ch.98', all98.items.length === 2 && all98.removed === 0, all98);

assert('mảng rỗng không sập', filterChapter98([], {}).items.length === 0);
assert('đầu vào không phải mảng không sập', filterChapter98(null, {}).items.length === 0);

// Hỗ trợ cả hình dạng {hs} và chuỗi thuần
assert(
  'lọc được mảng chuỗi thuần',
  filterChapter98(['98452000', '84137090'], { query: 'bơm' }).items.length === 1,
);
assert(
  'lọc được item dạng {code4}',
  filterChapter98([{ code4: '9845' }, { code4: '8413' }], { getHs: (x) => x.code4, query: 'bơm' }).items.length === 1,
);

// --- Cảnh báo -----------------------------------------------------------------
const w = chapter98Warning('98452000');
assert('có cảnh báo cho mã ch.98', w?.code === 'CHAPTER_98_SPECIAL_REGIME');
assert('cảnh báo nói rõ phải tra chương 01–97', /01[–-]97/.test(w?.message || ''), w?.message);
assert('mã thường không có cảnh báo', chapter98Warning('84137090') === null);

// --- ĐO LẠI BẰNG CHỨNG TRÊN BENCHMARK THẬT ------------------------------------
// Đây là phần quan trọng nhất: nếu giả định nền sụp thì chính sách phải xem lại.
let report = null;
try {
  report = require('../data/accuracy-report-2026-05-28.json');
} catch {
  console.log('SKIP  không có accuracy-report — bỏ qua phần đo bằng chứng');
}

if (report?.results?.length) {
  const truth98 = report.results.filter((r) => isChapter98(r?.decl?.hsCode)).length;
  assert(
    `benchmark: KHÔNG tờ khai thật nào có đáp án chương 98 (đang ${truth98})`,
    truth98 === 0,
    { truth98, hint: 'Nếu số này > 0, chính sách loại chương 98 phải được xem lại!' },
  );

  const errs = report.results.filter((r) => r.isTop1Correct === false && r.top1);
  const pred98 = errs.filter((r) => isChapter98(r.top1)).length;
  const pct = errs.length ? (pred98 / errs.length) * 100 : 0;
  console.log(
    `INFO  benchmark: ${pred98}/${errs.length} lỗi (${pct.toFixed(0)}%) là do đoán vào chương 98 — ` +
    'đây là phần lỗi mà bộ lọc này loại bỏ được',
  );
  assert('benchmark: chương 98 từng gây lỗi đáng kể (lý do bộ lọc tồn tại)', pred98 > 0, { pred98 });
}

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
