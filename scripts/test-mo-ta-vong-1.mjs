import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { anchorTenBieuThue, chonTenHang, danhTuCuThe, laTenMoHo, gopMoTaPhapLy } from '../lib/describe-legal-head.mjs';

const require = createRequire(import.meta.url);
const { breadcrumbOf } = require('../lib/hs-breadcrumb.js');
const CAM = /các loại|loại khác|hoặc|kể cả/i;

// Đợt 0B: biểu thuế dùng để KIỂM tên hàng, không THAY.
test('chonTenHang: tên khách cụ thể được GIỮ dù khác chữ biểu thuế (dép 64029990 — dòng "Loại khác")', () => {
  const r = chonTenHang({ tenHangKhach: 'Dép guốc nữ', breadcrumb: breadcrumbOf('64029990') });
  assert.equal(r.ten, 'Dép guốc nữ');
  assert.equal(r.thayDoi, false);
  assert.ok(!CAM.test(r.ten));
});

test('chonTenHang: "Dây curoa" mã 39269053 không thành "…hoặc đai truyền hoặc băng tải…"', () => {
  const r = chonTenHang({ tenHangKhach: 'Dây curoa', breadcrumb: breadcrumbOf('39269053') });
  assert.equal(r.ten, 'Dây curoa');
  assert.ok(!/hoặc/.test(r.ten));
});

test('chonTenHang: bảng vẽ 84716040 không thành "…kể cả chuột, bút quang…"', () => {
  const r = chonTenHang({ tenHangKhach: 'Bảng vẽ điện tử kèm bút cảm ứng', breadcrumb: breadcrumbOf('84716040') });
  assert.equal(r.ten, 'Bảng vẽ điện tử kèm bút cảm ứng');
});

test('chonTenHang: tên ngoại ngữ/lóng mơ hồ ("laptop") → danh từ cụ thể, không chuỗi "kể cả"', () => {
  const r = chonTenHang({ tenHangKhach: 'laptop', breadcrumb: breadcrumbOf('84713020') });
  assert.equal(r.ten, 'Máy tính xách tay');
  assert.equal(r.thayDoi, true);
  assert.ok(r.canhBao.some((c) => c.code === 'TEN_HANG_DA_THAY'));
});

test('chonTenHang: tên mơ hồ ở dòng "Loại khác" mà danh từ nhóm toàn chữ cấm → giữ tên + cảnh báo, KHÔNG dùng "Các loại…"', () => {
  const r = chonTenHang({ tenHangKhach: 'slipper', breadcrumb: { hsCode: '64029990', selfVi: 'Loại khác', headingVi: 'Các loại giày, dép khác có đế ngoài và mũ giày bằng cao su hoặc plastic' } });
  assert.ok(!CAM.test(r.ten), r.ten);
});

test('chonTenHang: tên lệch danh từ của nhánh → cảnh báo TEN_LECH_NHANH, không thay', () => {
  const r = chonTenHang({ tenHangKhach: 'Bàn chải đánh răng điện', breadcrumb: breadcrumbOf('84713020') });
  assert.equal(r.ten, 'Bàn chải đánh răng điện');
  assert.ok(r.canhBao.some((c) => c.code === 'TEN_LECH_NHANH'));
});

test('danhTuCuThe: cắt ở "kể cả"/"hoặc"/ngoặc; trả null khi còn chữ cấm', () => {
  assert.equal(danhTuCuThe('Máy tính xách tay kể cả notebook và subnotebook'), 'Máy tính xách tay');
  assert.equal(danhTuCuThe('Băng truyền (dây curoa) hoặc đai truyền hoặc băng tải hoặc đai tải'), 'Băng truyền');
  assert.equal(danhTuCuThe('- - - Loại khác'), null);
});

test('laTenMoHo: tên Việt cụ thể không mơ hồ; tên 1–2 từ ngoại ngữ, chữ Hán, rỗng là mơ hồ', () => {
  assert.equal(laTenMoHo('Dây curoa'), false);
  assert.equal(laTenMoHo('laptop'), true);
  assert.equal(laTenMoHo('拖鞋'), true);
  assert.equal(laTenMoHo(''), true);
});

test('anchorTenBieuThue (tương thích): trả tên đã chọn', () => {
  assert.equal(anchorTenBieuThue({ tenHangKhach: 'Máy tính xách tay Dell Latitude', breadcrumb: breadcrumbOf('84713020') }), 'Máy tính xách tay Dell Latitude');
});

test('gopMoTaPhapLy: dấu phẩy, không "xuất xứ", không "không gồm…", giữ chất liệu/công dụng/kích thước, ≤200', () => {
  const r = gopMoTaPhapLy({
    declaration: {
      tenHang: 'Máy bơm ly tâm trục ngang', thanhPhanCauTao: 'gang', congDung: 'bơm nước sạch',
      thongSoKyThuat: ['công suất 0.75 kW', 'điện áp 220V'], nhanHieu: 'Pentax', model: 'CM 10-40',
      xuatXu: { code: 'IT', nameVi: 'Ý' }, tinhTrang: 'Mới 100%',
    },
    hsCode: '84137011', keepSpecs: true,
  });
  assert.ok(r.text.length <= 200);
  assert.ok(r.text.startsWith('Máy bơm ly tâm trục ngang, bằng gang, công dụng: bơm nước sạch'), r.text);
  assert.ok(r.text.includes('0.75 kW') && r.text.includes('model: CM 10-40, hiệu: Pentax'), r.text);
  assert.ok(!/xuất xứ|không gồm|;/.test(r.text), r.text);
  assert.ok(r.text.endsWith(', Mới 100%'));
});
