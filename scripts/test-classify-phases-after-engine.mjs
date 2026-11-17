// OZV-1363 — /api/classify trả phases.afterEngineMs (+ classifyMs / ganHoSoMs)
// trên đường earlyExitTradeChotSom ca «cốc giữ nhiệt…». Không LLM, không mạng.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

process.env.HS_API_TOKEN = 'phases-after-engine-token';
process.env.HS_ACCESS_LOG = '0';
process.env.HS_PUBLIC_LLM = 'false';
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
process.env.HS_HO_SO = process.env.HS_HO_SO || 'off';
process.env.HS_CLASSIFY_ENGINE = 'loop'; // giống prod — earlyExitTradeChotSom chỉ trên engine loop
process.env.CLASSIFY_BUDGET_MS = '285000';
for (const k of [
  'ZAI_WEB_FACTS', 'HS_EMBED_POOL', 'HS_CLASSIFY_FAST_FIRST',
]) {
  delete process.env[k];
}

const llmTier = require('../lib/llm-tier');
let llmCalls = 0;
llmTier.callLLMJson = async () => {
  llmCalls += 1;
  throw new Error('LLM không được gọi khi earlyExitTradeChotSom (OZV-1363)');
};
console.error = () => {};
console.warn = () => {};

const handler = require('../api/classify.js');

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

async function goi(body) {
  const res = {
    _s: 0, _j: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    getHeader(k) { return this.headers[k]; },
    status(c) { this._s = c; return this; },
    json(p) { this._j = p; return this; },
    end() { return this; },
  };
  await handler({
    method: 'POST',
    url: '/api/classify',
    query: {},
    headers: { authorization: 'Bearer phases-after-engine-token' },
    body,
  }, res);
  return res;
}

const TEN = 'cốc giữ nhiệt chân không (bình chân không)';
const HS = '96170010';

const r = await goi({ tenHang: TEN });
const j = r._j || {};
const top = j.results?.[0]?.hs;
const engineMs = Number(j.engine?.ms);
const ph = j.phases || {};

check('HTTP 200', r._s === 200, String(r._s));
check('earlyExit cốc: REVIEW 96170010 không LLM', j.status === 'REVIEW' && top === HS && llmCalls === 0, {
  status: j.status, top, llm: llmCalls,
});
check('có engine.ms số', Number.isFinite(engineMs) && engineMs >= 0, j.engine);
check('phases.afterEngineMs là số ≥ 0', Number.isFinite(ph.afterEngineMs) && ph.afterEngineMs >= 0, ph);
check('phases.classifyMs là số ≥ 0', Number.isFinite(ph.classifyMs) && ph.classifyMs >= 0, ph);
check('phases.ganHoSoMs là số ≥ 0', Number.isFinite(ph.ganHoSoMs) && ph.ganHoSoMs >= 0, ph);
check(
  'afterEngineMs ≈ ms − engine.ms (±2ms làm tròn)',
  Number.isFinite(j.ms) && Math.abs(ph.afterEngineMs - (j.ms - engineMs)) <= 2,
  { ms: j.ms, engineMs, afterEngineMs: ph.afterEngineMs },
);

console.log(JSON.stringify({
  hs: top,
  status: j.status,
  ms: j.ms,
  engineMs,
  phases: ph,
}, null, 2));

if (fail) {
  console.error(`FAIL ${fail} | PASS ${pass}`);
  process.exit(1);
}
console.log(`=== ALL TESTS PASSED === (${pass})`);
