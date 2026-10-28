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
//  - TỐI ƯU ĐỘ TRỄ (backlog 09 bước 3+4; CEO 26/10/2026 "bật đi xem hiệu quả thế nào") — hai công tắc MẶC ĐỊNH BẬT,
//    đặt "off" thì động cơ chạy y hệt origin/main 6280c65 (prompt + luồng trùng từng byte, test so golden master):
//    HS_GON_DAU_RA (trống=bật | off): JSON gọn đúng bằng phần máy đọc (TRAN), trần maxTokens thấp hơn, JSON cụt → lưới an toàn.
//    HS_MAX_VONG_SUA (trống=1 | 0 | 2 | off): trần vòng sửa theo lý do bị chặn + bước tất định NHOM_CHUA_KIEM. Chi tiết: mục TỐI ƯU.
// Gọi qua module (không destructure) để test có thể thay callLLMJson lúc runtime — như micMod/ozSearch.
const llmTier = require('./llm-tier.js');
const { taxData } = require('./data.js');
const { classifyStatus, matchTextOf } = require('./classify-guards.js');
const { checkPolarity, checkSubheading } = require('./subheading-check.js');
const { resolveHeading, toResolverShape, advisoryFromDecision } = require('./decision-tables.js');
const { parseCommodityQuery } = require('./query-parse.js');
const ozSearch = require('./oz-precedent-search.js'); // gọi qua module để test thay được
const { searchPrecedents, countIndependentSources } = require('./precedent-search.js');
const { buildEcus } = require('./describe-ecus.js');
const { getNoteSummaryForHs } = require('./explanatory-notes-index.js');
const { determineGir } = require('./gir.js');
const { canCuPhapLy } = require('./legal-basis.js');
const soTayRuntime = require('./so-tay-runtime.js');
// #359: mỗi mã thay thế AI nêu ra phải kèm tên dòng biểu thuế 8 số (xem lib/ma-thay-the.js).
const { ganLyDoThayThe } = require('./ma-thay-the.js');

// Phản hồi không chốt được mã (AI lỗi/quá giờ): vẫn ghi căn cứ pháp lý của trạng thái.
const withLegal = (o) => ({ ...o, canCuPhapLy: canCuPhapLy({ status: o.status, topHs: null }) });
const { missingStructured: missingStructuredFor } = require('./declaration-fields.js');
const { buildTaxLookup } = require('./tax-lookup.js');
const micMod = require('./mic-lookup.js'); // gọi qua module để test thay được micLookup
const embedPoolMod = require('./embed-pool.js'); // GĐ1 (#377): tầng ứng viên embedding — test thay được poolNhom
const { soTayBlock, soTayGates, chotDong8, soTayMode } = require('./so-tay-gates.js'); // soTayMode: công tắc HS_SO_TAY dùng chung
// Gói C: ý kiến phân loại WCO (TT 85/2026 Điều 6.1 nguồn 2) — đưa vào gói vòng 2 + nâng tự tin có kiểm.
const wcoOp = require('./wco-op.js');
// Nguồn có nhãn addon OZSource + quy tắc độ tin cậy + bảng tra nội bộ (28/10/2026) — chỉ khi raw.evidence có.
const { EVIDENCE_PROMPT_MAX, rulesBlock } = require('./source-rules.js');
const EVIDENCE_PACK_MAX = 8000;
const { micSignal, GHI_CHU: MIC_GHI_CHU } = require('./mic-signal.js'); // #299 C-2: chỉ tín hiệu, không bằng chứng
const { appendSignalMicLog } = require('./ml-log.js'); // #307: telemetry signal:mic (best-effort JSONL)

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
// soTayMode() (HS_SO_TAY=off|gates|full, đọc lúc gọi) nằm ở lib/so-tay-gates.js — dùng chung với các cổng cảnh báo.
const SO_TAY_LEGAL_CHARS = 1500; // vòng giải trình chỉ nhận đúng câu hỏi + đúng đoạn luật (≤ 1.500 ký tự)

// ───────────────────────── TỐI ƯU ĐỘ TRỄ (backlog 09 bước 3+4) ─────────────────────────
// Số đo (doc 09 §2b, 25–26/10): ~85–95% thời gian một món là lời gọi LLM; món đơn giản 190–280 s, 2–3 vòng. Hai đòn rẻ,
// KHÔNG đổi mẫu (MiniMax giữ vai chính) và KHÔNG đụng thinking (§2c: tắt thinking đã đo và bị bác):
//  (1) HS_GON_DAU_RA — output ngắn hơn: mỗi ~2.000 token output ≈ 20 s.
//  (2) HS_MAX_VONG_SUA — bớt vòng sửa oan: mỗi vòng sửa là MỘT lời gọi vòng 2 (~70–107 s đo ở §2b).
// Đọc env LÚC GỌI (không lúc nạp) để đổi được giữa các lượt đo/test. Công tắc tắt: "off" (với HS_GON_DAU_RA nhận cả 0/false).
const CONG_TAC_TAT = new Set(['off', '0', 'false', 'no']);
/** HS_GON_DAU_RA: trống/giá trị khác = BẬT (mặc định từ 26/10/2026); off|0|false|no = TẮT (y như origin/main 6280c65). */
function gonDauRa() {
  return !CONG_TAC_TAT.has(String(process.env.HS_GON_DAU_RA ?? '').trim().toLowerCase());
}
// "Vòng sửa" đúng nghĩa của MAX_ROUNDS gốc ("tối đa 2 lần sửa theo lý do bị chặn"): một lời gọi vòng 2 nữa vì CHỐT CHẶN còn
// chặn. Lượt GIẢI TRÌNH sổ tay là việc khác — tối đa MỘT lần mỗi món (đã có trần riêng `challenged`), có ích đo được (bench
// 13/10: 1 đổi mã có lợi, 0 có hại; prod: chú giải 85.09 loại trừ quạt thông gió → 84.14) — nên KHÔNG tính vào trần này:
// cắt nó sẽ biến một lần AI tự sửa đúng thành cờ chuyên viên. Mặc định 1 (doc 09 bước 3: "cân nhắc trần sửa 1 vòng mặc định"):
//  - NCC_KHAI_KHAC_NHOM / NHA_SAN_XUAT_KHAC_NHOM chỉ chặn ở vòng 2 (round < 3) → tự chúng chỉ đòi ĐÚNG 1 vòng sửa.
//  - Vòng sửa thứ HAI chỉ chạy khi cổng VẪN chặn sau một lần sửa — bản đo 4 vòng (doc 09 §2: CAU_TRICH_KHONG_CO bắn 2 lượt,
//    251 s/209 s) ra CÙNG mã 8509.80.90 với bản 2 vòng (105 s): ~60–100 s không đổi kết quả. AI đã thấy lý do chặn một lần mà
//    vẫn vướng → trả đáp án cuối kèm cờ chuyên viên (NEEDS_EXPERT/GATE_BLOCKED, như khi chạm MAX_ROUNDS) thay vì đoán thêm.
//  - Ngân sách 285 s: R1 (20–74 s) + 2 lời gọi vòng 2 (70–107 s mỗi lời) đã ~250 s → vòng sửa thứ hai thường chỉ còn chạy được
//    ở món nhanh, đúng loại món ít cần sửa.
// "0" = KHÔNG vòng sửa nào (đáp án vòng 2 + cờ) — số là trần, KHÔNG phải công tắc tắt; muốn hành vi cũ đặt "off".
const VONG_SUA_MAC_DINH = 1;
/** HS_MAX_VONG_SUA → số vòng sửa (theo lý do bị chặn) tối đa 0…2, hoặc null = tắt (luồng y như cũ, không bước tất định). */
function maxVongSua() {
  const v = String(process.env.HS_MAX_VONG_SUA ?? '').trim().toLowerCase();
  if (!v) return VONG_SUA_MAC_DINH;
  if (v === 'off' || v === 'false' || v === 'no') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? Math.min(n, MAX_ROUNDS - 2) : VONG_SUA_MAC_DINH;
}
// Trần maxTokens khi HS_GON_DAU_RA bật (R1_MAX_TOKENS / GIR_MAX_TOKENS đặt tường minh vẫn thắng). maxTokens của MiniMax tính CẢ
// phần <think> (engine-loop từng thấy 46–56k ký tự suy nghĩ làm JSON cụt) → trần chỉ là CHẶN ĐUÔI, không phải cần tăng tốc
// chính (cần chính là JSON gọn bên dưới): chạm trần = JSON cụt = lùi "tắt suy nghĩ" (§2c đã bác) → không được cắt vào lượt
// bình thường. Ước theo §2b (thinking bật) với ~75–85 token/s đo ở probe M3 (§1: 399 token suy nghĩ + JSON trong 8,6 s):
//  R1: lượt dài nhất bình thường 74 s ≈ 5,5–6,2k token, JSON gọn bớt ~1–2k (R1 thinking-off đo ~2–4k token chỉ riêng JSON,
//      commit 1646d50) → ~4–5k; 6.000 chừa ~25–35% và chạm ở ~70–80 s, trước timeout R1 100 s (lượt suy nghĩ lan man hiện đốt
//      trọn 100 s rồi mới lùi).
//  R2: lượt dài nhất bình thường 107 s ≈ 8–9k token; JSON gọn bớt ~0,5–1,5k → ~7–8k. 6k sẽ cắt cả lượt BÌNH THƯỜNG → 10.000
//      (chạm ~120–135 s, trước timeout R2 160 s; trần cũ 20.000 không bao giờ chạm trước timeout).
// Bench in outputTokens từng bước + số lượt chạm trần (scripts/bench-classify-llm.mjs) để chỉnh hai số này bằng env.
const R1_MAX_TOKENS_GON = 6000;
const R2_MAX_TOKENS_GON = 10000;
// B1b ON (#467) chạy lại CẢ động cơ một lượt. Khi HS_MAX_VONG_SUA bật, lượt chạy lại dùng chung hạn giờ của lượt chính
// (t0 + CLASSIFY_BUDGET_MS) và chỉ bắt đầu nếu còn ≥ 120 s: dưới mức đó R1 (sàn timeout 30 s) + R2 gần như chắc chắn hết giờ
// → ENGINE_TIMEOUT, tốn tiền mà không ra mã. Xem chayLaiB1b cuối classifyLoop.
const B1B_LAI_MIN_MS = 120000;
// TRẦN JSON GỌN — đúng bằng phần máy THẬT SỰ đọc (không thấp hơn); phần AI viết vượt các số này máy cắt bỏ, chỉ tốn giây.
const TRAN = Object.freeze({
  // VÒNG 1
  productChars: 2200, // gather(): `JSON.stringify(product).slice(0, 2200)` — gói vòng 2 chỉ thấy 2.200 ký tự đầu của product
  r1Text: 160, //       ô chữ product (nameVi, purpose, material…): một câu; cả khối phải vừa cửa sổ 2.200 ký tự ở trên
  r1Evidence: 80, //    evidence của product/keySpecs: chỉ đọc qua cửa sổ 2.200 → 8 thông số × (k + v + evidence) còn vừa khung
  keySpecs: 8, //       như trên — keySpecs chỉ vào gói qua cửa sổ 2.200 ký tự và dossier.product
  hypotheses: 3, //     dossier `hypotheses.slice(0, 3)`; prompt gốc "1–3 giả thuyết"
  why: 160, //          gói vòng 2: `clip(h.why, 160)`
  searchVi: 4, //       gather(): `[nameVi, ...searchVi]….slice(0, 4)`
  notesChapters: 4, //  máy không đọc (chỉ trả dossier.verify) — bằng trần 4 nhóm của gather()
  codes8: 8, //         gather(): `codes8….slice(0, 8)`
  unknowns: 6, //       dossier `unknowns.slice(0, 6)`
  // VÒNG 2
  reason: 400, //       results[0].reason = `clip(r2.reason, 400)` (cờ review dùng 200 ký tự đầu)
  basis: 10, claim: 160, basisEvidence: 240, ref: 80, // gates(): `basis.slice(0, 10)`, claim/evidence/ref `.slice(0, 160/240/80)`
  conditions: 8, fact: 160, condEvidence: 200, //       gates(): `conditions.slice(0, 8)`, fact/evidence `.slice(0, 160/200)`
  alternatives: 4, whyNot: 200, // results giữ ≤ 2 mã thay thế (slice 3), declarationOptions ≤ 3 phương án khác (MAX_OPTIONS 4)
  //                               + 1 chỗ cho nhóm NCC/made-in-china mà G6/G7 đòi nêu khi loại; `clip(a.whyNot, 200)`
  questions: 6, qFact: 120, question: 200, whereToFind: 80, // `questions.slice(0, 6)`, clip 120/200/80
  answer: 300, exEvidence: 240, // judgeExplanations(): `clip(e.answer, 300)`, `evidence.slice(0, 240)`
});
// Khối GỌN nối SAU prompt gốc (prefix tĩnh giữ nguyên — có lợi cho prompt-caching, doc 09 bước 5). Không bỏ trường nào,
// không nới yêu cầu nguồn/trích: chỉ thêm trần độ dài + cấm chép lại hồ sơ.
const GON_R1 = `GỌN ĐẦU RA (bắt buộc — máy chỉ đọc chừng này, phần vượt bị cắt bỏ; viết dài chỉ làm chậm):
- JSON MỘT DÒNG, không thụt lề, không lời dẫn/giải thích ngoài JSON; không chép lại hồ sơ.
- product: mỗi ô chữ ≤ ${TRAN.r1Text} ký tự; cả khối product ≤ ${TRAN.productChars} ký tự. 'evidence' (của product và keySpecs) = đoạn
  ngắn chép NGUYÊN VĂN đủ chứng minh, ≤ ${TRAN.r1Evidence} ký tự — không chép cả dòng/cả bảng thông số. keySpecs ≤ ${TRAN.keySpecs} mục,
  chỉ thông số quyết định mã (bỏ màu sắc, đóng gói, quảng cáo).
- hypotheses ≤ ${TRAN.hypotheses}, 'why' ≤ ${TRAN.why} ký tự.
- verify: searchVi ≤ ${TRAN.searchVi} cụm (mỗi cụm vài từ); notesChapters ≤ ${TRAN.notesChapters}; codes8 ≤ ${TRAN.codes8}; unknowns ≤ ${TRAN.unknowns} ý, mỗi ý ≤ ${TRAN.r1Text} ký tự.
- Không bỏ trường nào; hồ sơ không nói thì để "" như trên.`;
const GON_R2 = `GỌN ĐẦU RA (bắt buộc — máy chỉ đọc chừng này, phần vượt bị cắt bỏ; viết dài chỉ làm chậm):
- JSON MỘT DÒNG, không thụt lề, không lời dẫn ngoài JSON. KHÔNG chép lại hồ sơ/chú giải dài — dẫn bằng 'ref' + câu trích ngắn.
- 'reason' ≤ ${TRAN.reason} ký tự.
- basis ≤ ${TRAN.basis} mục: 'claim' ≤ ${TRAN.claim}, 'evidence' ≤ ${TRAN.basisEvidence}, 'ref' ≤ ${TRAN.ref} ký tự. conditions ≤ ${TRAN.conditions} mục: 'fact' ≤ ${TRAN.fact}, 'evidence' ≤ ${TRAN.condEvidence} ký tự.
- alternatives ≤ ${TRAN.alternatives} mục (ưu tiên mã khác nhóm/đường vật liệu và nhóm nhà cung cấp/made-in-china nếu loại), 'whyNot' ≤ ${TRAN.whyNot} ký tự.
- questions ≤ ${TRAN.questions} mục: 'fact' ≤ ${TRAN.qFact}, 'question' ≤ ${TRAN.question}, 'whereToFind' ≤ ${TRAN.whereToFind} ký tự. "explanations" (khi được yêu cầu):
  'answer' ≤ ${TRAN.answer}, 'evidence' ≤ ${TRAN.exEvidence} ký tự.
- Nguồn/trích GIỮ NGUYÊN: lập luận SAN_PHAM phải có 'evidence' CHÉP NGUYÊN VĂN từ hồ sơ gốc (đoạn ngắn đủ chứng minh, không
  diễn giải); CHU_GIAI/TIEN_LE ghi 'ref' (nhóm/dòng/số văn bản). Không bỏ trường nào.`;
// Khoá bắt buộc của từng bước. Trần maxTokens thấp hơn → JSON có thể cụt giữa chừng, hoặc cụt NGAY TRONG <think> — khi đó
// parseJsonLoose có thể vớt một MẢNH object trong phần suy nghĩ (một giả thuyết lẻ, một mã thay thế) và trả về như thể là
// đáp án. Thiếu khoá = coi như "No parseable JSON" → đúng lưới an toàn sẵn có của callWithFallback (gọi lại tắt suy nghĩ,
// ≤ 30 s), không chạy tiếp trên mảnh vụn, không crash. Chỉ áp khi HS_GON_DAU_RA bật; lượt lùi không kiểm lại (như cũ).
// Vòng 2 đòi `decision` (khoá ĐẦU của lược đồ): mảnh vụn hay gặp nhất là một mã thay thế {"hs","whyNot"} — có `hs` thật nên
// không thể dùng `hs` làm dấu hiệu đủ.
const DU_KHOA = Object.freeze({
  understand: (j) => !!j && typeof j === 'object' && ((!!j.product && typeof j.product === 'object' && !Array.isArray(j.product)) || (Array.isArray(j.hypotheses) && j.hypotheses.length > 0)),
  gir: (j) => !!j && typeof j === 'object' && typeof j.decision === 'string' && j.decision.trim() !== '',
});

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

async function callWithFallback(system, user, optsIn, log) {
  // HS_GON_DAU_RA: `kiemKhoa` (DU_KHOA) kiểm khoá bắt buộc của bước — tách khỏi opts để lời gọi nhà cung cấp không đổi.
  // Tắt công tắc → không có kiemKhoa → opts và luồng y như cũ.
  const { kiemKhoa, ...optsRest } = optsIn;
  // #425: timeout theo bước (LLM_TIMEOUT_MS_<STEP>, trần không vượt ngân sách vòng) — lấy TRƯỚC khi gọi,
  // để lần thử "thinking-off" và log cùng thấy một con số. Không đặt env → y như cũ (timeoutMs của vòng).
  const opts = { ...optsRest, timeoutMs: llmTier.stepTimeoutMs(optsRest.step, optsRest.timeoutMs) };
  const t0 = Date.now();
  try {
    const r = await llmTier.callLLMJson(system, user, opts);
    // JSON thiếu khoá bắt buộc (cụt ở maxTokens / mảnh vụn vớt từ <think>) → ném lỗi "parseable JSON" để rơi đúng nhánh
    // gọi lại tắt suy nghĩ bên dưới. Đường Gemini (LOOP_PROVIDER=gemini) không có nhánh đó → giữ hành vi cũ.
    if (kiemKhoa && !GEMINI_LOOP && !kiemKhoa(r?.json)) throw new Error(`No parseable JSON: thiếu khoá bắt buộc của bước ${opts.step} (nghi JSON cụt ở maxTokens ${opts.maxTokens}) [${r?.provider || '?'}]`);
    return r;
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
        try { const r = await llmTier.callLLMJson(system, user, opts); if (log) log.push({ step: opts.step, retry: wait, cause: msg.slice(0, 60), ms: Date.now() - t0 }); return r; } catch (e2) { last = e2; }
      }
      // Gemini vẫn lỗi → lùi về MiniMax (mẫu mặc định của vòng) để máy chủ không trả rỗng.
      if (process.env.MINIMAX_API_KEY) {
        if (billing) console.error('[engine-loop] Gemini lỗi thanh toán/khoá key → lùi MiniMax:', msg.slice(0, 160));
        if (log) log.push({ step: opts.step, fallback: 'minimax', cause: String(last?.message || last).slice(0, 80), ms: Date.now() - t0, timeoutMs: opts.timeoutMs });
        const { tier: _t, geminiTimeoutMs: _g, geminiModelEnv: _m, ...rest } = opts;
        return { ...(await llmTier.callLLMJson(system, user, { ...rest, minimax: { model: DEFAULT_LOOP_MODEL } })), fallback: true };
      }
      throw last;
    }
    if (!/parseable JSON|aborted|timeout|length/i.test(msg)) throw e;
    const model = opts.minimax?.model || process.env[`LLM_STEP_${String(opts.step || '').toUpperCase()}`]?.split(':')[0] || DEFAULT_LOOP_MODEL;
    if (log) log.push({ step: opts.step, fallback: 'thinking-off', cause: msg.slice(0, 120), ms: Date.now() - t0, timeoutMs: opts.timeoutMs });
    // #425: lần "thinking-off" chỉ chờ ≤ 30 s (trước: 60 s cứng) — đã timeout một lần thì không đốt thêm phút nữa.
    const r = await llmTier.callLLMJson(system, user, { ...opts, timeoutMs: Math.min(30000, opts.timeoutMs), minimax: { model, extraBody: { thinking: { type: 'disabled' } } } });
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
// HS_GON_DAU_RA bật: prompt gốc + khối GỌN (SYS_R1 giữ nguyên từng byte cho đường tắt).
const SYS_R1_GON = `${SYS_R1}\n${GON_R1}`;

function round1Input(raw) {
  // Nhãn lấy từ MỘT bảng với verifyQuote (classify.js DOSSIER_LABELS): AI chép cả nhãn khi trích, máy bỏ đúng nhãn đó.
  const { DOSSIER_LABELS: N } = lazy();
  const L = [];
  if (raw.nameZh || raw.tenHang) L.push(`${N.tieuDe}: ${raw.nameZh || raw.tenHang}`);
  if (raw.tenHang && raw.nameZh && raw.tenHang !== raw.nameZh) L.push(`${N.tenKhac}: ${raw.tenHang}`);
  if (raw.specs) L.push(`${N.thongSo}:\n${clip(raw.specs, 1500)}`);
  for (const k of N.truong) if (raw[k]) L.push(`${k}: ${clip(raw[k], 300)}`);
  const facts = Array.isArray(raw.facts) ? raw.facts.filter((f) => f && f.valueVi).slice(0, 20) : [];
  if (facts.length) L.push(`${N.duKien}:\n${facts.map((f) => `- ${f.labelVi || f.key}: ${f.valueVi}${f.evidence ? ` [${N.goc}: ${clip(f.evidence, 80)}]` : ''}`).join('\n')}`);
  // Nguồn có nhãn addon (28/10/2026) đã gồm chữ MỌI ảnh ([IMG-n]) → thay khối "chữ ảnh" 8 ảnh cũ. Quy tắc + bảng tra
  // KHÔNG nằm ở đây (đây là hồ sơ gốc để trích) — classifyLoop gắn riêng sau hồ sơ ở cả hai vòng. Không có evidence → như cũ.
  if (raw.evidence) {
    L.push(`${N.nguon}:\n${String(raw.evidence).slice(0, EVIDENCE_PROMPT_MAX)}`);
    return L.join('\n\n');
  }
  const img = Array.isArray(raw.imageTexts) ? raw.imageTexts : [];
  if (img.length) L.push(`${N.chuAnh}:\n${img.slice(0, 8).map((t, i) => `[${N.anh} ${i + 1}] ${clip(typeof t === 'string' ? t : t?.text, 500)}`).join('\n')}`);
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
  // GĐ1 (#377): tầng ứng viên embedding — gợi ý top-5 nhóm (TÍN HIỆU). Top-3 được nạp chú giải
  // (để AI chọn được nhóm ngoài giả thuyết vòng 1 mà không vướng chặn "nhóm chưa kiểm"); top-5 vào gói.
  let embedPool = null; let embedMs = 0;
  if (process.env.HS_EMBED_POOL === 'on') {
    const tE = Date.now();
    try {
      embedPool = await embedPoolMod.poolNhom([raw.tenHang, raw.nameZh, raw.specs, product.nameVi].filter(Boolean).join(' '));
    } catch { embedPool = null; }
    embedMs = Date.now() - tE;
    if (embedPool?.nhom4?.length) {
      for (const x of embedPool.nhom4.slice(0, 3)) {
        const h4 = nz(x.ma).slice(0, 4);
        if (validH(h4) && !headings.includes(h4)) headings.push(h4);
      }
    }
  }
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
      // Bảng chưa duyệt vẫn vào gói kiểm chứng vòng 2 (ghi rõ "chưa duyệt — tư vấn"): AI phải cân nhắc, máy không ghi đè.
      const assumed = Object.entries(dec.factSources || {}).filter(([a, s]) => s === 'assumed' && (dec.trace?.[0]?.when || {})[a] !== undefined).map(([a]) => `${a}=${dec.factsUsed?.[a]}`);
      return [`Nhóm ${h4}: bảng quyết định ${dec.tableVerified ? 'ĐÃ DUYỆT' : 'chưa duyệt — chỉ tư vấn'} → ${dec.status}${dec.hs ? ` ${dec.hs}` : ''}${dec.reasonVi ? ` — ${clip(dec.reasonVi, 200)}` : ''}${assumed.length ? ` (giả định: ${assumed.join(', ')})` : ''}${dec.missingFacts?.length ? ` (cần: ${dec.missingFacts.map((a) => a.questionVi).join('; ')})` : ''} [bảng quyết định]`];
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
    // Backlog 09 bước 2: 3 truy vấn trước đây chạy TUẦN TỰ — món máy móc không tìm ra đồng thuận
    // chịu đủ 3 lượt × timeout 10 s = 30 s chỉ riêng made-in-china. Nay bắn cả 3 cùng lúc nhưng vẫn
    // XỬ LÝ theo thứ tự ưu tiên cũ (model → tên Anh + model → tên Anh): truy vấn model có đồng thuận
    // thì dừng ngay như trước; không mới gộp tiếp 2 truy vấn còn lại (chờ cùng lúc, tối đa 10 s).
    const batch = queries.map(async (q) => {
      try { return await micMod.micLookup(q, { max: 4, timeoutMs: 10000 }); } catch { return null; }
    });
    const mer = (qi, one) => {
      for (const p of one?.pages || []) if (!p.error && !seen.has(p.shop || p.url)) seen.set(p.shop || p.url, { ...p, queryKind: kindOf(queries[qi]) });
      const f = micMod.filterPagesByChapter([...seen.values()], anchors);
      mic = { query: queries.join(' | '), queryKind: f.pages.some((p) => p.queryKind === 'model') ? 'model' : kindOf(queries[qi]), searched: true, pages: f.pages, droppedOffChapter: f.droppedOffChapter, droppedNoHs: f.droppedNoHs, consensus: micMod.consensusOf(f.pages), cached: one?.cached };
    };
    mer(0, await batch[0]);
    if (!mic.consensus.heading4) {
      const rest = await Promise.all(batch.slice(1));
      for (let qi = 1; qi < queries.length; qi++) { mer(qi, rest[qi - 1]); if (mic.consensus.heading4) break; }
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

  // ───────────────────────── Gói C — Ý KIẾN PHÂN LOẠI WCO vào gói vòng 2 ─────────────────────────
  // Đưa ý kiến phân loại WCO (Compendium of Classification Opinions) của (các) ứng viên dẫn đầu vào gói vòng 2
  // để AI ĐỌC và trích dẫn — nguồn pháp lý (TT 85/2026 Điều 6.1 nguồn 2), không chỉ để chốt chặn.
  // Tra theo phân nhóm 6 số của giả thuyết + nhóm 4 số đã gom (wcoOp.byHs). Giữ nguyên tuyên bố bản quyền
  // WCO (banQuyen) như wco-op cấp. Dùng trường người-đọc-được (nguon + nguyên văn/bản dịch), không in mã nguồn nội bộ.
  const wcoLines = [];
  let wcoBanQuyen = null;
  try {
    const wcoSeen = new Set();
    const wcoKeys = [...new Set([
      ...hyps.map((h) => nz(h.subheading6).slice(0, 6)).filter((h) => h.length === 6),
      ...headings,
    ])].slice(0, 5);
    for (const key of wcoKeys) {
      if (wcoLines.length >= 5) break;
      for (const o of wcoOp.byHs(key)) {
        const v = wcoOp.view(o);
        if (!v || wcoSeen.has(v.maNguon)) continue;
        wcoSeen.add(v.maNguon);
        wcoBanQuyen = v.banQuyen;
        wcoLines.push(`  • [độ tin mã: ${v.doTinCay}] ${v.nguon}: "${clip(v.banDichVi || v.nguyenVanEn, 240)}"`);
        if (wcoLines.length >= 5) break;
      }
    }
  } catch { /* kho WCO khuyết/lỗi → bỏ, không chặn kiểm chứng */ }

  const pack = [
    // Có nguồn có nhãn (28/10/2026) → giữ 8.000 ký tự để bảng 产品参数 ở ảnh cuối trang không rơi khỏi vòng 2.
    `HỒ SƠ GỐC (nguyên văn — CHỈ được trích câu từ đây):\n${round1Input(raw).slice(0, raw.evidence ? EVIDENCE_PACK_MAX : 2500)}`,
    `HỒ SƠ BẢN CHẤT (AI vòng 1 đọc ra — là diễn giải, KHÔNG phải nguyên văn; đặc tính nào không có câu gốc đi kèm thì coi là CHƯA RÕ):\n${JSON.stringify(product, null, 0).slice(0, 2200)}`,
    `GIẢ THUYẾT VÒNG 1: ${hyps.map((h) => `${h.heading4 || ''}/${h.subheading6 || ''} (${h.confidence ?? '?'}%) — ${clip(h.why, 160)}`).join(' | ')}`,
    `CHÚ GIẢI & DÒNG BIỂU THUẾ (nguồn pháp lý):\n${notes.join('\n\n')}`,
    tables.length ? `BẢNG QUYẾT ĐỊNH:\n${tables.join('\n')}` : '',
    ozLines.length ? `TIỀN LỆ OZ:\n${ozLines.join('\n')}` : 'TIỀN LỆ OZ: không có tờ khai tương tự.',
    (tbLines.length || tbForCodes.length) ? `TIỀN LỆ TB-TCHQ:\n${[...tbLines, ...tbForCodes].join('\n')}` : '',
    conflicts.length ? `CẶP MÃ DỄ NHẦM:\n${conflicts.join('\n')}` : '',
    policies.length ? `CHÍNH SÁCH THEO MÃ (biểu thuế + danh mục oz-wiki):\n${policies.join('\n')}` : '',
    wcoLines.length ? `Ý KIẾN PHÂN LOẠI WCO (Compendium of Classification Opinions, HS 2022 — tham khảo pháp lý, không phải phán quyết):\n${wcoLines.join('\n')}\n  Bản quyền: ${clip(wcoBanQuyen, 320)}` : '',
    supplierBlock,
    mic ? `NHÀ SẢN XUẤT / SHOP TRÊN MADE-IN-CHINA (truy vấn "${mic.query}")${mic.cached ? ' [cache]' : ''}:\n${micLines.length ? micLines.join('\n') : '  không tìm thấy trang phù hợp'}${mic.consensus?.heading4 ? `\n  → ${mic.consensus.shops} shop khác nhau cùng ghi nhóm ${mic.consensus.heading4}` : ''}` : '',
    embedPool ? embedPoolMod.dongGoi(embedPool) : '',
  ].filter(Boolean).join('\n\n');
  const poolCodes = [
    ...tb.map((x) => ({ hs: nz(x.finalHsCode || x.precedent?.finalHsCode), from: 'tb-tchq' })),
    ...codePool.flatMap((c) => (conflictsDb()[c]?.confusedWith || []).map((x) => ({ hs: nz(x), from: 'cap-ma-de-nham' }))),
    ...(supplier ? [{ hs: supplier.heading4, from: 'ncc-khai' }] : []),
  ].filter((x) => x.hs.length >= 4);
  return { pack, headings, codes8: codePool, mic, supplier, ozPrecedents: oz, tables, poolCodes, embedPool, embedMs };
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
'alternatives' (mọi quyết định): nêu cả mã KHÁC NHÓM / KHÁC CHƯƠNG đã cân nhắc rồi loại — nhất là đường phân loại theo
VẬT LIỆU cho hàng là bộ phận/tấm/vỏ/giá đỡ (vd 73.26 thép, 76.16 nhôm, 39.26 plastic) — mỗi mã kèm 'whyNot' = lý do
loại bằng câu chữ chú giải (Chú giải 2 Phần XV/XVI/XVII: bộ phận nhận dạng được cho máy/xe xếp theo máy/xe).
- "HOI": hồ sơ THIẾU dữ kiện quyết định → 'hs' là mã 6 số (hoặc 8 số tạm) và 'questions' hỏi về THUỘC TÍNH của hàng
  (không nhắc mã HS, không gợi ý câu trả lời có lợi về thuế), kèm 'whereToFind' (ảnh tem/nhãn, catalogue, hỏi người bán).
'basis': lập luận đã dùng, mỗi lập luận gắn 'stream': SAN_PHAM (đặc tính hàng — evidence nguyên văn hồ sơ), CHU_GIAI
(câu chữ chú giải/biểu thuế — ref nhóm), TIEN_LE (TB-TCHQ/tờ khai Oz), NHA_SAN_XUAT (trang made-in-china / mã HS nhà cung cấp tự khai —
chỉ là nguồn kiểm chứng, không phải đáp án; chọn khác NHÓM với nhà cung cấp thì phải nêu lý do), SUY_LUAN.
Nếu có mục "LẦN TRƯỚC BỊ CHẶN", phải xử lý đúng lý do bị chặn: đổi mã, hoặc giải thích bằng câu chữ luật vì sao giữ.
Trả DUY NHẤT JSON: {"decision":"CHOT|DE_XUAT|HOI","hs":"","confidence":0-100,"reason":"ngắn, đủ để giải trình","gir":"quy tắc GIR quyết định hoặc null",
"basis":[{"stream":"","claim":"","evidence":"","ref":""}],"conditions":[{"fact":"","status":"MET|UNMET|UNKNOWN","evidence":""}],
"alternatives":[{"hs":"","whyNot":""}],"questions":[{"fact":"","question":"","whereToFind":""}]}`;
// HS_GON_DAU_RA bật: prompt gốc + khối GỌN (SYS_R2 giữ nguyên từng byte cho đường tắt).
const SYS_R2_GON = `${SYS_R2}\n${GON_R2}`;

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
  if (blocks.length) return { blocks, warnings, basis: r2.basis || [], conditions: [], tableOverride: null, tableAdvisory: null, challenges: [] }; // đủ shape — thiếu challenges từng làm crash vòng lặp sau (bắt qua test C-2)
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
  // G5 bảng quyết định đã duyệt → ghi đè (không chặn); bảng CHƯA duyệt → tư vấn (tableAdvisory), cảnh báo khi khác mã
  let tableOverride = null;
  let tableAdvisory = null;
  if (hs.length === 8) {
    try {
      const dec = resolveHeading(h4, { text: productText, parsed: parseCommodityQuery(productText) });
      if (dec?.status === 'RESOLVED' && dec.tableVerified && dec.hs && taxData[dec.hs] && dec.hs.slice(0, 4) === h4 && dec.hs !== hs) tableOverride = { from: hs, to: dec.hs, dec };
      else if (dec?.status === 'RESOLVED' && !dec.tableVerified) {
        tableAdvisory = advisoryFromDecision(dec, hs, taxData);
        if (tableAdvisory && !tableAdvisory.agrees) warnings.push(tableAdvisory.noteVi);
      }
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
  return { blocks, warnings, basis, conditions, tableOverride, tableAdvisory, challenges };
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

/**
 * Nguồn ĐỘC LẬP với AI, AI đã thấy trong gói vòng 2, ra ĐÚNG mã 8 số đang chọn: tờ khai Oz khớp ≥ 75% từ khoá (ngưỡng động cơ
 * đã tin cho cờ tiền lệ bên dưới; tìm theo từ khoá nhiễu ở mức thấp hơn) nằm trong đúng bộ lọc ozLines của gói, hoặc bảng
 * quyết định ĐÃ DUYỆT ra đúng mã. Trả mảng mô tả nguồn (rỗng = không có).
 */
function nguonDocLap(hs, gathered, productText) {
  const out = [];
  const shown = [...new Map((gathered.ozPrecedents || []).map((o) => [o.hs + o.name, o])).values()].filter((o) => o.cov >= 60)
    .sort((a, b) => (b.cov - a.cov) || (b.oz - a.oz)).slice(0, 8);
  const oz = shown.find((o) => o.hs === hs && o.cov >= 75);
  if (oz) out.push(`tờ khai Oz ${hs} (${oz.oz} lần, khớp ${oz.cov}%)`);
  try {
    const dec = resolveHeading(hs.slice(0, 4), { text: productText, parsed: parseCommodityQuery(productText) });
    if (dec?.status === 'RESOLVED' && dec.tableVerified && dec.hs === hs) out.push(`bảng quyết định đã duyệt nhóm ${hs.slice(0, 4)}`);
  } catch { /* bảng tuỳ chọn */ }
  return out;
}

/**
 * NHOM_CHUA_KIEM TẤT ĐỊNH (chỉ khi HS_MAX_VONG_SUA bật; gọi khi cổng DUY NHẤT chặn là NHOM_CHUA_KIEM).
 * Cổng G4 tồn tại để mã không được chốt khi chú giải + dòng biểu thuế của nhóm chưa được kiểm; vòng AI sửa chỉ để AI "đọc lại
 * rồi quyết" (live 25/10 "Thước kẻ 30 cm": cổng này đẩy lên 3 vòng, 277 s). Máy làm thay phần ĐỌC ĐƯỢC BẰNG MÁY, không nới cổng:
 *  1. Gom chú giải + dòng biểu thuế nhóm X (việc vòng sửa vốn phải làm), chạy LẠI TOÀN BỘ chốt chặn trên CÙNG đáp án: G4 qua vì X
 *     đã ở trong hồ sơ vụ việc; mọi cổng khác chạy y nguyên; cổng SỔ TAY (loại trừ đích danh, ngưỡng số, bộ phận, "Loại khác" —
 *     tức chú giải nhóm X đọc bằng máy) lúc trước bị chặn nên chưa chạy, giờ mới chạy.
 *  2. Còn chặn → vòng AI như cũ.
 *  3. Sổ tay nghi → lượt giải trình (vòng AI) đọc LUÔN chú giải X vừa gom (ghiChuNhom nhắc AI): một vòng thay hai (sửa + giải trình).
 *  4. Sạch → chỉ nhận khi máy kiểm được thật: (a) mã 8 số; (b) nhóm X CÓ sổ tay (bước 1 vừa đọc chú giải X bằng máy); (c) dòng
 *     8 số không vướng cảnh báo phân nhóm (checkSubheading — AI chưa thấy dòng anh em); (d) có nguồn độc lập ra ĐÚNG mã đó
 *     (nguonDocLap). Thiếu một điều → vòng AI như cũ: mã AI tự nhớ ra ngoài hồ sơ chính là ca cổng này phải chặn.
 *  Nhận thì ghi engine.gates (tatDinh) + cảnh báo antiPatternWarnings — không im lặng bỏ cổng.
 * @returns {Promise<{gathered, gatherMs, g: object|null, ghiChuNhom: string|null, log: object}>} g ≠ null → dùng thay kết quả
 *   chốt chặn cũ (đã hết chặn); g = null → vòng AI như cũ (gathered đã có nhóm X, khỏi gom lại).
 */
async function nhomChuaKiemTatDinh({ h4, r1, r2, raw, gathered, usedHeadings, gateCtx, round }) {
  usedHeadings.add(h4);
  const keepMic = gathered.mic;
  const gT0 = Date.now();
  const moi = await gather(r1, raw, { usedHeadings, micAllowed: false });
  const gatherMs = Date.now() - gT0;
  moi.mic = keepMic;
  const hs = nz(r2.hs);
  const g2 = gates(r2, { ...gateCtx, gathered: moi, pool: casePool(r1, r2, moi) });
  const log = { round, tatDinh: 'NHOM_CHUA_KIEM', nhom: h4, hs, blocks: g2.blocks.map((b) => b.gate), ...(g2.challenges.length ? { soTay: g2.challenges.map((c) => c.gate) } : {}) };
  const vongAi = (lyDo) => ({ gathered: moi, gatherMs, g: null, ghiChuNhom: null, log: { ...log, ketQua: 'VONG_AI', lyDo } });
  if (g2.blocks.length) return vongAi('con-chan');
  if (g2.challenges.length) return { gathered: moi, gatherMs, g: g2, ghiChuNhom: h4, log: { ...log, ketQua: 'GIAI_TRINH' } };
  if (hs.length !== 8) return vongAi('ma-chua-8-so');
  if (soTayMode() === 'off' || !soTayBlock(h4)) return vongAi('nhom-chua-co-so-tay');
  if (!checkSubheading(hs, gateCtx.productText).ok) return vongAi('canh-bao-phan-nhom');
  const nguon = nguonDocLap(hs, moi, gateCtx.productText);
  if (!nguon.length) return vongAi('khong-nguon-doc-lap');
  g2.warnings.push(`Nhóm ${h4}: AI chọn ${hs} khi hồ sơ vụ việc chưa có chú giải nhóm này — máy đã bổ sung chú giải + dòng biểu thuế nhóm ${h4} và kiểm lại tất định (mọi chốt chặn + sổ tay nhóm ${h4}; mã khớp ${nguon.join('; ')}) thay một vòng AI sửa.`);
  return { gathered: moi, gatherMs, g: g2, ghiChuNhom: null, log: { ...log, ketQua: 'CHAP_NHAN', nguon } };
}

// ───────────────────────── ĐỘNG CƠ ─────────────────────────
async function classifyLoop(rawAttrs, opts = {}) {
  const t0 = Date.now();
  // opts._b1bHanChot chỉ do chayLaiB1b (HS_MAX_VONG_SUA bật) đặt: lượt chạy lại B1b tính giờ theo hạn của lượt chính.
  const left = () => (opts._b1bHanChot ? opts._b1bHanChot - Date.now() : BUDGET_MS - (Date.now() - t0));
  const raw = rawAttrs || {};
  const { groundingSourceOf } = lazy();
  const imgText = (Array.isArray(raw.imageTexts) ? raw.imageTexts : []).map((t) => (typeof t === 'string' ? t : t?.text || '')).join('\n');
  const source = [groundingSourceOf(raw), imgText].filter(Boolean).join('\n');
  const log = [];
  // Đo ms từng pha (backlog 09 bước 0): để tối ưu dựa trên số đo thật thay vì phỏng đoán.
  const phases = { r1Ms: 0, gatherMs: 0, llmMs: 0 };
  const engine = { name: 'loop', rounds: 0, providers: [], gates: log };
  // Tối ưu độ trễ — đọc MỘT lần mỗi món (cả lượt chạy cùng một cấu hình). Cả hai "off" → mọi nhánh dưới y như origin/main.
  const gon = gonDauRa();
  const capVong = maxVongSua();
  const r1MaxTokens = Number(process.env.R1_MAX_TOKENS) || (gon ? R1_MAX_TOKENS_GON : 12000);
  const r2MaxTokens = Number(process.env.GIR_MAX_TOKENS) || (gon ? R2_MAX_TOKENS_GON : 20000);

  // VÒNG 1
  let r1;
  try {
    const r1Timeout = Math.min(R1_TIMEOUT_MS, Math.max(30000, left() - 170000));
    const r1T0 = Date.now();
    const r1User = raw.evidence ? `${round1Input(raw)}\n\n${rulesBlock(raw)}` : round1Input(raw);
    const { json, provider } = await callWithFallback(gon ? SYS_R1_GON : SYS_R1, r1User, { step: 'understand', minimax: stepModel('understand'), tier: opts.tier, maxTokens: r1MaxTokens, timeoutMs: r1Timeout, temperature: 0.1, ...providerOpts(r1Timeout), ...(gon ? { kiemKhoa: DU_KHOA.understand } : {}) }, log);
    phases.r1Ms = Date.now() - r1T0;
    r1 = json || {}; engine.rounds += 1; engine.providers.push(provider);
  } catch (e) {
    return withLegal({ ...classifyStatus({ headings: [], engineFailed: 'ENGINE_TIMEOUT' }), results: [], missing: ['Engine bận hoặc quá thời gian — bấm "Áp mã" lại'], candidates: { headings: [], precedentCodes: [] }, engine: { ...engine, error: String(e.message).slice(0, 120) } });
  }
  const product = r1.product || {};
  const productText = [raw.tenHang, raw.nameZh, raw.specs, raw.chatLieu, raw.congDung, imgText, product.nameVi, product.purpose, product.material, product.mechanism].filter(Boolean).join('\n');
  const machinery = (r1.hypotheses || []).some((h) => MACHINERY_CH.has(nz(h.chapter).slice(0, 2) || nz(h.heading4).slice(0, 2)));

  // KIỂM CHỨNG
  const gatherT0 = Date.now();
  let gathered = await gather(r1, raw, { micAllowed: opts.mic !== false });
  phases.gatherMs = Date.now() - gatherT0;
  phases.embedMs = gathered.embedMs || 0; // GĐ1: ms tầng ứng viên (0 = tắt/không có pool)

  // VÒNG 2 → chốt chặn → (vòng 3, 4)
  let r2 = null; let g = null; let feedback = '';
  const usedHeadings = new Set(gathered.headings);
  // Sổ tay: tối đa MỘT lượt giải trình mỗi món; `soTay` ghi kết cục để trả cho ERP + lưu hồ sơ giải trình.
  const soTay = { mode: soTayMode(), challenges: [], outcome: 'NONE', giaiTrinh: [] };
  let pending = null; // { hs, challenges } của lượt vừa yêu cầu giải trình
  let challenged = false;
  let ghiChuNhom = null; // HS_MAX_VONG_SUA: nhóm máy vừa bổ sung tất định → lượt giải trình nhắc AI đọc lại chú giải nhóm đó
  let vongSua = 0; // HS_MAX_VONG_SUA: số vòng sửa THEO LÝ DO BỊ CHẶN đã dùng (lượt giải trình sổ tay không tính)
  let chamTran = 0; // HS_MAX_VONG_SUA: vòng bị trần vòng sửa dừng lại trong khi luồng cũ còn chạy tiếp (0 = không)
  for (let round = 2; round <= MAX_ROUNDS; round++) {
    if (round > 2 && left() < RETRY_MIN_LEFT_MS) { log.push({ round, note: 'hết ngân sách thời gian — dừng lặp' }); break; }
    const rules = raw.evidence ? `\n\n${rulesBlock(raw)}` : ''; // 28/10/2026 — chỉ khi ERP gửi nguồn có nhãn
    const user = `${gathered.pack}${rules}${feedback ? `\n\n${pending ? 'LẦN TRƯỚC — ' : `LẦN TRƯỚC BỊ CHẶN (vòng ${round - 1}):\n`}${feedback}` : ''}`;
    try {
      const r2Timeout = Math.min(R2_TIMEOUT_MS, Math.max(30000, left() - 10000));
      const r2T0 = Date.now();
      const { json, provider } = await callWithFallback(gon ? SYS_R2_GON : SYS_R2, user, { step: 'gir', minimax: stepModel('gir'), tier: opts.tier, maxTokens: r2MaxTokens, timeoutMs: r2Timeout, temperature: 0.1, ...providerOpts(r2Timeout), ...(gon ? { kiemKhoa: DU_KHOA.gir } : {}) }, log);
      phases.llmMs += Date.now() - r2T0;
      r2 = json || {}; engine.rounds += 1; engine.providers.push(provider);
    } catch (e) {
      log.push({ round, error: String(e.message).slice(0, 120) });
      if (!r2) return withLegal({ ...classifyStatus({ headings: gathered.headings, engineFailed: 'ENGINE_TIMEOUT' }), results: [], missing: ['Engine bận hoặc quá thời gian — bấm "Áp mã" lại'], candidates: { headings: gathered.headings, precedentCodes: [] }, dossier: { product, hypotheses: r1.hypotheses || [] }, engine });
      break;
    }
    g = gates(r2, { source, productText, gathered, machinery, round, productName: product.nameVi || raw.tenHang, form: product.form, pool: casePool(r1, r2, gathered) });
    log.push({ round, decision: r2.decision, hs: nz(r2.hs), blocks: g.blocks.map((b) => b.gate), warnings: g.warnings.length, ...(g.challenges.length ? { soTay: g.challenges.map((c) => c.gate) } : {}) });
    // HS_MAX_VONG_SUA: cổng DUY NHẤT chặn là "nhóm chưa kiểm" → máy gom nhóm đó + kiểm lại tất định trước khi tốn vòng AI
    // (nhomChuaKiemTatDinh: điều kiện nhận, vì sao không nới cổng). Lượt giải trình sổ tay (pending) đi đường cũ.
    let daGom = false;
    if (capVong != null && !pending && g.blocks.length && g.blocks.every((b) => b.gate === 'NHOM_CHUA_KIEM')) {
      const td = await nhomChuaKiemTatDinh({ h4: g.blocks[0].addHeading, r1, r2, raw, gathered, usedHeadings, round, gateCtx: { source, productText, machinery, round, productName: product.nameVi || raw.tenHang, form: product.form } });
      gathered = td.gathered; phases.gatherMs += td.gatherMs; daGom = true;
      log.push(td.log);
      if (td.g) { g = td.g; ghiChuNhom = td.ghiChuNhom; }
    }
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
        if (ghiChuNhom) { feedback += `\nGhi chú: nhóm ${ghiChuNhom} vừa được máy bổ sung chú giải + dòng biểu thuế vào hồ sơ vụ việc (mục CHÚ GIẢI) — đọc lại trước khi giữ hay đổi mã.`; ghiChuNhom = null; }
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
    if (add && !daGom) {
      usedHeadings.add(add); const keepMic = gathered.mic;
      const gT0 = Date.now();
      gathered = await gather(r1, raw, { usedHeadings, micAllowed: false });
      phases.gatherMs += Date.now() - gT0;
      gathered.mic = keepMic;
    }
    feedback = g.blocks.map((b, i) => `${i + 1}. [${b.gate}] ${b.reasonVi}`).join('\n');
    // HS_MAX_VONG_SUA: hết lượt sửa → dừng SAU khi đã gom nhóm bổ sung (như vòng cuối của MAX_ROUNDS — để mã đang chặn vẫn nằm
    // trong ứng viên và được trả kèm cờ). Đáp án là đáp án CUỐI, đã qua mọi chốt chặn với đủ phản hồi; phần KẾT QUẢ đặt cờ y như
    // khi chạm MAX_ROUNDS (NEEDS_EXPERT/GATE_BLOCKED hoặc NEED_FACTS + "Chưa chốt được: …") — không cổng nào bị bỏ qua.
    if (capVong != null) {
      if (vongSua >= capVong) { chamTran = round < MAX_ROUNDS && left() >= RETRY_MIN_LEFT_MS ? round : 0; break; }
      vongSua += 1;
    }
  }

  if (pending) soTay.outcome = 'NO_TIME'; // đã yêu cầu giải trình nhưng hết giờ trước khi AI trả lời
  if (chamTran) log.push({ round: chamTran, note: `trần vòng sửa HS_MAX_VONG_SUA=${capVong} — dừng, trả đáp án cuối kèm cờ hiện có` });

  // KẾT QUẢ
  const { validateClassifyResults, tbTchqGate, conflictsDb } = lazy();
  let hs = nz(r2?.hs);
  const blocked = g?.blocks?.length ? g.blocks : [];
  let resolver = { status: 'SKIP' };
  if (g?.tableOverride && !blocked.length) {
    const shaped = toResolverShape(g.tableOverride.dec);
    resolver = { ...shaped, overrodeLlm: true };
  }
  let finalHs = resolver.status === 'RESOLVED' ? g.tableOverride.to : hs;
  // #195 — CHỐT DÒNG 8 SỐ bằng điều kiện số đã qua máy kiểm (kết cục D, tất định): chỉ đổi ĐUÔI trong cùng
  // phân nhóm 6, sau mọi cổng. Đúng 1 dòng thỏa → chốt; mọi dòng trái → "Loại khác" (phủ định hoàn chỉnh);
  // thiếu số → hỏi; ≥2 dòng thỏa (thiếu thuộc tính phân biệt như chất liệu) → cờ chuyên viên.
  // CÔNG TẮC RIÊNG HS_SO_TAY_DONG=on (mặc định TẮT — chạy khô 13/10: oan 2,7% đạt ngưỡng ≤10% nhưng
  // 18 ca oan chưa đọc hết; đọc tay xong + bench #193 đạt mới bật).
  let chotDong = null;
  if (soTay.mode !== 'off' && (process.env.HS_SO_TAY_DONG || '') === 'on' && finalHs.length >= 6 && !blocked.length) {
    chotDong = chotDong8({ hs: finalHs, productText });
    if (chotDong?.checked && (chotDong.ketQua === 'CHOT' || chotDong.ketQua === 'LOAI_KHAC') && chotDong.hs && chotDong.hs !== finalHs) {
      finalHs = chotDong.hs;
      chotDong.daDoi = true;
    }
  }
  const alts = ganLyDoThayThe((Array.isArray(r2?.alternatives) ? r2.alternatives : []).map((a) => ({ hs: nz(a.hs), confidence: null, reason: clip(a.whyNot, 200), source: 'engine-loop:alt' })).filter((a) => a.hs.length >= 6 && a.hs !== finalHs), { tu: 0 });
  let results = finalHs ? [{
    hs: finalHs, confidence: Math.max(0, Math.min(100, Number(r2.confidence) || 0)), reason: clip(r2.reason, 400), basis: g?.basis || [],
    conditions: g?.conditions || [], source: 'engine-loop',
    ...(resolver.status === 'RESOLVED' ? { resolverOverride: { from: g.tableOverride.from, ...(resolver.trace?.[0] || {}) }, reason: g.tableOverride.dec.reasonVi || clip(r2.reason, 400), confidence: Math.max(Number(r2.confidence) || 0, 85) } : {}),
    ...(hs !== finalHs ? {} : {}),
  }, ...(resolver.status === 'RESOLVED' && hs !== finalHs ? [{ hs, confidence: Math.min(Number(r2.confidence) || 0, 50), reason: clip(r2.reason, 200), source: 'engine-loop' }] : []), ...alts].slice(0, 3) : [];
  results = validateClassifyResults(results, gathered.headings).results;
  for (const r of results) { r.hsLevel = r.hs.length; const t = tbTchqGate(r.hs); if (t.hasPrecedent) r.tbTchq = t.entries; }
  const top = results[0];
  // #195: dòng do MÁY chốt theo điều kiện số có trích dẫn → tự tin tối thiểu 85 + căn cứ DETERMINISTIC.
  if (top && chotDong?.daDoi) {
    top.confidence = Math.max(Number(top.confidence) || 0, 85);
    top.reason = `${clip(r2?.reason, 200)} — chốt dòng ${chotDong.hs} theo điều kiện số sổ tay (${(chotDong.dieuKien || []).map((c) => `${c.fact} ${c.op} ${c.value} ${c.donVi}`).join('; ')})`;
    top.dongChot = { tu: chotDong.tuHs, den: chotDong.hs, traNguon: (chotDong.traNguon || []).slice(0, 2) };
  }

  const questions = (Array.isArray(r2?.questions) ? r2.questions : []).filter((q) => q && (q.question || q.fact)).slice(0, 6)
    .map((q) => ({ attribute: null, fact: clip(q.fact, 120), questionVi: clip(q.question || `Xác nhận: ${q.fact}?`, 200), whereToFind: clip(q.whereToFind, 80) }));
  // #195: cổng chốt dòng thiếu số hồ sơ → câu hỏi dữ kiện có mục tiêu (điều kiện sổ tay nêu đúng ngưỡng cần).
  if (chotDong?.ketQua === 'THIEU_SO_LIEU') {
    for (const m of chotDong.missingFacts || []) {
      questions.push({ attribute: null, fact: m.fact, questionVi: `Cần ${m.fact.replace(/_/g, ' ')} (${m.donVi}) để chốt dòng 8 số — sổ tay yêu cầu ${m.canThoa} ${m.donVi}.`, whereToFind: 'Thông số trên tem/nhãn hàng hoặc trang bán hàng.' });
    }
  }
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
  // Bảng quyết định CHƯA duyệt chỉ về mã khác → chuyên viên xem, mã bảng có mặt trong results để chọn.
  const decisionAdvisory = g?.tableAdvisory || null;
  if (top && !blocked.length && decisionAdvisory && !decisionAdvisory.agrees && top.hs !== decisionAdvisory.hs) {
    review.needed = true;
    review.reasons.push(decisionAdvisory.noteVi);
    if (!results.some((r) => r.hs === decisionAdvisory.hs)) {
      results = [...results.slice(0, 2), { hs: decisionAdvisory.hs, hsLevel: 8, confidence: null, reason: decisionAdvisory.reasonVi, source: 'decision-table-advisory', tableVerified: false }];
    }
  }
  // Sổ tay: máy nghi mà AI không giải trình được bằng câu trích hồ sơ (hoặc hết giờ) → chuyên viên xem.
  if (top && !blocked.length && ['UNRESOLVED', 'NO_TIME'].includes(soTay.outcome)) {
    review.needed = true;
    const open = soTay.outcome === 'NO_TIME' ? soTay.challenges : soTay.challenges.filter((c) => !soTay.giaiTrinh.find((x) => x.gate === c.gate && x.verified));
    for (const c of open) review.reasons.push(`Sổ tay chú giải: ${clip(c.reasonVi, 200)}`);
  }
  // #195: điều kiện số chồng lấn (thiếu thuộc tính phân biệt như chất liệu) → chuyên viên chốt dòng.
  if (top && !blocked.length && chotDong?.ketQua === 'TRANH_CAP') {
    review.needed = true;
    review.reasons.push(`Điều kiện dòng 8 số chồng lấn: ${(chotDong.dongThoa || []).join(', ')} cùng thoả ngưỡng — cần thuộc tính phân biệt (chất liệu/công dụng) để chốt dòng.`);
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
      review.reasons.push(`Tiền lệ Oz (${lead[1]} tờ khai khớp ≥75% trọng số từ khoá) xếp nhóm ${lead[0]}, hệ thống chốt ${top.hs.slice(0, 4)} — chuyên viên đối chiếu`);
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
  // ───────────────────── Gói C — WCO + tiền lệ độc lập NÂNG tự tin (có bằng chứng, có trần) ─────────────────────
  // Evidence-backed, bounded, capped confidence lifts. Applied AFTER the hs is chosen and AFTER every gate, so they
  // NEVER change WHICH hs is picked — only the score of an already-chosen 8-digit top.hs — and each leaves an
  // auditable `basis` entry. They never fire when a gate blocked. Hard cap 95 (same as supplier-SAME6): the two
  // lifts share the one cap, so WCO + precedent can never stack confidence past 95. These are NOT free signals —
  // each requires a real, traceable source (a WCO opinion; ≥3 independent precedent sources).
  if (top && !blocked.length && /^\d{8}$/.test(top.hs)) {
    // (1) WCO: có ý kiến phân loại WCO cho hs6 của mã đã chốt → +8 (trần 95), kèm basis WCO truy nguyên được.
    //     Mirror hình dạng khối supplier-SAME6: append vào top.basis rồi Math.min(95, +boost).
    try {
      const wops = wcoOp.byHs(top.hs.slice(0, 6));
      const wview = (wops && wops[0]) ? wcoOp.view(wops[0]) : null;
      if (wview) {
        top.basis = [...(top.basis || []), {
          stream: 'WCO',
          claim: `Có ý kiến phân loại WCO cho phân nhóm ${wview.hsDinhDang} (${wview.nguon})`,
          evidence: wview.maNguon,
          ref: `/api/wco-opinions?hs=${wops[0].hs}&n=${wops[0].ord}`,
          verified: true,
        }];
        top.confidence = Math.min(95, (Number(top.confidence) || 0) + 8);
      }
    } catch { /* kho WCO khuyết/lỗi → bỏ nâng tự tin, không chặn động cơ */ }
    // (2) Tiền lệ: ≥3 nguồn ĐỘC LẬP (khác loaiNguon + khác URL) đồng thuận mã đã chốt → +5 (cùng trần 95),
    //     kèm basis TIEN_LE. Đây là ĐƯỜNG nâng tự tin RIÊNG, có kiểm — TÁCH khỏi rankingSignals bên dưới
    //     (vẫn giữ nguyên signal xếp hạng); hai đường để lại dấu vết kiểm toán độc lập nhau.
    try {
      const snd = countIndependentSources(top.hs);
      if (snd.independent >= 3) {
        top.basis = [...(top.basis || []), {
          stream: 'TIEN_LE',
          claim: `${snd.independent} nguồn độc lập (${Object.entries(snd.byLoai).map(([k, v]) => `${k}:${v}`).join(', ')}) đồng thuận mã ${top.hs}`,
          evidence: (snd.sample || []).map((s) => s.id).filter(Boolean).join(', ') || null,
          ref: null,
          verified: true,
          note: 'Nâng tự tin có kiểm — đếm nguồn khác loaiNguon + URL (lib/precedent-search.js), trần 95; là bằng chứng xếp hạng, KHÔNG phải căn cứ GIR.',
        }];
        top.confidence = Math.min(95, (Number(top.confidence) || 0) + 5);
      }
    } catch { /* countIndependentSources lỗi → bỏ nâng tự tin, không chặn động cơ */ }
  }
  const girVerdict = determineGir({ description: [product.nameVi, product.material, product.purpose].filter(Boolean).join(' '), candidates: results.map((r) => r.hs), pickedHs: top?.hs || null, resolver: resolver.status === 'RESOLVED' ? resolver : null, llmGir: r2?.gir || null });
  const conflict = top?.hs?.length === 8 ? conflictsDb()[top.hs] : null;
  // Bước 12 (C-2): tín hiệu HS người bán Made-in-China — CHỈ CHÚ THÍCH kèm ghi chú ranh giới;
  // luật sắt: hint là tín hiệu xếp hạng, không có đường nào từ hint tới mã chốt (test chặn trong test-engine-loop).
  let micSignalOut = null;
  if (gathered.mic?.consensus?.heading4) {
    const micHs = (gathered.mic.pages || []).map((p) => nz(p.hsCode)).find((h) => h.startsWith(nz(gathered.mic.consensus.heading4)));
    if (micHs) micSignalOut = { ...micSignal(micHs), shops: gathered.mic.consensus.shops, ghiChu: MIC_GHI_CHU };
  }
  // #307 — rankingSignals[] (hình dạng khớp lib/gir-engine.js#applyGirRules: {signal, effect, note}).
  // Engine-loop chưa có bước xếp hạng ứng viên rõ ràng (AI chốt trực tiếp); ghi signal để dossier/cổng
  // hiển thị và cho telemetry thấy — KHÔNG đi vào finalHs/basis/girRulesApplied/resolver/DETERMINISTIC.
  const rankingSignals = [];
  // B-4/B-7 #311: soNguonDongThuan — đếm số nguồn ĐỘC LẬP (khác loaiNguon + khác URL)
  // đồng thuận cùng outcomeHs cho mã AI chốt. Tín hiệu xếp hạng, KHÔNG đưa vào basis/GIR.
  if (top?.hs && /^\d{8}$/.test(top.hs)) {
    try {
      const snd = countIndependentSources(top.hs);
      if (snd.independent >= 2) {
        rankingSignals.push({
          signal: 'signal:soNguonDongThuan',
          hs8: top.hs,
          effect: `${snd.independent} nguồn độc lập (${Object.entries(snd.byLoai).map(([k, v]) => `${k}:${v}`).join(', ')}) đồng thuận mã ${top.hs}`,
          note: 'TÍN HIỆU xếp hạng, không phải căn cứ pháp lý. Đếm nguồn khác loaiNguon + URL trong lib/precedent-search.js.',
          independent: snd.independent,
          byLoai: snd.byLoai,
        });
      }
    } catch { /* countIndependentSources lỗi → bỏ tín hiệu, không chặn engine */ }
  }
  if (micSignalOut) {
    rankingSignals.push({
      signal: 'signal:mic',
      hs6: micSignalOut.hs6,
      effect: `${micSignalOut.shops} shop khác nhau đồng thuận nhóm ${micSignalOut.hs4}`,
      note: MIC_GHI_CHU,
    });
    appendSignalMicLog({
      hs6: micSignalOut.hs6,
      hs4: micSignalOut.hs4,
      shops: micSignalOut.shops,
      finalHs: top?.hs || null,
      agreedHeading: top?.hs?.slice(0, 4) === micSignalOut.hs4, // signal đồng ý với mã AI chốt?
      chapters: gathered.headings,
    });
  }
  const dossierOut = {
    product, hypotheses: (r1.hypotheses || []).slice(0, 3), unknowns: (r1.verify?.unknowns || []).slice(0, 6), verify: r1.verify || null,
    embedPool: gathered.embedPool ? { nhom4: gathered.embedPool.nhom4.slice(0, 5), nhom6: gathered.embedPool.nhom6.slice(0, 5), model: gathered.embedPool.model } : null, // GĐ1: tín hiệu xếp hạng, không bằng chứng
    mic: gathered.mic ? { query: gathered.mic.query, queryKind: gathered.mic.queryKind || null, droppedOffChapter: gathered.mic.droppedOffChapter || 0, consensus: gathered.mic.consensus, ...(micSignalOut ? { signal: micSignalOut } : {}), pages: (gathered.mic.pages || []).filter((p) => !p.error).map((p) => ({ shop: p.shop, name: p.name, hsCode: p.hsCode, material: p.props?.material || null, usage: p.props?.usage || p.props?.application || null, url: p.url })) } : null,
    decision, conditions: top?.conditions || [], alternatives: alts,
    supplier: sup ? { code: sup.code, hs6: sup.hs6, heading4: sup.heading4, source: sup.source, url: sup.url, agree: supAgree } : null,
  };
  // Bảng phương án khai (CEO 10/10/2026): mã chọn + cùng nhóm + đường VẬT LIỆU (7326/7616/3926…) + nguồn khác nhóm,
  // kèm căn cứ/rủi ro/thuế — chuyên viên thấy cả phương án máy đã loại, không bị bó trong một nhóm.
  let declarationOptions = [];
  try {
    declarationOptions = top && !blocked.length ? require('./declaration-options.js').buildDeclarationOptions({
      top: { ...top, gir: r2?.gir || null }, results, dossier: dossierOut, gathered, review,
      materialTexts: [raw.chatLieu, raw.specs], partTexts: [raw.tenHang, raw.nameZh, raw.congDung],
    }) : [];
  } catch (e) { log.push({ note: 'declaration-options lỗi', error: String(e?.message || e).slice(0, 100) }); }
  dossierOut.declarationOptions = declarationOptions;
  const loopOut = {
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
    decisionAdvisory,
    review,
    ...(soTay.mode !== 'off' ? { soTay: { ...soTay, ...(chotDong?.checked ? { chotDong: { ketQua: chotDong.ketQua, tu: chotDong.tuHs || null, den: chotDong.hs || null, lyDo: chotDong.lyDo || null } } : {}), challenges: soTay.challenges.map(({ gate, h4, target, matched, reasonVi, questionVi, legal }) => ({ gate, h4, target, matched: matched || null, reasonVi, questionVi, legal })) } } : {}),
    dossier: dossierOut,
    queryUnderstanding: { applied: true, searchTextVi: product.nameVi || null, productFactsVi: { tenHangVi: product.nameVi, banChat: product.purpose, chatLieu: product.material, congDung: product.purpose } },
    candidates: { headings: gathered.headings, precedentCodes: [...new Map(gathered.ozPrecedents.map((o) => [o.hs, { hs: o.hs, ozCount: o.oz }])).values()].slice(0, 10) },
    rankingSignals,
    engine: {
      ...engine, phases, tier: opts.tier === 'premium' ? 'premium' : 'standard', provider: engine.providers[engine.providers.length - 1] || null, ms: Date.now() - t0,
      // Cấu hình tối ưu độ trễ của lượt này (bench kiểm nhánh đo bật thật, chống no-op) — vắng mặt khi cả hai công tắc "off".
      ...(gon || capVong != null ? { toiUu: { gonDauRa: gon, maxVongSua: capVong, r1MaxTokens, r2MaxTokens } } : {}),
      // #425: debug (body.debug / ?debug=1) → lộ nhật ký từng bước (retry/fallback kèm cause, ms, timeoutMs) + cấu hình
      // timeout theo bước + mạch đang mở, để đo bước nào treo. Không debug → shape như cũ (gates vẫn có).
      ...(opts.debug ? { log, llm: { timeoutMs: { understand: llmTier.stepTimeoutMs('understand', R1_TIMEOUT_MS), gir: llmTier.stepTimeoutMs('gir', R2_TIMEOUT_MS) }, ngatMach: llmTier.ngatMachTrangThai() } } : {}),
    },
  };
  // Căn cứ pháp lý (TT 85/2026) — mọi trích điều luật đi qua lib/legal-basis.js.
  loopOut.canCuPhapLy = canCuPhapLy({
    status: loopOut.status, topHs: top?.hs || null,
    description: [product.nameVi, product.material, product.purpose].filter(Boolean).join(' '),
    precedentCount: (top?.tbTchq || []).length, girDeterminations: (girVerdict.determinations || []).length,
  });
  // Sổ tay (chế độ cố vấn 3a): không đổi mã đã chọn, không đổi prompt vòng 2.
  // Chế độ quyết định 3b (HS_SO_TAY=gates|full) đã trả khối soTay của động cơ — cố vấn KHÔNG ghi đè.
  if (!loopOut.soTay) {
    const soTayBlock = soTayRuntime.advise({ topHs: top?.hs || null, candidates: gathered.headings, sanPham: { tenHang: product.nameVi || raw.tenHang, chatLieu: raw.chatLieu || product.material || null, congDung: raw.congDung || product.purpose || null, specs: raw.specs || null } });
    if (soTayBlock) loopOut.soTay = soTayBlock;
  }
  // B1b (doc 12): NEED_FACTS → tra web theo mục tiêu. shadow: chỉ webHint; on: chạy lại
  // đúng một lượt với dữ kiện web gắn nhãn "chưa kiểm chứng" (cờ _b1bDaThu chặn đệ quy).
  // HS_MAX_VONG_SUA bật (mặc định): logic B1b của main giữ NGUYÊN (b1bApDung quyết khi nào tra web, nhận lượt chạy lại nào),
  // chỉ bọc lượt chạy lại bằng chayLaiB1b — hai rào mà bản main (#467) thiếu:
  //  (1) NGÂN SÁCH: lượt chạy lại mở t0 + 285 s MỚI → lượt chính + tra web + lượt chạy lại có thể gần gấp đôi, vượt trần 300 s
  //      của server.js → 504, khách mất luôn đáp án NEED_FACTS. Nay dùng chung hạn của lượt chính; còn < B1B_LAI_MIN_MS thì
  //      không chạy lại (trả NEED_FACTS + webHint như shadow).
  //  (2) LƯỢT CHẠY LẠI HỎNG không thay đáp án hợp lệ: b1bApDung nhận mọi trạng thái ≠ NEED_FACTS, kể cả NEEDS_EXPERT/RETRY
  //      rỗng do hết giờ → trả null để nó giữ đáp án gốc + webHint.
  //  Lượt chạy lại đọc lại cùng công tắc (gonDauRa/maxVongSua đọc env lúc gọi); trần vòng sửa áp RIÊNG từng lượt (vongSua cục bộ);
  //  bản thân lượt chạy lại KHÔNG tính vào HS_MAX_VONG_SUA (không phải vòng sửa theo lý do bị chặn — tổng giờ do rào (1) giữ);
  //  _b1bDaThu chặn đệ quy (lượt chạy lại không tra web lần hai). HS_MAX_VONG_SUA=off → gọi y hệt main.
  const hanChot = opts._b1bHanChot || t0 + BUDGET_MS;
  const chayLaiB1b = async (a) => {
    const conMs = hanChot - Date.now();
    if (conMs < B1B_LAI_MIN_MS) { log.push({ note: `b1b: không chạy lại — còn ${Math.round(conMs / 1000)} s < ${B1B_LAI_MIN_MS / 1000} s ngân sách` }); return null; }
    const lai = await classifyLoop(a, { ...opts, _b1bDaThu: true, _b1bHanChot: hanChot });
    if (!lai || lai.engine?.error || lai.nextAction?.type === 'RETRY' || !(Array.isArray(lai.results) && lai.results.length)) {
      log.push({ note: `b1b: lượt chạy lại không ra mã (${lai?.nextAction?.reasonCode || lai?.status || 'rỗng'}) — giữ đáp án gốc` });
      return null;
    }
    return lai;
  };
  try {
    return await require('./b1b-web.js').b1bApDung(rawAttrs, loopOut, opts, capVong == null
      ? (a) => classifyLoop(a, { ...opts, _b1bDaThu: true })
      : chayLaiB1b);
  } catch (e) {
    // Tầng tuỳ chọn: không bao giờ làm hỏng lượt chính — nhưng KHÔNG nuốt im (c63104c: webHint mất mà không ai biết).
    // MỘT dòng JSON ra stderr, chỉ thông điệp lỗi: không mô tả hàng, không khoá.
    try { process.stderr.write(`${JSON.stringify({ type: 'b1b_error', ts: new Date().toISOString(), msg: String(e?.message || e).slice(0, 200) })}\n`); } catch { /* ghi log hỏng cũng không làm hỏng lượt chính */ }
  }
  return loopOut;
}

module.exports = {
  classifyLoop, callWithFallback, gates, gather, round1Input, casePool, judgeExplanations, challengeText, soTayMode, SYS_R1, SYS_R2, isGeminiBillingError, normalizeSupplierHs, supplierAgree,
  // Tối ưu độ trễ (backlog 09 bước 3+4) — cho test/bench.
  gonDauRa, maxVongSua, SYS_R1_GON, SYS_R2_GON, TRAN, DU_KHOA, R1_MAX_TOKENS_GON, R2_MAX_TOKENS_GON, VONG_SUA_MAC_DINH, B1B_LAI_MIN_MS, nhomChuaKiemTatDinh, nguonDocLap,
};
