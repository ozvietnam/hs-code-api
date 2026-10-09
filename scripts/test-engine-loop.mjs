// Động cơ hai vòng + chốt chặn (lib/engine-loop.js) — AI giả, kiểm luồng và các cổng chặn.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.HS_CLASSIFY_ENGINE = 'loop';
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
const llmTier = require('../lib/llm-tier');
let script = []; let calls = [];
llmTier.callLLMJson = async (system, user, opts = {}) => {
  calls.push({ round: system.startsWith('VÒNG 1') ? 1 : 2, user, thinkingOff: opts.minimax?.extraBody?.thinking?.type === 'disabled' });
  const next = script.shift();
  if (next instanceof Error) throw next;
  return { json: typeof next === 'function' ? next(user) : next, provider: 'stub', model: 'stub' };
};
console.error = () => {}; console.warn = () => {};
const { classify } = require('../lib/classify');
let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };
const run = async (attrs, steps) => { script = steps; calls = []; return classify(attrs, {}); };

const R1_KNIFE = { product: { nameVi: 'dao hái cau cán dài', nameEn: 'telescopic pole fruit picker knife', nameZh: '摘割槟榔刀伸缩杆', purpose: 'hái quả cau, cắt cành trên cao', mechanism: 'cơ-tay', material: 'hợp kim nhôm', evidence: { purpose: '用于摘取槟榔', mechanism: '', material: '铝合金' } }, hypotheses: [{ chapter: '82', heading4: '8201', subheading6: '820190', why: 'dụng cụ cầm tay nông nghiệp', confidence: 80 }], verify: { searchVi: ['dao hái cau', 'dụng cụ hái quả cán dài'], notesChapters: ['82'], codes8: ['82019000'], micQuery: null, unknowns: [] } };
const KNIFE = { tenHang: '加粗防电摘割槟榔刀伸缩杆加长12米铝合金', nameZh: '加粗防电摘割槟榔刀伸缩杆加长12米铝合金', specs: '用途: 用于摘取槟榔; 材质: 铝合金' };

// 1. Đường hạnh phúc: 2 lượt AI, CHỐT, không cờ
let r = await run(KNIFE, [R1_KNIFE, { decision: 'CHOT', hs: '82019000', confidence: 88, reason: 'dụng cụ cầm tay nông nghiệp, cơ-tay', gir: 'GIR 1', basis: [{ stream: 'SAN_PHAM', claim: 'dùng hái cau', evidence: '用于摘取槟榔' }, { stream: 'CHU_GIAI', claim: 'nhóm 8201 gồm dụng cụ cầm tay nông nghiệp', ref: '8201' }], conditions: [{ fact: 'thao tác bằng tay, không động cơ', status: 'MET', evidence: '伸缩杆' }], alternatives: [], questions: [] }]);
check('đường hạnh phúc: REVIEW, không cờ, 2 lượt AI', r.status === 'REVIEW' && r.results[0]?.hs === '82019000' && r.review.needed === false && calls.length === 2, JSON.stringify([r.status, r.results[0]?.hs, calls.length]));
check('câu trích đặc tính kiểm với hồ sơ GỐC → verified', r.results[0].basis[0].verified === true);
check('vòng 2 nhận chú giải + dòng biểu thuế nhóm 8201', /NHÓM 8201/.test(calls[1].user) && /82019000/.test(calls[1].user));
check('có ECUS, dossier 3 thứ tiếng', r.ecus && r.dossier.product.nameEn === 'telescopic pole fruit picker knife');

// 2. Chốt chặn "trừ plastic" → vòng 3 sửa mã
const R1_TOY = { product: { nameVi: 'đồ chơi súng ngón tay in 3D', nameEn: '3D printed finger gun toy keychain', nameZh: '3D打印钥匙扣手指枪', purpose: 'đồ chơi giải trí bắn bi', mechanism: 'cơ-tay', material: 'nhựa PLA', evidence: { material: '材质: 塑料' } }, hypotheses: [{ chapter: '95', heading4: '9503', subheading6: '950300', why: 'đồ chơi khác', confidence: 85 }], verify: { searchVi: ['đồ chơi súng nhựa'], codes8: ['95030050', '95030099'], micQuery: null, unknowns: [] } };
const TOY = { tenHang: '3D打印钥匙扣可发射小球解压玩具手指枪', nameZh: '3D打印钥匙扣可发射小球解压玩具手指枪', specs: '材质: 塑料; 工艺: 3D打印' };
r = await run(TOY, [R1_TOY,
  { decision: 'CHOT', hs: '95030050', confidence: 80, reason: 'đồ chơi khác', basis: [{ stream: 'SAN_PHAM', claim: 'bằng nhựa', evidence: '材质: 塑料' }], conditions: [], alternatives: [], questions: [] },
  (user) => (/LẦN TRƯỚC BỊ CHẶN/.test(user) && /MAU_THUAN_NHAN_DONG/.test(user) ? { decision: 'CHOT', hs: '95030099', confidence: 82, reason: 'đồ chơi khác bằng plastic → Loại khác', basis: [{ stream: 'SAN_PHAM', claim: 'bằng nhựa', evidence: '材质: 塑料' }], conditions: [], alternatives: [], questions: [] } : { decision: 'CHOT', hs: '95030050', confidence: 80 }),
]);
check('cổng "trừ plastic" chặn 9503.00.50 → vòng 3 → 9503.00.99', r.results[0]?.hs === '95030099' && calls.length === 3 && r.engine.gates[0].blocks.includes('MAU_THUAN_NHAN_DONG'), JSON.stringify([r.results[0]?.hs, calls.length, r.engine.gates]));
check('lý do chặn được gửi cho vòng 3', /trừ plastic|plastic/i.test(calls[2].user));

// 3. HỎI → NEED_FACTS với câu hỏi về thuộc tính
r = await run(TOY, [R1_TOY, { decision: 'HOI', hs: '950300', confidence: 50, reason: 'chưa rõ có phải mô hình theo tỷ lệ', basis: [], conditions: [{ fact: 'là mô hình thu nhỏ theo tỷ lệ của vật thật', status: 'UNKNOWN', evidence: '' }], alternatives: [], questions: [{ fact: 'mô hình theo tỷ lệ', question: 'Sản phẩm có phải bản thu nhỏ theo tỷ lệ của một vật thật không?', whereToFind: 'ảnh / hỏi người bán' }] }]);
check('HỎI → NEED_FACTS, câu hỏi về thuộc tính, không nhắc mã', r.status === 'NEED_FACTS' && r.nextAction.questions[0].questionVi.includes('tỷ lệ') && !/9503/.test(r.nextAction.questions[0].questionVi), JSON.stringify([r.status, r.nextAction]));

// 4. Bảng quyết định đã duyệt (8536) ghi đè
const R1_SOCKET = { product: { nameVi: 'ổ cắm điện âm tường', nameEn: 'wall socket 86 type', nameZh: '86型墙壁暗装电源插座', purpose: 'ổ cắm điện gia dụng', mechanism: 'điện', material: 'PC', evidence: {} }, hypotheses: [{ chapter: '85', heading4: '8536', subheading6: '853669', why: 'ổ cắm', confidence: 90 }], verify: { searchVi: ['ổ cắm điện'], codes8: ['85366932', '85366992'], micQuery: 'wall socket 86', unknowns: [] } };
r = await run({ tenHang: '86型墙壁暗装电源插座带开关五孔面板家用', nameZh: '86型墙壁暗装电源插座带开关五孔面板家用', specs: '额定电流: 10A; 额定电压: 250V' }, [R1_SOCKET, { decision: 'CHOT', hs: '85366932', confidence: 80, reason: 'ổ cắm', basis: [{ stream: 'SAN_PHAM', claim: 'ổ cắm 10A', evidence: '额定电流: 10A' }], conditions: [], alternatives: [], questions: [] }]);
check('bảng 8536 đã duyệt ghi đè → RESOLVED_BY_TABLE 85366992', r.status === 'RESOLVED_BY_TABLE' && r.results[0]?.hs === '85366992' && r.results[0].resolverOverride?.from === '85366932', JSON.stringify([r.status, r.results.map((x) => x.hs)]));

// 5. Câu trích bịa → chặn; AI vẫn bịa → sau trần vòng → NEEDS_EXPERT/NEED_FACTS, không chốt
r = await run(KNIFE, [R1_KNIFE,
  { decision: 'CHOT', hs: '84672900', confidence: 90, reason: 'dụng cụ có động cơ điện', basis: [{ stream: 'SAN_PHAM', claim: 'có động cơ điện', evidence: '电动机 220V' }], conditions: [], alternatives: [], questions: [] },
  { decision: 'CHOT', hs: '84672900', confidence: 90, reason: 'dụng cụ có động cơ điện', basis: [{ stream: 'SAN_PHAM', claim: 'có động cơ điện', evidence: '电动机 220V' }], conditions: [], alternatives: [], questions: [] },
  { decision: 'CHOT', hs: '84672900', confidence: 90, reason: 'dụng cụ có động cơ điện', basis: [{ stream: 'SAN_PHAM', claim: 'có động cơ điện', evidence: '电动机 220V' }], conditions: [], alternatives: [], questions: [] },
]);
check('câu trích không có trong hồ sơ → chặn tới trần vòng → không CHỐT', r.status !== 'REVIEW' && r.status !== 'RESOLVED_BY_TABLE' && r.missing.some((m) => /Chưa chốt được/.test(m)) && calls.length === 4, JSON.stringify([r.status, calls.length, r.engine.gates.map((x) => x.blocks)]));
check('nhóm 8467 chưa kiểm → máy chủ tự bổ sung chú giải cho vòng sau', /NHÓM 8467/.test(calls[2].user));

// 5b. Điều kiện phủ định CHƯA RÕ ("Hàng KHÔNG phải kéo…") không thành câu hỏi cho khách
r = await run(KNIFE, [R1_KNIFE, { decision: 'CHOT', hs: '82019000', confidence: 85, reason: 'x', basis: [{ stream: 'SAN_PHAM', claim: 'hái cau', evidence: '用于摘取槟榔' }], conditions: [{ fact: 'Hàng KHÔNG phải kéo cắt cành có vòng xỏ ngón tay', status: 'UNKNOWN', evidence: '' }, { fact: 'Vận hành bằng tay, không có động cơ', status: 'UNKNOWN', evidence: '' }, { fact: 'Chiều dài cán', status: 'UNKNOWN', evidence: '' }], alternatives: [], questions: [] }]);
check('điều kiện phủ định không thành câu hỏi; điều kiện khẳng định (kể cả có chữ "không" bên trong) thì có', r.missing.some((m) => /Chiều dài cán/.test(m)) && r.missing.some((m) => /Vận hành bằng tay/.test(m)) && !r.missing.some((m) => /KHÔNG phải kéo/.test(m)), JSON.stringify(r.missing));

// 6a. Tiền lệ Oz khớp cao nhưng khác nhóm → cờ xem lại (không chặn, không đổi mã)
const ozMod = require('../lib/oz-precedent-search');
const origOz = ozMod.searchOzByKeyword;
ozMod.searchOzByKeyword = async () => ({ items: [{ hsCode: '87168010', tenHang: 'Xe đẩy thức ăn dùng trong khách sạn', ozCount: 3, matchCoverage: 80 }] });
r = await run({ tenHang: 'Xe đẩy thức ăn dùng trong khách sạn, khung inox', nameZh: null }, [
  { product: { nameVi: 'xe đẩy thức ăn khách sạn', nameEn: 'hotel food service trolley', purpose: 'phục vụ thức ăn', mechanism: 'cơ-tay', material: 'inox' }, hypotheses: [{ chapter: '94', heading4: '9403', subheading6: '940320', why: 'đồ nội thất', confidence: 80 }], verify: { searchVi: ['xe đẩy thức ăn'], codes8: ['94032090'], micQuery: null, unknowns: [] } },
  { decision: 'CHOT', hs: '94032090', confidence: 85, reason: 'đồ nội thất kim loại', basis: [{ stream: 'SAN_PHAM', claim: 'khung inox', evidence: 'khung inox' }], conditions: [], alternatives: [], questions: [] },
]);
ozMod.searchOzByKeyword = origOz;
check('tiền lệ Oz khác nhóm → giữ mã AI nhưng gắn cờ xem lại', r.results[0]?.hs === '94032090' && r.review.needed && /8716/.test(r.review.reasons[0]), JSON.stringify([r.results[0]?.hs, r.review]));

// 6b. Lưới an toàn: vòng 2 trả JSON không đọc được (M3 suy nghĩ quá dài) → gọi lại cùng mẫu tắt suy nghĩ
r = await run(KNIFE, [R1_KNIFE, new Error('No parseable JSON in LLM output [minimax/MiniMax-M3, 46103 ký tự]'), { decision: 'CHOT', hs: '82019000', confidence: 80, reason: 'dụng cụ nông nghiệp', basis: [{ stream: 'SAN_PHAM', claim: 'hái cau', evidence: '用于摘取槟榔' }], conditions: [], alternatives: [], questions: [] }]);
check('JSON hỏng → gọi lại tắt suy nghĩ → vẫn ra mã', r.results[0]?.hs === '82019000' && r.engine.gates.some((x) => x.fallback === 'thinking-off') && calls.length === 3 && calls[2].thinkingOff === true, JSON.stringify([r.status, calls.length, r.engine.gates]));

// 6. Vòng 1 lỗi → RETRY, không rỗng-DONE
r = await run(KNIFE, [new Error('HTTP 429 Token Plan rate limit')]);
check('vòng 1 lỗi tạm thời → nextAction RETRY', r.nextAction?.type === 'RETRY' && r.results.length === 0);


// 09/10/2026: key Gemini hết tiền nạp (402) → không thử lại 5/15/30 s, lùi MiniMax ngay.
{
  const { isGeminiBillingError } = await import('../lib/engine-loop.js').then((m) => m.default || m);
  check('402 credits depleted là lỗi thanh toán', isGeminiBillingError('Gemini API error 402: {"error":{"code":402,"message":"Your prepayment credits are depleted."}}'));
  check('403 PERMISSION_DENIED là lỗi khoá key', isGeminiBillingError('Gemini API error 403: PERMISSION_DENIED'));
  check('503 quá tải KHÔNG phải lỗi thanh toán (vẫn thử lại)', !isGeminiBillingError('Gemini API error 503: high demand'));
  check('timeout KHÔNG phải lỗi thanh toán', !isGeminiBillingError('Gemini timeout after 90000ms'));
}
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
