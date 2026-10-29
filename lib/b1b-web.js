// B1b (doc 12 Phần B, CEO duyệt 16/10; "bật thật" 26/10): tra web CÓ MỤC TIÊU khi hồ sơ
// thiếu dữ kiện. Hai chế độ qua env ZAI_WEB_FACTS:
//   shadow — chỉ gắn `webHint` + log (KHÔNG đổi quyết định engine);
//   on     — có trả lời web thì CHẠY LẠI ĐÚNG MỘT LẶT engine với dữ kiện web gắn nhãn
//            "chưa kiểm chứng" đưa vào đầu vào; mọi cổng pháp lý (sổ tay/GIR/trích dẫn)
//            vẫn kiểm như thường — web KHÔNG BAO GIỜ thành căn cứ pháp lý.
// LUẬT RIÊNG TƯ (doc 12 Phần C): truy vấn chỉ gửi tên hàng ≤80 ký tự + câu hỏi thiếu —
// không gửi nguyên văn mô tả của khách. Lượt riêng tư (withPrivateData): không tra web (L0a #546).

const { isPrivate } = require('./llm-privacy');

function cheDo() {
  const v = (process.env.ZAI_WEB_FACTS || 'off').trim().toLowerCase();
  return v === 'shadow' || v === 'on' ? v : 'off';
}

/** Rút tên hàng làm truy vấn — không gửi mô tả dài của khách. */
function truyVan(rawAttrs) {
  const ten = (rawAttrs.tenHang || rawAttrs.nameZh || '').toString().slice(0, 80);
  return ten ? { ten } : null;
}

/** Gộp dữ kiện web vào đầu vào cho lượt chạy lại — gắn nhãn rõ, giới hạn độ dài. */
function gopDauVao(rawAttrs, cauTraLoi) {
  const goc = (rawAttrs.tenHang || '').toString();
  const them = `\nDữ kiện tham khảo từ web (chưa kiểm chứng, chỉ là gợi ý — không phải căn cứ pháp lý):\n${(cauTraLoi || '').slice(0, 800)}`;
  return { ...rawAttrs, tenHang: (goc + them).slice(0, 1000) };
}

/**
 * Móc cuối classifyLoop. `chayLai` = chạy engine lần nữa với đầu vào mới (người gọi đã
 * gắn cờ `_b1bDaThu` — không đệ quy vô hạn). Lỗi tầng này → trả out nguyên vẹn.
 * `opts._b1bWebFacts` là mũi tiêm cho test.
 */
async function b1bApDung(rawAttrs, out, opts, chayLai) {
  const mode = cheDo();
  if (mode === 'off') return out;
  if (!out || out.status !== 'NEED_FACTS') return out;
  if (opts && opts._b1bDaThu) return out;
  // Truy vấn B1b là TÊN HÀNG của khách (không phải nhãn hiệu/model) → lượt riêng tư không bao giờ gửi (L0a #546).
  if (isPrivate()) return out;
  const qs = (out.nextAction && Array.isArray(out.nextAction.questions) ? out.nextAction.questions : [])
    .map((q) => q.questionVi).filter(Boolean).slice(0, 3);
  const tr = truyVan(rawAttrs);
  if (!tr) return out;
  const webFacts = (opts && opts._b1bWebFacts) || require('./web-facts.js').webFacts;
  const r = await webFacts({
    brand: null,
    model: tr.ten,
    mucTieu: (qs.length ? qs : ['xác định đặc tính kỹ thuật của hàng']).join('; ').slice(0, 300),
  });
  if (!r || !r.cauTraLoi) return out;
  const hint = {
    nhanAi: 'AI_CHUA_KIEM',
    loai: 'WEB_SIGNAL',
    cheDo: mode,
    cauTraLoi: r.cauTraLoi.slice(0, 1200),
    nguon: (r.nguon || []).slice(0, 4),
    cauHoiThieu: qs,
  };
  process.stdout.write(`${JSON.stringify({ type: 'b1b_web', ts: new Date().toISOString(), cheDo: mode, coTraLoi: true, soNguon: hint.nguon.length })}\n`);
  if (mode !== 'on' || typeof chayLai !== 'function') return { ...out, webHint: hint };
  try {
    const lai = await chayLai(gopDauVao(rawAttrs, r.cauTraLoi));
    if (lai && lai.status && lai.status !== 'NEED_FACTS') {
      return { ...lai, webFactsApplied: true, webHint: hint };
    }
    return { ...(lai || out), webHint: hint };
  } catch (e) {
    // Lượt chạy lại lỗi → giữ đáp án gốc + webHint (như cũ) nhưng KHÔNG nuốt im: MỘT dòng b1b_error ra stderr, chỉ thông
    // điệp lỗi — không mô tả hàng, không câu trả lời web, không khoá (cùng khuôn với catch B1b ở lib/engine-loop.js).
    try { process.stderr.write(`${JSON.stringify({ type: 'b1b_error', ts: new Date().toISOString(), msg: String(e?.message || e).slice(0, 200) })}\n`); } catch { /* ghi log hỏng không làm hỏng lượt chính */ }
    return { ...out, webHint: hint };
  }
}

module.exports = { b1bApDung, b1bShadow: b1bApDung, cheDo, truyVan, gopDauVao };
