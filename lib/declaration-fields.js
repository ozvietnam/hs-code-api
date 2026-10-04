// lib/declaration-fields.js — danh mục trường cần khai theo nhóm hàng, dạng dùng được cho
// ERP và addon: nhãn tiếng Việt, câu hỏi tiếng Việt + tiếng Trung (gửi shop), nhãn tiếng
// Trung hay gặp trên trang nguồn. Nguồn: getDeclarationFieldSpec (HS 8 số → nhóm 4 số →
// chương) + từ điển mở data/attribute-synonyms-zh.json.
//
// Kế hoạch OZSource H3 + H6: danh sách "còn thiếu" lấy theo NHÓM 4 SỐ thay vì mẫu chung
// của chương (SSD không còn bị đòi điện áp, công suất).

const { getDeclarationFieldSpec } = require('./compliance-data');
const { dictionary, presentKeysFromZh } = require('./zh-specs');
const { registry, isPresent, haystacks } = require('./attributes');
const { removeDiacritics } = require('./search-utils');

/** "8413" | "841370" | "84137011" → mã 8 số để tra (nhóm/phân nhóm đệm 0 bên phải). */
function toLookupHs(code) {
  const d = String(code || '').replace(/\D/g, '');
  if (d.length < 4) return null;
  return d.slice(0, 8).padEnd(8, '0');
}

function enrichField(f, required) {
  const zh = dictionary().keys?.[f.key]?.zh || [];
  const hint = f.ecusHint && f.ecusHint !== f.key ? ` (${f.ecusHint})` : '';
  return {
    key: f.key,
    labelVi: f.labelVi || f.key,
    required,
    ecusHint: f.ecusHint || null,
    examples: f.examples || [],
    zhLabels: zh,
    questionVi: `${f.labelVi || f.key} của hàng là gì?${hint}`,
    questionZh: zh.length ? `请问${zh[0]}是什么？` : null,
  };
}

/**
 * declarationFields(code) → { hsCode, heading, chapter, source, template, titleVi, noteVi, fields: [...] } | null
 * code: 4, 6 hoặc 8 số. 4/6 số thì chỉ áp quy tắc nhóm/chương (không có ngoại lệ 8 số).
 */
function declarationFields(code) {
  const hs = toLookupHs(code);
  if (!hs) return null;
  const spec = getDeclarationFieldSpec(hs);
  if (!spec) return null;
  const exact = String(code).replace(/\D/g, '').length >= 8;
  return {
    hsCode: exact ? spec.hsCode : null,
    heading: spec.heading,
    chapter: spec.chapter,
    source: spec.source,
    template: spec.template,
    titleVi: spec.titleVi,
    noteVi: spec.noteVi,
    fields: [
      ...spec.required.map((f) => enrichField(f, true)),
      ...spec.recommended.map((f) => enrichField(f, false)),
    ],
  };
}

function fieldPresent(field, attrs, hays) {
  if (attrs[field.key] != null && String(attrs[field.key]).trim() !== '') return true;
  if (hays.zhKeys.has(field.key)) return true;
  if (registry()[field.key]) return isPresent(field.key, attrs, hays);
  for (const pat of field.patterns || []) {
    try {
      if (new RegExp(pat, 'iu').test(hays.raw) || new RegExp(removeDiacritics(pat), 'i').test(hays.folded)) return true;
    } catch { /* regex hỏng → bỏ qua */ }
  }
  return false;
}

/**
 * missingStructured(code, attrs) → [{ key, labelVi, required, heading, questionVi, questionZh, zhLabels }]
 * Chỉ trả trường BẮT BUỘC chưa có trong hồ sơ (field có cấu trúc, chữ tiếng Việt, hoặc
 * thông số tiếng Trung khớp từ điển).
 */
function missingStructured(code, attrs = {}) {
  const hs = toLookupHs(code);
  if (!hs) return [];
  const spec = getDeclarationFieldSpec(hs);
  if (!spec) return [];
  const hays = haystacks(attrs);
  if (!hays.zhKeys) hays.zhKeys = presentKeysFromZh(attrs.nameZh, attrs.specs, attrs.specsZh);
  return spec.required
    .filter((f) => !fieldPresent(f, attrs, hays))
    .map((f) => ({ ...enrichField(f, true), heading: spec.heading }));
}

module.exports = { declarationFields, missingStructured, toLookupHs };
