// scripts/test-sinh-ca-vi-tri.mjs — OZV-342: bộ sinh ca kiểm luật phải sinh câu MÁY ĐỌC ĐƯỢC cho điều kiện có viTri.
//
// Hai lỗi thật trên nhóm 8544 (đo 12/11):
// 1. cumKhangDinh/cumPhuDinhNhom sinh "bằng cao su" / "không phải bằng cao su" cho điều kiện chatLieu có
//    viTri CACH_DIEN — bộ đọc cần vị trí ("cách điện bằng X") nên hai cụm ấy đều CHUA_BIET: ca LOAI_TRU
//    85444919/85443013 rơi THIEU_SO_LIEU/nhieu-dong thay vì chốt dòng "Loại khác".
// 2. Ca DONG_CO_TEN của dòng có tên dưới tầng "Loại khác" trần (85444292 Cáp bọc, 85444234, 85443014…)
//    không mang phủ định anh em PHAI_KHONG ⇒ nút 8544421/.2 đứng CHUA_BIET và dòng bị hạ (_traiKhiNutThoa).
//
// Khuôn câu lấy từ chính dữ liệu tu-vung@2 (khoa.chatLieu.moTaViTri.CACH_DIEN.cachViet.vi =
// "cách điện bằng {giaTri}"), vật liệu ngoài danh sách lấy từ moTaGiaTri của cùng khoá — không tự nghĩ cụm.
// Không LLM, không mạng, không ghi data/.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { cumKhangDinh, cumPhuDinhNhom, sinhCaNhom } from './bo-kiem-luat.mjs';

const require = createRequire(import.meta.url);
const G = require('../lib/so-tay-gates.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x).slice(0, 500)}`); } };
const dit = (c) => JSON.stringify(c);

// ── 1. Cụm khẳng định LA có viTri: dùng khuôn cachViet.vi của khoá, không còn "bằng X" trần ────────────────────────────
{
  const c = { fact: 'chatLieu', op: 'LA', value: ['cao su', 'plastic'], viTri: 'CACH_DIEN' };
  check('1a cumKhangDinh LA viTri ⇒ "cách điện bằng cao su"', cumKhangDinh(c) === 'cách điện bằng cao su', cumKhangDinh(c));
  // LA không có viTri giữ nguyên như cũ (bằng gang, bằng nhôm…) — không đổi hành vi nhóm khác
  check('1b cumKhangDinh LA không viTri ⇒ "bằng gang" như cũ', cumKhangDinh({ fact: 'chatLieu', op: 'LA', value: 'gang' }) === 'bằng gang', cumKhangDinh({ fact: 'chatLieu', op: 'LA', value: 'gang' }));
}

// ── 2. Cụm phủ định LA có viTri: khẳng một vật liệu NGOÀI danh sách (bộ đọc viết thành TRÁI được) ──────────────────────
// "không phải bằng cao su" là cụm CHẾT (đo trên 85444913: CHUA_BIET). Nói thẳng vật liệu khác — "cách điện bằng
// thủy tinh" — bộ đọc thành TRÁI cho LA [cao su, plastic, giấy] (đã đo tay trên điều kiện thật 85444913).
{
  const ds = [{ fact: 'chatLieu', op: 'LA', value: ['cao su', 'plastic', 'giấy'], viTri: 'CACH_DIEN' }];
  const s = cumPhuDinhNhom(ds);
  check('2a phủ định LA viTri ⇒ khẳng vật liệu ngoài danh sách theo khuôn viTri', /^cách điện bằng (?!cao su|plastic|giấy)\S+/.test(s), s);
  const ngoai = s.replace(/^cách điện bằng /, '');
  check('2b vật liệu chọn nằm trong moTaGiaTri của khoá chatLieu (máy đọc được)', ['plastic', 'cao su', 'giấy', 'gỗ', 'kim loại', 'sắt thép', 'thép không gỉ', 'gang', 'đồng', 'nhôm', 'kẽm', 'niken', 'thủy tinh', 'gốm sứ', 'vải dệt'].includes(ngoai), ngoai);
  // LA không viTri giữ "không phải bằng X" như cũ
  check('2c phủ định LA không viTri ⇒ "không phải bằng gang" như cũ', cumPhuDinhNhom([{ fact: 'chatLieu', op: 'LA', value: 'gang' }]) === 'không phải bằng gang', cumPhuDinhNhom([{ fact: 'chatLieu', op: 'LA', value: 'gang' }]));
}

// ── 3. Ca DONG_CO_TEN dưới tầng "Loại khác" trần phải mang phủ định anh em PHAI_KHONG ────────────────────────────────────
{
  const ca = sinhCaNhom('8544');
  const c92 = ca.caDongCoTen.find((c) => c.hs8 === '85444292');
  check('3a sinhCaNhom chạy ra ca 85444292', Boolean(c92), ca.caDongCoTen.map((c) => c.hs8).filter((h) => h.startsWith('8544429')));
  if (c92) {
    check('3b ca 85444292 có phủ định viễn thông (8544421/.2 TRAI được)', c92.productText.includes('không dùng trong viễn thông'), c92.productText);
    check('3c ca 85444292 có phủ định Cáp ắc qui (8544423 TRAI được)', c92.productText.includes('không phải Cáp ắc qui'), c92.productText);
    const r = G.chotDong8({ hs: '854442', productText: c92.productText });
    check('3d cổng chốt đúng 85444292 (hết hạ CHUA_BIET vì nút anh em)', r.ketQua === 'CHOT' && r.hs === '85444292', dit(r).slice(0, 400));
  }
  // Dòng KHÔNG dưới tầng "Loại khác" không đổi văn bản ca (tránh sóng lan nhóm khác)
  const c11 = ca.caDongCoTen.find((c) => c.hs8 === '85444211');
  check('3e ca 85444211 (không qua tầng Loại khác) không thêm phủ định', Boolean(c11) && !c11.productText.includes('không dùng trong viễn thông'), c11 && c11.productText);
}

// ── 4. Ca LOAI_TRU sinh theo khuôn mới ⇒ cổng chốt được dòng "Loại khác" ────────────────────────────────────────────────
{
  const ca = sinhCaNhom('8544');
  const c19 = ca.caLoaiTruLK.find((c) => c.hs8 === '85444919');
  check('4a sinhCaNhom chạy ra ca LOAI_TRU 85444919', Boolean(c19), ca.caLoaiTruLK.map((c) => c.hs8).filter((h) => h.startsWith('854449')));
  if (c19) {
    check('4b ca 85444919 khẳng vật liệu ngoài [cao su, plastic, giấy] theo khuôn viTri', /cách điện bằng (?!cao su|plastic|giấy)/.test(c19.productText), c19.productText);
    const r = G.chotDong8({ hs: '854449', productText: c19.productText });
    check('4c cổng chốt LOAI_KHAC 85444919 (hết THIEU_SO_LIEU)', r.ketQua === 'LOAI_KHAC' && r.hs === '85444919', dit(r).slice(0, 400));
  }
  const c13 = ca.caLoaiTruLK.find((c) => c.hs8 === '85443013');
  if (c13) {
    check('4d ca 85443013 khẳng "cách điện bằng cao su" (r16045 THOA được)', c13.productText.includes('cách điện bằng cao su'), c13.productText);
    const r = G.chotDong8({ hs: '854430', productText: c13.productText });
    check('4e cổng chốt LOAI_KHAC 85443013', r.ketQua === 'LOAI_KHAC' && r.hs === '85443013', dit(r).slice(0, 400));
  }
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
