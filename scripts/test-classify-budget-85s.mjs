// OZV-1314 — trần CLASSIFY_BUDGET_MS mặc định ≤ 85 s (trần Cổng/Cloudflare).
// Trước: mặc định 285 s → lượt chậm (118–286 s) thành BACKEND_LOI phía Cổng (cắt 95 s).
// Sau: không đặt env ⇒ ngân sách mềm ≤ 85000; LLM treo ⇒ ENGINE_TIMEOUT mềm, wall ≤ 85 s.
// Không gọi mạng: fetch/LLM giả + đồng hồ giả.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const require = createRequire(import.meta.url);

for (const k of [
  'CLASSIFY_BUDGET_MS', 'LOOP_R1_TIMEOUT_MS', 'LOOP_R2_TIMEOUT_MS', 'LOOP_THINKING_OFF_TIMEOUT_MS',
  'HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'HS_CLASSIFY_FAST_FIRST', 'HS_SO_TAY', 'HS_SO_TAY_DONG',
  'HS_EMBED_POOL', 'ZAI_WEB_FACTS', 'ZAI_SEARCH_KEY', 'MIC_OFF', 'LOOP_PROVIDER',
]) delete process.env[k];
process.env.HS_CLASSIFY_CROSSCHECK = '0';
process.env.HS_SOTAY_RUNTIME = 'false';
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';

// Xóa cache để hằng BUDGET_MS đọc lại env (không còn CLASSIFY_BUDGET_MS).
const enginePath = require.resolve('../lib/engine-loop.js');
const llmPath = require.resolve('../lib/llm-tier.js');
delete require.cache[enginePath];
delete require.cache[llmPath];

const llmTier = require('../lib/llm-tier');
const realNow = Date.now.bind(Date);
let fake = realNow();
Date.now = () => fake;

llmTier.callLLMJson = async (_sys, _user, opts = {}) => {
  const ms = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 30000;
  fake += ms; // giả treo đúng bằng hạn bước — AbortController thật không cần
  throw new Error(`timeout sau ${ms}ms (giả — OZV-1314)`);
};
console.error = () => {};
console.warn = () => {};

const { classifyLoop, BUDGET_MS, BUDGET_MS_MAC_DINH } = require('../lib/engine-loop.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); }
  else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 400)}`); }
};

const TRAN_CONG = 85000;

check('A1 hằng mặc định BUDGET_MS_MAC_DINH ≤ 85 s (trần Cổng)', BUDGET_MS_MAC_DINH <= TRAN_CONG, String(BUDGET_MS_MAC_DINH));
check('A2 không đặt CLASSIFY_BUDGET_MS ⇒ BUDGET_MS hiệu dụng ≤ 85 s', BUDGET_MS <= TRAN_CONG, String(BUDGET_MS));
check('A3 BUDGET_MS === BUDGET_MS_MAC_DINH khi không có env', BUDGET_MS === BUDGET_MS_MAC_DINH, `${BUDGET_MS}≠${BUDGET_MS_MAC_DINH}`);

const t0 = fake;
const out = await classifyLoop({ tenHang: 'van xả máy giặt', chatLieu: 'nhựa', congDung: 'xả nước' }, { kenhGoi: 'cong-oz' });
const wall = fake - t0;

check('B1 LLM treo ⇒ ENGINE_TIMEOUT mềm (không ném, không treo)', out?.nextAction?.reasonCode === 'ENGINE_TIMEOUT', JSON.stringify([out?.status, out?.nextAction]));
check('B2 wall ≤ ngân sách 85 s', wall <= TRAN_CONG, String(wall));
check('B3 wall < trần Cổng 95 s (biên an toàn)', wall < 95000, String(wall));
check('B4 missing kênh Cổng: câu trung tính (không nhắc Áp mã)', /AI bận|quá thời gian/i.test(out?.missing?.[0] || '') && !/Áp mã/.test(out?.missing?.[0] || ''), JSON.stringify(out?.missing));

Date.now = realNow;

console.log(`\n${pass} passed, ${fail} failed`);
if (typeof process !== 'undefined' && process.argv?.[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(fail ? 1 : 0);
}
process.exit(fail ? 1 : 0);
