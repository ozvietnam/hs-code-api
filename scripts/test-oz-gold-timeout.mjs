// #325 — fetch kho gold treo (socket mở nhưng không trả) → ensureCache phải từ chối SỚM theo timeout,
// không treo lượt classify. Fetch giả tôn trọng signal (giống Node fetch thật khi bị abort).
import './test-isolate-data.mjs';
import { createRequire } from 'module';
process.env.OZ_GOLD_BLOB_URL = 'https://blob.example.test/gold.jsonl';
process.env.GOLD_BLOB_TIMEOUT_MS = '40';
const t0 = Date.now();
const realFetch = globalThis.fetch;
globalThis.fetch = (url, opts) => new Promise((_, rej) => {
  opts?.signal?.addEventListener('abort', () => rej(Object.assign(new Error('This operation was aborted'), { name: 'AbortError' })));
});
const keepAlive = setInterval(() => {}, 1000); // AbortSignal.timeout không giữ event loop — giữ hộ
let passed = 0, failed = 0;
const check = (n, c, x = '') => { if (c) { passed += 1; console.log(`PASS ${n}`); } else { failed += 1; console.log(`FAIL ${n} ${x}`); } };
try {
  const { searchOzByKeyword } = await import('../lib/oz-precedent-search.js');
  await searchOzByKeyword('trạm sạc 400kW', { topK: 3 });
  check('gold treo → ném lỗi (không trả kết quả rỗng câm lặng)', false);
} catch (e) {
  const ms = Date.now() - t0;
  check('gold treo → lỗi có cấu trúc trong ~2 lần thử + backoff (< 8 s)', /Blob gold/.test(String(e.message)), String(e.message).slice(0, 100));
  check('từ chối SỚM — không treo kiểu keepalive 90 s', ms < 8000, `${ms}ms`);
} finally { clearInterval(keepAlive); globalThis.fetch = realFetch; }
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
