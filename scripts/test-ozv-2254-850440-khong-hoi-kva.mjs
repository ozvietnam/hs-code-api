#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-2254 — phân nhóm 8504.40 không hỏi công suất kVA cho hàng không phải máy nạp ắc quy.
 *
 * Ca thật 24h: «bộ khuếch đại điều khiển servo mr-j4w3-444b-av» → NEED_FACTS 850440,
 * máy hỏi «Công suất biểu kiến (kVA)» + «Điện áp đầu vào (kV)». Biểu 8504.40.xx chỉ tách
 * theo loại (UPS / máy nạp >100 kVA / chỉnh lưu / nghịch lưu / loại khác) — kVA chỉ là
 * điều kiện của đúng một dòng 85044020 (máy nạp ắc qui). Hỏi kVA mọi bộ biến đổi tĩnh
 * điện là hỏi thừa / đơn vị lệch.
 *
 * Rào hai chiều:
 *   - bắt lỗi: servo / bộ nguồn thường → missingFacts và cauDong8 KHÔNG còn congSuatBieuKien;
 *   - không bắt nhầm: vẫn hỏi loaiBienDoiTinhDien; bộ nghịch lưu / chỉnh lưu vẫn CHOT.
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { chotDong8 } = require('../lib/so-tay-gates.js');
const { cauDong8 } = require('../lib/hoi-theo-so-tay.js');

let failed = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const SERVO = 'bộ khuếch đại điều khiển servo mr-j4w3-444b-av';
const PSU = 'Bộ nguồn 260W, đầu vào AC100-240V';

console.log('1. Servo / bộ nguồn: không hỏi congSuatBieuKien (kVA)');
for (const text of [SERVO, PSU]) {
  const cd = chotDong8({ hs: '850440', productText: text });
  const miss = (cd.missingFacts || []).map((m) => m.fact);
  const q = cauDong8({ h4: '8504', maXet: '850440', text, ghiPn6: [] });
  const keys = q.map((x) => x.key);
  check(
    `chotDong8 «${text.slice(0, 36)}…» không thiếu congSuatBieuKien`,
    !miss.includes('congSuatBieuKien'),
    JSON.stringify({ ketQua: cd.ketQua, miss }),
  );
  check(
    `cauDong8 «${text.slice(0, 36)}…» không hỏi kVA`,
    !keys.includes('congSuatBieuKien'),
    JSON.stringify(keys),
  );
  check(
    `vẫn hỏi loaiBienDoiTinhDien cho «${text.slice(0, 36)}…»`,
    miss.includes('loaiBienDoiTinhDien') || keys.includes('loaiBienDoiTinhDien'),
    JSON.stringify({ miss, keys }),
  );
}

console.log('2. Rào ngược: chỉnh lưu / nghịch lưu vẫn chốt đúng dòng');
{
  const nghich = chotDong8({ hs: '850440', productText: 'bộ nghịch lưu 5kW' });
  check('bộ nghịch lưu → CHOT 85044040', nghich.ketQua === 'CHOT' && nghich.hs === '85044040', JSON.stringify(nghich));
  const chinh = chotDong8({ hs: '850440', productText: 'bộ chỉnh lưu' });
  check('bộ chỉnh lưu → CHOT 85044030', chinh.ketQua === 'CHOT' && chinh.hs === '85044030', JSON.stringify(chinh));
}

console.log('3. Máy nạp ắc qui: không còn ép hỏi kVA khi chưa rõ tên loại');
{
  const cd = chotDong8({ hs: '850440', productText: 'máy biến đổi tĩnh điện công nghiệp' });
  const miss = (cd.missingFacts || []).map((m) => m.fact);
  check('mô tả chung 850440 không thiếu congSuatBieuKien', !miss.includes('congSuatBieuKien'), JSON.stringify(miss));
}

if (failed) {
  console.error(`\nFAILED ${failed}`);
  process.exit(1);
}
console.log('\nOK');
