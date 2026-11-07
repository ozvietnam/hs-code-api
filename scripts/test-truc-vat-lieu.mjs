// Test trục vật liệu cổng 2 — #1102
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roiNhau, laCapVatLieuKhacKhoa, capVatLieuRoi } from '../lib/ho-so/truc-vat-lieu.js';

test('roiNhau: sắt/thép vs titan → rời', () => {
  assert.ok(roiNhau('sắt hoặc thép', 'titan'));
});

test('roiNhau: kim loại vs titan → KHÔNG rời (bao nhau)', () => {
  assert.ok(!roiNhau('kim loại', 'titan'));
});

test('roiNhau: carbon-graphit vs plastic → rời', () => {
  assert.ok(roiNhau('carbon và graphit', 'plastic'));
});

test('roiNhau: cùng giá trị → không rời', () => {
  assert.ok(!roiNhau('thép', 'thép'));
});

test('laCapVatLieuKhacKhoa: chatLieu vs vatLieuKhac → true', () => {
  assert.ok(laCapVatLieuKhacKhoa({ fact: 'chatLieu', op: 'LA', value: 'thép' }, { fact: 'vatLieuKhac', op: 'LA', value: 'titan' }));
});

test('laCapVatLieuKhacKhoa: cùng khoá → false', () => {
  assert.ok(!laCapVatLieuKhacKhoa({ fact: 'chatLieu', op: 'LA', value: 'a' }, { fact: 'chatLieu', op: 'LA', value: 'b' }));
});

test('capVatLieuRoi: 902129 sắt/thép vs titan → rời', () => {
  const r = capVatLieuRoi(
    { fact: 'chatLieu', op: 'LA', value: ['sắt', 'thép'] },
    { fact: 'vatLieuKhac', op: 'LA', value: 'titan' }
  );
  assert.equal(r, true);
});

test('capVatLieuRoi: cặp không phải vật liệu → null', () => {
  assert.equal(capVatLieuRoi(
    { fact: 'tenLoai', op: 'TEN_LOAI', value: 'bánh xe' },
    { fact: 'vatLieuKhac', op: 'LA', value: 'titan' }
  ), null);
});
