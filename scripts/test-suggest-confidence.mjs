#!/usr/bin/env node
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { getRecencyWeight, applyHistoricalSignals } = require('../lib/suggest-confidence.js');

let passed = 0;
let failed = 0;

function assert(name, cond, detail = '') {
  if (cond) {
    console.log('PASS', name);
    passed += 1;
  } else {
    console.log('FAIL', name, detail);
    failed += 1;
  }
}

const now = new Date();
const recentDate = new Date(now.getTime() - 15 * 24 * 3600 * 1000).toISOString();
const oldDate = new Date(now.getTime() - 900 * 24 * 3600 * 1000).toISOString();

const recent = getRecencyWeight(recentDate);
const old = getRecencyWeight(oldDate);
assert('recency decay gives higher score to recent precedent', recent > old, `${recent} <= ${old}`);

const baseSuggestions = [
  { hsCode: '73239310', confidence: 80 },
  { hsCode: '84123100', confidence: 70 },
];
const ozPrecedents = [
  { declId: 'OZ-1', hsCode: '73239310', outcome: 'APPROVED', similarity: 0.9, date: recentDate },
  { declId: 'OZ-2', hsCode: '84123100', outcome: 'APPROVED', similarity: 0.9, date: recentDate },
  { declId: 'OZ-3', hsCode: '73239310', outcome: 'REJECTED', similarity: 0.6, date: recentDate },
];
const evidenceByHs = new Map([
  ['73239310', { hasPolicyWarning: false }],
  ['84123100', { hasPolicyWarning: true }],
]);

const adjusted = applyHistoricalSignals({
  suggestions: baseSuggestions,
  ozPrecedents,
  evidenceByHs,
});

const boosted = adjusted.suggestions.find((s) => s.hsCode === '73239310');
const blocked = adjusted.suggestions.find((s) => s.hsCode === '84123100');

assert(
  'approved precedent boosts confidence when no policy conflict',
  boosted.confidence > 80,
  `confidence=${boosted.confidence}`
);
assert(
  'policy conflict blocks historical boost',
  blocked.confidence === 70 && blocked.confidenceBreakdown.policyConflictBlockedBoost === true,
  JSON.stringify(blocked.confidenceBreakdown)
);
assert(
  'confidence breakdown exists',
  typeof boosted.confidenceBreakdown.ozPrecedentBoost === 'number',
  JSON.stringify(boosted.confidenceBreakdown)
);
assert(
  'historical-only warning exists',
  adjusted.warnings.some((w) => /Historical precedent only/i.test(w.message)),
  JSON.stringify(adjusted.warnings)
);
assert(
  'rejected precedent warning exists',
  adjusted.warnings.some((w) => /bác mã này/i.test(w.message)),
  JSON.stringify(adjusted.warnings)
);

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
