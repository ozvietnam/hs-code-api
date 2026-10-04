// lib/extract-specs.js — rút thông số chuẩn từ CHỮ (kế hoạch OZSource H4).
//
// hs-code-api không xử lý ảnh (QĐ-5): ozsource đọc chữ trong ảnh (OCR) rồi gửi chữ sang.
// Thứ tự: từ điển mở data/attribute-synonyms-zh.json trước (miễn phí, chắc chắn); chỉ phần
// còn thiếu hoặc giá trị còn chữ Hán mới gọi AI văn bản (lib/llm-tier: Gemini miễn phí →
// MiniMax). Mỗi thông số trả kèm bằng chứng (đoạn chữ + link ảnh); AI đưa bằng chứng không
// có trong chữ gửi lên thì giá trị bị bỏ.

const crypto = require('crypto');
const llmTier = require('./llm-tier');
const { extractZhSpecs, dictionary } = require('./zh-specs');

const CJK = /[㐀-鿿]/;
const UNIT_RE = /(\d[\d.,]*)\s*(kW|W|kV|V|Hz|mAh|Ah|A|mm|cm|m|kg|g|ml|mL|L|GB|TB|inch|寸|英寸|bar|MPa|rpm|BTU)\b/i;
const CACHE_MAX = 300;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const _cache = new Map();

const SYSTEM = `Bạn rút THÔNG SỐ SẢN PHẨM từ chữ trên trang Taobao/1688 và chữ đọc được trong ảnh (OCR). Bạn KHÔNG chọn mã HS.
Đầu vào có: danh sách khóa chuẩn được phép (allowedKeys, kèm nhãn tiếng Việt), các giá trị tiếng Trung cần dịch (translate), các khóa cần tìm thêm (needKeys) và chữ nguồn (sources, mỗi đoạn có id).
Quy tắc:
- Chỉ dùng khóa trong allowedKeys.
- valueVi: tiếng Việt kiểu tờ khai hải quan, giữ số và đơn vị (304不锈钢 → "thép không gỉ 304"; 纯棉 → "100% bông").
- evidenceText: đoạn chữ NGUYÊN VĂN trong sources chứa giá trị đó, và sourceId của đoạn ấy. Không có chữ làm bằng chứng thì KHÔNG trả khóa đó. Không đoán.
Chỉ trả JSON: {"attributes":[{"key":"","valueVi":"","unit":null,"sourceId":"","evidenceText":""}]}`;

function unitOf(value) {
  const m = String(value || '').match(UNIT_RE);
  return m ? m[2] : null;
}

function hashInput(input) {
  return crypto.createHash('sha1').update(JSON.stringify(input)).digest('hex');
}

function normalizeInput(body = {}) {
  const specsZh = Array.isArray(body.specsZh)
    ? body.specsZh.filter((s) => s && (s.key || s.label) && s.value != null).slice(0, 200)
    : (typeof body.specsZh === 'string' ? body.specsZh.slice(0, 8000) : []);
  const imageTexts = (Array.isArray(body.imageTexts) ? body.imageTexts : [])
    .filter((t) => t && typeof t.text === 'string' && t.text.trim())
    .slice(0, 20)
    .map((t) => ({ url: t.url ? String(t.url).slice(0, 500) : null, text: t.text.slice(0, 4000) }));
  const allowed = new Set(Object.keys(dictionary().keys || {}));
  const needKeys = (Array.isArray(body.needKeys) ? body.needKeys : []).map(String).filter((k) => allowed.has(k));
  return { titleZh: String(body.titleZh || '').slice(0, 500), specsZh, imageTexts, needKeys };
}

function sourcesOf(input) {
  const out = [];
  if (input.titleZh) out.push({ id: 'title', source: 'SITE', imageUrl: null, text: input.titleZh });
  if (Array.isArray(input.specsZh) && input.specsZh.length) {
    out.push({ id: 'specs', source: 'SITE', imageUrl: null, text: input.specsZh.map((s) => `${s.key || s.label}：${s.value}`).join('\n') });
  } else if (typeof input.specsZh === 'string' && input.specsZh) {
    out.push({ id: 'specs', source: 'SITE', imageUrl: null, text: input.specsZh });
  }
  input.imageTexts.forEach((t, i) => out.push({ id: `img${i + 1}`, source: 'IMAGE_OCR', imageUrl: t.url, text: t.text }));
  return out;
}

const squash = (s) => String(s || '').replace(/\s+/g, '');

/**
 * extractSpecs(body, { llm }) → { attributes, missingKeys, llmUsed, engine, cached }
 * attributes: [{ key, labelVi, value, valueVi, unit, method, confidence, ambiguous, evidence:{source, imageUrl, text} }]
 */
async function extractSpecs(body, opts = {}) {
  const input = normalizeInput(body);
  const cacheKey = hashInput(input);
  const hit = _cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return { ...hit.value, cached: true };

  const keysDef = dictionary().keys || {};
  const need = new Set(input.needKeys);
  // 1. Từ điển. Nhãn mơ hồ: có needKeys thì chỉ giữ khóa được hỏi.
  let rows = extractZhSpecs({ specs: input.specsZh, texts: input.imageTexts })
    .filter((r) => !r.ambiguous || !need.size || need.has(r.key));
  const attributes = [];
  const toTranslate = [];
  for (const r of rows) {
    const base = {
      key: r.key,
      labelVi: r.labelVi,
      value: r.value,
      unit: unitOf(r.value),
      ambiguous: r.ambiguous,
      evidence: { source: r.evidence.source, imageUrl: r.evidence.imageUrl || null, text: r.evidence.text },
    };
    if (CJK.test(r.value)) toTranslate.push(base);
    else attributes.push({ ...base, valueVi: r.value, method: 'DICTIONARY', confidence: 0.95 });
  }

  // 2. AI chỉ khi còn giá trị chữ Hán cần dịch hoặc còn khóa được hỏi mà chưa thấy.
  const found = new Set(attributes.map((a) => a.key));
  const stillNeed = [...need].filter((k) => !found.has(k) && !toTranslate.some((t) => t.key === k));
  const sources = sourcesOf(input);
  let llmUsed = false;
  let engine = null;
  let llmError = null;
  if ((toTranslate.length || stillNeed.length) && sources.length) {
    llmUsed = true;
    const allowedKeys = Object.fromEntries([...new Set([...toTranslate.map((t) => t.key), ...stillNeed])].map((k) => [k, keysDef[k]?.labelVi || k]));
    const user = JSON.stringify({
      allowedKeys,
      translate: toTranslate.map((t) => ({ key: t.key, valueZh: t.value })),
      needKeys: stillNeed,
      sources: sources.map(({ id, text }) => ({ id, text: text.slice(0, 3000) })),
    });
    try {
      const { json, provider, model } = await (opts.llm || llmTier.callLLMJson)(SYSTEM, user, { tier: 'standard', maxTokens: 2000, timeoutMs: 45000 });
      engine = { provider, model };
      for (const a of Array.isArray(json?.attributes) ? json.attributes : []) {
        const key = String(a?.key || '');
        const valueVi = String(a?.valueVi || '').trim();
        if (!allowedKeys[key] || !valueVi || CJK.test(valueVi)) continue;
        const src = sources.find((s) => s.id === a.sourceId) || null;
        const ev = String(a?.evidenceText || '').trim();
        // Bằng chứng phải là chữ có thật trong nguồn — chặn AI bịa thông số.
        if (!src || !ev || !squash(src.text).includes(squash(ev))) continue;
        const pending = toTranslate.find((t) => t.key === key);
        attributes.push({
          key,
          labelVi: keysDef[key]?.labelVi || key,
          value: pending ? pending.value : ev,
          valueVi: valueVi.slice(0, 120),
          unit: a.unit || unitOf(valueVi),
          ambiguous: pending ? pending.ambiguous : false,
          method: 'LLM',
          confidence: pending ? 0.85 : 0.7,
          evidence: { source: src.source, imageUrl: src.imageUrl, text: ev.slice(0, 200) },
        });
      }
    } catch (e) {
      llmError = { code: e.code || 'LLM_FAILED', message: String(e.message || '').slice(0, 200) };
    }
    // Giá trị chữ Hán không dịch được vẫn trả lại (valueVi null) để ERP biết mà hỏi người.
    for (const t of toTranslate) {
      if (!attributes.some((a) => a.key === t.key)) attributes.push({ ...t, valueVi: null, method: 'DICTIONARY', confidence: 0.5 });
    }
  }

  const have = new Set(attributes.filter((a) => a.valueVi).map((a) => a.key));
  const value = {
    attributes,
    missingKeys: [...need].filter((k) => !have.has(k)),
    llmUsed,
    engine,
    ...(llmError ? { llmError } : {}),
  };
  if (!llmError) {
    if (_cache.size >= CACHE_MAX) _cache.delete(_cache.keys().next().value);
    _cache.set(cacheKey, { ts: Date.now(), value });
  }
  return { ...value, cached: false };
}

module.exports = { extractSpecs, normalizeInput, unitOf };
