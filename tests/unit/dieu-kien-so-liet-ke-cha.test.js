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

    const r85011041 = chotDong8({
      hs: '850110',
      productText:
        'Động cơ điện và máy phát điện (trừ tổ máy phát điện) - Động cơ có công suất không quá 37,5 W - Động cơ một chiều - Loại khác: Loại dùng cho hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09 hoặc 85.16',
    });
    assert.equal(r85011041.ketQua, 'CHOT');
    assert.equal(r85011041.hs, '85011041');

    const r85011091 = chotDong8({
      hs: '850110',
      productText:
        'Động cơ điện và máy phát điện (trừ tổ máy phát điện) - Động cơ có công suất không quá 37,5 W - Động cơ khác, kể cả động cơ vạn năng (một chiều/xoay chiều) - Loại khác: Loại dùng cho hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09 hoặc 85.16',
    });
    assert.equal(r85011091.ketQua, 'CHOT');
    assert.equal(r85011091.hs, '85011091');
  });
});
