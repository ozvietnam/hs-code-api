#!/usr/bin/env node
/**
 * Khoá từ điển mâu thuẫn HS (data/confusion-pairs.json + lib/confusion-pairs.js):
 *  1. Mã nào cũng phải sống trong biểu thuế hiện hành, trừ mục đã gắn cờ oldTariff.
 *  2. Alias không được là từ chung (kẻo "cảm biến" bắn cảnh báo cho mọi câu).
 *  3. Nhận diện theo tên hàng phải bắt đúng mục, và KHÔNG lan sang câu không liên quan.
 *  4. Mức cảnh báo: gợi ý đầu rơi vào mã DN hay khai sai → HIGH; vào mã HQ ấn định → CHECK.
 *  5. Không nơi nào phát ra nhãn GIR như determination (chỉ girRuleVi hiển thị).
 */
import './test-isolate-data.mjs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cp = require(join(ROOT, 'lib', 'confusion-pairs.js'));
const taxData = require(join(ROOT, 'data', 'tax.json'));
const doc = require(join(ROOT, 'data', 'confusion-pairs.json'));

let failed = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const prefixes = new Set();
for (const k of Object.keys(taxData)) if (/^\d{8}$/.test(k)) { prefixes.add(k.slice(0, 4)); prefixes.add(k.slice(0, 6)); prefixes.add(k); }

console.log('\n== Cấu trúc ==');
check('có ≥ 200 mục', doc.entries.length >= 200, String(doc.entries.length));
const ids = doc.entries.map((e) => e.id);
check('id duy nhất', new Set(ids).size === ids.length);
const missing = doc.entries.filter((e) => !e.nameVi || !e.aliases?.length || (!e.correctHs?.length && !e.legalBasisVi));
check('mục nào cũng có nameVi, alias, và correctHs hoặc legalBasisVi', missing.length === 0, missing.map((e) => e.id).join(' '));
const noDiacritics = doc.entries.filter((e) => e.origin === 'grok-deep' && /^[\x00-\x7f]+$/.test(e.nameVi) && !/^[A-Z][a-zA-Z /()-]+$/.test(e.nameVi));
check('tên tiếng Việt đã khôi phục dấu (mục grok-deep)', noDiacritics.length <= 3, noDiacritics.map((e) => `${e.id}:${e.nameVi}`).join(' | '));
check('mọi mục verified:false cho tới khi CEO duyệt (không tự bật)', doc.entries.every((e) => e.verified === false || e.verifiedBy), '');

console.log('\n== Mã HS ==');
const dead = [];
for (const e of doc.entries) {
  for (const c of [...e.correctHs, ...e.declaredHs, ...e.rules.map((r) => r.hs).filter(Boolean)]) {
    const d = cp.hsDigits(c);
    if (![4, 6, 8].includes(d.length)) dead.push(`${e.id}:${c}(độ dài)`);
    else if (!prefixes.has(d) && !e.oldTariff) dead.push(`${e.id}:${c}`);
  }
}
check('mã 4/6/8 số sống trong biểu thuế, mã cũ phải có cờ oldTariff', dead.length === 0, dead.slice(0, 15).join(', '));
const flagged = doc.entries.filter((e) => e.oldTariff);
check(`mục mã cũ có liệt kê oldTariffCodes (${flagged.length} mục)`, flagged.every((e) => e.oldTariffCodes?.length));

console.log('\n== Alias ==');
const generic = ['cảm biến', 'sensor', 'máy', 'van', 'robot', 'motor', 'động cơ', 'module', 'camera', 'relay', 'rơ le', 'bơm', 'máy in', 'laser'];
const bad = [];
for (const e of doc.entries) for (const a of e.aliases) if (generic.includes(a.toLowerCase()) || cp.fold(a).length < 4) bad.push(`${e.id}:"${a}"`);
check('không alias chung chung / quá ngắn', bad.length === 0, bad.join(', '));
const fam = {};
for (const e of doc.entries) for (const a of e.aliases) { const f = cp.fold(a); (fam[f] ||= []).push(e.id); }
const shared = Object.entries(fam).filter(([, l]) => new Set(l).size > 3);
check('một alias không thuộc quá 3 mục', shared.length === 0, shared.map(([a, l]) => `${a}→${[...new Set(l)].join('/')}`).slice(0, 8).join('; '));

console.log('\n== Nhận diện theo tên hàng ==');
const cases = [
  ['xi lanh khí nén SMC CQ2 hành trình 50mm', 'MT-049'],
  ['van điện từ 24VDC 5/2 Airtac 4V210', 'MT-042'],
  ['robot hút bụi lau nhà Xiaomi', 'MT-002'],
  ['biến tần Delta 2.2kW 3 pha', 'MT-012'],
  ['bộ lưu điện UPS 1000VA', 'MT-017'],
  ['máy cắt laser fiber 1500W CNC', 'MT-016'],
  ['cảm biến tiệm cận cảm ứng Omron E2E', 'MT-028'],
  ['đồng hồ thông minh Huawei Watch', 'MT-005'],
];
for (const [q, id] of cases) {
  const hits = cp.matchByText(q).map((h) => h.entry.id);
  check(`"${q}" → ${id}`, hits.includes(id), `nhận ${hits.join(',') || '(không)'}`);
}
const noise = ['thép cuộn cán nguội 1.2mm', 'áo thun cotton nam', 'máy tính xách tay Dell', 'ống nhựa PVC phi 90', 'hạt nhựa PP nguyên sinh', 'cà phê rang xay 500g', 'ổ cắm điện 3 chấu'];
for (const q of noise) {
  const hits = cp.matchByText(q).map((h) => h.entry.id);
  check(`không lan: "${q}"`, hits.length === 0, `nhận ${hits.join(',')}`);
}

console.log('\n== Mức cảnh báo ==');
const high = cp.confusionAlertsFor('xi lanh khí nén Airtac', ['84818099', '84123100']);
check('xi lanh khí nén + gợi ý đầu 8481.80 → HIGH', high[0]?.id === 'MT-049' && high[0].severity === 'HIGH', JSON.stringify(high.map((a) => [a.id, a.severity])));
const ok = cp.confusionAlertsFor('xi lanh khí nén Airtac', ['84123100']);
check('xi lanh khí nén + gợi ý đầu 8412.31 → CHECK', ok[0]?.id === 'MT-049' && ok[0].severity === 'CHECK', JSON.stringify(ok.map((a) => [a.id, a.severity])));
check('cảnh báo mang tiêu chí phân biệt + mã hai phía', high[0] && high[0].essenceTestVi && high[0].correctHs.length && high[0].declaredHs.length);
const info = cp.confusionAlertsFor('thiết bị không tên', ['84798939']);
check('chỉ trùng mã DN hay khai (không khớp tên) → INFO, ≤ 3', info.every((a) => a.severity === 'INFO') && info.length <= 3, JSON.stringify(info.map((a) => a.id)));
check('không cảnh báo khi không khớp gì', cp.confusionAlertsFor('cà phê rang xay', ['09012120']).length === 0);
const dup = cp.confusionAlertsFor('robot hút bụi Xiaomi', ['85081100']);
check('mục MT và mục nhóm ngành cùng mặt hàng gộp thành một cảnh báo (alsoIds)', dup.filter((a) => a.matchedBy === 'text').length === 1 && (dup[0].alsoIds || []).length >= 1, JSON.stringify(dup.map((a) => [a.id, a.alsoIds])));
const review = doc.entries.filter((e) => e.needsReview);
check('mục nguồn ghi đáng ngờ có needsReview + reviewNoteVi', review.length >= 5 && review.every((e) => e.reviewNoteVi), review.map((e) => e.id).join(' '));

console.log('\n== GIR ==');
const sample = cp.getEntry('MT-049');
check('đầu ra không có trường girRulesApplied/basis tự gắn', sample && !('girRulesApplied' in sample) && !('basis' in sample) && typeof sample.girRuleVi !== 'undefined');
const withPrec = doc.entries.filter((e) => cp.getEntry(e.id).precedents.length).map((e) => e.id);
console.log(`  (thông tin) ${withPrec.length} mục nối được tiền lệ TB-TCHQ trong kho: ${withPrec.join(' ')}`);

if (failed) {
  console.log(`\n❌ ${failed} kiểm tra thất bại`);
  process.exit(1);
}
console.log('\n✅ confusion-pairs: tất cả kiểm tra đạt');
