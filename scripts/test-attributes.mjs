#!/usr/bin/env node
// Test registry thuộc tính canonical (data/attributes.json + lib/attributes.js).
// Bảo vệ fix finding 9.3: chapterSpecificRequired dùng tên EN, hồ sơ attrs là field VN
// → missing[] chỉ chứa thuộc tính THẬT SỰ thiếu (không nhiễu tên EN luôn "thiếu").
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const { missingChapterAttrs, resolveCanonical, registry } = require('./lib/attributes.js');
const rulesData = require('./data/chapter-specific-rules.json').chapters;

let passed = 0;
let failed = 0;
function chk(name, cond, extra) {
  if (cond) { passed++; console.log('  PASS', name); }
  else { failed++; console.log('  FAIL', name, extra != null ? '→ ' + JSON.stringify(extra) : ''); }
}
const miss = (ch, attrs) => missingChapterAttrs(rulesData[ch].chapterSpecificRequired, attrs).map((m) => m.canonical);

// 0. Registry integrity: mọi field trong chapterSpecificRequired có entry canonical
const reg = registry();
const allReq = new Set();
for (const r of Object.values(rulesData)) (r.chapterSpecificRequired || []).forEach((f) => allReq.add(f));
for (const f of allReq) chk(`registry có entry cho "${f}"`, !!reg[resolveCanonical(f)], f);

// 1. Chương 84 (EN) — ĐỦ dữ kiện trong free-text → missing rỗng
chk('ch84 đủ (18V/500W/model) → rỗng',
  miss('84', { tenHang: 'Máy khoan Bosch GSB', specs: 'model GSB-18, 220V, 500W' }).length === 0);
// 2. Chương 84 — THIẾU → cả 3 vào missing
chk('ch84 thiếu → voltage+power+modelNumber',
  ['voltage', 'power', 'modelNumber'].every((k) => miss('84', { tenHang: 'Máy khoan' }).includes(k)));
// 3. Chương 85 (EN) — có điện áp+model, thiếu công suất
{
  const m = miss('85', { tenHang: 'Điện thoại model iPhone 15', specs: 'pin 3.85V' });
  chk('ch85 detect voltage+model, thiếu power', !m.includes('voltage') && !m.includes('modelNumber') && m.includes('power'), m);
}
// 4. Chương 42 (VN) — outerMaterial đủ qua chatLieu; thiếu khi không có chất liệu
chk('ch42 outerMaterial đủ (chatLieu=da bò)', !miss('42', { tenHang: 'Túi xách', chatLieu: 'da bò thật' }).includes('outerMaterial'));
chk('ch42 outerMaterial thiếu (không chất liệu)', miss('42', { tenHang: 'Túi xách' }).includes('outerMaterial'));
// 4b. Chống false-positive: chữ "đã" (bỏ dấu = "da") KHÔNG được nhận nhầm là vật liệu da.
chk('ch42 "đã qua sử dụng" KHÔNG bị nhận là da → vẫn thiếu outerMaterial',
  miss('42', { tenHang: 'Túi xách đã qua sử dụng' }).includes('outerMaterial'));
chk('ch42 "đã thuộc/đã bỏ" KHÔNG bị nhận là da → vẫn thiếu',
  miss('42', { tenHang: 'Lô hàng mẫu đã bỏ, quyền đã thuộc đối tác' }).includes('outerMaterial'));
// 4c. Vẫn dò được da THẬT trong free-text (có dấu) khi không có chatLieu structured.
chk('ch42 "da bò" trong tên hàng → detect outerMaterial (hết thiếu)',
  !miss('42', { tenHang: 'Túi xách da bò cao cấp' }).includes('outerMaterial'));
// 5. Chương 61 (VN) — % sợi + kiểu dệt
chk('ch61 đủ (95% cotton, dệt kim) → rỗng',
  miss('61', { tenHang: 'Áo thun nam dệt kim', chatLieu: '95% cotton 5% spandex' }).length === 0);
chk('ch61 thiếu → fiberContent+constructionType',
  ['fiberContent', 'constructionType'].every((k) => miss('61', { tenHang: 'Áo thun nam' }).includes(k)));
// 6. Chương 64 (VN) — mũ da + đế cao su
chk('ch64 đủ (mũ da, đế cao su) → rỗng',
  miss('64', { tenHang: 'Giày thể thao nam mũ da đế cao su' }).length === 0);
chk('ch64 chatLieu chung "da" KHÔNG đủ phân biệt mũ/đế',
  ['upperMaterial', 'soleMaterial'].every((k) => miss('64', { tenHang: 'Giày', chatLieu: 'da' }).includes(k)));
// 7. Structured attrs (ERP tương lai)
chk('structured attrs.voltage/power honored',
  miss('84', { tenHang: 'Thiết bị', voltage: '220V', power: '1000W', modelNumber: 'X1' }).length === 0);
// 8. labelVi tiếng Việt
{
  const out = missingChapterAttrs(rulesData['84'].chapterSpecificRequired, { tenHang: 'Máy khoan' });
  chk('missing[] hiển thị labelVi tiếng Việt', out.length === 3 && out.every((o) => o.labelVi && o.labelVi !== o.field), out.map((o) => o.labelVi));
}
// 9. Chương 28 hoá chất — không false-positive
chk('ch28 thiếu CAS → casNumber+purityPercent',
  ['casNumber', 'purityPercent'].every((k) => miss('28', { tenHang: 'Natri clorua', chatLieu: 'NaCl' }).includes(k)));
chk('ch28 có CAS+tinh khiết → rỗng',
  miss('28', { tenHang: 'Natri clorua', specs: 'CAS 7647-14-5, độ tinh khiết 99.5%' }).length === 0);

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
