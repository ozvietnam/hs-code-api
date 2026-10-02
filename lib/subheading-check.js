// Kiểm chứng cấp 8 số: dòng được chọn có CHỮ ĐẶC TRƯNG riêng (so với các dòng anh
// em cùng phân nhóm 6 số) thì mô tả hàng phải có dấu hiệu đó.
//
// VÌ SAO: LLM hay chọn dòng cụ thể dù mô tả không chứng minh điều kiện của dòng —
// Coca-Cola → 2202.10.20 "Nước tăng lực" trong khi lý do nó tự viết là "không phải
// nước tăng lực". Đây là phép so sánh dòng anh em mà người khai làm ở cấp phân
// nhóm quốc gia; không phải trích GIR, nên chỉ trả tín hiệu, không gắn nhãn GIR
// (CLAUDE.md rule 6 — mọi nhãn GIR đi qua lib/gir.js).

const { taxData } = require('./data');
const { removeDiacritics } = require('./search-utils');

// Từ chức năng / đơn vị: có mặt ở mọi nhãn, không phân biệt được dòng nào với dòng nào.
const STOP = new Set(`va hoac cua cho co khong loai khac dung bang tu tren duoi cac nhung da hay the nay voi trong ngoai
den la mot hon it nhat qua tinh theo dang kieu thuoc chi tru ke ca kem boi duoc chua su rieng nhu cai chiec bo
kg g cm mm m l ml w kw v a x`.split(/\s+/));

const LOAI_KHAC_RE = /^[-\s]*lo[aạ]i kh[aá]c\s*$/i;

function tokens(text) {
  return new Set(
    removeDiacritics(String(text || '').toLowerCase())
      .replace(/\([A-Z]{2,5}\)/gi, ' ') // chú thích kiểu "(SEN)" trong nhãn biểu thuế
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 2 && !STOP.has(w) && !/^\d+$/.test(w)),
  );
}

let _by6 = null;
function siblingsOf(code) {
  if (!_by6) {
    _by6 = new Map();
    for (const hs of Object.keys(taxData)) {
      if (!/^\d{8}$/.test(hs)) continue;
      const k = hs.slice(0, 6);
      if (!_by6.has(k)) _by6.set(k, []);
      _by6.get(k).push(hs);
    }
  }
  return (_by6.get(code.slice(0, 6)) || []).filter((c) => c !== code);
}

function labelOf(code) {
  return String(taxData[code]?.vn || '');
}

/**
 * checkSubheading(hsCode, text) →
 *   { ok: true, reason } |
 *   { ok: false, hsCode, distinctive: [...], alternative: hs|null, alternativeName, reasonVi }
 */
function checkSubheading(hsCode, text) {
  const code = String(hsCode || '').replace(/\D/g, '');
  if (code.length !== 8 || !taxData[code]) return { ok: true, reason: 'NOT_8_DIGIT' };
  const label = labelOf(code);
  if (LOAI_KHAC_RE.test(label)) return { ok: true, reason: 'RESIDUAL' };
  const sibs = siblingsOf(code);
  if (!sibs.length) return { ok: true, reason: 'NO_SIBLINGS' };

  const mine = tokens(label);
  const others = new Set();
  for (const s of sibs) for (const t of tokens(labelOf(s))) others.add(t);
  const distinctive = [...mine].filter((t) => !others.has(t));
  if (!distinctive.length) return { ok: true, reason: 'NO_DISTINCTIVE_WORDS' };

  const textToks = tokens(text);
  if (distinctive.some((t) => textToks.has(t))) return { ok: true, reason: 'SUPPORTED' };

  // Dòng anh em hợp hơn: chữ đặc trưng của nó có trong mô tả; không có thì dòng "Loại khác".
  let best = null;
  for (const s of sibs) {
    const lab = labelOf(s);
    if (LOAI_KHAC_RE.test(lab)) continue;
    const st = tokens(lab);
    const sOthers = new Set();
    for (const o of [code, ...sibs]) if (o !== s) for (const t of tokens(labelOf(o))) sOthers.add(t);
    const sDistinct = [...st].filter((t) => !sOthers.has(t));
    const support = sDistinct.filter((t) => textToks.has(t)).length;
    const overlap = [...st].filter((t) => textToks.has(t)).length;
    if (!support && !sDistinct.length && !overlap) continue;
    const score = support * 10 + overlap;
    if (support > 0 || (!sDistinct.length && overlap > 0) || overlap >= 2) {
      if (!best || score > best.score) best = { hs: s, score };
    }
  }
  const residual = sibs.find((s) => LOAI_KHAC_RE.test(labelOf(s))) || null;
  const alternative = best?.hs || residual;
  return {
    ok: false,
    hsCode: code,
    distinctive,
    alternative,
    alternativeName: alternative ? labelOf(alternative) : null,
    reasonVi: `Mã ${code} ("${label.replace(/^[-\s]+/, '')}") đòi dấu hiệu ${distinctive.map((t) => `"${t}"`).join(', ')} nhưng mô tả không có.`
      + (alternative ? ` Dòng cùng phân nhóm phù hợp hơn: ${alternative} ("${labelOf(alternative).replace(/^[-\s]+/, '')}").` : ''),
  };
}

module.exports = { checkSubheading, tokens };
