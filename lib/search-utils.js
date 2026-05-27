const { searchData, taxData } = require('./data');

function removeDiacritics(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function scoreCandidate(item, keyword, keywordPlain) {
  const vn = (item.vn || '').toLowerCase();
  const vnPlain = removeDiacritics(vn);
  let score = 0;

  if (item.hs.startsWith(keyword.replace(/\./g, ''))) score += 100;
  if (vn.includes(keyword)) score += 50;
  if (vnPlain.includes(keywordPlain)) score += 40;

  for (const word of keyword.split(/\s+/)) {
    if (word.length < 2) continue;
    if (vn.includes(word)) score += 10;
    if (vnPlain.includes(removeDiacritics(word))) score += 8;
  }

  if (item.cs === '1') score += 1;
  return score;
}

function searchCandidates(query, { topCandidates = 10, csOnly = false } = {}) {
  const keyword = String(query || '').trim().toLowerCase();
  if (keyword.length < 2) return [];

  const keywordPlain = removeDiacritics(keyword);
  const isHSQuery = /^\d{4,}/.test(keyword);
  const keywordTokens = keyword
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);

  const scored = searchData
    .map((item) => {
      if (csOnly && item.cs !== '1') return null;
      if (isHSQuery && !item.hs.startsWith(keyword.replace(/\./g, ''))) return null;
      if (!isHSQuery) {
        const vn = (item.vn || '').toLowerCase();
        const vnPlain = removeDiacritics(vn);
        const tokenHits = keywordTokens.reduce((count, w) => {
          const plain = removeDiacritics(w);
          if (vn.includes(w) || vnPlain.includes(plain)) return count + 1;
          return count;
        }, 0);
        const minTokenHits = keywordTokens.length <= 2 ? 1 : 2;
        const hit =
          vn.includes(keyword) ||
          vnPlain.includes(keywordPlain) ||
          tokenHits >= minTokenHits;
        if (!hit) return null;
      }

      const full = taxData[item.hs] || {};
      return {
        hsCode: item.hs,
        nameVi: item.vn,
        score: scoreCandidate(item, keyword, keywordPlain),
        source: 'tax.json',
        taxNkPreferential: full.mfn || null,
        taxAcfta: full.acfta || null,
        taxVat: full.vat || null,
        policyByHs: full.cs || null,
        hasPolicyWarning: item.cs === '1',
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, topCandidates);

  return scored;
}

module.exports = { searchCandidates, removeDiacritics };
