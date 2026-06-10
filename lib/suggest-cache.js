const crypto = require('crypto');

// In-memory LRU cache for /api/suggest results.
// Keyed by hash(description + topReranked). TTL: 24h.
// Max 500 entries — prevents unbounded memory on long-lived processes.

const MAX = 500;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Insertion-ordered Map — oldest entries at the front. */
const _cache = new Map();

function _cacheKey(description, topReranked) {
  return crypto
    .createHash('sha256')
    .update(`${description.toLowerCase().trim()}|${topReranked}`)
    .digest('hex')
    .slice(0, 16);
}

function getSuggestCache(description, topReranked) {
  const key = _cacheKey(description, topReranked);
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) { _cache.delete(key); return null; }
  // LRU: move to end
  _cache.delete(key);
  _cache.set(key, entry);
  return entry.value;
}

function setSuggestCache(description, topReranked, value) {
  const key = _cacheKey(description, topReranked);
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
