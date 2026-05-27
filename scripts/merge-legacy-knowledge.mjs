#!/usr/bin/env node
/**
 * Merge optional legacy knowledge blobs into knowledge-bundle.json (Issue #4 stub).
 *
 * Optional input:
 *   data/legacy-knowledge.json
 *
 * Output:
 *   data/knowledge-bundle.json — keyed by HS 8-digit
 *
 * Usage: node scripts/merge-legacy-knowledge.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const LEGACY_PRIMARY = path.join(ROOT, 'data', 'legacy-knowledge.json');
const LEGACY_SAMPLE = path.join(ROOT, 'data', 'legacy-knowledge.sample.json');
const OUT = path.join(ROOT, 'data', 'knowledge-bundle.json');

function normalizeHs(hs) {
  return String(hs || '')
    .replace(/\./g, '')
    .trim()
    .padEnd(8, '0')
    .slice(0, 8);
}

function main() {
  const candidates = [LEGACY_PRIMARY, LEGACY_SAMPLE].filter((p) => fs.existsSync(p));
  if (candidates.length === 0) {
    /* eslint-disable no-console */
    console.log(`No legacy file found. Add ${path.relative(ROOT, LEGACY_PRIMARY)}`);
    console.log('Creating example:', path.relative(ROOT, LEGACY_SAMPLE));
    /* eslint-enable no-console */
    fs.writeFileSync(
      LEGACY_SAMPLE,
      `${JSON.stringify(
        {
          '85171300': {
            description: 'optional text from legacy knowledge graph export',
            legalNotes: [],
            precedentRefs: [],
            conflictHints: [],
          },
        },
        null,
        2
      )}\n`,
      'utf8'
    );
    return;
  }

  const bundle = {};
  for (const file of candidates) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      /* eslint-disable no-console */
      console.warn('Skip invalid JSON', file, e.message);
      /* eslint-enable no-console */
      continue;
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue;

    for (const [key, val] of Object.entries(data)) {
      const hs = normalizeHs(key);
      const prev = bundle[hs] || { mergedFrom: [] };
      const mergedFrom = Array.isArray(prev.mergedFrom) ? [...prev.mergedFrom, path.basename(file)] : [path.basename(file)];
      const rest = typeof val === 'object' && val !== null && !Array.isArray(val) ? val : {};
      bundle[hs] = { ...prev, ...rest, mergedFrom, hsCode: hs };
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  /* eslint-disable no-console */
  console.log('Wrote', path.relative(ROOT, OUT), 'keys=', Object.keys(bundle).length);
  /* eslint-enable no-console */
}

main();
