#!/usr/bin/env node
/**
 * scripts/check-ngoai-le-sau-trich.mjs — dò "NGOẠI LỆ NGAY SAU CÂU TRÍCH".
 *
 *   node scripts/check-ngoai-le-sau-trich.mjs [nhom ...]   (mặc định: mọi nhóm trong tmp/so-tay/raw)
 *
 * Với mỗi câu trích: lấy vị trí KẾT THÚC mảnh cuối trong khối nguồn, đọc phần đi tiếp sau đó;
 * nếu mở đầu bằng dấu hiệu ngoại lệ ("Tuy nhiên", "Trừ", "nhưng loại trừ", "với điều kiện",
 * "không kể", "loại trừ", "chỉ áp dụng") ⇒ câu trích DỪNG TRƯỚC ngoại lệ (lớp lỗi SOAT-LO).
 *
 * Script CHỈ báo cáo — người soát tự quyết định.
 *
 * Với mỗi câu trích: lấy vị trí KẾT THÚC mảnh cuối trong khối nguồn, rồi đọc 150 ký tự
 * đầu tiên SAU đó. Nếu mở đầu bằng dấu hiệu ngoại lệ ("Tuy nhiên", "Trừ", "nhưng loại trừ",
 * "với điều kiện", "không kể", "loại trừ", "chỉ áp dụng") ⇒ câu trích DỪNG TRƯỚC ngoại lệ.
 *
 * Ghi chú: mọi mẫu chữ tiếng Việt trong tệp này viết bằng \uXXXX để không bị méo dấu.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const RAW_DIR = path.join(ROOT, 'tmp/so-tay/raw');
const SRC_DIR = path.join(ROOT, 'tmp/so-tay/nguon');

/* Dấu hiệu mở đầu ngoại lệ (dùng sau dấu câu hoặc ngay đầu câu). */
const DAU = '(?:tuy nhiên|trừ khi|trừ|nhưng|với điều kiện|không kể|loại trừ|chỉ áp dụng)';
const DAU_RE = new RegExp('^[\\s,.;:()]*' + DAU, 'i');

function readSource(nhom) {
  const file = path.join(SRC_DIR, `${nhom}.txt`);
  if (!fs.existsSync(file)) return null;
  const blocks = {};
  let cur = null;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\[([a-z0-9.]+)\]$/i);
    if (m) { cur = m[1]; blocks[cur] = []; continue; }
    if (cur) blocks[cur].push(line);
  }
  for (const k of Object.keys(blocks)) blocks[k] = blocks[k].join('\n');
  return blocks;
}

function quoteFields(obj) {
  const out = [];
  if (obj.phamVi?.trich) out.push(['phamVi', obj.phamVi.trich, obj.phamVi.nguon]);
  if (obj.boPhan?.trich) out.push(['boPhan', obj.boPhan.trich, obj.boPhan.nguon]);
  (obj.dieuKienVao || []).forEach((d, i) => out.push([`dieuKienVao[${i}]`, d.trich, d.nguon]));
  (obj.loaiTru || []).forEach((d, i) => out.push([`loaiTru[${i}]`, d.trich, d.nguon]));
  (obj.phanBiet || []).forEach((d, i) => out.push([`phanBiet[${i}]`, d.trich, d.nguon]));
  (obj.tieuChi6 || []).forEach((d, i) => out.push([`tieuChi6[${i}]`, d.trich, d.nguon]));
  (obj.dong8 || []).forEach((d, i) => out.push([`dong8[${i}]`, d.trich, d.nguon]));
  (obj.cay?.tenDien || []).forEach((d, i) => out.push([`cay.tenDien[${i}]`, d.trich, d.nguon]));
  return out;
}

const args = process.argv.slice(2);
const nhomList = args.length ? args
  : fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));

let tong = 0;
for (const nhom of nhomList) {
  const rawFile = path.join(RAW_DIR, `${nhom}.json`);
  if (!fs.existsSync(rawFile)) continue;
  const blocks = readSource(nhom);
  if (!blocks) continue;
  const obj = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
  const out = [];
  for (const [label, trich, nguon] of quoteFields(obj)) {
    const t = String(trich || '');
    if (!t) continue;
    const blk = blocks[nguon] || '';
    const parts = t.split('…').map((s) => s.trim()).filter((s) => s.length >= 6);
    const last = parts[parts.length - 1];
    const p = blk.indexOf(last);
    if (p < 0) { out.push(`❖ ${label}: khong tim thay mang cuoi`); continue; }
    const sau = blk.slice(p + last.length).replace(/\s+/g, ' ').trim().slice(0, 150);
    const m = sau.match(DAU_RE);
    if (m) {
      out.push(`⚠ NGOAI-LE-NGAY-SAU  ${label} (${nguon})`);
      out.push(`   trich ends: ...${last.slice(-70)}`);
      out.push(`   SAU        : ${sau}`);
      out.push(`   dau       : "${m[0].trim()}"`);
    }
  }
  if (out.length) { console.log(`\n=== ${nhom} — ${out.length} dòng ===`); console.log(out.join('\n')); }
  tong += out.length;
}
console.log(`\nTong dong: ${tong}`);
