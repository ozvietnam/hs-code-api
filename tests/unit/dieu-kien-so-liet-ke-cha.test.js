'use strict';

require('../../scripts/test-isolate-data.mjs');
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const DK = require('../../lib/dieu-kien-so.js');
const { chotDong8 } = require('../../lib/so-tay-gates.js');

describe('lib/dieu-kien-so.js — gỡ tiêu đề cha đa vế cho LIET_KE & tách khoảng số " - " (OZV-1689)', () => {
  const tieuDe851762 =
    'Thiết bị khác để phát hoặc nhận tiếng, hình ảnh hoặc dữ liệu khác, kể cả thiết bị thông tin hữu tuyến hoặc không dây (như loại sử dụng trong mạng nội bộ hoặc mạng diện rộng) - Máy thu, đổi và truyền hoặc tái tạo âm thanh, hình ảnh hoặc dạng dữ liệu khác, kể cả thiết bị chuyển mạch và thiết bị định tuyến';

  test('LIET_KE phuongThucTruyenDan: gỡ tiêu đề cha 85176/851762 có cả hữu tuyến và không dây để đọc đúng VO_TUYEN ở phần dòng con', () => {
    const dkVoTuyen = {
      fact: 'phuongThucTruyenDan',
      op: 'TRONG',
      value: ['VO_TUYEN'],
    };
    const moTa85176210 = `${tieuDe851762}: Thiết bị phát và thu sóng vô tuyến sử dụng cho phiên dịch trực tiếp tại các hội nghị sử dụng nhiều thứ tiếng`;

    const r = DK.danhGiaTuChu(dkVoTuyen, moTa85176210, '85176210');
    assert.equal(r.trangThai, 'THOA');
    assert.equal(r.tatDinh, true);
  });

  test('Ca bảo vệ LIET_KE: câu chỉ có tiêu đề cha đa vế (cả hữu tuyến lẫn không dây) vẫn giữ CHUA_BIET', () => {
    const dkVoTuyen = {
      fact: 'phuongThucTruyenDan',
      op: 'TRONG',
      value: ['VO_TUYEN'],
    };

    const r = DK.danhGiaTuChu(dkVoTuyen, tieuDe851762, '85176210');
    assert.equal(r.trangThai, 'CHUA_BIET');
  });

  test('851762: chotDong8 chốt đúng 85176210, 85176253, 85176261, 85176292 khi ghép tiêu đề cha 85176/851762 và không lấn 85176292 vào 8517626', () => {
    const r10 = chotDong8({
      hs: '851762',
      productText: `${tieuDe851762}: Thiết bị phát và thu sóng vô tuyến sử dụng cho phiên dịch trực tiếp tại các hội nghị sử dụng nhiều thứ tiếng`,
    });
    assert.equal(r10.ketQua, 'CHOT');
    assert.equal(r10.hs, '85176210');

    const r53 = chotDong8({
      hs: '851762',
      productText: `${tieuDe851762} - Thiết bị truyền dẫn khác kết hợp với thiết bị thu: Thiết bị phát khác dùng cho điện báo hoặc điện thoại truyền dẫn dưới dạng sóng vô tuyến`,
    });
    assert.equal(r53.ketQua, 'CHOT');
    assert.equal(r53.hs, '85176253');

    const r61 = chotDong8({
      hs: '851762',
      productText: `${tieuDe851762} - Thiết bị truyền dẫn khác: Dùng cho điện báo hoặc điện thoại truyền dẫn dưới dạng sóng vô tuyến`,
    });
    assert.equal(r61.ketQua, 'CHOT');
    assert.equal(r61.hs, '85176261');

    const r92 = chotDong8({
      hs: '851762',
      productText: `${tieuDe851762} - Loại khác: Dùng cho điện báo hoặc điện thoại truyền dẫn dưới dạng sóng vô tuyến`,
    });
    assert.equal(r92.ketQua, 'CHOT');
    assert.equal(r92.hs, '85176292');
  });

  test('SO: tách khoảng số đa tầng nối bằng " - " để giao khoảng (10.000, 15.000] kVA ở 850434', () => {
    const moTaDaTang =
      'Máy biến điện tĩnh - Các máy biến điện khác - Có công suất danh định trên 500 kVA - Có công suất danh định trên 10.000 kVA và đầu điện áp cao từ 66 kV trở lên - Có công suất danh định không quá 15.000 kVA: Máy biến áp thích ứng dùng để phối hợp trở kháng';

    const rTren10k = DK.danhGiaTuChu(
      { fact: 'congSuatBieuKien', op: '>', value: 10000, donVi: 'kVA' },
      moTaDaTang,
      '85043411',
    );
    assert.equal(rTren10k.trangThai, 'THOA');
    assert.equal(rTren10k.tatDinh, true);

    const rKhongQua15k = DK.danhGiaTuChu(
      { fact: 'congSuatBieuKien', op: '<=', value: 15000, donVi: 'kVA' },
      moTaDaTang,
      '85043411',
    );
    assert.equal(rKhongQua15k.trangThai, 'THOA');
    assert.equal(rKhongQua15k.tatDinh, true);

    const rTren15k = DK.danhGiaTuChu(
      { fact: 'congSuatBieuKien', op: '>', value: 15000, donVi: 'kVA' },
      moTaDaTang,
      '85043411',
    );
    assert.equal(rTren15k.trangThai, 'TRAI');
    assert.equal(rTren15k.tatDinh, true);
  });

  test('SO: dấu gạch nối không có khoảng trắng hai bên (như "xeri-sắt", "500-1000") không kích hoạt tách mệnh đề " - " và không bị ReDoS với 40.000 từ lặp (< 2 giây)', () => {
    const khongCoKhoangSố = DK.danhGiaTuChu(
      { fact: 'congSuatBieuKien', op: '>', value: 10000, donVi: 'kVA' },
      'Máy biến áp lõi hợp kim xeri-sắt dùng trong công nghiệp',
      '85043411',
    );
    assert.equal(khongCoKhoangSố.trangThai, 'CHUA_BIET');

    const longText = `${Array(40000).fill('biến-áp').join(' ')} - Có công suất danh định trên 10.000 kVA - Có công suất danh định không quá 15.000 kVA`;
    const t0 = Date.now();
    const rLong = DK.danhGiaTuChu(
      { fact: 'congSuatBieuKien', op: '<=', value: 15000, donVi: 'kVA' },
      longText,
      '85043411',
    );
    const dt = Date.now() - t0;
    assert.equal(rLong.trangThai, 'THOA');
    assert.ok(dt < 2000, `Thời gian chạy ${dt}ms phải < 2000ms`);
  });

  test('210390: goTieuDeChaDaVe gỡ tiêu đề trung gian 7 số 2103901 đa vế để không tự chốt 21039013 ở ca thiếu dữ kiện, vẫn chốt đúng khi có tên dòng', () => {
    const caThieu = chotDong8({
      hs: '210390',
      productText:
        'Nước xốt và các chế phẩm làm nước xốt; đồ gia vị hỗn hợp và bột canh hỗn hợp; bột mịn và bột thô từ hạt mù tạt và mù tạt đã chế biến. - Loại khác: Nước xốt và các chế phẩm làm nước xốt',
    });
    assert.notEqual(caThieu.ketQua, 'CHOT');
    assert.notEqual(caThieu.hs, '21039013');

    const caDu = chotDong8({
      hs: '210390',
      productText:
        'Nước xốt và các chế phẩm làm nước xốt; đồ gia vị hỗn hợp và bột canh hỗn hợp; bột mịn và bột thô từ hạt mù tạt và mù tạt đã chế biến. - Loại khác: Nước xốt và các chế phẩm làm nước xốt: Nước xốt loại khác',
    });
    assert.equal(caDu.ketQua, 'CHOT');
    assert.equal(caDu.hs, '21039013');
  });

  test('OZV-1698: boVeRiengCuaDong lọc ký hiệu (SEN) ở 36049040 và tách vế "và máy phát điện" với commonAllSibs ở 8501', () => {
    const r3604 = chotDong8({
      hs: '360490',
      productText:
        'Pháo hoa, pháo hiệu, pháo chống mưa đá, pháo hiệu sương mù và các sản phẩm pháo khác - Loại khác: Pháo hiệu (SEN)',
    });
    assert.equal(r3604.ketQua, 'CHOT');
    assert.equal(r3604.hs, '36049040');

    assert.equal(DK.coCumPhanBiet('Động cơ', '85013170'), true);
    assert.equal(DK.coCumPhanBiet('Động cơ', '85013225'), true);
  });

  test('OZV-1698: danhGiaTuChu với op TUONG_TU trả THOA tất định khi khớp khẳng định đích danh và giữ CHUA_BIET khi không khớp', () => {
    const dk38253010 = {
      fact: 'tenLoai',
      op: 'TUONG_TU',
      value: ['Bơm tiêm', 'kim tiêm', 'ống dẫn lưu'],
    };
    const rKhop = DK.danhGiaTuChu(
      dk38253010,
      'Rác thải bệnh viện: Bơm tiêm, kim tiêm, ống dẫn lưu và các loại tương tự',
      '38253010',
    );
    assert.equal(rKhop.trangThai, 'THOA');
    assert.equal(rKhop.tatDinh, true);

    const rKhongKhop = DK.danhGiaTuChu(
      dk38253010,
      'Rác thải bệnh viện: Bông băng gạc y tế đã qua sử dụng',
      '38253010',
    );
    assert.equal(rKhongKhop.trangThai, 'CHUA_BIET');

    const rChot3825 = chotDong8({
      hs: '382530',
      productText: 'Rác thải bệnh viện: Bơm tiêm, kim tiêm, ống dẫn lưu và các loại tương tự',
    });
    assert.equal(rChot3825.ketQua, 'CHOT');
    assert.equal(rChot3825.hs, '38253010');
  });

  test('OZV-1698: nutConTranhChap kiểm chuTuMoTaHang để tên tổ tiên chung 0714 không chặn oan 07149091', () => {
    const r0714 = chotDong8({
      hs: '071490',
      productText:
        'Sắn, củ dong, củ lan, a-ti-sô Jerusalem, khoai lang và các loại củ và rễ tương tự có hàm lượng tinh bột hoặc inulin cao, tươi, ướp lạnh, đông lạnh hoặc khô, đã hoặc chưa thái lát hoặc làm thành dạng viên; lõi cây cọ sago. - Loại khác - Loại khác: Đông lạnh',
    });
    assert.equal(r0714.ketQua, 'CHOT');
    assert.equal(r0714.hs, '07149091');

    const r27101212 = chotDong8({
      hs: '271012',
      productText:
        'Dầu có nguồn gốc từ dầu mỏ - Dầu nhẹ và các chế phẩm: Xăng động cơ, có pha chì: RON 90 và cao hơn nhưng dưới RON 97',
    });
    assert.equal(r27101212.ketQua, 'CHOT');
    assert.equal(r27101212.hs, '27101212');

    const rRonKhongQua = DK.danhGiaTuChu(
      { fact: 'triSoOctan', op: '<=', value: 95, donVi: 'RON' },
      'Xăng động cơ: từ RON 90 nhưng không quá RON 95',
      '27101212',
    );
    assert.equal(rRonKhongQua.trangThai, 'THOA');
    assert.equal(rRonKhongQua.tatDinh, true);

    const r85011051 = chotDong8({
      hs: '850110',
      productText:
        'Động cơ điện và máy phát điện (trừ tổ máy phát điện) - Động cơ có công suất không quá 37,5 W - Động cơ khác, kể cả động cơ vạn năng (một chiều/xoay chiều) - Động cơ bước: Loại dùng cho hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09 hoặc 85.16',
    });
    assert.equal(r85011051.ketQua, 'CHOT');
    assert.equal(r85011051.hs, '85011051');

    const r85011091 = chotDong8({
      hs: '850110',
      productText:
        'Động cơ điện và máy phát điện (trừ tổ máy phát điện) - Động cơ có công suất không quá 37,5 W - Động cơ khác, kể cả động cơ vạn năng (một chiều/xoay chiều) - Loại khác: Loại dùng cho hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09 hoặc 85.16',
    });
    assert.equal(r85011091.ketQua, 'THIEU_SO_LIEU');
    assert.ok((r85011091.missingFacts || []).some((m) => m.fact === 'kieuDongCoDien'));
    assert.ok(!(r85011091.missingFacts || []).some((m) => m.fact === 'loaiDongDien'));
  });

  test('OZV-1708: đọc "sức chứa ... kg" cho khoiLuong ở nhóm 8450 (2 chiều + ReDoS < 2 giây)', () => {
    const dk6kg = { fact: 'khoiLuong', op: '<=', value: 6, donVi: 'kg' };
    const rThoa = DK.danhGiaTuChu(
      dk6kg,
      'Máy giặt, có sức chứa không quá 10 kg vải khô một lần giặt - Máy tự động hoàn toàn: Loại có sức chứa không quá 6 kg vải khô một lần giặt',
      '84501110',
    );
    assert.equal(rThoa.trangThai, 'THOA');
    assert.equal(rThoa.tatDinh, true);

    const rTrai = DK.danhGiaTuChu(
      dk6kg,
      'Máy giặt, có sức chứa không quá 10 kg vải khô một lần giặt - Máy tự động hoàn toàn: Loại có sức chứa 7,5 kg vải khô một lần giặt',
      '84501110',
    );
    assert.equal(rTrai.trangThai, 'TRAI');
    assert.equal(rTrai.tatDinh, true);

    const rChuaBiet = DK.danhGiaTuChu(
      dk6kg,
      'Máy giặt, có sức chứa không quá 10 kg vải khô một lần giặt - Máy tự động hoàn toàn',
      '84501110',
    );
    assert.equal(rChuaBiet.trangThai, 'CHUA_BIET');

    assert.equal(
      chotDong8({
        hs: '845011',
        productText:
          'Máy giặt, có sức chứa không quá 10 kg vải khô một lần giặt - Máy tự động hoàn toàn: Loại có sức chứa không quá 6 kg vải khô một lần giặt',
      }).hs,
      '84501110',
    );
    assert.equal(
      chotDong8({
        hs: '845012',
        productText:
          'Máy giặt, có sức chứa không quá 10 kg vải khô một lần giặt - Máy giặt khác, có chức năng sấy ly tâm: Loại có sức chứa không quá 6 kg vải khô một lần giặt',
      }).hs,
      '84501210',
    );
    assert.equal(
      chotDong8({
        hs: '845019',
        productText:
          'Máy giặt, có sức chứa không quá 10 kg vải khô một lần giặt - Loại khác: Hoạt động bằng điện: Loại có sức chứa không quá 6 kg vải khô một lần giặt',
      }).hs,
      '84501911',
    );

    const longText = `${Array(40000).fill('sức chứa').join(' ')} - Loại có sức chứa không quá 6 kg vải khô một lần giặt`;
    const t0 = Date.now();
    const rLong = DK.danhGiaTuChu(dk6kg, longText, '84501110');
    const dt = Date.now() - t0;
    assert.equal(rLong.trangThai, 'THOA');
    assert.ok(dt < 2000, `Thời gian chạy ${dt}ms phải < 2000ms`);
  });

  test('OZV-1708: phân nhóm xx00 (1603, 2709, 3210, 4405, 5908) và dòng phanConLai có tên riêng (5802, 5907)', () => {
    assert.equal(
      chotDong8({ hs: '440500', productText: 'Sợi gỗ; bột gỗ.: Sợi gỗ' }).hs,
      '44050010',
    );
    assert.equal(
      chotDong8({ hs: '440500', productText: 'Sợi gỗ; bột gỗ.: Bột gỗ' }).hs,
      '44050020',
    );
    assert.notEqual(
      chotDong8({ hs: '440500', productText: 'Sợi gỗ; bột gỗ.' }).ketQua,
      'CHOT',
    );

    assert.equal(
      chotDong8({
        hs: '160300',
        productText:
          'Sản phẩm chiết xuất và nước ép từ thịt, cá hoặc từ động vật giáp xác, động vật thân mềm hoặc động vật thuỷ sinh không xương sống khác.: Từ thịt',
      }).hs,
      '16030010',
    );
    assert.equal(
      chotDong8({
        hs: '270900',
        productText: 'Dầu mỏ và các loại dầu thu được từ các khoáng bi-tum, ở dạng thô.: Dầu mỏ thô',
      }).hs,
      '27090010',
    );
    assert.equal(
      chotDong8({
        hs: '321000',
        productText:
          'Sơn và vecni khác (kể cả các loại men tráng (enamels), dầu bóng và màu keo); các loại thuốc màu nước đã pha chế dùng để hoàn thiện da.: Vecni (kể cả dầu bóng)',
      }).hs,
      '32100010',
    );
    assert.equal(
      chotDong8({
        hs: '590800',
        productText:
          'Các loại bấc dệt thoi, kết, tết hoặc dệt kim, dùng cho đèn, bếp dầu, bật lửa, nến hoặc loại tương tự; mạng đèn măng xông và các loại vải dệt kim hình ống dùng làm mạng đèn măng xông, đã hoặc chưa ngâm tẩm.: Bấc; mạng đèn măng xông',
      }).hs,
      '59080010',
    );

    assert.equal(
      chotDong8({
        hs: '580230',
        productText: 'Các loại vải dệt tạo búi: Dệt thoi, từ vật liệu khác',
      }).hs,
      '58023030',
    );
    assert.notEqual(
      chotDong8({
        hs: '580230',
        productText: 'Các loại vải dệt tạo búi',
      }).ketQua,
      'CHOT',
    );

    assert.equal(
      chotDong8({
        hs: '590700',
        productText:
          'Các loại vải dệt được ngâm tẩm, tráng hoặc phủ bằng cách khác; vải canvas được vẽ làm phông cảnh cho rạp hát, phông trường quay hoặc loại tương tự.: Các loại vải được ngâm tẩm, tráng hoặc phủ bằng các vật liệu khác',
      }).hs,
      '59070060',
    );
    assert.notEqual(
      chotDong8({
        hs: '590700',
        productText:
          'Các loại vải dệt được ngâm tẩm, tráng hoặc phủ bằng cách khác; vải canvas được vẽ làm phông cảnh cho rạp hát, phông trường quay hoặc loại tương tự.',
      }).ketQua,
      'CHOT',
    );
  });

  test('OZV-1708: giữ âm tiết "đồ" cho "Gạo đồ" (1006), gỡ mệnh đề tùy chọn ở cha (2523, 3307), đồng bộ epsomit/epsomite (2530) và tách vế "và" (7407, 7603, 7604, 8428)', () => {
    assert.equal(
      chotDong8({
        hs: '100630',
        productText: 'Gạo đã xát toàn bộ hoặc sơ bộ, đã hoặc chưa được đánh bóng hoặc hồ (glazed): Gạo đồ (1)',
      }).hs,
      '10063091',
    );
    assert.equal(
      chotDong8({
        hs: '252329',
        productText: 'Xi măng poóc lăng (1) - Loại khác: Xi măng màu',
      }).hs,
      '25232910',
    );
    assert.equal(
      chotDong8({
        hs: '253020',
        productText: 'Kiezerit, epsomit (magiê sulphat tự nhiên): Epsomite (magiê sulphat tự nhiên)',
      }).hs,
      '25302020',
    );
    assert.equal(
      chotDong8({
        hs: '330749',
        productText:
          'Các chế phẩm dùng để làm thơm hoặc khử mùi phòng, kể cả các chế phẩm có mùi thơm dùng trong nghi lễ tôn giáo - Loại khác: Các chế phẩm làm thơm phòng, có hoặc không có đặc tính khử trùng',
      }).hs,
      '33074910',
    );
    assert.equal(
      chotDong8({
        hs: '740710',
        productText: 'Bằng đồng tinh luyện: Dạng hình',
      }).hs,
      '74071030',
    );
    assert.equal(
      chotDong8({
        hs: '760320',
        productText: 'Bột có cấu trúc lớp; vảy nhôm: Vảy nhôm',
      }).hs,
      '76032010',
    );
    assert.equal(
      chotDong8({
        hs: '760410',
        productText: 'Bằng nhôm, không hợp kim: Dạng thanh và que',
      }).hs,
      '76041010',
    );
    assert.equal(
      chotDong8({
        hs: '842810',
        productText:
          'Thang máy (lift) và tời nâng kiểu gầu nâng (trục tải thùng kíp): Tời nâng kiểu gầu nâng (trục tải thùng kíp)',
      }).hs,
      '84281040',
    );
  });
});
