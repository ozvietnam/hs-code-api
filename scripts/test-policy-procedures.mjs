#!/usr/bin/env node
/** Test cấu trúc policy-procedures.json — tự động kiểm mỗi lần thêm nhóm mới. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const d = require('../data/policy-procedures.json');
const sources = require('../data/SOURCES.json');

let pass = 0, fail = 0;
const check = (n, c, d_) => {
  c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d_ === undefined ? '' : JSON.stringify(d_)));
};

const keys = Object.keys(d);

// 1. Có đúng 50 entries
check('có 50 entries', keys.length === 50);

// 2. Tất cả entries có verified=true
const unverified = keys.filter(k => d[k].verified !== true);
check('tất cả verified=true', unverified.length === 0, unverified);

// 3. Phân biệt procedure-type vs chapter-group
const procTypes = keys.filter(k => !d[k].chapters);
const chapterGroups = keys.filter(k => !!d[k].chapters);
check('đúng 14 procedure types', procTypes.length === 14);
check('đúng 36 chapter groups', chapterGroups.length === 36);

// 4. Mỗi chapter-group có chapters (array), hsRange, label, group
chapterGroups.forEach(k => {
  const e = d[k];
  check(`chapter-group ${k} có chapters[]`, Array.isArray(e.chapters) && e.chapters.length > 0);
  check(`chapter-group ${k} có hsRange`, typeof e.hsRange === 'string' && e.hsRange.length > 0);
  check(`chapter-group ${k} có label`, typeof e.label === 'string' && e.label.length > 0);
  check(`chapter-group ${k} có group`, typeof e.group === 'string' && e.group.length > 0);
  check(`chapter-group ${k} có code`, typeof e.code === 'string' && e.code.length > 0);
});

// 5. Mỗi chapter-group có procedures[] (rỗng [] chỉ chấp nhận cho chuong-77 WCO-reserved)
const noProc = chapterGroups.filter(k => {
  const p = d[k].procedures;
  return !p || (!Array.isArray(p) ? true : p.length === 0 && k !== 'chuong-77');
});
check('mọi chapter-group có procedures[] (trừ chuong-77 WCO reserved)', noProc.length === 0, noProc);

// 6. Mỗi procedure reference phải tồn tại trong procTypes
const allProcs = new Set(procTypes);
chapterGroups.forEach(k => {
  const bad = (d[k].procedures || []).filter(p => !allProcs.has(p));
  check(`chapter-group ${k} procedures tồn tại`, bad.length === 0, bad);
});

// 7. Mỗi chapter-group có legalBasis (object, có thể rỗng {})
const noLB = chapterGroups.filter(k => !d[k].legalBasis || typeof d[k].legalBasis !== 'object');
check('mọi chapter-group có legalBasis', noLB.length === 0, noLB);

// 8. priorityImportFromCN là boolean hoặc không có (default false)
chapterGroups.forEach(k => {
  const v = d[k].priorityImportFromCN;
  check(`chapter-group ${k} priorityImportFromCN boolean`, v === undefined || typeof v === 'boolean');
});

// 9. Procedure types có đầy đủ required fields
const requiredProcFields = ['label', 'labelShort', 'ministry', 'legalBasis', 'verified'];
procTypes.forEach(k => {
  requiredProcFields.forEach(f => {
    check(`proc-type ${k} có ${f}`, f in d[k]);
  });
});

// 10. notes là string hoặc không có
chapterGroups.forEach(k => {
  const n = d[k].notes;
  check(`chapter-group ${k} notes là string`, n === undefined || typeof n === 'string');
});

// 11. SOURCES.json có policy-procedures
const ppFile = sources.files['policy-procedures.json'];
check('SOURCES.json có policy-procedures.json', !!ppFile);
if (ppFile) {
  check('policy-procedures.json trong SOURCES có lastUpdated', typeof ppFile.lastUpdated === 'string');
  check('policy-procedures.json trong SOURCES có records', typeof ppFile.records === 'number');
  check('policy-procedures.json records=50', ppFile.records === 50);
  check('policy-procedures.json coverage 97/97', ppFile.coverage && ppFile.coverage.includes('97/97'));
  check('policy-procedures.json verifiedChapters 36/36', ppFile.verifiedChapters && ppFile.verifiedChapters.includes('36/36'));
}

// 12. verifiedChapters count khớp thực tế (parse from string like "36/36")
const vChapters = chapterGroups.filter(k => d[k].verified === true).length;
check(`verifiedChapters count khớp thực tế (${vChapters})`, vChapters === 36);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
