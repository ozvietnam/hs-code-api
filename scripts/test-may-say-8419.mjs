#!/usr/bin/env node
/**
 * OZV-748 — "máy sấy sinh tố" phải về nhóm 8419 (máy làm khô), không về 8509.
 *
 * Thực địa 13/11: "máy sấy sinh tố" là tên hàng khách hỏi nhiều nhất 24 giờ
 * (17 lượt, 9 lượt dừng ở 6 số). Gốc: `data/vn-product-synonyms.json` chỉ có
 * khoá `máy sấy thực phẩm` / `máy sấy công nghiệp`; các biến thể khách thật sự
 * gõ ("sinh tố", "hoa quả", "trái cây", "nông sản") không khớp khoá nào nên
 * `headingHints` rỗng — không có mã nhóm nào được gợi ý, xếp hạng trôi về
 * 8516 (máy sấy tóc) và 8509 (máy xay/ép quả).
 *
 * Máy kiểm đo HAI CHIỀU trên cùng một bộ câu:
 *   · chiều bắt lỗi  — 4 biến thể "máy sấy …" phải ra hint 8419 và top 8419;
 *   · chiều đối chứng — "máy xay sinh tố" giữ 8509, "máy sấy tóc" giữ 8516,
 *     "máy sấy quần áo" giữ 8451. Mở rộng từ điển mà kéo nhầm ba ca này thì đỏ.
 *
 * Mã 8419 lấy theo tên dòng biểu NGUYÊN VĂN (`data/bieu-thue/2026.04.05/`):
 * nút 8419 "Máy làm khô:", dòng 84193310 "Dùng cho các sản phẩm nông nghiệp;…".
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(rootDir, 'package.json'));
const { expandSearchQuery } = require('./lib/search-query-expand');
const { searchCandidates } = require('./lib/search-utils');
const { cauPhanBietNhom } = require('./lib/hoi-theo-so-tay');

let passed = 0;
let failed = 0;
function check(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// câu khách gõ → nhóm 4 số phải được gợi ý, và dòng đầu bảng kết quả phải thuộc nhóm đó
// `top` = tiền tố mã dòng đầu bảng. Ca đối chứng chốt đúng mã NỀN đang chạy
// (vd "máy sấy quần áo" nền ra 84211200 — máy làm khô ly tâm, không phải 8451),
// để nếu mở rộng từ điển làm xê dịch thì đỏ ngay, chứ không chốt theo mã tôi đoán.
const CA = [
  { q: 'máy sấy sinh tố 350w 220v', hint: '8419', top: '8419', chieu: 'bắt lỗi' },
  { q: 'máy sấy hoa quả', hint: '8419', top: '8419', chieu: 'bắt lỗi' },
  { q: 'máy sấy trái cây mini', hint: '8419', top: '8419', chieu: 'bắt lỗi' },
  { q: 'máy sấy nông sản', hint: '8419', top: '8419', chieu: 'bắt lỗi' },
  { q: 'máy sấy thực phẩm gia đình', hint: '8419', top: '8419', chieu: 'bắt lỗi' },
  { q: 'máy xay sinh tố', hint: '8509', top: '85094000', chieu: 'đối chứng' },
  { q: 'máy sấy tóc 1200w', hint: '8516', top: '85163100', chieu: 'đối chứng' },
  { q: 'máy sấy quần áo', hint: '8451', top: '84211200', chieu: 'đối chứng' },
];

for (const tc of CA) {
  const expanded = expandSearchQuery(tc.q);
  const hints = expanded.headingHints || [];
  check(
    `[${tc.chieu}] hint "${tc.q}" có ${tc.hint}`,
    hints.includes(tc.hint),
    `headingHints = ${JSON.stringify(hints)}`
  );

  const results = searchCandidates(tc.q, { topCandidates: 10 });
  const top = results[0]?.hsCode || '';
  check(
    `[${tc.chieu}] top "${tc.q}" bắt đầu bằng ${tc.top}`,
    top.startsWith(tc.top),
    `top = ${top} ${(results[0]?.nameVi || '').slice(0, 50)}`
  );
}

// Biến thể "máy sấy …" không được kéo theo từ mở rộng của 8509 (máy nghiền/trộn/ép).
const TU_8509 = ['nghiền', 'trộn', '8509'];
for (const q of ['máy sấy sinh tố 350w 220v', 'máy sấy hoa quả']) {
  const tokens = expandSearchQuery(q).keywordTokens || [];
  const dinh = TU_8509.filter((w) => tokens.includes(w));
  check(`"${q}" không dính từ mở rộng 8509`, dinh.length === 0, `dính ${JSON.stringify(dinh)}`);
}

// OZV-2079 — Tách dấu câu dính từ khoá (, ; : ( ) " ' và dấu - đứng lẻ đầu thông số)
// để không rơi từ lõi và lọc đúng NOISE_TOKEN trên 4 câu hỏi thực địa 24h.
{
  const q1 = 'bộ lọc điều áp khí nén, model ar3000-03, kt (90*53*165)mm';
  const t1 = expandSearchQuery(q1).keywordTokens || [];
  check(
    '[OZV-2079 bắt lỗi] câu 1 giữ được "nén" và mã model "ar3000-03" (không còn dấu phẩy dính cuối)',
    t1.includes('nén') && t1.includes('ar3000-03') && !t1.includes('nén,') && !t1.includes('ar3000-03,'),
    `keywordTokens = ${JSON.stringify(t1)}`
  );

  const q2 = 'bộ tản nhiệt, model 65k-50l, chất liệu hợp kim nhôm';
  const t2 = expandSearchQuery(q2).keywordTokens || [];
  check(
    '[OZV-2079 bắt lỗi] câu 2 giữ được "nhiệt" và mã model "65k-50l" (không còn dấu phẩy dính cuối)',
    t2.includes('nhiệt') && t2.includes('65k-50l') && !t2.includes('nhiệt,') && !t2.includes('65k-50l,'),
    `keywordTokens = ${JSON.stringify(t2)}`
  );

  const q3 = 'điện trở 8*60 mm, điện áp 220v, công suất 150w, chất liệu inox';
  const t3 = expandSearchQuery(q3).keywordTokens || [];
  const noise3 = ['mm,', 'mm', '220v,', '220v', '150w,', '150w'].filter((w) => t3.includes(w));
  check(
    '[OZV-2079 bắt lỗi] câu 3 lọc sạch "mm,", "220v,", "150w," qua NOISE_TOKEN',
    noise3.length === 0 && t3.includes('điện') && t3.includes('trở') && t3.includes('inox'),
    `còn sót noise = ${JSON.stringify(noise3)}, keywordTokens = ${JSON.stringify(t3)}`
  );

  const q4 = 'đồng hồ đo áp, đo dòng, chống mất pha , 3pha -380v';
  const t4 = expandSearchQuery(q4).keywordTokens || [];
  const noise4 = ['áp,', 'dòng,', '-380v', '380v'].filter((w) => t4.includes(w));
  check(
    '[OZV-2079 bắt lỗi] câu 4 giữ được "áp", "dòng" và lọc sạch "-380v" qua NOISE_TOKEN',
    t4.includes('áp') && t4.includes('dòng') && noise4.length === 0,
    `còn sót = ${JSON.stringify(noise4)}, keywordTokens = ${JSON.stringify(t4)}`
  );

  // Chiều đối chứng: giữ dấu chấm trong số thập phân 3.5kw để NOISE_TOKEN lọc đúng,
  // và không lọc nhầm chữ tiếng Việt "in" (máy in / đã in) thành đơn vị inch ("24in").
  const tDoiChung = expandSearchQuery('máy in phun, công suất 3.5kw, màn 24in, đã in').keywordTokens || [];
  check(
    '[OZV-2079 đối chứng] giữ từ tiếng Việt "in", lọc đúng "3.5kw," và "24in,"',
    tDoiChung.includes('in') &&
      !tDoiChung.includes('3.5kw') &&
      !tDoiChung.includes('3.5kw,') &&
      !tDoiChung.includes('24in') &&
      !tDoiChung.includes('24in,'),
    `keywordTokens = ${JSON.stringify(tDoiChung)}`
  );

  // Chống ReDoS (~40.000 từ lặp có dấu câu < 2 giây theo luật 9.6b)
  const bigQuery = Array.from({ length: 10000 }, () => 'nén, 220v, -380v, (ar3000-03),').join(' ');
  const t0 = Date.now();
  const bigRes = expandSearchQuery(bigQuery);
  const elapsed = Date.now() - t0;
  check(
    '[OZV-2079 ReDoS] 40.000 token lặp có dấu câu chạy < 2000ms',
    elapsed < 2000 && bigRes.keywordTokens.includes('nén') && bigRes.keywordTokens.includes('ar3000-03'),
    `elapsed = ${elapsed}ms`
  );
}

// OZV-2085 — Cạnh loại trừ 2 chiều 76.06 / 76.16 <-> 84.19 / 87.08 cho câu thực địa
// "bộ tản nhiệt, model 65k-50l, chất liệu hợp kim nhôm"
{
  const qTanNhiet = 'bộ tản nhiệt, model 65k-50l, chất liệu hợp kim nhôm';

  const pb7606 = cauPhanBietNhom('7606', ['7606', '8419', '8708'], qTanNhiet);
  check(
    '[OZV-2085 thuận] 7606 đứng đầu với [7606, 8419, 8708] sinh đủ 2 câu phân biệt sang 87.08 và 84.19 từ phan76.phan',
    pb7606.length === 2 &&
      pb7606.every((q) => q.canCu === 'so-tay' && q.nguon === 'phan76.phan') &&
      pb7606.some((q) => /87\.08/.test(q.questionVi) && /76\.06/.test(q.questionVi)) &&
      pb7606.some((q) => /84\.19/.test(q.questionVi) && /76\.06/.test(q.questionVi)),
    `pb7606 = ${JSON.stringify(pb7606)}`
  );

  const pb8419_7606 = cauPhanBietNhom('8419', ['8419', '7606', '8708'], qTanNhiet);
  check(
    '[OZV-2085 thuận] 8419 đứng đầu với [8419, 7606, 8708] sinh đủ 2 câu phân biệt (84.19<->87.08 và 76.06<->84.19)',
    pb8419_7606.length === 2 &&
      pb8419_7606.some((q) => q.nguon === 'ch84.chuong' && /87\.08/.test(q.questionVi)) &&
      pb8419_7606.some((q) => q.nguon === 'phan76.phan' && /76\.06/.test(q.questionVi) && /84\.19/.test(q.questionVi)),
    `pb8419_7606 = ${JSON.stringify(pb8419_7606)}`
  );

  const pb8708_7606 = cauPhanBietNhom('8708', ['8708', '7606', '8419'], qTanNhiet);
  check(
    '[OZV-2085 thuận] 8708 đứng đầu với [8708, 7606, 8419] sinh đủ 2 câu phân biệt (87.08<->84.19 và 76.06<->87.08)',
    pb8708_7606.length === 2 &&
      pb8708_7606.some((q) => q.nguon === 'phan87.phan' && /84\.19/.test(q.questionVi)) &&
      pb8708_7606.some((q) => q.nguon === 'phan76.phan' && /76\.06/.test(q.questionVi) && /87\.08/.test(q.questionVi)),
    `pb8708_7606 = ${JSON.stringify(pb8708_7606)}`
  );

  const pb7616 = cauPhanBietNhom('7616', ['7616', '8419', '8708'], qTanNhiet);
  check(
    '[OZV-2085 thuận] 7616 đứng đầu với [7616, 8419, 8708] sinh đủ 2 câu phân biệt sang 87.08 và 84.19 từ phan76.phan',
    pb7616.length === 2 &&
      pb7616.every((q) => q.canCu === 'so-tay' && q.nguon === 'phan76.phan') &&
      pb7616.some((q) => /87\.08/.test(q.questionVi) && /76\.16/.test(q.questionVi)) &&
      pb7616.some((q) => /84\.19/.test(q.questionVi) && /76\.16/.test(q.questionVi)),
    `pb7616 = ${JSON.stringify(pb7616)}`
  );

  const pb8419_7616 = cauPhanBietNhom('8419', ['8419', '7616', '8708'], qTanNhiet);
  const pb8708_7616 = cauPhanBietNhom('8708', ['8708', '7616', '8419'], qTanNhiet);
  check(
    '[OZV-2085 thuận] 8419 và 8708 đứng đầu với 7616 đều sinh đủ câu phân biệt 2 chiều với 76.16',
    pb8419_7616.length === 2 &&
      pb8419_7616.some((q) => q.nguon === 'phan76.phan' && /76\.16/.test(q.questionVi) && /84\.19/.test(q.questionVi)) &&
      pb8708_7616.length === 2 &&
      pb8708_7616.some((q) => q.nguon === 'phan76.phan' && /76\.16/.test(q.questionVi) && /87\.08/.test(q.questionVi)),
    `pb8419_7616 = ${JSON.stringify(pb8419_7616)}, pb8708_7616 = ${JSON.stringify(pb8708_7616)}`
  );

  // Chiều đối chứng / ngược: mô tả tấm hợp kim nhôm hoặc máy sấy hoa quả không chạm "bộ tản nhiệt"
  const pbTamNhom7606 = cauPhanBietNhom('7606', ['7606', '8419', '8708'], 'tấm hợp kim nhôm 5082 dày 3mm');
  const pbTamNhom7616 = cauPhanBietNhom('7616', ['7616', '8419', '8708'], 'tấm hợp kim nhôm 5082 dày 3mm');
  const pbMaySay = cauPhanBietNhom('8419', ['8419', '7606', '7616', '8708'], 'máy sấy hoa quả 350w');
  check(
    '[OZV-2085 đối chứng] câu "tấm hợp kim nhôm 5082 dày 3mm" và "máy sấy hoa quả 350w" không sinh câu hỏi tản nhiệt oan',
    pbTamNhom7606.length === 0 && pbTamNhom7616.length === 0 && pbMaySay.length === 0,
    `7606=${pbTamNhom7606.length}, 7616=${pbTamNhom7616.length}, 8419=${pbMaySay.length}`
  );
}

// OZV-2098 — Cạnh loại trừ 2 chiều 83.02 <-> 76.16 cho ca 49 tầng 4 số
// "Thanh kéo vải rèm trần / Nhôm / Phụ kiện rèm cửa"
{
  const S = require('./lib/so-tay');
  const { loadSoTay } = require('./lib/so-tay-gates');
  const qRem = 'Thanh kéo vải rèm trần / Nhôm / Phụ kiện rèm cửa';

  const st8302 = loadSoTay('8302');
  const st7616 = loadSoTay('7616');
  const lt8302 = (st8302?.loaiTru || []).find((x) => x.sangNhom === '7616');
  const lt7616 = (st7616?.loaiTru || []).find((x) => x.sangNhom === '8302');
  check(
    '[OZV-2098 căn cứ] sổ tay 8302 và 7616 có mục loaiTru 2 chiều 8302 <-> 7616 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt8302 &&
        lt8302.canCuLoaiTru?.nguon === 'nhom7616.nhom' &&
        S.checkItem('loaiTru', lt8302, S.sourcesFor('8302'), '8302') === null
    ) &&
      Boolean(
        lt7616 &&
          lt7616.canCuLoaiTru?.nguon === 'nhom8302.nhom' &&
          S.checkItem('loaiTru', lt7616, S.sourcesFor('7616'), '7616') === null
      ),
    `lt8302=${JSON.stringify(lt8302)}, lt7616=${JSON.stringify(lt7616)}`
  );

  const pb8302 = cauPhanBietNhom('8302', ['8302', '7616'], qRem);
  check(
    '[OZV-2098 thuận] 8302 đứng đầu với [8302, 7616] sinh câu phân biệt từ nhom8302.nhom trỏ sang 76.16',
    pb8302.length === 1 &&
      pb8302[0].loai === 'PHAN_BIET_NHOM' &&
      pb8302[0].canCu === 'so-tay' &&
      pb8302[0].nguon === 'nhom8302.nhom' &&
      /76\.16/.test(pb8302[0].questionVi) &&
      /83\.02/.test(pb8302[0].questionVi),
    `pb8302 = ${JSON.stringify(pb8302)}`
  );

  const pb7616 = cauPhanBietNhom('7616', ['7616', '8302'], qRem);
  check(
    '[OZV-2098 thuận] 7616 đứng đầu với [7616, 8302] sinh câu phân biệt từ nhom7616.nhom trỏ sang 83.02',
    pb7616.length === 1 &&
      pb7616[0].loai === 'PHAN_BIET_NHOM' &&
      pb7616[0].canCu === 'so-tay' &&
      pb7616[0].nguon === 'nhom7616.nhom' &&
      /83\.02/.test(pb7616[0].questionVi) &&
      /76\.16/.test(pb7616[0].questionVi),
    `pb7616 = ${JSON.stringify(pb7616)}`
  );

  const dcTamNhom8302 = cauPhanBietNhom('8302', ['8302', '7616'], 'tấm hợp kim nhôm 5082 dày 3mm');
  const dcTamNhom7616 = cauPhanBietNhom('7616', ['7616', '8302'], 'tấm hợp kim nhôm 5082 dày 3mm');
  const dcBanLe8302 = cauPhanBietNhom('8302', ['8302', '7616'], 'bản lề cửa gỗ bằng thép');
  const dcBanLe7616 = cauPhanBietNhom('7616', ['7616', '8302'], 'bản lề cửa gỗ bằng thép');
  const dcDinhNhom8302 = cauPhanBietNhom('8302', ['8302', '7616'], 'đinh nhôm đóng gỗ');
  const dcDinhNhom7616 = cauPhanBietNhom('7616', ['7616', '8302'], 'đinh nhôm đóng gỗ');
  check(
    '[OZV-2098 đối chứng] tấm hợp kim nhôm, bản lề cửa gỗ và đinh nhôm đóng gỗ không hỏi oan 83.02 <-> 76.16',
    dcTamNhom8302.length === 0 &&
      dcTamNhom7616.length === 0 &&
      dcBanLe8302.length === 0 &&
      dcBanLe7616.length === 0 &&
      dcDinhNhom8302.length === 0 &&
      dcDinhNhom7616.length === 0,
    `dc = ${JSON.stringify({ dcTamNhom8302, dcTamNhom7616, dcBanLe8302, dcBanLe7616, dcDinhNhom8302, dcDinhNhom7616 })}`
  );
}

console.log(`\n${passed} passed | ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
