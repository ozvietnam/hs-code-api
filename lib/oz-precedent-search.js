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
function invalidateGoldCache() { cachedGold = null; cachedHsIndex = null; cacheKey = null; goldCount = { key: null, records: 0 }; }

function parseJsonl(text) {
  return text.split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

async function loadGold() {
  // Blob (production private) ưu tiên, fallback file local (dev)
  if (GOLD_BLOB_URL) {
    const res = await fetch(GOLD_BLOB_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Blob fetch ${res.status}`);
    return parseJsonl(await res.text());
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

/**
 * Tìm GOLD theo keyword (FREE, no LLM, no Gemini).
 * Rank: token overlap trên tenHang+chatLieu+congDung + boost ozCount.
 */
async function searchOzByKeyword(query, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit) || 10, 50));
  await ensureCache();
  const qTokens = normalize(query).split(' ').filter((w) => w.length >= 2);
  if (!qTokens.length) return { query, total: 0, items: [] };

  const scored = [];
  for (const g of cachedGold) {
    if (!visible(g)) continue;
    const hay = normalize(`${g.tenHang} ${g.chatLieu || ''} ${g.congDung || ''}`);
    let hits = 0;
    for (const t of qTokens) if (hay.includes(t)) hits++;
    if (hits === 0) continue;
    // score = tỉ lệ token khớp + boost nhẹ theo ozCount (log)
    const coverage = hits / qTokens.length;
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

module.exports = { searchOzByHs, searchOzByKeyword, ozGoldStats, invalidateGoldCache };
