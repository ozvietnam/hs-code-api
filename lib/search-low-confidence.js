// Lọc kết quả /api/search có điểm khớp quá thấp — trước đây "trạm sạc" ra top
// là 34013000 (chất tẩy rửa, "sạch" chứa "sạc") thay vì 8504 (thiết bị điện).
// Bug #326 yêu cầu: điểm khớp thấp/tách từ méo → trả 0 + gợi ý đổi từ khoá.
//
// Ngưỡng 80 ĐO RA trên vài chục truy vấn đại diện:
//   trạm sạc           37  (sai miền — chất tẩy rửa)
//   trạm sạc điện      73  (sai miền)
//   trạm sạc ô tô      53  (sai miền)
//   trạm sạc xe        73  (sai miền)
//   máy sạc           122  (giữ — top hợp lệ)
//   sạc dự phòng      173  (giữ)
//   sạc laptop        356  (giữ)
//   bộ sạc ô tô       300  (giữ)
//   sạc điện thoại    192  (giữ)

const LOW_CONFIDENCE_THRESHOLD = 80;

const SUGGESTION_VI =
  'Cụm từ khớp quá rời rạc — thử bổ sung tên hàng cụ thể hơn (vd "bộ sạc", "máy sạc pin", "cục sạc dự phòng", "sạc điện thoại") hoặc dùng /api/classify để phân loại.';

/**
 * Lọc mảng ứng viên từ searchCandidates: nếu top score < ngưỡng → trả về []
 * kèm lowConfidence + suggestionVi để API trả cho client.
 *
 * @param {Array<{score: number}>} candidates
 * @returns {{results: Array, lowConfidence: boolean, suggestionVi?: string}}
 */
function filterLowConfidence(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { results: [], lowConfidence: true, suggestionVi: SUGGESTION_VI };
  }
  const top = candidates[0]?.score ?? 0;
  if (top < LOW_CONFIDENCE_THRESHOLD) {
    return { results: [], lowConfidence: true, suggestionVi: SUGGESTION_VI };
  }
  return { results: candidates, lowConfidence: false };
}

module.exports = { filterLowConfidence, LOW_CONFIDENCE_THRESHOLD, SUGGESTION_VI };