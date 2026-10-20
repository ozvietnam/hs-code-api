// Tên tiếng Trung cấp 6 số từ《进出口税则 2026》(PR #356, issue #350):
// data/bieu-thue/zh/hs6-zh.jsonl — 5.594/5.784 mã, nguyên văn + nguon.viTri.
// Loader lazy theo mô-đun khác (lib/enriched-data.js): cache theo process.
const fs = require('fs');
const { dataReadPath } = require('./data-paths');

let map = null; // hs6 → {tenZh, tenZhCha}

function load() {
  if (map !== null) return map;
  map = new Map();
  try {
    const raw = fs.readFileSync(dataReadPath('bieu-thue/zh/hs6-zh.jsonl'), 'utf8');
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const o = JSON.parse(line);
        if (o.hs6 && o.tenZh) map.set(o.hs6, o);
      } catch {
        // dòng hỏng bỏ qua — bộ kiểm riêng đã soát toàn bộ tệp
      }
    }
  } catch {
    // bản cắt thiếu data → tra cứu trả null, không làm gãy API
  }
  return map;
}

/** Tên tiếng Trung của mã 6 số; null khi ấn bản TQ không có (172 mã chương 98 VN, 17 nhóm gộp 4 số…). */
function tenZhOf(hs6) {
  const o = load().get(String(hs6 || '').slice(0, 6));
  return o ? o.tenZh : null;
}

/** Tên dòng cha gần nhất (nhóm 4 số / gạch cấp trên) cho tên 「其他」hoặc tên cụt; null khi tên tự đủ nghĩa. */
function tenZhChaOf(hs6) {
  const o = load().get(String(hs6 || '').slice(0, 6));
  return o ? o.tenZhCha || null : null;
}

function soLuong() {
  return load().size;
}

/** Cho test xoá cache khi file đổi giữa các lượt chạy. */
function resetCache() {
  map = null;
}

module.exports = { tenZhOf, tenZhChaOf, soLuong, resetCache };
