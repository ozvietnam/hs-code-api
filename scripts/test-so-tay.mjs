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
  const old = { nhom: '8414', yKienWco: [{ nguon: 'wco-op.841451.1' }, { nguon: 'wco-op.841451.2' }], yKienWcoDayDu: false, kiemTra: { tong: 5 } };
  const fresh = { nhom: '8414', dungTuNguon: ['ch84.chuong'], kiemTra: { tong: 7, dat: 6, loai: 1 }, yKienWco: [{ nguon: 'bịa' }] };
  const m = carryOverYKienWco(old, fresh);
  assert('carryOver: giữ yKienWco cũ, bỏ yKienWco do bản dựng mới tự đưa vào', m.yKienWco.length === 2 && m.yKienWco[0].nguon === 'wco-op.841451.1');
  assert('carryOver: cộng vào kiemTra và dungTuNguon, không sửa tham số', m.kiemTra.tong === 9 && m.kiemTra.dat === 8 && m.dungTuNguon.includes('wco-op.841451.2') && fresh.kiemTra.tong === 7 && fresh.dungTuNguon.length === 1);
  assert('carryOver: giữ cờ yKienWcoDayDu (danh sách chưa đủ)', m.yKienWcoDayDu === false);
  const none = carryOverYKienWco(null, fresh);
  assert('carryOver: nhóm chưa có file cũ → không có yKienWco', !('yKienWco' in none) && none.kiemTra.tong === 7);
}


// ── #236 việc 2: nhãn loại nguồn + cây + tiêu chí 6 số + tên điền + máy kiểm cây ──
{
  const { buildCay, phamViLoaiKhac, kiemCay, checkTieuChi } = require('../lib/so-tay.js');
  const r2 = verifySoTay(ok, '8509', src);
  assert('nguonLoai: mục soạn thiếu nhãn → máy gán AI_DA_KIEM; NGUOI_DUYET giữ nguyên',
    r2.soTay.dieuKienVao[0].nguonLoai === 'AI_DA_KIEM' && r2.soTay.dong8[0].nguonLoai === 'AI_DA_KIEM'
    && verifySoTay({ dong8: [{ ...ok.dong8[0], nguonLoai: 'NGUOI_DUYET' }] }, '8509', src).soTay.dong8[0].nguonLoai === 'NGUOI_DUYET');
  assert('nguonLoai AI_CHUA_KIEM hoặc nhãn lạ → loại', why('dong8', { ...ok.dong8[0], nguonLoai: 'AI_CHUA_KIEM' }) === 'nguon-loai-khong-hop-le:AI_CHUA_KIEM' && /nguon-loai-khong-hop-le/.test(why('phamVi', { ...ok.phamVi, nguonLoai: 'XYZ' })));
  const cay = buildCay('8509');
  assert('cay: máy sinh từ hs-tree, nhãn MAY_SUY, có nhóm + lá 85098010, cha của lá đúng chữ số', cay.nguonLoai === 'MAY_SUY' && cay.nut[0].id === '8509' && cay.nut.some((n) => n.id === '85098010' && n.cap === 8 && n.cha) && cay.nut.every((n) => n.id === '8509' || n.cha));
  assert('verifySoTay luôn kèm cay (tenDien rỗng khi không soạn) và tieuChi6: []', Array.isArray(r2.soTay.cay?.nut) && r2.soTay.cay.tenDien.length === 0 && Array.isArray(r2.soTay.tieuChi6));
  assert('phamViLoaiKhac: dòng Loại khác → MAY_SUY với cha/truAnhEm; dòng có tên → không có',
    verifySoTay({ dong8: [{ hs: '85098090', dieuKien: 'còn lại', nguon: 'tax.85098090', trich: 'Loại khác' }] }, '8509', src).soTay.dong8[0].phamViLoaiKhac?.nguonLoai === 'MAY_SUY'
    && phamViLoaiKhac('85098090').truAnhEm.includes('85098010') && !r2.soTay.dong8[0].phamViLoaiKhac);
  assert('phamViLoaiKhac 39269099: truAnhEm tầng gần (hợp đồng cũ) + truDayDu đủ hai tầng (Đợt 0A)',
    phamViLoaiKhac('39269099').truAnhEm.join() === '39269091,39269092,39269093' && phamViLoaiKhac('39269099').truDayDu.length === 10 && phamViLoaiKhac('39269099').truDayDu.includes('39269010'));
  // tiêu chí 6 số: 8504 có phân nhóm 850421 (≤ 650 kVA); nguồn wco.850421 có số 650
  const src4 = sourcesFor('8504');
  const tc = { hs6: '850421', fact: 'cong_suat_kva', op: '<=', value: 650, donVi: 'kVA', nguon: 'wco.850421', trich: 'having a power handling capacity not exceeding 650kVA' };
  assert('tieuChi6 hợp lệ (phân nhóm có trong cây, nguồn wco, số có trong trích) → đạt', checkItem('tieuChi6', tc, src4, '8504') === null);
  assert('tieuChi6: phân nhóm không thuộc nhóm / không có trong cây bị loại', /hs6-khong-co-trong-cay/.test(checkItem('tieuChi6', { ...tc, hs6: '850921' }, src4, '8504')) && /hs6-khong-co-trong-cay/.test(checkItem('tieuChi6', { ...tc, hs6: '850499' }, src4, '8504')));
  assert('tieuChi6: ngưỡng số không có trong trích / op lạ / fact không snake_case bị loại', /nguong-khong-co-trong-trich/.test(checkItem('tieuChi6', { ...tc, value: 750 }, src4, '8504')) && /op-khong-hop-le/.test(checkItem('tieuChi6', { ...tc, op: '~' }, src4, '8504')) && /fact-khong-hop-le/.test(checkItem('tieuChi6', { ...tc, fact: 'Công suất' }, src4, '8504')));
  // 7019.12 là dòng lá 70191200 = chính phân nhóm WCO (laPhanNhom): tiêu chí chú giải phân nhóm vẫn đặt được ở cấp 6
  const src19 = sourcesFor('7019');
  assert('tieuChi6 cho phân nhóm là dòng lá xxxxxx00 (laPhanNhom) → đạt; kiemCay báo phân nhóm dạng này chưa có tiêu chí',
    checkItem('tieuChi6', { hs6: '701912', fact: 'dang_soi_tho', op: '=', value: true, nguon: 'wco.701912', trich: 'Rovings' }, { ...src19, 'wco.701912': 'Rovings' }, '7019') === null
    && kiemCay({}, '7019').canhBao.includes('phan-nhom-chua-co-tieu-chi:701912') && buildCay('7019').nut.find((n) => n.id === '70191200')?.laPhanNhom === '701912');
  assert('tieuChi6 lấy từ dòng 8 số (tax.*) bị loại', checkItem('tieuChi6', { ...tc, nguon: 'tax.85042111', trich: 'Máy biến đổi đo lường' }, src4, '8504') === 'tieu-chi-6-khong-lay-tu-dong-8');
  assert('dong8.tieuChi: số phải có trong câu trích; không có tieuChi vẫn đạt', /nguong-khong-co-trong-trich/.test(checkItem('dong8', { hs: '85042111', dieuKien: 'x', tieuChi: { fact: 'cong_suat_kva', op: '<=', value: 2, donVi: 'kVA' }, nguon: 'tax.85042111', trich: 'Máy biến đổi đo lường (1) loại công suất danh định không quá 1 kVA' }, src4, '8504')) && checkTieuChi({ fact: 'cong_suat_kva', op: '<=', value: 1 }, 'không quá 1 kVA') === null);
  // tên điền cho nút bị lược: 8504211 là tiêu đề quốc gia suyRa trong cây 8504
  const td = { id: '8504211', tenVi: 'Máy biến đổi đo lường', nguon: 'tax.85042111', trich: 'Máy biến đổi đo lường' };
  const rt = verifySoTay({ cay: { tenDien: [td, { ...td, id: '8504' }, { ...td, id: '85042111' }, { ...td, id: '8504219', trich: 'câu bịa' }] } }, '8504', src4);
  assert('tenDien: nút ảo + trích có trong nguồn → đạt, nhãn AI_DA_KIEM; nút đã có tên / lá 8 số / trích bịa bị loại',
    rt.soTay.cay.tenDien.length === 1 && rt.soTay.cay.tenDien[0].id === '8504211' && rt.soTay.cay.tenDien[0].nguonLoai === 'AI_DA_KIEM'
    && rt.loai.map((x) => x.lyDo.split(':')[0]).sort().join() === 'nut-da-co-ten,nut-khong-co-trong-cay,trich-khong-co-trong-nguon', rt.loai.map((x) => x.lyDo).join());
  assert('cay.nut: nút ảo 8504211 nay có tên NGUYÊN VĂN từ biểu thuế Tổng cục (data/bieu-thue), vẫn suyRa (cấu trúc suy từ chữ số); nút 85235 (8523) chưa có nguồn thì tenVi null', /Máy ổn áp từng nấc/.test(rt.soTay.cay.nut.find((n) => n.id === '8504211').tenVi) && rt.soTay.cay.nut.find((n) => n.id === '8504211').suyRa === true && buildCay('8523').nut.find((n) => n.id === '85235').tenVi === null, rt.soTay.cay.nut.find((n) => n.id === '8504211'));
  // máy kiểm cây
  const k0 = kiemCay(rt.soTay, '8504');
  assert('kiemCay: sổ tay vừa dựng khớp cây → 0 lỗi; báo dong8 thiếu + phân nhóm chưa tiêu chí; 8504 không còn nút ảo chưa tên (biểu thuế đã đặt), 8523 còn 85235', k0.loi.length === 0 && k0.canhBao.some((c) => c.startsWith('dong8-thieu:')) && !k0.canhBao.some((c) => c.startsWith('nut-ao-chua-co-ten:')) && k0.canhBao.some((c) => c.startsWith('phan-nhom-chua-co-tieu-chi:')) && kiemCay({}, '8523').canhBao.includes('nut-ao-chua-co-ten:85235'), k0.canhBao.filter((c) => c.startsWith('nut-ao')));
  assert('tenDien cho phân nhóm 6 số/nút ảo đã có tên biểu thuế vẫn được nhận, kiemCay chỉ báo trùng', checkItem('tenDien', { id: '850421', tenVi: 'Có công suất danh định không quá 650 kVA', nguon: 'tax.85042111', trich: 'Máy biến đổi đo lường' }, src4, '8504') === null && kiemCay({ cay: { tenDien: [{ id: '8504211' }] } }, '8504').canhBao.includes('ten-dien-trung-bieu-thue:8504211'));
  const lech = JSON.parse(JSON.stringify(rt.soTay)); lech.cay.nut.find((n) => n.id === '85042111').cha = '8504'; lech.cay.nut.push({ id: '85049999', cap: 8, cha: '8504' }); lech.cay.nut.splice(1, 1);
  const k1 = kiemCay(lech, '8504');
  assert('kiemCay: cha lệch / nút không còn / thiếu nút → lỗi đỏ', k1.loi.some((l) => l === 'cay-lech-nut:85042111') && k1.loi.some((l) => l === 'cay-nut-khong-con:85049999') && k1.loi.some((l) => l.startsWith('cay-thieu-nut:')));
  assert('kiemCay: dong8/tenDien trỏ mã không có trong cây → lỗi đỏ; thiếu khối cay → chỉ báo', kiemCay({ dong8: [{ hs: '85049999' }], cay: { tenDien: [{ id: '8504999' }] } }, '8504').loi.sort().join() === 'dong8-khong-co-trong-cay:85049999,ten-dien-nut-khong-co:8504999' && kiemCay({}, '8504').canhBao.includes('chua-co-khoi-cay') && kiemCay({}, '8504').loi.length === 0);
}

// ── #573 (L1-3b): dieuKienSo mới theo tu-vung@1 — CO/KHONG/TRONG/TEN_LOAI/CONG_DUNG, số/LA trên khoá tu-vung, dieuKienNut ──
{
  const { kiemCay } = require('../lib/so-tay.js');
  const s14 = sourcesFor('8414'); const s15 = sourcesFor('8515'); const s44 = sourcesFor('8544');
  const d91 = { hs: '84145191', dieuKien: 'có lưới bảo vệ', nguon: 'tax.84145191', trich: 'Có lưới bảo vệ', dieuKienSo: [{ fact: 'coLuoiBaoVe', op: 'CO' }] };
  assert('L1-3b: dòng 8 số { fact CO_KHONG, op CO } + trích có chữ → hợp lệ', checkItem('dong8', d91, s14, '8414') === null);
  assert('L1-3b: trích không có chữ của khoá → dieu-kien-so-co-khong-co-trong-trich', String(checkItem('dong8', { ...d91, nguon: 'tax.84145110', trich: 'Quạt bàn và quạt dạng hộp' }, s14, '8414')).startsWith('dieu-kien-so-co-khong-co-trong-trich'));
  assert('L1-3b: fact không có trong tu-vung@1 (op mới) → lỗi', String(checkItem('dong8', { ...d91, dieuKienSo: [{ fact: 'co_luoi_bao_ve', op: 'CO' }] }, s14, '8414')).startsWith('dieu-kien-so-fact-khong-co-trong-tu-vung'));
  const d10 = { hs: '85153910', dieuKien: 'điện xoay chiều', nguon: 'tax.85153910', trich: 'Máy hàn hồ quang dùng điện xoay chiều, kiểu biến thế', dieuKienSo: [{ fact: 'loaiDongDien', op: 'TRONG', value: ['XOAY_CHIEU'] }] };
  assert('L1-3b: TRONG hợp lệ; giá trị ngoài giaTriHopLe → lỗi', checkItem('dong8', d10, s15, '8515') === null
    && checkItem('dong8', { ...d10, dieuKienSo: [{ fact: 'loaiDongDien', op: 'TRONG', value: ['BA_PHA'] }] }, s15, '8515') === 'dieu-kien-so-trong-gia-tri-ngoai-danh-sach:BA_PHA');
  assert('L1-3b: TEN_LOAI nguyên văn trong trích → hợp lệ', checkItem('dong8', { hs: '84145110', dieuKien: 'quạt bàn', nguon: 'tax.84145110', trich: 'Quạt bàn và quạt dạng hộp', dieuKienSo: [{ fact: 'tenLoai', op: 'TEN_LOAI', value: ['quạt bàn', 'quạt dạng hộp'] }] }, s14, '8414') === null);
  assert('L1-3b: CONG_DUNG nguyên văn trong trích → hợp lệ', checkItem('dong8', { hs: '85444232', dieuKien: 'cho xe', nguon: 'tax.85444232', trich: 'Cho xe thuộc nhóm 87.02, 87.03, 87.04 hoặc 87.11', dieuKienSo: [{ fact: 'dungCho', op: 'CONG_DUNG', value: 'xe thuộc nhóm 87.02, 87.03, 87.04 hoặc 87.11' }] }, s44, '8544') === null);
  const d94 = { hs: '85444294', dieuKien: 'plastic, lõi ≤ 5 mm', nguon: 'tax.85444294', trich: 'Cáp điện cách điện bằng plastic, trong đó mỗi lõi có đường kính không quá 5 mm', dieuKienSo: [{ fact: 'chatLieu', op: 'LA', value: 'plastic', viTri: 'CACH_DIEN' }, { fact: 'duongKinhLoi', op: '<=', value: 5, donVi: 'mm' }] };
  assert('L1-3b: số + LA theo vị trí trên khoá tu-vung → hợp lệ', checkItem('dong8', d94, s44, '8544') === null);
  assert('L1-3b: dòng "Loại khác" TRẦN vẫn không mang điều kiện', checkItem('dong8', { hs: '84145199', dieuKien: 'x', nguon: 'tax.84145199', trich: 'Loại khác', dieuKienSo: [{ fact: 'coLuoiBaoVe', op: 'KHONG' }] }, s14, '8414') === 'dieu-kien-so-tren-dong-loai-khac');
  const d13 = { hs: '85444213', dieuKien: 'Loại khác, cách điện cao su/plastic/giấy', nguon: 'tax.85444213', trich: 'Loại khác, cách điện bằng cao su, plastic hoặc giấy', loaiKhac: true };
  assert('L1-3b: "Loại khác, <vế>" mang được điều kiện CÓ KIỂU cho vế (không được dùng định dạng cũ)',
    checkItem('dong8', { ...d13, dieuKienSo: [{ fact: 'chatLieu', op: 'LA', value: ['cao su', 'plastic', 'giấy'], viTri: 'CACH_DIEN' }] }, s44, '8544') === null
    && checkItem('dong8', { ...d13, dieuKienSo: [{ fact: 'chat_lieu', op: 'LA', value: 'plastic' }] }, s44, '8544') === 'dieu-kien-so-tren-dong-loai-khac');
  // Điều kiện của TIÊU ĐỀ (nút 7/5 số) — nguồn tieuDe.<id> = tên nguyên văn của biểu thuế Tổng cục (lib/hs-tree.js ← data/bieu-thue)
  const nut = { id: '8544421', nguon: 'tieuDe.8544421', trich: 'Dùng cho viễn thông, điện áp không quá 80 V', dieuKienSo: [{ fact: 'dungCho', op: 'CONG_DUNG', value: 'viễn thông' }, { fact: 'dienAp', op: '<=', value: 80, donVi: 'V' }] };
  const vn = verifySoTay({ dieuKienNut: [nut, { ...nut, id: '85444294' }, { ...nut, id: '8544429', nguon: 'tieuDe.8544429', trich: 'Loại khác', dieuKienSo: [{ fact: 'coCachDien', op: 'CO' }] }, { ...nut, dieuKienSo: [{ fact: 'dien_ap', op: '<=', value: 80, donVi: 'V' }] }, { ...nut, trich: 'Dùng cho viễn thông, điện áp không quá 81 V' }] }, '8544');
  assert('L1-3b: dieuKienNut — tiêu đề + trích nguyên văn → đạt; lá 8 số / tiêu đề "Loại khác" trần / fact cũ / trích bịa → loại',
    vn.dat === 1 && vn.soTay.dieuKienNut?.[0]?.id === '8544421' && vn.soTay.dieuKienNut[0].nguonLoai === 'AI_DA_KIEM' && vn.soTay.dungTuNguon.includes('tieuDe.8544421')
    && vn.loai.map((x) => x.lyDo.split(':')[0]).sort().join() === 'dieu-kien-nut-chi-nhan-fact-tu-vung,dieu-kien-nut-khong-phai-tieu-de,dieu-kien-nut-tren-tieu-de-loai-khac,trich-khong-co-trong-nguon', vn.loai.map((x) => x.lyDo).join());
  assert('L1-3b: sổ tay không có dieuKienNut → bản kiểm không thêm khoá (dữ liệu cũ y nguyên); nguồn tieuDe.* không lọt vào sourcesFor',
    !('dieuKienNut' in verifySoTay({ dong8: [d91] }, '8414', s14).soTay) && !Object.keys(s44).some((k) => k.startsWith('tieuDe.')));
  assert('L1-3b: kiemCay — dieuKienNut trỏ nút không có trong cây → lỗi đỏ', kiemCay({ dieuKienNut: [{ id: '8544499' }] }, '8544').loi.includes('dieu-kien-nut-khong-co-trong-cay:8544499'));
}

// ── OZV-1968: fallback duongKinh phân biệt "đường kính trong" (7306) và "đường kính ngoài của thân" (7318) ──
{
  const { danhGiaDong, loadSoTay } = require('../lib/so-tay-gates.js');
  const d73063011 = loadSoTay('7306').dong8.find((d) => d.hs === '73063011');
  const d73181210 = loadSoTay('7318').dong8.find((d) => d.hs === '73181210');
  const rTrong = danhGiaDong(d73063011, 'Với đường kính trong dưới 12,5 mm');
  const rNgoai7306 = danhGiaDong(d73063011, 'Với đường kính ngoài 10 mm');
  const rThanThoa = danhGiaDong(d73181210, 'Đường kính ngoài của thân không quá 16 mm');
  const rThanTrai = danhGiaDong(d73181210, 'Đường kính ngoài của thân 20 mm');
  const t0 = Date.now();
  const rRedos = danhGiaDong(d73181210, `${'đường kính ngoài của '.repeat(40000)}10 mm`);
  const dt = Date.now() - t0;
  assert(
    'OZV-1968: 73063011 (duongKinh) không ăn nhầm "đường kính trong" nhưng khớp "đường kính ngoài"; 73181210 khớp "Đường kính ngoài của thân" (THOA/TRAI) và ReDoS 40k từ < 2s',
    rTrong.trangThai === 'CHUA_BIET'
      && rNgoai7306.trangThai === 'THOA'
      && rThanThoa.trangThai === 'THOA'
      && rThanTrai.trangThai === 'TRAI'
      && rRedos.trangThai === 'THOA'
      && dt < 2000,
    JSON.stringify({ rTrong: rTrong.trangThai, rNgoai7306: rNgoai7306.trangThai, rThanThoa: rThanThoa.trangThai, rThanTrai: rThanTrai.trangThai, rRedos: rRedos.trangThai, dt }),
  );
}

// ── OZV-2145: Cạnh loại trừ 2 chiều 59.11 <-> 59.07 cho ca 195 'Cổ bạt mềm khớp nối ống gió' ──
{
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const moTa195 = 'Cổ bạt mềm / Vải canvas phủ silicon chống cháy / Khớp nối ống gió';
  const st5911 = loadSoTay('5911');
  const st5907 = loadSoTay('5907');
  const lt5911 = (st5911?.loaiTru || []).find((x) => x.sangNhom === '5907' && x.canCuLoaiTru?.nguon === 'nhom5907.nhom' && /vải canvas|silicon/i.test(x.dieuKien || ''));
  const lt5907 = (st5907?.loaiTru || []).find((x) => x.sangNhom === '5911' && x.canCuLoaiTru?.nguon === 'nhom5911.nhom' && /cổ bạt mềm|khớp nối ống gió/i.test(x.dieuKien || ''));
  const v5911 = verifySoTay(st5911, '5911', sourcesFor('5911'));
  const v5907 = verifySoTay(st5907, '5907', sourcesFor('5907'));
  assert(
    'OZV-2145: sổ tay 5911 và 5907 có loaiTru 2 chiều 5911 <-> 5907 kèm canCuLoaiTru nguyên văn đạt 100% checkItem & verifySoTay',
    Boolean(lt5911 && lt5911.nguon === 'nhom5911.nhom' && checkItem('loaiTru', lt5911, sourcesFor('5911'), '5911') === null)
      && Boolean(lt5907 && lt5907.nguon === 'nhom5907.nhom' && checkItem('loaiTru', lt5907, sourcesFor('5907'), '5907') === null)
      && lt5911.dieuKien !== lt5907.dieuKien
      && !/;/.test(lt5911.dieuKien)
      && !/;/.test(lt5907.dieuKien)
      && v5911.loai.length === 0 && v5911.dat === v5911.tong && st5911.kiemTra?.tong === v5911.tong && st5911.kiemTra?.dat === v5911.dat
      && v5907.loai.length === 0 && v5907.dat === v5907.tong && st5907.kiemTra?.tong === v5907.tong && st5907.kiemTra?.dat === v5907.dat,
    JSON.stringify({ lt5911: Boolean(lt5911), lt5907: Boolean(lt5907), loai5911: v5911.loai, loai5907: v5907.loai }),
  );

  const c5Tu5911 = D.canhTu('5911', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5907');
  const c5Tu5907 = D.canhTu('5907', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5911');
  const c6Tu5911 = D.canhTu('5911', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5907');
  const c6Tu5907 = D.canhTu('5907', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5911');
  const giua = D.canhGiuaNhomConSong(['5911', '5907']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu5911 = D.moRongUngVien(['5911'], moTa195);
  const mrTu5907 = D.moRongUngVien(['5907'], moTa195);
  assert(
    'OZV-2145: đồ thị C5/C6, canhGiuaNhomConSong, nhomLienQuanSoTay và moRongUngVien nối 2 chiều 5911 <-> 5907 cho ca 195',
    c5Tu5911.some((e) => e.nguon === 'nhom5911.nhom' && e.canCuLoaiTru?.nguon === 'nhom5907.nhom')
      && c5Tu5907.some((e) => e.nguon === 'nhom5907.nhom' && e.canCuLoaiTru?.nguon === 'nhom5911.nhom')
      && c6Tu5911.length >= 1
      && c6Tu5907.length >= 1
      && giua.length >= 2
      && nhomLienQuanSoTay('5911').includes('5907')
      && nhomLienQuanSoTay('5907').includes('5911')
      && mrTu5911.some((x) => x.nhom === '5907')
      && mrTu5907.some((x) => x.nhom === '5911'),
    JSON.stringify({ c5Tu5911: c5Tu5911.length, c5Tu5907: c5Tu5907.length, mrTu5911, mrTu5907 }),
  );

  const pb5911 = cauPhanBietNhom('5911', ['5911', '5907'], moTa195);
  const pb5907 = cauPhanBietNhom('5907', ['5907', '5911'], moTa195);
  const g5911 = soTayGates({ hs: '59119090', productText: moTa195, productName: moTa195, pool: [{ h4: '5907', from: 'test' }] });
  const g5907 = soTayGates({ hs: '59070060', productText: moTa195, productName: moTa195, pool: [{ h4: '5911', from: 'test' }] });
  const ht195 = phanTichHoiTruoc4So({ moTa: moTa195, ungVien: ['5911', '5907'] });
  assert(
    'OZV-2145 (thuận): cauPhanBietNhom, soTayGates và phanTichHoiTruoc4So hoạt động đúng 2 chiều 59.11 <-> 59.07 cho ca 195',
    pb5911.length === 1 && pb5911[0].canCu === 'so-tay' && pb5911[0].nguon === 'nhom5911.nhom' && /59\.07/.test(pb5911[0].questionVi)
      && pb5907.length === 1 && pb5907[0].canCu === 'so-tay' && pb5907[0].nguon === 'nhom5907.nhom' && /59\.11/.test(pb5907[0].questionVi)
      && (g5911.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '5907')
      && (g5907.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '5911')
      && ht195.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && new Set((ht195.nhanh || []).map((n) => n.dieuKien)).size === 2
      && Boolean(ht195.dapAnDieuKien && ht195.dapAnDieuKien.includes('→ nhóm 5911 (') && ht195.dapAnDieuKien.includes('→ nhóm 5907 ('))
      && Boolean(ht195.cauHoi),
    JSON.stringify({ pb5911, pb5907, g5911: g5911.challenges, g5907: g5907.challenges, ht195: ht195.dapAnDieuKien }),
  );

  const dcMiengDem = 'Miếng đệm và miếng chèn bằng phớt dùng làm kín trục máy';
  const dcPhongCanh = 'Phông cảnh vẽ cho rạp hát và phông trường quay';
  const pbDc5911 = cauPhanBietNhom('5911', ['5911', '5907'], dcMiengDem);
  const pbDc5907 = cauPhanBietNhom('5907', ['5907', '5911'], dcPhongCanh);
  const gDc5911 = soTayGates({ hs: '59119010', productText: dcMiengDem, productName: dcMiengDem });
  const gDc5907 = soTayGates({ hs: '59070090', productText: dcPhongCanh, productName: dcPhongCanh });
  assert(
    'OZV-2145 (đối chứng): miếng đệm phớt kỹ thuật và phông cảnh trường quay không hỏi oan / không kéo oan 59.11 <-> 59.07',
    pbDc5911.length === 0
      && pbDc5907.length === 0
      && !(gDc5911.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '5907')
      && !(gDc5907.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '5911')
      && !D.moRongUngVien(['5911'], dcMiengDem).some((x) => x.nhom === '5907')
      && !D.moRongUngVien(['5907'], dcPhongCanh).some((x) => x.nhom === '5911'),
    JSON.stringify({ pbDc5911, pbDc5907, gDc5911: gDc5911.challenges, gDc5907: gDc5907.challenges }),
  );
}

// ── OZV-2155: Cạnh loại trừ 2 chiều 39.26 <-> 94.04 cho ca 187 'Đệm hơi dã ngoại' ──
{
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const moTa187 = 'Đệm hơi dã ngoại / Vải co giãn, bọt biển, TPU / Dã ngoại';
  const st3926 = loadSoTay('3926');
  const st9404 = loadSoTay('9404');
  const lt3926 = (st3926?.loaiTru || []).find((x) => x.sangNhom === '9404' && x.canCuLoaiTru?.nguon === 'nhom9404.nhom' && /đệm hơi/i.test(x.dieuKien || ''));
  const lt9404 = (st9404?.loaiTru || []).find((x) => x.sangNhom === '3926' && x.canCuLoaiTru?.nguon === 'nhom3926.nhom' && /đệm hơi/i.test(x.dieuKien || ''));
  const v3926 = verifySoTay(st3926, '3926', sourcesFor('3926'));
  const v9404 = verifySoTay(st9404, '9404', sourcesFor('9404'));
  assert(
    'OZV-2155: sổ tay 3926 và 9404 có loaiTru 2 chiều 3926 <-> 9404 kèm canCuLoaiTru nguyên văn đạt 100% checkItem & verifySoTay',
    Boolean(lt3926 && lt3926.nguon === 'ch39.chuong' && checkItem('loaiTru', lt3926, sourcesFor('3926'), '3926') === null)
      && Boolean(lt9404 && lt9404.nguon === 'nhom9404.nhom' && checkItem('loaiTru', lt9404, sourcesFor('9404'), '9404') === null)
      && lt3926.dieuKien !== lt9404.dieuKien
      && !/;/.test(lt3926.dieuKien)
      && !/;/.test(lt9404.dieuKien)
      && v3926.loai.length === 0 && v3926.dat === v3926.tong && st3926.kiemTra?.tong === v3926.tong && st3926.kiemTra?.dat === v3926.dat
      && v9404.loai.length === 0 && v9404.dat === v9404.tong && st9404.kiemTra?.tong === v9404.tong && st9404.kiemTra?.dat === v9404.dat,
    JSON.stringify({ lt3926: Boolean(lt3926), lt9404: Boolean(lt9404), loai3926: v3926.loai, loai9404: v9404.loai }),
  );

  const c5Tu3926 = D.canhTu('3926', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '9404');
  const c5Tu9404 = D.canhTu('9404', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '3926');
  const c6Tu3926 = D.canhTu('3926', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '9404');
  const c6Tu9404 = D.canhTu('9404', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '3926');
  const giua = D.canhGiuaNhomConSong(['3926', '9404']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu3926 = D.moRongUngVien(['3926'], moTa187);
  const mrTu9404 = D.moRongUngVien(['9404'], moTa187);
  assert(
    'OZV-2155: đồ thị C5/C6, canhGiuaNhomConSong, nhomLienQuanSoTay và moRongUngVien nối 2 chiều 3926 <-> 9404 cho ca 187',
    c5Tu3926.some((e) => e.nguon === 'ch39.chuong' && e.canCuLoaiTru?.nguon === 'nhom9404.nhom')
      && c5Tu9404.some((e) => e.nguon === 'nhom9404.nhom' && e.canCuLoaiTru?.nguon === 'nhom3926.nhom')
      && c6Tu3926.length >= 1
      && c6Tu9404.length >= 1
      && giua.length >= 2
      && nhomLienQuanSoTay('3926').includes('9404')
      && nhomLienQuanSoTay('9404').includes('3926')
      && mrTu3926.some((x) => x.nhom === '9404')
      && mrTu9404.some((x) => x.nhom === '3926'),
    JSON.stringify({ c5Tu3926: c5Tu3926.length, c5Tu9404: c5Tu9404.length, mrTu3926, mrTu9404 }),
  );

  const pb3926 = cauPhanBietNhom('3926', ['3926', '9404'], moTa187);
  const pb9404 = cauPhanBietNhom('9404', ['9404', '3926'], moTa187);
  const g3926 = soTayGates({ hs: '39269099', productText: moTa187, productName: moTa187, pool: [{ h4: '9404', from: 'test' }] });
  const g9404 = soTayGates({ hs: '94042120', productText: moTa187, productName: moTa187, pool: [{ h4: '3926', from: 'test' }] });
  const ht187 = phanTichHoiTruoc4So({ moTa: moTa187, ungVien: ['3926', '9404'] });
  assert(
    'OZV-2155 (thuận): cauPhanBietNhom, soTayGates và phanTichHoiTruoc4So hoạt động đúng 2 chiều 39.26 <-> 94.04 cho ca 187',
    pb3926.length === 1 && pb3926[0].canCu === 'so-tay' && pb3926[0].nguon === 'ch39.chuong' && /94\.04/.test(pb3926[0].questionVi)
      && pb9404.length === 1 && pb9404[0].canCu === 'so-tay' && pb9404[0].nguon === 'nhom9404.nhom' && /39\.26/.test(pb9404[0].questionVi)
      && (g3926.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '9404')
      && (g9404.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '3926')
      && ht187.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && new Set((ht187.nhanh || []).map((n) => n.dieuKien)).size === 2
      && Boolean(ht187.dapAnDieuKien && ht187.dapAnDieuKien.includes('→ nhóm 3926 (') && ht187.dapAnDieuKien.includes('→ nhóm 9404 ('))
      && Boolean(ht187.cauHoi),
    JSON.stringify({ pb3926, pb9404, g3926: g3926.challenges, g9404: g9404.challenges, ht187: ht187.dapAnDieuKien }),
  );

  const dcPhaoLuoi = 'Phao cho lưới đánh cá bằng plastic đúc nguyên khối';
  const dcDemLoXo = 'Đệm lò xo bọc vải dùng cho giường ngủ khách sạn';
  const dcChanLong = 'Chăn phủ giường nhồi lông vũ dùng cho khách sạn';
  const pbDc3926 = cauPhanBietNhom('3926', ['3926', '9404'], dcPhaoLuoi);
  const pbDc9404 = cauPhanBietNhom('9404', ['9404', '3926'], dcDemLoXo);
  const pbDcChan9404 = cauPhanBietNhom('9404', ['9404', '3926'], dcChanLong);
  const gDc3926 = soTayGates({ hs: '39269010', productText: dcPhaoLuoi, productName: dcPhaoLuoi });
  const gDc9404 = soTayGates({ hs: '94042910', productText: dcDemLoXo, productName: dcDemLoXo });
  const gDcChan9404 = soTayGates({ hs: '94044000', productText: dcChanLong, productName: dcChanLong });
  assert(
    'OZV-2155 (đối chứng): phao lưới đánh cá bằng plastic, đệm lò xo và chăn nhồi lông không hỏi oan / không kéo oan 39.26 <-> 94.04',
    pbDc3926.length === 0
      && pbDc9404.length === 0
      && pbDcChan9404.length === 0
      && !(gDc3926.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '9404')
      && !(gDc9404.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '3926')
      && !(gDcChan9404.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '3926')
      && !D.moRongUngVien(['3926'], dcPhaoLuoi).some((x) => x.nhom === '9404')
      && !D.moRongUngVien(['9404'], dcChanLong).some((x) => x.nhom === '3926'),
    JSON.stringify({ pbDc3926, pbDc9404, pbDcChan9404, gDc3926: gDc3926.challenges, gDc9404: gDc9404.challenges }),
  );
}

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
