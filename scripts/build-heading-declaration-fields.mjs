#!/usr/bin/env node
/**
 * Sinh data/heading-declaration-fields.json từ biểu thuế + template chuyên gia 4 số.
 * Chạy: npm run build:declaration-fields
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const { resolveTemplateId, TEMPLATES } = require('./lib/declaration-field-templates.js');

const tax = JSON.parse(readFileSync(join(root, 'data', 'tax.json'), 'utf8'));
const catalog = JSON.parse(readFileSync(join(root, 'data', 'chapter-declaration-fields.json'), 'utf8'));
const hsOverrides = JSON.parse(
  readFileSync(join(root, 'data', 'hs-declaration-overrides.json'), 'utf8')
);

const PRIORITY_CHAPTERS = new Set([
  '33', '34', '39', '40', '61', '62', '63', '64', '70', '73', '82', '84', '85', '90', '94',
]);

const headingMeta = {};
for (const [hs, row] of Object.entries(tax)) {
  const ch = hs.slice(0, 2);
  if (!PRIORITY_CHAPTERS.has(ch)) continue;
  const heading = hs.slice(0, 4);
  if (!headingMeta[heading]) {
    headingMeta[heading] = {
      chapter: ch,
      titleVi: (row.vn || '').replace(/\s+/g, ' ').trim().replace(/^-+\s*/, ''),
      sampleHs: hs,
      subcodeCount: 0,
    };
  }
  headingMeta[heading].subcodeCount += 1;
}

const headings = {};
let mapped = 0;
let fallback = 0;

for (const [heading, meta] of Object.entries(headingMeta).sort(([a], [b]) => a.localeCompare(b))) {
  const templateId = resolveTemplateId(heading);
  const template = templateId ? TEMPLATES[templateId] : null;
  if (template) {
    mapped += 1;
    headings[heading] = {
      chapter: meta.chapter,
      titleVi: meta.titleVi,
      template: templateId,
      required: [...template.required],
      recommended: [...(template.recommended || [])],
      noteVi: template.noteVi,
      subcodeCount: meta.subcodeCount,
      sampleHs: meta.sampleHs,
    };
  } else {
    fallback += 1;
    const chFallback = catalog.chapters?.[meta.chapter];
    headings[heading] = {
      chapter: meta.chapter,
      titleVi: meta.titleVi,
      template: 'chapterFallback',
      required: [...(chFallback?.required || [])],
      recommended: [...(chFallback?.recommended || [])],
      noteVi: `Fallback chương ${meta.chapter} — cần bổ sung template nhóm ${heading}`,
      subcodeCount: meta.subcodeCount,
      sampleHs: meta.sampleHs,
    };
  }
}

const out = {
  version: new Date().toISOString().slice(0, 10),
  generatedBy: 'scripts/build-heading-declaration-fields.mjs',
  stats: {
    headings: Object.keys(headings).length,
    mappedTemplates: mapped,
    chapterFallback: fallback,
    hsOverrides: Object.keys(hsOverrides.hsCodes || {}).length,
  },
  headings,
};

writeFileSync(join(root, 'data', 'heading-declaration-fields.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(
  `Wrote heading-declaration-fields.json — ${out.stats.headings} headings (${mapped} templated, ${fallback} fallback)`
);
