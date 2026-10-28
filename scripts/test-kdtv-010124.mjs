// lib/kdtv-010124.js — soát KDTV theo BẢNG TỪNG DÒNG của TT 01/2024/TT-BNNPTNT Phụ lục I (#494).
//
// Ca thật 26/10: cột cs biểu thuế ghi "Kiểm dịch thực vật (01/2024/TT-BNNPTNT M9)" cho 20083090
// (vỏ cam tẩm ướp) theo cả nhóm 20.08 — nhưng bảng Mục 9 của chính TT 01/2024 liệt kê TỪNG DÒNG
// (2008.11, .40, .50, .60, .70, .80, .91, .93, .97, .99) và KHÔNG có 2008.30. Khách đọc đúng
// văn bản gốc; hệ gắn KDTV sai chiều (issue #494).
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { kdtvSoatBang } = require('../lib/kdtv-010124.js');
const { buildTaxLookup } = require('../lib/tax-lookup.js');

let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };

const CS_20083090 = 'Hàng hóa được nhập khẩu dưới hình thức mua bán, trao đổi của cư dân biên giới (42/2019/TT-BCT & 34/2025/TT-BCT ); Kiểm dịch thực vật (01/2024/TT-BNNPTNT M9)';
const CS_08140000 = 'Hàng hóa được nhập khẩu dưới hình thức mua bán, trao đổi của cư dân biên giới (42/2019/TT-BCT & 34/2025/TT-BCT ); DM HH mua bán, trao đổi qua cửa khẩu phụ, lối mở biên giới của thương nhân (42/2019/TT-BCT, 33/2025/TT-BCT); Kiểm dịch thực vật (01/2024/TT-BNNPTNT M9); Dược liệu làm thuốc XK, NK (09/2024/TT-BYT-DM11)';

// ── 1. Tầng soát bảng (kdtvSoatBang) ──
const sua30 = kdtvSoatBang('20083090', CS_20083090);
check('20083090: bị bảng loại (thuocDien=false)', sua30?.thuocDien === false);
check('20083090: loại là kiểm dịch thực vật', sua30?.loai === 'KIEM_DICH_THUC_VAT');
check('20083090: liệt kê các dòng con của nhóm 2008', Array.isArray(sua30?.nhomConLietKe) && ['200811', '200840', '200850', '200899'].every((g) => sua30.nhomConLietKe.includes(g)));
check('20083090: các dòng con KHÔNG có 200830', sua30?.nhomConLietKe && !sua30.nhomConLietKe.includes('200830'));
check('20083090: lý do nhắc căn cứ TT 01/2024 liệt kê từng dòng', /01\/2024\/TT-BNNPTNT/.test(sua30?.lyDoVi || '') && /liệt kê từng dòng|từng dòng/i.test(sua30?.lyDoVi || ''));

// 2008.20 (dứa) cùng bị loại như 2008.30 — 2 mã 8 số, đã xác minh PDF
const sua20 = kdtvSoatBang('20082010', 'Kiểm dịch thực vật (01/2024/TT-BNNPTNT M9)');
check('20082010 (dứa): bị bảng loại — đã xác minh PDF', sua20?.thuocDien === false);

// 2008.19: CSV không liệt kê nhưng PDF còn nhắc tới (trong mô tả dòng khác) → KHÔNG tắt (sai an toàn)
check('20081990: CSV thiếu nhưng chưa xác minh PDF vắng → KHÔNG tắt', kdtvSoatBang('20081990', 'Kiểm dịch thực vật (01/2024/TT-BNNPTNT M9)') === null);

// 0203.12 thịt lợn: CSV bị gộp dòng làm mất mã, PDF có thật → KHÔNG BAO GIỜ tắt (giữ KDTV động vật)
check('02031200 (thịt lợn tươi cắt mảnh): CSV gộp dòng, PDF có → KHÔNG tắt', kdtvSoatBang('02031200', 'Kiểm dịch động vật (01/2024/TT-BNNPTNT M1)') === null);

// ── 2. Mã bảng có liệt kê → KHÔNG sửa (null) ──
check('08140000 (vỏ cam, bảng ghi đúng 8 số) → không sửa', kdtvSoatBang('08140000', CS_08140000) === null);
check('20081110 (lạc rang, bảng liệt kê 2008.11) → không sửa', kdtvSoatBang('20081110', 'Kiểm dịch thực vật (01/2024/TT-BNNPTNT M9)') === null);
check('cs không dẫn 01/2024 → không sửa (không căn cứ đối chiếu)', kdtvSoatBang('20083090', 'Kiểm dịch thực vật (11/2021/TT-BNNPTNT)') === null);
check('cs không nhắc kiểm dịch → không sửa', kdtvSoatBang('20083090', 'Giấy phép nhập khẩu (41/2018/TT-BCT)') === null);

// ── 3. Tích hợp buildTaxLookup — 20083090 hết KDTV ──
const r30 = buildTaxLookup('20083090', {});
check('20083090: requiresQuarantine tắt', r30.warnings?.requiresQuarantine === false);
check('20083090: kèm khối kdtvSoatBang dẫn chứng', r30.warnings?.kdtvSoatBang?.thuocDien === false);
const proc30 = (r30.policyProcedures || []).map((p) => p.code);
check('20083090: policyProcedures KHÔNG còn kiem-dich-thuc-vat', !proc30.includes('kiem-dich-thuc-vat'), JSON.stringify(proc30));
const csLine30 = (r30.policyLines || []).find((l) => /Kiểm dịch thực vật \(01\/2024\/TT-BNNPTNT M9\)/.test(l.text));
check('20083090: dòng cs kiểm dịch hạ xuống INFO kèm lý do', csLine30?.level === 'INFO' && /2008/.test(csLine30?.reasonVi || ''));
const lsLine30 = (r30.policyLines || []).filter((l) => l.source === 'oz-wiki-plhq' && /kiểm dịch/.test(l.text));
check('20083090: dòng listing kiểm dịch không còn "Có thể" BLOCKING/NOTICE sai chiều', lsLine30.every((l) => l.level === 'INFO'));
// Không đụng nghĩa vụ khác: ATTP 28/2026/TT-BCT khớp 8 số vẫn BLOCKING
const attp30 = (r30.policyLines || []).find((l) => l.text.includes('28/2026/TT-BCT'));
check('20083090: ATTP BCT (khớp 8 số) vẫn BLOCKING', attp30?.level === 'BLOCKING');

// ── 4. Tích hợp — 08140000 giữ nguyên KDTV ──
const r08 = buildTaxLookup('08140000', {});
check('08140000: requiresQuarantine giữ true', r08.warnings?.requiresQuarantine === true);
check('08140000: không có khối sửa kdtvSoatBang', r08.warnings?.kdtvSoatBang === undefined);
const proc08 = (r08.policyProcedures || []).map((p) => p.code);
check('08140000: policyProcedures vẫn có kiem-dich-thuc-vat', proc08.includes('kiem-dich-thuc-vat'));
const kdtv08 = (r08.policyLines || []).find((l) => /kiểm dịch thực vật/.test(l.text) && l.level === 'BLOCKING');
check('08140000: dòng KDTV bảng danh mục vẫn BLOCKING', Boolean(kdtv08));

// ── 5. Mã không liên quan không đổi ──
const rMayBom = buildTaxLookup('84137090', {});
check('84137090: không sinh kdtvSoatBang', rMayBom.warnings?.kdtvSoatBang === undefined);

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
