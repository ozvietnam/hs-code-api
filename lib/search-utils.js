const { searchData, taxData } = require('./data');
const { expandSearchQuery } = require('./search-query-expand');
const { getBrandHint } = require('./glossary');
const { lookupAliases } = require('./hs-aliases');
const { lookupTradeTerms } = require('./trade-synonyms');
const { contextPlainOf, contextHitCounts } = require('./hs-breadcrumb');

/**
 * Điểm mồi cho ứng viên đến từ bảng alias (tiền lệ tờ khai đã thông quan).
 *
 * Đặt cao hơn mọi điểm khớp từ khoá (tối đa ~250) là CỐ Ý: rất nhiều mã đúng có
 * tên chính thức là "Loại khác", không từ khoá nào chạm tới. Một cụm từ đã được
 * khai đúng hàng chục lần đáng tin hơn một dòng biểu thuế tình cờ trùng chữ.
 */
const ALIAS_BASE_SCORE = { high: 300, medium: 200, low: 120 };

/**
 * Ngưỡng cho lớp ngữ cảnh dòng dư. BA SỐ NÀY ĐO RA, KHÔNG PHẢI ĐOÁN.
 *
 * Quét trên 300 tờ khai giữ riêng, so với TẮT hẳn lớp ngữ cảnh (top-1 / top-3
 * ở mức chương):
 *   2 token / 0,4 / 12đ  →  33,0 / 50,3   — TỆ HƠN tắt hẳn (34,3 / 50,3)
 *   3 token / 0,6 /  8đ  →  35,3 / 50,7   — tốt nhất
 *   4 token / 0,7 /  6đ  →  35,0 / 50,3
 *
 * Bản đầu (2 / 0,4 / 12) làm HỎNG kết quả: nới quá tay nên dòng "Loại khác"
 * tràn vào, và mô tả tờ khai thật dài 160 ký tự toàn từ chung chung thì phần
 * lớn là rác. Nới thêm nữa là quay lại đúng lỗi đó.
 */
const CONTEXT_MIN_HITS = 3;
const CONTEXT_MIN_RATIO = 0.6;
const CONTEXT_WEIGHT = 8;

/**
 * Điểm mồi cho ứng viên đến từ từ điển tên thương mại (data/trade-synonyms.json).
 *
 * Cao hơn alias vì đây là bảng NGƯỜI SOẠN đọc biểu thuế rồi chốt, có sourceVi
 * dẫn chứng — còn alias là thống kê từ tờ khai cũ, đúng theo số đông chứ không
 * theo văn bản. Mục confidence "low" cố tình đặt dưới alias "high": bảng tay
 * thừa nhận mình chưa chắc thì không được đè lên bằng chứng thực tế.
 */
const TRADE_BASE_SCORE = { high: 420, medium: 330, low: 260 };

/**
 * Trộn ứng viên từ từ điển tên thương mại, và LOẠI HẲN các mã mà từ điển đã chỉ
 * đích danh là bẫy nhầm lẫn.
 *
 * Vì sao loại hẳn chứ không chỉ trừ điểm: hỏi "tấm thép làm khuôn nhựa" mà máy
 * trả về bộ khuôn 8480 thì người khai rất dễ gật — tên hàng nghe khớp hoàn
 * toàn. Trừ điểm chỉ đẩy nó xuống hạng hai, vẫn nằm trong tầm mắt. Mã bị loại
 * được trả ra ở trường riêng kèm lý do, nên đây là loại CÔNG KHAI, không phải
 * giấu đi.
 *
 * @returns {{list: Array, avoided: Array, trade: Array, excluded: Array}}
 */
function injectTradeCandidates(query, scored, csOnly) {
  const { matches, excluded } = lookupTradeTerms(query);
  if (!matches.length) return { list: scored, avoided: [], trade: [], excluded };

  const avoidRules = [];
  for (const m of matches) for (const a of m.avoid || []) avoidRules.push({ ...a, entryId: m.entryId });

  const avoided = [];
  let list = scored;
  if (avoidRules.length) {
    const kept = [];
    for (const c of scored) {
      const rule = avoidRules.find((a) => c.hsCode.startsWith(a.prefix));
      if (rule) {
        avoided.push({ hsCode: c.hsCode, nameVi: c.nameVi, prefix: rule.prefix, whyVi: rule.whyVi, entryId: rule.entryId });
        continue;
      }
      kept.push(c);
    }
    list = kept;
  }

  const byHs = new Map(list.map((c) => [c.hsCode, c]));
  for (const m of matches) {
    for (const c of m.candidates) {
      const base = TRADE_BASE_SCORE[c.confidence] || 200;
      const meta = {
        entryId: m.entryId,
        titleVi: m.titleVi,
        matchedTerms: m.matchedTerms,
        whenVi: c.whenVi,
        confidence: c.confidence,
        basis: m.basis,
        sourceVi: m.sourceVi,
      };
      const existing = byHs.get(c.hsCode);
      if (existing) {
        existing.score += base;
        existing.tradeMatch = meta;
        continue;
      }
      const full = taxData[c.hsCode];
      if (!full) continue;
      if (csOnly && full.cs !== '1') continue;
      const candidate = {
        hsCode: c.hsCode,
        nameVi: full.vn || '',
        score: base,
        source: 'trade-synonyms',
        taxNkPreferential: full.mfn || null,
        taxAcfta: full.acfta || null,
        taxVat: full.vat || null,
        policyByHs: full.cs || null,
        hasPolicyWarning: full.cs === '1',
        tradeMatch: meta,
      };
      list.push(candidate);
      byHs.set(c.hsCode, candidate);
    }
  }

  return { list, avoided, trade: matches, excluded };
}

/**
 * Trộn ứng viên từ bảng alias vào danh sách khớp theo lời văn biểu thuế.
 * Mã đã có sẵn thì cộng điểm; mã chưa có thì thêm mới.
 */
function injectAliasCandidates(query, scored, csOnly) {
  const { matches } = lookupAliases(query, { limit: 5 });
  if (!matches.length) return scored;

  const byHs = new Map(scored.map((c) => [c.hsCode, c]));
  for (const m of matches) {
    const base = ALIAS_BASE_SCORE[m.confidence] || 100;
    const aliasMeta = {
      phrase: m.phrase,
      declarationCount: m.declarationCount,
      confidence: m.confidence,
      share: m.share,
    };

    const existing = byHs.get(m.hsCode);
    if (existing) {
      existing.score += base;
      existing.aliasMatch = aliasMeta;
      continue;
    }

    const full = taxData[m.hsCode];
    if (!full) continue; // mã cũ không còn trong biểu thuế hiện hành
    if (csOnly && full.cs !== '1') continue;

    const candidate = {
      hsCode: m.hsCode,
      nameVi: full.vn || '',
      score: base,
      source: 'oz-alias',
      taxNkPreferential: full.mfn || null,
      taxAcfta: full.acfta || null,
      taxVat: full.vat || null,
      policyByHs: full.cs || null,
      hasPolicyWarning: full.cs === '1',
      aliasMatch: aliasMeta,
    };
    scored.push(candidate);
    byHs.set(m.hsCode, candidate);
  }
  return scored;
}

function removeDiacritics(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function scoreCandidate(item, keyword, keywordPlain, extraTokens = [], scoreMeta = {}) {
  const vn = (item.vn || '').toLowerCase();
  const vnPlain = removeDiacritics(vn);
  const searchKeyword = keyword;
  let score = 0;

  if (item.hs.startsWith(keyword.replace(/\./g, ''))) score += 100;
  if (vn.includes(keyword)) score += 50;
  if (vnPlain.includes(keywordPlain)) score += 40;

  const words = [...searchKeyword.split(/\s+/), ...extraTokens];
  for (const word of words) {
    if (word.length < 2) continue;
    if (/^\d{4}$/.test(word) && item.hs.startsWith(word)) score += 60;
    if (vn.includes(word)) score += 10;
    if (vnPlain.includes(removeDiacritics(word))) score += 8;
  }

  const parts = searchKeyword.split(/\s+/).filter((w) => w.length >= 2);
  for (let i = 0; i < parts.length - 1; i++) {
    const phrase = parts.slice(i, i + 2).join(' ');
    if (phrase.length < 4) continue;
    const phrasePlain = removeDiacritics(phrase);
    if (vn.includes(phrase)) score += 35;
    if (vnPlain.includes(phrasePlain)) score += 30;
  }

  // Ngữ cảnh dòng dư: 25,7% biểu thuế tên đúng bằng "Loại khác", lời văn dòng
  // đó không mang tin gì. Cộng điểm theo số từ khớp câu mô tả phạm vi thật.
  // Điểm cố ý THẤP hơn khớp trực tiếp: đây là ngữ cảnh cha, không phải tên hàng.
  const ctxHits = scoreMeta.contextHits ? scoreMeta.contextHits.get(item.hs) || 0 : 0;
  if (ctxHits) {
    score += CONTEXT_WEIGHT * ctxHits;
    // Khớp nguyên cụm thì mới bõ công quét chuỗi — và chỉ quét cho vài mã đã
    // có từ khớp, không quét cả biểu thuế.
    if (keywordPlain.length >= 6 && contextPlainOf(item.hs).includes(keywordPlain)) score += 40;
  }

  for (const prefix of scoreMeta.preferChapterPrefixes || []) {
    if (item.hs.startsWith(prefix)) score += 70;
  }
  for (const prefix of scoreMeta.penalizeChapterPrefixes || []) {
    if (item.hs.startsWith(prefix)) score -= 50;
  }

  if (item.cs === '1') score += 1;
  return score;
}

/**
 * Bỏ mã trùng, giữ bản điểm cao nhất.
 *
 * data/search.json có 78 mã xuất hiện nhiều lần (toàn Chương 98 — biểu thuế
 * nhập ưu đãi riêng liệt kê một mã nhiều dòng). Trước đây 98110010 chiếm trọn
 * 5 trên 5 chỗ của top-5, đẩy hết ứng viên thật ra ngoài.
 */
function dedupeByHs(list) {
  const seen = new Set();
  const out = [];
  for (const c of list) {
    if (seen.has(c.hsCode)) continue;
    seen.add(c.hsCode);
    out.push(c);
  }
  return out;
}

function searchCandidates(query, { topCandidates = 10, csOnly = false } = {}) {
  const keyword = String(query || '').trim().toLowerCase();
  if (keyword.length < 2) return [];

  const expanded = expandSearchQuery(keyword);
  const searchKeyword = expanded.query || keyword;
  const keywordPlain = removeDiacritics(searchKeyword);
  const originalPlain = removeDiacritics(keyword);
  const isHSQuery = /^\d{4,}/.test(keyword);
  const keywordTokens = expanded.keywordTokens.length
    ? expanded.keywordTokens
    : keyword.split(/\s+/).filter((w) => w.length >= 2);

  const scoreMeta = {};
  if (expanded.preferChapterPrefixes?.length) {
    scoreMeta.preferChapterPrefixes = [...(scoreMeta.preferChapterPrefixes || []), ...expanded.preferChapterPrefixes];
  }
  if (expanded.expansionSources.some((s) => s.term === 'máy điều hòa')) {
    scoreMeta.preferChapterPrefixes = ['8415'];
    scoreMeta.penalizeChapterPrefixes = ['98'];
  }
  if (/\b(tv|tivi)\b/i.test(keyword)) {
    scoreMeta.preferChapterPrefixes = [...(scoreMeta.preferChapterPrefixes || []), '8528'];
  }
  const brandHint = getBrandHint(keyword);
  if (brandHint?.hsHint) {
    const prefix = String(brandHint.hsHint).replace(/\D/g, '').slice(0, 4);
    if (prefix) {
      scoreMeta.preferChapterPrefixes = [...(scoreMeta.preferChapterPrefixes || []), prefix];
      scoreMeta.penalizeChapterPrefixes = [...(scoreMeta.penalizeChapterPrefixes || []), '98'];
    }
  }

  /**
   * Token dùng cho lớp ngữ cảnh: lấy từ câu NGƯỜI TA GÕ, bỏ dấu và bỏ trùng.
   *
   * Hai lỗi của bản trước, đều làm mẫu số phồng lên và tỉ lệ tụt oan:
   *   · keywordTokens là bản ĐÃ MỞ RỘNG, có cả từ tiếng Anh ("alloy", "steel")
   *     mà câu mô tả phạm vi tiếng Việt không đời nào khớp. Đếm chúng vào mẫu
   *     số là tự phạt mình.
   *   · Bộ mở rộng trả cả "thép" lẫn "Thép" — tử số gộp lại thành một (đã bỏ
   *     dấu, bỏ trùng) nhưng mẫu số đếm hai.
   * Hậu quả thật: "thép hợp kim cán phẳng chiều rộng 600mm" ra tỉ lệ 5/10 thay
   * vì 5/8, trượt ngưỡng, và 72254090 — đúng mã cần tìm — biến mất khỏi kết quả.
   */
  const contextTokens = [
    ...new Set(
      keyword
        .split(/\s+/)
        .map((w) => removeDiacritics(w).replace(/[^\w]/g, ''))
        .filter((w) => w.length >= 3)
    ),
  ];
  const countedTokens = contextTokens.length || 1;
  // Một lần cho cả truy vấn, thay vì quét lại chuỗi ngữ cảnh ở từng dòng.
  scoreMeta.contextHits = isHSQuery ? null : contextHitCounts(contextTokens);

  const scored = searchData
    .map((item) => {
      if (csOnly && item.cs !== '1') return null;
      if (isHSQuery && !item.hs.startsWith(keyword.replace(/\./g, ''))) return null;
      if (!isHSQuery) {
        const vn = (item.vn || '').toLowerCase();
        const vnPlain = removeDiacritics(vn);
        if (keyword.includes('máy') && !vn.includes('máy') && !vn.includes('may')) {
          const chapterHint = keywordTokens.find((w) => /^\d{4}$/.test(w));
          if (!chapterHint || !item.hs.startsWith(chapterHint)) return null;
        }
        if (expanded.expansionSources.some((s) => s.term === 'máy điều hòa') && !item.hs.startsWith('8415')) {
          return null;
        }
        if (/\b(tv|tivi)\b/i.test(keyword) && !item.hs.startsWith('852')) {
          return null;
        }
        const tokenHits = keywordTokens.reduce((count, w) => {
          const plain = removeDiacritics(w);
          if (vn.includes(w) || vnPlain.includes(plain)) return count + 1;
          return count;
        }, 0);
        const minTokenHits = keywordTokens.length <= 2 ? 1 : 2;
        let hit =
          vn.includes(keyword) ||
          vnPlain.includes(originalPlain) ||
          vn.includes(searchKeyword) ||
          vnPlain.includes(keywordPlain) ||
          tokenHits >= minTokenHits;

        // Cửa phụ cho dòng dư: tên "Loại khác" không bao giờ qua được cửa trên.
        // Đòi ÍT NHẤT HAI token khớp ngữ cảnh — một token thì 3.383 mã dư tràn
        // vào mọi truy vấn.
        if (!hit) {
          const ctxHits = scoreMeta.contextHits?.get(item.hs) || 0;
          // Hai điều kiện: đủ SỐ token VÀ đủ TỶ LỆ. Chỉ đếm số lượng thì câu mô
          // tả phạm vi kiểu chung chung ("Là máy móc có chức năng cơ khí riêng
          // biệt...") kéo cả 908 dòng dư vào mọi truy vấn dài.
          if (ctxHits >= CONTEXT_MIN_HITS && ctxHits / countedTokens >= CONTEXT_MIN_RATIO) hit = true;
        }
        if (!hit) return null;
      }

      const full = taxData[item.hs] || {};
      return {
        hsCode: item.hs,
        nameVi: item.vn,
        score: scoreCandidate(item, searchKeyword, keywordPlain, keywordTokens, scoreMeta),
        source: 'tax.json',
        taxNkPreferential: full.mfn || null,
        taxAcfta: full.acfta || null,
        taxVat: full.vat || null,
        policyByHs: full.cs || null,
        hasPolicyWarning: item.cs === '1',
        queryExpansion: expanded.expansionSources.length ? expanded.expansionSources : undefined,
      };
    })
    .filter(Boolean);

  // Alias và từ điển tên thương mại chỉ dành cho câu hỏi bằng chữ. Gõ thẳng mã
  // số thì người ta đã biết mình muốn gì, không cần bắc cầu.
  if (isHSQuery) return dedupeByHs(scored.sort((a, b) => b.score - a.score)).slice(0, topCandidates);

  const trade = injectTradeCandidates(query, scored, csOnly);
  const merged = injectAliasCandidates(query, trade.list, csOnly);
  const ranked = dedupeByHs(merged.sort((a, b) => b.score - a.score)).slice(0, topCandidates);

  // Đính kèm phần giải trình vào mảng kết quả (không đổi kiểu trả về để mọi nơi
  // gọi cũ vẫn chạy). api/search.js đọc ra, các chỗ khác kệ nó.
  if (trade.avoided.length) ranked.avoidedByTradeRules = trade.avoided;
  if (trade.trade.length) ranked.tradeTermMatches = trade.trade;
  if (trade.excluded.length) ranked.tradeTermExcluded = trade.excluded;
  return ranked;
}

module.exports = { searchCandidates, removeDiacritics };
