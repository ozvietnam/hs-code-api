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
const { notesCoverage, notesCoverageWarning } = require('./notes-coverage');
const { callLLMJson } = require('./llm-tier.js');
const { buildEcus } = require('./describe-ecus.js');
const { getNoteSummaryForHs } = require('./explanatory-notes-index.js');
const { resolveConflict } = require('./conflict-resolver.js');
const { missingChapterAttrs } = require('./attributes.js');
// Nguồn chân lý duy nhất cho trích dẫn GIR (rule bất biến #6).
const { determineGir } = require('./gir.js');
const { evidenceInSource } = require('./extract-specs.js');
const { annotateField } = require('./citation-guard.js');
const { prepareClassifyInput, matchTextOf, applyCodeGuards, classifyStatus } = require('./classify-guards.js');
const { declarationFields, missingStructured: missingStructuredFor } = require('./declaration-fields.js');
const { originAssessment } = require('./origin-hints.js');
const { resolveHeading, toResolverShape } = require('./decision-tables.js');
const { parseCommodityQuery } = require('./query-parse.js');

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
LUỒNG KIẾN THỨC — với mỗi result, ghi 'basis': các lập luận ĐÃ DÙNG để chốt mã, mỗi lập luận gắn đúng 'stream':
- "SAN_PHAM": đặc tính của chính món hàng (tên gọi, công dụng, chức năng, cấu tạo, chất liệu, thông số…) lấy từ
  HỒ SƠ / DỮ KIỆN ĐÃ XÁC MINH. 'evidence' = đoạn CHÉP NGUYÊN VĂN trong hồ sơ (giữ ngôn ngữ gốc, kể cả chữ Hán).
- "CHU_GIAI": chú giải chương/nhóm, GỒM/KHÔNG GỒM/LOẠI TRỪ/PHÂN BIỆT, tên dòng biểu thuế, quy tắc GIR.
  'ref' = nhóm/mã/quy tắc (vd "Nhóm 8536 — GỒM"); 'evidence' = đoạn chép từ phần NHÓM ỨNG VIÊN nếu có.
- "TIEN_LE": tiền lệ phân loại (TB-TCHQ, tờ khai) nếu có trong hồ sơ; 'ref' = số hiệu.
- "SUY_LUAN": hiểu biết chuyên môn / suy luận của bạn KHÔNG có trong hồ sơ hay chú giải — được dùng, nhưng phải
  gắn đúng nhãn này. Nếu mã phụ thuộc vào một đặc tính của hàng mà hồ sơ KHÔNG ghi (vd "có động cơ", "dùng điện"),
  đặc tính đó là SUY_LUAN và đồng thời ghi vào 'missing' để hỏi lại.
Trả DUY NHẤT JSON: {"results":[{"hs":"6/8 số","confidence":0-100,"reason":"ngắn gọn","gir":"quy tắc GIR thực sự dùng để chốt, không chắc thì null","basis":[{"stream":"SAN_PHAM|CHU_GIAI|TIEN_LE|SUY_LUAN","claim":"lập luận","evidence":"đoạn nguyên văn (nếu có)","ref":"nguồn (nếu có)"}]}],"missing":["điều cần xác minh"]}
Tối đa 3 results, xếp tự tin giảm dần.`;

function buildContext(attrs, headings) {
  const lines = [];
  lines.push('HỒ SƠ SẢN PHẨM:');
  // Nguyên văn trang bán (tên gốc) — nguồn căn cứ; tên tiếng Việt bên dưới có thể là bản dịch/diễn giải.
  if (attrs.nameZh && attrs.nameZh !== attrs.tenHang) lines.push(`- Tên gốc (nguyên văn trang bán): ${attrs.nameZh}`);
  lines.push(`- Tên: ${attrs.tenHang || ''}`);
  if (attrs.chatLieu) lines.push(`- Chất liệu: ${attrs.chatLieu}`);
  if (attrs.congDung) lines.push(`- Công dụng: ${attrs.congDung}`);
  if (attrs.chucNang) lines.push(`- Chức năng: ${attrs.chucNang}`);
  if (attrs.specs) lines.push(`- Thông số: ${attrs.specs}`);
  // Dữ kiện đã xác minh từ phiếu hồ sơ khai báo (mỗi dòng có bằng chứng trong trang/ảnh).
  const facts = Array.isArray(attrs.facts) ? attrs.facts.filter((f) => f && f.valueVi).slice(0, 20) : [];
  if (facts.length) {
    lines.push('\nDỮ KIỆN ĐÃ XÁC MINH (có bằng chứng trên trang/ảnh):');
    for (const f of facts) lines.push(`- ${f.labelVi || f.key}: ${f.valueVi}${f.evidence ? ` [nguyên văn: ${clip(String(f.evidence), 80)}]` : ''}`);
  }
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
  // MiniMax-M2.7 (nhà cung cấp chính từ 04/10/2026) "suy nghĩ" trong <think> và ĂN CHUNG
  //   maxTokens: hàng nhiều thông số nghĩ 2.5k-4.5k token, ~30-75s. Mức cũ 2500 token/38s
  //   (thời Vercel 60s) làm câu trả lời bị cắt (finish=length) → results rỗng → ERP ghi
  //   "chưa có gợi ý" (sự cố 05/10/2026). Nay chạy Docker, server cho 300s → GIR tối đa
  //   250s (CEO chốt 05/10) + query-understand/getCandidates ~30s = vẫn < 300s. Tốc độ
  //   ~60 token/s → 250s ≈ 15k token: để 16000 cho mã khó nghĩ lâu không bị cắt giữa chừng.
  const { json, provider } = await callLLMJson(SYS_GIR, ctx, {
    step: 'gir',
    tier: opts.tier,
    maxTokens: Number(process.env.GIR_MAX_TOKENS) || 16000,
    timeoutMs: opts.timeoutMs || Number(process.env.GIR_TIMEOUT_MS) || 250000,
  });
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

/** Chữ chú giải đã đưa cho AI (để kiểm lập luận luồng CHU_GIAI). */
function girNotesText(heads) {
  return (heads || []).map((h4) => {
    const n = headingNotes(h4);
    const codes = codesInHeading(h4, 60).map((c) => `${c.hs} ${c.vn}`).join('\n');
    return [h4, n.baoGom, n.khongBaoGom, n.loaiTru, n.phanBiet, n.tinhChat, n.nhom, codes].join('\n');
  }).join('\n');
}

/** Chữ GỐC làm nguồn căn cứ: những gì bên gọi gửi + dữ kiện phiếu (có bằng chứng). Không gồm câu AI tự hiểu. */
function groundingSourceOf(raw = {}) {
  const facts = Array.isArray(raw.facts) ? raw.facts : [];
  return [
    raw.tenHang, raw.name, raw.productName, raw.nameZh, raw.specs, raw.technicalSpec, raw.chatLieu, raw.material,
    raw.congDung, raw.purpose, raw.customerDescription, raw.chucNang,
    ...facts.flatMap((f) => [f?.valueVi, f?.evidence, f?.labelVi]),
  ].filter((x) => typeof x === 'string' && x.trim()).join('\n');
}

const STREAMS = new Set(['SAN_PHAM', 'CHU_GIAI', 'TIEN_LE', 'SUY_LUAN']);
const HAS_CJK = /[㐀-鿿]/;
const NOTE_LABEL = /^(?:nhóm\s*\d{4}\s*:?\s*)?(?:GỒM|KHÔNG GỒM|LOẠI TRỪ|PHÂN BIỆT(?:\s*\d{4})?|TÍNH CHẤT)\s*:\s*/i;
/**
 * Kiểm một đoạn evidence theo TỪNG mẩu trích: AI hay chép nhiều đoạn nối bằng ";" và kèm lời giải thích
 * tiếng Việt trong ngoặc. → 'ok' khi có ít nhất 1 mẩu khớp chữ gốc và KHÔNG có mẩu chữ Hán nào bị bịa
 * (mẩu tiếng Việt không khớp coi là lời giải thích, bỏ qua); 'bad' khi không mẩu nào khớp hoặc có mẩu
 * chữ Hán không có trong gốc (trích dẫn tự chế).
 */
// So "nguyên văn" bền với dấu câu/ký tự đặc biệt: NFC + thường + chỉ giữ chữ-số (bỏ / ( ) * - : …).
const squashAll = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
function verifyQuote(evidence, text) {
  // Trích dẫn dài chép đúng nguyên văn (Gemini hay chép cả câu) → so trực tiếp trước khi tách mẩu.
  const whole = squashAll(evidence);
  if (whole.length >= 8 && squashAll(text).includes(whole)) return 'ok';
  const frags = String(evidence || '')
    .replace(/[（(][^()（）]*[)）]/g, ' ')
    .split(/[;；\n]+|\s\/\s|\s[—–-]\s|\.{3,}|…/)
    .map((f) => f.replace(NOTE_LABEL, '').replace(/[“”"'…]/g, '').replace(/\//g, ' ').trim())
    .filter((f) => f.length >= 2);
  if (!frags.length) return 'bad';
  let hit = 0;
  const srcAll = squashAll(text);
  for (const f of frags) {
    if (evidenceInSource(f, text) || (squashAll(f).length >= 6 && srcAll.includes(squashAll(f)))) hit += 1;
    else if (HAS_CJK.test(f)) return 'bad';
  }
  return hit ? 'ok' : 'bad';
}
// Độ tin tính theo căn cứ (không để AI tự chấm hoàn toàn):
//  - AI ghi một đặc tính là "của sản phẩm" mà hồ sơ không có (đặc tính tự bịa)  → ≤ 60 + hỏi lại.
//  - Không có đặc tính sản phẩm nào kiểm được trong hồ sơ (chỉ dựa chú giải/suy luận) → ≤ 70.
const FABRICATED_CAP = 60;
const NO_PRODUCT_FACT_CAP = 70;

/**
 * groundResults(results, source, notesText) → { results, unsupportedClaims }
 * Phân luồng kiến thức của từng lập luận (CEO 06/10/2026: "nhận diện từng luồng kiến thức chuẩn — đâu là chú
 * giải, đâu là website / thực tế sản phẩm") và kiểm theo từng luồng:
 *  - SAN_PHAM: evidence phải có trong chữ GỐC (tên, thông số, dữ kiện phiếu) — không có = đặc tính tự bịa.
 *  - CHU_GIAI: evidence đối chiếu phần chú giải đã đưa cho AI (kiểm được / chưa kiểm được) — không phạt.
 *  - TIEN_LE / SUY_LUAN: ghi nhận, không phạt (suy luận chuyên môn là hợp lệ khi gắn đúng nhãn).
 * KHÔNG đổi thứ tự mã (bản 1 đổi thứ tự làm tụt độ chính xác 8 số).
 */
function groundResults(results, source, notesText = '') {
  const out = [];
  const unsupportedClaims = [];
  for (const [i, r] of (results || []).entries()) {
    const basis = (Array.isArray(r.basis) ? r.basis : [])
      .filter((b) => b && (b.claim || b.evidence))
      .slice(0, 10)
      .map((b) => {
        const stream = STREAMS.has(String(b.stream || '').toUpperCase()) ? String(b.stream).toUpperCase() : 'SUY_LUAN';
        const evidence = String(b.evidence || '').slice(0, 200);
        let verified = null;
        if (stream === 'SAN_PHAM') verified = !!evidence && verifyQuote(evidence, source) === 'ok';
        else if (stream === 'CHU_GIAI' && evidence) verified = verifyQuote(evidence, notesText) === 'ok';
        return { stream, claim: String(b.claim || '').slice(0, 160), evidence, ref: String(b.ref || '').slice(0, 80) || null, verified };
      });
    const fabricated = basis.filter((b) => b.stream === 'SAN_PHAM' && b.verified === false);
    const productFacts = basis.filter((b) => b.stream === 'SAN_PHAM' && b.verified === true);
    let cap = 100;
    if (fabricated.length) cap = FABRICATED_CAP;
    else if (!productFacts.length) cap = NO_PRODUCT_FACT_CAP;
    if (i === 0) for (const b of fabricated) if (b.claim) unsupportedClaims.push(b.claim);
    const streams = Object.fromEntries([...STREAMS].map((k) => [k, basis.filter((b) => b.stream === k).length]));
    out.push({
      ...r,
      basis,
      knowledgeStreams: streams,
      grounded: fabricated.length === 0 && productFacts.length > 0,
      ...((r.confidence || 0) > cap ? { confidence: cap, llmConfidence: r.confidence } : {}),
    });
  }
  return { results: out, unsupportedClaims: unsupportedClaims.slice(0, 4) };
}

// Tổng ngân sách 1 lần classify < 300s trần server.js (HS_REQUEST_TIMEOUT_MS): GIR nhận
// phần còn lại sau query-understand + getCandidates, tối đa GIR_TIMEOUT_MS (250s).
const CLASSIFY_BUDGET_MS = Number(process.env.CLASSIFY_BUDGET_MS) || 285000;

async function classifyPrimary(rawAttrs, opts = {}) {
  const startedAt = Date.now();
  // H0: tiêu đề Taobao (chữ Hán) → dữ kiện tiếng Việt trước khi tìm nhóm ứng viên.
  const prep = await prepareClassifyInput(rawAttrs, opts);
  const attrs = prep.attrs;
  const queryUnderstanding = prep.understood.applied
    ? { applied: true, searchTextVi: prep.understood.searchText, productFactsVi: prep.understood.facts }
    : { applied: false, reason: prep.understood.reason };
  const origin = originAssessment(prep.sourceText, { llmOrigin: prep.understood.facts?.noiSanXuat || null });
  const extra = { queryUnderstanding, originAssessment: origin };

  const { headings, precedentCodes, llmError } = await getCandidates(attrs, opts);
  if (!headings.length && llmError) {
    // AI lỗi tạm thời (429/quá giờ) → THỬ LẠI, không phải "không có ứng viên".
    return { ...classifyStatus({ headings: [], engineFailed: 'ENGINE_TIMEOUT' }), results: [], missing: ['Engine bận hoặc quá thời gian — bấm "Áp mã" lại'], candidates: { headings: [], precedentCodes }, llmError, ...extra };
  }
  if (!headings.length) {
    return { ...classifyStatus({ headings: [] }), results: [], missing: ['Không sinh được nhóm ứng viên'], candidates: { headings, precedentCodes }, ...extra };
  }
  let results, missing, provider;
  try {
    const girOpts = opts.timeoutMs ? opts : {
      ...opts,
      timeoutMs: Math.max(30000, Math.min(
        Number(process.env.GIR_TIMEOUT_MS) || 250000,
        CLASSIFY_BUDGET_MS - (Date.now() - startedAt),
      )),
    };
    ({ results, missing, provider } = await girConfirm(attrs, headings.map((h) => h.code4), girOpts));
  } catch {
    // girConfirm timeout/lỗi → trả MỀM (ứng viên nhóm + cờ), KHÔNG để function chết/500/treo.
    const heads = headings.map((h) => h.code4);
    return {
      ...classifyStatus({ headings: heads, engineFailed: 'ENGINE_TIMEOUT' }),
      results: [],
      missing: ['Engine bận hoặc quá thời gian — bấm "Áp mã" lại'],
      candidates: { headings: heads, precedentCodes },
      engine: { tier: opts.tier === 'premium' ? 'premium' : 'standard', provider: 'timeout' },
      ...extra,
    };
  }
  // Chốt chặn đầu ra LLM: mã phải có thật trong biểu thuế và thuộc nhóm ứng
  // viên. Mã 8 số không tồn tại (VD "847130" đệm thành 84713000) hạ về 6 số
  // nếu phân nhóm đó có thật — không để mã bịa chảy sang buildEcus/describe.
  const guard = validateClassifyResults(results, headings.map((h) => h.code4));
  results = guard.results;
  if (!results.length) {
    return {
      ...classifyStatus({ headings: headings.map((h) => h.code4), engineFailed: 'LLM_REJECTED' }),
      ...extra,
      results: [],
      missing: [...new Set([...(missing || []), 'AI trả mã không có trong biểu thuế/nhóm ứng viên — cần người có chuyên môn chọn trong nhóm ứng viên'])],
      candidates: { headings: headings.map((h) => h.code4), precedentCodes },
      llmRejectedCodes: guard.rejected,
      engine: { tier: opts.tier === 'premium' ? 'premium' : 'standard', provider },
    };
  }
  // LUỒNG KIẾN THỨC (06/10/2026 — thiết kế vĩ mô, áp mọi mặt hàng): mỗi lập luận chọn mã gắn nguồn
  // (sản phẩm / chú giải / tiền lệ / suy luận); đặc tính "của sản phẩm" phải có nguyên văn trong chữ GỐC.
  const grounding = groundResults(results, groundingSourceOf(rawAttrs), girNotesText(headings.map((h) => h.code4).slice(0, 4)));
  results = grounding.results;
  if (grounding.unsupportedClaims.length) {
    missing = [...new Set([...(missing || []), ...grounding.unsupportedClaims.map((c) => `Cần xác nhận (hồ sơ chưa ghi): ${c}`)])];
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
  // H3: có danh mục trường theo nhóm 4 số thì dùng nó (SSD không bị đòi điện áp/công suất);
  // chỉ khi nhóm chưa có danh mục mới rơi về mẫu chung của chương.
  const headingSpec = top?.hs ? declarationFields(top.hs) : null;
  if (top?.hs && lowConf && headingSpec) {
    const extraMissing = missingStructuredFor(top.hs, attrs).map((m) => `[Nhóm ${m.heading}] Cần thêm: ${m.labelVi}`);
    if (extraMissing.length) missing = [...new Set([...missing, ...extraMissing])];
  } else if (top?.hs && lowConf) {
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

  // B3.6: bảng quyết định theo NHÓM 4 số (data/decision-tables, cùng nguồn /api/suggest) — CHỈ bảng
  // CEO đã duyệt (verified). Vì sao (06/10/2026): biểu thuế thiếu tầng 3 gạch và bước AI chọn dòng dao
  // động mạnh — cùng một ổ cắm âm tường, các lần gọi ra 8536.50.59 / 853669 / 8536.61.11 / 8536.69.32.
  // Bảng đã duyệt chốt TẤT ĐỊNH dòng 8 số TRONG nhóm 4 số AI đã chọn. KHÔNG cho đổi nhóm: bảng mặc
  // định hàng đã thuộc nhóm của nó (thử: dây nguồn có phích, đèn LED có phích, sạc USB đều bị bảng 8536
  // xếp 8536.69.92) — chọn NHÓM vẫn là việc của bước GIR. Mã AI cũ giữ làm gợi ý phụ.
  let tableOverride = null;
  if (resolver.status !== 'RESOLVED' && results[0]?.hs && opts.decisionTables !== false) {
    const cur = results[0];
    const text = [attrs.tenHang, attrs.nameZh, attrs.chatLieu, attrs.congDung, typeof attrs.specs === 'string' ? attrs.specs : ''].filter(Boolean).join(' ');
    const parsed = (() => { try { return parseCommodityQuery(text); } catch { return null; } })();
    let dec = null;
    try { dec = resolveHeading(cur.hs.slice(0, 4), { text, parsed }); } catch { dec = null; }
    if (!(dec?.status === 'RESOLVED' && dec.tableVerified && dec.hs && tax()[dec.hs] && dec.hs.slice(0, 4) === cur.hs.slice(0, 4))) dec = null;
    if (dec && dec.hs !== cur.hs) {
      const shaped = toResolverShape(dec);
      resolver = { ...shaped, overrodeLlm: true };
      tableOverride = { from: cur.hs, to: dec.hs };
      const g = tbTchqGate(dec.hs);
      results[0] = {
        ...cur,
        hs: dec.hs,
        confidence: Math.max(cur.confidence || 0, 85),
        reason: dec.reasonVi || cur.reason,
        resolverOverride: { from: cur.hs, ...(shaped.trace?.[0] || {}) },
        ...(g.hasPrecedent ? { tbTchq: g.entries } : {}),
      };
      // Mã AI cũ không xoá — đẩy xuống làm gợi ý phụ (nếu chưa có).
      if (!results.some((r, k) => k > 0 && r.hs === cur.hs)) results.splice(1, 0, { ...cur, confidence: Math.min(cur.confidence || 0, 50) });
      results = results.slice(0, 3);
    }
  }

  // H0: kiểm mã đầu — mâu thuẫn có/không (cứng) + kiểm cấp 8 số (tư vấn). Bỏ qua khi bảng
  // quyết định đã kiểm chứng chốt mã.
  const guards = applyCodeGuards(results, matchTextOf(attrs), { tax: tax(), skip: resolver.status === 'RESOLVED' });
  results = guards.results;
  for (const r of results) {
    r.hsLevel = r.hs.length;
    if (!r.tbTchq) { const g = tbTchqGate(r.hs); if (g.hasPrecedent) r.tbTchq = g.entries; }
  }

  // Refresh top after resolver/guards may have overridden results[0]
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

  const finalMissing = lowConf && !missing.length
    ? [headingSpec
      ? `Chưa đủ dữ kiện chốt 8 số — bổ sung đặc tính phân biệt các dòng của nhóm ${headingSpec.heading} (${headingSpec.titleVi || 'xem /api/declaration-fields'}) rồi áp lại`
      : 'Chưa đủ dữ kiện chốt 8 số — bổ sung đặc tính (công suất/vật liệu/model/kích thước...) rồi áp lại']
    : missing;
  // Trường bắt buộc còn thiếu theo mã đầu (khai ECUS), có câu hỏi tiếng Việt + tiếng Trung.
  const missingStructured = topResolved?.hs ? missingStructuredFor(topResolved.hs, attrs) : [];
  const warnings = [
    ...(guards.polarity ? [{
      id: 'feature-polarity-conflict',
      description: guards.polarity.reasonVi + (guards.polarity.promotedHs ? ` Đã đưa ${guards.polarity.promotedHs} lên đầu, mã mâu thuẫn xuống cuối.` : ''),
    }] : []),
    ...(topResolved?.hs && notesCoverageWarning(topResolved.hs) ? [notesCoverageWarning(topResolved.hs)] : []),
    ...(guards.subheading ? [{
      id: guards.subheading.autoSwapped ? 'subheading-self-contradiction' : 'subheading-unsupported',
      description: guards.subheading.reasonVi + (guards.subheading.autoSwapped ? ' Lý do AI tự viết phủ định dòng này nên đã đưa dòng anh em lên đầu.' : ''),
    }] : []),
  ];

  return {
    ...classifyStatus({
      results: cleanResults,
      headings: headings.map((h) => h.code4),
      featureConflict: guards.polarity,
      resolverResolved: resolver.status === 'RESOLVED',
      missingStructured,
      missing: finalMissing,
    }),
    results: cleanResults,
    ...extra,
    missingStructured,
    antiPatternWarnings: warnings,
    girRulesApplied: girVerdict.determinations,
    girDisclaimer: girVerdict.disclaimer,
    ecus, // mô tả ECUS chuẩn TT39 cho mã top + compliance + field thiếu
    explanatoryNote,   // giải trình mã top từ explanatory-notes.json (null nếu không có)
    notesCoverage: topResolved?.hs ? notesCoverage(topResolved.hs) : null, // chú giải của mã top đủ hay thiếu
    confusionWarning,  // cảnh báo nhầm từ conflicts.json (null nếu không có rủi ro)
    resolver: resolverOut, // kết quả bảng quyết định deterministic (B3.5); nhãn GIR nằm ở girRulesApplied
    missing: finalMissing,
    candidates: { headings: headings.map((h) => h.code4), precedentCodes },
    engine: { tier: opts.tier === 'premium' ? 'premium' : 'standard', provider },
  };
}

// ── MỘT ENGINE (docs/backlog/07-mot-engine.md, 06/10/2026) ─────────────────────────────────
// Hai cửa tra mã bù cho nhau (đo sạch, 80 tờ khai giữ riêng + 33 món Taobao):
//  - classify (trên): hiểu tiêu đề tiếng Trung, chọn NHÓM 4 số tốt hơn (Taobao 89% vs 56%);
//  - suggest-core: tầng 6/8 số giàu tri thức đã xây (Loại khác, kiểm dòng 8 số, sửa của NV…),
//    đúng 8 số 37,5% vs 31,3%, nhanh gấp ~5 lần.
// Ghép: classify chọn nhóm; cùng nhóm 4 số thì lấy dòng 8 số của suggest; classify không ra mã
// (quá giờ / AI trả mã bịa) thì dùng suggest thay vì trả RỖNG (ERP 14 ngày: 9/53 món rỗng).
// Hai cửa khác mã 8 số → review.needed + "Phân vân 2 mã" (mô phỏng: sai mà không cờ 3/80).
const CROSSCHECK_FALLBACK_CAP = 60;

function suggestTopList(json) {
  return (json?.suggestions || [])
    .map((s) => ({ hs: String(s.hsCode || '').replace(/\D/g, ''), confidence: Number(s.confidence) || null, reason: String(s.reasoning || s.reason || '').slice(0, 400) }))
    .filter((s) => s.hs.length >= 6)
    .slice(0, 3);
}

/** Ghép ý kiến cửa thứ hai (suggest-core) vào kết quả classify. Hàm thuần — test được không cần AI. */
function mergeSecondOpinion(primary, secondJson, productText = '') {
  const second = suggestTopList(secondJson);
  if (!second.length) return { ...primary, crossCheck: { available: false } };
  const pResults = primary.results || [];
  const pTop = pResults[0]?.hs || null;
  const sTop = second[0].hs;

  if (!pTop) {
    // Bước chính lỗi TẠM THỜI (AI bận/quá giờ) mà cửa đối chiếu cũng không qua được AI (chỉ xếp theo
    // tìm kiếm) → giữ "thử lại" để bên gọi tra lại sau, không chốt một mã chưa ai suy luận.
    if (primary.nextAction?.type === 'RETRY' && secondJson?.degraded) {
      return { ...primary, crossCheck: { available: true, primaryEmpty: true, secondDegraded: true, suggestTop: sTop } };
    }
    const results = second.map((s) => ({
      hs: s.hs, hsLevel: s.hs.length, reason: s.reason, source: 'suggest',
      confidence: Math.min(s.confidence ?? CROSSCHECK_FALLBACK_CAP, CROSSCHECK_FALLBACK_CAP),
    }));
    return {
      ...primary,
      status: 'REVIEW',
      nextAction: { type: 'HUMAN_REVIEW', reasonCode: 'PRIMARY_EMPTY', reasonVi: 'Bước chọn mã chính không ra kết quả (AI quá giờ hoặc trả mã không hợp lệ) — đây là kết quả của cửa đối chiếu, cần chuyên viên xem lại.', optionsHs: results.map((r) => r.hs) },
      results,
      crossCheck: { available: true, primaryEmpty: true, suggestTop: sTop, suggestTop3: second.map((s) => s.hs) },
      review: { needed: true, reasons: ['Bước chọn mã chính không ra kết quả — dùng kết quả cửa đối chiếu, cần chuyên viên xem lại'] },
    };
  }

  let results = pResults;
  let subheadingFrom = null;
  // Chỉ đổi dòng 8 số khi bước chính KHÔNG có căn cứ mạnh hơn: bảng quyết định (B3.5/B3.6), bộ
  // kiểm mâu thuẫn có/không, AI tự phủ định dòng nó chọn, hay mã mới 6 số đang chờ hỏi thêm dữ kiện.
  // Mã của cửa đối chiếu mâu thuẫn với dữ kiện hàng ("trừ plastic" mà hàng bằng nhựa; "không có ga" mà
  // hàng có ga) hoặc với chính lý do nó ghi → không được lên đầu (ca móc khoá súng in 3D PLA 06/10/2026).
  const { checkPolarity } = require('./subheading-check');
  const secondConflict = [productText, second[0].reason].map((t) => (t ? checkPolarity(sTop, t) : { ok: true })).find((c) => !c.ok) || null;
  const primaryLocked = Boolean(
    secondConflict ||
    pResults[0]?.resolverOverride || primary.status === 'RESOLVED_BY_TABLE' || primary.status === 'NEED_FACTS'
    || (primary.antiPatternWarnings || []).length || pTop.length < 8,
  );
  // Cửa đối chiếu chỉ được ĐỔI mã khi chính nó đủ tự tin (≥60 và không kém bước chính quá 10 điểm).
  // Ca tinh dầu khuếch tán 06/10/2026: đẩy 8509.80.10 (máy đánh bóng sàn) với độ tin 35 lên đầu.
  // Mô phỏng D-4: điều kiện này không làm giảm đúng 8 số. Cờ phân vân vẫn bật mọi lúc hai cửa khác nhau
  // (chỉ bật khi tự tin thì "sai mà không cờ" tăng 3 → 16/80).
  const sConf = Number(second[0].confidence) || 0;
  const pConf = Number(pResults[0]?.confidence) || 0;
  const secondStrong = sConf >= 60 && sConf >= pConf - 10;
  if (!primaryLocked && secondStrong && sTop !== pTop && sTop.slice(0, 4) === pTop.slice(0, 4) && sTop.length === 8) {
    // Cùng nhóm, khác dòng: tầng 6/8 số của suggest có tri thức Loại khác / kiểm dòng / sửa của NV.
    const existing = pResults.find((r) => r.hs === sTop);
    const promoted = existing
      ? { ...existing, source: existing.source || 'classify' }
      : { hs: sTop, hsLevel: 8, reason: second[0].reason, source: 'suggest', confidence: Math.min(second[0].confidence ?? pResults[0].confidence ?? 0, pResults[0].confidence ?? 100) };
    results = [promoted, ...pResults.filter((r) => r.hs !== sTop)].slice(0, 3);
    subheadingFrom = 'suggest';
  }
  const top = results[0].hs;
  const agree8 = top === sTop && pTop === sTop;
  const crossCheck = {
    available: true, classifyTop: pTop, suggestTop: sTop, suggestTop3: second.map((s) => s.hs),
    agree4: pTop.slice(0, 4) === sTop.slice(0, 4), agree8, subheadingFrom,
    ...(secondConflict ? { suggestConflict: secondConflict.reasonVi } : {}),
  };
  if (agree8) return { ...primary, results, crossCheck, review: { needed: false, reasons: [] } };
  const alt = pTop === top ? sTop : pTop;
  const sNote = sConf ? ` (cửa đối chiếu tự tin ${sConf}%)` : ' (cửa đối chiếu không nêu độ tin)';
  const reason = secondConflict
    ? `Phân vân 2 mã: ${top} / ${alt} — mã ${sTop} của cửa đối chiếu mâu thuẫn với dữ kiện hàng (${secondConflict.conflicts.map((c) => `${c.labelSays} ${c.feature}`).join(', ')}), chuyên viên kiểm`
    : crossCheck.agree4
    ? `Phân vân 2 mã cùng nhóm ${top.slice(0, 4)}: ${top} / ${alt}${sNote} — chuyên viên chọn dòng 8 số`
    : `Phân vân 2 mã khác nhóm: ${top} / ${alt}${sNote} — chuyên viên xác định nhóm hàng`;
  if (!results.some((r) => r.hs === alt)) {
    const s = second.find((x) => x.hs === alt);
    results = [...results.slice(0, 2), { hs: alt, hsLevel: alt.length, reason: s?.reason || '', source: s ? 'suggest' : 'classify', confidence: s?.confidence ?? null }];
  }
  return {
    ...primary,
    results,
    crossCheck,
    review: { needed: true, reasons: [reason] },
  };
}

/**
 * classify(rawAttrs, opts) — cửa ERP. Chạy song song bước chọn mã chính (classifyPrimary) và cửa
 * đối chiếu suggest-core, rồi ghép (mergeSecondOpinion). opts.crossCheck=false / HS_CLASSIFY_CROSSCHECK=0
 * để tắt (test, đo riêng).
 */
async function classify(rawAttrs, opts = {}) {
  // Động cơ hai vòng + chốt chặn (CEO 06/10/2026) — lib/engine-loop.js. Bật: HS_CLASSIFY_ENGINE=loop / opts.engine.
  if ((opts.engine || process.env.HS_CLASSIFY_ENGINE) === 'loop') return require('./engine-loop.js').classifyLoop(rawAttrs, opts);
  const off = opts.crossCheck === false || process.env.HS_CLASSIFY_CROSSCHECK === '0';
  if (off) return classifyPrimary(rawAttrs, opts);
  const crossText = [rawAttrs.nameZh || rawAttrs.tenHang, rawAttrs.specs].filter(Boolean).join(' | ').slice(0, 2000);
  const { suggestCore } = require('./suggest-core');
  const secondP = suggestCore({ description: crossText })
    .then((o) => (o && o.code === 200 ? o.json : null))
    .catch(() => null);
  const primary = await classifyPrimary(rawAttrs, opts);
  const secondJson = await secondP;
  const facts = Array.isArray(rawAttrs.facts) ? rawAttrs.facts.map((f) => `${f?.labelVi || ''}: ${f?.valueVi || ''} ${f?.evidence || ''}`) : [];
  const understood = primary.queryUnderstanding?.productFactsVi || {};
  const productText = [rawAttrs.tenHang, rawAttrs.nameZh, rawAttrs.specs, rawAttrs.chatLieu, ...facts, understood.chatLieu, understood.banChat]
    .filter(Boolean).join('\n');
  return mergeSecondOpinion(primary, secondJson, productText);
}

module.exports = { classify, mergeSecondOpinion, verifyQuote, groundResults, groundingSourceOf, codesForPrompt, girConfirm, getCandidates, headingNotes, tbTchqGate, validateClassifyResults, conflictsDb, attributesDb, conflictTablesDb };
