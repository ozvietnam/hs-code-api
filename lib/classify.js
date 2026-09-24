// Pha 2 — Pipeline áp mã (M0→M1 stages→M6) theo skill hs-code-vn.
// classify(attrs) → { results:[{hs, confidence, reason, gir, tbTchq}], missing:[], candidates }
//
// Luồng: getCandidates (Pha 1, LLM headings + precedent)
//   → GIR-confirm: nạp mã 8-số + chú giải nhóm + LOẠI TRỪ của các nhóm top
//      → LLM áp GIR + kiểm loại trừ + phản đề → top-3 mã 8-số + lý do + tự tin
//   → M6: tra TB-TCHQ (precedents.json) cho mã chốt → cờ tiền lệ
//   → cờ thiếu nếu tự tin < 80.

const fs = require('fs');
const path = require('path');
const { getCandidates } = require('./retrieve-candidates.js');
const { callLLMJson } = require('./llm-tier.js');
const { buildEcus } = require('./describe-ecus.js');
const { getNoteSummaryForHs } = require('./explanatory-notes-index.js');
const { resolveConflict } = require('./conflict-resolver.js');
const { missingChapterAttrs } = require('./attributes.js');
// Nguồn chân lý duy nhất cho trích dẫn GIR (rule bất biến #6).
const { determineGir } = require('./gir.js');
const { annotateField } = require('./citation-guard.js');

const DATA = path.join(__dirname, '..', 'data');
let _tax, _chap, _tbtchq, _cgc, _cgh, _csr;
function tax() { return (_tax ||= JSON.parse(fs.readFileSync(path.join(DATA, 'tax.json'), 'utf8'))); }
function chapNotes() { return (_chap ||= JSON.parse(fs.readFileSync(path.join(DATA, 'notes.json'), 'utf8'))); }
function tbtchq() { try { return (_tbtchq ||= JSON.parse(fs.readFileSync(path.join(DATA, 'precedents.json'), 'utf8'))); } catch { return (_tbtchq = {}); } }
// B2: chapter-specific-rules — checklist dữ kiện bắt buộc theo chương
function chapterRules() { try { return (_csr ||= JSON.parse(fs.readFileSync(path.join(DATA, 'chapter-specific-rules.json'), 'utf8')).chapters || {}); } catch { return (_csr = {}); } }
// B3: conflicts index — cảnh báo nhầm mã
let _conflicts;
function conflictsDb() { try { return (_conflicts ||= JSON.parse(fs.readFileSync(path.join(DATA, 'conflicts.json'), 'utf8'))); } catch { return (_conflicts = {}); } }
let _attrReg, _conflictTables;
function attributesDb() {
  try {
    return (_attrReg ||= JSON.parse(fs.readFileSync(path.join(DATA, 'attributes.json'), 'utf8')).attributes || {});
  } catch { return (_attrReg = {}); }
}
function conflictTablesDb() {
  try {
    return (_conflictTables ||= JSON.parse(fs.readFileSync(path.join(DATA, 'conflict-tables.json'), 'utf8')));
  } catch { return (_conflictTables = { tables: {} }); }
}
// Chú giải HARVEST từ KG 9 tầng (full: 1.269 nhóm + 97 chương) — chương (toàn cảnh) + narrative
// nhóm + GỒM/KHÔNG GỒM/LOẠI TRỪ + tính chất + phân biệt + nguồn pháp lý.
function chuGiaiChuong() { try { return (_cgc ||= JSON.parse(fs.readFileSync(path.join(DATA, 'chu-giai-chuong.json'), 'utf8'))); } catch { return (_cgc = {}); } }
function chuGiaiHeading() { try { return (_cgh ||= JSON.parse(fs.readFileSync(path.join(DATA, 'chu-giai-heading.json'), 'utf8'))); } catch { return (_cgh = {}); } }

const nz = (s) => String(s || '').replace(/\D/g, '');
const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

// Mã 8-số dưới 1 nhóm 4-số + tên
function codesInHeading(h4, cap = 18) {
  const t = tax();
  return Object.keys(t).filter((k) => k.startsWith(h4)).slice(0, cap).map((k) => ({ hs: k, vn: t[k].vn }));
}

const PROMPT_STOP = new Set(['loai', 'khac', 'cac', 'hoac', 'bang', 'cua', 'cho', 'voi', 'khong', 'nhung', 'tren', 'duoi', 'dung', 'chi', 'tiet', 'phan', 'sen', 'the']);
function promptTokens(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !PROMPT_STOP.has(w));
}

/**
 * Mã 8 số của một nhóm để đưa vào prompt. Trước đây cắt cứng 10 mã đầu: 317
 * nhóm có >10 mã (chứa 68% biểu thuế) → mã đúng có thể KHÔNG BAO GIỜ được đưa
 * cho mô hình chọn. Nay: ≤ cap thì đưa hết; nhiều hơn thì giữ mã khớp mô tả
 * nhất + toàn bộ mã cùng phân nhóm 6 số với chúng (kể cả dòng "Loại khác").
 * @returns {{codes:{hs,vn}[], omitted:number}}
 */
function codesForPrompt(h4, queryText, cap = 45) {
  const all = codesInHeading(h4, Infinity);
  if (all.length <= cap) return { codes: all, omitted: 0 };
  const q = new Set(promptTokens(queryText));
  const scored = all
    .map((c, i) => ({ c, i, score: promptTokens(c.vn).filter((w) => q.has(w)).length }))
    .sort((a, b) => b.score - a.score || a.i - b.i);
  const keep = new Set();
  for (const { c, score } of scored) {
    if (keep.size >= cap) break;
    if (score === 0 && keep.size) break;
    for (const sib of all) {
      if (keep.size >= cap) break;
      if (sib.hs.slice(0, 6) === c.hs.slice(0, 6)) keep.add(sib.hs);
    }
  }
  for (const { c } of scored) { if (keep.size >= cap) break; keep.add(c.hs); }
  const codes = all.filter((c) => keep.has(c.hs));
  return { codes, omitted: all.length - codes.length };
}

// Chú giải ĐẦY ĐỦ cho 1 nhóm (harvest KG 9 tầng): chương (toàn cảnh) + narrative nhóm +
// GỒM / KHÔNG GỒM / LOẠI TRỪ + tính chất điển hình + phân biệt + nguồn pháp lý.
function headingNotes(h4) {
  const H = chuGiaiHeading()[h4] || {};
  const ch2 = h4.slice(0, 2);
  const Cm = chuGiaiChuong();
  const C = Cm[ch2] || Cm[String(parseInt(ch2, 10))] || {};
  return {
    chuong: C.chuong || '',          // CHÚ GIẢI CHƯƠNG — phạm vi tổng thể của chương
    nhom: H.nhom || '',              // narrative nhóm — logic phân nhóm theo bản chất
    baoGom: H.bao_gom || '',         // GỒM
    khongBaoGom: H.khong_bao_gom || '', // KHÔNG GỒM
    loaiTru: H.loai_tru || '',       // LOẠI TRỪ
    tinhChat: H.tinh_chat || '',     // tính chất điển hình (cấu tạo/nguyên lý/mục đích)
    phanBiet: H.phan_biet || '',     // phân biệt mã dễ nhầm
    nguon: H.nguon || '',            // nguồn pháp lý — để giải trình
  };
}

const SYS_GIR = `Bạn là chuyên gia áp mã HS Việt Nam — suy luận THÔNG MINH, NHANH như chuyên gia, KHÔNG đọc tụng chú giải.
QUY TRÌNH (suy luận từng bước, gọn):
1. BẢN CHẤT: hàng LÀM GÌ (chức năng) + cấu tạo/vật liệu chính + trạng thái?
2. KHOANH 6 SỐ NHANH bằng kiến thức: chương → nhóm 4 số → phân nhóm 6 số.
   (GỒM/KHÔNG GỒM/LOẠI TRỪ kèm theo CHỈ để loại nhanh nhóm sai — không đọc dài dòng.)
3. ỨNG VIÊN 8 SỐ: liệt kê 1-2 mã 8 số khả dĩ dưới mã 6 số đó.
4. XÁC MINH: nêu ĐÚNG điểm phân biệt giữa các ứng viên
   (vd "g/m²", "dệt kim hay dệt thoi", "có phải nồi cơm", "công suất", "thành phần %").
   - Hồ sơ hàng ĐÃ đủ để phân biệt → CHỐT 8 số (confidence cao).
   - THIẾU dữ kiện → trả mã 6 SỐ (confidence ≤70) + 'missing' ghi RÕ điều cần xác minh để lên 8 số.
KHÔNG bịa 8 số khi chưa đủ căn cứ. 'reason' NGẮN, nêu căn cứ rồi chốt — đủ để giải trình.
Trả DUY NHẤT JSON: {"results":[{"hs":"6/8 số","confidence":0-100,"reason":"ngắn gọn","gir":"quy tắc GIR thực sự dùng để chốt, không chắc thì null"}],"missing":["điều cần xác minh"]}
Tối đa 3 results, xếp tự tin giảm dần.`;

function buildContext(attrs, headings) {
  const lines = [];
  lines.push('HỒ SƠ SẢN PHẨM:');
  lines.push(`- Tên: ${attrs.tenHang || ''}`);
  if (attrs.chatLieu) lines.push(`- Chất liệu: ${attrs.chatLieu}`);
  if (attrs.congDung) lines.push(`- Công dụng: ${attrs.congDung}`);
  if (attrs.chucNang) lines.push(`- Chức năng: ${attrs.chucNang}`);
  if (attrs.specs) lines.push(`- Thông số: ${attrs.specs}`);
  // NHẸ: KHÔNG dump chương/narrative — để model TỰ SUY LUẬN từ kiến thức (như chuyên gia).
  // Chỉ kèm điểm chạm GỒM/KHÔNG GỒM/LOẠI TRỪ (gọn) để loại nhanh nhóm sai + mã 8 số để chốt.
  lines.push('\nNHÓM ỨNG VIÊN (suy luận nhanh; GỒM/KHÔNG GỒM/LOẠI TRỪ chỉ để loại nhóm sai):');
  for (const h4 of headings) {
    const n = headingNotes(h4);
    lines.push(`\n■ Nhóm ${h4}:`);
    if (n.baoGom) lines.push(`  GỒM: ${clip(n.baoGom, 220)}`);
    if (n.khongBaoGom) lines.push(`  KHÔNG GỒM: ${clip(n.khongBaoGom, 160)}`);
    if (n.loaiTru) lines.push(`  LOẠI TRỪ: ${clip(n.loaiTru, 130)}`);
    // B1: Thêm điểm phân biệt + tính chất — giúp model chốt đúng 8 số giữa ứng viên sát nhau
    if (n.phanBiet) lines.push(`  PHÂN BIỆT: ${clip(n.phanBiet, 200)}`);
    if (n.tinhChat) lines.push(`  TÍNH CHẤT: ${clip(n.tinhChat, 120)}`);
    const query = [attrs.tenHang, attrs.chatLieu, attrs.congDung, attrs.chucNang, attrs.specs].filter(Boolean).join(' ');
    const { codes, omitted } = codesForPrompt(h4, query);
    for (const c of codes) lines.push(`  - ${c.hs}: ${clip(c.vn, 60)}`);
    if (omitted) lines.push(`  (đã lược ${omitted} mã ít liên quan của nhóm ${h4} — không mã nào hợp thì trả mã 6 số)`);
  }
  return lines.join('\n');
}

async function girConfirm(attrs, headings, opts = {}) {
  // 4 nhóm ứng viên (context giờ NHẸ — model tự suy luận, không đọc dump).
  const ctx = buildContext(attrs, headings.slice(0, 4));
  // Context nhẹ + suy luận gọn → ~10-22s. timeout 38s cứu ca lạ (piano/bếp model nghĩ lâu) +
  //   graceful catch lo treo. getCandidates 15s + 38s = 53s < 60s Vercel.
  const { json, provider } = await callLLMJson(SYS_GIR, ctx, { tier: opts.tier, maxTokens: 2500, timeoutMs: opts.timeoutMs || 38000 });
  return { results: (json.results || []).slice(0, 3), missing: json.missing || [], provider };
}

/**
 * Lọc kết quả LLM của girConfirm.
 *   · 8 số: phải có trong tax.json; không có mà 6 số đầu có thật → hạ về 6 số.
 *   · 6 số: phải là tiền tố của ít nhất một mã trong biểu thuế.
 *   · Nhóm 4 số phải thuộc danh sách nhóm ứng viên đã đưa cho LLM.
 * Kẹp confidence 0..100, bỏ trùng.
 */
function validateClassifyResults(results, candidateHeadings) {
  const T = tax();
  const heads = new Set(candidateHeadings);
  const codes = Object.keys(T);
  const has6 = (h6) => codes.some((c) => c.startsWith(h6));
  const out = [];
  const rejected = [];
  const seen = new Set();
  for (const r of results || []) {
    if (!r || typeof r !== 'object') continue;
    const raw = String(r.hs ?? '');
    let hs = nz(raw).slice(0, 8);
    let downgradedFrom = null;
    if (hs.length === 8 && !T[hs]) {
      if (has6(hs.slice(0, 6))) { downgradedFrom = hs; hs = hs.slice(0, 6); }
      else { rejected.push({ hs: raw.slice(0, 20), reason: 'NOT_IN_TARIFF' }); continue; }
    } else if (hs.length === 6) {
      if (!has6(hs)) { rejected.push({ hs: raw.slice(0, 20), reason: 'NOT_IN_TARIFF' }); continue; }
    } else if (hs.length !== 8) {
      rejected.push({ hs: raw.slice(0, 20), reason: 'BAD_LENGTH' });
      continue;
    }
    if (!heads.has(hs.slice(0, 4))) { rejected.push({ hs, reason: 'NOT_IN_CANDIDATE_HEADINGS' }); continue; }
    if (seen.has(hs)) continue;
    seen.add(hs);
    const c = Number(r.confidence);
    out.push({
      ...annotateField(r, 'reason', ''),
      hs,
      confidence: Number.isFinite(c) ? Math.max(0, Math.min(100, Math.round(c))) : 0,
      ...(downgradedFrom ? { downgradedFrom, confidence: Math.min(Number.isFinite(c) ? c : 0, 70) } : {}),
    });
  }
  return { results: out, rejected };
}

// M6 — tra TB-TCHQ cho mã chốt
function tbTchqGate(hs) {
  const db = tbtchq(), code = nz(hs);
  const hit = db[code];
  return hit ? { hasPrecedent: true, entries: hit } : { hasPrecedent: false };
}

async function classify(attrs, opts = {}) {
  const { headings, precedentCodes } = await getCandidates(attrs, opts);
  if (!headings.length) return { results: [], missing: ['Không sinh được nhóm ứng viên'], candidates: { headings, precedentCodes } };
  let results, missing, provider;
  try {
    ({ results, missing, provider } = await girConfirm(attrs, headings.map((h) => h.code4), opts));
  } catch {
    // girConfirm timeout/lỗi → trả MỀM (ứng viên nhóm + cờ), KHÔNG để function chết/500/treo.
    return {
      results: [],
      missing: ['Engine bận hoặc quá thời gian — bấm "Áp mã" lại'],
      candidates: { headings: headings.map((h) => h.code4), precedentCodes },
      engine: { tier: opts.tier === 'premium' ? 'premium' : 'standard', provider: 'timeout' },
    };
  }
  // Chốt chặn đầu ra LLM: mã phải có thật trong biểu thuế và thuộc nhóm ứng
  // viên. Mã 8 số không tồn tại (VD "847130" đệm thành 84713000) hạ về 6 số
  // nếu phân nhóm đó có thật — không để mã bịa chảy sang buildEcus/describe.
  const guard = validateClassifyResults(results, headings.map((h) => h.code4));
  results = guard.results;
  if (!results.length) {
    return {
      results: [],
      missing: [...new Set([...(missing || []), 'AI trả mã không có trong biểu thuế/nhóm ứng viên — cần người có chuyên môn chọn trong nhóm ứng viên'])],
      candidates: { headings: headings.map((h) => h.code4), precedentCodes },
      llmRejectedCodes: guard.rejected,
      engine: { tier: opts.tier === 'premium' ? 'premium' : 'standard', provider },
    };
  }
  // M6 gate + chuẩn hoá mã (6 hoặc 8 số) + cờ tự tin thấp
  for (const r of results) {
    r.hsLevel = r.hs.length; // 8 = đủ; 6 = mới tới phân nhóm, cần thêm dữ kiện
    const g = tbTchqGate(r.hs);
    if (g.hasPrecedent) r.tbTchq = g.entries;
  }
  const top = results[0];
  const lowConf = top && (top.confidence < 80 || top.hs.length < 8);

  // B2: chapter-specific-rules — chỉ bổ sung missing[] khi chưa đủ tự tin (conf<80 hoặc <8 số)
  // chapterSpecificRequired dùng tên canonical EN; hồ sơ attrs là field VN free-text →
  // dùng registry data/attributes.json (lib/attributes.js) để map canonical + alias EN/VN +
  // dò detect trong free-text. missing[] chỉ chứa thuộc tính THẬT SỰ chưa cung cấp.
  if (top?.hs && lowConf) {
    const ch2 = nz(top.hs).slice(0, 2);
    const rule = chapterRules()[ch2];
    if (rule) {
      const extraMissing = missingChapterAttrs(rule.chapterSpecificRequired || [], attrs)
        .map((m) => `[Ch.${ch2}] Cần thêm: ${m.labelVi}`);
      if (extraMissing.length) missing = [...new Set([...missing, ...extraMissing])];
    }
  }

  // B3.5: conflict resolver deterministic — bảng quyết định cụm mã dễ nhầm
  let resolver = { status: 'SKIP' };
  if (top?.hs?.length === 8 && opts.resolver !== false) {
    resolver = resolveConflict(top, results, attrs, {
      conflictsDb: conflictsDb(),
      tablesDb: conflictTablesDb(),
      registry: attributesDb(),
    });
    if (resolver.status === 'RESOLVED' && resolver.overrodeLlm) {
      const idx = results.findIndex((r) => r.hs === top.hs);
      const overridden = {
        ...top,
        hs: resolver.decidedHs,
        reason: resolver.reasonVi,
        resolverOverride: { from: top.hs, ...(resolver.trace?.[0] || {}) },
      };
      const g = tbTchqGate(resolver.decidedHs);
      if (g.hasPrecedent) overridden.tbTchq = g.entries;
      if (idx >= 0) results[idx] = overridden;
      else results[0] = overridden;
    } else if (resolver.status === 'INSUFFICIENT' && resolver.ask?.length) {
      missing = [...new Set([...(missing || []), ...resolver.ask.map((a) => a.questionVi)])];
    }
  }

  // Refresh top after resolver may have overridden results[0]
  const topResolved = results[0];
  const ecus = topResolved && topResolved.hs.length === 8 ? buildEcus(topResolved.hs, attrs) : null;

  // B3: explanatory note + conflicts warning cho mã top
  let explanatoryNote = null;
  let confusionWarning = null;
  if (topResolved?.hs?.length === 8) {
    explanatoryNote = getNoteSummaryForHs(topResolved.hs);
    const conflict = conflictsDb()[topResolved.hs];
    if (conflict?.confusedWith?.length) {
      confusionWarning = {
        riskLevel: conflict.riskLevel,
        confusedWith: conflict.confusedWith,
        reasonsVi: conflict.reasonsVi || [],
      };
    }
  }

  // GIR: nhãn "gir" LLM tự khai KHÔNG được trả thẳng (rule #6) — đi qua
  // lib/gir.js để có basis/evidence; LLM tự khai thành LLM_ASSERTED.
  const girVerdict = determineGir({
    description: [attrs.tenHang, attrs.chatLieu, attrs.congDung].filter(Boolean).join(' '),
    candidates: results.map((r) => ({ hsCode: r.hs })),
    pickedHs: topResolved?.hs || null,
    resolver: resolver.status === 'RESOLVED' ? resolver : null,
    llmGir: resolver.status === 'RESOLVED' && resolver.overrodeLlm ? null : (topResolved?.gir || null),
  });
  const cleanResults = results.map(({ gir, ...r }) => r);
  const { gir: _resolverGir, ...resolverOut } = resolver;

  return {
    results: cleanResults,
    girRulesApplied: girVerdict.determinations,
    girDisclaimer: girVerdict.disclaimer,
    ecus, // mô tả ECUS chuẩn TT39 cho mã top + compliance + field thiếu
    explanatoryNote,   // giải trình mã top từ explanatory-notes.json (null nếu không có)
    confusionWarning,  // cảnh báo nhầm từ conflicts.json (null nếu không có rủi ro)
    resolver: resolverOut, // kết quả bảng quyết định deterministic (B3.5); nhãn GIR nằm ở girRulesApplied
    missing: lowConf && !missing.length ? ['Chưa đủ dữ kiện chốt 8 số — bổ sung đặc tính (công suất/vật liệu/model/kích thước...) rồi áp lại'] : missing,
    candidates: { headings: headings.map((h) => h.code4), precedentCodes },
    engine: { tier: opts.tier === 'premium' ? 'premium' : 'standard', provider },
  };
}

module.exports = { classify, codesForPrompt, girConfirm, getCandidates, headingNotes, tbTchqGate, validateClassifyResults, conflictsDb, attributesDb, conflictTablesDb };
