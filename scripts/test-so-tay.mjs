#!/usr/bin/env node
/** lib/so-tay.js: máy kiểm từng mục sổ tay bằng nguồn nguyên văn thật (nhóm 8509). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { sourcesFor, verifySoTay, checkItem, isLoaiKhac } = require('../lib/so-tay.js');

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
assert('Nguồn không được trích (trường tóm tắt / chương khác) bị loại', /nguon-khong-duoc-trich/.test(why('phamVi', { ...ok.phamVi, nguon: 'ch84.chuong' })) && /nguon-khong-duoc-trich/.test(why('phamVi', { ...ok.phamVi, nguon: 'nhom8509.phan_biet' })));
const re = verifySoTay({ loaiTru: [{ ...ok.loaiTru[0], nguon: 'nhom8509.khong_bao_gom' }] }, '8509', src);
assert('Ghi nguồn trường KG nhưng câu có nguyên văn ở chú giải nhóm → gắn lại nguồn', re.dat === 1 && re.soTay.loaiTru[0].nguon === 'nhom8509.nhom' && re.soTay.loaiTru[0].nguonGhi === 'nhom8509.khong_bao_gom');
assert('Chỉ nguồn pháp lý nguyên văn: không còn trường KG', !Object.keys(src).some((k) => /\.(bao_gom|khong_bao_gom|loai_tru|phan_biet|tinh_chat)$/.test(k)));
assert('Ngưỡng số không có trong câu trích bị loại', /nguong-khong-co-trong-trich/.test(why('dieuKienVao', { ...ok.dieuKienVao[0], value: 25 })));
assert('Dòng 8 số ngoài nhóm / không có trong biểu bị loại', /dong8-khong-co/.test(why('dong8', { ...ok.dong8[0], hs: '85088010' })));
assert('phanBiet trỏ mã nhóm khác không nêu trong câu trích bị loại', /ma-dich-khong-co-trong-trich/.test(why('phanBiet', { hoi: 'Là quạt?', neuCo: '8414', neuKhong: '8509', nguon: 'ch85.chuong', trich: 'Các loại máy khác có khối lượng không quá 20 kg' })));
assert('Chú giải Phần gán nhầm (ch.39 mang Phần VI) không được làm nguồn', !('phan39.phan' in sourcesFor('3926')) && ('phan85.phan' in src));
assert('Lược "…" giữa hai đoạn nguyên văn vẫn đạt', why('phamVi', { ...ok.phamVi, trich: 'Máy đánh bóng sàn, máy nghiền và trộn thực phẩm … Các loại máy khác có khối lượng không quá 20 kg' }) === null);
assert('loaiKhac do máy suy từ biểu thuế: "Loại khác…" → true, dòng có tên riêng ("…khác") → false',
  isLoaiKhac('85098090') === true && isLoaiKhac('84272000') === false && isLoaiKhac('19012030') === true);
const lk = verifySoTay({ dong8: [{ ...ok.dong8[0], loaiKhac: !isLoaiKhac(ok.dong8[0].hs) }] }, '8509', src);
assert('AI ghi sai loaiKhac thì máy ghi đè theo biểu thuế', lk.soTay.dong8[0].loaiKhac === isLoaiKhac(ok.dong8[0].hs));
assert('dieuKienVao lấy từ tên WCO/SEN/biểu thuế (cấp phân nhóm) bị loại',
  checkItem('dieuKienVao', { fact: 'cong_suat', op: '<=', value: 750, nguon: 'wco.850131', trich: 'DC motors, of an output not exceeding 750 W' }, { 'wco.850131': 'DC motors, of an output not exceeding 750 W' }, '8509') === 'dieu-kien-cap-phan-nhom');
assert('dieuKienVao từ câu CHO PHÉP ("vẫn được phân loại… ngay cả khi") bị loại',
  checkItem('dieuKienVao', { fact: 'gan_banh_rang', op: '=', value: true, nguon: 'nhom8501.nhom', trich: 'Các động cơ vẫn được xếp vào nhóm này ngay cả khi chúng được gắn với puli' }, { 'nhom8501.nhom': 'Các động cơ vẫn được xếp vào nhóm này ngay cả khi chúng được gắn với puli' }, '8501') === 'dieu-kien-chi-cho-phep');
assert('phanBiet có hoi nhắc mã phân nhóm/WCO bị loại',
  why('phanBiet', { hoi: 'Là máy công suất ≤ 750 W (WCO 850131)?', neuCo: '85013110', neuKhong: '85013120', nguon: 'ch85.chuong', trich: 'Các loại máy khác có khối lượng không quá 20 kg' }) === 'hoi-nhac-ma-phan-nhom');
assert('loaiTru mà câu nguồn chỉ nói "thường thuộc nhóm" bị loại',
  checkItem('loaiTru', { dieuKien: 'Máy hút bụi', sangNhom: '8508', nguon: 'nhom8509.nhom', trich: 'Máy hút bụi thường thuộc nhóm 85.08' }, { 'nhom8509.nhom': 'Máy hút bụi thường thuộc nhóm 85.08' }, '8509') === 'loai-tru-chi-la-thuong');

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
