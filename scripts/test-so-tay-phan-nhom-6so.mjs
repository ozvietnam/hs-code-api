#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-2156 — Kiểm tra cạnh loại trừ 2 chiều 42.03 <-> 61.16 cho ca 194 tầng 4 số:
 * "Bao tay da / da thuộc tổng hợp PU / đi đường mùa đông"
 * (nhomNhan: ["3926","4203","6116","6216"], heNhom: "4203").
 *
 * Kiểm đủ:
 *   1. Căn cứ pháp lý nguyên văn 100% trong data/so-tay/4203.json và data/so-tay/6116.json (verifySoTay + checkItem).
 *   2. Bảng cạnh đồ thị C5/C6 2 chiều 4203 <-> 6116, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 194.
 *   3. nhomLienQuanSoTay 2 chiều.
 *   4. Thuận 2 chiều: cauPhanBietNhom (hoiTheoSoTay) và soTayGates.
 *   5. Đối chứng (ca âm): hàng không trùng từ khoá điều kiện không hỏi oan / không kéo oan.
 *   6. phanTichHoiTruoc4So (hoiTruoc4So) trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

const moTaCa194 = 'Bao tay da / da thuộc tổng hợp PU / đi đường mùa đông';
// Bổ sung cụm phân biệt theo dapAnDieuKien ca 194 để moRongUngVien / cauPhanBietNhom đo được cả nhánh dệt kim.
const moTaKhop194 =
  'Bao tay da thuộc tổng hợp PU đi đường mùa đông; hoặc bao tay / găng tay dệt kim PU phủ trên vải dệt kim';

{
  // 1. Căn cứ pháp lý nguyên văn
  const s4203 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '4203.json'), 'utf8'));
  const s6116 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '6116.json'), 'utf8'));
  const v4203 = S.verifySoTay(s4203, '4203');
  const v6116 = S.verifySoTay(s6116, '6116');
  check(
    '[OZV-2156 verifySoTay] sổ tay 4203 và 6116 đạt 100% (0 mục bị loại)',
    v4203.loai.length === 0 && v6116.loai.length === 0,
    { loai4203: v4203.loai, loai6116: v6116.loai }
  );

  const st4203 = loadSoTay('4203');
  const st6116 = loadSoTay('6116');
  const lt4203 = (st4203?.loaiTru || []).find((x) => x.sangNhom === '6116');
  const lt6116 = (st6116?.loaiTru || []).find((x) => x.sangNhom === '4203');
  check(
    '[OZV-2156 căn cứ] sổ tay 4203 và 6116 có mục loaiTru 2 chiều 4203 <-> 6116 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt4203 &&
        lt4203.nguon === 'nhom4203.nhom' &&
        lt4203.canCuLoaiTru?.nguon === 'nhom6116.nhom' &&
        S.checkItem('loaiTru', lt4203, S.sourcesFor('4203'), '4203') === null
    ) &&
      Boolean(
        lt6116 &&
          lt6116.nguon === 'ch61.chuong' &&
          lt6116.canCuLoaiTru?.nguon === 'nhom4203.nhom' &&
          S.checkItem('loaiTru', lt6116, S.sourcesFor('6116'), '6116') === null
      ),
    { lt4203, lt6116 }
  );

  // 2. Bảng cạnh đồ thị 2 chiều C5/C6 và mở rộng ứng viên
  const c5Tu4203 = D.canhTu('4203', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6116');
  const c5Tu6116 = D.canhTu('6116', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '4203');
  const c6Tu4203 = D.canhTu('4203', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6116');
  const c6Tu6116 = D.canhTu('6116', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '4203');
  const giua4203_6116 = D.canhGiuaNhomConSong(['4203', '6116']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu4203 = D.moRongUngVien(['4203'], moTaKhop194, { toiDa: 10 });
  const mrTu6116 = D.moRongUngVien(['6116'], moTaKhop194, { toiDa: 10 });
  check(
    '[OZV-2156 đồ thị 2 chiều] bảng cạnh có C5/C6 4203<->6116, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 194',
    c5Tu4203.some((e) => e.nguon === 'nhom4203.nhom' && e.canCuLoaiTru?.nguon === 'nhom6116.nhom') &&
      c5Tu6116.some((e) => e.nguon === 'ch61.chuong' && e.canCuLoaiTru?.nguon === 'nhom4203.nhom') &&
      c6Tu4203.length >= 1 &&
      c6Tu6116.length >= 1 &&
      giua4203_6116.length >= 2 &&
      mrTu4203.some((x) => x.nhom === '6116') &&
      mrTu6116.some((x) => x.nhom === '4203'),
    { c5Tu4203: c5Tu4203.length, c5Tu6116: c5Tu6116.length, giua: giua4203_6116.length, mrTu4203, mrTu6116 }
  );

  const rel4203 = nhomLienQuanSoTay('4203');
  const rel6116 = nhomLienQuanSoTay('6116');
  check(
    '[OZV-2156 nhomLienQuanSoTay] liên kết hai chiều 4203 <-> 6116',
    rel4203.includes('6116') && rel6116.includes('4203'),
    { rel4203, rel6116 }
  );

  // 3. Thuận 2 chiều: cauPhanBietNhom và soTayGates
  const pb4203 = cauPhanBietNhom('4203', ['4203', '6116'], moTaKhop194);
  check(
    '[OZV-2156 thuận 4203->6116] 4203 đứng đầu với [4203, 6116] sinh câu phân biệt từ nhom4203.nhom trỏ sang 61.16',
    pb4203.length === 1 &&
      pb4203[0].loai === 'PHAN_BIET_NHOM' &&
      pb4203[0].canCu === 'so-tay' &&
      pb4203[0].nguon === 'nhom4203.nhom' &&
      /61\.16/.test(pb4203[0].questionVi) &&
      /42\.03/.test(pb4203[0].questionVi),
    { pb4203 }
  );

  const pb6116 = cauPhanBietNhom('6116', ['6116', '4203'], moTaKhop194);
  check(
    '[OZV-2156 thuận 6116->4203] 6116 đứng đầu với [6116, 4203] sinh câu phân biệt từ ch61.chuong trỏ sang 42.03',
    pb6116.length === 1 &&
      pb6116[0].loai === 'PHAN_BIET_NHOM' &&
      pb6116[0].canCu === 'so-tay' &&
      pb6116[0].nguon === 'ch61.chuong' &&
      /42\.03/.test(pb6116[0].questionVi) &&
      /61\.16/.test(pb6116[0].questionVi),
    { pb6116 }
  );

  const g4203To6116 = soTayGates({
    hs: '42032110',
    productText:
      'Bao tay / găng tay dệt kim hoặc móc, PU phủ trên vải dệt kim (không phải da thuộc hoặc da thuộc tổng hợp từ xơ da)',
    productName:
      'Bao tay / găng tay dệt kim hoặc móc, PU phủ trên vải dệt kim (không phải da thuộc hoặc da thuộc tổng hợp từ xơ da)',
    candidateHeadings: ['4203', '6116'],
  });
  const g6116To4203 = soTayGates({
    hs: '61161090',
    productText: 'Bao tay / găng tay bằng da thuộc hoặc da thuộc tổng hợp PU (không phải dệt kim hoặc móc)',
    productName: 'Bao tay / găng tay bằng da thuộc hoặc da thuộc tổng hợp PU (không phải dệt kim hoặc móc)',
    candidateHeadings: ['6116', '4203'],
  });
  check(
    '[OZV-2156 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 4203 -> 6116 và 6116 -> 4203',
    (g4203To6116.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6116')) &&
      (g6116To4203.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('4203')),
    { g4203To6116: g4203To6116.challenges, g6116To4203: g6116To4203.challenges }
  );

  // 4. Đối chứng (ca âm): hàng không trùng từ khoá điều kiện không hỏi oan / không kéo oan
  const dcThatLung4203 = cauPhanBietNhom('4203', ['4203', '6116'], 'Thắt lưng bằng da thuộc');
  const dcThatLung6116 = cauPhanBietNhom('6116', ['6116', '4203'], 'Thắt lưng bằng da thuộc');
  const dcCoXat4203 = cauPhanBietNhom('4203', ['4203', '6116'], 'Găng tay cọ xát dùng để xoa bóp hoặc dùng cho vệ sinh');
  const dcCoXat6116 = cauPhanBietNhom('6116', ['6116', '4203'], 'Găng tay cọ xát dùng để xoa bóp hoặc dùng cho vệ sinh');
  const dcGate4203 = soTayGates({
    hs: '42033000',
    productText: 'Thắt lưng bằng da thuộc',
    productName: 'Thắt lưng bằng da thuộc',
    candidateHeadings: ['4203', '6116'],
  });
  const dcGate6116 = soTayGates({
    hs: '61169900',
    productText: 'Găng tay cọ xát dùng để xoa bóp hoặc dùng cho vệ sinh',
    productName: 'Găng tay cọ xát dùng để xoa bóp hoặc dùng cho vệ sinh',
    candidateHeadings: ['6116', '4203'],
  });
  check(
    '[OZV-2156 đối chứng] thắt lưng da và găng tay cọ xát không hỏi oan / không kéo oan 42.03 <-> 61.16',
    dcThatLung4203.length === 0 &&
      dcThatLung6116.length === 0 &&
      dcCoXat4203.length === 0 &&
      dcCoXat6116.length === 0 &&
      !(dcGate4203.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6116')) &&
      !(dcGate6116.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('4203')) &&
      !D.moRongUngVien(['4203'], 'Thắt lưng bằng da thuộc').some((x) => x.nhom === '6116') &&
      !D.moRongUngVien(['6116'], 'Găng tay cọ xát dùng để xoa bóp hoặc dùng cho vệ sinh').some((x) => x.nhom === '4203'),
    { dcThatLung4203, dcThatLung6116, dcCoXat4203, dcCoXat6116 }
  );

  // 5. phanTichHoiTruoc4So tách 2 nhánh điều kiện riêng biệt cho ca 194
  const ht194 = phanTichHoiTruoc4So({ moTa: moTaCa194, ungVien: ['4203', '6116'] });
  const distinctDk194 = new Set((ht194.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2156 hoi-truoc-4so] ca 194 với [4203, 6116] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt',
    ht194.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk194 &&
      ['4203', '6116'].every((h) => (ht194.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht194.trangThai, distinctDk194, dapAnDieuKien: ht194.dapAnDieuKien }
  );
}

console.log(`\nOZV-2156 cạnh loại trừ 2 chiều 42.03 <-> 61.16: ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
