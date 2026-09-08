// lib/gir.js — Nguồn chân lý duy nhất cho việc trích dẫn 6 Quy tắc tổng quát (GIR/WCO).
//
// VÌ SAO CÓ FILE NÀY
// Trước đây nhãn GIR được sinh ở 6 nơi khác nhau, mâu thuẫn nhau và mâu thuẫn cả
// với tài liệu API. Tệ nhất: `gir-engine` gắn nhãn "GIR-2a" mỗi khi có từ khoá
// đặc tính khớp — trong khi GIR 2(a) nói về hàng CHƯA LẮP RÁP / CHƯA HOÀN CHỈNH,
// không liên quan gì.
//
// `girRulesApplied[]` là bằng chứng người khai đưa ra khi giải trình với Hải quan.
// Trích sai điều luật còn tệ hơn không trích: nó tạo tự tin giả cho cả AI lẫn cán
// bộ đọc tờ khai, và khi bị bác thì mất luôn uy tín của cả hồ sơ.
//
// NGUYÊN TẮC: không bao giờ phát ra một trích dẫn GIR mà không kèm CĂN CỨ (basis)
// và BẰNG CHỨNG (evidence) kiểm chứng được.

/**
 * Mức căn cứ — quyết định trích dẫn đáng tin tới đâu.
 * Xếp từ mạnh xuống yếu; người đọc phải phân biệt được ngay.
 */
const BASIS = {
  // Bảng quyết định do người soạn, có trường `source` dẫn văn bản gốc.
  RULE_TABLE: 'RULE_TABLE',
  // Code tự suy ra từ tín hiệu chắc chắn (thứ tự số học, thu hẹp phân nhóm...).
  DETERMINISTIC: 'DETERMINISTIC',
  // Dò từ khoá / điểm số ước lượng. Đúng hướng nhưng CHƯA đối chiếu nguyên văn nhóm.
  HEURISTIC: 'HEURISTIC',
  // Mô hình ngôn ngữ tự nhận đã áp dụng. CHƯA kiểm chứng.
  LLM_ASSERTED: 'LLM_ASSERTED',
};

const BASIS_CONFIDENCE = {
  RULE_TABLE: 'high',
  DETERMINISTIC: 'high',
  HEURISTIC: 'low',
  LLM_ASSERTED: 'low',
};

/**
 * 6 Quy tắc tổng quát giải thích việc phân loại hàng hoá theo Hệ thống hài hoà
 * (WCO General Interpretative Rules). Tóm tắt tiếng Việt bám sát văn bản gốc.
 */
const GIR_RULES = {
  '1': {
    id: 'GIR 1',
    titleVi: 'Phân loại theo nội dung nhóm và chú giải phần/chương',
    textVi:
      'Tên của các phần, chương, phân chương chỉ có giá trị hướng dẫn. Việc phân loại được xác định theo nội dung của nhóm và bất cứ chú giải phần hoặc chương nào liên quan.',
  },
  '2a': {
    id: 'GIR 2(a)',
    titleVi: 'Hàng chưa hoàn chỉnh, chưa lắp ráp hoặc tháo rời',
    textVi:
      'Mặt hàng chưa hoàn chỉnh hoặc chưa hoàn thiện, nếu đã có đặc trưng cơ bản của hàng hoàn chỉnh, được phân loại như hàng hoàn chỉnh. Quy tắc này cũng áp dụng cho hàng ở dạng chưa lắp ráp hoặc tháo rời.',
  },
  '2b': {
    id: 'GIR 2(b)',
    titleVi: 'Hỗn hợp và hàng cấu tạo từ nhiều nguyên liệu',
    textVi:
      'Một nguyên liệu được nêu trong một nhóm thì bao gồm cả hỗn hợp hoặc hợp chất của nguyên liệu đó với nguyên liệu khác. Việc phân loại hàng gồm nhiều nguyên liệu thực hiện theo Quy tắc 3.',
  },
  '3a': {
    id: 'GIR 3(a)',
    titleVi: 'Nhóm có mô tả cụ thể nhất được ưu tiên',
    textVi:
      'Khi hàng hoá thoạt nhìn có thể phân loại vào hai hay nhiều nhóm, nhóm có mô tả cụ thể nhất được ưu tiên hơn nhóm có mô tả khái quát.',
  },
  '3b': {
    id: 'GIR 3(b)',
    titleVi: 'Phân loại theo đặc trưng cơ bản',
    textVi:
      'Hàng hỗn hợp, hàng cấu tạo từ nhiều nguyên liệu hoặc bộ phận khác nhau, và hàng đóng bộ để bán lẻ, được phân loại theo nguyên liệu hoặc bộ phận tạo nên đặc trưng cơ bản của chúng.',
  },
  '3c': {
    id: 'GIR 3(c)',
    titleVi: 'Nhóm có thứ tự sau cùng',
    textVi:
      'Khi không áp dụng được Quy tắc 3(a) và 3(b), hàng hoá được xếp vào nhóm có thứ tự sau cùng trong số các nhóm ngang bằng nhau được xem xét.',
  },
  '4': {
    id: 'GIR 4',
    titleVi: 'Hàng giống nhất (biện pháp cuối cùng)',
    textVi:
      'Hàng hoá không thể phân loại theo các quy tắc trên được xếp vào nhóm của mặt hàng giống chúng nhất.',
  },
  '5': {
    id: 'GIR 5',
    titleVi: 'Bao bì và hộp đựng đi kèm',
    textVi:
      'Bao/hộp đựng chuyên dùng, có hình dạng đặc biệt, dùng lâu dài và đi kèm sản phẩm thì phân loại cùng sản phẩm. Bao bì đóng gói đi kèm cũng phân loại cùng hàng, trừ khi là loại dùng lặp lại nhiều lần.',
  },
  '6': {
    id: 'GIR 6',
    titleVi: 'Phân loại ở cấp phân nhóm',
    textVi:
      'Việc phân loại ở cấp phân nhóm được xác định theo nội dung của phân nhóm và chú giải phân nhóm liên quan, và chỉ so sánh các phân nhóm CÙNG CẤP với nhau.',
  },
};

const DISCLAIMER_VI =
  'Trích dẫn GIR là căn cứ tham khảo do hệ thống suy ra, KHÔNG phải phán quyết phân loại của cơ quan Hải quan. ' +
  'Chỉ những mục có basis = RULE_TABLE hoặc DETERMINISTIC mới đủ chắc để đưa vào hồ sơ giải trình; ' +
  'mục HEURISTIC hoặc LLM_ASSERTED cần người có chuyên môn kiểm chứng lại với nguyên văn nhóm và chú giải.';

function norm(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

/** Trả về cụm từ khoá đầu tiên khớp — dùng làm bằng chứng, không chỉ true/false. */
function firstMatch(text, patterns) {
  const t = norm(text);
  for (const { re, label } of patterns) {
    const m = t.match(re);
    if (m) return { matched: m[0], label };
  }
  return null;
}

// --- GIR 2(a): chưa hoàn chỉnh / chưa lắp ráp / tháo rời -----------------------
const UNASSEMBLED_PATTERNS = [
  { re: /chua lap rap|thao roi|dang roi|roi rac/, label: 'chưa lắp ráp / tháo rời' },
  { re: /\bckd\b|\bskd\b/, label: 'bộ linh kiện CKD/SKD' },
  { re: /chua hoan chinh|chua hoan thien|ban thanh pham|dang pho?i/, label: 'chưa hoàn chỉnh' },
  { re: /unassembled|knocked[ -]?down|semi[ -]?finished/, label: 'unassembled/knocked-down' },
];

// --- GIR 2(b): hỗn hợp / nhiều nguyên liệu ------------------------------------
const MIXTURE_PATTERNS = [
  { re: /hon hop|hop chat|pha tron/, label: 'hỗn hợp' },
  { re: /\d{1,3}\s*%/, label: 'có tỷ lệ thành phần %' },
  { re: /mixture|compound|blended?/, label: 'mixture/blend' },
];

// --- GIR 5: bao bì / hộp đựng --------------------------------------------------
const PACKAGING_PATTERNS = [
  { re: /hop dung|tui dung|vali dung|bao dung|hop chuyen dung/, label: 'hộp/túi đựng chuyên dùng' },
  { re: /kem hop|kem tui|kem bao bi/, label: 'kèm bao bì' },
  { re: /carrying case|fitted case/, label: 'fitted case' },
];

function determination(ruleKey, { basis, reasonVi, evidence, source }) {
  const rule = GIR_RULES[ruleKey];
  if (!rule) return null;
  return {
    rule: rule.id,
    ruleKey,
    titleVi: rule.titleVi,
    textVi: rule.textVi,
    basis,
    confidence: BASIS_CONFIDENCE[basis] || 'low',
    reasonVi,
    evidence: evidence ?? null,
    source: source || 'WCO General Interpretative Rules',
  };
}

/**
 * Suy ra các trích dẫn GIR có căn cứ.
 *
 * @param {object} input
 * @param {string} input.description   Mô tả hàng hoá người dùng nhập
 * @param {Array}  input.candidates    Ứng viên đã xếp hạng: [{hsCode, confidence}]
 * @param {string} input.pickedHs      Mã được chọn cuối cùng
 * @param {object} input.resolver      Kết quả conflict-resolver (nếu có)
 * @param {object} input.headingNote   Chú giải nhóm của mã được chọn (nếu có)
 * @param {boolean} input.isSet        Đã phát hiện hàng đóng bộ bán lẻ
 * @param {boolean} input.precedentDrove  Tiền lệ là yếu tố quyết định
 * @param {string} input.llmGir        Chuỗi GIR do LLM tự khai (nếu có)
 * @returns {{determinations: Array, disclaimer: string}}
 */
function determineGir(input = {}) {
  const {
    description = '',
    candidates = [],
    pickedHs = null,
    resolver = null,
    headingNote = null,
    isSet = false,
    precedentDrove = false,
    llmGir = null,
  } = input;

  const out = [];

  // 1) Bảng quyết định do người soạn — căn cứ mạnh nhất, ưu tiên trước hết.
  if (resolver?.status === 'RESOLVED' && resolver.gir) {
    out.push(
      determination(normalizeRuleKey(resolver.gir) || '1', {
        basis: BASIS.RULE_TABLE,
        reasonVi: resolver.reasonVi || 'Quyết định theo bảng phân giải cụm mã dễ nhầm.',
        evidence: {
          group: resolver.group,
          decidedHs: resolver.decidedHs,
          ruleId: resolver.trace?.[0]?.ruleId || null,
          girRaw: resolver.gir,
        },
        source: resolver.trace?.[0]?.source || 'data/conflict-tables.json',
      }),
    );
  }

  // 2) GIR 1 — có chú giải nhóm chứa mệnh đề loại trừ chống lưng cho mã được chọn.
  if (headingNote && hasExclusionLanguage(headingNote)) {
    out.push(
      determination('1', {
        basis: BASIS.HEURISTIC,
        reasonVi:
          'Chú giải nhóm của mã được chọn có mệnh đề loại trừ — cần đối chiếu để chắc hàng không rơi vào diện bị loại.',
        evidence: {
          heading: String(pickedHs || '').slice(0, 4) || null,
          excerpt: exclusionExcerpt(headingNote),
        },
        source: headingNote.nguon || 'data/chu-giai-heading.json',
      }),
    );
  }

  // 3) GIR 2(a) — chưa lắp ráp / chưa hoàn chỉnh.
  const unassembled = firstMatch(description, UNASSEMBLED_PATTERNS);
  if (unassembled) {
    out.push(
      determination('2a', {
        basis: BASIS.HEURISTIC,
        reasonVi: `Mô tả nêu hàng ở dạng ${unassembled.label} — nếu đã có đặc trưng cơ bản của hàng hoàn chỉnh thì vẫn phân loại như hàng hoàn chỉnh.`,
        evidence: { matchedPhrase: unassembled.matched },
      }),
    );
  }

  // 4) GIR 2(b) — hỗn hợp nhiều nguyên liệu.
  const mixture = firstMatch(description, MIXTURE_PATTERNS);
  if (mixture) {
    out.push(
      determination('2b', {
        basis: BASIS.HEURISTIC,
        reasonVi: `Mô tả cho thấy hàng là ${mixture.label} — việc phân loại phải qua Quy tắc 3.`,
        evidence: { matchedPhrase: mixture.matched },
      }),
    );
  }

  // 5) GIR 3(b) — hàng đóng bộ để bán lẻ.
  if (isSet) {
    out.push(
      determination('3b', {
        basis: BASIS.HEURISTIC,
        reasonVi:
          'Phát hiện hàng đóng bộ để bán lẻ — phân loại theo bộ phận tạo nên đặc trưng cơ bản của bộ.',
        evidence: { detector: 'detectSet(description)' },
      }),
    );
  }

  // 6) GIR 3(c) — hoà điểm giữa các ứng viên ngang nhau, lấy mã có thứ tự sau cùng.
  const tie = detectNumericalTieBreak(candidates, pickedHs);
  if (tie) {
    out.push(
      determination('3c', {
        basis: BASIS.DETERMINISTIC,
        reasonVi:
          'Các ứng viên có độ tin cậy ngang nhau nên không phân định được bằng 3(a)/3(b); chọn mã có thứ tự số học sau cùng.',
        evidence: tie,
      }),
    );
  }

  // 7) GIR 5 — bao bì / hộp đựng đi kèm.
  const packaging = firstMatch(description, PACKAGING_PATTERNS);
  if (packaging) {
    out.push(
      determination('5', {
        basis: BASIS.HEURISTIC,
        reasonVi: `Mô tả có ${packaging.label} — xét phân loại bao bì cùng hàng hoá chính.`,
        evidence: { matchedPhrase: packaging.matched },
      }),
    );
  }

  // 8) GIR 6 — đã thu hẹp xuống phân nhóm trong cùng một nhóm 4 số.
  const narrowing = detectSubheadingNarrowing(candidates, pickedHs);
  if (narrowing) {
    out.push(
      determination('6', {
        basis: BASIS.DETERMINISTIC,
        reasonVi:
          'Kết quả được chọn ở cấp phân nhóm giữa nhiều phân nhóm cùng nhóm 4 số — so sánh chỉ thực hiện giữa các phân nhóm cùng cấp.',
        evidence: narrowing,
      }),
    );
  }

  // 9) GIR 4 — CHỈ khi không quy tắc nào ở trên áp được. Đây là biện pháp cuối cùng
  //    theo đúng văn bản gốc, không phải nhãn dán mỗi khi có tiền lệ khớp.
  if (precedentDrove && out.length === 0) {
    out.push(
      determination('4', {
        basis: BASIS.HEURISTIC,
        reasonVi:
          'Không quy tắc nào từ 1 đến 3 phân định được; xếp theo mặt hàng giống nhất căn cứ tiền lệ đã phân loại.',
        evidence: { driver: 'precedent' },
      }),
    );
  }

  // 10) LLM tự khai — ghi nhận nhưng đánh dấu CHƯA KIỂM CHỨNG, và không nhân đôi
  //     quy tắc đã có căn cứ mạnh hơn.
  const llmKey = normalizeRuleKey(llmGir);
  if (llmKey && !out.some((d) => d.ruleKey === llmKey)) {
    out.push(
      determination(llmKey, {
        basis: BASIS.LLM_ASSERTED,
        reasonVi: 'Mô hình tự khai đã áp dụng quy tắc này. Chưa được hệ thống kiểm chứng độc lập.',
        evidence: { raw: String(llmGir) },
        source: 'LLM output (unverified)',
      }),
    );
  }

  return {
    determinations: out.filter(Boolean),
    disclaimer: DISCLAIMER_VI,
  };
}

/** "GIR 3(b)" | "GIR-3b" | "3b" | "GIR 1+6" → khoá chuẩn trong GIR_RULES. */
function normalizeRuleKey(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().replace(/[\s()-]/g, '');
  const m = s.match(/gir?(\d[abc]?)/) || s.match(/^(\d[abc]?)$/);
  const key = m?.[1];
  return key && GIR_RULES[key] ? key : null;
}

function hasExclusionLanguage(note) {
  const t = `${note?.nhom || ''} ${note?.sen || ''} ${note?.tinh_chat || ''}`;
  return /không bao gồm|loại trừ|trừ ra khỏi|không thuộc nhóm/i.test(t);
}

function exclusionExcerpt(note) {
  const t = `${note?.nhom || ''}\n${note?.sen || ''}`;
  const m = t.match(/[^.\n]*(?:không bao gồm|loại trừ|trừ ra khỏi|không thuộc nhóm)[^.\n]*\.?/i);
  return m ? m[0].trim().slice(0, 300) : null;
}

/**
 * GIR 3(c) chỉ áp khi thật sự có hoà điểm: hai ứng viên đầu chênh nhau < 3 điểm
 * VÀ mã được chọn đúng là mã có thứ tự số học sau cùng.
 */
function detectNumericalTieBreak(candidates, pickedHs) {
  if (!Array.isArray(candidates) || candidates.length < 2 || !pickedHs) return null;
  const [a, b] = candidates;
  const ca = Number(a?.confidence) || 0;
  const cb = Number(b?.confidence) || 0;
  if (Math.abs(ca - cb) >= 3) return null;
  const tied = [String(a.hsCode), String(b.hsCode)].sort();
  const last = tied[tied.length - 1];
  if (String(pickedHs) !== last) return null;
  return { tiedCandidates: tied, chosenLast: last, confidenceGap: Number((ca - cb).toFixed(2)) };
}

/** GIR 6 chỉ áp khi có ≥2 phân nhóm CÙNG nhóm 4 số cùng được xem xét. */
function detectSubheadingNarrowing(candidates, pickedHs) {
  const hs = String(pickedHs || '');
  if (hs.length < 6 || !Array.isArray(candidates)) return null;
  const h4 = hs.slice(0, 4);
  const siblings = candidates
    .map((c) => String(c?.hsCode || ''))
    .filter((c) => c.length >= 6 && c.slice(0, 4) === h4);
  if (new Set(siblings).size < 2) return null;
  return { heading: h4, subheadingsCompared: [...new Set(siblings)].slice(0, 5), picked: hs };
}

module.exports = {
  BASIS,
  GIR_RULES,
  DISCLAIMER_VI,
  determineGir,
  normalizeRuleKey,
  detectNumericalTieBreak,
  detectSubheadingNarrowing,
  hasExclusionLanguage,
};
