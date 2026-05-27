#!/usr/bin/env node
/**
 * Tariff versioning — snapshot data/tax.json into data/versions/ + index.json
 *
 * Usage:
 *   node scripts/tariff-snapshot.mjs --label=v2026-w27
 *   node scripts/tariff-snapshot.mjs --label=v2026-w27 --id=v2-2026-04-01 --set-current
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const {
  INDEX_PATH,
  VERSIONS_DIR,
  loadIndex,
  loadTaxJsonFile,
  sha256OfFile,
} = require('../lib/tariff-versions.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TAX = path.join(ROOT, 'data', 'tax.json');

function parseArgs() {
  const args = process.argv.slice(2);
  let label = '';
  let id = '';
  let setCurrent = false;
  let source = 'Manual snapshot via tariff-snapshot.mjs';
  for (const a of args) {
    if (a.startsWith('--label=')) label = a.slice(8).replace(/[^a-zA-Z0-9._-]/g, '_');
    else if (a.startsWith('--id=')) id = a.slice(5).replace(/[^a-zA-Z0-9._-]/g, '_');
    else if (a.startsWith('--source=')) source = a.slice(9);
    else if (a === '--set-current') setCurrent = true;
  }
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const name = label ? `tax-${label}.json` : `tax-${ts}.json`;
  const versionId = id || (label ? `v-${label}` : `v-${ts}`);
  return { name, versionId, setCurrent, source };
}

function main() {
  if (!fs.existsSync(TAX)) {
    console.error('Missing data/tax.json');
    process.exit(1);
  }
  fs.mkdirSync(VERSIONS_DIR, { recursive: true });

  const { name, versionId, setCurrent, source } = parseArgs();
  const dest = path.join(VERSIONS_DIR, name);
  fs.copyFileSync(TAX, dest);

  const taxMap = loadTaxJsonFile(dest);
  const rowCount = Object.keys(taxMap).length;
  const checksum = sha256OfFile(dest);
  const createdAt = new Date().toISOString();

  const index = loadIndex();
  const entry = {
    id: versionId,
    file: path.basename(dest),
    effectiveDate: createdAt.slice(0, 10),
    type: index.versions.length === 0 ? 'base' : 'snapshot',
    source,
    rowCount,
    checksum,
    bytes: fs.statSync(dest).size,
    createdAt,
  };

  const existingIdx = index.versions.findIndex((v) => v.id === versionId || v.file === entry.file);
  if (existingIdx >= 0) index.versions[existingIdx] = { ...index.versions[existingIdx], ...entry };
  else index.versions.push(entry);

  if (setCurrent || !index.current) index.current = versionId;

  fs.writeFileSync(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`, 'utf8');

  console.log('Snapshot written:', dest);
  console.log('Index updated:', path.relative(ROOT, INDEX_PATH), 'id=', versionId, 'rows=', rowCount);
}

main();
