#!/usr/bin/env node
/**
 * sync-tariff.mjs — Đồng bộ biểu thuế từ nguồn mới vào data/tax.json
 *
 * Hỗ trợ 2 nguồn:
 *   --source=path/to/file.json   (JSON export từ TCHQ portal, format xem bên dưới)
 *   --source=path/to/file.xlsx   (Excel biểu thuế, cần sheet "Biểu thuế" với header HS/MÔ TẢ/MFN/VAT/ACFTA)
 *
 * Quy trình:
 *   1. Parse nguồn mới → normalize sang schema tax.json (hs, vn, en, dvt, mfn, vat, acfta, cs, ...)
 *   2. Diff với tax.json hiện tại → báo cáo thay đổi
 *   3. --apply: ghi tax.json mới + snapshot version tự động (qua lib/tariff-mutations,
 *      tôn trọng HS_DATA_DIR — rule bất biến #8)
 *   4. --dry-run (mặc định): chỉ báo cáo, không ghi
 *
 * An toàn dữ liệu (xem lib/tariff-sync.js):
 *   · Chỉ ghi đè trường mà nguồn CÓ cột/khoá — trường khác giữ nguyên.
 *   · Chỉ nhận mã đúng 8 số (không đệm mã 6 số thành mã giả).
 *   · Mã vắng mặt trong nguồn KHÔNG bị xoá, trừ khi thêm --allow-remove.
 *
 * Usage:
 *   node scripts/sync-tariff.mjs --source=data/tchq-export-2026.json --dry-run
 *   node scripts/sync-tariff.mjs --source=data/tchq-export-2026.json --apply
 *   node scripts/sync-tariff.mjs --source=data/new-tariff.xlsx --apply --sheet="Biểu thuế"
 *   node scripts/sync-tariff.mjs --source=full-2027.json --apply --allow-remove --label=v2027-01-01
 *
 * Schema JSON nguồn (TCHQ export format):
 * [
 *   { "hs": "10011100", "vn": "- - Hạt giống", "en": "...", "dvt": "kg",
 *     "mfn": "0", "vat": "5/8/10", "acfta": "0", "cs": "Kiểm dịch..." }
 * ]
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  recordFromJsonRow,
  detectXlsxColumns,
  recordFromXlsxRow,
  computeDiff,
  mergeTariff,
} = require('../lib/tariff-sync.js');
const { dataReadPath } = require('../lib/data-paths.js');

// ── Argument parsing ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (name) => {
  const entry = args.find(a => a.startsWith(`--${name}=`));
  return entry ? entry.slice(name.length + 3) : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const source = getArg('source');
const isDryRun = !hasFlag('apply');
const allowRemove = hasFlag('allow-remove');
const sheetName = getArg('sheet') || 'Biểu thuế';
const label = getArg('label') || '';

if (!source) {
  console.error('Usage: node scripts/sync-tariff.mjs --source=<file.json|file.xlsx> [--apply] [--allow-remove] [--sheet=name] [--label=v2027-01-01]');
  console.error('');
  console.error('Modes:');
  console.error('  --dry-run (default)  Show diff report, do not write');
  console.error('  --apply              Write tax.json + create version snapshot');
  console.error('  --allow-remove       Also DELETE codes absent from source (only for a FULL tariff file)');
  process.exit(1);
}

// ── Parsers ──────────────────────────────────────────────────────────────────

function parseJsonSource(filePath) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const records = Array.isArray(content) ? content : Object.values(content);
  const result = {};
  let skipped = 0;
  for (const row of records) {
    const rec = recordFromJsonRow(row);
    if (!rec) { skipped++; continue; }
    result[rec.hs] = rec;
  }
  console.log(`Parsed JSON: ${Object.keys(result).length} mã HS (${skipped} dòng bỏ qua — không đúng 8 số)`);
  return result;
}

async function parseXlsxSource(filePath, sheet) {
  let XLSX;
  try { XLSX = (await import('xlsx')).default; }
  catch {
    console.error('ERROR: xlsx package not available. Install: npm install xlsx --save-dev');
    process.exit(1);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  console.log(`Sheets available: ${sheetNames.join(', ')}`);
  const targetSheet = sheetNames.find(n => n === sheet) || sheetNames[0];
  console.log(`Using sheet: ${targetSheet}`);

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[targetSheet], { defval: '' });
  const cols = detectXlsxColumns(Object.keys(rows[0] || {}));
  console.log('Header mapping (chỉ các trường này bị ghi đè):', cols);
  if (!cols.hs) {
    console.error('ERROR: Cannot find HS code column. Please check sheet headers.');
    process.exit(1);
  }

  const result = {};
  let skipped = 0;
  for (const row of rows) {
    const rec = recordFromXlsxRow(row, cols);
    if (!rec) { skipped++; continue; }
    result[rec.hs] = rec;
  }
  console.log(`Parsed XLSX: ${Object.keys(result).length} mã HS (${skipped} dòng bỏ qua — không đúng 8 số)`);
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== sync-tariff.mjs (${isDryRun ? 'DRY RUN' : 'APPLY'}) ===\n`);
  console.log(`Source: ${source}`);

  if (!fs.existsSync(source)) {
    console.error(`ERROR: File not found: ${source}`);
    process.exit(1);
  }

  const ext = path.extname(source).toLowerCase();
  const incoming = ext === '.xlsx' || ext === '.xls'
    ? await parseXlsxSource(source, sheetName)
    : parseJsonSource(source);

  if (Object.keys(incoming).length === 0) {
    console.error('ERROR: No records parsed from source. Check file format.');
    process.exit(1);
  }

  const current = JSON.parse(fs.readFileSync(dataReadPath('tax.json'), 'utf8'));
  console.log(`Current: ${Object.keys(current).length} mã HS`);
  console.log(`Incoming: ${Object.keys(incoming).length} mã HS`);

  const diff = computeDiff(current, incoming);
  console.log(`\n=== DIFF ===`);
  console.log(`  Thêm mới:   ${diff.added.length} mã`);
  console.log(`  Vắng trong nguồn: ${diff.removed.length} mã ${allowRemove ? '(SẼ XOÁ — --allow-remove)' : '(giữ nguyên)'}`);
  console.log(`  Thay đổi:   ${diff.changed.length} mã`);

  if (diff.changed.length > 0) {
    console.log('\nTop 10 thay đổi:');
    for (const c of diff.changed.slice(0, 10)) {
      console.log(`  ${c.hs}: ${c.fields.join(', ')}`);
      for (const f of c.fields) {
        console.log(`    ${f}: "${c.before[f]}" → "${c.after[f]}"`);
      }
    }
  }
  if (diff.added.length > 0) {
    console.log('\nTop 10 mã thêm mới:', diff.added.slice(0, 10).join(', '));
  }
  if (diff.removed.length > 0) {
    console.log('\nTop 10 mã vắng trong nguồn:', diff.removed.slice(0, 10).join(', '));
    if (allowRemove) console.warn('\n⚠️  --allow-remove: các mã này sẽ bị XOÁ. Chỉ dùng khi nguồn là biểu thuế ĐẦY ĐỦ.');
  }

  if (isDryRun) {
    console.log('\n[DRY RUN] Không ghi. Chạy lại với --apply để cập nhật.');
    return;
  }

  const { merged, removed } = mergeTariff(current, incoming, { allowRemove });
  const { uploadTariffMap } = require('../lib/tariff-mutations.js');
  const out = uploadTariffMap(merged, {
    label: label || `sync-${new Date().toISOString().slice(0, 10)}`,
    setCurrent: true,
    replaceLive: true,
    source: `sync-tariff: ${path.basename(source)} (+${diff.added.length} / ~${diff.changed.length} / -${removed})`,
  });
  console.log(`tax.json ghi xong: ${out.rowCount} mã — version ${out.entry.id}`);
  console.log('\n✅ Đồng bộ hoàn tất. Chạy git diff data/tax.json để xem chi tiết.');
  console.log('   Nhớ rebuild dữ liệu dẫn xuất (search.json, tax-enriched...) trước khi commit.');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
