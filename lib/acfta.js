/**
 * Đọc thuế suất ACFTA (ASEAN–Trung Quốc) thành dữ liệu có cấu trúc.
 *
 * VÌ SAO QUAN TRỌNG:
 * Cột `acfta` trong data/tax.json là chuỗi nguyên văn của biểu thuế, VD
 * "0 (-CN)". Phần "(-CN)" nghĩa là nước trong ngoặc KHÔNG được hưởng mức ưu
 * đãi đó. 510 dòng loại trừ đích danh Trung Quốc. Máy gọi API mà chỉ đọc số
 * đầu tiên sẽ báo 0% cho hàng xuất xứ Trung Quốc trong khi thực tế phải nộp
 * MFN — sai tiền thuế thật, bị truy thu.
 *
 * QUY ƯỚC CHUỖI:
 *   "5"                 → mức 5%, mọi nước ACFTA được hưởng
 *   "0 (-KH, CN)"       → mức 0%, Campuchia và Trung Quốc không được hưởng
 *   "*"                 → không có ưu đãi ACFTA cho dòng này
 *   ""                  → không có dữ liệu (chủ yếu chương 98)
 *   "0 (-MM, TH)/0"     → nhiều mức gộp từ các dòng 10 số của biểu gốc — không
 *                          tự chọn được mức nào, trả `needsReview: true`
 *
 * `taxAcfta` (chuỗi thô) vẫn giữ nguyên trong response để ERP cũ không vỡ.
 */

const PARTY_CODES = ['BN', 'KH', 'ID', 'LA', 'MY', 'MM', 'PH', 'SG', 'TH', 'VN', 'CN'];

function parseSegment(text) {
  const m = String(text).trim().match(/^(\d+(?:\.\d+)?)\s*(?:\(\s*-\s*([A-Z,\s]+)\))?$/);
  if (!m) return null;
  const excludedCountries = m[2]
    ? m[2].split(',').map((c) => c.trim()).filter(Boolean)
    : [];
  return { rate: Number(m[1]), excludedCountries };
}

/**
 * @param {string} raw giá trị cột `acfta`
 * @returns {null|{raw:string, available:boolean, rate:number|null,
 *   excludedCountries:string[], segments:object[], needsReview:boolean}}
 */
function parseAcfta(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  if (text === '*') {
    return { raw: text, available: false, rate: null, excludedCountries: [], segments: [], needsReview: false };
  }

  const parts = text.split('/');
  const segments = parts.map(parseSegment);
  if (segments.some((s) => s === null)) {
    // Định dạng lạ — không đoán, bắt người xem lại.
    return { raw: text, available: null, rate: null, excludedCountries: [], segments: [], needsReview: true };
  }

  const excludedCountries = [...new Set(segments.flatMap((s) => s.excludedCountries))];
  const sameRate = segments.every((s) => s.rate === segments[0].rate);
  const sameExcl = segments.every(
    (s) => s.excludedCountries.join(',') === segments[0].excludedCountries.join(','),
  );
  const single = segments.length === 1 || (sameRate && sameExcl);

  return {
    raw: text,
    available: true,
    rate: single ? segments[0].rate : null,
    excludedCountries,
    segments,
    needsReview: !single,
  };
}

/**
 * Mức ACFTA áp cho một nước xuất xứ cụ thể.
 * @param {string} raw giá trị cột `acfta`
 * @param {string} origin mã ISO-2, mặc định CN
 * @param {string|null} mfn cột `mfn` cùng dòng — để cảnh báo khi ACFTA > MFN
 * @returns {null|{origin:string, eligible:boolean|null, rate:number|null, noteVi:string}}
 */
function acftaForOrigin(raw, origin = 'CN', mfn = null) {
  const code = String(origin || '').trim().toUpperCase();
  const parsed = parseAcfta(raw);
  if (!parsed) return null;

  if (!PARTY_CODES.includes(code)) {
    return { origin: code, eligible: false, rate: null, noteVi: `${code} không phải thành viên ACFTA — áp MFN hoặc FTA khác.` };
  }
  if (parsed.available === false) {
    return { origin: code, eligible: false, rate: null, noteVi: 'Dòng hàng không có ưu đãi ACFTA ("*") — áp MFN.' };
  }
  if (parsed.needsReview) {
    const allExcluded = parsed.segments.length > 0
      && parsed.segments.every((s) => s.excludedCountries.includes(code));
    const noneExcluded = parsed.segments.every((s) => !s.excludedCountries.includes(code));
    const rates = new Set(parsed.segments.map((s) => s.rate));
    if (noneExcluded && rates.size === 1) {
      // Nhiều dòng con nhưng với nước này thì mọi dòng cùng một mức.
      return withMfn({ origin: code, eligible: true, rate: parsed.segments[0].rate,
        noteVi: `ACFTA ${parsed.segments[0].rate}% khi có C/O mẫu E hợp lệ.` }, mfn);
    }
    if (allExcluded) {
      return { origin: code, eligible: false, rate: null, noteVi: `${code} bị loại trừ khỏi ưu đãi ACFTA ở mọi dòng con — áp MFN.` };
    }
    return {
      origin: code,
      eligible: null,
      rate: null,
      noteVi: `Biểu gốc có nhiều mức ACFTA cho mã này ("${parsed.raw}") — tra dòng 10 số trong Nghị định biểu thuế ACFTA trước khi khai.`,
    };
  }
  if (parsed.excludedCountries.includes(code)) {
    return {
      origin: code,
      eligible: false,
      rate: null,
      noteVi: `Hàng xuất xứ ${code} KHÔNG được hưởng mức ACFTA ${parsed.rate}% ("${parsed.raw}") — áp MFN.`,
    };
  }
  return withMfn({
    origin: code,
    eligible: true,
    rate: parsed.rate,
    noteVi: `ACFTA ${parsed.rate}% khi có C/O mẫu E hợp lệ.`,
  }, mfn);
}

/**
 * 336 dòng có mức ACFTA CAO hơn MFN (VD 24031110: MFN 30, ACFTA 50). Khi đó
 * xin C/O mẫu E là thiệt — báo rõ để người khai chọn MFN.
 */
function withMfn(result, mfn) {
  const m = Number(String(mfn ?? '').trim());
  if (mfn === null || mfn === '' || !Number.isFinite(m) || !/^\d+(\.\d+)?$/.test(String(mfn).trim())) return result;
  if (result.rate !== null && result.rate > m) {
    return {
      ...result,
      higherThanMfn: true,
      noteVi: `ACFTA ${result.rate}% CAO HƠN MFN ${m}% — nên khai MFN, không dùng C/O mẫu E.`,
    };
  }
  return result;
}

module.exports = { parseAcfta, acftaForOrigin, PARTY_CODES };
