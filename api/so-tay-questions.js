// api/so-tay-questions.js — Câu hỏi phân loại TẤT ĐỊNH lấy từ SỔ TAY THẬT
// (data/so-tay/<nhóm4số>.json) cho bước "Oz rà soát" của Cổng OZ / ERP.
//
// VÌ SAO: bước "Oz rà soát" ở portal đang hỏi khách câu CHUNG CHUNG vì chỉ có
// /api/declaration-fields (danh mục trường khai TĨNH). Sổ tay thật biết ĐẶC ĐIỂM
// QUYẾT ĐỊNH cần hỏi để chốt mã (missingFacts của chotDong8, cổng soTayGates)
// nhưng trước đây chỉ chạy chui trong /api/classify (chậm, có cờ HS_SO_TAY).
// Endpoint này mở một cửa NHANH cho nó.
//
// TẤT ĐỊNH: KHÔNG gọi LLM, KHÔNG engine-loop, KHÔNG phụ thuộc cờ HS_SO_TAY —
// chỉ đọc sổ tay tĩnh đã kiểm nguồn + tái dùng máy chốt dòng 8 số
// (lib/so-tay-gates.js) và danh mục trường khai (lib/declaration-fields.js).
// Mục tiêu ~vài chục ms, ngang /api/declaration-fields.
//
// CÔNG KHAI như /api/declaration-fields: chỉ đọc dữ liệu tĩnh, không tốn tiền,
// không chạm dữ liệu khách. Công tắc đóng khẩn cấp dùng chung: HS_PUBLIC_READ=false
// → đòi Bearer token.
//
// #411 (24/10/2026 — phục vụ "Kỷ luật hỏi" phía ERP): bước 3 đọc cả productText (haystack
// của lib/attributes.js, cùng máy dò với /api/classify) nên câu chung TT39 mà mô tả đã nêu
// ("PN16", "inox 304", "25 mm", "380V", "3 pha"…) tự rụng; mỗi câu mang `loai`
// (DONG_BIEU | CONG | TT39); câu TT39 là TUỲ CHỌN (required:false) khi có productText; câu
// DONG_BIEU kèm `tacDongThue` (chênh MFN giữa các dòng 8 số mà câu quyết định — chỉ tính,
// không đổi thứ tự). Toàn bộ ADDITIVE: không gửi productText → payload y như cũ (+2 field).

const { setCors, handleOptions } = require('../lib/cors');
const { publicReadEnabled } = require('../lib/public-access');
const { requireAuth } = require('../lib/auth');
const { cauHoiSoTay } = require('../lib/so-tay-gates'); // lõi sinh câu hỏi — dùng chung với lib/identify.js (định danh hỏi theo sổ tay)

const nz = (s) => String(s || '').replace(/\D/g, '');
const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n)}…` : t; };
const hasVal = (v) => v != null && String(v).trim() !== '';

module.exports = async function handler(req, res) {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', hint: 'POST /api/so-tay-questions { hs: "<4–8 chữ số>", productText?, facts? }' });
  }
  // Mặc định công khai. Chỉ đòi token khi đã đóng cổng đọc công khai (HS_PUBLIC_READ=false).
  if (!publicReadEnabled() && requireAuth(req, res, {})) return;

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'DAU_VAO_SAI', chiTiet: ['Body không phải JSON hợp lệ.'] }); }
  }
  body = body && typeof body === 'object' && !Array.isArray(body) ? body : {};

  const code = nz(body.hs).slice(0, 8);
  if (code.length < 4) {
    return res.status(400).json({ error: 'DAU_VAO_SAI', chiTiet: ['Thiếu hoặc sai "hs" — cần mã 4–8 chữ số, vd "8481" hoặc "84811019".'] });
  }
  const h4 = code.slice(0, 4);
  const productText = typeof body.productText === 'string' ? body.productText : '';
  const facts = body.facts && typeof body.facts === 'object' && !Array.isArray(body.facts) ? body.facts : {};

  try {
    // Lõi (3 lớp: dòng biểu → cổng sổ tay → trường khai còn thiếu, đã bỏ câu khách trả lời trong facts) nằm ở
    // lib/so-tay-gates.js#cauHoiSoTay — /api/identify dùng CÙNG hàm này để hỏi khách theo sổ tay thay cho bảng chương.
    const kq = cauHoiSoTay({ code, productText, facts });
    if (!kq) {
      // Nhóm chưa có sổ tay → portal tự fallback sang /api/declaration-fields. KHÔNG 500.
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
      return res.status(200).json({ coSoTay: false, nhom: h4, questions: [] });
    }
    const s = kq.soTay;
    const out = kq.questions;

    // Dọn field rỗng cho response gọn + bám đúng CONTRACT.
    const clean = out.map((q) => {
      const o = { key: q.key, questionVi: q.questionVi, type: q.type, required: q.required, loai: q.loai };
      if (q.questionZh) o.questionZh = q.questionZh;
      if (q.unit) o.unit = q.unit;
      if (q.options) o.options = q.options;
      if (hasVal(q.nguon)) o.nguon = q.nguon;
      if (hasVal(q.trich)) o.trich = clip(q.trich, 240);
      if (q.askStaff) o.askStaff = true;
      if (q.tacDongThue) o.tacDongThue = q.tacDongThue; // chỉ câu DONG_BIEU (#411)
      return o;
    });

    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
    return res.status(200).json({
      coSoTay: true,
      nhom: h4,
      nguonSoTay: `Sổ tay HS nhóm ${h4}${s.phienBan ? ` (${s.phienBan})` : ''}`,
      questions: clean,
    });
  } catch (e) {
    return res.status(500).json({ error: 'so-tay-questions failed', detail: e.message });
  }
};
