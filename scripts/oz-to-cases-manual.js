#!/usr/bin/env node
/**
 * Enrich decision-cases from oz-gold-final.jsonl for SPECIFIC headings.
 * Only adds cases where resolveHeading correctly resolves to the oz hsCode.
 */
const fs = require('fs');
const path = require('path');
const DT = require(path.join(__dirname, '..', 'lib', 'decision-tables.js'));

const ROOT = path.join(__dirname, '..');
const OZ_PATH = path.join(ROOT, 'data', 'oz-gold-final.jsonl');
const CASES_PATH = path.join(ROOT, 'tests', 'decision-cases.json');

const headings = process.argv.slice(2);
if (headings.length === 0) {
  console.log('Usage: node oz-to-cases-manual.js <heading> [heading...]');
  process.exit(1);
}

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const casesData = JSON.parse(fs.readFileSync(CASES_PATH, 'utf8'));
const existingIds = new Set(casesData.cases.map(c => c.id));

// Load oz entries by heading
const byGroup = {};
for (const line of fs.readFileSync(OZ_PATH, 'utf8').trim().split('\n')) {
  try {
    const r = JSON.parse(line);
    const g = r.hsCode.slice(0, 4);
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(r);
  } catch (e) { /* skip */ }
}

let added = 0, wrong = 0, unresolved = 0, dup = 0;

for (const heading of headings) {
  const items = byGroup[heading] || [];
  console.log(`\n[${heading}] ${items.length} oz entries`);
  
  // Deduplicate by tenHang + hsCode
  const seen = new Set();
  const unique = items.filter(r => {
    const key = `${r.tenHang}::${r.hsCode}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`  unique: ${unique.length}`);
  
  for (const record of unique) {
    // Combine tenHang + chatLieu + congDung for richer text
    const parts = [record.tenHang, record.chatLieu, record.congDung].filter(Boolean);
    const text = parts.join(' ');
    if (!text || text.length < 3) continue;
    
    const idBase = `${heading}-oz-${slugify(text.slice(0, 40))}`;
    if (existingIds.has(idBase)) { dup++; continue; }
    
    const result = DT.resolveHeading(heading, { text });
    
    if (result.status === 'RESOLVED' && result.hs === record.hsCode) {
      const newCase = { id: idBase, heading, text, expectHs: result.hs };
      if (result.factsUsed && Object.keys(result.factsUsed).length > 0) {
        newCase.facts = result.factsUsed;
      }
      casesData.cases.push(newCase);
      existingIds.add(idBase);
      added++;
      console.log(`  ✓ ADDED: ${text.slice(0, 50)} → ${result.hs}`);
    } else if (result.status === 'RESOLVED') {
      wrong++;
      console.log(`  ✗ WRONG: ${text.slice(0, 50)} → got ${result.hs}, expected ${record.hsCode}`);
    } else {
      unresolved++;
      console.log(`  ? UNRESOLVED: ${text.slice(0, 50)} [${result.status}]`);
    }
  }
}

console.log(`\nResult: ${added} added, ${wrong} wrong, ${unresolved} unresolved, ${dup} duplicates`);
fs.writeFileSync(CASES_PATH, JSON.stringify(casesData, null, 2));
console.log('Saved to', CASES_PATH);
