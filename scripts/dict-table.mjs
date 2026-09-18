#!/usr/bin/env node
/**
 * Bảng quyết định của một nhóm 4 số: xem tình trạng, sinh khung để soạn.
 *
 *   node scripts/dict-table.mjs 8536           # tình trạng: có bảng chưa, lá nào chưa có đường tới; in mọi lá kèm lời văn để soạn
 *   node scripts/dict-table.mjs 8536 --init    # sinh khung data/decision-tables/8536.json (không ghi đè file đã có)
 *   node scripts/dict-table.mjs 8536 --oz                          # ĐỀ BÀI: tên hàng thật trong tờ khai Oz của nhóm + bảng hiện chốt được gì
 *   node scripts/dict-table.mjs 8536 --try "câu người gõ"          # chạy thử bảng với một câu
 *   node scripts/dict-table.mjs 8536 --try "câu" --facts '{"a":1}'  # kèm dữ kiện tường minh
 *
 * Khung sinh ra CỐ Ý để rules rỗng: test bắt "mọi lá có đường tới" sẽ đỏ cho tới
 * khi người soạn hiểu nhóm và viết đủ luật. Không có đường tắt nào để xanh.
 */
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { ROOT, headingTitle, isHeading, leavesOf, loadTax } from './dict-lib.mjs';

const require = createRequire(import.meta.url);
const dt = require(join(ROOT, 'lib', 'decision-tables.js'));
const { parseCommodityQuery } = require(join(ROOT, 'lib', 'query-parse.js'));

const argv = process.argv.slice(2);
const heading = argv.find(isHeading);
if (!heading) {
  console.error('Cách dùng: node scripts/dict-table.mjs <nhóm 4 số> [--init] [--try "câu" [--facts JSON]]');
  process.exit(2);
}
const tax = loadTax();
const leaves = leavesOf(tax, heading);
if (!leaves.length) {
  console.error(`Nhóm ${heading} không có trong biểu thuế.`);
  process.exit(2);
}
const file = join(ROOT, 'data', 'decision-tables', `${heading}.json`);

if (argv.includes('--init')) {
  if (existsSync(file)) {
    console.error(`${file.replace(ROOT + '/', '')} đã có — không ghi đè.`);
    process.exit(1);
  }
  const skeleton = {
    heading,
    titleVi: headingTitle(heading, tax) || '',
    verified: false,
    verifiedBy: null,
    verifiedAt: null,
    essenceTestVi: 'CÂU HỎI BẢN CHẤT: thuộc tính nào tách nhóm này thành các lá? (điền)',
    sourceVi: 'Biểu thuế 2026 nhóm ' + heading + ' + chú giải chương/nhóm (điền nguyên văn căn cứ)',
    inputs: [
      {
        attribute: 'VÍ_DỤ_enum',
        type: 'enum',
        domain: ['a', 'b'],
        labelVi: 'Nhãn hiển thị',
        questionVi: 'Câu hỏi người khai tự trả lời được?',
        detect: { a: ['cụm nhận ra a'], b: ['cụm nhận ra b'] },
      },
      {
        attribute: 'VÍ_DỤ_soMm',
        type: 'number',
        unit: 'mm',
        fromSpec: 'thickness',
        labelVi: 'Chiều dày (mm)',
        questionVi: 'Chiều dày bao nhiêu mm?',
      },
    ],
    hitPolicy: 'PRIORITY',
    rules: [],
  };
  mkdirSync(join(ROOT, 'data', 'decision-tables'), { recursive: true });
  writeFileSync(file, `${JSON.stringify(skeleton, null, 2)}\n`);
  console.log(`✓ đã sinh khung ${file.replace(ROOT + '/', '')} — xoá hai input ví dụ, khai đúng thuộc tính, viết luật cho MỌI lá bên dưới.`);
}

if (argv.includes('--oz')) {
  const aliases = require(join(ROOT, 'data', 'hs-aliases.json')).aliases || [];
  const phrases = aliases.filter((a) => String(a.hsCode).startsWith(heading)).sort((a, b) => b.count - a.count);
  console.log(`\n== ${heading} — ${phrases.length} cụm tờ khai Oz (đề bài cho detect) ==`);
  if (!phrases.length) console.log('   Oz không có tờ khai nhóm này → cửa nghiệm thu dùng ca câu chữ (≥ 60 % lá).');
  dt._reset();
  for (const a of phrases) {
    const r = dt.resolveHeading(heading, { text: a.phrase, parsed: parseCommodityQuery(a.phrase) });
    const verdict = r.status === 'RESOLVED' ? (r.hs === a.hsCode ? `✓ ${r.hs}` : `✗ bảng ${r.hs} ≠ Oz`) : r.status === 'NO_TABLE' ? '(chưa có bảng)' : `? hỏi ${(r.missingFacts || []).map((m) => m.attribute).join('/')}`;
    console.log(`   ${String(a.count).padStart(4)}×  ${a.phrase.padEnd(34)} Oz ${a.hsCode}  ${verdict}`);
  }
  process.exit(0);
}

const tryIdx = argv.indexOf('--try');
if (tryIdx >= 0) {
  const text = argv[tryIdx + 1] || '';
  const fIdx = argv.indexOf('--facts');
  const facts = fIdx >= 0 ? JSON.parse(argv[fIdx + 1] || '{}') : {};
  dt._reset();
  const r = dt.resolveHeading(heading, { text, parsed: parseCommodityQuery(text), facts });
  console.log(`\n== thử "${text}" ==`);
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}

const cov = dt.tableCoverage(heading, tax);
console.log(`\n== ${heading} — ${headingTitle(heading, tax)} ==`);
console.log(`   lá: ${leaves.length} · bảng: ${cov.hasTable ? 'CÓ' : 'CHƯA'} · lá có đường tới: ${cov.covered.length}/${leaves.length}`);
if (cov.hasTable) {
  const errors = dt.validateTable(dt.loadTable(heading), tax);
  if (errors.length) console.log(`   ✗ lỗi cấu trúc: ${errors.join(' | ')}`);
  if (cov.badHs.length) console.log(`   ✗ luật trỏ ra ngoài nhóm: ${cov.badHs.join(', ')}`);
}
console.log('\n   Mọi lá của nhóm (đọc cột EN để thấy điều kiện dòng cha đã bị lược khỏi tiếng Việt):');
for (const hs of leaves) {
  const mark = cov.covered.includes(hs) ? '✓' : '·';
  console.log(`   ${mark} ${hs}  ${(tax[hs].vn || '').trim().slice(0, 70)}`);
  console.log(`              ${(tax[hs].en || '').trim().slice(0, 120)}`);
}
if (cov.missingHs.length) console.log(`\n   CÒN ${cov.missingHs.length} lá chưa có luật: ${cov.missingHs.join(', ')}`);
