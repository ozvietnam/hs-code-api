#!/usr/bin/env node
// Chống lệch tài liệu/mã (#240 điểm 3): mọi provider khai trong lib/llm-tier.js
// (FALLBACK_PROVIDERS) PHẢI có thật trong lib/llm.mjs (buildProviders/listConfigured).
// Khai suông (vd 'byteplus' cũ — có envKey nhưng llm.mjs không gọi được) = ĐỎ ngay,
// để lần sau lệch là CI bắt, không âm thầm báo health sai.
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { FALLBACK_PROVIDERS } = require('../lib/llm-tier.js');
const { listConfigured } = await import('../lib/llm.mjs');

let passed = 0;
let failed = 0;
function assert(name, cond, detail) {
  if (cond) { passed += 1; console.log('PASS', name); }
  else { failed += 1; console.log('FAIL', name, detail != null ? '→ ' + detail : ''); }
}

const mjsProviders = new Set(listConfigured().map((p) => p.provider));
const tierNames = FALLBACK_PROVIDERS.map((p) => p.name);

assert('FALLBACK_PROVIDERS không rỗng', tierNames.length > 0);
for (const n of tierNames) {
  assert(`provider "${n}" (llm-tier) tồn tại trong llm.mjs`, mjsProviders.has(n), `llm.mjs có: ${[...mjsProviders].join(', ')}`);
}

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
