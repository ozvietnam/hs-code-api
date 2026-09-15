#!/usr/bin/env node
/**
 * Rút gọn data/loai-khac-index.json (7,6 MB) thành data/hs-context.json (~1 MB)
 * để tầng tìm kiếm nạp được mà không thổi bay cold start của serverless.
 *
 * VÌ SAO:
 * 3.383 mã có tên chứa "Loại khác" — 25,7% biểu thuế có tên ĐÚNG BẰNG ba chữ đó.
 * Tra theo lời văn dòng đó thì vô vọng. Nhưng loai-khac-index đã có sẵn câu
 * "Lưu ý phân biệt" mô tả đúng phạm vi thật của mã (ví dụ 72254090: "Thép hợp
 * kim khác (không phải không gỉ), dạng cuộn dẹt, chiều rộng ≥ 600mm"). File này
 * bóc riêng câu đó + tên các mã anh em bị loại trừ, bỏ hết phần còn lại.
 *
 * KHÔNG tự sinh chữ mới: chỉ cắt từ văn bản đã có trong repo.
 *
 * Chạy: npm run data:build-context
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'data', 'loai-khac-index.json');
const OUT = join(ROOT, 'data', 'hs-context.json');

const MAX_NOTE = 400;
const MAX_SIBLINGS = 6;
const MAX_SIBLING_LEN = 70;

/** Lấy câu mô tả phạm vi thật của mã dư. Ưu tiên "Lưu ý phân biệt". */
function extractNote(en) {
  const text = String(en || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  const marker = text.indexOf('Lưu ý phân biệt');
  if (marker >= 0) {
    return text.slice(marker + 'Lưu ý phân biệt'.length).replace(/^[:\s]+/, '').slice(0, MAX_NOTE).trim();
  }

  // Không có "Lưu ý phân biệt" → lấy đoạn giữa phần liệt kê phạm vi, bỏ phần
  // "Chỉ áp dụng mã ... khi hàng không thuộc" (đã nằm trong danh sách anh em).
  const start = text.indexOf('bao gồm hàng hóa thuộc');
  const stop = text.indexOf('Chỉ áp dụng mã');
  if (start >= 0) {
    const end = stop > start ? stop : text.length;
    return text.slice(start + 'bao gồm hàng hóa thuộc'.length, end).replace(/^[:\s]+/, '').slice(0, MAX_NOTE).trim();
  }
  return text.slice(0, MAX_NOTE).trim();
}

function cleanSibling(v) {
  return String(v || '')
    .replace(/^[-\s]+/, '')
    .replace(/\s*\(SEN\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SIBLING_LEN);
}

const index = JSON.parse(readFileSync(SRC, 'utf8'));
const context = {};
let withNote = 0;

for (const [hs, rec] of Object.entries(index)) {
  const note = extractNote(rec.en);
  const siblings = (rec.s || [])
    .map((s) => cleanSibling(s.v))
    .filter(Boolean)
    .slice(0, MAX_SIBLINGS);
  if (!note && !siblings.length) continue;
  if (note) withNote++;
  context[hs] = { d: note, x: siblings };
}

const payload = {
  meta: {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: 'data/loai-khac-index.json',
    note: 'Rút gọn để tầng search nạp được. Chỉ cắt văn bản có sẵn, không sinh chữ mới.',
    codes: Object.keys(context).length,
    withNote,
  },
  context,
};

writeFileSync(OUT, JSON.stringify(payload) + '\n');
console.log(`Đã ghi ${OUT}`);
console.log(`  ${payload.meta.codes} mã, ${withNote} mã có câu phân biệt`);
