#!/usr/bin/env node
// Test offline cho harness hs-agent: không mạng, không ghi data/ (rule bất biến #8).
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseListing, parseTitle, classifyDoc, hsCodesIn, refKey, isKtcnRegulation } from '../lib/vbpl.mjs';
import { bieuThueTheoNgay, codeAppears, coverage, extractSoHieu, girRuleField, scrub, verifyRecords } from '../lib/extract.mjs';
import { createRunBudget, BudgetExceeded } from '../lib/budget.mjs';
import { matchAny, push, classifyChanges } from '../lib/workspace.mjs';
import { mkdtempSync, writeFileSync, mkdirSync, appendFileSync, existsSync, statSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { parseBench } from '../jobs/bench-night.mjs';
import { findIssues, reconcile, ownerOf } from '../jobs/watchdog.mjs';
import { parseBody, parseJsonLoose } from '../lib/llm.mjs';
import { pickItems } from '../lib/queue-pick.mjs';
import { closeNoConclusion } from '../lib/queue-close.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0;
let fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${detail}`); }
};

// --- nguồn vbpl.ts24
const listing = `<ul><li><a href="/support/solutions/articles/16000240536-cong-van-21591" class="c-link">- Công văn 21591/CHQ-NVTHQ ngày 11/09/2026 Kiến nghị hướng dẫn tỷ giá</a></li>
<li><a href="/support/solutions/articles/16000240400-qd-2174">- Quyết định 2174/QĐ-BCT ngày 07/09/2026 Áp dụng thuế chống bán phá giá chính thức đối với sản phẩm gạch gốm sứ ốp lát</a></li>
<li><a href="/support/solutions/articles/16000238479-cv">- Công văn 18391/CHQ-NVTHQ ngày 02/07/2026 Phân loại hàng hóa</a></li>
<li><a href="/support/solutions/articles/16000238479-cv">- trùng</a></li>
<li><a href="/support/solutions/articles/16000238609-tt">- Thông tư 85/2026/TT-BTC ngày 30/06/2026 Quy định về phân loại hàng hóa</a></li></ul>`;
const items = parseListing(listing);
t('parseListing: 4 văn bản, bỏ trùng id', items.length === 4, JSON.stringify(items.map((i) => i.id)));
t('parseListing: bỏ gạch đầu dòng, url đầy đủ', items[0].title.startsWith('Công văn') && items[0].url.endsWith('/articles/16000240536'));
const p1 = parseTitle(items[2].title);
t('parseTitle: số hiệu + ngày ISO', p1.ref === '18391/CHQ-NVTHQ' && p1.date === '2026-07-02' && p1.year === 2026 && p1.subject === 'Phân loại hàng hóa', JSON.stringify(p1));
t('parseTitle: tiêu đề lạ → không vỡ', parseTitle('Bản tin tháng 9').ref === null);
t('classifyDoc: công văn phân loại', classifyDoc(p1) === 'classification');
t('classifyDoc: chống bán phá giá', classifyDoc(parseTitle(items[1].title)) === 'trade-remedy');
t('classifyDoc: thông tư phân loại là quy định, không vào hàng đợi trích', classifyDoc(parseTitle(items[3].title)) === 'regulation');
t('classifyDoc: văn bản hợp nhất thông tư ghi "Công văn" không phải phân loại', classifyDoc(parseTitle('Công văn 73/2026/VBHN-TT-BCT ngày 14/09/2026 Hợp nhất Thông tư sửa đổi Danh mục chi tiết theo mã số HS')) !== 'classification');
t('classifyDoc: quyết định cơ cấu tổ chức Cục Phòng vệ thương mại → không phải phòng vệ', classifyDoc(parseTitle('Quyết định 2230/QĐ-BCT ngày 11/09/2026 Quy định chức năng nhiệm vụ quyền hạn và cơ cấu tổ chức của Cục Phòng vệ thương mại')) !== 'trade-remedy');
t('classifyDoc: công văn tỷ giá → other', classifyDoc(parseTitle(items[0].title)) === 'other');
const ktcnTitle = parseTitle('Thông tư 36/2026/TT-BKHCN ngày 30/06/2026 Ban hành Danh mục sản phẩm, hàng hóa có mức độ rủi ro trung bình, mức độ rủi ro cao thuộc trách nhiệm quản lý của Bộ Khoa học và Công nghệ');
t('classifyDoc: thông tư danh mục rủi ro (KTCN 2026) là quy định', classifyDoc(ktcnTitle) === 'regulation', JSON.stringify(ktcnTitle));
t('isKtcnRegulation: danh mục rủi ro → true', isKtcnRegulation(ktcnTitle));
t('isKtcnRegulation: thông tư liên tịch danh mục kiểm tra → true', isKtcnRegulation({ docType: 'Thông tư liên tịch', subject: 'Danh mục hàng hóa phải kiểm tra chuyên ngành' }));
t('isKtcnRegulation: thông tư biểu thuế → false', !isKtcnRegulation(parseTitle('Thông tư 31/2022/TT-BTC ngày 08/06/2022 Ban hành Danh mục hàng hóa xuất khẩu, nhập khẩu Việt Nam')));
t('refKey: QĐ = QD, hoa', refKey('2174/QĐ-bct') === '2174/QD-BCT');
t('hsCodesIn: dạng có chấm, không bắt số lượng', JSON.stringify(hsCodesIn('mã 6907.21.23 và 6907.22; 3177.90 m2 không phải; năm 2026')) === JSON.stringify(['69072123', '690722', '317790']), JSON.stringify(hsCodesIn('mã 6907.21.23 và 6907.22; 3177.90 m2')));

// --- kiểm chứng trích xuất
const text = `Số: 43049/CHQ-NVTHQ. Kính gửi: Công ty TNHH Táo Xanh Việt Nam. Mặt hàng xem xét là Thiết bị sạc không dây MagSafe Charger, nhãn hiệu Apple, nhận nguồn điện một chiều, có mạch nghịch lưu chuyển đổi DC thành dòng xoay chiều tần số cao đi qua cuộn dây phát tạo từ trường.
Căn cứ Chú giải 5 Chương 85, mặt hàng thuộc nhóm 85.04, phân nhóm 8504.40, mã số 8504.40.90 "- - - Loại khác". Không thuộc mã 8517.62.59.`;
t('codeAppears: 8504.40.90 = 85044090', codeAppears('85044090', text));
t('codeAppears: mã bịa không có', !codeAppears('85044019', text));
t('codeAppears: không khớp giữa chuỗi số dài hơn', !codeAppears('8504', 'số 185044'));
// Nhóm/phân nhóm trong công văn viết theo CẶP 2 số ("nhóm 85.01", "phân nhóm 39.19").
// Khớp theo nhóm 4-2-2 sẽ loại oan mọi văn bản chỉ kết luận tới nhóm.
t('codeAppears: nhóm viết "85.01" → mã 8501 khớp', codeAppears('8501', 'phân loại thuộc nhóm 85.01 "Máy và thiết bị điện"'));
t('codeAppears: nhóm viết "8501" (không chấm) → mã 8501 khớp', codeAppears('8501', 'thuộc nhóm 8501'));
t('codeAppears: phân nhóm viết "39.19" → mã 3919 khớp', codeAppears('3919', 'đã in thì phù hợp phân loại thuộc nhóm 39.19'));
t('codeAppears: phân nhóm viết "85.44" → mã 8544 khớp', codeAppears('8544', 'thuộc nhóm 85.44 "Dây điện, cáp điện"'));
t('codeAppears: nhóm 85.01 KHÔNG khớp mã 85044090 (khác hàng)', !codeAppears('85044090', 'thuộc nhóm 85.01'));
t('codeAppears: mã 10 số theo cặp vẫn khớp', codeAppears('2517410010', 'mã 2517.41.00.10'));
t('codeAppears: mã 8 số đọc từ mã 10 số vẫn khớp', codeAppears('25174100', 'mã 2517.41.00.10'));
t('coverage: mô tả lấy từ văn bản ≥ 0,6', coverage('Thiết bị sạc không dây MagSafe Charger có mạch nghịch lưu, cuộn dây phát', text) >= 0.6);
t('coverage: mô tả bịa < 0,6', coverage('Máy xúc lật bánh lốp động cơ diesel tải trọng 5 tấn', text) < 0.6);
t('girRule: nhiều quy tắc → giữ quy tắc đầu, đúng mẫu validate-community', girRuleField('GIR 3(b) và GIR 6').girRule === 'GIR 3(b)' && girRuleField('gir 1, GIR 6').girRule === 'GIR 1');
t('girRule: không phải GIR 1–6 → bỏ trường', !('girRule' in girRuleField('GIR 7')) && !('girRule' in girRuleField('Quy tắc 1')) && !('girRule' in girRuleField(null)));
t('scrub: bỏ tên doanh nghiệp', !/công ty|tnhh/i.test(scrub('Thiết bị sạc của Công ty TNHH Táo Xanh, hàng mới')));
const klMagsafe = 'Căn cứ Chú giải 5 Chương 85, mặt hàng thuộc nhóm 85.04, phân nhóm 8504.40, mã số 8504.40.90 "- - - Loại khác".';
const v = verifyRecords({
  coKetLuan: true,
  records: [
    { hsCode: '8504.40.90', description: 'Thiết bị sạc không dây MagSafe Charger nhãn hiệu Apple, có mạch nghịch lưu chuyển đổi DC thành xoay chiều tần số cao, cuộn dây phát', ketLuan: klMagsafe, reasonVi: 'Chú giải 5 Chương 85', girRule: 'GIR 1', confusedWith: ['85176259', '85176299'] },
    { hsCode: '85044019', description: 'Thiết bị sạc không dây MagSafe Charger nhãn hiệu Apple có mạch nghịch lưu', ketLuan: klMagsafe, reasonVi: '' },
    { hsCode: '85044090', description: 'Máy xúc lật bánh lốp động cơ diesel tải trọng 5 tấn dùng trong xây dựng', ketLuan: klMagsafe },
  ],
}, { text, ref: '43049/CHQ-NVTHQ', date: '2025-12-16', url: 'https://vbpl.ts24.com.vn/support/solutions/articles/16000230222', repoDir: repo });
t('verifyRecords: giữ đúng 1 bản ghi thật', v.records.length === 1 && v.records[0].hsCode === '85044090', JSON.stringify(v));
t('verifyRecords: bỏ mã không có trong văn bản', v.rejected.some((r) => r.hsCode === '85044019' && /nguyên văn/.test(r.why)));
t('verifyRecords: bỏ mô tả bịa', v.rejected.some((r) => /khớp/.test(r.why)));
t('verifyRecords: confusedWith giữ mã văn bản nêu (8517.62.59), bỏ mã bịa (8517.62.99)', JSON.stringify(v.records[0].confusedWith) === '["85176259"]', JSON.stringify(v.records[0].confusedWith));
t('verifyRecords: số hiệu/ngày/url từ nguồn', v.records[0].source.reference === '43049/CHQ-NVTHQ' && v.records[0].source.issuedDate === '2025-12-16' && v.records[0].source.type === 'TB-TCHQ');
t('verifyRecords: không kết luận → 0 bản ghi', verifyRecords({ coKetLuan: false, lyDoKhongKetLuan: 'không đủ cơ sở', records: [] }, { text, ref: 'x', repoDir: repo }).noConclusion === 'không đủ cơ sở');
const leak = verifyRecords({ coKetLuan: true, records: [{ hsCode: '85044090', description: 'Thiết bị sạc không dây MagSafe Charger mạch nghịch lưu cuộn dây phát MST 0101234567', ketLuan: klMagsafe, reasonVi: '' }] }, { text: `${text} 0101234567`, ref: '43049/CHQ-NVTHQ', date: '2025-12-16', url: 'https://a.b/1', repoDir: repo });
t('verifyRecords: dính MST → bỏ', leak.records.length === 0 && /riêng tư/.test(leak.rejected[0]?.why || ''), JSON.stringify(leak));

const text10 = 'Số: 123/TB-TCHQ. Mặt hàng bột đá cẩm thạch trắng calcium carbonate nghiền mịn dùng làm chất độn thuộc mã 2517.41.00.10';
const v10 = verifyRecords({ coKetLuan: true, records: [{ hsCode: '2517.41.00.10', description: 'Bột đá cẩm thạch trắng calcium carbonate nghiền mịn dùng làm chất độn', ketLuan: 'Mặt hàng bột đá cẩm thạch trắng calcium carbonate nghiền mịn dùng làm chất độn thuộc mã 2517.41.00.10', reasonVi: '' }] }, { text: text10, ref: '123/TB-TCHQ', date: '2025-12-16', url: 'https://a.b/1', repoDir: repo });
t('verifyRecords: mã 10 số (dòng thống kê cũ) → ghi 8 số hợp schema', v10.records.length === 1 && v10.records[0].hsCode === '25174100', JSON.stringify(v10));

// --- hồi quy J2 (OZV-2445): evidence.soHieu, evidence.ketLuan, attributes.bieuThue (ca đạt + ca phải bỏ)
{
  t('bieuThueTheoNgay: 2012 (<2018-01-01), 2017 (<2022-12-01), 2022 (>=2022-12-01), sai định dạng → null',
    bieuThueTheoNgay('2017-12-31') === '2012'
    && bieuThueTheoNgay('2018-01-01') === '2017'
    && bieuThueTheoNgay('2022-11-30') === '2017'
    && bieuThueTheoNgay('2022-12-01') === '2022'
    && bieuThueTheoNgay('2025-04-09') === '2022'
    && bieuThueTheoNgay('09/04/2025') === null
    && bieuThueTheoNgay('') === null);

  t('extractSoHieu: lấy nguyên văn "Số: …" từ đầu văn bản, không bắt nhầm địa chỉ hoặc công văn DN',
    extractSoHieu(text) === 'Số: 43049/CHQ-NVTHQ'
    && extractSoHieu('Địa chỉ: Số 11D đường Doãn Kế Thiện\nSố: 19554/CHQ-NVTHQ\nKính gửi: ... công văn số 10/2025AVIC') === 'Số: 19554/CHQ-NVTHQ'
    && extractSoHieu('Văn bản không có dòng số hiệu chuẩn') === null);

  const t0 = Date.now();
  extractSoHieu(`${'Số: '.repeat(40000)}12345 / ${'CHQ-'.repeat(40000)}`);
  const redosMs = Date.now() - t0;
  t('extractSoHieu: ReDoS 40.000 từ lặp < 2000ms', redosMs < 2000, `${redosMs}ms`);

  // Ca đạt cho cả 3 trường trên bản ghi v.records[0]
  t('verifyRecords (đạt): điền đúng evidence.soHieu nguyên văn từ toàn văn', v.records[0].evidence?.soHieu === 'Số: 43049/CHQ-NVTHQ', JSON.stringify(v.records[0].evidence));
  t('verifyRecords (đạt): điền đúng evidence.ketLuan nguyên văn chứa mã và nối vào reasonVi',
    v.records[0].evidence?.ketLuan === klMagsafe && v.records[0].reasonVi.includes(klMagsafe), JSON.stringify(v.records[0]));
  t('verifyRecords (đạt): điền đúng attributes.bieuThue theo ngày ký',
    v.records[0].attributes?.bieuThue === '2022', JSON.stringify(v.records[0].attributes));

  const baseRec = {
    hsCode: '8504.40.90',
    description: 'Thiết bị sạc không dây MagSafe Charger nhãn hiệu Apple, có mạch nghịch lưu chuyển đổi DC thành xoay chiều tần số cao, cuộn dây phát',
    ketLuan: klMagsafe,
    reasonVi: 'Căn cứ Chú giải 5 Chương 85 và Thông tư 31/2022/TT-BTC.',
  };

  // Ca đạt: ketLuan có xuống dòng / khoảng trắng thừa trong văn bản gốc → chuẩn hoá khoảng trắng vẫn khớp
  const multilineText = text.replace('phân nhóm 8504.40, mã số', 'phân nhóm 8504.40,\n   mã số');
  const vMulti = verifyRecords({ coKetLuan: true, records: [baseRec] }, { text: multilineText, ref: '43049/CHQ-NVTHQ', date: '2020-05-10', url: 'https://a.b/1', repoDir: repo });
  t('verifyRecords (đạt): ketLuan khớp toàn văn sau chuẩn hoá khoảng trắng + bieuThue 2017',
    vMulti.records.length === 1 && vMulti.records[0].attributes?.bieuThue === '2017', JSON.stringify(vMulti));

  // Ca phải bỏ 1 (evidence.soHieu): toàn văn thiếu dòng "Số: …"
  const textNoSoHieu = text.replace('Số: 43049/CHQ-NVTHQ.', 'Công văn phân loại hàng hóa.');
  const vNoSo = verifyRecords({ coKetLuan: true, records: [baseRec] }, { text: textNoSoHieu, ref: '43049/CHQ-NVTHQ', date: '2025-12-16', url: 'https://a.b/1', repoDir: repo });
  t('verifyRecords (bỏ - evidence.soHieu): toàn văn không có dòng "Số: …" → bỏ bản ghi',
    vNoSo.records.length === 0 && /soHieu/.test(vNoSo.rejected[0]?.why || ''), JSON.stringify(vNoSo));

  // Ca phải bỏ 2 (evidence.soHieu): dòng "Số: …" trong trang đã mở khác ref tiêu đề
  const vWrongSo = verifyRecords({ coKetLuan: true, records: [baseRec] }, { text, ref: '99999/CHQ-NVTHQ', date: '2025-12-16', url: 'https://a.b/1', repoDir: repo });
  t('verifyRecords (bỏ - evidence.soHieu): Số: trong toàn văn khác ref nguồn → bỏ bản ghi',
    vWrongSo.records.length === 0 && /soHieu.*không khớp/.test(vWrongSo.rejected[0]?.why || ''), JSON.stringify(vWrongSo));

  // Ca phải bỏ 3 (evidence.ketLuan): thiếu hoặc ngắn < 30 ký tự
  const vShortKl = verifyRecords({ coKetLuan: true, records: [{ ...baseRec, ketLuan: 'mã số 8504.40.90' }] }, { text, ref: '43049/CHQ-NVTHQ', date: '2025-12-16', url: 'https://a.b/1', repoDir: repo });
  t('verifyRecords (bỏ - evidence.ketLuan): ketLuan ngắn < 30 ký tự → bỏ bản ghi',
    vShortKl.records.length === 0 && /ketLuan.*30 ký tự/.test(vShortKl.rejected[0]?.why || ''), JSON.stringify(vShortKl));

  // Ca phải bỏ 4 (evidence.ketLuan): LLM tự viết lại câu kết luận không phải chuỗi con nguyên văn của toàn văn
  const vFakeKl = verifyRecords({ coKetLuan: true, records: [{ ...baseRec, ketLuan: 'Do đó mặt hàng sạc không dây MagSafe Charger được phân loại vào mã số 8504.40.90.' }] }, { text, ref: '43049/CHQ-NVTHQ', date: '2025-12-16', url: 'https://a.b/1', repoDir: repo });
  t('verifyRecords (bỏ - evidence.ketLuan): ketLuan không phải chuỗi con của toàn văn → bỏ bản ghi',
    vFakeKl.records.length === 0 && /ketLuan.*chuỗi con/.test(vFakeKl.rejected[0]?.why || ''), JSON.stringify(vFakeKl));

  // Ca phải bỏ 5 (evidence.ketLuan): câu có nguyên văn trong toàn văn nhưng không chứa mã HS kết luận
  const vNoCodeKl = verifyRecords({ coKetLuan: true, records: [{ ...baseRec, ketLuan: 'Mặt hàng xem xét là Thiết bị sạc không dây MagSafe Charger, nhãn hiệu Apple, nhận nguồn điện một chiều' }] }, { text, ref: '43049/CHQ-NVTHQ', date: '2025-12-16', url: 'https://a.b/1', repoDir: repo });
  t('verifyRecords (bỏ - evidence.ketLuan): ketLuan không chứa mã HS kết luận → bỏ bản ghi',
    vNoCodeKl.records.length === 0 && /ketLuan.*không chứa mã/.test(vNoCodeKl.rejected[0]?.why || ''), JSON.stringify(vNoCodeKl));

  // Ca phải bỏ 6 (attributes.bieuThue): thiếu ngày hoặc ngày không đúng YYYY-MM-DD
  const vNoDate = verifyRecords({ coKetLuan: true, records: [baseRec] }, { text, ref: '43049/CHQ-NVTHQ', date: '', url: 'https://a.b/1', repoDir: repo });
  t('verifyRecords (bỏ - attributes.bieuThue): thiếu issuedDate hợp lệ → bỏ bản ghi',
    vNoDate.records.length === 0 && /bieuThue/.test(vNoDate.rejected[0]?.why || ''), JSON.stringify(vNoDate));

  // Ca hồi quy dựng từ đúng 3 bản ghi J2 bị đỏ cổng validate-community ngày 28/11 (1392/CHQ-NVTHQ → 8501, 685/TCHQ-TXNK → 3919, 684/TCHQ-TXNK → 3919)
  const j2Docs = [
    {
      ref: '1392/CHQ-NVTHQ',
      date: '2025-04-09',
      url: 'https://vbpl.ts24.com.vn/support/solutions/articles/16000211253',
      text: `Số: 1392/CHQ-NVTHQ\nV/v phân loại "xy lanh điện"\nHà Nội, ngày 09 tháng 4 năm 2025\n1. Đặc điểm hàng hóa: mặt hàng "xy lanh điện" được sử dụng cho các bộ phận vận hành máy móc công nghiệp, là sản phẩm hoàn chỉnh, có cấu tạo gồm: phần động cơ điện (không thể tháo rời là bộ phận tạo ra chuyển động quay) và phần xy lanh (phần tạo ra chuyển động tuyến tính). Bên trong xy lanh có các bộ phận như: trục vít (screw shaft), thanh cần (rod), hộp số (gear).\n2. Về phân loại: Căn cứ Thông tư số 31/2022/TT-BTC ngày 08/6/2022. Tham khảo Chú giải Chi tiết nhóm 85.01; Đặc điểm của hàng hóa nêu tại điểm 1 phù hợp phân loại vào nhóm 85.01, mã số tùy thuộc vào đặc điểm (ví dụ: một pha hay ba pha, xoay chiều hay một chiều...) và công suất của động cơ.`,
      llm: {
        coKetLuan: true,
        records: [{
          hsCode: '8501',
          description: 'Xy lanh điện sử dụng cho các bộ phận vận hành máy móc công nghiệp, sản phẩm hoàn chỉnh gồm phần động cơ điện không thể tháo rời và phần xy lanh có trục vít, thanh cần, hộp số',
          ketLuan: 'Đặc điểm của hàng hóa nêu tại điểm 1 phù hợp phân loại vào nhóm 85.01, mã số tùy thuộc vào đặc điểm (ví dụ: một pha hay ba pha, xoay chiều hay một chiều...) và công suất của động cơ.',
          reasonVi: 'Căn cứ Thông tư số 31/2022/TT-BTC và Chú giải Chi tiết nhóm 85.01.',
        }],
      },
    },
    {
      ref: '685/TCHQ-TXNK',
      date: '2025-02-14',
      url: 'https://vbpl.ts24.com.vn/support/solutions/articles/16000207978',
      text: `Số: 685/TCHQ-TXNK\nV/v thông báo kết quả phân loại\nHà Nội, ngày 14 tháng 02 năm 2025\nTổng cục Hải quan nhận thấy mặt hàng có tên khai báo nhãn dính bằng nhựa đã in (in thông tin sản phẩm).\n2. Tổng cục Hải quan đã có công văn số 624/TCHQ-TXNK ngày 11/02/2025 hướng dẫn về mã số hàng hóa đối với mặt hàng nhãn nhựa tự dính, đã in. Theo đó, trường hợp mặt hàng có bản chất là dạng hình học phẳng, tự dính, bằng plastic, đã in thì phù hợp phân loại thuộc nhóm 39.19.`,
      llm: {
        coKetLuan: true,
        records: [{
          hsCode: '3919',
          description: 'Nhãn dính bằng nhựa đã in thông tin sản phẩm, bản chất là dạng hình học phẳng, tự dính, bằng plastic, đã in',
          ketLuan: 'Theo đó, trường hợp mặt hàng có bản chất là dạng hình học phẳng, tự dính, bằng plastic, đã in thì phù hợp phân loại thuộc nhóm 39.19.',
          reasonVi: 'Hướng dẫn về mã số hàng hóa đối với mặt hàng nhãn nhựa tự dính, đã in theo công văn số 624/TCHQ-TXNK.',
        }],
      },
    },
    {
      ref: '684/TCHQ-TXNK',
      date: '2025-02-14',
      url: 'https://vbpl.ts24.com.vn/support/solutions/articles/16000207977',
      text: `Số: 684/TCHQ-TXNK\nV/v thông báo kết quả phân loại\nHà Nội, ngày 14 tháng 02 năm 2025\nTổng cục Hải quan xem xét mặt hàng có tên khai báo nhãn dán dùng để dán lên lốp xe đạp.\n2. Tổng cục Hải quan đã có công văn số 624/TCHQ-TXNK ngày 11/02/2025 hướng dẫn về mã số hàng hóa đối với mặt hàng nhãn nhựa tự dính, đã in. Theo đó, trường hợp mặt hàng có bản chất là dạng hình học phẳng, tự dính, bằng plastic, đã in thì phù hợp phân loại thuộc nhóm 39.19.`,
      llm: {
        coKetLuan: true,
        records: [{
          hsCode: '3919',
          description: 'Nhãn dán dùng để dán lên lốp xe đạp, bản chất là dạng hình học phẳng, tự dính, bằng plastic, đã in',
          ketLuan: 'Theo đó, trường hợp mặt hàng có bản chất là dạng hình học phẳng, tự dính, bằng plastic, đã in thì phù hợp phân loại thuộc nhóm 39.19.',
          reasonVi: 'Hướng dẫn về mã số hàng hóa đối với mặt hàng nhãn nhựa tự dính, đã in theo công văn số 624/TCHQ-TXNK.',
        }],
      },
    },
  ];
  const j2Records = [];
  for (const d of j2Docs) {
    const res = verifyRecords(d.llm, { text: d.text, ref: d.ref, date: d.date, url: d.url, repoDir: repo });
    j2Records.push(...res.records);
  }
  t('hồi quy 3 bản ghi J2 (1392, 685, 684): cả 3 đều qua verifyRecords với đủ soHieu, ketLuan, bieuThue=2022',
    j2Records.length === 3
    && j2Records.every((r) => r.attributes?.bieuThue === '2022' && r.evidence?.soHieu?.startsWith('Số: ') && r.evidence?.ketLuan?.length >= 30),
    JSON.stringify(j2Records));

  // Chạy cổng thật scripts/validate-community.mjs trên tệp tạm chứa 3 bản ghi J2 này
  const tmpDir = mkdtempSync(join(tmpdir(), 'j2-val-'));
  const tmpFile = join(tmpDir, 'agent-vbpl-2026-11-28.json');
  writeFileSync(tmpFile, JSON.stringify({
    kind: 'precedent',
    contributor: { name: 'hs-agent (vps-hsagent)', github: 'ozvietnam' },
    license: 'CC-BY-SA-4.0',
    submittedAt: '2026-11-28',
    note: 'Hồi quy J2 OZV-2445',
    records: j2Records,
  }, null, 2));
  let gateOut = '';
  let gateOk = false;
  try {
    gateOut = execFileSync(process.execPath, [join(repo, 'scripts/validate-community.mjs'), tmpFile], { encoding: 'utf8', stdio: 'pipe' });
    gateOk = /0 lỗi/.test(gateOut);
  } catch (e) {
    gateOut = (e.stdout || '') + (e.stderr || '') + e.message;
  }
  t('hồi quy 3 bản ghi J2 (1392, 685, 684): qua cổng scripts/validate-community.mjs với 0 lỗi', gateOk, gateOut);
}

// --- ngân sách, vùng ghi, nhánh
const b = createRunBudget({ fetch: 2 });
b.spend('fetch'); b.spend('fetch');
let threw = false;
try { b.spend('fetch'); } catch (e) { threw = e instanceof BudgetExceeded; }
t('budget: vượt trần → BudgetExceeded', threw);
const allow = ['data/community/tb-tchq/*.json', 'data/precedents.json', 'public/llms.txt'];
t('matchAny: tệp community được phép', matchAny('data/community/tb-tchq/agent-vbpl-2026-09-25.json', allow));
t('matchAny: lib/ bị chặn', !matchAny('lib/search-utils.js', allow));
t('matchAny: * không vượt thư mục', !matchAny('data/community/tb-tchq/sub/x.json', allow));
let refused = false;
try { push('/tmp', 'main'); } catch (e) { refused = /từ chối/.test(e.message); }
t('push: từ chối nhánh main ngay trong code', refused);

// Tách thay đổi git theo vùng cho phép (repo tạm, không đụng data/ thật).
const g = mkdtempSync(join(tmpdir(), 'hsagent-'));
const sh = (...a) => execFileSync('git', a, { cwd: g, stdio: 'pipe' });
sh('init', '-q');
mkdirSync(join(g, 'data/community/tb-tchq'), { recursive: true });
writeFileSync(join(g, 'data/precedents.json'), '{}');
writeFileSync(join(g, 'README.md'), 'a');
sh('add', '-A'); sh('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'i');
appendFileSync(join(g, 'data/precedents.json'), ' ');
appendFileSync(join(g, 'README.md'), 'b');
writeFileSync(join(g, 'data/community/tb-tchq/agent-vbpl-x.json'), '{}');
writeFileSync(join(g, 'ghi chú.txt'), 'x');
const cc = classifyChanges(g, allow);
t('classifyChanges: tệp đầu danh sách không bị cắt ký tự', cc.allowed.includes('data/precedents.json'), JSON.stringify(cc));
t('classifyChanges: tệp đã theo dõi ngoài vùng → chặn', JSON.stringify(cc.blockedTracked) === '["README.md"]', JSON.stringify(cc));
t('classifyChanges: tệp mới ngoài vùng → bỏ qua, không commit', cc.ignoredUntracked.includes('ghi chú.txt') && cc.allowed.includes('data/community/tb-tchq/agent-vbpl-x.json'), JSON.stringify(cc));

// --- đo đêm
const benchOut = `--- Top-1 ---\n  Đúng chương (2 số)         -    39.7%        -\n  Đúng nhóm  (4 số)          -    22.1%        -\n  Đúng phân nhóm (6 số)      -    15.1%        -\n  Đúng đủ mã (8 số)          -    10.4%        -\n--- Top-3 ---\n  Đúng chương (2 số)     54.0%    54.4%    +0.4\n  Đúng nhóm  (4 số)          -    30.1%        -\n  Đúng phân nhóm (6 số)      -    22.8%        -\n  Đúng đủ mã (8 số)          -    15.7%        -`;
const pb = parseBench(benchOut);
t('parseBench: đọc 4 mức × 2, lấy cột "sau"', pb && pb.top1[0] === 39.7 && pb.top3[0] === 54.4 && pb.top3[3] === 15.7, JSON.stringify(pb));


// --- quản đốc (§2.10): im lặng, kẹt, sổ đã-báo, giờ yên
{
  const HH = 3600 * 1000;
  const now = Date.parse('2026-09-25T10:00:00Z');
  const cfgW = { expectHours: { 'legal-watch': 26, digest: 26 }, stuckHours: 36, _llmCount: 0 };
  const runsW = [
    { job: 'legal-watch', status: 'ok', startedAt: new Date(now - 30 * HH).toISOString() },
    { job: 'digest', status: 'ok', startedAt: new Date(now - 2 * HH).toISOString() },
    { job: 'precedent-extract', status: 'waiting', startedAt: new Date(now - 50 * HH).toISOString(), lines: ['chưa có khóa LLM'] },
    { job: 'precedent-extract', status: 'waiting', startedAt: new Date(now - 2 * HH).toISOString(), lines: ['chưa có khóa LLM'] },
  ];
  const envW = { TELEGRAM_BOT_TOKEN: 'x', TELEGRAM_CHAT_ID: 'y', GITHUB_TOKEN: 'z' };
  const iss = findIssues({ runs: runsW, queue: { items: [] }, env: envW, cfg: { ...cfgW, expectHours: { ...cfgW.expectHours, 'precedent-extract': 26 } }, now });
  t('quản đốc: job quá hạn → im (critical)', iss.some((i) => i.key === 'silent:legal-watch' && i.level === 'critical'), JSON.stringify(iss.map((i) => i.key)));
  t('quản đốc: job còn hạn → không báo im', !iss.some((i) => i.key === 'silent:digest'));
  t('quản đốc: kẹt "waiting" 48 giờ vì khóa → chủ là CEO', iss.some((i) => i.key === 'stuck:precedent-extract:waiting' && i.owner.startsWith('CEO')));
  t('quản đốc: thiếu khóa LLM → cfg:no-llm', iss.some((i) => i.key === 'cfg:no-llm'));
  t('quản đốc: có kênh → không báo no-channel', !iss.some((i) => i.key === 'cfg:no-channel'));
  const r1 = reconcile({ issues: {} }, iss, { now });
  t('sổ đã-báo: lần đầu báo hết', r1.toSend.length === iss.length);
  const r2 = reconcile(r1.book, iss, { now: now + HH });
  t('sổ đã-báo: 1 giờ sau KHÔNG báo lại (chống lặp)', r2.toSend.length === 0, String(r2.toSend.length));
  const r3 = reconcile(r2.book, iss, { now: now + 25 * HH });
  t('sổ đã-báo: sau 24 giờ nhắc lại', r3.toSend.length === iss.length);
  const r4 = reconcile({ issues: {} }, iss, { now, quiet: true });
  t('giờ yên: chỉ critical được gửi', r4.toSend.every((i) => i.level === 'critical') && r4.toSend.length >= 1);
  const r5 = reconcile(r3.book, iss.filter((i) => i.key !== 'silent:legal-watch'), { now: now + 26 * HH });
  t('sổ đã-báo: vấn đề hết thì ghi "đã hết"', r5.book.resolved.includes('silent:legal-watch'));
  const iss2 = findIssues({ runs: [{ job: 'freshness', status: 'stale', startedAt: new Date(now - HH).toISOString(), lines: ['[DUE] Biểu thuế XNK'] }], queue: { items: [] }, env: envW, cfg: { expectHours: { freshness: 170 }, _llmCount: 1 }, now });
  t('quản đốc: freshness "stale" báo ngay, chủ là dev dữ liệu', iss2.some((i) => i.key === 'stuck:freshness:stale' && i.owner.startsWith('dev dữ liệu')), JSON.stringify(iss2));
  t('ownerOf: freshness → dev dữ liệu', ownerOf('freshness', 'stale', 'Biểu thuế').startsWith('dev dữ liệu'));
}


// --- đồng bộ clone chuẩn về origin/main (scripts/sync-main.sh)
// Bối cảnh: ExecStartPre cũ là `git pull --ff-only`. Khi HEAD của clone chuẩn
// đứng trên một nhánh KHÔNG còn trên remote (đo 28/11/2026: `agent/pr89-extract-only`
// đã bị xoá trên GitHub) thì pull hỏng âm thầm → job chạy bằng code cũ nhiều tuần:
// clone lệch origin/main 2029 commit, J2 chạy logic cũ, bench đóng băng.
{
  const sync = join(repo, 'hs-agent', 'scripts', 'sync-main.sh');
  t('sync-main.sh tồn tại và chạy được', existsSync(sync) && (statSync(sync).mode & 0o111) !== 0, sync);

  // Repo tạm + "remote" tạm (origin trỏ về chính repo tạm).
  const syncRepo = mkdtempSync(join(tmpdir(), 'hssync-'));
  const sg = (...a) => execFileSync('git', a, { cwd: syncRepo, stdio: 'pipe' });
  sg('init', '-q', '-b', 'main');
  writeFileSync(join(syncRepo, 'a.txt'), 'v1\n');
  sg('add', '-A');
  sg('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'v1');
  const firstSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: syncRepo, encoding: 'utf8' }).trim();

  const remoteDir = mkdtempSync(join(tmpdir(), 'hssync-remote-'));
  const rg = (...a) => execFileSync('git', a, { cwd: remoteDir, stdio: 'pipe' });
  rg('init', '-q', '-b', 'main');
  writeFileSync(join(remoteDir, 'a.txt'), 'v2\n');
  writeFileSync(join(remoteDir, 'b.txt'), 'moi\n');
  rg('add', '-A');
  rg('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'v2');
  sg('remote', 'add', 'origin', remoteDir);
  sg('fetch', '-q', 'origin', 'main');

  const runSync = () => execFileSync('bash', [sync], {
    cwd: syncRepo,
    encoding: 'utf8',
    env: { ...process.env, SYNC_REPO: syncRepo, SYNC_REMOTE: 'origin', SYNC_BRANCH: 'main', SYNC_LOG: join(syncRepo, 'sync.log') },
  });
  const headNow = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: syncRepo, encoding: 'utf8' }).trim();
  const targetSha = () => execFileSync('git', ['rev-parse', 'refs/remotes/origin/main'], { cwd: syncRepo, encoding: 'utf8' }).trim();

  // Tình huống thật: HEAD đứng trên nhánh KHÔNG có trên remote (pull --ff-only hỏng).
  sg('checkout', '-q', '-b', 'agent/da-xoa');
  const syncOut = runSync();
  t('sync-main: nhánh đã bị xoá trên remote → vẫn về đúng commit của main', headNow() === targetSha() && headNow() !== firstSha, syncOut);
  t('sync-main: tệp mới có trong main xuất hiện trong cây làm việc', existsSync(join(syncRepo, 'b.txt')));

  // Cây bẩn (sửa tay chưa commit) → KHÔNG giẫm mất, phải cảnh báo.
  // Kịch bản thật: HEAD lệch main (chưa đồng bộ) VÀ cây bẩn → phải bỏ qua.
  writeFileSync(join(remoteDir, 'c.txt'), 'v3\n');
  rg('add', '-A');
  rg('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'v3');
  sg('fetch', '-q', 'origin', 'main');
  writeFileSync(join(syncRepo, 'a.txt'), 'sua-tay\n');
  const headBeforeDirty = headNow();
  const dirtyOut = runSync();
  t('sync-main: cây bẩn → giữ nguyên, cảnh báo', /chưa commit|mục sửa/.test(dirtyOut) && readFileSync(join(syncRepo, 'a.txt'), 'utf8') === 'sua-tay\n', dirtyOut);
  t('sync-main: cây bẩn → không đồng bộ (HEAD đứng yên)', headNow() === headBeforeDirty);

  // Bỏ sửa tay → đồng bộ được về commit mới của main.
  sg('checkout', '-q', '--', 'a.txt');
  const cleanOut = runSync();
  t('sync-main: cây sạch → đồng bộ được về main', headNow() === targetSha() && existsSync(join(syncRepo, 'c.txt')), cleanOut);

  // Đã đúng commit của main → không đụng gì, mã thoát 0.
  const sameOut = runSync();
  t('sync-main: đã đúng commit main → chạy êm, mã thoát 0', sameOut.trim() === '' && headNow() === targetSha(), sameOut);
}

// --- LLM: router gắn "data: [DONE]" sau JSON không stream (9Router) — trước đây làm J2 báo "LLM không trả JSON"
t('parseBody: bỏ đuôi data: [DONE]', parseBody('{"choices":[{"message":{"content":"x"}}]}\ndata: [DONE]\n\n').choices[0].message.content === 'x');
t('parseBody: JSON thường vẫn đọc được', parseBody('{"a":1}').a === 1);
t('parseBody: rác → {}', Object.keys(parseBody('<html>')).length === 0);
t('parseJsonLoose: bỏ <think>, đọc khối ```json', parseJsonLoose('<think>nghĩ {x}</think>\n```json\n{"coKetLuan":false}\n```').coKetLuan === false);

// --- chọn văn bản cho J2: hồi sinh `rejected` (tiền lệ bị kiểm loại oan không được rơi vĩnh viễn)
{
  const NOW = Date.parse('2026-11-28T02:00:00Z');
  const cfgP = { maxDocsPerRun: 15, maxAttemptsPerDoc: 3, reviveMaxPerRun: 5, reviveCooldownHours: 168 };
  const mk = (state, extra = {}) => ({ kind: 'classification', state, ref: 'x', attempts: 0, ...extra });

  t('pickItems: new/retry được pick', pickItems([mk('new'), mk('retry')], cfgP, { now: NOW }).length === 2);
  t('pickItems: no-conclusion attempts < max được pick', pickItems([mk('no-conclusion', { attempts: 1 })], cfgP, { now: NOW }).length === 1);
  t('pickItems: no-conclusion attempts >= max KHÔNG pick', pickItems([mk('no-conclusion', { attempts: 3 })], cfgP, { now: NOW }).length === 0);
  t('pickItems: rejected KHÔNG được pick (hồi sinh tắt)', pickItems([mk('rejected')], { ...cfgP, reviveMaxPerRun: 0 }, { now: NOW }).length === 0);
  t('pickItems: rejected được hồi sinh khi bật', pickItems([mk('rejected', { attempts: 5 })], cfgP, { now: NOW }).length === 1);
  t('pickItems: hồi sinh tôn trọng cooldown', pickItems([mk('rejected', { revivedAt: '2026-11-27T02:00:00Z' })], cfgP, { now: NOW }).length === 0);
  t('pickItems: hồi sinh sau cooldown thì pick lại', pickItems([mk('rejected', { revivedAt: '2026-11-01T02:00:00Z' })], cfgP, { now: NOW }).length === 1);
  t('pickItems: giới hạn reviveMaxPerRun', pickItems([...Array(9)].map(() => mk('rejected')), cfgP, { now: NOW }).length === 5);
  t('pickItems: ưu tiên văn bản mới trước hồi sinh', (() => {
    const p = pickItems([mk('rejected'), mk('new')], { ...cfgP, maxDocsPerRun: 1 }, { now: NOW });
    return p.length === 1 && p[0].state === 'new';
  })());
  t('pickItems: không vượt maxDocsPerRun', pickItems([...Array(20)].map(() => mk('new')), cfgP, { now: NOW }).length === 15);
  t('pickItems: mark đặt revivedAt + attempts hạn cuối', (() => {
    const it = mk('rejected', { attempts: 9 });
    pickItems([it], cfgP, { now: NOW, mark: true });
    return it.revivedAt === '2026-11-28T02:00:00.000Z' && it.attempts === 2 && it.reviveCount === 1;
  })());
  t('pickItems: không phải classification thì bỏ qua', pickItems([{ kind: 'other', state: 'new' }], cfgP, { now: NOW }).length === 0);
}

// --- chốt văn bản `no-conclusion` (cơ quan hải quan không kết luận mã) để khỏi đốt LLM vô ích
{
  const NOW = Date.parse('2026-11-28T02:00:00Z');
  const cfgC = { maxAttemptsNoConclusion: 2 };
  const mk = (state, extra = {}) => ({ kind: 'classification', state, ref: 'x', attempts: 0, ...extra });

  t('closeNoConclusion: attempts >= ngưỡng → done', (() => {
    const it = mk('no-conclusion', { attempts: 2, note: 'hồ sơ chưa đủ' });
    const closed = closeNoConclusion([it], cfgC, { now: NOW });
    return closed.length === 1 && it.state === 'done' && it.closedAt === '2026-11-28T02:00:00.000Z';
  })());
  t('closeNoConclusion: attempts < ngưỡng → giữ nguyên', (() => {
    const it = mk('no-conclusion', { attempts: 1 });
    return closeNoConclusion([it], cfgC, { now: NOW }).length === 0 && it.state === 'no-conclusion';
  })());
  t('closeNoConclusion: ngưỡng 3 → attempts 2 chưa chốt, attempts 3 chốt', (() => {
    const a = mk('no-conclusion', { attempts: 2 });
    const b = mk('no-conclusion', { attempts: 3 });
    const closed = closeNoConclusion([a, b], { maxAttemptsNoConclusion: 3 }, { now: NOW });
    return closed.length === 1 && a.state === 'no-conclusion' && b.state === 'done';
  })());
  t('closeNoConclusion: không cfg → ngưỡng mặc định 2', (() => {
    const a = mk('no-conclusion', { attempts: 1 });
    const b = mk('no-conclusion', { attempts: 2 });
    const closed = closeNoConclusion([a, b], {}, { now: NOW });
    return closed.length === 1 && a.state === 'no-conclusion' && b.state === 'done';
  })());
  t('closeNoConclusion: KHÔNG đụng trạng thái khác', (() => {
    const items = [mk('new'), mk('retry'), mk('rejected'), mk('extracted'), mk('done')];
    const before = items.map((i) => i.state);
    return closeNoConclusion(items, cfgC, { now: NOW }).length === 0 && items.every((i, k) => i.state === before[k]);
  })());
  t('closeNoConclusion: ghi chú giữ lý do + nhãn chốt', (() => {
    const it = mk('no-conclusion', { attempts: 5, note: 'không có kết luận' });
    closeNoConclusion([it], cfgC, { now: NOW });
    return /không có kết luận/.test(it.note) && /chốt/.test(it.note);
  })());
  t('closeNoConclusion: mục đã chốt thì filter của J2 không pick lại', (() => {
    const it = mk('no-conclusion', { attempts: 30 });
    closeNoConclusion([it], cfgC, { now: NOW });
    const queue = { items: [it] };
    const picked = queue.items.filter((i) => {
      if (i.kind !== 'classification') return false;
      if (i.state === 'new' || i.state === 'retry') return true;
      if (i.state === 'no-conclusion' && (i.attempts || 0) < (cfgC.maxAttemptsPerDoc || 3)) return true;
      return false;
    });
    return picked.length === 0;
  })());
  t('closeNoConclusion + pickItems: mục đã chốt không được pick lại bởi pickItems', (() => {
    const it = mk('no-conclusion', { attempts: 30 });
    closeNoConclusion([it], cfgC, { now: NOW });
    return pickItems([it], { maxDocsPerRun: 15, maxAttemptsPerDoc: 3 }, { now: NOW }).length === 0;
  })());
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
