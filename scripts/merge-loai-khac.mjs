#!/usr/bin/env node
/**
 * merge-loai-khac.mjs
 *
 * Gộp các file data/loai-khac/ch*.json thành 2 file cuối:
 *
 *   data/loai-khac-enriched.json  — full data, notes dedup (cho scripts/admin)
 *   data/loai-khac-index.json     — compact index (cho API runtime: suggest/describe)
 *
 * Usage:
 *   node scripts/merge-loai-khac.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT    = path.join(__dirname, '..');
const LK_DIR  = path.join(ROOT, 'data', 'loai-khac');
const OUT_FULL = path.join(ROOT, 'data', 'loai-khac-enriched.json');
const OUT_IDX  = path.join(ROOT, 'data', 'loai-khac-index.json');

function load(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function save(p, data) {
  fs.writeFileSync(`${p}.tmp`, JSON.stringify(data), 'utf8');
  fs.renameSync(`${p}.tmp`, p);
}

// Load all chapter files
const files = fs.readdirSync(LK_DIR).filter(f => /^ch\d+\.json$/.test(f)).sort();
const allRecords = {};
for (const f of files) {
  const data = load(path.join(LK_DIR, f));
  Object.assign(allRecords, data);
}
console.log(`Loaded ${Object.keys(allRecords).length} records from ${files.length} chapter files`);

// --- Build full enriched (dedup chapter + heading notes) ---
const chapterNotes = {};
const headingNotes = {};
const codesFull    = {};

for (const [hs, rec] of Object.entries(allRecords)) {
  if (rec.chapterNote && !chapterNotes[rec.chapter]) {
    chapterNotes[rec.chapter] = rec.chapterNote;
  }
  if (rec.headingNote && !headingNotes[rec.heading]) {
    headingNotes[rec.heading] = rec.headingNote;
  }
  // Store record without inlined notes (use lookups instead)
  const { chapterNote, headingNote, ...core } = rec;
  codesFull[hs] = core;
}

const enriched = {
  meta: {
    generated: new Date().toISOString().slice(0, 10),
    total: Object.keys(codesFull).length,
    highRisk: Object.values(codesFull).filter(v => v.riskLevel === 'HIGH').length,
    mediumRisk: Object.values(codesFull).filter(v => v.riskLevel === 'MEDIUM').length,
  },
  chapters: chapterNotes,
  headings: headingNotes,
  codes: codesFull,
};

save(OUT_FULL, enriched);
const fullSize = fs.statSync(OUT_FULL).size;
console.log(`Wrote ${OUT_FULL}  (${(fullSize / 1e6).toFixed(1)} MB)`);

// --- Build compact index for API (suggest/describe) ---
const index = {};
for (const [hs, rec] of Object.entries(codesFull)) {
  index[hs] = {
    r: rec.riskLevel,     // riskLevel
    g: rec.dutyGap,       // dutyGap
    s: rec.specificSiblings.map(sib => ({
      h: sib.hs,
      v: sib.vn,
      t: sib.tt,
    })),
    // AI fields (filled later per-chapter runs with --ai)
    ...(rec.exclusionNote ? { en: rec.exclusionNote } : {}),
    ...(rec.auditRisk     ? { ar: rec.auditRisk }     : {}),
  };
}

save(OUT_IDX, index);
const idxSize = fs.statSync(OUT_IDX).size;
console.log(`Wrote ${OUT_IDX}  (${(idxSize / 1e6).toFixed(1)} MB)`);

// Summary by risk
const byRisk = { HIGH: 0, MEDIUM: 0, LOW: 0 };
for (const v of Object.values(index)) byRisk[v.r] = (byRisk[v.r] || 0) + 1;
console.log(`\nRisk breakdown: HIGH=${byRisk.HIGH} | MEDIUM=${byRisk.MEDIUM} | LOW=${byRisk.LOW}`);
console.log(`Mã không có sibling: ${Object.values(index).filter(v => v.s.length === 0).length}`);
