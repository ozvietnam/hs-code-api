#!/usr/bin/env node
/**
 * Chạy migration SQL chỉ-thêm (db/migrations/*.sql) trên Postgres của hs-code-api (L0g, #545).
 *   HS_DATABASE_URL=... npm run db:migrate
 * Chạy nhiều lần an toàn: tệp đã ghi trong schema_migrations thì bỏ qua. Không in URL.
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { layPool, dongPool } = require('../lib/db.js');
const { chayMigration } = require('../lib/db-migrate.js');

const pool = layPool();
if (!pool) {
  console.error('Chưa đặt HS_DATABASE_URL — không có DB để chạy migration.');
  process.exit(2);
}
try {
  const { daChay, boQua } = await chayMigration(pool, { log: (s) => console.log(s) });
  console.log(`migration: chạy mới ${daChay.length}, đã có từ trước ${boQua}`);
} catch (e) {
  console.error(String(e?.message || e).slice(0, 300));
  process.exitCode = 1;
} finally {
  await dongPool();
}
