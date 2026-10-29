const fs = require('fs');
const path = require('path');
const { isHeldOut, evalExcludesHoldout } = require('./holdout');

// Đọc GOLD sạch (5,156 distinct, đã LLM extract + dedup vòng 2) thay vì raw declarations.
// Production: nếu OZ_GOLD_BLOB_URL set → fetch từ URL riêng (data private không lên git).
// Local: đọc file data/oz-gold-final.jsonl.
// OZ_GOLD_PATH: override đường dẫn (cho test cách ly). Mặc định: data/oz-gold-final.jsonl.
const GOLD_PATH = process.env.OZ_GOLD_PATH
  ? path.resolve(process.env.OZ_GOLD_PATH)
  : path.join(__dirname, '..', 'data', 'oz-gold-final.jsonl');
const GOLD_BLOB_URL = process.env.OZ_GOLD_BLOB_URL || null;

let cachedGold = null;
let cachedHsIndex = null;
let cacheKey = null;        // "mtimeMs:size" của GOLD_PATH — đổi khóa = tệp đổi = nạp lại (#239: bỏ đồng hồ TTL 5 phút)
let goldCount = { key: null, records: 0 }; // đếm dòng GOLD, cache theo khóa tệp — cho /api/health rẻ (#239)

// Khóa phiên bản tệp GOLD. RẺ: chỉ stat (không đọc 2,6 MB). 'blob' cho chế độ blob, null nếu không có tệp.
function goldFileKey() {
  if (GOLD_BLOB_URL) return 'blob';
  try { const st = fs.statSync(GOLD_PATH); return `${st.mtimeMs}:${st.size}`; } catch { return null; }
}

// Admin cập nhật GOLD xong → ép nạp lại ở lượt sau (#239 goal 3: nạp lại khi tệp đổi HOẶC admin update).
function invalidateGoldCache() { cachedGold = null; cachedHsIndex = null; cacheKey = null; wordIndex = null; goldCount = { key: null, records: 0 }; }

function parseJsonl(text) {
  return text.split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

async function loadGold() {
  // Blob (production private) ưu tiên, fallback file local (dev).
  // #325: fetch này nằm TRÊN đường classify — bắt buộc có timeout client-side; trước đây socket treo
  // (nhận header rồi ngừng gửi body) làm cả lượt phan_loai_hs treo keepalive vô hạn. Lỗi/treo →
  // dùng lại bản cache cũ nếu còn (tiền lệ cũ vẫn hơn treo), chưa có cache mới ném lỗi cấu trúc sớm.
  if (GOLD_BLOB_URL) {
    const TIMEOUT_MS = Number(process.env.GOLD_BLOB_TIMEOUT_MS) || 15000;
    for (const attempt of [1, 2]) {
      try {
        const res = await fetch(GOLD_BLOB_URL, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!res.ok) throw new Error(`Blob fetch ${res.status}`);
        return parseJsonl(await res.text());
      } catch (e) {
        if (attempt === 2) {
          if (cachedGold) { console.error(`[oz-precedent] blob lỗi (${String(e.message).slice(0, 80)}) — dùng cache cũ ${cachedGold.length} bản ghi`); return cachedGold; }
          throw new Error(`Blob gold không tải được sau 2 lần (${String(e.message).slice(0, 80)})`);
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }
  if (fs.existsSync(GOLD_PATH)) return parseJsonl(fs.readFileSync(GOLD_PATH, 'utf8'));
  return [];
}

function normalize(s) {
  return String(s || '')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function ensureCache() {
  const key = goldFileKey();
  // Tệp không đổi (cùng mtime+size) → dùng cache. Không còn nạp lại theo đồng hồ 5 phút (#239).
  if (cachedGold && key === cacheKey) return;
  cachedGold = await loadGold();
  wordIndex = null; // bảng chữ trỏ vào bản ghi cũ — dựng lại theo kho mới
  // Đang chấm điểm cả tiến trình (HS_EVAL_EXCLUDE_HOLDOUT=1): bỏ tập giữ riêng khỏi kho tiền
  // lệ — nếu không, mẫu đem chấm tự tìm thấy đáp án của chính nó. Cờ theo LƯỢT (header bench) lọc lúc trả (visible()).
  if (process.env.HS_EVAL_EXCLUDE_HOLDOUT === '1') cachedGold = cachedGold.filter((g) => !isHeldOut(g));
  // Index theo HS code (chuẩn hoá bỏ dấu chấm)
  cachedHsIndex = new Map();
  for (const g of cachedGold) {
    const hs = String(g.hsCode).replace(/\./g, '').trim();
    if (!cachedHsIndex.has(hs)) cachedHsIndex.set(hs, []);
    cachedHsIndex.get(hs).push(g);
  }
  cacheKey = key;
}

/**
 * Tra GOLD theo HS code chính xác (FREE, no LLM).
 * → "Oz đã khai mã này N lần" + biến thể.
 */
async function searchOzByHs(hsCode, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit) || 20, 100));
  await ensureCache();
  const hs = String(hsCode).replace(/\./g, '').trim();
  const list = (cachedHsIndex.get(hs) || []).filter(visible).sort((a, b) => (b.ozCount || 0) - (a.ozCount || 0));
  const totalTimes = list.reduce((s, g) => s + (g.ozCount || 1), 0);
  return {
    hsCode: hs,
    distinctProducts: list.length,
    totalDeclarations: totalTimes,
    items: list.slice(0, limit).map(toPublicItem),
  };
}

// ── So chữ theo TỪ, GIỮ DẤU, có trọng số độ hiếm (19/10/2026) ──────────────────────────────────────────────
// Cách cũ bỏ dấu rồi so CHUỖI CON: "gầm"→"gam" ⊂ "ngâm", "tấm"→"tam" ⊂ "tẩm", "cắm"→"cam" ⊂ "cảm" — tiền lệ
// "Vải dệt kim ngâm tẩm phủ PVC" khớp 60% với "tấm chắn gầm xe ô tô" và bật cờ "tiền lệ xếp nhóm 5903" cho tấm
// thép bảo vệ gầm. Đo trên tập giữ riêng (scripts/bench-oz-precedent.mjs): cờ "tiền lệ dẫn đầu" trỏ NHẦM 105/300.
// Cách mới: (1) so nguyên âm tiết, giữ dấu (dấu tiếng Việt mang nghĩa); truy vấn KHÔNG dấu thì so với bản bỏ dấu
// của từng âm tiết, vẫn nguyên từ. (2) Trọng số IDF: chữ chung chung ("tấm", "bảo", "vệ", "xe") nhẹ, chữ quyết định
// ("gầm", "răng") nặng — độ khớp = tổng trọng số chữ khớp / tổng trọng số chữ hỏi. Chữ không có trong kho (tên
// hãng, model) bị bỏ khỏi mẫu số: không tiền lệ nào khớp được nó, giữ lại chỉ làm mọi độ khớp tụt đều.
// HS_OZ_MATCH=legacy → cách cũ (để so A/B, gỡ sau khi ổn định).
const WORD_RE = /[\p{L}\p{N}]+/gu;
const stripMarks = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
function words(s) {
  return (String(s || '').normalize('NFC').toLowerCase().match(WORD_RE) || []).filter((w) => w.length >= 2 || /\d/.test(w));
}
let wordIndex = null; // { key, docs: Map<g, {exact:Set, plain:Set}>, df: Map<string, number>, n }
function ensureWordIndex() {
  if (wordIndex && wordIndex.key === cacheKey) return wordIndex;
  const docs = new Map();
  const df = new Map();
  for (const g of cachedGold) {
    const exact = new Set(words(`${g.tenHang} ${g.chatLieu || ''} ${g.congDung || ''}`));
    const plain = new Set([...exact].map(stripMarks));
    docs.set(g, { exact, plain });
    for (const w of exact) df.set(w, (df.get(w) || 0) + 1);
    for (const w of plain) df.set(`~${w}`, (df.get(`~${w}`) || 0) + 1);
  }
  wordIndex = { key: cacheKey, docs, df, n: cachedGold.length };
  return wordIndex;
}
/** Chữ hỏi → { key tra df, có dấu?, trọng số IDF } ; chữ không có trong kho bị loại. */
function weightedQuery(query) {
  const idx = ensureWordIndex();
  const out = [];
  for (const w of new Set(words(query))) {
    const accented = stripMarks(w) !== w;
    const df = accented ? idx.df.get(w) : idx.df.get(`~${w}`);
    if (!df) continue;
    out.push({ w, plain: stripMarks(w), accented, weight: Math.log(1 + idx.n / df) });
  }
  return out;
}

function legacyScore(qTokens, g) {
  const hay = normalize(`${g.tenHang} ${g.chatLieu || ''} ${g.congDung || ''}`);
  let hits = 0;
  for (const t of qTokens) if (hay.includes(t)) hits++;
  return hits ? hits / qTokens.length : 0;
}

/**
 * Tìm GOLD theo keyword (FREE, no LLM, no Gemini).
 * Rank: độ khớp có trọng số (nguyên từ, giữ dấu, IDF) trên tenHang+chatLieu+congDung + boost nhẹ ozCount.
 * `matchCoverage` (0–100) = % trọng số chữ hỏi có mặt trong tiền lệ.
 */
async function searchOzByKeyword(query, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit) || 10, 50));
  await ensureCache();
  const legacy = process.env.HS_OZ_MATCH === 'legacy';
  const qTokens = legacy ? normalize(query).split(' ').filter((w) => w.length >= 2) : null;
  const qWords = legacy ? null : weightedQuery(query);
  if (legacy ? !qTokens.length : !qWords.length) return { query, total: 0, items: [] };
  const qWeight = legacy ? 0 : qWords.reduce((a, q) => a + q.weight, 0);
  const idx = legacy ? null : ensureWordIndex();

  const scored = [];
  for (const g of cachedGold) {
    if (!visible(g)) continue;
    let coverage;
    if (legacy) coverage = legacyScore(qTokens, g);
    else {
      const d = idx.docs.get(g);
      let hit = 0;
      for (const q of qWords) if (q.accented ? d.exact.has(q.w) : d.plain.has(q.plain)) hit += q.weight;
      coverage = hit / qWeight;
    }
    if (!coverage) continue;
    // score = độ khớp + boost nhẹ theo ozCount (log)
    const freqBoost = Math.log10((g.ozCount || 1) + 1) * 0.1;
    scored.push({ g, score: coverage + freqBoost, coverage });
  }
  scored.sort((a, b) => b.score - a.score);
  return {
    query,
    total: scored.length,
    items: scored.slice(0, limit).map((s) => ({ ...toPublicItem(s.g), matchCoverage: Math.round(s.coverage * 100) })),
  };
}

/**
 * NỘI BỘ — bản ghi GOLD THÔ (có `sampleDesc` = câu Oz đã khai, chứa thông tin khách) theo tiền tố mã (6 hoặc 8 số).
 * Chỉ dùng làm mẫu tên/văn phong đưa vào LLM ở lượt riêng tư (lib/describe-references.js). TUYỆT ĐỐI không trả
 * bản ghi này ra phản hồi API — phản hồi chỉ được mang số lượng.
 */
async function ozRawByHsPrefix(prefix) {
  await ensureCache();
  const p = String(prefix || '').replace(/\D/g, '');
  if (p.length < 6) return [];
  if (p.length >= 8) return (cachedHsIndex.get(p.slice(0, 8)) || []).filter(visible);
  const out = [];
  for (const [hs, list] of cachedHsIndex) if (hs.startsWith(p)) out.push(...list.filter(visible));
  return out;
}

/** Bản ghi gold có được dùng trong lượt này không (lượt bench bỏ tập giữ riêng). */
function visible(g) { return !(evalExcludesHoldout() && isHeldOut(g)); }

function toPublicItem(g) {
  return {
    hsCode: g.hsCode,
    tenHang: g.tenHang,
    chatLieu: g.chatLieu || null,
    congDung: g.congDung || null,
    condition: g.condition || 'Mới 100%',
    origin: g.origin || 'CN',
    brands: g.brands || [],
    models: (g.models || []).slice(0, 10),
    sizes: (g.sizes || []).slice(0, 10),
    ozCount: g.ozCount || 1,
  };
}

// Sync stats cho /api/health — chứng minh gold data có trong lambda bundle (không cần auth).
function ozGoldStats() {
  if (GOLD_BLOB_URL) return { ok: true, source: 'blob', records: null };
  try {
    const key = goldFileKey();
    // Cache đã ấm cho đúng phiên bản tệp → đếm từ RAM, KHÔNG đọc đĩa (#239 goal 2).
    if (cachedGold && cacheKey === key) return { ok: cachedGold.length > 0, source: 'file', records: cachedGold.length };
    if (key === null) return { ok: false, source: 'file', records: 0 };
    // Đọc + đếm MỘT lần cho mỗi phiên bản tệp; health gọi lại (mỗi 30 s) chỉ stat, không đọc lại 2,6 MB.
    if (goldCount.key !== key) {
      const text = fs.readFileSync(GOLD_PATH, 'utf8').trim();
      goldCount = { key, records: text ? text.split('\n').length : 0 };
    }
    return { ok: goldCount.records > 0, source: 'file', records: goldCount.records };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { searchOzByHs, searchOzByKeyword, ozGoldStats, invalidateGoldCache, ozRawByHsPrefix };
