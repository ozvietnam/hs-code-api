#!/usr/bin/env node
/** lib/so-tay.js: máy kiểm từng mục sổ tay bằng nguồn nguyên văn thật (nhóm 8509). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { sourcesFor, verifySoTay, checkItem } = require('../lib/so-tay.js');

let passed = 0;
let failed = 0;
const assert = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${extra}`}`);
  if (ok) passed += 1; else failed += 1;
};

const src = sourcesFor('8509');
assert('Nguồn 8509 có chú giải nhóm HS 2022, chương 85, dòng biểu thuế', ['nhom8509.nhom', 'ch85.chuong', 'tax.85098010'].every((k) => k in src), Object.keys(src).join(' '));

const ok = {
  phamVi: { text: 'Thiết bị cơ điện gia dụng có động cơ điện gắn liền', nguon: 'ch85.chuong', trich: '(b) Các loại máy khác có khối lượng không quá 20 kg' },
  dieuKienVao: [{ fact: 'khoi_luong_kg', op: '<=', value: 20, nguon: 'ch85.chuong', trich: 'Các loại máy khác có khối lượng không quá 20 kg' }],
  loaiTru: [{ dieuKien: 'quạt, chụp hút có gắn quạt', sangNhom: '8414', nguon: 'nhom8509.nhom', trich: '(a) Các quạt gió hoặc quạt thông gió hoặc chụp hút có gắn quạt, đã hoặc chưa gắn với thiết bị lọc (nhóm 84.14)' }],
  dong8: [{ hs: '85098010', dieuKien: 'là máy đánh bóng sàn', nguon: 'tax.85098010', trich: 'Máy đánh bóng sàn nhà' }],
};
const r = verifySoTay(ok, '8509', src);
assert('Mục trích đúng nguyên văn đều đạt', r.dat === r.tong && r.tong === 4, JSON.stringify(r.loai));
assert('phienBan/dungTuNguon được ghi', r.soTay.phienBan === 'HS2022' && r.soTay.dungTuNguon.includes('ch85.chuong'));

const why = (kind, item) => checkItem(kind, item, src, '8509');
assert('Câu trích bịa bị loại', /trich-khong-co/.test(why('loaiTru', { ...ok.loaiTru[0], trich: 'Máy hút bụi thuộc nhóm 85.08 (nhóm 85.08)' })));
assert('Nhóm đích không nêu trong câu trích bị loại', /nhom-dich-khong-co-trong-trich/.test(why('loaiTru', { ...ok.loaiTru[0], sangNhom: '8508' })));
assert('Nhóm đích không có thật bị loại', /nhom-dich-khong-co-that/.test(why('loaiTru', { ...ok.loaiTru[0], sangNhom: '8499' })));
assert('Nguồn không có trong danh sách bị loại', /nguon-khong-co/.test(why('phamVi', { ...ok.phamVi, nguon: 'ch84.chuong' })));
assert('Ngưỡng số không có trong câu trích bị loại', /nguong-khong-co-trong-trich/.test(why('dieuKienVao', { ...ok.dieuKienVao[0], value: 25 })));
assert('Dòng 8 số ngoài nhóm / không có trong biểu bị loại', /dong8-khong-co/.test(why('dong8', { ...ok.dong8[0], hs: '85088010' })));
assert('Lược "…" giữa hai đoạn nguyên văn vẫn đạt', why('phamVi', { ...ok.phamVi, trich: 'Máy đánh bóng sàn, máy nghiền và trộn thực phẩm … Các loại máy khác có khối lượng không quá 20 kg' }) === null);

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
