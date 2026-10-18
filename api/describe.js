const { requireAuth, serviceCaller } = require('../lib/auth');
const { withUsage } = require('../lib/usage-context');
const { withPrivateData } = require('../lib/llm-privacy');
const { requireAuthOrPublicLlm } = require('../lib/public-llm');
const { setCors, handleOptions } = require('../lib/cors');
const { describeProduct } = require('../lib/describe-core');
const { buildDeclarationSheet } = require('../lib/declaration-sheet');
const { validateDisputeInput, soanHoSoGiaiTrinh } = require('../lib/dispute-draft');
const { validateInput: validateSourcingInput, runSourcingAssist } = require('../lib/mkt-sourcing');
const { acquireServiceSlot } = require('../lib/service-rate-limit');

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Chế độ phụ ?mode=sheet (/api/declaration-sheet) và ?mode=dispute (/api/dispute-draft, #339) KHÔNG nằm trong
  // 4 endpoint mở công khai → Bearer-only (khoá dịch vụ / HS_API_TOKEN), không đi requireAuthOrPublicLlm.
  const mode = String(req.query?.mode || '');
  // POST /api/mkt/sourcing-assist (rewrite → ?mode=sourcing): trợ lý Tìm nguồn của oz-mkt. KÍN — CHỈ khoá dịch vụ,
  // không qua requireAuthOrPublicLlm, không nhận HS_API_TOKEN. Rẽ nhánh TRƯỚC mọi cổng công khai.
  if (mode === 'sourcing') return sourcingAssist(req, res);
  if ((mode === 'sheet' || mode === 'dispute') ? requireAuth(req, res) : requireAuthOrPublicLlm(req, res)) return;

  if (mode === 'dispute') return disputeDraft(req, res);

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  // POST /api/declaration-sheet (rewrite → ?mode=sheet): phiếu hồ sơ khai báo — gộp vào
  // function này theo pattern routes.json.
  if (String(req.query?.mode || '') === 'sheet') {
    try {
      const out = await buildDeclarationSheet(body || {});
      return res.status(out.status).json(out.json);
    } catch (e) {
      return res.status(502).json({ error: 'Declaration sheet failed', detail: String(e.message).slice(0, 240) });
    }
  }

  // Khoá dịch vụ có tên nhận thêm `usage` để tính phí; công khai / HS_API_TOKEN thì không (shape không đổi).
  if (serviceCaller(req) !== null) {
    // Dữ liệu khách (#237 J1): LLM bên trong chỉ đi nhà cung cấp hợp lệ, không qua tầng miễn phí.
    const { result: out, usage } = await withPrivateData(() => withUsage(() => describeProduct(body)));
    const json = out.json && typeof out.json === 'object' && !Array.isArray(out.json) ? { ...out.json, usage } : out.json;
    return res.status(out.status).json(json);
  }
  const out = await describeProduct(body);
  return res.status(out.status).json(out.json);
};

/**
 * POST /api/dispute-draft (rewrite → ?mode=dispute): hồ sơ giải trình tranh chấp mã HS (#339, job H3).
 * Lệnh LLM KÍN. Mọi lượt chạy trong withPrivateData BẤT KỂ ai gọi (dữ liệu vụ việc luôn là dữ liệu khách — spec 6.3);
 * khoá dịch vụ có tên nhận thêm `usage`. Không ghi mẫu (X-OZ-Chia-Se mặc định 0, #261): lib/dispute-draft.js không ghi gì.
 */
async function disputeDraft(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'DAU_VAO_SAI', chiTiet: ['Body không phải JSON hợp lệ.'] }); }
  }
  const v = validateDisputeInput(body);
  if (!v.ok) return res.status(400).json({ error: v.error, chiTiet: v.loi });
  const caller = serviceCaller(req);
  try {
    const { result: out, usage } = await withPrivateData(() => withUsage(() => soanHoSoGiaiTrinh(v.data)));
    return res.status(out.status).json(caller ? { ...out.json, usage } : out.json);
  } catch (e) {
    return res.status(500).json({ error: 'dispute draft failed', detail: String(e?.message || e).slice(0, 240), ...(caller && Array.isArray(e?.usage) ? { usage: e.usage } : {}) });
  }
}

/**
 * POST /api/mkt/sourcing-assist (rewrite → ?mode=sourcing): clarify | brief | score cho trang Tìm nguồn (oz-mkt PR #9).
 * Chỉ khoá dịch vụ (HS_SERVICE_TOKENS): không token/sai → 401, HS_API_TOKEN (không phải khoá dịch vụ) → 403.
 * Mọi lượt LLM trong withPrivateData; hết nhà cung cấp hợp lệ → 502 NO_PRIVATE_LLM. Không log nội dung khách,
 * lỗi không vọng lại nguyên văn đầu vào/đầu ra LLM. Tắt khẩn cấp: HS_MKT_SOURCING=false → 503.
 */
async function sourcingAssist(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (requireAuth(req, res)) return;
  const caller = serviceCaller(req);
  if (!caller) return res.status(403).json({ error: 'CHI_KHOA_DICH_VU', chiTiet: ['Endpoint chỉ nhận khoá dịch vụ (HS_SERVICE_TOKENS).'] });
  if (String(process.env.HS_MKT_SOURCING || '').toLowerCase() === 'false') {
    return res.status(503).json({ error: 'TAM_TAT', chiTiet: ['sourcing-assist đang tắt (HS_MKT_SOURCING=false).'] });
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'DAU_VAO_SAI', chiTiet: ['Body không phải JSON hợp lệ.'] }); }
  }
  const v = validateSourcingInput(body);
  if (!v.ok) return res.status(400).json({ error: 'DAU_VAO_SAI', chiTiet: v.loi });
  const slot = acquireServiceSlot('mkt-sourcing', caller, { envPrefix: 'HS_MKT_SOURCING', perMinute: 120, maxConcurrent: 6 });
  if (!slot.ok) {
    res.setHeader('Retry-After', String(slot.retryAfter));
    return res.status(429).json({ error: 'VUOT_HAN_MUC', chiTiet: [slot.lyDo], retryAfter: slot.retryAfter });
  }
  try {
    const { result: out, usage } = await withPrivateData(() => withUsage(() => runSourcingAssist(v.task, v.data)));
    return res.status(200).json({ result: out.result, usage });
  } catch (e) {
    const code = ['NO_PRIVATE_LLM', 'LLM_LOI', 'LLM_KET_QUA_SAI'].includes(e?.code) ? e.code : 'LLM_LOI';
    const chiTiet = code === 'LLM_KET_QUA_SAI' ? [String(e.message).slice(0, 200)]
      : code === 'NO_PRIVATE_LLM' ? ['Không có nhà cung cấp LLM riêng tư hợp lệ.'] : ['Gọi LLM thất bại.'];
    return res.status(502).json({ error: code, chiTiet });
  } finally {
    slot.release();
  }
}
