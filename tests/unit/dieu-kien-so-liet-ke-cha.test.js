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

  test('OZV-1712: gỡ 10 nhóm vướng 1 dòng DONG_CO_TEN (0406, 0703, 2208, 3005, 6209, 7415, 7616, 8308, 9603, 9609) — kiểm 2 chiều + ReDoS < 2 giây', () => {
    // 1. Nhóm 2208 (22083010): đọc "đựng trong đồ chứa ... lít" (kể cả NFD) cho dungTich
    const dk5l = { fact: 'dungTich', op: '>', value: 5, donVi: 'lít' };
    const r2208Thoa = DK.danhGiaTuChu(
      dk5l,
      'Rượu whisky: Được đựng trong đồ chứa trên 5 lít',
      '22083010',
    );
    assert.equal(r2208Thoa.trangThai, 'THOA');
    assert.equal(r2208Thoa.tatDinh, true);

    const r2208Trai = DK.danhGiaTuChu(
      dk5l,
      'Rượu whisky: Được đựng trong đồ chứa 2 lít',
      '22083010',
    );
    assert.equal(r2208Trai.trangThai, 'TRAI');
    assert.equal(r2208Trai.tatDinh, true);

    assert.equal(
      chotDong8({
        hs: '220830',
        productText: 'Rượu whisky: Được đựng trong đồ chứa trên 5 lít',
      }).hs,
      '22083010',
    );
    assert.notEqual(
      chotDong8({
        hs: '220830',
        productText: 'Rượu whisky',
      }).ketQua,
      'CHOT',
    );

    const long2208 = `${Array(40000).fill('đồ chứa').join(' ')} - Được đựng trong đồ chứa trên 5 lít`;
    const t0 = Date.now();
    const rLong2208 = DK.danhGiaTuChu(dk5l, long2208, '22083010');
    const dt = Date.now() - t0;
    assert.equal(rLong2208.trangThai, 'THOA');
    assert.ok(dt < 2000, `Thời gian chạy ${dt}ms phải < 2000ms`);

    // 2. Nhóm 0703 (07031011 vs 07031021): "Hành" không khớp tiền tố "Hành tây"
    assert.equal(
      chotDong8({
        hs: '070310',
        productText: 'Hành tây và hành, hẹ: Hành tây: Củ giống',
      }).hs,
      '07031011',
    );
    assert.equal(
      chotDong8({
        hs: '070310',
        productText: 'Hành tây và hành, hẹ: Hành, hẹ: Củ giống',
      }).hs,
      '07031021',
    );
    assert.notEqual(
      chotDong8({
        hs: '070310',
        productText: 'Hành tây và hành, hẹ',
      }).ketQua,
      'CHOT',
    );

    // 3. 8 nhóm TEN_LOAI tách vế riêng khỏi tiêu đề cha (0406, 3005, 6209, 7415, 7616, 8308, 9603, 9609)
    assert.equal(
      chotDong8({
        hs: '040610',
        productText: 'Pho mát tươi (chưa ủ chín hoặc chưa xử lý), kể cả pho mát whey, và curd: Curd',
      }).hs,
      '04061020',
    );
    assert.notEqual(
      chotDong8({
        hs: '040610',
        productText: 'Pho mát tươi (chưa ủ chín hoặc chưa xử lý), kể cả pho mát whey, và curd',
      }).ketQua,
      'CHOT',
    );

    assert.equal(
      chotDong8({
        hs: '300590',
        productText:
          'Bông, gạc, băng và các sản phẩm tương tự (ví dụ, băng để băng bó, cao dán, thuốc đắp), đã thấm tẩm hoặc tráng phủ dược chất hoặc làm thành dạng nhất định hoặc đóng gói để bán lẻ dùng cho y tế, phẫu thuật, nha khoa hoặc thú y. - Loại khác: Băng (SEN)',
      }).hs,
      '30059010',
    );
    assert.notEqual(
      chotDong8({
        hs: '300590',
        productText:
          'Bông, gạc, băng và các sản phẩm tương tự (ví dụ, băng để băng bó, cao dán, thuốc đắp), đã thấm tẩm hoặc tráng phủ dược chất hoặc làm thành dạng nhất định hoặc đóng gói để bán lẻ dùng cho y tế, phẫu thuật, nha khoa hoặc thú y. - Loại khác',
      }).ketQua,
      'CHOT',
    );

    assert.equal(
      chotDong8({
        hs: '620930',
        productText: 'Quần áo may sẵn và phụ kiện may mặc cho trẻ em. - Từ sợi tổng hợp: Phụ kiện may mặc',
      }).hs,
      '62093040',
    );
    assert.notEqual(
      chotDong8({
        hs: '620930',
        productText: 'Quần áo may sẵn và phụ kiện may mặc cho trẻ em. - Từ sợi tổng hợp',
      }).ketQua,
      'CHOT',
    );

    assert.equal(
      chotDong8({
        hs: '741510',
        productText: 'Đinh và đinh bấm, đinh ấn, ghim dập và các sản phẩm tương tự: Đinh',
      }).hs,
      '74151010',
    );
    assert.notEqual(
      chotDong8({
        hs: '741510',
        productText: 'Đinh và đinh bấm, đinh ấn, ghim dập và các sản phẩm tương tự',
      }).ketQua,
      'CHOT',
    );

    assert.equal(
      chotDong8({
        hs: '761610',
        productText:
          'Đinh, đinh bấm, ghim dập (trừ các loại thuộc nhóm 83.05), đinh vít, bu lông, đai ốc, đinh móc, đinh tán, chốt hãm, chốt định vị, vòng đệm và các sản phẩm tương tự: Đinh',
      }).hs,
      '76161010',
    );
    assert.notEqual(
      chotDong8({
        hs: '761610',
        productText:
          'Đinh, đinh bấm, ghim dập (trừ các loại thuộc nhóm 83.05), đinh vít, bu lông, đai ốc, đinh móc, đinh tán, chốt hãm, chốt định vị, vòng đệm và các sản phẩm tương tự',
      }).ketQua,
      'CHOT',
    );

    assert.equal(
      chotDong8({
        hs: '830890',
        productText:
          'Móc cào, khóa móc cài, khóa thắt lưng, cài thắt lưng, khóa có chốt, mắt cài khóa, khoen và các loại tương tự, bằng kim loại cơ bản, dùng cho quần áo hoặc phụ kiện quần áo, giày dép, trang sức, đồng hồ đeo tay, sách, bạt che, đồ da, hàng du lịch hoặc yên cương hoặc cho các sản phẩm hoàn thiện khác; đinh tán hình ống hoặc đinh tán có chân xòe, bằng kim loại cơ bản; hạt trang trí và trang kim, bằng kim loại cơ bản. - Loại khác, kể cả các bộ phận: Trang kim',
      }).hs,
      '83089020',
    );
    assert.notEqual(
      chotDong8({
        hs: '830890',
        productText:
          'Móc cào, khóa móc cài, khóa thắt lưng, cài thắt lưng, khóa có chốt, mắt cài khóa, khoen và các loại tương tự, bằng kim loại cơ bản, dùng cho quần áo hoặc phụ kiện quần áo, giày dép, trang sức, đồng hồ đeo tay, sách, bạt che, đồ da, hàng du lịch hoặc yên cương hoặc cho các sản phẩm hoàn thiện khác; đinh tán hình ống hoặc đinh tán có chân xòe, bằng kim loại cơ bản; hạt trang trí và trang kim, bằng kim loại cơ bản. - Loại khác, kể cả các bộ phận',
      }).ketQua,
      'CHOT',
    );

    assert.equal(
      chotDong8({
        hs: '960310',
        productText:
          'Chổi và bàn chải, gồm các cành nhỏ hoặc các chất liệu từ thực vật khác buộc lại với nhau, có hoặc không có cán: Chổi',
      }).hs,
      '96031020',
    );
    assert.notEqual(
      chotDong8({
        hs: '960310',
        productText:
          'Chổi và bàn chải, gồm các cành nhỏ hoặc các chất liệu từ thực vật khác buộc lại với nhau, có hoặc không có cán',
      }).ketQua,
      'CHOT',
    );

    assert.equal(
      chotDong8({
        hs: '960990',
        productText:
          'Bút chì (trừ các loại bút chì thuộc nhóm 96.08), bút màu, ruột chì, phấn màu, than vẽ, phấn vẽ hoặc viết và phấn thợ may. - Loại khác - Loại khác: Phấn vẽ hoặc phấn viết',
      }).hs,
      '96099091',
    );
    assert.notEqual(
      chotDong8({
        hs: '960990',
        productText:
          'Bút chì (trừ các loại bút chì thuộc nhóm 96.08), bút màu, ruột chì, phấn màu, than vẽ, phấn vẽ hoặc viết và phấn thợ may. - Loại khác - Loại khác',
      }).ketQua,
      'CHOT',
    );
  });

  test('OZV-1717: gỡ 11 nhóm vướng tiêu đề cha đa vế và giá trị cha-con LIET_KE/CHAT_LIEU (0804, 0809, 1401, 2916, 2922, 2931, 4818, 6001, 6105, 6406, 9615) — kiểm 2 chiều + ReDoS < 2 giây', () => {
    // 1. Tách vế cha nối bằng "và" / "and" (0804, 0809, 2916, 2922, 2931, 4818)
    assert.equal(
      chotDong8({
        hs: '080450',
        productText: 'Quả ổi, xoài và măng cụt: Quả măng cụt',
      }).hs,
      '08045030',
    );
    assert.notEqual(
      chotDong8({
        hs: '080450',
        productText: 'Quả ổi, xoài và măng cụt',
      }).ketQua,
      'CHOT',
    );

    // 0809: "Quả mận" không khớp tiền tố "Quả mận gai"
    assert.equal(
      chotDong8({
        hs: '080940',
        productText: 'Quả mận và quả mận gai: Quả mận',
      }).hs,
      '08094010',
    );
    assert.equal(
      chotDong8({
        hs: '080940',
        productText: 'Quả mận và quả mận gai: Quả mận gai',
      }).hs,
      '08094020',
    );
    assert.notEqual(
      chotDong8({
        hs: '080940',
        productText: 'Quả mận và quả mận gai',
      }).ketQua,
      'CHOT',
    );

    assert.equal(
      chotDong8({
        hs: '291632',
        productText:
          'Axit carboxylic thơm đơn chức, các anhydrit, halogenua, peroxit, peroxyaxit của chúng và các dẫn xuất của các chất trên - Benzoyl peroxit và benzoyl clorua: Benzoyl peroxit',
      }).hs,
      '29163210',
    );
    assert.equal(
      chotDong8({
        hs: '291632',
        productText:
          'Axit carboxylic thơm đơn chức, các anhydrit, halogenua, peroxit, peroxyaxit của chúng và các dẫn xuất của các chất trên - Benzoyl peroxit và benzoyl clorua: Benzoyl clorua',
      }).hs,
      '29163220',
    );
    assert.notEqual(
      chotDong8({
        hs: '291632',
        productText:
          'Axit carboxylic thơm đơn chức, các anhydrit, halogenua, peroxit, peroxyaxit của chúng và các dẫn xuất của các chất trên - Benzoyl peroxit và benzoyl clorua',
      }).ketQua,
      'CHOT',
    );

    assert.equal(
      chotDong8({
        hs: '292242',
        productText:
          'Axit - amino, trừ loại chứa 2 chức oxy trở lên, và este của chúng; muối của chúng - Axit glutamic và muối của nó: Axit glutamic',
      }).hs,
      '29224210',
    );
    assert.equal(
      chotDong8({
        hs: '292242',
        productText:
          'Axit - amino, trừ loại chứa 2 chức oxy trở lên, và este của chúng; muối của chúng - Axit glutamic và muối của nó: Muối khác',
      }).hs,
      '29224290',
    );
    assert.notEqual(
      chotDong8({
        hs: '292242',
        productText:
          'Axit - amino, trừ loại chứa 2 chức oxy trở lên, và este của chúng; muối của chúng - Axit glutamic và muối của nó',
      }).ketQua,
      'CHOT',
    );

    assert.equal(
      chotDong8({
        hs: '293110',
        productText: 'Chì tetrametyl và chì tetraetyl: Chì tetrametyl',
      }).hs,
      '29311010',
    );
    assert.equal(
      chotDong8({
        hs: '293110',
        productText: 'Chì tetrametyl và chì tetraetyl: Chì tetraetyl',
      }).hs,
      '29311020',
    );
    assert.notEqual(
      chotDong8({
        hs: '293110',
        productText: 'Chì tetrametyl và chì tetraetyl',
      }).ketQua,
      'CHOT',
    );

    assert.equal(
      chotDong8({
        hs: '481830',
        productText: 'Khăn trải bàn và khăn ăn: Khăn trải bàn',
      }).hs,
      '48183010',
    );
    assert.equal(
      chotDong8({
        hs: '481830',
        productText: 'Khăn trải bàn và khăn ăn: Khăn ăn (serviettes)',
      }).hs,
      '48183020',
    );
    assert.notEqual(
      chotDong8({
        hs: '481830',
        productText: 'Khăn trải bàn và khăn ăn',
      }).ketQua,
      'CHOT',
    );

    // 2. Từ ghép khác nghĩa "nguyên cây" vs "nguyên liệu" (1401)
    assert.equal(
      chotDong8({
        hs: '140120',
        productText: 'Song, mây: Nguyên cây',
      }).hs,
      '14012010',
    );
    assert.notEqual(
      chotDong8({
        hs: '140120',
        productText: 'Song, mây',
      }).ketQua,
      'CHOT',
    );

    // 3. Thu gọn ứng viên LIET_KE có quan hệ cha-con trong giaTriCha (6001, 6105)
    assert.equal(
      chotDong8({
        hs: '600192',
        productText:
          'Loại khác - Từ xơ nhân tạo: Vải nổi vòng (pile) từ xơ staple 100% polyeste, có chiều rộng không nhỏ hơn 63,5 mm nhưng không quá 76,2 mm, phù hợp để sử dụng trong sản xuất con lăn sơn',
      }).hs,
      '60019220',
    );
    assert.notEqual(
      chotDong8({
        hs: '600192',
        productText: 'Loại khác - Từ xơ nhân tạo',
      }).ketQua,
      'CHOT',
    );

    assert.equal(
      chotDong8({
        hs: '610520',
        productText: 'Từ sợi nhân tạo: Từ sợi tổng hợp',
      }).hs,
      '61052010',
    );
    assert.equal(
      chotDong8({
        hs: '610520',
        productText: 'Từ sợi nhân tạo: Từ sợi tái tạo',
      }).hs,
      '61052020',
    );
    assert.notEqual(
      chotDong8({
        hs: '610520',
        productText: 'Từ sợi nhân tạo',
      }).ketQua,
      'CHOT',
    );

    // 4. Gỡ tiêu đề cha đa vế cho CHAT_LIEU_THEO_VI_TRI (6406, 9615)
    assert.equal(
      chotDong8({
        hs: '640620',
        productText: 'Đế ngoài và gót giày, bằng cao su hoặc plastic: Bằng cao su',
      }).hs,
      '64062010',
    );
    assert.equal(
      chotDong8({
        hs: '640620',
        productText: 'Đế ngoài và gót giày, bằng cao su hoặc plastic: Bằng plastic',
      }).hs,
      '64062020',
    );
    assert.notEqual(
      chotDong8({
        hs: '640620',
        productText: 'Đế ngoài và gót giày, bằng cao su hoặc plastic',
      }).ketQua,
      'CHOT',
    );

    assert.equal(
      chotDong8({
        hs: '961511',
        productText: 'Lược, trâm cài tóc và loại tương tự - Bằng cao su cứng hoặc plastic: Bằng cao su cứng',
      }).hs,
      '96151120',
    );
    assert.equal(
      chotDong8({
        hs: '961511',
        productText: 'Lược, trâm cài tóc và loại tương tự - Bằng cao su cứng hoặc plastic: Bằng plastic',
      }).hs,
      '96151130',
    );
    assert.notEqual(
      chotDong8({
        hs: '961511',
        productText: 'Lược, trâm cài tóc và loại tương tự - Bằng cao su cứng hoặc plastic',
      }).ketQua,
      'CHOT',
    );

    // 5. Kiểm ReDoS ~40.000 từ lặp < 2 giây
    const longText = `${Array(40000).fill('quả mận').join(' ')} - Quả mận và quả mận gai: Quả mận gai`;
    const t0 = Date.now();
    const rLong = DK.danhGiaTuChu(
      { fact: 'tenLoai', op: 'TEN_LOAI', value: 'Quả mận gai' },
      longText,
      '08094020',
    );
    const dt = Date.now() - t0;
    assert.equal(rLong.trangThai, 'THOA');
    assert.ok(dt < 2000, `Thời gian chạy ${dt}ms phải < 2000ms`);
  });

  test('OZV-1752: tách vế "và củ cải" / "and turnips" + lọc "củ cải ri" cho nhóm 0706 (070610) — kiểm 2 chiều + ReDoS < 2 giây', () => {
    assert.equal(
      chotDong8({
        hs: '070610',
        productText: 'Cà rốt và củ cải: Cà rốt',
      }).hs,
      '07061010',
    );
    assert.equal(
      chotDong8({
        hs: '070610',
        productText: 'Cà rốt và củ cải: Củ cải',
      }).hs,
      '07061020',
    );
    assert.notEqual(
      chotDong8({
        hs: '070610',
        productText: 'Cà rốt và củ cải',
      }).ketQua,
      'CHOT',
    );

    const longText = `${Array(40000).fill('cà rốt').join(' ')} - Cà rốt và củ cải: Củ cải`;
    const t0 = Date.now();
    const rLong = DK.danhGiaTuChu(
      { fact: 'tenLoai', op: 'TEN_LOAI', value: 'Củ cải' },
      longText,
      '07061020',
    );
    const dt = Date.now() - t0;
    assert.equal(rLong.trangThai, 'THOA');
    assert.equal(rLong.tatDinh, true);
    assert.ok(dt < 2000, `Thời gian chạy ${dt}ms phải < 2000ms`);
  });

  test('OZV-1783: tách tiền tố "máy dùng để gia công" / "for working" và hỗ trợ TIEU_DE_QG trong boVeRiengCuaDong cho nhóm 8477 — kiểm 2 chiều + ReDoS < 2 giây', () => {
    assert.equal(
      chotDong8({
        hs: '847710',
        productText: 'Máy đúc phun: Để đúc cao su',
      }).hs,
      '84771010',
    );
    assert.equal(
      chotDong8({
        hs: '847710',
        productText: 'Máy đúc phun: Để đúc plastic: Máy đúc phun sản phẩm poly(vinyl chloride) (PVC)',
      }).hs,
      '84771031',
    );
    assert.notEqual(
      chotDong8({
        hs: '847710',
        productText: 'Máy đúc phun',
      }).ketQua,
      'CHOT',
    );

    assert.equal(
      chotDong8({
        hs: '847780',
        productText: 'Máy khác: Để gia công cao su hoặc sản xuất các sản phẩm từ cao su, không hoạt động bằng điện',
      }).hs,
      '84778020',
    );
    assert.equal(
      chotDong8({
        hs: '847790',
        productText: 'Bộ phận: Của máy để gia công cao su hoặc sản xuất các sản phẩm từ cao su không hoạt động bằng điện',
      }).hs,
      '84779020',
    );
    assert.notEqual(
      chotDong8({
        hs: '847780',
        productText: 'Máy khác',
      }).ketQua,
      'CHOT',
    );

    const longText = `${Array(40000).fill('máy dùng để gia công').join(' ')} - Máy đúc phun: Để đúc cao su`;
    const t0 = Date.now();
    const rLong = DK.danhGiaTuChu(
      { fact: 'congDung', op: 'CONG_DUNG', value: 'đúc cao su' },
      longText,
      '84771010',
    );
    const dt = Date.now() - t0;
    assert.equal(rLong.trangThai, 'THOA');
    assert.equal(rLong.tatDinh, true);
    assert.ok(dt < 2000, `Thời gian chạy ${dt}ms phải < 2000ms`);
  });
});
