#!/usr/bin/env node
/**
 * Bảng quyết định theo nhóm (lib/decision-tables.js + data/decision-tables/*.json).
 *
 *  1. Mọi bảng hợp lệ về cấu trúc: mã lá có thật, thuộc tính trong `when` đã
 *     khai báo, giá trị enum trong domain, số thì có điều kiện so sánh.
 *  2. Mọi lá của nhóm có bảng đều có đường tới (đây là chuẩn nghiệm thu mới,
 *     thay cho "lá nằm trong candidates từ điển").
 *  3. Cách đánh giá: luật "Loại khác" (when rỗng) KHÔNG được thắng chỉ vì
 *     người dùng chưa nói gì — phải hỏi. Đây là chỗ "luật đầu tiên khớp" sai.
 *  4. tests/decision-cases.json: câu người gõ → đúng lá, hoặc hỏi đúng dữ kiện.
 *  5. Sổ tiến độ: nhóm `done` ⇔ có bảng phủ hết lá.
 */
import './test-isolate-data.mjs';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dt = require(join(ROOT, 'lib', 'decision-tables.js'));
const { parseCommodityQuery } = require(join(ROOT, 'lib', 'query-parse.js'));
const taxData = require(join(ROOT, 'data', 'tax.json'));

let failed = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const headings = dt.listTables();
console.log(`\n== Cấu trúc ${headings.length} bảng ==`);
check('có ít nhất một bảng', headings.length >= 1);
for (const h of headings) {
  const table = dt.loadTable(h);
  const errors = dt.validateTable(table, taxData);
  check(`${h}: cấu trúc hợp lệ`, errors.length === 0, errors.slice(0, 4).join(' | '));
  const cov = dt.tableCoverage(h, taxData);
  check(`${h}: mọi lá có đường tới (${cov.covered.length}/${cov.leaves.length})`, cov.missingHs.length === 0, cov.missingHs.slice(0, 6).join(','));
  check(`${h}: không luật nào trỏ ra ngoài nhóm`, cov.badHs.length === 0, cov.badHs.join(','));
}

console.log('\n== Cách đánh giá: chưa biết thì hỏi, không chốt bừa ==');
{
  const r = dt.resolveHeading('8427', { text: 'xe nâng 2 tấn' });
  check('thiếu dữ kiện → INSUFFICIENT chứ không rơi vào lá nào', r.status === 'INSUFFICIENT');
  check('hỏi đúng thuộc tính đang thiếu', r.missingFacts.some((m) => m.attribute === 'selfPropelled'));
  check('câu hỏi bằng tiếng Việt đọc được', r.missingFacts.every((m) => /\?/.test(m.questionVi)));
  check('vẫn liệt kê các lá còn khả dĩ', r.narrowed.length === 3);

  const r2 = dt.resolveHeading('8427', { text: 'xe nâng', facts: { selfPropelled: 'no' } });
  check('dữ kiện tường minh loại được nhánh tự hành → chốt 84279000', r2.status === 'RESOLVED' && r2.hs === '84279000');
  check('có trace luật + nguồn', r2.trace?.[0]?.ruleId && r2.trace[0].source);

  const r3 = dt.resolveHeading('7209', { text: 'thép cuộn cán nguội dày 2mm', parsed: parseCommodityQuery('thép cuộn cán nguội dày 2mm') });
  check('bảng số: bóc "dày 2mm" từ parser', r3.factsUsed?.thicknessMm === 2 && r3.factSources?.thicknessMm === 'spec');
  check('nhánh hiếm (TMBP, gia công thêm) được giả định, không hỏi', r3.factSources?.tmbp === 'assumed' && r3.factSources?.furtherWorked === 'assumed');
  check('chỉ hỏi khổ rộng — thứ duy nhất còn thiếu', r3.status === 'INSUFFICIENT' && r3.missingFacts.map((m) => m.attribute).join(',') === 'widthMm');

  const r4 = dt.resolveHeading('7209', { text: 'thép cuộn cán nguội dày 0,8 ly khổ 1200mm', parsed: parseCommodityQuery('thép cuộn cán nguội dày 0,8 ly khổ 1200mm') });
  check('"0,8 ly" hiểu là 0,8 mm → 72091710', r4.status === 'RESOLVED' && r4.hs === '72091710');

  const r5 = dt.resolveHeading('7209', { text: 'steel coils sheet cold rolled dày 2mm khổ 1000', parsed: parseCommodityQuery('steel coils sheet cold rolled dày 2mm khổ 1000') });
  check('hai cụm dài bằng nhau cùng xuất hiện (coils / sheet) → mâu thuẫn → hỏi dạng', r5.status === 'INSUFFICIENT' && r5.missingFacts.some((m) => m.attribute === 'form'));
  const r5b = dt.resolveHeading('7209', { text: 'thép cuộn cán nguội dạng tấm dày 2mm khổ 1000mm', parsed: parseCommodityQuery('thép cuộn cán nguội dạng tấm dày 2mm khổ 1000mm') });
  check('cụm dài hơn thắng cụm ngắn ("cuộn" 4 > "tấm" 3 → cuộn), không hỏi', r5b.status === 'RESOLVED' && r5b.hs === '72091610');

  check('nhóm không có bảng → NO_TABLE, không ném lỗi', dt.resolveHeading('9999', { text: 'x' }).status === 'NO_TABLE');

  const shape = dt.toResolverShape(r2);
  check('đổi được sang hình dạng resolver cho lib/gir.js', shape?.status === 'RESOLVED' && shape.decidedHs === '84279000' && shape.tableVerified === false);
  check('bảng chưa verified thì không được RULE_TABLE', shape.tableVerified === false);
}

console.log('\n== tests/decision-cases.json ==');
{
  const cases = JSON.parse(readFileSync(join(ROOT, 'tests', 'decision-cases.json'), 'utf8')).cases;
  check('có ca kiểm', cases.length > 0);
  let ok = 0;
  for (const c of cases) {
    const r = dt.resolveHeading(c.heading, { text: c.text || '', parsed: parseCommodityQuery(c.text || ''), facts: c.facts || {} });
    const pass = c.expectHs
      ? r.status === 'RESOLVED' && r.hs === c.expectHs
      : r.status === 'INSUFFICIENT' && (c.expectAsk || []).every((a) => r.missingFacts.some((m) => m.attribute === a));
    if (pass) ok++;
    else check(`${c.id}`, false, `${r.status} ${r.hs || ''} hỏi:${(r.missingFacts || []).map((m) => m.attribute).join(',')}`);
  }
  check(`${ok}/${cases.length} ca đúng`, ok === cases.length);
  // Mọi lá của mỗi bảng phải có ít nhất một ca chốt ra nó.
  for (const h of headings) {
    const hit = new Set(cases.filter((c) => c.heading === h && c.expectHs).map((c) => c.expectHs));
    const leaves = dt.tableCoverage(h, taxData).leaves;
    const miss = leaves.filter((hs) => !hit.has(hs));
    check(`${h}: mọi lá có ca chốt ra nó`, miss.length === 0, miss.join(','));
  }
}

console.log('\n== Cửa nghiệm thu bằng dữ liệu thật (tờ khai Oz / ca câu chữ) ==');
{
  const aliases = require(join(ROOT, 'data', 'hs-aliases.json')).aliases || [];
  const cases = JSON.parse(readFileSync(join(ROOT, 'tests', 'decision-cases.json'), 'utf8')).cases;
  const progPath = join(ROOT, 'data', 'dictionary-progress.json');
  const prog = existsSync(progPath) ? JSON.parse(readFileSync(progPath, 'utf8')) : { headings: {} };
  for (const h of headings) {
    const g = dt.acceptanceGate(h, { aliases, cases, taxData, parse: parseCommodityQuery });
    const isDone = prog.headings?.[h]?.status === 'done';
    const label = `${h} [${g.mode}] ${g.resolved}/${g.n || g.leaves} (${Math.round(g.ratio * 100)}%)${g.disagree?.length ? ` lệch tiền lệ ${g.disagree.length}` : ''}`;
    if (isDone) check(`${label} — done phải qua cửa`, g.pass, g.thresholdVi);
    else console.log(`  · ${label} — ${g.pass ? 'qua' : 'chưa qua'} (${prog.headings?.[h]?.status || 'không trong sổ'})`);
  }
  // Ca kiểm không được là "echo luật": text kiểu "kiểm r-x" + facts đủ để chốt.
  // Bảng nháp (draft) được mang nợ này; bảng done thì không.
  const doneSet = new Set(Object.entries(prog.headings || {}).filter(([, v]) => v.status === 'done').map(([h]) => h));
  const echo = cases.filter((c) => doneSet.has(c.heading) && /^kiểm\s|^kiem\s|^test\s/i.test(String(c.text || '')) && c.facts && Object.keys(c.facts).length);
  check('nhóm done không có ca "echo luật" (text "kiểm r-x" + facts)', echo.length === 0, echo.slice(0, 5).map((c) => c.id).join(', '));
}

console.log('\n== Sổ tiến độ ⇔ bảng ==');
{
  const progPath = join(ROOT, 'data', 'dictionary-progress.json');
  check('có data/dictionary-progress.json', existsSync(progPath));
  const prog = existsSync(progPath) ? JSON.parse(readFileSync(progPath, 'utf8')) : { headings: {} };
  const doneNoTable = Object.entries(prog.headings || {})
    .filter(([h, v]) => v.status === 'done' && !headings.includes(h))
    .map(([h]) => h);
  check('nhóm done nào cũng có bảng quyết định', doneNoTable.length === 0, doneNoTable.join(', '));
  const tableUnlisted = headings.filter((h) => !['done', 'draft', 'claimed'].includes(prog.headings?.[h]?.status));
  check('bảng nào cũng có trong sổ (done / draft / claimed)', tableUnlisted.length === 0, tableUnlisted.join(', '));
}

if (failed) {
  console.error(`\n❌ ${failed} kiểm tra thất bại\n`);
  process.exit(1);
}
console.log('\n✅ decision-tables: tất cả kiểm tra đạt\n');
