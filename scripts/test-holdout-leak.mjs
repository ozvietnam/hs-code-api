#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Chấm điểm không được "học thuộc đề": khi HS_EVAL_EXCLUDE_HOLDOUT=1, kho tiền
 * lệ oz-gold không được trả về chính bản ghi thuộc tập giữ riêng.
 */
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { isHeldOut, holdoutKey } = require('../lib/holdout.js');

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };

const gold = fs.readFileSync('data/oz-gold-final.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const held = gold.filter((g) => isHeldOut(g)).slice(0, 15);
check('tập giữ riêng ~15%', Math.abs(gold.filter((g) => isHeldOut(g)).length / gold.length - 0.15) < 0.02);

process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
const { searchOzByKeyword } = require('../lib/oz-precedent-search.js');
let leaked = 0;
for (const g of held) {
  const res = await searchOzByKeyword(g.tenHang, { limit: 20 });
  if (res.items.some((it) => holdoutKey({ hsCode: it.hsCode, tenHang: it.tenHang }) === holdoutKey(g))) leaked += 1;
}
check(`chấm điểm: 0/${held.length} mẫu giữ riêng tự tìm thấy chính nó`, leaked === 0, { leaked });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
