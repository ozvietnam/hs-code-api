#!/usr/bin/env node
/**
 * add-missing-docs.mjs
 * Add 2822/QD-BCT and 1959/QD-BCT (base codes) using year-variant data.
 * Year-variant entries (2822/QD-BCT-2024, 1959/QD-BCT-2025) citeable=0 → safe to consolidate.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const legalDocsPath = resolve('data/legal-docs.json');
const ld = JSON.parse(readFileSync(legalDocsPath, 'utf8'));
const docs = ld.documents || ld;

// Add base entries from year-variant data
const adds = {
  '2822/QD-BCT': { ...docs['2822/QD-BCT-2024'] },
  '1959/QD-BCT': { ...docs['1959/QD-BCT-2025'] },
};

for (const [code, doc] of Object.entries(adds)) {
  docs[code] = doc;
  console.log(`Added: ${code}`);
}

// Remove year-variants
delete docs['2822/QD-BCT-2024'];
delete docs['1959/QD-BCT-2025'];
console.log('Removed year-variants');

if (ld.documents) ld.documents = docs;
if (ld.meta) {
  ld.meta.lastUpdated = new Date().toISOString().slice(0, 10);
  ld.meta.notes = (ld.meta.notes || '') + '; 2026-10-03: normalize 2822/1959 year-variant→base';
}

writeFileSync(legalDocsPath, JSON.stringify(ld, null, 2), 'utf8');
console.log(`Done. Total entries: ${Object.keys(docs).length}`);
