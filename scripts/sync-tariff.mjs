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
 *   3. --apply: ghi tax.json mới + snapshot version tự động
 *   4. --dry-run (mặc định): chỉ báo cáo, không ghi
 *
 * Usage:
 *   node scripts/sync-tariff.mjs --source=data/tchq-export-2026.json --dry-run
 *   node scripts/sync-tariff.mjs --source=data/tchq-export-2026.json --apply
 *   node scripts/sync-tariff.mjs --source=data/new-tariff.xlsx --apply --sheet="Biểu thuế"
 *
 * Schema JSON nguồn (TCHQ export format):
 * [
 *   { "hs": "10011100", "vn": "- - Hạt giống", "en": "...", "dvt": "kg",
 *     "mfn": "0", "vat": "5/8/10", "acfta": "0", "cs": "Kiểm dịch..." }
 * ]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TAX_PATH = path.join(ROOT, 'data', 'tax.json');
const VERSIONS_DIR = path.join(ROOT, 'data', 'versions');

// ── Argument parsing ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (name) => {
  const entry = args.find(a => a.startsWith(`--${name}=`));
  return entry ? entry.slice(name.length + 3) : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const source = getArg('source');
const isDryRun = !hasFlag('apply');
const sheetName = getArg('sheet') || 'Biểu thuế';

if (!source) {
  console.error('Usage: node scripts/sync-tariff.mjs --source=<file.json|file.xlsx> [--apply] [--sheet=name]');
  console.error('');
  console.error('Modes:');
  console.error('  --dry-run (default)  Show diff report, do not write');
  console.error('  --apply              Write tax.json + create version snapshot');
  process.exit(1);
}

// ── Schema helpers ────────────────────────────────────────────────────────────

/** Normalize HS code: strip dots, pad to 8 digits. */
function normalizeHs(raw) {
  const s = String(raw || '').replace(/\D/g, '');
  return s.length >= 6 ? s.slice(0, 8).padEnd(8, '0') : null;
}

/** Parse a number that may contain % or commas. */
function parseRate(raw) {
  if (raw == null || raw === '') return '';
  return String(raw).replace(/\s/g, '').trim();
}

// ── JSON source parser ────────────────────────────────────────────────────────

function parseJsonSource(filePath) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const records = Array.isArray(content) ? content : Object.values(content);
  const result = {};
  let skipped = 0;

  for (const row of records) {
    const hs = normalizeHs(row.hs || row.hsCode || row['Mã HS']);
    if (!hs) { skipped++; continue; }
    result[hs] = {
      hs,
      vn: String(row.vn || row.nameVi || row['Mô tả tiếng Việt'] || '').trim(),
      en: String(row.en || row.nameEn || row['Mô tả tiếng Anh'] || '').trim(),
      dvt: String(row.dvt || row.unit || row['Đơn vị'] || '').trim(),
      mfn: parseRate(row.mfn || row['Thuế MFN'] || row['MFN']),
      vat: parseRate(row.vat || row['Thuế VAT'] || row['VAT']),
      acfta: parseRate(row.acfta || row['Thuế ACFTA'] || row['ACFTA']),
      tt: parseRate(row.tt || row['Thuế xuất khẩu'] || ''),
      bvmt: parseRate(row.bvmt || row['Thuế BVMT'] || ''),
      cs: String(row.cs || row.policy || row['Chính sách'] || '').trim(),
    };
  }

  console.log(`Parsed JSON: ${Object.keys(result).length} mã HS (${skipped} dòng bỏ qua)`);
  return result;
}

// ── XLSX source parser ────────────────────────────────────────────────────────

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
  const result = {};
  let skipped = 0;

  // Auto-detect header mapping
  const firstRow = rows[0] || {};
  const keys = Object.keys(firstRow);
  const findKey = (...candidates) => keys.find(k => candidates.some(c => k.toLowerCase().includes(c.toLowerCase()))) || null;

  const hsKey   = findKey('HS', 'Mã HS', 'mã');
  const vnKey   = findKey('Mô tả', 'Tiếng Việt', 'nameVi');
  const enKey   = findKey('English', 'Tiếng Anh', 'nameEn');
  const dvtKey  = findKey('Đơn vị', 'DVT', 'Unit');
  const mfnKey  = findKey('MFN', 'Thông thường', 'Most');
  const vatKey  = findKey('VAT', 'Giá trị gia tăng');
  const acftaKey = findKey('ACFTA', 'ASEAN-China', 'Trung Quốc');
  const csKey   = findKey('Chính sách', 'CS', 'Policy', 'Điều kiện');

  console.log('Header mapping:', { hsKey, vnKey, mfnKey, vatKey, acftaKey });

  if (!hsKey) {
    console.error('ERROR: Cannot find HS code column. Please check sheet headers.');
    process.exit(1);
  }

  for (const row of rows) {
    const hs = normalizeHs(row[hsKey]);
    if (!hs) { skipped++; continue; }
    result[hs] = {
      hs,
      vn: vnKey ? String(row[vnKey]).trim() : '',
      en: enKey ? String(row[enKey]).trim() : '',
      dvt: dvtKey ? String(row[dvtKey]).trim() : '',
      mfn: parseRate(mfnKey ? row[mfnKey] : ''),
      vat: parseRate(vatKey ? row[vatKey] : ''),
      acfta: parseRate(acftaKey ? row[acftaKey] : ''),
      tt: '', bvmt: '',
      cs: csKey ? String(row[csKey]).trim() : '',
    };
  }

  console.log(`Parsed XLSX: ${Object.keys(result).length} mã HS (${skipped} dòng bỏ qua)`);
  return result;
}

// ── Diff ─────────────────────────────────────────────────────────────────────

function computeDiff(current, incoming) {
  const added = [], removed = [], changed = [];
  const FIELDS = ['vn', 'mfn', 'vat', 'acfta', 'cs', 'dvt'];

  for (const hs of Object.keys(incoming)) {
    if (!current[hs]) { added.push(hs); continue; }
    const diffs = FIELDS.filter(f => {
      const a = String(current[hs][f] || '').trim();
      const b = String(incoming[hs][f] || '').trim();
      return a !== b;
    });
    if (diffs.length) changed.push({ hs, fields: diffs,
      before: Object.fromEntries(FIELDS.map(f => [f, current[hs][f]])),
      after:  Object.fromEntries(FIELDS.map(f => [f, incoming[hs][f]])),
    });
  }

  for (const hs of Object.keys(current)) {
    if (!incoming[hs]) removed.push(hs);
  }

  return { added, removed, changed };
}

// ── Snapshot ─────────────────────────────────────────────────────────────────

function createSnapshot(newData, diff) {
  fs.mkdirSync(VERSIONS_DIR, { recursive: true });
  const indexPath = path.join(VERSIONS_DIR, 'index.json');
  let index = { versions: [], current: null };
  if (fs.existsSync(indexPath)) {
    try { index = JSON.parse(fs.readFileSync(indexPath, 'utf8')); } catch { /* use default */ }
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const versionId = `v${ts}`;
  const snapshotPath = path.join(VERSIONS_DIR, `${versionId}.json`);

  fs.writeFileSync(snapshotPath, JSON.stringify(newData, null, 0));
  index.versions.push({
    id: versionId,
    createdAt: new Date().toISOString(),
    source: path.basename(source),
    codes: Object.keys(newData).length,
    added: diff.added.length,
    removed: diff.removed.length,
    changed: diff.changed.length,
  });
  index.current = versionId;
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`\nSnapshot: ${snapshotPath}`);
  return versionId;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== sync-tariff.mjs (${isDryRun ? 'DRY RUN' : 'APPLY'}) ===\n`);
  console.log(`Source: ${source}`);

  if (!fs.existsSync(source)) {
    console.error(`ERROR: File not found: ${source}`);
    process.exit(1);
  }

  // Parse source
  const ext = path.extname(source).toLowerCase();
  const incoming = ext === '.xlsx' || ext === '.xls'
    ? await parseXlsxSource(source, sheetName)
    : parseJsonSource(source);

  if (Object.keys(incoming).length === 0) {
    console.error('ERROR: No records parsed from source. Check file format.');
    process.exit(1);
  }

  // Load current
  const current = JSON.parse(fs.readFileSync(TAX_PATH, 'utf8'));
  console.log(`Current: ${Object.keys(current).length} mã HS`);
  console.log(`Incoming: ${Object.keys(incoming).length} mã HS`);

  // Diff
  const diff = computeDiff(current, incoming);
  console.log(`\n=== DIFF ===`);
  console.log(`  Thêm mới:   ${diff.added.length} mã`);
  console.log(`  Xóa bỏ:     ${diff.removed.length} mã`);
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
    console.log('\nTop 10 mã xóa bỏ:', diff.removed.slice(0, 10).join(', '));
    console.warn('\n⚠️  Cảnh báo: xóa mã HS có thể ảnh hưởng ERP. Kiểm tra kỹ trước khi --apply.');
  }

  if (isDryRun) {
    console.log('\n[DRY RUN] Không ghi. Chạy lại với --apply để cập nhật.');
    return;
  }

  // Apply
  console.log('\nGhi tax.json...');
  // Merge: incoming overrides current, existing fields preserved if incoming missing
  const merged = { ...current };
  for (const [hs, rec] of Object.entries(incoming)) {
    merged[hs] = { ...current[hs], ...rec };
  }
  for (const hs of diff.removed) {
    delete merged[hs];
  }

  fs.writeFileSync(TAX_PATH, JSON.stringify(merged, null, 0));
  const kb = (fs.statSync(TAX_PATH).size / 1024).toFixed(0);
  console.log(`tax.json ghi xong: ${Object.keys(merged).length} mã (${kb}KB)`);

  const versionId = createSnapshot(merged, diff);
  console.log(`Version: ${versionId}`);
  console.log('\n✅ Đồng bộ hoàn tất. Chạy git diff data/tax.json để xem chi tiết.');
  console.log('   Commit: git add data/tax.json data/versions/ && git commit -m "data(tariff): sync biểu thuế <nguồn> (+N mã)"');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
