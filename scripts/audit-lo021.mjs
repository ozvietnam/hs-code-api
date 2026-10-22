#!/usr/bin/env node
/**
 * scripts/audit-lo021.mjs — TẦNG MÁY của vòng soát độc lập lô 021 (PR #402).
 *
 * KHÔNG thay thế check-so-tay.mjs: script đó dùng `squash()` (bỏ HẾT dấu câu) nên
 * "- - -" với "- -", "≤ 300" với "3001"… đều lọt. Script này làm 3 việc mà CI không làm:
 *
 *   1. NGUYÊN VĂN: mỗi mảnh trích (tách theo "…"/"...") phải là substring của ĐÚNG khối
 *      nguồn khai ở `nguon`, chỉ chuẩn hoá khoảng trắng + NFC + \r\n. Sai 1 ký tự là ĐỎ.
 *   2. PHẢI SINH GÌ: in 260 ký tự nguồn NGAY SAU mảnh trích cuối → lộ ngoại lệ bị nuốt
 *      ("tuy nhiên", "trừ", "với điều kiện", "tùy từng trường hợp", "thường…").
 *   3. VÙNG MÙ: cảnh báo trích 300–600 ký tự (luật ghi ≤300) và câu mở bằng từ rào.
 *
 * Dùng: node scripts/audit-lo021.mjs [nhom,...] [--sau=<index>:<field>] [--moi=field]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(import.meta.url);
const ST = require('../lib/so-tay.js');

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const pos = args.filter((a) => !a.startsWith('--'));
const NHOM_ALL = ['6802', '6903', '7310', '7311', '7324', '7325'];
const NHOM = pos.length ? pos : NHOM_ALL;
const RAW_DIR = path.join(ROOT, 'tmp/so-tay/raw');
const KINDS_SINGLE = ['phamVi', 'boPhan'];
const KINDS_ARR = ['dieuKienVao', 'loaiTru', 'phanBiet'];

const f = (s) => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();
const RAU = /\b(tùy từng trường hợp|tùy theo|tùy|tùy từng|thường|thường được|thường là|nói chung|đại khái|thường thuộc|với điều kiện|trừ|tuy nhiên|không bao gồm|loại trừ|chỉ áp dụng|áp dụng cho)\b/i;

function items(obj) {
  const out = [];
  for (const k of KINDS_SINGLE) if (obj[k] && typeof obj[k] === 'object') out.push({ truong: k, i: null, it: obj[k] });
  for (const k of KINDS_ARR) (obj[k] || []).forEach((it, i) => out.push({ truong: k, i, it }));
  return out;
}

const C = { do: 0, sach: 0, canhBao: 0 };
const canhBao = [];
const bail = [];

for (const nhom of NHOM) {
  const fpath = path.join(RAW_DIR, `${nhom}.json`);
  if (!fs.existsSync(fpath)) { console.log(`!! ${nhom}: thiếu ${fpath}`); continue; }
  const obj = JSON.parse(fs.readFileSync(fpath, 'utf8'));
  const src = ST.sourcesFor(nhom);
  console.log(`\n${'='.repeat(100)}\nNHÓM ${nhom} — nguồn có sẵn: ${Object.keys(src).join(', ')}\n${'='.repeat(100)}`);
  for (const { truong, i, it } of items(obj)) {
    const id = `${truong}${i != null ? `[${i}]` : ''}`;
    const trich = it.trich || '';
    const goc = src[it.nguon];
    const tag = [];
    if (!goc) {
      tag.push(`!! KHÔNG CÓ KHỐI NGUỒN "${it.nguon}"`);
    } else {
      const nguonF = f(goc);
      const manh = f(trich).split(/\s*(?:…|\.\.\.)\s*/).filter((s) => s.length >= 6);
      let viTriCuoi = -1;
      for (const m of manh) {
        const p = nguonF.indexOf(m);
        if (p < 0) { tag.push(`!! MẢNH KHÔNG CÓ TRONG NGUỒN: "${m.slice(0, 110)}"`); }
        else if (p > viTriCuoi) viTriCuoi = p + m.length;
      }
      // 2. in phần nguồn ngay sau mảnh cuối — nơi ngoại lệ thường bị nuốt
      if (viTriCuoi >= 0 && viTriCuoi < nguonF.length) {
        const sau = nguonF.slice(viTriCuoi, viTriCuoi + 240);
        it.__sau = sau;
        const mRau = sau.match(RAU);
        if (mRau) tag.push(`⚠ NGUỒN NGAY SAU TRÍCH CÓ "${mRau[1]}" → "${sau.slice(0, 170)}"`);
      } else if (viTriCuoi >= nguonF.length) {
        it.__sau = '(hết nguồn)';
      }
      // 3. vùng mù 300–600 ký tự
      if (trich.length > 300 && trich.length <= 600) tag.push(`⚠ TRÍCH ${trich.length} KÝ TỰ (luật ≤300, vùng cắt lặng lẽ)`);
      if (trich.length > 600) tag.push(`⚠ TRÍCH ${trich.length} KÝ TỰ — vượt luật 600`);
      // câu mở bằng từ rào
      const mo = trich.match(/^[^A-Za-zÀ-ỹ]*\b(tùy|thường|nói chung|đại khái|tuy nhiên|chỉ|một số)\b/i);
      if (mo) tag.push(`⚠ CÂU TRÍCH MỞ BẰNG TỪ RÀO "${mo[1]}"`);
    }
    // 4. mã đích có trong câu trích?
    const tf = f(trich);
    for (const key of ['sangNhom', 'neuCo', 'neuKhong']) {
      const v = it[key];
      if (!v) continue;
      const ds = String(v).split('|');
      const tfDigits = tf.replace(/[^\d]/g, ''); // nguồn viết "nhóm 68.15" — bỏ dấu chấm
      const thieu = ds.filter((n) => {
        const c4 = String(n).replace(/\D/g, '').padStart(4, '0').slice(0, 4);
        return c4 && !tfDigits.includes(c4);
      });
      if (thieu.length) tag.push(`⚠ ${key}="${v}" — mã KHÔNG có trong câu trích: ${thieu.join('|')}`);
    }
    const nDo = tag.filter((t) => t.startsWith('!!')).length;
    C.do += nDo; // đếm MỤC: mỗi mục vào đúng một nhóm (có lỗi đỏ / chỉ cảnh báo / sạch)
    if (nDo) { /* đã cộng ở nhánh không có khối nguồn */ } else if (tag.length) C.canhBao++; else C.sach++;
    const dau = tag.length ? tag.map((t) => (t.startsWith('!!') ? '✗' : '⚠')).join('') : '✓';
    console.log(`\n${dau} ${id}`);
    console.log(`   nguon: ${it.nguon}`);
    console.log(`   trich (${trich.length}): ${trich}`);
    if (it.dieuKien) console.log(`   dieuKien: ${it.dieuKien}`);
    if (it.text) console.log(`   text: ${it.text}`);
    if (it.fact) console.log(`   fact: ${it.fact} ${it.op} ${it.value} ${it.donVi || ''}`);
    if (it.quyTac) console.log(`   quyTac: ${it.quyTac}`);
    if (it.tomTat) console.log(`   tomTat: ${it.tomTat}`);
    if (it.hoi) console.log(`   hoi: ${it.hoi}`);
    if (it.co) console.log(`   co: ${it.co}`);
    if (it.ngoaiTru?.length) it.ngoaiTru.forEach((x) => console.log(`   ngoaiTru: ${x}`));
    tag.forEach((t) => console.log(`   ${t}`));
    if (it.__sau) console.log(`   >>> NGUỒN SAU TRÍCH: ${it.__sau.slice(0, 240)}`);
    if (it.__sau && /\btùy\b|\bthường\b/i.test(it.__sau)) canhBao.push(`${nhom} ${id}`);
  }
}

console.log(`\n${'='.repeat(100)}`);
console.log(`TỔNG: ${C.do + C.canhBao + C.sach} mục — LỖI ĐỎ ${C.do}, CHỈ CẢNH BÁO ${C.canhBao}, sạch ${C.sach}`);
if (canhBao.length) console.log(`Cần đọc tay: ${canhBao.join(', ')}`);