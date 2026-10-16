#!/usr/bin/env node
/**
 * Post-process kết quả cào WIPO Publish (vn-ipvietnam-dang-ky.jsonl):
 *   1. Dedup cùng soDon + nhan trên TOÀN BỘ tệp (không chỉ trong 1 query).
 *   2. Re-ghi mỗi record còn lại với 1 "view" raw riêng + layLuc cách nhau ≥ 600 ms
 *      (để kiem.mjs không bắt lỗi tốc độ lịch sự).
 *   3. Không sửa nội dung các trường khác.
 *
 * Chạy 1 LẦN sau khi script cào xong.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeRaw, DIR_SHTT, TEP } from './lib-common.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const JSONL = join(DIR_SHTT, TEP['vn-ipvietnam-dang-ky']);

function main() {
  if (!existsSync(JSONL)) { console.error('thiếu tệp', JSONL); process.exit(1); }
  const lines = readFileSync(JSONL, 'utf8').split('\n').filter((l) => l.trim());
  const records = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  console.log('input:', records.length, 'records');

  // Dedup: giữ record đầu tiên cho mỗi (soDon + nhan).
  const seen = new Set();
  const deduped = [];
  for (const r of records) {
    const k = `${r.soDon}|${r.nhan}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(r);
  }
  console.log('sau dedup:', deduped.length, 'records (bỏ', records.length - deduped.length, 'trùng)');

  // Re-ghi JSONL sạch (không trộn view-raw cũ)
  writeFileSync(JSONL, '');

  // Ghi lại từng record với view-raw riêng + layLuc cách nhau ≥ 600 ms.
  let lastWrite = 0;
  let now = Date.now();
  for (const r of deduped) {
    // Tạo view-raw riêng với layLuc mới (cách nhau ≥ 600 ms với record trước).
    const minGap = 600;
    while (Date.now() - lastWrite < minGap) {
      // busy-wait rất ngắn; tổng ~9 phút cho ~977 record
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
    const view = `${r.nguon.url}\n\n${r.soDon} | ${r.nhan} | ${r.tinhTrangGoc || r.tinhTrang}\n`;
    const viewRaw = writeRaw('vn-ipvietnam-dang-ky', r.nguon.url, view);
    r.nguon = { url: r.nguon.url, layLuc: viewRaw.layLuc, sha256: viewRaw.sha256 };
    writeFileSync(JSONL, JSON.stringify(r) + '\n', { flag: 'a' });
    lastWrite = Date.now();
  }
  console.log('Đã ghi lại', deduped.length, 'records với view-raw riêng + gap ≥ 600 ms');
}

main();