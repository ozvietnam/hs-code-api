// lib/heading-lexicon.js — THƯ VIỆN ĐẶC ĐIỂM THEO NHÓM HÀNG (CEO 10/10/2026).
//
// "Thư viện các đặc điểm, tính chất, từ khoá của từng nhóm mục tiêu — lọc bớt rác chủ động, giảm
// áp lực và nhiễu cho LLM." Dựng từ mầm có sẵn, không viết từ điển mới:
//   - ô bắt buộc + nên có của nhóm 4 số (data/heading-declaration-fields.json), rơi về chương
//     (data/chapter-declaration-fields.json), không có mã → toàn bộ khoá từ điển ('global');
//   - + ô chung TT 39/2018 (công dụng, chất liệu, kích thước, nhãn hiệu, model) + origin;
//   - nhãn tiếng Trung của các khoá đó qua data/attribute-synonyms-zh.json, cộng nhãn ghép
//     bộ phận (data/parts-zh.json × nhãn chất liệu/màu/kích thước: 镜框颜色, 鞋面材质…).
// lib/source-filter.js dùng thư viện này để quyết định dòng nào vào gói gửi AI.

const fs = require('fs');
const path = require('path');
const { dictionary, keysForLabel } = require('./zh-specs');
const { declarationFields } = require('./declaration-fields');

// Ô chung của phiếu (declaration-sheet COMMON_FIELDS) + xuất xứ — luôn giữ ở mọi nhóm.
// Khai lại ở đây (không require declaration-sheet) để tránh require vòng.
const ALWAYS_KEYS = ['application', 'material', 'dimensions', 'brand', 'modelNumber', 'origin'];
// Khoá có khái niệm BỘ PHẬN: nhãn "bộ phận + nhãn" (镜框颜色, 杯身材质) cũng là nhãn keep.
const PART_COMBO_KEYS = ['material', 'color', 'dimensions', 'thickness', 'netWeight', 'size', 'fiberContent', 'polymerType', 'glassType'];
// Dấu hiệu CÔNG DỤNG trong chữ tự do (OCR) — application là ô bắt buộc mọi nhóm.
const APPLICATION_MARKERS = ['用于', '适用于', '适合', '可用于', '应用于', '用途'];

const PARTS_FILE = path.join(__dirname, '..', 'data', 'parts-zh.json');
let _parts = null;
function partsZh() {
  if (!_parts) {
    try { _parts = Object.keys(JSON.parse(fs.readFileSync(PARTS_FILE, 'utf8')).parts || {}); } catch { _parts = []; }
  }
  return _parts;
}

const normLabel = (s) => String(s || '').replace(/[\s　]/g, '').replace(/[（]/g, '(').replace(/[）]/g, ')').trim();

const _cache = new Map();

function build(keys, source, fields) {
  const keysDef = dictionary().keys || {};
  const keepKeys = new Set(keys.filter((k) => keysDef[k]));
  const keepLabelsZh = new Set();
  for (const k of keepKeys) for (const z of keysDef[k]?.zh || []) keepLabelsZh.add(normLabel(z));
  const comboLabels = [...keepKeys].filter((k) => PART_COMBO_KEYS.includes(k)).flatMap((k) => keysDef[k]?.zh || []).map(normLabel);
  const parts = partsZh();
  for (const p of parts) for (const z of comboLabels) keepLabelsZh.add(p + z);
  return { source, keepKeys, keepLabelsZh, partsZh: new Set(parts), fields };
}

/**
 * lexiconFor(hsCode|null) → { source:'heading'|'chapter'|'global', keepKeys:Set, keepLabelsZh:Set, partsZh:Set,
 *   fields:[{key,labelVi,required}] }   — cache theo nhóm 4 số / chương.
 */
function lexiconFor(hsCode) {
  const digits = String(hsCode || '').replace(/\D/g, '');
  const spec = digits.length >= 4 ? declarationFields(digits) : null;
  const keysDef = dictionary().keys || {};
  if (!spec) {
    if (!_cache.has('global')) {
      const fields = Object.entries(keysDef).map(([key, d]) => ({ key, labelVi: d.labelVi || key, required: false }));
      _cache.set('global', build(Object.keys(keysDef), 'global', fields));
    }
    return _cache.get('global');
  }
  const source = spec.source === 'chapter' ? 'chapter' : 'heading';
  const id = `${source}:${source === 'chapter' ? spec.chapter : spec.heading}`;
  if (!_cache.has(id)) {
    const fields = spec.fields.map((f) => ({ key: f.key, labelVi: f.labelVi, required: f.required }));
    for (const k of ALWAYS_KEYS) if (!fields.some((f) => f.key === k)) fields.push({ key: k, labelVi: keysDef[k]?.labelVi || k, required: ['application', 'brand'].includes(k) });
    _cache.set(id, build(fields.map((f) => f.key), source, fields));
  }
  return _cache.get(id);
}

/** Thư viện thu hẹp cho lượt VÁ: chỉ các khoá còn thiếu (không cache — tập khoá thay đổi theo món). */
function lexiconForKeys(keys) {
  const keysDef = dictionary().keys || {};
  const list = [...new Set(keys)].filter((k) => keysDef[k]);
  return build(list, 'focus', list.map((k) => ({ key: k, labelVi: keysDef[k].labelVi || k, required: true })));
}

/** Bộ phận dài nhất đứng đầu nhãn → { part, rest } | null (cùng luật với extract-specs.partOfLabel). */
function splitPart(lex, label) {
  const n = normLabel(label);
  let best = null;
  for (const p of lex.partsZh) if (n.startsWith(p) && n.length > p.length && (!best || p.length > best.length)) best = p;
  return best ? { part: best, rest: n.slice(best.length) } : null;
}

/**
 * labelKept(lex, label) → true khi nhãn thuộc thư viện nhóm: khớp đúng nhãn keep; hoặc "bộ phận + nhãn keep";
 * hoặc nhãn chứa nhãn từ điển của một khoá keep (额定功率(W) → 额定功率). Nhãn = bộ phận + phần lạ (镜片折射率)
 * → KHÔNG keep (tránh khớp giả theo tên bộ phận).
 */
function labelKept(lex, label) {
  const n = normLabel(label);
  if (!n) return false;
  if (lex.keepLabelsZh.has(n)) return true;
  const sp = splitPart(lex, n);
  if (sp) return lex.keepLabelsZh.has(sp.rest) || keysForLabel(sp.rest).some((k) => lex.keepKeys.has(k));
  return keysForLabel(n).some((k) => lex.keepKeys.has(k));
}

/** Dòng "Ô cần cho nhóm này: key: labelVi, …" cho prompt SYSTEM (không có với 'global'). */
function promptLine(lex) {
  if (!lex || lex.source === 'global' || !lex.fields?.length) return '';
  return `Ô cần cho nhóm này: ${lex.fields.map((f) => `${f.key}: ${f.labelVi}`).join(', ')}.`;
}

module.exports = { lexiconFor, lexiconForKeys, labelKept, splitPart, promptLine, normLabel, ALWAYS_KEYS, APPLICATION_MARKERS };
