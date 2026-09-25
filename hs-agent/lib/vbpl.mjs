// Nguồn vbpl.ts24.com.vn (Freshdesk): thư mục xếp văn bản MỚI NHẤT trước, trang
// chi tiết có toàn văn, tải được bằng fetch thường. Đã kiểm 25/09/2026.
export const VBPL_BASE = 'https://vbpl.ts24.com.vn';

export function folderUrl(folderId, page = 1) {
  return `${VBPL_BASE}/support/solutions/folders/${folderId}${page > 1 ? `/page/${page}` : ''}`;
}

export function articleUrl(id) {
  return `${VBPL_BASE}/support/solutions/articles/${id}`;
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** Trang thư mục → [{id, title, url}] theo thứ tự trên trang. */
export function parseListing(html) {
  const out = [];
  const seen = new Set();
  const re = /href="\/support\/solutions\/articles\/(\d+)[^"]*"[^>]*>([^<]+)</g;
  let m;
  while ((m = re.exec(html))) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const title = decode(m[2]).replace(/^-\s*/, '');
    if (title.length < 8) continue;
    out.push({ id, title, url: articleUrl(id) });
  }
  return out;
}

const DOC_TYPES = 'Công văn|Quyết định|Thông báo|Thông tư liên tịch|Thông tư|Nghị định|Nghị quyết|Chỉ thị|Luật|Văn bản hợp nhất|Hướng dẫn';
const TITLE_RE = new RegExp(`^(${DOC_TYPES})\\s+(?:số\\s+)?(\\S+)\\s+ngày\\s+(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})\\s*(.*)$`, 'i');

/** "Công văn 18391/CHQ-NVTHQ ngày 02/07/2026 Phân loại hàng hóa" → các trường. */
export function parseTitle(title) {
  const m = String(title || '').trim().match(TITLE_RE);
  if (!m) return { docType: null, ref: null, date: null, year: null, subject: String(title || '').trim() };
  const [, docType, ref, d, mo, y, subject] = m;
  return {
    docType,
    ref: ref.replace(/[.,;:]$/, ''),
    date: `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`,
    year: Number(y),
    subject: subject.trim(),
  };
}

const RE_CLASSIFY = /phân loại|mã số hàng|mã số hs|mã hs|xác định trước mã|áp mã|điều chỉnh mã/i;
const RE_REMEDY = /chống bán phá giá|tự vệ|chống trợ cấp|lẩn tránh|phòng vệ thương mại|gian lận xuất xứ/i;
const RE_ORG = /chức năng,? nhiệm vụ|cơ cấu tổ chức|thủ tục hành chính/i;
// Số hiệu của cơ quan hải quan ra văn bản phân loại (TCHQ, CHQ, Cục/Chi cục HQ…);
// văn bản hợp nhất / thông tư / nghị định / quyết định không phải văn bản phân loại.
const RE_CUSTOMS_REF = /(TCHQ|CHQ|TXNK|NVTHQ|GSQL|KĐHQ|KDHQ|HQ)/i;
const RE_NOT_LETTER_REF = /VBHN|\/TT-|\/NĐ-|\/ND-|\/QĐ-|\/QD-|\/NQ-/i;
const RE_REGULATION = /danh mục|biểu thuế|mã số|phân loại|thuế xuất khẩu|thuế nhập khẩu|kiểm tra chuyên ngành|hải quan|xuất xứ|thuế suất/i;

/** Nhóm việc cho mỗi văn bản: classification | trade-remedy | regulation | other. */
export function classifyDoc({ docType, ref, subject }) {
  const t = String(docType || '').toLowerCase();
  const s = String(subject || '');
  if (RE_REMEDY.test(s) && !RE_ORG.test(s)) return 'trade-remedy';
  if (/^(công văn|thông báo)$/.test(t) && RE_CLASSIFY.test(s) && RE_CUSTOMS_REF.test(ref || '') && !RE_NOT_LETTER_REF.test(ref || '')) return 'classification';
  if (/^(thông tư|thông tư liên tịch|nghị định|quyết định|nghị quyết|luật)$/.test(t) && RE_REGULATION.test(s)) return 'regulation';
  return 'other';
}

/** Khóa số hiệu so khớp: bỏ dấu Đ, viết hoa, bỏ khoảng trắng. */
export function refKey(ref) {
  return String(ref || '').toUpperCase().replace(/Đ/g, 'D').replace(/\s+/g, '').replace(/[.,;:]$/, '');
}

/** Mã HS xuất hiện trong văn bản (dạng 8504.40.90 / 8504.40 / 85044090). */
export function hsCodesIn(text) {
  const out = new Set();
  const re = /(?<![\d.])(\d{4})\.(\d{2})(?:\.(\d{2}))?(?![\d])/g;
  let m;
  while ((m = re.exec(String(text || '')))) out.add(`${m[1]}${m[2]}${m[3] || ''}`);
  return [...out];
}
