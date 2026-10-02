#!/usr/bin/env node
/**
 * Sinh test cases cho decision-cases.json từ các lá trong bảng.
 * Mỗi lá được gán một test case với facts đầy đủ từ rule tương ứng.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const mod = require(join(ROOT, 'lib/decision-tables.js'));
mod._reset();

// Groups with missing leaf cases
const groups = ['8419', '8486', '8504', '8536', '9405'];

const cases = JSON.parse(readFileSync(join(ROOT, 'tests/decision-cases.json'), 'utf8'));

// Get existing cases by heading
const existing = {};
for (const c of cases.cases) {
  if (!existing[c.heading]) existing[c.heading] = new Set();
  if (c.expectHs) existing[c.heading].add(c.expectHs);
}

// Get leaf coverage from tax.json
const tax = require(join(ROOT, 'data/tax.json'));

// Get missing leaves per group
const newCases = [];
for (const g of groups) {
  const table = mod.loadTable(g);
  if (!table) { console.log(g + ': no table'); continue; }
  
  const cov = mod.tableCoverage(g, { tax });
  const missingLeaves = cov.missingHs || [];
  
  // Find rules for missing leaves
  for (const hs of missingLeaves) {
    const rule = table.rules.find(r => r.hs === hs);
    if (!rule) {
      console.log(g + ': no rule for ' + hs);
      continue;
    }
    
    const when = rule.when || {};
    const facts = { ...when };
    
    newCases.push({
      id: g + '-auto-' + hs,
      heading: g,
      text: 'tự động: ' + hs,
      expectHs: hs,
      facts,
      note: 'auto-generated leaf case'
    });
  }
  
  console.log(g + ': ' + missingLeaves.length + ' missing leaves');
}

console.log('Total new cases:', newCases.length);
cases.cases.push(...newCases);
writeFileSync(join(ROOT, 'tests/decision-cases.json'), JSON.stringify(cases, null, 2));
console.log('Written to tests/decision-cases.json');
