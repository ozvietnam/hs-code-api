#!/usr/bin/env node
/**
 * audit-legal-docs.mjs — Quality audit for data/legal-docs.json
 *
 * Issues detected:
 *  1. REPLACED entries whose replacedBy target is not in legal-docs.json (dangling)
 *  2. EXPIRED entries without validUntil field
 *  3. Duplicate codes (same doc stored under multiple keys)
 *  4. Codes differing only by year suffix (e.g. 691/QD-BCT vs 691/QD-BCT-2023)
 *  5. ACTIVE anti-dumping/safeguard docs potentially past their expiry
 *
 * Run: node scripts/audit-legal-docs.mjs
 * Output: console summary + writes findings/YYYY-MM-DD-legal-docs-audit.md
 */
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LEGAL_DOCS_PATH = join(ROOT, 'data', 'legal-docs.json');

const ld = JSON.parse(fs.readFileSync(LEGAL_DOCS_PATH, 'utf8'));
const keys = Object.keys(ld);

let issues = 0;

function log(category, severity, code, msg) {
  console.log(`[${severity}] ${category} | ${code} | ${msg}`);
  issues++;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

console.log(`\n== Legal Docs Audit — ${today.toISOString().slice(0, 10)} ==`);
console.log(`Total entries: ${keys.length}\n`);

// ── 1. REPLACED entries with dangling replacedBy ───────────────────────────
console.log('== 1. REPLACED with dangling replacedBy ==');
const replaced = keys.filter(k => ld[k].status === 'REPLACED');
replaced.forEach(k => {
  const d = ld[k];
  if (!d.replacedBy) {
    log('DANGLING', 'HIGH', k, 'REPLACED but no replacedBy field');
  } else if (!keys.includes(d.replacedBy)) {
    log('DANGLING', 'HIGH', k, `replacedBy="${d.replacedBy}" not in legal-docs.json`);
  }
});

// ── 2. EXPIRED without validUntil ─────────────────────────────────────────
console.log('\n== 2. EXPIRED without validUntil ==');
const expired = keys.filter(k => ld[k].status === 'EXPIRED');
expired.forEach(k => {
  const d = ld[k];
  if (!d.validUntil) {
    log('EXPIRED_NO_VALID_UNTIL', 'MEDIUM', k,
      `effectiveDate=${d.effectiveDate} | title: ${d.titleVi?.slice(0, 50)}`);
  }
});

// ── 3. Duplicate codes (same doc stored under multiple keys) ───────────────
console.log('\n== 3. Duplicate codes (same doc under multiple keys) ==');
// Group by titleVi + issuer + effectiveDate
const bySig = {};
keys.forEach(k => {
  const d = ld[k];
  const sig = `${d.titleVi}|${d.issuer}|${d.effectiveDate}`;
  if (!bySig[sig]) bySig[sig] = [];
  bySig[sig].push(k);
});
Object.entries(bySig).forEach(([sig, ks]) => {
  if (ks.length > 1) {
    const title = sig.split('|')[0];
    log('DUPLICATE', 'LOW', ks.join(', '), title.slice(0, 60));
  }
});

// ── 4. Codes differing only by year suffix ────────────────────────────────
console.log('\n== 4. Year-suffix variants (potential duplicates) ==');
for (let i = 0; i < keys.length; i++) {
  for (let j = i + 1; j < keys.length; j++) {
    const a = keys[i], b = keys[j];
    const aBase = a.replace(/-\d{4}$/, '');
    const bBase = b.replace(/-\d{4}$/, '');
    if (aBase === bBase && a !== b) {
      const da = ld[a], db = ld[b];
      if (da.titleVi === db.titleVi && da.effectiveDate === db.effectiveDate) {
        log('YEAR_VARIANT', 'INFO', `${a} / ${b}`,
          `${da.status} / ${db.status} | eff: ${da.effectiveDate}`);
      }
    }
  }
}

// ── 5. ACTIVE anti-dumping docs with dates in the past ───────────────────
console.log('\n== 5. ACTIVE anti-dumping/safeguard past effectiveDate ==');
const activeAnti = keys.filter(k =>
  ld[k].status === 'ACTIVE' &&
  ld[k].effectiveDate &&
  new Date(ld[k].effectiveDate) < today
);
activeAnti.forEach(k => {
  const d = ld[k];
  const isTrade = d.titleVi?.toLowerCase().includes('bán phá giá') ||
    d.titleVi?.toLowerCase().includes('tự vệ') ||
    d.titleVi?.toLowerCase().includes('chống lẩn');
  if (isTrade) {
    log('PAST_ACTIVE', 'LOW', k,
      `${d.effectiveDate} | ${d.titleVi?.slice(0, 50)}`);
  }
});

// ── 6. Missing titleVi ───────────────────────────────────────────────────
console.log('\n== 6. Missing or short titleVi ==');
keys.forEach(k => {
  const d = ld[k];
  if (!d.titleVi || d.titleVi.length < 10) {
    log('MISSING_TITLE', 'MEDIUM', k, JSON.stringify(d.titleVi));
  }
});

// ── 7. Codes with unusual characters ─────────────────────────────────────
console.log('\n== 7. Codes with unusual characters ==');
keys.forEach(k => {
  if (k.includes('_') || k.includes(' ') || k.includes('NGÀY') || k.includes('I_')) {
    log('WEIRD_CODE', 'LOW', k, 'code contains unusual characters');
  }
});

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\n== Summary: ${issues} issue(s) found ==`);
if (issues === 0) {
  console.log('No quality issues found.');
} else {
  console.log('Run with --fix to generate findings file.');
}

// ── Write findings file ───────────────────────────────────────────────────
const flag = process.argv.includes('--fix');
if (flag && issues > 0) {
  const date = today.toISOString().slice(0, 10);
  const findingsPath = join(ROOT, 'findings', `${date}-legal-docs-audit.md`);
  const lines = [
    `# Legal Docs Quality Audit — ${date}`,
    '',
    `Found **${issues} issue(s)** in data/legal-docs.json (${keys.length} entries).`,
    '',
    '## Issues',
    '',
    '| # | Category | Severity | Codes | Note |',
    '|---|---|---|---|---|',
  ];
  let n = 1;

  // REPLACED dangling
  replaced.forEach(k => {
    const d = ld[k];
    if (!d.replacedBy || !keys.includes(d.replacedBy)) {
      lines.push(`| ${n++} | DANGLING_REPLACED | HIGH | ${k} → ${d.replacedBy || '(none)'} | ${d.titleVi?.slice(0, 40)} |`);
    }
  });

  // EXPIRED no validUntil
  expired.forEach(k => {
    const d = ld[k];
    if (!d.validUntil) {
      lines.push(`| ${n++} | EXPIRED_NO_VALID_UNTIL | MEDIUM | ${k} | eff: ${d.effectiveDate} |`);
    }
  });

  // WEIRD_CODE
  keys.forEach(k => {
    if (k.includes('_') || k.includes(' ') || k.includes('NGÀY') || k.includes('I_')) {
      lines.push(`| ${n++} | WEIRD_CODE | LOW | ${k} | unusual characters in code |`);
    }
  });

  lines.push('');
  lines.push('## Actions');
  lines.push('');
  lines.push('1. **DANGLING_REPLACED**: Verify target documents exist; add them or remove replacedBy — dev dữ liệu');
  lines.push('2. **EXPIRED_NO_VALID_UNTIL**: Add validUntil date from original BCT decision — dev dữ liệu');
  lines.push('3. **WEIRD_CODE**: Normalize code keys (remove spaces/NGÀY/I_) — dev dữ liệu');
  lines.push('');
  lines.push('Generated by scripts/audit-legal-docs.mjs');

  fs.writeFileSync(findingsPath, lines.join('\n') + '\n');
  console.log(`\nFindings written to ${findingsPath}`);
}
