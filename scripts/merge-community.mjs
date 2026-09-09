#!/usr/bin/env node
/**
 * Gộp đóng góp data/community/ vào kho chính (precedents / conflicts).
 *
 * - kind=precedent        → data/precedents.json (giữ contributor + source)
 * - kind=conflict-table   → data/conflicts.json (confusedWith + reasonsVi).
 *                           KHÔNG tự tạo bảng quyết định verified.
 * - kind=correction       → xếp hàng data/community-corrections-queue.jsonl (không tự sửa)
 * - kind=product-example  → xếp hàng data/community-product-queue.jsonl
 *
 * Bỏ qua data/community/examples/ (mẫu, không phải đóng góp thật).
 * Trùng: cùng hsCode + số hiệu TB-TCHQ / source.reference → bỏ qua.
 * Tệp dính bộ lọc riêng tư → từ chối cả tệp, không ghi từng phần.
 *
 *   node scripts/merge-community.mjs [--dry-run] [--include-examples]
 *   node scripts/merge-community.mjs --community-dir DIR --data-dir DIR
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname, relative, sep } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const INCLUDE_EXAMPLES = args.includes('--include-examples');

function argValue(flag) {
  const i = args.indexOf(flag);
  if (i < 0 || i === args.length - 1) return null;
  return args[i + 1];
}

const dataDir = argValue('--data-dir') || join(root, 'data');
const communityDir = argValue('--community-dir') || join(root, 'data', 'community');

const require = createRequire(join(root, 'package.json'));
const { scanObject } = require('./lib/privacy-filter.js');

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else if (name.endsWith('.json')) out.push(full);
  }
  return out;
}

function isExample(file) {
  const rel = relative(communityDir, file);
  const parts = rel.split(sep);
  if (parts.includes('examples')) return true;
  const base = parts[parts.length - 1] || '';
  return base.startsWith('vi-du-');
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, obj) {
  if (DRY) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
}

function appendLog(entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n';
  if (DRY) {
    console.log('[dry-run log]', line.trim());
    return;
  }
  mkdirSync(dataDir, { recursive: true });
  appendFileSync(join(dataDir, 'community-merge-log.jsonl'), line);
}

function appendQueue(filename, entry) {
  const line = JSON.stringify(entry) + '\n';
  if (DRY) return;
  mkdirSync(dataDir, { recursive: true });
  appendFileSync(join(dataDir, filename), line);
}

function yearOf(rec) {
  if (rec?.source?.clearedYear) return Number(rec.source.clearedYear);
  const d = rec?.source?.issuedDate;
  if (d && /^\d{4}/.test(d)) return Number(String(d).slice(0, 4));
  return null;
}

function dedupKey(hs, rec) {
  const ref = String(rec?.source?.reference || rec?.tbTchqNumber || rec?.description || '')
    .toUpperCase()
    .replace(/\s+/g, '');
  return `${hs}::${ref}`;
}

function existingKeys(precedents) {
  const keys = new Set();
  for (const [hs, list] of Object.entries(precedents)) {
    for (const p of Array.isArray(list) ? list : []) {
      keys.add(dedupKey(hs, {
        source: { reference: p.tbTchqNumber },
        description: p.productName,
        tbTchqNumber: p.tbTchqNumber,
      }));
    }
  }
  return keys;
}

function mergePrecedent(precedents, seen, doc, rec, fileRel, stats) {
  const hs = String(rec.hsCode);
  const key = dedupKey(hs, rec);
  if (seen.has(key)) {
    stats.skippedDup += 1;
    return;
  }
  seen.add(key);
  const entry = {
    tbTchqNumber: rec.source?.reference || null,
    productName: rec.description,
    technicalSpec: rec.reasonVi || null,
    year: yearOf(rec),
    outcome: hs,
    sourceFile: `community:${fileRel}`,
    contributor: {
      name: doc.contributor?.name || null,
      github: doc.contributor?.github || null,
    },
    sourceType: rec.source?.type || null,
    girRule: rec.girRule || null,
    confusedWith: rec.confusedWith || [],
  };
  if (!Array.isArray(precedents[hs])) precedents[hs] = [];
  precedents[hs].push(entry);
  stats.precedents += 1;
}

function mergeConflictHints(conflicts, rec, doc, fileRel, stats) {
  const hs = String(rec.hsCode);
  if (hs.length !== 8) {
    stats.skippedShortHs += 1;
    return;
  }
  if (!conflicts[hs]) {
    conflicts[hs] = {
      hsCode: hs,
      riskLevel: 'ORANGE',
      confusedWith: [],
      reasonsVi: [],
      precedents: [],
      sourceFile: `community:${fileRel}`,
    };
  }
  const entry = conflicts[hs];
  const confused = new Set(entry.confusedWith || []);
  for (const c of rec.confusedWith || []) {
    if (c && c !== hs) confused.add(String(c));
  }
  entry.confusedWith = [...confused];
  if (rec.reasonVi && !(entry.reasonsVi || []).includes(rec.reasonVi)) {
    entry.reasonsVi = [...(entry.reasonsVi || []), rec.reasonVi];
  }
  entry.communityContributors = [
    ...new Set([...(entry.communityContributors || []), doc.contributor?.name].filter(Boolean)),
  ];
  stats.conflicts += 1;
}

const precedentsPath = join(dataDir, 'precedents.json');
const conflictsPath = join(dataDir, 'conflicts.json');
const precedents = readJson(precedentsPath, {});
const conflicts = readJson(conflictsPath, {});
const seen = existingKeys(precedents);

const stats = {
  files: 0,
  skippedExample: 0,
  skippedPrivacy: 0,
  skippedDup: 0,
  skippedShortHs: 0,
  precedents: 0,
  conflicts: 0,
  queued: 0,
};

const files = listFiles(communityDir);
for (const full of files) {
  const fileRel = relative(communityDir, full);
  if (isExample(full) && !INCLUDE_EXAMPLES) {
    stats.skippedExample += 1;
    appendLog({ action: 'skip-example', file: fileRel });
    continue;
  }
  let doc;
  try {
    doc = JSON.parse(readFileSync(full, 'utf8'));
  } catch (e) {
    appendLog({ action: 'skip-bad-json', file: fileRel, error: e.message });
    continue;
  }
  const privacyHits = scanObject(doc).filter((h) => h.hard);
  if (privacyHits.length) {
    stats.skippedPrivacy += 1;
    appendLog({
      action: 'skip-privacy',
      file: fileRel,
      hits: privacyHits.map((h) => ({ path: h.path, what: h.what, match: h.match })),
    });
    console.error(`❌ ${fileRel}: dính bộ lọc riêng tư — bỏ cả tệp`);
    continue;
  }
  if (!Array.isArray(doc.records) || !doc.records.length) continue;
  stats.files += 1;

  if (doc.kind === 'precedent') {
    for (const rec of doc.records) mergePrecedent(precedents, seen, doc, rec, fileRel, stats);
  } else if (doc.kind === 'conflict-table') {
    for (const rec of doc.records) mergeConflictHints(conflicts, rec, doc, fileRel, stats);
  } else if (doc.kind === 'correction') {
    appendQueue('community-corrections-queue.jsonl', {
      file: fileRel,
      contributor: doc.contributor,
      records: doc.records,
    });
    stats.queued += doc.records.length;
    appendLog({ action: 'queue-correction', file: fileRel, n: doc.records.length });
  } else if (doc.kind === 'product-example') {
    appendQueue('community-product-queue.jsonl', {
      file: fileRel,
      contributor: doc.contributor,
      records: doc.records,
    });
    stats.queued += doc.records.length;
    appendLog({ action: 'queue-product', file: fileRel, n: doc.records.length });
  } else {
    appendLog({ action: 'skip-unknown-kind', file: fileRel, kind: doc.kind });
  }
}

if (stats.precedents) writeJson(precedentsPath, precedents);
if (stats.conflicts) writeJson(conflictsPath, conflicts);

appendLog({ action: 'summary', stats, dryRun: DRY });

console.log(DRY ? '[dry-run] không ghi kho chính.' : 'Đã ghi kho chính (nếu có bản ghi mới).');
console.log(JSON.stringify(stats, null, 2));
process.exit(stats.skippedPrivacy ? 1 : 0);
