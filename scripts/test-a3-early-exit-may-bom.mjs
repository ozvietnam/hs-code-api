// OZV-1354: khoá regression A3 — máy bơm ly tâm gia dụng phải earlyExitTradeChotSom, không LLM, <10s.
// Fixture: tests/fixtures/a3-early-exit-may-bom.json (câu GĐ đo live hs-kb 01:48 VN).
// Mẫu: scripts/test-a3-early-exit-loa-coc.mjs / PR #1417 — không sửa package.json (tránh conflict #1417).
import './test-isolate-data.mjs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIX = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/a3-early-exit-may-bom.json'), 'utf8'));

process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
for (const k of [
  'ZAI_WEB_FACTS', 'HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'HS_SO_TAY',
  'HS_CLASSIFY_FAST_FIRST', 'R1_MAX_TOKENS', 'GIR_MAX_TOKENS',
]) {
  delete process.env[k];
}
process.env.CLASSIFY_BUDGET_MS = '285000';

const llmTier = require('../lib/llm-tier');
let llmCalls = [];
llmTier.callLLMJson = async (system, user, opts = {}) => {
  llmCalls.push({ step: opts.step || (String(system).startsWith('VÒNG 1') ? 'understand' : 'gir') });
  throw new Error('LLM không được gọi khi earlyExitTradeChotSom (OZV-1354)');
};
console.error = () => {};
console.warn = () => {};

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

const TRAN_MS = Number(FIX.tranMs) || 10000;
const cases = Array.isArray(FIX.cases) ? FIX.cases : [];
check('fixture OZV-1354: đúng 1 câu máy bơm ly tâm', cases.length === 1, cases.map((c) => c.id));

for (const c of cases) {
  const hints = tradeClassifyHints(c.tenHang);
  const pref = tradePreferredHs(hints);
  check(
    `từ điển ${c.id}: high+chotSom → ${c.hs}`,
    pref?.hs === c.hs && pref.confidence === 'high' && pref.chotSom === true && pref.entryId === c.entryId,
    pref,
  );
  const ee = earlyExitChotTuTrade(hints, c.tenHang);
  check(
    `earlyExitChotTuTrade ${c.id}: CHOT ${c.hs}`,
    ee?.decision === 'CHOT' && ee?.hs === c.hs && ee?._tradeEarly?.entryId === c.entryId && ee?.gir == null,
    ee,
  );

  llmCalls = [];
  const t0 = Date.now();
  const out = await classifyLoop(
    { tenHang: c.tenHang },
    { mic: false, crossCheck: false, timeoutMs: TRAN_MS },
  );
  const ms = Date.now() - t0;
  const top = out.results?.[0]?.hs;
  const gates = out.engine?.gates || [];
  const girs = Array.isArray(out.girRulesApplied) ? out.girRulesApplied : [];

  check(
    `classifyLoop ${c.id}: REVIEW ${c.hs} không gọi LLM`,
    out.status === 'REVIEW' && top === c.hs && llmCalls.length === 0,
    { status: out.status, top, llm: llmCalls.length, ms, gates: gates.slice(-3) },
  );
  check(
    `classifyLoop ${c.id}: log earlyExitTradeChotSom`,
    gates.some((g) => g.earlyExitTradeChotSom === true && g.hs === c.hs),
    gates.slice(-3),
  );
  check(
    `classifyLoop ${c.id}: <${TRAN_MS}ms (A3)`,
    ms < TRAN_MS,
    { ms, tranMs: TRAN_MS, liveMs: c.liveMs },
  );
  const llmGir = girs.filter((d) => d && d.basis === 'LLM_ASSERTED');
  const okBasis = girs.every((d) => !d?.basis || d.basis === 'DETERMINISTIC' || d.basis === 'RULE_TABLE');
  check(
    `classifyLoop ${c.id}: girRulesApplied không LLM_ASSERTED`,
    llmGir.length === 0 && okBasis,
    girs.map((d) => ({ rule: d.ruleKey || d.id, basis: d.basis, source: d.source })),
  );
  console.log(`TIMING ${c.id}: ${ms}ms (live ${c.liveMs}ms · trần ${TRAN_MS}ms)`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
