// Động cơ hai vòng + SỔ TAY (lib/engine-loop.js, HS_SO_TAY=gates|full) — AI giả, kiểm lượt giải trình (kết cục C).
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.HS_CLASSIFY_ENGINE = 'loop';
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
const llmTier = require('../lib/llm-tier');
let script = []; let calls = [];
llmTier.callLLMJson = async (system, user) => {
  calls.push({ round: system.startsWith('VÒNG 1') ? 1 : 2, user });
  const next = script.shift();
  if (next instanceof Error) throw next;
  return { json: typeof next === 'function' ? next(user) : next, provider: 'stub', model: 'stub' };
};
console.error = () => {}; console.warn = () => {};
const { classify } = require('../lib/classify');
let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };
const run = async (mode, attrs, steps) => {
  if (mode) process.env.HS_SO_TAY = mode; else delete process.env.HS_SO_TAY;
  script = steps; calls = [];
  return classify(attrs, {});
};

// Quạt thông gió gia dụng: AI chọn nhầm 85.09 — chú giải 85.09 loại trừ đích danh quạt thông gió sang 84.14.
const FAN = { tenHang: '家用排气扇 厨房卫生间换气扇 静音', nameZh: '家用排气扇 厨房卫生间换气扇 静音', specs: '功率: 30W; 用途: 厨房排气; 材质: 塑料' };
const R1_FAN = { product: { nameVi: 'quạt thông gió gia dụng', nameEn: 'household exhaust fan', nameZh: '家用排气扇', purpose: 'hút khí bếp, nhà vệ sinh', mechanism: 'điện', material: 'nhựa', form: 'hoàn chỉnh', evidence: {} }, hypotheses: [{ chapter: '85', heading4: '8509', subheading6: '850980', why: 'thiết bị điện gia dụng có động cơ', confidence: 70 }], verify: { searchVi: ['quạt thông gió'], codes8: ['85098090'], micQuery: null, unknowns: [] } };
const CHOT_8509 = { decision: 'CHOT', hs: '85098090', confidence: 75, reason: 'thiết bị điện gia dụng', basis: [{ stream: 'SAN_PHAM', claim: 'dùng hút khí bếp', evidence: '用途: 厨房排气' }], conditions: [], alternatives: [], questions: [] };

// 1. Tắt sổ tay (mặc định) → hành vi cũ: 2 lượt AI, không có khối soTay, không cờ.
let r = await run(null, FAN, [R1_FAN, CHOT_8509]);
// (Cờ tiền lệ Oz 84.14 vẫn bật như cũ — đó là cơ chế khác, không thuộc sổ tay.)
check('HS_SO_TAY tắt → không hỏi giải trình, không trả soTay', calls.length === 2 && r.results[0]?.hs === '85098090' && r.soTay === undefined && !r.review.reasons.some((x) => /Sổ tay/.test(x)), JSON.stringify([calls.length, r.results[0]?.hs, r.review]));
check('HS_SO_TAY tắt → gói vòng 2 vẫn là chú giải cũ', !/SỔ TAY nhóm/.test(calls[1].user));

// 2. gates: loại trừ đích danh → lượt giải trình kèm câu luật + chú giải nhóm 84.14 → AI đổi sang 8414 → CHANGED.
r = await run('gates', FAN, [R1_FAN, CHOT_8509,
  (user) => (/YÊU CẦU GIẢI TRÌNH/.test(user) ? { decision: 'CHOT', hs: '84145199', confidence: 85, reason: 'quạt thông gió — chú giải 85.09 loại trừ sang 84.14', basis: [{ stream: 'SAN_PHAM', claim: 'quạt hút', evidence: '换气扇' }], conditions: [], alternatives: [], questions: [] } : CHOT_8509),
]);
check('loại trừ đích danh → 1 lượt giải trình, đổi sang 84.14', calls.length === 3 && r.results[0]?.hs === '84145199' && r.soTay?.outcome === 'CHANGED', JSON.stringify([calls.length, r.results[0]?.hs, r.soTay?.outcome, r.engine.gates]));
check('lượt giải trình nhận câu hỏi + câu luật có nguồn', /SO_TAY_LOAI_TRU/.test(calls[2].user) && /\[nhom8509\.nhom\]/.test(calls[2].user) && /84\.14/.test(calls[2].user));
check('nhóm đích 84.14 được bổ sung chú giải + dòng biểu thuế trước lượt giải trình', /NHÓM 8414/.test(calls[2].user) && /84145199/.test(calls[2].user));
check('đổi mã theo sổ tay → không cờ chuyên viên', r.review.needed === false && r.soTay.challenges[0].gate === 'SO_TAY_LOAI_TRU', JSON.stringify(r.review));

// 3. gates: giữ mã + giải trình có câu trích THẬT trong hồ sơ gốc → EXPLAINED, lưu hồ sơ giải trình, không cờ.
r = await run('gates', FAN, [R1_FAN, CHOT_8509,
  { ...CHOT_8509, explanations: [{ gate: 'SO_TAY_LOAI_TRU', answer: 'giữ mã (thử cơ chế)', evidence: '用途: 厨房排气' }] },
]);
check('giữ mã + câu trích có thật → EXPLAINED, giaiTrinh verified', r.soTay?.outcome === 'EXPLAINED' && r.soTay.giaiTrinh[0]?.verified === true && r.soTay.giaiTrinh[0].legal[0].nguon === 'nhom8509.nhom' && !r.review.reasons.some((x) => /Sổ tay/.test(x)), JSON.stringify(r.soTay));

// 4. gates: giữ mã + câu trích BỊA → UNRESOLVED → cờ chuyên viên, không hỏi lần hai.
r = await run('gates', FAN, [R1_FAN, CHOT_8509,
  { ...CHOT_8509, explanations: [{ gate: 'SO_TAY_LOAI_TRU', answer: 'không phải quạt', evidence: '本产品不是风扇' }] },
  CHOT_8509,
]);
check('câu trích không có trong hồ sơ → UNRESOLVED, cờ "Sổ tay chú giải", đúng 3 lượt AI', r.soTay?.outcome === 'UNRESOLVED' && r.review.needed && r.review.reasons.some((x) => /Sổ tay chú giải/.test(x)) && calls.length === 3 && r.soTay.giaiTrinh[0].evidence === '', JSON.stringify([r.soTay?.outcome, r.review, calls.length]));

// 5. gates: giữ mã, không giải trình → UNRESOLVED (chuyên viên chọn), mã vẫn trả ra.
r = await run('gates', FAN, [R1_FAN, CHOT_8509, CHOT_8509]);
check('không giải trình → giữ mã, cờ chuyên viên', r.results[0]?.hs === '85098090' && r.soTay?.outcome === 'UNRESOLVED' && r.review.needed && r.status === 'REVIEW', JSON.stringify([r.status, r.soTay?.outcome]));

// 6. full: gói vòng 2 dùng sổ tay thay chú giải thô cho nhóm đã có sổ tay.
r = await run('full', FAN, [R1_FAN, CHOT_8509, CHOT_8509]);
const blk8509 = calls[1].user.split('■ NHÓM 8509')[1]?.split('■ NHÓM')[0] || '';
check('full → khối nhóm 8509 là sổ tay (có loại trừ + nguồn), không còn chú giải thô GỒM/KHÔNG GỒM', /SỔ TAY nhóm 8509/.test(blk8509) && /LOẠI TRỪ/.test(blk8509) && !/\n {2}GỒM:/.test(blk8509) && /85098090/.test(blk8509), blk8509.slice(0, 300));

// 7. gates: chọn dòng "Loại khác" khi tên hàng là tên dòng cụ thể → AI đổi dòng trong cùng nhóm → CHANGED.
const POLISH = { tenHang: '家用电动地板抛光机 打蜡机', nameZh: '家用电动地板抛光机 打蜡机', specs: '功率: 800W; 用途: 地板抛光' };
const R1_POLISH = { product: { nameVi: 'máy đánh bóng sàn nhà gia dụng', nameEn: 'household floor polisher', purpose: 'đánh bóng sàn', mechanism: 'điện', material: 'nhựa, kim loại', form: 'hoàn chỉnh' }, hypotheses: [{ chapter: '85', heading4: '8509', subheading6: '850980', why: 'thiết bị gia dụng có động cơ', confidence: 80 }], verify: { searchVi: ['máy đánh bóng sàn'], codes8: ['85098090', '85098010'], micQuery: null, unknowns: [] } };
r = await run('gates', POLISH, [R1_POLISH, { ...CHOT_8509, basis: [{ stream: 'SAN_PHAM', claim: 'đánh bóng sàn', evidence: '用途: 地板抛光' }] },
  (user) => (/SO_TAY_DONG8/.test(user) ? { ...CHOT_8509, hs: '85098010', basis: [{ stream: 'SAN_PHAM', claim: 'đánh bóng sàn', evidence: '用途: 地板抛光' }] } : CHOT_8509),
]);
check('"Loại khác" khi có dòng cụ thể → đổi sang 85098010, CHANGED', r.results[0]?.hs === '85098010' && r.soTay?.outcome === 'CHANGED', JSON.stringify([r.results[0]?.hs, r.soTay?.outcome, r.soTay?.challenges?.map((c) => c.gate)]));

delete process.env.HS_SO_TAY;
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
