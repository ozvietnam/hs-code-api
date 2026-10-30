import './test-isolate-data.mjs';
/**
 * L0j (#547) — đếm chi phí LLM của lượt CÔNG KHAI (suggest / describe / classify / match + z.ai) và resource kín
 * `llm_cost` (/api/admin/llm-cost). CEO 29/10: lượt công khai giữ mở, KHÔNG trần tiền, chỉ đếm; HS_PUBLIC_LLM=false chỉ là
 * công tắc khẩn. LLM + z.ai giả lập — không mạng; ghi vào thư mục tạm (HS_DATA_DIR), không đụng data/ thật.
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

process.env.HS_API_TOKEN = 'legacy-token';
process.env.HS_SERVICE_TOKENS = 'cong-oz:khoa-cong,erp:khoa-erp';
process.env.HS_ACCESS_LOG = '0';
process.env.HS_CLASSIFY_CROSSCHECK = '0';
delete process.env.HS_PUBLIC_LLM;
delete process.env.HS_MATCH_PUBLIC;
delete process.env.LLM_PRICE_TABLE;

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};
const mkRes = () => ({ _s: 0, _j: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } });
const mkReq = (token, extra = {}) => ({ method: 'POST', url: '/x', query: {}, headers: token ? { authorization: `Bearer ${token}` } : {}, ...extra });

// ── 1. Bảng giá + tinhUsd ──
const cost = require('../lib/llm-cost.js');
{
  const { tinhUsd, BANG_GIA_MAC_DINH, giaCua } = cost;
  const mm = BANG_GIA_MAC_DINH['minimax/MiniMax-M2.7-highspeed'];
  check('bảng giá có MiniMax-M2.7-highspeed (nhà cung cấp chính)', mm && typeof mm.vaoUsdMoiTrieu === 'number' && typeof mm.raUsdMoiTrieu === 'number', JSON.stringify(mm));
  check('mỗi mục giá có nguonGia + traNgay', Object.values(BANG_GIA_MAC_DINH).every((g) => ['TRANG_CHINH_THUC', 'UOC_LUONG', 'MIEN_PHI'].includes(g.nguonGia) && /^\d{4}-\d{2}-\d{2}$/.test(g.traNgay)), JSON.stringify(Object.entries(BANG_GIA_MAC_DINH).filter(([, g]) => !g.traNgay).map(([k]) => k)));
  check('tinhUsd: MiniMax 1 triệu token vào = giá vào của bảng', tinhUsd({ provider: 'minimax', model: 'MiniMax-M2.7-highspeed', inputTokens: 1_000_000, outputTokens: 0 }) === mm.vaoUsdMoiTrieu);
  check('tinhUsd: gemini trả phí 2.5-flash 1M vào + 1M ra = 0,30 + 2,50 (trang giá Google)', Math.abs(tinhUsd({ provider: 'gemini', model: 'models/gemini-2.5-flash', inputTokens: 1_000_000, outputTokens: 1_000_000 }) - 2.8) < 1e-9);
  check('tinhUsd: z.ai glm-4.7 có giá', typeof tinhUsd({ provider: 'zai', model: 'glm-4.7', inputTokens: 1000, outputTokens: 100 }) === 'number');
  check('tinhUsd: token -1 → null', tinhUsd({ provider: 'minimax', model: 'MiniMax-M2.7-highspeed', inputTokens: -1, outputTokens: 10 }) === null);
  check('tinhUsd: mẫu lạ → null', tinhUsd({ provider: 'minimax', model: 'MiniMax-Khong-Co', inputTokens: 10, outputTokens: 10 }) === null);
  check('tinhUsd: nhà cung cấp lạ → null', tinhUsd({ provider: 'la', model: 'x', inputTokens: 10, outputTokens: 10 }) === null);
  check('tinhUsd: Gemini miễn phí → 0', tinhUsd({ provider: 'gemini-free', model: 'models/gemini-2.5-flash', inputTokens: 5000, outputTokens: 500 }) === 0);
  check('tinhUsd: mẫu OpenRouter ":free" → 0', tinhUsd({ provider: 'openrouter', model: 'google/gemma-3-27b-it:free', inputTokens: 5000, outputTokens: 500 }) === 0);
  check('tinhUsd: entry rỗng → null, không ném', tinhUsd(null) === null && tinhUsd({}) === null);
  // #583: mẫu Gemini trả phí đang chạy làm chốt cuối (#578) — usage ghi "models/gemini-3.5-flash"
  const g35 = tinhUsd({ provider: 'gemini', model: 'models/gemini-3.5-flash', inputTokens: 1_000_000, outputTokens: 1_000_000 });
  check('tinhUsd: gemini/models/gemini-3.5-flash (chốt cuối trả phí) → số, không null', typeof g35 === 'number' && Number.isFinite(g35) && g35 > 0, String(g35));
  const m35 = giaCua('gemini', 'models/gemini-3.5-flash');
  check('… giá gemini-3.5-flash theo gemini-3.6-flash (Google tự chuyển yêu cầu sang 3.6), gắn UOC_LUONG, tra 2026-10-30',
    m35?.nguonGia === 'UOC_LUONG' && m35.traNgay === '2026-10-30' && m35.vaoUsdMoiTrieu === BANG_GIA_MAC_DINH['gemini/gemini-3.6-flash'].vaoUsdMoiTrieu && m35.raUsdMoiTrieu === BANG_GIA_MAC_DINH['gemini/gemini-3.6-flash'].raUsdMoiTrieu && /ai\.google\.dev/.test(m35.ghiChu || ''), JSON.stringify(m35));
  check('giaCua: trả nguonGia để báo phần ước lượng', ['TRANG_CHINH_THUC', 'UOC_LUONG'].includes(giaCua('minimax', 'MiniMax-M2.7-highspeed')?.nguonGia));
}
{
  process.env.LLM_PRICE_TABLE = '{"minimax/MiniMax-M2.7-highspeed":{"vaoUsdMoiTrieu":1,"raUsdMoiTrieu":2}}';
  check('LLM_PRICE_TABLE ghi đè: 1M vào + 1M ra = 1 + 2', cost.tinhUsd({ provider: 'minimax', model: 'MiniMax-M2.7-highspeed', inputTokens: 1_000_000, outputTokens: 1_000_000 }) === 3);
  check('LLM_PRICE_TABLE ghi đè → nguonGia ENV', cost.giaCua('minimax', 'MiniMax-M2.7-highspeed')?.nguonGia === 'ENV');
  check('LLM_PRICE_TABLE chỉ đè mục được khai (gemini giữ giá mặc định)', Math.abs(cost.tinhUsd({ provider: 'gemini', model: 'gemini-2.5-flash', inputTokens: 1_000_000, outputTokens: 0 }) - 0.3) < 1e-9);
  process.env.LLM_PRICE_TABLE = '{"hermes/deepseek-chat":{"vaoUsdMoiTrieu":0.5,"raUsdMoiTrieu":1}}';
  check('LLM_PRICE_TABLE thêm mục mới (hermes) → có giá', cost.tinhUsd({ provider: 'hermes', model: 'deepseek-chat', inputTokens: 2_000_000, outputTokens: 1_000_000 }) === 2);
  process.env.LLM_PRICE_TABLE = '{hỏng';
  check('LLM_PRICE_TABLE hỏng → bỏ qua, dùng bảng mặc định, không ném', cost.tinhUsd({ provider: 'minimax', model: 'MiniMax-M2.7-highspeed', inputTokens: 1_000_000, outputTokens: 0 }) === cost.BANG_GIA_MAC_DINH['minimax/MiniMax-M2.7-highspeed'].vaoUsdMoiTrieu);
  process.env.LLM_PRICE_TABLE = '{"minimax/MiniMax-M2.7-highspeed":{"vaoUsdMoiTrieu":-1,"raUsdMoiTrieu":"x"}}';
  check('LLM_PRICE_TABLE giá âm/không phải số → bỏ mục đó', cost.giaCua('minimax', 'MiniMax-M2.7-highspeed')?.nguonGia !== 'ENV');
  delete process.env.LLM_PRICE_TABLE;
}

// ── 2. Bộ đếm demLuotCongKhai ──
const { dataPath } = require('../lib/data-paths.js');
const { recordUsage } = require('../lib/usage-context.js');
const meter = require('../lib/public-llm-meter.js');
const TEP = dataPath('llm-cost-public.jsonl');
const docDong = () => (fs.existsSync(TEP) ? fs.readFileSync(TEP, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const xoaTep = () => { try { fs.rmSync(TEP, { force: true, recursive: true }); } catch { /* */ } };
const KHOA = new Set(meter.KHOA_DONG);
const BI_MAT = 'Máy bơm bí mật của khách XYZ-123';

{
  xoaTep();
  const kq = await meter.demLuotCongKhai('describe', async () => {
    recordUsage({ provider: 'minimax', model: 'MiniMax-M2.7-highspeed', inputTokens: 1000, outputTokens: 200 });
    recordUsage({ provider: 'la', model: 'x', inputTokens: 10, outputTokens: 10 });
    return { ok: BI_MAT };
  }, { req: mkReq(null) });
  const d = docDong();
  check('demLuotCongKhai: trả nguyên kết quả của fn', kq.ok === BI_MAT);
  check('demLuotCongKhai: đúng 1 dòng', d.length === 1, d.length);
  const r = d[0] || {};
  check('dòng: endpoint, soLoiGoi=2, nguoiGoi=CONG_KHAI', r.endpoint === 'describe' && r.soLoiGoi === 2 && r.nguoiGoi === 'CONG_KHAI', JSON.stringify(r));
  check('dòng: nhaCungCap có token + usd từng lượt', Array.isArray(r.nhaCungCap) && r.nhaCungCap[0].inputTokens === 1000 && typeof r.nhaCungCap[0].usd === 'number' && r.nhaCungCap[1].usd === null, JSON.stringify(r.nhaCungCap));
  check('dòng: khongRoGia=1, usdTong = tổng phần có giá', r.khongRoGia === 1 && Math.abs(r.usdTong - r.nhaCungCap[0].usd) < 1e-12, JSON.stringify(r));
  check('dòng: ts ISO', !Number.isNaN(Date.parse(r.ts)));
  check('dòng: tập khoá ⊆ danh sách cố định', Object.keys(r).every((k) => KHOA.has(k)), Object.keys(r).join(','));
  check('dòng: không chứa kết quả/đầu vào', !JSON.stringify(r).includes(BI_MAT));
}
{
  xoaTep();
  let loi = null;
  try {
    await meter.demLuotCongKhai('classify', async () => {
      recordUsage({ provider: 'gemini', model: 'models/gemini-2.5-flash', inputTokens: 100, outputTokens: 10 });
      throw new Error(`hỏng ${BI_MAT}`);
    }, { req: mkReq(null) });
  } catch (e) { loi = e; }
  const d = docDong();
  check('fn ném lỗi → ném lại đúng lỗi đó', loi && loi.message.includes('hỏng'));
  check('fn ném lỗi → vẫn ghi 1 dòng, loi=true, có usage đã tiêu', d.length === 1 && d[0].loi === true && d[0].soLoiGoi === 1, JSON.stringify(d));
  check('fn ném lỗi → không chép thông điệp lỗi vào dòng', !JSON.stringify(d).includes(BI_MAT));
}
{
  xoaTep();
  await meter.demLuotCongKhai('suggest', async () => 1, { req: mkReq('legacy-token') });
  check('HS_API_TOKEN → nguoiGoi=HS_API_TOKEN (tách khỏi khách công khai)', docDong()[0]?.nguoiGoi === 'HS_API_TOKEN', JSON.stringify(docDong()));
  xoaTep();
  await meter.demLuotCongKhai('suggest', async () => 1, { req: mkReq('token-gia-mao') });
  check('token sai trên endpoint mở → CONG_KHAI', docDong()[0]?.nguoiGoi === 'CONG_KHAI');
}
{
  // Lỗi ghi đĩa (đường dẫn là thư mục) không làm hỏng lượt
  xoaTep();
  fs.mkdirSync(TEP, { recursive: true });
  const se = console.error; const sw = console.warn;
  console.error = () => {}; console.warn = () => {};
  let kq; let loi = null;
  try { kq = await meter.demLuotCongKhai('describe', async () => 42, { req: mkReq(null) }); } catch (e) { loi = e; } finally { console.error = se; console.warn = sw; }
  check('ghi đĩa lỗi → lượt vẫn trả kết quả, không ném', kq === 42 && loi === null, String(loi));
  xoaTep();
}

// ── 3. z.ai (web-facts) ghi usage ──
{
  process.env.ZAI_SEARCH_KEY = 'zai-khoa-gia-lap-dai-hon-20-ky-tu';
  delete process.env.ZAI_SEARCH_MODEL;
  const https = require('node:https');
  const savedReq = https.request;
  let guiDi = '';
  https.request = (opts, cb) => {
    const req = new EventEmitter();
    req.end = (body) => {
      guiDi = String(body || '');
      const res = new EventEmitter();
      res.statusCode = 200;
      cb(res);
      res.emit('data', JSON.stringify({ content: [{ type: 'text', text: 'Công suất 22 kW' }], usage: { input_tokens: 3000, output_tokens: 150 } }));
      res.emit('end');
    };
    req.destroy = () => {};
    return req;
  };
  const { withUsage } = require('../lib/usage-context.js');
  const { webFacts } = require('../lib/web-facts.js');
  const { result, usage } = await withUsage(() => webFacts({ brand: 'Atlas Copco', model: 'GA22', mucTieu: 'công suất' }));
  https.request = savedReq;
  check('web-facts vẫn trả câu trả lời như cũ', result?.cauTraLoi === 'Công suất 22 kW', JSON.stringify(result));
  check('web-facts: ghi usage provider=zai, model=glm-4.7, token từ phản hồi', usage.length === 1 && usage[0].provider === 'zai' && usage[0].model === 'glm-4.7' && usage[0].inputTokens === 3000 && usage[0].outputTokens === 150, JSON.stringify(usage));
  check('web-facts: không đổi nội dung gửi z.ai', /Atlas Copco — GA22 — công suất/.test(guiDi));
  delete process.env.ZAI_SEARCH_KEY;
}

// ── 4. Handler thật: chỉ lượt KHÔNG phải khoá dịch vụ được đếm ──
// LLM giả đặt TRƯỚC khi require handler (suggest lấy callLLMJson lúc require).
const llmTier = require('../lib/llm-tier');
let soLanGoiLlm = 0;
llmTier.callLLMJson = async (system) => {
  soLanGoiLlm += 1;
  recordUsage({ provider: 'minimax', model: 'MiniMax-M2.7-highspeed', inputTokens: 100, outputTokens: 20 });
  if (system.includes('DỮ KIỆN HÀNG HÓA')) return { json: { tenHangVi: 'hàng thử', banChat: 'hàng thử nghiệm' }, provider: 'minimax', model: 'MiniMax-M2.7-highspeed' };
  if (system.includes('mã HS 4 số')) return { json: { headings: ['2202'] }, provider: 'minimax', model: 'MiniMax-M2.7-highspeed' };
  return { json: { results: [{ hs: '22021030', confidence: 85, reason: 'Nước có ga.', gir: null }], missing: [], declaration: { tenHang: 'Sản phẩm test' } }, provider: 'minimax', model: 'MiniMax-M2.7-highspeed' };
};
console.error = () => {};
console.warn = () => {};
const describeHandler = require('../api/describe.js');
const classifyHandler = require('../api/classify.js');
const suggestHandler = require('../api/suggest.js');
const searchHandler = require('../api/search.js');
const { taxData } = require('../lib/data');
const HS = Object.keys(taxData)[0];
const dBody = { hsCode: HS, productName: BI_MAT, brand: 'X', origin: 'China' };
const cBody = { tenHang: `Nước ngọt có ga ${BI_MAT}`, chatLieu: 'chai nhựa', congDung: 'uống' };
const sBody = { description: `Nước ngọt có ga đóng chai ${BI_MAT}`, productName: BI_MAT };
const mBody = { titleVi: `Máy bơm nước ${BI_MAT}` };
const run = async (handler, token, body, query = {}) => { const res = mkRes(); await handler(mkReq(token, { body, query }), res); return res; };

for (const [ep, handler, body, query] of [
  ['describe', describeHandler, dBody, {}],
  ['classify', classifyHandler, cBody, {}],
  ['suggest', suggestHandler, sBody, {}],
  ['match', searchHandler, mBody, { mode: 'match' }],
]) {
  xoaTep();
  soLanGoiLlm = 0;
  const pub = await run(handler, null, body, query);
  const d = docDong();
  check(`${ep}: lượt công khai → đúng 1 dòng, endpoint=${ep}`, d.length === 1 && d[0].endpoint === ep, `${pub._s} ${JSON.stringify(d)}`);
  check(`${ep}: soLoiGoi = số lượt LLM thật sự gọi (${soLanGoiLlm})`, d[0]?.soLoiGoi === soLanGoiLlm, JSON.stringify(d[0]));
  check(`${ep}: dòng không có chữ của khách, khoá ⊆ danh sách cố định`, !JSON.stringify(d).includes(BI_MAT) && !JSON.stringify(d).includes('XYZ-123') && Object.keys(d[0] || {}).every((k) => KHOA.has(k)), JSON.stringify(d[0]));
  check(`${ep}: phản hồi công khai không đổi shape (không thêm usage)`, pub._j && !('usage' in pub._j));

  xoaTep();
  await run(handler, 'khoa-cong', body, query);
  check(`${ep}: khoá dịch vụ cong-oz → KHÔNG ghi dòng công khai`, docDong().length === 0, JSON.stringify(docDong()));
  await run(handler, 'khoa-erp', body, query);
  check(`${ep}: khoá dịch vụ erp → KHÔNG ghi dòng công khai`, docDong().length === 0);

  xoaTep();
  process.env.HS_PUBLIC_LLM = 'false';
  const dong = await run(handler, null, body, query);
  check(`${ep}: HS_PUBLIC_LLM=false, không token → 401 như cũ, không ghi dòng`, dong._s === 401 && docDong().length === 0, `${dong._s} ${docDong().length}`);
  delete process.env.HS_PUBLIC_LLM;
}
{
  // Chế độ phụ kín (sheet / extract_specs / declaration-check) không phải lượt công khai → không đếm ở đây.
  xoaTep();
  await run(describeHandler, null, {}, { mode: 'sheet' });
  await run(classifyHandler, null, { titleZh: 'x' }, { mode: 'extract_specs' });
  check('mode=sheet / extract_specs không token → 401, không ghi dòng', docDong().length === 0);
}

// ── 5. Resource kín llm_cost ──
const datasetHandler = require('../api/dataset.js');
{
  xoaTep();
  const dong = [
    { ts: '2026-10-28T18:30:00.000Z', endpoint: 'describe', nguoiGoi: 'CONG_KHAI', soLoiGoi: 2, nhaCungCap: [{ provider: 'minimax', model: 'MiniMax-M2.7-highspeed', inputTokens: 1000, outputTokens: 100, usd: 0.0005 }, { provider: 'zai', model: 'glm-4.7', inputTokens: 3000, outputTokens: 150, usd: 0.00213 }], usdTong: 0.00263, usdUocLuong: 0.0005, khongRoGia: 0, loi: false, ms: 10 },
    { ts: '2026-10-29T03:00:00.000Z', endpoint: 'classify', nguoiGoi: 'CONG_KHAI', soLoiGoi: 1, nhaCungCap: [{ provider: 'la', model: 'x', inputTokens: 5, outputTokens: 5, usd: null }], usdTong: 0, usdUocLuong: 0, khongRoGia: 1, loi: false, ms: 10 },
    { ts: '2026-10-29T16:59:00.000Z', endpoint: 'describe', nguoiGoi: 'HS_API_TOKEN', soLoiGoi: 1, nhaCungCap: [{ provider: 'minimax', model: 'MiniMax-M2.7-highspeed', inputTokens: 2000, outputTokens: 200, usd: 0.001 }], usdTong: 0.001, usdUocLuong: 0.001, khongRoGia: 0, loi: true, ms: 10 },
    { ts: '2026-10-29T17:00:00.000Z', endpoint: 'suggest', nguoiGoi: 'CONG_KHAI', soLoiGoi: 9, nhaCungCap: [], usdTong: 9, usdUocLuong: 0, khongRoGia: 0, loi: false, ms: 10 },
  ];
  fs.writeFileSync(TEP, `${dong.map((x) => JSON.stringify(x)).join('\n')}\ndòng hỏng không phải JSON\n`);

  const r401 = mkRes();
  await datasetHandler({ method: 'GET', url: '/x', headers: {}, query: { resource: 'llm_cost', ngay: '2026-10-29' } }, r401);
  check('llm_cost không token → 401', r401._s === 401, String(r401._s));

  const res = mkRes();
  await datasetHandler({ method: 'GET', url: '/x', headers: { authorization: 'Bearer legacy-token' }, query: { resource: 'llm_cost', ngay: '2026-10-29' } }, res);
  const j = res._j || {};
  check('llm_cost có token → 200', res._s === 200, `${res._s} ${JSON.stringify(j).slice(0, 200)}`);
  check('llm_cost: lọc theo ngày giờ VN (18:30Z ngày 28 = 01:30 VN ngày 29; 17:00Z ngày 29 = ngày 30 VN)', j.ngay === '2026-10-29' && j.soLuot === 3, JSON.stringify(j));
  check('llm_cost: usdTong đúng trên 3 dòng', Math.abs(j.usdTong - 0.00363) < 1e-9, j.usdTong);
  check('llm_cost: soLoiGoi + khongRoGia + soLuotLoi', j.soLoiGoi === 4 && j.khongRoGia === 1 && j.soLuotLoi === 1, JSON.stringify(j));
  check('llm_cost: theoEndpoint', j.theoEndpoint?.describe?.soLuot === 2 && j.theoEndpoint?.classify?.soLuot === 1 && Math.abs(j.theoEndpoint.describe.usd - 0.00363) < 1e-9, JSON.stringify(j.theoEndpoint));
  check('llm_cost: theoNhaCungCap gộp token theo provider/model', j.theoNhaCungCap?.['minimax/MiniMax-M2.7-highspeed']?.inputTokens === 3000 && j.theoNhaCungCap?.['minimax/MiniMax-M2.7-highspeed']?.soLoiGoi === 2 && j.theoNhaCungCap?.['zai/glm-4.7']?.soLoiGoi === 1, JSON.stringify(j.theoNhaCungCap));
  check('llm_cost: theoNguoiGoi tách CONG_KHAI / HS_API_TOKEN', j.theoNguoiGoi?.CONG_KHAI?.soLuot === 2 && j.theoNguoiGoi?.HS_API_TOKEN?.soLuot === 1, JSON.stringify(j.theoNguoiGoi));
  check('llm_cost: báo phần USD theo giá ước lượng', Math.abs(j.usdUocLuong - 0.0015) < 1e-9, j.usdUocLuong);
  check('llm_cost: bỏ qua dòng hỏng, đếm số dòng hỏng', j.dongHong === 1, j.dongHong);

  const rBad = mkRes();
  await datasetHandler({ method: 'GET', url: '/x', headers: { authorization: 'Bearer legacy-token' }, query: { resource: 'llm_cost', ngay: '29/10/2026' } }, rBad);
  check('llm_cost: ngay sai định dạng → 400', rBad._s === 400, String(rBad._s));

  const rNone = mkRes();
  await datasetHandler({ method: 'GET', url: '/x', headers: { authorization: 'Bearer legacy-token' }, query: { resource: 'llm_cost', ngay: '2026-01-01' } }, rNone);
  check('llm_cost: ngày không có lượt → 0', rNone._s === 200 && rNone._j.soLuot === 0 && rNone._j.usdTong === 0, JSON.stringify(rNone._j));

  xoaTep();
  const rEmpty = mkRes();
  await datasetHandler({ method: 'GET', url: '/x', headers: { authorization: 'Bearer legacy-token' }, query: { resource: 'llm_cost' } }, rEmpty);
  check('llm_cost: chưa có tệp, không truyền ngay → hôm nay (giờ VN), 0 lượt', rEmpty._s === 200 && /^\d{4}-\d{2}-\d{2}$/.test(rEmpty._j.ngay) && rEmpty._j.soLuot === 0, JSON.stringify(rEmpty._j));
}
{
  const { isPublicRead, PUBLIC_DATASET_RESOURCES } = require('../lib/public-access.js');
  check('llm_cost KÍN: không nằm trong allowlist công khai', !PUBLIC_DATASET_RESOURCES.has('llm_cost') && isPublicRead({ endpoint: 'dataset', resource: 'llm_cost', method: 'GET' }) === false);
  const routes = JSON.parse(fs.readFileSync(path.join(root, 'routes.json'), 'utf8'));
  check('routes.json: /api/admin/llm-cost → dataset?resource=llm_cost', (routes.rewrites || []).some((r) => r.source === '/api/admin/llm-cost' && r.destination === '/api/dataset?resource=llm_cost'));
  const gi = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  check('.gitignore chặn data/llm-cost-public.jsonl (nhật ký runtime)', /^data\/llm-cost-public\.jsonl$/m.test(gi));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
