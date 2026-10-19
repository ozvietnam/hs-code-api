// POST /api/identify — định danh hàng hoá TRƯỚC khi tra mã HS (bước 12 — A-2, #299).
// Body: { tenHang, model?, thuongHieu?, moTa?, anhUrl[]?, chuong? }
// Trả: { frame: {chuong, truong, model?, thuongHieu?}, xacMinh: {muc: VERIFIED|CORROBORATED|HYPOTHESIS|KHONG_NGUON, nguon[]},
//        thieuTruong[], questions[], anh?, anhBoVi[], ms } — KHÔNG trả mã HS (việc của phan_loai_hs).
// LLM lỗi → degraded:true + llmError (không fail-silent). Bearer bắt buộc (rule 2: endpoint sinh nội dung bằng LLM).
const { requireAuth, serviceCaller } = require('../lib/auth');
const { withPrivateData } = require('../lib/llm-privacy');
const { setCors, handleOptions } = require('../lib/cors');
const { identify } = require('../lib/identify');

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed — dùng POST' });
  if (requireAuth(req, res)) return;

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON body' }); }
  }
  const tenHang = String(body?.tenHang || body?.name || '').trim();
  if (tenHang.length < 2) return res.status(400).json({ error: 'tenHang bắt buộc, tối thiểu 2 ký tự' });

  try {
    // Khoá dịch vụ (Cổng OZ, ERP…) = dữ liệu khách (#237 J1): mọi lượt LLM không qua tầng miễn phí — như /api/suggest.
    const run = serviceCaller(req) !== null ? (fn) => withPrivateData(fn) : (fn) => fn();
    const out = await run(() => identify({
      tenHang,
      model: body?.model || null,
      thuongHieu: body?.thuongHieu || body?.brand || null,
      moTa: body?.moTa || body?.description || null,
      anhUrl: Array.isArray(body?.anhUrl) ? body.anhUrl.slice(0, 4) : [],
      chuong: body?.chuong || null,
    }));
    if (out?.loi && !out.frame) return res.status(400).json({ error: out.loi });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(502).json({ error: 'Identify failed', detail: String(e?.message || e).slice(0, 240) });
  }
};
