#!/usr/bin/env node
// A3 (#45) — Test: taxonomy hsHints hợp lệ + chapter-specific-rules đủ độ phủ & đúng schema.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { validateHsHints } = require('../lib/material-taxonomy.js');
const rules = require('../data/chapter-specific-rules.json');

let fail = 0;
const ok = (c, m) => { if (!c) { console.error('FAIL', m); fail += 1; } };

// 1. Mọi hsHints phải là prefix khớp ≥1 mã trong tax.json.
const v = validateHsHints();
ok(v.total >= 50, `taxonomy phải có ≥50 hsHints (có ${v.total})`);
ok(v.invalidCount === 0, `hsHints không hợp lệ: ${JSON.stringify(v.invalid)}`);

// 2. chapter-specific-rules phủ ≥15 chương khó.
const chapters = Object.keys(rules.chapters || {});
ok(chapters.length >= 15, `chapter-specific-rules phải phủ ≥15 chương (có ${chapters.length})`);

// 3. Mỗi chương đúng schema: titleVi + chapterSpecificRequired không rỗng.
for (const [ch, r] of Object.entries(rules.chapters)) {
  ok(typeof r.titleVi === 'string' && r.titleVi.length > 0, `chương ${ch} thiếu titleVi`);
  ok(Array.isArray(r.chapterSpecificRequired) && r.chapterSpecificRequired.length > 0,
    `chương ${ch} thiếu chapterSpecificRequired`);
  ok(Array.isArray(r.requiredAttributes) && r.requiredAttributes.length > 0,
    `chương ${ch} thiếu requiredAttributes`);
}

// 4. Các chương dệt may dễ nhầm (61 dệt kim / 62 dệt thoi) phải có mặt — đây là cặp lỗi phổ biến.
ok(rules.chapters['61'] && rules.chapters['62'], 'phải có chương 61 + 62 (cặp dệt kim/dệt thoi)');
ok(rules.chapters['61'].chapterSpecificRequired.includes('knitOrWoven'), 'chương 61 cần knitOrWoven');

if (fail) { console.error(`\n${fail} test FAIL`); process.exit(1); }
console.log('PASS taxonomy-rules —', v.total, 'hsHints hợp lệ,', chapters.length, 'chương rules');
