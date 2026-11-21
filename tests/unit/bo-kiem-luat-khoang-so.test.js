'use strict';

require('../../scripts/test-isolate-data.mjs');
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const TV = require('../../lib/tu-vung.js');
const { chotDong8 } = require('../../lib/so-tay-gates.js');

describe('scripts/bo-kiem-luat.mjs — gom khoảng số cùng fact cho PHAI_CO nhiều tầng (OZV-1623)', () => {
  test('cumKhangDinh: chồng 2 cận số (> 10000 và <= 15000) trên cùng fact congSuatBieuKien → sinh 1 giá trị điểm giữa 12500kVA', async () => {
    const { cumKhangDinh } = await import('../../scripts/bo-kiem-luat.mjs');
    const cCha = { fact: 'congSuatBieuKien', op: '>', value: 10000, donVi: 'kVA' };
    const cCon = { fact: 'congSuatBieuKien', op: '<=', value: 15000, donVi: 'kVA' };

    const chu = cumKhangDinh([cCha, cCon]);
    assert.equal(chu, 'công suất biểu kiến 12500kVA');

    const doc = TV.docGiaTri('congSuatBieuKien', chu);
    assert.equal(doc?.trangThai, 'DA_CO');
    assert.ok(doc.giaTri > 10000 && doc.giaTri <= 15000, `giaTri=${doc?.giaTri} phải thuộc (10000, 15000]`);
  });

  test('cumKhangDinh: mảng hỗn hợp nhiều fact gom đúng các vế số cùng fact và giữ nguyên fact khác', async () => {
    const { cumKhangDinh } = await import('../../scripts/bo-kiem-luat.mjs');
    const ds = [
      { fact: 'congSuatBieuKien', op: '>', value: 10000, donVi: 'kVA' },
      { fact: 'dienAp', op: '>=', value: 66, donVi: 'kV' },
      { fact: 'congSuatBieuKien', op: '<=', value: 15000, donVi: 'kVA' },
    ];
    const chu = cumKhangDinh(ds);
    assert.equal(chu, 'công suất biểu kiến 12500kVA, điện áp 100000V');
    const soLanCongSuat = (chu.match(/công suất biểu kiến/g) || []).length;
    assert.equal(soLanCongSuat, 1, `chỉ được xuất hiện 1 cụm công suất biểu kiến: ${chu}`);
  });

  test('cumKhangDinh: chồng 2 cận cùng chiều (2 cận dưới hoặc 2 cận trên) chọn giá trị thoả cả hai', async () => {
    const { cumKhangDinh } = await import('../../scripts/bo-kiem-luat.mjs');
    const haiCanDuoi = cumKhangDinh([
      { fact: 'congSuatBieuKien', op: '>', value: 500, donVi: 'kVA' },
      { fact: 'congSuatBieuKien', op: '>', value: 15000, donVi: 'kVA' },
    ]);
    const docDuoi = TV.docGiaTri('congSuatBieuKien', haiCanDuoi);
    assert.equal(docDuoi?.trangThai, 'DA_CO');
    assert.ok(docDuoi.giaTri > 15000, `giaTri=${docDuoi?.giaTri} phải > 15000`);

    const haiCanTren = cumKhangDinh([
      { fact: 'congSuatBieuKien', op: '<=', value: 15000, donVi: 'kVA' },
      { fact: 'congSuatBieuKien', op: '<=', value: 10000, donVi: 'kVA' },
    ]);
    const docTren = TV.docGiaTri('congSuatBieuKien', haiCanTren);
    assert.equal(docTren?.trangThai, 'DA_CO');
    assert.ok(docTren.giaTri <= 10000, `giaTri=${docTren?.giaTri} phải <= 10000`);
  });

  test('cumKhangDinh: 1 vế đơn giữ nguyên hành vi cũ (> 10000 → 15001kVA, <= 15000 → 7500kVA)', async () => {
    const { cumKhangDinh } = await import('../../scripts/bo-kiem-luat.mjs');
    assert.equal(
      cumKhangDinh({ fact: 'congSuatBieuKien', op: '>', value: 10000, donVi: 'kVA' }),
      'công suất biểu kiến 15001kVA',
    );
    assert.equal(
      cumKhangDinh({ fact: 'congSuatBieuKien', op: '<=', value: 15000, donVi: 'kVA' }),
      'công suất biểu kiến 7500kVA',
    );
  });

  test('85043413: ca LOAI_TRU_LOAI_KHAC sinh 1 cụm công suất trong (10000, 15000] và chốt đúng 85043413 (không rơi sang 85043424)', async () => {
    const { sinhCaNhom } = await import('../../scripts/bo-kiem-luat.mjs');
    const { caLoaiTruLK } = sinhCaNhom('8504');
    const ca13 = caLoaiTruLK.find((c) => c.hs8 === '85043413');
    assert.ok(ca13, 'phải có ca LOAI_TRU_LOAI_KHAC cho 85043413');
    assert.match(ca13.productText, /công suất biểu kiến 12500kVA/);
    assert.doesNotMatch(ca13.productText, /15001kVA/);
    assert.doesNotMatch(ca13.productText, /7500kVA/);

    const kq = chotDong8({ hs: '850434', productText: ca13.productText });
    assert.equal(kq.ketQua, 'LOAI_KHAC', JSON.stringify(kq));
    assert.equal(kq.hs, '85043413', JSON.stringify(kq));
  });

  test('cumKhangDinh: vế có chieu PHAI_KHONG (và trong HOAC phuongAn của 8517792) sinh cụm phủ định, ca LOAI_TRU_LOAI_KHAC 85177929 chốt đúng (OZV-1683)', async () => {
    const { cumKhangDinh, sinhCaNhom } = await import('../../scripts/bo-kiem-luat.mjs');
    const vePhaiKhong = {
      fact: 'dungCho',
      op: 'CONG_DUNG',
      value: ['phát thanh sóng vô tuyến', 'thiết bị phát truyền hình'],
      chieu: 'PHAI_KHONG',
    };
    assert.equal(
      cumKhangDinh(vePhaiKhong),
      'không dùng cho phát thanh sóng vô tuyến, không dùng cho thiết bị phát truyền hình',
    );

    const { caLoaiTruLK } = sinhCaNhom('8517');
    const ca29 = caLoaiTruLK.find((c) => c.hs8 === '85177929');
    assert.ok(ca29, 'phải có ca LOAI_TRU_LOAI_KHAC cho 85177929');
    assert.match(ca29.productText, /không dùng cho phát thanh sóng vô tuyến/);

    const kq = chotDong8({ hs: '851779', productText: ca29.productText });
    assert.equal(kq.ketQua, 'LOAI_KHAC', JSON.stringify(kq));
    assert.equal(kq.hs, '85177929', JSON.stringify(kq));
  });

  test('sinhCaNhom: dòng có nguon sen.<hs8> nối điều kiện SEN vào productText của DONG_CO_TEN và chốt đúng (OZV-1683)', async () => {
    const { sinhCaNhom } = await import('../../scripts/bo-kiem-luat.mjs');
    const { caDongCoTen } = sinhCaNhom('0102');
    const caSen = caDongCoTen.find((c) => c.hs8 === '01022911');
    assert.ok(caSen, 'phải có ca DONG_CO_TEN cho 01022911');

    const kq = chotDong8({ hs: '010229', productText: caSen.productText });
    assert.equal(kq.ketQua, 'CHOT', JSON.stringify(kq));
    assert.equal(kq.hs, '01022911', JSON.stringify(kq));
  });
});
