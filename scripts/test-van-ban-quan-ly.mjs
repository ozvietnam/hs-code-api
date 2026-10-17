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

// --- Ca repro bug #328. Cột cs đổi theo biểu thuế (17/10/2026: 38249970 chỉ còn 15/2024/TT-BYT),
// nên không neo số lượng vào một mã: quét TOÀN biểu, mọi mã có ≥ 2 số hiệu phải trả đủ đuôi, không trùng.
const r = buildTaxLookup('38249970');
check(
  '38249970: vanBanQuanLy là mảng, có 15/2024/TT-BYT, không có số hiệu cắt cụt',
  Array.isArray(r.vanBanQuanLy)
    && r.vanBanQuanLy.includes('15/2024/TT-BYT')
    && !r.vanBanQuanLy.some((c) => /\/[NĐD]$/.test(c)),
  r.vanBanQuanLy,
);
const nhieuVanBan = Object.values(taxData).filter((row) => (String(row.cs || '').match(/\d+\/\d{4}\//g) || []).length >= 2);
let loiCatCut = 0;
let loiTrung = 0;
for (const row of nhieuVanBan) {
  const arr = vanBanQuanLyFromText(row.cs);
  if (arr.some((c) => /\/[NĐD]$/.test(c))) loiCatCut += 1;
  const seen = new Set();
  for (const c of arr) {
    const k = c.replace(/Đ/g, 'D');
    if (seen.has(k)) { loiTrung += 1; break; }
    seen.add(k);
  }
}
check(
  `toàn biểu: ${nhieuVanBan.length} mã có ≥ 2 số hiệu → 0 cắt cụt, 0 trùng`,
  nhieuVanBan.length > 100 && loiCatCut === 0 && loiTrung === 0,
  { loiCatCut, loiTrung },
);
const coDCP = nhieuVanBan.find((row) => /NĐ-CP/.test(row.cs));
if (coDCP) {
  const arr = vanBanQuanLyFromText(coDCP.cs);
  check(`${coDCP.hs}: giữ đủ đuôi NĐ-CP`, arr.some((c) => /\/NĐ-CP$/.test(c)), arr);
}

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