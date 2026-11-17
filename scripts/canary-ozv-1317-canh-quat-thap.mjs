#!/usr/bin/env node
/**
 * Canary OZV-1317 — STT 32 bộ 50 TB-TCHQ: cánh quạt tháp giải nhiệt nhập riêng → 84149029.
 * Không gọi LLM: stub R1 còn unknowns (như đo A1 17/11 earlyExit HOI 841490) rồi kỳ vọng
 * earlyExitChotTuConflict / classifyLoop CHOT 84149029.
 */
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
let script = [];
llmTier.callLLMJson = async (system) => {
  const next = script.shift();
  if (next instanceof Error) throw next;
  return { json: typeof next === 'function' ? next() : JSON.parse(JSON.stringify(next)), provider: 'stub', model: 'stub' };
};
console.error = () => {};
console.warn = () => {};

const { classifyLoop, earlyExitChotTuConflict } = require('../lib/engine-loop.js');

const TEN = 'Bộ cánh quạt của tháp giải nhiệt (cooling tower fan) không gồm motor, 1 bộ = 4 cánh + 1 mâm quạt; cánh bằng nhôm hoặc nhựa kết hợp sợi thủy tinh, đường kính 0,5 m đến 10 m tùy công suất giải nhiệt; hoạt động theo nguyên lý hút gió tạo luồng gió mạnh hút hơi nóng qua dòng nước để thải ra khí quyển; chuyên dùng cho tháp làm mát công nghiệp — TRƯỜNG HỢP nhập khẩu riêng rẽ (không kèm các chi tiết khác của tháp làm mát)';
const TEN_DONG_BO = 'Bộ cánh quạt tháp giải nhiệt (cooling tower fan) không gồm motor, 1 bộ = 4 cánh + 1 mâm; cánh bằng nhôm hoặc nhựa sợi thủy tinh, đường kính 0,5-10 m; hút gió kéo hơi nóng qua dòng nước để thải ra khí quyển; chuyên dùng cho tháp làm mát công nghiệp — TRƯỜNG HỢP nhập khẩu đồng bộ cùng các chi tiết khác của tháp làm mát (cùng chuyến hoặc nhiều chuyến theo Điều 8 Thông tư 14/2015/TT-BTC) để lắp thành tháp làm mát hoàn chỉnh';

const R1 = {
  product: {
    nameVi: 'Bộ cánh quạt tháp giải nhiệt', nameEn: 'cooling tower fan blade', purpose: 'tháp làm mát công nghiệp',
    mechanism: 'hút gió', material: 'nhôm/nhựa sợi thủy tinh', evidence: {},
  },
  hypotheses: [{ chapter: '84', heading4: '8414', subheading6: '841490', why: 'bộ phận quạt', confidence: 78 }],
  verify: {
    searchVi: ['cánh quạt tháp giải nhiệt'],
    codes8: ['84149029', '84195010', '84149042'],
    unknowns: [
      'Quạt tháp giải nhiệt thuộc loại tản gió trục hay hướng tâm',
      'Hàng được trình trưng bày thành bộ cánh quạt hoàn chỉnh hay nhiều bộ phận rời',
      'Đường kính thực tế của từng bộ cánh quạt',
      'Mâm quạt có đi kèm trục, chân cánh hoặc chi tiết ghép nối khác không',
      'Chứng từ có xác nhận hàng nhập riêng không kèm các chi tiết khác của tháp làm mát không',
    ],
  },
};

let pass = 0;
let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); }
  else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 600)}`); }
};

const chot = earlyExitChotTuConflict(TEN, R1);
check('earlyExitChotTuConflict riêng rẽ → CHOT 84149029', chot?.decision === 'CHOT' && chot?.hs === '84149029', JSON.stringify(chot));

const chotDb = earlyExitChotTuConflict(TEN_DONG_BO, { ...R1, hypotheses: [{ ...R1.hypotheses[0], heading4: '8419', subheading6: '841950' }] });
check('earlyExitChotTuConflict đồng bộ → CHOT 84195010', chotDb?.decision === 'CHOT' && chotDb?.hs === '84195010', JSON.stringify(chotDb));

const khong = earlyExitChotTuConflict('máy bơm nước ly tâm 1.5HP', R1);
check('earlyExitChotTuConflict hàng khác → null', khong === null, JSON.stringify(khong));

script = [R1]; // gon bật: earlyExitConflict phải CHOT, không gọi GIR
const out = await classifyLoop({ tenHang: TEN }, {});
const gates = out.engine?.gates || [];
check(
  'classifyLoop STT32 stub: có 84149029 trong results',
  (out.results || []).some((r) => String(r.hs) === '84149029'),
  JSON.stringify({ status: out.status, results: out.results, gates: gates.slice(-3) }),
);
check(
  'classifyLoop STT32 stub: earlyExitConflict trong gates (không earlyExitHoi)',
  gates.some((g) => g.earlyExitConflict === true) && !gates.some((g) => g.earlyExitHoi === true),
  JSON.stringify(gates.slice(-4)),
);
check(
  'classifyLoop STT32 stub: không NEED_FACTS',
  out.status !== 'NEED_FACTS',
  JSON.stringify({ status: out.status, next: out.nextAction }),
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
