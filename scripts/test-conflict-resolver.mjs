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

// OZV-1317 — cánh quạt tháp giải nhiệt (TB 2943/TCHQ-TXNK)
{
  const r = run('84149029', { coolingTowerFanImport: 'partsOnly' }, {});
  assert('cánh quạt tháp riêng rẽ → 84149029', r.status === 'RESOLVED' && r.decidedHs === '84149029' && r.tableVerified === true);
}
{
  const r = run('84149029', { coolingTowerFanImport: 'completeTower' }, {});
  assert('cánh quạt tháp đồng bộ → 84195010', r.status === 'RESOLVED' && r.decidedHs === '84195010' && r.overrodeLlm === true);
}
{
  const r = run('84195010', { coolingTowerFanImport: 'partsOnly' }, {});
  assert('từ 84195010 + riêng rẽ → override 84149029', r.status === 'RESOLVED' && r.decidedHs === '84149029' && r.overrodeLlm === true);
}
{
  const r = run('84149029', {}, {});
  assert('cánh quạt tháp thiếu dữ kiện → hỏi coolingTowerFanImport', r.status === 'INSUFFICIENT' && (r.ask || []).some((a) => a.attribute === 'coolingTowerFanImport'));
}

// OZV-1382 — tủ đông cửa / hút bụi công suất+đồ chứa (GĐ #1438 lần 2: kèm dung tích + công dụng)
{
  const r = run('84183090', { freezerDoorType: 'frontDoor', freezerVolumeClass: 'mid800' }, {});
  assert('tủ đông cửa trước mid800 → 84184090', r.status === 'RESOLVED' && r.decidedHs === '84184090' && r.overrodeLlm === true);
}
{
  const r = run('84184090', { freezerDoorType: 'topDoor', freezerVolumeClass: 'mid800' }, {});
  assert('tủ đông cửa trên mid800 → 84183090', r.status === 'RESOLVED' && r.decidedHs === '84183090' && r.overrodeLlm === true);
}
{
  const r = run('84183090', { freezerDoorType: 'frontDoor', freezerVolumeClass: 'le200' }, {});
  assert('tủ đông cửa trước ≤200L → 84184010', r.status === 'RESOLVED' && r.decidedHs === '84184010');
}
{
  const r = run('84184090', { freezerDoorType: 'topDoor', freezerVolumeClass: 'le200' }, {});
  assert('tủ đông cửa trên ≤200L → 84183010', r.status === 'RESOLVED' && r.decidedHs === '84183010');
}
{
  const r = run('84183090', { freezerDoorType: 'frontDoor' }, {});
  assert('tủ đông thiếu dung tích → hỏi freezerVolumeClass', r.status === 'INSUFFICIENT' && (r.ask || []).some((a) => a.attribute === 'freezerVolumeClass'));
}
{
  const r = run('84183090', {}, {});
  assert('tủ đông thiếu kiểu cửa → hỏi freezerDoorType', r.status === 'INSUFFICIENT' && (r.ask || []).some((a) => a.attribute === 'freezerDoorType'));
}
{
  const r = run('85081990', { vacuumPowerClass: 'le1500', vacuumContainerClass: 'le20' }, {});
  assert('hút bụi ≤1500W ≤20L → 85081100', r.status === 'RESOLVED' && r.decidedHs === '85081100' && r.overrodeLlm === true);
}
{
  const r = run('85081100', { vacuumPowerClass: 'gt1500', vacuumUseType: 'industrial' }, {});
  assert('hút bụi >1500W công nghiệp → 85081990', r.status === 'RESOLVED' && r.decidedHs === '85081990' && r.overrodeLlm === true);
}
{
  const r = run('85081100', { vacuumPowerClass: 'gt1500', vacuumUseType: 'domestic' }, {});
  assert('hút bụi >1500W gia dụng → 85081910', r.status === 'RESOLVED' && r.decidedHs === '85081910');
}
{
  const r = run('85081100', { vacuumPowerClass: 'le1500', vacuumContainerClass: 'gt20', vacuumUseType: 'industrial' }, {});
  assert('hút bụi ≤1500W >20L công nghiệp → 85081990', r.status === 'RESOLVED' && r.decidedHs === '85081990' && r.overrodeLlm === true);
}
{
  const r = run('85081100', { vacuumPowerClass: 'gt1500' }, {});
  assert('hút bụi >1500W thiếu công dụng → hỏi vacuumUseType', r.status === 'INSUFFICIENT' && (r.ask || []).some((a) => a.attribute === 'vacuumUseType'));
}
{
  const top = { hs: '85081990', confidence: 70, reason: 'seed' };
  const { resolveConflict: rc, extractPowerWatts: epw, extractVolumeLiters: evl } = require('../lib/conflict-resolver.js');
  const r = rc(top, [top], {}, { ...deps, productText: 'máy hút bụi công nghiệp 1,5 kW dung tích thùng 15 lít' });
  assert('productText 1,5 kW 15 lít → 85081100', r.status === 'RESOLVED' && r.decidedHs === '85081100', JSON.stringify(r));
  assert(
    'extractPowerWatts ≥2 số khác nhau → null',
    epw('động cơ 1.200 W, công suất hút 250 W') === null,
  );
  assert(
    'extractVolumeLiters ≥2 dung tích khác nhau → null',
    evl('thùng 15 lít và bình 30 lít') === null,
  );
  assert(
    'extractVolumeLiters 1.200 lít → 1200',
    evl('tủ đông cửa trước dung tích 1.200 lít') === 1200,
  );
}

// OZV-1382 GĐ #1438 lần 3 — ≥2 miền detect → không gán; "tủ đông"≠"tự động"
{
  const {
    resolveConflict: rc, enrichAttrsFromTable: enrich, phraseHits: ph,
    foldProductText: fold, originalProductText: orig,
  } = require('../lib/conflict-resolver.js');
  const folded = fold('Máy giặt tự động cửa trước dung tích 65 lít');
  const original = orig('Máy giặt tự động cửa trước dung tích 65 lít');
  assert('phraseHits "tủ đông" không khớp "tự động"', ph(folded, 'tủ đông', original) === false);
  assert('phraseHits "freezer" ASCII vẫn khớp folded', ph(fold('chest freezer 300 l'), 'freezer', orig('chest freezer 300 l')) === true);
  const dual = enrich({}, tablesDb.tables['CF-vacuum-power-container'], 'máy hút bụi gia đình và nhà xưởng 2,2 kW 30 lít');
  assert('≥2 miền vacuumUseType → không gán', dual.vacuumUseType == null, JSON.stringify(dual));
  const dualDoor = enrich({}, tablesDb.tables['CF-freezer-door'], 'tủ đông cửa trên và cửa trước 300 lít');
  assert('≥2 miền freezerDoorType → không gán', dualDoor.freezerDoorType == null, JSON.stringify(dualDoor));
  const top = { hs: '84184090', confidence: 70, reason: 'seed' };
  const r1200 = rc(top, [top], {}, { ...deps, productText: 'tủ đông cửa trước dung tích 1.200 lít' });
  assert(
    '1.200 lít không chốt 84184010/90',
    r1200.status !== 'RESOLVED' || !['84184010', '84184090'].includes(r1200.decidedHs),
    JSON.stringify(r1200),
  );
}

// OZV-1382 GĐ #1438 mục 4 — hai lần resolveConflict (cùng kiểu productText như classify.js) không lẫn mô tả
{
  const { resolveConflict: rc } = require('../lib/conflict-resolver.js');
  const mkText = (attrs) => [
    attrs.tenHang, attrs.nameZh, attrs.chatLieu, attrs.congDung,
    typeof attrs.specs === 'string' ? attrs.specs : '',
  ].filter(Boolean).join(' ');
  const top = { hs: '85081990', confidence: 70, reason: 'seed' };
  const a1 = { tenHang: 'Máy hút bụi', specs: 'công suất 800 W đồ chứa 10 lít' };
  const a2 = { tenHang: 'Máy hút bụi công nghiệp', specs: '2,2 kW thùng 30 lít' };
  const r1 = rc(top, [top], {}, { ...deps, productText: mkText(a1) });
  const r2 = rc(top, [top], {}, { ...deps, productText: mkText(a2) });
  assert('classify-path lần 1 800W → 85081100', r1.status === 'RESOLVED' && r1.decidedHs === '85081100', JSON.stringify(r1));
  assert('classify-path lần 2 công nghiệp 2,2kW → 85081990 không lẫn lần 1', r2.status === 'RESOLVED' && r2.decidedHs === '85081990', JSON.stringify(r2));
  const rEmpty = rc(top, [top], {}, deps);
  assert(
    'classify-path thiếu productText không kế thừa lần trước',
    rEmpty.status === 'INSUFFICIENT' || rEmpty.status === 'NARROWED' || rEmpty.status === 'SKIP',
    JSON.stringify(rEmpty),
  );
}

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
