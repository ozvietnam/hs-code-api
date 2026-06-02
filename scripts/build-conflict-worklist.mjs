#!/usr/bin/env node
// A2 (#44) — DETERMINISTIC: dựng worklist làm đầy conflicts.json.
// Không cần LLM. Với mỗi entry conflicts (hiện 57, confusedWith/reasonsVi rỗng):
//   - SEED confusedWith từ tín hiệu THẬT (không bịa):
//       (a) feedback.jsonl DIRECTOR_HS_OVERRIDE: hsCodeAtTime ↔ correctedHsCode
//       (b) precedents trong entry: declaredHsCode ≠ determinedHsCode
//   - kèm ngữ cảnh nhóm (loai_tru/khong_bao_gom + mã anh em) cho bước LLM viết reasonsVi.
//   - xếp hạng theo tần suất khai Oz.
// Ghi: data/conflict-worklist.json
// Chạy: npm run data:build-conflict-worklist

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data');

const conflicts = require('../data/conflicts.json');
const tax = require('../data/tax.json');
const headingNotes = require('../data/chu-giai-heading.json');

const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const nz = (s) => String(s || '').replace(/\D/g, '');

// (a) Cặp override THẬT từ feedback.jsonl → map hsCode → Set(confusedWith).
function overridePairs() {
  const f = path.join(DATA, 'feedback.jsonl');
  const map = new Map();
  if (!fs.existsSync(f)) return map;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (r.feedbackType !== 'DIRECTOR_HS_OVERRIDE') continue;
    const a = nz(r.hsCodeAtTime), b = nz(r.correctedHsCode);
    if (a.length === 8 && b.length === 8 && a !== b) {
      (map.get(a) || map.set(a, new Set()).get(a)).add(b);
      (map.get(b) || map.set(b, new Set()).get(b)).add(a);
    }
  }
  return map;
}

// Oz weight theo mã 8-số.
function ozWeight() {
  const f = path.join(DATA, 'oz-gold-final.jsonl');
  const w = new Map();
  if (!fs.existsSync(f)) return w;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    const hs = nz(r.hsCode).slice(0, 8);
    if (hs.length === 8) w.set(hs, (w.get(hs) || 0) + (Number(r.ozCount) || 1));
  }
  return w;
}

const ovr = overridePairs();
const ozW = ozWeight();
const items = [];

for (const [code, entry] of Object.entries(conflicts)) {
  const hs = nz(code).slice(0, 8);
  const h4 = hs.slice(0, 4);
  const H = headingNotes[h4] || {};

  // SEED confusedWith deterministic (chỉ tín hiệu thật).
  const seed = new Set([...(entry.confusedWith || []).map(nz)]);
  for (const c of ovr.get(hs) || []) seed.add(c);
  for (const p of entry.precedents || []) {
    const dec = nz(p.declaredHsCode), det = nz(p.determinedHsCode);
    if (dec.length === 8 && det.length === 8 && dec !== det) {
      seed.add(hs === det ? dec : det);
    }
  }
  seed.delete(hs);

  const siblings = Object.keys(tax).filter((k) => k.length === 8 && k.startsWith(h4) && k !== hs)
    .slice(0, 10).map((k) => ({ hs: k, vn: clip(tax[k].vn, 60) }));

  items.push({
    hsCode: hs,
    riskLevel: entry.riskLevel || 'ORANGE',
    ozWeight: ozW.get(hs) || 0,
    seededConfusedWith: [...seed],          // confusedWith suy ra THẬT (có thể rỗng → cần LLM/đào)
    hasReasons: !!(entry.reasonsVi && entry.reasonsVi.length),
    precedentCount: (entry.precedents || []).length,
    context: {
      nameVi: clip(tax[hs]?.vn, 80),
      khong_bao_gom: clip(H.khong_bao_gom, 250),
      loai_tru: clip(H.loai_tru, 250),
      siblings,
    },
  });
}

items.sort((a, b) => (b.seededConfusedWith.length - a.seededConfusedWith.length) || (b.ozWeight - a.ozWeight));

// Cặp nhầm THẬT từ feedback chưa có trong conflicts.json → đề xuất thêm entry mới.
const existing = new Set(Object.keys(conflicts).map((k) => nz(k).slice(0, 8)));
const newPairs = [];
const seenPair = new Set();
for (const [hs, partners] of ovr) {
  for (const p of partners) {
    const key = [hs, p].sort().join('-');
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    if (!existing.has(hs) || !existing.has(p)) {
      newPairs.push({ pair: [hs, p], inConflicts: existing.has(hs) && existing.has(p), ozWeight: (ozW.get(hs) || 0) + (ozW.get(p) || 0) });
    }
  }
}

const out = path.join(DATA, 'conflict-worklist.json');
fs.writeFileSync(out, JSON.stringify({
  generatedAt: new Date().toISOString().slice(0, 10),
  note: 'A2 #44 — làm đầy conflicts.json. seededConfusedWith từ feedback override + precedent mismatch (thật). reasonsVi cần LLM (enrich-conflicts.mjs). newConfusionPairs = cặp thật từ feedback chưa có entry.',
  totalEntries: items.length,
  withSeededPairs: items.filter((i) => i.seededConfusedWith.length).length,
  needingReasons: items.filter((i) => !i.hasReasons).length,
  newConfusionPairs: newPairs,
  items,
}, null, 2));

console.log('=== Conflict worklist (A2 #44) ===');
console.log(`Entry: ${items.length} | có cặp confusedWith suy ra thật: ${items.filter((i) => i.seededConfusedWith.length).length} | thiếu reasonsVi: ${items.filter((i) => !i.hasReasons).length}`);
console.log(`→ ghi ${path.relative(path.join(__dirname, '..'), out)}`);
