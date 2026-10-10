#!/usr/bin/env node
/** lib/so-tay.js: máy kiểm từng mục sổ tay bằng nguồn nguyên văn thật (nhóm 8509). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const { sourcesFor, verifySoTay, checkItem, isLoaiKhac, checkYKienWco, fingerprint, resetWcoCache, carryOverYKienWco } = require('../lib/so-tay.js');
const wcoOpLib = require('../lib/wco-op.js');

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

// ── yKienWco (#196): ý kiến WCO trong kho RIÊNG; dùng kho giả để test, không đụng kho thật ──
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sotay-wco-'));
  const opF = path.join(tmp, 'opinions.json'); const trF = path.join(tmp, 'trich.json');
  const TEXT = 'A hand-held electric fan with a plastic housing, 12 cm in diameter and a rechargeable battery.\n\nAdoption: 2019';
  fs.writeFileSync(opF, JSON.stringify([
    { id: '841451/1', hs: '841451', ord: 1, adoption: 2019, text: TEXT, line: 10 },
    { id: '841451/2', hs: '841451', ord: 2, adoption: 2019, text: TEXT, line: 20, headingSuspect: true },
  ]));
  const TRICH = 'A hand-held electric fan with a plastic housing';
  fs.writeFileSync(trF, JSON.stringify({ 'wco-op.841451.1': TRICH, 'wco-op.841451.2': TRICH }));
  const item = { hs: '841451', thuTuTrongMa: 1, namThongQua: 2019, moTa: 'Quạt điện cầm tay vỏ plastic, đường kính 12 cm, có pin sạc → mã 8414.51', nguon: 'wco-op.841451.1', dauVet: fingerprint(TRICH), doTinCay: 'CHAC', daSoatAnh: false };

  // 1) không có kho riêng (như CI): chỉ kiểm hình dạng, nhưng đòi đối chiếu thì báo lỗi
  process.env.HS_WCO_OP_FILE = path.join(tmp, 'khong-co.json'); wcoOpLib.reset(); resetWcoCache();
  assert('yKienWco: thiếu kho riêng → chỉ kiểm hình dạng, đạt', checkYKienWco(item, '8414') === null);
  assert('yKienWco: thiếu kho riêng mà đòi đối chiếu → lỗi (không bao giờ coi là đã đối chiếu)', checkYKienWco(item, '8414', { doiChieu: true }) === 'khong-co-kho-rieng-de-doi-chieu');
  assert('yKienWco: hình dạng sai bị loại dù thiếu kho', /nguon-khong-khop/.test(checkYKienWco({ ...item, nguon: 'wco-op.841451.2' }, '8414')) && checkYKienWco({ ...item, moTa: 'ngắn' }, '8414') === 'mo-ta-do-dai' && checkYKienWco({ ...item, moTa: 'Quạt điện cầm tay vỏ plastic, đường kính 12 cm không nêu mã' }, '8414') === 'mo-ta-khong-neu-ma' && /hs-khong-thuoc-nhom/.test(checkYKienWco(item, '8415')));

  // 2) có kho riêng: đối chiếu thật
  process.env.HS_WCO_OP_FILE = opF; process.env.HS_WCO_TRICH_FILE = trF; wcoOpLib.reset(); resetWcoCache();
  assert('yKienWco: có kho riêng, mục đúng → đạt', checkYKienWco(item, '8414', { doiChieu: true }) === null);
  assert('yKienWco: năm không khớp kho → loại', checkYKienWco({ ...item, namThongQua: 2020 }, '8414') === 'nam-khong-khop-kho');
  assert('yKienWco: ý kiến chưa qua cổng mã (headingSuspect) → loại', checkYKienWco({ ...item, thuTuTrongMa: 2, nguon: 'wco-op.841451.2' }, '8414') === 'y-kien-chua-qua-cong-ma');
  assert('yKienWco: ý kiến không có trong kho → loại', checkYKienWco({ ...item, thuTuTrongMa: 9, nguon: 'wco-op.841451.9' }, '8414') === 'y-kien-khong-co-trong-kho');
  assert('yKienWco: dấu vết không khớp câu trích → loại', checkYKienWco({ ...item, dauVet: '0000000000000000' }, '8414') === 'dau-vet-khong-khop-trich');
  fs.writeFileSync(trF, JSON.stringify({ 'wco-op.841451.1': 'A foldable fan made of paper and bamboo' })); resetWcoCache();
  assert('yKienWco: câu trích không có trong ý kiến → loại', checkYKienWco(item, '8414') === 'trich-khong-co-trong-y-kien');
  fs.writeFileSync(trF, JSON.stringify({ 'wco-op.841451.1': TRICH })); resetWcoCache();
  assert('yKienWco: số trong moTa không có trong ý kiến → loại', /mo-ta-co-so-khong-co-trong-y-kien:15/.test(checkYKienWco({ ...item, moTa: 'Quạt điện cầm tay vỏ plastic, đường kính 15 cm → mã 8414.51' }, '8414')));
  const vr = verifySoTay({ yKienWco: [item, { ...item, namThongQua: 2020 }] }, '8414', {}, { doiChieuWco: true });
  assert('verifySoTay: giữ mục yKienWco đạt, loại mục sai, ghi nguồn', vr.dat === 1 && vr.tong === 2 && vr.soTay.yKienWco.length === 1 && vr.soTay.dungTuNguon.includes('wco-op.841451.1') && vr.loai[0].kind === 'yKienWco');
  delete process.env.HS_WCO_OP_FILE; delete process.env.HS_WCO_TRICH_FILE; wcoOpLib.reset(); resetWcoCache();
  fs.rmSync(tmp, { recursive: true, force: true });
}

// Dựng lại nhóm không được làm mất yKienWco đã nạp
{
  const old = { nhom: '8414', yKienWco: [{ nguon: 'wco-op.841451.1' }, { nguon: 'wco-op.841451.2' }], kiemTra: { tong: 5 } };
  const fresh = { nhom: '8414', dungTuNguon: ['ch84.chuong'], kiemTra: { tong: 7, dat: 6, loai: 1 }, yKienWco: [{ nguon: 'bịa' }] };
  const m = carryOverYKienWco(old, fresh);
  assert('carryOver: giữ yKienWco cũ, bỏ yKienWco do bản dựng mới tự đưa vào', m.yKienWco.length === 2 && m.yKienWco[0].nguon === 'wco-op.841451.1');
  assert('carryOver: cộng vào kiemTra và dungTuNguon, không sửa tham số', m.kiemTra.tong === 9 && m.kiemTra.dat === 8 && m.dungTuNguon.includes('wco-op.841451.2') && fresh.kiemTra.tong === 7 && fresh.dungTuNguon.length === 1);
  const none = carryOverYKienWco(null, fresh);
  assert('carryOver: nhóm chưa có file cũ → không có yKienWco', !('yKienWco' in none) && none.kiemTra.tong === 7);
}

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
