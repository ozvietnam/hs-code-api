#!/usr/bin/env node
import './test-isolate-data.mjs';
/** data/search.json phải đúng bằng bản dựng từ data/tax.json (không trùng, không thiếu). */
import fs from 'fs';
import { buildSearchIndex } from './build-search-index.mjs';

const tax = JSON.parse(fs.readFileSync('data/tax.json', 'utf8'));
const cur = JSON.parse(fs.readFileSync('data/search.json', 'utf8'));
const want = buildSearchIndex(tax);
const ok = JSON.stringify(cur) === JSON.stringify(want);
console.log(ok ? `PASS search.json khớp tax.json (${want.length} mã)` : `FAIL search.json lệch tax.json: ${cur.length} mục vs ${want.length} mã — chạy node scripts/build-search-index.mjs`);
process.exit(ok ? 0 : 1);
