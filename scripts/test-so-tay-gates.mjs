// Cổng sổ tay chú giải lúc chạy (lib/so-tay-gates.js) — tất định, không AI. Dữ liệu: data/so-tay/8509.json.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { nhomChuaCoSoTay } from './nhom-chua-co-so-tay.mjs';
const require = createRequire(import.meta.url);
const { soTayGates, soTayBlock, headPhrases, productHead, phraseHit, isPartsLine, loadSoTay, chotDong8, giaTriCua, trangThaiDong8, chatLieuTrong, chatLieuRegex, MATERIALS, soTayMode } = require('../lib/so-tay-gates.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };
const gatesOf = (r) => r.challenges.map((c) => `${c.gate}:${c.target || ''}`);

// Danh từ đầu — khớp tên hàng, không khớp định ngữ
check('tách phương án song song của câu loại trừ', JSON.stringify(headPhrases('Quạt gió, quạt thông gió hoặc chụp hút có gắn quạt, đã hoặc chưa gắn thiết bị lọc')) === JSON.stringify([['quạt', 'gió'], ['quạt', 'thông', 'gió'], ['chụp', 'hút']]));
check('định ngữ không thành tên hàng ("Có lưới bảo vệ")', headPhrases('Có lưới bảo vệ').length === 0);
check('dừng ở định ngữ: "đầu nối dùng cho sợi quang" → [đầu nối]', JSON.stringify(headPhrases('đầu nối dùng cho sợi quang học, bó hoặc sợi cáp quang')) === JSON.stringify([['đầu', 'nối']]));
check('danh từ đầu của mô tả hàng', productHead('Dây cáp điện có đầu nối, dài 1m').join(' ') === 'dây cáp điện' && productHead('Kính mắt thời trang bằng nhựa, KT 14cm').join(' ') === 'kính mắt thời trang');
check('cụm ở định ngữ của mô tả không khớp ("cáp có đầu nối" ≠ "đầu nối")', phraseHit('đầu nối dùng cho sợi quang học', 'Dây cáp điện có đầu nối, dài 1m') === null);

// Dòng bộ phận
check('"… and parts thereof" không phải dòng bộ phận; "…; parts" thì là', isPartsLine('73239310') === false && isPartsLine('85099090') === true && isPartsLine('85094000') === false);

// Gói vòng 2
const blk = soTayBlock('8509', { lines: ['85098010', '85098090'] });
check('khối sổ tay có loại trừ kèm nhóm đích + nguồn', /LOẠI TRỪ/.test(blk) && /84\.14/.test(blk) && /\[nhom8509\.nhom/.test(blk), blk.slice(0, 200));
check('khối sổ tay chỉ in điều kiện dòng 8 số đang đưa cho AI', /85098010/.test(blk) && !/85094000:/.test(blk));
// nhóm CHƯA CÓ sổ tay — chọn động theo dữ liệu hiện tại (lô soạn mới không làm đỏ test)
const CHUA_CO_SO_TAY = nhomChuaCoSoTay();
check('nhóm chưa có sổ tay → null, cổng không kiểm', soTayBlock(CHUA_CO_SO_TAY.h4) === null && loadSoTay(CHUA_CO_SO_TAY.h4) === null && soTayGates({ hs: CHUA_CO_SO_TAY.hs8, productText: 'hàng' }).checked === false);

// 1. Loại trừ đích danh
let r = soTayGates({ hs: '85098090', productName: 'Quạt thông gió gia dụng', productText: 'quạt thông gió 30W' });
check('tên hàng thuộc loại trừ của 85.09 → nghi, đích 84.14, kèm câu luật', gatesOf(r).includes('SO_TAY_LOAI_TRU:8414') && r.challenges[0].legal[0].nguon === 'nhom8509.nhom' && /84\.14/.test(r.challenges[0].legal[0].trich), JSON.stringify(gatesOf(r)));
r = soTayGates({ hs: '85094000', productName: 'Máy xay sinh tố cầm tay', productText: 'máy xay sinh tố' });
check('tên hàng không thuộc loại trừ → không nghi', !r.challenges.some((c) => c.gate === 'SO_TAY_LOAI_TRU'), JSON.stringify(gatesOf(r)));
r = soTayGates({ hs: '85098090', productName: 'Quạt thông gió gia dụng', pool: [] }, { loaiTruRequire: 'pool+phrase' });
check('chế độ pool+phrase: nhóm đích không có trong hồ sơ vụ việc → không nghi', !r.challenges.some((c) => c.gate === 'SO_TAY_LOAI_TRU'));
r = soTayGates({ hs: '85098090', productName: 'Quạt thông gió gia dụng', pool: [{ h4: '8414', from: 'gia-thuyet' }] }, { loaiTruRequire: 'pool+phrase' });
check('chế độ pool+phrase: có cả hai → nghi, ghi nguồn pool', r.challenges.some((c) => c.gate === 'SO_TAY_LOAI_TRU' && c.poolFrom.includes('gia-thuyet')));

// 2. Ngưỡng số
r = soTayGates({ hs: '85098090', productName: 'Máy khuếch tán tinh dầu', productText: 'Máy khuếch tán tinh dầu, trọng lượng 25 kg' });
check('khối lượng 25 kg trái ngưỡng ≤ 20 kg của 85.09 → nghi', gatesOf(r).includes('SO_TAY_NGUONG:'), JSON.stringify(gatesOf(r)));
r = soTayGates({ hs: '85098010', productName: 'Máy đánh bóng sàn nhà', productText: 'Máy đánh bóng sàn nhà, trọng lượng 25 kg' });
check('ngoại lệ "khối lượng bất kỳ" (máy đánh bóng sàn) → không nghi', !gatesOf(r).includes('SO_TAY_NGUONG:'), JSON.stringify(gatesOf(r)));
r = soTayGates({ hs: '85098090', productName: 'Máy khuếch tán tinh dầu', productText: 'trọng lượng 1,2 kg; tải 30 kg' });
check('chỉ đọc số có ngữ cảnh khối lượng; 1,2 kg trong ngưỡng → không nghi', !gatesOf(r).includes('SO_TAY_NGUONG:'), JSON.stringify(gatesOf(r)));

// 3. Bộ phận
r = soTayGates({ hs: '85094000', productName: 'Lưỡi dao máy xay', form: 'bộ phận' });
check('hồ sơ nói bộ phận, chọn máy hoàn chỉnh → nghi, chỉ dòng bộ phận', gatesOf(r).some((g) => g.startsWith('SO_TAY_BO_PHAN:8509')), JSON.stringify(gatesOf(r)));
r = soTayGates({ hs: '85099090', productName: 'Lưỡi dao máy xay', form: 'bộ phận' });
check('bộ phận + dòng bộ phận → không nghi', !gatesOf(r).some((g) => g.startsWith('SO_TAY_BO_PHAN')));
r = soTayGates({ hs: '85099090', productName: 'Bánh xe thay thế', form: 'hoàn chỉnh' });
check('chiều ngược (hoàn chỉnh + dòng bộ phận) không làm', !gatesOf(r).some((g) => g.startsWith('SO_TAY_BO_PHAN')));

// 4. Dòng "Loại khác"
r = soTayGates({ hs: '85098090', productName: 'Máy đánh bóng sàn nhà mini' });
check('chọn "Loại khác" khi tên hàng là tên dòng cụ thể → nghi, đích 85098010', gatesOf(r).includes('SO_TAY_DONG8:85098010'), JSON.stringify(gatesOf(r)));
r = soTayGates({ hs: '85098010', productName: 'Máy đánh bóng sàn nhà mini' });
check('đã chọn dòng cụ thể → không nghi', !gatesOf(r).some((g) => g.startsWith('SO_TAY_DONG8')));

// ── #195 CHỐT DÒNG 8 SỐ (dieuKienSo đã ốp vào data/so-tay) ──
check('đọc số quy đổi: mm → cm, DN25 → 2.5cm, kích thước bao không lọt', JSON.stringify(giaTriCua('duong_kinh', 'đường kính 30 mm')) === '[3]' && JSON.stringify(giaTriCua('duong_kinh', 'van DN25')) === '[2.5]' && giaTriCua('duong_kinh', 'thùng 10 x 20 cm').length === 0);
let cd = chotDong8({ hs: '40092190', productText: 'ống cao su có lắp phụ kiện cứng, đường kính 20 cm, độ dày thành ống 2 cm' });
check('4009.21: 20cm + 2cm → CHOT 40092110 kèm trích nguồn', cd.ketQua === 'CHOT' && cd.hs === '40092110' && cd.traNguon?.[0]?.nguon === 'sen.40092110', JSON.stringify(cd.ketQua));
cd = chotDong8({ hs: '40092110', productText: 'ống cao su có phụ kiện, đường kính 12 mm' });
check('4009.21: 1.2cm trái mọi điều kiện → LOAI_KHAC 40092190 (phủ định hoàn chỉnh)', cd.ketQua === 'LOAI_KHAC' && cd.hs === '40092190', JSON.stringify(cd));
cd = chotDong8({ hs: '40092190', productText: 'ống cao su có lắp phụ kiện cứng' });
check('thiếu số liệu → THIEU_SO_LIEU + missingFacts duong_kinh', cd.ketQua === 'THIEU_SO_LIEU' && cd.missingFacts?.[0]?.fact === 'duong_kinh', JSON.stringify(cd.missingFacts));
cd = chotDong8({ hs: '84811019', productText: 'van cổng điều khiển bằng tay, đường kính 30 cm' });
check('8481.10: 30 cm → 2 dòng cùng thoả → TRANH_CAP (không đoán)', cd.ketQua === 'TRANH_CAP' && (cd.dongThoa || []).length === 2, JSON.stringify(cd.dongThoa));
cd = chotDong8({ hs: '84811019', productText: 'van giảm áp kim loại, đường kính trong 2 cm' });
check('8481.10 + op LA: kim loại 2cm → CHOT 84811021 (đúng luật, không cần AI chọn dòng)', cd.ketQua === 'CHOT' && cd.hs === '84811021', JSON.stringify([cd.ketQua, cd.hs]));
cd = chotDong8({ hs: '84811019', productText: 'van giảm áp bằng plastic, đường kính 2 cm' });
check('8481.10: plastic 2cm → TRANH_CAP .21/.91 (nhánh plastic cụ thể hơn — chuyên viên chốt)', cd.ketQua === 'TRANH_CAP' && (cd.dongThoa || []).includes('84811091'), JSON.stringify(cd.dongThoa));
cd = chotDong8({ hs: '84051099', productText: 'máy phát acetylen' });
check('phân nhóm chưa số hóa ranh giới → KHONG_THE_CHOT (điểm mù)', cd.checked === false || cd.ketQua === 'KHONG_THE_CHOT', JSON.stringify(cd.ketQua));

// #195 chốt dòng — 3 hành vi sau đọc tay 18 ca oan (13/10):
cd = chotDong8({ hs: '85044090', productText: 'Bộ nguồn 260W, đầu vào AC100-240V' });
check('8504.40 có 2 dòng Loại khác → KHONG_THE_CHOT (không lấy dòng đầu)', cd.ketQua === 'KHONG_THE_CHOT' && ['nhieu-dong-loai-khac', 'phu-dinh-chua-hoan-chinh'].includes(cd.lyDo), JSON.stringify(cd));
cd = chotDong8({ hs: '85444299', productText: 'Dây cáp mạng USB, đường kính lõi 0.0625mm, vỏ nhựa cách điện' });
check('8544.42.94 có vế CHẤT LIỆU chưa mô hình → không chốt .94 (bảo thủ)', cd.ketQua === 'KHONG_THE_CHOT', JSON.stringify(cd));
cd = chotDong8({ hs: '40118011', productText: 'Lốp máy xúc lật 14.00-24, đường kính 788mm' });
check('4011 ngưỡng VÀNH không lấy đường kính ngoài → KHONG_THE_CHOT', cd.ketQua === 'KHONG_THE_CHOT', JSON.stringify(cd));
cd = chotDong8({ hs: '85044019', productText: 'Bộ đổi nguồn 30W dùng cho tủ điện' });
check('8504.40 chọn .19 (LK trong) cũng không chốt được — phủ định chưa hoàn chỉnh', cd.ketQua === 'KHONG_THE_CHOT', JSON.stringify(cd));

// ── op HOAC (#195 vòng 4): fixture trong thư mục TẠM (test-isolate-data) — PN6 giả 871699 trong nhóm 8716 thật ──
{
  const { dataPath } = require('../lib/data-paths.js');
  const path = require('path'); const fss = require('fs');
  const goc = JSON.parse(fss.readFileSync(path.join(process.cwd(), 'data/so-tay/8716.json'), 'utf8'));
  const HOAC = { op: 'HOAC', phuongAn: [
    [{ fact: 'duong_kinh', op: '>', value: 75, donVi: 'mm' }, { fact: 'duong_kinh', op: '<=', value: 100, donVi: 'mm' }],
    [{ fact: 'duong_kinh', op: '>', value: 250, donVi: 'mm' }],
  ] };
  goc.dong8 = (goc.dong8 || []).concat([
    { hs: '87169911', dieuKien: 'thử HOAC', trich: '87169911 - bánh xe thử: trên 75 mm nhưng không quá 100 mm, hoặc hơn 250 mm; chiều rộng không nhỏ hơn 30 mm', nguon: 'tax.87169911', nguonLoai: 'NGUYEN_VAN', loaiKhac: false, dieuKienSo: [HOAC, { fact: 'chieu_rong', op: '>=', value: 30, donVi: 'mm' }] },
    { hs: '87169990', dieuKien: 'thử HOAC — Loại khác', trich: '87169990 - Loại khác', nguon: 'tax.87169990', nguonLoai: 'NGUYEN_VAN', loaiKhac: true },
  ]);
  fss.mkdirSync(dataPath('so-tay'), { recursive: true });
  fss.writeFileSync(dataPath('so-tay/8716.json'), JSON.stringify(goc, null, 1));
  const { reset } = { reset: () => { try { require('../lib/so-tay-gates.js').loadSoTay('0000'); } catch {} } };
  cd = chotDong8({ hs: '87169999', productText: 'bánh xe đẩy, đường kính 80 mm, chiều rộng 40 mm' });
  check('HOAC vế 1 thoả (>75≤100) + rộng đạt → CHOT 87169911', cd.ketQua === 'CHOT' && cd.hs === '87169911', JSON.stringify([cd.ketQua, cd.hs]));
  cd = chotDong8({ hs: '87169999', productText: 'bánh xe đẩy, đường kính 300 mm, chiều rộng 40 mm' });
  check('HOAC vế 2 thoả (>250) → CHOT 87169911', cd.ketQua === 'CHOT' && cd.hs === '87169911', JSON.stringify([cd.ketQua, cd.hs]));
  cd = chotDong8({ hs: '87169999', productText: 'bánh xe đẩy, đường kính 60 mm, chiều rộng 40 mm' });
  check('mọi vế HOAC trượt + rộng đạt → LOAI_KHAC 87169990 (phủ định hoàn chỉnh)', cd.ketQua === 'LOAI_KHAC' && cd.hs === '87169990', JSON.stringify([cd.ketQua, cd.hs]));
  cd = chotDong8({ hs: '87169999', productText: 'bánh xe đẩy, đường kính 80 mm, chiều rộng 25 mm' });
  check('HOAC thoả nhưng chiều rộng trượt → không chốt', cd.ketQua === 'LOAI_KHAC' || cd.ketQua === 'KHONG_THE_CHOT' || cd.ketQua === 'TRANH_CAP', JSON.stringify(cd.ketQua));
  cd = chotDong8({ hs: '87169999', productText: 'bánh xe đẩy, đường kính 80 mm' });
  check('thiếu chiều rộng → THIEU_SO_LIEU (không đoán)', cd.ketQua === 'THIEU_SO_LIEU' && (cd.missingFacts || []).some((m) => m.fact === 'chieu_rong'), JSON.stringify(cd.ketQua));
}

// ── Ký hiệu ren hệ mét M8 / M8x30 = đường kính danh nghĩa (prod 25/10/2026: "Bu lông … M8x30, kèm đai ốc" bị hỏi lại
//    đường kính và cảnh báo chỉ sang dòng .90 dù đã chọn đúng 73181510) ──
const dk = (t) => JSON.stringify(giaTriCua('duong_kinh', t).map((v) => Number(v.toFixed(3))));
check('ren M + tên chi tiết lắp xiết: M8 · M8x30 · M8×1.25 · M 10 · M12x1.5x40 → 0.8 · 0.8 · 0.8 · 1 · 1.2 cm',
  dk('Bu lông M8') === '[0.8]' && dk('Bu lông lục giác M8x30') === '[0.8]' && dk('Vít M8×1.25') === '[0.8]' && dk('Đai ốc M 10') === '[1]' && dk('Guzông M12x1.5x40') === '[1.2]',
  [dk('Bu lông M8'), dk('Bu lông lục giác M8x30'), dk('Vít M8×1.25'), dk('Đai ốc M 10'), dk('Guzông M12x1.5x40')].join(' '));
const KHONG_LAP_XIET = ['M8', 'M8x30', 'M8×1.25', 'M 10', 'M12x1.5x40', 'Bánh xe 2 phanh M12*25', 'Đồng hồ áp suất chân ren M20x1.5'];
check('ren M KHÔNG kèm tên chi tiết lắp xiết → không đọc (kể cả dạng chặt M8x30: ren trục bánh xe / chân đồng hồ không phải đường kính hàng)',
  KHONG_LAP_XIET.every((t) => dk(t) === '[]'), KHONG_LAP_XIET.map(dk).join(' '));
const MA_MODEL = ['Chip Apple M2', 'Máy ảnh Leica M10', 'M3 Pro', 'Laptop Apple M3 Pro kèm ốc vít', 'Van điện từ SY3120-5LZ-M5', 'Cảm biến xi lanh D-M9BV', 'Máy bắt vít Milwaukee M12', 'Ốc hương size M 40', 'Vít me bi M12'];
check('chip / máy ảnh / mã model / dụng cụ / ốc hương → không có đường kính', MA_MODEL.every((t) => dk(t) === '[]'), MA_MODEL.map(dk).join(' '));
check('tên hàng theo danh từ đầu: "Van bướm DN100 kèm bu lông M16" chỉ DN100; "M20x80 bu lông", "Hex bolt", "螺栓" đọc được; "阀门带螺栓" không',
  dk('Van bướm DN100 kèm bộ bu lông M16') === '[10]' && dk('M20x80 bu lông') === '[2]' && dk('Hex bolt M8x30') === '[0.8]' && dk('304不锈钢外六角螺栓 M8*30') === '[0.8]' && dk('阀门带螺栓M16') === '[]');
check('ren M chỉ DỰ PHÒNG: mô tả đã ghi đường kính bằng chữ thì giữ số đó (ca thật 73181690)', dk('Đai ốc xoáy dùng cho xi lanh M16x1.5, bằng thép, đường kính: 20mm') === '[2]');
check('"M8.8" là cấp bền, "kg/m2" / "2 m2" là đơn vị; M2,5 là cỡ lẻ hợp lệ',
  dk('Bu lông cấp bền M8.8') === '[]' && dk('Bu lông neo tải 500kg/m2') === '[]' && dk('Bu lông neo 2 m2') === '[]' && dk('Vít M2,5x6') === '[0.25]');
const BULONG = 'Bu lông lục giác bằng thép mạ kẽm M8x30, kèm đai ốc'; // nguyên văn ca prod 25/10/2026
cd = chotDong8({ hs: '73181510', productText: BULONG });
check('prod bu lông M8x30 → duong_kinh 0,8 cm, CHOT 73181510 qua sổ tay (không còn THIEU_SO_LIEU)', dk(BULONG) === '[0.8]' && cd.ketQua === 'CHOT' && cd.hs === '73181510', JSON.stringify(cd));
cd = chotDong8({ hs: '73181510', productText: 'M20x80 bu lông' });
check('M20x80 bu lông (> 16 mm) → LOAI_KHAC 73181590', cd.ketQua === 'LOAI_KHAC' && cd.hs === '73181590', JSON.stringify(cd));
cd = chotDong8({ hs: '73181690', productText: 'Đai ốc lục giác thép M10' });
check('đai ốc M10 → CHOT 73181610 ("cho bu lông có đường kính ngoài của thân ≤ 16 mm")', cd.ketQua === 'CHOT' && cd.hs === '73181610', JSON.stringify(cd));
check('trangThaiDong8 chấm đúng một dòng: THOA / TRAI / CHUA_BIET; dòng "Loại khác" → null',
  trangThaiDong8({ hs: '73181510', productText: BULONG })?.trangThai === 'THOA' && trangThaiDong8({ hs: '73181510', productText: 'M20x80 bu lông' })?.trangThai === 'TRAI'
  && trangThaiDong8({ hs: '73181510', productText: 'Chip Apple M2' })?.trangThai === 'CHUA_BIET' && trangThaiDong8({ hs: '73181590', productText: BULONG }) === null);

// ── #434 vật liệu (MATERIALS): ranh giới chữ Unicode + chữ vật liệu không nói hàng làm bằng vật liệu đó ──
const mat = (t) => JSON.stringify(chatLieuTrong(t));
check('#434(1) "trang sức" không phải gốm sứ; "Bát sứ" là gốm sứ',
  mat('Nhẫn trang sức') === '[]' && mat('Hộp đựng trang sức') === '[]' && mat('Bát sứ') === '["gốm sứ"]' && mat('Bát sứ trắng') === '["gốm sứ"]');
const BE_NGOAI = ['Tấm ốp tường vân gỗ', 'Sàn vân gỗ SPC', 'Rèm cửa giả gỗ', 'Khung ảnh giả đồng', 'Tay nắm cửa màu đồng'];
check('#434(2) vân gỗ / giả gỗ / giả đồng / màu đồng là bề ngoài, không phải vật liệu', BE_NGOAI.every((t) => mat(t) === '[]'), BE_NGOAI.map(mat).join(' '));
const CUM = ['Quả vải thiều sấy khô', 'Hàng đã có giấy phép NK', 'kèm giấy chứng nhận CO'];
check('#434(3) vải thiều, giấy phép, giấy chứng nhận không phải vật liệu', CUM.every((t) => mat(t) === '[]'), CUM.map(mat).join(' '));
check('#434(4) "Máy cắt thép / hàn inox / đúc nhôm": vật liệu là phôi; "Van thép đúc" vẫn là kim loại',
  ['Máy cắt thép', 'Máy hàn inox', 'Máy đúc nhôm'].every((t) => mat(t) === '[]') && mat('Van thép đúc') === '["kim loại"]');
check('#434 ca đúng giữ nguyên: bát sứ, cốc gốm sứ, trang sức bạc (không), khung giả gỗ bằng nhựa (nhựa), vải cotton, giấy kraft',
  mat('bát sứ') === '["gốm sứ"]' && mat('cốc gốm sứ') === '["gốm sứ"]' && mat('trang sức bạc') === '[]' && mat('khung giả gỗ bằng nhựa') === '["plastic"]' && mat('vải cotton') === '["vải dệt"]' && mat('giấy kraft') === '["giấy"]');
check('#434 không mất ca đúng: Vỏ đúc nhôm, Que hàn inox, Ván ép gỗ, Inox304, uPVC, viết dính "vảidệt", "tóc giả dệt kim", "hoa giả nhựa"',
  mat('Vỏ đúc nhôm') === '["kim loại"]' && mat('Que hàn inox') === '["kim loại"]' && mat('Ván ép gỗ') === '["gỗ"]' && mat('Inox304') === '["kim loại"]' && mat('Ống nhựa uPVC') === '["plastic"]'
  && mat('CL vảidệt từ 100% polyester') === '["vải dệt"]' && mat('Bộ tóc giả dệt kim') === '["vải dệt"]' && mat('Hoa giả nhựa') === '["plastic"]');
check('#434 "cổ ngỗng" không phải gỗ, "Slabs" không phải ABS; "sắt" là kim loại', mat('Micro cổ ngỗng') === '[]' && mat('Slabs') === '[]' && mat('Khung sắt sơn tĩnh điện') === '["kim loại"]');
const MAU = { plastic: 'nhựa', 'cao su': 'cao su', giấy: 'giấy', gỗ: 'gỗ', 'kim loại': 'thép', 'thủy tinh': 'thủy tinh', 'gốm sứ': 'sứ', 'vải dệt': 'vải' };
check('mẫu thô: kiểm được câu trích luật (lib/so-tay.js); là MỘT nhóm cờ u, ghép tiền tố vào .source thì áp cho mọi phương án (so-tay-extract-conditions)',
  chatLieuRegex('gốm sứ').test('Bằng sứ') && chatLieuRegex('plastic').test('84818041 - - - Bằng plastic') && chatLieuRegex('vải dệt').test('có một mặt được lót vải dệt')
  && MATERIALS.every(([n, re]) => re.flags.includes('u') && !re.flags.includes('g') && new RegExp(`bằng\\s+${re.source}`, re.flags).test(`bằng ${MAU[n]}`) && !new RegExp(`bằng\\s+${re.source}`, re.flags).test(MAU[n])));

// ── Công tắc sổ tay dùng chung (HS_SO_TAY) — một bộ đọc cho động cơ và các cổng cảnh báo ──
{
  const goc = process.env.HS_SO_TAY;
  const mode = (v) => { if (v === undefined) delete process.env.HS_SO_TAY; else process.env.HS_SO_TAY = v; return soTayMode(); };
  check('soTayMode: trống/off/lạ → off · gates → gates · full/1/true/on (không phân biệt hoa thường) → full',
    mode(undefined) === 'off' && mode('off') === 'off' && mode('xyz') === 'off' && mode('gates') === 'gates' && ['full', '1', 'true', 'on', ' FULL '].every((v) => mode(v) === 'full'));
  const engine = require('../lib/engine-loop.js');
  check('lib/engine-loop.js dùng đúng hàm của lib/so-tay-gates.js (không có bộ đọc thứ hai)', engine.soTayMode === soTayMode);
  if (goc === undefined) delete process.env.HS_SO_TAY; else process.env.HS_SO_TAY = goc;
}

// ── Vế câu trích mà điều kiện sổ tay chấm được (veMoHinh) — rào "phủ hết chữ đặc trưng" của cổng cảnh báo ──
const tv = trangThaiDong8({ hs: '84814010', productText: 'Van an toàn bằng thép DN40' });
check('trangThaiDong8.veMoHinh: 84814010 chỉ chấm vế đường kính, vế "Bằng đồng hoặc hợp kim đồng" không nằm trong', Boolean(tv) && tv.veMoHinh.length === 1 && /đường kính trong từ 2,5 cm trở xuống/.test(tv.veMoHinh[0]) && !/đồng/.test(tv.veMoHinh.join(' ')), JSON.stringify(tv?.veMoHinh));
check('trangThaiDong8.veMoHinh: 73181510 chấm trọn nhãn "Đường kính ngoài của thân không quá 16 mm"', JSON.stringify(trangThaiDong8({ hs: '73181510', productText: BULONG })?.veMoHinh) === '["Đường kính ngoài của thân không quá 16 mm"]');

// ── #573 (L1-3b): chotDong8 chấm op mới (CO/KHONG/TRONG/TEN_LOAI/CONG_DUNG) bằng docGiaTri của tu-vung@1 ──
{
  const { danhGiaDong } = require('../lib/so-tay-gates.js');
  const dg = (dieuKienSo, text) => danhGiaDong({ hs: '85444299', trich: 't', nguon: 'tax.x', dieuKienSo }, text).trangThai;
  check('L1-3b: chấm "không có đầu nối" trên op CO → TRAI; "đã gắn đầu nối" → THOA; không nói → CHUA_BIET',
    dg([{ fact: 'daGanDauNoi', op: 'CO' }], 'Dây cáp điện không có đầu nối, dài 1m') === 'TRAI' && dg([{ fact: 'daGanDauNoi', op: 'CO' }], 'cáp đã gắn đầu nối Type-C') === 'THOA' && dg([{ fact: 'daGanDauNoi', op: 'CO' }], 'Dây cáp điện bọc PVC') === 'CHUA_BIET');
  check('L1-3b: op mới trộn op cũ trong một dòng — một vế TRÁI → TRAI', dg([{ fact: 'daGanDauNoi', op: 'CO' }, { fact: 'duong_kinh', op: '<=', value: 5, donVi: 'mm' }], 'cáp đã gắn đầu nối, đường kính 8 mm') === 'TRAI');
  // Fixture viết tay trong thư mục TẠM (test-isolate-data): 841451 với op mới, 8414 thật làm nền
  const { dataPath } = require('../lib/data-paths.js');
  const path = require('path'); const fss = require('fs');
  const goc = JSON.parse(fss.readFileSync(path.join(process.cwd(), 'data/so-tay/8414.json'), 'utf8'));
  goc.dong8 = (goc.dong8 || []).filter((d) => !String(d.hs).startsWith('841451')).concat([
    { hs: '84145110', dieuKien: 'quạt bàn', trich: 'Quạt bàn và quạt dạng hộp', nguon: 'tax.84145110', nguonLoai: 'AI_DA_KIEM', loaiKhac: false, dieuKienSo: [{ fact: 'tenLoai', op: 'TEN_LOAI', value: ['quạt bàn', 'quạt dạng hộp'] }] },
    { hs: '84145191', dieuKien: 'có lưới bảo vệ', trich: 'Có lưới bảo vệ', nguon: 'tax.84145191', nguonLoai: 'AI_DA_KIEM', loaiKhac: false, dieuKienSo: [{ fact: 'coLuoiBaoVe', op: 'CO' }] },
    { hs: '84145199', dieuKien: 'loại khác', trich: 'Loại khác', nguon: 'tax.84145199', nguonLoai: 'AI_DA_KIEM', loaiKhac: true },
  ]);
  fss.mkdirSync(dataPath('so-tay'), { recursive: true });
  fss.writeFileSync(dataPath('so-tay/8414.json'), JSON.stringify(goc, null, 1));
  cd = chotDong8({ hs: '84145199', productText: 'Quạt treo tường có lưới bảo vệ, công suất 45W' });
  check('L1-3b chotDong8: quạt treo tường có lưới → CHOT 84145191', cd.ketQua === 'CHOT' && cd.hs === '84145191', JSON.stringify(cd));
  cd = chotDong8({ hs: '84145191', productText: 'Quạt treo tường không có lưới bảo vệ' });
  check('L1-3b chotDong8: không lưới, không phải quạt bàn → LOAI_KHAC 84145199', cd.ketQua === 'LOAI_KHAC' && cd.hs === '84145199', JSON.stringify(cd));
  cd = chotDong8({ hs: '84145199', productText: 'Quạt treo tường' });
  check('L1-3b chotDong8: thiếu dữ kiện lưới → THIEU_SO_LIEU + câu hỏi tu-vung', cd.ketQua === 'THIEU_SO_LIEU' && cd.missingFacts?.some((m) => m.fact === 'coLuoiBaoVe' && /lưới/.test(m.cauHoi || '')), JSON.stringify(cd));
  const tv2 = trangThaiDong8({ hs: '84145191', productText: 'Quạt treo tường không có lưới bảo vệ' });
  check('L1-3b trangThaiDong8: op mới → TRAI; veMoHinh chứa vế có chữ của khoá', tv2?.trangThai === 'TRAI' && tv2.veMoHinh.join() === 'Có lưới bảo vệ', JSON.stringify(tv2));
  const { moTaDieuKienTrai } = require('../lib/so-tay-gates.js');
  check('L1-3b moTaDieuKienTrai: op mới in bằng nhãn tu-vung, không "undefined"', /lưới bảo vệ/.test(moTaDieuKienTrai(tv2)) && !/undefined/.test(moTaDieuKienTrai(tv2)), moTaDieuKienTrai(tv2));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
