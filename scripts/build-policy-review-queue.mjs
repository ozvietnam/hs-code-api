#!/usr/bin/env node
/**
 * Hàng đợi duyệt chính sách quản lý chuyên ngành do LLM bóc tách.
 *
 * VÌ SAO: data/tax-enriched.json có 7.928 dòng bóc từ cột chính sách (cs) của
 * biểu thuế bằng MiniMax/Gemini/Hermes — CHƯA ai duyệt. Duyệt hết một lượt là
 * bất khả; cần biết duyệt dòng nào TRƯỚC. Script này xếp hạng:
 *   1. Cờ mâu thuẫn tự động — dấu hiệu LLM bóc sai, ưu tiên cao nhất:
 *        · nguyên văn có "giấy phép" mà requiresLicense=false
 *        · "QSD cấp/cấm NK" (hàng đã qua sử dụng bị cấm) bị đọc thành cần giấy phép
 *        · nguyên văn có "kiểm dịch" mà requiresQuarantine=false
 *        · nguyên văn có "kiểm tra" (trừ "cắt giảm kiểm tra") mà requiresInspection=false
 *        · văn bản LLM trích không có trong chỉ mục legal-docs
 *        · nguyên văn cs trong biểu thuế đã đổi so với lúc bóc (bản bóc cũ)
 *   2. Mức nghiêm trọng: CRITICAL > HIGH > MEDIUM > LOW
 *
 * Đầu ra (chuyên viên mở bằng Excel, điền 3 cột cuối):
 *   data/policy-review-queue.csv
 *
 *   node scripts/build-policy-review-queue.mjs            # in thống kê
 *   node scripts/build-policy-review-queue.mjs --write        # dòng có cờ + CRITICAL/HIGH
 *   node scripts/build-policy-review-queue.mjs --write --all  # toàn bộ 7.928 dòng
 */
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { dataPath, dataReadPath } = require('../lib/data-paths.js');
const { getDocByCode } = require('../lib/legal-docs.js');

const SEVERITY_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
const SYSTEMIC = new Set(['USED_GOODS_BAN_READ_AS_LICENSE']);

function fold(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}

/** Các cờ mâu thuẫn giữa nguyên văn và bản LLM bóc. */
export function reviewFlags(enriched, taxRow) {
  const w = enriched.warnings || {};
  const raw = String(w.rawText || '');
  const t = fold(raw);
  const flags = [];
  if (/giay phep/.test(t) && w.requiresLicense === false) flags.push('LICENSE_MISSED');
  // "QSD cấp/cấm NK" (08/2023/TT-BCT PL1) = hàng ĐÃ QUA SỬ DỤNG bị CẤM nhập — LLM
  // hay hiểu thành "cần giấy phép NK" cho cả hàng mới. Lỗi hệ thống, cờ riêng.
  if (/qsd ca[pm] nk/.test(t) && w.requiresLicense === true && !w.usedGoodsImportBan && !/giay phep/.test(t)) flags.push('USED_GOODS_BAN_READ_AS_LICENSE');
  if (/kiem dich/.test(t) && w.requiresQuarantine === false) flags.push('QUARANTINE_MISSED');
  // "đã được cắt giảm kiểm tra chuyên ngành" là BỎ kiểm tra — không tính.
  const inspectText = t.replace(/cat giam kiem tra[^;)]*/g, '');
  if (/kiem tra/.test(inspectText) && w.requiresInspection === false) flags.push('INSPECTION_MISSED');
  const unknownDocs = (w.legalDocs || []).map((d) => d.code).filter((c) => c && !getDocByCode(c));
  if (unknownDocs.length) flags.push(`DOC_NOT_INDEXED:${unknownDocs.join('|')}`);
  const cs = String(taxRow?.cs || '').trim();
  if (cs && raw && fold(cs) !== t) flags.push('SOURCE_CHANGED');
  if (!cs) flags.push('SOURCE_REMOVED');
  return flags;
}

export function buildQueue(enrichedMap, taxData) {
  const rows = Object.values(enrichedMap).map((e) => {
    const tax = taxData[e.hsCode];
    const flags = reviewFlags(e, tax);
    const sev = e.warnings?.severity || 'NONE';
    return {
      hsCode: e.hsCode,
      nameVi: String(tax?.vn || '').replace(/^[-\s]+/, ''),
      severity: sev,
      flags,
      // Cờ cụ thể (sai từng dòng) nặng hơn cờ lỗi hệ thống (sửa một lần bằng luật).
      priority: flags.filter((f) => !SYSTEMIC.has(f)).length * 10 + flags.filter((f) => SYSTEMIC.has(f)).length + (SEVERITY_RANK[sev] || 0),
      rawText: e.warnings?.rawText || '',
      summary: e.warnings?.summary || '',
      requiresLicense: e.warnings?.requiresLicense ?? '',
      licenseTypes: (e.warnings?.licenseTypes || []).join('; '),
      requiresInspection: e.warnings?.requiresInspection ?? '',
      requiresQuarantine: e.warnings?.requiresQuarantine ?? '',
      ministries: (e.warnings?.ministries || []).join('; '),
      legalDocs: (e.warnings?.legalDocs || []).map((d) => d.code).join('; '),
      enrichModel: e.enrichModel || '',
    };
  });
  rows.sort((a, b) => b.priority - a.priority || a.hsCode.localeCompare(b.hsCode));
  return rows;
}

const CSV_COLS = ['hsCode', 'nameVi', 'severity', 'flags', 'rawText', 'summary', 'requiresLicense', 'licenseTypes',
  'requiresInspection', 'requiresQuarantine', 'ministries', 'legalDocs', 'enrichModel', 'ketQuaDuyet', 'nguoiDuyet', 'ghiChu'];

function csvCell(v) {
  const s = Array.isArray(v) ? v.join(' ') : String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const enriched = JSON.parse(fs.readFileSync(dataReadPath('tax-enriched.json'), 'utf8'));
  const tax = JSON.parse(fs.readFileSync(dataReadPath('tax.json'), 'utf8'));
  const queue = buildQueue(enriched, tax);
  const flagCount = {};
  for (const r of queue) for (const f of r.flags) { const k = f.split(':')[0]; flagCount[k] = (flagCount[k] || 0) + 1; }
  const flagged = queue.filter((r) => r.flags.length).length;
  console.log(`Tổng ${queue.length} dòng · có cờ mâu thuẫn: ${flagged}`);
  console.log('Cờ:', flagCount);
  console.log('Mức:', queue.reduce((m, r) => ({ ...m, [r.severity]: (m[r.severity] || 0) + 1 }), {}));
  console.log('\n10 dòng ưu tiên đầu:');
  for (const r of queue.slice(0, 10)) console.log(`  ${r.hsCode} [${r.severity}] ${r.flags.join(',')} — ${r.rawText.slice(0, 90)}`);
  if (process.argv.includes('--write')) {
    // Mặc định chỉ ghi phần cần duyệt TRƯỚC (có cờ, hoặc CRITICAL/HIGH) — --all ghi hết.
    const rows = process.argv.includes('--all')
      ? queue
      : queue.filter((r) => r.flags.length || (SEVERITY_RANK[r.severity] || 0) >= SEVERITY_RANK.HIGH);
    const lines = [CSV_COLS.join(','), ...rows.map((r) => CSV_COLS.map((c) => csvCell(r[c] ?? '')).join(','))];
    // BOM để Excel đọc đúng tiếng Việt.
    fs.writeFileSync(dataPath('policy-review-queue.csv'), `﻿${lines.join('\n')}\n`);
    console.log(`\nĐã ghi data/policy-review-queue.csv (${rows.length}/${queue.length} dòng)`);
  }
}
