#!/usr/bin/env node
/**
 * scripts/check-luoc-ngoai-le.mjs — dựng LẠI đoạn bị lược "…" rồi dò NGOẠI LỆ bên trong.
 *
 *   node scripts/check-luoc-ngoai-le.mjs [nhom ...]      (mặc định: mọi nhóm trong tmp/so-tay/raw)
 *
 * Máy `check-so-tay.mjs` chỉ kiểm TỪNG mảnh trích có trong nguồn; `scan-so-tay-soat.mjs` chỉ
 * soi 60 ký tự quanh dấu "…" nên bỏ sót đoạn lược DÀI. Script này dựng đúng đoạn bị lược
 * (theo vị trí thật của từng mảnh trong khối nguồn) rồi dò dấu hiệu ngoại lệ bên trong.
 *
 * Script CHỈ báo cáo — người soát tự quyết định (bài học lô 030/037/039/069).
 *
 * Cách làm: với mỗi câu trích có "…", tách thành các mảnh; với mỗi cặp mảnh liền,
 * tìm vị trí thật của mảnh trong khối nguồn và cắt ra đoạn ở GIỮA ⇒ đoạn bị lược.
 * Dò đoạn đó có chứa dấu hiệu ngoại lệ không.
 *
 * Ghi chú: mọi mẫu chữ tiếng Việt trong tệp này viết bằng \uXXXX để không bị méo dấu.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const RAW_DIR = path.join(ROOT, 'tmp/so-tay/raw');
const SRC_DIR = path.join(ROOT, 'tmp/so-tay/nguon');

/* Dấu hiệu ngoại lệ (luật lô 030 + lô 037 + lô 055/060/069). */
const RAO = [
  'trừ',                                       // trừ
  'tuy nhiên',                                 // tuy nhiên
  'với điều kiện',                  // với điều kiện
  'không kể',                              // không kể
  'không bao gồm',                    // không bao gồm
  'đã hoặc chưa',                    // đã hoặc chưa
  'ngoại lệ',                            // ngoại lệ
  'chỉ áp dụng',                     // chỉ áp dụng
  'tùy (?:theo )?(?:từng )?trường hợp',   // tùy ... trường hợp
  'thường (?:nằm|thuộc|được xếp|xếp)',        // thường ... phân loại
];
const RAO_RE = new RegExp(RAO.join('|'), 'i');

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
  if (!blocks) { console.log(`[${nhom}] thieu nguon`); continue; }
  const obj = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
  const out = [];
  for (const [label, trich, nguon] of quoteFields(obj)) {
    const t = String(trich || '');
    if (!t.includes('…')) continue;
    const blk = blocks[nguon] || '';
    const parts = t.split('…').map((s) => s.trim()).filter((s) => s.length >= 6);
    for (let i = 1; i < parts.length; i++) {
      const a = parts[i - 1];
      const b = parts[i];
      const pa = blk.indexOf(a);
      if (pa < 0) { out.push(`❖ ${label}: khong tim thay mang "${a.slice(0, 40)}"`); continue; }
      const pb = blk.indexOf(b, pa + a.length);
      if (pb < 0) { out.push(`❖ ${label}: khong tim thay mang sau "${b.slice(0, 40)}"`); continue; }
      const skipped = blk.slice(pa + a.length, pb).replace(/\s+/g, ' ').trim();
      if (!skipped) continue;
      const hit = skipped.match(RAO_RE);
      if (hit) {
        out.push(`⚠ LUOC-NGOAI-LE  ${label} (${nguon})`);
        out.push(`   truoc: ...${a.slice(-60)}`);
        out.push(`   LUOC : ${skipped.slice(0, 320)}${skipped.length > 320 ? '...' : ''}`);
        out.push(`   sau  : ${b.slice(0, 60)}...`);
        out.push(`   dau  : "${hit[0]}"`);
      } else {
        out.push(`ℹ luoc sach  ${label} (${nguon}): ${skipped.length} ký tự`);
        out.push(`   ${skipped.slice(0, 200)}${skipped.length > 200 ? '...' : ''}`);
      }
    }
  }
  if (out.length) { console.log(`\n=== ${nhom} — ${out.length} dòng ===`); console.log(out.join('\n')); }
  tong += out.length;
}
console.log(`\nTong dong: ${tong}`);
