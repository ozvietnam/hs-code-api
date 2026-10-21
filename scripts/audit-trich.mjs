#!/usr/bin/env node
/**
 * scripts/audit-trich.mjs — trợ soát ĐỘC LẬP (dùng tay, không nằm trong pipeline).
 *   node scripts/audit-trich.mjs <nhom> [raw|data]
 *
 * In từng mục (phamVi / dieuKienVao / loaiTru / phanBiet / boPhan / tieuChi6 / dong8) kèm:
 *   - độ dài trich
 *   - trich có nằm NGUYÊN VĂN trong khối nguồn `nguon` không (bỏ "…" rồi so từng đoạn ≥6 ký tự)
 *   - câu NGAY SAU / TRƯỚC đoạn khớp trong nguồn (để mắt bắt lỗi "mất ngoại lệ",
 *     "cắt trích trước câu rào")
 */
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// y hệt squash() của lib/so-tay.js:152 — bỏ mọi ký tự không phải chữ/số
const squash = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const nhom = process.argv[2];
const which = process.argv[3] || 'raw';
const file = which === 'data'
  ? path.join(ROOT, 'data/so-tay', `${nhom}.json`)
  : path.join(ROOT, 'tmp/so-tay/raw', `${nhom}.json`);
const srcFile = path.join(ROOT, 'tmp/so-tay/nguon', `${nhom}.txt`);

const rawSrc = fs.readFileSync(srcFile, 'utf8');
const blocks = {};
let cur = null;
for (const line of rawSrc.split('\n')) {
  const m = line.match(/^\[([a-z0-9.]+)\]$/i);
  if (m) { cur = m[1]; blocks[cur] = []; continue; }
  if (cur && line.trim() && !line.startsWith('Soạn sổ tay')) blocks[cur].push(line);
}
for (const k of Object.keys(blocks)) blocks[k] = blocks[k].join('\n');

const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
let idx = 0;
const FLAG_WARN = [];

function fragments(trich) {
  return String(trich || '').split('…').map((s) => s.trim()).filter((s) => s.length >= 6);
}

function check(trich, nguon) {
  const b = blocks[nguon];
  if (b == null) return { ok: false, why: `KHÔNG có khối nguồn [${nguon}]` };
  const nb = squash(b);
  for (const frag of fragments(trich)) {
    if (!nb.includes(squash(frag))) {
      return { ok: false, why: `đoạn KHÔNG có trong [${nguon}]: "${frag.slice(0, 70)}…"` };
    }
  }
  // câu ngay trước / sau đoạn khớp đầu tiên — để mắt đọc ngoại lệ bị nuốt
  const first = fragments(trich)[0];
  const pos = nb.indexOf(squash(first));
  const before = nb.slice(Math.max(0, pos - 130), pos).replace(/\s+/g, ' ').trim();
  const end = pos + squash(first).length;
  const after = nb.slice(end, end + 130).replace(/\s+/g, ' ').trim();
  return { ok: true, len: String(trich).length, before, after };
}

function show(kind, it, i) {
  const r = check(it.trich, it.nguon);
  const len = String(it.trich || '').length;
  const flag = r.ok ? (len > 300 ? ' ⚠>300' : '') : ' ❌NGUYÊN VĂN SAI';
  const body = it.dieuKien ?? it.text ?? it.hoi ?? it.fact ?? it.hs ?? '';
  const idxs = i == null ? '' : `[${i}]`;
  console.log(`\n── ${kind}${idxs} (${it.nguon}) d=${len}${flag}`);
  console.log(`   NỘI DUNG: ${body}`);
  console.log(`   TRICH   : ${it.trich}`);
  if (r.ok) {
    console.log(`   ◀TRƯỚC  : …${r.before}`);
    console.log(`   SAU▶    : ${r.after}…`);
  } else {
    console.log(`   !! ${r.why}`);
    FLAG_WARN.push(`${kind}${idxs}: ${r.why}`);
  }
}

if (obj.phamVi) show('phamVi', obj.phamVi, null);
(obj.dieuKienVao || []).forEach((it, i) => show('dieuKienVao', it, i));
(obj.loaiTru || []).forEach((it, i) => show('loaiTru', it, i));
(obj.phanBiet || []).forEach((it, i) => show('phanBiet', it, i));
if (obj.boPhan) show('boPhan', obj.boPhan, null);
(obj.tieuChi6 || []).forEach((it, i) => show('tieuChi6', it, i));
(obj.dong8 || []).forEach((it, i) => show('dong8', it, i));

console.log(`\n=== ${nhom}/${which}: ${FLAG_WARN.length} câu trích KHÔNG nguyên văn ===`);