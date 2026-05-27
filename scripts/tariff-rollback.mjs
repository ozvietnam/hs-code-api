#!/usr/bin/env node
/**
 * Replace data/tax.json with a snapshot from data/versions/
 *
 * Usage: node scripts/tariff-rollback.mjs --to=tax-v2026.json [--backup]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TAX = path.join(ROOT, 'data', 'tax.json');
const VER = path.join(ROOT, 'data', 'versions');

function parseArgs() {
  const args = process.argv.slice(2);
  let toFile = '';
  let backup = false;
  for (const a of args) {
    if (a.startsWith('--to=')) toFile = a.slice(5);
    if (a === '--backup') backup = true;
  }
  return { toFile, backup };
}

const { toFile, backup } = parseArgs();
if (!toFile) {
  console.error('Usage: node scripts/tariff-rollback.mjs --to=tax-snapshot.json [--backup]');
  process.exit(1);
}

const snap = path.join(VER, path.basename(toFile));
if (!fs.existsSync(snap)) {
  console.error('Snapshot not found:', snap);
  process.exit(1);
}

if (!fs.existsSync(TAX)) {
  console.error('Missing data/tax.json');
  process.exit(1);
}

if (backup) {
  const bak = `${TAX}.bak-${Date.now()}`;
  fs.copyFileSync(TAX, bak);
  console.log('Backup:', bak);
}

fs.copyFileSync(snap, TAX);
console.log('tax.json restored from', path.relative(ROOT, snap));
