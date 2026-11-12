// OZV-507 việc 1 — cache kết quả /api/classify theo hash hồ sơ (Postgres kín, chỉ khoá dịch vụ).
// Bước 0 đã đo: 13,6% lượt trùng hồ sơ ≥ ngưỡng 10% (OZV-511) ⇒ được làm cache.
// Không mạng (LLM giả lập như test-classify-erp.mjs), không ghi data/ thật:
//   - DB giả ghi lại câu lệnh; Postgres thật chạy TRONG TIẾN TRÌNH bằng PGlite (như test-rui-ro-phan-loai.mjs).
// Kiểm: (1) khoá chuẩn hoá ổn định + phân biệt đủ ngữ cảnh; (2) migration SQL; (3) doc/ghi/xoá theo phiên bản;
// (4) đầu-cuối handler — COLD PATH DELTA 0 trên 3 món thật (kẹp giấy, quạt thông gió, dao hái cau — như OZV-502),
// lượt trúng trả nguyên phản hồi + cached:true và KHÔNG gọi LLM; lượt công khai / debug / holdout không đụng DB.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

process.env.HS_API_TOKEN = 'cache-test-token';
process.env.HS_SERVICE_TOKENS = 'cong-oz:khoa-cong,erp:khoa-erp';
process.env.HS_CLASSIFY_CROSSCHECK = '0';
process.env.HS_ACCESS_LOG = '0';
delete process.env.HS_DATABASE_URL; // handler chỉ đụng DB qua ganDbChoTest bên dưới

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};

// ── 1. Khoá: chuẩn hoá ổn định + phân biệt ngữ cảnh ────────────────────────────────────────────────────────────
const cc = require('../lib/classify-cache.js');

check('khongDau: ĐỒ/đồng, dấu, HOA-thường, khoảng trắng ⇒ như nhau',
  cc.khongDau('  ĐỒng   HỒ ĐếN Giờ ') === 'dong ho den gio' && cc.khongDau('đồng hồ đến giờ') === 'dong ho den gio',
  JSON.stringify([cc.khongDau('  ĐỒng   HỒ ĐếN Giờ '), cc.khongDau('đồng hồ đến giờ')]));

const hoSoA = { tenHang: 'Kẹp Giấy Bấm', chatLieu: 'Thép Không Gỉ', congDung: 'kẹp tài liệu', facts: [] };
const hoSoB = { tenHang: 'kẹp giấy bấm', chatLieu: 'thép không gỉ', congDung: 'KẸP   tài liệu', facts: [] }; // khác dấu/hoa/thừa khoảng trắng
const kA = cc.khoaCache(hoSoA, {}, { tier: 'standard', kenhGoi: 'cong-oz', noiBo: false });
const kB = cc.khoaCache(hoSoB, {}, { tier: 'standard', kenhGoi: 'cong-oz', noiBo: false });
check('khoaCache: hồ sơ khác dấu/hoa/khoảng trắng ⇒ CÙNG khoá', kA === kB, `${kA} vs ${kB}`);
check('khoaCache: khoá là hex 64', /^[0-9a-f]{64}$/.test(kA));

const khac = (ten, a, b) => cc.khoaCache(a, b || {}, { tier: 'standard', kenhGoi: 'cong-oz', noiBo: false }) !== kA;
check('khoaCache: đổi tenHang ⇒ KHÁC khoá', khac('tenHang', { ...hoSoA, tenHang: 'Dao hái cau' }));
check('khoaCache: đổi chatLieu ⇒ KHÁC khoá', khac('chatLieu', { ...hoSoA, chatLieu: 'nhựa' }));
check('khoaCache: đổi congDung ⇒ KHÁC khoá', khac('congDung', { ...hoSoA, congDung: 'cắt cây' }));
check('khoaCache: đổi tier (premium) ⇒ KHÁC khoá', cc.khoaCache(hoSoA, {}, { tier: 'premium', kenhGoi: 'cong-oz', noiBo: false }) !== kA);
check('khoaCache: đổi kenhGoi ⇒ KHÁC khoá', cc.khoaCache(hoSoA, {}, { tier: 'standard', kenhGoi: 'erp', noiBo: false }) !== kA);
check('khoaCache: đổi noiBo ⇒ KHÁC khoá', cc.khoaCache(hoSoA, {}, { tier: 'standard', kenhGoi: 'cong-oz', noiBo: true }) !== kA);
check('khoaCache: đổi supplierHs ⇒ KHÁC khoá', khac('supplierHs', { ...hoSoA, supplierHs: { code: '8305419000' } }));
check('khoaCache: thêm attributes ⇒ KHÁC khoá', khac('attributes', { ...hoSoA, voltage: '220V' }));
check('khoaCache: trường RỖNG như trường vắng (cùng khoá)', cc.khoaCache({ ...hoSoA, chucNang: '' }, {}, { tier: 'standard', kenhGoi: 'cong-oz', noiBo: false }) === kA);

// Bài học suggest-cache: facts PHẢI nằm trong khoá nhưng cùng BỘ facts (khác thứ tự) ⇒ cùng khoá
const f1 = { ...hoSoA, facts: [{ key: 'vatLieu', valueVi: 'thép' }, { key: 'kichThuoc', valueVi: '19mm' }] };
const f2 = { ...hoSoA, facts: [{ key: 'kichThuoc', valueVi: '19MM' }, { key: 'vatLieu', valueVi: 'Thép' }] };
check('khoaCache: cùng bộ facts khác THỨ TỰ + hoa-thường ⇒ cùng khoá', cc.khoaCache(f1, {}, { tier: 'standard', kenhGoi: 'cong-oz', noiBo: false }) === cc.khoaCache(f2, {}, { tier: 'standard', kenhGoi: 'cong-oz', noiBo: false }));
check('khoaCache: thêm fact ⇒ KHÁC khoá (không trả lại câu hỏi cũ)', khac('facts', { ...hoSoA, facts: [{ key: 'vatLieu', valueVi: 'thép' }] }));
// Trường hồ sơ khai báo (attrsHoSo) cũng đổi kết quả ganHoSoClassify ⇒ phải đổi khoá
check('khoaCache: đổi manufacturer (attrsHoSo) ⇒ KHÁC khoá', cc.khoaCache(hoSoA, { manufacturer: 'ACME' }, { tier: 'standard', kenhGoi: 'cong-oz', noiBo: false }) !== kA);
check('khoaCache: không đột biến attrs đầu vào (facts còn nguyên)', f1.facts.length === 2 && f1.facts[0].key === 'vatLieu');
check('phienBanDuLieu(): trả chuỗi (từ data/versions, tệp thiếu ⇒ mạc định)', typeof cc.phienBanDuLieu() === 'string' && cc.phienBanDuLieu().length > 0, cc.phienBanDuLieu());

// ── 2. DB giả: đúng tham số, không ném khi lỗi ────────────────────────────────────────────────────────────────
{
  const calls = [];
  const dbGia = { async query(sql, params) { calls.push({ sql: String(sql), params }); return { rows: [] }; } };
  const dbVang = { async query() { throw Object.assign(new Error('ket noi xau'), { code: 'ECONNREFUSED' }); } };

  const r1 = await cc.docCache(kA, 'v1', { db: dbGia });
  check('docCache: SELECT theo khoa + phien_ban, trả null khi rỗng', r1 === null && /SELECT phan_hoi FROM classify_cache WHERE khoa = \$1 AND phien_ban = \$2/.test(calls[0].sql) && calls[0].params[0] === kA && calls[0].params[1] === 'v1', JSON.stringify(calls[0]));
  const okGhi = await cc.ghiCache(kA, 'v1', { results: [] }, { db: dbGia });
  const lenGhi = await cc.ghiCache(kA, 'v1', null, { db: dbGia }); // giá trị rác ⇒ không ghi
  check('ghiCache: upsert ON CONFLICT (khoa), $3::jsonb', okGhi === true && /ON CONFLICT \(khoa\) DO UPDATE/.test(calls[1].sql) && calls[1].params[2] === '{"results":[]}', calls[1]?.sql);
  check('ghiCache: giá trị không phải object ⇒ bỏ qua', lenGhi === false && calls.length === 2);
  check('docCache/ghiCache/xoaTheoPhienBan: DB lỗi ⇒ không ném, coi như miss',
    (await cc.docCache(kA, 'v1', { db: dbVang })) === null && (await cc.ghiCache(kA, 'v1', { a: 1 }, { db: dbVang })) === false && (await cc.xoaTheoPhienBan('v1', { db: dbVang })) === 0);
  process.env.HS_CLASSIFY_CACHE = 'false';
  const nTruocTat = calls.length;
  const rTat = await cc.docCache(kA, 'v1', { db: dbGia });
  process.env.HS_CLASSIFY_CACHE = 'on';
  check('HS_CLASSIFY_CACHE=false ⇒ docCache không đụng DB, trả null', rTat === null && calls.length === nTruocTat);
  // Không log nội dung hồ sơ: tham số SQL chỉ có hash + phiên bản + JSON phản hồi — không chuỗi hồ sơ rời
  check('SQL/param không chứa nội dung hồ sơ gốc (chỉ hash + phiên bản)', !JSON.stringify(calls.map((c) => c.params)).includes('Kẹp Giấy Bấm'));
}

// ── 3. PGlite: migration + doc/ghi/xoá theo phiên bản ─────────────────────────────────────────────────────────
const { PGlite } = await import('@electric-sql/pglite');
const pgl = new PGlite();
const pglite = {
  async query(sql, params) {
    if (params && params.length) return pgl.query(sql, params);
    const rs = await pgl.exec(sql);
    return rs[rs.length - 1] || { rows: [] };
  },
};
const { chayMigration } = require('../lib/db-migrate.js');
const migDir = path.join(root, 'db', 'migrations');
{
  const r1 = await chayMigration(pglite, { thuMuc: migDir });
  const r2 = await chayMigration(pglite, { thuMuc: migDir });
  check('PGlite: migration chạy 0002 lần đầu, lần 2 không chạy lại (idempotent)', r1.daChay.includes('0002_classify_cache.sql') && r2.daChay.length === 0, JSON.stringify({ r1: r1.daChay, r2: r2.daChay }));
}
{
  await cc.ghiCache(kA, 'v1', { results: [{ hs: '84717020' }], status: 'REVIEW' }, { db: pglite });
  const tram = await cc.docCache(kA, 'v1', { db: pglite });
  check('PGlite: ghi rồi đọc ra nguyên phản hồi (jsonb)', tram && tram.status === 'REVIEW' && tram.results[0].hs === '84717020', JSON.stringify(tram));
  check('PGlite: đọc PHIÊN BẢN KHÁC ⇒ miss', (await cc.docCache(kA, 'v2', { db: pglite })) === null);
  await cc.ghiCache(kA, 'v2', { status: 'OK2' }, { db: pglite }); // upsert đè
  const tram2 = await cc.docCache(kA, 'v2', { db: pglite });
  check('PGlite: upsert cùng khoá đè phiên bản cũ', tram2 && tram2.status === 'OK2' && (await cc.docCache(kA, 'v1', { db: pglite })) === null);
  // Hồ sơ KHÁC hẳn (đổi tên hàng) cho dòng thứ hai — kB trùng khoá kA ở trên là đúng thiết kế (cùng hồ sơ chuẩn hoá)
  const kDao = cc.khoaCache({ ...hoSoA, tenHang: 'Dao hái cau' }, {}, { tier: 'standard', kenhGoi: 'cong-oz', noiBo: false });
  await cc.ghiCache(kDao, 'v0-cu', { status: 'CU' }, { db: pglite });
  const nDon = await cc.xoaTheoPhienBan('v2', { db: pglite });
  const conLai = await pglite.query('SELECT khoa, phien_ban FROM classify_cache ORDER BY khoa');
  check('PGlite: dọn theo phiên bản — xoá dòng phiên bản khác, giữ phiên bản hiện tại', nDon === 1 && conLai.rows.length === 1 && conLai.rows[0].phien_ban === 'v2', JSON.stringify(conLai.rows));
}

// ── 4. Đầu-cuối handler: cold path delta 0 + hit không gọi LLM + phận sự ──────────────────────────────────────
// LLM giả lập như test-classify-erp.mjs; trả lời THEO MÓN để cùng hồ sơ ⇒ cùng phản hồi, khác hồ sơ ⇒ khác kết quả.
const MON = [
  { key: 'kep-giay', body: { tenHang: 'Kẹp giấy bấm tài liệu văn phòng', chatLieu: 'thép', congDung: 'kẹp giữ giấy tờ trên bàn làm việc' }, headings: ['8471', '8523'], gir: { results: [{ hs: '84717020', confidence: 85, reason: 'Kẹp giấy văn phòng bằng kim loại thông thường.', gir: null }], missing: [] } },
  { key: 'quat-thong-gio', body: { tenHang: 'Quạt thông gió gắn tường công suất nhỏ', chatLieu: 'nhựa ABS', congDung: 'thông gió làm mát phòng' }, headings: ['2202', '2201'], gir: { results: [{ hs: '22021030', confidence: 85, reason: 'Quạt thông gió dùng trong hộ gia đình.', gir: null }], missing: [] } },
  { key: 'dao-hai-cau', body: { tenHang: 'Dao hái cau lưỡi thép cán dài', chatLieu: 'thép không gỉ', congDung: 'cắt cuống, hái quả trên cao' }, headings: ['8471', '8523'], gir: { results: [{ hs: '84717020', confidence: 70, reason: 'Dao cầm tay cho nghề nông.', gir: null }], missing: [] } },
];
let girHienTai = null;
const prompts = [];
const llmTier = require('../lib/llm-tier');
llmTier.callLLMJson = async (system, user) => {
  prompts.push({ system: String(system).slice(0, 40), user });
  const mon = MON.find((m) => m.gir === girHienTai) || MON[0];
  if (String(system).includes('mã HS 4 số')) return { json: { headings: mon.headings }, provider: 'stub', model: 'stub' };
  if (String(system).includes('DỮ KIỆN HÀNG HÓA')) return { json: { tenHangVi: mon.body.tenHang, banChat: mon.body.congDung }, provider: 'stub', model: 'stub' };
  return { json: girHienTai, provider: 'stub', model: 'stub' };
};
console.error = () => {};
console.warn = () => {};

const handler = require('../api/classify.js');
async function goi(body, { token = 'khoa-cong', headers = {} } = {}) {
  const res = { _s: 0, _j: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
  await handler({ method: 'POST', url: '/api/classify', query: {}, headers: { authorization: token ? `Bearer ${token}` : '', ...headers }, body }, res);
  return { status: res._s, json: res._j || {} };
}
// DB thật trong tiến trình (PGlite đã migration) + ghi lại mọi câu lệnh để đếm lượt đụng cache.
const callsDb = [];
const dbThu = { async query(sql, params) { callsDb.push(String(sql)); return pglite.query(sql, params); } };

// Xoá bảng cho sạch giữa các pha
await pglite.query('DELETE FROM classify_cache');

// (a) Cold path delta 0 trên 3 món thật: cache BẬT (bảng rỗng, không trúng) vs cache TẮT — phản hồi phải như nhau.
// Bỏ đúng các trường THỜI GIAN chạy (ms, *Ms, llmTungVong) — thay đổi theo lượt là bình thường; mọi trường khác giữ nguyên.
const boSoSanh = (v) => {
  if (Array.isArray(v)) return v.map(boSoSanh);
  if (v && typeof v === 'object') {
    const out = {};
    // jsonb (Postgres) chuẩn hoá THỨ TỰ KHOÁ khi lưu ⇒ so sánh phải sắp khoá đệ quy,
    // bỏ đúng các trường thời gian (ms, *Ms, llmTungVong) đổi theo từng lượt chạy.
    for (const k of Object.keys(v).sort()) {
      if (k === 'ms' || k === 'llmTungVong' || /Ms$/.test(k)) continue;
      out[k] = boSoSanh(v[k]);
    }
    return out;
  }
  return v;
};
const coldJson = {};
for (const mon of MON) {
  girHienTai = mon.gir;
  cc.ganDbChoTest(null); // cache TẮT (không DB) — đường chạy như trước khi có cache
  const tat = await goi(mon.body);
  cc.ganDbChoTest(dbThu);
  const cold = await goi(mon.body); // cache BẬT, bảng rỗng ⇒ lượt cold
  coldJson[mon.key] = cold.json;
  const a = boSoSanh(tat.json);
  const b = boSoSanh(cold.json);
  const giong = JSON.stringify(a) === JSON.stringify(b);
  check(`cold path delta 0 — "${mon.key}": phản hồi có/không cache GIỐNG NHAU (status ${tat.status}/${cold.status})`, giong && tat.status === 200, JSON.stringify({ khacNhau: giong ? [] : Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])) }));
  check(`cold path — "${mon.key}": không có cờ cached trên lượt cold`, cold.json.cached === undefined);
}

// (b) Lượt trùng (đúng hồ sơ, khác dấu/hoa) ⇒ cached:true + KHÔNG gọi LLM thêm
for (const mon of MON) {
  girHienTai = mon.gir;
  const truoc = prompts.length;
  const bienThe = { ...mon.body, tenHang: mon.body.tenHang.toUpperCase(), congDung: `  ${mon.body.congDung} ` };
  const trung = await goi(bienThe);
  check(`lượt trùng — "${mon.key}": cached:true + phienBanDuLieu, KHÔNG gọi LLM`, trung.json.cached === true && typeof trung.json.phienBanDuLieu === 'string' && prompts.length === truoc, JSON.stringify({ cached: trung.json.cached, llmThem: prompts.length - truoc }));
  const hitBo = boSoSanh(trung.json);
  const coldBo = boSoSanh(coldJson[mon.key]);
  // attrs/usage là echo của TỪNG lượt (lượt trùng gửi biến thể viết hoa), ms đã bỏ ở boSoSanh
  delete hitBo.cached; delete hitBo.phienBanDuLieu; delete hitBo.usage; delete hitBo.attrs;
  delete coldBo.usage; delete coldBo.attrs;
  const khacNhau = Object.keys({ ...hitBo, ...coldBo }).filter((k) => JSON.stringify(hitBo[k]) !== JSON.stringify(coldBo[k]));
  check(`lượt trùng — "${mon.key}": nội dung = lượt cold (bỏ trường thời gian/usage/cờ cache)`, khacNhau.length === 0, JSON.stringify(khacNhau).slice(0, 200));
  check(`lượt trùng — "${mon.key}": usage rỗng (không tính phí LLM cho lượt trúng)`, Array.isArray(trung.json.usage) && trung.json.usage.length === 0, JSON.stringify(trung.json.usage));
}

// (c) Đổi facts ⇒ KHÁC hồ sơ ⇒ không trúng cache (phải hỏi lại AI, không trả câu hỏi cũ)
{
  girHienTai = MON[0].gir;
  const truoc = prompts.length;
  const them = await goi({ ...MON[0].body, facts: [{ key: 'kichThuoc', labelVi: 'Kích thước', valueVi: '19mm', evidence: 'trang sản phẩm' }] });
  check('đổi facts ⇒ KHÔNG trúng cache (gọi LLM lại, không trả câu hỏi cũ)', them.json.cached === undefined && prompts.length > truoc, JSON.stringify({ cached: them.json.cached, llmThem: prompts.length - truoc }));
}

// (d) Lượt công khai / debug / holdout KHÔNG đụng DB cache
{
  const demTruoc = callsDb.length;
  girHienTai = MON[1].gir;
  await goi(MON[1].body, { token: null }); // công khai (endpoint mở, không token)
  check('lượt CÔNG KHAI: không đụng bảng cache (0 câu SQL)', callsDb.length === demTruoc, `+${callsDb.length - demTruoc} câu`);
  const rDebug = await goi({ ...MON[1].body, debug: true });
  check('debug:true ⇒ bỏ qua cache (0 câu SQL, không cờ cached)', callsDb.length === demTruoc && rDebug.json.cached === undefined, `+${callsDb.length - demTruoc}`);
  const rHold = await goi(MON[1].body, { headers: { 'x-oz-eval-holdout': '1' } });
  check('X-OZ-Eval-Holdout ⇒ bỏ qua cache (0 câu SQL)', callsDb.length === demTruoc && rHold.json.cached === undefined, `+${callsDb.length - demTruoc}`);
}

// (e) Đổi phiên bản dữ liệu ⇒ dòng cũ hết hiệu lực (lib-level, mô phỏng tariff-versions đổi current)
{
  const dem = await pglite.query('SELECT count(*)::int AS n FROM classify_cache');
  const nDon = await cc.donPhienBanCu('v-moi', { db: dbThu });
  const sau = await pglite.query('SELECT count(*)::int AS n FROM classify_cache');
  check('đổi phiên bản dữ liệu ⇒ dọn sạch dòng cũ (bảng về 0)', dem.rows[0].n > 0 && nDon === dem.rows[0].n && sau.rows[0].n === 0, JSON.stringify({ truoc: dem.rows[0].n, don: nDon, sau: sau.rows[0].n }));
}

cc.ganDbChoTest(null);
await pgl.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
