#!/usr/bin/env node
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { taxData } = require('../lib/data.js');
const { buildSpecificityRecord } = require('../lib/gir-specificity.js');

const outPath = path.join(__dirname, '..', 'data', 'specificity.json');
const existing = fs.existsSync(outPath)
  ? JSON.parse(fs.readFileSync(outPath, 'utf8'))
  : {};

const out = { ...existing };
let added = 0;
for (const [hs, rec] of Object.entries(taxData)) {
  if (out[hs]) continue;
  out[hs] = buildSpecificityRecord(hs, rec);
  added += 1;
}

fs.writeFileSync(outPath, JSON.stringify(out));
console.log(`specificity.json: ${Object.keys(out).length} entries (+${added} new)`);
