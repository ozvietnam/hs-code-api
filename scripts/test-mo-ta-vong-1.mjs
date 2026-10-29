import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anchorTenBieuThue, dungLoaiTranh, gopMoTaPhapLy } from '../lib/describe-legal-head.mjs';

test('anchorTenBieuThue: tên dòng 8 số thay tên khách khi khách gọi khác ngôn ngữ biểu thuế', () => {
  const a = anchorTenBieuThue({
    tenHangKhach: 'laptop Dell văn phòng',
    breadcrumb: { selfVi: 'Máy tính xách tay kể cả notebook và subnotebook', headingVi: 'Máy xử lý dữ liệu tự động' },
  });
  assert.equal(a, 'Máy tính xách tay kể cả notebook và subnotebook');
});

test('anchorTenBieuThue: tên khách đã đúng tinh thần biểu thuế → giữ nguyên (không nhân đôi)', () => {
  const a = anchorTenBieuThue({
    tenHangKhach: 'Máy tính xách tay Dell Latitude',
    breadcrumb: { selfVi: 'Máy tính xách tay kể cả notebook và subnotebook' },
  });
  assert.equal(a, 'Máy tính xách tay Dell Latitude');
});

test('anchorTenBieuThue: dòng "Loại khác" → thay bằng scopeVi (phạm vi thật)', () => {
  const a = anchorTenBieuThue({
    tenHangKhach: 'Bàn làm việc gỗ',
    breadcrumb: { selfVi: 'Loại khác', scopeVi: 'Đồ gỗ khác: đồ dùng nội thất dùng trong phòng làm việc' },
  });
  assert.ok(a.includes('Đồ gỗ khác'));
  assert.ok(!a.startsWith('Loại khác'));
});

test('dungLoaiTranh: có mã cạnh tranh → sinh mệnh đề "không gồm"', () => {
  const cl = dungLoaiTranh({
    excludesVi: ['Bàn ghế quầy bar cao kiểu salon', 'Đồ gỗ dùng trong phòng bếp'],
  });
  assert.ok(cl.length >= 1);
  assert.ok(cl[0].startsWith('không gồm'));
});

test('dungLoaiTranh: không có loại trừ → mảng rỗng (không bịa)', () => {
  assert.deepEqual(dungLoaiTranh({ excludesVi: [] }), []);
});

test('gopMoTaPhapLy: thứ tự neo biểu thuế → nhận diện → thông số bắt buộc → loại trừ → xuất xứ; không vượt 200', () => {
  const r = gopMoTaPhapLy({
    neo: 'Máy bơm ly tâm trục ngang bằng gang',
    nhanDien: ['nhãn hiệu Pentax', 'model CM 10-40'],
    thongSoBatBuoc: ['công suất 0.75 kW'],
    loaiTranh: ['không gồm máy bơm dùng cho vòi xăng'],
    duoi: ['xuất xứ Ý', 'Mới 100%'],
  });
  assert.ok(r.text.length <= 200, `phải ≤ 200, được ${r.text.length}`);
  assert.ok(r.text.startsWith('Máy bơm ly tâm'));
  assert.ok(r.text.includes('0.75 kW'));
  assert.ok(r.text.endsWith('Mới 100%'), 'xuất xứ + tình trạng luôn cuối');
  assert.ok(r.dropped.includes('loaiTranh') || r.text.includes('không gồm'));
});

test('gopMoTaPhapLy: vượt 200 → hy sinh loaiTranh trước, giữ neo + thông số bắt buộc', () => {
  const r = gopMoTaPhapLy({
    neo: 'Đồ gỗ khác dùng trong phòng làm việc bằng gỗ thông',
    nhanDien: ['nhãn hiệu Hòa Phát', 'model BW-120'],
    thongSoBatBuoc: [],
    loaiTranh: ['không gồm bàn quầy bar', 'không gồm đồ gỗ phòng bếp', 'không gồm ghế'],
    duoi: ['xuất xứ Việt Nam', 'Mới 100%'],
  });
  assert.ok(r.text.length <= 200);
  assert.ok(r.text.startsWith('Đồ gỗ khác'));
  assert.ok(r.text.endsWith('Mới 100%'));
});
