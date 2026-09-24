#!/usr/bin/env node
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { searchPrecedents } = require('../lib/precedent-search.js');

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

const matches = searchPrecedents('máy bơm Pentax', { topK: 5 });
assert('precedent search returns results', matches.length > 0);
assert('match has similarity', matches[0].similarity > 0);
assert('match has finalHsCode', /^\d{8}$/.test(matches[0].finalHsCode));

// Thang điểm = độ phủ câu hỏi × khớp tên lõi (sau đợt gộp 2.400 tiền lệ 2026-09-24):
// tiền lệ có lý do dài lặp từ khoá không được chạm trần nữa.
function top(q) {
  const m = searchPrecedents(q, { topK: 1 })[0];
  return m ? { hs: m.finalHsCode, sim: m.similarity, name: m.precedent.productNameRaw } : null;
}
const t1 = top('xe nâng tay');
assert('xe nâng tay → 8427', t1 && t1.hs.startsWith('8427'), JSON.stringify(t1));
const t2 = top('rơ le điện từ 5V');
assert('rơ le điện từ 5V → 85364990, điểm ≥ 0,8', t2 && t2.hs === '85364990' && t2.sim >= 0.8, JSON.stringify(t2));
const t3 = top('thép cuộn cán nguội');
assert('thép cuộn cán nguội → 7209', t3 && t3.hs.startsWith('7209'), JSON.stringify(t3));
const t4 = top('nhãn nhựa tự dính đã in');
assert('nhãn nhựa tự dính đã in → 3919', t4 && t4.hs.startsWith('3919'), JSON.stringify(t4));
const t5 = top('xi lanh thủy lực');
assert('xi lanh thủy lực: không có tiền lệ tên khớp → điểm < 0,7 (không chạm trần)', t5 && t5.sim < 0.7, JSON.stringify(t5));
const t6 = searchPrecedents('máy bơm Pentax', { topK: 3 });
assert('máy bơm Pentax: không có tiền lệ nào ≥ 0,5 (không được cộng điểm)', t6.every((m) => m.similarity < 0.5), JSON.stringify(t6.map((m) => [m.finalHsCode, m.similarity])));
const { applyPrecedentBoost } = require('../lib/precedent-search.js');
const boosted = applyPrecedentBoost([{ hsCode: '85364990', confidence: 50 }, { hsCode: '85365099', confidence: 55 }], 'rơ le điện từ 5V');
assert('applyPrecedentBoost cộng điểm cho 85364990 và ghi girPrecedentRule', boosted.girPrecedentRule === 'GIR-4' && boosted.suggestions[0].hsCode === '85364990', JSON.stringify(boosted.suggestions));
const weak = applyPrecedentBoost([{ hsCode: '34039912', confidence: 50 }], 'máy bơm Pentax');
assert('khớp yếu (< 0,5) không cộng điểm', weak.girPrecedentRule === null, JSON.stringify(weak));

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
