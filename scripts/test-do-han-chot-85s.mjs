#!/usr/bin/env node
// scripts/test-do-han-chot-85s.mjs — Kiểm máy đo hạn chót 85 s + bộ ca đo (OZV-780).
// Chỉ kiểm phần THUẦN (đọc bộ ca, trung vị, p95, rút mã 8 số) — không gọi mạng, không ghi data/.
import './test-isolate-data.mjs';

import { readFileSync } from 'node:fs';

import { docBoCa, trungVi, p95, ma8So } from './do-han-chot-85s.mjs';

let xanh = 0;
let do_ = 0;

function ca(ten, dieuKien) {
  if (dieuKien) {
    xanh += 1;
    console.log(`PASS ${ten}`);
  } else {
    do_ += 1;
    console.log(`FAIL ${ten}`);
  }
}

// 1) Bộ ca đo: >= 20 ca, mỗi ca có id + cauKhach, id không trùng.
{
  const cases = docBoCa();
  ca('bộ ca có >= 20 ca', cases.length >= 20);
  ca('mọi ca có id + cauKhach', cases.every((c) => c.id && String(c.cauKhach || '').trim().length > 0));
  ca('id không trùng', new Set(cases.map((c) => c.id)).size === cases.length);
  const coThucDia = cases.filter((c) => c.nguon?.loai === 'THUC_DIA');
  const coTb = cases.filter((c) => c.nguon?.loai === 'TB-TCHQ');
  ca('có ca thực địa (khách hỏi thật)', coThucDia.length >= 6);
  ca('có ca TB-TCHQ kèm mã tham chiếu', coTb.length >= 10 && coTb.every((c) => /^\d{8}$/.test(String(c.maThamChieu))));
}

// 2) Luật riêng tư: bộ ca chỉ chứa TÊN HÀNG, không được lẫn số tờ khai/đơn giá/danh tính khách.
{
  // Chỉ soi PHẦN CA (câu khách + nguồn), không soi khối `moTa`/`luuY` — lời chú được phép nhắc tên các thứ bị cấm.
  const tho = JSON.stringify(JSON.parse(readFileSync(new URL('../tests/bo-ca-do-han-chot.json', import.meta.url), 'utf8')).cases);
  ca('không có từ "tờ khai"', !/tờ khai/i.test(tho));
  ca('không có số tờ khai 12 chữ số', !/\b\d{12}\b/.test(tho));
  ca('không có đơn giá/trị giá', !/(đơn giá|trị giá|invoice)/i.test(tho));
}

// 3) Trung vị: lẻ lấy giữa, chẵn lấy bình quân hai giữa, rỗng trả null.
{
  ca('trung vị lẻ', trungVi([3, 1, 2]) === 2);
  ca('trung vị chẵn', trungVi([4, 1, 2, 3]) === 2.5);
  ca('trung vị rỗng = null', trungVi([]) === null);
  ca('trung vị không sửa mảng gốc', (() => { const a = [3, 1, 2]; trungVi(a); return a[0] === 3; })());
}

// 4) p95 nearest-rank: n=22 ⇒ ca thứ 21; n=1 ⇒ chính nó; không vượt quá phần tử lớn nhất.
{
  const hai2 = Array.from({ length: 22 }, (_, i) => i + 1); // 1..22
  ca('p95 của 22 ca = ca thứ 21', p95(hai2) === 21);
  ca('p95 của 1 ca = chính nó', p95([7]) === 7);
  ca('p95 của 20 ca = ca thứ 19', p95(Array.from({ length: 20 }, (_, i) => i + 1)) === 19);
  ca('p95 không vượt max', p95([5, 1, 9]) <= 9);
  ca('p95 rỗng = null', p95([]) === null);
}

// 5) Rút mã 8 số (A1): chỉ nhận mã 8 số ở results/chốt, KHÔNG nhận gợi ý nhóm 4 số.
{
  ca('lấy mã 8 số ở results', ma8So({ results: [{ hsCode: '39264000' }] }) === '39264000');
  ca('lấy mã 8 số qua khoá ma', ma8So({ results: [{ ma: '8708.29.90' }] }) === '87082990');
  ca('bỏ qua nhóm 4 số', ma8So({ results: [{ hsCode: '3926' }] }) === null);
  ca('results rỗng = null', ma8So({ results: [], nextAction: { optionsHeadings: ['8708', '3926'] } }) === null);
  ca('không lấy optionsHeadings làm mã', ma8So({ nextAction: { optionsHeadings: ['87082990'] } }) === null);
  ca('lấy mã chốt ở thân', ma8So({ hsCode: '12081000' }) === '12081000');
  ca('thân rỗng = null', ma8So({}) === null && ma8So(null) === null);
  ca('ca đầu có mã 8 số thì lấy ca đó', ma8So({ results: [{ hsCode: '9405' }, { hsCode: '94052190' }] }) === '94052190');
}

console.log('');
console.log(`${do_} failed | ${xanh} passed`);
if (do_ > 0) process.exit(1);
console.log('=== ALL TESTS PASSED ===');
