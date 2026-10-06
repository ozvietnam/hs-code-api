// Test căn cứ cho bước chọn mã (06/10/2026 — thiết kế vĩ mô): đặc tính AI dùng để chọn mã phải có
// nguyên văn trong chữ gốc. Ca thật: dao hái cau cán cách điện bị AI tự gán "có động cơ điện" → 8467.29.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.HS_ACCESS_LOG = '0';
let girReply = null;
const llmTier = require('../lib/llm-tier');
llmTier.callLLMJson = async (system) => {
  if (system.includes('DỮ KIỆN HÀNG HÓA')) return { json: { tenHangVi: 'máy cắt cau điện', banChat: 'máy cắt có động cơ điện' }, provider: 'stub', model: 'stub' };
  if (system.includes('mã HS 4 số')) return { json: { headings: ['8467', '8201'] }, provider: 'stub', model: 'stub' };
  return { json: girReply, provider: 'stub', model: 'stub' };
};
console.error = () => {}; console.warn = () => {};
const { classify, groundResults } = require('../lib/classify');
let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };

const SRC = '加粗防电摘割槟榔刀伸缩杆加长12米铝合金\n用途：用于摘取槟榔，勾树枝等';
const g = groundResults([
  { hs: '84672900', confidence: 92, basis: [{ claim: 'có động cơ điện', evidence: 'động cơ điện tích hợp' }] },
  { hs: '82019000', confidence: 70, basis: [{ claim: 'dao hái cau thủ công', evidence: '摘割槟榔刀' }, { claim: 'cán nhôm', evidence: '铝合金' }] },
], SRC);
check('mã đủ căn cứ lên trước mã có đặc tính bịa', g.results[0].hs === '82019000' && g.results[0].grounded && !g.results[1].grounded, JSON.stringify(g.results.map((r) => [r.hs, r.grounded, r.confidence])));
check('mã thiếu căn cứ: độ tin ≤60, giữ độ tin gốc để tra', g.results[1].confidence <= 60 && g.results[1].llmConfidence === 92);
check('không có basis = không có căn cứ', !groundResults([{ hs: '82019000', confidence: 90 }], SRC).results[0].grounded);
check('đặc tính bịa của mã đầu → câu hỏi', groundResults([{ hs: '84672900', confidence: 92, basis: [{ claim: 'có động cơ điện', evidence: 'động cơ' }] }], SRC).unsupportedClaims[0] === 'có động cơ điện');

// Qua classify đầy đủ: câu AI tự hiểu ("máy cắt có động cơ điện") KHÔNG được làm căn cứ
girReply = { results: [{ hs: '84672900', confidence: 92, reason: 'dụng cụ có động cơ điện', basis: [{ claim: 'có động cơ điện', evidence: 'máy cắt có động cơ điện' }] }], missing: [] };
const r = await classify({ tenHang: '加粗防电摘割槟榔刀伸缩杆加长12米铝合金', nameZh: '加粗防电摘割槟榔刀伸缩杆加长12米铝合金', specs: '颜色分类: 13米8节加粗加厚杆+大刀 +锯刀' }, {});
check('căn cứ lấy từ câu AI tự hiểu bị loại → độ tin ≤60 + hỏi', r.results[0].confidence <= 60 && r.results[0].grounded === false && r.missing.some((m) => /động cơ/.test(m)), JSON.stringify([r.results[0], r.missing]));

// Dữ kiện phiếu (facts) là căn cứ hợp lệ
girReply = { results: [{ hs: '82019000', confidence: 88, reason: 'dao hái cau', basis: [{ claim: 'chất liệu nhôm', evidence: 'hợp kim nhôm dày' }] }], missing: [] };
const r2 = await classify({ tenHang: '加粗防电摘割槟榔刀', nameZh: '加粗防电摘割槟榔刀', facts: [{ key: 'material', labelVi: 'Chất liệu', valueVi: 'hợp kim nhôm dày', evidence: '加厚铝合金' }] }, {});
check('căn cứ từ dữ kiện phiếu được nhận, giữ độ tin', r2.results[0].grounded === true && r2.results[0].confidence === 88, JSON.stringify(r2.results[0]));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
