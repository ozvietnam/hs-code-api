/**
 * Chuỗi phân cấp (breadcrumb) + ngữ cảnh tra cứu cho một dòng hàng 8 số.
 *
 * VÌ SAO CẦN:
 * 3.050 mã trong biểu thuế có tên đúng bằng ba chữ "Loại khác" (25,7% tổng số
 * mã; 3.383 mã = 28,5% có chứa cụm đó). Tra theo lời văn của chính dòng đó thì
 * không bao giờ chạm tới: chuỗi "Loại khác" không mang thông tin nào về hàng.
 *
 * MỘT CẠM BẪY ĐÃ THỬ VÀ LOẠI BỎ — đừng làm lại:
 * Thoạt nhìn có thể suy ra dòng cha bằng cách đếm gạch đầu dòng rồi lần ngược
 * lên dòng ít gạch hơn. SAI. data/tax.json chỉ chứa 11.871 khoá 8 số, toàn bộ là
 * dòng LÁ; mọi dòng tiêu đề nhóm đều đã bị lược bỏ. Lần ngược như vậy gán
 * "Chấn lưu dùng cho đèn phóng" (85041000) làm cha của 85044090 — hai mặt hàng
 * chẳng liên quan. Đã kiểm chứng và bỏ.
 *
 * NGUỒN THẬT, chỉ ghép văn bản có sẵn — không tự dịch, không tự đặt tên nhóm:
 *   - Phạm vi thật của mã dư + các mã anh em bị loại trừ: data/hs-context.json
 *     (rút từ data/loai-khac-index.json, xem scripts/build-hs-context.mjs).
 *   - Tên chương / nhóm / phân nhóm tiếng Anh: danh mục WCO
 *     (data/wco-hs-international.csv) — nguyên văn.
 *   - Tên phần tiếng Việt: data/hs-sections.json — nguyên văn.
 */
const { readFileSync } = require('fs');
const { join } = require('path');
const { taxData } = require('./data');
const sectionsData = require('../data/hs-sections.json');
const contextData = require('../data/hs-context.json');

/** Bỏ gạch đầu dòng, giữ nguyên phần chữ. */
function stripDashes(vn) {
  return String(vn || '').replace(/^[-\s]+/, '').trim();
}

/** Đọc CSV WCO — có trường bọc nháy kép chứa dấu phẩy. */
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

let wcoCache = null;

/** Tên chương/nhóm/phân nhóm theo WCO. Nạp lười — chỉ đọc khi thật sự cần. */
function wcoIndex() {
  if (wcoCache) return wcoCache;
  wcoCache = new Map();
  try {
    const csv = readFileSync(join(__dirname, '..', 'data', 'wco-hs-international.csv'), 'utf8');
    const lines = csv.split('\n');
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const [, hscode, description] = parseCsvLine(lines[i]);
      if (!hscode) continue;
      wcoCache.set(hscode.trim(), (description || '').trim());
    }
  } catch {
    // Thiếu file thì breadcrumb chỉ còn phần tiếng Việt — vẫn dùng được.
  }
  return wcoCache;
}

const sectionByChapter = new Map();
for (const s of sectionsData.sections || []) {
  for (const ch of s.chapters || []) sectionByChapter.set(ch, { code: s.code, titleVi: s.titleVi });
}

/** Phạm vi thật + mã anh em bị loại trừ của một mã dư. `null` nếu mã không phải dòng dư. */
function contextOf(hsCode) {
  const hs = String(hsCode || '').replace(/\D/g, '');
  const c = contextData.context[hs];
  if (!c) return null;
  return { scopeVi: c.d || '', excludesVi: c.x || [] };
}

/**
 * Breadcrumb đầy đủ của một mã 8 số (TC-05).
 * @returns {null|object}
 */
function breadcrumbOf(hsCode) {
  const hs = String(hsCode || '').replace(/\D/g, '');
  if (hs.length !== 8) return null;
  const row = taxData[hs];
  if (!row) return null;

  const wco = wcoIndex();
  const chapter = hs.slice(0, 2);
  const heading = hs.slice(0, 4);
  const subheading = hs.slice(0, 6);
  const section = sectionByChapter.get(chapter) || null;
  const chapterEn = wco.get(chapter) || null;
  const headingEn = wco.get(heading) || null;
  const subheadingEn = wco.get(subheading) || null;
  const ctx = contextOf(hs);
  const selfVi = stripDashes(row.vn);

  const levels = [];
  if (section) levels.push(`Phần ${section.code}: ${section.titleVi}`);
  levels.push(chapterEn ? `Chương ${chapter}: ${chapterEn}` : `Chương ${chapter}`);
  levels.push(headingEn ? `Nhóm ${heading}: ${headingEn}` : `Nhóm ${heading}`);
  if (subheadingEn && subheadingEn !== headingEn) levels.push(`Phân nhóm ${subheading}: ${subheadingEn}`);
  levels.push(`${hs}: ${selfVi}`);

  return {
    hsCode: hs,
    chapter,
    heading,
    subheading,
    sectionCode: section?.code || null,
    sectionVi: section?.titleVi || null,
    chapterEn,
    headingEn,
    subheadingEn,
    selfVi,
    isResidual: Boolean(ctx),
    scopeVi: ctx?.scopeVi || null,
    excludesVi: ctx?.excludesVi || [],
    levels,
    trail: levels.join(' → '),
  };
}

/**
 * Văn bản phụ dùng để CHẤM ĐIỂM tìm kiếm.
 *
 * Chỉ trả về với mã dư: đây là thứ duy nhất kéo "Loại khác" ra khỏi vùng mù.
 * Mã có tên mô tả đầy đủ thì lời văn dòng đó đã đủ — thêm nữa chỉ gây nhiễu.
 * Trả rỗng cho mã thường là CỐ Ý.
 */
function contextSearchText(hsCode) {
  const ctx = contextOf(hsCode);
  if (!ctx) return '';
  return [ctx.scopeVi, ...ctx.excludesVi].filter(Boolean).join(' ');
}


/** Bỏ dấu + hạ chữ thường, dùng cho so khớp tìm kiếm. */
function plain(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let plainCache = null;
let tokenIndex = null;

/**
 * Công tắc tắt lớp ngữ cảnh dòng dư. Cùng kiểu với HS_ALIAS_SEARCH và
 * HS_TRADE_SYNONYMS: gợi ý xấu thì tắt ngay bằng biến môi trường, không chờ
 * deploy lại — và đo được phần lớp này đóng góp bằng cách chạy hai lượt.
 */
function contextSearchEnabled() {
  return String(process.env.HS_CONTEXT_SEARCH ?? 'on').toLowerCase() !== 'off';
}

function buildPlainCache() {
  if (plainCache) return plainCache;
  plainCache = new Map();
  for (const [hs, c] of Object.entries(contextData.context)) {
    plainCache.set(hs, plain([c.d || '', ...(c.x || [])].join(' ')));
  }
  return plainCache;
}

/**
 * Bản không dấu của contextSearchText. Dùng cho khớp CỤM dài; khớp theo TỪ thì
 * đi qua contextHitCounts, đừng quét chuỗi này 12.000 lần mỗi truy vấn.
 */
function contextPlainOf(hsCode) {
  return buildPlainCache().get(String(hsCode || '').replace(/\D/g, '')) || '';
}

/**
 * Chỉ mục ngược: token → các mã dư có token đó trong câu mô tả phạm vi.
 *
 * VÌ SAO PHẢI ĐẢO CHIỀU: bản đầu quét thẳng chuỗi ngữ cảnh cho từng dòng trong
 * 12.000 dòng, nhân với số từ của câu hỏi. Mô tả tờ khai thật dài 20–40 từ, nên
 * benchmark 763 tờ khai chạy quá 5 phút CPU vẫn chưa xong — và đúng độ trễ đó
 * sẽ rơi vào mỗi lần gọi API. Đảo chiều thì chi phí chỉ còn tỉ lệ với SỐ TỪ của
 * câu hỏi, không phụ thuộc kích thước biểu thuế.
 */
function buildTokenIndex() {
  if (tokenIndex) return tokenIndex;
  tokenIndex = new Map();
  for (const [hs, text] of buildPlainCache()) {
    for (const tok of new Set(text.split(' '))) {
      if (tok.length < 3) continue;
      let set = tokenIndex.get(tok);
      if (!set) {
        set = new Set();
        tokenIndex.set(tok, set);
      }
      set.add(hs);
    }
  }
  return tokenIndex;
}

/**
 * Đếm số token của câu hỏi khớp ngữ cảnh, cho từng mã dư có khớp.
 * @param {string[]} tokens token tách từ câu hỏi (còn dấu cũng được)
 * @returns {Map<string, number>} mã → số token khớp. Mã không khớp thì vắng mặt.
 */
function contextHitCounts(tokens) {
  if (!contextSearchEnabled()) return new Map();
  const idx = buildTokenIndex();
  const counts = new Map();
  const seen = new Set();
  for (const raw of tokens) {
    const tok = plain(raw);
    if (tok.length < 3 || seen.has(tok)) continue;
    seen.add(tok);
    const hit = idx.get(tok);
    if (!hit) continue;
    for (const hs of hit) counts.set(hs, (counts.get(hs) || 0) + 1);
  }
  return counts;
}

module.exports = {
  breadcrumbOf,
  contextOf,
  contextSearchText,
  contextPlainOf,
  contextHitCounts,
  contextSearchEnabled,
  stripDashes,
};
