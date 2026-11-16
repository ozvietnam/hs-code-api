import { test } from 'node:test';
import assert from 'node:assert/strict';
import { b1bApDung, b1bShadow, cheDo, truyVan, gopDauVao } from '../lib/b1b-web.js';

delete process.env.ZAI_SEARCH_KEY; // test chạy offline: không key → webFacts thật trả null, không bao giờ gọi mạng

test('cheDo: off mặc định, shadow/on hợp lệ, rác → off', () => {
  const saved = process.env.ZAI_WEB_FACTS;
  delete process.env.ZAI_WEB_FACTS;
  assert.equal(cheDo(), 'off');
  process.env.ZAI_WEB_FACTS = 'shadow';
  assert.equal(cheDo(), 'shadow');
  process.env.ZAI_WEB_FACTS = 'rác';
  assert.equal(cheDo(), 'off');
  if (saved) process.env.ZAI_WEB_FACTS = saved; else delete process.env.ZAI_WEB_FACTS;
});

test('truyVan: không gửi nguyên văn mô tả dài — chỉ tên ≤80 ký tự', () => {
  const q = truyVan({ tenHang: 'x'.repeat(200) });
  assert.equal(q.ten.length, 80);
  assert.equal(truyVan({}), null);
});

test('shadow: off → out nguyên vẹn; không NEED_FACTS → không đụng; lỗi search → out nguyên vẹn', async () => {
  const outOK = { status: 'OK', results: [] };
  assert.deepEqual(await b1bShadow({ tenHang: 'A' }, outOK), outOK); // off mode đầu tiên
  process.env.ZAI_WEB_FACTS = 'shadow';
  const outNF = { status: 'NEED_FACTS', nextAction: { questions: [{ questionVi: 'công suất?' }] } };
  // không key search → webFacts null → out nguyên vẹn (không webHint)
  const r1 = await b1bShadow({ tenHang: 'Máy X' }, outNF);
  assert.equal(r1.webHint, undefined);
  delete process.env.ZAI_WEB_FACTS;
});

test('b1b on: có trả lời web → chạy lại MỘT lượt với nhãn "chưa kiểm chứng", thành công thì webFactsApplied', async () => {
  process.env.ZAI_WEB_FACTS = 'on';
  const fake = async () => ({ cauTraLoi: 'Máy hàn nhiệt, dùng điện trở.', nguon: [{ title: 'n', url: 'https://x' }] });
  const daChayLai = [];
  const out = { status: 'NEED_FACTS', nextAction: { questions: [{ questionVi: 'loại hàn?' }] } };
  const r = await b1bApDung({ tenHang: 'máy hàn nhựa' }, out, { _b1bWebFacts: fake }, async (a) => {
    daChayLai.push(a.tenHang);
    return { status: 'OK', results: [{ hs: '8515.80.90' }] };
  });
  delete process.env.ZAI_WEB_FACTS;
  assert.equal(r.webFactsApplied, true);
  assert.equal(r.status, 'OK');
  assert.ok(daChayLai[0].includes('chưa kiểm chứng'), 'dữ kiện web phải gắn nhãn chưa kiểm chứng');
  assert.ok(r.webHint.nhanAi === 'AI_CHUA_KIEM');
});

test('b1b on: chạy lại vẫn NEED_FACTS → giữ NEED_FACTS + webHint, không webFactsApplied', async () => {
  process.env.ZAI_WEB_FACTS = 'on';
  const fake = async () => ({ cauTraLoi: 'không rõ', nguon: [] });
  const out = { status: 'NEED_FACTS', nextAction: { questions: [] } };
  const r = await b1bApDung({ tenHang: 'hàng lạ' }, out, { _b1bWebFacts: fake }, async () => ({ status: 'NEED_FACTS', results: [] }));
  delete process.env.ZAI_WEB_FACTS;
  assert.equal(r.status, 'NEED_FACTS');
  assert.equal(r.webFactsApplied, undefined);
  assert.ok(r.webHint);
});

test('b1b: lượt chạy lại (_b1bDaThu) không tra web lần nữa — trả out nguyên vẹn', async () => {
  process.env.ZAI_WEB_FACTS = 'on';
  let daGoi = 0;
  const out = { status: 'NEED_FACTS', nextAction: {} };
  const r = await b1bApDung({ tenHang: 'x' }, out, { _b1bDaThu: true, _b1bWebFacts: async () => { daGoi++; return { cauTraLoi: 'v' }; } }, async () => { throw new Error('không được gọi'); });
  delete process.env.ZAI_WEB_FACTS;
  assert.equal(daGoi, 0);
  assert.deepEqual(r, out);
});

// OZV-1259: đo prod 16/11 — z.ai (rơi về khi SearXNG rỗng) ăn 8–27 s/lượt chỉ để gắn webHint (lượt chạy lại không
// bao giờ chạy trên HTTP vì trần 85 s < B1B_LAI_MIN_MS 120 s); goiZai mặc định 45 s có thể đẩy cả lượt quá trần ⇒ 503
// QUA_GIO, khách mất luôn đáp án NEED_FACTS. Có hạn chót lượt (opts.hanChotMs) thì z.ai phải nằm gọn trong hạn.
const NF = () => ({ status: 'NEED_FACTS', nextAction: { questions: [{ questionVi: 'chất liệu?' }] } });
const timRong = async () => [];

test('OZV-1259: còn quá ít giờ tới hạn chót → KHÔNG gọi z.ai, trả out nguyên vẹn ngay', async () => {
  process.env.ZAI_WEB_FACTS = 'on';
  let daGoi = 0;
  const t0 = Date.now();
  const out = NF();
  const r = await b1bApDung({ tenHang: 'giác hút SMC' }, out, {
    hanChotMs: Date.now() + 3000, _timWeb: timRong,
    _b1bWebFacts: async () => { daGoi++; return { cauTraLoi: 'cao su NBR' }; },
  }, async () => null);
  delete process.env.ZAI_WEB_FACTS;
  assert.equal(daGoi, 0);
  assert.equal(r.webHint, undefined);
  assert.ok(Date.now() - t0 < 500, `phải trả ngay, mất ${Date.now() - t0} ms`);
});

test('OZV-1259: z.ai chậm hơn trần HS_B1B_ZAI_MS → cắt đúng trần, bỏ webHint, không chờ z.ai', async () => {
  process.env.ZAI_WEB_FACTS = 'on';
  process.env.HS_B1B_ZAI_MS = '300';
  let timeoutNhan = null;
  const t0 = Date.now();
  const r = await b1bApDung({ tenHang: 'máy phun socola 5 tầng' }, NF(), {
    hanChotMs: Date.now() + 60000, _timWeb: timRong,
    _b1bWebFacts: (o) => { timeoutNhan = o.timeoutMs; return new Promise((res) => setTimeout(() => res({ cauTraLoi: 'trễ' }), 3000).unref()); },
  }, async () => null);
  const ms = Date.now() - t0;
  delete process.env.ZAI_WEB_FACTS; delete process.env.HS_B1B_ZAI_MS;
  assert.equal(timeoutNhan, 300, 'webFacts phải nhận timeoutMs = trần');
  assert.equal(r.webHint, undefined);
  assert.ok(ms < 1500, `phải cắt ở ~300 ms, mất ${ms} ms`);
});

test('OZV-1259: trần z.ai co theo hạn chót lượt (còn − 5 s lề), nhỏ hơn trần env', async () => {
  process.env.ZAI_WEB_FACTS = 'on';
  let timeoutNhan = null;
  const r = await b1bApDung({ tenHang: 'đèn led hình gấu' }, NF(), {
    hanChotMs: Date.now() + 9000, _timWeb: timRong,
    _b1bWebFacts: async (o) => { timeoutNhan = o.timeoutMs; return { cauTraLoi: 'đèn ngủ phát sáng thật' }; },
  }, async () => null);
  delete process.env.ZAI_WEB_FACTS;
  assert.ok(timeoutNhan > 2000 && timeoutNhan <= 4000, `trần phải ≈ 9 s − 5 s, nhận ${timeoutNhan}`);
  assert.equal(r.webHint?.nguonWeb, 'zai', 'z.ai trả kịp thì vẫn gắn webHint như cũ');
});

test('OZV-1259: không có hạn chót (CLI/bench) → hành vi y cũ, không cắt z.ai', async () => {
  process.env.ZAI_WEB_FACTS = 'on';
  process.env.HS_B1B_ZAI_MS = '50';
  let timeoutNhan = 'chua';
  const r = await b1bApDung({ tenHang: 'bộ lọc khí AR2000' }, NF(), {
    _timWeb: timRong,
    _b1bWebFacts: (o) => { timeoutNhan = o.timeoutMs; return new Promise((res) => setTimeout(() => res({ cauTraLoi: 'lọc khí nén' }), 200)); },
  }, async () => null);
  delete process.env.ZAI_WEB_FACTS; delete process.env.HS_B1B_ZAI_MS;
  assert.equal(timeoutNhan, undefined);
  assert.equal(r.webHint?.nguonWeb, 'zai');
});

test('gopDauVao: giới hạn ~1000 ký tự, giữ các trường gốc', () => {
  const g = gopDauVao({ tenHang: 't', chatLieu: 'gang' }, 'x'.repeat(3000));
  assert.ok(g.tenHang.length <= 1000);
  assert.equal(g.chatLieu, 'gang');
  assert.ok(g.tenHang.startsWith('t\nDữ kiện'));
});
