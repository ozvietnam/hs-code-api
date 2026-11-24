#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-558 — ca kiểm MỚI: VẬT LIỆU quyết định TIÊU ĐỀ 6 SỐ (PA-B).
 *
 * Tệp ca: `tests/phan-biet-vat-lieu-tieu-de-6-so.json` (TỆP RIÊNG — không sửa tệp cổng của GĐ
 * `tests/ca-doi-chung-vat-lieu-8546-8547.json`, không sửa `scripts/bo-kiem-luat.mjs`,
 * không sửa `scripts/test-ca-doi-chung-vat-lieu.mjs`).
 *
 * Bốn chiều theo đặc tả GĐ:
 *   I   hàng nhựa/cao su ⇒ chốt 85469000 (trước vá: 85462010 — gốm sứ, SAI VẬT LIỆU)
 *   II  hàng gốm sứ ⇒ vẫn 85462010 (không hồi quy chiều ngược)
 *   III hàng KHÔNG nêu vật liệu ⇒ hành vi Y HỆT main (không mất chốt)
 *   IV  hàng "composite" ⇒ hành vi Y HỆT main (T3, ngoài phạm vi thẻ)
 *
 * Mỗi ca mang `nenMain` = hành vi đo được trên `origin/main` (5cd1e855) bằng chính tệp này (chế độ `--do`).
 * Có hai kiểm chống bản-vá-rỗng (quy tắc 5 OZV-290):
 *   - ca `giuYHieuMain` ⇒ hành vi hiện tại PHẢI BẰNG `nenMain` (đổi hành vi ở ca không nêu vật liệu ⇒ đỏ)
 *   - ca còn lại ⇒ hành vi hiện tại PHẢI KHÁC `nenMain` (vá rỗng / vá sai vế ⇒ đỏ)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chotDong8 } = require('../lib/so-tay-gates.js');

const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'phan-biet-vat-lieu-tieu-de-6-so.json'), 'utf8'));
const doMode = process.argv.includes('--do');

const thuc = (c) => {
  const r = chotDong8({ hs: c.pn6, productText: c.moTa }) || {};
  return { ketQua: r.ketQua || null, hs: r.hs || null };
};
const bang = (a, b) => !!a && !!b && a.ketQua === b.ketQua && (a.hs || null) === (b.hs || null);

if (doMode) {
  // Chế độ đo nền: in kết quả THẬT của từng ca (dùng để chốt `nenMain` trên origin/main).
  console.log(JSON.stringify(fixture.ca.map((c) => ({ id: c.id, huong: c.huong, ...thuc(c) })), null, 1));
  process.exit(0);
}

let passed = 0;
let failed = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || extra === undefined ? '' : ` ${JSON.stringify(extra).slice(0, 400)}`}`);
  if (ok) passed += 1; else failed += 1;
};

for (const c of fixture.ca) {
  const hienTai = thuc(c);
  check(`${c.id} (${c.huong}) ${c.moTa.slice(0, 60)} ⇒ ${c.mong.ketQua}${c.mong.hs ? ' ' + c.mong.hs : ''}`,
    bang(hienTai, c.mong), { mong: c.mong, hienTai });
  if (c.giuYHieuMain) {
    check(`${c.id} giữ hành vi y hệt main (nenMain: ${c.nenMain.ketQua} ${c.nenMain.hs || ''})`,
      bang(hienTai, c.nenMain), { nenMain: c.nenMain, hienTai });
  } else {
    check(`${c.id} vá CÓ TÁC DỤNG (khác nền main: ${c.nenMain.ketQua} ${c.nenMain.hs || ''})`,
      !bang(hienTai, c.nenMain), { nenMain: c.nenMain, hienTai });
  }
}

// OZV-2103 — Cạnh loại trừ 2 chiều 87.08 <-> 83.08 cho ca 76 tầng 4 số
// "Chốt cài khóa dây bảo hiểm có nối tiếp / sắt mạ+nhựa / None"
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const qChot = 'Chốt cài khóa dây bảo hiểm có nối tiếp / sắt mạ+nhựa / None';

  const st8708 = loadSoTay('8708');
  const st8308 = loadSoTay('8308');
  const lt8708 = (st8708?.loaiTru || []).find((x) => x.sangNhom === '8308');
  const lt8308 = (st8308?.loaiTru || []).find((x) => x.sangNhom === '8708');
  check(
    '[OZV-2103 căn cứ] sổ tay 8708 và 8308 có mục loaiTru 2 chiều 8708 <-> 8308 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt8708 &&
        lt8708.canCuLoaiTru?.nguon === 'nhom8308.nhom' &&
        S.checkItem('loaiTru', lt8708, S.sourcesFor('8708'), '8708') === null
    ) &&
      Boolean(
        lt8308 &&
          lt8308.canCuLoaiTru?.nguon === 'nhom8708.nhom' &&
          S.checkItem('loaiTru', lt8308, S.sourcesFor('8308'), '8308') === null
      ),
    { lt8708, lt8308 }
  );

  const c5Tu8708 = D.canhTu('8708', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8308');
  const c5Tu8308 = D.canhTu('8308', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8708');
  const mrTu8708 = D.moRongUngVien(['8708'], qChot);
  const mrTu8308 = D.moRongUngVien(['8308'], qChot);
  check(
    '[OZV-2103 đồ thị 2 chiều] bảng cạnh có C5 8708->8308 & 8308->8708 và moRongUngVien kéo 2 chiều cho ca 76',
    c5Tu8708.length >= 1 &&
      c5Tu8308.length >= 1 &&
      mrTu8708.some((x) => x.nhom === '8308') &&
      mrTu8308.some((x) => x.nhom === '8708'),
    { c5Tu8708: c5Tu8708.length, c5Tu8308: c5Tu8308.length, mrTu8708, mrTu8308 }
  );

  const pb8708 = cauPhanBietNhom('8708', ['8708', '8308'], qChot);
  check(
    '[OZV-2103 thuận 8708->8308] 8708 đứng đầu với [8708, 8308] sinh câu phân biệt từ nhom8708.nhom trỏ sang 83.08',
    pb8708.length === 1 &&
      pb8708[0].loai === 'PHAN_BIET_NHOM' &&
      pb8708[0].canCu === 'so-tay' &&
      pb8708[0].nguon === 'nhom8708.nhom' &&
      /83\.08/.test(pb8708[0].questionVi) &&
      /87\.08/.test(pb8708[0].questionVi),
    { pb8708 }
  );

  const pb8308 = cauPhanBietNhom('8308', ['8308', '8708'], qChot);
  check(
    '[OZV-2103 thuận 8308->8708] 8308 đứng đầu với [8308, 8708] sinh câu phân biệt từ nhom8308.nhom trỏ sang 87.08',
    pb8308.length === 1 &&
      pb8308[0].loai === 'PHAN_BIET_NHOM' &&
      pb8308[0].canCu === 'so-tay' &&
      pb8308[0].nguon === 'nhom8308.nhom' &&
      /87\.08/.test(pb8308[0].questionVi) &&
      /83\.08/.test(pb8308[0].questionVi),
    { pb8308 }
  );

  const dcCanXe8708 = cauPhanBietNhom('8708', ['8708', '8308'], 'Cản trước xe ô tô con bằng nhựa');
  const dcCanXe8308 = cauPhanBietNhom('8308', ['8308', '8708'], 'Cản trước xe ô tô con bằng nhựa');
  const dcDinhTan8708 = cauPhanBietNhom('8708', ['8708', '8308'], 'Đinh tán hình ống bằng đồng dùng cho giày dép');
  const dcDinhTan8308 = cauPhanBietNhom('8308', ['8308', '8708'], 'Đinh tán hình ống bằng đồng dùng cho giày dép');
  const dcKhoaThatLung8708 = cauPhanBietNhom('8708', ['8708', '8308'], 'Khóa thắt lưng bằng đồng dùng cho quần âu');
  const dcKhoaThatLung8308 = cauPhanBietNhom('8308', ['8308', '8708'], 'Khóa thắt lưng bằng đồng dùng cho quần âu');
  check(
    '[OZV-2103 đối chứng] cản trước xe ô tô, đinh tán hình ống và khóa thắt lưng quần âu không hỏi oan 87.08 <-> 83.08',
    dcCanXe8708.length === 0 &&
      dcCanXe8308.length === 0 &&
      dcDinhTan8708.length === 0 &&
      dcDinhTan8308.length === 0 &&
      dcKhoaThatLung8708.length === 0 &&
      dcKhoaThatLung8308.length === 0 &&
      !D.moRongUngVien(['8708'], 'Cản trước xe ô tô con bằng nhựa').some((x) => x.nhom === '8308') &&
      !D.moRongUngVien(['8308'], 'Đinh tán hình ống bằng đồng dùng cho giày dép').some((x) => x.nhom === '8708'),
    { dcCanXe8708, dcCanXe8308, dcDinhTan8708, dcDinhTan8308, dcKhoaThatLung8708, dcKhoaThatLung8308 }
  );
}

// OZV-2113 — Cạnh loại trừ 2 chiều 85.26 <-> 85.37 cho ca 125 tầng 4 số
// "Bộ điều khiển đóng mở / nhựa / điều khiển khóa cửa ô tô"
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const q125 = 'Bộ điều khiển đóng mở / nhựa / điều khiển khóa cửa ô tô';

  const st8526 = loadSoTay('8526');
  const st8537 = loadSoTay('8537');
  const lt8526 = (st8526?.loaiTru || []).find((x) => x.sangNhom === '8537');
  const lt8537 = (st8537?.loaiTru || []).find((x) => x.sangNhom === '8526');
  check(
    '[OZV-2113 căn cứ] sổ tay 8526 và 8537 có mục loaiTru 2 chiều 8526 <-> 8537 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt8526 &&
        lt8526.canCuLoaiTru?.nguon === 'nhom8537.nhom' &&
        S.checkItem('loaiTru', lt8526, S.sourcesFor('8526'), '8526') === null
    ) &&
      Boolean(
        lt8537 &&
          lt8537.canCuLoaiTru?.nguon === 'nhom8526.nhom' &&
          S.checkItem('loaiTru', lt8537, S.sourcesFor('8537'), '8537') === null
      ),
    { lt8526, lt8537 }
  );

  const c5Tu8526 = D.canhTu('8526', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8537');
  const c5Tu8537 = D.canhTu('8537', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8526');
  const mrTu8526 = D.moRongUngVien(['8526'], q125);
  const mrTu8537 = D.moRongUngVien(['8537'], q125);
  check(
    '[OZV-2113 đồ thị 2 chiều] bảng cạnh có C5 8526->8537 & 8537->8526 và moRongUngVien kéo 2 chiều cho ca 125',
    c5Tu8526.length >= 1 &&
      c5Tu8537.length >= 1 &&
      mrTu8526.some((x) => x.nhom === '8537') &&
      mrTu8537.some((x) => x.nhom === '8526'),
    { c5Tu8526: c5Tu8526.length, c5Tu8537: c5Tu8537.length, mrTu8526, mrTu8537 }
  );

  const pb8526 = cauPhanBietNhom('8526', ['8526', '8537'], q125);
  check(
    '[OZV-2113 thuận 8526->8537] 8526 đứng đầu với [8526, 8537] sinh câu phân biệt từ nhom8526.nhom trỏ sang 85.37',
    pb8526.length === 1 &&
      pb8526[0].loai === 'PHAN_BIET_NHOM' &&
      pb8526[0].canCu === 'so-tay' &&
      pb8526[0].nguon === 'nhom8526.nhom' &&
      /85\.37/.test(pb8526[0].questionVi) &&
      /85\.26/.test(pb8526[0].questionVi),
    { pb8526 }
  );

  const pb8537 = cauPhanBietNhom('8537', ['8537', '8526'], q125);
  check(
    '[OZV-2113 thuận 8537->8526] 8537 đứng đầu với [8537, 8526] sinh câu phân biệt từ nhom8537.nhom trỏ sang 85.26',
    pb8537.length === 1 &&
      pb8537[0].loai === 'PHAN_BIET_NHOM' &&
      pb8537[0].canCu === 'so-tay' &&
      pb8537[0].nguon === 'nhom8537.nhom' &&
      /85\.26/.test(pb8537[0].questionVi) &&
      /85\.37/.test(pb8537[0].questionVi),
    { pb8537 }
  );

  const dcRadar8526 = cauPhanBietNhom('8526', ['8526', '8537'], 'Ra đa hàng hải dùng cho tàu thuyền đi biển');
  const dcRadar8537 = cauPhanBietNhom('8537', ['8537', '8526'], 'Ra đa hàng hải dùng cho tàu thuyền đi biển');
  const dcTuDien8526 = cauPhanBietNhom('8526', ['8526', '8537'], 'Tủ bảng điện phân phối hạ thế lắp cầu chì');
  const dcTuDien8537 = cauPhanBietNhom('8537', ['8537', '8526'], 'Tủ bảng điện phân phối hạ thế lắp cầu chì');
  const dcPlc8526 = cauPhanBietNhom('8526', ['8526', '8537'], 'Bộ điều khiển logic có khả năng lập trình PLC cho máy công cụ');
  const dcPlc8537 = cauPhanBietNhom('8537', ['8537', '8526'], 'Bộ điều khiển logic có khả năng lập trình PLC cho máy công cụ');
  check(
    '[OZV-2113 đối chứng] ra đa hàng hải, tủ bảng điện phân phối và bộ điều khiển PLC không hỏi oan 85.26 <-> 85.37',
    dcRadar8526.length === 0 &&
      dcRadar8537.length === 0 &&
      dcTuDien8526.length === 0 &&
      dcTuDien8537.length === 0 &&
      dcPlc8526.length === 0 &&
      dcPlc8537.length === 0 &&
      !D.moRongUngVien(['8526'], 'Ra đa hàng hải dùng cho tàu thuyền đi biển').some((x) => x.nhom === '8537') &&
      !D.moRongUngVien(['8537'], 'Bộ điều khiển logic có khả năng lập trình PLC cho máy công cụ').some((x) => x.nhom === '8526'),
    { dcRadar8526, dcRadar8537, dcTuDien8526, dcTuDien8537, dcPlc8526, dcPlc8537 }
  );
}

// OZV-2127 — Cạnh loại trừ 2 chiều 69.13 <-> 69.14 cho ca 143 tầng 4 số
// "Kệ trưng bày / Sứ / Trang trí không gian, trưng bày sản phẩm"
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const q143 = 'Kệ trưng bày / Sứ / Trang trí không gian, trưng bày sản phẩm';

  const st6913 = loadSoTay('6913');
  const st6914 = loadSoTay('6914');
  const lt6913 = (st6913?.loaiTru || []).find((x) => x.sangNhom === '6914');
  const lt6914 = (st6914?.loaiTru || []).find((x) => x.sangNhom === '6913');
  check(
    '[OZV-2127 căn cứ] sổ tay 6913 và 6914 có mục loaiTru 2 chiều 6913 <-> 6914 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt6913 &&
        lt6913.canCuLoaiTru?.nguon === 'nhom6914.nhom' &&
        S.checkItem('loaiTru', lt6913, S.sourcesFor('6913'), '6913') === null
    ) &&
      Boolean(
        lt6914 &&
          lt6914.canCuLoaiTru?.nguon === 'nhom6913.nhom' &&
          S.checkItem('loaiTru', lt6914, S.sourcesFor('6914'), '6914') === null
      ),
    { lt6913, lt6914 }
  );

  const c5Tu6913 = D.canhTu('6913', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6914');
  const c5Tu6914 = D.canhTu('6914', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6913');
  const mrTu6913 = D.moRongUngVien(['6913'], q143);
  const mrTu6914 = D.moRongUngVien(['6914'], q143);
  check(
    '[OZV-2127 đồ thị 2 chiều] bảng cạnh có C5 6913->6914 & 6914->6913 và moRongUngVien kéo 2 chiều cho ca 143',
    c5Tu6913.length >= 1 &&
      c5Tu6914.length >= 1 &&
      mrTu6913.some((x) => x.nhom === '6914') &&
      mrTu6914.some((x) => x.nhom === '6913'),
    { c5Tu6913: c5Tu6913.length, c5Tu6914: c5Tu6914.length, mrTu6913, mrTu6914 }
  );

  const pb6913 = cauPhanBietNhom('6913', ['6913', '6914'], q143);
  check(
    '[OZV-2127 thuận 6913->6914] 6913 đứng đầu với [6913, 6914] sinh câu phân biệt từ nhom6913.nhom trỏ sang 69.14',
    pb6913.length === 1 &&
      pb6913[0].loai === 'PHAN_BIET_NHOM' &&
      pb6913[0].canCu === 'so-tay' &&
      pb6913[0].nguon === 'nhom6913.nhom' &&
      /69\.14/.test(pb6913[0].questionVi) &&
      /69\.13/.test(pb6913[0].questionVi),
    { pb6913 }
  );

  const pb6914 = cauPhanBietNhom('6914', ['6914', '6913'], q143);
  check(
    '[OZV-2127 thuận 6914->6913] 6914 đứng đầu với [6914, 6913] sinh câu phân biệt từ nhom6914.nhom trỏ sang 69.13',
    pb6914.length === 1 &&
      pb6914[0].loai === 'PHAN_BIET_NHOM' &&
      pb6914[0].canCu === 'so-tay' &&
      pb6914[0].nguon === 'nhom6914.nhom' &&
      /69\.13/.test(pb6914[0].questionVi) &&
      /69\.14/.test(pb6914[0].questionVi),
    { pb6914 }
  );

  const dcNum6913 = cauPhanBietNhom('6913', ['6913', '6914'], 'Núm cửa bằng gốm sứ');
  const dcNum6914 = cauPhanBietNhom('6914', ['6914', '6913'], 'Núm cửa bằng gốm sứ');
  const dcRang6913 = cauPhanBietNhom('6913', ['6913', '6914'], 'Răng giả bằng sứ');
  const dcRang6914 = cauPhanBietNhom('6914', ['6914', '6913'], 'Răng giả bằng sứ');
  const dcLo6913 = cauPhanBietNhom('6913', ['6913', '6914'], 'Lò sưởi bằng gốm');
  const dcLo6914 = cauPhanBietNhom('6914', ['6914', '6913'], 'Lò sưởi bằng gốm');
  check(
    '[OZV-2127 đối chứng] núm cửa gốm sứ, răng giả sứ và lò sưởi gốm không hỏi oan 69.13 <-> 69.14',
    dcNum6913.length === 0 &&
      dcNum6914.length === 0 &&
      dcRang6913.length === 0 &&
      dcRang6914.length === 0 &&
      dcLo6913.length === 0 &&
      dcLo6914.length === 0 &&
      !D.moRongUngVien(['6913'], 'Núm cửa bằng gốm sứ').some((x) => x.nhom === '6914') &&
      !D.moRongUngVien(['6914'], 'Răng giả bằng sứ').some((x) => x.nhom === '6913'),
    { dcNum6913, dcNum6914, dcRang6913, dcRang6914, dcLo6913, dcLo6914 }
  );
}

// OZV-2138 — Cạnh loại trừ 2 chiều 87.14 <-> 87.08 cho ca 148 tầng 4 số
// "Nắp ốp đèn soi biển số cho xe máy / nhựa ABS mạ crom / ốp đèn soi biển số xe máy"
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const q148 = 'Nắp ốp đèn soi biển số cho xe máy / nhựa ABS mạ crom / ốp đèn soi biển số xe máy';

  const st8714 = loadSoTay('8714');
  const st8708 = loadSoTay('8708');
  const lt8714 = (st8714?.loaiTru || []).find((x) => x.sangNhom === '8708');
  const lt8708 = (st8708?.loaiTru || []).find((x) => x.sangNhom === '8714');
  check(
    '[OZV-2138 căn cứ] sổ tay 8714 và 8708 có mục loaiTru 2 chiều 8714 <-> 8708 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt8714 &&
        lt8714.canCuLoaiTru?.nguon === 'nhom8708.nhom' &&
        S.checkItem('loaiTru', lt8714, S.sourcesFor('8714'), '8714') === null
    ) &&
      Boolean(
        lt8708 &&
          lt8708.canCuLoaiTru?.nguon === 'nhom8714.nhom' &&
          S.checkItem('loaiTru', lt8708, S.sourcesFor('8708'), '8708') === null
      ),
    { lt8714, lt8708 }
  );

  const c5Tu8714 = D.canhTu('8714', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8708');
  const c5Tu8708 = D.canhTu('8708', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8714');
  const mrTu8714 = D.moRongUngVien(['8714'], q148);
  const mrTu8708 = D.moRongUngVien(['8708'], q148);
  check(
    '[OZV-2138 đồ thị 2 chiều] bảng cạnh có C5 8714->8708 & 8708->8714 và moRongUngVien kéo 2 chiều cho ca 148',
    c5Tu8714.length >= 1 &&
      c5Tu8708.length >= 1 &&
      mrTu8714.some((x) => x.nhom === '8708') &&
      mrTu8708.some((x) => x.nhom === '8714'),
    { c5Tu8714: c5Tu8714.length, c5Tu8708: c5Tu8708.length, mrTu8714, mrTu8708 }
  );

  const pb8714 = cauPhanBietNhom('8714', ['8714', '8708'], q148);
  check(
    '[OZV-2138 thuận 8714->8708] 8714 đứng đầu với [8714, 8708] sinh câu phân biệt từ nhom8714.nhom trỏ sang 87.08',
    pb8714.length === 1 &&
      pb8714[0].loai === 'PHAN_BIET_NHOM' &&
      pb8714[0].canCu === 'so-tay' &&
      pb8714[0].nguon === 'nhom8714.nhom' &&
      /87\.08/.test(pb8714[0].questionVi) &&
      /87\.14/.test(pb8714[0].questionVi),
    { pb8714 }
  );

  const pb8708 = cauPhanBietNhom('8708', ['8708', '8714'], q148);
  check(
    '[OZV-2138 thuận 8708->8714] 8708 đứng đầu với [8708, 8714] sinh câu phân biệt từ nhom8708.nhom trỏ sang 87.14',
    pb8708.length === 1 &&
      pb8708[0].loai === 'PHAN_BIET_NHOM' &&
      pb8708[0].canCu === 'so-tay' &&
      pb8708[0].nguon === 'nhom8708.nhom' &&
      /87\.14/.test(pb8708[0].questionVi) &&
      /87\.08/.test(pb8708[0].questionVi),
    { pb8708 }
  );

  const dcVoLang8714 = cauPhanBietNhom('8714', ['8714', '8708'], 'Vô lăng xe ô tô con bọc da');
  const dcVoLang8708 = cauPhanBietNhom('8708', ['8708', '8714'], 'Vô lăng xe ô tô con bọc da');
  const dcBanDap8714 = cauPhanBietNhom('8714', ['8714', '8708'], 'Bàn đạp xe đạp thể thao bằng hợp kim nhôm');
  const dcBanDap8708 = cauPhanBietNhom('8708', ['8708', '8714'], 'Bàn đạp xe đạp thể thao bằng hợp kim nhôm');
  const dcTuiKhi8714 = cauPhanBietNhom('8714', ['8714', '8708'], 'Túi khí an toàn lắp tại trần xe ô tô');
  const dcTuiKhi8708 = cauPhanBietNhom('8708', ['8708', '8714'], 'Túi khí an toàn lắp tại trần xe ô tô');
  check(
    '[OZV-2138 đối chứng] vô lăng xe ô tô, bàn đạp xe đạp và túi khí an toàn không hỏi oan 87.14 <-> 87.08',
    dcVoLang8714.length === 0 &&
      dcVoLang8708.length === 0 &&
      dcBanDap8714.length === 0 &&
      dcBanDap8708.length === 0 &&
      dcTuiKhi8714.length === 0 &&
      dcTuiKhi8708.length === 0 &&
      !D.moRongUngVien(['8714'], 'Bàn đạp xe đạp thể thao bằng hợp kim nhôm').some((x) => x.nhom === '8708') &&
      !D.moRongUngVien(['8708'], 'Vô lăng xe ô tô con bọc da').some((x) => x.nhom === '8714'),
    { dcVoLang8714, dcVoLang8708, dcBanDap8714, dcBanDap8708, dcTuiKhi8714, dcTuiKhi8708 }
  );
}

// OZV-2150 — Cạnh loại trừ 2 chiều 85.26 <-> 85.43 cho ca 125 tầng 4 số
// "Bộ điều khiển đóng mở / nhựa / điều khiển khóa cửa ô tô"
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay, soTayGates } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const q125 = 'Bộ điều khiển đóng mở / nhựa / điều khiển khóa cửa ô tô';

  const st8526 = loadSoTay('8526');
  const st8543 = loadSoTay('8543');
  const lt8526 = (st8526?.loaiTru || []).find((x) => x.sangNhom === '8543');
  const lt8543 = (st8543?.loaiTru || []).find((x) => x.sangNhom === '8526');
  check(
    '[OZV-2150 căn cứ] sổ tay 8526 và 8543 có mục loaiTru 2 chiều 8526 <-> 8543 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt8526 &&
        lt8526.nguon === 'nhom8526.nhom' &&
        lt8526.canCuLoaiTru?.nguon === 'nhom8543.nhom' &&
        S.checkItem('loaiTru', lt8526, S.sourcesFor('8526'), '8526') === null
    ) &&
      Boolean(
        lt8543 &&
          lt8543.nguon === 'nhom8543.nhom' &&
          lt8543.canCuLoaiTru?.nguon === 'nhom8526.nhom' &&
          S.checkItem('loaiTru', lt8543, S.sourcesFor('8543'), '8543') === null
      ),
    { lt8526, lt8543 }
  );

  const c5Tu8526 = D.canhTu('8526', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8543');
  const c5Tu8543 = D.canhTu('8543', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8526');
  const c6Tu8526 = D.canhTu('8526', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8543');
  const c6Tu8543 = D.canhTu('8543', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8526');
  const mrTu8526 = D.moRongUngVien(['8526'], q125);
  const mrTu8543 = D.moRongUngVien(['8543'], q125);
  check(
    '[OZV-2150 đồ thị 2 chiều] bảng cạnh có C5/C6 8526<->8543 và moRongUngVien kéo 2 chiều cho ca 125',
    c5Tu8526.length >= 1 &&
      c5Tu8543.length >= 1 &&
      c6Tu8526.length >= 1 &&
      c6Tu8543.length >= 1 &&
      mrTu8526.some((x) => x.nhom === '8543') &&
      mrTu8543.some((x) => x.nhom === '8526'),
    { c5Tu8526: c5Tu8526.length, c5Tu8543: c5Tu8543.length, c6Tu8526: c6Tu8526.length, c6Tu8543: c6Tu8543.length, mrTu8526, mrTu8543 }
  );

  const pb8526 = cauPhanBietNhom('8526', ['8526', '8543'], q125);
  check(
    '[OZV-2150 thuận 8526->8543] 8526 đứng đầu với [8526, 8543] sinh câu phân biệt từ nhom8526.nhom trỏ sang 85.43',
    pb8526.length === 1 &&
      pb8526[0].loai === 'PHAN_BIET_NHOM' &&
      pb8526[0].canCu === 'so-tay' &&
      pb8526[0].nguon === 'nhom8526.nhom' &&
      /85\.43/.test(pb8526[0].questionVi) &&
      /85\.26/.test(pb8526[0].questionVi),
    { pb8526 }
  );

  const pb8543 = cauPhanBietNhom('8543', ['8543', '8526'], q125);
  check(
    '[OZV-2150 thuận 8543->8526] 8543 đứng đầu với [8543, 8526] sinh câu phân biệt từ nhom8543.nhom trỏ sang 85.26',
    pb8543.length === 1 &&
      pb8543[0].loai === 'PHAN_BIET_NHOM' &&
      pb8543[0].canCu === 'so-tay' &&
      pb8543[0].nguon === 'nhom8543.nhom' &&
      /85\.26/.test(pb8543[0].questionVi) &&
      /85\.43/.test(pb8543[0].questionVi),
    { pb8543 }
  );

  const g8526To8543 = soTayGates({
    hs: '85269200',
    productText: q125,
    productName: q125,
    candidateHeadings: ['8526', '8543'],
  });
  const g8543To8526 = soTayGates({
    hs: '85437029',
    productText: q125,
    productName: q125,
    candidateHeadings: ['8543', '8526'],
  });
  check(
    '[OZV-2150 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 8526 -> 8543 và 8543 -> 8526',
    (g8526To8543.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8543')) &&
      (g8543To8526.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8526')),
    { g8526To8543: g8526To8543.challenges, g8543To8526: g8543To8526.challenges }
  );

  const dcRadar8526 = cauPhanBietNhom('8526', ['8526', '8543'], 'Ra đa hàng hải dùng cho tàu thuyền đi biển');
  const dcRadar8543 = cauPhanBietNhom('8543', ['8543', '8526'], 'Ra đa hàng hải dùng cho tàu thuyền đi biển');
  const dcGiaToc8526 = cauPhanBietNhom('8526', ['8526', '8543'], 'Máy gia tốc hạt tạo chùm electron trong công nghiệp');
  const dcGiaToc8543 = cauPhanBietNhom('8543', ['8543', '8526'], 'Máy gia tốc hạt tạo chùm electron trong công nghiệp');
  const dcPhatTinHieu8526 = cauPhanBietNhom('8526', ['8526', '8543'], 'Máy phát tín hiệu cao tần tạo sóng chuẩn');
  const dcPhatTinHieu8543 = cauPhanBietNhom('8543', ['8543', '8526'], 'Máy phát tín hiệu cao tần tạo sóng chuẩn');
  const dcGate8526 = soTayGates({
    hs: '85261010',
    productText: 'Ra đa hàng hải dùng cho tàu thuyền đi biển',
    productName: 'Ra đa hàng hải dùng cho tàu thuyền đi biển',
    candidateHeadings: ['8526', '8543'],
  });
  const dcGate8543 = soTayGates({
    hs: '85431000',
    productText: 'Máy gia tốc hạt tạo chùm electron trong công nghiệp',
    productName: 'Máy gia tốc hạt tạo chùm electron trong công nghiệp',
    candidateHeadings: ['8543', '8526'],
  });
  check(
    '[OZV-2150 đối chứng] ra đa hàng hải, máy gia tốc hạt và máy phát tín hiệu không hỏi oan / không kéo oan 85.26 <-> 85.43',
    dcRadar8526.length === 0 &&
      dcRadar8543.length === 0 &&
      dcGiaToc8526.length === 0 &&
      dcGiaToc8543.length === 0 &&
      dcPhatTinHieu8526.length === 0 &&
      dcPhatTinHieu8543.length === 0 &&
      !(dcGate8526.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8543')) &&
      !(dcGate8543.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8526')) &&
      !D.moRongUngVien(['8526'], 'Ra đa hàng hải dùng cho tàu thuyền đi biển').some((x) => x.nhom === '8543') &&
      !D.moRongUngVien(['8543'], 'Máy gia tốc hạt tạo chùm electron trong công nghiệp').some((x) => x.nhom === '8526'),
    { dcRadar8526, dcRadar8543, dcGiaToc8526, dcGiaToc8543, dcPhatTinHieu8526, dcPhatTinHieu8543 }
  );

  const ht125 = phanTichHoiTruoc4So({ moTa: q125, ungVien: ['8526', '8543'] });
  const distinctDk125 = new Set((ht125.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2150 hoi-truoc-4so] ca 125 với [8526, 8543] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt từ cạnh C5',
    ht125.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk125 &&
      (ht125.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:')) &&
      ['8526', '8543'].every((h) => (ht125.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht125.trangThai, distinctDk125, nhanh: ht125.nhanh, dapAnDieuKien: ht125.dapAnDieuKien }
  );
}

// OZV-2168 — Cạnh loại trừ 2 chiều 60.04 <-> 60.05 cho ca 124 tầng 4 số
// "Vải gió dệt kim / None / None" (nhomNhan: ["5903","6001","6004","6005","6006"])
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  D.datLai();

  const moTaCa124 = 'Vải gió dệt kim / None / None';
  const s6004 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '6004.json'), 'utf8'));
  const s6005 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '6005.json'), 'utf8'));
  const v6004 = S.verifySoTay(s6004, '6004');
  const v6005 = S.verifySoTay(s6005, '6005');
  check(
    '[OZV-2168 verifySoTay] sổ tay 6004 và 6005 đạt 100% (0 mục bị loại)',
    v6004.loai.length === 0 && v6005.loai.length === 0 && v6004.dat === v6004.tong && v6005.dat === v6005.tong,
    { loai6004: v6004.loai, loai6005: v6005.loai, tong6004: v6004.tong, tong6005: v6005.tong }
  );

  const st6004 = loadSoTay('6004');
  const st6005 = loadSoTay('6005');
  const lt6004 = (st6004?.loaiTru || []).find((x) => x.sangNhom === '6005');
  const lt6005 = (st6005?.loaiTru || []).find((x) => x.sangNhom === '6004');
  check(
    '[OZV-2168 căn cứ] sổ tay 6004 và 6005 có mục loaiTru 2 chiều 6004 <-> 6005 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt6004 &&
        lt6004.nguon === 'nhom6004.nhom' &&
        lt6004.canCuLoaiTru?.nguon === 'nhom6005.nhom' &&
        lt6004.dieuKien !== lt6005?.dieuKien &&
        !/;/.test(lt6004.dieuKien || '') &&
        S.checkItem('loaiTru', lt6004, S.sourcesFor('6004'), '6004') === null
    ) &&
      Boolean(
        lt6005 &&
          lt6005.nguon === 'nhom6005.nhom' &&
          lt6005.canCuLoaiTru?.nguon === 'nhom6004.nhom' &&
          !/;/.test(lt6005.dieuKien || '') &&
          S.checkItem('loaiTru', lt6005, S.sourcesFor('6005'), '6005') === null
      ),
    { lt6004, lt6005 }
  );

  const c5Tu6004 = D.canhTu('6004', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6005');
  const c5Tu6005 = D.canhTu('6005', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6004');
  const c6Tu6004 = D.canhTu('6004', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6005');
  const c6Tu6005 = D.canhTu('6005', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6004');
  const giua6004_6005 = D.canhGiuaNhomConSong(['6004', '6005']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu6004 = D.moRongUngVien(['6004'], moTaCa124, { toiDa: 10 });
  const mrTu6005 = D.moRongUngVien(['6005'], moTaCa124, { toiDa: 10 });
  check(
    '[OZV-2168 đồ thị 2 chiều] bảng cạnh có C5/C6 6004<->6005, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 124',
    c5Tu6004.some((e) => e.nguon === 'nhom6004.nhom' && e.canCuLoaiTru?.nguon === 'nhom6005.nhom') &&
      c5Tu6005.some((e) => e.nguon === 'nhom6005.nhom' && e.canCuLoaiTru?.nguon === 'nhom6004.nhom') &&
      c6Tu6004.length >= 1 &&
      c6Tu6005.length >= 1 &&
      giua6004_6005.length >= 2 &&
      mrTu6004.some((x) => x.nhom === '6005') &&
      mrTu6005.some((x) => x.nhom === '6004'),
    { c5Tu6004: c5Tu6004.length, c5Tu6005: c5Tu6005.length, giua: giua6004_6005.length, mrTu6004, mrTu6005 }
  );

  check(
    '[OZV-2168 nhomLienQuanSoTay] liên kết hai chiều 6004 <-> 6005',
    nhomLienQuanSoTay('6004').includes('6005') && nhomLienQuanSoTay('6005').includes('6004'),
    { rel6004: nhomLienQuanSoTay('6004'), rel6005: nhomLienQuanSoTay('6005') }
  );

  const pb6004 = cauPhanBietNhom('6004', ['6004', '6005'], moTaCa124);
  check(
    '[OZV-2168 thuận 6004->6005] 6004 đứng đầu với [6004, 6005] sinh câu phân biệt từ nhom6004.nhom trỏ sang 60.05',
    pb6004.length === 1 &&
      pb6004[0].loai === 'PHAN_BIET_NHOM' &&
      pb6004[0].canCu === 'so-tay' &&
      pb6004[0].nguon === 'nhom6004.nhom' &&
      /60\.05/.test(pb6004[0].questionVi) &&
      /60\.04/.test(pb6004[0].questionVi),
    { pb6004 }
  );

  const pb6005 = cauPhanBietNhom('6005', ['6005', '6004'], moTaCa124);
  check(
    '[OZV-2168 thuận 6005->6004] 6005 đứng đầu với [6005, 6004] sinh câu phân biệt từ nhom6005.nhom trỏ sang 60.04',
    pb6005.length === 1 &&
      pb6005[0].loai === 'PHAN_BIET_NHOM' &&
      pb6005[0].canCu === 'so-tay' &&
      pb6005[0].nguon === 'nhom6005.nhom' &&
      /60\.04/.test(pb6005[0].questionVi) &&
      /60\.05/.test(pb6005[0].questionVi),
    { pb6005 }
  );

  const g6004To6005 = soTayGates({
    hs: '60041010',
    productText: 'Vải gió dệt kim sợi dọc khổ rộng trên 30 cm, không chứa hoặc chứa dưới 5% sợi đàn hồi hoặc sợi cao su',
    productName: 'Vải gió dệt kim sợi dọc khổ rộng trên 30 cm, không chứa hoặc chứa dưới 5% sợi đàn hồi hoặc sợi cao su',
    candidateHeadings: ['6004', '6005'],
  });
  const g6005To6004 = soTayGates({
    hs: '60052100',
    productText: 'Vải gió dệt kim hoặc móc khổ rộng trên 30 cm chứa từ 5% trở lên theo trọng lượng sợi đàn hồi hoặc sợi cao su',
    productName: 'Vải gió dệt kim hoặc móc khổ rộng trên 30 cm chứa từ 5% trở lên theo trọng lượng sợi đàn hồi hoặc sợi cao su',
    candidateHeadings: ['6005', '6004'],
  });
  check(
    '[OZV-2168 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 6004 -> 6005 và 6005 -> 6004',
    (g6004To6005.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6005')) &&
      (g6005To6004.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6004')),
    { g6004To6005: g6004To6005.challenges, g6005To6004: g6005To6004.challenges }
  );

  const dcBang6004 = cauPhanBietNhom('6004', ['6004', '6005'], 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ');
  const dcBang6005 = cauPhanBietNhom('6005', ['6005', '6004'], 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ');
  const dcTheu6004 = cauPhanBietNhom('6004', ['6004', '6005'], 'Vải thêu thuộc nhóm 58.10');
  const dcTheu6005 = cauPhanBietNhom('6005', ['6005', '6004'], 'Vải thêu thuộc nhóm 58.10');
  const dcGate6004 = soTayGates({
    hs: '60041010',
    productText: 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ',
    productName: 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ',
    candidateHeadings: ['6004', '6005'],
  });
  const dcGate6005 = soTayGates({
    hs: '60052200',
    productText: 'Vải thêu thuộc nhóm 58.10',
    productName: 'Vải thêu thuộc nhóm 58.10',
    candidateHeadings: ['6005', '6004'],
  });
  check(
    '[OZV-2168 đối chứng] băng tẩm thuốc và vải thêu không hỏi oan / không kéo oan 60.04 <-> 60.05',
    dcBang6004.length === 0 &&
      dcBang6005.length === 0 &&
      dcTheu6004.length === 0 &&
      dcTheu6005.length === 0 &&
      !(dcGate6004.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6005')) &&
      !(dcGate6005.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6004')) &&
      !D.moRongUngVien(['6004'], 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ').some((x) => x.nhom === '6005') &&
      !D.moRongUngVien(['6005'], 'Vải thêu thuộc nhóm 58.10').some((x) => x.nhom === '6004'),
    { dcBang6004, dcBang6005, dcTheu6004, dcTheu6005 }
  );

  const ht124 = phanTichHoiTruoc4So({ moTa: moTaCa124, ungVien: ['6004', '6005'] });
  const distinctDk124 = new Set((ht124.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2168 hoi-truoc-4so] ca 124 với [6004, 6005] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt từ cạnh C5',
    ht124.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk124 &&
      (ht124.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:')) &&
      ['6004', '6005'].every((h) => (ht124.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht124.trangThai, distinctDk124, nhanh: ht124.nhanh, dapAnDieuKien: ht124.dapAnDieuKien }
  );
}

// OZV-2177 — Cạnh loại trừ 2 chiều 54.02 <-> 54.04 cho ca 196 tầng 4 số
// "Sợi filament tổng hợp / Polyamide (Nylon) / Dùng để gia công lõi dây câu" (nhomNhan: ["5402"])
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  D.datLai();

  const moTaCa196 = 'Sợi filament tổng hợp / Polyamide (Nylon) / Dùng để gia công lõi dây câu';
  const s5402 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '5402.json'), 'utf8'));
  const s5404 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '5404.json'), 'utf8'));
  const v5402 = S.verifySoTay(s5402, '5402');
  const v5404 = S.verifySoTay(s5404, '5404');
  check(
    '[OZV-2177 verifySoTay] sổ tay 5402 và 5404 đạt 100% (0 mục bị loại)',
    v5402.loai.length === 0 && v5404.loai.length === 0 && v5402.dat === v5402.tong && v5404.dat === v5404.tong,
    { loai5402: v5402.loai, loai5404: v5404.loai, tong5402: v5402.tong, tong5404: v5404.tong }
  );

  const st5402 = loadSoTay('5402');
  const st5404 = loadSoTay('5404');
  const lt5402 = (st5402?.loaiTru || []).find((x) => x.sangNhom === '5404');
  const lt5404 = (st5404?.loaiTru || []).find((x) => x.sangNhom === '5402');
  check(
    '[OZV-2177 căn cứ] sổ tay 5402 và 5404 có mục loaiTru 2 chiều 5402 <-> 5404 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt5402 &&
        lt5402.nguon === 'nhom5402.nhom' &&
        lt5402.canCuLoaiTru?.nguon === 'nhom5404.nhom' &&
        lt5402.dieuKien !== lt5404?.dieuKien &&
        !/;/.test(lt5402.dieuKien || '') &&
        S.checkItem('loaiTru', lt5402, S.sourcesFor('5402'), '5402') === null
    ) &&
      Boolean(
        lt5404 &&
          lt5404.nguon === 'nhom5404.nhom' &&
          lt5404.canCuLoaiTru?.nguon === 'nhom5402.nhom' &&
          !/;/.test(lt5404.dieuKien || '') &&
          S.checkItem('loaiTru', lt5404, S.sourcesFor('5404'), '5404') === null
      ),
    { lt5402, lt5404 }
  );

  const c5Tu5402 = D.canhTu('5402', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5404');
  const c5Tu5404 = D.canhTu('5404', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5402');
  const c6Tu5402 = D.canhTu('5402', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5404');
  const c6Tu5404 = D.canhTu('5404', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5402');
  const giua5402_5404 = D.canhGiuaNhomConSong(['5402', '5404']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu5402 = D.moRongUngVien(['5402'], moTaCa196);
  const mrTu5404 = D.moRongUngVien(['5404'], moTaCa196);
  check(
    '[OZV-2177 đồ thị 2 chiều] bảng cạnh có C5/C6 5402<->5404, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 196',
    c5Tu5402.some((e) => e.nguon === 'nhom5402.nhom' && e.canCuLoaiTru?.nguon === 'nhom5404.nhom') &&
      c5Tu5404.some((e) => e.nguon === 'nhom5404.nhom' && e.canCuLoaiTru?.nguon === 'nhom5402.nhom') &&
      c6Tu5402.length >= 1 &&
      c6Tu5404.length >= 1 &&
      giua5402_5404.length >= 2 &&
      mrTu5402.some((x) => x.nhom === '5404') &&
      mrTu5404.some((x) => x.nhom === '5402'),
    { c5Tu5402: c5Tu5402.length, c5Tu5404: c5Tu5404.length, giua: giua5402_5404.length, mrTu5402, mrTu5404 }
  );

  check(
    '[OZV-2177 nhomLienQuanSoTay] liên kết hai chiều 5402 <-> 5404',
    nhomLienQuanSoTay('5402').includes('5404') && nhomLienQuanSoTay('5404').includes('5402'),
    { rel5402: nhomLienQuanSoTay('5402'), rel5404: nhomLienQuanSoTay('5404') }
  );

  const pb5402 = cauPhanBietNhom('5402', ['5402', '5404'], moTaCa196);
  check(
    '[OZV-2177 thuận 5402->5404] 5402 đứng đầu với [5402, 5404] sinh câu phân biệt từ nhom5402.nhom trỏ sang 54.04',
    pb5402.length === 1 &&
      pb5402[0].loai === 'PHAN_BIET_NHOM' &&
      pb5402[0].canCu === 'so-tay' &&
      pb5402[0].nguon === 'nhom5402.nhom' &&
      /54\.04/.test(pb5402[0].questionVi) &&
      /54\.02/.test(pb5402[0].questionVi),
    { pb5402 }
  );

  const pb5404 = cauPhanBietNhom('5404', ['5404', '5402'], moTaCa196);
  check(
    '[OZV-2177 thuận 5404->5402] 5404 đứng đầu với [5404, 5402] sinh câu phân biệt từ nhom5404.nhom trỏ sang 54.02',
    pb5404.length === 1 &&
      pb5404[0].loai === 'PHAN_BIET_NHOM' &&
      pb5404[0].canCu === 'so-tay' &&
      pb5404[0].nguon === 'nhom5404.nhom' &&
      /54\.02/.test(pb5404[0].questionVi) &&
      /54\.04/.test(pb5404[0].questionVi),
    { pb5404 }
  );

  const g5402To5404 = soTayGates({
    hs: '54024500',
    productText: moTaCa196,
    productName: moTaCa196,
    candidateHeadings: ['5402', '5404'],
  });
  const g5404To5402 = soTayGates({
    hs: '54041900',
    productText: moTaCa196,
    productName: moTaCa196,
    candidateHeadings: ['5404', '5402'],
  });
  check(
    '[OZV-2177 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 5402 -> 5404 và 5404 -> 5402',
    (g5402To5404.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5404')) &&
      (g5404To5402.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5402')),
    { g5402To5404: g5402To5404.challenges, g5404To5402: g5404To5402.challenges }
  );

  const dcTo5402 = cauPhanBietNhom('5402', ['5402', '5404'], 'Tô filament tổng hợp có chiều dài trên 2 mét thuộc nhóm 55.01');
  const dcTo5404 = cauPhanBietNhom('5404', ['5404', '5402'], 'Tô filament tổng hợp có chiều dài trên 2 mét thuộc nhóm 55.01');
  const dcLuoiCau5402 = cauPhanBietNhom('5402', ['5402', '5404'], 'Lưỡi câu cá bằng thép carbon thuộc nhóm 95.07');
  const dcLuoiCau5404 = cauPhanBietNhom('5404', ['5404', '5402'], 'Lưỡi câu cá bằng thép carbon thuộc nhóm 95.07');
  const dcGate5402 = soTayGates({
    hs: '54024500',
    productText: 'Tô filament tổng hợp có chiều dài trên 2 mét thuộc nhóm 55.01',
    productName: 'Tô filament tổng hợp có chiều dài trên 2 mét thuộc nhóm 55.01',
    candidateHeadings: ['5402', '5404'],
  });
  const dcGate5404 = soTayGates({
    hs: '54041900',
    productText: 'Lưỡi câu cá bằng thép carbon thuộc nhóm 95.07',
    productName: 'Lưỡi câu cá bằng thép carbon thuộc nhóm 95.07',
    candidateHeadings: ['5404', '5402'],
  });
  check(
    '[OZV-2177 đối chứng] tô filament tổng hợp trên 2 mét và lưỡi câu cá không hỏi oan / không kéo oan 54.02 <-> 54.04',
    dcTo5402.length === 0 &&
      dcTo5404.length === 0 &&
      dcLuoiCau5402.length === 0 &&
      dcLuoiCau5404.length === 0 &&
      !(dcGate5402.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5404')) &&
      !(dcGate5404.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5402')) &&
      !D.moRongUngVien(['5402'], 'Tô filament tổng hợp có chiều dài trên 2 mét thuộc nhóm 55.01').some((x) => x.nhom === '5404') &&
      !D.moRongUngVien(['5404'], 'Lưỡi câu cá bằng thép carbon thuộc nhóm 95.07').some((x) => x.nhom === '5402'),
    { dcTo5402, dcTo5404, dcLuoiCau5402, dcLuoiCau5404 }
  );

  const ht196 = phanTichHoiTruoc4So({ moTa: moTaCa196, ungVien: ['5402', '5404'] });
  const distinctDk196 = new Set((ht196.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2177 hoi-truoc-4so] ca 196 với [5402, 5404] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt từ đồ thị',
    ht196.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk196 &&
      (ht196.nhanh || []).every((n) => /^do-thi:C[57]:/.test(String(n.nguon || ''))) &&
      ['5402', '5404'].every((h) => (ht196.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht196.trangThai, distinctDk196, nhanh: ht196.nhanh, dapAnDieuKien: ht196.dapAnDieuKien }
  );
}

// OZV-2182 — Cạnh loại trừ 2 chiều 39.20 <-> 39.21 cho ca 104 tầng 4 số
// "Phim cường lực bảo vệ màn hình đồng hồ thông minh bằng nhựa PPF"
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  D.datLai();

  const moTaCa104 = 'Phim cường lực bảo vệ màn hình đồng hồ thông minh bằng nhựa PPF';
  const s3920 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '3920.json'), 'utf8'));
  const s3921 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '3921.json'), 'utf8'));
  const v3920 = S.verifySoTay(s3920, '3920');
  const v3921 = S.verifySoTay(s3921, '3921');
  check(
    '[OZV-2182 verifySoTay] sổ tay 3920 và 3921 đạt 100% (0 mục bị loại)',
    v3920.loai.length === 0 && v3921.loai.length === 0 && v3920.dat === v3920.tong && v3921.dat === v3921.tong,
    { loai3920: v3920.loai, loai3921: v3921.loai, tong3920: v3920.tong, tong3921: v3921.tong }
  );

  const st3920 = loadSoTay('3920');
  const st3921 = loadSoTay('3921');
  const lt3920 = (st3920?.loaiTru || []).find((x) => x.sangNhom === '3921' && x.canCuLoaiTru);
  const lt3921 = (st3921?.loaiTru || []).find((x) => x.sangNhom === '3920');
  check(
    '[OZV-2182 căn cứ] sổ tay 3920 và 3921 có mục loaiTru 2 chiều 3920 <-> 3921 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt3920 &&
        lt3920.nguon === 'nhom3920.nhom' &&
        lt3920.canCuLoaiTru?.nguon === 'nhom3921.nhom' &&
        lt3920.dieuKien !== lt3921?.dieuKien &&
        !/;/.test(lt3920.dieuKien || '') &&
        S.checkItem('loaiTru', lt3920, S.sourcesFor('3920'), '3920') === null
    ) &&
      Boolean(
        lt3921 &&
          lt3921.nguon === 'nhom3921.nhom' &&
          lt3921.canCuLoaiTru?.nguon === 'nhom3920.nhom' &&
          !/;/.test(lt3921.dieuKien || '') &&
          S.checkItem('loaiTru', lt3921, S.sourcesFor('3921'), '3921') === null
      ),
    { lt3920, lt3921 }
  );

  const c5Tu3920 = D.canhTu('3920', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '3921');
  const c5Tu3921 = D.canhTu('3921', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '3920');
  const c6Tu3920 = D.canhTu('3920', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '3921');
  const c6Tu3921 = D.canhTu('3921', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '3920');
  const giua3920_3921 = D.canhGiuaNhomConSong(['3920', '3921']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu3920 = D.moRongUngVien(['3920'], moTaCa104);
  const mrTu3921 = D.moRongUngVien(['3921'], moTaCa104);
  check(
    '[OZV-2182 đồ thị 2 chiều] bảng cạnh có C5/C6 3920<->3921, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 104',
    c5Tu3920.some((e) => e.nguon === 'nhom3920.nhom' && e.canCuLoaiTru?.nguon === 'nhom3921.nhom') &&
      c5Tu3921.some((e) => e.nguon === 'nhom3921.nhom' && e.canCuLoaiTru?.nguon === 'nhom3920.nhom') &&
      c6Tu3920.length >= 1 &&
      c6Tu3921.length >= 1 &&
      giua3920_3921.length >= 2 &&
      mrTu3920.some((x) => x.nhom === '3921') &&
      mrTu3921.some((x) => x.nhom === '3920'),
    { c5Tu3920: c5Tu3920.length, c5Tu3921: c5Tu3921.length, giua: giua3920_3921.length, mrTu3920, mrTu3921 }
  );

  check(
    '[OZV-2182 nhomLienQuanSoTay] liên kết hai chiều 3920 <-> 3921',
    nhomLienQuanSoTay('3920').includes('3921') && nhomLienQuanSoTay('3921').includes('3920'),
    { rel3920: nhomLienQuanSoTay('3920'), rel3921: nhomLienQuanSoTay('3921') }
  );

  const pb3920 = cauPhanBietNhom('3920', ['3920', '3921'], moTaCa104);
  check(
    '[OZV-2182 thuận 3920->3921] 3920 đứng đầu với [3920, 3921] sinh câu phân biệt từ nhom3920.nhom trỏ sang 39.21',
    pb3920.length === 1 &&
      pb3920[0].loai === 'PHAN_BIET_NHOM' &&
      pb3920[0].canCu === 'so-tay' &&
      pb3920[0].nguon === 'nhom3920.nhom' &&
      /39\.21/.test(pb3920[0].questionVi) &&
      /39\.20/.test(pb3920[0].questionVi),
    { pb3920 }
  );

  const pb3921 = cauPhanBietNhom('3921', ['3921', '3920'], moTaCa104);
  check(
    '[OZV-2182 thuận 3921->3920] 3921 đứng đầu với [3921, 3920] sinh câu phân biệt từ nhom3921.nhom trỏ sang 39.20',
    pb3921.length === 1 &&
      pb3921[0].loai === 'PHAN_BIET_NHOM' &&
      pb3921[0].canCu === 'so-tay' &&
      pb3921[0].nguon === 'nhom3921.nhom' &&
      /39\.20/.test(pb3921[0].questionVi) &&
      /39\.21/.test(pb3921[0].questionVi),
    { pb3921 }
  );

  const g3920To3921 = soTayGates({
    hs: '39201090',
    productText: moTaCa104,
    productName: moTaCa104,
    candidateHeadings: ['3920', '3921'],
  });
  const g3921To3920 = soTayGates({
    hs: '39211199',
    productText: moTaCa104,
    productName: moTaCa104,
    candidateHeadings: ['3921', '3920'],
  });
  check(
    '[OZV-2182 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 3920 -> 3921 và 3921 -> 3920',
    (g3920To3921.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3921')) &&
      (g3921To3920.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3920')),
    { g3920To3921: g3920To3921.challenges, g3921To3920: g3921To3920.challenges }
  );

  const dcSan3920 = cauPhanBietNhom('3920', ['3920', '3921'], 'Tấm trải sàn PVC thuộc nhóm 39.18');
  const dcSan3921 = cauPhanBietNhom('3921', ['3921', '3920'], 'Tấm trải sàn PVC thuộc nhóm 39.18');
  const dcKeo3920 = cauPhanBietNhom('3920', ['3920', '3921'], 'Keo dán epoxy hai thành phần thuộc nhóm 35.06');
  const dcKeo3921 = cauPhanBietNhom('3921', ['3921', '3920'], 'Keo dán epoxy hai thành phần thuộc nhóm 35.06');
  const dcGate3920 = soTayGates({
    hs: '39201090',
    productText: 'Tấm trải sàn PVC thuộc nhóm 39.18',
    productName: 'Tấm trải sàn PVC thuộc nhóm 39.18',
    candidateHeadings: ['3920', '3921'],
  });
  const dcGate3921 = soTayGates({
    hs: '39211199',
    productText: 'Keo dán epoxy hai thành phần thuộc nhóm 35.06',
    productName: 'Keo dán epoxy hai thành phần thuộc nhóm 35.06',
    candidateHeadings: ['3921', '3920'],
  });
  check(
    '[OZV-2182 đối chứng] tấm trải sàn PVC và keo epoxy không hỏi oan / không kéo oan 39.20 <-> 39.21',
    dcSan3920.length === 0 &&
      dcSan3921.length === 0 &&
      dcKeo3920.length === 0 &&
      dcKeo3921.length === 0 &&
      !(dcGate3920.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3921')) &&
      !(dcGate3921.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3920')) &&
      !D.moRongUngVien(['3920'], 'Tấm trải sàn PVC thuộc nhóm 39.18').some((x) => x.nhom === '3921') &&
      !D.moRongUngVien(['3921'], 'Keo dán epoxy hai thành phần thuộc nhóm 35.06').some((x) => x.nhom === '3920'),
    { dcSan3920, dcSan3921, dcKeo3920, dcKeo3921 }
  );

  const ht104 = phanTichHoiTruoc4So({ moTa: moTaCa104, ungVien: ['3920', '3921'] });
  const distinctDk104 = new Set((ht104.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2182 hoi-truoc-4so] ca 104 với [3920, 3921] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt từ đồ thị',
    ht104.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk104 &&
      (ht104.nhanh || []).every((n) => /^do-thi:C[567]:/.test(String(n.nguon || ''))) &&
      ['3920', '3921'].every((h) => (ht104.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht104.trangThai, distinctDk104, nhanh: ht104.nhanh, dapAnDieuKien: ht104.dapAnDieuKien }
  );
}

// OZV-2188 — Cạnh loại trừ 2 chiều 85.35 <-> 85.36 cho ca 103 tầng 4 số
// "Đầu nối tín hiệu cho cáp dẹt"
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  D.datLai();

  const moTaCa103 = 'Đầu nối tín hiệu cho cáp dẹt';
  const s8535 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '8535.json'), 'utf8'));
  const s8536 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '8536.json'), 'utf8'));
  const v8535 = S.verifySoTay(s8535, '8535');
  const v8536 = S.verifySoTay(s8536, '8536');
  check(
    '[OZV-2188 verifySoTay] sổ tay 8535 và 8536 đạt 100% (0 mục bị loại)',
    v8535.loai.length === 0 && v8536.loai.length === 0 && v8535.dat === v8535.tong && v8536.dat === v8536.tong,
    { loai8535: v8535.loai, loai8536: v8536.loai, tong8535: v8535.tong, tong8536: v8536.tong }
  );

  const st8535 = loadSoTay('8535');
  const st8536 = loadSoTay('8536');
  const lt8535 = (st8535?.loaiTru || []).find((x) => x.sangNhom === '8536');
  const lt8536 = (st8536?.loaiTru || []).find((x) => x.sangNhom === '8535');
  check(
    '[OZV-2188 căn cứ] sổ tay 8535 và 8536 có mục loaiTru 2 chiều 8535 <-> 8536 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt8535 &&
        lt8535.nguon === 'nhom8535.nhom' &&
        lt8535.canCuLoaiTru?.nguon === 'nhom8536.nhom' &&
        lt8535.dieuKien !== lt8536?.dieuKien &&
        !/;/.test(lt8535.dieuKien || '') &&
        S.checkItem('loaiTru', lt8535, S.sourcesFor('8535'), '8535') === null
    ) &&
      Boolean(
        lt8536 &&
          lt8536.nguon === 'nhom8536.nhom' &&
          lt8536.canCuLoaiTru?.nguon === 'nhom8535.nhom' &&
          !/;/.test(lt8536.dieuKien || '') &&
          S.checkItem('loaiTru', lt8536, S.sourcesFor('8536'), '8536') === null
      ),
    { lt8535, lt8536 }
  );

  const c5Tu8535 = D.canhTu('8535', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8536');
  const c5Tu8536 = D.canhTu('8536', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8535');
  const c6Tu8535 = D.canhTu('8535', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8536');
  const c6Tu8536 = D.canhTu('8536', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8535');
  const giua8535_8536 = D.canhGiuaNhomConSong(['8535', '8536']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu8535 = D.moRongUngVien(['8535'], moTaCa103);
  const mrTu8536 = D.moRongUngVien(['8536'], moTaCa103);
  check(
    '[OZV-2188 đồ thị 2 chiều] bảng cạnh có C5/C6 8535<->8536, canhGiuaNhomConSong >= 2 và moRongUngVien kéo 2 chiều cho ca 103',
    c5Tu8535.some((e) => e.nguon === 'nhom8535.nhom' && e.canCuLoaiTru?.nguon === 'nhom8536.nhom') &&
      c5Tu8536.some((e) => e.nguon === 'nhom8536.nhom' && e.canCuLoaiTru?.nguon === 'nhom8535.nhom') &&
      c6Tu8535.length >= 1 &&
      c6Tu8536.length >= 1 &&
      giua8535_8536.length >= 2 &&
      mrTu8535.some((x) => x.nhom === '8536') &&
      mrTu8536.some((x) => x.nhom === '8535'),
    { c5Tu8535: c5Tu8535.length, c5Tu8536: c5Tu8536.length, giua: giua8535_8536.length, mrTu8535, mrTu8536 }
  );

  check(
    '[OZV-2188 nhomLienQuanSoTay] liên kết hai chiều 8535 <-> 8536',
    nhomLienQuanSoTay('8535').includes('8536') && nhomLienQuanSoTay('8536').includes('8535'),
    { rel8535: nhomLienQuanSoTay('8535'), rel8536: nhomLienQuanSoTay('8536') }
  );

  const pb8535 = cauPhanBietNhom('8535', ['8535', '8536'], moTaCa103);
  check(
    '[OZV-2188 thuận 8535->8536] 8535 đứng đầu với [8535, 8536] sinh câu phân biệt từ nhom8535.nhom trỏ sang 85.36',
    pb8535.length === 1 &&
      pb8535[0].loai === 'PHAN_BIET_NHOM' &&
      pb8535[0].canCu === 'so-tay' &&
      pb8535[0].nguon === 'nhom8535.nhom' &&
      /85\.36/.test(pb8535[0].questionVi) &&
      /85\.35/.test(pb8535[0].questionVi),
    { pb8535 }
  );

  const pb8536 = cauPhanBietNhom('8536', ['8536', '8535'], moTaCa103);
  check(
    '[OZV-2188 thuận 8536->8535] 8536 đứng đầu với [8536, 8535] sinh câu phân biệt từ nhom8536.nhom trỏ sang 85.35',
    pb8536.length === 1 &&
      pb8536[0].loai === 'PHAN_BIET_NHOM' &&
      pb8536[0].canCu === 'so-tay' &&
      pb8536[0].nguon === 'nhom8536.nhom' &&
      /85\.35/.test(pb8536[0].questionVi) &&
      /85\.36/.test(pb8536[0].questionVi),
    { pb8536 }
  );

  const g8535To8536 = soTayGates({
    hs: '85359090',
    productText: moTaCa103,
    productName: moTaCa103,
    candidateHeadings: ['8535', '8536'],
  });
  const g8536To8535 = soTayGates({
    hs: '85369099',
    productText: moTaCa103,
    productName: moTaCa103,
    candidateHeadings: ['8536', '8535'],
  });
  check(
    '[OZV-2188 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 8535 -> 8536 và 8536 -> 8535',
    (g8535To8536.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8536')) &&
      (g8536To8535.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8535')),
    { g8535To8536: g8535To8536.challenges, g8536To8535: g8536To8535.challenges }
  );

  const dcChongSet8535 = cauPhanBietNhom('8535', ['8535', '8536'], 'Bộ chống sét hoạt động theo nguyên lý phóng xạ thuộc nhóm 90.22');
  const dcChongSet8536 = cauPhanBietNhom('8536', ['8536', '8535'], 'Bộ chống sét hoạt động theo nguyên lý phóng xạ thuộc nhóm 90.22');
  const dcChotCua8535 = cauPhanBietNhom('8535', ['8535', '8536'], 'Chốt cửa có gắn công tắc thuộc nhóm 83.01');
  const dcChotCua8536 = cauPhanBietNhom('8536', ['8536', '8535'], 'Chốt cửa có gắn công tắc thuộc nhóm 83.01');
  const dcGate8535 = soTayGates({
    hs: '85354000',
    productText: 'Bộ chống sét hoạt động theo nguyên lý phóng xạ thuộc nhóm 90.22',
    productName: 'Bộ chống sét hoạt động theo nguyên lý phóng xạ thuộc nhóm 90.22',
    candidateHeadings: ['8535', '8536'],
  });
  const dcGate8536 = soTayGates({
    hs: '85365099',
    productText: 'Chốt cửa có gắn công tắc thuộc nhóm 83.01',
    productName: 'Chốt cửa có gắn công tắc thuộc nhóm 83.01',
    candidateHeadings: ['8536', '8535'],
  });
  check(
    '[OZV-2188 đối chứng] bộ chống sét phóng xạ và chốt cửa gắn công tắc không hỏi oan / không kéo oan 85.35 <-> 85.36',
    dcChongSet8535.length === 0 &&
      dcChongSet8536.length === 0 &&
      dcChotCua8535.length === 0 &&
      dcChotCua8536.length === 0 &&
      !(dcGate8535.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8536')) &&
      !(dcGate8536.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8535')) &&
      !D.moRongUngVien(['8535'], 'Bộ chống sét hoạt động theo nguyên lý phóng xạ thuộc nhóm 90.22').some((x) => x.nhom === '8536') &&
      !D.moRongUngVien(['8536'], 'Chốt cửa có gắn công tắc thuộc nhóm 83.01').some((x) => x.nhom === '8535'),
    { dcChongSet8535, dcChongSet8536, dcChotCua8535, dcChotCua8536 }
  );

  const ht103 = phanTichHoiTruoc4So({ moTa: moTaCa103, ungVien: ['8535', '8536'] });
  const distinctDk103 = new Set((ht103.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2188 hoi-truoc-4so] ca 103 với [8535, 8536] trả CHUA_CHOT_NHOM_HOI_TRUOC với 2 nhánh điều kiện phân biệt từ đồ thị',
    ht103.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      distinctDk103 &&
      (ht103.nhanh || []).every((n) => /^do-thi:C[567]:/.test(String(n.nguon || ''))) &&
      ['8535', '8536'].every((h) => (ht103.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    { trangThai: ht103.trangThai, distinctDk103, nhanh: ht103.nhanh, dapAnDieuKien: ht103.dapAnDieuKien }
  );
}

console.log(`\nphân biệt vật liệu ở tầng tiêu đề 6 số (OZV-558): ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
