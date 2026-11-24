// OZV-1341: early-exit CHOT từ trade-synonyms high+chotSom — bỏ vòng AI (R1+GIR).
// Mục tiêu A3: trung vị 4 câu top 24h ≤ 10 s (R1 MiniMax đo ≥15 s nên phải bỏ LLM khi từ điển đã chốt).
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
for (const k of ['ZAI_WEB_FACTS', 'HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'HS_SO_TAY', 'HS_CLASSIFY_FAST_FIRST', 'R1_MAX_TOKENS', 'GIR_MAX_TOKENS']) {
  delete process.env[k];
}
process.env.CLASSIFY_BUDGET_MS = '285000';

const llmTier = require('../lib/llm-tier');
let llmCalls = [];
llmTier.callLLMJson = async (system, user, opts = {}) => {
  llmCalls.push({ step: opts.step || (String(system).startsWith('VÒNG 1') ? 'understand' : 'gir') });
  throw new Error('LLM không được gọi khi earlyExitTradeChotSom');
};
console.error = () => {};
console.warn = () => {};

const { classifyLoop, earlyExitChotTuTrade } = require('../lib/engine-loop.js');
const { tradeClassifyHints, tradePreferredHs } = require('../lib/trade-classify-hints.js');

let pass = 0;
let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); }
  else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x.slice(0, 500) : JSON.stringify(x).slice(0, 500)}`); }
};

const CA = [
  { ten: 'bóng đèn led tròn đuôi e27', hs: '85395210', id: 'bong-den-led-duoi-e27' },
  { ten: 'cốc giữ nhiệt chân không (bình chân không)', hs: '96170010', id: 'coc-giu-nhiet-chan-khong' },
  { ten: 'máy bơm nước ly tâm dùng trong gia đình', hs: '84137042', id: 'may-bom-nuoc-ly-tam' },
  { ten: 'vỏ chụp loa bằng nhựa tổng hợp (nón loa)', hs: '85189090', id: 'vo-chup-loa-non-loa' },
  // OZV-1346: câu khách «đèn LED hình gấu» — trước đây 0 match term (chỉ có «đèn tường hình gấu») → LLM NEED_FACTS ~37s.
  { ten: 'đèn LED hình gấu', hs: '94054290', id: 'den-led-cam-tuong' },
  // OZV-2015: «túi sưởi điện gia dụng» — trước dừng 6 số nhánh 851679; chú giải 85.16 loại trừ làm ấm người → 63011000.
  { ten: 'túi sưởi điện gia dụng', hs: '63011000', id: 'tui-suoi-dien-gia-dung' },
  // OZV-2038: «điện trở 8*60 mm · 220V · 150W» — trước lệch 85169040 / dừng 6 số / search 8533 → 85168090.
  { ten: 'điện trở 8*60 mm, điện áp 220v, công suất 150w', hs: '85168090', id: 'dien-tro-dot-nong' },
];

for (const c of CA) {
  const hints = tradeClassifyHints(c.ten);
  const pref = tradePreferredHs(hints);
  check(
    `từ điển ${c.id}: high+chotSom → ${c.hs}`,
    pref?.hs === c.hs && pref.confidence === 'high' && pref.chotSom === true,
    pref,
  );
  const ee = earlyExitChotTuTrade(hints, c.ten);
  check(
    `earlyExitChotTuTrade ${c.id}: CHOT ${c.hs}`,
    ee?.decision === 'CHOT' && ee?.hs === c.hs && ee?._tradeEarly?.entryId && ee?.gir == null,
    ee,
  );
}

// Giác hút: có từ điển nhưng KHÔNG chotSom → null (leo AI như cũ — OZV-1320).
{
  const hints = tradeClassifyHints('giác hút chân không smc zp-905-08eu');
  const ee = earlyExitChotTuTrade(hints, 'giác hút chân không smc zp-905-08eu');
  check('giác hút không chotSom → earlyExitChotTuTrade null', ee === null, ee);
}

// OZV-2068: «bóng đèn led 9w» (chưa rõ đui xoáy hay đui ghim/cài) khớp bong-den-led nhưng KHÔNG chotSom → null;
// đối chứng «bóng đèn led e27 9w» có đui E27 vẫn khớp bong-den-led-duoi-e27 high+chotSom → CHOT 85395210.
{
  const hints9w = tradeClassifyHints('bóng đèn led 9w');
  const ee9w = earlyExitChotTuTrade(hints9w, 'bóng đèn led 9w');
  check(
    'OZV-2068 bóng đèn led 9w (chưa rõ đui) khớp bong-den-led nhưng không chotSom → earlyExitChotTuTrade null',
    hints9w.matches.some((m) => m.entryId === 'bong-den-led') && ee9w === null,
    { matches: hints9w.matches.map((m) => m.entryId), ee9w },
  );
  const hintsE27 = tradeClassifyHints('bóng đèn led e27 9w');
  const eeE27 = earlyExitChotTuTrade(hintsE27, 'bóng đèn led e27 9w');
  check(
    'OZV-2068 đối chứng bóng đèn led e27 9w vẫn earlyExitChotTuTrade CHOT 85395210',
    eeE27?.decision === 'CHOT' && eeE27?.hs === '85395210' && eeE27?._tradeEarly?.entryId === 'bong-den-led-duoi-e27',
    eeE27,
  );
}

for (const c of CA) {
  llmCalls = [];
  const out = await classifyLoop({ tenHang: c.ten }, { mic: false, crossCheck: false, timeoutMs: 8000 });
  const top = out.results?.[0]?.hs;
  const gates = out.engine?.gates || [];
  const girs = Array.isArray(out.girRulesApplied) ? out.girRulesApplied : [];
  check(
    `classifyLoop ${c.id}: REVIEW ${c.hs} không gọi LLM`,
    out.status === 'REVIEW' && top === c.hs && llmCalls.length === 0,
    { status: out.status, top, llm: llmCalls.length, gates: gates.slice(-3) },
  );
  check(
    `classifyLoop ${c.id}: log earlyExitTradeChotSom`,
    gates.some((g) => g.earlyExitTradeChotSom === true && g.hs === c.hs),
    gates.slice(-3),
  );
  // OZV-1341 trả thợ: early-exit từ điển không được gắn GIR giả LLM_ASSERTED.
  const llmGir = girs.filter((d) => d && d.basis === 'LLM_ASSERTED');
  const okBasis = girs.every((d) => !d?.basis || d.basis === 'DETERMINISTIC' || d.basis === 'RULE_TABLE');
  check(
    `classifyLoop ${c.id}: girRulesApplied không LLM_ASSERTED`,
    llmGir.length === 0 && okBasis,
    girs.map((d) => ({ rule: d.ruleKey || d.id, basis: d.basis, source: d.source })),
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
