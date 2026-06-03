#!/usr/bin/env node
/**
 * test-loai-khac-classifier.mjs
 *
 * Chạy reasoning engine trên 20 sản phẩm thực từ oz-gold.
 * In chain suy luận + kết quả đúng/sai.
 *
 * Usage: node scripts/test-loai-khac-classifier.mjs [--verbose]
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { reasonLoaiKhac } = require('../lib/loai-khac-classifier.js');

const VERBOSE = process.argv.includes('--verbose');

// 20 test cases từ oz-gold (hs code là expected answer)
const TEST_CASES = [
  { tenHang: 'Kính mắt thời trang', chatLieu: 'nhựa', congDung: 'trang trí (không phải kính thuốc, kính bảo hộ, kính râm)', expectedHs: '90049090' },
  { tenHang: 'Nhang thắp hương', chatLieu: 'bột keo tự nhiên, bột bách hương, que tre', congDung: 'thắp hương', expectedHs: '33074190' },
  { tenHang: 'Dây cáp sạc và truyền tín hiệu', chatLieu: 'cách điện bằng nhựa', congDung: 'sạc điện thoại và truyền tín hiệu', expectedHs: '85444299' },
  { tenHang: 'Dây trục câu cá', chatLieu: 'nylon', congDung: 'câu cá thể thao', expectedHs: '95079000' },
  { tenHang: 'Bộ hơi động cơ xe máy', chatLieu: 'sắt', congDung: 'bộ phận động cơ xe máy 2 bánh chạy xăng', expectedHs: '84099139' },
  { tenHang: 'Dép nhựa PVC', chatLieu: 'PVC', congDung: 'đi trong nhà và ngoài trời', expectedHs: '64029990' },
  { tenHang: 'Đồng hồ đeo tay', chatLieu: 'hợp kim thép', congDung: 'đeo tay xem giờ', expectedHs: '91022900' },
  { tenHang: 'Dây Curoa dẹt', chatLieu: 'Cao su lưu hóa', congDung: 'Dùng trong công nghiệp', expectedHs: '40103900' },
  { tenHang: 'Lon rỗng nhôm hợp kim', chatLieu: 'Nhôm hợp kim', congDung: 'Đựng nước uống', expectedHs: '76129090' },
  { tenHang: 'Kính dán an toàn bảo vệ camera', chatLieu: 'kính', congDung: 'bảo vệ camera điện thoại di động', expectedHs: '70072990' },
  { tenHang: 'Vỏ ốp lưng điện thoại', chatLieu: 'nhựa PVC tổng hợp', congDung: 'bảo vệ điện thoại', expectedHs: '39269099' },
  { tenHang: 'Dao xén máy 1 kim', chatLieu: 'sắt thép', congDung: 'Xén vải trong ngành may mặc', expectedHs: '82089000' },
  { tenHang: 'Đèn led năng lượng mặt trời', chatLieu: 'nhôm đúc', congDung: 'chiếu sáng sân vườn', expectedHs: '94054140' },
  { tenHang: 'Đồ trang trí hình lọ hoa', chatLieu: 'Bột đá nhân tạo', congDung: 'Trang trí nội thất', expectedHs: '68109900' },
  { tenHang: 'Bánh xe đẩy 2 inch', chatLieu: 'Thép không gỉ trục đỡ, nhựa bánh xe', congDung: 'Dùng cho xe đẩy hàng siêu thị', expectedHs: '83022090' },
  { tenHang: 'Vành bánh xe đạp điện', chatLieu: 'nhôm', congDung: 'bộ phận xe đạp điện', expectedHs: '87149290' },
  { tenHang: 'Lông mi giả tự dính', chatLieu: 'sợi tổng hợp PET', congDung: 'trang điểm mắt', expectedHs: '67041900' },
  { tenHang: 'Bút chì màu', chatLieu: 'gỗ ép công nghiệp', congDung: 'viết vẽ học sinh', expectedHs: '96091090' },
  { tenHang: 'Bình sứ trang trí', chatLieu: 'sứ', congDung: 'trang trí nội thất', expectedHs: '69131090' },
  { tenHang: 'Con lăn truyền động lò nung', chatLieu: 'Thép', congDung: 'Phụ tùng lò nung sản xuất gạch ceramic', expectedHs: '73269099' },
];

// --------------------------------------------------------------------------
// Run tests
// --------------------------------------------------------------------------

let passed = 0, failed = 0, partial = 0;
const failedCases = [];

console.log('='.repeat(70));
console.log('LOẠI KHÁC REASONING ENGINE — 20 test cases');
console.log('='.repeat(70));
console.log();

for (const tc of TEST_CASES) {
  const res = reasonLoaiKhac(tc, tc.expectedHs);

  const r = res.result;
  const correctHs  = r?.hs === tc.expectedHs;
  const isLKResult = r?.isLoaiKhac;

  let status, symbol;
  if (correctHs && isLKResult) { status = 'PASS'; symbol = '✓'; passed++; }
  else if (!isLKResult)         { status = 'FAIL'; symbol = '✗'; failed++; failedCases.push(tc); }
  else                          { status = 'PART'; symbol = '~'; partial++; }

  const conf = r ? `${(r.confidence * 100).toFixed(0)}%` : '-';
  console.log(`[${symbol}] ${tc.expectedHs}  conf=${conf}  ${tc.tenHang}`);

  if (VERBOSE || status === 'FAIL') {
    if (res.ok && r) {
      // Print reasoning chain
      const topSteps = r.steps.slice(0, 5); // show first 5 siblings
      for (const step of topSteps) {
        const icon = step.match ? '  ⚡ MATCH' : '  ✗ skip';
        console.log(`     ${icon} ${step.siblingHs} "${step.siblingName.slice(0,45)}"`);
        console.log(`            → ${step.reason.slice(0, 90)}`);
      }
      if (r.steps.length > 5) {
        console.log(`     ... và ${r.steps.length - 5} sibling khác đều bị loại`);
      }
      console.log(`     ⇒ ${r.conclusion}`);
    }
  } else if (status === 'PASS' && !VERBOSE) {
    // Short conclusion for passing cases
    const rejCount = r.steps.filter(s => !s.match).length;
    const hasExplicit = (tc.congDung || '').toLowerCase().includes('không phải');
    const method = hasExplicit ? 'explicit denial' : `${rejCount} siblings eliminated`;
    console.log(`     ⇒ ${method} → Loại khác confirmed`);
  }
  console.log();
}

// --------------------------------------------------------------------------
// Summary
// --------------------------------------------------------------------------

console.log('='.repeat(70));
console.log(`KẾT QUẢ: ${passed}/20 PASS  |  ${partial} PARTIAL  |  ${failed} FAIL`);
console.log(`Accuracy: ${(passed / 20 * 100).toFixed(0)}%`);
if (failedCases.length > 0) {
  console.log('\nFailed cases:');
  for (const tc of failedCases) {
    console.log(`  ${tc.expectedHs} — ${tc.tenHang}`);
  }
}
console.log('='.repeat(70));
console.log('\nChạy với --verbose để xem đầy đủ reasoning chain cho tất cả cases');
