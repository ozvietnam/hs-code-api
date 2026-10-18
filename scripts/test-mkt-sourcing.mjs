#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Trợ lý Tìm nguồn cho oz-mkt — `POST /api/mkt/sourcing-assist` (rewrite → /api/describe?mode=sourcing).
 * Hợp đồng: ozvietnam/oz-mkt PR #9. LLM giả lập — không mạng, không ghi data/ thật.
 *
 * Khoá ở đây:
 *  - KÍN: không token / token sai → 401; HS_API_TOKEN (không phải khoá dịch vụ) → 403; HS_PUBLIC_LLM không mở được.
 *  - Mọi lượt LLM chạy ở chế độ riêng tư (withPrivateData); hết nhà cung cấp hợp lệ → 502 NO_PRIVATE_LLM.
 *  - Lời khách chỉ ở lời nhắc người dùng (khối có rào), không vào lời nhắc hệ thống.
 *  - Khuôn đầu ra chặt; `reason`/`titleVi` có giá/xưởng/MOQ bị làm sạch; item chỉ mang id, matchScore, reason, titleVi.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const k of ['GEMINI_API_KEY', 'GEMINI_FREE_KEYS', 'HERMES_API_KEY', 'MINIMAX_API_KEY', 'OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY',
  'LLM_NO_TRAIN_PROVIDERS', 'HS_LLM_PRIVATE_ALL', 'HS_MATCH_PUBLIC', 'HS_MKT_SOURCING', 'HS_MKT_SOURCING_RPM', 'HS_MKT_SOURCING_CONCURRENCY']) delete process.env[k];
process.env.HS_API_TOKEN = 'test-token';
process.env.HS_SERVICE_TOKENS = 'oz-mkt:khoa-mkt';
process.env.HS_PUBLIC_LLM = 'true'; // kể cả khi 4 endpoint LLM đang mở công khai, sourcing vẫn KÍN
process.env.HS_ACCESS_LOG = '0';
console.error = () => {};
console.warn = () => {};

let passed = 0; let failed = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || extra === undefined ? '' : ` ${JSON.stringify(extra).slice(0, 600)}`}`);
  if (ok) passed += 1; else failed += 1;
};

// ── Stub tầng LLM ──
const llmTier = require('../lib/llm-tier.js');
const realCallLLMJson = llmTier.callLLMJson;
const { isPrivate } = require('../lib/llm-privacy.js');
const { recordUsage } = require('../lib/usage-context.js');
const { resetServiceRate } = require('../lib/service-rate-limit.js');
let reply = () => ({});
let calls = [];
llmTier.callLLMJson = async (system, user, opts = {}) => {
  calls.push({ system, user, opts, private: isPrivate() });
  recordUsage({ provider: 'stub', model: 'stub-mkt', inputTokens: 300, outputTokens: 200 });
  const json = await reply(system, user, opts);
  if (json instanceof Error) throw json;
  return { json, provider: 'stub', model: 'stub-mkt', tier: 'standard' };
};

const ms = require('../lib/mkt-sourcing.js');
const handler = require('../api/describe.js');

const call = async ({ method = 'POST', body, headers = { authorization: 'Bearer khoa-mkt' }, mode = 'sourcing' } = {}) => {
  const res = { _s: 0, _j: null, _h: {}, getHeader(k) { return this._h[k]; }, setHeader(k, v) { this._h[k] = v; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
  await handler({ method, url: '/api/mkt/sourcing-assist', query: { mode }, headers, body }, res);
  return res;
};

const CLARIFY_IN = { task: 'clarify', input: { text: 'máy in UV lên ốp điện thoại', links: ['https://detail.1688.com/offer/1.html'], imageCount: 1 } };
const GOOD_CLARIFY = {
  questions: [
    { id: 'kich-thuoc', text: 'Khổ in bạn cần?', options: [{ value: 'a4', label: 'A4' }, { value: 'a3', label: 'A3' }] },
    { id: 'muc-dich', text: 'Bạn in để làm gì?', options: [{ value: 'kinh-doanh', label: 'Kinh doanh' }, { value: 'thu', label: 'Dùng thử' }, { value: 'khong-ro', label: 'Không rõ' }] },
    { id: 'Số lượng ốp/ngày', text: 'Mỗi ngày in bao nhiêu ốp?', options: [{ value: '<50', label: 'Dưới 50' }, { value: '50+', label: 'Trên 50' }] },
  ],
  laneGuess: 'lan2',
};
const GOOD_BRIEF = { vi: 'Máy in UV phẳng khổ nhỏ để in ốp điện thoại', zh: '手机壳UV打印机 小型平板', en: 'Phone case UV flatbed printer',
  keywordsZh: ['手机壳UV打印机', 'UV平板打印机', '小型UV打印机', '手机壳打印机'], keywordsEn: ['phone case UV printer', 'UV flatbed printer'], laneGuess: 'lan2' };
const ITEMS = [
  { id: 'a1', title: '手机壳UV打印机 A4 小型', snapshot: '{"price":"3800","moq":1}' },
  { id: 'a2', title: '豆腐机 全自动 商用', snapshot: 'raw page text' },
  { id: 'a3', title: 'UV平板打印机 A3', snapshot: { shop: 'X', price: 9000 } },
];
const SCORE_IN = { task: 'score', input: { brief: GOOD_BRIEF, items: ITEMS } };

// ═══ 1. Định tuyến + auth ═══
const routes = JSON.parse(fs.readFileSync(path.join(ROOT, 'routes.json'), 'utf8'));
check('routes.json: /api/mkt/sourcing-assist → /api/describe?mode=sourcing (gộp, không file api mới)',
  routes.rewrites.some((r) => r.source === '/api/mkt/sourcing-assist' && r.destination === '/api/describe?mode=sourcing'));
check('không có file api/mkt*', !fs.readdirSync(path.join(ROOT, 'api')).some((f) => /^mkt/.test(f)));

reply = () => GOOD_CLARIFY;
calls = [];
let r = await call({ body: CLARIFY_IN, headers: {} });
check('không token → 401', r._s === 401, r._j);
r = await call({ body: CLARIFY_IN, headers: { authorization: 'Bearer sai' } });
check('token sai → 401', r._s === 401, r._j);
r = await call({ body: CLARIFY_IN, headers: { authorization: 'Bearer test-token' } });
check('HS_API_TOKEN (không phải khoá dịch vụ) → 403 CHI_KHOA_DICH_VU', r._s === 403 && r._j.error === 'CHI_KHOA_DICH_VU', r._j);
check('bị từ chối thì không gọi LLM', calls.length === 0, calls.length);
r = await call({ method: 'GET', body: CLARIFY_IN });
check('GET → 405', r._s === 405);
r = await call({ method: 'OPTIONS' });
check('OPTIONS → CORS', r._h['Access-Control-Allow-Origin'] !== undefined || r._s === 200 || r._s === 204, { s: r._s, h: r._h });

// ═══ 2. Kiểm đầu vào ═══
const bad = async (name, body) => {
  calls = [];
  const x = await call({ body });
  check(`đầu vào sai: ${name} → 400 DAU_VAO_SAI, không gọi LLM`, x._s === 400 && x._j.error === 'DAU_VAO_SAI' && calls.length === 0, x._j);
};
await bad('task lạ', { task: 'price', input: {} });
await bad('thiếu input', { task: 'clarify' });
await bad('clarify rỗng', { task: 'clarify', input: { text: '', links: [], imageCount: 0 } });
await bad('text quá dài', { task: 'clarify', input: { text: 'x'.repeat(2001) } });
await bad('link không http', { task: 'clarify', input: { text: 'a', links: ['javascript:alert(1)'] } });
await bad('quá 5 link', { task: 'clarify', input: { text: 'a', links: Array(6).fill('https://a.b') } });
await bad('imageCount > 5', { task: 'clarify', input: { text: 'a', imageCount: 6 } });
await bad('brief thiếu text', { task: 'brief', input: { answers: {} } });
await bad('brief answers không phải chuỗi', { task: 'brief', input: { text: 'a', answers: { q: 1 } } });
await bad('score > 20 items', { task: 'score', input: { brief: GOOD_BRIEF, items: Array.from({ length: 21 }, (_, i) => ({ id: `i${i}`, title: 't' })) } });
await bad('score items rỗng', { task: 'score', input: { brief: GOOD_BRIEF, items: [] } });
await bad('score id trùng', { task: 'score', input: { brief: GOOD_BRIEF, items: [{ id: 'a', title: 't' }, { id: 'a', title: 'u' }] } });
await bad('score snapshot quá dài', { task: 'score', input: { brief: GOOD_BRIEF, items: [{ id: 'a', title: 't', snapshot: 'x'.repeat(2001) }] } });
await bad('body không phải JSON', '{nope');

// ═══ 3. clarify ═══
reply = () => GOOD_CLARIFY;
calls = [];
r = await call({ body: CLARIFY_IN });
const qs = r._j?.result?.questions || [];
check('clarify → 200 {result:{questions, laneGuess}}', r._s === 200 && Array.isArray(qs) && r._j.result.laneGuess === 'lan2', r._j);
check('clarify: 3–5 câu', qs.length >= 3 && qs.length <= 5, qs.length);
check('clarify: câu nào cũng có lựa chọn cuối "Không rõ, để Oz tư vấn" (value khong-ro), đúng một lần',
  qs.every((q) => q.options.at(-1).value === 'khong-ro' && q.options.at(-1).label === 'Không rõ, để Oz tư vấn' && q.options.filter((o) => o.value === 'khong-ro').length === 1), qs);
check('clarify: id/value được chuẩn hoá slug', qs.every((q) => /^[a-z0-9-]+$/.test(q.id) && q.options.every((o) => /^[a-z0-9-]+$/.test(o.value))), qs);
check('clarify: chỉ có trường id/text/options', qs.every((q) => Object.keys(q).sort().join() === 'id,options,text'));
check('clarify: LLM chạy ở chế độ riêng tư', calls.length === 1 && calls[0].private === true && calls[0].opts.containsCustomerData === true, calls.map((c) => c.private));
check('clarify: lời khách không vào lời nhắc hệ thống, nằm trong khối rào ở lời nhắc người dùng',
  !calls[0].system.includes('ốp điện thoại') && /<du_lieu_khach id="[0-9a-f]+">[\s\S]*ốp điện thoại[\s\S]*<\/du_lieu_khach/.test(calls[0].user), calls[0].user);
check('clarify: khoá dịch vụ nhận usage', Array.isArray(r._j.usage) && r._j.usage.length === 1, r._j.usage);
check('Cache-Control: no-store', r._h['Cache-Control'] === 'no-store');

reply = () => ({ questions: GOOD_CLARIFY.questions.slice(0, 2), laneGuess: 'lan2' });
r = await call({ body: CLARIFY_IN });
check('clarify: < 3 câu hợp lệ → 502 LLM_KET_QUA_SAI', r._s === 502 && r._j.error === 'LLM_KET_QUA_SAI', r._j);
reply = () => ({ ...GOOD_CLARIFY, laneGuess: 'L9' });
r = await call({ body: CLARIFY_IN });
check('clarify: laneGuess lạ → 502 LLM_KET_QUA_SAI', r._s === 502 && r._j.error === 'LLM_KET_QUA_SAI', r._j);
reply = () => ({ ...GOOD_CLARIFY, laneGuess: 'Làn 3' });
r = await call({ body: CLARIFY_IN });
check('clarify: "Làn 3" chuẩn hoá về lan3', r._s === 200 && r._j.result.laneGuess === 'lan3', r._j);
reply = () => ({ questions: [...GOOD_CLARIFY.questions, ...GOOD_CLARIFY.questions.map((q) => ({ ...q, id: `${q.id}-2` }))], laneGuess: 'lan1' });
r = await call({ body: CLARIFY_IN });
check('clarify: 6 câu → cắt còn 5', r._s === 200 && r._j.result.questions.length === 5, r._j?.result?.questions?.length);
reply = () => 'không phải object';
r = await call({ body: CLARIFY_IN });
check('clarify: LLM trả không phải object → 502 LLM_KET_QUA_SAI', r._s === 502 && r._j.error === 'LLM_KET_QUA_SAI', r._j);

// ═══ 4. brief ═══
reply = () => GOOD_BRIEF;
calls = [];
r = await call({ body: { task: 'brief', input: { text: 'máy in UV lên ốp điện thoại', answers: { 'kich-thuoc': 'a4', 'muc-dich': 'khong-ro' } } } });
const b = r._j?.result;
check('brief → 200, đủ vi/zh/en/keywordsZh/keywordsEn/laneGuess',
  r._s === 200 && b && ['vi', 'zh', 'en', 'keywordsZh', 'keywordsEn', 'laneGuess'].every((k) => k in b) && Object.keys(b).length === 6, r._j);
check('brief: keywordsZh 3–5, toàn chữ Hán', b.keywordsZh.length >= 3 && b.keywordsZh.length <= 5 && b.keywordsZh.every((k) => /\p{Script=Han}/u.test(k)), b.keywordsZh);
check('brief: riêng tư + câu trả lời khách ở lời nhắc người dùng', calls[0].private === true && calls[0].user.includes('kich-thuoc') && !calls[0].system.includes('kich-thuoc'));
check('brief: lời nhắc hệ thống có ví dụ từ khoá 1688', calls[0].system.includes('手机壳UV打印机') && calls[0].system.includes('豆腐机'));
reply = () => ({ ...GOOD_BRIEF, keywordsZh: ['phone case', '手机壳UV打印机'] });
r = await call({ body: { task: 'brief', input: { text: 'máy in UV', answers: {} } } });
check('brief: < 3 từ khoá Trung hợp lệ → 502 LLM_KET_QUA_SAI', r._s === 502 && r._j.error === 'LLM_KET_QUA_SAI', r._j);
reply = () => ({ ...GOOD_BRIEF, keywordsZh: ['手机壳UV打印机', '工厂直销UV打印机', '小型UV打印机', 'UV平板打印机', '手机壳打印机', '彩印机'] });
r = await call({ body: { task: 'brief', input: { text: 'máy in UV', answers: {} } } });
check('brief: từ khoá Trung có "工厂" bị loại, cắt còn ≤ 5', r._s === 200 && !r._j.result.keywordsZh.some((k) => k.includes('工厂')) && r._j.result.keywordsZh.length === 5, r._j?.result?.keywordsZh);

// ═══ 5. score ═══
reply = () => ({
  items: [
    { id: 'a1', matchScore: 91.6, reason: 'Đúng loại máy in UV phẳng khổ A4 dùng in ốp điện thoại. Giá rẻ.', titleVi: 'Máy in UV ốp điện thoại khổ A4', price: 3800 },
    { id: 'a2', matchScore: 5, reason: 'Máy làm đậu phụ, khác hẳn chủng loại, giá chỉ 2.000 tệ.', titleVi: 'Máy làm đậu phụ tự động' },
    { id: 'a3', matchScore: '64', reason: 'Máy in UV khổ A3, giá 9000 元, xưởng Quảng Châu, MOQ 1 bộ.', titleVi: 'Máy in UV phẳng A3 - giá 9000 元' },
    { id: 'bia', matchScore: 99, reason: 'Mẫu bịa', titleVi: 'x' },
  ],
});
calls = [];
r = await call({ body: SCORE_IN });
const it = r._j?.result?.items || [];
const byId = Object.fromEntries(it.map((x) => [x.id, x]));
check('score → 200 {result:{items}}', r._s === 200 && Array.isArray(it), r._j);
check('score: mẫu bịa (id không có trong input) bị bỏ', !byId.bia && it.length === 3, it.map((x) => x.id));
check('score: item chỉ có id/matchScore/reason/titleVi (trường price của LLM bị bỏ)', it.every((x) => Object.keys(x).sort().join() === 'id,matchScore,reason,titleVi'), it);
check('score: matchScore số nguyên 0–100 (91.6 → 92, "64" → 64)', byId.a1.matchScore === 92 && byId.a3.matchScore === 64 && it.every((x) => Number.isInteger(x.matchScore) && x.matchScore >= 0 && x.matchScore <= 100), it);
check('score: reason giữ đúng một câu (câu sau có "Giá rẻ" bị cắt)', byId.a1.reason === 'Đúng loại máy in UV phẳng khổ A4 dùng in ốp điện thoại.', byId.a1.reason);
check('score: reason chứa số tiền ("2.000 tệ") → thay bằng câu trung tính', byId.a2.reason === ms.NEUTRAL_REASON, byId.a2.reason);
check('score: reason nêu giá/xưởng/MOQ → thay bằng câu trung tính', byId.a3.reason === ms.NEUTRAL_REASON, byId.a3.reason);
check('score: không reason/titleVi nào còn số tiền, 元, xưởng, MOQ', it.every((x) => !/\d\s*(元|tệ|đ\b)|xưởng|moq|giá\s*\d/i.test(`${x.reason} ${x.titleVi}`)), it);
check('score: titleVi bỏ cụm có giá, giữ phần tên hàng', byId.a3.titleVi === 'Máy in UV phẳng A3', byId.a3.titleVi);
check('score: thứ tự theo input', it.map((x) => x.id).join() === 'a1,a2,a3');
check('score: snapshot (object) được đưa vào lời nhắc người dùng dạng dữ liệu, riêng tư', calls[0].private === true && calls[0].user.includes('a3') && !calls[0].system.includes('a3'));

reply = () => ({ items: [{ id: 'a1', matchScore: 'cao', reason: 'x' }] });
r = await call({ body: SCORE_IN });
check('score: không mẫu nào chấm hợp lệ → 502 LLM_KET_QUA_SAI', r._s === 502 && r._j.error === 'LLM_KET_QUA_SAI', r._j);
reply = () => ({ items: [{ id: 'a1', matchScore: 150, reason: '' }, { id: 'a2', matchScore: -3, reason: 'Khác loại.' }] });
r = await call({ body: SCORE_IN });
check('score: matchScore kẹp 0–100, reason rỗng → câu trung tính, mẫu LLM bỏ sót không bịa thêm',
  r._s === 200 && r._j.result.items.length === 2 && r._j.result.items[0].matchScore === 100 && r._j.result.items[1].matchScore === 0 && r._j.result.items[0].reason === ms.NEUTRAL_REASON, r._j);

// ═══ 6. Lỗi LLM ═══
reply = () => Object.assign(new Error('timeout 504 echo: máy in UV ốp điện thoại'), { code: 'X' });
r = await call({ body: CLARIFY_IN });
check('lỗi LLM → 502 LLM_LOI, không vọng lại nội dung khách', r._s === 502 && r._j.error === 'LLM_LOI' && !JSON.stringify(r._j).includes('ốp điện thoại'), r._j);
reply = () => Object.assign(new Error('NO_PRIVATE_LLM: ...'), { code: 'NO_PRIVATE_LLM' });
r = await call({ body: CLARIFY_IN });
check('NO_PRIVATE_LLM → 502 NO_PRIVATE_LLM', r._s === 502 && r._j.error === 'NO_PRIVATE_LLM', r._j);

// Tầng LLM THẬT: chỉ có khoá tầng miễn phí (Gemini free + OpenRouter) → không gọi ai, ra NO_PRIVATE_LLM (không mạng).
llmTier.callLLMJson = realCallLLMJson;
process.env.GEMINI_FREE_KEYS = 'free-key-khong-dung';
process.env.OPENROUTER_API_KEY = 'or-khong-dung';
process.env.OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
const realFetch = globalThis.fetch;
let netCalls = 0;
globalThis.fetch = async () => { netCalls += 1; throw new Error('mạng bị chặn trong test'); };
r = await call({ body: CLARIFY_IN });
check('LLM thật, chỉ có tầng miễn phí → 502 NO_PRIVATE_LLM, không gọi mạng', r._s === 502 && r._j.error === 'NO_PRIVATE_LLM' && netCalls === 0, { j: r._j, netCalls });
globalThis.fetch = realFetch;
for (const k of ['GEMINI_FREE_KEYS', 'OPENROUTER_API_KEY', 'OPENROUTER_MODEL']) delete process.env[k];
llmTier.callLLMJson = async () => ({ json: GOOD_CLARIFY, provider: 'stub', model: 'stub', tier: 'standard' });

// ═══ 7. Tắt khẩn cấp + trần tần suất ═══
process.env.HS_MKT_SOURCING = 'false';
r = await call({ body: CLARIFY_IN });
check('HS_MKT_SOURCING=false → 503', r._s === 503, r._j);
delete process.env.HS_MKT_SOURCING;
resetServiceRate();
process.env.HS_MKT_SOURCING_RPM = '2';
await call({ body: CLARIFY_IN }); await call({ body: CLARIFY_IN });
r = await call({ body: CLARIFY_IN });
check('vượt trần lượt/phút theo khoá → 429 VUOT_HAN_MUC + Retry-After', r._s === 429 && r._j.error === 'VUOT_HAN_MUC' && r._h['Retry-After'], r._j);
delete process.env.HS_MKT_SOURCING_RPM;
resetServiceRate();

// ═══ 8. Không mở qua cơ chế public-llm ═══
const publicLlmSrc = fs.readFileSync(path.join(ROOT, 'lib/public-llm.js'), 'utf8');
check('lib/public-llm.js không nhắc sourcing', !/sourcing/i.test(publicLlmSrc));
r = await call({ body: CLARIFY_IN, headers: {}, mode: 'sourcing' });
check('HS_PUBLIC_LLM=true vẫn 401 khi không khoá', r._s === 401);

// ═══ 9. Máy làm sạch (đơn vị) ═══
const { hasCommercialInfo, cleanReason } = ms._internal;
const sach = ['Đúng chủng loại máy làm đậu phụ công suất lớn.', 'Đánh giá cao vì cùng công dụng in UV.', 'Có giá đỡ ốp đi kèm, cùng khổ in.', 'Công suất 3 kW phù hợp quán nhỏ.'];
const ban = ['Giá 3.800 tệ khá tốt.', 'Chỉ 500k một bộ.', 'Khoảng 2 triệu đồng.', 'Bán ¥3800.', 'MOQ 1 bộ.', 'Xưởng ở Quảng Châu.', 'Nhà máy sản xuất lớn.', '价格便宜', 'USD 120 per set.', 'Đặt tối thiểu 10 cái.', 'Giá rẻ hơn mẫu khác.'];
check('làm sạch: câu sạch không bị báo oan', sach.every((s) => !hasCommercialInfo(s)), sach.filter((s) => hasCommercialInfo(s)));
check('làm sạch: câu có giá/xưởng/MOQ đều bị bắt', ban.every((s) => hasCommercialInfo(s)), ban.filter((s) => !hasCommercialInfo(s)));
check('cleanReason: cắt dài ≤ 200 ký tự', cleanReason('a'.repeat(500)).length <= 200);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
