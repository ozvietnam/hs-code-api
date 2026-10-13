// lib/data-cache.js — nạp JSON dùng CHUNG, một bản trong RAM cho mỗi tệp (#239 goal 1).
//
// Nhiều module cùng hỏi một tệp (vd tax.json ở data.js + classify.js + so-tay.js) → trước đây
// mỗi nơi tự JSON.parse → 3 bản 5,6 MB trong RAM. Dùng loadJson(path) để tất cả nhận CÙNG một
// đối tượng (===). Nạp lại CHỈ khi tệp đổi (mtime/size) — không theo đồng hồ.
//
// Đường dẫn NÊN lấy qua lib/data-paths.js (dataReadPath) để test cách ly (HS_DATA_DIR, luật 8)
// vẫn chạy và để mọi module dùng cùng một chuỗi path → cùng một ô cache.

const fs = require('fs');

const _cache = new Map(); // absPath -> { key: "mtimeMs:size", data }

/**
 * Nạp + cache JSON theo đường dẫn tuyệt đối. Trả cùng một đối tượng khi tệp không đổi.
 * @param {string} absPath đường dẫn tệp (nên qua dataReadPath)
 * @param {*} [fallback] giá trị trả khi tệp thiếu / parse lỗi; không truyền thì ném lỗi.
 */
function loadJson(absPath, fallback) {
  const hasFallback = arguments.length > 1;
  let key;
  try {
    const st = fs.statSync(absPath);
    key = `${st.mtimeMs}:${st.size}`;
  } catch (e) {
    if (hasFallback) return fallback;
    throw e;
  }
  const hit = _cache.get(absPath);
  if (hit && hit.key === key) return hit.data;
  try {
    const data = JSON.parse(fs.readFileSync(absPath, 'utf8'));
    _cache.set(absPath, { key, data });
    return data;
  } catch (e) {
    if (hasFallback) return fallback;
    throw e;
  }
}

/** Xoá cache (test / admin ép nạp lại). */
function clearDataCache() { _cache.clear(); }

module.exports = { loadJson, clearDataCache, _cache };
