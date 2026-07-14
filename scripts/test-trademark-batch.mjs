#!/usr/bin/env node
/**
 * Test batch screening nhãn hiệu qua endpoint /api/trademark (POST items[]).
 * Gọi thẳng handler dataset.js với mock req/res — không cần server chạy.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

process.env.HS_API_TOKEN = 'test-token';
const handler = require('../api/dataset.js');

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log(`PASS ${name}`);
  } else {
    fail += 1;
    console.log(`FAIL ${name}`);
  }
}

function mockRes() {
  return {
    _status: 0,
    _json: null,
    statusCode: 0,
    setHeader() {},
    status(code) {
      this._status = code;
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this._json = payload;
      return this;
    },
    end() {
      return this;
    },
  };
}

async function call(body, { method = 'POST', token = 'test-token' } = {}) {
  const req = {
    method,
    url: '/api/dataset?resource=trademark',
    query: { resource: 'trademark' },
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body,
  };
  const res = mockRes();
  await handler(req, res);
  return res;
}

// 1. Batch hợp lệ: ABB (đã thêm vào watchlist) + 1 nhãn không tồn tại
const r1 = await call({
  items: [
    { id: 'A', brand: 'ABB', hs: '85371019', origin: 'China' },
    { id: 'B', brand: 'KhongCoNhanNay', hs: '84137090', origin: 'Germany' },
    { id: 'C', brand: 'Kamoer', hs: '84137090', origin: 'China' },
  ],
});
check('batch trả 200', r1._status === 200);
check('batch total = 3', r1._json?.total === 3);
const byId = Object.fromEntries((r1._json?.results || []).map((x) => [x.id, x]));
check('ABB matched', byId.A?.matched === true);
check('ABB có riskLevel', ['WATCH', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(byId.A?.riskLevel));
check('nhãn lạ matched=false + NONE', byId.B?.matched === false && byId.B?.riskLevel === 'NONE');
check('Kamoer matched + verified', byId.C?.matched === true && byId.C?.verified === true);
check('Kamoer echo owner', typeof byId.C?.owner === 'string' && byId.C.owner.length > 0);
check('flagged đếm đúng (2)', r1._json?.flagged === 2);
check('byLevel có NONE', (r1._json?.byLevel?.NONE || 0) === 1);
check('có coverageNote', typeof r1._json?.coverageNote === 'string');

// 2. Body sai → 400
const r2 = await call({ notItems: [] });
check('thiếu items[] → 400', r2._status === 400);

// 3. Quá tải → 400
const big = { items: Array.from({ length: 1001 }, (_, i) => ({ brand: 'X', id: i })) };
const r3 = await call(big);
check('vượt 1000 item → 400', r3._status === 400);

// 4. Auth sai → 401
const r4 = await call({ items: [] }, { token: 'wrong' });
check('token sai → 401', r4._status === 401);

// 5. Body dạng string JSON vẫn parse được
const r5 = await call(JSON.stringify({ items: [{ brand: 'ABB' }] }));
check('body string JSON parse OK', r5._status === 200 && r5._json?.total === 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
