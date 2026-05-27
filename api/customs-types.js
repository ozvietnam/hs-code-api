const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { listTypes, getTypeByCode, recommendCustomsType } = require('../lib/customs-types');

function parsePath(req) {
  const url = new URL(req.url || '', 'http://localhost');
  const segments = url.pathname.split('/').filter(Boolean);
  const action = req.query.action || (segments[2] === 'recommend' ? 'recommend' : null);
  const code = (req.query.code || segments[2] || '').toUpperCase();
  return { action, code: code === 'RECOMMEND' ? null : code };
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (requireAuth(req, res)) return;

  const { action, code } = parsePath(req);

  if (req.method === 'POST' && (action === 'recommend' || code === 'RECOMMEND')) {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
    }
    const scenario = String(body?.scenario || '').trim();
    if (scenario.length < 5) {
      return res.status(400).json({ error: 'scenario is required (min 5 chars)' });
    }
    try {
      const result = await recommendCustomsType({
        scenario,
        hsCode: body?.hsCode || null,
        direction: body?.direction || null,
        buyer: body?.buyer || null,
      });
      return res.status(200).json(result);
    } catch (e) {
      return res.status(500).json({ error: 'recommend failed', detail: e.message });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (code && code.length <= 4) {
    const row = getTypeByCode(code);
    if (!row) {
      return res.status(404).json({ found: false, code, message: 'Unknown customs type code' });
    }
    return res.status(200).json({ found: true, ...row });
  }

  const direction = req.query.direction || null;
  const category = req.query.category || null;
  const items = listTypes({ direction, category });
  return res.status(200).json({
    total: items.length,
    direction: direction || 'all',
    category: category || 'all',
    items,
  });
};
