#!/usr/bin/env node
/**
 * Vá data/tax-enriched.json bằng luật tất định ở lib/policy-rules.js.
 * Chạy lại an toàn (idempotent). Mặc định chỉ in thống kê; --write để ghi.
 *
 *   node scripts/fix-policy-rules.mjs          # xem trước
 *   node scripts/fix-policy-rules.mjs --write
 */
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { dataPath, dataReadPath } = require('../lib/data-paths.js');
const { applyPolicyRules } = require('../lib/policy-rules.js');

const enriched = JSON.parse(fs.readFileSync(dataReadPath('tax-enriched.json'), 'utf8'));
const count = {};
const samples = {};
for (const [hs, entry] of Object.entries(enriched)) {
  const { warnings, applied } = applyPolicyRules(entry.warnings);
  if (!applied.length) continue;
  entry.warnings = warnings;
  for (const a of applied) {
    count[a] = (count[a] || 0) + 1;
    (samples[a] ||= []).length < 3 && samples[a].push(`${hs}: ${warnings.summary.slice(0, 140)}`);
  }
}
console.log('Số dòng sửa theo luật:', count);
for (const [a, s] of Object.entries(samples)) console.log(`\n${a}:\n  ${s.join('\n  ')}`);
if (process.argv.includes('--write')) {
  fs.writeFileSync(dataPath('tax-enriched.json'), JSON.stringify(enriched)); // giữ định dạng 1 dòng như enrich-policies
  console.log('\nĐã ghi data/tax-enriched.json');
}
