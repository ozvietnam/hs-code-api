#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-2109 — Kiểm tra cạnh loại trừ 2 chiều 69.11 <-> 69.12 cho ca 159 tầng 4 số:
 * "Bộ ấm chén bằng gốm / Gốm / None" (nhomNhan: ["6911", "6912"]).
 *
 * Kiểm đủ:
 *   1. Căn cứ pháp lý nguyên văn 100% trong data/so-tay/6911.json và data/so-tay/6912.json (verifySoTay + checkItem).
 *   2. Bảng cạnh đồ thị C5/C6 2 chiều 6911 <-> 6912 và moRongUngVien kéo 2 chiều cho ca 159.
 *   3. Thuận 2 chiều: cauPhanBietNhom và soTayGates hoạt động đúng cả chiều 6911 -> 6912 và 6912 -> 6911.
 *   4. Đối chứng (ca âm): hàng không trùng từ khoá điều kiện không hỏi oan và không kéo oan 6911 <-> 6912.
 *   5. phanTichHoiTruoc4So tách 2 nhánh điều kiện riêng biệt cho [6911, 6912].
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const S = require('../lib/so-tay.js');
const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
const D = require('../lib/do-thi/index.js');
const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');

let passed = 0;
let failed = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || extra === undefined ? '' : ` ${JSON.stringify(extra).slice(0, 400)}`}`);
  if (ok) passed += 1;
  else failed += 1;
};

const moTaCa159 = 'Bộ ấm chén bằng gốm / Gốm / None';
// Trong tu-khoa.js: "đồ" (do) và "ăn" (an) nằm trong TU_DUNG nên tuKhoa(dieuKien) có k[0]="bo", k[1]="bep";
// kèm nhãn nhóm "Bộ đồ ăn, bộ đồ bếp" + cụm phân biệt "ấm chén" của ca 159 để đo moRongUngVien & cauPhanBietNhom 2 chiều.
const moTaKhop = 'Bộ đồ ăn, bộ đồ bếp, bộ ấm chén bằng gốm / Gốm / None';

// 1. Căn cứ pháp lý nguyên văn
const s6911 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '6911.json'), 'utf8'));
const s6912 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '6912.json'), 'utf8'));
const v6911 = S.verifySoTay(s6911, '6911');
const v6912 = S.verifySoTay(s6912, '6912');
check(
  '[OZV-2109 verifySoTay] sổ tay 6911 và 6912 đạt 100% (0 mục bị loại)',
  v6911.loai.length === 0 && v6912.loai.length === 0,
  { loai6911: v6911.loai, loai6912: v6912.loai }
);

const st6911 = loadSoTay('6911');
const st6912 = loadSoTay('6912');
const lt6911 = (st6911?.loaiTru || []).find((x) => x.sangNhom === '6912');
const lt6912 = (st6912?.loaiTru || []).find((x) => x.sangNhom === '6911');
check(
  '[OZV-2109 căn cứ] sổ tay 6911 và 6912 có mục loaiTru 2 chiều 6911 <-> 6912 kèm canCuLoaiTru nguyên văn đạt checkItem',
  Boolean(
    lt6911 &&
      lt6911.nguon === 'nhom6911.nhom' &&
      lt6911.canCuLoaiTru?.nguon === 'nhom6912.nhom' &&
      S.checkItem('loaiTru', lt6911, S.sourcesFor('6911'), '6911') === null
  ) &&
    Boolean(
      lt6912 &&
        lt6912.nguon === 'nhom6912.nhom' &&
        lt6912.canCuLoaiTru?.nguon === 'nhom6911.nhom' &&
        S.checkItem('loaiTru', lt6912, S.sourcesFor('6912'), '6912') === null
    ),
  { lt6911, lt6912 }
);

// 2. Bảng cạnh đồ thị 2 chiều C5/C6 và mở rộng ứng viên
const c5Tu6911 = D.canhTu('6911', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6912');
const c5Tu6912 = D.canhTu('6912', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6911');
const c6Tu6911 = D.canhTu('6911', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6912');
const c6Tu6912 = D.canhTu('6912', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6911');
const giua6911_6912 = D.canhGiuaNhomConSong(['6911', '6912']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
const mrTu6911 = D.moRongUngVien(['6911'], moTaKhop);
const mrTu6912 = D.moRongUngVien(['6912'], moTaKhop);
check(
  '[OZV-2109 đồ thị 2 chiều] bảng cạnh có C5/C6 6911<->6912, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều',
  c5Tu6911.some((e) => e.nguon === 'nhom6911.nhom' && e.canCuLoaiTru?.nguon === 'nhom6912.nhom') &&
    c5Tu6912.some((e) => e.nguon === 'nhom6912.nhom' && e.canCuLoaiTru?.nguon === 'nhom6911.nhom') &&
    c6Tu6911.length >= 1 &&
    c6Tu6912.length >= 1 &&
    giua6911_6912.length >= 2 &&
    mrTu6911.some((x) => x.nhom === '6912') &&
    mrTu6912.some((x) => x.nhom === '6911'),
  { c5Tu6911: c5Tu6911.length, c5Tu6912: c5Tu6912.length, giua: giua6911_6912.length, mrTu6911, mrTu6912 }
);

const rel6911 = nhomLienQuanSoTay('6911');
const rel6912 = nhomLienQuanSoTay('6912');
check(
  '[OZV-2109 nhomLienQuanSoTay] liên kết hai chiều 6911 <-> 6912',
  rel6911.includes('6912') && rel6912.includes('6911'),
  { rel6911, rel6912 }
);

// 3. Thuận 2 chiều: cauPhanBietNhom và soTayGates
const pb6911 = cauPhanBietNhom('6911', ['6911', '6912'], moTaKhop);
check(
  '[OZV-2109 thuận 6911->6912] 6911 đứng đầu với [6911, 6912] sinh câu phân biệt từ nhom6911.nhom trỏ sang 69.12',
  pb6911.length === 1 &&
    pb6911[0].loai === 'PHAN_BIET_NHOM' &&
    pb6911[0].canCu === 'so-tay' &&
    pb6911[0].nguon === 'nhom6911.nhom' &&
    /69\.12/.test(pb6911[0].questionVi) &&
    /69\.11/.test(pb6911[0].questionVi),
  { pb6911 }
);

const pb6912 = cauPhanBietNhom('6912', ['6912', '6911'], moTaKhop);
check(
  '[OZV-2109 thuận 6912->6911] 6912 đứng đầu với [6912, 6911] sinh câu phân biệt từ nhom6912.nhom trỏ sang 69.11',
  pb6912.length === 1 &&
    pb6912[0].loai === 'PHAN_BIET_NHOM' &&
    pb6912[0].canCu === 'so-tay' &&
    pb6912[0].nguon === 'nhom6912.nhom' &&
    /69\.11/.test(pb6912[0].questionVi) &&
    /69\.12/.test(pb6912[0].questionVi),
  { pb6912 }
);

const g6911To6912 = soTayGates({
  hs: '69111000',
  productText: 'Bộ đồ ăn, bộ ấm chén uống chè bằng gốm đất nung, không phải bằng sứ',
  productName: 'Bộ đồ ăn, bộ ấm chén uống chè bằng gốm đất nung, không phải bằng sứ',
  candidateHeadings: ['6911', '6912'],
});
const g6912To6911 = soTayGates({
  hs: '69120000',
  productText: 'Bộ đồ ăn, bộ ấm chén uống chè được làm bằng sứ (porcelain)',
  productName: 'Bộ đồ ăn, bộ ấm chén uống chè được làm bằng sứ (porcelain)',
  candidateHeadings: ['6912', '6911'],
});
check(
  '[OZV-2109 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 6911 -> 6912 và 6912 -> 6911',
  (g6911To6912.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6912')) &&
    (g6912To6911.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6911')),
  { g6911To6912: g6911To6912.challenges, g6912To6911: g6912To6911.challenges }
);

// 4. Đối chứng (ca âm): hàng không trùng từ khoá điều kiện không hỏi oan / không kéo oan
const dcGach6911 = cauPhanBietNhom('6911', ['6911', '6912'], 'Gạch ốp lát men bóng kích thước 60x60cm');
const dcGach6912 = cauPhanBietNhom('6912', ['6912', '6911'], 'Gạch ốp lát men bóng kích thước 60x60cm');
const dcNgoi6911 = cauPhanBietNhom('6911', ['6911', '6912'], 'Ngói lợp mái nhà xây dựng');
const dcNgoi6912 = cauPhanBietNhom('6912', ['6912', '6911'], 'Ngói lợp mái nhà xây dựng');
check(
  '[OZV-2109 đối chứng] gạch ốp lát và ngói lợp mái không hỏi oan và không kéo oan 69.11 <-> 69.12',
  dcGach6911.length === 0 &&
    dcGach6912.length === 0 &&
    dcNgoi6911.length === 0 &&
    dcNgoi6912.length === 0 &&
    !D.moRongUngVien(['6911'], 'Gạch ốp lát men bóng kích thước 60x60cm').some((x) => x.nhom === '6912') &&
    !D.moRongUngVien(['6912'], 'Ngói lợp mái nhà xây dựng').some((x) => x.nhom === '6911'),
  { dcGach6911, dcGach6912, dcNgoi6911, dcNgoi6912 }
);

// 5. phanTichHoiTruoc4So tách 2 nhánh điều kiện riêng biệt cho ca 159
const ht159 = phanTichHoiTruoc4So({ moTa: moTaCa159, ungVien: ['6911', '6912'] });
const distinctDk159 = new Set((ht159.nhanh || []).map((n) => n.dieuKien)).size === 2;
check(
  '[OZV-2109 hoi-truoc-4so] ca 159 với [6911, 6912] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt',
  ht159.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
    distinctDk159 &&
    ['6911', '6912'].every((h) => (ht159.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
  { trangThai: ht159.trangThai, distinctDk159, dapAnDieuKien: ht159.dapAnDieuKien }
);

console.log(`\nOZV-2109 phân biệt vật liệu gốm/sứ 69.11 <-> 69.12: ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
