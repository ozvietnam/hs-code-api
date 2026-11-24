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

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
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

console.log(`\nphân biệt vật liệu ở tầng tiêu đề 6 số (OZV-558): ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
