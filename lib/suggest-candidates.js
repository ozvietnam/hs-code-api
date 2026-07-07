// Hybrid candidate generation cho /api/suggest.
// Nút thắt cũ: searchCandidates (keyword thô) chỉ ~5% exact recall → LLM rerank "rác vào rác ra".
// Cách mới: LLM đề xuất nhóm 4-số (recall heading ~100%) → mở rộng thành mã 8-số thật trong tax.json
// → rerank LLM chỉ chọn subcode đúng trong nhóm đúng (việc nó giỏi).
// Bổ sung: precedent Oz (mã 8-số đã khai) + keyword search (backup). LUÔN fallback keyword nếu LLM lỗi.

const { searchData, taxData } = require('./data');
const { searchCandidates, removeDiacritics } = require('./search-utils');
const { llmProposeHeadings } = require('./retrieve-candidates');
const { searchOzByKeyword } = require('./oz-precedent-search');

// Index heading4 → [items] (build 1 lần, cache module-level).
let _byHeading = null;
function headingIndex() {
  if (_byHeading) return _byHeading;
  _byHeading = new Map();
  for (const it of searchData) {
    const h4 = String(it.hs).slice(0, 4);
    if (!_byHeading.has(h4)) _byHeading.set(h4, []);
    _byHeading.get(h4).push(it);
  }
  return _byHeading;
}

function tokenize(text) {
  return removeDiacritics(String(text || '').toLowerCase())
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !/^\d+$/.test(w));
}

// Điểm khớp token giữa mô tả và tên HS (bỏ dấu). Nhẹ, không LLM.
function nameScore(descTokens, vnPlain) {
  let s = 0;
  for (const t of descTokens) if (vnPlain.includes(t)) s += 1;
  return s;
}

function makeEvidence(hs, { score, source }) {
  const full = taxData[hs] || {};
  return {
    hsCode: hs,
    nameVi: full.vn || full.en || '',
    score,
    source,
    taxNkPreferential: full.mfn || null,
    taxAcfta: full.acfta || null,
    taxVat: full.vat || null,
    policyByHs: full.cs || null,
    hasPolicyWarning: full.cs === '1',
  };
}

/**
 * Sinh candidate lai.
 * @param {string} description
 * @param {object} opts
 *   topCandidates   số candidate tối đa trả về (default 12)
 *   perHeading      số subcode tối đa lấy mỗi nhóm (default 4)
 *   maxHeadings     số nhóm LLM tối đa dùng (default 6)
 *   includePrecedent  có trộn precedent Oz không (default true)
 *   tier            tier LLM cho call đề xuất nhóm (default 'standard' — rẻ)
 *   timeoutMs       timeout call nhóm (default 15000)
 * @returns {Promise<{candidates: object[], meta: object}>}
 */
async function buildSuggestCandidates(description, opts = {}) {
  const topCandidates = opts.topCandidates || 12;
  const perHeading = opts.perHeading || 4;
  const maxHeadings = opts.maxHeadings || 6;
  const includePrecedent = opts.includePrecedent !== false;
  const descTokens = tokenize(description);

  // Đề xuất nhóm qua LLM — retry 1 lần nếu rỗng/lỗi (chống rate-limit chập chờn).
  async function proposeHeadings() {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const h = await llmProposeHeadings({ tenHang: description }, { tier: opts.tier || 'standard', timeoutMs: opts.timeoutMs || 15000 });
        if (Array.isArray(h) && h.length) return h.slice(0, maxHeadings);
      } catch { /* retry */ }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1200));
    }
    return [];
  }

  // Chạy song song: LLM headings + precedent + keyword (mỗi cái tự bọc lỗi).
  const [headings, precedent, keyword] = await Promise.all([
    proposeHeadings(),
    includePrecedent
      ? searchOzByKeyword(description, { limit: 8 }).then((r) => r.items || []).catch(() => [])
      : Promise.resolve([]),
    Promise.resolve().then(() => searchCandidates(description, { topCandidates })).catch(() => []),
  ]);

  const idx = headingIndex();
  const pool = new Map(); // hs -> evidence
  const add = (hs, score, source) => {
    const code = String(hs).replace(/\./g, '').trim();
    if (!code || code.length < 4) return;
    const prev = pool.get(code);
    if (!prev || score > prev.score) pool.set(code, makeEvidence(code, { score, source }));
  };

  // 1) Precedent Oz — tín hiệu mạnh nhất (mã 8-số Oz đã khai). Base score cao.
  for (const it of precedent) {
    const hs = String(it.hsCode).replace(/\./g, '').trim();
    add(hs, 900 + (it.matchCoverage || 0) + Math.min(50, (it.ozCount || 1)), 'precedent');
  }

  // 2) LLM headings → mở rộng subcode 8-số, xếp theo token-score, lấy top perHeading mỗi nhóm.
  //    Nhóm đứng đầu (LLM tin hơn) được base cao hơn.
  headings.forEach((h4, hi) => {
    const items = idx.get(String(h4).slice(0, 4)) || [];
    const ranked = items
      .map((it) => ({ it, s: nameScore(descTokens, removeDiacritics((it.vn || '').toLowerCase())) }))
      .sort((a, b) => b.s - a.s);
    // luôn giữ vài mã token-match cao; nếu nhóm nhỏ thì lấy hết
    const take = ranked.slice(0, Math.max(perHeading, 0));
    const headBase = 500 - hi * 20;
    take.forEach(({ it, s }, ri) => add(it.hs, headBase + s * 5 - ri, 'llm-heading'));
  });

  // 3) Keyword search — backup (luôn có, kể cả khi LLM lỗi → không bao giờ tệ hơn cũ).
  for (const e of keyword) add(e.hsCode, Math.min(400, e.score), e.source || 'keyword');

  const candidates = [...pool.values()].sort((a, b) => b.score - a.score).slice(0, topCandidates);

  return {
    candidates,
    meta: {
      headings,
      precedentCount: precedent.length,
      keywordCount: keyword.length,
      poolSize: pool.size,
      usedLlmHeadings: headings.length > 0,
    },
  };
}

module.exports = { buildSuggestCandidates };
