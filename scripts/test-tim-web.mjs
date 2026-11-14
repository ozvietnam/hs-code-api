import assert from 'node:assert';
import { timWeb } from '../lib/tim-web.js';
import { b1bApDung } from '../lib/b1b-web.js';

async function runTests() {
  console.log('Running OZV-757 timWeb & b1b integration tests...');

  // 1. Test timWeb with missing env / empty query
  process.env.HS_TIM_KIEM_URL = '';
  const r1 = await timWeb('test query');
  assert.strictEqual(r1, null, 'timWeb should return null if HS_TIM_KIEM_URL is empty');

  // Scenario A: timWeb returns results (nguonWeb: 'nha') — KHÔNG gọi z.ai
  let timWebCalled = 0;
  let webFactsCalled = 0;

  const mockTimWeb = async () => {
    timWebCalled++;
    return [
      { tieuDe: 'Result 1', url: 'https://example.com/1', doanTrich: 'Snippet 1 about product' },
      { tieuDe: 'Result 2', url: 'https://example.com/2', doanTrich: 'Snippet 2 about product' },
    ];
  };

  const mockWebFacts = async () => {
    webFactsCalled++;
    return { cauTraLoi: 'Z.AI fallback answer', nguon: [] };
  };

  process.env.ZAI_WEB_FACTS = 'on';

  const out = {
    status: 'NEED_FACTS',
    nextAction: {
      questions: [{ questionVi: 'Hàng làm bằng gì?' }],
    },
  };

  const daChayLai = [];
  const resA = await b1bApDung({ tenHang: 'Máy sấy' }, out, {
    _timWeb: mockTimWeb,
    _b1bWebFacts: mockWebFacts,
  }, async (a) => {
    daChayLai.push(a.tenHang);
    return { status: 'OK', results: [{ hs: '8419.89.19' }], engine: { phases: {} } };
  });

  assert.strictEqual(timWebCalled, 1, 'timWeb should be called once');
  assert.strictEqual(webFactsCalled, 0, 'webFacts should NOT be called when timWeb returns results');
  assert.ok(resA.webHint, 'webHint should be present');
  assert.strictEqual(resA.webHint.nguonWeb, 'nha', 'nguonWeb should be nha');
  assert.strictEqual(resA.webFactsApplied, true);
  assert.strictEqual(daChayLai.length, 1, 'engine chạy lại đúng 1 lần');

  // Scenario B: timWeb returns null, falls back to webFacts (nguonWeb: 'zai')
  timWebCalled = 0;
  webFactsCalled = 0;

  const mockTimWebNull = async () => {
    timWebCalled++;
    return null;
  };

  const resB = await b1bApDung({ tenHang: 'Máy sấy', brand: 'Acme', model: 'X1' }, out, {
    _timWeb: mockTimWebNull,
    _b1bWebFacts: mockWebFacts,
  }, async () => ({ status: 'NEED_FACTS', results: [] }));

  assert.strictEqual(timWebCalled, 1, 'timWeb chỉ gọi MỘT lần dù có brand/model (QT 14/11)');
  assert.strictEqual(webFactsCalled, 1, 'webFacts should be called as fallback');
  assert.strictEqual(resB.webHint.nguonWeb, 'zai', 'nguonWeb should be zai');

  // Scenario C: không có HS_TIM_KIEM_URL → hành vi cũ (webFacts)
  delete process.env.HS_TIM_KIEM_URL;
  timWebCalled = 0;
  webFactsCalled = 0;
  const resC = await b1bApDung({ tenHang: 'Máy sấy' }, out, {
    _timWeb: async () => { timWebCalled++; return null; },
    _b1bWebFacts: mockWebFacts,
  });
  assert.strictEqual(webFactsCalled, 1);
  assert.ok(resC.webHint);

  // Scenario D: timWeb treo/lỗi → vẫn trả NEED_FACTS + fallback, không ném
  timWebCalled = 0;
  webFactsCalled = 0;
  const resD = await b1bApDung({ tenHang: 'Máy sấy' }, out, {
    _timWeb: async () => { timWebCalled++; throw new Error('searxng down'); },
    _b1bWebFacts: mockWebFacts,
  });
  assert.strictEqual(timWebCalled, 1);
  assert.strictEqual(webFactsCalled, 1);
  assert.strictEqual(resD.webHint.nguonWeb, 'zai');

  delete process.env.ZAI_WEB_FACTS;
  console.log('All OZV-757 timWeb tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
