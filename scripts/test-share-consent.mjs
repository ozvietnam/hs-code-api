// lib/share-consent.js + các chỗ ghi log tôn trọng cờ chia sẻ (#261). Test đơn vị + tích hợp stdout.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { doiTuRequest, runWithConsent, isChiaSe, maLuotHienTai, mlLogDuocPhep, cheUrl } = require('../lib/share-consent.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };

// ── đơn vị: cờ + che URL ──
check('header 1 → đồng ý', doiTuRequest({ headers: { 'x-oz-chia-se': '1', 'x-oz-ma-luot': 'L-77' } }).chiaSe === true);
check('header 0 → không đồng ý', doiTuRequest({ headers: { 'x-oz-chia-se': '0' } }).chiaSe === false);
check('thiếu header → mặc định KHÔNG đồng ý', doiTuRequest({ headers: {} }).chiaSe === false);
check('mã lượt đọc + cắt 40 ký tự', doiTuRequest({ headers: { 'x-oz-chia-se': '1', 'x-oz-ma-luot': 'x'.repeat(60) } }).maLuot.length === 40);
check('che q/mota/description giữ tham số khác', cheUrl('/api/search?q=cao+su&limit=5&hs=84').includes('q=độ dài 6') && cheUrl('/api/search?q=cao+su&limit=5').includes('limit=5'));
check('URL decode %20 vẫn tính đúng độ dài', cheUrl('/api/dataset?resource=precedents&q=hop%20gang').includes('độ dài 8'));
check('không có query → nguyên; không che hs/limit', cheUrl('/api/tax?hs=85171300') === '/api/tax?hs=85171300');
check('ngoài ngữ cảnh (script CLI) → mặc định đồng ý để công cụ nội bộ chạy', isChiaSe() === true && mlLogDuocPhep() === true);

// ── ALS writer: ml-log + access-log ──
const { appendSuggestLog } = require('../lib/ml-log.js');
const { appendAccess, readAccessRecords } = require('../lib/access-log.js');
const { WRITE_DIR } = require('../lib/data-paths.js');
const ML = join(WRITE_DIR, 'ml-log.jsonl');
runWithConsent({ chiaSe: false }, () => { appendSuggestLog({ description: 'mô tả bí mật của khách', top1Hs: '84145199', ms: 5 }); });
check('không đồng ý → ml-log KHÔNG ghi dòng', !existsSync(ML), existsSync(ML) ? readFileSync(ML, 'utf8') : '');
runWithConsent({ chiaSe: true, maLuot: 'L-9' }, () => {
  check('trong ngữ cảnh đồng ý → isChiaSe + maLuot đọc được', isChiaSe() === true && maLuotHienTai() === 'L-9');
  appendSuggestLog({ description: 'mẫu đồng ý chia sẻ', top1Hs: '84145199', ms: 7 });
});
check('đồng ý → ml-log ghi + kèm maLuot', existsSync(ML) && JSON.parse(readFileSync(ML, 'utf8').trim().split('\n').pop()).maLuot === 'L-9');
runWithConsent({ chiaSe: false }, () => { appendAccess({ route: '/api/search', ms: 12, querySnippet: 'túi zipper bạc', hsCode: '42023290' }); });
runWithConsent({ chiaSe: true, maLuot: 'L-3' }, () => { appendAccess({ route: '/api/search', ms: 9, querySnippet: 'túi zip giữ nhiệt', hsCode: '42023290' }); });
const rows = readAccessRecords();
const from = rows.find((r) => r.querySnippet === 'túi zipper bạc'); // ghi bên NGOÀI runWithConsent? — tìm theo snippet không cần
const no = rows.find((r) => !('querySnippet' in r) && r.route === '/api/search' && r.ms === 12);
const yes = rows.find((r) => r.ms === 9);
check('access-log: từ chối → bỏ querySnippet, vẫn giữ hsCode/route', !!no && no.hsCode === '42023290' && !('querySnippet' in no), JSON.stringify(no || {}));
check('access-log: đồng ý → giữ snippet + maLuot', yes?.querySnippet === 'túi zip giữ nhiệt' && yes?.maLuot === 'L-3', JSON.stringify(yes || {}));

// ── tích hợp stdout: server.js log URL đã che khi không đồng ý ──
process.env.HS_API_TOKEN = 'consent-test-token';
delete process.env.HS_ACCESS_LOG; // bật log stdout như prod
const { createServer } = require('../server.js');
const saved = console.log; let out = [];
console.log = (...a) => out.push(a.join(' '));
const server = createServer();
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}`;
const mo = 'găng tay cao su y tế không bột size 8';
try {
  await fetch(`${base}/api/search?q=${encodeURIComponent(mo)}`, { headers: { authorization: 'Bearer consent-test-token', 'x-oz-chia-se': '0' } });
  await fetch(`${base}/api/search?q=${encodeURIComponent(mo)}`, { headers: { authorization: 'Bearer consent-test-token', 'x-oz-chia-se': '1', 'x-oz-ma-luot': 'L-1' } });
} finally { console.log = saved; server.close(); }
const searchLines = out.filter((l) => l.includes('/api/search?q='));
check('stdout: đúng 2 dòng search được ghi', searchLines.length === 2, JSON.stringify(searchLines));
check('stdout: lượt từ chối → không chứa mô tả hàng, có "độ dài"', !searchLines[0].includes(encodeURIComponent(mo)) && !searchLines[0].includes(mo) && searchLines[0].includes('q=độ dài '), searchLines[0] || '');
check('stdout: lượt đồng ý → giữ nguyên URL (hành vi cũ)', searchLines[1].includes(encodeURIComponent(mo)), searchLines[1] || '');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
