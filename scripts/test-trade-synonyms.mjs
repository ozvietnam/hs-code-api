#!/usr/bin/env node
/**
 * Khoá chặt ba thứ mà RFC "Loại khác + tên thương mại" đặt ra, và một thứ RFC
 * không đặt ra nhưng nguy hiểm hơn cả ba.
 *
 *  1. TỪ ĐIỂN TÊN THƯƠNG MẠI phải kéo đúng mã lên đầu cho những câu hỏi mà kho
 *     tờ khai Oz không trả lời được (chương 72 chỉ có 1 bản ghi).
 *
 *  2. MÃ BẪY phải bị loại HẲN, không phải chỉ tụt hạng. Hỏi "tấm thép làm khuôn
 *     nhựa" mà thấy bộ khuôn 8480 nằm hạng hai thì người khai vẫn gật — tên hàng
 *     nghe khớp hoàn toàn.
 *
 *  3. CẢNH BÁO VAT phải hiện. 1.561 mã không được giảm theo NĐ 174/2025; khai
 *     8% cho thép cán nóng là bị truy thu.
 *
 *  4. (thứ RFC không nêu) TỪ ĐIỂN KHÔNG ĐƯỢC LAN SANG CÂU KHÔNG LIÊN QUAN.
 *     "inverter" trong "máy điều hòa inverter" là tính năng, không phải mặt
 *     hàng 8504. Một bảng tra tay sai ở đây thì sai có hệ thống, lần nào cũng
 *     sai — nguy hiểm hơn thống kê sai lẻ tẻ.
 */
import './test-isolate-data.mjs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { lookupTradeTerms, tradeTermStats } = require(join(ROOT, 'lib', 'trade-synonyms.js'));
const { searchCandidates } = require(join(ROOT, 'lib', 'search-utils.js'));
const { breadcrumbOf, contextOf } = require(join(ROOT, 'lib', 'hs-breadcrumb.js'));
const { vatReductionOf, vatWarningTextOf } = require(join(ROOT, 'lib', 'vat-reduction.js'));
const taxData = require(join(ROOT, 'data', 'tax.json'));
const thesaurus = require(join(ROOT, 'data', 'trade-synonyms.json'));

let failed = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('\n== Mọi mã trong từ điển phải có thật trong biểu thuế hiện hành ==');
{
  const dead = [];
  for (const e of thesaurus.entries) for (const c of e.candidates) if (!taxData[c.hs]) dead.push(`${e.id}:${c.hs}`);
  check('không có mã chết', dead.length === 0, dead.join(', '));
  const noSource = thesaurus.entries.filter((e) => !e.sourceVi).map((e) => e.id);
  check('mục nào cũng có dẫn chứng sourceVi', noSource.length === 0, noSource.join(', '));
  const badConf = [];
  for (const e of thesaurus.entries)
    for (const c of e.candidates)
      if (!['high', 'medium', 'low'].includes(c.confidence)) badConf.push(`${e.id}:${c.hs}`);
  check('độ tin cậy dùng đúng ba mức', badConf.length === 0, badConf.join(', '));
  const noWhen = [];
  for (const e of thesaurus.entries)
    for (const c of e.candidates)
      if (!c.whenVi) noWhen.push(`${e.id}:${c.hs}`);
  check('ứng viên nào cũng nói rõ áp dụng KHI NÀO', noWhen.length === 0, noWhen.join(', '));
}

console.log('\n== Câu hỏi thật của khách phải ra đúng mã (kho Oz không trả lời nổi) ==');
{
  // Chương 72 trong kho tờ khai Oz đúng 1 bản ghi — alias tự động bó tay.
  const cases = [
    ['tấm thép làm khuôn nhựa', ['72254090', '72269190']],
    ['thép P20 làm khuôn', ['72254090', '72269190']],
    ['quạt điều hòa hơi nước', ['84796000']],
    ['bình giữ nhiệt chân không', ['96170010']],
    ['biến tần 3 pha', ['85044090', '85044040', '85044030']],
  ];
  for (const [q, want] of cases) {
    const top2 = searchCandidates(q, { topCandidates: 2 }).map((c) => c.hsCode);
    check(`"${q}" → ${want[0]} trong top 2`, top2.some((h) => want.includes(h)), `nhận ${top2.join(',')}`);
  }
}

console.log('\n== Mã bẫy phải bị loại HẲN, không phải tụt hạng ==');
{
  const steel = searchCandidates('tấm thép làm khuôn nhựa', { topCandidates: 50 });
  check('không còn bộ khuôn 8480 nào', steel.every((c) => !c.hsCode.startsWith('8480')));
  check('có ghi lại mã đã loại + lý do', (steel.avoidedByTradeRules || []).length > 0);
  check(
    'lý do loại nói rõ nguyên liệu ≠ thành phẩm',
    (steel.avoidedByTradeRules || []).some((a) => /nguyên liệu|thành hình|thành phẩm/i.test(a.whyVi))
  );

  const flask = searchCandidates('bình giữ nhiệt chân không', { topCandidates: 50 });
  check('bình chân không không lẫn đồ bếp 7323', flask.every((c) => !c.hsCode.startsWith('7323')));

  const cooler = searchCandidates('quạt điều hòa hơi nước', { topCandidates: 50 });
  check('máy làm mát bay hơi không lẫn 8415', cooler.every((c) => !c.hsCode.startsWith('8415')));
  check('máy làm mát bay hơi không lẫn quạt 8414', cooler.every((c) => !c.hsCode.startsWith('8414')));
}

console.log('\n== Từ điển không được lan sang câu không liên quan ==');
{
  // "inverter" ở đây là TÍNH NĂNG của máy lạnh, không phải bộ biến tần 8504.
  const ac = lookupTradeTerms('máy điều hòa inverter 12000 BTU');
  check('không gợi ý 8504 cho điều hòa inverter', ac.matches.every((m) => m.entryId !== 'bien-tan-vfd'));
  check('nói rõ vì sao không áp dụng', ac.excluded.some((x) => x.entryId === 'bien-tan-vfd'));

  const ex = lookupTradeTerms('máy điều hòa inverter 12000 BTU').excluded[0];
  check('lý do nhắc đây là tính năng', /tính năng/i.test(ex?.reasonVi || ''));

  // Mác thép dạng số trần không được dính vào câu đếm số lượng.
  const count = lookupTradeTerms('mua 2311 cái bút bi');
  check('"2311 cái bút bi" không dính mác thép 2311', count.matches.length === 0);

  // Có từ ngữ cảnh thì mới tính.
  const grade = lookupTradeTerms('thép tấm 2311');
  check('"thép tấm 2311" thì tính mác thép', grade.matches.some((m) => m.entryId === 'thep-lam-khuon'));
}

console.log('\n== Mục chưa chắc thì phải nói chưa chắc ==');
{
  const mb = lookupTradeTerms('masterbatch hạt nhựa màu').matches[0];
  check('masterbatch có mục trong từ điển', Boolean(mb));
  check('không mục nào nhận "high"', (mb?.candidates || []).every((c) => c.confidence !== 'high'));
  check('phơi ra nhiều hơn một ứng viên', (mb?.candidates || []).length > 1);
  check('có câu hỏi gạn thông tin', (mb?.askVi || []).length > 0);

  const steel = lookupTradeTerms('thép làm khuôn').matches[0];
  check('thép làm khuôn hỏi rõ khổ rộng 600 mm', (steel?.askVi || []).some((a) => a.includes('600')));
}

console.log('\n== Cảnh báo VAT: NĐ 174/2025 có phụ lục loại trừ ==');
{
  const v = vatReductionOf(taxData['72254090']);
  check('7225.40.90 KHÔNG được giảm VAT', v?.eligible === false);
  check('thuế suất đang áp là 10%', v?.rate === '10');
  check('dẫn đúng nghị định', v?.legalBasis === '174/2025/NĐ-CP');
  check('mức cảnh báo là warning', v?.severity === 'warning');
  check('có câu cảnh báo đọc được', /KHÔNG được giảm/.test(vatWarningTextOf(taxData['72254090']) || ''));

  const ok = vatReductionOf(taxData['96170010']);
  check('9617.00.10 đang ở mức đã giảm 8%', ok?.reduced === true && ok?.rate === '8');
  check('mã được giảm thì không cảnh báo', vatWarningTextOf(taxData['96170010']) === null);

  const blocked = Object.values(taxData).filter((r) => vatReductionOf(r)?.eligible === false).length;
  check('quét được cả nghìn mã bị loại trừ', blocked > 1000, `hiện ${blocked}`);
}

console.log('\n== Breadcrumb: mã "Loại khác" phải nói được mình là gì ==');
{
  const b = breadcrumbOf('72254090');
  check('có chuỗi phân cấp', Boolean(b?.trail));
  check('nhận ra đây là dòng dư', b?.isResidual === true);
  check('nêu phạm vi thật (khổ ≥ 600mm)', /600/.test(b?.scopeVi || ''));
  check('liệt kê mã anh em bị loại trừ', (b?.excludesVi || []).length > 0);
  check('có đủ các cấp phần/chương/nhóm', (b?.levels || []).length >= 4);

  const normal = breadcrumbOf('96170010');
  check('mã có tên mô tả thì không gắn nhãn dư', normal?.isResidual === false);
  check('mã thường vẫn có breadcrumb', Boolean(normal?.trail));

  check('mã không tồn tại trả null', breadcrumbOf('99999999') === null);
  check('mã cụt trả null', breadcrumbOf('7225') === null);
  check('mã thường không có ngữ cảnh dư', contextOf('96170010') === null);
}

console.log('\n== Không phá luồng cũ ==');
{
  const byCode = searchCandidates('8412', { topCandidates: 3 });
  check('gõ mã số vẫn ra đúng nhóm', byCode.length > 0 && byCode.every((c) => c.hsCode.startsWith('8412')));
  check('gõ mã số không dính từ điển', byCode.every((c) => !c.tradeMatch));

  const dup = searchCandidates('thép hợp kim', { topCandidates: 20 });
  check('không trả mã trùng lặp', new Set(dup.map((c) => c.hsCode)).size === dup.length);
}

console.log('\n== Thống kê ==');
{
  const s = tradeTermStats();
  check('từ điển nạp được', s.ok === true);
  console.log(`    ${s.entries} mục, ${s.terms} từ khoá, bản ${s.version}`);
}

if (failed) {
  console.error(`\n❌ ${failed} kiểm tra thất bại\n`);
  process.exit(1);
}
console.log('\n✅ trade-synonyms: tất cả kiểm tra đạt\n');
