// scripts/test-kho-dinh-danh.mjs — Kho định danh PR1a/PR1b (OZV-2024 / OZV-2026):
// chuẩn hoá + cờ off + migration 0004 + soiBong (shadow không đổi frame) + nối identify.
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

// Hồi quy: ma/pn là phần model thật — không cắt khi thiếu phân cách (soat-khac PR #1678).
const max485 = kho.chuanHoaModel('MAX485CPA');
check('model: MAX485CPA không cắt ma → rutGon max485cpa', max485 && max485.chuan === 'MAX485CPA' && max485.rutGon === 'max485cpa');
const ma1000 = kho.chuanHoaModel('MA-1000');
check('model: MA-1000 giữ nguyên (không cắt ma-)', ma1000 && ma1000.chuan === 'MA-1000' && ma1000.rutGon === 'ma1000');
const pn532 = kho.chuanHoaModel('PN532A');
check('model: PN532A giữ nguyên (không cắt pn)', pn532 && pn532.chuan === 'PN532A' && pn532.rutGon === 'pn532a');
const maLabel = kho.chuanHoaModel('ma: FR-D720-0.75K');
check('model: cắt nhãn ma: có phân cách', maLabel && maLabel.rutGon === 'frd720075k');
const pnLabel = kho.chuanHoaModel('pn FR-D720-0.75K');
check('model: cắt nhãn pn + khoảng trắng', pnLabel && pnLabel.rutGon === 'frd720075k');
const pnSlash = kho.chuanHoaModel('p/n FR-D720-0.75K');
check('model: cắt nhãn p/n', pnSlash && pnSlash.rutGon === 'frd720075k');

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

// ── 5. bang-co + dau-noi ──────────────────────────────────────────────────────────────────────────────────────
{
  const bang = JSON.parse(fs.readFileSync(path.join(root, 'data', 'luat', 'bang-co.json'), 'utf8'));
  const list = bang.co || [];
  const entry = list.find((c) => c.ten === 'HS_KHO_DINH_DANH');
  check('bang-co: có HS_KHO_DINH_DANH', !!entry);
  check('bang-co: mặc định off', entry && entry.macDinh === 'off' && entry.macDinhBat === false);
  check('bang-co: cheDo gồm off/shadow/on', entry && Array.isArray(entry.cheDo) && entry.cheDo.includes('off') && entry.cheDo.includes('shadow') && entry.cheDo.includes('on'));
  check('bang-co: có khối bong (shadow)', entry && entry.bong && typeof entry.bong === 'object');
  check('bang-co: bong.the = OZV-2026 (PR1b)', entry && entry.bong && entry.bong.the === 'OZV-2026');
  check('bang-co: máy thật chưa chạy bóng', entry && entry.bong && entry.bong.dangChayMayThat === false);

  const dauNoi = JSON.parse(fs.readFileSync(path.join(root, 'data', 'luat', 'dau-noi.json'), 'utf8'));
  const idPath = (dauNoi.duong || []).find((d) => d.duong === '/api/identify');
  check('dau-noi: /api/identify ghi đọc kho sau HS_KHO_DINH_DANH', idPath && typeof idPath.ghiChu === 'string' && idPath.ghiChu.includes('HS_KHO_DINH_DANH'));
}

// ── 6. soiBong / chayBongNeuCan (PR1b) ────────────────────────────────────────────────────────────────────────
{
  delete process.env.HS_KHO_DINH_DANH;
  const logs = [];
  const r = await kho.soiBong(
    { thuongHieu: 'Mitsubishi', model: 'FR-D720-0.75K' },
    { frame: { chuong: '85', model: 'FR-D720-0.75K', thuongHieu: 'Mitsubishi' } },
    { ghiLog: (l) => logs.push(l) },
  );
  check('soiBong: cờ off → ketQua OFF, không chuẩn hoá', r.ketQua === 'OFF' && logs.length === 1 && !logs[0].hangChuan);
  check('chayBongNeuCan: off → null (no-op)', kho.chayBongNeuCan({ thuongHieu: 'X', model: 'ABCD1234' }, {}) === null);
}
{
  process.env.HS_KHO_DINH_DANH = 'shadow';
  const ketQua = { frame: { chuong: '85', model: 'FR-D720-0.75K', thuongHieu: 'Mitsubishi Electric' }, xacMinh: { muc: 'HYPOTHESIS' } };
  const snap = JSON.stringify(ketQua);
  const logs = [];
  const r = await kho.soiBong(
    { thuongHieu: 'Mitsubishi Electric Corp.', model: 'FR-D720-0.75K' },
    ketQua,
    { ghiLog: (l) => logs.push(l) },
  );
  check('soiBong shadow: type + TRUOT_KHO (stub docKho)', r.type === 'kho_dinh_danh' && r.ketQua === 'TRUOT_KHO' && r.cheDo === 'shadow');
  check('soiBong shadow: chuẩn hoá hang+model', r.hangChuan === 'mitsubishi' && r.modelRutGon === 'frd720075k');
  check('soiBong shadow: có msTraKho số', typeof r.msTraKho === 'number' && r.msTraKho >= 0);
  check('soiBong shadow: KHÔNG đổi frame khách', JSON.stringify(ketQua) === snap);
  check('soiBong shadow: frameKhach giữ chuong/model/thuongHieu', r.frameKhach?.chuong === '85' && r.frameKhach?.model === 'FR-D720-0.75K');
  const logs2 = [];
  const p = kho.chayBongNeuCan(
    { thuongHieu: 'Siemens', model: '6ES7214-1AG40-0XB0' },
    { frame: { chuong: '85' } },
    { awaitKhoBong: true, ghiLog: (l) => logs2.push(l) },
  );
  check('chayBongNeuCan shadow: trả Promise', p && typeof p.then === 'function');
  const r2 = await p;
  check('chayBongNeuCan shadow: log TRUOT_KHO', r2 && r2.ketQua === 'TRUOT_KHO' && logs2.length === 1);
  delete process.env.HS_KHO_DINH_DANH;
}
{
  process.env.HS_KHO_DINH_DANH = 'shadow';
  const r = await kho.soiBong({ thuongHieu: 'X', model: 'AB' }, {}, { ghiLog: () => {} });
  check('soiBong shadow: thiếu khoá model → THIEU_KHOA', r.ketQua === 'THIEU_KHOA');
  delete process.env.HS_KHO_DINH_DANH;
}

// ── 7. Nối identify: off = không gọi bóng; shadow = log, frame khách không đổi ────────────────────────────────
{
  const llmTier = require('../lib/llm-tier.js');
  const orig = llmTier.callLLMJson;
  llmTier.callLLMJson = async () => ({
    json: {
      chuong: '84',
      model: 'FR-D720-0.75K',
      thuongHieu: 'Mitsubishi',
      truong: {
        machineFunction: 'biến tần',
        power: '0,75 kW',
        nguyenLyHoatDong: 'biến đổi tần số điện',
        chucNangChinh: 'điều khiển động cơ',
      },
      nguon: [],
    },
    provider: 'stub',
    model: 'stub',
  });
  const { identify } = require('../lib/identify.js');
  const fetchOk = async () => ({ ok: true, status: 200, arrayBuffer: async () => Buffer.from('FR-D720') });

  delete process.env.HS_KHO_DINH_DANH;
  const logsOff = [];
  const rOff = await identify(
    { tenHang: 'biến tần Mitsubishi FR-D720-0.75K', model: 'FR-D720-0.75K', thuongHieu: 'Mitsubishi' },
    { fetchImpl: fetchOk, timWeb: async () => null, khoBong: { awaitKhoBong: true, ghiLog: (l) => logsOff.push(l) } },
  );
  check('identify off: không ghi log bóng', logsOff.length === 0);
  check('identify off: có frame chương', rOff.frame?.chuong === '84');
  const snapOff = JSON.stringify({ chuong: rOff.frame?.chuong, model: rOff.frame?.model, thuongHieu: rOff.frame?.thuongHieu });

  process.env.HS_KHO_DINH_DANH = 'shadow';
  const logsSh = [];
  const rSh = await identify(
    { tenHang: 'biến tần Mitsubishi FR-D720-0.75K', model: 'FR-D720-0.75K', thuongHieu: 'Mitsubishi' },
    { fetchImpl: fetchOk, timWeb: async () => null, khoBong: { awaitKhoBong: true, ghiLog: (l) => logsSh.push(l) } },
  );
  const snapSh = JSON.stringify({ chuong: rSh.frame?.chuong, model: rSh.frame?.model, thuongHieu: rSh.frame?.thuongHieu });
  check('identify shadow: có log bóng TRUOT_KHO', logsSh.length === 1 && logsSh[0].type === 'kho_dinh_danh' && logsSh[0].ketQua === 'TRUOT_KHO');
  check('identify shadow: frame khách = off (không đổi vì kho)', snapSh === snapOff);
  check('identify shadow: phản hồi không gắn field kho vào khách', rSh.khoDinhDanh == null && rSh.kho_dinh_danh == null);

  // Nguồn: lib/identify.js phải gọi chayBongNeuCan
  const srcId = fs.readFileSync(path.join(root, 'lib', 'identify.js'), 'utf8');
  check('identify.js: import chayBongNeuCan', /chayBongNeuCan/.test(srcId) && /kho-dinh-danh/.test(srcId));

  llmTier.callLLMJson = orig;
  delete process.env.HS_KHO_DINH_DANH;
}

console.log(`\n${pass} passed | ${fail} failed`);
process.exit(fail ? 1 : 0);
