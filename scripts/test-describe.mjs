#!/usr/bin/env node
import './test-isolate-data.mjs';
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
check('ecus-length: KHÔNG ghi "xuất xứ" vào chuỗi mô tả (ECUS có ô riêng — Đợt 0B)', !/xuất xứ/i.test(longMeta.text),
  longMeta.text);
check('ecus-length: dấu ngăn là dấu phẩy, không dùng ";"', !longMeta.text.includes(';') && longMeta.text.includes(', '),
  longMeta.text);
const viTri = (k) => longMeta.dropped.findIndex((d) => d.startsWith(k));
check('ecus-length: nhận diện (hiệu/model) KHÔNG bị chuyển đầu tiên — quy cách, thông số phụ đi trước',
  viTri('quyCach') === 0 && viTri('thongSoKyThuat') < viTri('model') && (viTri('nhanHieu') === -1 || viTri('model') < viTri('nhanHieu')),
  JSON.stringify(longMeta.dropped));
check('ecus-length: cụm không vừa nằm ở khaiTiep (HYS), không mất', longMeta.dropped.every((d) => d === 'tenHang[trimmed]' || (longMeta.khaiTiep || '').includes(d.split(': ').slice(1).join(': '))),
  `${longMeta.khaiTiep} | ${JSON.stringify(longMeta.dropped)}`);
check('ecus-length: dropped ghi rõ cụm bị bỏ ("khoá: cụm")', longMeta.dropped.every((d) => /^[\w.\[\]]+(: .+)?$/.test(d)),
  JSON.stringify(longMeta.dropped));
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
check('ecus-length: đuôi đúng quy ước mới ", tình trạng" (không xuất xứ)',
  shortMeta.text.endsWith('256GB, Mới 100%') && !shortMeta.text.includes('xuất xứ'),
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
  hugeMeta.text.length <= ECUS_MAX_LENGTH && hugeMeta.text.endsWith(', Đã qua sử dụng') && !hugeMeta.text.includes('Nhật Bản'),
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

// ── #324: nhóm máy giữ thông số bắt buộc (power/voltage) khi vượt 200 ký tự ──
const tramsac = {
  tenHang: 'Trạm sạc nhanh DC cho xe điện, 2 súng, kiểu all-in-one lắp ngoài trời',
  nhanHieu: 'Sinexcel', model: 'V7-400kW',
  thanhPhanCauTao: 'vỏ thép tấm sơn tĩnh điện, module sạc tích hợp',
  thongSoKyThuat: ['công suất 400 kW', 'đầu ra DC 200-1000V, dòng tối đa 500A', 'điện áp vào 380Vac 3 pha', 'IP54'],
  congDung: 'sạc pin xe điện',
  xuatXu: { nameVi: 'Trung Quốc' }, tinhTrang: 'Mới 100%',
};
const mayMeta = composeWithMeta(tramsac, { keepSpecs: true });
check('#324 nhóm 85: mô tả GIỮ công suất 400 kW (không hy sinh thông số trước phụ đề)', /400\s?kW/i.test(mayMeta.text), mayMeta.text);
check('#324 nhóm 85: điện áp 380V và dòng 500A không mất (chuỗi chính hoặc khai tiếp HYS)', /380/.test(`${mayMeta.text} ${mayMeta.khaiTiep}`) && /500A/.test(`${mayMeta.text} ${mayMeta.khaiTiep}`), `${mayMeta.text} | HYS: ${mayMeta.khaiTiep}`);
check('#324 nhóm 85: vẫn vừa 200 ký tự ECUS', mayMeta.length <= 200, String(mayMeta.length));
check('#324 nhóm 85: công dụng là đặc trưng phân loại — giữ; thông số phụ (IP54) bị bỏ trước', /sạc pin xe điện/.test(mayMeta.text) && mayMeta.dropped.some((d) => d.includes('IP54')), `${mayMeta.text} | ${JSON.stringify(mayMeta.dropped)}`);
check('#324 nhóm 85: vượt 200 → rút gọn bằng viết tắt chuẩn (CS/ĐA) trước khi bỏ cụm', (mayMeta.vietTat || []).length > 0 && /\bCS\b|ĐA/.test(mayMeta.text), `${mayMeta.text} | ${JSON.stringify(mayMeta.vietTat)}`);
const cuMeta = composeWithMeta(tramsac); // không keepSpecs
check('#324 nhóm khác: thông số không bắt buộc được phép bị cắt', cuMeta.length <= 200 && cuMeta.text.startsWith('Trạm sạc'), JSON.stringify(cuMeta.dropped));

// ── Đợt 0B: khuôn Oz — dấu phẩy, chất liệu, kích thước mm ghi đơn vị một lần, hiệu/không hiệu, NSX ──
const dep = {
  tenHang: 'Dép guốc nữ',
  thanhPhanCauTao: 'quai bằng nhựa giả da PU, đế ngoài bằng nhựa',
  thongSoKyThuat: ['cao 5-10cm', 'size 35-39'],
  model: 'DX-01', nhanHieu: 'không nhãn hiệu', nhaSanXuat: 'Công ty TNHH Giày Mẫu',
  xuatXu: { code: 'CN', nameVi: 'Trung Quốc' }, tinhTrang: 'Mới 100%',
};
const depMeta = composeWithMeta(dep, { hsCode: '64029990' });
check('0B dép: chất liệu quai/đế có mặt', depMeta.text.includes('quai bằng nhựa giả da PU') && depMeta.text.includes('đế ngoài bằng nhựa'), depMeta.text);
check('0B dép: kích thước đổi cm → mm, có nhãn KT', depMeta.text.includes('KT: cao 50-100mm'), depMeta.text);
check('0B dép: "không hiệu" thay "nhãn hiệu không nhãn hiệu"', depMeta.text.includes('không hiệu') && !depMeta.text.includes('nhãn hiệu'), depMeta.text);
check('0B dép: thứ tự tên → chất liệu → size → KT → model → hiệu → NSX → tình trạng',
  /^Dép guốc nữ, quai .*size 35-39, KT: .*model: DX-01, không hiệu, NSX: Công ty TNHH Giày Mẫu, Mới 100%$/.test(depMeta.text), depMeta.text);
check('0B dép: không "xuất xứ", không ";", ≤200', !depMeta.text.includes('xuất xứ') && !depMeta.text.includes(';') && depMeta.length <= 200, depMeta.text);

const { cumKichThuoc } = require('./lib/describe-compose');
check('0B KT: "12.9 x 8.2 x 4.2 cm" → "KT: 129x82x42mm" (đơn vị ghi một lần cuối)', cumKichThuoc(['kích thước 12.9 x 8.2 x 4.2 cm']) === 'KT: 129x82x42mm', cumKichThuoc(['kích thước 12.9 x 8.2 x 4.2 cm']));
check('0B KT: nhiều phần cùng đơn vị → gộp một cụm, đơn vị cuối', cumKichThuoc(['dày 8,6mm', 'rộng 40mm', 'dài 4352mm']) === 'KT: dày 8,6/rộng 40/dài 4352mm', cumKichThuoc(['dày 8,6mm', 'rộng 40mm', 'dài 4352mm']));
check('0B KT: hàng dài ghi m giữ m', cumKichThuoc(['dài 30m']) === 'KT: dài 30m', cumKichThuoc(['dài 30m']));
const vlMeta = composeWithMeta({ tenHang: 'Máy tính xách tay', thanhPhanCauTao: 'nhôm, nhựa', tinhTrang: 'Mới 100%' });
check('0B: giá trị có dấu phẩy bên trong → "/" (không phá dấu ngăn)', vlMeta.text === 'Máy tính xách tay, bằng nhôm/nhựa, Mới 100%', vlMeta.text);
const khongBiet = composeWithMeta({ tenHang: 'Máy tính xách tay', tinhTrang: 'Mới 100%' });
check('0B: không biết nhãn hiệu → KHÔNG tự khẳng định "không hiệu"', !khongBiet.text.includes('hiệu'), khongBiet.text);

// Dùng hết 200 ký tự trước khi cắt; nhận diện bị cắt SAU chi tiết không làm căn cứ (màu)
const chat = composeWithMeta({
  tenHang: 'Ấm siêu tốc đun nước bằng điện dùng trong gia đình loại để bàn có đế xoay 360 độ',
  thanhPhanCauTao: 'thân inox 304, tay cầm nhựa PP', congDung: 'đun sôi nước uống',
  thongSoKyThuat: ['công suất 1500W', 'điện áp 220V', 'dung tích 1,8 lít', 'màu bạc ánh kim', 'có đèn báo'],
  model: 'KT-1800S', nhanHieu: 'Mẫu Thử', nhaSanXuat: 'Công ty TNHH Điện Gia Dụng Mẫu Thử Quốc Tế', tinhTrang: 'Mới 100%',
}, { hsCode: '85161011', keepSpecs: true });
check('0B cắt: ≤200 và dùng gần hết chỗ (≥150)', chat.length <= 200 && chat.length >= 150, `${chat.length} ${chat.text}`);
check('0B cắt: màu (không làm căn cứ mã) bị chuyển ĐẦU TIÊN, nhận diện chuyển sau cùng', chat.dropped[0]?.includes('màu bạc') && chat.text.includes('hiệu: Mẫu Thử') && chat.dropped.findIndex((d) => d.startsWith('model')) > chat.dropped.findIndex((d) => d.startsWith('thongSoKyThuat')), `${chat.text} | ${JSON.stringify(chat.dropped)}`);
// HYS (chỉ tiêu 1.68 TT 121/2025): không mất dữ kiện nào — mọi cụm có ở chuỗi chính hoặc khaiTiep.
const duKien = ['Ấm siêu tốc', 'inox 304', 'tay cầm nhựa PP', 'đun sôi nước uống', '1500W', '220V', '1,8 lít', 'màu bạc ánh kim', 'có đèn báo', 'KT-1800S', 'Mẫu Thử', 'Công ty TNHH Điện Gia Dụng Mẫu Thử Quốc Tế', 'Mới 100%'];
const mat = duKien.filter((x) => !chat.text.includes(x) && !(chat.khaiTiep || '').includes(x));
check('0B HYS: chuỗi chính ≤200, KHÔNG mất dữ kiện (có ở chuỗi chính hoặc khaiTiep)', chat.length <= 200 && mat.length === 0, `mất: ${mat} | ${chat.text} | HYS: ${chat.khaiTiep}`);
check('0B HYS: moTaDayDu đủ mọi dữ kiện, viết rõ chữ (không CS/ĐA/CL/KT/NSX)', duKien.every((x) => chat.moTaDayDu.includes(x)) && !/(^|[\s,])(CS|ĐA|CL|NSX)(?=[\s:])|KT:/u.test(chat.moTaDayDu), chat.moTaDayDu);
const ngan = composeWithMeta({ tenHang: 'Hộp nhựa đựng linh kiện', tinhTrang: 'Mới 100%' });
check('0B HYS: vừa 200 ký tự → khaiTiep = null', ngan.khaiTiep === null && ngan.moTaDayDu === ngan.text, JSON.stringify(ngan));
check('0B cắt: tên hàng + chất liệu + công dụng giữ nguyên', chat.text.startsWith('Ấm siêu tốc đun nước bằng điện') && chat.text.includes('inox 304') && chat.text.includes('đun sôi nước uống'), chat.text);

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
