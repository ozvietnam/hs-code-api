#!/usr/bin/env node
// scripts/ci-check-community-vs-precedents.mjs
// CI check: mỗi file community (legal-customs-*) phải có tất cả records
// trong precedents.json (không mất khi merge PR).
//
// Bug tìm thấy ở PR #293: thiếu 53 records (ref, hsCode) so với baseline.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function extractCommunityKeys(file) {
  try {
    const data = JSON.parse(readFileSync(file, 'utf-8'));
    const records = data.records || [];
    const keys = new Set();
    for (const r of records) {
      const ref = (r.source?.reference || '').split('/')[0];
      const hs = r.hsCode;
      if (ref && hs) keys.add(`${ref}::${hs}`);
    }
    return keys;
  } catch (e) {
    // Bail out instead of silently returning empty Set
    console.error(`❌ Failed to parse ${file.split('/').pop()}: ${e.message}`);
    process.exit(1);
  }
}

function extractPrecedentKeys(precedents) {
  const keys = new Set();
  for (const [hs, recs] of Object.entries(precedents)) {
    if (!Array.isArray(recs)) continue;
    for (const r of recs) {
      const ref = (r.tbTchqNumber || '').split('/')[0];
      if (ref && hs) keys.add(`${ref}::${hs}`);
    }
  }
  return keys;
}

function main() {
  // Load precedents
  const precedentsPath = resolve(ROOT, 'data/precedents.json');
  if (!existsSync(precedentsPath)) {
    console.error('❌ Cannot find data/precedents.json');
    process.exit(1);
  }
  const precedents = JSON.parse(readFileSync(precedentsPath, 'utf-8'));
  const precedentKeys = extractPrecedentKeys(precedents);

  // Find all community files
  const communityDir = resolve(ROOT, 'data/community/tb-tchq');
  const files = readdirSync(communityDir)
    .filter(f => f.startsWith('legal-customs-2026-10-13-goi-'))
    .map(f => resolve(communityDir, f));

  let totalMissing = 0;
  const missingByFile = [];

  for (const file of files) {
    const communityKeys = extractCommunityKeys(file);
    const missing = [...communityKeys].filter(k => !precedentKeys.has(k));
    if (missing.length > 0) {
      totalMissing += missing.length;
      missingByFile.push({ file: file.split('/').pop(), missing });
    }
  }

  if (totalMissing > 0) {
    console.error(`❌ ${totalMissing} records in community files NOT in precedents.json:`);
    for (const { file, missing } of missingByFile) {
      console.error(`  ${file}: ${missing.length} missing`);
      for (const k of missing.slice(0, 3)) {
        console.error(`    - ${k}`);
      }
    }
    process.exit(1);
  }

  console.log(`✅ All ${files.length} community files have all records in precedents.json`);
  process.exit(0);
}

main();
