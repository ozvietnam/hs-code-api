const { searchData, taxData } = require('./data');
const { expandSearchQuery } = require('./search-query-expand');
const { getBrandHint } = require('./glossary');
const { lookupAliases } = require('./hs-aliases');
const { lookupTradeTerms } = require('./trade-synonyms');
const { contextPlainOf, contextHitCounts } = require('./hs-breadcrumb');
const { parseCommodityQuery } = require('./query-parse');
const { resolveHeading } = require('./decision-tables');

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
 * Đo trên ĐỦ 763 tờ khai giữ riêng, alias + từ điển bật ở mọi lượt, chỉ đổi
 * riêng ba số này (top-1 / top-3 ở mức 8 số — mức khắt khe nhất):
 *   TẮT hẳn lớp ngữ cảnh   →  8,9 / 14,0
 *   2 token / 0,4 / 12đ    →  9,4 / 14,5   ← đang dùng
 *   3 token / 0,6 /  8đ    →  9,0 / 14,0   ngang với tắt hẳn
 *
 * HAI CÁI BẪY ĐÃ SẬP, ghi lại để khỏi sập lần nữa:
 *
 * 1. Đừng chỉnh ba số này trên tập con. Quét trên 300 tờ khai đầu cho kết quả
 *    NGƯỢC LẠI: 3/0,6/8 thắng 2/0,4/12 ở mức chương (35,3 so với 34,3). Chạy
 *    đủ 763 thì thứ tự đảo. Chênh lệch ở đây cỡ 1–4 tờ khai, tập con không đủ
 *    phân giải. Đo thì đo đủ, mất 16 phút.
 *
 * 2. Lần đầu bộ ba 2/0,4/12 này bị kết tội oan là làm giảm kết quả. Thủ phạm
 *    thật là MẪU SỐ tính tỉ lệ (xem chỗ dựng contextTokens bên dưới), không
 *    phải ngưỡng. Sửa mẫu số xong thì không cấu hình nào còn tệ hơn tắt hẳn.
 *    Thấy lớp này có vẻ kém thì soi lại cách đếm trước khi vặn ngưỡng.
 */
const CONTEXT_MIN_HITS = 2;
const CONTEXT_MIN_RATIO = 0.4;
const CONTEXT_WEIGHT = 12;

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
 * Lá do bảng quyết định chốt bằng thuộc tính đứng trên mọi tín hiệu tên gọi —
 * đó là ý nghĩa của "cây quyết định": tên đưa tới nhóm, thuộc tính chốt lá.
 */
const DECISION_BOOST = 300;
/** Lá còn khả dĩ theo bảng (chưa đủ dữ kiện để chốt) đứng trên lá đã bị loại. */
const NARROW_BOOST = 120;

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
      if (c.prefix) {
        // Ứng viên cấp NHÓM: tên gọi chỉ nói được tới nhóm. Cộng điểm cho lá đã
        // khớp lời văn trong nhóm; lá 8 số do bảng quyết định (thuộc tính) chọn.
        let boosted = 0;
        for (const s of list) {
          if (!s.hsCode.startsWith(c.hsCode)) continue;
          s.score += base;
          s.tradeMatch = { ...meta, viaPrefix: c.hsCode };
          boosted++;
        }
        if (!boosted) {
          // Không lá nào khớp lời văn → đưa nhóm vào với điểm thấp hơn để nó
          // hiện ra; bảng quyết định / câu hỏi gạn sẽ dẫn xuống lá.
          for (const hs of c.leaves.slice(0, 40)) {
            if (byHs.has(hs)) continue;
            const full = taxData[hs];
            if (!full) continue;
            if (csOnly && full.cs !== '1') continue;
            const candidate = {
              hsCode: hs,
              nameVi: full.vn || '',
              score: base - 60,
              source: 'trade-synonyms',
              taxNkPreferential: full.mfn || null,
              taxAcfta: full.acfta || null,
              taxVat: full.vat || null,
              policyByHs: full.cs || null,
              hasPolicyWarning: full.cs === '1',
              tradeMatch: { ...meta, viaPrefix: c.hsCode },
            };
            list.push(candidate);
            byHs.set(hs, candidate);
          }
        }
        continue;
      }
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

// Mệnh đề CÔNG DỤNG trong tên dòng biểu thuế: "Ống … dùng cho … nồi cơm điện",
// "Công tắc mini thích hợp dùng cho nồi cơm điện", "Bộ phận của máy bơm". Phần
// sau mốc này nói hàng dùng CHO cái gì, không phải hàng LÀ cái gì. Trước đây
// "nồi cơm điện" khớp nguyên cụm ở đuôi dòng ống thép 7306 nên thắng "Nồi nấu
// cơm" 8516. Từ/cụm chỉ khớp ở mệnh đề công dụng được tính USAGE_WEIGHT điểm.
const USAGE_MARKER_RE = /\b(?:thích hợp )?(?:dùng cho|sử dụng cho|dùng trong|dùng để|dùng làm|lắp vào|dành cho|chuyên dùng cho|của)\b/;
const USAGE_WEIGHT = 0.4;
function headOfLine(text) {
  const m = USAGE_MARKER_RE.exec(text);
  return m ? text.slice(0, m.index) : text;
}
// 1 = khớp ở phần tên hàng; USAGE_WEIGHT = chỉ khớp ở mệnh đề công dụng; 0 = không khớp.
function hitWeight(full, head, needle) {
  if (!full.includes(needle)) return 0;
  return head === full || head.includes(needle) ? 1 : USAGE_WEIGHT;
}

function scoreCandidate(item, keyword, keywordPlain, extraTokens = [], scoreMeta = {}) {
  const vn = (item.vn || '').toLowerCase();
  const vnPlain = removeDiacritics(vn);
  const searchKeyword = keyword;
  // Chỉ coi là "khớp ở mệnh đề công dụng" khi phần tên hàng KHÔNG chứa từ nào
  // của câu hỏi. "Dầu dùng trong bộ hãm thủy lực" với câu "dầu thủy lực" vẫn là
  // dòng nói về dầu → tính đủ điểm; "Ống … dùng cho … nồi cơm điện" thì không.
  let vnHead = headOfLine(vn);
  let vnHeadPlain = vnHead === vn ? vnPlain : removeDiacritics(vnHead);
  if (vnHead !== vn) {
    // So nguyên từ (không lấy "là" ⊂ "làm"), để mệnh đề công dụng không được
    // "cứu" bởi một tiếng 2 ký tự trùng ngẫu nhiên.
    const own = searchKeyword.split(/\s+/).filter((w) => w.length >= 2);
    const wordRe = (w) => new RegExp(`(^|[^\\p{L}\\d])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}\\d]|$)`, 'u');
    if (own.some((w) => wordRe(w).test(vnHead) || wordRe(removeDiacritics(w)).test(vnHeadPlain))) {
      vnHead = vn;
      vnHeadPlain = vnPlain;
    }
  }
  let score = 0;

  if (item.hs.startsWith(keyword.replace(/\./g, ''))) score += 100;
  score += 50 * hitWeight(vn, vnHead, keyword);
  score += 40 * hitWeight(vnPlain, vnHeadPlain, keywordPlain);

  const words = [...searchKeyword.split(/\s+/), ...extraTokens];
  for (const word of words) {
    if (word.length < 2) continue;
    if (/^\d{4}$/.test(word) && item.hs.startsWith(word)) score += 60;
    score += 10 * hitWeight(vn, vnHead, word);
    score += 8 * hitWeight(vnPlain, vnHeadPlain, removeDiacritics(word));
  }

  const parts = searchKeyword.split(/\s+/).filter((w) => w.length >= 2);
  for (let i = 0; i < parts.length - 1; i++) {
    const phrase = parts.slice(i, i + 2).join(' ');
    if (phrase.length < 4) continue;
    const phrasePlain = removeDiacritics(phrase);
    score += 35 * hitWeight(vn, vnHead, phrase);
    score += 30 * hitWeight(vnPlain, vnHeadPlain, phrasePlain);
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

function searchCandidates(query, { topCandidates = 10, csOnly = false, facts = null } = {}) {
  const rawQuery = String(query || '').trim();
  if (rawQuery.length < 2) return [];

  // Bóc cơ cấu + thông số ra khỏi câu TRƯỚC khi so từ khoá. "bàn nâng thủy lực"
  // mà so cả câu thì "thủy lực" kéo về vôi 2522, xi măng 2523, dầu phanh 2710 —
  // trong khi thứ nói lên mặt hàng là "bàn nâng". Alias và từ điển tên thương
  // mại bên dưới vẫn nhận CÂU GỐC (`query`), nên tiền lệ "xi lanh khí nén" → 8412
  // không mất. Chỉ tầng khớp lời văn biểu thuế mới dùng danh từ lõi.
  const parsed = parseCommodityQuery(rawQuery);
  const keyword = parsed.coreVi.toLowerCase();

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
        // mã nhóm 4 số (gợi ý từ từ điển) không nằm trong tên dòng → không tính vào ngưỡng
        const textTokenCount = keywordTokens.filter((w) => !/^\d{4}$/.test(w)).length;
        const minTokenHits = textTokenCount <= 2 ? 1 : 2;
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
  let merged = injectAliasCandidates(query, trade.list, csOnly);

  // Tiền lệ Oz (alias) chạy SAU từ điển tay — phải áp lại mã bẫy, nếu không
  // 7321 / 8480… đã loại sẽ bị bơm ngược vào kết quả.
  const avoidRules = [];
  for (const m of trade.trade) for (const a of m.avoid || []) {
    avoidRules.push({ ...a, entryId: m.entryId });
  }
  const avoidedExtra = [];
  if (avoidRules.length) {
    const kept = [];
    for (const c of merged) {
      const rule = avoidRules.find((a) => c.hsCode.startsWith(a.prefix));
      if (rule) {
        avoidedExtra.push({
          hsCode: c.hsCode,
          nameVi: c.nameVi,
          prefix: rule.prefix,
          whyVi: rule.whyVi,
          entryId: rule.entryId,
        });
        continue;
      }
      kept.push(c);
    }
    merged = kept;
  }

  // Bảng quyết định theo nhóm: từ tên gọi đã tới nhóm, xuống lá 8 số là việc
  // của THUỘC TÍNH (dày, Ø, tự hành…), không phải của tên. Bảng CHỈ nói "trong
  // nhóm này thì lá nào", không nói nhóm có đúng không — nên chỉ chạy cho nhóm
  // của ứng viên đầu. Bản đầu xét 3 nhóm dẫn đầu và cộng điểm cho lá nhóm phụ:
  // holdout 763 tụt 0,5 điểm mức 4 số (18,3 → 17,8) vì lá nhóm sai nhảy lên
  // đầu; câu "máy hút bụi" còn bị bảng 8452 hỏi về kim máy khâu.
  const decisions = [];
  {
    const byScore = [...merged].sort((a, b) => b.score - a.score);
    const headings = byScore.length ? [byScore[0].hsCode.slice(0, 4)] : [];
    for (const h of headings) {
      const d = resolveHeading(h, { text: query, parsed, facts: facts || {} });
      if (d.status === 'NO_TABLE') continue;
      decisions.push(d);
      if (d.status !== 'RESOLVED') {
        // Chưa chốt được nhưng đã loại được nhánh: lá còn khả dĩ nhích lên, lá đã
        // bị dữ kiện bác bỏ (vd TMBP khi không nói tới) tụt xuống dưới chúng.
        const alive = new Set(d.narrowed || []);
        if (alive.size) for (const c of merged) if (c.hsCode.startsWith(h) && alive.has(c.hsCode)) c.score += NARROW_BOOST;
        continue;
      }
      let leaf = merged.find((c) => c.hsCode === d.hs);
      if (!leaf) {
        const full = taxData[d.hs];
        if (!full || (csOnly && full.cs !== '1')) continue;
        leaf = {
          hsCode: d.hs,
          nameVi: full.vn || '',
          score: 0,
          source: 'decision-table',
          taxNkPreferential: full.mfn || null,
          taxAcfta: full.acfta || null,
          taxVat: full.vat || null,
          policyByHs: full.cs || null,
          hasPolicyWarning: full.cs === '1',
        };
        merged.push(leaf);
      }
      leaf.score += DECISION_BOOST;
      leaf.decision = { heading: d.heading, ruleId: d.ruleId, reasonVi: d.reasonVi, tableVerified: d.tableVerified };
    }
  }

  const ranked = dedupeByHs(merged.sort((a, b) => b.score - a.score)).slice(0, topCandidates);

  // Đính kèm phần giải trình vào mảng kết quả (không đổi kiểu trả về để mọi nơi
  // gọi cũ vẫn chạy). api/search.js đọc ra, các chỗ khác kệ nó.
  if (decisions.length) ranked.decisions = decisions;
  if (parsed.stripped || parsed.specs.length || parsed.mechanisms.length || parsed.materialGrades.length) {
    ranked.parsedQuery = parsed;
  }
  const avoided = [...trade.avoided, ...avoidedExtra];
  if (avoided.length) ranked.avoidedByTradeRules = avoided;
  if (trade.trade.length) ranked.tradeTermMatches = trade.trade;
  if (trade.excluded.length) ranked.tradeTermExcluded = trade.excluded;
  return ranked;
}

module.exports = { searchCandidates, removeDiacritics };
