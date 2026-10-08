#!/usr/bin/env node
// Build mapping 6 số WCO ↔ 8 số VN ↔ 8 số AHTN
// Căn cứ: TT 85/2026/TT-BTC Điều 6.1(a)+(c)
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Parser CSV đơn giản hỗ trợ quote
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i+1];
    if (inQuote) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') inQuote = false;
      else field += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (field !== '' || row.length) { row.push(field); rows.push(row); row = []; field = ''; }
        if (c === '\r' && next === '\n') i++;
      } else field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const wcoCsv = readFileSync(join(root, 'data/wco-hs-international.csv'), 'utf8');
const wcoRows = parseCsv(wcoCsv);
const wcoHeader = wcoRows[0];
const wco6 = new Map();
for (let i = 1; i < wcoRows.length; i++) {
  const row = {};
  wcoHeader.forEach((h, idx) => row[h] = (wcoRows[i][idx] || '').trim());
  if (row.level === '6') {
    wco6.set(row.hscode, { section: row.section, description: row.description });
  }
}

// 2. Đọc 8 số VN từ tax.json
const taxRaw = JSON.parse(readFileSync(join(root, 'data/tax.json'), 'utf8'));
const hs8 = taxRaw.ma || taxRaw;

const f = (info, key) => (info && info[key] != null) ? String(info[key]) : '';

// 3. Build mapping
const mapping = {
  meta: {
    generatedAt: new Date().toISOString(),
    sources: {
      wco: 'data/wco-hs-international.csv (WCO HS Nomenclature 2022)',
      vn: 'data/tax.json (Biểu thuế VN = AHTN 8 số chuẩn)'
    },
    legal_basis: 'TT 85/2026/TT-BTC Điều 6.1(a) Chú giải chi tiết HS WCO + Điều 6.1(c) Chú giải bổ sung AHTN',
    note: 'VN 8 số = AHTN 8 số (VN áp dụng AHTN 2022 chuẩn). 6 số đầu = WCO HS Nomenclature 2022 chuẩn.'
  },
  stats: {},
  hs6: {}
};

const vnHs6 = new Set();
for (const [hs, info] of Object.entries(hs8)) {
  if (!/^\d{8}$/.test(hs)) continue;
  const hs6 = hs.slice(0, 6);
  vnHs6.add(hs6);
  if (!mapping.hs6[hs6]) {
    mapping.hs6[hs6] = {
      wco: wco6.has(hs6) ? wco6.get(hs6) : null,
      vn8: [],
      vn8_count: 0
    };
  }
  mapping.hs6[hs6].vn8.push({
    code: hs,
    vn: f(info, 'vn'),
    en: f(info, 'en'),
    tt: f(info, 'tt'),
    mfn: f(info, 'mfn'),
    vat: f(info, 'vat'),
    acfta: f(info, 'acfta'),
    cs: f(info, 'cs')
  });
  mapping.hs6[hs6].vn8_count++;
}

const wcoExtra = [...wco6.keys()].filter(h => !vnHs6.has(h));
const vnExtra = [...vnHs6].filter(h => !wco6.has(h));

mapping.stats = {
  wco6_total: wco6.size,
  vn8_total: Object.keys(hs8).length,
  hs6_unique_from_vn: vnHs6.size,
  hs6_match_wco: [...vnHs6].filter(h => wco6.has(h)).length,
  hs6_vn_extra: vnExtra.length,
  hs6_wco_extra: wcoExtra.length
};

// Sắp xếp theo mã HS
const sortedHs6 = Object.keys(mapping.hs6).sort();
const sortedMapping = { ...mapping, hs6: {} };
for (const hs6 of sortedHs6) sortedMapping.hs6[hs6] = mapping.hs6[hs6];

const out = join(root, 'data/hs-mapping-6digit.json');
writeFileSync(out, JSON.stringify(sortedMapping, null, 2));

console.log(`Mapping ${sortedHs6.length} mã 6 số:`);
console.log(`  WCO 6 số: ${mapping.stats.wco6_total}`);
console.log(`  VN 8 số: ${mapping.stats.vn8_total}`);
console.log(`  Match: ${mapping.stats.hs6_match_wco}`);
console.log(`  VN extra (có ở VN, không có ở WCO): ${mapping.stats.hs6_vn_extra}`);
console.log(`  WCO extra: ${mapping.stats.hs6_wco_extra}`);
console.log(`  Output: ${out}`);
if (wcoExtra.length) console.log(`  WCO extra samples: ${wcoExtra.slice(0,5).join(', ')}`);
if (vnExtra.length) console.log(`  VN extra samples: ${vnExtra.slice(0,5).join(', ')}`);
