#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Bench chống rò theo LƯỢT: header `X-OZ-Eval-Holdout: 1` → kho tiền lệ Oz bỏ tập giữ riêng chỉ trong lượt đó
 * (lib/holdout.js withEvalHoldout + lib/oz-precedent-search.js visible()). Không env, không ảnh hưởng lượt khác.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
delete process.env.HS_EVAL_EXCLUDE_HOLDOUT;

const H = require('../lib/holdout.js');
const oz = require('../lib/oz-precedent-search.js');
const fs = require('node:fs');

let passed = 0; let failed = 0;
const assert = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${JSON.stringify(extra).slice(0, 300)}`}`); if (ok) passed += 1; else failed += 1; };

// Một bản ghi gold THẬT thuộc tập giữ riêng, tên đủ dài để tìm theo từ khoá ra chính nó.
const gold = fs.readFileSync('data/oz-gold-final.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const held = gold.find((g) => H.isHeldOut(g) && String(g.tenHang || '').split(' ').length >= 3);
assert('có bản ghi giữ riêng để thử', Boolean(held));
const q = held.tenHang;
const key = H.holdoutKey(held);
const hit = (r) => (r.items || []).some((it) => H.holdoutKey(it) === key);

assert('wantsEvalHoldout: đọc header (chữ thường), chỉ "1"', H.wantsEvalHoldout({ headers: { 'x-oz-eval-holdout': '1' } }) === true && H.wantsEvalHoldout({ headers: { 'x-oz-eval-holdout': 'true' } }) === false && H.wantsEvalHoldout({ headers: {} }) === false && H.wantsEvalHoldout(null) === false);
assert('ngoài lượt bench: evalExcludesHoldout=false', H.evalExcludesHoldout() === false);

const normal = await oz.searchOzByKeyword(q, { limit: 50 });
assert('lượt thường: bản ghi giữ riêng vẫn tìm thấy (sản xuất dùng đủ kho)', hit(normal), { q, total: normal.total });

const bench = await H.withEvalHoldout(() => oz.searchOzByKeyword(q, { limit: 50 }));
assert('lượt bench (withEvalHoldout): bản ghi giữ riêng bị bỏ khỏi kết quả', !hit(bench), { q, total: bench.total });
const byHs = await H.withEvalHoldout(() => oz.searchOzByHs(held.hsCode, { limit: 100 }));
assert('lượt bench: tra theo mã cũng bỏ bản ghi giữ riêng', !hit(byHs));
const inside = await H.withEvalHoldout(async () => { await new Promise((r) => setTimeout(r, 3)); return H.evalExcludesHoldout(); });
assert('cờ lan qua await trong lượt, hết lượt thì tắt', inside === true && H.evalExcludesHoldout() === false);

// Hai lượt song song: lượt bench không làm lượt thường mất tiền lệ.
const [a, b] = await Promise.all([H.withEvalHoldout(() => oz.searchOzByKeyword(q, { limit: 50 })), oz.searchOzByKeyword(q, { limit: 50 })]);
assert('song song: lượt bench bỏ, lượt thường giữ', !hit(a) && hit(b));

// Handler classify: header đi vào withEvalHoldout (stub classify để không gọi LLM).
{
  process.env.HS_API_TOKEN = 't';
  const C = require('../lib/classify.js');
  let seen = null;
  const orig = C.classify;
  C.classify = async () => { seen = H.evalExcludesHoldout(); return { status: 'REVIEW', results: [] }; };
  const handler = require('../api/classify.js');
  const mk = (headers) => ({ method: 'POST', url: '/api/classify', query: {}, headers: { authorization: 'Bearer t', ...headers }, body: { tenHang: 'hàng thử' } });
  const res = () => ({ _s: 0, _j: null, setHeader() {}, getHeader() {}, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } });
  await handler(mk({ 'x-oz-eval-holdout': '1' }), res());
  const withHeader = seen;
  await handler(mk({}), res());
  assert('/api/classify: header X-OZ-Eval-Holdout: 1 → classify chạy với cờ bỏ giữ riêng; không header → không', withHeader === true && seen === false, { withHeader, seen });
  C.classify = orig;
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
