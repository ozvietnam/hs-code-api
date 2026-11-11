#!/usr/bin/env node
// scripts/dem-ca-test.mjs — Đếm SỐ CA TEST THẬT từ log `npm test` để cổng gộp không đọc nhầm "xanh" (OZV-272).
//
// Vì sao có tệp này (Phòng họp GĐ 11/11, OZV-271):
//   Cổng gộp của mọi giám đốc có lỗ: chạy lệnh kiểm trên worktree/kho chưa cài gói thì lệnh TRƯỢT
//   (`Cannot find module 'xlsx'`) hoặc bỏ sót test, nhưng người soát vẫn ghi "test xanh" lên PR.
//   Hai cái bẫy đã gặp thật ở repo này:
//     1) `NODE_ENV=production` trong môi trường agent ⇒ npm tự bật `omit=dev` ⇒ `npm ci` BỎ HẾT
//        devDependencies (`xlsx`, `pdf-parse`, `@electric-sql/pglite`) mà vẫn `exit 0`. Phải `npm ci --include=dev`.
//     2) `npm test` in `=== ALL TESTS PASSED ===` ở GIỮA chuỗi, còn ~24 bước test chạy sau đó.
//        Ai grep chuỗi đó để kết luận là đọc nhầm.
//
// Nguyên tắc: chỉ tin lệnh kiểm khi log có ĐỦ CẢ (a) số ca test đếm được và (b) `EXIT=0` của chính lần chạy đó.
// Công cụ này chỉ ĐỌC log (không chạy test, không ghi vào data/), nên chạy được trên log đã lưu.
//
// Dùng:
//   npm test > /tmp/log.txt 2>&1; echo "EXIT=$?" >> /tmp/log.txt
//   node scripts/dem-ca-test.mjs /tmp/log.txt
//   node scripts/dem-ca-test.mjs /tmp/log.txt --json
//
// Thoát 0 khi log ĐỦ bằng chứng xanh; thoát 1 khi thiếu/đỏ (dùng được làm cổng trong script khác).

import { readFileSync } from 'node:fs';

/** Dấu một ca test lẻ: `PASS ...` đầu dòng (kiểu cũ của repo) hoặc `✓ ...` (kiểu node:test / bộ ca có nhóm). */
const RE_CA_XANH = /^[ \t]*(?:PASS\b|✓)/;
/** Dấu một ca ĐỎ. Giữ hẹp, chỉ khớp đầu dòng để không ăn chữ "fail" trong câu mô tả. */
const RE_CA_DO = /^[ \t]*(?:FAIL\b|ĐỎ\b|✗|not ok\b)/;
/** Dòng tổng kết của từng script: `49/49 passed, 0 failed` · `10 passed, 0 failed` · `ℹ pass 7`. */
const RE_TONG_KET = /^[ \t]*(?:ℹ[ \t]*)?(?:(\d+)\/(\d+)[ \t]+(?:passed|pass)|(\d+)[ \t]+(?:passed|pass))\b(?:[^\n]*?(\d+)[ \t]+(?:failed|fail)\b)?/;
/** Lệnh trượt vì thiếu gói / thiếu tệp — bẫy số 1 ở trên. */
const RE_TRUOT = /\b(?:Cannot find module|MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND|command not found)\b/;

/**
 * Đọc log `npm test` và rút số ca thật.
 * @param {string} log nội dung log
 * @returns {{caXanh:number, caDo:number, tongKetSoCa:number, soDongTongKet:number, soCaDoTongKet:number,
 *            exit:number|null, truot:string[], dongDo:string[], nhanSomALLPASSED:boolean}}
 */
export function demCaTest(log) {
  const dong = String(log ?? '').split(/\r?\n/);
  let caXanh = 0;
  let caDo = 0;
  let tongKetSoCa = 0;
  let soDongTongKet = 0;
  let soCaDoTongKet = 0;
  let exit = null;
  let viTriNhanSom = -1;
  let viTriDongCuoi = -1;
  const truot = [];
  const dongDo = [];

  for (let i = 0; i < dong.length; i += 1) {
    const d = dong[i];

    // `EXIT=<n>` do người chạy ghi thêm vào cuối log. Lấy lần CUỐI để khỏi dính EXIT của lần chạy trước.
    // Dòng này KHÔNG tính là "dòng có nghĩa cuối" — nếu tính thì nhãn đặt đúng cuối chuỗi cũng bị cảnh báo oan.
    const mExit = d.match(/^[ \t]*EXIT=(-?\d+)[ \t]*$/);
    if (mExit) {
      exit = Number(mExit[1]);
      continue;
    }

    if (d.trim()) viTriDongCuoi = i;

    // Nhãn phải là NGUYÊN dòng. npm in lại toàn bộ chuỗi `test` ở đầu log (dòng `> node ... && echo '=== ALL
    // TESTS PASSED ===' && ...`), nếu khớp kiểu `includes` thì dòng banner đó bị tính thành nhãn → cảnh báo oan.
    if (d.trim() === '=== ALL TESTS PASSED ===') {
      viTriNhanSom = i;
      continue;
    }

    if (RE_TRUOT.test(d)) truot.push(d.trim().slice(0, 200));

    if (RE_CA_DO.test(d)) {
      caDo += 1;
      dongDo.push(d.trim().slice(0, 200));
      continue;
    }
    if (RE_CA_XANH.test(d)) {
      caXanh += 1;
      continue;
    }

    const mTong = d.match(RE_TONG_KET);
    if (mTong) {
      soDongTongKet += 1;
      // `49/49 passed` → lấy mẫu số (tổng ca); `10 passed` → lấy chính số đó.
      tongKetSoCa += Number(mTong[2] ?? mTong[3] ?? 0);
      if (mTong[4]) soCaDoTongKet += Number(mTong[4]);
    }
  }

  // Nhãn `=== ALL TESTS PASSED ===` chỉ đáng tin khi nó là dòng có nghĩa CUỐI CÙNG (trừ dòng EXIT=).
  const nhanSomALLPASSED = viTriNhanSom >= 0 && viTriNhanSom < viTriDongCuoi;

  return { caXanh, caDo, tongKetSoCa, soDongTongKet, soCaDoTongKet, exit, truot, dongDo, nhanSomALLPASSED };
}

/**
 * Chấm log: ĐỦ bằng chứng xanh hay chưa, kèm lý do đọc được bằng mắt.
 * @param {ReturnType<typeof demCaTest>} so
 * @returns {{xanh:boolean, lyDo:string[]}}
 */
export function chamLog(so) {
  const lyDo = [];
  if (so.exit === null) lyDo.push('log KHÔNG có dòng `EXIT=<n>` của chính lần chạy này — không biết lệnh kết thúc ra sao');
  else if (so.exit !== 0) lyDo.push(`lệnh kiểm thoát EXIT=${so.exit} (khác 0)`);
  if (so.caXanh === 0 && so.tongKetSoCa === 0) lyDo.push('không đếm được MỘT ca test nào — lệnh kiểm có thể đã trượt, không phải "xanh"');
  if (so.caDo > 0) lyDo.push(`có ${so.caDo} dòng ca ĐỎ`);
  if (so.soCaDoTongKet > 0) lyDo.push(`dòng tổng kết báo ${so.soCaDoTongKet} ca failed`);
  if (so.truot.length) lyDo.push(`có ${so.truot.length} dòng lệnh trượt vì thiếu gói/tệp (vd: ${so.truot[0]})`);
  return { xanh: lyDo.length === 0, lyDo };
}

/** Một dòng gọn để dán vào bình luận soát PR. */
export function dongDanPR(so) {
  return `ca xanh ${so.caXanh} (tổng kết ${so.tongKetSoCa} ca / ${so.soDongTongKet} bộ) · ca đỏ ${so.caDo} · EXIT=${so.exit ?? 'KHÔNG CÓ'}`;
}

function chinh(argv) {
  const args = argv.slice(2);
  const raJson = args.includes('--json');
  const tep = args.find((a) => !a.startsWith('--'));
  if (!tep) {
    console.error('Dùng: node scripts/dem-ca-test.mjs <tệp-log> [--json]');
    return 2;
  }
  let log;
  try {
    log = readFileSync(tep, 'utf8');
  } catch (e) {
    console.error(`ĐỎ: không đọc được log ${tep}: ${e.message}`);
    return 2;
  }

  const so = demCaTest(log);
  const { xanh, lyDo } = chamLog(so);

  if (raJson) {
    console.log(JSON.stringify({ ...so, xanh, lyDo }, null, 2));
  } else {
    console.log(`Số ca test đọc từ log: ${dongDanPR(so)}`);
    if (so.nhanSomALLPASSED) {
      console.log('CẢNH BÁO: `=== ALL TESTS PASSED ===` KHÔNG phải dòng cuối — còn bước test chạy sau nhãn này, đừng grep nhãn để kết luận.');
    }
    if (xanh) {
      console.log('XANH: log có đủ số ca test và EXIT=0.');
    } else {
      console.log('ĐỎ: chưa đủ bằng chứng xanh:');
      for (const l of lyDo) console.log(`  - ${l}`);
    }
  }
  return xanh ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(chinh(process.argv));
}
