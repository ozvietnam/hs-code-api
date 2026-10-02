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

// 1. Có đúng 57 entries (14 original + 6 new procedure types + chuong-98)
check('có 57 entries', keys.length === 57);

// 2. Tất cả entries có verified=true
const unverified = keys.filter(k => d[k].verified !== true);
check('tất cả verified=true', unverified.length === 0, unverified);

// 3. Phân biệt procedure-type vs chapter-group
const procTypes = keys.filter(k => !d[k].chapters);
const chapterGroups = keys.filter(k => !!d[k].chapters);
check('đúng 20 procedure types', procTypes.length === 20);
check('đúng 37 chapter groups', chapterGroups.length === 37);

// 4. Mỗi chapter-group có chapters (array), hsRange, label, group
chapterGroups.forEach(k => {
  const e = d[k];
  check(`chapter-group ${k} có chapters[]`, Array.isArray(e.chapters) && e.chapters.length > 0);
  check(`chapter-group ${k} có hsRange`, typeof e.hsRange === 'string' && e.hsRange.length > 0);
  check(`chapter-group ${k} có label`, typeof e.label === 'string' && e.label.length > 0);
  check(`chapter-group ${k} có group`, typeof e.group === 'string' && e.group.length > 0);
  check(`chapter-group ${k} có code`, typeof e.code === 'string' && e.code.length > 0);
});

// 5. Mỗi chapter-group có procedures[] (rỗng [] hoặc null chỉ chấp nhận cho chuong-77 WCO-reserved)
const noProc = chapterGroups.filter(k => {
  const p = d[k].procedures;
  if (k === 'chuong-77') return false; // WCO reserved, no procedures
  if (p === null || p === undefined) return true; // must have array
  if (!Array.isArray(p)) return true;
  return p.length === 0; // empty array not allowed (except chuong-77)
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
  check('policy-procedures.json records=57', ppFile.records === 57);
  check('policy-procedures.json coverage 97/97', ppFile.coverage && ppFile.coverage.includes('97/97'));
  check('policy-procedures.json verifiedChapters 37/37', ppFile.verifiedChapters && ppFile.verifiedChapters.includes('37/37'));
}

// 12. verifiedChapters count khớp thực tế (parse from string like "36/36")
const vChapters = chapterGroups.filter(k => d[k].verified === true).length;
check(`verifiedChapters count khớp thực tế (${vChapters})`, vChapters === 37);

// 13. normalizeType handles abbreviations and top license types
const { getProcedures, getProcedureByCode, listProcedures, normalizeType } = require('../lib/policy-procedures.js');
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

// 2026-10-02: hsExamples must be valid 8-digit codes from tax.json (chuong-77 has null — skip)
const taxDb = require('../data/tax.json');
const taxKeysValid = new Set(Object.keys(taxDb));
const _cgKeys = Object.keys(d).filter(k => !d[k].ministry && d[k].chapters);
_cgKeys.forEach(k => {
  const exs = d[k].hsExamples;
  if (exs === null) return; // chuong-77 WCO reserved, intentionally null
  const exArr = exs || [];
  check(`chapter-group ${k} hsExamples[] are valid codes`, exArr.every(ex => {
    if (ex.length === 8) return taxKeysValid.has(ex);
    if (ex.length === 6) return [...taxKeysValid].some(t => t.startsWith(ex));
    return false;
  }), `invalid: ${JSON.stringify(exArr)}`);
});

// 2026-10-02: chapter-groups must have non-empty description and hsExamples
_cgKeys.forEach(k => {
  const v = d[k];
  check(`chapter-group ${k} has description`, v.description && v.description.length > 10, v.description || '(empty)');
  // chuong-77 WCO reserved intentionally has no examples; skip the >=2 check
  if (k === 'chuong-77') return;
  check(`chapter-group ${k} has hsExamples[]`, Array.isArray(v.hsExamples) && v.hsExamples !== null && v.hsExamples.length >= 2, v.hsExamples);
});

// 2026-10-02: getProcedures() with usedGoodsImportBan flag
const te = require('../data/tax-enriched.json');

const usedBanEntry = Object.entries(te).find(([, e]) => e?.warnings?.usedGoodsImportBan);
if (usedBanEntry) {
  const [code, entry] = usedBanEntry;
  const procs = getProcedures(entry.warnings);
  check(`getProcedures(usedGoodsImportBan=true) returns cam-nk for ${code}`,
    procs.length > 0 && procs.some(p => p.code === 'cam-nk'),
    procs.map(p => p.code));
}

// getProcedures should NOT add cam-nk twice (seen set)
if (usedBanEntry) {
  const [, entry] = usedBanEntry;
  const procs = getProcedures(entry.warnings);
  const camCount = procs.filter(p => p.code === 'cam-nk').length;
  check(`cam-nk not duplicated in getProcedures result`, camCount === 1, camCount);
}

// 2026-10-02: chapter-group fallback — HS with empty warnings but chapter has procedures
// 13019030 has no inspectionTypes/licenseTypes but chapter 13 → da-thuc-vat-13 → chat-luong
const emptyWarnEntry = te['13019030'];
if (emptyWarnEntry) {
  const procs = getProcedures(emptyWarnEntry.warnings, '13019030');
  check(`chapter-group fallback: 13019030 (ch13, no warnings) → chat-luong`,
    procs.length > 0 && procs.some(p => p.code === 'chat-luong'),
    procs.map(p => p.code));
  const chatLuong = procs.find(p => p.code === 'chat-luong');
  check(`chapter-group fallback matchedRaw = 'chapter-group:13'`,
    chatLuong?.matchedRaw === 'chapter-group:13',
    chatLuong?.matchedRaw);
}

// 2026-10-02: chapter-group fallback — HS with explicit warnings should NOT be overridden
const hsWithWarn = Object.entries(te).find(([, e]) =>
  e?.warnings?.inspectionTypes?.length > 0 && !e?.warnings?.usedGoodsImportBan
);
if (hsWithWarn) {
  const [hs, entry] = hsWithWarn;
  const procsBefore = getProcedures(entry.warnings, hs);
  // Remove any usedGoodsImportBan effect
  const entryNoBan = { ...entry, warnings: { ...entry.warnings, usedGoodsImportBan: false } };
  const procsAfter = getProcedures(entryNoBan.warnings, hs);
  const sameCodes = procsBefore.map(p => p.code).sort().join(',') ===
                    procsAfter.filter(p => !p.matchedRaw?.startsWith('chapter-group')).map(p => p.code).sort().join(',');
  check(`chapter-group fallback: explicit warnings NOT overridden for ${hs}`,
    sameCodes, { before: procsBefore.map(p => p.code), after: procsAfter.map(p => p.code) });
}

// 2026-10-02: getProcedures without hsCode param still works (backward compat)
if (usedBanEntry) {
  const [, entry] = usedBanEntry;
  const procs = getProcedures(entry.warnings);
  check(`getProcedures(warnings) without hsCode still returns cam-nk`,
    procs.some(p => p.code === 'cam-nk'));
}

// 2026-10-02: listProcedures() should return only 20 procedure types, not 36 chapter-groups
const allListed = listProcedures();
check('listProcedures() returns exactly 20 entries', allListed.length === 20, `got ${allListed.length}`);
check('listProcedures() has no chapter-group entries (no chapters field)', allListed.every(e => !e.chapters), allListed.filter(e => e.chapters).map(e => e.code));
check('listProcedures() includes cam-nk, attp, chat-luong', ['cam-nk','attp','chat-luong'].every(c => allListed.some(p => p.code === c)));

// 2026-10-02: getProcedureByCode returns procedure type (not chapter-group)
const camNK = getProcedureByCode('cam-nk');
check('getProcedureByCode(cam-nk) returns cam-nk', camNK?.code === 'cam-nk');
check('getProcedureByCode(cam-nk) has exemptions', Array.isArray(camNK?.exemptions) && camNK.exemptions.length > 0);
const mayMac84 = getProcedureByCode('may-mac-84');
check('getProcedureByCode(may-mac-84) is a chapter-group (has chapters)', !!mayMac84?.chapters);

// 2026-10-02: chapter-groups now have exemptions derived from procedure types
check('chapter-group may-mac-84 has exemptions', Array.isArray(mayMac84?.exemptions) && mayMac84.exemptions.length > 0);
check('chapter-group dong-vat-01 has exemptions', Array.isArray(getProcedureByCode('dong-vat-01')?.exemptions));
check('chapter-group chuong-77 has exemptions (empty array — WCO reserved)', Array.isArray(getProcedureByCode('chuong-77')?.exemptions));

// Verify exemptions count matches merged procedure-type exemptions
const mayMacExemptions = new Set(mayMac84?.exemptions || []);
const procExemptions = new Set([
  ...(d['chat-luong']?.exemptions || []),
  ...(d['nang-luong']?.exemptions || []),
]);
check('chapter-group exemptions are superset of merged procedure exemptions',
  [...procExemptions].every(ex => mayMacExemptions.has(ex)));

// 2026-10-03 (B): condition-triggered procedure types — 6 new types added 2026-10-02
// Each has trigger, documents, exemptions, matchPatterns, estimatedDays/Cost, agency,
// legalBasis (string), severity, onFail, verified=true, priorityImportFromCN=boolean
const CONDITION_TYPES = ['cam-nk','kd-dk','dk-luu-hanh','xk','lam-san','cong-bo'];
CONDITION_TYPES.forEach(id => {
  const e = d[id];
  check(`condition-type ${id} has trigger (string > 10 chars)`, typeof e.trigger === 'string' && e.trigger.length > 10);
  check(`condition-type ${id} has documents (non-empty array)`, Array.isArray(e.documents) && e.documents.length > 0);
  check(`condition-type ${id} has exemptions (array)`, Array.isArray(e.exemptions));
  check(`condition-type ${id} has matchPatterns (non-empty array)`, Array.isArray(e.matchPatterns) && e.matchPatterns.length > 0);
  check(`condition-type ${id} has estimatedDays (object)`, e.estimatedDays && typeof e.estimatedDays === 'object');
  check(`condition-type ${id} has estimatedCost (string > 0)`, typeof e.estimatedCost === 'string' && e.estimatedCost.length > 0);
  check(`condition-type ${id} has agency (string > 0)`, typeof e.agency === 'string' && e.agency.length > 0);
  check(`condition-type ${id} has severity (string)`, typeof e.severity === 'string');
  check(`condition-type ${id} has onFail (string > 5)`, typeof e.onFail === 'string' && e.onFail.length > 5);
  check(`condition-type ${id} verified=true`, e.verified === true);
  check(`condition-type ${id} priorityImportFromCN is boolean`, typeof e.priorityImportFromCN === 'boolean');
  check(`condition-type ${id} legalBasis is non-empty string`, typeof e.legalBasis === 'string' && e.legalBasis.trim().length > 0);
});

// 2026-10-03 (B): condition-triggered entries are NOT chapter-groups (no chapters field)
CONDITION_TYPES.forEach(id => {
  check(`condition-type ${id} has NO chapters field`, !('chapters' in d[id]));
  check(`condition-type ${id} has NO hsRange field`, !('hsRange' in d[id]));
  check(`condition-type ${id} has NO group field`, !('group' in d[id]));
});

// 2026-10-03 (B): condition-triggered matchPatterns are non-empty strings
CONDITION_TYPES.forEach(id => {
  const patterns = d[id].matchPatterns || [];
  const allStrings = patterns.every(p => typeof p === 'string' && p.trim().length > 0);
  check(`condition-type ${id} all matchPatterns are non-empty strings`, allStrings, patterns);
});

// 2026-10-03 (B): priorityImportFromCN distribution — all 20 procedure types have it
procTypes.forEach(id => {
  check(`procedure-type ${id} has priorityImportFromCN (boolean)`, typeof d[id].priorityImportFromCN === 'boolean');
});

// 2026-10-03 (B): all 6 condition-triggered can be resolved via getProcedures from inspectionTypes
// Note: 'te' already declared at line 185
// Find an entry that triggers each condition type via inspectionTypes or licenseTypes
const camNkEntry = Object.entries(te).find(([,e]) => e?.warnings?.usedGoodsImportBan);
if (camNkEntry) {
  const [code] = camNkEntry;
  const procs = getProcedures(te[code].warnings, code);
  check(`getProcedures(usedGoodsImportBan) resolves to cam-nk`, procs.some(p => p.code === 'cam-nk'), procs.map(p=>p.code));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
