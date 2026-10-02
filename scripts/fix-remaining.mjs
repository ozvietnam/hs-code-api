import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
const __dirname = join(fileURLToPath(import.meta.url), '..');

const cases = JSON.parse(readFileSync(join(__dirname, 'tests/decision-cases.json'), 'utf8'));

// Fix 3 remaining 8504 cases with exact facts matching rules
const fixes = {
  '8504-ups-sen': { productType: 'staticConverter', senMarked: 'sen', powerkVA: 'unspecified', voltageClass: 'unspecified', specialType: 'ups' },
  '8504-inductor-chip': { productType: 'inductor', senMarked: 'sen', powerkVA: 'unspecified', voltageClass: 'unspecified', specialType: 'chipInductor' },
  '8504-transformer-dry-explosion': { productType: 'transformer_gt630kVA', senMarked: 'nonSen', powerkVA: 'gt30', voltageClass: 'unspecified', specialType: 'dryExplosionProof' },
};

let updated = 0;
cases.cases = cases.cases.map(c => {
  if (fixes[c.id]) {
    updated++;
    return { ...c, facts: { ...c.facts, ...fixes[c.id] } };
  }
  return c;
});
writeFileSync(join(__dirname, 'tests/decision-cases.json'), JSON.stringify(cases, null, 2));
console.log(`Updated ${updated} test cases`);
