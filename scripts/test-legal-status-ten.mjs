import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let passed = 0, failed = 0;
const check = (n, c, d = '') => { if (c) { passed++; console.log('PASS', n); } else { failed++; console.error('FAIL', n, d); } };
process.env.HS_PUBLIC_READ = 'true';
const handler = require('../api/dataset.js');
const headers = {};
const res = {
  status(c) { this.__c = c; return this; },
  json(b) { this.__b = JSON.stringify(b); return this; },
  setHeader(k, v) { headers[k] = v; },
  getHeader(k) { return headers[k]; },
};
await handler({ method: 'GET', url: '/api/dataset?resource=legal_status&ten=mỹ phẩm', query: { resource: 'legal_status', ten: 'mỹ phẩm' }, headers: {} }, res);
const body = JSON.parse(res.__b || '{}');
check('?ten=mỹ phẩm: có kết quả + TT 06/2011', (body.items || []).some(x => x.soHieu === '06/2011/TT-BYT'), JSON.stringify(body).slice(0,200));
check('timTheo=ten', body.timTheo === 'ten');
await handler({ method: 'GET', url: '/api/dataset?resource=legal_status&ten=thuế GTGT', query: { resource: 'legal_status', ten: 'thuế GTGT' }, headers: {} }, res);
const b2 = JSON.parse(res.__b || '{}');
check('?ten=thuế GTGT: TT 219/2013', (b2.items || []).some(x => x.soHieu === '219/2013/TT-BTC'));
console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
