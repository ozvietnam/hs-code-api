#!/usr/bin/env node
// D-4 (docs/backlog/05-decision-tables.md): đo bằng AI THẬT, cùng bộ mẫu, cho CẢ HAI cửa tra mã —
// /api/classify (đường ERP) và /api/suggest — để biết tri thức nào đang thật sự giúp.
//   --engine=classify|suggest   cửa cần đo (mặc định classify)
//   --lib=<thư mục lib>         bản code cần đo (mặc định ../lib)
//   --set=gold                  tập GIỮ RIÊNG của oz-gold (lib/holdout.js): --limit=80 --seed=7
//   --set=file --from=x.json    món thật [{id,titleZh,specs,facts?,truth?}]
//   --facts                     (set=file, classify) gửi kèm dữ kiện phiếu hồ sơ nếu có
//   --concurrency=3 --out=kq.json --itemTimeout=300000
//   --label=A                   nhãn nhánh đo (ghi vào summary; vd A = công tắc tắt, B = bật)
// Chống "học thuộc đề": HS_EVAL_EXCLUDE_HOLDOUT=1 → kho tiền lệ Oz bỏ tập giữ riêng (cùng cơ chế
// scripts/bench-matrix.mjs). Ghi log/ml-log rơi vào thư mục tạm (test-isolate-data).
// Chỉ số: đúng 2/4/6/8 số (mã đầu + trong 3 mã), riêng nhóm "Loại khác" (D-6), tự tin ≥80 mà sai,
// và "sai mà KHÔNG bị gắn cờ xem lại" — chỉ tiêu chính (CEO 06/10/2026).
// Sổ tay chú giải (bước 8): chạy cùng bộ mẫu với HS_SO_TAY=off | gates | full (HS_CLASSIFY_ENGINE=loop) rồi so;
// `soTay` đếm kết cục lượt giải trình, đổi mã có lợi/có hại; `avgPromptCharsR2` = cỡ gói vòng 2 (token ≈ ký tự/3).
// #416 K4(i)(ii) + backlog 09 bước 3+4 (HS_GON_DAU_RA / HS_MAX_VONG_SUA): mỗi món ghi engineMs + pha (r1Ms/gatherMs/llmMs/
// embedMs), số vòng, nhà cung cấp, mã cổng chặn từng vòng, bước tất định NHOM_CHUA_KIEM, lượt lùi "tắt suy nghĩ", và TOKEN
// từng lời gọi (withUsage: vào/ra, nhà cung cấp, maxTokens, chạm trần = JSON cụt). Summary thêm p50/p90 ĐỘ TRỄ TỪNG MÓN,
// token TB theo bước, tỉ lệ chạm trần, phân bố nhà cung cấp, env đo (chỉ khoá cấu hình, không khoá bí mật).
// stdout = MỘT dòng JSON summary (như cũ, cho máy đọc); bản tóm tắt gọn cho người đọc in ra stderr.
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { AsyncLocalStorage } from 'async_hooks';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const argv = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const here = dirname(fileURLToPath(import.meta.url));
const libDir = argv.lib || join(here, '..', 'lib');
const root = join(libDir, '..');
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
process.env.HS_API_TOKEN = process.env.HS_API_TOKEN || 'bench-token';
await import(join(here, 'test-isolate-data.mjs'));
const require = createRequire(join(libDir, 'x.js'));
const engine = argv.engine || 'classify';
const tBench = Date.now();
// Bọc callLLMJson: (1) cỡ gói vòng 2; (2) token + nhà cung cấp TỪNG lời gọi (withUsage) gắn về đúng món đang chạy (mỗi worker
// chạy món trong một ngữ cảnh AsyncLocalStorage riêng → 3 worker song song không lẫn token của nhau).
const llmTierMod = require(join(libDir, 'llm-tier.js'));
let withUsage = null;
try { ({ withUsage } = require(join(libDir, 'usage-context.js'))); } catch { /* bản lib cũ chưa có usage-context → không đo token */ }
const itemAls = new AsyncLocalStorage();
const promptStat = { r2Calls: 0, r2Chars: 0 };
const origCall = llmTierMod.callLLMJson;
const stepOf = (system, o) => o?.step || (String(system).startsWith('VÒNG 1') ? 'understand' : String(system).startsWith('VÒNG 2') ? 'gir' : 'khac');
llmTierMod.callLLMJson = async (system, user, o) => {
  if (String(system).startsWith('VÒNG 2')) { promptStat.r2Calls += 1; promptStat.r2Chars += String(user || '').length; }
  const store = itemAls.getStore();
  if (!store || !withUsage) return origCall(system, user, o);
  const call = { step: stepOf(system, o), maxTokens: o?.maxTokens ?? null, thinkingOff: o?.minimax?.extraBody?.thinking?.type === 'disabled', ok: true, usage: [] };
  const t = Date.now();
  store.push(call);
  try {
    const { result, usage } = await withUsage(() => origCall(system, user, o));
    call.usage = usage;
    call.provider = result?.provider || null;
    return result;
  } catch (e) {
    call.ok = false; call.usage = Array.isArray(e?.usage) ? e.usage : []; call.error = String(e?.message || e).slice(0, 100);
    throw e;
  } finally {
    call.ms = Date.now() - t;
  }
};
const conc = Number(argv.concurrency || 3);
const DEPTHS = [2, 4, 6, 8];
// Một lượt treo (lời gọi không bao giờ trả về) không được làm mất cả đợt đo.
const ITEM_TIMEOUT_MS = Number(argv.itemTimeout || 300000);

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

let items;
if (argv.set === 'gold') {
  const { isHeldOut } = require(join(libDir, 'holdout.js'));
  const all = readFileSync(join(root, 'data', 'oz-gold-final.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    .filter((g) => isHeldOut(g))
    .map((g) => ({ id: String(g.hsCode) + ':' + String(g.sampleDesc).slice(0, 20), tenHang: String(g.sampleDesc || '').trim(), truth: String(g.hsCode).replace(/\D/g, '') }))
    .filter((x) => x.tenHang.length >= 20 && x.truth.length === 8);
  const r = rng(Number(argv.seed || 7));
  items = all.map((x) => [r(), x]).sort((a, b) => a[0] - b[0]).slice(0, Number(argv.limit || 80)).map((p) => p[1]);
} else {
  items = JSON.parse(readFileSync(argv.from, 'utf8')).map((x) => ({ id: x.id, tenHang: x.titleZh, nameZh: x.titleZh, specs: x.specs, facts: argv.facts ? (x.facts || []) : undefined, truth: x.truth || null }));
}

const nz = (s) => String(s || '').replace(/\D/g, '');
let run;
if (engine === 'suggest') {
  const handler = require(join(root, 'api', 'suggest.js'));
  run = async (it) => {
    const res = { _s: 0, _j: null, setHeader() {}, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
    const description = [it.tenHang, it.specs].filter(Boolean).join(' | ');
    await handler({ method: 'POST', url: '/api/suggest', query: {}, headers: { authorization: `Bearer ${process.env.HS_API_TOKEN}` }, body: { description } }, res);
    if (res._s !== 200) throw new Error(`HTTP ${res._s}`);
    const j = res._j || {};
    const rs = (j.suggestions || []).map((s) => ({ hs: nz(s.hsCode), confidence: s.confidence ?? null, reason: s.reasoning || s.reason || '' }));
    return { rs, missing: j.missing || [], status: j.status || null, warnings: (j.residualWarning ? 1 : 0) };
  };
} else {
  const { classify } = require(join(libDir, 'classify.js'));
  run = async (it) => {
    const res = await classify({ tenHang: it.tenHang, nameZh: it.nameZh || null, specs: it.specs || null, ...(it.facts ? { facts: it.facts } : {}) }, {});
    return { rs: (res.results || []).map((r) => ({ ...r, hs: nz(r.hs) })), missing: res.missing || [], status: res.status || null, res };
  };
}

/** Lời gọi AI của một món → bản ghi gọn: bước, ms, maxTokens, token vào/ra (−1 = nhà cung cấp không trả), chạm trần. */
const llmRows = (calls) => calls.map((c) => {
  const known = c.usage.filter((u) => u.outputTokens >= 0);
  const out = known.length ? known.reduce((a, u) => a + u.outputTokens, 0) : -1;
  const inp = c.usage.some((u) => u.inputTokens >= 0) ? c.usage.filter((u) => u.inputTokens >= 0).reduce((a, u) => a + u.inputTokens, 0) : -1;
  return {
    step: c.step, ms: c.ms ?? null, ok: c.ok, thinkingOff: c.thinkingOff, maxTokens: c.maxTokens,
    provider: c.provider || c.usage[c.usage.length - 1]?.provider || null, providers: c.usage.map((u) => u.provider),
    inTok: inp, outTok: out,
    // Chạm trần maxTokens = JSON (hoặc phần suy nghĩ) bị cắt → lượt lùi "tắt suy nghĩ" (doc 09 bước 4: "đo tỉ lệ cắt JSON").
    capped: Boolean(c.maxTokens) && c.usage.some((u) => u.outputTokens >= 0 && u.outputTokens >= c.maxTokens),
    ...(c.error ? { error: c.error } : {}),
  };
});

const out = [];
let next = 0;
async function worker() {
  while (next < items.length) {
    const it = items[next++];
    const t = Date.now();
    const calls = [];
    try {
      const { rs, missing, status, res = {} } = await itemAls.run(calls, () => Promise.race([
        run(it),
        new Promise((_, rej) => setTimeout(() => rej(new Error('BENCH_TIMEOUT')), ITEM_TIMEOUT_MS)),
      ]));
      const gl = Array.isArray(res.engine?.gates) ? res.engine.gates : [];
      out.push({
        id: it.id, truth: it.truth, top: rs[0]?.hs || null, conf: rs[0]?.confidence ?? null, top3: rs.slice(0, 3).map((r) => r.hs),
        status, nMissing: missing.length, grounded: rs[0]?.grounded ?? null, basis: rs[0]?.basis || [],
        rounds: res.engine?.rounds ?? null, decision: res.dossier?.decision ?? null, gates: res.engine?.gates ?? null, reviewNeeded: res.review?.needed ?? null, micHeading: res.dossier?.mic?.consensus?.heading4 ?? null,
        soTay: res.soTay ? { outcome: res.soTay.outcome, gates: (res.soTay.challenges || []).map((c) => c.gate), from: res.soTay.from || null, to: res.soTay.to || null } : null,
        reason: String(rs[0]?.reason || '').slice(0, 200), ms: Date.now() - t,
        // ── #416 K4 + backlog 09 bước 3+4 ──
        engineMs: res.engine?.ms ?? null,
        phases: res.engine?.phases ? { r1Ms: res.engine.phases.r1Ms ?? null, gatherMs: res.engine.phases.gatherMs ?? null, llmMs: res.engine.phases.llmMs ?? null, embedMs: res.engine.phases.embedMs ?? null } : null,
        providers: res.engine?.providers ?? null,
        blocks: gl.filter((x) => x.decision !== undefined && Array.isArray(x.blocks)).map((x) => x.blocks),
        tatDinh: gl.filter((x) => x.tatDinh).map((x) => ({ gate: x.tatDinh, nhom: x.nhom || null, ketQua: x.ketQua || null, lyDo: x.lyDo || null })),
        fallbacks: gl.filter((x) => x.fallback).map((x) => ({ step: x.step || null, fallback: x.fallback, cause: String(x.cause || '').slice(0, 80) })),
        capHit: gl.some((x) => /trần vòng sửa/.test(String(x.note || ''))),
        toiUu: res.engine?.toiUu ?? null,
        hypHeadings: (res.dossier?.hypotheses || []).map((h) => nz(h.heading4).slice(0, 4)).filter(Boolean),
        llm: llmRows(calls),
      });
    } catch (e) {
      out.push({ id: it.id, truth: it.truth, error: String(e.message).slice(0, 120), ms: Date.now() - t, engineMs: null, llm: llmRows(calls) });
    }
    process.stderr.write(`\r${engine} ${out.length}/${items.length}`);
    if (argv.out) writeFileSync(`${argv.out}.partial`, JSON.stringify(out));
  }
}
await Promise.all(Array.from({ length: conc }, worker));

const { isLoaiKhac } = require(join(libDir, 'loai-khac-products.js'));
const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : null);
const ok = out.filter((o) => o.truth && !o.error);
const at = (o, d) => (o.top || '').slice(0, d) === o.truth.slice(0, d);
const sec = (ms) => (ms == null ? null : Math.round(ms / 100) / 10);
/** Phân vị theo hạng gần nhất trên mảng số (ms). */
const quantile = (arr, q) => { const s = arr.filter((x) => Number.isFinite(x)).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };
const mean = (arr) => { const s = arr.filter((x) => Number.isFinite(x)); return s.length ? s.reduce((a, b) => a + b, 0) / s.length : null; };
const countBy = (arr) => arr.reduce((m, k) => { m[k] = (m[k] || 0) + 1; return m; }, {});
// Độ trễ TỪNG MÓN: engine.ms của món; món lỗi/BENCH_TIMEOUT không có engine.ms → dùng ms đo ở bench (≥ engine) để p90 không lạc quan.
const perItemMs = out.map((o) => o.engineMs ?? o.ms);
const allCalls = out.flatMap((o) => o.llm || []);
const tokenStep = (step) => {
  const cs = allCalls.filter((c) => c.step === step);
  if (!cs.length) return null;
  const outs = cs.map((c) => c.outTok).filter((x) => x >= 0);
  const ins = cs.map((c) => c.inTok).filter((x) => x >= 0);
  return {
    calls: cs.length, avgOut: outs.length ? Math.round(mean(outs)) : null, p90Out: quantile(outs, 0.9), maxOut: outs.length ? Math.max(...outs) : null,
    avgIn: ins.length ? Math.round(mean(ins)) : null, unknownTok: cs.length - outs.length,
    capped: cs.filter((c) => c.capped).length, thinkingOff: cs.filter((c) => c.thinkingOff).length, failed: cs.filter((c) => !c.ok).length,
    maxTokens: [...new Set(cs.map((c) => c.maxTokens).filter(Boolean))],
    avgSec: sec(mean(cs.map((c) => c.ms))),
  };
};
const perItemTok = out.filter((o) => (o.llm || []).some((c) => c.outTok >= 0)).map((o) => o.llm.reduce((a, c) => a + Math.max(0, c.outTok), 0));
const perItemIn = out.filter((o) => (o.llm || []).some((c) => c.inTok >= 0)).map((o) => o.llm.reduce((a, c) => a + Math.max(0, c.inTok), 0));
const ENV_KEYS = ['HS_CLASSIFY_ENGINE', 'HS_SO_TAY', 'HS_SO_TAY_DONG', 'HS_LLM_PRIVATE_ALL', 'HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'R1_MAX_TOKENS', 'GIR_MAX_TOKENS',
  'LOOP_MODEL', 'LOOP_PROVIDER', 'LLM_STEP_UNDERSTAND', 'LLM_STEP_GIR', 'LLM_TIMEOUT_MS_UNDERSTAND', 'LLM_TIMEOUT_MS_GIR', 'LLM_TIMEOUT_MS_DEFAULT', 'LOOP_R1_TIMEOUT_MS',
  'LOOP_R2_TIMEOUT_MS', 'CLASSIFY_BUDGET_MS', 'HS_EMBED_POOL', 'MINIMAX_MODEL', 'LLM_NO_TRAIN_PROVIDERS', 'ZAI_WEB_FACTS', 'HS_EVAL_EXCLUDE_HOLDOUT'];
let llmCfg = null;
try { const s = llmTierMod.llmStatus(); llmCfg = { fallbacks: s.fallbacks, privateProviders: s.private?.providers || [] }; } catch { /* bản lib cũ */ }

const sum = {
  engine, n: out.length, errors: out.filter((o) => o.error).length,
  top1: Object.fromEntries(DEPTHS.map((d) => [d, pct(ok.filter((o) => at(o, d)).length, ok.length)])),
  top3: Object.fromEntries(DEPTHS.map((d) => [d, pct(ok.filter((o) => o.top3.some((c) => c.slice(0, d) === o.truth.slice(0, d))).length, ok.length)])),
  loaiKhac: (() => { const lk = ok.filter((o) => o.truth.length === 8 && isLoaiKhac(o.truth)); return { n: lk.length, top1_8: pct(lk.filter((o) => o.top === o.truth).length, lk.length) }; })(),
  confidentWrong8: pct(ok.filter((o) => (o.conf ?? 0) >= 80 && o.top !== o.truth).length, ok.length),
  avgSec: Math.round(out.reduce((a, o) => a + o.ms, 0) / Math.max(1, out.length) / 1000),
  byStatus: Object.fromEntries([...new Set(out.map((o) => o.status || (o.error ? 'ERROR' : 'NONE')))].map((s) => [s, out.filter((o) => (o.status || (o.error ? 'ERROR' : 'NONE')) === s).length])),
  avgRounds: out.some((o) => o.rounds) ? Math.round(10 * out.reduce((a, o) => a + (o.rounds || 0), 0) / Math.max(1, out.filter((o) => o.rounds).length)) / 10 : null,
  flagged: pct(out.filter((o) => o.reviewNeeded === true || (o.status && o.status !== 'REVIEW' && o.status !== 'RESOLVED_BY_TABLE')).length, out.length),
  avgPromptCharsR2: promptStat.r2Calls ? Math.round(promptStat.r2Chars / promptStat.r2Calls) : null,
  soTay: (() => {
    const st = ok.filter((o) => o.soTay);
    if (!st.length) return null;
    const fired = st.filter((o) => o.soTay.outcome !== 'NONE');
    const changed = fired.filter((o) => o.soTay.outcome === 'CHANGED');
    return {
      items: st.length, fired: fired.length,
      byOutcome: Object.fromEntries([...new Set(fired.map((o) => o.soTay.outcome))].map((k) => [k, fired.filter((o) => o.soTay.outcome === k).length])),
      byGate: Object.fromEntries([...new Set(fired.flatMap((o) => o.soTay.gates))].map((k) => [k, fired.filter((o) => o.soTay.gates.includes(k)).length])),
      changedHelpful: changed.filter((o) => o.soTay.from !== o.truth && o.soTay.to === o.truth).length,
      changedHarmful: changed.filter((o) => o.soTay.from === o.truth && o.soTay.to !== o.truth).length,
      firedOnCorrect: fired.filter((o) => o.soTay.from === o.truth).length,
    };
  })(),
  wrongUnflagged: pct(ok.filter((o) => !(o.reviewNeeded === true || (o.status && o.status !== 'REVIEW' && o.status !== 'RESOLVED_BY_TABLE')) && !(o.truth.length === 8 ? o.top === o.truth : at(o, 4))).length, ok.length),
  // ── #416 K4 + backlog 09 bước 3+4 ──
  label: typeof argv.label === 'string' ? argv.label : null,
  latency: {
    note: 'p50/p90/TB = độ trễ TỪNG MÓN (engine.ms của mỗi món; món lỗi/timeout dùng ms đo ở bench) — KHÔNG phải tổng thời gian ÷ n',
    p50Sec: sec(quantile(perItemMs, 0.5)), p90Sec: sec(quantile(perItemMs, 0.9)), avgSec: sec(mean(perItemMs)), maxSec: sec(perItemMs.length ? Math.max(...perItemMs) : null),
    fromBenchMs: out.filter((o) => o.engineMs == null).length,
    wallSec: sec(Date.now() - tBench), concurrency: conc,
  },
  phasesAvgSec: (() => { const ph = out.map((o) => o.phases).filter(Boolean); return ph.length ? { r1: sec(mean(ph.map((p) => p.r1Ms))), gather: sec(mean(ph.map((p) => p.gatherMs))), llm: sec(mean(ph.map((p) => p.llmMs))), embed: sec(mean(ph.map((p) => p.embedMs))) } : null; })(),
  tokens: withUsage ? {
    understand: tokenStep('understand'), gir: tokenStep('gir'), khac: tokenStep('khac'),
    perItem: { avgOut: perItemTok.length ? Math.round(mean(perItemTok)) : null, avgIn: perItemIn.length ? Math.round(mean(perItemIn)) : null, items: perItemTok.length },
  } : null,
  providers: {
    // Lượt TÍNH TIỀN theo nhà cung cấp (withUsage — kể cả lượt trả rỗng/JSON hỏng) và vòng engine theo nhà cung cấp trả lời.
    byBilledCall: countBy(allCalls.flatMap((c) => c.providers || [])),
    byRound: countBy(out.flatMap((o) => o.providers || []).map((p) => String(p))),
  },
  gates: {
    // Số MÓN có cổng chặn bắn ít nhất một lần (theo mã cổng), số món chạm trần vòng sửa, bước tất định NHOM_CHUA_KIEM theo kết quả.
    blockedItems: countBy(out.flatMap((o) => [...new Set((o.blocks || []).flat())])),
    repairRounds: countBy(out.filter((o) => o.rounds).map((o) => String(Math.max(0, (o.rounds || 0) - 2)))),
    capHit: out.filter((o) => o.capHit).length,
    tatDinh: countBy(out.flatMap((o) => (o.tatDinh || []).map((x) => x.ketQua === 'VONG_AI' ? `VONG_AI:${x.lyDo}` : x.ketQua))),
    fallbacks: countBy(out.flatMap((o) => (o.fallbacks || []).map((x) => `${x.step}:${x.fallback}`))),
  },
  // Chống đo nhầm nhánh (#416 G4): số món mà engine báo cấu hình tối ưu (engine.toiUu) — nhánh tắt phải là 0 món.
  toiUuSeen: (() => { const t = out.map((o) => o.toiUu).filter(Boolean); return { items: t.length, gonDauRa: t.filter((x) => x.gonDauRa).length, maxVongSua: countBy(t.map((x) => String(x.maxVongSua))), maxTokens: countBy(t.map((x) => `${x.r1MaxTokens}/${x.r2MaxTokens}`)) }; })(),
  env: Object.fromEntries(ENV_KEYS.filter((k) => process.env[k] != null).map((k) => [k, process.env[k]])),
  llm: llmCfg,
};
process.stderr.write('\n');
console.log(JSON.stringify(sum));
// Tóm tắt gọn cho người đọc (stderr — stdout giữ đúng một dòng JSON như cũ).
{
  const L = [];
  const tk = (s) => (s ? `${s.avgOut ?? '?'} ra / ${s.avgIn ?? '?'} vào (p90 ra ${s.p90Out ?? '?'}, chạm trần ${s.capped}/${s.calls}, lùi tắt suy nghĩ ${s.thinkingOff})` : '—');
  L.push(`── bench ${sum.label ? `[${sum.label}] ` : ''}${engine}: n=${sum.n}, lỗi ${sum.errors} ──`);
  L.push(`Đúng top-1: Đ2 ${sum.top1[2]} | Đ4 ${sum.top1[4]} | Đ6 ${sum.top1[6]} | Đ8 ${sum.top1[8]}   ·   top-3 Đ8 ${sum.top3[8]}`);
  L.push(`Sai-không-cờ (wrongUnflagged) ${sum.wrongUnflagged}%   ·   cờ ${sum.flagged}%   ·   vòng TB ${sum.avgRounds ?? '—'}   ·   tự tin≥80 mà sai ${sum.confidentWrong8}%`);
  L.push(`Độ trễ TỪNG MÓN (engine.ms — không phải tổng giờ ÷ n): p50 ${sum.latency.p50Sec ?? '—'} s · p90 ${sum.latency.p90Sec ?? '—'} s · TB ${sum.latency.avgSec ?? '—'} s   (tổng giờ chạy ${sum.latency.wallSec} s, ${conc} luồng)`);
  if (sum.phasesAvgSec) L.push(`Pha TB: vòng 1 ${sum.phasesAvgSec.r1} s · kiểm chứng ${sum.phasesAvgSec.gather} s · vòng 2+ ${sum.phasesAvgSec.llm} s`);
  if (sum.tokens) L.push(`Token TB/lời gọi — understand (vòng 1): ${tk(sum.tokens.understand)}; gir (vòng 2+): ${tk(sum.tokens.gir)}${sum.tokens.khac ? `; khác: ${tk(sum.tokens.khac)}` : ''}; TB/món ra ${sum.tokens.perItem.avgOut ?? '?'} vào ${sum.tokens.perItem.avgIn ?? '?'}`);
  L.push(`Nhà cung cấp (lượt tính tiền): ${JSON.stringify(sum.providers.byBilledCall)}   ·   vòng: ${JSON.stringify(sum.providers.byRound)}`);
  L.push(`Cổng chặn (số món): ${JSON.stringify(sum.gates.blockedItems)} · vòng sửa: ${JSON.stringify(sum.gates.repairRounds)} · chạm trần ${sum.gates.capHit} · tất định: ${JSON.stringify(sum.gates.tatDinh)}`);
  L.push(`Cấu hình quan sát (engine.toiUu): ${JSON.stringify(sum.toiUuSeen)}   ·   env: ${JSON.stringify(sum.env)}`);
  process.stderr.write(`${L.join('\n')}\n`);
}
if (argv.out) writeFileSync(argv.out, JSON.stringify({ summary: sum, items: out }, null, 1));
process.exit(0);
