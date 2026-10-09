// lib/declaration-sheet.js — PHIẾU HỒ SƠ KHAI BÁO (POST /api/declaration-sheet).
//
// VÌ SAO (CEO 05/10/2026): addon thu đủ thông số + chữ trong ảnh, nhưng không khâu nào chịu
// trách nhiệm chọn cái gì vào tờ khai → mô tả ECUS thiếu chất liệu/kích thước, ảnh quảng cáo
// lẫn với ảnh thông số. Tri thức chọn ô nằm ở ĐÂY (dùng chung cho mọi hệ thống nối vào);
// bên gọi (ERP) chỉ lưu phiếu của từng món hàng. Module KHÔNG lưu gì — thuần tính toán.
//
// Phiếu = ô chung (TT 39/2018 mục 1.78: công dụng, chất liệu, kích thước, nhãn hiệu, model)
//       + ô theo nhóm hàng (declarationFields — 339 nhóm 4 số đã có template)
// Mỗi ô: giá trị tiếng Việt + nguồn (trang / ảnh số mấy / người bổ sung) + trạng thái.
// Có mã HS → viết luôn mô tả ECUS từ phiếu (describe-core), kèm mức chính sách và rủi ro SHTT.

const { extractSpecs, plausibleValue, samePart, PROPER_NOUN_FIELDS } = require('./extract-specs');
const { dictionary } = require('./zh-specs');
// Gọi qua module (không destructure) để test thay stub được, như llmTier.callLLMJson.
const imageFacts = require('./image-facts');
const { declarationFields, toLookupHs } = require('./declaration-fields');
const { describeProduct } = require('./describe-core');
const { getTaxRecord, normalizeHs } = require('./data');
const { mapTaxRecord } = require('./tax-mapper');
const { checkTrademarkRisk } = require('./trademark-watch');
const { composeWithMeta } = require('./describe-compose');
const { signalsFromSheet, recordSignals } = require('./demand-signals');

const CJK = /[㐀-鿿]/;
const SHEET_VERSION = 1;

// Ô có khái niệm BỘ PHẬN (CEO 08/10/2026): ≥2 giá trị cùng ô nhưng khác bộ phận (镜片材质 PC /
// 镜框材质 金属) → ghép "tròng: PC; gọng: kim loại", giữ bằng chứng từng mẩu. Ô ngoài tập này
// (điện áp, nhãn hiệu…) giữ luật chọn 1 giá trị tin nhất.
const PART_MERGE_FIELDS = new Set(['material', 'color', 'dimensions', 'fiberContent', 'thickness', 'polymerType', 'glassType', 'netWeight', 'size']);
// Tên riêng chữ Hán (nhãn hiệu 柚莎) được giữ nguyên trong phiếu; bên gọi/người bổ sung cũng được gửi chữ Hán cho các ô này.
const keepsHan = (key, v) => PROPER_NOUN_FIELDS.has(key) || !CJK.test(String(v || ''));

// Ô chung theo TT 39/2018 mục 1.78. `requiredFromChapter`: từ chương này trở đi mới bắt buộc
// (chương 1–38 là nông sản, thực phẩm, hóa chất — chất liệu/kích thước không phải trọng tâm,
// thành phần do ô theo nhóm hàng đòi).
const COMMON_FIELDS = [
  { key: 'application', labelVi: 'Công dụng', requiredFromChapter: 1 },
  { key: 'material', labelVi: 'Chất liệu / thành phần cấu tạo', requiredFromChapter: 39 },
  { key: 'dimensions', labelVi: 'Kích thước / quy cách', requiredFromChapter: 39 },
  { key: 'brand', labelVi: 'Nhãn hiệu', requiredFromChapter: 1 },
  { key: 'modelNumber', labelVi: 'Model / ký mã hiệu', requiredFromChapter: 39 },
];

// Chữ trên tên hàng gợi ý hàng nhái / mượn nhãn hiệu người khác (rủi ro SHTT, TT 13/2015 & 13/2020).
const COUNTERFEIT_SIGNALS = [
  { re: /高仿|仿牌|仿品|A货|复刻|精仿/, labelVi: 'Tự nhận là hàng nhái / hàng "replica"' },
  { re: /原单|尾单|大牌|平替/, labelVi: 'Gắn với nhãn hiệu lớn ("hàng xuất dư", "thay thế hàng hiệu")' },
  { re: /同款/, labelVi: '"Cùng mẫu" với sản phẩm/nhãn hiệu khác — kiểm tra kiểu dáng, nhãn hiệu được bảo hộ' },
];

const ROLE_SOURCES = new Set(['CUSTOMER', 'SALES', 'OPS', 'ADMIN', 'DOCUMENT']);
// Ô KIỆN đóng gói (bảng 商品件重尺 của 1688): chỉ cho vận chuyển, KHÔNG vào mô tả ECUS.
const PACKAGE_KEYS = new Set(['packageDimensions', 'packageWeight', 'packageVolume']);
const PACKAGING_EVIDENCE = '包装信息/商品件重尺 (SKU đang chọn)';
const PACKAGING_NOTE = 'Kích thước KIỆN đóng gói (không phải kích thước sản phẩm) — không dùng trong mô tả ECUS';
const SKU_EVIDENCE = (group, value) => `SKU đang chọn: ${group}=${value}`;
const ALLOWED_IMAGE_ROLES = new Set(['sku', 'main']);

/**
 * Bật đọc ảnh bằng AI (vision)? HS_SHEET_VISION=0 tắt hẳn; =1 bật; không đặt → bật khi có GEMINI_API_KEY.
 */
function visionEnabled() {
  const v = String(process.env.HS_SHEET_VISION || '').trim();
  if (v === '0' || /^(false|off|no)$/i.test(v)) return false;
  if (v === '1' || /^(true|on|yes)$/i.test(v)) return true;
  return Boolean(process.env.GEMINI_API_KEY);
}

/** skuSelected: [{group, value, imageUrl?, qty?}] — bỏ mục thiếu nhóm/giá trị, cắt độ dài, ≤ 20 mục. */
function normalizeSkuSelected(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === 'object' && String(x.group || x.label || '').trim() && String(x.value ?? '').trim())
    .slice(0, 20)
    .map((x) => ({
      group: String(x.group || x.label).trim().slice(0, 40),
      value: String(x.value).trim().slice(0, 200),
      ...(typeof x.imageUrl === 'string' && /^https?:\/\//.test(x.imageUrl) ? { imageUrl: x.imageUrl.slice(0, 1000) } : {}),
      ...(Number.isFinite(Number(x.qty)) && Number(x.qty) > 0 ? { qty: Number(x.qty) } : {}),
    }));
}

const num = (v, max) => { const n = Number(v); return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n * 100) / 100 : null; };
/** packaging: {sku?, lengthCm, widthCm, heightCm, volumeCm3?, weightG?} — số dương hợp lý, thiếu/sai → null từng ô. */
function normalizePackaging(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const l = num(raw.lengthCm, 1000); const w = num(raw.widthCm, 1000); const h = num(raw.heightCm, 1000);
  const volumeCm3 = num(raw.volumeCm3, 1e9) ?? (l && w && h ? Math.round(l * w * h) : null);
  const weightG = num(raw.weightG, 1e7);
  const sku = raw.sku && typeof raw.sku === 'object' && !Array.isArray(raw.sku)
    ? Object.fromEntries(Object.entries(raw.sku).filter(([k, v]) => k && v != null && String(v).trim()).slice(0, 10).map(([k, v]) => [String(k).slice(0, 40), String(v).slice(0, 120)]))
    : null;
  const dimsCm = l && w && h ? `${l}×${w}×${h} cm` : null;
  if (!dimsCm && !volumeCm3 && !weightG) return null;
  return { sku, lengthCm: l, widthCm: w, heightCm: h, volumeCm3, weightG, dimsCm };
}

// Dòng mô tả giữ lại cho AI: dạng "nhãn：giá trị" hoặc có số + đơn vị. Tất định, chạy trước AI.
const DESC_PAIR_RE = /^[^:：]{1,30}[:：]\s*\S/;
const DESC_MEASURE_RE = /\d\s*(度|°|kW|W|kV|V|Hz|mAh|Ah|A|mm|cm|m|kg|g|ml|mL|L|GB|TB|inch|寸|英寸|bar|MPa|rpm|BTU|%)(?![A-Za-z])/;
/** descriptionText (≤ 8.000 ký tự chữ 商品详情) → chỉ dòng có cấu trúc, bỏ trùng, ≤ 4.000 ký tự. */
function filterDescriptionLines(text) {
  if (typeof text !== 'string' || !text.trim()) return '';
  const seen = new Set();
  const out = [];
  for (const raw of text.slice(0, 8000).split(/[\n\r]+/)) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line || line.length > 200) continue;
    if (!DESC_PAIR_RE.test(line) && !DESC_MEASURE_RE.test(line)) continue;
    const k = line.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(line);
  }
  return out.join('\n').slice(0, 4000);
}

/** images: [{url, role:'sku'|'main'}] ≤ 3, URL http(s) hợp lệ; không có mà SKU đang chọn có ảnh → lấy ảnh SKU. */
function normalizeImages(raw, skuSelected = []) {
  const list = (Array.isArray(raw) ? raw : [])
    .filter((i) => i && typeof i.url === 'string' && /^https?:\/\/\S+$/.test(i.url.trim()))
    .map((i) => ({ url: i.url.trim().slice(0, 1000), role: ALLOWED_IMAGE_ROLES.has(i.role) ? i.role : 'main' }));
  if (!list.length) for (const s of skuSelected) if (s.imageUrl && !list.some((i) => i.url === s.imageUrl)) list.push({ url: s.imageUrl, role: 'sku' });
  const seen = new Set();
  return list.filter((i) => (seen.has(i.url) ? false : (seen.add(i.url), true))).slice(0, 3);
}

function questionsFor(key, labelVi, candidate = null) {
  const zh = dictionary().keys?.[key]?.zh || [];
  return {
    questionVi: candidate ? `${labelVi} của hàng có đúng là "${candidate}" không?` : `${labelVi} của hàng là gì?`,
    questionZh: zh.length ? `请问${zh[0]}是什么？` : null,
  };
}

function normalizeSupplements(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && s.key && String(s.valueVi ?? s.value ?? '').trim())
    .map((s) => ({
      key: String(s.key),
      valueVi: String(s.valueVi ?? s.value).trim().slice(0, 160),
      source: ROLE_SOURCES.has(String(s.source || '').toUpperCase()) ? String(s.source).toUpperCase() : 'CUSTOMER',
    }))
    .filter((s) => keepsHan(s.key, s.valueVi));
}

/**
 * Lựa chọn ĐANG CHỌN → dòng thông số "已选规格(<nhóm>)：<giá trị>" (extract-specs nhận ra nhãn này: dịch nhóm qua
 * từ điển, rút số đo bằng regex, đánh dấu selected để thắng bảng thuộc tính nhiều giá trị).
 *  - skuSelected (ERP, có nhóm thật 颜色分类/度数) là nguồn mạnh nhất; không có thì dùng variant cũ.
 */
function variantSpecs(variant, skuSelected = []) {
  if (skuSelected.length) return skuSelected.map((v) => ({ key: `已选规格(${v.group.slice(0, 30)})`, value: v.value }));
  if (!Array.isArray(variant)) return [];
  return variant
    .filter((v) => v && v.value)
    .map((v) => ({ key: `已选规格(${String(v.label || 'Phân loại').slice(0, 30)})`, value: String(v.value).slice(0, 200) }));
}

// Nhãn ngắn trong mô tả ECUS (khóa không có ở đây → nhãn tiếng Việt viết thường).
const SPEC_LABEL = {
  voltage: 'điện áp', currentRating: 'dòng', power: 'công suất', frequency: 'tần số',
  dimensions: 'KT', poleCount: '', volumeMl: 'dung tích', capacityAh: 'dung lượng pin',
  screenSize: 'màn hình', storageCapacity: 'bộ nhớ', ramCapacity: 'RAM', thickness: 'độ dày',
  netWeight: 'khối lượng tịnh', cableLength: 'dài cáp', crossSection: 'tiết diện',
};
// Ô đi vào chỗ riêng của mô tả, không lặp trong "thông số".
const OWN_SLOT = new Set(['brand', 'modelNumber', 'material', 'application', 'origin', 'color']);
// Ô chất liệu THEO BỘ PHẬN của mẫu nhóm (kính: tròng/gọng; giày: mũ/đế…) → gộp vào "thành phần" thay vì
// liệt kê thành 2–3 dòng thông số (09/10/2026: kính lão ra "thành phần: PC; … chất liệu tròng kính PC;
// chất liệu gọng kính kim loại" dài thừa, đẩy model ra khỏi 200 ký tự).
const PART_MATERIAL = { lensMaterial: 'tròng', frameMaterial: 'gọng', upperMaterial: 'mũ giày', soleMaterial: 'đế', outerMaterial: 'mặt ngoài', bladeMaterial: 'lưỡi' };
const fold = (x) => String(x || '').toLowerCase().replace(/\s+/g, '');
// Chất liệu đã ghép theo bộ phận ("tròng: PC; gọng: kim loại") → ô riêng cùng nghĩa (loại kính PC) không lặp trong mô tả.
const coveredByMaterial = (material) => (f) => Boolean(material?.parts && f.key !== 'material' && f.valueVi && fold(material.valueVi).includes(fold(f.valueVi)));

const DANGLING = /^(kèm|có|và|với|cho|loại|kiểu|dùng|gắn|bằng|của|các|nhiều|đa|chất|liệu|chống|không|siêu|cao|gọng|tròng|vỏ|đế|mũ|tay|nắp|thân)$/i;
/** Rút tên hàng tới khi vừa: bỏ vế sau dấu phẩy trước, rồi từng từ; dừng ở ngưỡng ký tự/từ tối thiểu. */
function shortenName(declaration, fits, minWords = 4, minChars = 40) {
  let name = String(declaration.tenHang || '').trim();
  while (!fits() && name.length > minChars && name.includes(',')) {
    name = name.slice(0, name.lastIndexOf(',')).trim();
    declaration.tenHang = name;
  }
  const words = name.split(/\s+/);
  while (!fits() && words.length > minWords && words.join(' ').length > minChars) {
    words.pop();
    while (words.length > minWords && DANGLING.test(words[words.length - 1])) words.pop();
    declaration.tenHang = words.join(' ');
  }
}

/** Rút một dòng thông số về cốt lõi cho ô ECUS: bỏ ngoặc giải thích, lấy vế đầu trước ';' hoặc ',', ≤ 60 ký tự. */
function clipSpec(t) {
  const core = String(t || '').replace(/\s*\([^)]*\)/g, '').split(/[;,]/)[0].trim();
  return core.length > 60 ? core.slice(0, 60).replace(/\s+\S*$/, '').trim() : core;
}

function specLine(f) {
  const label = SPEC_LABEL[f.key] ?? String(f.labelVi || f.key).toLowerCase();
  return label ? `${label} ${f.valueVi}` : f.valueVi;
}

/**
 * Mô tả ECUS GHÉP TẤT ĐỊNH từ phiếu (CEO 05/10/2026: AI viết tự do hay bỏ rơi 250V/10A).
 * AI chỉ đóng góp tên hàng tiếng Việt cụ thể + thông số phụ nó tách được. Thứ tự: tên → nhãn
 * hiệu → model → chất liệu → thông số (ô BẮT BUỘC trước, ô nên có, rồi thông số phụ của AI)
 * → công dụng → xuất xứ → tình trạng. Quá 200 ký tự: describe-compose cắt từ phần phụ.
 */
function composeFromSheet(fields, extras, decl, trademark, ctx) {
  const have = (k) => fields.find((f) => f.key === k && f.status === 'HAVE') || null;
  const brand = have('brand');
  const material = have('material');
  const inMaterial = coveredByMaterial(material);
  // Chất liệu theo bộ phận → một chuỗi "tròng: PC; gọng: kim loại"; ô material chung chỉ giữ nếu không trùng.
  const partMats = Object.entries(PART_MATERIAL).map(([k, part]) => [part, have(k)?.valueVi]).filter(([, v]) => v);
  const thanhPhan = (() => {
    if (!partMats.length) return material?.valueVi || null;
    const base = fold(material?.valueVi);
    // Ô material đã ghép theo bộ phận (MERGED_PARTS) là gốc; ô bộ phận chỉ thêm khi chưa có trong đó.
    if (material?.parts) return [material.valueVi, ...partMats.filter(([, v]) => !base.includes(fold(v))).map(([part, v]) => `${part}: ${v}`)].join('; ');
    const dup = partMats.some(([, v]) => fold(v) === base);
    return [...(material?.valueVi && !dup ? [material.valueVi] : []), ...partMats.map(([part, v]) => `${part}: ${v}`)].join('; ');
  })();
  const isPartMat = (f) => Boolean(PART_MATERIAL[f.key]) && partMats.length > 0;
  // Ô kiện đóng gói (packageDimensions… hoặc ô dimensions điền tạm từ kiện) không vào mô tả hàng.
  const usable = (f) => f.status === 'HAVE' && !OWN_SLOT.has(f.key) && !inMaterial(f) && !isPartMat(f) && !PACKAGE_KEYS.has(f.key) && !f.packaging;
  const specFields = [
    ...fields.filter((f) => usable(f) && f.required),
    ...fields.filter((f) => usable(f) && !f.required),
  ];
  // Nhãn hiệu chữ Hán thuần: ECUS/VNACCS không nhận chữ Hán → không đưa vào mô tả, báo ở omittedHan.
  const omittedHan = [];
  const brandVi = brand?.valueVi && CJK.test(brand.valueVi) ? (omittedHan.push({ key: 'brand', valueZh: brand.valueZh || brand.valueVi, noteVi: 'Nhãn hiệu chữ Hán — ECUS không nhận; cần chữ Latin/phiên âm trên nhãn thật.' }), null) : (brand?.valueVi || null);
  const lines = specFields.map(specLine);
  const seen = fold(lines.join('|'));
  for (const t of Array.isArray(decl?.thongSoKyThuat) ? decl.thongSoKyThuat : []) {
    if (!t || /[㐀-鿿]/.test(t)) continue;
    // Bỏ dòng AI trùng thông số đã có (so phần số/đơn vị).
    const nums = String(t).match(/\d[\d.,x×*\/]*\s*[a-zA-Z%]*/g) || [];
    if (nums.length && nums.every((n) => seen.includes(fold(n)))) continue;
    // Không có số: bỏ khi mọi từ ≥3 ký tự đã có ("kết nối Bluetooth/USB" ≈ "kết nối Bluetooth, USB").
    const words = String(t).toLowerCase().split(/[^0-9a-zà-ỹđ]+/i).filter((w) => w.length >= 3);
    if (!nums.length && words.length && words.every((w) => seen.includes(w))) continue;
    lines.push(String(t).trim());
  }
  const declaration = {
    // Tên AI trả còn chữ Hán / rỗng (AI lỗi → describe dùng nguyên titleZh) → tên theo biểu thuế.
    tenHang: decl?.tenHang && !CJK.test(decl.tenHang) ? decl.tenHang : ctx.productName,
    nhanHieu: trademark.brandStatus === 'NO_BRAND' ? 'không nhãn hiệu' : brandVi,
    model: have('modelNumber')?.valueVi || null,
    // Chất liệu CHỈ lấy từ ô có bằng chứng — AI viết mô tả hay tự đoán ("nhựa").
    thanhPhanCauTao: thanhPhan,
    thongSoKyThuat: lines,
    congDung: have('application')?.valueVi || decl?.congDung || null,
    xuatXu: decl?.xuatXu || { nameVi: ctx.origin },
    tinhTrang: decl?.tinhTrang || ctx.condition,
  };
  if (declaration.nhanHieu === 'không nhãn hiệu') declaration.nhanHieu = null; // ECUS: bỏ trống thay vì viết "nhãn hiệu không nhãn hiệu"
  // Model trùng phần số trong tên ("loại 86" vs "kiểu 86") → bỏ model.
  const core = (x) => fold(x).replace(/^(loại|kiểu|model)/, '');
  if (declaration.model && fold(declaration.tenHang).includes(core(declaration.model))) declaration.model = null;

  // Vừa 200 ký tự theo ĐÚNG thứ tự ưu tiên của phiếu: ô bắt buộc không bao giờ bị cắt. Hy sinh
  // lần lượt: công dụng → thông số phụ (ô không bắt buộc + dòng AI) → model → rút gọn tên hàng.
  // Đếm trên specFields (đã loại ô trùng chất liệu đã ghép) — đếm trên fields làm thông số phụ không bao giờ được bỏ.
  const requiredCount = specFields.filter((f) => f.required).length;
  const fits = () => !composeWithMeta(declaration).truncated;
  if (!fits()) declaration.congDung = null;
  // Ô bắt buộc AI diễn giải dài ("147 x 50 x 39 mm (tổng rộng x tròng x đ cao), cầu mũi 17 mm…") đẩy
  // tên hàng + model ra khỏi mô tả (ca kính lão 09/10/2026) → rút từng dòng về phần cốt lõi TRƯỚC khi
  // hy sinh thông số phụ/model/tên: bỏ ngoặc, lấy vế đầu, ≤ 60 ký tự. Phiếu vẫn giữ giá trị đầy đủ.
  if (!fits()) declaration.thongSoKyThuat = declaration.thongSoKyThuat.map(clipSpec);
  while (!fits() && declaration.thongSoKyThuat.length > requiredCount) declaration.thongSoKyThuat.pop();
  // Tên AI đặt hay dài dòng ("… cho nam, lão hoá cao cấp, có đổi màu, gọng kim loại") — rút tên TRƯỚC khi bỏ
  // model (model là mốc đối chiếu hoá đơn/catalogue, CEO 05/10): bỏ dần vế sau dấu phẩy, rồi từng từ; tối thiểu
  // 40 ký tự / 4 từ. Không để tên cụt ở từ nối hoặc danh từ bộ phận ("… gọng").
  if (!fits()) shortenName(declaration, fits);
  if (!fits()) declaration.model = null;
  if (!fits()) shortenName(declaration, fits, 4);
  // Còn quá dài (chất liệu dài…) → rút chất liệu về vế đầu, tối đa 40 ký tự.
  if (!fits() && declaration.thanhPhanCauTao && declaration.thanhPhanCauTao.length > 40) {
    declaration.thanhPhanCauTao = declaration.thanhPhanCauTao.split(/[;,(]/)[0].trim().slice(0, 40);
  }
  const composed = composeWithMeta(declaration);
  // Ô bắt buộc nào vẫn rơi khỏi mô tả → báo rõ (không cắt im lặng).
  // Dòng đã rút gọn (clipSpec) vẫn tính là có mặt khi phần cốt lõi còn trong mô tả.
  const requiredDropped = specFields.filter((f) => f.required && !composed.text.includes(f.valueVi) && !composed.text.includes(clipSpec(f.valueVi))).map((f) => f.key);
  return { declaration, composed, requiredDropped, omittedHan };
}

// SKU đang chọn thắng mọi giá trị trang/ảnh cùng ô (bảng thuộc tính liệt kê "金色,银色,…" là danh sách, không phải hàng này).
const better = (a, prev) => !prev || (!prev.valueVi && a.valueVi) || (a.valueVi && !prev.selected && (a.selected || (a.confidence || 0) > (prev.confidence || 0)));

/**
 * Nhiều giá trị cùng ô → một giá trị cho phiếu.
 *  - Ô có bộ phận và ≥2 bộ phận khác nhau đã có tiếng Việt chắc chắn: ghép "tròng: PC; gọng: kim loại"
 *    (thứ tự theo trang; cùng bộ phận chỉ giữ 1 — ảnh lặp trang không lặp), method MERGED_PARTS, parts[].
 *  - Còn lại: giữ luật cũ — bản đã dịch, tin cậy cao hơn.
 */
function pickOrMergeParts(key, list) {
  let best = null;
  for (const a of list) if (better(a, best)) best = a;
  if (!PART_MERGE_FIELDS.has(key)) return best;
  const pieces = [];
  for (const a of list) {
    if (!a.valueVi || a.method === 'DICTIONARY_UNVERIFIED') continue;
    const i = pieces.findIndex((p) => samePart(p.part, a.part));
    if (i === -1) pieces.push(a);
    else if (better(a, pieces[i]) && (a.selected || !fold(pieces[i].valueVi).includes(fold(a.valueVi)))) pieces[i] = a; // cùng bộ phận: giữ bản tin hơn, trừ khi bản cũ đã bao hàm; SKU đang chọn luôn thay danh sách
  }
  const named = pieces.filter((p) => p.part);
  if (new Set(named.map((p) => p.part.vi)).size < 2) return best;
  const label = (p) => (p.part ? `${p.part.vi}: ${p.valueVi}` : p.valueVi);
  const hasZh = pieces.some((p) => CJK.test(String(p.value || '')));
  return {
    key,
    labelVi: best.labelVi,
    value: hasZh ? pieces.map((p) => (p.part ? `${p.part.zh}: ${p.value}` : p.value)).join('; ') : null,
    valueVi: pieces.map(label).join('; ').slice(0, 160),
    unit: null,
    ambiguous: false,
    part: null,
    method: 'MERGED_PARTS',
    confidence: Math.min(...pieces.map((p) => p.confidence || 0)),
    evidence: pieces[0].evidence,
    parts: pieces.map((p) => ({
      part: p.part, valueVi: p.valueVi, valueZh: CJK.test(String(p.value || '')) ? p.value : null,
      source: p.evidence?.source === 'IMAGE_OCR' ? 'IMAGE_OCR' : 'SITE', evidence: p.evidence || null, method: p.method, confidence: p.confidence,
    })),
  };
}

const _seen = new Map(); // dấu vân tay món → ngày (chỉ bộ nhớ, không ghi đĩa)
function firstTimeToday(key) {
  const crypto = require('crypto');
  const day = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const h = crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
  if (_seen.get(h) === day) return false;
  if (_seen.size > 5000) _seen.clear();
  _seen.set(h, day);
  return true;
}

function chapterOf(hs) {
  return hs ? Number(String(hs).slice(0, 2)) : null;
}

/** Danh sách ô của phiếu: ô theo nhóm hàng (nếu có mã) + ô chung, bỏ trùng (nhóm hàng thắng). */
function sheetFieldDefs(hs) {
  const out = new Map();
  const spec = hs ? declarationFields(hs) : null;
  for (const f of spec?.fields || []) {
    out.set(f.key, { key: f.key, labelVi: f.labelVi, required: f.required, origin: 'HEADING', ecusHint: f.ecusHint || null });
  }
  const ch = chapterOf(hs);
  for (const c of COMMON_FIELDS) {
    const required = ch == null ? true : ch >= c.requiredFromChapter;
    const prev = out.get(c.key);
    if (prev) prev.required = prev.required || required;
    else out.set(c.key, { key: c.key, labelVi: c.labelVi, required, origin: 'COMMON', ecusHint: null });
  }
  return { defs: [...out.values()], heading: spec ? { code: spec.heading, titleVi: spec.titleVi, template: spec.template } : null };
}

function counterfeitSignals(titleZh) {
  const t = String(titleZh || '');
  const hits = [];
  for (const s of COUNTERFEIT_SIGNALS) {
    const m = t.match(s.re);
    if (m) hits.push({ term: m[0], labelVi: s.labelVi });
  }
  return hits;
}

/**
 * buildDeclarationSheet(body, opts) → { status, json }
 * body: { titleZh, titleVi?, specsZh:[{key,value}], variant?:[{label,value}], imageTexts?:[{url,text}],
 *         skuSelected?:[{group,value,imageUrl?,qty?}], packaging?:{sku?,lengthCm,widthCm,heightCm,volumeCm3?,weightG?},
 *         descriptionText?, images?:[{url,role:'sku'|'main'}],
 *         hsCode?, supplements?:[{key, valueVi, source}], known?:[{key, valueVi, source, evidence}],
 *         origin?, condition? }
 *  - supplements: khách/NV/chứng từ bổ sung (bên gọi lưu, gửi lại mỗi lần) — thắng dữ liệu trang.
 *  - known: ô đã rút ở lần lập phiếu trước (cùng món) — không rút lại, đỡ một lượt AI.
 *  Ưu tiên nguồn (CEO 09/10/2026): người bổ sung > SKU đang chọn > bảng thuộc tính trang > bảng kiện > ảnh (vision/OCR) > mô tả.
 */
async function buildDeclarationSheet(body = {}, opts = {}) {
  const titleZh = String(body.titleZh || '').trim();
  // specsZh dạng chuỗi ("材质: 不锈钢\n电压: 220V") → mảng {key,value} như extract-specs chấp nhận.
  const specsInput = typeof body.specsZh === 'string'
    ? body.specsZh.split(/\n+/).map((l) => l.match(/^\s*([^:：]{1,30})[:：]\s*(.+)$/)).filter(Boolean).map((m) => ({ key: m[1].trim(), value: m[2].trim() }))
    : (Array.isArray(body.specsZh) ? body.specsZh : []);
  const skuSelected = normalizeSkuSelected(body.skuSelected);
  const specsZh = [...specsInput, ...variantSpecs(body.variant, skuSelected)];
  const imageTexts = Array.isArray(body.imageTexts) ? body.imageTexts : [];
  const packaging = normalizePackaging(body.packaging);
  const descriptionText = filterDescriptionLines(body.descriptionText);
  const images = normalizeImages(body.images, skuSelected);
  if (!titleZh && !specsZh.length && !imageTexts.length) {
    return { status: 400, json: { error: 'Cần ít nhất một trong: titleZh, specsZh, imageTexts[{url,text}]' } };
  }

  const rawHs = body.hsCode || body.hs;
  // Mã chưa đủ 8 số (4/6 số) chỉ dùng chọn khung ô theo nhóm — KHÔNG viết mô tả / tra chính sách:
  // toLookupHs đệm "00" có thể trùng một dòng thuế có thật mà người dùng không chọn (010121 → 01012100).
  const rawDigits = String(rawHs || '').replace(/\D/g, '');
  const hs = rawDigits.length >= 8 ? toLookupHs(rawHs) : null;
  const { defs, heading } = sheetFieldDefs(rawDigits.length >= 4 ? toLookupHs(rawHs) : null);

  const supplements = normalizeSupplements(body.supplements);
  const known = (Array.isArray(body.known) ? body.known : [])
    // Ô máy đọc lần trước cũng phải qua luật sai loại (lần trước có thể đã lưu "nhãn hiệu Đức").
    .filter((k) => k && k.key && k.valueVi && keepsHan(k.key, k.valueVi) && plausibleValue(k.key, k.valueVi));
  const preset = new Map();
  for (const k of known) preset.set(k.key, { valueVi: String(k.valueVi).slice(0, 160), source: k.source || 'SITE', evidence: k.evidence || null, method: k.method || 'KNOWN', confidence: k.confidence ?? 0.8 });
  for (const s of supplements) preset.set(s.key, { valueVi: s.valueVi, source: s.source, evidence: null, method: 'SUPPLEMENT', confidence: 1 });

  const allowed = new Set(Object.keys(dictionary().keys || {}));
  const needKeys = defs.map((d) => d.key).filter((k) => allowed.has(k) && !preset.has(k));
  const llmOpts = { maxTokens: 8000, timeoutMs: 120000, temperature: 0, ...opts };
  const extracted = await extractSpecs(
    { titleZh, specsZh, imageTexts, descriptionText, needKeys, skipKeys: [...preset.keys()].filter((k) => allowed.has(k)), verifyImageHits: true },
    llmOpts,
  );

  // Lượt VÁ (05/10/2026: MiniMax trả không ổn định — có lần bỏ qua chất liệu/kích thước dù
  // nguồn có): ô BẮT BUỘC còn chưa có giá trị tiếng Việt chắc chắn → hỏi AI lại riêng các ô đó.
  // Câu hỏi ngắn → ổn định hơn. Chỉ chạy khi lượt đầu AI không lỗi.
  const firstGood = new Set((extracted.attributes || []).filter((a) => a.valueVi && a.method !== 'DICTIONARY_UNVERIFIED').map((a) => a.key));
  const weak = defs.filter((d) => d.required && allowed.has(d.key) && !preset.has(d.key) && !firstGood.has(d.key)).map((d) => d.key);
  let repair = null;
  if (weak.length && extracted.llmUsed && !extracted.llmError) {
    repair = await extractSpecs(
      { titleZh, specsZh, imageTexts, descriptionText, needKeys: weak, skipKeys: [...firstGood, ...[...preset.keys()].filter((k) => allowed.has(k))], verifyImageHits: true },
      llmOpts,
    );
  }

  const byKey = new Map();
  const groups = new Map(); // key → mọi giá trị rút được, theo thứ tự trang → ảnh
  for (const a of [...(extracted.attributes || []), ...(repair?.attributes || [])]) {
    if (!groups.has(a.key)) groups.set(a.key, []);
    groups.get(a.key).push(a);
  }
  for (const [key, list] of groups) byKey.set(key, pickOrMergeParts(key, list));
  const solid = (a) => Boolean(a?.valueVi) && a.method !== 'DICTIONARY_UNVERIFIED';

  // ẢNH → Gemini vision (CEO 09/10/2026): chỉ điền ô còn thiếu/chưa soát, nguồn IMAGE_AI, tin ≤ 0,8.
  // Không gọi khi không có ảnh hoặc tắt bằng HS_SHEET_VISION=0; lỗi ảnh/AI → bỏ qua, phiếu vẫn lập.
  let vision = null;
  if (images.length && visionEnabled()) {
    const headingKeys = Object.fromEntries(defs.filter((d) => allowed.has(d.key) && !preset.has(d.key) && !solid(byKey.get(d.key))).map((d) => [d.key, d.labelVi]));
    try {
      vision = await imageFacts.readImageFacts(images, { hsCode: hs, headingKeys, titleZh });
    } catch (e) {
      vision = { images: [], seenText: [], facts: [], engine: null, llmError: { code: e.code || 'VISION_FAILED', message: String(e.message || '').slice(0, 200) } };
    }
    for (const f of vision.facts || []) {
      if (!allowed.has(f.key) || preset.has(f.key) || solid(byKey.get(f.key)) || !plausibleValue(f.key, f.valueVi)) continue;
      byKey.set(f.key, {
        key: f.key, labelVi: dictionary().keys?.[f.key]?.labelVi || f.key, value: f.valueZh || null, valueVi: f.valueVi, unit: null, ambiguous: false, part: null,
        method: 'VISION', confidence: Math.min(imageFacts.MAX_CONFIDENCE, f.confidence || 0.5),
        evidence: { source: 'IMAGE_AI', imageUrl: f.imageUrl || null, text: f.evidence },
      });
    }
  }

  // KIỆN đóng gói → ô riêng packageDimensions/packageWeight/packageVolume (nguồn SITE, tất định). Ô dimensions của
  // SẢN PHẨM chỉ điền tạm từ kiện khi trang/ảnh không có — đánh dấu packaging để mô tả ECUS bỏ qua.
  const packagingRows = [];
  if (packaging) {
    const mk = (key, valueVi) => ({ key, labelVi: dictionary().keys?.[key]?.labelVi || key, value: null, valueVi, unit: null, ambiguous: false, part: null, method: 'PACKAGING', confidence: 0.95, evidence: { source: 'SITE', imageUrl: null, text: PACKAGING_EVIDENCE } });
    if (packaging.dimsCm) packagingRows.push(mk('packageDimensions', packaging.dimsCm));
    if (packaging.weightG) packagingRows.push(mk('packageWeight', packaging.weightG >= 1000 ? `${Math.round(packaging.weightG / 10) / 100} kg` : `${packaging.weightG} g`));
    if (packaging.volumeCm3) packagingRows.push(mk('packageVolume', `${packaging.volumeCm3} cm³`));
    for (const r of packagingRows) if (!solid(byKey.get(r.key))) byKey.set(r.key, r);
    if (packaging.dimsCm && !preset.has('dimensions') && !solid(byKey.get('dimensions'))) {
      byKey.set('dimensions', { ...mk('dimensions', packaging.dimsCm), packaging: true, note: PACKAGING_NOTE });
    }
  }

  const sourceOf = (a) => (a?.evidence?.source === 'IMAGE_OCR' || a?.evidence?.source === 'IMAGE_AI' ? a.evidence.source : 'SITE');
  const toEvidence = (a) => (a?.evidence ? { source: a.evidence.source, imageUrl: a.evidence.imageUrl || null, text: a.selected && a.selectedGroup ? SKU_EVIDENCE(a.selectedGroup, a.value || a.valueVi) : a.evidence.text } : null);
  const fields = defs.map((d) => {
    const p = preset.get(d.key);
    const a = byKey.get(d.key);
    let valueVi = null; let valueZh = null; let source = null; let evidence = null; let method = null; let confidence = null;
    if (p) {
      ({ valueVi, source, evidence, method, confidence } = p);
    } else if (a) {
      valueVi = a.valueVi || null;
      valueZh = CJK.test(String(a.value || '')) ? a.value : null;
      source = sourceOf(a);
      evidence = toEvidence(a);
      method = a.selected ? 'SKU_SELECTED' : a.method; confidence = a.selected && a.valueVi ? Math.max(a.confidence || 0, 0.95) : a.confidence;
    }
    // UNVERIFIED: máy đọc được từ ảnh nhưng AI chưa soát (AI lỗi) — có thể là bảng size chung của
    // shop; không dùng vào mô tả, hỏi người xác nhận.
    const status = valueVi ? (method === 'DICTIONARY_UNVERIFIED' ? 'UNVERIFIED' : 'HAVE') : (valueZh ? 'UNTRANSLATED' : 'MISSING');
    return {
      key: d.key,
      labelVi: d.labelVi,
      required: d.required,
      origin: d.origin,
      ecusHint: d.ecusHint,
      valueVi,
      valueZh,
      status,
      source,
      evidence,
      method,
      confidence,
      // Bộ phận: ô ghép có parts[] (mỗi mẩu kèm bằng chứng); ô 1 nguồn có bộ phận thì ghi part.
      ...(a?.parts ? { parts: a.parts } : (a?.part ? { part: a.part } : {})),
      // Tên riêng chữ Hán giữ nguyên — ERP biết để không bắt dịch / hỏi người.
      ...(a?.note ? { note: a.note } : {}),
      // Ô điền tạm từ kiện đóng gói — không phải số đo sản phẩm, mô tả ECUS bỏ qua.
      ...(a?.packaging ? { packaging: true } : {}),
      ...(status === 'HAVE' ? {} : questionsFor(d.key, d.labelVi, status === 'UNVERIFIED' ? valueVi : null)),
    };
  });

  const fieldKeys = new Set(fields.map((f) => f.key));
  // Thông số khác rút được (không thuộc ô bắt buộc) — vẫn dùng cho mô tả + tra mã.
  const extras = [...byKey.values()]
    .filter((a) => !fieldKeys.has(a.key) && a.valueVi && a.method !== 'DICTIONARY_UNVERIFIED')
    .map((a) => ({ key: a.key, labelVi: a.labelVi, valueVi: a.valueVi, source: sourceOf(a), evidence: toEvidence(a), method: a.selected ? 'SKU_SELECTED' : (a.method || null), ...(a.confidence != null ? { confidence: a.confidence } : {}), ...(PACKAGE_KEYS.has(a.key) ? { packaging: true } : {}) }));
  for (const s of supplements) {
    if (!fieldKeys.has(s.key) && !extras.some((e) => e.key === s.key)) extras.push({ key: s.key, labelVi: dictionary().keys?.[s.key]?.labelVi || s.key, valueVi: s.valueVi, source: s.source, evidence: null });
  }

  // Ảnh không đóng góp thông số nào = ảnh quảng cáo / giới thiệu thương hiệu / chính sách shop.
  const usedImages = new Set([...byKey.values()].filter((a) => a.valueVi && a.method !== 'DICTIONARY_UNVERIFIED').map((a) => a.evidence?.imageUrl).filter(Boolean));
  const sheetImages = imageTexts
    .filter((t) => t && t.text)
    .map((t, i) => ({
      index: i,
      url: t.url || null,
      used: usedImages.has(t.url),
      preview: String(t.text).replace(/\s+/g, ' ').slice(0, 90),
      ...(usedImages.has(t.url) ? {} : { reasonVi: 'Không có thông số dùng cho khai báo (quảng cáo, giới thiệu thương hiệu, chính sách shop) — đã gạt khỏi phiếu.' }),
    }));
  // Ảnh đã đọc bằng vision: ghi role, used, preview = chữ AI nhìn thấy (ảnh trùng URL với OCR thì bổ sung vào mục đó).
  for (const vi of vision?.images || []) {
    const seen = (vision.seenText || []).join(' ').slice(0, 200);
    const ok = vi.fetched && !vision.llmError;
    const prev = sheetImages.find((x) => x.url === vi.url) || (sheetImages.push({ index: sheetImages.length, url: vi.url, used: false, preview: '' }), sheetImages[sheetImages.length - 1]);
    prev.role = vi.role;
    prev.vision = ok;
    if (ok) { prev.used = true; prev.preview = seen || prev.preview; delete prev.reasonVi; }
    else if (!prev.used) prev.reasonVi = vi.fetched ? 'AI đọc ảnh lỗi — chỉ dùng chữ OCR (nếu có).' : 'Không tải được ảnh (host không được phép / quá 3 MB / timeout).';
  }

  const missing = fields.filter((f) => f.required && f.status !== 'HAVE')
    .map((f) => ({ key: f.key, labelVi: f.labelVi, status: f.status, questionVi: f.questionVi, questionZh: f.questionZh }));

  // Nhãn hiệu + SHTT: kiểm danh sách nhãn được bảo hộ (TT 13/2015 & 13/2020) và chữ gợi hàng nhái.
  const brandField = fields.find((f) => f.key === 'brand');
  const origin = body.origin || 'CN';
  // Đối chiếu watchlist bằng cả chữ Latin lẫn chữ Hán của nhãn (nhãn Hán thuần hiện chưa khớp được — normalizeMark bỏ CJK).
  const brandForWatch = [...new Set([brandField?.valueVi, brandField?.valueZh].filter(Boolean))].join(' ') || null;
  const tmRisk = checkTrademarkRisk({ brand: brandForWatch, text: [body.titleVi, titleZh].filter(Boolean).join(' '), hsCode: hs || undefined, origin });
  const signals = counterfeitSignals(titleZh);
  const trademark = {
    brand: brandField?.valueVi || null,
    brandZh: brandField?.valueZh || null,
    brandHanOnly: Boolean(brandField?.valueVi && CJK.test(brandField.valueVi)),
    brandStatus: brandField?.valueVi ? (/kh[oô]ng (c[oó] )?(nh[aã]n|hi[eệ]u)|no ?brand|无品牌|^(other|others|none|n\/a)$/i.test(brandField.valueVi.trim()) ? 'NO_BRAND' : 'BRANDED') : 'UNKNOWN',
    risk: tmRisk.matched ? tmRisk : null,
    riskLevel: tmRisk.matched ? tmRisk.riskLevel : (signals.length ? 'MEDIUM' : 'NONE'),
    counterfeitSignals: signals,
    noteVi: 'Đối chiếu danh sách nhãn hiệu đang theo dõi của hs-code-api — danh sách còn hạn chế; nhãn không có trong danh sách KHÔNG có nghĩa là không được bảo hộ.',
  };

  const sheet = {
    sheetVersion: SHEET_VERSION,
    hsCode: hs,
    heading,
    fields,
    extras,
    missing,
    images: sheetImages,
    ...(skuSelected.length ? { skuSelected } : {}),
    ...(packaging ? { packaging: { ...packaging, source: 'SITE', evidence: PACKAGING_EVIDENCE, noteVi: PACKAGING_NOTE } } : {}),
    trademark,
    extraction: {
      llmUsed: extracted.llmUsed, engine: extracted.engine || null, cached: extracted.cached, repairKeys: repair ? weak : [],
      ...(extracted.llmError ? { llmError: extracted.llmError } : {}),
      vision: vision
        ? { used: Boolean(vision.facts?.length || vision.seenText?.length), engine: vision.engine || null, images: (vision.images || []).length, facts: (vision.facts || []).length, ...(vision.llmError ? { llmError: vision.llmError } : {}) }
        : { used: false, reason: !images.length ? 'NO_IMAGES' : 'DISABLED' },
    },
    generatedAt: new Date().toISOString(),
  };

  if (!hs) {
    return { status: 200, json: rawDigits.length >= 4 && rawDigits.length < 8
      ? { ...sheet, headingOnly: rawDigits.slice(0, 6), warningsVi: [`Mã ${rawDigits} chưa đủ 8 số — chỉ lập khung ô theo nhóm, chưa viết mô tả / tra chính sách.`] }
      : sheet };
  }

  const record = getTaxRecord(normalizeHs(hs));
  if (!record) return { status: 200, json: { ...sheet, description: null, policy: null, warningsVi: [`Không có mã ${hs} trong biểu thuế — chưa viết được mô tả.`] } };

  const mapped = mapTaxRecord(record);
  const attrs = [...fields.filter((f) => f.status === 'HAVE'), ...extras]
    .filter((f) => !PACKAGE_KEYS.has(f.key) && !f.packaging) // kiện đóng gói không mô tả hàng
    .filter((f) => !coveredByMaterial(fields.find((x) => x.key === 'material' && x.status === 'HAVE'))(f))
    .map((f) => ({ key: f.key, valueVi: f.valueVi }));
  // Thông số trang ĐÃ DỊCH (bên gọi gửi, vd specsVi của ERP) — cho AI thấy chi tiết phụ
  // (IP54, "kèm âm ly", 50×70mm) mà phiếu không có ô riêng. Bỏ dòng còn chữ Hán.
  const specsViText = (Array.isArray(body.specsVi) ? body.specsVi : [])
    .map((x) => (x && x.key && x.value ? `${x.key}: ${x.value}` : null))
    .filter((x) => x && !CJK.test(x))
    .slice(0, 15)
    .join('; ');
  const productName = String(body.titleVi || '').trim() || titleZh;
  const desc = await describeProduct({
    hsCode: hs,
    productName,
    attributes: attrs,
    technicalSpec: specsViText || null,
    origin: body.origin || 'Trung Quốc',
    condition: body.condition || 'Mới 100%',
  });
  const d = desc.status === 200 ? desc.json : null;
  const ctx = { productName: CJK.test(productName) ? (mapped.nameVi || '').replace(/^[-\s]+/, '') : productName, origin: 'Trung Quốc', condition: body.condition || 'Mới 100%' };
  const { declaration: sheetDecl, composed, requiredDropped, omittedHan } = composeFromSheet(fields, extras, d?.declaration, trademark, ctx);
  const nameFallback = !(d?.declaration?.tenHang && !CJK.test(d.declaration.tenHang));

  // Nhu cầu từ hàng thật (CEO 05/10/2026): ghi chỗ hổng tri thức của món này — không định danh.
  // Bỏ khi AI rút thông số lỗi (mọi ô thành MISSING giả); mỗi món chỉ đếm 1 lần/ngày (ERP lập lại
  // phiếu cùng món nhiều lần → không thổi phồng mức ưu tiên). Dấu vân tay chỉ giữ trong bộ nhớ.
  if (!extracted.llmError && firstTimeToday(`${titleZh}|${hs}`)) {
    recordSignals(signalsFromSheet({ sheet, mapped, specsZh }));
  }

  return {
    status: 200,
    json: {
      ...sheet,
      description: {
        customsDescription: composed.text,
        composedFrom: 'SHEET',
        declaration: sheetDecl,
        descriptionMeta: { length: composed.length, maxLength: composed.maxLength, truncated: composed.truncated, dropped: composed.dropped, requiredDropped, ...(omittedHan.length ? { omittedHan } : {}), ...(composed.truncated ? { fullText: composed.fullText } : {}) },
        aiDescription: d?.customsDescription || null,
        compliance: d?.compliance || null,
        degraded: !d || d.degraded === true || nameFallback,
        llmModel: d?.llmModel || null,
      },
      policy: {
        nameVi: mapped.nameVi,
        policyLevel: mapped.policyLevel,
        hasActionablePolicy: mapped.hasActionablePolicy,
        policyLines: mapped.policyLines,
      },
    },
  };
}

module.exports = { buildDeclarationSheet, sheetFieldDefs, counterfeitSignals, COMMON_FIELDS, composeFromSheet, clipSpec, normalizeSkuSelected, normalizePackaging, filterDescriptionLines, normalizeImages, visionEnabled, PACKAGE_KEYS };
