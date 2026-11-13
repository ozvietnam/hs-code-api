// B1b (doc 12 Phần B, CEO duyệt 16/10; OZV-757: tra web qua máy tìm kiếm nội bộ SearXNG trước, rơi về z.ai khi cần):
// tra web CÓ MỤC TIÊU khi hồ sơ thiếu dữ kiện. Hai chế độ qua env ZAI_WEB_FACTS:
//   shadow — chỉ gắn `webHint` + log (KHÔNG đổi quyết định engine);
//   on     — có trả lời web thì CHẠY LẠI ĐÚNG MỘT LẶT engine với dữ kiện web gắn nhãn
//            "chưa kiểm chứng" đưa vào đầu vào; mọi cổng pháp lý (sổ tay/GIR/trích dẫn)
//            vẫn kiểm như thường — web KHÔNG BAO GIỜ thành căn cứ pháp lý.
// LUẬT RIÊNG TƯ (doc 12 Phần C): truy vấn chỉ gửi tên hàng ≤80 ký tự + câu hỏi thiếu —
// không gửi nguyên văn mô tả của khách. Lượt riêng tư (withPrivateData): không tra web (L0a #546).

const { isPrivate } = require('./llm-privacy');
const { timWeb } = require('./tim-web');

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
 * `opts._b1bWebFacts` và `opts._timWeb` là mũi tiêm cho test.
 */
async function b1bApDung(rawAttrs, out, opts, chayLai) {
  const mode = cheDo();
  if (mode === 'off') return out;
  if (!out || out.status !== 'NEED_FACTS') return out;
  if (opts && opts._b1bDaThu) return out;
  if (isPrivate()) return out;

  const qs = (out.nextAction && Array.isArray(out.nextAction.questions) ? out.nextAction.questions : [])
    .map((q) => q.questionVi).filter(Boolean).slice(0, 3);
  const tr = truyVan(rawAttrs);
  if (!tr) return out;

  const timWebFn = (opts && opts._timWeb) || timWeb;
  const webFactsFn = (opts && opts._b1bWebFacts) || require('./web-facts.js').webFacts;

  const doWeb = {
    type: 'b1b_web',
    ts: new Date().toISOString(),
    cheDo: mode,
    nguonWeb: 'khong',
    soDoanTrich: 0,
    coGoiWeb: false,
    coTraLoi: false,
  };

  const t0 = Date.now();
  let searchResults = null;

  // Dựng tối đa 2 câu tìm: (tên hàng + từ khoá thiếu) và (hãng/model/tên Trung nếu có)
  const q1 = `${tr.ten} ${(qs.length ? qs.join(' ') : '')}`.trim().slice(0, 150);
  if (q1) {
    doWeb.coGoiWeb = true;
    try {
      searchResults = await timWebFn(q1);
    } catch {
      searchResults = null;
    }
  }

  if (!searchResults && (rawAttrs.brand || rawAttrs.model || rawAttrs.nameZh)) {
    const q2 = [rawAttrs.brand, rawAttrs.model, rawAttrs.nameZh].filter(Boolean).join(' ').trim().slice(0, 150);
    if (q2 && q2 !== q1) {
      doWeb.coGoiWeb = true;
      try {
        searchResults = await timWebFn(q2);
      } catch {
        searchResults = null;
      }
    }
  }

  let cauTraLoi = '';
  let nguon = [];

  if (searchResults && Array.isArray(searchResults) && searchResults.length > 0) {
    doWeb.nguonWeb = 'nha';
    for (const r of searchResults.slice(0, 5)) {
      const snip = `- ${r.doanTrich} (${r.url})`;
      if ((cauTraLoi + '\n' + snip).length > 1200) break;
      cauTraLoi = cauTraLoi ? cauTraLoi + '\n' + snip : snip;
      nguon.push({ title: r.tieuDe, url: r.url });
    }
    doWeb.soDoanTrich = nguon.length;
    doWeb.coTraLoi = Boolean(cauTraLoi);
  }

  // Nếu timWeb không có kết quả, rơi về webFacts (z.ai) như cũ
  if (!cauTraLoi) {
    try {
      const r = await webFactsFn({
        brand: rawAttrs.brand || null,
        model: rawAttrs.model || rawAttrs.url || tr.ten,
        mucTieu: (qs.length ? qs : ['xác định đặc tính kỹ thuật của hàng']).join('; ').slice(0, 300),
      });
      if (r && r.cauTraLoi) {
        doWeb.nguonWeb = 'zai';
        cauTraLoi = r.cauTraLoi.slice(0, 1200);
        nguon = (r.nguon || []).slice(0, 4);
        doWeb.soDoanTrich = nguon.length;
        doWeb.coTraLoi = true;
      }
    } catch {
      // z.ai fallback error ignored
    }
  }

  doWeb.msWeb = Date.now() - t0;
  doWeb.soNguon = nguon.length;

  if (!cauTraLoi) {
    try { process.stdout.write(`${JSON.stringify(doWeb)}\n`); } catch {}
    return out;
  }

  const hint = {
    nhanAi: 'AI_CHUA_KIEM',
    loai: 'WEB_SIGNAL',
    cheDo: mode,
    cauTraLoi: cauTraLoi.slice(0, 1200),
    nguon: nguon.slice(0, 4),
    cauHoiThieu: qs,
    nguonWeb: doWeb.nguonWeb,
  };

  if (mode !== 'on' || typeof chayLai !== 'function') {
    doWeb.chayLai = 'khong_chay_lai';
    try { process.stdout.write(`${JSON.stringify(doWeb)}\n`); } catch {}
    return { ...out, webHint: hint };
  }

  const t1 = Date.now();
  try {
    const lai = await chayLai(gopDauVao(rawAttrs, cauTraLoi));
    doWeb.msChayLai = Date.now() - t1;
    doWeb.chayLai = lai && lai.status && lai.status !== 'NEED_FACTS' ? 'ra_ket_qua' : 'van_hoi';
    try { process.stdout.write(`${JSON.stringify(doWeb)}\n`); } catch {}
    if (lai && lai.status && lai.status !== 'NEED_FACTS') {
      return { ...lai, webFactsApplied: true, webHint: hint };
    }
    return { ...(lai || out), webHint: hint };
  } catch (e) {
    doWeb.chayLai = 'loi';
    doWeb.msChayLai = Date.now() - t1;
    try { process.stdout.write(`${JSON.stringify(doWeb)}\n`); } catch {}
    try { process.stderr.write(`${JSON.stringify({ type: 'b1b_error', ts: new Date().toISOString(), msg: String(e?.message || e).slice(0, 200) })}\n`); } catch {}
    return { ...out, webHint: hint };
  }
}

module.exports = { b1bApDung, b1bShadow: b1bApDung, cheDo, truyVan, gopDauVao };
