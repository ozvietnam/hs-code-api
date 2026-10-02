#!/usr/bin/env node
/**
 * Enrich detect arrays for zero-resolution groups using oz-gold entries.
 * 
 * For each attribute in zero-resolution groups, extract NEW Vietnamese
 * phrases from oz-gold tenHang/chatLieu/congDung fields that contain
 * the attribute's domain values.
 * 
 * Strategy:
 * 1. Find oz-gold entries where the tenHang/description contains a domain value keyword
 * 2. Extract the phrase around the keyword
 * 3. Add to the detect array for that attribute
 * 
 * Run: node scripts/enrich-detect-from-oz.js <heading> <attribute> [attribute...]
 */

const fs = require('fs');
const path = require('path');

const DT = require('../lib/decision-tables.js');
const OZ_PATH = 'data/oz-gold-final.jsonl';
const ATTR_PATH = 'data/attributes.json';

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

function loadAttrs() {
  return JSON.parse(fs.readFileSync(ATTR_PATH, 'utf8')).attributes || {};
}

function saveTable(table, heading) {
  const filePath = `data/decision-tables/${heading}.json`;
  fs.writeFileSync(filePath, JSON.stringify(table, null, 2), 'utf8');
  // Invalidate cache
  DT._reset();
}

function findPhrases(text, keyword) {
  if (!text) return [];
  const normalized = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const kw = keyword.toLowerCase();
  const idx = normalized.indexOf(kw);
  if (idx === -1) return [];
  
  // Extract up to 3 words before and after the keyword
  const words = text.split(/\s+/);
  let wordIdx = 0;
  let charCount = 0;
  for (let i = 0; i < words.length; i++) {
    const wNorm = words[i].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (wNorm.includes(kw) || kw.includes(wNorm)) {
      wordIdx = i;
      break;
    }
    charCount += words[i].length + 1;
  }
  
  const start = Math.max(0, wordIdx - 3);
  const end = Math.min(words.length, wordIdx + 4);
  const phrase = words.slice(start, end).join(' ').toLowerCase();
  return [phrase];
}

async function main(args) {
  if (args.length < 2) {
    console.log('Usage: node scripts/enrich-detect-from-oz.js <heading> <attribute> [attribute...]');
    console.log('Example: node scripts/enrich-detect-from-oz.js 8536 currentRating specialApp');
    process.exit(1);
  }

  const [heading, ...targetAttrs] = args;
  const byGroup = loadOzGold();
  const attrs = loadAttrs();
  const table = DT.loadTable(heading);
  
  if (!table) {
    console.log(`No table for heading ${heading}`);
    process.exit(1);
  }

  const items = byGroup[heading] || [];
  console.log(`[${heading}] ${items.length} oz-gold entries`);
  console.log(`Target attributes: ${targetAttrs.join(', ')}`);

  const changes = [];

  for (const attrName of targetAttrs) {
    const inp = table.inputs.find(i => i.attribute === attrName);
    if (!inp) {
      console.log(`[${attrName}] Not found in table inputs`);
      continue;
    }

    const attrDef = attrs[attrName] || {};
    const domain = inp.domain || attrDef.domain || [];
    console.log(`[${attrName}] domain (${domain.length} values): ${domain.join(', ')}`);

    // For each domain value, find phrases in oz-gold that contain that value's keywords
    const existingPhrases = new Set();
    for (const [val, phrases] of Object.entries(inp.detect || {})) {
      for (const p of phrases) {
        existingPhrases.add(p.toLowerCase().trim());
      }
    }

    for (const value of domain) {
      // Get keywords for this value from the attribute definition
      const valDef = attrDef.values ? attrDef.values[value] : null;
      const keywords = valDef ? valDef.keywords || [valDef.labelVi || value] : [value];
      
      // Also use value itself
      keywords.push(value.replace(/_/g, ' '));
      
      const newPhrases = new Set();
      
      for (const item of items) {
        const text = [item.tenHang, item.chatLieu, item.congDung, item.sampleDesc]
          .filter(Boolean).join(' ');
        
        for (const kw of keywords) {
          const found = findPhrases(text, kw);
          for (const phrase of found) {
            if (phrase.length >= 3 && !existingPhrases.has(phrase.toLowerCase())) {
              newPhrases.add(phrase);
            }
          }
        }
      }

      if (newPhrases.size > 0) {
        const phraseList = [...newPhrases].slice(0, 10); // cap at 10 per value
        console.log(`[${attrName}=${value}] ${newPhrases.size} new phrases, adding ${phraseList.length}: ${phraseList.slice(0,3).join(', ')}`);
        changes.push({ attrName, value, phrases: phraseList });
        
        // Add to detect array
        if (!inp.detect) inp.detect = {};
        if (!inp.detect[value]) inp.detect[value] = [];
        for (const phrase of phraseList) {
          if (!inp.detect[value].includes(phrase)) {
            inp.detect[value].push(phrase);
          }
        }
      }
    }
  }

  if (changes.length > 0) {
    saveTable(table, heading);
    console.log(`\nSaved enriched table to data/decision-tables/${heading}.json`);
    console.log(`Total changes: ${changes.length} attribute-value pairs enriched`);
  } else {
    console.log('\nNo new phrases found.');
  }
}

main(process.argv.slice(2)).catch(e => { console.error(e); process.exit(1); });
