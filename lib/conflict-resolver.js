// Conflict Resolver — bảng quyết định deterministic (DESIGN 2026-07-08).
// Post-refiner trên top-3 LLM; chỉ override khi attrs đủ evidence cứng.
// OZV-1382: đọc công suất (1,5 kW / 1.500 W) và dung tích (lít) từ mô tả khi bảng khai fromText.
// Mô tả hàng chỉ nhận qua deps.productText — không vá removeDiacritics toàn cục (GĐ soát #1438).

const { removeDiacritics } = require('./search-utils.js');

/** Chuỗi gốc (giữ dấu), lowercase, có đệm khoảng trắng — dùng khi cụm JSON có dấu tiếng Việt. */
function originalProductText(productText) {
  return ` ${String(productText || '').toLowerCase().replace(/\s+/g, ' ').trim()} `;
}

function foldProductText(productText) {
  return ` ${removeDiacritics(String(productText || '').toLowerCase()).replace(/\s+/g, ' ').trim()} `;
}

/**
 * Khớp cụm từ có ranh giới chữ+số Unicode.
 * GĐ #1438 lần 3: cụm JSON CÓ dấu (khác bản bỏ dấu) → so trên chuỗi giữ dấu
 * (tránh "tủ đông"→"tu dong" ≡ "tự động"); cụm ASCII/không dấu → so trên folded.
 * Ranh giới: (?<![\p{L}\p{N}.,])…(?![\p{L}\p{N}]) — không dính giữa từ/số.
 */
function phraseHits(foldedHaystack, phrase, originalHaystack = null) {
  const raw = String(phrase || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!raw) return false;
  const folded = removeDiacritics(raw);
  const useOriginal = Boolean(originalHaystack) && raw !== folded;
  const hay = useOriginal ? originalHaystack : foldedHaystack;
  const needle = useOriginal ? raw : folded;
  if (!hay || !needle) return false;
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}.,])${esc}(?![\\p{L}\\p{N}])`, 'u').test(hay);
}

/**
 * Đọc công suất → Watt. Hiểu "1,5 kW"/"1.5 kW" (thập phân) và "1.500 W" (dấu chấm nghìn kiểu VN).
 * ≥2 số công suất khác nhau → null (không đoán).
 * @returns {number|null}
 */
function extractPowerWatts(text) {
  const t = String(text || '');
  const re = /(\d{1,4}(?:[.,]\d{1,3})?)\s*(k\s*w|kw|w)\b/gi;
  const found = [];
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
    found.push(Math.round(watts));
  }
  if (!found.length) return null;
  const uniq = [...new Set(found)];
  if (uniq.length >= 2) return null;
  return uniq[0];
}

/**
 * Đọc dung tích đồ chứa / thùng / tủ → lít.
 * ≥2 số dung tích khác nhau → null (đồng nhất extractPowerWatts — GĐ #1438 lần 2).
 * @returns {number|null}
 */
function extractVolumeLiters(text) {
  const t = String(text || '');
  // Giống extractPowerWatts: nhận 1.200 / 1,200 (nghìn) và 1.5 (thập phân); lookbehind chặn cắt đuôi "200" từ "1.200".
  const patterns = [
    /(?:thùng|túi|đồ chứa|do chua|sức chứa|suc chua|dung tích(?:\s+thùng)?|container|capacity)[^\d]{0,24}(?<![\d.,])(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:lít|lit|l)\b/gi,
    /(?<![\d.,])(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:lít|lit)\b/gi,
  ];
  const found = [];
  for (const re of patterns) {
    for (const m of t.matchAll(re)) {
      const raw = String(m[1]);
      let n;
      if (/^\d{1,3}[.,]\d{3}$/.test(raw)) {
        n = Number(raw.replace(/[.,]/g, ''));
      } else {
        n = Number(raw.replace(',', '.'));
      }
      if (Number.isFinite(n) && n > 0 && n <= 100000) found.push(n);
    }
  }
  if (!found.length) return null;
  const uniq = [...new Set(found)];
  if (uniq.length >= 2) return null;
  return uniq[0];
}

/** Gán domain theo bands [{gt?, le?, domain}] — gt mặc định -∞, le mặc định +∞; khớp band đầu tiên. */
function domainFromBands(value, bands) {
  if (!Array.isArray(bands) || !bands.length) return null;
  for (const b of bands) {
    if (!b?.domain) continue;
    const gt = b.gt != null ? Number(b.gt) : Number.NEGATIVE_INFINITY;
    const le = b.le != null ? Number(b.le) : Number.POSITIVE_INFINITY;
    if (!Number.isFinite(gt) && b.gt != null) continue;
    if (!Number.isFinite(le) && b.le != null) continue;
    if (value > gt && value <= le) return b.domain;
  }
  return null;
}

function deriveFromText(productText, spec) {
  if (!spec || !productText) return null;
  if (spec.kind === 'powerW') {
    const w = extractPowerWatts(productText);
    if (w == null) return null;
    if (Array.isArray(spec.bands) && spec.bands.length) return domainFromBands(w, spec.bands);
    const lim = Number(spec.le);
    if (!Number.isFinite(lim)) return null;
    return w <= lim ? spec.domainLe : spec.domainGt;
  }
  if (spec.kind === 'volumeL') {
    const lit = extractVolumeLiters(productText);
    if (lit == null) return null;
    if (Array.isArray(spec.bands) && spec.bands.length) return domainFromBands(lit, spec.bands);
    const lim = Number(spec.le);
    if (!Number.isFinite(lim)) return null;
    return lit <= lim ? spec.domainLe : spec.domainGt;
  }
  return null;
}

function enrichAttrsFromTable(attrs, table, productText) {
  const out = { ...(attrs || {}) };
  if (!table) return out;
  const folded = productText ? foldProductText(productText) : '';
  const original = productText ? originalProductText(productText) : '';
  for (const inp of table.inputs || []) {
    if (!inp?.attribute) continue;
    // Không ghi đè khi caller đã truyền sẵn (GĐ #1438 lần 2 mục 4).
    const cur = out[inp.attribute];
    if (cur != null && String(cur).trim() !== '') continue;
    // detect trước (cụm từ có ranh giới), rồi fromText số.
    // GĐ #1438 lần 3: ≥2 miền detect khớp → để trống (hỏi), không lấy nhánh đầu.
    if (productText && inp.detect) {
      const hits = [];
      for (const [val, phrases] of Object.entries(inp.detect)) {
        if ((phrases || []).some((p) => phraseHits(folded, p, original))) hits.push(val);
      }
      if (hits.length === 1) {
        out[inp.attribute] = hits[0];
        continue;
      }
      if (hits.length >= 2) continue;
    }
    if (productText && inp.fromText) {
      const derived = deriveFromText(productText, inp.fromText);
      if (derived) out[inp.attribute] = derived;
    }
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

    const productText = deps.productText || '';
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
  phraseHits,
  foldProductText,
  originalProductText,
};
