#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Bộ đo hồi quy 50 ca phân loại HS từ văn bản pháp luật (TB-TCHQ + biểu thuế) — KHÔNG gọi LLM, 0 tốn token (OZV-550 / OZV-517).
 *
 * GIỚI HẠN QUAN TRỌNG (không đo tầng xếp hạng LLM):
 *   - Đường `replay1211` phát lại giả thuyết mã `cong1211.maBot` từ ảnh chụp Cổng OZ 12/11 (kèm ứng viên rút từ gói
 *     `gather()` trong `_user`, hoàn toàn không đọc đáp án `ca.ma`) để kiểm tra số ca sống sót qua toàn bộ tầng tất định
 *     (`gather` → `gates` → `resolveHeading` → `chotDong8` → `kiemTruocChot`).
 *   - Chỉ số `replay1211.top1SoSongSot` / `replay1211.top3SoSongSot` chỉ đo "số ca sống sót qua tầng tất định khi replay",
 *     KHÔNG phải độ chính xác A1 trên Cổng sống và KHÔNG đo tầng xếp hạng của LLM vòng 1/vòng 2.
 *
 * Nguồn bộ đề:
 *   - `tests/bo-50-ca-tb-tchq.json` (chuyển từ `ozvietnam/zalo-bot@d776735`: `eval/bo-de/phan-loai-tu-luat.json`
 *     và báo cáo `bao-cao/do-dung/2026-11-12.md`).
 *
 * Ba đường đo no-LLM trong repo (kèm đối chiếu chuẩn Cổng OZ 12/11):
 *   - `[replay1211]`: gọi `lib/engine-loop.js` (`classifyLoop`) với `callLLMJson` stub tất định (không đọc `ca.ma`,
 *     rút ứng viên đối lập từ `_user` do `gather()` sinh) để canh toàn bộ tầng tất định.
 *   - `[searchCandidates]`: gọi `lib/search-utils.js` (`searchCandidates`) trực tiếp trên `cauKhach`.
 *   - `[searchPrecedents]`: gọi `lib/precedent-search.js` (`searchPrecedents`) trực tiếp trên `cauKhach`.
 *   - (Tuỳ chọn `--with-suggest`: chạy thêm `[suggestCoreNoLlm]` y hệt `scripts/bench-matrix.mjs --models=none`.)
 *
 * Cách dùng:
 *   node scripts/benchmark-50-ca-tb-tchq.mjs                 # chạy đủ 50 ca, in bảng đối chiếu
 *   node scripts/benchmark-50-ca-tb-tchq.mjs --gate          # kiểm ngưỡng hồi quy CI (ép đúng 50 ca + đủ 3 đường, thoát 1 nếu tụt)
 *   node scripts/benchmark-50-ca-tb-tchq.mjs --limit=5       # chạy nhanh N ca đầu (nếu kèm --gate sẽ đỏ vì tong !== 50)
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

/** Đọc và kiểm khuôn bộ 50 ca từ `tests/bo-50-ca-tb-tchq.json`. Đánh số `stt` cố định 1..50. */
export function docBo50Ca(duong = FIXTURE_PATH) {
  const raw = JSON.parse(readFileSync(duong, 'utf8'));
  if (!raw || !Array.isArray(raw.cases) || raw.cases.length !== 50) {
    throw new Error(`bo-50-ca-tb-tchq: phải có đúng 50 ca (hiện có ${raw?.cases?.length ?? 0})`);
  }
  const cases = raw.cases.map((ca, idx) => {
    const sttExpected = idx + 1;
    if (ca.stt !== sttExpected) {
      throw new Error(`bo-50-ca-tb-tchq: ca #${sttExpected} có stt=${ca.stt} lệch thứ tự cố định 1..50`);
    }
    const ma = chiSo(ca.ma);
    if (ma.length !== 8 || !taxData[ma]) {
      throw new Error(`bo-50-ca-tb-tchq: ca #${sttExpected} mã đáp án không hợp lệ hoặc không có trong tax.json: ${ca.ma}`);
    }
    const cauKhach = String(ca.cauKhach || '').trim();
    if (cauKhach.length < 10) {
      throw new Error(`bo-50-ca-tb-tchq: ca #${sttExpected} (${ma}) thiếu cauKhach`);
    }
    const nguon = ca.nguon || {};
    if (nguon.loai !== 'TB-TCHQ' || !String(nguon.soHieu || '').trim()) {
      throw new Error(`bo-50-ca-tb-tchq: ca #${sttExpected} (${ma}) thiếu nguồn TB-TCHQ hợp lệ`);
    }
    return {
      stt: sttExpected,
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

/** Tổng hợp các chỉ số cốt lõi cho đường tìm kiếm / tiền lệ: top-1 đúng / top-3 đúng / không ra mã. */
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
 * Tổng hợp riêng cho đường `replay1211`: dùng tên trường `top1SoSongSot` / `top3SoSongSot`
 * để tách biệt rõ với chỉ số độ chính xác A1 (tránh đọc nhầm số replay thành A1).
 */
export function tongHopReplay1211(ketQua = []) {
  const base = tongHopKetQua(ketQua);
  return {
    tong: base.tong,
    top1SoSongSot: base.top1,
    top1SoSongSotPct: base.top1Pct,
    top3SoSongSot: base.top3,
    top3SoSongSotPct: base.top3Pct,
    khongRaMa: base.khongRaMa,
    khongRaMaPct: base.khongRaMaPct,
    top1Nhom4SoSongSot: base.top1Nhom4,
    top1Nhom4SoSongSotPct: base.top1Nhom4Pct,
    top3Nhom4SoSongSot: base.top3Nhom4,
    top3Nhom4SoSongSotPct: base.top3Nhom4Pct,
    dung6So: base.dung6So,
    roiVaoMaLan: base.roiVaoMaLan,
  };
}

/**
 * Rút ứng viên 8 số từ gói `_user` (`pack` do `gather()` trong `lib/engine-loop.js` xây dựng),
 * ưu tiên mục `TIỀN LỆ TB-TCHQ:` rồi tới `CHÚ GIẢI & DÒNG BIỂU THUẾ:`. Không bao giờ đọc `ca.ma`.
 */
export function rutUngVienTuUserPack(userPack = '', maChinh = '') {
  const text = String(userPack || '');
  const tbSection = text.split('TIỀN LỆ TB-TCHQ:')[1]?.split('\n\n')[0] || '';
  const notesSection = text.split('CHÚ GIẢI & DÒNG BIỂU THUẾ')[1]?.split('\n\nTIỀN LỆ')[0] || '';
  const out = [];
  const seen = new Set(maChinh ? [maChinh] : []);
  for (const sec of [tbSection, notesSection]) {
    for (const m of sec.matchAll(/\b(\d{8})\b/g)) {
      const code = m[1];
      if (!seen.has(code) && taxData[code]) {
        seen.add(code);
        out.push(code);
      }
    }
  }
  return out;
}

/**
 * Chạy 1 ca qua `classifyLoop` (`replay1211` — chỉ đo tầng tất định, không đo tầng xếp hạng LLM):
 * Stub `llmTier.callLLMJson` phát lại mã `ca.cong1211.maBot` và rút `alternatives` từ `_user` do `gather()` sinh
 * (tuyệt đối không đọc đáp án `ca.ma`).
 */
export async function chayClassifyLoopReplayMotCa(ca) {
  const origCall = llmTier.callLLMJson;
  const ma1211 = ca.cong1211?.maBot || null;
  const h4 = ma1211 ? ma1211.slice(0, 4) : '';
  const h6 = ma1211 ? ma1211.slice(0, 6) : '';
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
            notesChapters: ma1211 ? [h4.slice(0, 2)] : [],
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
          hs: '847989',
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
    const ungVienTuGather = ca.cong1211?.top3 && !ca.cong1211?.top1
      ? rutUngVienTuUserPack(_user, ma1211).slice(0, 2)
      : [];
    return {
      json: {
        decision: ca.cong1211?.top3 && !ca.cong1211?.top1 ? 'DE_XUAT' : 'CHOT',
        hs: ma1211,
        confidence: 80,
        reason: 'ảnh chụp 12/11',
        gir: 'GIR 1',
        basis: [],
        conditions: [],
        alternatives: ungVienTuGather.map((hs) => ({
          hs,
          whyNot: 'ứng viên đối lập rút từ gói gather (_user)',
        })),
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
export async function chayBoDo50Ca({ limit = 0, sttList = null, withSuggest = false, skipSearch = false } = {}) {
  const boDe = docBo50Ca();
  let cases = boDe.cases;
  if (Array.isArray(sttList) && sttList.length > 0) {
    const tap = new Set(sttList);
    cases = boDe.cases.filter((c) => tap.has(c.stt));
  } else if (limit > 0) {
    cases = boDe.cases.slice(0, limit);
  }

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
    replay1211: { tomTat: tongHopReplay1211(kqLoop), chiTiet: kqLoop },
    searchCandidates: skipSearch ? null : { tomTat: tongHopKetQua(kqSearch), chiTiet: kqSearch },
    searchPrecedents: { tomTat: tongHopKetQua(kqPrecedent), chiTiet: kqPrecedent },
    suggestCoreNoLlm: withSuggest ? { tomTat: tongHopKetQua(kqSuggest), chiTiet: kqSuggest } : null,
  };
}

/** In báo cáo kết quả ra stdout với nhãn cố định (tránh nhầm replay1211 với A1). */
export function inBaoCao50Ca(res) {
  const { boDe, soCa, replay1211, searchCandidates: sc, searchPrecedents: sp, suggestCoreNoLlm: sg } = res;
  const c1211 = boDe.chuanCong1211;
  const l = replay1211.tomTat;
  const p = sp.tomTat;
  const s = sc ? sc.tomTat : null;
  const g = sg ? sg.tomTat : null;

  console.log('\n=== HỒI QUY BỘ 50 CA PHÂN LOẠI HS TỪ VĂN BẢN PHÁP LUẬT (NO-LLM) ===');
  console.log(`Bộ đề        : tests/bo-50-ca-tb-tchq.json (${soCa}/${boDe.cases.length} ca, đánh số cố định stt 1..50)`);
  console.log(`Nguồn gốc    : ${boDe.nguonBoDe}`);
  console.log(`Báo cáo Cổng : ${boDe.nguonBaoCaoCong}`);
  console.log('Giới hạn     : Đường [replay1211] chỉ đo số ca sống sót qua tầng tất định khi phát lại ảnh chụp 12/11; KHÔNG đo tầng xếp hạng LLM và KHÔNG phải chỉ số A1.\n');

  console.log('Chỉ số hồi quy (8 số — nhãn cố định theo đường chạy):');
  console.log(`  [replay1211] classifyLoop (sống sót tầng tất định, không đo xếp hạng) : top1SoSongSot = ${l.top1SoSongSot}/${soCa} (${pct(l.top1SoSongSot, soCa)}%) | top3SoSongSot = ${l.top3SoSongSot}/${soCa} (${pct(l.top3SoSongSot, soCa)}%) | khongRaMa = ${l.khongRaMa}/${soCa} (${pct(l.khongRaMa, soCa)}%)`);
  if (s) {
    console.log(`  [searchCandidates] tìm kiếm từ khoá biểu thuế (no-LLM)                : top-1 đúng = ${s.top1}/${soCa} (${pct(s.top1, soCa)}%) | top-3 đúng = ${s.top3}/${soCa} (${pct(s.top3, soCa)}%) | không ra mã = ${s.khongRaMa}/${soCa} (${pct(s.khongRaMa, soCa)}%) [nhóm 4 số: top-1 ${s.top1Nhom4}/${soCa} = ${pct(s.top1Nhom4, soCa)}%, top-3 ${s.top3Nhom4}/${soCa} = ${pct(s.top3Nhom4, soCa)}%]`);
  } else {
    console.log('  [searchCandidates] tìm kiếm từ khoá biểu thuế (no-LLM)                : (bỏ qua — thiếu dữ liệu cho cổng --gate)');
  }
  console.log(`  [searchPrecedents] tra cứu tiền lệ TB-TCHQ (no-LLM)                   : top-1 đúng = ${p.top1}/${soCa} (${pct(p.top1, soCa)}%) | top-3 đúng = ${p.top3}/${soCa} (${pct(p.top3, soCa)}%) | không ra mã = ${p.khongRaMa}/${soCa} (${pct(p.khongRaMa, soCa)}%)`);
  if (g) {
    console.log(`  [suggestCoreNoLlm] /api/suggest khi tắt LLM                           : top-1 đúng = ${g.top1}/${soCa} (${pct(g.top1, soCa)}%) | top-3 đúng = ${g.top3}/${soCa} (${pct(g.top3, soCa)}%) | không ra mã = ${g.khongRaMa}/${soCa} (${pct(g.khongRaMa, soCa)}%)`);
  }
  console.log(`  [cong1211] chuẩn tham chiếu Cổng OZ 12/11 (có LLM sống — A1/A2)       : top-1 đúng = ${c1211.top1}/${c1211.tong} (${c1211.top1Pct.toFixed(1)}%) | top-3 đúng = ${c1211.top3}/${c1211.tong} (${c1211.top3Pct.toFixed(1)}%) | không ra mã = ${c1211.khongRaMa}/${c1211.tong} (${pct(c1211.khongRaMa, c1211.tong)}%)`);

  console.log('\nGiải thích khác biệt giữa các đường chạy (chuẩn hồi quy nội bộ vs Cổng OZ 12/11):');
  console.log('  - [replay1211] (top1SoSongSot = 33/50, top3SoSongSot = 42/50, khongRaMa = 7/50):');
  console.log('    đo số ca sống sót qua tầng tất định (`gather` → `gates` → `resolveHeading` → `chotDong8` → `kiemTruocChot`).');
  console.log('    top1SoSongSot và khongRaMa khớp từng ca với Cổng OZ 12/11; top3SoSongSot cao hơn 2 ca (#9 39073030, #14 42029190)');
  console.log('    vì `kiemTruocChot` trong `lib/engine-loop.js` đẩy mã TB-TCHQ vào `results[1]`, còn tầng render giọng Quyên của');
  console.log('    zalo-bot trên Cổng 12/11 chỉ hiển thị 1 mã đầu cho khách.');
  console.log('  - [searchCandidates] (2/50 top-1 = 4.0%, 3/50 top-3 = 6.0%, 0 không ra mã) và [suggestCoreNoLlm] (2/50 = 4.0%):');
  console.log('    chỉ khớp từ khoá/alias trực tiếp trên `data/tax.json` + `oz-gold` (không qua LLM vòng 1 rút tên hàng). Câu khách');
  console.log('    trong bộ 50 ca dài 100–400 ký tự kèm mệnh đề công dụng làm bộ lọc từ khoá biểu thuế trượt hoặc bị `oz-gold` át điểm.');
  console.log('  - [searchPrecedents] (50/50 top-1 = 100.0%): bộ 50 ca được trích từ TB-TCHQ trong `data/precedents.json` nên');
  console.log('    tầng đối chiếu tiền lệ TB-TCHQ khớp đúng 50/50 ca.');
}

/**
 * Kiểm cổng CI (`--gate`):
 *   - Ép chặt `tong === 50` trên MỌI đường (`replay1211`, `searchPrecedents`, `searchCandidates`).
 *   - Không có nhánh im lặng `if (s)`: thiếu đường nào hoặc chạy thiếu/thừa ca là đỏ ngay.
 */
export function kiemCong50Ca(res) {
  const chuan = res?.boDe?.chuanNoiBoNoLlm;
  const l = res?.replay1211?.tomTat;
  const p = res?.searchPrecedents?.tomTat;
  const s = res?.searchCandidates?.tomTat;

  const du50Ca = res?.soCa === 50 && l?.tong === 50 && p?.tong === 50 && s?.tong === 50;

  return [
    {
      name: 'bộ đề chạy đủ đúng 50 ca trên mọi đường (tong === 50, không skipSearch/limit)',
      ok: du50Ca,
      actual: `soCa=${res?.soCa ?? 0}, replay1211=${l?.tong ?? 0}, searchPrecedents=${p?.tong ?? 0}, searchCandidates=${s?.tong ?? 'thiếu'}`,
    },
    {
      name: `replay1211.top1SoSongSot ≥ ${chuan.replay1211.top1SoSongSot}/50`,
      ok: l?.tong === 50 && l.top1SoSongSot >= chuan.replay1211.top1SoSongSot,
      actual: l ? `${l.top1SoSongSot}/${l.tong}` : 'thiếu replay1211',
    },
    {
      name: `replay1211.top3SoSongSot ≥ ${chuan.replay1211.top3SoSongSot}/50`,
      ok: l?.tong === 50 && l.top3SoSongSot >= chuan.replay1211.top3SoSongSot,
      actual: l ? `${l.top3SoSongSot}/${l.tong}` : 'thiếu replay1211',
    },
    {
      name: `replay1211.khongRaMa ≤ ${chuan.replay1211.khongRaMa}/50`,
      ok: l?.tong === 50 && l.khongRaMa <= chuan.replay1211.khongRaMa,
      actual: l ? `${l.khongRaMa}/${l.tong}` : 'thiếu replay1211',
    },
    {
      name: `searchPrecedents (no-LLM TB-TCHQ) top-1 ≥ ${chuan.searchPrecedents.top1}/50`,
      ok: p?.tong === 50 && p.top1 >= chuan.searchPrecedents.top1,
      actual: p ? `${p.top1}/${p.tong}` : 'thiếu searchPrecedents',
    },
    {
      name: `searchCandidates (no-LLM) top-1 ≥ ${chuan.searchCandidates.top1}/50`,
      ok: Boolean(s) && s.tong === 50 && s.top1 >= chuan.searchCandidates.top1,
      actual: s ? `${s.top1}/${s.tong}` : 'thiếu searchCandidates',
    },
    {
      name: `searchCandidates (no-LLM) top-3 ≥ ${chuan.searchCandidates.top3}/50`,
      ok: Boolean(s) && s.tong === 50 && s.top3 >= chuan.searchCandidates.top3,
      actual: s ? `${s.top3}/${s.tong}` : 'thiếu searchCandidates',
    },
    {
      name: `searchCandidates (no-LLM) nhóm 4 số top-1 ≥ ${chuan.searchCandidates.top1Nhom4}/50`,
      ok: Boolean(s) && s.tong === 50 && s.top1Nhom4 >= chuan.searchCandidates.top1Nhom4,
      actual: s ? `${s.top1Nhom4}/${s.tong}` : 'thiếu searchCandidates',
    },
  ];
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
