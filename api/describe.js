const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { describeProduct } = require('../lib/describe-core');
const { buildDeclarationSheet } = require('../lib/declaration-sheet');

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (requireAuth(req, res)) return;

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  // POST /api/declaration-sheet (rewrite → ?mode=sheet): phiếu hồ sơ khai báo — gộp vào
  // function này theo pattern vercel.json.
  if (String(req.query?.mode || '') === 'sheet') {
    try {
      const out = await buildDeclarationSheet(body || {});
      return res.status(out.status).json(out.json);
    } catch (e) {
      return res.status(502).json({ error: 'Declaration sheet failed', detail: String(e.message).slice(0, 240) });
    }
  }

  const out = await describeProduct(body);
  return res.status(out.status).json(out.json);
};
