#!/usr/bin/env node
/**
 * BƯỚC 3 của skill bieu-thue-xnk — KIỂM bộ dữ liệu đã trích (data/bieu-thue/<phien-ban>/): đỏ khi
 *   - bảo toàn ô không đủ ở bất kỳ sheet nào; có sheet không nhận ra mà không được khai bỏ qua;
 *   - mã 8 số trong tax.json hiện hành không có trong biểu (mất mã) — trừ danh sách --chap-nhan-thieu=…;
 *   - mã 8 số trùng trong biểu; dòng 8 số không có mô tả tiếng Việt;
 *   - tên nút ảo nối vào cây mà nút không tồn tại.
 * In số liệu: cột thuế có, phủ tên nút ảo so với cây (1.155 tiêu đề quốc gia + nhóm một gạch).
 *   node scripts/bieu-thue/kiem.mjs --phien-ban=2026.04.05 [--chap-nhan-thieu=98xxxxxx,…]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../../lib/hs-tree.js');
const B = require('../../lib/bieu-thue.js');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const ver = arg('phien-ban'); if (!ver) { console.error('Cần --phien-ban'); process.exit(2); }
const dir = path.join('data', 'bieu-thue', ver);
const J = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const tk = J('tong-ket.json'), dong = B.docJsonlGz(path.join(dir, 'bieu-chinh.jsonl.gz')), dc = J('doi-chieu-tax.json'), tn = J('ten-nut.json');
const chapNhan = new Set((arg('chap-nhan-thieu', '') || '').split(',').filter(Boolean));
let loi = 0; const fail = (m) => { loi += 1; console.log(`FAIL ${m}`); };
for (const s of tk.sheets) if (!s.baoToan.du) fail(`sheet "${s.ten}" bảo toàn ô ${s.baoToan.oDaGhi}/${s.baoToan.oKhongRong}`);
for (const s of tk.khongNhanRa) if (!tk.boQuaSheet.includes(s.ten)) fail(`sheet "${s.ten}" không nhận ra, chưa khai bỏ qua`);
const thieu = dc.thieuTrongBieu.filter((m) => !chapNhan.has(m) && !m.startsWith('98'));
if (thieu.length) fail(`${thieu.length} mã 8 số trong tax.json không có trong biểu (vd ${thieu.slice(0, 8).join(', ')})`);
// Chương 98 (mã quốc gia) xuất hiện hai lần trong biểu Tổng cục (theo chương và theo mã tương ứng) — không tính trùng.
const trung = dc.maTrung.filter((x) => !x.ma.startsWith('98'));
if (trung.length) fail(`${trung.length} mã 8 số trùng ngoài chương 98 (vd ${trung.slice(0, 5).map((x) => x.ma).join(', ')})`);
const khongMoTa = dong.filter((d) => d.soChuSo === 8 && !d.moTaVi);
if (khongMoTa.length) fail(`${khongMoTa.length} dòng 8 số không có mô tả tiếng Việt (vd ${khongMoTa.slice(0, 5).map((d) => d.ma).join(', ')})`);
for (const id of Object.keys(tn.ten)) { const n = T.nodeOf(id); if (!n || n.id !== id) fail(`ten-nut trỏ nút không có trong cây: ${id}`); }
const t = T.tree(); const ao = [...new Set(t.nodes.values())].filter((n) => n.suyRa);
const coTen = ao.filter((n) => tn.ten[n.id]);
console.log(`biểu ${ver} sheet chính ${dc.sheetChinh}: ${dong.length} dòng mã (8 số: ${dong.filter((d) => d.soChuSo === 8).length}, trùng ch.98: ${dc.maTrung.length}); tax.json ${dc.soTax}, thiếu ${dc.thieuTrongBieu.length}, mới ${dc.moiSoVoiTax.length}; ${tk.cotThue.length} cột thuế (mọi sheet)`);
console.log(`tên nút ảo từ biểu thuế: ${coTen.length}/${ao.length} nút ảo của cây có tên (${Object.values(tn.ten).filter((v) => v.doTinCay === 'KHOP_TAP').length} khớp tập, ${tn.khongNoi.length} tiêu đề không nối được)`);
// Dòng có mức thuế nhưng ô mã trống (lỗi nguồn: chèn dòng, cột phụ lệch) — CẢNH BÁO, không gán mã máy; người kiểm đối chiếu văn bản.
for (const s of tk.sheets) for (const k of s.coThueKhongMa || []) console.log(`CẢNH BÁO sheet ${s.ten} dòng ${k.r}: có mức thuế nhưng không có mã → ${JSON.stringify(k.o).slice(0, 160)}`);
console.log(loi ? `${loi} lỗi` : 'PASS kiểm biểu thuế');
process.exit(loi ? 1 : 0);
