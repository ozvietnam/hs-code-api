const fs = require('fs');
const path = require('path');

// Thư mục data gốc (read-only nguồn): tax.json, chú giải, tiền lệ...
const SOURCE_DIR = path.join(process.cwd(), 'data');

// Thư mục nhận GHI (state thay đổi được: feedback, audit log, snapshot biểu thuế).
// Production không set HS_DATA_DIR → ghi thẳng vào data/ như cũ.
// Test set HS_DATA_DIR=<tmp> → mọi ghi rơi vào tmp, data/ thật không bị bẩn.
const WRITE_DIR = process.env.HS_DATA_DIR
  ? path.resolve(process.env.HS_DATA_DIR)
  : SOURCE_DIR;

/** Đường dẫn để GHI. */
function dataPath(...segments) {
  return path.join(WRITE_DIR, ...segments);
}

/**
 * Đường dẫn để ĐỌC: ưu tiên bản đã ghi ở WRITE_DIR, không có thì đọc data/ gốc.
 * Nhờ vậy test đọc được nguồn thật mà vẫn thấy đúng thứ mình vừa ghi.
 */
function dataReadPath(...segments) {
  if (WRITE_DIR === SOURCE_DIR) return path.join(SOURCE_DIR, ...segments);
  const written = path.join(WRITE_DIR, ...segments);
  return fs.existsSync(written) ? written : path.join(SOURCE_DIR, ...segments);
}

const isolated = WRITE_DIR !== SOURCE_DIR;

module.exports = { SOURCE_DIR, WRITE_DIR, dataPath, dataReadPath, isolated };
