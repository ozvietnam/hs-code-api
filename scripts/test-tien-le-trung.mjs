// Test tra trùng TB-TCHQ — #1103
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doGiong, chuanHoa, timTrung } from '../lib/tien-le-trung-tim.js';

test('chuanHoa: bỏ dấu câu, thường hoá', () => {
  assert.equal(chuanHoa('Bơm nước, một tầng! (trục ngang)'), 'bơm nước một tầng trục ngang');
});

test('doGiong: câu giống → điểm cao', () => {
  const d = doGiong('khóa nhựa buộc chặt hai đầu rời', 'Khóa nhựa buộc chặt hai đầu rời điều chỉnh');
  assert.ok(d > 0.4, `điểm ${d} > 0.4`);
});

test('doGiong: câu khác → điểm thấp', () => {
  const d = doGiong('bơm nước ly tâm', 'khóa nhựa buộc dây đai');
  assert.ok(d < 0.2, `điểm ${d} < 0.2`);
});

test('timTrung: tìm đúng TB', () => {
  const data = { '39269099': [{ sourceType: 'TB-TCHQ', tbTchqNumber: '99/TB-TCHQ', year: '2024', productName: 'Khóa nhựa buộc chặt hai đầu rời' }] };
  const kq = timTrung('khóa nhựa buộc chặt', { precedentsData: data });
  assert.equal(kq.length, 1);
  assert.equal(kq[0].ma, '39269099');
});

test('timTrung: TB cũ gắn bieuCu', () => {
  const data = { '84814010': [{ sourceType: 'TB-TCHQ', tbTchqNumber: '123/TB-TCHQ', year: '2020', productName: 'van an toàn đồng' }] };
  const kq = timTrung('van an toàn đồng', { precedentsData: data });
  assert.equal(kq[0].bieuCu, true);
});

test('timTrung: bỏ non-TB-TCHQ', () => {
  const data = { '84814010': [{ sourceType: 'WCO_OP', productName: 'van an toàn đồng' }] };
  assert.equal(timTrung('van an toàn đồng', { precedentsData: data }).length, 0);
});

test('timTrung: bỏ mã ngoài biểu', () => {
  const data = { '99999999': [{ sourceType: 'TB-TCHQ', productName: 'van an toàn đồng' }] };
  assert.equal(timTrung('van an toàn đồng', { precedentsData: data, bieuThueMaDung: new Set(['84814010']) }).length, 0);
});

test('cờ HS_TRA_TIEN_LE_TRUNG mặc định TẮT', () => {
  delete process.env.HS_TRA_TIEN_LE_TRUNG;
  assert.ok(!process.env.HS_TRA_TIEN_LE_TRUNG);
});
