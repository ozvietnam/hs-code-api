/**
 * Từ điển TÊN THƯƠNG MẠI → mã HS (data/trade-synonyms.json).
 *
 * KHÁC GÌ data/hs-aliases.json:
 * hs-aliases đào tự động từ 5.156 tờ khai cũ của Oz. Mạnh ở ngành Oz làm nhiều,
 * nhưng CÂM ở ngành Oz chưa từng nhập — kho chỉ phủ 50/97 chương, riêng chương
 * 72 vỏn vẹn 1 bản ghi. Câu hỏi thật của khách "tấm thép làm khuôn nhựa P20"
 * rơi đúng vào lỗ hổng đó: không tờ khai nào để đào.
 *
 * Bảng này lấp lỗ hổng bằng tay: người soạn đọc biểu thuế, chốt từng dòng, ghi
 * sourceVi dẫn chứng. Vì là hàng thủ công nên nó ĐƯỢC PHÉP nói "chưa chắc":
 * mục nào biểu thuế không khẳng định nổi một mã thì để nhiều ứng viên kèm câu
 * hỏi gạn thông tin, thay vì chốt bừa. Trong khai hải quan, một mã sai mà tự
 * tin tốn tiền hơn một câu hỏi.
 *
 * BẪY ĐÃ GÀI SẴN — đừng gỡ:
 *   - excludeIfAny: "inverter" trong "điều hòa inverter" là TÍNH NĂNG, không
 *     phải mặt hàng 8504. Thiếu chốt này là gợi ý sai ngay câu phổ biến nhất.
 *   - Từ khoá thuần số ("2311", "p20" sau khi bỏ chữ) chỉ được tính khi câu có
 *     thêm từ ngữ cảnh (thép/khuôn/tấm...). Không thì "2311 cái" cũng dính.
 */
const data = require('../data/trade-synonyms.json');
const { taxData } = require('./data');

function removeDiacritics(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function norm(s) {
  return removeDiacritics(String(s || '').toLowerCase())
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CONTEXT_WORDS = (data.numericTermContext || []).map(norm);

/** Chuẩn hoá trước một lần khi nạp module — tra cứu nằm trong đường nóng. */
const ENTRIES = data.entries.map((e) => ({
  ...e,
  _terms: e.terms.map((t) => ({ raw: t, key: norm(t), numeric: /^\d+$/.test(norm(t)) })),
  _excludes: (e.excludeIfAny || []).map(norm).filter(Boolean),
}));

/** Công tắc tắt nhanh khi vận hành, không cần deploy lại. */
function tradeTermsEnabled() {
  return String(process.env.HS_TRADE_SYNONYMS ?? 'on').toLowerCase() !== 'off';
}

function hasPhrase(padded, key) {
  return padded.includes(` ${key} `);
}

/**
 * Tra các tên thương mại xuất hiện trong câu hỏi.
 *
 * @param {string} query
 * @returns {{matches: Array, excluded: Array}}
 *   matches[].candidates[] đã gắn nameVi lấy từ biểu thuế hiện hành; mã nào
 *   không còn trong biểu thuế thì bị loại chứ không trả ra mã chết.
 */
function lookupTradeTerms(query) {
  if (!tradeTermsEnabled()) return { matches: [], excluded: [] };
  const q = norm(query);
  if (q.length < 2) return { matches: [], excluded: [] };
  const padded = ` ${q} `;
  const hasContextWord = CONTEXT_WORDS.some((w) => hasPhrase(padded, w));

  const matches = [];
  const excluded = [];

  for (const e of ENTRIES) {
    const hit = e._terms.filter((t) => {
      if (!hasPhrase(padded, t.key)) return false;
      // Mác thép dạng số trần chỉ tính khi câu có từ ngữ cảnh đi kèm.
      if (t.numeric && !hasContextWord) return false;
      return true;
    });
    if (!hit.length) continue;

    const blocker = e._excludes.find((x) => hasPhrase(padded, x));
    if (blocker) {
      excluded.push({
        entryId: e.id,
        titleVi: e.titleVi,
        matchedTerms: hit.map((t) => t.raw),
        blockedBy: blocker,
        reasonVi: e.excludeReasonVi || 'Ngữ cảnh câu hỏi cho thấy đây không phải mặt hàng của mục này.',
      });
      continue;
    }

    const candidates = e.candidates
      .map((c) => {
        const row = taxData[c.hs];
        if (!row) return null;
        return {
          hsCode: c.hs,
          nameVi: row.vn || '',
          whenVi: c.whenVi,
          confidence: c.confidence,
          taxVat: row.vat || null,
          policyByHs: row.cs || null,
        };
      })
      .filter(Boolean);
    if (!candidates.length) continue;

    matches.push({
      entryId: e.id,
      titleVi: e.titleVi,
      matchedTerms: hit.map((t) => t.raw),
      candidates,
      avoid: e.avoid || [],
      askVi: e.askVi || [],
      gir: e.gir || null,
      basis: e.basis || 'RULE_TABLE',
      sourceVi: e.sourceVi || null,
    });
  }

  return { matches, excluded };
}

function tradeTermStats() {
  return {
    ok: ENTRIES.length > 0,
    entries: ENTRIES.length,
    terms: ENTRIES.reduce((n, e) => n + e._terms.length, 0),
    version: data.version || null,
  };
}

module.exports = { lookupTradeTerms, tradeTermsEnabled, tradeTermStats };
