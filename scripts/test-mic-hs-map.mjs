// data/mic-hs-map.json — precomputed hs6 → {hs4, dong8UngVien[], loai:'SIGNAL'}.
//
// Bước 12 (C-2) #307: tín hiệu HS người bán Made-in-China chỉ là TÍN HIỆU xếp hạng ứng viên,
// không bao giờ là bằng chứng chốt mã. Map tĩnh precompute dong8UngVien để runtime không
// phải quét toàn bộ taxData mỗi lượt.
//
// Khoá: hs6 (6 số — phân nhóm quốc tế). Đầu vào của người bán TQ là hs10 tuỳ ý (đuôi 8-10
// số do TQ tự đặt), nhưng chữ số thứ 7+ mang ý nghĩa quốc gia — không stable qua các cửa hàng;
// hs6 là khoá ổn định duy nhất và là đơn vị tính tự nhiên của cache.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const path = require('path');
const fs = require('fs');

const MAP_PATH = path.join(process.cwd(), 'data', 'mic-hs-map.json');
const { taxData } = require('../lib/data.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };

let map;
try {
  map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  check('map tồn tại, đọc được JSON', Boolean(map) && typeof map === 'object');
} catch (e) {
  check('map tồn tại, đọc được JSON', false, e.message);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(1);
}

// Khoá = hs6 (6 chữ số). Tất cả khoá phải hợp lệ.
const keys = Object.keys(map);
check('map có khoá (>=1 prefix hs6)', keys.length >= 1, `keys=${keys.length}`);
check('mọi khoá đúng 6 chữ số', keys.every((k) => /^\d{6}$/.test(k)), keys.filter((k) => !/^\d{6}$/.test(k)).slice(0, 5));
check('mọi khoá có hs6 trong tax.json (ít nhất 1 dòng lá bắt đầu bằng hs6)', keys.every((k) => Object.keys(taxData).some((t) => t.startsWith(k))), keys.filter((k) => !Object.keys(taxData).some((t) => t.startsWith(k))).slice(0, 5));

// Mỗi entry có shape yêu cầu.
const sample = Object.entries(map).slice(0, 5);
check('mỗi entry có hs4 4 số khớp hs6', sample.every(([k, v]) => v.hs4 === k.slice(0, 4)), sample);
check('mọi entry có dong8UngVien là mảng', keys.every((k) => Array.isArray(map[k].dong8UngVien)));
check('mọi entry có loai = "SIGNAL"', keys.every((k) => map[k].loai === 'SIGNAL'), Object.entries(map).filter(([, v]) => v.loai !== 'SIGNAL').slice(0, 3));

// dong8UngVien: mỗi phần tử 8 số, bắt đầu bằng hs6, có thật trong tax.json.
let badLeaf = null;
for (const k of keys) {
  for (const d of map[k].dong8UngVien) {
    if (!/^\d{8}$/.test(d) || !d.startsWith(k) || !taxData[d]) { badLeaf = `${k}→${d}`; break; }
  }
  if (badLeaf) break;
}
check('dong8UngVien hợp lệ: 8 số, cùng hs6, có trong tax.json', !badLeaf, badLeaf);

// dong8UngVien không vượt quá 12 dòng (giữ nguyên giới hạn cũ của micSignal cũ — maxDong).
const overCap = Object.entries(map).filter(([, v]) => v.dong8UngVien.length > 12);
check('dong8UngVien không vượt trần 12 dòng', overCap.length === 0, overCap.slice(0, 3));

// Số khoá phải tương ứng số prefix hs6 có lá; ≥50% các hs6 unique (sanity).
const uniqueHs6 = new Set(Object.keys(taxData).map((k) => k.slice(0, 6)));
check('số khoá map ≈ số hs6 unique có lá (>=80%)', keys.length >= uniqueHs6.size * 0.8, `map=${keys.length} hs6=${uniqueHs6.size}`);

// Không có key GIR nào — luật sắt: map chỉ chứa SIGNAL.
const noGirKeys = keys.every((k) => !/GIR/i.test(k) && !/basis/i.test(k));
const noGirValues = keys.every((k) => !/GIR/i.test(JSON.stringify(map[k])) && !/"basis"\s*:/.test(JSON.stringify(map[k])));
check('không khoá/giá trị nào chứa "GIR" hoặc "basis"', noGirKeys && noGirValues);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
