#!/usr/bin/env node
/**
 * Mọi tệp dữ liệu cấp cao trong data/ phải được khai nguồn gốc ở
 * data/SOURCES.json; builtBy phải trỏ tới script có thật.
 */
import fs from 'fs';
import { execFileSync } from 'child_process';

const tracked = execFileSync('git', ['ls-files', 'data'], { encoding: 'utf8' })
  .split('\n').filter((f) => f && f.split('/').length === 2).map((f) => f.slice(5));
const files = tracked;
const sources = JSON.parse(fs.readFileSync('data/SOURCES.json', 'utf8')).files;

let fail = 0;
const missing = files.filter((f) => !sources[f]);
const badBuilder = Object.entries(sources).filter(([, v]) => v.builtBy && !fs.existsSync(v.builtBy)).map(([k, v]) => `${k} → ${v.builtBy}`);
const noKind = Object.entries(sources).filter(([, v]) => !v.kind || !v.descriptionVi).map(([k]) => k);
for (const [name, list] of [['tệp chưa khai nguồn trong data/SOURCES.json', missing], ['builtBy trỏ tới script không tồn tại', badBuilder], ['mục thiếu kind/descriptionVi', noKind]]) {
  console.log(`${list.length ? 'FAIL' : 'PASS'} ${name}${list.length ? ': ' + list.join(', ') : ''}`);
  if (list.length) fail += 1;
}
process.exit(fail ? 1 : 0);
