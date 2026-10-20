#!/usr/bin/env node
/**
 * Issue #359 Lỗi 3 — mã thay thế phải kèm `lyDoThayThe` dẫn TÊN DÒNG 8 SỐ.
 *
 * Ca thật (20/10, hàng "Nắp khóa 4000-68513"): engine đưa mã thay thế 8302.50.00 cho
 * "nắp khóa tủ điện". Người khai mở dòng đó ra mới thấy biểu thuế ghi
 * "Giá để mũ, mắc mũ, chân giá đỡ và các loại giá cố định tương tự" — không liên quan gì
 * với nắp tủ điện. Gợi ý sai bản chất không kèm tên dòng thì người dùng không có gì để
 * tự loại bỏ nó. Nay MỌI mã thay thế phải tự nói mình là dòng nào.
 *
 * Bất biến:
 *   1. `lyDoThayThe` lấy tên dòng 8 số từ data/tax.json (biểu thuế Tổng cục) — KHÔNG dùng
 *      chú giải sinh bởi AI (đó là nguồn AI_CHUA_KIEM, luật 7b: không được làm căn cứ).
 *   2. Dòng "Loại khác" thì tự nói vô nghĩa → nêu các dòng anh em cùng phân nhóm để biết "khác" gồm gì.
 *   3. KHÔNG bịa: mã không có trong biểu thuế → không gắn trường.
 *   4. CHỈ gắn trường — không đổi thứ tự, không lọc bỏ mã nào.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.HS_API_TOKEN = 'test-token';
process.env.HS_CLASSIFY_ENGINE = 'loop';
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';

let maThayThe = null;
try {
  maThayThe = require('../lib/ma-thay-the.js');
} catch {
  /* đỏ: chưa có module — các bất biến còn lại chạy sau khi có */
}
const { taxData } = require('../lib/data.js');

let passed = 0;
let failed = 0;
function assert(name, cond, detail) {
  if (cond) { console.log('PASS', name); passed += 1; }
  else { console.log('FAIL', name, detail || ''); failed += 1; }
}

assert('tồn tại lib/ma-thay-the.js', !!maThayThe);
const { lyDoThayThe, ganLyDoThayThe } = maThayThe || { lyDoThayThe: () => null, ganLyDoThayThe: (l) => l || [] };

// ── Ca lỗi trong issue ────────────────────────────────────────────────────────
const lyDo8302 = lyDoThayThe('83025000');
assert('8302.50.00 → lyDoThayThe nêu tên dòng biểu thuế thật',
  typeof lyDo8302 === 'string' && lyDo8302.includes('83025000') && /giá để mũ/i.test(lyDo8302), JSON.stringify(lyDo8302));
console.log('   ', lyDo8302);

// ── Dòng "Loại khác": tự nói vô nghĩa → phải nêu dòng anh em cùng phân nhóm ─────
const lyDoResidual = lyDoThayThe('85389019');
assert('dòng 8538.90.19 ("Loại khác") không dừng ở chữ "Loại khác"',
  typeof lyDoResidual === 'string' && /loại khác/i.test(lyDoResidual) && lyDoResidual.length > 60, JSON.stringify(lyDoResidual));
assert('dòng residual nêu được dòng anh em có tên thật trong cùng phân nhóm 8538.90',
  /853890(11|12|13|20)/.test(lyDoResidual), JSON.stringify(lyDoResidual));
console.log('   ', lyDoResidual);

// ── KHÔNG bịa ────────────────────────────────────────────────────────────────
assert('mã không có trong biểu thuế → KHÔNG gắn lyDoThayHe', lyDoThayThe('99999999') === null, String(lyDoThayThe('99999999')));
assert('mã rỗng/rác → KHÔNG gắn', lyDoThayThe('') === null && lyDoThayThe(null) === null && lyDoThayThe('abc') === null);
assert('chấp nhận mã có dấu chấm (8302.50.00) như người dùng gõ', lyDoThayThe('8302.50.00') === lyDo8302);

// ── ganLyDoThayThe: bỏ mã đầu (mã CHỌN, không phải mã thay thế) ────────────────
const ds = [
  { hsCode: '85389019', confidence: 80 },
  { hsCode: '83025000', confidence: 40 },
  { hsCode: '39269099', confidence: 20 },
];
const gan = ganLyDoThayThe(ds);
assert('mã đầu (mã chọn) KHÔNG bị gắn lyDoThayThe', gan[0].lyDoThayThe === undefined, JSON.stringify(gan[0]));
assert('mọi mã thay thế đều có lyDoThayThe', gan[1].lyDoThayThe && gan[2].lyDoThayThe, JSON.stringify(gan));
assert('lyDoThayHe nói đúng tên dòng của chính mã đó',
  gan[1].lyDoThayThe === lyDo8302 && /39269099/.test(gan[2].lyDoThayThe), JSON.stringify(gan.map((g) => g.lyDoThayThe)));
assert('KHÔNG đổi thuật toán: thứ tự, confidence, mã giữ nguyên', gan[1].hsCode === '83025000' && gan[2].confidence === 20 && gan.length === 3);
assert('danh sách gốc KHÔNG bị mutate', ds[1].lyDoThayThe === undefined);
assert('danh sách rỗng / không phải mảng thì không nổ', ganLyDoThayThe([]).length === 0 && ganLyDoThayThe(null) === null);

// ── Cả hai endpoint dùNG CHUNG một nguồn gọi LLM ─────────────────────────────
// lib/classify.js và api/suggest.js đều `const { callLLMJson } = require('./llm-tier')`
// ở đầu tệp — tức gắn stub SAU khi require là vô hiệu với tệp nạp trước. Vì vậy chỉ
// được MỘT stub, cài trước mọi require, và tự phân nhánh theo nội dung prompt.
const llmTier = require('../lib/llm-tier');
const R1_LOOP = {
  product: { nameVi: 'nắp che ổ khóa tủ điện', nameEn: 'cabinet lock cover', purpose: 'che ổ khóa tủ bảng điều khiển', mechanism: 'thủ công', material: 'nhựa', evidence: {} },
  hypotheses: [{ chapter: '85', heading4: '8538', subheading6: '853890', why: 'bộ phận của bảng điều khiển', confidence: 75 }],
  verify: { searchVi: ['nắp ổ khóa tủ điện'], codes8: ['85389019'], micQuery: null, unknowns: [] },
};
const CHOT_LOOP = {
  decision: 'CHOT', hs: '85389019', confidence: 80, reason: 'bộ phận của tủ bảng điều khiển',
  basis: [{ stream: 'SAN_PHAM', claim: 'che ổ khóa tủ', evidence: '盖锁' }], conditions: [],
  alternatives: [{ hs: '83025000', whyNot: 'không phải giá đỡ' }, { hs: '83016000', whyNot: 'ổ khóa cửa, không phải nắp che' }],
  questions: [],
};
llmTier.callLLMJson = async (system, user) => {
  if (String(system).startsWith('VÒNG 1')) return { json: R1_LOOP, provider: 'stub', model: 'stub' };
  if (String(system).startsWith('VÒNG 2') || /YÊU CẦU GIẢI TRÌNH/.test(String(system))) return { json: CHOT_LOOP, provider: 'stub', model: 'stub' };
  if (/suggestions/.test(system)) {
    const cands = JSON.parse(user).candidates.map((c) => c.hsCode);
    return { json: { suggestions: cands.slice(0, 3).map((hsCode, i) => ({ hsCode, confidence: 80 - i * 10, reasoning: `ứng viên ${i + 1}` })) }, provider: 'stub', model: 'stub' };
  }
  return { json: { headings: ['8538'] }, provider: 'stub', model: 'stub' };
};
console.error = () => {};
console.warn = () => {};

// ── /api/suggest: mọi mã thay thế đều tự nêu tên dòng ─────────────────────────
{
  const handler = require('../api/suggest.js');
  const res = { _s: 0, _j: null, setHeader() {}, getHeader() { return undefined; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
  await handler({ method: 'POST', url: '/api/suggest', query: {}, headers: {}, body: { description: 'nắp che ổ khóa tủ điện bộ phận vỏ tủ bảng điều khiển' } }, res);
  const sg = res._j?.suggestions || [];
  assert('/api/suggest trả ≥ 2 gợi ý (đủ để kiểm mã thay thế)', sg.length >= 2, JSON.stringify(sg.map((s) => s.hsCode)));
  const thieu = sg.slice(1).filter((s) => !s.lyDoThayThe);
  assert('/api/suggest: mọi mã thay thế (từ vị trí 2) đều có lyDoThayThe', thieu.length === 0,
    JSON.stringify(thieu.map((s) => [s.hsCode, s.lyDoThayThe])));
  const sai = sg.slice(1).filter((s) => s.lyDoThayThe && !s.lyDoThayThe.includes(s.hsCode));
  assert('/api/suggest: lyDoThayThe nói đúng dòng của chính mã đó (không chép nhầm)', sai.length === 0, JSON.stringify(sai.map((s) => [s.hsCode, s.lyDoThayThe])));
  const khopTen = sg.slice(1).filter((s) => s.lyDoThayThe && s.lyDoThayThe.split(':').slice(1).join(':').trim() !== String(taxData[s.hsCode]?.vn || '').replace(/^[\s\-–—:|.]+/, '').trim());
  assert('/api/suggest: nội dung lyDoThayThe bám đúng tên trong data/tax.json', khopTen.length === 0,
    JSON.stringify(khopTen.map((s) => [s.hsCode, s.lyDoThayThe])));
}

// ── /api/classify (engine hai vòng): dossier.alternatives ─────────────────────
{
  const { classify } = require('../lib/classify');
  const r = await classify({ tenHang: 'nắp che ổ khóa tủ điện', nameZh: '柜门锁孔盖', specs: '用途: 遮盖控制柜锁孔' }, {});
  const alts = r?.dossier?.alternatives || [];
  assert('/api/classify: alternatives có mã thay thế', alts.length >= 1, JSON.stringify({ status: r?.status, alts }));
  assert('/api/classify: mọi mã thay thế đều có lyDoThayThe dẫn tên dòng 8 số',
    alts.length >= 1 && alts.every((a) => a.lyDoThayThe && a.lyDoThayThe.includes(a.hs)), JSON.stringify(alts));
  assert('mã 83025000 được nêu đúng là dòng "giá để mũ…"',
    alts.find((a) => a.hs === '83025000')?.lyDoThayThe === lyDo8302, JSON.stringify(alts));
  // 8301.60.00 trong biểu thuế tên là "Các bộ phận" (bộ phận ổ khóa) — tên dòng lấy NGUYÊN
  // VĂN từ biểu thuế, không diễn giải lại thành "ổ khóa".
  assert('mã 8301.60.00 được nêu đúng tên dòng trong biểu thuế',
    alts.find((a) => a.hs === '83016000')?.lyDoThayThe === `Dòng biểu thuế 83016000: ${String(taxData['83016000'].vn).replace(/^[\s\-–—:|.]+/, '').trim()}`,
    JSON.stringify([taxData['83016000'].vn, alts.find((a) => a.hs === '83016000')?.lyDoThayThe]));
  assert('KHÔNG gắn lyDoThayThe cho mã CHỌN (results[0])', !(r?.results || [])[0]?.lyDoThayThe, JSON.stringify((r?.results || [])[0]?.hs));
  console.log('   ', JSON.stringify(alts.map((a) => [a.hs, a.lyDoThayThe])));
}

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);