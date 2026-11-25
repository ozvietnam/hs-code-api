const brandProductMap = require('../data/brand-product-map.json');
const englishProductMap = require('../data/english-product-map.json');
const vnProductSynonyms = require('../data/vn-product-synonyms.json');
const { glossaryExpansionTerms, translateToVi } = require('./glossary');
const { materialExpansionTerms } = require('./material-taxonomy');

function removeDiacritics(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

const NOISE_TOKEN =
  /^(pro|max|plus|mini|ultra|lite|new|series|gen\d*|(\d+(\.\d+)?)?(kg|ml|kw|ghz|mhz|gb|tb|m3|cm|mm|inch)|\d+(\.\d+)?(g|l|w|v|in)?)$/i;

function cleanToken(tok) {
  return String(tok || '')
    .replace(/^[,;:()"'-]+/, '')
    .replace(/[,;:()"'-]+$/, '');
}

function stripNoiseTokens(tokens) {
  return tokens
    .map(cleanToken)
    .filter((t) => t.length >= 2 && !NOISE_TOKEN.test(t));
}

const VN_ENTRIES = Object.keys(vnProductSynonyms)
  .sort((a, b) => b.length - a.length)
  .map((key) => {
    const synonyms = (vnProductSynonyms[key] || []).map((syn) => ({
      syn,
      isHint4: /^\d{4}$/.test(syn),
      words4: syn.split(/\s+/).filter((w) => w.length >= 4),
    }));
    return { key, keyPlain: removeDiacritics(key), synonyms };
  });

const EN_ENTRIES = Object.keys(englishProductMap)
  .sort((a, b) => b.length - a.length)
  .map((key) => {
    const vnTerms = englishProductMap[key];
    if (!vnTerms || !vnTerms.length) return null;
    return {
      key,
      terms: vnTerms.map((vn) => ({ vn, words2: vn.split(/\s+/).filter((w) => w.length >= 2) })),
    };
  })
  .filter(Boolean);

const BRAND_ENTRIES = Object.entries(brandProductMap).map(([brand, categories]) => {
  const brandLower = brand.toLowerCase();
  const brandPlain = removeDiacritics(brandLower);
  return {
    brand,
    brandLower,
    brandPlain,
    cats: (categories || []).map((cat) => ({
      cat,
      words5: cat.split(/\s+/).filter((w) => w.length >= 5),
    })),
  };
});

function expandSearchQuery(raw) {
  const original = String(raw || '').trim();
  const translated = translateToVi(original);
  const lower = translated.toLowerCase();
  if (!lower) {
    return { original: raw, query: '', keywordTokens: [], expansionSources: [] };
  }

  const tokens = stripNoiseTokens(lower.split(/\s+/).filter(Boolean));
  const expansionTerms = new Set(tokens);
  const expansionSources = [];
  // Mã NHÓM 4 số do từ điển gợi ý ("tủ lạnh" → 8418). Trước đây được add vào
  // expansionTerms rồi bị stripNoiseTokens (nhánh \d+) xoá luôn → +60 điểm cho
  // dòng cùng nhóm và chapterHint trong search-utils là code chết. Giữ riêng và
  // nối lại sau bộ lọc; số người GÕ (kích thước, năm) vẫn bị lọc như cũ.
  const headingHints = new Set();

  const lowerPlain = removeDiacritics(lower);
  for (let i = 0; i < VN_ENTRIES.length; i += 1) {
    const { key, keyPlain, synonyms } = VN_ENTRIES[i];
    if (!lower.includes(key) && !lowerPlain.includes(keyPlain)) continue;
    // Danh ngữ tiếng Việt đặt DANH TỪ LÕI trước: "piston động cơ xe máy" là piston,
    // không phải xe máy. Chỉ lấy mã nhóm gợi ý khi key đứng ĐẦU câu; key ở giữa/cuối
    // (bổ ngữ) vẫn được mở rộng từ đồng nghĩa nhưng không kéo nhóm.
    const keyAtHead = lower.startsWith(key) || lowerPlain.startsWith(keyPlain);
    for (let j = 0; j < synonyms.length; j += 1) {
      const s = synonyms[j];
      expansionTerms.add(s.syn);
      if (s.isHint4) {
        if (keyAtHead) headingHints.add(s.syn);
        continue;
      }
      for (let k = 0; k < s.words4.length; k += 1) expansionTerms.add(s.words4[k]);
    }
    expansionSources.push({ type: 'vn_synonym', term: key });
  }

  for (let i = 0; i < EN_ENTRIES.length; i += 1) {
    const { key, terms } = EN_ENTRIES[i];
    if (!lower.includes(key)) continue;
    for (let j = 0; j < terms.length; j += 1) {
      const t = terms[j];
      expansionTerms.add(t.vn);
      for (let k = 0; k < t.words2.length; k += 1) expansionTerms.add(t.words2[k]);
    }
    expansionSources.push({ type: 'english', term: key });
  }

  const uniqueTokens = [...new Set(tokens)];
  const uniqueTokensSet = new Set(uniqueTokens);
  const uniqueTokensPlain = new Set(uniqueTokens.map(removeDiacritics));
  for (let i = 0; i < BRAND_ENTRIES.length; i += 1) {
    const { brand, brandLower, brandPlain, cats } = BRAND_ENTRIES[i];
    const brandHit =
      lower.includes(brandLower) ||
      uniqueTokensSet.has(brandLower) ||
      uniqueTokensPlain.has(brandPlain);
    if (!brandHit) continue;
    for (let j = 0; j < cats.length; j += 1) {
      const c = cats[j];
      expansionTerms.add(c.cat);
      for (let k = 0; k < c.words5.length; k += 1) expansionTerms.add(c.words5[k]);
    }
    expansionSources.push({ type: 'brand', term: brand });
  }

  for (const term of glossaryExpansionTerms(original)) {
    expansionTerms.add(term);
    if (/^\d{4}$/.test(term)) {
      headingHints.add(term);
      continue;
    }
    term.split(/\s+/).forEach((w) => {
      if (w.length >= 4) expansionTerms.add(w);
    });
    expansionSources.push({ type: 'glossary', term });
  }

  const material = materialExpansionTerms(original);
  for (const term of material.terms) {
    expansionTerms.add(term);
    // gợi ý của vật liệu ("thép không gỉ" → 7219/7220/7304) là nhiều nhóm cùng lúc,
    // đã đi qua preferChapterPrefixes — không đưa vào headingHints kẻo +60 cho cả 7304
    if (/^\d{2,4}$/.test(term)) continue;
    term.split(/\s+/).forEach((w) => {
      if (w.length >= 3) expansionTerms.add(w);
    });
  }
  if (material.materials.length) {
    expansionSources.push({
      type: 'material',
      term: material.materials.map((m) => m.material).join(', '),
      hsHints: material.materials.flatMap((m) => m.hsHints || []),
    });
  }

  const keywordTokens = [...expansionTerms]
    .flatMap((t) => stripNoiseTokens(t.split(/\s+/)))
    .filter((w, i, arr) => w.length >= 2 && arr.indexOf(w) === i);
  for (const hint of headingHints) if (!keywordTokens.includes(hint)) keywordTokens.push(hint);

  const expandedQuery = keywordTokens.join(' ');
  return {
    original: raw,
    translatedQuery: translated !== original ? translated : undefined,
    query: expandedQuery || lower,
    keywordTokens: keywordTokens.length ? keywordTokens : tokens,
    headingHints: [...headingHints],
    expansionSources,
    materialsDetected: material.materials,
    preferChapterPrefixes: material.preferChapterPrefixes,
  };
}

module.exports = { expandSearchQuery, stripNoiseTokens, NOISE_TOKEN };
