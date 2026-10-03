#!/usr/bin/env node
/**
 * Extract Vietnamese phrases from oz-gold product names and add to detect arrays.
 * 
 * For zero-resolution groups: the detect arrays have English WCO keywords but
 * real Vietnamese customs declarations use Vietnamese product names. This script
 * extracts those Vietnamese names from oz-gold records and adds them to detect.
 * 
 * Approach:
 * 1. For each oz-gold record in a heading, check if its tenHang resolves
 *    to an INSUFFICIENT state (missing facts) — meaning the table CANNOT
 *    determine the HS from the name alone (expected for complex products)
 * 2. If INSUFFICIENT, extract the product name as-is and add to the missing
 *    attribute's detect phrases — the NAME ITSELF is what users would type
 * 3. Also extract compound phrases from tenHang by keeping the full product name
 * 
 * Run: node scripts/extract-vietnamese-detect.js <heading> [heading...]
 */

const fs = require('fs');
const path = require('path');
const DT = require('../lib/decision-tables.js');

const OZ_PATH = 'data/oz-gold-final.jsonl';

function loadOzGold() {
  const lines = fs.readFileSync(OZ_PATH, 'utf8').trim().split('\n');
  const byGroup = {};
  for (const line of lines) {
    try {
      const r = JSON.parse(line);
      const g = r.hsCode.slice(0, 4);
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push(r);
    } catch (e) {}
  }
  return byGroup;
}

function hasDiacritics(s) {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(s);
}

function saveTable(table, heading) {
  const filePath = `data/decision-tables/${heading}.json`;
  fs.writeFileSync(filePath, JSON.stringify(table, null, 2), 'utf8');
  DT._reset();
}

async function main(headings) {
  const byGroup = loadOzGold();

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

    // Deduplicate by tenHang
    const seen = new Set();
    const unique = items.filter(r => {
      const key = r.tenHang || '';
      if (seen.has(key)) return false;
      seen.add(key);
      return key.length >= 3;
    });

    console.log(`[${heading}] ${items.length} oz-gold entries, ${unique.length} unique names`);
    
    let enrichedCount = 0;
    const enrichments = [];

    for (const record of unique) {
      const text = record.tenHang;
      if (!text || text.length < 3) continue;

      const result = DT.resolveHeading(heading, { text });
      
      // If INSUFFICIENT — table needs facts the name doesn't provide
      // Add the name as a phrase for the FIRST missing attribute
      // This captures what users ACTUALLY type for this product
      if (result.status === 'INSUFFICIENT' && result.missingFacts?.length > 0) {
        const firstMissing = result.missingFacts[0];
        const attr = firstMissing.attribute;
        const inp = table.inputs.find(i => i.attribute === attr);
        if (!inp || !inp.detect) continue;

        // Check if this phrase is already in detect for any value
        const alreadyHas = Object.values(inp.detect).flat().some(p => 
          p.toLowerCase() === text.toLowerCase() ||
          p.toLowerCase().includes(text.toLowerCase()) ||
          text.toLowerCase().includes(p.toLowerCase())
        );
        if (alreadyHas) continue;

        // For INSUFFICIENT, we can't determine which value — the name
        // is a generic product name. Add it to the most common/important value.
        // Strategy: add to the value that has the most existing phrases
        // OR add as a generic phrase to the 'other' value if it exists
        const domain = inp.domain || [];
        let targetValue = null;
        
        // Find 'other' or 'general' value
        const otherVal = domain.find(v => 
          v.includes('other') || v.includes('general') || v.includes('nec') || v.includes('misc')
        );
        
        // Otherwise find value with most phrases
        if (!otherVal) {
          let maxPhrases = -1;
          for (const [val, phrases] of Object.entries(inp.detect || {})) {
            if (phrases.length > maxPhrases) {
              maxPhrases = phrases.length;
              targetValue = val;
            }
          }
        } else {
          targetValue = otherVal;
        }

        if (!targetValue || !inp.detect[targetValue]) continue;

        // Normalize the phrase
        const phrase = text.trim();
        if (phrase.length < 3) continue;

        // Avoid too long phrases (> 30 chars) as detect phrases
        if (phrase.length > 30) continue;

        // Add to detect
        if (!inp.detect[targetValue].includes(phrase)) {
          inp.detect[targetValue].push(phrase);
          enrichments.push({ attr, value: targetValue, phrase });
          enrichedCount++;
        }
      }
    }

    if (enrichments.length > 0) {
      saveTable(table, heading);
      console.log(`[${heading}] Saved. ${enrichedCount} phrases added.`);
      enrichments.slice(0, 5).forEach(e => {
        console.log(`  + ${e.attr}=${e.value}: "${e.phrase}"`);
      });
    } else {
      console.log(`[${heading}] No new phrases found.`);
    }
  }
}

const headings = process.argv.slice(2);
if (headings.length === 0) {
  console.log('Usage: node scripts/extract-vietnamese-detect.js <heading> [heading...]');
  console.log('Example: node scripts/extract-vietnamese-detect.js 8541 8536 8481 8208');
  process.exit(1);
}

main(headings).catch(e => { console.error(e); process.exit(1); });
