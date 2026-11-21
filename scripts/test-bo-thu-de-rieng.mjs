#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Kiểm tra bộ thử để riêng G0-3 (scripts/dung-bo-thu-de-rieng.mjs):
 *   - Chạy lại với hạt giống 20261121 ra 3 tệp khớp TỪNG BYTE với bản đã commit.
 *   - Đúng 300 dòng de-rieng-300.jsonl (150 nhóm top 80% + 150 phần còn lại; ≤ 3 dòng / phân nhóm 6 số).
 *   - Không dòng nào trong de-rieng-300 trùng tên chuẩn hoá với dòng oz-gold ngoài danh sách loại.
 *   - Đúng 100 dòng chua-tung-khai-100.jsonl; không dòng nào có nhóm 4 số xuất hiện trong oz-gold; ≤ 2 dòng / nhóm 4 số.
 *   - Đọc khớp khuôn của công cụ đo scripts/do-phan-loai-tom-tat.mjs (không gọi AI, không mạng).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { holdoutKey } = require('../lib/holdout.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CA_DO = path.join(ROOT, 'scripts', 'ca-do');
const SCRIPT = path.join(ROOT, 'scripts', 'dung-bo-thu-de-rieng.mjs');

const text = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
const nz = (v) => String(v || '').replace(/\D/g, '');
const chuanTen = (s) => String(s || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, 'd')
  .toLowerCase()
  .replace(/[^a-z\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

let passed = 0;
let failed = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || extra === undefined ? '' : ` — ${JSON.stringify(extra).slice(0, 400)}`}`);
  if (ok) passed += 1;
  else failed += 1;
};

const taxData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tax.json'), 'utf8'));
const ozLines = fs.readFileSync(path.join(ROOT, 'data', 'oz-gold-final.jsonl'), 'utf8').split('\n').filter((l) => l.trim().length > 0);
const parseJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).map((l) => JSON.parse(l));

// ── 1. Tất định từng byte ────────────────────────────────────────────────────────────────
const tmp1 = fs.mkdtempSync(path.join(os.tmpdir(), 'g03-a-'));
const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'g03-b-'));
const files = ['de-rieng-300.jsonl', 'chua-tung-khai-100.jsonl', 'de-rieng-danh-sach-loai.json'];
try {
  execFileSync('node', [SCRIPT, `--ra=${tmp1}`], { stdio: 'pipe' });
  execFileSync('node', [SCRIPT, `--ra=${tmp2}`], { stdio: 'pipe' });
  for (const f of files) {
    const committed = fs.readFileSync(path.join(CA_DO, f));
    const gen1 = fs.readFileSync(path.join(tmp1, f));
    const gen2 = fs.readFileSync(path.join(tmp2, f));
    check(`tất định từng byte: ${f} khớp giữa 2 lượt chạy và với bản đã commit`, committed.equals(gen1) && gen1.equals(gen2), { committedLen: committed.length, gen1Len: gen1.length, gen2Len: gen2.length });
  }
} finally {
  fs.rmSync(tmp1, { recursive: true, force: true });
  fs.rmSync(tmp2, { recursive: true, force: true });
}

// ── 2. Kiếm chứng cấu trúc + phân tầng de-rieng-300.jsonl ─────────────────────────────────
const rows300 = parseJsonl(path.join(CA_DO, 'de-rieng-300.jsonl'));
const rows100 = parseJsonl(path.join(CA_DO, 'chua-tung-khai-100.jsonl'));
const danhSachLoai = JSON.parse(fs.readFileSync(path.join(CA_DO, 'de-rieng-danh-sach-loai.json'), 'utf8'));

check('de-rieng-300.jsonl có đúng 300 dòng', rows300.length === 300, rows300.length);
check('de-rieng-300: mọi dòng đủ 5 khoá khuôn + maDung 8 số còn trong biểu thuế + tenHang ≥ 2 ký tự', rows300.every((r) => (
  ['tenHang', 'chatLieu', 'congDung', 'maDung', 'nguonDong'].every((k) => k in r)
  && typeof r.tenHang === 'string' && r.tenHang.trim().length >= 2
  && /^\d{8}$/.test(r.maDung) && Boolean(taxData[r.maDung])
  && /^oz-gold:\d+$/.test(String(r.nguonDong || ''))
)));

// Tái tính tập PN6 tầng 80% trên oz-gold-final.jsonl để kiểm đối xứng độc lập
const h4Oz = new Set();
const ozRecords = [];
const pn6Counts = new Map();
let ozValidCount = 0;
for (let i = 0; i < ozLines.length; i += 1) {
  const dong = i + 1;
  const r = JSON.parse(ozLines[i]);
  const hs = nz(r.hsCode || r.hs || r.maHs);
  if (hs.length >= 4) h4Oz.add(hs.slice(0, 4));
  const ten = text(r.tenHang || r.productName || r.name);
  const nt = chuanTen(ten);
  ozRecords.push({ dong, r, hs, ten, nt });
  if (ten.length >= 2 && nt && /^\d{8}$/.test(hs) && taxData[hs]) {
    ozValidCount += 1;
    const pn6 = hs.slice(0, 6);
    pn6Counts.set(pn6, (pn6Counts.get(pn6) || 0) + 1);
  }
}
const pn6Tang80 = new Set();
let cum = 0;
for (const [pn6, c] of [...pn6Counts.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))) {
  if (cum < 0.8 * ozValidCount) { pn6Tang80.add(pn6); cum += c; }
}
const nTang80 = rows300.filter((r) => pn6Tang80.has(r.maDung.slice(0, 6))).length;
const nTang20 = rows300.filter((r) => !pn6Tang80.has(r.maDung.slice(0, 6))).length;
check('de-rieng-300: đúng 150 dòng tầng 80% + 150 dòng phần còn lại', nTang80 === 150 && nTang20 === 150, { nTang80, nTang20 });

const demPn6 = new Map();
for (const r of rows300) demPn6.set(r.maDung.slice(0, 6), (demPn6.get(r.maDung.slice(0, 6)) || 0) + 1);
const maxPn6 = Math.max(...demPn6.values());
check('de-rieng-300: mỗi phân nhóm 6 số ≤ 3 dòng', maxPn6 <= 3, maxPn6);

const norm300 = new Set(rows300.map((r) => chuanTen(r.tenHang)));
check('de-rieng-300: 300 tên chuẩn hoá phân biệt hoàn toàn', norm300.size === 300, norm300.size);

// ── 3. Chống rò rỉ sang phần còn lại của oz-gold ────────────────────────────────────────
const dongLoaiSet = new Set(danhSachLoai.dongOzGold);
const khoaHoldoutSet = new Set(danhSachLoai.khoaHoldout);
const tenChuanSet = new Set(danhSachLoai.tenChuan);

const chonCoTrongLoai = rows300.every((r) => {
  const dong = Number(String(r.nguonDong).split(':')[1]);
  const k = holdoutKey({ hsCode: r.maDung, tenHang: r.tenHang });
  return dongLoaiSet.has(dong) && khoaHoldoutSet.has(k) && tenChuanSet.has(chuanTen(r.tenHang));
});
check('danh sách loại chứa đủ 300 dòng được chọn (dongOzGold + khoaHoldout + tenChuan)', chonCoTrongLoai);

const roRiConLai = ozRecords.filter((x) => !dongLoaiSet.has(x.dong) && x.nt && (norm300.has(x.nt) || tenChuanSet.has(x.nt)));
check('0 dòng oz-gold ngoài danh sách loại trùng tên chuẩn hoá với de-rieng-300', roRiConLai.length === 0, roRiConLai.slice(0, 5));

const chuaDuocBaoGom = ozRecords.filter((x) => !khoaHoldoutSet.has(holdoutKey(x.r)) && x.nt && norm300.has(x.nt));
check('0 dòng oz-gold ngoài khoaHoldout trùng tên chuẩn hoá với de-rieng-300', chuaDuocBaoGom.length === 0, chuaDuocBaoGom.slice(0, 5));

// Ca âm tính: bộ kiểm phát hiện ngay khi có 1 dòng trùng tên bị sót khỏi danh sách loại
const dongGia = ozRecords.find((x) => dongLoaiSet.has(x.dong) && x.nt);
const loaiThieu1 = new Set(danhSachLoai.dongOzGold.filter((d) => d !== dongGia.dong));
const batThieu = ozRecords.some((x) => !loaiThieu1.has(x.dong) && norm300.has(x.nt));
check('ca âm tính: bỏ 1 dòng khỏi danh sách loại → phát hiện trùng tên chuẩn hoá ngay', batThieu === true);

// ── 4. Kiểm chứng chua-tung-khai-100.jsonl ───────────────────────────────────────────────
check('chua-tung-khai-100.jsonl có đúng 100 dòng', rows100.length === 100, rows100.length);
check('chua-tung-khai-100: đủ {tenHang, maDung, nguonDong}, maDung 8 số còn trong biểu', rows100.every((r) => (
  ['tenHang', 'maDung', 'nguonDong'].every((k) => k in r)
  && typeof r.tenHang === 'string' && r.tenHang.trim().length >= 2
  && /^\d{8}$/.test(r.maDung) && Boolean(taxData[r.maDung])
  && typeof r.nguonDong === 'string' && r.nguonDong.trim().length > 0
)));

const coTrongOz = rows100.filter((r) => h4Oz.has(r.maDung.slice(0, 4)));
check('chua-tung-khai-100: 0 dòng có nhóm 4 số xuất hiện trong oz-gold', coTrongOz.length === 0, coTrongOz.slice(0, 5));

const demH4 = new Map();
for (const r of rows100) demH4.set(r.maDung.slice(0, 4), (demH4.get(r.maDung.slice(0, 4)) || 0) + 1);
const maxH4 = Math.max(...demH4.values());
check('chua-tung-khai-100: mỗi nhóm 4 số ≤ 2 dòng', maxH4 <= 2, maxH4);

const norm100 = new Set(rows100.map((r) => chuanTen(r.tenHang)));
check('chua-tung-khai-100: 100 tên chuẩn hoá phân biệt, không trùng de-rieng-300', norm100.size === 100 && [...norm100].every((n) => !norm300.has(n)));

// ── 5. Khuôn chạy scripts/do-phan-loai-tom-tat.mjs ───────────────────────────────────────
const payloadsOk = [...rows300, ...rows100].every((c) => {
  const body = { tenHang: c.tenHang, ...(c.chatLieu ? { chatLieu: c.chatLieu } : {}), ...(c.congDung ? { congDung: c.congDung } : {}), debug: true };
  return typeof body.tenHang === 'string' && body.tenHang.trim().length >= 2 && /^\d{8}$/.test(nz(c.maDung));
});
check('cả 400 dòng hợp lệ khuôn payload của scripts/do-phan-loai-tom-tat.mjs', payloadsOk);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
