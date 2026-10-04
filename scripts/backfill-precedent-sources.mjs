#!/usr/bin/env node
/**
 * Bổ sung link nguồn + ngày ban hành cho data/precedents.json. Chỉ ĐIỀN chỗ trống, không ghi đè.
 *
 *   1. Tiền lệ gộp từ data/community/tb-tchq/*.json → lấy source.url / source.issuedDate của
 *      đúng bản ghi gốc (cùng tệp, cùng số hiệu, cùng mã, cùng mô tả).
 *   2. --tvpl-csv <tệp>: danh sách URL thuvienphapluat (cột 2 = URL), vd bản xuất của sheet
 *      "URL_TB-TCHQ" CEO gửi 04/10/2026 → điền sourceUrl cho tiền lệ chưa có link, khớp theo
 *      số thông báo + năm (năm lấy từ đường dẫn; không có năm thì bỏ — số TB lặp lại mỗi năm).
 *
 *   node scripts/backfill-precedent-sources.mjs [--tvpl-csv urls.csv] [--data-dir DIR] [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const DRY = args.includes('--dry-run');
const dataDir = arg('--data-dir') || join(root, 'data');
const communityDir = arg('--community-dir') || join(root, 'data', 'community', 'tb-tchq');
const csvPath = arg('--tvpl-csv');

const precedentsPath = join(dataDir, 'precedents.json');
const precedents = JSON.parse(readFileSync(precedentsPath, 'utf8'));
const normRef = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');
const stats = { fromCommunity: 0, fromTvpl: 0, tvplUrls: 0 };

// 1. Từ tệp community gốc.
const byFile = new Map();
if (existsSync(communityDir)) {
  for (const name of readdirSync(communityDir).filter((n) => n.endsWith('.json'))) {
    const doc = JSON.parse(readFileSync(join(communityDir, name), 'utf8'));
    const idx = new Map();
    for (const r of doc.records || []) idx.set(`${normRef(r.source?.reference)}|${r.hsCode}|${r.description}`, r.source || {});
    byFile.set(`community:tb-tchq/${name}`, idx);
  }
}
for (const [hs, list] of Object.entries(precedents)) {
  for (const p of list) {
    const src = byFile.get(p.sourceFile)?.get(`${normRef(p.tbTchqNumber)}|${hs}|${p.productName}`);
    if (!src) continue;
    let touched = false;
    if (!p.issuedDate && src.issuedDate) { p.issuedDate = src.issuedDate; touched = true; }
    if (!p.sourceUrl && src.url) { p.sourceUrl = src.url; touched = true; }
    if (touched) stats.fromCommunity += 1;
  }
}

// 2. Từ danh sách URL thuvienphapluat.
export function tvplKey(url) {
  const u = String(url || '').trim().split('?')[0];
  const m = u.match(/Tho?n?g?-bao-(\d+)-TB-?TCHQ-?(.*?)-?(\d{5,7})\.aspx$/i);
  if (!m) return null;
  const y = m[2].match(/(?:^|-|TCHQ)(?:nam-)?(20[12]\d)(?=-|$)/) || u.match(/TCHQ(20[12]\d)/);
  return y ? `${m[1]}/TB-TCHQ|${y[1]}` : null;
}

if (csvPath) {
  const urls = new Map();
  for (const line of readFileSync(csvPath, 'utf8').split(/\r?\n/)) {
    const url = (line.match(/https?:\/\/thuvienphapluat\.vn\/[^,"\s]+/) || [])[0];
    const k = url && tvplKey(url);
    if (k && !urls.has(k)) urls.set(k, url.split('?')[0]);
  }
  stats.tvplUrls = urls.size;
  for (const list of Object.values(precedents)) {
    for (const p of list) {
      if (p.sourceUrl || !p.year) continue;
      const url = urls.get(`${normRef(p.tbTchqNumber)}|${p.year}`);
      if (url) { p.sourceUrl = url; stats.fromTvpl += 1; }
    }
  }
}

if (!DRY && (stats.fromCommunity || stats.fromTvpl)) {
  writeFileSync(precedentsPath, JSON.stringify(precedents, null, 2) + '\n');
}
console.log(JSON.stringify({ dryRun: DRY, ...stats }, null, 2));
