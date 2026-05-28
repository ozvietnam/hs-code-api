#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DEFAULT_INPUT = path.join(ROOT, 'data/oz-export/1.BaoCaoHangChiTiet.xlsx');
const OUTPUT_JSONL = path.join(ROOT, 'data/oz-declarations.jsonl');

const defaultMapping = {
  sheetName: 'Sheet1',
  headerRow: 10,
  columns: {
    declId: 'Số TK',
    date: 'Ngày ĐK',
    hsCode: 'Mã HS',
    productName: 'Tên hàng',
    customsDescription: 'Tên hàng',
    unitVi: 'Đơn vị tính',
    quantity: 'Tổng số lượng',
    origin: 'Xuất xứ',
    auditNote: 'Ghi chú',
    brandSource: 'Tên hàng',
    modelSource: 'Tên hàng',
  },
};

function parseArgs(argv) {
  const args = { dryRun: false, file: DEFAULT_INPUT, mapping: null };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (arg.startsWith('--file=')) {
      const value = arg.slice('--file='.length).trim();
      if (value) args.file = path.isAbsolute(value) ? value : path.join(ROOT, value);
      continue;
    }
    if (arg.startsWith('--mapping=')) {
      const raw = arg.slice('--mapping='.length).trim();
      if (raw) args.mapping = JSON.parse(raw);
    }
  }
  return args;
}

function toText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function parseDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  const m = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = m[2].padStart(2, '0');
  const year = m[3];
  return `${year}-${month}-${day}`;
}

function parseQuantity(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value).replace(/,/g, '').trim();
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeHs(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length < 6 || digits.length > 12) return null;
  return digits;
}

function mapOriginToIso2(origin) {
  const text = (origin || '').toUpperCase();
  const dictionary = {
    CHINA: 'CN',
    'TRUNG QUOC': 'CN',
    'TRUNG QUỐC': 'CN',
    VIETNAM: 'VN',
    'VIỆT NAM': 'VN',
    JAPAN: 'JP',
    KOREA: 'KR',
    USA: 'US',
  };
  return dictionary[text] || (text.length === 2 ? text : null);
}

function extractBrand(text) {
  if (!text) return null;
  const match = text.match(/(?:nhãn hiệu|hiệu)\s*:?\s*([A-Za-z0-9][A-Za-z0-9 .\-_/]{1,40})/i);
  return match ? match[1].trim() : null;
}

function extractModel(text) {
  if (!text) return null;
  const match = text.match(/(?:model|mã)\s*:?\s*([A-Za-z0-9][A-Za-z0-9 .\-_/]{1,40})/i);
  return match ? match[1].trim() : null;
}

function safePreview(record) {
  return {
    declId: record.declId,
    date: record.date,
    hsCode: record.hsCode,
    productName: record.productName?.slice(0, 80) || null,
    outcome: record.outcome,
    quantity: record.quantity,
    unitVi: record.unitVi,
    sourceFile: record.sourceFile,
    sourceRow: record.sourceRow,
  };
}

function buildHeaderMap(headerRow) {
  const map = new Map();
  headerRow.forEach((name, index) => {
    const key = String(name ?? '').trim();
    if (key) map.set(key, index);
  });
  return map;
}

function getCell(row, headerMap, name) {
  const index = headerMap.get(name);
  if (index == null) return null;
  return row[index];
}

function main() {
  const args = parseArgs(process.argv);
  const mapping = { ...defaultMapping, ...(args.mapping || {}) };
  mapping.columns = { ...defaultMapping.columns, ...(args.mapping?.columns || {}) };

  if (!fs.existsSync(args.file)) {
    throw new Error(`Input file not found: ${args.file}`);
  }

  const workbook = XLSX.readFile(args.file, { cellDates: true });
  const sheet = workbook.Sheets[mapping.sheetName];
  if (!sheet) throw new Error(`Sheet not found: ${mapping.sheetName}`);

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
  const headerIndex = Math.max(0, Number(mapping.headerRow) - 1);
  const headerRow = rows[headerIndex] || [];
  const headerMap = buildHeaderMap(headerRow);
  const dataRows = rows.slice(headerIndex + 1).filter((row) => row.some((cell) => cell != null && String(cell).trim() !== ''));

  const valid = [];
  const errorByType = {};
  const warningByType = {};
  const rowErrors = [];

  dataRows.forEach((row, i) => {
    const sourceRow = headerIndex + 2 + i;
    const rawDeclId = toText(getCell(row, headerMap, mapping.columns.declId));
    const rawDate = getCell(row, headerMap, mapping.columns.date);
    const rawHsCode = getCell(row, headerMap, mapping.columns.hsCode);
    const rawName = toText(getCell(row, headerMap, mapping.columns.productName));
    const rawDescription = toText(getCell(row, headerMap, mapping.columns.customsDescription));
    const rawUnit = toText(getCell(row, headerMap, mapping.columns.unitVi));
    const rawQuantity = getCell(row, headerMap, mapping.columns.quantity);
    const rawOrigin = toText(getCell(row, headerMap, mapping.columns.origin));
    const rawAudit = toText(getCell(row, headerMap, mapping.columns.auditNote));

    const date = parseDate(rawDate);
    const hsCode = normalizeHs(rawHsCode);
    const quantity = parseQuantity(rawQuantity);
    const origin = mapOriginToIso2(rawOrigin);

    const rowIssue = [];
    if (!rawDeclId) rowIssue.push('missing_declId');
    if (!date) rowIssue.push('invalid_date');
    if (!hsCode) rowIssue.push('invalid_hsCode');
    if (!rawName) rowIssue.push('missing_productName');
    if (quantity == null) rowIssue.push('invalid_quantity');
    if (!rawUnit) rowIssue.push('missing_unit');

    if (!origin) {
      warningByType.unmapped_origin = (warningByType.unmapped_origin || 0) + 1;
    }

    if (rowIssue.length > 0) {
      rowIssue.forEach((issue) => {
        errorByType[issue] = (errorByType[issue] || 0) + 1;
      });
      rowErrors.push({ sourceRow, rowIssue });
      return;
    }

    const declaration = {
      declId: rawDeclId,
      date,
      productName: rawName,
      brand: extractBrand(toText(getCell(row, headerMap, mapping.columns.brandSource))),
      model: extractModel(toText(getCell(row, headerMap, mapping.columns.modelSource))),
      hsCode,
      hsCodeRevised: null,
      unitVi: rawUnit,
      origin: origin || 'UN',
      quantity,
      importerName: 'Oz VN',
      outcome: 'UNKNOWN',
      customsDescription: rawDescription || rawName,
      auditNote: rawAudit,
      sourceFile: path.basename(args.file),
      sourceRow,
    };
    valid.push(declaration);
  });

  console.log('\n=== import-oz-declarations dry-run report ===');
  console.log(`File: ${path.basename(args.file)}`);
  console.log(`Sheet: ${mapping.sheetName}`);
  console.log(`Rows scanned: ${dataRows.length}`);
  console.log(`Valid: ${valid.length}`);
  console.log(`Errors: ${rowErrors.length}`);
  console.log(`Warnings: ${Object.values(warningByType).reduce((sum, count) => sum + count, 0)}`);

  if (Object.keys(errorByType).length) {
    console.log('\nError breakdown:');
    Object.entries(errorByType).forEach(([key, count]) => {
      console.log(`- ${key}: ${count}`);
    });
  }

  if (Object.keys(warningByType).length) {
    console.log('\nWarning breakdown:');
    Object.entries(warningByType).forEach(([key, count]) => {
      console.log(`- ${key}: ${count}`);
    });
  }

  console.log('\nSample records (max 5):');
  valid.slice(0, 5).forEach((record, idx) => {
    console.log(`${idx + 1}. ${JSON.stringify(safePreview(record))}`);
  });

  if (args.dryRun) {
    console.log('\n[dry-run] No file written.');
    return;
  }

  const payload = valid.map((record) => JSON.stringify(record)).join('\n') + '\n';
  fs.writeFileSync(OUTPUT_JSONL, payload, 'utf8');
  console.log(`\nWrote ${valid.length} records to ${OUTPUT_JSONL}`);
}

main();
