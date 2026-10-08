#!/usr/bin/env node
// Test hs-mapping-6digit.json — kiểm tra cấu trúc + coverage
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const path = join(root, 'data/hs-mapping-6digit.json');
if (!existsSync(path)) {
  console.error('FAIL: hs-mapping-6digit.json chưa tồn tại. Chạy: npm run data:build-mapping');
  process.exit(1);
}

const m = JSON.parse(readFileSync(path, 'utf8'));

const t = (name, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);

t('cấu trúc có meta', m.meta && m.meta.sources && m.meta.legal_basis);
t('cấu trúc có stats', m.stats && typeof m.stats.wco6_total === 'number');
t('cấu trúc có hs6', typeof m.hs6 === 'object' && Object.keys(m.hs6).length > 0);
t('WCO 6 số total >= 1500', m.stats.wco6_total >= 1500, `actual=${m.stats.wco6_total}`);
t('VN 8 số total >= 11000', m.stats.vn8_total >= 11000, `actual=${m.stats.vn8_total}`);
t('Match rate >= 90%', m.stats.hs6_match_wco / m.stats.wco6_total >= 0.9, `actual=${(m.stats.hs6_match_wco / m.stats.wco6_total * 100).toFixed(1)}%`);

// Spot check: 900490 (kính thuốc)
const kinh = m.hs6['900490'];
t('900490 (kính thuốc) có WCO description', kinh && kinh.wco && /spectacles/i.test(kinh.wco.description));
t('900490 có VN 8 số = 90049010', kinh && kinh.vn8.some(v => v.code === '90049010'));

// Spot check: ch.98 (VN riêng)
const ch98 = m.hs6['980415'];
t('980415 (ch.98 VN riêng) wco = null', ch98 && ch98.wco === null);

// Spot check: mỗi hs6 có vn8[]
let noVn8 = 0;
for (const k of Object.keys(m.hs6)) {
  if (!m.hs6[k].vn8 || m.hs6[k].vn8.length === 0) noVn8++;
}
t('mọi hs6 có vn8[]', noVn8 === 0, `noVn8=${noVn8}`);

// Spot check: legal_basis reference TT 85
t('meta có legal_basis = TT 85/2026/TT-BTC', m.meta.legal_basis.includes('TT 85/2026/TT-BTC'));

console.log('\n=== Tổng kết ===');
console.log(`WCO 6 số: ${m.stats.wco6_total}`);
console.log(`VN 8 số: ${m.stats.vn8_total}`);
console.log(`6 số unique từ VN: ${m.stats.hs6_unique_from_vn}`);
console.log(`Match WCO: ${m.stats.hs6_match_wco}`);
console.log(`VN extra (ch.98 etc): ${m.stats.hs6_vn_extra}`);
console.log(`WCO extra: ${m.stats.hs6_wco_extra}`);
