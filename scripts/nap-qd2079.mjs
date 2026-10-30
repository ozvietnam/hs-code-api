#!/usr/bin/env node
/**
 * Nạp Danh mục rủi ro phân loại QĐ 2079 vào Postgres (tuỳ chọn) của hs-code-api (L0g, #545).
 * Từ 30/10/2026 danh mục CÔNG KHAI: runtime đọc thẳng bảng tĩnh data/rui-ro-phan-loai/qd-2079.json; nạp Postgres
 * chỉ cần khi muốn giữ dữ liệu trong DB (vd bản cập nhật chưa vào git).
 *
 *   node scripts/nap-qd2079.mjs --file=<tệp>        # hoặc env HS_QD2079_FILE; mặc định bảng tĩnh trong data/
 *   node scripts/nap-qd2079.mjs --dry-run           # chỉ kiểm tệp + đếm, không cần DB
 *
 * Cần HS_DATABASE_URL (trừ --dry-run) và đã chạy `npm run db:migrate`. Chỉ in số đếm.
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
import fs from 'fs';

const { napQd2079 } = require('../lib/nap-qd2079.js');
const { layPool, dongPool } = require('../lib/db.js');
const { dataReadPath } = require('../lib/data-paths.js');
const { TEP_TINH } = require('../lib/rui-ro-phan-loai.js');

const args = process.argv.slice(2);
const arg = (k) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
const thuKhan = args.includes('--dry-run');
const file = arg('file') || process.env.HS_QD2079_FILE || dataReadPath(TEP_TINH);

if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
  console.error(`Từ chối nạp: không tìm thấy tệp (${arg('file') || process.env.HS_QD2079_FILE ? '--file / HS_QD2079_FILE' : `data/${TEP_TINH}`}): truyền --file=<đường dẫn> hoặc đặt HS_QD2079_FILE.`);
  process.exit(2);
}
try {
  await napQd2079({ file, db: thuKhan ? null : layPool(), thuKhan });
} catch (e) {
  console.error(`Nạp lỗi: ${String(e?.message || e).slice(0, 200)}`);
  process.exitCode = 1;
} finally {
  await dongPool();
}
