// Test OZV-1617: nhóm 6 số 853650 (công tắc đóng cắt) chỉ DÒNG <16A chia mã 8 số —
// cổng NEED_FACTS không còn đòi Điện áp + Số cực (heading 8536 áp switchgear cả nhóm
// là quá rộng). Điện áp không chia mã nào trong 853650 (heading 8536 đã chốt ≤1000V),
// Số cực cũng không; giữ nguyên behaviour nhóm 8536 khác + override 8 số expert.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.HS_API_TOKEN = 'group-853650-test';
process.env.HS_ACCESS_LOG = '0';

const { declarationFields, missingStructured } = require('../lib/declaration-fields.js');
const { getDeclarationFieldSpec } = require('../lib/compliance-data.js');

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
  return cond;
};

// 1. Mã 6 số 853650 (đúng ca prod "công tắc hành trình"): chỉ còn Dòng định mức.
const m6 = missingStructured('853650', {});
check('853650 6 số: chỉ hỏi Dòng định mức', m6.length === 1 && m6[0].key === 'currentRating', JSON.stringify(m6.map((m) => m.key)));
check('853650 6 số: không hỏi Điện áp + Số cực', !m6.some((m) => ['voltage', 'poleCount'].includes(m.key)), JSON.stringify(m6.map((m) => m.key)));
check('853650 6 số: câu hỏi có nhãn VI + heading 8536', m6[0]?.questionVi?.includes('Dòng định mức') && m6[0]?.heading === '8536', JSON.stringify(m6[0]));

// 2. Khách khai đủ dòng → không còn câu hỏi nào (đích A2: ca không ra mã = 0 câu đứng chắn).
const m6du = missingStructured('853650', { tenHang: 'công tắc hành trình', specs: '额定电流：10A' });
check('853650 có dòng tiếng Trung (额定电流) → hết câu hỏi', m6du.length === 0, JSON.stringify(m6du.map((m) => m.key)));

// 3. Con 8 số trong 853650: override expert giữ nguyên (voltage addRequired ở mức 8 số
//    là dữ liệu khai báo, không phải cổng NEED_FACTS — mã 8 số không hỏi lại).
const spec96 = getDeclarationFieldSpec('85365096');
check('85365096: override 8 số expert còn nguyên (modelNumber, application, voltage, currentRating)',
  ['modelNumber', 'application', 'voltage', 'currentRating'].every((k) => spec96.required.some((f) => f.key === k)),
  JSON.stringify(spec96.required.map((f) => f.key)));

// 4. Nhóm 8536 khác không bị gọt (853620 aptomat, 853641 rơ le — điện áp ≤28V chia ở 85364191):
const m20 = missingStructured('853620', {});
check('853620: vẫn theo heading 8536 (có voltage + currentRating)', ['voltage', 'currentRating'].every((k) => m20.some((m) => m.key === k)), JSON.stringify(m20.map((m) => m.key)));
const m41 = missingStructured('853641', {});
check('853641: không đổi (voltage vẫn được hỏi)', m41.some((m) => m.key === 'voltage'), JSON.stringify(m41.map((m) => m.key)));

// 5. Heading 4 số 8536 (khai báo theo nhóm) không đổi.
const df = declarationFields('8536');
check('declarationFields 4 số 8536: khuôn switchgear giữ nguyên (voltage, currentRating, poleCount)',
  df?.source === 'heading' && ['voltage', 'currentRating', 'poleCount'].every((k) => df.fields.some((f) => f.key === k && f.required)),
  JSON.stringify({ source: df?.source, req: df?.fields.filter((f) => f.required).map((f) => f.key) }));

// 6. spec 853650 nguồn rõ ràng (không phải 'heading' thường). toLookupHs đệm 0 phải: 853650 → 85365000.
const spec6 = getDeclarationFieldSpec('85365000');
check('spec 853650: source nhóm 6 số (hs6), required chỉ currentRating', spec6.source === 'hs6' && spec6.required.length === 1 && spec6.required[0].key === 'currentRating',
  JSON.stringify({ source: spec6.source, req: spec6.required.map((f) => f.key) }));

// 7. End-to-end /api/classify (LLM giả): top 6 số 853650 → NEED_FACTS chỉ 1 câu Dòng định mức.
const llmTier = require('../lib/llm-tier');
llmTier.callLLMJson = async (system, user) => {
  if (system.includes('DỮ KIỆN HÀNG HÓA')) {
    return { json: { tenHangVi: 'công tắc hành trình', banChat: 'công tắc hành trình (limit switch), đóng cắt mạch điện', congDung: 'đóng cắt mạch điều khiển' }, provider: 'stub', model: 'stub' };
  }
  if (system.includes('mã HS 4 số')) {
    return { json: { headings: ['8536', '9032'] }, provider: 'stub', model: 'stub' };
  }
  if (system.includes('mã HS')) {
    return { json: { results: [{ hs: '853650', confidence: 65, reason: 'Công tắc đóng cắt ≤1000V — nhóm 853650, chưa rõ dòng.', gir: null }], missing: ['Điện áp và dòng điện định mức'] }, provider: 'stub', model: 'stub' };
  }
  return { json: {}, provider: 'stub', model: 'stub' };
};
process.env.HS_CLASSIFY_CROSSCHECK = '0';
const { classify } = require('../lib/classify.js');

// 7a. Đường thật (bảng quyết định 8536 đã duyệt BẬT): chữ "công tắc hành trình" được bảng
//     chốt thẳng 8 số 85365096 → USER_CONFIRM, KHÔNG hỏi gì — kết cục tốt nhất cho ca prod.
const ra = await classify({ tenHang: 'công tắc hành trình' });
const qsa = ra.nextAction?.questions || [];
check('classify (bảng 8536 bật): công tắc hành trình chốt bảng 8 số, không hỏi gì',
  ra.status === 'RESOLVED_BY_TABLE' && qsa.length === 0,
  JSON.stringify({ s: ra.status, q: qsa, top: ra.results?.[0]?.hs }));

// 7b. Bảng tắt (văn bản khách không khớp bảng đã duyệt — đúng ca prod /tmp/ct-hanh-trinh.json:
//     engine-loop dừng ở 6 số 853650): cổng NEED_FACTS chỉ còn 1 câu Dòng định mức,
//     không còn Điện áp + Số cực.
const r = await classify({ tenHang: 'công tắc hành trình' }, { decisionTables: false, resolver: false });
const qs = r.nextAction?.questions || [];
check('classify (bảng tắt): 6 số 853650 → NEED_FACTS, questions chỉ currentRating',
  r.status === 'NEED_FACTS' && qs.length === 1 && qs[0].attribute === 'currentRating',
  JSON.stringify({ s: r.status, q: qs }));
check('classify (bảng tắt): questions không có voltage/poleCount', !qs.some((q) => ['voltage', 'poleCount'].includes(q.attribute)), JSON.stringify(qs));
check('classify (bảng tắt): missingStructured chỉ currentRating', (r.missingStructured || []).length === 1 && r.missingStructured[0].key === 'currentRating', JSON.stringify((r.missingStructured || []).map((m) => m.key)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
