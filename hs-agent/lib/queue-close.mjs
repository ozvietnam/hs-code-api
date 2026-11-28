// Chốt văn bản đã hỏi LLM mà cơ quan hải quan KHÔNG kết luận mã HS.
//
// Vì sao cần:
//   J2 đánh dấu `no-conclusion` khi LLM trả coKetLuan=false — nghĩa là văn bản
//   THẬT SỰ không kết luận mã (hồ sơ chưa đủ thông tin, chỉ hướng dẫn nguyên tắc
//   chung, chỉ dẫn chiếu văn bản khác…). Trạng thái này KHÔNG phải lỗi.
//   Nhưng vòng lặp cũ giữ nó ở `no-conclusion` với attempts tăng mãi (đo được
//   28/11/2026: 32 mục, attempts tối đa 30) → mỗi lượt J2 vẫn pick lại các mục
//   có attempts < maxAttemptsPerDoc và đốt LLM vô ích (≈29 lượt × 15 văn bản ≈
//   435 lời gọi) mà ra 0 bản ghi.
//
//   Sửa: một văn bản đã hỏi LLM ≥ `maxAttemptsNoConclusion` lần mà vẫn
//   `no-conclusion` ⇒ CHỐT thành `done` (không phải `rejected`: không phải lỗi
//   kiểm, không cần hồi sinh). `done` thì không bao giờ được pick lại.
//
//   Ngưỡng mặc định = 2 (hỏi 2 lần) để không bỏ sót văn bản do lỗi tạm thời
//   (trang bị chặn lúc fetch ⇒ toàn văn quá ngắn ⇒ LLM không đủ thông tin).
//   Đo trên hàng đợi thật (28/11/2026, /srv/hs-agent/state/queue.json):
//   32 mục `no-conclusion`, attempts 1×3 · 9×1 · 11×4 · 14×1 · 16×1 · 17×7 ·
//   18×1 · 25×1 · 29×10 · 30×3 ⇒ 29 mục có attempts ≥ 2 (chốt ngay) và 3 mục
//   attempts = 1 (hỏi thêm 1 lần rồi chốt) ⇒ số văn bản phải hỏi LLM mỗi lượt
//   3 → 0 (sau tối đa 1 lượt nữa), lời gọi LLM vô ích ≈435 → ≈3.
//
// Hàm thuần (trừ đóng dấu thời gian) — không I/O — để test được không cần
// mạng, không cần LLM.

const CLOSE_DEFAULT_MAX_ATTEMPTS = 2;

/**
 * Chốt các mục `no-conclusion` đã đủ số lần thử.
 * @param {Array} items — queue.items
 * @param {Object} cfg   — { maxAttemptsNoConclusion }
 * @param {Object} [opt] — { now } để test không phụ thuộc đồng hồ
 * @returns {Array} các mục vừa được chốt (đã sửa tại chỗ).
 */
export function closeNoConclusion(items, cfg = {}, { now = Date.now() } = {}) {
  const maxAttempts = cfg.maxAttemptsNoConclusion ?? CLOSE_DEFAULT_MAX_ATTEMPTS;
  const closed = [];
  for (const it of items || []) {
    if (!it || it.state !== 'no-conclusion') continue;
    if ((it.attempts || 0) < maxAttempts) continue;
    it.state = 'done';
    it.closedAt = new Date(now).toISOString();
    it.note = `${String(it.note || 'không kết luận mã').slice(0, 180)} — chốt: văn bản không kết luận mã HS`;
    closed.push(it);
  }
  return closed;
}
