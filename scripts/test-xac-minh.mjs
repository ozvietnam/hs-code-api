// lib/xac-minh-nguon.js — máy mở nguồn kiểm chứng (#334). Fetch giả, không mạng.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { xacMinh, xacMinhNhieu, urlAnToan } = require('../lib/xac-minh-nguon.js');

let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n} ${x}`); } };

// ── URL an toàn ──
check('SSRF: localhost/IP nội bộ bị chặn', urlAnToan('http://127.0.0.1/x') === null && urlAnToan('http://192.168.1.5/x') === null);
check('URL hợp lệ qua', urlAnToan('https://mbraun.com/product') !== null);

// ── fetch giả ──
const fakeOk = async (url) => ({ ok: true, status: 200, arrayBuffer: async () => Buffer.from('<html>MBraun MB-200MOD Universal Glovebox with gas purification</html>') });
const fake404 = async () => ({ ok: false, status: 404, arrayBuffer: async () => Buffer.from('') });
const fakeHang = (url, opts) => new Promise((_, rej) => opts?.signal?.addEventListener('abort', () => rej(new Error('timeout'))));

const keepAlive = setInterval(() => {}, 1000); // AbortSignal.timeout không giữ event loop

// ── xacMinh 1 nguồn ──
const r1 = await xacMinh({ url: 'https://mbraun.com/x', trich: 'MB-200MOD Universal Glovebox' }, 'MB-200MOD', fakeOk);
check('nguồn 200 + trích có mặt → moDuoc + trichCoMat', r1.moDuoc === true && r1.trichCoMat === true);
check('có snapshotHash (sha256)', /^[0-9a-f]{64}$/.test(r1.snapshotHash || ''));
check('model có mặt trong nội dung', r1.modelCoMat === true);

const r2 = await xacMinh({ url: 'https://dead.example.com/x', trich: 'whatever' }, '', fake404);
check('nguồn 404 → moDuoc=false + lỗi', r2.moDuoc === false && r2.maTrang === 404);

const r3 = await xacMinh({ url: 'https://slow.example.com/x' }, '', fakeHang);
check('nguồn treo → lỗi timeout', r3.moDuoc === false && /timeout|abort/i.test(r3.loi || ''));

const r4 = await xacMinh({ url: 'http://192.168.1.5/admin' }, '', fakeOk);
check('SSRF bị chặn tại xacMinh', r4.moDuoc === false && /SSRF/i.test(r4.loi || ''));

// ── xacMinhNhieu: gán nhãn kết quả ──
const ds = [
  { url: 'https://a.example.com/x', trich: 'MB-200MOD Glovebox' },
  { url: 'https://b.example.com/y', trich: 'not found text' },
  { url: 'https://c.example.com/z' }, // không có trích
];
const fetchMulti = async (url) => {
  if (url.includes('a.example')) return { ok: true, status: 200, arrayBuffer: async () => Buffer.from('MB-200MOD Glovebox here') };
  if (url.includes('b.example')) return { ok: true, status: 200, arrayBuffer: async () => Buffer.from('totally different content') };
  return { ok: true, status: 200, arrayBuffer: async () => Buffer.from('nothing relevant') };
};
const nhieu = await xacMinhNhieu(ds, 'MB-200MOD', fetchMulti);
check('3 nguồn → 3 kết quả', nhieu.length === 3);
check('nguồn A (trích đúng) → xacMinhOk=true', nhieu[0]?.xacMinhOk === true);
check('nguồn B (trích không có) → xacMinhOk=false', nhieu[1]?.xacMinhOk === false);
check('nguồn C (không trích, không model match) → xacMinhOk=false', nhieu[2]?.xacMinhOk === false);

clearInterval(keepAlive);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
