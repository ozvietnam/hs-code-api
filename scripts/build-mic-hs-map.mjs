#!/usr/bin/env node
/**
 * scripts/build-mic-hs-map.mjs
 *
 * Bước 12 (C-2) #307 — precompute `data/mic-hs-map.json` từ `data/tax.json`.
 *
 * MỤC ĐÍCH
 *   `lib/mic-signal.js` cũ tính `dong8UngVien` runtime bằng cách quét toàn bộ 11.871 khoá
 *   của `taxData` mỗi lượt (Object.keys().filter(startWith hs6).slice(0,12)). Map tĩnh thay
 *   thế bằng cache tra một lần, để mỗi lượt gọi `micSignal(hs10)` chỉ tốn O(1) tra hash.
 *
 * QUYẾT ĐỊNH THIẾT KẾ — khoá `hs6` (không phải `hs10`)
 *   Brief đề xuất khoá `hs10` (mã NCC TQ tự khai, 8–10 số). Ta chọn khoá `hs6` thay:
 *     · hs10 input TQ có phần đuôi (8–10) tuỳ ý, mang ý nghĩa quốc gia — KHÔNG stable qua
 *       các shop; cùng một hàng, shop A khai `8479899800`, shop B khai `84798999` cùng trỏ
 *       về hs6 = `847989`. Caching theo hs10 nhân đôi entry cho cùng một thực thể.
 *     · dong8UngVien phụ thuộc DUY NHẤT vào hs6 — hs6 là đơn vị tính tự nhiên.
 *     · Brief cũng mở "…hoặc sinh map cho TOÀN Bộ prefix hs6 có leaf; chọn phương án hợp lý".
 *   Khoá vẫn cho `micSignal(hs10)` tra được: `hs10.slice(0,6) → map`.
 *
 * SCHEMA
 *   {
 *     "<hs6>": {
 *       "hs4": "<heading 4 số>",
 *       "dong8UngVien": ["<hs8>", ...],   // ≤ 12 dòng lá trong tax.json (giữ nguyên giới hạn cũ)
 *       "loai": "SIGNAL"
 *     },
 *     ...
 *   }
 *
 *   KHÔNG chứa `basis`, KHÔNG chứa nhãn GIR — luật sắt: map là tín hiệu xếp hạng ứng viên,
 *   không phải căn cứ pháp lý.
 *
 * IDEMPOTENT — chạy lại nhiều lần ra cùng một kết quả. Đầu ra sort theo hs6 để diff ổn định.
 */
import fs from 'fs';
import path from 'path';

const TAX = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'tax.json'), 'utf8'));
const OUT = path.join(process.cwd(), 'data', 'mic-hs-map.json');

const MAX_DONG = 12; // giữ nguyên giới hạn của micSignal.runtime() — xem comment đó.

const groups = new Map(); // hs6 → Set(leaf8)
for (const leaf of Object.keys(TAX)) {
  if (!/^\d{8}$/.test(leaf)) continue;
  const hs6 = leaf.slice(0, 6);
  if (!groups.has(hs6)) groups.set(hs6, []);
  groups.get(hs6).push(leaf);
}

const map = {};
const sortedHs6 = [...groups.keys()].sort();
for (const hs6 of sortedHs6) {
  // Sắp xếp dòng lá theo thứ tự số học (nhất quán với cách cũ Object.keys().sort()).
  const leaves = groups.get(hs6).slice().sort().slice(0, MAX_DONG);
  map[hs6] = {
    hs4: hs6.slice(0, 4),
    dong8UngVien: leaves,
    loai: 'SIGNAL',
  };
}

const { _comment, files: _files, ...scaffold } = {};
fs.writeFileSync(OUT, JSON.stringify(map, null, 2));

const stats = { totalHs6: Object.keys(map).length, totalLeaves: Object.values(map).reduce((a, v) => a + v.dong8UngVien.length, 0) };
console.log(`Wrote ${OUT} — ${stats.totalHs6} hs6 prefixes, ${stats.totalLeaves} leaf entries total (cap ${MAX_DONG}/prefix)`);
