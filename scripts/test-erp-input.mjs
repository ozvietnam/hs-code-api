// Test luồng đầu vào kiểu ERP (tiêu đề Taobao tiếng Trung) cho /api/suggest.
// LLM được giả lập để kiểm TẤT ĐỊNH các bước quanh LLM: hiểu hàng, tìm ứng viên
// bằng dữ kiện tiếng Việt, kiểm cấp 8 số, cửa chặn độ tin thấp, không cache kết
// quả kém. Không mạng, không ghi data/.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.HS_API_TOKEN = 'test-token';

let rerankReply = null;
const calls = [];
const llmTier = require('../lib/llm-tier');
llmTier.callLLMJson = async (system, user) => {
  calls.push(system.slice(0, 40));
  if (system.includes('DỮ KIỆN HÀNG HÓA')) {
    if (user.includes('可口可乐')) {
      return { json: { tenHangVi: 'nước ngọt có ga', banChat: 'đồ uống có ga vị cola, có đường mía, đóng chai thủy tinh 355ml', thanhPhan: 'nước, đường mía, CO2, hương liệu', thuongHieu: 'Coca-Cola', noiSanXuat: 'MX' }, provider: 'stub', model: 'stub' };
    }
    return { json: { tenHangVi: 'hàng thử', banChat: 'hàng thử nghiệm' }, provider: 'stub', model: 'stub' };
  }
  if (system.includes('mã HS 4 số')) return { json: { headings: ['2202'] }, provider: 'stub', model: 'stub' };
  return { json: rerankReply, provider: 'stub', model: 'stub' };
};
console.error = () => {};
console.warn = () => {};

const { checkSubheading } = require('../lib/subheading-check.js');
const { understandQuery } = require('../lib/query-understand.js');
const handler = require('../api/suggest.js');

let pass = 0;
let fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
}
async function suggest(description) {
  const res = { _s: 0, _j: null, setHeader() {}, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
  await handler({ method: 'POST', url: '/api/suggest', query: {}, headers: { authorization: 'Bearer test-token' }, body: { description } }, res);
  return res._j || {};
}

// 1. Kiểm cấp 8 số
const s1 = checkSubheading('22021020', 'nước ngọt có ga vị cola đóng chai thủy tinh');
check('subheading: nước tăng lực không có dấu hiệu → cờ', s1.ok === false && s1.alternative === '22021030', JSON.stringify(s1));
check('subheading: có chữ "tăng lực" → qua', checkSubheading('22021020', 'Nước tăng lực Red Bull lon 250ml').ok);
check('subheading: dòng "Loại khác" không bị cờ', checkSubheading('22021090', 'nước ngọt').ok);

// 2. Hiểu hàng
const u0 = await understandQuery('Nước ngọt có ga chai 355ml');
check('understand: tiếng Việt không gọi LLM', u0.applied === false && u0.reason === 'NO_CJK');
const u1 = await understandQuery('进口墨西哥可口可乐玻璃瓶蔗糖 mexico Coca Cola珍藏版355ml汽水');
check('understand: tiêu đề Trung → dữ kiện Việt', u1.applied && /nước ngọt có ga/.test(u1.searchText) && u1.facts.noiSanXuat === 'MX', JSON.stringify(u1));
check('understand: câu tìm kiếm không còn chữ Hán, không có tên thương hiệu làm tên hàng', !/[一-鿿]/.test(u1.searchText) && !/coca/i.test(u1.facts.tenHangVi));

// 3. Luồng đầy đủ: AI chọn nước tăng lực nhưng lý do tự phủ định → đổi sang dòng có ga
rerankReply = { suggestions: [
  { hsCode: '22021020', confidence: 85, reasoning: 'Đây là nước ngọt thông thường (Cola), không phải nước tăng lực, nhưng vẫn thuộc nước giải khát có ga.', gir: null },
  { hsCode: '22021090', confidence: 40, reasoning: 'Loại khác', gir: null },
] };
const r1 = await suggest('进口墨西哥可口可乐玻璃瓶蔗糖 mexico Coca Cola珍藏版355ml汽水');
const codes1 = (r1.suggestions || []).map((s) => s.hsCode);
check('suggest: queryUnderstanding.applied', r1.queryUnderstanding?.applied === true, JSON.stringify(r1.queryUnderstanding));
check('suggest: ứng viên có nhóm 2202, không có 2939 (cocaine)', (r1.evidence || []).some((e) => String(e.hsCode).startsWith('2202')) && !(r1.evidence || []).some((e) => String(e.hsCode).startsWith('2939')), JSON.stringify((r1.evidence || []).map((e) => e.hsCode)));
check('suggest: AI tự mâu thuẫn → 2202.10.30 lên đầu', codes1[0] === '22021030', JSON.stringify(codes1));
check('suggest: có cảnh báo subheading-self-contradiction', (r1.antiPatternWarnings || []).some((w) => w.id === 'subheading-self-contradiction'));

// 4. Độ tin thấp → NEEDS_EXPERT, không cache
rerankReply = { suggestions: [{ hsCode: '22021090', confidence: 15, reasoning: 'Không chắc.', gir: null }] };
const lowDesc = 'Nước giải khát đóng chai loại mới 500ml thử nghiệm';
const r2 = await suggest(lowDesc);
check('suggest: conf 15 → NEEDS_EXPERT/LOW_CONFIDENCE', r2.status === 'NEEDS_EXPERT' && r2.nextAction?.reasonCode === 'LOW_CONFIDENCE', JSON.stringify({ s: r2.status, n: r2.nextAction }));
const r3 = await suggest(lowDesc);
check('suggest: kết quả độ tin thấp không bị cache', !r3.cached);

// 5. Độ tin bình thường vẫn cache như cũ
rerankReply = { suggestions: [{ hsCode: '22021030', confidence: 80, reasoning: 'Nước có ga có hương liệu.', gir: null }] };
const okDesc = 'Nước ngọt có ga có hương liệu đóng chai 500ml';
await suggest(okDesc);
const r5 = await suggest(okDesc);
check('suggest: độ tin ≥ 40 vẫn cache', r5.cached === true);

// 6. Xuất xứ: nơi sản xuất ≠ nơi mua
const { originAssessment } = require('../lib/origin-hints.js');
const o1 = originAssessment('进口墨西哥可口可乐玻璃瓶蔗糖 mexico Coca Cola珍藏版355ml汽水');
check('origin: 墨西哥 + 进口 → MX, không áp C/O E', o1.detectedOrigin === 'MX' && o1.acftaApplicable === false, JSON.stringify(o1));
check('origin: 韩版 là phong cách, không phải xuất xứ', originAssessment('韩版宽松卫衣女').detectedOrigin === null);
check('origin: hàng TQ thường → không cảnh báo', originAssessment('小米充电宝20000毫安快充').acftaApplicable === null);
check('suggest: response có originAssessment MX', r1.originAssessment?.detectedOrigin === 'MX', JSON.stringify(r1.originAssessment));

// 7. Kiểm mô tả khai: chữ Hán + xuất xứ mâu thuẫn
const { validateDeclaration } = require('../lib/declaration-validator.js');
const v1 = validateDeclaration(
  { tenHang: 'Coca-Cola Mexico nhập khẩu đường mía 355ml soda / 进口墨西哥可口可乐', xuatXu: { code: 'CN', nameVi: 'Trung Quốc' }, donViTinh: 'Chai' },
  '22021030',
  { sourceText: '进口墨西哥可口可乐玻璃瓶蔗糖 mexico Coca Cola珍藏版355ml汽水' },
);
const codesV = (v1.warnings || []).map((w) => w.code);
check('validator: chữ Hán trong mô tả → CJK_IN_DECLARATION', codesV.includes('CJK_IN_DECLARATION'), JSON.stringify(codesV));
check('validator: khai CN nhưng tiêu đề Mexico → ORIGIN_CONFLICT', codesV.includes('ORIGIN_CONFLICT'), JSON.stringify(codesV));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
