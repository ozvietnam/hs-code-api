#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(rootDir, 'package.json'));
const { recommendByRules, getTypeByCode, listTypes } = require('./lib/customs-types');

const cases = JSON.parse(readFileSync(join(rootDir, 'tests', 'customs-types-cases.json'), 'utf8'));

let passed = 0;
let failed = 0;

const total = listTypes().length;
if (total < 40) {
  console.error(`FAIL catalog: only ${total} customs types (expected >= 40)`);
  process.exit(1);
}
console.log(`Catalog: ${total} customs types`);

for (const tc of cases) {
  const result = recommendByRules(tc.input);
  const ok = result.recommended === tc.expected;
  if (ok) {
    passed += 1;
    console.log(`PASS ${tc.id}: ${result.recommended} (${result.confidence})`);
  } else {
    failed += 1;
    console.error(`FAIL ${tc.id}: got ${result.recommended}, expected ${tc.expected}`);
  }
  if (!getTypeByCode(tc.expected)) {
    failed += 1;
    console.error(`FAIL ${tc.id}: code ${tc.expected} missing in catalog`);
  }
}

console.log(`\n${passed}/${cases.length} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
