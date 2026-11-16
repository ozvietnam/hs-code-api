// scripts/test-kho-dap-an.mjs — Kho đáp án chế độ BÓNG (G5 PR 1a, OZV-1144; thiết kế OZV-760).
// Không mạng, không ghi data/ thật: Postgres chạy TRONG TIẾN TRÌNH bằng PGlite (như test-classify-cache.mjs).
// Kiểm: (1) tách khoa_dap_an / khoa_du_kien; (2) luật cấm ghi / cấm trúng đáp án; (3) bộ lọc riêng tư;
// (4) bóng bắt mâu thuẫn + trần 150 ms; (5) scripts/thong-ke-kho-dap-an.mjs --json chạy xanh; (6) migration idempotent.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
delete process.env.HS_DATABASE_URL;
delete process.env.HS_KHO_DAP_AN;

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};

const kho = require('../lib/kho-dap-an.js');
const { loadJson } = require('../lib/data-cache');
const { dataReadPath } = require('../lib/data-paths');
const tax = loadJson(dataReadPath('tax.json')) || {};
const ma8 = Object.keys(tax).filter((k) => /^\d{8}$/.test(k));
const MA_A = ma8.find((k) => k.startsWith('850151')) || ma8.find((k) => k.startsWith('8501')) || ma8[0];
const MA_B = ma8.find((k) => k.startsWith('8501') && k !== MA_A) || ma8.find((k) => k !== MA_A);

// ── 0. Công tắc ───────────────────────────────────────────────────────────────────────────────────────────────
check('cheDo: mặc định off', kho.cheDoKhoDapAn() === 'off');
process.env.HS_KHO_DAP_AN = 'on';
check('cheDo: "on" chưa có trong PR 1a ⇒ off', kho.cheDoKhoDapAn() === 'off');
process.env.HS_KHO_DAP_AN = 'Shadow';
check('cheDo: shadow', kho.cheDoKhoDapAn() === 'shadow');
delete process.env.HS_KHO_DAP_AN;
check('hanDocMs: mặc định 150', kho.hanDocMs() === 150);

// ── 1. Tách khoá ──────────────────────────────────────────────────────────────────────────────────────────────
const hangA = { tenHang: 'Động cơ điện xoay chiều', thuongHieu: 'Siemens', model: '1LE1', specs: '0,37 kW, 380V, 50Hz', chatLieu: 'thép', facts: [] };
const hangB = { ...hangA, specs: '7,5 kW, 380V, 50Hz' };
const sA = kho.locRiengTuKhoDapAn(hangA);
const sB = kho.locRiengTuKhoDapAn(hangB);
check('khoá: cùng tên + hãng, khác thông số ⇒ CÙNG khoa_du_kien', kho.khoaDuKien(sA) === kho.khoaDuKien(sB));
check('khoá: cùng tên + hãng, khác thông số (0,37 kW vs 7,5 kW) ⇒ KHÁC khoa_dap_an', kho.khoaDapAn(sA) !== kho.khoaDapAn(sB));
check('khoá: hex 64', /^[0-9a-f]{64}$/.test(kho.khoaDapAn(sA)) && /^[0-9a-f]{64}$/.test(kho.khoaDuKien(sA)));
const sA2 = kho.locRiengTuKhoDapAn({ ...hangA, tenHang: 'ĐỘNG CƠ  điện xoay chiều', specs: '0,37kW, 380 V, 50 Hz', congDung: '' });
check('khoá: khác hoa-thường / khoảng trắng / "0,37 kW"≡"0,37kW" ⇒ cùng khoa_dap_an', kho.khoaDapAn(sA) === kho.khoaDapAn(sA2));
const sA3 = kho.locRiengTuKhoDapAn({ ...hangA, tenHang: 'Động cơ điện xoay chiều invoice INV-2026-0012 10 thùng' });
check('khoá: số hoá đơn / số lượng không tách khoá (lọc trước khi băm)', kho.khoaDapAn(sA) === kho.khoaDapAn(sA3));
check('khoá: lệch tier ⇒ khác khoa_dap_an', kho.khoaDapAn(sA, 'standard') !== kho.khoaDapAn(sA, 'premium'));
const sF1 = kho.locRiengTuKhoDapAn({ ...hangA, facts: [{ key: 'phase', valueVi: '3 pha', evidence: 'ảnh nhãn khách' }] });
const sF2 = kho.locRiengTuKhoDapAn({ ...hangA, facts: [{ key: 'phase', valueVi: '1 pha' }] });
check('khoá: khác dữ kiện quyết định (facts) ⇒ khác khoa_dap_an', kho.khoaDapAn(sF1) !== kho.khoaDapAn(sF2) && kho.khoaDapAn(sF1) !== kho.khoaDapAn(sA));
const sV1 = kho.locRiengTuKhoDapAn({ ...hangA, voltage: '220V' });
const sV2 = kho.locRiengTuKhoDapAn({ ...hangA, voltage: '380V' });
check('khoá: thuộc tính chuẩn (voltage) vào duKienQuyetDinh ⇒ khác khoá', kho.khoaDapAn(sV1) !== kho.khoaDapAn(sV2) && sV1.duKienQuyetDinh.voltage === '220V');
check('khoaHangModel: "siemens|1le1"', kho.khoaHangModel(sA) === 'siemens|1le1');

// ── 2. Luật cấm ghi ───────────────────────────────────────────────────────────────────────────────────────────
const kqTot = { status: 'REVIEW', results: [{ hs: MA_A }], missing: [] };
check(`quyetDinhGhi: mã 8 số hợp lệ (${MA_A}), đủ dữ kiện ⇒ NHAP cấp 8`, (() => { const q = kho.quyetDinhGhi(kqTot); return q.ghi === 'NHAP' && q.maHs === MA_A && q.capDaChac === 8; })());
check('quyetDinhGhi: còn missing ⇒ NHAP cấp 6 (chỉ lưu 6 số)', (() => { const q = kho.quyetDinhGhi({ ...kqTot, missing: [{ attribute: 'x' }] }); return q.ghi === 'NHAP' && q.capDaChac === 6 && q.maHs === MA_A.slice(0, 6); })());
for (const st of ['NEED_FACTS', 'NEEDS_EXPERT', 'NO_CANDIDATES', 'QUA_GIO']) {
  check(`quyetDinhGhi: status ${st} ⇒ cấm ghi`, kho.quyetDinhGhi({ ...kqTot, status: st }).ghi === null);
}
check('quyetDinhGhi: degraded:true ⇒ cấm ghi', kho.quyetDinhGhi({ ...kqTot, degraded: true }).ghi === null);
check('quyetDinhGhi: lượt đã trả QUA_GIO cho khách (nguCanh.quaGio) ⇒ cấm ghi', kho.quyetDinhGhi(kqTot, { quaGio: true }).ghi === null);
check('quyetDinhGhi: mã không có trong biểu (99999999) ⇒ cấm ghi', kho.quyetDinhGhi({ ...kqTot, results: [{ hs: '99999999' }] }).ghi === null);
check('quyetDinhGhi: mã 4 số ⇒ cấm ghi', kho.quyetDinhGhi({ ...kqTot, results: [{ hs: MA_A.slice(0, 4) }] }).ghi === null);
check('quyetDinhGhi: NEED_FACTS + webHint có nguồn ⇒ CHI_DU_KIEN',
  kho.quyetDinhGhi({ status: 'NEED_FACTS', results: [], webHint: { nguon: [{ url: 'https://vd.example/sp' }], cauTraLoi: 'x' } }).ghi === 'CHI_DU_KIEN');
check('quyetDinhGhi: NEED_FACTS + webHint rỗng nguồn ⇒ cấm ghi', kho.quyetDinhGhi({ status: 'NEED_FACTS', webHint: { nguon: [] } }).ghi === null);

// ── 3. Bộ lọc riêng tư ────────────────────────────────────────────────────────────────────────────────────────
const chuoiBan = 'Động cơ điện 0,37 kW, 380V, 50Hz, DN50 tờ khai 105123456789 invoice INV-2026-0012 PO: 4500123 bill BL-778812 đơn giá 120 USD, 2.500.000 VND, 300 CNY, $45, 10 thùng, 2 kiện, 1 pallet, SL: 50';
const sach = kho.locChuoiHangHoa(chuoiBan);
check('lọc: giữ thông số kỹ thuật 0,37 kW, 380V, 50Hz, DN50', ['0,37 kW', '380V', '50Hz', 'DN50'].every((t) => sach.includes(t)), sach);
check('lọc: cắt số tờ khai 12 số', !/105123456789/.test(sach), sach);
check('lọc: cắt số tờ khai 11 số', !/\d{11}/.test(kho.locChuoiHangHoa('quạt 10512345678 220V')));
check('lọc: cắt invoice / PO / bill', !/INV-2026-0012|4500123|BL-778812/i.test(sach), sach);
check('lọc: cắt đơn giá USD / VND / CNY / $', !/120 USD|2\.500\.000|300 CNY|\$45/i.test(sach), sach);
check('lọc: cắt số lượng thùng / kiện / pallet / SL', !/10 thùng|2 kiện|1 pallet|SL: 50/i.test(sach), sach);
check('lọc: giữ kg / mm / ml / % / °C', (() => { const t = kho.locChuoiHangHoa('nồi 5 kg, 300 mm, 500 ml, 18%, 100°C, 1,5 HP, 10 A'); return ['5 kg', '300 mm', '500 ml', '18%', '100°C', '1,5 HP', '10 A'].every((x) => t.includes(x)); })());
check('lọc: giữ model có chữ số không nhãn chứng từ (1LE1, DN50)', kho.locChuoiHangHoa('model 1LE1 DN50') === 'model 1LE1 DN50');
{
  // Quy tắc 6b CLAUDE.md: regex chạy trên chữ khách ⇒ 1 ca ReDoS ~40.000 từ lặp phải < 2 giây.
  const dai = [`${'po so bl inv tờ khai giá '.repeat(5000)}`, `${'a'.repeat(40000)}`, `${'1'.repeat(40000)}`, `${'po-a1'.repeat(8000)}`];
  const t = Date.now();
  for (const x of dai) kho.locChuoiHangHoa(x);
  const ms = Date.now() - t;
  check(`lọc: ReDoS 4 chuỗi ~40.000 ký tự/từ lặp chạy ${ms} ms (< 2000)`, ms < 2000);
}
const loc = kho.locRiengTuKhoDapAn({
  tenHang: 'Bơm ly tâm HĐ 0001234 105123456789', luotId: 'L-1', orderCode: 'OD-99', directorNote: 'ghi chú GĐ',
  customerDescription: 'khách A', loaiToKhai: 'A11', manufacturer: 'Cty X', specs: { congSuat: '1,5 kW', dienAp: '220V' },
  facts: [{ key: 'impeller', valueVi: 'cánh hở', evidence: 'ảnh khách gửi', bangChung: 'nguyên văn khách' }],
});
const locJson = JSON.stringify(loc);
check('locRiengTu: không còn luotId/orderCode/directorNote/customerDescription/loaiToKhai/manufacturer',
  !/L-1|OD-99|ghi chú GĐ|khách A|A11|Cty X/.test(locJson), locJson);
check('locRiengTu: facts bỏ bằng chứng nguyên văn', !/ảnh khách gửi|nguyên văn khách/.test(locJson) && loc.facts[0].value === 'cánh hở');
check('locRiengTu: tên hàng cắt số tờ khai + số HĐ', loc.tenHang === 'Bơm ly tâm', loc.tenHang);
check('locRiengTu: specs object ⇒ chuỗi thông số giữ "1,5 kW" và "220V"', /1,5 kW/.test(loc.thongSo) && /220V/.test(loc.thongSo), loc.thongSo);

// ── 4. PGlite: migration + bóng ───────────────────────────────────────────────────────────────────────────────
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
check('migration: chạy 0003 lần đầu, lần 2 không chạy lại', r1.daChay.includes('0003_kho_dap_an.sql') && r2.daChay.length === 0, JSON.stringify({ r1: r1.daChay, r2: r2.daChay }));
const sqlMig = fs.readFileSync(path.join(migDir, '0003_kho_dap_an.sql'), 'utf8');
await db.query(sqlMig);
check('migration: chạy tay lần nữa vẫn không lỗi (IF NOT EXISTS)', true);
check('migration: không có DROP / ALTER / DELETE', !/\b(DROP|ALTER|DELETE|TRUNCATE)\b/i.test(sqlMig.replace(/--.*$/gm, '')));

const logs = [];
const ng = (extra = {}) => ({ tier: 'standard', phienBan: 'pb-test', soLuotLlm: 3, ghiLog: (l) => logs.push(l), ...extra });
const motDong = async (s, tier = 'standard') => (await db.query('SELECT * FROM kho_dap_an WHERE khoa_dap_an = $1', [kho.khoaDapAn(s, tier)])).rows[0];

const l1 = await kho.soiBong(hangA, kqTot, ng(), { db });
check('bóng: lần đầu ⇒ KHONG_TRUNG + ghi NHAP', l1.ketQua === 'KHONG_TRUNG' && l1.ghi === 'NHAP', JSON.stringify(l1));
const d1 = await motDong(sA);
check('bóng: dòng NHAP có mã + cấp 8 + phiên bản', d1 && d1.ma_hs === MA_A && d1.cap_da_chac === 8 && d1.trang_thai === 'NHAP' && d1.phien_ban_bieu === 'pb-test');
check('bóng: log không chứa tên hàng / thông số', !/Động cơ|Siemens|kW/.test(JSON.stringify(l1)));

const l2 = await kho.soiBong(hangA, kqTot, ng(), { db });
check('bóng: lặp đúng món, cùng mã ⇒ TRUNG_DAP_AN, mauThuan false', l2.ketQua === 'TRUNG_DAP_AN' && l2.mauThuan === false && l2.maKho === MA_A, JSON.stringify(l2));
check('bóng: bản NHAP không bao giờ "lẽ ra trả" (leRaTra false)', l2.leRaTra === false);
check('bóng: so_lan_gap = 2', (await motDong(sA)).so_lan_gap === 2);

const lB = await kho.soiBong(hangB, { ...kqTot, results: [{ hs: MA_B }] }, ng(), { db });
check('bóng: cùng tên khác thông số (7,5 kW) ⇒ chỉ TRUNG_DU_KIEN, KHÔNG trúng đáp án', lB.ketQua === 'TRUNG_DU_KIEN' && lB.maKho === undefined, JSON.stringify(lB));
const lP = await kho.soiBong(hangA, kqTot, ng({ tier: 'premium' }), { db });
check('bóng: lệch tier (premium) ⇒ KHÔNG trúng đáp án', lP.ketQua !== 'TRUNG_DAP_AN', JSON.stringify(lP));
const lNF = await kho.soiBong({ ...hangA, specs: '1,1 kW' }, { status: 'NEED_FACTS', results: [{ hs: MA_A }] }, ng(), { db });
check('bóng: NEED_FACTS ⇒ không ghi (khongGhiVi NEED_FACTS)', lNF.ghi === null && lNF.khongGhiVi === 'NEED_FACTS', JSON.stringify(lNF));
const lDg = await kho.soiBong({ ...hangA, specs: '2,2 kW' }, { ...kqTot, degraded: true }, ng(), { db });
check('bóng: degraded ⇒ không ghi', lDg.ghi === null && lDg.khongGhiVi === 'DEGRADED');
const lQG = await kho.soiBong({ ...hangA, specs: '3 kW' }, kqTot, ng({ quaGio: true }), { db });
check('bóng: lượt QUA_GIO ⇒ không ghi', lQG.ghi === null && lQG.khongGhiVi === 'QUA_GIO');

const lMT = await kho.soiBong(hangA, { ...kqTot, results: [{ hs: MA_B }] }, ng(), { db });
const dMT = await motDong(sA);
const mt = typeof dMT.mau_thuan === 'string' ? JSON.parse(dMT.mau_thuan) : dMT.mau_thuan;
check('bóng: cùng khoa_dap_an, động cơ ra mã khác ⇒ mauThuan true', lMT.ketQua === 'TRUNG_DAP_AN' && lMT.mauThuan === true && lMT.maDongCo === MA_B, JSON.stringify(lMT));
check('bóng: mâu thuẫn ⇒ mau_thuan[] có 1 mục + trạng thái CHO_CHAM, mã kho không bị đè', mt.length === 1 && mt[0].maHs === MA_B && dMT.trang_thai === 'CHO_CHAM' && dMT.ma_hs === MA_A, JSON.stringify(dMT));
check('bóng: mau_thuan không lưu luotId', !/luotId/.test(JSON.stringify(mt)));

const hangW = { tenHang: 'Đèn LED pha', thuongHieu: 'Rạng Đông', model: 'D-FL01', specs: '50W' };
const lW = await kho.soiBong(hangW, { status: 'NEED_FACTS', results: [], webHint: { nguon: [{ url: 'https://vd.example/den' }], cauTraLoi: 'đèn pha LED 50W' } }, ng(), { db });
const dW = await motDong(kho.locRiengTuKhoDapAn(hangW));
check('bóng: NEED_FACTS + web ⇒ ghi CHI_DU_KIEN, ma_hs NULL, du_kien có nguồn WEB',
  lW.ghi === 'CHI_DU_KIEN' && dW.trang_thai === 'CHI_DU_KIEN' && dW.ma_hs === null && JSON.stringify(dW.du_kien).includes('"WEB"'), JSON.stringify(dW));
const lW2 = await kho.soiBong(hangW, { status: 'REVIEW', results: [{ hs: MA_A }], missing: [] }, ng(), { db });
check('bóng: bản CHI_DU_KIEN (chưa có mã) ⇒ TRUNG_DU_KIEN, không phải TRUNG_DAP_AN', lW2.ketQua === 'TRUNG_DU_KIEN', JSON.stringify(lW2));
check('bóng: gặp lại có mã ⇒ CHI_DU_KIEN nâng lên NHAP', (await motDong(kho.locRiengTuKhoDapAn(hangW))).trang_thai === 'NHAP');

const dRieng = await motDong(kho.locRiengTuKhoDapAn({ ...hangA, tenHang: 'Động cơ điện xoay chiều tờ khai 105123456789 120 USD' }));
check('bóng: bảng không chứa số tờ khai / đơn giá (cùng khoá đã lọc với hangA)', dRieng && !/105123456789|USD/.test(JSON.stringify(dRieng)));

// Trần 150 ms: DB treo 1500 ms ⇒ soiBong trả QUA_HAN trong ~150 ms, không ghi.
const dbCham = { query: () => new Promise((r) => setTimeout(() => r({ rows: [] }), 1500)) };
const t0 = Date.now();
const lCham = await kho.soiBong(hangA, kqTot, ng(), { db: dbCham });
const msCham = Date.now() - t0;
check(`bóng: DB treo ⇒ QUA_HAN sau ${msCham} ms (< 600 ms), không ghi`, lCham.ketQua === 'QUA_HAN' && msCham < 600 && lCham.ghi === null, JSON.stringify(lCham));
const dbLoi = { query: async () => { throw Object.assign(new Error('econnrefused 10.0.0.1'), { code: 'ECONNREFUSED' }); } };
const lLoi = await kho.soiBong(hangA, kqTot, ng(), { db: dbLoi });
check('bóng: DB lỗi ⇒ LOI_DOC, không ném, log chỉ có mã lỗi', lLoi.ketQua === 'LOI_DOC' && !/10\.0\.0\.1/.test(JSON.stringify(lLoi)), JSON.stringify(lLoi));
const lKhongDb = await kho.soiBong(hangA, kqTot, ng(), { db: null });
check('bóng: không có DB ⇒ KHONG_CO_DB, không ném', lKhongDb.ketQua === 'KHONG_CO_DB');

// duocTraDapAn — 7 điều kiện (PR 1a chỉ đo).
const dongDuyet = { ma_hs: MA_A, trang_thai: 'DUYET', cap_da_chac: 8, tier: 'standard', phien_ban_bieu: 'pb' };
check('duocTraDapAn: DUYET + cấp 8 + cùng tier + cùng phiên bản ⇒ true', kho.duocTraDapAn(dongDuyet, { tier: 'standard', phienBan: 'pb' }));
check('duocTraDapAn: NHAP / cấp 6 / lệch tier / đổi phiên bản / quá hạn / debug ⇒ false', [
  kho.duocTraDapAn({ ...dongDuyet, trang_thai: 'NHAP' }, { phienBan: 'pb' }),
  kho.duocTraDapAn({ ...dongDuyet, cap_da_chac: 6 }, { phienBan: 'pb' }),
  kho.duocTraDapAn(dongDuyet, { tier: 'premium', phienBan: 'pb' }),
  kho.duocTraDapAn(dongDuyet, { phienBan: 'pb2' }),
  kho.duocTraDapAn({ ...dongDuyet, han_xem_lai: '2000-01-01T00:00:00Z' }, { phienBan: 'pb' }),
  kho.duocTraDapAn(dongDuyet, { phienBan: 'pb', debug: true }),
].every((x) => x === false));

// ── 5. Công cụ đo ─────────────────────────────────────────────────────────────────────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kho-dap-an-'));
const tepLog = path.join(tmp, 'log.jsonl');
fs.writeFileSync(tepLog, ['khong phai json', '{"type":"b1b_web","coGoiWeb":true}', ...logs.map((l) => `hs-api | ${JSON.stringify(l)}`)].join('\n'));
const envCon = { ...process.env };
delete envCon.HS_DATABASE_URL;
const chay = spawnSync(process.execPath, [path.join(root, 'scripts', 'thong-ke-kho-dap-an.mjs'), '--days=7', '--json', `--file=${tepLog}`], { encoding: 'utf8', env: envCon });
let tk = null;
try { tk = JSON.parse(chay.stdout); } catch { /* để check báo */ }
const docDuoc = logs.filter((l) => ['TRUNG_DAP_AN', 'TRUNG_DU_KIEN', 'KHONG_TRUNG'].includes(l.ketQua));
const trungDA = docDuoc.filter((l) => l.ketQua === 'TRUNG_DAP_AN');
check('thong-ke --json --file: thoát 0, JSON hợp lệ', chay.status === 0 && tk, chay.stderr);
check('thong-ke: đủ 5 số đo', tk && ['tyLeTrungDapAn', 'tyLeTrungDuKien', 'tyLeMauThuan', 'k3GhepNham', 'tbLuotLlm'].every((k) => k in tk.soDo));
check('thong-ke: tỉ lệ trúng đáp án / mâu thuẫn khớp log', tk
  && Math.abs(tk.soDo.tyLeTrungDapAn - trungDA.length / docDuoc.length) < 1e-3
  && Math.abs(tk.soDo.tyLeMauThuan - trungDA.filter((l) => l.mauThuan).length / trungDA.length) < 1e-3, JSON.stringify(tk?.soDo));
check('thong-ke: đếm QUA_HAN / LOI_DOC', tk && tk.quaHan === 1 && tk.loiDoc === 1, JSON.stringify({ q: tk?.quaHan, l: tk?.loiDoc }));
check('thong-ke: TB lượt LLM = 3', tk && tk.soDo.tbLuotLlm === 3);
const chayRong = spawnSync(process.execPath, [path.join(root, 'scripts', 'thong-ke-kho-dap-an.mjs'), '--json'], { encoding: 'utf8', input: '', env: envCon });
let tkRong = null;
try { tkRong = JSON.parse(chayRong.stdout); } catch { /* để check báo */ }
check('thong-ke: không có dữ liệu ⇒ thoát 0, tỉ lệ null (không bịa số)', chayRong.status === 0 && tkRong && tkRong.tongLuot === 0 && tkRong.soDo.tyLeTrungDapAn === null, chayRong.stdout + chayRong.stderr);
fs.rmSync(tmp, { recursive: true, force: true });

// ── 6. Gắn vào api/classify.js: chỉ khi shadow, bỏ debug/holdout, không await ─────────────────────────────────
const nguonApi = fs.readFileSync(path.join(root, 'api', 'classify.js'), 'utf8');
check('api/classify.js: bóng chỉ bật khi cheDoKhoDapAn()==="shadow" và không debug/holdout',
  /cheDoKhoDapAn\(\) === 'shadow' && !debug && !wantsEvalHoldout\(req\)/.test(nguonApi));
check('api/classify.js: soiBong không bị await (fire-and-forget)', /soiBong\(/.test(nguonApi) && !/await\s+soiBong\(/.test(nguonApi));
check('api/classify.js: không có nhánh HS_KHO_DAP_AN=on', !/=== 'on'/.test(nguonApi.split('soiBong')[0].slice(-2000)));

await pgl.close();
console.log(`\n${pass}/${pass + fail} passed, ${fail} failed`);
if (fail) process.exit(1);
