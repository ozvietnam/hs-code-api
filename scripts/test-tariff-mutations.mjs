#!/usr/bin/env node
/**
 * Smoke tests for tariff snapshot / rollback helpers (local filesystem).
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const {
  snapshotCurrentTax,
  rollbackToSnapshot,
  activateVersion,
} = require('../lib/tariff-mutations.js');

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

function main() {
  const taxPath = path.join(ROOT, 'data', 'tax.json');
  if (!fs.existsSync(taxPath)) {
    console.error('Missing data/tax.json — skip');
    process.exit(1);
  }

  const snap = snapshotCurrentTax({
    label: 'api-test',
    id: 'v-api-test',
    setCurrent: false,
    source: 'test-tariff-mutations.mjs',
  });
  assert('snapshot creates file', fs.existsSync(snap.snapshotPath));
  assert('snapshot has rows', snap.entry.rowCount > 1000);

  const activated = activateVersion('v-api-test');
  assert('activate sets current', activated.current === 'v-api-test');

  const rolled = rollbackToSnapshot(snap.entry.file, { backup: false });
  assert('rollback ok', rolled.ok === true);
  assert('rollback row count', rolled.rowCount > 1000);

  console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main();
