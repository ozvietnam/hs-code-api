/**
 * Bóc câu hỏi thành thực thể: danh từ lõi + cơ cấu + thông số + mác vật liệu.
 *
 * VÌ SAO CẦN — ca thật đã tái hiện:
 *   "bàn nâng thủy lực"                   → 25223000 Vôi thủy lực
 *   "xe bàn nâng thủy lực 500kg cao 1.5m" → 73043120 Ống dẫn chịu áp lực cao
 * Tầng tìm kiếm khớp "thủy lực" như từ khoá thường nên dính vôi, xi măng, dầu
 * phanh; còn "500kg", "1.5m" bị NOISE_TOKEN vứt đi thay vì bóc ra. Danh từ lõi
 * "bàn nâng" — thứ duy nhất nói lên mặt hàng — không được ưu tiên gì.
 *
 * Registry thuộc tính (lib/attributes.js) có 32 regex dò, nhưng chỉ trả lời
 * CÓ/KHÔNG (isPresent). Ở đây bóc ra GIÁ TRỊ và, quan trọng hơn, GỠ chúng khỏi
 * câu để phần còn lại là danh từ lõi đem đi tìm.
 *
 * KHÔNG dùng model. Toàn bộ là regex + từ điển JSON, đúng kiểu hs-aliases và
 * trade-synonyms: chạy được trên serverless, không có gì để "học sai".
 *
 * RÀO AN TOÀN — lý do tồn tại, đừng gỡ:
 *   · Alias và từ điển tên thương mại vẫn chạy trên CÂU GỐC (search-utils lo),
 *     nên "xi lanh khí nén" → 8412 qua alias không bị ảnh hưởng.
 *   · Cơ cấu chỉ bị gỡ khi nó là TÍNH CHẤT của mặt hàng khác. "dầu thủy lực"
 *     thì "thủy lực" là một phần tên hàng — mechanisms.json khai
 *     keepWhenHeadNounIs để giữ. Gỡ nhầm ở đây là mất luôn mặt hàng.
 *   · Gỡ xong mà không còn từ nào ≥3 ký tự thì trả về câu gốc. Thà nhiễu còn
 *     hơn rỗng.
 */
const mechanismsData = require('../data/mechanisms.json');

function removeDiacritics(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

const fold = (s) => removeDiacritics(String(s || '').toLowerCase()).replace(/\s+/g, ' ').trim();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Đơn vị đo. Khớp trên bản KHÔNG dấu, chữ thường ("tan" = tấn, "lit" = lít).
 * Thứ tự: đơn vị dài trước để "m3/h" không bị "m" ăn mất.
 */
const UNITS = [
  'm3/h', 'm3', 'kva', 'kw', 'hp', 'mah', 'kg', 'tan', 'gram', 'g',
  'mm', 'ly', 'cm', 'inch', 'in', 'm', 'ml', 'lit', 'l', 'v', 'a', 'w', 'ghz', 'mhz', 'hz',
  'gb', 'tb', 'dn', 'phi', 'pha', 'btu', 'ton', 'rpm', 'bar', 'psi', 'mpa',
];
// "ly" là cách dân thép gọi milimét ("tôn 0,8 ly") — trả về mm để bảng quyết định so được.
const UNIT_CANON = { tan: 'tấn', ton: 'tấn', lit: 'lít', gram: 'g', in: 'inch', ly: 'mm' };

/** Từ dẫn thông số tiếng Việt: "tải trọng 500kg", "cao 1.5m", "dày 20mm". */
const DIMENSION_WORDS = {
  'tai trong': 'capacity', 'suc nang': 'capacity',
  cao: 'height', 'chieu cao': 'height', dai: 'length', 'chieu dai': 'length',
  rong: 'width', 'chieu rong': 'width', 'kho': 'width', day: 'thickness', 'do day': 'thickness',
  'duong kinh': 'diameter', 'dk': 'diameter', 'cong suat': 'power', 'dien ap': 'voltage',
  'dung tich': 'volume', 'the tich': 'volume', 'luu luong': 'flow', 'ap suat': 'pressure',
  'toc do': 'speed', 'trong luong': 'weight',
};

const UNIT_RE = new RegExp(
  `(?:\\b(${Object.keys(DIMENSION_WORDS).map(escapeRe).sort((a, b) => b.length - a.length).join('|')})\\s*[:=]?\\s*)?` +
    `(\\d+(?:[.,]\\d+)?)\\s*(${UNITS.map(escapeRe).join('|')})(?![a-z0-9])`,
  'g'
);

/** Mác vật liệu hay gặp. Chỉ bóc để trả ra; ánh xạ mã do trade-synonyms lo. */
const GRADE_RE =
  /\b(p20|2311|2738|nak80|718h?|s136|skd\d{1,2}|skh\d{1,2}|dc53|d2|h13|s45c|s50c|q235[ab]?|q345[ab]?|ss\d{3}|sus\d{3}|inox\s?\d{3}|a36|6061|7075|al\d{4}|abs|pp|pe|pvc|hdpe|ldpe|pet|pa6|pa66|pom|pc)\b/gi;

/** Từ điển cơ cấu, chuẩn hoá trước một lần. */
const MECHANISMS = mechanismsData.entries.map((e) => ({
  ...e,
  _terms: e.terms.map(fold).sort((a, b) => b.length - a.length),
  _keep: (e.keepWhenHeadNounIs || []).map(fold),
}));

/**
 * Xoá các đoạn [start,end) khỏi chuỗi, giữ khoảng trắng sạch.
 * Làm trên bản không dấu để khớp, nhưng phải xoá trên bản gốc theo TỪ —
 * vì bỏ dấu đổi độ dài chuỗi, không dùng chỉ số ký tự chéo được.
 */
function stripWords(original, foldedPhrases) {
  const words = original.split(/\s+/).filter(Boolean);
  const foldedWords = words.map(fold);
  const drop = new Array(words.length).fill(false);
  for (const phrase of foldedPhrases) {
    const p = phrase.split(' ');
    for (let i = 0; i + p.length <= foldedWords.length; i++) {
      if (p.every((w, k) => foldedWords[i + k] === w)) for (let k = 0; k < p.length; k++) drop[i + k] = true;
    }
  }
  return words.filter((_, i) => !drop[i]).join(' ');
}

/**
 * @param {string} query
 * @returns {{original:string, coreVi:string, specs:Array, mechanisms:Array,
 *            materialGrades:string[], stripped:boolean}}
 */
function parseCommodityQuery(query) {
  const original = String(query || '').trim();
  const empty = { original, coreVi: original, specs: [], mechanisms: [], materialGrades: [], stripped: false };
  if (!original) return empty;

  const folded = fold(original);

  // 1) Thông số: số + đơn vị (+ từ dẫn nếu có).
  const specs = [];
  const specPhrases = [];
  for (const m of folded.matchAll(UNIT_RE)) {
    const [raw, dimWord, num, unit] = m;
    specs.push({
      dimension: dimWord ? DIMENSION_WORDS[dimWord] : null,
      value: Number(num.replace(',', '.')),
      unit: UNIT_CANON[unit] || unit,
      raw: raw.trim(),
    });
    specPhrases.push(raw.trim());
  }

  // 2) Mác vật liệu.
  const materialGrades = [...new Set([...folded.matchAll(GRADE_RE)].map((m) => m[1].toUpperCase()))];

  // 3) Cơ cấu — ghi nhận, và gỡ nếu không phải một phần tên hàng.
  const mechanisms = [];
  const mechPhrases = [];
  for (const e of MECHANISMS) {
    const hit = e._terms.find((t) => new RegExp(`(^|\\s)${escapeRe(t)}(\\s|$)`).test(folded));
    if (!hit) continue;
    const partOfName = e._keep.some((k) => new RegExp(`(^|\\s)${escapeRe(k)}(\\s|$)`).test(folded));
    mechanisms.push({
      canonical: e.canonical,
      matched: hit,
      ...(e.driveType ? { driveType: e.driveType } : {}),
      ...(e.mobility ? { mobility: e.mobility } : {}),
      keptInCore: partOfName,
    });
    if (!partOfName) mechPhrases.push(hit);
  }

  // 4) Danh từ lõi = câu gốc trừ thông số trừ cơ cấu. Rỗng thì giữ câu gốc.
  // specPhrases đã chứa cả từ dẫn đi kèm ("cao 1.5m"), nên chỉ những từ dẫn
  // THỰC SỰ dẫn một con số mới bị gỡ. "nâng" trong "bàn nâng" đứng một mình thì
  // là tên hàng — bản đầu gỡ tuốt và biến "xe bàn nâng" thành "xe bàn".
  let coreVi = stripWords(original, [...specPhrases, ...mechPhrases]);
  const stripped = coreVi !== original;
  if (!coreVi.split(/\s+/).some((w) => fold(w).length >= 3)) coreVi = original;

  return { original, coreVi, specs, mechanisms, materialGrades, stripped: stripped && coreVi !== original };
}

module.exports = { parseCommodityQuery };
