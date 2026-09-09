#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * test-conflict-resolver.mjs — unit tests cho lib/conflict-resolver.js
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { resolveConflict } = require('../lib/conflict-resolver.js');

const attributes = require('../data/attributes.json').attributes;
const tablesDb = require('../data/conflict-tables.json');
const conflictsDb = require('../data/conflicts.json');

const deps = { conflictsDb, tablesDb, registry: attributes };

let passed = 0;
let failed = 0;

function assert(name, cond, detail) {
  if (cond) {
    console.log('PASS', name);
    passed += 1;
  } else {
    console.log('FAIL', name, detail || '');
    failed += 1;
  }
}

function run(topHs, attrs, expect) {
  const top = { hs: topHs, confidence: 70, reason: 'llm', gir: 'GIR 1' };
  const results = [top];
  return resolveConflict(top, results, attrs, deps);
}

// 1. Sạc dự phòng đủ dữ kiện
{
  const r = run('85076090', {
    energyFunction: 'store', rechargeable: 'yes', endUse: 'electronics',
  }, {});
  assert('powerbank resolved 85076090', r.status === 'RESOLVED' && r.decidedHs === '85076090');
  assert('powerbank gir', r.gir === 'GIR 3(b)');
  assert('bảng nội bộ đã verified → tableVerified true', r.tableVerified === true);
}

// 2. Bộ đổi điện
{
  const r = run('85076090', { energyFunction: 'convert' }, {});
  assert('converter 85044090', r.status === 'RESOLVED' && r.decidedHs === '85044090');
}

// 3. Pin dùng 1 lần
{
  const r = run('85076090', { energyFunction: 'store', rechargeable: 'no' }, {});
  assert('primary cell 85065000', r.status === 'RESOLVED' && r.decidedHs === '85065000');
}

// 4. Ắc quy xe điện
{
  const r = run('85076090', { energyFunction: 'store', rechargeable: 'yes', endUse: 'ev' }, {});
  assert('ev battery 85076033', r.status === 'RESOLVED' && r.decidedHs === '85076033');
}

// 5. Thiếu endUse
{
  const r = run('85076090', { energyFunction: 'store', rechargeable: 'yes' }, {});
  assert('insufficient missing endUse', r.status === 'INSUFFICIENT');
  assert('insufficient ask endUse', (r.ask || []).some((a) => a.attribute === 'endUse'));
  assert('insufficient no override', !r.decidedHs);
}

// 6. Mã không thuộc group
{
  const r = run('85171300', { energyFunction: 'store' }, {});
  assert('skip no group', r.status === 'SKIP');
}

// 7. Override đúng
{
  const top = { hs: '85065000', confidence: 80, reason: 'llm wrong', gir: 'GIR 1' };
  const r = resolveConflict(top, [top], {
    energyFunction: 'store', rechargeable: 'yes', endUse: 'electronics',
  }, deps);
  assert('override resolved', r.status === 'RESOLVED' && r.decidedHs === '85076090');
  assert('override flag', r.overrodeLlm === true);
}

// 8. alias VN
{
  const r = run('85076090', {
    chucNangNangLuong: 'store', sacLaiDuoc: 'yes', mucDichSuDung: 'electronics',
  }, {});
  assert('alias VN resolved', r.status === 'RESOLVED' && r.decidedHs === '85076090');
}

// Textile + dairy smoke
{
  const r = run('61091010', { fabricConstruction: 'knit' }, {});
  assert('textile knit', r.status === 'RESOLVED' && r.decidedHs === '61091010');
}

{
  const tables = Object.values(tablesDb.tables || {});
  assert('mọi bảng đều có cờ verified boolean', tables.length > 0 && tables.every((t) => typeof t.verified === 'boolean'));
}
{
  const r = run('19011020', { productBase: 'milk', infantFormula: 'yes' }, {});
  assert('dairy infant', r.status === 'RESOLVED' && r.decidedHs === '19011020');
}

{
  const r = run('84818083', { valveCircuit: 'pneumaticHydraulic' }, {});
  assert('van khí nén override khỏi 84818083', r.status === 'RESOLVED' && r.decidedHs === '84812090' && r.overrodeLlm === true);
  assert('van khí nén RULE_TABLE verified', r.tableVerified === true && r.gir === 'GIR 1');
}
{
  const r = run('84812090', { valveCircuit: 'stove' }, {});
  assert('van bếp 84818030', r.status === 'RESOLVED' && r.decidedHs === '84818030');
}
{
  const r = run('84812090', { machVan: 'vehicleFuel' }, {});
  assert('van nhiên liệu xe alias VN', r.status === 'RESOLVED' && r.decidedHs === '84818083');
}
{
  const r = run('84812090', {}, {});
  assert('van thiếu dữ kiện → hỏi valveCircuit', r.status === 'INSUFFICIENT' && (r.ask || []).some((a) => a.attribute === 'valveCircuit'));
}

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
