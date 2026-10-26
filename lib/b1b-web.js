// B1b (doc 12 Phần B, CEO duyệt 16/10): tra web có MỤC TIÊU khi hồ sơ thiếu dữ kiện.
// CHẾ ĐỘ SHADOW (mặc định tắt): KHÔNG đổi bất kỳ quyết định nào của engine — chỉ
// 1) gọi webFacts theo câu hỏi thiếu, 2) ghi log 1 dòng JSON (đo độ phủ), 3) gắn
// out.webHint (nhanAi: 'AI_CHUA_KIEM') để soi. Chế độ 'on' (đưa fact vào vòng chạy
// lại) chỉ bật SAU bench 80 mẫu vàng theo luật #193.
// LUẬT RIÊNG TƯ (doc 12 Phần C): chỉ gửi brand/model/từ khoá mục tiêu — KHÔNG gửi
// nguyên văn mô tả khách; kết quả web là TÍN HIỆU, không bao giờ vào basis/căn cứ pháp lý.

function cheDo() {
  const v = (process.env.ZAI_WEB_FACTS || 'off').trim().toLowerCase();
  return v === 'shadow' || v === 'on' ? v : 'off';
}

/** Rút brand/model từ tên hàng để làm truy vấn — không gửi mô tả dài của khách. */
function truyVan(rawAttrs) {
  const ten = (rawAttrs.tenHang || rawAttrs.nameZh || '').toString().slice(0, 80);
  if (!ten) return null;
  return { ten, mucTieu: null };
}

/**
 * Gắn sau khi engine trả kết quả (post-hoc). Chỉ chạy khi engine nói NEED_FACTS.
 * Trả về out (có thể thêm webHint) — lỗi mạng/search → trả out nguyên vẹn.
 */
async function b1bShadow(rawAttrs, out) {
  if (cheDo() === 'off') return out;
  if (!out || out.status !== 'NEED_FACTS') return out;
  const qs = (out.nextAction && Array.isArray(out.nextAction.questions) ? out.nextAction.questions : [])
    .map((q) => q.questionVi).filter(Boolean).slice(0, 3);
  const tr = truyVan(rawAttrs);
  if (!tr) return out;
  const { webFacts } = require('./web-facts.js');
  const r = await webFacts({
    brand: null,
    model: tr.ten,
    mucTieu: (qs.length ? qs : ['xác định đặc tính kỹ thuật của hàng']).join('; ').slice(0, 300),
  });
  if (!r || !r.cauTraLoi) return out;
  const hint = {
    nhanAi: 'AI_CHUA_KIEM', // luật: tín hiệu web không được trích làm căn cứ pháp lý
    loai: 'WEB_SIGNAL',
    cheDo: cheDo(),
    cauTraLoi: r.cauTraLoi.slice(0, 1200),
    nguon: (r.nguon || []).slice(0, 4),
    cauHoiThieu: qs,
  };
  process.stdout.write(`${JSON.stringify({ type: 'b1b_web', ts: new Date().toISOString(), cheDo: hint.cheDo, coTraLoi: true, soNguon: hint.nguon.length })}\n`);
  return { ...out, webHint: hint };
}

module.exports = { b1bShadow, cheDo, truyVan };
