import { test } from 'node:test';
import assert from 'node:assert/strict';

test('web-facts: thiếu key → null; key rác → null (B1b tắt êm)', async () => {
  const saved = process.env.ZAI_SEARCH_KEY;
  delete process.env.ZAI_SEARCH_KEY;
  process.env.ZAI_SEARCH_KEY = '';
  const { webFacts, docZaiKey } = await import('../lib/web-facts.js');
  assert.equal(docZaiKey(), null);
  assert.equal(await webFacts({ model: 'GA22' }), null);
  process.env.ZAI_SEARCH_KEY = 'ngan';
  assert.equal(docZaiKey(), null);
  if (saved) process.env.ZAI_SEARCH_KEY = saved; else delete process.env.ZAI_SEARCH_KEY;
});
