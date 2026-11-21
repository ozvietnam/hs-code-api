#!/usr/bin/env node
/**
 * Chạy bóng hồ sơ phân loại KHÔNG nằm trên đường trả lời khách.
 *
 * Trước bản này, ở HS_HO_SO=shadow các endpoint CHỜ dựng xong hồ sơ (có gọi LLM) rồi mới trả kết quả cũ — khách chịu thêm độ
 * trễ cho thứ họ không nhận. Test này đo:
 *   1. classify / describe / declaration-sheet / soát: phản hồi trả về KHI hồ sơ chưa dựng xong (LLM của hồ sơ còn đang treo),
 *      dòng số đo chỉ xuất hiện sau khi việc nền xong.
 *   2. Trần đồng thời: không bao giờ quá 2 lượt nền cùng lúc, hàng chờ 20, đầy ⇒ bỏ + dòng `boQua: 'qua-tai'`.
 *   3. Lỗi nền (ném đồng bộ, promise rơi, hồ sơ lỗi) không lọt ra: không unhandledRejection, hàng vẫn chạy tiếp.
 *   4. Tắt êm: lượt nền không tính vào lib/inflight.js (không giữ container); đang tắt ⇒ không nhận việc mới, bỏ việc đang chờ.
 *   5. `on` và lượt chạy thử vẫn chờ hồ sơ như cũ (phản hồi cần nó).
 *   6. Ngữ cảnh riêng tư của lượt gọi đi theo việc nền.
 *   7. Chi phí LLM của lượt bóng (không còn về `usage` của bên gọi) được ghi vào dòng số đo và cộng trong báo cáo.
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
process.env.HS_SERVICE_TOKENS = 'cong-oz:k-cong,erp:k-erp,oz-noi-bo:k-noi';
process.env.HS_HO_SO = 'shadow';
process.env.HS_HO_SO_VIET = 'LLM';
process.env.HS_HO_SO_NGHIEN_CUU = 'false';
delete process.env.HS_HO_SO_THU_CALLERS;
delete process.env.HS_INTERNAL_CALLERS;

const rejRoi = [];
process.on('unhandledRejection', (e) => { rejRoi.push(String(e && e.message)); });

// ── LLM giả có CỔNG: bước của hồ sơ treo tới khi test mở cổng ─────────────────────────────────────────────────────
let cong = null; let moCong = () => {};
const dongCong = () => { cong = new Promise((r) => { moCong = () => { cong = null; r(); }; }); };
const goiLlm = []; let dangLlm = 0; let dinhLlm = 0;
const llmTier = require('../lib/llm-tier');
llmTier.callLLMJson = async (_s, user, opts = {}) => {
  const step = String(opts.step || 'unknown');
  goiLlm.push(step);
  if (!step.startsWith('ho-so')) return { json: { declaration: { tenHang: 'Cốc giữ nhiệt bằng thép không gỉ', thanhPhanCauTao: 'thép không gỉ', congDung: 'đựng nước', tinhTrang: 'Mới 100%', thongSoKyThuat: [] } }, model: 'stub' };
  dangLlm += 1; dinhLlm = Math.max(dinhLlm, dangLlm);
  try {
    if (cong) await cong;
    if (step === 'ho-so-doc-du-kien') return { json: { duKien: [] }, model: 'stub' };
    const m = /BẢN MÁY GHÉP:\n([^\n]*)/.exec(String(user));
    return { json: { moTaEcus: m ? m[1] : '' }, model: 'stub' };
  } finally { dangLlm -= 1; }
};
globalThis.fetch = async () => { throw new Error('test không gọi mạng'); };

const API = require('../lib/ho-so/api');
const H = require('../lib/ho-so/index');
const inflight = require('../lib/inflight');
const { withPrivateData, isPrivate } = require('../lib/llm-privacy');
const { dataPath } = require('../lib/data-paths');
API._datDeps({
  identify: async () => null, webFacts: async () => null, thamChieu: async () => ({ oz: [], tbTchq: [] }),
  tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: async () => ({ tong: 0, maKhac: [] }),
});

let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n}${d !== undefined ? ` — ${JSON.stringify(d).slice(0, 400)}` : ''}`); } };
const SHADOW = dataPath('ho-so-shadow.jsonl');
const xoa = () => { try { fs.rmSync(SHADOW, { force: true }); } catch { /* chưa có */ } };
const doc = () => (fs.existsSync(SHADOW) ? fs.readFileSync(SHADOW, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const bangSau = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hoSoLlm = () => goiLlm.filter((s) => s.startsWith('ho-so')).length;
const tick = () => new Promise((r) => setImmediate(r));
const cho = async (dk, ms = 2000) => { const t = Date.now(); while (!dk() && Date.now() - t < ms) await new Promise((r) => setTimeout(r, 5)); return dk(); };

const HS = '96170010';
check('điều kiện test: 96170010 là mã lát 1 có ranh giới duyệt', H.hoSoApDung(HS) === true);
const kq = () => ({ status: 'REVIEW', results: [{ hs: HS, confidence: 80, reason: 'thuong' }], ecus: { description: 'cốc giữ nhiệt', level: 'GOOD', score: 80, missing: [] }, engine: { ms: 100, name: 'loop', gates: [{ round: 1, decision: 'CHOT' }] } });
const attrs = { tenHang: 'cốc giữ nhiệt chân không bằng thép không gỉ' };

// ── 1a. classify: trả trước khi hồ sơ dựng xong ──────────────────────────────────────────────────────────────
xoa(); goiLlm.length = 0; dongCong();
let t0 = Date.now();
const p1 = API.ganHoSoClassify(kq(), attrs, { noiBo: false, caller: 'cong-oz' });
const o1 = await p1;
let ms = Date.now() - t0;
check('classify shadow: phản hồi bằng sâu kết quả cũ', bangSau(o1, kq()));
check('classify shadow: trả về khi hồ sơ CHƯA dựng xong (chưa có dòng số đo, việc nền còn trong hàng)', doc().length === 0 && API.trangThaiNen().dangChay + API.trangThaiNen().cho === 1, [doc().length, API.trangThaiNen()]);
check('classify shadow: lúc trả về chưa có lượt LLM hồ sơ nào được gọi', hoSoLlm() === 0, goiLlm);
check('classify shadow: đường trả lời < 200 ms dù LLM hồ sơ treo vô hạn', ms < 200, { ms });
check('classify shadow: việc nền có chạy thật (LLM hồ sơ được gọi rồi treo ở cổng), vẫn chưa ghi dòng', await cho(() => hoSoLlm() >= 1) && doc().length === 0, [goiLlm, doc().length]);
moCong(); await API.choNenXong();
let d = doc();
check('classify shadow: mở cổng ⇒ việc nền xong ⇒ đúng MỘT dòng số đo đầy đủ (apDung, trangThai, benGoi, msBuoc)', d.length === 1 && d[0].apDung === true && d[0].endpoint === 'classify' && typeof d[0].trangThai === 'string' && d[0].benGoi === 'cong-oz' && d[0].msBuoc && Number.isFinite(d[0].msBuoc.docDuKien), d);
check('classify shadow: hàng nền về rỗng', API.trangThaiNen().dangChay === 0 && API.trangThaiNen().cho === 0, API.trangThaiNen());

// ── 1b. describe: trả ngay sau đường cũ ───────────────────────────────────────────────────────────────────
xoa(); goiLlm.length = 0; dongCong();
const cuJ = { status: 200, json: { customsDescription: 'Cốc giữ nhiệt bằng thép không gỉ', declaration: {}, compliance: { warnings: [] } } };
t0 = Date.now();
const oD = await API.describeTheoCo({ hsCode: HS, productName: 'cốc giữ nhiệt bằng thép không gỉ' }, { noiBo: false, caller: 'erp' }, async () => structuredClone(cuJ));
ms = Date.now() - t0;
check('describe shadow: phản hồi bằng sâu đường cũ, < 200 ms, chưa có dòng, chưa gọi LLM hồ sơ', bangSau(oD, cuJ) && ms < 200 && doc().length === 0 && hoSoLlm() === 0, { ms, n: doc().length, goiLlm });
moCong(); await API.choNenXong();
d = doc();
check('describe shadow: sau khi nền xong có một dòng endpoint describe, có đếm khớp dữ kiện với mô tả cũ', d.length === 1 && d[0].endpoint === 'describe' && d[0].benGoi === 'erp' && (d[0].loi || (d[0].duKienQD && Number.isFinite(d[0].duKienQD.tong))), d);
const oLoi = await API.describeTheoCo({ hsCode: HS, productName: 'cốc' }, { noiBo: false }, async () => ({ status: 502, json: { error: 'x' } }));
await API.choNenXong();
check('describe shadow: đường cũ lỗi ⇒ trả nguyên lỗi, không xếp việc nền, không thêm dòng (như cũ)', oLoi.status === 502 && doc().length === 1, [oLoi.status, doc().length]);

// ── 1c. declaration-sheet ───────────────────────────────────────────────────────────────────────────
xoa(); goiLlm.length = 0; dongCong();
const phieu = () => ({ fields: [], description: { customsDescription: 'Cốc giữ nhiệt bằng thép không gỉ', composedFrom: 'SHEET', declaration: {}, descriptionMeta: { length: 30, maxLength: 200, truncated: false, dropped: [] }, compliance: null } });
t0 = Date.now();
const oS = await API.ganHoSoSheet(phieu(), { hs: HS, tenHang: 'cốc giữ nhiệt' }, { noiBo: true, caller: 'erp' });
ms = Date.now() - t0;
check('sheet shadow: phiếu bằng sâu, < 200 ms, chưa có dòng, chưa gọi LLM hồ sơ', bangSau(oS, phieu()) && ms < 200 && doc().length === 0 && hoSoLlm() === 0, { ms, n: doc().length });
moCong(); await API.choNenXong();
d = doc();
check('sheet shadow: sau khi nền xong có một dòng endpoint declaration-sheet', d.length === 1 && d[0].endpoint === 'declaration-sheet' && d[0].noiBo === true, d);

// ── 1d. soát tờ khai: nhánh shadow không còn chờ song song ─────────────────────────────────────────────────────────
const srcCheck = fs.readFileSync(path.join(ROOT, 'lib', 'declaration-check.js'), 'utf8');
const nhanhShadow = (/if \(che === 'shadow'\) \{([\s\S]*?)\n  \}\n  const moi = await chaySoat\(\);/.exec(srcCheck) || [])[1] || '';
check('declaration-check: nhánh shadow xếp soát vào hàng nền, không Promise.all / không await chaySoat trên đường trả lời', /HSAPI\.chayNen\('declaration-check'/.test(nhanhShadow) && !/Promise\.all/.test(nhanhShadow) && nhanhShadow.indexOf('await chaySoat') > nhanhShadow.indexOf("HSAPI.chayNen(") && /return cu;/.test(nhanhShadow), nhanhShadow.slice(0, 300));
const srcApi = fs.readFileSync(path.join(ROOT, 'lib', 'ho-so', 'api.js'), 'utf8');
check('lib/ho-so/api.js: ba nhánh shadow (describe, classify, sheet) đều qua chayNen', (srcApi.match(/chayNen\('(describe|classify|declaration-sheet)'/g) || []).length === 3);

// ── 2. Trần đồng thời + hàng chờ + quá tải ───────────────────────────────────────────────────────────────────
xoa(); goiLlm.length = 0; dinhLlm = 0; dongCong();
const TT = API.trangThaiNen();
check('trần cứng: tối đa 2 lượt nền cùng lúc, hàng chờ 20', TT.toiDa === 2 && TT.hangCho === 20, TT);
const N = TT.toiDa + TT.hangCho + 3;
t0 = Date.now();
for (let i = 0; i < N; i += 1) await API.ganHoSoClassify(kq(), attrs, { noiBo: false, caller: 'cong-oz' });
ms = Date.now() - t0;
check(`${N} lượt dồn dập: cả ${N} phản hồi trả xong < 1 s dù mọi lượt LLM hồ sơ đang treo`, ms < 1000, { ms });
await cho(() => dangLlm === 2);
let st = API.trangThaiNen();
check('quá tải: đang chạy đúng 2, chờ 20, không vượt', st.dangChay === 2 && st.cho === 20 && dangLlm === 2, [st, dangLlm]);
d = doc();
check('quá tải: 3 lượt thừa bị bỏ NGAY với dòng boQua "qua-tai" (có maHs + benGoi, chỉ khoá gọn)', d.length === 3 && d.every((r) => r.boQua === 'qua-tai' && r.maHs === HS && r.benGoi === 'cong-oz' && Object.keys(r).every((k) => API.KHOA_BO_QUA.includes(k))), d);
moCong(); await API.choNenXong();
d = doc();
check('sau khi xả: 22 dòng hồ sơ + 3 dòng qua-tai; đỉnh LLM hồ sơ đồng thời ≤ 2', d.filter((r) => r.apDung === true).length === 22 && d.filter((r) => r.boQua === 'qua-tai').length === 3 && dinhLlm <= 2 && dinhLlm >= 1, [d.length, dinhLlm]);
const BC = require('../lib/ho-so/bao-cao-shadow');
const bc = BC.tongHopShadow(d);
check('báo cáo: qua-tai đếm ở boQua, không vào mẫu số dựng hồ sơ', bc.boQua['qua-tai'] === 3 && bc.soLuotDung === 22 && bc.soLuot === 25, [bc.boQua, bc.soLuotDung]);

// ── 3. Lỗi nền không lọt ra ──────────────────────────────────────────────────────────────────────────
xoa();
const r1 = API.chayNen('classify', HS, {}, () => { throw new Error('ném đồng bộ'); });
const r2 = API.chayNen('classify', HS, {}, async () => { throw new Error('promise rơi'); });
const r3 = API.chayNen('classify', HS, {}, () => Promise.reject(new Error('reject thẳng')));
let chayTiep = false;
const r4 = API.chayNen('classify', HS, {}, async () => { chayTiep = true; });
check('chayNen trả boolean ngay (không phải promise để ai lỡ await)', [r1, r2, r3, r4].every((x) => x === true));
check('chayNen với việc không phải hàm: không ném, trả false', API.chayNen('classify', HS, {}, null) === false && API.chayNen('classify', HS, {}, undefined) === false);
await API.choNenXong(); await tick(); await tick();
check('ba việc nền lỗi: không unhandledRejection, việc sau vẫn chạy, hàng về rỗng', rejRoi.length === 0 && chayTiep === true && API.trangThaiNen().dangChay === 0, [rejRoi, chayTiep, API.trangThaiNen()]);
const kqSai = { status: 'REVIEW', results: [{ hs: HS }], ecus: { description: 'x' }, engine: { gates: [] } };
const depsCu = { ...API.layDeps() };
API._datDeps({ ...depsCu, tinHieuDanhMuc: async () => { throw new Error('nguồn ngoài sập'); }, thamChieu: async () => { throw new Error('nguồn ngoài sập'); } });
const oSai = await API.ganHoSoClassify(structuredClone(kqSai), { tenHang: 'cốc' }, { noiBo: false });
await API.choNenXong(); await tick();
API._datDeps(depsCu);
check('hồ sơ nền gặp nguồn ngoài sập: phản hồi vẫn bằng sâu, không unhandledRejection, vẫn để lại dòng số đo', bangSau(oSai, kqSai) && rejRoi.length === 0 && doc().length === 1, [rejRoi, doc()]);
llmTier.callLLMJson = ((goc) => async (s, u, o = {}) => { if (String(o.step || '').startsWith('ho-so')) throw new Error('LLM sập'); return goc(s, u, o); })(llmTier.callLLMJson);
xoa();
const oLlm = await API.ganHoSoClassify(kq(), attrs, { noiBo: false });
await API.choNenXong(); await tick();
check('LLM hồ sơ sập ở nền: phản hồi bằng sâu, không unhandledRejection, dòng số đo vẫn ghi (rơi về luật / bản máy)', bangSau(oLlm, kq()) && rejRoi.length === 0 && doc().length === 1 && doc()[0].apDung === true, [rejRoi, doc()]);

// ── 4. Tắt êm (draining) ────────────────────────────────────────────────────────────────────────────
llmTier.callLLMJson = async (_s, user, opts = {}) => {
  const step = String(opts.step || '');
  goiLlm.push(step);
  if (cong) await cong;
  if (step === 'ho-so-doc-du-kien') return { json: { duKien: [] }, model: 'stub' };
  const m = /BẢN MÁY GHÉP:\n([^\n]*)/.exec(String(user));
  return { json: { moTaEcus: m ? m[1] : '' }, model: 'stub' };
};
xoa(); inflight.reset(); dongCong();
for (let i = 0; i < 4; i += 1) await API.ganHoSoClassify(kq(), attrs, { noiBo: false, caller: 'cong-oz' });
await cho(() => API.trangThaiNen().dangChay === 2);
check('lượt nền KHÔNG tính vào inflight (không giữ container khi tắt êm)', inflight.soDangChay() === 0 && API.trangThaiNen().dangChay === 2 && API.trangThaiNen().cho === 2, [inflight.soDangChay(), API.trangThaiNen()]);
t0 = Date.now();
const xa = await inflight.xa({ maxMs: 5000, buocMs: 5 });
check('inflight.xa() xong ngay (< 200 ms) dù còn 2 lượt nền treo + 2 lượt chờ', xa.conLai === 0 && Date.now() - t0 < 200, [xa, Date.now() - t0]);
const oTat = await API.ganHoSoClassify(kq(), attrs, { noiBo: false, caller: 'cong-oz' });
d = doc();
check('đang tắt: lượt mới vẫn trả kết quả cũ, không nhận việc nền, ghi boQua "dang-tat"', bangSau(oTat, kq()) && d.length === 1 && d[0].boQua === 'dang-tat' && API.trangThaiNen().cho === 2, [d, API.trangThaiNen()]);
moCong(); await API.choNenXong();
d = doc();
check('đang tắt: 2 lượt đang chạy làm nốt, 2 lượt chờ bị bỏ (dang-tat) — không khởi động LLM mới khi đang tắt', d.filter((r) => r.apDung === true).length === 2 && d.filter((r) => r.boQua === 'dang-tat').length === 3, d.map((r) => r.boQua || r.trangThai));
inflight.reset();

// ── 5. on + lượt chạy thử: vẫn chờ hồ sơ như cũ ──────────────────────────────────────────────────────────────
xoa(); goiLlm.length = 0;
process.env.HS_HO_SO = 'on';
const oOn = await API.ganHoSoClassify(kq(), attrs, { noiBo: false, caller: 'cong-oz' });
check('on: phản hồi có hoSo + hoSoMeta ngay khi trả (đã chờ hồ sơ), hàng nền không dùng, không ghi dòng', oOn.hoSo && oOn.hoSo.maHs === HS && oOn.hoSoMeta && oOn.hoSoMeta.cheDo === 'on' && API.trangThaiNen().dangChay === 0 && doc().length === 0 && hoSoLlm() >= 1, [Object.keys(oOn), doc().length]);
process.env.HS_HO_SO = 'shadow'; process.env.HS_HO_SO_THU_CALLERS = 'oz-noi-bo';
const oThu = await API.ganHoSoClassify(kq(), attrs, { noiBo: false, caller: 'oz-noi-bo' });
d = doc();
check('lượt chạy thử (HS_HO_SO_THU_CALLERS): có hoSo ngay, dòng số đo cheDo "thu" đã ghi TRƯỚC khi trả, không qua hàng nền', oThu.hoSo && oThu.hoSoMeta.thuNoiBo === true && d.length === 1 && d[0].cheDo === 'thu' && API.trangThaiNen().dangChay === 0, [Object.keys(oThu), d]);
delete process.env.HS_HO_SO_THU_CALLERS;
process.env.HS_HO_SO = 'off';
xoa();
const oOff = await API.ganHoSoClassify(kq(), attrs, { noiBo: false });
await API.choNenXong();
check('off: không hồ sơ, không việc nền, không dòng', bangSau(oOff, kq()) && doc().length === 0);
process.env.HS_HO_SO = 'shadow';

// ── 6. Ngữ cảnh riêng tư của lượt gọi đi theo việc nền ────────────────────────────────────────────────────────────
dongCong();
const thay = [];
API.chayNen('classify', HS, {}, async () => { await cong; thay.push(['cong-khai-1', isPrivate()]); });
API.chayNen('classify', HS, {}, async () => { await cong; thay.push(['cong-khai-2', isPrivate()]); });
await withPrivateData(async () => { API.chayNen('classify', HS, {}, async () => { thay.push(['rieng-tu', isPrivate()]); }); });
API.chayNen('classify', HS, {}, async () => { thay.push(['cong-khai-3', isPrivate()]); });
await cho(() => API.trangThaiNen().dangChay === 2);
moCong(); await API.choNenXong();
const m = Object.fromEntries(thay);
check('việc xếp trong withPrivateData chạy nền vẫn ở chế độ riêng tư dù được khởi chạy từ lượt công khai; việc công khai không bị lây', m['rieng-tu'] === true && m['cong-khai-1'] === false && m['cong-khai-2'] === false && m['cong-khai-3'] === false, thay);

// ── 7. Chi phí LLM của lượt bóng chạy nền: ghi vào dòng số đo, cộng trong báo cáo ──────────────────────────────────────
const { recordUsage, withUsage } = require("../lib/usage-context");
const tt = API.tomTatUsage([
  { provider: "minimax", model: "MiniMax-M2.7-highspeed", inputTokens: 1000, outputTokens: 200 },
  { provider: "minimax", model: "MiniMax-M2.7-highspeed", inputTokens: 500, outputTokens: 100 },
  { provider: "openrouter", model: "google/gemma-3-27b-it:free", inputTokens: -1, outputTokens: -1 },
  { provider: "sk-khoa bi mat!!", model: "ten la <b>", inputTokens: 10, outputTokens: 1 },
  null,
]);
check("tomTatUsage: cộng lượt + token, token -1 không cộng mà đếm khongRoToken", tt.soLuot === 4 && tt.tokenVao === 1510 && tt.tokenRa === 301 && tt.khongRoToken === 1, tt);
check("tomTatUsage: USD theo bảng giá lib/llm-cost.js (1500 vào × 0,30 + 300 ra × 1,20 mỗi triệu), lượt không có giá đếm khongRoGia", Math.abs(tt.usd - (1500 * 0.30 + 300 * 1.20) / 1e6) < 1e-9 && tt.khongRoGia === 2, tt);
check("tomTatUsage: khoá kênh \"<nhà cung cấp>/<model>\", tên sai khuôn ⇒ khac (không chép chuỗi lạ)", tt.kenh["minimax/MiniMax-M2.7-highspeed"]?.soLuot === 2 && tt.kenh["openrouter/google:gemma-3-27b-it:free"]?.soLuot === 1 && tt.kenh["khac/khac"]?.soLuot === 1 && !JSON.stringify(tt).includes("bi mat"), Object.keys(tt.kenh));
check("tomTatUsage: đầu vào rỗng / sai kiểu ⇒ toàn số 0", API.tomTatUsage(undefined).soLuot === 0 && API.tomTatUsage("x").usd === 0);
check("KHOA_SHADOW có chiPhiLlm", API.KHOA_SHADOW.includes("chiPhiLlm"));

llmTier.callLLMJson = async (_s, user, opts = {}) => {
  const step = String(opts.step || "");
  goiLlm.push(step);
  recordUsage({ provider: "minimax", model: "MiniMax-M2.7-highspeed", inputTokens: 1000, outputTokens: 200 });
  if (cong) await cong;
  if (step === "ho-so-doc-du-kien") return { json: { duKien: [] }, model: "stub" };
  const m2 = /BẢN MÁY GHÉP:\n([^\n]*)/.exec(String(user));
  return { json: { moTaEcus: m2 ? m2[1] : "" }, model: "stub" };
};
xoa(); goiLlm.length = 0; dongCong();
const ngoai = await withUsage(() => API.ganHoSoClassify(kq(), attrs, { noiBo: false, caller: "cong-oz" }));
check("classify shadow: usage của lượt HTTP KHÔNG chứa lượt LLM hồ sơ lúc trả về", bangSau(ngoai.result, kq()) && ngoai.usage.length === 0, ngoai.usage);
moCong(); await API.choNenXong();
d = doc();
const nLlm = hoSoLlm();
const cpD = d[0]?.chiPhiLlm;
check("classify shadow: dòng số đo mang chiPhiLlm = đúng số lượt LLM hồ sơ đã gọi ở nền, token và USD khớp", d.length === 1 && nLlm >= 1 && cpD && cpD.soLuot === nLlm && cpD.tokenVao === 1000 * nLlm && cpD.tokenRa === 200 * nLlm && Math.abs(cpD.usd - nLlm * (1000 * 0.30 + 200 * 1.20) / 1e6) < 1e-9 && cpD.kenh["minimax/MiniMax-M2.7-highspeed"].soLuot === nLlm, { nLlm, cpD });
check("classify shadow: dòng vẫn chỉ có khoá trong KHOA_SHADOW; chiPhiLlm chỉ gồm số + tên kênh", Object.keys(d[0]).every((k) => API.KHOA_SHADOW.includes(k)) && bangSau(Object.keys(cpD).sort(), ["kenh", "khongRoGia", "khongRoToken", "soLuot", "tokenRa", "tokenVao", "usd"]), Object.keys(cpD || {}));
check("classify shadow: kho usage của lượt HTTP vẫn rỗng SAU khi việc nền xong (việc nền dùng kho riêng)", ngoai.usage.length === 0, ngoai.usage);

xoa();
await API.describeTheoCo({ hsCode: HS, productName: "cốc giữ nhiệt bằng thép không gỉ" }, { noiBo: false, caller: "erp" }, async () => structuredClone(cuJ));
await API.ganHoSoSheet(phieu(), { hs: HS, tenHang: "cốc giữ nhiệt" }, { noiBo: true, caller: "erp" });
await API.choNenXong();
d = doc();
check("describe + sheet shadow: cả hai dòng đều có chiPhiLlm (lượt không gọi LLM ghi soLuot 0), token khớp số lượt", d.length === 2 && d.every((r) => r.chiPhiLlm && Number.isInteger(r.chiPhiLlm.soLuot) && r.chiPhiLlm.tokenVao === 1000 * r.chiPhiLlm.soLuot) && d.some((r) => r.chiPhiLlm.soLuot >= 1), d.map((r) => [r.endpoint, r.chiPhiLlm]));

const loiSauKhiGoi = await API.chayDoChiPhi(async () => { recordUsage({ provider: "minimax", model: "MiniMax-M2.7-highspeed", inputTokens: 7, outputTokens: 3 }); throw new Error("sập sau khi đã tốn 1 lượt"); });
check("chayDoChiPhi: việc ném lỗi ⇒ kq.loi, chi phí đã tiêu trước lỗi vẫn được tính", loiSauKhiGoi.kq.loi instanceof Error && loiSauKhiGoi.chiPhiLlm.soLuot === 1 && loiSauKhiGoi.chiPhiLlm.tokenVao === 7, loiSauKhiGoi.chiPhiLlm);
xoa();
const dLoi = API.dongShadow("classify", null, { maHs: HS, loi: "HO_SO_LOI", benGoi: "cong-oz", chiPhiLlm: loiSauKhiGoi.chiPhiLlm });
check("dòng lỗi vẫn mang chiPhiLlm", dLoi.loi === "HO_SO_LOI" && dLoi.chiPhiLlm.soLuot === 1, dLoi);

xoa();
API.ghiShadowSoat("shadow", { caller: "cong-oz" }, { loi: new Error("x") }, HS, [{ provider: "gemini", model: "gemini-2.5-flash", inputTokens: 2000, outputTokens: 100 }]);
API.ghiShadowSoat("shadow", { caller: "cong-oz" }, { loi: new Error("x") }, HS);
d = doc();
check("ghiShadowSoat: có usage ⇒ dòng mang chiPhiLlm (gemini 2000/100, USD 0,00085); không truyền ⇒ không có khoá", d.length === 2 && d[0].chiPhiLlm?.kenh["gemini/gemini-2.5-flash"]?.tokenVao === 2000 && Math.abs(d[0].chiPhiLlm.usd - (2000 * 0.30 + 100 * 2.50) / 1e6) < 1e-9 && !("chiPhiLlm" in d[1]), d);
check("declaration-check: việc nền truyền moi.usage vào ghiShadowSoat (không bỏ đi)", /HSAPI\.ghiShadowSoat\(che, ctx\.quyen, [^\n]*, d\.maHs, moi\.usage \|\| \[\]\)/.test(nhanhShadow), nhanhShadow.slice(-300));

xoa(); process.env.HS_HO_SO_THU_CALLERS = "oz-noi-bo";
const thu = await withUsage(() => API.ganHoSoClassify(kq(), attrs, { noiBo: false, caller: "oz-noi-bo" }));
d = doc();
check("lượt chạy thử: usage vẫn về phản hồi như cũ, dòng số đo KHÔNG lặp lại chiPhiLlm", thu.usage.length >= 1 && d.length === 1 && d[0].cheDo === "thu" && !("chiPhiLlm" in d[0]), [thu.usage.length, d]);
delete process.env.HS_HO_SO_THU_CALLERS;

const CP = (soLuot, vao, ra, usd, kenh) => ({ soLuot, tokenVao: vao, tokenRa: ra, khongRoToken: 0, usd, khongRoGia: 0, kenh });
const DCP = [
  { ts: "2026-11-21T01:00:00.000Z", endpoint: "classify", maHs: HS, cheDo: "shadow", apDung: true, trangThai: "DU_CAN_CU", benGoi: "cong-oz", chiPhiLlm: CP(2, 2000, 400, 0.001, { "minimax/MiniMax-M2.7-highspeed": { soLuot: 2, tokenVao: 2000, tokenRa: 400, usd: 0.001 } }) },
  { ts: "2026-11-21T02:00:00.000Z", endpoint: "classify", maHs: HS, cheDo: "shadow", apDung: true, loi: "HO_SO_LOI", benGoi: "cong-oz", chiPhiLlm: CP(1, 500, 50, 0.0005, { "gemini/gemini-2.5-flash": { soLuot: 1, tokenVao: 500, tokenRa: 50, usd: 0.0005 } }) },
  { ts: "2026-11-22T01:00:00.000Z", endpoint: "describe", maHs: HS, cheDo: "shadow", apDung: true, trangThai: "THIEU_DU_KIEN", benGoi: "erp", chiPhiLlm: { ...CP(3, 3000, 600, 0.002, { "minimax/MiniMax-M2.7-highspeed": { soLuot: 2, tokenVao: 2000, tokenRa: 400, usd: 0.001 }, "gemini/gemini-2.5-flash": { soLuot: 1, tokenVao: 1000, tokenRa: 200, usd: 0.001 }, "kenh rac <b>/x": { soLuot: 9, tokenVao: 9, tokenRa: 9, usd: 9 } }), khongRoGia: 1, khongRoToken: 1 } },
  { ts: "2026-11-22T02:00:00.000Z", endpoint: "classify", maHs: HS, cheDo: "thu", apDung: true, trangThai: "DU_CAN_CU", benGoi: "oz-noi-bo" },
  { ts: "2026-11-22T03:00:00.000Z", endpoint: "classify", maHs: HS, cheDo: "shadow", boQua: "qua-tai", benGoi: "cong-oz" },
  { ts: "2026-11-22T04:00:00.000Z", endpoint: "classify", maHs: "39269099", cheDo: "shadow", apDung: false, benGoi: "cong-oz" },
];
const bcp = BC.tongHopShadow(DCP).chiPhiLlm;
check("báo cáo chiPhiLlm: tổng 3 lượt đo (kể cả dòng lỗi), 6 lượt LLM, 5500 vào / 1050 ra, USD 0,0035; 1 dòng dựng hồ sơ không có số đo", bcp.soLuotDo === 3 && bcp.soLuotLlm === 6 && bcp.tokenVao === 5500 && bcp.tokenRa === 1050 && Math.abs(bcp.usd - 0.0035) < 1e-9 && bcp.khongCoSoDo === 1 && bcp.khongRoGia === 1 && bcp.khongRoToken === 1, bcp);
check("báo cáo chiPhiLlm.theoNgay (UTC): 21/11 = 3 lượt LLM, 22/11 = 3 lượt LLM", bangSau(Object.keys(bcp.theoNgay), ["2026-11-21", "2026-11-22"]) && bcp.theoNgay["2026-11-21"].soLuotLlm === 3 && bcp.theoNgay["2026-11-21"].tokenVao === 2500 && bcp.theoNgay["2026-11-22"].soLuotLlm === 3 && Math.abs(bcp.theoNgay["2026-11-22"].usd - 0.002) < 1e-9, bcp.theoNgay);
check("báo cáo chiPhiLlm.theoNhaCungCap: minimax 4 lượt / 4000 vào, gemini 2 lượt / 1500 vào; khoá kênh rác bị bỏ", bangSau(Object.keys(bcp.theoNhaCungCap).sort(), ["gemini", "minimax"]) && bcp.theoNhaCungCap.minimax.soLuotLlm === 4 && bcp.theoNhaCungCap.minimax.tokenVao === 4000 && bcp.theoNhaCungCap.gemini.soLuotLlm === 2 && bcp.theoNhaCungCap.gemini.tokenVao === 1500 && Math.abs(bcp.theoNhaCungCap.gemini.usd - 0.0015) < 1e-9 && !JSON.stringify(bcp).includes("rac"), bcp.theoNhaCungCap);
const bcLoc = BC.tongHopShadow(DCP, { benGoi: "erp" }).chiPhiLlm;
check("báo cáo chiPhiLlm theo lọc benGoi=erp: chỉ còn 3 lượt LLM", bcLoc.soLuotLlm === 3 && bcLoc.soLuotDo === 1, bcLoc);
check("báo cáo rỗng: chiPhiLlm toàn 0, các bảng rỗng", BC.tongHopShadow([]).chiPhiLlm.soLuotLlm === 0 && bangSau(BC.tongHopShadow([]).chiPhiLlm.theoNgay, {}));
xoa(); fs.mkdirSync(path.dirname(SHADOW), { recursive: true }); fs.writeFileSync(SHADOW, `${DCP.map((x) => JSON.stringify(x)).join("\n")}\n`);
const { execFileSync } = await import("child_process");
let bang = ""; try { bang = execFileSync(process.execPath, [path.join(ROOT, "scripts", "bao-cao-shadow.mjs")], { env: process.env, encoding: "utf8" }); } catch (e) { bang = String(e.stdout || e.message); }
check("scripts/bao-cao-shadow.mjs in khối chi phí LLM theo ngày + nhà cung cấp", /Chi phí LLM của lượt bóng/.test(bang) && /ngày 2026-11-21/.test(bang) && /nhà cung cấp minimax\s+4 lượt LLM/.test(bang) && /0\.0035 USD/.test(bang), bang.slice(-900));
xoa();

await tick();
check('cả bài: không có unhandledRejection nào', rejRoi.length === 0, rejRoi);
console.log(`\n${pass} đạt, ${fail} trượt`);
process.exit(fail ? 1 : 0);
