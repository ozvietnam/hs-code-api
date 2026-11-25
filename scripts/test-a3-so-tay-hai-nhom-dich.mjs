// OZV-2228 — ca thực địa "cảm biến quang e3sct11, điện áp 26v, nhận biết vật" (A3, 08:50 25/11):
// vòng 1 đứng đầu 903149, sổ tay 90.31 loại trừ "cảm biến quang" sang HAI nhóm đích (90.32 và 85.36)
// ⇒ HS_CHOT_SOM_CO_KIEM chặn dừng sớm ⇒ hoiTheoGiaThuyetNhomDich trên main trả null ⇒ tốn 39,3 s vòng 2
// rồi vẫn trả NEED_FACTS (HOI 903149) kèm câu hỏi loại trừ sang 90.32 và 85.36.
// Sửa: mọi tín hiệu chặn là so-tay-loai-tru và sổ tay nhóm đứng đầu loại trừ cùng cụm tên hàng sang ≥ 2 nhóm đích
// ⇒ giữ HOI tất định (không chọn nhóm thay khách), gộp câu hỏi từ questionVi của các loại trừ, 0 lượt vòng 2.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
for (const k of ['ZAI_WEB_FACTS', 'HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'HS_SO_TAY', 'HS_CLASSIFY_FAST_FIRST', 'R1_MAX_TOKENS', 'GIR_MAX_TOKENS', 'HS_CHOT_SOM_CO_KIEM', 'HS_HOI_THEO_SO_TAY', 'HS_EMBED_POOL']) {
  delete process.env[k];
}
process.env.CLASSIFY_BUDGET_MS = '285000';

const llmTier = require('../lib/llm-tier');
let script = [];
let llmCalls = [];
llmTier.callLLMJson = async (system, user, opts = {}) => {
  llmCalls.push({ r1: String(system).startsWith('VÒNG 1'), step: opts.step });
  const next = script.shift();
  if (next instanceof Error) throw next;
  return { json: JSON.parse(JSON.stringify(next)), provider: 'stub', model: 'stub' };
};
const ozSearch = require('../lib/oz-precedent-search.js');
let ozItems = [];
ozSearch.searchOzByKeyword = async () => ({ items: ozItems });
console.error = () => {};
console.warn = () => {};
const { classifyLoop, hoiTheoGiaThuyetNhomDich } = require('../lib/engine-loop.js');

let pass = 0;
let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 900)}`); }
};

// ───────── 1. Hàm thuần ─────────
const EE_9031 = {
  decision: 'HOI',
  hs: '903149',
  confidence: 60,
  reason: 'Hồ sơ thiếu dữ kiện quyết định mã: Loại cảm biến; Ngõ ra',
  questions: [{ fact: 'Loại cảm biến', question: 'Loại cảm biến là gì?', whereToFind: 'catalogue' }],
};
const HYP_2_DICH = [
  { chapter: '90', heading4: '9031', subheading6: '903149', confidence: 85 },
  { chapter: '90', heading4: '9032', subheading6: '903289', confidence: 10 },
  { chapter: '85', heading4: '8536', subheading6: '853650', confidence: 5 },
];
const HYP_0850 = [
  { chapter: '90', heading4: '9031', subheading6: '903149', confidence: 85 },
  { chapter: '85', heading4: '8541', subheading6: '854140', confidence: 12 },
  { chapter: '85', heading4: '8541', subheading6: '854149', confidence: 3 },
];
const ST_9031 = (nhom) => ({ ma: 'so-tay-loai-tru', nhom, chiTiet: `sổ tay nhóm 9031 loại trừ "cảm biến quang" sang nhóm ${nhom}` });

const d2Dich = hoiTheoGiaThuyetNhomDich({ hypotheses: HYP_2_DICH }, EE_9031, [ST_9031('9032'), ST_9031('8536')]);
check(
  'thuần (9031 → {9032, 8536}, R1 có giả thuyết ở cả 2 nhóm đích): trả HOI 903149, câu hỏi chứa cả 90.32 và 85.36 từ questionVi loại trừ',
  d2Dich?.decision === 'HOI'
    && d2Dich?.hs === '903149'
    && Array.isArray(d2Dich?.questions)
    && d2Dich.questions.some((q) => /90\.32/.test(q.question))
    && d2Dich.questions.some((q) => /85\.36/.test(q.question)),
  JSON.stringify(d2Dich),
);

const d0850 = hoiTheoGiaThuyetNhomDich({ hypotheses: HYP_0850 }, EE_9031, [ST_9031('9032'), ST_9031('8536')]);
check(
  'thuần (tái hiện log 08:50: R1 đứng đầu 903149, giả thuyết phụ ở 8541, sổ tay 90.31 rẽ "cảm biến quang" sang {9032, 8536}): trả HOI 903149 kèm câu hỏi cả 2 nhóm đích',
  d0850?.decision === 'HOI'
    && d0850?.hs === '903149'
    && d0850.questions.some((q) => /90\.32/.test(q.question))
    && d0850.questions.some((q) => /85\.36/.test(q.question)),
  JSON.stringify(d0850),
);

check(
  'thuần, CA NGƯỢC: có thêm tín hiệu tiền lệ Oz hoặc TB-TCHQ → null (đi vòng 2 như cũ)',
  hoiTheoGiaThuyetNhomDich({ hypotheses: HYP_2_DICH }, EE_9031, [ST_9031('9032'), ST_9031('8536'), { ma: 'tien-le-oz', nhom: '8536', chiTiet: '5 tờ khai Oz' }]) === null
    && hoiTheoGiaThuyetNhomDich({ hypotheses: HYP_2_DICH }, EE_9031, [ST_9031('9032'), ST_9031('8536'), { ma: 'tb-tchq', nhom: '8536', chiTiet: 'TB-TCHQ' }]) === null,
);

const EE_8541 = { decision: 'HOI', hs: '854140', confidence: 45, reason: 'thiếu dữ kiện', questions: [{ fact: 'x', question: 'x?' }] };
const ST_8541 = (nhom) => ({ ma: 'so-tay-loai-tru', nhom, chiTiet: `sổ tay nhóm 8541 loại trừ "cảm biến quang" sang nhóm ${nhom}` });
check(
  'thuần, CA NGƯỢC: nhóm đích không phải loại trừ có thật của sổ tay nhóm đứng đầu (8541 không loại trừ sang 9031) → null',
  hoiTheoGiaThuyetNhomDich({ hypotheses: [
    { chapter: '85', heading4: '8541', subheading6: '854140', confidence: 45 },
    { chapter: '90', heading4: '9031', subheading6: '903149', confidence: 40 },
    { chapter: '85', heading4: '8536', subheading6: '853650', confidence: 15 },
  ] }, EE_8541, [ST_8541('9031'), ST_8541('8536')]) === null,
);

// ───────── 2. Qua động cơ thật (LLM giả) ─────────
const HANG = { tenHang: 'cảm biến quang e3sct11, điện áp 26v, nhận biết vật' };
const R1 = (hyp) => ({
  product: {
    nameVi: 'Cảm biến quang E3SCT11',
    nameEn: 'E3S-CT11 photoelectric sensor',
    purpose: 'Nhận biết vật bằng tín hiệu quang điện',
    mechanism: 'điện',
    material: '',
    form: 'hoàn chỉnh',
    evidence: { purpose: 'nhận biết vật', mechanism: 'điện áp 26v' },
  },
  hypotheses: hyp.map((h) => ({ ...h, why: 'giả thuyết vòng 1' })),
  verify: {
    searchVi: ['cảm biến quang E3SCT11 26V'],
    codes8: ['90314990', '85414029'],
    unknowns: [
      'Loại cảm biến: khuếch đại, hồi xa khuếch đại hay thu phát',
      'Ngõ ra và nguồn cấp ngoài 26V có sẵn hay không',
    ],
  },
});
const R2_STUB = {
  decision: 'HOI',
  hs: '903149',
  confidence: 72,
  reason: 'vòng 2 giả',
  basis: [],
  conditions: [],
  alternatives: [{ hs: '853650', whyNot: 'chưa rõ rơ le quang điện' }],
  questions: [{ fact: 'ngõ ra', question: 'Đầu ra relay hay transistor?', whereToFind: 'catalogue' }],
};

async function run(r1, env, oz = []) {
  ozItems = oz;
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  script = [r1, R2_STUB, R2_STUB];
  llmCalls = [];
  let out;
  try { out = await classifyLoop(HANG, {}); } finally {
    for (const k of Object.keys(env)) delete process.env[k];
    ozItems = [];
  }
  return { out, gir: llmCalls.filter((c) => !c.r1).length, gates: out.engine?.gates || [] };
}

const tom = (r) => JSON.stringify({
  status: r.out.status,
  hs: r.out.results?.[0]?.hs,
  gir: r.gir,
  gates: r.gates,
  soTay: r.out.soTay && {
    outcome: r.out.soTay.outcome,
    daTra: r.out.soTay.daTra,
    lyDoChuaTra: r.out.soTay.lyDoChuaTra,
    nhanhToiUu: r.out.soTay.nhanhToiUu,
    ch: (r.out.soTay.challenges || []).map((c) => `${c.gate}:${c.target}`),
  },
  missing: r.out.missing,
});

const BAT = { HS_SO_TAY: 'full', HS_CHOT_SOM_CO_KIEM: 'on' };

const a = await run(R1(HYP_2_DICH), BAT);
check(
  'BẬT (R1 có giả thuyết 9031/9032/8536): sổ tay 90.31 chặn dừng sớm (chanChotSom chỉ so-tay-loai-tru, nhomTrai có 9032 và 8536)',
  a.gates.some((g) => g.lyDo === 'TIN_HIEU_TRAI_NHOM' && g.hs === '903149' && g.chanChotSom.join() === 'so-tay-loai-tru' && g.nhomTrai.includes('9032') && g.nhomTrai.includes('8536')),
  tom(a),
);
check(
  'BẬT (R1 có giả thuyết 9031/9032/8536): 0 lượt vòng 2, dừng sớm HOI 903149, status NEED_FACTS',
  a.gir === 0
    && a.gates.some((g) => g.earlyExitHoi === true && g.hs === '903149' && g.nguon === 'so-tay-loai-tru')
    && a.out.status === 'NEED_FACTS'
    && a.out.results?.[0]?.hs === '903149',
  tom(a),
);
check(
  'BẬT (R1 có giả thuyết 9031/9032/8536): câu hỏi gửi khách chứa cả điều kiện loại trừ sang 90.32 và 85.36',
  (a.out.missing || []).some((m) => /90\.32/.test(m)) && (a.out.missing || []).some((m) => /85\.36/.test(m)),
  tom(a),
);
const stA = a.out.soTay || {};
check(
  'BẬT (L11.2): soTay ghi nhánh hoiTheoGiaThuyetNhomDich, congSoTayG8 DA_CHAY, aiDocSoTayVaChuGiai + giaiTrinhSoTay CHUA_CHAY, outcome UNRESOLVED, đủ 2 challenges 9032/8536',
  stA.nhanhToiUu?.ten === 'hoiTheoGiaThuyetNhomDich'
    && stA.nhanhToiUu.congSoTayG8 === 'DA_CHAY'
    && stA.nhanhToiUu.aiDocSoTayVaChuGiai === 'CHUA_CHAY'
    && stA.nhanhToiUu.giaiTrinhSoTay === 'CHUA_CHAY'
    && stA.daTra === false
    && stA.lyDoChuaTra === 'hoiTheoGiaThuyetNhomDich'
    && stA.outcome === 'UNRESOLVED'
    && (stA.challenges || []).length === 2,
  tom(a),
);

const b0850 = await run(R1(HYP_0850), { ...BAT, HS_HOI_THEO_SO_TAY: 'on' });
check(
  'BẬT (tái hiện đúng lượt prod 08:50: HYP=[903149, 854140, 854149] + HS_HOI_THEO_SO_TAY=on): 0 lượt vòng 2, NEED_FACTS, hỏi cả 90.32 và 85.36',
  b0850.gir === 0
    && b0850.out.status === 'NEED_FACTS'
    && b0850.out.soTay?.nhanhToiUu?.ten === 'hoiTheoGiaThuyetNhomDich'
    && (b0850.out.missing || []).some((m) => /90\.32/.test(m))
    && (b0850.out.missing || []).some((m) => /85\.36/.test(m)),
  tom(b0850),
);

const cNguoc = await run(R1(HYP_2_DICH), BAT, [
  { hsCode: '85365099', tenHang: 'Cảm biến quang E3S-CT11 26V nhận biết vật', matchCoverage: 85, ozCount: 5 },
]);
check(
  'BẬT, CA NGƯỢC: có tín hiệu tiền lệ Oz trái nhóm (8536) → KHÔNG dừng sớm, đi vòng 2 (≥1 lượt AI)',
  cNguoc.gir >= 1
    && cNguoc.gates.some((g) => g.lyDo === 'TIN_HIEU_TRAI_NHOM' && g.chanChotSom.includes('tien-le-oz'))
    && !cNguoc.gates.some((g) => g.earlyExitHoi === true),
  tom(cNguoc),
);

const dTat = await run(R1(HYP_2_DICH), { HS_SO_TAY: 'full' });
check(
  'TẮT công tắc HS_CHOT_SOM_CO_KIEM: không có chanChotSom, không có nhánh hoiTheoGiaThuyetNhomDich (hành vi cũ)',
  !dTat.gates.some((g) => 'chanChotSom' in g || g.nguon === 'so-tay-loai-tru') && !dTat.out.soTay?.nhanhToiUu,
  tom(dTat),
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
