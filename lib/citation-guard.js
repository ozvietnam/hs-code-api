/**
 * Kiểm số hiệu văn bản pháp luật (TT/NĐ/QĐ/CV) mà LLM tự viết trong phần giải
 * thích (`reasoning`, `reason`).
 *
 * VÌ SAO: mô hình — nhất là mô hình yếu — hay "bịa" căn cứ nghe rất thật
 * ("Theo TT 31/2022/TT-BTC..."). Người khai chép căn cứ đó vào hồ sơ giải trình
 * là rủi ro pháp lý. Trích sai tệ hơn không trích (CLAUDE.md rule #6).
 *
 * Một số hiệu được coi là KIỂM CHỨNG khi:
 *   · có trong chỉ mục data/legal-docs.json, HOẶC
 *   · có nguyên văn trong dữ liệu hệ thống đã đưa cho LLM (VD cột chính sách).
 * Còn lại: giữ nguyên văn nhưng gắn nhãn "[chưa kiểm chứng]" ngay sau số hiệu,
 * và liệt kê ở `unverifiedCitations`.
 */
const { extractDocCodesFromText, getDocByCode, normalizeDocCode } = require('./legal-docs');

const TAG = ' [chưa kiểm chứng]';
const INLINE_RE = /\d{1,4}\/\d{4}\/(?:TT|NĐ|ND|QĐ|QD|CV)-[A-ZĐ]+/gi;

/**
 * @param {string} text        văn bản LLM viết
 * @param {string} contextText dữ liệu hệ thống đã đưa cho LLM
 * @returns {{text:string, citations:{code:string, verified:boolean}[]}}
 */
function auditCitations(text, contextText = '') {
  const src = String(text ?? '');
  if (!src) return { text: src, citations: [] };
  const ctxCodes = new Set(extractDocCodesFromText(contextText));
  const citations = extractDocCodesFromText(src).map((code) => ({
    code,
    verified: Boolean(getDocByCode(code)) || ctxCodes.has(code),
  }));
  const bad = new Set(citations.filter((c) => !c.verified).map((c) => c.code));
  if (!bad.size) return { text: src, citations };
  const out = src.replace(INLINE_RE, (m) => (bad.has(normalizeDocCode(m)) ? `${m}${TAG}` : m));
  return { text: out, citations };
}

/** Áp lên một object: trường text được gắn nhãn, thêm unverifiedCitations[]. */
function annotateField(obj, field, contextText) {
  if (!obj || typeof obj[field] !== 'string') return obj;
  const { text, citations } = auditCitations(obj[field], contextText);
  const unverified = citations.filter((c) => !c.verified).map((c) => c.code);
  return unverified.length ? { ...obj, [field]: text, unverifiedCitations: unverified } : obj;
}

module.exports = { auditCitations, annotateField, TAG };
