#!/usr/bin/env node
/**
 * OZV-1368 — shadow + earlyExit CHOT (cốc 96170010) không gọi chayHoSo.
 * Prod: HS_HO_SO=shadow + lát 1 961700 ⇒ ganHoSoMs ~13s (LLM hồ sơ rồi bỏ).
 * Sửa: bỏ gắn hồ sơ khi earlyExitTradeChotSom/Conflict + shadow (không cần hồ sơ trên phản hồi).
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

process.env.HS_HO_SO = 'shadow';
process.env.HS_HO_SO_VIET = 'LLM';
process.env.HS_HO_SO_NGHIEN_CUU = 'false';
delete process.env.HS_HO_SO_THU_CALLERS;

const llmTier = require('../lib/llm-tier');
const goiLlm = [];
llmTier.callLLMJson = async (_s, _u, opts = {}) => {
  goiLlm.push(opts.step || 'unknown');
  if (String(opts.step || '').startsWith('ho-so')) {
    throw new Error('OZV-1368: chayHoSo không được gọi LLM trên earlyExit CHOT + shadow');
  }
  return { json: {}, model: 'stub' };
};

const API = require('../lib/ho-so/api');
API._datDeps({
  identify: async () => null,
  webFacts: async () => null,
  thamChieu: async () => ({ oz: [], tbTchq: [] }),
  tinHieuDanhMuc: async () => [],
  tienLeMaKhac: async () => [],
  demKhoOz: async () => ({ tong: 0, maKhac: [] }),
});

let pass = 0;
let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); }
  else {
    fail += 1;
    const detail = typeof x === 'string' ? x.slice(0, 400) : JSON.stringify(x).slice(0, 400);
    console.log(`FAIL ${n} ${detail}`);
  }
};

const bangSau = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const HS = '96170010';
const kqEarly = {
  status: 'REVIEW',
  results: [{ hs: HS, confidence: 93, reason: 'chotSom' }],
  ecus: { description: 'cốc giữ nhiệt chân không', level: 'GOOD', score: 80, missing: [] },
  engine: {
    ms: 12,
    name: 'loop',
    gates: [{ round: 0, earlyExitTradeChotSom: true, hs: HS, entryId: 'coc-giu-nhiet-chan-khong' }],
  },
};
const attrs = { tenHang: 'cốc giữ nhiệt chân không (bình chân không)' };

goiLlm.length = 0;
const t0 = Date.now();
const out = await API.ganHoSoClassify(structuredClone(kqEarly), attrs, { noiBo: false });
const ms = Date.now() - t0;

check('shadow + earlyExitTradeChotSom: phản hồi không đổi (bằng sâu)', bangSau(out, kqEarly));
check('shadow + earlyExitTradeChotSom: không gọi LLM hồ sơ', goiLlm.filter((s) => String(s).startsWith('ho-so')).length === 0, goiLlm);
check('shadow + earlyExitTradeChotSom: ganHoSoClassify < 200ms (bỏ chayHoSo)', ms < 200, { ms });
check('mã cốc vẫn 96170010', out.results?.[0]?.hs === HS, out.results?.[0]);

// Không earlyExit → shadow vẫn được chạy chayHoSo (đo bóng) nhưng kết quả khách không đổi.
const kqThuong = {
  status: 'REVIEW',
  results: [{ hs: HS, confidence: 80, reason: 'thuong' }],
  ecus: { description: 'cốc', level: 'GOOD', score: 80, missing: [] },
  engine: { ms: 100, name: 'loop', gates: [{ round: 1, decision: 'CHOT' }] },
};
goiLlm.length = 0;
llmTier.callLLMJson = async (_s, _u, opts = {}) => {
  goiLlm.push(opts.step || 'unknown');
  if (opts.step === 'ho-so-doc-du-kien') return { json: { duKien: [] }, model: 'stub' };
  if (opts.step === 'ho-so-viet-mo-ta') return { json: { moTaEcus: 'cốc' }, model: 'stub' };
  return { json: {}, model: 'stub' };
};
const outThuong = await API.ganHoSoClassify(structuredClone(kqThuong), attrs, { noiBo: false });
check('shadow không earlyExit: vẫn bằng sâu (không gắn hoSo)', bangSau(outThuong, kqThuong));
check(
  'shadow không earlyExit: vẫn gọi đường hồ sơ (bước ho-so-*)',
  goiLlm.some((s) => String(s).startsWith('ho-so')),
  goiLlm,
);

// on + earlyExit: vẫn gắn hồ sơ (cần hồ sơ trên phản hồi).
process.env.HS_HO_SO = 'on';
goiLlm.length = 0;
llmTier.callLLMJson = async (_s, _u, opts = {}) => {
  goiLlm.push(opts.step || 'unknown');
  if (opts.step === 'ho-so-doc-du-kien') return { json: { duKien: [] }, model: 'stub' };
  if (opts.step === 'ho-so-viet-mo-ta') {
    return { json: { moTaEcus: 'Cốc giữ nhiệt chân không, hoàn chỉnh' }, model: 'stub' };
  }
  return { json: {}, model: 'stub' };
};
const outOn = await API.ganHoSoClassify(structuredClone(kqEarly), attrs, { noiBo: false });
check('on + earlyExit: vẫn gắn hoSo (cần hồ sơ)', Boolean(outOn.hoSo) && outOn.hoSo.maHs === HS, outOn.hoSoMeta || outOn.hoSo);
check('on + earlyExit: mã kết quả không đổi', outOn.results?.[0]?.hs === HS);

console.log(JSON.stringify({ msEarlyShadow: ms, hs: out.results?.[0]?.hs }, null, 2));

if (fail) {
  console.error(`FAIL ${fail} | PASS ${pass}`);
  process.exit(1);
}
console.log(`=== ALL TESTS PASSED === (${pass})`);
