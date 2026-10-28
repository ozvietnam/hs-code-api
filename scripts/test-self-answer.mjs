#!/usr/bin/env node
// Vòng tự trả lời + nguồn có nhãn addon OZSource (báo cáo lỗi HS 28/10/2026 — bể tự hoại PE Tmall 1092190764483).
// Chứng minh: (1) từ khoá đúng chủ đề, tìm trúng dòng ảnh; (2) câu trích bịa bị bỏ, nguồn [TITLE] không được "cao";
// (3) /api/self-answer kín (cần token) + đúng shape; (4) quy tắc + bảng tra CHỈ khi có evidence, prompt cũ không đổi;
// (5) verifyQuote nhận câu chép kèm thẻ [IMG-n]/[ATTR].
import './test-isolate-data.mjs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(rootDir, 'package.json'));

let pass = 0; let fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass += 1; console.log(`  ✓ ${name}`); } else { fail += 1; console.log(`  ✗ ${name}${detail ? ` — ${String(detail).slice(0, 400)}` : ''}`); }
};

const EVIDENCE = [
  '[TITLE] 化粪池家用三格玻璃钢化粪池新农村改造塑料化粪桶加厚',
  '[ATTR] 品牌: 富芒',
  '[ATTR] 加工工艺: 吹塑',
  '[SKU] 容量: 0.3立方【送配件】 | 0.5立方 内白外蓝双层 | 1立方 内白外蓝双层 (đang chọn) | 1立方 PP材质',
  '[IMG-23] 双层结构 外层：蓝色PE抗老化 内层：白色HDPE 加强筋设计',
  '[IMG-46] 产品参数 材质：PE材质 工艺：一体注塑成型 进出水口管径：11cm',
  '[IMG-20] 隔板',
  '[IMG-21] 内部弯头',
  '[IMG-22] 丝扣盖子',
  '[REVIEW] 东西不错，送了胶和弯头，安装方便',
  '[IMG-3] 金格羽® 品质保障',
].join('\n');
const QUESTIONS = [
  'Chất liệu thân bể là gì, có sợi thủy tinh (玻璃钢) không?',
  'Vật liệu từng lớp và cách gia cố?',
  'Hàng hoàn chỉnh hay chỉ là vỏ bể, có phụ kiện đi kèm không?',
  'Điện áp sử dụng?',
];

const sa = require('./lib/self-answer.js');
const llmTier = require('./lib/llm-tier.js');

console.log('── từ khoá + đoạn trúng ──');
const kw0 = sa.keywordsFor(QUESTIONS[0]);
check('câu sợi thủy tinh → 玻璃钢/纤维/FRP/材质 (+ chữ Hán trong câu)', ['玻璃钢', '纤维', 'FRP', '材质'].every((k) => kw0.includes(k)), kw0);
const sn = sa.snippetsFor(QUESTIONS, EVIDENCE);
check('đoạn trúng gồm bảng 产品参数, ảnh lớp, ảnh bộ phận, đánh giá', ['[IMG-46]', '[IMG-23]', '[IMG-21]', '[IMG-22]', '[REVIEW]'].every((t) => sn.text.includes(t)), sn.text);
check('câu điện áp không trúng dòng nào (hàng không dùng điện)', sn.perQuestion[3].hitLines === 0, JSON.stringify(sn.perQuestion[3]));
check('"PE" khớp nguyên từ, không dính chữ khác', sa.snippetsFor(['chất liệu?'], '[IMG-1] SPEED OPEN\n[IMG-2] 材质 PE').text.includes('[IMG-2]') && !sa.snippetsFor(['chất liệu nhựa?'], '[IMG-1] SPEED OPEN').text.includes('[IMG-1]'));

console.log('── kiểm câu trả lời của AI ──');
const v = sa.validateAnswers({
  answers: [
    { i: 0, answer: 'PE hoàn toàn, không sợi thủy tinh', sources: ['IMG-46'], quote: '材质：PE材质', confidence: 'high' },
    { i: 1, answer: '2 lớp: ngoài PE xanh chống lão hoá, trong HDPE trắng; gia cố bằng gân', sources: ['IMG-23'], quote: '外层：蓝色PE抗老化 内层：白色HDPE', confidence: 'high' },
    { i: 2, answer: 'Bể hoàn chỉnh, có nắp vặn, vách ngăn, co nối; tặng keo', sources: ['TITLE'], quote: '送了胶和弯头', confidence: 'high' },
    { i: 3, answer: '220V', sources: ['ATTR'], quote: '电压：220V', confidence: 'high' },
    { i: 0, answer: 'trùng câu 0', sources: ['IMG-46'], quote: '材质：PE材质', confidence: 'high' },
  ],
}, QUESTIONS, EVIDENCE);
check('câu trích đúng nguồn → nhận, giữ "high"', v.answers[0]?.confidence === 'high' && v.answers[0].sources[0] === 'IMG-46' && v.answers[1]?.confidence === 'high', JSON.stringify(v.answers));
check('nhãn nguồn sai (trích từ REVIEW nhưng ghi TITLE) → vẫn nhận nhưng hạ còn medium', v.answers[2]?.confidence === 'medium', JSON.stringify(v.answers[2]));
check('câu trích bịa ("电压：220V") → bỏ, câu hỏi để lại hỏi khách', v.answers.length === 3 && v.unanswered.length === 1 && v.unanswered[0] === QUESTIONS[3], JSON.stringify(v));

console.log('── selfAnswer (AI giả) ──');
const orig = llmTier.callLLMJson;
let seen = null;
llmTier.callLLMJson = async (system, user, opts) => { seen = { system, user, opts }; return { json: { answers: [{ i: 0, answer: 'PE', sources: ['IMG-46'], quote: 'PE材质', confidence: 'high' }], unanswered: [1, 2, 3] }, provider: 'stub' }; };
const r = await sa.selfAnswer({ questions: QUESTIONS, evidence: EVIDENCE });
check('gọi AI 1 lượt, bước "self_answer", nhiệt độ 0', seen?.opts?.step === 'self_answer' && seen.opts.temperature === 0);
check('prompt có quy tắc tin cậy + từ khoá tiêu đề không đủ căn cứ', seen.system.includes('[IMG-n] bảng thông số') && seen.system.includes('玻璃钢'));
check('kết quả: 1 trả lời, 3 để lại, có provider', r.answers.length === 1 && r.unanswered.length === 3 && r.provider === 'stub', JSON.stringify(r));

console.log('── /api/self-answer ──');
process.env.HS_API_TOKEN = 'test-token';
const handler = require('./api/classify.js');
const call = async (headers, body) => {
  let status = 0; let json = null;
  const res = { setHeader() {}, status(s) { status = s; return this; }, json(j) { json = j; return this; }, end() { return this; } };
  await handler({ method: 'POST', url: '/api/self-answer', query: { mode: 'self_answer' }, headers, body }, res);
  return { status, json };
};
const noAuth = await call({}, { questions: QUESTIONS, evidence: EVIDENCE });
check('không token → 401 (kín, dữ liệu khách)', noAuth.status === 401, JSON.stringify(noAuth));
const bad = await call({ authorization: 'Bearer test-token' }, { questions: [], evidence: EVIDENCE });
check('thiếu câu hỏi → 400', bad.status === 400, JSON.stringify(bad));
const okRes = await call({ authorization: 'Bearer test-token' }, { questions: QUESTIONS, evidence: EVIDENCE });
check('có token → 200 + answers/unanswered', okRes.status === 200 && Array.isArray(okRes.json?.answers) && Array.isArray(okRes.json?.unanswered), JSON.stringify(okRes));
llmTier.callLLMJson = orig;
const routes = require('./routes.json');
check('routes.json: /api/self-answer → /api/classify?mode=self_answer', routes.rewrites.some((x) => x.source === '/api/self-answer' && x.destination === '/api/classify?mode=self_answer'));

console.log('── quy tắc nguồn + bảng tra (chỉ khi có evidence) ──');
const sr = require('./lib/source-rules.js');
check('không evidence → rulesBlock rỗng (prompt cũ không đổi)', sr.rulesBlock({ nameZh: '化粪池' }) === '');
const rb = sr.rulesBlock({ nameZh: '化粪池家用三格', evidence: EVIDENCE, skuFacts: [{ sku: '0.3立方【送配件】', capacityL: 300 }, { sku: '1立方 PP材质', capacityL: 1000, material: 'PP' }] });
check('bể tự hoại → bảng tra gợi ý 39.25 trước 39.26, 3925.10 > 300 lít', rb.includes('3925.10') && rb.includes('39.25 TRƯỚC 39.26'), rb);
check('thông số từng SKU + quy tắc GIR 3(a) / "loại khác"', rb.includes('0.3立方【送配件】: 300 lít') && rb.includes('1立方 PP材质: 1000 lít, PP') && rb.includes('GIR 3(a)'), rb);
check('hàng khác không dính bảng tra', sr.lookupHints('老花镜男款 防蓝光').length === 0);
check('normalizeEvidence cắt ở ranh dòng', sr.normalizeEvidence('[A] 12345\n[B] 67890', 12) === '[A] 12345');

console.log('── engine-loop / classify: dùng evidence ──');
const { round1Input } = require('./lib/engine-loop.js');
const { verifyQuote, groundingSourceOf, DOSSIER_LABELS } = require('./lib/classify.js');
const rawOld = { nameZh: '化粪池', tenHang: 'Bể tự hoại', imageTexts: ['材质 PE'] };
check('không evidence → round1Input như cũ (khối chữ ảnh 8 ảnh)', round1Input(rawOld).includes(`[${DOSSIER_LABELS.anh} 1] 材质 PE`) && !round1Input(rawOld).includes(DOSSIER_LABELS.nguon));
const rawNew = { ...rawOld, evidence: EVIDENCE };
const p1 = round1Input(rawNew);
check('có evidence → in khối nguồn có nhãn, bỏ khối chữ ảnh cũ, KHÔNG in quy tắc vào hồ sơ gốc', p1.includes(`${DOSSIER_LABELS.nguon}:`) && p1.includes('[IMG-46] 产品参数') && !p1.includes(`[${DOSSIER_LABELS.anh} 1]`) && !p1.includes('QUY TẮC BỔ SUNG'), p1);
const src = groundingSourceOf(rawNew);
check('nguồn căn cứ gồm evidence', src.includes('一体注塑成型'));
check('verifyQuote nhận câu chép kèm thẻ [IMG-46]', verifyQuote('[IMG-46] 材质：PE材质', src) === 'ok');
check('verifyQuote vẫn bác câu bịa kèm thẻ', verifyQuote('[IMG-46] 材质：玻璃纤维增强', src) === 'bad');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
