// Cổng ranh giới 6→8 số — vòng 7 (#577, sau soát L1-4c đợt 4 #711). Mỗi mục kèm test đỏ trước.
//   A. `cong3-liet-ke-trong-mot-chuoi` mở rộng tới " và " (liệt kê tên hàng nối "và" gói một chuỗi — 392620, 845290, 851762).
//   B. giá trị chứa "tương tự"/"similar" không phủ vế mở — `cong5-gia-tri-tuong-tu` (950300 .10 "đồ chơi tương tự có bánh").
//   C. op TUONG_TU (quyết định GĐ): vế mở "X, Y và các loại tương tự" — hàng nêu tên THOẢ, hàng chỉ "tương tự" ⇒ CHƯA BIẾT (hỏi),
//      không bao giờ TRÁI vì khác tên; cổng 2 cảnh báo `cong2-tuong-tu-chua-chot`, không cần chongLanTruc.
// Chỉ đọc bản nháp ĐÔNG CỨNG (scripts/fixtures/ho-so/ranh-gioi-e9e0d9d/, main e9e0d9d sau #711) và spec đông cứng
// (scripts/fixtures/ho-so/spec-vong-7/) — KHÔNG đọc bản nháp sống của data/ho-so; không đọc data/bench/, data/oz-export/.
import './test-isolate-data.mjs';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { nhapDongCung } from './fixtures/ho-so/nhap-dong-cung.mjs';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const ML = require('../lib/ho-so/ma-loi.js');
const DK = require('../lib/dieu-kien-so.js');
const D = require('../lib/ho-so/duong-di.js');
const HS = require('../lib/ho-so/index.js');
const GIR = require('../lib/gir.js');
const { doiChieu } = require('../lib/ho-so/doi-chieu.js');
const { docDuKien } = require('../lib/ho-so/doc-du-kien.js');
const { loadSoTay } = require('../lib/so-tay-gates.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x).slice(0, 1200)}`); } };
const co = (ds, tien) => (ds || []).some((l) => l.startsWith(tien));
const docMd = (p) => fs.readFileSync(path.join('docs', 'giao-viec', 'so-tay', p), 'utf8');
const DE9 = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-e9e0d9d');
const nhapE9 = (pn6) => nhapDongCung(pn6, DE9);
const specV7 = (pn6) => JSON.parse(fs.readFileSync(path.join('scripts', 'fixtures', 'ho-so', 'spec-vong-7', `${pn6}.json`), 'utf8'));
const tuSpec = (pn6) => { const r = C.apSpec(specV7(pn6)); if (!r.banNhap) throw new Error(`spec ${pn6}: ${r.loi.join(' | ')}`); return r.banNhap; };
const TEN = (v) => ({ fact: 'tenLoai', op: 'TEN_LOAI', value: v });
const TT = (v) => ({ fact: 'tenLoai', op: 'TUONG_TU', value: v });
const lietKe = (r) => r.loi.filter((l) => l.startsWith('cong3-liet-ke-trong-mot-chuoi:'));
const kiemLk = (pn6, b) => lietKe(C.kiemRanhGioi(pn6, b, { cong: [3] }));
const dong = (b, hs) => b.dong8.find((m) => m.hs === hs);

// ════ A. Liệt kê tên hàng nối " và " gói MỘT chuỗi (phát hiện hàng đầu soát đợt 4) ═════════════════════════════════════
{
  const r1 = kiemLk('392620', nhapE9('392620'));
  check('A1 392620 .20 "Miếng đệm và miếng bảo vệ vai" ↔ EN "Shoulder pads or shields" ⇒ lỗi', r1.includes('cong3-liet-ke-trong-mot-chuoi:39262020:tenLoai'), r1);
  const r2 = kiemLk('845290', nhapE9('845290'));
  check('A2 845290 .11/.91 "Thân trên và thân dưới máy" ↔ EN "Arms and beds" ⇒ lỗi cả hai', r2.includes('cong3-liet-ke-trong-mot-chuoi:84529011:tenLoai') && r2.includes('cong3-liet-ke-trong-mot-chuoi:84529091:tenLoai'), r2);
  const r3 = kiemLk('851762', nhapE9('851762'));
  check('A3a 851762 .10 "phát và thu" ↔ EN "Radio transmitters and radio receivers" ⇒ lỗi', r3.includes('cong3-liet-ke-trong-mot-chuoi:85176210:tenLoai'), r3);
  check('A3b … .52 "phát và thu" ↔ EN "Transmission and reception apparatus" (MỘT danh từ ghép) ⇒ KHÔNG lỗi', !r3.includes('cong3-liet-ke-trong-mot-chuoi:85176252:tenLoai'), r3);
  const r4 = kiemLk('950300', nhapE9('950300'));
  check('A4 950300 .91 "bộ đồ chơi tạo chữ và tập nói" ↔ EN "word making and talking sets" (danh từ ghép) ⇒ KHÔNG lỗi', r4.length === 0, r4);
  check('A5a 732690 (DUYET) .30 dungCho "các ống … và phụ kiện ghép nối bằng gang đúc" — "và" sau "for" (đích của MỘT hàng) ⇒ KHÔNG lỗi', kiemLk('732690', nhapE9('732690')).length === 0, kiemLk('732690', nhapE9('732690')));
  check('A5b 853710 (DUYET) .30 "dịch chuyển, xử lý và kẹp giữ" (for transport, handling and storage) ⇒ KHÔNG lỗi', kiemLk('853710', nhapE9('853710')).length === 0, kiemLk('853710', nhapE9('853710')));
  // "kể cả …" (vùng PHU) và danh từ ghép "Control and adaptor units"
  const b6 = nhapE9('851762');
  dong(b6, '85176241').dieuKienSo = [TEN(['Bộ điều chế/giải điều chế', 'loại sử dụng cáp nối và dạng thẻ cắm'])];
  dong(b6, '85176243').dieuKienSo = [TEN('Bộ điều khiển và bộ thích ứng'), ...dong(b6, '85176243').dieuKienSo.filter((c) => c.fact !== 'tenLoai')];
  const r6 = kiemLk('851762', b6);
  check('A6a "và" trong vế "kể cả …" (85176241 "kể cả loại sử dụng cáp nối và dạng thẻ cắm") ⇒ KHÔNG lỗi', !r6.includes('cong3-liet-ke-trong-mot-chuoi:85176241:tenLoai'), r6);
  check('A6b "Bộ điều khiển và bộ thích ứng" ↔ EN "Control and adaptor units" (vế đầu không phải danh từ số nhiều) ⇒ KHÔNG lỗi', !r6.includes('cong3-liet-ke-trong-mot-chuoi:85176243:tenLoai'), r6);
  // trong HOAC + TUONG_TU cũng xét
  const b7 = nhapE9('392620');
  dong(b7, '39262020').dieuKienSo = [{ op: 'HOAC', phuongAn: [[TEN('Miếng đệm và miếng bảo vệ vai')], [{ fact: 'laBoPhan', op: 'CO' }]] }];
  check('A7 giá trị "và" trong phương án HOAC ⇒ vẫn lỗi', kiemLk('392620', b7).includes('cong3-liet-ke-trong-mot-chuoi:39262020:tenLoai'));
  // bản soạn lại (spec vòng 7): mảng chuỗi con ⇒ hết lỗi
  for (const p of ['392620', '845290', '851762']) check(`A8 ${p} soạn lại (mảng chuỗi con) ⇒ không lỗi liệt kê`, kiemLk(p, tuSpec(p)).length === 0, kiemLk(p, tuSpec(p)));
  const g = ML.giaiThich('cong3-liet-ke-trong-mot-chuoi:39262020:tenLoai') || {};
  check('A9 ma-loi: giải thích nhắc liệt kê nối "và" + bằng chứng chữ Anh (ca 392620/845290/851762)', /nối "và"/u.test(g.giaiThich || '') && /Shoulder pads or shields|Arms and beds/u.test(g.giaiThich || ''), g.giaiThich);
}

// ════ B. Giá trị chứa "tương tự"/"similar" không bao giờ phủ vế mở ═══════════════════════════════════════════════════
{
  const r = C.kiemRanhGioi('950300', nhapE9('950300'), { cong: [5] });
  check('B1a 950300 .10 tenLoai "đồ chơi tương tự có bánh" ⇒ lỗi cong5-gia-tri-tuong-tu', r.loi.includes('cong5-gia-tri-tuong-tu:95030010:tenLoai'), r.loi);
  check('B1b … vế mở "và đồ chơi tương tự" không còn được tính là phủ (danh sách trước bị liệt kê đóng) ⇒ cong5-ve-mo-bi-bo', co(r.loi, 'cong5-ve-mo-bi-bo:95030010:'), r.loi);
  const b2 = nhapE9('761699');
  delete b2.chongLanTruc;
  dong(b2, '76169940').dieuKienSo = [TEN('sản phẩm tương tự'), { fact: 'dungCho', op: 'CONG_DUNG', value: 'sợi dệt' }];
  check('B2 761699 .40 tenLoai "sản phẩm tương tự" ⇒ lỗi', C.kiemRanhGioi('761699', b2, { cong: [5] }).loi.includes('cong5-gia-tri-tuong-tu:76169940:tenLoai'));
  const b3 = nhapE9('761699');
  dong(b3, '76169940').dieuKienSo = [TT(['Ống chỉ', 'sản phẩm tương tự']), { fact: 'dungCho', op: 'CONG_DUNG', value: 'sợi dệt' }];
  check('B3 giá trị "tương tự" ngay trong danh sách nêu tên của TUONG_TU cũng lỗi', C.kiemRanhGioi('761699', b3, { cong: [5] }).loi.includes('cong5-gia-tri-tuong-tu:76169940:tenLoai'));
  const g = ML.giaiThich('cong5-gia-tri-tuong-tu:95030010:tenLoai') || {};
  check('B4 ma-loi: giải thích "giá trị chết" + cách sửa trỏ op TUONG_TU', /TUONG_TU/u.test(g.cachSua || '') && /tương tự/u.test(g.giaiThich || ''), g);
}

// ════ C. Op TUONG_TU — lược đồ, máy kiểm trích, bộ chấm ═════════════════════════════════════════════════════════════
const TRICH40 = 'Ống chỉ, lõi suốt, guồng quay tơ và sản phẩm tương tự dùng cho sợi dệt';
{
  check('C1a TUONG_TU là op của kiểu TEN_LOAI (OP_THEO_KIEU, OP_MOI)', DK.OP_THEO_KIEU.TEN_LOAI.includes('TUONG_TU') && DK.OP_MOI.includes('TUONG_TU'));
  check('C1b kiểm: trích có cụm mở + mọi tên nêu nguyên văn ⇒ đạt', DK.kiemDieuKien(TT(['Ống chỉ', 'lõi suốt', 'guồng quay tơ']), TRICH40) === null, DK.kiemDieuKien(TT(['Ống chỉ', 'lõi suốt', 'guồng quay tơ']), TRICH40));
  check('C1c kiểm: trích KHÔNG có "tương tự"/"similar"/"the like" ⇒ lỗi dieu-kien-so-tuong-tu-khong-co-cum-mo', String(DK.kiemDieuKien(TT('Ống chỉ'), 'Ống chỉ, lõi suốt dùng cho sợi dệt')).startsWith('dieu-kien-so-tuong-tu-khong-co-cum-mo'));
  check('C1d kiểm: tên nêu không nguyên văn ⇒ lỗi', String(DK.kiemDieuKien(TT('Ống sợi'), TRICH40)).startsWith('dieu-kien-so-tuong-tu-khong-co-trong-trich'));
  check('C1e kiểm: fact khác tenLoai (nhanHieu) ⇒ lỗi', String(DK.kiemDieuKien({ fact: 'nhanHieu', op: 'TUONG_TU', value: 'Ống chỉ' }, TRICH40)).startsWith('dieu-kien-so-tuong-tu-fact'));
  check('C1f kiểm: TUONG_TU không mang chieu ⇒ lỗi', String(DK.kiemDieuKien({ ...TT('Ống chỉ'), chieu: 'PHAI_KHONG' }, TRICH40)).startsWith('dieu-kien-so-chieu-thua'));
  check('C1g kiểm: TUONG_TU trong HOAC hợp lệ (laHoacCoKieu)', DK.kiemDieuKien({ op: 'HOAC', phuongAn: [[TEN('Ống chỉ')], [TT('Ống chỉ')]] }, TRICH40) === null);

  const c = TT(['Xe đạp ba bánh', 'xe đẩy', 'xe có bàn đạp']);
  const cham = (giaTri, them = {}) => DK.danhGiaDieuKien(c, { fact: 'tenLoai', giaTri, ...them });
  check('C2a tên khớp một hàng nêu tên ("xe đẩy trẻ em") ⇒ THOẢ (không tất định)', cham('xe đẩy trẻ em').trangThai === 'THOA' && cham('xe đẩy trẻ em').tatDinh === false, cham('xe đẩy trẻ em'));
  const r2 = cham('xe chòi chân bốn bánh');
  check('C2b tên khác ("xe chòi chân") ⇒ CHƯA BIẾT, lyDo tuong-tu-chua-chot (KHÔNG BAO GIỜ TRÁI)', r2.trangThai === 'CHUA_BIET' && r2.lyDo === 'tuong-tu-chua-chot', r2);
  check('C2c … kể cả tên rõ là hàng khác ("búp bê") vẫn CHƯA BIẾT', cham('búp bê').trangThai === 'CHUA_BIET');
  const k = DK.khoaTuongTu(c);
  check('C2d khoaTuongTu tất định, mang các tên nêu', typeof k === 'string' && /xe đạp ba bánh/u.test(k) && k === DK.khoaTuongTu(TT(['Xe đạp ba bánh', 'xe đẩy', 'xe có bàn đạp'])), k);
  const yes = cham('xe chòi chân', { tuongTu: { [k]: true } }); const no = cham('xe chòi chân', { tuongTu: { [k]: false } });
  check('C2e trả lời "có tương tự" ⇒ THOẢ, theoTraLoi; "không" ⇒ TRÁI, theoTraLoi', yes.trangThai === 'THOA' && yes.theoTraLoi === true && no.trangThai === 'TRAI' && no.theoTraLoi === true, [yes, no]);
  check('C2f trả lời cho khoá khác không áp ⇒ vẫn CHƯA BIẾT', cham('xe chòi chân', { tuongTu: { 'khác': true } }).trangThai === 'CHUA_BIET');
  check('C2g thiếu dữ kiện tên ⇒ CHƯA BIẾT thieu-du-kien', DK.danhGiaDieuKien(c, null).lyDo === 'thieu-du-kien');
  check('C2h moTaNgan nhắc "tương tự"', /tương tự/u.test(DK.moTaNgan(c)), DK.moTaNgan(c));
}

// ════ C. Cổng: 950300 + 761699 soạn lại bằng TUONG_TU ═══════════════════════════════════════════════════════════════
{
  const b = tuSpec('950300');
  const r = C.kiemRanhGioi('950300', b);
  check('C3a 950300 soạn lại (.10 HOAC tên nêu | TUONG_TU + coBanh | xe của búp bê) ⇒ XANH', r.hopLe === true, r.loi);
  check('C3b … cảnh báo cong2-tuong-tu-chua-chot (vd .10 ↔ .21 "Búp bê": tên của anh em cho .10 CHƯA BIẾT, không THOẢ)', co(r.canhBao, 'cong2-tuong-tu-chua-chot:95030010+95030021'), r.canhBao.filter((x) => x.startsWith('cong2-tuong')));
  check('C3c … không chongLanTruc, không chongLanVanBan', !b.chongLanTruc && !b.chongLanVanBan);
  check('C3d … vế mở "và đồ chơi tương tự" + "có bánh" phủ (cổng 5)', !co(r.loi, 'cong5-'), r.loi);
  // ép đỏ: bỏ coBanh ⇒ vế "có bánh" chưa phủ
  const b2 = tuSpec('950300');
  dong(b2, '95030010').dieuKienSo[0].phuongAn[1] = [TT(['Xe đạp ba bánh', 'xe đẩy', 'xe có bàn đạp'])];
  check('C3e bỏ coBanh ⇒ cong5-ve-gioi-han-bi-bo "có bánh"', co(C.kiemRanhGioi('950300', b2, { cong: [5] }).loi, 'cong5-ve-gioi-han-bi-bo:95030010:có bánh'));

  const b4 = tuSpec('761699');
  const r4 = C.kiemRanhGioi('761699', b4);
  check('C4a 761699 soạn lại (.40 TUONG_TU + dungCho "sợi dệt", bỏ cụm 7 nhánh) ⇒ XANH', r4.hopLe === true, r4.loi);
  check('C4b … không còn cong2-chong-lan-truc / chongLanTruc', !co(r4.loi, 'cong2-chong-lan-truc') && !co(r4.canhBao, 'cong2-chong-lan-truc') && !b4.chongLanTruc, r4.canhBao);
  check('C4c … cảnh báo cong2-tuong-tu-chua-chot cho cặp .40 ↔ anh em nêu tên', co(r4.canhBao, 'cong2-tuong-tu-chua-chot:'), r4.canhBao);
  check('C4d … dòng "Loại khác" .90 tới được (vector trả lời "không tương tự")', !co(r4.loi, 'cong2-dong-khong-toi-duoc'), r4.loi);
  // TUONG_TU không được dùng để che một chồng lấn THẬT: anh em không có tenLoai mà điều kiện tất định trùng ⇒ vẫn lỗi
  const b5 = tuSpec('761699');
  dong(b5, '76169970').dieuKienSo = [{ fact: 'dungCho', op: 'CONG_DUNG', value: 'sợi dệt' }];
  check('C4e anh em chỉ có dungCho "sợi dệt" ⇒ vector "tương tự = có" chồng thật ⇒ vẫn cong2-chong-lan', co(C.kiemRanhGioi('761699', b5, { cong: [2] }).loi, 'cong2-chong-lan:76169940+76169970'), C.kiemRanhGioi('761699', b5, { cong: [2] }).loi);
  const g = ML.giaiThich('cong2-tuong-tu-chua-chot:95030010+95030021') || {};
  check('C4f ma-loi: cong2-tuong-tu-chua-chot là cảnh báo, không DỪNG, nói không khai chongLanTruc', /cảnh báo/u.test(g.giaiThich || '') && !g.dung && /chongLanTruc/u.test(`${g.giaiThich} ${g.cachSua}`), g);
}

// ════ C. Lúc chạy: CHƯA BIẾT ⇒ câu hỏi nêu các tên; trả lời ⇒ chốt; GIR không trích dòng tương tự ═════════════════════
const PHIEN_SOAT = 'https://claude.ai/code/session_TESTV7#soat-v7';
const ban950 = C.duyet(tuSpec('950300'), { phien: PHIEN_SOAT, ngay: '2026-10-31' });
const soTay950 = C.apDung(ban950, loadSoTay('9503'));
const dk = (fact, giaTri, them = {}) => ({ fact, giaTri, nguon: 'KHACH', trangThai: 'DA_CO', bangChung: String(giaTri), ...them });
const KHOA10 = DK.khoaTuongTu(TT(['Xe đạp ba bánh', 'xe đẩy', 'xe có bàn đạp']));
async function hoSo(ma, duKien, st = soTay950) {
  const dd = D.dungDuongDi(ma, 'NHAP', { soTay: st, bangHieuChinh: { muc: [] } });
  const khung = HS.khungHoSo(dd, { duKien });
  return doiChieu(khung, { soTay: st, bangHieuChinh: { muc: [] }, tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: async () => ({ tong: 0, maKhac: [] }) });
}
{
  const scooter = [dk('tenLoai', 'xe chòi chân bốn bánh'), dk('coBanh', true)];
  const kq = (hs, duKien) => DK.doiChieuDong8(hs, duKien, { soTay: soTay950 }).ketQua;
  check('C5a xe chòi chân (có bánh): .10 THIEU (không MAU_THUAN), .99 THIEU — không rơi im lặng sang .99 20%', kq('95030010', scooter) === 'THIEU' && kq('95030099', scooter) === 'THIEU', [kq('95030010', scooter), kq('95030099', scooter)]);
  const co10 = [...scooter.slice(0, 1).map((d) => ({ ...d, tuongTu: { [KHOA10]: true } })), scooter[1]];
  const khong10 = [...scooter.slice(0, 1).map((d) => ({ ...d, tuongTu: { [KHOA10]: false } })), scooter[1]];
  check('C5b trả lời "tương tự = có" ⇒ .10 CO (10%); "không" ⇒ .10 MAU_THUAN, .99 CO', kq('95030010', co10) === 'CO' && kq('95030010', khong10) === 'MAU_THUAN' && kq('95030099', khong10) === 'CO', [kq('95030010', co10), kq('95030010', khong10), kq('95030099', khong10)]);
  const robot = [dk('tenLoai', 'rô bốt đồ chơi'), dk('coBanh', false)];
  check('C5c rô bốt KHÔNG có bánh ⇒ .10 MAU_THUAN (coBanh tất định), .99 CO — không hỏi oan', kq('95030010', robot) === 'MAU_THUAN' && kq('95030099', robot) === 'CO', [kq('95030010', robot), kq('95030099', robot)]);
  check('C5d xe đạp ba bánh (tên nêu, không cần coBanh) ⇒ .10 CO', kq('95030010', [dk('tenLoai', 'xe đạp ba bánh trẻ em')]) === 'CO');

  const h = await hoSo('95030010', scooter);
  const q = h.ketLuan.cauHoi.find((x) => x.loai === 'TUONG_TU');
  check('C6a hồ sơ .10 cho xe chòi chân: THIEU_DU_KIEN + câu hỏi TUONG_TU', h.ketLuan.trangThai === 'THIEU_DU_KIEN' && Boolean(q), h.ketLuan);
  check('C6b … câu hỏi nêu các tên ("Xe đạp ba bánh", "xe đẩy", "xe có bàn đạp") + chữ "tương tự" + khoaTuongTu + tên đã đọc', q && /tương tự/u.test(q.vi) && ['Xe đạp ba bánh', 'xe đẩy', 'xe có bàn đạp'].every((t) => q.vi.includes(t)) && q.khoaTuongTu === KHOA10 && q.tenDaDoc === 'xe chòi chân bốn bánh' && q.zh, q);
  check('C6c … không hỏi lại "tên hàng" chung (tenLoai) khi đã có tên', !h.ketLuan.cauHoi.some((x) => x.fact === 'tenLoai' && x.loai !== 'TUONG_TU'), h.ketLuan.cauHoi.map((x) => x.loai || x.fact));
  const nutGir = (hh) => (hh.canCu?.girRulesApplied || []).flatMap((gg) => (gg.evidence?.ranhGioi || []).map((x) => x.nut));
  check('C6d … không trích GIR cho .10 khi chưa chốt', !nutGir(h).includes('95030010'), nutGir(h));
  const hc = await hoSo('95030010', co10);
  check('C6e trả lời "có" ⇒ .10 CO nhưng KHÔNG thành bằng chứng GIR (theo trả lời, không theo chữ)', hc.duongDiPhapLy.some((e) => e.nut === '95030010' && e.ketQua === 'CO' && e.tuongTuTheoTraLoi === true) && !nutGir(hc).includes('95030010'), { dd: hc.duongDiPhapLy.filter((e) => e.nut === '95030010'), gir: nutGir(hc) });
  const hn = await hoSo('95030010', [dk('tenLoai', 'xe đẩy trẻ em')]);
  check('C6f xe đẩy (tên nêu) ⇒ .10 CO, được trích GIR như thường', hn.duongDiPhapLy.some((e) => e.nut === '95030010' && e.ketQua === 'CO' && !e.tuongTuTheoTraLoi) && nutGir(hn).includes('95030010'), { kl: hn.ketLuan, gir: nutGir(hn) });
  // gir.js: ranh giới có TUONG_TU chưa đối chiếu (ketQua null) không được trích
  const e0 = { nut: '95030010', cap: 8, chieu: 'PHAI_CO', dieuKien: { op: 'HOAC', phuongAn: [[TEN('xe đẩy')], [TT('xe đẩy'), { fact: 'coBanh', op: 'CO' }]] }, ketQua: null, nguon: { nguonLoai: 'CLAUDE_DUYET', ma: 'tax.95030010', trich: 'Xe đạp …' } };
  check('C7 girTuDuongDi: ranh giới có TUONG_TU chưa đối chiếu ⇒ không trích; CO theo trả lời ⇒ không trích', GIR.girTuDuongDi([e0]).determinations.length === 0 && GIR.girTuDuongDi([{ ...e0, ketQua: 'CO', tuongTuTheoTraLoi: true }]).determinations.length === 0 && GIR.girTuDuongDi([{ ...e0, ketQua: 'CO' }]).determinations.length === 1);
  // docDuKien: bên gọi gửi câu trả lời
  const biLoai = [];
  const ds = await docDuKien({ tenHang: 'Xe chòi chân bốn bánh', duKien: [{ fact: 'tenLoai', giaTri: 'xe chòi chân bốn bánh', tuongTu: { [KHOA10]: true } }, { fact: 'tenLoai', giaTri: 'x', tuongTu: { a: 'có' } }] }, {}, { llm: async () => [], biLoai });
  check('C8a docDuKien giữ tuongTu {khoá: boolean} của bên gọi trên tenLoai', ds.some((d) => d.fact === 'tenLoai' && d.tuongTu && d.tuongTu[KHOA10] === true), ds);
  check('C8b … tuongTu sai kiểu (không phải boolean) ⇒ bỏ trường, ghi biLoai', ds.every((d) => !(d.tuongTu && d.tuongTu.a !== undefined)) && biLoai.some((x) => /tuong-tu/u.test(x.lyDo)), { ds, biLoai });
}

// ════ D. Tài liệu ═══════════════════════════════════════════════════════════════════════════════════════════════════
{
  const lc = docMd('LUAT-CHUNG.md'); const qt = docMd('QUY-TRINH-SO-HOA.md'); const st = docMd('SOAT-RANH-GIOI.md');
  check('D1 LUAT-CHUNG: bảng op có TUONG_TU + vòng 7 (và, tương tự, cong2-tuong-tu-chua-chot)', /TUONG_TU/u.test(lc) && /cong5-gia-tri-tuong-tu/u.test(lc) && /cong2-tuong-tu-chua-chot/u.test(lc) && /Vòng 7/u.test(lc));
  check('D2 QUY-TRINH: cách viết vế mở "… và các loại tương tự" bằng TUONG_TU; không chongLanTruc', /TUONG_TU/u.test(qt) && /cong2-tuong-tu-chua-chot/u.test(qt) && /950300/u.test(qt));
  check('D3 SOAT-RANH-GIOI: người soát kiểm TUONG_TU + liệt kê "và"', /TUONG_TU/u.test(st) && /cong2-tuong-tu-chua-chot/u.test(st));
  check('D4 docs/api/ho-so-contract.md: câu hỏi TUONG_TU + trả lời tuongTu', /TUONG_TU/u.test(fs.readFileSync('docs/api/ho-so-contract.md', 'utf8')) && /tuongTu/u.test(fs.readFileSync('docs/api/ho-so-contract.md', 'utf8')));
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
