#!/usr/bin/env node
// #239 goal 2+3: /api/health (ozGoldStats) KHÔNG đọc lại tệp 2,6 MB mỗi lần;
// cache GOLD nạp lại theo mtime/size (không theo đồng hồ 5 phút).
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ozgold-'));
const goldPath = path.join(dir, 'oz-gold-final.jsonl');
fs.writeFileSync(goldPath, '{"hsCode":"84137090","tenHang":"bom","ozCount":3}\n{"hsCode":"85171300","tenHang":"dien thoai","ozCount":5}\n');
process.env.OZ_GOLD_PATH = goldPath;
delete process.env.OZ_GOLD_BLOB_URL;

const oz = require('../lib/oz-precedent-search.js');

let passed = 0;
let failed = 0;
const assert = (n, c, d) => { if (c) { passed += 1; console.log('PASS', n); } else { failed += 1; console.log('FAIL', n, d != null ? '→ ' + d : ''); } };

// Spy readFileSync trên đúng tệp gold
let reads = 0;
const realRead = fs.readFileSync;
fs.readFileSync = function (p, ...a) { if (String(p) === goldPath) reads += 1; return realRead.call(this, p, ...a); };

// 1) đếm đúng + 10 lần health sau đó không đọc lại
const s1 = oz.ozGoldStats();
assert('ozGoldStats đếm đúng 2 dòng', s1.records === 2 && s1.ok === true, JSON.stringify(s1));
const afterFirst = reads;
for (let i = 0; i < 10; i++) oz.ozGoldStats();
assert('10 lần health sau đó KHÔNG đọc lại tệp', reads === afterFirst, `reads=${reads}, afterFirst=${afterFirst}`);

// 2) cache ấm (qua searchOzByHs) → health đếm từ RAM, không đọc đĩa
await oz.searchOzByHs('84137090');
const beforeWarm = reads;
oz.ozGoldStats();
assert('health khi cache ấm không đọc tệp', reads === beforeWarm, `reads=${reads}`);

// 3) tệp ĐỔI (ghi nội dung mới) → lượt tra sau nạp lại
await new Promise((r) => setTimeout(r, 10));
fs.writeFileSync(goldPath, '{"hsCode":"84137090","tenHang":"bom","ozCount":3}\n'); // chỉ còn 1 dòng
const r1 = await oz.searchOzByHs('85171300');
assert('tệp đổi → nạp lại (mã 85171300 biến mất)', r1.distinctProducts === 0, JSON.stringify(r1));

// 4) tệp KHÔNG đổi → không nạp lại (không đọc thêm)
const beforeNoChange = reads;
await oz.searchOzByHs('84137090');
assert('tệp không đổi → không đọc lại', reads === beforeNoChange, `reads=${reads}, before=${beforeNoChange}`);

fs.readFileSync = realRead;
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
