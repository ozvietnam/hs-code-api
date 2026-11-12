#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * scripts/test-ozv-590-khong-ra-ma.mjs — Bài kiểm OZV-590 (A2 · P1):
 *   1. Kiểm 4 ca "không ra mã" đã sửa (#26 72112390, #27 72122020, #31 83025000, #46 90111000)
 *      chốt đúng mã 8 số ở cả tầng chotDong8 và tầng replay1211 / classifyLoop.
 *   2. Kiểm tối thiểu 3 ca âm tính (mô tả gần giống nhưng thuộc dòng anh em / nhóm khác hoặc thiếu số liệu)
 *      cho MỖI ca đã sửa — chứng minh không đoán bậy hay nới điều kiện bừa.
 *   3. Kiểm 3 ca còn lại (#24 72082600 thiếu chữ ngữ cảnh "dày", #30 82089000 dòng Loại khác trần,
 *      #45 87141090 dòng Loại khác còn nhánh CONG_DUNG tự do chưa phủ định) giữ nguyên hành vi an toàn
 *      (hỏi thêm hoặc không thể chốt, tuyệt đối không chốt sai).
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { chayBoDo50Ca } from './benchmark-50-ca-tb-tchq.mjs';

const require = createRequire(import.meta.url);
const { chotDong8 } = require('../lib/so-tay-gates.js');
const { kiemCongAnhEm } = await import('./cong-anh-em.mjs');
const C = require('../lib/ho-so/cong-ranh-gioi.js');

const bo = JSON.parse(fs.readFileSync('tests/bo-50-ca-tb-tchq.json', 'utf8'));
const caOf = (stt) => bo.cases.find((c) => c.stt === stt);

let pass = 0;
let fail = 0;
function check(name, ok, detail = '') {
  if (ok) {
    pass += 1;
    console.log(`PASS: ${name}`);
  } else {
    fail += 1;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ============================================================================
// 1. Cổng ranh giới 721220 + Cổng anh em 8302
// ============================================================================
{
  const rg721220 = JSON.parse(fs.readFileSync('data/ho-so/ranh-gioi/721220.json', 'utf8'));
  const kqRg = C.kiemRanhGioi('721220', rg721220);
  check(
    'ranh-gioi 721220: trạng thái DUYET và qua kiemRanhGioi với 0 lỗi',
    rg721220.trangThai === 'DUYET' && kqRg.hopLe === true && kqRg.loi.length === 0,
    JSON.stringify(kqRg),
  );

  const kqAe8302 = kiemCongAnhEm('8302');
  check(
    'ten-khac-8302: qua cổng anh em với 0 vi phạm',
    kqAe8302.dat === true && kqAe8302.viPham.length === 0 && kqAe8302.soMuc >= 2,
    JSON.stringify(kqAe8302),
  );
}

// ============================================================================
// 2. Ca #26 (72112390 — Thép không hợp kim cán phẳng dạng cuộn cán nguội) + 4 ca âm tính
// ============================================================================
{
  const ca26 = caOf(26);
  const pos = chotDong8({ hs: '721123', productText: ca26.cauKhach });
  check(
    'Ca #26 dương tính: chotDong8(721123) chốt LOAI_KHAC 72112390 từ mô tả TB-TCHQ 2196',
    pos.checked === true && pos.ketQua === 'LOAI_KHAC' && pos.hs === '72112390',
    JSON.stringify(pos),
  );

  // Âm tính 26a: Dạng đai và dải chiều rộng 350 mm (≤ 400 mm) → phải vào 72112320, KHÔNG vào 72112390
  const neg26a = chotDong8({
    hs: '721123',
    productText: 'Thép không hợp kim cán phẳng dạng đai và dải cán nguội, hàm lượng carbon 0,08%, chiều rộng 350 mm, chiều dày 1,0 mm, không gia công quá mức cán nguội',
  });
  check(
    'Ca #26 âm tính (a): dạng đai và dải rộng 350 mm (≤ 400 mm) → chốt 72112320, KHÔNG vào 72112390',
    neg26a.ketQua === 'CHOT' && neg26a.hs === '72112320',
    JSON.stringify(neg26a),
  );

  // Âm tính 26b: Chiều dày 0,15 mm (≤ 0,17 mm), rộng 450 mm, dạng cuộn → phải vào 72112330, KHÔNG vào 72112390
  const neg26b = chotDong8({
    hs: '721123',
    productText: 'Thép không hợp kim cán phẳng dạng cuộn cán nguội, hàm lượng carbon 0,05%, chiều rộng 450 mm, chiều dày 0,15 mm',
  });
  check(
    'Ca #26 âm tính (b): dạng cuộn rộng 450 mm nhưng dày 0,15 mm (≤ 0,17 mm) → chốt 72112330, KHÔNG vào 72112390',
    neg26b.ketQua === 'CHOT' && neg26b.hs === '72112330',
    JSON.stringify(neg26b),
  );

  // Âm tính 26c: Dạng lượn sóng, rộng 450 mm, dày 1,0 mm → phải vào 72112310, KHÔNG vào 72112390
  const neg26c = chotDong8({
    hs: '721123',
    productText: 'Thép không hợp kim cán phẳng cán nguội dạng lượn sóng, hàm lượng carbon 0,1%, chiều rộng 450 mm, chiều dày 1,0 mm',
  });
  check(
    'Ca #26 âm tính (c): dạng lượn sóng → chốt 72112310, KHÔNG vào 72112390',
    neg26c.ketQua === 'CHOT' && neg26c.hs === '72112310',
    JSON.stringify(neg26c),
  );

  // Âm tính 26d: Thiếu chiều dày → phải hỏi thêm (THIEU_SO_LIEU), KHÔNG đoán bậy 72112390
  const neg26d = chotDong8({
    hs: '721123',
    productText: 'Thép không hợp kim cán phẳng dạng cuộn cán nguội, hàm lượng carbon 0,05%, chiều rộng 450 mm',
  });
  check(
    'Ca #26 âm tính (d): thiếu chiều dày → THIEU_SO_LIEU, KHÔNG chốt 72112390',
    neg26d.ketQua === 'THIEU_SO_LIEU' && neg26d.hs == null,
    JSON.stringify(neg26d),
  );
}

// ============================================================================
// 3. Ca #27 (72122020 — Thép cán phẳng mạ kẽm điện phân SECC-N5) + 4 ca âm tính
// ============================================================================
{
  const ca27 = caOf(27);
  const pos = chotDong8({ hs: '721220', productText: ca27.cauKhach });
  check(
    'Ca #27 dương tính: chotDong8(721220) chốt CHOT 72122020 từ mô tả TB-TCHQ 1504',
    pos.checked === true && pos.ketQua === 'CHOT' && pos.hs === '72122020',
    JSON.stringify(pos),
  );

  // Âm tính 27a: Dạng đai và dải, rộng 300 mm (≤ 400 mm), dày 2,0 mm → chốt 72122010, KHÔNG vào 72122020
  const neg27a = chotDong8({
    hs: '721220',
    productText: 'Thép không hợp kim cán phẳng mạ kẽm bằng phương pháp điện phân, dạng đai và dải, chiều rộng 300 mm, chiều dày 2,0 mm, hàm lượng carbon 0,04%',
  });
  check(
    'Ca #27 âm tính (a): dạng đai và dải rộng 300 mm (≤ 400 mm), dày 2,0 mm → chốt 72122010, KHÔNG vào 72122020',
    neg27a.ketQua === 'CHOT' && neg27a.hs === '72122010',
    JSON.stringify(neg27a),
  );

  // Âm tính 27b: Chiều dày 2,0 mm (> 1,5 mm), rộng 500 mm, carbon 0,04% → phải vào 72122090 Loại khác, KHÔNG vào 72122020
  const neg27b = chotDong8({
    hs: '721220',
    productText: 'Thép không hợp kim cán phẳng mạ kẽm bằng phương pháp điện phân, dạng cuộn, chiều rộng 500 mm, chiều dày 2,0 mm, hàm lượng carbon 0,04%',
  });
  check(
    'Ca #27 âm tính (b): chiều dày 2,0 mm (> 1,5 mm) → chốt LOAI_KHAC 72122090, KHÔNG vào 72122020',
    neg27b.ketQua === 'LOAI_KHAC' && neg27b.hs === '72122090',
    JSON.stringify(neg27b),
  );

  // Âm tính 27c: Hàm lượng carbon 0,75% (≥ 0,6%), dày 0,8 mm, rộng 500 mm → phải vào 72122090 Loại khác, KHÔNG vào 72122020
  const neg27c = chotDong8({
    hs: '721220',
    productText: 'Thép không hợp kim cán phẳng mạ kẽm bằng phương pháp điện phân, dạng cuộn, chiều rộng 500 mm, chiều dày 0,8 mm, hàm lượng carbon 0,75%',
  });
  check(
    'Ca #27 âm tính (c): hàm lượng carbon 0,75% (≥ 0,6%) → chốt LOAI_KHAC 72122090, KHÔNG vào 72122020',
    neg27c.ketQua === 'LOAI_KHAC' && neg27c.hs === '72122090',
    JSON.stringify(neg27c),
  );

  // Âm tính 27d: Thiếu hàm lượng carbon → phải hỏi thêm (THIEU_SO_LIEU), KHÔNG đoán bậy 72122020
  const neg27d = chotDong8({
    hs: '721220',
    productText: 'Thép không hợp kim cán phẳng mạ kẽm bằng phương pháp điện phân, dạng cuộn, chiều rộng 500 mm, chiều dày 0,8 mm',
  });
  check(
    'Ca #27 âm tính (d): thiếu hàm lượng carbon → THIEU_SO_LIEU, KHÔNG chốt 72122020',
    neg27d.ketQua === 'THIEU_SO_LIEU' && neg27d.hs == null,
    JSON.stringify(neg27d),
  );
}

// ============================================================================
// 4. Ca #31 (83025000 — Giàn phơi quần áo thông minh gắn trần/tường) + 3 ca âm tính
// ============================================================================
{
  const ca31 = caOf(31);
  const pos = chotDong8({ hs: '830250', productText: ca31.cauKhach });
  check(
    'Ca #31 dương tính: chotDong8(830250) chốt CHOT 83025000 từ mô tả TB-TCHQ 4548',
    pos.checked === true && pos.ketQua === 'CHOT' && pos.hs === '83025000',
    JSON.stringify(pos),
  );

  // Âm tính 31a: Giàn phơi quần áo đặt sàn có bánh xe đẩy bằng inox (nội thất đặt sàn thuộc 9403.20) → KHÔNG chốt 83025000
  const neg31a = chotDong8({
    hs: '830250',
    productText: 'Giàn phơi quần áo đặt sàn có bánh xe đẩy bằng thép không gỉ, kích thước 1500x600x1600 mm',
  });
  check(
    'Ca #31 âm tính (a): giàn phơi quần áo đặt sàn có bánh xe → KHONG_THE_CHOT trên 830250, KHÔNG chốt 83025000',
    neg31a.ketQua === 'KHONG_THE_CHOT' && neg31a.hs == null,
    JSON.stringify(neg31a),
  );

  // Âm tính 31b: Tủ sấy quần áo bằng điện 1500W (thuộc 8516.79 / 8451.21) → KHÔNG chốt 83025000
  const neg31b = chotDong8({
    hs: '830250',
    productText: 'Tủ sấy quần áo bằng điện gia dụng, khung inox kèm quạt sưởi nhiệt 1500W, điện áp 220V',
  });
  check(
    'Ca #31 âm tính (b): tủ sấy quần áo bằng điện 1500W → KHONG_THE_CHOT trên 830250, KHÔNG chốt 83025000',
    neg31b.ketQua === 'KHONG_THE_CHOT' && neg31b.hs == null,
    JSON.stringify(neg31b),
  );

  // Âm tính 31c: Bản lề cửa sổ bằng thép không gỉ (thuộc 8302.10) → KHÔNG chốt 83025000
  const neg31c = chotDong8({
    hs: '830250',
    productText: 'Bản lề chữ A bằng thép không gỉ dùng cho cửa sổ nhôm kính, không phải giá để mũ hay mắc mũ',
  });
  check(
    'Ca #31 âm tính (c): bản lề cửa sổ bằng thép không gỉ → KHONG_THE_CHOT trên 830250, KHÔNG chốt 83025000',
    neg31c.ketQua === 'KHONG_THE_CHOT' && neg31c.hs == null,
    JSON.stringify(neg31c),
  );
}

// ============================================================================
// 5. Ca #46 (90111000 — Kính hiển vi soi nổi stereoscopic microscope) + 3 ca âm tính
// ============================================================================
{
  const ca46 = caOf(46);
  const pos = chotDong8({ hs: '901110', productText: ca46.cauKhach });
  check(
    'Ca #46 dương tính: chotDong8(901110) chốt CHOT 90111000 từ mô tả TB-TCHQ 11484',
    pos.checked === true && pos.ketQua === 'CHOT' && pos.hs === '90111000',
    JSON.stringify(pos),
  );

  // Âm tính 46a: Kính hiển vi quang học sinh học một thị kính, không phải kính hiển vi soi nổi (thuộc 9011.80)
  const neg46a = chotDong8({
    hs: '901110',
    productText: 'Kính hiển vi quang học sinh học một thị kính dùng trong phòng thí nghiệm, không phải kính hiển vi soi nổi',
  });
  check(
    'Ca #46 âm tính (a): kính hiển vi sinh học một thị kính (không phải soi nổi) → KHONG_THE_CHOT trên 901110',
    neg46a.ketQua === 'KHONG_THE_CHOT' && neg46a.hs == null,
    JSON.stringify(neg46a),
  );

  // Âm tính 46b: Kính hiển vi điện tử quét SEM (thuộc 9012.10)
  const neg46b = chotDong8({
    hs: '901110',
    productText: 'Kính hiển vi điện tử quét (Scanning Electron Microscope - SEM) độ phân giải nano mét',
  });
  check(
    'Ca #46 âm tính (b): kính hiển vi điện tử quét SEM → KHONG_THE_CHOT trên 901110',
    neg46b.ketQua === 'KHONG_THE_CHOT' && neg46b.hs == null,
    JSON.stringify(neg46b),
  );

  // Âm tính 46c: Kính hiển vi dùng cho chụp ảnh vi phẫu photomicrography (thuộc 9011.20)
  const neg46c = chotDong8({
    hs: '901110',
    productText: 'Kính hiển vi quang học dùng cho chụp ảnh vi phẫu (photomicrography), không phải kính hiển vi soi nổi',
  });
  check(
    'Ca #46 âm tính (c): kính hiển vi chụp ảnh vi phẫu → KHONG_THE_CHOT trên 901110',
    neg46c.ketQua === 'KHONG_THE_CHOT' && neg46c.hs == null,
    JSON.stringify(neg46c),
  );
}

// ============================================================================
// 6. Kiểm toàn bộ 50 ca qua chayReplay1211: 4 ca (#26, #27, #31, #46) ra đúng mã 8 số,
//    khongRaMa giảm từ 7/50 xuống 3/50 (≤ 4/50), top1SoSongSot = 37/50 (≥ 33/50)
// ============================================================================
{
  const kq = await chayBoDo50Ca({ skipSearch: true });
  const rep = kq.replay1211;
  const byStt = Object.fromEntries(rep.chiTiet.map((r) => [r.stt, r]));

  for (const [stt, expectedHs] of [[26, '72112390'], [27, '72122020'], [31, '83025000'], [46, '90111000']]) {
    const r = byStt[stt];
    check(
      `Replay 50 ca — Ca #${stt} chốt đúng ${expectedHs} và khongRaMa=false`,
      r && r.maDau === expectedHs && r.khongRaMa === false && r.top1 === true,
      JSON.stringify(r),
    );
  }

  for (const stt of [24, 30, 45]) {
    const r = byStt[stt];
    check(
      `Replay 50 ca — Ca #${stt} giữ nguyên khongRaMa=true (an toàn, không đoán bậy khi thiếu ngữ cảnh/loại trừ)`,
      r && r.khongRaMa === true,
      JSON.stringify(r),
    );
  }

  check(
    `Replay 50 ca — khongRaMa = ${rep.tomTat.khongRaMa}/50 <= 4/50 và top1SoSongSot = ${rep.tomTat.top1SoSongSot}/50 >= 33/50`,
    rep.tomTat.khongRaMa <= 4 && rep.tomTat.top1SoSongSot >= 33,
    JSON.stringify(rep.tomTat),
  );
}

console.log(`\nKết quả test-ozv-590-khong-ra-ma: ${pass}/${pass + fail} PASS`);
if (fail > 0) process.exit(1);
