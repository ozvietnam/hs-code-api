// Hồ sơ MiniMax theo bước (backlog 07 E-3): LLM_STEP_<BƯỚC>="model:off|low|..." → model + tham số
// suy nghĩ chỉ gửi cho MiniMax; mẫu hồ sơ lỗi 400/403/404 → lùi về mẫu mặc định.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };
const { stepProfile } = require('../lib/llm-tier');
process.env.LLM_STEP_HEADINGS = 'MiniMax-M3:off';
process.env.LLM_STEP_GIR = 'MiniMax-M3.1-Flash-Preview:low';
check('off → thinking disabled', JSON.stringify(stepProfile('headings')) === JSON.stringify({ model: 'MiniMax-M3', extraBody: { thinking: { type: 'disabled' } } }));
check('low → reasoning_effort', stepProfile('gir').extraBody.reasoning_effort === 'low');
check('không cấu hình → null (hành vi cũ)', stepProfile('describe') === null && stepProfile(undefined) === null);

process.env.MINIMAX_API_KEY = 'k';
const bodies = [];
globalThis.fetch = async (url, init) => {
  const b = JSON.parse(init.body); bodies.push(b);
  if (b.model === 'MiniMax-M3') return new Response('{"error":"model"}', { status: 404 });
  return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":1}' } }] }), { status: 200 });
};
const { chat } = await import('../lib/llm.mjs');
const r = await chat([{ role: 'user', content: 'x' }], { json: true, minimax: stepProfile('headings'), order: ['minimax'] });
check('mẫu hồ sơ gửi kèm thinking disabled', bodies[0].model === 'MiniMax-M3' && bodies[0].thinking?.type === 'disabled');
check('mẫu hồ sơ 404 → lùi về mẫu mặc định, KHÔNG gửi tham số suy nghĩ', bodies[1].model !== 'MiniMax-M3' && !bodies[1].thinking && r.model === bodies[1].model);
bodies.length = 0;
await chat([{ role: 'user', content: 'x' }], { json: true, order: ['minimax'] });
check('không hồ sơ → y như cũ', bodies.length === 1 && !bodies[0].thinking && !bodies[0].reasoning_effort);
bodies.length = 0;
globalThis.fetch = async (url, init) => {
  const b = JSON.parse(init.body); bodies.push(b);
  if (b.model === 'MiniMax-M3') return new Response('{"type":"error","error":{"message":"Token Plan rate limit reached"}}', { status: 429 });
  return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":1}' } }] }), { status: 200 });
};
const r429 = await chat([{ role: 'user', content: 'x' }], { json: true, minimax: stepProfile('headings'), order: ['minimax'] });
check('mẫu hồ sơ 429 (giới hạn gói) → lùi về mẫu mặc định', bodies.length === 2 && r429.model === bodies[1].model && bodies[1].model !== 'MiniMax-M3');
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
