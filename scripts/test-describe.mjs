#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(rootDir, 'package.json'));
const { validateDeclaration, normalizeDeclaration } = require('./lib/declaration-validator');
const { composeCustomsDescription } = require('./lib/describe-compose');

const cases = JSON.parse(readFileSync(join(rootDir, 'tests', 'describe-cases.json'), 'utf8'));
const LEVEL_RANK = { REJECT: 0, WEAK: 1, ACCEPTABLE: 2, GOOD: 3, EXCELLENT: 4 };

let passed = 0;
let failed = 0;

for (const tc of cases) {
  const declaration = normalizeDeclaration({ declaration: tc.declaration }, tc.context || {});
  const compliance = validateDeclaration(declaration, tc.hsCode, tc.context || {});
  const composed = composeCustomsDescription(declaration);

  let ok = true;
  const reasons = [];

  if (tc.expectPass === true && !compliance.passesCustomsAudit) {
    ok = false;
    reasons.push('expected pass');
  }
  if (tc.expectPass === false && compliance.passesCustomsAudit) {
    ok = false;
    reasons.push('expected fail');
  }
  if (tc.minLevel && (LEVEL_RANK[compliance.level] ?? 0) < LEVEL_RANK[tc.minLevel]) {
    ok = false;
    reasons.push(`level ${compliance.level} < ${tc.minLevel}`);
  }
  if (tc.maxLevel && (LEVEL_RANK[compliance.level] ?? 0) > LEVEL_RANK[tc.maxLevel]) {
    ok = false;
    reasons.push(`level ${compliance.level} > ${tc.maxLevel}`);
  }
  for (const field of tc.expectMissing || []) {
    if (!compliance.missingRequired.includes(field)) {
      ok = false;
      reasons.push(`missing ${field} not flagged`);
    }
  }
  for (const code of tc.expectCodes || []) {
    if (!compliance.warnings.some((w) => w.code === code)) {
      ok = false;
      reasons.push(`expected code ${code}`);
    }
  }
  if (!composed && tc.expectPass) {
    ok = false;
    reasons.push('empty customsDescription');
  }

  if (ok) {
    passed += 1;
    console.log(`PASS ${tc.id}: ${compliance.level} (${compliance.score})`);
  } else {
    failed += 1;
    console.error(`FAIL ${tc.id}: ${compliance.level} — ${reasons.join(', ')}`);
  }
}

console.log(`\n${passed}/${cases.length} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
