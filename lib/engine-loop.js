// ĐỘNG CƠ HAI VÒNG + CHỐT CHẶN (CEO chốt 06/10/2026):
//  - AI là bộ não phân loại: suy luận trước, kiểm chứng sau. Vòng 1: đọc hồ sơ hỗn độn (tiêu đề Trung, thông số,
//    chữ OCR) → hồ sơ bản chất 3 thứ tiếng + giả thuyết Chương→Nhóm→Phân nhóm theo GIR + LỆNH KIỂM CHỨNG.
//  - Máy chủ thực hiện lệnh kiểm chứng (tất định, song song): chú giải, dòng biểu thuế, tiền lệ Oz & TB-TCHQ,
//    bảng quyết định, cặp mã dễ nhầm, chính sách (biểu thuế + danh mục oz-wiki), made-in-china (hàng có model /
//    chương máy). AI được quyết TRA GÌ THÊM, không được quyết BỎ TRA GÌ (máy bổ sung lệnh bắt buộc).
//  - Vòng 2: AI quyết định trên toàn bộ dữ liệu đã gom → CHỐT một mã / ĐỀ XUẤT (tranh chấp GIR 3) / HỎI dữ kiện.
//  - CHỐT CHẶN (dữ liệu tĩnh, không AI): mã có trong biểu thuế; câu trích có thật; "trừ X"/"không có X";
//    bảng quyết định đã duyệt ghi đè; made-in-china ≥2 shop khác nhóm (hàng máy); nhóm chưa được kiểm chú giải.
//    Chặn → trả LÝ DO cho vòng 3; trần vòng 4; còn kẹt → hỏi đúng dữ kiện thiếu, không đoán.
//  - Sự thật chỉ có một: đầu ra là MỘT mã (OZ đề xuất, chuyên viên ký mới thành mã khai) hoặc MỘT bộ câu hỏi
//    về thuộc tính hàng. Bật bằng HS_CLASSIFY_ENGINE=loop (hoặc opts.engine='loop').
//  - SỔ TAY CHÚ GIẢI (backlog bước 8, lib/so-tay-gates.js) — HS_SO_TAY=gates|full, mặc định tắt:
//    gates = sau khi qua chốt chặn, máy NGHI theo sổ tay (loại trừ đích danh, ngưỡng số, bộ phận, dòng "Loại khác")
//    → MỘT lượt yêu cầu giải trình: AI đổi mã hoặc trả lời bằng câu trích hồ sơ gốc (lưu vào hồ sơ giải trình);
//    không giải trình được → cờ chuyên viên xem lại. full = gates + gói vòng 2 dùng sổ tay thay chú giải thô bị cắt.
const { callLLMJson } = require('./llm-tier.js');
const { taxData } = require('./data.js');
const { classifyStatus, matchTextOf } = require('./classify-guards.js');
const { checkPolarity, checkSubheading } = require('./subheading-check.js');
const { resolveHeading, toResolverShape } = require('./decision-tables.js');
const { parseCommodityQuery } = require('./query-parse.js');
const ozSearch = require('./oz-precedent-search.js'); // gọi qua module để test thay được
const { searchPrecedents } = require('./precedent-search.js');
const { buildEcus } = require('./describe-ecus.js');
const { getNoteSummaryForHs } = require('./explanatory-notes-index.js');
const { determineGir } = require('./gir.js');
const { missingStructured: missingStructuredFor } = require('./declaration-fields.js');
const { buildTaxLookup } = require('./tax-lookup.js');
const micMod = require('./mic-lookup.js'); // gọi qua module để test thay được micLookup
const { soTayBlock, soTayGates } = require('./so-tay-gates.js');

const BUDGET_MS = Number(process.env.CLASSIFY_BUDGET_MS) || 285000;
const MAX_ROUNDS = 4; // vòng 1 + vòng 2 + tối đa 2 lần sửa theo lý do bị chặn
// Ngân sách thời gian (MiniMax M2.7 "suy nghĩ" 30–120 s/lượt): vòng 1 ≤ 90 s, vòng 2 ≤ 150 s, vòng sửa chỉ khi còn ≥ 80 s.
const R1_TIMEOUT_MS = Number(process.env.LOOP_R1_TIMEOUT_MS) || 100000;
const R2_TIMEOUT_MS = Number(process.env.LOOP_R2_TIMEOUT_MS) || 160000;
const RETRY_MIN_LEFT_MS = 80000;
// Mẫu mặc định cho hai vòng: MiniMax-M3 (đo 07/10: M2.7 làm "bộ não" đoán sai nhóm và vượt giờ). LLM_STEP_* ghi đè.
const DEFAULT_LOOP_MODEL = process.env.LOOP_MODEL || 'MiniMax-M3';
const stepModel = (step) => (process.env[`LLM_STEP_${step.toUpperCase()}`] ? undefined : { model: DEFAULT_LOOP_MODEL });
// LOOP_PROVIDER=gemini (khoá trả phí, model theo LOOP_GEMINI_MODEL, mặc định gemini-3.5-flash) — để so mẫu nào
// hiệu quả hơn cho vai "bộ não" (CEO 07/10). Mặc định vẫn MiniMax.
const GEMINI_LOOP = process.env.LOOP_PROVIDER === 'gemini';
if (GEMINI_LOOP && !process.env.LOOP_GEMINI_MODEL) process.env.LOOP_GEMINI_MODEL = 'gemini-3.5-flash';
const providerOpts = (timeoutMs) => (GEMINI_LOOP ? { tier: 'premium', geminiTimeoutMs: timeoutMs, geminiModelEnv: 'LOOP_GEMINI_MODEL', minimax: undefined } : {});
const MACHINERY_CH = new Set(['84', '85', '90']);
const nz = (s) => String(s || '').replace(/\D/g, '');
const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n)}…` : t; };
const lazy = () => require('./classify.js'); // tránh vòng require (classify.js nạp file này)
// Đọc lúc gọi (không lúc nạp) để đổi được giữa các lượt đo/test.
function soTayMode() {
  const v = String(process.env.HS_SO_TAY || '').trim().toLowerCase();
  if (['full', '1', 'true', 'on'].includes(v)) return 'full';
  return v === 'gates' ? 'gates' : 'off';
}
const SO_TAY_LEGAL_CHARS = 1500; // vòng giải trình chỉ nhận đúng câu hỏi + đúng đoạn luật (≤ 1.500 ký tự)

/**
 * Mã HS nhà cung cấp tự khai trên trang sản phẩm (made-in-china, CEO 09/10/2026). Mã TQ 8–10 số: 6 số đầu theo HS
 * quốc tế, đuôi là của TQ → chỉ dùng hs6 + nhóm 4 số làm NGUỒN KIỂM CHỨNG, không bao giờ lấy nguyên mã làm mã VN.
 * Trả null khi không đủ 6 chữ số hoặc nhóm không có trong biểu thuế VN (rác).
 */
function normalizeSupplierHs(v) {
  if (!v) return null;
  const o = typeof v === 'object' ? v : { code: v };
  const code = String(o.code || '').replace(/\D/g, '').slice(0, 10);
  if (code.length < 6) return null;
  const heading4 = code.slice(0, 4);
  if (!Object.keys(taxData).some((k) => k.startsWith(heading4))) return null;
  return { code, hs6: code.slice(0, 6), heading4, source: String(o.source || '').slice(0, 40) || null, url: String(o.url || '').slice(0, 300) || null };
}

/** Đối chiếu mã chốt với mã NCC: cùng 6 số / cùng nhóm 4 số / khác nhóm. */
function supplierAgree(hs, sup) {
  if (!sup || !hs) return null;
  if (hs.slice(0, 6) === sup.hs6) return 'SAME6';
  if (hs.slice(0, 4) === sup.heading4) return 'SAME4';
  return 'DIFF';
}

/**
 * Gọi AI có lưới an toàn: MiniMax-M3 có lúc "suy nghĩ" > 16k token (đo 07/10: 46–56k ký tự <think>) → JSON bị cắt
 * hoặc quá giờ. Lần 2 gọi lại CÙNG mẫu với thinking tắt (2–10 s) — câu trả lời kém sâu hơn nhưng còn hơn trả rỗng;
 * ghi `fallback: true` để đo tỉ lệ.
 */
/** Lỗi thanh toán/khoá key Gemini (402 hết tiền nạp, 401/403) — thử lại vô ích, phải lùi mẫu ngay. */
function isGeminiBillingError(msg) {
  return /\b(402|401|403)\b|credits? (are|is) depleted|billing|API key not valid|PERMISSION_DENIED|API_KEY_INVALID/i.test(String(msg || ''));
}

async function callWithFallback(system, user, opts, log) {
  try {
    return await callLLMJson(system, user, opts);
  } catch (e) {
    const msg = String(e?.message || e);
    // Gemini: 503 quá tải / 429 tốc độ → thử lại 3 lần giãn dần (không có "tắt suy nghĩ" để lùi).
    if (GEMINI_LOOP) {
      // 09/10/2026: key hết tiền nạp (402 "prepayment credits are depleted") / key sai, bị khoá (401/403) →
      // thử lại vô ích, lùi NGAY về MiniMax để prod không trả FAILED; log để người nạp tiền biết.
      const billing = isGeminiBillingError(msg);
      if (!billing && !/\b(503|429)\b|high demand|overloaded|timeout/i.test(msg)) throw e;
      let last = e;
      for (const wait of billing ? [] : [5000, 15000, 30000]) {
        await new Promise((r) => setTimeout(r, wait));
        try { const r = await callLLMJson(system, user, opts); if (log) log.push({ step: opts.step, retry: wait, cause: msg.slice(0, 60) }); return r; } catch (e2) { last = e2; }
      }
      // Gemini vẫn lỗi → lùi về MiniMax (mẫu mặc định của vòng) để máy chủ không trả rỗng.
      if (process.env.MINIMAX_API_KEY) {
        if (billing) console.error('[engine-loop] Gemini lỗi thanh toán/khoá key → lùi MiniMax:', msg.slice(0, 160));
        if (log) log.push({ step: opts.step, fallback: 'minimax', cause: String(last?.message || last).slice(0, 80) });
        const { tier: _t, geminiTimeoutMs: _g, geminiModelEnv: _m, ...rest } = opts;
        return { ...(await callLLMJson(system, user, { ...rest, minimax: { model: DEFAULT_LOOP_MODEL } })), fallback: true };
      }
      throw last;
    }
    if (!/parseable JSON|aborted|timeout|length/i.test(msg)) throw e;
    const model = opts.minimax?.model || process.env[`LLM_STEP_${String(opts.step || '').toUpperCase()}`]?.split(':')[0] || DEFAULT_LOOP_MODEL;
    if (log) log.push({ step: opts.step, fallback: 'thinking-off', cause: msg.slice(0, 120) });
    const r = await callLLMJson(system, user, { ...opts, timeoutMs: Math.min(60000, opts.timeoutMs || 60000), minimax: { model, extraBody: { thinking: { type: 'disabled' } } } });
    return { ...r, fallback: true };
  }
}

// ───────────────────────── VÒNG 1 ─────────────────────────
const SYS_R1 = `VÒNG 1 — Bạn là chuyên gia phân loại hàng hoá hải quan (WCO/HS 2022, biểu thuế Việt Nam AHTN 2022).
Đầu vào là HỒ SƠ HỖN ĐỘN của một món hàng mua trên Taobao/1688: tiêu đề tiếng Trung lẫn từ quảng cáo, bảng thông số,
chữ đọc từ ảnh (OCR, có thể lẫn lộn), đôi khi có mô tả của khách. Việc của bạn:
1. SẮP XẾP LẠI hồ sơ bản chất, chuẩn hoá bằng BA thứ tiếng: tên hàng (nameVi theo cách người khai hải quan gọi, nameEn
   theo cách nhà sản xuất quốc tế gọi, nameZh = tên gốc đã bỏ từ quảng cáo), công dụng chính, cơ chế hoạt động
   (điện / cơ-tay / không áp dụng / chưa rõ), chất liệu chính, kích thước/quy cách, thông số quyết định, nhãn hiệu,
   model, dạng hàng (hoàn chỉnh / tháo rời / bộ phận / bộ hàng). Mỗi ô ghi 'evidence' = đoạn CHÉP NGUYÊN VĂN trong
   hồ sơ (giữ ngôn ngữ gốc); hồ sơ không nói thì để "" — KHÔNG bịa.
2. SUY LUẬN MÃ như chuyên gia: đi từ Chương (2 số) → Nhóm (4 số) → Phân nhóm (6 số) theo 6 quy tắc GIR, nêu lý do.
   1–3 giả thuyết, xếp theo độ tin. Hàng lưỡng dụng / dễ gọi sai tên: nêu cả giả thuyết đối lập.
3. RA LỆNH KIỂM CHỨNG cho máy chủ: từ khoá tiếng Việt để tra tiền lệ (2–4 cụm, cách gọi khác nhau của cùng món hàng),
   chương cần mở chú giải, mã 8 số cần xem dòng biểu thuế, 'micQuery' = tên tiếng Anh + model để tìm trang nhà sản
   xuất trên made-in-china (null nếu hàng không có model và không phải máy móc/điện/quang), 'unknowns' = điều hồ sơ
   chưa nói mà quyết định mã.
Trả DUY NHẤT JSON:
{"product":{"nameVi":"","nameEn":"","nameZh":"","purpose":"","mechanism":"điện|cơ-tay|không áp dụng|chưa rõ","material":"","dimensions":"","keySpecs":[{"k":"","v":"","evidence":""}],"brand":"","model":"","form":"hoàn chỉnh|tháo rời|bộ phận|bộ hàng|chưa rõ","evidence":{"purpose":"","mechanism":"","material":""}},
 "hypotheses":[{"chapter":"2 số","heading4":"4 số","subheading6":"6 số","why":"lý do theo GIR","confidence":0-100}],
 "verify":{"searchVi":[""],"notesChapters":[""],"codes8":[""],"micQuery":null,"unknowns":[""]}}`;

function round1Input(raw) {
  const L = [];
  if (raw.nameZh || raw.tenHang) L.push(`Tiêu đề gốc: ${raw.nameZh || raw.tenHang}`);
  if (raw.tenHang && raw.nameZh && raw.tenHang !== raw.nameZh) L.push(`Tên khác: ${raw.tenHang}`);
  if (raw.specs) L.push(`Thông số (trang bán):\n${clip(raw.specs, 1500)}`);
  for (const k of ['chatLieu', 'congDung', 'chucNang', 'customerDescription', 'model', 'brand']) if (raw[k]) L.push(`${k}: ${clip(raw[k], 300)}`);
  const facts = Array.isArray(raw.facts) ? raw.facts.filter((f) => f && f.valueVi).slice(0, 20) : [];
  if (facts.length) L.push(`Dữ kiện đã có bằng chứng (phiếu hồ sơ):\n${facts.map((f) => `- ${f.labelVi || f.key}: ${f.valueVi}${f.evidence ? ` [gốc: ${clip(f.evidence, 80)}]` : ''}`).join('\n')}`);
  const img = Array.isArray(raw.imageTexts) ? raw.imageTexts : [];
  if (img.length) L.push(`Chữ đọc từ ảnh chi tiết (OCR, có thể lộn xộn):\n${img.slice(0, 8).map((t, i) => `[ảnh ${i + 1}] ${clip(typeof t === 'string' ? t : t?.text, 500)}`).join('\n')}`);
  return L.join('\n\n');
}

// ───────────────────────── KIỂM CHỨNG (máy chủ) ─────────────────────────
function headingBlock(h4, queryText) {
  const { headingNotes, codesForPrompt } = lazy();
  const { codes, omitted } = codesForPrompt(h4, queryText, 22);
  // Sổ tay (bản tiêu hoá, có nguồn) thay đoạn chú giải thô bị cắt 300–450 ký tự — chỉ khi nhóm đã có sổ tay.
  const st = soTayMode() === 'full' ? soTayBlock(h4, { lines: codes.map((c) => c.hs) }) : null;
  if (st) {
    return [
      `■ NHÓM ${h4} [sổ tay chú giải — toàn văn HS 2022 + SEN 2022 đã tiêu hoá, mỗi ý ghi nguồn]`,
      st,
      `  Dòng biểu thuế (${codes.length}${omitted ? `, bỏ ${omitted} dòng không liên quan` : ''}):\n${codes.map((c) => `    ${c.hs} ${String(c.vn || '').trim()}`).join('\n')}`,
    ].join('\n');
  }
  const n = headingNotes(h4);
  return [
    `■ NHÓM ${h4} [chú giải nhóm — nguồn: ${clip(n.nguon, 60) || 'TT 31/2022'}]`,
    n.nhom && `  Phạm vi: ${clip(n.nhom, 350)}`,
    n.baoGom && `  GỒM: ${clip(n.baoGom, 450)}`,
    n.khongBaoGom && `  KHÔNG GỒM: ${clip(n.khongBaoGom, 300)}`,
    n.loaiTru && `  LOẠI TRỪ: ${clip(n.loaiTru, 300)}`,
    `  Dòng biểu thuế (${codes.length}${omitted ? `, bỏ ${omitted} dòng không liên quan` : ''}):\n${codes.map((c) => `    ${c.hs} ${String(c.vn || '').trim()}`).join('\n')}`,
  ].filter(Boolean).join('\n');
}

function policyLine(hs) {
  try {
    const t = buildTaxLookup(hs, { origin: 'CN' });
    if (!t?.found) return null;
    const p = t.policy || {};
    const items = (p.policyItems || []).filter((x) => x.level === 'BLOCKING' || x.level === 'NOTICE').slice(0, 3).map((x) => `${x.level}: ${clip(x.text || x.label || '', 110)}`);
    return `${hs}: ${t.nameVi ? clip(t.nameVi, 90) : ''}${items.length ? ` | ${items.join(' | ')}` : ' | không có yêu cầu quản lý bắt buộc ghi trong biểu thuế/danh mục'}`;
  } catch { return null; }
}

async function gather(r1, raw, { usedHeadings = new Set(), micAllowed = true } = {}) {
  const product = r1.product || {};
  const hyps = Array.isArray(r1.hypotheses) ? r1.hypotheses : [];
  const verify = r1.verify || {};
  const codes8 = [...new Set((verify.codes8 || []).map(nz).filter((c) => c.length === 8 && taxData[c]))].slice(0, 8);
  // Nhóm máy chủ đã bổ sung (chốt chặn "nhóm chưa kiểm", nhóm đích sổ tay) không được rơi khỏi trần 4 nhóm —
  // trước đây nhóm bổ sung đứng cuối và bị cắt khi giả thuyết đã đủ 4 nhóm.
  // Nhóm NCC khai (nếu có) luôn phải được xem chú giải + dòng biểu thuế như các nhóm khác — không bị cắt bởi trần 4.
  const supplier = normalizeSupplierHs(raw.supplierHs);
  const validH = (h) => h.length === 4 && Object.keys(taxData).some((k) => k.startsWith(h));
  const base = [...new Set([...hyps.map((h) => nz(h.heading4).slice(0, 4)), ...codes8.map((c) => c.slice(0, 4))].filter(validH))];
  const extra = [...usedHeadings].filter((h) => validH(h) && !base.slice(0, 4).includes(h));
  const headings = [...new Set([...base.slice(0, 4), ...extra])].slice(0, 4 + extra.length);
  if (supplier && !headings.includes(supplier.heading4)) headings.push(supplier.heading4);
  const queryText = [product.nameVi, product.purpose, product.material, raw.tenHang].filter(Boolean).join(' ');
  const searchVi = [...new Set([product.nameVi, ...(verify.searchVi || [])].filter((s) => s && s.length >= 3))].slice(0, 4);

  // Bắt buộc (AI không được bỏ): chú giải + dòng biểu thuế mọi nhóm nêu; tiền lệ theo mọi tên Việt; bảng quyết định.
  const notes = headings.map((h4) => headingBlock(h4, queryText));
  const oz = [];
  for (const q of searchVi) {
    try { for (const it of (await ozSearch.searchOzByKeyword(q, { limit: 5 })).items || []) oz.push({ q, hs: nz(it.hsCode), name: it.tenHang, oz: it.ozCount, cov: it.matchCoverage }); } catch { /* bỏ qua */ }
  }
  // Tìm theo từ khoá tiếng Việt nhiễu nặng ("dao hái cau" khớp "cầu dao"): chỉ đưa cho AI tiền lệ khớp ≥60% từ khoá.
  const ozLines = [...new Map(oz.map((o) => [o.hs + o.name, o])).values()].filter((o) => o.cov >= 60).sort((a, b) => (b.cov - a.cov) || (b.oz - a.oz)).slice(0, 8)
    .map((o) => `${o.hs} — "${clip(o.name, 90)}" (Oz đã khai ${o.oz} lần; khớp ${o.cov}%) [tờ khai Oz — tham khảo, không phải phán quyết]`);
  let tb = [];
  try { tb = searchPrecedents([product.nameVi, product.purpose, product.material].filter(Boolean).join(' '), { topK: 4 }); } catch { tb = []; }
  const tbLines = tb.map((x) => `${x.finalHsCode || x.precedent?.finalHsCode} — ${clip(x.precedent?.productName || x.productName || '', 120)} (${x.precedent?.tbTchqNumber || x.tbTchqNumber || 'TB-TCHQ'}; giống ${Math.round((x.similarity || 0) * 100)}%) [TB-TCHQ — tham khảo]`);
  const { tbTchqGate, conflictsDb } = lazy();
  const codePool = [...new Set([...codes8, ...oz.map((o) => o.hs).filter((c) => c.length === 8)])].slice(0, 10);
  const tbForCodes = codePool.flatMap((c) => { const g = tbTchqGate(c); return g.hasPrecedent ? g.entries.slice(0, 1).map((e) => `${c}: ${e.tbTchqNumber || ''} ${clip(e.productName, 100)} [TB-TCHQ]`) : []; });
  const conflicts = codePool.flatMap((c) => { const k = conflictsDb()[c]; return k ? [`${c} hay nhầm với ${(k.confusedWith || []).join(', ')}: ${clip((k.reasonsVi || [])[0], 160)} [cặp mã dễ nhầm]`] : []; });
  const tables = headings.flatMap((h4) => {
    try {
      const dec = resolveHeading(h4, { text: queryText, parsed: parseCommodityQuery(queryText) });
      if (dec?.status === 'NO_TABLE') return [];
      return [`Nhóm ${h4}: bảng quyết định ${dec.tableVerified ? 'ĐÃ DUYỆT' : 'chưa duyệt'} → ${dec.status}${dec.hs ? ` ${dec.hs}` : ''}${dec.ask?.length ? ` (cần: ${dec.ask.map((a) => a.questionVi).join('; ')})` : ''} [bảng quyết định]`];
    } catch { return []; }
  });
  const policies = codePool.slice(0, 6).map(policyLine).filter(Boolean);

  // made-in-china: hàng có model hoặc giả thuyết thuộc chương máy/điện/quang.
  let mic = null;
  const machinery = hyps.some((h) => MACHINERY_CH.has(nz(h.chapter).slice(0, 2) || nz(h.heading4).slice(0, 2)));
  if (micAllowed && (product.model || machinery) && (verify.micQuery || product.nameEn || product.model)) {
    // Model trước (đặc hiệu nhất, không phụ thuộc ngôn ngữ), rồi tên Anh + model, rồi tên Anh. Gộp trang của các
    // truy vấn (mỗi shop một trang) tới khi có ≥2 shop đồng thuận hoặc hết truy vấn.
    const nameEn = String(product.nameEn || verify.micQuery || '').replace(/\([^)]*\)/g, ' ').replace(/[^A-Za-z0-9 -]+/g, ' ').trim().split(/\s+/).slice(0, 5).join(' ');
    const model = String(product.model || '').trim();
    const queries = [...new Set([model && model.length >= 4 && model, model && nameEn && `${nameEn} ${model}`, nameEn].filter((q) => q && q.trim().length >= 4))].slice(0, 3);
    // Chương neo = giả thuyết vòng 1 + mã 8 số cần kiểm + mã NCC: trang made-in-china lạc Phần/Chương là câu tìm
    // ra món khác (10/10/2026: giày cưới → cần câu/sợi thuỷ tinh/rơ-moóc) → bỏ, không đưa AI và NV xem.
    const anchors = [...hyps.map((h) => nz(h.chapter).slice(0, 2) || nz(h.heading4).slice(0, 2)), ...codes8, ...(supplier ? [supplier.heading4] : [])];
    const seen = new Map();
    const kindOf = (q) => (model && q.includes(model) ? 'model' : 'name');
    for (const q of queries) {
      let one = null;
      try { one = await micMod.micLookup(q, { max: 4, timeoutMs: 10000 }); } catch { one = null; }
      for (const p of one?.pages || []) if (!p.error && !seen.has(p.shop || p.url)) seen.set(p.shop || p.url, { ...p, queryKind: kindOf(q) });
      const f = micMod.filterPagesByChapter([...seen.values()], anchors);
      mic = { query: queries.join(' | '), queryKind: f.pages.some((p) => p.queryKind === 'model') ? 'model' : kindOf(q), searched: true, pages: f.pages, droppedOffChapter: f.droppedOffChapter, droppedNoHs: f.droppedNoHs, consensus: micMod.consensusOf(f.pages), cached: one?.cached };
      if (mic.consensus.heading4) break;
    }
    if (mic && !mic.pages.length) mic = null; // toàn trang lạc → không có bảng nhà sản xuất
  }
  // NCC khai: ưu tiên hơn shop khác trên made-in-china (đúng trang của nhà cung cấp) nhưng vẫn chỉ là nguồn kiểm chứng.
  const supLines = supplier ? Object.keys(taxData).filter((k) => k.startsWith(supplier.hs6)).slice(0, 8).map((k) => `    ${k} ${String(taxData[k]?.vn || taxData[k]?.nameVi || '').trim()}`) : [];
  const supplierBlock = supplier ? [
    `NHÀ CUNG CẤP KHAI HS (trang sản phẩm của chính nhà cung cấp${supplier.source ? `, ${supplier.source}` : ''}): ${supplier.hs6} (nhóm ${supplier.heading4}) — mã gốc ${supplier.code}, 6 số đầu theo HS quốc tế, phần đuôi là mã TQ, KHÔNG dùng nguyên làm mã VN.`,
    '  Đây là MỘT nguồn kiểm chứng (nhà bán tự khai, có thể sai) — chọn khác NHÓM thì phải đối chiếu chú giải hai nhóm và nêu rõ lý do.',
    supLines.length ? `  Dòng biểu thuế VN tương ứng phân nhóm ${supplier.hs6}:\n${supLines.join('\n')}` : `  Biểu thuế VN không có dòng ${supplier.hs6} — xem nhóm ${supplier.heading4} ở mục CHÚ GIẢI.`,
  ].join('\n') : '';
  const micLines = mic?.pages?.filter((p) => !p.error).map((p) => `shop ${p.shop}: "${clip(p.name, 90)}" HS ghi: ${p.hsCode || '—'}${p.props?.material ? `; Material: ${p.props.material}` : ''}${p.props?.usage || p.props?.application ? `; Usage: ${clip(p.props.usage || p.props.application, 80)}` : ''}${p.props?.powerType ? `; Power: ${p.props.powerType}` : ''} [made-in-china — mã do shop TQ tự ghi, chỉ tham khảo]`) || [];

  const pack = [
    `HỒ SƠ GỐC (nguyên văn — CHỈ được trích câu từ đây):\n${round1Input(raw).slice(0, 2500)}`,
    `HỒ SƠ BẢN CHẤT (AI vòng 1 đọc ra — là diễn giải, KHÔNG phải nguyên văn; đặc tính nào không có câu gốc đi kèm thì coi là CHƯA RÕ):\n${JSON.stringify(product, null, 0).slice(0, 2200)}`,
    `GIẢ THUYẾT VÒNG 1: ${hyps.map((h) => `${h.heading4 || ''}/${h.subheading6 || ''} (${h.confidence ?? '?'}%) — ${clip(h.why, 160)}`).join(' | ')}`,
    `CHÚ GIẢI & DÒNG BIỂU THUẾ (nguồn pháp lý):\n${notes.join('\n\n')}`,
    tables.length ? `BẢNG QUYẾT ĐỊNH:\n${tables.join('\n')}` : '',
    ozLines.length ? `TIỀN LỆ OZ:\n${ozLines.join('\n')}` : 'TIỀN LỆ OZ: không có tờ khai tương tự.',
    (tbLines.length || tbForCodes.length) ? `TIỀN LỆ TB-TCHQ:\n${[...tbLines, ...tbForCodes].join('\n')}` : '',
    conflicts.length ? `CẶP MÃ DỄ NHẦM:\n${conflicts.join('\n')}` : '',
    policies.length ? `CHÍNH SÁCH THEO MÃ (biểu thuế + danh mục oz-wiki):\n${policies.join('\n')}` : '',
    supplierBlock,
    mic ? `NHÀ SẢN XUẤT / SHOP TRÊN MADE-IN-CHINA (truy vấn "${mic.query}")${mic.cached ? ' [cache]' : ''}:\n${micLines.length ? micLines.join('\n') : '  không tìm thấy trang phù hợp'}${mic.consensus?.heading4 ? `\n  → ${mic.consensus.shops} shop khác nhau cùng ghi nhóm ${mic.consensus.heading4}` : ''}` : '',
  ].filter(Boolean).join('\n\n');
  const poolCodes = [
    ...tb.map((x) => ({ hs: nz(x.finalHsCode || x.precedent?.finalHsCode), from: 'tb-tchq' })),
    ...codePool.flatMap((c) => (conflictsDb()[c]?.confusedWith || []).map((x) => ({ hs: nz(x), from: 'cap-ma-de-nham' }))),
    ...(supplier ? [{ hs: supplier.heading4, from: 'ncc-khai' }] : []),
  ].filter((x) => x.hs.length >= 4);
  return { pack, headings, codes8: codePool, mic, supplier, ozPrecedents: oz, tables, poolCodes };
}

// ───────────────────────── VÒNG 2 ─────────────────────────
const SYS_R2 = `VÒNG 2 — Bạn là người ra quyết định phân loại, làm việc trên HỒ SƠ VỤ VIỆC đã được máy chủ kiểm chứng (hồ sơ bản chất,
chú giải và dòng biểu thuế các nhóm liên quan, tiền lệ, bảng quyết định, cặp mã dễ nhầm, trang nhà sản xuất).
NGUYÊN TẮC: mỗi hàng hoá chỉ có MỘT mã HS đúng. Nhiều mã xuất hiện là vì cùng một hàng bị gọi tên/định nghĩa khác nhau.
Áp 6 quy tắc GIR theo thứ tự: GIR 1 (tên nhóm + chú giải Phần/Chương) → 2(a) hàng chưa hoàn chỉnh/tháo rời, 2(b) hỗn hợp
→ 3(a) mô tả cụ thể nhất, 3(b) đặc trưng cơ bản (bộ hàng), 3(c) nhóm sau cùng → 4 → 5 bao bì → 6 so phân nhóm CÙNG CẤP,
rồi dòng 8 số Việt Nam (đọc đủ các dòng anh em; dòng "Loại khác" chỉ khi hàng không thoả dòng cụ thể nào).
Ra MỘT trong ba quyết định:
- "CHOT": hồ sơ đủ dữ kiện, một mã 8 số duy nhất. Ghi 'conditions': các điều kiện phân định lấy từ CÂU CHỮ dòng biểu
  thuế/chú giải, mỗi điều kiện MET/UNMET/UNKNOWN kèm 'evidence' chép nguyên văn từ hồ sơ bản chất/hồ sơ gốc.
- "DE_XUAT": đã chọn được mã nhưng còn tranh luận thật (GIR 3, "chủ yếu dùng cho", đặc trưng cơ bản) → nêu mã đối lập
  trong 'alternatives' và vì sao không chọn; chuyên viên sẽ duyệt.
- "HOI": hồ sơ THIẾU dữ kiện quyết định → 'hs' là mã 6 số (hoặc 8 số tạm) và 'questions' hỏi về THUỘC TÍNH của hàng
  (không nhắc mã HS, không gợi ý câu trả lời có lợi về thuế), kèm 'whereToFind' (ảnh tem/nhãn, catalogue, hỏi người bán).
'basis': lập luận đã dùng, mỗi lập luận gắn 'stream': SAN_PHAM (đặc tính hàng — evidence nguyên văn hồ sơ), CHU_GIAI
(câu chữ chú giải/biểu thuế — ref nhóm), TIEN_LE (TB-TCHQ/tờ khai Oz), NHA_SAN_XUAT (trang made-in-china / mã HS nhà cung cấp tự khai —
chỉ là nguồn kiểm chứng, không phải đáp án; chọn khác NHÓM với nhà cung cấp thì phải nêu lý do), SUY_LUAN.
Nếu có mục "LẦN TRƯỚC BỊ CHẶN", phải xử lý đúng lý do bị chặn: đổi mã, hoặc giải thích bằng câu chữ luật vì sao giữ.
Trả DUY NHẤT JSON: {"decision":"CHOT|DE_XUAT|HOI","hs":"","confidence":0-100,"reason":"ngắn, đủ để giải trình","gir":"quy tắc GIR quyết định hoặc null",
"basis":[{"stream":"","claim":"","evidence":"","ref":""}],"conditions":[{"fact":"","status":"MET|UNMET|UNKNOWN","evidence":""}],
"alternatives":[{"hs":"","whyNot":""}],"questions":[{"fact":"","question":"","whereToFind":""}]}`;

// ───────────────────────── CHỐT CHẶN ─────────────────────────
function gates(r2, ctx) {
  const { source, productText, gathered, machinery, round } = ctx;
  const { verifyQuote } = lazy();
  const hs = nz(r2.hs);
  const blocks = []; const warnings = [];
  // G1 mã có trong biểu thuế
  if (hs.length === 8 && !taxData[hs]) blocks.push({ gate: 'MA_KHONG_TON_TAI', reasonVi: `Mã ${hs} không có trong biểu thuế hiện hành — chọn đúng dòng trong danh sách dòng biểu thuế đã cung cấp.` });
  else if (hs.length === 6 && !Object.keys(taxData).some((k) => k.startsWith(hs))) blocks.push({ gate: 'MA_KHONG_TON_TAI', reasonVi: `Phân nhóm ${hs} không có trong biểu thuế.` });
  else if (hs.length < 6) blocks.push({ gate: 'MA_KHONG_TON_TAI', reasonVi: 'Phải nêu ít nhất phân nhóm 6 số.' });
  if (blocks.length) return { blocks, warnings, basis: r2.basis || [] };
  // G2 câu trích đặc tính sản phẩm phải có thật trong hồ sơ GỐC (không phải chữ AI vòng 1)
  const basis = (Array.isArray(r2.basis) ? r2.basis : []).slice(0, 10).map((b) => {
    const stream = String(b?.stream || 'SUY_LUAN').toUpperCase();
    const evidence = String(b?.evidence || '').slice(0, 240);
    const verified = stream === 'SAN_PHAM' ? (!!evidence && verifyQuote(evidence, source) === 'ok') : null;
    return { stream, claim: String(b?.claim || '').slice(0, 160), evidence, ref: String(b?.ref || '').slice(0, 80) || null, verified };
  });
  const sp = basis.filter((b) => b.stream === 'SAN_PHAM');
  const fab = sp.filter((b) => b.verified === false);
  if (sp.length && fab.length === sp.length) blocks.push({ gate: 'CAU_TRICH_KHONG_CO', reasonVi: `Mọi câu trích đặc tính sản phẩm đều KHÔNG có trong hồ sơ gốc (${fab.map((b) => `"${clip(b.evidence, 50)}"`).join(', ')}). Chỉ được trích nguyên văn từ tiêu đề/thông số/chữ ảnh; không có thì đó là điều cần HỎI.` });
  else if (fab.length) warnings.push(`Câu trích không có trong hồ sơ gốc: ${fab.map((b) => `"${clip(b.evidence, 50)}"`).join(', ')}`);
  // G2b điều kiện phân định: MET/UNMET chỉ được tính khi câu trích có thật trong hồ sơ GỐC (không phải chữ AI vòng 1)
  const conditions = (Array.isArray(r2.conditions) ? r2.conditions : []).slice(0, 8).map((c) => {
    let status = String(c?.status || 'UNKNOWN').toUpperCase();
    const evidence = String(c?.evidence || '').slice(0, 200);
    const ok = status !== 'UNKNOWN' && !!evidence && verifyQuote(evidence, source) === 'ok';
    if (status !== 'UNKNOWN' && !ok) status = 'UNKNOWN';
    return { fact: String(c?.fact || '').slice(0, 160), status, evidence: ok ? evidence : '', unverified: status === 'UNKNOWN' && !!c?.evidence };
  }).filter((c) => c.fact);
  const fakeMet = conditions.filter((c) => c.unverified);
  if (fakeMet.length) warnings.push(`Điều kiện ghi ĐẠT/TRÁI nhưng câu trích không có trong hồ sơ gốc → coi là CHƯA RÕ: ${fakeMet.map((c) => c.fact).join('; ')}`);
  // G3 "trừ X" / "không có X" theo nhãn dòng
  if (hs.length === 8) {
    const pol = checkPolarity(hs, productText);
    if (!pol.ok) blocks.push({ gate: 'MAU_THUAN_NHAN_DONG', reasonVi: pol.reasonVi + (pol.alternative ? ` Xem dòng ${pol.alternative}.` : '') });
    const sub = checkSubheading(hs, productText);
    if (!sub.ok) warnings.push(clip(sub.reasonVi, 220));
  }
  // G4 nhóm phải đã được kiểm chú giải trong hồ sơ vụ việc
  const h4 = hs.slice(0, 4);
  if (!gathered.headings.includes(h4)) blocks.push({ gate: 'NHOM_CHUA_KIEM', reasonVi: `Nhóm ${h4} chưa có chú giải/dòng biểu thuế trong hồ sơ vụ việc — máy chủ đã bổ sung ở lượt này; đọc lại rồi quyết.`, addHeading: h4 });
  // G5 bảng quyết định đã duyệt → ghi đè (không chặn)
  let tableOverride = null;
  if (hs.length === 8) {
    try {
      const dec = resolveHeading(h4, { text: productText, parsed: parseCommodityQuery(productText) });
      if (dec?.status === 'RESOLVED' && dec.tableVerified && dec.hs && taxData[dec.hs] && dec.hs.slice(0, 4) === h4 && dec.hs !== hs) tableOverride = { from: hs, to: dec.hs, dec };
    } catch { /* bảng tuỳ chọn */ }
  }
  // G6 made-in-china: ≥2 shop khác nhau cùng ghi nhóm khác (hàng máy) → vòng sau phải xử lý (chặn 1 lần)
  const mic = gathered.mic?.consensus;
  if (mic?.heading4 && mic.heading4 !== h4 && machinery) {
    const addressed = (r2.alternatives || []).some((a) => nz(a.hs).startsWith(mic.heading4)) || /made-in-china|nhà sản xuất|shop/i.test(String(r2.reason || ''));
    if (!addressed && round < 3) blocks.push({ gate: 'NHA_SAN_XUAT_KHAC_NHOM', reasonVi: `${mic.shops} shop khác nhau trên made-in-china cùng ghi nhóm ${mic.heading4}, bạn chọn ${h4}. Hãy đối chiếu chú giải hai nhóm và nêu rõ vì sao chọn/không chọn ${mic.heading4}.` });
    else if (!addressed) warnings.push(`made-in-china: ${mic.shops} shop ghi nhóm ${mic.heading4} (khác ${h4}).`);
  }
  // G7 nhà cung cấp tự khai HS trên trang sản phẩm (mọi loại hàng): khác NHÓM 4 số mà chưa giải trình → chặn 1 lần;
  // khác 6 số cùng nhóm → chỉ cảnh báo nhẹ (đuôi TQ, dòng 8 số do biểu thuế VN quyết).
  const sup = gathered.supplier;
  if (sup && sup.heading4 !== h4) {
    const addressed = (r2.alternatives || []).some((a) => nz(a.hs).startsWith(sup.heading4)) || /nhà cung cấp|NCC|supplier/i.test(String(r2.reason || ''))
      || basis.some((b) => b.stream === 'NHA_SAN_XUAT' && /nhà cung cấp|NCC|supplier/i.test(`${b.claim} ${b.ref}`));
    if (!addressed && round < 3) blocks.push({ gate: 'NCC_KHAI_KHAC_NHOM', reasonVi: `Nhà cung cấp khai HS ${sup.hs6} (nhóm ${sup.heading4}, mã gốc ${sup.code}) trên trang sản phẩm, bạn chọn nhóm ${h4}. Hãy đối chiếu chú giải nhóm ${sup.heading4} và nhóm ${h4}, nêu rõ vì sao chọn/không chọn ${sup.heading4} (ghi vào reason hoặc alternatives).` });
    else warnings.push(`Nhà cung cấp khai ${sup.hs6} (nhóm ${sup.heading4}), hệ thống chọn nhóm ${h4}${addressed ? ' — AI đã giải trình' : ''}.`);
  } else if (sup && hs.length >= 6 && hs.slice(0, 6) !== sup.hs6) {
    warnings.push(`Nhà cung cấp khai phân nhóm ${sup.hs6}, hệ thống chọn ${hs.slice(0, 6)} (cùng nhóm ${h4}) — kiểm lại dòng 6/8 số.`);
  }
  // G8 sổ tay chú giải (kết cục C): chỉ khi không còn chặn cứng — máy nghi, AI giải trình một lượt.
  const challenges = (!blocks.length && soTayMode() !== 'off' && hs.length >= 6)
    ? soTayGates({ hs, productText, productName: ctx.productName, form: ctx.form, pool: ctx.pool || [] }).challenges
    : [];
  return { blocks, warnings, basis, conditions, tableOverride, challenges };
}

/** Nhóm khác đang có mặt trong hồ sơ vụ việc — để cổng sổ tay biết nhóm bị loại trừ có phải đang là ứng viên không. */
function casePool(r1, r2, gathered) {
  const out = [];
  for (const h of r1?.hypotheses || []) out.push({ h4: nz(h.heading4).slice(0, 4), from: 'gia-thuyet' });
  for (const a of r2?.alternatives || []) out.push({ h4: nz(a.hs).slice(0, 4), from: 'ma-doi-lap' });
  for (const o of gathered?.ozPrecedents || []) if (o.cov >= 60) out.push({ h4: o.hs.slice(0, 4), from: 'tien-le-oz' });
  if (gathered?.mic?.consensus?.heading4) out.push({ h4: gathered.mic.consensus.heading4, from: 'made-in-china' });
  for (const c of gathered?.poolCodes || []) out.push({ h4: c.hs.slice(0, 4), from: c.from });
  return out.filter((p) => p.h4.length === 4);
}

function challengeText(challenges) {
  let budget = SO_TAY_LEGAL_CHARS;
  const items = challenges.map((c, i) => {
    const legal = (c.legal || []).map((l) => {
      const t = clip(l.trich, Math.max(120, Math.min(600, budget)));
      budget -= t.length;
      return `   Căn cứ [${l.nguon}]: "${t}"`;
    }).join('\n');
    return `${i + 1}. [${c.gate}] ${c.reasonVi}\n   Câu hỏi: ${c.questionVi}\n${legal}`;
  });
  return `YÊU CẦU GIẢI TRÌNH — sổ tay chú giải (máy NGHI, chưa kết luận):\n${items.join('\n')}
Xử lý từng mục: hàng thuộc diện nêu trên → ĐỔI mã. Không thuộc → GIỮ mã và thêm vào JSON trường
"explanations":[{"gate":"tên cổng","answer":"vì sao hàng không thuộc diện này","evidence":"câu CHÉP NGUYÊN VĂN từ HỒ SƠ GỐC"}].
Không có câu nào trong hồ sơ gốc chứng minh được → ghi "evidence":"" (máy sẽ chuyển chuyên viên xem), KHÔNG bịa.`;
}

/** Đánh giá lượt giải trình: đổi mã → CHANGED; giữ mã mà mọi mục có câu trích thật → EXPLAINED; còn lại → UNRESOLVED. */
function judgeExplanations(prevHs, r2, challenges, source) {
  const { verifyQuote } = lazy();
  const hs = nz(r2?.hs);
  if (hs && hs.slice(0, 4) !== prevHs.slice(0, 4)) return { outcome: 'CHANGED', from: prevHs, to: hs, giaiTrinh: [] };
  if (hs && hs !== prevHs && challenges.every((c) => c.gate === 'SO_TAY_DONG8' || c.gate === 'SO_TAY_BO_PHAN')) return { outcome: 'CHANGED', from: prevHs, to: hs, giaiTrinh: [] };
  const ex = Array.isArray(r2?.explanations) ? r2.explanations : [];
  const giaiTrinh = challenges.map((c) => {
    const e = ex.find((x) => String(x?.gate || '').toUpperCase() === c.gate) || (challenges.length === 1 ? ex[0] : null);
    const evidence = String(e?.evidence || '').slice(0, 240);
    const verified = !!evidence && verifyQuote(evidence, source) === 'ok';
    return { gate: c.gate, questionVi: c.questionVi, answer: clip(e?.answer, 300), evidence: verified ? evidence : '', verified, legal: c.legal };
  });
  return { outcome: giaiTrinh.every((g) => g.verified) ? 'EXPLAINED' : 'UNRESOLVED', from: prevHs, to: hs || prevHs, giaiTrinh };
}

// ───────────────────────── ĐỘNG CƠ ─────────────────────────
async function classifyLoop(rawAttrs, opts = {}) {
  const t0 = Date.now();
  const left = () => BUDGET_MS - (Date.now() - t0);
  const raw = rawAttrs || {};
  const { groundingSourceOf } = lazy();
  const imgText = (Array.isArray(raw.imageTexts) ? raw.imageTexts : []).map((t) => (typeof t === 'string' ? t : t?.text || '')).join('\n');
  const source = [groundingSourceOf(raw), imgText].filter(Boolean).join('\n');
  const log = [];
  const engine = { name: 'loop', rounds: 0, providers: [], gates: log };

  // VÒNG 1
  let r1;
  try {
    const r1Timeout = Math.min(R1_TIMEOUT_MS, Math.max(30000, left() - 170000));
    const { json, provider } = await callWithFallback(SYS_R1, round1Input(raw), { step: 'understand', minimax: stepModel('understand'), tier: opts.tier, maxTokens: 12000, timeoutMs: r1Timeout, temperature: 0.1, ...providerOpts(r1Timeout) }, log);
    r1 = json || {}; engine.rounds += 1; engine.providers.push(provider);
  } catch (e) {
    return { ...classifyStatus({ headings: [], engineFailed: 'ENGINE_TIMEOUT' }), results: [], missing: ['Engine bận hoặc quá thời gian — bấm "Áp mã" lại'], candidates: { headings: [], precedentCodes: [] }, engine: { ...engine, error: String(e.message).slice(0, 120) } };
  }
  const product = r1.product || {};
  const productText = [raw.tenHang, raw.nameZh, raw.specs, raw.chatLieu, raw.congDung, imgText, product.nameVi, product.purpose, product.material, product.mechanism].filter(Boolean).join('\n');
  const machinery = (r1.hypotheses || []).some((h) => MACHINERY_CH.has(nz(h.chapter).slice(0, 2) || nz(h.heading4).slice(0, 2)));

  // KIỂM CHỨNG
  let gathered = await gather(r1, raw, { micAllowed: opts.mic !== false });

  // VÒNG 2 → chốt chặn → (vòng 3, 4)
  let r2 = null; let g = null; let feedback = '';
  const usedHeadings = new Set(gathered.headings);
  // Sổ tay: tối đa MỘT lượt giải trình mỗi món; `soTay` ghi kết cục để trả cho ERP + lưu hồ sơ giải trình.
  const soTay = { mode: soTayMode(), challenges: [], outcome: 'NONE', giaiTrinh: [] };
  let pending = null; // { hs, challenges } của lượt vừa yêu cầu giải trình
  let challenged = false;
  for (let round = 2; round <= MAX_ROUNDS; round++) {
    if (round > 2 && left() < RETRY_MIN_LEFT_MS) { log.push({ round, note: 'hết ngân sách thời gian — dừng lặp' }); break; }
    const user = `${gathered.pack}${feedback ? `\n\n${pending ? 'LẦN TRƯỚC — ' : `LẦN TRƯỚC BỊ CHẶN (vòng ${round - 1}):\n`}${feedback}` : ''}`;
    try {
      const r2Timeout = Math.min(R2_TIMEOUT_MS, Math.max(30000, left() - 10000));
      const { json, provider } = await callWithFallback(SYS_R2, user, { step: 'gir', minimax: stepModel('gir'), tier: opts.tier, maxTokens: Number(process.env.GIR_MAX_TOKENS) || 20000, timeoutMs: r2Timeout, temperature: 0.1, ...providerOpts(r2Timeout) }, log);
      r2 = json || {}; engine.rounds += 1; engine.providers.push(provider);
    } catch (e) {
      log.push({ round, error: String(e.message).slice(0, 120) });
      if (!r2) return { ...classifyStatus({ headings: gathered.headings, engineFailed: 'ENGINE_TIMEOUT' }), results: [], missing: ['Engine bận hoặc quá thời gian — bấm "Áp mã" lại'], candidates: { headings: gathered.headings, precedentCodes: [] }, dossier: { product, hypotheses: r1.hypotheses || [] }, engine };
      break;
    }
    g = gates(r2, { source, productText, gathered, machinery, round, productName: product.nameVi || raw.tenHang, form: product.form, pool: casePool(r1, r2, gathered) });
    log.push({ round, decision: r2.decision, hs: nz(r2.hs), blocks: g.blocks.map((b) => b.gate), warnings: g.warnings.length, ...(g.challenges.length ? { soTay: g.challenges.map((c) => c.gate) } : {}) });
    if (!g.blocks.length) {
      if (pending) {
        const j = judgeExplanations(pending.hs, r2, pending.challenges, source);
        Object.assign(soTay, { outcome: j.outcome, from: j.from, to: j.to, giaiTrinh: j.giaiTrinh });
        // Mã mới vẫn bị sổ tay nghi → không hỏi lần hai, chuyển chuyên viên.
        if (j.outcome === 'CHANGED' && g.challenges.length) Object.assign(soTay, { outcome: 'UNRESOLVED', challenges: g.challenges, giaiTrinh: [] });
        pending = null;
        break;
      }
      if (g.challenges.length && soTay.mode !== 'off') {
        soTay.challenges = g.challenges;
        if (challenged) { soTay.outcome = 'UNRESOLVED'; break; } // đã dùng lượt giải trình (trước đó vướng chốt chặn)
        if (round >= MAX_ROUNDS || left() < RETRY_MIN_LEFT_MS) { soTay.outcome = 'NO_TIME'; break; }
        challenged = true;
        pending = { hs: nz(r2.hs), challenges: g.challenges };
        feedback = challengeText(g.challenges);
        // Nhóm đích của loại trừ phải có chú giải + dòng biểu thuế trong gói, để AI đối chiếu và để đổi sang đó
        // không vướng chốt chặn "nhóm chưa kiểm".
        const targets = [...new Set(g.challenges.map((c) => nz(c.target).slice(0, 4)).filter((t) => t.length === 4 && !usedHeadings.has(t) && Object.keys(taxData).some((k) => k.startsWith(t))))].slice(0, 2);
        if (targets.length) { for (const t of targets) usedHeadings.add(t); const keepMic = gathered.mic; gathered = await gather(r1, raw, { usedHeadings, micAllowed: false }); gathered.mic = keepMic; }
        continue;
      }
      break;
    }
    if (pending) { pending = null; soTay.outcome = 'BLOCKED_AFTER'; } // lượt giải trình lại vướng chốt chặn → xử lý như chặn
    const add = g.blocks.find((b) => b.addHeading)?.addHeading;
    if (add) { usedHeadings.add(add); const keepMic = gathered.mic; gathered = await gather(r1, raw, { usedHeadings, micAllowed: false }); gathered.mic = keepMic; }
    feedback = g.blocks.map((b, i) => `${i + 1}. [${b.gate}] ${b.reasonVi}`).join('\n');
  }

  if (pending) soTay.outcome = 'NO_TIME'; // đã yêu cầu giải trình nhưng hết giờ trước khi AI trả lời

  // KẾT QUẢ
  const { validateClassifyResults, tbTchqGate, conflictsDb } = lazy();
  let hs = nz(r2?.hs);
  const blocked = g?.blocks?.length ? g.blocks : [];
  let resolver = { status: 'SKIP' };
  if (g?.tableOverride && !blocked.length) {
    const shaped = toResolverShape(g.tableOverride.dec);
    resolver = { ...shaped, overrodeLlm: true };
  }
  const finalHs = resolver.status === 'RESOLVED' ? g.tableOverride.to : hs;
  const alts = (Array.isArray(r2?.alternatives) ? r2.alternatives : []).map((a) => ({ hs: nz(a.hs), confidence: null, reason: clip(a.whyNot, 200), source: 'engine-loop:alt' })).filter((a) => a.hs.length >= 6 && a.hs !== finalHs);
  let results = finalHs ? [{
    hs: finalHs, confidence: Math.max(0, Math.min(100, Number(r2.confidence) || 0)), reason: clip(r2.reason, 400), basis: g?.basis || [],
    conditions: g?.conditions || [], source: 'engine-loop',
    ...(resolver.status === 'RESOLVED' ? { resolverOverride: { from: g.tableOverride.from, ...(resolver.trace?.[0] || {}) }, reason: g.tableOverride.dec.reasonVi || clip(r2.reason, 400), confidence: Math.max(Number(r2.confidence) || 0, 85) } : {}),
    ...(hs !== finalHs ? {} : {}),
  }, ...(resolver.status === 'RESOLVED' && hs !== finalHs ? [{ hs, confidence: Math.min(Number(r2.confidence) || 0, 50), reason: clip(r2.reason, 200), source: 'engine-loop' }] : []), ...alts].slice(0, 3) : [];
  results = validateClassifyResults(results, gathered.headings).results;
  for (const r of results) { r.hsLevel = r.hs.length; const t = tbTchqGate(r.hs); if (t.hasPrecedent) r.tbTchq = t.entries; }
  const top = results[0];

  const questions = (Array.isArray(r2?.questions) ? r2.questions : []).filter((q) => q && (q.question || q.fact)).slice(0, 6)
    .map((q) => ({ attribute: null, fact: clip(q.fact, 120), questionVi: clip(q.question || `Xác nhận: ${q.fact}?`, 200), whereToFind: clip(q.whereToFind, 80) }));
  // Điều kiện CHƯA RÕ → câu hỏi: chỉ điều kiện KHẲNG ĐỊNH về hàng ("vận hành bằng tay", "công suất…"). Điều kiện phủ
  // định ("không phải kéo cắt cành…") là loại trừ AI đã cân nhắc, không thể trích nguyên văn → không hỏi khách.
  // Câu loại trừ ("Hàng KHÔNG phải kéo cắt cành…", "không thuộc 8201.50") → AI đã cân nhắc, không hỏi khách.
  // Câu khẳng định có chữ "không" bên trong ("vận hành bằng tay, không có động cơ") vẫn là dữ kiện cần hỏi.
  const NEGATIVE = /^\s*(hàng\s+|sản phẩm\s+|mặt hàng\s+)?(không|ko|chưa|not)\s+(phải|thuộc|là|bị|nằm|a\b|be\b)/i;
  const unknownConds = (top?.conditions || []).filter((c) => String(c.status).toUpperCase() === 'UNKNOWN' && !NEGATIVE.test(c.fact)).map((c) => clip(c.fact, 120)).slice(0, 3);
  let missing = [...new Set([...questions.map((q) => q.questionVi), ...unknownConds.filter((f) => !questions.some((q) => q.fact === f)).map((f) => `Cần xác nhận: ${f}`)])];
  if (blocked.length) missing = [...new Set([...missing, ...blocked.map((b) => `Chưa chốt được: ${clip(b.reasonVi, 160)}`)])];

  const attrsForEcus = { ...raw, tenHang: product.nameVi || raw.tenHang, chatLieu: raw.chatLieu || product.material || null, congDung: raw.congDung || product.purpose || null };
  const ecus = top && top.hs.length === 8 && !blocked.length ? buildEcus(top.hs, attrsForEcus) : null;
  const decision = String(r2?.decision || '').toUpperCase();
  const needFacts = decision === 'HOI' || (top && top.hs.length < 8) || (blocked.length > 0 && questions.length > 0);
  let status;
  if (!top) status = classifyStatus({ headings: gathered.headings, engineFailed: 'LLM_REJECTED' });
  else if (resolver.status === 'RESOLVED') status = classifyStatus({ results, headings: gathered.headings, resolverResolved: true });
  else if (blocked.length && !needFacts) status = { status: 'NEEDS_EXPERT', nextAction: { type: 'HUMAN_REVIEW', reasonCode: 'GATE_BLOCKED', reasonVi: blocked.map((b) => b.reasonVi).join(' '), optionsHs: results.map((r) => r.hs) } };
  else if (needFacts) status = { status: 'NEED_FACTS', nextAction: { type: 'ASK_USER', questions: questions.length ? questions.map((q) => ({ attribute: null, questionVi: q.questionVi, whereToFind: q.whereToFind })) : missing.map((m) => ({ attribute: null, questionVi: m })), howToAnswerVi: 'Bổ sung dữ kiện (ảnh tem/nhãn, thông số) rồi gọi lại /api/classify.' } };
  else status = { status: 'REVIEW', nextAction: { type: 'USER_CONFIRM', optionsHs: results.map((r) => r.hs) } };

  const review = decision === 'DE_XUAT' && !blocked.length
    ? { needed: true, reasons: [`Tranh luận phân loại: ${clip(r2.reason, 200)}${alts.length ? ` — mã đối lập ${alts.map((a) => a.hs).join(', ')}` : ''}`] }
    : { needed: false, reasons: [] };
  // Sổ tay: máy nghi mà AI không giải trình được bằng câu trích hồ sơ (hoặc hết giờ) → chuyên viên xem.
  if (top && !blocked.length && ['UNRESOLVED', 'NO_TIME'].includes(soTay.outcome)) {
    review.needed = true;
    const open = soTay.outcome === 'NO_TIME' ? soTay.challenges : soTay.challenges.filter((c) => !soTay.giaiTrinh.find((x) => x.gate === c.gate && x.verified));
    for (const c of open) review.reasons.push(`Sổ tay chú giải: ${clip(c.reasonVi, 200)}`);
  }
  // Tiền lệ Oz (tờ khai đã thông quan) xếp NHÓM khác với mã chốt → không chặn (tiền lệ không đè chú giải) nhưng
  // chuyên viên phải xem: đo 07/10 trên 80 tờ khai, 11/24 ca sai-không-cờ là khác nhóm và đều có tiền lệ Oz trái chiều.
  if (top && !blocked.length) {
    const byHead = new Map();
    // Chỉ tiền lệ khớp ≥75% từ khoá (tìm theo từ khoá hay nhiễu: "xe đẩy" khớp "bánh xe đẩy" 8302), nhóm dẫn đầu
    // phải chiếm ≥60% trọng số và ≥3 tờ khai.
    for (const o of gathered.ozPrecedents) if (o.cov >= 75 && o.hs.length >= 4) byHead.set(o.hs.slice(0, 4), (byHead.get(o.hs.slice(0, 4)) || 0) + (o.oz || 1));
    const ranked = [...byHead.entries()].sort((a, b) => b[1] - a[1]);
    const total = ranked.reduce((a, [, w]) => a + w, 0);
    const lead = ranked[0];
    if (lead && lead[0] !== top.hs.slice(0, 4) && lead[1] >= 3 && lead[1] / total >= 0.6 && !(r2?.alternatives || []).some((a) => nz(a.hs).startsWith(lead[0]))) {
      review.needed = true;
      review.reasons.push(`Tiền lệ Oz (${lead[1]} tờ khai khớp ≥50%) xếp nhóm ${lead[0]}, hệ thống chốt ${top.hs.slice(0, 4)} — chuyên viên đối chiếu`);
    }
  }
  // Mã NCC tự khai (gathered.supplier): cùng 6 số → tăng tin cậy, ghi vào basis; khác NHÓM sau trần vòng → chuyên
  // viên phải xem (review.needed) dù AI đã giải trình — NCC là nguồn gần hàng nhất, bất đồng cấp nhóm không được im.
  const sup = gathered.supplier;
  const supAgree = top ? supplierAgree(top.hs, sup) : null;
  if (top && sup && supAgree === 'SAME6') {
    top.basis = [...(top.basis || []), { stream: 'NHA_SAN_XUAT', claim: `Nhà cung cấp khai cùng phân nhóm ${sup.hs6} trên trang sản phẩm`, evidence: sup.code, ref: sup.url || sup.source || 'supplierHs', verified: true }];
    top.confidence = Math.min(95, (Number(top.confidence) || 0) + 5);
  }
  if (top && sup && supAgree === 'DIFF') {
    review.needed = true;
    review.reasons.push(`NCC khai HS ${sup.hs6} (nhóm ${sup.heading4}${sup.source ? `, ${sup.source}` : ''}) / hệ thống chọn ${top.hs} (nhóm ${top.hs.slice(0, 4)}) — chuyên viên đối chiếu chú giải hai nhóm`);
  }
  const girVerdict = determineGir({ description: [product.nameVi, product.material, product.purpose].filter(Boolean).join(' '), candidates: results.map((r) => r.hs), pickedHs: top?.hs || null, resolver: resolver.status === 'RESOLVED' ? resolver : null, llmGir: r2?.gir || null });
  const conflict = top?.hs?.length === 8 ? conflictsDb()[top.hs] : null;
  return {
    ...status,
    results,
    missing,
    missingStructured: top?.hs ? missingStructuredFor(top.hs, attrsForEcus) : [],
    antiPatternWarnings: (g?.warnings || []).map((w, i) => ({ id: `gate-warning-${i + 1}`, description: w })),
    girRulesApplied: girVerdict.determinations,
    girDisclaimer: girVerdict.disclaimer,
    ecus,
    explanatoryNote: top?.hs?.length === 8 ? getNoteSummaryForHs(top.hs) : null,
    confusionWarning: conflict?.confusedWith?.length ? { riskLevel: conflict.riskLevel, confusedWith: conflict.confusedWith, reasonsVi: conflict.reasonsVi || [] } : null,
    resolver: resolver.status === 'RESOLVED' ? (({ gir: _g, ...rest }) => rest)(resolver) : resolver,
    review,
    ...(soTay.mode !== 'off' ? { soTay: { ...soTay, challenges: soTay.challenges.map(({ gate, h4, target, matched, reasonVi, questionVi, legal }) => ({ gate, h4, target, matched: matched || null, reasonVi, questionVi, legal })) } } : {}),
    dossier: {
      product, hypotheses: (r1.hypotheses || []).slice(0, 3), unknowns: (r1.verify?.unknowns || []).slice(0, 6), verify: r1.verify || null,
      mic: gathered.mic ? { query: gathered.mic.query, queryKind: gathered.mic.queryKind || null, droppedOffChapter: gathered.mic.droppedOffChapter || 0, consensus: gathered.mic.consensus, pages: (gathered.mic.pages || []).filter((p) => !p.error).map((p) => ({ shop: p.shop, name: p.name, hsCode: p.hsCode, material: p.props?.material || null, usage: p.props?.usage || p.props?.application || null, url: p.url })) } : null,
      decision, conditions: top?.conditions || [], alternatives: alts,
      supplier: sup ? { code: sup.code, hs6: sup.hs6, heading4: sup.heading4, source: sup.source, url: sup.url, agree: supAgree } : null,
    },
    queryUnderstanding: { applied: true, searchTextVi: product.nameVi || null, productFactsVi: { tenHangVi: product.nameVi, banChat: product.purpose, chatLieu: product.material, congDung: product.purpose } },
    candidates: { headings: gathered.headings, precedentCodes: [...new Map(gathered.ozPrecedents.map((o) => [o.hs, { hs: o.hs, ozCount: o.oz }])).values()].slice(0, 10) },
    engine: { ...engine, tier: opts.tier === 'premium' ? 'premium' : 'standard', provider: engine.providers[engine.providers.length - 1] || null, ms: Date.now() - t0 },
  };
}

module.exports = { classifyLoop, gates, gather, round1Input, casePool, judgeExplanations, challengeText, soTayMode, SYS_R1, SYS_R2, isGeminiBillingError, normalizeSupplierHs, supplierAgree };
