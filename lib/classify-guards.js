// lib/classify-guards.js — các bước /api/suggest đã có cho tiêu đề Taobao, dùng chung cho
// /api/classify (kế hoạch OZSource H0). ERP gọi /api/classify, nên thiếu các bước này thì
// sửa ở /api/suggest không tới được ERP.
//
//   prepareClassifyInput : tiêu đề/tên tiếng Trung → dữ kiện tiếng Việt (lib/query-understand.js)
//   applyCodeGuards      : mâu thuẫn "có/không có" (cứng) + kiểm cấp 8 số (tư vấn) cho mã đầu
//   classifyStatus       : status + nextAction cùng nghĩa với /api/suggest (lib/suggest-status.js)

const { understandQuery, needsUnderstanding } = require('./query-understand');
const { checkSubheading, checkPolarity } = require('./subheading-check');
const { LOW_CONFIDENCE } = require('./suggest-status');
const { removeDiacritics } = require('./search-utils');

/**
 * Hồ sơ ERP có chữ Hán (tên hàng là tiêu đề Taobao, hoặc chỉ có nameZh mà thiếu chất liệu/
 * công dụng) → gọi bước hiểu hàng, bổ sung vào bản sao hồ sơ. Không bao giờ ném lỗi.
 * → { attrs: hồ sơ dùng để phân loại, understood, sourceText }
 */
async function prepareClassifyInput(attrs, opts = {}) {
  const nameIsZh = needsUnderstanding(attrs.tenHang);
  const zhOnly = !nameIsZh && needsUnderstanding(attrs.nameZh) && !attrs.chatLieu && !attrs.congDung;
  const sourceText = [attrs.tenHang, attrs.nameZh, attrs.specs].filter(Boolean).join(' | ');
  if (!nameIsZh && !zhOnly) {
    return { attrs, understood: { applied: false, reason: 'NO_CJK' }, sourceText };
  }
  const zhText = nameIsZh ? [attrs.tenHang, attrs.specs].filter(Boolean).join(' | ') : attrs.nameZh;
  const understood = await (opts.understand || understandQuery)(zhText);
  if (!understood.applied) return { attrs, understood, sourceText };

  const f = understood.facts || {};
  const out = { ...attrs };
  if (nameIsZh) {
    out.nameZh = attrs.nameZh || attrs.tenHang;
    out.tenHang = f.tenHangVi || attrs.tenHang;
  }
  out.chatLieu = attrs.chatLieu || f.chatLieu || null;
  out.congDung = attrs.congDung || f.congDung || null;
  out.specs = [
    attrs.specs,
    f.banChat,
    f.thanhPhan && `thành phần ${f.thanhPhan}`,
    f.quyCach && `quy cách ${f.quyCach}`,
  ].filter(Boolean).join('; ') || null;
  return { attrs: out, understood, sourceText };
}

/** Chữ dùng để kiểm mã: tiếng Việt sau bước hiểu hàng. */
function matchTextOf(attrs) {
  return [attrs.tenHang, attrs.chatLieu, attrs.congDung, attrs.chucNang, attrs.specs].filter(Boolean).join(' ');
}

/**
 * applyCodeGuards(results, text, { tax, skip }) → { results, polarity, subheading }
 * results: [{ hs, confidence, reason, ... }] đã qua validateClassifyResults.
 *  - Mâu thuẫn có/không (nhãn "không có ga", mô tả "có ga"): mã đầu xuống cuối, mã không
 *    mâu thuẫn (hoặc dòng cùng nhóm đúng đặc tính) lên đầu. Đo trên 5.058 tờ khai thật:
 *    0 mã đúng bị bắt nhầm.
 *  - Kiểm cấp 8 số: chỉ tự đổi khi lý do của AI tự phủ định dòng nó chọn; còn lại chỉ cảnh
 *    báo (quy tắc chữ đặc trưng bắt nhầm 3,1 % mã đúng).
 */
function applyCodeGuards(results, text, { tax, skip = false } = {}) {
  let list = [...results];
  let polarity = null;
  let subheading = null;
  const top = list[0];
  if (skip || !top || top.hs.length !== 8) return { results: list, polarity, subheading };

  const pol = checkPolarity(top.hs, text);
  if (!pol.ok) {
    const okIdx = list.findIndex((r, i) => i > 0 && r.hs.length === 8 && checkPolarity(r.hs, text).ok);
    let promoted = okIdx > 0 ? list.splice(okIdx, 1)[0] : null;
    if (!promoted && pol.alternative && tax[pol.alternative]) {
      promoted = { hs: pol.alternative, hsLevel: 8, confidence: null, reason: pol.reasonVi, addedByPolarityCheck: true };
    }
    const demoted = { ...list.shift(), polarityConflict: pol.conflicts };
    list = [...(promoted ? [promoted] : []), ...list].slice(0, 2).concat(demoted);
    polarity = { ...pol, promotedHs: promoted?.hs || null };
    return { results: list, polarity, subheading };
  }

  const sub = checkSubheading(top.hs, text);
  if (!sub.ok) {
    const why = removeDiacritics(String(top.reason || '').toLowerCase());
    const selfContradicts = sub.distinctive.some((t) => new RegExp(`khong (phai|la|thuoc)[^.;]{0,40}\\b${t}\\b`).test(why));
    const alt = sub.alternative && tax[sub.alternative] ? sub.alternative : null;
    subheading = { ...sub, autoSwapped: Boolean(selfContradicts && alt) };
    if (alt) {
      const idx = list.findIndex((r) => r.hs === alt);
      const entry = idx >= 0
        ? list.splice(idx, 1)[0]
        : { hs: alt, hsLevel: 8, confidence: selfContradicts ? top.confidence : null, reason: sub.reasonVi, addedBySubheadingCheck: true };
      if (selfContradicts) list.unshift(entry);
      else list.push(entry);
      list = list.slice(0, 3);
    }
  }
  return { results: list, polarity, subheading };
}

/**
 * classifyStatus → { status, nextAction } — cùng bảng trạng thái với /api/suggest
 * (docs/erp-tich-hop-hs.md): ERP đọc status trước, không lấy thẳng results[0].
 */
function classifyStatus({ results = [], headings = [], engineFailed = null, featureConflict = null, resolverResolved = false, missingStructured = [], missing = [] }) {
  const optionsHs = results.map((r) => r.hs);
  if (!headings.length) {
    return { status: 'NO_CANDIDATES', nextAction: { type: 'REPHRASE', hintVi: 'Mô tả rõ hơn: tên hàng thông dụng, chất liệu, công dụng/chức năng, thông số chính.' } };
  }
  if (engineFailed) {
    return {
      status: 'NEEDS_EXPERT',
      nextAction: {
        type: engineFailed === 'ENGINE_TIMEOUT' ? 'RETRY' : 'HUMAN_REVIEW',
        reasonCode: engineFailed,
        reasonVi: engineFailed === 'ENGINE_TIMEOUT'
          ? 'AI bận hoặc quá thời gian — gọi lại sau ít phút.'
          : 'Mã AI đưa ra không có trong biểu thuế hoặc ngoài nhóm ứng viên — cần chuyên viên chọn trong nhóm ứng viên.',
        optionsHeadings: headings,
      },
    };
  }
  if (featureConflict) {
    return { status: 'NEEDS_EXPERT', nextAction: { type: 'HUMAN_REVIEW', reasonCode: 'FEATURE_CONFLICT', reasonVi: featureConflict.reasonVi, optionsHs } };
  }
  const top = results[0];
  if (resolverResolved) {
    return { status: 'RESOLVED_BY_TABLE', nextAction: { type: 'USER_CONFIRM', optionsHs } };
  }
  if (top && top.confidence != null && Number(top.confidence) < LOW_CONFIDENCE) {
    return {
      status: 'NEEDS_EXPERT',
      nextAction: {
        type: 'HUMAN_REVIEW',
        reasonCode: 'LOW_CONFIDENCE',
        reasonVi: `AI chỉ tự tin ${top.confidence}/100 với gợi ý đầu — có thể không ứng viên nào đúng bản chất hàng. Cần chuyên viên chọn mã hoặc bổ sung mô tả.`,
        optionsHs,
      },
    };
  }
  if (top && top.hs.length < 8) {
    return {
      status: 'NEED_FACTS',
      nextAction: {
        type: 'ASK_USER',
        questions: missingStructured.length
          ? missingStructured.map((m) => ({ attribute: m.key, questionVi: m.questionVi, questionZh: m.questionZh }))
          : missing.map((q) => ({ attribute: null, questionVi: q })),
        howToAnswerVi: 'Bổ sung dữ kiện vào attributes (khóa chuẩn) rồi gọi lại /api/classify.',
      },
    };
  }
  return { status: 'REVIEW', nextAction: { type: 'USER_CONFIRM', optionsHs } };
}

module.exports = { prepareClassifyInput, matchTextOf, applyCodeGuards, classifyStatus };
