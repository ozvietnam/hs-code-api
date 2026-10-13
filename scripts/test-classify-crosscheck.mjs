// Ghép cửa chính (classify) với cửa đối chiếu (suggest-core) — docs/backlog/07-mot-engine.md.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { mergeSecondOpinion } = require('../lib/classify');
let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };
const sug = (...codes) => ({ suggestions: codes.map((c, i) => ({ hsCode: c, confidence: 80 - i * 10, reasoning: `lý do ${c}` })) });
const prim = (codes, extra = {}) => ({ status: 'REVIEW', results: codes.map((c, i) => ({ hs: c, hsLevel: c.length, confidence: 85 - i * 10, reason: `c ${c}` })), ...extra });

let r = mergeSecondOpinion(prim([]), sug('85098090', '85167990'));
check('bước chính rỗng → dùng cửa đối chiếu, không trả rỗng', r.results[0]?.hs === '85098090' && r.results[0].source === 'suggest');
check('… và bắt chuyên viên xem lại, độ tin ≤60', r.review.needed && r.status === 'REVIEW' && r.results[0].confidence <= 60);

r = mergeSecondOpinion(prim(['95049092', '95049021']), sug('95049021'));
check('cùng nhóm khác dòng → lấy dòng 8 số của cửa đối chiếu', r.results[0].hs === '95049021' && r.crossCheck.subheadingFrom === 'suggest');
check('… vẫn gắn cờ phân vân 2 mã, giữ mã kia', r.review.needed && r.results.some((x) => x.hs === '95049092') && /cùng nhóm 9504/.test(r.review.reasons[0]));

r = mergeSecondOpinion(prim(['87120090']), sug('87120090'));
check('hai cửa cùng mã 8 số → không cờ', r.review.needed === false && r.crossCheck.agree8);

r = mergeSecondOpinion(prim(['94032090']), sug('87168010'));
check('khác nhóm → giữ mã cửa chính, cờ "khác nhóm", có mã kia để chọn', r.results[0].hs === '94032090' && r.results.some((x) => x.hs === '87168010') && /khác nhóm/.test(r.review.reasons[0]));

r = mergeSecondOpinion(prim(['85366992'], { results: [{ hs: '85366992', hsLevel: 8, confidence: 90, resolverOverride: { from: '85366932' } }] }), sug('85366932'));
check('bảng quyết định đã chỉnh → KHÔNG bị cửa đối chiếu đổi lại', r.results[0].hs === '85366992' && r.review.needed);

r = mergeSecondOpinion(prim(['22021030', '22029950'], { antiPatternWarnings: [{ id: 'feature-polarity-conflict' }] }), sug('22029950'));
check('bộ kiểm mâu thuẫn có/không đã xếp → không đổi', r.results[0].hs === '22021030');

r = mergeSecondOpinion(prim(['847130'], { status: 'NEED_FACTS' }), sug('84713020'));
check('mã 6 số đang chờ hỏi dữ kiện → giữ câu hỏi, không đoán 8 số', r.results[0].hs === '847130' && r.status === 'NEED_FACTS');

r = mergeSecondOpinion(prim(['39264000']), null);
check('cửa đối chiếu lỗi → giữ nguyên kết quả chính', r.results[0].hs === '39264000' && r.crossCheck.available === false);
r = mergeSecondOpinion({ status: 'NEEDS_EXPERT', nextAction: { type: 'RETRY' }, results: [] }, { ...sug('94017100'), degraded: true });
check('bước chính lỗi tạm thời + cửa đối chiếu không qua AI → giữ THỬ LẠI', r.nextAction.type === 'RETRY' && r.results.length === 0);
r = mergeSecondOpinion({ status: 'NEEDS_EXPERT', nextAction: { type: 'RETRY' }, results: [] }, sug('94017100'));
check('bước chính lỗi tạm thời + cửa đối chiếu có AI → dùng kết quả đối chiếu', r.results[0].hs === '94017100' && r.review.needed);
// Ca thật 06/10/2026: móc khoá súng in 3D nhựa PLA — cửa đối chiếu chọn 9503.00.50 "trừ plastic"
r = mergeSecondOpinion(prim(['95030099']), { suggestions: [{ hsCode: '95030050', confidence: 60, reasoning: 'đồ chơi làm bằng nhựa plastic' }] }, '3D打印钥匙扣 材质: 塑料; Chất liệu: nhựa in 3D PLA+');
check('mã đối chiếu "trừ plastic" mà hàng bằng nhựa → KHÔNG lên đầu', r.results[0].hs === '95030099' && r.crossCheck.subheadingFrom === null);
check('… vẫn gắn cờ, nêu rõ mâu thuẫn', r.review.needed && /mâu thuẫn/.test(r.review.reasons[0]) && /trừ plastic/.test(r.review.reasons[0]));
// Ca thật 06/10/2026: tinh dầu khuếch tán — cửa đối chiếu độ tin 35 không được đổi mã
r = mergeSecondOpinion(prim(['85098090']), { suggestions: [{ hsCode: '85098010', confidence: 35, reasoning: 'máy đánh bóng sàn — không liên quan' }] });
check('cửa đối chiếu độ tin thấp (35) → KHÔNG đổi mã, vẫn cờ kèm độ tin', r.results[0].hs === '85098090' && r.review.needed && /35%/.test(r.review.reasons[0]));
// Bảng quyết định CHƯA duyệt (8708, CEO 10/10/2026) chỉ về mã khác → review dù hai cửa trùng mã; không đổi mã
const adv = { heading: '8708', hs: '87089962', agrees: false, tableVerified: false, noteVi: 'Bảng quyết định nhóm 8708 (chưa CEO duyệt — chỉ tư vấn, không đổi mã) chỉ về 87089962 — khác mã đã chọn 87082995; chuyên viên kiểm.' };
r = mergeSecondOpinion(prim(['87082995'], { decisionAdvisory: adv }), sug('87082995'));
check('hai cửa cùng mã nhưng bảng chưa duyệt tư vấn mã khác → vẫn review, mã đầu giữ nguyên', r.results[0].hs === '87082995' && r.review.needed && r.review.reasons.some((x) => /Bảng quyết định nhóm 8708/.test(x)) && r.crossCheck.agree8);
r = mergeSecondOpinion(prim(['87082995'], { decisionAdvisory: adv }), null);
check('cửa đối chiếu lỗi → tư vấn bảng vẫn vào review', r.crossCheck.available === false && r.review?.needed && /8708/.test(r.review.reasons[0]));
r = mergeSecondOpinion(prim(['87089962'], { decisionAdvisory: { ...adv, agrees: true } }), sug('87089962'));
check('bảng đồng ý mã → không review', r.review.needed === false);
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
