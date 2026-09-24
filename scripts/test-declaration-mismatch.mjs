#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * /api/describe validator:
 *   · mã "Loại khác" không được báo MISMATCH_HS cho mô tả đúng (trước đây mọi
 *     mô tả của mã residual đều bị báo lệch vì tên dòng chỉ là "Loại khác")
 *   · mô tả sai hẳn nhóm vẫn bị bắt, kể cả ở mã residual
 *   · chương chưa có checklist không được chấm EXCELLENT
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { validateDeclaration } = require('../lib/declaration-validator');
const { taxData } = require('../lib/data');

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };
const mismatch = (d, hs) => validateDeclaration(d, hs, { tariffNameVi: taxData[hs].vn }).warnings.some((w) => w.code === 'MISMATCH_HS');

const pump = { tenHang: 'Máy bơm nước ly tâm trục ngang', xuatXu: 'China' };
const para = { tenHang: 'Viên nén Paracetamol 500mg', xuatXu: 'China' };
check('bơm ly tâm → 84137019 (Loại khác): không báo lệch', !mismatch(pump, '84137019'));
check('paracetamol → 02013000: báo lệch', mismatch(para, '02013000'));
const res0206 = Object.values(taxData).find((r) => r.hs.startsWith('0206') && /Loại khác/.test(r.vn));
check('paracetamol → mã Loại khác nhóm thịt: vẫn báo lệch', mismatch(para, res0206.hs));

// 66 chương chưa có checklist trường đặc thù (VD 18 — ca cao).
const cocoa = '18010010';
const full = {
  tenHang: `Hạt ca cao ${taxData[cocoa].vn.replace(/^[-\s]+/, '')}`, xuatXu: 'China', donViTinh: 'kg', tinhTrang: 'Mới 100%',
  nhanHieu: 'ABC', model: 'X1', congDung: 'nguyên liệu chế biến', thanhPhanCauTao: 'hạt ca cao', thongSoKyThuat: ['độ ẩm 7%'],
};
const r = validateDeclaration(full, cocoa, { tariffNameVi: taxData[cocoa].vn });
check('chương chưa có checklist → có cảnh báo NO_CHAPTER_CHECKLIST', r.warnings.some((w) => w.code === 'NO_CHAPTER_CHECKLIST'), r.warnings.map((w) => w.code));
check('chương chưa có checklist → không EXCELLENT (≤85)', r.score <= 85 && r.level !== 'EXCELLENT', { score: r.score, level: r.level });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
