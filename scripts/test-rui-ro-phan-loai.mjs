import './test-isolate-data.mjs';
/**
 * L0g (#545) — tầng Postgres tối thiểu + Danh mục rủi ro phân loại QĐ 2079 (bảng kín, chỉ caller nội bộ Oz).
 *
 * Không mạng, không ghi data/ thật:
 *   - DB giả là đối tượng { query } ghi lại câu lệnh;
 *   - Postgres thật chạy TRONG TIẾN TRÌNH bằng PGlite (WASM) để kiểm migration SQL + bộ nạp + hàm đọc đầu-cuối;
 *   - HS_TEST_DATABASE_URL (tuỳ chọn) → chạy thêm trên Postgres thật qua `pg`; không có thì bỏ qua, có ghi lý do.
 * Dữ liệu QĐ 2079 ở đây là GIẢ (mã + tên bịa) — tệp thật không bao giờ vào git.
 */
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

process.env.HS_API_TOKEN = 'legacy-token';
process.env.HS_SERVICE_TOKENS = 'cong-oz:khoa-cong,erp:khoa-erp,khac:khoa-khac';
delete process.env.HS_DATABASE_URL;
delete process.env.HS_INTERNAL_CALLERS;
delete process.env.HS_QD2079_FILE;

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};
const mkReq = (token) => ({ method: 'GET', url: '/x', query: {}, headers: token ? { authorization: `Bearer ${token}` } : {} });
const mkRes = () => ({ _s: 0, _j: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } });

/** DB giả: ghi lại mọi câu lệnh; `tra(sql, params)` quyết định rows trả về. */
function dbGia(tra = () => []) {
  const calls = [];
  return {
    calls,
    async query(sql, params) { calls.push({ sql: String(sql), params }); return { rows: tra(String(sql), params) || [] }; },
  };
}

const TEN_BI_MAT = 'Hàng giả lập tuyệt mật ABC';

// ── 1. lib/db.js: không có HS_DATABASE_URL → tính năng tắt, không ném ──
const db = require('../lib/db.js');
check('layPool() không có HS_DATABASE_URL → null', db.layPool() === null);
check('dbDaCauHinh() → false', db.dbDaCauHinh() === false);
check('trangThaiDb() → CHUA_CAU_HINH', (await db.trangThaiDb()) === 'CHUA_CAU_HINH');

{
  // URL hỏng (cổng 1 trên máy này, không mạng ngoài) → LOI trong ~2 s, không in mật khẩu
  process.env.HS_DATABASE_URL = 'postgres://u:matkhau-bi-mat@127.0.0.1:1/khong_co';
  const logs = [];
  const saved = [console.log, console.warn, console.error];
  console.log = console.warn = console.error = (...a) => logs.push(a.join(' '));
  const t0 = Date.now();
  let st;
  try { st = await db.trangThaiDb(); } finally { [console.log, console.warn, console.error] = saved; }
  check('URL không tới được → LOI', st === 'LOI', st);
  check('trangThaiDb có hạn giờ (≤ 3 s)', Date.now() - t0 <= 3000, Date.now() - t0);
  check('không in mật khẩu/URL ra log', !logs.join('\n').includes('matkhau-bi-mat') && !logs.join('\n').includes('127.0.0.1:1'), logs.join(' | ').slice(0, 200));
  await db.dongPool();
  delete process.env.HS_DATABASE_URL;
  check('dongPool() xong → layPool() lại null khi bỏ env', db.layPool() === null);
}

// ── 2. /api/health: thêm checks.db, không có DB vẫn trả lời ĐỒNG BỘ như cũ ──
{
  const health = require('../api/health.js');
  const res = mkRes();
  health({ method: 'GET', headers: {}, query: {} }, res);
  check('/api/health: checks.db = CHUA_CAU_HINH (trả ngay, không chờ)', res._j?.checks?.db === 'CHUA_CAU_HINH', JSON.stringify(res._j?.checks?.db));
  check('/api/health: thiếu DB KHÔNG làm health "degraded" vì DB (mã HTTP giữ nguyên logic cũ)', [200, 503].includes(res._s) && res._j?.service === 'hs-code-api');
}

// ── 3. laNoiBoOz ──
{
  const { laNoiBoOz } = require('../lib/auth.js');
  check('laNoiBoOz: khoá erp (mặc định HS_INTERNAL_CALLERS=erp) → true', laNoiBoOz(mkReq('khoa-erp')) === true);
  check('laNoiBoOz: khoá cong-oz → false', laNoiBoOz(mkReq('khoa-cong')) === false);
  process.env.HS_INTERNAL_CALLERS = 'erp,cong-oz';
  check('laNoiBoOz: cong-oz bị ghi vào HS_INTERNAL_CALLERS vẫn false (chặn cứng)', laNoiBoOz(mkReq('khoa-cong')) === false);
  process.env.HS_INTERNAL_CALLERS = ' erp , khac ';
  check('laNoiBoOz: khoá dịch vụ khác được khai → true', laNoiBoOz(mkReq('khoa-khac')) === true);
  process.env.HS_INTERNAL_CALLERS = 'khac';
  check('laNoiBoOz: erp không còn trong danh sách → false', laNoiBoOz(mkReq('khoa-erp')) === false);
  delete process.env.HS_INTERNAL_CALLERS;
  check('laNoiBoOz: HS_API_TOKEN → false', laNoiBoOz(mkReq('legacy-token')) === false);
  check('laNoiBoOz: không token → false', laNoiBoOz(mkReq(null)) === false);
  check('laNoiBoOz: khoá sai → false', laNoiBoOz(mkReq('khoa-sai')) === false);
  check('laNoiBoOz: tên dịch vụ làm token → false', laNoiBoOz(mkReq('erp')) === false);
}

// ── 4. tinHieuDanhMuc ──
const { tinHieuDanhMuc } = require('../lib/rui-ro-phan-loai.js');
{
  const gia = dbGia(() => [{ ma_a: '392310', ma_b: '392690', ten_hang: TEN_BI_MAT }]);
  for (const noiBo of [false, undefined, 'true', 1]) {
    const out = await tinHieuDanhMuc('39269099', { noiBo, db: gia });
    check(`noiBo=${JSON.stringify(noiBo)} → [] và KHÔNG chạm DB`, Array.isArray(out) && out.length === 0 && gia.calls.length === 0, gia.calls.length);
  }
  const out0 = await tinHieuDanhMuc('39269099', {});
  check('thiếu noiBo (không truyền db) → [] và không tạo pool', out0.length === 0 && db.layPool() === null);
}
{
  const gia = dbGia(() => [{ ma_a: '392310', ma_b: '392690', ten_hang: 'Hàng thử' }]);
  const out = await tinHieuDanhMuc('3926.90.99', { noiBo: true, db: gia });
  check('noiBo=true, DB trả 1 dòng → 1 mục', out.length === 1, JSON.stringify(out));
  const m = out[0] || {};
  check('mục: loai=DANH_MUC_RUI_RO, nhan=QD_2079_BAC_C_NOI_BO', m.loai === 'DANH_MUC_RUI_RO' && m.nhan === 'QD_2079_BAC_C_NOI_BO');
  check('mục: maLienQuan là mã phía bên kia của cặp', m.maLienQuan === '392310', m.maLienQuan);
  check('mục: có ghiChu "không phải căn cứ pháp lý"', typeof m.ghiChu === 'string' && /không phải căn cứ pháp lý/.test(m.ghiChu));
  check('mục: có tenHang', m.tenHang === 'Hàng thử');
  check('mục: KHÔNG gắn nhãn căn cứ pháp lý (canCuPhapLy/girRulesApplied)', !('canCuPhapLy' in m) && !('girRulesApplied' in m));
  const p = gia.calls[0]?.params?.[0];
  check('truy vấn khớp theo tiền tố 8/6/4 số', gia.calls.length === 1 && Array.isArray(p) && ['39269099', '392690', '3926'].every((x) => p.includes(x)) && p.length === 3, JSON.stringify(gia.calls[0]?.params));
  check('truy vấn tham số hoá (không nối chuỗi mã vào SQL)', !gia.calls[0].sql.includes('392690'));
}
{
  const gia = dbGia(() => [
    { ma_a: '3926', ma_b: '8544', ten_hang: null },
    { ma_a: '8544', ma_b: '3926', ten_hang: null },
  ]);
  const out = await tinHieuDanhMuc('39269099', { noiBo: true, db: gia });
  check('trùng cặp đảo chiều → gộp 1 mục, không có tenHang khi null', out.length === 1 && out[0].maLienQuan === '8544' && !('tenHang' in out[0]), JSON.stringify(out));
}
{
  check('db=null → [] không ném', (await tinHieuDanhMuc('39269099', { noiBo: true, db: null })).length === 0);
  const hong = { async query() { throw new Error('connect ECONNREFUSED 10.0.0.9:5432 password=abc'); } };
  const logs = [];
  const sw = console.warn; console.warn = (...a) => logs.push(a.join(' '));
  let out;
  try { out = await tinHieuDanhMuc('39269099', { noiBo: true, db: hong }); } finally { console.warn = sw; }
  check('DB lỗi → [] không ném', Array.isArray(out) && out.length === 0);
  check('DB lỗi → log không chép nguyên thông điệp lỗi (có thể chứa host/mật khẩu)', !logs.join(' ').includes('password=abc') && !logs.join(' ').includes('10.0.0.9'), logs.join(' | '));
  const gia = dbGia();
  for (const ma of ['', 'abc', '39', null, undefined, '3926909912345']) {
    await tinHieuDanhMuc(ma, { noiBo: true, db: gia });
  }
  check('mã không hợp lệ (<4 hoặc >10 chữ số, rỗng) → không chạm DB', gia.calls.length === 0, gia.calls.length);
}

// ── 5. Bộ nạp: chặn tệp nằm trong git, chỉ in số đếm ──
const nap = require('../lib/nap-qd2079.js');
{
  const r = spawnSync(process.execPath, ['scripts/nap-qd2079.mjs', '--file=data/customs-types.json'], { cwd: root, encoding: 'utf8', env: { ...process.env, HS_DATABASE_URL: '' } });
  check('CLI: tệp nằm trong git (đã track) → exit ≠ 0', r.status !== 0, r.status);
  check('CLI: thông điệp "tệp nằm trong git"', /tệp nằm trong git/.test(r.stderr + r.stdout), (r.stderr + r.stdout).slice(0, 200));
}
{
  const env = { ...process.env, HS_DATABASE_URL: '' };
  delete env.HS_QD2079_FILE;
  const r = spawnSync(process.execPath, ['scripts/nap-qd2079.mjs'], { cwd: root, encoding: 'utf8', env });
  check('CLI: không có --file và HS_QD2079_FILE → exit ≠ 0, báo thiếu tệp', r.status !== 0 && /HS_QD2079_FILE/.test(r.stderr + r.stdout), (r.stderr + r.stdout).slice(0, 200));
}
{
  // Repo git tạm: tệp bị ignore → được nạp; tệp không ignore → chặn; ngoài git → được nạp
  const g = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-git-'));
  spawnSync('git', ['init', '-q'], { cwd: g });
  fs.writeFileSync(path.join(g, '.gitignore'), 'private/\n');
  fs.mkdirSync(path.join(g, 'private'));
  fs.mkdirSync(path.join(g, 'mo'));
  fs.writeFileSync(path.join(g, 'private', 'a.json'), '[]');
  fs.writeFileSync(path.join(g, 'mo', 'b.json'), '[]');
  check('kiemTepNgoaiGit: tệp trong git nhưng bị ignore → ok', nap.kiemTepNgoaiGit(path.join(g, 'private', 'a.json')).ok === true);
  const k = nap.kiemTepNgoaiGit(path.join(g, 'mo', 'b.json'));
  check('kiemTepNgoaiGit: tệp trong git KHÔNG ignore → chặn', k.ok === false && /tệp nằm trong git/.test(k.lyDo), JSON.stringify(k));
  const ngoai = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-ngoai-'));
  fs.writeFileSync(path.join(ngoai, 'c.json'), '[]');
  check('kiemTepNgoaiGit: tệp ngoài git → ok', nap.kiemTepNgoaiGit(path.join(ngoai, 'c.json')).ok === true);
  check('kiemTepNgoaiGit: tệp không tồn tại → chặn', nap.kiemTepNgoaiGit(path.join(ngoai, 'khong-co.json')).ok === false);
  fs.rmSync(g, { recursive: true, force: true });
  fs.rmSync(ngoai, { recursive: true, force: true });
}

const thuMucTam = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-qd2079-'));
const tepGia = path.join(thuMucTam, 'qd-2079-gia.json');
const noiDung = JSON.stringify([
  { maA: '3926.90.99', maB: '3923.10.90', tenHang: TEN_BI_MAT, ghiChu: 'ghi chú giả' },
  { maA: '8544.42', maB: '8544.49', tenHang: 'Dây điện giả' },
  { maA: '39A6', maB: '3923', tenHang: 'Mã sai' },
]);
fs.writeFileSync(tepGia, noiDung);
const shaTep = crypto.createHash('sha256').update(fs.readFileSync(tepGia)).digest('hex');

{
  const gia = dbGia((sql) => (/^\s*INSERT/i.test(sql) ? [{ id: 1 }] : []));
  const dong = [];
  const kq = await nap.napQd2079({ file: tepGia, db: gia, log: (s) => dong.push(String(s)) });
  const text = dong.join('\n');
  check('bộ nạp: in doc=3 hopLe=2', /doc=3/.test(text) && /hopLe=2/.test(text), text);
  check('bộ nạp: in số dòng lỗi + số thêm mới', /loi=1/.test(text) && /themMoi=2/.test(text), text);
  check('bộ nạp: KHÔNG in tên hàng / ghi chú', !text.includes(TEN_BI_MAT) && !text.includes('Dây điện giả') && !text.includes('ghi chú giả') && !text.includes('Mã sai'), text);
  check('bộ nạp: trả số đếm', kq.doc === 3 && kq.hopLe === 2 && kq.loi === 1 && kq.themMoi === 2 && kq.trung === 0, JSON.stringify(kq));
  const ins = gia.calls.filter((c) => /^\s*INSERT/i.test(c.sql));
  check('bộ nạp: 2 câu INSERT tham số hoá, mã đã chuẩn hoá về chữ số', ins.length === 2 && ins[0].params.includes('39269099') && ins[0].params.includes('39231090') && !ins[0].sql.includes('39269099'), JSON.stringify(ins.map((c) => c.params)));
  check('bộ nạp: ghi sha256 của tệp', ins.every((c) => c.params.includes(shaTep)));
  check('bộ nạp: ON CONFLICT DO NOTHING (chạy lại không nhân đôi)', ins.every((c) => /ON CONFLICT\s*\(nguon,\s*ma_a,\s*ma_b\)\s*DO NOTHING/i.test(c.sql)));
  check('bộ nạp: chạy trong giao dịch', gia.calls.some((c) => /^\s*BEGIN/i.test(c.sql)) && gia.calls.some((c) => /^\s*COMMIT/i.test(c.sql)));
}
{
  const dong = [];
  const kq = await nap.napQd2079({ file: tepGia, db: null, thuKhan: true, log: (s) => dong.push(String(s)) });
  check('bộ nạp --dry-run: không cần DB, chỉ đếm', kq.doc === 3 && kq.hopLe === 2 && kq.themMoi === 0 && /dry-run/.test(dong.join('\n')), JSON.stringify(kq));
  let loi = null;
  try { await nap.napQd2079({ file: tepGia, db: null, log: () => {} }); } catch (e) { loi = e; }
  check('bộ nạp: không dry-run mà thiếu DB → ném lỗi rõ ràng', loi && /HS_DATABASE_URL/.test(loi.message), loi?.message);
  const hong = path.join(thuMucTam, 'hong.json');
  fs.writeFileSync(hong, '{"khong":"phai mang"}');
  let loi2 = null;
  try { await nap.napQd2079({ file: hong, db: null, thuKhan: true, log: () => {} }); } catch (e) { loi2 = e; }
  check('bộ nạp: tệp không phải mảng JSON → ném lỗi', loi2 && /mảng/.test(loi2.message), loi2?.message);
}

// ── 6. Migration: chỉ thêm, idempotent ──
const migDir = path.join(root, 'db', 'migrations');
{
  const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
  check('có migration 0001_rui_ro_phan_loai.sql', files.includes('0001_rui_ro_phan_loai.sql'), files.join(','));
  for (const f of files) {
    const sql = fs.readFileSync(path.join(migDir, f), 'utf8').replace(/--.*$/gm, '');
    check(`${f}: không DROP/TRUNCATE/DELETE/ALTER … DROP`, !/\b(DROP|TRUNCATE|DELETE)\b/i.test(sql));
    const creates = sql.match(/CREATE\s+(UNIQUE\s+)?(TABLE|INDEX)\b(?!\s+IF\s+NOT\s+EXISTS)/gi) || [];
    check(`${f}: mọi CREATE TABLE/INDEX đều IF NOT EXISTS`, creates.length === 0, creates.join(' | '));
  }
}

// ── 7. Đầu-cuối trên Postgres thật trong tiến trình (PGlite) ──
async function dauCuoi(nhan, client) {
  const { chayMigration } = require('../lib/db-migrate.js');
  const r1 = await chayMigration(client, { thuMuc: migDir });
  check(`${nhan}: migration lần 1 chạy 0001`, r1.daChay.includes('0001_rui_ro_phan_loai.sql'), JSON.stringify(r1));
  const r2 = await chayMigration(client, { thuMuc: migDir });
  check(`${nhan}: migration lần 2 không chạy lại gì (idempotent)`, r2.daChay.length === 0, JSON.stringify(r2));
  const bang = await client.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_name IN ('rui_ro_phan_loai','schema_migrations')");
  check(`${nhan}: có bảng rui_ro_phan_loai + schema_migrations`, bang.rows[0].n === 2);
  let checkLoi = false;
  try { await client.query("INSERT INTO rui_ro_phan_loai (ma_a, ma_b, sha256_tep) VALUES ('39A6', '3923', 'x')"); } catch { checkLoi = true; }
  check(`${nhan}: CHECK chặn mã không phải 4–8 chữ số`, checkLoi);

  const k1 = await nap.napQd2079({ file: tepGia, db: client, log: () => {} });
  check(`${nhan}: nạp lần 1 → themMoi=2`, k1.themMoi === 2 && k1.trung === 0, JSON.stringify(k1));
  const k2 = await nap.napQd2079({ file: tepGia, db: client, log: () => {} });
  check(`${nhan}: nạp lần 2 → themMoi=0 trung=2`, k2.themMoi === 0 && k2.trung === 2, JSON.stringify(k2));
  const dem = await client.query('SELECT count(*)::int AS n, min(nguon) AS nguon, min(bac) AS bac, min(phien_ban_danh_muc) AS pb FROM rui_ro_phan_loai');
  check(`${nhan}: 2 dòng, mặc định QD-2079-TCHQ / C / AHTN2017`, dem.rows[0].n === 2 && dem.rows[0].nguon === 'QD-2079-TCHQ' && dem.rows[0].bac === 'C' && dem.rows[0].pb === 'AHTN2017', JSON.stringify(dem.rows[0]));

  const t1 = await tinHieuDanhMuc('39231090', { noiBo: true, db: client });
  check(`${nhan}: tinHieuDanhMuc('39231090') → cặp 39269099`, t1.length === 1 && t1[0].maLienQuan === '39269099' && t1[0].tenHang === TEN_BI_MAT, JSON.stringify(t1));
  const t2 = await tinHieuDanhMuc('85444219', { noiBo: true, db: client });
  check(`${nhan}: tinHieuDanhMuc('85444219') khớp tiền tố 6 số 854442 → 854449`, t2.length === 1 && t2[0].maLienQuan === '854449', JSON.stringify(t2));
  check(`${nhan}: mã không có trong danh mục → []`, (await tinHieuDanhMuc('01012100', { noiBo: true, db: client })).length === 0);
  check(`${nhan}: noiBo=false → [] dù DB có dữ liệu`, (await tinHieuDanhMuc('39231090', { noiBo: false, db: client })).length === 0);
}

{
  const { PGlite } = await import('@electric-sql/pglite');
  const pgl = new PGlite();
  // pg chạy câu nhiều lệnh khi không có tham số (simple protocol); PGlite tách thành exec() — bộ chuyển nhỏ cho giống pg.
  const client = {
    async query(sql, params) {
      if (params && params.length) return pgl.query(sql, params);
      const rs = await pgl.exec(sql);
      return rs[rs.length - 1] || { rows: [] };
    },
  };
  await dauCuoi('PGlite', client);
  await pgl.close();
}

if (process.env.HS_TEST_DATABASE_URL) {
  process.env.HS_DATABASE_URL = process.env.HS_TEST_DATABASE_URL;
  const pool = db.layPool();
  check('Postgres thật: trangThaiDb → OK', (await db.trangThaiDb()) === 'OK');
  // Chạy trên schema tạm để không đụng bảng thật của DB thử.
  const schema = `l0g_test_${process.pid}`;
  await pool.query(`CREATE SCHEMA ${schema}`);
  const c = await pool.connect();
  try {
    await c.query(`SET search_path TO ${schema}`);
    await dauCuoi('Postgres thật', c);
  } finally {
    await c.query('RESET search_path').catch(() => {});
    c.release();
    await pool.query(`DROP SCHEMA ${schema} CASCADE`);
    await db.dongPool();
    delete process.env.HS_DATABASE_URL;
  }
} else {
  console.log('SKIP Postgres thật: không có HS_TEST_DATABASE_URL (đầu-cuối đã chạy trên PGlite ở trên)');
}

// ── 8. Riêng tư: tệp dữ liệu QĐ 2079 không vào git ──
{
  const gi = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  check('.gitignore chặn data/private/', /^data\/private\/?$/m.test(gi));
  const r = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' });
  const lo = (r.stdout || '').split('\n').filter((f) => /2079/.test(f) && !/\.(m?js|md|sql)$/.test(f));
  check('git không track tệp dữ liệu nào tên chứa 2079', lo.length === 0, lo.join(','));
}

fs.rmSync(thuMucTam, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
