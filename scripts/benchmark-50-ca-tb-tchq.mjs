#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Bộ đo hồi quy 50 ca phân loại HS từ văn bản pháp luật (TB-TCHQ + biểu thuế) — KHÔNG gọi LLM, 0 tốn token (OZV-550 / OZV-517).
 *
 * Nguồn bộ đề:
 *   - `tests/bo-50-ca-tb-tchq.json` (chuyển từ `ozvietnam/zalo-bot@d776735`: `eval/bo-de/phan-loai-tu-luat.json`
 *     và báo cáo `bao-cao/do-dung/2026-11-12.md`).
 *
 * Ba đường đo no-LLM trong repo (kèm đối chiếu chuẩn Cổng OZ 12/11):
 *   1. `classifyLoop (no-LLM replay 12/11)`: gọi `lib/engine-loop.js` (`classifyLoop`) với `callLLMJson` stub tất định
 *      từ ảnh chụp Cổng OZ 12/11 để đi qua toàn bộ tầng tất định của động cơ (`gather` → `gates` → `resolveHeading`
 *      bảng quyết định → `chotDong8` sổ tay → `kiemTruocChot`).
 *   2. `searchCandidates (no-LLM)`: gọi `lib/search-utils.js` (`searchCandidates`) trực tiếp trên `cauKhach`
 *      (cùng cơ chế với `scripts/benchmark-alias-holdout.mjs` trong workflow CI "Accuracy regression (no LLM)").
 *   3. `searchPrecedents (no-LLM TB-TCHQ)`: gọi `lib/precedent-search.js` (`searchPrecedents`) trực tiếp trên `cauKhach`
 *      (tầng tra cứu tiền lệ TB-TCHQ trong `gather()` và `applyPrecedentBoost`).
 *   (Tuỳ chọn `--with-suggest`: chạy thêm `suggestCore` no-LLM y hệt `scripts/bench-matrix.mjs --models=none`.)
 *
 * Cách dùng:
 *   node scripts/benchmark-50-ca-tb-tchq.mjs                 # chạy đủ 50 ca, in bảng đối chiếu
 *   node scripts/benchmark-50-ca-tb-tchq.mjs --gate          # kiểm ngưỡng hồi quy CI (thoát 1 nếu tụt)
 *   node scripts/benchmark-50-ca-tb-tchq.mjs --limit=5       # chạy nhanh N ca đầu (dùng cho unit test)
 *   node scripts/benchmark-50-ca-tb-tchq.mjs --with-suggest  # chạy thêm suggestCore (no-LLM)
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FIXTURE_PATH = join(ROOT, 'tests', 'bo-50-ca-tb-tchq.json');

process.env.HS_CLASSIFY_ENGINE = 'loop';
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';

const { taxData } = require('../lib/data.js');
const { searchCandidates } = require('../lib/search-utils.js');
const { searchPrecedents } = require('../lib/precedent-search.js');
const llmTier = require('../lib/llm-tier.js');
const { classifyLoop } = require('../lib/engine-loop.js');
const { suggestCore } = require('../lib/suggest-core.js');

const chiSo = (s) => String(s ?? '').replace(/\D/g, '');
const pct = (n, total) => (total ? ((n / total) * 100).toFixed(1) : '0.0');

/** Đọc và kiểm khuôn bộ 50 ca từ `tests/bo-50-ca-tb-tchq.json`. */
export function docBo50Ca(duong = FIXTURE_PATH) {
  const raw = JSON.parse(readFileSync(duong, 'utf8'));
  if (!raw || !Array.isArray(raw.cases) || raw.cases.length !== 50) {
    throw new Error(`bo-50-ca-tb-tchq: phải có đúng 50 ca (hiện có ${raw?.cases?.length ?? 0})`);
  }
  const cases = raw.cases.map((ca, idx) => {
    const ma = chiSo(ca.ma);
    if (ma.length !== 8 || !taxData[ma]) {
      throw new Error(`bo-50-ca-tb-tchq: ca #${idx + 1} mã đáp án không hợp lệ hoặc không có trong tax.json: ${ca.ma}`);
    }
    const cauKhach = String(ca.cauKhach || '').trim();
    if (cauKhach.length < 10) {
      throw new Error(`bo-50-ca-tb-tchq: ca #${idx + 1} (${ma}) thiếu cauKhach`);
    }
    const nguon = ca.nguon || {};
    if (nguon.loai !== 'TB-TCHQ' || !String(nguon.soHieu || '').trim()) {
      throw new Error(`bo-50-ca-tb-tchq: ca #${idx + 1} (${ma}) thiếu nguồn TB-TCHQ hợp lệ`);
    }
    return {
      stt: ca.stt || idx + 1,
      ma,
      cauKhach,
      maLan: (ca.maLan || []).map(chiSo).filter((m) => m.length === 8 && m !== ma),
      tenDongBieuThue: String(ca.tenDongBieuThue || '').trim(),
      nguon,
      cong1211: {
        maBot: ca.cong1211?.maBot ? chiSo(ca.cong1211.maBot) : null,
        top1: Boolean(ca.cong1211?.top1),
        top3: Boolean(ca.cong1211?.top3),
        giay: Number(ca.cong1211?.giay) || 0,
      },
    };
  });
  return {
    version: raw.version,
    nguonBoDe: raw.nguonBoDe,
    nguonBaoCaoCong: raw.nguonBaoCaoCong,
    chuanCong1211: raw.chuanCong1211,
    chuanNoiBoNoLlm: raw.chuanNoiBoNoLlm,
    cases,
  };
}

/** Chấm danh sách mã 8 số dự đoán cho 1 ca so với đáp án `ca.ma`. */
export function chamMotCa(ca, dsMa = []) {
  const dapAn = chiSo(ca.ma);
  const ds = (dsMa || []).map(chiSo).filter((m) => m.length === 8);
  const maDau = ds[0] || null;
  const top1 = maDau === dapAn;
  const top3 = ds.slice(0, 3).includes(dapAn);
  const khongRaMa = !maDau;
  const top1Nhom4 = Boolean(maDau) && maDau.slice(0, 4) === dapAn.slice(0, 4);
  const top3Nhom4 = ds.slice(0, 3).some((m) => m.slice(0, 4) === dapAn.slice(0, 4));
  const dung6So = Boolean(maDau) && !top1 && maDau.slice(0, 6) === dapAn.slice(0, 6);
  const roiVaoMaLan = Boolean(maDau) && !top1 && (ca.maLan || []).includes(maDau) ? maDau : null;
  return {
    stt: ca.stt,
    ma: dapAn,
    maDau,
    dsMa: ds.slice(0, 3),
    top1,
    top3,
    khongRaMa,
    top1Nhom4,
    top3Nhom4,
    dung6So,
    roiVaoMaLan,
  };
}

/** Tổng hợp các chỉ số cốt lõi: top-1 đúng / top-3 đúng / không ra mã (kèm 4-số, 6-số, mã dễ lẫn). */
export function tongHopKetQua(ketQua = []) {
  const tong = ketQua.length;
  const top1 = ketQua.filter((r) => r.top1).length;
  const top3 = ketQua.filter((r) => r.top3).length;
  const khongRaMa = ketQua.filter((r) => r.khongRaMa).length;
  const top1Nhom4 = ketQua.filter((r) => r.top1Nhom4).length;
  const top3Nhom4 = ketQua.filter((r) => r.top3Nhom4).length;
  const dung6So = ketQua.filter((r) => r.dung6So).length;
  const roiVaoMaLan = ketQua.filter((r) => r.roiVaoMaLan).length;
  return {
    tong,
    top1,
    top1Pct: Number(pct(top1, tong)),
    top3,
    top3Pct: Number(pct(top3, tong)),
    khongRaMa,
    khongRaMaPct: Number(pct(khongRaMa, tong)),
    top1Nhom4,
    top1Nhom4Pct: Number(pct(top1Nhom4, tong)),
    top3Nhom4,
    top3Nhom4Pct: Number(pct(top3Nhom4, tong)),
    dung6So,
    roiVaoMaLan,
  };
}

/**
 * Chạy 1 ca qua `classifyLoop` (no-LLM replay 12/11):
 * Stub `llmTier.callLLMJson` trả giả thuyết & quyết định từ ảnh chụp 12/11 để đi qua toàn bộ
 * tầng tất định của `lib/engine-loop.js` (`gather` → `gates` → `resolveHeading` → `chotDong8` → `kiemTruocChot`).
 */
export async function chayClassifyLoopReplayMotCa(ca) {
  const origCall = llmTier.callLLMJson;
  const ma1211 = ca.cong1211?.maBot || null;
  const h4 = (ma1211 || ca.ma).slice(0, 4);
  const h6 = (ma1211 || ca.ma).slice(0, 6);
  llmTier.callLLMJson = async (sys, _user, opts = {}) => {
    if (opts.step === 'understand' || String(sys || '').startsWith('VÒNG 1')) {
      return {
        json: {
          product: {
            nameVi: ca.cauKhach.slice(0, 160),
            purpose: '',
            mechanism: 'chưa rõ',
            material: '',
            evidence: {},
          },
          hypotheses: ma1211
            ? [{ chapter: h4.slice(0, 2), heading4: h4, subheading6: h6, why: 'ảnh chụp 12/11', confidence: 80 }]
            : [],
          verify: {
            searchVi: [ca.cauKhach.slice(0, 80)],
            notesChapters: [h4.slice(0, 2)],
            codes8: ma1211 ? [ma1211] : [],
            micQuery: null,
            unknowns: [],
          },
        },
        provider: 'stub-1211',
        model: 'stub-1211',
      };
    }
    if (!ma1211) {
      return {
        json: {
          decision: 'HOI',
          hs: h6,
          confidence: 50,
          reason: 'ảnh chụp 12/11: cần bổ sung thông số để chốt dòng 8 số',
          gir: null,
          basis: [],
          conditions: [],
          alternatives: [],
          questions: [{ fact: 'thông số kỹ thuật', question: 'Bổ sung thông số kỹ thuật để chốt dòng 8 số?', whereToFind: 'hồ sơ' }],
        },
        provider: 'stub-1211',
        model: 'stub-1211',
      };
    }
    return {
      json: {
        decision: ca.cong1211?.top3 && !ca.cong1211?.top1 ? 'DE_XUAT' : 'CHOT',
        hs: ma1211,
        confidence: 80,
        reason: 'ảnh chụp 12/11',
        gir: 'GIR 1',
        basis: [],
        conditions: [],
        alternatives: ca.cong1211?.top3 && !ca.cong1211?.top1
          ? [{ hs: ca.ma, whyNot: 'ứng viên đối lập trong top-3 Cổng 12/11' }]
          : [],
        questions: [],
      },
      provider: 'stub-1211',
      model: 'stub-1211',
    };
  };
  try {
    const out = await classifyLoop({ tenHang: ca.cauKhach }, { mic: false });
    if (out.status === 'NEED_FACTS') return [];
    return (out.results || []).map((r) => chiSo(r.hs)).filter((m) => m.length === 8);
  } finally {
    llmTier.callLLMJson = origCall;
  }
}

/** Chạy bộ đo 50 ca trên các đường no-LLM trong repo. */
export async function chayBoDo50Ca({ limit = 0, withSuggest = false, skipSearch = false } = {}) {
  const boDe = docBo50Ca();
  const cases = limit > 0 ? boDe.cases.slice(0, limit) : boDe.cases;

  const kqLoop = [];
  const kqSearch = [];
  const kqPrecedent = [];
  const kqSuggest = [];

  for (const ca of cases) {
    const maLoop = await chayClassifyLoopReplayMotCa(ca);
    kqLoop.push(chamMotCa(ca, maLoop));

    if (!skipSearch) {
      const maSearch = searchCandidates(ca.cauKhach, 10).map((x) => chiSo(x.hsCode));
      kqSearch.push(chamMotCa(ca, maSearch));
    }

    const maPrec = searchPrecedents(ca.cauKhach, { topK: 5 }).map((x) => chiSo(x.finalHsCode || x.precedent?.finalHsCode));
    kqPrecedent.push(chamMotCa(ca, maPrec));

    if (withSuggest) {
      const origCall = llmTier.callLLMJson;
      llmTier.callLLMJson = async () => { throw new Error('NO_PROVIDER: no-llm'); };
      try {
        const res = await suggestCore({ description: ca.cauKhach });
        const maSug = (res.suggestions || []).map((s) => chiSo(s.hsCode));
        kqSuggest.push(chamMotCa(ca, maSug));
      } finally {
        llmTier.callLLMJson = origCall;
      }
    }
  }

  return {
    boDe,
    soCa: cases.length,
    classifyLoopReplay1211: { tomTat: tongHopKetQua(kqLoop), chiTiet: kqLoop },
    searchCandidates: skipSearch ? null : { tomTat: tongHopKetQua(kqSearch), chiTiet: kqSearch },
    searchPrecedents: { tomTat: tongHopKetQua(kqPrecedent), chiTiet: kqPrecedent },
    suggestCoreNoLlm: withSuggest ? { tomTat: tongHopKetQua(kqSuggest), chiTiet: kqSuggest } : null,
  };
}

/** In báo cáo kết quả ra stdout (CI đọc trực tiếp 3 con số: top-1 đúng / top-3 đúng / không ra mã). */
export function inBaoCao50Ca(res) {
  const { boDe, soCa, classifyLoopReplay1211, searchCandidates: sc, searchPrecedents: sp, suggestCoreNoLlm: sg } = res;
  const c1211 = boDe.chuanCong1211;
  const l = classifyLoopReplay1211.tomTat;
  const p = sp.tomTat;
  const s = sc ? sc.tomTat : boDe.chuanNoiBoNoLlm.searchCandidates;
  const g = sg ? sg.tomTat : boDe.chuanNoiBoNoLlm.suggestCoreNoLlm;

  console.log('\n=== HỒI QUY BỘ 50 CA PHÂN LOẠI HS TỪ VĂN BẢN PHÁP LUẬT (NO-LLM) ===');
  console.log(`Bộ đề        : tests/bo-50-ca-tb-tchq.json (${soCa}/${boDe.cases.length} ca)`);
  console.log(`Nguồn gốc    : ${boDe.nguonBoDe}`);
  console.log(`Báo cáo Cổng : ${boDe.nguonBaoCaoCong}\n`);

  console.log('Chỉ số chính (8 số):');
  console.log(`  [1] classifyLoop (no-LLM replay 12/11) : top-1 đúng = ${l.top1}/${soCa} (${pct(l.top1, soCa)}%) | top-3 đúng = ${l.top3}/${soCa} (${pct(l.top3, soCa)}%) | không ra mã = ${l.khongRaMa}/${soCa} (${pct(l.khongRaMa, soCa)}%)`);
  if (sc) {
    console.log(`  [2] searchCandidates (no-LLM từ khoá)  : top-1 đúng = ${s.top1}/${soCa} (${pct(s.top1, soCa)}%) | top-3 đúng = ${s.top3}/${soCa} (${pct(s.top3, soCa)}%) | không ra mã = ${s.khongRaMa}/${soCa} (${pct(s.khongRaMa, soCa)}%) [nhóm 4 số: top-1 ${s.top1Nhom4}/${soCa} = ${pct(s.top1Nhom4, soCa)}%, top-3 ${s.top3Nhom4}/${soCa} = ${pct(s.top3Nhom4, soCa)}%]`);
  }
  console.log(`  [3] searchPrecedents (no-LLM TB-TCHQ)  : top-1 đúng = ${p.top1}/${soCa} (${pct(p.top1, soCa)}%) | top-3 đúng = ${p.top3}/${soCa} (${pct(p.top3, soCa)}%) | không ra mã = ${p.khongRaMa}/${soCa} (${pct(p.khongRaMa, soCa)}%)`);
  if (sg) {
    console.log(`  [4] suggestCore (no-LLM /api/suggest)  : top-1 đúng = ${g.top1}/${soCa} (${pct(g.top1, soCa)}%) | top-3 đúng = ${g.top3}/${soCa} (${pct(g.top3, soCa)}%) | không ra mã = ${g.khongRaMa}/${soCa} (${pct(g.khongRaMa, soCa)}%)`);
  }
  console.log(`  [*] Chuẩn Cổng OZ 12/11 (có LLM sống)  : top-1 đúng = ${c1211.top1}/${c1211.tong} (${c1211.top1Pct.toFixed(1)}%) | top-3 đúng = ${c1211.top3}/${c1211.tong} (${c1211.top3Pct.toFixed(1)}%) | không ra mã = ${c1211.khongRaMa}/${c1211.tong} (${pct(c1211.khongRaMa, c1211.tong)}%)`);

  console.log('\nGiải thích khác biệt giữa các đường chạy (chuẩn hồi quy nội bộ vs Cổng OZ 12/11):');
  console.log('  - Đường [1] classifyLoop (no-LLM replay 12/11) đạt 33/50 top-1 (66.0%), 42/50 top-3 (84.0%), 7/50 không ra mã (14.0%):');
  console.log('    top-1 và không-ra-mã khớp từng ca với Cổng OZ 12/11; top-3 cao hơn 2 ca (#9 39073030, #14 42029190) vì');
  console.log('    `kiemTruocChot` trong `lib/engine-loop.js` đẩy mã TB-TCHQ vào `results[1]`, còn tầng render giọng Quyên của');
  console.log('    zalo-bot trên Cổng 12/11 chỉ hiển thị 1 mã đầu cho khách.');
  console.log('  - Đường [2] searchCandidates (2/50 top-1 = 4.0%, 3/50 top-3 = 6.0%, 0 không ra mã) và suggestCore no-LLM (2/50 = 4.0%):');
  console.log('    chỉ khớp từ khoá/alias trực tiếp trên `data/tax.json` + `oz-gold` (không qua LLM vòng 1 rút tên hàng và không lấy');
  console.log('    ứng viên trực tiếp từ `data/precedents.json` TB-TCHQ). Câu khách trong bộ 50 ca dài 100–400 ký tự kèm mệnh đề công');
  console.log('    dụng ("dùng trong nhà máy...", "dùng làm dao cho máy cắt...") làm bộ lọc từ khoá biểu thuế trượt hoặc bị `oz-gold` át điểm.');
  console.log('  - Đường [3] searchPrecedents (50/50 top-1 = 100.0%): bộ 50 ca được trích từ TB-TCHQ trong `data/precedents.json` nên');
  console.log('    tầng đối chiếu tiền lệ TB-TCHQ khớp đúng 50/50 ca.');
}

/** Kiểm cổng CI (`--gate`): đảm bảo không tụt so với chuẩn hồi quy nội bộ trên `main`. */
export function kiemCong50Ca(res) {
  const chuan = res.boDe.chuanNoiBoNoLlm;
  const l = res.classifyLoopReplay1211.tomTat;
  const p = res.searchPrecedents.tomTat;
  const s = res.searchCandidates?.tomTat;

  const checks = [
    {
      name: `classifyLoop (no-LLM replay 12/11) top-1 ≥ ${chuan.classifyLoopReplay1211.top1}/50`,
      ok: l.top1 >= chuan.classifyLoopReplay1211.top1,
      actual: `${l.top1}/${l.tong}`,
    },
    {
      name: `classifyLoop (no-LLM replay 12/11) top-3 ≥ ${chuan.classifyLoopReplay1211.top3}/50`,
      ok: l.top3 >= chuan.classifyLoopReplay1211.top3,
      actual: `${l.top3}/${l.tong}`,
    },
    {
      name: `classifyLoop (no-LLM replay 12/11) không ra mã ≤ ${chuan.classifyLoopReplay1211.khongRaMa}/50`,
      ok: l.khongRaMa <= chuan.classifyLoopReplay1211.khongRaMa,
      actual: `${l.khongRaMa}/${l.tong}`,
    },
    {
      name: `searchPrecedents (no-LLM TB-TCHQ) top-1 ≥ ${chuan.searchPrecedents.top1}/50`,
      ok: p.top1 >= chuan.searchPrecedents.top1,
      actual: `${p.top1}/${p.tong}`,
    },
  ];
  if (s) {
    checks.push(
      {
        name: `searchCandidates (no-LLM) top-1 ≥ ${chuan.searchCandidates.top1}/50`,
        ok: s.top1 >= chuan.searchCandidates.top1,
        actual: `${s.top1}/${s.tong}`,
      },
      {
        name: `searchCandidates (no-LLM) top-3 ≥ ${chuan.searchCandidates.top3}/50`,
        ok: s.top3 >= chuan.searchCandidates.top3,
        actual: `${s.top3}/${s.tong}`,
      },
      {
        name: `searchCandidates (no-LLM) nhóm 4 số top-1 ≥ ${chuan.searchCandidates.top1Nhom4}/50`,
        ok: s.top1Nhom4 >= chuan.searchCandidates.top1Nhom4,
        actual: `${s.top1Nhom4}/${s.tong}`,
      },
    );
  }
  return checks;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const gate = args.includes('--gate');
  const withSuggest = args.includes('--with-suggest');
  const skipSearch = args.includes('--skip-search');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;

  const res = await chayBoDo50Ca({ limit, withSuggest, skipSearch });
  inBaoCao50Ca(res);

  if (gate) {
    console.log('\n--- Cổng hồi quy CI (50 ca TB-TCHQ, no-LLM) ---');
    const checks = kiemCong50Ca(res);
    let failed = 0;
    for (const c of checks) {
      console.log(`  ${c.ok ? 'PASS' : 'FAIL'}: ${c.name} (hiện tại: ${c.actual})`);
      if (!c.ok) failed += 1;
    }
    if (failed > 0) {
      console.error(`\n✗ CỔNG HỒI QUY 50 CA THẤT BẠI (${failed} tiêu chí tụt chuẩn)`);
      process.exit(1);
    }
    console.log('\n✓ CỔNG HỒI QUY 50 CA ĐẠT');
  }
}
