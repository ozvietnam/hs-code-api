/**
 * Hàm dùng chung cho bộ công cụ vòng lặp từ điển (dict:queue / dict:coverage /
 * dict:check / bench:delta). Chỉ đọc, không ghi — việc ghi nằm ở từng script.
 *
 * Quy ước một "nhóm" là mã 4 số (8481). Lá = mọi mã 8 số trong data/tax.json
 * bắt đầu bằng 4 số đó. tax.json chỉ có dòng lá, không có dòng cha.
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const PROGRESS_PATH = join(ROOT, 'data', 'dictionary-progress.json');
export const QUEUE_PATH = join(ROOT, 'data', 'dictionary-queue.json');
export const COVERAGE_DIR = join(ROOT, 'data', 'heading-coverage');
export const THESAURUS_PATH = join(ROOT, 'data', 'trade-synonyms.json');

export function loadTax() {
  return require(join(ROOT, 'data', 'tax.json'));
}

export function loadThesaurus() {
  return JSON.parse(readFileSync(THESAURUS_PATH, 'utf8'));
}

export function loadProgress() {
  if (!existsSync(PROGRESS_PATH)) return { version: 1, noteVi: '', headings: {} };
  return JSON.parse(readFileSync(PROGRESS_PATH, 'utf8'));
}

export function isHeading(s) {
  return /^\d{4}$/.test(String(s || ''));
}

/** Mọi mã lá 8 số của một nhóm, đã sắp xếp. */
export function leavesOf(tax, heading) {
  return Object.keys(tax)
    .filter((k) => /^\d{8}$/.test(k) && k.startsWith(heading))
    .sort();
}

/** Danh sách mọi nhóm 4 số có trong biểu thuế. */
export function allHeadings(tax) {
  const set = new Set();
  for (const k of Object.keys(tax)) if (/^\d{8}$/.test(k)) set.add(k.slice(0, 4));
  return [...set].sort();
}

/** Tiêu đề nhóm (tiếng Anh, từ breadcrumb) — biểu thuế trong repo không có dòng cha tiếng Việt. */
export function headingTitle(heading, tax) {
  const { breadcrumbOf } = require(join(ROOT, 'lib', 'hs-breadcrumb.js'));
  const leaf = leavesOf(tax, heading)[0];
  if (!leaf) return '';
  const b = breadcrumbOf(leaf);
  const lvl = (b?.levels || []).find((l) => l.startsWith(`Nhóm ${heading}:`));
  return lvl ? lvl.replace(`Nhóm ${heading}: `, '') : '';
}

/**
 * Tính độ phủ của một nhóm: mỗi lá ánh xạ tới các mục từ điển có lá đó trong
 * candidates[]. Đây là toàn bộ nội dung "biên bản nghiệm thu" — mọi thứ khác
 * (tên dòng, tiếng Anh) đã có trong tax.json, không chép lại.
 */
export function coverageOf(heading, tax, thesaurus) {
  const leaves = leavesOf(tax, heading);
  const codes = {};
  for (const hs of leaves) codes[hs] = [];
  const entryIds = new Set();
  for (const e of thesaurus.entries) {
    for (const c of e.candidates || []) {
      if (codes[c.hs] && !codes[c.hs].includes(e.id)) {
        codes[c.hs].push(e.id);
        entryIds.add(e.id);
      }
    }
  }
  const missingHs = leaves.filter((hs) => codes[hs].length === 0);
  return {
    heading,
    titleEn: headingTitle(heading, tax),
    leafCount: leaves.length,
    coveredCount: leaves.length - missingHs.length,
    missingHs,
    synonymEntryIds: [...entryIds].sort(),
    codes,
  };
}

/** Đọc file heading-coverage — chấp nhận cả dạng cũ (codes[hs].synonymEntryIds) lẫn dạng gọn (codes[hs] = [...]). */
export function coverageEntryIds(cov, hs) {
  const v = cov?.codes?.[hs];
  if (Array.isArray(v)) return v;
  return v?.synonymEntryIds || [];
}

/** Bỏ dấu + hạ chữ thường, cùng quy tắc với lib/trade-synonyms.js. */
export function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
