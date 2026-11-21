#!/usr/bin/env node
/**
 * Số đo chạy bóng hồ sơ phân loại ĐO ĐƯỢC theo bên gọi và theo phân nhóm 6 số.
 *
 *   1. `benGoi` trong dòng số đo = TÊN khoá dịch vụ đã chuẩn hoá ('cong-oz' / 'erp' / …), 'cong-khai' khi không có tên,
 *      'khac' cho mọi chuỗi lạ — không bao giờ là khoá hay tên khách.
 *   2. Lượt mã lát 1 KHÔNG dựng hồ sơ (động cơ chốt sớm — OZV-1368; trúng cache; kho đáp án) để lại một dòng `boQua` thay vì
 *      biến mất khỏi tệp số đo. Phản hồi cho khách không đổi, không gọi LLM hồ sơ.
 *   3. Báo cáo tách `theoBenGoi` + `theoPhanNhom` (lượt, tỉ lệ từng trạng thái), lọc `benGoi`, và tách "rơi về máy" khỏi bản nháp.
 *
 * Không gọi mạng/LLM thật.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

process.env.HS_API_TOKEN = 'test-token';
process.env.HS_SERVICE_TOKENS = 'cong-oz:k-cong-bi-mat,erp:k-erp-bi-mat,oz-noi-bo:k-noi-bi-mat';
process.env.HS_HO_SO = 'shadow';
process.env.HS_HO_SO_VIET = 'LLM';
process.env.HS_HO_SO_NGHIEN_CUU = 'false';
delete process.env.HS_HO_SO_THU_CALLERS;
delete process.env.HS_INTERNAL_CALLERS;

const llmTier = require('../lib/llm-tier');
const goiLlm = [];
llmTier.callLLMJson = async (_s, user, opts = {}) => {
  goiLlm.push(opts.step || 'unknown');
  if (opts.step === 'ho-so-doc-du-kien') return { json: { duKien: [] }, model: 'stub' };
  if (opts.step === 'ho-so-viet-mo-ta') { const m = /BẢN MÁY GHÉP:\n([^\n]*)/.exec(String(user)); return { json: { moTaEcus: m ? m[1] : '' }, model: 'stub' }; }
  return { json: {}, model: 'stub' };
};
globalThis.fetch = async () => { throw new Error('test không gọi mạng'); };

const API = require('../lib/ho-so/api');
const H = require('../lib/ho-so/index');
const BC = require('../lib/ho-so/bao-cao-shadow');
const { dataPath } = require('../lib/data-paths');
API._datDeps({
  identify: async () => null, webFacts: async () => null, thamChieu: async () => ({ oz: [], tbTchq: [] }),
  tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: async () => ({ tong: 0, maKhac: [] }),
});

let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n}${d !== undefined ? ` — ${JSON.stringify(d).slice(0, 400)}` : ''}`); } };
const SHADOW = dataPath('ho-so-shadow.jsonl');
const xoa = () => { try { fs.rmSync(SHADOW, { force: true }); } catch { /* chưa có */ } };
const tho = () => (fs.existsSync(SHADOW) ? fs.readFileSync(SHADOW, 'utf8') : '');
const doc = () => tho().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const bangSau = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ── 1. chuanBenGoi ────────────────────────────────────────────────────────────────────────────────────
check('bên gọi: tên khoá dịch vụ đang cấu hình giữ nguyên', API.chuanBenGoi({ caller: 'cong-oz' }) === 'cong-oz' && API.chuanBenGoi({ caller: 'erp' }) === 'erp' && API.chuanBenGoi({ caller: 'oz-noi-bo' }) === 'oz-noi-bo');
check('bên gọi: không có tên (công khai / HS_API_TOKEN) ⇒ cong-khai', API.chuanBenGoi({}) === 'cong-khai' && API.chuanBenGoi(undefined) === 'cong-khai' && API.chuanBenGoi({ caller: null }) === 'cong-khai' && API.chuanBenGoi({ caller: '  ' }) === 'cong-khai');
check('bên gọi: GIÁ TRỊ khoá bị đưa nhầm vào caller ⇒ khac (không chép ra)', API.chuanBenGoi({ caller: 'k-erp-bi-mat' }) === 'khac');
check('bên gọi: tên khách / chuỗi lạ / tên chưa cấu hình ⇒ khac', API.chuanBenGoi({ caller: 'Công ty TNHH ABC' }) === 'khac' && API.chuanBenGoi({ caller: 'ten-chua-cau-hinh' }) === 'khac' && API.chuanBenGoi({ caller: 'a'.repeat(64) }) === 'khac');
check('bên gọi: chữ hoa chuẩn về chữ thường', API.chuanBenGoi({ caller: 'ERP' }) === 'erp');
check('KHOA_SHADOW / KHOA_KHONG_AP_DUNG / KHOA_BO_QUA có benGoi', ['KHOA_SHADOW', 'KHOA_KHONG_AP_DUNG', 'KHOA_BO_QUA'].every((k) => Array.isArray(API[k]) && API[k].includes('benGoi')));

// ── 2. Lượt dựng hồ sơ: dòng có benGoi, không lộ khoá ──────────────────────────────────────────────────────────
const HS = '96170010';
check('điều kiện test: 96170010 là mã lát 1 có ranh giới duyệt', H.hoSoApDung(HS) === true);
const kqThuong = () => ({
  status: 'REVIEW', results: [{ hs: HS, confidence: 80, reason: 'thuong' }],
  ecus: { description: 'cốc', level: 'GOOD', score: 80, missing: [] }, engine: { ms: 100, name: 'loop', gates: [{ round: 1, decision: 'CHOT' }] },
});
const attrs = { tenHang: 'cốc giữ nhiệt chân không bằng thép không gỉ' };
xoa();
const o1 = await API.ganHoSoClassify(kqThuong(), attrs, { noiBo: false, caller: 'cong-oz' });
await API.choNenXong();
let d = doc();
check('shadow, lượt thường: phản hồi không đổi', bangSau(o1, kqThuong()));
check('shadow, lượt thường: MỘT dòng, benGoi = cong-oz, apDung true', d.length === 1 && d[0].benGoi === 'cong-oz' && d[0].apDung === true && !d[0].boQua, d);
check('shadow, lượt thường: chỉ khoá trong KHOA_SHADOW', d.length === 1 && Object.keys(d[0]).every((k) => API.KHOA_SHADOW.includes(k)), d[0] && Object.keys(d[0]));
xoa();
await API.ganHoSoClassify(kqThuong(), attrs, { noiBo: false });
await API.choNenXong();
d = doc();
check('shadow, lượt công khai: benGoi = cong-khai', d.length === 1 && d[0].benGoi === 'cong-khai', d);
xoa();
await API.ganHoSoClassify(kqThuong(), attrs, { noiBo: false, caller: 'k-erp-bi-mat' });
await API.choNenXong();
check('shadow, caller là giá trị khoá: tệp KHÔNG chứa chuỗi đó, benGoi = khac', !tho().includes('bi-mat') && doc()[0]?.benGoi === 'khac', tho().slice(0, 200));

// ── 3. Chốt sớm (OZV-1368): không dựng hồ sơ nhưng để lại dòng boQua ───────────────────────────────────────────────
const kqSom = (hs = HS) => ({
  status: 'REVIEW', results: [{ hs, confidence: 93, reason: 'chotSom' }],
  ecus: { description: 'cốc giữ nhiệt chân không', level: 'GOOD', score: 80, missing: [] },
  engine: { ms: 12, name: 'loop', gates: [{ round: 0, earlyExitTradeChotSom: true, hs, entryId: 'coc' }] },
});
xoa(); goiLlm.length = 0;
const o3 = await API.ganHoSoClassify(kqSom(), attrs, { noiBo: false, caller: 'cong-oz' });
await API.choNenXong();
d = doc();
check('chốt sớm + shadow: phản hồi không đổi, không gọi LLM hồ sơ', bangSau(o3, kqSom()) && goiLlm.filter((s) => String(s).startsWith('ho-so')).length === 0, goiLlm);
check('chốt sớm + shadow: MỘT dòng boQua = chot-som, có benGoi + maHs', d.length === 1 && d[0].boQua === 'chot-som' && d[0].benGoi === 'cong-oz' && d[0].maHs === HS && d[0].endpoint === 'classify', d);
check('chốt sớm + shadow: dòng boQua chỉ có khoá trong KHOA_BO_QUA (không apDung/trangThai)', d.length === 1 && Object.keys(d[0]).every((k) => API.KHOA_BO_QUA.includes(k)) && !('apDung' in d[0]), d[0] && Object.keys(d[0]));
const NGOAI = ['01012100', '02011000', '10063099'].find((m) => !H.laMaLat1(m));
xoa();
await API.ganHoSoClassify(kqSom(NGOAI), attrs, { noiBo: false, caller: 'cong-oz' });
await API.choNenXong();
check('chốt sớm + mã NGOÀI lát 1: không ghi dòng nào (như cũ)', doc().length === 0, [NGOAI, doc()]);
xoa();
process.env.HS_HO_SO = 'off';
await API.ganHoSoClassify(kqSom(), attrs, { noiBo: false, caller: 'cong-oz' });
await API.choNenXong();
API.ghiBoQua('classify', HS, { caller: 'cong-oz' }, 'cache');
check('HS_HO_SO=off: không ghi dòng boQua nào', doc().length === 0, doc());
process.env.HS_HO_SO = 'on';
API.ghiBoQua('classify', HS, { caller: 'cong-oz' }, 'cache');
check('HS_HO_SO=on: không ghi dòng boQua (số đo chỉ của chạy bóng)', doc().length === 0, doc());
process.env.HS_HO_SO = 'shadow';

// ── 4. ghiBoQua (cache / kho đáp án) + ghiKhongApDung ───────────────────────────────────────────────────────────
xoa();
API.ghiBoQua('classify', HS, { noiBo: true, caller: 'erp' }, 'cache');
API.ghiBoQua('classify', HS, { caller: 'cong-oz' }, 'kho-dap-an');
API.ghiBoQua('classify', HS, { caller: 'cong-oz' }, 'ly do la <script>');
API.ghiBoQua('classify', '9617', { caller: 'cong-oz' }, 'cache');
API.ghiBoQua('classify', undefined, { caller: 'cong-oz' }, 'cache');
d = doc();
check('ghiBoQua: cache + kho-dap-an ghi đúng lý do, lý do lạ ⇒ khac, mã không đủ 8 số ⇒ bỏ', d.length === 3 && d[0].boQua === 'cache' && d[0].benGoi === 'erp' && d[0].noiBo === true && d[1].boQua === 'kho-dap-an' && d[2].boQua === 'khac', d);
const srcClassify = fs.readFileSync(path.join(ROOT, 'api', 'classify.js'), 'utf8');
check('api/classify.js: lượt trúng cache và lượt kho đáp án đều gọi ghiBoQuaHoSo', /ghiBoQuaHoSo\('classify', tram\.results\?\.\[0\]\?\.hs, .*'cache'\)/.test(srcClassify) && /ghiBoQuaHoSo\('classify', tra\.phanHoi\.results\?\.\[0\]\?\.hs, .*'kho-dap-an'\)/.test(srcClassify));
const CHUA_DUYET = (JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ho-so', 'lat-1.json'), 'utf8')).phanNhom || []).map((p) => String(p.pn6)).find((p) => !H.coRanhGioiDuyet(p));
if (CHUA_DUYET) {
  xoa();
  API.ghiKhongApDung('classify', `${CHUA_DUYET}00`.slice(0, 8).padEnd(8, '0'), { caller: 'erp' });
  d = doc();
  check('ghiKhongApDung: dòng apDung false có benGoi, chỉ khoá KHOA_KHONG_AP_DUNG', d.length === 1 && d[0].apDung === false && d[0].benGoi === 'erp' && Object.keys(d[0]).every((k) => API.KHOA_KHONG_AP_DUNG.includes(k)), d);
} else {
  const r = API.dongShadow('classify', null, { apDung: false, maHs: '39269099', benGoi: 'erp' });
  check('dongShadow apDung false: có benGoi, chỉ khoá KHOA_KHONG_AP_DUNG', r.apDung === false && r.benGoi === 'erp' && Object.keys(r).every((k) => API.KHOA_KHONG_AP_DUNG.includes(k)), r);
}

// ── 5. Báo cáo: theo bên gọi + theo phân nhóm ────────────────────────────────────────────────────────────────
const D = (o) => ({ endpoint: 'classify', cheDo: 'shadow', apDung: true, banNhap: false, lyDoBanNhap: [], tuongDuong: true, cheDoViet: 'LLM', cheDoVietYeuCau: 'LLM', llmBiLoai: false, buocQuaHan: [], ms: 1000, ...o });
const NHAP = { banNhap: true, tuongDuong: false, cheDoViet: 'MAY' };
const DONG = [
  D({ ts: '2026-11-16T01:00:00.000Z', maHs: '96170010', benGoi: 'oz-noi-bo', trangThai: 'DU_CAN_CU' }),
  D({ ts: '2026-11-16T02:00:00.000Z', maHs: '96170010', benGoi: 'oz-noi-bo', trangThai: 'DU_CAN_CU' }),
  D({ ts: '2026-11-16T03:00:00.000Z', maHs: '96170020', benGoi: 'oz-noi-bo', trangThai: 'THIEU_DU_KIEN', ...NHAP, lyDoBanNhap: ['THIEU_DU_KIEN', 'thieu-du-kien'] }),
  D({ ts: '2026-11-17T01:00:00.000Z', maHs: '84812090', benGoi: 'cong-oz', trangThai: 'MAU_THUAN', ...NHAP, lyDoBanNhap: ['MAU_THUAN'] }),
  D({ ts: '2026-11-17T02:00:00.000Z', maHs: '84812090', benGoi: 'cong-oz', trangThai: 'MAU_THUAN', ...NHAP, lyDoBanNhap: ['MAU_THUAN'] }),
  D({ ts: '2026-11-17T03:00:00.000Z', maHs: '84812020', benGoi: 'erp', trangThai: 'DU_CAN_CU', cheDoViet: 'MAY', llmBiLoai: true }),
  D({ ts: '2026-11-17T04:00:00.000Z', maHs: '84812090', benGoi: 'cong-oz', trangThai: 'DU_CAN_CU' }),
  { ts: '2026-11-18T01:00:00.000Z', endpoint: 'classify', maHs: '96170010', noiBo: false, cheDo: 'shadow', boQua: 'chot-som', benGoi: 'cong-oz' },
  { ts: '2026-11-18T02:00:00.000Z', endpoint: 'classify', maHs: '96170010', noiBo: false, cheDo: 'shadow', boQua: 'cache', benGoi: 'cong-oz' },
  { ts: '2026-11-18T03:00:00.000Z', endpoint: 'classify', maHs: '39269099', noiBo: false, cheDo: 'shadow', apDung: false, benGoi: 'cong-khai' },
  { ts: '2026-11-18T04:00:00.000Z', endpoint: 'classify', maHs: '84812090', cheDo: 'shadow', apDung: true, loi: 'MA_KHONG_CO_TRONG_BIEU', benGoi: 'cong-oz' },
  // dòng cũ (trước bản này): chưa có benGoi
  D({ ts: '2026-11-15T01:00:00.000Z', maHs: '96170010', trangThai: 'DU_CAN_CU' }),
  // benGoi rác trong tệp (không đúng khuôn) ⇒ không chép ra báo cáo
  D({ ts: '2026-11-15T02:00:00.000Z', maHs: '96170010', trangThai: 'DU_CAN_CU', benGoi: 'Khach Hang <b>' }),
];
const t = BC.tongHopShadow(DONG);
check('báo cáo: soLuot đếm mọi dòng (13), soLuotDung bỏ boQua / chưa duyệt / lỗi (9)', t.soLuot === 13 && t.soLuotDung === 9, [t.soLuot, t.soLuotDung]);
check('báo cáo: boQua đếm theo lý do, KHÔNG lẫn vào lat1.apDung', t.boQua['chot-som'] === 1 && t.boQua.cache === 1 && t.lat1.apDung === 10 && t.lat1.khongApDung === 1, [t.boQua, t.lat1]);
check('báo cáo: theoNgay (UTC) xếp tăng dần', bangSau(t.theoNgay, { '2026-11-15': 2, '2026-11-16': 3, '2026-11-17': 4, '2026-11-18': 4 }), t.theoNgay);
const bg = t.theoBenGoi;
check('báo cáo theoBenGoi: đủ các bên, dòng cũ / rác ⇒ khong-ro', bangSau(Object.keys(bg).sort(), ['cong-khai', 'cong-oz', 'erp', 'khong-ro', 'oz-noi-bo']), Object.keys(bg));
check('báo cáo theoBenGoi.cong-oz: 6 lượt = 2 bỏ qua + 1 lỗi + 3 dựng; MAU_THUAN 2/3', bg['cong-oz'].soLuot === 6 && bg['cong-oz'].boQua === 2 && bg['cong-oz'].loi === 1 && bg['cong-oz'].soLuotDung === 3 && bg['cong-oz'].trangThai.MAU_THUAN === 2 && Math.abs(bg['cong-oz'].tiLeTrangThai.MAU_THUAN - 2 / 3) < 1e-9 && Math.abs(bg['cong-oz'].tiLeBanNhap - 2 / 3) < 1e-9, bg['cong-oz']);
check('báo cáo theoBenGoi.oz-noi-bo: 3 dựng, THIEU_DU_KIEN 1/3', bg['oz-noi-bo'].soLuotDung === 3 && Math.abs(bg['oz-noi-bo'].tiLeTrangThai.THIEU_DU_KIEN - 1 / 3) < 1e-9, bg['oz-noi-bo']);
check('báo cáo theoBenGoi.cong-khai: 1 lượt chưa duyệt, tỉ lệ null', bg['cong-khai'].khongApDung === 1 && bg['cong-khai'].soLuotDung === 0 && bg['cong-khai'].tiLeBanNhap === null, bg['cong-khai']);
const pn = t.theoPhanNhom;
check('báo cáo theoPhanNhom: gộp theo 6 số đầu của mã', bangSau(Object.keys(pn).sort(), ['392690', '848120', '961700']), Object.keys(pn));
check('báo cáo theoPhanNhom.848120: 5 lượt, 4 dựng, MAU_THUAN 2/4, DU_CAN_CU 2/4', pn['848120'].soLuot === 5 && pn['848120'].soLuotDung === 4 && pn['848120'].tiLeTrangThai.MAU_THUAN === 0.5 && pn['848120'].tiLeTrangThai.DU_CAN_CU === 0.5 && pn['848120'].loi === 1, pn['848120']);
check('báo cáo theoPhanNhom.961700: 7 lượt, 2 bỏ qua, 5 dựng', pn['961700'].soLuot === 7 && pn['961700'].boQua === 2 && pn['961700'].soLuotDung === 5, pn['961700']);
check('báo cáo: rơi về máy gộp 4/9, RIÊNG bản đạt 1/6 (nháp không gọi LLM viết)', t.llm.rotVeMay === 4 && t.llm.yeuCauLlm === 9 && t.llm.rotVeMayKhongBanNhap === 1 && t.llm.yeuCauLlmKhongBanNhap === 6 && Math.abs(t.llm.tiLeRotVeMayKhongBanNhap - 1 / 6) < 1e-9, t.llm);
check('báo cáo: không chép mã 8 số, không chép benGoi rác', !['96170010', '96170020', '84812090', '84812020', '39269099'].some((m) => JSON.stringify(t).includes(m)) && !JSON.stringify(t).includes('Khach Hang'));
const loc = BC.tongHopShadow(DONG, { benGoi: 'cong-oz,erp' });
check('báo cáo lọc benGoi=cong-oz,erp: chỉ còn 7 dòng của hai bên đó', loc.soLuot === 7 && bangSau(loc.locBenGoi, ['cong-oz', 'erp']) && bangSau(Object.keys(loc.theoBenGoi).sort(), ['cong-oz', 'erp']) && loc.soLuotDung === 4, [loc.soLuot, loc.locBenGoi, Object.keys(loc.theoBenGoi)]);
check('báo cáo lọc benGoi sai khuôn ⇒ bỏ lọc (không ném)', BC.tongHopShadow(DONG, { benGoi: '../../etc' }).soLuot === 13);
const rong = BC.tongHopShadow([]);
check('báo cáo rỗng: theoBenGoi / theoPhanNhom / boQua rỗng, tỉ lệ null', bangSau(rong.theoBenGoi, {}) && bangSau(rong.theoPhanNhom, {}) && bangSau(rong.boQua, {}) && rong.llm.tiLeRotVeMayKhongBanNhap === null, rong);

// ── 6. Endpoint kín + CLI nhận lọc bên gọi ──────────────────────────────────────────────────────────────────
xoa();
fs.mkdirSync(path.dirname(SHADOW), { recursive: true });
fs.writeFileSync(SHADOW, `${DONG.map((x) => JSON.stringify(x)).join('\n')}\n`);
const mockRes = () => ({ _s: 0, _j: null, _h: {}, setHeader(k, v) { this._h[k] = v; }, getHeader(k) { return this._h[k]; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } });
const dataset = require('../api/dataset.js');
const r1 = mockRes();
await dataset({ method: 'GET', url: '/x', headers: { authorization: 'Bearer test-token' }, query: { resource: 'ho_so_shadow' } }, r1);
check('GET /api/admin/ho-so-shadow: có theoBenGoi + theoPhanNhom', r1._s === 200 && r1._j?.theoBenGoi?.['cong-oz']?.soLuot === 6 && r1._j?.theoPhanNhom?.['848120']?.soLuot === 5, [r1._s, r1._j && Object.keys(r1._j)]);
const r2 = mockRes();
await dataset({ method: 'GET', url: '/x', headers: { authorization: 'Bearer test-token' }, query: { resource: 'ho_so_shadow', benGoi: 'cong-oz' } }, r2);
check('GET /api/admin/ho-so-shadow?benGoi=cong-oz: lọc theo bên gọi', r2._s === 200 && r2._j?.soLuot === 6, [r2._s, r2._j?.soLuot]);
const r3 = mockRes();
await dataset({ method: 'GET', url: '/x', headers: { authorization: 'Bearer test-token' }, query: { resource: 'ho_so_shadow', benGoi: 'Cong Oz; DROP' } }, r3);
check('GET /api/admin/ho-so-shadow?benGoi sai khuôn ⇒ 400', r3._s === 400 && r3._j?.error === 'DAU_VAO_SAI', [r3._s, r3._j]);
const r4 = mockRes();
await dataset({ method: 'GET', url: '/x', headers: {}, query: { resource: 'ho_so_shadow', benGoi: 'cong-oz' } }, r4);
check('GET /api/admin/ho-so-shadow không token vẫn 401', r4._s === 401, r4._s);
const { execFileSync } = await import('child_process');
let outTxt = '';
try { outTxt = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'bao-cao-shadow.mjs'), '--ben-goi=cong-oz'], { env: process.env, encoding: 'utf8' }); } catch (e) { outTxt = String(e.stdout || e.message); }
check('scripts/bao-cao-shadow.mjs --ben-goi: in bảng theo bên gọi + theo phân nhóm', /Theo bên gọi/.test(outTxt) && /Theo phân nhóm 6 số/.test(outTxt) && /848120/.test(outTxt) && /Chỉ tính bên gọi\s+cong-oz/.test(outTxt), outTxt.slice(0, 300));

console.log(`\n${pass} đạt, ${fail} trượt`);
if (fail) process.exit(1);
