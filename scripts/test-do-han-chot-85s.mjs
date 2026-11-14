#!/usr/bin/env node
// scripts/test-do-han-chot-85s.mjs — Kiểm máy đo hạn chót 85 s + bộ ca đo (OZV-780).
// Chỉ kiểm phần THUẦN (đọc bộ ca, trung vị, p95, rút mã 8 số) — không gọi mạng, không ghi data/.
import './test-isolate-data.mjs';

import { readFileSync } from 'node:fs';

import { docBoCa, trungVi, p95, ma8So, kiemTinCay } from './do-han-chot-85s.mjs';

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

  // HÌNH DẠNG THẬT của /api/classify (đo prod 14/11): trường tên là `hs`, kèm `hsLevel`.
  // Mọi ca trên đây dùng `hsCode` — một hình dạng KHÔNG tồn tại ở đường chạy thật — nên
  // test xanh mà bộ đo vẫn in "A1: 0" cho cả 22 ca. Giữ các ca thật dưới đây làm mỏ neo.
  ca(
    'THẬT: lấy mã 8 số ở results[].hs',
    ma8So({ status: 'OK', results: [{ hs: '84433190', hsLevel: 8, confidence: 85 }] }) === '84433190',
  );
  ca(
    'THẬT: hsLevel 6 (mã 6 số) không tính là ra mã',
    ma8So({ status: 'NEED_FACTS', results: [{ hs: '844331', hsLevel: 6, confidence: 85 }, { hs: '844332', hsLevel: 6 }] }) === null,
  );
  ca(
    'THẬT: bỏ qua ca 6 số, lấy ca 8 số phía sau',
    ma8So({ results: [{ hs: '844331', hsLevel: 6 }, { hs: '84433190', hsLevel: 8 }] }) === '84433190',
  );
}

// 6) Cổng tin cậy (OZV-780, vá lỗ hổng GĐ ghi 14/11): cổng cũ CHỈ bắt khi MỌI ca
//    dưới 5 giây. Nếu một PHẦN nhà cung cấp chết thì bảng vẫn in ra số đẹp mà
//    không ai thấy. Cổng mới phải bắt cả bốn dấu hiệu dưới đây.
{
  const ok = (giay, them = {}) => ({ id: `c${giay}`, giay, http: 200, trangThai: 'done', ma8So: '39264000', ...them });

  // 6a) Health nói thẳng là không có nhà cung cấp nào ⇒ chặn NGAY, không cần đoán theo giây.
  const thatLau = Array.from({ length: 22 }, (_, i) => ok(40 + i));
  const khongProvider = kiemTinCay(thatLau, { checks: { llm: { ok: false, order: [] } } });
  ca('health không có provider ⇒ chặn dù ca chạy lâu', khongProvider.hopLe === false);
  ca('lý do nêu đúng "không có nhà cung cấp"', /nhà cung cấp/i.test(khongProvider.lyDo.join(' ')));

  // 6b) Bản chạy đủ provider + ca chạy thật ⇒ số dùng được.
  const suc = { checks: { llm: { ok: true, order: ['minimax', 'deepseek'] } } };
  ca('đủ provider + ca chạy thật ⇒ hợp lệ', kiemTinCay(thatLau, suc).hopLe === true);

  // 6c) Cổng cũ: mọi ca dưới 5 giây.
  const nhanhHet = Array.from({ length: 22 }, () => ok(1.8, { ma8So: null, reasonCode: 'ENGINE_TIMEOUT' }));
  ca('mọi ca dưới 5 giây ⇒ chặn', kiemTinCay(nhanhHet, suc).hopLe === false);

  // 6d) LỖ HỔNG CŨ: một phần ca nhanh bất thường (nhà cung cấp chết giữa chừng).
  //     11/22 ca về trong 1.8 giây mà cổng cũ vẫn in bảng vì không phải "mọi ca".
  const motNua = [
    ...Array.from({ length: 11 }, (_, i) => ok(1.8 + i * 0.01, { ma8So: null, reasonCode: 'ENGINE_TIMEOUT' })),
    ...Array.from({ length: 11 }, (_, i) => ok(60 + i)),
  ];
  ca('một nửa ca nhanh bất thường ⇒ chặn (lỗ hổng cũ)', kiemTinCay(motNua, suc).hopLe === false);
  ca('lý do nêu số ca nhanh bất thường', /nhanh bất thường/i.test(kiemTinCay(motNua, suc).lyDo.join(' ')));

  // 6d-bis) Chốt ngưỡng 1/4 ở hai phía biên. Ngưỡng cột GIÂY cố tình gắt hơn cột
  //   lỗi (quá nửa): ca lỗi lác đác là chuyện thường, còn ca dưới 5 giây thì không
  //   có cách đọc lành nào — đó là bản chạy không gọi AI.
  const tron = (nhanh, tong = 22) => [
    ...Array.from({ length: nhanh }, (_, i) => ok(1.8 + i * 0.01, { ma8So: null, reasonCode: 'ENGINE_TIMEOUT' })),
    ...Array.from({ length: tong - nhanh }, (_, i) => ok(60 + i)),
  ];
  ca('đúng 1/4 ca nhanh (5/20) ⇒ chặn', kiemTinCay(tron(5, 20), suc).hopLe === false);
  ca('dưới 1/4 ca nhanh (4/20) ⇒ vẫn hợp lệ', kiemTinCay(tron(4, 20), suc).hopLe === true);

  // 6e) Dù chỉ MỘT ca trả LLM_NOT_CONFIGURED thì bản chạy đó đã thiếu khoá ⇒ chặn.
  const motCaThieuKhoa = [...Array.from({ length: 21 }, (_, i) => ok(50 + i)), ok(52, { reasonCode: 'LLM_NOT_CONFIGURED', ma8So: null })];
  ca('một ca LLM_NOT_CONFIGURED ⇒ chặn', kiemTinCay(motCaThieuKhoa, suc).hopLe === false);

  // 6f) Quá nửa số ca lỗi (A2) ⇒ bảng vô nghĩa, dù giây trông bình thường.
  const nhieuLoi = [
    ...Array.from({ length: 12 }, (_, i) => ok(40 + i, { loi: 'HTTP_503', ma8So: null })),
    ...Array.from({ length: 10 }, (_, i) => ok(50 + i)),
  ];
  ca('quá nửa ca lỗi ⇒ chặn', kiemTinCay(nhieuLoi, suc).hopLe === false);

  // 6g) MỎ NEO CHỐNG BÁO OAN — đây là bảng giây CÓ THẬT, đo prod 14/11/2026 trên
  //   22 ca của `tests/bo-ca-do-han-chot.json`. Lượt nhanh nhất 4,52 giây nhưng vẫn
  //   là lượt AI thật (`engine.rounds = 2`, providers `["gemini-free","gemini-free"]`).
  //   Bảng này chỉ có 2/22 ca dưới 5 giây (DƯỚI cổng 1/4 = 5,5), nên nó đi qua được
  //   ở CẢ ngưỡng 2000 lẫn 5000 ms — tự nó KHÔNG khoá được ngưỡng. Giữ ca này làm mỏ
  //   neo "bảng thật phải lọt"; việc khoá vùng biên là của ca `6g-bis` ngay dưới.
  const PROD_14_11 = [7.31, 4.97, 24.74, 25.63, 4.52, 6.97, 5.36, 5.46, 12.48, 6.89, 5.98,
    5.37, 13.9, 6.84, 6.52, 5.93, 12.91, 5.27, 12.46, 21.72, 13.44, 10.08];
  const bangThat = PROD_14_11.map((g) => ok(g));
  ca('bảng prod 14/11 có thật ⇒ KHÔNG bị chặn oan', kiemTinCay(bangThat, suc).hopLe === true);
  ca('bảng prod 14/11 không nêu lý do nào', kiemTinCay(bangThat, suc).lyDo.length === 0);

  // 6g-bis) KHOÁ VÙNG BIÊN 2000–5000 ms. Đây mới là ca chết nếu ai đó nâng
  //   `NGUONG_NGHI_KHONG_AI_MS` ngược về 5000: 8/22 ca nằm trong dải 2–5 giây
  //   (trên cổng 1/4 = 5,5 ca). Ở ngưỡng 2000 ms chúng là lượt AI thật rẻ tiền ⇒
  //   PHẢI lọt; ở ngưỡng 5000 ms chúng bị gom vào "không có AI" ⇒ chặn oan.
  //   Mốc 4,52 giây đo được trên prod là bằng chứng dải này có lượt thật.
  const biên = [
    ...Array.from({ length: 8 }, (_, i) => ok(2.5 + i * 0.3)),
    ...Array.from({ length: 14 }, (_, i) => ok(20 + i)),
  ];
  ca('8/22 ca trong dải 2–5 giây ⇒ vẫn hợp lệ (khoá ngưỡng 2000, không phải 5000)',
    kiemTinCay(biên, suc).hopLe === true);

  // 6g-ter) Phía kia của cùng cái biên: ca THẬT SỰ dưới 2 giây vẫn phải bị chặn,
  //   để việc hạ ngưỡng không biến cổng thành vô dụng.
  const duoiHaiGiay = [
    ...Array.from({ length: 6 }, (_, i) => ok(0.4 + i * 0.2, { ma8So: null, reasonCode: 'ENGINE_TIMEOUT' })),
    ...Array.from({ length: 16 }, (_, i) => ok(20 + i)),
  ];
  ca('6/22 ca dưới 2 giây ⇒ chặn', kiemTinCay(duoiHaiGiay, suc).hopLe === false);

  // 6g) Vài ca lỗi lẻ tẻ (3/22) là chuyện thường của lượt LLM thật ⇒ KHÔNG chặn,
  //     để cổng không báo oan làm người đo bỏ luôn số đúng.
  const loiLeTe = [
    ...Array.from({ length: 3 }, (_, i) => ok(40 + i, { loi: 'HTTP_503', ma8So: null })),
    ...Array.from({ length: 19 }, (_, i) => ok(50 + i)),
  ];
  ca('vài ca lỗi lẻ tẻ ⇒ vẫn hợp lệ', kiemTinCay(loiLeTe, suc).hopLe === true);

  // 6h) Không có ca nào chạy được (mạng hỏng) ⇒ chặn, đừng in bảng rỗng.
  ca('không ca nào có số giây ⇒ chặn', kiemTinCay([{ id: 'x', giay: null, loi: 'MANG_ECONNREFUSED' }], suc).hopLe === false);

  // 6i) Thiếu khối health (gọi /api/health hỏng) ⇒ chặn, không đoán bừa là có khoá.
  ca('thiếu khối health ⇒ chặn', kiemTinCay(thatLau, null).hopLe === false);
}

console.log('');
console.log(`${do_} failed | ${xanh} passed`);
if (do_ > 0) process.exit(1);
console.log('=== ALL TESTS PASSED ===');
