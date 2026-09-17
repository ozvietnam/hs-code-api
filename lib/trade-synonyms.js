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
 * ỨNG VIÊN CẤP NHÓM (2026-09-17, CEO chốt "tinh gọn"): candidates[].hs được
 * phép là 4 hoặc 6 số. Tên gọi chỉ đưa hàng tới NHÓM; xuống lá 8 số là việc
 * của bảng quyết định theo thuộc tính (lib/decision-tables.js). Ứng viên cấp
 * nhóm không bơm N lá điểm bằng nhau — nó CỘNG điểm cho lá đã khớp lời văn
 * trong nhóm đó, và chỉ khi không lá nào khớp mới đưa lá vào với điểm thấp.
 *
 * BẪY ĐÃ GÀI SẴN — đừng gỡ:
 *   - excludeIfAny: "inverter" trong "điều hòa inverter" là TÍNH NĂNG, không
 *     phải mặt hàng 8504. Thiếu chốt này là gợi ý sai ngay câu phổ biến nhất.
 *   - Từ khoá thuần số ("2311", "p20" sau khi bỏ chữ) chỉ được tính khi câu có
 *     thêm từ ngữ cảnh (thép/khuôn/tấm...). Không thì "2311 cái" cũng dính.
 *   - Cụm CÓ DẤU chỉ khớp câu CÓ DẤU khi đúng dấu. Khớp bỏ dấu từng biến
 *     "gỗ vân sam" thành van săm 8481, "với nước" thành vòi nước, "tụ điện"
 *     thành tủ điện 8537 (phải vá tay ở a887c05). Câu gõ không dấu thì vẫn
 *     khớp bỏ dấu như cũ — người Việt gõ không dấu là chuyện thường.
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

/** Hạ chữ thường nhưng GIỮ dấu — để so khớp đúng dấu khi câu hỏi có dấu. */
function normKeepDiacritics(s) {
  return String(s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasDiacritics(s) {
  const t = String(s || '');
  return /[\u0300-\u036f]/.test(t.normalize('NFD')) || /[đĐ]/.test(t);
}

const CONTEXT_WORDS = (data.numericTermContext || []).map(norm);

/** Lá 8 số của một tiền tố 4/6 số — tính một lần cho mỗi tiền tố. */
const PREFIX_LEAVES = new Map();
function leavesOfPrefix(prefix) {
  if (PREFIX_LEAVES.has(prefix)) return PREFIX_LEAVES.get(prefix);
  const leaves = Object.keys(taxData).filter((k) => /^\d{8}$/.test(k) && k.startsWith(prefix)).sort();
  PREFIX_LEAVES.set(prefix, leaves);
  return leaves;
}

/** Chuẩn hoá trước một lần khi nạp module — tra cứu nằm trong đường nóng. */
const ENTRIES = data.entries.map((e) => ({
  ...e,
  _terms: e.terms.map((t) => ({
    raw: t,
    key: norm(t),
    numeric: /^\d+$/.test(norm(t)),
    diacritic: hasDiacritics(t),
    keyWithDiacritics: normKeepDiacritics(t),
  })),
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
  const queryHasDiacritics = hasDiacritics(query);
  const paddedWithDiacritics = ` ${normKeepDiacritics(query)} `;

  const matches = [];
  const excluded = [];

  for (const e of ENTRIES) {
    const hit = e._terms.filter((t) => {
      if (!hasPhrase(padded, t.key)) return false;
      // Mác thép dạng số trần chỉ tính khi câu có từ ngữ cảnh đi kèm.
      if (t.numeric && !hasContextWord) return false;
      // Câu có dấu → cụm phải khớp ĐÚNG DẤU ("vân sam" ≠ "van săm"). Áp cho cả
      // cụm không dấu trong từ điển: "van sam" chỉ khớp câu có dấu nếu người
      // gõ thật sự viết "van sam" không dấu trong câu đó.
      if (queryHasDiacritics && !hasPhrase(paddedWithDiacritics, t.keyWithDiacritics)) return false;
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
        const hs = String(c.hs || '');
        if (hs.length < 8) {
          const leaves = leavesOfPrefix(hs);
          if (!leaves.length) return null; // tiền tố chết — test chặn từ trước
          return {
            hsCode: hs,
            prefix: true,
            leaves,
            leafCount: leaves.length,
            nameVi: `Nhóm ${hs} (${leaves.length} mã)`,
            whenVi: c.whenVi,
            confidence: c.confidence,
          };
        }
        const row = taxData[hs];
        if (!row) return null;
        return {
          hsCode: hs,
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

/**
 * Chuẩn hoá một cụm theo ĐÚNG quy tắc khớp của từ điển (bỏ dấu, hạ chữ, bỏ ký
 * tự lạ). Script benchmark-delta dùng để biết bản ghi nào bị một mục CHẠM tới:
 * mục chỉ tác động lên câu có chứa cụm của nó, nên câu không chứa cụm nào của
 * mục đã đổi thì kết quả không thể đổi. Đổi quy tắc ở norm() là phải đổi cả đây.
 */
function normalizeTradeText(text) {
  return norm(text);
}

function hasTradePhrase(normalizedQuery, normalizedTerm) {
  return hasPhrase(` ${normalizedQuery} `, normalizedTerm);
}

module.exports = { lookupTradeTerms, tradeTermsEnabled, tradeTermStats, normalizeTradeText, hasTradePhrase, leavesOfPrefix };
