#!/usr/bin/env node
/**
 * Tách các bản ghi tiền lệ trong data/community/tb-tchq/*.json có mã 8 số KHÔNG còn
 * là lá trong data/tax.json (mã theo biểu thuế cũ 2012/2017/2022) sang
 * data/community-parked/tb-tchq-bieu-thue-cu.json — nằm ngoài data/community nên
 * validate/merge không quét. CEO đối chiếu sang mã mới rồi mới đưa về.
 *
 *   node scripts/park-old-tariff-precedents.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry-run');
const tax = JSON.parse(readFileSync(join(root, 'data/tax.json'), 'utf8'));
const srcDir = join(root, 'data/community/tb-tchq');
const parkedPath = join(root, 'data/community-parked/tb-tchq-bieu-thue-cu.json');

const parked = existsSync(parkedPath)
  ? JSON.parse(readFileSync(parkedPath, 'utf8'))
  : {
      kind: 'precedent',
      contributor: { name: 'agent-tbtchq (nhiều scope)', github: 'ozvietnam' },
      license: 'CC-BY-SA-4.0',
      submittedAt: new Date().toISOString().slice(0, 10),
      note: 'ĐỂ RIÊNG, CHƯA GỘP: mã kết luận theo biểu thuế cũ (2012/2017/2022), không còn là lá trong data/tax.json hiện hành. Cần CEO đối chiếu sang mã mới rồi mới chuyển vào data/community/tb-tchq/. Thư mục này nằm ngoài data/community nên validate/merge không quét.',
      records: [],
    };
const seen = new Set(parked.records.map((r) => `${r.hsCode}::${r.source?.reference}::${String(r.description).slice(0, 40)}`));

let moved = 0;
for (const name of readdirSync(srcDir)) {
  if (!name.endsWith('.json')) continue;
  const file = join(srcDir, name);
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  if (doc.kind !== 'precedent') continue;
  const keep = [];
  for (const r of doc.records || []) {
    const hs = String(r.hsCode || '');
    if (hs.length === 8 && !tax[hs]) {
      const k = `${hs}::${r.source?.reference}::${String(r.description).slice(0, 40)}`;
      if (!seen.has(k)) {
        seen.add(k);
        parked.records.push({ ...r, attributes: { ...(r.attributes || {}), tachTuTep: name } });
      }
      moved += 1;
      console.log(`  ${name}: ${hs} ${r.source?.reference} | ${String(r.description).slice(0, 60)}`);
    } else keep.push(r);
  }
  if (keep.length !== (doc.records || []).length && !DRY) {
    doc.records = keep;
    writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
  }
}
if (!DRY) {
  mkdirSync(dirname(parkedPath), { recursive: true });
  writeFileSync(parkedPath, JSON.stringify(parked, null, 2) + '\n');
}
console.log(`${DRY ? '[dry-run] ' : ''}Tách ${moved} bản ghi mã cũ → ${parkedPath.slice(root.length + 1)} (tổng ${parked.records.length})`);
