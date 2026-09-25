#!/usr/bin/env node
// Test offline cho harness hs-agent: không mạng, không ghi data/ (rule bất biến #8).
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseListing, parseTitle, classifyDoc, hsCodesIn, refKey } from '../lib/vbpl.mjs';
import { codeAppears, coverage, scrub, verifyRecords } from '../lib/extract.mjs';
import { createRunBudget, BudgetExceeded } from '../lib/budget.mjs';
import { matchAny, push, classifyChanges } from '../lib/workspace.mjs';
import { mkdtempSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { parseBench } from '../jobs/bench-night.mjs';

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
t('refKey: QĐ = QD, hoa', refKey('2174/QĐ-bct') === '2174/QD-BCT');
t('hsCodesIn: dạng có chấm, không bắt số lượng', JSON.stringify(hsCodesIn('mã 6907.21.23 và 6907.22; 3177.90 m2 không phải; năm 2026')) === JSON.stringify(['69072123', '690722', '317790']), JSON.stringify(hsCodesIn('mã 6907.21.23 và 6907.22; 3177.90 m2')));

// --- kiểm chứng trích xuất
const text = `Số: 43049/CHQ-NVTHQ. Kính gửi: Công ty TNHH Táo Xanh Việt Nam. Mặt hàng xem xét là Thiết bị sạc không dây MagSafe Charger, nhãn hiệu Apple, nhận nguồn điện một chiều, có mạch nghịch lưu chuyển đổi DC thành dòng xoay chiều tần số cao đi qua cuộn dây phát tạo từ trường.
Căn cứ Chú giải 5 Chương 85, mặt hàng thuộc nhóm 85.04, phân nhóm 8504.40, mã số 8504.40.90 "- - - Loại khác". Không thuộc mã 8517.62.59.`;
t('codeAppears: 8504.40.90 = 85044090', codeAppears('85044090', text));
t('codeAppears: mã bịa không có', !codeAppears('85044019', text));
t('codeAppears: không khớp giữa chuỗi số dài hơn', !codeAppears('8504', 'số 185044'));
t('coverage: mô tả lấy từ văn bản ≥ 0,6', coverage('Thiết bị sạc không dây MagSafe Charger có mạch nghịch lưu, cuộn dây phát', text) >= 0.6);
t('coverage: mô tả bịa < 0,6', coverage('Máy xúc lật bánh lốp động cơ diesel tải trọng 5 tấn', text) < 0.6);
t('scrub: bỏ tên doanh nghiệp', !/công ty|tnhh/i.test(scrub('Thiết bị sạc của Công ty TNHH Táo Xanh, hàng mới')));
const v = verifyRecords({
  coKetLuan: true,
  records: [
    { hsCode: '8504.40.90', description: 'Thiết bị sạc không dây MagSafe Charger nhãn hiệu Apple, có mạch nghịch lưu chuyển đổi DC thành xoay chiều tần số cao, cuộn dây phát', reasonVi: 'Chú giải 5 Chương 85', girRule: 'GIR 1', confusedWith: ['85176259', '85176299'] },
    { hsCode: '85044019', description: 'Thiết bị sạc không dây MagSafe Charger nhãn hiệu Apple có mạch nghịch lưu', reasonVi: '' },
    { hsCode: '85044090', description: 'Máy xúc lật bánh lốp động cơ diesel tải trọng 5 tấn dùng trong xây dựng' },
  ],
}, { text, ref: '43049/CHQ-NVTHQ', date: '2025-12-16', url: 'https://vbpl.ts24.com.vn/support/solutions/articles/16000230222', repoDir: repo });
t('verifyRecords: giữ đúng 1 bản ghi thật', v.records.length === 1 && v.records[0].hsCode === '85044090', JSON.stringify(v));
t('verifyRecords: bỏ mã không có trong văn bản', v.rejected.some((r) => r.hsCode === '85044019' && /nguyên văn/.test(r.why)));
t('verifyRecords: bỏ mô tả bịa', v.rejected.some((r) => /khớp/.test(r.why)));
t('verifyRecords: confusedWith giữ mã văn bản nêu (8517.62.59), bỏ mã bịa (8517.62.99)', JSON.stringify(v.records[0].confusedWith) === '["85176259"]', JSON.stringify(v.records[0].confusedWith));
t('verifyRecords: số hiệu/ngày/url từ nguồn', v.records[0].source.reference === '43049/CHQ-NVTHQ' && v.records[0].source.issuedDate === '2025-12-16' && v.records[0].source.type === 'TB-TCHQ');
t('verifyRecords: không kết luận → 0 bản ghi', verifyRecords({ coKetLuan: false, lyDoKhongKetLuan: 'không đủ cơ sở', records: [] }, { text, ref: 'x', repoDir: repo }).noConclusion === 'không đủ cơ sở');
const leak = verifyRecords({ coKetLuan: true, records: [{ hsCode: '85044090', description: 'Thiết bị sạc không dây MagSafe Charger mạch nghịch lưu cuộn dây phát MST 0101234567', reasonVi: '' }] }, { text: `${text} 0101234567`, ref: 'x', url: 'https://a.b/1', repoDir: repo });
t('verifyRecords: dính MST → bỏ', leak.records.length === 0 && /riêng tư/.test(leak.rejected[0]?.why || ''), JSON.stringify(leak));

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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
