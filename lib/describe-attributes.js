// lib/describe-attributes.js — thông số đã chuẩn hóa (ERP gửi theo khóa chuẩn của
// hs-code-api) → các ô của /api/describe (kế hoạch OZSource H5).
//
// Nhận { material: "inox 304", power: "1500W" } hoặc [{ key, valueVi|value, unit }].
// Giá trị còn chữ Hán bị bỏ: mô tả ECUS không được có chữ Trung (CJK_IN_DECLARATION).

const { dictionary } = require('./zh-specs');
const { fieldCatalog } = require('./compliance-data');

const CJK = /[㐀-鿿]/;
// Khóa đi vào ô riêng của mô tả; các khóa khác gộp vào thông số kỹ thuật.
const SLOT = { material: 'material', brand: 'brand', modelNumber: 'model', application: 'purpose' };

function labelOf(key) {
  return fieldCatalog.fields?.[key]?.labelVi || dictionary().keys?.[key]?.labelVi || key;
}

function entriesOf(input) {
  if (Array.isArray(input)) {
    return input
      .filter((a) => a && a.key)
      .map((a) => [a.key, [a.valueVi ?? a.value, a.unit && !String(a.valueVi ?? a.value).includes(a.unit) ? a.unit : null].filter(Boolean).join(' ')]);
  }
  if (input && typeof input === 'object') return Object.entries(input);
  return [];
}

/**
 * describeAttributes(input) → { material, brand, model, purpose, technicalSpec, used:[key], skipped:[{key, reason}] }
 */
function describeAttributes(input) {
  const out = { material: null, brand: null, model: null, purpose: null, technicalSpec: null, used: [], skipped: [] };
  const specs = [];
  for (const [key, raw] of entriesOf(input)) {
    const value = raw == null ? '' : String(raw).replace(/\s+/g, ' ').trim();
    if (!value) continue;
    if (CJK.test(value)) {
      out.skipped.push({ key, reason: 'Giá trị còn chữ Hán — dịch sang tiếng Việt trước (POST /api/extract-specs) rồi gửi lại' });
      continue;
    }
    const slot = SLOT[key];
    if (slot) out[slot] = value.slice(0, 120);
    else specs.push(`${labelOf(key)}: ${value.slice(0, 80)}`);
    out.used.push(key);
  }
  out.technicalSpec = specs.length ? specs.join('; ') : null;
  return out;
}

module.exports = { describeAttributes };
