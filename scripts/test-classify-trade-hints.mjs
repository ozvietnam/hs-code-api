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

// ── OZV-1322: camera CMR12 — earlyExit lệch 852581 (tốc độ cao) hoặc dừng 852589 6 số ──
// Đo prod 17/11: lượt 2 earlyExitHoi hs=852581 → ra 85258120 (sai nhánh); lượt khác NEED_FACTS 6 số.
{
  const R1_CAM_852581 = {
    ...R1_CAM,
    hypotheses: [
      {
        chapter: '85',
        heading4: '8525',
        subheading6: '852581',
        why: 'camera truyền hình chuyên dụng tốc độ cao',
        confidence: 90,
      },
    ],
    verify: {
      ...R1_CAM.verify,
      unknowns: ['Thông số kỹ thuật chi tiết của camera', 'Độ phân giải và khả năng quay'],
    },
  };
  const saved = llmTier.callLLMJson;
  llmTier.callLLMJson = async () => ({ json: R1_CAM_852581 });
  const out = await classifyLoop({ tenHang: TEN_CAM, model: 'CMR12' }, { mic: false, crossCheck: false, timeoutMs: 8000 });
  llmTier.callLLMJson = saved;
  check(
    'OZV-1322 camera earlyExit 852581: đôn 85258920 (không kẹt 852581*)',
    out.results?.[0]?.hs === '85258920' && out.status !== 'NEED_FACTS',
    { status: out.status, top: out.results?.[0]?.hs, gates: out.engine?.gates?.slice(-3) },
  );
  check(
    'OZV-1322 camera earlyExit 852581: top không còn 852581*',
    !(out.results || []).some((r) => String(r.hs || '').startsWith('852581')),
    (out.results || []).map((r) => r.hs),
  );
}

{
  const R1_CAM_852589_UNK = {
    ...R1_CAM,
    verify: {
      ...R1_CAM.verify,
      unknowns: ['Thông số kỹ thuật chi tiết của camera', 'Nhà sản xuất trên tem'],
    },
  };
  const saved = llmTier.callLLMJson;
  llmTier.callLLMJson = async () => ({ json: R1_CAM_852589_UNK });
  const out = await classifyLoop({ tenHang: TEN_CAM, model: 'CMR12' }, { mic: false, crossCheck: false, timeoutMs: 8000 });
  llmTier.callLLMJson = saved;
  check(
    'OZV-1322 camera earlyExit 852589+unknowns: đôn 85258920 (hết dừng 6 số)',
    out.results?.[0]?.hs === '85258920'
      && out.status !== 'NEED_FACTS'
      && String(out.results?.[0]?.hs || '').length === 8,
    { status: out.status, top: out.results?.[0]?.hs, next: out.nextAction, gates: out.engine?.gates?.slice(-3) },
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

// ── OZV-1313: classify R2 NEED_FACTS/CHOT nhóm 848110 (van giảm áp) → đôn 84812011 ──
// Prod GĐ 08:41 VN (sau #1394): classify NEED_FACTS · kết quả 848110 · gemini-free.
// Series AR = van truyền động khí nén 8481.20, không phải pressure-reducing 8481.10.
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
          subheading6: '848110',
          why: 'van giảm áp',
          confidence: 70,
        },
      ],
      verify: {
        searchVi: ['bộ lọc khí', 'zonye ar2000'],
        codes8: ['84811011', '84812011', '84811099'],
        micQuery: null,
        unknowns: [],
      },
    },
    {
      decision: 'HOI',
      hs: '848110',
      confidence: 62,
      reason: 'Hồ sơ thiếu dữ kiện quyết định mã: van giảm áp loại nào / chất liệu thân',
      basis: [{ stream: 'SUY_LUAN', claim: '8481.10', evidence: 'điều áp' }],
      conditions: [],
      alternatives: [
        { hs: '84812011', whyNot: 'có thể van truyền động khí nén' },
        { hs: '84811011', whyNot: 'cần xác nhận van giảm áp thân sắt/thép' },
      ],
      questions: [
        {
          fact: 'loaiVan',
          question: 'Đây là van giảm áp (pressure reducing) hay van/điều áp trên mạch truyền động khí nén?',
          whereToFind: 'catalogue',
        },
      ],
    },
  ];
  llmTier.callLLMJson = async () => {
    const next = queue.shift();
    if (!next) throw new Error('hết stub LLM AR2000 848110');
    return { json: next };
  };
  const out = await classifyLoop(
    { tenHang: 'bộ lọc khí zonye ar2000-02', model: 'AR2000-02' },
    { mic: false, crossCheck: false, timeoutMs: 5000 },
  );
  llmTier.callLLMJson = saved;
  const top3 = (out.results || []).map((r) => r.hs);
  check(
    'OZV-1313 AR2000: R2 HOI 848110 → hết NEED_FACTS, đôn top1 84812011',
    out.status !== 'NEED_FACTS' && top3[0] === '84812011',
    { status: out.status, top3, next: out.nextAction },
  );
  check(
    'OZV-1313 AR2000: top/results không còn 848110*',
    top3.every((h) => !String(h).startsWith('848110')),
    top3,
  );
}

// ── OZV-1320: GIR HOI 848120 + R1 còn unknowns → vẫn đôn 84812011 (prod lần 3) ──
// Prod 10:54–10:57 VN sau #1400: lần 3 NEED_FACTS · 848120 (6 số) · NHOM_CHUA_KIEM →
// GIR HOI 848120 · không promote vì cungNhanhHigh đòi !conUnknownsR1 (gemini-free để lại
// unknowns). earlyExitHoi=false (đã leo GIR) → phải đôn; ca giác hút earlyExit vẫn chặn.
{
  const saved = llmTier.callLLMJson;
  const queue = [
    {
      product: {
        nameVi: 'bộ lọc khí Zonye AR2000-02',
        purpose: 'điều áp khí nén',
        mechanism: null,
        material: null,
        form: 'hoàn chỉnh',
        brand: 'Zonye',
        model: 'AR2000-02',
        evidence: {},
      },
      hypotheses: [
        {
          chapter: '84',
          heading4: '8481',
          subheading6: '848120',
          why: 'van truyền động khí nén',
          confidence: 78,
        },
      ],
      verify: {
        searchVi: ['bộ lọc khí', 'zonye ar2000'],
        codes8: ['84812011', '84812090'],
        micQuery: null,
        unknowns: [
          'Chất liệu vỏ chính',
          'Có tích hợp van điều áp (regulator) hay chỉ lọc khí đơn thuần',
        ],
      },
    },
    {
      decision: 'HOI',
      hs: '848120',
      confidence: 58,
      reason: 'Hồ sơ thiếu dữ kiện: chất liệu thân / có regulator hay không',
      basis: [{ stream: 'SUY_LUAN', claim: '8481.20', evidence: 'AR2000' }],
      conditions: [],
      alternatives: [
        { hs: '84812011', whyNot: 'cần xác nhận thân sắt/thép' },
        { hs: '84819000', whyNot: 'không phải phụ tùng' },
      ],
      questions: [
        {
          fact: 'chatLieuVo',
          question: 'Chất liệu vỏ chính là gì?',
          whereToFind: 'catalogue',
        },
      ],
    },
  ];
  llmTier.callLLMJson = async () => {
    const next = queue.shift();
    if (!next) throw new Error('hết stub LLM OZV-1320 HOI+unknowns');
    return { json: next };
  };
  // gon=off: bỏ earlyExit để buộc đi GIR HOI (đúng lỗ prod lần 3 — đã leo GIR).
  const savedGon = process.env.HS_GON_DAU_RA;
  process.env.HS_GON_DAU_RA = 'off';
  let out;
  try {
    out = await classifyLoop(
      { tenHang: 'bộ lọc khí zonye ar2000 -02', model: 'AR2000-02' },
      { mic: false, crossCheck: false, timeoutMs: 5000 },
    );
  } finally {
    if (savedGon === undefined) delete process.env.HS_GON_DAU_RA;
    else process.env.HS_GON_DAU_RA = savedGon;
    llmTier.callLLMJson = saved;
  }
  const top3 = (out.results || []).map((r) => r.hs);
  const gates = out.engine?.gates || [];
  check(
    'OZV-1320 HOI 848120 + unknowns: đôn 84812011 (không NEED_FACTS)',
    out.status !== 'NEED_FACTS' && top3[0] === '84812011',
    { status: out.status, top3, next: out.nextAction, gates: gates.slice(-3) },
  );
  check(
    'OZV-1320 HOI+unknowns: không earlyExitHoi (đã leo GIR)',
    !gates.some((g) => g.earlyExitHoi === true),
    gates.slice(-3),
  );
}

// ── OZV-1324: máy phun socola 5 tầng — earlyExit/HOI lệch 841990 → đôn 84382010 ──
// Prod 17/11 ×3: 2/3 REVIEW+promote 84382010; 1/3 earlyExitHoi=true hs=841990 NEED_FACTS
// (8419 chưa avoid → không biCam; cungNhanhHigh bị chặn bởi daEarlyExitHoi).
{
  const TEN_SOCOLA = 'máy phun socola 5 tầng';
  const R1_SOCOLA_8419 = {
    product: {
      nameVi: 'máy phun socola 5 tầng',
      purpose: 'phun/phủ socola trưng bày',
      mechanism: null,
      material: null,
      form: 'thiết bị hoàn chỉnh',
      evidence: {},
    },
    hypotheses: [
      {
        chapter: '84',
        heading4: '8419',
        subheading6: '841990',
        why: 'phụ tùng máy gia nhiệt / nấu socola',
        confidence: 62,
      },
    ],
    verify: {
      searchVi: ['máy phun socola', '5 tầng'],
      codes8: ['84199019', '84198110', '84382010'],
      micQuery: null,
      unknowns: [
        'Máy dùng điện hay cơ-tay để vận hành',
        'Vật liệu các bộ phận tiếp xúc socola',
        'Kích thước, công suất và áp suất bơm',
        'Nhãn hiệu và model',
        'Máy có bộ điều khiển, bơm và đầu phun đi kèm không',
      ],
    },
  };

  {
    const g = await gather(R1_SOCOLA_8419, { tenHang: TEN_SOCOLA }, { micAllowed: false });
    check(
      'OZV-1324 gather socola: có nhóm 8438, không còn 8419 (avoid)',
      (g.headings || []).includes('8438') && !(g.headings || []).includes('8419'),
      g.headings,
    );
    check(
      'OZV-1324 gather socola: codes8 có 84382010, không còn 8419*',
      (g.codes8 || []).includes('84382010')
        && !(g.codes8 || []).some((c) => String(c).startsWith('8419')),
      g.codes8,
    );
  }

  {
    const saved = llmTier.callLLMJson;
    const queue = [
      R1_SOCOLA_8419,
      {
        decision: 'HOI',
        hs: '841990',
        confidence: 55,
        reason: 'Hồ sơ thiếu dữ kiện quyết định mã: máy nấu/gia nhiệt hay máy phun phủ',
        basis: [{ stream: 'SUY_LUAN', claim: '8419.90', evidence: 'socola' }],
        conditions: [],
        alternatives: [
          { hs: '84198110', whyNot: 'có thể máy nấu đồ uống' },
          { hs: '84382010', whyNot: 'có thể máy chế biến socola' },
        ],
        questions: [
          {
            fact: 'dien',
            question: 'Máy dùng điện hay cơ-tay để vận hành',
            whereToFind: 'catalogue',
          },
        ],
      },
    ];
    llmTier.callLLMJson = async () => {
      const next = queue.shift();
      if (!next) throw new Error('hết stub LLM socola 8419');
      return { json: next };
    };
    // gon=off: buộc leo GIR HOI 841990 (đúng nhánh biCam sau khi earlyExit bị NHOM_CHUA_KIEM).
    const savedGon = process.env.HS_GON_DAU_RA;
    process.env.HS_GON_DAU_RA = 'off';
    let out;
    try {
      out = await classifyLoop({ tenHang: TEN_SOCOLA }, { mic: false, crossCheck: false, timeoutMs: 5000 });
    } finally {
      if (savedGon === undefined) delete process.env.HS_GON_DAU_RA;
      else process.env.HS_GON_DAU_RA = savedGon;
      llmTier.callLLMJson = saved;
    }
    const top3 = (out.results || []).map((r) => r.hs);
    const gates = out.engine?.gates || [];
    check(
      'OZV-1324 socola HOI 841990: đôn 84382010 (không NEED_FACTS)',
      out.status !== 'NEED_FACTS' && top3[0] === '84382010',
      { status: out.status, top3, next: out.nextAction, gates: gates.slice(-4) },
    );
    check(
      'OZV-1324 socola: top3 không còn 8419*',
      top3.every((h) => !String(h).startsWith('8419')),
      top3,
    );
    check(
      'OZV-1324 socola: có trade-synonyms-promote → 84382010',
      gates.some((g) => g.note === 'trade-synonyms-promote' && g.to === '84382010'),
      gates.slice(-4),
    );
  }

  // earlyExitHoi (gon bật) + R1 lệch 841990: avoid 8419 → earlyExit thường bị NHOM_CHUA_KIEM,
  // leo GIR; nếu vẫn earlyExit được thì biCam vẫn đôn. Canary: không kẹt NEED_FACTS 841990.
  {
    const saved = llmTier.callLLMJson;
    const queue = [
      R1_SOCOLA_8419,
      {
        decision: 'HOI',
        hs: '841990',
        confidence: 50,
        reason: 'thiếu dữ kiện máy gia nhiệt',
        basis: [{ stream: 'SUY_LUAN', claim: '8419.90', evidence: 'socola' }],
        conditions: [],
        alternatives: [{ hs: '84382010', whyNot: 'máy chế biến socola' }],
        questions: [
          { fact: 'dien', question: 'Máy dùng điện hay cơ-tay', whereToFind: 'catalogue' },
        ],
      },
    ];
    llmTier.callLLMJson = async () => {
      const next = queue.shift();
      if (!next) throw new Error('hết stub LLM socola earlyExit');
      return { json: next };
    };
    const savedGon = process.env.HS_GON_DAU_RA;
    delete process.env.HS_GON_DAU_RA; // mặc định gon bật
    let out;
    try {
      out = await classifyLoop({ tenHang: TEN_SOCOLA }, { mic: false, crossCheck: false, timeoutMs: 5000 });
    } finally {
      if (savedGon !== undefined) process.env.HS_GON_DAU_RA = savedGon;
      llmTier.callLLMJson = saved;
    }
    const top3 = (out.results || []).map((r) => r.hs);
    check(
      'OZV-1324 socola earlyExit/HOI 8419: ra 84382010 8 số, không NEED_FACTS',
      out.status !== 'NEED_FACTS'
        && top3[0] === '84382010'
        && String(top3[0]).length === 8,
      { status: out.status, top3, gates: (out.engine?.gates || []).slice(-4) },
    );
  }
}

// ── OZV-1315: STT 26 strip CRC khổ hẹp — R2 lệch 72091610 → đôn 72112390 (avoid 7209) ──
{
  const TEN_26 =
    'Thép không hợp kim cán phẳng dạng cuộn cán nguội (cold rolled steel strip in coil, SPCC-4B), hàm lượng carbon dưới 0,25%, chiều dày 1 mm, chiều rộng 450 mm (dưới 600 mm), chưa phủ, mạ hoặc tráng, không gia công quá mức cán nguội';
  const R1_SAI_7209 = {
    product: {
      nameVi: 'thép cán nguội dạng cuộn SPCC-4B',
      purpose: 'cán phẳng',
      mechanism: 'cán nguội',
      material: 'thép không hợp kim',
      form: 'cuộn / dải',
      evidence: { widthMm: 450, thicknessMm: 1 },
    },
    hypotheses: [
      {
        chapter: '72',
        heading4: '7209',
        subheading6: '720916',
        why: 'cán nguội dạng cuộn',
        confidence: 70,
      },
    ],
    verify: {
      searchVi: ['thép cán nguội', 'spcc', 'cuộn'],
      codes8: ['72091610', '72091710', '72112390'],
      micQuery: null,
      unknowns: [],
    },
  };
  const saved = llmTier.callLLMJson;
  const queue = [
    R1_SAI_7209,
    {
      decision: 'HOI',
      hs: '720916',
      confidence: 62,
      reason: 'Cần xác nhận chiều rộng ≥600 mm hay <600 mm',
      basis: [{ stream: 'SUY_LUAN', claim: '7209.16', evidence: 'cán nguội cuộn' }],
      conditions: [],
      alternatives: [
        { hs: '72091610', whyNot: 'rộng ≤1250 mm' },
        { hs: '72112390', whyNot: 'có thể khổ hẹp' },
      ],
      questions: [
        { fact: 'chieuRong', question: 'Chiều rộng ≥ 600 mm hay dưới 600 mm?', whereToFind: 'catalogue' },
      ],
    },
  ];
  llmTier.callLLMJson = async () => {
    const next = queue.shift();
    if (!next) throw new Error('hết stub LLM STT26');
    return { json: next };
  };
  const out = await classifyLoop({ tenHang: TEN_26 }, { mic: false, crossCheck: false, timeoutMs: 5000 });
  llmTier.callLLMJson = saved;
  const top3 = (out.results || []).map((r) => r.hs);
  check(
    'OZV-1315 STT26: đôn top1 72112390 (không kẹt 720916*)',
    out.status !== 'NEED_FACTS' && top3[0] === '72112390',
    { status: out.status, top3, next: out.nextAction },
  );
  check(
    'OZV-1315 STT26: top3 không còn 7209*',
    top3.every((h) => !String(h).startsWith('7209')),
    top3,
  );
}

// ── OZV-1316: STT 10 nhãn nhựa tự dính — earlyExitHoi unknowns → đôn 39199092 (TB 16238) ──
// Đo A1 17/11: NEED_FACTS / không ra mã vì unknowns độ dày/gia cố + checkSubheading chặn chacChan.
{
  const TEN_10 =
    'Nhãn nhựa tự dính đã in (PLASTIC LABEL, tem nhãn) dạng chiếc phẳng 26x12 mm, dạng cuộn: lớp mặt PET phủ SiO2 in mực UV (logo, thông tin sản phẩm, mã vạch), lớp keo acrylic polymer, lớp đế giấy glassine phủ silicone/PE bóc bỏ trước khi dán';
  const R1_STT10 = {
    product: {
      nameVi: 'Nhãn nhựa tự dính đã in PET',
      purpose: 'nhãn dán sản phẩm',
      mechanism: 'tự dính',
      material: 'PET / acrylic',
      form: 'chiếc phẳng / cuộn',
      evidence: {},
    },
    hypotheses: [
      {
        chapter: '39',
        heading4: '3919',
        subheading6: '391990',
        why: 'tấm/màng tự dính bằng plastic',
        confidence: 72,
      },
    ],
    verify: {
      searchVi: ['nhãn nhựa tự dính', 'plastic label'],
      codes8: ['49119990', '39191099'],
      micQuery: null,
      unknowns: [
        'Độ dày tổng thể của nhãn nhựa có vượt quá 1 mm không',
        'Màng nhựa có gia cố hoặc kết hợp với vật liệu khác ngoài chất dẻo không',
      ],
    },
  };
  const saved = llmTier.callLLMJson;
  llmTier.callLLMJson = async () => ({ json: R1_STT10 });
  const out = await classifyLoop({ tenHang: TEN_10 }, { mic: false, crossCheck: false, timeoutMs: 8000 });
  llmTier.callLLMJson = saved;
  const top3 = (out.results || []).map((r) => r.hs);
  check(
    'OZV-1316 STT10: hết NEED_FACTS, top1 39199092',
    out.status !== 'NEED_FACTS' && top3[0] === '39199092',
    { status: out.status, top3, next: out.nextAction },
  );
  check(
    'OZV-1316 STT10: top3 không còn 4911* / 391910*',
    top3.every((h) => !/^(4911|391910)/.test(String(h))),
    top3,
  );
}

// ── OZV-1325: đầu lắc xilanh FD1016 — earlyExit/HOI lệch 730799 → đôn 84129090 ──
// Prod 17/11 ×3 classify: cả 3 NEED_FACTS · earlyExitHoi hs=730799 (nối ống thép).
// Suggest lệch 841231 / 840991. Oz-gold + hs-aliases: FD1016 → 84129090.
{
  const TEN_DAU_LAC = 'đầu lắc xilanh fd1016';
  const R1_DAU_LAC_7307 = {
    product: {
      nameVi: 'đầu lắc xilanh fd1016',
      purpose: 'khớp nối đu đưa cho xi lanh khí nén',
      mechanism: null,
      material: 'thép',
      form: 'bộ phận',
      evidence: {},
    },
    hypotheses: [
      {
        chapter: '73',
        heading4: '7307',
        subheading6: '730799',
        why: 'phụ kiện ống / đầu nối thép',
        confidence: 58,
      },
    ],
    verify: {
      searchVi: ['đầu lắc', 'xilanh', 'fd1016'],
      codes8: ['73079990', '84123100', '84129090'],
      micQuery: null,
      unknowns: [
        'Chất liệu và kiểu ren (M16…)',
        'Hàng là đầu lắc thay thế hay xi lanh nguyên chiếc',
      ],
    },
  };

  {
    const g = await gather(R1_DAU_LAC_7307, { tenHang: TEN_DAU_LAC }, { micAllowed: false });
    check(
      'OZV-1325 gather đầu lắc: có nhóm 8412, không còn 7307 (avoid)',
      (g.headings || []).includes('8412') && !(g.headings || []).includes('7307'),
      g.headings,
    );
    check(
      'OZV-1325 gather đầu lắc: codes8 có 84129090, không còn 7307*',
      (g.codes8 || []).includes('84129090')
        && !(g.codes8 || []).some((c) => String(c).startsWith('7307')),
      g.codes8,
    );
  }

  {
    const saved = llmTier.callLLMJson;
    const queue = [
      R1_DAU_LAC_7307,
      {
        decision: 'HOI',
        hs: '730799',
        confidence: 50,
        reason: 'Hồ sơ thiếu dữ kiện quyết định mã: đầu nối ống hay bộ phận xi lanh',
        basis: [{ stream: 'SUY_LUAN', claim: '7307.99', evidence: 'đầu lắc' }],
        conditions: [],
        alternatives: [
          { hs: '73079990', whyNot: 'có thể phụ kiện ống thép' },
          { hs: '84129090', whyNot: 'có thể bộ phận xi lanh khí nén' },
        ],
        questions: [
          {
            fact: 'loaiHang',
            question: 'Đây là đầu lắc/khớp nối của xi lanh khí nén hay phụ kiện ống thép?',
            whereToFind: 'catalogue / tem model FD',
          },
        ],
      },
    ];
    llmTier.callLLMJson = async () => {
      const next = queue.shift();
      if (!next) throw new Error('hết stub LLM đầu lắc 7307');
      return { json: next };
    };
    const savedGon = process.env.HS_GON_DAU_RA;
    process.env.HS_GON_DAU_RA = 'off';
    let out;
    try {
      out = await classifyLoop({ tenHang: TEN_DAU_LAC }, { mic: false, crossCheck: false, timeoutMs: 5000 });
    } finally {
      if (savedGon === undefined) delete process.env.HS_GON_DAU_RA;
      else process.env.HS_GON_DAU_RA = savedGon;
      llmTier.callLLMJson = saved;
    }
    const top3 = (out.results || []).map((r) => r.hs);
    const gates = out.engine?.gates || [];
    check(
      'OZV-1325 đầu lắc HOI 730799: đôn 84129090 (không NEED_FACTS)',
      out.status !== 'NEED_FACTS' && top3[0] === '84129090',
      { status: out.status, top3, next: out.nextAction, gates: gates.slice(-4) },
    );
    check(
      'OZV-1325 đầu lắc: top3 không còn 7307*',
      top3.every((h) => !String(h).startsWith('7307')),
      top3,
    );
    check(
      'OZV-1325 đầu lắc: có trade-synonyms-promote → 84129090',
      gates.some((g) => g.note === 'trade-synonyms-promote' && g.to === '84129090'),
      gates.slice(-4),
    );
  }

  // earlyExitHoi (gon bật) + R1 lệch 730799: avoid 7307 → biCam đôn dù daEarlyExitHoi.
  {
    const saved = llmTier.callLLMJson;
    const queue = [
      R1_DAU_LAC_7307,
      {
        decision: 'HOI',
        hs: '730799',
        confidence: 50,
        reason: 'thiếu dữ kiện đầu nối ống',
        basis: [{ stream: 'SUY_LUAN', claim: '7307.99', evidence: 'đầu lắc' }],
        conditions: [],
        alternatives: [{ hs: '84129090', whyNot: 'bộ phận xi lanh' }],
        questions: [
          { fact: 'loaiHang', question: 'Đầu lắc xi lanh hay nối ống?', whereToFind: 'catalogue' },
        ],
      },
    ];
    llmTier.callLLMJson = async () => {
      const next = queue.shift();
      if (!next) throw new Error('hết stub LLM đầu lắc earlyExit');
      return { json: next };
    };
    const savedGon = process.env.HS_GON_DAU_RA;
    delete process.env.HS_GON_DAU_RA; // mặc định gon bật
    let out;
    try {
      out = await classifyLoop({ tenHang: TEN_DAU_LAC }, { mic: false, crossCheck: false, timeoutMs: 5000 });
    } finally {
      if (savedGon !== undefined) process.env.HS_GON_DAU_RA = savedGon;
      llmTier.callLLMJson = saved;
    }
    const top3 = (out.results || []).map((r) => r.hs);
    check(
      'OZV-1325 đầu lắc earlyExit/HOI 7307: ra 84129090 8 số, không NEED_FACTS',
      out.status !== 'NEED_FACTS'
        && top3[0] === '84129090'
        && String(top3[0]).length === 8,
      { status: out.status, top3, gates: (out.engine?.gates || []).slice(-4) },
    );
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
