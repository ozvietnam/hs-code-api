// Nguồn dữ liệu có nhãn từ addon OZSource + quy tắc độ tin cậy + bảng tra nội bộ nhóm hàng hay gặp.
// Báo cáo lỗi HS 28/10/2026 (bể tự hoại 3 ngăn PE Tmall 1092190764483): engine gợi ý 3926.90 ("loại khác")
// dù tự nêu 39.25, tin "玻璃钢" trong tiêu đề (từ khoá SEO) và hỏi lại 4 câu mà ảnh chi tiết đều trả lời được.
//
// CHỈ bật khi bên gọi gửi `evidence` (ERP mới) — không có thì prompt giữ nguyên từng byte
// (scripts/test-engine-loop-gon.mjs so với bản gốc).

/** Trần chữ khối nguồn có nhãn đưa vào prompt vòng 1 (vòng 2 cắt theo pack 2.500 ký tự như cũ). */
const EVIDENCE_PROMPT_MAX = 12000;

/** Nhãn nguồn addon gắn đầu mỗi dòng evidenceText. */
const SOURCE_TAG_RE = /^\[(?:TITLE|ATTR|SKU|DESC|REVIEW|IMG-\d+)\]/;

/** Khối quy tắc dán vào hồ sơ (không phải dữ kiện hàng — không được trích làm căn cứ). */
const SOURCE_RULES_VI = `QUY TẮC BỔ SUNG (OZ 28/10/2026 — áp cho món này):
NGUỒN DỮ LIỆU & ĐỘ TIN CẬY
- Thứ tự tin cậy: [IMG-n] bảng thông số (产品参数) > [IMG-n] ảnh chú thích chi tiết > [ATTR] > [SKU] > [REVIEW] > [TITLE].
- Từ khóa chất liệu trong tiêu đề (玻璃钢, 不锈钢, 纯铜, 实木…) chỉ được dùng khi có nguồn khác xác nhận.
- Hai nguồn mâu thuẫn: chọn theo thứ tự trên và ghi cảnh báo, nêu cả hai giá trị.
TRẢ LỜI CÂU HỎI BỔ SUNG
- Trước khi hỏi người dùng, tự tìm câu trả lời trong toàn bộ nguồn có nhãn ở trên; chỉ hỏi khi không nguồn nào có.
PHÂN LOẠI HS
- Nhóm mô tả cụ thể ưu tiên hơn nhóm chung (GIR 3(a)); mã "loại khác" (x.90, 3926.90) chỉ dùng khi đã loại trừ hết nhóm cụ thể.
- Nếu chính mình nêu một nhóm loại trừ, phải kiểm tra nhóm đó trước khi chốt.
- Luôn trả về ít nhất 6 số (ưu tiên 8 số theo Biểu thuế VN); không chốt được thì nêu 2–3 mã ứng viên kèm điều kiện phân biệt.
- Kiểm tra điều kiện của mã (dung tích, kích thước, công suất, chất liệu) với TỪNG SKU; SKU nào không đạt thì nêu trong 'reason'.
- Nhãn hiệu khác nhau giữa các nguồn → nêu để xác nhận với shop.`;

/**
 * Bảng tra nội bộ — nhóm hàng hay gặp mà engine dễ rơi về "loại khác". Mỗi dòng: từ khoá (Trung/Việt) →
 * gợi ý nhóm cần xét TRƯỚC, kèm căn cứ. Chỉ là gợi ý kiểm chứng, không phải đáp án.
 */
const HS_LOOKUP_HINTS = [
  {
    match: /化粪池|储水罐|储水桶|蓄水池|蓄水桶|水塔|水箱|储罐|bể tự hoại|bồn (?:chứa )?nước|bể chứa nước|téc nước/i,
    hintVi:
      'Bể tự hoại / bồn, bể, thùng chứa nước bằng plastic dùng trong xây dựng: xét nhóm 39.25 TRƯỚC 39.26 — ' +
      '3925.10 "thùng chứa, bể, két… dung tích trên 300 lít" (Chú giải 11 Chương 39); SKU ≤ 300 lít không thuộc 3925.10.',
  },
];

function clip(s, n) {
  const t = String(s ?? '').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** evidence (chuỗi nhiều dòng có nhãn hoặc mảng dòng) → chuỗi đã chuẩn hoá, ≤ max ký tự, cắt ở ranh dòng. */
function normalizeEvidence(raw, max = 20000) {
  const lines = (Array.isArray(raw) ? raw : String(raw ?? '').split('\n'))
    .map((l) => String(l ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  let out = '';
  for (const l of lines) {
    if (out.length + l.length + 1 > max) break;
    out += (out ? '\n' : '') + l;
  }
  return out;
}

/** Gợi ý bảng tra khớp với tên/nguồn của món (≤ 3). */
function lookupHints(text) {
  const t = String(text || '');
  return HS_LOOKUP_HINTS.filter((h) => h.match.test(t)).map((h) => h.hintVi).slice(0, 3);
}

/** skuFacts [{sku, capacityL?, material?}] → dòng tóm tắt cho prompt (≤ 20 SKU). */
function skuFactLines(skuFacts) {
  return (Array.isArray(skuFacts) ? skuFacts : [])
    .filter((f) => f && f.sku)
    .slice(0, 20)
    .map((f) => {
      const bits = [f.capacityL != null ? `${f.capacityL} lít` : null, f.material || null].filter(Boolean);
      return `- ${clip(f.sku, 60)}${bits.length ? `: ${bits.join(', ')}` : ''}`;
    });
}

/**
 * Phần thêm vào cuối hồ sơ vòng 1 / vòng 2 khi có evidence: bảng tra khớp + thông số từng SKU + quy tắc.
 * Không có evidence → '' (prompt cũ không đổi).
 */
function rulesBlock(raw = {}) {
  if (!raw.evidence) return '';
  const parts = [];
  const hints = lookupHints([raw.nameZh, raw.tenHang, raw.evidence].filter(Boolean).join('\n'));
  if (hints.length) parts.push(`BẢNG TRA NỘI BỘ (gợi ý nhóm cần kiểm trước):\n${hints.map((h) => `- ${h}`).join('\n')}`);
  const sku = skuFactLines(raw.skuFacts);
  if (sku.length) parts.push(`THÔNG SỐ TỪNG SKU (tách từ tên SKU — kiểm điều kiện mã với từng dòng):\n${sku.join('\n')}`);
  parts.push(SOURCE_RULES_VI);
  return parts.join('\n\n');
}

module.exports = {
  EVIDENCE_PROMPT_MAX, SOURCE_TAG_RE, SOURCE_RULES_VI, HS_LOOKUP_HINTS,
  normalizeEvidence, lookupHints, skuFactLines, rulesBlock,
};
