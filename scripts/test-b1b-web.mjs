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

test('gopDauVao: giới hạn ~1000 ký tự, giữ các trường gốc', () => {
  const g = gopDauVao({ tenHang: 't', chatLieu: 'gang' }, 'x'.repeat(3000));
  assert.ok(g.tenHang.length <= 1000);
  assert.equal(g.chatLieu, 'gang');
  assert.ok(g.tenHang.startsWith('t\nDữ kiện'));
});
