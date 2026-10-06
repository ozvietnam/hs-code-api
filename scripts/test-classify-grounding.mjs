// Test luồng kiến thức cho bước chọn mã (06/10/2026 — thiết kế vĩ mô): mỗi lập luận gắn nguồn
// (sản phẩm / chú giải / tiền lệ / suy luận); đặc tính sản phẩm phải có nguyên văn trong chữ gốc. Ca thật: dao hái cau cán cách điện bị AI tự gán "có động cơ điện" → 8467.29.
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
const NOTES = 'Nhóm 8201: dụng cụ cầm tay dùng trong nông nghiệp, làm vườn — dao, kéo cắt cành';
const SP = (claim, evidence) => ({ stream: 'SAN_PHAM', claim, evidence });
const g = groundResults([
  { hs: '84672900', confidence: 92, basis: [SP('có động cơ điện', 'động cơ điện tích hợp')] },
  { hs: '82019000', confidence: 70, basis: [SP('dao hái cau thủ công', '摘割槟榔刀'), SP('cán nhôm', '铝合金'), { stream: 'CHU_GIAI', claim: 'dụng cụ làm vườn', evidence: 'dụng cụ cầm tay dùng trong nông nghiệp', ref: 'Nhóm 8201' }] },
], SRC, NOTES);
check('KHÔNG đổi thứ tự mã AI', g.results[0].hs === '84672900', JSON.stringify(g.results.map((r) => r.hs)));
check('đặc tính sản phẩm tự bịa: độ tin ≤60, giữ độ tin gốc', g.results[0].confidence <= 60 && g.results[0].llmConfidence === 92 && !g.results[0].grounded);
check('mã có đặc tính kiểm được trong hồ sơ: grounded, giữ độ tin', g.results[1].grounded && g.results[1].confidence === 70);
check('luồng chú giải được đối chiếu với chú giải đã đưa', g.results[1].basis[2].stream === 'CHU_GIAI' && g.results[1].basis[2].verified === true);
check('đếm số lập luận theo luồng', g.results[1].knowledgeStreams.SAN_PHAM === 2 && g.results[1].knowledgeStreams.CHU_GIAI === 1);
check('đặc tính bịa của mã đầu → câu hỏi', g.unsupportedClaims[0] === 'có động cơ điện');
const sl = groundResults([{ hs: '84672900', confidence: 92, basis: [{ stream: 'SUY_LUAN', claim: 'loại có động cơ thường dùng điện' }] }], SRC);
check('suy luận gắn đúng nhãn: không bị coi là bịa, nhưng chưa có đặc tính hàng → ≤70', sl.results[0].confidence === 70 && sl.unsupportedClaims.length === 0);
check('không có basis = không grounded, ≤70', !groundResults([{ hs: '82019000', confidence: 90 }], SRC).results[0].grounded);
check('luồng lạ → SUY_LUAN', groundResults([{ hs: '1', confidence: 50, basis: [{ stream: 'WEB', claim: 'x' }] }], SRC).results[0].basis[0].stream === 'SUY_LUAN');

// Qua classify đầy đủ: câu AI tự hiểu ("máy cắt có động cơ điện") KHÔNG phải chữ gốc sản phẩm
girReply = { results: [{ hs: '84672900', confidence: 92, reason: 'dụng cụ có động cơ điện', basis: [SP('có động cơ điện', 'máy cắt có động cơ điện')] }], missing: [] };
const r = await classify({ tenHang: '加粗防电摘割槟榔刀伸缩杆加长12米铝合金', nameZh: '加粗防电摘割槟榔刀伸缩杆加长12米铝合金', specs: '颜色分类: 13米8节加粗加厚杆+大刀 +锯刀' }, {});
check('đặc tính lấy từ câu AI tự hiểu bị loại → độ tin ≤60 + hỏi', r.results[0].confidence <= 60 && r.results[0].grounded === false && r.missing.some((m) => /động cơ/.test(m)), JSON.stringify([r.results[0], r.missing]));

// Dữ kiện phiếu (facts) là nguồn sản phẩm hợp lệ
girReply = { results: [{ hs: '82019000', confidence: 88, reason: 'dao hái cau', basis: [SP('chất liệu nhôm', 'hợp kim nhôm dày')] }], missing: [] };
const r2 = await classify({ tenHang: '加粗防电摘割槟榔刀', nameZh: '加粗防电摘割槟榔刀', facts: [{ key: 'material', labelVi: 'Chất liệu', valueVi: 'hợp kim nhôm dày', evidence: '加厚铝合金' }] }, {});
check('đặc tính từ dữ kiện phiếu được nhận, giữ độ tin', r2.results[0].grounded === true && r2.results[0].confidence === 88, JSON.stringify(r2.results[0]));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
