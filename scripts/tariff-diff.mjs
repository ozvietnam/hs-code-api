#!/usr/bin/env node
/**
 * Compare two tariff snapshots under data/versions/
 *
 * Usage: node scripts/tariff-diff.mjs --from=tax-a.json --to=tax-b.json [--limit=100]
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { diffSnapshotFiles } = require('../lib/tariff-versions.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = process.argv.slice(2);
  let fromFile = '';
  let toFile = '';
  let limit = 100;
  for (const a of args) {
    if (a.startsWith('--from=')) fromFile = a.slice(7);
    else if (a.startsWith('--to=')) toFile = a.slice(5);
    else if (a.startsWith('--limit=')) limit = parseInt(a.slice(8), 10) || 100;
  }
  return { fromFile, toFile, limit };
}

const { fromFile, toFile, limit } = parseArgs();
if (!fromFile || !toFile) {
  console.error('Usage: node scripts/tariff-diff.mjs --from=tax-a.json --to=tax-b.json');
  process.exit(1);
}

const diff = diffSnapshotFiles(fromFile, toFile, { detailLimit: limit });
console.log(JSON.stringify({ summary: diff.summary, details: diff.details }, null, 2));
