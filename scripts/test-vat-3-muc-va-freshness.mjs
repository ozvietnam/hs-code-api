#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Kiểm chứng OZV-603:
 * 1) parseVatField / vatReductionOf với dòng ≥ 3 mức ("5/8/10"):
 *    - Giữ tương thích ngược parseVatField("10/8") → { current: "10", other: "8" }.
 *    - Fake clock >= 2027-01-01 (vd 2027-01-02): mức "8" hết hạn bị loại khỏi danh sách mức
 *      ⇒ dòng "5/8/10" trả mức cao còn hợp lệ ("10") kèm cảnh báo; dòng "8/10" trả "10";
 *      dòng "*" không đổi; 0 dòng trên toàn bộ 11.871 mã tax.json trả rate "8".
 * 2) freshnessReport():
 *    - EXPIRING là cảnh báo, không phải lỗi ⇒ ok chỉ false khi có nguồn DUE hoặc EXPIRED.
 *    - sources[] vẫn giữ nguyên nguồn EXPIRING; thêm warnings[] chứa
 *      { key, labelVi, validUntil, daysUntilExpiry, legalBasis }.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { parseVatField, vatReductionOf } = require('../lib/vat-reduction');
const { freshnessReport, evaluateSource } = require('../lib/data-freshness');
const taxData = require('../data/tax.json');

let pass = 0;
let fail = 0;
function check(name, cond, detail) {
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name}`, detail === undefined ? '' : JSON.stringify(detail));
  }
}

const at = (d) => new Date(`${d}T12:00:00Z`);

function withFakeClock(isoDate, fn) {
  const targetMs = at(isoDate).getTime();
  const OrigDate = Date;
  const realNow = Date.now;
  globalThis.Date = class extends OrigDate {
    constructor(...args) {
      super(...(args.length ? args : [targetMs]));
    }
    static now() {
      return targetMs;
    }
  };
  try {
    return fn();
  } finally {
    globalThis.Date = OrigDate;
    Date.now = realNow;
  }
}

// 1. parseVatField tương thích ngược + hỗ trợ ≥ 3 mức
const p108 = parseVatField('10/8');
check(
  'parseVatField("10/8") giữ tương thích ngược current="10", other="8"',
  p108.current === '10' && p108.other === '8',
  p108,
);

const p810 = parseVatField('8/10');
check(
  'parseVatField("8/10") trả current="8", other="10"',
  p810.current === '8' && p810.other === '10',
  p810,
);

const p5810 = parseVatField('5/8/10');
check(
  'parseVatField("5/8/10") tách đủ 3 mức và không lấy nhầm other="8"',
  p5810.current === '5' &&
    p5810.other === '10' &&
    Array.isArray(p5810.rates) &&
    p5810.rates.join('/') === '5/8/10',
  p5810,
);

const pEmpty = parseVatField('');
check(
  'parseVatField("") trả current=null, other=null',
  pEmpty.current === null && pEmpty.other === null,
  pEmpty,
);

// 2. vatReductionOf trước hạn (2026-11-15) và sau hạn (fake clock 2027-01-02)
withFakeClock('2026-11-15', () => {
  const r5810 = vatReductionOf({ vat: '5/8/10', giam_vat: '' });
  check(
    'Trước 2027-01-01: dòng "5/8/10" trả rate="5", reduced=true, eligible=true',
    r5810 && r5810.rate === '5' && r5810.reduced === true && r5810.eligible === true,
    r5810,
  );
});

withFakeClock('2027-01-02', () => {
  const r810 = vatReductionOf({ vat: '8/10', giam_vat: '' });
  check(
    'Fake clock 2027-01-02: dòng 2 mức "8/10" trả rate="10", alternateRate="8", eligible=false',
    r810 &&
      r810.rate === '10' &&
      r810.alternateRate === '8' &&
      r810.reduced === false &&
      r810.eligible === false &&
      r810.severity === 'warning' &&
      /hết hạn/.test(r810.noteVi),
    r810,
  );

  const r5810 = vatReductionOf({ vat: '5/8/10', giam_vat: '' });
  check(
    'Fake clock 2027-01-02: dòng 3 mức "5/8/10" KHÔNG trả "8", phải trả mức cao còn hợp lệ "10" kèm cảnh báo',
    r5810 &&
      r5810.rate === '10' &&
      r5810.rate !== '8' &&
      r5810.alternateRate === '5' &&
      r5810.reduced === false &&
      r5810.eligible === false &&
      r5810.severity === 'warning' &&
      /hết hạn/.test(r5810.noteVi),
    r5810,
  );

  const rStar = vatReductionOf({ vat: '*/5/8/10', giam_vat: '' });
  check(
    'Fake clock 2027-01-02: dòng "*" ("*/5/8/10") không đổi, giữ rate="*"',
    rStar && rStar.rate === '*' && rStar.reduced === null && rStar.eligible === null,
    rStar,
  );

  // Quét toàn bộ 11.871 dòng data/tax.json thật ở fake clock 2027-01-02
  const rows = Object.values(taxData);
  const byRate = {};
  let rate8From810Or5810 = 0;
  let count810To10 = 0;
  let count5810To10 = 0;
  for (const row of rows) {
    const res = vatReductionOf(row);
    const k = res ? String(res.rate) : 'null';
    byRate[k] = (byRate[k] || 0) + 1;
    if (res?.rate === '8' && (row.vat === '8/10' || row.vat === '5/8/10')) {
      rate8From810Or5810++;
    }
    if (row.vat === '8/10' && res?.rate === '10') count810To10++;
    if (row.vat === '5/8/10' && res?.rate === '10') count5810To10++;
  }

  check(
    'Fake clock 2027-01-02 trên 11.871 dòng tax.json: 0 dòng trả rate="8"',
    (byRate['8'] || 0) === 0 && rate8From810Or5810 === 0,
    byRate,
  );
  check(
    'Fake clock 2027-01-02 trên tax.json: đủ 8.219 dòng "8/10" trả rate="10"',
    count810To10 === 8219,
    { count810To10 },
  );
  check(
    'Fake clock 2027-01-02 trên tax.json: đủ 606 dòng "5/8/10" trả rate="10"',
    count5810To10 === 606,
    { count5810To10 },
  );
  check(
    'Fake clock 2027-01-02 trên tax.json: tổng cộng 10.386 dòng trả rate="10" (8219 + 606 + 1561)',
    byRate['10'] === 10386 && byRate['*'] === 1028 && byRate['null'] === 457,
    byRate,
  );
});

// 3. freshnessReport(): EXPIRING → ok=true + có warnings[]; DUE / EXPIRED → ok=false
const repExpiringOnly = freshnessReport(at('2026-11-15'));
const vatSrc = repExpiringOnly.sources.find((s) => s.key === 'vatReduction');
const hasDueOrExpired = repExpiringOnly.sources.some(
  (s) => s.status === 'DUE' || s.status === 'EXPIRED',
);
check(
  'Tại 2026-11-15: vatReduction có status="EXPIRING" trong sources[], không nguồn nào DUE/EXPIRED',
  vatSrc?.status === 'EXPIRING' &&
    vatSrc?.validUntil === '2026-12-31' &&
    typeof vatSrc?.daysUntilExpiry === 'number' &&
    vatSrc?.legalBasis === '174/2025/NĐ-CP' &&
    !hasDueOrExpired,
  vatSrc,
);
check(
  'freshnessReport() khi chỉ có EXPIRING (không DUE/EXPIRED) ⇒ ok=true',
  repExpiringOnly.ok === true,
  { ok: repExpiringOnly.ok, statuses: repExpiringOnly.sources.map((s) => `${s.key}:${s.status}`) },
);
const vatWarn = Array.isArray(repExpiringOnly.warnings)
  ? repExpiringOnly.warnings.find((w) => w.key === 'vatReduction')
  : null;
check(
  'freshnessReport().warnings[] chứa nguồn EXPIRING đủ key, labelVi, validUntil, daysUntilExpiry, legalBasis',
  Boolean(
    vatWarn &&
      vatWarn.key === 'vatReduction' &&
      typeof vatWarn.labelVi === 'string' &&
      vatWarn.labelVi.length > 0 &&
      vatWarn.validUntil === '2026-12-31' &&
      vatWarn.daysUntilExpiry === 46 &&
      vatWarn.legalBasis === '174/2025/NĐ-CP',
  ),
  repExpiringOnly.warnings,
);

const repDue = freshnessReport(at('2026-12-01'));
check(
  'freshnessReport() khi có nguồn DUE ⇒ ok=false',
  repDue.sources.some((s) => s.status === 'DUE') && repDue.ok === false,
  { ok: repDue.ok },
);

const repExpired = freshnessReport(at('2027-01-02'));
check(
  'freshnessReport() khi có nguồn EXPIRED ⇒ ok=false',
  repExpired.sources.some((s) => s.status === 'EXPIRED') && repExpired.ok === false,
  { ok: repExpired.ok },
);

const evExpiring = evaluateSource(
  'demo',
  { labelVi: 'Demo', validUntil: '2026-12-31', warnBeforeDays: 60, legalBasis: '174/2025/NĐ-CP' },
  at('2026-11-15'),
);
check(
  'evaluateSource vẫn trả status="EXPIRING" kèm daysUntilExpiry + validUntil + legalBasis',
  evExpiring.status === 'EXPIRING' &&
    evExpiring.validUntil === '2026-12-31' &&
    evExpiring.daysUntilExpiry === 46 &&
    evExpiring.legalBasis === '174/2025/NĐ-CP',
  evExpiring,
);

// 4. /api/health trả dataStatus="fresh" và checks.dataFreshness.ok=true khi chỉ có EXPIRING
const healthHandler = require('../api/health');
withFakeClock('2026-11-15', () => {
  let healthBody = null;
  const req = { method: 'GET', headers: {} };
  const res = {
    setHeader() {},
    status() {
      return this;
    },
    json(payload) {
      healthBody = payload;
      return this;
    },
  };
  healthHandler(req, res);
  const df = healthBody?.checks?.dataFreshness;
  check(
    '/api/health tại 2026-11-15: dataStatus="fresh", dataFreshness.ok=true, giữ EXPIRING trong sources[] và warnings[]',
    Boolean(
      healthBody &&
        healthBody.dataStatus === 'fresh' &&
        df?.ok === true &&
        df?.sources?.some((s) => s.key === 'vatReduction' && s.status === 'EXPIRING') &&
        df?.warnings?.some(
          (w) =>
            w.key === 'vatReduction' &&
            w.validUntil === '2026-12-31' &&
            w.daysUntilExpiry === 46,
        ),
    ),
    { dataStatus: healthBody?.dataStatus, ok: df?.ok, warnings: df?.warnings },
  );
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
