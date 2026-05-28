#!/usr/bin/env node
/**
 * Tariff upload from Excel — parse xlsx → diff vs current → upload version.
 *
 * Usage:
 *   node scripts/tariff-upload-xlsx.mjs --file=data/new-tariff.xlsx --dry-run
 *   node scripts/tariff-upload-xlsx.mjs --file=data/new-tariff.xlsx --label=v2026-07
 *   node scripts/tariff-upload-xlsx.mjs --file=data/new-tariff.xlsx --label=v2026-07 --replace
 *
 * The xlsx must have columns matching tax.json keys (case-insensitive):
 *   hs / ma_hs    → HS code (8-digit)
 *   vn / ten_vn   → Vietnamese name
 *   dvt / don_vi  → Unit
 *   tt / thue_TT  → TT rate
 *   mfn / MFN     → MFN rate
 *   vat           → VAT rate
 *   acfta         → ACFTA rate
 *   bvmt          → Environmental tax
 *   cs / policy   → Policy string
 *   en / ten_en   → English name
 *
 * Output: diff summary + version entry in data/versions/
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const { uploadTariffMap, TAX_PATH } = require('../lib/tariff-mutations.js');
const { loadTaxJsonFile, diffSnapshotFiles } = require('../lib/tariff-versions.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const COLUMN_MAP = {
  hs: 'hs', ma_hs: 'hs', ma_hs_code: 'hs', hscode: 'hs', hs_code: 'hs',
  vn: 'vn', ten_vn: 'vn', ten: 'vn', name_vi: 'vn',
  dvt: 'dvt', don_vi: 'dvt', unit: 'dvt', dvt_vn: 'dvt',
  tt: 'tt', thue_tt: 'tt', thue_tieu_thu: 'tt',
  mfn: 'mfn', mfN: 'mfn', thue_mfn: 'mfn',
  vat: 'vat', thue_vat: 'vat',
  acfta: 'acfta', thue_acfta: 'acfta',
  bvmt: 'bvmt', thue_bvmt: 'bvmt', environmental: 'bvmt',
  cs: 'cs', policy: 'cs', chinh_sach: 'cs',
  giam_vat: 'giam_vat',
  en: 'en', ten_en: 'en', name_en: 'en',
};

function normalizeHs(raw) {
  return String(raw || '').replace(/[\s.]/g, '').trim().padEnd(8, '0').slice(0, 8);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { file: '', label: '', id: '', dryRun: false, replace: false, sheet: '' };
  for (const a of args) {
    if (a.startsWith('--file=')) opts.file = a.split('=')[1];
    else if (a.startsWith('--label=')) opts.label = a.split('=')[1];
    else if (a.startsWith('--id=')) opts.id = a.split('=')[1];
    else if (a.startsWith('--sheet=')) opts.sheet = a.split('=')[1];
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--replace') opts.replace = true;
  }
  return opts;
}

function mapColumnName(xlsxCol) {
  const key = String(xlsxCol).toLowerCase().trim().replace(/[\s_-]+/g, '_');
  return COLUMN_MAP[key] || null;
}

function parseSheet(workbook, sheetName) {
  const sheet = sheetName ? workbook.Sheets[sheetName] : workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error(`Sheet not found: ${sheetName || workbook.SheetNames[0]}`);
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows;
}

function rowsToTaxMap(rows) {
  const taxMap = {};
  let mapped = 0, skipped = 0;
  const unmappedCols = new Set();

  for (const row of rows) {
    const mappedRow = {};
    for (const [col, val] of Object.entries(row)) {
      const field = mapColumnName(col);
      if (field) {
        mappedRow[field] = String(val ?? '').trim();
      } else {
        unmappedCols.add(col);
      }
    }

    const hsCode = normalizeHs(mappedRow.hs);
    if (!hsCode || hsCode === '00000000') { skipped++; continue; }

    taxMap[hsCode] = {
      hs: hsCode,
      vn: mappedRow.vn || '',
      dvt: mappedRow.dvt || '',
      tt: mappedRow.tt || '',
      mfn: mappedRow.mfn ?? '',
      vat: mappedRow.vat ?? '',
      acfta: mappedRow.acfta ?? '',
      bvmt: mappedRow.bvmt ?? '',
      cs: mappedRow.cs || '',
      giam_vat: mappedRow.giam_vat ?? '',
      en: mappedRow.en || '',
    };
    mapped++;
  }

  return { taxMap, mapped, skipped, unmappedCols: [...unmappedCols] };
}

// --- Main ---
const opts = parseArgs();
if (!opts.file) {
  console.error('Usage: node scripts/tariff-upload-xlsx.mjs --file=path.xlsx [--dry-run] [--label=vX] [--replace]');
  process.exit(1);
}

const filePath = path.resolve(ROOT, opts.file);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

console.log(`Reading: ${filePath}`);

const workbook = XLSX.readFile(filePath);
console.log(`Sheets: ${workbook.SheetNames.join(', ')}`);

const rows = parseSheet(workbook, opts.sheet);
console.log(`Rows in sheet: ${rows.length}`);

const { taxMap, mapped, skipped, unmappedCols } = rowsToTaxMap(rows);
console.log(`Mapped: ${mapped} HS codes`);
console.log(`Skipped: ${skipped} rows (no valid HS)`);
if (unmappedCols.length) {
  console.log(`Unmapped columns: ${unmappedCols.slice(0, 10).join(', ')}${unmappedCols.length > 10 ? '...' : ''}`);
}

// Diff vs current
const currentTax = loadTaxJsonFile(TAX_PATH);
const currentKeys = new Set(Object.keys(currentTax));
const newKeys = new Set(Object.keys(taxMap));

const added = [...newKeys].filter((k) => !currentKeys.has(k));
const removed = [...currentKeys].filter((k) => !newKeys.has(k));
const changed = [];
const same = [];

for (const k of newKeys) {
  if (!currentKeys.has(k)) continue;
  const oldR = currentTax[k];
  const newR = taxMap[k];
  const fieldsChanged = [];
  for (const f of ['vn', 'tt', 'mfn', 'vat', 'acfta', 'cs']) {
    if (String(oldR[f] || '') !== String(newR[f] || '')) fieldsChanged.push(f);
  }
  if (fieldsChanged.length) {
    changed.push({ hs: k, fields: fieldsChanged });
  } else {
    same.push(k);
  }
}

console.log(`\n=== Diff vs current tax.json ===`);
console.log(`Current: ${currentKeys.size} HS codes`);
console.log(`New file: ${newKeys.size} HS codes`);
console.log(`Added:   ${added.length}`);
console.log(`Removed: ${removed.length}`);
console.log(`Changed: ${changed.length}`);
console.log(`Same:    ${same.length}`);

if (changed.length > 0) {
  console.log(`\nTop 10 changes:`);
  for (const c of changed.slice(0, 10)) {
    const old = currentTax[c.hs];
    const nw = taxMap[c.hs];
    const detail = c.fields.map((f) => `${f}: "${old[f] || ''}" → "${nw[f] || ''}"`).join(', ');
    console.log(`  ${c.hs} [${c.fields.join(',')}] ${detail}`);
  }
}

if (added.length > 0) {
  console.log(`\nAdded HS (first 5): ${added.slice(0, 5).join(', ')}`);
}
if (removed.length > 0) {
  console.log(`Removed HS (first 5): ${removed.slice(0, 5).join(', ')}`);
}

if (opts.dryRun) {
  console.log('\n=== DRY RUN — no changes made ===');
  process.exit(0);
}

// Upload
console.log(`\nUploading version...`);
const result = uploadTariffMap(taxMap, {
  label: opts.label || `xlsx-${path.basename(opts.file, '.xlsx')}`,
  id: opts.id || '',
  setCurrent: true,
  replaceLive: opts.replace,
  source: `xlsx upload: ${path.basename(opts.file)}`,
});

console.log(`Result: ok=${result.ok}`);
console.log(`Version: ${result.entry.id}`);
console.log(`Rows: ${result.rowCount}`);
console.log(`File: ${result.snapshotPath}`);
console.log(`Live updated: ${result.liveUpdated}`);
console.log(`\nDone. Run 'npm run bench:accuracy:dry' to verify.`);
