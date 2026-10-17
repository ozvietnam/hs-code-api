// Test mức chính sách (lib/policy-levels.js) — CEO 05/10/2026: dòng cư dân biên giới không
// được bật cờ; thủ tục thật (hợp quy, kiểm dịch, giấy phép) phải bật.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { classifyPolicy, levelOfLine } = require('../lib/policy-levels');
const { mapTaxLookup } = require('../lib/tax-mapper');
const tax = require('../data/tax.json');

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};
const lv = (t) => levelOfLine(t).level;

check('cư dân biên giới → INFO', lv('Hàng hóa được nhập khẩu dưới hình thức mua bán, trao đổi của cư dân biên giới (42/2019/TT-BCT & 34/2025/TT-BCT )') === 'INFO');
check('cắt giảm KTCN → INFO', lv('DM mặt hàng đã được cắt giảm kiểm tra chuyên ngành (765/QĐ-BCT ngày 29/03/2019)') === 'INFO');
check('không phải KTNN → INFO', lv('SPHH không phải KTNN về CL khi NK (01/2021/TT-BLĐTBXH)') === 'INFO');
check('phải/không phải KTNN → không coi là miễn', lv('SPHH phải/không phải KTNN về CL khi NK (01/2021/TT-BLĐTBXH)') !== 'INFO');
check('chỉ XK → INFO', lv('Cấm XK gỗ tròn, gỗ xẻ từ gỗ rừng tự nhiên trong nước (01/2024/TT-BNNPTNT M20)') === 'INFO');
check('XK + NK → không phải INFO', lv('Thuốc độc, NL độc làm thuốc XK, NK (09/2024/TT-BYT-DM1)') === 'BLOCKING');
check('hàng QSD → NOTICE', lv('Hàng tiêu dùng QSD cấp NK (08/2023/TT-BCT - PL1.I)') === 'NOTICE');
check('TNTX → NOTICE', lv('HH tạm ngừng KD TNTX CK (08/2023/TT-BCT - PL2)') === 'NOTICE');
check('cửa khẩu phụ → NOTICE', lv('DM HH mua bán, trao đổi qua cửa khẩu phụ, lối mở biên giới của thương nhân (42/2019/TT-BCT, 33/2025/TT-BCT)') === 'NOTICE');
check('chống bán phá giá → NOTICE', lv('Áp thuế CBPG Thép mạ (CN, KR) (2310/QĐ-BCT-2025)') === 'NOTICE');
check('hợp quy → BLOCKING', lv('SPHH lĩnh vực CNTT và VT bắt buộc phải chứng nhận hợp quy và công bố hợp quy (29/2025/TT-BKHCN-PL1)') === 'BLOCKING');
check('kiểm dịch → BLOCKING', lv('Kiểm dịch thực vật (01/2024/TT-BNNPTNT M9)') === 'BLOCKING');
check('nhóm 2 BKHCN → BLOCKING', lv('Hàng hóa nhóm 2 (2711/QĐ-BKHCN 2022)') === 'BLOCKING');
check('dòng lạ → NOTICE (sai an toàn)', lv('Dòng chính sách chưa có luật (00/0000/TT-XYZ)') === 'NOTICE');

const c = classifyPolicy('HH tạm ngừng KD TNTX CK (08/2023/TT-BCT - PL2); Hàng tiêu dùng QSD cấp NK (08/2023/TT-BCT - PL1.I)', {});
check('chỉ NOTICE → không bật cờ', c.policyLevel === 'NOTICE' && c.hasActionablePolicy === false);
check('cờ kiểm dịch do AI bóc (không căn cứ) KHÔNG tự nâng BLOCKING', classifyPolicy('', { requiresQuarantine: true }).hasActionablePolicy === false);
check('cờ từ bảng danh mục (listingDerived) nâng BLOCKING', classifyPolicy('', { requiresQuarantine: true, listingDerived: ['LISTING_KIEM_DICH_THUC_VAT'] }).hasActionablePolicy === true);
check('cs rỗng → NONE', classifyPolicy(null, null).policyLevel === 'NONE');

const sock = mapTaxLookup('85366932');
check('/api/tax 85366932: INFO, không bật cờ, giữ hasPolicyWarning cũ', sock.policyLevel === 'INFO' && sock.hasActionablePolicy === false && sock.hasPolicyWarning === true && sock.policyLines.every((l) => l.level === 'INFO'));

// Bảng danh mục oz-wiki (hsListings) → mức + cờ (05/10/2026: 8536.69.99 có trong 36/2026 mà không bật cờ)
const { listingLines } = require('../lib/policy-levels');
const L = (o) => ({ soHieu: '36/2026/TT-BKHCN', active: true, match: { level: 'HS8', code: '85366999' }, loaiTacDong: 'CONG_BO_HOP_QUY', mucRuiRo: 'TRUNG_BINH', ...o });
const c1 = classifyPolicy('Hàng hóa … cư dân biên giới (42/2019/TT-BCT & 34/2025/TT-BCT )', {}, [L({})]);
check('danh mục khớp 8 số: công bố hợp quy → BLOCKING, bật cờ', c1.policyLevel === 'BLOCKING' && c1.hasActionablePolicy && c1.policyLines[0].text.includes('Phải công bố hợp quy (rủi ro trung bình) — 36/2026/TT-BKHCN'), JSON.stringify(c1.policyLines[0]));
check('danh mục khớp theo nhóm 4/6 số → chỉ Lưu ý', classifyPolicy('', {}, [L({ match: { level: 'HS4', code: '8536' } })]).policyLevel === 'NOTICE');
check('danh mục hết hiệu lực → bỏ', classifyPolicy('', {}, [L({ active: false })]).policyLines.length === 0);
check('cấm nhập chỉ hàng đã qua sử dụng → Lưu ý', classifyPolicy('', {}, [L({ loaiTacDong: 'CAM_NHAP_KHAU', dieuKien: 'Chỉ cấm hàng ĐÃ QUA SỬ DỤNG' })]).policyLevel === 'NOTICE');
check('cắt giảm kiểm tra → Thông tin', classifyPolicy('', {}, [L({ loaiTacDong: 'CAT_GIAM_KIEM_TRA' })]).policyLevel === 'INFO');
check('trùng văn bản+thủ tục: bỏ dòng khớp nhóm khi đã khớp 8 số', listingLines([L({}), L({ match: { level: 'HS6', code: '853669' } })]).length === 1);
check('cờ: hợp quy → requiresInspection', listingLines([L({})])[0].flag === 'requiresInspection');
const s99 = mapTaxLookup('85366999');
check('/api/tax 85366999: BLOCKING + requiresInspection (từ danh mục 36/2026)', s99.policyLevel === 'BLOCKING' && s99.hasActionablePolicy && s99.warnings?.requiresInspection === true, JSON.stringify([s99.policyLevel, s99.warnings?.requiresInspection]));

const g = mapTaxLookup('25041000');
check('cờ AI không căn cứ (than chì, tiêu chuẩn XK) bị gỡ, ghi flagsWithoutBasis', g.hasActionablePolicy === false && g.warnings?.requiresInspection === false && (g.warnings?.flagsWithoutBasis || []).includes('requiresInspection'), JSON.stringify([g.policyLevel, g.warnings?.flagsWithoutBasis]));
check('dòng cs lặp nguyên văn chỉ giữ một', classifyPolicy('Mỹ phẩm XK, NK (09/2024/TT-BYT-DM14); Mỹ phẩm XK, NK (09/2024/TT-BYT-DM14)*', {}).policyLines.length === 1);

// Dòng mới từ biểu thuế 2026.04.05 (cột cs cập nhật 17/10/2026)
check('TNKS PL1 NĐ 181/2025 → INFO (thuế GTGT, không phải thủ tục)', levelOfLine('TNKS khai thác chưa chế biến thành SP khác (181/2025/NĐ-CP PL1)').rule === 'VAT_RESOURCE_LIST');
check('TNKS PL2 NĐ 181/2025 → INFO', levelOfLine('TNKS khai thác đã chế biến thành SP khác (181/2025/NĐ-CP PL2)').level === 'INFO');
check('khoáng sản làm VLXD 04/2021/TT-BXD → INFO (xuất khẩu)', levelOfLine('Khoáng sản làm VLXD (04/2021/TT-BXD)').rule === 'EXPORT_MINERAL_LIST');
check('DM khoáng sản XK 45/2023/TT-BCT (có chữ NK) → INFO, không BLOCKING', levelOfLine('DM chủng loại và tiêu chuẩn khoáng sản XK có nguồn gốc trong nước/NK (45/2023/TT-BCT-PL1/PL2)').level === 'INFO');
check('khai báo HC NK qua CTT 1CQG → BLOCKING', levelOfLine('Khai báo HC NK trước khi TQ qua CTT 1CQG (Đ6-NĐ26)').rule === 'CHEMICAL_DECLARATION');
check('HC cấm ĐTKD → BLOCKING', levelOfLine('HC cấm ĐTKD theo QĐ của Luật Đầu tư (Đ5.5 NĐ26)').rule === 'CHEMICAL_BANNED');

// Toàn biểu thuế: dòng nào cũng có mức; số dòng chưa phân loại phải nhỏ (rà luật khi tăng).
let total = 0;
let unclassified = 0;
for (const r of Object.values(tax)) {
  for (const l of classifyPolicy(r.cs, null).policyLines) {
    total += 1;
    if (l.rule === 'UNCLASSIFIED') unclassified += 1;
  }
}
check(`toàn biểu thuế: chưa phân loại ${unclassified}/${total} < 1%`, total > 10000 && unclassified / total < 0.01);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
