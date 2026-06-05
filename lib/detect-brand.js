/**
 * detect-brand.js — Image-based brand detection using Gemini Vision.
 *
 * Reads logos, printed text, and packaging in product images to identify
 * the brand (nhãn hiệu) — a required customs field per TT 39/2018.
 *
 * Called from api/suggest.js when req.query.mode === 'detect-brand'.
 */

const { geminiGenerateJsonWithImages } = require('./gemini');

// Load brand names from glossary as context hints for the prompt
let _brandNames = null;
function getBrandNames() {
  if (_brandNames !== null) return _brandNames;
  try {
    const glossaryData = require('../data/glossary-xnk.json');
    const entries = glossaryData.entries || {};
    _brandNames = Object.entries(entries)
      .filter(([, v]) => v.category === 'brand')
      .map(([k]) => k)
      .slice(0, 80); // cap to keep prompt size reasonable
  } catch {
    _brandNames = [];
  }
  return _brandNames;
}

const SYSTEM_PROMPT = `Bạn là chuyên gia nhận diện thương hiệu/logo sản phẩm để khai báo hải quan.
Đọc logo, chữ in trên sản phẩm/bao bì trong ảnh và xác định thương hiệu (nhãn hiệu) chính xác.
Ưu tiên văn bản/logo được in nổi bật nhất trên sản phẩm hoặc bao bì gốc.
Chỉ trả về JSON đúng schema yêu cầu. Không thêm bất kỳ văn bản nào ngoài JSON.`;

/**
 * Build the user text prompt, injecting context hints when available.
 */
function buildPrompt({ productName, hint, brandNames }) {
  const knownBrandsNote = brandNames.length
    ? `\n\nMột số thương hiệu thường gặp trong nhập khẩu VN (chỉ tham khảo, không bắt buộc): ${brandNames.join(', ')}.`
    : '';

  const contextNote = [
    productName ? `Tên sản phẩm (context): ${productName}` : null,
    hint ? `Gợi ý thêm: ${hint}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `${contextNote ? contextNote + '\n\n' : ''}Hãy phân tích ảnh sản phẩm và trả về JSON với schema sau (không có text ngoài JSON):
{
  "brand": "<tên thương hiệu viết đúng hoa thường, ví dụ Apple, Samsung, Nike> | null nếu không xác định được",
  "confidence": <số nguyên 0-100>,
  "detectedText": ["<text/logo đọc được từ ảnh>", ...],
  "model": "<model/mã sản phẩm nhìn thấy trên ảnh, ví dụ A2848> | null",
  "alternatives": [{"brand": "<tên>", "confidence": <0-100>}],
  "reasoning": "<giải thích ngắn gọn bằng tiếng Việt tại sao xác định thương hiệu này>"
}${knownBrandsNote}`;
}

/**
 * Validate and sanitize the JSON returned by Gemini.
 * Returns a contract-shape object or throws an error.
 */
function parseAndValidate(raw) {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Gemini vision did not return an object');
  }

  const brand = typeof raw.brand === 'string' && raw.brand.trim() ? raw.brand.trim() : null;
  const rawConf = Number(raw.confidence);
  const confidence = Number.isFinite(rawConf) ? Math.min(100, Math.max(0, Math.round(rawConf))) : 0;

  const detectedText = Array.isArray(raw.detectedText)
    ? raw.detectedText.filter((t) => typeof t === 'string').slice(0, 20)
    : [];

  const model = typeof raw.model === 'string' && raw.model.trim() ? raw.model.trim() : null;

  const alternatives = Array.isArray(raw.alternatives)
    ? raw.alternatives
        .filter((a) => a && typeof a.brand === 'string')
        .map((a) => ({
          brand: String(a.brand).trim(),
          confidence: Math.min(100, Math.max(0, Math.round(Number(a.confidence) || 0))),
        }))
        .slice(0, 5)
    : [];

  const reasoning = typeof raw.reasoning === 'string' ? raw.reasoning.slice(0, 500) : '';

  return { brand, confidence, detectedText, model, alternatives, reasoning };
}

/**
 * Main export: detect brand from image URLs.
 *
 * @param {Object} params
 * @param {string[]} params.imageUrls   - 1..5 image URLs
 * @param {string}   [params.productName]
 * @param {string}   [params.hint]
 * @returns {Promise<Object>}  - contract-shape response object
 */
async function detectBrand({ imageUrls, productName, hint }) {
  const started = Date.now();
  const brandNames = getBrandNames();
  const textPrompt = buildPrompt({ productName, hint, brandNames });

  try {
    const { json, model, ms, imagesUsed } = await geminiGenerateJsonWithImages({
      systemPrompt: SYSTEM_PROMPT,
      textPrompt,
      imageUrls,
      modelEnv: 'GEMINI_VISION_MODEL',
      defaultModel: 'models/gemini-2.5-flash',
    });

    const validated = parseAndValidate(json);
    return {
      ...validated,
      llmModel: model,
      imagesUsed: imagesUsed ?? imageUrls.length,
      ms: ms ?? Date.now() - started,
    };
  } catch (err) {
    // Graceful degradation: never 500, ERP handles null brand
    const isConfig = err.code === 'GEMINI_NOT_CONFIGURED';
    return {
      brand: null,
      confidence: 0,
      detectedText: [],
      model: null,
      alternatives: [],
      reasoning: isConfig
        ? 'Gemini chưa được cấu hình (GEMINI_API_KEY missing).'
        : `Không thể phân tích ảnh: ${err.message.slice(0, 200)}`,
      llmModel: null,
      imagesUsed: 0,
      ms: Date.now() - started,
      _error: err.code || 'UNKNOWN',
    };
  }
}

module.exports = { detectBrand };
