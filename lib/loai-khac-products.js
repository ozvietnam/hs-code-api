const fs   = require('fs');
const path = require('path');

const DATA_PATH  = path.join(process.cwd(), 'data', 'loai-khac-products.jsonl');
const STATS_PATH = path.join(process.cwd(), 'data', 'loai-khac-products-stats.json');

// Lazy singleton: { [hs8]: {tenHang, source}[] }
//
// NGUỒN (trường `source` trong jsonl):
//   oz-gold        tên hàng THẬT từ tờ khai đã khai  (968 dòng)
//   rule           câu do máy sinh từ luật phân nhóm (7.427 dòng) — có ví dụ
//                  sai (VD "ô tô điện 5 chỗ" → 87045129, mà 8704 là xe chở hàng)
//   rule-fallback  câu rỗng nghĩa "Hàng hóa nhóm 0101 loại thông thường"
// Trước đây trả lẫn cả ba dưới tên productExamples như thể là hàng thật.
// Nay: getProducts() chỉ trả hàng THẬT; câu máy sinh tách riêng, gắn nhãn.
let _db = null;
// Lazy singleton: parsed stats file
let _stats = null;

const VERIFIED_SOURCES = new Set(['oz-gold']);
const USELESS_SOURCES = new Set(['rule-fallback']);

function loadDb() {
  if (_db) return _db;
  _db = {};
  if (!fs.existsSync(DATA_PATH)) return _db;
  const lines = fs.readFileSync(DATA_PATH, 'utf8').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const { hs, tenHang, source } = JSON.parse(line);
      if (hs && tenHang) {
        if (!_db[hs]) _db[hs] = [];
        _db[hs].push({ tenHang, source: source || 'unknown' });
      }
    } catch {}
  }
  return _db;
}

/** Tên hàng THẬT (từ tờ khai) cho mã "Loại khác". Có thể rỗng. */
function getProducts(hs, limit = 8) {
  return (loadDb()[hs] || [])
    .filter((p) => VERIFIED_SOURCES.has(p.source))
    .slice(0, limit)
    .map((p) => p.tenHang);
}

/** Câu ví dụ do MÁY SINH (chưa kiểm chứng) — chỉ để gợi ý, không phải hàng thật. */
function getGeneratedProducts(hs, limit = 5) {
  return (loadDb()[hs] || [])
    .filter((p) => !VERIFIED_SOURCES.has(p.source) && !USELESS_SOURCES.has(p.source))
    .slice(0, limit)
    .map((p) => p.tenHang);
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

module.exports = { getProducts, getGeneratedProducts, isLoaiKhac, getDb, getCodeStats, getStatsSummary };
