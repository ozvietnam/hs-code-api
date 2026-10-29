// #538 — tra tiền lệ theo TIỀN TỐ HS (4/6 số): pad cứng 8 số của normalizeHs làm chết
// 41 key nhóm + toàn bộ lá con qua nhánh hs của /api/dataset?resource=precedents.
// Ca repro thật: nhánh 8526 (radar xuyên đất GPR) có 6 tiền lệ ở 85269190/85269200
// mà query hs=8526 trả found:false "No precedents for 85260000".
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pass = 0, fail = 0;
const check = (n, c, d = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.error(`FAIL ${n} ${d}`); } };

process.env.HS_PUBLIC_READ = 'true';
const handler = require('../api/dataset.js');
const call = async (query) => {
  const res = {
    __c: 0, __b: '',
    status(c) { this.__c = c; return this; },
    json(b) { this.__b = JSON.stringify(b); return this; },
    setHeader() { return this; },
    getHeader() { return undefined; },
  };
  const url = `/api/dataset?${new URLSearchParams(query)}`;
  await handler({ method: 'GET', url, query, headers: {} }, res);
  return { status: res.__c, body: JSON.parse(res.__b || '{}') };
};

// ── 1. Ca chính (issue repro): hs=8526 tổng hợp 2 lá, 6 tiền lệ ──
const r4 = await call({ resource: 'precedents', hs: '8526' });
check('8526: found=true + HTTP 200', r4.status === 200 && r4.body.found === true, JSON.stringify(r4.body).slice(0, 120));
check('8526: hsCode giữ tiền tố gốc (không pad thành 85260000)', r4.body.hsCode === '8526');
check('8526: prefix=true', r4.body.prefix === true);
check('8526: matchedKeys đủ 2 lá', Array.isArray(r4.body.matchedKeys) && r4.body.matchedKeys.includes('85269190') && r4.body.matchedKeys.includes('85269200'));
check('8526: total=6 tiền lệ', r4.body.total === 6, `total=${r4.body.total}`);
check('8526: mỗi item gắn tuMa lá nguồn', Array.isArray(r4.body.items) && r4.body.items.every((it) => it.tuMa === '85269190' || it.tuMa === '85269200'));

// ── 2. Key nhóm 4 số nay truy cập được (3919 = key nhóm + 3 lá) ──
const rNhom = await call({ resource: 'precedents', hs: '3919' });
check('3919 (key nhóm 4 số): found=true', rNhom.body.found === true);
check('3919: tổng hợp cả key nhóm lẫn lá', ['3919', '39191092', '39199092', '39199099'].every((k) => rNhom.body.matchedKeys?.includes(k)), JSON.stringify(rNhom.body.matchedKeys));

// ── 3. Key 6 số truy cập được: 170191 (key nhóm 2 tiền lệ + lá 17019100 1 tiền lệ) ──
const r6 = await call({ resource: 'precedents', hs: '170191' });
check('170191 (key 6 số): found=true, tổng hợp nhóm + lá = 3', r6.body.found === true && r6.body.total === 3, JSON.stringify(r6.body).slice(0, 100));
check('170191: matchedKeys gồm nhóm và lá', r6.body.matchedKeys?.includes('170191') && r6.body.matchedKeys?.includes('17019100'));
check('170191: item gắn tuMa đúng lá nguồn', r6.body.items?.every((it) => it.tuMa === '170191' || it.tuMa === '17019100'));

// ── 4. Mã 8 số: hành vi giữ nguyên ──
const r8 = await call({ resource: 'precedents', hs: '85013170' });
check('85013170 (8 số có tiền lệ): found=true, 3 items, không gắn prefix', r8.body.found === true && r8.body.total === 3 && r8.body.prefix === undefined);
check('85013170: không gắn tuMa (như cũ)', r8.body.items.every((it) => it.tuMa === undefined));

// ── 5. Không có tiền lệ: 200 + found:false (thống nhất đường q=), hsCode giữ nguyên input ──
const rKo4 = await call({ resource: 'precedents', hs: '9999' });
check('9999: found=false + hsCode giữ "9999" (không phải 99990000)', rKo4.status === 200 && rKo4.body.found === false && rKo4.body.hsCode === '9999');
const rKo8 = await call({ resource: 'precedents', hs: '99999999' });
check('99999999 (8 số không có): 200 + found=false — bỏ 404 cũ', rKo8.status === 200 && rKo8.body.found === false, `status=${rKo8.status}`);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
