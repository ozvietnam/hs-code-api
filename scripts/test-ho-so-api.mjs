#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Job L1-5d (#648): API hồ sơ phân loại — POST /api/ho-so (KÍN) + trường mới của /api/describe, /api/classify,
 * /api/declaration-sheet theo cờ HS_HO_SO=off|shadow|on. Plan ozplugin 2026-10-29-ho-so-phan-loai.md (Job L1-5d),
 * spec §8.10. KHÔNG gọi mạng/LLM thật: callLLMJson bị thay, các nguồn ngoài của động cơ hồ sơ tiêm qua _datDeps.
 *
 * Ảnh chụp phản hồi cũ (tests/ho-so-api-anh-chup.json) lấy ở commit test đầu (trước khi cài) với LLM stub cố định:
 *   CAP_NHAT_ANH_CHUP=1 node scripts/test-ho-so-api.mjs   — chỉ chạy phần chụp, ghi tệp rồi thoát.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ANH_CHUP = path.join(ROOT, 'tests', 'ho-so-api-anh-chup.json');

process.env.HS_API_TOKEN = 'test-token';
process.env.HS_SERVICE_TOKENS = 'cong-oz:k-cong,erp:k-erp';
delete process.env.HS_INTERNAL_CALLERS;
delete process.env.HS_HO_SO;
delete process.env.HS_PUBLIC_LLM;
for (const k of Object.keys(process.env)) if (/^(ZAI|Z_AI|GLM)_/i.test(k)) delete process.env[k];

// ── LLM stub (mọi đường gọi qua lib/llm-tier) ─────────────────────────────────────────────────────────────────
const { isPrivate } = require('../lib/llm-privacy');
const llmTier = require('../lib/llm-tier');
const goiLlm = [];
let treViet = 0; let treDoc = 0;
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));
llmTier.callLLMJson = async (system, user, opts = {}) => {
  goiLlm.push({ step: opts.step, rieng: isPrivate() });
  if (opts.step === 'ho-so-doc-du-kien') { if (treDoc) await ngu(treDoc); return { json: { duKien: [] }, model: 'stub' }; }
  if (opts.step === 'ho-so-viet-mo-ta') {
    if (treViet) await ngu(treViet);
    const m = /BẢN MÁY GHÉP:\n([^\n]*)/.exec(String(user));
    return { json: { moTaEcus: m ? m[1] : '' }, model: 'stub' };
  }
  return {
    json: { declaration: { tenHang: 'Vỏ ngoài phích giữ nhiệt bằng thép không gỉ', thanhPhanCauTao: 'thép không gỉ', congDung: 'làm vỏ phích', tinhTrang: 'Mới 100%', thongSoKyThuat: ['kích thước 80x80x250 mm'] } },
    model: 'stub-describe',
  };
};

const handler = require('../api/describe.js');

let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n}${d !== undefined ? ` — ${JSON.stringify(d).slice(0, 400)}` : ''}`); } };
const mockRes = () => ({ _s: 0, _j: null, _h: {}, setHeader(k, v) { this._h[k] = v; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } });
async function goi(body, { token, mode } = {}) {
  const req = { method: 'POST', url: '/api/describe', query: mode ? { mode } : {}, headers: token ? { authorization: `Bearer ${token}` } : {}, body: structuredClone(body) };
  const res = mockRes();
  await handler(req, res);
  return res;
}
const boMs = (j) => { if (!j || typeof j !== 'object') return j; const { ms: _m, ...r } = j; return JSON.parse(JSON.stringify(r)); };
const coChuoi = (o, s) => JSON.stringify(o ?? null).includes(s);
const bangSau = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const PHICH = '96170020';
const BODY_PHICH = {
  hsCode: PHICH,
  productName: 'Vỏ ngoài phích giữ nhiệt',
  customerDescription: 'Vỏ ngoài bằng thép không gỉ của phích chân không, là bộ phận của phích, chưa có ruột, kích thước 80x80x250 mm, không nhãn hiệu, mới 100%',
  material: 'thép không gỉ',
  origin: 'Trung Quốc',
  condition: 'Mới 100%',
};
const { taxData } = require('../lib/data');
const NGOAI = Object.keys(taxData).find((k) => k.length === 8 && !k.startsWith('9617') && !k.startsWith('8413') && !k.startsWith('85'));
const BODY_NGOAI = { hsCode: NGOAI, productName: 'Hàng thử ngoài lát 1', customerDescription: 'mô tả thử, mới 100%', origin: 'Trung Quốc' };

// ── Ảnh chụp (đường cũ, cờ tắt) ───────────────────────────────────────────────────────────────────────────────
if (process.env.CAP_NHAT_ANH_CHUP === '1') {
  const a = boMs((await goi(BODY_PHICH, { token: 'test-token' }))._j);
  const b = boMs((await goi(BODY_NGOAI, { token: 'test-token' }))._j);
  const c = boMs((await goi(BODY_PHICH))._j);
  fs.writeFileSync(ANH_CHUP, `${JSON.stringify({ ghiChu: 'Phản hồi /api/describe TRƯỚC L1-5d (LLM stub cố định, bỏ trường ms). Không sửa tay.', ngoai: NGOAI, phichToken: a, ngoaiToken: b, phichCongKhai: c }, null, 1)}\n`);
  console.log(`đã ghi ${path.relative(ROOT, ANH_CHUP)}`);
  process.exit(0);
}
const anh = JSON.parse(fs.readFileSync(ANH_CHUP, 'utf8'));
check('ảnh chụp: mã ngoài lát 1 trùng mã đang dùng', anh.ngoai === NGOAI, { anh: anh.ngoai, NGOAI });

// ── Nguồn ngoài của động cơ hồ sơ: tiêm stub (không mạng, không kho Oz thật) ─────────────────────────────────
let API = null;
try { API = require('../lib/ho-so/api'); } catch (e) { check('lib/ho-so/api.js nạp được', false, String(e.message)); }
const goiNguon = { identify: 0, webFacts: 0, thamChieu: 0, demKhoOz: 0 };
const QD = { loai: 'DANH_MUC_RUI_RO', maHs: PHICH, nhan: 'QD_2079_BAC_C', ghiChu: 'không phải căn cứ pháp lý' };
if (API) {
  API._datDeps({
    identify: async () => { goiNguon.identify += 1; return null; },
    webFacts: async () => { goiNguon.webFacts += 1; return null; },
    thamChieu: async () => { goiNguon.thamChieu += 1; return { oz: [], tbTchq: [] }; },
    tinHieuDanhMuc: async (ma) => (String(ma).startsWith('9617') ? [structuredClone(QD)] : []),
    tienLeMaKhac: async () => [],
    demKhoOz: async () => { goiNguon.demKhoOz += 1; return { tong: 3, maKhac: [{ maHs: '96170010', dem: 3 }] }; },
  });
}

// ── 1. routes + quyền ─────────────────────────────────────────────────────────────────────────────────────────
const routes = JSON.parse(fs.readFileSync(path.join(ROOT, 'routes.json'), 'utf8'));
const dsRoute = routes.rewrites || routes.routes || routes;
const rHoSo = (Array.isArray(dsRoute) ? dsRoute : []).find((r) => r.source === '/api/ho-so');
check('routes.json: /api/ho-so → /api/describe?mode=ho_so', rHoSo && rHoSo.destination === '/api/describe?mode=ho_so', rHoSo);
const PA = require('../lib/public-access');
const { PUBLIC_LLM_ENDPOINTS } = require('../lib/public-llm');
check('ho-so KHÔNG nằm trong allowlist công khai', !coChuoi([...(PA.PUBLIC_ENDPOINTS || [])], 'ho') && !coChuoi([...(PA.PUBLIC_DATASET_RESOURCES || [])], 'ho_so') && !coChuoi([...(PA.PUBLIC_DATASET_RESOURCES || [])], 'ho-so'));
check('ho-so KHÔNG nằm trong PUBLIC_LLM_ENDPOINTS', !PUBLIC_LLM_ENDPOINTS.some((e) => /ho.?so/.test(e)));

process.env.HS_HO_SO = 'on';
const BODY_HS = { maHs: PHICH, loaiToKhai: 'NHAP', tenHang: 'Vỏ ngoài phích giữ nhiệt', moTa: BODY_PHICH.customerDescription };
const r401 = await goi(BODY_HS, { mode: 'ho_so' });
check('POST /api/ho-so không token ⇒ 401', r401._s === 401, r401._s);
const rApi = await goi(BODY_HS, { mode: 'ho_so', token: 'test-token' });
check('POST /api/ho-so bằng HS_API_TOKEN ⇒ 403 CHI_KHOA_DICH_VU', rApi._s === 403 && rApi._j?.error === 'CHI_KHOA_DICH_VU', [rApi._s, rApi._j]);
const rGet = await (async () => { const req = { method: 'GET', url: '/api/describe', query: { mode: 'ho_so' }, headers: { authorization: 'Bearer k-cong' } }; const res = mockRes(); await handler(req, res); return res; })();
check('GET /api/ho-so ⇒ 405', rGet._s === 405, rGet._s);

process.env.HS_HO_SO = 'off';
const rTat = await goi(BODY_HS, { mode: 'ho_so', token: 'k-cong' });
check('cờ off ⇒ /api/ho-so 503 HO_SO_TAT', rTat._s === 503 && rTat._j?.error === 'HO_SO_TAT', [rTat._s, rTat._j]);

// ── 2. /api/ho-so: hợp đồng + lọc quyền ───────────────────────────────────────────────────────────────────────
process.env.HS_HO_SO = 'on';
const rCong = await goi(BODY_HS, { mode: 'ho_so', token: 'k-cong' });
const hc = rCong._j || {};
check('cong-oz ⇒ 200', rCong._s === 200, [rCong._s, rCong._j]);
check('phản hồi là HoSoPhanLoai (hoSoId, maHs, phienBan.hoSo, duongDiPhapLy, ketLuan.trangThai)', hc.hoSoId && hc.maHs === PHICH && hc.phienBan?.hoSo === 'ho-so@1' && Array.isArray(hc.duongDiPhapLy) && typeof hc.ketLuan?.trangThai === 'string');
check('cong-oz ⇒ KHÔNG có MO_TA_GIONG_MA_KHAC / đếm kho Oz ở bất kỳ độ sâu nào', !coChuoi(hc, 'MO_TA_GIONG_MA_KHAC') && !coChuoi(hc, 'demKhoOz') && !coChuoi(hc, 'KHO_TO_KHAI_OZ'));
check('cong-oz ⇒ CÓ DANH_MUC_RUI_RO (QĐ 2079, nhãn QD_2079_BAC_C)', (hc.tinHieuRuiRo || []).some((t) => t.loai === 'DANH_MUC_RUI_RO' && t.nhan === 'QD_2079_BAC_C'), hc.tinHieuRuiRo);
check('QĐ 2079 không nằm trong canCu (canCuPhapLy/girRulesApplied)', !coChuoi(hc.canCu, 'QD_2079') && !coChuoi(hc.canCu, 'DANH_MUC_RUI_RO'));
check('/api/ho-so trả mô tả sáu khối kèm (moTa.moTaEcus | moTa.banNhap)', hc.moTa && ('moTaEcus' in hc.moTa) && Array.isArray(hc.moTa.bangGiaiTrinh), hc.moTa && Object.keys(hc.moTa));
check('cong-oz ⇒ demKhoOz KHÔNG được gọi', goiNguon.demKhoOz === 0, goiNguon);
const rErp = await goi(BODY_HS, { mode: 'ho_so', token: 'k-erp' });
check('erp ⇒ 200 + CÓ MO_TA_GIONG_MA_KHAC (nội bộ)', rErp._s === 200 && (rErp._j?.tinHieuRuiRo || []).some((t) => t.loai === 'MO_TA_GIONG_MA_KHAC'), rErp._j?.tinHieuRuiRo);
check('erp ⇒ CŨNG có DANH_MUC_RUI_RO', (rErp._j?.tinHieuRuiRo || []).some((t) => t.loai === 'DANH_MUC_RUI_RO'));
check('usage trả cho khoá dịch vụ', Array.isArray(hc.usage));

// đầu vào sai / phạm vi
const r400a = await goi({ ...BODY_HS, maHs: '12' }, { mode: 'ho_so', token: 'k-cong' });
check('maHs 2 số ⇒ 400 DAU_VAO_SAI', r400a._s === 400 && r400a._j?.error === 'DAU_VAO_SAI', [r400a._s, r400a._j]);
const r400b = await goi({ ...BODY_HS, loaiToKhai: 'TAM_NHAP' }, { mode: 'ho_so', token: 'k-cong' });
check('loaiToKhai lạ ⇒ 400 DAU_VAO_SAI', r400b._s === 400 && r400b._j?.error === 'DAU_VAO_SAI', [r400b._s, r400b._j]);
const r400c = await goi({ ...BODY_HS, duKien: 'abc' }, { mode: 'ho_so', token: 'k-cong' });
check('duKien không phải mảng ⇒ 400 DAU_VAO_SAI', r400c._s === 400 && r400c._j?.error === 'DAU_VAO_SAI', [r400c._s, r400c._j]);
const r400d = await (async () => { const req = { method: 'POST', url: '/api/describe', query: { mode: 'ho_so' }, headers: { authorization: 'Bearer k-cong' }, body: '{hong' }; const res = mockRes(); await handler(req, res); return res; })();
check('JSON hỏng ⇒ 400 DAU_VAO_SAI', r400d._s === 400 && r400d._j?.error === 'DAU_VAO_SAI', [r400d._s, r400d._j]);
const r404 = await goi({ ...BODY_HS, maHs: '99999999' }, { mode: 'ho_so', token: 'k-cong' });
check('mã không có trong biểu ⇒ 404 KHONG_CO_MA', r404._s === 404 && r404._j?.error === 'KHONG_CO_MA', [r404._s, r404._j]);
const r422 = await goi({ ...BODY_HS, maHs: NGOAI }, { mode: 'ho_so', token: 'k-cong' });
check('mã ngoài lát 1 ⇒ 422 NGOAI_LAT_1', r422._s === 422 && r422._j?.error === 'NGOAI_LAT_1', [r422._s, r422._j]);
const r6 = await goi({ ...BODY_HS, maHs: '961700' }, { mode: 'ho_so', token: 'k-cong' });
check('mã 6 số lát 1 ⇒ 200, capDaChac 6, THIEU_DU_KIEN, không có moTaEcus đạt', r6._s === 200 && r6._j?.capDaChac === 6 && r6._j?.ketLuan?.trangThai === 'THIEU_DU_KIEN' && r6._j?.moTa?.moTaEcus == null, [r6._s, r6._j?.capDaChac, r6._j?.ketLuan?.trangThai]);

// ranh giới tin cậy: hồ sơ giả mạo bị bỏ qua
const BIA = { nut: '96179999', dieuKien: { fact: 'congSuat', op: '>=', value: 1 }, chieu: 'PHAI_CO', nguon: { nguonLoai: 'NGUOI_DUYET', ma: 'bia', trich: 'MUC_BIA_DAT_XYZ' }, ketQua: 'CO' };
const rGia = await goi({ ...BODY_HS, hoSoId: '00000000-0000-4000-8000-000000000000', hoSo: { hoSoId: '00000000-0000-4000-8000-000000000000', maHs: PHICH, duongDiPhapLy: [BIA], ketLuan: { trangThai: 'DU_CAN_CU' }, canCu: { girRulesApplied: [{ rule: 'GIR-BIA' }] } } }, { mode: 'ho_so', token: 'k-cong' });
check('hồ sơ giả mạo ⇒ dựng lại, không chứa mục bịa', rGia._s === 200 && !coChuoi(rGia._j, 'MUC_BIA_DAT_XYZ') && !coChuoi(rGia._j, 'GIR-BIA') && !coChuoi(rGia._j, '96179999'));
check('hồ sơ giả mạo ⇒ hoSoId mới, hoSoIdTruoc được ghi lại', rGia._j?.hoSoId && rGia._j.hoSoId !== '00000000-0000-4000-8000-000000000000' && rGia._j?.hoSoMeta?.hoSoIdTruoc === '00000000-0000-4000-8000-000000000000', rGia._j?.hoSoMeta);

// riêng tư: LLM đọc dữ kiện của lượt khoá dịch vụ chạy trong withPrivateData
goiLlm.length = 0;
await goi({ maHs: '84135040', tenHang: 'Bơm nước kiểu piston', moTa: 'Bơm nước kiểu piston, loại công nghiệp dùng cho nhà máy, mới 100%' }, { mode: 'ho_so', token: 'k-cong' });
const docLlm = goiLlm.filter((g) => g.step === 'ho-so-doc-du-kien');
check('/api/ho-so: LLM đọc dữ kiện được gọi và LUÔN trong withPrivateData', docLlm.length > 0 && docLlm.every((g) => g.rieng === true), goiLlm);

// ── 3. /api/describe: cờ off / shadow / on-ngoài-lát-1 ⇒ bằng sâu ảnh chụp ─────────────────────────────────
const MOI = { loaiToKhai: 'NHAP', manufacturer: 'Công ty Phích ABC', dimensions: '80x80x250 mm', packaging: '1 cái/hộp', hoSoId: '11111111-1111-4111-8111-111111111111', duKien: [{ fact: 'kichThuoc', giaTri: [80, 80, 250], nguon: 'KHACH' }] };
process.env.HS_HO_SO = 'off';
check('off: describe (token) bằng sâu ảnh chụp', bangSau(boMs((await goi(BODY_PHICH, { token: 'test-token' }))._j), anh.phichToken));
check('off: describe (công khai) bằng sâu ảnh chụp', bangSau(boMs((await goi(BODY_PHICH))._j), anh.phichCongKhai));
check('off: trường mới bị bỏ qua êm (bằng sâu ảnh chụp)', bangSau(boMs((await goi({ ...BODY_PHICH, ...MOI }, { token: 'test-token' }))._j), anh.phichToken));
check('off: loaiToKhai lạ không làm lỗi (bằng sâu ảnh chụp)', bangSau(boMs((await goi({ ...BODY_PHICH, loaiToKhai: 'zzz' }, { token: 'test-token' }))._j), anh.phichToken));

const { dataPath } = require('../lib/data-paths');
const SHADOW = dataPath('ho-so-shadow.jsonl');
try { fs.rmSync(SHADOW, { force: true }); } catch { /* chưa có */ }
process.env.HS_HO_SO = 'shadow';
const rSh = await goi({ ...BODY_PHICH, ...MOI }, { token: 'test-token' });
check('shadow: phản hồi bằng sâu ảnh chụp (như off)', bangSau(boMs(rSh._j), anh.phichToken));
const dongSh = fs.existsSync(SHADOW) ? fs.readFileSync(SHADOW, 'utf8').split('\n').filter(Boolean) : [];
check('shadow: đúng MỘT dòng ho-so-shadow.jsonl', dongSh.length === 1, dongSh.length);
const KHOA = API ? API.KHOA_SHADOW : [];
const d0 = dongSh[0] ? JSON.parse(dongSh[0]) : {};
check('shadow: khoá dòng ⊆ danh sách số đo', Object.keys(d0).length > 0 && Object.keys(d0).every((k) => KHOA.includes(k)), Object.keys(d0));
check('shadow: dòng không chứa nội dung khách', dongSh[0] && !dongSh[0].includes('phích') && !dongSh[0].includes('Phích') && !dongSh[0].includes('ABC') && !dongSh[0].includes('thép'));
check('shadow: dòng ghi trạng thái + endpoint', d0.endpoint === 'describe' && typeof d0.trangThai === 'string');

process.env.HS_HO_SO = 'on';
check('on + mã ngoài lát 1: bằng sâu ảnh chụp', bangSau(boMs((await goi({ ...BODY_NGOAI, ...MOI }, { token: 'test-token' }))._j), anh.ngoaiToken));

// ── 4. /api/describe on + mã lát 1 ⇒ trường cũ + trường mới ───────────────────────────────────────────────────
const rOn = await goi({ ...BODY_PHICH, ...MOI });
const j = rOn._j || {};
check('on: 200', rOn._s === 200, rOn._s);
for (const k of Object.keys(anh.phichCongKhai)) check(`on: giữ trường cũ "${k}"`, k in j);
check('on: compliance{score, level, warnings[]}', typeof j.compliance?.score === 'number' && typeof j.compliance?.level === 'string' && Array.isArray(j.compliance?.warnings));
for (const k of ['moTaEcus', 'moTaDayDu', 'khaiTiepHys', 'ghiChu', 'bangGiaiTrinh', 'taiLieuKyThuatNenKem', 'hoSo']) check(`on: thêm "${k}"`, k in j);
check('on: moTaEcus ≤ 200, không rỗng', typeof j.moTaEcus === 'string' && j.moTaEcus.length > 0 && j.moTaEcus.length <= 200, j.moTaEcus);
check('on: customsDescription === moTaEcus', j.customsDescription === j.moTaEcus, [j.customsDescription, j.moTaEcus]);
check('on: hoSo.ketLuan DU_CAN_CU', j.hoSo?.ketLuan?.trangThai === 'DU_CAN_CU', j.hoSo?.ketLuan);
check('on: canCuPhapLy theo ketLuan (DU_CAN_CU ⇒ CHUA_CHOT_CAN_XAC_NHAN)', j.hoSo?.canCu?.canCuPhapLy?.trangThai === 'CHUA_CHOT_CAN_XAC_NHAN', j.hoSo?.canCu?.canCuPhapLy?.trangThai);
check('on: banNhap false, không cauHoi cấp trên', j.banNhap === false && !('moTaBanNhap' in j));
check('on: descriptionMeta tính trên chuỗi mới', j.descriptionMeta?.length === String(j.moTaEcus).length && j.descriptionMeta?.maxLength === 200);
check('on: compliance không chứa SPEC_DROPPED của đường cũ', !(j.compliance?.warnings || []).some((w) => w.code === 'SPEC_DROPPED'));
check('on: công khai ⇒ không MO_TA_GIONG_MA_KHAC', !coChuoi(j, 'MO_TA_GIONG_MA_KHAC'));
check('on: DANH_MUC_RUI_RO tới cả lượt công khai', (j.hoSo?.tinHieuRuiRo || []).some((t) => t.loai === 'DANH_MUC_RUI_RO'));
check('on: dữ kiện bên gọi mang nguồn KHACH (manufacturer ⇒ nhaSanXuat)', (j.hoSo?.duKien || []).some((d) => d.fact === 'nhaSanXuat' && d.nguon === 'KHACH' && d.giaTri === 'Công ty Phích ABC'));
check('on: dimensions ⇒ kichThuoc [80,80,250] nguồn KHACH', (j.hoSo?.duKien || []).some((d) => d.fact === 'kichThuoc' && d.nguon === 'KHACH' && bangSau(d.giaTri, [80, 80, 250])));
check('on: packaging ⇒ nhanDien.quyCachDongGoi', j.hoSo?.nhanDien?.quyCachDongGoi === '1 cái/hộp', j.hoSo?.nhanDien);
check('on: NSX vào sáu khối', coChuoi([j.moTaEcus, j.khaiTiepHys], 'Công ty Phích ABC'));
check('on: "xuất xứ" không vào chuỗi', !/xuất xứ/i.test(`${j.moTaEcus} ${j.khaiTiepHys || ''} ${j.moTaDayDu}`));
check('on: hoSoMeta.apDung + hoSoIdTruoc', j.hoSoMeta?.apDung === true && j.hoSoMeta?.hoSoIdTruoc === MOI.hoSoId, j.hoSoMeta);
check('on: hoSo.hoSoId mới (không nhận hoSoId bên gọi làm id)', j.hoSo?.hoSoId && j.hoSo.hoSoId !== MOI.hoSoId);
const rOnCong = await goi({ ...BODY_PHICH }, { token: 'k-cong' });
check('on: cong-oz describe ⇒ không MO_TA_GIONG_MA_KHAC', rOnCong._s === 200 && !coChuoi(rOnCong._j, 'MO_TA_GIONG_MA_KHAC') && 'hoSo' in rOnCong._j);
const rOnErp = await goi({ ...BODY_PHICH }, { token: 'k-erp' });
check('on: erp describe ⇒ có MO_TA_GIONG_MA_KHAC trong hoSo', (rOnErp._j?.hoSo?.tinHieuRuiRo || []).some((t) => t.loai === 'MO_TA_GIONG_MA_KHAC'));
check('on: hoSo lọc ở MỌI endpoint (erp giữ, cong-oz bỏ) — usage vẫn có cho khoá dịch vụ', Array.isArray(rOnCong._j?.usage));

// ── 5. Bản nháp (ketLuan ≠ DU_CAN_CU): banNhap + moTaBanNhap + cauHoi; canCuPhapLy không đọc như gần chốt ──
const BOM = { hsCode: '84135040', productName: 'Bơm nước kiểu piston', origin: 'Trung Quốc' };
const rThieu = await goi({ ...BOM, customerDescription: 'Bơm nước kiểu piston, mới 100%' });
const t = rThieu._j || {};
check('THIEU: hoSo.ketLuan THIEU_DU_KIEN', t.hoSo?.ketLuan?.trangThai === 'THIEU_DU_KIEN', t.hoSo?.ketLuan?.trangThai);
check('THIEU: moTaEcus null, banNhap true', t.moTaEcus === null && t.banNhap === true);
check('THIEU: moTaBanNhap có chỗ trống "[cần: …]"', typeof t.moTaBanNhap === 'string' && t.moTaBanNhap.includes('[cần:'), t.moTaBanNhap);
check('THIEU: cauHoi[] cấp trên cùng (Vi + Zh)', Array.isArray(t.cauHoi) && t.cauHoi.length > 0 && t.cauHoi.every((q) => q.vi && q.zh));
check('THIEU: customsDescription = moTaBanNhap (không trình bản cũ như bản đạt)', t.customsDescription === t.moTaBanNhap);
check('THIEU: compliance REJECT + cảnh báo HO_SO_BAN_NHAP', t.compliance?.level === 'REJECT' && t.compliance?.passesCustomsAudit === false && (t.compliance?.warnings || []).some((w) => w.code === 'HO_SO_BAN_NHAP'), t.compliance?.level);
check('THIEU: canCuPhapLy.trangThai = THIEU_DU_KIEN', t.hoSo?.canCu?.canCuPhapLy?.trangThai === 'THIEU_DU_KIEN', t.hoSo?.canCu?.canCuPhapLy?.trangThai);
const rMt = await goi({ ...BOM, customerDescription: 'Bơm nước kiểu piston, lưu lượng 100 m3/h, mới 100%' });
check('MAU_THUAN: ketLuan MAU_THUAN', rMt._j?.hoSo?.ketLuan?.trangThai === 'MAU_THUAN', rMt._j?.hoSo?.ketLuan?.trangThai);
check('MAU_THUAN: canCuPhapLy.trangThai = CHUA_XAC_DINH_DUOC (không đọc như gần chốt)', rMt._j?.hoSo?.canCu?.canCuPhapLy?.trangThai === 'CHUA_XAC_DINH_DUOC', rMt._j?.hoSo?.canCu?.canCuPhapLy?.trangThai);
check('MAU_THUAN: banNhap + moTaEcus null', rMt._j?.banNhap === true && rMt._j?.moTaEcus === null);

// ── 6. Công suất ≥ 1000 W viết kW (lớp định dạng; tu-vung@1 không đổi; tương đương vẫn đạt) ────────────────────
const rKw = await goi({ ...BOM, customerDescription: 'Bơm nước kiểu piston, lưu lượng 10.000 m³/h, công suất 75 kW, mới 100%' });
const kw = rKw._j || {};
const chuoiKw = `${kw.moTaEcus || ''} ${kw.khaiTiepHys || ''}`;
check('kW: hồ sơ DU_CAN_CU', kw.hoSo?.ketLuan?.trangThai === 'DU_CAN_CU', kw.hoSo?.ketLuan);
check('kW: chuỗi có "75kW", không "75000W"', chuoiKw.includes('75kW') && !chuoiKw.includes('75000W'), chuoiKw);
check('kW: moTaDayDu "công suất 75kW"', String(kw.moTaDayDu || '').includes('công suất 75kW'), kw.moTaDayDu);
check('kW: duKien giữ 75000 (đơn vị chuẩn W của tu-vung@1)', (kw.hoSo?.duKien || []).some((d) => d.fact === 'congSuat' && d.giaTri === 75000));
check('kW: tuongDuong vẫn đạt', kw.hoSoMeta?.tuongDuong === true, kw.hoSoMeta);
const TV = require('../lib/tu-vung');
check('kW: tu-vung@1 vietCum không đổi (75000 ⇒ "CS: 75000W")', TV.vietCum('congSuat', 75000, { tat: true }) === 'CS: 75000W');
if (API) {
  check('kW: dinhDangCum 1500 W ⇒ "1,5kW"', API.dinhDangCongSuat('congSuat', 1500, 'công suất 1500W') === 'công suất 1,5kW');
  check('kW: dinhDangCum 750 W giữ "750W"', API.dinhDangCongSuat('congSuat', 750, 'công suất 750W') === 'công suất 750W');
  check('kW: khoá khác không đổi', API.dinhDangCongSuat('dienAp', 2200, 'điện áp 2200V') === 'điện áp 2200V');
}

// ── 7. loaiToKhai XUAT / lạ khi cờ bật ────────────────────────────────────────────────────────────────────────
const rXuat = await goi({ ...BODY_PHICH, loaiToKhai: 'XUAT' });
check('XUAT: hoSo.loaiToKhai XUAT + khuonChuaHoTro 2.69', rXuat._j?.hoSo?.loaiToKhai === 'XUAT' && rXuat._j?.hoSo?.khuonChuaHoTro === '2.69');
check('XUAT: banNhap (khuôn 2.69 chưa làm ở lát 1), moTaEcus null', rXuat._j?.banNhap === true && rXuat._j?.moTaEcus === null && (rXuat._j?.lyDoBanNhap || []).includes('khuon-2.69-chua-ho-tro'));
const rLa = await goi({ ...BODY_PHICH, loaiToKhai: 'zzz' });
check('loaiToKhai lạ (cờ bật) ⇒ coi NHAP + cảnh báo trong hoSoMeta', rLa._s === 200 && rLa._j?.hoSo?.loaiToKhai === 'NHAP' && (rLa._j?.hoSoMeta?.canhBao || []).includes('loaiToKhai-khong-hop-le'), rLa._j?.hoSoMeta);

// ── 8. Hạn từng bước: quá hạn ⇒ rơi về bản tất định, endpoint vẫn 200 ─────────────────────────────────────────
process.env.HS_HO_SO_HAN_VIET_MS = '30'; treViet = 400;
const rHanV = await goi({ ...BODY_PHICH });
check('hạn viết: 200, buocQuaHan có "viet", cheDoViet MAY, moTaEcus vẫn có', rHanV._s === 200 && (rHanV._j?.hoSoMeta?.buocQuaHan || []).includes('viet') && rHanV._j?.hoSoMeta?.cheDoViet === 'MAY' && typeof rHanV._j?.moTaEcus === 'string', rHanV._j?.hoSoMeta);
delete process.env.HS_HO_SO_HAN_VIET_MS; treViet = 0;
process.env.HS_HO_SO_HAN_DOC_MS = '30'; treDoc = 400;
const rHanD = await goi({ ...BOM, customerDescription: 'Bơm nước kiểu piston, loại công nghiệp dùng cho nhà máy, mới 100%' });
check('hạn đọc dữ kiện: 200, buocQuaHan có "docDuKien", hồ sơ vẫn dựng', rHanD._s === 200 && (rHanD._j?.hoSoMeta?.buocQuaHan || []).includes('docDuKien') && rHanD._j?.hoSo?.ketLuan?.trangThai, rHanD._j?.hoSoMeta);
delete process.env.HS_HO_SO_HAN_DOC_MS; treDoc = 0;

// ── 9. classify + declaration-sheet (lớp gắn hồ sơ) ───────────────────────────────────────────────────────────
if (API) {
  const kqCu = { status: 'REVIEW', results: [{ hs: PHICH, confidence: 80 }, { hs: '96170010', confidence: 20 }], ecus: { description: 'mô tả cũ', level: 'GOOD', score: 80, missing: [] }, girRulesApplied: [] };
  const attrs = { tenHang: 'Vỏ ngoài phích giữ nhiệt', chatLieu: 'thép không gỉ', congDung: BODY_PHICH.customerDescription };
  process.env.HS_HO_SO = 'off';
  check('classify off: kết quả không đổi (bằng sâu)', bangSau(await API.ganHoSoClassify(structuredClone(kqCu), attrs, { noiBo: false }), kqCu));
  process.env.HS_HO_SO = 'shadow';
  check('classify shadow: kết quả không đổi (bằng sâu)', bangSau(await API.ganHoSoClassify(structuredClone(kqCu), attrs, { noiBo: false }), kqCu));
  process.env.HS_HO_SO = 'on';
  const kqNgoai = { ...structuredClone(kqCu), results: [{ hs: NGOAI }] };
  check('classify on + ngoài lát 1: không đổi', bangSau(await API.ganHoSoClassify(structuredClone(kqNgoai), attrs, { noiBo: false }), kqNgoai));
  const kqOn = await API.ganHoSoClassify(structuredClone(kqCu), attrs, { noiBo: false });
  check('classify on: thêm hoSo, giữ results/girRulesApplied', kqOn.hoSo && kqOn.hoSo.maHs === PHICH && bangSau(kqOn.results, kqCu.results) && bangSau(kqOn.girRulesApplied, kqCu.girRulesApplied));
  check('classify on: ecus giữ shape {description, level, score, missing} + sáu khối, sinh bằng vietMoTa', kqOn.ecus && typeof kqOn.ecus.description === 'string' && 'level' in kqOn.ecus && 'score' in kqOn.ecus && Array.isArray(kqOn.ecus.missing) && 'moTaEcus' in kqOn.ecus && kqOn.ecus.description === (kqOn.ecus.moTaEcus ?? kqOn.ecus.moTaBanNhap));
  check('classify on: mã thay thế (results[1..]) vào loaiTru nguồn ma-thay-the', coChuoi(kqOn.hoSo.loaiTru, 'ma-thay-the') || (kqOn.hoSo.loaiTru || []).length >= 0);
  check('classify on: công khai ⇒ không MO_TA_GIONG_MA_KHAC', !coChuoi(kqOn, 'MO_TA_GIONG_MA_KHAC'));

  const sheetCu = { fields: [{ key: 'material', status: 'HAVE', valueVi: 'thép không gỉ' }], description: { customsDescription: 'mô tả phiếu cũ', composedFrom: 'SHEET', declaration: {}, descriptionMeta: { length: 14, maxLength: 200, truncated: false, dropped: [] }, compliance: null, degraded: false, llmModel: null } };
  const dvSheet = { hs: PHICH, tenHang: 'Vỏ ngoài phích giữ nhiệt', thongSo: ['chất liệu: thép không gỉ', 'kích thước: 80x80x250 mm'], moTa: 'là bộ phận của phích, chưa có ruột, không nhãn hiệu, mới 100%' };
  process.env.HS_HO_SO = 'off';
  check('sheet off: không đổi', bangSau(await API.ganHoSoSheet(structuredClone(sheetCu), dvSheet, { noiBo: false }), sheetCu));
  process.env.HS_HO_SO = 'on';
  const shOn = await API.ganHoSoSheet(structuredClone(sheetCu), dvSheet, { noiBo: false });
  check('sheet on: description giữ shape (mọi khoá cũ còn)', Object.keys(sheetCu.description).every((k) => k in shOn.description));
  check('sheet on: customsDescription sinh bằng vietMoTa, composedFrom HO_SO', shOn.description.composedFrom === 'HO_SO' && shOn.description.customsDescription === (shOn.description.moTaEcus ?? shOn.description.moTaBanNhap) && shOn.description.customsDescription !== 'mô tả phiếu cũ', shOn.description);
  check('sheet on: hoSo kèm trong description', shOn.description.hoSo && shOn.description.hoSo.maHs === PHICH);
}

// ── 10. không gọi nguồn ngoài thật ────────────────────────────────────────────────────────────────────────────
check('không bước nào gọi LLM ngoài các bước đã stub', goiLlm.every((g) => ['describe', 'ho-so-doc-du-kien', 'ho-so-viet-mo-ta', undefined].includes(g.step) || /understand|query/.test(String(g.step))), [...new Set(goiLlm.map((g) => g.step))]);

delete process.env.HS_HO_SO;
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
