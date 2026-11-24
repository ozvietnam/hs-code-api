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

// ─────────────────────────────────────────────────────────────────────────────
// OZV-2129 — Kiểm tra cạnh loại trừ 2 chiều 40.13 <-> 40.16 cho ca 168 tầng 4 số:
// "Săm lốp máy xúc lật / cao su / lắp cho lốp máy xúc lật" (nhomNhan: ["4013"], heNhom: "4016").
{
  const moTaCa168 = 'Săm lốp máy xúc lật / cao su / lắp cho lốp máy xúc lật';

  // 1. Căn cứ pháp lý nguyên văn
  const s4013 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '4013.json'), 'utf8'));
  const s4016 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '4016.json'), 'utf8'));
  const v4013 = S.verifySoTay(s4013, '4013');
  const v4016 = S.verifySoTay(s4016, '4016');
  check(
    '[OZV-2129 verifySoTay] sổ tay 4013 và 4016 đạt 100% (0 mục bị loại)',
    v4013.loai.length === 0 && v4016.loai.length === 0,
    { loai4013: v4013.loai, loai4016: v4016.loai }
  );

  const st4013 = loadSoTay('4013');
  const st4016 = loadSoTay('4016');
  const lt4013 = (st4013?.loaiTru || []).find((x) => x.sangNhom === '4016');
  const lt4016 = (st4016?.loaiTru || []).find((x) => x.sangNhom === '4013');
  check(
    '[OZV-2129 căn cứ] sổ tay 4013 và 4016 có mục loaiTru 2 chiều 4013 <-> 4016 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt4013 &&
        lt4013.nguon === 'ch40.chuong' &&
        lt4013.canCuLoaiTru?.nguon === 'nhom4016.nhom' &&
        S.checkItem('loaiTru', lt4013, S.sourcesFor('4013'), '4013') === null
    ) &&
      Boolean(
        lt4016 &&
          lt4016.nguon === 'ch40.chuong' &&
          lt4016.canCuLoaiTru?.nguon === 'nhom4013.nhom' &&
          S.checkItem('loaiTru', lt4016, S.sourcesFor('4016'), '4016') === null
      ),
    { lt4013, lt4016 }
  );

  // 2. Bảng cạnh đồ thị 2 chiều C5/C6 và mở rộng ứng viên
  const c5Tu4013 = D.canhTu('4013', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '4016');
  const c5Tu4016 = D.canhTu('4016', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '4013');
  const c6Tu4013 = D.canhTu('4013', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '4016');
  const c6Tu4016 = D.canhTu('4016', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '4013');
  const giua4013_4016 = D.canhGiuaNhomConSong(['4013', '4016']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu4013 = D.moRongUngVien(['4013'], moTaCa168, { toiDa: 10 });
  const mrTu4016 = D.moRongUngVien(['4016'], moTaCa168, { toiDa: 10 });
  check(
    '[OZV-2129 đồ thị 2 chiều] bảng cạnh có C5/C6 4013<->4016, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 168',
    c5Tu4013.some((e) => e.nguon === 'ch40.chuong' && e.canCuLoaiTru?.nguon === 'nhom4016.nhom') &&
      c5Tu4016.some((e) => e.nguon === 'ch40.chuong' && e.canCuLoaiTru?.nguon === 'nhom4013.nhom') &&
      c6Tu4013.length >= 1 &&
      c6Tu4016.length >= 1 &&
      giua4013_4016.length >= 2 &&
      mrTu4013.some((x) => x.nhom === '4016') &&
      mrTu4016.some((x) => x.nhom === '4013'),
    { c5Tu4013: c5Tu4013.length, c5Tu4016: c5Tu4016.length, giua: giua4013_4016.length, mrTu4013, mrTu4016 }
  );

  const rel4013 = nhomLienQuanSoTay('4013');
  const rel4016 = nhomLienQuanSoTay('4016');
  check(
    '[OZV-2129 nhomLienQuanSoTay] liên kết hai chiều 4013 <-> 4016',
    rel4013.includes('4016') && rel4016.includes('4013'),
    { rel4013, rel4016 }
  );

  // 3. Thuận 2 chiều: cauPhanBietNhom và soTayGates
  const pb4013 = cauPhanBietNhom('4013', ['4013', '4016'], moTaCa168);
  check(
    '[OZV-2129 thuận 4013->4016] 4013 đứng đầu với [4013, 4016] sinh câu phân biệt từ ch40.chuong trỏ sang 40.16',
    pb4013.length === 1 &&
      pb4013[0].loai === 'PHAN_BIET_NHOM' &&
      pb4013[0].canCu === 'so-tay' &&
      pb4013[0].nguon === 'ch40.chuong' &&
      /40\.16/.test(pb4013[0].questionVi) &&
      /40\.13/.test(pb4013[0].questionVi),
    { pb4013 }
  );

  const pb4016 = cauPhanBietNhom('4016', ['4016', '4013'], moTaCa168);
  check(
    '[OZV-2129 thuận 4016->4013] 4016 đứng đầu với [4016, 4013] sinh câu phân biệt từ ch40.chuong trỏ sang 40.13',
    pb4016.length === 1 &&
      pb4016[0].loai === 'PHAN_BIET_NHOM' &&
      pb4016[0].canCu === 'so-tay' &&
      pb4016[0].nguon === 'ch40.chuong' &&
      /40\.13/.test(pb4016[0].questionVi) &&
      /40\.16/.test(pb4016[0].questionVi),
    { pb4016 }
  );

  const g4013To4016 = soTayGates({
    hs: '40139019',
    productText: 'Săm lốp máy xúc lật ở dạng miếng vá săm và vòng đệm bằng cao su lưu hóa',
    productName: 'Săm lốp máy xúc lật ở dạng miếng vá săm và vòng đệm bằng cao su lưu hóa',
    candidateHeadings: ['4013', '4016'],
  });
  const g4016To4013 = soTayGates({
    hs: '40169959',
    productText: 'Săm lốp máy xúc lật bằng cao su lắp vào lốp máy xúc lật',
    productName: 'Săm lốp máy xúc lật bằng cao su lắp vào lốp máy xúc lật',
    candidateHeadings: ['4016', '4013'],
  });
  check(
    '[OZV-2129 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 4013 -> 4016 và 4016 -> 4013',
    (g4013To4016.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('4016')) &&
      (g4016To4013.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('4013')),
    { g4013To4016: g4013To4016.challenges, g4016To4013: g4016To4013.challenges }
  );

  // 4. Đối chứng (ca âm): hàng không trùng từ khoá điều kiện không hỏi oan / không kéo oan
  const dcVongDem4013 = cauPhanBietNhom('4013', ['4013', '4016'], 'Vòng đệm bằng cao su lưu hóa dùng cho đường ống nước');
  const dcVongDem4016 = cauPhanBietNhom('4016', ['4016', '4013'], 'Vòng đệm bằng cao su lưu hóa dùng cho đường ống nước');
  const dcTamPhuSan4013 = cauPhanBietNhom('4013', ['4013', '4016'], 'Tấm phủ sàn bằng cao su lưu hóa cho tòa nhà');
  const dcTamPhuSan4016 = cauPhanBietNhom('4016', ['4016', '4013'], 'Tấm phủ sàn bằng cao su lưu hóa cho tòa nhà');
  const dcSamMayBay4013 = soTayGates({
    hs: '40139040',
    productText: 'Săm cao su sử dụng cho phương tiện bay',
    productName: 'Săm cao su sử dụng cho phương tiện bay',
    candidateHeadings: ['4013', '4016'],
  });
  const dcDemChongVa4016 = soTayGates({
    hs: '40169400',
    productText: 'Đệm chống va bằng cao su lưu hóa cho tàu thuyền hoặc ụ tàu',
    productName: 'Đệm chống va bằng cao su lưu hóa cho tàu thuyền hoặc ụ tàu',
    candidateHeadings: ['4016', '4013'],
  });
  check(
    '[OZV-2129 đối chứng] vòng đệm cao su, tấm phủ sàn, săm phương tiện bay và đệm chống va tàu thuyền không hỏi oan / không kéo oan 40.13 <-> 40.16',
    dcVongDem4013.length === 0 &&
      dcVongDem4016.length === 0 &&
      dcTamPhuSan4013.length === 0 &&
      dcTamPhuSan4016.length === 0 &&
      !(dcSamMayBay4013.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('4016')) &&
      !(dcDemChongVa4016.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('4013')) &&
      !D.moRongUngVien(['4013'], 'Đệm chống va bằng cao su lưu hóa cho tàu thuyền hoặc ụ tàu').some((x) => x.nhom === '4016') &&
      !D.moRongUngVien(['4016'], 'Vòng đệm bằng cao su lưu hóa dùng cho đường ống nước').some((x) => x.nhom === '4013'),
    { dcVongDem4013, dcVongDem4016, dcTamPhuSan4013, dcTamPhuSan4016 }
  );

  // 5. phanTichHoiTruoc4So tách 2 nhánh điều kiện riêng biệt cho ca 168
  const ht168 = phanTichHoiTruoc4So({ moTa: moTaCa168, ungVien: ['4013', '4016'] });
  const distinctDk168 = new Set((ht168.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2129 hoi-truoc-4so] ca 168 với [4013, 4016] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt',
    ht168.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk168 &&
      ['4013', '4016'].every((h) => (ht168.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht168.trangThai, distinctDk168, dapAnDieuKien: ht168.dapAnDieuKien }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OZV-2144 — Kiểm tra cạnh loại trừ 2 chiều 57.02 <-> 57.04 cho ca 126 tầng 4 số:
// "Thảm trải sàn họa tiết thổ cẩm / nỉ / trải sàn" (nhomNhan: ["5702", "5704", "5705"], heNhom: "5704").
{
  const moTaCa126 = 'Thảm trải sàn họa tiết thổ cẩm / nỉ / trải sàn';

  // 1. Căn cứ pháp lý nguyên văn
  const s5702 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '5702.json'), 'utf8'));
  const s5704 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '5704.json'), 'utf8'));
  const v5702 = S.verifySoTay(s5702, '5702');
  const v5704 = S.verifySoTay(s5704, '5704');
  check(
    '[OZV-2144 verifySoTay] sổ tay 5702 và 5704 đạt 100% (0 mục bị loại)',
    v5702.loai.length === 0 && v5704.loai.length === 0,
    { loai5702: v5702.loai, loai5704: v5704.loai }
  );

  const st5702 = loadSoTay('5702');
  const st5704 = loadSoTay('5704');
  const lt5702 = (st5702?.loaiTru || []).find((x) => x.sangNhom === '5704');
  const lt5704 = (st5704?.loaiTru || []).find((x) => x.sangNhom === '5702');
  check(
    '[OZV-2144 căn cứ] sổ tay 5702 và 5704 có mục loaiTru 2 chiều 5702 <-> 5704 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt5702 &&
        lt5702.nguon === 'ch57.chuong' &&
        lt5702.canCuLoaiTru?.nguon === 'nhom5704.nhom' &&
        S.checkItem('loaiTru', lt5702, S.sourcesFor('5702'), '5702') === null
    ) &&
      Boolean(
        lt5704 &&
          lt5704.nguon === 'nhom5704.nhom' &&
          lt5704.canCuLoaiTru?.nguon === 'nhom5702.nhom' &&
          S.checkItem('loaiTru', lt5704, S.sourcesFor('5704'), '5704') === null
      ),
    { lt5702, lt5704 }
  );

  // 2. Bảng cạnh đồ thị 2 chiều C5/C6 và mở rộng ứng viên
  const c5Tu5702 = D.canhTu('5702', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5704');
  const c5Tu5704 = D.canhTu('5704', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5702');
  const c6Tu5702 = D.canhTu('5702', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5704');
  const c6Tu5704 = D.canhTu('5704', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5702');
  const giua5702_5704 = D.canhGiuaNhomConSong(['5702', '5704']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu5702 = D.moRongUngVien(['5702'], moTaCa126, { toiDa: 10 });
  const mrTu5704 = D.moRongUngVien(['5704'], moTaCa126, { toiDa: 10 });
  check(
    '[OZV-2144 đồ thị 2 chiều] bảng cạnh có C5/C6 5702<->5704, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 126',
    c5Tu5702.some((e) => e.nguon === 'ch57.chuong' && e.canCuLoaiTru?.nguon === 'nhom5704.nhom') &&
      c5Tu5704.some((e) => e.nguon === 'nhom5704.nhom' && e.canCuLoaiTru?.nguon === 'nhom5702.nhom') &&
      c6Tu5702.length >= 1 &&
      c6Tu5704.length >= 1 &&
      giua5702_5704.length >= 2 &&
      mrTu5702.some((x) => x.nhom === '5704') &&
      mrTu5704.some((x) => x.nhom === '5702'),
    { c5Tu5702: c5Tu5702.length, c5Tu5704: c5Tu5704.length, giua: giua5702_5704.length, mrTu5702, mrTu5704 }
  );

  const rel5702 = nhomLienQuanSoTay('5702');
  const rel5704 = nhomLienQuanSoTay('5704');
  check(
    '[OZV-2144 nhomLienQuanSoTay] liên kết hai chiều 5702 <-> 5704',
    rel5702.includes('5704') && rel5704.includes('5702'),
    { rel5702, rel5704 }
  );

  // 3. Thuận 2 chiều: cauPhanBietNhom và soTayGates
  const pb5702 = cauPhanBietNhom('5702', ['5702', '5704'], moTaCa126);
  check(
    '[OZV-2144 thuận 5702->5704] 5702 đứng đầu với [5702, 5704] sinh câu phân biệt từ ch57.chuong trỏ sang 57.04',
    pb5702.length === 1 &&
      pb5702[0].loai === 'PHAN_BIET_NHOM' &&
      pb5702[0].canCu === 'so-tay' &&
      pb5702[0].nguon === 'ch57.chuong' &&
      /57\.04/.test(pb5702[0].questionVi) &&
      /57\.02/.test(pb5702[0].questionVi),
    { pb5702 }
  );

  const pb5704 = cauPhanBietNhom('5704', ['5704', '5702'], moTaCa126);
  check(
    '[OZV-2144 thuận 5704->5702] 5704 đứng đầu với [5704, 5702] sinh câu phân biệt từ nhom5704.nhom trỏ sang 57.02',
    pb5704.length === 1 &&
      pb5704[0].loai === 'PHAN_BIET_NHOM' &&
      pb5704[0].canCu === 'so-tay' &&
      pb5704[0].nguon === 'nhom5704.nhom' &&
      /57\.02/.test(pb5704[0].questionVi) &&
      /57\.04/.test(pb5704[0].questionVi),
    { pb5704 }
  );

  const g5702To5704 = soTayGates({
    hs: '57024290',
    productText: 'Thảm trải sàn và các loại hàng dệt trải sàn khác bằng nỉ (phớt - xơ ép hoặc xuyên kim)',
    productName: 'Thảm trải sàn và các loại hàng dệt trải sàn khác bằng nỉ (phớt - xơ ép hoặc xuyên kim)',
    candidateHeadings: ['5702', '5704'],
  });
  const g5704To5702 = soTayGates({
    hs: '57049000',
    productText: 'Thảm trải sàn dệt thoi họa tiết thổ cẩm kiểu Wilton hoặc Kelim (không phải bằng nỉ/phớt)',
    productName: 'Thảm trải sàn dệt thoi họa tiết thổ cẩm kiểu Wilton hoặc Kelim (không phải bằng nỉ/phớt)',
    candidateHeadings: ['5704', '5702'],
  });
  check(
    '[OZV-2144 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 5702 -> 5704 và 5704 -> 5702',
    (g5702To5704.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5704')) &&
      (g5704To5702.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5702')),
    { g5702To5704: g5702To5704.challenges, g5704To5702: g5704To5702.challenges }
  );

  // 4. Đối chứng (ca âm): hàng không trùng từ khoá điều kiện không hỏi oan / không kéo oan
  const dcTamChuiChan5702 = cauPhanBietNhom('5702', ['5702', '5704'], 'Tấm chùi chân ở cửa ra vào từ dừa (coir)');
  const dcTamChuiChan5704 = cauPhanBietNhom('5704', ['5704', '5702'], 'Tấm chùi chân ở cửa ra vào từ dừa (coir)');
  const dcTamGhep5702 = cauPhanBietNhom('5702', ['5702', '5704'], 'Các tấm để ghép có diện tích bề mặt tối đa là 0,3 m2');
  const dcTamGhep5704 = cauPhanBietNhom('5704', ['5704', '5702'], 'Các tấm để ghép có diện tích bề mặt tối đa là 0,3 m2');
  const dcGate5702 = soTayGates({
    hs: '57022000',
    productText: 'Tấm chùi chân ở cửa ra vào từ dừa (coir)',
    productName: 'Tấm chùi chân ở cửa ra vào từ dừa (coir)',
    candidateHeadings: ['5702', '5704'],
  });
  const dcGate5704 = soTayGates({
    hs: '57041000',
    productText: 'Các tấm để ghép có diện tích bề mặt tối đa là 0,3 m2',
    productName: 'Các tấm để ghép có diện tích bề mặt tối đa là 0,3 m2',
    candidateHeadings: ['5704', '5702'],
  });
  check(
    '[OZV-2144 đối chứng] tấm chùi chân ở cửa ra vào và các tấm để ghép diện tích <= 0,3 m2 không hỏi oan / không kéo oan 57.02 <-> 57.04',
    dcTamChuiChan5702.length === 0 &&
      dcTamChuiChan5704.length === 0 &&
      dcTamGhep5702.length === 0 &&
      dcTamGhep5704.length === 0 &&
      !(dcGate5702.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5704')) &&
      !(dcGate5704.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5702')) &&
      !D.moRongUngVien(['5702'], 'Tấm chùi chân ở cửa ra vào từ dừa (coir)').some((x) => x.nhom === '5704') &&
      !D.moRongUngVien(['5704'], 'Các tấm để ghép có diện tích bề mặt tối đa là 0,3 m2').some((x) => x.nhom === '5702'),
    { dcTamChuiChan5702, dcTamChuiChan5704, dcTamGhep5702, dcTamGhep5704 }
  );

  // 5. phanTichHoiTruoc4So tách 2 nhánh điều kiện riêng biệt cho ca 126
  const ht126 = phanTichHoiTruoc4So({ moTa: moTaCa126, ungVien: ['5702', '5704'] });
  const distinctDk126 = new Set((ht126.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2144 hoi-truoc-4so] ca 126 với [5702, 5704] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt',
    ht126.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk126 &&
      ['5702', '5704'].every((h) => (ht126.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht126.trangThai, distinctDk126, dapAnDieuKien: ht126.dapAnDieuKien }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OZV-2153 — Kiểm tra cạnh loại trừ 2 chiều 59.03 <-> 60.05 cho ca 124 tầng 4 số:
// "Vải gió dệt kim / None / None" (nhomNhan: ["5903","6001","6004","6005","6006"], heNhom: "6005").
{
  const moTaCa124 = 'Vải gió dệt kim / None / None';

  // 1. Căn cứ pháp lý nguyên văn
  const s5903 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '5903.json'), 'utf8'));
  const s6005 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '6005.json'), 'utf8'));
  const v5903 = S.verifySoTay(s5903, '5903');
  const v6005 = S.verifySoTay(s6005, '6005');
  check(
    '[OZV-2153 verifySoTay] sổ tay 5903 và 6005 đạt 100% (0 mục bị loại)',
    v5903.loai.length === 0 && v6005.loai.length === 0,
    { loai5903: v5903.loai, loai6005: v6005.loai }
  );

  const st5903 = loadSoTay('5903');
  const st6005 = loadSoTay('6005');
  const lt5903 = (st5903?.loaiTru || []).find((x) => x.sangNhom === '6005');
  const lt6005 = (st6005?.loaiTru || []).find((x) => x.sangNhom === '5903');
  check(
    '[OZV-2153 căn cứ] sổ tay 5903 và 6005 có mục loaiTru 2 chiều 5903 <-> 6005 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt5903 &&
        lt5903.nguon === 'nhom5903.nhom' &&
        lt5903.canCuLoaiTru?.nguon === 'nhom6005.nhom' &&
        S.checkItem('loaiTru', lt5903, S.sourcesFor('5903'), '5903') === null
    ) &&
      Boolean(
        lt6005 &&
          lt6005.nguon === 'ch60.chuong' &&
          lt6005.canCuLoaiTru?.nguon === 'nhom5903.nhom' &&
          S.checkItem('loaiTru', lt6005, S.sourcesFor('6005'), '6005') === null
      ),
    { lt5903, lt6005 }
  );

  // 2. Bảng cạnh đồ thị 2 chiều C5/C6 và mở rộng ứng viên
  const c5Tu5903 = D.canhTu('5903', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6005');
  const c5Tu6005 = D.canhTu('6005', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5903');
  const c6Tu5903 = D.canhTu('5903', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6005');
  const c6Tu6005 = D.canhTu('6005', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5903');
  const giua5903_6005 = D.canhGiuaNhomConSong(['5903', '6005']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu5903 = D.moRongUngVien(['5903'], moTaCa124, { toiDa: 10 });
  const mrTu6005 = D.moRongUngVien(['6005'], moTaCa124, { toiDa: 10 });
  check(
    '[OZV-2153 đồ thị 2 chiều] bảng cạnh có C5/C6 5903<->6005, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 124',
    c5Tu5903.some((e) => e.nguon === 'nhom5903.nhom' && e.canCuLoaiTru?.nguon === 'nhom6005.nhom') &&
      c5Tu6005.some((e) => e.nguon === 'ch60.chuong' && e.canCuLoaiTru?.nguon === 'nhom5903.nhom') &&
      c6Tu5903.length >= 1 &&
      c6Tu6005.length >= 1 &&
      giua5903_6005.length >= 2 &&
      mrTu5903.some((x) => x.nhom === '6005') &&
      mrTu6005.some((x) => x.nhom === '5903'),
    { c5Tu5903: c5Tu5903.length, c5Tu6005: c5Tu6005.length, giua: giua5903_6005.length, mrTu5903, mrTu6005 }
  );

  const rel5903 = nhomLienQuanSoTay('5903');
  const rel6005 = nhomLienQuanSoTay('6005');
  check(
    '[OZV-2153 nhomLienQuanSoTay] liên kết hai chiều 5903 <-> 6005',
    rel5903.includes('6005') && rel6005.includes('5903'),
    { rel5903, rel6005 }
  );

  // 3. Thuận 2 chiều: cauPhanBietNhom và soTayGates
  const pb5903 = cauPhanBietNhom('5903', ['5903', '6005'], moTaCa124);
  check(
    '[OZV-2153 thuận 5903->6005] 5903 đứng đầu với [5903, 6005] sinh câu phân biệt từ nhom5903.nhom trỏ sang 60.05',
    pb5903.length === 1 &&
      pb5903[0].loai === 'PHAN_BIET_NHOM' &&
      pb5903[0].canCu === 'so-tay' &&
      pb5903[0].nguon === 'nhom5903.nhom' &&
      /60\.05/.test(pb5903[0].questionVi) &&
      /59\.03/.test(pb5903[0].questionVi),
    { pb5903 }
  );

  const pb6005 = cauPhanBietNhom('6005', ['6005', '5903'], moTaCa124);
  check(
    '[OZV-2153 thuận 6005->5903] 6005 đứng đầu với [6005, 5903] sinh câu phân biệt từ ch60.chuong trỏ sang 59.03',
    pb6005.length === 1 &&
      pb6005[0].loai === 'PHAN_BIET_NHOM' &&
      pb6005[0].canCu === 'so-tay' &&
      pb6005[0].nguon === 'ch60.chuong' &&
      /59\.03/.test(pb6005[0].questionVi) &&
      /60\.05/.test(pb6005[0].questionVi),
    { pb6005 }
  );

  const g5903To6005 = soTayGates({
    hs: '59031090',
    productText: 'Vải gió dệt kim đan dọc khổ rộng trên 30 cm, không chứa hoặc chứa dưới 5% sợi đàn hồi/cao su, lớp plastic không nhận biết bằng mắt thường',
    productName: 'Vải gió dệt kim đan dọc khổ rộng trên 30 cm, không chứa hoặc chứa dưới 5% sợi đàn hồi/cao su, lớp plastic không nhận biết bằng mắt thường',
    candidateHeadings: ['5903', '6005'],
  });
  const g6005To5903 = soTayGates({
    hs: '60052100',
    productText: 'Vải gió dệt kim hoặc móc đã ngâm tẩm, tráng, phủ hoặc ép với plastic thuộc nhóm 59.03',
    productName: 'Vải gió dệt kim hoặc móc đã ngâm tẩm, tráng, phủ hoặc ép với plastic thuộc nhóm 59.03',
    candidateHeadings: ['6005', '5903'],
  });
  check(
    '[OZV-2153 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 5903 -> 6005 và 6005 -> 5903',
    (g5903To6005.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6005')) &&
      (g6005To5903.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5903')),
    { g5903To6005: g5903To6005.challenges, g6005To5903: g6005To5903.challenges }
  );

  // 4. Đối chứng (ca âm): hàng không trùng từ khoá điều kiện không hỏi oan / không kéo oan
  const dcBang5903 = cauPhanBietNhom('5903', ['5903', '6005'], 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ');
  const dcBang6005 = cauPhanBietNhom('6005', ['6005', '5903'], 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ');
  const dcNhan5903 = cauPhanBietNhom('5903', ['5903', '6005'], 'Nhãn phù hiệu dệt kim hoặc móc thuộc nhóm 58.07');
  const dcNhan6005 = cauPhanBietNhom('6005', ['6005', '5903'], 'Nhãn phù hiệu dệt kim hoặc móc thuộc nhóm 58.07');
  const dcGate5903 = soTayGates({
    hs: '59031010',
    productText: 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ',
    productName: 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ',
    candidateHeadings: ['5903', '6005'],
  });
  const dcGate6005 = soTayGates({
    hs: '60052200',
    productText: 'Nhãn phù hiệu dệt kim hoặc móc thuộc nhóm 58.07',
    productName: 'Nhãn phù hiệu dệt kim hoặc móc thuộc nhóm 58.07',
    candidateHeadings: ['6005', '5903'],
  });
  check(
    '[OZV-2153 đối chứng] băng tẩm thuốc và nhãn phù hiệu không hỏi oan / không kéo oan 59.03 <-> 60.05',
    dcBang5903.length === 0 &&
      dcBang6005.length === 0 &&
      dcNhan5903.length === 0 &&
      dcNhan6005.length === 0 &&
      !(dcGate5903.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6005')) &&
      !(dcGate6005.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5903')) &&
      !D.moRongUngVien(['5903'], 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ').some((x) => x.nhom === '6005') &&
      !D.moRongUngVien(['6005'], 'Nhãn phù hiệu dệt kim hoặc móc thuộc nhóm 58.07').some((x) => x.nhom === '5903'),
    { dcBang5903, dcBang6005, dcNhan5903, dcNhan6005 }
  );

  // 5. phanTichHoiTruoc4So tách 2 nhánh điều kiện riêng biệt cho ca 124
  const ht124 = phanTichHoiTruoc4So({ moTa: moTaCa124, ungVien: ['5903', '6005'] });
  const distinctDk124 = new Set((ht124.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2153 hoi-truoc-4so] ca 124 với [5903, 6005] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt',
    ht124.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk124 &&
      ['5903', '6005'].every((h) => (ht124.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht124.trangThai, distinctDk124, dapAnDieuKien: ht124.dapAnDieuKien }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OZV-2162 — Kiểm tra cạnh loại trừ 2 chiều 84.49 <-> 85.15 cho ca 183 tầng 4 số:
// "Máy dập quai hàn khẩu trang / None / dập quai hàn khẩu trang" (nhomNhan: ["8449", "8515"], heNhom: "8515").
{
  const moTaCa183 = 'Máy dập quai hàn khẩu trang / None / dập quai hàn khẩu trang';

  // 1. Căn cứ pháp lý nguyên văn
  const s8449 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '8449.json'), 'utf8'));
  const s8515 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '8515.json'), 'utf8'));
  const v8449 = S.verifySoTay(s8449, '8449');
  const v8515 = S.verifySoTay(s8515, '8515');
  check(
    '[OZV-2162 verifySoTay] sổ tay 8449 và 8515 đạt 100% (0 mục bị loại)',
    v8449.loai.length === 0 && v8515.loai.length === 0,
    { loai8449: v8449.loai, loai8515: v8515.loai }
  );

  const st8449 = loadSoTay('8449');
  const st8515 = loadSoTay('8515');
  const lt8449 = (st8449?.loaiTru || []).find((x) => x.sangNhom === '8515');
  const lt8515 = (st8515?.loaiTru || []).find((x) => x.sangNhom === '8449');
  check(
    '[OZV-2162 căn cứ] sổ tay 8449 và 8515 có mục loaiTru 2 chiều 8449 <-> 8515 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt8449 &&
        lt8449.nguon === 'nhom8449.nhom' &&
        lt8449.canCuLoaiTru?.nguon === 'nhom8515.nhom' &&
        S.checkItem('loaiTru', lt8449, S.sourcesFor('8449'), '8449') === null
    ) &&
      Boolean(
        lt8515 &&
          lt8515.nguon === 'nhom8515.nhom' &&
          lt8515.canCuLoaiTru?.nguon === 'nhom8449.nhom' &&
          S.checkItem('loaiTru', lt8515, S.sourcesFor('8515'), '8515') === null
      ),
    { lt8449, lt8515 }
  );

  // 2. Bảng cạnh đồ thị 2 chiều C5/C6 và mở rộng ứng viên
  const c5Tu8449 = D.canhTu('8449', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8515');
  const c5Tu8515 = D.canhTu('8515', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8449');
  const c6Tu8449 = D.canhTu('8449', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8515');
  const c6Tu8515 = D.canhTu('8515', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8449');
  const giua8449_8515 = D.canhGiuaNhomConSong(['8449', '8515']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu8449 = D.moRongUngVien(['8449'], moTaCa183, { toiDa: 10 });
  const mrTu8515 = D.moRongUngVien(['8515'], moTaCa183, { toiDa: 10 });
  check(
    '[OZV-2162 đồ thị 2 chiều] bảng cạnh có C5/C6 8449<->8515, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 183',
    c5Tu8449.some((e) => e.nguon === 'nhom8449.nhom' && e.canCuLoaiTru?.nguon === 'nhom8515.nhom') &&
      c5Tu8515.some((e) => e.nguon === 'nhom8515.nhom' && e.canCuLoaiTru?.nguon === 'nhom8449.nhom') &&
      c6Tu8449.length >= 1 &&
      c6Tu8515.length >= 1 &&
      giua8449_8515.length >= 2 &&
      mrTu8449.some((x) => x.nhom === '8515') &&
      mrTu8515.some((x) => x.nhom === '8449'),
    { c5Tu8449: c5Tu8449.length, c5Tu8515: c5Tu8515.length, giua: giua8449_8515.length, mrTu8449, mrTu8515 }
  );

  const rel8449 = nhomLienQuanSoTay('8449');
  const rel8515 = nhomLienQuanSoTay('8515');
  check(
    '[OZV-2162 nhomLienQuanSoTay] liên kết hai chiều 8449 <-> 8515',
    rel8449.includes('8515') && rel8515.includes('8449'),
    { rel8449, rel8515 }
  );

  // 3. Thuận 2 chiều: cauPhanBietNhom và soTayGates
  const pb8449 = cauPhanBietNhom('8449', ['8449', '8515'], moTaCa183);
  check(
    '[OZV-2162 thuận 8449->8515] 8449 đứng đầu với [8449, 8515] sinh câu phân biệt từ nhom8449.nhom trỏ sang 85.15',
    pb8449.length === 1 &&
      pb8449[0].loai === 'PHAN_BIET_NHOM' &&
      pb8449[0].canCu === 'so-tay' &&
      pb8449[0].nguon === 'nhom8449.nhom' &&
      /85\.15/.test(pb8449[0].questionVi) &&
      /84\.49/.test(pb8449[0].questionVi),
    { pb8449 }
  );

  const pb8515 = cauPhanBietNhom('8515', ['8515', '8449'], moTaCa183);
  check(
    '[OZV-2162 thuận 8515->8449] 8515 đứng đầu với [8515, 8449] sinh câu phân biệt từ nhom8515.nhom trỏ sang 84.49',
    pb8515.length === 1 &&
      pb8515[0].loai === 'PHAN_BIET_NHOM' &&
      pb8515[0].canCu === 'so-tay' &&
      pb8515[0].nguon === 'nhom8515.nhom' &&
      /84\.49/.test(pb8515[0].questionVi) &&
      /85\.15/.test(pb8515[0].questionVi),
    { pb8515 }
  );

  const g8449To8515 = soTayGates({
    hs: '84490000',
    productText: moTaCa183,
    productName: moTaCa183,
    candidateHeadings: ['8449', '8515'],
  });
  const g8515To8449 = soTayGates({
    hs: '85158090',
    productText: moTaCa183,
    productName: moTaCa183,
    candidateHeadings: ['8515', '8449'],
  });
  check(
    '[OZV-2162 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 8449 -> 8515 và 8515 -> 8449',
    (g8449To8515.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8515')) &&
      (g8515To8449.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8449')),
    { g8449To8515: g8449To8515.challenges, g8515To8449: g8515To8449.challenges }
  );

  // 4. Đối chứng (ca âm): hàng không trùng từ khoá điều kiện không hỏi oan / không kéo oan
  const dcHan8449 = cauPhanBietNhom('8449', ['8449', '8515'], 'Máy hàn hồ quang tay');
  const dcHan8515 = cauPhanBietNhom('8515', ['8515', '8449'], 'Máy hàn hồ quang tay');
  const dcNi8449 = cauPhanBietNhom('8449', ['8449', '8515'], 'Máy sản xuất nỉ phớt bằng tấm kim loại');
  const dcNi8515 = cauPhanBietNhom('8515', ['8515', '8449'], 'Máy sản xuất nỉ phớt bằng tấm kim loại');
  const dcGate8449 = soTayGates({
    hs: '84490000',
    productText: 'Máy sản xuất nỉ phớt bằng tấm kim loại',
    productName: 'Máy sản xuất nỉ phớt bằng tấm kim loại',
    candidateHeadings: ['8449', '8515'],
  });
  const dcGate8515 = soTayGates({
    hs: '85153100',
    productText: 'Máy hàn hồ quang tay',
    productName: 'Máy hàn hồ quang tay',
    candidateHeadings: ['8515', '8449'],
  });
  check(
    '[OZV-2162 đối chứng] máy hàn hồ quang và máy sản xuất nỉ phớt không hỏi oan / không kéo oan 84.49 <-> 85.15',
    dcHan8449.length === 0 &&
      dcHan8515.length === 0 &&
      dcNi8449.length === 0 &&
      dcNi8515.length === 0 &&
      !(dcGate8449.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8515')) &&
      !(dcGate8515.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8449')) &&
      !D.moRongUngVien(['8449'], 'Máy sản xuất nỉ phớt bằng tấm kim loại').some((x) => x.nhom === '8515') &&
      !D.moRongUngVien(['8515'], 'Máy hàn hồ quang tay').some((x) => x.nhom === '8449'),
    { dcHan8449, dcHan8515, dcNi8449, dcNi8515 }
  );

  // 5. phanTichHoiTruoc4So tách 2 nhánh điều kiện riêng biệt cho ca 183
  const ht183 = phanTichHoiTruoc4So({ moTa: moTaCa183, ungVien: ['8449', '8515'] });
  const distinctDk183 = new Set((ht183.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2162 hoi-truoc-4so] ca 183 với [8449, 8515] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt',
    ht183.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk183 &&
      ['8449', '8515'].every((h) => (ht183.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht183.trangThai, distinctDk183, dapAnDieuKien: ht183.dapAnDieuKien }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OZV-2164 — Kiểm tra cạnh loại trừ 2 chiều 59.03 <-> 60.06 cho ca 124 tầng 4 số:
// "Vải gió dệt kim / None / None" (nhomNhan: ["5903","6001","6004","6005","6006"], heNhom: "6005").
{
  const moTaCa124 = 'Vải gió dệt kim / None / None';

  // 1. Căn cứ pháp lý nguyên văn
  const s5903 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '5903.json'), 'utf8'));
  const s6006 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '6006.json'), 'utf8'));
  const v5903 = S.verifySoTay(s5903, '5903');
  const v6006 = S.verifySoTay(s6006, '6006');
  check(
    '[OZV-2164 verifySoTay] sổ tay 5903 và 6006 đạt 100% (0 mục bị loại)',
    v5903.loai.length === 0 && v6006.loai.length === 0,
    { loai5903: v5903.loai, loai6006: v6006.loai }
  );

  const st5903 = loadSoTay('5903');
  const st6006 = loadSoTay('6006');
  const lt5903 = (st5903?.loaiTru || []).find((x) => x.sangNhom === '6006');
  const lt6006 = (st6006?.loaiTru || []).find((x) => x.sangNhom === '5903');
  check(
    '[OZV-2164 căn cứ] sổ tay 5903 và 6006 có mục loaiTru 2 chiều 5903 <-> 6006 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt5903 &&
        lt5903.nguon === 'nhom5903.nhom' &&
        lt5903.canCuLoaiTru?.nguon === 'nhom6006.nhom' &&
        S.checkItem('loaiTru', lt5903, S.sourcesFor('5903'), '5903') === null
    ) &&
      Boolean(
        lt6006 &&
          lt6006.nguon === 'ch60.chuong' &&
          lt6006.canCuLoaiTru?.nguon === 'nhom5903.nhom' &&
          S.checkItem('loaiTru', lt6006, S.sourcesFor('6006'), '6006') === null
      ),
    { lt5903, lt6006 }
  );

  // 2. Bảng cạnh đồ thị 2 chiều C5/C6 và mở rộng ứng viên
  const c5Tu5903 = D.canhTu('5903', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6006');
  const c5Tu6006 = D.canhTu('6006', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5903');
  const c6Tu5903 = D.canhTu('5903', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6006');
  const c6Tu6006 = D.canhTu('6006', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5903');
  const giua5903_6006 = D.canhGiuaNhomConSong(['5903', '6006']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu5903 = D.moRongUngVien(['5903'], moTaCa124, { toiDa: 10 });
  const mrTu6006 = D.moRongUngVien(['6006'], moTaCa124, { toiDa: 10 });
  check(
    '[OZV-2164 đồ thị 2 chiều] bảng cạnh có C5/C6 5903<->6006, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 124',
    c5Tu5903.some((e) => e.nguon === 'nhom5903.nhom' && e.canCuLoaiTru?.nguon === 'nhom6006.nhom') &&
      c5Tu6006.some((e) => e.nguon === 'ch60.chuong' && e.canCuLoaiTru?.nguon === 'nhom5903.nhom') &&
      c6Tu5903.length >= 1 &&
      c6Tu6006.length >= 1 &&
      giua5903_6006.length >= 2 &&
      mrTu5903.some((x) => x.nhom === '6006') &&
      mrTu6006.some((x) => x.nhom === '5903'),
    { c5Tu5903: c5Tu5903.length, c5Tu6006: c5Tu6006.length, giua: giua5903_6006.length, mrTu5903, mrTu6006 }
  );

  const rel5903 = nhomLienQuanSoTay('5903');
  const rel6006 = nhomLienQuanSoTay('6006');
  check(
    '[OZV-2164 nhomLienQuanSoTay] liên kết hai chiều 5903 <-> 6006',
    rel5903.includes('6006') && rel6006.includes('5903'),
    { rel5903, rel6006 }
  );

  // 3. Thuận 2 chiều: cauPhanBietNhom và soTayGates
  const pb5903 = cauPhanBietNhom('5903', ['5903', '6006'], moTaCa124);
  check(
    '[OZV-2164 thuận 5903->6006] 5903 đứng đầu với [5903, 6006] sinh câu phân biệt từ nhom5903.nhom trỏ sang 60.06',
    pb5903.length === 1 &&
      pb5903[0].loai === 'PHAN_BIET_NHOM' &&
      pb5903[0].canCu === 'so-tay' &&
      pb5903[0].nguon === 'nhom5903.nhom' &&
      /60\.06/.test(pb5903[0].questionVi) &&
      /59\.03/.test(pb5903[0].questionVi),
    { pb5903 }
  );

  const pb6006 = cauPhanBietNhom('6006', ['6006', '5903'], moTaCa124);
  check(
    '[OZV-2164 thuận 6006->5903] 6006 đứng đầu với [6006, 5903] sinh câu phân biệt từ ch60.chuong trỏ sang 59.03',
    pb6006.length === 1 &&
      pb6006[0].loai === 'PHAN_BIET_NHOM' &&
      pb6006[0].canCu === 'so-tay' &&
      pb6006[0].nguon === 'ch60.chuong' &&
      /59\.03/.test(pb6006[0].questionVi) &&
      /60\.06/.test(pb6006[0].questionVi),
    { pb6006 }
  );

  const g5903To6006 = soTayGates({
    hs: '59031090',
    productText: 'Vải gió dệt kim sợi ngang hoặc vải móc khác khổ rộng hơn 30 cm, không chứa hoặc chứa dưới 5% sợi đàn hồi/cao su, lớp plastic không nhận biết bằng mắt thường',
    productName: 'Vải gió dệt kim sợi ngang hoặc vải móc khác khổ rộng hơn 30 cm, không chứa hoặc chứa dưới 5% sợi đàn hồi/cao su, lớp plastic không nhận biết bằng mắt thường',
    candidateHeadings: ['5903', '6006'],
  });
  const g6006To5903 = soTayGates({
    hs: '60062100',
    productText: 'Vải gió dệt kim hoặc móc đã ngâm tẩm, tráng, phủ hoặc ép với plastic thuộc nhóm 59.03',
    productName: 'Vải gió dệt kim hoặc móc đã ngâm tẩm, tráng, phủ hoặc ép với plastic thuộc nhóm 59.03',
    candidateHeadings: ['6006', '5903'],
  });
  check(
    '[OZV-2164 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 5903 -> 6006 và 6006 -> 5903',
    (g5903To6006.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6006')) &&
      (g6006To5903.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5903')),
    { g5903To6006: g5903To6006.challenges, g6006To5903: g6006To5903.challenges }
  );

  // 4. Đối chứng (ca âm): hàng không trùng từ khoá điều kiện không hỏi oan / không kéo oan
  const dcBang5903 = cauPhanBietNhom('5903', ['5903', '6006'], 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ');
  const dcBang6006 = cauPhanBietNhom('6006', ['6006', '5903'], 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ');
  const dcNhan5903 = cauPhanBietNhom('5903', ['5903', '6006'], 'Nhãn phù hiệu dệt kim hoặc móc thuộc nhóm 58.07');
  const dcNhan6006 = cauPhanBietNhom('6006', ['6006', '5903'], 'Nhãn phù hiệu dệt kim hoặc móc thuộc nhóm 58.07');
  const dcGate5903 = soTayGates({
    hs: '59031010',
    productText: 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ',
    productName: 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ',
    candidateHeadings: ['5903', '6006'],
  });
  const dcGate6006 = soTayGates({
    hs: '60062200',
    productText: 'Nhãn phù hiệu dệt kim hoặc móc thuộc nhóm 58.07',
    productName: 'Nhãn phù hiệu dệt kim hoặc móc thuộc nhóm 58.07',
    candidateHeadings: ['6006', '5903'],
  });
  check(
    '[OZV-2164 đối chứng] băng tẩm thuốc và nhãn phù hiệu không hỏi oan / không kéo oan 59.03 <-> 60.06',
    dcBang5903.length === 0 &&
      dcBang6006.length === 0 &&
      dcNhan5903.length === 0 &&
      dcNhan6006.length === 0 &&
      !(dcGate5903.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6006')) &&
      !(dcGate6006.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5903')) &&
      !D.moRongUngVien(['5903'], 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ').some((x) => x.nhom === '6006') &&
      !D.moRongUngVien(['6006'], 'Nhãn phù hiệu dệt kim hoặc móc thuộc nhóm 58.07').some((x) => x.nhom === '5903'),
    { dcBang5903, dcBang6006, dcNhan5903, dcNhan6006 }
  );

  // 5. phanTichHoiTruoc4So tách 2 nhánh điều kiện riêng biệt cho ca 124
  const ht124 = phanTichHoiTruoc4So({ moTa: moTaCa124, ungVien: ['5903', '6006'] });
  const distinctDk124 = new Set((ht124.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2164 hoi-truoc-4so] ca 124 với [5903, 6006] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt',
    ht124.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk124 &&
      ['5903', '6006'].every((h) => (ht124.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht124.trangThai, distinctDk124, dapAnDieuKien: ht124.dapAnDieuKien }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OZV-2170 — Kiểm tra cạnh loại trừ 2 chiều 60.01 <-> 60.06 cho ca 124 tầng 4 số:
// "Vải gió dệt kim / None / None" (nhomNhan: ["5903","6001","6004","6005","6006"], heNhom: "6005").
{
  const moTaCa124 = 'Vải gió dệt kim / None / None';

  // 1. Căn cứ pháp lý nguyên văn
  const s6001 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '6001.json'), 'utf8'));
  const s6006 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '6006.json'), 'utf8'));
  const v6001 = S.verifySoTay(s6001, '6001');
  const v6006 = S.verifySoTay(s6006, '6006');
  check(
    '[OZV-2170 verifySoTay] sổ tay 6001 và 6006 đạt 100% (0 mục bị loại)',
    v6001.loai.length === 0 && v6006.loai.length === 0,
    { loai6001: v6001.loai, loai6006: v6006.loai }
  );

  const st6001 = loadSoTay('6001');
  const st6006 = loadSoTay('6006');
  const lt6001 = (st6001?.loaiTru || []).find((x) => x.sangNhom === '6006');
  const lt6006 = (st6006?.loaiTru || []).find((x) => x.sangNhom === '6001');
  check(
    '[OZV-2170 căn cứ] sổ tay 6001 và 6006 có mục loaiTru 2 chiều 6001 <-> 6006 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt6001 &&
        lt6001.nguon === 'nhom6001.nhom' &&
        lt6001.canCuLoaiTru?.nguon === 'nhom6006.nhom' &&
        S.checkItem('loaiTru', lt6001, S.sourcesFor('6001'), '6001') === null
    ) &&
      Boolean(
        lt6006 &&
          lt6006.nguon === 'ch60.chuong' &&
          lt6006.canCuLoaiTru?.nguon === 'nhom6001.nhom' &&
          S.checkItem('loaiTru', lt6006, S.sourcesFor('6006'), '6006') === null
      ),
    { lt6001, lt6006 }
  );

  // 2. Bảng cạnh đồ thị 2 chiều C5/C6 và mở rộng ứng viên
  const c5Tu6001 = D.canhTu('6001', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6006');
  const c5Tu6006 = D.canhTu('6006', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6001');
  const c6Tu6001 = D.canhTu('6001', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6006');
  const c6Tu6006 = D.canhTu('6006', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6001');
  const giua6001_6006 = D.canhGiuaNhomConSong(['6001', '6006']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu6001 = D.moRongUngVien(['6001'], moTaCa124, { toiDa: 10 });
  const mrTu6006 = D.moRongUngVien(['6006'], moTaCa124, { toiDa: 10 });
  check(
    '[OZV-2170 đồ thị 2 chiều] bảng cạnh có C5/C6 6001<->6006, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 124',
    c5Tu6001.some((e) => e.nguon === 'nhom6001.nhom' && e.canCuLoaiTru?.nguon === 'nhom6006.nhom') &&
      c5Tu6006.some((e) => e.nguon === 'ch60.chuong' && e.canCuLoaiTru?.nguon === 'nhom6001.nhom') &&
      c6Tu6001.length >= 1 &&
      c6Tu6006.length >= 1 &&
      giua6001_6006.length >= 2 &&
      mrTu6001.some((x) => x.nhom === '6006') &&
      mrTu6006.some((x) => x.nhom === '6001'),
    { c5Tu6001: c5Tu6001.length, c5Tu6006: c5Tu6006.length, giua: giua6001_6006.length, mrTu6001, mrTu6006 }
  );

  const rel6001 = nhomLienQuanSoTay('6001');
  const rel6006 = nhomLienQuanSoTay('6006');
  check(
    '[OZV-2170 nhomLienQuanSoTay] liên kết hai chiều 6001 <-> 6006',
    rel6001.includes('6006') && rel6006.includes('6001'),
    { rel6001, rel6006 }
  );

  // 3. Thuận 2 chiều: cauPhanBietNhom và soTayGates
  const pb6001 = cauPhanBietNhom('6001', ['6001', '6006'], moTaCa124);
  check(
    '[OZV-2170 thuận 6001->6006] 6001 đứng đầu với [6001, 6006] sinh câu phân biệt từ nhom6001.nhom trỏ sang 60.06',
    pb6001.length === 1 &&
      pb6001[0].loai === 'PHAN_BIET_NHOM' &&
      pb6001[0].canCu === 'so-tay' &&
      pb6001[0].nguon === 'nhom6001.nhom' &&
      /60\.06/.test(pb6001[0].questionVi) &&
      /60\.01/.test(pb6001[0].questionVi),
    { pb6001 }
  );

  const pb6006 = cauPhanBietNhom('6006', ['6006', '6001'], moTaCa124);
  check(
    '[OZV-2170 thuận 6006->6001] 6006 đứng đầu với [6006, 6001] sinh câu phân biệt từ ch60.chuong trỏ sang 60.01',
    pb6006.length === 1 &&
      pb6006[0].loai === 'PHAN_BIET_NHOM' &&
      pb6006[0].canCu === 'so-tay' &&
      pb6006[0].nguon === 'ch60.chuong' &&
      /60\.01/.test(pb6006[0].questionVi) &&
      /60\.06/.test(pb6006[0].questionVi),
    { pb6006 }
  );

  const g6001To6006 = soTayGates({
    hs: '60019290',
    productText: 'Vải gió dệt kim sợi ngang, kể cả vải móc khác có khổ rộng hơn 30 cm, không chứa hoặc chứa dưới 5% sợi đàn hồi hoặc sợi cao su',
    productName: 'Vải gió dệt kim sợi ngang, kể cả vải móc khác có khổ rộng hơn 30 cm, không chứa hoặc chứa dưới 5% sợi đàn hồi hoặc sợi cao su',
    candidateHeadings: ['6001', '6006'],
  });
  const g6006To6001 = soTayGates({
    hs: '60062100',
    productText: 'Vải gió dệt kim nổi vòng (pile), kể cả vải vòng lông dài (long pile), vải bông xù giả (imitation terry)',
    productName: 'Vải gió dệt kim nổi vòng (pile), kể cả vải vòng lông dài (long pile), vải bông xù giả (imitation terry)',
    candidateHeadings: ['6006', '6001'],
  });
  check(
    '[OZV-2170 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 6001 -> 6006 và 6006 -> 6001',
    (g6001To6006.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6006')) &&
      (g6006To6001.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6001')),
    { g6001To6006: g6001To6006.challenges, g6006To6001: g6006To6001.challenges }
  );

  // 4. Đối chứng (ca âm): hàng không trùng từ khoá điều kiện không hỏi oan / không kéo oan
  const dcBang6001 = cauPhanBietNhom('6001', ['6001', '6006'], 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ');
  const dcBang6006 = cauPhanBietNhom('6006', ['6006', '6001'], 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ');
  const dcNhan6001 = cauPhanBietNhom('6001', ['6001', '6006'], 'Nhãn phù hiệu dệt kim hoặc móc thuộc nhóm 58.07');
  const dcNhan6006 = cauPhanBietNhom('6006', ['6006', '6001'], 'Nhãn phù hiệu dệt kim hoặc móc thuộc nhóm 58.07');
  const dcGate6001 = soTayGates({
    hs: '60012100',
    productText: 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ',
    productName: 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ',
    candidateHeadings: ['6001', '6006'],
  });
  const dcGate6006 = soTayGates({
    hs: '60062200',
    productText: 'Nhãn phù hiệu dệt kim hoặc móc thuộc nhóm 58.07',
    productName: 'Nhãn phù hiệu dệt kim hoặc móc thuộc nhóm 58.07',
    candidateHeadings: ['6006', '6001'],
  });
  check(
    '[OZV-2170 đối chứng] băng tẩm thuốc và nhãn phù hiệu không hỏi oan / không kéo oan 60.01 <-> 60.06',
    dcBang6001.length === 0 &&
      dcBang6006.length === 0 &&
      dcNhan6001.length === 0 &&
      dcNhan6006.length === 0 &&
      !(dcGate6001.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6006')) &&
      !(dcGate6006.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6001')) &&
      !D.moRongUngVien(['6001'], 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ').some((x) => x.nhom === '6006') &&
      !D.moRongUngVien(['6006'], 'Nhãn phù hiệu dệt kim hoặc móc thuộc nhóm 58.07').some((x) => x.nhom === '6001'),
    { dcBang6001, dcBang6006, dcNhan6001, dcNhan6006 }
  );

  // 5. phanTichHoiTruoc4So tách 2 nhánh điều kiện riêng biệt cho ca 124
  const ht124 = phanTichHoiTruoc4So({ moTa: moTaCa124, ungVien: ['6001', '6006'] });
  const distinctDk124 = new Set((ht124.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2170 hoi-truoc-4so] ca 124 với [6001, 6006] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt',
    ht124.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk124 &&
      ['6001', '6006'].every((h) => (ht124.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht124.trangThai, distinctDk124, dapAnDieuKien: ht124.dapAnDieuKien }
  );
}

console.log(`\nOZV-2109 / OZV-2118 / OZV-2121 / OZV-2129 / OZV-2144 / OZV-2153 / OZV-2162 / OZV-2164 / OZV-2170 cạnh loại trừ 2 chiều: ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
