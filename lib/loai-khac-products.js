const fs   = require('fs');
const path = require('path');

const DATA_PATH  = path.join(process.cwd(), 'data', 'loai-khac-products.jsonl');
const STATS_PATH = path.join(process.cwd(), 'data', 'loai-khac-products-stats.json');

// Lazy singleton: { [hs8]: string[] }
let _db = null;
// Lazy singleton: parsed stats file
let _stats = null;

function loadDb() {
  if (_db) return _db;
  _db = {};
  if (!fs.existsSync(DATA_PATH)) return _db;
  const lines = fs.readFileSync(DATA_PATH, 'utf8').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const { hs, tenHang } = JSON.parse(line);
      if (hs && tenHang) {
        if (!_db[hs]) _db[hs] = [];
        _db[hs].push(tenHang);
      }
    } catch {}
  }
  return _db;
}

/** Trả về danh sách sản phẩm ví dụ cho mã HS "Loại khác". */
function getProducts(hs, limit = 8) {
  return (loadDb()[hs] || []).slice(0, limit);
}

/** Kiểm tra HS code có phải là "Loại khác" không (có trong corpus). */
function isLoaiKhac(hs) {
  return Object.prototype.hasOwnProperty.call(loadDb(), hs);
}

/** Trả về toàn bộ DB (dùng cho batch lookup). */
function getDb() {
  return loadDb();
}

function loadStats() {
  if (_stats) return _stats;
  try { _stats = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8')); }
  catch { _stats = { codes: {}, totals: {}, byPotential: {}, mineableQueue: [] }; }
  return _stats;
}

/** Bộ đếm + đánh giá độ đào sâu cho 1 mã. Null nếu mã không có trong corpus. */
function getCodeStats(hs) {
  return loadStats().codes[hs] || null;
}

/** Tóm tắt toàn cục + queue ưu tiên đào (cho dashboard / chế độ làm giàu). */
function getStatsSummary() {
  const s = loadStats();
  return {
    generatedAt: s.generatedAt,
    totals: s.totals,
    byPotential: s.byPotential,
    mineableQueue: s.mineableQueue,
  };
}

module.exports = { getProducts, isLoaiKhac, getDb, getCodeStats, getStatsSummary };
