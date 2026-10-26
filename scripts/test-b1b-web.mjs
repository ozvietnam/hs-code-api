import { test } from 'node:test';
import assert from 'node:assert/strict';
import { b1bShadow, cheDo, truyVan } from '../lib/b1b-web.js';

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
