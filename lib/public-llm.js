// lib/public-llm.js — Mở công khai, KHÔNG giới hạn, cho các endpoint gọi LLM:
// POST /api/suggest, /api/describe, /api/classify, /api/match.
//
// CEO chốt 09/10/2026: "mở dùng không hạn mức cho suggest, describe, classify, match, tất cả không giới hạn".
// Lý do: AI/người lạ phải gọi thử được mà không cần xin token; trước đó mọi LLM đều báo "không có token".
//
// Hệ quả CEO đã nhận: mỗi lượt gọi tốn tiền LLM thật và không có trần. Công tắc khẩn cấp:
//   HS_PUBLIC_LLM=false  → đóng lại, mọi lượt cần Bearer token như trước (không cần sửa mã, chỉ đổi env rồi khởi động lại).
//
// Có Bearer token thì vẫn được nhận như cũ; token SAI hay placeholder ("Bearer YOUR_TOKEN") cũng không bị 401 —
// endpoint đã mở, từ chối một lượt gọi hợp lệ chỉ vì header thừa là vô lý.
//
// KHÔNG mở bằng cơ chế này (vẫn Bearer-only): feedback (ghi đĩa), tariff admin/update/revert (sửa biểu thuế),
// dataset admin_*, kpi, error_log, trademark, oz_precedents, extract-specs, declaration-sheet.

const { requireAuth } = require('./auth');

/** Endpoint (theo tên trong api/) được mở theo cơ chế này. Test khoá danh sách này. */
const PUBLIC_LLM_ENDPOINTS = ['suggest', 'describe', 'classify', 'match'];

function publicLlmEnabled() {
  // Mặc định BẬT. Đặt HS_PUBLIC_LLM=false để đóng lại (vd khi bị lạm dụng làm tốn chi phí).
  return String(process.env.HS_PUBLIC_LLM ?? 'true').toLowerCase() !== 'false';
}

/**
 * Dùng thay requireAuth ở endpoint gọi LLM. Cùng giao ước: trả true nếu đã trả lời lỗi (caller phải return ngay).
 */
function requireAuthOrPublicLlm(req, res, opts = {}) {
  if (opts.publicRoute && process.env.HS_MATCH_PUBLIC === 'true') return false; // giữ hành vi cũ của /api/match
  if (!publicLlmEnabled()) return requireAuth(req, res, opts);
  res.setHeader('X-Access-Mode', 'public-llm');
  return false;
}

module.exports = { requireAuthOrPublicLlm, publicLlmEnabled, PUBLIC_LLM_ENDPOINTS };
