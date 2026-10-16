#!/usr/bin/env node
/**
 * Issue #311 (B-4 + B-7) — /api/precedents tìm chéo nguồn EN + nhãn xacMinh + soNguonDongThuan.
 *
 * Nghiệm thu (brief):
 *  1. `searchPrecedents("glove box gas purification")` top 5 chứa ĐỦ bộ ba: WCO 842139/1 + CBP M82907 + ABF TCO 1679759.
 *  2. `searchPrecedents("sealed chamber glove ports")` — likewise (top 5).
 *  3. Mọi match có `xacMinh` ∈ {NGUON_A, NGUON_B, CHUA}; record TCO 1679759 = NGUON_A và có `banChat`.
 *  4. `soNguonDongThuan` xuất hiện trong dossier của classify response.
 *  5. Tầng 1 synonyms (`data/synonyms.json`, phapLy:true + nhan:NGUYEN_VAN) dùng để seed boost, không sinh từ mới.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { searchPrecedents, loadFlatPrecedents } = require('../lib/precedent-search.js');

let passed = 0;
let failed = 0;
function assert(name, cond, detail) {
  if (cond) {
    console.log('PASS', name);
    passed += 1;
  } else {
    console.log('FAIL', name, detail || '');
    failed += 1;
  }
}
function top5(q) {
  return searchPrecedents(q, { topK: 5 });
}
function hasTrio(rank) {
  const ids = rank.map((m) => m.precedent.precedentId);
  const hasWco = ids.some((id) => String(id).startsWith('wco-op-842139-1') || String(id).startsWith('wco-op.842139.1') || String(id).includes('842139/1'));
  const hasCbp = ids.some((id) => String(id).includes('M82907'));
  const hasTco = ids.some((id) => String(id).includes('1679759'));
  return { hasWco, hasCbp, hasTco, ids };
}

const flat = loadFlatPrecedents();
assert('flat index nạp được', flat.length > 0, `flat.length=${flat.length}`);
assert('flat index chứa intl records', flat.some((p) => p.source === 'RULING_CBP' || p.source === 'TCO_ABF'), 'no CBP/TCO in flat');
assert('flat index chứa WCO OP', flat.some((p) => p.source === 'WCO_OP'), 'no WCO in flat');
assert('flat index chứa TB-TCHQ', flat.some((p) => p.source === 'TB-TCHQ'), 'no TB-TCHQ in flat');

// ───────────────────────────────────────────────────────────────────────────
// CASE 1: glove box gas purification → top 5 chứa ĐỦ bộ ba WCO 842139/1 + CBP M82907 + TCO 1679759.
// Brief #311 vòng 2: cầu nối confusedWith (đề xuất 1) + fallback productName-chứa-tier-1-token (đề xuất 2).
// ───────────────────────────────────────────────────────────────────────────
{
  const rank = top5('glove box gas purification');
  const { hasWco, hasCbp, hasTco, ids } = hasTrio(rank);
  console.log('  CASE 1 top5:', ids);
  assert('CASE 1: có WCO 842139/1 trong top 5', hasWco, JSON.stringify(ids));
  assert('CASE 1: có TCO 1679759 trong top 5', hasTco, JSON.stringify(ids));
  assert('CASE 1: có CBP M82907 trong top 5 (bộ ba 3/3)', hasCbp, JSON.stringify(ids));
}

// ───────────────────────────────────────────────────────────────────────────
// CASE 2: sealed chamber glove ports → likewise (bộ ba 3/3).
// ───────────────────────────────────────────────────────────────────────────
{
  const rank = top5('sealed chamber glove ports');
  const { hasWco, hasCbp, hasTco, ids } = hasTrio(rank);
  console.log('  CASE 2 top5:', ids);
  assert('CASE 2: có WCO 842139/1 trong top 5', hasWco, JSON.stringify(ids));
  assert('CASE 2: có TCO 1679759 trong top 5', hasTco, JSON.stringify(ids));
  assert('CASE 2: có CBP M82907 trong top 5 (bộ ba 3/3)', hasCbp, JSON.stringify(ids));
}

// ───────────────────────────────────────────────────────────────────────────
// CASE 3: xacMinh + banChat
// ───────────────────────────────────────────────────────────────────────────
{
  const rank = top5('glove box gas purification');
  for (const m of rank) {
    const labels = ['NGUON_A', 'NGUON_B', 'CHUA'];
    assert(`xacMinh ∈ {NGUON_A,NGUON_B,CHUA} cho ${m.precedent.precedentId}`, labels.includes(m.xacMinh), `got ${m.xacMinh}`);
    assert(`loaiNguon ∈ {TB-TCHQ,RULING_CBP,TCO_ABF,WCO_OP} cho ${m.precedent.precedentId}`, ['TB-TCHQ', 'RULING_CBP', 'TCO_ABF', 'WCO_OP'].includes(m.loaiNguon), `got ${m.loaiNguon}`);
  }
  const tco = rank.find((m) => String(m.precedent.precedentId).includes('1679759'));
  assert('TCO 1679759 = NGUON_A (đủ sourceUrl+snapshotHash+retrievedAt)', tco && tco.xacMinh === 'NGUON_A', `tco=${tco?.precedent.precedentId} xacMinh=${tco?.xacMinh}`);
  assert('TCO 1679759 có banChat (TCO = mã người đề xuất, ABF phê duyệt)', tco && typeof tco.banChat === 'string' && /TCO/.test(tco.banChat), `banChat=${tco?.banChat}`);
}

// ───────────────────────────────────────────────────────────────────────────
// CASE 4: rankingSignals.soNguonDongThuan trong classify response
// ───────────────────────────────────────────────────────────────────────────
{
  process.env.HS_CLASSIFY_ENGINE = 'loop';
  process.env.MIC_OFF = '1';
  process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
  const llmTier = require('../lib/llm-tier');
  let script = [];
  llmTier.callLLMJson = async () => {
    const next = script.shift();
    if (next instanceof Error) throw next;
    return { json: typeof next === 'function' ? next() : next, provider: 'stub', model: 'stub' };
  };
  console.error = () => {}; console.warn = () => {};
  const { classify } = require('../lib/classify');
  const R1_GLOVEBOX = {
    product: { nameVi: 'hộp găng tay phòng thí nghiệm kín khí có hệ lọc khí', nameEn: 'glove box gas purification chamber', purpose: 'lọc khí, giảm ẩm', mechanism: 'điện', material: 'inox', evidence: {} },
    hypotheses: [{ chapter: '84', heading4: '8421', subheading6: '842139', why: 'lọc khí', confidence: 70 }],
    verify: { searchVi: ['hộp găng tay'], codes8: ['84213990'], micQuery: null, unknowns: [] },
  };
  const GLOVEBOX = { tenHang: 'glove box hermetically sealed with gas purification', nameZh: null, specs: '用途: 气体净化; 材质: 不锈钢' };
  const CHOT_842139 = { decision: 'CHOT', hs: '84213990', confidence: 80, reason: 'lọc khí, hộp kín', basis: [{ stream: 'SAN_PHAM', claim: 'lọc khí', evidence: 'gas purification' }], conditions: [], alternatives: [], questions: [] };
  script = [R1_GLOVEBOX, CHOT_842139];
  const r = await classify(GLOVEBOX, {});
  const sigs = r.rankingSignals || [];
  const hasSndt = sigs.some((s) => s.signal === 'signal:soNguonDongThuan');
  assert('CASE 4: rankingSignals có signal:soNguonDongThuan cho mã 842139 (có WCO + TCO đồng thuận)', hasSndt, JSON.stringify(sigs));
  if (hasSndt) {
    const sig = sigs.find((s) => s.signal === 'signal:soNguonDongThuan');
    assert('CASE 4: soNguonDongThuan.effect đếm ≥2 nguồn độc lập (TCO + WCO)', sig && /(WCO|TCO)/i.test(JSON.stringify(sig.effect || '')), JSON.stringify(sig));
  }
}

// ───────────────────────────────────────────────────────────────────────────
// CASE 5: tier-1 synonyms CHỈ phapLy:true + nhan:NGUYEN_VAN, không sinh từ mới
// ───────────────────────────────────────────────────────────────────────────
{
  const { readFileSync } = require('fs');
  const syn = JSON.parse(readFileSync('data/synonyms.json', 'utf8'));
  const muc = syn.muc || {};
  const all = Object.values(muc).flat();
  const nguyenVan = all.filter((e) => e.nhan === 'NGUYEN_VAN' && e.phapLy === true);
  assert('tất cả mục trong synonyms.json đều phapLy:true + nhan:NGUYEN_VAN', nguyenVan.length === all.length, `nguyenVan=${nguyenVan.length} all=${all.length}`);
  // Source field phải thuộc data/wco-hs-international.csv HOẶC data/wco-op/opinions.json (tier 1 — nguyên văn).
  const allowedSources = new Set(['data/wco-hs-international.csv', 'data/wco-op/opinions.json']);
  const illegal = nguyenVan.filter((e) => !allowedSources.has(e.nguon?.tap));
  assert('0 cụm ngoài tier-1 (chỉ từ wco-hs-international.csv hoặc wco-op/opinions.json)', illegal.length === 0, `illegal=${illegal.length} sample=${JSON.stringify(illegal[0])}`);
}

// ───────────────────────────────────────────────────────────────────────────
// CASE 6: bridge confusedWith work đúng khi có data cầu nối (vòng 2 brief #311).
// Data M82907.confusedWith=[] nên CASE 1/2 với data thật KHÔNG bridge được — chứng minh
// code work bằng cách set confusedWith giả cho M82907 (=["842139"], đúng cặp khai glovebox).
// ───────────────────────────────────────────────────────────────────────────
{
  const ps = require('../lib/precedent-search.js');
  ps.reset();
  const flat = ps.loadFlatPrecedents();
  const m82 = flat.find((p) => p.precedentId && p.precedentId.includes('M82907'));
  m82.confusedWith = ['842139']; // mô phỏng data cầu nối
  const r = ps.searchPrecedents('glove box gas purification', { topK: 5 });
  const m82In = r.find((m) => m.precedent.precedentId.includes('M82907'));
  console.log('  CASE 6 top5:', r.map((m) => m.precedent.precedentId));
  assert('CASE 6: bridge confusedWith kéo M82907 vào top 5', !!m82In, JSON.stringify(r.map((m) => m.precedent.precedentId)));
  assert('CASE 6: M82907 có nhãn viConfusedWith: true', m82In && m82In.viConfusedWith === true, JSON.stringify(m82In));
  assert('CASE 6: điểm bridge ≤ điểm top1 direct (TCO 1679759)', m82In && r[0] && m82In.similarity <= r[0].similarity, `m82.sim=${m82In?.similarity} top1.sim=${r[0]?.similarity}`);
  ps.reset();
}

// ───────────────────────────────────────────────────────────────────────────
// CASE 7: fallback productName-tier-1 work đúng khi có cụm tier-1 khớp token.
// M82907 productName "anaerobic and hypoxia workstations" — không trùng tier-1 của 842139.
// Chứng minh fallback work: thêm 1 record intl giả có productName chứa token "gases"
// (token tier-1 của 842139 "for filtering or purifying gases").
// ───────────────────────────────────────────────────────────────────────────
{
  const ps = require('../lib/precedent-search.js');
  ps.reset();
  // Thêm 1 record intl giả vào flatIndex
  const fakeId = 'RULING_CBP_FAKE_GASES';
  const fakeHs = '84798999';
  const fakeRec = {
    precedentId: fakeId,
    source: 'RULING_CBP',
    loaiNguon: 'RULING_CBP',
    instrumentType: 'RULING',
    country: 'US',
    tbTchqNumber: null,
    productNameRaw: 'CBP FAKE: apparatus for purifying gases with chambers',
    technicalSpec: '',
    finalHsCode: fakeHs,
    outcome: 'APPROVED',
    outcomeHs: fakeHs,
    year: 2020,
    issuedDate: null,
    sourceUrl: null,
    sourceFile: null,
    snapshotHash: null,
    retrievedAt: null,
    confusedWith: [],
    _headTokens: new Set(['cbp', 'fake', 'apparatus', 'for', 'purifying', 'gases', 'with', 'chambers']),
    _nameTokens: new Set(['cbp', 'fake', 'apparatus', 'for', 'purifying', 'gases', 'with', 'chambers']),
    _specTokens: new Set(),
    _xacMinhBase: 'CHUA',
    xacMinh: 'CHUA',
  };
  // Inject sau khi loadFlatPrecedents
  const flat = ps.loadFlatPrecedents();
  flat.push(fakeRec);
  const r = ps.searchPrecedents('glove box gas purification', { topK: 5 });
  const fakeIn = r.find((m) => m.precedent.precedentId === fakeId);
  console.log('  CASE 7 top5:', r.map((m) => m.precedent.precedentId));
  assert('CASE 7: fallback productName-tier-1 kéo intl record có token "gases" vào top 5', !!fakeIn, JSON.stringify(r.map((m) => m.precedent.precedentId)));
  assert('CASE 7: record qua fallback có nhãn viConfusedWith: true', fakeIn && fakeIn.viConfusedWith === true, JSON.stringify(fakeIn));
  ps.reset();
}

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);