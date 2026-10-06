// Test /api/classify đọc bảng quyết định NHÓM 4 số đã verified (B3.6, 06/10/2026): ổ cắm gia dụng
// AI xếp 8536.69.32 (dòng cho cáp đồng trục/mạch in) → bảng 8536 chỉnh về 8536.69.92 trong cùng phân
// nhóm 6 số. Không được nhảy sang phân nhóm khác. LLM giả lập — không mạng.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.HS_ACCESS_LOG = '0';

let girReply = null;
const llmTier = require('../lib/llm-tier');
llmTier.callLLMJson = async (system) => {
  if (system.includes('DỮ KIỆN HÀNG HÓA')) return { json: { tenHangVi: 'ổ cắm điện âm tường', banChat: 'ổ cắm điện gia dụng lắp âm tường, 10A' }, provider: 'stub', model: 'stub' };
  if (system.includes('mã HS 4 số')) return { json: { headings: ['8536'] }, provider: 'stub', model: 'stub' };
  return { json: girReply, provider: 'stub', model: 'stub' };
};
console.error = () => {};
console.warn = () => {};

const { classify } = require('../lib/classify');

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};

const SOCKET = { tenHang: 'Ổ cắm điện âm tường loại 86 có công tắc', nameZh: '86型墙壁暗装电源插座带开关', specs: '额定电流: 10A; 插孔类型: 二三三插' };

girReply = { results: [{ hs: '85366932', confidence: 85, reason: 'ổ cắm dưới 16A' }], missing: [] };
const r1 = await classify(SOCKET, {});
check('AI ra 8536.69.32 → bảng 8536 đã duyệt chỉnh về 8536.69.92', r1.results?.[0]?.hs === '85366992', JSON.stringify(r1.results?.map((r) => r.hs)));
check('ghi vết chỉnh: from 85366932, có ruleId', r1.results?.[0]?.resolverOverride?.from === '85366932' && r1.results[0].resolverOverride.ruleId, JSON.stringify(r1.results?.[0]?.resolverOverride));
check('mã AI cũ giữ làm gợi ý phụ', r1.results.some((r, i) => i > 0 && r.hs === '85366932'));

// Bảng không được kéo sang phân nhóm 6 số khác (AI chọn công tắc 8536.50 → không ép thành ổ cắm)
girReply = { results: [{ hs: '85365061', confidence: 85, reason: 'công tắc' }], missing: [] };
const r2 = await classify({ ...SOCKET }, {});
check('khác phân nhóm 6 số → không chỉnh', r2.results?.[0]?.hs?.startsWith('853650'), JSON.stringify(r2.results?.map((r) => r.hs)));

// Tắt được theo opts
girReply = { results: [{ hs: '85366932', confidence: 85, reason: 'x' }], missing: [] };
const r3 = await classify(SOCKET, { decisionTables: false });
check('opts.decisionTables=false → giữ mã AI', r3.results?.[0]?.hs === '85366932');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
