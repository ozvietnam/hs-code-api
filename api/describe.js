const { requireAuth, serviceCaller } = require('../lib/auth');
const { withUsage } = require('../lib/usage-context');
const { withPrivateData } = require('../lib/llm-privacy');
const { requireAuthOrPublicLlm } = require('../lib/public-llm');
const { setCors, handleOptions } = require('../lib/cors');
const { describeProduct } = require('../lib/describe-core');
const { buildDeclarationSheet } = require('../lib/declaration-sheet');
const { validateDisputeInput, soanHoSoGiaiTrinh } = require('../lib/dispute-draft');

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Chế độ phụ ?mode=sheet (/api/declaration-sheet) và ?mode=dispute (/api/dispute-draft, #339) KHÔNG nằm trong
  // 4 endpoint mở công khai → Bearer-only (khoá dịch vụ / HS_API_TOKEN), không đi requireAuthOrPublicLlm.
  const mode = String(req.query?.mode || '');
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
