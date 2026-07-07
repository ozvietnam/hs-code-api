#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(rootDir, 'package.json'));
const { validateDeclaration, normalizeDeclaration } = require('./lib/declaration-validator');
const { composeCustomsDescription, composeWithMeta, ECUS_MAX_LENGTH } = require('./lib/describe-compose');

const cases = JSON.parse(readFileSync(join(rootDir, 'tests', 'describe-cases.json'), 'utf8'));
const chapterFieldCases = JSON.parse(
  readFileSync(join(rootDir, 'tests', 'describe-chapter-fields.json'), 'utf8')
);
const LEVEL_RANK = { REJECT: 0, WEAK: 1, ACCEPTABLE: 2, GOOD: 3, EXCELLENT: 4 };

let passed = 0;
let failed = 0;

for (const tc of cases) {
  const declaration = normalizeDeclaration({ declaration: tc.declaration }, tc.context || {});
  const compliance = validateDeclaration(declaration, tc.hsCode, tc.context || {});
  const composed = composeCustomsDescription(declaration);

  let ok = true;
  const reasons = [];

  if (tc.expectPass === true && !compliance.passesCustomsAudit) {
    ok = false;
    reasons.push('expected pass');
  }
  if (tc.expectPass === false && compliance.passesCustomsAudit) {
    ok = false;
    reasons.push('expected fail');
  }
  if (tc.minLevel && (LEVEL_RANK[compliance.level] ?? 0) < LEVEL_RANK[tc.minLevel]) {
    ok = false;
    reasons.push(`level ${compliance.level} < ${tc.minLevel}`);
  }
  if (tc.maxLevel && (LEVEL_RANK[compliance.level] ?? 0) > LEVEL_RANK[tc.maxLevel]) {
    ok = false;
    reasons.push(`level ${compliance.level} > ${tc.maxLevel}`);
  }
  for (const field of tc.expectMissing || []) {
    if (!compliance.missingRequired.includes(field)) {
      ok = false;
      reasons.push(`missing ${field} not flagged`);
    }
  }
  for (const code of tc.expectCodes || []) {
    if (!compliance.warnings.some((w) => w.code === code)) {
      ok = false;
      reasons.push(`expected code ${code}`);
    }
  }
  if (!composed && tc.expectPass) {
    ok = false;
    reasons.push('empty customsDescription');
  }

  if (ok) {
    passed += 1;
    console.log(`PASS ${tc.id}: ${compliance.level} (${compliance.score})`);
  } else {
    failed += 1;
    console.error(`FAIL ${tc.id}: ${compliance.level} — ${reasons.join(', ')}`);
  }
}

// ── ECUS 200 ký tự (tính cả dấu cách) ───────────────────────────────────────

function check(id, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`PASS ${id}`);
  } else {
    failed += 1;
    console.error(`FAIL ${id} — ${detail}`);
  }
}

const longDecl = normalizeDeclaration({
  declaration: {
    tenHang: 'Máy xúc đào bánh xích thủy lực dùng trong xây dựng công trình dân dụng',
    xuatXu: { code: 'CN', nameVi: 'Trung Quốc' },
    donViTinh: 'chiếc',
    tinhTrang: 'Mới 100%',
    nhanHieu: 'Komatsu',
    model: 'PC200-8MO',
    thongSoKyThuat: [
      'dung tích gầu 0.8m3',
      'công suất động cơ 110kW',
      'trọng lượng vận hành 20 tấn',
      'chiều sâu đào tối đa 6.62m',
      'tầm với tối đa 9.87m',
    ],
    thanhPhanCauTao: 'khung thép, gầu thép hợp kim chống mài mòn',
    congDung: 'đào đất đá, san lấp mặt bằng thi công công trình',
    quyCach: 'nguyên chiếc đồng bộ kèm gầu tiêu chuẩn',
  },
}, {});

const longMeta = composeWithMeta(longDecl);
check('ecus-length: composed ≤ 200 ký tự', longMeta.text.length <= ECUS_MAX_LENGTH,
  `length=${longMeta.text.length}`);
check('ecus-length: đánh dấu truncated', longMeta.truncated === true,
  `fullLength=${longMeta.fullLength}`);
check('ecus-length: tình trạng vẫn ở cuối sau khi cắt', longMeta.text.endsWith('Mới 100%'),
  `tail="${longMeta.text.slice(-40)}"`);
check('ecus-length: xuất xứ không bị cắt', longMeta.text.includes('xuất xứ Trung Quốc'),
  longMeta.text);
check('ecus-length: tên hàng giữ nguyên (chỉ cắt phần phụ)', longMeta.text.startsWith('Máy xúc đào'),
  longMeta.text);

const longCompliance = validateDeclaration(longDecl, '84295200', {});
check('ecus-length: validator cảnh báo LENGTH_EXCEEDED',
  longCompliance.warnings.some((w) => w.code === 'LENGTH_EXCEEDED'),
  JSON.stringify(longCompliance.warnings.map((w) => w.code)));

const shortDecl = normalizeDeclaration({
  declaration: {
    tenHang: 'Điện thoại di động thông minh Apple iPhone 15',
    xuatXu: { code: 'CN', nameVi: 'Trung Quốc' },
    donViTinh: 'chiếc',
    tinhTrang: 'Mới 100%',
    thongSoKyThuat: ['256GB'],
  },
}, {});
const shortMeta = composeWithMeta(shortDecl);
check('ecus-length: mô tả ngắn không truncate, không warning',
  shortMeta.truncated === false
    && !validateDeclaration(shortDecl, '85171300', {}).warnings.some((w) => w.code === 'LENGTH_EXCEEDED'),
  `truncated=${shortMeta.truncated}`);
check('ecus-length: đuôi đúng quy ước "xuất xứ X; tình trạng"',
  shortMeta.text.endsWith('xuất xứ Trung Quốc; Mới 100%'),
  shortMeta.text);

// tenHang siêu dài: hard-trim nhưng đuôi bắt buộc còn nguyên
const hugeName = normalizeDeclaration({
  declaration: {
    tenHang: 'Thiết bị chuyên dùng '.repeat(20),
    xuatXu: { code: 'JP', nameVi: 'Nhật Bản' },
    donViTinh: 'bộ',
    tinhTrang: 'Đã qua sử dụng',
  },
}, {});
const hugeMeta = composeWithMeta(hugeName);
check('ecus-length: tenHang siêu dài bị hard-trim, vẫn ≤200 + giữ đuôi',
  hugeMeta.text.length <= ECUS_MAX_LENGTH && hugeMeta.text.endsWith('xuất xứ Nhật Bản; Đã qua sử dụng'),
  `length=${hugeMeta.text.length} tail="${hugeMeta.text.slice(-40)}"`);

// ── CONDITION_DEFAULTED: default ngầm "Mới 100%" phải có cảnh báo ───────────

const noCondition = normalizeDeclaration({
  declaration: {
    tenHang: 'Điện thoại di động thông minh Samsung Galaxy S24',
    xuatXu: { code: 'VN', nameVi: 'Việt Nam' },
    donViTinh: 'chiếc',
    thongSoKyThuat: ['5G', '256GB'],
  },
}, {});
check('condition-default: tinhTrangDefaulted=true khi input thiếu',
  noCondition.tinhTrangDefaulted === true && noCondition.tinhTrang === 'Mới 100%');
check('condition-default: validator cảnh báo CONDITION_DEFAULTED',
  validateDeclaration(noCondition, '85171300', {}).warnings.some((w) => w.code === 'CONDITION_DEFAULTED'));
check('condition-default: khai rõ tinhTrang thì không cảnh báo',
  !validateDeclaration(shortDecl, '85171300', {}).warnings.some((w) => w.code === 'CONDITION_DEFAULTED'));

// ── Chapter declaration fields (30 case, target ≥80% field assertions) ─────

let chapterFieldAssertions = 0;
let chapterFieldCorrect = 0;

for (const tc of chapterFieldCases) {
  const declaration = normalizeDeclaration({ declaration: tc.declaration }, tc.context || {});
  const compliance = validateDeclaration(declaration, tc.hsCode, tc.context || {});
  const present = compliance.chapterFields?.present || [];
  const missing = compliance.chapterFields?.missing || [];
  let ok = true;
  const reasons = [];

  if (tc.expectSource && compliance.chapterFields?.source !== tc.expectSource) {
    ok = false;
    reasons.push(`expected source ${tc.expectSource}, got ${compliance.chapterFields?.source}`);
  }
  if (tc.expectHeading && compliance.chapterFields?.heading !== tc.expectHeading) {
    ok = false;
    reasons.push(`expected heading ${tc.expectHeading}`);
  }

  for (const key of tc.expectChapterPresent || []) {
    chapterFieldAssertions += 1;
    const inPresent = present.includes(key);
    const inMissingRequired = compliance.missingRequired.includes(`chapterSpecific.${key}`);
    if (inPresent && !inMissingRequired) {
      chapterFieldCorrect += 1;
    } else {
      ok = false;
      if (!inPresent) reasons.push(`expected present ${key}`);
      if (inMissingRequired) reasons.push(`${key} wrongly in missingRequired`);
    }
  }

  for (const key of tc.expectChapterMissing || []) {
    chapterFieldAssertions += 1;
    const inMissing = missing.includes(key);
    const inMissingRequired = compliance.missingRequired.includes(`chapterSpecific.${key}`);
    if (inMissing && inMissingRequired) {
      chapterFieldCorrect += 1;
    } else {
      ok = false;
      if (!inMissing) reasons.push(`expected missing ${key}`);
      if (!inMissingRequired) reasons.push(`${key} not in missingRequired`);
    }
  }

  if (ok) {
    passed += 1;
    console.log(`PASS ${tc.id}`);
  } else {
    failed += 1;
    console.error(`FAIL ${tc.id} — ${reasons.join(', ')}`);
  }
}

const chapterAccuracy =
  chapterFieldAssertions > 0 ? (chapterFieldCorrect / chapterFieldAssertions) * 100 : 0;
check(
  `chapter-fields: accuracy ≥80% (${chapterFieldCorrect}/${chapterFieldAssertions} = ${chapterAccuracy.toFixed(1)}%)`,
  chapterAccuracy >= 80,
  `${chapterFieldCorrect}/${chapterFieldAssertions}`
);

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
