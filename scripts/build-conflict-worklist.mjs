#!/usr/bin/env node
/**
 * Xếp hạng CỤM MÃ NÀO ĐÁNG DỰNG BẢNG QUYẾT ĐỊNH TRƯỚC.
 *
 * Bảng quyết định là thứ duy nhất kéo được độ chính xác lên, nhưng mỗi bảng tốn
 * công chuyên gia thật: phải đọc chú giải, đối chiếu tiền lệ, xác định dữ kiện
 * phân biệt. Hệ thống có 11.871 mã — không thể làm hết, nên phải làm ĐÚNG CHỖ.
 *
 * Công cụ này đọc lỗi THẬT từ benchmark (không phải phỏng đoán) và xếp hạng cụm
 * theo mức thiệt hại: cụm nào khiến hệ thống sai nhiều nhất thì lên đầu.
 *
 * Ưu tiên đặc biệt cho lỗi CÙNG NHÓM 4 SỐ: đó là trường hợp hệ thống đã tìm đúng
 * nhóm nhưng chọn sai phân nhóm — chính xác việc mà bảng quyết định giải được,
 * và cũng là khoảng cách giữa "đúng nhóm 64,9%" và "đúng đủ mã 24,6%".
 *
 * Chạy: npm run data:conflict-worklist
 * Ra:   data/conflict-worklist.json
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const REPORT = 'data/accuracy-report-2026-05-28.json';
if (!existsSync(join(root, REPORT))) {
  console.error(`Không thấy ${REPORT} — chạy "npm run bench:accuracy" trước.`);
  process.exit(1);
}

const report = readJson(REPORT);
const tax = readJson('data/tax.json');
const conflicts = readJson('data/conflicts.json');
const tables = readJson('data/conflict-tables.json').tables || {};

// Mã đã được phủ bởi bảng quyết định hiện có — không đề xuất lại.
const covered = new Set();
for (const t of Object.values(tables)) for (const m of t.members || []) covered.add(String(m));

const nameOf = (hs) => (tax[hs]?.vn || '').replace(/^[-\s]+/, '').slice(0, 70);

const errors = report.results.filter((r) => r?.isTop1Correct === false && r?.top1 && r?.decl?.hsCode);

/**
 * Gom lỗi thành cụm. Khoá cụm = cặp (nhóm đúng, nhóm bị đoán) đã sắp xếp, để
 * A→B và B→A tính chung một cụm — vì bảng quyết định giải cả hai chiều.
 */
const clusters = new Map();
for (const e of errors) {
  const truth = String(e.decl.hsCode);
  const pred = String(e.top1);
  const t4 = truth.slice(0, 4);
  const p4 = pred.slice(0, 4);

  // Bỏ qua chương 98: đã xử lý bằng lib/chapter98.js, không cần bảng quyết định.
  if (t4.startsWith('98') || p4.startsWith('98')) continue;

  const sameHeading = t4 === p4;
  const key = sameHeading ? `H:${t4}` : `X:${[t4, p4].sort().join('-')}`;

  const c = clusters.get(key) || {
    key,
    type: sameHeading ? 'cùng nhóm 4 số' : 'khác nhóm',
    headings: sameHeading ? [t4] : [t4, p4].sort(),
    errorCount: 0,
    codesInvolved: new Set(),
    examples: [],
  };
  c.errorCount += 1;
  c.codesInvolved.add(truth);
  c.codesInvolved.add(pred);
  if (c.examples.length < 3) {
    c.examples.push({
      productName: String(e.decl.productName || '').slice(0, 120),
      correctHs: truth,
      correctName: nameOf(truth),
      wrongHs: pred,
      wrongName: nameOf(pred),
      confidence: e.confidence ?? null,
    });
  }
  clusters.set(key, c);
}

/**
 * Điểm ưu tiên. Lỗi cùng nhóm 4 số nhân đôi vì:
 *  (a) bảng quyết định giải được trực tiếp, không cần sửa khâu tìm ứng viên;
 *  (b) đó đúng là khoảng cách 64,9% → 24,6% đang mất.
 * Cụm đã có mã nằm trong bảng hiện tại bị giảm điểm (đã có người lo).
 */
function priority(c) {
  let score = c.errorCount * (c.type === 'cùng nhóm 4 số' ? 2 : 1);
  const alreadyCovered = [...c.codesInvolved].filter((hs) => covered.has(hs)).length;
  if (alreadyCovered) score *= 0.3;
  // Đã được đánh dấu dễ nhầm trong conflicts.json = có dấu hiệu xác nhận từ trước.
  const flagged = [...c.codesInvolved].filter((hs) => conflicts[hs]).length;
  if (flagged) score *= 1.4;
  return Math.round(score * 10) / 10;
}

const ranked = [...clusters.values()]
  .map((c) => ({
    key: c.key,
    type: c.type,
    headings: c.headings,
    errorCount: c.errorCount,
    priorityScore: priority(c),
    codesInvolved: [...c.codesInvolved].sort(),
    alreadyInConflictsJson: [...c.codesInvolved].some((hs) => conflicts[hs]),
    alreadyHasTable: [...c.codesInvolved].some((hs) => covered.has(hs)),
    examples: c.examples,
    // Gợi ý dữ kiện cần hỏi — người soạn bảng điền tiếp.
    suggestedAttributes: [],
  }))
  .sort((a, b) => b.priorityScore - a.priorityScore || b.errorCount - a.errorCount);

const sameHeadingErrors = errors.filter(
  (e) => String(e.decl.hsCode).slice(0, 4) === String(e.top1).slice(0, 4),
).length;

const out = {
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/build-conflict-worklist.mjs',
  source: { report: REPORT, benchmarkDate: report.benchmarkDate, sampleSize: report.sampleSize },
  summary: {
    totalErrors: errors.length,
    sameHeadingErrors,
    sameHeadingPct: errors.length ? Math.round((sameHeadingErrors / errors.length) * 100) : 0,
    clustersFound: ranked.length,
    tablesExisting: Object.keys(tables).length,
    codesCoveredByTables: covered.size,
    totalHsCodes: Object.keys(tax).length,
    coveragePct: Number(((covered.size / Object.keys(tax).length) * 100).toFixed(3)),
  },
  howToUse:
    'Lấy cụm từ trên xuống. Với mỗi cụm: đọc chú giải nhóm liên quan trong ' +
    'data/chu-giai-heading.json, xác định DỮ KIỆN phân biệt, rồi soạn bảng vào ' +
    'data/conflict-tables.json theo mẫu có sẵn (mỗi rule cần gir + reasonVi + source). ' +
    'Người ngoài đóng góp qua data/community/ — xem CONTRIBUTING.md.',
  clusters: ranked,
};

const outPath = join(root, 'data', 'conflict-worklist.json');
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);

console.log('Đã ghi', outPath);
console.log(`\nĐộ phủ hiện tại: ${covered.size}/${Object.keys(tax).length} mã (${out.summary.coveragePct}%) qua ${Object.keys(tables).length} bảng`);
console.log(`Lỗi cùng nhóm 4 số: ${sameHeadingErrors}/${errors.length} (${out.summary.sameHeadingPct}%) — đây là phần bảng quyết định giải được`);
console.log('\n=== 10 CỤM ĐÁNG LÀM TRƯỚC ===');
for (const c of ranked.slice(0, 10)) {
  const flags = [c.alreadyInConflictsJson ? 'đã flag' : null, c.alreadyHasTable ? 'đã có bảng' : null]
    .filter(Boolean).join(', ');
  console.log(
    `${String(c.priorityScore).padStart(5)} | ${c.headings.join(' vs ').padEnd(11)} | ${c.errorCount} lỗi | ${c.type}${flags ? ` (${flags})` : ''}`,
  );
  console.log(`        ${c.examples[0]?.productName?.slice(0, 78) || ''}`);
  console.log(`        đúng ${c.examples[0]?.correctHs} "${c.examples[0]?.correctName}" ≠ đoán ${c.examples[0]?.wrongHs} "${c.examples[0]?.wrongName}"`);
}
