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
- Thông số "已选规格(...)" là phân loại KHÁCH ĐÃ CHỌN: số lỗ/chấu, công tắc, kích cỡ… lấy theo nó, không theo tên chung của tin đăng (tin đăng hay liệt kê nhiều loại).
- Ưu tiên bảng thông số của CHÍNH sản phẩm (产品参数/规格参数/产品规格). Bỏ qua danh mục chung của shop (定制尺寸, 可定制, 生产:各类…, sản phẩm khác).
- poleCount: ghi kiểu chấu cắm, vd 二三插 → "2 chấu + 3 chấu", 二三三插 → "1 ổ 2 chấu + 2 ổ 3 chấu", 2P/3P giữ nguyên.
- brand: chỉ TÊN THƯƠNG HIỆU thật. Tên nước / nơi sản xuất ("sản xuất tại Đức", 德国工艺) KHÔNG phải nhãn hiệu. Không thấy thì bỏ.
- modelNumber: mã/ký hiệu model (chữ + số, vd YLD-417, CN-510L). Không lấy câu mô tả phân loại.
- application: công dụng ngắn gọn rút từ tên hàng/mô tả (vd 墙壁暗装电源插座 → "ổ cắm điện lắp âm tường"), bằng chứng là đoạn chữ trong tên hàng.
- verify (nếu có): giá trị máy đọc thô từ ẢNH, có thể sai ngữ cảnh (bảng size tùy chọn, danh mục chung của shop, sản phẩm khác). Với mỗi khóa trong verify, trả giá trị ĐÚNG CHO SẢN PHẨM NÀY (theo tên hàng và bảng thông số), có thể khác candidate; không chắc thì bỏ khóa đó.
- evidenceText: đoạn chữ NGUYÊN VĂN trong sources chứa giá trị đó, và sourceId của đoạn ấy. Không có chữ làm bằng chứng thì KHÔNG trả khóa đó. Không đoán.
Chỉ trả JSON: {"attributes":[{"key":"","valueVi":"","unit":null,"sourceId":"","evidenceText":""}]}`;

// Giá trị lẫn Latin + chữ Hán: "Marc Lichte/马克莱驰特" → "Marc Lichte"; "86型" → "loại 86".
// Tất định, không cần AI — AI lỗi/bị cắt vẫn có nhãn hiệu, model tiếng Việt.
const MIXED_CLEAN_KEYS = new Set(['brand', 'modelNumber', 'partNumber']);

// Giá trị tiếng Trung hay gặp → tiếng Việt cố định (AI dịch lệch: 二三三插 → "2 chấu + 2 chấu + 3 chấu").
const VALUE_MAP = {
  brand: { 无品牌: 'không nhãn hiệu', 无: 'không nhãn hiệu', 其他: 'không nhãn hiệu', 'other/其他': 'không nhãn hiệu', 'OTHER/其他': 'không nhãn hiệu', 无牌: 'không nhãn hiệu' },
  poleCount: {
    二插: '2 chấu', 三插: '3 chấu', 二三插: '2 chấu + 3 chấu', 二三三插: '1 ổ 2 chấu + 2 ổ 3 chấu',
    五孔: '5 lỗ (2 chấu + 3 chấu)', 两孔: '2 lỗ', 三孔: '3 lỗ', 四孔: '4 lỗ', 六孔: '6 lỗ', 七孔: '7 lỗ', 八孔: '8 lỗ', 九孔: '9 lỗ', 十孔: '10 lỗ',
    单极: '1P', 双极: '2P', 三极: '3P', 四极: '4P', '1P': '1P', '2P': '2P', '3P': '3P', '4P': '4P',
  },
};

// Giá trị chỉ có số → thêm đơn vị theo loại ô ("250" → "250V").
const BARE_UNIT = { voltage: 'V', outputVoltage: 'V', currentRating: 'A', power: 'W', frequency: 'Hz', capacityAh: 'mAh', rpm: 'vòng/phút' };
// Chặn giá trị SAI LOẠI (05/10/2026: AI lấy "Đức" trong "sản xuất tại Đức" làm nhãn hiệu, lấy
// câu mô tả phân loại làm model). Bằng chứng có thật trong nguồn vẫn có thể sai loại ô.
const COUNTRY_RE = /^(đức|germany|德国|nhật( bản)?|japan|日本|mỹ|hoa kỳ|usa|美国|hàn quốc|korea|韩国|trung quốc|china|中国|ý|italy|pháp|france|anh|uk|thái lan|việt nam|đài loan|hồng kông|singapore|úc|châu âu|eu|europe)$/i;
function plausibleValue(key, valueVi) {
  const v = String(valueVi || '').trim();
  if (!v) return false;
  if (key === 'brand') {
    if (COUNTRY_RE.test(v)) return false;
    if (/(sản xuất|xuất xứ|chính hãng|nhập khẩu|made in)/i.test(v)) return false;
    return v.split(/\s+/).length <= 6;
  }
  if (key === 'modelNumber' || key === 'partNumber') {
    // Model = mã/ký hiệu ngắn: ≤4 từ, và có chữ số HOẶC toàn chữ Latin không dấu ("Pro Max").
    // Câu mô tả dài ("Ổ cắm 5 lỗ có công tắc…") → loại dù có số.
    const words = v.split(/\s+/).length;
    if (words > 4) return false;
    return /\d/.test(v) || /^[A-Za-z][A-Za-z0-9 .\-+/]*$/.test(v);
  }
  return true;
}

function withUnit(key, valueVi) {
  const v = String(valueVi || '').trim();
  return BARE_UNIT[key] && /^\d+(?:[.,]\d+)?$/.test(v) ? `${v}${BARE_UNIT[key]}` : v;
}
function cleanMixedValue(value) {
  const v = String(value || '').trim();
  if (!CJK.test(v)) return v;
  const m = v.match(/^([0-9A-Za-z][\w.\-+ ]*)型号?$/);
  if (m) return `loại ${m[1].trim()}`;
  const parts = v.split(/[\/|｜()（）]/).map((x) => x.trim()).filter((x) => x && !CJK.test(x) && /[A-Za-z]/.test(x));
  return parts.length ? parts.join(' / ') : v;
}

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
  // skipKeys: khóa bên gọi đã có giá trị tiếng Việt (lần lập phiếu trước, người bổ sung) — không
  // rút/dịch lại, đỡ một lượt AI.
  const skipKeys = (Array.isArray(body.skipKeys) ? body.skipKeys : []).map(String).filter((k) => allowed.has(k));
  // verifyImageHits: giá trị từ điển bắt được trong ẢNH chỉ là ứng viên (ảnh quảng cáo chung của
  // shop hay có "定制尺寸:86/118…") — gửi AI soát lại theo đúng sản phẩm. Phiếu hồ sơ bật cờ này.
  return { titleZh: String(body.titleZh || '').slice(0, 500), specsZh, imageTexts, needKeys, skipKeys, verifyImageHits: body.verifyImageHits === true };
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

// Ảnh dạng BẢNG: OCR đọc theo hàng nên nhãn và giá trị nằm ở hai dòng khác nhau
// ("产品规格 面板材质\n86mm*86mm PC阻燃") — AI chép lại thành "产品规格 86mm*86mm". Chấp nhận khi
// cả cụm có trong nguồn, HOẶC từng mẩu (tách theo khoảng trắng/dấu câu, ≥2 ký tự) đều có —
// vẫn chặn AI bịa số vì mẩu chứa số phải có thật.
// Các mẩu phải nằm GẦN nhau (trong ~60 ký tự sau khi bỏ khoảng trắng/dấu) — chống ghép "材质" của
// dòng chất liệu với "不锈钢" của dòng quà tặng (review 05/10/2026).
const EVIDENCE_WINDOW = 60;
function evidenceInSource(ev, text) {
  const src = squash(text);
  if (src.includes(squash(ev))) return true;
  const parts = String(ev).split(/[\s:：,，、;；|｜。]+/).map(squash).filter((p) => p.length >= 2);
  if (!parts.length || !parts.every((p) => src.includes(p))) return false;
  let from = src.indexOf(parts[0]);
  while (from !== -1) {
    const win = src.slice(Math.max(0, from - EVIDENCE_WINDOW), from + parts[0].length + EVIDENCE_WINDOW);
    if (parts.every((p) => win.includes(p))) return true;
    from = src.indexOf(parts[0], from + 1);
  }
  return false;
}

// Số trong giá trị phải có trong bằng chứng (khi bằng chứng có chữ số): chặn AI ghi "250" từ "10".
function numbersBacked(valueVi, ev) {
  if (!/\d/.test(String(ev || ''))) return true; // bằng chứng toàn chữ Hán (二三三插, 纯棉) — không so được
  const evDigits = String(ev).replace(/[,\s]/g, '');
  const nums = String(valueVi || '').match(/\d+(?:[.,]\d+)?/g) || [];
  return nums.every((n) => evDigits.includes(n.replace(',', '.')) || evDigits.includes(n));
}

// So bằng chứng bỏ qua khoảng trắng và dấu câu: OCR hay tách "材质" và "304不锈钢" thành hai
// dòng không có dấu hai chấm, còn AI chép lại thành "材质：304不锈钢".
const squash = (s) => String(s || '').replace(/[\s:：,，、;；|｜.。]+/g, '').toLowerCase();

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
  const need = new Set(input.needKeys.filter((k) => !input.skipKeys.includes(k)));
  const skip = new Set(input.skipKeys);
  // 1. Từ điển. Nhãn mơ hồ: có needKeys thì chỉ giữ khóa được hỏi.
  let rows = extractZhSpecs({ specs: input.specsZh, texts: input.imageTexts })
    .filter((r) => !skip.has(r.key))
    .filter((r) => !r.ambiguous || !need.size || need.has(r.key));
  const attributes = [];
  const toTranslate = [];
  const toVerify = [];
  for (const r of rows) {
    // Chỉ nhãn hiệu/model mới tách phần Latin — ô khác (kích thước…) tách bừa sẽ ra rác.
    const mapped = VALUE_MAP[r.key]?.[String(r.value).replace(/\s/g, '')];
    const cleaned = mapped || (MIXED_CLEAN_KEYS.has(r.key) ? cleanMixedValue(r.value) : r.value);
    const base = {
      key: r.key,
      labelVi: r.labelVi,
      value: cleaned,
      unit: unitOf(r.value),
      ambiguous: r.ambiguous,
      evidence: { source: r.evidence.source, imageUrl: r.evidence.imageUrl || null, text: r.evidence.text },
    };
    if (!CJK.test(cleaned) && !plausibleValue(r.key, cleaned)) continue;
    if (CJK.test(cleaned)) toTranslate.push(base);
    else if (input.verifyImageHits && r.evidence.source === 'IMAGE_OCR') toVerify.push(base);
    else attributes.push({ ...base, valueVi: cleaned, method: 'DICTIONARY', confidence: 0.95 });
  }

  // 2. AI chỉ khi còn giá trị chữ Hán cần dịch hoặc còn khóa được hỏi mà chưa thấy.
  const found = new Set(attributes.map((a) => a.key));
  const stillNeed = [...need].filter((k) => !found.has(k) && !toTranslate.some((t) => t.key === k) && !toVerify.some((t) => t.key === k));
  const sources = sourcesOf(input);
  let llmUsed = false;
  let engine = null;
  let llmError = null;
  if ((toTranslate.length || stillNeed.length || toVerify.length) && sources.length) {
    llmUsed = true;
    const allowedKeys = Object.fromEntries([...new Set([...toTranslate.map((t) => t.key), ...toVerify.map((t) => t.key), ...stillNeed])].map((k) => [k, keysDef[k]?.labelVi || k]));
    const user = JSON.stringify({
      allowedKeys,
      translate: toTranslate.map((t) => ({ key: t.key, valueZh: t.value })),
      needKeys: stillNeed,
      ...(toVerify.length ? { verify: toVerify.map((t) => ({ key: t.key, candidate: t.value, evidenceText: t.evidence.text })) } : {}),
      sources: sources.map(({ id, text }) => ({ id, text: text.slice(0, 3000) })),
    });
    try {
      // MiniMax-M2.7 suy nghĩ trong <think> ĂN CHUNG maxTokens (sự cố 05/10/2026) → bên gọi nới được.
      const { json, provider, model } = await (opts.llm || llmTier.callLLMJson)(SYSTEM, user, { tier: 'standard', maxTokens: opts.maxTokens || 2000, timeoutMs: opts.timeoutMs || 45000, ...(opts.temperature != null ? { temperature: opts.temperature } : {}) });
      engine = { provider, model };
      for (const a of Array.isArray(json?.attributes) ? json.attributes : []) {
        const key = String(a?.key || '');
        const valueVi = String(a?.valueVi || '').trim();
        if (!allowedKeys[key] || !valueVi || CJK.test(valueVi) || !plausibleValue(key, valueVi)) continue;
        const src = sources.find((s) => s.id === a.sourceId) || null;
        const ev = String(a?.evidenceText || '').trim();
        // Bằng chứng phải là chữ có thật trong nguồn — chặn AI bịa thông số.
        if (!src || !ev || !evidenceInSource(ev, src.text) || !numbersBacked(valueVi, ev)) continue;
        const pending = toTranslate.find((t) => t.key === key);
        if (attributes.some((x) => x.key === key && x.method === 'LLM')) continue;
        attributes.push({
          key,
          labelVi: keysDef[key]?.labelVi || key,
          value: pending ? pending.value : ev,
          valueVi: withUnit(key, valueVi).slice(0, 120),
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
    // Ứng viên từ ảnh AI không xác nhận (hoặc AI lỗi) → vẫn trả, tin cậy thấp, đánh dấu chưa soát.
    for (const t of toVerify) {
      if (!attributes.some((a) => a.key === t.key)) attributes.push({ ...t, valueVi: t.value, method: 'DICTIONARY_UNVERIFIED', confidence: 0.5 });
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

module.exports = { extractSpecs, normalizeInput, unitOf, cleanMixedValue, withUnit, plausibleValue };
