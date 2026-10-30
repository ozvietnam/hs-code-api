// lib/dieu-kien-so.js — lược đồ dieuKienSo mới theo tu-vung@1 (#573, plan L1-3b) + bộ chấm ranh giới 6→8 số
// trên dữ kiện có kiểu: mỗi dòng 8 số → CO | THIEU | MAU_THUAN | CHUA_SO_HOA (spec hồ sơ §8.1 duongDiPhapLy).
// Fixture sổ tay VIẾT TAY, tiêm qua opts.soTay — không đọc/ghi data/so-tay thật (trừ ca tương thích đọc 7318).
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const DK = require('../lib/dieu-kien-so.js');
const T = require('../lib/hs-tree.js');
const { verifySoTay } = require('../lib/so-tay.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };
const j = (x) => JSON.stringify(x);
const sameSet = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
const fact = (f, giaTri, extra = {}) => ({ fact: f, giaTri, nguon: 'KHACH', trangThai: 'DA_CO', bangChung: String(giaTri), ...extra });

// ── 1. Một điều kiện trên một dữ kiện (danhGiaDieuKien) ──────────────────────────────────────────────────────────
const one = (c, f) => DK.danhGiaDieuKien(c, f ? DK.chuanDuKien([f]).get(f.fact) : null);
{
  const CO = { fact: 'coLuoiBaoVe', op: 'CO' };
  check('CO_KHONG: CO + true → THOA (tất định)', one(CO, fact('coLuoiBaoVe', true)).trangThai === 'THOA' && one(CO, fact('coLuoiBaoVe', true)).tatDinh === true);
  check('CO_KHONG: CO + false → TRAI', one(CO, fact('coLuoiBaoVe', false)).trangThai === 'TRAI');
  check('CO_KHONG: KHONG + false → THOA', one({ fact: 'coLuoiBaoVe', op: 'KHONG' }, fact('coLuoiBaoVe', false)).trangThai === 'THOA');
  check('CO_KHONG: thiếu dữ kiện → CHUA_BIET', one(CO, null).trangThai === 'CHUA_BIET');

  const DL = { fact: 'loaiDongDien', op: 'TRONG', value: ['XOAY_CHIEU'] };
  check('LIET_KE TRONG: giá trị trong danh sách → THOA', one(DL, fact('loaiDongDien', 'XOAY_CHIEU')).trangThai === 'THOA');
  check('LIET_KE TRONG: giá trị hợp lệ ngoài danh sách → TRAI', one(DL, fact('loaiDongDien', 'MOT_CHIEU')).trangThai === 'TRAI');
  check('LIET_KE TRONG: giá trị lạ (ngoài giaTriHopLe) → CHUA_BIET, không đoán', one(DL, fact('loaiDongDien', 'BA_PHA')).trangThai === 'CHUA_BIET');

  const LOI = { fact: 'duongKinhLoi', op: '<=', value: 5, donVi: 'mm' };
  check('SO: 3 mm ≤ 5 mm → THOA', one(LOI, fact('duongKinhLoi', 3, { donVi: 'mm' })).trangThai === 'THOA');
  check('SO: 7 mm → TRAI', one(LOI, fact('duongKinhLoi', 7, { donVi: 'mm' })).trangThai === 'TRAI');
  check('SO: quy đổi đơn vị — 0,3 cm = 3 mm → THOA', one(LOI, fact('duongKinhLoi', 0.3, { donVi: 'cm' })).trangThai === 'THOA');
  check('SO: điều kiện ghi cm, dữ kiện mm — 6 mm ≤ 0,5 cm? → TRAI', one({ ...LOI, value: 0.5, donVi: 'cm' }, fact('duongKinhLoi', 6, { donVi: 'mm' })).trangThai === 'TRAI');
  check('SO: dữ kiện "không quá 5 mm" (op ≤) trên điều kiện ≤ 5 → THOA', one(LOI, fact('duongKinhLoi', 5, { donVi: 'mm', op: '<=' })).trangThai === 'THOA');
  check('SO: dữ kiện "không quá 8 mm" trên điều kiện ≤ 5 → CHUA_BIET (khoảng vắt ngang biên)', one(LOI, fact('duongKinhLoi', 8, { donVi: 'mm', op: '<=' })).trangThai === 'CHUA_BIET');
  check('SO: dữ kiện "trên 5 mm" trên điều kiện ≤ 5 → TRAI', one(LOI, fact('duongKinhLoi', 5, { donVi: 'mm', op: '>' })).trangThai === 'TRAI');
  check('SO: khoảng 4–6 mm trên điều kiện ≤ 5 → CHUA_BIET', one(LOI, fact('duongKinhLoi', 4, { donVi: 'mm', cacGiaTri: [4, 6] })).trangThai === 'CHUA_BIET');
  check('SO: biên chặt — 5 mm trên điều kiện < 5 → TRAI; trên > 5 → TRAI', one({ ...LOI, op: '<' }, fact('duongKinhLoi', 5, { donVi: 'mm' })).trangThai === 'TRAI' && one({ ...LOI, op: '>' }, fact('duongKinhLoi', 5, { donVi: 'mm' })).trangThai === 'TRAI');
  check('SO: đơn vị dữ kiện lệch hệ (kg cho đường kính) → CHUA_BIET', one(LOI, fact('duongKinhLoi', 3, { donVi: 'kg' })).trangThai === 'CHUA_BIET');

  const LA = { fact: 'chatLieu', op: 'LA', value: 'plastic', viTri: 'CACH_DIEN' };
  check('LA theo vị trí: cách điện plastic → THOA', one(LA, fact('chatLieu', [{ viTri: 'CACH_DIEN', chatLieu: 'plastic' }])).trangThai === 'THOA');
  check('LA theo vị trí: cách điện cao su → TRAI', one(LA, fact('chatLieu', [{ viTri: 'CACH_DIEN', chatLieu: 'cao su' }])).trangThai === 'TRAI');
  check('LA theo vị trí: chỉ biết chất liệu CHÍNH (lõi đồng) → CHUA_BIET ở vị trí cách điện', one(LA, fact('chatLieu', [{ viTri: 'CHINH', chatLieu: 'đồng' }])).trangThai === 'CHUA_BIET');
  check('LA nhiều giá trị (cao su, plastic hoặc giấy): giấy → THOA', one({ ...LA, value: ['cao su', 'plastic', 'giấy'] }, fact('chatLieu', [{ viTri: 'CACH_DIEN', chatLieu: 'giấy' }])).trangThai === 'THOA');
  check('LA cha–con: "inox" thuộc "kim loại" → THOA; dữ kiện chung "kim loại" trên điều kiện "đồng" → CHUA_BIET',
    one({ fact: 'chatLieu', op: 'LA', value: 'kim loại' }, fact('chatLieu', [{ viTri: 'CHINH', chatLieu: 'thép không gỉ' }])).trangThai === 'THOA'
    && one({ fact: 'chatLieu', op: 'LA', value: 'đồng' }, fact('chatLieu', [{ viTri: 'CHINH', chatLieu: 'kim loại' }])).trangThai === 'CHUA_BIET');

  const TL = { fact: 'tenLoai', op: 'TEN_LOAI', value: ['quạt bàn', 'quạt dạng hộp'] };
  check('TEN_LOAI: "quạt bàn mini" chứa đủ chữ của một phương án → THOA (không tất định)', one(TL, fact('tenLoai', 'quạt bàn mini')).trangThai === 'THOA' && one(TL, fact('tenLoai', 'quạt bàn mini')).tatDinh === false);
  check('TEN_LOAI: "quạt treo tường" khác mọi phương án → TRAI (không tất định)', one(TL, fact('tenLoai', 'quạt treo tường')).trangThai === 'TRAI' && one(TL, fact('tenLoai', 'quạt treo tường')).tatDinh === false);
  check('TEN_LOAI: "quạt" (chung hơn tên dòng) → CHUA_BIET', one(TL, fact('tenLoai', 'quạt')).trangThai === 'CHUA_BIET');
  check('TEN_LOAI: dữ kiện tiếng Anh/Trung không so được với tên tiếng Việt → CHUA_BIET', one(TL, fact('tenLoai', 'wall fan')).trangThai === 'CHUA_BIET' && one(TL, fact('tenLoai', '壁扇')).trangThai === 'CHUA_BIET');

  const CD = { fact: 'dungCho', op: 'CONG_DUNG', value: 'xe có động cơ', chieu: 'PHAI_KHONG' };
  check('CONG_DUNG + chieu PHAI_KHONG: hàng dùng cho xe có động cơ → TRAI', one(CD, fact('dungCho', 'xe có động cơ loại nhỏ')).trangThai === 'TRAI');
  check('CONG_DUNG + chieu PHAI_KHONG: dùng cho máy khâu → THOA', one(CD, fact('dungCho', 'máy khâu gia đình')).trangThai === 'THOA');
}

// ── 2. Nhãn nguồn của dữ kiện: AI_CHUA_KIEM không vào quyết định; dữ kiện trái nhau → không dùng ─────────────────
{
  const m = DK.chuanDuKien([fact('coLuoiBaoVe', true, { nguon: 'AI_CHUA_KIEM' }), fact('coCamera', true, { trangThai: 'CHUA_BIET' })]);
  check('dữ kiện AI_CHUA_KIEM / CHUA_BIET bị bỏ (chỉ làm câu hỏi)', !m.has('coLuoiBaoVe') && !m.has('coCamera'));
  const m2 = DK.chuanDuKien([fact('coLuoiBaoVe', true), fact('coLuoiBaoVe', false, { nguon: 'NSX' })]);
  check('hai dữ kiện trái nhau cùng khoá → xungDot, chấm CHUA_BIET', m2.get('coLuoiBaoVe')?.xungDot === true && DK.danhGiaDieuKien({ fact: 'coLuoiBaoVe', op: 'CO' }, m2.get('coLuoiBaoVe')).trangThai === 'CHUA_BIET');
  const m3 = DK.chuanDuKien([fact('chatLieu', [{ viTri: 'CHINH', chatLieu: 'đồng' }]), fact('chatLieu', [{ viTri: 'CACH_DIEN', chatLieu: 'plastic' }])]);
  check('chatLieu nhiều mục (khác vị trí) → gộp', (m3.get('chatLieu')?.giaTri || []).length === 2);
  check('SUY_RA được dùng', DK.chuanDuKien([fact('coLuoiBaoVe', true, { trangThai: 'SUY_RA', nguon: 'SUY_RA' })]).has('coLuoiBaoVe'));
}

// ── 3. Đọc từ chữ (danhGiaTuChu — đường chotDong8) ─────────────────────────────────────────────────────────────
{
  const CO = { fact: 'daGanDauNoi', op: 'CO' };
  check('chữ "không có đầu nối" trên op CO → TRAI', DK.danhGiaTuChu(CO, 'Dây cáp điện không có đầu nối, dài 1m').trangThai === 'TRAI');
  check('chữ "đã gắn đầu nối Type-C" trên op CO → THOA', DK.danhGiaTuChu(CO, 'cáp đã gắn đầu nối Type-C').trangThai === 'THOA');
  check('chữ không nói gì về đầu nối → CHUA_BIET', DK.danhGiaTuChu(CO, 'Dây cáp điện bọc PVC').trangThai === 'CHUA_BIET');
  const r = DK.danhGiaTuChu({ fact: 'dienAp', op: '<=', value: 80, donVi: 'V' }, 'Cáp tín hiệu, điện áp 220V');
  check('chữ "điện áp 220V" trên ≤ 80 V → TRAI, kèm giá trị đọc được', r.trangThai === 'TRAI' && j(r.giaTriDocDuoc).includes('220'), j(r));
}

// ── 4. Máy kiểm điều kiện có kiểu (kiemDieuKien) ──────────────────────────────────────────────────────────────
{
  const K = (c, trich) => DK.kiemDieuKien(c, trich);
  check('kiểm: CO có chữ trong trích → hợp lệ', K({ fact: 'coLuoiBaoVe', op: 'CO' }, 'Có lưới bảo vệ') === null);
  check('kiểm: CO không có chữ trong trích → dieu-kien-so-co-khong-co-trong-trich', String(K({ fact: 'coLuoiBaoVe', op: 'CO' }, 'Quạt bàn và quạt dạng hộp')).startsWith('dieu-kien-so-co-khong-co-trong-trich'));
  check('kiểm: KHONG không có chữ trong trích → dieu-kien-so-khong-khong-co-trong-trich', String(K({ fact: 'daGanDauNoi', op: 'KHONG' }, 'Ống thép hàn')).startsWith('dieu-kien-so-khong-khong-co-trong-trich'));
  check('kiểm: fact không có trong tu-vung@1 → lỗi', String(K({ fact: 'coLuoiChongMuoi', op: 'CO' }, 'Có lưới bảo vệ')).startsWith('dieu-kien-so-fact-khong-co-trong-tu-vung'));
  check('kiểm: op sai kiểu (TRONG trên khoá CO_KHONG) → lỗi', String(K({ fact: 'coLuoiBaoVe', op: 'TRONG', value: ['CO'] }, 'Có lưới bảo vệ')).startsWith('dieu-kien-so-op-sai-kieu'));
  check('kiểm: TRONG giá trị ngoài giaTriHopLe → lỗi', K({ fact: 'loaiDongDien', op: 'TRONG', value: ['BA_PHA'] }, 'dùng điện xoay chiều') === 'dieu-kien-so-trong-gia-tri-ngoai-danh-sach:BA_PHA');
  check('kiểm: TRONG giá trị không có chữ trong trích → lỗi', K({ fact: 'loaiDongDien', op: 'TRONG', value: ['MOT_CHIEU'] }, 'Máy hàn hồ quang dùng điện xoay chiều, kiểu biến thế') === 'dieu-kien-so-trong-khong-co-trong-trich:MOT_CHIEU');
  check('kiểm: TRONG rỗng → lỗi', String(K({ fact: 'loaiDongDien', op: 'TRONG', value: [] }, 'xoay chiều')).startsWith('dieu-kien-so-trong-'));
  check('kiểm: TEN_LOAI có nguyên văn → hợp lệ; không có → lỗi', K({ fact: 'tenLoai', op: 'TEN_LOAI', value: ['quạt bàn', 'quạt dạng hộp'] }, 'Quạt bàn và quạt dạng hộp') === null
    && String(K({ fact: 'tenLoai', op: 'TEN_LOAI', value: 'quạt trần' }, 'Quạt bàn và quạt dạng hộp')).startsWith('dieu-kien-so-ten-loai-khong-co-trong-trich'));
  check('kiểm: CONG_DUNG có nguyên văn → hợp lệ', K({ fact: 'dungCho', op: 'CONG_DUNG', value: 'xe thuộc nhóm 87.02, 87.03, 87.04 hoặc 87.11' }, 'Cho xe thuộc nhóm 87.02, 87.03, 87.04 hoặc 87.11') === null);
  check('kiểm: SO trên khoá tu-vung — số + đơn vị có trong trích → hợp lệ; đơn vị lệch hệ → lỗi; số không có → lỗi',
    K({ fact: 'duongKinhLoi', op: '<=', value: 5, donVi: 'mm' }, 'mỗi lõi có đường kính không quá 5 mm') === null
    && K({ fact: 'duongKinhLoi', op: '<=', value: 5, donVi: 'kg' }, 'mỗi lõi có đường kính không quá 5 kg') === 'dieu-kien-so-don-vi-lech-he:kg'
    && K({ fact: 'duongKinhLoi', op: '<=', value: 6, donVi: 'mm' }, 'mỗi lõi có đường kính không quá 5 mm') === 'dieu-kien-so-nguong-khong-co-trong-trich:6');
  check('kiểm: số kiểu Việt "1.000 V" khớp value 1000', K({ fact: 'dienAp', op: '<=', value: 1000, donVi: 'V' }, 'điện áp trên 80 V nhưng không quá 1.000 V') === null);
  check('kiểm: SO op lạ (CO) → lỗi', String(K({ fact: 'duongKinhLoi', op: 'CO' }, '5 mm')).startsWith('dieu-kien-so-op-sai-kieu'));
  check('kiểm: LA có kiểu — vị trí lạ → lỗi; vật liệu không có trong trích → lỗi; vị trí không có chữ → lỗi',
    String(K({ fact: 'chatLieu', op: 'LA', value: 'plastic', viTri: 'DAY' }, 'cách điện bằng plastic')).startsWith('dieu-kien-so-la-vi-tri-khong-hop-le')
    && K({ fact: 'chatLieu', op: 'LA', value: 'cao su', viTri: 'CACH_DIEN' }, 'Cáp điện cách điện bằng plastic') === 'dieu-kien-so-la-khong-co-trong-trich:cao su'
    && String(K({ fact: 'chatLieu', op: 'LA', value: 'plastic', viTri: 'VO' }, 'Cáp điện cách điện bằng plastic')).startsWith('dieu-kien-so-la-vi-tri-khong-co-trong-trich'));
  check('kiểm: chieu PHAI_KHONG trên CO_KHONG / SO → thừa (dùng KHONG / đảo op)', String(K({ fact: 'coLuoiBaoVe', op: 'CO', chieu: 'PHAI_KHONG' }, 'Có lưới bảo vệ')).startsWith('dieu-kien-so-chieu-thua')
    && String(K({ fact: 'duongKinhLoi', op: '<=', value: 5, donVi: 'mm', chieu: 'PHAI_KHONG' }, 'không quá 5 mm')).startsWith('dieu-kien-so-chieu-thua'));
  check('kiểm: chieu lạ → lỗi', String(K({ fact: 'dungCho', op: 'CONG_DUNG', value: 'xe', chieu: 'CO_THE' }, 'cho xe')).startsWith('dieu-kien-so-chieu-khong-hop-le'));
}

// ── 5. Fixture 8414.51 (viết tay): 84145110 tên loại · 8414519 tiêu đề "Loại khác" · 84145191 "Có lưới bảo vệ" · 84145199 ──
const ST8414 = {
  nhom: '8414',
  dong8: [
    { hs: '84145110', dieuKien: 'quạt bàn / quạt dạng hộp', nguon: 'tax.84145110', trich: 'Quạt bàn và quạt dạng hộp', dieuKienSo: [{ fact: 'tenLoai', op: 'TEN_LOAI', value: ['quạt bàn', 'quạt dạng hộp'] }] },
    { hs: '84145191', dieuKien: 'có lưới bảo vệ', nguon: 'tax.84145191', trich: 'Có lưới bảo vệ', dieuKienSo: [{ fact: 'coLuoiBaoVe', op: 'CO' }] },
    { hs: '84145199', dieuKien: 'loại khác', nguon: 'tax.84145199', trich: 'Loại khác' },
  ],
};
{
  const v = verifySoTay(ST8414, '8414');
  check('fixture 8414 qua máy kiểm sổ tay (lược đồ mới hợp lệ)', v.dat === v.tong && v.tong === 3, j(v.loai.map((x) => x.lyDo)));
  const opts = { soTay: ST8414 };
  const dd = DK.duongDiDong8('84145199', opts);
  const phuDinh = dd.nhom.filter((g) => g.chieu === 'PHAI_KHONG').map((g) => g.nut);
  check('Loại khác 84145199: phủ định ĐỦ MỌI TẦNG = loaiKhacOf().truDayDu', sameSet(phuDinh, T.loaiKhacOf('84145199').truDayDu), j(phuDinh));
  const dd91 = DK.duongDiDong8('84145191', opts);
  check('dòng có tên dưới tiêu đề "Loại khác" (84145191): PHAI_CO chính nó + PHAI_KHONG anh em của tiêu đề (84145110)',
    dd91.nhom.some((g) => g.nut === '84145191' && g.chieu === 'PHAI_CO') && dd91.nhom.some((g) => g.nut === '84145110' && g.chieu === 'PHAI_KHONG') && dd91.nhom.length === 2, j(dd91.nhom));

  const F1 = [fact('tenLoai', 'quạt treo tường'), fact('coLuoiBaoVe', true)];
  const r91 = DK.doiChieuDong8('84145191', F1, opts);
  check('quạt treo tường có lưới → 84145191 CO; căn cứ KHÔNG tất định (phủ định tên loại là so chữ)', r91.ketQua === 'CO' && r91.coCanCuTatDinh === false, j(r91));
  check('mục đường đi đúng hình spec §8.1: cap, nut, dieuKien, chieu, nguon{nguonLoai, ma, trich}, ketQua',
    r91.duongDi.every((e) => [8, 7].includes(e.cap) && e.nut && 'dieuKien' in e && ['PHAI_CO', 'PHAI_KHONG'].includes(e.chieu) && e.nguon && 'nguonLoai' in e.nguon && e.nguon.ma && e.nguon.trich && ['CO', 'THIEU', 'MAU_THUAN', 'CHUA_SO_HOA'].includes(e.ketQua)), j(r91.duongDi));
  const r99 = DK.doiChieuDong8('84145199', F1, opts);
  check('… cùng dữ kiện → 84145199 MAU_THUAN tất định (hàng có lưới bảo vệ = thuộc .91)', r99.ketQua === 'MAU_THUAN' && r99.coCanCuTatDinh === true, j(r99));
  const r10 = DK.doiChieuDong8('84145110', F1, opts);
  check('… 84145110 MAU_THUAN (tên loại khác) nhưng không tất định', r10.ketQua === 'MAU_THUAN' && r10.coCanCuTatDinh === false);
  const pn = DK.doiChieuPhanNhom('841451', F1, opts);
  check('doiChieuPhanNhom: đúng một dòng CO = 84145191', j(pn.dongCo) === j(['84145191']) && pn.dong.length === 3, j(pn));

  const F2 = [fact('tenLoai', 'quạt treo tường'), fact('coLuoiBaoVe', false)];
  check('không lưới → 84145199 CO (tất định ở .91, không tất định ở .10); 84145191 MAU_THUAN tất định',
    DK.doiChieuDong8('84145199', F2, opts).ketQua === 'CO' && DK.doiChieuDong8('84145191', F2, opts).ketQua === 'MAU_THUAN' && DK.doiChieuDong8('84145191', F2, opts).coCanCuTatDinh === true);
  const r3 = DK.doiChieuDong8('84145191', [fact('coLuoiBaoVe', true)], opts);
  check('thiếu tên loại → THIEU, kèm câu hỏi từ tu-vung', r3.ketQua === 'THIEU' && r3.thieu.some((t) => t.fact === 'tenLoai' && /loại gì/.test(t.cauHoi)), j(r3));
  check('dữ kiện AI_CHUA_KIEM không vào quyết định → THIEU', DK.doiChieuDong8('84145191', [fact('tenLoai', 'quạt treo tường'), fact('coLuoiBaoVe', true, { nguon: 'AI_CHUA_KIEM' })], opts).ketQua === 'THIEU');
  check('quạt bàn mini → 84145110 CO', DK.doiChieuDong8('84145110', [fact('tenLoai', 'quạt bàn mini')], opts).ketQua === 'CO');

  const chuaSo = { nhom: '8414', dong8: ST8414.dong8.map((d) => (d.hs === '84145191' ? { ...d, dieuKienSo: undefined } : d)) };
  check('anh em chưa số hoá → Loại khác CHUA_SO_HOA; dòng chưa số hoá → CHUA_SO_HOA',
    DK.doiChieuDong8('84145199', F2, { soTay: chuaSo }).ketQua === 'CHUA_SO_HOA' && DK.doiChieuDong8('84145191', F2, { soTay: chuaSo }).ketQua === 'CHUA_SO_HOA');
  check('MAU_THUAN thắng CHUA_SO_HOA (quạt bàn → 84145199 mâu thuẫn dù .91 chưa số hoá)', DK.doiChieuDong8('84145199', [fact('tenLoai', 'quạt bàn')], { soTay: chuaSo }).ketQua === 'MAU_THUAN');
  check('nhóm chưa có sổ tay / mã không có trong cây → CHUA_SO_HOA', DK.doiChieuDong8('84145191', F1, { soTay: null }).ketQua === 'CHUA_SO_HOA' && DK.doiChieuDong8('84145155', F1, opts).ketQua === 'CHUA_SO_HOA');
}

// ── 6. Fixture 8544.42 (viết tay): số + LA theo vị trí + điều kiện TIÊU ĐỀ (dieuKienNut) ──────────────────────────
const ST8544 = {
  nhom: '8544',
  dong8: [
    { hs: '85444294', dieuKien: 'cách điện plastic, lõi ≤ 5 mm', nguon: 'tax.85444294', trich: 'Cáp điện cách điện bằng plastic, trong đó mỗi lõi có đường kính không quá 5 mm', dieuKienSo: [{ fact: 'chatLieu', op: 'LA', value: 'plastic', viTri: 'CACH_DIEN' }, { fact: 'duongKinhLoi', op: '<=', value: 5, donVi: 'mm' }] },
    { hs: '85444295', dieuKien: 'cách điện plastic, lõi > 5 ≤ 19,5 mm', nguon: 'tax.85444295', trich: 'Cáp điện cách điện bằng plastic, trong đó mỗi lõi có đường kính trên 5 mm nhưng không quá 19,5 mm', dieuKienSo: [{ fact: 'chatLieu', op: 'LA', value: 'plastic', viTri: 'CACH_DIEN' }, { fact: 'duongKinhLoi', op: '>', value: 5, donVi: 'mm' }, { fact: 'duongKinhLoi', op: '<=', value: 19.5, donVi: 'mm' }] },
    { hs: '85444299', dieuKien: 'loại khác', nguon: 'tax.85444299', trich: 'Loại khác' },
  ],
  dieuKienNut: [
    { id: '8544421', nguon: 'tieuDe.8544421', trich: 'Dùng cho viễn thông, điện áp không quá 80 V', dieuKienSo: [{ fact: 'dungCho', op: 'CONG_DUNG', value: 'viễn thông' }, { fact: 'dienAp', op: '<=', value: 80, donVi: 'V' }] },
    { id: '8544422', nguon: 'tieuDe.8544422', trich: 'Dùng cho viễn thông, điện áp trên 80 V nhưng không quá 1.000 V', dieuKienSo: [{ fact: 'dungCho', op: 'CONG_DUNG', value: 'viễn thông' }, { fact: 'dienAp', op: '>', value: 80, donVi: 'V' }, { fact: 'dienAp', op: '<=', value: 1000, donVi: 'V' }] },
    { id: '8544423', nguon: 'tieuDe.8544423', trich: 'Cáp ắc qui', dieuKienSo: [{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'Cáp ắc qui' }] },
  ],
};
{
  const v = verifySoTay(ST8544, '8544');
  check('fixture 8544 qua máy kiểm sổ tay (dong8 + dieuKienNut, nguồn tieuDe.* từ biểu thuế)', v.dat === v.tong && v.tong === 6 && (v.soTay.dieuKienNut || []).length === 3 && v.soTay.dungTuNguon.includes('tieuDe.8544421'), j(v.loai.map((x) => [x.kind, x.lyDo])));
  const opts = { soTay: ST8544 };
  const base = [fact('chatLieu', [{ viTri: 'CACH_DIEN', chatLieu: 'plastic' }, { viTri: 'LOI', chatLieu: 'đồng' }]), fact('dienAp', 220, { donVi: 'V' }), fact('dungCho', 'máy tính để bàn'), fact('tenLoai', 'dây cáp điện')];
  const r = DK.doiChieuDong8('85444294', [...base, fact('duongKinhLoi', 3, { donVi: 'mm' })], opts);
  check('85444294: plastic + lõi 3 mm + phủ định đủ 3 tiêu đề anh em → CO', r.ketQua === 'CO', j(r.duongDi.map((e) => [e.nut, e.chieu, e.ketQua])));
  check('… tiêu đề 8544421 bị loại bằng điện áp 220 V > 80 V (tất định)', r.duongDi.some((e) => e.nut === '8544421' && e.chieu === 'PHAI_KHONG' && e.ketQua === 'CO' && e.tatDinh === true && e.cap === 7));
  check('85444294: lõi 7 mm → MAU_THUAN tất định', (() => { const x = DK.doiChieuDong8('85444294', [...base, fact('duongKinhLoi', 7, { donVi: 'mm' })], opts); return x.ketQua === 'MAU_THUAN' && x.coCanCuTatDinh === true; })());
  check('85444294: lõi 7 mm → 85444295 CO', DK.doiChieuDong8('85444295', [...base, fact('duongKinhLoi', 7, { donVi: 'mm' })], opts).ketQua === 'CO');
  check('85444294: thiếu đường kính lõi → THIEU + câu hỏi đường kính lõi', (() => { const x = DK.doiChieuDong8('85444294', base, opts); return x.ketQua === 'THIEU' && x.thieu.some((t) => t.fact === 'duongKinhLoi' && /lõi/.test(t.cauHoi)); })());
  check('85444294: cách điện cao su → MAU_THUAN', DK.doiChieuDong8('85444294', [fact('chatLieu', [{ viTri: 'CACH_DIEN', chatLieu: 'cao su' }]), ...base.slice(1), fact('duongKinhLoi', 3, { donVi: 'mm' })], opts).ketQua === 'MAU_THUAN');
  check('85444294: dùng cho viễn thông, 48 V → MAU_THUAN (hàng thuộc tiêu đề 8544421)', DK.doiChieuDong8('85444294', [base[0], fact('dienAp', 48, { donVi: 'V' }), fact('dungCho', 'viễn thông'), base[3], fact('duongKinhLoi', 3, { donVi: 'mm' })], opts).ketQua === 'MAU_THUAN');

  const lk = DK.duongDiDong8('85444299', opts);
  check('Loại khác 85444299: phủ định đủ mọi tầng = truDayDu (91, 92, 94–97 + tiêu đề 8544421/22/23)', sameSet(lk.nhom.filter((g) => g.chieu === 'PHAI_KHONG').map((g) => g.nut), T.loaiKhacOf('85444299').truDayDu));
  check('85444299: anh em 91/92/96/97 chưa số hoá → CHUA_SO_HOA', DK.doiChieuDong8('85444299', [...base, fact('duongKinhLoi', 25, { donVi: 'mm' })], opts).ketQua === 'CHUA_SO_HOA');
  check('85444299: hàng thoả 85444294 → MAU_THUAN (thắng CHUA_SO_HOA)', DK.doiChieuDong8('85444299', [...base, fact('duongKinhLoi', 3, { donVi: 'mm' })], opts).ketQua === 'MAU_THUAN');

  // Loại khác dưới tiêu đề CÓ TÊN (8544421 "Dùng cho viễn thông, điện áp không quá 80 V"): phủ định trong tiêu đề + PHAI_CO tiêu đề
  const d19 = DK.duongDiDong8('85444219', opts);
  check('85444219: phủ định 85444211/13 trong tiêu đề, PHAI_CO tiêu đề có tên 8544421, KHÔNG phủ định 8544422/23/29 (khác truDayDu — tiêu đề có tên biểu thuế)',
    sameSet(d19.nhom.filter((g) => g.chieu === 'PHAI_KHONG').map((g) => g.nut), ['85444211', '85444213']) && d19.nhom.some((g) => g.nut === '8544421' && g.chieu === 'PHAI_CO'), j(d19.nhom.map((g) => [g.nut, g.chieu])));
  const d11 = DK.duongDiDong8('85444211', { soTay: { nhom: '8544', dong8: [] } });
  check('tiêu đề có tên chưa có dieuKienNut → CHUA_SO_HOA', DK.doiChieuDong8('85444211', base, { soTay: { nhom: '8544', dong8: [] } }).ketQua === 'CHUA_SO_HOA' && d11.nhom.some((g) => g.nut === '8544421' && g.dieuKien === null));
}

// ── 7. Tương thích: điều kiện CŨ (fact snake_case) chấm được trên dữ kiện có kiểu qua anh-xa-cu ─────────────────────
{
  // data/so-tay/7318.json thật: 73181510 duong_kinh <= 16 mm (định dạng cũ), 73181590 Loại khác
  const r = DK.doiChieuDong8('73181510', [fact('duongKinh', 8, { donVi: 'mm' })]);
  check('điều kiện cũ duong_kinh ≤ 16 mm + dữ kiện duongKinh 8 mm (anh-xa-cu) → CO', r.ketQua === 'CO', j(r));
  check('… 20 mm → MAU_THUAN; 73181590 (Loại khác) CO', DK.doiChieuDong8('73181510', [fact('duongKinh', 20, { donVi: 'mm' })]).ketQua === 'MAU_THUAN' && DK.doiChieuDong8('73181590', [fact('duongKinh', 20, { donVi: 'mm' })]).ketQua === 'CO');
  check('fact cũ chưa ánh xạ (be_day) → CHUA_BIET, lý do fact-cu-chua-anh-xa', DK.danhGiaDieuKien({ fact: 'be_day', op: '>', value: 2, donVi: 'mm' }, null).lyDo === 'fact-cu-chua-anh-xa');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
