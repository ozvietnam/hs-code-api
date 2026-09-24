const { precedentsData, normalizeHs } = require('./data');

let flatIndex = null;

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function tokenize(text) {
  return normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2);
}

function loadFlatPrecedents() {
  if (flatIndex) return flatIndex;
  flatIndex = [];
  for (const [finalHsCode, list] of Object.entries(precedentsData)) {
    const items = Array.isArray(list) ? list : [];
    for (const p of items) {
      flatIndex.push({
        precedentId: `tb-${String(p.tbTchqNumber || 'unknown').replace(/\//g, '-')}`,
        source: 'TB-TCHQ',
        tbTchqNumber: p.tbTchqNumber,
        productNameRaw: p.productName,
        technicalSpec: p.technicalSpec,
        finalHsCode: normalizeHs(finalHsCode),
        outcome: p.outcome && /^\d{8}$/.test(String(p.outcome)) ? 'APPROVED' : String(p.outcome || 'APPROVED'),
        year: p.year,
        sourceFile: p.sourceFile,
        // token sets tính sẵn — tên hàng và mô tả/lý do tách riêng vì tên hàng nặng hơn
        _headTokens: new Set(tokenize(headOf(p.productName))),
        _nameTokens: new Set(tokenize(p.productName)),
        _specTokens: new Set(tokenize([p.technicalSpec, p.tbTchqNumber].filter(Boolean).join(' '))),
      });
    }
  }
  buildIdf(flatIndex);
  return flatIndex;
}

// IDF trên toàn kho tiền lệ: từ xuất hiện ở khắp nơi ("thuoc", "nhom", "ma",
// "danh", "muc"…) gần như không có trọng số; từ hiếm ("pentax", "lm8uu") nặng.
let idfMap = null;
let idfDefault = 1;
function buildIdf(index) {
  const df = new Map();
  for (const p of index) {
    const seen = new Set([...p._nameTokens, ...p._specTokens]);
    for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
  }
  const n = index.length || 1;
  idfMap = new Map();
  for (const [t, d] of df) idfMap.set(t, Math.log((n + 1) / (d + 1)) + 1);
  idfDefault = Math.log(n + 1) + 1;
}
function idf(token) {
  return idfMap && idfMap.has(token) ? idfMap.get(token) : idfDefault;
}
// Trọng số của từ TRONG CÂU HỎI: từ chưa từng xuất hiện trong kho tiền lệ
// (nhãn hiệu "airtac", mã model "sc50x100") không thể khớp bất kỳ tiền lệ nào.
// Trước đây nó nhận IDF tối đa và kéo "xi lanh khí nén Airtac" từ 0,68 xuống 0,45
// — tờ khai thật luôn kèm nhãn hiệu + model. Cho về 0 hẳn thì "máy bơm Pentax"
// lại khớp 0,72 với "dầu bôi trơn máy bơm keo", nên dùng trung bình có trần.
function queryWeight(token) {
  return idfMap && idfMap.has(token) ? idfMap.get(token) : 0;
}
function oovQueryWeight(tokens) {
  const known = tokens.map(queryWeight).filter(Boolean);
  if (!known.length) return 0;
  const sum = known.reduce((x, y) => x + y, 0);
  const nOov = tokens.length - known.length;
  // Mỗi từ lạ nặng bằng trung bình các từ đã biết, và tổng từ lạ không quá
  // một nửa khối lượng từ đã biết — nhãn hiệu/model không thể nhấn chìm tên hàng.
  return nOov ? Math.min(sum / known.length, (0.5 * sum) / nOov) : 0;
}

// Phần "tên lõi" của mô tả: đoạn trước dấu ':' / ' — ' / '(' / ',' đầu tiên,
// tối đa 10 từ. "Đầu phun áp lực chất lỏng (đầu bơm piston…) : cụm gồm…" → "Đầu phun áp lực chất lỏng".
function headOf(name) {
  const raw = String(name || '');
  const cut = raw.split(/\s[—–-]\s|[:(,;]/)[0] || raw;
  return cut.split(/\s+/).slice(0, 10).join(' ');
}

/**
 * Điểm (0..0,99) = độ phủ câu hỏi × độ khớp tên lõi.
 *  - covQ: phần trọng số IDF của các từ trong CÂU HỎI được tiền lệ phủ
 *    (khớp tên lõi 1,0 · khớp phần còn lại của tên 0,8 · khớp mô tả/lý do 0,5);
 *    từ ngoài kho (nhãn hiệu, mã model) chỉ nặng bằng trung bình có trần
 *  - covH: phần trọng số IDF của TÊN LÕI tiền lệ được câu hỏi phủ — phạt tiền lệ
 *    có tên dài chứa câu hỏi ở phần phụ ("… có 03 xi lanh hành trình…")
 *  similarity = covQ × (0,4 + 0,6·√covH); không trúng từ nào trong tên → ≤ 0,45.
 * Trước đây đếm số từ của tiền lệ trùng câu hỏi chia cho độ dài câu hỏi — lý do
 * dài lặp "thủy lực" 5 lần là chạm trần 0,99 dù tên hàng chẳng liên quan.
 */
function scorePrecedent(description, precedent) {
  const descTokens = Array.isArray(description) ? description : [...new Set(tokenize(description))];
  if (!descTokens.length) return 0;
  const headTokens = precedent._headTokens || new Set(tokenize(headOf(precedent.productNameRaw)));
  const nameTokens = precedent._nameTokens || new Set(tokenize(precedent.productNameRaw));
  const specTokens = precedent._specTokens || new Set(tokenize(precedent.technicalSpec));
  let num = 0;
  let den = 0;
  let nameHits = 0;
  const q = new Set(descTokens);
  const oovWeight = oovQueryWeight(descTokens);
  for (const t of descTokens) {
    const w = queryWeight(t) || oovWeight;
    if (!w) continue;
    den += w;
    if (headTokens.has(t)) {
      num += w;
      nameHits += 1;
    } else if (nameTokens.has(t)) {
      num += 0.8 * w;
      nameHits += 1;
    } else if (specTokens.has(t)) {
      num += 0.5 * w;
    }
  }
  if (!den) return 0;
  const covQ = num / den;
  let hNum = 0;
  let hDen = 0;
  for (const t of headTokens) {
    const w = idf(t);
    hDen += w;
    if (q.has(t)) hNum += w;
  }
  const covH = hDen ? hNum / hDen : 0;
  let similarity = covQ * (0.4 + 0.6 * Math.sqrt(covH));
  if (!nameHits) similarity = Math.min(similarity, 0.45);
  return Math.min(0.99, similarity);
}

function detectSet(description) {
  return /\b(bo|set|combo|kit|dong bo|goi)\b/i.test(normalizeText(description));
}

// Câu chữ khuôn mẫu của tờ khai ("hàng mới 100%", "hiệu X", "model Y", "xuất xứ Z")
// không nói gì về bản chất hàng — bỏ trước khi chấm, kẻo kéo độ phủ câu hỏi xuống.
// "hiệu"/"hãng" chỉ bỏ khi đứng trước tên viết hoa/mã (giữ "tín hiệu", "hiệu suất").
const BOILERPLATE_RES = [
  /\b(?:hàng\s+mới\s+100\s*%|mới\s+100\s*%|hàng\s+mới|hàng\s+cũ|đã\s+qua\s+sử\s+dụng)(?![\p{L}\d])/giu,
  /\b(?:nhãn\s+hiệu|thương\s+hiệu|hiệu|hãng\s+sx|hãng|brand)\s*[:：]?\s+(?=[A-Z0-9])/gu,
  /\b(?:model|mã\s+hàng|mã\s+sp|p\/n|part\s+no\.?|xuất\s+xứ|nhà\s+sản\s+xuất|nsx|sx)\s*[:：]?\s*/giu,
];
function stripDeclarationBoilerplate(text) {
  let out = String(text || '');
  for (const re of BOILERPLATE_RES) out = out.replace(re, ' ');
  return out.replace(/\s+/g, ' ').trim();
}

function searchPrecedents(description, { topK = 5 } = {}) {
  const desc = stripDeclarationBoilerplate(description);
  if (desc.length < 3) return [];

  const index = loadFlatPrecedents();
  const descTokens = [...new Set(tokenize(desc))];
  const scored = index
    .map((precedent) => ({
      precedent,
      similarity: scorePrecedent(descTokens, precedent),
      finalHsCode: precedent.finalHsCode,
      outcome: precedent.outcome,
    }))
    .filter((x) => x.similarity >= 0.15)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scored;
}

// Ngưỡng: ≥ 0,5 mới đủ cộng điểm cho ứng viên đã có mã đó. KHÔNG tự đưa mã
// tiền lệ vào danh sách: đo trên 218 tên mục từ điển mâu thuẫn, ở ngưỡng 0,7 lẫn
// 0,9 cứ 2 lần đưa vào thì ~1 lần sai nhóm ("máy in nhiệt" → máy in lưới,
// "cáp nguồn" → bộ cấp nguồn LED) — khớp từ vựng không đủ tin để thêm mã.
// precedentMatches vẫn trả về để ERP/LLM tự cân nhắc.
const BOOST_MIN = 0.5;

function applyPrecedentBoost(suggestions, description) {
  const matches = searchPrecedents(description, { topK: 3 });
  const approved = matches.find((m) => m.outcome === 'APPROVED' && m.similarity >= BOOST_MIN);
  if (!approved) {
    return { suggestions, precedentMatches: matches, precedentDrove: false };
  }

  const reasoning = `Tương tự ${approved.precedent.tbTchqNumber} (${Math.round(approved.similarity * 100)}%)`;
  let touched = false;
  const boosted = suggestions.map((s) => {
    if (normalizeHs(s.hsCode) !== approved.finalHsCode) return s;
    touched = true;
    return {
      ...s,
      confidence: (Number(s.confidence) || 0) + Math.round(approved.similarity * 12),
      precedentReasoning: reasoning,
    };
  });
  if (!touched) {
    // Có tiền lệ nhưng không ứng viên nào mang mã đó: KHÔNG được gắn GIR-4 —
    // tiền lệ không quyết định gì cả (trước đây vẫn gắn, audit trail sai).
    return { suggestions, precedentMatches: matches, precedentDrove: false };
  }
  boosted.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  return {
    suggestions: boosted,
    precedentMatches: matches,
    // Chỉ là cờ "tiền lệ đã đẩy thứ hạng" — việc có trích GIR 4 hay không do lib/gir.js quyết.
    precedentDrove: true,
  };
}

module.exports = {
  searchPrecedents,
  stripDeclarationBoilerplate,
  detectSet,
  applyPrecedentBoost,
  loadFlatPrecedents,
};
