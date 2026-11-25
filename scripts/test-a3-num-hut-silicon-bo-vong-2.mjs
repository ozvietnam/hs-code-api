#!/usr/bin/env node
// OZV-2233 — [Thực địa · A3] Núm hút silicon: bỏ vòng 2 thừa do tín hiệu trái nhóm 8479/8443 (54 giây → ≤25 giây).
//
// Căn cứ pháp lý (nguyên văn):
//  - Chú giải 1(a) Phần XVI (phan84.phan / data/notes.json):
//    «1. Phần này không bao gồm: (a) Băng truyền hoặc băng tải hoặc dây đai, bằng plastic thuộc Chương 39, hoặc bằng
//     cao su lưu hóa (nhóm 40.10), hoặc các sản phẩm khác sử dụng cho máy móc hoặc thiết bị cơ khí hay thiết bị điện
//     hay sản phẩm sử dụng cho mục đích kỹ thuật khác, bằng cao su lưu hóa trừ loại cao su cứng (nhóm 40.16);»
//  - Chú giải nhóm 40.16 mục (9) (nhom4016.nhom / data/chu-giai-heading.json):
//    «Nhóm này bao gồm tất cả các mặt hàng bằng cao su lưu hoá (trừ cao su cứng) không nằm trong các nhóm trước của
//     Chương này hoặc các Chương khác. … (9) Rôto máy bơm và khuôn đúc; lớp lót cao su cho máy vắt sữa; vòi nước, đầu
//     vòi, van và các mặt hàng tương tự; các mặt hàng khác dùng cho mục đích kỹ thuật (kể cả các bộ phận và phụ kiện
//     của máy móc và thiết bị thuộc phần XVI và của các thiết bị và máy móc thuộc Chương 90).»
//
// Luật L3 & Quy tắc 6b: mỗi cơ chế có ca thuận + ca ngược + kiểm ReDoS ~40.000 từ lặp < 2 giây.
import './test-isolate-data.mjs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
for (const k of [
  'ZAI_WEB_FACTS', 'HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'HS_SO_TAY',
  'HS_CLASSIFY_FAST_FIRST', 'R1_MAX_TOKENS', 'GIR_MAX_TOKENS',
  'HS_CHOT_SOM_CO_KIEM', 'HS_HOI_THEO_SO_TAY', 'HS_EMBED_POOL', 'HS_TIM_TRUOC',
]) {
  delete process.env[k];
}
process.env.CLASSIFY_BUDGET_MS = '285000';

const llmTier = require('../lib/llm-tier.js');
const micMod = require('../lib/mic-lookup.js');
const { soTayGates } = require('../lib/so-tay-gates.js');
const { tradeClassifyHints, biCamTrade } = require('../lib/trade-classify-hints.js');
const timTruocMod = require('../lib/tim-truoc.js');
const cs = require('../lib/chot-som-co-kiem.js');
const { classifyLoop } = require('../lib/engine-loop.js');

let pass = 0;
let fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) {
    pass += 1;
    console.log(`PASS ${name}`);
  } else {
    fail += 1;
    console.log(`FAIL ${name} ${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 600)}`);
  }
};

const CAU_NUM_HUT = [
  { tenHang: 'núm hút mbs-15, silicon, đường kính lỗ 2,5mm', model: 'MBS-15' },
  { tenHang: 'núm hút vp16ps, silicon, đường kính lỗ 2,2mm', model: 'VP16PS' },
  { tenHang: 'núm hút ys3-10, silicon, đường kính lỗ 3mm', model: 'YS3-10' },
];

// ── 1. Cổng sổ tay 4016 & 8479 (SO_TAY_LOAI_TRU và SO_TAY_BO_PHAN) ──
for (const c of CAU_NUM_HUT) {
  for (const hs of ['401699', '40169959', '40169999']) {
    const g = soTayGates({
      hs,
      productText: c.tenHang,
      productName: c.tenHang,
      form: 'bộ phận',
      pool: [{ h4: '8479', from: 'gia-thuyet' }],
    });
    check(
      `[1a thuận] «${c.tenHang}» ở ${hs} (form=bộ phận) không bắn oan SO_TAY_LOAI_TRU:8479 hay SO_TAY_BO_PHAN`,
      g.checked === true && g.challenges.length === 0,
      g.challenges,
    );
  }
  const g8479 = soTayGates({
    hs: '84799090',
    productText: c.tenHang,
    productName: c.tenHang,
    form: 'bộ phận',
    pool: [{ h4: '4016', from: 'gia-thuyet' }],
  });
  check(
    `[1b ca ngược] «${c.tenHang}» xếp nhầm 84799090 → sổ tay 84.79 bật SO_TAY_LOAI_TRU về 4016 (Chú giải 1(a) Phần XVI)`,
    (g8479.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '4016'),
    g8479.challenges,
  );
}

// Ca ngược SO_TAY_BO_PHAN: hàng thật sự là bộ phận xe đạp / bộ phận dù xoay trong 4016, hoặc bộ phận máy xay trong 8509
{
  const gXeDap = soTayGates({
    hs: '40169999',
    productText: 'Đệm cao su giảm chấn dùng làm bộ phận của xe đạp',
    productName: 'Đệm cao su bộ phận của xe đạp',
    form: 'bộ phận',
  });
  check(
    '[1c ca ngược SO_TAY_BO_PHAN] bộ phận của xe đạp chọn 40169999 → vẫn bật SO_TAY_BO_PHAN chỉ sang 40169917',
    (gXeDap.challenges || []).some((x) => x.gate === 'SO_TAY_BO_PHAN' && x.target === '40169917'),
    gXeDap.challenges,
  );

  const gDuXoay = soTayGates({
    hs: '40169999',
    productText: 'Đệm cao su làm bộ phận của dù xoay thuộc nhóm 88.04',
    productName: 'Đệm cao su bộ phận của dù xoay',
    form: 'bộ phận',
  });
  check(
    '[1d ca ngược SO_TAY_BO_PHAN] bộ phận của dù xoay chọn 40169999 → vẫn bật SO_TAY_BO_PHAN chỉ sang 40169920',
    (gDuXoay.challenges || []).some((x) => x.gate === 'SO_TAY_BO_PHAN' && x.target === '40169920'),
    gDuXoay.challenges,
  );

  const g8509 = soTayGates({
    hs: '85094000',
    productText: 'Lưỡi dao máy xay sinh tố gia dụng',
    productName: 'Lưỡi dao máy xay',
    form: 'bộ phận',
  });
  check(
    '[1e ca ngược SO_TAY_BO_PHAN] bộ phận máy xay chọn 85094000 → vẫn bật SO_TAY_BO_PHAN sang 850990*',
    (g8509.challenges || []).some((x) => x.gate === 'SO_TAY_BO_PHAN' && String(x.target).startsWith('850990')),
    g8509.challenges,
  );

  // Quy tắc 6b: ReDoS ~40.000 từ lặp < 2 giây
  const chuoiDai = Array.from({ length: 40000 }, () => 'núm').join(' ');
  const t0 = Date.now();
  const gRedos = soTayGates({ hs: '40169999', productText: chuoiDai, productName: 'núm hút silicon', form: 'bộ phận' });
  const msRedos = Date.now() - t0;
  check(
    `[1f ReDoS] 40.000 từ lặp chạy trong ${msRedos} ms (< 2000 ms)`,
    msRedos < 2000 && gRedos.checked === true,
    { msRedos },
  );
}

// ── 2. Từ điển giac-hut-chan-khong-vacuum-pad & timTruoc ──
for (const c of CAU_NUM_HUT) {
  const h = tradeClassifyHints(c.tenHang);
  for (const p of ['8443', '84439930', '8479', '84799090', '4014', '40149000', '8508', '85089000', '3924', '8414', '8422']) {
    check(
      `[2a thuận] «${c.tenHang}» chặn tiền tố ${p}`,
      biCamTrade(p, h.avoidPrefixes),
      h.avoidPrefixes,
    );
  }
  const tt = await timTruocMod.timTruoc({ tenHang: c.tenHang });
  const nhomTt = tt.tomTat?.nhom || [];
  check(
    `[2b thuận timTruoc] «${c.tenHang}» đưa 4016 lên đầu, không còn 8443/8479/4014/8508/3924 trong ứng viên vòng 1`,
    nhomTt[0] === '4016' && !nhomTt.some((x) => ['8443', '8479', '4014', '8508', '3924'].includes(x)),
    nhomTt,
  );
}

// Ca ngược từ điển: hàng thật của 8443, 8508, 4014 không khớp mục giác hút nên không bị chặn
for (const [moTa, ma] of [
  ['Quả kéo giấy máy in laser hộp mực 35A', '84439930'],
  ['Máy hút bụi cầm tay gia dụng 600W', '85081100'],
  ['Núm vú cao su cho bình sữa trẻ em', '40149000'],
]) {
  const h = tradeClassifyHints(moTa);
  check(
    `[2c ca ngược từ điển] «${moTa}» không chặn mã đúng ${ma}`,
    !biCamTrade(ma, h.avoidPrefixes),
    h.avoidPrefixes,
  );
}

// ── 3. Hàm thuần tienLeOzDanDau & tinHieuTraiNhom (lib/chot-som-co-kiem.js) ──
{
  // 3a. Khử trùng cùng bản ghi (hs + name) xuất hiện ở nhiều cụm searchVi
  const ozTrungBanGhi = [
    { q: 'núm hút silicon', hs: '84439930', name: 'Núm hút giấy', oz: 2, cov: 100 },
    { q: 'núm hút vp16ps silicon', hs: '84439930', name: 'Núm hút giấy', oz: 2, cov: 100 },
    { q: 'núm hút chân không', hs: '40169959', name: 'Núm hút chân không', oz: 2, cov: 67 },
  ];
  check(
    '[3a thuận] cùng 1 bản ghi 84439930 "Núm hút giấy" (oz=2) lặp ở 2 cụm searchVi → khử trùng còn 2 (<3) → null',
    cs.tienLeOzDanDau(ozTrungBanGhi) === null,
    cs.tienLeOzDanDau(ozTrungBanGhi),
  );

  // Ca ngược 3a: 2 bản ghi KHÁC tên cùng nhóm 8443 (2 + 2 = 4 ≥ 3) → vẫn đạt ngưỡng
  const ozHaiBanGhiKhacTen = [
    { q: 'q1', hs: '84439930', name: 'Núm hút giấy máy in offset', oz: 2, cov: 100 },
    { q: 'q2', hs: '84439930', name: 'Quả lô kéo giấy máy in', oz: 2, cov: 100 },
  ];
  const leadKhacTen = cs.tienLeOzDanDau(ozHaiBanGhiKhacTen);
  check(
    '[3a ca ngược] 2 bản ghi khác tên cùng nhóm 8443 (2+2=4 tờ khai) → vẫn trả nhom 8443, soToKhai 4',
    leadKhacTen?.nhom === '8443' && leadKhacTen?.soToKhai === 4,
    leadKhacTen,
  );

  // 3b. Lọc avoidPrefixes của tradeHints ở mục tiền lệ Oz trong tinHieuTraiNhom
  const gatheredAvoid8443 = {
    headings: ['4016', '3926'],
    ozPrecedents: ozHaiBanGhiKhacTen,
    mic: null,
    tradeHints: {
      entryIds: ['giac-hut-chan-khong-vacuum-pad'],
      avoidPrefixes: ['8443'],
      preferCodes: [
        { hs: '40169999', confidence: 'high', entryId: 'giac-hut-chan-khong-vacuum-pad' },
        { hs: '39269099', confidence: 'medium', entryId: 'giac-hut-chan-khong-vacuum-pad' },
      ],
    },
  };
  check(
    '[3b thuận] nhóm tiền lệ Oz 8443 nằm trong tradeHints.avoidPrefixes → không bật tien-le-oz',
    cs.tinHieuTraiNhom({ hs: '401699', gathered: gatheredAvoid8443 }).length === 0,
    cs.tinHieuTraiNhom({ hs: '401699', gathered: gatheredAvoid8443 }),
  );
  check(
    '[3b ca ngược] nhóm tiền lệ Oz không nằm trong avoidPrefixes → vẫn bật tien-le-oz:8443',
    cs.tinHieuTraiNhom({
      hs: '401699',
      gathered: { ...gatheredAvoid8443, tradeHints: { ...gatheredAvoid8443.tradeHints, avoidPrefixes: ['3924'] } },
    }).some((t) => t.ma === 'tien-le-oz' && t.nhom === '8443'),
  );

  // 3c. MIC ghi nhánh vật liệu phụ (medium: 3926) khi giả thuyết đứng đầu đã là nhánh high (4016) của cùng từ điển
  const gatheredMic3926 = {
    headings: ['4016', '3926'],
    ozPrecedents: [],
    mic: { consensus: { heading4: '3926', shops: 3 }, pages: [] },
    tradeHints: {
      entryIds: ['giac-hut-chan-khong-vacuum-pad'],
      avoidPrefixes: ['8443', '8479', '3924'],
      preferCodes: [
        { hs: '40169999', confidence: 'high', entryId: 'giac-hut-chan-khong-vacuum-pad' },
        { hs: '40169959', confidence: 'medium', entryId: 'giac-hut-chan-khong-vacuum-pad' },
        { hs: '39269099', confidence: 'medium', entryId: 'giac-hut-chan-khong-vacuum-pad' },
      ],
    },
  };
  check(
    '[3c thuận] giả thuyết đứng đầu 4016 (trade high), 3 shop MIC ghi 3926 (trade medium cùng từ điển) → không bật made-in-china',
    cs.tinHieuTraiNhom({ hs: '401699', gathered: gatheredMic3926 }).length === 0,
    cs.tinHieuTraiNhom({ hs: '401699', gathered: gatheredMic3926 }),
  );
  check(
    '[3c ca ngược 1] giả thuyết đứng đầu 8412 (không phải trade high), 3 shop MIC ghi 3926 → vẫn bật made-in-china:3926',
    cs.tinHieuTraiNhom({ hs: '841221', gathered: gatheredMic3926 }).some((t) => t.ma === 'made-in-china' && t.nhom === '3926'),
  );
  check(
    '[3c ca ngược 2] giả thuyết đứng đầu 4016, nhưng 3 shop MIC ghi 7616 (ngoài preferCodes) → vẫn bật made-in-china:7616',
    cs.tinHieuTraiNhom({
      hs: '401699',
      gathered: { ...gatheredMic3926, mic: { consensus: { heading4: '7616', shops: 3 }, pages: [] } },
    }).some((t) => t.ma === 'made-in-china' && t.nhom === '7616'),
  );
}

// ── 4. Qua động cơ classifyLoop (bản thật: HS_SO_TAY=full, HS_CHOT_SOM_CO_KIEM=on, HS_TIM_TRUOC=on) ──
{
  const origLlm = llmTier.callLLMJson;
  const origMic = micMod.micLookup;
  process.env.HS_SO_TAY = 'full';
  process.env.HS_CHOT_SOM_CO_KIEM = 'on';
  process.env.HS_TIM_TRUOC = 'on';
  delete process.env.MIC_OFF;

  // Giả lập MIC trả 3 shop ghi 39269090 (đúng tình huống khó nhất ở lượt 7 & lượt 10 của báo cáo đo OZV-2230)
  micMod.micLookup = async (query) => ({
    query,
    searched: true,
    cached: true,
    pages: [
      { shop: 's1', url: 'https://s1', name: 'Vacuum Suction Cup', hsCode: '39269090' },
      { shop: 's2', url: 'https://s2', name: 'Silicone Suction Cup', hsCode: '39269090' },
      { shop: 's3', url: 'https://s3', name: 'Industrial Vacuum Pad', hsCode: '39269090' },
    ],
    consensus: { heading4: '3926', hs6: '392690', shops: 3, totalWithHs: 3 },
  });

  for (const c of CAU_NUM_HUT) {
    let llmCalls = 0;
    let r1Prompt = '';
    llmTier.callLLMJson = async (system, user) => {
      llmCalls += 1;
      if (String(system).startsWith('VÒNG 1')) {
        r1Prompt = String(user);
        return {
          provider: 'stub',
          model: 'stub',
          json: {
            product: {
              nameVi: 'Núm hút chân không silicon',
              nameEn: 'Silicone vacuum suction cup',
              nameZh: '',
              purpose: 'hút giữ linh kiện trong máy công nghiệp',
              mechanism: 'khí nén / chân không',
              material: 'silicon',
              dimensions: '',
              keySpecs: [],
              brand: '',
              model: c.model,
              form: 'bộ phận',
              evidence: { material: 'silicon' },
            },
            hypotheses: [
              { chapter: '40', heading4: '4016', subheading6: '401699', why: 'Chú giải 1(a) Phần XVI + 40.16(9)', confidence: 82 },
              { chapter: '39', heading4: '3926', subheading6: '392690', why: 'nếu là nhựa dẻo không phải cao su lưu hóa', confidence: 40 },
            ],
            verify: {
              searchVi: ['núm hút silicon', `núm hút ${c.model.toLowerCase()} silicon`],
              notesChapters: ['40', '39'],
              codes8: ['40169999', '40169959', '39269099'],
              micQuery: `vacuum suction cup ${c.model}`,
              unknowns: ['Bằng cao su silicon lưu hóa (40.16) hay nhựa dẻo/plastic (39.26)?'],
            },
          },
        };
      }
      throw new Error('KHÔNG ĐƯỢC GỌI VÒNG 2');
    };

    const out = await classifyLoop({ tenHang: c.tenHang }, {});
    const gates = out.engine?.gates || [];
    const topHs = String(out.results?.[0]?.hs || '');
    check(
      `[4a động cơ thuận] «${c.tenHang}» → 1 vòng duy nhất (llmCalls=1, llmMs=0), không còn TIN_HIEU_TRAI_NHOM, ra nhóm 4016 (${topHs}), NEED_FACTS`,
      llmCalls === 1
        && out.engine?.rounds === 1
        && out.engine?.phases?.llmMs === 0
        && !gates.some((g) => g.lyDo === 'TIN_HIEU_TRAI_NHOM')
        && gates.some((g) => g.earlyExitHoi === true && g.hs === '401699')
        && topHs.startsWith('4016')
        && out.status === 'NEED_FACTS'
        && (out.missing || []).length >= 1
        && !/Nhóm 8443|Nhóm 8479|Nhóm 8508|Nhóm 4014/.test(r1Prompt),
      { llmCalls, rounds: out.engine?.rounds, status: out.status, topHs, gates },
    );
  }

  // Ca ngược qua động cơ: nếu vòng 1 đặt nhầm 847990 đứng đầu (và có 401699 ở giả thuyết 2),
  // sổ tay 84.79 chặn 847990 bằng so-tay-loai-tru:4016 và hoiTheoGiaThuyetNhomDich đổi thẳng về 401699 ở vòng 1 (0 lượt vòng 2)
  {
    const ozSearch = require('../lib/oz-precedent-search.js');
    const origOz = ozSearch.searchOzByKeyword;
    ozSearch.searchOzByKeyword = async () => ({ items: [] });
    let llmCalls = 0;
    micMod.micLookup = async (query) => ({ query, searched: false, pages: [], consensus: { heading4: null, shops: 0 } });
    llmTier.callLLMJson = async (system) => {
      llmCalls += 1;
      if (String(system).startsWith('VÒNG 1')) {
        return {
          provider: 'stub',
          model: 'stub',
          json: {
            product: {
              nameVi: 'Núm hút chân không MBS-15',
              nameEn: 'Vacuum suction cup MBS-15',
              purpose: 'bộ phận máy gắp linh kiện',
              mechanism: 'cơ khí',
              material: 'cao su silicon',
              model: 'MBS-15',
              form: 'bộ phận',
              evidence: { material: 'silicon' },
            },
            hypotheses: [
              { chapter: '84', heading4: '8479', subheading6: '847990', why: 'bộ phận máy cơ khí', confidence: 75 },
              { chapter: '40', heading4: '4016', subheading6: '401699', why: 'cao su lưu hóa dùng cho máy Phần XVI', confidence: 65 },
            ],
            verify: {
              searchVi: ['núm hút chân không'],
              notesChapters: ['84', '40'],
              codes8: ['84799090', '40169999'],
              micQuery: null,
              unknowns: ['Chất liệu là cao su lưu hóa trừ cao su cứng hay vật liệu khác?'],
            },
          },
        };
      }
      throw new Error('KHÔNG ĐƯỢC GỌI VÒNG 2');
    };
    const outNguoc = await classifyLoop({ tenHang: CAU_NUM_HUT[0].tenHang }, {});
    ozSearch.searchOzByKeyword = origOz;
    const gatesNguoc = outNguoc.engine?.gates || [];
    check(
      '[4b động cơ ca ngược] R1 đặt nhầm 847990 đứng đầu + có giả thuyết 401699 → sổ tay 84.79 chặn 847990 và đổi thẳng sang 401699 ở vòng 1 (0 lượt vòng 2)',
      llmCalls === 1
        && outNguoc.engine?.rounds === 1
        && gatesNguoc.some((g) => g.lyDo === 'TIN_HIEU_TRAI_NHOM' && g.hs === '847990' && (g.nhomTrai || []).includes('4016'))
        && gatesNguoc.some((g) => g.earlyExitHoi === true && g.hs === '401699' && g.doiTu === '847990' && g.nguon === 'so-tay-loai-tru')
        && String(outNguoc.results?.[0]?.hs || '').startsWith('4016'),
      { llmCalls, hs: outNguoc.results?.[0]?.hs, gatesNguoc },
    );
  }

  llmTier.callLLMJson = origLlm;
  micMod.micLookup = origMic;
}

console.log(`\n${fail ? `${fail} failed | ` : ''}${pass} passed`);
if (fail) process.exit(1);
console.log('=== ALL TESTS PASSED ===');
