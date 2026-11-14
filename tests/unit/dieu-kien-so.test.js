'use strict';

require('../../scripts/test-isolate-data.mjs');
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const DK = require('../../lib/dieu-kien-so.js');
const { chotDong8 } = require('../../lib/so-tay-gates.js');

describe('lib/dieu-kien-so.js — tuChaCua / coCumPhanBiet & chotDong8 (OZV-911)', () => {
  test('Ca bảo vệ 350510: câu chỉ nêu tiêu đề PN6 "Dextrin và các dạng tinh bột biến tính khác" không tự chốt 35051010', () => {
    assert.equal(DK.coCumPhanBiet('Dextrin', '35051010'), false);
    const r = chotDong8({ hs: '350510', productText: 'Dextrin và các dạng tinh bột biến tính khác' });
    assert.notEqual(r.ketQua, 'CHOT');
    assert.notEqual(r.hs, '35051010');
    assert.ok(['THIEU_SO_LIEU', 'KHONG_THE_CHOT'].includes(r.ketQua), JSON.stringify(r));
  });

  test('Ca bảo vệ 840991: từ "piston" ở tiêu đề PN6 không làm cụm phân biệt để tự chốt 84099137', () => {
    assert.equal(DK.coCumPhanBiet('Piston', '84099137'), false);
    const r = chotDong8({
      hs: '840991',
      productText: 'Loại khác - Chỉ dùng hoặc chủ yếu dùng cho động cơ đốt trong kiểu piston đốt cháy bằng tia lửa điện: Dùng cho xe của nhóm 87.11',
    });
    assert.notEqual(r.ketQua, 'CHOT');
    assert.notEqual(r.hs, '84099137');
    assert.ok(['THIEU_SO_LIEU', 'KHONG_THE_CHOT'].includes(r.ketQua), JSON.stringify(r));
  });

  test('Ca bảo vệ 320619: từ "Thuốc màu" ở tiêu đề cha 5 số không tự chốt 32061910', () => {
    assert.equal(DK.coCumPhanBiet('Thuốc màu', '32061910'), false);
    const r = chotDong8({ hs: '320619', productText: 'Thuốc màu và các chế phẩm từ dioxit titan - Loại khác' });
    assert.notEqual(r.ketQua, 'CHOT');
    assert.notEqual(r.hs, '32061910');
  });

  test('36069030: nhóm 4 số liệt kê nhiều vế ngăn bởi ";" mà PN6 là "Loại khác" → giữ cụm phân biệt hợp kim xeri-sắt / hợp kim tự cháy', () => {
    assert.equal(DK.coCumPhanBiet('Hợp kim xeri-sắt', '36069030'), true);
    assert.equal(DK.coCumPhanBiet('các hợp kim tự cháy', '36069030'), true);
    assert.equal(DK.coCumPhanBiet('Hợp kim xeri-sắt và các hợp kim dễ bắt lửa khác ở mọi dạng', '36069030'), true);

    const rChot = chotDong8({
      hs: '360690',
      productText:
        'Hợp kim xeri-sắt và các hợp kim tự cháy khác ở tất cả các dạng; các sản phẩm làm từ vật liệu dễ cháy như đã nêu trong Chú giải 2 của Chương này. - Loại khác: Hợp kim xeri-sắt và các hợp kim tự cháy khác ở tất cả các dạng',
    });
    assert.equal(rChot.ketQua, 'CHOT');
    assert.equal(rChot.hs, '36069030');

    const rThieu = chotDong8({
      hs: '360690',
      productText:
        'Hợp kim xeri-sắt và các hợp kim tự cháy khác ở tất cả các dạng; các sản phẩm làm từ vật liệu dễ cháy như đã nêu trong Chú giải 2 của Chương này. - Loại khác',
    });
    assert.notEqual(rThieu.ketQua, 'CHOT');
  });

  test('73211910: mệnh đề "kể cả …" ở tiêu đề PN6 732119 không xoá cụm phân biệt "nhiên liệu rắn"', () => {
    assert.equal(DK.coCumPhanBiet('nhiên liệu rắn', '73211910'), true);
    assert.equal(DK.coCumPhanBiet('Loại dùng nhiên liệu rắn', '73211910'), true);

    const rChot = chotDong8({
      hs: '732119',
      productText: 'Dụng cụ nấu và dụng cụ hâm nóng dạng tấm - Loại khác, kể cả dụng cụ dùng nhiên liệu rắn: Loại dùng nhiên liệu rắn',
    });
    assert.equal(rChot.ketQua, 'CHOT');
    assert.equal(rChot.hs, '73211910');

    const rThieu = chotDong8({
      hs: '732119',
      productText: 'Dụng cụ nấu và dụng cụ hâm nóng dạng tấm - Loại khác, kể cả dụng cụ dùng nhiên liệu rắn',
    });
    assert.notEqual(rThieu.ketQua, 'CHOT');
  });

  test('70181010: dòng 8 số lấy một vế liệt kê riêng ("Hạt bi thủy tinh") của tiêu đề cha giữ được cụm phân biệt tất định', () => {
    assert.equal(DK.coCumPhanBiet('Hạt bi thủy tinh', '70181010'), true);
    assert.equal(DK.coCumPhanBiet('thủy tinh', '70181010'), false);

    const rChot = chotDong8({
      hs: '701810',
      productText:
        'Hạt bi thủy tinh, thủy tinh giả ngọc trai, thủy tinh giả đá quý hoặc đá bán quý và các đồ vật nhỏ tương tự bằng thủy tinh: Hạt bi thủy tinh',
    });
    assert.equal(rChot.ketQua, 'CHOT');
    assert.equal(rChot.hs, '70181010');

    const rThieu = chotDong8({
      hs: '701810',
      productText:
        'Hạt bi thủy tinh, thủy tinh giả ngọc trai, thủy tinh giả đá quý hoặc đá bán quý và các đồ vật nhỏ tương tự bằng thủy tinh',
    });
    assert.notEqual(rThieu.ketQua, 'CHOT');
  });

  test('83024910: dòng 8 số lấy một vế công dụng riêng ("yên cương") trong danh sách liệt kê của nhóm 4 số giữ được cụm phân biệt', () => {
    assert.equal(DK.coCumPhanBiet('yên cương', '83024910'), true);
    assert.equal(DK.coCumPhanBiet('Của loại thích hợp dùng cho yên cương', '83024910'), true);
    assert.equal(DK.coCumPhanBiet('Loại phù hợp cho yên cương', '83024910'), true);

    const rChot = chotDong8({
      hs: '830249',
      productText: 'Giá, khung, phụ kiện và các sản phẩm tương tự khác - Loại khác: Loại phù hợp cho yên cương',
    });
    assert.equal(rChot.ketQua, 'CHOT');
    assert.equal(rChot.hs, '83024910');

    const rThieu = chotDong8({
      hs: '830249',
      productText: 'Giá, khung, phụ kiện và các sản phẩm tương tự khác - Loại khác',
    });
    assert.notEqual(rThieu.ketQua, 'CHOT');
  });

  test('ReDoS guard: chuỗi ~40.000 từ lặp có "kể cả / bao gồm" chạy dưới 2 giây', () => {
    const longText = `${'kể cả bao gồm dụng cụ dùng nhiên liệu rắn, '.repeat(6000)}Loại dùng nhiên liệu rắn`;
    const t0 = Date.now();
    const r = DK.danhGiaTuChu(
      { fact: 'tenLoai', op: 'TEN_LOAI', value: 'Loại dùng nhiên liệu rắn' },
      longText,
      '73211910',
    );
    const elapsed = Date.now() - t0;
    assert.equal(r.trangThai, 'THOA');
    assert.equal(r.tatDinh, true);
    assert.ok(elapsed < 2000, `ReDoS check took ${elapsed}ms (>= 2000ms)`);
  });
});
