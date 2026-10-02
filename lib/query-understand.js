// Bước 0 của /api/suggest — HIỂU HÀNG trước khi tìm mã.
//
// VÌ SAO: ERP gửi tiêu đề Taobao/1688 (tiếng Trung, lẫn quảng cáo, không nói
// chất liệu). Bộ tìm kiếm, bảng quyết định, chú giải, tiền lệ… đều viết bằng
// tiếng Việt kiểu tờ khai. Đưa thẳng tiêu đề thô vào thì:
//   - "可口可乐 Coca Cola 汽水" → khớp chữ "coca" → mã cocaine 2939.72.00;
//   - "充电宝" (sạc dự phòng) → nhóm 8507 đúng nhưng 8 số rơi vào ắc quy chì,
//     vì không có chữ Việt nào để xếp hạng các dòng con.
// Bước này đổi tiêu đề thành DỮ KIỆN HÀNG HÓA tiếng Việt (tên hàng chung, bản
// chất, chất liệu, công dụng, nơi sản xuất) rồi mới tìm mã. LLM ở đây chỉ DỊCH
// VÀ TÓM Ý, không chọn mã — chọn mã vẫn đi qua ứng viên + kiểm chứng như cũ.

const { callLLMJson } = require('./llm-tier');

const CJK_RE = /[㐀-鿿豈-﫿]/;
const CACHE_MAX = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const _cache = new Map();

const SYSTEM = `Bạn đọc TIÊU ĐỀ SẢN PHẨM thương mại điện tử (thường tiếng Trung, lẫn từ quảng cáo) và chuyển thành DỮ KIỆN HÀNG HÓA tiếng Việt để người khác phân loại mã HS. Bạn KHÔNG chọn mã HS.
Quy tắc:
- tenHangVi: danh từ chung chỉ BẢN CHẤT hàng, như người khai hải quan viết ("nước ngọt có ga", "sạc dự phòng (pin lithium-ion)", "bình giữ nhiệt bằng thép không gỉ"). KHÔNG dùng thương hiệu làm tên hàng.
- Thương hiệu chỉ là thương hiệu: Coca-Cola/可口可乐 là đồ uống có ga, không phải lá/cây coca; 小米 Xiaomi là hãng điện tử.
- banChat: 1 câu — hàng là gì, cấu tạo chính, dùng để làm gì.
- chatLieu, congDung, thanhPhan: chỉ ghi khi tiêu đề nói, hoặc hiển nhiên từ bản chất hàng; không bịa số liệu.
- noiSanXuat: mã ISO 3166 hai chữ của nước SẢN XUẤT, chỉ khi tiêu đề nói rõ (墨西哥 → MX, 日本原装 → JP, 韩国进口 → KR). Người bán ở Trung Quốc KHÔNG có nghĩa hàng sản xuất ở Trung Quốc. Không rõ → null.
- boQua: các từ quảng cáo đã bỏ (包邮, 新款, 爆款…).
Chỉ trả JSON: {"tenHangVi":"","banChat":"","chatLieu":null,"congDung":null,"thanhPhan":null,"thuongHieu":null,"quyCach":null,"noiSanXuat":null,"boQua":[]}`;

function needsUnderstanding(text) {
  return CJK_RE.test(String(text || ''));
}

function clean(v) {
  if (v == null) return null;
  const s = String(v).replace(/\s+/g, ' ').trim();
  if (!s || /^(null|none|không rõ|không có|n\/a|-)$/i.test(s)) return null;
  return s.slice(0, 200);
}

function toFacts(obj) {
  const iso = clean(obj?.noiSanXuat);
  return {
    tenHangVi: clean(obj?.tenHangVi),
    banChat: clean(obj?.banChat),
    chatLieu: clean(obj?.chatLieu),
    congDung: clean(obj?.congDung),
    thanhPhan: clean(obj?.thanhPhan),
    thuongHieu: clean(obj?.thuongHieu),
    quyCach: clean(obj?.quyCach),
    noiSanXuat: iso && /^[A-Za-z]{2}$/.test(iso) ? iso.toUpperCase() : null,
  };
}

/** Câu tiếng Việt dùng để tìm mã: tên hàng + bản chất + chất liệu + công dụng. */
function buildSearchText(f) {
  return [
    f.tenHangVi,
    f.banChat,
    f.chatLieu && `chất liệu ${f.chatLieu}`,
    f.congDung && `công dụng ${f.congDung}`,
    f.thanhPhan && `thành phần ${f.thanhPhan}`,
  ].filter(Boolean).join('; ');
}

/**
 * understandQuery(description) → {
 *   applied: bool,           // đã chuẩn hóa (đầu vào có chữ Hán và LLM trả hợp lệ)
 *   searchText: string,      // câu tiếng Việt để tìm mã (= description nếu không áp dụng)
 *   facts: {...} | null,
 *   reason: string,          // vì sao áp dụng / không
 * }
 * Không bao giờ ném lỗi: LLM hỏng thì trả applied=false để luồng cũ chạy tiếp.
 */
async function understandQuery(description, opts = {}) {
  const text = String(description || '').trim();
  if (!needsUnderstanding(text)) {
    return { applied: false, searchText: text, facts: null, reason: 'NO_CJK' };
  }
  const hit = _cache.get(text);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.value;

  const call = opts.callLLMJson || callLLMJson;
  let value;
  try {
    // Hermes/MiniMax "suy nghĩ" trước khi trả lời, ăn chung maxTokens: để rộng.
    const { json, provider, model } = await call(SYSTEM, `Tiêu đề: ${text}`, {
      tier: 'premium', maxTokens: 2000, timeoutMs: opts.timeoutMs || Number(process.env.QUERY_UNDERSTAND_TIMEOUT_MS) || 12000,
    });
    const facts = toFacts(json);
    const searchText = buildSearchText(facts);
    if (!facts.tenHangVi || CJK_RE.test(searchText)) {
      value = { applied: false, searchText: text, facts: null, reason: 'LLM_OUTPUT_INVALID' };
    } else {
      value = { applied: true, searchText, facts, reason: 'CJK_TITLE', provider: provider || null, model: model || null };
    }
  } catch (e) {
    return { applied: false, searchText: text, facts: null, reason: `LLM_FAILED: ${String(e.message || e).slice(0, 80)}` };
  }
  _cache.set(text, { ts: Date.now(), value });
  if (_cache.size > CACHE_MAX) _cache.delete(_cache.keys().next().value);
  return value;
}

module.exports = { understandQuery, needsUnderstanding, buildSearchText, toFacts, CJK_RE };
