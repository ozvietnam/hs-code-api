// lib/chapter98.js — Chương 98 KHÔNG phải đáp án phân loại thông thường.
//
// BẢN CHẤT NGHIỆP VỤ
// Chương 98 của Biểu thuế nhập khẩu Việt Nam là chương quy định **mã hàng và mức
// thuế suất nhập khẩu ưu đãi RIÊNG** cho một số nhóm mặt hàng. Mã ở đây soi
// gương mã thông thường nhưng gắn với một chế độ ưu đãi cụ thể, và chỉ áp dụng
// khi doanh nghiệp **đủ điều kiện và chủ động khai theo chế độ đó**.
//
// Với câu hỏi "mặt hàng này là mã HS gì", đáp án luôn là mã ở chương 01–97.
// Chương 98 là lựa chọn thêm về THUẾ, không phải kết luận về PHÂN LOẠI.
//
// BẰNG CHỨNG TỪ DỮ LIỆU CỦA CHÍNH DỰ ÁN
// Đo trên benchmark 200 tờ khai thật (data/accuracy-report-2026-05-28.json):
//   · 19/184 lỗi (10%) là do hệ thống đoán vào chương 98
//   · 0/200 tờ khai có đáp án thật thuộc chương 98
// Nghĩa là mọi lần gợi ý chương 98 đều sai. Loại chương 98 khỏi ứng viên mặc
// định là khoản lợi gần như miễn phí.
//
// HỆ QUẢ KHÁC ĐÃ XÁC MINH
// 457 mã "thiếu VAT" mà báo cáo chất lượng dữ liệu nêu chính là 457 mã chương 98
// — trùng khớp 1:1. Chúng không thiếu dữ liệu: mã ưu đãi riêng không có VAT độc
// lập, VAT đi theo mã thông thường tương ứng. Đây là câu trả lời cho việc rà
// soát còn treo ở Issue #34.

const CHAPTER_98_PREFIX = '98';

/** Mã này có thuộc chương 98 không? */
function isChapter98(hsCode) {
  return String(hsCode || '').startsWith(CHAPTER_98_PREFIX);
}

/**
 * Người dùng có đang CHỦ ĐỘNG hỏi về chương 98 không?
 * Chỉ khi đó mới trả mã chương 98 — vd gõ thẳng "9845" hoặc "chương 98".
 */
function userAskedForChapter98(query) {
  const q = String(query || '').trim();
  if (/^98[\d.]*$/.test(q.replace(/\s/g, ''))) return true;
  return /ch[uư]ơng\s*98|chapter\s*98|ưu đãi riêng/i.test(q);
}

/**
 * Lọc chương 98 khỏi danh sách ứng viên.
 *
 * @param {Array} items    Mảng ứng viên
 * @param {object} opts
 * @param {function} [opts.getHs]   Cách lấy mã HS từ mỗi phần tử (mặc định: item.hsCode ?? item.hs)
 * @param {string}  [opts.query]    Truy vấn gốc — để phát hiện người dùng chủ động hỏi ch.98
 * @param {boolean} [opts.include]  Ép buộc giữ lại (tham số API includeChapter98=1)
 * @returns {{items: Array, removed: number, reason: string|null}}
 */
function filterChapter98(items, opts = {}) {
  const list = Array.isArray(items) ? items : [];
  const { getHs, query, include } = opts;

  if (include === true || userAskedForChapter98(query)) {
    return { items: list, removed: 0, reason: 'người dùng chủ động hỏi chương 98' };
  }

  const pick = getHs || ((it) => (it && typeof it === 'object' ? it.hsCode ?? it.hs : it));
  const kept = list.filter((it) => !isChapter98(pick(it)));
  const removed = list.length - kept.length;

  // Không bao giờ trả về rỗng chỉ vì lọc: thà đưa ứng viên chương 98 kèm cảnh báo
  // còn hơn không đưa gì cả để người dùng không có đường tra tiếp.
  if (kept.length === 0 && list.length > 0) {
    return {
      items: list,
      removed: 0,
      reason: 'giữ lại vì lọc xong sẽ không còn ứng viên nào',
    };
  }

  return {
    items: kept,
    removed,
    reason: removed > 0 ? 'chương 98 là mã ưu đãi riêng, không phải kết luận phân loại' : null,
  };
}

/** Cảnh báo kèm khi vì lý do nào đó vẫn trả mã chương 98. */
function chapter98Warning(hsCode) {
  if (!isChapter98(hsCode)) return null;
  return {
    code: 'CHAPTER_98_SPECIAL_REGIME',
    severity: 'warn',
    message:
      `Mã ${hsCode} thuộc Chương 98 — mã thuế suất nhập khẩu ưu đãi RIÊNG, không phải kết luận phân loại thông thường. ` +
      'Hãy xác định mã ở chương 01–97 trước; chỉ khai theo chương 98 khi lô hàng đủ điều kiện hưởng chế độ ưu đãi đó.',
    suggestion: 'Tra lại mã tương ứng ở chương 01–97 và đối chiếu điều kiện áp dụng Chương 98.',
  };
}

module.exports = {
  CHAPTER_98_PREFIX,
  isChapter98,
  userAskedForChapter98,
  filterChapter98,
  chapter98Warning,
};
