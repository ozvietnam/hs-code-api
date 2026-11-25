// OZV-2234 — Cắt r1Ms (pha hiểu câu vòng 1) cho câu thực địa A3 «cảm biến quang e3sct11, điện áp 26v, nhận biết vật»:
//  (1) Khi LOOP_PROVIDER=gemini mà mạch gemini đang mở (402 THANH_TOAN hoặc TIMEOUT bước): geminiLoopDangChay(step)=false
//      ⇒ không ép tier='premium' (không đi qua bước 0 Gemini để sinh boQua "gemini: bỏ qua — ngắt mạch thanh toán/khoá đang mở")
//      và không xoá minimax=undefined (giữ mẫu MiniMax-M3 thay vì rơi về MiniMax-M2.7-highspeed không tắt được suy nghĩ).
//      Ngay cả ở lượt đầu khi mạch gemini chưa mở mà Gemini trả 402 rồi callLLMJson rơi xuống bước 1 MiniMax trong cùng lời gọi,
//      MiniMax vẫn nhận đúng MiniMax-M3 + extraBody.thinking.type='disabled'.
//  (2) Khi bật lưới kiểm chứng tất định (HS_CHOT_SOM_CO_KIEM hoặc HS_TIM_TRUOC có ứng viên) và câu hỏi tiếng Việt ngắn
//      (không chữ Hán Taobao, không ảnh OCR, specs ≤ 600 ký tự): r1GonTatSuyNghi=true ⇒ vòng 1 (understand) tắt suy nghĩ dài
//      trên MiniMax-M3 (~2,6 s thay vì 15,7–21,8 s), vòng 2 (gir) nếu chạy vẫn giữ suy nghĩ như cũ.
//  (3) Câu hỏi NEED_FACTS gửi khách cho ca cảm biến quang giữ nguyên từng chữ như sau #1856; tắt cờ = như main (L1/L3).
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { createHash } from 'crypto';

const require = createRequire(import.meta.url);
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
const ENV_CLEAR = [
  'ZAI_WEB_FACTS', 'HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'HS_SO_TAY', 'HS_CLASSIFY_FAST_FIRST',
  'R1_MAX_TOKENS', 'GIR_MAX_TOKENS', 'HS_CHOT_SOM_CO_KIEM', 'HS_HOI_THEO_SO_TAY', 'HS_EMBED_POOL',
  'HS_TIM_TRUOC', 'HS_TIM_TRUOC_NAP', 'LOOP_PROVIDER', 'LOOP_GEMINI_MODEL', 'LOOP_MODEL',
  'LLM_STEP_UNDERSTAND', 'LLM_STEP_GIR', 'GEMINI_API_KEY', 'GEMINI_FREE_KEYS', 'MINIMAX_API_KEY',
  'MINIMAX_MODEL', 'PREMIUM_PROVIDER', 'GEMINI_TRA_PHI_CHOT_CUOI',
];
for (const k of ENV_CLEAR) delete process.env[k];
process.env.CLASSIFY_BUDGET_MS = '285000';

console.error = () => {};
console.warn = () => {};

const llmTier = require('../lib/llm-tier.js');
const ozSearch = require('../lib/oz-precedent-search.js');
let ozItems = [];
ozSearch.searchOzByKeyword = async () => ({ items: JSON.parse(JSON.stringify(ozItems)) });

const {
  classifyLoop,
  geminiLoopDangChay,
  r1GonTatSuyNghi,
} = require('../lib/engine-loop.js');

let pass = 0;
let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); }
  else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 900)}`); }
};

const HANG_CAM_BIEN = { tenHang: 'cảm biến quang e3sct11, điện áp 26v, nhận biết vật' };

// ───────── 1. Hàm thuần geminiLoopDangChay & r1GonTatSuyNghi (có ca ngược — L3) ─────────
{
  llmTier._internal.ngatMach.clear();
  delete process.env.LOOP_PROVIDER;
  check('thuần: LOOP_PROVIDER không đặt → geminiLoopDangChay = false', geminiLoopDangChay('understand') === false);

  process.env.LOOP_PROVIDER = 'gemini';
  check('thuần: LOOP_PROVIDER=gemini + mạch đóng → geminiLoopDangChay = true', geminiLoopDangChay('understand') === true);

  llmTier._internal.ngatMach.set('gemini|*', { loi: 1, nghiToi: Date.now() + 900000, lyDo: 'THANH_TOAN' });
  check(
    'thuần, CA NGƯỢC: LOOP_PROVIDER=gemini nhưng mạch THANH_TOAN (gemini|*) đang mở → geminiLoopDangChay = false cho mọi bước',
    geminiLoopDangChay('understand') === false && geminiLoopDangChay('gir') === false,
  );

  llmTier._internal.ngatMach.clear();
  llmTier._internal.ngatMach.set('gemini|understand', { loi: 2, nghiToi: Date.now() + 300000 });
  check(
    'thuần, CA NGƯỢC: mạch TIMEOUT chỉ mở cho bước understand → understand=false, gir=true',
    geminiLoopDangChay('understand') === false && geminiLoopDangChay('gir') === true,
  );
  llmTier._internal.ngatMach.clear();
  delete process.env.LOOP_PROVIDER;
}

{
  delete process.env.HS_CHOT_SOM_CO_KIEM;
  delete process.env.HS_TIM_TRUOC;
  delete process.env.HS_CLASSIFY_FAST_FIRST;
  check(
    'thuần (L1): tắt cả HS_CHOT_SOM_CO_KIEM, HS_TIM_TRUOC, HS_CLASSIFY_FAST_FIRST → r1GonTatSuyNghi = false',
    r1GonTatSuyNghi(HANG_CAM_BIEN, null) === false,
  );

  process.env.HS_CHOT_SOM_CO_KIEM = 'on';
  check(
    'thuần: bật HS_CHOT_SOM_CO_KIEM + câu tiếng Việt ngắn → r1GonTatSuyNghi = true',
    r1GonTatSuyNghi(HANG_CAM_BIEN, null) === true,
  );
  check(
    'thuần, CA NGƯỢC: có chữ Hán Taobao trong tenHang hoặc nameZh → r1GonTatSuyNghi = false (giữ suy nghĩ §2c)',
    r1GonTatSuyNghi({ tenHang: '光电开关 E3S-CT11' }, { khoi: 'ứng viên' }) === false
      && r1GonTatSuyNghi({ ...HANG_CAM_BIEN, nameZh: '光电传感器' }, { khoi: 'ứng viên' }) === false,
  );
  check(
    'thuần, CA NGƯỢC: có ảnh OCR (imageTexts) hoặc specs dài > 600 ký tự → r1GonTatSuyNghi = false',
    r1GonTatSuyNghi({ ...HANG_CAM_BIEN, imageTexts: ['OMRON E3S-CT11'] }, { khoi: 'ứng viên' }) === false
      && r1GonTatSuyNghi({ ...HANG_CAM_BIEN, specs: 'a'.repeat(601) }, { khoi: 'ứng viên' }) === false,
  );
  delete process.env.HS_CHOT_SOM_CO_KIEM;
  check(
    'thuần: HS_CHOT_SOM_CO_KIEM tắt nhưng timTruocKq có khối ứng viên → r1GonTatSuyNghi = true',
    r1GonTatSuyNghi(HANG_CAM_BIEN, { khoi: 'ỨNG VIÊN TÌM ĐƯỢC...' }) === true
      && r1GonTatSuyNghi(HANG_CAM_BIEN, { khoi: '' }) === false,
  );
}

// ───────── 2. Qua fetch giả lập chuỗi thật (LOOP_PROVIDER=gemini + Gemini 402 + MiniMax) ─────────
// Tái hiện đúng 3 lượt cảm biến quang của OZV-2230 (luot-01..03) và kịch bản 08:50 (#1856):
//  - Lượt 1: mạch gemini đang đóng → bước 0 gọi Gemini trả 402 (mở mạch gemini|*) → bước 1 gọi MiniMax.
//  - Lượt 2 & 3: mạch gemini|* đã mở → bỏ qua Gemini ngay từ engine-loop, gọi thẳng MiniMax-M3 với thinking disabled.
const R1_LUOT_1 = {
  product: {
    nameVi: 'Cảm biến quang điện E3S-CT11',
    nameEn: 'E3S-CT11 photoelectric sensor',
    nameZh: 'E3S-CT11',
    purpose: 'Nhận biết vật bằng phương pháp quang điện',
    mechanism: 'điện',
    material: '',
    form: 'hoàn chỉnh',
    evidence: { purpose: 'nhận biết vật', mechanism: 'điện áp 26v', material: '' },
  },
  hypotheses: [
    { chapter: '90', heading4: '9031', subheading6: '903149', why: 'cảm biến quang', confidence: 78 },
    { chapter: '85', heading4: '8541', subheading6: '854140', why: 'bán dẫn quang', confidence: 14 },
    { chapter: '85', heading4: '8536', subheading6: '853649', why: 'rơ le quang điện 26V', confidence: 8 },
  ],
  verify: {
    searchVi: ['cảm biến quang E3S-CT11'],
    codes8: ['90314990', '85414029', '85364990'],
    unknowns: ['Loại cảm biến', 'Ngõ ra đóng ngắt hay đo kiểm'],
  },
};
const R1_LUOT_2 = {
  ...R1_LUOT_1,
  hypotheses: [
    { chapter: '90', heading4: '9031', subheading6: '903149', why: 'cảm biến quang', confidence: 78 },
    { chapter: '85', heading4: '8541', subheading6: '854140', why: 'bán dẫn quang', confidence: 17 },
    { chapter: '85', heading4: '8536', subheading6: '853650', why: 'công tắc quang điện', confidence: 5 },
  ],
};
const R1_LUOT_3 = {
  ...R1_LUOT_1,
  hypotheses: [
    { chapter: '90', heading4: '9031', subheading6: '903149', why: 'cảm biến quang', confidence: 85 },
    { chapter: '85', heading4: '8541', subheading6: '854140', why: 'bán dẫn quang', confidence: 12 },
    { chapter: '85', heading4: '8541', subheading6: '854149', why: 'thiết bị quang điện khác', confidence: 3 },
  ],
};
const R2_STUB = {
  decision: 'HOI',
  hs: '853650',
  confidence: 65,
  reason: 'vòng 2 giả',
  basis: [],
  conditions: [],
  alternatives: [],
  questions: [{ fact: 'ngõ ra', question: 'Đầu ra relay hay transistor?', whereToFind: 'catalogue' }],
};

const origFetch = globalThis.fetch;
let fetchCalls = [];
let minimaxQueue = [];

globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.includes('generativelanguage.googleapis.com')) {
    fetchCalls.push({ provider: 'gemini', url: u });
    return new Response(
      JSON.stringify({ error: { code: 402, message: 'Your prepayment credits are depleted.' } }),
      { status: 402 },
    );
  }
  if (u.includes('api.minimax.io')) {
    const body = JSON.parse(init.body || '{}');
    fetchCalls.push({
      provider: 'minimax',
      model: body.model,
      thinking: body.thinking || null,
      maxTokens: body.max_tokens,
    });
    const next = minimaxQueue.shift() || R2_STUB;
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(next) }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1200, completion_tokens: 420 },
      }),
      { status: 200 },
    );
  }
  throw new Error(`unexpected fetch: ${u}`);
};

try {
  llmTier._internal.ngatMach.clear();
  process.env.LOOP_PROVIDER = 'gemini';
  process.env.GEMINI_API_KEY = 'paid-key';
  process.env.MINIMAX_API_KEY = 'mm-key';
  process.env.HS_SO_TAY = 'full';
  process.env.HS_CHOT_SOM_CO_KIEM = 'on';
  process.env.HS_TIM_TRUOC = 'on';
  process.env.HS_HOI_THEO_SO_TAY = 'on';

  // Lượt 1: mạch gemini chưa mở → Gemini 402 mở mạch → rơi sang MiniMax trong cùng lời gọi
  fetchCalls = [];
  minimaxQueue = [R1_LUOT_1];
  const out1 = await classifyLoop(HANG_CAM_BIEN, { debug: true });
  const mm1 = fetchCalls.find((c) => c.provider === 'minimax');
  check(
    'Lượt 1 (mạch gemini vừa mở do 402): bước 1 MiniMax vẫn nhận đúng MiniMax-M3 (không bị xoá về M2.7-highspeed) và thinking disabled',
    fetchCalls.length === 2
      && fetchCalls[0].provider === 'gemini'
      && mm1?.model === 'MiniMax-M3'
      && mm1?.thinking?.type === 'disabled',
    JSON.stringify(fetchCalls),
  );
  check(
    'Lượt 1: NEED_FACTS, rounds=1, llmMs=0, r1Ms < 8000, nhánh hoiTheoGiaThuyetNhomDich',
    out1.status === 'NEED_FACTS'
      && out1.engine?.rounds === 1
      && out1.engine?.phases?.llmMs === 0
      && out1.engine?.phases?.r1Ms < 8000
      && out1.soTay?.nhanhToiUu?.ten === 'hoiTheoGiaThuyetNhomDich',
    JSON.stringify({ status: out1.status, phases: out1.engine?.phases, nhanh: out1.soTay?.nhanhToiUu }),
  );

  // Lượt 2: mạch gemini|* đã mở → không gọi Gemini, không còn boQua gemini, gọi thẳng MiniMax-M3 + thinking disabled
  fetchCalls = [];
  minimaxQueue = [R1_LUOT_2];
  const out2 = await classifyLoop(HANG_CAM_BIEN, { debug: true });
  check(
    'Lượt 2 (mạch gemini|* đang mở): bỏ qua bước 0 Gemini ngay từ engine-loop (0 fetch gemini, không có boQua gemini), gọi thẳng MiniMax-M3 + thinking disabled',
    fetchCalls.length === 1
      && fetchCalls[0].provider === 'minimax'
      && fetchCalls[0].model === 'MiniMax-M3'
      && fetchCalls[0].thinking?.type === 'disabled'
      && !(out2.engine?.gates || []).some((g) => Array.isArray(g.boQua) && g.boQua.some((s) => /gemini/.test(s))),
    JSON.stringify({ fetchCalls, gates: out2.engine?.gates }),
  );
  check(
    'Lượt 2: NEED_FACTSบน 853650, câu hỏi gửi khách chứa điều kiện loại trừ 90.31 và 85.41 của sổ tay 85.36',
    out2.status === 'NEED_FACTS'
      && out2.results?.[0]?.hs === '853650'
      && (out2.missing || []).some((m) => /90\.31/.test(m))
      && (out2.missing || []).some((m) => /85\.41/.test(m)),
    JSON.stringify({ hs: out2.results?.[0]?.hs, missing: out2.missing }),
  );

  // Lượt 3: kịch bản 08:50 (#1856, HYP=[903149, 854140, 854149]) → HOI 903149, câu hỏi chứa cả 90.32 và 85.36
  fetchCalls = [];
  minimaxQueue = [R1_LUOT_3];
  const out3 = await classifyLoop(HANG_CAM_BIEN, { debug: true });
  check(
    'Lượt 3 (kịch bản #1856 HYP=[903149, 854140, 854149]): gọi thẳng MiniMax-M3 + thinking disabled, NEED_FACTS 903149, hỏi đủ 90.32 và 85.36',
    fetchCalls.length === 1
      && fetchCalls[0].model === 'MiniMax-M3'
      && fetchCalls[0].thinking?.type === 'disabled'
      && out3.status === 'NEED_FACTS'
      && out3.results?.[0]?.hs === '903149'
      && (out3.missing || []).some((m) => /90\.32/.test(m))
      && (out3.missing || []).some((m) => /85\.36/.test(m)),
    JSON.stringify({ fetchCalls, hs: out3.results?.[0]?.hs, missing: out3.missing }),
  );

  // Đối chiếu câu hỏi gửi khách: tắt thinkingOff vòng 1 (cùng đầu ra R1) → danh sách câu hỏi gửi khách GIỐNG HỆT 100%
  delete process.env.HS_TIM_TRUOC;
  minimaxQueue = [R1_LUOT_2];
  const out2CungR1 = await classifyLoop(HANG_CAM_BIEN, {});
  minimaxQueue = [R1_LUOT_3];
  const out3CungR1 = await classifyLoop(HANG_CAM_BIEN, {});
  check(
    'Đối chiếu sau #1856: câu hỏi gửi khách (missing + nextAction.questions) giống hệt 100% ở cả 2 nhánh hoiTheoGiaThuyetNhomDich',
    JSON.stringify(out2.missing) === JSON.stringify(out2CungR1.missing)
      && JSON.stringify(out2.nextAction) === JSON.stringify(out2CungR1.nextAction)
      && JSON.stringify(out3.missing) === JSON.stringify(out3CungR1.missing)
      && JSON.stringify(out3.nextAction) === JSON.stringify(out3CungR1.nextAction),
    JSON.stringify({ m2: out2.missing, m3: out3.missing }),
  );

  // CA NGƯỢC 1: có tín hiệu tiền lệ Oz trái nhóm → leo vòng 2 (gir), vòng 1 tắt suy nghĩ nhưng mọi lượt vòng ≥2 (gir) VẪN bật suy nghĩ (thinking=null)
  ozItems = [{ hsCode: '85365099', tenHang: 'Cảm biến quang E3S-CT11 26V nhận biết vật', matchCoverage: 85, ozCount: 5 }];
  fetchCalls = [];
  minimaxQueue = [R1_LUOT_3, R2_STUB, R2_STUB];
  const outVong2 = await classifyLoop(HANG_CAM_BIEN, {});
  ozItems = [];
  check(
    'CA NGƯỢC (leo vòng 2 khi có tiền lệ Oz trái nhóm): vòng 1 thinking disabled, nhưng các lượt gir vòng ≥2 giữ nguyên thinking=null (bật suy nghĩ)',
    fetchCalls.length >= 2
      && fetchCalls[0].model === 'MiniMax-M3'
      && fetchCalls[0].thinking?.type === 'disabled'
      && fetchCalls.slice(1).every((c) => c.model === 'MiniMax-M3' && c.thinking === null)
      && outVong2.engine?.rounds >= 2,
    JSON.stringify(fetchCalls),
  );

  // CA NGƯỢC 2 (L1): tắt công tắc HS_CHOT_SOM_CO_KIEM + HS_TIM_TRUOC + bỏ LOOP_PROVIDER → mọi lượt giữ nguyên thinking=null, phản hồi khớp băm origin/main
  delete process.env.HS_CHOT_SOM_CO_KIEM;
  delete process.env.HS_TIM_TRUOC;
  delete process.env.HS_HOI_THEO_SO_TAY;
  delete process.env.LOOP_PROVIDER;
  llmTier._internal.ngatMach.clear();
  fetchCalls = [];
  minimaxQueue = [R1_LUOT_3, R2_STUB, R2_STUB];
  const outTat = await classifyLoop(HANG_CAM_BIEN, {});
  const xoaGio = (o) => {
    const c = JSON.parse(JSON.stringify(o));
    if (c.engine) { delete c.engine.ms; delete c.engine.phases; }
    return c;
  };
  const shaTat = createHash('sha256').update(JSON.stringify(xoaGio(outTat))).digest('hex');
  check(
    'CA NGƯỢC (L1 tắt công tắc = như main): mọi lời gọi giữ thinking=null, phản hồi khớp băm origin/main',
    fetchCalls.length >= 1
      && fetchCalls.every((c) => c.thinking === null)
      && outTat.status === 'NEED_FACTS'
      && shaTat === 'a06a1d655e25eb8b8dc4564735405704294409836991402df5613fba966ed5f4',
    JSON.stringify({ fetchCalls, shaTat }),
  );
} finally {
  globalThis.fetch = origFetch;
  llmTier._internal.ngatMach.clear();
  for (const k of ENV_CLEAR) delete process.env[k];
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
