// OZV-1356: earlyExitTradeChotSom «cốc giữ nhiệt» — không gọi gather nặng;
// wall < 2s, vẫn CHOT 96170010, không LLM.
// Không sửa package.json (hàng CI #1417–#1420); chạy: node scripts/test-a3-early-exit-coc-latency.mjs
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
for (const k of [
  'ZAI_WEB_FACTS', 'HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'HS_SO_TAY',
  'HS_CLASSIFY_FAST_FIRST', 'R1_MAX_TOKENS', 'GIR_MAX_TOKENS', 'HS_EMBED_POOL',
]) {
  delete process.env[k];
}
process.env.CLASSIFY_BUDGET_MS = '285000';

const llmTier = require('../lib/llm-tier');
let llmCalls = 0;
llmTier.callLLMJson = async () => {
  llmCalls += 1;
  throw new Error('LLM không được gọi khi earlyExitTradeChotSom (OZV-1356)');
};
console.error = () => {};
console.warn = () => {};

const ozSearch = require('../lib/oz-precedent-search.js');
const precedentSearch = require('../lib/precedent-search.js');
const taxLookup = require('../lib/tax-lookup.js');

let ozCalls = 0;
let spCalls = 0;
let taxCalls = 0;
let countSrcCalls = 0;

const _oz = ozSearch.searchOzByKeyword.bind(ozSearch);
ozSearch.searchOzByKeyword = async (...a) => {
  ozCalls += 1;
  return _oz(...a);
};
const _sp = precedentSearch.searchPrecedents;
precedentSearch.searchPrecedents = (...a) => {
  spCalls += 1;
  return _sp(...a);
};
const _tax = taxLookup.buildTaxLookup;
taxLookup.buildTaxLookup = (...a) => {
  taxCalls += 1;
  return _tax(...a);
};
const _cnt = precedentSearch.countIndependentSources;
precedentSearch.countIndependentSources = (...a) => {
  countSrcCalls += 1;
  return _cnt(...a);
};

const { classifyLoop, earlyExitChotTuTrade } = require('../lib/engine-loop.js');
const { tradeClassifyHints, tradePreferredHs } = require('../lib/trade-classify-hints.js');

let pass = 0;
let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); }
  else {
    fail += 1;
    const detail = typeof x === 'string' ? x.slice(0, 500) : JSON.stringify(x).slice(0, 500);
    console.log(`FAIL ${n} ${detail}`);
  }
};

const TEN = 'cốc giữ nhiệt chân không (bình chân không)';
const HS = '96170010';
const ENTRY = 'coc-giu-nhiet-chan-khong';
const TRAN_MS = 2000;

{
  const hints = tradeClassifyHints(TEN);
  const pref = tradePreferredHs(hints);
  check(
    'từ điển cốc: high+chotSom → 96170010',
    pref?.hs === HS && pref.confidence === 'high' && pref.chotSom === true && pref.entryId === ENTRY,
    pref,
  );
  const ee = earlyExitChotTuTrade(hints, TEN);
  check(
    'earlyExitChotTuTrade cốc: CHOT 96170010',
    ee?.decision === 'CHOT' && ee?.hs === HS && ee?._tradeEarly?.entryId === ENTRY,
    ee,
  );
}

ozCalls = 0;
spCalls = 0;
taxCalls = 0;
countSrcCalls = 0;
llmCalls = 0;
const t0 = Date.now();
const out = await classifyLoop(
  { tenHang: TEN },
  { mic: false, crossCheck: false, timeoutMs: TRAN_MS },
);
const wall = Date.now() - t0;
const top = out.results?.[0]?.hs;
const gates = out.engine?.gates || [];
const gatherMs = out.engine?.phases?.gatherMs;

check(
  'classifyLoop cốc: REVIEW 96170010 không LLM',
  out.status === 'REVIEW' && top === HS && llmCalls === 0,
  { status: out.status, top, llm: llmCalls, wall, gatherMs },
);
check(
  'classifyLoop cốc: log earlyExitTradeChotSom',
  gates.some((g) => g.earlyExitTradeChotSom === true && g.hs === HS),
  gates.slice(-3),
);
check(
  'OZV-1356: không gọi ozSearch / searchPrecedents / buildTaxLookup trên đường chốt sớm',
  ozCalls === 0 && spCalls === 0 && taxCalls === 0,
  { ozCalls, spCalls, taxCalls },
);
check(
  'OZV-1356: không gọi countIndependentSources trên đường chốt sớm',
  countSrcCalls === 0,
  { countSrcCalls },
);
check(
  `OZV-1356: wall < ${TRAN_MS}ms (đích A3) + gatherMs < 200`,
  wall < TRAN_MS && (gatherMs == null || gatherMs < 200),
  { wall, gatherMs, engineMs: out.engine?.ms, phases: out.engine?.phases },
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
