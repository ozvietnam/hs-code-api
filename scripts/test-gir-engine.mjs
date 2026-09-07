#!/usr/bin/env node
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { applyGirRules } = require('../lib/gir-engine.js');

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

// GIR-3a + material: cotton shirt — specific 62052090 beats general 62059099
const shirt = applyGirRules(
  [
    { hsCode: '62059099', nameVi: 'Loại khác wool line', confidence: 92 },
    { hsCode: '62052090', nameVi: 'Loại khác cotton shirt', confidence: 88 },
  ],
  'áo sơ mi cotton nam may dệt',
);
assert('cotton shirt prefers 62052090', shirt.suggestions[0].hsCode === '62052090');
// GIR-3c tiebreaker: higher HS when confidence within 3%
const tie = applyGirRules(
  [
    { hsCode: '62052090', nameVi: 'A', confidence: 90 },
    { hsCode: '62053090', nameVi: 'B', confidence: 89 },
  ],
  'áo sơ mi',
);
assert('tiebreaker picks larger hs', tie.suggestions[0].hsCode === '62053090');

// ĐỔI HÀNH VI CÓ CHỦ ĐÍCH: gir-engine không còn tự phán định quy tắc GIR.
// Nó chỉ báo tín hiệu xếp hạng; việc trích dẫn GIR thuộc lib/gir.js, nơi mỗi
// trích dẫn phải kèm căn cứ + bằng chứng. Xem scripts/test-gir.mjs.
assert(
  'phát tín hiệu hoà điểm (không phải nhãn GIR)',
  tie.rankingSignals.some((s) => s.signal === 'numerical_order_tiebreak'),
  JSON.stringify(tie.rankingSignals),
);
assert(
  'KHÔNG còn tự gắn nhãn GIR',
  (tie.girRankingRules || []).length === 0,
  JSON.stringify(tie.girRankingRules),
);
const noFakeGir = applyGirRules(
  [{ hsCode: '84137090', nameVi: 'bơm', confidence: 90 }],
  'máy bơm ly tâm hoàn chỉnh',
);
assert(
  'tín hiệu xếp hạng luôn kèm ghi chú cảnh báo là ước lượng',
  noFakeGir.rankingSignals.every((s) => typeof s.note === 'string' && s.note.length > 0),
  JSON.stringify(noFakeGir.rankingSignals),
);

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
