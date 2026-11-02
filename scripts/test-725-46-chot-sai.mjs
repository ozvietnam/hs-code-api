#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * #725 lỗi 46 — /api/classify chốt SAI mà nói như chắc chắn: "Chân pin bấm cos … đồng mạ thiếc, bấm vào đầu dây dẫn" →
 * 85369094 (MFN 25 %), CHOT, tin cậy 95, declarationOptions[0].ruiRo THAP; 85369012 (MFN 0 %) bị loại với lý do bịa "dành cho
 * đầu nối có dây dẫn kèm theo"; "41 nguồn độc lập đồng thuận 85369094" là đếm mọi TB của mã cho hàng khác.
 *
 * LLM GIẢ LẬP (callLLMJson trả JSON dựng sẵn — không mạng). Dữ liệu: mô tả hàng TỔNG HỢP; mã HS + TB-TCHQ công khai.
 * Khẳng định:
 *   A. ca chân pin → không CHOT 85369094 rủi ro THẤP; 85369012 xuất hiện trong results + declarationOptions kèm tên nguyên văn;
 *      lý do loại bịa mang nhãn AI_CHUA_KIEM; điều kiện bịa không ĐẠT; không nhãn GIR nào từ luật mới; canCuPhapLy không nhắc TB.
 *   B. ca đúng thuộc "Loại khác" không bị hạ oan (luật không bắn, CHOT giữ, ruiRo THAP).
 *   C. đếm nguồn theo độ giống tên hàng (countIndependentSources) + bộ ca báo oan của độ giống tên.
 *   D. MiniMax: bước bị cụt ở maxTokens (finish_reason=length) → ngắt suy nghĩ cho bước đó, lượt sau gọi tắt suy nghĩ NGAY.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let passed = 0; let failed = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || extra === undefined ? '' : ` ${JSON.stringify(extra).slice(0, 1200)}`}`);
  if (ok) passed += 1; else failed += 1;
};

process.env.HS_CLASSIFY_ENGINE = 'loop';
process.env.MIC_OFF = '1';
process.env.HS_ACCESS_LOG = '0';
delete process.env.HS_HO_SO;
delete process.env.ZAI_WEB_FACTS;
delete process.env.LLM_STEP_UNDERSTAND; delete process.env.LLM_STEP_GIR;
console.error = () => {}; console.warn = () => {};
globalThis.fetch = async () => { throw new Error('test: không được gọi mạng'); };

const llmTier = require('../lib/llm-tier.js');
const realCallLLMJson = llmTier.callLLMJson;
let script = [];
let calls = [];
llmTier.callLLMJson = async (sys, user, opts) => {
  calls.push({ step: opts?.step, minimax: opts?.minimax || null });
  const next = script.shift();
  if (next instanceof Error) throw next;
  if (next === undefined) throw new Error('test: hết kịch bản LLM');
  return { json: typeof next === 'function' ? next() : next, provider: 'gia-lap', model: 'gia-lap' };
};
const { classify } = require('../lib/classify');
const { countIndependentSources } = require('../lib/precedent-search.js');
const { doGiongTenHang } = require('../lib/giong-ten-hang.js');
const K = require('../lib/kiem-truoc-chot.js');

const nz = (s) => String(s || '').replace(/\D/g, '');

// ═══ A. Ca prod #725-46 ═══════════════════════════════════════════════════════════════════════════════════════════════════
const TEN = 'Chân pin bấm cos kết nối đầu dây điện, đồng mạ thiếc, bấm vào đầu dây dẫn để đấu nối trong tủ điện';
const R1 = {
  product: { nameVi: 'Chân pin bấm cos (đầu cốt) bằng đồng mạ thiếc', nameEn: 'crimp terminal pin', purpose: 'bấm vào đầu dây dẫn để đấu nối trong tủ điện', mechanism: 'không áp dụng', material: 'đồng mạ thiếc', form: 'hoàn chỉnh', evidence: {} },
  hypotheses: [
    { chapter: '85', heading4: '8536', subheading6: '853690', why: 'đầu nối điện cho dây dẫn, điện áp thấp', confidence: 90 },
    { chapter: '85', heading4: '8518', subheading6: '851890', why: 'bộ phận', confidence: 76 },
  ],
  verify: { searchVi: ['chân pin bấm cos', 'đầu cốt'], notesChapters: ['85'], codes8: ['85369094', '85369012'], micQuery: null, unknowns: [] },
};
const R2_SAI = {
  decision: 'CHOT', hs: '85369094', confidence: 95, gir: 'GIR 1 và GIR 6',
  reason: 'Đầu nối không có dây dẫn kèm theo, không thuộc phiến đầu nối điện thoại → dòng Loại khác 8536.90.94.',
  basis: [{ stream: 'SAN_PHAM', claim: 'chất liệu', evidence: 'đồng mạ thiếc' }],
  conditions: [
    { fact: 'Hàng không phải đầu nối có cáp hoặc dây dẫn kèm theo', status: 'MET', evidence: 'bấm vào đầu dây dẫn' },
    { fact: 'Chất liệu đồng mạ thiếc', status: 'MET', evidence: 'đồng mạ thiếc' },
  ],
  alternatives: [{ hs: '85369012', whyNot: 'Dòng này dành cho đầu nối có dây dẫn kèm theo, hàng chỉ là chân pin rời.' }],
  questions: [],
};
const runA = async () => {
  calls = [];
  // Kịch bản dư (giải trình sổ tay nếu có) — vòng giải trình giữ nguyên đáp án.
  script = [R1, R2_SAI, { ...R2_SAI, explanations: [] }, { ...R2_SAI, explanations: [] }];
  return classify({ tenHang: TEN }, {});
};
{
  const r = await runA();
  const top = r.results?.[0];
  const opt0 = r.dossier?.declarationOptions?.[0];
  check('A1: vẫn trả mã AI chọn ở top (luật không tự đổi mã)', top?.hs === '85369094', r.results?.map((x) => x.hs));
  check('A2: decision không còn CHOT', r.dossier?.decision !== 'CHOT', r.dossier?.decision);
  check('A3: declarationOptions[0].ruiRo không THAP', opt0 && opt0.ruiRo !== 'THAP', opt0);
  check('A4: tin cậy ≤ 60 (không còn 95)', Number(top?.confidence) <= 60, top?.confidence);
  check('A5: review.needed + lý do nêu TB cùng loại hàng (6201/3055/3205)', r.review?.needed === true && /6201\/TB-TCHQ/.test(r.review.reasons.join(' ')) && /3055\/TB-TCHQ/.test(r.review.reasons.join(' ')) && /3205\/TB-TCHQ/.test(r.review.reasons.join(' ')), r.review);
  check('A6: review nêu luật "Loại khác" bị trừ (tiêu đề 8536901)', /NGHI|Loại khác/.test(r.review.reasons.join(' ')) && /8536901/.test(r.review.reasons.join(' ')), r.review);
  const r12 = r.results.find((x) => x.hs === '85369012');
  check('A7: 85369012 ở results ngay sau mã chốt', r.results?.[1]?.hs === '85369012', r.results?.map((x) => [x.hs, x.source]));
  check('A8: 85369012 kèm tên nguyên văn tiêu đề "Đầu nối và các bộ phận dùng để nối cho dây dẫn và cáp"', /Đầu nối và các bộ phận dùng để nối cho dây dẫn và cáp/.test(r12?.reason || ''), r12?.reason);
  check('A9: 85369012 có tbTchq 6201', (r12?.tbTchq || []).some((e) => /6201/.test(e.tbTchqNumber || '')), (r12?.tbTchq || []).map((e) => e.tbTchqNumber));
  const o12 = (r.dossier?.declarationOptions || []).find((o) => o.hs === '85369012');
  check('A10: declarationOptions có 85369012, nguồn máy đề nghị, có tên nguyên văn', !!o12 && /Máy đề nghị xem/.test(o12.canCuVi) && /dùng để nối cho dây dẫn và cáp/.test(o12.canCuVi), o12);
  check('A11: lý do loại bịa của AI mang nhãn AI_CHUA_KIEM', /AI_CHUA_KIEM/.test(r12?.reason || '') || (r.dossier?.alternatives || []).some((a) => a.hs === '85369012' && a.lyDoChuaKiem?.nguonLoai === 'AI_CHUA_KIEM'), { r12: r12?.reason, alts: r.dossier?.alternatives });
  const cBia = (top?.conditions || []).find((c) => /kèm theo/.test(c.fact));
  check('A12: điều kiện bịa "không phải đầu nối có … kèm theo" không còn MET, nhãn AI_CHUA_KIEM', cBia && cBia.status !== 'MET' && cBia.nguonLoai === 'AI_CHUA_KIEM', top?.conditions);
  check('A13: điều kiện thật (chất liệu) giữ MET', (top?.conditions || []).some((c) => /Chất liệu/.test(c.fact) && c.status === 'MET'), top?.conditions);
  const sig = (r.rankingSignals || []).find((s) => s.signal === 'signal:soNguonDongThuan');
  check('A14: không còn tín hiệu "N nguồn đồng thuận 85369094" (TB đếm theo mã)', !sig || !/85369094/.test(sig.effect) || sig.independent < 2, sig);
  check('A15: không nhãn GIR nào có nguồn kiem-truoc-chot / tiền lệ', !(r.girRulesApplied || []).some((g) => /kiem-truoc-chot|TIEN_LE_CUNG_LOAI|6201/.test(JSON.stringify(g))), r.girRulesApplied);
  check('A16: canCuPhapLy không trích TB / luật mới', !/6201|TIEN_LE_CUNG_LOAI|NGHI_LOAI_KHAC/.test(JSON.stringify(r.canCuPhapLy || {})), r.canCuPhapLy);
  check('A17: khối kiemTruocChot có 2 loại cảnh báo, basis HEURISTIC', (r.kiemTruocChot?.canhBao || []).some((c) => c.ma === 'TIEN_LE_CUNG_LOAI_KHAC_MA') && (r.kiemTruocChot?.canhBao || []).some((c) => c.ma === 'NGHI_LOAI_KHAC_THUOC_DONG_BI_TRU') && r.kiemTruocChot.canhBao.every((c) => c.basis === 'HEURISTIC'), r.kiemTruocChot);
  check('A18: không nâng tự tin bằng TIEN_LE/WCO khi luật bắn', !(top?.basis || []).some((b) => b.stream === 'TIEN_LE' || b.stream === 'WCO'), top?.basis);
}

// ═══ B. Ca đúng — không hạ oan ═════════════════════════════════════════════════════════════════════════════════════════════
// B1: hàng THẬT thuộc dòng "Loại khác" 85369094 (cổng kiểm tra pinblock — TB 3925 công khai kết luận 85369094).
{
  const TEN_B = 'Pinblock cổng kết nối giữa linh kiện được kiểm tra và thiết bị kiểm tra, điện áp 80mV';
  const R1B = { product: { nameVi: 'Pinblock cổng kết nối thiết bị kiểm tra', purpose: 'kết nối linh kiện với thiết bị kiểm tra', material: '', form: 'hoàn chỉnh', evidence: {} }, hypotheses: [{ chapter: '85', heading4: '8536', subheading6: '853690', why: 'thiết bị đấu nối điện áp thấp', confidence: 85 }], verify: { searchVi: ['pinblock'], codes8: ['85369094'], micQuery: null, unknowns: [] } };
  const R2B = { decision: 'CHOT', hs: '85369094', confidence: 88, gir: 'GIR 1 và GIR 6', reason: 'Thiết bị đấu nối khác, không phải đầu nối cho dây dẫn.', basis: [{ stream: 'SAN_PHAM', claim: 'cổng kết nối', evidence: 'cổng kết nối' }], conditions: [], alternatives: [], questions: [] };
  script = [R1B, R2B, { ...R2B, explanations: [] }, { ...R2B, explanations: [] }];
  const r = await classify({ tenHang: TEN_B }, {});
  check('B1: pinblock → luật không bắn (không kiemTruocChot)', !r.kiemTruocChot, r.kiemTruocChot);
  check('B1: pinblock → decision giữ CHOT', r.dossier?.decision === 'CHOT', r.dossier?.decision);
  check('B1: pinblock → mã giữ 85369094', r.results?.[0]?.hs === '85369094', r.results?.map((x) => x.hs));
}
// B2: hàng đúng dòng có tên — chốt 85369012 cho terminal; TB 3056/3206 (85369019, dòng anh em cùng tiêu đề, khác ngưỡng 16 A)
// KHÔNG được làm bắn luật tiền lệ.
{
  const r = K.kiemTruocChot({ topHs: '85369012', hang: { tenHang: TEN, moTa: TEN }, ungVien: ['85369019', '85369094'] });
  check('B2: chốt 85369012 (đúng) → không cảnh báo (dòng anh em 85369019 cùng tiêu đề không tính)', !r.coCo, r.canhBao.map((c) => c.noiDung));
}
// B3: hàng không có TB giống — kẹp giấy thép → không cảnh báo tiền lệ.
{
  const r = K.kiemTruocChot({ topHs: '83059010', hang: { tenHang: 'Kẹp giấy văn phòng', moTa: 'Kẹp giấy văn phòng bằng thép mạ niken, dài 28 mm' }, ungVien: ['83059090', '73269099'] });
  check('B3: kẹp giấy → không cảnh báo', !r.coCo, r.canhBao);
}
// B4: lý do loại ĐÚNG chữ biểu thuế không bị gắn nhãn chưa kiểm.
{
  check('B4: "dành cho dòng điện dưới 16 A" (đúng tên dòng) → không nhãn', K.kiemLyDoLoai({ hs: '85369012', reason: 'Dòng này dành cho đầu nối dòng điện dưới 16 A' }) === null);
  check('B4: điều kiện phủ định về vật liệu (không nói về dòng biểu thuế) → giữ MET', K.kiemDieuKien([{ fact: 'Hàng không phải bằng nhựa', status: 'MET', evidence: 'đồng' }], '85369094')[0].status === 'MET');
}

// ═══ C. Đếm nguồn theo độ giống tên hàng ═══════════════════════════════════════════════════════════════════════════════════
{
  const hang = { tenHang: TEN, moTa: TEN };
  const s94 = countIndependentSources('85369094', hang);
  const s12 = countIndependentSources('85369012', hang);
  check('C1: 85369094 — 0 nguồn tên hàng giống (trước đây "41 nguồn")', s94.independent === 0, s94);
  check('C2: 85369012 — ≥ 3 TB tên hàng giống (6201, 3055, 3205)', s12.independent >= 3 && s12.sample.every((x) => x.loaiNguon === 'TB-TCHQ'), s12);
  check('C3: thiếu mô tả hàng → không đếm theo mã nữa', countIndependentSources('85369094').independent === 0);
  // Báo oan của độ giống tên: TB khác loại cùng mã / cùng nhóm không được tính "giống".
  const oan = ['Pinblock; Cổng kết nối linh kiện được kiểm tra và thiết bị kiểm tra, điện áp 80mV/0.5A', 'Mạch in đã lắp ráp, cổng nối nguồn (bộ phận của máy chiếu di động thông minh) - POGO Board', 'Nắp chụp bảo vệ tụ điện bằng nhựa (plastic protective cap for capacitor)', 'Đầu nối tròn dạng phích cắm (circular plug connector, 62GB-16F12-10PN): đầu nối đực vỏ kim loại', 'Dây dẫn điện ALDUS035; Dây dẫn điện ALDUS035, dùng làm nguyên liệu đầu vào'];
  for (const t of oan) check(`C4: không giống — "${t.slice(0, 40)}…"`, !doGiongTenHang(hang, t).giong, doGiongTenHang(hang, t));
  for (const t of ['Terminal.; Terminal - Đầu nối dây điện (dưới 1000V, dưới 16A)', 'Terminal SSF-01T-P1.4AB — Đầu nối điện bằng đồng mạ thiếc, dùng để nối dây dẫn và cáp']) check(`C5: giống — "${t.slice(0, 40)}…"`, doGiongTenHang(hang, t).giong, doGiongTenHang(hang, t));
}

// ═══ D. MiniMax: cụt ở maxTokens → ngắt suy nghĩ theo bước ═══════════════════════════════════════════════════════════════
{
  const EL = require('../lib/engine-loop.js');
  EL._resetNgatSuyNghi();
  delete process.env.LOOP_NGAT_SUY_NGHI_MS;
  const off = (c) => c?.minimax?.extraBody?.thinking?.type === 'disabled';
  const CUT = () => new Error('No parseable JSON in response [minimax/MiniMax-M3, 33025 ký tự, finish_reason=length: "<think> …" … "…"]');
  const OK = { decision: 'CHOT', hs: '85369012' };
  const goi = (step) => EL.callWithFallback('sys', 'user', { step, maxTokens: 10000, timeoutMs: 60000 }, []);

  calls = []; script = [CUT(), OK];
  const r1 = await goi('gir');
  check('D1: lượt đầu cụt → gọi lại tắt suy nghĩ (2 lời gọi, lời 2 thinking disabled)', calls.length === 2 && !off(calls[0]) && off(calls[1]) && r1.fallback === true, calls);
  calls = []; script = [OK];
  const log2 = [];
  const r2 = await EL.callWithFallback('sys', 'user', { step: 'gir', maxTokens: 10000, timeoutMs: 60000 }, log2);
  check('D2: lượt sau cùng bước → tắt suy nghĩ NGAY (1 lời gọi), log thinking off-ngay', calls.length === 1 && off(calls[0]) && r2.thinkingOffNgay === true && log2.some((l) => l.thinking === 'off-ngay'), { calls, log2 });
  calls = []; script = [{ product: { nameVi: 'x' } }];
  await goi('understand');
  check('D3: bước khác không bị ảnh hưởng (understand vẫn suy nghĩ)', calls.length === 1 && !off(calls[0]), calls);
  check('D4: trạng thái ngắt hiện ở ngatSuyNghiTrangThai()', EL.ngatSuyNghiTrangThai().gir?.mo === true, EL.ngatSuyNghiTrangThai());

  EL._resetNgatSuyNghi();
  calls = []; script = [new Error('timeout sau 60000ms'), OK, OK];
  await goi('gir');
  calls = []; await goi('gir');
  check('D5: hết giờ (không phải cụt maxTokens) → KHÔNG mở ngắt suy nghĩ', calls.length === 1 && !off(calls[0]), calls);

  EL._resetNgatSuyNghi();
  process.env.LOOP_NGAT_SUY_NGHI_MS = '0';
  calls = []; script = [CUT(), OK, OK];
  await goi('gir'); calls = []; await goi('gir');
  check('D6: LOOP_NGAT_SUY_NGHI_MS=0 → tắt cơ chế (lượt sau vẫn thử suy nghĩ)', calls.length === 1 && !off(calls[0]), calls);

  EL._resetNgatSuyNghi();
  process.env.LOOP_NGAT_SUY_NGHI_MS = '20';
  calls = []; script = [CUT(), OK]; await goi('gir');
  await new Promise((res) => setTimeout(res, 40));
  calls = []; script = [OK]; await goi('gir');
  check('D7: hết cửa sổ → lượt dò suy nghĩ lại; dò thành công thì đóng ngắt', calls.length === 1 && !off(calls[0]) && !EL.ngatSuyNghiTrangThai().gir, { calls, st: EL.ngatSuyNghiTrangThai() });
  delete process.env.LOOP_NGAT_SUY_NGHI_MS;
  EL._resetNgatSuyNghi();

  // D8: finish_reason đi từ API MiniMax (fetch giả) → chat() → thông điệp lỗi callLLMJson.
  const fetchCu = globalThis.fetch;
  process.env.MINIMAX_API_KEY = 'test-key';
  globalThis.fetch = async (url) => {
    if (!String(url).includes('/chat/completions')) throw new Error('test: chỉ giả MiniMax');
    const body = JSON.stringify({ choices: [{ message: { content: '<think>suy nghĩ rất dài chưa xong…' }, finish_reason: 'length' }], usage: { prompt_tokens: 10, completion_tokens: 10000 } });
    return { ok: true, status: 200, text: async () => body };
  };
  let msg = '';
  try { await realCallLLMJson('sys', 'user', { step: 'gir', maxTokens: 100, timeoutMs: 5000 }); } catch (e) { msg = String(e.message); }
  check('D8: thông điệp lỗi parse mang finish_reason=length (trong 200 ký tự đầu của chuỗi chính)', /finish_reason=length/.test(msg) && /chuỗi chính: [^\n]{0,200}finish_reason=length|^[^\n]{0,200}finish_reason=length/.test(msg), msg.slice(0, 600));
  globalThis.fetch = fetchCu;
  delete process.env.MINIMAX_API_KEY;
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
