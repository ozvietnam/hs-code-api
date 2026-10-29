#!/usr/bin/env node
/**
 * Nạp Danh mục rủi ro phân loại QĐ 2079 (tệp RIÊNG, ngoài git) vào Postgres kín của hs-code-api (L0g, #545).
 *
 *   node scripts/nap-qd2079.mjs --file=/srv/hs-private/qd-2079.json        # hoặc env HS_QD2079_FILE
 *   node scripts/nap-qd2079.mjs --dry-run                                   # chỉ kiểm tệp + đếm, không cần DB
 *
 * Cần HS_DATABASE_URL (trừ --dry-run) và đã chạy `npm run db:migrate`. Chỉ in số đếm — không in tên hàng.
 * Từ chối tệp nằm trong cây git mà không bị .gitignore chặn.
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { kiemTepNgoaiGit, napQd2079 } = require('../lib/nap-qd2079.js');
const { layPool, dongPool } = require('../lib/db.js');

const args = process.argv.slice(2);
const arg = (k) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
const thuKhan = args.includes('--dry-run');
const file = arg('file') || process.env.HS_QD2079_FILE || '';

if (!file) {
  console.error('Thiếu tệp: truyền --file=<đường dẫn ngoài repo> hoặc đặt HS_QD2079_FILE.');
  process.exit(2);
}
const k = kiemTepNgoaiGit(file);
if (!k.ok) {
  console.error(`Từ chối nạp: ${k.lyDo}.`);
  process.exit(3);
}
try {
  await napQd2079({ file, db: thuKhan ? null : layPool(), thuKhan });
} catch (e) {
  console.error(`Nạp lỗi: ${String(e?.message || e).slice(0, 200)}`);
  process.exitCode = 1;
} finally {
  await dongPool();
}
