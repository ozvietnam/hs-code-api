/**
 * Import side-effect: cách ly mọi thao tác GHI của test sang thư mục tạm.
 *
 * Trước đây các test ghi thẳng vào data/ thật (feedback.jsonl, audit-log.jsonl,
 * versions/index.json...) nên `npm test` làm bẩn repo — có lần commit lẫn cả
 * snapshot `v-api-test` thành "phiên bản biểu thuế đang hiệu lực".
 *
 * lib/data-paths.js đọc HS_DATA_DIR: ghi vào đó, còn đọc thì rơi về data/ gốc
 * khi file chưa tồn tại. Import module này ở ĐẦU test là đủ (ESM chạy import
 * trước thân module, nên env được set trước khi lib nào được require).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-test-data-'));
process.env.HS_DATA_DIR = dir;

process.on('exit', () => {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // dọn dẹp best-effort — không được làm hỏng kết quả test
  }
});

export const TEST_DATA_DIR = dir;
