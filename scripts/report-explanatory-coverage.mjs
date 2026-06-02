#!/usr/bin/env node
// A4 (#46) — Báo cáo độ phủ explanatory-notes.json.
// Đo: (1) độ phủ trên tax.json, (2) độ phủ trên mã Oz thực tế (oz-gold-final.jsonl)
//   — cả unweighted (theo số mã) lẫn weighted (theo ozCount = tần suất khai thực tế),
//   (3) danh sách nhóm/chương + top mã Oz THIẾU note để A1/đào bổ sung sau.
// Ghi: data/explanatory-coverage-report.json + in tóm tắt.
//
// Chạy: npm run data:report-explanatory   (deterministic, không cần LLM)

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data');

const { getByHs, getCoverageStats } = require('../lib/explanatory-notes.js');
const tax = require('../data/tax.json');

// --- Oz declarations (resume-safe đọc jsonl) ---
function readOzGold() {
  const f = path.join(DATA, 'oz-gold-final.jsonl');
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

const stats = getCoverageStats();
const oz = readOzGold();

// Độ phủ Oz: theo số mã (unweighted) + theo ozCount (weighted = sát thực tế khai báo).
let ozCodes = 0, ozCodesWithNote = 0, ozWeight = 0, ozWeightWithNote = 0;
const missingOz = []; // mã Oz chưa có note (ưu tiên đào)
for (const r of oz) {
  const hs = String(r.hsCode || '').replace(/\D/g, '').slice(0, 8);
  if (hs.length !== 8) continue;
  const w = Number(r.ozCount) || 1;
  ozCodes += 1; ozWeight += w;
  if (getByHs(hs)) { ozCodesWithNote += 1; ozWeightWithNote += w; }
  else missingOz.push({ hsCode: hs, tenHang: r.tenHang || '', ozCount: w });
}
missingOz.sort((a, b) => b.ozCount - a.ozCount);

// Gom mã thiếu theo chương để chỉ ra vùng yếu.
const missingByChapter = {};
for (const m of missingOz) {
  const ch = m.hsCode.slice(0, 2);
  (missingByChapter[ch] ||= { chapter: ch, missingCodes: 0, missingWeight: 0 });
  missingByChapter[ch].missingCodes += 1;
  missingByChapter[ch].missingWeight += m.ozCount;
}
const weakChapters = Object.values(missingByChapter).sort((a, b) => b.missingWeight - a.missingWeight).slice(0, 15);

const report = {
  generatedAt: new Date().toISOString().slice(0, 10),
  source: 'data/explanatory-notes.json',
  tax: {
    codes8: stats.taxCodes8,
    withNote: stats.taxCodesWithNote,
    coveragePct: stats.taxCoveragePct,
    distinctHeadings: stats.distinctHeadings,
    distinctChapters: stats.distinctChapters,
  },
  ozGold: {
    declarations: oz.length,
    distinctCodesEvaluated: ozCodes,
    codesWithNote: ozCodesWithNote,
    codesCoveragePct: ozCodes ? +(ozCodesWithNote / ozCodes * 100).toFixed(1) : 0,
    weightedCoveragePct: ozWeight ? +(ozWeightWithNote / ozWeight * 100).toFixed(1) : 0,
  },
  weakChapters,            // chương Oz hay khai nhưng thiếu explanatory note
  topMissingOzCodes: missingOz.slice(0, 50), // 50 mã Oz tần suất cao nhất chưa có note
};

const out = path.join(DATA, 'explanatory-coverage-report.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2));

console.log('=== Explanatory-notes coverage ===');
console.log(`tax.json:  ${report.tax.withNote}/${report.tax.codes8} mã có note (${report.tax.coveragePct}%) · ${report.tax.distinctHeadings} nhóm · ${report.tax.distinctChapters} chương`);
console.log(`oz-gold:   ${report.ozGold.codesWithNote}/${report.ozGold.distinctCodesEvaluated} mã có note (${report.ozGold.codesCoveragePct}%) · weighted ${report.ozGold.weightedCoveragePct}%`);
console.log(`Top chương yếu (Oz khai nhiều, thiếu note): ${weakChapters.slice(0, 5).map((c) => c.chapter).join(', ')}`);
console.log(`→ ghi ${path.relative(path.join(__dirname, '..'), out)}`);
