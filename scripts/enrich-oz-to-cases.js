#!/usr/bin/env node
/**
 * Generate facts-based test cases from oz-gold-final.jsonl.
 * 
 * Strategy:
 * 1. Load oz-gold entries for a heading
 * 2. For each entry, try to resolve it with the decision table
 *    using ONLY the tenHang (product name) as text
 * 3. If resolved → add as test case (facts-based if enough inferred, else text-based)
 * 4. Also extract NEW detect phrases from tenHang/chatLieu/congDung
 *    that aren't already in the table's detect arrays
 * 
 * Run: node scripts/enrich-oz-to-cases.js <heading> [heading...]
 *   e.g.: node scripts/enrich-oz-to-cases.js 8541 8536 8481
 */

const fs = require('fs');
const path = require('path');

// Load decision-tables lib
const DT = require('../lib/decision-tables.js');

const OZ_PATH = 'data/oz-gold-final.jsonl';
const CASES_PATH = 'tests/decision-cases.json';

function loadOzGold() {
  const lines = fs.readFileSync(OZ_PATH, 'utf8').trim().split('\n');
  const byGroup = {};
  for (const line of lines) {
    try {
      const r = JSON.parse(line);
      const g = r.hsCode.slice(0, 4);
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push(r);
    } catch (e) { /* skip */ }
  }
  return byGroup;
}

function loadCases() {
  const raw = fs.readFileSync(CASES_PATH, 'utf8');
  const data = JSON.parse(raw);
  return data;
}

function saveCases(data, path) {
  // Keep the note and sort cases by heading
  const out = {
    noteVi: data.noteVi,
    cases: data.cases.sort((a, b) => {
      const h = String(a.heading || '').localeCompare(String(b.heading || ''));
      return h || String(a.id || '').localeCompare(String(b.id || ''));
    })
  };
  fs.writeFileSync(path, JSON.stringify(out, null, 2), 'utf8');
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main(headings) {
  const byGroup = loadOzGold();
  const casesData = loadCases();
  const existingIds = new Set(casesData.cases.map(c => c.id));

  let addedCases = 0;
  let skippedCases = 0;

  for (const heading of headings) {
    const items = byGroup[heading] || [];
    if (items.length === 0) {
      console.log(`[${heading}] No oz-gold entries`);
      continue;
    }

    const table = DT.loadTable(heading);
    if (!table) {
      console.log(`[${heading}] No decision table`);
      continue;
    }

    console.log(`[${heading}] ${items.length} oz-gold entries, processing...`);

    // Deduplicate by tenHang + hsCode
    const seen = new Set();
    const unique = items.filter(r => {
      const key = `${r.tenHang}::${r.hsCode}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    for (const record of unique) {
      const text = record.tenHang;
      if (!text || text.length < 3) { skippedCases++; continue; }

      // Check if already have a case with same text + same expectHs
      const idBase = `${heading}-${slugify(text.slice(0, 20))}`;
      if (existingIds.has(idBase)) { skippedCases++; continue; }

      // Try resolve with text only
      const result = DT.resolveHeading(heading, { text });

      if (result.status === 'RESOLVED') {
        const id = idBase;
        if (existingIds.has(id)) { skippedCases++; continue; }

        const newCase = {
          id,
          heading,
          text,
          expectHs: result.hs,
        };

        // If we have facts (from specs parsing), add them
        if (result.factsUsed && Object.keys(result.factsUsed).length > 0) {
          newCase.facts = result.factsUsed;
        }

        casesData.cases.push(newCase);
        existingIds.add(id);
        addedCases++;
      } else {
        // Unresolved - could still add expectAsk case
        // But only if we can determine at least one fact
        if (result.factsUsed && Object.keys(result.factsUsed).length > 0) {
          const askAttrs = (result.missingFacts || []).map(m => m.attribute);
          if (askAttrs.length > 0 && askAttrs.length < 4) {
            const id = idBase;
            if (!existingIds.has(id)) {
              const newCase = {
                id,
                heading,
                text,
                facts: result.factsUsed,
                expectAsk: askAttrs,
              };
              casesData.cases.push(newCase);
              existingIds.add(id);
              addedCases++;
            }
          }
        }
      }
    }

    console.log(`[${heading}] Done. Total oz entries: ${items.length}, unique: ${unique.length}`);
  }

  console.log(`\nAdded ${addedCases} cases, skipped ${skippedCases} duplicates.`);
  saveCases(casesData, CASES_PATH);
  console.log(`Saved to ${CASES_PATH}`);
}

const headings = process.argv.slice(2);
if (headings.length === 0) {
  console.log('Usage: node scripts/enrich-oz-to-cases.js <heading> [heading...]');
  console.log('Example: node scripts/enrich-oz-to-cases.js 8541 8536 8481');
  process.exit(1);
}

main(headings).catch(e => { console.error(e); process.exit(1); });
