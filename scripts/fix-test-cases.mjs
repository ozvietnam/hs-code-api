import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const cases = JSON.parse(readFileSync(join(ROOT, 'tests/decision-cases.json'), 'utf8'));

// Fix 8504 test cases: need ALL attributes in the 'when' clause to resolve
const fixes8504 = {
  '8504-ballast': { productType: 'ballast', senMarked: 'nonSen', powerkVA: 'unspecified', voltageClass: 'unspecified', specialType: 'none' },
  '8504-ups-sen': { productType: 'staticConverter', senMarked: 'sen', powerkVA: 'unspecified', voltageClass: 'unspecified', specialType: 'ups' },
  '8504-inverter': { productType: 'staticConverter', senMarked: 'nonSen', powerkVA: 'unspecified', voltageClass: 'unspecified', specialType: 'inverter' },
  '8504-transformer-110kv': { productType: 'transformer_gt1kVA', senMarked: 'nonSen', powerkVA: 'gt1le10', voltageClass: 'ge110', specialType: 'none' },
  '8504-inductor-chip': { productType: 'inductor', senMarked: 'nonSen', powerkVA: 'unspecified', voltageClass: 'unspecified', specialType: 'chipInductor' },
  '8504-transformer-dry-explosion': { productType: 'transformer_gt630kVA', senMarked: 'nonSen', powerkVA: 'gt2500le10000', voltageClass: 'unspecified', specialType: 'dryExplosionProof' },
};

let updated = 0;
cases.cases = cases.cases.map(c => {
  if (fixes8504[c.id]) {
    updated++;
    return { ...c, facts: { ...c.facts, ...fixes8504[c.id] } };
  }
  return c;
});
writeFileSync(join(ROOT, 'tests/decision-cases.json'), JSON.stringify(cases, null, 2));
console.log(`Updated ${updated} test cases`);

// Update dictionary-progress.json: add 8419, 8536, 9405 as claimed (they now have tables)
const prog = JSON.parse(readFileSync(join(ROOT, 'data/dictionary-progress.json'), 'utf8'));
['8419', '8536', '9405'].forEach(h => {
  if (!prog.headings[h]) {
    prog.headings[h] = { status: 'claimed', doneAt: null, by: 'hermes-211', commit: 'pending', note: 'bảng quyết định mới tạo 02/10/2026, đang draft' };
  } else if (!prog.headings[h].status || prog.headings[h].status === 'open') {
    prog.headings[h].status = 'claimed';
    prog.headings[h].by = 'hermes-211';
    prog.headings[h].note = 'bảng quyết định mới tạo 02/10/2026, đang draft';
  }
});
writeFileSync(join(ROOT, 'data/dictionary-progress.json'), JSON.stringify(prog, null, 2));
console.log('Updated dictionary-progress.json for 8419, 8536, 9405');
