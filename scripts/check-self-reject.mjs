#!/usr/bin/env node
/**
 * Phát hiện self-reject trong trade-synonyms.json:
 * Entry có avoid[{prefix: "P"}] nhưng candidate.hs = "P..." (8 số bắt đầu bằng P)
 * hoặc candidate.hs là prefix 4/6 số = P.
 * 
 * Chạy: node scripts/check-self-reject.mjs
 * Exit 1 nếu có self-reject.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SYNONYMS = join(ROOT, 'data', 'trade-synonyms.json');

const data = JSON.parse(readFileSync(SYNONYMS, 'utf8'));
const entries = data.entries || [];

const selfReject = [];
for (const e of entries) {
  const avoidMap = new Map((e.avoid || []).map(a => [a.prefix, a.whyVi || '']));
  for (const c of e.candidates || []) {
    const hs = String(c.hs || '');
    for (const [p, why] of avoidMap) {
      if (hs.length === 8 && hs.startsWith(p)) {
        selfReject.push({ entry: e.id, title: e.titleVi || '', avoidPrefix: p, candidate: hs, type: 'starts-with', why });
      } else if ((hs.length === 4 || hs.length === 6) && hs === p) {
        selfReject.push({ entry: e.id, title: e.titleVi || '', avoidPrefix: p, candidate: hs, type: 'exact-prefix', why });
      }
    }
  }
}

if (selfReject.length > 0) {
  console.error(`❌ Found ${selfReject.length} self-reject avoid rule(s):`);
  for (const sr of selfReject) {
    console.error(`  ${sr.entry}: avoid "${sr.avoidPrefix}" but candidate="${sr.candidate}" (${sr.type})`);
    if (sr.why) console.error(`    why: ${sr.why}`);
  }
  console.error('\nSelf-reject = entry tự loại ứng viên đúng của chính nó.');
  process.exit(1);
} else {
  console.log(`✅ PASS: 0 self-reject avoid rules (${entries.length} entries checked)`);
  process.exit(0);
}
