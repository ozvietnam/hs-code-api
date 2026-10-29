// L0a (#546) — nhánh phụ không gửi chữ của khách ra ngoài tầng riêng tư.
//   1–2c  web-facts: chế độ riêng tư chỉ gửi nhãn hiệu + model (ngoại lệ hẹp ZAI_RIENG_TU_HIEU_MODEL, CEO 29/10),
//         KHÔNG thêm z.ai vào LLM_NO_TRAIN_PROVIDERS.
//   3     web-facts chỉ đọc brand/model/url/mucTieu — tenHang/moTa bị bỏ qua kể cả ngoài riêng tư.
//   4     describe-core vòng 2 không rơi về tên hàng khi không có hiệu/model.
//   5     declaration-sheet / extract-specs luôn chạy trong withPrivateData.
//   6     image-facts không gọi Gemini vision khi nhà cung cấp chưa được phép nhận dữ liệu khách.
//   7     b1b-web không gửi tên hàng (truyền làm "model") khi đang riêng tư.
// Không mạng: z.ai qua stub `goi`, https.request + fetch bị chặn, LLM qua stub llmTier.callLLMJson.
import './test-isolate-data.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

for (const k of ['GEMINI_API_KEY', 'GEMINI_FREE_KEYS', 'HERMES_API_KEY', 'MINIMAX_API_KEY', 'OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY',
  'LLM_NO_TRAIN_PROVIDERS', 'HS_LLM_PRIVATE_ALL', 'ZAI_RIENG_TU_HIEU_MODEL', 'ZAI_WEB_FACTS', 'HS_SHEET_VISION']) delete process.env[k];
// Khoá giả đủ dài để qua docZaiKey() — mọi lời gọi z.ai trong test đi qua stub, mạng thật bị chặn dưới đây.
process.env.ZAI_SEARCH_KEY = 'khoa-gia-cho-test-khong-phai-that-0123456789';
process.env.HS_API_TOKEN = 'rieng-tu-test-token';
process.env.HS_ACCESS_LOG = '0';
console.error = () => {};
console.warn = () => {};

// Chặn mạng thật: lỡ đi vòng stub thì test đỏ thay vì gọi ra ngoài.
const mangThat = [];
require('node:https').request = (...a) => { mangThat.push(String(a[0]?.hostname || a[0])); throw new Error('NO_NETWORK_IN_TEST'); };
globalThis.fetch = async (u) => { mangThat.push(String(u)); throw new Error('NO_NETWORK_IN_TEST'); };

const { withPrivateData, isPrivate, privateAllowed } = require('../lib/llm-privacy.js');
const webFactsMod = require('../lib/web-facts.js');
const realWebFacts = webFactsMod.webFacts;

/** Stub z.ai: ghi lại chuỗi gửi đi, trả một câu trả lời hợp lệ. */
function mkStub() {
  const sent = [];
  const goi = async (key, than) => {
    sent.push(String(than));
    return { content: [{ type: 'text', text: 'Công suất: 22 kW, điện áp 380V' }] };
  };
  return { goi, sent };
}

/** Bắt stderr trong lúc chạy fn. */
async function batStderr(fn) {
  const lines = [];
  const orig = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk, ...rest) => { lines.push(String(chunk)); return true; };
  try { return { r: await fn(), lines }; } finally { process.stderr.write = orig; }
}

test('1. riêng tư + ZAI_RIENG_TU_HIEU_MODEL=off → null, không gọi z.ai', async () => {
  process.env.ZAI_RIENG_TU_HIEU_MODEL = 'off';
  const s = mkStub();
  const { r, lines } = await batStderr(() => withPrivateData(() => realWebFacts({ brand: 'Atlas Copco', model: 'GA22', mucTieu: 'cong_suat' }, { goi: s.goi })));
  delete process.env.ZAI_RIENG_TU_HIEU_MODEL;
  assert.equal(r, null);
  assert.equal(s.sent.length, 0, 'stub z.ai không được gọi');
  const log = lines.filter((l) => l.includes('web_facts_bo_qua'));
  assert.equal(log.length, 1, 'đúng một dòng stderr web_facts_bo_qua');
  assert.deepEqual(JSON.parse(log[0]), { type: 'web_facts_bo_qua', lyDo: 'RIENG_TU_NGOAI_HIEU_MODEL' });
});

test('2. riêng tư + mặc định (on) → gọi z.ai đúng 1 lần, chỉ nhãn hiệu + model + khuôn câu hỏi cố định', async () => {
  const s = mkStub();
  const r = await withPrivateData(() => realWebFacts({ brand: 'Atlas Copco', model: 'GA22', mucTieu: 'cong_suat' }, { goi: s.goi }));
  assert.equal(s.sent.length, 1);
  const than = s.sent[0];
  assert.ok(than.includes('Atlas Copco') && than.includes('GA22'), than);
  const conLai = than.replace('Atlas Copco', '').replace('GA22', '').replace('cong_suat', '');
  assert.equal(conLai, ' —  — . Trả lời ngắn (tối đa 6 dòng) kèm URL nguồn ở cuối.', `ngoài hiệu/model/khoá chỉ có khuôn cố định: ${than}`);
  assert.ok(r && r.cauTraLoi.includes('22 kW'));
});

test('2b. riêng tư + url → null (URL có thể lộ khách), không gọi z.ai', async () => {
  const s = mkStub();
  const r = await withPrivateData(() => realWebFacts({ url: 'https://detail.1688.com/offer/123.html' }, { goi: s.goi }));
  assert.equal(r, null);
  assert.equal(s.sent.length, 0);
  const s2 = mkStub();
  const r2 = await withPrivateData(() => realWebFacts({ model: 'GA22', url: 'https://detail.1688.com/offer/123.html' }, { goi: s2.goi }));
  assert.equal(r2, null, 'riêng tư: có url là bỏ cả lượt');
  assert.equal(s2.sent.length, 0);
});

test('2c. riêng tư: mucTieu không phải khoá từ vựng (chữ tự do) → null', async () => {
  const s = mkStub();
  const r = await withPrivateData(() => realWebFacts({ model: 'GA22', mucTieu: 'dép nhựa nữ quai PU của khách' }, { goi: s.goi }));
  assert.equal(r, null);
  assert.equal(s.sent.length, 0);
});

test('2d. LLM_NO_TRAIN_PROVIDERS không đổi: z.ai không thành LLM chung cho dữ liệu khách', () => {
  assert.equal(privateAllowed('zai', 'glm-4.7'), false);
});

test('3. ngoài riêng tư: tenHang/moTa bị bỏ qua — chuỗi gửi đi không chứa tên hàng', async () => {
  const s = mkStub();
  await realWebFacts({ model: 'GA22', tenHang: 'Dép nhựa nữ quai PU', moTa: 'Dép đi trong nhà', productName: 'Dép' }, { goi: s.goi });
  assert.equal(s.sent.length, 1);
  assert.ok(!s.sent[0].includes('Dép'), s.sent[0]);
  const s2 = mkStub();
  assert.equal(await realWebFacts({ tenHang: 'Dép nhựa nữ quai PU' }, { goi: s2.goi }), null, 'không brand/model/url → null');
  assert.equal(s2.sent.length, 0);
});

// ── describe-core vòng 2 ──
const llmTier = require('../lib/llm-tier');
let llmDecl = {};
const llmPrivateSeen = [];
llmTier.callLLMJson = async (system, user) => {
  llmPrivateSeen.push(isPrivate());
  if (String(system).includes('THÔNG SỐ SẢN PHẨM')) return { json: { attributes: [] }, provider: 'stub', model: 'stub' };
  return { json: { declaration: { tenHang: 'Máy bơm nước ly tâm', ...llmDecl } }, provider: 'stub', model: 'stub' };
};

async function describeVoiSpy(body, decl) {
  llmDecl = decl;
  const s = mkStub();
  const goiWebFacts = [];
  webFactsMod.webFacts = (o) => { goiWebFacts.push(o); return realWebFacts(o, { goi: s.goi }); };
  try {
    const { describeProduct } = require('../lib/describe-core.js');
    const out = await withPrivateData(() => describeProduct(body));
    return { out, sent: s.sent, goiWebFacts };
  } finally {
    webFactsMod.webFacts = realWebFacts;
  }
}

test('4. describe riêng tư, không hiệu/model, còn trường thiếu → z.ai không nhận tên hàng', async () => {
  const { out, sent, goiWebFacts } = await describeVoiSpy({ hsCode: '84137011', productName: 'Dép nhựa nữ quai PU' }, {});
  assert.equal(out.status, 200);
  assert.ok((out.json.compliance.missingRequired || []).length > 0, 'ca thử phải có trường bắt buộc thiếu');
  assert.ok(!sent.some((t) => t.includes('Dép')), `z.ai nhận tên hàng: ${JSON.stringify(sent)}`);
  assert.ok(!goiWebFacts.some((o) => JSON.stringify(o).includes('Dép')), `webFacts nhận tên hàng: ${JSON.stringify(goiWebFacts)}`);
});

test('4b. describe riêng tư, có hiệu + model → tra web chỉ với hiệu/model, không tên hàng', async () => {
  const { sent } = await describeVoiSpy(
    { hsCode: '84137011', productName: 'Dép nhựa nữ quai PU' },
    { nhanHieu: 'Atlas Copco', model: 'GA22' },
  );
  assert.equal(sent.length, 1, 'có hiệu/model → tra web một lượt');
  assert.ok(sent[0].includes('Atlas Copco') && sent[0].includes('GA22'), sent[0]);
  assert.ok(!sent[0].includes('Dép') && !sent[0].includes('bơm'), sent[0]);
});

// ── handler: declaration-sheet + extract-specs ──
const mkRes = () => ({ _s: 0, _j: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } });
const mkReq = (mode, body) => ({ method: 'POST', url: '/x', query: { mode }, headers: { authorization: `Bearer ${process.env.HS_API_TOKEN}` }, body });

test('5a. /api/declaration-sheet (HS_API_TOKEN) → mọi lượt LLM chạy trong withPrivateData', async () => {
  llmDecl = {};
  llmPrivateSeen.length = 0;
  const describe = require('../api/describe.js');
  const res = mkRes();
  await describe(mkReq('sheet', { titleZh: '86型 墙壁开关插座 五孔 白色', specsZh: '材质: PC\n颜色: 白色\n额定电压: 250V', hsCode: '85366932' }), res);
  assert.equal(res._s, 200, JSON.stringify(res._j).slice(0, 300));
  assert.ok(llmPrivateSeen.length > 0, 'phải có lượt LLM để kiểm');
  assert.ok(llmPrivateSeen.every(Boolean), `isPrivate() lúc gọi LLM: ${JSON.stringify(llmPrivateSeen)}`);
});

test('5b. /api/extract-specs (HS_API_TOKEN) → LLM chạy trong withPrivateData', async () => {
  llmPrivateSeen.length = 0;
  const classify = require('../api/classify.js');
  const res = mkRes();
  await classify(mkReq('extract_specs', { titleZh: '86型 墙壁开关插座 五孔 白色', specsZh: [{ key: '材质', value: '环保阻燃工程材料' }, { key: '额定电压', value: '250V' }] }), res);
  assert.equal(res._s, 200, JSON.stringify(res._j).slice(0, 300));
  assert.ok(llmPrivateSeen.length > 0, 'phải có lượt LLM để kiểm');
  assert.ok(llmPrivateSeen.every(Boolean), `isPrivate() lúc gọi LLM: ${JSON.stringify(llmPrivateSeen)}`);
});

// ── image-facts ──
const fakeImg = async () => ({ ok: true, headers: { get: (h) => (h === 'content-type' ? 'image/jpeg' : '10') }, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });

test('6. riêng tư + LLM_NO_TRAIN_PROVIDERS=minimax → image-facts không gọi Gemini vision, không tải ảnh', async () => {
  const { readImageFacts } = require('../lib/image-facts.js');
  const goiGen = [];
  const goiFetch = [];
  const generate = async () => { goiGen.push(1); return { json: { seenText: ['x'], facts: [] }, model: 'g' }; };
  const fetchImpl = async (...a) => { goiFetch.push(a[0]); return fakeImg(); };
  process.env.LLM_NO_TRAIN_PROVIDERS = 'minimax';
  const out = await withPrivateData(() => readImageFacts([{ url: 'https://img.alicdn.com/a.jpg', role: 'sku' }], { headingKeys: { mau: 'Màu' }, generate, fetchImpl }));
  delete process.env.LLM_NO_TRAIN_PROVIDERS;
  assert.equal(goiGen.length, 0, 'không gọi Gemini vision');
  assert.equal(goiFetch.length, 0, 'không tải ảnh khi không gửi được');
  assert.deepEqual(out.facts, []);
  assert.equal(out.llmError?.code, 'RIENG_TU_GEMINI_CHUA_DUOC_PHEP');
  // Đối chứng: ngoài riêng tư vẫn đọc ảnh như cũ.
  const out2 = await readImageFacts([{ url: 'https://img.alicdn.com/a.jpg', role: 'sku' }], { headingKeys: { mau: 'Màu' }, generate, fetchImpl });
  assert.equal(goiGen.length, 1, 'ngoài riêng tư: vision chạy như cũ');
  assert.equal(out2.llmError, undefined);
  // Riêng tư + gemini (khoá trả phí) trong danh sách trắng mặc định → được gọi.
  await withPrivateData(() => readImageFacts([{ url: 'https://img.alicdn.com/a.jpg', role: 'sku' }], { headingKeys: { mau: 'Màu' }, generate, fetchImpl }));
  assert.equal(goiGen.length, 2, 'riêng tư + gemini được phép → vision chạy');
});

// ── b1b-web ──
test('7. b1b riêng tư (ZAI_WEB_FACTS=on, ZAI_RIENG_TU_HIEU_MODEL=on) → không gửi tên hàng, out nguyên vẹn', async () => {
  const { b1bApDung } = require('../lib/b1b-web.js');
  process.env.ZAI_WEB_FACTS = 'on';
  process.env.ZAI_RIENG_TU_HIEU_MODEL = 'on';
  const s = mkStub();
  const goi = [];
  const spy = (o) => { goi.push(o); return realWebFacts(o, { goi: s.goi }); };
  const out = { status: 'NEED_FACTS', nextAction: { questions: [{ questionVi: 'công suất?' }] } };
  const chayLai = [];
  const r = await withPrivateData(() => b1bApDung({ tenHang: 'Dép nhựa nữ quai PU' }, out, { _b1bWebFacts: spy }, async (a) => { chayLai.push(a); return { status: 'OK' }; }));
  delete process.env.ZAI_WEB_FACTS;
  delete process.env.ZAI_RIENG_TU_HIEU_MODEL;
  assert.equal(goi.length, 0, `webFacts không được gọi với tên hàng: ${JSON.stringify(goi)}`);
  assert.equal(s.sent.length, 0);
  assert.equal(chayLai.length, 0);
  assert.deepEqual(r, out);
});

test('không có lời gọi mạng thật nào', () => {
  assert.deepEqual(mangThat, []);
});
