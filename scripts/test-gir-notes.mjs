#!/usr/bin/env node
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { buildNoteChain, getNotesCoverage } = require('../lib/gir-notes.js');

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

const chain = buildNoteChain('85171300');
assert('chain has 5 levels', chain.length === 5);
assert('section XVI for ch85', chain[0].code === 'XVI');
assert('chapter 85', chain[1].code === '85');
assert('national includes bao_gom', chain[4].noteType === 'INCLUDES');

// OZV-2289: bản trích gán nhầm văn bản chú giải Phần VI cho ch.39–40 (thực là Phần VII) —
// cùng luật phanHopLe như lib/so-tay.js phải chặn ở cả cánh /api/notes.
const secOf = (hs) => buildNoteChain(hs).find((e) => e.level === 'SECTION');
const s39 = secOf('39021000');
const s40 = secOf('40030000');
const s28 = secOf('28030000');
assert('ch39 SECTION là Phần VII', s39 && s39.code === 'VII');
assert('ch39 không nhận văn bản chú giải Phần VI gán nhầm', s39 && !/NGÀNH CÔNG NGHIỆP LIÊN QUAN/.test(s39.noteVi || '') && /KHÔNG CÓ chú giải/.test(s39.noteVi || ''));
assert('ch40 SECTION là Phần VII, không nhận văn bản Phần VI gán nhầm', s40 && s40.code === 'VII' && !/NGÀNH CÔNG NGHIỆP LIÊN QUAN/.test(s40.noteVi || ''));
assert('ch28 vẫn có chú giải Phần VI nguyên văn', s28 && s28.code === 'VI' && /NGÀNH CÔNG NGHIỆP LIÊN QUAN/.test(s28.noteVi || ''));

const cov = getNotesCoverage();
assert('coverage has national', cov.byNational > 8000);
assert('coverage pct computed', cov.pctOfTarget > 0);

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
