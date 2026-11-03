#!/usr/bin/env node
/**
 * Quét sót từ vựng bằng máy: với mỗi PN6 có ≥2 dòng 8 số trong biểu thuế, chạy docGiaTri của MỌI khoá tu-vung@2
 * lên mô tả từng dòng. Dòng mà không khoá nào đọc ra giá trị (trừ "Loại khác" và các dòng chỉ là tên hàng) ⇒ "chưa đọc".
 * PN6 có ≥1 dòng chưa đọc ⇒ nghi THIEU_KHOA_TU_VUNG. Kết quả là danh sách chính xác để giao Studio soạn khoá
 * (thay vì để Gemini tự đoán sót), và để đo độ phủ của bộ từ vựng theo chương.
 *
 *   node scripts/quet-sot-tu-vung.mjs [--chuong=84,85] [--ra=<tệp.json>] [--md=<tệp.md>] [--top=40]
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../lib/tu-vung.js');

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const CHUONG = arg('chuong', '') ? new Set(arg('chuong').split(',').map((c) => c.padStart(2, '0'))) : null;
const RA = arg('ra', ''); const MD = arg('md', ''); const TOP = Number(arg('top', '40'));

const tv = T.taiTuVung();
// Bỏ khoá 'đọc gì cũng ra' (tên loại, công dụng, dùng cho): chúng không nói lên tiêu chí phân biệt dòng
const KHOA_CHUNG = new Set(['tenLoai', 'congDung', 'dungCho']);
const KHOA = tv.khoa.map((k) => k.khoa).filter((k) => !KHOA_CHUNG.has(k) && !['TEN_LOAI', 'CONG_DUNG'].includes(T.layKhoa(k).kieu));
const BIEU = 'data/bieu-thue/2026.04.05/bieu-chinh.jsonl.gz';
const rows = zlib.gunzipSync(fs.readFileSync(BIEU)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  .filter((r) => r.sheet === 'BT2026' && r.soChuSo === 8);
const by = new Map();
for (const r of rows) { const p = r.maChuan.slice(0, 6); if (!by.has(p)) by.set(p, []); by.get(p).push(r); }

const bo = (s) => String(s || '').replace(/^(?:-\s*)+/, '').trim();
const LOAI_KHAC = /^loại khác(?:\s*\(.*\))?[:.]?$/i;
// Dòng chỉ là tên hàng / tên chất (không có tiêu chí đo-có/không-liệt kê): bỏ khỏi "sót" khi không đọc được
const TEN_HANG = /^(?:chứa|của|dùng cho|loại dùng|từ |bằng |thuốc |hợp chất|axit|muối|este|dẫn xuất|chế phẩm)/i;

const docDuoc = (text) => {
  const hit = [];
  for (const k of KHOA) {
    let v; try { v = T.docGiaTri(k, text); } catch { continue; }
    if (v && v.trangThai === 'DA_CO') hit.push(k);
  }
  return hit;
};

const ketQua = []; let tongPn6 = 0; let tongDong = 0; let dongDoc = 0;
for (const [p, ls] of by) {
  if (ls.length < 2) continue;
  if (CHUONG && !CHUONG.has(p.slice(0, 2))) continue;
  tongPn6++;
  const dong = [];
  for (const r of ls) {
    const mo = bo(r.moTaVi); tongDong++;
    if (LOAI_KHAC.test(mo)) { dong.push({ ma: r.maChuan, mo, loai: 'LOAI_KHAC' }); dongDoc++; continue; }
    const hit = docDuoc(mo);
    if (hit.length) { dong.push({ ma: r.maChuan, mo, loai: 'DOC', khoa: hit }); dongDoc++; }
    else dong.push({ ma: r.maChuan, mo, loai: TEN_HANG.test(mo) ? 'TEN_HANG' : 'CHUA_DOC' });
  }
  const chuaDoc = dong.filter((d) => d.loai === 'CHUA_DOC');
  if (chuaDoc.length) ketQua.push({ pn6: p, soDong: ls.length, chuaDoc: chuaDoc.map((d) => ({ ma: d.ma, mo: d.mo })), docDuoc: dong.filter((d) => d.loai === 'DOC').length });
}

// Gom cụm theo chữ biểu (hạ chữ, bỏ số/ngoặc) để thấy tiêu chí lặp nhiều PN6
const cum = new Map();
for (const k of ketQua) for (const d of k.chuaDoc) {
  const key = d.mo.toLowerCase().replace(/\(.*?\)/g, '').replace(/[\d.,]+/g, '#').replace(/\s+/g, ' ').trim();
  if (!cum.has(key)) cum.set(key, { mau: d.mo, pn6: new Set(), dong: 0 });
  const c = cum.get(key); c.pn6.add(k.pn6); c.dong++;
}
const top = [...cum.entries()].map(([k, c]) => ({ chuBieu: c.mau, soPn6: c.pn6.size, soDong: c.dong, pn6: [...c.pn6].slice(0, 6) }))
  .sort((a, b) => b.soPn6 - a.soPn6 || b.soDong - a.soDong).slice(0, TOP);

const theoChuong = {};
for (const k of ketQua) { const c = k.pn6.slice(0, 2); theoChuong[c] = (theoChuong[c] || 0) + 1; }
const tomTat = { khoa: KHOA.length, pn6: tongPn6, pn6Sot: ketQua.length, dong: tongDong, dongDoc, tiLeDongDoc: +(dongDoc / tongDong).toFixed(3), theoChuong };
console.log(JSON.stringify(tomTat));
if (RA) fs.writeFileSync(RA, JSON.stringify({ tomTat, top, pn6Sot: ketQua }, null, 2) + '\n');
if (MD) {
  const md = [`# Quét sót từ vựng bằng máy — ${new Date().toISOString().slice(0, 10)}`, '',
    `Bộ khoá: ${KHOA.length} · PN6 xét: ${tongPn6} · PN6 có dòng chưa đọc: **${ketQua.length}** · dòng đọc được: ${dongDoc}/${tongDong} (${(tomTat.tiLeDongDoc * 100).toFixed(1)} %)`, '',
    '## Theo chương (số PN6 sót)', '', '| Ch | PN6 sót |', '|---|---|', ...Object.entries(theoChuong).sort().map(([c, n]) => `| ${c} | ${n} |`), '',
    `## Top ${TOP} chữ biểu chưa đọc được (gom theo cụm, số = #)`, '', '| # | Chữ biểu mẫu | PN6 | Dòng | PN6 mẫu |', '|---|---|---|---|---|',
    ...top.map((t, i) => `| ${i + 1} | ${t.chuBieu.replace(/\|/g, '/')} | ${t.soPn6} | ${t.soDong} | ${t.pn6.join(' ')} |`), ''];
  fs.writeFileSync(MD, md.join('\n'));
}
