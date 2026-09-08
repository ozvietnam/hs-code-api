const { normalizeHs } = require('./data');
const { getSpecificityForHs, tokenizeVi } = require('./gir-specificity');

const MIXTURE_CHAPTERS = new Set(['28', '29', '38', '72', '74']);

function normalizeDesc(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function matchEssential(description, essentials = []) {
  const desc = normalizeDesc(description);
  if (!essentials.length) return 0;
  let hits = 0;
  for (const e of essentials) {
    const f = normalizeDesc(e.feature || '');
    if (f.length >= 3 && desc.includes(f)) hits += e.required ? 2 : 1;
  }
  return hits;
}

function materialBoost(description, spec, hsCode) {
  const desc = normalizeDesc(description);
  const tags = (spec.specificityTags || []).join(' ');
  let boost = 0;
  if (/\bcotton\b|bong/.test(desc) && /cotton|bong/.test(tags)) boost += 15;
  if (/\bcotton\b|bong/.test(desc) && /long cuu|len|wool/.test(tags)) boost -= 18;
  if (/\bcotton\b|bong/.test(desc) && String(hsCode || '').startsWith('62059')) boost -= 10;
  if (/so mi|shirt/.test(desc) && /so mi|ao/.test(tags)) boost += 6;
  if (/so mi|shirt/.test(desc) && /ro-mooc|romooc/.test(tags)) boost -= 20;
  return boost;
}

function enrichCandidate(candidate, description) {
  const hsCode = normalizeHs(candidate.hsCode);
  const spec = getSpecificityForHs(hsCode);
  const confidence = Number(candidate.confidence) || Number(candidate.score) || 0;
  const essentialBoost = matchEssential(description, spec.essentialCharacteristics) * 5;
  const matBoost = materialBoost(description, spec, hsCode);
  return {
    ...candidate,
    hsCode,
    specificityScore: spec.specificityScore,
    specificityTags: spec.specificityTags,
    essentialCharacteristics: spec.essentialCharacteristics,
    confidence: confidence + essentialBoost + matBoost,
    _girBoost: essentialBoost + matBoost,
  };
}

/**
 * Xếp hạng lại ứng viên sau khi LLM rerank.
 *
 * ⚠️ Hàm này KHÔNG phán định quy tắc GIR. Trước đây nó gắn nhãn 'GIR-2a',
 * 'GIR-3a'... cho các phép cộng/trừ điểm heuristic — sai nghiêm trọng: GIR 2(a)
 * nói về hàng chưa lắp ráp, không liên quan tới việc khớp từ khoá đặc tính.
 * Việc trích dẫn GIR nay thuộc về lib/gir.js, nơi mỗi trích dẫn phải có căn cứ
 * và bằng chứng. Ở đây chỉ trả về `rankingSignals` — tín hiệu kỹ thuật, minh
 * bạch là ước lượng, không mang giá trị pháp lý.
 */
function applyGirRules(candidates, description) {
  const rankingSignals = [];
  if (!candidates?.length) {
    return { suggestions: [], rankingSignals, girRankingRules: [] };
  }

  let filtered = candidates.map((c) => enrichCandidate(c, description));

  const maxSpec = Math.max(...filtered.map((c) => c.specificityScore || 0));
  const before = filtered.length;
  filtered = filtered.filter((c) => (c.specificityScore || 0) >= maxSpec - 10);
  if (filtered.length < before) {
    rankingSignals.push({
      signal: 'specificity_filter',
      effect: `loại ${before - filtered.length} ứng viên có điểm cụ thể thấp hơn ngưỡng`,
      note: 'Ước lượng độ cụ thể bằng điểm số nội bộ — CHƯA đối chiếu nguyên văn nhóm.',
    });
  }

  if (filtered.some((c) => matchEssential(description, c.essentialCharacteristics) > 0)) {
    rankingSignals.push({
      signal: 'essential_characteristic_match',
      effect: 'cộng điểm cho ứng viên khớp đặc tính phân biệt',
      note: 'Khớp từ khoá đặc tính. Không đồng nghĩa với GIR 2(a) hay 3(b).',
    });
  }

  filtered.sort((a, b) => b.confidence - a.confidence);
  // Hoà điểm: lấy mã có thứ tự số học sau cùng. Đây LÀ tinh thần GIR 3(c), nhưng
  // việc trích dẫn quy tắc do lib/gir.js quyết định sau khi đã có mã cuối cùng.
  if (
    filtered.length >= 2 &&
    Math.abs(filtered[0].confidence - filtered[1].confidence) < 3
  ) {
    if (filtered[0].hsCode.localeCompare(filtered[1].hsCode) < 0) {
      [filtered[0], filtered[1]] = [filtered[1], filtered[0]];
    }
    rankingSignals.push({
      signal: 'numerical_order_tiebreak',
      effect: `hoà điểm → ưu tiên ${filtered[0].hsCode}`,
      note: 'Tương ứng GIR 3(c); lib/gir.js sẽ trích dẫn nếu đủ căn cứ.',
    });
  }

  const ch = filtered[0]?.hsCode?.slice(0, 2);
  if (ch && MIXTURE_CHAPTERS.has(ch) && /\d+\s*%|hoa hop|hon hop|mixture/i.test(description)) {
    rankingSignals.push({
      signal: 'mixture_chapter_hint',
      effect: `chương ${ch} thường gặp hàng hỗn hợp`,
      note: 'Gợi ý xét GIR 2(b)/3(b); chưa đủ để kết luận.',
    });
  }

  return {
    suggestions: filtered.map(({ _girBoost, ...rest }) => rest),
    rankingSignals,
    // Giữ khoá cũ (rỗng) để mọi caller chưa cập nhật không vỡ.
    girRankingRules: [],
  };
}

module.exports = { applyGirRules, enrichCandidate, matchEssential };
