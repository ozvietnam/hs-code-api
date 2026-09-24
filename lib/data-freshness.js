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
  const out = { key, labelVi: src.labelVi || key, status: 'OK' };
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

/** @returns {{ok:boolean, sources:object[]}} */
function freshnessReport(now = new Date()) {
  const manifest = loadManifest();
  const sources = Object.entries(manifest).map(([k, v]) => evaluateSource(k, v, now));
  return { ok: sources.every((s) => s.status === 'OK'), sources };
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

module.exports = { freshnessReport, tariffInfo, vatReductionPolicy, evaluateSource };
