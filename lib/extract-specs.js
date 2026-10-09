// lib/extract-specs.js — rút thông số chuẩn từ CHỮ (kế hoạch OZSource H4).
//
// hs-code-api không xử lý ảnh (QĐ-5): ozsource đọc chữ trong ảnh (OCR) rồi gửi chữ sang.
// Thứ tự: từ điển mở data/attribute-synonyms-zh.json trước (miễn phí, chắc chắn); chỉ phần
// còn thiếu hoặc giá trị còn chữ Hán mới gọi AI văn bản (lib/llm-tier: Gemini miễn phí →
// MiniMax). Mỗi thông số trả kèm bằng chứng (đoạn chữ + link ảnh); AI đưa bằng chứng không
// có trong chữ gửi lên thì giá trị bị bỏ.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const llmTier = require('./llm-tier');
const { extractZhSpecs, dictionary, keysForLabel } = require('./zh-specs');

const CJK = /[㐀-鿿]/;

// Ô TÊN RIÊNG (CEO 08/10/2026): nhãn hiệu/model là tên riêng, KHÔNG dịch. Chữ Hán không tách được
// phần Latin → giữ nguyên chữ gốc làm giá trị (status HAVE), ghi note; không gửi AI "dịch" (AI
// phiên âm bừa 柚莎 → "Youssa" là bịa nhãn). Repo không có thư viện pinyin → không thêm phiên âm.
const PROPER_NOUN_FIELDS = new Set(['brand', 'modelNumber', 'partNumber']);
const PROPER_NOUN_NOTE = 'giữ nguyên chữ gốc (tên riêng)';

// BỘ PHẬN đứng trước nhãn thông số (镜片材质 / 镜框材质) — data/parts-zh.json. Mỗi giá trị rút
// ra mang `part` để phiếu hồ sơ ghép "tròng: PC; gọng: kim loại" thay vì chọn một.
const PARTS_FILE = path.join(__dirname, '..', 'data', 'parts-zh.json');
let _parts = null;
function partsTable() {
  if (!_parts) {
    try { _parts = JSON.parse(fs.readFileSync(PARTS_FILE, 'utf8')).parts || {}; } catch { _parts = {}; }
  }
  return _parts;
}
const normLabel = (s) => String(s || '').replace(/[\s　]/g, '').trim();
/** partOfLabel('镜片材质') → { part:{zh:'镜片',vi:'tròng'}, rest:'材质' } | null. Lấy bộ phận dài nhất đứng đầu nhãn. */
function partOfLabel(label) {
  const n = normLabel(label);
  let best = null;
  for (const [zh, def] of Object.entries(partsTable())) {
    if (n.startsWith(zh) && (!best || zh.length > best.zh.length)) best = { zh, vi: def.vi };
  }
  return best ? { part: { zh: best.zh, vi: best.vi }, rest: n.slice(best.zh.length) } : null;
}
/** Chữ OCR "镜片 材质: PC": nhãn tách ra chỉ còn 材质 — nhìn ngược trong chữ nguồn xem có bộ phận đứng ngay trước. */
function partBeforeLabel(label, text) {
  const n = normLabel(label);
  if (!n || !text) return null;
  const alt = Object.keys(partsTable()).sort((a, b) => b.length - a.length).map((z) => z.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  if (!alt) return null;
  const m = String(text).match(new RegExp(`(${alt})[ \\t　]?${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[ \\t　]*[:：]`));
  return m ? { zh: m[1], vi: partsTable()[m[1]].vi } : null;
}
const samePart = (a, b) => (a?.vi || null) === (b?.vi || null);
const UNIT_RE = /(\d[\d.,]*)\s*(kW|W|kV|V|Hz|mAh|Ah|A|mm|cm|m|kg|g|ml|mL|L|GB|TB|inch|寸|英寸|bar|MPa|rpm|BTU)\b/i;
// SKU ĐANG CHỌN (CEO 09/10/2026): nhãn "已选规格(<nhóm>)" do declaration-sheet dựng từ skuSelected/variant.
// Giá trị là lựa chọn thật của khách → thắng bảng thuộc tính liệt kê nhiều giá trị; số đo trong giá trị
// ("150度（建议50-54岁）", "220V", "86mm") rút bằng regex, không chờ AI.
const SELECTED_LABEL_RE = /^已选规格\((.*)\)$/;
const MEASURE_RE = /([+-]?\d+(?:[.,]\d+)?)\s*(度|°|kW|W|kV|V|Hz|mAh|Ah|A|mm|cm|m|kg|g|ml|mL|L|GB|TB|inch|寸|英寸|bar|MPa|rpm|BTU|%)(?![A-Za-z])/;
const MEASURE_UNIT_VI = { '度': 'độ', '寸': 'inch', '英寸': 'inch' };
/** "150度（建议50-54岁）" → "150 độ"; "220V" → "220V"; không có số đo → null. */
function measureOf(value) {
  const m = String(value || '').match(MEASURE_RE);
  if (!m) return null;
  const unit = MEASURE_UNIT_VI[m[2]] || m[2];
  return MEASURE_UNIT_VI[m[2]] ? `${m[1]} ${unit}` : `${m[1]}${unit}`;
}
/** Nhãn có đúng trong danh sách zh của khóa (khớp chính xác, không phải khớp con)? */
function exactLabel(key, label) {
  const n = normLabel(label);
  return (dictionary().keys?.[key]?.zh || []).some((z) => normLabel(z) === n);
}
const selectedGroupOf = (rawLabel) => (String(rawLabel || '').match(SELECTED_LABEL_RE) || [])[1] || null;
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
- translate/verify có thể có nhiều mục cùng key nhưng khác "part" (bộ phận: 镜片 tròng, 镜框 gọng…): trả MỖI mục một dòng riêng, ghi lại part y nguyên, evidenceText là dòng chứa valueZh/candidate của mục đó. Không gộp các bộ phận.
- evidenceText: đoạn chữ NGUYÊN VĂN trong sources chứa giá trị đó, và sourceId của đoạn ấy. Không có chữ làm bằng chứng thì KHÔNG trả khóa đó. Không đoán.
Chỉ trả JSON: {"attributes":[{"key":"","valueVi":"","unit":null,"part":null,"sourceId":"","evidenceText":""}]}`;

// Giá trị lẫn Latin + chữ Hán: "Marc Lichte/马克莱驰特" → "Marc Lichte"; "86型" → "loại 86".
// Tất định, không cần AI — AI lỗi/bị cắt vẫn có nhãn hiệu, model tiếng Việt.
const MIXED_CLEAN_KEYS = new Set(['brand', 'modelNumber', 'partNumber']);

// Giá trị tiếng Trung hay gặp → tiếng Việt cố định (AI dịch lệch: 二三三插 → "2 chấu + 2 chấu + 3 chấu").
const VALUE_MAP = {
  brand: { 无品牌: 'không nhãn hiệu', 无: 'không nhãn hiệu', 其他: 'không nhãn hiệu', 'other/其他': 'không nhãn hiệu', 'OTHER/其他': 'không nhãn hiệu', 无牌: 'không nhãn hiệu' },
  // Chất liệu hay gặp nhất: dịch tất định, không chờ AI (AI lỗi vẫn có "gọng: kim loại").
  material: {
    金属: 'kim loại', 塑料: 'nhựa', 塑胶: 'nhựa', 不锈钢: 'thép không gỉ', '304不锈钢': 'thép không gỉ 304', 铝合金: 'hợp kim nhôm', 铝: 'nhôm',
    铁: 'sắt', 铜: 'đồng', 碳钢: 'thép cacbon', 锌合金: 'hợp kim kẽm', 玻璃: 'thủy tinh', 木: 'gỗ', 实木: 'gỗ tự nhiên', 竹: 'tre',
    硅胶: 'silicone', 橡胶: 'cao su', 陶瓷: 'gốm sứ', 皮革: 'da', 真皮: 'da thật', PU皮: 'da PU', 纯棉: '100% bông', 涤纶: 'polyester', 尼龙: 'nylon', 亚克力: 'acrylic',
  },
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
  // descriptionText: chữ mô tả 商品详情 ĐÃ LỌC tất định ở bên gọi (declaration-sheet filterDescriptionLines) — chỉ là
  // nguồn chữ trang cho AI, xếp sau bảng thông số, trước chữ OCR.
  const descriptionText = typeof body.descriptionText === 'string' ? body.descriptionText.trim().slice(0, 4000) : '';
  return { titleZh: String(body.titleZh || '').slice(0, 500), specsZh, imageTexts, needKeys, skipKeys, verifyImageHits: body.verifyImageHits === true, ...(descriptionText ? { descriptionText } : {}) };
}

function sourcesOf(input) {
  const out = [];
  if (input.titleZh) out.push({ id: 'title', source: 'SITE', imageUrl: null, text: input.titleZh });
  if (Array.isArray(input.specsZh) && input.specsZh.length) {
    out.push({ id: 'specs', source: 'SITE', imageUrl: null, text: input.specsZh.map((s) => `${s.key || s.label}：${s.value}`).join('\n') });
  } else if (typeof input.specsZh === 'string' && input.specsZh) {
    out.push({ id: 'specs', source: 'SITE', imageUrl: null, text: input.specsZh });
  }
  if (input.descriptionText) out.push({ id: 'desc', source: 'SITE', imageUrl: null, text: input.descriptionText });
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
  // Bộ phận: từ tiền tố nhãn (镜框材质) hoặc, với chữ OCR, từ chữ đứng ngay trước nhãn (镜片 材质:).
  // Nhãn = bộ phận + nhãn chung (镜片材质 → glassType) thì thêm hàng cho khóa CHUNG (材质 → material)
  // để ô chất liệu của phiếu gom đủ mọi bộ phận; khóa riêng vẫn giữ.
  const textOfImage = (url) => input.imageTexts.filter((t) => !url || t.url === url).map((t) => t.text).join('\n');
  const expanded = [];
  for (const r of rows) {
    const selectedGroup = selectedGroupOf(r.rawLabel);
    const label = selectedGroup || r.rawLabel; // nhóm SKU "已选规格(镜框颜色)" → xét bộ phận trên "镜框颜色"
    const p = partOfLabel(label);
    // Nhãn = bộ phận + phần lạ (镜片折射率): khóa chỉ do khớp tên bộ phận (镜片 → lensMaterial) là khớp giả → bỏ.
    if (p && p.rest && !keysForLabel(p.rest).length && !exactLabel(r.key, label) && keysForLabel(p.part.zh).includes(r.key)) continue;
    let part = p?.part || null;
    if (!part && r.evidence.source === 'IMAGE_OCR') part = partBeforeLabel(r.rawLabel, textOfImage(r.evidence.imageUrl));
    expanded.push({ ...r, part, ...(selectedGroup ? { selected: true, selectedGroup } : {}) });
    if (p && p.rest) {
      for (const gk of keysForLabel(p.rest)) {
        if (gk === r.key || skip.has(gk)) continue;
        if (expanded.some((x) => x.key === gk && x.value === r.value && samePart(x.part, part))) continue;
        expanded.push({ ...r, key: gk, labelVi: keysDef[gk]?.labelVi || gk, part, ambiguous: false });
      }
    }
  }
  rows = expanded;
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
      // Bảng dịch cố định: giữ chữ gốc ở value (valueZh của phiếu), bản dịch ở valueVi.
      value: mapped ? r.value : cleaned,
      unit: unitOf(r.value),
      ambiguous: r.ambiguous,
      part: r.part || null,
      ...(r.selected ? { selected: true, selectedGroup: r.selectedGroup } : {}),
      evidence: { source: r.evidence.source, imageUrl: r.evidence.imageUrl || null, text: r.evidence.text },
    };
    if (!CJK.test(cleaned) && !plausibleValue(r.key, cleaned)) continue;
    // SKU đang chọn có số đo → giá trị tất định ngay, không gửi AI (AI chỉ còn dịch phần chữ, nếu cần).
    if (r.selected && CJK.test(cleaned) && !PROPER_NOUN_FIELDS.has(r.key)) {
      const measure = measureOf(cleaned);
      if (measure) { attributes.push({ ...base, valueVi: measure, unit: unitOf(measure), method: 'DICTIONARY', confidence: 0.95 }); continue; }
    }
    if (CJK.test(cleaned) && PROPER_NOUN_FIELDS.has(r.key)) {
      // Tên riêng chữ Hán: giữ nguyên, không dịch. Tin 0,8 (thấp hơn Latin 0,95 để bản Latin cùng ô thắng).
      attributes.push({ ...base, valueVi: cleaned, method: 'DICTIONARY', confidence: 0.8, properNoun: true, note: PROPER_NOUN_NOTE });
      continue;
    }
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
      // Cùng key có thể nhiều mục theo bộ phận (part) — AI trả từng mục, bằng chứng là dòng chứa valueZh đó.
      translate: toTranslate.map((t) => ({ key: t.key, valueZh: t.value, ...(t.part ? { part: t.part.zh } : {}) })),
      needKeys: stillNeed,
      ...(toVerify.length ? { verify: toVerify.map((t) => ({ key: t.key, candidate: t.value, evidenceText: t.evidence.text, ...(t.part ? { part: t.part.zh } : {}) })) } : {}),
      sources: sources.map(({ id, text }) => ({ id, text: text.slice(0, 3000) })),
    });
    try {
      // MiniMax-M2.7 suy nghĩ trong <think> ĂN CHUNG maxTokens (sự cố 05/10/2026) → bên gọi nới được.
      const { json, provider, model } = await (opts.llm || llmTier.callLLMJson)(SYSTEM, user, { step: 'extract', tier: 'standard', maxTokens: opts.maxTokens || 2000, timeoutMs: opts.timeoutMs || 45000, ...(opts.temperature != null ? { temperature: opts.temperature } : {}) });
      engine = { provider, model };
      for (const a of Array.isArray(json?.attributes) ? json.attributes : []) {
        const key = String(a?.key || '');
        const valueVi = String(a?.valueVi || '').trim();
        if (!allowedKeys[key] || !valueVi || CJK.test(valueVi) || !plausibleValue(key, valueVi)) continue;
        const src = sources.find((s) => s.id === a.sourceId) || null;
        const ev = String(a?.evidenceText || '').trim();
        // Bằng chứng phải là chữ có thật trong nguồn — chặn AI bịa thông số.
        if (!src || !ev || !evidenceInSource(ev, src.text) || !numbersBacked(valueVi, ev)) continue;
        // Khớp mục đang chờ dịch/soát theo bộ phận: AI ghi part, hoặc bằng chứng chứa giá trị gốc /
        // tên bộ phận; không khớp được thì lấy mục đầu cùng key chưa dùng.
        const waiting = [...toTranslate, ...toVerify].filter((t) => t.key === key);
        // Một giá trị AI cho mỗi (khóa, bộ phận, SKU đang chọn hay không): bản dịch của SKU đang chọn không bị bản dịch danh sách trang che.
        const taken = (t) => attributes.some((x) => x.method === 'LLM' && x.key === key && samePart(x.part, t?.part) && Boolean(x.selected) === Boolean(t?.selected));
        const pending = waiting.find((t) => t.part && a?.part && normLabel(a.part) === t.part.zh)
          || waiting.find((t) => squash(ev).includes(squash(t.value)) || (t.part && squash(ev).includes(squash(t.part.zh))))
          || waiting.find((t) => !taken(t))
          || null;
        const part = pending?.part || null;
        if (taken(pending)) continue;
        attributes.push({
          key,
          labelVi: keysDef[key]?.labelVi || key,
          value: pending && toTranslate.includes(pending) ? pending.value : ev,
          valueVi: withUnit(key, valueVi).slice(0, 120),
          unit: a.unit || unitOf(valueVi),
          ambiguous: pending ? pending.ambiguous : false,
          part,
          ...(pending?.selected ? { selected: true, selectedGroup: pending.selectedGroup } : {}),
          method: 'LLM',
          confidence: pending && toTranslate.includes(pending) ? 0.85 : 0.7,
          evidence: { source: src.source, imageUrl: src.imageUrl, text: ev.slice(0, 200) },
        });
      }
    } catch (e) {
      llmError = { code: e.code || 'LLM_FAILED', message: String(e.message || '').slice(0, 200) };
    }
    // Ứng viên từ ảnh AI không xác nhận (hoặc AI lỗi) → vẫn trả, tin cậy thấp, đánh dấu chưa soát.
    // So theo key + bộ phận: "tròng" AI chưa soát không bị "gọng" đã có che mất.
    for (const t of toVerify) {
      if (!attributes.some((a) => a.key === t.key && samePart(a.part, t.part))) attributes.push({ ...t, valueVi: t.value, method: 'DICTIONARY_UNVERIFIED', confidence: 0.5 });
    }
    // Giá trị chữ Hán không dịch được vẫn trả lại (valueVi null) để ERP biết mà hỏi người.
    for (const t of toTranslate) {
      if (!attributes.some((a) => a.key === t.key && samePart(a.part, t.part))) attributes.push({ ...t, valueVi: null, method: 'DICTIONARY', confidence: 0.5 });
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

module.exports = { extractSpecs, normalizeInput, unitOf, cleanMixedValue, withUnit, plausibleValue, evidenceInSource, partOfLabel, partBeforeLabel, samePart, measureOf, PROPER_NOUN_FIELDS, PROPER_NOUN_NOTE };
