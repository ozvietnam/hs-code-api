// Test server.js — thứ thay Vercel khi chạy trên Coolify/Docker. Kiểm: rewrite từ
// vercel.json, header file tĩnh, handler API, auth, chặn ../, 404. Cổng ngẫu nhiên,
// ghi vào thư mục tạm (test-isolate-data).
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.HS_API_TOKEN = 'server-test-token';
process.env.HS_ACCESS_LOG = '0';
const { createServer, applyRewrite } = require('../server.js');

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};

const rw = applyRewrite(new URL('http://x/api/customs-types/A11?x=1'));
check('rewrite có tham số :code + giữ query', rw?.pathname === '/api/customs-types' && rw.searchParams.get('code') === 'A11' && rw.searchParams.get('x') === '1', rw?.href);
check('không khớp rewrite → null', applyRewrite(new URL('http://x/api/health')) === null);

const server = createServer();
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}`;
const get = (p, opts) => fetch(base + p, opts);

try {
  const h = await get('/api/health');
  const hj = await h.json();
  check('GET /api/health 200', h.status === 200 && hj.status, JSON.stringify(hj).slice(0, 100));

  const llms = await get('/llms.txt');
  check('/llms.txt: file tĩnh + header từ vercel.json', llms.status === 200 && /text\/plain/.test(llms.headers.get('content-type')) && llms.headers.get('access-control-allow-origin') === '*');

  const admin = await get('/admin');
  check('/admin → public/admin/index.html', admin.status === 200 && /text\/html/.test(admin.headers.get('content-type')));

  const prec = await get('/api/precedents?hs=72052100', { headers: { authorization: 'Bearer server-test-token' } });
  const pj = await prec.json();
  check('/api/precedents (rewrite → dataset) trả dữ liệu', prec.status === 200 && pj.hsCode === '72052100', JSON.stringify(pj).slice(0, 120));

  const noAuth = await get('/api/suggest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ description: 'bàn gỗ' }) });
  check('POST /api/suggest không token → 401', noAuth.status === 401, String(noAuth.status));

  const bad = await get('/api/suggest', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer server-test-token' }, body: '{hỏng' });
  check('JSON hỏng → handler trả 400', bad.status === 400, String(bad.status));

  const trav = await get('/..%2Fpackage.json');
  check('chặn ../ ra ngoài public/', trav.status === 404, String(trav.status));

  const miss = await get('/api/khong-co');
  check('API không tồn tại → 404', miss.status === 404);
} finally {
  server.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
