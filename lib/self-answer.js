// Vòng TỰ TRẢ LỜI câu hỏi bổ sung (báo cáo lỗi HS 28/10/2026, bể tự hoại Tmall 1092190764483):
// engine hỏi 4 câu ("có sợi thủy tinh không", "vật liệu từng lớp", "hàng hoàn chỉnh hay chỉ vỏ"…) mà ảnh chi tiết đều
// trả lời được. Trước khi hỏi khách: tìm từ khoá tiếng Trung của từng câu trong nguồn có nhãn addon gửi
// ([TITLE]/[ATTR]/[SKU]/[IMG-n]/[REVIEW]), đưa đoạn trúng cho AI trả lời, BẮT BUỘC ghi nguồn + câu trích nguyên văn.
// Câu trích không có trong nguồn → bỏ câu trả lời (không bịa). Câu không có nguồn nào → để lại hỏi khách.
//
// selfAnswer({ questions, evidence }) → { answers:[{question, answer, sources, confidence, quote}], unanswered:[], provider }

const llmTier = require('./llm-tier.js'); // gọi qua module để test thay được callLLMJson
const { normalizeEvidence } = require('./source-rules.js');

const MAX_QUESTIONS = 8;
const MAX_SNIPPET_LINES = 12;
const MAX_SNIPPET_CHARS = 9000;
const LINE_CLIP = 400;
const TAG_RE = /^\[(TITLE|ATTR|SKU|DESC|REVIEW|IMG-\d+)\]\s*/;

/** Chủ đề câu hỏi (tiếng Việt) → từ khoá tìm trong nguồn (Trung / mã Latin). */
const TOPICS = [
  { re: /sợi thủy tinh|sợi thuỷ tinh|composite|frp|玻璃钢/i, kw: ['玻璃钢', '玻璃纤维', '纤维', 'FRP', '材质'] },
  { re: /chất liệu|vật liệu|làm bằng|nhựa|thép|inox|kim loại|材质/i, kw: ['材质', '材料', '原料', 'HDPE', 'LDPE', 'PE', 'PP', 'PVC', 'ABS', '塑料', '不锈钢', '钢'] },
  { re: /lớp|gia cố|gân|kết cấu|cấu tạo|độ dày/i, kw: ['层', '内层', '外层', '双层', '加强筋', '加厚', '结构', '波纹', '厚度', '壁厚'] },
  { re: /hoàn chỉnh|chỉ (?:là )?vỏ|phụ kiện|đi kèm|kèm theo|gồm những|bộ phận|tặng/i, kw: ['配件', '包含', '清单', '赠', '送', '盖', '弯头', '隔板', '接口', '进水', '出水', '管'] },
  { re: /dung tích|thể tích|bao nhiêu lít|lít|m3|m³|khối/i, kw: ['容量', '容积', '立方', '方', '升', '吨', 'L'] },
  { re: /kích thước|đường kính|chiều (?:dài|rộng|cao)|quy cách/i, kw: ['尺寸', '规格', '直径', '管径', '长', '宽', '高', 'mm', 'cm'] },
  { re: /công dụng|dùng để|dùng cho|mục đích|ứng dụng/i, kw: ['用于', '适用', '用途', '适合', '应用'] },
  { re: /nhãn hiệu|thương hiệu|hãng/i, kw: ['品牌', '®', '™', '商标'] },
  { re: /sản xuất|đúc|thổi|ép phun|công nghệ|gia công/i, kw: ['工艺', '吹塑', '注塑', '滚塑', '成型', '模压'] },
  { re: /điện|công suất|điện áp|pin/i, kw: ['功率', '电压', '电池', 'W', 'V'] },
];

const SYS = `Bạn trả lời các CÂU HỎI BỔ SUNG về một món hàng, CHỈ dựa vào NGUỒN CÓ NHÃN bên dưới (chữ trang bán + chữ đọc từ ảnh).
QUY TẮC:
- Thứ tự tin cậy: [IMG-n] bảng thông số (产品参数) > [IMG-n] ảnh chú thích chi tiết > [ATTR] > [SKU] > [REVIEW] > [TITLE].
- Từ khoá chất liệu trong [TITLE] (玻璃钢, 不锈钢, 纯铜, 实木…) KHÔNG đủ làm căn cứ nếu nguồn khác không xác nhận; nguồn khác ghi khác thì theo nguồn khác.
- Mỗi câu trả lời: 'answer' tiếng Việt ngắn gọn, 'sources' = nhãn nguồn đã dùng (vd "IMG-23", "ATTR", "SKU", "REVIEW"),
  'quote' = đoạn CHÉP NGUYÊN VĂN (giữ chữ Hán) từ đúng nguồn đó, 'confidence' = high|medium|low.
- Nguồn KHÔNG có thông tin → đưa câu hỏi vào 'unanswered', KHÔNG đoán.
Trả DUY NHẤT JSON: {"answers":[{"i":0,"answer":"","sources":[""],"quote":"","confidence":"high|medium|low"}],"unanswered":[0]}
('i' = số thứ tự câu hỏi, bắt đầu từ 0).`;

function clip(s, n) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** Bỏ dấu tiếng Việt + gộp khoảng trắng để so chuỗi trích. */
function squash(s) {
  return String(s ?? '').normalize('NFKC').toLowerCase().replace(/[\s"'“”‘’]+/g, '');
}

function validateSelfAnswerInput(body = {}) {
  const qs = (Array.isArray(body?.questions) ? body.questions : [])
    .map((q) => (typeof q === 'string' ? q : q?.question))
    .map((q) => clip(q, 300))
    .filter((q) => q.length >= 3)
    .slice(0, MAX_QUESTIONS);
  if (!qs.length) return { ok: false, error: 'questions (mảng câu hỏi) bắt buộc' };
  const evidence = normalizeEvidence(body?.evidence);
  if (!evidence) return { ok: false, error: 'evidence (nguồn có nhãn) bắt buộc' };
  return { ok: true, data: { questions: qs, evidence } };
}

/** Từ khoá tìm cho 1 câu hỏi: theo chủ đề + chữ Hán / mã Latin viết sẵn trong câu. */
function keywordsFor(question) {
  const kw = new Set();
  for (const t of TOPICS) if (t.re.test(question)) for (const k of t.kw) kw.add(k);
  for (const m of String(question).match(/[一-鿿]{2,8}|\b[A-Z]{2,5}\b/g) || []) kw.add(m);
  return [...kw];
}

/** Dòng nguồn chứa từ khoá (mã Latin khớp nguyên từ để "PE" không dính "SPEED"). */
function lineHits(line, kws) {
  return kws.filter((k) => (/^[A-Za-z]+$/.test(k) ? new RegExp(`(?<![A-Za-z])${k}(?![A-Za-z])`).test(line) : line.includes(k))).length;
}

/** Đoạn trích trúng cho cả bộ câu hỏi: dòng trúng nhiều từ khoá trước, giữ thứ tự nguồn, ≤ MAX_SNIPPET_CHARS. */
function snippetsFor(questions, evidence) {
  const lines = evidence.split('\n');
  const picked = new Map();
  const perQuestion = questions.map((q) => {
    const kws = keywordsFor(q);
    const hits = lines
      .map((l, idx) => ({ idx, n: lineHits(l, kws) }))
      .filter((h) => h.n > 0)
      .sort((a, b) => b.n - a.n || a.idx - b.idx)
      .slice(0, MAX_SNIPPET_LINES);
    for (const h of hits) picked.set(h.idx, lines[h.idx]);
    return { question: q, keywords: kws, hitLines: hits.length };
  });
  // Luôn kèm tiêu đề + vài dòng thuộc tính đầu để AI biết món hàng.
  lines.forEach((l, idx) => { if (/^\[(TITLE|ATTR)\]/.test(l) && picked.size < 400 && idx < 25) picked.set(idx, l); });
  let text = '';
  for (const idx of [...picked.keys()].sort((a, b) => a - b)) {
    const l = clip(picked.get(idx), LINE_CLIP);
    if (text.length + l.length + 1 > MAX_SNIPPET_CHARS) break;
    text += (text ? '\n' : '') + l;
  }
  return { text, perQuestion };
}

const CONF = new Set(['high', 'medium', 'low']);

/** Câu trả lời AI → chỉ giữ câu có câu trích nằm trong ĐÚNG nguồn đã nêu (hoặc trong cả nguồn nếu nhãn lệch → hạ tin cậy). */
function validateAnswers(json, questions, evidence) {
  const lines = evidence.split('\n');
  const tagOf = (l) => l.match(TAG_RE)?.[1] || null;
  const bodyByTag = new Map();
  for (const l of lines) {
    const tag = tagOf(l);
    if (!tag) continue;
    bodyByTag.set(tag, `${bodyByTag.get(tag) || ''}\n${l.replace(TAG_RE, '')}`);
  }
  const all = squash(evidence);
  const answers = [];
  const answered = new Set();
  for (const a of Array.isArray(json?.answers) ? json.answers : []) {
    const i = Number(a?.i);
    if (!Number.isInteger(i) || i < 0 || i >= questions.length || answered.has(i)) continue;
    const answer = clip(a?.answer, 300);
    const quote = clip(a?.quote, 300);
    if (!answer || squash(quote).length < 2) continue;
    const sources = [...new Set((Array.isArray(a?.sources) ? a.sources : []).map((s) => String(s).replace(/[[\]\s]/g, '').toUpperCase()).filter((s) => /^(TITLE|ATTR|SKU|DESC|REVIEW|IMG-\d+)$/.test(s)))].slice(0, 4);
    const inNamed = sources.some((s) => squash(bodyByTag.get(s) || '').includes(squash(quote)));
    const inAny = all.includes(squash(quote));
    if (!inNamed && !inAny) continue; // câu trích bịa → không nhận
    let confidence = CONF.has(String(a?.confidence).toLowerCase()) ? String(a.confidence).toLowerCase() : 'medium';
    // Nhãn nguồn sai / chỉ dựa [TITLE] → không cho "cao".
    if (!inNamed || (sources.length === 1 && sources[0] === 'TITLE')) confidence = confidence === 'high' ? 'medium' : confidence;
    answers.push({ question: questions[i], answer, sources: sources.length ? sources : ['?'], quote, confidence });
    answered.add(i);
  }
  return { answers, unanswered: questions.filter((_, i) => !answered.has(i)) };
}

async function selfAnswer({ questions, evidence }, opts = {}) {
  const { text, perQuestion } = snippetsFor(questions, evidence);
  const user = [
    'CÂU HỎI:',
    ...questions.map((q, i) => `${i}. ${q}`),
    '',
    'NGUỒN CÓ NHÃN (đoạn trúng từ khoá):',
    text,
  ].join('\n');
  const { json, provider } = await llmTier.callLLMJson(SYS, user, {
    step: 'self_answer',
    maxTokens: Number(process.env.SELF_ANSWER_MAX_TOKENS) || 6000,
    timeoutMs: opts.timeoutMs || Number(process.env.SELF_ANSWER_TIMEOUT_MS) || 90000,
    temperature: 0,
  });
  const out = validateAnswers(json, questions, evidence);
  return { ...out, provider: provider || null, search: perQuestion };
}

module.exports = { selfAnswer, validateSelfAnswerInput, keywordsFor, snippetsFor, validateAnswers, SYS };
