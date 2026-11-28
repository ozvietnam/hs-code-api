// OZV-2234 — Cắt r1Ms (pha hiểu câu vòng 1) khi LOOP_PROVIDER=gemini mà mạch gemini đang mở (402 THANH_TOAN hoặc TIMEOUT bước):
//  (1) geminiLoopDangChay(step) đọc LOOP_PROVIDER lúc gọi và trả false khi ngatMachDangMo('gemini', step) đang mở
//      ⇒ providerOpts(timeoutMs, step) trả {} (không ép tier='premium' đi qua bước 0 Gemini sinh boQua) và bỏ
//      minimax: undefined (không xoá stepModel MiniMax-M3 về MiniMax-M2.7-highspeed ở cả vòng 1 và vòng 2; bật lại
//      kiemKhoa, ngatSuyNghi, minimaxNgatBuoc, thinkingOff của fastFirst).
//  (2) Trong catch của callWithFallback: dùng trạng thái lúc vào hàm (geminiLoop) kết hợp kiểm ngatMachDangMo('gemini', step)
//      để khi lượt đầu bước 0 Gemini trả 402 (mở mạch ngay trong callLLMJson) rồi bước 1 MiniMax lỗi 5xx hoặc 429
//      (ghi đè lastErr trong callLLMJson), nhánh billing vẫn bắt được và lùi ngay về lời gọi MiniMax dự phòng
//      (MiniMax-M3) mà không ném lỗi sớm hay ngủ 5+15+30 s.
//  (3) Câu hỏi NEED_FACTS gửi khách cho ca cảm biến quang giữ nguyên từng chữ như sau #1856.
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
  callWithFallback,
  geminiLoopDangChay,
  DU_KHOA,
  _resetNgatSuyNghi,
  ngatSuyNghiTrangThai,
} = require('../lib/engine-loop.js');

let pass = 0;
let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); }
  else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 900)}`); }
};

const HANG_CAM_BIEN = { tenHang: 'cảm biến quang e3sct11, điện áp 26v, nhận biết vật' };

// ───────── 1. Hàm thuần geminiLoopDangChay (có ca ngược — L3) ─────────
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

// ───────── 2. Qua fetch giả lập chuỗi thật (LOOP_PROVIDER=gemini + Gemini 402 + MiniMax) ─────────
// Tái hiện đúng 3 lượt cảm biến quang của OZV-2230 (luot-01..03) và kịch bản 08:50 (#1856):
//  - Lượt 1: mạch gemini đang đóng → bước 0 gọi Gemini trả 402 (mở mạch gemini|*) → bước 1 gọi MiniMax-M3.
//  - Lượt 2 & 3: mạch gemini|* đã mở → bỏ qua Gemini ngay từ engine-loop, gọi thẳng MiniMax-M3.
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
    if (next && next.__httpError) {
      return new Response(
        JSON.stringify({ error: { message: next.message || `HTTP ${next.status}` } }),
        { status: next.status },
      );
    }
    if (next && next.__rawContent != null) {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: next.__rawContent }, finish_reason: next.finishReason || 'length' }],
          usage: { prompt_tokens: 1200, completion_tokens: 3500 },
        }),
        { status: 200 },
      );
    }
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
  _resetNgatSuyNghi();
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
    'Lượt 1 (mạch gemini vừa mở do 402): bước 1 MiniMax vẫn nhận đúng MiniMax-M3 (không bị minimax:undefined xoá về M2.7-highspeed)',
    fetchCalls.length === 2
      && fetchCalls[0].provider === 'gemini'
      && mm1?.model === 'MiniMax-M3',
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

  // Lượt 2: mạch gemini|* đã mở → không gọi Gemini, không còn boQua gemini, gọi thẳng MiniMax-M3
  fetchCalls = [];
  minimaxQueue = [R1_LUOT_2];
  const out2 = await classifyLoop(HANG_CAM_BIEN, { debug: true });
  check(
    'Lượt 2 (mạch gemini|* đang mở): bỏ qua bước 0 Gemini ngay từ engine-loop (0 fetch gemini, 0 boQua gemini), gọi thẳng MiniMax-M3',
    fetchCalls.length === 1
      && fetchCalls[0].provider === 'minimax'
      && fetchCalls[0].model === 'MiniMax-M3'
      && !(out2.engine?.gates || []).some((g) => Array.isArray(g.boQua) && g.boQua.some((s) => /gemini/.test(s))),
    JSON.stringify({ fetchCalls, gates: out2.engine?.gates }),
  );
  check(
    'Lượt 2: NEED_FACTS trên 853650, câu hỏi gửi khách chứa điều kiện loại trừ 90.31 và 85.41 của sổ tay 85.36',
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
    'Lượt 3 (kịch bản #1856 HYP=[903149, 854140, 854149]): gọi thẳng MiniMax-M3, NEED_FACTS 903149, hỏi đủ 90.32 và 85.36',
    fetchCalls.length === 1
      && fetchCalls[0].model === 'MiniMax-M3'
      && out3.status === 'NEED_FACTS'
      && out3.results?.[0]?.hs === '903149'
      && (out3.missing || []).some((m) => /90\.32/.test(m))
      && (out3.missing || []).some((m) => /85\.36/.test(m)),
    JSON.stringify({ fetchCalls, hs: out3.results?.[0]?.hs, missing: out3.missing }),
  );

  // ───────── 3. Ca QT yêu cầu: Lượt đầu Gemini 402 (mở mạch ngay trong lời gọi) → MiniMax 5xx / 429 ─────────
  // Trong callLLMJson: bước 0 Gemini trả 402 làm mở mạch gemini|*, sau đó bước 1 MiniMax lỗi 502 (hoặc 429) làm
  // lastErr trong callLLMJson bị ghi đè bằng thông điệp của MiniMax. Trong catch của callWithFallback, nhờ giữ
  // trạng thái lúc vào hàm (geminiLoop=true) + kiểm ngatMachDangMo('gemini', step), nhánh billing vẫn bắt được
  // và lùi ngay sang lời gọi MiniMax dự phòng (MiniMax-M3) mà không ném lỗi hay ngủ 5+15+30 s.
  {
    llmTier._internal.ngatMach.clear();
    fetchCalls = [];
    // Trong 1 lần chat() của bước 1, lib/llm.mjs thử prof.model (MiniMax-M3) rồi p.model (MiniMax-M2.7-highspeed)
    // trước khi ném lỗi về callLLMJson; sau đó nhánh billing của callWithFallback gọi lại callLLMJson với MiniMax-M3 và thành công.
    minimaxQueue = [
      { __httpError: true, status: 502, message: 'Bad Gateway' },
      { __httpError: true, status: 502, message: 'Bad Gateway' },
      R1_LUOT_2,
    ];
    const log5xx = [];
    const t05xx = Date.now();
    const res5xx = await callWithFallback('sys', 'user', {
      step: 'understand',
      minimax: { model: 'MiniMax-M3' },
      tier: 'premium',
      geminiTimeoutMs: 5000,
      geminiModelEnv: 'LOOP_GEMINI_MODEL',
      maxTokens: 3500,
      timeoutMs: 30000,
    }, log5xx);
    const elapsed5xx = Date.now() - t05xx;
    check(
      'Ca Gemini 402 → MiniMax 5xx (502): catch dùng geminiLoop lúc vào hàm, giữ nhánh billing lùi MiniMax-M3 thành công (<1s, không ngủ 5+15+30s)',
      res5xx?.fallback === true
        && res5xx?.provider === 'minimax'
        && res5xx?.model === 'MiniMax-M3'
        && elapsed5xx < 2000
        && log5xx.some((l) => l.fallback === 'minimax')
        && fetchCalls[0]?.provider === 'gemini'
        && fetchCalls[fetchCalls.length - 1]?.model === 'MiniMax-M3',
      JSON.stringify({ elapsed5xx, log5xx, fetchCalls }),
    );
  }

  {
    llmTier._internal.ngatMach.clear();
    fetchCalls = [];
    minimaxQueue = [
      { __httpError: true, status: 429, message: 'Token Plan rate limit' },
      { __httpError: true, status: 429, message: 'Rate limit exceeded' },
      R1_LUOT_2,
    ];
    const log429 = [];
    const t0429 = Date.now();
    const res429 = await callWithFallback('sys', 'user', {
      step: 'understand',
      minimax: { model: 'MiniMax-M3' },
      tier: 'premium',
      geminiTimeoutMs: 5000,
      geminiModelEnv: 'LOOP_GEMINI_MODEL',
      maxTokens: 3500,
      timeoutMs: 30000,
    }, log429);
    const elapsed429 = Date.now() - t0429;
    check(
      'Ca Gemini 402 → MiniMax 429: nhận diện billing=true (mạch gemini vừa mở), lùi ngay về MiniMax-M3 không ngủ 5+15+30s',
      res429?.fallback === true
        && res429?.provider === 'minimax'
        && res429?.model === 'MiniMax-M3'
        && elapsed429 < 2000
        && log429.some((l) => l.fallback === 'minimax')
        && fetchCalls[0]?.provider === 'gemini'
        && fetchCalls[fetchCalls.length - 1]?.model === 'MiniMax-M3',
      JSON.stringify({ elapsed429, log429, fetchCalls }),
    );
  }

  // ───────── 4. Ca ngược: khi mạch gemini|* đang mở, kiemKhoa + ngatSuyNghi hoạt động lại trên cả vòng 1 và vòng 2 ─────────
  {
    _resetNgatSuyNghi();
    // Mạch gemini|* đã mở từ ca trên
    fetchCalls = [];
    minimaxQueue = [
      // Lần 1: mảnh JSON vụn vớt từ <think> thiếu cả product lẫn hypotheses và finish_reason=length (cụt ở maxTokens)
      { __rawContent: '{"heading4":"9031","why":"mảnh vụn cụt giữa think"}', finishReason: 'length' },
      // Lần 2 (fallback thinking-off): trả đủ khoá
      R1_LUOT_2,
    ];
    const logCut = [];
    const resCut = await callWithFallback('sys', 'user', {
      step: 'understand',
      minimax: { model: 'MiniMax-M3' },
      maxTokens: 3500,
      timeoutMs: 30000,
      kiemKhoa: DU_KHOA.understand,
    }, logCut);
    check(
      'CA NGƯỢC (mạch gemini|* mở): kiemKhoa + ngatSuyNghiGhiCut bật lại, JSON cụt ở maxTokens được gọi lại MiniMax-M3 với thinking disabled',
      resCut?.fallback === true
        && fetchCalls.length === 2
        && fetchCalls[0].model === 'MiniMax-M3'
        && fetchCalls[0].thinking === null
        && fetchCalls[1].model === 'MiniMax-M3'
        && fetchCalls[1].thinking?.type === 'disabled'
        && ngatSuyNghiTrangThai().understand?.mo === true,
      JSON.stringify({ fetchCalls, ngatSuyNghi: ngatSuyNghiTrangThai(), logCut }),
    );
    _resetNgatSuyNghi();

    // Lượt đầu mạch gemini còn đóng (geminiLoop=true): bước 0 Gemini lỗi → bước 1 MiniMax trả JSON cụt (finish_reason=length)
    // → kiemKhoa chặn (loiKiemKhoa=true) → đi thẳng xuống nhánh thinking-off gọi lại MiniMax-M3 (không đi nhầm vào if(geminiLoop)).
    llmTier._internal.ngatMach.clear();
    fetchCalls = [];
    minimaxQueue = [
      { __rawContent: '{"heading4":"9031","why":"cụt ở lượt đầu khi bước 0 Gemini trượt sang bước 1 MiniMax"}', finishReason: 'length' },
      R1_LUOT_2,
    ];
    const logCutFirst = [];
    const resCutFirst = await callWithFallback('sys', 'user', {
      step: 'understand',
      minimax: { model: 'MiniMax-M3' },
      tier: 'premium',
      geminiTimeoutMs: 5000,
      geminiModelEnv: 'LOOP_GEMINI_MODEL',
      maxTokens: 3500,
      timeoutMs: 30000,
      kiemKhoa: DU_KHOA.understand,
    }, logCutFirst);
    check(
      'CA NGƯỢC (lượt đầu geminiLoop=true, bước 0 Gemini 402 trượt sang bước 1 MiniMax bị cụt JSON): rơi đúng nhánh thinking-off MiniMax-M3 và bật ngatSuyNghi',
      resCutFirst?.fallback === true
        && fetchCalls.length === 3
        && fetchCalls[0].provider === 'gemini'
        && fetchCalls[1].provider === 'minimax'
        && fetchCalls[1].thinking === null
        && fetchCalls[2].provider === 'minimax'
        && fetchCalls[2].model === 'MiniMax-M3'
        && fetchCalls[2].thinking?.type === 'disabled'
        && logCutFirst.some((l) => l.fallback === 'thinking-off')
        && ngatSuyNghiTrangThai().understand?.mo === true,
      JSON.stringify({ fetchCalls, ngatSuyNghi: ngatSuyNghiTrangThai(), logCutFirst }),
    );
    _resetNgatSuyNghi();
  }

  // CA NGƯỢC: có tín hiệu tiền lệ Oz trái nhóm → leo vòng 2 (gir), cả vòng 1 và vòng 2 đều nhận MiniMax-M3 khi mạch gemini|* mở
  ozItems = [{ hsCode: '85365099', tenHang: 'Cảm biến quang E3S-CT11 26V nhận biết vật', matchCoverage: 85, ozCount: 5 }];
  fetchCalls = [];
  minimaxQueue = [R1_LUOT_3, R2_STUB, R2_STUB];
  const outVong2 = await classifyLoop(HANG_CAM_BIEN, {});
  ozItems = [];
  check(
    'CA NGƯỢC (leo vòng 2 khi có tiền lệ Oz trái nhóm, mạch gemini|* mở): cả vòng 1 (understand) và vòng 2 (gir) đều gọi thẳng MiniMax-M3 (0 fetch gemini)',
    fetchCalls.length >= 2
      && fetchCalls.every((c) => c.provider === 'minimax' && c.model === 'MiniMax-M3')
      && outVong2.engine?.rounds >= 2,
    JSON.stringify(fetchCalls),
  );

  // CA NGƯỢC: không đặt LOOP_PROVIDER (mặc định kho) → phản hồi khớp băm origin/main
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
    'CA NGƯỢC (mặc định LOOP_PROVIDER không đặt = như main): phản hồi khớp băm origin/main',
    fetchCalls.length >= 1
      && fetchCalls.every((c) => c.model === 'MiniMax-M3' && c.thinking === null)
      && outTat.status === 'NEED_FACTS'
      && shaTat === 'a06a1d655e25eb8b8dc4564735405704294409836991402df5613fba966ed5f4',
    JSON.stringify({ fetchCalls, shaTat }),
  );
} finally {
  globalThis.fetch = origFetch;
  _resetNgatSuyNghi();
  llmTier._internal.ngatMach.clear();
  for (const k of ENV_CLEAR) delete process.env[k];
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
