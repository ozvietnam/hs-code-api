#!/usr/bin/env node
/**
 * Integration smoke: classify B3.5 override path (no LLM).
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { resolveConflict } = require('../lib/conflict-resolver.js');
const { tbTchqGate } = require('../lib/classify.js');

const attributes = require('../data/attributes.json').attributes;
const tablesDb = require('../data/conflict-tables.json');
const conflictsDb = require('../data/conflicts.json');
const deps = { conflictsDb, tablesDb, registry: attributes };

let passed = 0;
let failed = 0;
function assert(n, c, d) { if (c) { console.log('PASS', n); passed++; } else { console.log('FAIL', n, d||''); failed++; } }

// Simulate classify B3.5 block
const attrs = {
  tenHang: 'sạc dự phòng 10000mAh',
  energyFunction: 'store',
  rechargeable: 'yes',
  endUse: 'electronics',
};
const results = [{ hs: '85065000', confidence: 85, reason: 'llm guess', gir: 'GIR 1' }];
const top = results[0];
const resolver = resolveConflict(top, results, attrs, deps);
if (resolver.status === 'RESOLVED' && resolver.overrodeLlm) {
  const overridden = {
    ...top,
    hs: resolver.decidedHs,
    gir: resolver.gir,
    reason: resolver.reasonVi,
    resolverOverride: { from: top.hs, ...(resolver.trace?.[0] || {}) },
  };
  const g = tbTchqGate(resolver.decidedHs);
  if (g.hasPrecedent) overridden.tbTchq = g.entries;
  results[0] = overridden;
}
assert('classify-style override hs', results[0].hs === '85076090');
assert('resolver status', resolver.status === 'RESOLVED');
assert('resolver decidedHs', resolver.decidedHs === '85076090');

// INSUFFICIENT → missing questions
const attrs2 = { energyFunction: 'store', rechargeable: 'yes' };
const r2 = resolveConflict({ hs: '85076090' }, [{ hs: '85076090' }], attrs2, deps);
const missing = r2.status === 'INSUFFICIENT' ? r2.ask.map((a) => a.questionVi) : [];
assert('insufficient missing question', missing.some((q) => /thiết bị điện tử|xe điện/i.test(q)));

console.log(`\n${passed}/${passed + failed} integration passed`);
process.exit(failed ? 1 : 0);
