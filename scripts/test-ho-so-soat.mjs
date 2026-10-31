#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Job L1-5e (#648): SOÁT K2 mới trong `POST /api/declaration-check` — `lib/ho-so/soat.js` + nhánh mã lát 1 của
 * `lib/declaration-check.js#kiemK2`. Plan ozplugin 2026-10-29-ho-so-phan-loai.md (Job L1-5e), spec §8.5, §8.10.
 *
 * Ca lấy từ bộ đề CÔNG KHAI #543 (data/bench/mo-ta-bo-de.json, ca BD-96-03 — mã lát 1 có ranh giới đã duyệt trên dữ liệu thật):
 * mô tả mẫu (đủ căn cứ), "bỏ dữ kiện" (caCaiLoi.boDuKien), "đổi anh em" (caCaiLoi.doiAnhEm). KHÔNG đọc bộ đề lát 1, KHÔNG đọc
 * data/oz-export/*. LLM / classify / nguồn ngoài đều là STUB — không mạng, không LLM thật, không ghi data/ thật.
 *
 * Ảnh chụp đường cũ (tests/ho-so-soat-anh-chup.json) lấy ở commit test đỏ (trước khi cài) với cờ tắt:
 *   CAP_NHAT_ANH_CHUP=1 node scripts/test-ho-so-soat.mjs   — chỉ chạy phần chụp, ghi tệp rồi thoát.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { TEST_DATA_DIR } from './test-isolate-data.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ANH_CHUP = path.join(ROOT, 'tests', 'ho-so-soat-anh-chup.json');

process.env.HS_API_TOKEN = 'test-token';
process.env.HS_SERVICE_TOKENS = 'cong-oz:k-cong,erp:k-erp,oz-noi-bo:k-noi';
for (const k of ['HS_INTERNAL_CALLERS', 'HS_HO_SO', 'HS_HO_SO_THU_CALLERS', 'HS_K2_LOI', 'HS_PUBLIC_LLM', 'HS_LLM_PRIVATE_ALL', 'HS_DECL_CHECK_RPM']) delete process.env[k];
process.env.HS_HO_SO_VIET = 'MAY'; // viết tất định (nhánh LLM của bộ viết đã có test riêng ở test-ho-so-viet-mo-ta)
process.env.HS_CLASSIFY_CROSSCHECK = '0';
process.env.HS_ACCESS_LOG = '0';
for (const k of Object.keys(process.env)) if (/^(ZAI|Z_AI|GLM)_/i.test(k)) delete process.env[k];
console.error = () => {};
console.warn = () => {};

let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n}${d !== undefined ? ` — ${JSON.stringify(d).slice(0, 700)}` : ''}`); } };
const bangSau = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ── Spy mọi lối ra LLM / mạng / classify TRƯỚC khi nạp handler ────────────────────────────────────────────────
let fetchCalls = 0;
globalThis.fetch = async () => { fetchCalls += 1; throw new Error('test: không được gọi mạng'); };
const privacy = require('../lib/llm-privacy.js');
const llmTier = require('../lib/llm-tier.js');
const goiLlm = [];
llmTier.callLLMJson = async (system, user, opts = {}) => {
  goiLlm.push({ step: opts.step || null, rieng: privacy.isPrivate() });
  if (opts.step === 'ho-so-doc-du-kien') return { json: { duKien: [] }, model: 'stub' };
  if (opts.step === 'ho-so-viet-mo-ta') { const m = /BẢN MÁY GHÉP:\n([^\n]*)/.exec(String(user)); return { json: { moTaEcus: m ? m[1] : '' }, model: 'stub' }; }
  throw new Error('test: bước LLM không mong đợi');
};
const gemini = require('../lib/gemini.js');
for (const k of Object.keys(gemini)) if (typeof gemini[k] === 'function' && k !== 'parseGeminiJson') gemini[k] = async () => { throw new Error('test: gemini bị gọi'); };
// classify GIẢ (tất định, nhanh): đếm theo mô tả, ghi ngữ cảnh riêng tư. Không tự gắn nhãn GIR (luật 6) — girRulesApplied rỗng.
const cls = require('../lib/classify.js');
const goiClassify = [];
cls.classify = async (attrs) => {
  goiClassify.push({ tenHang: attrs && attrs.tenHang, rieng: privacy.isPrivate() });
  return { status: 'RESOLVED_BY_LLM', results: [{ hs: '96170020', confidence: 70, reason: 'stub' }], girRulesApplied: [], canCuPhapLy: null, missing: [] };
};

const handler = require('../api/classify.js');
let resetServiceRate = () => {};
try { ({ resetServiceRate } = require('../lib/service-rate-limit.js')); } catch { /* */ }

async function goi(body, { token = 'k-cong' } = {}) {
  const res = {
    _s: 0, _j: null, _h: {},
    getHeader(k) { return this._h[k.toLowerCase()]; }, setHeader(k, v) { this._h[k.toLowerCase()] = v; },
    status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; },
  };
  const req = { method: 'POST', url: '/api/declaration-check', query: { mode: 'check' }, headers: token ? { authorization: `Bearer ${token}` } : {}, body: structuredClone(body) };
  resetServiceRate();
  await handler(req, res);
  return res;
}

// ── Ca từ bộ đề công khai #543 ─────────────────────────────────────────────────────────────────────────────────
const BO_DE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'bench', 'mo-ta-bo-de.json'), 'utf8'));
const CA = BO_DE.ca.find((c) => c.id === 'BD-96-03');
check('bộ đề #543 có ca BD-96-03 (96170010) với boDuKien + doiAnhEm', Boolean(CA && CA.caCaiLoi && CA.caCaiLoi.doiAnhEm && Array.isArray(CA.caCaiLoi.boDuKien)), CA && CA.caCaiLoi);
const MA = CA.maHs;
const MO_TA_MAU = CA.moTaMau;
const MO_TA_DOI = MO_TA_MAU.replace(CA.caCaiLoi.doiAnhEm.tu, CA.caCaiLoi.doiAnhEm.sang);
const MA_ANH_EM = CA.caCaiLoi.doiAnhEm.maTroToi;
const DK_BO = CA.duKienQuyetDinh[CA.caCaiLoi.boDuKien[0]];
let MO_TA_BO = MO_TA_MAU;
for (const k of DK_BO.tuKhoa) MO_TA_BO = MO_TA_BO.replace(new RegExp(`\\s*${k}`, 'giu'), '');
check('ca "đổi anh em" và "bỏ dữ kiện" thật sự đổi mô tả', MO_TA_DOI !== MO_TA_MAU && MO_TA_BO !== MO_TA_MAU, { MO_TA_DOI, MO_TA_BO });

const { taxData } = require('../lib/data.js');
const HS = require('../lib/ho-so/index.js');
const NGOAI = '85166090'; // nồi chiên — ngoài lát 1
const chuaApDung = (m) => { process.env.HS_HO_SO = 'on'; const r = HS.laMaLat1(m) && !HS.hoSoApDung(m); delete process.env.HS_HO_SO; return r; };
// L1-4c đợt 4: mọi mã lát 1 của bộ đề #543 nay đã duyệt ranh giới ⇒ lấy thêm từ danh sách 50 phân nhóm lát 1 (dòng 5 chỉ cần
// MỘT mã lát 1 chưa duyệt, mô tả là chữ thử chung — không phụ thuộc ca của bộ đề).
const LAT1_PN6 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ho-so', 'lat-1.json'), 'utf8')).phanNhom.map((p) => p.pn6);
const LAT1_CHUA_DUYET = BO_DE.ca.map((c) => c.maHs).find(chuaApDung)
  || Object.keys(taxData).sort().find((m) => m.length === 8 && LAT1_PN6.includes(m.slice(0, 6)) && chuaApDung(m));
check('mã ngoài lát 1 có trong biểu', Boolean(taxData[NGOAI]) && !HS.laMaLat1(NGOAI));
check('có mã lát 1 chưa duyệt ranh giới (bộ đề #543, hoặc danh sách lát 1) để kiểm "không áp dụng"', Boolean(LAT1_CHUA_DUYET), LAT1_CHUA_DUYET);

const dong = (stt, maHs, moTa, o = {}) => ({ stt, maHs, moTa, xuatXu: 'CN', donViTinh: 'chiếc', soLuong: 100, triGia: { soTien: '500.00', tienTe: 'USD', dieuKien: 'FOB' }, ...o });
const DONG = [
  dong(1, MA, MO_TA_MAU),
  dong(2, MA, MO_TA_DOI),
  dong(3, MA, MO_TA_BO),
  dong(4, NGOAI, 'Nồi chiên không dầu 5L, 1500W, dùng điện, gia dụng'),
  dong(5, LAT1_CHUA_DUYET, 'Hàng thử mã lát 1 chưa duyệt ranh giới, mới 100%'),
];
const BODY = { ngayDuKienDangKy: '2026-10-30', kiemMa: true, dongHang: DONG };
const gon = (j) => (j ? { dong: j.dong, tongQuan: j.tongQuan, goiYChuyenGia: j.goiYChuyenGia } : j);

// ── Ảnh chụp đường cũ (cờ tắt) ─────────────────────────────────────────────────────────────────────────────────
if (process.env.CAP_NHAT_ANH_CHUP === '1') {
  const a = await goi(BODY);
  const b = await goi({ ...BODY, kiemMa: undefined });
  if (a._s !== 200 || b._s !== 200) { console.log('chụp lỗi', a._s, b._s); process.exit(1); }
  fs.writeFileSync(ANH_CHUP, `${JSON.stringify({ ghiChu: 'Phản hồi /api/declaration-check TRƯỚC L1-5e (cờ tắt, classify + LLM stub cố định). Chỉ dong/tongQuan/goiYChuyenGia. Không sửa tay.', kiemMa: gon(a._j), khongKiemMa: gon(b._j) }, null, 1)}\n`);
  console.log(`đã ghi ${path.relative(ROOT, ANH_CHUP)}`);
  process.exit(0);
}
const ANH = JSON.parse(fs.readFileSync(ANH_CHUP, 'utf8'));

// ── Nguồn ngoài của động cơ hồ sơ (cùng điểm tiêm với describe/classify) ──────────────────────────────────────
let API = null; let SOAT = null;
try { API = require('../lib/ho-so/api.js'); } catch (e) { check('lib/ho-so/api.js nạp được', false, String(e.message)); }
try { SOAT = require('../lib/ho-so/soat.js'); } catch (e) { check('lib/ho-so/soat.js nạp được', false, String(e.message)); }
const QD = { loai: 'DANH_MUC_RUI_RO', maHs: MA, nhan: 'QD_2079_BAC_C', ghiChu: 'không phải căn cứ pháp lý' };
const goiNguon = { demKhoOz: 0, identify: 0, webFacts: 0 };
API._datDeps({
  identify: async () => { goiNguon.identify += 1; return null; },
  webFacts: async () => { goiNguon.webFacts += 1; return null; },
  thamChieu: async () => ({ oz: [], tbTchq: [] }),
  tinHieuDanhMuc: async (ma) => (String(ma) === MA ? [structuredClone(QD)] : []),
  tienLeMaKhac: async () => [],
  demKhoOz: async () => { goiNguon.demKhoOz += 1; return { tong: 4, maKhac: [{ maHs: MA_ANH_EM, dem: 4 }] }; },
});
const SHADOW = path.join(TEST_DATA_DIR, 'ho-so-shadow.jsonl');
const docShadow = () => { try { return fs.readFileSync(SHADOW, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
const xoaShadow = () => { try { fs.rmSync(SHADOW); } catch { /* */ } };
const reset = () => { goiLlm.length = 0; goiClassify.length = 0; fetchCalls = 0; goiNguon.demKhoOz = 0; goiNguon.identify = 0; goiNguon.webFacts = 0; xoaShadow(); };
const k2Of = (j, stt) => ((j?.dong || []).find((d) => d.stt === stt)?.kiem || []).filter((m) => m.nhom === 'K2');
const lineOf = (j, stt) => (j?.dong || []).find((d) => d.stt === stt);
const mucChinh = (j, stt) => k2Of(j, stt).find((m) => m && Object.prototype.hasOwnProperty.call(m, 'duKienQuyetDinh'));
const NHOM = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7'];
function batBien(kq) {
  const bad = [];
  for (const d of kq?.dong || []) {
    for (const n of NHOM) if (!d.kiem.some((m) => m.nhom === n)) bad.push(`dòng ${d.stt}: thiếu ${n}`);
    for (const m of d.kiem) {
      if (!['DAT', 'CANH_BAO', 'LOI', 'CHUA_KIEM'].includes(m.trangThai)) bad.push(`${d.stt} ${m.ma}: trangThai lạ`);
      if (!['RULE_TABLE', 'DETERMINISTIC', 'HEURISTIC', 'LLM_ASSERTED'].includes(m.basis)) bad.push(`${d.stt} ${m.ma}: basis lạ`);
      if (m.trangThai === 'LOI' && ['HEURISTIC', 'LLM_ASSERTED'].includes(m.basis)) bad.push(`${d.stt} ${m.ma}: LOI dựa ${m.basis}`);
      if (!Array.isArray(m.nguon) || !m.nguon.length || !m.nguon.every((x) => x?.backend === 'hs-code-api' && typeof x.duongDan === 'string')) bad.push(`${d.stt} ${m.ma}: nguon sai`);
      if (!Array.isArray(m.evidence) || !m.evidence.every((e) => typeof e === 'string')) bad.push(`${d.stt} ${m.ma}: evidence sai`);
      if (m.trangThai === 'CHUA_KIEM' && !String(m.lyDoChuaKiem || '').trim()) bad.push(`${d.stt} ${m.ma}: CHUA_KIEM thiếu lý do`);
    }
    const want = d.kiem.some((m) => m.trangThai === 'LOI') ? 'PHAI_SUA' : d.kiem.some((m) => m.trangThai === 'CANH_BAO') ? 'NEN_SUA' : 'SAN_SANG';
    if (d.mucSanSang !== want) bad.push(`dòng ${d.stt}: mucSanSang ${d.mucSanSang} ≠ ${want}`);
  }
  return bad;
}

// ═══ 1. Cờ tắt (mặc định) ⇒ bằng sâu ảnh chụp, không gọi động cơ hồ sơ ═══
reset();
const rOff = await goi(BODY);
check('off: 200', rOff._s === 200, rOff._s);
check('off: dong/tongQuan/goiY BẰNG SÂU ảnh chụp đường cũ (kiemMa)', bangSau(gon(rOff._j), ANH.kiemMa));
check('off: classify gọi mỗi dòng một lượt như cũ (5 dòng ⇒ 5 lượt)', goiClassify.length === 5, goiClassify.length);
check('off: không ghi dòng số đo', docShadow().length === 0);
check('off: không mục K2 nào mang trường hồ sơ', !JSON.stringify(rOff._j?.dong || []).includes('duKienQuyetDinh'));
process.env.HS_K2_LOI = 'on';
const rOffLoi = await goi(BODY);
check('off + HS_K2_LOI=on ⇒ vẫn bằng sâu ảnh chụp (cờ K2_LOI chỉ tác động đường mới)', bangSau(gon(rOffLoi._j), ANH.kiemMa));
delete process.env.HS_K2_LOI;
process.env.HS_HO_SO = 'zzz';
check('HS_HO_SO giá trị lạ ⇒ như off', bangSau(gon((await goi(BODY))._j), ANH.kiemMa));

// ═══ 2. shadow ⇒ bằng sâu ảnh chụp + một dòng số đo mỗi dòng lát 1 (chỉ số đếm) ═══
process.env.HS_HO_SO = 'shadow';
reset();
const rSh = await goi(BODY);
check('shadow: dong/tongQuan/goiY BẰNG SÂU ảnh chụp đường cũ', bangSau(gon(rSh._j), ANH.kiemMa));
const dsSh = docShadow();
const shK2 = dsSh.filter((r) => r.endpoint === 'declaration-check' && r.apDung !== false);
check('shadow: 3 dòng số đo declaration-check cho 3 dòng mã lát 1 áp dụng', shK2.length === 3, dsSh);
check('shadow: dòng "không áp dụng" cho mã lát 1 chưa duyệt', dsSh.some((r) => r.endpoint === 'declaration-check' && r.apDung === false && r.maHs === LAT1_CHUA_DUYET), dsSh);
check('shadow: mã ngoài lát 1 không ghi dòng', !dsSh.some((r) => r.maHs === NGOAI));
check('shadow: mọi khoá ⊆ KHOA_SHADOW (+ k2)', dsSh.every((r) => Object.keys(r).every((k) => API.KHOA_SHADOW.includes(k))), dsSh.map((r) => Object.keys(r)));
check('shadow: KHOA_SHADOW có k2', API.KHOA_SHADOW.includes('k2'));
check('shadow: k2 chỉ là số đếm / cờ (số hoặc boolean)', shK2.length === 3 && shK2.every((r) => r.k2 && typeof r.k2 === 'object' && Object.values(r.k2).every((v) => typeof v === 'number' || typeof v === 'boolean')), shK2.map((r) => r.k2));
const k2Mt = shK2.find((r) => r.trangThai === 'MAU_THUAN');
check('shadow: dòng MÂU THUẪN đếm soMauThuan ≥ 1, coCanCuTatDinh true, canPhanLoai true', k2Mt && k2Mt.k2.soMauThuan >= 1 && k2Mt.k2.coCanCuTatDinh === true && k2Mt.k2.canPhanLoai === true, k2Mt);
const k2Th = shK2.find((r) => r.trangThai === 'THIEU_DU_KIEN');
check('shadow: dòng THIẾU đếm soThieu ≥ 1, canPhanLoai false', k2Th && k2Th.k2.soThieu >= 1 && k2Th.k2.canPhanLoai === false, k2Th);
const rawSh = fs.existsSync(SHADOW) ? fs.readFileSync(SHADOW, 'utf8') : '';
check('shadow: tệp số đo KHÔNG chứa chữ khách (mô tả, cụm trích)', rawSh.length > 0 && !['Vỏ ngoài', 'thép không gỉ', 'giữ nhiệt', 'Nồi chiên', 'nắp nhựa'].some((s) => rawSh.includes(s)));
check('shadow: dòng có cheDo shadow', shK2.every((r) => r.cheDo === 'shadow'));
check('shadow: classify vẫn chỉ gọi theo đường cũ (5 lượt), soát không gọi thêm', goiClassify.length === 5, goiClassify.length);
const bcK2 = API.baoCaoShadow().k2;
check('báo cáo shadow: khối k2 cộng số đếm của 3 lượt soát (1 lượt có căn cứ tất định, 1 lượt cần phân loại)', bcK2 && bcK2.soLuot === 3 && bcK2.luotCoCanCuTatDinh === 1 && bcK2.luotCanPhanLoai === 1 && bcK2.soMauThuan >= 1 && bcK2.soThieu >= 1, bcK2);

// ═══ 3. on + mã ngoài lát 1 / lát 1 chưa duyệt ⇒ dòng đó bằng sâu ảnh chụp ═══
process.env.HS_HO_SO = 'on';
reset();
const rOn = await goi(BODY);
check('on: 200', rOn._s === 200, [rOn._s, rOn._j]);
check('on: dòng mã NGOÀI lát 1 bằng sâu ảnh chụp', bangSau(lineOf(rOn._j, 4), ANH.kiemMa.dong.find((d) => d.stt === 4)), lineOf(rOn._j, 4));
check('on: dòng mã lát 1 CHƯA duyệt bằng sâu ảnh chụp', bangSau(lineOf(rOn._j, 5), ANH.kiemMa.dong.find((d) => d.stt === 5)));
check('on: bất biến KetQuaSoat (đủ 7 nhóm, không LOI dựa HEURISTIC/LLM, mucSanSang khớp)', batBien(rOn._j).length === 0, batBien(rOn._j));
check('on: global on không ghi dòng số đo', docShadow().filter((r) => r.apDung !== false).length === 0, docShadow());

// ═══ 4. on + lát 1: K2 mới ═══
const tenCls = goiClassify.map((c) => c.tenHang);
check('spy classify: KHÔNG gọi cho dòng đủ căn cứ (mọi ranh giới CO)', !tenCls.includes(MO_TA_MAU), tenCls);
check('spy classify: KHÔNG gọi cho dòng thiếu dữ kiện (ranh giới THIEU)', !tenCls.includes(MO_TA_BO), tenCls);
check('spy classify: GỌI đúng một lượt cho dòng MÂU THUẪN', tenCls.filter((t) => t === MO_TA_DOI).length === 1, tenCls);
check('spy classify: mọi lượt classify trong withPrivateData', goiClassify.every((c) => c.rieng), goiClassify);
check('mọi lượt LLM (nếu có) trong withPrivateData', goiLlm.every((c) => c.rieng), goiLlm);
check('không gọi mạng, không tra web/identify trong soát', fetchCalls === 0 && goiNguon.identify === 0 && goiNguon.webFacts === 0, { fetchCalls, goiNguon });

// 4a. đổi anh em
const mDoi = mucChinh(rOn._j, 2);
check('đổi anh em: có mục K2 hồ sơ', Boolean(mDoi), k2Of(rOn._j, 2));
check('đổi anh em: K2 CANH_BAO (HS_K2_LOI tắt)', mDoi && mDoi.trangThai === 'CANH_BAO', mDoi && mDoi.trangThai);
check('đổi anh em: coCanCuTatDinh true', mDoi && mDoi.coCanCuTatDinh === true, mDoi && mDoi.coCanCuTatDinh);
check('đổi anh em: basis RULE_TABLE (ranh giới đã duyệt, trích nguyên văn)', mDoi && mDoi.basis === 'RULE_TABLE', mDoi && mDoi.basis);
check(`đổi anh em: khungNghiNgo.maNghiNgo = ${MA_ANH_EM} (dòng anh em của bộ đề)`, mDoi && mDoi.khungNghiNgo && mDoi.khungNghiNgo.maNghiNgo === MA_ANH_EM, mDoi && mDoi.khungNghiNgo);
check('đổi anh em: khungNghiNgo có noiDungNghiNgo + tieuChiPhanBiet[] trích nguyên văn ranh giới', mDoi && typeof mDoi.khungNghiNgo.noiDungNghiNgo === 'string' && mDoi.khungNghiNgo.noiDungNghiNgo.length > 0
  && Array.isArray(mDoi.khungNghiNgo.tieuChiPhanBiet) && mDoi.khungNghiNgo.tieuChiPhanBiet.some((t) => t && t.canCu && typeof t.canCu.trich === 'string' && t.canCu.trich.length > 0), mDoi && mDoi.khungNghiNgo);
const dqDoi = mDoi ? mDoi.duKienQuyetDinh : [];
check('đổi anh em: duKienQuyetDinh có MAU_THUAN kèm trích là đoạn con của câu khai', dqDoi.some((x) => x.ketQua === 'MAU_THUAN' && typeof x.trich === 'string' && x.trich && MO_TA_DOI.includes(x.trich)), dqDoi);
check('duKienQuyetDinh: ketQua chỉ CO | THIEU | MAU_THUAN, có fact', [...dqDoi, ...(mucChinh(rOn._j, 1)?.duKienQuyetDinh || []), ...(mucChinh(rOn._j, 3)?.duKienQuyetDinh || [])].every((x) => x && typeof x.fact === 'string' && ['CO', 'THIEU', 'MAU_THUAN'].includes(x.ketQua)));
check('đổi anh em: mục coCanCuTatDinh xếp ĐẦU danh sách K2', k2Of(rOn._j, 2)[0] === mDoi, k2Of(rOn._j, 2).map((m) => m.ma));
check('đổi anh em: cauSuaDeXuat theo dòng anh em (maHs, theoMa MA_TRO_TOI)', mDoi && mDoi.cauSuaDeXuat && mDoi.cauSuaDeXuat.maHs === MA_ANH_EM && mDoi.cauSuaDeXuat.theoMa === 'MA_TRO_TOI', mDoi && mDoi.cauSuaDeXuat);
check('đổi anh em: hoSo (ho-so@1) trên mục K2, ketLuan MAU_THUAN', mDoi && mDoi.hoSo && mDoi.hoSo.phienBan && mDoi.hoSo.phienBan.hoSo === 'ho-so@1' && mDoi.hoSo.ketLuan.trangThai === 'MAU_THUAN', mDoi && mDoi.hoSo && mDoi.hoSo.ketLuan);
check('đổi anh em: classify chạy ⇒ dòng có ketQuaPhanLoai (nguyên văn classify)', Boolean(lineOf(rOn._j, 2)?.ketQuaPhanLoai), lineOf(rOn._j, 2));
check('đổi anh em: tín hiệu QĐ 2079 thành mục K2 HEURISTIC CANH_BAO (không bao giờ căn cứ)', k2Of(rOn._j, 2).some((m) => m.ma === 'DANH_MUC_RUI_RO' && m.basis === 'HEURISTIC' && m.trangThai === 'CANH_BAO' && m.coCanCuTatDinh === false), k2Of(rOn._j, 2).map((m) => [m.ma, m.basis, m.trangThai]));
check('QĐ 2079 không nằm trong hoSo.canCu', mDoi && !/QD_2079|DANH_MUC_RUI_RO/.test(JSON.stringify(mDoi.hoSo.canCu || {})));
check('girRulesApplied trong hoSo.canCu đều có basis/evidence/source (lib/gir.js)', mDoi && (mDoi.hoSo.canCu.girRulesApplied || []).every((g) => g.basis && g.evidence && g.source));
check('goiYChuyenGia nêu dòng 2 mâu thuẫn có căn cứ tất định', (rOn._j?.goiYChuyenGia?.lyDo || []).some((s) => /Dòng 2/.test(s)), rOn._j?.goiYChuyenGia);

// 4b. bỏ dữ kiện
const mBo = mucChinh(rOn._j, 3);
check('bỏ dữ kiện: mục K2 hồ sơ CANH_BAO, coCanCuTatDinh false', mBo && mBo.trangThai === 'CANH_BAO' && mBo.coCanCuTatDinh === false, mBo && [mBo.trangThai, mBo.coCanCuTatDinh]);
const thieu = (mBo?.duKienQuyetDinh || []).filter((x) => x.ketQua === 'THIEU');
check('bỏ dữ kiện: duKienQuyetDinh có THIEU đúng fact của dữ kiện bị bỏ (laBoPhan ~ "hoàn chỉnh")', thieu.some((x) => x.fact === 'laBoPhan') && thieu.every((x) => x.trich == null), mBo?.duKienQuyetDinh);
check('bỏ dữ kiện: cauSuaDeXuat không rỗng — bản nháp có chỗ trống "[cần: …]"', mBo && mBo.cauSuaDeXuat && mBo.cauSuaDeXuat.banNhap === true && /\[cần:/.test(mBo.cauSuaDeXuat.moTaBanNhap || '') && mBo.cauSuaDeXuat.maHs === MA && mBo.cauSuaDeXuat.theoMa === 'MA_KHAI', mBo && mBo.cauSuaDeXuat);
check('bỏ dữ kiện: khungNghiNgo null (không có mâu thuẫn)', mBo && mBo.khungNghiNgo === null, mBo && mBo.khungNghiNgo);
check('bỏ dữ kiện: classify không chạy ⇒ không ketQuaPhanLoai / girRulesApplied cấp dòng', lineOf(rOn._j, 3) && !('ketQuaPhanLoai' in lineOf(rOn._j, 3)) && !('girRulesApplied' in lineOf(rOn._j, 3)));

// 4c. mô tả mẫu (đủ căn cứ)
const mMau = mucChinh(rOn._j, 1);
check('mô tả mẫu: mục K2 hồ sơ DAT', mMau && mMau.trangThai === 'DAT' && mMau.ma === 'HO_SO_DU_CAN_CU', mMau && [mMau.trangThai, mMau.ma]);
check('mô tả mẫu: duKienQuyetDinh toàn CO, có trích', mMau && mMau.duKienQuyetDinh.length > 0 && mMau.duKienQuyetDinh.every((x) => x.ketQua === 'CO' && MO_TA_MAU.includes(x.trich)), mMau && mMau.duKienQuyetDinh);
check('mô tả mẫu: cauSuaDeXuat là bản đạt (moTaEcus, không bản nháp)', mMau && mMau.cauSuaDeXuat && mMau.cauSuaDeXuat.banNhap === false && typeof mMau.cauSuaDeXuat.moTaEcus === 'string' && mMau.cauSuaDeXuat.moTaEcus.length > 0 && mMau.cauSuaDeXuat.moTaEcus.length <= 200, mMau && mMau.cauSuaDeXuat);

// 4d. quyền: cong-oz không bao giờ nhận tín hiệu kho Oz; erp (nội bộ) nhận
check('cong-oz: không chuỗi MO_TA_GIONG_MA_KHAC / KHO_TO_KHAI_OZ ở bất kỳ độ sâu nào', !/MO_TA_GIONG_MA_KHAC|KHO_TO_KHAI_OZ|NOI_BO_OZ|demKhoOz/.test(JSON.stringify(rOn._j)));
check('cong-oz: không gọi kho Oz', goiNguon.demKhoOz === 0, goiNguon);
check('khoá dịch vụ: có usage (mảng)', Array.isArray(rOn._j?.usage), rOn._j?.usage);
reset();
const rErp = await goi(BODY, { token: 'k-erp' });
check('erp (nội bộ): có mục K2 MO_TA_GIONG_MA_KHAC (chỉ số đếm) — HEURISTIC CANH_BAO', k2Of(rErp._j, 2).some((m) => m.ma === 'MO_TA_GIONG_MA_KHAC' && m.basis === 'HEURISTIC' && m.trangThai === 'CANH_BAO'), k2Of(rErp._j, 2).map((m) => m.ma));
const rApi = await goi(BODY, { token: 'test-token' });
check('HS_API_TOKEN: không tín hiệu kho Oz, không usage', !/MO_TA_GIONG_MA_KHAC|KHO_TO_KHAI_OZ/.test(JSON.stringify(rApi._j)) && !('usage' in (rApi._j || {})), rApi._s);

// ═══ 5. HS_K2_LOI ═══
reset();
process.env.HS_K2_LOI = 'on';
const rLoi = await goi(BODY);
const k2Loi = (rLoi._j?.dong || []).flatMap((d) => d.kiem.filter((m) => m.nhom === 'K2').map((m) => ({ ...m, stt: d.stt })));
check('HS_K2_LOI=on: mục coCanCuTatDinh (đổi anh em) thành LOI', mucChinh(rLoi._j, 2)?.trangThai === 'LOI', mucChinh(rLoi._j, 2)?.trangThai);
check('HS_K2_LOI=on: CHỈ mục coCanCuTatDinh + basis RULE_TABLE|DETERMINISTIC được LOI', k2Loi.filter((m) => m.trangThai === 'LOI').every((m) => m.coCanCuTatDinh === true && ['RULE_TABLE', 'DETERMINISTIC'].includes(m.basis)), k2Loi.filter((m) => m.trangThai === 'LOI').map((m) => [m.stt, m.ma]));
check('HS_K2_LOI=on: mục HEURISTIC (QĐ 2079) vẫn CANH_BAO', k2Loi.some((m) => m.ma === 'DANH_MUC_RUI_RO' && m.trangThai === 'CANH_BAO'), k2Loi.map((m) => [m.ma, m.trangThai]));
check('HS_K2_LOI=on: dòng thiếu dữ kiện vẫn CANH_BAO', mucChinh(rLoi._j, 3)?.trangThai === 'CANH_BAO');
check('HS_K2_LOI=on: dòng ngoài lát 1 vẫn bằng sâu ảnh chụp', bangSau(lineOf(rLoi._j, 4), ANH.kiemMa.dong.find((d) => d.stt === 4)));
check('HS_K2_LOI=on: bất biến (dòng 2 PHAI_SUA)', batBien(rLoi._j).length === 0 && lineOf(rLoi._j, 2)?.mucSanSang === 'PHAI_SUA', batBien(rLoi._j));
delete process.env.HS_K2_LOI;
const rKhongLoi = await goi(BODY);
check('HS_K2_LOI tắt: KHÔNG mục K2 nào LOI', !(rKhongLoi._j?.dong || []).some((d) => d.kiem.some((m) => m.nhom === 'K2' && m.trangThai === 'LOI')));

// ═══ 6. on không kiemMa ⇒ K2 CHUA_KIEM như cũ, không LLM, không classify ═══
reset();
const rKhong = await goi({ ...BODY, kiemMa: undefined });
check('on không kiemMa: bằng sâu ảnh chụp không kiemMa', bangSau(gon(rKhong._j), ANH.khongKiemMa));
check('on không kiemMa: không LLM, không classify', goiLlm.length === 0 && goiClassify.length === 0, { goiLlm, goiClassify });

// ═══ 7. Chạy thử nội bộ: shadow + HS_HO_SO_THU_CALLERS ═══
process.env.HS_HO_SO = 'shadow';
process.env.HS_HO_SO_THU_CALLERS = 'oz-noi-bo';
reset();
check('shadow + cong-oz không trong danh sách ⇒ bằng sâu ảnh chụp', bangSau(gon((await goi(BODY))._j), ANH.kiemMa));
reset();
const rThu = await goi(BODY, { token: 'k-noi' });
check('shadow + oz-noi-bo trong danh sách ⇒ K2 mới (chạy như on)', mucChinh(rThu._j, 2)?.coCanCuTatDinh === true && mucChinh(rThu._j, 2)?.hoSoMeta?.cheDo === 'on' && mucChinh(rThu._j, 2)?.hoSoMeta?.thuNoiBo === true, mucChinh(rThu._j, 2)?.hoSoMeta);
check('chạy thử: ghi dòng số đo cheDo "thu"', docShadow().filter((r) => r.endpoint === 'declaration-check' && r.apDung !== false).every((r) => r.cheDo === 'thu') && docShadow().some((r) => r.cheDo === 'thu'), docShadow());
process.env.HS_HO_SO = 'off';
check('off + oz-noi-bo trong danh sách ⇒ như off', bangSau(gon((await goi(BODY, { token: 'k-noi' }))._j), ANH.kiemMa));
delete process.env.HS_HO_SO_THU_CALLERS;

// ═══ 8. Lỗi tầng hồ sơ khi on ⇒ đường cũ cho dòng đó (không làm hỏng endpoint) ═══
process.env.HS_HO_SO = 'on';
if (SOAT) {
  const goc = SOAT._datLoiThu;
  if (typeof goc === 'function') {
    SOAT._datLoiThu(new Error('loi thu'));
    reset();
    const rL = await goi(BODY);
    SOAT._datLoiThu(null);
    check('lỗi soát (on) ⇒ dòng lát 1 trả đường cũ (bằng sâu ảnh chụp, trừ hoSoMeta lỗi)', [1, 2, 3].every((s) => { const l = structuredClone(lineOf(rL._j, s)); const hm = l && l.hoSoMeta; if (l) delete l.hoSoMeta; return hm && hm.loi === 'HO_SO_LOI' && bangSau(l, ANH.kiemMa.dong.find((d) => d.stt === s)); }), lineOf(rL._j, 2));
  } else check('soat.js có test seam _datLoiThu', false);
}

// ═══ 9. soat() trực tiếp — hợp đồng hàm ═══
if (SOAT) {
  reset();
  const s = await SOAT.soat({ maHs: MA, moTa: MO_TA_DOI }, { noiBo: false });
  check('soat(): trả hoSo, duKienQuyetDinh[], cauSuaDeXuat, coCanCuTatDinh, khungNghiNgo, canPhanLoai', s && s.hoSo && Array.isArray(s.duKienQuyetDinh) && s.cauSuaDeXuat && typeof s.coCanCuTatDinh === 'boolean' && 'khungNghiNgo' in s && typeof s.canPhanLoai === 'boolean', s && Object.keys(s));
  check('soat(): tự nó không gọi classify (việc của declaration-check)', goiClassify.length === 0, goiClassify);
  const s2 = await SOAT.soat({ maHs: MA, moTa: MO_TA_BO, duKien: [{ fact: 'laBoPhan', giaTri: false, nguon: 'KHACH', bangChung: 'hàng hoàn chỉnh, có vỏ và nắp' }] }, { noiBo: false });
  check('soat(): duKien bên gọi (nguồn KHACH) lấp dữ kiện thiếu ⇒ CO', s2.duKienQuyetDinh.some((x) => x.fact === 'laBoPhan' && x.ketQua === 'CO'), s2.duKienQuyetDinh);
  const s3 = await SOAT.soat({ maHs: MA, moTa: MO_TA_BO, duKien: [{ fact: 'laBoPhan', giaTri: false, nguon: 'TB_TCHQ' }] }, { noiBo: false });
  check('soat(): duKien nguồn TB_TCHQ từ bên gọi bị loại ⇒ vẫn THIEU', s3.duKienQuyetDinh.some((x) => x.fact === 'laBoPhan' && x.ketQua === 'THIEU'), s3.duKienQuyetDinh);
  check('canPhanLoai(): CHUA_SO_HOA ở ranh giới ⇒ true', SOAT.canPhanLoai({ duongDiPhapLy: [{ ketQua: 'CO' }, { ketQua: 'CHUA_SO_HOA' }] }) === true);
  check('canPhanLoai(): chỉ CO/THIEU ⇒ false', SOAT.canPhanLoai({ duongDiPhapLy: [{ ketQua: 'CO' }, { ketQua: 'THIEU' }] }) === false);
  check('canPhanLoai(): MAU_THUAN ⇒ true', SOAT.canPhanLoai({ duongDiPhapLy: [{ ketQua: 'MAU_THUAN' }] }) === true);
}

// ═══ 10. Đầu vào: dòng nhận hoSoId + duKien (Cổng L1-6c gửi theo maLuotPhanLoai) ═══
reset();
const HSID = '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const rId = await goi({ ngayDuKienDangKy: '2026-10-30', kiemMa: true, dongHang: [dong(1, MA, MO_TA_BO, { hoSoId: HSID, duKien: [{ fact: 'laBoPhan', giaTri: false, nguon: 'KHACH', bangChung: 'hàng hoàn chỉnh' }] })] });
const mId = mucChinh(rId._j, 1);
check('dòng có hoSoId + duKien ⇒ 200, duKien bên gọi được dùng (laBoPhan CO)', rId._s === 200 && mId && mId.duKienQuyetDinh.some((x) => x.fact === 'laBoPhan' && x.ketQua === 'CO'), [rId._s, mId && mId.duKienQuyetDinh]);
check('dòng có hoSoId ⇒ hoSoMeta.hoSoIdTruoc ghi lại (bộ não không tra cứu, luôn dựng lại)', mId && mId.hoSoMeta && mId.hoSoMeta.hoSoIdTruoc === HSID && mId.hoSo.hoSoId !== HSID, mId && mId.hoSoMeta);
const rBad = await goi({ dongHang: [dong(1, MA, MO_TA_BO, { hoSoId: 'abc' })] });
check('hoSoId không phải uuid ⇒ 400 DAU_VAO_SAI', rBad._s === 400 && rBad._j?.error === 'DAU_VAO_SAI', [rBad._s, rBad._j]);
const rBad2 = await goi({ dongHang: [dong(1, MA, MO_TA_BO, { duKien: 'x' })] });
check('duKien không phải mảng ⇒ 400 DAU_VAO_SAI', rBad2._s === 400 && rBad2._j?.error === 'DAU_VAO_SAI', [rBad2._s, rBad2._j]);
const rBad3 = await goi({ dongHang: [dong(1, MA, MO_TA_BO, { hoSo: { maHs: MA } })] });
check('hoSo bên gọi gửi ngược ⇒ 400 (trường không được phép — ranh giới tin cậy §8.1)', rBad3._s === 400, rBad3._s);

delete process.env.HS_HO_SO;
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
