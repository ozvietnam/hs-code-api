/**
 * Nối từ điển tên thương mại (data/trade-synonyms) vào đường /api/classify.
 *
 * /api/suggest đã bơm qua searchCandidates → injectTradeCandidates. Classify
 * (getCandidates + engine-loop gather) trước đây không đọc bảng này → ca khách
 * «giác hút SMC ZP» suggest ra 40169999 nhưng classify kẹt NEED_FACTS 841490
 * (OZV-1266 / #1371).
 *
 * Helper thuần: không gọi LLM, không đổi biểu thuế — chỉ đọc lookupTradeTerms.
 */
'use strict';

const { lookupTradeTerms } = require('./trade-synonyms');

function nz(s) {
  return String(s || '').replace(/\D/g, '');
}

/**
 * @param {string} query
 * @returns {{
 *   matches: Array,
 *   excluded: Array,
 *   avoidPrefixes: string[],
 *   preferHeadings: string[],
 *   preferCodes: Array<{hs:string,confidence:string,whenVi:?string,entryId:string,titleVi:?string}>,
 *   packBlock: ?string,
 * }}
 */
function tradeClassifyHints(query) {
  const { matches, excluded } = lookupTradeTerms(query || '');
  const avoidPrefixes = [];
  const preferHeadings = [];
  const preferCodes = [];
  const lines = [];

  for (const m of matches) {
    for (const a of m.avoid || []) {
      if (a?.prefix) avoidPrefixes.push(String(a.prefix));
    }
    for (const c of m.candidates || []) {
      // lookupTradeTerms chuẩn hoá thành hsCode; bản JSON gốc dùng hs.
      const hs = nz(c.hsCode || c.hs);
      if (hs.length >= 4) preferHeadings.push(hs.slice(0, 4));
      if (hs.length === 8) {
        preferCodes.push({
          hs,
          confidence: c.confidence || 'medium',
          whenVi: c.whenVi || null,
          entryId: m.entryId,
          titleVi: m.titleVi || null,
          // OZV-1322: cho phép đôn cùng nhánh dù earlyExitHoi (không áp giác hút).
          chotSom: m.chotSom === true,
        });
      }
    }
    const candHs = (m.candidates || []).map((c) => c.hsCode || c.hs).filter(Boolean).join(', ');
    const avoid = (m.avoid || []).map((a) => a.prefix).filter(Boolean).join('/');
    lines.push(
      `• ${m.titleVi || m.entryId}: ưu tiên ${candHs || '—'}`
      + (avoid ? `; loại hẳn ${avoid}` : '')
      + (m.sourceVi ? ` — ${String(m.sourceVi).slice(0, 180)}` : ''),
    );
  }

  return {
    matches,
    excluded: excluded || [],
    avoidPrefixes: [...new Set(avoidPrefixes)],
    preferHeadings: [...new Set(preferHeadings)],
    preferCodes,
    packBlock: lines.length
      ? `TỪ ĐIỂN TÊN THƯƠNG MẠI (data/trade-synonyms — người soạn, có căn cứ; mã avoid loại hẳn khỏi hồ sơ vòng 2):\n${lines.join('\n')}`
      : null,
  };
}

function biCamTrade(hs, avoidPrefixes) {
  const code = nz(hs);
  if (!code || !avoidPrefixes?.length) return false;
  return avoidPrefixes.some((p) => code.startsWith(String(p)));
}

/** Ưu tiên confidence=high, không thì mã đầu trong danh sách ứng viên. */
function tradePreferredHs(hints) {
  if (!hints?.preferCodes?.length) return null;
  return hints.preferCodes.find((c) => c.confidence === 'high') || hints.preferCodes[0] || null;
}

module.exports = { tradeClassifyHints, biCamTrade, tradePreferredHs };
