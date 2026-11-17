#!/usr/bin/env node
/**
 * OZV-1360 — đo PHASEs ngoài engine trên câu «cốc giữ nhiệt» earlyExit CHOT.
 * Không sửa đường chạy prod; chỉ monkey-patch để bấm giờ.
 *
 *   node scripts/do-ozv-1360-phases-ngoai-engine.mjs
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);

process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
process.env.HS_CLASSIFY_ENGINE = 'loop';
process.env.HS_HO_SO = process.env.HS_HO_SO || 'off';
delete process.env.ZAI_WEB_FACTS;
delete process.env.HS_EMBED_POOL;
process.env.CLASSIFY_BUDGET_MS = '285000';

const TEN = 'cốc giữ nhiệt chân không (bình chân không)';
const HS = '96170010';

/** @type {Record<string, number>} */
const phases = Object.create(null);
const calls = Object.create(null);
const add = (name, ms) => {
  phases[name] = (phases[name] || 0) + ms;
  calls[name] = (calls[name] || 0) + 1;
};

function wrapSync(obj, key, name) {
  if (typeof obj[key] !== 'function') return;
  const goc = obj[key].bind(obj);
  obj[key] = (...a) => {
    const t0 = performance.now();
    try { return goc(...a); }
    finally { add(name, performance.now() - t0); }
  };
}
function wrapAsync(obj, key, name) {
  if (typeof obj[key] !== 'function') return;
  const goc = obj[key].bind(obj);
  obj[key] = async (...a) => {
    const t0 = performance.now();
    try { return await goc(...a); }
    finally { add(name, performance.now() - t0); }
  };
}

const llmTier = require('../lib/llm-tier');
let llmCalls = 0;
llmTier.callLLMJson = async () => {
  llmCalls += 1;
  throw new Error('LLM không được gọi khi earlyExitTradeChotSom (OZV-1360)');
};
console.error = () => {};
console.warn = () => {};

// Bọc TRƯỚC khi load engine-loop (destructure lúc load).
const soTayRuntime = require('../lib/so-tay-runtime.js');
wrapSync(soTayRuntime, 'advise', 'soTayRuntime.advise');
wrapSync(soTayRuntime, 'viTri', 'soTayRuntime.viTri');
wrapSync(soTayRuntime, 'loaiKhac', 'soTayRuntime.loaiKhac');
wrapSync(soTayRuntime, 'anhEmKhop', 'soTayRuntime.anhEmKhop');
wrapSync(soTayRuntime, 'yKienWco', 'soTayRuntime.yKienWco');

const legalBasis = require('../lib/legal-basis.js');
wrapSync(legalBasis, 'canCuPhapLy', 'canCuPhapLy');

const b1b = require('../lib/b1b-web.js');
wrapAsync(b1b, 'b1bApDung', 'b1bApDung');

const precedentSearch = require('../lib/precedent-search.js');
wrapSync(precedentSearch, 'searchPrecedents', 'searchPrecedents');
wrapSync(precedentSearch, 'countIndependentSources', 'countIndependentSources');

const ozSearch = require('../lib/oz-precedent-search.js');
wrapAsync(ozSearch, 'searchOzByKeyword', 'searchOzByKeyword');

const wcoOp = require('../lib/wco-op.js');
wrapSync(wcoOp, 'byHs', 'wcoOp.byHs');
wrapSync(wcoOp, 'view', 'wcoOp.view');

const kiemTruocChot = require('../lib/kiem-truoc-chot.js');
wrapSync(kiemTruocChot, 'kiemTruocChot', 'kiemTruocChot');

const taxLookup = require('../lib/tax-lookup.js');
wrapSync(taxLookup, 'buildTaxLookup', 'buildTaxLookup');

const describeEcus = require('../lib/describe-ecus.js');
wrapSync(describeEcus, 'buildEcus', 'buildEcus');

const explNotes = require('../lib/explanatory-notes-index.js');
wrapSync(explNotes, 'getNoteSummaryForHs', 'getNoteSummaryForHs');

const declOpts = require('../lib/declaration-options.js');
wrapSync(declOpts, 'buildDeclarationOptions', 'buildDeclarationOptions');

const tradeHints = require('../lib/trade-classify-hints.js');
wrapSync(tradeHints, 'tradeClassifyHints', 'tradeClassifyHints');

const engineLoop = require('../lib/engine-loop.js');
const { classify } = require('../lib/classify.js');
const hoSoApi = require('../lib/ho-so/api.js');
wrapAsync(hoSoApi, 'ganHoSoClassify', 'ganHoSoClassify');

const { earlyExitChotTuTrade } = engineLoop;
const hints = tradeHints.tradeClassifyHints(TEN);
const pref = tradeHints.tradePreferredHs(hints);
const ee = earlyExitChotTuTrade(hints, TEN);
if (!(pref?.hs === HS && pref.chotSom === true && ee?.decision === 'CHOT')) {
  console.log(JSON.stringify({ loi: 'khong-chot-som', pref, ee }, null, 2));
  process.exit(2);
}

const reset = () => {
  for (const k of Object.keys(phases)) delete phases[k];
  for (const k of Object.keys(calls)) delete calls[k];
  llmCalls = 0;
};

const bangOf = () => Object.entries(phases)
  .map(([ten, ms]) => ({ ten, ms: Math.round(ms * 10) / 10, n: calls[ten] || 0 }))
  .sort((a, b) => b.ms - a.ms);

// Warm
await classify({ tenHang: TEN }, { mic: false, crossCheck: false, engine: 'loop', timeoutMs: 8000 });
reset();

// Đo 1: classifyLoop thuần
const t1 = performance.now();
const out1 = await engineLoop.classifyLoop(
  { tenHang: TEN },
  { mic: false, crossCheck: false, timeoutMs: 8000 },
);
const wall1 = performance.now() - t1;
const bang1 = bangOf();
const engine1 = out1.engine?.ms;
const khe1 = wall1 - (engine1 || 0);
reset();

// Đo 2: classify + ganHoSo (giống api/classify.js)
const t2 = performance.now();
const out2 = await classify({ tenHang: TEN }, { mic: false, crossCheck: false, engine: 'loop', timeoutMs: 8000 });
const mid2 = performance.now();
await hoSoApi.ganHoSoClassify(out2, { tenHang: TEN }, { noiBo: false });
const wall2 = performance.now() - t2;
const afterClassify2 = mid2 - t2;
const bang2 = bangOf();
const engine2 = out2.engine?.ms;
const khe2 = wall2 - (engine2 || 0);

// Đo 3: advise / canCuPhapLy / buildDeclarationOptions đơn lẻ (ấm)
reset();
const tAdv = performance.now();
const adv = soTayRuntime.advise({
  topHs: HS,
  candidates: ['9617'],
  sanPham: { tenHang: TEN, chatLieu: null, congDung: null, specs: null },
});
const advMs = performance.now() - tAdv;

const tLb = performance.now();
legalBasis.canCuPhapLy({
  status: 'REVIEW', topHs: HS, description: TEN, precedentCount: 0, girDeterminations: 0,
});
const lbMs = performance.now() - tLb;

const tDo = performance.now();
declOpts.buildDeclarationOptions({
  top: out2.results[0], results: out2.results, dossier: out2.dossier, gathered: { headings: ['9617'] },
  review: out2.review, materialTexts: [], partTexts: [TEN],
});
const doMs = performance.now() - tDo;

const tCnt = performance.now();
precedentSearch.countIndependentSources(HS, { tenHang: TEN, moTa: TEN });
const cntMs = performance.now() - tCnt;

const bao = {
  cau: TEN,
  hs: out2.results?.[0]?.hs,
  status: out2.status,
  earlyExit: (out1.engine?.gates || []).some((g) => g.earlyExitTradeChotSom === true),
  llmCallsLan2: llmCalls,
  soTayKeys: Object.keys(out2.soTay || {}),
  soTayMode: out2.soTay?.mode || out2.soTay?.cheDo || null,
  coAdviseBlock: Array.isArray(out2.soTay?.yKienWco) || out2.soTay?.trangThai === 'CO_SO_TAY',
  lan1_classifyLoop: {
    wallMs: Math.round(wall1),
    engineMs: engine1,
    gatherMs: out1.engine?.phases?.gatherMs,
    b1bMs: out1.engine?.phases?.b1bMs,
    kheWallTruEngine: Math.round(khe1),
    phases: bang1,
  },
  lan2_classifyCongGanHoSo: {
    wallMs: Math.round(wall2),
    afterClassifyMs: Math.round(afterClassify2),
    engineMs: engine2,
    gatherMs: out2.engine?.phases?.gatherMs,
    b1bMs: out2.engine?.phases?.b1bMs,
    kheWallTruEngine: Math.round(khe2),
    phases: bang2,
  },
  donLeAm: {
    'soTayRuntime.advise': Math.round(advMs * 10) / 10,
    adviseCoKetQua: Boolean(adv),
    canCuPhapLy: Math.round(lbMs * 10) / 10,
    buildDeclarationOptions: Math.round(doMs * 10) / 10,
    countIndependentSources: Math.round(cntMs * 10) / 10,
  },
};

console.log(JSON.stringify(bao, null, 2));

console.log('\n=== BẢNG PHASES lượt 2 (classify+ganHoSo) ===');
for (const r of bang2) {
  console.log(`${String(r.ms).padStart(8)} ms  n=${String(r.n).padStart(3)}  ${r.ten}`);
}
console.log('\n=== KẾT LUẬN ===');
console.log(`L1 wall=${Math.round(wall1)} engine=${engine1} khe=${Math.round(khe1)}`);
console.log(`L2 wall=${Math.round(wall2)} engine=${engine2} khe=${Math.round(khe2)}`);
const topNgoai = bang2.filter((r) => [
  'soTayRuntime.advise', 'soTayRuntime.viTri', 'soTayRuntime.loaiKhac', 'soTayRuntime.anhEmKhop',
  'soTayRuntime.yKienWco', 'canCuPhapLy', 'b1bApDung', 'ganHoSoClassify',
].includes(r.ten));
const tongTop = topNgoai.reduce((s, r) => s + r.ms, 0);
console.log(`Tổng pha ngoài engine đã bọc=${Math.round(tongTop)} ms`);
for (const r of topNgoai) console.log(`  - ${r.ten}: ${r.ms} ms`);
const khe = khe2;
const thuPham = bang2.filter((r) => r.ms >= Math.max(20, khe * 0.2));
console.log('Thủ phạm (≥20ms hoặc ≥20% khe):', thuPham.map((r) => `${r.ten}=${r.ms}`).join(', ') || '(không — khe nhỏ / nằm chỗ chưa bọc)');
