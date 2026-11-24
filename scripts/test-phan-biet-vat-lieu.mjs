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

console.log(`\nphân biệt vật liệu ở tầng tiêu đề 6 số (OZV-558): ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
