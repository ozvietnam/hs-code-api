#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Soát tờ khai — `POST /api/declaration-check` (lib/declaration-check.js, rewrite → /api/classify?mode=check) — #338, job H2.
 *
 * Bất biến được khoá ở đây (Review Focus 2, 3, 4, 8 của kế hoạch):
 *  - Mỗi dòng LUÔN có đủ bảy nhóm K1–K7; nhóm/phần không chạy → `trangThai: 'CHUA_KIEM'` + `lyDoChuaKiem`.
 *  - Kết luận chỉ dựa HEURISTIC / LLM_ASSERTED không bao giờ là `LOI` (tối đa CANH_BAO).
 *  - Không có `kiemMa` → KHÔNG gọi LLM, không gọi mạng (spy tầng llm-tier, gemini, fetch, classify). K2 = CHUA_KIEM.
 *  - `kiemMa: true` → K2 chạy qua đường classify sẵn có, MỖI DÒNG MỘT LƯỢT, trong withPrivateData; girRulesApplied /
 *    canCuPhapLy đi NGUYÊN VĂN; khoá dịch vụ có `usage`.
 *  - Trích dẫn TT 85/2026 (K7) chỉ từ lib/legal-basis.js; không nói "bộ hồ sơ kỹ thuật bắt buộc".
 *  - Endpoint KÍN (requireAuth, không theo chế độ mở của classify), có trần tần suất → 429 + Retry-After.
 *  - X-OZ-Chia-Se = 0: không ghi mô tả hàng xuống đĩa.
 *  - 38 ca tổng hợp của H1 chạy hết, mọi dòng đủ 7 nhóm có nhãn.
 * LLM giả lập — không mạng, không ghi data/ thật.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { TEST_DATA_DIR } from './test-isolate-data.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0; let failed = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || extra === undefined ? '' : ` ${JSON.stringify(extra).slice(0, 600)}`}`);
  if (ok) passed += 1; else failed += 1;
};

process.env.HS_API_TOKEN = 'test-token';
process.env.HS_SERVICE_TOKENS = 'cong-oz:svc-key';
delete process.env.HS_PUBLIC_LLM; // chế độ mở của classify đang BẬT mặc định — mode=check vẫn phải kín
delete process.env.HS_LLM_PRIVATE_ALL;
process.env.HS_CLASSIFY_CROSSCHECK = '0';
process.env.HS_ACCESS_LOG = '0';
console.error = () => {};
console.warn = () => {};

// ── Spy mọi lối ra LLM/mạng TRƯỚC khi nạp handler ─────────────────────────────────────────────────
let fetchCalls = 0;
globalThis.fetch = async () => { fetchCalls += 1; throw new Error('test: không được gọi mạng'); };

const privacy = require('../lib/llm-privacy.js');
const llmTier = require('../lib/llm-tier.js');
let llmCalls = 0;
const llmPrivateSeen = [];
llmTier.callLLMJson = async (system, user) => {
  llmCalls += 1;
  llmPrivateSeen.push(privacy.isPrivate());
  if (system.includes('mã HS 4 số')) {
    if (/nghịch lưu/i.test(user)) return { json: { headings: ['8504'] }, provider: 'stub', model: 'stub' };
    return { json: { headings: ['8516'] }, provider: 'stub', model: 'stub' };
  }
  if (system.includes('DỮ KIỆN HÀNG HÓA')) return { json: { tenHangVi: 'hàng thử', banChat: 'hàng thử' }, provider: 'stub', model: 'stub' };
  if (/nghịch lưu/i.test(user)) return { json: { results: [{ hs: '85044040', confidence: 90, reason: 'Bộ nghịch lưu' }], missing: [] }, provider: 'stub', model: 'stub' };
  return { json: { results: [{ hs: '85166010', confidence: 80, reason: 'Nồi nấu' }], missing: [] }, provider: 'stub', model: 'stub' };
};
const gemini = require('../lib/gemini.js');
let geminiCalls = 0;
for (const k of Object.keys(gemini)) {
  if (typeof gemini[k] === 'function' && k !== 'parseGeminiJson') gemini[k] = async () => { geminiCalls += 1; throw new Error('test: gemini bị gọi'); };
}
const cls = require('../lib/classify.js');
const classifyOrig = cls.classify;
const classifyCalls = [];
const classifyOutputs = [];
cls.classify = async (attrs, opts) => {
  classifyCalls.push({ tenHang: attrs?.tenHang, private: privacy.isPrivate() });
  const r = await classifyOrig(attrs, opts);
  classifyOutputs.push({ tenHang: attrs?.tenHang, r: JSON.parse(JSON.stringify(r)) });
  return r;
};
const resetSpies = () => { llmCalls = 0; geminiCalls = 0; fetchCalls = 0; classifyCalls.length = 0; classifyOutputs.length = 0; llmPrivateSeen.length = 0; };

const lb = require('../lib/legal-basis.js');
const { runWithConsent } = require('../lib/share-consent.js');
// Chưa có module (commit test đỏ) → không ném lỗi nạp, để test đỏ đúng ở các assert.
let resetServiceRate = () => {};
try { ({ resetServiceRate } = require('../lib/service-rate-limit.js')); } catch { /* chưa cài đặt */ }
const handler = require('../api/classify.js');

async function call(body, { token = 'svc-key', headers = {}, method = 'POST', chiaSe } = {}) {
  const res = {
    _s: 0, _j: null, _h: {},
    getHeader(k) { return this._h[k.toLowerCase()]; }, setHeader(k, v) { this._h[k.toLowerCase()] = v; },
    status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; },
  };
  const h = { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers };
  const req = { method, url: '/api/declaration-check', query: { mode: 'check' }, headers: h, body };
  const run = () => handler(req, res);
  if (chiaSe === undefined) await run(); else await runWithConsent({ chiaSe }, run);
  return res;
}

const NHOM = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7'];
const TRANG_THAI = new Set(['DAT', 'CANH_BAO', 'LOI', 'CHUA_KIEM']);
const BASIS = new Set(['RULE_TABLE', 'DETERMINISTIC', 'HEURISTIC', 'LLM_ASSERTED']);
const allResults = [];

/** Vấn đề hình dạng/bất biến của một KetQuaSoat. Rỗng = đạt. */
function problems(kq) {
  const bad = [];
  if (!kq || typeof kq !== 'object') return ['không phải object'];
  if (typeof kq.phienBanBoKiem !== 'string' || !kq.phienBanBoKiem) bad.push('thiếu phienBanBoKiem');
  if (typeof kq.phienBanBieuThue !== 'string' || !kq.phienBanBieuThue) bad.push('phienBanBieuThue phải là chuỗi');
  if (!Array.isArray(kq.canhBao)) bad.push('canhBao phải là mảng');
  if (!Array.isArray(kq.dong)) return [...bad, 'thiếu dong[]'];
  let loi = 0; let cb = 0; let ck = 0;
  for (const d of kq.dong) {
    if (!Array.isArray(d.kiem)) { bad.push(`dòng ${d.stt}: thiếu kiem[]`); continue; }
    for (const n of NHOM) if (!d.kiem.some((m) => m.nhom === n)) bad.push(`dòng ${d.stt}: thiếu nhóm ${n}`);
    for (const m of d.kiem) {
      const id = `dòng ${d.stt} ${m.nhom}/${m.ma}`;
      if (!NHOM.includes(m.nhom)) bad.push(`${id}: nhom lạ`);
      if (!TRANG_THAI.has(m.trangThai)) bad.push(`${id}: trangThai lạ ${m.trangThai}`);
      if (!BASIS.has(m.basis)) bad.push(`${id}: basis lạ ${m.basis}`);
      if (typeof m.ma !== 'string' || !m.ma) bad.push(`${id}: thiếu ma`);
      if (typeof m.noiDung !== 'string' || !m.noiDung.trim()) bad.push(`${id}: thiếu noiDung`);
      if (!Array.isArray(m.evidence)) bad.push(`${id}: evidence phải là mảng`);
      if (!Array.isArray(m.nguon) || !m.nguon.length || !m.nguon.every((x) => ['hs-code-api', 'oz-wiki-plhq'].includes(x?.backend) && typeof x.duongDan === 'string')) bad.push(`${id}: nguon sai hợp đồng`);
      if (m.trangThai === 'CHUA_KIEM' && !String(m.lyDoChuaKiem || '').trim()) bad.push(`${id}: CHUA_KIEM thiếu lyDoChuaKiem`);
      if (m.trangThai === 'LOI' && (m.basis === 'HEURISTIC' || m.basis === 'LLM_ASSERTED')) bad.push(`${id}: LOI chỉ dựa ${m.basis}`);
      if (m.trangThai === 'LOI') loi += 1; else if (m.trangThai === 'CANH_BAO') cb += 1; else if (m.trangThai === 'CHUA_KIEM') ck += 1;
    }
    const want = d.kiem.some((m) => m.trangThai === 'LOI') ? 'PHAI_SUA' : d.kiem.some((m) => m.trangThai === 'CANH_BAO') ? 'NEN_SUA' : 'SAN_SANG';
    if (d.mucSanSang !== want) bad.push(`dòng ${d.stt}: mucSanSang ${d.mucSanSang} ≠ ${want}`);
  }
  const t = kq.tongQuan || {};
  if (t.soDong !== kq.dong.length || t.soLoi !== loi || t.soCanhBao !== cb || t.soChuaKiem !== ck) bad.push(`tongQuan lệch ${JSON.stringify(t)} vs ${loi}/${cb}/${ck}`);
  const wantAll = loi ? 'PHAI_SUA' : cb ? 'NEN_SUA' : 'SAN_SANG';
  if (t.mucSanSang !== wantAll) bad.push(`tongQuan.mucSanSang ${t.mucSanSang} ≠ ${wantAll}`);
  return bad;
}
const items = (kq, stt, nhom) => ((kq?.dong || []).find((d) => d.stt === stt)?.kiem || []).filter((m) => m.nhom === nhom);

const dongMau = (o = {}) => ({ stt: 1, maHs: '85166090', moTa: 'Nồi chiên không dầu 5L, 1500W, dùng điện, gia dụng', xuatXu: 'CN', donViTinh: 'chiếc', soLuong: 100, triGia: { soTien: '1500.00', tienTe: 'USD', dieuKien: 'FOB' }, ...o });

// ═══ 1. Không kiemMa: đủ K1–K7, K2 CHUA_KIEM có lý do; KHÔNG gọi LLM/mạng (Review Focus 3, 4) ═══
resetServiceRate();
resetSpies();
const r1 = await call({ dongHang: [dongMau(), dongMau({ stt: 2, maHs: '83012000', moTa: 'Ổ khóa cửa dùng cho xe ô tô, bằng kim loại', thueSuatKhai: { nk: '25', loai: 'MFN' } })] });
const k1 = r1._j;
allResults.push(k1);
check('không kiemMa: 200', r1._s === 200, { s: r1._s, j: r1._j });
check('không kiemMa: hình dạng KetQuaSoat + bất biến (đủ 7 nhóm, CHUA_KIEM có lý do, không LOI dựa HEURISTIC/LLM)', problems(k1).length === 0, problems(k1));
const k2 = items(k1, 1, 'K2');
check('không kiemMa: K2 = CHUA_KIEM, có lyDoChuaKiem nói rõ là công cụ kiểm mã riêng', k2.length === 1 && k2[0].trangThai === 'CHUA_KIEM' && /kiem_ma_to_khai|kiemMa/.test(k2[0].lyDoChuaKiem), k2);
check('không kiemMa: spy LLM (llm-tier) KHÔNG được gọi', llmCalls === 0, llmCalls);
check('không kiemMa: gemini không được gọi, không gọi mạng', geminiCalls === 0 && fetchCalls === 0, { geminiCalls, fetchCalls });
check('không kiemMa: classify KHÔNG được gọi', classifyCalls.length === 0, classifyCalls.length);
check('không kiemMa: dòng không có girRulesApplied (K2 chưa chạy)', Boolean(k1?.dong?.length) && k1.dong.every((d) => !('girRulesApplied' in d)));
check('khoá dịch vụ: có usage (mảng rỗng vì không gọi LLM)', Array.isArray(k1?.usage) && k1.usage.length === 0, k1?.usage);
check('canhBao nêu rõ phần không kiểm được', (k1?.canhBao || []).some((s) => /Không kiểm được/.test(s)));
check('K6: so với giá tham chiếu luôn CHUA_KIEM (Q5)', items(k1, 1, 'K6').some((m) => m.trangThai === 'CHUA_KIEM' && /tham chiếu/.test(m.lyDoChuaKiem)));
check('K5: theo bản chất hàng → CHUA_KIEM (chờ #243/#322)', items(k1, 1, 'K5').some((m) => m.trangThai === 'CHUA_KIEM' && /243|322/.test(m.lyDoChuaKiem)));
check('K3: MFN khai đúng biểu (83012000 = 25) → DAT, basis RULE_TABLE', items(k1, 2, 'K3').some((m) => m.trangThai === 'DAT' && m.basis === 'RULE_TABLE'), items(k1, 2, 'K3'));

// ═══ 2. Gọi HS_API_TOKEN (không phải khoá dịch vụ) → không có usage ═══
const r2 = await call({ dongHang: [dongMau()] }, { token: 'test-token' });
check('HS_API_TOKEN: 200 nhưng không có usage', r2._s === 200 && !('usage' in (r2._j || {})), r2._s);
allResults.push(r2._j);

// ═══ 3. ACFTA "0 (-CN)" khai 0% xuất xứ CN → K3 hoặc K4 LOI, basis RULE_TABLE ═══
const { taxData } = require('../lib/data.js');
const FIX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'soat', 'ca-tong-hop.json'), 'utf8')).ca;
const acftaCa = FIX.find((c) => /^0\s*\(-[^)]*CN/.test(String(taxData[c.maDung]?.acfta || '')));
check('bộ ca có dòng ACFTA "0 (-…CN)"', Boolean(acftaCa), FIX.map((c) => taxData[c.maDung]?.acfta));
const r3 = await call({ dongHang: [{ stt: 1, maHs: acftaCa.maDung, moTa: acftaCa.moTa, xuatXu: 'CN', donViTinh: 'chiếc', thueSuatKhai: { nk: '0', loai: 'ACFTA' }, coFormE: true }] });
allResults.push(r3._j);
const k34 = [...items(r3._j, 1, 'K3'), ...items(r3._j, 1, 'K4')];
check(`ACFTA ${acftaCa.maDung} "${taxData[acftaCa.maDung].acfta}" khai 0% xuất xứ CN → K3/K4 LOI basis RULE_TABLE`, k34.some((m) => m.trangThai === 'LOI' && m.basis === 'RULE_TABLE'), k34);
check('ACFTA loại trừ CN: mã ACFTA_LOAI_TRU_CN, evidence dẫn chuỗi biểu thuế nguyên văn', k34.some((m) => m.ma === 'ACFTA_LOAI_TRU_CN' && m.evidence.some((e) => e.includes(taxData[acftaCa.maDung].acfta))), k34);
check('ACFTA có C/O: chứng từ C/O → CHUA_KIEM "chưa nạp văn bản quy tắc xuất xứ ACFTA"', items(r3._j, 1, 'K4').some((m) => m.trangThai === 'CHUA_KIEM' && /quy tắc xuất xứ ACFTA/.test(m.lyDoChuaKiem)));
// Cùng dòng, xuất xứ Thái Lan (không bị loại trừ) → không LOI loại trừ
const r3b = await call({ dongHang: [{ stt: 1, maHs: '94019921', moTa: 'Miếng tựa đầu của ghế ngồi ô tô, khung kim loại bọc nệm', xuatXu: 'TH', donViTinh: 'chiếc', thueSuatKhai: { nk: '0', loai: 'ACFTA' }, coFormE: true }] });
allResults.push(r3b._j);
check('ACFTA 94019921 "0 (-CN)" xuất xứ TH khai 0% → K3 DAT, không có ACFTA_LOAI_TRU_CN', items(r3b._j, 1, 'K3').some((m) => m.trangThai === 'DAT') && ![...items(r3b._j, 1, 'K3'), ...items(r3b._j, 1, 'K4')].some((m) => m.ma === 'ACFTA_LOAI_TRU_CN'), [...items(r3b._j, 1, 'K3'), ...items(r3b._j, 1, 'K4')]);
// MFN khai sai
const r3c = await call({ dongHang: [dongMau({ maHs: '83012000', moTa: 'Ổ khóa cửa dùng cho xe ô tô, bằng kim loại', thueSuatKhai: { nk: '0', loai: 'MFN' } })] });
allResults.push(r3c._j);
check('K3: khai MFN 0% cho 83012000 (biểu 25%) → LOI RULE_TABLE, evidence có mức biểu', items(r3c._j, 1, 'K3').some((m) => m.trangThai === 'LOI' && m.basis === 'RULE_TABLE' && m.evidence.some((e) => /25/.test(e))), items(r3c._j, 1, 'K3'));
// Ngày đăng ký dự kiến khác năm của biểu đang giữ → lệch thuế suất chỉ CANH_BAO (biểu áp tại ngày đăng ký — Điều 5.2)
const r3d = await call({ ngayDuKienDangKy: '2027-03-01', dongHang: [dongMau({ maHs: '83012000', moTa: 'Ổ khóa cửa dùng cho xe ô tô, bằng kim loại', thueSuatKhai: { nk: '0', loai: 'MFN' } })] });
allResults.push(r3d._j);
check('K3: ngày đăng ký khác năm biểu → lệch thuế chỉ CANH_BAO + canhBao nêu lý do', items(r3d._j, 1, 'K3').some((m) => m.trangThai === 'CANH_BAO' && m.ma === 'THUE_SUAT_KHAI_LECH_BIEU') && (r3d._j?.canhBao || []).some((x) => /2027-03-01/.test(x)), items(r3d._j, 1, 'K3'));
// Không khai thuế suất → K3 CHUA_KIEM có lý do
check('K3: không khai thuế suất → CHUA_KIEM có lý do', items(k1, 1, 'K3').some((m) => m.trangThai === 'CHUA_KIEM' && m.lyDoChuaKiem), items(k1, 1, 'K3'));

// ═══ 4. K1 (TT 39/2018 trên câu khách viết) ═══
const r4 = await call({ dongHang: [
  dongMau({ stt: 1, moTa: 'phụ kiện các loại' }),
  dongMau({ stt: 2, moTa: '空气炸锅 5L 1500W' }),
  dongMau({ stt: 3, moTa: 'Nồi chiên không dầu 5L, 1500W, điện áp 220V, dùng chiên thực phẩm gia dụng, nhãn hiệu Lock&Lock' }),
] });
allResults.push(r4._j);
check('K1: "phụ kiện các loại" → LOI (CV 5189), basis không phải HEURISTIC/LLM', items(r4._j, 1, 'K1').some((m) => m.trangThai === 'LOI' && m.ma === 'TOO_GENERIC' && ['RULE_TABLE', 'DETERMINISTIC'].includes(m.basis) && m.nguon.some((x) => /5189/.test(JSON.stringify(x)))), items(r4._j, 1, 'K1'));
check('K1: mô tả có chữ Hán → LOI CJK_IN_DECLARATION', items(r4._j, 2, 'K1').some((m) => m.trangThai === 'LOI' && m.ma === 'CJK_IN_DECLARATION'), items(r4._j, 2, 'K1'));
check('K1: mô tả đủ ý không có LOI', !items(r4._j, 3, 'K1').some((m) => m.trangThai === 'LOI'), items(r4._j, 3, 'K1'));
check('K1: dòng "phụ kiện các loại" → mucSanSang PHAI_SUA', r4._j?.dong?.[0]?.mucSanSang === 'PHAI_SUA');
check('K1 chạy trên câu khách viết, không gọi describe/LLM', llmCalls === 0);

// ═══ 5. Kết luận chỉ HEURISTIC không bao giờ LOI: mô tả nói "Made in Japan" nhưng khai CN ═══
const r5 = await call({ dongHang: [dongMau({ moTa: 'Nồi chiên không dầu 5L 1500W, Made in Japan, xuất xứ Nhật Bản' })] });
allResults.push(r5._j);
const oc = [...items(r5._j, 1, 'K1'), ...items(r5._j, 1, 'K4')].filter((m) => m.ma === 'ORIGIN_CONFLICT');
check('ORIGIN_CONFLICT (nhận bằng từ khoá) → CANH_BAO HEURISTIC, KHÔNG LOI', oc.length === 1 && oc[0].trangThai === 'CANH_BAO' && oc[0].basis === 'HEURISTIC', oc);

// ═══ 6. K6, K7 ═══
const r6 = await call({ dongHang: [
  dongMau({ stt: 1, triGia: { soTien: '0', tienTe: 'USD', dieuKien: 'CIF' } }),
  dongMau({ stt: 2, triGia: { soTien: '1500', tienTe: 'USD' } }),
  dongMau({ stt: 3, maHs: '84798210', moTa: 'Máy trộn công nghiệp dạng tháo rời, nhập nhiều chuyến, công suất 15kW', triGia: { soTien: '20000', tienTe: 'USD', dieuKien: 'CIF' } }),
] });
allResults.push(r6._j);
check('K6: trị giá bằng 0 → cảnh báo (không im lặng)', items(r6._j, 1, 'K6').some((m) => ['CANH_BAO', 'LOI'].includes(m.trangThai) && /TRI_GIA_BANG_0/.test(m.ma)), items(r6._j, 1, 'K6'));
check('K6: thiếu điều kiện giao hàng → CANH_BAO', items(r6._j, 2, 'K6').some((m) => m.trangThai === 'CANH_BAO' && m.ma === 'THIEU_DIEU_KIEN_GIAO_HANG'), items(r6._j, 2, 'K6'));
const k7 = items(r6._j, 3, 'K7');
const k7dm = k7.find((m) => m.ma === 'CO_THE_PHAI_DANG_KY_DANH_MUC');
check('K7: chương 84 + "tháo rời" → CANH_BAO (HEURISTIC), dẫn Điều 9 khoản 2 điểm b qua lib/legal-basis.js', k7dm && k7dm.trangThai === 'CANH_BAO' && k7dm.basis === 'HEURISTIC' && JSON.stringify(k7dm.dieuKhoan?.['9.2.b']) === JSON.stringify((({ id, ...rest }) => rest)(lb.cite('9.2.b'))), k7);
check('K7: luôn có gợi ý tài liệu kỹ thuật theo Điều 10 khoản 1 điểm d (nguyên văn legal-basis)', Boolean(r6._j?.dong?.length) && r6._j.dong.every((d) => d.kiem.some((m) => m.nhom === 'K7' && m.dieuKhoan?.['10.1.d']?.trich === lb.CLAUSES['10.1.d'].trich)));
check('K7: không bao giờ nói "bộ hồ sơ kỹ thuật bắt buộc"', !/bộ hồ sơ kỹ thuật bắt buộc/i.test(JSON.stringify(allResults)));
check('K7: dòng không có dấu hiệu tháo rời không bị cảnh báo Danh mục', !items(r6._j, 1, 'K7').some((m) => m.trangThai === 'CANH_BAO'));

// ═══ 7. kiemMa: K2 qua classify, mỗi dòng một lượt, withPrivateData, nguyên văn, usage ═══
resetSpies();
const r7 = await call({ kiemMa: true, dongHang: [
  dongMau({ stt: 1, maHs: '85044090', moTa: 'Bộ nghịch lưu năng lượng mặt trời hòa lưới 5kW', donViTinh: 'chiếc' }),
  dongMau({ stt: 2 }),
] });
const k7r = r7._j;
allResults.push(k7r);
check('kiemMa: 200 + bất biến', r7._s === 200 && problems(k7r).length === 0, { s: r7._s, p: problems(k7r || {}) });
check('kiemMa: classify gọi đúng MỖI DÒNG MỘT LƯỢT (2 dòng → 2 lượt)', classifyCalls.length === 2, classifyCalls);
check('kiemMa: LLM (giả) có được gọi', llmCalls > 0, llmCalls);
check('kiemMa: mọi lượt classify/LLM chạy trong withPrivateData', classifyCalls.every((c) => c.private) && llmPrivateSeen.length > 0 && llmPrivateSeen.every(Boolean), { classifyCalls, llmPrivateSeen });
check('kiemMa: không gọi mạng thật', fetchCalls === 0 && geminiCalls === 0, { fetchCalls, geminiCalls });
const lk = items(k7r, 1, 'K2').find((m) => m.ma === 'LOAI_KHAC_KHOP_ANH_EM');
check('kiemMa: mã "Loại khác" 85044090 khớp anh em có tên 85044040 → K2 CANH_BAO', lk && lk.trangThai === 'CANH_BAO' && lk.evidence.some((e) => e.includes('85044040')), items(k7r, 1, 'K2'));
check('kiemMa: K2 dẫn nguyên văn tên anh em (từ gói căn cứ H1)', lk && lk.evidence.some((e) => e.includes('Bộ nghịch lưu')), lk);
const outFor = (t) => classifyOutputs.find((o) => o.tenHang === t)?.r;
const c1 = outFor('Bộ nghịch lưu năng lượng mặt trời hòa lưới 5kW');
check('kiemMa: girRulesApplied của dòng = NGUYÊN VĂN classify', c1 && JSON.stringify(k7r?.dong?.[0]?.girRulesApplied) === JSON.stringify(c1.girRulesApplied), { got: k7r?.dong?.[0]?.girRulesApplied });
check('kiemMa: canCuPhapLy của dòng = NGUYÊN VĂN classify', c1 && JSON.stringify(k7r?.dong?.[0]?.canCuPhapLy) === JSON.stringify(c1.canCuPhapLy));
const k2b = items(k7r, 2, 'K2');
check('kiemMa: mã máy chọn khác mã khai → K2 CANH_BAO LLM_ASSERTED, không LOI', k2b.some((m) => m.trangThai === 'CANH_BAO' && m.basis === 'LLM_ASSERTED' && /^KHAC_/.test(m.ma)) && !k2b.some((m) => m.trangThai === 'LOI'), k2b);
check('kiemMa: khoá dịch vụ có usage (mảng)', Array.isArray(k7r?.usage), k7r?.usage);
check('kiemMa: K2 không còn CHUA_KIEM "dùng kiem_ma_to_khai"', Boolean(k7r?.dong) && !k7r.dong.some((d) => d.kiem.some((m) => m.nhom === 'K2' && /kiem_ma_to_khai/.test(m.lyDoChuaKiem || ''))));

// maLuotSoat đi kèm để Cổng gộp K2 vào kết quả soát cũ
const uuid = '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const r7b = await call({ kiemMa: true, maLuotSoat: uuid, dongHang: [dongMau()] });
allResults.push(r7b._j);
check('maLuotSoat (uuid) được nhận và trả lại nguyên văn', r7b._s === 200 && r7b._j?.maLuotSoat === uuid, r7b._j?.maLuotSoat);

// ═══ 8. X-OZ-Chia-Se = 0: không ghi mô tả hàng xuống đĩa ═══
const BI_MAT = 'Máy đo độ nhám bề mặt XYZ-SECRET-338 cầm tay';
await call({ kiemMa: true, dongHang: [dongMau({ moTa: BI_MAT })] }, { headers: { 'x-oz-chia-se': '0' }, chiaSe: false });
await call({ dongHang: [dongMau({ moTa: BI_MAT })] }, { headers: { 'x-oz-chia-se': '0' }, chiaSe: false });
const grepDir = (dir) => {
  const hits = [];
  if (!fs.existsSync(dir)) return hits;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) hits.push(...grepDir(p));
    else if (fs.readFileSync(p, 'utf8').includes('XYZ-SECRET-338')) hits.push(p);
  }
  return hits;
};
check('X-OZ-Chia-Se = 0: không file nào trong thư mục dữ liệu (cách ly) chứa mô tả hàng', grepDir(TEST_DATA_DIR).length === 0, grepDir(TEST_DATA_DIR));

// ═══ 9. Đầu vào strict (hợp đồng SoatToKhaiInput) → 400 DAU_VAO_SAI ═══
const bad = async (name, body) => {
  const r = await call(body);
  check(`đầu vào sai: ${name} → 400 DAU_VAO_SAI`, r._s === 400 && r._j?.error === 'DAU_VAO_SAI' && Array.isArray(r._j.chiTiet), { s: r._s, j: r._j });
};
await bad('trường lạ ở gốc (tenDoanhNghiep)', { tenDoanhNghiep: 'Cty A', dongHang: [dongMau()] });
await bad('trường lạ trong dòng (maSoThue)', { dongHang: [dongMau({ maSoThue: '0101234567' })] });
await bad('trường lạ trong triGia (soHoaDon)', { dongHang: [dongMau({ triGia: { soTien: '1', tienTe: 'USD', soHoaDon: 'HD1' } })] });
await bad('soTien là number', { dongHang: [dongMau({ triGia: { soTien: 1500, tienTe: 'USD' } })] });
await bad('mã HS không đủ 8 số', { dongHang: [dongMau({ maHs: '851660' })] });
await bad('xuatXu không phải ISO 2 chữ hoa', { dongHang: [dongMau({ xuatXu: 'Trung Quốc' })] });
await bad('dongHang rỗng', { dongHang: [] });
await bad('quá 50 dòng', { dongHang: Array.from({ length: 51 }, (_, i) => dongMau({ stt: i + 1 })) });
await bad('kiemMa không phải true', { kiemMa: 'yes', dongHang: [dongMau()] });
await bad('maLuotSoat không phải uuid', { maLuotSoat: 'abc', dongHang: [dongMau()] });
await bad('ngày không có thật', { ngayDuKienDangKy: '2026-02-30', dongHang: [dongMau()] });
await bad('thueSuatKhai.loai lạ', { dongHang: [dongMau({ thueSuatKhai: { nk: '5', loai: 'RCEP' } })] });

// ═══ 10. KÍN + trần tần suất ═══
const r10 = await call({ dongHang: [dongMau()] }, { token: null });
check('không token → 401 (dù chế độ mở LLM của classify đang bật)', r10._s === 401, r10._s);
const r10b = await call({ dongHang: [dongMau()] }, { token: 'sai' });
check('token sai → 401', r10b._s === 401, r10b._s);
const r10c = await call({ dongHang: [dongMau()] }, { method: 'GET' });
check('GET → 405', r10c._s === 405, r10c._s);
process.env.HS_DECL_CHECK_RPM = '3';
resetServiceRate();
const codes = [];
for (let i = 0; i < 4; i += 1) codes.push((await call({ dongHang: [dongMau()] }))._s);
const last = await call({ dongHang: [dongMau()] });
check('vượt trần tần suất theo khoá dịch vụ → 429', codes.slice(0, 3).every((c) => c === 200) && codes[3] === 429, codes);
check('429 có Retry-After + error VUOT_HAN_MUC', last._s === 429 && Number(last.getHeader('Retry-After')) > 0 && last._j?.error === 'VUOT_HAN_MUC', { s: last._s, h: last._h, j: last._j });
const otherKey = await call({ dongHang: [dongMau()] }, { token: 'test-token' });
check('trần tính riêng từng khoá (khoá khác vẫn chạy)', otherKey._s === 200, otherKey._s);
delete process.env.HS_DECL_CHECK_RPM;
resetServiceRate();

// ═══ 11. routes.json ═══
const routes = JSON.parse(fs.readFileSync(path.join(ROOT, 'routes.json'), 'utf8'));
check('routes.json: /api/declaration-check → /api/classify?mode=check', routes.rewrites.some((r) => r.source === '/api/declaration-check' && r.destination === '/api/classify?mode=check'));
const pa = fs.readFileSync(path.join(ROOT, 'scripts', 'test-public-access.mjs'), 'utf8');
check('test-public-access: MUST_STAY_PRIVATE có declaration_check', /\['declaration_check'/.test(pa));

// ═══ 12. 38 ca tổng hợp của H1 (không kiemMa): chạy hết, mọi dòng đủ 7 nhóm có nhãn ═══
resetSpies();
const lines = FIX.map((c, i) => ({ stt: i + 1, maHs: c.maDung, moTa: c.moTa, xuatXu: 'CN', ...(c.thongSo ? { thongSo: c.thongSo } : {}) }));
let r12 = null;
let threw = null;
try { r12 = await call({ dongHang: lines }); } catch (e) { threw = e.message; }
const kq12 = r12?._j;
allResults.push(kq12);
check(`${FIX.length} ca tổng hợp: chạy hết, không ném lỗi, 200`, !threw && r12?._s === 200, threw || r12?._s);
check(`${FIX.length} ca tổng hợp: mọi dòng đủ K1–K7 có nhãn, bất biến giữ`, kq12 && problems(kq12).length === 0, kq12 && problems(kq12));
check(`${FIX.length} ca tổng hợp: không gọi LLM/mạng`, llmCalls === 0 && fetchCalls === 0 && classifyCalls.length === 0, { llmCalls, fetchCalls });
if (kq12?.dong) {
  const bang = {};
  for (const d of kq12.dong) for (const m of d.kiem) {
    bang[m.nhom] ||= { DAT: 0, CANH_BAO: 0, LOI: 0, CHUA_KIEM: 0 };
    bang[m.nhom][m.trangThai] += 1;
  }
  console.log(`\nBảng tóm tắt ${kq12.dong.length} ca tổng hợp (số mục kiểm theo nhóm × trạng thái):`);
  console.log('nhóm   DAT  CANH_BAO  LOI  CHUA_KIEM');
  for (const n of NHOM) { const b = bang[n] || {}; console.log(`${n.padEnd(5)} ${String(b.DAT || 0).padStart(4)} ${String(b.CANH_BAO || 0).padStart(9)} ${String(b.LOI || 0).padStart(4)} ${String(b.CHUA_KIEM || 0).padStart(10)}`); }
  const muc = kq12.dong.reduce((a, d) => ({ ...a, [d.mucSanSang]: (a[d.mucSanSang] || 0) + 1 }), {});
  console.log(`mucSanSang theo dòng: ${JSON.stringify(muc)}; tongQuan: ${JSON.stringify(kq12.tongQuan)}\n`);
}

// ═══ 12b. L1-5e: dòng nhận hoSoId + duKien (Cổng gửi theo maLuotPhanLoai); K2 hồ sơ mới chỉ khi HS_HO_SO bật + mã lát 1 ═══
{
  const HSID = '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
  const BD = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'bench', 'mo-ta-bo-de.json'), 'utf8')).ca.find((c) => c.id === 'BD-96-03'); // bộ đề công khai #543
  const dongLat1 = (o = {}) => dongMau({ maHs: BD.maHs, moTa: BD.moTaMau.replace(BD.caCaiLoi.doiAnhEm.tu, BD.caCaiLoi.doiAnhEm.sang), ...o });
  delete process.env.HS_HO_SO;
  resetSpies();
  const rA = await call({ kiemMa: true, dongHang: [dongLat1({ hoSoId: HSID, duKien: [{ fact: 'laBoPhan', giaTri: true, nguon: 'KHACH', bangChung: 'vỏ ngoài rời' }] })] });
  allResults.push(rA._j);
  check('L1-5e: dòng có hoSoId (uuid) + duKien (mảng) ⇒ 200 + bất biến', rA._s === 200 && problems(rA._j).length === 0, { s: rA._s, j: rA._j });
  check('L1-5e: cờ HS_HO_SO tắt ⇒ K2 đường cũ (không trường hồ sơ), classify vẫn chạy', !JSON.stringify(rA._j?.dong || []).includes('duKienQuyetDinh') && classifyCalls.length === 1, classifyCalls.length);
  await bad('dòng có hoSoId không phải uuid', { dongHang: [dongMau({ hoSoId: 'abc' })] });
  await bad('dòng có duKien không phải mảng', { dongHang: [dongMau({ duKien: { fact: 'x' } })] });
  await bad('dòng có duKien quá 50 mục', { dongHang: [dongMau({ duKien: Array.from({ length: 51 }, () => ({ fact: 'laBoPhan', giaTri: true })) })] });
  await bad('dòng gửi ngược hoSo (ranh giới tin cậy)', { dongHang: [dongMau({ hoSo: { maHs: '85166090' } })] });
  process.env.HS_HO_SO = 'on';
  resetSpies();
  const rB = await call({ kiemMa: true, dongHang: [dongLat1(), dongMau({ stt: 2 })] });
  allResults.push(rB._j);
  check('L1-5e: HS_HO_SO=on + mã lát 1 ⇒ 200 + bất biến (đủ 7 nhóm, không LOI dựa HEURISTIC/LLM)', rB._s === 200 && problems(rB._j).length === 0, { s: rB._s, p: problems(rB._j || {}) });
  const kB = items(rB._j, 1, 'K2');
  check('L1-5e: dòng lát 1 có mục K2 hồ sơ (duKienQuyetDinh, cauSuaDeXuat, coCanCuTatDinh, khungNghiNgo, hoSo)', kB.some((m) => Array.isArray(m.duKienQuyetDinh) && m.cauSuaDeXuat && typeof m.coCanCuTatDinh === 'boolean' && 'khungNghiNgo' in m && m.hoSo), kB.map((m) => m.ma));
  check('L1-5e: HS_K2_LOI tắt ⇒ không mục K2 nào LOI', !kB.some((m) => m.trangThai === 'LOI'), kB.map((m) => [m.ma, m.trangThai]));
  check('L1-5e: dòng ngoài lát 1 giữ K2 đường cũ (KHAC_*/LOAI_KHAC…, không trường hồ sơ)', !items(rB._j, 2, 'K2').some((m) => 'duKienQuyetDinh' in m), items(rB._j, 2, 'K2'));
  check('L1-5e: cong-oz không bao giờ nhận MO_TA_GIONG_MA_KHAC', !/MO_TA_GIONG_MA_KHAC/.test(JSON.stringify(rB._j)));
  delete process.env.HS_HO_SO;
}

// ═══ 13. Bất biến trên MỌI kết quả đã thu ═══
const tong = allResults.filter(Boolean).flatMap((kq) => problems(kq));
check(`bất biến trên mọi kết quả (${allResults.filter(Boolean).length} lượt): không LOI dựa HEURISTIC/LLM, CHUA_KIEM luôn có lý do, đủ 7 nhóm`, tong.length === 0, tong);

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
