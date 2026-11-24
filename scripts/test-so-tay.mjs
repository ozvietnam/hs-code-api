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

// ── OZV-2165: Cạnh loại trừ 2 chiều 61.04 <-> 61.11 cho ca 176 'Bộ quần áo trẻ em' ──
{
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const moTa176 = 'Bộ quần áo trẻ em / dệt kim cotton 90%, polyester 5% / None';
  const moTa99 = 'Váy liền thân trẻ em gái / Vải dệt kim sợi tổng hợp / Trang phục trẻ em';
  const st6104 = loadSoTay('6104');
  const st6111 = loadSoTay('6111');
  const lt6104 = (st6104?.loaiTru || []).find((x) => x.sangNhom === '6111' && x.canCuLoaiTru?.nguon === 'nhom6111.nhom' && /trẻ em gái|86 cm/i.test(x.dieuKien || ''));
  const lt6111 = (st6111?.loaiTru || []).find((x) => x.sangNhom === '6104' && x.canCuLoaiTru?.nguon === 'nhom6104.nhom' && /trẻ em gái|86 cm/i.test(x.dieuKien || ''));
  const v6104 = verifySoTay(st6104, '6104', sourcesFor('6104'));
  const v6111 = verifySoTay(st6111, '6111', sourcesFor('6111'));
  assert(
    'OZV-2165: sổ tay 6104 và 6111 có loaiTru 2 chiều 6104 <-> 6111 kèm canCuLoaiTru nguyên văn đạt 100% checkItem & verifySoTay',
    Boolean(lt6104 && lt6104.nguon === 'ch61.chuong' && checkItem('loaiTru', lt6104, sourcesFor('6104'), '6104') === null)
      && Boolean(lt6111 && lt6111.nguon === 'nhom6111.nhom' && checkItem('loaiTru', lt6111, sourcesFor('6111'), '6111') === null)
      && lt6104.dieuKien !== lt6111.dieuKien
      && !/;/.test(lt6104.dieuKien)
      && !/;/.test(lt6111.dieuKien)
      && v6104.loai.length === 0 && v6104.dat === v6104.tong && st6104.kiemTra?.tong === v6104.tong && st6104.kiemTra?.dat === v6104.dat
      && v6111.loai.length === 0 && v6111.dat === v6111.tong && st6111.kiemTra?.tong === v6111.tong && st6111.kiemTra?.dat === v6111.dat,
    JSON.stringify({ lt6104: Boolean(lt6104), lt6111: Boolean(lt6111), loai6104: v6104.loai, loai6111: v6111.loai, tong6104: v6104.tong, tong6111: v6111.tong }),
  );

  const c5Tu6104 = D.canhTu('6104', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6111');
  const c5Tu6111 = D.canhTu('6111', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6104');
  const c6Tu6104 = D.canhTu('6104', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6111');
  const c6Tu6111 = D.canhTu('6111', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6104');
  const giua = D.canhGiuaNhomConSong(['6104', '6111']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu6104 = D.moRongUngVien(['6104'], moTa176);
  const mrTu6111 = D.moRongUngVien(['6111'], moTa176);
  assert(
    'OZV-2165: đồ thị C5/C6, canhGiuaNhomConSong, nhomLienQuanSoTay và moRongUngVien nối 2 chiều 6104 <-> 6111 cho ca 176',
    c5Tu6104.some((e) => e.nguon === 'ch61.chuong' && e.canCuLoaiTru?.nguon === 'nhom6111.nhom')
      && c5Tu6111.some((e) => e.nguon === 'nhom6111.nhom' && e.canCuLoaiTru?.nguon === 'nhom6104.nhom')
      && c6Tu6104.length >= 1
      && c6Tu6111.length >= 1
      && giua.length >= 2
      && nhomLienQuanSoTay('6104').includes('6111')
      && nhomLienQuanSoTay('6111').includes('6104')
      && mrTu6104.some((x) => x.nhom === '6111')
      && mrTu6111.some((x) => x.nhom === '6104'),
    JSON.stringify({ c5Tu6104: c5Tu6104.length, c5Tu6111: c5Tu6111.length, mrTu6104, mrTu6111 }),
  );

  const pb6104 = cauPhanBietNhom('6104', ['6104', '6111'], moTa176);
  const pb6111 = cauPhanBietNhom('6111', ['6111', '6104'], moTa176);
  const g6104 = soTayGates({ hs: '61042200', productText: moTa176, productName: moTa176, pool: [{ h4: '6111', from: 'test' }] });
  const g6111 = soTayGates({ hs: '61112000', productText: moTa176, productName: moTa176, pool: [{ h4: '6104', from: 'test' }] });
  const ht176 = phanTichHoiTruoc4So({ moTa: moTa176, ungVien: ['6104', '6111'] });
  const ht99 = phanTichHoiTruoc4So({ moTa: moTa99, ungVien: ['6104', '6111'] });
  assert(
    'OZV-2165 (thuận): cauPhanBietNhom, soTayGates và phanTichHoiTruoc4So hoạt động đúng 2 chiều 61.04 <-> 61.11 cho ca 176 (và ca 99)',
    pb6104.length === 1 && pb6104[0].canCu === 'so-tay' && pb6104[0].nguon === 'ch61.chuong' && /61\.11/.test(pb6104[0].questionVi)
      && pb6111.length === 1 && pb6111[0].canCu === 'so-tay' && pb6111[0].nguon === 'nhom6111.nhom' && /61\.04/.test(pb6111[0].questionVi)
      && (g6104.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '6111')
      && (g6111.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '6104')
      && ht176.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && new Set((ht176.nhanh || []).map((n) => n.dieuKien)).size === 2
      && Boolean(ht176.dapAnDieuKien && ht176.dapAnDieuKien.includes('→ nhóm 6104 (') && ht176.dapAnDieuKien.includes('→ nhóm 6111 ('))
      && Boolean(ht176.cauHoi)
      && ht99.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && Boolean(ht99.dapAnDieuKien && ht99.dapAnDieuKien.includes('→ nhóm 6104 (') && ht99.dapAnDieuKien.includes('→ nhóm 6111 (')),
    JSON.stringify({ pb6104, pb6111, g6104: g6104.challenges, g6111: g6111.challenges, ht176: ht176.dapAnDieuKien, ht99: ht99.dapAnDieuKien }),
  );

  const dcVayNu = 'Váy dài nữ dệt kim từ sợi tổng hợp dùng cho người lớn';
  const dcJacketNu = 'Áo jacket nữ dệt kim từ lông cừu';
  const dcGangTay = 'Găng tay trẻ sơ sinh dệt kim từ bông';
  const pbDc6104 = cauPhanBietNhom('6104', ['6104', '6111'], dcVayNu);
  const pbDc6111 = cauPhanBietNhom('6111', ['6111', '6104'], dcGangTay);
  const pbDcJacket6104 = cauPhanBietNhom('6104', ['6104', '6111'], dcJacketNu);
  const gDc6104 = soTayGates({ hs: '61044300', productText: dcVayNu, productName: dcVayNu });
  const gDc6111 = soTayGates({ hs: '61112000', productText: dcGangTay, productName: dcGangTay });
  assert(
    'OZV-2165 (đối chứng): váy dài nữ, áo jacket nữ và găng tay trẻ sơ sinh không hỏi oan / không kéo oan 61.04 <-> 61.11',
    pbDc6104.length === 0
      && pbDc6111.length === 0
      && pbDcJacket6104.length === 0
      && !(gDc6104.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '6111')
      && !(gDc6111.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '6104')
      && !D.moRongUngVien(['6104'], dcVayNu).some((x) => x.nhom === '6111')
      && !D.moRongUngVien(['6111'], dcGangTay).some((x) => x.nhom === '6104'),
    JSON.stringify({ pbDc6104, pbDc6111, pbDcJacket6104, gDc6104: gDc6104.challenges, gDc6111: gDc6111.challenges }),
  );
}

// ── OZV-2173: Cạnh loại trừ 2 chiều 60.05 <-> 60.06 cho ca 124 'Vải gió dệt kim' ──
{
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const moTa124 = 'Vải gió dệt kim / None / None';
  const st6005 = loadSoTay('6005');
  const st6006 = loadSoTay('6006');
  const lt6005 = (st6005?.loaiTru || []).find((x) => x.sangNhom === '6006' && x.canCuLoaiTru?.nguon === 'nhom6006.nhom' && /vải gió dệt kim/i.test(x.dieuKien || ''));
  const lt6006 = (st6006?.loaiTru || []).find((x) => x.sangNhom === '6005' && x.canCuLoaiTru?.nguon === 'nhom6005.nhom' && /vải gió dệt kim/i.test(x.dieuKien || ''));
  const v6005 = verifySoTay(st6005, '6005', sourcesFor('6005'));
  const v6006 = verifySoTay(st6006, '6006', sourcesFor('6006'));
  assert(
    'OZV-2173: sổ tay 6005 và 6006 có loaiTru 2 chiều 6005 <-> 6006 kèm canCuLoaiTru nguyên văn đạt 100% checkItem & verifySoTay',
    Boolean(lt6005 && lt6005.nguon === 'nhom6005.nhom' && checkItem('loaiTru', lt6005, sourcesFor('6005'), '6005') === null)
      && Boolean(lt6006 && lt6006.nguon === 'nhom6006.nhom' && checkItem('loaiTru', lt6006, sourcesFor('6006'), '6006') === null)
      && lt6005.dieuKien !== lt6006.dieuKien
      && !/;/.test(lt6005.dieuKien)
      && !/;/.test(lt6006.dieuKien)
      && v6005.loai.length === 0 && v6005.dat === v6005.tong && st6005.kiemTra?.tong === v6005.tong && st6005.kiemTra?.dat === v6005.dat
      && v6006.loai.length === 0 && v6006.dat === v6006.tong && st6006.kiemTra?.tong === v6006.tong && st6006.kiemTra?.dat === v6006.dat,
    JSON.stringify({ lt6005: Boolean(lt6005), lt6006: Boolean(lt6006), loai6005: v6005.loai, loai6006: v6006.loai, tong6005: v6005.tong, tong6006: v6006.tong }),
  );

  const c5Tu6005 = D.canhTu('6005', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6006');
  const c5Tu6006 = D.canhTu('6006', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6005');
  const c6Tu6005 = D.canhTu('6005', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6006');
  const c6Tu6006 = D.canhTu('6006', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6005');
  const giua = D.canhGiuaNhomConSong(['6005', '6006']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu6005 = D.moRongUngVien(['6005'], moTa124);
  const mrTu6006 = D.moRongUngVien(['6006'], moTa124);
  assert(
    'OZV-2173: đồ thị C5/C6, canhGiuaNhomConSong, nhomLienQuanSoTay và moRongUngVien nối 2 chiều 6005 <-> 6006 cho ca 124',
    c5Tu6005.some((e) => e.nguon === 'nhom6005.nhom' && e.canCuLoaiTru?.nguon === 'nhom6006.nhom')
      && c5Tu6006.some((e) => e.nguon === 'nhom6006.nhom' && e.canCuLoaiTru?.nguon === 'nhom6005.nhom')
      && c6Tu6005.length >= 1
      && c6Tu6006.length >= 1
      && giua.length >= 2
      && nhomLienQuanSoTay('6005').includes('6006')
      && nhomLienQuanSoTay('6006').includes('6005')
      && mrTu6005.some((x) => x.nhom === '6006')
      && mrTu6006.some((x) => x.nhom === '6005'),
    JSON.stringify({ c5Tu6005: c5Tu6005.length, c5Tu6006: c5Tu6006.length, mrTu6005, mrTu6006 }),
  );

  const pb6005 = cauPhanBietNhom('6005', ['6005', '6006'], moTa124);
  const pb6006 = cauPhanBietNhom('6006', ['6006', '6005'], moTa124);
  const g6005 = soTayGates({ hs: '60053690', productText: moTa124, productName: moTa124, pool: [{ h4: '6006', from: 'test' }] });
  const g6006 = soTayGates({ hs: '60063290', productText: moTa124, productName: moTa124, pool: [{ h4: '6005', from: 'test' }] });
  const ht124 = phanTichHoiTruoc4So({ moTa: moTa124, ungVien: ['6005', '6006'] });
  assert(
    'OZV-2173 (thuận): cauPhanBietNhom, soTayGates và phanTichHoiTruoc4So hoạt động đúng 2 chiều 60.05 <-> 60.06 cho ca 124',
    pb6005.length === 1 && pb6005[0].canCu === 'so-tay' && pb6005[0].nguon === 'nhom6005.nhom' && /60\.06/.test(pb6005[0].questionVi)
      && pb6006.length === 1 && pb6006[0].canCu === 'so-tay' && pb6006[0].nguon === 'nhom6006.nhom' && /60\.05/.test(pb6006[0].questionVi)
      && (g6005.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '6006')
      && (g6006.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '6005')
      && ht124.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && new Set((ht124.nhanh || []).map((n) => n.dieuKien)).size === 2
      && Boolean(ht124.dapAnDieuKien && ht124.dapAnDieuKien.includes('→ nhóm 6005 (') && ht124.dapAnDieuKien.includes('→ nhóm 6006 ('))
      && Boolean(ht124.cauHoi),
    JSON.stringify({ pb6005, pb6006, g6005: g6005.challenges, g6006: g6006.challenges, ht124: ht124.dapAnDieuKien }),
  );

  const dcBangTamThuoc = 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ';
  const dcVaiTheu = 'Vải thêu thuộc nhóm 58.10';
  const dcThamDetKim = 'Các loại thảm dệt kim và thảm trải sàn';
  const pbDc6005 = cauPhanBietNhom('6005', ['6005', '6006'], dcBangTamThuoc);
  const pbDc6006 = cauPhanBietNhom('6006', ['6006', '6005'], dcVaiTheu);
  const pbDcTham6005 = cauPhanBietNhom('6005', ['6005', '6006'], dcThamDetKim);
  const gDc6005 = soTayGates({ hs: '60052100', productText: dcBangTamThuoc, productName: dcBangTamThuoc });
  const gDc6006 = soTayGates({ hs: '60062200', productText: dcVaiTheu, productName: dcVaiTheu });
  assert(
    'OZV-2173 (đối chứng): băng tẩm thuốc, vải thêu và thảm dệt kim không hỏi oan / không kéo oan 60.05 <-> 60.06',
    pbDc6005.length === 0
      && pbDc6006.length === 0
      && pbDcTham6005.length === 0
      && !(gDc6005.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '6006')
      && !(gDc6006.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '6005')
      && !D.moRongUngVien(['6005'], dcBangTamThuoc).some((x) => x.nhom === '6006')
      && !D.moRongUngVien(['6006'], dcVaiTheu).some((x) => x.nhom === '6005'),
    JSON.stringify({ pbDc6005, pbDc6006, pbDcTham6005, gDc6005: gDc6005.challenges, gDc6006: gDc6006.challenges }),
  );
}

// ── OZV-2180: Cạnh loại trừ 2 chiều 59.03 <-> 60.04 cho ca 124 'Vải giả lông thú dệt kim' ──
{
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const moTa124 = 'Vải giả lông thú dệt kim, khổ 1,5m, có tráng lớp nhựa PU mặt sau';
  const moTa124Gio = 'Vải gió dệt kim / None / None';
  const st5903 = loadSoTay('5903');
  const st6004 = loadSoTay('6004');
  const lt5903 = (st5903?.loaiTru || []).find((x) => x.sangNhom === '6004' && x.canCuLoaiTru?.nguon === 'nhom6004.nhom');
  const lt6004 = (st6004?.loaiTru || []).find((x) => x.sangNhom === '5903' && x.canCuLoaiTru?.nguon === 'nhom5903.nhom');
  const v5903 = verifySoTay(st5903, '5903', sourcesFor('5903'));
  const v6004 = verifySoTay(st6004, '6004', sourcesFor('6004'));
  assert(
    'OZV-2180: sổ tay 5903 và 6004 có loaiTru 2 chiều 5903 <-> 6004 kèm canCuLoaiTru nguyên văn đạt 100% checkItem & verifySoTay',
    Boolean(lt5903 && lt5903.nguon === 'nhom5903.nhom' && checkItem('loaiTru', lt5903, sourcesFor('5903'), '5903') === null)
      && Boolean(lt6004 && lt6004.nguon === 'ch60.chuong' && checkItem('loaiTru', lt6004, sourcesFor('6004'), '6004') === null)
      && lt5903.dieuKien !== lt6004.dieuKien
      && !/;/.test(lt5903.dieuKien)
      && !/;/.test(lt6004.dieuKien)
      && v5903.loai.length === 0 && v5903.dat === v5903.tong && st5903.kiemTra?.tong === v5903.tong && st5903.kiemTra?.dat === v5903.dat
      && v6004.loai.length === 0 && v6004.dat === v6004.tong && st6004.kiemTra?.tong === v6004.tong && st6004.kiemTra?.dat === v6004.dat,
    JSON.stringify({ lt5903: Boolean(lt5903), lt6004: Boolean(lt6004), loai5903: v5903.loai, loai6004: v6004.loai, tong5903: v5903.tong, tong6004: v6004.tong }),
  );

  const c5Tu5903 = D.canhTu('5903', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6004');
  const c5Tu6004 = D.canhTu('6004', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5903');
  const c6Tu5903 = D.canhTu('5903', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6004');
  const c6Tu6004 = D.canhTu('6004', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5903');
  const giua = D.canhGiuaNhomConSong(['5903', '6004']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu5903 = D.moRongUngVien(['5903'], moTa124);
  const mrTu6004 = D.moRongUngVien(['6004'], moTa124);
  const mrGioTu5903 = D.moRongUngVien(['5903'], moTa124Gio, { toiDa: 10 });
  const mrGioTu6004 = D.moRongUngVien(['6004'], moTa124Gio, { toiDa: 10 });
  assert(
    'OZV-2180: đồ thị C5/C6, canhGiuaNhomConSong, nhomLienQuanSoTay và moRongUngVien nối 2 chiều 5903 <-> 6004 cho ca 124',
    c5Tu5903.some((e) => e.nguon === 'nhom5903.nhom' && e.canCuLoaiTru?.nguon === 'nhom6004.nhom')
      && c5Tu6004.some((e) => e.nguon === 'ch60.chuong' && e.canCuLoaiTru?.nguon === 'nhom5903.nhom')
      && c6Tu5903.length >= 1
      && c6Tu6004.length >= 1
      && giua.length >= 2
      && nhomLienQuanSoTay('5903').includes('6004')
      && nhomLienQuanSoTay('6004').includes('5903')
      && mrTu5903.some((x) => x.nhom === '6004')
      && mrTu6004.some((x) => x.nhom === '5903')
      && mrGioTu5903.some((x) => x.nhom === '6004')
      && mrGioTu6004.some((x) => x.nhom === '5903'),
    JSON.stringify({ c5Tu5903: c5Tu5903.length, c5Tu6004: c5Tu6004.length, mrTu5903, mrTu6004 }),
  );

  const pb5903 = cauPhanBietNhom('5903', ['5903', '6004'], moTa124);
  const pb6004 = cauPhanBietNhom('6004', ['6004', '5903'], moTa124);
  const pbGio5903 = cauPhanBietNhom('5903', ['5903', '6004'], moTa124Gio);
  const pbGio6004 = cauPhanBietNhom('6004', ['6004', '5903'], moTa124Gio);
  const g5903 = soTayGates({ hs: '59032000', productText: moTa124, productName: moTa124, pool: [{ h4: '6004', from: 'test' }] });
  const g6004 = soTayGates({ hs: '60041010', productText: moTa124, productName: moTa124, pool: [{ h4: '5903', from: 'test' }] });
  const ht124 = phanTichHoiTruoc4So({ moTa: moTa124, ungVien: ['5903', '6004'] });
  assert(
    'OZV-2180 (thuận): cauPhanBietNhom, soTayGates và phanTichHoiTruoc4So hoạt động đúng 2 chiều 59.03 <-> 60.04 cho ca 124',
    pb5903.length === 1 && pb5903[0].canCu === 'so-tay' && pb5903[0].nguon === 'nhom5903.nhom' && /60\.04/.test(pb5903[0].questionVi)
      && pb6004.length === 1 && pb6004[0].canCu === 'so-tay' && pb6004[0].nguon === 'ch60.chuong' && /59\.03/.test(pb6004[0].questionVi)
      && pbGio5903.length === 1 && /60\.04/.test(pbGio5903[0].questionVi)
      && pbGio6004.length === 1 && /59\.03/.test(pbGio6004[0].questionVi)
      && (g5903.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '6004')
      && (g6004.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '5903')
      && ht124.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && new Set((ht124.nhanh || []).map((n) => n.dieuKien)).size === 2
      && Boolean(ht124.dapAnDieuKien && ht124.dapAnDieuKien.includes('→ nhóm 5903 (') && ht124.dapAnDieuKien.includes('→ nhóm 6004 ('))
      && Boolean(ht124.cauHoi),
    JSON.stringify({ pb5903, pb6004, g5903: g5903.challenges, g6004: g6004.challenges, ht124: ht124.dapAnDieuKien }),
  );

  const dcBangTamThuoc = 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ';
  const dcNhanPhuHieu = 'Nhãn, phù hiệu và các mặt hàng tương tự, dệt kim hoặc móc';
  const dcSanPhamChan = 'Sản phẩm dệt đã chần thuộc nhóm 58.11';
  const pbDc5903 = cauPhanBietNhom('5903', ['5903', '6004'], dcBangTamThuoc);
  const pbDc6004 = cauPhanBietNhom('6004', ['6004', '5903'], dcNhanPhuHieu);
  const pbDcChan5903 = cauPhanBietNhom('5903', ['5903', '6004'], dcSanPhamChan);
  const gDc5903 = soTayGates({ hs: '59031010', productText: dcBangTamThuoc, productName: dcBangTamThuoc });
  const gDc6004 = soTayGates({ hs: '60041010', productText: dcNhanPhuHieu, productName: dcNhanPhuHieu });
  assert(
    'OZV-2180 (đối chứng): băng tẩm thuốc, nhãn phù hiệu và sản phẩm dệt đã chần không hỏi oan / không kéo oan 59.03 <-> 60.04',
    pbDc5903.length === 0
      && pbDc6004.length === 0
      && pbDcChan5903.length === 0
      && !(gDc5903.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '6004')
      && !(gDc6004.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '5903')
      && !D.moRongUngVien(['5903'], dcBangTamThuoc).some((x) => x.nhom === '6004')
      && !D.moRongUngVien(['6004'], dcNhanPhuHieu).some((x) => x.nhom === '5903'),
    JSON.stringify({ pbDc5903, pbDc6004, pbDcChan5903, gDc5903: gDc5903.challenges, gDc6004: gDc6004.challenges }),
  );
}

// ── OZV-2187: Cạnh loại trừ 2 chiều 59.07 <-> 63.07 cho ca 195 'Cổ bạt mềm khớp nối ống gió' ──
{
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const moTa195 = 'Cổ bạt mềm / Vải canvas phủ silicon chống cháy / Khớp nối ống gió';
  const st5907 = loadSoTay('5907');
  const st6307 = loadSoTay('6307');
  const lt5907 = (st5907?.loaiTru || []).find((x) => x.sangNhom === '6307' && x.canCuLoaiTru?.nguon === 'nhom6307.nhom' && /cổ bạt mềm|khớp nối ống gió/i.test(x.dieuKien || ''));
  const lt6307 = (st6307?.loaiTru || []).find((x) => x.sangNhom === '5907' && x.canCuLoaiTru?.nguon === 'nhom5907.nhom' && /cổ bạt mềm|khớp nối ống gió/i.test(x.dieuKien || ''));
  const v5907 = verifySoTay(st5907, '5907', sourcesFor('5907'));
  const v6307 = verifySoTay(st6307, '6307', sourcesFor('6307'));
  assert(
    'OZV-2187: sổ tay 5907 và 6307 có loaiTru 2 chiều 5907 <-> 6307 kèm canCuLoaiTru nguyên văn đạt 100% checkItem & verifySoTay',
    Boolean(lt5907 && lt5907.nguon === 'nhom5907.nhom' && checkItem('loaiTru', lt5907, sourcesFor('5907'), '5907') === null)
      && Boolean(lt6307 && lt6307.nguon === 'ch63.chuong' && checkItem('loaiTru', lt6307, sourcesFor('6307'), '6307') === null)
      && lt5907.dieuKien !== lt6307.dieuKien
      && !/;/.test(lt5907.dieuKien)
      && !/;/.test(lt6307.dieuKien)
      && v5907.loai.length === 0 && v5907.dat === v5907.tong && st5907.kiemTra?.tong === v5907.tong && st5907.kiemTra?.dat === v5907.dat
      && v6307.loai.length === 0 && v6307.dat === v6307.tong && st6307.kiemTra?.tong === v6307.tong && st6307.kiemTra?.dat === v6307.dat,
    JSON.stringify({ lt5907: Boolean(lt5907), lt6307: Boolean(lt6307), loai5907: v5907.loai, loai6307: v6307.loai, tong5907: v5907.tong, tong6307: v6307.tong }),
  );

  const c5Tu5907 = D.canhTu('5907', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6307');
  const c5Tu6307 = D.canhTu('6307', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5907');
  const c6Tu5907 = D.canhTu('5907', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6307');
  const c6Tu6307 = D.canhTu('6307', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5907');
  const giua = D.canhGiuaNhomConSong(['5907', '6307']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu5907 = D.moRongUngVien(['5907'], moTa195);
  const mrTu6307 = D.moRongUngVien(['6307'], moTa195);
  assert(
    'OZV-2187: đồ thị C5/C6, canhGiuaNhomConSong, nhomLienQuanSoTay và moRongUngVien nối 2 chiều 5907 <-> 6307 cho ca 195',
    c5Tu5907.some((e) => e.nguon === 'nhom5907.nhom' && e.canCuLoaiTru?.nguon === 'nhom6307.nhom')
      && c5Tu6307.some((e) => e.nguon === 'ch63.chuong' && e.canCuLoaiTru?.nguon === 'nhom5907.nhom')
      && c6Tu5907.length >= 1
      && c6Tu6307.length >= 1
      && giua.length >= 2
      && nhomLienQuanSoTay('5907').includes('6307')
      && nhomLienQuanSoTay('6307').includes('5907')
      && mrTu5907.some((x) => x.nhom === '6307')
      && mrTu6307.some((x) => x.nhom === '5907'),
    JSON.stringify({ c5Tu5907: c5Tu5907.length, c5Tu6307: c5Tu6307.length, mrTu5907, mrTu6307 }),
  );

  const pb5907 = cauPhanBietNhom('5907', ['5907', '6307'], moTa195);
  const pb6307 = cauPhanBietNhom('6307', ['6307', '5907'], moTa195);
  const g5907 = soTayGates({ hs: '59070060', productText: moTa195, productName: moTa195, pool: [{ h4: '6307', from: 'test' }] });
  const g6307 = soTayGates({ hs: '63079090', productText: moTa195, productName: moTa195, pool: [{ h4: '5907', from: 'test' }] });
  const ht195 = phanTichHoiTruoc4So({ moTa: moTa195, ungVien: ['5907', '6307'] });
  assert(
    'OZV-2187 (thuận): cauPhanBietNhom, soTayGates và phanTichHoiTruoc4So hoạt động đúng 2 chiều 59.07 <-> 63.07 cho ca 195',
    pb5907.length === 1 && pb5907[0].canCu === 'so-tay' && pb5907[0].nguon === 'nhom5907.nhom' && /63\.07/.test(pb5907[0].questionVi)
      && pb6307.length === 1 && pb6307[0].canCu === 'so-tay' && pb6307[0].nguon === 'ch63.chuong' && /59\.07/.test(pb6307[0].questionVi)
      && (g5907.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '6307')
      && (g6307.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '5907')
      && ht195.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && new Set((ht195.nhanh || []).map((n) => n.dieuKien)).size === 2
      && Boolean(ht195.dapAnDieuKien && ht195.dapAnDieuKien.includes('→ nhóm 5907 (') && ht195.dapAnDieuKien.includes('→ nhóm 6307 ('))
      && Boolean(ht195.cauHoi),
    JSON.stringify({ pb5907, pb6307, g5907: g5907.challenges, g6307: g6307.challenges, ht195: ht195.dapAnDieuKien }),
  );

  const dcPhongCanh = 'Phông cảnh vẽ cho rạp hát và phông trường quay';
  const dcKhanLau = 'Khăn lau sàn nhà bằng vải dệt';
  const dcAoCuuSinh = 'Áo cứu sinh bằng vải';
  const pbDc5907 = cauPhanBietNhom('5907', ['5907', '6307'], dcPhongCanh);
  const pbDc6307 = cauPhanBietNhom('6307', ['6307', '5907'], dcKhanLau);
  const pbDcAo5907 = cauPhanBietNhom('5907', ['5907', '6307'], dcAoCuuSinh);
  const gDc5907 = soTayGates({ hs: '59070090', productText: dcPhongCanh, productName: dcPhongCanh });
  const gDc6307 = soTayGates({ hs: '63071010', productText: dcKhanLau, productName: dcKhanLau });
  assert(
    'OZV-2187 (đối chứng): phông cảnh trường quay, khăn lau sàn và áo cứu sinh không hỏi oan / không kéo oan 59.07 <-> 63.07',
    pbDc5907.length === 0
      && pbDc6307.length === 0
      && pbDcAo5907.length === 0
      && !(gDc5907.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '6307')
      && !(gDc6307.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '5907')
      && !D.moRongUngVien(['5907'], dcPhongCanh).some((x) => x.nhom === '6307')
      && !D.moRongUngVien(['6307'], dcKhanLau).some((x) => x.nhom === '5907'),
    JSON.stringify({ pbDc5907, pbDc6307, pbDcAo5907, gDc5907: gDc5907.challenges, gDc6307: gDc6307.challenges }),
  );
}

// ── OZV-2194: Cạnh loại trừ 2 chiều 90.13 <-> 85.43 cho ca 162 'Đầu chiếu tia Laser / Chiếu tia sáng chấm đỏ' ──
{
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const moTa162 = 'Đầu chiếu tia Laser / None / Chiếu tia sáng chấm đỏ';
  const st9013 = loadSoTay('9013');
  const st8543 = loadSoTay('8543');
  const lt9013 = (st9013?.loaiTru || []).find((x) => x.sangNhom === '8543' && x.canCuLoaiTru?.nguon === 'nhom8543.nhom' && /đầu chiếu tia laser/i.test(x.dieuKien || ''));
  const lt8543 = (st8543?.loaiTru || []).find((x) => x.sangNhom === '9013' && x.canCuLoaiTru?.nguon === 'nhom9013.nhom' && /đầu chiếu tia laser/i.test(x.dieuKien || ''));
  const v9013 = verifySoTay(st9013, '9013', sourcesFor('9013'));
  const v8543 = verifySoTay(st8543, '8543', sourcesFor('8543'));
  assert(
    'OZV-2194: sổ tay 9013 và 8543 có loaiTru 2 chiều 9013 <-> 8543 kèm canCuLoaiTru nguyên văn đạt 100% checkItem & verifySoTay',
    Boolean(lt9013 && lt9013.nguon === 'nhom9013.nhom' && checkItem('loaiTru', lt9013, sourcesFor('9013'), '9013') === null)
      && Boolean(lt8543 && lt8543.nguon === 'nhom8543.nhom' && checkItem('loaiTru', lt8543, sourcesFor('8543'), '8543') === null)
      && lt9013.dieuKien !== lt8543.dieuKien
      && !/;/.test(lt9013.dieuKien)
      && !/;/.test(lt8543.dieuKien)
      && v9013.loai.length === 0 && v9013.dat === v9013.tong && st9013.kiemTra?.tong === v9013.tong && st9013.kiemTra?.dat === v9013.dat
      && v8543.loai.length === 0 && v8543.dat === v8543.tong && st8543.kiemTra?.tong === v8543.tong && st8543.kiemTra?.dat === v8543.dat,
    JSON.stringify({ lt9013: Boolean(lt9013), lt8543: Boolean(lt8543), loai9013: v9013.loai, loai8543: v8543.loai, tong9013: v9013.tong, tong8543: v8543.tong }),
  );

  const c5Tu9013 = D.canhTu('9013', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8543');
  const c5Tu8543 = D.canhTu('8543', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '9013');
  const c6Tu9013 = D.canhTu('9013', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8543');
  const c6Tu8543 = D.canhTu('8543', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '9013');
  const giua = D.canhGiuaNhomConSong(['9013', '8543']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu9013 = D.moRongUngVien(['9013'], moTa162);
  const mrTu8543 = D.moRongUngVien(['8543'], moTa162);
  assert(
    'OZV-2194: đồ thị C5/C6, canhGiuaNhomConSong, nhomLienQuanSoTay và moRongUngVien nối 2 chiều 9013 <-> 8543 cho ca 162',
    c5Tu9013.some((e) => e.nguon === 'nhom9013.nhom' && e.canCuLoaiTru?.nguon === 'nhom8543.nhom')
      && c5Tu8543.some((e) => e.nguon === 'nhom8543.nhom' && e.canCuLoaiTru?.nguon === 'nhom9013.nhom')
      && c6Tu9013.length >= 1
      && c6Tu8543.length >= 1
      && giua.length >= 2
      && nhomLienQuanSoTay('9013').includes('8543')
      && nhomLienQuanSoTay('8543').includes('9013')
      && mrTu9013.some((x) => x.nhom === '8543')
      && mrTu8543.some((x) => x.nhom === '9013'),
    JSON.stringify({ c5Tu9013: c5Tu9013.length, c5Tu8543: c5Tu8543.length, mrTu9013, mrTu8543 }),
  );

  const pb9013 = cauPhanBietNhom('9013', ['9013', '8543'], moTa162);
  const pb8543 = cauPhanBietNhom('8543', ['8543', '9013'], moTa162);
  const g9013 = soTayGates({ hs: '90132000', productText: moTa162, productName: moTa162, pool: [{ h4: '8543', from: 'test' }] });
  const g8543 = soTayGates({ hs: '85437090', productText: moTa162, productName: moTa162, pool: [{ h4: '9013', from: 'test' }] });
  const ht2 = phanTichHoiTruoc4So({ moTa: moTa162, ungVien: ['9013', '8543'] });
  const ht3 = phanTichHoiTruoc4So({ moTa: moTa162, ungVien: ['9013', '8541', '8543'] });
  assert(
    'OZV-2194 (thuận): cauPhanBietNhom, soTayGates và phanTichHoiTruoc4So hoạt động đúng 2 chiều 90.13 <-> 85.43 (và cụm [9013, 8541, 8543]) cho ca 162',
    pb9013.length === 1 && pb9013[0].canCu === 'so-tay' && pb9013[0].nguon === 'nhom9013.nhom' && /85\.43/.test(pb9013[0].questionVi)
      && pb8543.length === 1 && pb8543[0].canCu === 'so-tay' && pb8543[0].nguon === 'nhom8543.nhom' && /90\.13/.test(pb8543[0].questionVi)
      && (g9013.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '8543')
      && (g8543.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '9013')
      && ht2.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && new Set((ht2.nhanh || []).map((n) => n.dieuKien)).size === 2
      && Boolean(ht2.dapAnDieuKien && ht2.dapAnDieuKien.includes('→ nhóm 9013 (') && ht2.dapAnDieuKien.includes('→ nhóm 8543 ('))
      && Boolean(ht2.cauHoi)
      && ht3.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && new Set((ht3.nhanh || []).map((n) => n.dieuKien)).size === 3
      && Boolean(ht3.dapAnDieuKien && ht3.dapAnDieuKien.includes('→ nhóm 9013 (') && ht3.dapAnDieuKien.includes('→ nhóm 8541 (') && ht3.dapAnDieuKien.includes('→ nhóm 8543 ('))
      && Boolean(ht3.cauHoi),
    JSON.stringify({ pb9013, pb8543, g9013: g9013.challenges, g8543: g8543.challenges, ht2: ht2.dapAnDieuKien, ht3: ht3.dapAnDieuKien }),
  );

  const dcKinhNgam = 'Kính ngắm để lắp vào vũ khí săn bắn';
  const dcMayGiaToc = 'Máy gia tốc hạt truyền động năng cao cho các hạt tích điện';
  const dcMayPhatTinHieu = 'Máy phát tín hiệu tạo ra các tín hiệu điện ở tần số cao';
  const pbDc9013 = cauPhanBietNhom('9013', ['9013', '8543'], dcKinhNgam);
  const pbDc8543 = cauPhanBietNhom('8543', ['8543', '9013'], dcMayGiaToc);
  const pbDcTinHieu8543 = cauPhanBietNhom('8543', ['8543', '9013'], dcMayPhatTinHieu);
  const gDc9013 = soTayGates({ hs: '90131010', productText: dcKinhNgam, productName: dcKinhNgam });
  const gDc8543 = soTayGates({ hs: '85431000', productText: dcMayGiaToc, productName: dcMayGiaToc });
  assert(
    'OZV-2194 (đối chứng): kính ngắm vũ khí, máy gia tốc hạt và máy phát tín hiệu không hỏi oan / không kéo oan 90.13 <-> 85.43',
    pbDc9013.length === 0
      && pbDc8543.length === 0
      && pbDcTinHieu8543.length === 0
      && !(gDc9013.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '8543')
      && !(gDc8543.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '9013')
      && !D.moRongUngVien(['9013'], dcKinhNgam).some((x) => x.nhom === '8543')
      && !D.moRongUngVien(['8543'], dcMayGiaToc).some((x) => x.nhom === '9013'),
    JSON.stringify({ pbDc9013, pbDc8543, pbDcTinHieu8543, gDc9013: gDc9013.challenges, gDc8543: gDc8543.challenges }),
  );
}

// ── OZV-2197: Cạnh loại trừ 2 chiều 90.13 <-> 85.39 cho ca 162 'Đầu chiếu tia Laser / Chiếu tia sáng chấm đỏ' ──
{
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const moTa162 = 'Đầu chiếu tia Laser / None / Chiếu tia sáng chấm đỏ';
  const st9013 = loadSoTay('9013');
  const st8539 = loadSoTay('8539');
  const lt9013 = (st9013?.loaiTru || []).find((x) => x.sangNhom === '8539' && x.canCuLoaiTru?.nguon === 'nhom8539.nhom' && /đầu chiếu tia laser/i.test(x.dieuKien || ''));
  const lt8539 = (st8539?.loaiTru || []).find((x) => x.sangNhom === '9013' && x.canCuLoaiTru?.nguon === 'nhom9013.nhom' && /đầu chiếu tia laser/i.test(x.dieuKien || ''));
  const v9013 = verifySoTay(st9013, '9013', sourcesFor('9013'));
  const v8539 = verifySoTay(st8539, '8539', sourcesFor('8539'));
  assert(
    'OZV-2197: sổ tay 9013 và 8539 có loaiTru 2 chiều 9013 <-> 8539 kèm canCuLoaiTru nguyên văn đạt 100% checkItem & verifySoTay',
    Boolean(lt9013 && lt9013.nguon === 'nhom9013.nhom' && checkItem('loaiTru', lt9013, sourcesFor('9013'), '9013') === null)
      && Boolean(lt8539 && lt8539.nguon === 'nhom8539.nhom' && checkItem('loaiTru', lt8539, sourcesFor('8539'), '8539') === null)
      && lt9013.dieuKien !== lt8539.dieuKien
      && !/;/.test(lt9013.dieuKien)
      && !/;/.test(lt8539.dieuKien)
      && v9013.loai.length === 0 && v9013.dat === v9013.tong && st9013.kiemTra?.tong === v9013.tong && st9013.kiemTra?.dat === v9013.dat
      && v8539.loai.length === 0 && v8539.dat === v8539.tong && st8539.kiemTra?.tong === v8539.tong && st8539.kiemTra?.dat === v8539.dat,
    JSON.stringify({ lt9013: Boolean(lt9013), lt8539: Boolean(lt8539), loai9013: v9013.loai, loai8539: v8539.loai, tong9013: v9013.tong, tong8539: v8539.tong }),
  );

  const c5Tu9013 = D.canhTu('9013', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8539');
  const c5Tu8539 = D.canhTu('8539', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '9013');
  const c6Tu9013 = D.canhTu('9013', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8539');
  const c6Tu8539 = D.canhTu('8539', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '9013');
  const giua = D.canhGiuaNhomConSong(['9013', '8539']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu9013 = D.moRongUngVien(['9013'], moTa162, { toiDa: 10 });
  const mrTu8539 = D.moRongUngVien(['8539'], moTa162, { toiDa: 10 });
  assert(
    'OZV-2197: đồ thị C5/C6, canhGiuaNhomConSong, nhomLienQuanSoTay và moRongUngVien nối 2 chiều 9013 <-> 8539 cho ca 162',
    c5Tu9013.some((e) => e.nguon === 'nhom9013.nhom' && e.canCuLoaiTru?.nguon === 'nhom8539.nhom')
      && c5Tu8539.some((e) => e.nguon === 'nhom8539.nhom' && e.canCuLoaiTru?.nguon === 'nhom9013.nhom')
      && c6Tu9013.length >= 1
      && c6Tu8539.length >= 1
      && giua.length >= 2
      && nhomLienQuanSoTay('9013').includes('8539')
      && nhomLienQuanSoTay('8539').includes('9013')
      && mrTu9013.some((x) => x.nhom === '8539')
      && mrTu8539.some((x) => x.nhom === '9013'),
    JSON.stringify({ c5Tu9013: c5Tu9013.length, c5Tu8539: c5Tu8539.length, mrTu9013, mrTu8539 }),
  );

  const pb9013 = cauPhanBietNhom('9013', ['9013', '8539'], moTa162);
  const pb8539 = cauPhanBietNhom('8539', ['8539', '9013'], moTa162);
  const g9013 = soTayGates({ hs: '90132000', productText: moTa162, productName: moTa162, pool: [{ h4: '8539', from: 'test' }] });
  const g8539 = soTayGates({ hs: '85395290', productText: moTa162, productName: moTa162, pool: [{ h4: '9013', from: 'test' }] });
  const ht2 = phanTichHoiTruoc4So({ moTa: moTa162, ungVien: ['9013', '8539'] });
  const ht4 = phanTichHoiTruoc4So({ moTa: moTa162, ungVien: ['9013', '8541', '8543', '8539'] });
  assert(
    'OZV-2197 (thuận): cauPhanBietNhom, soTayGates và phanTichHoiTruoc4So hoạt động đúng 2 chiều 90.13 <-> 85.39 (và cụm [9013, 8541, 8543, 8539]) cho ca 162',
    pb9013.length === 1 && pb9013[0].canCu === 'so-tay' && pb9013[0].nguon === 'nhom9013.nhom' && /85\.39/.test(pb9013[0].questionVi)
      && pb8539.length === 1 && pb8539[0].canCu === 'so-tay' && pb8539[0].nguon === 'nhom8539.nhom' && /90\.13/.test(pb8539[0].questionVi)
      && (g9013.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '8539')
      && (g8539.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '9013')
      && ht2.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && new Set((ht2.nhanh || []).map((n) => n.dieuKien)).size === 2
      && Boolean(ht2.dapAnDieuKien && ht2.dapAnDieuKien.includes('→ nhóm 9013 (') && ht2.dapAnDieuKien.includes('→ nhóm 8539 ('))
      && Boolean(ht2.cauHoi)
      && ht4.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && new Set((ht4.nhanh || []).map((n) => n.dieuKien)).size === 4
      && Boolean(
        ht4.dapAnDieuKien
          && ht4.dapAnDieuKien.includes('→ nhóm 9013 (')
          && ht4.dapAnDieuKien.includes('→ nhóm 8541 (')
          && ht4.dapAnDieuKien.includes('→ nhóm 8543 (')
          && ht4.dapAnDieuKien.includes('→ nhóm 8539 ('),
      )
      && Boolean(ht4.cauHoi),
    JSON.stringify({ pb9013, pb8539, g9013: g9013.challenges, g8539: g8539.challenges, ht2: ht2.dapAnDieuKien, ht4: ht4.dapAnDieuKien }),
  );

  const dcKinhNgam = 'Kính ngắm để lắp vào vũ khí săn bắn';
  const dcDenHalogen = 'Bóng đèn dây tóc halogen vonfram dùng cho xe có động cơ';
  const dcDenHuynhQuang = 'Đèn phóng điện huỳnh quang ca-tốt nóng chiếu sáng văn phòng';
  const pbDc9013 = cauPhanBietNhom('9013', ['9013', '8539'], dcKinhNgam);
  const pbDc8539 = cauPhanBietNhom('8539', ['8539', '9013'], dcDenHalogen);
  const pbDcHq8539 = cauPhanBietNhom('8539', ['8539', '9013'], dcDenHuynhQuang);
  const gDc9013 = soTayGates({ hs: '90131010', productText: dcKinhNgam, productName: dcKinhNgam });
  const gDc8539 = soTayGates({ hs: '85392130', productText: dcDenHalogen, productName: dcDenHalogen });
  assert(
    'OZV-2197 (đối chứng): kính ngắm vũ khí, bóng đèn halogen vonfram và đèn huỳnh quang ca-tốt nóng không hỏi oan / không kéo oan 90.13 <-> 85.39',
    pbDc9013.length === 0
      && pbDc8539.length === 0
      && pbDcHq8539.length === 0
      && !(gDc9013.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '8539')
      && !(gDc8539.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '9013')
      && !D.moRongUngVien(['9013'], dcKinhNgam).some((x) => x.nhom === '8539')
      && !D.moRongUngVien(['8539'], dcDenHalogen).some((x) => x.nhom === '9013'),
    JSON.stringify({ pbDc9013, pbDc8539, pbDcHq8539, gDc9013: gDc9013.challenges, gDc8539: gDc8539.challenges }),
  );
}

// ── OZV-2202: Cạnh loại trừ 2 chiều 39.19 <-> 39.26 cho ca 104 'Miếng dán cường lực màn hình điện thoại' ──
{
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const moTa104 = 'Miếng dán cường lực màn hình điện thoại';
  const moTa104Ppf = 'Phim cường lực bảo vệ màn hình đồng hồ thông minh / nhựa PPF / Bảo vệ màn hình đồng hồ thông minh';
  const st3919 = loadSoTay('3919');
  const st3926 = loadSoTay('3926');
  const lt3919 = (st3919?.loaiTru || []).find((x) => x.sangNhom === '3926' && x.canCuLoaiTru?.nguon === 'nhom3926.nhom' && /cường lực/i.test(x.dieuKien || ''));
  const lt3926 = (st3926?.loaiTru || []).find((x) => x.sangNhom === '3919' && x.canCuLoaiTru?.nguon === 'nhom3919.nhom' && /cường lực/i.test(x.dieuKien || ''));
  const v3919 = verifySoTay(st3919, '3919', sourcesFor('3919'));
  const v3926 = verifySoTay(st3926, '3926', sourcesFor('3926'));
  assert(
    'OZV-2202: sổ tay 3919 và 3926 có loaiTru 2 chiều 3919 <-> 3926 kèm canCuLoaiTru nguyên văn đạt 100% checkItem & verifySoTay',
    Boolean(lt3919 && lt3919.nguon === 'nhom3919.nhom' && checkItem('loaiTru', lt3919, sourcesFor('3919'), '3919') === null)
      && Boolean(lt3926 && lt3926.nguon === 'ch39.chuong' && checkItem('loaiTru', lt3926, sourcesFor('3926'), '3926') === null)
      && lt3919.dieuKien !== lt3926.dieuKien
      && !/;/.test(lt3919.dieuKien)
      && !/;/.test(lt3926.dieuKien)
      && v3919.loai.length === 0 && v3919.dat === v3919.tong && st3919.kiemTra?.tong === v3919.tong && st3919.kiemTra?.dat === v3919.dat
      && v3926.loai.length === 0 && v3926.dat === v3926.tong && st3926.kiemTra?.tong === v3926.tong && st3926.kiemTra?.dat === v3926.dat,
    JSON.stringify({ lt3919: Boolean(lt3919), lt3926: Boolean(lt3926), loai3919: v3919.loai, loai3926: v3926.loai, tong3919: v3919.tong, tong3926: v3926.tong }),
  );

  const c5Tu3919 = D.canhTu('3919', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '3926');
  const c5Tu3926 = D.canhTu('3926', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '3919');
  const c6Tu3919 = D.canhTu('3919', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '3926');
  const c6Tu3926 = D.canhTu('3926', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '3919');
  const giua = D.canhGiuaNhomConSong(['3919', '3926']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu3919 = D.moRongUngVien(['3919'], moTa104);
  const mrTu3926 = D.moRongUngVien(['3926'], moTa104);
  const mrPpfTu3919 = D.moRongUngVien(['3919'], moTa104Ppf);
  const mrPpfTu3926 = D.moRongUngVien(['3926'], moTa104Ppf);
  assert(
    'OZV-2202: đồ thị C5/C6, canhGiuaNhomConSong, nhomLienQuanSoTay và moRongUngVien nối 2 chiều 3919 <-> 3926 cho ca 104',
    c5Tu3919.some((e) => e.nguon === 'nhom3919.nhom' && e.canCuLoaiTru?.nguon === 'nhom3926.nhom')
      && c5Tu3926.some((e) => e.nguon === 'ch39.chuong' && e.canCuLoaiTru?.nguon === 'nhom3919.nhom')
      && c6Tu3919.length >= 1
      && c6Tu3926.length >= 1
      && giua.length >= 2
      && nhomLienQuanSoTay('3919').includes('3926')
      && nhomLienQuanSoTay('3926').includes('3919')
      && mrTu3919.some((x) => x.nhom === '3926')
      && mrTu3926.some((x) => x.nhom === '3919')
      && mrPpfTu3919.some((x) => x.nhom === '3926')
      && mrPpfTu3926.some((x) => x.nhom === '3919'),
    JSON.stringify({ c5Tu3919: c5Tu3919.length, c5Tu3926: c5Tu3926.length, mrTu3919, mrTu3926, mrPpfTu3919, mrPpfTu3926 }),
  );

  const pb3919 = cauPhanBietNhom('3919', ['3919', '3926'], moTa104);
  const pb3926 = cauPhanBietNhom('3926', ['3926', '3919'], moTa104);
  const pbPpf3919 = cauPhanBietNhom('3919', ['3919', '3926'], moTa104Ppf);
  const pbPpf3926 = cauPhanBietNhom('3926', ['3926', '3919'], moTa104Ppf);
  const g3919 = soTayGates({ hs: '39199099', productText: moTa104, productName: moTa104, pool: [{ h4: '3926', from: 'test' }] });
  const g3926 = soTayGates({ hs: '39269099', productText: moTa104, productName: moTa104, pool: [{ h4: '3919', from: 'test' }] });
  const gPpf3919 = soTayGates({ hs: '39199099', productText: moTa104Ppf, productName: 'Phim cường lực bảo vệ màn hình đồng hồ thông minh', pool: [{ h4: '3926', from: 'test' }] });
  const gPpf3926 = soTayGates({ hs: '39269099', productText: moTa104Ppf, productName: 'Phim cường lực bảo vệ màn hình đồng hồ thông minh', pool: [{ h4: '3919', from: 'test' }] });
  const ht2 = phanTichHoiTruoc4So({ moTa: moTa104, ungVien: ['3919', '3926'] });
  const ht3 = phanTichHoiTruoc4So({ moTa: moTa104, ungVien: ['3919', '3926', '7007'] });
  const htPpf2 = phanTichHoiTruoc4So({ moTa: moTa104Ppf, ungVien: ['3919', '3926'] });
  assert(
    'OZV-2202 (thuận): cauPhanBietNhom, soTayGates và phanTichHoiTruoc4So hoạt động đúng 2 chiều 39.19 <-> 39.26 (và cụm [3919, 3926, 7007]) cho ca 104',
    pb3919.length === 1 && pb3919[0].canCu === 'so-tay' && pb3919[0].nguon === 'nhom3919.nhom' && /39\.26/.test(pb3919[0].questionVi)
      && pb3926.length === 1 && pb3926[0].canCu === 'so-tay' && pb3926[0].nguon === 'ch39.chuong' && /39\.19/.test(pb3926[0].questionVi)
      && pbPpf3919.length === 1 && /39\.26/.test(pbPpf3919[0].questionVi)
      && pbPpf3926.length === 1 && /39\.19/.test(pbPpf3926[0].questionVi)
      && (g3919.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '3926')
      && (g3926.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '3919')
      && (gPpf3919.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '3926')
      && (gPpf3926.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '3919')
      && ht2.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && new Set((ht2.nhanh || []).map((n) => n.dieuKien)).size === 2
      && Boolean(ht2.dapAnDieuKien && ht2.dapAnDieuKien.includes('→ nhóm 3919 (') && ht2.dapAnDieuKien.includes('→ nhóm 3926 ('))
      && Boolean(ht2.cauHoi)
      && ht3.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && new Set((ht3.nhanh || []).map((n) => n.dieuKien)).size === 3
      && Boolean(ht3.dapAnDieuKien && ht3.dapAnDieuKien.includes('→ nhóm 3919 (') && ht3.dapAnDieuKien.includes('→ nhóm 3926 (') && ht3.dapAnDieuKien.includes('→ nhóm 7007 ('))
      && Boolean(ht3.cauHoi)
      && htPpf2.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && new Set((htPpf2.nhanh || []).map((n) => n.dieuKien)).size === 2,
    JSON.stringify({ pb3919, pb3926, g3919: g3919.challenges, g3926: g3926.challenges, ht2: ht2.dapAnDieuKien, ht3: ht3.dapAnDieuKien }),
  );

  const dcBangKeoDien = 'Băng keo điện PVC tự dính dạng cuộn rộng 2 cm';
  const dcPhaoLuoi = 'Phao cho lưới đánh cá bằng plastic đúc nguyên khối';
  const dcDaiBangTai = 'Đai truyền băng tải bằng plastic dùng trong công nghiệp';
  const pbDc3919 = cauPhanBietNhom('3919', ['3919', '3926'], dcBangKeoDien);
  const pbDc3926 = cauPhanBietNhom('3926', ['3926', '3919'], dcPhaoLuoi);
  const pbDcDai3926 = cauPhanBietNhom('3926', ['3926', '3919'], dcDaiBangTai);
  const gDc3919 = soTayGates({ hs: '39191010', productText: dcBangKeoDien, productName: dcBangKeoDien });
  const gDc3926 = soTayGates({ hs: '39269010', productText: dcPhaoLuoi, productName: dcPhaoLuoi });
  assert(
    'OZV-2202 (đối chứng): băng keo điện PVC, phao lưới đánh cá và đai băng tải không hỏi oan / không kéo oan 39.19 <-> 39.26',
    pbDc3919.length === 0
      && pbDc3926.length === 0
      && pbDcDai3926.length === 0
      && !(gDc3919.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '3926')
      && !(gDc3926.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '3919')
      && !D.moRongUngVien(['3919'], dcBangKeoDien).some((x) => x.nhom === '3926')
      && !D.moRongUngVien(['3926'], dcPhaoLuoi).some((x) => x.nhom === '3919'),
    JSON.stringify({ pbDc3919, pbDc3926, pbDcDai3926, gDc3919: gDc3919.challenges, gDc3926: gDc3926.challenges }),
  );
}

// ── OZV-2208: Cạnh loại trừ 2 chiều 70.07 <-> 39.19 cho ca 104 'Miếng dán cường lực màn hình điện thoại' ──
{
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const moTa104 = 'Miếng dán cường lực màn hình điện thoại';
  const moTa104Ppf = 'Phim cường lực bảo vệ màn hình đồng hồ thông minh / nhựa PPF / Bảo vệ màn hình đồng hồ thông minh';
  const st7007 = loadSoTay('7007');
  const st3919 = loadSoTay('3919');
  const lt7007 = (st7007?.loaiTru || []).find((x) => x.sangNhom === '3919' && x.canCuLoaiTru?.nguon === 'nhom3919.nhom' && /cường lực/i.test(x.dieuKien || ''));
  const lt3919 = (st3919?.loaiTru || []).find((x) => x.sangNhom === '7007' && x.canCuLoaiTru?.nguon === 'nhom7007.nhom' && /cường lực/i.test(x.dieuKien || ''));
  const v7007 = verifySoTay(st7007, '7007', sourcesFor('7007'));
  const v3919 = verifySoTay(st3919, '3919', sourcesFor('3919'));
  assert(
    'OZV-2208: sổ tay 7007 và 3919 có loaiTru 2 chiều 7007 <-> 3919 kèm canCuLoaiTru nguyên văn đạt 100% checkItem & verifySoTay',
    Boolean(lt7007 && lt7007.nguon === 'nhom7007.nhom' && checkItem('loaiTru', lt7007, sourcesFor('7007'), '7007') === null)
      && Boolean(lt3919 && lt3919.nguon === 'nhom3919.nhom' && checkItem('loaiTru', lt3919, sourcesFor('3919'), '3919') === null)
      && lt7007.dieuKien !== lt3919.dieuKien
      && !/;/.test(lt7007.dieuKien)
      && !/;/.test(lt3919.dieuKien)
      && v7007.loai.length === 0 && v7007.dat === v7007.tong && st7007.kiemTra?.tong === v7007.tong && st7007.kiemTra?.dat === v7007.dat
      && v3919.loai.length === 0 && v3919.dat === v3919.tong && st3919.kiemTra?.tong === v3919.tong && st3919.kiemTra?.dat === v3919.dat,
    JSON.stringify({ lt7007: Boolean(lt7007), lt3919: Boolean(lt3919), loai7007: v7007.loai, loai3919: v3919.loai, tong7007: v7007.tong, tong3919: v3919.tong }),
  );

  const c5Tu7007 = D.canhTu('7007', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '3919');
  const c5Tu3919 = D.canhTu('3919', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '7007');
  const c6Tu7007 = D.canhTu('7007', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '3919');
  const c6Tu3919 = D.canhTu('3919', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '7007');
  const giua = D.canhGiuaNhomConSong(['7007', '3919']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu7007 = D.moRongUngVien(['7007'], moTa104);
  const mrTu3919 = D.moRongUngVien(['3919'], moTa104);
  const mrPpfTu7007 = D.moRongUngVien(['7007'], moTa104Ppf);
  const mrPpfTu3919 = D.moRongUngVien(['3919'], moTa104Ppf, { toiDa: 4 });
  assert(
    'OZV-2208: đồ thị C5/C6, canhGiuaNhomConSong, nhomLienQuanSoTay và moRongUngVien nối 2 chiều 7007 <-> 3919 cho ca 104',
    c5Tu7007.some((e) => e.nguon === 'nhom7007.nhom' && e.canCuLoaiTru?.nguon === 'nhom3919.nhom')
      && c5Tu3919.some((e) => e.nguon === 'nhom3919.nhom' && e.canCuLoaiTru?.nguon === 'nhom7007.nhom')
      && c6Tu7007.length >= 1
      && c6Tu3919.length >= 1
      && giua.length >= 2
      && nhomLienQuanSoTay('7007').includes('3919')
      && nhomLienQuanSoTay('3919').includes('7007')
      && mrTu7007.some((x) => x.nhom === '3919')
      && mrTu3919.some((x) => x.nhom === '7007')
      && mrPpfTu7007.some((x) => x.nhom === '3919')
      && mrPpfTu3919.some((x) => x.nhom === '7007'),
    JSON.stringify({ c5Tu7007: c5Tu7007.length, c5Tu3919: c5Tu3919.length, mrTu7007, mrTu3919, mrPpfTu7007, mrPpfTu3919 }),
  );

  const pb7007 = cauPhanBietNhom('7007', ['7007', '3919'], moTa104);
  const pb3919 = cauPhanBietNhom('3919', ['3919', '7007'], moTa104);
  const pbPpf7007 = cauPhanBietNhom('7007', ['7007', '3919'], moTa104Ppf);
  const pbPpf3919 = cauPhanBietNhom('3919', ['3919', '7007'], moTa104Ppf);
  const g7007 = soTayGates({ hs: '70071990', productText: moTa104, productName: moTa104, pool: [{ h4: '3919', from: 'test' }] });
  const g3919 = soTayGates({ hs: '39199099', productText: moTa104, productName: moTa104, pool: [{ h4: '7007', from: 'test' }] });
  const gPpf7007 = soTayGates({ hs: '70071990', productText: moTa104Ppf, productName: 'Phim cường lực bảo vệ màn hình đồng hồ thông minh', pool: [{ h4: '3919', from: 'test' }] });
  const gPpf3919 = soTayGates({ hs: '39199099', productText: moTa104Ppf, productName: 'Phim cường lực bảo vệ màn hình đồng hồ thông minh', pool: [{ h4: '7007', from: 'test' }] });
  const ht2 = phanTichHoiTruoc4So({ moTa: moTa104, ungVien: ['7007', '3919'] });
  const ht3 = phanTichHoiTruoc4So({ moTa: moTa104, ungVien: ['7007', '3919', '3926'] });
  const htPpf2 = phanTichHoiTruoc4So({ moTa: moTa104Ppf, ungVien: ['7007', '3919'] });
  assert(
    'OZV-2208 (thuận): cauPhanBietNhom, soTayGates và phanTichHoiTruoc4So hoạt động đúng 2 chiều 70.07 <-> 39.19 (và cụm [7007, 3919, 3926]) cho ca 104',
    pb7007.length === 1 && pb7007[0].canCu === 'so-tay' && pb7007[0].nguon === 'nhom7007.nhom' && /39\.19/.test(pb7007[0].questionVi)
      && pb3919.length === 1 && pb3919[0].canCu === 'so-tay' && pb3919[0].nguon === 'nhom3919.nhom' && /70\.07/.test(pb3919[0].questionVi)
      && pbPpf7007.length === 1 && /39\.19/.test(pbPpf7007[0].questionVi)
      && pbPpf3919.length === 1 && /70\.07/.test(pbPpf3919[0].questionVi)
      && (g7007.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '3919')
      && (g3919.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '7007')
      && (gPpf7007.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '3919')
      && (gPpf3919.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '7007')
      && ht2.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && new Set((ht2.nhanh || []).map((n) => n.dieuKien)).size === 2
      && Boolean(ht2.dapAnDieuKien && ht2.dapAnDieuKien.includes('→ nhóm 7007 (') && ht2.dapAnDieuKien.includes('→ nhóm 3919 ('))
      && Boolean(ht2.cauHoi)
      && ht3.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && new Set((ht3.nhanh || []).map((n) => n.dieuKien)).size === 3
      && Boolean(ht3.dapAnDieuKien && ht3.dapAnDieuKien.includes('→ nhóm 7007 (') && ht3.dapAnDieuKien.includes('→ nhóm 3919 (') && ht3.dapAnDieuKien.includes('→ nhóm 3926 ('))
      && Boolean(ht3.cauHoi)
      && htPpf2.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && new Set((htPpf2.nhanh || []).map((n) => n.dieuKien)).size === 2,
    JSON.stringify({ pb7007, pb3919, g7007: g7007.challenges, g3919: g3919.challenges, ht2: ht2.dapAnDieuKien, ht3: ht3.dapAnDieuKien }),
  );

  const dcKinhChanGio = 'Kính chắn gió ô tô bằng kính tôi an toàn';
  const dcKinhChongDan = 'Kính dán nhiều lớp chống đạn dùng cho xe chuyên dụng';
  const dcBangKeoDien = 'Băng keo điện PVC tự dính dạng cuộn rộng 2 cm';
  const pbDc7007 = cauPhanBietNhom('7007', ['7007', '3919'], dcKinhChanGio);
  const pbDcChongDan7007 = cauPhanBietNhom('7007', ['7007', '3919'], dcKinhChongDan);
  const pbDc3919 = cauPhanBietNhom('3919', ['3919', '7007'], dcBangKeoDien);
  const gDc7007 = soTayGates({ hs: '70071110', productText: dcKinhChanGio, productName: dcKinhChanGio });
  const gDc3919 = soTayGates({ hs: '39191010', productText: dcBangKeoDien, productName: dcBangKeoDien });
  assert(
    'OZV-2208 (đối chứng): kính chắn gió ô tô, kính chống đạn và băng keo điện PVC không hỏi oan / không kéo oan 70.07 <-> 39.19',
    pbDc7007.length === 0
      && pbDcChongDan7007.length === 0
      && pbDc3919.length === 0
      && !(gDc7007.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '3919')
      && !(gDc3919.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '7007')
      && !D.moRongUngVien(['7007'], dcKinhChanGio).some((x) => x.nhom === '3919')
      && !D.moRongUngVien(['3919'], dcBangKeoDien).some((x) => x.nhom === '7007'),
    JSON.stringify({ pbDc7007, pbDcChongDan7007, pbDc3919, gDc7007: gDc7007.challenges, gDc3919: gDc3919.challenges }),
  );
}

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
