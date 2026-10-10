#!/usr/bin/env node
/**
 * Khoá dịch vụ có tên (HS_SERVICE_TOKENS) + trường `usage` trong phản hồi classify/describe
 * CHỈ cho người gọi là khoá dịch vụ. LLM giả lập — không mạng, không ghi data/.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.HS_API_TOKEN = 'legacy-token';
process.env.HS_SERVICE_TOKENS = 'cong-oz:khoa-cong,erp:khoa:co:dau:hai-cham';
process.env.HS_ACCESS_LOG = '0';
process.env.HS_CLASSIFY_CROSSCHECK = '0';
delete process.env.HS_PUBLIC_LLM;
delete process.env.HS_MATCH_PUBLIC;

const { requireAuth, serviceCaller } = require('../lib/auth.js');
const { recordUsage } = require('../lib/usage-context.js');

// LLM giả: tự ghi usage như lib/llm.mjs / lib/gemini.js sẽ làm khi gọi nhà cung cấp thật.
const llmTier = require('../lib/llm-tier');
llmTier.callLLMJson = async (system, user) => {
  recordUsage({ provider: 'stub', model: 'stub-1', inputTokens: 100, outputTokens: 20 });
  if (system.includes('DỮ KIỆN HÀNG HÓA')) return { json: { tenHangVi: 'hàng thử', banChat: 'hàng thử nghiệm' }, provider: 'stub', model: 'stub-1' };
  if (system.includes('mã HS 4 số')) return { json: { headings: ['2202'] }, provider: 'stub', model: 'stub-1' };
  return { json: { results: [{ hs: '22021030', confidence: 85, reason: 'Nước có ga.', gir: null }], missing: [], declaration: { tenHang: 'Sản phẩm test' } }, provider: 'stub', model: 'stub-1' };
};
console.error = () => {};
console.warn = () => {};

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};
const mkRes = () => ({ _s: 0, _j: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } });
const mkReq = (token, extra = {}) => ({ method: 'POST', url: '/x', query: {}, headers: token ? { authorization: `Bearer ${token}` } : {}, ...extra });

// ── requireAuth + serviceCaller ──
{
  const res = mkRes();
  check('khoá dịch vụ đúng → qua requireAuth', requireAuth(mkReq('khoa-cong'), res) === false);
  check('serviceCaller trả "cong-oz"', serviceCaller(mkReq('khoa-cong')) === 'cong-oz');
  check('khoá có dấu ":" trong giá trị vẫn khớp (tên = phần trước dấu : đầu)', serviceCaller(mkReq('khoa:co:dau:hai-cham')) === 'erp');
}
{
  const res = mkRes();
  check('khoá dịch vụ sai → 401', requireAuth(mkReq('khoa-sai'), res) === true && res._s === 401);
  check('serviceCaller khoá sai → null', serviceCaller(mkReq('khoa-sai')) === null);
  check('serviceCaller không token → null', serviceCaller(mkReq(null)) === null);
  check('serviceCaller với tên dịch vụ làm token → null', serviceCaller(mkReq('cong-oz')) === null);
}
{
  const res = mkRes();
  check('HS_API_TOKEN cũ vẫn qua requireAuth', requireAuth(mkReq('legacy-token'), res) === false);
  check('HS_API_TOKEN cũ KHÔNG phải khoá dịch vụ', serviceCaller(mkReq('legacy-token')) === null);
}
{
  // chỉ có khoá dịch vụ, không có HS_API_TOKEN → vẫn chạy (không 503)
  const saved = process.env.HS_API_TOKEN;
  delete process.env.HS_API_TOKEN;
  const res = mkRes();
  check('không có HS_API_TOKEN, khoá dịch vụ vẫn qua', requireAuth(mkReq('khoa-cong'), res) === false);
  const res2 = mkRes();
  check('không có HS_API_TOKEN, khoá sai → 401', requireAuth(mkReq('x'), res2) === true && res2._s === 401);
  delete process.env.HS_SERVICE_TOKENS;
  const res3 = mkRes();
  check('không có token nào cấu hình → 503', requireAuth(mkReq('x'), res3) === true && res3._s === 503);
  process.env.HS_API_TOKEN = saved;
  process.env.HS_SERVICE_TOKENS = 'cong-oz:khoa-cong,erp:khoa:co:dau:hai-cham';
}
{
  // mục hỏng bị bỏ qua, không làm sập
  process.env.HS_SERVICE_TOKENS = ' ,noColon, :emptyname,ten:, ok:khoa-ok ';
  check('mục hỏng bị bỏ qua, mục đúng vẫn nhận', serviceCaller(mkReq('khoa-ok')) === 'ok' && serviceCaller(mkReq('emptyname')) === null);
  process.env.HS_SERVICE_TOKENS = 'cong-oz:khoa-cong,erp:khoa:co:dau:hai-cham';
}

// ── classify / describe ──
const classifyHandler = require('../api/classify.js');
const describeHandler = require('../api/describe.js');
const { taxData } = require('../lib/data');
const HS = Object.keys(taxData)[0];

const run = async (handler, token, body) => {
  const res = mkRes();
  await handler(mkReq(token, { body }), res);
  return res;
};
const validUsage = (u) => Array.isArray(u) && u.length >= 1 && u.every((x) => typeof x.provider === 'string' && typeof x.model === 'string' && Number.isInteger(x.inputTokens) && Number.isInteger(x.outputTokens));

const cBody = { tenHang: 'Nước ngọt có ga có hương liệu đóng chai 500ml', chatLieu: 'chai nhựa', congDung: 'uống' };
const dBody = { hsCode: HS, productName: 'Bơm test', brand: 'X', origin: 'China' };

for (const [name, handler, body] of [['classify', classifyHandler, cBody], ['describe', describeHandler, dBody]]) {
  const svc = await run(handler, 'khoa-cong', body);
  check(`${name}: khoá dịch vụ → 200`, svc._s === 200, String(svc._s));
  check(`${name}: khoá dịch vụ nhận usage hợp lệ`, validUsage(svc._j?.usage), JSON.stringify(svc._j?.usage));
  check(`${name}: usage ghi đúng từ nhà cung cấp`, svc._j?.usage?.[0]?.provider === 'stub' && svc._j.usage[0].inputTokens === 100, JSON.stringify(svc._j?.usage));

  const pub = await run(handler, null, body);
  check(`${name}: người gọi công khai (không token) → 200`, pub._s === 200, String(pub._s));
  check(`${name}: người gọi công khai KHÔNG có usage`, pub._j && !('usage' in pub._j));

  const legacy = await run(handler, 'legacy-token', body);
  check(`${name}: HS_API_TOKEN cũ KHÔNG có usage`, legacy._s === 200 && legacy._j && !('usage' in legacy._j));

  const fake = await run(handler, 'khoa-gia-mao', body);
  check(`${name}: token sai trên endpoint mở → như công khai, không usage`, fake._j && !('usage' in fake._j));
}

// Hai request dịch vụ song song không lẫn usage
{
  let n = 0;
  const saved = llmTier.callLLMJson;
  llmTier.callLLMJson = async (system, user) => {
    const id = ++n;
    await new Promise((r) => setTimeout(r, id === 1 ? 20 : 2));
    recordUsage({ provider: `p${id}`, model: 'm', inputTokens: id, outputTokens: id });
    return saved(system, user);
  };
  const [r1, r2] = await Promise.all([run(describeHandler, 'khoa-cong', dBody), run(describeHandler, 'khoa-cong', { ...dBody, productName: 'Bơm khác' })]);
  const provs = (r) => (r._j?.usage || []).map((u) => u.provider).filter((p) => /^p\d$/.test(p));
  check('song song: mỗi phản hồi chỉ có usage của chính nó', provs(r1).length === 1 && provs(r2).length === 1 && provs(r1)[0] !== provs(r2)[0], JSON.stringify([provs(r1), provs(r2)]));
  llmTier.callLLMJson = saved;
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
