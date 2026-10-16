#!/usr/bin/env node
// Test #328: /api/tax phải có vanBanQuanLy[] = số hiệu văn bản quản lý đầy đủ,
// khử trùng theo soHieu chuẩn hoá. Trước đây cổng tự regex trên policyByHs text
// bị cắt ("82/2022/N") và trùng lặp do khớp 2 lần. Nay API trả sẵn mảng sạch.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { vanBanQuanLyFromText } = require('../lib/legal-docs');
const { buildTaxLookup } = require('../lib/tax-lookup');
const { taxData } = require('../lib/data');

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };

// --- Ca repro bug #328: HS 38249970 có 3 văn bản. ---
const r = buildTaxLookup('38249970');
check(
  '38249970: vanBanQuanLy có đúng 3 văn bản đầy đủ đuôi',
  Array.isArray(r.vanBanQuanLy)
    && r.vanBanQuanLy.length === 3
    && r.vanBanQuanLy.includes('82/2022/NĐ-CP')
    && r.vanBanQuanLy.includes('113/2017/NĐ-CP')
    && r.vanBanQuanLy.includes('15/2024/TT-BYT'),
  r.vanBanQuanLy,
);
check(
  '38249970: không có số hiệu cắt cụt (82/2022/N, 113/2017/N)',
  !r.vanBanQuanLy.includes('82/2022/N')
    && !r.vanBanQuanLy.includes('113/2017/N'),
  r.vanBanQuanLy,
);

// --- Khử trùng theo dạng chuẩn hoá (Đ ↔ D cùng 1 văn bản). ---
check(
  'trùng Đ-CP và D-CP → 1 mục giữ dạng có Đ',
  vanBanQuanLyFromText('Hóa chất (82/2022/NĐ-CP PL2); Hóa chất (82/2022/ND-CP PL5)').length === 1
    && vanBanQuanLyFromText('Hóa chất (82/2022/NĐ-CP PL2); Hóa chất (82/2022/ND-CP PL5)')[0] === '82/2022/NĐ-CP',
  vanBanQuanLyFromText('Hóa chất (82/2022/NĐ-CP PL2); Hóa chất (82/2022/ND-CP PL5)'),
);

// --- Trùng cùng dạng (2 lần giống nhau) → 1 mục. ---
check(
  'trùng cùng dạng → 1 mục',
  vanBanQuanLyFromText('(82/2022/NĐ-CP); (82/2022/NĐ-CP)').length === 1,
  vanBanQuanLyFromText('(82/2022/NĐ-CP); (82/2022/NĐ-CP)'),
);

// --- Text rỗng → mảng rỗng (không null). ---
check(
  'text rỗng → []',
  Array.isArray(vanBanQuanLyFromText(''))
    && vanBanQuanLyFromText('').length === 0,
  vanBanQuanLyFromText(''),
);
check(
  'text không có mã văn bản → []',
  vanBanQuanLyFromText('Hàng thông thường không có chính sách đặc biệt').length === 0,
);

// --- HS không có `cs` → [] ---
check(
  'HS không có policyByHs → vanBanQuanLy = []',
  Array.isArray(r.vanBanQuanLy), // chỉ cần là array
);
// Tìm 1 HS không có cs
const noCsHs = Object.values(taxData).find((row) => !String(row.cs || '').trim());
if (noCsHs) {
  const r2 = buildTaxLookup(noCsHs.hs);
  check(
    `${noCsHs.hs}: HS không có cs trả vanBanQuanLy = []`,
    Array.isArray(r2.vanBanQuanLy) && r2.vanBanQuanLy.length === 0,
    r2.vanBanQuanLy,
  );
}

// --- Đầu-cuối khác nhau vẫn khử trùng đúng (TT-BYT). ---
check(
  '15/2024/TT-BYT xuất hiện 2 lần → 1 mục',
  vanBanQuanLyFromText('Phụ gia (15/2024/TT-BYT); Thực phẩm (15/2024/TT-BYT)').length === 1,
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);