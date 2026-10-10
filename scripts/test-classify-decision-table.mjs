// Test /api/classify đọc bảng quyết định NHÓM 4 số đã verified (B3.6, 06/10/2026): ổ cắm gia dụng
// AI xếp 8536.69.32 (dòng cho cáp đồng trục/mạch in) → bảng 8536 chỉnh về 8536.69.92 trong cùng phân
// nhóm 6 số. Không được nhảy sang phân nhóm khác. LLM giả lập — không mạng.
import './test-isolate-data.mjs';
process.env.HS_CLASSIFY_CROSSCHECK = '0'; // kiểm bước chọn mã chính; cửa đối chiếu: test-classify-crosscheck.mjs
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.HS_ACCESS_LOG = '0';

let girReply = null;
let understood = { tenHangVi: 'ổ cắm điện âm tường', banChat: 'ổ cắm điện gia dụng lắp âm tường, 10A' };
let headingsReply = ['8536'];
const llmTier = require('../lib/llm-tier');
llmTier.callLLMJson = async (system) => {
  if (system.includes('DỮ KIỆN HÀNG HÓA')) return { json: understood, provider: 'stub', model: 'stub' };
  if (system.includes('mã HS 4 số')) return { json: { headings: headingsReply }, provider: 'stub', model: 'stub' };
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

// Cùng NHÓM 4 số, khác phân nhóm: AI xếp ổ cắm có công tắc vào công tắc 8536.50 / đui đèn 8536.61 /
// chỉ 6 số → bảng (GIR 3b: đặc trưng là ổ cắm) chỉnh về 8536.69.92
for (const wrong of ['85365059', '85366111', '853669']) {
  girReply = { results: [{ hs: wrong, confidence: 85, reason: 'x' }], missing: [] };
  const r = await classify({ ...SOCKET }, {});
  check(`AI ra ${wrong} (cùng nhóm 8536) → 85366992`, r.results?.[0]?.hs === '85366992', JSON.stringify(r.results?.map((x) => x.hs)));
}
// KHÔNG đổi nhóm: dây nguồn có phích (8544) — bảng 8536 không được kéo sang 8536
girReply = { results: [{ hs: '85444299', confidence: 80, reason: 'dây điện có đầu nối' }], missing: [] };
const r2 = await classify({ tenHang: 'dây nguồn có phích cắm 1.5m', nameZh: '电源线 带插头 1.5米', specs: '' }, {});
check('mã AI ở nhóm khác (8544) → không bị bảng 8536 kéo đi', r2.results?.[0]?.hs === '85444299', JSON.stringify(r2.results?.map((r) => r.hs)));

// Tắt được theo opts
girReply = { results: [{ hs: '85366932', confidence: 85, reason: 'x' }], missing: [] };
const r3 = await classify(SOCKET, { decisionTables: false });
check('opts.decisionTables=false → giữ mã AI', r3.results?.[0]?.hs === '85366932');

// ── Bảng CHƯA duyệt (8708, CEO 10/10/2026): chỉ TƯ VẤN, không ghi đè ─────────────────────────────
// Ca thật Tmall: tấm ốp bảo vệ gầm / pin thép mangan Leapmotor A10 — động cơ chốt 8708.29.95 (thân xe) với bằng chứng
// yếu; bảng 8708 chỉ về 8708.99.62 (bộ phận khung gầm, xe 87.03) → cảnh báo + review, mã AI giữ nguyên.
const GUARD = { tenHang: 'Tấm ốp bảo vệ gầm xe, bảo vệ pin bằng thép mangan cho Leapmotor A10/A05', nameZh: '26款零跑A10纯电版底盘护板电池护板原车孔位专用零跑A05车底护板', specs: '材质: 锰钢; 商品品类: 车底防护板' };
understood = { tenHangVi: 'tấm bảo vệ gầm xe bảo vệ pin', banChat: 'tấm thép mangan ốp dưới gầm xe điện, bắt theo lỗ vít nguyên bản' };
headingsReply = ['8708'];
girReply = { results: [{ hs: '87082995', confidence: 80, reason: 'bộ phận thân xe loại khác' }], missing: [] };
const g1 = await classify(GUARD, {});
check('底盘护板 87.03: AI ra 8708.29.95 → bảng 8708 CHƯA duyệt KHÔNG ghi đè (mã đầu giữ 87082995)', g1.results?.[0]?.hs === '87082995' && !g1.results[0].resolverOverride, JSON.stringify(g1.results?.map((r) => r.hs)));
check('… nhưng có decisionAdvisory → 87089962, tableVerified=false, agrees=false', g1.decisionAdvisory?.hs === '87089962' && g1.decisionAdvisory.tableVerified === false && g1.decisionAdvisory.agrees === false, JSON.stringify(g1.decisionAdvisory));
check('… cảnh báo decision-table-advisory nêu rõ "chưa CEO duyệt — chỉ tư vấn"', (g1.antiPatternWarnings || []).some((w) => w.id === 'decision-table-advisory' && /chưa CEO duyệt/.test(w.description)), JSON.stringify(g1.antiPatternWarnings));
check('… mã bảng có mặt trong results để chuyên viên chọn (source decision-table-advisory)', g1.results.some((r, i) => i > 0 && r.hs === '87089962' && r.source === 'decision-table-advisory'));
check('… review.needed=true với lý do từ bảng (gói đối chiếu vòng 2, kể cả khi cửa đối chiếu tắt)', g1.review?.needed === true && g1.review.reasons.some((x) => /Bảng quyết định nhóm 8708/.test(x)), JSON.stringify(g1.review));
check('… trạng thái KHÔNG phải RESOLVED_BY_TABLE (không đội lốt bảng đã duyệt)', g1.status !== 'RESOLVED_BY_TABLE' && g1.resolver?.status !== 'RESOLVED', g1.status);
check('… cặp mã dễ nhầm 8708.29.95 ↔ 8708.99.62 bật confusionWarning kèm tiêu chí phân biệt', g1.confusionWarning?.confusedWith?.includes('87089962') && g1.confusionWarning.discriminatorsVi?.length >= 3, JSON.stringify(g1.confusionWarning));

// 翼子板 (vè xe): AI ra 8708.99.62 (khung gầm) → bảng chỉ về 8708.29 (thân xe) → tư vấn ngược chiều, vẫn không đổi mã
const FENDER = { tenHang: 'Vè xe trước (tai xe) ô tô', nameZh: '汽车翼子板 前翼子板 适用于本田', specs: '材质: 钢' };
understood = { tenHangVi: 'vè xe trước ô tô', banChat: 'tấm thân vỏ ngoài bên hông bánh trước' };
girReply = { results: [{ hs: '87089962', confidence: 75, reason: 'bộ phận khung gầm' }], missing: [] };
const g2 = await classify(FENDER, {});
check('翼子板: AI ra 8708.99.62 → bảng tư vấn 8708.29.xx, mã AI giữ nguyên', g2.results?.[0]?.hs === '87089962' && g2.decisionAdvisory?.hs?.startsWith('870829') && g2.decisionAdvisory.agrees === false, JSON.stringify(g2.decisionAdvisory));
// AI đã chọn đúng mã bảng → agrees, không cảnh báo, không review vì bảng
girReply = { results: [{ hs: '87089962', confidence: 80, reason: 'bộ phận khung gầm' }], missing: [] };
understood = { tenHangVi: 'tấm bảo vệ gầm xe bảo vệ pin', banChat: 'tấm thép mangan ốp dưới gầm xe điện' };
const g3 = await classify(GUARD, {});
check('AI chọn đúng mã bảng → decisionAdvisory.agrees=true, không cảnh báo, không review vì bảng', g3.decisionAdvisory?.agrees === true && !(g3.antiPatternWarnings || []).some((w) => w.id === 'decision-table-advisory') && !(g3.review?.reasons || []).some((x) => /Bảng quyết định/.test(x)), JSON.stringify(g3.review));
girReply = { results: [{ hs: '87082995', confidence: 80, reason: 'x' }], missing: [] };
const g4 = await classify(GUARD, { decisionTables: false });
check('opts.decisionTables=false → không có decisionAdvisory', g4.decisionAdvisory == null && g4.results?.[0]?.hs === '87082995');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
