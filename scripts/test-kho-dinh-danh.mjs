// scripts/test-kho-dinh-danh.mjs — Kho định danh PR1a (OZV-2024): chuẩn hoá + cờ off + migration 0004.
// Không mạng, không ghi data/ thật. Migration kiểm bằng parse SQL (CREATE TABLE 5 bảng + UNIQUE) và
// chạy PGlite nếu có @electric-sql/pglite.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
delete process.env.HS_DATABASE_URL;
delete process.env.HS_KHO_DINH_DANH;

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};

const kho = require('../lib/kho-dinh-danh.js');

// ── 0. Công tắc ───────────────────────────────────────────────────────────────────────────────────────────────
check('cheDo: mặc định off', kho.cheDoKhoDinhDanh() === 'off');
process.env.HS_KHO_DINH_DANH = 'on';
check('cheDo: on', kho.cheDoKhoDinhDanh() === 'on');
process.env.HS_KHO_DINH_DANH = 'Shadow';
check('cheDo: shadow', kho.cheDoKhoDinhDanh() === 'shadow');
delete process.env.HS_KHO_DINH_DANH;
check('hanDocMs: mặc định 100', kho.hanDocMs() === 100);

// ── 1. chuanHoaHang ───────────────────────────────────────────────────────────────────────────────────────────
check('hãng: Mitsubishi Electric → mitsubishi', kho.chuanHoaHang('Mitsubishi Electric') === 'mitsubishi');
check('hãng: Mitsubishi Electric Corp. → mitsubishi', kho.chuanHoaHang('Mitsubishi Electric Corp.') === 'mitsubishi');
check('hãng: SIEMENS AG / Inc. → siemens', kho.chuanHoaHang('SIEMENS Inc.') === 'siemens');
check('hãng: gộp khoảng trắng + NFKC', kho.chuanHoaHang('  Mitsubishi   Electric  ') === 'mitsubishi');
check('hãng: rỗng → null', kho.chuanHoaHang('') == null && kho.chuanHoaHang(null) == null);

// ── 2. chuanHoaModel ──────────────────────────────────────────────────────────────────────────────────────────
const fr = kho.chuanHoaModel('FR-D720-0.75K');
check('model: FR-D720-0.75K có chuan + rutGon', fr && fr.chuan === 'FR-D720-0.75K' && fr.rutGon === 'frd720075k');
const fr2 = kho.chuanHoaModel('FRD720 0.75K');
check('model: FRD720 0.75K ↔ cùng rutGon frd720075k', fr2 && fr2.rutGon === 'frd720075k');
const fr3 = kho.chuanHoaModel('model: FR-D720-0.75K');
check('model: cắt tiền tố model:', fr3 && fr3.rutGon === 'frd720075k' && fr3.chuan === 'FR-D720-0.75K');
const plc = kho.chuanHoaModel('6ES7214-1AG40-0XB0');
check('model: PLC Siemens giữ gạch', plc && plc.chuan === '6ES7214-1AG40-0XB0' && plc.rutGon === '6es72141ag400xb0');

check('model: chặn <4 ký tự rutGon (AB)', kho.chuanHoaModel('AB') == null);
check('model: chặn 304 (số thuần)', kho.chuanHoaModel('304') == null);
check('model: chặn 100W', kho.chuanHoaModel('100W') == null);
check('model: chặn 220V', kho.chuanHoaModel('220V') == null);
check('model: chặn DN50', kho.chuanHoaModel('DN50') == null);
check('model: chặn M12', kho.chuanHoaModel('M12') == null);
check('model: rỗng → null', kho.chuanHoaModel('') == null && kho.chuanHoaModel(null) == null);

// ── 3. docKho no-op khi off ───────────────────────────────────────────────────────────────────────────────────
{
  delete process.env.HS_KHO_DINH_DANH;
  const r = await kho.docKho('mitsubishi', 'frd720075k');
  check('docKho: cờ off → null (no-op)', r === null);
}
{
  process.env.HS_KHO_DINH_DANH = 'shadow';
  const r = await kho.docKho('mitsubishi', 'frd720075k');
  // PR1a: stub — chưa nối DB; shadow cũng trả null (chưa có bản ghi).
  check('docKho: shadow stub → null (chưa nối DB)', r === null);
  delete process.env.HS_KHO_DINH_DANH;
}

// ── 4. Migration SQL ──────────────────────────────────────────────────────────────────────────────────────────
const sqlPath = path.join(root, 'db', 'migrations', '0004_kho_dinh_danh.sql');
const sqlMig = fs.readFileSync(sqlPath, 'utf8');
const sqlKhongChuThich = sqlMig.replace(/--.*$/gm, '');
check('migration: có file 0004_kho_dinh_danh.sql', fs.existsSync(sqlPath));
for (const bang of ['dd_nut', 'dd_bi_danh', 'dd_nguon', 'dd_du_kien', 'dd_canh']) {
  check(`migration: CREATE TABLE ${bang}`, new RegExp(`CREATE TABLE IF NOT EXISTS ${bang}\\b`, 'i').test(sqlMig));
}
check('migration: UNIQUE (loai_nut, khoa_chuan) trên dd_nut', /UNIQUE\s*\(\s*loai_nut\s*,\s*khoa_chuan\s*\)/i.test(sqlMig));
check('migration: UNIQUE bi_danh trên dd_bi_danh', /UNIQUE\s*\(\s*loai_nut\s*,\s*bi_danh_chuan\s*,\s*nut_id\s*\)/i.test(sqlMig));
check('migration: chỉ mục tra nhanh bi_danh_rut_gon', /idx_dd_bi_danh_tra_nhanh/i.test(sqlMig));
check('migration: không có DROP / ALTER / DELETE', !/\b(DROP|ALTER|DELETE|TRUNCATE)\b/i.test(sqlKhongChuThich));

try {
  const { PGlite } = await import('@electric-sql/pglite');
  const pgl = new PGlite();
  const db = {
    async query(sql, params) {
      if (params && params.length) return pgl.query(sql, params);
      const rs = await pgl.exec(sql);
      return rs[rs.length - 1] || { rows: [] };
    },
  };
  const { chayMigration } = require('../lib/db-migrate.js');
  const migDir = path.join(root, 'db', 'migrations');
  const r1 = await chayMigration(db, { thuMuc: migDir });
  const r2 = await chayMigration(db, { thuMuc: migDir });
  check(
    'migration: chạy 0004 lần đầu, lần 2 không chạy lại',
    r1.daChay.includes('0004_kho_dinh_danh.sql') && r2.daChay.length === 0,
    JSON.stringify({ r1: r1.daChay, r2: r2.daChay }),
  );
  await db.query(sqlMig);
  check('migration: chạy tay lần nữa vẫn không lỗi (IF NOT EXISTS)', true);
  const tables = await db.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'dd_%' ORDER BY 1",
  );
  const names = (tables.rows || []).map((r) => r.tablename);
  check('migration: 5 bảng dd_* có trong DB', ['dd_bi_danh', 'dd_canh', 'dd_du_kien', 'dd_nguon', 'dd_nut'].every((t) => names.includes(t)), JSON.stringify(names));
} catch (e) {
  if (String(e?.message || e).includes("Cannot find module '@electric-sql/pglite'")) {
    check('migration: PGlite bỏ qua (chưa cài devDeps) — SQL đã parse bằng regex', true);
  } else {
    check('migration: PGlite chạy xanh', false, String(e?.stack || e));
  }
}

// ── 5. bang-co ────────────────────────────────────────────────────────────────────────────────────────────────
{
  const bang = JSON.parse(fs.readFileSync(path.join(root, 'data', 'luat', 'bang-co.json'), 'utf8'));
  const list = bang.co || [];
  const entry = list.find((c) => c.ten === 'HS_KHO_DINH_DANH');
  check('bang-co: có HS_KHO_DINH_DANH', !!entry);
  check('bang-co: mặc định off', entry && entry.macDinh === 'off' && entry.macDinhBat === false);
  check('bang-co: cheDo gồm off/shadow/on', entry && Array.isArray(entry.cheDo) && entry.cheDo.includes('off') && entry.cheDo.includes('shadow') && entry.cheDo.includes('on'));
  check('bang-co: có khối bong (shadow)', entry && entry.bong && typeof entry.bong === 'object');
}

console.log(`\n${pass} passed | ${fail} failed`);
process.exit(fail ? 1 : 0);
