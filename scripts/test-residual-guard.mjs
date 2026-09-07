#!/usr/bin/env node
/**
 * Bộ cảnh báo thiên vị mã cụ thể.
 *
 * Test này khoá hai điều, và điều thứ hai quan trọng hơn:
 *   1. Cảnh báo BẬT khi mô tả không chứng minh được điều kiện của mã cụ thể
 *   2. Cảnh báo KHÔNG bật khi mô tả CÓ chứng minh — vì lật ngược thiên vị
 *      (luôn chọn residual) cũng sai y hệt như thiên vị mã cụ thể
 *
 * Kèm phần đo lại hiệu quả trên benchmark thật, để con số trong tài liệu không
 * trở thành lời đồn khi dữ liệu đổi.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  isResidual,
  cleanName,
  distinguishingTerms,
  findResidualSibling,
  evidenceForSpecific,
  checkResidualPreference,
} = require('../lib/residual-guard.js');

let passed = 0;
let failed = 0;
function assert(name, cond, detail) {
  if (cond) {
    console.log('PASS', name);
    passed += 1;
  } else {
    console.log('FAIL', name, detail === undefined ? '' : JSON.stringify(detail));
    failed += 1;
  }
}

// --- Nhận diện mã residual ----------------------------------------------------
assert('84812090 là mã Loại khác', isResidual('84812090') === true);
assert('84818083 KHÔNG phải Loại khác', isResidual('84818083') === false);
assert('bỏ được dấu gạch phân cấp', !/^[-\s]/.test(cleanName('84812090')));
assert('mã không tồn tại không sập', isResidual('00000000') === false);
assert('null không sập', isResidual(null) === false);

// --- Rút điều kiện đặc trưng --------------------------------------------------
const terms = distinguishingTerms('84818083');
assert('mã cụ thể có điều kiện đặc trưng', terms.length > 0, terms);
assert('mã residual KHÔNG có điều kiện đặc trưng', distinguishingTerms('84812090').length === 0);
assert('không lấy từ quá phổ biến làm bằng chứng', !terms.includes('loai') && !terms.includes('dung'), terms);

// --- Tìm anh em residual ------------------------------------------------------
const sib = findResidualSibling('84818083');
assert('tìm được mã residual cùng cấp', Boolean(sib?.hsCode), sib);
assert('mã đề xuất đúng là residual', sib && isResidual(sib.hsCode), sib);
assert('mã đề xuất cùng nhóm 4 số', sib && sib.hsCode.slice(0, 4) === '8481', sib);
assert('mã quá ngắn trả null', findResidualSibling('8481') === null);

// --- BẬT khi thiếu bằng chứng -------------------------------------------------
const fire = checkResidualPreference({
  hsCode: '84818083',
  description: 'Van điện từ khí nén, model 4V220, điện áp AC220V, KT 3*5*12cm',
});
assert('BẬT khi mô tả không nêu điều kiện của mã cụ thể', Boolean(fire), fire);
assert('đề xuất mã residual', fire && isResidual(fire.suggestedHs));
assert('trích dẫn GIR 3(a)', fire?.girRule === 'GIR 3(a)');
assert('nêu rõ lý do', (fire?.reasonVi || '').length > 50);
assert('kèm bằng chứng điều kiện nào chưa khớp', Array.isArray(fire?.evidence?.requiredTerms) && fire.evidence.requiredTerms.length > 0);
assert('matchRatio = 0 khi không khớp gì', fire?.evidence?.matchRatio === 0, fire?.evidence);

// --- KHÔNG bật khi CÓ bằng chứng (quan trọng nhất) ----------------------------
// Lật ngược thiên vị cũng sai như thiên vị. Đây là ranh giới phải giữ.
const keep = checkResidualPreference({
  hsCode: '84818083',
  description: 'Van ngắt nhiên liệu bằng plastic dùng cho xe ô tô thuộc nhóm 87.03',
});
assert('KHÔNG bật khi mô tả có nêu điều kiện đặc trưng', keep === null, keep);

const ev = evidenceForSpecific('84818083', 'van ngắt nhiên liệu bằng plastic');
assert('evidenceForSpecific nhận ra có bằng chứng', ev.supported === true, ev);
assert('liệt kê được từ khớp', ev.matched.length > 0, ev);

// --- Không đụng vào mã vốn đã là residual ------------------------------------
assert(
  'mã đã là Loại khác thì không đề xuất gì',
  checkResidualPreference({ hsCode: '84812090', description: 'van bất kỳ' }) === null,
);

// --- Đầu vào rác --------------------------------------------------------------
for (const bad of [undefined, {}, { hsCode: null }, { hsCode: '8481' }, { hsCode: '00000000', description: 'x' }]) {
  let ok = true;
  try {
    const r = checkResidualPreference(bad);
    ok = r === null || typeof r === 'object';
  } catch {
    ok = false;
  }
  assert(`đầu vào rác không sập: ${JSON.stringify(bad)}`, ok);
}

// --- ĐO LẠI HIỆU QUẢ TRÊN BENCHMARK THẬT -------------------------------------
let report = null;
try {
  report = require('../data/accuracy-report-2026-05-28.json');
} catch {
  console.log('SKIP  không có accuracy-report — bỏ qua phần đo');
}

if (report?.results?.length) {
  const rows = report.results.filter((x) => x.top1 && x.decl?.hsCode);
  let base = 0;
  let after = 0;
  let fired = 0;
  let fixed = 0;
  let broke = 0;
  for (const x of rows) {
    const truth = String(x.decl.hsCode);
    const pred = String(x.top1);
    if (pred === truth) base += 1;
    const g = checkResidualPreference({ hsCode: pred, description: String(x.decl.productName || '') });
    if (g) fired += 1;
    const final = g ? g.suggestedHs : pred;
    if (final === truth) after += 1;
    if (g && pred !== truth && final === truth) fixed += 1;
    if (g && pred === truth && final !== truth) broke += 1;
  }
  console.log(
    `INFO  benchmark ${rows.length} mẫu: bật ${fired} lần (${Math.round((fired / rows.length) * 100)}%), ` +
    `sửa ${fixed} / hỏng ${broke}, lãi ròng ${fixed - broke}`,
  );
  assert('sửa được nhiều hơn làm hỏng', fixed > broke, { fixed, broke });
  assert(
    'không can thiệp quá nửa số mẫu (can thiệp tràn lan = lật ngược thiên vị)',
    fired < rows.length / 2,
    { fired, total: rows.length },
  );
  // Ghi lại lý do CHỈ cảnh báo chứ không tự ghi đè: lãi ròng quá mỏng.
  assert('lãi ròng còn mỏng — giữ chế độ chỉ cảnh báo, chưa tự ghi đè', fixed - broke < 10, { net: fixed - broke });
}

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
