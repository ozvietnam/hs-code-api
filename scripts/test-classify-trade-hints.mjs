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

// ── OZV-1290: camera CMR12 — classify còn NEED_FACTS 6 số dù từ điển đã 85258920 ─────────
// Search/suggest đã top1 85258920 (#1381). Classify: R2 HOI dừng 852589 (cùng nhánh, KHÔNG
// biCam) hoặc cổng NHA_SAN_XUAT_KHAC_NHOM vì MIC model CMR* đồng thuận nhiễu 8544.
const TEN_CAM = 'camera truyền hình cmr12';
const R1_CAM = {
  product: {
    nameVi: 'camera truyền hình CMR12',
    nameEn: 'television camera CMR12',
    purpose: 'quan sát / truyền hình',
    mechanism: 'điện tử',
    material: null,
    form: 'hoàn chỉnh',
    model: 'CMR12',
    evidence: {},
  },
  hypotheses: [
    {
      chapter: '85',
      heading4: '8525',
      subheading6: '852589',
      why: 'camera truyền hình',
      confidence: 75,
    },
  ],
  verify: {
    searchVi: ['camera truyền hình', 'cmr12'],
    codes8: ['85258920'],
    micQuery: 'television camera CMR12',
    unknowns: [],
  },
};

{
  const saved = llmTier.callLLMJson;
  const queue = [
    R1_CAM,
    {
      decision: 'HOI',
      hs: '852589',
      confidence: 60,
      reason: 'cần xác nhận nhà sản xuất / loại camera',
      basis: [{ stream: 'SAN_PHAM', claim: 'camera truyền hình', evidence: 'camera truyền hình' }],
      conditions: [],
      alternatives: [],
      questions: [{
        fact: 'nhaSanXuat',
        question: 'Nhà sản xuất hoặc thương hiệu trên tem là gì?',
        whereToFind: 'tem nhãn / catalogue',
      }],
    },
  ];
  llmTier.callLLMJson = async () => {
    const next = queue.shift();
    if (!next) throw new Error('hết stub LLM camera HOI');
    return { json: next };
  };
  const out = await classifyLoop({ tenHang: TEN_CAM, model: 'CMR12' }, { mic: false, crossCheck: false, timeoutMs: 5000 });
  llmTier.callLLMJson = saved;
  check(
    'OZV-1290 camera HOI 852589: đôn 85258920 (không NEED_FACTS vì hỏi NSX)',
    out.results?.[0]?.hs === '85258920' && out.status !== 'NEED_FACTS',
    { status: out.status, top: out.results?.[0]?.hs, next: out.nextAction },
  );
  check(
    'OZV-1290 camera HOI: câu hỏi nextAction không còn bắt nhà sản xuất',
    !(out.nextAction?.questions || []).some((q) => /nhà sản xuất|NSX|manufacturer/i.test(q.questionVi || '')),
    out.nextAction,
  );
}

{
  // MIC nhiễu 8544 (cùng chương 85) trong khi AI đã CHOT 85258920 — cổng NSX không được chặn.
  const micMod = require('../lib/mic-lookup.js');
  const savedMic = micMod.micLookup;
  const savedLlm = llmTier.callLLMJson;
  const PG = (shop, hsCode, name) => ({
    shop,
    url: `https://${shop}.en.made-in-china.com/product/x/y.html`,
    name,
    hsCode,
    props: {},
  });
  micMod.micLookup = async () => ({
    query: 'CMR12',
    searched: true,
    pages: [
      PG('s1', '8544422900', 'CMR cable'),
      PG('s2', '8544492900', 'CMR wire'),
      PG('s3', '8544421900', 'CMR12 cable'),
    ],
    consensus: null,
  });
  process.env.MIC_OFF = '';
  const queue = [
    R1_CAM,
    {
      decision: 'CHOT',
      hs: '85258920',
      confidence: 82,
      reason: 'camera truyền hình — dòng 8525.89.20',
      basis: [{ stream: 'SAN_PHAM', claim: 'camera truyền hình', evidence: 'camera truyền hình' }],
      conditions: [],
      alternatives: [],
      questions: [],
    },
  ];
  llmTier.callLLMJson = async () => {
    const next = queue.shift();
    if (!next) throw new Error('hết stub LLM camera MIC');
    return { json: next };
  };
  const out = await classifyLoop(
    { tenHang: TEN_CAM, model: 'CMR12' },
    { mic: true, crossCheck: false, timeoutMs: 8000 },
  );
  llmTier.callLLMJson = savedLlm;
  micMod.micLookup = savedMic;
  const gates = (out.engine?.gates || []).flatMap((g) => g.blocks || []);
  check(
    'OZV-1290 camera + MIC 8544: không cổng NHA_SAN_XUAT_KHAC_NHOM',
    !gates.includes('NHA_SAN_XUAT_KHAC_NHOM'),
    { gates, engineGates: out.engine?.gates },
  );
  check(
    'OZV-1290 camera + MIC 8544: chốt 85258920, không NEED_FACTS/NEEDS_EXPERT vì NSX',
    out.results?.[0]?.hs === '85258920'
      && out.status !== 'NEED_FACTS'
      && !(out.status === 'NEEDS_EXPERT' && /NHA_SAN_XUAT|nhà sản xuất|made-in-china/i.test(JSON.stringify(out.nextAction || {}))),
    { status: out.status, top: out.results?.[0]?.hs, next: out.nextAction },
  );
}

// ── OZV-1300: Zonye AR2000 — classify lệch 842199 (phụ tùng lọc) + NEED_FACTS hỏi lọc ──
// Prod 17/11: /api/classify «bộ lọc khí zonye ar2000» → NEED_FACTS hs=842199 (6 số).
// Avoid cũ chỉ 842139/842132/… → 842199 không biCam → không đôn 84812090.
const TEN_AR = 'bộ lọc khí zonye ar2000';
const R1_AR_SAI_8421 = {
  product: {
    nameVi: 'bộ lọc khí Zonye AR2000',
    purpose: 'lọc khí',
    mechanism: null,
    material: null,
    form: 'thiết bị',
    model: 'AR2000',
    evidence: {},
  },
  hypotheses: [
    {
      chapter: '84',
      heading4: '8421',
      subheading6: '842199',
      why: 'phụ tùng máy lọc',
      confidence: 65,
    },
  ],
  verify: {
    searchVi: ['bộ lọc khí', 'zonye ar2000'],
    codes8: ['84219900', '84213990'],
    micQuery: null,
    unknowns: [],
  },
};

{
  const saved = llmTier.callLLMJson;
  const queue = [
    R1_AR_SAI_8421,
    {
      decision: 'HOI',
      hs: '842199',
      confidence: 60,
      reason: 'Hồ sơ thiếu dữ kiện quyết định mã: Hàng là bộ lọc thay thế hay thiết bị lọc hoàn chỉnh',
      basis: [{ stream: 'SUY_LUAN', claim: '8421.99', evidence: 'bộ lọc khí' }],
      conditions: [],
      alternatives: [{ hs: '84213990', whyNot: 'có thể thiết bị lọc hoàn chỉnh' }],
      questions: [
        { fact: 'boLoc', question: 'Hàng là bộ lọc thay thế hay thiết bị lọc hoàn chỉnh', whereToFind: 'catalogue' },
        { fact: 'congDung', question: 'Hàng dùng cho đội bảo hộ, máy thở hay thiết bị công nghiệp', whereToFind: 'catalogue' },
      ],
    },
  ];
  llmTier.callLLMJson = async () => {
    const next = queue.shift();
    if (!next) throw new Error('hết stub LLM AR2000');
    return { json: next };
  };
  const out = await classifyLoop({ tenHang: TEN_AR, model: 'AR2000' }, { mic: false, crossCheck: false, timeoutMs: 5000 });
  llmTier.callLLMJson = saved;
  const top3 = (out.results || []).map((r) => r.hs);
  check(
    'OZV-1300 AR2000: đôn 848120* 8 số (không kẹt NEED_FACTS 842199)',
    out.status !== 'NEED_FACTS'
      && top3[0]
      && String(top3[0]).startsWith('848120')
      && String(top3[0]).length === 8,
    { status: out.status, top3, next: out.nextAction },
  );
  check(
    'OZV-1305 AR2000: top1 = 84812011 (từ điển high, hết residual 84812090)',
    top3[0] === '84812011',
    top3,
  );
  check(
    'OZV-1300 AR2000: top3 không còn 842139* / 842199*',
    top3.every((h) => !String(h).startsWith('8421')),
    top3,
  );
}

// ── OZV-1307: classify R2 đã CHOT residual 84812090 8 số → phải đôn 84812011 ──
// Prod GĐ 08:00 17/11 (sau #1391 search ĐẠT): classify REVIEW · top 84812090.
// Promote cũ chỉ đôn khi HOI / <8 số / biCam 8421 — residual cùng 848120* không biCam.
{
  const saved = llmTier.callLLMJson;
  const queue = [
    {
      product: {
        nameVi: 'bộ lọc khí Zonye AR2000-02',
        purpose: 'điều áp khí nén',
        mechanism: null,
        material: null,
        form: 'thiết bị',
        model: 'AR2000-02',
        evidence: {},
      },
      hypotheses: [
        {
          chapter: '84',
          heading4: '8481',
          subheading6: '848120',
          why: 'van truyền động khí nén',
          confidence: 80,
        },
      ],
      verify: {
        searchVi: ['bộ lọc khí', 'zonye ar2000'],
        codes8: ['84812090', '84812011', '63079069'],
        micQuery: null,
        unknowns: [],
      },
    },
    {
      decision: 'CHOT',
      hs: '84812090',
      confidence: 72,
      reason: 'Van khí nén loại khác — chưa nêu chất liệu thân',
      basis: [{ stream: 'SUY_LUAN', claim: '8481.20.90', evidence: 'AR2000 điều áp' }],
      conditions: [],
      alternatives: [
        { hs: '84812011', whyNot: 'cần xác nhận thân sắt/thép' },
        { hs: '63079069', whyNot: 'không phải hàng dệt' },
      ],
      questions: [],
    },
  ];
  llmTier.callLLMJson = async () => {
    const next = queue.shift();
    if (!next) throw new Error('hết stub LLM AR2000 residual');
    return { json: next };
  };
  const out = await classifyLoop(
    { tenHang: 'bộ lọc khí zonye ar2000-02', model: 'AR2000-02' },
    { mic: false, crossCheck: false, timeoutMs: 5000 },
  );
  llmTier.callLLMJson = saved;
  const top3 = (out.results || []).map((r) => r.hs);
  check(
    'OZV-1307 AR2000: R2 CHOT residual 84812090 → đôn top1 84812011',
    out.status !== 'NEED_FACTS' && top3[0] === '84812011',
    { status: out.status, top3, next: out.nextAction },
  );
  check(
    'OZV-1307 AR2000: top3 không ưu tiên residual 84812090',
    top3[0] !== '84812090',
    top3,
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
