// Test /api/classify với đầu vào kiểu ERP (kế hoạch OZSource H0 + H3): tiêu đề tiếng Trung,
// kiểm mâu thuẫn có/không, chặn độ tin thấp, xuất xứ, danh sách còn thiếu theo nhóm 4 số.
// LLM giả lập — không mạng, không ghi data/.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.HS_API_TOKEN = 'classify-test-token';
process.env.HS_ACCESS_LOG = '0';

let girReply = null;
const prompts = [];
const llmTier = require('../lib/llm-tier');
llmTier.callLLMJson = async (system, user) => {
  prompts.push({ system: system.slice(0, 30), user });
  if (system.includes('DỮ KIỆN HÀNG HÓA')) {
    if (user.includes('可口可乐')) {
      return { json: { tenHangVi: 'nước ngọt có ga', banChat: 'đồ uống có ga vị cola, có đường, đóng chai thủy tinh', thanhPhan: 'nước, đường, CO2, hương liệu', thuongHieu: 'Coca-Cola', noiSanXuat: 'MX' }, provider: 'stub', model: 'stub' };
    }
    if (user.includes('固态硬盘')) {
      return { json: { tenHangVi: 'ổ cứng thể rắn SSD', banChat: 'thiết bị lưu trữ dữ liệu cho máy tính, giao tiếp SATA', quyCach: '1.92TB' }, provider: 'stub', model: 'stub' };
    }
    return { json: { tenHangVi: 'hàng thử', banChat: 'hàng thử nghiệm' }, provider: 'stub', model: 'stub' };
  }
  if (system.includes('mã HS 4 số')) {
    if (/SSD|lưu trữ/.test(user)) return { json: { headings: ['8471', '8523'] }, provider: 'stub', model: 'stub' };
    return { json: { headings: ['2202', '2201'] }, provider: 'stub', model: 'stub' };
  }
  return { json: girReply, provider: 'stub', model: 'stub' };
};
console.error = () => {};
console.warn = () => {};

const handler = require('../api/classify.js');

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};
async function classify(body) {
  const res = { _s: 0, _j: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
  await handler({ method: 'POST', url: '/api/classify', query: {}, headers: { authorization: 'Bearer classify-test-token' }, body }, res);
  return res._j || {};
}

// 1. Tiêu đề Taobao tiếng Trung → hiểu hàng, AI chọn "không có ga" → bị đẩy xuống, 2202.10.30 lên đầu
girReply = { results: [{ hs: '22029950', confidence: 90, reason: 'Đồ uống dùng ngay.', gir: null }], missing: [] };
const r1 = await classify({ tenHang: '墨西哥原装进口 可口可乐 玻璃瓶 355ml*12瓶 碳酸饮料' });
const codes1 = (r1.results || []).map((r) => r.hs);
check('classify: tiêu đề Trung → queryUnderstanding.applied', r1.queryUnderstanding?.applied === true, JSON.stringify(r1.queryUnderstanding));
check('classify: AI nhận tên hàng tiếng Việt, không phải tiêu đề Trung', prompts.some((p) => p.user.includes('nước ngọt có ga') && p.user.includes('HỒ SƠ SẢN PHẨM')));
check('classify: mã "không có ga" xuống cuối, 2202.10.30 lên đầu', codes1[0] === '22021030' && codes1[codes1.length - 1] === '22029950', JSON.stringify(codes1));
check('classify: status NEEDS_EXPERT / FEATURE_CONFLICT', r1.status === 'NEEDS_EXPERT' && r1.nextAction?.reasonCode === 'FEATURE_CONFLICT', JSON.stringify({ s: r1.status, n: r1.nextAction }));
check('classify: cảnh báo feature-polarity-conflict', (r1.antiPatternWarnings || []).some((w) => w.id === 'feature-polarity-conflict'));
check('classify: xuất xứ MX, không áp C/O mẫu E', r1.originAssessment?.detectedOrigin === 'MX' && r1.originAssessment?.acftaApplicable === false, JSON.stringify(r1.originAssessment));

// 2. Độ tin thấp → NEEDS_EXPERT / LOW_CONFIDENCE
girReply = { results: [{ hs: '22021090', confidence: 20, reason: 'Không chắc.', gir: null }], missing: [] };
const r2 = await classify({ tenHang: 'Nước giải khát đóng chai loại mới 500ml', chatLieu: 'chai nhựa', congDung: 'uống' });
check('classify: conf 20 → NEEDS_EXPERT / LOW_CONFIDENCE', r2.status === 'NEEDS_EXPERT' && r2.nextAction?.reasonCode === 'LOW_CONFIDENCE', JSON.stringify({ s: r2.status, n: r2.nextAction }));
check('classify: tiếng Việt không gọi bước hiểu hàng', r2.queryUnderstanding?.applied === false && r2.queryUnderstanding?.reason === 'NO_CJK');

// 3. Bình thường → REVIEW
girReply = { results: [{ hs: '22021030', confidence: 85, reason: 'Nước có ga có hương liệu.', gir: null }], missing: [] };
const r3 = await classify({ tenHang: 'Nước ngọt có ga có hương liệu đóng chai 500ml', chatLieu: 'chai nhựa', congDung: 'uống' });
check('classify: conf 85, không mâu thuẫn → REVIEW', r3.status === 'REVIEW' && r3.nextAction?.type === 'USER_CONFIRM', JSON.stringify({ s: r3.status, n: r3.nextAction }));

// 4. SSD: danh sách còn thiếu theo nhóm 4 số, không đòi điện áp/công suất/CPU/RAM
girReply = { results: [{ hs: '84717020', confidence: 70, reason: 'Ổ cứng thể rắn — bộ lưu trữ.', gir: null }], missing: [] };
const r4 = await classify({ tenHang: '三星 PM883 1.92TB 固态硬盘 SATA', specs: '型号：PM883 容量：1.92TB' });
const keys4 = (r4.missingStructured || []).map((m) => m.key);
check('classify: SSD không bị đòi điện áp/công suất/CPU/RAM', !keys4.some((k) => ['voltage', 'power', 'cpuModel', 'ramCapacity'].includes(k)), JSON.stringify(keys4));
check('classify: missing[] không có mẫu chung của chương (điện áp)', !(r4.missing || []).some((m) => /điện áp|công suất/i.test(m)), JSON.stringify(r4.missing));

// 5. Mã 6 số → NEED_FACTS có câu hỏi
girReply = { results: [{ hs: '847170', confidence: 65, reason: 'Bộ lưu trữ, chưa rõ loại.', gir: null }], missing: ['Loại ổ (HDD/SSD/quang)?'] };
const r5 = await classify({ tenHang: 'Thiết bị lưu trữ dữ liệu cho máy tính', chatLieu: 'kim loại', congDung: 'lưu dữ liệu' });
check('classify: mã 6 số → NEED_FACTS có câu hỏi', r5.status === 'NEED_FACTS' && (r5.nextAction?.questions || []).length > 0, JSON.stringify({ s: r5.status, n: r5.nextAction }));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
