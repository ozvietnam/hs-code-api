#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * lib/bieu-thue.js — đọc biểu thuế XNK không bỏ sót. Dùng sổ Excel GIẢ dựng tại chỗ (xlsx) mô phỏng tệp Tổng cục:
 * 3 dòng tiêu đề cột (ô gộp "Thuế suất" trên các cột FTA), dòng chương/nhóm/nhóm con không mã, mã 4/6/8 số dạng chấm,
 * cột FTA có "(-CN)", "*", một cột lạ, một dòng ghi chú, sheet phụ không có tiêu đề. Mã lấy thật từ nhóm 8504 để nối cây.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const B = require('../lib/bieu-thue.js');
const T = require('../lib/hs-tree.js');
const { taxData } = require('../lib/data.js');

let passed = 0; let failed = 0;
const assert = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${JSON.stringify(extra).slice(0, 400)}`}`); if (ok) passed += 1; else failed += 1; };

// ── Dựng sổ giả ──
const aoa = [
  ['BIỂU THUẾ XUẤT NHẬP KHẨU 2026 (bản thử)', '', '', '', '', '', '', '', '', ''],
  ['Mã hàng', 'Mô tả hàng hoá - Tiếng Việt', 'Mô tả hàng hoá - Tiếng Anh', 'Đơn vị tính', 'Thuế suất (%)', '', '', '', '', '', '', 'Ghi chú', 'Văn bản', 'Ngày hiệu lực', 'Thuế suất ATIGA (%)', 'Thuế suất ATIGA (%)', 'Thuế suất ATIGA (%)'],
  ['', '', '', '', 'NK ưu đãi (MFN)', 'NK\nTT', 'GTGT', 'ACFTA', 'RCEPT', '', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '', 'A', 'B', 'C', '', '', '', '2025', '2026', '2027'],
  ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ['Chương 85', 'MÁY ĐIỆN VÀ THIẾT BỊ ĐIỆN', '', '', '', '', '', '', '', ''],
  ['85.04', 'Máy biến điện (máy biến áp và máy biến dòng), máy biến đổi điện tĩnh (ví dụ, bộ chỉnh lưu) và cuộn cảm.', 'Electrical transformers', '', '', '', '', '', '', ''],
  ['8504.10.00', '- Chấn lưu dùng cho đèn phóng hoặc ống phóng', '- Ballasts for discharge lamps or tubes', 'chiếc', '5', '7.5', '10', '0', '0', ''],
  ['', '- Máy biến điện điện môi lỏng:', '- Liquid dielectric transformers:', '', '', '', '', '', '', ''],
  ['8504.21', '- - Có công suất danh định không quá 650 kVA:', '', '', '', '', '', '', '', ''],
  ['', '- - - Máy biến đổi đo lường:', '', '', '', '', '', '', '', ''],
  ['8504.21.11', '- - - - Loại công suất danh định không quá 1 kVA và đầu điện áp cao từ 110 kV trở lên', '', 'chiếc', '0', '5', '10', '0 (-CN)', '0', '3', '5', 'ghi chú dòng', '129/2022/NĐ-CP', '30/12/2022', '0', '0', '0'],
  ['8504.21.19', '- - - - Loại khác', '', 'chiếc', '0', '5', '10', '*', '0', ''],
  ['', '- - - Loại khác:', '', '', '', '', '', '', '', ''],
  ['8504.21.92', '- - - - Có điện áp cao từ 110 kV trở lên', '', 'chiếc', '0', '5', '10', '0', '0', ''],
  ['8504.21.93', '- - - - Có điện áp cao từ 66 kV trở lên nhưng dưới 110 kV', '', 'chiếc', '0', '5', '10', '0', '0', ''],
  ['8504.21.99', '- - - - Loại khác', '', 'chiếc', '0', '5', '10', '0', '0', ''],
  ['Ghi chú: (-CN) nghĩa là không áp dụng cho hàng xuất xứ Trung Quốc', '', '', '', '', '', '', '', '', ''],
];
const ws = XLSX.utils.aoa_to_sheet(aoa);
ws['!merges'] = [{ s: { r: 1, c: 4 }, e: { r: 1, c: 10 } }, { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } }, { s: { r: 1, c: 14 }, e: { r: 1, c: 16 } }];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Bieu thue');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Phụ lục'], ['Danh mục hàng hoá quản lý'], ['x', 'y']]), 'Phu luc');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Mã hàng', 'Mô tả hàng hóa', 'Thuế suất (%)', '', ''], ['', '', '2022', '2023 - 2027', ''], ['', 'Chương 85'], ['8504.21.11', '- - - - Loại công suất danh định không quá 1 kVA', '7', '0', '85042111'], ['', '', '5', '0', '85042119']]), 'VNCU');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bieu-thue-'));
const f = path.join(tmp, 'thu.xlsx');
XLSX.writeFile(wb, f);

// ── Đọc thô ──
const tho = B.docTho(f);
assert('docTho: 3 sheet, sha256, giữ ô gộp', tho.sheets.length === 3 && /^[0-9a-f]{64}$/.test(tho.sha256) && tho.sheets[0].gop.length === 3, tho.sheets.map((s) => s.ten));
const soO = B.demO(tho.sheets[0]);
const oThat = aoa.flat().filter((v) => String(v).trim() !== '').length;
assert(`docTho: đếm đủ mọi ô không rỗng (${oThat})`, soO === oThat, { soO, oThat });

// ── Trích ──
const kq = B.trich(tho);
const sh = kq.sheets[0];
assert('tiêu đề cột: nhận dòng 2–4 (ô gộp "Thuế suất" + dòng mốc năm/A–F ở cột chưa có tiêu đề)', sh.tieuDeCot[0] === 2 && sh.tieuDeCot[1] === 4, sh.tieuDeCot);
const khoa = Object.fromEntries(sh.cot.map((c) => [c.cot, c.khoa]));
assert('từ điển cột: mã, mô tả vi/en ("Tiếng Anh" → moTaEn), dvt, mfn, "NK\\nTT" → tt, vat, acfta, "RCEPT" → rcep, ghi chú; "Văn bản"/"Ngày hiệu lực" sau RCEP → vanBan.rcep/hieuLuc.rcep; ATIGA 3 cột theo năm → thue.atiga@2025/2026/2027',
  khoa.A === 'ma' && khoa.B === 'moTaVi' && khoa.C === 'moTaEn' && khoa.D === 'dvt' && khoa.E === 'thue.mfn' && khoa.F === 'thue.tt' && khoa.G === 'thue.vat' && khoa.H === 'thue.acfta' && khoa.I === 'thue.rcep@A' && khoa.J === 'thue.rcep@B' && khoa.K === 'thue.rcep@C' && khoa.L === 'ghiChu' && khoa.M === 'vanBan.rcep' && khoa.N === 'hieuLuc.rcep' && khoa.O === 'thue.atiga@2025' && khoa.P === 'thue.atiga@2026' && khoa.Q === 'thue.atiga@2027', khoa);
assert('tiêu đề cột ghép ô gộp: cột H đọc "Thuế suất (%) / ACFTA", cột J đọc "Thuế suất (%) / B"', sh.cot.find((c) => c.cot === 'H').tieuDe === 'Thuế suất (%) / ACFTA' && sh.cot.find((c) => c.cot === 'J').tieuDe === 'Thuế suất (%) / B', sh.cot.find((c) => c.cot === 'J'));
assert('dòng mã: 8 dòng (4 số, 6 số, 6×8 số), giữ chuỗi gốc có chấm + maChuan + soChuSo', sh.dong.length === 8 && sh.dong[0].ma === '85.04' && sh.dong[0].soChuSo === 4 && sh.dong[2].ma === '8504.21' && sh.dong[2].soChuSo === 6 && sh.dong[3].maChuan === '85042111' && sh.dong[3].soChuSo === 8, sh.dong.map((d) => d.ma));
const d11 = sh.dong.find((d) => d.maChuan === '85042111');
assert('thuế giữ chuỗi gốc: acfta "0 (-CN)", "*" không ép số; ghiChu; canCu.rcep {vanBan, hieuLuc}; atiga theo năm', d11.thue.acfta === '0 (-CN)' && d11.thue['rcep@A'] === '0' && d11.thue['rcep@B'] === '3' && d11.thue['rcep@C'] === '5' && sh.dong.find((d) => d.maChuan === '85042119').thue.acfta === '*' && d11.ghiChu === 'ghi chú dòng' && d11.dvt === 'chiếc' && d11.canCu.rcep.vanBan === '129/2022/NĐ-CP' && d11.canCu.rcep.hieuLuc === '30/12/2022' && d11.thue['atiga@2026'] === '0', d11);
assert('tiêu đề không mã: 4 dòng (chương, một gạch, ba gạch ×2) với số gạch + mã trước/sau', sh.tieuDe.length === 4 && sh.tieuDe[1].gach === 1 && sh.tieuDe[1].chu === 'Máy biến điện điện môi lỏng:' && sh.tieuDe[1].chuEn === 'Liquid dielectric transformers:' && sh.tieuDe[2].gach === 3 && sh.tieuDe[2].maTruoc === '850421' && sh.tieuDe[2].maSau === '85042111', sh.tieuDe.map((t) => [t.gach, t.chu, t.maTruoc, t.maSau]));
assert('dòng chương "Chương 85" (cột mã không phải mã) giữ ở tiêu đề với ô khac.A', sh.tieuDe[0].chu === 'MÁY ĐIỆN VÀ THIẾT BỊ ĐIỆN' && sh.tieuDe[0].khac.A === 'Chương 85', sh.tieuDe[0]);
assert('dòng tên biểu trước tiêu đề cột và dòng ghi chú cuối → khac, không mất', sh.khac.length === 2 && sh.khac[0].viTri === 'TRUOC_TIEU_DE_COT' && /BIỂU THUẾ/.test(sh.khac[0].o.A) && /Ghi chú/.test(sh.khac[1].o.A), sh.khac);
assert('BẢO TOÀN: số ô đã ghi = số ô không rỗng của sheet', sh.baoToan.du && sh.baoToan.oDaGhi === soO, sh.baoToan);
assert('sheet phụ không có tiêu đề cột → khongNhanRa, giữ mẫu thô', kq.khongNhanRa.length === 1 && kq.khongNhanRa[0].ten === 'Phu luc' && kq.khongNhanRa[0].soO === 4, kq.khongNhanRa);
const vncu = kq.sheets.find((s) => s.ten === 'VNCU');
assert('ô mã trống, không mô tả nhưng có thuế (mã chỉ ở cột phụ không tiêu đề) → KHÔNG gán mã, giữ ở khac với cờ CO_THUE_KHONG_MA, đủ ô; dòng mã thật không bị ảnh hưởng', vncu && vncu.dong.length === 1 && vncu.khac.some((k) => k.canhBao === 'CO_THUE_KHONG_MA' && k.o.E === '85042119' && k.o.C === '5') && vncu.baoToan.du, vncu && { dong: vncu.dong.length, khac: vncu.khac });
assert('sheet VNCU: "Thuế suất (%)" → thue.vn_cuba suy từ tên sheet, mốc "2022" và "2023 - 2027" từ dòng tiêu đề phụ', vncu && vncu.cot.find((c) => c.cot === 'C').khoa === 'thue.vn_cuba@2022' && vncu.cot.find((c) => c.cot === 'D').khoa === 'thue.vn_cuba@2023 - 2027' && vncu.cot.find((c) => c.cot === 'C').suyTuSheet === true && vncu.dong[0].thue['vn_cuba@2022'] === '7' && vncu.baoToan.du, vncu && { cot: vncu.cot, dong: vncu.dong, bt: vncu.baoToan });

// ── Nối tiêu đề vào cây ──
const noi = B.noiTieuDeVaoCay(sh, T);
assert('tiêu đề "- - - Máy biến đổi đo lường:" → nút ảo 8504211 (KHOP_TAP: lá 85042111, 85042119)', noi.ten['8504211']?.tenVi === 'Máy biến đổi đo lường:' && noi.ten['8504211'].doTinCay === 'KHOP_TAP' && noi.ten['8504211'].suyRa === true, noi);
assert('tiêu đề "- - - Loại khác:" → nút ảo 8504219 (KHOP_TAP: 85042192/93/99)', noi.ten['8504219']?.tenVi === 'Loại khác:' && noi.ten['8504219'].doTinCay === 'KHOP_TAP', noi.ten);
assert('tiêu đề một gạch "- Máy biến điện điện môi lỏng:" → sổ giả chỉ có 850421 bên dưới nên tiền tố chung là 850421 (KHOP_TAP, nút có tên sẵn); tệp thật đủ 850422/23 sẽ về 85042', noi.ten['850421']?.doTinCay === 'KHOP_TAP' && noi.ten['850421'].cap === 6 && noi.ten['850421'].suyRa === false && !noi.ten['85042'], noi.ten);

// ── Đối chiếu tax.json ──
const dc = B.doiChieu(kq, taxData);
assert('đối chiếu theo sheet chính (nhiều mã nhất): 6 mã 8 số, không trùng, mọi mã có trong tax.json, thiếu = phần còn lại; sheet VNCU lặp mã không tính trùng', dc.sheetChinh === 'Bieu thue' && dc.soMa8 === 6 && dc.maTrung.length === 0 && dc.moiSoVoiTax.length === 0 && dc.thieuTrongBieu.length === dc.soTax - 6 && dc.theoSheet.VNCU.soMa8 === 1, { sheetChinh: dc.sheetChinh, soMa8: dc.soMa8, trung: dc.maTrung, moi: dc.moiSoVoiTax.length });

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
