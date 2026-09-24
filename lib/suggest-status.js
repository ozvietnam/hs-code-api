/**
 * Trạng thái + bước tiếp theo cho /api/suggest — để một agent (kể cả mô hình
 * yếu) không phải tự suy luận xem nên làm gì với response.
 *
 *   status          nghĩa                                   nextAction.type
 *   NO_CANDIDATES   không tìm được ứng viên                  REPHRASE
 *   NEED_FACTS      bảng quyết định cần thêm dữ kiện         ASK_USER → CALL lại với facts
 *   NEEDS_EXPERT    AI lỗi / mọi mã AI trả bị loại           HUMAN_REVIEW
 *   RESOLVED_BY_TABLE bảng ĐÃ VERIFIED chốt được mã          USER_CONFIRM
 *   REVIEW          có gợi ý, cần người khai chọn/xác nhận   USER_CONFIRM
 *
 * Không có trạng thái "tự động chốt": confidence chưa hiệu chuẩn.
 */

function buildSuggestStatus({
  description,
  suggestions = [],
  engine = 'llm',
  missingFacts = [],
  rejectedFacts = [],
  facts = {},
  topDecision = null,
}) {
  if (!suggestions.length) {
    return {
      status: 'NO_CANDIDATES',
      nextAction: {
        type: 'REPHRASE',
        hintVi: 'Mô tả rõ hơn: tên hàng thông dụng, chất liệu, công dụng/chức năng, thông số chính.',
      },
    };
  }
  if (missingFacts.length || rejectedFacts.length) {
    const questions = [
      ...rejectedFacts.map((r) => ({
        attribute: r.attribute,
        questionVi: `Câu trả lời "${r.value}" chưa hợp lệ — chọn một trong các lựa chọn.`,
        ...(r.optionsVi ? { optionsVi: r.optionsVi } : {}),
        ...(r.unit ? { unit: r.unit } : {}),
      })),
      ...missingFacts
        .filter((m) => !rejectedFacts.some((r) => r.attribute === m.attribute))
        .map((m) => ({
          attribute: m.attribute,
          questionVi: m.questionVi,
          ...(m.optionsVi ? { optionsVi: m.optionsVi } : {}),
          ...(m.unit ? { unit: m.unit } : {}),
        })),
    ];
    return {
      status: 'NEED_FACTS',
      nextAction: {
        type: 'ASK_USER',
        questions,
        howToAnswerVi: 'Hỏi người dùng từng câu. Với câu có optionsVi, gửi value, số index hoặc nhãn tiếng Việt đều được. Rồi gọi lại endpoint với facts.',
        then: {
          type: 'CALL',
          method: 'POST',
          endpoint: '/api/suggest',
          body: {
            description,
            facts: { ...facts, ...Object.fromEntries(questions.map((q) => [q.attribute, `<trả lời cho ${q.attribute}>`])) },
          },
        },
      },
    };
  }
  if (engine !== 'llm') {
    return {
      status: 'NEEDS_EXPERT',
      nextAction: {
        type: 'HUMAN_REVIEW',
        reasonVi: 'Gợi ý chỉ theo thứ tự tìm kiếm (AI không chạy được hoặc mã AI đưa ra bị loại). Cần chuyên viên chọn mã.',
        optionsHs: suggestions.map((s) => s.hsCode),
      },
    };
  }
  if (topDecision?.status === 'RESOLVED' && topDecision.tableVerified && suggestions[0]?.hsCode === topDecision.hs) {
    return {
      status: 'RESOLVED_BY_TABLE',
      nextAction: { type: 'USER_CONFIRM', hsCode: topDecision.hs, reasonVi: topDecision.reasonVi || null },
    };
  }
  return {
    status: 'REVIEW',
    nextAction: {
      type: 'USER_CONFIRM',
      optionsHs: suggestions.map((s) => s.hsCode),
      reasonVi: 'Trình bày các gợi ý kèm lý do và cảnh báo; người khai chọn và xác nhận. Không tự chốt theo confidence.',
    },
  };
}

module.exports = { buildSuggestStatus };
