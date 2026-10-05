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

const { extractSpecs } = require('./extract-specs');
const { dictionary } = require('./zh-specs');
const { declarationFields, toLookupHs } = require('./declaration-fields');
const { describeProduct } = require('./describe-core');
const { getTaxRecord, normalizeHs } = require('./data');
const { mapTaxRecord } = require('./tax-mapper');
const { checkTrademarkRisk } = require('./trademark-watch');
const { composeWithMeta } = require('./describe-compose');

const CJK = /[㐀-鿿]/;
const SHEET_VERSION = 1;

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
    .filter((s) => !CJK.test(s.valueVi));
}

/** Biến thể khách đã chọn ("Phân loại: 一开多功能八孔") → dòng thông số để AI đọc cùng. */
function variantSpecs(variant) {
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
const fold = (x) => String(x || '').toLowerCase().replace(/\s+/g, '');

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
  const specFields = [
    ...fields.filter((f) => f.status === 'HAVE' && f.required && !OWN_SLOT.has(f.key)),
    ...fields.filter((f) => f.status === 'HAVE' && !f.required && !OWN_SLOT.has(f.key)),
  ];
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
    tenHang: decl?.tenHang || ctx.productName,
    nhanHieu: trademark.brandStatus === 'NO_BRAND' ? 'không nhãn hiệu' : (brand?.valueVi || null),
    model: have('modelNumber')?.valueVi || null,
    // Chất liệu CHỈ lấy từ ô có bằng chứng — AI viết mô tả hay tự đoán ("nhựa").
    thanhPhanCauTao: have('material')?.valueVi || null,
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
  const requiredCount = fields.filter((f) => f.status === 'HAVE' && f.required && !OWN_SLOT.has(f.key)).length;
  const fits = () => !composeWithMeta(declaration).truncated;
  if (!fits()) declaration.congDung = null;
  while (!fits() && declaration.thongSoKyThuat.length > requiredCount) declaration.thongSoKyThuat.pop();
  if (!fits()) declaration.model = null;
  if (!fits()) {
    const words = String(declaration.tenHang).split(/\s+/);
    while (!fits() && words.length > 3) {
      words.pop();
      declaration.tenHang = words.join(' ');
    }
  }
  return { declaration, composed: composeWithMeta(declaration) };
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
 *         hsCode?, supplements?:[{key, valueVi, source}], known?:[{key, valueVi, source, evidence}],
 *         origin?, condition? }
 *  - supplements: khách/NV/chứng từ bổ sung (bên gọi lưu, gửi lại mỗi lần) — thắng dữ liệu trang.
 *  - known: ô đã rút ở lần lập phiếu trước (cùng món) — không rút lại, đỡ một lượt AI.
 */
async function buildDeclarationSheet(body = {}, opts = {}) {
  const titleZh = String(body.titleZh || '').trim();
  const specsZh = [...(Array.isArray(body.specsZh) ? body.specsZh : []), ...variantSpecs(body.variant)];
  const imageTexts = Array.isArray(body.imageTexts) ? body.imageTexts : [];
  if (!titleZh && !specsZh.length && !imageTexts.length) {
    return { status: 400, json: { error: 'Cần ít nhất một trong: titleZh, specsZh, imageTexts[{url,text}]' } };
  }

  const rawHs = body.hsCode || body.hs;
  const hs = rawHs ? toLookupHs(rawHs) : null;
  const { defs, heading } = sheetFieldDefs(hs);

  const supplements = normalizeSupplements(body.supplements);
  const known = (Array.isArray(body.known) ? body.known : [])
    .filter((k) => k && k.key && k.valueVi && !CJK.test(String(k.valueVi)));
  const preset = new Map();
  for (const k of known) preset.set(k.key, { valueVi: String(k.valueVi), source: k.source || 'SITE', evidence: k.evidence || null, method: k.method || 'KNOWN', confidence: k.confidence ?? 0.8 });
  for (const s of supplements) preset.set(s.key, { valueVi: s.valueVi, source: s.source, evidence: null, method: 'SUPPLEMENT', confidence: 1 });

  const allowed = new Set(Object.keys(dictionary().keys || {}));
  const needKeys = defs.map((d) => d.key).filter((k) => allowed.has(k) && !preset.has(k));
  const llmOpts = { maxTokens: 8000, timeoutMs: 120000, temperature: 0, ...opts };
  const extracted = await extractSpecs(
    { titleZh, specsZh, imageTexts, needKeys, skipKeys: [...preset.keys()].filter((k) => allowed.has(k)), verifyImageHits: true },
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
      { titleZh, specsZh, imageTexts, needKeys: weak, skipKeys: [...firstGood, ...[...preset.keys()].filter((k) => allowed.has(k))], verifyImageHits: true },
      llmOpts,
    );
  }

  const byKey = new Map();
  for (const a of [...(extracted.attributes || []), ...(repair?.attributes || [])]) {
    const prev = byKey.get(a.key);
    // Cùng khóa nhiều nguồn: giữ bản đã dịch được, tin cậy cao hơn.
    if (!prev || (!prev.valueVi && a.valueVi) || (a.valueVi && (a.confidence || 0) > (prev.confidence || 0))) byKey.set(a.key, a);
  }

  const toEvidence = (a) => (a?.evidence ? { source: a.evidence.source, imageUrl: a.evidence.imageUrl || null, text: a.evidence.text } : null);
  const fields = defs.map((d) => {
    const p = preset.get(d.key);
    const a = byKey.get(d.key);
    let valueVi = null; let valueZh = null; let source = null; let evidence = null; let method = null; let confidence = null;
    if (p) {
      ({ valueVi, source, evidence, method, confidence } = p);
    } else if (a) {
      valueVi = a.valueVi || null;
      valueZh = CJK.test(String(a.value || '')) ? a.value : null;
      source = a.evidence?.source === 'IMAGE_OCR' ? 'IMAGE_OCR' : 'SITE';
      evidence = toEvidence(a);
      method = a.method; confidence = a.confidence;
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
      ...(status === 'HAVE' ? {} : questionsFor(d.key, d.labelVi, status === 'UNVERIFIED' ? valueVi : null)),
    };
  });

  const fieldKeys = new Set(fields.map((f) => f.key));
  // Thông số khác rút được (không thuộc ô bắt buộc) — vẫn dùng cho mô tả + tra mã.
  const extras = [...byKey.values()]
    .filter((a) => !fieldKeys.has(a.key) && a.valueVi && a.method !== 'DICTIONARY_UNVERIFIED')
    .map((a) => ({ key: a.key, labelVi: a.labelVi, valueVi: a.valueVi, source: a.evidence?.source === 'IMAGE_OCR' ? 'IMAGE_OCR' : 'SITE', evidence: toEvidence(a) }));
  for (const s of supplements) {
    if (!fieldKeys.has(s.key) && !extras.some((e) => e.key === s.key)) extras.push({ key: s.key, labelVi: dictionary().keys?.[s.key]?.labelVi || s.key, valueVi: s.valueVi, source: s.source, evidence: null });
  }

  // Ảnh không đóng góp thông số nào = ảnh quảng cáo / giới thiệu thương hiệu / chính sách shop.
  const usedImages = new Set([...byKey.values()].filter((a) => a.valueVi && a.method !== 'DICTIONARY_UNVERIFIED').map((a) => a.evidence?.imageUrl).filter(Boolean));
  const images = imageTexts
    .filter((t) => t && t.text)
    .map((t, i) => ({
      index: i,
      url: t.url || null,
      used: usedImages.has(t.url),
      preview: String(t.text).replace(/\s+/g, ' ').slice(0, 90),
      ...(usedImages.has(t.url) ? {} : { reasonVi: 'Không có thông số dùng cho khai báo (quảng cáo, giới thiệu thương hiệu, chính sách shop) — đã gạt khỏi phiếu.' }),
    }));

  const missing = fields.filter((f) => f.required && f.status !== 'HAVE')
    .map((f) => ({ key: f.key, labelVi: f.labelVi, status: f.status, questionVi: f.questionVi, questionZh: f.questionZh }));

  // Nhãn hiệu + SHTT: kiểm danh sách nhãn được bảo hộ (TT 13/2015 & 13/2020) và chữ gợi hàng nhái.
  const brandField = fields.find((f) => f.key === 'brand');
  const origin = body.origin || 'CN';
  const tmRisk = checkTrademarkRisk({ brand: brandField?.valueVi || null, text: [body.titleVi, titleZh].filter(Boolean).join(' '), hsCode: hs || undefined, origin });
  const signals = counterfeitSignals(titleZh);
  const trademark = {
    brand: brandField?.valueVi || null,
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
    images,
    trademark,
    extraction: { llmUsed: extracted.llmUsed, engine: extracted.engine || null, cached: extracted.cached, repairKeys: repair ? weak : [], ...(extracted.llmError ? { llmError: extracted.llmError } : {}) },
    generatedAt: new Date().toISOString(),
  };

  if (!hs) return { status: 200, json: sheet };

  const record = getTaxRecord(normalizeHs(hs));
  if (!record) return { status: 200, json: { ...sheet, description: null, policy: null, warningsVi: [`Không có mã ${hs} trong biểu thuế — chưa viết được mô tả.`] } };

  const mapped = mapTaxRecord(record);
  const attrs = [...fields.filter((f) => f.status === 'HAVE'), ...extras].map((f) => ({ key: f.key, valueVi: f.valueVi }));
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
  const { declaration: sheetDecl, composed } = composeFromSheet(fields, extras, d?.declaration, trademark, ctx);

  return {
    status: 200,
    json: {
      ...sheet,
      description: {
        customsDescription: composed.text,
        composedFrom: 'SHEET',
        declaration: sheetDecl,
        descriptionMeta: { length: composed.length, maxLength: composed.maxLength, truncated: composed.truncated, dropped: composed.dropped, ...(composed.truncated ? { fullText: composed.fullText } : {}) },
        aiDescription: d?.customsDescription || null,
        compliance: d?.compliance || null,
        degraded: !d || d.degraded === true,
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

module.exports = { buildDeclarationSheet, sheetFieldDefs, counterfeitSignals, COMMON_FIELDS };
