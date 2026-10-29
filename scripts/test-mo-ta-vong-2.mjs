import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boTruongThieuVaoMoTa, gopVong2, nhanTruongThieu, doanThieu } from '../lib/describe-missing-inline.mjs';

test('boTruongThieuVaoMoTa: trường bắt buộc thiếu → "(thiếu: CPU, RAM)" ngay trước tình trạng, dấu phẩy ngăn', () => {
  const r = boTruongThieuVaoMoTa({
    text: 'Máy tính xách tay, model: Latitude 5420, Mới 100%',
    missingRequired: [{ key: 'cpuModel', labelVi: 'CPU' }, { key: 'ramCapacity', labelVi: 'RAM' }],
    gioiHan: 200,
  });
  assert.equal(r.text, 'Máy tính xách tay, model: Latitude 5420 (thiếu: CPU, RAM), Mới 100%');
  assert.ok(!r.text.includes(';') && !r.text.includes('xuất xứ'));
});

test('boTruongThieuVaoMoTa: không thiếu → text nguyên vẹn', () => {
  const t = 'Máy bơm ly tâm, CS 0.75 kW, Mới 100%';
  const r = boTruongThieuVaoMoTa({ text: t, missingRequired: [], gioiHan: 200 });
  assert.equal(r.text, t);
});

test('boTruongThieuVaoMoTa: vượt 200 → nén nhãn/bỏ cụm cuối, giữ tên hàng đầu + tình trạng cuối', () => {
  const dai = `Đồ nội thất bằng gỗ thông ghép, ${'chi tiết phụ dài, '.repeat(9)}Mới 100%`;
  const r = boTruongThieuVaoMoTa({ text: dai, missingRequired: [{ key: 'a', labelVi: 'kiểu dáng' }, { key: 'b', labelVi: 'kích thước' }, { key: 'c', labelVi: 'màu' }], gioiHan: 200 });
  assert.ok(r.text.length <= 200, String(r.text.length));
  assert.ok(r.text.startsWith('Đồ nội thất bằng gỗ thông ghép'));
  assert.ok(r.text.includes('thiếu:') && r.text.endsWith(', Mới 100%'), r.text);
});

test('nhanTruongThieu: nhãn TIẾNG VIỆT từ chapter-declaration-fields (không lộ khoá cpuModel/ramCapacity)', () => {
  const r = nhanTruongThieu(['chapterSpecific.cpuModel', 'chapterSpecific.ramCapacity', 'chapterSpecific.storageCapacity', 'xuatXu']);
  assert.deepEqual(r.map((x) => x.labelVi), ['CPU', 'RAM', 'bộ nhớ/ổ cứng']);
  assert.equal(doanThieu(r), '(thiếu: CPU, RAM, bộ nhớ/ổ cứng)');
  assert.ok(!/cpuModel|ramCapacity|storageCapacity/.test(doanThieu(r)));
});

test('nhanTruongThieu: trường có ô riêng trên ECUS (xuất xứ, đơn vị tính) không ghi vào mô tả', () => {
  assert.deepEqual(nhanTruongThieu(['xuatXu', 'donViTinh']), []);
});

test('gopVong2: fact tự tìm được (web/attribute) chèn vào chapterSpecific, còn thiếu mới mở ngoặc', () => {
  const r = gopVong2({
    missingRequired: [{ key: 'cpuModel', labelVi: 'CPU' }, { key: 'ramCapacity', labelVi: 'RAM' }],
    factTimDuoc: { cpuModel: 'Core i5-1135G7' },
  });
  assert.deepEqual(r.daBoSung, ['cpuModel']);
  assert.deepEqual(r.conThieu.map((m) => m.key), ['ramCapacity']);
});

test('gopVong2: không tìm được gì → mọi trường đều còn thiếu', () => {
  const r = gopVong2({ missingRequired: [{ key: 'cpuModel', labelVi: 'CPU' }], factTimDuoc: {} });
  assert.deepEqual(r.conThieu.map((m) => m.key), ['cpuModel']);
});
