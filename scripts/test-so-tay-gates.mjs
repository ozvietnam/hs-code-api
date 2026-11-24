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

// OZV-1473: chặn SO_TAY_LOAI_TRU bắn oan chính tên phân nhóm/dòng của nhóm h4 khi mô tả không có định ngữ loại trừ
r = soTayGates({ hs: '85366992', productName: 'ổ cắm gne-2z10-085695 màu đen pdu 1u,3*1- 1.8m', productText: 'ổ cắm gne-2z10-085695 màu đen pdu 1u,3*1- 1.8m' });
check('OZV-1473 85366992 ổ cắm PDU không có định ngữ "dây dẫn" → không bắn oan SO_TAY_LOAI_TRU:8544',
  !r.challenges.some((c) => c.gate === 'SO_TAY_LOAI_TRU'), JSON.stringify(gatesOf(r)));
r = soTayGates({ hs: '85366992', productName: 'phích cắm công nghiệp 3 pha 16A', productText: 'phích cắm công nghiệp 3 pha 16A' });
check('OZV-1473 85366992 phích cắm không kèm dây dẫn → không bắn oan SO_TAY_LOAI_TRU:8544',
  !r.challenges.some((c) => c.gate === 'SO_TAY_LOAI_TRU'), JSON.stringify(gatesOf(r)));
r = soTayGates({ hs: '85366992', productName: 'ổ cắm đi kèm dây dẫn 3m', productText: 'ổ cắm đi kèm dây dẫn 3m' });
check('OZV-1473 85366992 ổ cắm đi kèm dây dẫn → vẫn bật SO_TAY_LOAI_TRU:8544',
  gatesOf(r).includes('SO_TAY_LOAI_TRU:8544'), JSON.stringify(gatesOf(r)));
r = soTayGates({ hs: '85098090', productName: 'quạt thông gió âm trần', productText: 'quạt thông gió âm trần 25W' });
check('OZV-1473 85098090 quạt thông gió (không thuộc tên nút/dòng 8509) → vẫn bật SO_TAY_LOAI_TRU:8414',
  gatesOf(r).includes('SO_TAY_LOAI_TRU:8414'), JSON.stringify(gatesOf(r)));

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

// OZV-1320: nhóm 8481 opt-in thách thức khi hàng hoàn chỉnh (AR/FRL) bị xếp nhầm 8481.90
r = soTayGates({
  hs: '848190',
  productName: 'bộ lọc khí zonye ar2000 -02',
  productText: 'bộ lọc khí zonye ar2000 -02',
  form: 'hoàn chỉnh',
});
check('OZV-1320 Zonye AR hoàn chỉnh + 848190 → SO_TAY_BO_PHAN (chặn earlyExit HOI)', gatesOf(r).some((g) => g.startsWith('SO_TAY_BO_PHAN:8481')), JSON.stringify(gatesOf(r)));
r = soTayGates({
  hs: '84812011',
  productName: 'bộ lọc khí zonye ar2000 -02',
  productText: 'bộ lọc khí zonye ar2000 -02',
  form: 'hoàn chỉnh',
});
check('OZV-1320 Zonye AR đã đúng 84812011 → không nghi bộ phận', !gatesOf(r).some((g) => g.startsWith('SO_TAY_BO_PHAN')), JSON.stringify(gatesOf(r)));
r = soTayGates({
  hs: '84819090',
  productName: 'Vỏ van cổng DN80',
  productText: 'vỏ van cổng, bộ phận rời',
  form: 'bộ phận',
});
check('OZV-1320 bộ phận van thật + 848190 → không nghi chiều ngược', !gatesOf(r).some((g) => g.startsWith('SO_TAY_BO_PHAN')), JSON.stringify(gatesOf(r)));

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
check('thiếu số liệu → THIEU_SO_LIEU + missingFacts duong_kinh', cd.ketQua === 'THIEU_SO_LIEU' && ['duong_kinh', 'duongKinh'].includes(cd.missingFacts?.[0]?.fact), JSON.stringify(cd.missingFacts));
cd = chotDong8({ hs: '84811019', productText: 'van cổng điều khiển bằng tay, đường kính 30 cm' });
check('8481.10 (đã duyệt ranh giới 848110.json): chưa khai chất liệu + đường kính trong → THIEU_SO_LIEU (không đoán)', cd.ketQua === 'THIEU_SO_LIEU' && (cd.missingFacts || []).some((m) => m.fact === 'chatLieu'), JSON.stringify(cd.missingFacts));
cd = chotDong8({ hs: '84811019', productText: 'van giảm áp bằng đồng, đường kính trong 2 cm' });
check('8481.10 + op LA: đồng 2cm → CHOT 84811021 (đúng luật, không cần AI chọn dòng)', cd.ketQua === 'CHOT' && cd.hs === '84811021', JSON.stringify([cd.ketQua, cd.hs]));
cd = chotDong8({ hs: '84811019', productText: 'van giảm áp bằng plastic, đường kính trong 2 cm' });
check('8481.10: plastic 2cm → CHOT 84811091 (nút 8481102 đã khoá chất liệu đồng)', cd.ketQua === 'CHOT' && cd.hs === '84811091', JSON.stringify([cd.ketQua, cd.hs]));
cd = chotDong8({ hs: '84051099', productText: 'máy phát acetylen' });
check('phân nhóm chưa số hóa ranh giới → KHONG_THE_CHOT (điểm mù)', cd.checked === false || cd.ketQua === 'KHONG_THE_CHOT', JSON.stringify(cd.ketQua));

// #195 chốt dòng — 3 hành vi sau đọc tay 18 ca oan (13/10); OZV-1660 cập nhật sau PR #1495 duyệt ranh giới 850440:
cd = chotDong8({ hs: '85044090', productText: 'Bộ nguồn 260W, đầu vào AC100-240V' });
const cd85044090Trai = chotDong8({
  hs: '85044090',
  productText: 'Bộ nguồn 260W, công suất biểu kiến 1 kVA, không phải bộ nguồn cấp điện liên tục, không phải bộ chỉnh lưu, không phải bộ nghịch lưu',
});
check('8504.40 có 2 dòng Loại khác → thiếu dữ kiện thì THIEU_SO_LIEU (không tự chốt .19/.90); bác bỏ 4 dòng có tên vẫn KHONG_THE_CHOT (nhieu-dong-loai-khac)',
  cd.ketQua === 'THIEU_SO_LIEU' && !cd.hs
  && cd85044090Trai.ketQua === 'KHONG_THE_CHOT' && ['nhieu-dong-loai-khac', 'phu-dinh-chua-hoan-chinh'].includes(cd85044090Trai.lyDo),
  JSON.stringify({ cd, cd85044090Trai }));
cd = chotDong8({ hs: '85444299', productText: 'Dây cáp mạng USB, đường kính lõi 0.0625mm, vỏ nhựa cách điện' });
// L1-4c đợt 3: 854442 đã duyệt + áp vào sổ tay (chatLieu CACH_DIEN, soSoi có kiểu) ⇒ máy hỏi thêm dữ kiện (THIEU_SO_LIEU)
// thay vì bỏ cuộc; ý của ca vẫn giữ: không tự chốt .94 cho cáp mạng USB (CEO 30/10/2026: cáp dữ liệu theo TB-TCHQ .99).
check('8544.42.94 → không chốt .94 cho cáp mạng USB (bảo thủ: KHONG_THE_CHOT hoặc THIEU_SO_LIEU)', ['KHONG_THE_CHOT', 'THIEU_SO_LIEU'].includes(cd.ketQua) && cd.hs !== '85444294', JSON.stringify(cd));
cd = chotDong8({ hs: '40118011', productText: 'Lốp máy xúc lật 14.00-24, đường kính 788mm' });
check('4011 ngưỡng VÀNH không lấy đường kính ngoài → không tự chốt (KHONG_THE_CHOT hoặc THIEU_SO_LIEU hỏi duongKinhVanh)',
  ['KHONG_THE_CHOT', 'THIEU_SO_LIEU'].includes(cd.ketQua) && !cd.hs && (cd.ketQua === 'KHONG_THE_CHOT' || (cd.missingFacts || []).some((m) => m.fact === 'duongKinhVanh')),
  JSON.stringify(cd));
cd = chotDong8({ hs: '85044019', productText: 'Bộ đổi nguồn 30W dùng cho tủ điện' });
const cd85044019Trai = chotDong8({
  hs: '85044019',
  productText: 'Bộ đổi nguồn 30W dùng cho tủ điện, công suất biểu kiến 1 kVA, không phải bộ nguồn cấp điện liên tục, không phải bộ chỉnh lưu, không phải bộ nghịch lưu',
});
check('8504.40 chọn .19 (LK trong) cũng không tự chốt — thiếu dữ kiện trả THIEU_SO_LIEU, bác bỏ 4 dòng có tên trả KHONG_THE_CHOT',
  cd.ketQua === 'THIEU_SO_LIEU' && !cd.hs && cd85044019Trai.ketQua === 'KHONG_THE_CHOT',
  JSON.stringify({ cd, cd85044019Trai }));

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
check('trangThaiDong8.veMoHinh: 84814010 (đã duyệt 848140.json) chấm đủ cả hai vế chất liệu đồng và đường kính trong ≤ 2,5 cm', Boolean(tv) && tv.veMoHinh.length === 2 && /đồng/.test(tv.veMoHinh[0]) && /đường kính trong từ 2,5 cm trở xuống/.test(tv.veMoHinh[1]), JSON.stringify(tv?.veMoHinh));
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

  // ── OZV-972: Giữ tiêu đề trung gian "Loại khác, <vế riêng>" ở DONG_CO_TEN + coTenLoaiPhanBiet / coDieuKienPhanBietCungDong ──
  cd = chotDong8({ hs: '902810', productText: 'Thiết bị đo khí: Thiết bị đo khí được lắp trên bình ga' });
  check('OZV-972 90281010: TEN_LOAI lặp tên cha "Thiết bị đo khí" đi kèm TEN_LOAI phân biệt "lắp trên bình ga" → CHOT 90281010',
    cd.ketQua === 'CHOT' && cd.hs === '90281010', JSON.stringify([cd.ketQua, cd.hs, cd.lyDo]));

  cd = chotDong8({ hs: '902810', productText: 'Thiết bị đo khí' });
  check('OZV-972 902810 rào ngược THIEU_DU_KIEN: chỉ có tên cha "Thiết bị đo khí" → KHÔNG tự chốt',
    cd.ketQua !== 'CHOT' && cd.ketQua !== 'LOAI_KHAC', JSON.stringify([cd.ketQua, cd.hs, cd.lyDo]));

  cd = chotDong8({
    hs: '903289',
    productText: 'Dụng cụ và thiết bị khác - Loại khác: Dụng cụ và thiết bị đi kèm hoặc hoạt động cùng với máy xử lý dữ liệu tự động, để điều chỉnh hoặc điều khiển tự động hệ thống đẩy, giữ thăng bằng hoặc xếp hàng hóa của tàu thuyền',
  });
  check('OZV-972 90328910: TEN_LOAI/CONG_DUNG lặp tên nhóm 9032 đi kèm CONG_DUNG phân biệt "tàu thuyền" → CHOT 90328910',
    cd.ketQua === 'CHOT' && cd.hs === '90328910', JSON.stringify([cd.ketQua, cd.hs, cd.lyDo]));

  cd = chotDong8({
    hs: '903289',
    productText: 'Dụng cụ và thiết bị khác - Loại khác: Dụng cụ và thiết bị tự động để điều chỉnh hoặc điều khiển dung dịch hóa chất hoặc điện hóa trong sản xuất tấm mạch in/tấm dây in hoặc mạch in đã lắp ráp',
  });
  check('OZV-972 90328920: TEN_LOAI/CONG_DUNG lặp tên nhóm 9032 đi kèm CONG_DUNG phân biệt "dung dịch hóa chất" → CHOT 90328920',
    cd.ketQua === 'CHOT' && cd.hs === '90328920', JSON.stringify([cd.ketQua, cd.hs, cd.lyDo]));

  cd = chotDong8({
    hs: '903289',
    productText: 'Dụng cụ và thiết bị khác - Loại khác: Loại khác, hoạt động bằng điện: Bộ điều chỉnh điện áp tự động (ổn áp)',
  });
  check('OZV-972 90328931: giữ tiêu đề trung gian "Loại khác, hoạt động bằng điện" → CHOT 90328931',
    cd.ketQua === 'CHOT' && cd.hs === '90328931', JSON.stringify([cd.ketQua, cd.hs, cd.lyDo]));

  cd = chotDong8({ hs: '903289', productText: 'Dụng cụ và thiết bị khác - Loại khác' });
  check('OZV-972 903289 rào ngược THIEU_DU_KIEN: chỉ có "Dụng cụ và thiết bị khác - Loại khác" → KHÔNG tự chốt',
    cd.ketQua !== 'CHOT' && cd.ketQua !== 'LOAI_KHAC', JSON.stringify([cd.ketQua, cd.hs, cd.lyDo]));

  cd = chotDong8({
    hs: '481320',
    productText: 'Dạng tập hoặc ống có chiều rộng không quá 5 cm: Loại khác, không phủ: Giấy cuốn đầu lọc có độ xốp hơn 12 cm3 (min-1. cm-2) đo theo tiêu chuẩn ISO 2965, và có độ mờ lớn hơn 75%',
  });
  check('OZV-972 48132022: giữ tiêu đề trung gian "Loại khác, không phủ" + đọc op ">" cho "độ xốp hơn 12 cm3..." → CHOT 48132022 (không rơi 48132023)',
    cd.ketQua === 'CHOT' && cd.hs === '48132022', JSON.stringify([cd.ketQua, cd.hs, cd.lyDo]));

  const t0Redos = Date.now();
  DK.danhGiaTuChu({ fact: 'doXop', op: '>', value: 12 }, `${'độ xốp hơn '.repeat(40000)}12 cm3 (min-1. cm-2)`, '48132022');
  const dtRedos = Date.now() - t0Redos;
  check('OZV-972 ReDoS: câu ~40.000 từ lặp chạy < 2 giây', dtRedos < 2000, `${dtRedos}ms`);

  // ── OZV-1090: 900490 (CO_KHONG gỡ tiêu đề nhóm 90.04 đa vế), 961380 (giữ hỏi chatLieu), 160510, 84811022/84181091 ──
  cd = chotDong8({ hs: '900490', productText: 'Kính đeo, kính bảo hộ và các loại tương tự, kính thuốc, kính bảo vệ mắt hoặc loại khác. - Loại khác' });
  check('OZV-1090 900490: "Kính cận thị" → CHOT 90049010; tiêu đề nhóm 90.04 chứa "kính thuốc" → KHÔNG chốt nhầm 90049010',
    chotDong8({ hs: '900490', productText: 'Kính cận thị' }).hs === '90049010' && cd.ketQua !== 'CHOT' && cd.ketQua !== 'LOAI_KHAC', JSON.stringify([cd.ketQua, cd.hs]));
  cd = chotDong8({ hs: '961380', productText: 'Bật lửa châm thuốc lá' });
  check('OZV-1090 961380: chỉ ghi "Bật lửa châm thuốc lá" chưa khai chất liệu → THIEU_SO_LIEU (không chốt sai .30)',
    cd.ketQua === 'THIEU_SO_LIEU' && cd.hs !== '96138030', JSON.stringify([cd.ketQua, cd.hs]));
  cd = chotDong8({ hs: '160510', productText: 'Cua, ghẹ: Đóng bao bì kín khí để bán lẻ' });
  check('OZV-1090 16051014 THIEU_DU_KIEN: tiêu đề phân nhóm "Cua, ghẹ" → KHÔNG chốt nhầm 16051011',
    cd.ketQua !== 'CHOT' && cd.ketQua !== 'LOAI_KHAC', JSON.stringify([cd.ketQua, cd.hs]));
  cd = chotDong8({ hs: '848110', productText: 'Van giảm áp: Bằng đồng hoặc hợp kim đồng: Có đường kính trong trên 2,5 cm — 2,6 cm' });
  check('OZV-1090 84811022: ngưỡng một đầu "trên 2,5 cm" không bị giaTriCua đọc thành 2,5 → không chốt nhầm 84811021',
    cd.hs !== '84811021' && giaTriCua('duong_kinh', 'Có đường kính trong trên 2,5 cm').length === 0, JSON.stringify([cd.ketQua, cd.hs]));

  // ── OZV-1648: Dòng "Loại khác, <1 điều kiện>" (85184040) không bị hạ oan bởi anh em đã có vế soChu === 'TRAI' ──
  cd = chotDong8({
    hs: '851840',
    productText: 'Thiết bị điện khuếch đại âm tần: Loại khác, có từ 6 đường tín hiệu đầu vào trở lên, có hoặc không kết hợp với phần tử dùng cho khuếch đại công suất',
  });
  check('OZV-1648 85184040: ≥ 6 đường tín hiệu đầu vào, không phải bộ lặp (85184020/30 soChu=TRAI) → CHOT 85184040',
    cd.ketQua === 'CHOT' && cd.hs === '85184040', JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '851840',
    productText: 'Thiết bị điện khuếch đại âm tần sử dụng như bộ lặp, có từ 6 đường tín hiệu đầu vào trở lên',
  });
  check('OZV-1648 851840 rào ngược: mô tả có "bộ lặp" (85184020/30 soChu=THOA) chưa rõ hữu tuyến → vẫn hạ về THIEU_SO_LIEU hỏi choDienThoaiHuuTuyen, không chốt vội 85184040',
    cd.ketQua === 'THIEU_SO_LIEU' && cd.hs !== '85184040' && (cd.missingFacts || []).some((m) => m.fact === 'choDienThoaiHuuTuyen'),
    JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({ hs: '851840', productText: 'Thiết bị điện khuếch đại âm tần' });
  check('OZV-1648 851840 THIEU_DU_KIEN: chỉ có tên phân nhóm 6 số → THIEU_SO_LIEU (không tự chốt)',
    cd.ketQua === 'THIEU_SO_LIEU' && !cd.hs, JSON.stringify([cd.ketQua, cd.hs]));

  // ── OZV-1668: _traiKhiNutThoa không hạ oan khi nút anh em không khớp vế so chữ (8529) + phủ định tuHutHoiDoc cho kệ pallet (9403) ──
  cd = chotDong8({
    hs: '852910',
    productText: 'Ăng ten và bộ phản xạ ăng ten các loại; các bộ phận phù hợp sử dụng cho các thiết bị trên: Loại khác: Loại dùng với thiết bị truyền dẫn để phát sóng vô tuyến',
  });
  check('OZV-1668 85291093: nút 8529102 (HOAC Chảo phản xạ) không có phương án nào khớp vế so chữ → CHOT 85291093',
    cd.ketQua === 'CHOT' && cd.hs === '85291093', JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '852910',
    productText: 'Ăng ten và bộ phản xạ ăng ten các loại: Dùng cho chảo phản xạ, loại dùng với thiết bị truyền dẫn để phát sóng vô tuyến',
  });
  check('OZV-1668 852910 rào ngược: mô tả khớp vế so chữ "Chảo phản xạ" của phương án 2 nút 8529102 nhưng chưa rõ laBoPhan → không chốt vội 85291093',
    cd.hs !== '85291093' && cd.ketQua !== 'CHOT', JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '852990',
    productText: 'Bộ phận chỉ dùng hoặc chủ yếu dùng với các thiết bị thuộc các nhóm từ 85.24 đến 85.28 - Loại khác: Loại khác: Dùng cho máy thu truyền hình',
  });
  check('OZV-1668 85299091: nút 8529905 (Tấm mạch in, đã lắp ráp) có tenLoai soChu=TRAI → CHOT 85299091',
    cd.ketQua === 'CHOT' && cd.hs === '85299091', JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '852990',
    productText: 'Bộ phận dùng với thiết bị nhóm 85.28 - Loại khác: Tấm mạch in dùng cho máy thu truyền hình',
  });
  check('OZV-1668 852990 rào ngược: mô tả có "Tấm mạch in" (nút 8529905 soChu=THOA) chưa rõ đã lắp ráp → THIEU_SO_LIEU hỏi daLapRap, không chốt vội 85299091',
    cd.ketQua === 'THIEU_SO_LIEU' && cd.hs !== '85299091' && (cd.missingFacts || []).some((m) => m.fact === 'daLapRap'),
    JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '940320',
    productText: 'Đồ nội thất bằng kim loại khác: kệ chứa hàng pallet',
  });
  check('OZV-1668 94032090: "kệ chứa hàng pallet" phủ định tuHutHoiDoc → LOAI_KHAC 94032090',
    cd.ketQua === 'LOAI_KHAC' && cd.hs === '94032090', JSON.stringify([cd.ketQua, cd.hs]));

  cd = chotDong8({
    hs: '940320',
    productText: 'Đồ nội thất bằng kim loại khác',
  });
  check('OZV-1668 940320 rào ngược: mô tả chỉ có "Đồ nội thất bằng kim loại khác" → vẫn hỏi tuHutHoiDoc (THIEU_SO_LIEU)',
    cd.ketQua === 'THIEU_SO_LIEU' && (cd.missingFacts || []).some((m) => m.fact === 'tuHutHoiDoc'),
    JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  const t0RedosPallet = Date.now();
  DK.danhGiaTuChu({ fact: 'tuHutHoiDoc', op: 'CO' }, `${'kệ chứa hàng '.repeat(40000)}bằng thép`, '94032010');
  const dtRedosPallet = Date.now() - t0RedosPallet;
  check('OZV-1668 ReDoS tuHutHoiDoc: câu ~40.000 từ lặp chạy < 2 giây', dtRedosPallet < 2000, `${dtRedosPallet}ms`);

  // ── OZV-1677: Nút tổ tiên đa tầng (852329) + _traiKhiNutThoa khi không có dòng con cùng tên dưới nút anh em (852329/852359/852380) ──
  cd = chotDong8({
    hs: '852329',
    productText: 'Phương tiện lưu trữ thông tin từ tính - Loại khác: Băng từ, có chiều rộng không quá 4 mm - Loại chưa ghi: Băng máy tính',
  });
  check('OZV-1677 85232911: kế thừa 2 tầng nút tổ tiên (852329~r15471 <= 4 mm + 8523291 chưa ghi) → CHOT 85232911 (không TRANH_CAP .31/.51)',
    cd.ketQua === 'CHOT' && cd.hs === '85232911', JSON.stringify([cd.ketQua, cd.hs, cd.dongThoa]));

  cd = chotDong8({
    hs: '852329',
    productText: 'Phương tiện lưu trữ thông tin từ tính - Loại khác: Băng từ, có chiều rộng không quá 4 mm: Băng video',
  });
  check('OZV-1677 85232921: nút anh em 8523291 (chưa ghi) chỉ có dòng con Băng máy tính → CHOT 85232921',
    cd.ketQua === 'CHOT' && cd.hs === '85232921', JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '852329',
    productText: 'Phương tiện lưu trữ thông tin từ tính - Loại khác: Băng từ, có chiều rộng trên 4 mm nhưng không quá 6,5 mm: Băng máy tính',
  });
  check('OZV-1677 85232941 rào ngược: nút anh em 8523293 (chưa ghi) cũng có dòng con Băng máy tính (85232931) → THIEU_SO_LIEU hỏi daGhi, không chốt vội 85232941',
    cd.ketQua === 'THIEU_SO_LIEU' && cd.hs !== '85232941' && (cd.missingFacts || []).some((m) => m.fact === 'daGhi'),
    JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '852329',
    productText: 'Phương tiện lưu trữ thông tin từ tính - Loại khác: Đĩa từ: Loại khác, dùng cho điện ảnh',
  });
  check('OZV-1677 85232986: anh em 85232983 có HOAC không khớp vế so chữ → CHOT 85232986',
    cd.ketQua === 'CHOT' && cd.hs === '85232986', JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '852359',
    productText: 'Đĩa, băng, các thiết bị lưu trữ bền vững, thể rắn, “thẻ thông minh” và các phương tiện lưu trữ thông tin khác để ghi âm thanh hoặc các nội dung, hình thức thể hiện khác, đã hoặc chưa ghi, kể cả bản khuôn mẫu và bản gốc để sản xuất băng đĩa, nhưng không bao gồm các sản phẩm của Chương 37. - Loại khác: Loại sử dụng để tái tạo các hiện tượng trừ âm thanh hoặc hình ảnh',
  });
  check('OZV-1677 85235930: gỡ chữ "âm thanh" của tiêu đề nhóm 85.23 trước khi chấm PHAI_KHONG + nút anh em 8523592 không có dòng con khớp → CHOT 85235930',
    cd.ketQua === 'CHOT' && cd.hs === '85235930', JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '984925',
    productText: 'Máy điều hòa không khí, gồm có một quạt chạy bằng mô tơ và các bộ phận làm thay đổi nhiệt độ và độ ẩm, kể cả loại máy không điều chỉnh độ ẩm một cách riêng biệt: Kèm theo một bộ phận làm lạnh và một van đảo chiều chu trình nóng/lạnh (bơm nhiệt có đảo chiều) - Sử dụng cho xe có động cơ (trừ loại thuộc phân nhóm 8415.20): Công suất làm mát không quá 26,38 kW',
  });
  check('OZV-1677 98492521: nút Loại khác 984925~r19577 chỉ loại trừ anh em đứng trước (9849251), không bị nút Bộ phận đứng sau đè TRAI → CHOT 98492521',
    cd.ketQua === 'CHOT' && cd.hs === '98492521', JSON.stringify([cd.ketQua, cd.hs]));

  cd = chotDong8({
    hs: '984934',
    productText: 'Bộ phận và phụ kiện của xe có động cơ thuộc các nhóm từ 87.01 đến 87.05: Hộp số và bộ phận của chúng - Hộp số, chưa lắp hoàn chỉnh: Dùng cho xe thuộc nhóm 87.03',
  });
  check('OZV-1677 98493441: gỡ chữ "Bộ phận" ở tiêu đề tổ tiên trước khi chấm laBoPhan → không nhảy sai sang 98493447',
    cd.ketQua !== 'CHOT' && cd.hs !== '98493447', JSON.stringify([cd.ketQua, cd.hs]));

  cd = chotDong8({
    hs: '984934',
    productText: 'Bộ phận và phụ kiện của xe có động cơ thuộc các nhóm từ 87.01 đến 87.05: Hộp số và bộ phận của chúng - Bộ phận: Dùng cho xe thuộc nhóm 87.03',
  });
  check('OZV-1677 98493447 rào ngược: chữ "Bộ phận" của chính nút 984934~r19749 giữ nguyên → CHOT 98493447',
    cd.ketQua === 'CHOT' && cd.hs === '98493447', JSON.stringify([cd.ketQua, cd.hs]));

  cd = chotDong8({
    hs: '630619',
    productText: 'Tấm bạt, mái hiên và tấm che nắng từ gai ramie',
  });
  check('OZV-1769 63061910: loaiSoiDet TRONG [SOI_THUC_VAT_KHAC, RAMIE] + tuSoiDetThucVatNhom5305 CO nhận hàng từ gai ramie → CHOT 63061910 (không rơi 63061990)',
    cd.ketQua === 'CHOT' && cd.hs === '63061910', JSON.stringify([cd.ketQua, cd.hs]));

  // ── OZV-1830: sibKhongKhopSoChu kiểm chuTuMoTaHang (19012030/40) + dòng phanConLai có dieuKienSo: [] (19019049) ──
  cd = chotDong8({
    hs: '190120',
    productText: 'Bột trộn và bột nhào để chế biến thành các loại bánh thuộc nhóm 19.05: Loại khác, không chứa ca cao',
  });
  check('OZV-1830 19012030: chữ "Bột" từ tiêu đề PN6 không làm 19012010 khớp soChu hạ oan 19012030 → CHOT 19012030',
    cd.ketQua === 'CHOT' && cd.hs === '19012030', JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '190120',
    productText: 'Bột trộn và bột nhào để chế biến thành các loại bánh thuộc nhóm 19.05: làm từ bột, không chứa ca cao',
  });
  check('OZV-1830 190120 rào ngược: mô tả riêng có "làm từ bột" (19012010 soChu=THOA) → không chốt nhầm sang 19012030',
    cd.hs !== '19012030', JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '190190',
    productText: 'Loại khác: Các chế phẩm khác từ đỗ tương: Dạng khác, không ở dạng bột',
  });
  check('OZV-1830 19019049: nút 1901904 THOA + anh em phanConLai 19019041 (dangBot) TRAI → CHOT 19019049',
    cd.ketQua === 'CHOT' && cd.hs === '19019049', JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '190190',
    productText: 'Loại khác: Các chế phẩm khác từ đỗ tương, không phải sản phẩm dinh dưỡng y tế, đã đóng gói để bán lẻ: Dạng khác',
  });
  check('OZV-1830 19019049 rào ngược: chưa rõ có ở dạng bột hay không (19019041 CHUA_BIET) → THIEU_SO_LIEU hỏi dangBot, không chốt vội 19019049',
    cd.ketQua === 'THIEU_SO_LIEU' && cd.hs !== '19019049' && (cd.missingFacts || []).some((m) => m.fact === 'dangBot'),
    JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  // ── OZV-1866: goTieuDeChaDaVe xx00 (98100090), kieu SO trên dòng 8 số dưới tiêu đề đa vế (85365051/59), hoacCoVeKhop (48119092), và mỡ bôi trơn (2710194) ──
  cd = chotDong8({
    hs: '981000',
    productText: 'Sắt hoặc thép để sản xuất tanh lốp xe: Sản phẩm bằng dây sắt hoặc thép để sản xuất tanh lốp xe',
  });
  check('OZV-1866 98100090: goTieuDeChaDaVe không xoá kép tiêu đề nhóm 9810 ở phân nhóm xx00 → CHOT 98100090',
    cd.ketQua === 'CHOT' && cd.hs === '98100090', JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '981000',
    productText: 'Sắt hoặc thép để sản xuất tanh lốp xe',
  });
  check('OZV-1866 981000 rào ngược: chỉ có tiêu đề nhóm 9810 chưa rõ dạng dây hay thanh/que → không tự chốt 98100090',
    cd.ketQua !== 'CHOT' && cd.hs !== '98100090', JSON.stringify([cd.ketQua, cd.hs]));

  cd = chotDong8({
    hs: '853650',
    productText: 'Thiết bị đóng ngắt mạch khác: Công tắc điện tử dùng cho mạch xoay chiều gồm mạch vào và mạch ra kết nối điều khiển bằng quang học (công tắc dùng cho mạch xoay chiều điều khiển bằng thyristor); công tắc điện tử, kể cả công tắc bảo vệ quá nhiệt điện tử gồm một tranzito và một chip logic (công nghệ chip-on-chip) dùng cho điện áp không quá 1.000 V; công tắc điện cơ bật nhanh dùng cho dòng điện không quá 11 A',
  });
  check('OZV-1866 85365059 THIEU_DU_KIEN: chỉ có tiêu đề cha đa vế 8536505 (chứa "11 A" ở vế 3) → hỏi dongDien, không tự chốt 85365051',
    cd.ketQua === 'THIEU_SO_LIEU' && cd.hs !== '85365051', JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '853650',
    productText: 'Thiết bị đóng ngắt mạch khác: Công tắc điện tử dùng cho mạch xoay chiều gồm mạch vào và mạch ra kết nối điều khiển bằng quang học (công tắc dùng cho mạch xoay chiều điều khiển bằng thyristor); công tắc điện tử, kể cả công tắc bảo vệ quá nhiệt điện tử gồm một tranzito và một chip logic (công nghệ chip-on-chip) dùng cho điện áp không quá 1.000 V; công tắc điện cơ bật nhanh dùng cho dòng điện không quá 11 A: Dòng điện dưới 16 A',
  });
  check('OZV-1866 85365051 rào ngược: mô tả riêng có dòng điện dưới 16 A → CHOT 85365051',
    cd.ketQua === 'CHOT' && cd.hs === '85365051', JSON.stringify([cd.ketQua, cd.hs]));

  cd = chotDong8({
    hs: '481151',
    productText: 'Giấy và bìa đã tráng, thấm tẩm hoặc phủ bằng plastic (trừ chất kết dính) - Loại đã tẩy trắng, định lượng trên 150 g/m2: Tấm phủ sàn, không phải dạng cuộn, không ở dạng tờ hình chữ nhật',
  });
  check('OZV-1866 48115191: phủ định cả 2 phương án HOAC của nút anh em 4811513 → CHOT 48115191',
    cd.ketQua === 'CHOT' && cd.hs === '48115191', JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '481151',
    productText: 'Giấy và bìa đã tráng, thấm tẩm hoặc phủ bằng plastic (trừ chất kết dính) - Loại đã tẩy trắng, định lượng trên 150 g/m2: Tấm phủ sàn',
  });
  check('OZV-1866 481151 rào ngược: "Tấm phủ sàn" có dòng con khớp ở cả 48115131 và 48115191 mà thiếu kích thước/dạng cuộn → THIEU_SO_LIEU',
    cd.ketQua === 'THIEU_SO_LIEU' && cd.hs !== '48115191', JSON.stringify([cd.ketQua, cd.hs]));

  cd = chotDong8({
    hs: '271019',
    productText: 'Dầu có nguồn gốc từ dầu mỏ và các loại dầu thu được từ các khoáng bi-tum (trừ dầu thô) và các chế phẩm chưa được chi tiết hoặc ghi ở nơi khác, có chứa hàm lượng từ 70% trở lên là dầu có nguồn gốc từ dầu mỏ hoặc các loại dầu thu được từ các khoáng bi-tum, những loại dầu này là thành phần cơ bản của các chế phẩm đó, trừ loại chứa dầu diesel sinh học và trừ dầu thải - Loại khác: Dầu và mỡ bôi trơn: Dầu bôi trơn khác',
  });
  check('OZV-1866 27101946: tách vế cha "Dầu và mỡ bôi trơn" không để 27101944 (Mỡ bôi trơn) tranh chấp → CHOT 27101946',
    cd.ketQua === 'CHOT' && cd.hs === '27101946', JSON.stringify([cd.ketQua, cd.hs]));

  // ── OZV-1944: tách khoảng "trên 2.000 cc đến 3.000 cc" (98492812), kế thừa nút qua tầng Loại khác trần (98493330/40), phủ định LIET_KE "trừ loại bằng kẽm carbon" (98494321) ──
  cd = chotDong8({
    hs: '984928',
    productText: 'Trục truyền động (kể cả trục cam và trục khuỷu) và tay biên; gối đỡ trục dùng ổ lăn và gối đỡ trục dùng ổ trượt; bánh răng và cụm bánh răng; vít bi hoặc vít đũa; hộp số và các cơ cấu điều tốc khác, kể cả bộ biến đổi mô men xoắn; bánh đà và ròng rọc, kể cả khối puli; ly hợp và khớp nối trục (kể cả khớp nối vạn năng): Trục truyền động (kể cả trục cam và trục khuỷu) và tay biên - Trục cam và trục khuỷu dùng cho động cơ xe của Chương 87: Cho xe có dung tích xi lanh trên 2.000 cc đến 3.000 cc',
  });
  check('OZV-1944 98492812: tách khoảng "trên 2.000 cc đến 3.000 cc" thoả cả > 2000 cc và <= 3000 cc → CHOT 98492812',
    cd.ketQua === 'CHOT' && cd.hs === '98492812', JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '984928',
    productText: 'Trục truyền động (kể cả trục cam và trục khuỷu) và tay biên: Trục cam và trục khuỷu dùng cho động cơ xe của Chương 87: Cho xe có dung tích xi lanh 3.500 cc',
  });
  check('OZV-1944 98492812 rào ngược: dung tích xi lanh 3.500 cc (> 3000 cc) → CHOT 98492813, không chốt 98492812',
    cd.ketQua === 'CHOT' && cd.hs === '98492813', JSON.stringify([cd.ketQua, cd.hs]));

  cd = chotDong8({
    hs: '984933',
    productText: 'Dây điện, cáp điện (kể cả cáp đồng trục) có cách điện (kể cả loại đã tráng men cách điện hoặc mạ lớp cách điện) và dây dẫn có cách điện khác, đã hoặc chưa gắn với đầu nối; cáp sợi quang, làm bằng các bó sợi đơn có vỏ bọc riêng biệt từng sợi, có hoặc không gắn với dây dẫn điện hoặc gắn với đầu nối: Dây dẫn điện khác, dùng cho điện áp không quá 1.000 V - Đã lắp với đầu nối điện - Cáp ắc quy: Cho xe thuộc nhóm 87.02, 87.03, 87.04, cách điện bằng thủy tinh',
  });
  check('OZV-1944 98493340: gỡ tiêu đề PN6 đa vế cho nút daGanDauNoi CO và kế thừa nút tổ tiên qua tầng Loại khác trần → CHOT 98493340 (không nhảy sang 98493320)',
    cd.ketQua === 'CHOT' && cd.hs === '98493340', JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '984933',
    productText: 'Dây dẫn điện khác, dùng cho điện áp không quá 1.000 V - chưa gắn với đầu nối - Cáp ắc quy: Cho xe thuộc nhóm 87.02, 87.03, 87.04, cách điện bằng thủy tinh',
  });
  check('OZV-1944 98493340 rào ngược: chưa gắn với đầu nối (trái 984933~r19702 daGanDauNoi CO) → không chốt 98493340',
    cd.hs !== '98493340' && cd.hs !== '98493330', JSON.stringify([cd.ketQua, cd.hs]));

  cd = chotDong8({
    hs: '984943',
    productText: 'Pin và bộ pin: Loại khác (trừ loại thuộc phân nhóm 8506.10, 8506.30, 8506.40, 8506.50, 8506.60), trừ loại bằng kẽm carbon: Có thể tích ngoài không quá 300 cm3',
  });
  check('OZV-1944 98494321: vế "trừ loại bằng kẽm carbon" thoả loaiPin PHAI_KHONG [KEM_CACBON] → CHOT 98494321',
    cd.ketQua === 'CHOT' && cd.hs === '98494321', JSON.stringify([cd.ketQua, cd.hs, cd.missingFacts]));

  cd = chotDong8({
    hs: '984943',
    productText: 'Pin và bộ pin bằng kẽm carbon: Có thể tích ngoài không quá 300 cm3',
  });
  check('OZV-1944 98494321 rào ngược: pin bằng kẽm carbon (trái PHAI_KHONG KEM_CACBON) → không chốt 98494321',
    cd.hs !== '98494321', JSON.stringify([cd.ketQua, cd.hs]));

  const t0ReDoS1944 = Date.now();
  const chuoiDai1944 = `Trục cam và trục khuỷu dùng cho động cơ xe của Chương 87: Cho xe có dung tích xi lanh ${Array.from({ length: 10000 }, () => 'trên 2.000 cc đến').join(' ')} 3.000 cc`;
  const kqReDoS1944 = chotDong8({ hs: '984928', productText: chuoiDai1944 });
  const dtReDoS1944 = Date.now() - t0ReDoS1944;
  check(`OZV-1944 ReDoS ~40.000 từ lặp chạy dưới 2000ms (thực tế ${dtReDoS1944}ms)`,
    dtReDoS1944 < 2000 && kqReDoS1944.hs === '98492812', `${dtReDoS1944}ms`);
}

// ── OZV-2163: cạnh loại trừ 2 chiều 76.16 <-> 84.79 cho ca 132 «Bộ bàn trượt bằng tay / nhôm / gá thiết bị máy công nghiệp căn chỉnh bằng tay» ──
{
  const S = require('../lib/so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const { dataPath } = require('../lib/data-paths.js');
  // Các khối test trước (OZV-8716/8414) đã mkdir dataPath('so-tay') chỉ với 1–2 tệp → readdir
  // của canhSoTay/dungBangCanh chỉ thấy thư mục isolate. Chép 7616+8479 vào isolate trước khi dựng đồ thị.
  fs.mkdirSync(dataPath('so-tay'), { recursive: true });
  for (const h of ['7616', '8479']) {
    fs.copyFileSync(path.join('data', 'so-tay', `${h}.json`), dataPath('so-tay', `${h}.json`));
  }
  D.datLai();

  const moTa132 = 'Bộ bàn trượt bằng tay / nhôm / gá thiết bị máy công nghiệp căn chỉnh bằng tay';
  const moTaKhop132 =
    'Bộ bàn trượt bằng tay bằng nhôm gá thiết bị máy công nghiệp căn chỉnh bằng tay có chức năng riêng biệt dùng chung cho nhiều loại máy; tấm nhôm hoặc thanh nhôm gá thiết bị không có cơ cấu bàn trượt dịch chuyển';
  const hangNguon7616 = 'Đinh tán bằng nhôm dùng trong cơ khí';
  const hangNguon8479 = 'Máy ép đẳng nhiệt lạnh dùng trong công nghiệp';
  const hangDich7616 = 'Tấm nhôm hoặc thanh nhôm gá thiết bị không có cơ cấu bàn trượt dịch chuyển';

  // 1. verifySoTay + checkItem canCuLoaiTru nguyên văn
  const s7616 = JSON.parse(fs.readFileSync(path.join('data', 'so-tay', '7616.json'), 'utf8'));
  const s8479 = JSON.parse(fs.readFileSync(path.join('data', 'so-tay', '8479.json'), 'utf8'));
  const v7616 = S.verifySoTay(s7616, '7616');
  const v8479 = S.verifySoTay(s8479, '8479');
  check('[OZV-2163 verifySoTay] sổ tay 7616 và 8479 đạt 100% (0 mục bị loại)',
    v7616.loai.length === 0 && v8479.loai.length === 0,
    JSON.stringify({ loai7616: v7616.loai.slice(0, 2), loai8479: v8479.loai.slice(0, 2) }));

  const lt7616 = (loadSoTay('7616')?.loaiTru || []).find((x) => x.sangNhom === '8479');
  const lt8479 = (loadSoTay('8479')?.loaiTru || []).find((x) => x.sangNhom === '7616');
  check('[OZV-2163 canCuLoaiTru] loaiTru 2 chiều 7616 <-> 8479 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt7616 && lt7616.nguon === 'phan76.phan' && lt7616.canCuLoaiTru?.nguon === 'nhom8479.nhom'
      && S.checkItem('loaiTru', lt7616, S.sourcesFor('7616'), '7616') === null)
    && Boolean(lt8479 && lt8479.nguon === 'nhom8479.nhom' && lt8479.canCuLoaiTru?.nguon === 'nhom7616.nhom'
      && S.checkItem('loaiTru', lt8479, S.sourcesFor('8479'), '8479') === null),
    JSON.stringify({ lt7616, lt8479 }));

  // 2. Đồ thị C5/C6 2 chiều + moRongUngVien
  const c5Tu7616 = D.canhTu('7616', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8479');
  const c5Tu8479 = D.canhTu('8479', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '7616');
  const c6Tu7616 = D.canhTu('7616', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8479');
  const c6Tu8479 = D.canhTu('8479', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '7616');
  const giua = D.canhGiuaNhomConSong(['7616', '8479']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mr7616 = D.moRongUngVien(['7616'], moTaKhop132, { toiDa: 10 });
  const mr8479 = D.moRongUngVien(['8479'], moTaKhop132, { toiDa: 10 });
  check('[OZV-2163 đồ thị 2 chiều] C5/C6 7616<->8479, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 132',
    c5Tu7616.some((e) => e.nguon === 'phan76.phan' && e.canCuLoaiTru?.nguon === 'nhom8479.nhom')
    && c5Tu8479.some((e) => e.nguon === 'nhom8479.nhom' && e.canCuLoaiTru?.nguon === 'nhom7616.nhom')
    && c6Tu7616.length >= 1 && c6Tu8479.length >= 1 && giua.length >= 2
    && mr7616.some((x) => x.nhom === '8479') && mr8479.some((x) => x.nhom === '7616'),
    JSON.stringify({ c5: c5Tu7616.length, c5r: c5Tu8479.length, giua: giua.length, mr7616: mr7616.map((x) => x.nhom), mr8479: mr8479.map((x) => x.nhom) }));

  // 3. nhomLienQuanSoTay 2 chiều — đọc trực tiếp loaiTru (tránh cache canhSoTay bị đầu độc bởi thư mục isolate thiếu tệp)
  const rel7616 = [...new Set((loadSoTay('7616')?.loaiTru || []).flatMap((x) => String(x.sangNhom || '').split(/[|,;\s]+/).map((t) => t.replace(/\D/g, '').slice(0, 4)).filter((t) => t.length === 4)))];
  const rel8479 = [...new Set((loadSoTay('8479')?.loaiTru || []).flatMap((x) => String(x.sangNhom || '').split(/[|,;\s]+/).map((t) => t.replace(/\D/g, '').slice(0, 4)).filter((t) => t.length === 4)))];
  check('[OZV-2163 nhomLienQuanSoTay] liên kết hai chiều 7616 <-> 8479',
    rel7616.includes('8479') && rel8479.includes('7616'),
    JSON.stringify({ rel7616, rel8479 }));

  // 4. cauPhanBietNhom 2 chiều
  const pb7616 = cauPhanBietNhom('7616', ['7616', '8479'], moTaKhop132);
  const pb8479 = cauPhanBietNhom('8479', ['8479', '7616'], moTaKhop132);
  check('[OZV-2163 cauPhanBietNhom] 7616 đứng đầu sinh câu phân biệt 76.16↔84.79 từ phan76.phan',
    pb7616.length >= 1 && pb7616[0].loai === 'PHAN_BIET_NHOM' && pb7616[0].canCu === 'so-tay'
    && pb7616[0].nguon === 'phan76.phan' && /84\.79/.test(pb7616[0].questionVi) && /76\.16/.test(pb7616[0].questionVi),
    JSON.stringify(pb7616));
  check('[OZV-2163 cauPhanBietNhom] 8479 đứng đầu sinh câu phân biệt 84.79↔76.16 (2 chiều)',
    pb8479.length >= 1 && pb8479[0].loai === 'PHAN_BIET_NHOM' && pb8479[0].canCu === 'so-tay'
    && /84\.79/.test(pb8479[0].questionVi) && /76\.16/.test(pb8479[0].questionVi),
    JSON.stringify(pb8479));

  // 5. soTayGates 2 chiều
  const g7616 = soTayGates({
    hs: '76169990',
    productText: moTaKhop132,
    productName: moTaKhop132,
    candidateHeadings: ['7616', '8479'],
  });
  const g8479 = soTayGates({
    hs: '84798970',
    productText: hangDich7616,
    productName: hangDich7616,
    candidateHeadings: ['8479', '7616'],
  });
  check('[OZV-2163 soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 7616 -> 8479 và 8479 -> 7616',
    (g7616.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8479'))
    && (g8479.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('7616')),
    JSON.stringify({ g7616: g7616.challenges, g8479: g8479.challenges }));

  // 6. Ca đối chứng không hỏi oan
  const dcPb7616 = cauPhanBietNhom('7616', ['7616', '8479'], hangNguon7616);
  const dcPb8479 = cauPhanBietNhom('8479', ['8479', '7616'], hangNguon8479);
  const dcG7616 = soTayGates({
    hs: '76161010', productText: hangNguon7616, productName: hangNguon7616, candidateHeadings: ['7616', '8479'],
  });
  const dcG8479 = soTayGates({
    hs: '84798300', productText: hangNguon8479, productName: hangNguon8479, candidateHeadings: ['8479', '7616'],
  });
  check('[OZV-2163 đối chứng] đinh tán nhôm và máy ép đẳng nhiệt không hỏi oan / không kéo oan 76.16 <-> 84.79',
    dcPb7616.length === 0 && dcPb8479.length === 0
    && !(dcG7616.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8479'))
    && !(dcG8479.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('7616'))
    && !D.moRongUngVien(['7616'], hangNguon7616).some((x) => x.nhom === '8479')
    && !D.moRongUngVien(['8479'], hangNguon8479).some((x) => x.nhom === '7616'),
    JSON.stringify({ dcPb7616, dcPb8479 }));

  // 7. phanTichHoiTruoc4So
  const ht132 = phanTichHoiTruoc4So({ moTa: moTa132, ungVien: ['7616', '8479'] });
  const distinctDk = new Set((ht132.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check('[OZV-2163 hoi-truoc-4so] ca 132 với [7616, 8479] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt',
    ht132.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC && distinctDk
    && ['7616', '8479'].every((h) => (ht132.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    JSON.stringify({ trangThai: ht132.trangThai, distinctDk, dapAnDieuKien: ht132.dapAnDieuKien }));
}

// ── OZV-2174: cạnh loại trừ 2 chiều 59.03 <-> 60.01 cho ca 124 «Vải gió dệt kim / None / None» ──
{
  const S = require('../lib/so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const { dataPath } = require('../lib/data-paths.js');
  fs.mkdirSync(dataPath('so-tay'), { recursive: true });
  for (const h of ['5903', '6001']) {
    fs.copyFileSync(path.join('data', 'so-tay', `${h}.json`), dataPath('so-tay', `${h}.json`));
  }
  D.datLai();

  const moTa124 = 'Vải gió dệt kim / None / None';
  const hangThuan5903 =
    'Vải gió dệt kim nổi vòng (pile) hoặc móc, kể cả đã ngâm tẩm, tráng, phủ hoặc ép lớp';
  const hangThuan6001 =
    'Vải gió dệt kim hoặc móc đã ngâm tẩm, tráng, phủ hoặc ép với plastic thuộc nhóm 59.03';
  const hangDcBang = 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ';
  const hangDcNhan = 'Nhãn phù hiệu dệt kim hoặc móc thuộc nhóm 58.07';

  const s5903 = JSON.parse(fs.readFileSync(path.join('data', 'so-tay', '5903.json'), 'utf8'));
  const s6001 = JSON.parse(fs.readFileSync(path.join('data', 'so-tay', '6001.json'), 'utf8'));
  const v5903 = S.verifySoTay(s5903, '5903');
  const v6001 = S.verifySoTay(s6001, '6001');
  check('[OZV-2174 verifySoTay] sổ tay 5903 và 6001 đạt 100% (0 mục bị loại)',
    v5903.loai.length === 0 && v6001.loai.length === 0,
    JSON.stringify({ loai5903: v5903.loai.slice(0, 2), loai6001: v6001.loai.slice(0, 2) }));

  const lt5903 = (loadSoTay('5903')?.loaiTru || []).find((x) => x.sangNhom === '6001');
  const lt6001 = (loadSoTay('6001')?.loaiTru || []).find((x) => x.sangNhom === '5903');
  check('[OZV-2174 canCuLoaiTru] loaiTru 2 chiều 5903 <-> 6001 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt5903 && lt5903.nguon === 'ch59.chuong' && lt5903.canCuLoaiTru?.nguon === 'nhom6001.nhom'
      && !/;/.test(lt5903.dieuKien || '')
      && S.checkItem('loaiTru', lt5903, S.sourcesFor('5903'), '5903') === null)
    && Boolean(lt6001 && lt6001.nguon === 'ch60.chuong' && lt6001.canCuLoaiTru?.nguon === 'nhom5903.nhom'
      && !/;/.test(lt6001.dieuKien || '')
      && lt5903.dieuKien !== lt6001.dieuKien
      && S.checkItem('loaiTru', lt6001, S.sourcesFor('6001'), '6001') === null),
    JSON.stringify({ lt5903, lt6001 }));

  const c5Tu5903 = D.canhTu('5903', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6001');
  const c5Tu6001 = D.canhTu('6001', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5903');
  const c6Tu5903 = D.canhTu('5903', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6001');
  const c6Tu6001 = D.canhTu('6001', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5903');
  const giua = D.canhGiuaNhomConSong(['5903', '6001']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mr5903 = D.moRongUngVien(['5903'], moTa124, { toiDa: 10 });
  const mr6001 = D.moRongUngVien(['6001'], moTa124, { toiDa: 10 });
  check('[OZV-2174 đồ thị 2 chiều] C5/C6 5903<->6001, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 124',
    c5Tu5903.some((e) => e.nguon === 'ch59.chuong' && e.canCuLoaiTru?.nguon === 'nhom6001.nhom')
    && c5Tu6001.some((e) => e.nguon === 'ch60.chuong' && e.canCuLoaiTru?.nguon === 'nhom5903.nhom')
    && c6Tu5903.length >= 1 && c6Tu6001.length >= 1 && giua.length >= 2
    && mr5903.some((x) => x.nhom === '6001') && mr6001.some((x) => x.nhom === '5903'),
    JSON.stringify({ c5: c5Tu5903.length, c5r: c5Tu6001.length, giua: giua.length, mr5903: mr5903.map((x) => x.nhom), mr6001: mr6001.map((x) => x.nhom) }));

  const rel5903 = [...new Set((loadSoTay('5903')?.loaiTru || []).flatMap((x) => String(x.sangNhom || '').split(/[|,;\s]+/).map((t) => t.replace(/\D/g, '').slice(0, 4)).filter((t) => t.length === 4)))];
  const rel6001 = [...new Set((loadSoTay('6001')?.loaiTru || []).flatMap((x) => String(x.sangNhom || '').split(/[|,;\s]+/).map((t) => t.replace(/\D/g, '').slice(0, 4)).filter((t) => t.length === 4)))];
  check('[OZV-2174 nhomLienQuanSoTay] liên kết hai chiều 5903 <-> 6001',
    rel5903.includes('6001') && rel6001.includes('5903'),
    JSON.stringify({ rel5903, rel6001 }));

  const pb5903 = cauPhanBietNhom('5903', ['5903', '6001'], moTa124);
  const pb6001 = cauPhanBietNhom('6001', ['6001', '5903'], moTa124);
  check('[OZV-2174 cauPhanBietNhom] 5903 đứng đầu sinh câu phân biệt 59.03↔60.01 từ ch59.chuong',
    pb5903.length >= 1 && pb5903[0].loai === 'PHAN_BIET_NHOM' && pb5903[0].canCu === 'so-tay'
    && pb5903[0].nguon === 'ch59.chuong' && /60\.01/.test(pb5903[0].questionVi) && /59\.03/.test(pb5903[0].questionVi),
    JSON.stringify(pb5903));
  check('[OZV-2174 cauPhanBietNhom] 6001 đứng đầu sinh câu phân biệt 60.01↔59.03 từ ch60.chuong',
    pb6001.length >= 1 && pb6001[0].loai === 'PHAN_BIET_NHOM' && pb6001[0].canCu === 'so-tay'
    && pb6001[0].nguon === 'ch60.chuong' && /59\.03/.test(pb6001[0].questionVi) && /60\.01/.test(pb6001[0].questionVi),
    JSON.stringify(pb6001));

  const g5903 = soTayGates({
    hs: '59031090',
    productText: hangThuan5903,
    productName: hangThuan5903,
    candidateHeadings: ['5903', '6001'],
  });
  const g6001 = soTayGates({
    hs: '60011000',
    productText: hangThuan6001,
    productName: hangThuan6001,
    candidateHeadings: ['6001', '5903'],
  });
  check('[OZV-2174 soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 5903 -> 6001 và 6001 -> 5903',
    (g5903.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6001'))
    && (g6001.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5903')),
    JSON.stringify({ g5903: g5903.challenges, g6001: g6001.challenges }));

  const dcPb5903 = cauPhanBietNhom('5903', ['5903', '6001'], hangDcBang);
  const dcPb6001 = cauPhanBietNhom('6001', ['6001', '5903'], hangDcNhan);
  const dcG5903 = soTayGates({
    hs: '59031010', productText: hangDcBang, productName: hangDcBang, candidateHeadings: ['5903', '6001'],
  });
  const dcG6001 = soTayGates({
    hs: '60011000', productText: hangDcNhan, productName: hangDcNhan, candidateHeadings: ['6001', '5903'],
  });
  check('[OZV-2174 đối chứng] băng tẩm thuốc và nhãn phù hiệu không hỏi oan / không kéo oan 59.03 <-> 60.01',
    dcPb5903.length === 0 && dcPb6001.length === 0
    && !(dcG5903.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6001'))
    && !(dcG6001.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5903'))
    && !D.moRongUngVien(['5903'], hangDcBang).some((x) => x.nhom === '6001')
    && !D.moRongUngVien(['6001'], hangDcNhan).some((x) => x.nhom === '5903'),
    JSON.stringify({ dcPb5903, dcPb6001 }));

  const ht124 = phanTichHoiTruoc4So({ moTa: moTa124, ungVien: ['5903', '6001'] });
  const distinctDk = new Set((ht124.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check('[OZV-2174 hoi-truoc-4so] ca 124 với [5903, 6001] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt',
    ht124.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC && distinctDk
    && ['5903', '6001'].every((h) => (ht124.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    JSON.stringify({ trangThai: ht124.trangThai, distinctDk, dapAnDieuKien: ht124.dapAnDieuKien }));
}

// ── OZV-2191: cạnh loại trừ 2 chiều 76.16 <-> 84.83 cho ca 132 «Bộ bàn trượt bằng tay / Con lăn đỡ trục cán» ──
{
  const S = require('../lib/so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const { dataPath } = require('../lib/data-paths.js');
  fs.mkdirSync(dataPath('so-tay'), { recursive: true });
  for (const h of ['7616', '8466', '8479', '8483']) {
    fs.copyFileSync(path.join('data', 'so-tay', `${h}.json`), dataPath('so-tay', `${h}.json`));
  }
  D.datLai();

  const q132BanTruot = 'Bộ bàn trượt bằng tay / nhôm / gá thiết bị máy công nghiệp căn chỉnh bằng tay';
  const q132ConLan = 'Con lăn đỡ trục cán bằng thép hợp kim';
  const dcDinhTan7616 = 'Đinh tán bằng nhôm dùng trong cơ khí';
  const dcBanhDa8483 = 'Bánh đà bằng gang dùng cho động cơ máy thủy';

  // 1. verifySoTay
  const s7616 = JSON.parse(fs.readFileSync(path.join('data', 'so-tay', '7616.json'), 'utf8'));
  const s8483 = JSON.parse(fs.readFileSync(path.join('data', 'so-tay', '8483.json'), 'utf8'));
  const v7616 = S.verifySoTay(s7616, '7616');
  const v8483 = S.verifySoTay(s8483, '8483');
  check('[OZV-2191 verifySoTay] sổ tay 7616 và 8483 đạt 100% (0 mục bị loại)',
    v7616.loai.length === 0 && v8483.loai.length === 0,
    JSON.stringify({ loai7616: v7616.loai.slice(0, 2), loai8483: v8483.loai.slice(0, 2) }));

  // 2. Căn cứ pháp lý nguyên văn + checkItem
  const lt7616Bt = (loadSoTay('7616')?.loaiTru || []).find((x) => x.sangNhom === '8483' && /bàn trượt/i.test(x.dieuKien || ''));
  const lt7616Cl = (loadSoTay('7616')?.loaiTru || []).find((x) => x.sangNhom === '8483' && /con lăn/i.test(x.dieuKien || ''));
  const lt8483Bt = (loadSoTay('8483')?.loaiTru || []).find((x) => x.sangNhom === '7616' && /bàn trượt/i.test(x.dieuKien || ''));
  const lt8483Cl = (loadSoTay('8483')?.loaiTru || []).find((x) => x.sangNhom === '7616' && /con lăn/i.test(x.dieuKien || ''));
  check('[OZV-2191 căn cứ] sổ tay 7616 và 8483 có mục loaiTru 2 chiều 7616 <-> 8483 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt7616Bt && lt7616Bt.nguon === 'phan76.phan' && lt7616Bt.canCuLoaiTru?.nguon === 'nhom8483.nhom'
      && S.checkItem('loaiTru', lt7616Bt, S.sourcesFor('7616'), '7616') === null)
    && Boolean(lt7616Cl && lt7616Cl.nguon === 'phan76.phan' && lt7616Cl.canCuLoaiTru?.nguon === 'nhom8483.nhom'
      && S.checkItem('loaiTru', lt7616Cl, S.sourcesFor('7616'), '7616') === null)
    && Boolean(lt8483Bt && lt8483Bt.nguon === 'nhom8483.nhom' && lt8483Bt.canCuLoaiTru?.nguon === 'nhom7616.nhom'
      && S.checkItem('loaiTru', lt8483Bt, S.sourcesFor('8483'), '8483') === null)
    && Boolean(lt8483Cl && lt8483Cl.nguon === 'nhom8483.nhom' && lt8483Cl.canCuLoaiTru?.nguon === 'nhom7616.nhom'
      && S.checkItem('loaiTru', lt8483Cl, S.sourcesFor('8483'), '8483') === null)
    && lt7616Bt.dieuKien !== lt8483Bt.dieuKien
    && lt7616Cl.dieuKien !== lt8483Cl.dieuKien
    && ![lt7616Bt, lt7616Cl, lt8483Bt, lt8483Cl].some((x) => /;/.test(x.dieuKien)),
    JSON.stringify({ lt7616Bt: Boolean(lt7616Bt), lt7616Cl: Boolean(lt7616Cl), lt8483Bt: Boolean(lt8483Bt), lt8483Cl: Boolean(lt8483Cl) }));

  // 3. Đồ thị 2 chiều C5/C6 + nhomLienQuanSoTay + moRongUngVien
  const c5Tu7616 = D.canhTu('7616', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8483');
  const c5Tu8483 = D.canhTu('8483', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '7616');
  const c6Tu7616 = D.canhTu('7616', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8483');
  const c6Tu8483 = D.canhTu('8483', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '7616');
  const giua = D.canhGiuaNhomConSong(['7616', '8483']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrBtTu7616 = D.moRongUngVien(['7616'], q132BanTruot, { toiDa: 10 });
  const mrBtTu8483 = D.moRongUngVien(['8483'], q132BanTruot, { toiDa: 10 });
  const mrClTu7616 = D.moRongUngVien(['7616'], q132ConLan, { toiDa: 10 });
  const mrClTu8483 = D.moRongUngVien(['8483'], q132ConLan, { toiDa: 10 });
  const rel7616 = [...new Set((loadSoTay('7616')?.loaiTru || []).flatMap((x) => String(x.sangNhom || '').split(/[|,;\s]+/).map((t) => t.replace(/\D/g, '').slice(0, 4)).filter((t) => t.length === 4)))];
  const rel8483 = [...new Set((loadSoTay('8483')?.loaiTru || []).flatMap((x) => String(x.sangNhom || '').split(/[|,;\s]+/).map((t) => t.replace(/\D/g, '').slice(0, 4)).filter((t) => t.length === 4)))];
  check('[OZV-2191 đồ thị 2 chiều] C5/C6 7616<->8483, nhomLienQuanSoTay 2 chiều và moRongUngVien kéo 2 chiều cho ca 132',
    c5Tu7616.some((e) => e.nguon === 'phan76.phan' && e.canCuLoaiTru?.nguon === 'nhom8483.nhom')
    && c5Tu8483.some((e) => e.nguon === 'nhom8483.nhom' && e.canCuLoaiTru?.nguon === 'nhom7616.nhom')
    && c6Tu7616.length >= 1 && c6Tu8483.length >= 1 && giua.length >= 2
    && rel7616.includes('8483') && rel8483.includes('7616')
    && mrBtTu7616.some((x) => x.nhom === '8483') && mrBtTu8483.some((x) => x.nhom === '7616')
    && mrClTu7616.some((x) => x.nhom === '8483') && mrClTu8483.some((x) => x.nhom === '7616'),
    JSON.stringify({
      c5: c5Tu7616.length, c5r: c5Tu8483.length, giua: giua.length,
      mrBtTu7616: mrBtTu7616.map((x) => x.nhom), mrBtTu8483: mrBtTu8483.map((x) => x.nhom),
      mrClTu7616: mrClTu7616.map((x) => x.nhom), mrClTu8483: mrClTu8483.map((x) => x.nhom),
    }));

  // 4. hoi-truoc-4so
  const htBt = phanTichHoiTruoc4So({ moTa: q132BanTruot, ungVien: ['7616', '8483'] });
  const distinctBt = new Set((htBt.nhanh || []).map((n) => n.dieuKien)).size === 2;
  const htBtFull = phanTichHoiTruoc4So({ moTa: q132BanTruot, ungVien: ['7616', '8466', '8479', '8483'] });
  const distinctBtFull = new Set((htBtFull.nhanh || []).map((n) => n.dieuKien)).size === 4;
  const htCl = phanTichHoiTruoc4So({ moTa: q132ConLan, ungVien: ['7616', '8483'] });
  const distinctCl = new Set((htCl.nhanh || []).map((n) => n.dieuKien)).size === 2;
  const htClFull = phanTichHoiTruoc4So({ moTa: q132ConLan, ungVien: ['7616', '8466', '8479', '8483'] });
  const distinctClFull = new Set((htClFull.nhanh || []).map((n) => n.dieuKien)).size === 4;
  check('[OZV-2191 hoi-truoc-4so] ca 132 Bộ bàn trượt bằng tay và Con lăn đỡ trục cán tách nhánh điều kiện riêng biệt cho [7616, 8483] và [7616, 8466, 8479, 8483]',
    htBt.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC && distinctBt
    && (htBt.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5'))
    && ['7616', '8483'].every((h) => (htBt.dapAnDieuKien || '').includes(`→ nhóm ${h} (`))
    && htBtFull.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC && distinctBtFull
    && ['7616', '8466', '8479', '8483'].every((h) => (htBtFull.dapAnDieuKien || '').includes(`→ nhóm ${h} (`))
    && htCl.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC && distinctCl
    && (htCl.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5'))
    && ['7616', '8483'].every((h) => (htCl.dapAnDieuKien || '').includes(`→ nhóm ${h} (`))
    && htClFull.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC && distinctClFull
    && ['7616', '8466', '8479', '8483'].every((h) => (htClFull.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    JSON.stringify({ distinctBt, distinctBtFull, distinctCl, distinctClFull }));

  // 5. Thuận cauPhanBietNhom 2 chiều
  const pbBt7616 = cauPhanBietNhom('7616', ['7616', '8483'], q132BanTruot);
  const pbBt8483 = cauPhanBietNhom('8483', ['8483', '7616'], q132BanTruot);
  const pbCl7616 = cauPhanBietNhom('7616', ['7616', '8483'], q132ConLan);
  const pbCl8483 = cauPhanBietNhom('8483', ['8483', '7616'], q132ConLan);
  check('[OZV-2191 thuận cauPhanBietNhom] sinh câu hỏi phân biệt 2 chiều 76.16 <-> 84.83 cho ca 132 Bộ bàn trượt bằng tay và Con lăn đỡ trục cán',
    pbBt7616.length === 1 && pbBt7616[0].loai === 'PHAN_BIET_NHOM' && pbBt7616[0].canCu === 'so-tay'
    && pbBt7616[0].nguon === 'phan76.phan' && /84\.83/.test(pbBt7616[0].questionVi) && /76\.16/.test(pbBt7616[0].questionVi)
    && pbBt8483.length === 1 && pbBt8483[0].loai === 'PHAN_BIET_NHOM' && pbBt8483[0].canCu === 'so-tay'
    && pbBt8483[0].nguon === 'nhom8483.nhom' && /76\.16/.test(pbBt8483[0].questionVi) && /84\.83/.test(pbBt8483[0].questionVi)
    && pbCl7616.length === 1 && pbCl7616[0].loai === 'PHAN_BIET_NHOM' && pbCl7616[0].canCu === 'so-tay'
    && pbCl7616[0].nguon === 'phan76.phan' && /84\.83/.test(pbCl7616[0].questionVi) && /76\.16/.test(pbCl7616[0].questionVi)
    && pbCl8483.length === 1 && pbCl8483[0].loai === 'PHAN_BIET_NHOM' && pbCl8483[0].canCu === 'so-tay'
    && pbCl8483[0].nguon === 'nhom8483.nhom' && /76\.16/.test(pbCl8483[0].questionVi) && /84\.83/.test(pbCl8483[0].questionVi),
    JSON.stringify({ pbBt7616, pbBt8483, pbCl7616, pbCl8483 }));

  // 6. Thuận soTayGates 2 chiều
  const gBt7616To8483 = soTayGates({
    hs: '76169990', productText: q132BanTruot, productName: 'Bộ bàn trượt bằng tay', candidateHeadings: ['7616', '8483'],
  });
  const gBt8483To7616 = soTayGates({
    hs: '84834090', productText: q132BanTruot, productName: 'Bộ bàn trượt bằng tay', candidateHeadings: ['8483', '7616'],
  });
  const gCl7616To8483 = soTayGates({
    hs: '76169990', productText: q132ConLan, productName: 'Con lăn đỡ trục cán bằng thép hợp kim', candidateHeadings: ['7616', '8483'],
  });
  const gCl8483To7616 = soTayGates({
    hs: '84833090', productText: q132ConLan, productName: 'Con lăn đỡ trục cán bằng thép hợp kim', candidateHeadings: ['8483', '7616'],
  });
  check('[OZV-2191 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 7616 -> 8483 và 8483 -> 7616 cho cả 2 mô tả ca 132',
    (gBt7616To8483.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8483'))
    && (gBt8483To7616.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('7616'))
    && (gCl7616To8483.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8483'))
    && (gCl8483To7616.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('7616')),
    JSON.stringify({
      gBt7616To8483: gBt7616To8483.challenges,
      gBt8483To7616: gBt8483To7616.challenges,
      gCl7616To8483: gCl7616To8483.challenges,
      gCl8483To7616: gCl8483To7616.challenges,
    }));

  // 7. Ca đối chứng không hỏi oan / không kéo oan
  const dcPb7616 = cauPhanBietNhom('7616', ['7616', '8483'], dcDinhTan7616);
  const dcPb8483 = cauPhanBietNhom('8483', ['8483', '7616'], dcBanhDa8483);
  const dcG7616 = soTayGates({
    hs: '76161010', productText: dcDinhTan7616, productName: dcDinhTan7616, candidateHeadings: ['7616', '8483'],
  });
  const dcG8483 = soTayGates({
    hs: '84835000', productText: dcBanhDa8483, productName: dcBanhDa8483, candidateHeadings: ['8483', '7616'],
  });
  check('[OZV-2191 đối chứng] đinh tán nhôm và bánh đà động cơ máy thủy không hỏi oan / không kéo oan 76.16 <-> 84.83',
    dcPb7616.length === 0 && dcPb8483.length === 0
    && !(dcG7616.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8483'))
    && !(dcG8483.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('7616'))
    && !D.moRongUngVien(['7616'], dcDinhTan7616).some((x) => x.nhom === '8483')
    && !D.moRongUngVien(['8483'], dcBanhDa8483).some((x) => x.nhom === '7616'),
    JSON.stringify({ dcPb7616, dcPb8483 }));
}

// ── OZV-2199: cạnh loại trừ 2 chiều 60.05 <-> 59.07 cho ca 124 «Vải gió dệt kim / None / None» ──
{
  const S = require('../lib/so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const { dataPath } = require('../lib/data-paths.js');
  fs.mkdirSync(dataPath('so-tay'), { recursive: true });
  for (const h of ['5903', '5907', '6001', '6004', '6005', '6006']) {
    fs.copyFileSync(path.join('data', 'so-tay', `${h}.json`), dataPath('so-tay', `${h}.json`));
  }
  D.datLai();

  const moTa124 = 'Vải gió dệt kim / None / None';
  const cumB124 = ['6005', '6006', '6004', '5903', '5907'];
  const dcBang = 'Băng, đã tẩm thuốc hoặc đóng gói để bán lẻ';
  const dcNhan = 'Các loại nhãn, phù hiệu và các mặt hàng tương tự, dệt kim hoặc móc';
  const dcHangRen = 'Hàng ren, móc thuộc nhóm 58.04';

  // 1. verifySoTay
  const s6005 = JSON.parse(fs.readFileSync(path.join('data', 'so-tay', '6005.json'), 'utf8'));
  const s5907 = JSON.parse(fs.readFileSync(path.join('data', 'so-tay', '5907.json'), 'utf8'));
  const v6005 = S.verifySoTay(s6005, '6005');
  const v5907 = S.verifySoTay(s5907, '5907');
  check('[OZV-2199 verifySoTay] sổ tay 6005 và 5907 đạt 100% (0 mục bị loại, khớp kiemTra.tong/dat)',
    v6005.loai.length === 0 && v5907.loai.length === 0
    && v6005.tong === s6005.kiemTra.tong && v6005.dat === s6005.kiemTra.dat
    && v5907.tong === s5907.kiemTra.tong && v5907.dat === s5907.kiemTra.dat,
    JSON.stringify({ loai6005: v6005.loai.slice(0, 2), loai5907: v5907.loai.slice(0, 2), v6005, v5907 }));

  // 2. Căn cứ pháp lý nguyên văn + checkItem
  const lt6005to5907 = (loadSoTay('6005')?.loaiTru || []).find((x) => x.sangNhom === '5907');
  const lt5907to6005 = (loadSoTay('5907')?.loaiTru || []).find((x) => x.sangNhom === '6005');
  check('[OZV-2199 canCuLoaiTru] loaiTru 2 chiều 6005 <-> 5907 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt6005to5907 && lt6005to5907.nguon === 'ch60.chuong' && lt6005to5907.canCuLoaiTru?.nguon === 'nhom5907.nhom'
      && !/;/.test(lt6005to5907.dieuKien || '')
      && S.checkItem('loaiTru', lt6005to5907, S.sourcesFor('6005'), '6005') === null)
    && Boolean(lt5907to6005 && lt5907to6005.nguon === 'nhom5907.nhom' && lt5907to6005.canCuLoaiTru?.nguon === 'nhom6005.nhom'
      && !/;/.test(lt5907to6005.dieuKien || '')
      && lt6005to5907.dieuKien !== lt5907to6005.dieuKien
      && S.checkItem('loaiTru', lt5907to6005, S.sourcesFor('5907'), '5907') === null),
    JSON.stringify({ lt6005to5907, lt5907to6005 }));

  // 3. Đồ thị 2 chiều C5/C6 + nhomLienQuanSoTay + moRongUngVien
  const c5Tu6005 = D.canhTu('6005', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5907');
  const c5Tu5907 = D.canhTu('5907', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6005');
  const c6Tu6005 = D.canhTu('6005', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5907');
  const c6Tu5907 = D.canhTu('5907', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6005');
  const giua = D.canhGiuaNhomConSong(['6005', '5907']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mr6005 = D.moRongUngVien(['6005'], moTa124, { toiDa: 10 });
  const mr5907 = D.moRongUngVien(['5907'], moTa124, { toiDa: 10 });
  const rel6005 = [...new Set((loadSoTay('6005')?.loaiTru || []).flatMap((x) => String(x.sangNhom || '').split(/[|,;\s]+/).map((t) => t.replace(/\D/g, '').slice(0, 4)).filter((t) => t.length === 4)))];
  const rel5907 = [...new Set((loadSoTay('5907')?.loaiTru || []).flatMap((x) => String(x.sangNhom || '').split(/[|,;\s]+/).map((t) => t.replace(/\D/g, '').slice(0, 4)).filter((t) => t.length === 4)))];
  check('[OZV-2199 đồ thị 2 chiều] C5/C6 6005<->5907, nhomLienQuanSoTay 2 chiều, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 124',
    c5Tu6005.some((e) => e.nguon === 'ch60.chuong' && e.canCuLoaiTru?.nguon === 'nhom5907.nhom')
    && c5Tu5907.some((e) => e.nguon === 'nhom5907.nhom' && e.canCuLoaiTru?.nguon === 'nhom6005.nhom')
    && c6Tu6005.length >= 1 && c6Tu5907.length >= 1 && giua.length >= 2
    && rel6005.includes('5907') && rel5907.includes('6005')
    && mr6005.some((x) => x.nhom === '5907') && mr5907.some((x) => x.nhom === '6005'),
    JSON.stringify({ c5: c5Tu6005.length, c5r: c5Tu5907.length, giua: giua.length, mr6005: mr6005.map((x) => x.nhom), mr5907: mr5907.map((x) => x.nhom) }));

  // 4. Thuận cauPhanBietNhom 2 chiều
  const pb6005 = cauPhanBietNhom('6005', ['6005', '5907'], moTa124);
  const pb5907 = cauPhanBietNhom('5907', ['5907', '6005'], moTa124);
  check('[OZV-2199 thuận cauPhanBietNhom] sinh câu hỏi phân biệt 2 chiều 60.05 <-> 59.07 cho ca 124 Vải gió dệt kim',
    pb6005.length === 1 && pb6005[0].loai === 'PHAN_BIET_NHOM' && pb6005[0].canCu === 'so-tay'
    && pb6005[0].nguon === 'ch60.chuong' && /59\.07/.test(pb6005[0].questionVi) && /60\.05/.test(pb6005[0].questionVi)
    && pb5907.length === 1 && pb5907[0].loai === 'PHAN_BIET_NHOM' && pb5907[0].canCu === 'so-tay'
    && pb5907[0].nguon === 'nhom5907.nhom' && /60\.05/.test(pb5907[0].questionVi) && /59\.07/.test(pb5907[0].questionVi),
    JSON.stringify({ pb6005, pb5907 }));

  // 5. Thuận soTayGates 2 chiều
  const g6005To5907 = soTayGates({
    hs: '60053790', productText: moTa124, productName: 'Vải gió dệt kim', candidateHeadings: ['6005', '5907'],
  });
  const g5907To6005 = soTayGates({
    hs: '59070090', productText: moTa124, productName: 'Vải gió dệt kim', candidateHeadings: ['5907', '6005'],
  });
  check('[OZV-2199 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 6005 -> 5907 và 5907 -> 6005 cho ca 124',
    (g6005To5907.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5907'))
    && (g5907To6005.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6005')),
    JSON.stringify({ g6005To5907: g6005To5907.challenges, g5907To6005: g5907To6005.challenges }));

  // 6. Ca đối chứng không hỏi oan / không kéo oan
  const dcPbBang6005 = cauPhanBietNhom('6005', ['6005', '5907'], dcBang);
  const dcPbBang5907 = cauPhanBietNhom('5907', ['5907', '6005'], dcBang);
  const dcPbNhan6005 = cauPhanBietNhom('6005', ['6005', '5907'], dcNhan);
  const dcPbRen5907 = cauPhanBietNhom('5907', ['5907', '6005'], dcHangRen);
  const dcG6005 = soTayGates({
    hs: '60053790', productText: dcNhan, productName: dcNhan, candidateHeadings: ['6005', '5907'],
  });
  const dcG5907 = soTayGates({
    hs: '59070090', productText: dcBang, productName: dcBang, candidateHeadings: ['5907', '6005'],
  });
  check('[OZV-2199 đối chứng] băng tẩm thuốc, nhãn phù hiệu và hàng ren móc không hỏi oan / không kéo oan 60.05 <-> 59.07',
    dcPbBang6005.length === 0 && dcPbBang5907.length === 0 && dcPbNhan6005.length === 0 && dcPbRen5907.length === 0
    && !(dcG6005.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5907'))
    && !(dcG5907.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6005'))
    && !D.moRongUngVien(['6005'], dcNhan).some((x) => x.nhom === '5907')
    && !D.moRongUngVien(['5907'], dcBang).some((x) => x.nhom === '6005'),
    JSON.stringify({ dcPbBang6005, dcPbBang5907, dcPbNhan6005, dcPbRen5907 }));

  // 7. hoi-truoc-4so trên cặp [6005, 5907] và cụm B.nhom [6005, 6006, 6004, 5903, 5907]
  const ht2 = phanTichHoiTruoc4So({ moTa: moTa124, ungVien: ['6005', '5907'] });
  const distinct2 = new Set((ht2.nhanh || []).map((n) => n.dieuKien)).size === 2;
  const ht5 = phanTichHoiTruoc4So({ moTa: moTa124, ungVien: cumB124 });
  const distinct5 = new Set((ht5.nhanh || []).map((n) => n.dieuKien)).size === 5;
  check('[OZV-2199 hoi-truoc-4so] ca 124 với [6005, 5907] và B.nhom [6005, 6006, 6004, 5903, 5907] trả CHUA_CHOT_NHOM_HOI_TRUOC với các nhánh điều kiện phân biệt từ cạnh C5',
    ht2.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC && distinct2
    && (ht2.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:'))
    && ['6005', '5907'].every((h) => (ht2.dapAnDieuKien || '').includes(`→ nhóm ${h} (`))
    && ht5.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC && distinct5
    && (ht5.nhanh || []).every((n) => /^do-thi:C[57]:/.test(String(n.nguon || '')))
    && cumB124.every((h) => (ht5.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    JSON.stringify({ distinct2, distinct5, ht2: ht2.dapAnDieuKien, ht5: ht5.dapAnDieuKien }));
}

// ── OZV-2205: cạnh loại trừ 2 chiều 59.03 <-> 59.02 cho ca 124 «Vải gió dệt kim / None / None» ──
{
  const S = require('../lib/so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const { dataPath } = require('../lib/data-paths.js');
  fs.mkdirSync(dataPath('so-tay'), { recursive: true });
  for (const h of ['5903', '5902']) {
    fs.copyFileSync(path.join('data', 'so-tay', `${h}.json`), dataPath('so-tay', `${h}.json`));
  }
  D.datLai();

  const moTa124 = 'Vải gió dệt kim / None / None';
  const hangThuan5903 =
    'Vải gió dệt kim thuộc dạng vải mành dùng làm lốp từ sợi có độ bền cao';
  const hangThuan5902 =
    'Vải gió dệt kim đã ngâm tẩm, phủ, tráng hoặc ép với plastic nhìn thấy bằng mắt thường';
  const hangDcBang = 'Băng, đã tẩm thuốc hoặc đóng gói để bán lẻ';
  const hangDcNhan = 'Các loại nhãn, phù hiệu và các mặt hàng tương tự, dệt kim hoặc móc';

  const s5903 = JSON.parse(fs.readFileSync(path.join('data', 'so-tay', '5903.json'), 'utf8'));
  const s5902 = JSON.parse(fs.readFileSync(path.join('data', 'so-tay', '5902.json'), 'utf8'));
  const v5903 = S.verifySoTay(s5903, '5903');
  const v5902 = S.verifySoTay(s5902, '5902');
  check('[OZV-2205 verifySoTay] sổ tay 5903 và 5902 đạt 100% (0 mục bị loại)',
    v5903.loai.length === 0 && v5902.loai.length === 0
    && v5903.tong === s5903.kiemTra.tong && v5903.dat === s5903.kiemTra.dat
    && v5902.tong === s5902.kiemTra.tong && v5902.dat === s5902.kiemTra.dat,
    JSON.stringify({ loai5903: v5903.loai.slice(0, 2), loai5902: v5902.loai.slice(0, 2) }));

  const lt5903 = (loadSoTay('5903')?.loaiTru || []).find((x) => x.sangNhom === '5902');
  const lt5902 = (loadSoTay('5902')?.loaiTru || []).find((x) => x.sangNhom === '5903');
  check('[OZV-2205 canCuLoaiTru] loaiTru 2 chiều 5903 <-> 5902 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt5903 && lt5903.nguon === 'nhom5903.nhom' && lt5903.canCuLoaiTru?.nguon === 'nhom5902.nhom'
      && !/;/.test(lt5903.dieuKien || '')
      && S.checkItem('loaiTru', lt5903, S.sourcesFor('5903'), '5903') === null)
    && Boolean(lt5902 && lt5902.nguon === 'nhom5902.nhom' && lt5902.canCuLoaiTru?.nguon === 'nhom5903.nhom'
      && !/;/.test(lt5902.dieuKien || '')
      && lt5903.dieuKien !== lt5902.dieuKien
      && S.checkItem('loaiTru', lt5902, S.sourcesFor('5902'), '5902') === null),
    JSON.stringify({ lt5903, lt5902 }));

  const c5Tu5903 = D.canhTu('5903', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5902');
  const c5Tu5902 = D.canhTu('5902', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5903');
  const c6Tu5903 = D.canhTu('5903', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5902');
  const c6Tu5902 = D.canhTu('5902', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5903');
  const giua = D.canhGiuaNhomConSong(['5903', '5902']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mr5903 = D.moRongUngVien(['5903'], moTa124, { toiDa: 10 });
  const mr5902 = D.moRongUngVien(['5902'], moTa124, { toiDa: 10 });
  check('[OZV-2205 đồ thị 2 chiều] C5/C6 5903<->5902, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 124',
    c5Tu5903.some((e) => e.nguon === 'nhom5903.nhom' && e.canCuLoaiTru?.nguon === 'nhom5902.nhom')
    && c5Tu5902.some((e) => e.nguon === 'nhom5902.nhom' && e.canCuLoaiTru?.nguon === 'nhom5903.nhom')
    && c6Tu5903.length >= 1 && c6Tu5902.length >= 1 && giua.length >= 2
    && mr5903.some((x) => x.nhom === '5902') && mr5902.some((x) => x.nhom === '5903'),
    JSON.stringify({
      c5: c5Tu5903.length, c5r: c5Tu5902.length, giua: giua.length,
      mr5903: mr5903.map((x) => x.nhom), mr5902: mr5902.map((x) => x.nhom),
    }));

  const rel5903 = [...new Set((loadSoTay('5903')?.loaiTru || []).flatMap((x) => String(x.sangNhom || '').split(/[|,;\s]+/).map((t) => t.replace(/\D/g, '').slice(0, 4)).filter((t) => t.length === 4)))];
  const rel5902 = [...new Set((loadSoTay('5902')?.loaiTru || []).flatMap((x) => String(x.sangNhom || '').split(/[|,;\s]+/).map((t) => t.replace(/\D/g, '').slice(0, 4)).filter((t) => t.length === 4)))];
  check('[OZV-2205 nhomLienQuanSoTay] liên kết hai chiều 5903 <-> 5902',
    rel5903.includes('5902') && rel5902.includes('5903'),
    JSON.stringify({ rel5903, rel5902 }));

  const pb5903 = cauPhanBietNhom('5903', ['5903', '5902'], moTa124);
  const pb5902 = cauPhanBietNhom('5902', ['5902', '5903'], moTa124);
  check('[OZV-2205 cauPhanBietNhom] 5903 đứng đầu sinh câu phân biệt 59.03↔59.02 từ nhom5903.nhom',
    pb5903.length >= 1 && pb5903[0].loai === 'PHAN_BIET_NHOM' && pb5903[0].canCu === 'so-tay'
    && pb5903[0].nguon === 'nhom5903.nhom' && /59\.02/.test(pb5903[0].questionVi) && /59\.03/.test(pb5903[0].questionVi),
    JSON.stringify(pb5903));
  check('[OZV-2205 cauPhanBietNhom] 5902 đứng đầu sinh câu phân biệt 59.02↔59.03 từ nhom5902.nhom',
    pb5902.length >= 1 && pb5902[0].loai === 'PHAN_BIET_NHOM' && pb5902[0].canCu === 'so-tay'
    && pb5902[0].nguon === 'nhom5902.nhom' && /59\.03/.test(pb5902[0].questionVi) && /59\.02/.test(pb5902[0].questionVi),
    JSON.stringify(pb5902));

  const g5903 = soTayGates({
    hs: '59031090',
    productText: hangThuan5903,
    productName: hangThuan5903,
    candidateHeadings: ['5903', '5902'],
  });
  const g5902 = soTayGates({
    hs: '59021011',
    productText: hangThuan5902,
    productName: hangThuan5902,
    candidateHeadings: ['5902', '5903'],
  });
  check('[OZV-2205 soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 5903 -> 5902 và 5902 -> 5903',
    (g5903.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5902'))
    && (g5902.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5903')),
    JSON.stringify({ g5903: g5903.challenges, g5902: g5902.challenges }));

  const dcPb5903 = cauPhanBietNhom('5903', ['5903', '5902'], hangDcBang);
  const dcPb5902 = cauPhanBietNhom('5902', ['5902', '5903'], hangDcNhan);
  const dcG5903 = soTayGates({
    hs: '59031010', productText: hangDcBang, productName: hangDcBang, candidateHeadings: ['5903', '5902'],
  });
  const dcG5902 = soTayGates({
    hs: '59021011', productText: hangDcNhan, productName: hangDcNhan, candidateHeadings: ['5902', '5903'],
  });
  check('[OZV-2205 đối chứng] băng tẩm thuốc và nhãn phù hiệu không hỏi oan / không kéo oan 59.03 <-> 59.02',
    dcPb5903.length === 0 && dcPb5902.length === 0
    && !(dcG5903.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5902'))
    && !(dcG5902.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5903'))
    && !D.moRongUngVien(['5903'], hangDcBang).some((x) => x.nhom === '5902')
    && !D.moRongUngVien(['5902'], hangDcNhan).some((x) => x.nhom === '5903'),
    JSON.stringify({ dcPb5903, dcPb5902 }));

  const ht124 = phanTichHoiTruoc4So({ moTa: moTa124, ungVien: ['5903', '5902'] });
  const distinctDk = new Set((ht124.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check('[OZV-2205 hoi-truoc-4so] ca 124 với [5903, 5902] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt',
    ht124.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC && distinctDk
    && ['5903', '5902'].every((h) => (ht124.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    JSON.stringify({ trangThai: ht124.trangThai, distinctDk, dapAnDieuKien: ht124.dapAnDieuKien }));
}

// ── OZV-2212: cạnh loại trừ 2 chiều 90.31 <-> 90.32 cho ca thực địa «cảm biến quang e3sct11, điện áp 26v, nhận biết vật» ──
{
  const S = require('../lib/so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const { dataPath } = require('../lib/data-paths.js');
  fs.mkdirSync(dataPath('so-tay'), { recursive: true });
  for (const h of ['9031', '9032']) {
    fs.copyFileSync(path.join('data', 'so-tay', `${h}.json`), dataPath('so-tay', `${h}.json`));
  }
  D.datLai();

  const moTaCamBien = 'cảm biến quang e3sct11, điện áp 26v, nhận biết vật';
  const dcNhiet = 'Bộ ổn nhiệt điều chỉnh nhiệt độ tự động cho lò';
  const dcAp = 'Bộ điều chỉnh áp lực tự động';
  const dcBan = 'Bàn kiểm tra cơ khí';

  const s9031 = JSON.parse(fs.readFileSync(path.join('data', 'so-tay', '9031.json'), 'utf8'));
  const s9032 = JSON.parse(fs.readFileSync(path.join('data', 'so-tay', '9032.json'), 'utf8'));
  const v9031 = S.verifySoTay(s9031, '9031');
  const v9032 = S.verifySoTay(s9032, '9032');
  check('[OZV-2212 verifySoTay] sổ tay 9031 và 9032 đạt 100% (0 mục bị loại, khớp kiemTra.tong/dat)',
    v9031.loai.length === 0 && v9032.loai.length === 0
    && v9031.tong === s9031.kiemTra.tong && v9031.dat === s9031.kiemTra.dat
    && v9032.tong === s9032.kiemTra.tong && v9032.dat === s9032.kiemTra.dat,
    JSON.stringify({ loai9031: v9031.loai.slice(0, 2), loai9032: v9032.loai.slice(0, 2), v9031, v9032 }));

  const lt9031to9032 = (loadSoTay('9031')?.loaiTru || []).find((x) => x.sangNhom === '9032');
  const lt9032to9031 = (loadSoTay('9032')?.loaiTru || []).find((x) => x.sangNhom === '9031');
  check('[OZV-2212 canCuLoaiTru] loaiTru 2 chiều 9031 <-> 9032 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt9031to9032 && lt9031to9032.nguon === 'nhom9031.nhom' && lt9031to9032.canCuLoaiTru?.nguon === 'nhom9032.nhom'
      && !/;/.test(lt9031to9032.dieuKien || '')
      && S.checkItem('loaiTru', lt9031to9032, S.sourcesFor('9031'), '9031') === null)
    && Boolean(lt9032to9031 && lt9032to9031.nguon === 'ch90.chuong' && lt9032to9031.canCuLoaiTru?.nguon === 'nhom9031.nhom'
      && !/;/.test(lt9032to9031.dieuKien || '')
      && lt9031to9032.dieuKien !== lt9032to9031.dieuKien
      && S.checkItem('loaiTru', lt9032to9031, S.sourcesFor('9032'), '9032') === null),
    JSON.stringify({ lt9031to9032, lt9032to9031 }));

  const c5Tu9031 = D.canhTu('9031', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '9032');
  const c5Tu9032 = D.canhTu('9032', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '9031');
  const c6Tu9031 = D.canhTu('9031', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '9032');
  const c6Tu9032 = D.canhTu('9032', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '9031');
  const giua9031 = D.canhGiuaNhomConSong(['9031', '9032']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mr9031 = D.moRongUngVien(['9031'], moTaCamBien, { toiDa: 10 });
  const mr9032 = D.moRongUngVien(['9032'], moTaCamBien, { toiDa: 10 });
  const rel9031 = [...new Set((loadSoTay('9031')?.loaiTru || []).flatMap((x) => String(x.sangNhom || '').split(/[|,;\s]+/).map((t) => t.replace(/\D/g, '').slice(0, 4)).filter((t) => t.length === 4)))];
  const rel9032 = [...new Set((loadSoTay('9032')?.loaiTru || []).flatMap((x) => String(x.sangNhom || '').split(/[|,;\s]+/).map((t) => t.replace(/\D/g, '').slice(0, 4)).filter((t) => t.length === 4)))];
  check('[OZV-2212 đồ thị 2 chiều] C5/C6 9031<->9032, nhomLienQuanSoTay 2 chiều, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca cảm biến quang',
    c5Tu9031.some((e) => e.nguon === 'nhom9031.nhom' && e.canCuLoaiTru?.nguon === 'nhom9032.nhom')
    && c5Tu9032.some((e) => e.nguon === 'ch90.chuong' && e.canCuLoaiTru?.nguon === 'nhom9031.nhom')
    && c6Tu9031.length >= 1 && c6Tu9032.length >= 1 && giua9031.length >= 2
    && rel9031.includes('9032') && rel9032.includes('9031')
    && mr9031.some((x) => x.nhom === '9032') && mr9032.some((x) => x.nhom === '9031'),
    JSON.stringify({ c5: c5Tu9031.length, c5r: c5Tu9032.length, giua: giua9031.length, mr9031: mr9031.map((x) => x.nhom), mr9032: mr9032.map((x) => x.nhom) }));

  const pb9031 = cauPhanBietNhom('9031', ['9031', '9032'], moTaCamBien);
  const pb9032 = cauPhanBietNhom('9032', ['9032', '9031'], moTaCamBien);
  check('[OZV-2212 thuận cauPhanBietNhom] sinh câu hỏi phân biệt 2 chiều 90.31 <-> 90.32 cho ca cảm biến quang nhận biết vật',
    pb9031.length === 1 && pb9031[0].loai === 'PHAN_BIET_NHOM' && pb9031[0].canCu === 'so-tay'
    && pb9031[0].nguon === 'nhom9031.nhom' && /90\.32/.test(pb9031[0].questionVi) && /90\.31/.test(pb9031[0].questionVi)
    && pb9032.length === 1 && pb9032[0].loai === 'PHAN_BIET_NHOM' && pb9032[0].canCu === 'so-tay'
    && pb9032[0].nguon === 'ch90.chuong' && /90\.31/.test(pb9032[0].questionVi) && /90\.32/.test(pb9032[0].questionVi),
    JSON.stringify({ pb9031, pb9032 }));

  const g9031To9032 = soTayGates({
    hs: '90318090', productText: moTaCamBien, productName: moTaCamBien, candidateHeadings: ['9031', '9032'],
  });
  const g9032To9031 = soTayGates({
    hs: '90328990', productText: moTaCamBien, productName: moTaCamBien, candidateHeadings: ['9032', '9031'],
  });
  check('[OZV-2212 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 9031 -> 9032 và 9032 -> 9031 cho ca cảm biến quang',
    (g9031To9032.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('9032'))
    && (g9032To9031.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('9031')),
    JSON.stringify({ g9031To9032: g9031To9032.challenges, g9032To9031: g9032To9031.challenges }));

  const dcPbNhiet9031 = cauPhanBietNhom('9031', ['9031', '9032'], dcNhiet);
  const dcPbNhiet9032 = cauPhanBietNhom('9032', ['9032', '9031'], dcNhiet);
  const dcPbAp9031 = cauPhanBietNhom('9031', ['9031', '9032'], dcAp);
  const dcPbBan9032 = cauPhanBietNhom('9032', ['9032', '9031'], dcBan);
  const dcG9031 = soTayGates({
    hs: '90318090', productText: dcBan, productName: dcBan, candidateHeadings: ['9031', '9032'],
  });
  const dcG9032 = soTayGates({
    hs: '90328990', productText: dcNhiet, productName: dcNhiet, candidateHeadings: ['9032', '9031'],
  });
  check('[OZV-2212 đối chứng] bộ ổn nhiệt, bộ điều chỉnh áp lực và bàn kiểm tra không hỏi oan / không kéo oan 90.31 <-> 90.32',
    dcPbNhiet9031.length === 0 && dcPbNhiet9032.length === 0 && dcPbAp9031.length === 0 && dcPbBan9032.length === 0
    && !(dcG9031.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('9032'))
    && !(dcG9032.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('9031'))
    && !D.moRongUngVien(['9031'], dcBan).some((x) => x.nhom === '9032')
    && !D.moRongUngVien(['9032'], dcNhiet).some((x) => x.nhom === '9031'),
    JSON.stringify({ dcPbNhiet9031, dcPbNhiet9032, dcPbAp9031, dcPbBan9032 }));

  const htCamBien = phanTichHoiTruoc4So({ moTa: moTaCamBien, ungVien: ['9031', '9032'] });
  const distinctCamBien = new Set((htCamBien.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check('[OZV-2212 hoi-truoc-4so] ca cảm biến quang với [9031, 9032] trả CHUA_CHOT_NHOM_HOI_TRUOC với các nhánh điều kiện phân biệt từ cạnh C5',
    htCamBien.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC && distinctCamBien
    && (htCamBien.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:'))
    && ['9031', '9032'].every((h) => (htCamBien.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    JSON.stringify({ distinctCamBien, htCamBien: htCamBien.dapAnDieuKien, nhanh: htCamBien.nhanh }));
}

// ── OZV-2214: cạnh loại trừ 2 chiều 40.16 <-> 84.66 cho ca thực địa 24h 'núm hút mbs-15, silicon, đường kính lỗ 2,5mm' ──
{
  const S = require('../lib/so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const { dataPath } = require('../lib/data-paths.js');
  fs.mkdirSync(dataPath('so-tay'), { recursive: true });
  for (const h of ['4016', '8466', '8479']) {
    fs.copyFileSync(path.join('data', 'so-tay', `${h}.json`), dataPath('so-tay', `${h}.json`));
  }
  D.datLai();

  const moTaMbs15 = 'núm hút mbs-15, silicon, đường kính lỗ 2,5mm';
  const moTaVp16ps = 'núm hút vp16ps, silicon, đường kính lỗ 2,2mm';
  const moTaYs310 = 'núm hút ys3-10, silicon, đường kính lỗ 3mm';
  const dcGioang = 'Gioăng vòng đệm cao su NBR làm kín mặt bích đường ống';
  const dcMamCap = 'Mâm cặp 3 chấu tự định tâm dùng cho máy tiện CNC';
  const dcDauCatRen = 'Đầu cắt ren tự mở lắp trên máy công cụ gia công kim loại';

  const s4016 = JSON.parse(fs.readFileSync(path.join('data', 'so-tay', '4016.json'), 'utf8'));
  const s8466 = JSON.parse(fs.readFileSync(path.join('data', 'so-tay', '8466.json'), 'utf8'));
  const v4016 = S.verifySoTay(s4016, '4016');
  const v8466 = S.verifySoTay(s8466, '8466');
  check('[OZV-2214 verifySoTay] sổ tay 4016 và 8466 đạt 100% (0 mục bị loại) và kiemTra khớp',
    v4016.loai.length === 0 && v8466.loai.length === 0
    && v4016.tong === s4016.kiemTra.tong && v4016.dat === s4016.kiemTra.dat
    && v8466.tong === s8466.kiemTra.tong && v8466.dat === s8466.kiemTra.dat,
    JSON.stringify({ loai4016: v4016.loai.slice(0, 2), loai8466: v8466.loai.slice(0, 2), v4016, v8466 }));

  const lt4016 = (loadSoTay('4016')?.loaiTru || []).find((x) => x.sangNhom === '8466' && x.canCuLoaiTru?.nguon === 'nhom8466.nhom');
  const lt8466 = (loadSoTay('8466')?.loaiTru || []).find((x) => x.sangNhom === '4016' && x.canCuLoaiTru?.nguon === 'nhom4016.nhom');
  check('[OZV-2214 canCuLoaiTru] loaiTru 2 chiều 4016 <-> 8466 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt4016 && lt4016.nguon === 'ch40.chuong' && lt4016.canCuLoaiTru?.nguon === 'nhom8466.nhom'
      && !/;/.test(lt4016.dieuKien || '')
      && S.checkItem('loaiTru', lt4016, S.sourcesFor('4016'), '4016') === null)
    && Boolean(lt8466 && lt8466.nguon === 'phan84.phan' && lt8466.canCuLoaiTru?.nguon === 'nhom4016.nhom'
      && !/;/.test(lt8466.dieuKien || '')
      && lt4016.dieuKien !== lt8466.dieuKien
      && S.checkItem('loaiTru', lt8466, S.sourcesFor('8466'), '8466') === null),
    JSON.stringify({ lt4016, lt8466 }));

  const c5Tu4016 = D.canhTu('4016', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8466');
  const c5Tu8466 = D.canhTu('8466', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '4016');
  const c6Tu4016 = D.canhTu('4016', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8466');
  const c6Tu8466 = D.canhTu('8466', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '4016');
  const giua4016_8466 = D.canhGiuaNhomConSong(['4016', '8466']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu4016 = D.moRongUngVien(['4016'], moTaMbs15, { toiDa: 10 });
  const mrTu8466 = D.moRongUngVien(['8466'], moTaMbs15, { toiDa: 10 });
  const mrVpTu8466 = D.moRongUngVien(['8466'], moTaVp16ps, { toiDa: 10 });
  const mrYsTu8466 = D.moRongUngVien(['8466'], moTaYs310, { toiDa: 10 });
  const rel4016 = [...new Set((loadSoTay('4016')?.loaiTru || []).flatMap((x) => String(x.sangNhom || '').split(/[|,;\s]+/).map((t) => t.replace(/\D/g, '').slice(0, 4)).filter((t) => t.length === 4)))];
  const rel8466 = [...new Set((loadSoTay('8466')?.loaiTru || []).flatMap((x) => String(x.sangNhom || '').split(/[|,;\s]+/).map((t) => t.replace(/\D/g, '').slice(0, 4)).filter((t) => t.length === 4)))];
  check('[OZV-2214 đồ thị 2 chiều] C5/C6 4016<->8466, nhomLienQuanSoTay 2 chiều, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho cả 3 ca núm hút',
    c5Tu4016.some((e) => e.nguon === 'ch40.chuong' && e.canCuLoaiTru?.nguon === 'nhom8466.nhom')
    && c5Tu8466.some((e) => e.nguon === 'phan84.phan' && e.canCuLoaiTru?.nguon === 'nhom4016.nhom')
    && c6Tu4016.length >= 1 && c6Tu8466.length >= 1 && giua4016_8466.length >= 2
    && rel4016.includes('8466') && rel8466.includes('4016')
    && mrTu4016.some((x) => x.nhom === '8466') && mrTu8466.some((x) => x.nhom === '4016')
    && mrVpTu8466.some((x) => x.nhom === '4016') && mrYsTu8466.some((x) => x.nhom === '4016'),
    JSON.stringify({ c5: c5Tu4016.length, c5r: c5Tu8466.length, giua: giua4016_8466.length, mrTu4016: mrTu4016.map((x) => x.nhom), mrTu8466: mrTu8466.map((x) => x.nhom) }));

  const pb4016 = cauPhanBietNhom('4016', ['4016', '8466'], moTaMbs15);
  const pb8466 = cauPhanBietNhom('8466', ['8466', '4016'], moTaMbs15);
  check('[OZV-2214 thuận cauPhanBietNhom] sinh câu hỏi phân biệt 2 chiều 40.16 <-> 84.66 cho ca núm hút mbs-15',
    pb4016.length === 1 && pb4016[0].loai === 'PHAN_BIET_NHOM' && pb4016[0].canCu === 'so-tay'
    && pb4016[0].nguon === 'ch40.chuong' && /84\.66/.test(pb4016[0].questionVi) && /40\.16/.test(pb4016[0].questionVi)
    && pb8466.length === 1 && pb8466[0].loai === 'PHAN_BIET_NHOM' && pb8466[0].canCu === 'so-tay'
    && pb8466[0].nguon === 'phan84.phan' && /40\.16/.test(pb8466[0].questionVi) && /84\.66/.test(pb8466[0].questionVi),
    JSON.stringify({ pb4016, pb8466 }));

  const g4016To8466 = soTayGates({
    hs: '40169959', productText: moTaMbs15, productName: 'núm hút mbs-15', candidateHeadings: ['4016', '8466'],
  });
  const g8466To4016 = soTayGates({
    hs: '84662090', productText: moTaMbs15, productName: 'núm hút mbs-15', candidateHeadings: ['8466', '4016'],
  });
  check('[OZV-2214 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 4016 -> 8466 và 8466 -> 4016 cho ca núm hút mbs-15',
    (g4016To8466.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8466'))
    && (g8466To4016.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('4016')),
    JSON.stringify({ g4016To8466: g4016To8466.challenges, g8466To4016: g8466To4016.challenges }));

  const dcPbGioang4016 = cauPhanBietNhom('4016', ['4016', '8466'], dcGioang);
  const dcPbGioang8466 = cauPhanBietNhom('8466', ['8466', '4016'], dcGioang);
  const dcPbMamCap4016 = cauPhanBietNhom('4016', ['4016', '8466'], dcMamCap);
  const dcPbMamCap8466 = cauPhanBietNhom('8466', ['8466', '4016'], dcMamCap);
  const dcPbRen8466 = cauPhanBietNhom('8466', ['8466', '4016'], dcDauCatRen);
  const dcG4016 = soTayGates({
    hs: '40169390', productText: dcGioang, productName: 'Gioăng vòng đệm cao su NBR', candidateHeadings: ['4016', '8466'],
  });
  const dcG8466 = soTayGates({
    hs: '84662090', productText: dcMamCap, productName: 'Mâm cặp 3 chấu tự định tâm', candidateHeadings: ['8466', '4016'],
  });
  check('[OZV-2214 đối chứng] gioăng vòng đệm cao su, mâm cặp máy tiện và đầu cắt ren không hỏi oan / không kéo oan 40.16 <-> 84.66',
    dcPbGioang4016.length === 0 && dcPbGioang8466.length === 0 && dcPbMamCap4016.length === 0 && dcPbMamCap8466.length === 0 && dcPbRen8466.length === 0
    && !(dcG4016.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8466'))
    && !(dcG8466.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('4016'))
    && !D.moRongUngVien(['4016'], dcGioang).some((x) => x.nhom === '8466')
    && !D.moRongUngVien(['8466'], dcMamCap).some((x) => x.nhom === '4016')
    && !D.moRongUngVien(['8466'], dcDauCatRen).some((x) => x.nhom === '4016'),
    JSON.stringify({ dcPbGioang4016, dcPbGioang8466, dcPbMamCap4016, dcPbMamCap8466, dcPbRen8466 }));

  const ht2 = phanTichHoiTruoc4So({ moTa: moTaMbs15, ungVien: ['4016', '8466'] });
  const distinct2 = new Set((ht2.nhanh || []).map((n) => n.dieuKien)).size === 2;
  const ht3 = phanTichHoiTruoc4So({ moTa: moTaMbs15, ungVien: ['4016', '8479', '8466'] });
  const distinct3 = new Set((ht3.nhanh || []).map((n) => n.dieuKien)).size === 3;
  check('[OZV-2214 hoi-truoc-4so] ca núm hút mbs-15 với [4016, 8466] và tam giác [4016, 8479, 8466] trả CHUA_CHOT_NHOM_HOI_TRUOC với đủ nhánh điều kiện phân biệt từ cạnh C5',
    ht2.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC && distinct2
    && (ht2.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:'))
    && ['4016', '8466'].every((h) => (ht2.dapAnDieuKien || '').includes(`→ nhóm ${h} (`))
    && ht3.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC && distinct3
    && (ht3.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:'))
    && ['4016', '8479', '8466'].every((h) => (ht3.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    JSON.stringify({ distinct2, distinct3, ht2: ht2.dapAnDieuKien, ht3: ht3.dapAnDieuKien }));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
