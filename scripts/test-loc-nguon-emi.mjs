#!/usr/bin/env node
/**
 * OZV-2369 — Bộ lọc nguồn / EMI line filter (CW4E-20A-S):
 * - Search/từ điển kéo 8543 (không lệch 8421 lọc dầu/xăng)
 * - Không khai phanBiet 8504↔8543 (không có đoạn trích đồng thời cả hai mã trong luật gốc)
 * - verifySoTay 8504 + 8543 sạch loai
 */
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { searchCandidates } = require('../lib/search-utils.js');
const { expandSearchQuery } = require('../lib/search-query-expand.js');
const { verifySoTay } = require('../lib/so-tay.js');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MO_TA = 'lọc nguồn 20a loại 1 pha cw4e-20a-s';

function loadSoTay(h4) {
  return JSON.parse(readFileSync(join(ROOT, 'data', 'so-tay', `${h4}.json`), 'utf8'));
}

function topHs(q, n = 10) {
  const r = searchCandidates(q, { limit: n });
  const arr = r.candidates || r.results || r || [];
  const list = Array.isArray(arr) ? arr : arr.items || [];
  return list.map((x) => String(x.hs || x.hsCode || ''));
}

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL ${name}: ${e.message}`);
  }
}

check('expandSearchQuery gắn gợi ý nhóm 8543 cho «lọc nguồn»', () => {
  const ex = expandSearchQuery(MO_TA);
  const blob = JSON.stringify(ex);
  assert.ok(blob.includes('8543'), `expand phải gợi 8543, được: ${blob.slice(0, 400)}`);
});

check('searchCandidates top có 85437090, không để 8421 thắng', () => {
  const hs = topHs(MO_TA, 15);
  assert.ok(hs.some((h) => h.startsWith('8543')), `thiếu 8543 trong ${hs.join(',')}`);
  assert.equal(hs[0].slice(0, 4), '8543', `top phải 8543, được ${hs[0]}`);
  const i8421 = hs.findIndex((h) => h.startsWith('8421'));
  const i8543 = hs.findIndex((h) => h.startsWith('8543'));
  if (i8421 >= 0) assert.ok(i8543 < i8421, `8543 phải trước 8421: ${hs.join(',')}`);
});

check('verifySoTay 8543 không loai', () => {
  const r = verifySoTay(loadSoTay('8543'), '8543');
  assert.equal(r.loai.length, 0, `loai: ${JSON.stringify(r.loai)}`);
});

check('verifySoTay 8504 không loai', () => {
  const r = verifySoTay(loadSoTay('8504'), '8504');
  assert.equal(r.loai.length, 0, `loai: ${JSON.stringify(r.loai)}`);
});

check('ổn định search 3 lần cùng câu', () => {
  const runs = [1, 2, 3].map(() => topHs(MO_TA, 5).join('|'));
  assert.equal(runs[0], runs[1], `lần 1≠2: ${runs[0]} vs ${runs[1]}`);
  assert.equal(runs[1], runs[2], `lần 2≠3: ${runs[1]} vs ${runs[2]}`);
  assert.ok(runs[0].startsWith('8543'), runs[0]);
});

// ─── OZV-2387: Đối chiếu 3 cụm câu khách còn lại trong top 24h ───
process.env.HS_HOI_THEO_SO_TAY = 'on';
const hoi = require('../lib/hoi-theo-so-tay.js');
const { soTayGates } = require('../lib/so-tay-gates.js');
const tax = JSON.parse(readFileSync(join(ROOT, 'data', 'tax.json'), 'utf8'));
const anhEm = (prefix6) => Object.keys(tax).filter((h) => h.startsWith(prefix6)).sort();

function cauHoiTuSoTay(tenHang, hs6, nhomList) {
  return hoi.apDung({
    status: 'NEED_FACTS',
    results: [{ hs: hs6 }],
    dossier: {
      hypotheses: nhomList.map((h) => ({ heading4: h, subheading6: hs6.startsWith(h) ? hs6 : '' })),
      alternatives: [],
      product: {},
      conditions: [],
    },
    nextAction: { type: 'ASK_USER', questions: [{ questionVi: 'LLM cũ — phải bị thay' }] },
    missing: ['x'],
  }, { rawAttrs: { tenHang } });
}

check('OZV-2387 verifySoTay 7412/7307/9506/5608/9508 không loai', () => {
  for (const h of ['7412', '7307', '9506', '5608', '9508']) {
    const r = verifySoTay(loadSoTay(h), h);
    assert.equal(r.loai.length, 0, `${h} loai: ${JSON.stringify(r.loai)}`);
  }
});

check('OZV-2387 cụm 1 «lưới leo dùng cho khu vui chơi»: anh em 950699/560819 và câu PHAN_BIET_NHOM 9506↔5608/9508', () => {
  const q1 = 'lưới leo dùng cho khu vui chơi';
  const ae950699 = anhEm('950699');
  const ae560819 = anhEm('560819');
  assert.deepEqual(ae950699, ['95069910', '95069920', '95069930', '95069990']);
  assert.deepEqual(ae560819, ['56081920', '56081990']);
  const r = cauHoiTuSoTay(q1, '950699', ['9506', '5608', '9508', '9503']);
  const qs = r.nextAction?.questions || [];
  assert.equal(r.nextAction?.canCuCauHoi, 'so-tay');
  assert.ok(qs.some((x) => x.loai === 'PHAN_BIET_NHOM' && /56\.08/.test(x.questionVi) && /95\.06/.test(x.questionVi)));
  assert.ok(qs.some((x) => x.loai === 'PHAN_BIET_NHOM' && /95\.08/.test(x.questionVi) && /95\.06/.test(x.questionVi)));
});

check('OZV-2387 cụm 2 «chạc chia 3 hơi khí nén zonye ren 1/4»: anh em 741220/730799 và hỏi PHAN_BIET_NHOM 74.12↔73.07 đứng đầu', () => {
  const q2 = 'chạc chia 3 hơi khí nén zonye ren 1/4';
  assert.deepEqual(anhEm('741220'), ['74122020', '74122091', '74122099']);
  assert.deepEqual(anhEm('730799'), ['73079910', '73079990']);
  for (const [top6, nhom] of [
    ['741220', ['7412', '7307', '3917', '8412', '4009']],
    ['730799', ['7307', '7412', '3917', '8412', '4009']],
  ]) {
    const r = cauHoiTuSoTay(q2, top6, nhom);
    const qs = r.nextAction?.questions || [];
    assert.equal(r.nextAction?.canCuCauHoi, 'so-tay');
    assert.equal(qs[0]?.loai, 'PHAN_BIET_NHOM', `top=${top6} câu đầu phải là PHAN_BIET_NHOM: ${JSON.stringify(qs)}`);
    assert.match(qs[0]?.questionVi || '', /74\.12[\s\S]*73\.07|73\.07[\s\S]*74\.12/);
  }
  const rVan = cauHoiTuSoTay(q2, '741220', ['7412', '7307', '8481']);
  const qsVan = rVan.nextAction?.questions || [];
  assert.ok(qsVan.some((x) => x.loai === 'PHAN_BIET_NHOM' && /84\.81/.test(x.questionVi)), JSON.stringify(qsVan));
  // Ca ngược: bu lông không kích câu hỏi chạc chia 74.12↔73.07
  const pbNguoc = hoi.cauPhanBietNhom('7412', ['7412', '7307'], 'bu lông đồng M8 lắp ống');
  assert.equal(pbNguoc.length, 0, `ca ngược bu lông không được khớp chạc chia: ${JSON.stringify(pbNguoc)}`);
});

check('OZV-2387 cụm 3 «lọc nguồn 20a loại 1 pha cw4e-20a-s»: anh em 854370, hỏi PHAN_BIET_NHOM 85.43↔85.04/84.21 đứng đầu và không bắn nhầm soTayGates ở 85437090', () => {
  const ae854370 = anhEm('854370');
  assert.equal(ae854370.length, 8);
  assert.ok(ae854370.includes('85437090'));
  for (const [top6, nhom] of [
    ['854370', ['8543', '8421', '8504', '8479', '8536']],
    ['842129', ['8421', '8543', '8504', '8479', '8536']],
    ['850440', ['8504', '8543', '8421', '8536']],
  ]) {
    const r = cauHoiTuSoTay(MO_TA, top6, nhom);
    const qs = r.nextAction?.questions || [];
    assert.equal(r.nextAction?.canCuCauHoi, 'so-tay');
    assert.equal(qs[0]?.loai, 'PHAN_BIET_NHOM', `top=${top6} câu đầu phải là PHAN_BIET_NHOM: ${JSON.stringify(qs)}`);
    assert.ok(qs.some((x) => x.loai === 'PHAN_BIET_NHOM' && /85\.04|84\.21/.test(x.questionVi) && /85\.43/.test(x.questionVi)));
  }
  const g8543 = soTayGates({ hs: '85437090', productText: MO_TA, productName: MO_TA });
  assert.equal(
    (g8543.challenges || []).filter((c) => c.gate === 'SO_TAY_LOAI_TRU').length,
    0,
    `không được bắn SO_TAY_LOAI_TRU oan trên 85437090 cho «${MO_TA}»: ${JSON.stringify(g8543.challenges)}`,
  );
  const gOnAp = soTayGates({
    hs: '85437090',
    productText: 'lọc nguồn ổn áp liên tục 220V cho thiết bị điện tử',
    productName: 'lọc nguồn ổn áp liên tục 220V',
  });
  assert.ok(
    (gOnAp.challenges || []).some((c) => c.gate === 'SO_TAY_LOAI_TRU' && c.target === '8504'),
    `phải bắn SO_TAY_LOAI_TRU sang 8504 khi mô tả là «lọc nguồn ổn áp»: ${JSON.stringify(gOnAp.challenges)}`,
  );
});

// ─── OZV-2400: Khử câu hỏi phuongThucTruyenDan lạc đề ở 85437060 ───
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const { chotDong8 } = require('../lib/so-tay-gates.js');

check('OZV-2400 ranh-gioi 854370.json đạt cổng 0..5, 0 cảnh báo cong0/cong5 và không bật phuongThucTruyenDan ở 85437060', () => {
  const rg = JSON.parse(readFileSync(join(ROOT, 'data', 'ho-so', 'ranh-gioi', '854370.json'), 'utf8'));
  assert.equal(rg.trangThai, 'DUYET');
  const kq = C.kiemRanhGioi('854370', rg);
  assert.equal(kq.hopLe, true, `854370 lỗi cổng: ${JSON.stringify(kq.loi)}`);
  assert.equal(kq.loi.length, 0, JSON.stringify(kq.loi));
  const cb05 = (kq.canhBao || []).filter((x) => /^cong[05]-/.test(x));
  assert.equal(cb05.length, 0, `còn cảnh báo cong0/cong5: ${JSON.stringify(cb05)}`);
  const d60 = (rg.dong8 || []).find((x) => x.hs === '85437060');
  assert.ok(!JSON.stringify(d60?.dieuKienSo || []).includes('phuongThucTruyenDan'), '85437060 không được giữ phuongThucTruyenDan');
});

check('OZV-2400 ca lọc nguồn EMI ở 854370 không còn câu hỏi phuongThucTruyenDan từ 85437060; ca ngược 85437060 vẫn chốt đúng', () => {
  const cdEmi = chotDong8({ hs: '854370', productText: MO_TA });
  assert.ok(
    !(cdEmi.missingFacts || []).some((m) => m.fact === 'phuongThucTruyenDan'),
    `chotDong8 không được đòi phuongThucTruyenDan: ${JSON.stringify(cdEmi.missingFacts)}`,
  );
  for (const nhom of [
    ['8543', '8421', '8504', '8479', '8536'],
    ['8543'],
  ]) {
    const r = cauHoiTuSoTay(MO_TA, '854370', nhom);
    const qs = r.nextAction?.questions || [];
    assert.ok(
      !qs.some((q) => q.khoa === 'phuongThucTruyenDan' || /vô tuyến|hữu tuyến/i.test(q.questionVi || '')),
      `không được hỏi phuongThucTruyenDan cho «${MO_TA}» (nhom=${nhom.join(',')}): ${JSON.stringify(qs)}`,
    );
  }
  const cdTronAm = chotDong8({
    hs: '854370',
    productText: 'Thiết bị xử lý tín hiệu kỹ thuật số có khả năng kết nối với mạng không dây để trộn âm thanh',
  });
  assert.equal(cdTronAm.ketQua, 'CHOT');
  assert.equal(cdTronAm.hs, '85437060');
  const cdKetNoi = chotDong8({
    hs: '854370',
    productText: 'đầu nối điện được thiết kế đặc biệt để kết nối với mạng điện thoại',
  });
  assert.equal(cdKetNoi.ketQua, 'CHOT');
  assert.equal(cdKetNoi.hs, '85437060');
  const cdKhongKetNoi = chotDong8({
    hs: '854370',
    productText: 'máy đo cường độ tín hiệu được thiết kế đặc biệt cho điện thoại',
  });
  assert.notEqual(cdKhongKetNoi.hs, '85437060');
});

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nOK loc-nguon-emi');
process.exit(0);
