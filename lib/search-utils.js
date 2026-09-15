const { searchData, taxData } = require('./data');
const { expandSearchQuery } = require('./search-query-expand');
const { getBrandHint } = require('./glossary');
const { lookupAliases } = require('./hs-aliases');

/**
 * Điểm mồi cho ứng viên đến từ bảng alias (tiền lệ tờ khai đã thông quan).
 *
 * Đặt cao hơn mọi điểm khớp từ khoá (tối đa ~250) là CỐ Ý: rất nhiều mã đúng có
 * tên chính thức là "Loại khác", không từ khoá nào chạm tới. Một cụm từ đã được
 * khai đúng hàng chục lần đáng tin hơn một dòng biểu thuế tình cờ trùng chữ.
 */
const ALIAS_BASE_SCORE = { high: 300, medium: 200, low: 120 };

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

  for (const prefix of scoreMeta.preferChapterPrefixes || []) {
    if (item.hs.startsWith(prefix)) score += 70;
  }
  for (const prefix of scoreMeta.penalizeChapterPrefixes || []) {
    if (item.hs.startsWith(prefix)) score -= 50;
  }

  if (item.cs === '1') score += 1;
  return score;
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
        const hit =
          vn.includes(keyword) ||
          vnPlain.includes(originalPlain) ||
          vn.includes(searchKeyword) ||
          vnPlain.includes(keywordPlain) ||
          tokenHits >= minTokenHits;
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

  // Alias chỉ dành cho câu hỏi bằng chữ. Gõ thẳng mã số thì không cần bắc cầu.
  const merged = isHSQuery ? scored : injectAliasCandidates(query, scored, csOnly);

  return merged.sort((a, b) => b.score - a.score).slice(0, topCandidates);
}

module.exports = { searchCandidates, removeDiacritics };
