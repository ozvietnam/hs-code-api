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

// ═══ Chế độ GỠ theo gói căn cứ (#339, job H3 — /api/dispute-draft) ═══════════════════════════════════
//
// /api/classify chỉ GẮN NHÃN trích dẫn chưa kiểm. Bản nháp văn bản nộp Hải quan thì khác: dẫn sai tệ hơn không dẫn
// (spec 5.4). Ở chế độ này, mọi trích dẫn LLM tự viết được đối chiếu với DANH MỤC ĐƯỢC PHÉP dựng từ gói căn cứ H1
// (lib/evidence-pack.js); câu nào chứa trích dẫn không khớp bị GỠ (theo câu), trích dẫn đó vào danh sách bị loại.
//
// Năm loại trích dẫn được nhận diện:
//   VAN_BAN  số hiệu văn bản: 31/2022/TT-BTC, TT31/2022/TT-BTC, 2039/TCHQ-TXNK, 160/TB-CHQ, 02/2011/QH13;
//            cả dạng thiếu ký hiệu "Thông tư 31/2022" (khớp theo số + năm)
//   LUAT     tên luật không kèm số hiệu: "Luật Hải quan", "Luật Khiếu nại" — chỉ được dẫn khi gói có nhắc
//   GIR      "GIR-3b", "GIR 1", "quy tắc 3(b)", "quy tắc tổng quát giải thích số 2a" — chỉ nhãn lib/gir.js đã trả
//   DIEU     "Điều 6 khoản 1", "Điều 4.2.b", "điểm d khoản 1 Điều 10" — chỉ điều khoản TT 85/2026 có trong gói
//            (lib/legal-basis.js). Mọi "Điều N" đều phải khớp: điều của văn bản khác thì văn bản đó cũng không có
//            trong gói, câu bị gỡ đằng nào cũng đúng.
//   WCO      "8427.10/1", "wco-op.842710.1" — chỉ ý kiến WCO có trong gói (đã qua cổng mã/thứ tự)
// Số thông báo TB-TCHQ / công văn TCHQ là VAN_BAN (khớp với tiền lệ trong gói).

const DOC_RE = /(?<![\p{L}\d])(?:(?:TT|NĐ|ND|QĐ|QD|CV|TB)\s*)?(\d{1,6})\s*\/\s*(?:(\d{4})\s*\/\s*)?([A-ZĐ][A-ZĐ0-9]*(?:-[A-ZĐ0-9]+)*)/gu;
const DOC_PARTIAL_RE = /(?:Thông\s+tư|Nghị\s+định|Quyết\s+định|Công\s+văn|Thông\s+báo|Nghị\s+quyết|Luật)\s+(?:số\s+)?(\d{1,6})\s*\/\s*(\d{4})(?!\s*\/\s*[A-ZĐ])/giu;
const LUAT_RE = /(?<![\p{L}])Luật\s+([A-ZĐ][\p{L}]*(?:\s+[\p{Ll}]+)?)/gu;
const GIR_RE = /(?<![\p{L}])(?:GIR|quy\s+tắc(?:\s+tổng\s+quát)?(?:\s+giải\s+thích)?(?:\s+số)?)\s*[-–:]?\s*(\d)(?:\s*\(\s*([a-c])\s*\)|([a-c])(?![\p{L}]))?/giu;
const DIEU_RE = /(?:(?:điểm\s+([a-zđ])\s*,?\s*)?khoản\s+(\d{1,2})\s*,?\s*)?điều\s+(\d{1,3})(?:\.(\d{1,2})(?:\.([a-zđ]))?)?(?:\s*,?\s*khoản\s+(\d{1,2})(?:\s*,?\s*điểm\s+([a-zđ]))?)?/giu;
const WCO_RE = /(?<!\d)(\d{4})\.(\d{2})\s*\/\s*(\d{1,3})(?!\d)|wco-op\.(\d{6})\.(\d{1,3})/giu;

const issuerKey = (s) => String(s || '').toUpperCase().replace(/Đ/g, 'D').replace(/\s+/g, '');

/** Tách mọi trích dẫn trong một đoạn chữ → [{ loai, raw, key }]. */
function extractCitations(text) {
  const src = String(text ?? '');
  const out = [];
  const docSpans = [];
  for (const m of src.matchAll(DOC_RE)) {
    out.push({ loai: 'VAN_BAN', raw: m[0].trim(), key: { so: String(Number(m[1])), nam: m[2] || null, ma: issuerKey(m[3]) } });
    docSpans.push([m.index, m.index + m[0].length]);
  }
  for (const m of src.matchAll(DOC_PARTIAL_RE)) {
    if (docSpans.some(([a, b]) => m.index < b && m.index + m[0].length > a)) continue;
    out.push({ loai: 'VAN_BAN', raw: m[0].trim(), key: { so: String(Number(m[1])), nam: m[2], ma: null } });
  }
  for (const m of src.matchAll(LUAT_RE)) out.push({ loai: 'LUAT', raw: m[0].trim(), key: m[0].trim().toLowerCase().replace(/\s+/g, ' ') });
  for (const m of src.matchAll(GIR_RE)) out.push({ loai: 'GIR', raw: m[0].trim(), key: `${m[1]}${(m[2] || m[3] || '').toLowerCase()}` });
  for (const m of src.matchAll(DIEU_RE)) {
    const khoan = m[4] || m[2] || m[6] || null;
    const diem = khoan ? (m[5] || m[1] || m[7] || null) : null;
    out.push({ loai: 'DIEU', raw: m[0].trim(), key: [m[3], khoan, diem && diem.toLowerCase()].filter(Boolean).join('.') });
  }
  for (const m of src.matchAll(WCO_RE)) {
    const key = m[1] ? `${m[1]}${m[2]}/${Number(m[3])}` : `${m[4]}/${Number(m[5])}`;
    out.push({ loai: 'WCO', raw: m[0].trim(), key });
  }
  return out;
}

const LY_DO = {
  VAN_BAN: 'số hiệu văn bản không có trong gói căn cứ',
  LUAT: 'văn bản luật không có trong gói căn cứ',
  GIR: 'nhãn quy tắc GIR mà lib/gir.js không trả cho ca này',
  DIEU: 'điều khoản TT 85/2026 không có trong gói căn cứ (lib/legal-basis.js)',
  WCO: 'ý kiến phân loại WCO không có trong gói căn cứ',
};

function docAllowed(key, docs) {
  return docs.some((d) => d.so === key.so
    && (!key.ma || !d.ma || d.ma === key.ma)
    && (!key.nam || !d.nam || d.nam === key.nam));
}

/** Một trích dẫn có khớp danh mục được phép không. */
function citationAllowed(c, allowed) {
  switch (c.loai) {
    case 'VAN_BAN': return docAllowed(c.key, allowed.docs);
    case 'LUAT': return allowed.text.includes(c.key);
    case 'GIR': return allowed.gir.has(c.key) || (/^\d$/.test(c.key) && [...allowed.gir].some((k) => k[0] === c.key));
    case 'DIEU': return allowed.dieu.has(c.key);
    case 'WCO': return allowed.wco.has(c.key);
    default: return false;
  }
}

/**
 * Danh mục trích dẫn được phép dựng từ gói căn cứ (đầu ra buildEvidencePack).
 * docs: mọi số hiệu văn bản xuất hiện trong gói (tiền lệ, nguồn chú giải/GIR, TT 85/2026, chính sách theo mã);
 * gir: ruleKey của gir.items (chỉ lib/gir.js); dieu: điều khoản canCuPhapLy + hoSo (chỉ lib/legal-basis.js);
 * wco: ý kiến WCO của gói (yKienWco.items + con trỏ 6.1.b).
 */
function allowedFromEvidencePack(pack) {
  const str = JSON.stringify(pack || {});
  const docs = extractCitations(str).filter((c) => c.loai === 'VAN_BAN').map((c) => c.key);
  const gir = new Set(); const dieu = new Set(); const wco = new Set();
  for (const g of pack?.goiCanCu || []) {
    for (const it of g?.gir?.items || []) if (it.ruleKey) gir.add(String(it.ruleKey).toLowerCase());
    for (const id of Object.keys(g?.canCuPhapLy?.dieuKhoan || {})) dieu.add(id);
    for (const id of Object.keys(g?.canCuPhapLy?.hoSo?.dieuKhoan || {})) dieu.add(id);
    for (const it of g?.yKienWco?.items || []) wco.add(`${it.hs}/${Number(it.thuTuTrongMa)}`);
    for (const b of g?.canCuPhapLy?.cacBuoc || []) {
      for (const t of b.taiLieu || []) for (const y of t.yKien || []) wco.add(`${y.hs6}/${Number(y.thuTuTrongMa)}`);
    }
  }
  return { docs, gir, dieu, wco, text: str.toLowerCase().replace(/\s+/g, ' ') };
}

const SENT_SPLIT = /(?<=[.!?…;])\s+/u;

/**
 * Gỡ khỏi `text` mọi CÂU có trích dẫn không khớp `allowed` (giữ nguyên các câu khác và xuống dòng).
 * `extraCheck(sentence)` (tuỳ chọn) trả thêm [{loai, raw, lyDo}] vi phạm khác (vd mã tham chiếu không có).
 * → { text, boLoai: [{ loai, raw, lyDo }] }
 */
function removeUnverified(text, allowed, extraCheck) {
  const boLoai = [];
  const lines = String(text ?? '').split('\n');
  const kept = [];
  for (const line of lines) {
    if (!line.trim()) { kept.push(line); continue; }
    const sentences = line.split(SENT_SPLIT);
    const ok = [];
    for (const s of sentences) {
      const bad = extractCitations(s).filter((c) => !citationAllowed(c, allowed)).map((c) => ({ loai: c.loai, raw: c.raw, lyDo: LY_DO[c.loai] }));
      if (extraCheck) bad.push(...(extraCheck(s) || []));
      if (bad.length) boLoai.push(...bad); else ok.push(s);
    }
    if (ok.length) kept.push(ok.join(' '));
  }
  return { text: kept.join('\n').replace(/\n{3,}/g, '\n\n').trim(), boLoai };
}

module.exports = { auditCitations, annotateField, TAG, extractCitations, citationAllowed, allowedFromEvidencePack, removeUnverified };
