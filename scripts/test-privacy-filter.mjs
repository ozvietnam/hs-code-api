#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Hồi quy bộ lọc riêng tư — mỗi kiểu rò rỉ mới phải có mẫu ở đây.
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { scanString, scanObject } = require('../lib/privacy-filter.js');

let passed = 0;
let failed = 0;
function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log('PASS', name);
  } else {
    failed += 1;
    console.error('FAIL', name, detail || '');
  }
}

function hasWhat(text, what) {
  return scanString(text).some((h) => h.what === what && h.hard);
}

assert('chặn tên DN VN', hasWhat('Máy bơm của Công ty TNHH ABC', 'có thể là tên doanh nghiệp'));
assert('chặn MST 10 số', hasWhat('MST 0123456789', 'có thể là mã số thuế (10 hoặc 13 số)'));
assert('chặn số tờ khai', hasWhat('tờ khai 12345678901', 'có thể là số tờ khai hải quan'));
assert('chặn điện thoại VN', hasWhat('gọi 0912345678', 'số điện thoại Việt Nam'));
assert('chặn email', hasWhat('liên hệ a.b@example.com', 'địa chỉ email'));
assert('chặn B/L', hasWhat('theo B/L ABC123', 'tham chiếu chứng từ thương mại'));
assert('cảnh báo trị giá (soft)', scanString('giá 1.250.000 usd').some((h) => !h.hard && h.what.includes('trị giá')));

assert('chặn 有限公司', hasWhat('泵 上海某某有限公司', 'có thể là tên doanh nghiệp Trung Quốc'));
assert('chặn 贸易有限', hasWhat('卖方：深圳某某贸易有限公司', 'có thể là tên doanh nghiệp Trung Quốc'));
assert('chặn EIN', hasWhat('tax id 12-3456789', 'có thể là mã số thuế nước ngoài (EIN)'));
assert('chặn container ISO 6346', hasWhat('container MSCU1234567', 'mã container'));
assert('không chặn model van 4V220', scanString('Van điện từ khí nén model 4V220').length === 0);
assert('chặn seal', hasWhat('seal no ABC1234', 'số seal container'));
assert('chặn toạ độ', hasWhat('kho 10.762622, 106.660172', 'toạ độ địa lý'));
assert('chặn địa chỉ kho', hasWhat('giao tại kho ngoại quan ICD', 'địa chỉ kho / nhà'));
assert('không chặn đường kính', scanString('đường kính van 9mm').every((h) => h.what !== 'địa chỉ kho / nhà'));

const clean = scanObject({
  kind: 'precedent',
  contributor: { name: 'Nguyễn Văn A' },
  records: [{ description: 'Máy bơm ly tâm dân dụng 1HP' }],
});
assert('mẫu sạch không hit hard', clean.filter((h) => h.hard).length === 0);

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
