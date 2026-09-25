#!/usr/bin/env node
import './test-isolate-data.mjs';
/** Cờ duyệt chính sách: bắt đúng chỗ LLM bóc sai, không báo nhầm chỗ bóc đúng. */
import { reviewFlags } from './build-policy-review-queue.mjs';

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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
