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

// ─────────────────────────────────────────────────────────────────────────────
// OZV-2121 — Kiểm tra cạnh loại trừ 2 chiều 61.03 <-> 62.03 cho ca 178 tầng 4 số:
// "Quần bò dài nam / sợi cotton 90%, sợi Polyester 10% / trang phục" (nhomNhan: ["6103", "6203"]).
{
  const moTaCa178 = 'Quần bò dài nam / sợi cotton 90%, sợi Polyester 10% / trang phục';

  // 1. Căn cứ pháp lý nguyên văn
  const s6103 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '6103.json'), 'utf8'));
  const s6203 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '6203.json'), 'utf8'));
  const v6103 = S.verifySoTay(s6103, '6103');
  const v6203 = S.verifySoTay(s6203, '6203');
  check(
    '[OZV-2121 verifySoTay] sổ tay 6103 và 6203 đạt 100% (0 mục bị loại)',
    v6103.loai.length === 0 && v6203.loai.length === 0,
    { loai6103: v6103.loai, loai6203: v6203.loai }
  );

  const st6103 = loadSoTay('6103');
  const st6203 = loadSoTay('6203');
  const lt6103 = (st6103?.loaiTru || []).find((x) => x.sangNhom === '6203');
  const lt6203 = (st6203?.loaiTru || []).find((x) => x.sangNhom === '6103');
  check(
    '[OZV-2121 căn cứ] sổ tay 6103 và 6203 có mục loaiTru 2 chiều 6103 <-> 6203 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt6103 &&
        lt6103.nguon === 'ch61.chuong' &&
        lt6103.canCuLoaiTru?.nguon === 'nhom6203.nhom' &&
        S.checkItem('loaiTru', lt6103, S.sourcesFor('6103'), '6103') === null
    ) &&
      Boolean(
        lt6203 &&
          lt6203.nguon === 'ch62.chuong' &&
          lt6203.canCuLoaiTru?.nguon === 'nhom6103.nhom' &&
          S.checkItem('loaiTru', lt6203, S.sourcesFor('6203'), '6203') === null
      ),
    { lt6103, lt6203 }
  );

  // 2. Bảng cạnh đồ thị 2 chiều C5/C6 và mở rộng ứng viên
  const c5Tu6103 = D.canhTu('6103', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6203');
  const c5Tu6203 = D.canhTu('6203', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6103');
  const c6Tu6103 = D.canhTu('6103', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6203');
  const c6Tu6203 = D.canhTu('6203', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6103');
  const giua6103_6203 = D.canhGiuaNhomConSong(['6103', '6203']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu6103 = D.moRongUngVien(['6103'], moTaCa178, { toiDa: 10 });
  const mrTu6203 = D.moRongUngVien(['6203'], moTaCa178, { toiDa: 10 });
  check(
    '[OZV-2121 đồ thị 2 chiều] bảng cạnh có C5/C6 6103<->6203, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 178',
    c5Tu6103.some((e) => e.nguon === 'ch61.chuong' && e.canCuLoaiTru?.nguon === 'nhom6203.nhom') &&
      c5Tu6203.some((e) => e.nguon === 'ch62.chuong' && e.canCuLoaiTru?.nguon === 'nhom6103.nhom') &&
      c6Tu6103.length >= 1 &&
      c6Tu6203.length >= 1 &&
      giua6103_6203.length >= 2 &&
      mrTu6103.some((x) => x.nhom === '6203') &&
      mrTu6203.some((x) => x.nhom === '6103'),
    { c5Tu6103: c5Tu6103.length, c5Tu6203: c5Tu6203.length, giua: giua6103_6203.length, mrTu6103, mrTu6203 }
  );

  const rel6103 = nhomLienQuanSoTay('6103');
  const rel6203 = nhomLienQuanSoTay('6203');
  check(
    '[OZV-2121 nhomLienQuanSoTay] liên kết hai chiều 6103 <-> 6203',
    rel6103.includes('6203') && rel6203.includes('6103'),
    { rel6103, rel6203 }
  );

  // 3. Thuận 2 chiều: cauPhanBietNhom và soTayGates
  const pb6103 = cauPhanBietNhom('6103', ['6103', '6203'], moTaCa178);
  check(
    '[OZV-2121 thuận 6103->6203] 6103 đứng đầu với [6103, 6203] sinh câu phân biệt từ ch61.chuong trỏ sang 62.03',
    pb6103.length === 1 &&
      pb6103[0].loai === 'PHAN_BIET_NHOM' &&
      pb6103[0].canCu === 'so-tay' &&
      pb6103[0].nguon === 'ch61.chuong' &&
      /62\.03/.test(pb6103[0].questionVi) &&
      /61\.03/.test(pb6103[0].questionVi),
    { pb6103 }
  );

  const pb6203 = cauPhanBietNhom('6203', ['6203', '6103'], moTaCa178);
  check(
    '[OZV-2121 thuận 6203->6103] 6203 đứng đầu với [6203, 6103] sinh câu phân biệt từ ch62.chuong trỏ sang 61.03',
    pb6203.length === 1 &&
      pb6203[0].loai === 'PHAN_BIET_NHOM' &&
      pb6203[0].canCu === 'so-tay' &&
      pb6203[0].nguon === 'ch62.chuong' &&
      /61\.03/.test(pb6203[0].questionVi) &&
      /62\.03/.test(pb6203[0].questionVi),
    { pb6203 }
  );

  const g6103To6203 = soTayGates({
    hs: '61034200',
    productText: 'Quần bò dài nam bằng vải dệt thoi dùng làm trang phục nam giới (không phải dệt kim hoặc móc)',
    productName: 'Quần bò dài nam bằng vải dệt thoi dùng làm trang phục nam giới',
    candidateHeadings: ['6103', '6203'],
  });
  const g6203To6103 = soTayGates({
    hs: '62034290',
    productText: 'Quần bò dài nam được dệt kim hoặc móc dùng làm trang phục nam giới',
    productName: 'Quần bò dài nam được dệt kim hoặc móc dùng làm trang phục nam giới',
    candidateHeadings: ['6203', '6103'],
  });
  check(
    '[OZV-2121 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 6103 -> 6203 và 6203 -> 6103',
    (g6103To6203.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6203')) &&
      (g6203To6103.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6103')),
    { g6103To6203: g6103To6203.challenges, g6203To6103: g6203To6103.challenges }
  );

  // 4. Đối chứng (ca âm): hàng không trùng từ khoá điều kiện không hỏi oan / không kéo oan
  const dcComLe6103 = cauPhanBietNhom('6103', ['6103', '6203'], 'Bộ com-lê của nam giới dệt kim từ lông cừu');
  const dcComLe6203 = cauPhanBietNhom('6203', ['6203', '6103'], 'Bộ com-lê của nam giới từ sợi tổng hợp');
  const dcJacket6103 = cauPhanBietNhom('6103', ['6103', '6203'], 'Áo jacket và áo blazer nam giới từ bông');
  const dcJacket6203 = cauPhanBietNhom('6203', ['6203', '6103'], 'Áo jacket và áo blazer nam giới từ bông');
  const dcQuanDai6103 = soTayGates({
    hs: '61034100',
    productText: 'Quần dài nam giới dệt kim từ lông cừu',
    productName: 'Quần dài nam giới dệt kim từ lông cừu',
    candidateHeadings: ['6103', '6203'],
  });
  const dcQuanDai6203 = soTayGates({
    hs: '62034290',
    productText: 'Quần dài nam giới từ bông',
    productName: 'Quần dài nam giới từ bông',
    candidateHeadings: ['6203', '6103'],
  });
  check(
    '[OZV-2121 đối chứng] bộ com-lê, áo jacket và quần dài nam thông thường không hỏi oan / không kéo oan 61.03 <-> 62.03',
    dcComLe6103.length === 0 &&
      dcComLe6203.length === 0 &&
      dcJacket6103.length === 0 &&
      dcJacket6203.length === 0 &&
      !(dcQuanDai6103.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6203')) &&
      !(dcQuanDai6203.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6103')) &&
      !D.moRongUngVien(['6103'], 'Bộ com-lê của nam giới dệt kim từ lông cừu').some((x) => x.nhom === '6203') &&
      !D.moRongUngVien(['6203'], 'Áo jacket và áo blazer nam giới từ bông').some((x) => x.nhom === '6103'),
    { dcComLe6103, dcComLe6203, dcJacket6103, dcJacket6203 }
  );

  // 5. phanTichHoiTruoc4So tách 2 nhánh điều kiện riêng biệt cho ca 178
  const ht178 = phanTichHoiTruoc4So({ moTa: moTaCa178, ungVien: ['6103', '6203'] });
  const distinctDk178 = new Set((ht178.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2121 hoi-truoc-4so] ca 178 với [6103, 6203] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt',
    ht178.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk178 &&
      ['6103', '6203'].every((h) => (ht178.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht178.trangThai, distinctDk178, dapAnDieuKien: ht178.dapAnDieuKien }
  );
}

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

// ─────────────────────────────────────────────────────────────────────────────
// OZV-2118 — Kiểm tra cạnh loại trừ 2 chiều 56.07 <-> 95.03 cho ca 152 tầng 4 số:
// "Dây diều / xơ tổng hợp / thả và điều khiển diều" (nhomNhan: ["5607", "9503"]).
{
  const moTaCa152 = 'Dây diều / xơ tổng hợp / thả và điều khiển diều';

  // 1. Căn cứ pháp lý nguyên văn
  const s5607 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '5607.json'), 'utf8'));
  const s9503 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '9503.json'), 'utf8'));
  const v5607 = S.verifySoTay(s5607, '5607');
  const v9503 = S.verifySoTay(s9503, '9503');
  check(
    '[OZV-2118 verifySoTay] sổ tay 5607 và 9503 đạt 100% (0 mục bị loại)',
    v5607.loai.length === 0 && v9503.loai.length === 0,
    { loai5607: v5607.loai, loai9503: v9503.loai }
  );

  const st5607 = loadSoTay('5607');
  const st9503 = loadSoTay('9503');
  const lt5607 = (st5607?.loaiTru || []).find((x) => x.sangNhom === '9503');
  const lt9503 = (st9503?.loaiTru || []).find((x) => x.sangNhom === '5607');
  check(
    '[OZV-2118 căn cứ] sổ tay 5607 và 9503 có mục loaiTru 2 chiều 5607 <-> 9503 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt5607 &&
        lt5607.nguon === 'nhom5607.nhom' &&
        lt5607.canCuLoaiTru?.nguon === 'nhom9503.nhom' &&
        S.checkItem('loaiTru', lt5607, S.sourcesFor('5607'), '5607') === null
    ) &&
      Boolean(
        lt9503 &&
          lt9503.nguon === 'nhom9503.nhom' &&
          lt9503.canCuLoaiTru?.nguon === 'nhom5607.nhom' &&
          S.checkItem('loaiTru', lt9503, S.sourcesFor('9503'), '9503') === null
      ),
    { lt5607, lt9503 }
  );

  // 2. Bảng cạnh đồ thị 2 chiều C5/C6 và mở rộng ứng viên
  const c5Tu5607 = D.canhTu('5607', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '9503');
  const c5Tu9503 = D.canhTu('9503', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5607');
  const c6Tu5607 = D.canhTu('5607', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '9503');
  const c6Tu9503 = D.canhTu('9503', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5607');
  const giua5607_9503 = D.canhGiuaNhomConSong(['5607', '9503']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu5607 = D.moRongUngVien(['5607'], moTaCa152);
  const mrTu9503 = D.moRongUngVien(['9503'], moTaCa152);
  check(
    '[OZV-2118 đồ thị 2 chiều] bảng cạnh có C5/C6 5607<->9503, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 152',
    c5Tu5607.some((e) => e.nguon === 'nhom5607.nhom' && e.canCuLoaiTru?.nguon === 'nhom9503.nhom') &&
      c5Tu9503.some((e) => e.nguon === 'nhom9503.nhom' && e.canCuLoaiTru?.nguon === 'nhom5607.nhom') &&
      c6Tu5607.length >= 1 &&
      c6Tu9503.length >= 1 &&
      giua5607_9503.length >= 2 &&
      mrTu5607.some((x) => x.nhom === '9503') &&
      mrTu9503.some((x) => x.nhom === '5607'),
    { c5Tu5607: c5Tu5607.length, c5Tu9503: c5Tu9503.length, giua: giua5607_9503.length, mrTu5607, mrTu9503 }
  );

  const rel5607 = nhomLienQuanSoTay('5607');
  const rel9503 = nhomLienQuanSoTay('9503');
  check(
    '[OZV-2118 nhomLienQuanSoTay] liên kết hai chiều 5607 <-> 9503',
    rel5607.includes('9503') && rel9503.includes('5607'),
    { rel5607, rel9503 }
  );

  // 3. Thuận 2 chiều: cauPhanBietNhom và soTayGates
  const pb5607 = cauPhanBietNhom('5607', ['5607', '9503'], moTaCa152);
  check(
    '[OZV-2118 thuận 5607->9503] 5607 đứng đầu với [5607, 9503] sinh câu phân biệt từ nhom5607.nhom trỏ sang 95.03',
    pb5607.length === 1 &&
      pb5607[0].loai === 'PHAN_BIET_NHOM' &&
      pb5607[0].canCu === 'so-tay' &&
      pb5607[0].nguon === 'nhom5607.nhom' &&
      /95\.03/.test(pb5607[0].questionVi) &&
      /56\.07/.test(pb5607[0].questionVi),
    { pb5607 }
  );

  const pb9503 = cauPhanBietNhom('9503', ['9503', '5607'], moTaCa152);
  check(
    '[OZV-2118 thuận 9503->5607] 9503 đứng đầu với [9503, 5607] sinh câu phân biệt từ nhom9503.nhom trỏ sang 56.07',
    pb9503.length === 1 &&
      pb9503[0].loai === 'PHAN_BIET_NHOM' &&
      pb9503[0].canCu === 'so-tay' &&
      pb9503[0].nguon === 'nhom9503.nhom' &&
      /56\.07/.test(pb9503[0].questionVi) &&
      /95\.03/.test(pb9503[0].questionVi),
    { pb9503 }
  );

  const g5607To9503 = soTayGates({
    hs: '56075090',
    productText: 'Dây diều bằng xơ tổng hợp đã cuốn trên tay quay chuyên dùng cho diều đồ chơi',
    productName: 'Dây diều bằng xơ tổng hợp đã cuốn trên tay quay chuyên dùng cho diều đồ chơi',
    candidateHeadings: ['5607', '9503'],
  });
  const g9503To5607 = soTayGates({
    hs: '95030099',
    productText: 'Dây diều từ xơ tổng hợp ở dạng cuộn thông thường chưa gắn tay quay đồ chơi',
    productName: 'Dây diều từ xơ tổng hợp ở dạng cuộn thông thường chưa gắn tay quay đồ chơi',
    candidateHeadings: ['9503', '5607'],
  });
  check(
    '[OZV-2118 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 5607 -> 9503 và 9503 -> 5607',
    (g5607To9503.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('9503')) &&
      (g9503To5607.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5607')),
    { g5607To9503: g5607To9503.challenges, g9503To5607: g9503To5607.challenges }
  );

  // 4. Đối chứng (ca âm): hàng không trùng từ khoá điều kiện không hỏi oan / không kéo oan
  const dcDayXe5607 = cauPhanBietNhom('5607', ['5607', '9503'], 'Dây xe để buộc hoặc đóng kiện từ polyetylen');
  const dcDayXe9503 = cauPhanBietNhom('9503', ['9503', '5607'], 'Dây xe để buộc hoặc đóng kiện từ polyetylen');
  const dcBupBe5607 = cauPhanBietNhom('5607', ['5607', '9503'], 'Búp bê bằng nhựa có trang phục cho trẻ em');
  const dcBupBe9503 = cauPhanBietNhom('9503', ['9503', '5607'], 'Búp bê bằng nhựa có trang phục cho trẻ em');
  const dcDayNhay9503 = soTayGates({
    hs: '95030092',
    productText: 'Dây nhảy đồ chơi có tay nắm bằng nhựa cho trẻ em',
    productName: 'Dây nhảy đồ chơi có tay nắm bằng nhựa cho trẻ em',
    candidateHeadings: ['9503', '5607'],
  });
  const dcSoiBen5607 = soTayGates({
    hs: '56075010',
    productText: 'Sợi bện cho dây đai chữ V làm từ xơ nhân tạo đã xử lý bằng resorcinol formaldehyde',
    productName: 'Sợi bện cho dây đai chữ V làm từ xơ nhân tạo đã xử lý bằng resorcinol formaldehyde',
    candidateHeadings: ['5607', '9503'],
  });
  check(
    '[OZV-2118 đối chứng] dây xe đóng kiện, sợi bện dây đai chữ V, búp bê và dây nhảy không hỏi oan / không kéo oan 56.07 <-> 95.03',
    dcDayXe5607.length === 0 &&
      dcDayXe9503.length === 0 &&
      dcBupBe5607.length === 0 &&
      dcBupBe9503.length === 0 &&
      !(dcDayNhay9503.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5607')) &&
      !(dcSoiBen5607.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('9503')) &&
      !D.moRongUngVien(['5607'], 'Dây xe để buộc hoặc đóng kiện từ polyetylen').some((x) => x.nhom === '9503') &&
      !D.moRongUngVien(['9503'], 'Búp bê bằng nhựa có trang phục cho trẻ em').some((x) => x.nhom === '5607'),
    { dcDayXe5607, dcDayXe9503, dcBupBe5607, dcBupBe9503 }
  );

  // 5. phanTichHoiTruoc4So tách 2 nhánh điều kiện riêng biệt cho ca 152
  const ht152 = phanTichHoiTruoc4So({ moTa: moTaCa152, ungVien: ['5607', '9503'] });
  const distinctDk152 = new Set((ht152.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2118 hoi-truoc-4so] ca 152 với [5607, 9503] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt',
    ht152.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk152 &&
      ['5607', '9503'].every((h) => (ht152.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht152.trangThai, distinctDk152, dapAnDieuKien: ht152.dapAnDieuKien }
  );
}

console.log(`\nOZV-2109 / OZV-2118 cạnh loại trừ 2 chiều: ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
