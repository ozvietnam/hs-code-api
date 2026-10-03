#!/usr/bin/env node
/**
 * consolidate-legal-docs-duplicates.mjs
 * Bước 73: Loại bỏ 8 duplicate legal-docs (base entries không suffix trùng với year-suffix entries).
 * Base entries: 691/QD-BCT, 693/QD-BCT, 715/QD-BCT, 1978/QD-BCT (không có doc nào cite chúng).
 * Year-suffix entries: 691/QD-BCT-2023, 693/QD-BCT-2023, 715/QD-BCT-2020, 1978/QD-BCT-2025 (giữ lại).
 * 
 * Usage: node scripts/consolidate-legal-docs-duplicates.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const legalDocsPath = resolve('data/legal-docs.json');
const legalDocs = JSON.parse(readFileSync(legalDocsPath, 'utf8'));
const docs = legalDocs.documents || legalDocs;

const baseEntriesToRemove = [
  '691/QD-BCT',     // trùng với 691/QD-BCT-2023 (cùng ngày hiệu lực 2023-03-22, cùng status EXPIRED)
  '693/QD-BCT',     // trùng với 693/QD-BCT-2023
  '715/QD-BCT',     // trùng với 715/QD-BCT-2020
  '1978/QD-BCT',    // trùng với 1978/QD-BCT-2025 (cùng ngày hiệu lực 2025-07-08, cùng status REPLACED)
];

// Verify none are cited via citedBy or relatedDocs (the only semantic references)
const citingCheck = baseEntriesToRemove.filter(code => {
  return Object.keys(docs).some(other => {
    if (other === code) return false;
    const doc = docs[other];
    if (doc.citedBy && doc.citedBy.includes(code)) return true;
    if (doc.relatedDocs && doc.relatedDocs.includes(code)) return true;
    return false;
  });
});

if (citingCheck.length > 0) {
  console.error('ERROR: These base entries ARE cited — NOT removing:', citingCheck);
  process.exit(1);
}

console.log('Removing base entries (0 citations):', baseEntriesToRemove);

for (const code of baseEntriesToRemove) {
  if (docs[code]) {
    console.log(`  Removed: ${code}`);
    delete docs[code];
  } else {
    console.log(`  Not found (already removed?): ${code}`);
  }
}

// Rebuild documents object
if (legalDocs.documents) {
  legalDocs.documents = docs;
}

// Update metadata
if (legalDocs.meta) {
  legalDocs.meta.lastUpdated = new Date().toISOString().slice(0, 10);
  legalDocs.meta.notes = (legalDocs.meta.notes || '') + '; 2026-10-03: consolidated 4 duplicate base entries (691,693,715,1978/QD-BCT)';
}

writeFileSync(legalDocsPath, JSON.stringify(legalDocs, null, 2), 'utf8');
console.log(`\nDone. Total entries: ${Object.keys(docs).length}`);

// Verify 3 dangling REPLACED entries still intact
const dangling = ['2333/QD-BCT-2025','2491/QD-BCT-2025','2093/QD-BCT-2025'];
console.log('\nDangling REPLACED (need target docs added by dev):');
for (const code of dangling) {
  const doc = docs[code];
  if (doc) {
    console.log(`  ${code}: replacedBy=${doc.replacedBy}, status=${doc.status}`);
  }
}
