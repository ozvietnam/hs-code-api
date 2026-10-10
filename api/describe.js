const { requireAuth, serviceCaller } = require('../lib/auth');
const { withUsage } = require('../lib/usage-context');
const { requireAuthOrPublicLlm } = require('../lib/public-llm');
const { setCors, handleOptions } = require('../lib/cors');
const { describeProduct } = require('../lib/describe-core');
const { buildDeclarationSheet } = require('../lib/declaration-sheet');

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Chế độ phụ ?mode=sheet (/api/declaration-sheet) KHÔNG nằm trong 4 endpoint mở công khai → vẫn Bearer-only.
  const sheetMode = String(req.query?.mode || '') === 'sheet';
  if (sheetMode ? requireAuth(req, res) : requireAuthOrPublicLlm(req, res)) return;

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
    const { result: out, usage } = await withUsage(() => describeProduct(body));
    const json = out.json && typeof out.json === 'object' && !Array.isArray(out.json) ? { ...out.json, usage } : out.json;
    return res.status(out.status).json(json);
  }
  const out = await describeProduct(body);
  return res.status(out.status).json(out.json);
};
