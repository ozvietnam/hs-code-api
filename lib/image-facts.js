// lib/image-facts.js — đọc ẢNH SKU / ảnh chính bằng Gemini vision cho phiếu hồ sơ (CEO 09/10/2026).
//
// Vì sao: ảnh SKU khách chọn thể hiện nhiều thông tin cụ thể (chữ trên nhãn, thông số in trên hộp,
// màu/kiểu thật) mà OCR tesseract của addon đọc kém. Chỉ BỔ SUNG ô còn thiếu — nguồn IMAGE_AI,
// tin cậy ≤ 0,8, không bao giờ đè ô đã có từ trang/SKU. Kiểm soát chi phí: ≤ 2 ảnh, MỘT lượt AI,
// tải ≤ 3 MB/ảnh, timeout 8 s, chỉ host ảnh sàn (alicdn / aliexpress-media / taobao).

const { geminiGenerateWithImages } = require('./gemini');

const MAX_IMAGES = 2;
const MAX_BYTES = 3 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const MAX_CONFIDENCE = 0.8;
const CJK = /[㐀-鿿]/;
// Host được tải: ảnh công khai của 1688/Taobao/Tmall/AliExpress. Host lạ → bỏ (không tải URL tuỳ ý).
const ALLOWED_HOST_RE = /(^|\.)(alicdn\.com|aliexpress-media\.com|taobao\.com|tbcdn\.cn|taobaocdn\.com|tmall\.com|1688\.com)$/i;

const SYSTEM = `Bạn đọc ẢNH SẢN PHẨM trên trang 1688/Taobao để bổ sung phiếu hồ sơ khai báo hải quan Việt Nam. Bạn KHÔNG chọn mã HS.
Trả JSON: {"seenText": string[], "facts": [{"key": string, "valueVi": string, "valueZh": string|null, "evidence": string, "confidence": number}]}
Quy tắc:
- seenText: MỌI chữ nhìn thấy trên ảnh (nhãn, model, thông số, chữ in trên hộp/sản phẩm), nguyên văn, mỗi mẩu một phần tử. Không có chữ → [].
- facts: chỉ dùng key trong allowedKeys. valueVi: tiếng Việt kiểu tờ khai, giữ số + đơn vị. valueZh: chữ gốc nếu nhìn thấy chữ Trung.
- evidence: câu chữ nhìn thấy hoặc chi tiết quan sát được ("thấy gọng kim loại màu vàng", "nhãn in 'Model 603'"). Không có bằng chứng nhìn thấy → không trả key đó. Không đoán.
- Thuộc tính quan sát (màu, chất liệu nhìn thấy, kiểu dáng) confidence ≤ 0.6; chữ đọc được rõ (model, thông số in) confidence ≤ 0.8.
- Bỏ qua chữ quảng cáo (giảm giá, miễn phí vận chuyển, cam kết của shop).`;

function hostAllowed(url) {
  try {
    const u = new URL(String(url));
    return (u.protocol === 'https:' || u.protocol === 'http:') && ALLOWED_HOST_RE.test(u.hostname);
  } catch { return false; }
}

/** Chọn ảnh gửi AI: hợp lệ, host sàn, role sku trước rồi main, bỏ trùng URL, tối đa MAX_IMAGES. */
function pickImages(images) {
  const list = (Array.isArray(images) ? images : [])
    .filter((i) => i && typeof i.url === 'string' && hostAllowed(i.url))
    .map((i) => ({ url: i.url.trim().slice(0, 1000), role: i.role === 'sku' ? 'sku' : 'main' }));
  const seen = new Set();
  const uniq = list.filter((i) => (seen.has(i.url) ? false : (seen.add(i.url), true)));
  return [...uniq.filter((i) => i.role === 'sku'), ...uniq.filter((i) => i.role !== 'sku')].slice(0, MAX_IMAGES);
}

/** Tải một ảnh → { mimeType, data(base64) } | null (quá cỡ, không phải ảnh, lỗi mạng → null). */
async function fetchImage(url, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { 'User-Agent': 'hs-code-api/declaration-sheet' } });
    if (!res || !res.ok) return null;
    const type = String(res.headers?.get?.('content-type') || '').split(';')[0].trim().toLowerCase();
    const len = Number(res.headers?.get?.('content-length') || 0);
    if (len > MAX_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > MAX_BYTES) return null;
    // Không tin content-type của CDN hoàn toàn: ảnh .jpg/.png/.webp vẫn nhận khi header lệch.
    const mimeType = /^image\//.test(type) ? type : (/\.png(\?|$)/i.test(url) ? 'image/png' : /\.webp(\?|$)/i.test(url) ? 'image/webp' : 'image/jpeg');
    return { mimeType, data: buf.toString('base64') };
  } catch { return null; }
}

/** Lọc JSON lỏng của AI về đúng khung {seenText[], facts[]} — bỏ key lạ, giá trị rỗng/chữ Hán, kẹp confidence. */
function normalizeReply(json, allowedKeys) {
  const seenText = (Array.isArray(json?.seenText) ? json.seenText : [])
    .filter((t) => typeof t === 'string').map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 60);
  const facts = [];
  for (const f of Array.isArray(json?.facts) ? json.facts : []) {
    const key = String(f?.key || '');
    const valueVi = String(f?.valueVi || '').trim().slice(0, 160);
    const evidence = String(f?.evidence || '').trim().slice(0, 200);
    if (!allowedKeys[key] || !valueVi || CJK.test(valueVi) || !evidence) continue;
    if (facts.some((x) => x.key === key)) continue;
    const c = Number(f?.confidence);
    facts.push({
      key, valueVi,
      valueZh: f?.valueZh && CJK.test(String(f.valueZh)) ? String(f.valueZh).slice(0, 120) : null,
      evidence,
      confidence: Math.min(MAX_CONFIDENCE, Number.isFinite(c) && c > 0 ? c : 0.5),
    });
  }
  return { seenText, facts };
}

/**
 * readImageFacts(images, { hsCode, headingKeys, titleZh, fetchImpl?, generate? })
 *   images: [{ url, role:'sku'|'main' }] · headingKeys: { key: labelVi } (ô của nhóm hàng + ô chung)
 *   → { images:[{url, role, fetched}], seenText:[], facts:[{key,valueVi,valueZh,evidence,confidence,imageUrl}], engine, llmError? }
 * Không ném lỗi: ảnh/AI hỏng → facts [] + llmError, phiếu vẫn lập được.
 */
async function readImageFacts(images, opts = {}) {
  const picked = pickImages(images);
  const out = { images: picked.map((i) => ({ ...i, fetched: false })), seenText: [], facts: [], engine: null };
  if (!picked.length) return out;
  const fetched = await Promise.all(picked.map((i) => fetchImage(i.url, opts.fetchImpl)));
  const payload = [];
  fetched.forEach((img, idx) => { if (img) { out.images[idx].fetched = true; payload.push({ ...img, url: picked[idx].url }); } });
  if (!payload.length) {
    out.llmError = { code: 'IMAGE_FETCH_FAILED', message: 'Không tải được ảnh nào (host/cỡ/timeout)' };
    return out;
  }
  const allowedKeys = Object.fromEntries(Object.entries(opts.headingKeys || {}).map(([k, v]) => [k, String(v || k)]));
  const user = JSON.stringify({
    titleZh: String(opts.titleZh || '').slice(0, 300),
    hsCode: opts.hsCode || null,
    allowedKeys,
    images: payload.map((p, i) => ({ index: i + 1, role: picked.find((x) => x.url === p.url)?.role || 'main' })),
  });
  try {
    const generate = opts.generate || geminiGenerateWithImages;
    const { json, model } = await generate({ systemPrompt: SYSTEM, userPrompt: user, images: payload.map(({ mimeType, data }) => ({ mimeType, data })), timeoutMs: opts.timeoutMs || 45000 });
    const norm = normalizeReply(json, allowedKeys);
    out.seenText = norm.seenText;
    // Bằng chứng theo ảnh đầu (ảnh SKU) — AI không tách được theo ảnh thì ghi ảnh đầu tiên gửi đi.
    out.facts = norm.facts.map((f) => ({ ...f, imageUrl: payload[0].url }));
    out.engine = { provider: 'gemini', model: model || null };
  } catch (e) {
    out.llmError = { code: e.code || 'VISION_FAILED', message: String(e.message || '').slice(0, 200) };
  }
  return out;
}

module.exports = { readImageFacts, pickImages, hostAllowed, normalizeReply, fetchImage, MAX_IMAGES, MAX_BYTES, MAX_CONFIDENCE };
