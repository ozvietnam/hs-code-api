#!/usr/bin/env node
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { detectMaterials, materialExpansionTerms } = require('../lib/material-taxonomy.js');

let passed = 0;
let failed = 0;

function assert(name, cond, detail) {
  if (cond) {
    console.log('PASS', name);
    passed += 1;
  } else {
    console.log('FAIL', name, detail || '');
    failed += 1;
  }
}

const cotton = detectMaterials('áo cotton 60% polyester');
assert('blend fibers', cotton.some((m) => m.material === 'cotton' || m.material.includes('cotton')));
assert('polyester hit', cotton.some((m) => m.material === 'polyester'));

const pe = materialExpansionTerms('ống nhựa HDPE');
assert('HDPE hints', pe.preferChapterPrefixes.some((p) => p.startsWith('39')));

const acid = detectMaterials('axit sunfuric H2SO4');
assert('chemical', acid.some((m) => m.family === 'chemicals'));

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
