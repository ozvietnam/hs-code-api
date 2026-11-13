#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * scripts/test-ozv-630-khong-ra-ma.mjs — Bài kiểm OZV-630:
 * Chẩn đoán 3 ca "không ra mã" còn lại trên bộ 50 ca TB-TCHQ (#24, #30, #45) và sửa 2 ca (#30, #45) bằng dữ liệu pháp lý L1:
 *   - Ca #24 (72082600, 1687/TB-TCHQ): câu khách ghi "kích thước 3,6 mm x 1312 mm x cuộn" thiếu từ ngữ cảnh "dày"/"bề dày"
 *     trước số 3,6 mm. Giữ nguyên ngưỡng cổng giaTriCua('be_day') trong lib/so-tay-gates.js (không đoán số đầu trong phép nhân
 *     A x B là bề dày) ⇒ khi thiếu chữ "dày" vẫn trả THIEU_SO_LIEU (khongRaMa=true an toàn); khi có chữ "dày 3,6 mm" thì
 *     chotDong8(720826) chốt đúng 72082600.
 *   - Ca #30 (82089000, 438/TB-TCHQ): bổ sung data/tu-vung/ten-khac-8208.json từ Chú giải 82.08(5) và TB-TCHQ 435/436/438
 *     cho dao/lưỡi cắt máy cắt vải, giấy, nhựa, da thuộc, thái sợi thuốc lá.
 *   - Ca #45 (87141090, 346/TCHQ-TXNK & 11704/TB-TCHQ): bổ sung data/tu-vung/ten-khac-8714.json (TRAI_NGHIA có nguồn L1)
 *     để loại trừ tất định các dòng có tên 87141010..87141070 khi hàng là bản tiếp xúc chuôi dây điện ổ khóa xe máy
 *     (26K-Plate terminal) hoặc nắp bình xăng xe mô tô (5524/TB-TCHQ).
 *   - Kèm đầy đủ ca âm tính đối chứng cho từng ca: thiếu dữ kiện quyết định hoặc thuộc dòng anh em / nhóm khác thì
 *     vẫn trả "không ra mã" / "thiếu dữ kiện" hoặc chốt đúng dòng anh em, KHÔNG đoán mò.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chayBoDo50Ca } from './benchmark-50-ca-tb-tchq.mjs';
import { kiemCongAnhEm } from './cong-anh-em.mjs';
import { gieoNhap } from './fixtures/ho-so/nhap-dong-cung.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const { chotDong8, trangThaiDong8, giaTriCua } = require('../lib/so-tay-gates.js');

// Gieo bản đóng băng 721220 vào HS_DATA_DIR để môi trường cô lập đọc đủ ranh giới 721220 (như test-ozv-590).
const FIXTURE_721220 = path.join(ROOT, 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-721220', '721220.json');
gieoNhap('721220', JSON.parse(fs.readFileSync(FIXTURE_721220, 'utf8')));

let passed = 0;
let failed = 0;
function check(label, cond, detail = '') {
  if (cond) {
    console.log(`  PASS: ${label}`);
    passed += 1;
  } else {
    console.error(`  FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
    failed += 1;
  }
}

console.log('=== TEST OZV-630: 3 CA KHÔNG RA MÃ CÒN LẠI (#24, #30, #45) + CA ÂM TÍNH ĐỐI CHỨNG ===\n');

const bo50 = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'bo-50-ca-tb-tchq.json'), 'utf8')).cases;
const caByStt = Object.fromEntries(bo50.map((c) => [c.stt, c]));

// ── 1. Ca #24 (72082600 — Chẩn đoán ngữ cảnh "dày" / quy cách cuộn cán nóng "3,6 mm x 1312 mm x cuộn", giữ nguyên ngưỡng cổng) ─
{
  const ca24 = caByStt[24];
  const textMoHo = 'Thép tấm không hợp kim, cán phẳng, kích thước 10 mm x 20 mm';
  const valsThieuNguCanh = giaTriCua('be_day', textMoHo);
  const cdThieuNguCanh = chotDong8({ hs: '720826', productText: textMoHo });
  check(
    'Ca #24 (chẩn đoán 1 — âm tính thiếu ngữ cảnh) — phép nhân "10 mm x 20 mm" thiếu chữ "dày" và không phải quy cách cuộn → giaTriCua("be_day") trả [] và chotDong8 trả THIEU_SO_LIEU',
    valsThieuNguCanh.length === 0 && cdThieuNguCanh.ketQua === 'THIEU_SO_LIEU' && !cdThieuNguCanh.hs,
    JSON.stringify({ valsThieuNguCanh, cdThieuNguCanh }),
  );

  const valsCuon = giaTriCua('be_day', ca24.cauKhach);
  const cdCuon = chotDong8({ hs: '720826', productText: ca24.cauKhach });
  check(
    'Ca #24 (chẩn đoán 2 — dương tính câu gốc TB 1687/TB-TCHQ) — quy cách "3,6 mm x 1312 mm x cuộn" trên thép cán nóng dạng cuộn → chotDong8(720826) chốt đúng 72082600',
    valsCuon.length === 1 && Math.abs(valsCuon[0] - 0.36) < 1e-6 && cdCuon.ketQua === 'CHOT' && cdCuon.hs === '72082600',
    JSON.stringify({ valsCuon, cdCuon }),
  );

  const textCoChuDay = 'Thép cán nóng không hợp kim, cán phẳng, dạng cuộn, đã ngâm tẩy gỉ, bề dày 3,6 mm, rộng 1312 mm';
  const cdPos = chotDong8({ hs: '720826', productText: textCoChuDay });
  check(
    'Ca #24 (dương tính khi đủ ngữ cảnh) — có chữ "bề dày 3,6 mm" → chotDong8(720826) chốt đúng 72082600',
    cdPos.ketQua === 'CHOT' && cdPos.hs === '72082600',
    JSON.stringify(cdPos),
  );

  // Âm tính 1: chỉ ghi chiều rộng "rộng 1312 mm" (thiếu bề dày) → THIEU_SO_LIEU
  const cdNeg1 = chotDong8({
    hs: '720826',
    productText: 'Thép cán nóng không hợp kim, cán phẳng, dạng cuộn, đã ngâm tẩy gỉ, rộng 1312 mm',
  });
  check(
    'Ca #24 (âm tính 1) — chỉ ghi chiều rộng (thiếu bề dày) → THIEU_SO_LIEU, không đoán 72082600',
    cdNeg1.ketQua === 'THIEU_SO_LIEU' && !cdNeg1.hs,
    JSON.stringify(cdNeg1),
  );

  // Âm tính 2: bề dày 2,0 mm (< 3 mm, thuộc 7208.27) → trái điều kiện 72082600, không chốt 72082600
  const textDay2mm = 'Thép cán nóng không hợp kim, cán phẳng, dạng cuộn, chiều rộng 1312 mm, đã ngâm tẩy gỉ, bề dày 2,0 mm';
  const ttNeg2 = trangThaiDong8({ hs: '72082600', productText: textDay2mm });
  const cdNeg2 = chotDong8({ hs: '720826', productText: textDay2mm });
  check(
    'Ca #24 (âm tính 2) — "bề dày 2,0 mm" (< 3 mm) → 72082600 TRAI, không chốt 72082600',
    ttNeg2?.trangThai === 'TRAI' && cdNeg2.ketQua === 'KHONG_THE_CHOT' && !cdNeg2.hs,
    JSON.stringify({ ttNeg2, cdNeg2 }),
  );

  // Âm tính 3: bề dày 5,0 mm (>= 4,75 mm, thuộc 7208.25) → 72082600 TRAI, chốt sang 72082500 khi xét 720825
  const textDay5mm = 'Thép cán nóng không hợp kim, cán phẳng, dạng cuộn, chiều rộng 1312 mm, đã ngâm tẩy gỉ, bề dày 5,0 mm';
  const ttNeg3 = trangThaiDong8({ hs: '72082600', productText: textDay5mm });
  const cdSib25 = chotDong8({ hs: '720825', productText: textDay5mm });
  check(
    'Ca #24 (âm tính 3) — "bề dày 5,0 mm" (>= 4,75 mm) → 72082600 TRAI, 720825 chốt 72082500',
    ttNeg3?.trangThai === 'TRAI' && cdSib25.ketQua === 'CHOT' && cdSib25.hs === '72082500',
    JSON.stringify({ ttNeg3, cdSib25 }),
  );
}

// ── 2. Ca #30 (82089000 — Lưỡi cắt bằng thép hợp kim dạng cuộn dùng làm dao cho máy cắt vải, giấy, nhựa) ─────────────
{
  const cae8208 = kiemCongAnhEm('8208');
  check(
    'Ca #30 (cổng anh em) — data/tu-vung/ten-khac-8208.json đạt cổng anh em (0 vi phạm)',
    cae8208.dat === true && cae8208.viPham.length === 0,
    JSON.stringify(cae8208),
  );

  const ca30 = caByStt[30];
  const cdPos1 = chotDong8({ hs: '820890', productText: ca30.cauKhach });
  check(
    'Ca #30 (dương tính 1) — chotDong8(820890) chốt đúng 82089000 trên câu khách thật TB 438/TB-TCHQ',
    cdPos1.ketQua === 'CHOT' && cdPos1.hs === '82089000',
    JSON.stringify(cdPos1),
  );

  const cdPos2 = chotDong8({
    hs: '820890',
    productText: 'Lưỡi cắt dùng cho máy móc để xén giấy, hàng dệt, nhựa trong dây chuyền đóng gói',
  });
  check(
    'Ca #30 (dương tính 2) — Chú giải 82.08(5)(b) "dùng cho máy móc để xén giấy, hàng dệt, nhựa" chốt 82089000',
    cdPos2.ketQua === 'CHOT' && cdPos2.hs === '82089000',
    JSON.stringify(cdPos2),
  );

  // Âm tính 1: chỉ mô tả thép hợp kim dạng cuộn (chưa nêu là dao/lưỡi cắt cho máy cắt vải/giấy/nhựa) → không chốt 82089000
  const cdNeg1 = chotDong8({
    hs: '820890',
    productText: 'Thép hợp kim dạng cuộn, kích thước 2,5 x 19 mm, tiêu chuẩn JIS G405 S45C (Cr ≈ 0,94%, Mo ≈ 0,16%)',
  });
  check(
    'Ca #30 (âm tính 1) — chỉ nêu thép hợp kim dạng cuộn S45C (thiếu công dụng làm dao cắt vải/giấy/nhựa) → KHONG_THE_CHOT',
    cdNeg1.ketQua === 'KHONG_THE_CHOT' && !cdNeg1.hs,
    JSON.stringify(cdNeg1),
  );

  // Âm tính 2: lưỡi cắt dùng cho gia công kim loại (thuộc 8208.10.00) hoặc chế biến gỗ (8208.20.00) → không chốt 82089000
  const cdNeg2Metal = chotDong8({
    hs: '820890',
    productText: 'Lưỡi cắt bằng thép hợp kim dùng cho máy gia công kim loại tấm',
  });
  const cdSib10 = chotDong8({
    hs: '820810',
    productText: 'Dao và lưỡi cắt, dùng cho máy hoặc dụng cụ cơ khí: Để gia công kim loại',
  });
  check(
    'Ca #30 (âm tính 2) — lưỡi cắt dùng cho gia công kim loại → 820890 trả KHONG_THE_CHOT, 820810 chốt 82081000',
    cdNeg2Metal.ketQua === 'KHONG_THE_CHOT' && !cdNeg2Metal.hs && cdSib10.ketQua === 'CHOT' && cdSib10.hs === '82081000',
    JSON.stringify({ cdNeg2Metal, cdSib10 }),
  );

  // Âm tính 3: phủ định công dụng cắt vải, giấy, nhựa → không chốt 82089000
  const cdNeg3 = chotDong8({
    hs: '820890',
    productText: 'Lưỡi cắt bằng thép hợp kim dạng cuộn, không dùng làm dao cho máy cắt/chặt vật liệu như vải, giấy, nhựa',
  });
  check(
    'Ca #30 (âm tính 3) — phủ định "không dùng làm dao cho máy cắt/chặt vật liệu như vải, giấy, nhựa" → KHONG_THE_CHOT',
    cdNeg3.ketQua === 'KHONG_THE_CHOT' && !cdNeg3.hs,
    JSON.stringify(cdNeg3),
  );
}

// ── 3. Ca #45 (87141090 — Bản tiếp xúc bằng nhựa nhiệt cứng của chuôi dây điện ổ khóa xe máy / 26K-Plate terminal) ───
{
  const cae8714 = kiemCongAnhEm('8714');
  check(
    'Ca #45 (cổng anh em) — data/tu-vung/ten-khac-8714.json đạt cổng anh em (0 vi phạm)',
    cae8714.dat === true && cae8714.viPham.length === 0,
    JSON.stringify(cae8714),
  );

  const ca45 = caByStt[45];
  const cdPos1 = chotDong8({ hs: '871410', productText: ca45.cauKhach });
  check(
    'Ca #45 (dương tính 1) — chotDong8(871410) chốt LOAI_KHAC 87141090 trên câu khách thật CV 346/TCHQ-TXNK',
    cdPos1.ketQua === 'LOAI_KHAC' && cdPos1.hs === '87141090',
    JSON.stringify(cdPos1),
  );

  const cdPos2 = chotDong8({
    hs: '871410',
    productText: 'Nắp bình xăng xe mô tô làm bằng thép, phụ tùng xe mô tô',
  });
  check(
    'Ca #45 (dương tính 2) — TB 5524/TB-TCHQ "Nắp bình xăng xe mô tô làm bằng thép" chốt LOAI_KHAC 87141090',
    cdPos2.ketQua === 'LOAI_KHAC' && cdPos2.hs === '87141090',
    JSON.stringify(cdPos2),
  );

  // Âm tính 1: mô tả phụ tùng xe máy chung chung (thiếu tên bộ phận cụ thể để loại trừ 87141010..87141070) → hỏi thêm, không đoán 87141090
  const cdNeg1 = chotDong8({
    hs: '871410',
    productText: 'Bộ phận và phụ kiện của mô tô (kể cả xe gắn máy có bàn đạp): chi tiết bằng nhựa nhiệt cứng ép định hình',
  });
  check(
    'Ca #45 (âm tính 1) — chi tiết bằng nhựa của mô tô nhưng chưa nêu bộ phận cụ thể → THIEU_SO_LIEU/KHONG_THE_CHOT, không đoán 87141090',
    (cdNeg1.ketQua === 'THIEU_SO_LIEU' || cdNeg1.ketQua === 'KHONG_THE_CHOT') && !cdNeg1.hs,
    JSON.stringify(cdNeg1),
  );

  // Âm tính 2: bản tiếp xúc bằng nhựa dùng cho công tắc tủ điện công nghiệp (nhóm 85.38, không phải ổ khóa xe máy) → không chốt 87141090
  const cdNeg2 = chotDong8({
    hs: '871410',
    productText: 'Bản tiếp xúc bằng nhựa nhiệt cứng có lỗ tròn luồn dây dùng cho công tắc điện công nghiệp',
  });
  check(
    'Ca #45 (âm tính 2) — bản tiếp xúc bằng nhựa cho công tắc điện công nghiệp (không phải ổ khóa xe máy) → không chốt 87141090',
    (cdNeg2.ketQua === 'THIEU_SO_LIEU' || cdNeg2.ketQua === 'KHONG_THE_CHOT') && !cdNeg2.hs,
    JSON.stringify(cdNeg2),
  );

  // Âm tính 3: hàng thuộc dòng anh em có tên trong 8714.10 (87141010 yên xe, 87141060 phanh) → chốt đúng dòng anh em
  const cdSib10 = chotDong8({ hs: '871410', productText: 'Yên xe dùng cho xe mô tô hai bánh' });
  const cdSib60 = chotDong8({ hs: '871410', productText: 'Phanh đĩa thủy lực dùng cho xe mô tô' });
  check(
    'Ca #45 (âm tính 3) — yên xe mô tô → CHOT 87141010; phanh xe mô tô → CHOT 87141060 (không rơi vào 87141090)',
    cdSib10.ketQua === 'CHOT' && cdSib10.hs === '87141010' && cdSib60.ketQua === 'CHOT' && cdSib60.hs === '87141060',
    JSON.stringify({ cdSib10, cdSib60 }),
  );
}

// ── 4. Kiểm tích hợp trên bộ 50 ca TB-TCHQ (replay1211) ──────────────────────────────────────────────────────────────
{
  const kq50 = await chayBoDo50Ca({ skipSearch: true });
  const rp = kq50.replay1211;
  check(
    `Replay 50 ca TB-TCHQ — khongRaMa đạt ${rp.tomTat.khongRaMa}/50 (yêu cầu ≤ 1/50)`,
    rp.tomTat.khongRaMa <= 1,
    `khongRaMa=${rp.tomTat.khongRaMa}`,
  );
  check(
    `Replay 50 ca TB-TCHQ — top1SoSongSot đạt ${rp.tomTat.top1SoSongSot}/50 (yêu cầu ≥ 37/50)`,
    rp.tomTat.top1SoSongSot >= 37,
    `top1SoSongSot=${rp.tomTat.top1SoSongSot}`,
  );

  const byStt = Object.fromEntries(rp.chiTiet.map((x) => [x.stt, x]));
  check(
    'Replay 50 ca — Ca #24 chốt đúng 72082600 (khongRaMa=false, top1=true)',
    byStt[24] && byStt[24].khongRaMa === false && byStt[24].top1 === true && byStt[24].maDau === '72082600',
    JSON.stringify(byStt[24]),
  );
  for (const [stt, hs] of [
    [26, '72112390'],
    [27, '72122020'],
    [30, '82089000'],
    [31, '83025000'],
    [45, '87141090'],
    [46, '90111000'],
  ]) {
    const r = byStt[stt];
    check(
      `Replay 50 ca — Ca #${stt} chốt đúng ${hs} (khongRaMa=false, top1=true)`,
      r && r.khongRaMa === false && r.top1 === true && r.maDau === hs,
      JSON.stringify(r),
    );
  }
}

console.log(`\nKết quả: ${passed}/${passed + failed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);
