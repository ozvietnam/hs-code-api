// lib/vi-tokens.js — chuẩn hoá + tách từ tiếng Việt cho khớp tên hàng ↔ văn bản (cờ theo tên).
//
// Dùng chung cho lib/plhq-registry.js (chỉ mục nameListings) và lib/policy-name-match.js,
// tách riêng để hai bên không require vòng. GIỮ dấu tiếng Việt (NFC): "kính" ≠ "kinh" (kinh doanh),
// "sơn" ≠ "son" — bỏ dấu sẽ sinh khớp giả. Chỉ bỏ dấu câu, chữ thường, gộp khoảng trắng.

// Stopword cơ bản: từ nối/định lượng không mang nghĩa mặt hàng. Không cho "sản phẩm/hàng hóa" vào đây
// vì chúng vẫn cần trong khớp cụm từ; chúng được lọc riêng ở GENERIC khi xét "cụm có nghĩa không".
const STOPWORDS = new Set([
  'các', 'của', 'cho', 'với', 'theo', 'hoặc', 'hay', 'như', 'về', 'trong', 'từ', 'đến', 'bằng', 'loại',
  'khác', 'dùng', 'được', 'bao', 'gồm', 'kèm', 'này', 'đó', 'làm', 'thuộc', 'dạng', 'chưa', 'không',
  'trừ', 'thì', 'mà', 'tại', 'khi', 'đang', 'đã', 'sẽ', 'rất', 'nhiều', 'ít', 'một', 'những', 'mọi',
]);
// Từ quá chung, một mình không đủ nói về mặt hàng ("Sản phẩm" không phải cụm từ khớp được).
// Khớp là theo CẢ cụm (lib/policy-name-match.js) nên danh sách này chỉ cần chặn cụm trơn kiểu "Sản phẩm".
const GENERIC = new Set(['sản', 'phẩm', 'hàng', 'hóa', 'hoá', 'mặt']);

/** Chuẩn hoá: NFC, chữ thường, bỏ dấu câu (giữ chữ/số/khoảng trắng), gộp khoảng trắng. */
function normalizeVi(s) {
  return String(s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tách âm tiết đã chuẩn hoá (giữ cả stopword — để ghép cụm từ đúng thứ tự). */
function syllables(s) {
  return normalizeVi(s).split(' ').filter(Boolean);
}

/** Từ khoá: âm tiết ≥ 3 ký tự, không stopword, không toàn số. Dùng làm khoá chỉ mục ngược. */
function keywords(s) {
  return [...new Set(syllables(s).filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w)))];
}

/** Cụm từ có "nghĩa mặt hàng" không: phải còn ≥ 1 từ khoá không thuộc GENERIC. */
function meaningful(s) {
  return keywords(s).some((w) => !GENERIC.has(w));
}

module.exports = { normalizeVi, syllables, keywords, meaningful, STOPWORDS, GENERIC };
