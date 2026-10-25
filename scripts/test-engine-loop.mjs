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

// 0b. Đo ms từng pha (backlog 09 bước 0): phases có r1Ms/gatherMs/llmMs hợp lệ, tổng khớp engine.ms.
{
  const ph = r.engine.phases || {};
  const ok = ['r1Ms', 'gatherMs', 'llmMs'].every((k) => Number.isFinite(ph[k]) && ph[k] >= 0);
  check('engine.phases đo r1/gather/llm (ms)', ok, JSON.stringify(ph));
  check('engine.ms ≥ tổng các pha', Number.isFinite(r.engine.ms) && r.engine.ms >= ph.r1Ms + ph.gatherMs + ph.llmMs - 5, JSON.stringify([r.engine.ms, ph]));
}

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
// 09/10/2026: mã HS nhà cung cấp tự khai trên trang sản phẩm (made-in-china) = MỘT nguồn kiểm chứng, không phải đáp án.
{
  const { normalizeSupplierHs } = require('../lib/engine-loop.js');
  const R2_OK = { decision: 'CHOT', hs: '82019000', confidence: 85, reason: 'dụng cụ cầm tay nông nghiệp', gir: 'GIR 1', basis: [{ stream: 'SAN_PHAM', claim: 'hái cau', evidence: '用于摘取槟榔' }], conditions: [], alternatives: [], questions: [] };
  const SUP_URL = 'https://abc.en.made-in-china.com/product/x/Knife.html';

  // 7a. Chuẩn hoá: 6 số / 10 số / chữ rác / nhóm không có trong biểu thuế
  check('supplierHs 10 số → hs6 + nhóm', normalizeSupplierHs({ code: '8467290000' })?.hs6 === '846729' && normalizeSupplierHs({ code: '8467290000' }).heading4 === '8467');
  check('supplierHs 6 số (chuỗi) → nhận', normalizeSupplierHs('846729')?.hs6 === '846729');
  check('supplierHs chữ rác / <6 số / nhóm không tồn tại → bỏ', normalizeSupplierHs('abc') === null && normalizeSupplierHs({ code: '84-67' }) === null && normalizeSupplierHs({ code: '00009999' }) === null);

  // 7b. Cùng 6 số → không cổng, tăng tin cậy, ghi basis NHA_SAN_XUAT, agree SAME6
  r = await run({ ...KNIFE, supplierHs: { code: '82019000', source: 'made-in-china', url: SUP_URL } }, [R1_KNIFE, R2_OK]);
  check('NCC cùng 6 số → không chặn, 2 lượt AI, agree SAME6, basis NHA_SAN_XUAT, tin cậy +5', calls.length === 2 && r.status === 'REVIEW' && r.dossier.supplier?.agree === 'SAME6' && r.results[0].basis.some((b) => b.stream === 'NHA_SAN_XUAT' && b.ref === SUP_URL) && r.results[0].confidence === 90 && r.review.needed === false, JSON.stringify([calls.length, r.status, r.dossier.supplier, r.results[0]?.confidence]));
  check('vòng 2 thấy "NHÀ CUNG CẤP KHAI HS" kèm dòng biểu thuế VN 820190', /NHÀ CUNG CẤP KHAI HS[^\n]*820190 \(nhóm 8201\)/.test(calls[1].user) && /82019000 [^\n]*/.test(calls[1].user.split('NHÀ CUNG CẤP KHAI HS')[1]));
  check('precedentCodes không trộn mã TQ', !r.candidates.precedentCodes.some((p) => p.hs === '82019000' && p.ozCount == null));

  // 7c. Cùng nhóm, khác 6 số → không chặn, chỉ cảnh báo nhẹ, agree SAME4
  r = await run({ ...KNIFE, supplierHs: { code: '82013000', source: 'made-in-china' } }, [R1_KNIFE, R2_OK]);
  check('NCC cùng nhóm khác 6 số → không chặn, warning nhẹ, agree SAME4, không review', calls.length === 2 && r.dossier.supplier?.agree === 'SAME4' && r.antiPatternWarnings.some((w) => /820130/.test(w.description)) && r.review.needed === false, JSON.stringify([calls.length, r.dossier.supplier, r.antiPatternWarnings]));

  // 7d. Khác nhóm → cổng NCC_KHAI_KHAC_NHOM vòng 2 → vòng 3 AI giải trình → qua, nhưng review.needed
  r = await run({ ...KNIFE, supplierHs: { code: '84672900', source: 'made-in-china', url: SUP_URL } }, [R1_KNIFE, R2_OK,
    (user) => (/NCC_KHAI_KHAC_NHOM/.test(user) && /8467/.test(user) ? { ...R2_OK, reason: 'Nhà cung cấp khai 8467 (dụng cụ có động cơ) nhưng hồ sơ không có động cơ — giữ 8201', alternatives: [{ hs: '84672900', whyNot: 'không có động cơ' }] } : R2_OK),
  ]);
  check('NCC khác nhóm → chặn vòng 2 → vòng 3 giải trình → qua', calls.length === 3 && r.engine.gates[0].blocks.includes('NCC_KHAI_KHAC_NHOM') && r.results[0]?.hs === '82019000' && r.status === 'REVIEW', JSON.stringify([calls.length, r.engine.gates, r.status]));
  check('lý do chặn nêu mã NCC + nhóm đã chọn', /846729[^\n]*8467[^\n]*8201/.test(calls[2].user));
  check('nhóm NCC được gom vào headings (chú giải 8467 trong gói kiểm chứng)', r.candidates.headings.includes('8467') && /NHÓM 8467/.test(calls[1].user));
  check('vẫn khác nhóm sau giải trình → review.needed "NCC khai … / hệ thống chọn …", agree DIFF', r.review.needed && r.review.reasons.some((x) => /NCC khai HS 846729[^\n]*hệ thống chọn 82019000/.test(x)) && r.dossier.supplier?.agree === 'DIFF', JSON.stringify(r.review));

  // 7e. AI không giải trình tới trần → không chặn mãi (chỉ 1 lần), vẫn REVIEW + cờ
  r = await run({ ...KNIFE, supplierHs: { code: '84672900' } }, [R1_KNIFE, R2_OK, R2_OK, R2_OK]);
  check('không giải trình → chặn 1 lần rồi cảnh báo, review.needed', calls.length === 3 && r.status === 'REVIEW' && r.review.needed && r.antiPatternWarnings.some((w) => /Nhà cung cấp khai 846729/.test(w.description)), JSON.stringify([calls.length, r.status, r.review, r.antiPatternWarnings]));

  // 7f. supplierHs rác → bỏ hẳn, không cổng, dossier.supplier null
  r = await run({ ...KNIFE, supplierHs: { code: 'N/A' } }, [R1_KNIFE, R2_OK]);
  check('supplierHs rác → bỏ, không ảnh hưởng', calls.length === 2 && r.dossier.supplier === null && !/NHÀ CUNG CẤP KHAI HS/.test(calls[1].user));
}

// 10/10/2026: trang made-in-china lạc Chương/Phần (câu tìm ra món khác) → bỏ; toàn lạc → mic null, cổng G6 không bật.
{
  const micMod = require('../lib/mic-lookup.js');
  const savedMic = micMod.micLookup;
  const { gather } = require('../lib/engine-loop.js');
  const PG = (shop, hsCode, name) => ({ shop, url: `https://${shop}.en.made-in-china.com/product/x/y.html`, name, hsCode, props: {} });
  // 8a. Ổ cắm 8536 nhưng 2 shop cùng ghi 9507 (cần câu) + 1 shop 8716 → toàn lạc → gathered.mic null
  micMod.micLookup = async (q) => ({ query: q, searched: true, pages: [PG('rodshop', '9507100000', 'Fishing Rod'), PG('rodshop2', '9507100000', 'Carbon Rod'), PG('trailer', '8716900000', 'Trailer Axle')], consensus: null });
  let gth = await gather(R1_SOCKET, { tenHang: '86型墙壁暗装电源插座', nameZh: '86型墙壁暗装电源插座' }, { micAllowed: true });
  check('toàn trang lạc chương → gathered.mic = null, gói kiểm chứng không có bảng made-in-china', gth.mic === null && !/MADE-IN-CHINA/.test(gth.pack), JSON.stringify(gth.mic));
  // 8b. Cùng dữ liệu qua classify: trước đây 2 shop 9507 ≠ 8536 (hàng máy) → cổng NHA_SAN_XUAT_KHAC_NHOM; nay không chặn, 2 lượt AI
  r = await run({ tenHang: '86型墙壁暗装电源插座带开关五孔面板家用', nameZh: '86型墙壁暗装电源插座带开关五孔面板家用', specs: '额定电流: 10A; 额定电压: 250V' }, [R1_SOCKET, { decision: 'CHOT', hs: '85366992', confidence: 80, reason: 'ổ cắm', basis: [{ stream: 'SAN_PHAM', claim: 'ổ cắm 10A', evidence: '额定电流: 10A' }], conditions: [], alternatives: [], questions: [] }]);
  check('mic null → cổng NHA_SAN_XUAT_KHAC_NHOM không bật, dossier.mic null, 2 lượt AI', calls.length === 2 && !r.engine.gates.some((x) => (x.blocks || []).includes('NHA_SAN_XUAT_KHAC_NHOM')) && r.dossier.mic === null, JSON.stringify([calls.length, r.engine.gates, r.dossier.mic]));
  // 8c. Trộn: 2 shop 8536 + 1 shop 9507 → giữ 2 trang cùng chương, droppedOffChapter 1, queryKind 'name' (không có model)
  micMod.micLookup = async (q) => ({ query: q, searched: true, pages: [PG('sock1', '8536699000', 'Wall Socket'), PG('rodshop', '9507100000', 'Fishing Rod'), PG('sock2', '8536690000', 'Socket 86')], consensus: null });
  gth = await gather(R1_SOCKET, { tenHang: '86型墙壁暗装电源插座', nameZh: '86型墙壁暗装电源插座' }, { micAllowed: true });
  check('trang lạc bị bỏ khỏi pages, giữ cùng chương, đồng thuận 8536, queryKind name', gth.mic?.pages.length === 2 && gth.mic.droppedOffChapter === 1 && gth.mic.consensus.heading4 === '8536' && gth.mic.queryKind === 'name' && !/Fishing Rod/.test(gth.pack), JSON.stringify(gth.mic));
  micMod.micLookup = savedMic;
}

// 8d. Backlog 09 bước 2: 3 truy vấn made-in-china bắn ĐỒNG THỜI (không xếp hàng chờ nhau) nhưng vẫn
// xử lý theo thứ tự ưu tiên model → model+tên Anh → tên Anh; đủ đồng thuận thì truy vấn sau bị bỏ.
{
  const micMod = require('../lib/mic-lookup.js');
  const savedMic = micMod.micLookup;
  const { gather } = require('../lib/engine-loop.js');
  const PG = (shop, hsCode, name) => ({ shop, url: `https://${shop}.en.made-in-china.com/product/x/y.html`, name, hsCode, props: {} });
  const R1_DRILL = { product: { nameVi: 'máy khoan đục bê tông', nameEn: 'rotary hammer drill', model: 'HD-2200X', purpose: 'khoan đục bê tông', mechanism: 'điện', material: 'kim loại', evidence: {} }, hypotheses: [{ chapter: '84', heading4: '8467', subheading6: '846721', why: 'máy khoan điện cầm tay', confidence: 88 }], verify: { codes8: ['8467210000'], micQuery: 'rotary hammer drill', unknowns: [] } };
  const gọi = []; const nhả = new Map();
  micMod.micLookup = (q) => { gọi.push(q); return new Promise((res) => nhả.set(q, res)); };
  const p = gather(R1_DRILL, { tenHang: '电锤 HD-2200X', nameZh: '电锤', specs: '功率: 800W' }, { micAllowed: true });
  await new Promise((r) => setImmediate(r));
  check('mic: 3 truy vấn bắn đồng thời trước khi lượt nào có kết quả, đúng thứ tự ưu tiên', gọi.length === 3 && gọi[0] === 'HD-2200X' && gọi[1] === 'rotary hammer drill HD-2200X' && gọi[2] === 'rotary hammer drill', JSON.stringify(gọi));
  nhả.get('HD-2200X')({ query: 'HD-2200X', searched: true, pages: [PG('d1', '8467210000', 'Rotary Hammer'), PG('x1', '8207500000', 'Masonry Chisel')] });
  nhả.get('rotary hammer drill HD-2200X')({ query: 'rotary hammer drill HD-2200X', searched: true, pages: [PG('d2', '8467210000', 'Electric Hammer'), PG('d3', '8467210000', 'Hammer Drill 800W')] });
  nhả.get('rotary hammer drill')({ query: 'rotary hammer drill', searched: true, pages: [PG('zz', '9503000000', 'Toy Drill')] });
  const g = await p;
  check('mic: đồng thuận 8467 gộp từ 2 truy vấn đầu (3 shop), queryKind model', g.mic?.consensus?.heading4 === '8467' && g.mic.queryKind === 'model' && g.mic.pages.some((x) => x.shop === 'd3'), JSON.stringify(g.mic?.consensus));
  check('mic: đủ đồng thuận rồi thì truy vấn sau không lọt vào gói (không có trang zz)', !g.pack.includes('Toy Drill'), JSON.stringify(g.mic?.pages.map((x) => x.shop)));
  // Truy vấn model tự nó đủ đồng thuận → dừng ngay, không đợi 2 truy vấn chậm (kể cả khi chúng còn treo).
  const gọi2 = []; const treo2 = new Map();
  micMod.micLookup = (q) => { gọi2.push(q); return new Promise((res) => treo2.set(q, res)); };
  const p2 = gather(R1_DRILL, { tenHang: '电锤 HD-2200X', nameZh: '电锤', specs: '功率: 800W' }, { micAllowed: true });
  await new Promise((r) => setImmediate(r));
  treo2.get('HD-2200X')({ query: 'HD-2200X', searched: true, pages: [PG('d1', '8467210000', 'Rotary Hammer'), PG('d2', '8467210000', 'Electric Hammer')] });
  const g2 = await p2;
  check('mic: model đã đồng thuận → không đợi 2 truy vấn sau (vẫn trả được khi chúng còn treo)', g2.mic?.consensus?.heading4 === '8467' && gọi2.length === 3, JSON.stringify(g2.mic?.consensus));
  micMod.micLookup = savedMic;
}

// 8e. R1_MAX_TOKENS (backlog 09 bước 4): hạ trần token vòng 1 qua env, vòng 2 không đổi.
{
  const saved = llmTier.callLLMJson;
  let cap1 = null; let cap2 = null;
  llmTier.callLLMJson = async (system, user, opts = {}) => { if (system.startsWith('VÒNG 1')) cap1 = opts.maxTokens; else cap2 = opts.maxTokens; return saved(system, user, opts); };
  const CHOT = { decision: 'CHOT', hs: '82019000', confidence: 88, reason: 'dụng cụ cầm tay nông nghiệp, cơ-tay', gir: 'GIR 1', basis: [{ stream: 'SAN_PHAM', claim: 'dùng hái cau', evidence: '用于摘取槟榔' }, { stream: 'CHU_GIAI', claim: 'nhóm 8201 gồm dụng cụ cầm tay nông nghiệp', ref: '8201' }], conditions: [], alternatives: [], questions: [] };
  await run(KNIFE, [R1_KNIFE, CHOT]);
  check('R1_MAX_TOKENS: mặc định 12000', cap1 === 12000, String(cap1));
  process.env.R1_MAX_TOKENS = '6000';
  await run(KNIFE, [R1_KNIFE, CHOT]);
  delete process.env.R1_MAX_TOKENS;
  llmTier.callLLMJson = saved;
  check('R1_MAX_TOKENS=6000 hạ trần vòng 1, vòng 2 giữ nguyên', cap1 === 6000 && cap2 === 20000, JSON.stringify([cap1, cap2]));
}

// ── Sổ tay (chế độ CỐ VẤN, #196/bước 3): đính vào phản hồi, KHÔNG đổi mã/trạng thái/cờ/lượt gọi AI ──
{
  const SOCKET = { tenHang: '86型墙壁暗装电源插座带开关五孔面板家用', nameZh: '86型墙壁暗装电源插座带开关五孔面板家用', specs: '额定电流: 10A; 额定电压: 250V' };
  const steps = () => [R1_SOCKET, { decision: 'CHOT', hs: '85366932', confidence: 80, reason: 'ổ cắm', basis: [{ stream: 'SAN_PHAM', claim: 'ổ cắm 10A', evidence: '额定电流: 10A' }], conditions: [], alternatives: [], questions: [] }];
  const strip = (o) => JSON.stringify({ status: o.status, results: o.results, review: o.review, nextAction: o.nextAction, missing: o.missing, candidates: o.candidates, resolver: o.resolver });
  const on = await run(SOCKET, steps()); const callsOn = calls.length;
  process.env.HS_SOTAY_RUNTIME = 'false';
  const off = await run(SOCKET, steps()); const callsOff = calls.length;
  delete process.env.HS_SOTAY_RUNTIME;
  check('sổ tay bật: phản hồi có khối soTay (nhóm 8536, chế độ CỐ VẤN)', on.soTay?.trangThai === 'CO_SO_TAY' && on.soTay.nhom === '8536' && on.soTay.cheDo === 'CO_VAN', JSON.stringify(on.soTay)?.slice(0, 200));
  check('sổ tay tắt khẩn cấp: không có khối soTay', off.soTay === undefined);
  check('BẤT BIẾN: bật/tắt sổ tay → cùng mã, cùng trạng thái, cùng cờ, cùng ứng viên, cùng số lượt gọi AI', strip(on) === strip(off) && callsOn === callsOff, `${callsOn}/${callsOff}`);
  check('prompt vòng 2 không chứa dữ liệu sổ tay (chưa đổi prompt)', !/yKienWco|canGiaiTrinh|wco-op\./.test(calls.map((c) => c.user).join('\n')));
}



// ── Bước 12 (C-2): tín hiệu HS người bán MiC — LUẬT SẮT: hint sai KHÔNG kéo mã, hint chỉ là chú thích ──
{
  const micMod2 = require('../lib/mic-lookup.js');
  const saved2 = micMod2.micLookup;
  const PG2 = (shop, hsCode, name) => ({ shop, url: `https://${shop}.en.made-in-china.com/product/x/y.html`, name, hsCode, props: {} });
  const R1_MIC = { product: { nameVi: 'quạt thông gió gia dụng', nameEn: 'household exhaust fan', purpose: 'hút khí', mechanism: 'điện', material: 'nhựa', form: 'hoàn chỉnh', model: 'HY-30', evidence: {} }, hypotheses: [{ chapter: '84', heading4: '8414', subheading6: '841451', why: 'quạt có động cơ', confidence: 70 }], verify: { searchVi: ['quạt'], codes8: ['84145199'], micQuery: null, unknowns: [] } };
  const CHOT_8414 = { decision: 'CHOT', hs: '84145199', confidence: 80, reason: 'quạt thông gió có động cơ điện — nhóm 84.14', basis: [{ stream: 'SAN_PHAM', claim: 'quạt hút', evidence: '换气扇' }], conditions: [], alternatives: [], questions: [] };
  // 3 shop đồng thuận khai 8479.89.98 (SAI — thực tế là máy công nghiệp khác) trong khi AI đúng 8414
  micMod2.micLookup = async (q) => ({ query: q, searched: true, pages: [PG2('s1', '8479899800', 'Exhaust Fan'), PG2('s2', '8479899800', 'Fan 30W'), PG2('s3', '8479899800', 'Vent Fan')], consensus: null });
  // Vòng 2 bị cổng made-in-china CHẶN hỏi lại (đúng thiết kế — hint buộc AI đối chiếu, không tự đổi mã);
  // vòng 3 AI giải trình xong và vẫn chốt 84.14 → hint sai KHÔNG kéo mã.
  const CHOT_8414_DA_GIAI_TRINH = { ...CHOT_8414, reason: 'quạt thông gió gia dụng có động cơ điện — nhóm 84.14; đã đối chiếu NCC/made-in-china ghi 8479: đó là nhóm máy công nghiệp khác, không phải quạt gia dụng' };
  let rMic = await run({ tenHang: '家用排气扇 厨房换气扇', nameZh: '家用排气扇 厨房换气扇', specs: '功率: 30W; 材质: 塑料', model: 'HY-30' }, [R1_MIC, CHOT_8414, CHOT_8414_DA_GIAI_TRINH]);
  check('C-2: hint MiC sai (3 shop 8479) KHÔNG kéo mã — cổng chỉ bắt AI giải trình, AI giữ 84.14', rMic.results[0]?.hs === '84145199', JSON.stringify(rMic.results?.[0]?.hs));
  check('C-2: tín hiệu vẫn hiện trong phản hồi kèm ghi chú ranh giới', Boolean(rMic.dossier?.mic?.signal?.ghiChu) && /TÍN HIỆU/i.test(rMic.dossier.mic.signal.ghiChu), JSON.stringify(rMic.dossier?.mic ?? null).slice(0, 220));
  const { micSignal: micSignalFn, GHI_CHU } = require('../lib/mic-signal.js');
  const sig = micSignalFn('8479899800');
  check('C-2: ánh xạ 10 số TQ → PN6 847989 + dòng VN ứng viên', sig?.hs6 === '847989' && Array.isArray(sig.dong8UngVien) && sig.dong8UngVien.length > 0 && sig.loai === 'SIGNAL', JSON.stringify(sig).slice(0, 120));
  check('C-2: mã rác → null; module không xuất hàm chốt mã', micSignalFn('abc') === null && Object.keys(require('../lib/mic-signal.js')).every((k) => !/chot|override|final/i.test(k)));
  micMod2.micLookup = saved2;
}

// ── Nhãn hồ sơ gốc (prod 25/10/2026): kẹp giấy 83059010 tự tin 97 bị cổng CAU_TRICH_KHONG_CO chặn vì AI chép cả nhãn của
// prompt ("Tiêu đề gốc: … | chatLieu: … | congDung: …") trong khi nguồn căn cứ chỉ có giá trị; vòng 3 hết ngân sách giờ
// → NEEDS_EXPERT / GATE_BLOCKED sau 213 s, kèm câu hỏi rác "Cần xác nhận: Vật liệu của hàng là thép mạ niken…". ──
{
  const { gates, round1Input } = require('../lib/engine-loop.js');
  const { groundingSourceOf, verifyQuote, DOSSIER_LABELS } = require('../lib/classify.js');
  const CLIP = { tenHang: 'Kẹp giấy văn phòng bằng thép mạ niken, dài 28 mm, hộp 100 chiếc', chatLieu: 'thép mạ niken', congDung: 'kẹp giữ giấy tờ văn phòng' };
  const LIVE = 'Tiêu đề gốc: Kẹp giấy văn phòng bằng thép mạ niken, dài 28 mm, hộp 100 chiếc | chatLieu: thép mạ niken | congDung: kẹp giữ giấy tờ văn phòng';
  const R2_CLIP = { decision: 'CHOT', hs: '83059010', confidence: 97, reason: 'kẹp giấy bằng kim loại cơ bản — nhóm 83.05, dòng 8305.90.10', gir: 'GIR 1',
    basis: [{ stream: 'SAN_PHAM', claim: 'kẹp giấy văn phòng bằng thép mạ niken', evidence: LIVE }, { stream: 'CHU_GIAI', claim: 'nhóm 83.05 gồm kẹp giấy', ref: '8305' }],
    conditions: [{ fact: 'Vật liệu của hàng là thép mạ niken (kim loại cơ bản)', status: 'MET', evidence: 'chatLieu: thép mạ niken' }, { fact: 'Hàng dùng để kẹp giữ giấy tờ văn phòng', status: 'MET', evidence: 'congDung: kẹp giữ giấy tờ văn phòng' }],
    alternatives: [], questions: [] };
  // ctx dựng như classifyLoop (không có ảnh → nguồn căn cứ = groundingSourceOf).
  const ctx = { source: groundingSourceOf(CLIP), productText: [CLIP.tenHang, CLIP.chatLieu, CLIP.congDung, 'kẹp giấy văn phòng'].join('\n'), gathered: { headings: ['8305'], mic: null, supplier: null }, machinery: false, round: 2, productName: 'kẹp giấy văn phòng', form: 'hoàn chỉnh', pool: [] };
  const gl = gates(R2_CLIP, ctx);
  check('nhãn hồ sơ: gates() ca prod — không còn CAU_TRICH_KHONG_CO, câu trích SAN_PHAM verified', !gl.blocks.some((b) => b.gate === 'CAU_TRICH_KHONG_CO') && gl.basis[0].verified === true, JSON.stringify([gl.blocks, gl.basis]));
  check('nhãn hồ sơ: điều kiện có câu trích kèm nhãn ("congDung: …") giữ MET, không bị hạ CHƯA RÕ', gl.conditions.length === 2 && gl.conditions.every((c) => c.status === 'MET' && !c.unverified && c.evidence) && !gl.warnings.some((w) => /câu trích không có/i.test(w)), JSON.stringify([gl.conditions, gl.warnings]));
  // Phủ định: nhãn đúng, giá trị bịa → cổng vẫn chặn, điều kiện vẫn bị hạ.
  const gb = gates({ ...R2_CLIP, basis: [{ stream: 'SAN_PHAM', claim: 'bằng nhôm', evidence: 'chatLieu: nhôm' }], conditions: [{ fact: 'Vật liệu là nhôm', status: 'MET', evidence: 'chatLieu: nhôm' }] }, ctx);
  check('nhãn hồ sơ: "chatLieu: nhôm" (gốc ghi thép) → vẫn CAU_TRICH_KHONG_CO + điều kiện hạ CHƯA RÕ', gb.blocks.some((b) => b.gate === 'CAU_TRICH_KHONG_CO') && gb.conditions[0].status === 'UNKNOWN' && gb.conditions[0].unverified === true, JSON.stringify([gb.blocks, gb.conditions]));

  // Cả luồng (AI giả lặp lại đúng câu trả lời prod ở mọi vòng): 2 lượt AI, chốt, không câu hỏi rác.
  const R1_CLIP = { product: { nameVi: 'kẹp giấy văn phòng', nameEn: 'nickel plated steel paper clip', nameZh: '', purpose: 'kẹp giữ giấy tờ văn phòng', mechanism: 'không áp dụng', material: 'thép mạ niken', dimensions: 'dài 28 mm', form: 'hoàn chỉnh', evidence: { purpose: 'kẹp giữ giấy tờ văn phòng', material: 'thép mạ niken' } }, hypotheses: [{ chapter: '83', heading4: '8305', subheading6: '830590', why: 'kẹp giấy bằng kim loại cơ bản', confidence: 95 }], verify: { searchVi: ['kẹp giấy văn phòng'], notesChapters: ['83'], codes8: ['83059010'], micQuery: null, unknowns: [] } };
  const rc = await run(CLIP, [R1_CLIP, R2_CLIP, R2_CLIP, R2_CLIP]);
  check('nhãn hồ sơ: cả luồng ca prod → 83059010 sau 2 lượt AI, không NEEDS_EXPERT/GATE_BLOCKED', calls.length === 2 && rc.results[0]?.hs === '83059010' && rc.status !== 'NEEDS_EXPERT' && rc.nextAction?.reasonCode !== 'GATE_BLOCKED' && !(rc.engine.gates[0].blocks || []).length, JSON.stringify([calls.length, rc.status, rc.nextAction?.reasonCode, rc.engine.gates]));
  check('nhãn hồ sơ: không còn "Cần xác nhận: Vật liệu… / Hàng dùng…" cho điều kiện đã có câu trích', !rc.missing.some((m) => /Cần xác nhận: (Vật liệu|Hàng dùng)/.test(m)), JSON.stringify(rc.missing));

  // Chống lệch: prompt in nhãn từ CHÍNH bảng verifyQuote dùng, và MỌI dòng có nội dung của khối "HỒ SƠ GỐC" chép nguyên văn
  // (kèm nhãn) đều kiểm được với nguồn căn cứ classifyLoop dựng. Thêm dòng/nhãn mới vào round1Input mà quên bảng hoặc quên
  // nguồn căn cứ → đỏ ở đây.
  const RICH = { nameZh: '回形针 镀镍 28mm 100枚/盒', tenHang: 'Kẹp giấy văn phòng bằng thép mạ niken', specs: 'Chiều dài: 28 mm\nSố lượng: 100 chiếc/hộp', chatLieu: 'thép mạ niken', congDung: 'kẹp giữ giấy tờ văn phòng', chucNang: 'kẹp giấy', customerDescription: 'kẹp giấy loại tròn', model: 'KG-28', brand: 'Deli', facts: [{ key: 'material', labelVi: 'Chất liệu', valueVi: 'thép mạ niken', evidence: '材质：镀镍钢' }], imageTexts: ['材质 镀镍钢\n规格 28mm', { url: 'x', text: '100枚/盒' }] };
  const prompt = round1Input(RICH);
  const srcRich = [groundingSourceOf(RICH), RICH.imageTexts.map((t) => (typeof t === 'string' ? t : t.text)).join('\n')].join('\n');
  const lines = prompt.split('\n').map((l) => l.trim()).filter(Boolean);
  const content = lines.filter((l) => !l.endsWith(':'));
  const headers = lines.filter((l) => l.endsWith(':'));
  check('nhãn hồ sơ: round1Input in nhãn từ bảng dùng chung DOSSIER_LABELS', [DOSSIER_LABELS.tieuDe, DOSSIER_LABELS.tenKhac, DOSSIER_LABELS.thongSo, DOSSIER_LABELS.duKien, DOSSIER_LABELS.chuAnh, ...DOSSIER_LABELS.truong].every((l) => prompt.includes(`${l}:`)) && prompt.includes(`[${DOSSIER_LABELS.goc}: `) && prompt.includes(`[${DOSSIER_LABELS.anh} 1] `), prompt);
  const lech = content.filter((l) => verifyQuote(l, srcRich) !== 'ok');
  check('nhãn hồ sơ: mọi dòng có nội dung của HỒ SƠ GỐC chép nguyên văn kèm nhãn → kiểm được', content.length === 12 && !lech.length, JSON.stringify([content.length, lech]));
  check('nhãn hồ sơ: dòng tiêu đề mục (chỉ có nhãn) không phải câu trích', headers.length === 3 && headers.every((l) => verifyQuote(l, srcRich) === 'bad'), JSON.stringify(headers));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);

// ── GĐ1 (#377): tầng ứng viên embedding — tín hiệu vào gói vòng 2, không đổi mã ──
{
  const savedPool = require('../lib/embed-pool.js').poolNhom;
  const embedPoolMod = require('../lib/embed-pool.js');
  const POOL_STUB = { nhom4: [{ ma: '8414', diem: 0.93 }, { ma: '8509', diem: 0.81 }, { ma: '8415', diem: 0.79 }], nhom6: [{ ma: '841451', diem: 0.91 }], model: 'stub' };
  embedPoolMod.poolNhom = async () => ({ ...POOL_STUB });
  process.env.HS_EMBED_POOL = 'on';

  const R1_QUAT = { product: { nameVi: 'quạt thông gió gia dụng', purpose: 'hút khí', mechanism: 'điện', material: 'nhựa', form: 'hoàn chỉnh', evidence: {} }, hypotheses: [{ chapter: '85', heading4: '8509', subheading6: '850980', why: 'thiết bị điện gia dụng', confidence: 70 }], verify: { searchVi: ['quạt thông gió'], codes8: ['85098090'], micQuery: null, unknowns: [] } };
  const CHOT = { decision: 'CHOT', hs: '85098090', confidence: 75, reason: 'thiết bị điện gia dụng', basis: [{ stream: 'SAN_PHAM', claim: 'quạt', evidence: '换气扇' }], conditions: [], alternatives: [], questions: [] };
  let rPool = await run({ tenHang: '家用排气扇 厨房卫生间换气扇 静音', nameZh: '家用排气扇 厨房卫生间换气扇 静音', specs: '功率: 30W; 用途: 厨房排气' }, [R1_QUAT, CHOT]);

  check('GĐ1: gói vòng 2 có khối ỨNG VIÊN NHÓM + điểm số', calls.some((c) => /ỨNG VIÊN NHÓM/.test(c.user) && /8414\(0.93\)/.test(c.user)), '');
  check('GĐ1: nhóm pool top-3 (8414) được nạp CHÚ GIẢI (nhóm ngoài giả thuyết 8509)', calls.some((c) => /8414/.test(c.user) && /CHÚ GIẢI/.test(c.user) && c.user.indexOf('8414') < c.user.indexOf('CHÚ GIẢI') === false || /8414/.test(c.user.split('CHÚ GIẢI')[1] || '')), '');
  check('GĐ1: response có dossier.embedPool + phases.embedMs', rPool.dossier?.embedPool?.nhom4?.length === 3 && typeof rPool.engine?.phases?.embedMs === 'number', JSON.stringify(rPool.dossier?.embedPool));
  check('GĐ1: mã chọn không đổi (tín hiệu không phải quyết định)', rPool.results?.[0]?.hs === '85098090', JSON.stringify(rPool.results?.[0]?.hs));

  // Lỗi pool → engine vẫn chạy như cũ, không có khối tín hiệu
  embedPoolMod.poolNhom = async () => { throw new Error('model lỗi'); };
  let rErr = await run({ tenHang: '家用排气扇 厨房卫生间换气扇 静音', nameZh: '家用排气扇 厨房卫生间换气扇 静音', specs: '功率: 30W; 用途: 厨房排气' }, [R1_QUAT, CHOT]);
  check('GĐ1: pool lỗi → không crash, không khối tín hiệu, mã giữ nguyên', rErr.results?.[0]?.hs === '85098090' && !calls.some((c) => /ỨNG VIÊN NHÓM/.test(c.user)), JSON.stringify(rErr.results?.[0]?.hs));

  delete process.env.HS_EMBED_POOL;
  embedPoolMod.poolNhom = savedPool;
  let rOff = await run({ tenHang: '家用排气扇 厨房卫生间换气扇 静音', nameZh: '家用排气扇 厨房卫生间换气扇 静音', specs: '功率: 30W; 用途: 厨房排气' }, [R1_QUAT, CHOT]);
  check('GĐ1: cờ TẮT → không khối tín hiệu (hành vi cũ nguyên vẹn)', !calls.some((c) => /ỨNG VIÊN NHÓM/.test(c.user)), '');
}
