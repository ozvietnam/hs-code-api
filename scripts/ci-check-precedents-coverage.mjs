#!/usr/bin/env node
// scripts/ci-check-precedents-coverage.mjs
// CI check: đảm bảo precedents.json không bị mất records khi merge PR.
// Dựa trên bug tìm thấy ở PR #293 (mất 20 hsCode, 53 records) - 2026-10-15.
//
// Usage:
//   node scripts/ci-check-precedents-coverage.mjs [--baseline <path>]
//
// Options:
//   --baseline <path>  File JSON chứa (ref, hsCode) keys baseline (mặc định: .backups/precedents-baseline.json)

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { baseline: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--baseline') {
      opts.baseline = args[++i];
    }
  }
  return opts;
}

function loadJson(path) {
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function extractKeys(precedents) {
  const keys = new Set();
  for (const [hs, recs] of Object.entries(precedents)) {
    if (!Array.isArray(recs)) continue;
    for (const r of recs) {
      const ref = (r.tbTchqNumber || '').split('/')[0];
      if (ref && hs) {
        keys.add(`${ref}::${hs}`);
      }
    }
  }
  return keys;
}

function main() {
  const opts = parseArgs();
  const current = loadJson(resolve(ROOT, 'data/precedents.json'));
  if (!current) {
    console.error('❌ Cannot load data/precedents.json');
    process.exit(1);
  }

  const currentKeys = extractKeys(current);
  const currentHsCodes = new Set(Object.keys(current).filter(k => Array.isArray(current[k])));
  const currentTotal = Array.from(currentHsCodes).reduce((sum, k) => sum + current[k].length, 0);

  console.log(`📊 Current state:`);
  console.log(`  - hsCode keys: ${currentHsCodes.size}`);
  console.log(`  - Total records: ${currentTotal}`);

  // Check baseline
  let baselinePath = opts.baseline;
  if (!baselinePath) {
    // Find most recent backup
    const backupDir = resolve(ROOT, '.backups');
    if (existsSync(backupDir)) {
      const fs = require('node:fs');
      const backups = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('precedents') && f.endsWith('.json'))
        .sort()
        .reverse();
      if (backups.length > 0) {
        baselinePath = resolve(backupDir, backups[0]);
      }
    }
  }

  if (!baselinePath || !existsSync(baselinePath)) {
    console.log('\n⚠️  No baseline found. Skipping comparison.');
    console.log('   To enable: backup precedents.json to .backups/precedents-baseline.json');
    process.exit(0);
  }

  const baseline = loadJson(baselinePath);
  const baselineKeys = extractKeys(baseline);
  const baselineHsCodes = new Set(Object.keys(baseline).filter(k => Array.isArray(baseline[k])));
  const baselineTotal = Array.from(baselineHsCodes).reduce((sum, k) => sum + baseline[k].length, 0);

  console.log(`\n📦 Baseline: ${baselinePath.split('/').pop()}`);
  console.log(`  - hsCode keys: ${baselineHsCodes.size}`);
  console.log(`  - Total records: ${baselineTotal}`);

  // Compute diff
  const lostKeys = [...baselineKeys].filter(k => !currentKeys.has(k));
  const lostHsCodes = [...baselineHsCodes].filter(k => !currentHsCodes.has(k));

  console.log(`\n🔍 Comparison:`);
  console.log(`  - Lost (ref, hsCode) keys: ${lostKeys.length}`);
  console.log(`  - Lost hsCode codes: ${lostHsCodes.length}`);

  if (lostHsCodes.length > 0) {
    console.log(`\n❌ FAILED: ${lostHsCodes.length} hsCode lost:`);
    for (const hs of lostHsCodes.slice(0, 10)) {
      const count = baseline[hs]?.length || 0;
      console.log(`  - ${hs} (${count} records)`);
    }
    if (lostHsCodes.length > 10) {
      console.log(`  ... and ${lostHsCodes.length - 10} more`);
    }
    process.exit(1);
  }

  if (lostKeys.length > 0) {
    console.log(`\n⚠️  ${lostKeys.length} specific (ref, hsCode) lost (but hsCodes preserved):`);
    for (const k of lostKeys.slice(0, 5)) {
      console.log(`  - ${k}`);
    }
    if (lostKeys.length > 5) {
      console.log(`  ... and ${lostKeys.length - 5} more`);
    }
  }

  console.log(`\n✅ PASSED: All baseline hsCodes preserved.`);
  process.exit(0);
}

main();
