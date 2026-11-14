/**
 * Độ mới của dữ liệu — để hệ thống TỰ BÁO khi dữ liệu có thể đã lỗi thời,
 * thay vì im lặng trả biểu thuế cũ như thể đang hiệu lực.
 *
 * Nguồn: data/data-freshness.json (người vận hành cập nhật lastCheckedAt sau
 * mỗi lần đối chiếu nguồn chính thống).
 *
 * Trạng thái mỗi nguồn:
 *   OK        trong hạn đối chiếu
 *   DUE       quá hạn đối chiếu (lastCheckedAt + checkEveryDays < hôm nay)
 *   EXPIRING  sắp hết hiệu lực (validUntil trong warnBeforeDays ngày tới)
 *   EXPIRED   đã quá validUntil
 */
const fs = require('fs');
const { dataReadPath } = require('./data-paths');

const DAY = 24 * 60 * 60 * 1000;

function loadManifest() {
  try {
    return JSON.parse(fs.readFileSync(dataReadPath('data-freshness.json'), 'utf8')).sources || {};
  } catch {
    return {};
  }
}

function daysBetween(a, b) {
  return Math.floor((b.getTime() - a.getTime()) / DAY);
}

function evaluateSource(key, src, now = new Date()) {
  const explicitStatus = src.status || src.trangThai;
  const out = { key, labelVi: src.labelVi || key, status: explicitStatus || 'OK' };
  if (src.trangThai) out.trangThai = src.trangThai;
  if (src.lastCheckedAt) {
    const age = daysBetween(new Date(`${src.lastCheckedAt}T00:00:00Z`), now);
    out.lastCheckedAt = src.lastCheckedAt;
    out.daysSinceCheck = age;
    if (src.checkEveryDays && age > src.checkEveryDays) out.status = 'DUE';
  }
  if (src.validUntil) {
    const left = daysBetween(now, new Date(`${src.validUntil}T23:59:59Z`));
    out.validUntil = src.validUntil;
    out.daysUntilExpiry = left;
    if (left < 0) out.status = 'EXPIRED';
    else if (src.warnBeforeDays && left <= src.warnBeforeDays && out.status === 'OK') out.status = 'EXPIRING';
    else if (src.warnBeforeDays && left <= src.warnBeforeDays) out.expiringSoon = true;
  }
  if (src.effectiveDate) out.effectiveDate = src.effectiveDate;
  if (src.legalBasis) out.legalBasis = src.legalBasis;
  if (out.status !== 'OK' && src.howToCheckVi) out.howToCheckVi = src.howToCheckVi;
  return out;
}

/** @returns {{ok:boolean, sources:object[], warnings:object[]}} */
function freshnessReport(now = new Date()) {
  const manifest = loadManifest();
  const sources = Object.entries(manifest).map(([k, v]) => evaluateSource(k, v, now));
  const ok = sources.every((s) => s.status !== 'DUE' && s.status !== 'EXPIRED');
  const warnings = sources
    .filter((s) => s.status === 'EXPIRING' || s.expiringSoon)
    .map((s) => ({
      key: s.key,
      labelVi: s.labelVi,
      validUntil: s.validUntil ?? null,
      daysUntilExpiry: s.daysUntilExpiry ?? null,
      legalBasis: s.legalBasis ?? null,
    }));
  return { ok, sources, warnings };
}

/** Thông tin phiên bản biểu thuế để gắn vào mọi response tra thuế. */
function tariffInfo(now = new Date()) {
  const src = loadManifest().tariff;
  if (!src) return null;
  const ev = evaluateSource('tariff', src, now);
  return {
    effectiveDate: src.effectiveDate || null,
    lastCheckedAt: src.lastCheckedAt || null,
    freshness: ev.status,
    ...(ev.status !== 'OK'
      ? { noteVi: `Biểu thuế chưa được đối chiếu văn bản mới từ ${src.lastCheckedAt} — kiểm tra lại trước khi khai.` }
      : {}),
  };
}

function vatReductionPolicy() {
  return loadManifest().vatReduction || null;
}

/** Thông tin độ mới của legal-docs để gắn vào response /api/legal-docs.
 *  Trả { lastCheckedAt, freshness, totalDocs, noteVi? } — noteVi chỉ có khi freshness ≠ OK.
 */
function legalDocsInfo(now = new Date()) {
  const src = loadManifest().legalDocs;
  if (!src) return null;
  const ev = evaluateSource('legalDocs', src, now);
  const docs = (() => {
    try {
      const { loadLegalDocs } = require('./legal-docs');
      const data = loadLegalDocs();
      return Object.keys(data.documents || {}).length;
    } catch { return null; }
  })();
  return {
    lastCheckedAt: src.lastCheckedAt || null,
    freshness: ev.status,
    totalDocs: docs,
    ...(ev.status !== 'OK'
      ? {
          noteVi: `Danh mục văn bản pháp luật chưa được đối chiếu hiệu lực từ ${src.lastCheckedAt} — kiểm tra lại trước khi dùng.`,
        }
      : {}),
  };
}

/**
 * Đọc khối độ mới dữ liệu từ phản hồi `/api/health` (mục tiêu A4 — OZV-815).
 * Trường thật nằm ở `checks.dataFreshness` (gốc phản hồi chỉ có `dataStatus`).
 * Không đọc `healthBody.dataFreshness` ở gốc để tránh đọc nhầm tầng.
 */
function docDataFreshnessTuHealth(healthBody) {
  if (!healthBody || typeof healthBody !== 'object') return null;
  const df = healthBody?.checks?.dataFreshness;
  if (!df || typeof df !== 'object' || !Array.isArray(df.sources)) return null;
  return df;
}

/**
 * Đếm số nguồn `DUE` từ phản hồi `/api/health` (`checks.dataFreshness.sources`).
 * Nhận cả `status: "DUE"` (trường chuẩn của `evaluateSource`) và `trangThai: "DUE"` (fixture kiểm thử).
 * Trả `null` nếu không đọc được mảng `checks.dataFreshness.sources`.
 */
function demNguonDueTuHealth(healthBody) {
  const df = docDataFreshnessTuHealth(healthBody);
  if (!df) return null;
  return df.sources.filter((s) => s?.status === 'DUE' || s?.trangThai === 'DUE').length;
}

module.exports = {
  freshnessReport,
  tariffInfo,
  vatReductionPolicy,
  legalDocsInfo,
  evaluateSource,
  docDataFreshnessTuHealth,
  demNguonDueTuHealth,
};
