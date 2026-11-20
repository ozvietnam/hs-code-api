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

  test('Ca bảo vệ 85479010: dòng 8 số đa mệnh đề có dấu phẩy không bị gỡ vế cha để tự chốt chỉ theo "Ống dẫn dây điện"', () => {
    assert.equal(DK.coCumPhanBiet('Ống dẫn dây điện', '85479010'), false);
    assert.equal(DK.coCumPhanBiet('khớp nối', '85479010'), false);
    const r = chotDong8({ hs: '854790', productText: 'Ống dẫn dây điện bằng sứ cách điện' });
    assert.notEqual(r.hs, '85479010');
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

describe('lib/dieu-kien-so.js — khopCumTrongChu: PHU_DINH chỉ đè khi KHÔNG có lần KHANG_DINH nào (OZV-1592)', () => {
  const t30 = 'Thiết bị điện khuyếch đại âm tần: Sử dụng như bộ lặp (nhắc lại) trong điện thoại, trừ điện thoại hữu tuyến';

  test('cùng cụm có cả lần khẳng định ("trong điện thoại") và lần phủ định ("trừ điện thoại hữu tuyến") → KHANG_DINH thắng', () => {
    const r = DK.khopCumTrongChu(t30, 'điện thoại');
    assert.equal(r?.trangThai, 'KHANG_DINH', JSON.stringify(r));
  });

  test('chỉ có lần phủ định, không có lần khẳng định → vẫn PHU_DINH', () => {
    const r = DK.khopCumTrongChu('Bộ khuếch đại dùng cho mạng vô tuyến, không dùng cho điện thoại hữu tuyến', 'điện thoại hữu tuyến');
    assert.equal(r?.trangThai, 'PHU_DINH', JSON.stringify(r));
  });

  test('ca bench 85184030: điều kiện CONG_DUNG "điện thoại" hết TRAI oan vì vế "trừ điện thoại hữu tuyến"', () => {
    const r = DK.danhGiaTuChu({ fact: 'dungCho', op: 'CONG_DUNG', value: 'điện thoại' }, t30, '85184030');
    assert.equal(r.trangThai, 'THOA', JSON.stringify(r));
    assert.notEqual(r.trangThai, 'TRAI');
  });
});

describe('lib/dieu-kien-so.js — khopCumTrongChu & boVeRiengCuaDong cho 8511, 2904, 8421, 8474 (OZV-1672)', () => {
  const cha8511403 =
    'Động cơ khởi động và máy phát điện kiêm khởi động: Động cơ khởi động đã lắp ráp sử dụng cho động cơ của xe thuộc các nhóm từ 87.01 đến 87.05';

  test('85114031..33 (2 chiều): dải mã "từ 87.01 đến 87.05" ở tiêu đề cha không khớp nhầm đầu mút 87.01 / 87.05, nhưng nêu rõ dòng 8 số thì chốt đúng', () => {
    assert.equal(DK.khopCumTrongChu(cha8511403, '87.01'), null);
    assert.equal(DK.khopCumTrongChu(cha8511403, '87.05'), null);
    const rThieu = chotDong8({ hs: '851140', productText: cha8511403 });
    assert.notEqual(rThieu.ketQua, 'CHOT', JSON.stringify(rThieu));
    assert.ok(['THIEU_SO_LIEU', 'KHONG_THE_CHOT'].includes(rThieu.ketQua), JSON.stringify(rThieu));
    assert.notEqual(rThieu.lyDo, 'tranh-cap', JSON.stringify(rThieu));

    const r31 = chotDong8({
      hs: '851140',
      productText: `${cha8511403}: Sử dụng cho động cơ của xe thuộc nhóm 87.01`,
    });
    assert.equal(r31.ketQua, 'CHOT', JSON.stringify(r31));
    assert.equal(r31.hs, '85114031');

    const r32 = chotDong8({
      hs: '851140',
      productText: `${cha8511403}: Sử dụng cho động cơ của xe thuộc nhóm 87.02, 87.03 hoặc 87.04`,
    });
    assert.equal(r32.ketQua, 'CHOT', JSON.stringify(r32));
    assert.equal(r32.hs, '85114032');

    const r33 = chotDong8({
      hs: '851140',
      productText: `${cha8511403}: Sử dụng cho động cơ của xe thuộc nhóm 87.05`,
    });
    assert.equal(r33.ketQua, 'CHOT', JSON.stringify(r33));
    assert.equal(r33.hs, '85114033');
  });

  test('29041000 (2 chiều): khopCumTrongChu khớp khoảng trắng kép "muối  và" trong data/tax.json và không bắt nhầm dòng khác', () => {
    const p29041000 = 'Các dẫn xuất chỉ chứa các nhóm sulpho, muối và etyl este của chúng';
    const textCoKhoangTrangKep =
      'Các dẫn xuất sulphonat hóa, nitro hóa hoặc nitroso hóa của các hydrocarbon, đã hoặc chưa halogen hóa. - Các dẫn xuất chỉ chứa các nhóm sulpho, muối  và etyl este của chúng';
    const hit = DK.khopCumTrongChu(textCoKhoangTrangKep, p29041000);
    assert.equal(hit?.trangThai, 'KHANG_DINH', JSON.stringify(hit));

    const rChot = chotDong8({ hs: '290410', productText: textCoKhoangTrangKep });
    assert.equal(rChot.ketQua, 'CHOT', JSON.stringify(rChot));
    assert.equal(rChot.hs, '29041000');

    const textKhac = 'Các dẫn xuất chỉ chứa nhóm nitro hoặc chỉ chứa nhóm nitroso: Trinitrotoluen';
    assert.equal(DK.khopCumTrongChu(textKhac, p29041000), null);
  });

  test('84212311 & 84742011 (2 chiều): boVeRiengCuaDong chỉ gom anh em cùng nút cha trực tiếp nên giữ được từ phân biệt "dầu" và "đá"', () => {
    assert.equal(DK.coCumPhanBiet('Bộ lọc dầu', '84212311'), true);
    assert.equal(DK.coCumPhanBiet('đá', '84742011'), true);

    const r8421 = DK.danhGiaTuChu(
      { fact: 'tenLoai', op: 'TEN_LOAI', value: 'Bộ lọc dầu' },
      'Máy lọc dầu hoặc lọc xăng dùng cho động cơ đốt trong: Dùng cho máy thuộc nhóm 84.29 hoặc 84.30: Bộ lọc dầu',
      '84212311',
    );
    assert.equal(r8421.trangThai, 'THOA', JSON.stringify(r8421));
    assert.equal(r8421.tatDinh, true);

    const r8421Thieu = DK.danhGiaTuChu(
      { fact: 'tenLoai', op: 'TEN_LOAI', value: 'Bộ lọc dầu' },
      'Máy lọc hoặc tinh chế chất lỏng: Dùng cho máy thuộc nhóm 84.29 hoặc 84.30',
      '84212311',
    );
    assert.notEqual(r8421Thieu.trangThai, 'THOA');

    const r8474 = DK.danhGiaTuChu(
      { fact: 'dungCho', op: 'CONG_DUNG', value: 'đá' },
      'Máy nghiền hoặc xay đất, đá, quặng hoặc các chất khoáng khác: Hoạt động bằng điện: Dùng cho đá',
      '84742011',
    );
    assert.equal(r8474.trangThai, 'THOA', JSON.stringify(r8474));
    assert.equal(r8474.tatDinh, true);

    const r8474Thieu = DK.danhGiaTuChu(
      { fact: 'dungCho', op: 'CONG_DUNG', value: 'đá' },
      'Máy nghiền hoặc xay chất khoáng: Hoạt động bằng điện',
      '84742011',
    );
    assert.notEqual(r8474Thieu.trangThai, 'THOA');
  });

  test('ReDoS guard (OZV-1672): chuỗi ~40.000 từ lặp có dải mã "87.01 đến 87.05" và khoảng trắng kép chạy dưới 2 giây', () => {
    const longText = `${'thuộc các nhóm từ 87.02 đến 87.04, dẫn xuất sulpho '.repeat(4500)}thuộc các nhóm từ 87.01 đến 87.05, muối  và etyl este của chúng: Sử dụng cho động cơ của xe thuộc nhóm 87.01`;
    const t0 = Date.now();
    const r1 = DK.khopCumTrongChu(longText, '87.01');
    const r2 = DK.khopCumTrongChu(longText, '87.05');
    const r3 = DK.khopCumTrongChu(longText, 'muối và etyl este của chúng');
    const elapsed = Date.now() - t0;
    assert.equal(r1?.trangThai, 'KHANG_DINH');
    assert.equal(r2, null);
    assert.equal(r3?.trangThai, 'KHANG_DINH');
    assert.ok(elapsed < 2000, `ReDoS check took ${elapsed}ms (>= 2000ms)`);
  });
});
