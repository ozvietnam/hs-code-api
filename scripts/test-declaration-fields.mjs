#!/usr/bin/env node
// Test OZV-1718 (con của OZV-1707): 6 dòng "Không hoạt động bằng điện" của nhóm 8479
// (84791020, 84792020, 84794020, 84798120, 84798220, 84798970) gỡ power + voltage khỏi
// required ở tầng hs-declaration-overrides.json, thêm modelNumber + dimensions vào recommended.
// Ca ngược: các dòng "Hoạt động bằng điện" cùng phân nhóm (8479xx10, 84798969) và khuôn nhóm
// 4 số 8479 / 84799090 (tương thích ch84-generic-fallback) vẫn giữ required [machineFunction, power, voltage].
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { declarationFields, missingStructured } = require('../lib/declaration-fields.js');
const { getDeclarationFieldSpec } = require('../lib/compliance-data.js');

let passed = 0;
let failed = 0;
function check(name, cond, extra = '') {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

const NON_ELECTRIC_8479 = [
  '84791020',
  '84792020',
  '84794020',
  '84798120',
  '84798220',
  '84798970',
];

const ELECTRIC_SIBLINGS_8479 = [
  '84791010',
  '84792010',
  '84794010',
  '84798110',
  '84798210',
  '84798969',
];

// 1. Ca mục tiêu trong thẻ: hộp găng tay thao tác cách ly cơ khí (84798970) không bị đòi power / voltage.
{
  const missing = missingStructured('84798970', {
    description: 'Hộp găng tay thao tác cách ly cơ khí bằng inox',
  });
  const keys = missing.map((f) => f.key);
  check(
    '84798970 hộp găng tay cơ khí: missingStructured không đòi power và voltage',
    !keys.includes('power') && !keys.includes('voltage'),
    JSON.stringify(keys)
  );
  check(
    '84798970 hộp găng tay cơ khí: chỉ còn đòi machineFunction khi chưa nêu chức năng',
    keys.length === 1 && keys[0] === 'machineFunction',
    JSON.stringify(keys)
  );
}

// 2. Cả 6 mã "Không hoạt động bằng điện" của nhóm 8479: gỡ power/voltage khỏi required, có modelNumber/dimensions ở recommended.
for (const hs of NON_ELECTRIC_8479) {
  const spec = getDeclarationFieldSpec(hs);
  const reqKeys = (spec?.required || []).map((f) => f.key);
  const recKeys = (spec?.recommended || []).map((f) => f.key);
  check(
    `${hs}: source='hs', heading='8479', required chỉ còn machineFunction (không có power, voltage)`,
    spec?.source === 'hs' &&
      spec?.heading === '8479' &&
      reqKeys.includes('machineFunction') &&
      !reqKeys.includes('power') &&
      !reqKeys.includes('voltage'),
    JSON.stringify({ source: spec?.source, reqKeys })
  );
  check(
    `${hs}: recommended có modelNumber và dimensions`,
    recKeys.includes('modelNumber') && recKeys.includes('dimensions'),
    JSON.stringify(recKeys)
  );

  const missingWhenFuncPresent = missingStructured(hs, {
    tenHang: 'Thiết bị cơ khí có chức năng gia công bề mặt',
  });
  check(
    `${hs}: khi đã có chức năng máy thì missingStructured rỗng (0 câu chặn)`,
    missingWhenFuncPresent.length === 0,
    JSON.stringify(missingWhenFuncPresent.map((f) => f.key))
  );

  const df = declarationFields(hs);
  const dfReq = (df?.fields || []).filter((f) => f.required).map((f) => f.key);
  check(
    `${hs}: declarationFields đồng nhất không đòi power/voltage bắt buộc`,
    df?.source === 'hs' && !dfReq.includes('power') && !dfReq.includes('voltage'),
    JSON.stringify(dfReq)
  );
}

// 3. Ca ngược: các dòng "Hoạt động bằng điện" cùng phân nhóm vẫn đòi đủ machineFunction, power, voltage.
for (const hs of ELECTRIC_SIBLINGS_8479) {
  const spec = getDeclarationFieldSpec(hs);
  const reqKeys = (spec?.required || []).map((f) => f.key);
  check(
    `ca ngược ${hs} (hoạt động bằng điện): vẫn đòi đủ machineFunction, power, voltage`,
    spec?.source === 'heading' &&
      ['machineFunction', 'power', 'voltage'].every((k) => reqKeys.includes(k)),
    JSON.stringify({ source: spec?.source, reqKeys })
  );
  const missing = missingStructured(hs, {
    description: 'Máy công nghiệp hoạt động bằng điện',
  });
  const mKeys = missing.map((f) => f.key);
  check(
    `ca ngược ${hs}: missingStructured vẫn đòi power và voltage khi thiếu thông số điện`,
    mKeys.includes('power') && mKeys.includes('voltage'),
    JSON.stringify(mKeys)
  );
}

// 4. Ca ngược: nhóm 4 số 8479 và mã 84799090 (dùng ở ch84-generic-fallback) giữ nguyên tầng heading.
{
  const df4 = declarationFields('8479');
  const req4 = (df4?.fields || []).filter((f) => f.required).map((f) => f.key);
  check(
    'ca ngược nhóm 4 số 8479: giữ nguyên required [machineFunction, power, voltage]',
    df4?.source === 'heading' &&
      ['machineFunction', 'power', 'voltage'].every((k) => req4.includes(k)),
    JSON.stringify({ source: df4?.source, req4 })
  );

  const spec9090 = getDeclarationFieldSpec('84799090');
  const req9090 = (spec9090?.required || []).map((f) => f.key);
  check(
    'ca ngược 84799090 (ch84-generic-fallback): giữ source=heading và required [machineFunction, power, voltage]',
    spec9090?.source === 'heading' &&
      ['machineFunction', 'power', 'voltage'].every((k) => req9090.includes(k)),
    JSON.stringify({ source: spec9090?.source, req9090 })
  );
}

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
