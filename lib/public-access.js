// lib/public-access.js — Quyết định endpoint nào đọc được KHÔNG cần token.
//
// MỤC TIÊU: bất kỳ AI hay người nào chạm tới website đều tra cứu được kho tri
// thức HS, không phải xin token trước. Đó là điều kiện để dự án thực sự "mở".
//
// NGUYÊN TẮC PHÂN LOẠI — chỉ mở khi thoả CẢ BA:
//   1. Chỉ ĐỌC dữ liệu tĩnh trong data/ — không gọi LLM, không tốn tiền mỗi lượt.
//   2. Không chứa dữ liệu riêng tư của doanh nghiệp hay khách hàng.
//   3. Nội dung đã đủ tin cậy để công bố — không phải seed chưa xác minh.
//
// DANH SÁCH LÀ ALLOWLIST TƯỜNG MINH, KHÔNG PHẢI BLOCKLIST.
// Thêm resource mới vào api/dataset.js thì mặc định nó KÍN. Muốn mở phải khai
// vào đây một cách có ý thức. Quên khai thì mất tính năng — quên chặn thì lộ dữ
// liệu; chọn hướng sai an toàn hơn.

/** Endpoint (theo tên file trong api/) mở đọc công khai. */
const PUBLIC_ENDPOINTS = new Set([
  'tax', // tra thuế theo mã — lõi của kho tri thức
  'search', // tìm mã theo từ khoá
  'notes', // chú giải chương
  'kg_chapter', // liệt kê mã trong chương
  'customs-types', // mã loại hình XNK (QĐ 1357)
]);

/** Resource của /api/dataset mở đọc công khai. */
const PUBLIC_DATASET_RESOURCES = new Set([
  'kg_stats', // thống kê kho dữ liệu
  'chapters', // chỉ mục chương
  'conflicts', // cảnh báo mã dễ nhầm
  'precedents', // tiền lệ TB-TCHQ (văn bản công khai)
  'materials', // phân loại vật liệu
  'material_taxonomy',
  'ministries', // 14 bộ ngành quản lý chuyên ngành
  'legal_docs', // thư viện văn bản pháp luật
  'legal_doc',
  'policy_procedures', // thủ tục kiểm tra chuyên ngành
  'products', // corpus sản phẩm mã "Loại khác"
  'accuracy', // benchmark độ chính xác — công khai để không tô hồng
  'data_quality', // báo cáo chất lượng dữ liệu — minh bạch cả điểm yếu
]);

/**
 * CỐ Ý GIỮ KÍN — ghi lý do để người sau không mở nhầm:
 *
 *   admin_overview, admin_audit, admin_suggestions, kpi, error_log,
 *   prompt_versions          → dữ liệu vận hành nội bộ
 *   oz_precedents            → lịch sử tờ khai của Oz. Đã ẩn danh nhưng vẫn là
 *                              tri thức kinh doanh riêng — CEO quyết có mở không.
 *   trademark (GET + POST)   → 53 nhãn hiệu mà mới 1 nhãn được verify. Công bố
 *                              cảnh báo SHTT chưa xác minh có thể gây thiệt hại
 *                              cho chủ nhãn lẫn người tra. Mở sau khi verify đủ.
 *
 * Mọi endpoint sinh nội dung bằng LLM (suggest, describe, classify, match) đều
 * KÍN: mỗi lượt gọi tốn tiền thật, mở công khai là mời người ta đốt hộ.
 */

function publicReadEnabled() {
  // Mặc định BẬT. Đặt HS_PUBLIC_READ=false để đóng lại (vd khi bị lạm dụng).
  return String(process.env.HS_PUBLIC_READ ?? 'true').toLowerCase() !== 'false';
}

/**
 * @param {object} opts
 * @param {string} opts.endpoint  Tên endpoint, vd 'tax', 'dataset'
 * @param {string} [opts.resource] Với endpoint 'dataset': giá trị ?resource=
 * @param {string} [opts.method]  HTTP method — chỉ GET/HEAD mới được mở
 * @returns {boolean} true nếu request này được đọc mà không cần Bearer token
 */
function isPublicRead({ endpoint, resource, method } = {}) {
  if (!publicReadEnabled()) return false;

  const m = String(method || 'GET').toUpperCase();
  if (m !== 'GET' && m !== 'HEAD') return false;

  if (endpoint === 'dataset') {
    return PUBLIC_DATASET_RESOURCES.has(String(resource || '').trim());
  }
  return PUBLIC_ENDPOINTS.has(String(endpoint || '').trim());
}

/**
 * Thay cho requireAuth ở các endpoint có thể mở đọc.
 * Trả true nếu đã trả lời lỗi (caller phải return ngay) — cùng giao ước với
 * requireAuth để không phải sửa cấu trúc handler.
 */
function requireAuthUnlessPublic(req, res, opts = {}) {
  if (isPublicRead({ ...opts, method: req.method })) {
    // Cho CDN cache — request công khai thì tốn băng thông, không tốn LLM.
    if (!res.getHeader('Cache-Control')) {
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
    }
    res.setHeader('X-Access-Mode', 'public-read');
    return false;
  }
  const { requireAuth } = require('./auth');
  return requireAuth(req, res, opts);
}

module.exports = {
  PUBLIC_ENDPOINTS,
  PUBLIC_DATASET_RESOURCES,
  isPublicRead,
  publicReadEnabled,
  requireAuthUnlessPublic,
};
