#!/usr/bin/env node
/**
 * Khoá chặt bộ bóc câu hỏi (lib/query-parse.js).
 *
 * Hai rủi ro canh:
 *  1. GỠ NHẦM — gỡ "thủy lực" khỏi "dầu thủy lực" là mất luôn mặt hàng.
 *  2. GỠ QUÁ TAY — gỡ "nâng" khỏi "bàn nâng" (bản đầu đã dính) biến xe bàn nâng
 *     thành "xe bàn". Từ dẫn thông số chỉ được gỡ khi nó THỰC SỰ dẫn một số.
 */
import './test-isolate-data.mjs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { parseCommodityQuery } = require(join(ROOT, 'lib', 'query-parse.js'));

let failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ✓ ${name}`);
  else { failed++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const P = (q) => parseCommodityQuery(q);

console.log('\n== Danh từ lõi ==');
check('"xe bàn nâng thủy lực 500kg cao 1.5m" → lõi "xe bàn nâng"', P('xe bàn nâng thủy lực 500kg cao 1.5m').coreVi === 'xe bàn nâng');
check('"bàn nâng thủy lực" → lõi "bàn nâng"', P('bàn nâng thủy lực').coreVi === 'bàn nâng');
check('KHÔNG gỡ "nâng" đứng một mình', P('xe nâng tay 2 tấn').coreVi.includes('nâng'));
check('"thép tấm làm khuôn p20 20mm" giữ mác trong lõi', P('thép tấm làm khuôn p20 20mm').coreVi === 'thép tấm làm khuôn p20');

console.log('\n== Không gỡ nhầm khi cơ cấu là một phần tên hàng ==');
for (const q of ['dầu thủy lực', 'vôi thủy lực', 'xi măng thủy lực', 'máy nén khí nén']) {
  check(`"${q}" giữ nguyên`, P(q).coreVi === q, `nhận "${P(q).coreVi}"`);
}
check('"dầu thủy lực" vẫn GHI NHẬN cơ cấu (keptInCore)', P('dầu thủy lực').mechanisms[0]?.keptInCore === true);

console.log('\n== Thông số ==');
{
  const r = P('xe bàn nâng thủy lực 500kg cao 1.5m');
  check('bóc 500kg', r.specs.some((s) => s.value === 500 && s.unit === 'kg'));
  check('bóc cao 1.5m thành height', r.specs.some((s) => s.dimension === 'height' && s.value === 1.5 && s.unit === 'm'));
  check('"2 tấn" chuẩn hoá đơn vị', P('xe nâng tay 2 tấn').specs.some((s) => s.unit === 'tấn'));
  check('"7.5kW" → kw', P('máy nén khí 7.5kW').specs.some((s) => s.unit === 'kw' && s.value === 7.5));
  check('"3 pha" không nuốt "pha" khỏi lõi sai chỗ', P('biến tần 3 pha').coreVi === 'biến tần');
}

console.log('\n== Cơ cấu + mác ==');
check('thủy lực → driveType hydraulic', P('bàn nâng thủy lực').mechanisms[0]?.driveType === 'hydraulic');
check('tự hành → mobility', P('xe nâng tự hành').mechanisms.some((m) => m.mobility === 'self-propelled'));
check('bóc mác P20', P('thép tấm p20').materialGrades.includes('P20'));
check('bóc SUS304', P('ống inox sus304').materialGrades.includes('SUS304'));

console.log('\n== Rào an toàn ==');
check('gỡ hết thì trả câu gốc', P('thủy lực').coreVi === 'thủy lực');
check('câu rỗng không nổ', P('').coreVi === '');
check('không có gì để bóc → stripped=false', P('tủ lạnh').stripped === false);

if (failed) { console.error(`\n❌ ${failed} kiểm tra thất bại\n`); process.exit(1); }
console.log('\n✅ query-parse: tất cả kiểm tra đạt\n');
