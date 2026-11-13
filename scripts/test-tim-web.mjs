import assert from 'node:assert';
import { timWeb } from '../lib/tim-web.js';
import { b1bApDung } from '../lib/b1b-web.js';

async function runTests() {
  console.log('Running OZV-757 timWeb & b1b integration tests...');

  // 1. Test timWeb with missing env / empty query
  process.env.HS_TIM_KIEM_URL = '';
  const r1 = await timWeb('test query');
  assert.strictEqual(r1, null, 'timWeb should return null if HS_TIM_KIEM_URL is empty');

  // 2. Test timWeb with mocked HTTP server or direct function logic
  // Let's test b1bApDung with mocked timWeb and z.ai fallback

  // Scenario A: timWeb returns results (nguonWeb: 'nha')
  let timWebCalled = 0;
  let webFactsCalled = 0;

  const mockTimWeb = async (q) => {
    timWebCalled++;
    return [
      { tieuDe: 'Result 1', url: 'https://example.com/1', doanTrich: 'Snippet 1 about product' },
      { tieuDe: 'Result 2', url: 'https://example.com/2', doanTrich: 'Snippet 2 about product' }
    ];
  };

  const mockWebFacts = async () => {
    webFactsCalled++;
    return { cauTraLoi: 'Z.AI fallback answer', nguon: [] };
  };

  process.env.ZAI_WEB_FACTS = 'shadow';

  const out = {
    status: 'NEED_FACTS',
    nextAction: {
      questions: [{ questionVi: 'Hàng làm bằng gì?' }]
    }
  };

  const resA = await b1bApDung({ tenHang: 'Máy sấy' }, out, {
    _timWeb: mockTimWeb,
    _b1bWebFacts: mockWebFacts
  });

  assert.strictEqual(timWebCalled, 1, 'timWeb should be called');
  assert.strictEqual(webFactsCalled, 0, 'webFacts should NOT be called when timWeb returns results');
  assert.ok(resA.webHint, 'webHint should be present');
  assert.strictEqual(resA.webHint.nguonWeb, 'nha', 'nguonWeb should be nha');

  // Scenario B: timWeb returns null, falls back to webFacts (nguonWeb: 'zai')
  timWebCalled = 0;
  webFactsCalled = 0;

  const mockTimWebNull = async () => {
    timWebCalled++;
    return null;
  };

  const resB = await b1bApDung({ tenHang: 'Máy sấy' }, out, {
    _timWeb: mockTimWebNull,
    _b1bWebFacts: mockWebFacts
  });

  assert.strictEqual(timWebCalled, 1, 'timWeb should be called');
  assert.strictEqual(webFactsCalled, 1, 'webFacts should be called as fallback');
  assert.strictEqual(resB.webHint.nguonWeb, 'zai', 'nguonWeb should be zai');

  console.log('All OZV-757 timWeb tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
