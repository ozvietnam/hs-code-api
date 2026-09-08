// lib/residual-guard.js — Chống thiên vị mã cụ thể, sửa lỗi hệ thống lớn nhất.
//
// PHÁT HIỆN TỪ BENCHMARK 200 TỜ KHAI THẬT
//   · 52% tờ khai thật (103/200) có đáp án là mã "Loại khác" (residual)
//   · Hệ thống đoán đúng nhóm này chỉ 1,0%, trong khi mã cụ thể đạt 14,4%
//   · Trong lỗi CÙNG nhóm 4 số: 74% là "đúng là Loại khác nhưng đoán mã cụ thể"
//   · Chiều ngược lại: 0%. Thiên vị một chiều tuyệt đối.
//
// VÌ SAO XẢY RA
// Mô hình nhìn mô tả hàng chi tiết rồi khớp với phân nhóm nào "nghe chi tiết
// giống nhất". Nhưng luật phân loại không hoạt động như vậy: một phân nhóm cụ
// thể CHỈ áp dụng khi hàng hoá THOẢ ĐIỀU KIỆN của phân nhóm đó; không thoả thì
// rơi về "Loại khác".
//
// GIR 3(a) nói "nhóm có mô tả cụ thể nhất được ưu tiên" — nhưng "cụ thể nhất"
// nghĩa là nhóm mà hàng hoá THỰC SỰ ĐÁP ỨNG các điều kiện, không phải nhóm có
// tên dài và kêu nhất. Đây đúng là chỗ mô hình hiểu sai.
//
// CÁCH LÀM: không lật ngược thiên vị (luôn chọn residual cũng sai như luôn chọn
// cụ thể). Thay vào đó KIỂM BẰNG CHỨNG: nếu mô tả hàng không hề nhắc tới điều
// kiện đặc trưng của phân nhóm cụ thể, thì phân nhóm đó chưa được chứng minh,
// và mã residual cùng cấp là lựa chọn đúng luật hơn.

const { taxData, normalizeHs } = require('./data');

const RESIDUAL_RE = /^(loại khác|loại kh[aá]c|khác)\b/i;

/** Bỏ dấu gạch phân cấp đầu tên mã trong biểu thuế ("- - Loại khác"). */
function cleanName(hsCode) {
  return String(taxData[hsCode]?.vn || '').replace(/^[-\s]+/, '').trim();
}

/** Mã này có phải mã "Loại khác" / "Khác" không? */
function isResidual(hsCode) {
  return RESIDUAL_RE.test(cleanName(hsCode));
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

// Từ quá phổ biến, xuất hiện ở đâu cũng có — không dùng làm bằng chứng phân biệt.
const STOPWORDS = new Set([
  'loai', 'khac', 'cac', 'va', 'hoac', 'cua', 'dung', 'cho', 'co', 'khong', 'la',
  'tu', 'den', 'tren', 'duoi', 'voi', 'trong', 'ngoai', 'bang', 'theo', 'thuoc',
  'nhom', 'phan', 'san', 'pham', 'hang', 'hoa', 'bo', 'phan', 'kieu', 'dang',
  'may', 'thiet', 'bi', 'kem', 'khi', 'ke', 'ca', 'nhu', 'da', 'chua', 'mot',
]);

/**
 * Rút các từ khoá ĐẶC TRƯNG của một mã cụ thể — tức phần khiến nó khác với anh em
 * cùng cấp. Đây là điều kiện mà hàng hoá phải thoả thì mã đó mới áp được.
 */
function distinguishingTerms(hsCode) {
  const name = cleanName(hsCode);
  if (!name || isResidual(hsCode)) return [];
  return [
    ...new Set(
      norm(name)
        .replace(/\([^)]*\)/g, ' ')
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !/^\d+$/.test(w)),
    ),
  ];
}

/**
 * Tìm mã residual cùng cấp với mã đã chọn.
 * Ưu tiên residual cùng phân nhóm 6 số (anh em ruột), sau đó tới cấp nhóm 4 số.
 */
function findResidualSibling(hsCode) {
  // Kiểm ĐỘ DÀI GỐC trước khi chuẩn hoá: normalizeHs đệm số 0 ("8481" → "84810000"),
  // nên nếu chuẩn hoá trước thì một nhóm 4 số sẽ bị hiểu nhầm thành mã 8 số cụ
  // thể — và có thể là mã không tồn tại trong biểu thuế.
  const raw = String(hsCode || '').replace(/\D/g, '');
  if (raw.length < 6) return null;
  const hs = normalizeHs(hsCode) || raw;
  const h6 = hs.slice(0, 6);
  const h4 = hs.slice(0, 4);

  const all = Object.keys(taxData);
  const sameSub = all.filter((c) => c !== hs && c.startsWith(h6) && isResidual(c));
  if (sameSub.length) return { hsCode: sameSub.sort().pop(), level: 'phân nhóm 6 số' };

  const sameHeading = all.filter((c) => c !== hs && c.startsWith(h4) && isResidual(c));
  if (sameHeading.length) return { hsCode: sameHeading.sort().pop(), level: 'nhóm 4 số' };

  return null;
}

/**
 * Mô tả hàng có chứng minh được các điều kiện của mã cụ thể không?
 *
 * @returns {{supported: boolean, matched: string[], terms: string[], ratio: number}}
 */
function evidenceForSpecific(hsCode, description) {
  const terms = distinguishingTerms(hsCode);
  if (!terms.length) return { supported: true, matched: [], terms, ratio: 1 };
  const d = norm(description);
  const matched = terms.filter((t) => d.includes(t));
  return {
    supported: matched.length > 0,
    matched,
    terms,
    ratio: terms.length ? matched.length / terms.length : 1,
  };
}

/**
 * Kiểm tra xem có nên chuyển sang mã residual không.
 *
 * KHÔNG lật ngược thiên vị — chỉ đề nghị đổi khi mô tả hàng KHÔNG có bất kỳ bằng
 * chứng nào cho điều kiện đặc trưng của mã cụ thể đã chọn.
 *
 * @param {object} input
 * @param {string} input.hsCode        Mã hệ thống đang chọn
 * @param {string} input.description   Mô tả hàng hoá
 * @param {Array}  [input.candidates]  Ứng viên khác (để không đề xuất mã ngoài danh sách)
 * @returns {null|{suggestedHs, currentHs, level, reasonVi, evidence, girRule}}
 */
function checkResidualPreference({ hsCode, description, candidates } = {}) {
  // Như trên: chỉ nhận mã đã đủ cụ thể (>=6 chữ số gốc), không nhận nhóm 4 số.
  const raw = String(hsCode || '').replace(/\D/g, '');
  if (raw.length < 6) return null;
  const hs = normalizeHs(hsCode) || raw;
  if (!hs) return null;
  if (isResidual(hs)) return null; // đã là residual rồi
  if (!taxData[hs]) return null;

  const ev = evidenceForSpecific(hs, description);
  if (ev.supported) return null; // mô tả có chứng minh điều kiện → giữ nguyên

  const sibling = findResidualSibling(hs);
  if (!sibling) return null;

  // Nếu có danh sách ứng viên mà mã residual không nằm trong đó, vẫn đề xuất
  // nhưng đánh dấu để tầng trên quyết định.
  const inCandidates = Array.isArray(candidates)
    ? candidates.some((c) => String(c?.hsCode ?? c) === sibling.hsCode)
    : null;

  return {
    currentHs: hs,
    currentName: cleanName(hs),
    suggestedHs: sibling.hsCode,
    suggestedName: cleanName(sibling.hsCode),
    level: sibling.level,
    girRule: 'GIR 3(a)',
    reasonVi:
      `Mô tả hàng không nêu bất kỳ điều kiện đặc trưng nào của mã ${hs} ` +
      `("${cleanName(hs)}"). Một phân nhóm cụ thể chỉ áp dụng khi hàng hoá thoả điều kiện của nó; ` +
      `chưa chứng minh được thì mã "${cleanName(sibling.hsCode)}" (${sibling.hsCode}) ở cấp ${sibling.level} là lựa chọn đúng luật hơn.`,
    evidence: {
      requiredTerms: ev.terms.slice(0, 12),
      matchedTerms: ev.matched,
      matchRatio: Number(ev.ratio.toFixed(2)),
      residualInCandidates: inCandidates,
    },
  };
}

module.exports = {
  isResidual,
  cleanName,
  distinguishingTerms,
  findResidualSibling,
  evidenceForSpecific,
  checkResidualPreference,
};
