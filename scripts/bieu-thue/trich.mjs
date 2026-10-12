#!/usr/bin/env node
/**
 * BƯỚC 2 của skill bieu-thue-xnk — TRÍCH tệp biểu thuế thành dữ liệu có cấu trúc, KHÔNG bỏ sót:
 *   data/bieu-thue/<phien-ban>/cot.json       từ điển cột từng sheet (tiêu đề nguyên văn → khoá; cột lạ ghi rõ)
 *   data/bieu-thue/<phien-ban>/bieu-chinh.jsonl.gz   sheet chính (nhiều mã 8 số nhất): mọi dòng có mã, mọi cột, chuỗi gốc
 *   data/bieu-thue/<phien-ban>/tieu-de.jsonl.gz      mọi dòng tiêu đề không mã của mọi sheet (gạch, chữ, mã trước/sau)
 *   data/bieu-thue/<phien-ban>/sheet/<sheet>.jsonl.gz  các sheet còn lại (FTA theo năm, XK, CU/MOI…) — gitignored, tái sinh được
 *   data/bieu-thue/<phien-ban>/ten-nut.json   tên NGUYÊN VĂN biểu thuế cho nút ảo của cây (lib/hs-tree.js)
 *   data/bieu-thue/<phien-ban>/tong-ket.json  sha256, số liệu, bảo toàn ô, đối chiếu tax.json, sheet không nhận ra
 *   data/oz-export/bieu-thue-raw/<phien-ban>/<sheet>.jsonl  bản THÔ từng ô (gitignored — tệp lớn, tái sinh được)
 * Từ chối ghi khi bảo toàn ô không đủ hoặc có sheet không nhận ra mà chưa --bo-qua-sheet=<tên,…> có ý thức.
 *   node scripts/bieu-thue/trich.mjs --file=… --phien-ban=2026.04.05 [--bo-qua-sheet=Phu luc] [--ep]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = require('../../lib/bieu-thue.js');
const T = require('../../lib/hs-tree.js');
const { taxData } = require('../../lib/data.js');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const file = arg('file'); const ver = arg('phien-ban'); const ep = process.argv.includes('--ep');
if (!file || !fs.existsSync(file) || !ver) { console.error('Cần --file=<.xlsx> --phien-ban=<YYYY.MM.DD>'); process.exit(2); }
const boQua = (arg('bo-qua-sheet', '') || '').split(',').map((s) => s.trim()).filter(Boolean);

const tho = B.docTho(file);
const kq = B.trich(tho);
const loi = [];
for (const sh of kq.sheets) if (!sh.baoToan.du) loi.push(`sheet "${sh.ten}": bảo toàn ô ${sh.baoToan.oDaGhi}/${sh.baoToan.oKhongRong}`);
for (const s of kq.khongNhanRa) if (!boQua.includes(s.ten)) loi.push(`sheet "${s.ten}" không nhận ra tiêu đề cột — xem kham-pha rồi thêm --bo-qua-sheet=${s.ten} nếu chắc chắn không có dữ liệu biểu`);
if (loi.length && !ep) { console.error('TỪ CHỐI TRÍCH (không bỏ sót):\n  ' + loi.join('\n  ') + '\nSửa lib/bieu-thue.js hoặc khai --bo-qua-sheet; --ep chỉ để thử.'); process.exit(1); }

const dir = path.join('data', 'bieu-thue', ver); fs.mkdirSync(dir, { recursive: true });
const rawDir = path.join('data', 'oz-export', 'bieu-thue-raw', ver); fs.mkdirSync(rawDir, { recursive: true });
for (const sh of tho.sheets) fs.writeFileSync(path.join(rawDir, `${sh.ten.replace(/[^\w.-]+/g, '_')}.jsonl`), sh.dong.map((d) => JSON.stringify(d)).join('\n') + '\n');

const dong = [], tieuDe = [], cot = {}, tenNut = {}, khongNoi = [];
const dc = B.doiChieu(kq, taxData);
fs.mkdirSync(path.join(dir, 'sheet'), { recursive: true });
for (const sh of kq.sheets) {
  cot[sh.ten] = { tieuDeCot: sh.tieuDeCot, cot: sh.cot, dongMa: sh.dong.length, tieuDe: sh.tieuDe.length, khac: sh.khac.length, baoToan: sh.baoToan };
  const rows = sh.dong.map((d) => ({ sheet: sh.ten, ...d }));
  dong.push(...rows);
  if (sh.ten === dc.sheetChinh) B.ghiJsonlGz(path.join(dir, 'bieu-chinh.jsonl.gz'), rows); else B.ghiJsonlGz(path.join(dir, 'sheet', `${sh.ten.replace(/[^\w.-]+/g, '_')}.jsonl.gz`), rows);
  for (const t of sh.tieuDe) tieuDe.push({ sheet: sh.ten, ...t });
  const noi = B.noiTieuDeVaoCay(sh, T);
  for (const [id, v] of Object.entries(noi.ten)) if (!tenNut[id] || (v.doTinCay === 'KHOP_TAP' && tenNut[id].doTinCay !== 'KHOP_TAP')) tenNut[id] = { sheet: sh.ten, ...v };
  khongNoi.push(...noi.khongNoi.map((x) => ({ sheet: sh.ten, ...x })));
}
const nutAo = Object.values(tenNut).filter((v) => v.suyRa);
const tongKet = { phienBan: ver, tep: tho.tep, sha256: tho.sha256, luc: new Date().toISOString(), nguonLoai: 'NGUYEN_VAN', sheetChinh: dc.sheetChinh, sheets: kq.sheets.map((s) => ({ ten: s.ten, an: s.an, tieuDeCot: s.tieuDeCot, dongMa: s.dong.length, tieuDe: s.tieuDe.length, khac: s.khac.length, baoToan: s.baoToan })), boQuaSheet: boQua, khongNhanRa: kq.khongNhanRa.map((s) => ({ ten: s.ten, soDong: s.soDong, soO: s.soO })), doiChieuTax: { soMa8: dc.soMa8, soTax: dc.soTax, thieuTrongBieu: dc.thieuTrongBieu.length, moiSoVoiTax: dc.moiSoVoiTax.length, maTrung: dc.maTrung.length }, tenNut: { tong: Object.keys(tenNut).length, nutAo: nutAo.length, khopTap: Object.values(tenNut).filter((v) => v.doTinCay === 'KHOP_TAP').length, khongNoi: khongNoi.length }, cotThue: [...new Set(dong.flatMap((d) => Object.keys(d.thue)))].sort() };
fs.writeFileSync(path.join(dir, 'cot.json'), JSON.stringify(cot, null, 1));
B.ghiJsonlGz(path.join(dir, 'tieu-de.jsonl.gz'), tieuDe);
for (const f of ['dong.json', 'tieu-de.json']) { try { fs.unlinkSync(path.join(dir, f)); } catch { /* bản cũ không có */ } }
fs.writeFileSync(path.join(dir, 'ten-nut.json'), JSON.stringify({ nguonLoai: 'NGUYEN_VAN', nguon: `bieu-thue@${ver}`, ten: tenNut, khongNoi }, null, 1));
fs.writeFileSync(path.join(dir, 'doi-chieu-tax.json'), JSON.stringify(dc, null, 1));
fs.writeFileSync(path.join(dir, 'tong-ket.json'), JSON.stringify(tongKet, null, 1));
console.log(JSON.stringify(tongKet, null, 1));
console.log(`\nĐã ghi ${dir}/ (cot, bieu-chinh.jsonl.gz, tieu-de.jsonl.gz, ten-nut, doi-chieu-tax, tong-ket; sheet/*.jsonl.gz gitignored) + bản thô ${rawDir}/ (gitignored). Chạy tiếp: node scripts/bieu-thue/kiem.mjs --phien-ban=${ver}`);
