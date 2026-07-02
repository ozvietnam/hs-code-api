#!/usr/bin/env node
// Data quality audit — quét data/tax.json + data/tax-enriched.json tìm anomaly
// để CEO review + làm sạch dần. Output: data/data-quality-report.json (commit vào repo,
// serverless đọc qua /api/data-quality).
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tax = JSON.parse(readFileSync(join(root, 'data', 'tax.json'), 'utf8'));
const enriched = JSON.parse(readFileSync(join(root, 'data', 'tax-enriched.json'), 'utf8'));

const rows = Object.values(tax);
const findings = {};

function addFinding(category, description, severity, items) {
  findings[category] = {
    severity, // info | warn | error
    description,
    count: items.length,
    samples: items.slice(0, 20),
  };
}

// ── 1. HS code format ────────────────────────────────────────────────────────
const badHs = rows.filter((r) => !/^\d{8}$/.test(String(r.hs))).map((r) => r.hs);
addFinding('hsFormatInvalid', 'Mã HS không đúng 8 chữ số', 'error', badHs);

// ── 2. Thiếu tên / đơn vị tính ───────────────────────────────────────────────
// Quy ước biểu thuế: chương 98 (mã ưu đãi đặc biệt) — VAT/đơn vị tính áp theo
// mã gốc tương ứng tại 97 chương, nên để trống là ĐÚNG quy ước, không phải thiếu data.
const isCh98 = (r) => r.hs.startsWith('98');

addFinding('missingNameVi', 'Thiếu tên tiếng Việt', 'error',
  rows.filter((r) => !String(r.vn || '').trim()).map((r) => r.hs));

const noUnit = rows.filter((r) => !String(r.dvt || '').trim());
addFinding('unitEmptyCh98', 'Đơn vị tính trống ở chương 98 (đúng quy ước — theo mã gốc tương ứng)', 'info',
  noUnit.filter(isCh98).map((r) => r.hs));
addFinding('unitEmptyOther', 'Thiếu đơn vị tính NGOÀI chương 98 (thiếu data thật)', 'warn',
  noUnit.filter((r) => !isCh98(r)).map((r) => r.hs));

const noEn = rows.filter((r) => !String(r.en || '').trim());
const enByChapter = {};
for (const r of noEn) { const ch = r.hs.slice(0, 2); enByChapter[ch] = (enByChapter[ch] || 0) + 1; }
addFinding('missingNameEn', `Thiếu tên tiếng Anh (ảnh hưởng search song ngữ) — theo chương: ${JSON.stringify(enByChapter)}`, 'info',
  noEn.map((r) => r.hs));

// ── 3. Thuế bất thường ───────────────────────────────────────────────────────
const noVat = rows.filter((r) => !String(r.vat || '').trim());
addFinding('vatEmptyCh98', 'VAT trống ở chương 98 (đúng quy ước — theo mã gốc tương ứng)', 'info',
  noVat.filter(isCh98).map((r) => r.hs));
addFinding('vatEmptyOther', 'VAT trống NGOÀI chương 98 (thiếu data thật)', 'warn',
  noVat.filter((r) => !isCh98(r)).map((r) => r.hs));

addFinding('ttWithoutMfn', 'Có thuế TT nhưng MFN rỗng (nghi thiếu data)', 'warn',
  rows.filter((r) => String(r.tt || '').trim() && !String(r.mfn || '').trim()).map((r) => r.hs));
addFinding('mfnWithoutTt', 'Có MFN nhưng TT rỗng (nghi thiếu data)', 'warn',
  rows.filter((r) => String(r.mfn || '').trim() && !String(r.tt || '').trim()).map((r) => r.hs));

const numRe = /^\d+(\.\d+)?$/;
const quotaRe = /^\d+(\.\d+)?\s*\(NHN:\s*\d+(\.\d+)?\)$/; // "27 (NHN: 80)" = trong/ngoài hạn ngạch
const nonNum = rows.filter((r) => {
  const v = String(r.mfn || '').trim();
  return v && !numRe.test(v);
});
const ch98RefRe = /^Theo hướng dẫn tại .*Chương 98$/;
addFinding('mfnQuotaFormat', 'MFN dạng thuế hạn ngạch "X (NHN: Y)" — trong/ngoài hạn ngạch, data hợp lệ', 'info',
  nonNum.filter((r) => quotaRe.test(String(r.mfn).trim())).map((r) => `${r.hs}: "${r.mfn}"`));
addFinding('mfnCh98Reference', 'MFN là text tham chiếu hướng dẫn Chương 98 — đúng quy ước biểu thuế', 'info',
  nonNum.filter((r) => ch98RefRe.test(String(r.mfn).trim())).map((r) => `${r.hs}: "${r.mfn}"`));
addFinding('mfnMalformed', 'MFN format lạ (không phải số/hạn ngạch NHN/tham chiếu Ch.98) — cần kiểm tra', 'warn',
  nonNum.filter((r) => {
    const v = String(r.mfn).trim();
    return !quotaRe.test(v) && !ch98RefRe.test(v);
  }).map((r) => `${r.hs}: "${r.mfn}"`));

// ── 4. Tên trùng lặp (khác mã, cùng tên) ────────────────────────────────────
const byName = new Map();
for (const r of rows) {
  const name = String(r.vn || '').trim().toLowerCase();
  if (!name) continue;
  if (!byName.has(name)) byName.set(name, []);
  byName.get(name).push(r.hs);
}
const dupGroups = [...byName.entries()]
  .filter(([, hs]) => hs.length >= 2)
  .sort((a, b) => b[1].length - a[1].length);
addFinding('duplicateNames', 'Nhóm tên VN trùng nhau (thường là "Loại khác" — hợp lệ nhưng cần mô tả khu biệt)', 'info',
  dupGroups.slice(0, 50).map(([name, hs]) => ({ name: name.slice(0, 60), count: hs.length, hs: hs.slice(0, 6) })));

// ── 5. Cross-check tax ↔ enriched ───────────────────────────────────────────
const taxWithPolicy = new Set(rows.filter((r) => String(r.cs || '').trim()).map((r) => r.hs));
const enrichedSet = new Set(Object.keys(enriched));
addFinding('policyNotEnriched', 'Có policy text (cs) nhưng CHƯA enrich (chạy npm run data:enrich-policies)', 'warn',
  [...taxWithPolicy].filter((hs) => !enrichedSet.has(hs)));
addFinding('enrichedOrphan', 'Enriched nhưng mã không còn trong tax.json (stale sau update biểu thuế)', 'warn',
  [...enrichedSet].filter((hs) => !tax[hs]));
addFinding('enrichedStaleText', 'Policy text đã đổi so với lúc enrich (cần re-enrich)', 'warn',
  [...enrichedSet].filter((hs) => {
    const raw = enriched[hs]?.warnings?.rawText;
    return tax[hs] && typeof raw === 'string' && raw.trim() !== String(tax[hs].cs || '').trim();
  }));

// ── 6. Enriched nội bộ ───────────────────────────────────────────────────────
const enrichedEntries = Object.values(enriched);
addFinding('enrichedUnknownIssuer', 'legalDocs có issuer không nhận diện được', 'info',
  enrichedEntries
    .filter((e) => (e.warnings?.legalDocs || []).some((d) => !d.issuer || d.issuer === 'UNKNOWN'))
    .map((e) => e.hsCode));
addFinding('enrichedFutureYear', 'legalDocs có năm > 2026 (nghi typo LLM)', 'warn',
  enrichedEntries
    .filter((e) => (e.warnings?.legalDocs || []).some((d) => d.year > 2026))
    .map((e) => e.hsCode));

// ── Stats tổng quan ──────────────────────────────────────────────────────────
const severityDist = {};
for (const e of enrichedEntries) {
  const s = e.warnings?.severity || 'NONE';
  severityDist[s] = (severityDist[s] || 0) + 1;
}

const errorCount = Object.values(findings).filter((f) => f.severity === 'error' && f.count > 0).length;
const warnCount = Object.values(findings).filter((f) => f.severity === 'warn' && f.count > 0).length;

const report = {
  generatedAt: new Date().toISOString(),
  stats: {
    taxRows: rows.length,
    rowsWithPolicy: taxWithPolicy.size,
    enrichedRows: enrichedEntries.length,
    enrichedCoveragePct: Math.round((enrichedEntries.length / taxWithPolicy.size) * 1000) / 10,
    severityDistribution: severityDist,
    categoriesWithErrors: errorCount,
    categoriesWithWarnings: warnCount,
  },
  findings,
};

const outPath = join(root, 'data', 'data-quality-report.json');
writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(`Data quality report → ${outPath}\n`);
console.log(`Tổng: ${rows.length} mã | policy: ${taxWithPolicy.size} | enriched: ${enrichedEntries.length} (${report.stats.enrichedCoveragePct}%)`);
console.log(`Severity: ${JSON.stringify(severityDist)}\n`);
const rankOrder = { error: 0, warn: 1, info: 2 };
for (const [cat, f] of Object.entries(findings).sort((a, b) => rankOrder[a[1].severity] - rankOrder[b[1].severity])) {
  const mark = f.count === 0 ? '✓' : (f.severity === 'error' ? '✗' : f.severity === 'warn' ? '⚠' : 'ℹ');
  console.log(`${mark} [${f.severity.toUpperCase().padEnd(5)}] ${cat}: ${f.count} — ${f.description}`);
}
process.exit(0);
