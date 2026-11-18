#!/usr/bin/env node
/**
 * Canary OZV-1382 — A1 stt 33/40: tủ đông cửa trước/cửa trên (8418.30↔8418.40)
 * và máy hút bụi công suất+đồ chứa (8508.11↔8508.19).
 * Không gọi LLM: stub R1 chọn nhầm phân nhóm anh em như đo A1 18/11, kỳ vọng
 * earlyExitChotTuConflict CHOT đúng mã trước earlyExitHoi.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
for (const k of ['ZAI_WEB_FACTS', 'HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'HS_SO_TAY', 'HS_CLASSIFY_FAST_FIRST', 'R1_MAX_TOKENS', 'GIR_MAX_TOKENS']) {
  delete process.env[k];
}
process.env.CLASSIFY_BUDGET_MS = '285000';

const llmTier = require('../lib/llm-tier');
let script = [];
llmTier.callLLMJson = async () => {
  const next = script.shift();
  if (next instanceof Error) throw next;
  return { json: typeof next === 'function' ? next() : JSON.parse(JSON.stringify(next)), provider: 'stub', model: 'stub' };
};
console.error = () => {};
console.warn = () => {};

const {
  extractPowerWatts,
  extractVolumeLiters,
  resolveConflict,
} = require('../lib/conflict-resolver.js');
const { classifyLoop, earlyExitChotTuConflict } = require('../lib/engine-loop.js');
const attributes = require('../data/attributes.json').attributes;
const tablesDb = require('../data/conflict-tables.json');
const conflictsDb = require('../data/conflicts.json');
const deps = { conflictsDb, tablesDb, registry: attributes };

const CA33 = 'Tủ lạnh âm sâu để chứa mẫu tế bào (super freezer / ultra-low freezer) dùng trong y tế, môi chất lạnh R-507, dung tích 310 lít, nhiệt độ làm lạnh từ -30 độ C đến -40 độ C, loại cửa trước';
const CA33_DOI = 'tủ đông nằm, cửa trên, 300 lít';
const CA40 = 'Máy hút bụi công nghiệp có động cơ điện gắn liền (industrial vacuum cleaner) Nilfisk model VHW310, dung tích thùng 15 lít, điện 3 pha 400V/50Hz, công suất 1,5 kW; động cơ gắn liền cánh quạt tạo lực hút, lắp chung trên đế cùng khối thùng lọc/chứa rác';
const CA40_OVER_BOTH = 'máy hút bụi 2,2 kW thùng 30 lít';
const CA40_OVER_VOL = 'máy hút bụi công nghiệp 1,5 kW thùng 25 lít';
const CA40_THIEU = 'máy hút bụi công nghiệp Nilfisk, chưa rõ công suất và dung tích thùng';

const R1_FREEZER_SAI = {
  product: {
    nameVi: 'Tủ lạnh âm sâu', nameEn: 'ultra-low freezer', purpose: 'chứa mẫu tế bào',
    mechanism: 'nén lạnh', material: '', evidence: {},
  },
  hypotheses: [
    { chapter: '84', heading4: '8418', subheading6: '841830', why: 'tủ đông', confidence: 90 },
    { chapter: '84', heading4: '8418', subheading6: '841840', why: 'cửa trước', confidence: 80 },
  ],
  verify: {
    searchVi: ['tủ lạnh âm sâu cửa trước'],
    codes8: ['84183090', '84184090'],
    unknowns: ['Công suất tiêu thụ điện', 'Điện áp', 'Kích thước'],
  },
};

const R1_VACUUM_SAI = {
  product: {
    nameVi: 'Máy hút bụi công nghiệp', nameEn: 'industrial vacuum cleaner', purpose: 'hút bụi',
    mechanism: 'động cơ điện gắn liền', material: '', evidence: {},
  },
  hypotheses: [
    { chapter: '85', heading4: '8508', subheading6: '850819', why: 'máy hút bụi', confidence: 100 },
  ],
  verify: {
    searchVi: ['máy hút bụi 1,5 kW 15 lít'],
    codes8: ['85081990', '85081100'],
    unknowns: ['loại động cơ'],
  },
};

let pass = 0;
let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); }
  else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 700)}`); }
};

// --- Đọc số: 1,5 kW và dấu chấm nghìn 1.500 W ---
check('extractPowerWatts 1,5 kW → 1500', extractPowerWatts('công suất 1,5 kW') === 1500);
check('extractPowerWatts 1.5 kW → 1500', extractPowerWatts('power 1.5 kW') === 1500);
check('extractPowerWatts 1.500 W → 1500', extractPowerWatts('công suất không quá 1.500 W') === 1500);
check('extractPowerWatts 2,2 kW → 2200', extractPowerWatts('2,2 kW') === 2200);
check('extractVolumeLiters 15 lít', extractVolumeLiters('dung tích thùng 15 lít') === 15);
check('extractVolumeLiters thùng 30 lít', extractVolumeLiters('thùng 30 lít') === 30);

// --- earlyExitChotTuConflict ---
const chot33 = earlyExitChotTuConflict(CA33, R1_FREEZER_SAI);
check('ca33 cửa trước → CHOT 84184090', chot33?.decision === 'CHOT' && chot33?.hs === '84184090', JSON.stringify(chot33));

const chot33d = earlyExitChotTuConflict(CA33_DOI, {
  ...R1_FREEZER_SAI,
  hypotheses: [{ ...R1_FREEZER_SAI.hypotheses[0], subheading6: '841840', confidence: 90 }],
});
check('đối chứng cửa trên → CHOT 84183090', chot33d?.decision === 'CHOT' && chot33d?.hs === '84183090', JSON.stringify(chot33d));

const chot40 = earlyExitChotTuConflict(CA40, R1_VACUUM_SAI);
check('ca40 1,5 kW 15 l → CHOT 85081100', chot40?.decision === 'CHOT' && chot40?.hs === '85081100', JSON.stringify(chot40));

const chot40b = earlyExitChotTuConflict(CA40_OVER_BOTH, R1_VACUUM_SAI);
check('đối chứng 2,2 kW 30 l → CHOT 85081990', chot40b?.decision === 'CHOT' && String(chot40b?.hs || '').startsWith('850819'), JSON.stringify(chot40b));

const chot40c = earlyExitChotTuConflict(CA40_OVER_VOL, R1_VACUUM_SAI);
check('1,5 kW thùng 25 l → CHOT 850819xx', chot40c?.decision === 'CHOT' && String(chot40c?.hs || '').startsWith('850819'), JSON.stringify(chot40c));

const chotThieu = earlyExitChotTuConflict(CA40_THIEU, R1_VACUUM_SAI);
check('thiếu công suất/dung tích → null (không đoán)', chotThieu === null, JSON.stringify(chotThieu));

const khong = earlyExitChotTuConflict('máy bơm nước ly tâm 1.5HP', R1_FREEZER_SAI);
check('hàng khác → null', khong === null, JSON.stringify(khong));

// resolveConflict + productText (đường phụ)
{
  const top = { hs: '85081990', confidence: 70, reason: 'seed' };
  const r = resolveConflict(top, [top], {}, { ...deps, productText: 'máy hút bụi công nghiệp công suất 800 W đồ chứa 10 lít' });
  check('resolveConflict productText 800W/10L → 85081100', r.status === 'RESOLVED' && r.decidedHs === '85081100', JSON.stringify(r));
}

// classifyLoop stub: R1 sai vẫn CHOT nhờ bảng
script = [R1_FREEZER_SAI];
const out33 = await classifyLoop({ tenHang: CA33 }, {});
check(
  'classifyLoop ca33 stub: top 84184090',
  (out33.results || [])[0]?.hs === '84184090' || (out33.results || []).some((r) => r.hs === '84184090'),
  JSON.stringify({ status: out33.status, results: out33.results, gates: (out33.engine?.gates || []).slice(-3) }),
);
check(
  'classifyLoop ca33: earlyExitConflict (không earlyExitHoi)',
  (out33.engine?.gates || []).some((g) => g.earlyExitConflict === true)
    && !(out33.engine?.gates || []).some((g) => g.earlyExitHoi === true),
  JSON.stringify((out33.engine?.gates || []).slice(-4)),
);

script = [R1_VACUUM_SAI];
const out40 = await classifyLoop({ tenHang: CA40 }, {});
check(
  'classifyLoop ca40 stub: top 85081100',
  (out40.results || [])[0]?.hs === '85081100' || (out40.results || []).some((r) => r.hs === '85081100'),
  JSON.stringify({ status: out40.status, results: out40.results, gates: (out40.engine?.gates || []).slice(-3) }),
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
