#!/usr/bin/env node
/**
 * Khử trùng CHÉO giữa các tệp data/community/tb-tchq/*.json: cùng mã + cùng số hiệu
 * (+ cùng năm nếu cả hai có ngày) → giữ bản giàu hơn (có ngày, reasonVi dài, url
 * toàn văn), bỏ bản kia. Trong CÙNG một tệp thì không đụng (một thông báo nhiều
 * mặt hàng về cùng mã là hợp lệ).
 *
 *   node scripts/dedupe-community-precedents.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry-run');
const dir = join(root, 'data/community/tb-tchq');

const docs = new Map();
for (const name of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
  const doc = JSON.parse(readFileSync(join(dir, name), 'utf8'));
  if (doc.kind === 'precedent') docs.set(name, doc);
}

function richness(r) {
  let s = 0;
  if (r.source?.issuedDate) s += 10;
  s += Math.min(5, String(r.reasonVi || '').length / 200);
  s += Math.min(3, String(r.description || '').length / 150);
  const u = String(r.source?.url || '');
  if (/caselaw\.vn|luatvietnam\.vn|thuvienxuatnhapkhau|thutucxuatnhapkhau|hethongphapluat/.test(u)) s += 4;
  if (r.confusedWith?.length) s += 1;
  return s;
}

const byKey = new Map();
for (const [name, doc] of docs) {
  doc.records.forEach((r, i) => {
    const year = String(r.source?.issuedDate || '').slice(0, 4);
    const k = `${r.hsCode}::${String(r.source?.reference || '').replace(/\s+/g, '').toUpperCase()}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push({ name, i, year, r });
  });
}

const drop = new Map(); // name -> Set(index)
let dropped = 0;
for (const [k, list] of byKey) {
  if (list.length < 2) continue;
  // gom theo năm (không rõ năm thì gộp với mọi năm)
  const files = new Set(list.map((x) => x.name));
  if (files.size < 2) continue;
  const sorted = [...list].sort((a, b) => richness(b.r) - richness(a.r));
  const keep = sorted[0];
  for (const x of sorted.slice(1)) {
    if (x.name === keep.name) continue; // cùng tệp: để yên
    if (x.year && keep.year && x.year !== keep.year) continue; // khác năm = văn bản khác
    if (!drop.has(x.name)) drop.set(x.name, new Set());
    drop.get(x.name).add(x.i);
    dropped += 1;
    console.log(`  bỏ ${x.name}#${x.i} (${k}) — giữ ${keep.name}#${keep.i}`);
  }
}
if (!DRY) {
  for (const [name, idx] of drop) {
    const doc = docs.get(name);
    doc.records = doc.records.filter((_, i) => !idx.has(i));
    writeFileSync(join(dir, name), JSON.stringify(doc, null, 2) + '\n');
  }
}
console.log(`${DRY ? '[dry-run] ' : ''}Bỏ ${dropped} bản ghi trùng chéo tệp.`);
