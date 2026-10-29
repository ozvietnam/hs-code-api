// lib/db.js — Tầng Postgres TỐI THIỂU của hs-code-api (L0g, #545).
//
// Lần đầu hs-code-api có DB. Dùng cho dữ liệu GHI/KÍN lúc chạy (CLAUDE.md: "Dữ liệu GHI LÚC CHẠY được dùng database",
// CEO chốt 12/10/2026); bảng tra tĩnh vẫn ở data/*.json.
//
// Nguyên tắc:
//   - Env HS_DATABASE_URL (vd postgres://hs_code_api:<mk>@<host>:5432/hs_code_api). Không có env ⇒ layPool() = null
//     và MỌI tính năng dùng DB tự tắt — service vẫn chạy như trước khi có DB, không ném lỗi.
//   - Pool tạo LƯỜI (lượt đầu cần), không mở kết nối lúc require.
//   - KHÔNG BAO GIỜ in URL / mật khẩu / host ra log hay phản hồi. Lỗi chỉ ghi mã lỗi (err.code).
//   - DB là database RIÊNG + user RIÊNG trong máy Postgres của Cổng (CEO 29/10) — xem docs/deploy-coolify.md mục 6.

let pool = null;
let poolUrl = null;

function urlDb() {
  return String(process.env.HS_DATABASE_URL || '').trim();
}

/** true khi đã đặt HS_DATABASE_URL (chưa chắc kết nối được — xem trangThaiDb). */
function dbDaCauHinh() {
  return urlDb() !== '';
}

/** Mã lỗi an toàn để log (không chép message — message của pg có thể chứa host/người dùng). */
function maLoi(e) {
  const c = e && (e.code || e.name);
  return typeof c === 'string' && /^[A-Za-z0-9_]{1,40}$/.test(c) ? c : 'LOI';
}

/** Pool dùng chung, hoặc null khi chưa cấu hình. */
function layPool() {
  const url = urlDb();
  if (!url) return null;
  if (pool && poolUrl === url) return pool;
  if (pool) { const cu = pool; pool = null; cu.end().catch(() => {}); }
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: url,
    max: Math.max(1, Number(process.env.HS_DATABASE_POOL_MAX) || 5),
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 30000,
    application_name: 'hs-code-api',
  });
  poolUrl = url;
  // Client rảnh bị máy chủ ngắt (restart Postgres…) phát 'error' trên pool; không bắt thì tiến trình chết.
  pool.on('error', (e) => { console.warn(`[db] lỗi kết nối rảnh: ${maLoi(e)}`); });
  return pool;
}

/** 'OK' | 'CHUA_CAU_HINH' | 'LOI' — chạy SELECT 1, hạn 2 s. Không bao giờ ném. */
async function trangThaiDb() {
  const p = layPool();
  if (!p) return 'CHUA_CAU_HINH';
  let timer;
  try {
    const hetGio = new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })), 2000); });
    await Promise.race([p.query('SELECT 1'), hetGio]);
    return 'OK';
  } catch (e) {
    console.warn(`[db] kiểm trạng thái lỗi: ${maLoi(e)}`);
    return 'LOI';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lấy một client riêng cho giao dịch: Pool của `pg` → pool.connect() (trả lại bằng release()); client có sẵn
 * (PoolClient đã connect, PGlite trong test) → dùng thẳng. → { client, traLai() }
 */
async function layClient(db) {
  const laPool = db && typeof db.connect === 'function' && typeof db.release !== 'function' && typeof db.totalCount === 'number';
  if (!laPool) return { client: db, traLai: () => {} };
  const client = await db.connect();
  return { client, traLai: () => client.release() };
}

/** Đóng pool (script CLI, test). Lượt sau layPool() tạo lại nếu còn env. */
async function dongPool() {
  if (!pool) return;
  const cu = pool;
  pool = null;
  poolUrl = null;
  await cu.end().catch(() => {});
}

module.exports = { layPool, layClient, trangThaiDb, dbDaCauHinh, dongPool, maLoi };
