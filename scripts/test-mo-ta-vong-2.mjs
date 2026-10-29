import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boTruongThieuVaoMoTa, gopVong2 } from '../lib/describe-missing-inline.mjs';

test('boTruongThieuVaoMoTa: trường bắt buộc thiếu → ghi "(thiếu: CPU, RAM)" trong mô tả', () => {
  const r = boTruongThieuVaoMoTa({
    text: 'Máy tính xách tay kể cả notebook; model Latitude 5420; xuất xứ Trung Quốc; Mới 100%',
    missingRequired: [{ key: 'cpuModel', labelVi: 'CPU' }, { key: 'ramCapacity', labelVi: 'RAM' }],
    gioiHan: 200,
  });
  assert.ok(r.text.includes('(thiếu: CPU, RAM)'), r.text);
  assert.ok(r.text.length <= 200);
  assert.ok(r.text.endsWith('Mới 100%'), 'đuôi không đổi');
});

test('boTruongThieuVaoMoTa: không thiếu → text nguyên vẹn', () => {
  const t = 'Máy bơm ly tâm; công suất 0.75 kW; xuất xứ Ý; Mới 100%';
  const r = boTruongThieuVaoMoTa({ text: t, missingRequired: [], gioiHan: 200 });
  assert.equal(r.text, t);
});

test('boTruongThieuVaoMoTa: vượt 200 → nén nhãn thiếu (CPU,RAM không cắt giữa)', () => {
  const dai = 'Đồ nội thất khác và các bộ phận của chúng bằng gỗ thông ghép sẵn; không gồm tủ hút hơi độc; xuất xứ Việt Nam; Mới 100%';
  const r = boTruongThieuVaoMoTa({ text: dai, missingRequired: [{ key: 'a', labelVi: 'kiểu dáng' }, { key: 'b', labelVi: 'kích thước' }, { key: 'c', labelVi: 'màu' }], gioiHan: 200 });
  assert.ok(r.text.length <= 200);
  assert.ok(r.text.includes('thiếu:'));
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
