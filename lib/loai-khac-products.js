const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(process.cwd(), 'data', 'loai-khac-products.jsonl');

// Lazy singleton: { [hs8]: string[] }
let _db = null;

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

module.exports = { getProducts, isLoaiKhac, getDb };
