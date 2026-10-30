#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Job L1-5f (đo + bật, #648): chạy thử nội bộ + số đo chạy bóng của hồ sơ phân loại.
 *   1. HS_HO_SO_THU_CALLERS — khoá dịch vụ có tên trong danh sách được chạy như `on` khi HS_HO_SO=shadow; mọi người gọi khác
 *      theo HS_HO_SO. off là công tắc tắt hết (kể cả chạy thử). Lượt công khai / HS_API_TOKEN không bao giờ được chạy thử;
 *      cong-oz chỉ khi được ghi tên. `hoSoMeta.cheDo` = chế độ hiệu lực.
 *   2. Dòng số đo ho-so-shadow.jsonl đủ trường cho §10 (thời gian từng bước, LLM rơi về máy, khớp dữ kiện quyết định với
 *      mô tả cũ — CHỈ số đếm), dòng "không áp dụng" cho mã lát 1 chưa có ranh giới duyệt; báo cáo tổng hợp
 *      (lib/ho-so/bao-cao-shadow.js, scripts/bao-cao-shadow.mjs) + GET /api/admin/ho-so-shadow (KÍN).
 * Không gọi mạng/LLM thật: callLLMJson bị thay, nguồn ngoài của động cơ hồ sơ tiêm qua _datDeps.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

process.env.HS_API_TOKEN = 'test-token';
process.env.HS_SERVICE_TOKENS = 'cong-oz:k-cong,erp:k-erp,oz-noi-bo:k-noi';
delete process.env.HS_INTERNAL_CALLERS;
delete process.env.HS_HO_SO;
delete process.env.HS_HO_SO_THU_CALLERS;
delete process.env.HS_PUBLIC_LLM;
delete process.env.HS_HO_SO_VIET;
for (const k of Object.keys(process.env)) if (/^(ZAI|Z_AI|GLM)_/i.test(k)) delete process.env[k];

// ── LLM stub ──────────────────────────────────────────────────────────────────────────────────────────────────
const llmTier = require('../lib/llm-tier');
let chenGiaTriLa = false;
llmTier.callLLMJson = async (system, user, opts = {}) => {
  if (opts.step === 'ho-so-doc-du-kien') return { json: { duKien: [] }, model: 'stub' };
  if (opts.step === 'ho-so-viet-mo-ta') {
    const m = /BẢN MÁY GHÉP:\n([^\n]*)/.exec(String(user));
    const s = m ? m[1] : '';
    return { json: { moTaEcus: chenGiaTriLa ? `${s}, công suất 5 kW` : s }, model: 'stub' };
  }
  return {
    json: { declaration: { tenHang: 'Vỏ ngoài phích giữ nhiệt bằng thép không gỉ', thanhPhanCauTao: 'thép không gỉ', congDung: 'làm vỏ phích', tinhTrang: 'Mới 100%', thongSoKyThuat: ['kích thước 80x80x250 mm'] } },
    model: 'stub-describe',
  };
};
globalThis.fetch = async () => { throw new Error('test không gọi mạng'); };

const handler = require('../api/describe.js');
const API = require('../lib/ho-so/api');
const HS = require('../lib/ho-so/index');
const { dataPath } = require('../lib/data-paths');
API._datDeps({
  identify: async () => null,
  webFacts: async () => null,
  thamChieu: async () => ({ oz: [], tbTchq: [] }),
  tinHieuDanhMuc: async () => [],
  tienLeMaKhac: async () => [],
  demKhoOz: async () => ({ tong: 0, maKhac: [] }),
});

let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n}${d !== undefined ? ` — ${JSON.stringify(d).slice(0, 400)}` : ''}`); } };
const mockRes = () => ({ _s: 0, _j: null, _h: {}, setHeader(k, v) { this._h[k] = v; }, getHeader(k) { return this._h[k]; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } });
async function goi(body, { token, mode } = {}) {
  const req = { method: 'POST', url: '/api/describe', query: mode ? { mode } : {}, headers: token ? { authorization: `Bearer ${token}` } : {}, body: structuredClone(body) };
  const res = mockRes();
  await handler(req, res);
  return res;
}
/** Bỏ trường thay đổi theo lượt (ms, usage) để so bằng sâu. */
const gon = (j) => { if (!j || typeof j !== 'object') return j; const { ms: _m, usage: _u, ...r } = j; return JSON.parse(JSON.stringify(r)); };
const bangSau = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const SHADOW = dataPath('ho-so-shadow.jsonl');
const xoaShadow = () => { try { fs.rmSync(SHADOW, { force: true }); } catch { /* chưa có */ } };
const docShadow = () => (fs.existsSync(SHADOW) ? fs.readFileSync(SHADOW, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

const PHICH = '96170020';
const BODY_PHICH = {
  hsCode: PHICH,
  productName: 'Vỏ ngoài phích giữ nhiệt',
  customerDescription: 'Vỏ ngoài bằng thép không gỉ của phích chân không, là bộ phận của phích, chưa có ruột, kích thước 80x80x250 mm, không nhãn hiệu, mới 100%',
  material: 'thép không gỉ',
  origin: 'Trung Quốc',
  condition: 'Mới 100%',
};

// ── 1. cheDoHieuLuc: mọi tổ hợp cờ × người gọi ─────────────────────────────────────────────────────────────────
check('API.cheDoHieuLuc là hàm', typeof API.cheDoHieuLuc === 'function');
const CO = ['off', 'shadow', 'on', '', 'bat-bua'];
const NGUOI = [
  { ten: 'công khai', quyen: { noiBo: false } },
  { ten: 'HS_API_TOKEN (không phải khoá dịch vụ)', quyen: { noiBo: false, caller: null } },
  { ten: 'erp', quyen: { noiBo: true, caller: 'erp' } },
  { ten: 'oz-noi-bo', quyen: { noiBo: false, caller: 'oz-noi-bo' } },
  { ten: 'cong-oz', quyen: { noiBo: false, caller: 'cong-oz' } },
];
const DS = [undefined, '', 'oz-noi-bo', 'erp, oz-noi-bo', 'cong-oz', ' oz-noi-bo ,,zzz'];
const coTen = (ds, ten) => String(ds || '').split(',').map((s) => s.trim()).filter(Boolean).includes(ten);
if (typeof API.cheDoHieuLuc === 'function') {
  let saiTo = [];
  for (const co of CO) {
    for (const ds of DS) {
      for (const n of NGUOI) {
        if (co === undefined) delete process.env.HS_HO_SO; else process.env.HS_HO_SO = co;
        if (ds === undefined) delete process.env.HS_HO_SO_THU_CALLERS; else process.env.HS_HO_SO_THU_CALLERS = ds;
        const goc = ['off', 'shadow', 'on'].includes(co) ? co : 'off';
        const mongDoi = goc === 'shadow' && n.quyen.caller && coTen(ds, n.quyen.caller) ? 'on' : goc;
        const thuc = API.cheDoHieuLuc(n.quyen);
        if (thuc !== mongDoi) saiTo.push({ co, ds, nguoi: n.ten, mongDoi, thuc });
      }
    }
  }
  check(`cheDoHieuLuc đúng ở cả ${CO.length * DS.length * NGUOI.length} tổ hợp (off tắt hết; chỉ khoá có tên trong danh sách được on khi shadow)`, saiTo.length === 0, saiTo.slice(0, 5));
  process.env.HS_HO_SO = 'shadow'; process.env.HS_HO_SO_THU_CALLERS = 'oz-noi-bo';
  check('quyen thiếu/null ⇒ theo cờ gốc', API.cheDoHieuLuc() === 'shadow' && API.cheDoHieuLuc(null) === 'shadow' && API.cheDoHieuLuc({ caller: 42 }) === 'shadow');
  check('tên khớp phân biệt hoa thường (như HS_INTERNAL_CALLERS)', API.cheDoHieuLuc({ caller: 'OZ-NOI-BO' }) === 'shadow');
}

// ── 2. Tích hợp /api/describe ─────────────────────────────────────────────────────────────────────────────────
process.env.HS_HO_SO = 'off'; delete process.env.HS_HO_SO_THU_CALLERS;
const cuCongKhai = gon((await goi(BODY_PHICH))._j);
const cuNoi = gon((await goi(BODY_PHICH, { token: 'k-noi' }))._j);
const cuErp = gon((await goi(BODY_PHICH, { token: 'k-erp' }))._j);
const cuCong = gon((await goi(BODY_PHICH, { token: 'k-cong' }))._j);
const cuApi = gon((await goi(BODY_PHICH, { token: 'test-token' }))._j);
check('nền: off ⇒ không có hoSoMeta', !('hoSoMeta' in cuNoi) && !('hoSo' in cuNoi));

process.env.HS_HO_SO_THU_CALLERS = 'oz-noi-bo';
check('off + có tên trong danh sách ⇒ vẫn như off (off là công tắc tắt hết)', bangSau(gon((await goi(BODY_PHICH, { token: 'k-noi' }))._j), cuNoi));

process.env.HS_HO_SO = 'shadow';
xoaShadow();
const rThu = await goi(BODY_PHICH, { token: 'k-noi' });
const jThu = rThu._j || {};
check('shadow + oz-noi-bo trong danh sách ⇒ 200 có hoSo + sáu khối', rThu._s === 200 && 'hoSo' in jThu && 'moTaEcus' in jThu, Object.keys(jThu));
check('shadow + chạy thử ⇒ hoSoMeta.cheDo = "on" (chế độ hiệu lực) + thuNoiBo', jThu.hoSoMeta?.cheDo === 'on' && jThu.hoSoMeta?.thuNoiBo === true, jThu.hoSoMeta);
check('shadow + chạy thử ⇒ customsDescription = chuỗi của bộ viết', jThu.customsDescription === (jThu.moTaEcus ?? jThu.moTaBanNhap));
const dThu = docShadow();
check('chạy thử ⇒ đúng một dòng số đo, cheDo "thu"', dThu.length === 1 && dThu[0].cheDo === 'thu' && dThu[0].endpoint === 'describe', dThu);

xoaShadow();
check('shadow + công khai ⇒ bằng sâu như off', bangSau(gon((await goi(BODY_PHICH))._j), cuCongKhai));
check('shadow + HS_API_TOKEN ⇒ bằng sâu như off', bangSau(gon((await goi(BODY_PHICH, { token: 'test-token' }))._j), cuApi));
check('shadow + erp KHÔNG trong danh sách ⇒ bằng sâu như off', bangSau(gon((await goi(BODY_PHICH, { token: 'k-erp' }))._j), cuErp));
check('shadow + cong-oz KHÔNG trong danh sách ⇒ bằng sâu như off', bangSau(gon((await goi(BODY_PHICH, { token: 'k-cong' }))._j), cuCong));
const dSh = docShadow();
check('4 lượt chạy bóng ⇒ 4 dòng cheDo "shadow"', dSh.length === 4 && dSh.every((d) => d.cheDo === 'shadow'), dSh.map((d) => d.cheDo));

process.env.HS_HO_SO_THU_CALLERS = 'cong-oz';
const rCong = await goi(BODY_PHICH, { token: 'k-cong' });
check('cong-oz CHỈ chạy thử khi được ghi tên rõ', rCong._j?.hoSoMeta?.cheDo === 'on' && 'hoSo' in (rCong._j || {}), rCong._j?.hoSoMeta);
check('cong-oz chạy thử vẫn không bao giờ nhận MO_TA_GIONG_MA_KHAC', !JSON.stringify(rCong._j).includes('MO_TA_GIONG_MA_KHAC'));

process.env.HS_HO_SO = 'on'; process.env.HS_HO_SO_THU_CALLERS = 'oz-noi-bo';
xoaShadow();
const rOn = await goi(BODY_PHICH, { token: 'k-noi' });
check('on (toàn cục) ⇒ hoSoMeta.cheDo "on", KHÔNG gắn thuNoiBo', rOn._j?.hoSoMeta?.cheDo === 'on' && !('thuNoiBo' in (rOn._j?.hoSoMeta || {})), rOn._j?.hoSoMeta);
check('on (toàn cục) ⇒ không ghi dòng số đo (như trước)', docShadow().length === 0);

// ── 3. POST /api/ho-so ────────────────────────────────────────────────────────────────────────────────────────
const BODY_HS = { maHs: PHICH, loaiToKhai: 'NHAP', tenHang: 'Vỏ ngoài phích giữ nhiệt', moTa: BODY_PHICH.customerDescription };
process.env.HS_HO_SO = 'shadow'; process.env.HS_HO_SO_THU_CALLERS = 'oz-noi-bo';
xoaShadow();
const hThu = await goi(BODY_HS, { mode: 'ho_so', token: 'k-noi' });
check('/api/ho-so shadow + chạy thử ⇒ 200, hoSoMeta.cheDo "on" + thuNoiBo', hThu._s === 200 && hThu._j?.hoSoMeta?.cheDo === 'on' && hThu._j?.hoSoMeta?.thuNoiBo === true, hThu._j?.hoSoMeta);
const hErp = await goi(BODY_HS, { mode: 'ho_so', token: 'k-erp' });
check('/api/ho-so shadow + erp ngoài danh sách ⇒ hoSoMeta.cheDo "shadow"', hErp._s === 200 && hErp._j?.hoSoMeta?.cheDo === 'shadow', hErp._j?.hoSoMeta);
const dHs = docShadow();
check('/api/ho-so: một dòng "thu" + một dòng "shadow"', dHs.length === 2 && dHs[0].cheDo === 'thu' && dHs[1].cheDo === 'shadow' && dHs.every((d) => d.endpoint === 'ho-so'), dHs.map((d) => [d.endpoint, d.cheDo]));

// ── 4. classify / declaration-sheet (lớp gắn hồ sơ) + nối caller ở handler ────────────────────────────────────
const kqCu = { status: 'REVIEW', results: [{ hs: PHICH, confidence: 80 }], ecus: { description: 'Vỏ phích bằng thép không gỉ', level: 'GOOD', score: 80, missing: [] }, girRulesApplied: [] };
const attrs = { tenHang: 'Vỏ ngoài phích giữ nhiệt', chatLieu: 'thép không gỉ', congDung: BODY_PHICH.customerDescription };
process.env.HS_HO_SO = 'shadow';
xoaShadow();
const kThu = await API.ganHoSoClassify(structuredClone(kqCu), attrs, { noiBo: false, caller: 'oz-noi-bo' });
check('classify shadow + chạy thử ⇒ thêm hoSo, hoSoMeta.cheDo "on"', kThu.hoSo && kThu.hoSoMeta?.cheDo === 'on', kThu.hoSoMeta);
check('classify shadow + công khai ⇒ không đổi', bangSau(await API.ganHoSoClassify(structuredClone(kqCu), attrs, { noiBo: false }), kqCu));
const sheetCu = { fields: [], description: { customsDescription: 'Vỏ phích bằng thép không gỉ', composedFrom: 'SHEET', declaration: {}, descriptionMeta: { length: 27, maxLength: 200, truncated: false, dropped: [] }, compliance: null, degraded: false, llmModel: null } };
const dvSheet = { hs: PHICH, tenHang: 'Vỏ ngoài phích giữ nhiệt', thongSo: ['chất liệu: thép không gỉ', 'kích thước: 80x80x250 mm'], moTa: 'là bộ phận của phích, chưa có ruột, không nhãn hiệu, mới 100%' };
const sThu = await API.ganHoSoSheet(structuredClone(sheetCu), dvSheet, { noiBo: false, caller: 'oz-noi-bo' });
check('sheet shadow + chạy thử ⇒ composedFrom HO_SO, hoSoMeta.cheDo "on"', sThu.description?.composedFrom === 'HO_SO' && sThu.description?.hoSoMeta?.cheDo === 'on', sThu.description?.hoSoMeta);
check('sheet shadow + caller ngoài danh sách ⇒ không đổi', bangSau(await API.ganHoSoSheet(structuredClone(sheetCu), dvSheet, { noiBo: true, caller: 'erp' }), sheetCu));
const dKs = docShadow();
check('classify/sheet: dòng số đo đúng endpoint + cheDo', dKs.some((d) => d.endpoint === 'classify' && d.cheDo === 'thu') && dKs.some((d) => d.endpoint === 'classify' && d.cheDo === 'shadow') && dKs.some((d) => d.endpoint === 'declaration-sheet' && d.cheDo === 'thu') && dKs.some((d) => d.endpoint === 'declaration-sheet' && d.cheDo === 'shadow'), dKs.map((d) => [d.endpoint, d.cheDo]));
const srcClassify = fs.readFileSync(path.join(ROOT, 'api', 'classify.js'), 'utf8');
const srcDescribe = fs.readFileSync(path.join(ROOT, 'api', 'describe.js'), 'utf8');
check('api/classify.js: lượt khoá dịch vụ truyền caller vào quyền hồ sơ', /chay\(\{\s*noiBo:\s*laNoiBoOz\(req\),\s*caller:\s*serviceCaller\(req\)\s*\}\)/.test(srcClassify));
check('api/describe.js: sheet + describe + ho-so truyền caller vào quyền hồ sơ', (srcDescribe.match(/noiBo:\s*laNoiBoOz\(req\),\s*caller:\s*(serviceCaller\(req\)|caller)/g) || []).length >= 3);

// ── 5. Dòng số đo đủ trường §10, chỉ số đếm ────────────────────────────────────────────────────────────────────
const MOI_KHOA = ['cheDo', 'apDung', 'msBuoc', 'llmBiLoai', 'cheDoVietYeuCau', 'duKienQD'];
check('KHOA_SHADOW có thêm trường §10', MOI_KHOA.every((k) => API.KHOA_SHADOW.includes(k)), API.KHOA_SHADOW);
process.env.HS_HO_SO = 'shadow'; delete process.env.HS_HO_SO_THU_CALLERS;
xoaShadow();
const rM = await goi(BODY_PHICH, { token: 'k-erp' });
const dM = docShadow()[0] || {};
check('dòng: chỉ khoá trong KHOA_SHADOW', Object.keys(dM).length > 0 && Object.keys(dM).every((k) => API.KHOA_SHADOW.includes(k)), Object.keys(dM));
check('dòng: msBuoc có duongDi/docDuKien/doiChieu/viet là số ms', ['duongDi', 'docDuKien', 'doiChieu', 'viet'].every((k) => Number.isFinite(dM.msBuoc?.[k]) && dM.msBuoc[k] >= 0), dM.msBuoc);
check('dòng: apDung true, cheDoVietYeuCau LLM, llmBiLoai false', dM.apDung === true && dM.cheDoVietYeuCau === 'LLM' && dM.llmBiLoai === false, [dM.apDung, dM.cheDoVietYeuCau, dM.llmBiLoai]);
const q = dM.duKienQD || {};
check('dòng: duKienQD {tong, moi, cu, caHai} là số nguyên, moi/cu/caHai ≤ tong', ['tong', 'moi', 'cu', 'caHai'].every((k) => Number.isInteger(q[k]) && q[k] >= 0) && q.moi <= q.tong && q.cu <= q.tong && q.caHai <= Math.min(q.moi, q.cu), q);
const raw = fs.readFileSync(SHADOW, 'utf8');
check('dòng: không chứa nội dung khách (tên hàng, mô tả, mô tả cũ)', !/phích|Phích|thép|ruột|Trung Quốc/.test(raw), raw.slice(0, 300));
check('shadow vẫn trả bằng sâu như off (erp)', bangSau(gon(rM._j), cuErp));

chenGiaTriLa = true;
xoaShadow();
await goi(BODY_PHICH, { token: 'k-erp' });
const dL = docShadow()[0] || {};
check('LLM chèn giá trị lạ ⇒ dòng llmBiLoai true, cheDoViet MAY, cheDoVietYeuCau LLM', dL.llmBiLoai === true && dL.cheDoViet === 'MAY' && dL.cheDoVietYeuCau === 'LLM', [dL.llmBiLoai, dL.cheDoViet, dL.cheDoVietYeuCau]);
chenGiaTriLa = false;

process.env.HS_HO_SO = 'on';
const CHUA_DUYET = HS.laMaLat1('39269099') && !HS.hoSoApDung('39269099') ? '39269099' : null;
process.env.HS_HO_SO = 'shadow';
check('có mã lát 1 chưa duyệt để thử (39269099)', Boolean(CHUA_DUYET));
if (CHUA_DUYET) {
  xoaShadow();
  const bodyCd = { hsCode: CHUA_DUYET, productName: 'Hàng nhựa thử', customerDescription: 'đồ nhựa, mới 100%' };
  process.env.HS_HO_SO = 'off';
  const cdOff = gon((await goi(bodyCd, { token: 'k-erp' }))._j);
  process.env.HS_HO_SO = 'shadow';
  const cdSh = gon((await goi(bodyCd, { token: 'k-erp' }))._j);
  const dCd = docShadow();
  check('mã lát 1 chưa duyệt (shadow) ⇒ phản hồi như off', bangSau(cdSh, cdOff));
  check('mã lát 1 chưa duyệt (shadow) ⇒ một dòng apDung false, chỉ khoá gọn', dCd.length === 1 && dCd[0].apDung === false && dCd[0].maHs === CHUA_DUYET && Object.keys(dCd[0]).every((k) => ['ts', 'endpoint', 'maHs', 'noiBo', 'cheDo', 'apDung'].includes(k)), dCd);
}
xoaShadow();
const { taxData } = require('../lib/data');
const NGOAI = Object.keys(taxData).find((k) => k.length === 8 && !HS.laMaLat1(k));
await goi({ hsCode: NGOAI, productName: 'Hàng thử ngoài lát 1', customerDescription: 'mô tả thử' }, { token: 'k-erp' });
check('mã ngoài lát 1 (shadow) ⇒ không ghi dòng', docShadow().length === 0);

// soKhopDuKien: chỉ đếm, cụm nhóm 2 (dữ kiện quyết định), bỏ chỗ trống
check('API.soKhopDuKien là hàm', typeof API.soKhopDuKien === 'function');
if (typeof API.soKhopDuKien === 'function') {
  const viet = {
    banNhap: false, moTaEcus: 'Vỏ phích, bằng thép', khaiTiepHys: 'chưa có ruột',
    cumDaKiem: [
      { vaiTro: 'TEN_HANG', nhom: 1, cum: 'Vỏ phích', cumTat: 'Vỏ phích' },
      { vaiTro: 'DU_KIEN_QUYET_DINH', nhom: 2, cum: 'chưa có ruột', cumTat: 'chưa có ruột' },
      { vaiTro: 'DU_KIEN_QUYET_DINH', nhom: 2, cum: 'bằng thép', cumTat: 'bằng thép' },
      { vaiTro: 'DU_KIEN_QUYET_DINH', nhom: 2, cum: '[cần: dung tích]', cumTat: '[cần: dung tích]', choTrong: true },
    ],
  };
  check('soKhopDuKien: mới có cả 2 (kể cả phần HYS), cũ có 1', bangSau(API.soKhopDuKien(viet, 'Vỏ phích chưa có ruột'), { tong: 2, moi: 2, cu: 1, caHai: 1 }), API.soKhopDuKien(viet, 'Vỏ phích chưa có ruột'));
  check('soKhopDuKien: mô tả cũ rỗng ⇒ cu 0', API.soKhopDuKien(viet, '').cu === 0);
  check('soKhopDuKien: bản nháp đọc moTaBanNhap', API.soKhopDuKien({ ...viet, banNhap: true, moTaEcus: null, khaiTiepHys: null, moTaBanNhap: 'Vỏ phích, bằng thép, [cần: dung tích]' }, '').moi === 1);
}

// ── 6. Báo cáo tổng hợp ───────────────────────────────────────────────────────────────────────────────────────
let BC = null;
try { BC = require('../lib/ho-so/bao-cao-shadow'); } catch (e) { check('lib/ho-so/bao-cao-shadow.js nạp được', false, String(e.message)); }
const DONG_GIA = [
  { ts: '2026-11-02T01:00:00.000Z', endpoint: 'describe', maHs: '96170020', cheDo: 'shadow', apDung: true, trangThai: 'DU_CAN_CU', banNhap: false, lyDoBanNhap: [], tuongDuong: true, cheDoViet: 'LLM', cheDoVietYeuCau: 'LLM', llmBiLoai: false, buocQuaHan: [], ms: 1000, msBuoc: { duongDi: 10, docDuKien: 500, doiChieu: 20, viet: 400 }, duKienQD: { tong: 3, moi: 3, cu: 1, caHai: 1 }, soViPham: 0 },
  { ts: '2026-11-02T02:00:00.000Z', endpoint: 'describe', maHs: '96170020', cheDo: 'shadow', apDung: true, trangThai: 'THIEU_DU_KIEN', banNhap: true, lyDoBanNhap: ['THIEU_DU_KIEN', 'thieu-du-kien'], tuongDuong: false, cheDoViet: 'MAY', cheDoVietYeuCau: 'LLM', llmBiLoai: false, buocQuaHan: ['docDuKien'], ms: 36000, msBuoc: { duongDi: 12, docDuKien: 35000, doiChieu: 30, viet: 5 }, duKienQD: { tong: 2, moi: 1, cu: 2, caHai: 1 }, soViPham: 0 },
  { ts: '2026-11-03T03:00:00.000Z', endpoint: 'classify', maHs: '84135040', cheDo: 'thu', apDung: true, trangThai: 'DU_CAN_CU', banNhap: false, lyDoBanNhap: [], tuongDuong: true, cheDoViet: 'MAY', cheDoVietYeuCau: 'LLM', llmBiLoai: true, buocQuaHan: [], ms: 3000, msBuoc: { duongDi: 8, docDuKien: 900, doiChieu: 25, nghienCuu: 1500, viet: 600 }, duKienQD: { tong: 1, moi: 1, cu: 0, caHai: 0 }, soViPham: 1 },
  { ts: '2026-11-03T04:00:00.000Z', endpoint: 'describe', maHs: '39269099', cheDo: 'shadow', apDung: false, noiBo: true },
  { ts: '2026-11-03T05:00:00.000Z', endpoint: 'ho-so', maHs: '84135040', cheDo: 'shadow', apDung: true, trangThai: 'MAU_THUAN', banNhap: true, lyDoBanNhap: ['MAU_THUAN'], tuongDuong: false, cheDoViet: 'MAY', cheDoVietYeuCau: 'MAY', llmBiLoai: false, buocQuaHan: ['viet'], ms: 200, msBuoc: { duongDi: 5, docDuKien: 50, doiChieu: 10, viet: 100 } },
  { ts: '2026-11-03T06:00:00.000Z', endpoint: 'describe', maHs: '96170020', loi: 'MA_KHONG_CO_TRONG_BIEU', apDung: true, cheDo: 'shadow' },
  // dòng cũ (trước L1-5f): không có cheDo/apDung/msBuoc — vẫn đếm
  { ts: '2026-11-01T00:00:00.000Z', endpoint: 'describe', maHs: '96170020', trangThai: 'DU_CAN_CU', banNhap: false, tuongDuong: true, cheDoViet: 'LLM', buocQuaHan: [], ms: 900 },
];
if (BC) {
  const t = BC.tongHopShadow(DONG_GIA);
  check('báo cáo: soLuot = 7, soLuotDung (apDung, không lỗi) = 5', t.soLuot === 7 && t.soLuotDung === 5, [t.soLuot, t.soLuotDung]);
  check('báo cáo: theoEndpoint + theoCheDo (dòng cũ coi là shadow)', t.theoEndpoint.describe === 5 && t.theoEndpoint.classify === 1 && t.theoEndpoint['ho-so'] === 1 && t.theoCheDo.shadow === 6 && t.theoCheDo.thu === 1, [t.theoEndpoint, t.theoCheDo]);
  check('báo cáo: lát 1 — 6 lượt áp dụng / 7 lượt mã lát 1', t.lat1.apDung === 6 && t.lat1.khongApDung === 1 && Math.abs(t.lat1.tiLeApDung - 6 / 7) < 1e-9, t.lat1);
  check('báo cáo: phân bố trangThai', t.trangThai.DU_CAN_CU === 3 && t.trangThai.THIEU_DU_KIEN === 1 && t.trangThai.MAU_THUAN === 1, t.trangThai);
  check('báo cáo: banNhap 2/5', t.banNhap.so === 2 && t.banNhap.n === 5 && Math.abs(t.banNhap.tiLe - 0.4) < 1e-9, t.banNhap);
  check('báo cáo: lyDoBanNhap đếm', t.lyDoBanNhap.THIEU_DU_KIEN === 1 && t.lyDoBanNhap.MAU_THUAN === 1, t.lyDoBanNhap);
  check('báo cáo: LLM — yêu cầu LLM 3 (dòng có cheDoVietYeuCau), rơi về máy 2, bị máy loại 1', t.llm.yeuCauLlm === 3 && t.llm.rotVeMay === 2 && t.llm.llmBiLoai === 1 && Math.abs(t.llm.tiLeRotVeMay - 2 / 3) < 1e-9, t.llm);
  check('báo cáo: quá hạn theo bước', t.quaHan.docDuKien === 1 && t.quaHan.viet === 1, t.quaHan);
  check('báo cáo: thời gian từng bước p50/p95 (nearest-rank)', t.thoiGian.docDuKien.n === 4 && t.thoiGian.docDuKien.p50 === 500 && t.thoiGian.docDuKien.p95 === 35000 && t.thoiGian.nghienCuu.n === 1 && t.thoiGian.tong.n === 5, t.thoiGian);
  check('báo cáo: tuongDuong trên bản đạt (không nháp) 3/3', t.tuongDuong.dat === 3 && t.tuongDuong.n === 3, t.tuongDuong);
  check('báo cáo: khớp dữ kiện quyết định mới/cũ (tổng dữ kiện)', t.duKienQD.soLuot === 3 && t.duKienQD.tong === 6 && t.duKienQD.moi === 5 && t.duKienQD.cu === 3 && t.duKienQD.caHai === 2, t.duKienQD);
  check('báo cáo: lỗi đếm theo mã', t.loi.MA_KHONG_CO_TRONG_BIEU === 1, t.loi);
  const loc = BC.tongHopShadow(DONG_GIA, { tu: '2026-11-03', den: '2026-11-03' });
  check('báo cáo: lọc theo ngày (UTC) tu/den', loc.soLuot === 4, loc.soLuot);
  const rong = BC.tongHopShadow([]);
  check('báo cáo: rỗng không lỗi, tỉ lệ null', rong.soLuot === 0 && rong.banNhap.tiLe === null && rong.thoiGian.tong.p50 === null, rong);
  check('báo cáo: không có khoá nào ngoài số đo (không maHs từng dòng)', !JSON.stringify(t).includes('96170020'));

  xoaShadow();
  fs.mkdirSync(path.dirname(SHADOW), { recursive: true });
  fs.writeFileSync(SHADOW, `${DONG_GIA.map((d) => JSON.stringify(d)).join('\n')}\nkhông phải JSON\n`);
  const doc = BC.docDongShadow();
  check('docDongShadow: đọc qua dataPath, đếm dòng hỏng', doc.dong.length === 7 && doc.dongHong === 1, [doc.dong.length, doc.dongHong]);

  // CLI
  let out = '';
  try { out = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'bao-cao-shadow.mjs'), '--json'], { env: process.env, encoding: 'utf8' }); } catch (e) { out = String(e.stdout || e.message); }
  let jCli = null; try { jCli = JSON.parse(out); } catch { jCli = null; }
  check('scripts/bao-cao-shadow.mjs --json in đúng tổng hợp', jCli && jCli.soLuot === 7 && jCli.dongHong === 1, out.slice(0, 200));
  let outTxt = '';
  try { outTxt = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'bao-cao-shadow.mjs')], { env: process.env, encoding: 'utf8' }); } catch (e) { outTxt = String(e.stdout || e.message); }
  check('scripts/bao-cao-shadow.mjs in bảng chữ', /Số lượt/.test(outTxt) && /p95/.test(outTxt), outTxt.slice(0, 200));

  // ── 7. GET /api/admin/ho-so-shadow (KÍN) ──
  const routes = JSON.parse(fs.readFileSync(path.join(ROOT, 'routes.json'), 'utf8'));
  const ds = routes.rewrites || routes.routes || routes;
  const r = (Array.isArray(ds) ? ds : []).find((x) => x.source === '/api/admin/ho-so-shadow');
  check('routes.json: /api/admin/ho-so-shadow → /api/dataset?resource=ho_so_shadow', r && r.destination === '/api/dataset?resource=ho_so_shadow', r);
  const PA = require('../lib/public-access');
  check('ho_so_shadow KHÔNG nằm trong allowlist công khai', !PA.PUBLIC_DATASET_RESOURCES.has('ho_so_shadow') && PA.isPublicRead({ endpoint: 'dataset', resource: 'ho_so_shadow', method: 'GET' }) === false);
  const dataset = require('../api/dataset.js');
  const r401 = mockRes();
  await dataset({ method: 'GET', url: '/x', headers: {}, query: { resource: 'ho_so_shadow' } }, r401);
  check('GET /api/admin/ho-so-shadow không token ⇒ 401', r401._s === 401, r401._s);
  const r200 = mockRes();
  await dataset({ method: 'GET', url: '/x', headers: { authorization: 'Bearer test-token' }, query: { resource: 'ho_so_shadow' } }, r200);
  check('GET /api/admin/ho-so-shadow có token ⇒ 200 cùng tổng hợp', r200._s === 200 && r200._j?.soLuot === 7 && r200._j?.dongHong === 1 && r200._h['Cache-Control'] === 'no-store', [r200._s, r200._j?.soLuot]);
  const rLoc = mockRes();
  await dataset({ method: 'GET', url: '/x', headers: { authorization: 'Bearer k-erp' }, query: { resource: 'ho_so_shadow', tu: '2026-11-03' } }, rLoc);
  check('GET /api/admin/ho-so-shadow?tu= lọc theo ngày', rLoc._s === 200 && rLoc._j?.soLuot === 4, rLoc._j?.soLuot);
  const rSai = mockRes();
  await dataset({ method: 'GET', url: '/x', headers: { authorization: 'Bearer test-token' }, query: { resource: 'ho_so_shadow', tu: '03/11/2026' } }, rSai);
  check('GET /api/admin/ho-so-shadow?tu sai dạng ⇒ 400', rSai._s === 400, rSai._s);
}

// ── 8. Tệp số đo không vào git ────────────────────────────────────────────────────────────────────────────────
let ign = '';
try { ign = execFileSync('git', ['check-ignore', 'data/ho-so-shadow.jsonl'], { cwd: ROOT, encoding: 'utf8' }); } catch { ign = ''; }
check('.gitignore chặn data/ho-so-shadow.jsonl', ign.trim() === 'data/ho-so-shadow.jsonl', ign);

delete process.env.HS_HO_SO; delete process.env.HS_HO_SO_THU_CALLERS;
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
