// Pha 1 — Sinh tập mã ứng viên (M1 Bước 0+0b của skill hs-code-vn).
// Hướng đã validate: LLM đề xuất nhóm 4-số (recall@5≈90%) + precedent Oz + (tùy chọn) keyword.
// KHÔNG dùng dense embeddings (embo-01 quá chậm/vỡ batch; LLM-candidate đã vượt).
//
// getCandidates(attrs) → { headings:[{code4, sources, rank}], precedentCodes:[{hs, ozCount}] }
// Phase 2 (GIR confirm) sẽ thu hẹp headings → mã 8 số bằng chú giải/loại_trừ.

const { searchOzByKeyword } = require('./oz-precedent-search.js');
const { callLLMJson } = require('./llm-tier.js');
const { detectMaterials } = require('./material-taxonomy.js');

const nz = (s) => String(s || '').replace(/\D/g, '');

const SYS_CANDIDATES = `Bạn là chuyên gia áp mã HS hải quan Việt Nam.
Cho mô tả sản phẩm, hãy suy luận theo BẢN CHẤT (chức năng → cấu tạo → trạng thái) và liệt kê tối đa 8 mã HS 4 số (nhóm) khả dĩ nhất, xếp theo độ phù hợp giảm dần.
Bao gồm cả 1-2 nhóm "bất ngờ" mà trực giác ban đầu muốn loại (chống neo đậu).
CHỈ trả JSON gọn, không giải thích: {"headings":["8414","8501",...]}`;

// Gọi LLM rẻ (MiniMax) đề xuất nhóm 4-số. Dynamic import ESM router từ CommonJS.
async function llmProposeHeadings(attrs, opts = {}) {
  const q = [
    attrs.tenHang,
    attrs.chatLieu && `chất liệu ${attrs.chatLieu}`,
    attrs.congDung && `công dụng ${attrs.congDung}`,
    attrs.chucNang && `chức năng ${attrs.chucNang}`,
    attrs.nameZh && `tên TQ ${attrs.nameZh}`,
    attrs.specs,
  ].filter(Boolean).join(', ');
  // Output chỉ là list nhóm 4-số → maxTokens nhỏ (đỡ sinh thừa) + timeout chặt 18s
  // để cả pipeline classify nằm gọn trong giới hạn serverless 60s.
  const { json: obj } = await callLLMJson(SYS_CANDIDATES, `Sản phẩm: ${q}`, { tier: opts.tier, maxTokens: 1200, timeoutMs: opts.timeoutMs || 15000 });
  return (obj.headings || [])
    .map((x) => nz(x).slice(0, 4))
    .filter((h) => h.length === 4);
}

// B2: Taxonomy — khi attrs.chatLieu khớp vật liệu đã biết → thêm hsHints (4-số) vào ứng viên.
function taxonomyCandidates(attrs) {
  const text = [attrs.chatLieu, attrs.congDung, attrs.tenHang].filter(Boolean).join(' ');
  if (!text) return [];
  const hits = detectMaterials(text);
  const headings = [];
  const seen = new Set();
  for (const m of hits) {
    for (const hint of (m.hsHints || [])) {
      const h4 = String(hint).replace(/\D/g, '').slice(0, 4);
      if (h4.length === 4 && !seen.has(h4)) { seen.add(h4); headings.push(h4); }
    }
  }
  return headings;
}

// Precedent Oz: trả mã 8 số Oz từng khai cho sản phẩm tương tự + nhóm 4 số của chúng.
async function precedentCandidates(attrs, opts = {}) {
  const q = [attrs.tenHang, attrs.chatLieu, attrs.congDung].filter(Boolean).join(' ');
  if (!q) return { codes: [], headings: [], items: [] };
  const res = await searchOzByKeyword(q, { limit: opts.limit || 8 });
  const items = res.items || [];
  const codes = items.map((it) => ({ hs: nz(it.hsCode), ozCount: it.ozCount, coverage: it.matchCoverage }));
  const headings = [...new Set(codes.map((c) => c.hs.slice(0, 4)))];
  return { codes, headings, items };
}

/**
 * Tập ứng viên hợp nhất. Headings xếp hạng: ưu tiên mã LLM đề xuất (đầu danh sách) +
 * cộng tín hiệu nếu precedent cũng trỏ tới (Oz từng khai nhóm đó).
 */
async function getCandidates(attrs, opts = {}) {
  const [llmHeadings, prec] = await Promise.all([
    llmProposeHeadings(attrs, opts).catch(() => []),
    precedentCandidates(attrs, opts).catch(() => ({ codes: [], headings: [], items: [] })),
  ]);
  const taxHeadings = taxonomyCandidates(attrs); // synchronous — no API call

  const score = new Map(); // code4 -> { sources:Set, rank }
  llmHeadings.forEach((h, i) => {
    const e = score.get(h) || { code4: h, sources: new Set(), llmRank: 99 };
    e.sources.add('llm'); e.llmRank = Math.min(e.llmRank, i);
    score.set(h, e);
  });
  prec.headings.forEach((h) => {
    const e = score.get(h) || { code4: h, sources: new Set(), llmRank: 99 };
    e.sources.add('precedent');
    score.set(h, e);
  });
  taxHeadings.forEach((h) => {
    const e = score.get(h) || { code4: h, sources: new Set(), llmRank: 99 };
    e.sources.add('taxonomy');
    score.set(h, e);
  });

  const headings = [...score.values()]
    .map((e) => ({ code4: e.code4, sources: [...e.sources], llmRank: e.llmRank }))
    // precedent+llm trùng lên đầu, rồi theo thứ tự LLM
    .sort((a, b) => (b.sources.length - a.sources.length) || (a.llmRank - b.llmRank));

  return { headings, precedentCodes: prec.codes };
}

module.exports = { getCandidates, llmProposeHeadings, precedentCandidates };
