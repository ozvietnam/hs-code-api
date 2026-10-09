// Test cờ chính sách THEO TÊN (lib/policy-name-match.js + nameListings + nối /api/tax) — CEO 08/10/2026:
// "hàng có chính sách, dò theo tên gọi và chức năng chính mà không được gắn cờ để nhân viên kiểm tra lại?"
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { matchPolicyByName } = require('../lib/policy-name-match');
const { nameListings } = require('../lib/plhq-registry');
const { classifyPolicy } = require('../lib/policy-levels');
const { mapTaxLookup } = require('../lib/tax-mapper');
const { buildTaxLookup } = require('../lib/tax-lookup');
const { keywords, normalizeVi } = require('../lib/vi-tokens');

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};

// 1. Ca thật: 9004.90.10 tên dòng "Kính thuốc" → REVIEW theo 05/2022/TT-BYT, căn cứ ghi rõ.
const kt = matchPolicyByName({ hs: '90049010', tariffNameVi: '- - Kính thuốc' });
check('9004.90.10 "Kính thuốc" → REVIEW 05/2022/TT-BYT', kt.length === 1 && kt[0].level === 'REVIEW' && kt[0].soHieu === '05/2022/TT-BYT' && kt[0].source === 'name', JSON.stringify(kt));
check('căn cứ: "kính thuốc" khớp tên dòng biểu thuế', kt[0]?.canCu === '"kính thuốc" khớp tên dòng biểu thuế' && kt[0]?.nguon === '05/2022/TT-BYT Điều 6 mục 43');

// 2. Chương 70 "kính nổi" / "kính mắt" → KHÔNG (lọc chương).
check('7005 "kính nổi" chương 70 → không', matchPolicyByName({ hs: '70051010', tariffNameVi: 'Kính nổi', productNameVi: 'kính nổi trong' }).length === 0);
check('chương 70 dù tên hàng "kính mắt" → không (chapters của luật)', matchPolicyByName({ hs: '70051010', productNameVi: 'kính mắt' }).length === 0);

// 3. Tên hàng "kính lão" + hs 9004 → có; tên hàng ưu tiên hơn tên dòng biểu thuế trong căn cứ.
const kl = matchPolicyByName({ hs: '90049010', tariffNameVi: '- - Kính thuốc', productNameVi: 'Kính lão chống ánh sáng xanh' });
check('tên hàng "kính lão" + hs 9004 → có, căn cứ theo tên hàng', kl.length === 1 && kl[0].canCu === '"kính lão" khớp tên hàng' && kl[0].matchedIn === 'productNameVi');
check('công dụng cũng khớp được', matchPolicyByName({ hs: '90049090', tariffNameVi: 'Loại khác', purposeVi: 'đeo mắt, kính cận cho học sinh' })[0]?.matchedIn === 'purposeVi');

// 4. Stopword + chuẩn hoá.
check('keywords: bỏ stopword, token ≥ 3 ký tự, bỏ dấu câu, giữ dấu tiếng Việt', JSON.stringify(keywords('Kính mắt, kính áp tròng (cận, viễn, loạn) và dung dịch của kính')) === JSON.stringify(['kính', 'mắt', 'tròng', 'cận', 'viễn', 'loạn', 'dung', 'dịch']));
check('normalizeVi: NFD → NFC, thường, bỏ dấu câu', normalizeVi('KÍNH  thuốc!') === 'kính thuốc' && normalizeVi('kính') === 'kính');
check('"kính" rời không khớp cụm "kính mắt" (khớp theo cụm liền)', matchPolicyByName({ hs: '90049090', productNameVi: 'kính của mắt' }).length === 0);

// 5. Dòng hs:null từ plhq-hs-index → vào chỉ mục tên và khớp được.
const nl = nameListings();
check('nameListings: dòng hs:null gom vào chỉ mục (24/2026/TT-BYT thiết bị y tế)', nl.entries.some((e) => e.soHieu === '24/2026/TT-BYT' && /thiết bị y tế/.test(e.moTa)) && nl.byToken.has('thực'));
const tb = matchPolicyByName({ hs: '90189000', productNameVi: 'sản phẩm, hàng hóa là thiết bị y tế' });
check('khớp dòng không mã của sổ cộng đồng (không lọc chương)', tb.some((m) => m.soHieu === '24/2026/TT-BYT' && m.ruleId === null));
check('vế đơn âm tiết "Thuốc" (28/2026) KHÔNG bắt "Kính thuốc"', !kt.some((m) => m.soHieu === '28/2026/TT-BYT'));
check('vế bổ nghĩa đuôi ("… ngành, lĩnh vực.") không thành cụm: 8522.90.30 "lĩnh vực điện ảnh" → không', matchPolicyByName({ hs: '85229030', tariffNameVi: 'Tấm mạch in đã lắp ráp dùng cho máy ghi hoặc tái tạo âm thanh dùng trong lĩnh vực điện ảnh' }).length === 0);
check('"Thuốc hướng thần" vẫn khớp 28/2026/TT-BYT', matchPolicyByName({ hs: '30049099', productNameVi: 'Thuốc hướng thần' }).some((m) => m.soHieu === '28/2026/TT-BYT'));

// 6. 8536 ổ cắm → không ảnh hưởng (kết quả cũ giữ nguyên).
const sock = mapTaxLookup('85366932');
check('8536.69.32: không cờ theo tên, giữ INFO như cũ', sock.reviewByName === false && sock.hasActionablePolicy === false && sock.policyLevel === 'INFO' && !('policyByName' in sock));
check('đầu vào rỗng → []', matchPolicyByName({}).length === 0 && matchPolicyByName({ hs: '9004' }).length === 0);

// 7. Thang mức: NOTICE + reviewByName + hasActionablePolicy=true, dòng "chuyên viên kiểm".
const c = classifyPolicy('', null, [], kt);
check('classifyPolicy: cờ theo tên → NOTICE, reviewByName, hasActionablePolicy', c.policyLevel === 'NOTICE' && c.reviewByName === true && c.hasActionablePolicy === true);
check('policyLines có dòng "Có thể thuộc quản lý Bộ Y tế theo 05/2022/TT-BYT … chuyên viên kiểm"', /^Có thể thuộc quản lý Bộ Y tế theo 05\/2022\/TT-BYT — "kính thuốc" khớp tên dòng biểu thuế — chuyên viên kiểm$/.test(c.policyLines[0]?.text) && c.policyLines[0].reviewByName === true);
check('không cờ theo tên → reviewByName=false, hasActionablePolicy như cũ', classifyPolicy('', null, [], []).reviewByName === false && classifyPolicy('', null, [], []).hasActionablePolicy === false);

// 8. /api/tax (tax-mapper + tax-lookup): thiếu name vẫn khớp bằng tên dòng biểu thuế; có name thì dùng.
const t1 = mapTaxLookup('90049010');
// 90049010 giờ có bảng 19/2024/TT-BYT (BLOCKING) — cờ theo tên vẫn phải có như lưới phụ, không đòi mức NOTICE.
check('/api/tax 90049010 không name: reviewByName=true, policyByName từ tên dòng biểu thuế (mức theo bảng mã nếu có)', t1.reviewByName === true && t1.policyByName?.[0]?.matchedIn === 'tariffNameVi' && ['NOTICE', 'BLOCKING'].includes(t1.policyLevel));
const t2 = buildTaxLookup('90049010', { name: 'kính lão chống ánh sáng xanh' });
check('buildTaxLookup(name) → căn cứ theo tên hàng', t2.policyByName?.[0]?.canCu === '"kính lão" khớp tên hàng');
// Cờ AI bóc không căn cứ vẫn bị gỡ dù có cờ theo tên (cờ theo tên chỉ là NV kiểm).
check('ministries 90049010 cộng thêm Bộ Y tế (cơ quan ban hành văn bản khớp), giữ cơ quan theo chương', t1.ministries.some((m) => m.code === 'BYT' && m.fromPolicyDoc) && t1.ministries.some((m) => m.code === 'BKHCN'));
check('ministries 22030091 có BCT (28/2026/TT-BCT), không trùng', mapTaxLookup('22030091').ministries.filter((m) => m.code === 'BCT').length === 1);

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
