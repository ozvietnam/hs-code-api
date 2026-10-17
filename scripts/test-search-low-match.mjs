#!/usr/bin/env node
// Test #326: /api/search?q=phải trả 0 + gợi ý đổi từ khoá khi điểm khớp thấp
// (tách từ méo, sai miền). Trước đây "trạm sạc" → 34013000 (chất tẩy rửa).
// Ngưỡng chọn là top score < 80 (đo trên các truy vấn đại diện — ghi trong báo cáo).
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { searchCandidates } = require('../lib/search-utils');
const { filterLowConfidence } = require('../lib/search-low-confidence');

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };

// --- Ca repro bug #326: "trạm sạc" sai miền. ---
const tramSac = searchCandidates('trạm sạc', { topCandidates: 5 });
const r1 = filterLowConfidence(tramSac);
check(
  'trạm sạc: filter trả về mảng rỗng + lowConfidence=true + suggestion',
  r1.results.length === 0 && r1.lowConfidence === true && typeof r1.suggestionVi === 'string' && r1.suggestionVi.length > 0,
  r1,
);

// --- Ca âm: "trạm sạc xe" — top 73. ---
const tramSacXe = searchCandidates('trạm sạc xe', { topCandidates: 5 });
const r2 = filterLowConfidence(tramSacXe);
check(
  'trạm sạc xe: filter trả 0 + gợi ý',
  r2.results.length === 0 && r2.lowConfidence === true,
  r2,
);

// --- Ca âm: "trạm sạc ô tô" — top 53. ---
const tramSacOto = searchCandidates('trạm sạc ô tô', { topCandidates: 5 });
const r3 = filterLowConfidence(tramSacOto);
check('trạm sạc ô tô: filter trả 0 + gợi ý', r3.results.length === 0 && r3.lowConfidence === true, r3);

// --- Ca dương: "sạc dự phòng" (top 173). ---
const sacDuPhong = searchCandidates('sạc dự phòng', { topCandidates: 5 });
const r4 = filterLowConfidence(sacDuPhong);
check(
  'sạc dự phòng: filter GIỮ nguyên kết quả (top >= 80)',
  r4.results.length === sacDuPhong.length && !r4.lowConfidence,
  { in: sacDuPhong.length, out: r4.results.length, low: r4.lowConfidence },
);

// --- Ca dương: "sạc laptop" (top 356). ---
const sacLap = searchCandidates('sạc laptop', { topCandidates: 5 });
const r5 = filterLowConfidence(sacLap);
check('sạc laptop: giữ nguyên kết quả', r5.results.length === sacLap.length && !r5.lowConfidence, r5);

// --- Ca dương: "bộ sạc ô tô" (top 300). ---
const boSac = searchCandidates('bộ sạc ô tô', { topCandidates: 5 });
const r6 = filterLowConfidence(boSac);
check('bộ sạc ô tô: giữ nguyên kết quả', r6.results.length === boSac.length && !r6.lowConfidence, r6);

// --- Ca dương ranh giới: "máy sạc" (top 122). ---
const maySac = searchCandidates('máy sạc', { topCandidates: 5 });
const r7 = filterLowConfidence(maySac);
check('máy sạc: giữ kết quả (top 122 >= 80)', r7.results.length === maySac.length && !r7.lowConfidence, r7);

// --- Edge: input rỗng → không crash, lowConfidence=true. ---
const r8 = filterLowConfidence([]);
check('input rỗng → lowConfidence=true, results=[]', r8.results.length === 0 && r8.lowConfidence === true, r8);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);