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
check('gon=off + unknowns → vẫn gọi GIR (1 lời)', off.girCalls === 1 && off.out.status === 'NEED_FACTS', JSON.stringify({ gir: off.girCalls, status: off.out.status }));

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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
