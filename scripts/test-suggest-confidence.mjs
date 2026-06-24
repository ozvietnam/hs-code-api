#!/usr/bin/env node
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { familiarityBoost, applyHistoricalSignals } = require('../lib/suggest-confidence.js');

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

// ── familiarityBoost ────────────────────────────────────────────────────────

assert('boost=0 when ozCount=0', familiarityBoost(0, 0) === 0);
assert('boost>0 when ozCount>0 and coverage>0', familiarityBoost(10, 80) > 0);
assert('boost capped at 8', familiarityBoost(99999, 100) <= 8);
assert('boost=0 when coverage=0 regardless of count', familiarityBoost(100, 0) === 0);

const low = familiarityBoost(1, 50);
const high = familiarityBoost(100, 90);
assert('higher ozCount+coverage → higher boost', high > low, `low=${low} high=${high}`);

// ── applyHistoricalSignals ───────────────────────────────────────────────────

const baseSuggestions = [
  { hsCode: '73239310', confidence: 80 },
  { hsCode: '84123100', confidence: 70 },
  { hsCode: '39269099', confidence: 60 },
];

// ozPrecedents: Oz already declared 73239310 5 times with 85% keyword coverage
// 39269099 has some declarations but policy conflict
const ozPrecedents = [
  { hsCode: '73239310', ozCount: 5, matchCoverage: 85 },
  { hsCode: '39269099', ozCount: 3, matchCoverage: 70 },
];

const evidenceByHs = new Map([
  ['73239310', { hasPolicyWarning: false }],
  ['84123100', { hasPolicyWarning: true }],
  ['39269099', { hasPolicyWarning: true }],
]);

const adjusted = applyHistoricalSignals({
  suggestions: baseSuggestions,
  ozPrecedents,
  evidenceByHs,
});

const boosted   = adjusted.suggestions.find((s) => s.hsCode === '73239310');
const noPrec    = adjusted.suggestions.find((s) => s.hsCode === '84123100');
const blocked   = adjusted.suggestions.find((s) => s.hsCode === '39269099');

assert(
  'oz precedent boosts confidence when no policy conflict',
  boosted.confidence > 80,
  `confidence=${boosted.confidence}`,
);

assert(
  'policy conflict blocks boost (policyConflictBlockedBoost=true)',
  blocked.confidenceBreakdown.policyConflictBlockedBoost === true,
  JSON.stringify(blocked.confidenceBreakdown),
);

assert(
  'policy conflict keeps confidence at base',
  blocked.confidence === 60,
  `confidence=${blocked.confidence}`,
);

assert(
  'no precedent → no boost, base confidence kept',
  noPrec.confidence === 70,
  `confidence=${noPrec.confidence}`,
);

assert(
  'confidenceBreakdown.ozPrecedentBoost is number',
  typeof boosted.confidenceBreakdown.ozPrecedentBoost === 'number',
  JSON.stringify(boosted.confidenceBreakdown),
);

assert(
  'confidenceBreakdown.baseConfidence preserved',
  boosted.confidenceBreakdown.baseConfidence === 80,
  JSON.stringify(boosted.confidenceBreakdown),
);

assert(
  'confidenceBreakdown.ozDeclarationCount reflects ozCount',
  boosted.confidenceBreakdown.ozDeclarationCount === 5,
  JSON.stringify(boosted.confidenceBreakdown),
);

// Warnings should reference "tiền lệ khai của Oz" (honest disclaimer), NOT "APPROVED/REJECTED"
assert(
  'warning uses honest Oz-precedent disclaimer',
  adjusted.warnings.some((w) => /tiền lệ khai của Oz/i.test(w.message)),
  JSON.stringify(adjusted.warnings),
);

assert(
  'policy-conflict warning emitted for blocked code',
  adjusted.warnings.some((w) => w.hsCode === '39269099' && /policy/i.test(w.message)),
  JSON.stringify(adjusted.warnings),
);

// No getRecencyWeight → not a function; verify it is NOT exported
assert(
  'getRecencyWeight is not exported (removed)',
  require('../lib/suggest-confidence.js').getRecencyWeight === undefined,
);

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
