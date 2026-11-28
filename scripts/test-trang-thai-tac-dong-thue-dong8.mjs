#!/usr/bin/env node
/**
 * Bài kiểm đồng bộ `trangThaiDong8` và `tacDongThueDong8` dùng `dong8HieuLuc(s, s6)` + `dieuKienNut` (OZV-2438 / OZV-2436).
 *
 * Khoá:
 *   1. `trangThaiDong8` đọc `dong8HieuLuc(s, s6)` + `dieuKienNut` (`rg?.dieuKienNut || s.dieuKienNut`):
 *      - Ca tái hiện ĐỎ 1: `30045010` (chỉ có `dieuKienSo` ở `ranh-gioi/300450.json`) chấm `THOA` / `TRAI` đúng, không trả `null`.
 *      - Toàn bộ 62 dòng (49 dòng chỉ có `dieuKienSo` ở `ranh-gioi/<pn6>.json` + 13 dòng `so-tay` cũ hơn `ranh-gioi`, kể cả 3 dòng
 *        "Loại khác, <vế khẳng định>" không trần `52085920`, `84248940`, `98120090`) đều được `trangThaiDong8` chấm.
 *      - Kế thừa điều kiện nút tổ tiên `dieuKienNut`: `84811021` dưới nút `8481102` (đồng) chấm `TRAI` khi mô tả ghi plastic;
 *        `30045021` dưới nút `3004502` (> 1 loại vitamin) chấm `TRAI` khi mô tả ghi 1 loại vitamin.
 *      - Dòng "Loại khác" trần (`03063619`, `30045029`, `73181590`) vẫn trả `null`.
 *   2. `tacDongThueDong8` đọc `dong8HieuLuc(s, s6)` + ghép `dieuKienNut` của nút tổ tiên:
 *      - Ca tái hiện ĐỎ 2: `030636` + `fact: 'dungLamGiong'` (nút `0306361`) trả `mfnMin: 0, mfnMax: 0, chenh: 0` trên 6 dòng
 *        (`03063611..13` + 3 dòng Loại khác `03063619, 03063629, 03063639`), không vơ cả 12 dòng ra `chenh: 12`.
 *      - Ca tái hiện ĐỎ 3: `151620` + `fact: 'dangVayManh'` (nút `1516203`) trả `mfnMin: 25, mfnMax: 30, chenh: 5` trên 12 dòng
 *        (`15162031..35` + 7 dòng Loại khác), không vơ cả 43 dòng ra `chenh: 10`.
 *      - Tích hợp `cauHoiSoTay` (`lib/so-tay-cau-hoi.js`) gắn đúng `tacDongThue` cho câu hỏi sinh từ `dieuKienNut`.
 */
import './test-isolate-data.mjs';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const T = require('../lib/hs-tree.js');
const {
  loadSoTay,
  dong8HieuLuc,
  trangThaiDong8,
  tacDongThueDong8,
  chotDong8,
  moTaDieuKienTrai,
} = require('../lib/so-tay-gates.js');
const { cauHoiSoTay } = require('../lib/so-tay-cau-hoi.js');

let passed = 0;
let failed = 0;
function assert(name, cond, detail) {
  if (cond) {
    console.log(`PASS ${name}`);
    passed += 1;
  } else {
    console.log(`FAIL ${name}${detail === undefined ? '' : ` ${JSON.stringify(detail).slice(0, 320)}`}`);
    failed += 1;
  }
}

// ── 1. Ca tái hiện ĐỎ 1: 30045010 chỉ có dieuKienSo trong ranh-gioi/300450.json ──
{
  const moTaThoa = 'Thuốc vitamin phù hợp cho trẻ em, dạng xirô';
  const ttThoa = trangThaiDong8({ hs: '30045010', productText: moTaThoa });
  const cdThoa = chotDong8({ hs: '30045010', productText: moTaThoa });
  assert(
    'Ca ĐỎ 1a: trangThaiDong8(30045010) đọc dong8HieuLuc trả THOA khớp chotDong8 (không còn trả null)',
    Boolean(ttThoa) && ttThoa.trangThai === 'THOA' && (cdThoa.dongThoa || []).includes('30045010'),
    { ttThoa, cdThoa },
  );
  assert(
    'Ca ĐỎ 1b: trangThaiDong8(30045010) có veMoHinh phủ cả 2 vế "phù hợp cho trẻ em" và "dạng xirô"',
    Boolean(ttThoa) && Array.isArray(ttThoa.veMoHinh) && ttThoa.veMoHinh.length === 2,
    ttThoa?.veMoHinh,
  );

  const ttTrai = trangThaiDong8({ hs: '30045010', productText: 'Thuốc vitamin phù hợp cho trẻ em, dạng tiêm' });
  assert(
    'Ca ĐỎ 1c: trangThaiDong8(30045010) chấm TRAI khi dạng bào chế là dạng tiêm (trái XIRO)',
    Boolean(ttTrai) && ttTrai.trangThai === 'TRAI' && /xirô|XIRO|tiêm/i.test(moTaDieuKienTrai(ttTrai)),
    { ttTrai, moTaTrai: moTaDieuKienTrai(ttTrai) },
  );

  for (const hs of ['30041015', '30041016', '30041020', '52085920', '84248940', '98120090']) {
    const kq = trangThaiDong8({ hs, productText: 'Hàng hóa mẫu kiểm tra' });
    assert(
      `trangThaiDong8(${hs}) đọc được dieuKienSo từ ranh-gioi DUYET (không trả null)`,
      kq !== null && typeof kq.trangThai === 'string',
      kq,
    );
  }
}

// ── 2. Kế thừa dieuKienNut trong trangThaiDong8 & giữ ranh giới dòng Loại khác trần ──
{
  const ttDong = trangThaiDong8({ hs: '84811021', productText: 'Van giảm áp bằng đồng, đường kính trong 2 cm' });
  const ttNhua = trangThaiDong8({ hs: '84811021', productText: 'Van giảm áp bằng plastic, đường kính trong 2 cm' });
  assert(
    'trangThaiDong8(84811021) kế thừa nút 8481102 (đồng): van đồng 2 cm → THOA, van plastic 2 cm → TRAI',
    ttDong?.trangThai === 'THOA' && ttNhua?.trangThai === 'TRAI',
    { ttDong, ttNhua },
  );

  const ttVit3 = trangThaiDong8({ hs: '30045021', productText: 'Thuốc chứa 3 loại vitamin, dạng uống' });
  const ttVit1 = trangThaiDong8({ hs: '30045021', productText: 'Thuốc chứa 1 loại vitamin, dạng uống' });
  assert(
    'trangThaiDong8(30045021) kế thừa nút 3004502 (soLoaiVitamin > 1): 3 loại vitamin dạng uống → THOA, 1 loại → TRAI',
    ttVit3?.trangThai === 'THOA' && ttVit1?.trangThai === 'TRAI',
    { ttVit3, ttVit1 },
  );

  for (const lkHs of ['03063619', '30045029', '30045099', '73181590']) {
    assert(
      `trangThaiDong8(${lkHs}) dòng Loại khác trần → vẫn trả null (kể cả khi nằm dưới nút có dieuKienNut)`,
      trangThaiDong8({ hs: lkHs, productText: 'Tôm sú sống dùng làm giống' }) === null,
    );
  }
}

// ── 3. Quét toàn bộ hồ sơ ranh giới DUYET qua cây biểu thuế: 62 dòng mới/cập nhật ở ranh-gioi đều được trangThaiDong8 chấm ──
{
  const { taxData } = require('../lib/data.js');
  const dsPn6 = [...new Set(Object.keys(taxData).filter((k) => /^\d{8}$/.test(k)).map((k) => k.slice(0, 6)))].sort();
  const biNull = [];
  let soMoiRg = 0;
  let soCapNhatRg = 0;
  for (const s6 of dsPn6) {
    const s = loadSoTay(s6.slice(0, 4));
    if (!s) continue;
    const { rg, dongCungPn6 } = dong8HieuLuc(s, s6);
    if (!rg) continue;
    for (const d of dongCungPn6) {
      const laLkTran = T.nodeOf(d.hs) ? Boolean(T.nodeOf(d.hs).loaiKhacTran) : Boolean(d.loaiKhac && !(d.dieuKienSo?.length));
      if (laLkTran || !Array.isArray(d.dieuKienSo) || !d.dieuKienSo.length) continue;
      const oldD = (s.dong8 || []).find((x) => String(x.hs || '').replace(/\D/g, '') === d.hs);
      const oldHas = Boolean(oldD && Array.isArray(oldD.dieuKienSo) && oldD.dieuKienSo.length);
      const isDiff = !oldHas || JSON.stringify(oldD.dieuKienSo) !== JSON.stringify(d.dieuKienSo);
      if (!isDiff) continue;
      if (!oldHas) soMoiRg += 1;
      else soCapNhatRg += 1;
      const kq = trangThaiDong8({ hs: d.hs, productText: '' });
      if (!kq || JSON.stringify(kq.chiTiet.filter((c) => !c.tuNut).map((c) => c.fact)) !== JSON.stringify(d.dieuKienSo.map((c) => c.fact))) {
        biNull.push(d.hs);
      }
    }
  }
  assert(
    `Toàn bộ 62 dòng (49 mới + 13 cập nhật ở ranh-gioi DUYET) đều được trangThaiDong8 chấm đúng dieuKienSo mới (0 dòng bị null/cũ)`,
    soMoiRg === 49 && soCapNhatRg === 13 && biNull.length === 0,
    { soMoiRg, soCapNhatRg, biNull },
  );
}

// ── 4. Ca tái hiện ĐỎ 2: tacDongThueDong8({ hs: '030636', fact: 'dungLamGiong' }) ──
{
  const t030636 = tacDongThueDong8({ hs: '030636', fact: 'dungLamGiong' });
  const dongMongDoi = ['03063611', '03063612', '03063613', '03063619', '03063629', '03063639'];
  assert(
    'Ca ĐỎ 2: tacDongThueDong8(030636, dungLamGiong) kế thừa nút 0306361 → mfnMin=0, mfnMax=0, chenh=0, đúng 6 dòng',
    Boolean(t030636)
      && t030636.mfnMin === 0
      && t030636.mfnMax === 0
      && t030636.chenh === 0
      && JSON.stringify(t030636.dong) === JSON.stringify(dongMongDoi),
    t030636,
  );
}

// ── 5. Ca tái hiện ĐỎ 3: tacDongThueDong8({ hs: '151620', fact: 'dangVayManh' }) ──
{
  const t151620 = tacDongThueDong8({ hs: '151620', fact: 'dangVayManh' });
  const dongMongDoi = [
    '15162019', '15162029',
    '15162031', '15162032', '15162033', '15162034', '15162035', '15162039',
    '15162049', '15162059', '15162069', '15162099',
  ];
  assert(
    'Ca ĐỎ 3: tacDongThueDong8(151620, dangVayManh) kế thừa nút 1516203 → mfnMin=25, mfnMax=30, chenh=5, đúng 12 dòng',
    Boolean(t151620)
      && t151620.mfnMin === 25
      && t151620.mfnMax === 30
      && t151620.chenh === 5
      && JSON.stringify(t151620.dong) === JSON.stringify(dongMongDoi),
    t151620,
  );
}

// ── 6. Tích hợp với cauHoiSoTay (lib/so-tay-cau-hoi.js) ──
{
  const q030636 = cauHoiSoTay({ code: '030636', productText: 'Tôm sống' });
  const cauGiong = (q030636.questions || []).find((q) => q.key === 'dungLamGiong');
  assert(
    'cauHoiSoTay(030636) gắn tacDongThue.chenh = 0 (6 dòng) cho câu hỏi dungLamGiong',
    Boolean(cauGiong?.tacDongThue)
      && cauGiong.tacDongThue.chenh === 0
      && cauGiong.tacDongThue.dong.length === 6,
    cauGiong,
  );

  const q151620 = cauHoiSoTay({ code: '151620', productText: 'Dầu thực vật đã qua hydro hóa' });
  const cauVay = (q151620.questions || []).find((q) => q.key === 'dangVayManh');
  assert(
    'cauHoiSoTay(151620) gắn tacDongThue.chenh = 5 (12 dòng) cho câu hỏi dangVayManh',
    Boolean(cauVay?.tacDongThue)
      && cauVay.tacDongThue.chenh === 5
      && cauVay.tacDongThue.dong.length === 12,
    cauVay,
  );
}

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
