#!/usr/bin/env node
/**
 * Tariff versioning — snapshot data/tax.json into data/versions/ + manifest.
 *
 * Usage: node scripts/tariff-snapshot.mjs [--label=v2026-w27]
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
  let label = '';
  for (const a of args) {
    if (a.startsWith('--label=')) label = a.slice(8).replace(/[^a-zA-Z0-9._-]/g, '_');
  }
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const name = label ? `tax-${label}.json` : `tax-${ts}.json`;
  return { name };
}

function main() {
  const { name } = parseArgs();
  if (!fs.existsSync(TAX)) {
    console.error('Missing data/tax.json');
    process.exit(1);
  }
  fs.mkdirSync(VER, { recursive: true });

  const dest = path.join(VER, name);
  fs.copyFileSync(TAX, dest);

  const manifestPath = path.join(VER, 'manifest.json');
  let manifest = { snapshots: [] };
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {}
  }
  manifest.snapshots.push({
    file: path.basename(dest),
    createdAt: new Date().toISOString(),
    bytes: fs.statSync(dest).size,
  });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log('Snapshot written:', dest);
}

main();
