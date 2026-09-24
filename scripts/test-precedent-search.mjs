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
const t7 = top('Rơ le điện từ, hiệu Omron, model MY2N 5V, hàng mới 100%');
assert('nhãn hiệu + model + khuôn mẫu tờ khai không kéo tụt dưới ngưỡng cộng điểm: rơ le điện từ Omron MY2N 5V → 85364990 ≥ 0,5', t7 && t7.hs === '85364990' && t7.sim >= 0.5, JSON.stringify(t7));
const { stripDeclarationBoilerplate } = require('../lib/precedent-search.js');
assert('bỏ khuôn mẫu tờ khai nhưng giữ "tín hiệu"', stripDeclarationBoilerplate('Cáp tín hiệu, hiệu Omron, model X1, xuất xứ Trung Quốc, hàng mới 100%') === 'Cáp tín hiệu, Omron, X1, Trung Quốc,', JSON.stringify(stripDeclarationBoilerplate('Cáp tín hiệu, hiệu Omron, model X1, xuất xứ Trung Quốc, hàng mới 100%')));
const t9 = top('thép cuộn cán nguội SPCC Posco 1.2mm x 1219mm');
assert('thép cuộn cán nguội SPCC Posco 1.2mm → 7209 ≥ 0,5', t9 && t9.hs.startsWith('7209') && t9.sim >= 0.5, JSON.stringify(t9));
const t8 = searchPrecedents('Airtac SC50x100', { topK: 1 });
assert('câu hỏi toàn nhãn hiệu/model không khớp tiền lệ nào', !t8.length || t8[0].similarity === 0, JSON.stringify(t8.map((m) => [m.finalHsCode, m.similarity])));
const t5 = top('xi lanh thủy lực');
assert('xi lanh thủy lực: không có tiền lệ tên khớp → điểm < 0,7 (không chạm trần)', t5 && t5.sim < 0.7, JSON.stringify(t5));
const t6 = searchPrecedents('máy bơm Pentax', { topK: 3 });
assert('máy bơm Pentax: không có tiền lệ nào ≥ 0,5 (không được cộng điểm)', t6.every((m) => m.similarity < 0.5), JSON.stringify(t6.map((m) => [m.finalHsCode, m.similarity])));
const { applyPrecedentBoost } = require('../lib/precedent-search.js');
const boosted = applyPrecedentBoost([{ hsCode: '85364990', confidence: 50 }, { hsCode: '85365099', confidence: 55 }], 'rơ le điện từ 5V');
assert('applyPrecedentBoost cộng điểm cho 85364990 và ghi girPrecedentRule', boosted.girPrecedentRule === 'GIR-4' && boosted.suggestions[0].hsCode === '85364990', JSON.stringify(boosted.suggestions));
const noCand = applyPrecedentBoost([{ hsCode: '85365099', confidence: 55 }], 'máy bơm Pentax');
assert('có tiền lệ ≥ 0,5 nhưng không ứng viên nào mang mã đó → không gắn GIR-4, danh sách giữ nguyên', noCand.girPrecedentRule === null && noCand.suggestions.length === 1, JSON.stringify(noCand));
const weak = applyPrecedentBoost([{ hsCode: '34039912', confidence: 50 }], 'máy bơm Pentax');
assert('khớp yếu (< 0,5) không cộng điểm', weak.girPrecedentRule === null, JSON.stringify(weak));

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
