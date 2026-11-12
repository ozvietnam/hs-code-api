#!/usr/bin/env node
/**
 * scripts/test-chot-trung-ten.mjs — `chotDong8` phải TỪ CHỐI ĐOÁN khi ranh giới giữa các dòng anh em KHÔNG tất định
 * (OZV-420, #1109). Thu hoạch từ OZV-401: khung sổ tay Chương 98 nhóm 9849 + 9818 sạch về dữ liệu (402/402 mục kiểm
 * được nguồn, 0 lệch cây) nhưng cổng luật xấu đi `chotSai` +1 · `chotLoaiKhacSai` +5 — không phải dữ liệu sai, mà lõi
 * đoán bừa. Trích sai mã tệ hơn không trích: đây là bằng chứng người khai đưa cho Hải quan.
 *
 * Ba gốc KHÁC NHAU, đo được từng cái (đừng gộp làm một):
 *
 *   G1 — lkLines TRÙNG TÊN y hệt. `lib/so-tay-gates.js` nhánh "mọi anh em có điều kiện và đều TRÁI" trả `lkLines[0]`
 *        hoặc dòng "Loại khác" duy nhất của một nút tầng, trong khi phân nhóm có NHIỀU dòng "Loại khác" mang tên y hệt
 *        nhau ở các nút tầng khác nhau. 9849 có 51 cặp/chùm như vậy (98492215/98492225; chùm 13 mã 98493432…98493499).
 *        Chọn một trong các mã đồng tên = đoán. Phải trả `KHONG_THE_CHOT` + `ranh-gioi-so-chu-khong-tat-dinh`, giống
 *        #1240 đã làm với cặp 98110010/98110090.
 *
 *   G2 — nút tầng THOA nhờ điều kiện mà hồ sơ KHÔNG khai. Nút `9818221` ("kèm bộ phận làm lạnh + van đảo chiều") và
 *        `9849221`/`9849222` ("dùng cho xe khác thuộc Chương 87") THOA, nhưng mọi con có tên dưới nút đều TRÁI vì một
 *        điều kiện số/kiểu riêng. Tự rơi xuống "Loại khác" của nút ⇒ chốt mã Loại khác sai nhánh.
 *
 *   G3 — hai dòng anh em có điều kiện KHÁC SỨC MẠNH trên cùng khoá, dòng YẾU hơn THOA một mình. 984932: .10 cần
 *        `dungCho = "xe có động cơ thuộc Chương 87"` + `tenLoai "Đèn pha gắn kín"` (so chữ, KHÔNG tất định) còn .30
 *        chỉ cần `dungCho = "xe có động cơ"`. Mô tả nêu đúng tên .10 ⇒ .10 CHUA_BIET (vế tên không tất định), .30 THOA
 *        một mình ⇒ máy CHOT .30. Chốt mã khác khi vế phân biệt duy nhất chưa kiểm được = đoán.
 *
 * Test dùng bản ranh giới ĐÔNG CỨNG `scripts/fixtures/ho-so/ranh-gioi-0476046/` (bản sao nguyên văn tại commit 0476046,
 * main sau #1241) — không đọc bản sống, nên soạn lại / duyệt lại không làm test vỡ oan (#656). Khung sổ tay 9849/9818
 * sinh tại chỗ bằng `scripts/so-tay-chuong-98.mjs` vào HS_DATA_DIR, nên test chạy được cả khi khung chưa vào main.
 *
 * Mỗi ca CÓ TÊN và nêu mã kỳ vọng vs mã máy trả: gỡ bản vá là đỏ đúng tên ca, không phải đỏ chung một dòng.
 */
import './test-isolate-data.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const WRITE = process.env.HS_DATA_DIR;

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x)}`); } };

// ── Gieo dữ liệu vào thư mục ghi cách ly ───────────────────────────────────────────────────────────────────────────
// 1. Khung sổ tay 9849 + 9818 (tất định, không AI) — `--force` vì dataReadPath rơi về data/ gốc nếu nhóm đã vào main.
execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'so-tay-chuong-98.mjs'), '--force', '--nhom=9849,9818'], { cwd: ROOT, encoding: 'utf8', env: process.env });
check('0a khung 9849 + 9818 đã gieo vào HS_DATA_DIR', ['9849', '9818'].every((h) => fs.existsSync(path.join(WRITE, 'so-tay', `${h}.json`))), WRITE);

// 2. Bản ranh giới DUYET đông cứng của 4 phân nhóm mang ba gốc lỗi.
const DONG_CUNG = path.join(ROOT, 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-0476046');
fs.mkdirSync(path.join(WRITE, 'ho-so', 'ranh-gioi'), { recursive: true });
for (const pn6 of ['984922', '984925', '984932', '981822']) {
  fs.copyFileSync(path.join(DONG_CUNG, `${pn6}.json`), path.join(WRITE, 'ho-so', 'ranh-gioi', `${pn6}.json`));
}
check('0b 4 bản ranh giới đông cứng đều DUYET', ['984922', '984925', '984932', '981822'].every((p) => JSON.parse(fs.readFileSync(path.join(DONG_CUNG, `${p}.json`), 'utf8')).trangThai === 'DUYET'));

// Require SAU khi gieo: cache của so-tay-gates đọc theo đường dẫn.
const G = require('../lib/so-tay-gates.js');
const T = require('../lib/hs-tree.js');
const taxData = require('../data/tax.json');

// Sanity check của chính máy đo (mẹo OZV-420): `isResidual` nhận MÃ chứ không nhận TÊN — truyền tên vào là pass GIẢ.
const { isResidual } = require('../lib/residual-guard.js');
check('0c máy đo đúng: isResidual nhận MÃ (98492219 Loại khác) chứ không nhận TÊN', isResidual('98492219') === true && isResidual('Loại khác') !== true, [isResidual('98492219'), isResidual('Loại khác')]);

/** Mã anh em cùng cha tầng mang TÊN y hệt mã `hs` (sau khi bỏ dấu gạch phân cấp) — chùm đồng tên của phân nhóm. */
const tenSach = (hs) => String(taxData[hs]?.vn || '').replace(/^[-\s–]+/, '').replace(/^\d{8}\s*/, '').replace(/\s+/g, ' ').trim().toLowerCase();

// ── G1. Nhiều dòng "Loại khác" TRÙNG TÊN y hệt ⇒ từ chối đoán ──────────────────────────────────────────────────────
// 984922: hai nút tầng 9849221 ("Dùng cho xe khác thuộc Chương 87") và 9849222 ("Dùng cho động cơ của xe khác…") mỗi nút
// có một dòng "Loại khác" — 98492219 và 98492229, TÊN Y HỆT. Mô tả là ca loại trừ của 98492229 (nêu "dùng cho động cơ
// của xe khác thuộc Chương 87"), máy cũ trả 98492219: mã của NÚT KHÁC.
check('G1-pre 98492219 và 98492229 trùng tên y hệt trong cùng phân nhóm', tenSach('98492219') === tenSach('98492229') && tenSach('98492219') === 'loại khác', [tenSach('98492219'), tenSach('98492229')]);
{
  const txt = 'Các bộ phận chỉ dùng hoặc chủ yếu dùng cho các loại động cơ thuộc nhóm 84.07 hoặc 84.08, không phải Chế hòa khí, hàng hoàn chỉnh, không phải Thân động cơ, không phải hộp trục khuỷu, không phải Ống xi lanh, không phải Quy lát, không phải nắp quy lát, không phải Piston, không phải Bạc piston, không phải chốt piston, dùng cho động cơ của xe khác thuộc Chương 87, loại dùng chung';
  const r = G.chotDong8({ hs: '984922', productText: txt });
  check('G1a 984922 (ca loại trừ 98492229): KHÔNG chốt 98492219 của nút khác', r.hs !== '98492219', { ketQua: r.ketQua, hs: r.hs, lyDo: r.lyDo });
  check('G1b 984922: từ chối đoán → KHONG_THE_CHOT, ranh giới không tất định', r.ketQua === 'KHONG_THE_CHOT' && /^ranh-gioi-/.test(String(r.lyDo)), { ketQua: r.ketQua, hs: r.hs, lyDo: r.lyDo });
}
// 984925: BỐN dòng "Loại khác" đồng tên (98492519/29/39/49) dưới bốn nút tầng, ba nút có tên y hệt nhau
// ("Sử dụng cho xe có động cơ (trừ loại thuộc phân nhóm 8415.20)"). Máy cũ trả 98492529 cho cả ba ca loại trừ khác nhau.
check('G1-pre 984925 có 4 dòng Loại khác đồng tên', ['98492519', '98492529', '98492539', '98492549'].every((h) => tenSach(h) === 'loại khác'));
for (const [kyVong, txt] of [
  ['98492519', 'Máy điều hòa không khí, gồm có một quạt chạy bằng mô tơ và các bộ phận làm thay đổi nhiệt độ và độ ẩm, kể cả loại máy không điều chỉnh độ ẩm một cách riêng biệt, dùng cho người, dùng cho xe có động cơ, hàng hoàn chỉnh, công suất 102760W'],
  ['98492539', 'Máy điều hòa không khí, gồm có một quạt chạy bằng mô tơ và các bộ phận làm thay đổi nhiệt độ và độ ẩm, kể cả loại máy không điều chỉnh độ ẩm một cách riêng biệt, dùng cho xe có động cơ, có kèm bộ phận làm lạnh, không kèm bộ phận làm lạnh, không dùng cho người, hàng hoàn chỉnh, công suất 102760W'],
  ['98492549', 'Máy điều hòa không khí, gồm có một quạt chạy bằng mô tơ và các bộ phận làm thay đổi nhiệt độ và độ ẩm, kể cả loại máy không điều chỉnh độ ẩm một cách riêng biệt, dùng cho xe có động cơ, không kèm bộ phận làm lạnh, không dùng cho người, hàng hoàn chỉnh, công suất 102760W'],
]) {
  const r = G.chotDong8({ hs: '984925', productText: txt });
  check(`G1c 984925 (ca loại trừ ${kyVong}): KHÔNG chốt 98492529 của nút khác`, r.hs !== '98492529', { kyVong, ketQua: r.ketQua, hs: r.hs, lyDo: r.lyDo });
  check(`G1d 984925 (${kyVong}): từ chối đoán → KHONG_THE_CHOT, ranh giới không tất định`, r.ketQua === 'KHONG_THE_CHOT' && /^ranh-gioi-/.test(String(r.lyDo)), { kyVong, ketQua: r.ketQua, hs: r.hs, lyDo: r.lyDo });
}

// ── G2. Nút tầng THOA nhờ điều kiện hồ sơ CHƯA khai ⇒ không rơi xuống "Loại khác" của nút ──────────────────────────
// 981822: nút 9818221 đòi `coBoPhanLamLanh CO` + `coVanDaoChieu CO` + `laBoPhan KHONG`. Mô tả là tên nguyên văn của
// 98182211 ("Công suất làm mát không quá 26,38 kW" dưới nút đó) ⇒ ĐÚNG mã là 98182211, nhưng vế `laBoPhan KHONG` của
// dòng .11 chấm TRÁI (khoá kiểu, mô tả không khai) ⇒ mọi con TRÁI ⇒ máy cũ rơi xuống 98182219 "Loại khác".
check('G2-pre 98182219 là dòng Loại khác trần duy nhất của 981822', Boolean(T.nodeOf('98182219')?.loaiKhacTran) && tenSach('98182219') === 'loại khác');
{
  const txt = 'Máy điều hoà không khí, sử dụng cho xe chạy trên đường ray: Kèm theo các bộ phận làm lạnh và một van đảo chiều chu trình nóng lạnh (bơm nhiệt có đảo chiều): Công suất làm mát không quá 26,38 kW';
  const r = G.chotDong8({ hs: '981822', productText: txt });
  check('G2a 981822 (tên nguyên văn 98182211): KHÔNG tự chốt 98182219 "Loại khác"', r.hs !== '98182219', { ketQua: r.ketQua, hs: r.hs, lyDo: r.lyDo });
  check('G2b 981822: chốt ĐÚNG 98182211, hoặc từ chối đoán — không được chốt mã khác', r.hs === '98182211' || r.ketQua === 'KHONG_THE_CHOT', { ketQua: r.ketQua, hs: r.hs, lyDo: r.lyDo });
}

// ── G3. Anh em có điều kiện KHÁC SỨC MẠNH trên cùng khoá, vế phân biệt KHÔNG tất định ⇒ không chốt dòng yếu ────────
// 984932: .10 cần dungCho "xe có động cơ thuộc Chương 87" (hẹp) + tenLoai "Đèn pha gắn kín" (so chữ, không tất định);
// .30 chỉ cần dungCho "xe có động cơ" (rộng). Mô tả nêu đúng tên .10 ⇒ .10 CHUA_BIET, .30 THOA một mình ⇒ máy cũ CHOT .30.
{
  const txt = 'Bóng đèn dây tóc hoặc bóng đèn phóng điện, kể cả đèn pha gắn kín và bóng đèn tia cực tím hoặc tia hồng ngoại; bóng đèn hồ quang; đèn đi-ốt phát quang (LED): Đèn pha gắn kín (sealed beam lamp units): Dùng cho xe có động cơ thuộc Chương 87';
  const r = G.chotDong8({ hs: '984932', productText: txt });
  check('G3a 984932 (tên nguyên văn 98493210): KHÔNG chốt 98493230 của nhánh khác', r.hs !== '98493230', { ketQua: r.ketQua, hs: r.hs, lyDo: r.lyDo });
  check('G3b 984932: chốt ĐÚNG 98493210, hoặc từ chối đoán — không được chốt mã khác', r.hs === '98493210' || r.ketQua === 'KHONG_THE_CHOT', { ketQua: r.ketQua, hs: r.hs, lyDo: r.lyDo });
}

// ── Rào NGƯỢC: bản vá không được làm mất các chốt ĐÚNG đã có ──────────────────────────────────────────────────────
// Phân nhóm chỉ có MỘT dòng "Loại khác" thì phủ định hoàn chỉnh vẫn phải chốt được dòng đó như cũ — nếu không, bản vá
// đã đổi thành "không bao giờ chốt Loại khác", tức là chữa bằng cách tắt tính năng.
{
  const r = G.chotDong8({ hs: '40092110', productText: 'ống cao su có phụ kiện, đường kính 12 mm' });
  check('N1 4009.21 (một dòng Loại khác duy nhất): vẫn LOAI_KHAC 40092190 như cũ', r.ketQua === 'LOAI_KHAC' && r.hs === '40092190', { ketQua: r.ketQua, hs: r.hs, lyDo: r.lyDo });
}
{
  const r = G.chotDong8({ hs: '40092190', productText: 'ống cao su có lắp phụ kiện cứng, đường kính 20 cm, độ dày thành ống 2 cm' });
  check('N2 4009.21 ca chốt dương tính: vẫn CHOT 40092110 như cũ', r.ketQua === 'CHOT' && r.hs === '40092110', { ketQua: r.ketQua, hs: r.hs, lyDo: r.lyDo });
}
// Ba ca chốt "Loại khác" ĐÚNG lấy từ chính `scripts/bo-kiem-luat.mjs#sinhCaNhom` trên dữ liệu `data/so-tay/` thật —
// mã đúng nằm DƯỚI nút tầng (0105949, 0306149) hoặc thẳng trong phân nhóm (010229). Phép kiểm mới phải cho qua cả ba:
// nếu bản vá chặn luôn nhóm này thì nó đang "chữa" bằng cách tắt tính năng chốt Loại khác, không phải chữa đoán bừa.
for (const [kyVong, pn6, txt] of [
  ['01059499', '010594', 'Loại khác - Gà thuộc loài Gallus domesticus, không dùng để nhân giống/gieo trồng, không phải Gà chọi, khối lượng 54kg'],
  ['01022990', '010229', 'Gia súc - Loại khác, không phải đực'],
  ['03061499', '030614', 'Đông lạnh - Cua, ghẹ, không phải Ghẹ (thuộc họ Portunidae), không phải Cua hoàng đế/cua vua Alaska (thuộc họ Lithodidae), không phải Cua tuyết (thuộc họ Origoniidae), không phải hun khói'],
]) {
  const r = G.chotDong8({ hs: pn6, productText: txt });
  check(`N3 ${pn6} ca loại trừ ${kyVong}: vẫn LOAI_KHAC ${kyVong} như cũ (bản vá không tắt tính năng)`, r.ketQua === 'LOAI_KHAC' && r.hs === kyVong, { ketQua: r.ketQua, hs: r.hs, lyDo: r.lyDo });
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
