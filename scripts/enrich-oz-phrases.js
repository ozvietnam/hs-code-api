#!/usr/bin/env node
/**
 * Bulk-enrich detect phrases for multiple tables using oz-gold samples.
 * 
 * For each (heading, attribute, attribute_value) tuple:
 *   - Find oz samples whose tenHang/similar text contains phrases related to that value
 *   - Extract the phrase and add to inp.detect[value]
 *
 * Run: node scripts/enrich-oz-phrases.js <table1> <attr1> <table2> <attr2> ...
 *   or: node scripts/enrich-oz-phrases.js --all
 */

const fs = require('fs');

const OZ_PATH = 'data/oz-gold-final.jsonl';
const DT_PATH = 'data/decision-tables';
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

function loadTable(heading) {
  const p = `${DT_PATH}/${heading}.json`;
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveTable(table, heading) {
  const p = `${DT_PATH}/${heading}.json`;
  fs.writeFileSync(p, JSON.stringify(table, null, 2), 'utf8');
}

function normalize(text) {
  if (!text) return '';
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ');
}

function extractPhrases(text, keyword, maxWords = 4) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const norm = normalize(text);
  const kw = normalize(keyword);
  
  // Find keyword position in normalized text
  let kwIdx = -1;
  const tokens = norm.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].includes(kw) || kw.includes(tokens[i])) {
      kwIdx = i;
      break;
    }
  }
  if (kwIdx === -1) return [];
  
  const start = Math.max(0, kwIdx - 3);
  const end = Math.min(words.length, kwIdx + 4);
  return [words.slice(start, end).join(' ')];
}

function buildDetectPhrasesForValue(value, ozSamples, existingPhrases) {
  const phrases = new Set();
  const kw = normalize(value.replace(/_/g, ' '));
  
  // Also build keyword list from the value
  const keywords = [value.replace(/_/g, ' ')];
  
  for (const sample of ozSamples) {
    const text = [sample.tenHang, sample.chatLieu, sample.congDung, sample.sampleDesc]
      .filter(Boolean).join(' ');
    
    for (const keyword of keywords) {
      const found = extractPhrases(text, keyword);
      for (const phrase of found) {
        if (phrase.length >= 3 && !existingPhrases.has(phrase.toLowerCase())) {
          phrases.add(phrase.toLowerCase());
        }
      }
    }
  }
  
  return [...phrases].slice(0, 8);
}

// ─── Strategy: phrase-to-value mapping based on oz sample HS codes ────────────
// For each table, we know which HS codes correspond to which attribute values.
// Use oz sample's hsCode to determine which attribute value it maps to.

const TABLE_CONFIGS = {
  // heading: { attr: attributeName, hsCodeToValue: {prefix: attrValue, ...} }
  // For 8518: headphone_headset + specCode=20 → 85183020, headphone_headset + specCode=10 → 85183010
  '8518': {
    attr: 'deviceKind',
    hsCodeToValue: {
      '8518': 'headphone_headset',
    }
  },
  '8543': {
    attr: 'deviceKind',
    hsCodeToValue: {
      '8543': 'other_electrical_device',
    }
  },
  '8542': {
    attr: 'goodsKind',
    hsCodeToValue: {
      '8542': 'ic',
    }
  },
  '9031': {
    attr: 'itemKind',
    hsCodeToValue: {
      '9031': 'equipment',
    }
  },
};

// For tables where we need measKind mapping, use phrase patterns
const PHRASE_PATTERNS = {
  '9031': {
    measKind: {
      'semiconductor': ['chất bán dẫn', 'bán dẫn', 'wafer', 'silicon'],
      'opticalSurface': ['quang', 'quang điện', 'cảm biến quang', 'sensor quang'],
      'opticalAoi': ['kiểm tra bề mặt', 'aoi', 'vision', 'camera'],
      'opticalOther': ['quang', 'quang điện'],
      'balancing': ['cân bằng', 'balancing'],
      'testBench': ['bàn thử', 'test bench', 'băng thử'],
      'cable': ['cáp', 'cable', 'dây cáp'],
      'otherEquipment': ['thiết bị', 'máy'],
    }
  }
};

async function main(args) {
  const byGroup = loadOzGold();
  const attrs = loadAttrs();
  
  // Determine which tables to process
  let tablesToProcess = [];
  
  if (args.includes('--all')) {
    // Process all tables from PHRASE_PATTERNS
    tablesToProcess = Object.keys(PHRASE_PATTERNS).map(h => ({ heading: h, patterns: PHRASE_PATTERNS[h] }));
  } else if (args.includes('--config')) {
    tablesToProcess = Object.keys(TABLE_CONFIGS).map(h => ({ heading: h, config: TABLE_CONFIGS[h] }));
  } else {
    // Parse <heading> <attr> pairs
    for (let i = 0; i < args.length; i += 2) {
      if (i + 1 >= args.length) break;
      tablesToProcess.push({ heading: args[i], attr: args[i + 1] });
    }
  }
  
  const totalChanges = {};
  
  for (const entry of tablesToProcess) {
    const { heading } = entry;
    const table = loadTable(heading);
    if (!table) {
      console.log(`[${heading}] Table not found, skipping.`);
      continue;
    }
    
    const ozSamples = byGroup[heading] || [];
    if (ozSamples.length === 0) {
      console.log(`[${heading}] No oz samples, skipping.`);
      continue;
    }
    
    console.log(`\n=== Processing ${heading} (${ozSamples.length} oz samples) ===`);
    
    const changes = [];
    
    if (entry.patterns) {
      // Phase 1: use phrase patterns
      for (const [attrName, valuePatterns] of Object.entries(entry.patterns)) {
        const inp = table.inputs.find(i => i.attribute === attrName);
        if (!inp) { console.log(`  [${attrName}] not found`); continue; }
        
        inp.detect = inp.detect || {};
        
        for (const [value, patternPhrases] of Object.entries(valuePatterns)) {
          const existingPhrases = new Set(
            Object.values(inp.detect || {}).flat().map(p => p.toLowerCase())
          );
          
          const newPhrases = new Set();
          for (const pattern of patternPhrases) {
            for (const sample of ozSamples) {
              const text = [sample.tenHang, sample.chatLieu, sample.congDung, sample.sampleDesc]
                .filter(Boolean).join(' ');
              const found = extractPhrases(text, pattern);
              for (const phrase of found) {
                if (phrase.length >= 3 && !existingPhrases.has(phrase.toLowerCase())) {
                  newPhrases.add(phrase.toLowerCase());
                }
              }
            }
          }
          
          if (newPhrases.size > 0) {
            const phraseList = [...newPhrases].slice(0, 8);
            console.log(`  [${attrName}=${value}] +${phraseList.length} phrases: ${phraseList.slice(0,3).join(', ')}`);
            inp.detect[value] = [...new Set([...(inp.detect[value] || []), ...phraseList])];
            changes.push({ attrName, value, count: phraseList.length });
          }
        }
      }
    }
    
    if (entry.config) {
      // Phase 2: use HS code to value mapping from oz samples
      const { attr: attrName } = entry.config;
      const inp = table.inputs.find(i => i.attribute === attrName);
      if (!inp) { console.log(`  [${attrName}] not found`); continue; }
      
      inp._detect = inp._detect || {};
      
      // Build existing phrases
      const existingPhrases = new Set();
      for (const [val, phrases] of Object.entries(inp._detect || {})) {
        for (const p of phrases) {
          if (typeof p === 'string') existingPhrases.add(p.toLowerCase());
        }
      }
      
      // Also check inp.detect
      for (const [val, phrases] of Object.entries(inp.detect || {})) {
        for (const p of phrases) {
          if (typeof p === 'string') existingPhrases.add(p.toLowerCase());
        }
      }
      
      // For each oz sample, determine its attribute value from HS code
      // and extract phrases
      const valuePhrases = {};
      
      for (const sample of ozSamples) {
        const hsc = sample.hsCode;
        const text = [sample.tenHang, sample.chatLieu, sample.congDung, sample.sampleDesc]
          .filter(Boolean).join(' ');
        
        // Determine value from config mapping
        const config = entry.config;
        let value = null;
        
        if (config.hsCodeToValue) {
          for (const [prefix, val] of Object.entries(config.hsCodeToValue)) {
            if (hsc.startsWith(prefix)) {
              value = val;
              break;
            }
          }
        }
        
        if (!value) continue;
        
        // Extract all meaningful phrases from text
        const words = text.split(/\s+/).filter(w => w.length >= 3);
        for (let i = 0; i < words.length; i++) {
          const phrase = words.slice(Math.max(0, i-2), Math.min(words.length, i+3)).join(' ');
          if (phrase.length >= 4 && !existingPhrases.has(phrase.toLowerCase())) {
            if (!valuePhrases[value]) valuePhrases[value] = new Set();
            valuePhrases[value].add(phrase.toLowerCase());
          }
        }
      }
      
      for (const [value, phrases] of Object.entries(valuePhrases)) {
        if (phrases.size > 0) {
          const phraseList = [...phrases].slice(0, 8);
          console.log(`  [${attrName}=${value}] +${phraseList.length} phrases: ${phraseList.slice(0,3).join(', ')}`);
          inp._detect[value] = inp._detect[value] || [];
          for (const p of phraseList) {
            const already = inp._detect[value].some(ex => typeof ex === 'string' && ex.toLowerCase() === p);
            if (!already) inp._detect[value].push(p);
          }
          changes.push({ attrName, value, count: phraseList.length });
        }
      }
    }
    
    if (changes.length > 0) {
      saveTable(table, heading);
      totalChanges[heading] = changes.length;
      console.log(`  → Saved (${changes.length} changes)`);
    }
  }
  
  if (Object.keys(totalChanges).length > 0) {
    console.log('\n=== SUMMARY ===');
    for (const [h, n] of Object.entries(totalChanges)) {
      console.log(`  ${h}: ${n} attribute values enriched`);
    }
  } else {
    console.log('\nNo changes made.');
  }
}

main(process.argv.slice(2)).catch(e => { console.error(e); process.exit(1); });
