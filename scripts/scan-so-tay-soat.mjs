#!/usr/bin/env node
/**
 * scripts/scan-so-tay-soat.mjs — quét các lớp lỗi SOÁT ĐỘC LẬP mà `check-so-tay.mjs` KHÔNG bắt.
 *
 *   node scripts/scan-so-tay-soat.mjs [nhom ...]     (mặc định: mọi nhóm có trong tmp/so-tay/raw)
 *   node scripts/scan-so-tay-soat.mjs 1512 1516      (chỉ các nhóm nêu)
 *
 * Máy kiểm `check-so-tay.mjs` CHỈ chứng minh câu trích có thật trong nguồn; nó KHÔNG biết
 * câu trích CÓ NÓI ĐÚNG điều mục khẳng định, và không biết các trần của runtime. Script này
 * báo 5 lớp lỗi đã gặp lặp lại qua nhiều lô (lô 030/038/055/058/060):
 *
 *   1. TRẦN CLIP RUNTIME — `lib/so-tay-gates.js` cắt các trường trước khi đưa vào prompt:
 *      phamVi.text 220 · boPhan.tomTat 160 · loaiTru.dieuKien 55 · phanBiet.hoi 110 · dong8.dieuKien 90.
 *      Cắt giữa câu ⇒ mất kết luận của luật, hoặc tệ hơn là ĐẢO CHIỀU điều kiện loại trừ.
 *   2. TRÍCH TRONG "VÙNG IM LẶNG" — luật soạn là ≤ 300 ký tự nhưng máy chỉ chặn > 600.
 *   3. ĐOẠN LƯỚC "…" NUỐT NGOẠI LỆ — đoạn bị lược không được chứa "trừ / tuy nhiên / với điều
 *      kiện / không kể / đã hoặc chưa / tùy trường hợp".
 *   4. CÂU NGAY SAU ĐOẠN TRÍCH mở đầu bằng từ nối ngoại lệ (Tuy nhiên / Trừ / Nhưng…) mà
 *      câu trích lại dừng trước đó ⇒ mất ngoại lệ.
 *   5. GÁC SOÁT TỪ — từ trong text/dieuKien/hoi mà KHÔNG có trong khối nguồn khai báo
 *      (bắt được chữ méo mà máy kiểm không thấy).
 *
 * Script CHỈ báo cáo — không sửa gì. Người soát tự quyết định.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
// SO_TAY_RAW_DIR: chỉ định thư mục bản nháp khác (lô 064 soát dùng tmp/so-tay/raw-soat-064
// vì tmp/so-tay/raw/ là bản nháp của phiên SONG SONG, KHÔNG phải bản đã nạp).
const RAW_DIR = path.join(ROOT, process.env.SO_TAY_RAW_DIR || 'tmp/so-tay/raw');
const SRC_DIR = path.join(ROOT, 'tmp/so-tay/nguon');

/** Trần cắt của runtime (lib/so-tay-gates.js) — đổi ở đây thì đổi cả hai nơi. */
const CLIP = {
  'phamVi.text': 220, 'boPhan.tomTat': 160, 'loaiTru.dieuKien': 55,
  'phanBiet.hoi': 110, 'dong8.dieuKien': 90,
};
const RAO = /trừ\b|tuy nhiên|với điều kiện|không kể|đã hoặc chưa|ngoại lệ|trong trường hợp|tùy (?:theo )?(?:từng )?trường hợp|thường (?:nằm|thuộc|được xếp|xếp)/i;
const NOI_DUNG_SAU = /^(tuy nhiên|trừ|trừ khi|nhưng|với điều kiện|không kể|loại trừ|chỉ áp dụng)/i;

/** Bỏ dấu + đưa đ/Đ về d (NFD không xử lý được đ). */
function fold(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}
const squash = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** Đọc nguồn, tách khối theo dòng [mã nguồn]. */
function readSource(nhom) {
  const file = path.join(SRC_DIR, `${nhom}.txt`);
  if (!fs.existsSync(file)) return null;
  const blocks = {}; let cur = null;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\[([a-z0-9.]+)\]$/i);
    if (m) { cur = m[1]; blocks[cur] = []; continue; }
    if (cur) blocks[cur].push(line);
  }
  for (const k of Object.keys(blocks)) blocks[k] = blocks[k].join('\n');
  return { blocks };
}

/** Các trường do NGƯỜI viết (không phải trích nguyên văn). */
function proseFields(obj) {
  const out = [];
  if (obj.phamVi?.text) out.push(['phamVi.text', obj.phamVi.text, obj.phamVi.nguon]);
  if (obj.boPhan?.tomTat) out.push(['boPhan.tomTat', obj.boPhan.tomTat, obj.boPhan.nguon]);
  (obj.dieuKienVao || []).forEach((d, i) => out.push([`dieuKienVao[${i}].fact`, d.fact, d.nguon]));
  (obj.loaiTru || []).forEach((d, i) => out.push([`loaiTru[${i}].dieuKien`, d.dieuKien, d.nguon]));
  (obj.phanBiet || []).forEach((d, i) => out.push([`phanBiet[${i}].hoi`, d.hoi, d.nguon]));
  (obj.tieuChi6 || []).forEach((d, i) => out.push([`tieuChi6[${i}].fact`, d.fact, d.nguon]));
  (obj.dong8 || []).forEach((d, i) => out.push([`dong8[${i}].dieuKien`, d.dieuKien, d.nguon]));
  return out;
}

/** Các trường trích nguyên văn. */
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

const clipKey = (label) => label.replace(/\[\d+\]/, '');
const tokens = (s) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 2);

const nhomList = process.argv.slice(2).length
  ? process.argv.slice(2)
  : (fs.existsSync(RAW_DIR) ? fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')) : []);

let tong = 0;
for (const nhom of nhomList) {
  const rawFile = path.join(RAW_DIR, `${nhom}.json`);
  if (!fs.existsSync(rawFile)) continue;
  const src = readSource(nhom);
  if (!src) { console.log(`[${nhom}] bỏ (thiếu tmp/so-tay/nguon/${nhom}.txt)`); continue; }
  const obj = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
  const srcSquash = squash(Object.values(src.blocks).join('\n'));
  const out = [];

  for (const [label, trich, nguon] of quoteFields(obj)) {
    const t = String(trich || '');
    if (!t) continue;
    if (t.length > 300 && t.length <= 600) out.push(`⚠ VÙNG-IM-LẶNG  ${label} (${nguon}) d=${t.length}`);
    const parts = t.split('…');
    for (let i = 1; i < parts.length; i++) {
      const skipped = `${parts[i - 1].slice(-60)} ⟦⟦ ${parts[i].slice(0, 60)}`;
      if (RAO.test(skipped)) out.push(`⚠ LƯỚC-NGOẠI-LỆ  ${label}: …${skipped}…`);
    }
    const blk = src.blocks[nguon] || '';
    const first = parts[0].trim();
    if (blk && first.length > 12) {
      const pos = fold(blk).indexOf(fold(first).slice(0, 60));
      if (pos >= 0) {
        const sau = blk.slice(pos + first.length).split('\n').map((s) => s.trim()).find((s) => s.length > 3);
        if (sau && NOI_DUNG_SAU.test(sau)) out.push(`⚠ CÂU-SAU-NGOẠI-LỆ ${label}: "${sau.slice(0, 120)}"`);
      }
    }
  }

  for (const [label, val, nguon] of proseFields(obj)) {
    const tran = CLIP[clipKey(label)];
    if (tran) {
      const n = String(val || '').length;
      if (n > tran) {
        const t = String(val).replace(/\s+/g, ' ').trim();
        out.push(`⚠ TRÀN-CLIP ${label} (${nguon}) ${n} > ${tran}`);
        out.push(`         clip→ "${t.slice(0, tran)}…"`);
        out.push(`         MẤT  : "${t.slice(tran)}"`);
      }
    }
    const blk = fold(squash(src.blocks[nguon] || ''));
    const miss = [...new Set(tokens(val))].filter((w) => !blk.includes(w) && !srcSquash.includes(w));
    if (miss.length) out.push(`⚠ TỪ-NGOÀI-NGUỒN ${label} (${nguon}): ${miss.join(', ')}`);
  }

  if (out.length) {
    console.log(`\n=== ${nhom} — ${out.length} cảnh báo ===`);
    console.log(out.join('\n'));
  }
  tong += out.length;
}
console.log(`\nTổng cảnh báo: ${tong}`);
