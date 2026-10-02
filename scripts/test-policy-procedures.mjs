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

// 1. Có đúng 56 entries (14 original + 6 new procedure types)
check('có 56 entries', keys.length === 56);

// 2. Tất cả entries có verified=true
const unverified = keys.filter(k => d[k].verified !== true);
check('tất cả verified=true', unverified.length === 0, unverified);

// 3. Phân biệt procedure-type vs chapter-group
const procTypes = keys.filter(k => !d[k].chapters);
const chapterGroups = keys.filter(k => !!d[k].chapters);
check('đúng 20 procedure types', procTypes.length === 20);
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
// NOTE: legalBasis là text tự nhiên, không nhất thiết khớp mã legal-docs.json.
// Chương 77 (WCO Reserved) và các nhóm không thuộc diện quản lý → legalBasis={} là acceptable.
const noLB = chapterGroups.filter(k => {
  if (k === 'chuong-77') return false; // WCO reserved, intentionally empty
  const lb = d[k].legalBasis;
  if (!lb || typeof lb !== 'object') return true;
  const vals = Object.values(lb).filter(v => v && String(v).trim().length > 0);
  return vals.length === 0;
});
check('mọi chapter-group có legalBasis (text không rỗng, trừ chuong-77 WCO)', noLB.length === 0, noLB);

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
  check('policy-procedures.json records=56', ppFile.records === 56);
  check('policy-procedures.json coverage 97/97', ppFile.coverage && ppFile.coverage.includes('97/97'));
  check('policy-procedures.json verifiedChapters 36/36', ppFile.verifiedChapters && ppFile.verifiedChapters.includes('36/36'));
}

// 12. verifiedChapters count khớp thực tế (parse from string like "36/36")
const vChapters = chapterGroups.filter(k => d[k].verified === true).length;
check(`verifiedChapters count khớp thực tế (${vChapters})`, vChapters === 36);

// 13. normalizeType handles abbreviations and top license types
const { normalizeType } = require('../lib/policy-procedures.js');
const abbrevTests = [
  ['NK', 'gp-nk'],
  ['XK', 'xk'],
  ['SXKD', 'kd-dk'],
  ['KD có điều kiện', 'kd-dk'],
  ['Giấy phép NK', 'gp-nk'],
  ['Cấm NK', 'cam-nk'],
  ['Hạn ngạch thuế quan', 'gp-nk'],
  ['Đăng ký lưu hành', 'dk-luu-hanh'],
  ['Giấy phép kinh doanh có điều kiện', 'kd-dk'],
  ['Sản xuất kinh doanh có điều kiện', 'kd-dk'],
  ['BVMT', 'chat-luong'],
  ['ATKT', 'chat-luong'],
  ['CL', 'chat-luong'],
  ['KTCN chất lượng SP HH nhóm 2', 'chat-luong'],
  ['Hạn chế sản xuất, kinh doanh', 'kd-dk'],
  ['Hạn chế kinh doanh', 'kd-dk'],
  ['Cấm', 'cam-nk'],
  ['Giấy phép kinh doanh XNK', 'gp-nk'],
  ['Giấy phép kinh doanh xuất khẩu, nhập khẩu xăng dầu', 'gp-nk'],
  // NEW from 2026-10-02 gap analysis
  ['Kiểm tra chuyên ngành', 'chat-luong'],
  ['Chứng nhận bảo vệ môi trường', 'chat-luong'],
  ['Kiểm tra nhà nước về đo lường', 'chat-luong'],
  ['CNHQ', 'chat-luong'],
  ['Hậu kiểm sau TQ', 'chat-luong'],
  ['Cắt giảm kiểm tra chuyên ngành', 'chat-luong'],
  ['Kiểm tra chuyên ngành (cắt giảm)', 'chat-luong'],
  // NEW from 2026-10-02 18:xx second round — remaining nulls
  ['NK có điều kiện', 'kd-dk'],
  ['NK hạn chế', 'kd-dk'],
  ['Hạn chế SX KD', 'kd-dk'],
  ['Giấy phép kinh doanh hạn chế', 'kd-dk'],
  ['Kinh doanh hạn chế', 'kd-dk'],
  ['Sản xuất, kinh doanh hạn chế', 'kd-dk'],
  ['Hạn chế KD', 'kd-dk'],
  ['Nhập khẩu chất cấm sử dụng', 'cam-nk'],
  ['Giấy phép TNTX', 'xk'],
  ['Chỉ định', 'kd-dk'],
  ['CR', 'chat-luong'],
  ['Chuyên ngành', 'chat-luong'],
  ['An toàn', 'chat-luong'],
  ['Đã cắt giảm', 'chat-luong'],
  ['Chứng nhận trước thông quan', 'chat-luong'],
  ['Chứng nhận trước khi thông quan', 'chat-luong'],
  ['Chứng nhận trước thông quan cho hàng hóa nhập khẩu', 'chat-luong'],
  ['KTNN về CL khi NK', 'chat-luong'],
  ['Kiểm tra tiêu chuẩn khoáng sản', 'chat-luong'],
  ['Kiểm tra hàng hóa có khả năng gây mất an toàn', 'chat-luong'],
];
abbrevTests.forEach(([input, expected]) => {
  const got = normalizeType(input);
  check(`normalizeType(${JSON.stringify(input)}) = ${expected}`, got === expected, `got: ${got}`);
});

// 2026-10-02: hsExamples must be valid 8-digit codes from tax.json
const taxDb = require('../data/tax.json');
const taxKeysValid = new Set(Object.keys(taxDb));
const _cgKeys = Object.keys(d).filter(k => !d[k].ministry && d[k].chapters);
_cgKeys.forEach(k => {
  const exs = d[k].hsExamples || [];
  check(`chapter-group ${k} hsExamples[] are valid codes`, exs.every(ex => {
    if (ex.length === 8) return taxKeysValid.has(ex);
    if (ex.length === 6) return [...taxKeysValid].some(t => t.startsWith(ex));
    return false;
  }), `invalid: ${JSON.stringify(exs)}`);
});

// 2026-10-02: chapter-groups must have non-empty description and hsExamples
_cgKeys.forEach(k => {
  const v = d[k];
  check(`chapter-group ${k} has description`, v.description && v.description.length > 10, v.description || '(empty)');
  // chuong-77 WCO reserved intentionally has no examples; skip the >=2 check
  if (k !== 'chuong-77') {
    check(`chapter-group ${k} has hsExamples[]`, Array.isArray(v.hsExamples) && v.hsExamples.length >= 2, v.hsExamples);
  }
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
