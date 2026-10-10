// POST /api/classify — áp mã HS theo phương pháp hs-code-vn (Pha 2).
// Body: { tenHang|name, chatLieu|material, congDung|purpose, chucNang?, nameZh?, specs?, facts?, supplierHs?{code,source,url} }
//   (đến từ OrderItem ERP: name, customerDescription→congDung, nameZh, ...)
// Trả: { results:[{hs, confidence, reason, tbTchq?}], girRulesApplied:[], missing:[], candidates, ms }

const { requireAuth, serviceCaller } = require('../lib/auth');
const { withUsage } = require('../lib/usage-context');
const { requireAuthOrPublicLlm } = require('../lib/public-llm');
const { setCors, handleOptions } = require('../lib/cors');
const { classify } = require('../lib/classify');
const { extractSpecs } = require('../lib/extract-specs');

/** `supplierHs`: {code, source?, url?} hoặc chuỗi mã. Trả null khi không đủ 6 chữ số. */
function parseSupplierHs(v) {
  if (!v) return null;
  const o = typeof v === 'object' ? v : { code: v };
  const code = String(o.code || '').replace(/\D/g, '').slice(0, 10);
  if (code.length < 6) return null;
  const url = String(o.url || '').trim().slice(0, 300);
  return { code, source: String(o.source || '').trim().slice(0, 40) || null, url: /^https?:\/\//i.test(url) ? url : null };
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed — dùng POST' });
  }
  // Chế độ phụ ?mode=extract_specs (/api/extract-specs) KHÔNG nằm trong 4 endpoint mở công khai → vẫn Bearer-only.
  const extractMode = String(req.query?.mode || '') === 'extract_specs';
  if (extractMode ? requireAuth(req, res) : requireAuthOrPublicLlm(req, res)) return;

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON body' }); }
  }

  // POST /api/extract-specs (rewrite → ?mode=extract_specs): rút thông số chuẩn từ chữ
  // tiếng Trung + chữ OCR ozsource gửi sang. Gộp vào function này theo pattern routes.json.
  if (String(req.query?.mode || '') === 'extract_specs') {
    const hasText = body && (body.titleZh || (Array.isArray(body.specsZh) ? body.specsZh.length : body.specsZh) || (Array.isArray(body.imageTexts) && body.imageTexts.length));
    if (!hasText) {
      return res.status(400).json({ error: 'Cần ít nhất một trong: titleZh, specsZh, imageTexts[{url,text}]' });
    }
    try {
      const started = Date.now();
      const result = await extractSpecs(body);
      return res.status(200).json({ ...result, ms: Date.now() - started });
    } catch (e) {
      return res.status(502).json({ error: 'Extract specs failed', detail: String(e.message).slice(0, 240) });
    }
  }

  const attrs = {
    // structured attrs tuỳ chọn từ ERP (vd { voltage:"220V", gsm:"80" }) — registry sẽ honor.
    // 6 field VN chuẩn dưới đây luôn thắng để giữ shape ổn định.
    ...(body?.attributes && typeof body.attributes === 'object' && !Array.isArray(body.attributes) ? body.attributes : {}),
    tenHang: (body?.tenHang || body?.name || body?.productName || '').trim(),
    chatLieu: body?.chatLieu || body?.material || null,
    congDung: body?.congDung || body?.purpose || body?.customerDescription || null,
    chucNang: body?.chucNang || null,
    nameZh: body?.nameZh || null,
    specs: body?.specs || body?.technicalSpec || null,
    // Dữ kiện có bằng chứng từ phiếu hồ sơ khai báo [{key,labelVi,valueVi,evidence}] — nguồn căn cứ.
    facts: Array.isArray(body?.facts) ? body.facts.slice(0, 30) : [],
    // Mã HS nhà cung cấp tự khai trên trang sản phẩm (made-in-china, 09/10/2026): mã TQ 8–10 số, chỉ 6 số đầu
    // theo HS quốc tế → MỘT nguồn kiểm chứng ở cấp nhóm, không phải đáp án. Phòng thủ: chỉ chữ số, ≥ 6.
    supplierHs: parseSupplierHs(body?.supplierHs),
  };

  // Resolver attrs: canonical + aliasVi từ attributes.json
  try {
    const REG = require('../data/attributes.json').attributes || {};
    for (const [canon, def] of Object.entries(REG)) {
      const v = body?.[canon] ?? (def.aliasVi ? body?.[def.aliasVi] : undefined);
      if (v != null && String(v).trim() !== '') attrs[canon] = String(v).trim();
    }
  } catch { /* registry optional at runtime */ }
  if (!attrs.tenHang || attrs.tenHang.length < 2) {
    return res.status(400).json({ error: 'tenHang (tên hàng) bắt buộc, tối thiểu 2 ký tự' });
  }

  // tier: "auto" của NV (body.auto=true hoặc tier="premium") → Gemini trả phí (nhanh+chính xác); mặc định MiniMax $0
  const tier = (body?.tier === 'premium' || body?.auto === true) ? 'premium' : 'standard';

  try {
    const started = Date.now();
    // Khoá dịch vụ có tên (Cổng ozplugin…) nhận thêm `usage` để tính phí; công khai / HS_API_TOKEN thì không.
    if (serviceCaller(req) !== null) {
      const { result, usage } = await withUsage(() => classify(attrs, { tier }));
      return res.status(200).json({ ...result, attrs, usage, ms: Date.now() - started });
    }
    const result = await classify(attrs, { tier });
    return res.status(200).json({ ...result, attrs, ms: Date.now() - started });
  } catch (e) {
    return res.status(502).json({ error: 'Classify failed', detail: String(e.message).slice(0, 240) });
  }
};
