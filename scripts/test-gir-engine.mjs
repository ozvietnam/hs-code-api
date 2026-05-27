#!/usr/bin/env node
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
assert('GIR-3c flagged', tie.girRankingRules.includes('GIR-3c'));

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
