#!/usr/bin/env node
/**
 * Sinh / kiểm "biên bản nghiệm thu" độ phủ của một nhóm 4 số.
 *
 *   node scripts/dict-coverage.mjs 8481            # báo cáo, ghi file nếu phủ 100%
 *   node scripts/dict-coverage.mjs 8481 8428       # nhiều nhóm
 *   node scripts/dict-coverage.mjs --check         # kiểm mọi file đang có: lệch so với data hiện tại thì báo
 *   node scripts/dict-coverage.mjs --regen         # sinh lại mọi file đang có (khi biểu thuế đổi)
 *
 * VÌ SAO KHÔNG VIẾT TAY FILE NÀY: bản đầu do agent tự chép tên dòng vn/en của
 * từng mã vào file (72 KB cho 7 nhóm — cả biểu thuế sẽ ~13 MB), toàn bộ là
 * bản sao của tax.json. Thứ duy nhất file cần giữ là lá → mục nào phủ, và thứ
 * đó tính được. File chỉ là biên bản: có nó nghĩa là nhóm đã được chốt.
 */
import { writeFileSync, readdirSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { COVERAGE_DIR, coverageOf, isHeading, loadTax, loadThesaurus, today } from './dict-lib.mjs';

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
let headings = argv.filter(isHeading);

const tax = loadTax();
const thesaurus = loadThesaurus();

if (flags.has('--check') || flags.has('--regen')) {
  headings = existsSync(COVERAGE_DIR)
    ? readdirSync(COVERAGE_DIR).filter((f) => /^\d{4}\.json$/.test(f)).map((f) => f.slice(0, 4))
    : [];
}

if (!headings.length) {
  console.error('Cần ít nhất một nhóm 4 số, hoặc --check / --regen.');
  process.exit(2);
}

let bad = 0;
for (const h of headings) {
  const cov = coverageOf(h, tax, thesaurus);
  const file = join(COVERAGE_DIR, `${h}.json`);
  const pct = cov.leafCount ? Math.round((cov.coveredCount / cov.leafCount) * 100) : 0;
  console.log(`\n== ${h} — ${cov.titleEn || '(không có tiêu đề)'} ==`);
  console.log(`   lá: ${cov.leafCount} · đã phủ: ${cov.coveredCount} (${pct}%) · mục: ${cov.synonymEntryIds.length}`);
  if (cov.missingHs.length) {
    console.log(`   CÒN THIẾU ${cov.missingHs.length} mã:`);
    for (const hs of cov.missingHs) console.log(`     ${hs}  ${(tax[hs]?.vn || '').trim().slice(0, 90)}`);
  }
  if (!cov.leafCount) {
    console.log('   ✗ nhóm không có trong biểu thuế');
    bad++;
    continue;
  }

  if (flags.has('--check')) {
    const onDisk = JSON.parse(readFileSync(file, 'utf8'));
    const diskCodes = Object.keys(onDisk.codes || {}).sort().join(',');
    const nowCodes = Object.keys(cov.codes).sort().join(',');
    const stale = onDisk.coveredCount !== cov.coveredCount || diskCodes !== nowCodes;
    if (stale) {
      console.log(`   ✗ file lệch data hiện tại (file: ${onDisk.coveredCount}/${onDisk.leafCount}) — chạy --regen`);
      bad++;
    } else console.log('   ✓ file khớp data hiện tại');
    continue;
  }

  const complete = cov.missingHs.length === 0;
  if (!complete && !flags.has('--force')) {
    console.log('   ✗ chưa phủ 100% — không ghi file. Bổ sung mục rồi chạy lại.');
    bad++;
    continue;
  }
  mkdirSync(COVERAGE_DIR, { recursive: true });
  const out = {
    version: '2026-09',
    heading: h,
    titleEn: cov.titleEn,
    leafCount: cov.leafCount,
    coveredCount: cov.coveredCount,
    missingHs: cov.missingHs,
    updatedAt: today(),
    standardVi:
      'Nhận theo NHÓM 4 số. Nghiệm thu: mọi mã 8 số của nhóm có trong candidates[] của ít nhất một mục ' +
      'trade-synonyms, và dict:check xanh. File sinh bằng scripts/dict-coverage.mjs — không sửa tay.',
    synonymEntryIds: cov.synonymEntryIds,
    codes: cov.codes,
  };
  writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`   ✓ đã ghi ${file.replace(process.cwd() + '/', '')}`);
}

if (bad) process.exit(1);
