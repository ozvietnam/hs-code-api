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
  // OZV-2013: "bằng plastic" không nhận hàng nhựa+kim loại cùng vị trí CHÍNH (AR3000-03).
  check('LA hỗn hợp cùng vị trí: nhựa+nhôm trên "bằng plastic" → TRAI (không THOA)',
    one({ fact: 'chatLieu', op: 'LA', value: 'plastic' }, fact('chatLieu', [{ viTri: 'CHINH', chatLieu: 'plastic' }, { viTri: 'CHINH', chatLieu: 'nhôm' }])).trangThai === 'TRAI'
    && one({ fact: 'chatLieu', op: 'LA', value: 'plastic' }, fact('chatLieu', [{ viTri: 'CHINH', chatLieu: 'plastic' }, { viTri: 'CHINH', chatLieu: 'nhôm' }])).lyDo === 'chat-lieu-hon-hop');
  check('LA hỗn hợp: chỉ plastic vẫn THOA; nhựa ở cách điện + nhôm CHÍNH không làm hỏng LA plastic cách điện',
    one({ fact: 'chatLieu', op: 'LA', value: 'plastic' }, fact('chatLieu', [{ viTri: 'CHINH', chatLieu: 'plastic' }])).trangThai === 'THOA'
    && one({ fact: 'chatLieu', op: 'LA', value: 'plastic', viTri: 'CACH_DIEN' }, fact('chatLieu', [{ viTri: 'CACH_DIEN', chatLieu: 'plastic' }, { viTri: 'CHINH', chatLieu: 'nhôm' }])).trangThai === 'THOA');

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

// ── 8. #583: tiêu đề bị lược tên ≠ "Loại khác"; anh em là tiêu đề "Loại khác" trần thì bỏ qua (như dòng LK trần) ──
{
  const fs = await import('fs');
  // (a) Tên lấy lại được thì cây đã dùng: mọi tiêu đề còn thiếu tên KHÔNG có tên KHOP_TAP trong ten-nut.json.
  const ver = fs.readdirSync('data/bieu-thue').filter((d) => /^\d{4}\.\d{2}\.\d{2}$/.test(d)).sort().pop();
  const tenNut = JSON.parse(fs.readFileSync(`data/bieu-thue/${ver}/ten-nut.json`, 'utf8')).ten;
  const thieuTen = [...T.tree().nodes.values()].filter((n) => typeof n.cap === 'string' && n.cap !== 'PHAN' && !n.tenVi);
  const layDuoc = thieuTen.filter((n) => tenNut[n.id]?.doTinCay === 'KHOP_TAP').map((n) => n.id);
  check('8a mọi tên tiêu đề KHOP_TAP của ten-nut.json đã vào cây (tiêu đề còn thiếu tên = không lấy lại được)', thieuTen.length > 0 && layDuoc.length === 0, j(layDuoc.slice(0, 10)));
  check('8b 8481801 chỉ khớp TIỀN TỐ trong biểu thuế (một nút chữ số gộp hai tiêu đề thật) → vẫn thiếu tên, có tenViNghi',
    !T.tree().nodes.get('8481801').tenVi && T.tree().nodes.get('8481801').tenViNghi === 'Van dùng cho lốp không săm' && tenNut['8481801'].doTinCay === 'TIEN_TO');

  // (b) Tiêu đề bị lược tên trên đường đi → CHUA_SO_HOA, lý do tường minh; KHÔNG phủ định anh em của nó như "Loại khác".
  const ST8481 = { nhom: '8481', dong8: [{ hs: '84818011', nguon: 'tax.84818011', trich: 'Bằng đồng hoặc hợp kim đồng', dieuKienSo: [{ fact: 'chatLieu', op: 'LA', value: 'đồng' }] }] };
  // #606: 8481801 là nhóm chữ số không có dòng biểu thuế ⇒ trong suốt (mặc định). Luật "tiêu đề bị lược tên" vẫn phải đúng khi
  // không làm trong suốt được (thiếu biểu thuế): tắt trong suốt để kiểm luật đó, rồi bật lại và kiểm đường đi mới.
  T.datTrongSuot(false);
  const d11 = DK.duongDiDong8('84818011', { soTay: ST8481 });
  const g801 = d11.nhom.find((g) => g.nut === '8481801');
  check('8c 84818011: tiêu đề lược tên 8481801 → nhóm PHAI_CO, dieuKien null, lyDo tieu-de-bi-luoc-ten', g801 && g801.chieu === 'PHAI_CO' && g801.dieuKien === null && g801.lyDo === 'tieu-de-bi-luoc-ten', j(d11.nhom));
  check('8d … không phủ định anh em của tiêu đề lược tên (8481802, 84818030…)', !d11.nhom.some((g) => g.chieu === 'PHAI_KHONG'), j(d11.nhom.map((g) => [g.nut, g.chieu])));
  const r11 = DK.doiChieuDong8('84818011', [fact('chatLieu', [{ viTri: 'CHINH', chatLieu: 'đồng' }])], { soTay: ST8481 });
  check('8e … doiChieuDong8 → CHUA_SO_HOA, mục đường đi mang lyDo tieu-de-bi-luoc-ten', r11.ketQua === 'CHUA_SO_HOA' && r11.duongDi.some((e) => e.nut === '8481801' && e.ketQua === 'CHUA_SO_HOA' && e.lyDo === 'tieu-de-bi-luoc-ten'), j(r11.duongDi));
  // Tiêu đề lược tên là ANH EM của dòng Loại khác (84818030 là anh em của 8481801/06/07/08/09): ghi lý do, không âm thầm.
  const d30 = DK.duongDiDong8('84818049', { soTay: ST8481 });
  check('8f tên tiêu đề có trong ten-nut KHOP_TAP (8481804) → nút có tên, PHAI_CO', d30.nhom.some((g) => g.nut === '8481804' && g.chieu === 'PHAI_CO' && !g.lyDo), j(d30.nhom));
  T.datTrongSuot(true);
  const d11b = DK.duongDiDong8('84818011', { soTay: ST8481 });
  check('8f2 (trong suốt — mặc định) 84818011 đi qua tầng r14535 "Van dùng cho săm", không còn nhóm 8481801 / lyDo tieu-de-bi-luoc-ten',
    !d11b.nhom.some((g) => g.nut === '8481801' || g.lyDo === 'tieu-de-bi-luoc-ten') && d11b.nhom.some((g) => g.nut === '848180~r14535' && g.chieu === 'PHAI_CO'), j(d11b.nhom));

  // (c) Anh em là tiêu đề "Loại khác" TRẦN, duy nhất phần còn lại của tầng → bỏ qua (phủ định vòng tròn, không có nội dung).
  const ST8536 = {
    nhom: '8536',
    dong8: [
      { hs: '85364110', nguon: 'tax.85364110', trich: 'Rơ le kỹ thuật số', dieuKienSo: [{ fact: 'loaiRoLe', op: 'TRONG', value: ['KY_THUAT_SO'] }] },
      { hs: '85364120', nguon: 'tax.85364120', trich: 'Của loại sử dụng trong các thiết bị sóng vô tuyến', dieuKienSo: [{ fact: 'dungCho', op: 'CONG_DUNG', value: 'thiết bị sóng vô tuyến' }] },
      { hs: '85364130', nguon: 'tax.85364130', trich: 'Của loại sử dụng cho quạt điện', dieuKienSo: [{ fact: 'dungCho', op: 'CONG_DUNG', value: 'quạt điện' }] },
      { hs: '85364140', nguon: 'tax.85364140', trich: 'Loại khác, dòng điện dưới 16 A', dieuKienSo: [{ fact: 'dongDien', op: '<', value: 16, donVi: 'A' }] },
      { hs: '85364191', nguon: 'tax.85364191', trich: 'Rơ le bán dẫn hoặc rơ le điện từ, điện áp không quá 28 V', dieuKienSo: [{ fact: 'loaiRoLe', op: 'TRONG', value: ['BAN_DAN', 'DIEN_TU'] }, { fact: 'dienAp', op: '<=', value: 28, donVi: 'V' }] },
      { hs: '85364199', nguon: 'tax.85364199', trich: 'Loại khác' },
    ],
  };
  const d40 = DK.duongDiDong8('85364140', { soTay: ST8536 });
  check('8g 85364140: bỏ qua anh em 8536419 (tiêu đề "Loại khác" trần, duy nhất phần còn lại của tầng)', !d40.nhom.some((g) => g.nut === '8536419') && sameSet(d40.nhom.filter((g) => g.chieu === 'PHAI_KHONG').map((g) => g.nut), ['85364110', '85364120', '85364130']), j(d40.nhom.map((g) => [g.nut, g.chieu])));
  const F40 = [fact('loaiRoLe', 'DIEN_TU'), fact('dungCho', 'máy giặt'), fact('dongDien', 10, { donVi: 'A' })];
  check('8h … rơ le điện từ cho máy giặt, 10 A → 85364140 CO (trước đây CHUA_SO_HOA vĩnh viễn)', DK.doiChieuDong8('85364140', F40, { soTay: ST8536 }).ketQua === 'CO');
  check('8i … 20 A → 85364140 MAU_THUAN tất định', (() => { const x = DK.doiChieuDong8('85364140', [...F40.slice(0, 2), fact('dongDien', 20, { donVi: 'A' })], { soTay: ST8536 }); return x.ketQua === 'MAU_THUAN' && x.coCanCuTatDinh === true; })());

  // (d) Tầng có HAI "phần còn lại" trần mà một là tiêu đề → cây đã lược một tầng có tên → CHUA_SO_HOA lý do tang-bi-luoc.
  //     841459 (8414594 + 8414599) trước đây là ví dụ; nay lớp tầng đã dựng lại tầng "Công suất không quá 125 kW" (r13180) /
  //     "Loại khác" (r13187) nên không còn (#577 tầng không mã). 9849348 (98493481 + r19784) cũng hết từ #606 (9849348 là nhóm
  //     chữ số không tên, trong suốt). 98493529 cũng hết từ lô 7 (#1109).
  const d41 = DK.duongDiDong8('84145941', { soTay: { nhom: '8414', dong8: [{ hs: '84145941', nguon: 'tax.84145941', trich: 'Có lưới bảo vệ', dieuKienSo: [{ fact: 'coLuoiBaoVe', op: 'CO' }] }] } });
  check('8j0 84145941: tầng đã dựng lại → không còn tang-bi-luoc, đi qua nút tầng 841459~r13180', !d41.nhom.some((g) => g.lyDo === 'tang-bi-luoc') && d41.nhom.some((g) => g.nut === '841459~r13180'), j(d41.nhom));
  const d81 = DK.duongDiDong8('98493529', { soTay: { nhom: '9849', dong8: [], dieuKienNut: [] } });
  const g99 = d81.nhom.find((g) => g.nut === '984935~r19831');
  // 07/11/2026 (#1109 lô 7): 984935 dựng lại đúng tầng (tiêu đề trước dòng lá đầu + hiệu chỉnh gạch r19818–r19848) ⇒ 98493529 đi
  // qua "Két nước làm mát" r19798/r19797, không còn anh em r19831 "Loại khác" thứ hai. Quét cả biểu: không còn dòng nào mang
  // tang-bi-luoc (luật giữ nguyên để chặn khi biểu mới có lại).
  check('8j 98493529: tầng đã dựng lại → đi qua r19798/r19797, không còn tang-bi-luoc', !g99 && !d81.nhom.some((g) => g.lyDo === 'tang-bi-luoc') && d81.nhom.some((g) => g.nut === '984935~r19798' && g.chieu === 'PHAI_CO'), j(d81.nhom));
  check('8k … doiChieuDong8 → CHUA_SO_HOA dù đủ dữ kiện', DK.doiChieuDong8('84145941', [fact('coLuoiBaoVe', true), fact('tenLoai', 'quạt hút')], { soTay: { nhom: '8414', dong8: [] } }).ketQua === 'CHUA_SO_HOA');
}

// 9. soCoTrongTrich — số thập phân chữ biểu viết thêm 0 cuối (841510 "21,10 kW" = 21.1); không nhận chữ số khác / số dài hơn.
{
  const f = DK.soCoTrongTrich;
  check('9a 21.1 có trong "không quá 21,10 kW"', f(21.1, 'không quá 21,10 kW') === true);
  check('9b 26.3 KHÔNG có trong "26,38 kW"', f(26.3, 'không quá 26,38 kW') === false);
  check('9c 21 KHÔNG có trong "210 kg"', f(21, 'trên 210 kg') === false);
  check('9e 2 có trong "2,0 gam"; 1.5 KHÔNG có trong "1.500 kg"; 2.5 KHÔNG có trong "2.500 cc"', f(2, 'không vượt quá 2,0 gam') && !f(1.5, '1.500 kg') && !f(2.5, '2.500 cc'));
  check('9d 1000 có trong "1.000 kg"; 2.5 có trong "2,50 mm"; 2.5 không có trong "2,501"', f(1000, 'trên 1.000 kg') && f(2.5, '2,50 mm') && !f(2.5, '2,501'));
}

// 10. OZV-1076: boMenhDeKeCa (ngoặc ví dụ), boVeRiengCuaDong, coDieuKienPhanBietCungDong
{
  const { chotDong8 } = require('../lib/so-tay-gates.js');
  const kq2001 = chotDong8({ hs: '200190', productText: 'Loại khác: Hành tây' });
  check('10a 20019010: boVeRiengCuaDong tách vế liệt kê ở nhóm 4 số → chốt 20019010', kq2001.ketQua === 'CHOT' && kq2001.hs === '20019010', j(kq2001));
  const kq8460 = chotDong8({ hs: '846090', productText: 'Loại khác: Hoạt động bằng điện' });
  check('10b 84609010: coDieuKienPhanBietCungDong nhận vế tất định TRONG không trùng anh em → chốt 84609010', kq8460.ketQua === 'CHOT' && kq8460.hs === '84609010', j(kq8460));
  const kq8443 = chotDong8({ hs: '844399', productText: 'Bộ phận và phụ kiện - Loại khác: Hộp mực in đã có mực in' });
  check('10c 84439920: boMenhDeKeCa bỏ ngoặc (ví dụ, ...) và coDieuKienPhanBietCungDong nhận CO → chốt 84439920', kq8443.ketQua === 'CHOT' && kq8443.hs === '84439920', j(kq8443));
  const kq9613 = chotDong8({ hs: '961380', productText: 'Bật lửa khác: Bật lửa châm thuốc lá hoặc bật lửa để bàn, trừ loại bằng plastic' });
  check('10d 96138030: phủ định chất liệu "trừ loại bằng plastic" → chốt 96138030', kq9613.ketQua === 'CHOT' && kq9613.hs === '96138030', j(kq9613));
  const kq8547 = chotDong8({ hs: '854790', productText: 'Ống dẫn dây điện bằng nhựa PVC hoàn toàn' });
  check('10e 85479010: không tách vế cha khi dòng 8 số có ", làm bằng..." để giữ BO_VE vật liệu → không chốt sai 85479010', kq8547.hs !== '85479010', j(kq8547));
}

// 11. OZV-1810: tách vế cha nối bằng "và" (220110, 280920, 32061) + cumPhanBiet cho dòng nguyên văn "Các chế phẩm" / "Các sản phẩm" (320641/42/50, 400690)
{
  const { chotDong8 } = require('../lib/so-tay-gates.js');
  // 220110: Nước khoáng và nước có ga (2 chiều)
  const kq2201a = chotDong8({ hs: '220110', productText: 'Nước khoáng và nước có ga: Nước khoáng' });
  const kq2201b = chotDong8({ hs: '220110', productText: 'Nước khoáng và nước có ga: Nước có ga' });
  const kq2201Thieu = chotDong8({ hs: '220110', productText: 'Nước khoáng và nước có ga' });
  check('11a 22011010/22011020: tách vế cha "Nước khoáng và nước có ga" → chốt đúng từng dòng', kq2201a.ketQua === 'CHOT' && kq2201a.hs === '22011010' && kq2201b.ketQua === 'CHOT' && kq2201b.hs === '22011020', j([kq2201a, kq2201b]));
  check('11a-ngược 220110: chỉ có tiêu đề cha "Nước khoáng và nước có ga" → không tự chốt', kq2201Thieu.ketQua !== 'CHOT' && kq2201Thieu.ketQua !== 'LOAI_KHAC', j(kq2201Thieu));

  // 280920: Axit phosphoric và axit polyphosphoric (2 chiều)
  const kq2809 = chotDong8({ hs: '280920', productText: 'Axit phosphoric và axit polyphosphoric: Loại dùng cho thực phẩm: Axit phosphoric' });
  const kq2809Thieu = chotDong8({ hs: '280920', productText: 'Axit phosphoric và axit polyphosphoric: Loại dùng cho thực phẩm' });
  check('11b 28092032: tách vế cha "Axit phosphoric và axit polyphosphoric" → chốt 28092032', kq2809.ketQua === 'CHOT' && kq2809.hs === '28092032', j(kq2809));
  check('11b-ngược 280920: chỉ có tiêu đề cha + tiêu đề trung gian → không tự chốt', kq2809Thieu.ketQua !== 'CHOT' && kq2809Thieu.ketQua !== 'LOAI_KHAC', j(kq2809Thieu));

  // 320611: Thuốc màu và các chế phẩm từ dioxit titan (2 chiều)
  const kq320611 = chotDong8({ hs: '320611', productText: 'Thuốc màu và các chế phẩm từ dioxit titan - Chứa hàm lượng dioxit titan từ 80% trở lên tính theo trọng lượng khô: Thuốc màu' });
  const kq320611Thieu = chotDong8({ hs: '320611', productText: 'Thuốc màu và các chế phẩm từ dioxit titan - Chứa hàm lượng dioxit titan từ 80% trở lên tính theo trọng lượng khô' });
  check('11c 32061110: tách vế cha 5 số "Thuốc màu và các chế phẩm từ dioxit titan" → chốt 32061110', kq320611.ketQua === 'CHOT' && kq320611.hs === '32061110', j(kq320611));
  check('11c-ngược 320611: chỉ có tiêu đề 5 số + 6 số → không tự chốt', kq320611Thieu.ketQua !== 'CHOT' && kq320611Thieu.ketQua !== 'LOAI_KHAC', j(kq320611Thieu));

  // 32064110 ("Các chế phẩm") & 40069011 ("Các sản phẩm") (2 chiều + chặn dòng có điều kiện phụ 34031911)
  const kq320641 = chotDong8({ hs: '320641', productText: 'Chất màu xanh nước biển và các chế phẩm từ chúng: Các chế phẩm' });
  const kq320641Thieu = chotDong8({ hs: '320641', productText: 'Chất màu xanh nước biển và các chế phẩm từ chúng' });
  const kq400690 = chotDong8({ hs: '400690', productText: 'Loại khác: Của nhựa tự nhiên: Các sản phẩm' });
  const kq400690Thieu = chotDong8({ hs: '400690', productText: 'Loại khác: Của nhựa tự nhiên' });
  const kq340319 = chotDong8({ hs: '340319', productText: 'Loại khác: Các chế phẩm' });
  check('11d 32064110 & 40069011: dòng có tên nguyên văn "Các chế phẩm" / "Các sản phẩm" → chốt đúng', kq320641.ketQua === 'CHOT' && kq320641.hs === '32064110' && kq400690.ketQua === 'CHOT' && kq400690.hs === '40069011', j([kq320641, kq400690]));
  check('11d-ngược 320641 & 400690 & 340319: chỉ có tiêu đề cha hoặc dòng tên dài hơn ("Chế phẩm dùng cho động cơ...") → không tự chốt',
    kq320641Thieu.ketQua !== 'CHOT' && kq320641Thieu.ketQua !== 'LOAI_KHAC'
    && kq400690Thieu.ketQua !== 'CHOT' && kq400690Thieu.ketQua !== 'LOAI_KHAC'
    && kq340319.hs !== '34031911',
    j([kq320641Thieu, kq400690Thieu, kq340319]));

  // ReDoS ~40.000 từ lặp < 2 giây (quy tắc 6b)
  const t0 = Date.now();
  const chuoiDai = `${Array.from({ length: 10000 }, () => 'và nước có').join(' ')}: Các chế phẩm`;
  const kqReDoS = chotDong8({ hs: '320641', productText: chuoiDai });
  const dt = Date.now() - t0;
  check(`11e ReDoS ~40.000 từ lặp chạy dưới 2000ms (thực tế ${dt}ms)`, dt < 2000 && kqReDoS.hs === '32064110', `${dt}ms`);
}

// 12. OZV-1820: tách vế cha "Lúa mì và meslin" (100199) + đọc khoảng số 2 cận có dấu phẩy ", nhưng dưới" (151190 chiSoIot)
{
  const { chotDong8 } = require('../lib/so-tay-gates.js');
  // 100199: Lúa mì và meslin (2 chiều)
  const kq1001a = chotDong8({ hs: '100199', productText: 'Lúa mì và meslin (+). - Loại khác: Thích hợp sử dụng cho người: Meslin (SEN)' });
  const kq1001b = chotDong8({ hs: '100199', productText: 'Lúa mì và meslin (+). - Loại khác: Meslin, không thích hợp sử dụng cho người' });
  const kq1001Thieu = chotDong8({ hs: '100199', productText: 'Lúa mì và meslin (+). - Loại khác: Thích hợp sử dụng cho người' });
  check('12a 10019911/10019991: tách vế cha "Lúa mì và meslin" → chốt đúng Meslin theo tầng sử dụng cho người',
    kq1001a.ketQua === 'CHOT' && kq1001a.hs === '10019911' && kq1001b.ketQua === 'CHOT' && kq1001b.hs === '10019991',
    j([kq1001a, kq1001b]));
  check('12a-ngược 100199: chỉ có tiêu đề cha "Lúa mì và meslin" + tầng trung gian → không tự chốt',
    kq1001Thieu.ketQua !== 'CHOT' && kq1001Thieu.ketQua !== 'LOAI_KHAC',
    j(kq1001Thieu));

  // 151190: chiSoIot khoảng 2 cận có ", nhưng dưới" (2 chiều)
  const kq1511a = chotDong8({ hs: '151190', productText: 'Các phần phân đoạn của dầu tinh chế - Các phần phân đoạn thể rắn: Có chỉ số iốt từ 30 trở lên, nhưng dưới 40' });
  const kq1511b = chotDong8({ hs: '151190', productText: 'Các phần phân đoạn của dầu tinh chế - Các phần phân đoạn thể lỏng: Loại khác, có chỉ số iốt từ 55 trở lên, nhưng dưới 60' });
  const kq1511Ng = chotDong8({ hs: '151190', productText: 'Các phần phân đoạn của dầu tinh chế - Các phần phân đoạn thể rắn: Có chỉ số iốt từ 45 trở lên' });
  check('12b 15119031/15119037: đọc đủ 2 cận chiSoIot qua ", nhưng dưới" → chốt đúng 15119031 và 15119037',
    kq1511a.ketQua === 'CHOT' && kq1511a.hs === '15119031' && kq1511b.ketQua === 'CHOT' && kq1511b.hs === '15119037',
    j([kq1511a, kq1511b]));
  check('12b-ngược 151190: chỉ số iốt ngoài khoảng [30, 40) → không chốt vào 15119031',
    kq1511Ng.hs !== '15119031',
    j(kq1511Ng));

  // ReDoS ~40.000 từ lặp < 2 giây (quy tắc 6b)
  const t0 = Date.now();
  const chuoiDai1820 = `${Array.from({ length: 8000 }, () => 'lúa mì và chỉ số iốt từ 30').join(' ')}, nhưng dưới 40: Meslin`;
  const kqReDoS1820 = DK.danhGiaTuChu({ fact: 'chiSoIot', op: '<', value: 40, donVi: 'IV' }, chuoiDai1820, '15119031');
  const dt = Date.now() - t0;
  check(`12c ReDoS ~40.000 từ lặp chạy dưới 2000ms (thực tế ${dt}ms)`, dt < 2000 && kqReDoS1820.trangThai === 'THOA', `${dt}ms`);
}

// 13. OZV-1830: tách vế cha "và xirô" + gỡ từ riêng đã tách ở vế khác (170230, 170260), danh sách phủ định sau "trừ ... , ... hoặc ..." + "và dạng nhão" (20079910), tách vế trong ngoặc đơn "(rape seeds hoặc colza seeds)" (230641/230649)
{
  const { chotDong8 } = require('../lib/so-tay-gates.js');
  // 170230 & 170260 (2 chiều)
  const kq17023010 = chotDong8({
    hs: '170230',
    productText: 'Glucoza và xirô glucoza, không chứa hoặc có chứa hàm lượng fructoza dưới 20% tính theo khối lượng ở thể khô: Glucoza',
  });
  const kq170230Thieu = chotDong8({
    hs: '170230',
    productText: 'Glucoza và xirô glucoza, không chứa hoặc có chứa hàm lượng fructoza dưới 20% tính theo khối lượng ở thể khô',
  });
  const kq17026010 = chotDong8({
    hs: '170260',
    productText: 'Fructoza và xirô fructoza khác, chứa hàm lượng fructoza trên 50% tính theo khối lượng ở thể khô, trừ đường nghịch chuyển: Fructoza',
  });
  const kq17026020 = chotDong8({
    hs: '170260',
    productText: 'Fructoza và xirô fructoza khác, chứa hàm lượng fructoza trên 50% tính theo khối lượng ở thể khô, trừ đường nghịch chuyển: Xirô fructoza',
  });
  const kq170260Thieu = chotDong8({
    hs: '170260',
    productText: 'Fructoza và xirô fructoza khác, chứa hàm lượng fructoza trên 50% tính theo khối lượng ở thể khô, trừ đường nghịch chuyển',
  });
  check('13a 17023010/17026010/17026020: tách vế cha nối bằng "và xirô" và gỡ từ riêng ở vế khác → chốt đúng',
    kq17023010.ketQua === 'CHOT' && kq17023010.hs === '17023010'
    && kq17026010.ketQua === 'CHOT' && kq17026010.hs === '17026010'
    && kq17026020.ketQua === 'CHOT' && kq17026020.hs === '17026020',
    j([kq17023010, kq17026010, kq17026020]));
  check('13a-ngược 170230 & 170260: chỉ có tiêu đề phân nhóm 6 số → không tự chốt',
    kq170230Thieu.ketQua !== 'CHOT' && kq170230Thieu.ketQua !== 'LOAI_KHAC'
    && kq170260Thieu.ketQua !== 'CHOT' && kq170260Thieu.ketQua !== 'LOAI_KHAC',
    j([kq170230Thieu, kq170260Thieu]));

  // 20079910: Trái cây dạng nhão, trừ xoài, dứa hoặc dâu tây dạng nhão (2 chiều)
  const kq20079910 = chotDong8({
    hs: '200799',
    productText: 'Loại khác - Loại khác: Trái cây dạng nhão, trừ xoài, dứa hoặc dâu tây dạng nhão',
  });
  const kq200799Ng = chotDong8({
    hs: '200799',
    productText: 'Loại khác - Loại khác: Trái cây dạng nhão từ dứa',
  });
  check('13b 20079910: giữ phủ định "trừ xoài, dứa hoặc dâu tây" qua dấu phẩy + tách "và dạng nhão" → chốt 20079910',
    kq20079910.ketQua === 'CHOT' && kq20079910.hs === '20079910',
    j(kq20079910));
  check('13b-ngược 200799: trái cây dạng nhão từ dứa (bị loại trừ) → không chốt 20079910',
    kq200799Ng.hs !== '20079910',
    j(kq200799Ng));

  // 230641 & 230649: Từ hạt cải dầu (rape seeds hoặc colza seeds) (2 chiều)
  const kq23064110 = chotDong8({
    hs: '230641',
    productText: 'Từ hạt cải dầu (rape seeds hoặc colza seeds) - Từ hạt cải dầu (rape seeds hoặc colza seeds) có hàm lượng axit eruxic thấp: Từ hạt cải dầu rape có hàm lượng axit eruxic thấp',
  });
  const kq23064120 = chotDong8({
    hs: '230641',
    productText: 'Từ hạt cải dầu (rape seeds hoặc colza seeds) - Từ hạt cải dầu (rape seeds hoặc colza seeds) có hàm lượng axit eruxic thấp: Từ hạt cải dầu colza có hàm lượng axit eruxic thấp',
  });
  const kq23064920 = chotDong8({
    hs: '230649',
    productText: 'Từ hạt cải dầu (rape seeds hoặc colza seeds) - Loại khác: Từ hạt cải dầu colza khác',
  });
  const kq230641Thieu = chotDong8({
    hs: '230641',
    productText: 'Từ hạt cải dầu (rape seeds hoặc colza seeds) - Từ hạt cải dầu (rape seeds hoặc colza seeds) có hàm lượng axit eruxic thấp',
  });
  check('13c 23064110/23064120/23064920: tách vế trong ngoặc đơn "(rape seeds hoặc colza seeds)" → chốt đúng rape / colza',
    kq23064110.ketQua === 'CHOT' && kq23064110.hs === '23064110'
    && kq23064120.ketQua === 'CHOT' && kq23064120.hs === '23064120'
    && kq23064920.ketQua === 'CHOT' && kq23064920.hs === '23064920',
    j([kq23064110, kq23064120, kq23064920]));
  check('13c-ngược 230641: chỉ có tiêu đề cha có ngoặc "(rape seeds hoặc colza seeds)" → không tự chốt',
    kq230641Thieu.ketQua !== 'CHOT' && kq230641Thieu.ketQua !== 'LOAI_KHAC',
    j(kq230641Thieu));

  // ReDoS ~40.000 từ lặp < 2 giây (quy tắc 6b)
  const t0 = Date.now();
  const chuoiDai1830 = `${Array.from({ length: 10000 }, () => 'trừ xoài, dứa hoặc').join(' ')} dâu tây: Trái cây dạng nhão, trừ xoài, dứa hoặc dâu tây dạng nhão`;
  const kqReDoS1830 = chotDong8({ hs: '200799', productText: chuoiDai1830 });
  const dt = Date.now() - t0;
  check(`13d ReDoS ~40.000 từ lặp chạy dưới 2000ms (thực tế ${dt}ms)`, dt < 2000 && kqReDoS1830.hs === '20079910', `${dt}ms`);
}

// 14. OZV-1943: tách vế cha "và các loại ghim khác" (73194010), tiền tố vế cha "có gắn lò xo" (94042910), và từ ghép khác nghĩa "bóng bàn" vs "Bàn" (95064010)
{
  const { chotDong8 } = require('../lib/so-tay-gates.js');
  // 73194010 (2 chiều)
  const kq73194010 = chotDong8({
    hs: '731940',
    productText: 'Ghim băng và các loại ghim khác: Ghim băng',
  });
  const kq731940Thieu = chotDong8({
    hs: '731940',
    productText: 'Ghim băng và các loại ghim khác',
  });
  check('14a 73194010: tách vế cha nối bằng "và các loại ghim khác" → chốt 73194010',
    kq73194010.ketQua === 'CHOT' && kq73194010.hs === '73194010',
    j(kq73194010));
  check('14a-ngược 731940: chỉ có tiêu đề phân nhóm 6 số → không tự chốt',
    kq731940Thieu.ketQua !== 'CHOT' && kq731940Thieu.ketQua !== 'LOAI_KHAC',
    j(kq731940Thieu));

  // 94042910 (2 chiều)
  const kq94042910 = chotDong8({
    hs: '940429',
    productText: 'Đệm - Bằng các loại vật liệu khác: Đệm lò xo',
  });
  const kq940429Thieu = chotDong8({
    hs: '940429',
    productText: 'Đệm - Bằng các loại vật liệu khác',
  });
  check('14b 94042910: tách tiền tố vế cha "có gắn lò xo" trong nhóm 9404 → chốt 94042910',
    kq94042910.ketQua === 'CHOT' && kq94042910.hs === '94042910',
    j(kq94042910));
  check('14b-ngược 940429: chỉ có tiêu đề phân nhóm 6 số → không tự chốt',
    kq940429Thieu.ketQua !== 'CHOT' && kq940429Thieu.ketQua !== 'LOAI_KHAC',
    j(kq940429Thieu));

  // 95064010 (2 chiều)
  const kq95064010 = chotDong8({
    hs: '950640',
    productText: 'Dụng cụ và thiết bị cho môn bóng bàn: Bàn',
  });
  const kq950640Thieu = chotDong8({
    hs: '950640',
    productText: 'Dụng cụ và thiết bị cho môn bóng bàn',
  });
  const kq95064090 = chotDong8({
    hs: '950640',
    productText: 'Dụng cụ và thiết bị cho môn bóng bàn, không phải Bàn',
  });
  check('14c 95064010/95064090: phân biệt "bóng bàn" (môn thể thao) với "Bàn" → chốt 95064010 và Loại khác 95064090',
    kq95064010.ketQua === 'CHOT' && kq95064010.hs === '95064010'
    && kq95064090.ketQua === 'LOAI_KHAC' && kq95064090.hs === '95064090',
    j([kq95064010, kq95064090]));
  check('14c-ngược 950640: chỉ có chữ "bóng bàn" ở tiêu đề phân nhóm → không khớp nhầm chữ "Bàn"',
    kq950640Thieu.ketQua !== 'CHOT' && kq950640Thieu.ketQua !== 'LOAI_KHAC',
    j(kq950640Thieu));

  // ReDoS ~40.000 từ lặp < 2 giây (quy tắc 6b)
  const t0 = Date.now();
  const chuoiDai1943 = `${Array.from({ length: 13500 }, () => 'dụng cụ bóng bàn').join(' ')}: Bàn`;
  const kqReDoS1943 = chotDong8({ hs: '950640', productText: chuoiDai1943 });
  const dt = Date.now() - t0;
  check(`14d ReDoS ~40.000 từ lặp chạy dưới 2000ms (thực tế ${dt}ms)`, dt < 2000 && kqReDoS1943.hs === '95064010', `${dt}ms`);
}

// ── 15. OZV-2013 AR3000-03: nhựa+nhôm không bị hỏi ĐK trong vì nhầm "bằng plastic" 84812020 ─────────────────
{
  const DESC_AR = 'Van điều chỉnh áp suất khí nén cỡ nhỏ AR3000-03, chất liệu nhựa+nhôm, dùng cho thiết bị khí nén, kích thước 53x122.5x101';
  const TV = require('../lib/tu-vung.js');
  const duKienAr = [];
  for (const f of ['tenLoai', 'dungCho', 'nguonDongLuc', 'chatLieu', 'cachDieuKhien']) {
    const x = TV.docGiaTri(f, DESC_AR);
    if (x?.trangThai && x.trangThai !== 'CHUA_BIET') {
      duKienAr.push({ fact: f, giaTri: x.giaTri, bangChung: x.bangChung, trangThai: x.trangThai, nguon: 'MO_TA' });
    }
  }
  const Far = DK.chuanDuKien(duKienAr);
  const r90 = DK.doiChieuDong8('84812090', Far);
  const r20 = DK.doiChieuDong8('84812020', Far);
  check('15a AR3000-03 nhựa+nhôm: 84812020 TRAI/MAU_THUAN (không phải bằng plastic thuần)',
    r20.ketQua === 'MAU_THUAN' || r20.ketQua === 'TRAI' || (r20.ketQua !== 'CO' && r20.ketQua !== 'THIEU'),
    j({ r20, chatLieu: Far.get('chatLieu') }));
  check('15b AR3000-03: 84812090 CO — không còn hỏi duongKinhTrong',
    r90.ketQua === 'CO' && !(r90.thieu || []).some((t) => t.fact === 'duongKinhTrong'),
    j({ ketQua: r90.ketQua, thieu: r90.thieu, dd: r90.duongDi?.map((d) => ({ nut: d.nut, kq: d.ketQua })) }));
  // Chiều ngược: chỉ plastic + thiếu ĐK trong → vẫn THIEU (đúng luật hỏi đường kính)
  const Fplastic = DK.chuanDuKien([
    fact('tenLoai', 'van điều áp khí nén'),
    fact('cachDieuKhien', 'KHI_NEN'),
    fact('chatLieu', [{ viTri: 'CHINH', chatLieu: 'plastic' }]),
  ]);
  const r90p = DK.doiChieuDong8('84812090', Fplastic);
  check('15c ngược: chỉ plastic thiếu ĐK trong → 84812090 vẫn THIEU duongKinhTrong',
    r90p.ketQua === 'THIEU' && (r90p.thieu || []).some((t) => t.fact === 'duongKinhTrong'),
    j({ ketQua: r90p.ketQua, thieu: r90p.thieu }));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
