#!/usr/bin/env node
/**
 * Khoá ranh giới "mở LLM không giới hạn" (CEO chốt 09/10/2026): đúng 4 endpoint LLM không cần token,
 * mọi endpoint ghi dữ liệu / quản trị vẫn kín, và công tắc HS_PUBLIC_LLM=false đóng lại được.
 * Không gọi LLM thật: mọi request dùng body hỏng/thiếu để dừng ở bước kiểm đầu vào (400).
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.HS_API_TOKEN = 'llm-test-token';
process.env.HS_ACCESS_LOG = '0';
delete process.env.HS_PUBLIC_LLM;
delete process.env.HS_MATCH_PUBLIC;
const { createServer } = require('../server.js');
const { PUBLIC_LLM_ENDPOINTS, publicLlmEnabled } = require('../lib/public-llm.js');
const { PUBLIC_ENDPOINTS } = require('../lib/public-access.js');

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};

check('danh sách LLM mở đúng 4 endpoint', JSON.stringify([...PUBLIC_LLM_ENDPOINTS].sort()) === JSON.stringify(['classify', 'describe', 'match', 'suggest']), PUBLIC_LLM_ENDPOINTS.join(','));
check('LLM không lọt vào allowlist ĐỌC (isPublicRead chỉ cho dữ liệu tĩnh)', PUBLIC_LLM_ENDPOINTS.every((e) => !PUBLIC_ENDPOINTS.has(e)));
check('mặc định BẬT', publicLlmEnabled() === true);

const server = createServer();
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}`;
const post = (p, headers = {}, body = '{hỏng') => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body });

const LLM = [['/api/suggest', 'suggest'], ['/api/describe', 'describe'], ['/api/classify', 'classify'], ['/api/search?mode=match', 'match']];
try {
  for (const [p, name] of LLM) {
    const none = await post(p);
    check(`${name}: không token → vào handler, không 401/503`, ![401, 403, 503].includes(none.status), String(none.status));
    check(`${name}: có header X-Access-Mode=public-llm`, none.headers.get('x-access-mode') === 'public-llm');
    const wrong = await post(p, { authorization: 'Bearer YOUR_TOKEN' });
    check(`${name}: token SAI/placeholder cũng không bị 401`, wrong.status !== 401, String(wrong.status));
    const good = await post(p, { authorization: 'Bearer llm-test-token' });
    check(`${name}: token đúng vẫn dùng được`, ![401, 403, 503].includes(good.status), String(good.status));
  }

  // Lượt thứ N không bị chặn: gọi liên tiếp 30 lượt không token, không có 429.
  let blocked = 0;
  for (let i = 0; i < 30; i += 1) { const r = await post('/api/suggest'); if (r.status === 429) blocked += 1; }
  check('không giới hạn lượt: 30 lượt liên tiếp, 0 lượt bị 429', blocked === 0, String(blocked));

  // Vẫn KÍN: ghi dữ liệu + quản trị
  const closedPosts = [['/api/feedback', 'feedback (ghi đĩa)'], ['/api/extract-specs', 'extract-specs'], ['/api/declaration-sheet', 'declaration-sheet'], ['/api/tariff?op=activate', 'tariff activate (sửa biểu thuế)']];
  for (const [p, why] of closedPosts) {
    const r = await post(p);
    check(`vẫn KÍN: ${why}`, [401, 403, 404, 405].includes(r.status) && r.status !== 200, String(r.status));
  }
  for (const resource of ['admin_overview', 'admin_audit', 'kpi', 'error_log', 'oz_precedents', 'trademark']) {
    const r = await fetch(`${base}/api/dataset?resource=${resource}`);
    check(`vẫn KÍN: dataset?resource=${resource}`, r.status === 401, String(r.status));
  }

  // Công tắc khẩn cấp
  process.env.HS_PUBLIC_LLM = 'false';
  check('HS_PUBLIC_LLM=false → publicLlmEnabled() false', publicLlmEnabled() === false);
  for (const [p, name] of LLM) {
    const none = await post(p);
    check(`đóng khẩn cấp: ${name} không token → 401`, none.status === 401, String(none.status));
    const good = await post(p, { authorization: 'Bearer llm-test-token' });
    check(`đóng khẩn cấp: ${name} có token đúng vẫn dùng được`, good.status !== 401, String(good.status));
  }
  process.env.HS_PUBLIC_LLM = 'FALSE';
  check('công tắc không phân biệt hoa thường', publicLlmEnabled() === false);
  delete process.env.HS_PUBLIC_LLM;
} finally {
  server.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
