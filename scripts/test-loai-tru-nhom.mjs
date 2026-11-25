#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-2160 — Kiểm tra cạnh loại trừ 2 chiều 54.02 <-> 59.02 cho ca 196 tầng 4 số:
 * "Sợi filament tổng hợp / Polyamide (Nylon) / Dùng để gia công lõi dây câu"
 * (nhomNhan: ["5402"], ungVien gồm 5902).
 *
 * Kiểm đủ:
 *   1. verifySoTay 5402 & 5902 đạt 0 mục bị loại; checkItem loaiTru 2 chiều + canCuLoaiTru.
 *   2. Đồ thị C5/C6 2 chiều 5402 <-> 5902, canhGiuaNhomConSong, moRongUngVien kéo 2 chiều.
 *   3. nhomLienQuanSoTay 2 chiều.
 *   4. Thuận: cauPhanBietNhom, soTayGates, phanTichHoiTruoc4So.
 *   5. Đối chứng: mô tả không khớp điều kiện → không hỏi oan / không kéo oan.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

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

const moTaCa196 = 'Sợi filament tổng hợp / Polyamide (Nylon) / Dùng để gia công lõi dây câu';
// Mô tả khớp cả hai dieuKien để moRongUngVien / cauPhanBietNhom đo được 2 chiều.
const moTaKhop196 =
  'Sợi filament tổng hợp trừ chỉ khâu, chưa đóng gói để bán lẻ, kể cả sợi monofilament tổng hợp có độ mảnh dưới 67 decitex; hoặc vải mành dùng làm lốp từ sợi có độ bền cao bằng ni lông hoặc các polyamit khác, các polyeste hoặc viscose rayon';
const dk5402Sang5902 =
  'Vải mành dùng làm lốp từ sợi có độ bền cao bằng ni lông hoặc các polyamit khác, các polyeste hoặc viscose rayon';
const dk5902Sang5402 =
  'Sợi filament tổng hợp trừ chỉ khâu, chưa đóng gói để bán lẻ, kể cả sợi monofilament tổng hợp có độ mảnh dưới 67 decitex';

{
  const s5402 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '5402.json'), 'utf8'));
  const s5902 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '5902.json'), 'utf8'));
  const v5402 = S.verifySoTay(s5402, '5402');
  const v5902 = S.verifySoTay(s5902, '5902');
  check(
    '[OZV-2160 verifySoTay] sổ tay 5402 và 5902 đạt 100% (0 mục bị loại)',
    v5402.loai.length === 0 && v5902.loai.length === 0,
    { loai5402: v5402.loai, loai5902: v5902.loai }
  );

  const st5402 = loadSoTay('5402');
  const st5902 = loadSoTay('5902');
  const lt5402 = (st5402?.loaiTru || []).find((x) => x.sangNhom === '5902');
  const lt5902 = (st5902?.loaiTru || []).find((x) => x.sangNhom === '5402');
  check(
    '[OZV-2160 căn cứ] sổ tay 5402 và 5902 có mục loaiTru 2 chiều 5402 <-> 5902 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt5402 &&
        lt5402.nguon === 'nhom5402.nhom' &&
        lt5402.canCuLoaiTru?.nguon === 'nhom5902.nhom' &&
        S.checkItem('loaiTru', lt5402, S.sourcesFor('5402'), '5402') === null
    ) &&
      Boolean(
        lt5902 &&
          lt5902.nguon === 'nhom5902.nhom' &&
          lt5902.canCuLoaiTru?.nguon === 'nhom5402.nhom' &&
          S.checkItem('loaiTru', lt5902, S.sourcesFor('5902'), '5902') === null
      ),
    { lt5402, lt5902 }
  );
  check(
    '[OZV-2160 dieuKien] hai chiều 5402 <-> 5902 tách biệt (không dùng chung một chuỗi điều kiện)',
    Boolean(lt5402 && lt5902) &&
      lt5402.dieuKien === dk5402Sang5902 &&
      lt5902.dieuKien === dk5902Sang5402 &&
      lt5402.dieuKien !== lt5902.dieuKien &&
      !/;/.test(lt5402.dieuKien) &&
      !/;/.test(lt5902.dieuKien),
    { dk5402: lt5402?.dieuKien, dk5902: lt5902?.dieuKien }
  );

  const c5Tu5402 = D.canhTu('5402', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5902');
  const c5Tu5902 = D.canhTu('5902', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5402');
  const c6Tu5402 = D.canhTu('5402', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5902');
  const c6Tu5902 = D.canhTu('5902', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5402');
  const giua5402_5902 = D.canhGiuaNhomConSong(['5402', '5902']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu5402 = D.moRongUngVien(['5402'], moTaKhop196, { toiDa: 10 });
  const mrTu5902 = D.moRongUngVien(['5902'], moTaKhop196, { toiDa: 10 });
  check(
    '[OZV-2160 đồ thị 2 chiều] bảng cạnh có C5/C6 5402<->5902, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 196',
    c5Tu5402.some((e) => e.nguon === 'nhom5402.nhom' && e.canCuLoaiTru?.nguon === 'nhom5902.nhom') &&
      c5Tu5902.some((e) => e.nguon === 'nhom5902.nhom' && e.canCuLoaiTru?.nguon === 'nhom5402.nhom') &&
      c6Tu5402.length >= 1 &&
      c6Tu5902.length >= 1 &&
      giua5402_5902.length >= 2 &&
      mrTu5402.some((x) => x.nhom === '5902') &&
      mrTu5902.some((x) => x.nhom === '5402'),
    {
      c5Tu5402: c5Tu5402.length,
      c5Tu5902: c5Tu5902.length,
      giua: giua5402_5902.length,
      mrTu5402,
      mrTu5902,
    }
  );

  const rel5402 = nhomLienQuanSoTay('5402');
  const rel5902 = nhomLienQuanSoTay('5902');
  check(
    '[OZV-2160 nhomLienQuanSoTay] liên kết hai chiều 5402 <-> 5902',
    rel5402.includes('5902') && rel5902.includes('5402'),
    { rel5402, rel5902 }
  );

  const pb5402 = cauPhanBietNhom('5402', ['5402', '5902'], moTaKhop196);
  check(
    '[OZV-2160 thuận 5402->5902] 5402 đứng đầu với [5402, 5902] sinh câu phân biệt từ nhom5402.nhom trỏ sang 59.02',
    pb5402.length === 1 &&
      pb5402[0].loai === 'PHAN_BIET_NHOM' &&
      pb5402[0].canCu === 'so-tay' &&
      pb5402[0].nguon === 'nhom5402.nhom' &&
      /59\.02/.test(pb5402[0].questionVi) &&
      /54\.02/.test(pb5402[0].questionVi),
    { pb5402 }
  );

  const pb5902 = cauPhanBietNhom('5902', ['5902', '5402'], moTaKhop196);
  check(
    '[OZV-2160 thuận 5902->5402] 5902 đứng đầu với [5902, 5402] sinh câu phân biệt từ nhom5902.nhom trỏ sang 54.02',
    pb5902.length === 1 &&
      pb5902[0].loai === 'PHAN_BIET_NHOM' &&
      pb5902[0].canCu === 'so-tay' &&
      pb5902[0].nguon === 'nhom5902.nhom' &&
      /54\.02/.test(pb5902[0].questionVi) &&
      /59\.02/.test(pb5902[0].questionVi),
    { pb5902 }
  );

  const g5402To5902 = soTayGates({
    hs: '54021100',
    productText: dk5402Sang5902,
    productName: dk5402Sang5902,
    candidateHeadings: ['5402', '5902'],
  });
  const g5902To5402 = soTayGates({
    hs: '59021011',
    productText: dk5902Sang5402,
    productName: dk5902Sang5402,
    candidateHeadings: ['5902', '5402'],
  });
  check(
    '[OZV-2160 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 5402 -> 5902 và 5902 -> 5402',
    (g5402To5902.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5902')) &&
      (g5902To5402.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5402')),
    { g5402To5902: g5402To5902.challenges, g5902To5402: g5902To5402.challenges }
  );

  const dcBom5402 = cauPhanBietNhom('5402', ['5402', '5902'], 'Máy bơm nước ly tâm công nghiệp');
  const dcBom5902 = cauPhanBietNhom('5902', ['5902', '5402'], 'Máy bơm nước ly tâm công nghiệp');
  const dcGiay5402 = cauPhanBietNhom('5402', ['5402', '5902'], 'Giấy Kraft làm bao bì công nghiệp');
  const dcGiay5902 = cauPhanBietNhom('5902', ['5902', '5402'], 'Giấy Kraft làm bao bì công nghiệp');
  const dcGate5402 = soTayGates({
    hs: '54021100',
    productText: 'Máy bơm nước ly tâm công nghiệp',
    productName: 'Máy bơm nước ly tâm công nghiệp',
    candidateHeadings: ['5402', '5902'],
  });
  const dcGate5902 = soTayGates({
    hs: '59021011',
    productText: 'Giấy Kraft làm bao bì công nghiệp',
    productName: 'Giấy Kraft làm bao bì công nghiệp',
    candidateHeadings: ['5902', '5402'],
  });
  check(
    '[OZV-2160 đối chứng] máy bơm / giấy Kraft không hỏi oan / không kéo oan 54.02 <-> 59.02',
    dcBom5402.length === 0 &&
      dcBom5902.length === 0 &&
      dcGiay5402.length === 0 &&
      dcGiay5902.length === 0 &&
      !(dcGate5402.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5902')) &&
      !(dcGate5902.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5402')) &&
      !D.moRongUngVien(['5402'], 'Máy bơm nước ly tâm công nghiệp').some((x) => x.nhom === '5902') &&
      !D.moRongUngVien(['5902'], 'Giấy Kraft làm bao bì công nghiệp').some((x) => x.nhom === '5402'),
    { dcBom5402, dcBom5902, dcGiay5402, dcGiay5902 }
  );

  const ht196 = phanTichHoiTruoc4So({ moTa: moTaCa196, ungVien: ['5402', '5902'] });
  const htKhop = phanTichHoiTruoc4So({ moTa: moTaKhop196, ungVien: ['5402', '5902'] });
  const distinctDk = new Set((htKhop.nhanh || []).map((n) => n.dieuKien)).size >= 2;
  check(
    '[OZV-2160 hoi-truoc-4so] ca 196 với [5402, 5902] trả CHUA_CHOT_NHOM_HOI_TRUOC; mô tả khớp 2 chiều có ≥ 2 nhánh điều kiện',
    ht196.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      htKhop.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk &&
      ['5402', '5902'].every((h) => (htKhop.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    {
      ht196: ht196.trangThai,
      htKhop: htKhop.trangThai,
      distinctDk,
      dapAnDieuKien: htKhop.dapAnDieuKien,
    }
  );
}

console.log(`\nOZV-2160 cạnh loại trừ 2 chiều 54.02 <-> 59.02: ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
