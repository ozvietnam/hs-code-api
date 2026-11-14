// Cổng sổ tay chú giải lúc chạy (lib/so-tay-gates.js) — tất định, không AI. Dữ liệu: data/so-tay/8509.json.
import './test-isolate-data.mjs';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { TEST_DATA_DIR } from './test-isolate-data.mjs';
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
// OZV-920: chiều dày / kvar / cửa sổ ngữ cảnh 50 ký tự (định ngữ biểu thuế dài)
check('OZV-920 be_day: "Chiều dày từ 4,75 mm" (72082500) → 0.475 cm', Math.abs(giaTriCua('be_day', 'Chiều dày từ 4,75 mm trở lên')[0] - 0.475) < 1e-9);
check('OZV-920 cong_suat kvar: "0,5 kvar" (85321000) → 500 W', JSON.stringify(giaTriCua('cong_suat', 'có giới hạn công suất phản kháng cho phép không dưới 0,5 kvar (tụ nguồn)')) === '[500]');
check('OZV-920 duong_kinh cửa sổ 50: "Đường kính ngoài của thân không quá 16 mm" (73181210) → 1.6 cm', JSON.stringify(giaTriCua('duong_kinh', 'Đường kính ngoài của thân không quá 16 mm')) === '[1.6]');
check('OZV-920 ngưỡng hai đầu tên dòng 84811011 không đọc thành số đo', giaTriCua('duong_kinh', 'Van cổng điều khiển bằng tay có đường kính trong cửa nạp hoặc cửa thoát trên 5 cm nhưng không quá 40 cm').length === 0);
check('OZV-920 hàng thật cửa sổ 50: "đường kính trong cửa nạp 8 cm" → 8', JSON.stringify(giaTriCua('duong_kinh', 'Van cổng điều khiển bằng tay có đường kính trong cửa nạp hoặc cửa thoát 8 cm')) === '[8]');
check('OZV-920 chống khớp nhầm qua ; khi cửa sổ >30: không lấy 200 mm làm đường kính', giaTriCua('duong_kinh', 'có đường kính trong cửa nạp hoặc cửa thoát; dài 200 mm').length === 0);
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
// L1-4c đợt 3: 854442 đã duyệt + áp vào sổ tay (chatLieu CACH_DIEN, soSoi có kiểu) ⇒ máy hỏi thêm dữ kiện (THIEU_SO_LIEU)
// thay vì bỏ cuộc; ý của ca vẫn giữ: không tự chốt .94 cho cáp mạng USB (CEO 30/10/2026: cáp dữ liệu theo TB-TCHQ .99).
check('8544.42.94 → không chốt .94 cho cáp mạng USB (bảo thủ: KHONG_THE_CHOT hoặc THIEU_SO_LIEU)', ['KHONG_THE_CHOT', 'THIEU_SO_LIEU'].includes(cd.ketQua) && cd.hs !== '85444294', JSON.stringify(cd));
cd = chotDong8({ hs: '40118011', productText: 'Lốp máy xúc lật 14.00-24, đường kính 788mm' });
check('4011 ngưỡng VÀNH không lấy đường kính ngoài → KHONG_THE_CHOT', cd.ketQua === 'KHONG_THE_CHOT', JSON.stringify(cd));
cd = chotDong8({ hs: '85044019', productText: 'Bộ đổi nguồn 30W dùng cho tủ điện' });
check('8504.40 chọn .19 (LK trong) cũng không chốt được — phủ định chưa hoàn chỉnh', cd.ketQua === 'KHONG_THE_CHOT', JSON.stringify(cd));

// ── OZV-518 / PR #1247 vòng 3: 8543.70.60 phương án 2 phải bắt buộc hành động "kết nối" (traVe L29 11/11) ──
// Biểu .60 loại 2: "các sản phẩm được thiết kế đặc biệt ĐỂ KẾT NỐI VỚI thiết bị hoặc dụng cụ điện tín hoặc điện
// thoại hoặc với mạng điện tín hoặc điện thoại". "Được thiết kế đặc biệt" KHÔNG phải công dụng: hàng chỉ ghi
// "đặc biệt cho điện thoại" mà không nói kết nối (máy đo tín hiệu, làm mát, đèn báo trạng thái) không thuộc .60.
cd = chotDong8({ hs: '854370', productText: 'máy đo cường độ tín hiệu được thiết kế đặc biệt cho điện thoại' });
check('8543.70: "đặc biệt cho điện thoại" KHÔNG kết nối → không chốt .60 (hỏi)', ['THIEU_SO_LIEU', 'KHONG_THE_CHOT'].includes(cd.ketQua) && cd.hs !== '85437060', JSON.stringify(cd));
cd = chotDong8({ hs: '854370', productText: 'thiết bị làm mát điện tử được thiết kế đặc biệt cho điện thoại' });
check('8543.70: làm mát cho điện thoại KHÔNG kết nối → không chốt .60 (hỏi)', ['THIEU_SO_LIEU', 'KHONG_THE_CHOT'].includes(cd.ketQua) && cd.hs !== '85437060', JSON.stringify(cd));
cd = chotDong8({ hs: '854370', productText: 'đèn báo trạng thái được thiết kế đặc biệt cho mạng điện tín' });
check('8543.70: đèn báo cho mạng điện tín KHÔNG kết nối → không chốt .60 (hỏi)', ['THIEU_SO_LIEU', 'KHONG_THE_CHOT'].includes(cd.ketQua) && cd.hs !== '85437060', JSON.stringify(cd));
cd = chotDong8({ hs: '854370', productText: 'đầu nối điện được thiết kế đặc biệt để kết nối với mạng điện thoại' });
check('8543.70: đầu nối thật "để kết nối với mạng điện thoại" → vẫn CHOT .60', cd.ketQua === 'CHOT' && cd.hs === '85437060', JSON.stringify(cd));

// ── OZV-325: "hun khói" KHÔNG loại trừ "đông lạnh" — hai TRỤC khác nhau ──
// Biểu 0306 đặt dòng "Hun khói" BÊN TRONG tầng 1 gạch "Đông lạnh" (03061): tôm hùm hun khói ĐÔNG LẠNH là
// hàng thật, nên "Đông lạnh" không hề phủ định "Hun khói". Khoá liệt kê phuongPhapBaoQuan gộp hai trục
// (trạng thái bảo quản: sống/tươi/đông lạnh/khô-muối — và cách chế biến: hun khói/hấp-luộc chín) vào MỘT
// khoá ⇒ đọc được "đông lạnh" là máy chấm TRÁI tất định điều kiện HUN_KHOI của dòng có tên, mọi anh em TRÁI
// ⇒ tự chốt thẳng dòng "Loại khác" dù mô tả chỉ có tên phân nhóm 6 số, chưa khai hun khói hay không.
// Cách sửa dùng lại chuẩn chính người soạn đã chọn ở 030719/030729/030829 ("không dùng phuongPhapBaoQuan
// TRONG [HUN_KHOI] vì khoá liệt kê vét mọi giá trị từ vựng sinh lỗ hổng giả"): ghi tenLoai nguyên văn.
for (const [pn6, lkSai, ten] of [
  ['030611', '03061190', 'Tôm hùm đá và các loại tôm biển khác (Palinurus spp., Panulirus spp., Jasus spp.)'],
  ['030612', '03061290', 'Tôm hùm (Homarus spp.)'],
]) {
  cd = chotDong8({ hs: pn6, productText: `Đông lạnh - ${ten}` });
  check(`${pn6} thiếu dữ kiện (chỉ tên PN6 + "Đông lạnh") → KHÔNG tự chốt dòng Loại khác ${lkSai}`,
    cd.ketQua !== 'LOAI_KHAC' && cd.hs !== lkSai, JSON.stringify([cd.ketQua, cd.hs, cd.lyDo]));
  // Khai RÕ "hun khói" thì tuyệt đối không được đẩy sang dòng Loại khác. Chốt thẳng dòng hun khói là cái
  // tenLoai (so chữ không tất định) KHÔNG hứa — chuẩn 030719/030729/030829 cũng dừng ở KHONG_THE_CHOT,
  // im lặng vẫn hơn chốt sai. Ca này chặn đúng chiều sai: không bao giờ ra dòng Loại khác.
  cd = chotDong8({ hs: pn6, productText: `Đông lạnh - ${ten}, hun khói` });
  check(`${pn6} khai rõ "hun khói" (dù đông lạnh) → không bao giờ ra dòng Loại khác ${lkSai}`,
    cd.hs !== lkSai && cd.ketQua !== 'LOAI_KHAC', JSON.stringify([cd.ketQua, cd.hs, cd.lyDo]));
}

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
const MAU = { plastic: 'nhựa', 'cao su': 'cao su', giấy: 'giấy', gỗ: 'gỗ', 'kim loại': 'thép', 'thủy tinh': 'thủy tinh', 'gốm sứ': 'sứ', 'vải dệt': 'vải', 'vật liệu tổng hợp': 'vật liệu tổng hợp' };
check('mẫu thô: kiểm được câu trích luật (lib/so-tay.js); là MỘT nhóm cờ u, ghép tiền tố vào .source thì áp cho mọi phương án (so-tay-extract-conditions)',
  chatLieuRegex('gốm sứ').test('Bằng sứ') && chatLieuRegex('plastic').test('84818041 - - - Bằng plastic') && chatLieuRegex('vải dệt').test('có một mặt được lót vải dệt')
  && MATERIALS.every(([n, re]) => re.flags.includes('u') && !re.flags.includes('g') && new RegExp(`bằng\\s+${re.source}`, re.flags).test(`bằng ${MAU[n]}`) && !new RegExp(`bằng\\s+${re.source}`, re.flags).test(MAU[n])));
// #OZV-581 (OZV-540 PA-3 — T3): "vật liệu tổng hợp" (composite) — đọc được ở mọi nơi, CHỈ dùng để chốt ở nhóm
// đã khai hồ sơ (data/ho-so/phan-biet-vat-lieu/<nhom>.json) ⇒ không tự chốt ở nhóm khác.
check('#OZV-581 composite: đọc "vật liệu tổng hợp" (chữ chú giải), "composite(s)", 复合绝缘子/复合材料; KHÔNG đọc "compositeness"',
  mat('Cách điện bằng composite') === '["vật liệu tổng hợp"]' && mat('bằng composites') === '["vật liệu tổng hợp"]'
  && mat('vật liệu tổng hợp') === '["vật liệu tổng hợp"]' && mat('vật liệu cách điện tổng hợp') === '["vật liệu tổng hợp"]'
  && mat('复合绝缘子') === '["vật liệu tổng hợp"]' && mat('复合材料') === '["vật liệu tổng hợp"]'
  && mat('compositeness') === '[]' && mat('Máy đúc composite') === '[]');

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
  check('L1-3b chotDong8: không lưới, tên loại chỉ so chữ (không tất định) → KHONG_THE_CHOT, không hỏi lại tên', cd.ketQua === 'KHONG_THE_CHOT' && cd.lyDo === 'ranh-gioi-so-chu-khong-tat-dinh', JSON.stringify(cd));
  check('L1-3b danhGiaDong: TEN_LOAI so chữ → CHUA_BIET kèm soChu (không làm căn cứ chốt)', (() => { const x = danhGiaDong({ hs: '84145110', dieuKienSo: [{ fact: 'tenLoai', op: 'TEN_LOAI', value: ['quạt bàn'] }] }, 'Quạt treo tường'); return x.trangThai === 'CHUA_BIET' && x.chiTiet[0].soChu === 'TRAI' && x.chiTiet[0].khongTatDinh === true; })());
  cd = chotDong8({ hs: '84145199', productText: 'Quạt treo tường' });
  check('L1-3b chotDong8: thiếu dữ kiện lưới → THIEU_SO_LIEU + câu hỏi tu-vung', cd.ketQua === 'THIEU_SO_LIEU' && cd.missingFacts?.some((m) => m.fact === 'coLuoiBaoVe' && /lưới/.test(m.cauHoi || '')), JSON.stringify(cd));
  const tv2 = trangThaiDong8({ hs: '84145191', productText: 'Quạt treo tường không có lưới bảo vệ' });
  check('L1-3b trangThaiDong8: op mới → TRAI; veMoHinh chứa vế có chữ của khoá', tv2?.trangThai === 'TRAI' && tv2.veMoHinh.join() === 'Có lưới bảo vệ', JSON.stringify(tv2));
  const { moTaDieuKienTrai } = require('../lib/so-tay-gates.js');
  check('L1-3b moTaDieuKienTrai: op mới in bằng nhãn tu-vung, không "undefined"', /lưới bảo vệ/.test(moTaDieuKienTrai(tv2)) && !/undefined/.test(moTaDieuKienTrai(tv2)), moTaDieuKienTrai(tv2));
}

// ── #1180: Nhóm 8539 đưa về SẠCH theo chuẩn LUẬT (3a, 3b, 3c, 3d, 3e) ──
{
  const { danhGiaDong } = require('../lib/so-tay-gates.js');
  const fs8539 = require('fs');
  const path8539 = require('path');

  // 3(a) Bỏ "loại" đứng đầu tên dòng khỏi danh sách định ngữ trong headPhrases; giữ "loại" giữa câu làm định ngữ
  const hpRenXoay = headPhrases('Loại đầu đèn ren xoáy').map((p) => p.join(' '));
  const hpTrangTri = headPhrases('Loại dùng trong chiếu sáng trang trí, công suất không quá 60 W').map((p) => p.join(' '));
  const hpGiuaCau = headPhrases('Máy bơm nước loại ly tâm').map((p) => p.join(' '));
  check('#1180(3a) headPhrases: "Loại đầu đèn ren xoáy" rút ra ["đầu đèn ren xoáy"], không bị rỗng vì chữ "Loại" đầu câu',
    hpRenXoay.includes('đầu đèn ren xoáy') && hpTrangTri.length === 0 && hpGiuaCau.includes('máy bơm nước'),
    JSON.stringify({ hpRenXoay, hpTrangTri, hpGiuaCau }));

  // 3(c) Xoá bản ghi trùng 85395210 trong data/so-tay/8539.json (mọi mã dong8 trong 8539.json là duy nhất)
  const st8539 = JSON.parse(fs8539.readFileSync(path8539.join(process.cwd(), 'data/so-tay/8539.json'), 'utf8'));
  const d85395210 = (st8539.dong8 || []).filter((d) => String(d.hs).replace(/\D/g, '') === '85395210');
  const allHs8539 = (st8539.dong8 || []).map((d) => String(d.hs).replace(/\D/g, ''));
  check('#1180(3c) data/so-tay/8539.json: chỉ còn đúng 1 bản ghi 85395210 có dieuKienSo, 40 dòng không trùng',
    d85395210.length === 1 && Array.isArray(d85395210[0].dieuKienSo) && d85395210[0].dieuKienSo.length === 1 && new Set(allHs8539).size === allHs8539.length,
    JSON.stringify({ count85395210: d85395210.length, total: allHs8539.length, unique: new Set(allHs8539).size }));

  // 3(b) & 3(d) SO_TAY_DONG8 và chotDong8 đọc dieuKienSo của ranh giới DUYET + TEN_LOAI khớp nguyên văn hoặc tên khác L1/L2 là tất định
  const kqNguyenVan = chotDong8({ hs: '85395290', productText: 'Bóng đèn đi-ốt phát quang (LED), Loại đầu đèn ren xoáy' });
  check('#1180(3b+3d) chotDong8 khớp nguyên văn TEN_LOAI "Loại đầu đèn ren xoáy" → CHOT 85395210',
    kqNguyenVan.ketQua === 'CHOT' && kqNguyenVan.hs === '85395210', JSON.stringify(kqNguyenVan));

  const kqE27 = chotDong8({ hs: '85395290', productText: 'Bóng đèn LED tròn đuôi xoáy E27, 9W, 220V' });
  const kqE14 = chotDong8({ hs: '85395290', productText: 'Bóng đèn LED quả nhót đui xoáy E14, 5W, 220V' });
  const kqE40 = chotDong8({ hs: '85395290', productText: 'Bóng đèn LED công nghiệp đui đèn xoáy ren Edison E40, 50W' });
  check('#1180(3b+3d) chotDong8 khớp tên khác có nguồn L1/L2 (E27 / E14 / E40) → CHOT 85395210',
    kqE27.ketQua === 'CHOT' && kqE27.hs === '85395210' && kqE14.ketQua === 'CHOT' && kqE14.hs === '85395210' && kqE40.ketQua === 'CHOT' && kqE40.hs === '85395210',
    JSON.stringify({ kqE27, kqE14, kqE40 }));

  const gateE27 = soTayGates({ hs: '85395290', productText: 'Bóng đèn LED tròn đuôi xoáy E27, 9W, 220V' });
  const chDong8E27 = gateE27.challenges.find((c) => c.gate === 'SO_TAY_DONG8');
  check('#1180(3b) SO_TAY_DONG8 đọc dieuKienSo ranh giới DUYET + tên khác L1/L2: chọn 85395290 cho hàng E27 → bật cảnh báo sang 85395210',
    Boolean(chDong8E27) && chDong8E27.sibling === '85395210', JSON.stringify(gateE27.challenges));

  const kqB22 = chotDong8({ hs: '85395290', productText: 'Bóng đèn LED đui gài B22, 9W, 220V' });
  const gateB22 = soTayGates({ hs: '85395290', productText: 'Bóng đèn LED đui gài B22, 9W, 220V' });
  check('#1180(3d) ca đui gài B22 → không đẩy sang 85395210 (cả chotDong8 lẫn SO_TAY_DONG8)',
    kqB22.hs !== '85395210' && !gateB22.challenges.some((c) => c.gate === 'SO_TAY_DONG8' && c.sibling === '85395210'),
    JSON.stringify({ kqB22, challenges: gateB22.challenges }));

  const kqLuiBieu = chotDong8({ hs: '853932', productText: 'Bóng đèn hơi thủy ngân hoặc natri; bóng đèn ha-lo-gien kim loại' });
  check('#1180(3b) phân nhóm chưa có ranh-gioi.json (853932) lùi về tên biểu thuế → CHOT 85393200',
    kqLuiBieu.ketQua === 'CHOT' && kqLuiBieu.hs === '85393200', JSON.stringify(kqLuiBieu));

  // 3(e) 13 phân nhóm từng ném lỗi cauHoiCho(undefined) nay không ném lỗi nữa
  const PN6_13 = ['380899', '630790', '640690', '732690', '840991', '845290', '848120', '851762', '853180', '853190', '871410', '940541', '940542'];
  const loi13 = [];
  for (const pn6 of PN6_13) {
    try {
      const r = chotDong8({ hs: pn6, productText: 'Hàng hóa mẫu kiểm tra không đủ thông số kỹ thuật' });
      if (!r || !r.ketQua) loi13.push(`${pn6}:no-ketQua`);
    } catch (e) {
      loi13.push(`${pn6}:${e.message}`);
    }
  }
  check('#1180(3e) 13 phân nhóm có điều kiện HOAC thiếu fact ở cấp ngoài không còn ném lỗi khi gọi chotDong8',
    loi13.length === 0, JSON.stringify(loi13));

  // Vòng 2: Khóa TEN_LOAI về "cụm phân biệt của dòng" (bỏ từ đã có ở tên nhóm 4 số / phân nhóm 6 số cha)
  const r350510 = chotDong8({ hs: '350510', productText: 'Dextrin và các dạng tinh bột biến tính khác' });
  check('Vòng 2 (350510): "Dextrin và các dạng tinh bột biến tính khác" không được tự chốt 35051010 (phải hỏi hoặc không chốt)',
    r350510.ketQua !== 'CHOT' && r350510.hs !== '35051010' && ['THIEU_SO_LIEU', 'KHONG_THE_CHOT'].includes(r350510.ketQua),
    JSON.stringify(r350510));

  const r320619 = chotDong8({ hs: '320619', productText: 'Thuốc màu và các chế phẩm từ dioxit titan - Loại khác' });
  check('Vòng 2 (320619): "… dioxit titan - Loại khác" không được tự chốt 32061910 (từ "Thuốc màu" đã nằm ở phân nhóm cha)',
    r320619.ketQua !== 'CHOT' && r320619.hs !== '32061910' && ['THIEU_SO_LIEU', 'KHONG_THE_CHOT'].includes(r320619.ketQua),
    JSON.stringify(r320619));

  const r840991 = chotDong8({ hs: '840991', productText: 'Loại khác - Chỉ dùng hoặc chủ yếu dùng cho động cơ đốt trong kiểu piston đốt cháy bằng tia lửa điện: Dùng cho xe của nhóm 87.11' });
  check('Vòng 2 (840991): "Loại khác - … Dùng cho xe của nhóm 87.11" không được tự chốt 84099137 (từ "piston" đã nằm ở tên phân nhóm 6 số)',
    r840991.ketQua !== 'CHOT' && r840991.hs !== '84099137' && ['THIEU_SO_LIEU', 'KHONG_THE_CHOT'].includes(r840991.ketQua),
    JSON.stringify(r840991));

  // Vá đọc phủ định trước cụm tên dòng / tên khác:
  const rKoPhaiVanCan = chotDong8({ hs: '84813090', productText: 'Van kiểm tra lửa DN140 (van 1 chiều), ko phải van cản, bằng gang' });
  check('Phủ định tên dòng: "Van kiểm tra lửa DN140 (van 1 chiều), ko phải van cản, bằng gang" → không chốt 84813010',
    rKoPhaiVanCan.hs !== '84813010',
    JSON.stringify(rKoPhaiVanCan));

  const rVanCan = chotDong8({ hs: '84813090', productText: 'van cản bằng gang đúc DN100' });
  check('Khẳng định tên dòng: "van cản bằng gang đúc DN100" → vẫn chốt 84813010',
    rVanCan.ketQua === 'CHOT' && rVanCan.hs === '84813010',
    JSON.stringify(rVanCan));

  const rKhongPhaiDuiXoay = chotDong8({ hs: '85395290', productText: 'bóng LED không phải đui xoáy, đui gài B22' });
  check('Phủ định tên khác: "bóng LED không phải đui xoáy, đui gài B22" → không chốt 85395210',
    rKhongPhaiDuiXoay.hs !== '85395210',
    JSON.stringify(rKhongPhaiDuiXoay));

  const TU_PHU_DINH_12 = ['không phải', 'ko phải', 'k phải', 'không có', 'không dùng cho', 'không thuộc', 'trừ', 'ngoại trừ', 'chưa', 'not', 'non-', 'without'];
  const loiPhuDinh12 = [];
  for (const neg of TU_PHU_DINH_12) {
    const txt = neg === 'non-' ? 'LED lamp non-screw base, B22' : `bóng LED ${neg} đui xoáy, đui gài B22`;
    const r = chotDong8({ hs: '85395290', productText: txt });
    if (r.hs === '85395210') loiPhuDinh12.push(`${neg}:${r.ketQua}:${r.hs}`);
  }
  check('Phủ định 12 từ tối thiểu ("không phải", "ko phải", "k phải", "không có", "không dùng cho", "không thuộc", "trừ", "ngoại trừ", "chưa", "not", "non-", "without") đều chặn chốt 85395210',
    loiPhuDinh12.length === 0,
    JSON.stringify(loiPhuDinh12));
}

// ── Cụm TUỲ CHỌN "có hoặc không có X" KHÔNG được đọc thành phủ định (OZV-276, #1109) ──────────────
// "có hoặc không có đầu" nghĩa là đầu KHÔNG ràng buộc — hàng có đầu hay không đều vào dòng đó.
// Trước bản vá, nhánh `không\s+có` của RE_PHU_DINH_VE (thêm ở PR #1185) cho phép cách cụm tối đa 3 từ
// nên "…có hoặc không có đầu…" đọc ra PHU_DINH cho "đầu" (mà "đuôi"/"chân" vẫn KHANG_DINH — lệch
// ngay trong một câu). Nếu ai sửa regex phủ định làm tái phát, bộ này đỏ.
{
  const DK = require('../lib/dieu-kien-so.js');
  const TC = require('../lib/cum-tuy-chon.js');
  const kc = (t, p) => DK.khopCumTrongChu(String(t).normalize('NFC'), p, { laTenLoai: true })?.trangThai ?? null;

  const da = 'Da lông cừu nguyên con, có hoặc không có đầu, đuôi hoặc chân';
  check('tuỳ chọn 1a "có hoặc không có đầu, đuôi hoặc chân" → cả ba cụm KHẲNG ĐỊNH, không cụm nào PHU_DINH',
    kc(da, 'đầu') === 'KHANG_DINH' && kc(da, 'đuôi') === 'KHANG_DINH' && kc(da, 'chân') === 'KHANG_DINH',
    JSON.stringify({ dau: kc(da, 'đầu'), duoi: kc(da, 'đuôi'), chan: kc(da, 'chân') }));

  check('tuỳ chọn 1b "whether or not containing colour" → KHÔNG phủ định',
    kc('Hàng hóa whether or not containing colour', 'colour') !== 'PHU_DINH',
    String(kc('Hàng hóa whether or not containing colour', 'colour')));

  // Các biến thể có thật trong data/tax.json (quét 11.871 dòng) + dạng viết tắt "ko có" mà
  // lib/subheading-check.js đã gặp trên tờ khai thật.
  const BIEN_THE = [
    ['Gỗ đã cưa, đã hoặc chưa cắt đầu', 'đầu'],
    ['Giấy in, có hoặc ko có hình', 'hình'],
    ['Thịt, whether or not cooked before smoking', 'cooked'],
    ['Vải dệt, with or without lining', 'lining'],
    ['Cầu chủ động, có hoặc không kèm theo hộp số', 'hộp số'],
    ['Thép tấm, đã hoặc không ghép lớp', 'ghép lớp'],
  ];
  const loiBienThe = BIEN_THE.filter(([t, p]) => kc(t, p) === 'PHU_DINH').map(([t, p]) => `${p} @ ${t}`);
  check('tuỳ chọn 1c 6 biến thể thật trong biểu ("đã hoặc chưa", "có hoặc ko có", "whether or not", "with or without", "có hoặc không kèm", "đã hoặc không ghép") đều KHÔNG phủ định',
    loiBienThe.length === 0, JSON.stringify(loiBienThe));

  // Rào ngược — quan trọng hơn: vá xong PHỦ ĐỊNH THẬT vẫn phải chặn, nếu không là vá hỏng chiều kia.
  const PHU_DINH_THAT = [
    ['Da lông cừu không có đầu', 'đầu'],
    ['Da lông cừu, ko có đầu', 'đầu'],
    ['Bóng LED không phải đui xoáy', 'đui xoáy'],
    ['Goods without colour', 'colour'],
    ['Gỗ chưa có vỏ', 'vỏ'],
    ['Thép, trừ loại ghép lớp', 'ghép lớp'],
  ];
  const sotPhuDinh = PHU_DINH_THAT.filter(([t, p]) => kc(t, p) !== 'PHU_DINH').map(([t, p]) => `${p} @ ${t} → ${kc(t, p)}`);
  check('tuỳ chọn 1d phủ định THẬT ("không có", "ko có", "không phải", "without", "chưa có", "trừ") vẫn PHU_DINH — bản vá không nới phủ định',
    sotPhuDinh.length === 0, JSON.stringify(sotPhuDinh));

  // Bẫy trộn hai mức: câu CHO PHÉP mức CÂU vẫn chứa phủ định thật ở mức CỤM.
  check('tuỳ chọn 1e "ngay cả khi không có đầu" vẫn là phủ định ở mức CỤM (không nhập hai mức)',
    kc('Da lông cừu, ngay cả khi không có đầu', 'đầu') === 'PHU_DINH',
    String(kc('Da lông cừu, ngay cả khi không có đầu', 'đầu')));

  // Hàm dùng chung
  check('tuỳ chọn 1f lib/cum-tuy-chon.js: nhận cụm tuỳ chọn, không nhận phủ định trần',
    TC.coCumTuyChon('có hoặc không có đầu') && TC.coCumTuyChon('whether or not refined')
    && TC.coCumTuyChon('đã hoặc chưa cắt') && TC.coCumTuyChon('có hoặc ko có hình')
    && !TC.coCumTuyChon('không có đầu') && !TC.coCumTuyChon('và/hoặc'),
    '');
  // Bẫy em vấp thật ở lượt đầu: bản ASCII (cho lib/subheading-check.js#polarityText) phải ăn LUÔN động
  // từ "co|chua" sau liên từ. Chỉ xoá liên từ thì "co hoac khong co ga" còn "co ga" ⇒ POS_FEATURE đọc
  // thành đặc tính DƯƠNG "ga", nhãn 22021020 "Nước tăng lực có hoặc không có ga" bị coi là "có ga" →
  // test-erp-input đỏ 2 ca. Đặc tính trong cụm tuỳ chọn phải thành KHÔNG CÓ CỰC TÍNH.
  check('tuỳ chọn 1g-ascii boCumTuyChonAscii xoá cả động từ sau liên từ (không để lại "co ga" dương tính)',
    !/\bco\s+ga\b/.test(TC.boCumTuyChonAscii('nuoc tang luc co hoac khong co ga'))
    && /\bga\b/.test(TC.boCumTuyChonAscii('nuoc tang luc co hoac khong co ga'))
    && !/\bco\s+dau\b/.test(TC.boCumTuyChonAscii('da cuu co hoac khong co dau')),
    JSON.stringify(TC.boCumTuyChonAscii('nuoc tang luc co hoac khong co ga')));

  check('tuỳ chọn 1h boCumTuyChon giữ nguyên độ dài chữ (không dán hai từ hai bên vào nhau)',
    TC.boCumTuyChon('da cừu có hoặc không có đầu').length === 'da cừu có hoặc không có đầu'.length
    && /^da cừu\s+có đầu$/u.test(TC.boCumTuyChon('da cừu có hoặc không có đầu').replace(/\s+(?=có đầu)/u, ' ')),
    JSON.stringify(TC.boCumTuyChon('da cừu có hoặc không có đầu')));

  // ── OZV-325: cụm tuỳ chọn NHIỀU VẾ — "đã hoặc chưa có X hoặc chỉ có Y" ──────────────────────────
  // boCumTuyChon chỉ xoá LIÊN TỪ, nên vế sau chữ "hoặc" còn nguyên và bị đọc thành dữ kiện đã khai.
  // Ca thật: tên nút 4 số của 3706 chứa "đã hoặc chưa có rãnh tiếng HOẶC CHỈ CÓ DUY NHẤT RÃNH TIẾNG",
  // trùng nguyên văn cachDoc của khoá chiCoRanhTieng ⇒ hàng dòng "Loại khác" 37069090 bị chốt sang
  // 37069040 ("Loại khác, chỉ có duy nhất rãnh tiếng"). Đây là chốt SAI MÃ, nặng hơn chốt Loại khác.
  const TEN_NUT_3706 = 'Phim dùng trong điện ảnh, đã phơi sáng và đã tráng, đã hoặc chưa có rảnh tiếng hoặc chỉ có duy nhất rãnh tiếng.';
  check('tuỳ chọn 2a cụm nhiều vế: xoá CẢ vế sau "hoặc" ("chỉ có duy nhất rãnh tiếng" không còn đọc được)',
    !/chỉ\s+có\s+duy\s+nhất\s+rãnh\s+tiếng/u.test(TC.boVeTuyChonTiep(TEN_NUT_3706))
    && TC.boVeTuyChonTiep(TEN_NUT_3706).length === TEN_NUT_3706.length,
    JSON.stringify(TC.boVeTuyChonTiep(TEN_NUT_3706)));

  // Rào ngược 1 — vế MANG NGHĨA sau dấu phẩy / " - " phải CÒN NGUYÊN. Bản đầu không chặn ranh giới này
  // đã ăn lẹm sang vế mang nghĩa và làm MẤT 2 ca chotDung đang đúng (24031190, 24031999) — đo toàn biểu
  // mới thấy, nhìn tổng `chotSai` thì vẫn tưởng là được.
  //
  // CHỮ THẬT của biểu (data/tax.json), không phải chữ tự nghĩ: hai nhãn này có cụm tuỳ chọn rồi còn
  // "hoặc" tiếp, nên regex ĂN được — phần sau dấu phẩy là chỗ duy nhất rào `(?!\s-\s)` + bỏ dấu phẩy
  // khỏi lớp ký tự giữ lại được. Gỡ rào thì hai ca này đỏ ngay (đã chạy mutation để chắc không phải ca rỗng).
  const NHAN_2514 = 'Đá phiến, đã hoặc chưa đẽo thô hoặc mới chỉ cắt, bằng cưa hoặc cách khác, thành khối hoặc tấm hình chữ nhật (kể cả hình vuông)';
  check('tuỳ chọn 2b cụm nhiều vế KHÔNG ăn qua dấu phẩy — giữ vế mang nghĩa "bằng cưa…" của 2514.00',
    /bằng cưa hoặc cách khác, thành khối hoặc tấm hình chữ nhật/u.test(TC.boVeTuyChonTiep(NHAN_2514))
    && TC.boVeTuyChonTiep(NHAN_2514).length === NHAN_2514.length,
    JSON.stringify(TC.boVeTuyChonTiep(NHAN_2514)));

  const NHAN_2706 = 'Hắc ín chưng cất từ than đá, than non hoặc than bùn, và các loại hắc ín khoáng chất khác, đã hoặc chưa khử nước hoặc chưng cất từng phần, kể cả hắc ín tái chế';
  check('tuỳ chọn 2b2 … và giữ vế "kể cả hắc ín tái chế" của 2706.00 (vế mở rộng phạm vi, mất là sai nghĩa)',
    /kể cả hắc ín tái chế/u.test(TC.boVeTuyChonTiep(NHAN_2706)),
    JSON.stringify(TC.boVeTuyChonTiep(NHAN_2706)));

  // Rào ngược 2 — chữ không có cụm tuỳ chọn thì trả y nguyên (gọi vô điều kiện vẫn an toàn).
  check('tuỳ chọn 2c chữ không có cụm tuỳ chọn → trả y nguyên',
    TC.boVeTuyChonTiep('Phim điện ảnh, chỉ có duy nhất rãnh tiếng') === 'Phim điện ảnh, chỉ có duy nhất rãnh tiếng',
    '');

  // ── Cổng thật trên đường chốt dòng 8 — bản nháp DUYET do CHÍNH TEST dựng ───────────────────────────
  // KHÔNG đọc trạng thái bản nháp SỐNG của 370690 (tệp json trong thư mục ranh giới hồ sơ): các lô soát còn đổi
  // DUYET⇄TRA_VE liên tục, nên ca bám vào trạng thái dữ liệu là CA RỖNG — khi 370690 ở TRA_VE thì
  // chotDong8 trả KHONG_THE_CHOT/`ranh-gioi-chua-so-hoa`, ca "không chốt .40" pass vì chẳng chốt gì,
  // không phải vì bản vá (soát độc lập 11/11 bắt đúng lỗi này: mutation gỡ hẳn bản vá mà test không đỏ
  // thêm ca nào). Dựng bản nháp tay vào thư mục tạm của test-isolate-data ⇒ ca độc lập với lô soát.
  fs.mkdirSync(path.join(TEST_DATA_DIR, 'ho-so', 'ranh-gioi'), { recursive: true });
  fs.writeFileSync(path.join(TEST_DATA_DIR, 'ho-so', 'ranh-gioi', '370690.json'), JSON.stringify({
    phienBan: 'ranh-gioi@1', pn6: '370690', nhom: '3706', trangThai: 'DUYET',
    soanBoi: { vai: 'AI', phien: 'phien-test-cum-tuy-chon', ngay: '2026-11-11' },
    duyet: { vai: 'test', ngay: '2026-11-11' }, dieuKienNut: [], ghiChuSoan: [],
    dong8: [
      { hs: '37069010', nguon: 'tax.37069010', trich: '37069010 - - Phim thời sự, phim du lịch, phim kỹ thuật và phim khoa học', nguonLoai: 'AI_DA_KIEM',
        dieuKienSo: [{ fact: 'tenLoai', op: 'TEN_LOAI', value: ['Phim thời sự', 'phim du lịch', 'phim kỹ thuật', 'phim khoa học'] }] },
      { hs: '37069030', nguon: 'tax.37069030', trich: '37069030 - - Phim tài liệu khác', nguonLoai: 'AI_DA_KIEM', phanConLai: true,
        dieuKienSo: [{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'Phim tài liệu' }] },
      { hs: '37069040', nguon: 'tax.37069040', trich: '37069040 - - Loại khác, chỉ có duy nhất rãnh tiếng', nguonLoai: 'AI_DA_KIEM',
        dieuKienSo: [{ fact: 'chiCoRanhTieng', op: 'CO' }] },
      { hs: '37069090', nguon: 'tax.37069090', trich: '37069090 - - Loại khác', nguonLoai: 'AI_DA_KIEM', dieuKienSo: [] },
    ],
  }));

  // Ca vá: mô tả CHỈ có tên nút (chưa ai khai gì về rãnh tiếng) ⇒ không được chốt .40.
  // Trên nền chưa vá (main 52663e4f, đo tại chỗ) ca này ra CHOT/37069040 — tức ĐỎ đúng chỗ.
  cd = chotDong8({ hs: '370690', productText: `${TEN_NUT_3706} - Loại khác` });
  check('370690 chỉ có tên nút (cụm tuỳ chọn nhiều vế) → KHÔNG chốt 37069040, phải hỏi/không chốt',
    cd.hs !== '37069040' && cd.ketQua !== 'CHOT', JSON.stringify([cd.ketQua, cd.hs, cd.lyDo]));

  // Chiều ĐÚNG vẫn phải chốt được: khai rõ "chỉ có duy nhất rãnh tiếng" (ngoài cụm tuỳ chọn) ⇒ .40.
  // Nếu bản vá che cả chỗ này thì nó vá hỏng chiều kia — mất một dòng thuế dùng thật.
  cd = chotDong8({ hs: '370690', productText: 'Phim điện ảnh đã phơi sáng và đã tráng, chỉ có duy nhất rãnh tiếng' });
  check('370690 khai RÕ "chỉ có duy nhất rãnh tiếng" (ngoài cụm tuỳ chọn) → vẫn chốt 37069040',
    cd.ketQua === 'CHOT' && cd.hs === '37069040', JSON.stringify([cd.ketQua, cd.hs, cd.lyDo]));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
