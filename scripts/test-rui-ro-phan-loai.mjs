import './test-isolate-data.mjs';
/**
 * L0g (#545) — tầng Postgres tối thiểu + Danh mục rủi ro phân loại QĐ 2079.
 * CEO đảo quyết định 30/10/2026: QĐ 2079 là văn bản nhà nước → CÔNG KHAI cho mọi người gọi (công khai, cong-oz, ERP);
 * vẫn chỉ là TÍN HIỆU rủi ro, không bao giờ là căn cứ pháp lý / GIR. Nguồn: bảng tĩnh data/rui-ro-phan-loai/qd-2079.json
 * (versioned) + Postgres tuỳ chọn. `MO_TA_GIONG_MA_KHAC` (đếm từ kho tờ khai Oz) vẫn chỉ nội bộ — laNoiBoOz giữ nguyên.
 *
 * Không mạng, không ghi data/ thật:
 *   - DB giả là đối tượng { query } ghi lại câu lệnh;
 *   - Postgres thật chạy TRONG TIẾN TRÌNH bằng PGlite (WASM) để kiểm migration SQL + bộ nạp + hàm đọc đầu-cuối;
 *   - HS_TEST_DATABASE_URL (tuỳ chọn) → chạy thêm trên Postgres thật qua `pg`; không có thì bỏ qua, có ghi lý do.
 * Dữ liệu QĐ 2079 ở đây là GIẢ (mã + tên bịa), ghi vào thư mục tạm (HS_DATA_DIR) — không bịa dữ liệu vào data/ thật.
 */
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { TEST_DATA_DIR } from './test-isolate-data.mjs';

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
// Tệp tĩnh không tồn tại — cô lập các ca chỉ-DB khỏi data/rui-ro-phan-loai/qd-2079.json thật (khi CEO thêm sau).
const KHONG_CO = path.join(os.tmpdir(), `khong-co-qd2079-${process.pid}.json`);

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

// ── 4. tinHieuDanhMuc — CÔNG KHAI từ 30/10 (không lọc quyền) ──
const rr = require('../lib/rui-ro-phan-loai.js');
const { tinHieuDanhMuc } = rr;
{
  for (const noiBo of [false, undefined, 'true', 1, true]) {
    const gia = dbGia(() => [{ ma_a: '392310', ma_b: '392690', ten_hang: TEN_BI_MAT }]);
    const out = await tinHieuDanhMuc('39269099', { noiBo, db: gia, file: KHONG_CO });
    check(`noiBo=${JSON.stringify(noiBo)} → vẫn trả tín hiệu (QĐ 2079 công khai, không lọc quyền)`, out.length === 1 && out[0].maLienQuan === '392310' && gia.calls.length === 1, JSON.stringify(out));
  }
  const out0 = await tinHieuDanhMuc('39269099', { file: KHONG_CO });
  check('không truyền db, không có HS_DATABASE_URL → [] và không tạo pool', Array.isArray(out0) && out0.length === 0 && db.layPool() === null);
}
{
  check('NHAN mới không còn NOI_BO: QD_2079_BAC_C', rr.NHAN === 'QD_2079_BAC_C');
  check('giữ bí danh nhãn cũ NHAN_CU = QD_2079_BAC_C_NOI_BO (tương thích ngược)', rr.NHAN_CU === 'QD_2079_BAC_C_NOI_BO');
  check('laNhanQd2079 nhận cả nhãn mới lẫn nhãn cũ, từ chối nhãn lạ', rr.laNhanQd2079('QD_2079_BAC_C') && rr.laNhanQd2079('QD_2079_BAC_C_NOI_BO') && !rr.laNhanQd2079('GIR-1') && !rr.laNhanQd2079(undefined));
  check('GHI_CHU không còn chữ "nội bộ", vẫn nói "không phải căn cứ pháp lý"', !/nội bộ/i.test(rr.GHI_CHU) && /không phải căn cứ pháp lý/.test(rr.GHI_CHU), rr.GHI_CHU);
}
{
  const gia = dbGia(() => [{ ma_a: '392310', ma_b: '392690', ten_hang: 'Hàng thử' }]);
  const out = await tinHieuDanhMuc('3926.90.99', { db: gia, file: KHONG_CO });
  check('DB trả 1 dòng → 1 mục', out.length === 1, JSON.stringify(out));
  const m = out[0] || {};
  check('mục: loai=DANH_MUC_RUI_RO, nhan=QD_2079_BAC_C, nguon=POSTGRES', m.loai === 'DANH_MUC_RUI_RO' && m.nhan === 'QD_2079_BAC_C' && m.nguon === 'POSTGRES', JSON.stringify(m));
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
  const out = await tinHieuDanhMuc('39269099', { db: gia, file: KHONG_CO });
  check('trùng cặp đảo chiều → gộp 1 mục, không có tenHang khi null', out.length === 1 && out[0].maLienQuan === '8544' && !('tenHang' in out[0]), JSON.stringify(out));
}
{
  check('db=null → [] không ném', (await tinHieuDanhMuc('39269099', { db: null, file: KHONG_CO })).length === 0);
  const hong = { async query() { throw new Error('connect ECONNREFUSED 10.0.0.9:5432 password=abc'); } };
  const logs = [];
  const sw = console.warn; console.warn = (...a) => logs.push(a.join(' '));
  let out;
  try { out = await tinHieuDanhMuc('39269099', { db: hong, file: KHONG_CO }); } finally { console.warn = sw; }
  check('DB lỗi → [] không ném', Array.isArray(out) && out.length === 0);
  check('DB lỗi → log không chép nguyên thông điệp lỗi (có thể chứa host/mật khẩu)', !logs.join(' ').includes('password=abc') && !logs.join(' ').includes('10.0.0.9'), logs.join(' | '));
  const gia = dbGia();
  for (const ma of ['', 'abc', '39', null, undefined, '3926909912345']) {
    await tinHieuDanhMuc(ma, { db: gia, file: KHONG_CO });
  }
  check('mã không hợp lệ (<4 hoặc >10 chữ số, rỗng) → không chạm DB', gia.calls.length === 0, gia.calls.length);
}

// ── 5. Bộ nạp: tệp có thể nằm trong git (bảng tĩnh công khai từ 30/10), chỉ in số đếm ──
const nap = require('../lib/nap-qd2079.js');
{
  const r = spawnSync(process.execPath, ['scripts/nap-qd2079.mjs', `--file=${KHONG_CO}`, '--dry-run'], { cwd: root, encoding: 'utf8', env: { ...process.env, HS_DATABASE_URL: '' } });
  check('CLI: tệp không tồn tại → exit ≠ 0, báo không tìm thấy tệp', r.status !== 0 && /không tìm thấy tệp/.test(r.stderr + r.stdout), (r.stderr + r.stdout).slice(0, 200));
  check('bộ nạp: không còn chặn tệp nằm trong git (kiemTepNgoaiGit đã gỡ)', !('kiemTepNgoaiGit' in nap));
  const d = nap.docVaKiem(Buffer.from(JSON.stringify({ nguon: 'QD-2079-TCHQ', danhSach: [{ maA: '3926', maB: '3923' }] })));
  check('docVaKiem nhận cả dạng { danhSach: [...] } (bảng tĩnh có meta)', d.doc === 1 && d.hopLe.length === 1 && d.hopLe[0].maA === '3926', JSON.stringify(d));
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
  const r = spawnSync(process.execPath, ['scripts/nap-qd2079.mjs', `--file=${tepGia}`, '--dry-run'], { cwd: root, encoding: 'utf8', env: { ...process.env, HS_DATABASE_URL: '' } });
  check('CLI --dry-run trên tệp giả → exit 0, in doc=3 hopLe=2, không in tên hàng', r.status === 0 && /doc=3/.test(r.stdout) && /hopLe=2/.test(r.stdout) && !(r.stdout + r.stderr).includes(TEN_BI_MAT), (r.stderr + r.stdout).slice(0, 200));
}

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

  const t1 = await tinHieuDanhMuc('39231090', { db: client, file: KHONG_CO });
  check(`${nhan}: tinHieuDanhMuc('39231090') → cặp 39269099`, t1.length === 1 && t1[0].maLienQuan === '39269099' && t1[0].tenHang === TEN_BI_MAT, JSON.stringify(t1));
  const t2 = await tinHieuDanhMuc('85444219', { db: client, file: KHONG_CO });
  check(`${nhan}: tinHieuDanhMuc('85444219') khớp tiền tố 6 số 854442 → 854449`, t2.length === 1 && t2[0].maLienQuan === '854449', JSON.stringify(t2));
  check(`${nhan}: mã không có trong danh mục → []`, (await tinHieuDanhMuc('01012100', { db: client, file: KHONG_CO })).length === 0);
  check(`${nhan}: noiBo=false vẫn trả tín hiệu (công khai từ 30/10)`, (await tinHieuDanhMuc('39231090', { noiBo: false, db: client, file: KHONG_CO })).length === 1);
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

// ── 8. Bảng tĩnh trong git: chỉ đúng một chỗ ──
{
  const gi = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  check('.gitignore vẫn chặn data/private/ (dữ liệu riêng khác)', /^data\/private\/?$/m.test(gi));
  const r = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' });
  const lo = (r.stdout || '').split('\n').filter((f) => /2079/.test(f) && !/\.(m?js|md|sql)$/.test(f) && f !== 'data/rui-ro-phan-loai/qd-2079.json');
  check('tệp dữ liệu QĐ 2079 trong git chỉ được ở data/rui-ro-phan-loai/qd-2079.json', lo.length === 0, lo.join(','));
  const N = require('../lib/nguon-loai.js');
  check('nguon-loai khai nhãn cho data/rui-ro-phan-loai/qd-2079.json', N.nhanCuaTep('data/rui-ro-phan-loai/qd-2079.json') === 'NGUYEN_VAN');
}

// ── 9. Bảng tĩnh data/rui-ro-phan-loai/qd-2079.json (tuỳ chọn, chỉ đọc) + endpoint công khai ──
{
  check('TEP_TINH = rui-ro-phan-loai/qd-2079.json', rr.TEP_TINH === 'rui-ro-phan-loai/qd-2079.json');
  const dir = path.join(TEST_DATA_DIR, 'rui-ro-phan-loai');
  fs.mkdirSync(dir, { recursive: true });
  const tep = path.join(dir, 'qd-2079.json');

  // Tệp rỗng [] + không DB → CHUA_CO_DU_LIEU (không bịa, không lỗi)
  fs.writeFileSync(tep, '[]');
  const st0 = await rr.trangThaiDanhMuc({ db: null });
  check('tệp tĩnh rỗng, không DB → CHUA_CO_DU_LIEU', st0.trangThai === 'CHUA_CO_DU_LIEU' && st0.soCapTepTinh === 0, JSON.stringify(st0));
  const st1 = await rr.trangThaiDanhMuc({ db: null, file: KHONG_CO });
  check('không có tệp tĩnh, không DB → CHUA_CO_DU_LIEU', st1.trangThai === 'CHUA_CO_DU_LIEU', JSON.stringify(st1));
  const dataset = require('../api/dataset.js');
  {
    const res = mkRes();
    await dataset({ method: 'GET', url: '/api/rui-ro-phan-loai', headers: {}, query: { resource: 'rui-ro-phan-loai', hs: '39231090' } }, res);
    check('endpoint công khai (không token) khi chưa có dữ liệu → 200, trangThai CHUA_CO_DU_LIEU, items []', res._s === 200 && res._j?.trangThai === 'CHUA_CO_DU_LIEU' && Array.isArray(res._j?.items) && res._j.items.length === 0, JSON.stringify([res._s, res._j]));
  }

  // Tệp có dữ liệu giả (mảng) → khớp tiền tố, nguon=TEP_TINH, tên hàng trả ra (công khai)
  fs.writeFileSync(tep, JSON.stringify([
    { maA: '3926.90.99', maB: '3923.10.90', tenHang: 'Túi nhựa giả lập' },
    { maA: '8544.42', maB: '8544.49' },
    { maA: '39A6', maB: '3923' },
  ]));
  const t = await tinHieuDanhMuc('39231090', { db: null });
  check('tệp tĩnh: 39231090 → cặp 39269099, nguon TEP_TINH, có tenHang', t.length === 1 && t[0].maLienQuan === '39269099' && t[0].nguon === 'TEP_TINH' && t[0].tenHang === 'Túi nhựa giả lập' && t[0].nhan === 'QD_2079_BAC_C', JSON.stringify(t));
  const t2 = await tinHieuDanhMuc('85444219', { db: null });
  check('tệp tĩnh: khớp tiền tố 6 số 854442 → 854449', t2.length === 1 && t2[0].maLienQuan === '854449', JSON.stringify(t2));
  const st2 = await rr.trangThaiDanhMuc({ db: null });
  check('tệp tĩnh có 2 cặp hợp lệ → CO_DU_LIEU, soCapTepTinh=2 (dòng sai bỏ qua)', st2.trangThai === 'CO_DU_LIEU' && st2.soCapTepTinh === 2, JSON.stringify(st2));

  // Tệp tĩnh + DB: gộp, không trùng maLienQuan
  const gia = dbGia(() => [{ ma_a: '39231090', ma_b: '39269099', ten_hang: null }, { ma_a: '39231090', ma_b: '4819', ten_hang: null }]);
  const t3 = await tinHieuDanhMuc('39231090', { db: gia });
  check('tệp tĩnh + Postgres: gộp, bỏ trùng (2 mục: 39269099 từ tệp, 4819 từ DB)', t3.length === 2 && t3[0].nguon === 'TEP_TINH' && t3.find((x) => x.maLienQuan === '4819')?.nguon === 'POSTGRES', JSON.stringify(t3));

  // Dạng { danhSach: [...] } qua opts.file
  const tepObj = path.join(dir, 'dang-object.json');
  fs.writeFileSync(tepObj, JSON.stringify({ nguon: 'QD-2079-TCHQ', danhSach: [{ maA: '0101', maB: '0102' }] }));
  check('tệp dạng { danhSach } đọc được', (await tinHieuDanhMuc('01012100', { db: null, file: tepObj })).length === 1);
  // Tệp hỏng → [] không ném
  const tepHong = path.join(dir, 'hong.json');
  fs.writeFileSync(tepHong, '{ khong phai json');
  const sw = console.warn; console.warn = () => {};
  let outHong;
  try { outHong = await tinHieuDanhMuc('39231090', { db: null, file: tepHong }); } finally { console.warn = sw; }
  check('tệp tĩnh hỏng → [] không ném', Array.isArray(outHong) && outHong.length === 0);

  // Endpoint công khai: cả hai tên resource, không token, không canCuPhapLy/GIR
  for (const resource of ['rui-ro-phan-loai', 'rui_ro_phan_loai']) {
    const res = mkRes();
    await dataset({ method: 'GET', url: '/api/rui-ro-phan-loai', headers: {}, query: { resource, hs: '3923.10.90' } }, res);
    const j = res._j || {};
    check(`endpoint ?resource=${resource} không token → 200 public-read`, res._s === 200 && res.headers['X-Access-Mode'] === 'public-read', JSON.stringify([res._s, res.headers]));
    check(`endpoint ${resource}: CO_TIN_HIEU, 1 mục, nhãn QD_2079_BAC_C, ghiChu không phải căn cứ`, j.trangThai === 'CO_TIN_HIEU' && j.items?.length === 1 && j.items[0].nhan === 'QD_2079_BAC_C' && /không phải căn cứ pháp lý/.test(j.ghiChu || ''), JSON.stringify(j));
    check(`endpoint ${resource}: không có canCuPhapLy / girRulesApplied ở bất kỳ đâu`, !/canCuPhapLy|girRulesApplied|GIR-/.test(JSON.stringify(j)), JSON.stringify(j));
  }
  {
    const res = mkRes();
    await dataset({ method: 'GET', url: '/api/rui-ro-phan-loai', headers: {}, query: { resource: 'rui_ro_phan_loai', hs: '39' } }, res);
    check('endpoint: hs sai (< 4 số) → 400', res._s === 400, JSON.stringify([res._s, res._j]));
  }
  {
    const res = mkRes();
    await dataset({ method: 'GET', url: '/api/rui-ro-phan-loai', headers: {}, query: { resource: 'rui_ro_phan_loai', hs: '01012100' } }, res);
    check('endpoint: có dữ liệu nhưng mã không có trong danh mục → KHONG_CO_TIN_HIEU', res._s === 200 && res._j?.trangThai === 'KHONG_CO_TIN_HIEU' && res._j.items.length === 0, JSON.stringify(res._j));
  }
  const { isPublicRead } = require('../lib/public-access.js');
  check('allowlist: dataset?resource=rui_ro_phan_loai mở công khai', isPublicRead({ endpoint: 'dataset', resource: 'rui_ro_phan_loai', method: 'GET' }) === true);
  const routes = JSON.parse(fs.readFileSync(path.join(root, 'routes.json'), 'utf8'));
  const flat = JSON.stringify(routes);
  check('routes.json: /api/rui-ro-phan-loai → dataset?resource=rui_ro_phan_loai', flat.includes('"/api/rui-ro-phan-loai"') && flat.includes('/api/dataset?resource=rui_ro_phan_loai'));
}

fs.rmSync(thuMucTam, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
