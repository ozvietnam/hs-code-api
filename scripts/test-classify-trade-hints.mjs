#!/usr/bin/env node
/**
 * OZV-1266: /api/classify phải đọc cùng từ điển trade-synonyms như /api/suggest.
 * Ca khách: «giác hút chân không smc zp-905…» — suggest đã 40169999 (#1371),
 * classify loop vẫn NEED_FACTS / 841490 vì gather không nạp trade + không loại avoid.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { gather, classifyLoop } = require('../lib/engine-loop.js');
const { getCandidates } = require('../lib/retrieve-candidates.js');
const llmTier = require('../lib/llm-tier.js');

let pass = 0;
let fail = 0;
const check = (n, c, x = '') => {
  if (c) {
    pass += 1;
    console.log(`PASS ${n}`);
  } else {
    fail += 1;
    console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x).slice(0, 400)}`);
  }
};

const TEN = 'giác hút chân không smc zp-905-08eu-cjxn0333';
const R1_SAI_8414 = {
  product: {
    nameVi: 'giác hút chân không SMC ZP-905',
    purpose: 'hút linh kiện',
    mechanism: 'chân không',
    material: 'cao su',
    form: 'miếng/núm',
    evidence: {},
  },
  hypotheses: [
    {
      chapter: '84',
      heading4: '8414',
      subheading6: '841490',
      why: 'bộ phận bơm chân không',
      confidence: 70,
    },
  ],
  verify: {
    searchVi: ['giác hút chân không', 'smc zp'],
    codes8: ['84149041', '84149029'],
    micQuery: null,
    unknowns: [],
  },
};

{
  const g = await gather(R1_SAI_8414, { tenHang: TEN }, { micAllowed: false });
  check(
    'gather giác hút: có nhóm 4016 (cao su) trong headings',
    (g.headings || []).includes('4016'),
    g.headings,
  );
  check(
    'gather giác hút: KHÔNG còn nhóm bẫy 8414',
    !(g.headings || []).includes('8414'),
    g.headings,
  );
  check(
    'gather giác hút: pool/codes có 40169999',
    (g.codes8 || []).includes('40169999')
      || (g.poolCodes || []).some((p) => String(p.hs || p).startsWith('40169999')),
    { codes8: g.codes8, pool: (g.poolCodes || []).slice(0, 8) },
  );
  check(
    'gather giác hút: gói vòng 2 ghi khối TỪ ĐIỂN TÊN THƯƠNG MẠI',
    /TỪ ĐIỂN TÊN THƯƠNG MẠI/.test(g.pack || '') && /40169999/.test(g.pack || ''),
    (g.pack || '').slice(0, 600),
  );
  check(
    'gather giác hút: mã 841490* bị loại khỏi codes8',
    !(g.codes8 || []).some((c) => String(c).startsWith('841490')),
    g.codes8,
  );
}

{
  const saved = llmTier.callLLMJson;
  llmTier.callLLMJson = async () => ({ json: { headings: ['8414', '3926', '8481'] } });
  const c = await getCandidates({ tenHang: TEN }, { timeoutMs: 1000 });
  llmTier.callLLMJson = saved;
  const h4 = (c.headings || []).map((h) => h.code4 || h);
  const h4016 = (c.headings || []).find((h) => (h.code4 || h) === '4016');
  check(
    'getCandidates giác hút: có 4016 nguồn trade-synonyms',
    h4.includes('4016') && (h4016?.sources || []).includes('trade-synonyms'),
    h4016 || h4,
  );
  check('getCandidates giác hút: không còn 8414 (avoid)', !h4.includes('8414'), h4);
  check(
    'getCandidates giác hút: precedentCodes không còn 841490*',
    !(c.precedentCodes || []).some((x) => String(x.hs || '').startsWith('841490')),
    c.precedentCodes,
  );
}

{
  const saved = llmTier.callLLMJson;
  const queue = [
    R1_SAI_8414,
    {
      decision: 'HOI',
      hs: '841490',
      confidence: 55,
      reason: 'thiếu chất liệu bộ phận bơm',
      basis: [{ stream: 'SUY_LUAN', claim: '8414.90', evidence: 'hút chân không' }],
      conditions: [],
      alternatives: [{ hs: '39269099', whyNot: 'có thể nhựa' }],
      questions: [{ fact: 'chatLieu', question: 'Chất liệu?', whereToFind: 'catalogue' }],
    },
  ];
  llmTier.callLLMJson = async () => {
    const next = queue.shift();
    if (!next) throw new Error('hết stub LLM');
    return { json: next };
  };
  const out = await classifyLoop({ tenHang: TEN }, { mic: false, crossCheck: false, timeoutMs: 5000 });
  llmTier.callLLMJson = saved;
  const top3 = (out.results || []).map((r) => r.hs);
  check(
    'classifyLoop giác hút: top-3 có mã 4016… (không kẹt NEED_FACTS 841490)',
    top3.some((h) => String(h).startsWith('4016')) && out.status !== 'NEEDS_EXPERT',
    { status: out.status, top3 },
  );
  check(
    'classifyLoop giác hút: mã đầu không thuộc avoid 8414/841490',
    top3[0] && !String(top3[0]).startsWith('8414'),
    top3,
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
