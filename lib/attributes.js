// lib/attributes.js — Lớp map canonical + alias EN/VN cho thuộc tính chương (M0).
//
// Vấn đề gốc (finding 9.3): chapterSpecificRequired trong data/chapter-specific-rules.json
// dùng tên canonical tiếng Anh đồng nhất (voltage, power, outerMaterial, fiberContent...),
// nhưng hồ sơ M0 (attrs) build ở api/classify.js chỉ có 6 field tiếng Việt free-text
// (tenHang, chatLieu, congDung, chucNang, nameZh, specs). So key EN với key VN → không bao
// giờ trùng → mọi thuộc tính EN luôn bị coi là "thiếu", đẩy nhiễu vào missing[].
//
// Registry data/attributes.json khai báo cho mỗi thuộc tính canonical:
//   - labelVi     : nhãn tiếng Việt hiển thị cho NV
//   - aliases     : tên đồng nghĩa EN/VN → resolve về canonical
//   - sourceAttrs : field free-text của attrs mà nếu có giá trị thì coi như ĐÃ cung cấp
//   - detect      : regex (ascii, bỏ dấu, lowercase) dò trong haystack free-text
//
// Một thuộc tính chỉ thật sự "thiếu" khi KHÔNG có ở: attrs[canonical/alias] (structured),
// sourceAttrs (free-text non-empty), hoặc detect khớp haystack.

const fs = require('fs');
const path = require('path');
const { removeDiacritics } = require('./search-utils');

const DATA = path.join(__dirname, '..', 'data');

let _reg, _aliasIndex;

function registry() {
  if (_reg) return _reg;
  try {
    _reg = JSON.parse(fs.readFileSync(path.join(DATA, 'attributes.json'), 'utf8')).attributes || {};
  } catch {
    _reg = {};
  }
  return _reg;
}

// Chuẩn hoá 1 chuỗi để so khớp: lowercase + bỏ dấu (đồng nhất với plain() của
// declaration-validator = removeDiacritics(lowercase)).
function fold(s) {
  return removeDiacritics(String(s || '').toLowerCase());
}

// Bảng tra alias (đã fold) → canonical. Cho phép rule/ERP dùng tên EN hoặc VN.
function aliasIndex() {
  if (_aliasIndex) return _aliasIndex;
  const reg = registry();
  const idx = {};
  for (const [canon, def] of Object.entries(reg)) {
    idx[fold(canon)] = canon;
    for (const a of def.aliases || []) idx[fold(a)] = canon;
  }
  _aliasIndex = idx;
  return idx;
}

// Tên field (EN/VN/alias) → canonical. Không tìm thấy → trả nguyên (fail-safe).
function resolveCanonical(field) {
  return aliasIndex()[fold(field)] || field;
}

// Ký tự dấu tiếng Việt — dùng để biết 1 pattern có dấu hay ascii (đồng nhất với
// declaration-validator.js). Pattern CÓ dấu → khớp chuỗi CÒN dấu (đ ≠ d, phân biệt
// "da"=da thuộc vs "đã"=rồi); pattern ascii → khớp chuỗi đã bỏ dấu.
const VI_RE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

// Gộp các field free-text của hồ sơ M0 thành haystack. Trả cả 2 bản:
//   raw    = còn dấu (chỉ lowercase) — cho pattern có dấu
//   folded = bỏ dấu — cho pattern ascii
function haystacks(attrs = {}) {
  const raw = [attrs.tenHang, attrs.chatLieu, attrs.congDung, attrs.chucNang, attrs.specs, attrs.nameZh, attrs.hinhDang]
    .filter(Boolean)
    .join(' • ')
    .toLowerCase();
  return { raw, folded: fold(raw) };
}

// Giữ export cũ (bản bỏ dấu) để tương thích ngược.
function haystack(attrs = {}) {
  return haystacks(attrs).folded;
}

// Thuộc tính canonical này ĐÃ được cung cấp trong hồ sơ attrs chưa?
//   1. attrs[canonical] hoặc attrs[alias] có giá trị (structured, ERP tương lai)
//   2. một sourceAttr free-text non-empty
//   3. một regex detect khớp haystack (có dấu → khớp raw; ascii → khớp folded)
function isPresent(canonical, attrs = {}, hays) {
  const reg = registry();
  const def = reg[canonical];
  if (attrs[canonical] != null && String(attrs[canonical]).trim() !== '') return true;
  if (!def) return false;
  for (const a of def.aliases || []) {
    if (attrs[a] != null && String(attrs[a]).trim() !== '') return true;
  }
  for (const sf of def.sourceAttrs || []) {
    if (attrs[sf] != null && String(attrs[sf]).trim() !== '') return true;
  }
  // hays có thể là object {raw, folded} (mới) hoặc string bỏ dấu (gọi cũ) — cùng chấp nhận.
  const { raw, folded } = (hays && typeof hays === 'object') ? hays
    : (typeof hays === 'string' ? { raw: hays, folded: hays } : haystacks(attrs));
  for (const pat of def.detect || []) {
    try {
      if (VI_RE.test(pat)) {
        if (new RegExp(pat, 'iu').test(raw)) return true;     // pattern có dấu → chuỗi còn dấu
      } else if (new RegExp(pat, 'i').test(folded)) return true; // pattern ascii → chuỗi bỏ dấu
    } catch { /* regex hỏng → bỏ qua pattern */ }
  }
  return false;
}

// Từ danh sách chapterSpecificRequired (tên EN/VN thô) + hồ sơ attrs →
// trả về các thuộc tính THẬT SỰ thiếu: [{ field, canonical, labelVi }].
function missingChapterAttrs(required, attrs = {}) {
  const reg = registry();
  const hays = haystacks(attrs);
  const out = [];
  const seen = new Set();
  for (const raw of required || []) {
    const canon = resolveCanonical(raw);
    if (seen.has(canon)) continue;
    seen.add(canon);
    if (!isPresent(canon, attrs, hays)) {
      const def = reg[canon] || {};
      out.push({ field: raw, canonical: canon, labelVi: def.labelVi || raw });
    }
  }
  return out;
}

// fieldDef tương thích với hasChapterFieldValue() của declaration-validator:
// { key, labelVi, patterns } — patterns lấy từ registry để thay cho patterns:[] rỗng.
function attributeFieldDef(field) {
  const canon = resolveCanonical(field);
  const def = registry()[canon] || {};
  return {
    key: canon,
    labelVi: def.labelVi || field,
    patterns: [...(def.detect || [])],
  };
}

module.exports = {
  registry,
  fold,
  haystack,
  haystacks,
  resolveCanonical,
  isPresent,
  missingChapterAttrs,
  attributeFieldDef,
};
