/**
 * Chốt chặn đầu ra LLM cho /api/suggest (và batch).
 *
 * VÌ SAO:
 * Trước đây `json.suggestions` của LLM đi thẳng vào xếp hạng. Thử trả mã giả
 * "99999999" → nó lên top-1. Mã 6 số "847130" bị normalizeHs đệm thành
 * "84713000" — mã không có trong biểu thuế — rồi đi tiếp sang /api/describe.
 * Mô hình càng yếu càng hay bịa mã. Nguyên tắc: LLM chỉ được CHỌN trong danh
 * sách ứng viên hệ thống đưa ra, không được sáng tác.
 *
 * Hàm này:
 *   · giữ mã đúng 8 số, CÓ trong biểu thuế VÀ trong danh sách ứng viên;
 *   · ghi đè `nameVi` bằng tên trong biểu thuế (không tin tên LLM tự đặt);
 *   · chỉ giữ các trường cho phép — bỏ `girRulesApplied` LLM tự gắn (rule #6);
 *   · kẹp `confidence` về 0..100;
 *   · trả danh sách mã bị loại để minh bạch.
 */

const ALLOWED_FIELDS = ['hsCode', 'confidence', 'reasoning', 'disambiguationFeatures', 'gir'];

function clampConfidence(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * @param {object[]} raw       json.suggestions từ LLM
 * @param {object}   ctx
 * @param {object[]} ctx.evidence  ứng viên đã đưa cho LLM ({hsCode,...})
 * @param {object}   ctx.taxData   biểu thuế (map hs → row)
 * @param {number}   ctx.limit     số gợi ý tối đa
 * @returns {{suggestions:object[], rejected:{hsCode:string, reason:string}[]}}
 */
function sanitizeLlmSuggestions(raw, { evidence, taxData, limit = 3 }) {
  const allowed = new Set((evidence || []).map((e) => e.hsCode));
  const suggestions = [];
  const rejected = [];
  const seen = new Set();

  for (const s of Array.isArray(raw) ? raw : []) {
    if (!s || typeof s !== 'object') continue;
    const original = String(s.hsCode ?? '').trim();
    const hs = original.replace(/\D/g, '');
    let reason = null;
    if (hs.length !== 8) reason = 'NOT_8_DIGITS';
    else if (!taxData[hs]) reason = 'NOT_IN_TARIFF';
    else if (!allowed.has(hs)) reason = 'NOT_IN_CANDIDATES';
    else if (seen.has(hs)) reason = 'DUPLICATE';
    if (reason) {
      if (reason !== 'DUPLICATE') rejected.push({ hsCode: original.slice(0, 20), reason });
      continue;
    }
    seen.add(hs);

    const clean = {};
    for (const k of ALLOWED_FIELDS) if (s[k] !== undefined) clean[k] = s[k];
    clean.hsCode = hs;
    clean.nameVi = taxData[hs].vn || null;
    clean.confidence = clampConfidence(s.confidence);
    if (clean.reasoning !== undefined) clean.reasoning = String(clean.reasoning).slice(0, 1000);
    if (clean.gir !== undefined && clean.gir !== null && typeof clean.gir !== 'string') delete clean.gir;
    if (clean.disambiguationFeatures !== undefined) {
      clean.disambiguationFeatures = Array.isArray(clean.disambiguationFeatures)
        ? clean.disambiguationFeatures.filter((f) => typeof f === 'string').slice(0, 10)
        : [];
    }
    suggestions.push(clean);
    if (suggestions.length >= limit) break;
  }
  return { suggestions, rejected };
}

/**
 * Khi LLM lỗi / không cấu hình / trả toàn mã rác: dùng thứ tự của bộ tìm kiếm
 * (deterministic). `confidence: null` — điểm tìm kiếm KHÔNG phải xác suất đúng,
 * không được trình bày như độ tin cậy.
 */
function deterministicSuggestions(evidence, { taxData, limit = 3 }) {
  return (evidence || [])
    .filter((e) => taxData[e.hsCode])
    .slice(0, limit)
    .map((e) => ({
      hsCode: e.hsCode,
      nameVi: taxData[e.hsCode].vn || null,
      confidence: null,
      score: e.score ?? null,
      reasoning: 'Xếp theo độ khớp tìm kiếm — CHƯA qua AI chọn lọc, cần người có chuyên môn xác nhận.',
    }));
}

module.exports = { sanitizeLlmSuggestions, deterministicSuggestions, ALLOWED_FIELDS };
