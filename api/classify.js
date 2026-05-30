// POST /api/classify — áp mã HS theo phương pháp hs-code-vn (Pha 2).
// Body: { tenHang|name, chatLieu|material, congDung|purpose, chucNang?, nameZh?, specs? }
//   (đến từ OrderItem ERP: name, customerDescription→congDung, nameZh, ...)
// Trả: { results:[{hs, confidence, reason, gir, tbTchq?}], missing:[], candidates, ms }

const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { classify } = require('../lib/classify');

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed — dùng POST' });
  }
  if (requireAuth(req, res)) return;

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON body' }); }
  }

  const attrs = {
    tenHang: (body?.tenHang || body?.name || body?.productName || '').trim(),
    chatLieu: body?.chatLieu || body?.material || null,
    congDung: body?.congDung || body?.purpose || body?.customerDescription || null,
    chucNang: body?.chucNang || null,
    nameZh: body?.nameZh || null,
    specs: body?.specs || body?.technicalSpec || null,
  };
  if (!attrs.tenHang || attrs.tenHang.length < 2) {
    return res.status(400).json({ error: 'tenHang (tên hàng) bắt buộc, tối thiểu 2 ký tự' });
  }

  try {
    const started = Date.now();
    const result = await classify(attrs);
    return res.status(200).json({ ...result, attrs, ms: Date.now() - started });
  } catch (e) {
    return res.status(502).json({ error: 'Classify failed', detail: String(e.message).slice(0, 240) });
  }
};
