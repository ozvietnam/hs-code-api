#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-2159 — Kiểm tra cạnh loại trừ 2 chiều 84.12 <-> 84.25 cho ca 181 tầng 4 số:
 * "Xi lanh thủy lực / None / máy móc công nghiệp"
 * (nhomNhan: ["8412"], heNhom: "8425").
 *
 * Kiểm đủ:
 *   1. verifySoTay 8412 & 8425 đạt 0 mục bị loại; checkItem loaiTru 2 chiều + canCuLoaiTru.
 *   2. Đồ thị C5/C6 2 chiều 8412 <-> 8425, canhGiuaNhomConSong, moRongUngVien kéo 2 chiều.
 *   3. nhomLienQuanSoTay 2 chiều.
 *   4. Thuận: cauPhanBietNhom, soTayGates, phanTichHoiTruoc4So.
 *   5. Đối chứng: mô tả không khớp điều kiện → không hỏi oan / không kéo oan.
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

const moTaCa181 = 'Xi lanh thủy lực / None / máy móc công nghiệp';
// Mô tả khớp cả hai dieuKien để moRongUngVien / cauPhanBietNhom đo được 2 chiều.
const moTaKhop181 =
  'Xi lanh thủy lực hoặc khí nén; hoặc kích / hệ tời / hệ ròng rọc hoàn chỉnh (thiết bị nâng hoặc xếp hàng đơn giản), không phải xi lanh thủy lực hoặc khí nén riêng lẻ';
const dk8412Sang8425 =
  'Kích / hệ tời / hệ ròng rọc hoàn chỉnh (thiết bị nâng hoặc xếp hàng đơn giản), không phải xi lanh thủy lực hoặc khí nén riêng lẻ';
const dk8425Sang8412 = 'Xi lanh thủy lực hoặc khí nén';

{
  const s8412 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '8412.json'), 'utf8'));
  const s8425 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '8425.json'), 'utf8'));
  const v8412 = S.verifySoTay(s8412, '8412');
  const v8425 = S.verifySoTay(s8425, '8425');
  check(
    '[OZV-2159 verifySoTay] sổ tay 8412 và 8425 đạt 100% (0 mục bị loại)',
    v8412.loai.length === 0 && v8425.loai.length === 0,
    { loai8412: v8412.loai, loai8425: v8425.loai }
  );

  const st8412 = loadSoTay('8412');
  const st8425 = loadSoTay('8425');
  const lt8412 = (st8412?.loaiTru || []).find((x) => x.sangNhom === '8425');
  const lt8425 = (st8425?.loaiTru || []).find((x) => x.sangNhom === '8412');
  check(
    '[OZV-2159 căn cứ] sổ tay 8412 và 8425 có mục loaiTru 2 chiều 8412 <-> 8425 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt8412 &&
        lt8412.nguon === 'ch84.chuong' &&
        lt8412.canCuLoaiTru?.nguon === 'nhom8425.nhom' &&
        S.checkItem('loaiTru', lt8412, S.sourcesFor('8412'), '8412') === null
    ) &&
      Boolean(
        lt8425 &&
          lt8425.nguon === 'nhom8425.nhom' &&
          lt8425.canCuLoaiTru?.nguon === 'nhom8412.nhom' &&
          S.checkItem('loaiTru', lt8425, S.sourcesFor('8425'), '8425') === null
      ),
    { lt8412, lt8425 }
  );
  check(
    '[OZV-2159 dieuKien] hai chiều 8412 <-> 8425 tách biệt (không dùng chung một chuỗi điều kiện)',
    Boolean(lt8412 && lt8425) &&
      lt8412.dieuKien === dk8412Sang8425 &&
      lt8425.dieuKien === dk8425Sang8412 &&
      lt8412.dieuKien !== lt8425.dieuKien &&
      !/;/.test(lt8412.dieuKien) &&
      !/;/.test(lt8425.dieuKien),
    { dk8412: lt8412?.dieuKien, dk8425: lt8425?.dieuKien }
  );

  const c5Tu8412 = D.canhTu('8412', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8425');
  const c5Tu8425 = D.canhTu('8425', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8412');
  const c6Tu8412 = D.canhTu('8412', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8425');
  const c6Tu8425 = D.canhTu('8425', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8412');
  const giua8412_8425 = D.canhGiuaNhomConSong(['8412', '8425']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu8412 = D.moRongUngVien(['8412'], moTaKhop181, { toiDa: 10 });
  const mrTu8425 = D.moRongUngVien(['8425'], moTaKhop181, { toiDa: 10 });
  check(
    '[OZV-2159 đồ thị 2 chiều] bảng cạnh có C5/C6 8412<->8425, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 181',
    c5Tu8412.some((e) => e.nguon === 'ch84.chuong' && e.canCuLoaiTru?.nguon === 'nhom8425.nhom') &&
      c5Tu8425.some((e) => e.nguon === 'nhom8425.nhom' && e.canCuLoaiTru?.nguon === 'nhom8412.nhom') &&
      c6Tu8412.length >= 1 &&
      c6Tu8425.length >= 1 &&
      giua8412_8425.length >= 2 &&
      mrTu8412.some((x) => x.nhom === '8425') &&
      mrTu8425.some((x) => x.nhom === '8412'),
    {
      c5Tu8412: c5Tu8412.length,
      c5Tu8425: c5Tu8425.length,
      giua: giua8412_8425.length,
      mrTu8412,
      mrTu8425,
    }
  );

  const rel8412 = nhomLienQuanSoTay('8412');
  const rel8425 = nhomLienQuanSoTay('8425');
  check(
    '[OZV-2159 nhomLienQuanSoTay] liên kết hai chiều 8412 <-> 8425',
    rel8412.includes('8425') && rel8425.includes('8412'),
    { rel8412, rel8425 }
  );

  const pb8412 = cauPhanBietNhom('8412', ['8412', '8425'], moTaKhop181);
  check(
    '[OZV-2159 thuận 8412->8425] 8412 đứng đầu với [8412, 8425] sinh câu phân biệt từ ch84.chuong trỏ sang 84.25',
    pb8412.length === 1 &&
      pb8412[0].loai === 'PHAN_BIET_NHOM' &&
      pb8412[0].canCu === 'so-tay' &&
      pb8412[0].nguon === 'ch84.chuong' &&
      /84\.25/.test(pb8412[0].questionVi) &&
      /84\.12/.test(pb8412[0].questionVi),
    { pb8412 }
  );

  const pb8425 = cauPhanBietNhom('8425', ['8425', '8412'], moTaKhop181);
  check(
    '[OZV-2159 thuận 8425->8412] 8425 đứng đầu với [8425, 8412] sinh câu phân biệt từ nhom8425.nhom trỏ sang 84.12',
    pb8425.length === 1 &&
      pb8425[0].loai === 'PHAN_BIET_NHOM' &&
      pb8425[0].canCu === 'so-tay' &&
      pb8425[0].nguon === 'nhom8425.nhom' &&
      /84\.12/.test(pb8425[0].questionVi) &&
      /84\.25/.test(pb8425[0].questionVi),
    { pb8425 }
  );

  const g8412To8425 = soTayGates({
    hs: '84122100',
    productText: dk8412Sang8425,
    productName: dk8412Sang8425,
    candidateHeadings: ['8412', '8425'],
  });
  const g8425To8412 = soTayGates({
    hs: '84254290',
    productText: dk8425Sang8412,
    productName: dk8425Sang8412,
    candidateHeadings: ['8425', '8412'],
  });
  check(
    '[OZV-2159 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 8412 -> 8425 và 8425 -> 8412',
    (g8412To8425.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8425')) &&
      (g8425To8412.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8412')),
    { g8412To8425: g8412To8425.challenges, g8425To8412: g8425To8412.challenges }
  );

  const dcDongCo8412 = cauPhanBietNhom('8412', ['8412', '8425'], 'Động cơ phản lực trừ tuabin phản lực');
  const dcDongCo8425 = cauPhanBietNhom('8425', ['8425', '8412'], 'Động cơ phản lực trừ tuabin phản lực');
  const dcTruc8412 = cauPhanBietNhom('8412', ['8412', '8425'], 'Trục truyền và trục khuỷu bằng thép');
  const dcTruc8425 = cauPhanBietNhom('8425', ['8425', '8412'], 'Trục truyền và trục khuỷu bằng thép');
  const dcGate8412 = soTayGates({
    hs: '84121000',
    productText: 'Động cơ phản lực trừ tuabin phản lực',
    productName: 'Động cơ phản lực trừ tuabin phản lực',
    candidateHeadings: ['8412', '8425'],
  });
  const dcGate8425 = soTayGates({
    hs: '84251100',
    productText: 'Trục truyền và trục khuỷu bằng thép',
    productName: 'Trục truyền và trục khuỷu bằng thép',
    candidateHeadings: ['8425', '8412'],
  });
  check(
    '[OZV-2159 đối chứng] động cơ phản lực / trục truyền không hỏi oan / không kéo oan 84.12 <-> 84.25',
    dcDongCo8412.length === 0 &&
      dcDongCo8425.length === 0 &&
      dcTruc8412.length === 0 &&
      dcTruc8425.length === 0 &&
      !(dcGate8412.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8425')) &&
      !(dcGate8425.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8412')) &&
      !D.moRongUngVien(['8412'], 'Động cơ phản lực trừ tuabin phản lực').some((x) => x.nhom === '8425') &&
      !D.moRongUngVien(['8425'], 'Trục truyền và trục khuỷu bằng thép').some((x) => x.nhom === '8412'),
    { dcDongCo8412, dcDongCo8425, dcTruc8412, dcTruc8425 }
  );

  const ht181 = phanTichHoiTruoc4So({ moTa: moTaCa181, ungVien: ['8412', '8425'] });
  const htKhop = phanTichHoiTruoc4So({ moTa: moTaKhop181, ungVien: ['8412', '8425'] });
  const distinctDk = new Set((htKhop.nhanh || []).map((n) => n.dieuKien)).size >= 2;
  check(
    '[OZV-2159 hoi-truoc-4so] ca 181 với [8412, 8425] trả CHUA_CHOT_NHOM_HOI_TRUOC; mô tả khớp 2 chiều có ≥ 2 nhánh điều kiện',
    ht181.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      htKhop.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk &&
      ['8412', '8425'].every((h) => (htKhop.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    {
      ht181: ht181.trangThai,
      htKhop: htKhop.trangThai,
      distinctDk,
      dapAnDieuKien: htKhop.dapAnDieuKien,
    }
  );
}

console.log(`\nOZV-2159 cạnh loại trừ 2 chiều 84.12 <-> 84.25: ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
