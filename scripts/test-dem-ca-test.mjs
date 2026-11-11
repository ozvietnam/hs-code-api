#!/usr/bin/env node
// scripts/test-dem-ca-test.mjs — Kiểm bộ đếm số ca test của cổng gộp (OZV-272).
// Mỗi ca dựng một log GIẢ rồi đòi bộ đếm kết luận đúng; không chạy npm test thật, không ghi data/.
import './test-isolate-data.mjs';

import { demCaTest, chamLog, dongDanPR } from './dem-ca-test.mjs';

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

// 1) Log bình thường: đếm cả `PASS` lẻ, `✓` lẻ và dòng tổng kết.
{
  const log = ['PASS a', 'PASS b', '  ✓ c', '', '3/3 passed, 0 failed', 'EXIT=0'].join('\n');
  const so = demCaTest(log);
  ca('đếm 3 ca lẻ', so.caXanh === 3);
  ca('đọc tổng kết 3 ca', so.tongKetSoCa === 3 && so.soDongTongKet === 1);
  ca('đọc EXIT=0', so.exit === 0);
  ca('chấm XANH', chamLog(so).xanh === true);
  ca('dòng dán PR có số ca + EXIT', /ca xanh 3\b/.test(dongDanPR(so)) && /EXIT=0/.test(dongDanPR(so)));
}

// 2) BẪY SỐ 1 (đã gặp thật): thiếu gói xlsx ⇒ lệnh trượt, KHÔNG được đọc thành xanh.
{
  const log = ["Error: Cannot find module 'xlsx'", '    at scripts/test-bieu-thue.mjs:13:14', 'EXIT=1'].join('\n');
  const so = demCaTest(log);
  ca('bẫy thiếu gói: 0 ca đếm được', so.caXanh === 0 && so.tongKetSoCa === 0);
  ca('bẫy thiếu gói: nhận ra dòng trượt', so.truot.length === 1);
  ca('bẫy thiếu gói: chấm ĐỎ', chamLog(so).xanh === false);
}

// 3) Log có số ca nhưng KHÔNG có EXIT= ⇒ vẫn ĐỎ (không biết lệnh kết thúc ra sao).
{
  const so = demCaTest(['PASS a', '1 passed, 0 failed'].join('\n'));
  ca('thiếu EXIT= ⇒ ĐỎ', chamLog(so).xanh === false && so.exit === null);
  ca('thiếu EXIT= ⇒ nói rõ lý do', chamLog(so).lyDo.some((l) => l.includes('EXIT')));
}

// 4) EXIT khác 0 ⇒ ĐỎ dù có nhiều ca xanh phía trước.
{
  const so = demCaTest(['PASS a', 'PASS b', '2/2 passed', 'EXIT=1'].join('\n'));
  ca('EXIT=1 ⇒ ĐỎ', chamLog(so).xanh === false && so.exit === 1);
}

// 5) BẪY SỐ 2 (đã gặp thật): nhãn `=== ALL TESTS PASSED ===` nằm GIỮA chuỗi, còn test chạy sau.
{
  const log = ['PASS a', '=== ALL TESTS PASSED ===', 'FAIL b sau nhãn', 'EXIT=1'].join('\n');
  const so = demCaTest(log);
  ca('bẫy nhãn sớm: nhận ra nhãn không phải dòng cuối', so.nhanSomALLPASSED === true);
  ca('bẫy nhãn sớm: đếm được ca đỏ sau nhãn', so.caDo === 1);
  ca('bẫy nhãn sớm: chấm ĐỎ', chamLog(so).xanh === false);
}

// 6b) BẪY THẬT đã gặp khi chạy: npm in lại NGUYÊN chuỗi `test` ở đầu log, trong đó có chữ nhãn.
//     Dòng banner đó KHÔNG được tính là nhãn, nếu không thì log nào cũng bị cảnh báo oan.
{
  const banner = "> node scripts/a.mjs && echo '=== ALL TESTS PASSED ===' && node scripts/b.mjs";
  const so = demCaTest([banner, 'PASS a', 'PASS b', '2/2 passed, 0 failed', '=== ALL TESTS PASSED ===', 'EXIT=0'].join('\n'));
  ca('banner npm không bị tính thành nhãn', so.nhanSomALLPASSED === false);
  ca('banner npm không bị đếm thành ca', so.caXanh === 2);
  ca('log thật kiểu npm vẫn XANH', chamLog(so).xanh === true);
}

// 6) Nhãn ở ĐÚNG cuối log (chỉ còn dòng EXIT=) thì không bị cảnh báo oan.
{
  const so = demCaTest(['PASS a', '1 passed, 0 failed', '=== ALL TESTS PASSED ===', 'EXIT=0'].join('\n'));
  ca('nhãn ở cuối: không cảnh báo oan', so.nhanSomALLPASSED === false);
  ca('nhãn ở cuối: vẫn XANH', chamLog(so).xanh === true);
}

// 7) Dòng tổng kết báo failed > 0 ⇒ ĐỎ dù EXIT=0 (bộ ca tự nuốt lỗi).
{
  const so = demCaTest(['5/7 passed, 2 failed', 'EXIT=0'].join('\n'));
  ca('tổng kết có failed ⇒ ĐỎ', chamLog(so).xanh === false && so.soCaDoTongKet === 2);
  ca('tổng kết 7 ca theo mẫu N/M', so.tongKetSoCa === 7);
}

// 8) Lấy EXIT= CUỐI CÙNG (log nối hai lần chạy thì không được tin lần cũ).
{
  const so = demCaTest(['PASS a', '1 passed', 'EXIT=0', 'PASS b', '1 passed', 'EXIT=1'].join('\n'));
  ca('lấy EXIT cuối cùng', so.exit === 1 && chamLog(so).xanh === false);
}

// 9) Chữ "fail"/"pass" trong câu mô tả không được đếm thành ca.
{
  const so = demCaTest(['PASS mã lạ → null an toàn (không fail cứng)', '1 passed, 0 failed', 'EXIT=0'].join('\n'));
  ca('không đếm chữ fail giữa câu thành ca đỏ', so.caDo === 0 && so.caXanh === 1);
}

// 10) Định dạng `node:test` THẬT (soát khác model bắt được, 11/11). Dán nguyên văn từ `node <tệp>.mjs`:
//     dấu ca là `✔`/`✖` (U+2714/U+2716, KHÁC `✓`/`✗`), và tổng kết để CHỮ TRƯỚC SỐ (`ℹ tests 2`).
{
  const log = [
    '✔ xanh (1.238155ms)',
    '✖ do (0.352967ms)',
    'ℹ tests 2',
    'ℹ suites 0',
    'ℹ pass 1',
    'ℹ fail 1',
    'ℹ cancelled 0',
    'ℹ skipped 0',
    'ℹ todo 0',
    'ℹ duration_ms 13.570823',
    'EXIT=1',
  ].join('\n');
  const so = demCaTest(log);
  ca('node:test: đếm dấu ✔ thành ca xanh', so.caXanh === 1);
  ca('node:test: đếm dấu ✖ thành ca đỏ', so.caDo === 1);
  ca('node:test: đọc `ℹ tests 2` thành 2 ca', so.tongKetSoCa === 2 && so.soDongTongKet === 1);
  ca('node:test: đọc `ℹ fail 1`', so.soCaDoTongKet === 1);
  ca('node:test: chấm ĐỎ', chamLog(so).xanh === false);
}

// 11) `node:test` toàn xanh: không được cộng đôi (`ℹ tests 5` + `ℹ pass 5` = 5, không phải 10).
{
  const log = ['✔ a', '✔ b', 'ℹ tests 5', 'ℹ pass 5', 'ℹ fail 0', 'ℹ duration_ms 15.2', 'EXIT=0'].join('\n');
  const so = demCaTest(log);
  ca('node:test xanh: tổng 5 ca, không cộng đôi', so.tongKetSoCa === 5 && so.soDongTongKet === 1);
  ca('node:test xanh: `ℹ duration_ms` không bị tính thành ca', so.caXanh === 2 && so.caDo === 0);
  ca('node:test xanh: chấm XANH', chamLog(so).xanh === true);
}

console.log(`\n${xanh} passed, ${do_} failed`);
if (do_ > 0) process.exit(1);
