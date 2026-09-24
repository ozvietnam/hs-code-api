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
  /^(pro|max|plus|mini|ultra|lite|new|series|gen\d*|\d+(\.\d+)?(kg|g|l|ml|w|kw|v|ghz|mhz|gb|tb|m3|cm|mm|inch|in)?)$/i;

function stripNoiseTokens(tokens) {
  return tokens.filter((t) => t.length >= 2 && !NOISE_TOKEN.test(t));
}

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

  const vnKeys = Object.keys(vnProductSynonyms).sort((a, b) => b.length - a.length);
  const lowerPlain = removeDiacritics(lower);
  for (const key of vnKeys) {
    const synonyms = vnProductSynonyms[key];
    const keyPlain = removeDiacritics(key);
    if (!lower.includes(key) && !lowerPlain.includes(keyPlain)) continue;
    // Danh ngữ tiếng Việt đặt DANH TỪ LÕI trước: "piston động cơ xe máy" là piston,
    // không phải xe máy. Chỉ lấy mã nhóm gợi ý khi key đứng ĐẦU câu; key ở giữa/cuối
    // (bổ ngữ) vẫn được mở rộng từ đồng nghĩa nhưng không kéo nhóm.
    const keyAtHead = lower.startsWith(key) || lowerPlain.startsWith(keyPlain);
    for (const syn of synonyms) {
      expansionTerms.add(syn);
      if (/^\d{4}$/.test(syn)) {
        if (keyAtHead) headingHints.add(syn);
        continue;
      }
      syn.split(/\s+/).forEach((w) => {
        if (w.length >= 4) expansionTerms.add(w);
      });
    }
    expansionSources.push({ type: 'vn_synonym', term: key });
  }

  const englishKeys = Object.keys(englishProductMap).sort((a, b) => b.length - a.length);
  for (const key of englishKeys) {
    const vnTerms = englishProductMap[key];
    if (!vnTerms || !vnTerms.length) continue;
    if (!lower.includes(key)) continue;
    for (const vn of vnTerms) {
      expansionTerms.add(vn);
      vn.split(/\s+/).forEach((w) => {
        if (w.length >= 2) expansionTerms.add(w);
      });
    }
    expansionSources.push({ type: 'english', term: key });
  }

  for (const [brand, categories] of Object.entries(brandProductMap)) {
    const brandLower = brand.toLowerCase();
    const brandPlain = removeDiacritics(brandLower);
    const brandHit =
      lower.includes(brandLower) ||
      tokens.some((tok) => tok === brandLower || removeDiacritics(tok) === brandPlain);
    if (!brandHit) continue;
    for (const cat of categories) {
      expansionTerms.add(cat);
      cat.split(/\s+/).forEach((w) => {
        if (w.length >= 5) expansionTerms.add(w);
      });
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
