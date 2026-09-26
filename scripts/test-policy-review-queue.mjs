#!/usr/bin/env node
import './test-isolate-data.mjs';
/** Cờ duyệt chính sách: bắt đúng chỗ LLM bóc sai, không báo nhầm chỗ bóc đúng. */
import { reviewFlags } from './build-policy-review-queue.mjs';
import { createRequire } from 'module';
const { applyPolicyRules } = createRequire(import.meta.url)('../lib/policy-rules.js');

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };
const e = (rawText, w = {}) => ({ hsCode: '03036700', warnings: { rawText, ...w } });
const tax = (cs) => ({ cs });

const q = 'Động vật, sản phẩm động vật thủy sản phải kiểm dịch (01/2024/TT-BNNPTNT M5)';
check('kiểm dịch nhưng requiresQuarantine=false → cờ', reviewFlags(e(q, { requiresQuarantine: false }), tax(q)).includes('QUARANTINE_MISSED'));
check('kiểm dịch và requiresQuarantine=true → không cờ', !reviewFlags(e(q, { requiresQuarantine: true }), tax(q)).includes('QUARANTINE_MISSED'));

const cut = 'DM mặt hàng đã được cắt giảm kiểm tra chuyên ngành (765/QĐ-BCT ngày 29/03/2019)';
check('"cắt giảm kiểm tra" không bị coi là phải kiểm tra', !reviewFlags(e(cut, { requiresInspection: false }), tax(cut)).includes('INSPECTION_MISSED'));
const insp = 'Kiểm tra chất lượng (32/2023/TT-BKHCN)';
check('"kiểm tra chất lượng" mà requiresInspection=false → cờ', reviewFlags(e(insp, { requiresInspection: false }), tax(insp)).includes('INSPECTION_MISSED'));

const used = 'Hàng tiêu dùng QSD cấp NK (08/2023/TT-BCT - PL1.I)';
check('QSD cấp NK đọc thành cần giấy phép → cờ hệ thống', reviewFlags(e(used, { requiresLicense: true }), tax(used)).includes('USED_GOODS_BAN_READ_AS_LICENSE'));
check('nguyên văn cs đã đổi → SOURCE_CHANGED', reviewFlags(e(q, { requiresQuarantine: true }), tax('Nội dung khác')).includes('SOURCE_CHANGED'));

// Luật tất định (lib/policy-rules.js) — CEO xác nhận 2026-09-25: QSD cấp NK = cấm hàng đã qua sử dụng.
const fixed = applyPolicyRules({ rawText: `${used}; HH tạm ngừng KD TNTX CK (08/2023/TT-BCT - PL2)`, requiresLicense: true, licenseTypes: ['NK', 'Tạm ngừng KD TNTX'], summary: 'Hàng tiêu dùng cần giấy phép nhập khẩu.' });
check('luật: QSD cấp NK → requiresLicense=false', fixed.warnings.requiresLicense === false, fixed.warnings);
check('luật: bỏ loại giấy phép sai (NK, tạm ngừng)', fixed.warnings.licenseTypes.length === 0, fixed.warnings.licenseTypes);
check('luật: usedGoodsImportBan=true + ruleFixes', fixed.warnings.usedGoodsImportBan === true && fixed.warnings.ruleFixes?.[0]?.startsWith('USED_GOODS_BAN_NOT_LICENSE'));
check('luật: tóm tắt không còn "cần giấy phép", nói rõ cấm hàng đã qua sử dụng',
  !/(?<!không )cần giấy phép/i.test(fixed.warnings.summary) && /ĐÃ QUA SỬ DỤNG bị cấm nhập khẩu/.test(fixed.warnings.summary) && /tạm ngừng KD TNTX/.test(fixed.warnings.summary), fixed.warnings.summary);
check('luật: chạy lại không đổi gì (idempotent)', applyPolicyRules(fixed.warnings).applied.length === 0);
const cites = applyPolicyRules({ rawText: `${used}; động vật thuộc các phụ lục CITES (17/2023/TT-BNNPTNT)`, requiresLicense: true, licenseTypes: ['NK', 'CITES'] });
check('luật: giữ giấy phép CITES thật', cites.warnings.requiresLicense === true && cites.warnings.licenseTypes.join() === 'CITES', cites.warnings);
const realLicense = applyPolicyRules({ rawText: 'Hàng QSD cấm NK; phải có giấy phép NK (10/2023/TT-BCT)', requiresLicense: true, licenseTypes: ['NK'] });
check('luật: có chữ "giấy phép" thật → không đụng', realLicense.applied.length === 0 && realLicense.warnings.requiresLicense === true);
check('luật: kiểm dịch trong nguyên văn → requiresQuarantine=true', applyPolicyRules({ rawText: q, requiresQuarantine: false }).warnings.requiresQuarantine === true);
check('queue: dòng đã sửa theo luật không còn cờ', reviewFlags({ hsCode: 'x', warnings: fixed.warnings }, tax(fixed.warnings.rawText)).length === 0, reviewFlags({ hsCode: 'x', warnings: fixed.warnings }, tax(fixed.warnings.rawText)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
