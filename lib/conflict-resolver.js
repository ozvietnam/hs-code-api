// Conflict Resolver — bảng quyết định deterministic (DESIGN 2026-07-08).
// Post-refiner trên top-3 LLM; chỉ override khi attrs đủ evidence cứng.
// OZV-1382: đọc công suất (1,5 kW / 1.500 W) và dung tích (lít) từ mô tả khi bảng khai fromText.

const searchUtils = require('./search-utils.js');

/** Bắt mô tả hàng khi earlyExitChotTuConflict gọi removeDiacritics — không đổi đầu ra. */
if (!searchUtils.removeDiacritics.__ozv1382Capture) {
  const orig = searchUtils.removeDiacritics;
  function captureRemoveDiacritics(s) {
    const str = String(s ?? '');
    if (str.length >= 15) captureRemoveDiacritics._lastProduct = str;
    return orig(s);
  }
  captureRemoveDiacritics.__ozv1382Capture = true;
  captureRemoveDiacritics._lastProduct = '';
  searchUtils.removeDiacritics = captureRemoveDiacritics;
}

function capturedProductText() {
  return searchUtils.removeDiacritics._lastProduct || '';
}

/**
 * Đọc công suất → Watt. Hiểu "1,5 kW"/"1.5 kW" (thập phân) và "1.500 W" (dấu chấm nghìn kiểu VN).
 * @returns {number|null}
 */
function extractPowerWatts(text) {
  const t = String(text || '');
  const re = /(\d{1,4}(?:[.,]\d{1,3})?)\s*(k\s*w|kw|w)\b/gi;
  let best = null;
  for (const m of t.matchAll(re)) {
    const unit = m[2].replace(/\s+/g, '').toLowerCase();
    const raw = m[1];
    let watts;
    if (unit === 'kw') {
      const n = Number(raw.replace(',', '.'));
      if (!Number.isFinite(n)) continue;
      watts = n * 1000;
    } else {
      // W: "1.500" / "1,500" = nghìn; "1.5" hiếm với W — coi thập phân
      if (/^\d{1,3}[.,]\d{3}$/.test(raw)) {
        watts = Number(raw.replace(/[.,]/g, ''));
      } else {
        watts = Number(raw.replace(',', '.'));
      }
    }
    if (!Number.isFinite(watts) || watts <= 0) continue;
    // Ưu tiên số gắn "công suất" nếu có nhiều; lấy số đầu hợp lệ gần ngữ cảnh hút bụi/công suất
    if (best == null) best = watts;
  }
  return best;
}

/**
 * Đọc dung tích đồ chứa / thùng → lít.
 * @returns {number|null}
 */
function extractVolumeLiters(text) {
  const t = String(text || '');
  const patterns = [
    /(?:thùng|túi|đồ chứa|do chua|sức chứa|suc chua|dung tích(?:\s+thùng)?|container|capacity)[^\d]{0,24}(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:lít|lit|l)\b/gi,
    /(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:lít|lit)\b/gi,
  ];
  for (const re of patterns) {
    for (const m of t.matchAll(re)) {
      const n = Number(String(m[1]).replace(',', '.'));
      if (Number.isFinite(n) && n > 0 && n <= 5000) return n;
    }
  }
  return null;
}

function deriveFromText(productText, spec) {
  if (!spec || !productText) return null;
  if (spec.kind === 'powerW') {
    const w = extractPowerWatts(productText);
    if (w == null) return null;
    const lim = Number(spec.le);
    if (!Number.isFinite(lim)) return null;
    return w <= lim ? spec.domainLe : spec.domainGt;
  }
  if (spec.kind === 'volumeL') {
    const lit = extractVolumeLiters(productText);
    if (lit == null) return null;
    const lim = Number(spec.le);
    if (!Number.isFinite(lim)) return null;
    return lit <= lim ? spec.domainLe : spec.domainGt;
  }
  return null;
}

function enrichAttrsFromTable(attrs, table, productText) {
  const out = { ...(attrs || {}) };
  if (!table || !productText) return out;
  for (const inp of table.inputs || []) {
    if (!inp?.fromText || !inp.attribute) continue;
    const derived = deriveFromText(productText, inp.fromText);
    if (derived) out[inp.attribute] = derived;
  }
  return out;
}

function resolveAttr(attrs, canonicalKey, registry) {
  const def = registry?.[canonicalKey];
  if (!def) return { value: null, present: false };
  const raw = attrs?.[canonicalKey] ?? (def.aliasVi ? attrs?.[def.aliasVi] : undefined);
  if (raw == null || String(raw).trim() === '') return { value: null, present: false };
  const value = String(raw).trim();
  return { value, present: true };
}

function narrowMembers(table, inputs) {
  const narrowed = table.members.filter((hs) =>
    table.rules.some((r) =>
      r.hs === hs && Object.keys(r.when).every((k) => !(k in inputs) || inputs[k] === r.when[k]),
    ),
  );
  return [...new Set(narrowed)];
}

function pickRule(matched, hitPolicy) {
  if (!matched.length) return null;
  if (hitPolicy === 'PRIORITY') {
    return matched.reduce((best, r) => (r.priority > best.priority ? r : best), matched[0]);
  }
  return matched[0];
}

function resolveConflict(top, results, attrs, deps = {}) {
  try {
    if (!top?.hs || top.hs.length !== 8) {
      return { status: 'SKIP', reason: 'no 8-digit top' };
    }

    const conflictsDb = deps.conflictsDb || {};
    const tablesDb = deps.tablesDb || {};
    const registry = deps.registry || {};

    const group = conflictsDb[top.hs]?.group;
    if (!group) return { status: 'SKIP', reason: 'no group' };

    const table = tablesDb.tables?.[group];
    if (!table) return { status: 'SKIP', reason: 'no table' };

    const productText = deps.productText || capturedProductText();
    const effectiveAttrs = enrichAttrsFromTable(attrs, table, productText);

    const inputs = {};
    const ask = [];

    for (const inp of table.inputs || []) {
      const def = registry[inp.attribute];
      if (!def) continue;
      const { value, present } = resolveAttr(effectiveAttrs, inp.attribute, registry);
      if (present && def.domain.includes(value)) {
        inputs[inp.attribute] = value;
      } else {
        ask.push({ attribute: inp.attribute, questionVi: def.questionVi });
      }
    }

    const matched = (table.rules || []).filter((r) =>
      Object.keys(r.when).every((k) => inputs[k] === r.when[k]),
    );

    if (matched.length >= 1) {
      const pick = pickRule(matched, table.hitPolicy || 'PRIORITY');
      const trace = [{
        ruleId: pick.id,
        when: pick.when,
        hs: pick.hs,
        gir: pick.gir,
        reasonVi: pick.reasonVi,
        source: pick.source,
      }];
      const overrodeLlm = pick.hs !== top.hs;
      return {
        status: 'RESOLVED',
        group,
        decidedHs: pick.hs,
        overrodeLlm,
        gir: pick.gir,
        reasonVi: pick.reasonVi,
        tableVerified: table.verified === true,
        trace,
        ask: [],
      };
    }

    const narrowed = narrowMembers(table, inputs);
    if (ask.length) {
      return { status: 'INSUFFICIENT', group, narrowed, ask, trace: [] };
    }
    return { status: 'NARROWED', group, narrowed, ask: [], trace: [] };
  } catch {
    return { status: 'SKIP', reason: 'resolver error' };
  }
}

module.exports = {
  resolveConflict,
  resolveAttr,
  narrowMembers,
  extractPowerWatts,
  extractVolumeLiters,
  deriveFromText,
  enrichAttrsFromTable,
};
