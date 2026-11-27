// Chọn văn bản nào J2 sẽ trích lượt này (hs-agent/jobs/precedent-extract.mjs).
//
// Hàm thuần — không I/O — để test được không cần mạng, không cần LLM.
//
// Vì sao cần hồi sinh `rejected`:
//   J2 chỉ pick `new` / `retry` / `no-conclusion`(attempts < maxAttemptsPerDoc).
//   Một văn bản bị loại oan vì lỗi KIỂM (ví dụ bug codeAppears khớp mã nhóm theo
//   4-2-2, PR #2443) thành `rejected` → KHÔNG BAO GIỜ được pick lại ⇒ tiền lệ
//   đã trích đúng bị rơi vĩnh viễn, dù đã sửa xong hàm kiểm.
//   Đo trên hàng đợi thật (28/11): 7 mục `rejected`, trong đó 5 văn bản LLM đã
//   trả mã ĐÚNG — chỉ bị codeAppears loại; sau khi sửa, 5 văn bản đó ra được
//   5 bản ghi qua kiểm. Nhưng nếu không có nhánh hồi sinh, J2 vẫn không lấy.
//
// Chống đốt LLM: mỗi mục hồi sinh tối đa 1 lần mỗi `reviveCooldownHours`.
// `reviveMaxPerRun` giới hạn số mục hồi sinh mỗi lượt (phần còn lại dành cho
// văn bản mới).
//
// Tham số:
//   items       — mảng queue.items
//   cfg         — { maxDocsPerRun, maxAttemptsPerDoc, reviveMaxPerRun, reviveCooldownHours }
//   now         — Date.now() (mặc định) — để test không phụ thuộc đồng hồ
//   mark        — true ⇒ đánh dấu ngay mục được hồi sinh (reset attempts, set revivedAt)

const REVIVE_DEFAULT_MAX_PER_RUN = 5;
const REVIVE_DEFAULT_COOLDOWN_HOURS = 168; // 7 ngày

export function pickItems(items, cfg = {}, { now = Date.now(), mark = false } = {}) {
  const maxAttempts = cfg.maxAttemptsPerDoc || 3;
  const reviveMax = cfg.reviveMaxPerRun ?? REVIVE_DEFAULT_MAX_PER_RUN;
  const cooldownMs = (cfg.reviveCooldownHours ?? REVIVE_DEFAULT_COOLDOWN_HOURS) * 3600 * 1000;
  const limit = cfg.maxDocsPerRun || 15;

  const fresh = [];
  const revive = [];
  for (const it of items) {
    if (!it || it.kind !== 'classification') continue;
    if (it.state === 'new' || it.state === 'retry') { fresh.push(it); continue; }
    if (it.state === 'no-conclusion' && (it.attempts || 0) < maxAttempts) { fresh.push(it); continue; }
    if (it.state === 'rejected' && revive.length < reviveMax) {
      const last = it.revivedAt ? Date.parse(it.revivedAt) : NaN;
      // chưa hồi sinh lần nào, hoặc đã qua thời gian chờ ⇒ được hồi sinh
      if (!Number.isFinite(last) || now - last >= cooldownMs) revive.push(it);
    }
  }

  const picked = [];
  for (const it of fresh) {
    if (picked.length >= limit) break;
    picked.push(it);
  }
  for (const it of revive) {
    if (picked.length >= limit) break;
    if (mark) {
      it.revivedAt = new Date(now).toISOString();
      // Đặt attempts = maxAttempts-1 để lượt hồi sinh này là HẠN CUỐI:
      // nếu vẫn không ra bản ghi → state='rejected' (không quay lại 'retry' để đốt LLM vô ích).
      it.attempts = Math.max(0, (cfg.maxAttemptsPerDoc || 3) - 1);
      it.reviveCount = (it.reviveCount || 0) + 1;
    }
    picked.push(it);
  }
  return picked;
}
