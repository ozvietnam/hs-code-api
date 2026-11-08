#!/usr/bin/env node
/**
 * (#458) — kiểm HƯỚNG biên của mọi điều kiện số trong data/so-tay/*.json: op lưu trong dieuKienSo
 * phải cùng hướng với chữ trích của chính mục đó ("trở xuống/không quá/dưới/tối đa" ⇒ xuống,
 * "trở lên/tối thiểu/trên/ít nhất" ⇒ lên). Lỗi nguồn: bộ đọc cũ lưu "từ 2,5 cm trở xuống" thành
 * >= (9 dòng, đã sửa) — máy này chặn tái diễn khi chạy lại bộ trích hoặc sửa tay.
 *
 * Đọc biên từ `trich` bằng từ điển so sánh của lib/tu-vung.js (tv.soSanh + tv.soSanhSauMoRong):
 *   - chữ so sánh SAU số ("trở lên", "trở xuống", "以下"…) ưu tiên trước — "từ X trở xuống" là <=X
 *     dù có chữ "từ" trước số;
 *   - không có chữ sau số thì lấy chữ trước số GẦN số nhất ("trên 5 nhưng không quá 40" ⇒ <=).
 * Chỉ so HƯỚNG (lên/xuống) — ">=" với ">" cùng hướng, khác bậc khắt khe không phải lỗi lưu ngược.
 *
 * FAIL (exit 1) khi hướng lưu ngược với chữ trích. WARN khi không đọc được chữ biên hoặc số trong
 * trich khác số lưu (không đỏ CI — có thể là quy đổi đơn vị/chữ biểu, soát tay khi thấy).
 * --dir=<thư mục> kiểm thư mục khác (test dùng); mặc định data/so-tay.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { taiTuVung } = require('../lib/tu-vung.js');

const dirArg = process.argv.find((a) => a.startsWith('--dir='));
const DIR = dirArg ? path.resolve(dirArg.slice(6)) : path.join(ROOT, 'data', 'so-tay');

const tv = taiTuVung();

// Chữ so sánh TRƯỚC số: từ điển tu-vung (nguồn của docSo) + phủ định "không thấp/bé/nhỏ hơn" (tu-vung
// chưa liệt kê đủ: "không thấp hơn 30°C" = >=30) + từ đơn giản "từ/đến/tới/hơn/vượt" (bộ trích so-tay dùng).
// Một tầng duy nhất: chữ GẦN số nhất quyết định; sát số như nhau thì chữ DÀI (cụ thể hơn) thắng —
// "ít hơn 10%" phải thắng "hơn", "đến" kề số phải thắng "trên" đứng trước ("trên 2.000 đến 3.000 cc").
const TRUOC = { '>=': [], '<=': [], '>': [], '<': [] };
for (const [op, ds] of Object.entries(tv.soSanh.truoc || {})) TRUOC[op].push(...ds);
TRUOC['>='].push('không\\s+thấp hơn', 'không\\s+bé hơn', 'từ$');
TRUOC['<='].push('đến$', 'tới$');
TRUOC['>'].push('hơn$', 'vượt$');
// Chữ so sánh SAU số: tu-vung (chữ Hán) + trở lên/trở xuống và biến thể (soSanhSauMoRong của tu-vung).
const SAU = { '>=': [], '<=': [] };
for (const [op, ds] of Object.entries(tv.soSanh.sau || {})) SAU[op].push(...ds);
for (const [op, ds] of Object.entries(tv.soSanhSauMoRong || {})) SAU[op].push(...ds);
SAU['>='].push('hoặc\\s+hơn', 'or\\s+more');
SAU['<='].push('hoặc\\s+ít\\s+hơn', 'or\\s+less');

const reTruoc = {};
for (const [op, ds] of Object.entries(TRUOC)) if (ds.length) reTruoc[op] = new RegExp(`(?:${ds.join('|')})`, 'iu');
const reSau = {};
for (const [op, ds] of Object.entries(SAU)) reSau[op] = new RegExp(`(?:${ds.join('|')})`, 'iu');

const HUONG = { '>=': 'LEN', '>': 'LEN', '<=': 'XUONG', '<': 'XUONG' };
const CUA_SO = 40; // cửa sổ chữ trước số để tìm chữ so sánh
const CUA_SAU = 18; // cửa sổ chữ sau số ("trở xuống", "và thấp hơn")

/** Số kiểu Việt trong trich: "2,5" = 2.5, "1.000" = 1000. */
function parseVN(s) {
  const t = String(s).trim();
  const v = /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t.replace(',', '.');
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** ² / ³ thành 2 / 3 ("g/m²" khớp "g/m2"). */
const chuan = (s) => String(s).replace(/²/g, '2').replace(/³/g, '3');

/** Hướng biên quanh một chỗ "số + đơn vị" trong trich: ưu tiên chữ sau số, nếu không có lấy chữ trước số gần nhất. */
function huongTai(trichChuan, soBatDau, soKetThuc) {
  const sau = chuan(trichChuan.slice(soKetThuc, soKetThuc + CUA_SAU));
  for (const [op, re] of Object.entries(reSau)) {
    const m = re.exec(sau);
    if (m && m.index <= 3) return { op, nguon: 'sau' }; // chữ sau số phải nằm ngay kề đơn vị
  }
  // cửa sổ bỏ đệm trắng đuôi để "hơn$" không thắng nhờ khoảng trắng ("ít hơn 10%");
  // cắt tại biên câu (. ; xuống dòng — không cắt dấu thập phân "2.000") để chữ biên của câu trước
  // không dính vào số của câu sau ("không dưới 600 gram.\nKích thước: 35-120 cm")
  let truoc = chuan(trichChuan.slice(Math.max(0, soBatDau - CUA_SO), soBatDau)).replace(/\s+$/, '');
  const cat = Math.max(
    truoc.lastIndexOf('\n') + 1,
    (() => { let k = -1; for (const m of truoc.matchAll(/[.;](?=\s|$)/g)) k = m.index + 1; return k; })(),
  );
  if (cat > 0) truoc = truoc.slice(cat);
  let best = null;
  for (const [op, re] of Object.entries(reTruoc)) {
    for (const m of truoc.matchAll(new RegExp(re.source, 'giu'))) {
      const cach = truoc.length - (m.index + m[0].length); // số ký tự từ hết chữ tới số
      if (!best || cach < best.cach || (cach === best.cach && m[0].length > best.len)) best = { op, cach, len: m[0].length, nguon: 'truoc' };
    }
  }
  return best;
}

// ── Quét mọi nhóm sổ tay, thu các mục có dieuKienSo + trich ──
function docMuc(tep) {
  const ra = [];
  const da = new Set();
  (function quet(o) {
    if (Array.isArray(o)) { for (const v of o) quet(v); return; }
    if (!o || typeof o !== 'object' || da.has(o)) return;
    da.add(o);
    if (Array.isArray(o.dieuKienSo) && o.dieuKienSo.length && typeof o.trich === 'string') ra.push(o);
    for (const v of Object.values(o)) quet(v);
  })(JSON.parse(fs.readFileSync(tep, 'utf8')));
  return ra;
}

let fail = 0; let warn = 0; let soKiem = 0;
const files = fs.readdirSync(DIR).filter((f) => /^\d{4}\.json$/.test(f)).sort();
for (const f of files) {
  const h4 = f.slice(0, 4);
  for (const muc of docMuc(path.join(DIR, f))) {
    const tc = chuan(muc.trich);
    for (const dk of muc.dieuKienSo) {
      if (!dk || typeof dk.op !== 'string' || typeof dk.value !== 'number' || typeof dk.donVi !== 'string') continue;
      soKiem += 1;
      const donVi = chuan(dk.donVi).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const so = '(\\d+(?:[.,]\\d+)?)';
      // chỗ "số + đơn vị" trực tiếp ("2,5 cm")
      const re = new RegExp(`(?<![\\d.,])${so}\\s*${donVi}(?![\\d])`, 'giu');
      // khoảng "A đến B đơn vị" / "A - B đơn vị": đơn vị chỉ ghi sau số cuối, biên dưới ⇒ >=, biên trên ⇒ <=
      const reKhoang = new RegExp(`(?<![\\d.,])${so}\\s*(?:-|–|~|đến|tới|to)\\s*${so}\\s*${donVi}(?![\\d])`, 'giu');
      const thay = []; // {batDau, ketThuc, loai: 'tructiep'|'khoangDuoi'|'khoangTren'}
      for (const m of tc.matchAll(re)) {
        if (parseVN(m[1]) === dk.value) thay.push({ batDau: m.index, ketThuc: m.index + m[0].length, loai: 'tructiep' });
      }
      for (const m of tc.matchAll(reKhoang)) {
        const v1 = parseVN(m[1]); const v2 = parseVN(m[2]);
        if (v1 === dk.value) thay.push({ batDau: m.index, ketThuc: m.index + m[1].length, loai: 'khoangDuoi' });
        if (v2 === dk.value) thay.push({ batDau: m.index + m[0].indexOf(m[2], 1), ketThuc: m.index + m[0].indexOf(m[2], 1) + m[2].length, loai: 'khoangTren' });
      }
      const docH = (t) => {
        const h = huongTai(tc, t.batDau, t.ketThuc);
        if (h) return h;
        if (t.loai === 'khoangDuoi') return { op: '>=', nguon: 'khoang' };
        if (t.loai === 'khoangTren') return { op: '<=', nguon: 'khoang' };
        return null;
      };
      // ưu tiên chỗ đọc được chữ biên; cùng có chữ thì chỗ trực tiếp thắng chỗ trong khoảng
      const thuTu = thay.map((t, i) => ({ t, h: docH(t), i }))
        .sort((a, b) => (Boolean(b.h) - Boolean(a.h)) || (a.t.loai === 'tructiep' ? -1 : 1) - (b.t.loai === 'tructiep' ? -1 : 1) || a.i - b.i);
      const chon = thuTu[0];
      if (!chon) { warn += 1; console.log(`WARN ${h4} ${muc.hs || '?'} ${dk.fact}: không đọc được số+đơn vị ${dk.value} ${dk.donVi} trong trich`); continue; }
      if (!chon.h) { warn += 1; console.log(`WARN ${h4} ${muc.hs || '?'} ${dk.fact}: trich có số ${dk.value} ${dk.donVi} nhưng không có chữ so sánh quanh số`); continue; }
      if (HUONG[chon.h.op] !== HUONG[dk.op]) {
        fail += 1;
        console.log(`FAIL ${h4} ${muc.hs || '?'} ${dk.fact}: lưu ${dk.op} ${dk.value} nhưng trich đọc được "${chon.h.op}" (${chon.h.nguon}) — ${tc.slice(Math.max(0, chon.t.batDau - 30), chon.t.ketThuc + 14)}`);
      }
    }
  }
}
console.log(`so-tay biên: ${files.length} nhóm, ${soKiem} điều kiện số, ${fail} lưu ngược, ${warn} không kiểm được`);
process.exit(fail ? 1 : 0);
