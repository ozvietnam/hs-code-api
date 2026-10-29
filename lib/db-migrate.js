// lib/db-migrate.js — chạy migration SQL chỉ-thêm của hs-code-api (L0g, #545).
//
// db/migrations/NNNN_<tên>.sql chạy theo thứ tự tên; tên đã có trong bảng schema_migrations thì bỏ qua.
// Mỗi tệp chạy trong MỘT giao dịch cùng dòng ghi schema_migrations — lỗi giữa chừng thì không để lại nửa vời.
// Tệp migration phải idempotent (CREATE … IF NOT EXISTS) và chỉ thêm (test-rui-ro-phan-loai.mjs khoá luật này).
//
// `db` là Pool của `pg` (có connect()) hoặc một client { query } (PGlite trong test, client đã connect).

const fs = require('fs');
const path = require('path');
const { layClient } = require('./db');

const THU_MUC_MAC_DINH = path.join(__dirname, '..', 'db', 'migrations');

const TAO_BANG_THEO_DOI = `CREATE TABLE IF NOT EXISTS schema_migrations (
  ten text PRIMARY KEY,
  chay_luc timestamptz NOT NULL DEFAULT now()
)`;

/** → { daChay: string[], boQua: number } */
async function chayMigration(db, { thuMuc = THU_MUC_MAC_DINH, log = () => {} } = {}) {
  if (!db) throw new Error('Chưa cấu hình HS_DATABASE_URL — không có DB để chạy migration.');
  const tep = fs.readdirSync(thuMuc).filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f)).sort();
  const { client, traLai } = await layClient(db);
  const daChay = [];
  let boQua = 0;
  try {
    await client.query(TAO_BANG_THEO_DOI);
    const { rows } = await client.query('SELECT ten FROM schema_migrations');
    const coRoi = new Set(rows.map((r) => r.ten));
    for (const f of tep) {
      if (coRoi.has(f)) { boQua += 1; continue; }
      const sql = fs.readFileSync(path.join(thuMuc, f), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (ten) VALUES ($1) ON CONFLICT (ten) DO NOTHING', [f]);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        throw new Error(`Migration ${f} lỗi: ${e && e.message ? String(e.message).slice(0, 200) : 'không rõ'}`);
      }
      daChay.push(f);
      log(`đã chạy ${f}`);
    }
  } finally {
    traLai();
  }
  return { daChay, boQua };
}

module.exports = { chayMigration, THU_MUC_MAC_DINH };
