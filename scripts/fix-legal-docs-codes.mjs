#!/usr/bin/env node
/**
 * fix-legal-docs-codes.mjs — Consolidate duplicate legal-doc entries
 *
 * Removes entries with weird keys (spaces, NGÀY, I_, year suffix) by
 * merging into their canonical counterparts, then deletes the duplicates.
 *
 * Issues fixed:
 *  1. Weird key codes → normalized to canonical
 *  2. Duplicate year-suffix variants where both exist (keep one)
 *
 * Run: node scripts/fix-legal-docs-codes.mjs [--dry-run]
 */
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DRY = process.argv.includes('--dry-run');

const ld = JSON.parse(fs.readFileSync(join(ROOT, 'data', 'legal-docs.json'), 'utf8'));

// ── Mappings: weird key → canonical key ─────────────────────────────────────
const REMOVE_THESE = {
  '2711/QD-BKHCN 2022': '2711/QD-BKHCN',
  '765/QD-BCT NGÀY 29/03/2019': '765/QD-BCT',
  '765/QD-BCT 29/03/2019': '765/QD-BCT',
  '3765/QD-BCT 2025': '3765/QD-BCT',
  '1725/QD-BCT 2024': '1725/QD-BCT',
  '6266/QD-BCA 2023': '6266/QD-BCA',
  '9981/QD-BCA 2019': '9981/QD-BCA',
  '01/I_2024/TT-BNNPTNT': '01/2024/TT-BNNPTNT',
};

const keys = Object.keys(ld);
let removed = 0, skipped = 0;

console.log('== fix-legal-docs-codes.mjs ==');
console.log('DRY RUN:', DRY, '\n');

Object.entries(REMOVE_THESE).forEach(([weird, canonical]) => {
  if (!keys.includes(weird)) {
    console.log(`SKIP ${weird}: not found`);
    skipped++;
    return;
  }
  if (!keys.includes(canonical)) {
    console.log(`SKIP ${weird} → ${canonical}: canonical not found`);
    skipped++;
    return;
  }
  const weirdDoc = ld[weird];
  const canonicalDoc = ld[canonical];
  // Verify they are actually the same document
  if (weirdDoc.titleVi !== canonicalDoc.titleVi ||
      weirdDoc.issuer !== canonicalDoc.issuer ||
      weirdDoc.effectiveDate !== canonicalDoc.effectiveDate) {
    console.log(`SKIP ${weird} → ${canonical}: NOT same doc`);
    console.log(`  weird:  ${weirdDoc.titleVi?.slice(0,40)} | ${weirdDoc.effectiveDate}`);
    console.log(`  canon:  ${canonicalDoc.titleVi?.slice(0,40)} | ${canonicalDoc.effectiveDate}`);
    skipped++;
    return;
  }
  console.log(`REMOVE ${weird} → keep ${canonical}`);
  if (!DRY) delete ld[weird];
  removed++;
});

console.log(`\nResult: removed=${removed} skipped=${skipped}`);

if (!DRY) {
  fs.writeFileSync(join(ROOT, 'data', 'legal-docs.json'), JSON.stringify(ld, null, 2) + '\n');
  console.log('Written to data/legal-docs.json');
} else {
  console.log('(dry run — no changes written)');
}
