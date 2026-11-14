#!/usr/bin/env node
import './test-isolate-data.mjs';
/** Tính trạng thái độ mới dữ liệu + cảnh báo VAT hết hạn (thời gian cố định, không phụ thuộc hôm nay). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const {
  evaluateSource,
  freshnessReport,
  legalDocsInfo,
  docDataFreshnessTuHealth,
  demNguonDueTuHealth,
} = require('../lib/data-freshness');
const healthHandler = require('../api/health');

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };
const at = (d) => new Date(`${d}T12:00:00Z`);

check('trong hạn → OK', evaluateSource('x', { lastCheckedAt: '2026-01-01', checkEveryDays: 30 }, at('2026-01-20')).status === 'OK');
check('quá hạn đối chiếu → DUE', evaluateSource('x', { lastCheckedAt: '2026-01-01', checkEveryDays: 30 }, at('2026-03-01')).status === 'DUE');
check('sắp hết hiệu lực → EXPIRING', evaluateSource('x', { validUntil: '2026-12-31', warnBeforeDays: 60 }, at('2026-12-01')).status === 'EXPIRING');
check('hết hiệu lực → EXPIRED', evaluateSource('x', { validUntil: '2026-12-31' }, at('2027-01-02')).status === 'EXPIRED');
const rep = freshnessReport();
const ldChecked = rep.sources.find((s) => s.key === 'legalDocs')?.lastCheckedAt;
const ld = legalDocsInfo(at(ldChecked));
check('legalDocsInfo trong hạn → OK, không noteVi, đếm văn bản', ld && ld.freshness === 'OK' && !ld.noteVi && ld.totalDocs > 0, ld);
const ldDue = legalDocsInfo(new Date(at(ldChecked).getTime() + 400 * 864e5));
check('legalDocsInfo quá hạn → DUE + noteVi', ldDue && ldDue.freshness === 'DUE' && /kiểm tra lại/.test(ldDue.noteVi), ldDue);
check('manifest có tariff + vatReduction', ['tariff', 'vatReduction'].every((k) => rep.sources.some((s) => s.key === k)));

// VAT: sau 31/12/2026 dòng đang giảm phải báo hết hạn, không im lặng báo 8%.
const vr = require('../lib/vat-reduction');
const realNow = Date.now;
const row = { vat: '8/10', giam_vat: '' };
check('VAT trong hạn: eligible=true, có validUntil', vr.vatReductionOf(row).eligible === true && vr.vatReductionOf(row).validUntil === '2026-12-31');
Date.now = () => at('2027-01-05').getTime();
const OrigDate = Date;
globalThis.Date = class extends OrigDate { constructor(...a) { super(...(a.length ? a : [at('2027-01-05').getTime()])); } static now() { return at('2027-01-05').getTime(); } };
const exp = vr.vatReductionOf(row);
globalThis.Date = OrigDate;
Date.now = realNow;
check('VAT sau hạn: rate về 10 (không giảm), eligible=false + cảnh báo — ERP đọc rate không khai thiếu', exp.rate === '10' && exp.alternateRate === '8' && exp.reduced === false && exp.eligible === false && exp.severity === 'warning' && /hết hạn/.test(exp.noteVi), exp);

// OZV-815: /api/health đặt khối độ mới ở `checks.dataFreshness` (gốc chỉ có `dataStatus`).
// Khoá: `checks.dataFreshness.sources` là mảng >= 8 phần tử, 0 mục DUE trên manifest chuẩn,
// và ca đếm DUE phải ĐỎ (trả > 0) nếu 1 nguồn mang `trangThai: "DUE"` (hoặc `status: "DUE"`).
{
  const targetMs = at('2026-11-14').getTime();
  Date.now = () => targetMs;
  globalThis.Date = class extends OrigDate {
    constructor(...a) { super(...(a.length ? a : [targetMs])); }
    static now() { return targetMs; }
  };
  let healthBody = null;
  try {
    healthHandler(
      { method: 'GET', headers: {} },
      {
        setHeader() {},
        status() { return this; },
        json(payload) { healthBody = payload; return this; },
      },
    );
  } finally {
    globalThis.Date = OrigDate;
    Date.now = realNow;
  }

  const df = docDataFreshnessTuHealth(healthBody);
  const dueCount = demNguonDueTuHealth(healthBody);
  check(
    '/api/health: dataFreshness nằm ở checks.dataFreshness, KHÔNG ở gốc phản hồi (gốc chỉ có dataStatus)',
    Boolean(healthBody && !('dataFreshness' in healthBody) && ['fresh', 'stale'].includes(healthBody.dataStatus) && df),
    { rootHasDataFreshness: 'dataFreshness' in (healthBody || {}), dataStatus: healthBody?.dataStatus },
  );
  check(
    '/api/health: checks.dataFreshness.sources là mảng >= 8 phần tử và có 0 mục DUE',
    Array.isArray(df?.sources) && df.sources.length >= 8 && dueCount === 0 && healthBody?.dataStatus === 'fresh',
    { totalSources: df?.sources?.length, dueCount, dataStatus: healthBody?.dataStatus },
  );
  check(
    '/api/health: đọc sai tầng ở gốc (healthBody.dataFreshness) ⇒ trả null, không im lặng báo 0 DUE',
    docDataFreshnessTuHealth({ dataStatus: 'fresh', dataFreshness: df }) === null &&
      demNguonDueTuHealth({ dataStatus: 'fresh', dataFreshness: df }) === null,
  );

  // Chứng minh ca đếm DUE không rỗng (Quy tắc 5): nếu 1 nguồn mang `trangThai: "DUE"` thì ca `dueCount === 0` phải ĐỎ.
  const fixtureCoDue = {
    ...healthBody,
    checks: {
      ...healthBody.checks,
      dataFreshness: {
        ...df,
        sources: df.sources.map((s, idx) =>
          idx === 0
            ? { key: s.key, labelVi: s.labelVi, trangThai: 'DUE' }
            : { key: s.key, labelVi: s.labelVi, status: 'OK' },
        ),
      },
    },
  };
  const dueKhiBia = demNguonDueTuHealth(fixtureCoDue);
  check(
    '/api/health: khi 1 nguồn trong checks.dataFreshness.sources mang trangThai="DUE" ⇒ đếm DUE = 1 (ca kiểm 0 DUE sẽ ĐỎ)',
    dueKhiBia === 1 && (dueKhiBia === 0) === false,
    { dueKhiBia },
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
