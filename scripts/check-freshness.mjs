#!/usr/bin/env node
/**
 * In báo cáo độ mới dữ liệu (data/data-freshness.json) và thoát mã 1 khi có
 * nguồn quá hạn đối chiếu / sắp hoặc đã hết hiệu lực. Chạy hằng tuần bởi
 * .github/workflows/data-freshness.yml — job đỏ = GitHub báo cho chủ repo.
 *
 * Sau khi đã đối chiếu nguồn chính thống: cập nhật lastCheckedAt trong
 * data/data-freshness.json (và dữ liệu, nếu có văn bản mới).
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { freshnessReport } = require('../lib/data-freshness.js');

const report = freshnessReport();
for (const s of report.sources) {
  const mark = s.status === 'OK' ? '✓' : '✗';
  const extra = [
    s.lastCheckedAt ? `đối chiếu lần cuối ${s.lastCheckedAt} (${s.daysSinceCheck} ngày)` : null,
    s.validUntil ? `hiệu lực đến ${s.validUntil} (còn ${s.daysUntilExpiry} ngày)` : null,
  ].filter(Boolean).join(' · ');
  console.log(`${mark} [${s.status}] ${s.labelVi} — ${extra}`);
  if (s.howToCheckVi) console.log(`    → ${s.howToCheckVi}`);
}
if (!report.ok) {
  console.log('\nCó nguồn dữ liệu cần đối chiếu. Cập nhật dữ liệu + lastCheckedAt trong data/data-freshness.json.');
  process.exit(1);
}
