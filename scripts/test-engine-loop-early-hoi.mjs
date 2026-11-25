// OZV-1269: early-exit HOI khi gonDauRa + vòng 1 đã khai unknowns — bỏ lời GIR, NEED_FACTS ngay.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
for (const k of ['ZAI_WEB_FACTS', 'HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'HS_SO_TAY', 'HS_CLASSIFY_FAST_FIRST', 'R1_MAX_TOKENS', 'GIR_MAX_TOKENS']) {
  delete process.env[k];
}
// OZV-1314: bài này đo early-exit HOI, không đo trần 85 s — ghim ngân sách cũ để timeoutMs không lệch kịch bản.
process.env.CLASSIFY_BUDGET_MS = '285000';

const llmTier = require('../lib/llm-tier');
let script = [];
let llmCalls = [];
llmTier.callLLMJson = async (system, user, opts = {}) => {
  llmCalls.push({ r1: String(system).startsWith('VÒNG 1'), step: opts.step, user: String(user).slice(0, 80) });
  const next = script.shift();
  if (next instanceof Error) throw next;
  return { json: typeof next === 'function' ? next(user, system) : JSON.parse(JSON.stringify(next)), provider: 'stub', model: 'stub' };
};
console.error = () => {};
console.warn = () => {};
const { classifyLoop, earlyExitHoiTuR1 } = require('../lib/engine-loop.js');

let pass = 0;
let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); }
  else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 500)}`); }
};

const SMC = { tenHang: 'giác hút chân không smc zp-905-08eu' };
const R1_SMC = {
  product: {
    nameVi: 'giác hút chân không SMC', nameEn: 'SMC vacuum pad', purpose: 'hút chi tiết trong dây chuyền',
    mechanism: 'khí nén', material: 'cao su', evidence: {},
  },
  hypotheses: [{ chapter: '40', heading4: '4016', subheading6: '401699', why: 'phụ kiện cao su khác', confidence: 78 }],
  verify: {
    searchVi: ['giác hút SMC'], codes8: ['40169999', '40169390'],
    unknowns: ['chất liệu đế hút (NBR/silicon/…)', 'có phải linh kiện máy hoàn chỉnh không'],
  },
};
const R1_RO = {
  ...R1_SMC,
  verify: { searchVi: ['giác hút SMC'], codes8: ['40169999'], unknowns: [] },
};
const CHOT = {
  decision: 'CHOT', hs: '40169999', confidence: 80, reason: 'phụ kiện cao su',
  basis: [{ stream: 'SAN_PHAM', claim: 'cao su', evidence: 'giác hút' }], conditions: [], alternatives: [], questions: [],
};

check('earlyExitHoiTuR1: có unknowns → HOI + hs 6 số từ giả thuyết', (() => {
  const ee = earlyExitHoiTuR1(R1_SMC);
  return ee && ee.decision === 'HOI' && ee.hs === '401699' && ee.questions.length === 2;
})(), JSON.stringify(earlyExitHoiTuR1(R1_SMC)));

check('earlyExitHoiTuR1: unknowns rỗng → null (gọi GIR như cũ)', earlyExitHoiTuR1(R1_RO) === null);

async function run(r1, { env = {}, opts = {}, r2 = CHOT } = {}) {
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  script = [r1, r2];
  llmCalls = [];
  let out;
  try { out = await classifyLoop(SMC, opts); }
  finally { for (const k of Object.keys(env)) delete process.env[k]; }
  return { out, llm: llmCalls, girCalls: llmCalls.filter((c) => !c.r1).length };
}

const ee = await run(R1_SMC, { env: {} }); // gon mặc định BẬT
check('gon + unknowns → NEED_FACTS không gọi lời GIR', ee.out.status === 'NEED_FACTS' && ee.girCalls === 0, JSON.stringify({ status: ee.out.status, gir: ee.girCalls, gates: ee.out.engine?.gates?.slice(-2) }));
check('gon + unknowns → earlyExitHoi trong gates', (ee.out.engine?.gates || []).some((g) => g.earlyExitHoi === true), JSON.stringify(ee.out.engine?.gates?.slice(-3)));
check('gon + unknowns → câu hỏi từ unknowns', (ee.out.nextAction?.questions || []).length >= 1, JSON.stringify(ee.out.nextAction));
check('gon + unknowns → hs thuộc 4016*', (ee.out.results?.[0]?.hs || '').startsWith('4016') || (ee.out.engine?.gates || []).some((g) => String(g.hs || '').startsWith('4016')), JSON.stringify(ee.out.results?.[0]));

const off = await run(R1_SMC, { env: { HS_GON_DAU_RA: 'off' }, r2: {
  decision: 'HOI', hs: '401699', confidence: 50, reason: 'thiếu chất liệu',
  basis: [], conditions: [], alternatives: [],
  questions: [{ fact: 'chất liệu', question: 'Chất liệu đế hút?', whereToFind: 'catalogue' }],
} });
// OZV-1320: gon=off → buộc leo GIR; sau HOI cùng nhánh high, trade-synonyms có thể đôn (REVIEW).
// Ca giác hút NEED_FACTS bắt buộc nằm ở earlyExit+unknowns (PASS phía trên), không phải gon=off.
check('gon=off + unknowns → vẫn gọi GIR (1 lời)', off.girCalls === 1, JSON.stringify({ gir: off.girCalls, status: off.out.status, hs: off.out.results?.[0]?.hs }));
check('gon=off + unknowns → không earlyExitHoi', !(off.out.engine?.gates || []).some((g) => g.earlyExitHoi === true), JSON.stringify(off.out.engine?.gates?.slice(-3)));

const ro = await run(R1_RO, { r2: CHOT });
check('gon + unknowns rỗng → gọi GIR như cũ (chốt)', ro.girCalls === 1 && ro.out.status !== 'NEED_FACTS', JSON.stringify({ gir: ro.girCalls, status: ro.out.status, hs: ro.out.results?.[0]?.hs }));

// OZV-1320: earlyExit HOI 848190 bị sổ tay thách thức → vẫn gọi GIR, chốt 84812011
const ZONYE = { tenHang: 'bộ lọc khí zonye ar2000 -02' };
const R1_ZONYE = {
  product: {
    nameVi: 'bộ lọc khí AR2000-02',
    nameEn: 'Air Filter Regulator / Pneumatic Filter',
    purpose: 'lọc khí nén, tách nước và tạp chất trong hệ thống khí nén',
    mechanism: 'không áp dụng',
    material: 'hợp kim nhôm, nhựa',
    form: 'hoàn chỉnh',
    brand: 'Zonye',
    model: 'AR2000-02',
    evidence: {},
  },
  hypotheses: [
    { chapter: '84', heading4: '8481', subheading6: '848190', why: 'phụ tùng van', confidence: 90 },
    { chapter: '84', heading4: '8414', subheading6: '841480', why: 'máy', confidence: 10 },
  ],
  verify: {
    searchVi: ['bộ lọc khí nén AR2000'],
    codes8: ['84819000', '84812011'],
    unknowns: ['Chất liệu vỏ chính', 'Có tích hợp van điều áp (regulator) hay chỉ lọc khí đơn thuần'],
  },
};
const CHOT_ZONYE = {
  decision: 'CHOT', hs: '84812011', confidence: 88,
  reason: 'AR = van điều áp khí nén truyền động — 8481.20.11',
  basis: [{ stream: 'SAN_PHAM', claim: 'điều áp khí nén', evidence: 'zonye ar2000' }],
  conditions: [], alternatives: [], questions: [],
};
async function runZonye(r1, { env = {}, opts = {}, r2 = CHOT_ZONYE } = {}) {
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  script = [r1, r2];
  llmCalls = [];
  let out;
  try { out = await classifyLoop(ZONYE, opts); }
  finally { for (const k of Object.keys(env)) delete process.env[k]; }
  return { out, llm: llmCalls, girCalls: llmCalls.filter((c) => !c.r1).length };
}
const zonye = await runZonye(R1_ZONYE, { env: { HS_SO_TAY: 'full' } });
check('OZV-1320 Zonye: sổ tay chặn earlyExit → vẫn gọi GIR', zonye.girCalls === 1, JSON.stringify({ gir: zonye.girCalls, gates: zonye.out.engine?.gates?.slice(-3) }));
check('OZV-1320 Zonye: không earlyExitHoi=true', !(zonye.out.engine?.gates || []).some((g) => g.earlyExitHoi === true), JSON.stringify(zonye.out.engine?.gates?.slice(-3)));
check('OZV-1320 Zonye: chốt 84812011 (không NEED_FACTS 848190)', zonye.out.status !== 'NEED_FACTS' && (zonye.out.results?.[0]?.hs || '') === '84812011', JSON.stringify({ status: zonye.out.status, hs: zonye.out.results?.[0]?.hs }));

// ── OZV-1380: earlyExitHoi bỏ R2 khi R1 đủ câu hỏi, chỉ vướng NHOM_CHUA_KIEM ──
// Mẫu R1 THẬT (prod /api/classify?debug=1 18/11, gemini-free, dossier.hypotheses + dossier.unknowns): unknowns là CHUỖI.
const BO_MACH = { tenHang: 'bo mạch điện tử chưa lắp ráp đầy đủ linh kiện' };
const UNK_BO_MACH = [
  'Thành phần vật liệu chính của mạch in (một mặt, hai mặt hay nhiều lớp)',
  'Đã được gắn các linh kiện chưa hay chỉ mới là mạch in cơ bản',
];
const r1BoMach = (hyp, codes8 = ['85340010']) => ({
  product: { nameVi: BO_MACH.tenHang, purpose: '', mechanism: '', material: '', evidence: {} },
  hypotheses: [hyp],
  verify: { searchVi: ['bo mạch'], notesChapters: [], codes8, unknowns: UNK_BO_MACH },
});
const R1_BO_MACH_THAT = r1BoMach({ chapter: '85', heading4: '8534', subheading6: '853400', why: 'mạch in nhóm 8534', confidence: 95 });
const R2_HOI_BO_MACH = {
  decision: 'HOI', hs: '853400', confidence: 50, reason: 'thiếu dữ kiện', basis: [], conditions: [], alternatives: [],
  questions: [{ fact: 'linh kiện', question: 'Đã gắn linh kiện chưa?', whereToFind: 'ảnh' }],
};
async function runCa(raw, r1, { env = {}, r2 = R2_HOI_BO_MACH } = {}) {
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  script = [r1, r2];
  llmCalls = [];
  let out;
  try { out = await classifyLoop(raw, { debug: true }); }
  finally { for (const k of Object.keys(env)) delete process.env[k]; }
  return { out, girCalls: llmCalls.filter((c) => !c.r1).length, gates: out.engine?.gates || [] };
}

check('OZV-1380 earlyExitHoiTuR1: unknowns dạng chuỗi (R1 thật bo mạch) → HOI 853400, 2 câu hỏi', (() => {
  const ee = earlyExitHoiTuR1(R1_BO_MACH_THAT);
  return ee && ee.decision === 'HOI' && ee.hs === '853400' && ee.questions.length === 2 && ee.questions[0].question === UNK_BO_MACH[0];
})(), JSON.stringify(earlyExitHoiTuR1(R1_BO_MACH_THAT)));

check('OZV-1380 earlyExitHoiTuR1: unknowns dạng object {fact|question} → câu hỏi đúng chữ, không "[object Object]"', (() => {
  const r1 = { ...R1_BO_MACH_THAT, verify: { ...R1_BO_MACH_THAT.verify, unknowns: [{ fact: UNK_BO_MACH[0] }, { question: UNK_BO_MACH[1] }, {}] } };
  const ee = earlyExitHoiTuR1(r1);
  return ee && ee.questions.length === 2 && ee.questions[0].fact === UNK_BO_MACH[0] && ee.questions[1].fact === UNK_BO_MACH[1]
    && !JSON.stringify(ee).includes('[object Object]');
})(), JSON.stringify(earlyExitHoiTuR1({ ...R1_BO_MACH_THAT, verify: { unknowns: [{ fact: 'a' }, {}] } })));

check('OZV-1380 earlyExitHoiTuR1: chỉ có chương 2 số → null (không rơi về mã 2 số)', [
  r1BoMach({ chapter: '85', heading4: '85', subheading6: '', confidence: 60 }),
  r1BoMach({ chapter: '85', confidence: 60 }),
  r1BoMach({ chapter: '85', heading4: '853', subheading6: '8534', confidence: 60 }),
].every((r1) => earlyExitHoiTuR1(r1) === null));

check('OZV-1380 earlyExitHoiTuR1: chỉ có nhóm 4 số (nhóm nhiều phân nhóm) → HOI 4 số (cổng G1 sẽ chặn → R2)', earlyExitHoiTuR1(r1BoMach({ chapter: '84', heading4: '8471', confidence: 60 }))?.hs === '8471');

// Ca R1 có thật trên prod: giả thuyết dẫn đầu không khai heading4 (chỉ subheading6) còn codes8 trỏ nhóm khác → hồ sơ vụ việc
// vòng 1 chưa có nhóm 8534 → cổng NHOM_CHUA_KIEM chặn earlyExitHoi → trước OZV-1380 tốn R2 (81–118 s thực địa).
const R1_BO_MACH_LECH = r1BoMach({ chapter: '85', subheading6: '853400', why: 'mạch in', confidence: 70 }, ['84733010']);
const lech = await runCa(BO_MACH, R1_BO_MACH_LECH);
check('OZV-1380 bo mạch: NHOM_CHUA_KIEM → máy nạp nhóm tất định, KHÔNG gọi R2', lech.girCalls === 0 && lech.out.status === 'NEED_FACTS',
  JSON.stringify({ gir: lech.girCalls, status: lech.out.status, gates: lech.gates.filter((g) => g.round) }));
check('OZV-1380 bo mạch: log có bước nạp nhóm 8534 (gather thật) rồi earlyExitHoi=true',
  lech.gates.some((g) => g.tatDinh === 'NHOM_CHUA_KIEM' && g.buoc === 'earlyExitHoi' && g.nhom === '8534' && g.blocks.length === 0)
  && lech.gates.some((g) => g.earlyExitHoi === true && g.hs === '853400'),
  JSON.stringify(lech.gates.filter((g) => g.round)));
check('OZV-1380 bo mạch: rounds = 1 (chỉ R1), hs 853400', lech.out.engine?.rounds === 1 && (lech.out.results?.[0]?.hs || '').startsWith('8534'),
  JSON.stringify({ rounds: lech.out.engine?.rounds, hs: lech.out.results?.[0]?.hs }));

// Cổng NHOM_CHUA_KIEM KHÔNG bị lách: nhóm 8415 bị từ điển thương mại loại hẳn (may-lam-mat-bay-hoi avoid 8415) → gather
// không nạp được 8415 dù đã vào usedHeadings → cổng vẫn chặn → leo R2 như cũ (bản #1435 chèn tay headings sẽ lọt).
const QUAT = { tenHang: 'quạt điều hòa hơi nước' };
const R1_QUAT = {
  product: { nameVi: 'quạt điều hòa hơi nước', purpose: 'làm mát', mechanism: 'bay hơi', material: '', evidence: {} },
  hypotheses: [{ chapter: '84', heading4: '8415', subheading6: '841510', why: 'điều hòa', confidence: 60 }],
  verify: { searchVi: ['quạt điều hòa'], notesChapters: [], codes8: [], unknowns: ['có máy nén và gas lạnh không'] },
};
const quat = await runCa(QUAT, R1_QUAT, { r2: { ...CHOT, hs: '84796000', reason: 'máy làm mát bay hơi', basis: [{ stream: 'SAN_PHAM', claim: 'bay hơi', evidence: 'quạt hơi nước' }] } });
check('OZV-1380 không lách cổng: nhóm gather không nạp được → vẫn gọi R2, không earlyExitHoi=true',
  quat.girCalls === 1 && !quat.gates.some((g) => g.earlyExitHoi === true),
  JSON.stringify({ gir: quat.girCalls, gates: quat.gates.filter((g) => g.round) }));

// ── OZV-1384: earlyExitHoi không leo R2 vì MA_KHONG_TON_TAI khi giả thuyết R1 chỉ đúng tới nhóm 4 số ──
// Đo A3 18/11 (docs/a3-do-lai-sau-1431-2026-11-18.md ca 5, minimax): `earlyExitHoi false (MA_KHONG_TON_TAI)` → R2 ~32 s llmMs.
// Biểu: 8534 chỉ có MỘT phân nhóm 853400 (85340010/20/30/90); 853410 không có; 8471 có 8 phân nhóm, 847199 không có;
// 8599 không là nhóm có thật. Tầng sau (validateClassifyResults, lib/classify.js) loại mã 4 số (BAD_LENGTH) → không trả HOI 4 số.
const eeMot = (hyp) => earlyExitHoiTuR1(r1BoMach(hyp))?.hs;
check('OZV-1384 earlyExitHoiTuR1: subheading6 không có trong biểu + nhóm chỉ có 1 phân nhóm → dùng phân nhóm duy nhất 853400',
  eeMot({ chapter: '85', heading4: '8534', subheading6: '853410', confidence: 70 }) === '853400',
  eeMot({ chapter: '85', heading4: '8534', subheading6: '853410', confidence: 70 }));
check('OZV-1384 earlyExitHoiTuR1: chỉ heading4 8534 (subheading6 rỗng) → 853400',
  eeMot({ chapter: '85', heading4: '8534', subheading6: '', confidence: 70 }) === '853400');
check('OZV-1384 earlyExitHoiTuR1: subheading6 có thật → giữ nguyên (không đổi)', earlyExitHoiTuR1(R1_BO_MACH_THAT)?.hs === '853400');
check('OZV-1384 earlyExitHoiTuR1: nhóm nhiều phân nhóm + subheading6 sai → giữ hành vi cũ (847199, cổng chặn → R2)',
  eeMot({ chapter: '84', heading4: '8471', subheading6: '847199', confidence: 70 }) === '847199');
check('OZV-1384 earlyExitHoiTuR1: nhóm + phân nhóm đều không có trong biểu → giữ hành vi cũ (859910)',
  eeMot({ chapter: '85', heading4: '8599', subheading6: '859910', confidence: 70 }) === '859910');

// (a) chạy cả vòng: R1 MiniMax chỉ đúng tới nhóm 8534 → NEED_FACTS ở R1, rounds = 1, không gọi R2.
for (const [ten, hyp] of [
  ['subheading6 sai (853410), heading4 8534', { chapter: '85', heading4: '8534', subheading6: '853410', why: 'mạch in', confidence: 70 }],
  ['chỉ heading4 8534 (subheading6 rỗng)', { chapter: '85', heading4: '8534', subheading6: '', why: 'mạch in', confidence: 70 }],
]) {
  const ca = await runCa(BO_MACH, r1BoMach(hyp));
  check(`OZV-1384 (a) ${ten} → NEED_FACTS, không gọi R2`, ca.girCalls === 0 && ca.out.status === 'NEED_FACTS',
    JSON.stringify({ gir: ca.girCalls, status: ca.out.status, gates: ca.gates.filter((g) => g.round) }));
  check(`OZV-1384 (a) ${ten} → rounds = 1, earlyExitHoi=true, results[0].hs 853400, có câu hỏi`,
    ca.out.engine?.rounds === 1 && ca.gates.some((g) => g.earlyExitHoi === true && g.hs === '853400')
      && ca.out.results?.[0]?.hs === '853400' && (ca.out.nextAction?.questions || []).length >= 1,
    JSON.stringify({ rounds: ca.out.engine?.rounds, hs: ca.out.results?.[0]?.hs, gates: ca.gates.filter((g) => g.round), na: ca.out.nextAction }));
}

// (b) nhóm không có trong biểu, hoặc nhóm nhiều phân nhóm mà phân nhóm R1 sai → vẫn leo R2 như cũ.
for (const [ten, hyp] of [
  ['heading4 8599 không có trong biểu', { chapter: '85', heading4: '8599', subheading6: '859910', why: 'bịa', confidence: 70 }],
  ['8471 nhiều phân nhóm, subheading6 847199 sai', { chapter: '84', heading4: '8471', subheading6: '847199', why: 'máy tính', confidence: 70 }],
]) {
  const caB = await runCa(BO_MACH, r1BoMach(hyp));
  check(`OZV-1384 (b) ${ten} → vẫn gọi R2, earlyExitHoi=false MA_KHONG_TON_TAI`,
    caB.girCalls === 1 && caB.gates.some((g) => g.earlyExitHoi === false && /MA_KHONG_TON_TAI/.test(g.lyDo || '')),
    JSON.stringify({ gir: caB.girCalls, gates: caB.gates.filter((g) => g.round) }));
}

// (c) G1 không đổi: mã 4 số bị chặn ở cả CHỐT lẫn HOI (gates() không có ngoại lệ mới).
const { gates: gatesFn } = require('../lib/engine-loop.js');
const gCtx = { source: BO_MACH.tenHang, productText: BO_MACH.tenHang, gathered: { headings: ['8534'] }, machinery: false, round: 2 };
for (const decision of ['CHOT', 'HOI']) {
  const g4 = gatesFn({ decision, hs: '8534', basis: [] }, gCtx);
  check(`OZV-1384 (c) ${decision} hs 4 số → G1 vẫn chặn MA_KHONG_TON_TAI`, g4.blocks.some((b) => b.gate === 'MA_KHONG_TON_TAI'), JSON.stringify(g4.blocks));
}

// ── OZV-1389: cổng G6 made-in-china (NHA_SAN_XUAT_KHAC_NHOM) không đẩy ca HOI earlyExit lên R2 ──
// Đo bản thật 08:41 18/11: bo mạch → log `{round:2, earlyExitHoi:false, lyDo:'NHA_SAN_XUAT_KHAC_NHOM'}`, R2 thừa 23,9 s.
// gathered.mic.consensus = 8537 (2 shop, query "Partially assembled electronic circuit board" — cả hai là tủ điện: nhiễu chữ "board").
{
  const micMod = require('../lib/mic-lookup.js');
  const savedMic = micMod.micLookup;
  const PG = (shop, hsCode, name) => ({ shop, url: `https://${shop}.en.made-in-china.com/product/x/y.html`, name, hsCode, props: {} });
  micMod.micLookup = async (q) => ({ query: q, searched: true, pages: [PG('swgear1', '8537109000', 'Electrical Switchgear Board'), PG('swgear2', '8537101000', 'Distribution Board Cabinet')], consensus: null });
  const r1Mic = { ...R1_BO_MACH_THAT, product: { ...R1_BO_MACH_THAT.product, nameEn: 'Partially assembled electronic circuit board' } };
  try {
    // (a) HOI earlyExit + MIC khác nhóm → vẫn earlyExitHoi, rounds 1, không gọi R2; cảnh báo MIC vẫn được ghi.
    const caMic = await runCa(BO_MACH, r1Mic);
    const micDaChay = caMic.out.dossier?.mic?.consensus?.heading4 === '8537' || JSON.stringify(caMic.out).includes('8537');
    check('OZV-1389 (a) tiền đề: stub made-in-china tạo đồng thuận nhóm 8537', micDaChay, JSON.stringify(caMic.out.dossier?.mic || null).slice(0, 300));
    check('OZV-1389 (a) HOI + MIC khác nhóm → earlyExitHoi=true, rounds 1, không gọi R2, NEED_FACTS',
      caMic.girCalls === 0 && caMic.out.engine?.rounds === 1 && caMic.out.status === 'NEED_FACTS'
        && caMic.gates.some((g) => g.earlyExitHoi === true && g.hs === '853400')
        && !caMic.gates.some((g) => /NHA_SAN_XUAT_KHAC_NHOM/.test(g.lyDo || '')),
      JSON.stringify({ gir: caMic.girCalls, rounds: caMic.out.engine?.rounds, status: caMic.out.status, gates: caMic.gates.filter((g) => g.round) }));
  } finally { micMod.micLookup = savedMic; }

  // (b) Đường CHỐT 8 số + MIC khác nhóm chưa giải trình → vẫn chặn NHA_SAN_XUAT_KHAC_NHOM (kể cả khi lỡ mang cờ earlyHoi).
  const micGathered = { headings: ['8534'], mic: { consensus: { heading4: '8537', shops: 2 } } };
  const gMicCtx = { source: BO_MACH.tenHang, productText: BO_MACH.tenHang, gathered: micGathered, machinery: true, round: 2 };
  const CHOT_BO_MACH = { decision: 'CHOT', hs: '85340020', confidence: 80, reason: 'mạch in hai mặt', basis: [], conditions: [], alternatives: [], questions: [] };
  for (const [ten, ctx, ans] of [
    ['CHỐT 85340020, round 2', gMicCtx, CHOT_BO_MACH],
    ['CHỐT 85340020 mang cờ earlyHoi', { ...gMicCtx, earlyHoi: true }, CHOT_BO_MACH],
    ['HOI 853400 KHÔNG qua earlyExitHoi (vòng R2 thường)', gMicCtx, { ...R2_HOI_BO_MACH }],
  ]) {
    const gB = gatesFn(ans, ctx);
    check(`OZV-1389 (b) ${ten} → vẫn chặn NHA_SAN_XUAT_KHAC_NHOM`, gB.blocks.some((b) => b.gate === 'NHA_SAN_XUAT_KHAC_NHOM'), JSON.stringify(gB.blocks.map((b) => b.gate)));
  }
  const gHoi = gatesFn({ ...R2_HOI_BO_MACH }, { ...gMicCtx, earlyHoi: true });
  check('OZV-1389 (b) HOI 853400 + earlyHoi → không chặn G6, có cảnh báo made-in-china 8537',
    !gHoi.blocks.some((b) => b.gate === 'NHA_SAN_XUAT_KHAC_NHOM') && gHoi.warnings.some((w) => /made-in-china.*8537/.test(w)),
    JSON.stringify({ blocks: gHoi.blocks.map((b) => b.gate), warnings: gHoi.warnings }));
}

// ── OZV-1707: kiểm phân nhóm 6 số trên nhánh earlyExitHoi (tất định trước, LLM sau) + soTay.outcome CHUA_TRA / DA_TRA_KHONG_NGHI ──
{
  const { kiemPhanNhomEarlyHoi } = require('../lib/engine-loop.js');
  const { doGiongTenHang } = require('../lib/giong-ten-hang.js');
  const { precedentsData } = require('../lib/data.js');
  const VAN_52 = { tenHang: 'Van điện từ khí nén 5/2 thân nhôm, cổng ren 1/4 inch, dùng điều khiển xi lanh khí nén' };
  const R1_VAN_52 = {
    product: {
      nameVi: 'van điện từ khí nén 5/2',
      nameEn: '5/2 pneumatic solenoid valve',
      purpose: 'điều khiển xi lanh khí nén',
      mechanism: 'điện từ - khí nén',
      material: 'nhôm',
      form: 'hoàn chỉnh',
      evidence: {},
    },
    hypotheses: [
      { chapter: '84', heading4: '8481', subheading6: '848180', why: 'van điện từ thuộc thiết bị khác', confidence: 90 },
      { chapter: '84', heading4: '8412', subheading6: '841239', why: 'bộ truyền động khí nén', confidence: 10 },
    ],
    verify: {
      searchVi: ['van điện từ khí nén 5/2'],
      notesChapters: ['84'],
      codes8: ['84818099'],
      unknowns: [
        'Nguồn điện và điện áp cuộn dây',
        'Áp suất vận hành và lưu lượng',
        'Số cuộn dây: đơn hay kép',
      ],
    },
  };
  const caVan = await runCa(VAN_52, R1_VAN_52, { env: { HS_SO_TAY: 'full' } });
  check('OZV-1707 van khí nén 5/2: R1 đoán 848180 + unknowns → kiemPhanNhomEarlyHoi đổi tất định sang 848120',
    caVan.girCalls === 0
      && caVan.gates.some((g) => g.kiemPhanNhomEarlyHoi === 'DOI_PHAN_NHOM' && g.tu === '848180' && g.den === '848120')
      && (caVan.out.results?.[0]?.hs || '').startsWith('848120'),
    JSON.stringify({ gir: caVan.girCalls, hs: caVan.out.results?.[0]?.hs, gates: caVan.gates.filter((g) => g.round) }));
  check('OZV-1707 soTay.outcome: đã tra sổ tay nhóm 8481 và không nghi → DA_TRA_KHONG_NGHI (không còn NONE mập mờ)',
    caVan.out.soTay?.outcome === 'DA_TRA_KHONG_NGHI',
    JSON.stringify(caVan.out.soTay));

  // Kiểm riêng đường tiền lệ TB-TCHQ 851/852 khi không có tradeHints (tiêu đề phân nhóm 6 số + TB-TCHQ cùng trỏ 848120):
  const kpnSoTay = kiemPhanNhomEarlyHoi({
    ee: { hs: '848180' },
    r1: R1_VAN_52,
    raw: VAN_52,
    gathered: { headings: ['8481'], tradeHints: null, ozPrecedents: [] },
    product: R1_VAN_52.product,
    productText: VAN_52.tenHang,
  });
  check('OZV-1707 kiemPhanNhomEarlyHoi (không tradeHints): tiền lệ TB-TCHQ 851/852 + tiêu đề phân nhóm 6 số đổi 848180 → 848120',
    kpnSoTay.ok === true && kpnSoTay.hs6 === '848120' && kpnSoTay.nguon === 'tien-le-tb-tchq',
    JSON.stringify(kpnSoTay));

  // OZV-2242 (#1870): khớp chữ tên phân nhóm anh em đơn độc (không có tiền lệ/bảng/từ điển xác nhận phân nhóm anh em đó)
  // → không tự ghi đè lựa chọn vòng 1, trả ok=false (SO_TAY_PHAN_NHOM_6_NGHI) để leo vòng 2 LLM:
  const kpnDonDoc = kiemPhanNhomEarlyHoi({
    ee: { hs: '320419' },
    r1: {
      product: { nameVi: 'Thuốc màu hữu cơ dạng lỏng', purpose: 'tạo màu trong dung môi', material: 'hợp chất màu hữu cơ tổng hợp tan trong dung môi' },
      hypotheses: [{ chapter: '32', heading4: '3204', subheading6: '320419', confidence: 90 }],
    },
    raw: { tenHang: 'Thuốc màu hữu cơ dạng lỏng MCF18, dùng tạo màu cho dung môi' },
    gathered: { headings: ['3204'], tradeHints: null, ozPrecedents: [] },
    product: { nameVi: 'Thuốc màu hữu cơ dạng lỏng', form: 'hoàn chỉnh' },
    productText: 'Thuốc màu hữu cơ dạng lỏng MCF18, dùng tạo màu cho dung môi',
  });
  check('OZV-2242 (#1870) kiemPhanNhomEarlyHoi: khớp chữ tên đơn độc (320417 khớp "thuốc màu" khi R1 chọn 320419) → ok=false (SO_TAY_PHAN_NHOM_6_NGHI) để leo vòng 2, không tự đổi sang 320417',
    kpnDonDoc.ok === false && kpnDonDoc.lyDo === 'SO_TAY_PHAN_NHOM_6_NGHI',
    JSON.stringify(kpnDonDoc));

  const tb852 = (precedentsData['84812090'] || []).find((e) => /^852\b/.test(String(e.tbTchqNumber || '')));
  const g852 = tb852 ? doGiongTenHang({ tenHang: VAN_52.tenHang, moTa: VAN_52.tenHang }, tb852.productName) : null;
  check('OZV-1707 TB 852/TB-TCHQ (84812090): doGiongTenHang khớp giong=true với van điện từ khí nén 5/2',
    Boolean(g852 && g852.giong === true && g852.khopDanhTu === true && g852.diem >= 0.6),
    JSON.stringify(g852));

  // Khi hai phân nhóm cụ thể cùng nhóm 4 số tranh chấp (không chốt tất định được 1 phân nhóm) → trả ok=false để leo vòng 2 (LLM):
  const kpnTranhChap = kiemPhanNhomEarlyHoi({
    ee: { hs: '848180' },
    r1: R1_VAN_52,
    raw: { tenHang: 'Van giảm áp tích hợp van an toàn dùng cho nồi hơi' },
    gathered: { headings: ['8481'], tradeHints: null, ozPrecedents: [] },
    product: { nameVi: 'Van giảm áp tích hợp van an toàn', form: 'hoàn chỉnh' },
    productText: 'Van giảm áp tích hợp van an toàn dùng cho nồi hơi',
  });
  check('OZV-1707 kiemPhanNhomEarlyHoi: ≥2 phân nhóm cụ thể cùng khớp → ok=false (SO_TAY_PHAN_NHOM_6_TRANH_CHAP) để leo vòng 2 LLM',
    kpnTranhChap.ok === false && kpnTranhChap.lyDo === 'SO_TAY_PHAN_NHOM_6_TRANH_CHAP',
    JSON.stringify(kpnTranhChap));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
