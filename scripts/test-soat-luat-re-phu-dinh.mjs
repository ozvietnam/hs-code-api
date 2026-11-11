#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-307 (#1109) — quét phủ định ở `lib/soat-luat-re.js` phải đọc theo VẾ, không quét cả câu.
 *
 * Hai lỗi thẻ mô tả, tái lập được trên `main` 9c12c74e trước khi vá:
 *
 *   Lỗi 1 — `khopVe` (dòng 71) trả `null` cho CẢ vế chỉ vì trong vế có chữ "không|chưa", kể cả khi chữ đó
 *            thuộc CỤM TUỲ CHỌN ("đã hoặc chưa pha trộn" — X không ràng buộc) hoặc thuộc CỤM GHÉP
 *            ("thép không gỉ", "chân không", "không khí" — "không" là một phần của danh từ/tính từ).
 *   Lỗi 2 — `boPhuDinh` (dòng 93-112) nuốt luôn vế KHẲNG ĐỊNH đứng sau từ nối chuyển ý ("… nhưng là …"),
 *            và cắt ngay giữa cụm tuỳ chọn ("máy có hoặc | không có bộ nhớ" → mất "bộ nhớ kèm theo").
 *
 * DÙNG LẠI, không viết regex thứ tư: `lib/cum-tuy-chon.js#boCumTuyChon` (OZV-276 rút ra, mức CỤM) +
 * `lib/tu-vung.js#boGiaPhuDinh` (23 cụm `khongPhaiPhuDinh` của `data/tu-vung/tu-vung@2.json`) +
 * mẫu từ nối của `zalo-bot packs/hs/loc-tap-am.js:90`.
 *
 * RÀO NGƯỢC là tiêu chí xong, không phải phần thêm: phủ định THẬT ("không có", "ko có", "chưa có",
 * "không phải", "trừ", "without") vẫn phải bị bỏ/bị chặn như cũ. Vá rộng quá tay thì hàng có loại trừ
 * thật lọt vào dòng sai — với người khai đi trình Hải quan, hướng sai đó tệ hơn báo oan.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let passed = 0; let failed = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || extra === undefined ? '' : ` ${JSON.stringify(extra).slice(0, 400)}`}`);
  if (ok) passed += 1; else failed += 1;
};

const { khopVe, boPhuDinh, chuan } = require('../lib/soat-luat-re.js');
const { boCumTuyChon, coCumTuyChon } = require('../lib/cum-tuy-chon.js');

// Khuôn mô tả như lib/soat-luat-re.js#nghiLoaiKhacBiTru dựng: đã chuẩn hoá, có khoảng trắng hai đầu.
const C = (s) => ` ${chuan(s)} `;

// ── A. Lỗi 2 — `boPhuDinh` dừng ở từ nối chuyển ý, không cắt trong cụm tuỳ chọn ───────────────────────
// Bốn câu tái lập NGUYÊN VĂN trong thẻ OZV-307 (trước vá: '', 'máy có hoặc ', 'gluten lúa mì đã hoặc ', giữ nguyên).
check('A1 "không phải kính thuốc NHƯNG là kính bảo hộ hàn điện" → giữ vế khẳng định sau "nhưng"',
  /kính bảo hộ hàn điện/.test(boPhuDinh('không phải kính thuốc nhưng là kính bảo hộ hàn điện')),
  boPhuDinh('không phải kính thuốc nhưng là kính bảo hộ hàn điện'));
check('A1b … và vẫn BỎ vế phủ định "kính thuốc" (rào ngược)',
  !/kính thuốc/.test(boPhuDinh('không phải kính thuốc nhưng là kính bảo hộ hàn điện')),
  boPhuDinh('không phải kính thuốc nhưng là kính bảo hộ hàn điện'));
check('A2 "máy có hoặc không có bộ nhớ kèm theo" → cụm tuỳ chọn, giữ "bộ nhớ kèm theo"',
  /bộ nhớ kèm theo/.test(boPhuDinh('máy có hoặc không có bộ nhớ kèm theo')),
  boPhuDinh('máy có hoặc không có bộ nhớ kèm theo'));
check('A3 "gluten lúa mì đã hoặc chưa làm khô" → giữ "làm khô"',
  /làm khô/.test(boPhuDinh('gluten lúa mì đã hoặc chưa làm khô')),
  boPhuDinh('gluten lúa mì đã hoặc chưa làm khô'));
check('A4 "thép không gỉ dạng cuộn cán nguội" → giữ NGUYÊN câu (đã đúng từ trước, không được hồi quy)',
  boPhuDinh('thép không gỉ dạng cuộn cán nguội') === 'thép không gỉ dạng cuộn cán nguội',
  boPhuDinh('thép không gỉ dạng cuộn cán nguội'));

// Từ nối chuyển ý khác của mẫu dùng lại (`zalo-bot packs/hs/loc-tap-am.js:90`: `,;.` + nhưng/nhung/mà/ma).
check('A5 "không có vỏ MÀ có khung nhựa" → giữ "khung nhựa", bỏ "vỏ"',
  /khung nhựa/.test(boPhuDinh('không có vỏ mà có khung nhựa')) && !/\bvỏ\b/.test(boPhuDinh('không có vỏ mà có khung nhựa')),
  boPhuDinh('không có vỏ mà có khung nhựa'));
check('A6 dấu phẩy vẫn dừng phủ định như cũ ("không phải thép, bằng nhôm")',
  /bằng nhôm/.test(boPhuDinh('không phải thép, bằng nhôm')) && !/thép/.test(boPhuDinh('không phải thép, bằng nhôm')),
  boPhuDinh('không phải thép, bằng nhôm'));

// Rào ngược cho `boPhuDinh`: phủ định thật vẫn bị gỡ hết (không có từ nối nào để dừng sớm).
for (const [s, mat] of [
  ['hàng không có lưới bảo vệ', 'lưới bảo vệ'],
  ['hàng ko có đầu nối', 'đầu nối'],
  ['hàng chưa có vỏ bọc', 'vỏ bọc'],
  ['không phải là kính thuốc', 'kính thuốc'],
  ['trừ loại dùng cho xe đạp', 'xe đạp'],
]) {
  check(`A7 rào ngược: "${s}" vẫn bỏ sạch mệnh đề phủ định`, !new RegExp(mat).test(boPhuDinh(s)), boPhuDinh(s));
}
// Cụm tuỳ chọn mức CỤM vẫn là PHỦ ĐỊNH THẬT khi đứng trong câu CHO PHÉP (hai mức, đừng trộn — OZV-276).
check('A8 hai mức không trộn: "ngay cả khi không có đầu" vẫn bỏ "đầu" (phủ định thật ở mức CỤM)',
  !/(?<![\p{L}])đầu(?![\p{L}])/u.test(boPhuDinh('ngay cả khi không có đầu')),
  boPhuDinh('ngay cả khi không có đầu'));

// ── A9. "nhung"/"ma" KHÔNG DẤU là từ thật trong biểu thuế, không phải từ nối chuyển ý ────────────────
// Lỗi của chính PR #1210 (soát độc lập bắt được, #1210 comment-6800594580): mẫu dùng lại của `zalo-bot`
// nhận cả biến thể không dấu `nhung|ma` vì bên đó đọc caption Zalo (gõ thiếu dấu là thường), cắt sai chỉ
// lọt thêm tạp âm. Bên này mẫu chạy trên ĐƯỜNG CHỐT MÃ: cắt sai thì mệnh đề phủ định của khách bị dừng
// sớm, chữ khách đang LOẠI TRỪ lại thành bằng chứng khớp dòng — sai đúng chiều nguy hiểm.
// 7 dòng biểu thuế có các từ này thật: 12115000/13021400 "cây ma hoàng", 32141000 "ma tít để gắn kính",
// 96180000 "ma-nơ-canh", 59070040/59111000 "nhung xơ vụn", 07095500 "Nấm Tùng Nhung".
for (const [s, mat] of [
  ['không phải vải dệt kim nhung sợi dọc', 'nhung sợi dọc'],
  ['không phải nấm Tùng Nhung sấy khô', 'Nhung sấy khô'],
  ['không có ma tít gắn kính', 'ma tít'],
  ['không có ma trận điểm', 'ma trận'],
  ['trừ loại bằng nhung tơ tằm', 'nhung tơ tằm'],
]) {
  check(`A9 "${s}" → bỏ SẠCH mệnh đề phủ định ("${mat}" không được thành bằng chứng)`,
    !new RegExp(mat, 'i').test(boPhuDinh(s)), boPhuDinh(s));
}
// … nhưng từ nối CÓ DẤU vẫn phải dừng như A1/A5 (bỏ hai biến thể ascii không được làm hỏng bản vá chính).
check('A9b từ nối CÓ DẤU vẫn dừng: "không phải nhung tơ tằm nhưng là vải dệt kim"',
  /vải dệt kim/.test(boPhuDinh('không phải nhung tơ tằm nhưng là vải dệt kim'))
    && !/nhung tơ tằm/.test(boPhuDinh('không phải nhung tơ tằm nhưng là vải dệt kim')),
  boPhuDinh('không phải nhung tơ tằm nhưng là vải dệt kim'));

// ── B. Lỗi 1 — `khopVe` che cụm tuỳ chọn / cụm ghép TRƯỚC khi xét rào "không|chưa" ────────────────────
// ≥ 2 vế TUỲ CHỌN (thẻ nêu: mật ong 17029020, urê 31021000) — trước vá cả hai trả null.
check('B1 vế tuỳ chọn "Mật ong nhân tạo, đã hoặc chưa pha trộn…" khớp mô tả mật ong pha trộn',
  (() => { const k = khopVe('Mật ong nhân tạo, đã hoặc chưa pha trộn với mật ong tự nhiên',
    C('Mật ong nhân tạo dạng lỏng, đã pha trộn với mật ong tự nhiên, đóng lọ 500g')); return k && k.danhTu === 'mật ong'; })(),
  khopVe('Mật ong nhân tạo, đã hoặc chưa pha trộn với mật ong tự nhiên', C('Mật ong nhân tạo dạng lỏng, đã pha trộn với mật ong tự nhiên, đóng lọ 500g')));
check('B2 vế tuỳ chọn "Thuốc nhuộm axit, có hoặc không tạo phức kim loại" khớp mô tả thuốc nhuộm axit',
  (() => { const k = khopVe('Thuốc nhuộm axit, có hoặc không tạo phức kim loại',
    C('Thuốc nhuộm axit dạng bột dùng nhuộm len, có tạo phức kim loại')); return k && k.danhTu === 'thuốc nhuộm'; })(),
  khopVe('Thuốc nhuộm axit, có hoặc không tạo phức kim loại', C('Thuốc nhuộm axit dạng bột dùng nhuộm len, có tạo phức kim loại')));
check('B3 vế tuỳ chọn không còn bị rào chặn: cả 4 vế mẫu của thẻ đều qua được cổng "không|chưa"',
  ['Mật ong nhân tạo, đã hoặc chưa pha trộn với mật ong tự nhiên', 'Urê, có hoặc không ở trong dung dịch nước',
    'Thuốc nhuộm axit, có hoặc không tạo phức kim loại', 'Chỉ khâu, đã hoặc chưa tiệt trùng']
    .every((v) => coCumTuyChon(v) && !/(?<![\p{L}])(?:không|chưa)(?![\p{L}])/u.test(boCumTuyChon(v))));

// ≥ 2 vế CỤM GHÉP (thẻ nêu: 72042100/73041100 "Bằng thép không gỉ", 70200040 "Ống chân không", 24011010 "sấy bằng không khí nóng").
check('B4 vế cụm ghép "Ống chân không bằng thuỷ tinh" khớp mô tả ống chân không',
  (() => { const k = khopVe('Ống chân không bằng thuỷ tinh', C('Ống chân không bằng thuỷ tinh dùng cho máy thu hình')); return k && k.danhTu === 'ống chân'; })(),
  khopVe('Ống chân không bằng thuỷ tinh', C('Ống chân không bằng thuỷ tinh dùng cho máy thu hình')));
check('B5 vế cụm ghép "Lá thuốc lá đã sấy bằng không khí nóng" khớp mô tả cùng cách sấy',
  (() => { const k = khopVe('Lá thuốc lá đã sấy bằng không khí nóng', C('Lá thuốc lá đã sấy bằng không khí nóng, chưa tước cuộng')); return k && /thuốc lá|lá thuốc/.test(k.danhTu); })(),
  khopVe('Lá thuốc lá đã sấy bằng không khí nóng', C('Lá thuốc lá đã sấy bằng không khí nóng, chưa tước cuộng')));
check('B6 cụm ghép qua được cổng: "thép không gỉ" / "chân không" / "không khí" / "không dây" bị che trước khi xét rào',
  ['Bằng thép không gỉ', 'Ống chân không', 'Máy sấy bằng không khí nóng', 'Tai nghe không dây']
    .every((v) => !/(?<![\p{L}])(?:không|chưa)(?![\p{L}])/u.test(require('../lib/tu-vung.js').boGiaPhuDinh
      ? require('../lib/tu-vung.js').boGiaPhuDinh(v) : v)));

// Rào ngược cho `khopVe` — phủ định THẬT trong vế vẫn phải trả null (đây là chiều sai nguy hiểm).
for (const ve of [
  'Mùn cưa chưa ngâm tẩm',
  'Tấm nhựa không xốp',
  'Máy không có bộ phận làm lạnh',
  'Loại khác',
  'Trừ loại dùng cho xe đạp',
]) {
  check(`B7 rào ngược: vế phủ định thật "${ve}" vẫn KHÔNG khớp bằng từ khoá (null)`,
    khopVe(ve, C('hàng mùn cưa tấm nhựa máy bộ phận làm lạnh xe đạp xốp ngâm tẩm')) === null,
    khopVe(ve, C('hàng mùn cưa tấm nhựa máy bộ phận làm lạnh xe đạp xốp ngâm tẩm')));
}
check('B8 rào ngược: vế có chữ số vẫn trả null (điều kiện định lượng)',
  khopVe('Dây dẫn điện áp dưới 1000 V', C('dây dẫn điện bằng đồng điện áp 660 v')) === null);

// ── C. Luồng thật — /api/declaration-check không được đổi kết luận của hai ca báo oan đã chốt ─────────
const { nghiLoaiKhacBiTru } = require('../lib/soat-luat-re.js');
check('C1 báo oan cũ giữ nguyên: đầu nối bo mạch khai 85369094 → không nghi dòng bị trừ',
  nghiLoaiKhacBiTru('85369094', 'Đầu nối bo mạch 2 hàng 40 chân bước 2.54mm, dùng nối giữa hai bo mạch in, mã HB-240R').length === 0,
  nghiLoaiKhacBiTru('85369094', 'Đầu nối bo mạch 2 hàng 40 chân bước 2.54mm, dùng nối giữa hai bo mạch in, mã HB-240R').map((x) => x.ve));
check('C2 ca nghi đúng cũ giữ nguyên: chân pin bấm vào dây dẫn khai 85369094 → vẫn nghi tiêu đề bị trừ',
  nghiLoaiKhacBiTru('85369094', 'Chân pin bằng đồng mạ thiếc loại bấm vào dây dẫn, mã PX-087T-0.6, dùng kết nối dây dẫn').length > 0);
check('C3 mô tả có vế khẳng định sau "nhưng" vào được bằng chứng: "không phải đầu nối cáp nhưng dùng cho dây dẫn"',
  (() => { const m = ` ${chuan(boPhuDinh('Chân pin bằng đồng, không phải đầu nối cáp quang nhưng loại bấm vào dây dẫn'))} `;
    return /dây dẫn/.test(m) && !/cáp quang/.test(m); })(),
  boPhuDinh('Chân pin bằng đồng, không phải đầu nối cáp quang nhưng loại bấm vào dây dẫn'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
