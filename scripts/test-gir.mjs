#!/usr/bin/env node
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  determineGir,
  normalizeRuleKey,
  detectNumericalTieBreak,
  detectSubheadingNarrowing,
  GIR_RULES,
  BASIS,
} = require('../lib/gir.js');

let passed = 0;
let failed = 0;

function assert(name, cond, detail) {
  if (cond) {
    console.log('PASS', name);
    passed += 1;
  } else {
    console.log('FAIL', name, detail === undefined ? '' : JSON.stringify(detail));
    failed += 1;
  }
}

const rulesOf = (r) => r.determinations.map((d) => d.rule);
const find = (r, rule) => r.determinations.find((d) => d.rule === rule);

// --- Bất biến nền: không trích dẫn nào được thiếu căn cứ ----------------------

const ALL_CASES = [
  { description: 'máy bơm tháo rời', candidates: [{ hsCode: '84137090', confidence: 80 }], pickedHs: '84137090' },
  { description: 'hỗn hợp 60% cotton 40% polyester', candidates: [{ hsCode: '52081100', confidence: 70 }], pickedHs: '52081100' },
  { description: 'bộ dụng cụ đóng bộ bán lẻ', candidates: [{ hsCode: '82055900', confidence: 60 }], pickedHs: '82055900', isSet: true },
  { description: 'máy khoan kèm hộp đựng chuyên dùng', candidates: [{ hsCode: '84672100', confidence: 75 }], pickedHs: '84672100' },
];

for (const [i, c] of ALL_CASES.entries()) {
  const r = determineGir(c);
  const bad = r.determinations.filter((d) => !d.basis || !d.reasonVi || !d.rule);
  assert(`case ${i}: mọi trích dẫn đều có rule + basis + lý do`, bad.length === 0, bad);
  const unknownBasis = r.determinations.filter((d) => !Object.values(BASIS).includes(d.basis));
  assert(`case ${i}: basis nằm trong tập hợp lệ`, unknownBasis.length === 0, unknownBasis);
  assert(`case ${i}: luôn kèm disclaimer`, typeof r.disclaimer === 'string' && r.disclaimer.length > 50);
}

// --- Hồi quy lỗi cũ: GIR 2(a) KHÔNG được gắn vì khớp từ khoá đặc tính ---------
// Đây chính là bug đã sửa: gir-engine gắn 'GIR-2a' mỗi khi essentialCharacteristics
// khớp, trong khi 2(a) nói về hàng chưa lắp ráp.

const plain = determineGir({
  description: 'Máy bơm ly tâm 1HP đầu gang, điện 220V, hàng mới 100%',
  candidates: [{ hsCode: '84137090', confidence: 88 }, { hsCode: '84501100', confidence: 40 }],
  pickedHs: '84137090',
});
assert('hàng hoàn chỉnh KHÔNG bị gắn GIR 2(a)', !rulesOf(plain).includes('GIR 2(a)'), rulesOf(plain));
assert('hàng hoàn chỉnh KHÔNG bị gắn GIR 3(b)', !rulesOf(plain).includes('GIR 3(b)'), rulesOf(plain));

// --- GIR 2(a): chỉ khi thật sự chưa lắp ráp ----------------------------------
for (const d of ['Máy bơm dạng tháo rời', 'Xe tải bộ linh kiện CKD', 'Khung xe chưa hoàn chỉnh', 'pump semi-finished']) {
  const r = determineGir({ description: d, candidates: [{ hsCode: '84137090', confidence: 80 }], pickedHs: '84137090' });
  const g = find(r, 'GIR 2(a)');
  assert(`GIR 2(a) áp cho: "${d}"`, Boolean(g), rulesOf(r));
  if (g) assert(`GIR 2(a) kèm bằng chứng cụm từ: "${d}"`, Boolean(g.evidence?.matchedPhrase), g.evidence);
}

// --- GIR 2(b): hỗn hợp -------------------------------------------------------
const mix = determineGir({
  description: 'Vải hỗn hợp 60% cotton 40% polyester',
  candidates: [{ hsCode: '52081100', confidence: 70 }],
  pickedHs: '52081100',
});
assert('GIR 2(b) áp cho hàng hỗn hợp', rulesOf(mix).includes('GIR 2(b)'), rulesOf(mix));

// --- GIR 3(c): CHỈ khi hoà điểm VÀ mã chọn là mã sau cùng --------------------
const tieOk = determineGir({
  description: 'hàng khó phân định',
  candidates: [{ hsCode: '84139100', confidence: 70 }, { hsCode: '84137090', confidence: 69 }],
  pickedHs: '84139100',
});
assert('GIR 3(c) áp khi hoà điểm và chọn mã sau cùng', rulesOf(tieOk).includes('GIR 3(c)'), rulesOf(tieOk));
assert('GIR 3(c) có basis DETERMINISTIC', find(tieOk, 'GIR 3(c)')?.basis === BASIS.DETERMINISTIC);

const tieWrongPick = determineGir({
  description: 'hàng khó phân định',
  candidates: [{ hsCode: '84139100', confidence: 70 }, { hsCode: '84137090', confidence: 69 }],
  pickedHs: '84137090',
});
assert('KHÔNG trích 3(c) khi mã chọn không phải mã sau cùng', !rulesOf(tieWrongPick).includes('GIR 3(c)'), rulesOf(tieWrongPick));

const noTie = determineGir({
  description: 'hàng rõ ràng',
  candidates: [{ hsCode: '84139100', confidence: 90 }, { hsCode: '84137090', confidence: 40 }],
  pickedHs: '84139100',
});
assert('KHÔNG trích 3(c) khi chênh điểm lớn', !rulesOf(noTie).includes('GIR 3(c)'), rulesOf(noTie));

// --- GIR 6: chỉ khi so ≥2 phân nhóm cùng nhóm 4 số ---------------------------
const narrowed = determineGir({
  description: 'bơm',
  candidates: [{ hsCode: '84137090', confidence: 80 }, { hsCode: '84138190', confidence: 60 }],
  pickedHs: '84137090',
});
assert('GIR 6 áp khi so nhiều phân nhóm cùng nhóm', rulesOf(narrowed).includes('GIR 6'), rulesOf(narrowed));

const singleSub = determineGir({
  description: 'bơm',
  candidates: [{ hsCode: '84137090', confidence: 80 }, { hsCode: '85011010', confidence: 60 }],
  pickedHs: '84137090',
});
assert('KHÔNG trích GIR 6 khi chỉ có 1 phân nhóm trong nhóm', !rulesOf(singleSub).includes('GIR 6'), rulesOf(singleSub));

// --- GIR 4 là biện pháp CUỐI CÙNG -------------------------------------------
const lastResort = determineGir({
  description: 'mặt hàng lạ không mô tả được',
  candidates: [{ hsCode: '84137090', confidence: 50 }],
  pickedHs: '84137090',
  precedentDrove: true,
});
assert('GIR 4 áp khi không quy tắc nào khác áp được', rulesOf(lastResort).includes('GIR 4'), rulesOf(lastResort));

const precedentButAlsoOther = determineGir({
  description: 'máy bơm tháo rời',
  candidates: [{ hsCode: '84137090', confidence: 50 }],
  pickedHs: '84137090',
  precedentDrove: true,
});
assert(
  'KHÔNG trích GIR 4 khi đã có quy tắc khác áp được (4 là last resort)',
  !rulesOf(precedentButAlsoOther).includes('GIR 4'),
  rulesOf(precedentButAlsoOther),
);

// --- Bảng quyết định người soạn = căn cứ mạnh nhất ---------------------------
const fromTable = determineGir({
  description: 'sữa công thức cho trẻ sơ sinh',
  candidates: [{ hsCode: '19011010', confidence: 80 }],
  pickedHs: '19011010',
  resolver: {
    status: 'RESOLVED',
    gir: 'GIR 1',
    group: 'CF-dairy-infant-formula',
    decidedHs: '19011010',
    reasonVi: 'Chú giải Chương 19 loại trừ...',
    trace: [{ ruleId: 'R1', source: 'TT31/2022/TT-BTC' }],
  },
});
const tableDet = find(fromTable, 'GIR 1');
assert('bảng quyết định → basis RULE_TABLE', tableDet?.basis === BASIS.RULE_TABLE, tableDet?.basis);
assert('bảng quyết định → confidence high', tableDet?.confidence === 'high');
assert('bảng quyết định → giữ nguyên source văn bản gốc', tableDet?.source === 'TT31/2022/TT-BTC', tableDet?.source);

// --- LLM tự khai bị đánh dấu CHƯA KIỂM CHỨNG --------------------------------
const llmClaim = determineGir({
  description: 'hàng bình thường',
  candidates: [{ hsCode: '84137090', confidence: 80 }],
  pickedHs: '84137090',
  llmGir: 'GIR 3(a)',
});
const claimed = find(llmClaim, 'GIR 3(a)');
assert('LLM tự khai → basis LLM_ASSERTED', claimed?.basis === BASIS.LLM_ASSERTED, claimed?.basis);
assert('LLM tự khai → confidence low', claimed?.confidence === 'low');

// LLM khai trùng quy tắc đã có căn cứ mạnh hơn → không nhân đôi
const noDup = determineGir({
  description: 'máy bơm tháo rời',
  candidates: [{ hsCode: '84137090', confidence: 80 }],
  pickedHs: '84137090',
  llmGir: 'GIR 2(a)',
});
assert(
  'không nhân đôi khi LLM khai trùng quy tắc đã có căn cứ',
  noDup.determinations.filter((d) => d.rule === 'GIR 2(a)').length === 1,
  rulesOf(noDup),
);
assert(
  'giữ căn cứ mạnh hơn khi trùng',
  find(noDup, 'GIR 2(a)')?.basis !== BASIS.LLM_ASSERTED,
  find(noDup, 'GIR 2(a)')?.basis,
);

// --- normalizeRuleKey chịu được mọi cách viết -------------------------------
const keyCases = [
  ['GIR 3(b)', '3b'], ['GIR-3c', '3c'], ['gir3a', '3a'], ['3b', '3b'],
  ['GIR 1', '1'], ['GIR 1+6', '1'], ['linh tinh', null], [null, null], ['', null], ['GIR 9', null],
];
for (const [input, want] of keyCases) {
  assert(`normalizeRuleKey(${JSON.stringify(input)}) = ${want}`, normalizeRuleKey(input) === want, normalizeRuleKey(input));
}

// --- Mọi quy tắc trong registry phải có đủ nội dung -------------------------
for (const [k, r] of Object.entries(GIR_RULES)) {
  assert(`GIR_RULES[${k}] đủ id/titleVi/textVi`, Boolean(r.id && r.titleVi && r.textVi));
}

// --- Đầu vào rác không được làm sập ------------------------------------------
for (const bad of [undefined, {}, { description: null, candidates: null }, { candidates: [{}] }]) {
  let ok = true;
  try {
    const r = determineGir(bad);
    ok = Array.isArray(r.determinations);
  } catch {
    ok = false;
  }
  assert(`đầu vào rác không sập: ${JSON.stringify(bad)}`, ok);
}

assert('detectNumericalTieBreak trả null khi thiếu ứng viên', detectNumericalTieBreak([], '84137090') === null);
assert('detectSubheadingNarrowing trả null khi mã quá ngắn', detectSubheadingNarrowing([{ hsCode: '8413' }], '8413') === null);

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
