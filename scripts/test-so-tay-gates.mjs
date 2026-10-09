// Cổng sổ tay chú giải lúc chạy (lib/so-tay-gates.js) — tất định, không AI. Dữ liệu: data/so-tay/8509.json.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { soTayGates, soTayBlock, headPhrases, productHead, phraseHit, isPartsLine, loadSoTay } = require('../lib/so-tay-gates.js');

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
check('nhóm chưa có sổ tay → null, cổng không kiểm', soTayBlock('0101') === null && loadSoTay('0101') === null && soTayGates({ hs: '01012100', productText: 'ngựa' }).checked === false);

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

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
