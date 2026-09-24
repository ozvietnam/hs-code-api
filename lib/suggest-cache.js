const crypto = require('crypto');

// In-memory LRU cache for /api/suggest results.
// Keyed by hash(description + topReranked + facts + mode). TTL: 24h.
//
// `facts` PHẢI nằm trong khoá: người dùng trả lời missingFacts rồi gọi lại với
// cùng mô tả — nếu khoá bỏ qua facts thì nhận lại đúng câu hỏi cũ, vòng hỏi
// không bao giờ kết thúc. `mode` tách batch (shape rút gọn, không có
// decisions/missingFacts) khỏi single để single không nhận nhầm bản rút gọn.
// Max 500 entries — prevents unbounded memory on long-lived processes.

const MAX = 500;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Insertion-ordered Map — oldest entries at the front. */
const _cache = new Map();

/** JSON ổn định (khoá sắp xếp) để {a,b} và {b,a} cho cùng một khoá. */
function stableFacts(facts) {
  if (!facts || typeof facts !== 'object') return '';
  const keys = Object.keys(facts).sort();
  if (!keys.length) return '';
  return JSON.stringify(keys.map((k) => [k, facts[k]]));
}

function _cacheKey(description, topReranked, { facts, mode = 'single' } = {}) {
  return crypto
    .createHash('sha256')
    .update(`${description.toLowerCase().trim()}|${topReranked}|${mode}|${stableFacts(facts)}`)
    .digest('hex')
    .slice(0, 16);
}

function getSuggestCache(description, topReranked, opts) {
  const key = _cacheKey(description, topReranked, opts);
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) { _cache.delete(key); return null; }
  // LRU: move to end
  _cache.delete(key);
  _cache.set(key, entry);
  return entry.value;
}

function setSuggestCache(description, topReranked, value, opts) {
  const key = _cacheKey(description, topReranked, opts);
  // Evict oldest if at capacity
  if (_cache.size >= MAX) {
    _cache.delete(_cache.keys().next().value);
  }
  _cache.set(key, { ts: Date.now(), value });
}

function getCacheStats() {
  return { size: _cache.size, maxSize: MAX, ttlHours: TTL_MS / 3600000 };
}

module.exports = { getSuggestCache, setSuggestCache, getCacheStats };
