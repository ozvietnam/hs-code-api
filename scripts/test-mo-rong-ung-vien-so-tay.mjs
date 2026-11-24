#!/usr/bin/env node
/**
 * scripts/test-mo-rong-ung-vien-so-tay.mjs — Kiểm thử mở rộng ứng viên và phân biệt 2 chiều từ sổ tay
 * cho cặp 87.14 <-> 39.26 (ca 148 tầng 4 số, OZV-2192).
 */
import './test-isolate-data.mjs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const S = require('../lib/so-tay.js');
const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
const D = require('../lib/do-thi/index.js');
const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');

let pass = 0;
let fail = 0;
function check(name, cond, detail = '') {
  if (cond) {
    pass += 1;
    console.log(`PASS  ${name}`);
  } else {
    fail += 1;
    console.error(`FAIL  ${name}${detail ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
  }
}

// OZV-2192 — Cạnh loại trừ 2 chiều 87.14 <-> 39.26 cho ca 148 tầng 4 số
// ('Nắp ốp đèn soi biển số cho xe máy / nhựa ABS mạ crom / ốp đèn soi biển số')
{
  D.datLai();

  const q148 = 'Nắp ốp đèn soi biển số cho xe máy / nhựa ABS mạ crom / ốp đèn soi biển số';
  const st8714 = loadSoTay('8714');
  const st3926 = loadSoTay('3926');
  const v8714 = S.verifySoTay(st8714, '8714', S.sourcesFor('8714'));
  const v3926 = S.verifySoTay(st3926, '3926', S.sourcesFor('3926'));
  check(
    '[OZV-2192 verifySoTay] sổ tay 8714 và 3926 đạt 100% (0 mục không kiểm được nguồn) và khớp kiemTra.tong/dat',
    v8714.loai.length === 0
      && v3926.loai.length === 0
      && v8714.dat === v8714.tong
      && v3926.dat === v3926.tong
      && st8714.kiemTra?.tong === v8714.tong
      && st8714.kiemTra?.dat === v8714.dat
      && st3926.kiemTra?.tong === v3926.tong
      && st3926.kiemTra?.dat === v3926.dat,
    { loai8714: v8714.loai, loai3926: v3926.loai, kt8714: st8714.kiemTra, v8714: { tong: v8714.tong, dat: v8714.dat }, kt3926: st3926.kiemTra, v3926: { tong: v3926.tong, dat: v3926.dat } },
  );

  const lt8714 = (st8714?.loaiTru || []).find((x) => x.sangNhom === '3926' && x.canCuLoaiTru?.nguon === 'nhom3926.nhom');
  const lt3926 = (st3926?.loaiTru || []).find((x) => x.sangNhom === '8714' && x.canCuLoaiTru?.nguon === 'nhom8714.nhom');
  check(
    '[OZV-2192 căn cứ] sổ tay 8714 và 3926 có mục loaiTru 2 chiều 8714 <-> 3926 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt8714 && lt8714.nguon === 'nhom8714.nhom' && S.checkItem('loaiTru', lt8714, S.sourcesFor('8714'), '8714') === null)
      && Boolean(lt3926 && lt3926.nguon === 'ch39.chuong' && S.checkItem('loaiTru', lt3926, S.sourcesFor('3926'), '3926') === null)
      && lt8714.dieuKien !== lt3926.dieuKien
      && !/;/.test(lt8714.dieuKien)
      && !/;/.test(lt3926.dieuKien),
    { lt8714: Boolean(lt8714), lt3926: Boolean(lt3926) },
  );

  const c5Tu8714 = D.canhTu('8714', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '3926');
  const c5Tu3926 = D.canhTu('3926', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8714');
  const c6Tu8714 = D.canhTu('8714', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '3926');
  const c6Tu3926 = D.canhTu('3926', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8714');
  const giua8714_3926 = D.canhGiuaNhomConSong(['8714', '3926']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu8714 = D.moRongUngVien(['8714'], q148);
  const mrTu3926 = D.moRongUngVien(['3926'], q148);
  const rel8714 = nhomLienQuanSoTay('8714');
  const rel3926 = nhomLienQuanSoTay('3926');
  check(
    '[OZV-2192 đồ thị 2 chiều] bảng cạnh có C5/C6 8714<->3926, nhomLienQuanSoTay 2 chiều và moRongUngVien kéo 2 chiều cho ca 148',
    c5Tu8714.some((e) => e.nguon === 'nhom8714.nhom' && e.canCuLoaiTru?.nguon === 'nhom3926.nhom')
      && c5Tu3926.some((e) => e.nguon === 'ch39.chuong' && e.canCuLoaiTru?.nguon === 'nhom8714.nhom')
      && c6Tu8714.length >= 1
      && c6Tu3926.length >= 1
      && giua8714_3926.length >= 2
      && rel8714.includes('3926')
      && rel3926.includes('8714')
      && mrTu8714.some((x) => x.nhom === '3926')
      && mrTu3926.some((x) => x.nhom === '8714'),
    { c5Tu8714: c5Tu8714.length, c5Tu3926: c5Tu3926.length, mrTu8714, mrTu3926 },
  );

  const ht148 = phanTichHoiTruoc4So({ moTa: q148, ungVien: ['8714', '3926'] });
  const distinctDk148 = new Set((ht148.nhanh || []).map((n) => n.dieuKien)).size === 2;
  const ht148Full = phanTichHoiTruoc4So({ moTa: q148, ungVien: ['8714', '8708', '3926'] });
  const distinctDk148Full = new Set((ht148Full.nhanh || []).map((n) => n.dieuKien)).size === 3;
  check(
    '[OZV-2192 hoi-truoc-4so] ca 148 Nắp ốp đèn soi biển số tách nhánh điều kiện riêng biệt cho [8714, 3926] và [8714, 8708, 3926]',
    ht148.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && distinctDk148
      && (ht148.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:'))
      && Boolean(ht148.dapAnDieuKien && ht148.dapAnDieuKien.includes('→ nhóm 8714 (') && ht148.dapAnDieuKien.includes('→ nhóm 3926 ('))
      && Boolean(ht148.cauHoi)
      && ht148Full.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && distinctDk148Full
      && ['8714', '8708', '3926'].every((h) => (ht148Full.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht148.trangThai, distinctDk148, distinctDk148Full, dapAnDieuKien: ht148.dapAnDieuKien },
  );

  const pb8714 = cauPhanBietNhom('8714', ['8714', '3926'], q148);
  const pb3926 = cauPhanBietNhom('3926', ['3926', '8714'], q148);
  check(
    '[OZV-2192 thuận cauPhanBietNhom] sinh câu hỏi phân biệt 2 chiều 87.14 <-> 39.26 cho ca 148 Nắp ốp đèn soi biển số',
    pb8714.length === 1
      && pb8714[0].loai === 'PHAN_BIET_NHOM'
      && pb8714[0].canCu === 'so-tay'
      && pb8714[0].nguon === 'nhom8714.nhom'
      && /39\.26/.test(pb8714[0].questionVi)
      && /87\.14/.test(pb8714[0].questionVi)
      && pb3926.length === 1
      && pb3926[0].loai === 'PHAN_BIET_NHOM'
      && pb3926[0].canCu === 'so-tay'
      && pb3926[0].nguon === 'ch39.chuong'
      && /87\.14/.test(pb3926[0].questionVi)
      && /39\.26/.test(pb3926[0].questionVi),
    { pb8714, pb3926 },
  );

  const g8714To3926 = soTayGates({
    hs: '87141090',
    productText: q148,
    productName: 'Nắp ốp đèn soi biển số cho xe máy',
    candidateHeadings: ['8714', '3926'],
  });
  const g3926To8714 = soTayGates({
    hs: '39263000',
    productText: q148,
    productName: 'Nắp ốp đèn soi biển số cho xe máy',
    candidateHeadings: ['3926', '8714'],
  });
  check(
    '[OZV-2192 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 8714 -> 3926 và 3926 -> 8714',
    (g8714To3926.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3926'))
      && (g3926To8714.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8714')),
    { g8714To3926: g8714To3926.challenges, g3926To8714: g3926To8714.challenges },
  );

  const dcYenXe = 'Yên xe máy bọc da tổng hợp dùng cho xe môtô';
  const dcPhaoCa = 'Phao bằng plastic dùng cho lưới đánh cá';
  const dcTapDe = 'Tạp dề và áo mưa bằng plastic';
  const dcYx8714 = cauPhanBietNhom('8714', ['8714', '3926'], dcYenXe);
  const dcYx3926 = cauPhanBietNhom('3926', ['3926', '8714'], dcYenXe);
  const dcPc8714 = cauPhanBietNhom('8714', ['8714', '3926'], dcPhaoCa);
  const dcPc3926 = cauPhanBietNhom('3926', ['3926', '8714'], dcPhaoCa);
  const dcTd8714 = cauPhanBietNhom('8714', ['8714', '3926'], dcTapDe);
  const dcTd3926 = cauPhanBietNhom('3926', ['3926', '8714'], dcTapDe);
  const gDoi8714 = soTayGates({
    hs: '87141010',
    productText: dcYenXe,
    productName: dcYenXe,
    candidateHeadings: ['8714', '3926'],
  });
  const gDoi3926 = soTayGates({
    hs: '39269010',
    productText: dcPhaoCa,
    productName: dcPhaoCa,
    candidateHeadings: ['3926', '8714'],
  });
  check(
    '[OZV-2192 đối chứng] yên xe máy, phao lưới đánh cá và tạp dề plastic không hỏi oan / không kéo oan 87.14 <-> 39.26',
    dcYx8714.length === 0
      && dcYx3926.length === 0
      && dcPc8714.length === 0
      && dcPc3926.length === 0
      && dcTd8714.length === 0
      && dcTd3926.length === 0
      && !D.moRongUngVien(['8714'], dcYenXe).some((x) => x.nhom === '3926')
      && !D.moRongUngVien(['3926'], dcPhaoCa).some((x) => x.nhom === '8714')
      && !(gDoi8714.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3926'))
      && !(gDoi3926.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8714')),
    { dcYx8714, dcYx3926, dcPc8714, dcPc3926, gDoi8714: gDoi8714.challenges, gDoi3926: gDoi3926.challenges },
  );
}

console.log(`\n${pass}/${pass + fail} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
