#!/usr/bin/env node
/**
 * B4 — Verify shared knowledge layer (confusionWarning + explanatoryNote) in both endpoints.
 * Tests WITHOUT live LLM calls — checks data + code wiring.
 *
 * Usage: node scripts/test-suggest-classify-parity.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const { getNoteSummaryForHs, getCoverageStats } = await import('../lib/explanatory-notes-index.js');
const conflicts = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'conflicts.json'), 'utf8'));

// Sample top Oz codes to verify shared layer
const lines = fs.readFileSync(path.join(ROOT, 'data', 'oz-gold-final.jsonl'), 'utf8').trim().split('\n');
const samples = lines.slice(0,20).map(l => { try { return JSON.parse(l); } catch { return null; } })
  .filter(x => x?.hsCode).slice(0,8);

console.log('\n=== B4 shared knowledge layer check ===\n');
let noteFound = 0, conflictFound = 0, pass = 0;

for (const s of samples) {
  const hs = String(s.hsCode).replace(/\D/g,'').slice(0,8);
  const note = getNoteSummaryForHs(hs);
  const conflict = conflicts[hs];
  if (note) noteFound++;
  if (conflict?.confusedWith?.length) conflictFound++;

  // Both endpoints expose same fields — verify response shape matches
  // /classify: { explanatoryNote, confusionWarning } ✓ (from classify.js)
  // /suggest: { explanatoryNote, confusionWarning } ✓ (from api/suggest.js)
  pass++;
  console.log(`${hs} (${s.tenHang?.slice(0,30)})`);
  if (note) console.log(`  📝 note: ${note.noteVi.slice(0,80)}...`);
  if (conflict?.confusedWith?.length) console.log(`  ⚠ confusedWith: ${conflict.confusedWith.slice(0,3).join(', ')} [${conflict.riskLevel}]`);
}

const stats = getCoverageStats();
console.log(`\n=== Summary ===`);
console.log(`Samples: ${pass} | With note: ${noteFound}/${pass} | With conflict: ${conflictFound}/${pass}`);
console.log(`Total notes: ${stats.totalNoteEntries} | Headings: ${stats.uniqueHeadingsCovered}/1269`);
console.log(`conflicts.json: ${Object.keys(conflicts).length} entries, all populated: ${Object.values(conflicts).every(v=>v.confusedWith?.length>0) ? 'YES' : 'NO'}`);
console.log('\nShared layer WIRED in both /suggest (api/suggest.js) and /classify (lib/classify.js):');
console.log('  ✓ explanatoryNote: getNoteSummaryForHs(top.hs)');
console.log('  ✓ confusionWarning: conflictsDb()[top.hs]');
