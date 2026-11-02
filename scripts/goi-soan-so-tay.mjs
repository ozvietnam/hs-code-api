#!/usr/bin/env node
/**
 * scripts/goi-soan-so-tay.mjs — xuất GÓI SOẠN cho một nhóm 4 số: toàn bộ nguồn NGUYÊN VĂN
 * mà người/agent soạn sổ tay được phép trích (đúng bộ máy kiểm lib/so-tay.js sourcesFor),
 * kèm danh sách dòng 8 số phải phủ + cây nhóm. Dùng cho thợ ngoài (Google Studio) và
 * cho chính ta khi giao việc.
 *
 * Cách dùng: node scripts/goi-soan-so-tay.mjs --nhom=9701 [--out=docs/giao-viec/so-tay/goi-tho-ngoai/goi-soan]
 * Gói: { nhom, sinhLuc, nguon: {<mã nguồn>: <văn bản nguyên văn>}, dong8, cay }
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { sourcesFor } = require('../lib/so-tay.js');
const { taxData } = require('../lib/data.js');
const T = require('../lib/hs-tree.js');

const argNhom = process.argv.find((a) => a.startsWith('--nhom='));
const argOut = process.argv.find((a) => a.startsWith('--out='));
if (!argNhom) {
  console.error('Cần --nhom=<4 số> (vd --nhom=9701). Nhiều nhóm: --nhom=9701,9702');
  process.exit(2);
}
const nhoms = argNhom.slice(7).split(',').map((s) => s.replace(/\D/g, '')).filter((s) => s.length === 4);
const outDir = path.join(ROOT, argOut ? argOut.slice(6) : 'docs/giao-viec/so-tay/goi-tho-ngoai/goi-soan');
fs.mkdirSync(outDir, { recursive: true });

for (const h4 of nhoms) {
  const nguon = sourcesFor(h4);
  const dong8 = Object.values(taxData)
    .filter((r) => String(r.hs).startsWith(h4) && String(r.hs).length === 8)
    .map((r) => ({ hs: String(r.hs), tenVi: r.vn }));
  const cay = typeof T.cayNhom === 'function' ? T.cayNhom(h4) : (T.treeOf ? T.treeOf(h4) : null);
  const pack = {
    nhom: h4,
    sinhLuc: new Date().toISOString(),
    huongDan: 'MỌI câu `trich` trong bản nháp PHẢI là chuỗi con NGUYÊN VĂN của đúng nguồn `nguon` tương ứng trong gói này. Nguồn ngoài gói bị máy loại.',
    nguon,
    dong8,
    ...(cay ? { cay } : {}),
  };
  const f = path.join(outDir, `${h4}.json`);
  fs.writeFileSync(f, JSON.stringify(pack, null, 1) + '\n');
  console.log(`${h4}: ${Object.keys(nguon).length} nguồn, ${dong8.length} dòng 8 số → ${path.relative(ROOT, f)}`);
}
