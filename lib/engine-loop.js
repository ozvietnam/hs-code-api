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
const { classifyStatus, matchTextOf, missingQuaGio } = require('./classify-guards.js');
const { checkPolarity, checkSubheading } = require('./subheading-check.js');
const { resolveHeading, toResolverShape, advisoryFromDecision } = require('./decision-tables.js');
const { parseCommodityQuery } = require('./query-parse.js');
const ozSearch = require('./oz-precedent-search.js'); // gọi qua module để test thay được
const { searchPrecedents, countIndependentSources } = require('./precedent-search.js');
const { doGiongTenHang } = require('./giong-ten-hang.js');
const { buildEcus } = require('./describe-ecus.js');
const { getNoteSummaryForHs } = require('./explanatory-notes-index.js');
const { determineGir } = require('./gir.js');
const { canCuPhapLy } = require('./legal-basis.js');
const soTayRuntime = require('./so-tay-runtime.js');
// #359: mỗi mã thay thế AI nêu ra phải kèm tên dòng biểu thuế 8 số (xem lib/ma-thay-the.js).
const { ganLyDoThayThe } = require('./ma-thay-the.js');
// #725-46: luật tất định trước khi CHOT ("Loại khác" bị trừ + tiền lệ cùng loại hàng ngược) + nhãn lý do AI chưa kiểm.
const kiemTruocChotMod = require('./kiem-truoc-chot.js');
const { tradeClassifyHints, biCamTrade, tradePreferredHs } = require('./trade-classify-hints.js');

// Phản hồi không chốt được mã (AI lỗi/quá giờ): vẫn ghi căn cứ pháp lý của trạng thái.
const withLegal = (o) => ({ ...o, canCuPhapLy: canCuPhapLy({ status: o.status, topHs: null }) });
const { missingStructured: missingStructuredFor } = require('./declaration-fields.js');
const hoiTheoSoTay = require('./hoi-theo-so-tay.js');
const chotSomCoKiem = require('./chot-som-co-kiem.js'); // HS_CHOT_SOM_CO_KIEM (mặc định TẮT): tín hiệu trái nhóm ⇒ không bỏ vòng 2
const duongDoThi = require('./do-thi/duong-do-thi.js'); // HS_TIM_TRUOC=do-thi (mặc định TẮT): ráp giai đoạn 3–5 của kế hoạch đồ thị
const timTruocMod = require('./tim-truoc.js'); // HS_TIM_TRUOC (mặc định TẮT): tìm trong kho TRƯỚC vòng 1, đưa ứng viên vào đầu vào vòng 1 + gather
const { buildTaxLookup } = require('./tax-lookup.js');
const micMod = require('./mic-lookup.js'); // gọi qua module để test thay được micLookup
const embedPoolMod = require('./embed-pool.js'); // GĐ1 (#377): tầng ứng viên embedding — test thay được poolNhom
const { soTayBlock, soTayGates, chotDong8, soTayMode } = require('./so-tay-gates.js'); // soTayMode: công tắc HS_SO_TAY dùng chung
const moTaDieuKienNgan = (c) => require('./dieu-kien-so.js').moTaNgan(c); // #573: lời ngắn cho điều kiện có kiểu (nạp chậm)
// Gói C: ý kiến phân loại WCO (TT 85/2026 Điều 6.1 nguồn 2) — đưa vào gói vòng 2 + nâng tự tin có kiểm.
const wcoOp = require('./wco-op.js');
const { micSignal, GHI_CHU: MIC_GHI_CHU } = require('./mic-signal.js'); // #299 C-2: chỉ tín hiệu, không bằng chứng
const { appendSignalMicLog } = require('./ml-log.js'); // #307: telemetry signal:mic (best-effort JSONL)

// OZV-1314: mặc định ≤ 85 s (trần Cổng/Cloudflare ~95–100 s). Trước: 285 s → spike 118–286 s thành BACKEND_LOI.
// Ghi đè env CLASSIFY_BUDGET_MS khi bench/nội bộ cần ngân sách dài (vd test-classify-minimax-cham đặt 285000).
const BUDGET_MS_MAC_DINH = 85000;
const BUDGET_MS = Number(process.env.CLASSIFY_BUDGET_MS) > 0 ? Number(process.env.CLASSIFY_BUDGET_MS) : BUDGET_MS_MAC_DINH;
const MAX_ROUNDS = 4; // vòng 1 + vòng 2 + tối đa 2 lần sửa theo lý do bị chặn
// Ngân sách thời gian (MiniMax M2.7 "suy nghĩ" 30–120 s/lượt): vòng 1 ≤ 90 s, vòng 2 ≤ 150 s, vòng sửa chỉ khi còn ≥ 80 s.
const R1_TIMEOUT_MS = Number(process.env.LOOP_R1_TIMEOUT_MS) || 100000;
const R2_TIMEOUT_MS = Number(process.env.LOOP_R2_TIMEOUT_MS) || 160000;
const RETRY_MIN_LEFT_MS = 80000;
// #725 lỗi 45 — lần gọi lại "tắt suy nghĩ" (lưới an toàn khi JSON cụt / quá giờ). #425 hạ 60 s → 30 s cứng. Nhưng khi mẫu hồ sơ
// (MiniMax-M3, tắt được suy nghĩ, 2–10 s) không dùng được (4xx), chat() lùi về MiniMax-M2.7-highspeed — mẫu KHÔNG tắt được suy
// nghĩ — mà một lời gọi /api/describe bằng chính mẫu này đo trên prod 02/11/2026 mất ~30 s: trần 30 s là 0% biên, lưới an toàn
// gần như chắc hết giờ. 45 s = 1,5 × 30 s (biên 50%). Trần chỉ tốn thêm khi lời gọi THẬT SỰ chậm; khi M3 trả trong 2–10 s thì
// không tốn gì. Luôn bị chặn thêm bởi hạn chót lượt (không bao giờ đẩy tổng vượt CLASSIFY_BUDGET_MS). Giá trị TẠM — chỉnh theo
// p95 đo ở docs/viec/yeu-cau-2026-11-02-do-do-tre-minimax.md. Ghi đè: LOOP_THINKING_OFF_TIMEOUT_MS.
const THINKING_OFF_TIMEOUT_MS_MAC_DINH = 45000;
const thinkingOffTimeoutMs = () => Number(process.env.LOOP_THINKING_OFF_TIMEOUT_MS) > 0 ? Number(process.env.LOOP_THINKING_OFF_TIMEOUT_MS) : THINKING_OFF_TIMEOUT_MS_MAC_DINH;
// Còn dưới mức này tới hạn chót thì KHÔNG gọi lại "tắt suy nghĩ": MiniMax-M3 tắt suy nghĩ nhanh nhất đo được ~2 s + mạng; dưới
// 5 s gần như chắc hết giờ — tốn tiền mà không ra mã, lại đẩy lượt sát trần 300 s của server.js.
const THINKING_OFF_MIN_CON_MS = 5000;
// OZV-1267 — khi MiniMax ĐÃ ngắt mạch TIMEOUT cho bước understand: kẹp trần dự phòng ≤ 15 s và không gọi lại
// thinking-off (chỉ nhắm MiniMax). Không đổi ngân sách understand khi mạch đóng — MiniMax khoẻ vẫn được 20–74 s.
// Env `LLM_TIMEOUT_MS_UNDERSTAND` / `HS_UNDERSTAND_FAILFAST_MS` ghi đè trần fail-fast.
const UNDERSTAND_FAILFAST_MS_MAC_DINH = 15000;
function understandFailfastMs(baseMs) {
  const env = Number(process.env.HS_UNDERSTAND_FAILFAST_MS || process.env.LLM_TIMEOUT_MS_UNDERSTAND);
  const tran = Number.isFinite(env) && env > 0 ? Math.floor(env) : UNDERSTAND_FAILFAST_MS_MAC_DINH;
  return baseMs != null ? Math.min(tran, baseMs) : tran;
}
// OZV-1271 — mirror OZV-1267 cho bước gir: mạch MiniMax|gir mở → kẹp ≤ 15 s, bỏ thinking-off (đã chung ở dưới).
// Không đổi ngân sách gir khi mạch đóng. Env `LLM_TIMEOUT_MS_GIR` / `HS_GIR_FAILFAST_MS` ghi đè trần fail-fast.
const GIR_FAILFAST_MS_MAC_DINH = 15000;
function girFailfastMs(baseMs) {
  const env = Number(process.env.HS_GIR_FAILFAST_MS || process.env.LLM_TIMEOUT_MS_GIR);
  const tran = Number.isFinite(env) && env > 0 ? Math.floor(env) : GIR_FAILFAST_MS_MAC_DINH;
  return baseMs != null ? Math.min(tran, baseMs) : tran;
}
// #725-45: engine.error / nhật ký cắt lỗi ở 120 ký tự, mà riêng câu mở đầu của NO_PRIVATE_LLM ("không có nhà cung cấp LLM hợp lệ
// cho dữ liệu khách (danh sách trắng: …) — ") đã ~110 ký tự → prod chỉ thấy "3 nhà cung cấp hợ…", mất lý do thật. Rút câu mở đầu
// (mã lỗi NO_PRIVATE_LLM vẫn giữ ở đầu) trước khi cắt. Lỗi khác giữ nguyên từng byte.
const tomTatLoi = (msg, n = 120) => String(msg || '').replace(/^NO_PRIVATE_LLM: không có nhà cung cấp LLM hợp lệ cho dữ liệu khách \(danh sách trắng: [^)]*\)( — )?/, 'NO_PRIVATE_LLM: ').slice(0, n);
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
const TRAN_TIN_CAY_KIEM_CHOT = 60; // #725-46: luật trước khi chốt bắn → tin cậy ≤ 60 (declaration-options: < 75 không bao giờ THẤP)
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
// ───────────────────────── FAST-FIRST: NHANH TRƯỚC, LEO SÂU (OZV-570, phương án A của OZV-559) ─────────────────────────
// Mục tiêu A3: phan_loai_hs p50 ≤ 10 s (đo prod 12/11: p50 43,2 s; lời GIR vòng 2 = 55–65% thời gian, TB 23,4 s/lời).
// CẤM tắt thinking CỨNG (§2c: −7–16 điểm Đ8) — chỉ bớt lời khi CHẮC, còn lại leo sâu như cũ ⇒ không bao giờ tệ hơn hôm nay.
//  - HS_CLASSIFY_FAST_FIRST (mặc định TẮT = hành vi prod y hệt hôm nay; on|1|true = bật, đọc LÚC GỌI như hai công tắc trên).
//  - Khi bật: vòng 1 gọi MiniMax với thinking TẮT (đúng tham số cờ sẵn có `extraBody.thinking.type='disabled'` — cùng
//    cơ chế lưới an toàn/tiền lệ đã chạy trong callWithFallback, KHÔNG tham số mới); sau kiểm chứng, CỔNG TẤT ĐỊNH (toàn
//    máy móc, không hỏi AI lần nào nữa) xét hồ sơ có "rõ" không: rõ ⇒ BỎ lời GIR vòng 2, chốt bằng kết quả vòng 1; không
//    rõ ⇒ gọi vòng 2 thinking-on Y NHƯ CŨ. Điều kiện "rõ" chỉ dùng cổng có sẵn — KHÔNG hardcode chuỗi mã/ngành:
//      · giả thuyết dẫn đầu vòng 1: phân nhóm 6 số có trong biểu thuế (G1) + tự tin ≥ FAST_FIRST_TU_TIN;
//      · không còn dữ kiện chưa rõ (r1.verify.unknowns rỗng — chính vòng 1 khai "điều hồ sơ chưa nói mà quyết định mã");
//      · NGUỒN ĐỘC LẬP xác nhận đúng MỘT mã 8 số cùng PHÂN NHÓM 6 SỐ của vòng 1: cổng nguonDocLap có sẵn (tiền lệ Oz khớp
//        ≥ 75% — đúng ngưỡng động cơ đã tin ở phần KẾT QUẢ — hoặc bảng quyết định ĐÃ DUYỆT resolveHeading); nguồn ra NHIỀU
//        mã khác nhau ⇒ mâu thuẫn ⇒ leo sâu, không chốt;
//      · mã đó không nằm trong bảng cặp mã dễ nhầm (conflictsDb).
//    Đáp án fast-path vẫn qua TOÀN BỘ chốt chặn gates() (G1–G8) như một lượt vòng 2 thật — cổng nào chặn ⇒ bỏ fast-path,
//    leo sâu (vòng 2 như cũ). Đáp án vòng 1 không bao giờ đi thẳng ra ngoài mà không qua cổng.
const FAST_FIRST_TU_TIN = 75; // ngưỡng CÓ SẴN của động cơ: nguonDocLap tin tiền lệ Oz ở cov ≥ 75; cổng cờ tiền lệ ở KẾT QUẢ cùng dùng 75.
/** HS_CLASSIFY_FAST_FIRST: on|1|true = bật; trống/giá trị khác = TẮT (hành vi như trước OZV-570). */
function fastFirstBat() {
  return ['on', '1', 'true', 'yes'].includes(String(process.env.HS_CLASSIFY_FAST_FIRST ?? '').trim().toLowerCase());
}
/** OZV-1384: tiền tố 6 số có ít nhất một dòng 8 số trong biểu thuế hiện hành — cùng phép kiểm G1 dùng cho 6 số. */
function coTienToTrongBieu(p) {
  return Boolean(p) && Object.keys(taxData).some((k) => k.startsWith(p));
}
/** OZV-1384: nhóm 4 số có ĐÚNG MỘT phân nhóm 6 số trong biểu → trả phân nhóm đó; 0 hoặc ≥ 2 → null. */
function phanNhomDuyNhat(h4) {
  const s = new Set(Object.keys(taxData).filter((k) => k.startsWith(h4)).map((k) => k.slice(0, 6)));
  return s.size === 1 ? [...s][0] : null;
}
/** OZV-1388: phân nhóm 6 số có ĐÚNG MỘT dòng 8 số trong biểu → trả dòng 8 số đó; 0 hoặc ≥ 2 → null. */
function dong8DuyNhat(hs6) {
  if (!hs6 || hs6.length !== 6) return null;
  const ds = Object.keys(taxData).filter((k) => k.length === 8 && k.startsWith(hs6));
  return ds.length === 1 ? ds[0] : null;
}
/**
 * OZV-1269 early-exit HOI: khi gonDauRa và vòng 1 đã khai unknowns (điều hồ sơ thiếu để chốt mã),
 * dựng đáp án HOI từ giả thuyết dẫn đầu — bỏ lời GIR (~21 s đo A3 16/11 ca giác hút SMC).
 * Trả null nếu không đủ điều kiện → gọi GIR như cũ. Không đụng fast-first / thinking (§2c).
 */
function earlyExitHoiTuR1(r1) {
  // OZV-1380: phần tử unknowns theo khuôn SYS_R1 là chuỗi; nhận thêm object {fact|question} (chuỗi trong object) —
  // trước đây String(object) ra "[object Object]" thành câu hỏi rác. Không đọc khoá khác ngoài verify.unknowns.
  const unknowns = (Array.isArray(r1?.verify?.unknowns) ? r1.verify.unknowns : [])
    .map((u) => (u && typeof u === 'object' ? String(u.fact || u.question || '') : String(u || '')).trim()).filter(Boolean);
  const top = Array.isArray(r1?.hypotheses) ? r1.hypotheses[0] : null;
  if (!unknowns.length || !top) return null;
  const hs6 = nz(top.subheading6).slice(0, 6);
  const hs4 = nz(top.heading4).slice(0, 4);
  // OZV-1384: R1 (MiniMax, ca bo mạch A3 18/11) khai phân nhóm 6 số không có trong biểu (hoặc chỉ khai nhóm 4 số) → cổng G1
  // MA_KHONG_TON_TAI chặn earlyExitHoi → tốn R2 ~30 s. Nhóm 4 số có thật mà chỉ có ĐÚNG MỘT phân nhóm 6 số trong biểu
  // (vd 8534 → 853400) thì phân nhóm đó là tất định (GIR 6, không còn lựa chọn) → dùng nó, vẫn qua đủ cổng G1–G8.
  // Nhóm có ≥ 2 phân nhóm → giữ như cũ (cổng chặn, leo R2): không đoán phân nhóm, và tầng sau (validateClassifyResults)
  // không nhận mã 4 số nên KHÔNG trả HOI cấp nhóm.
  const hs6Co = hs6.length === 6 && coTienToTrongBieu(hs6);
  const hs6DuyNhat = !hs6Co && hs4.length === 4 ? phanNhomDuyNhat(hs4) : null;
  // OZV-1380: chỉ HOI khi có ít nhất nhóm 4 số — heading4 "85" (chỉ chương) không được rơi về mã 2 số.
  const hs = hs6Co ? hs6 : (hs6DuyNhat || (hs6.length === 6 ? hs6 : (hs4.length === 4 ? hs4 : '')));
  if (!hs) return null;
  const tuTin = Number(top.confidence);
  return {
    decision: 'HOI',
    hs,
    confidence: Number.isFinite(tuTin) ? Math.min(Math.max(0, tuTin), 60) : 50,
    reason: clip(`Hồ sơ thiếu dữ kiện quyết định mã: ${unknowns.slice(0, 3).join('; ')}`, 400),
    gir: null,
    basis: [],
    conditions: unknowns.slice(0, 6).map((u) => ({ fact: clip(u, 120), status: 'UNKNOWN', evidence: '' })),
    alternatives: [],
    questions: unknowns.slice(0, 6).map((u) => ({
      fact: clip(u, 120),
      question: clip(u, 200),
      whereToFind: 'ảnh tem/nhãn, thông số kỹ thuật / hỏi người bán',
    })),
  };
}

/**
 * OZV-2224 / OZV-2228: đáp án HOI dừng sớm bị HS_CHOT_SOM_CO_KIEM chặn CHỈ vì sổ tay của nhóm đứng đầu loại trừ đích danh
 * tên hàng (mọi tín hiệu là `so-tay-loai-tru`):
 *  (1) Vòng 1 có đúng MỘT nhóm đích trong giả thuyết ⇒ đổi đáp án HOI sang giả thuyết đó (OZV-2224: vòng 1 đứng đầu 854140,
 *      sổ tay 85.41 loại trừ "cảm biến quang" sang 85.36, giả thuyết vòng 1 có 853650).
 *  (2) Sổ tay nhóm đứng đầu loại trừ cùng cụm tên hàng sang ≥ 2 nhóm đích khác nhau (OZV-2228: vòng 1 đứng đầu 903149, sổ tay
 *      90.31 loại trừ "cảm biến quang" sang 90.32 và 85.36) ⇒ giữ mã HOI tạm (không tự chọn nhóm thay khách), đưa câu hỏi từ
 *      `questionVi` của các mệnh đề loại trừ lên đầu để hỏi thẳng khách giữa các nhóm đích, không gọi vòng 2.
 * Trả null (đi vòng 2 như cũ) khi: có tín hiệu loại khác (tiền lệ / TB-TCHQ / shop), hoặc không thoả (1) lẫn (2).
 */
function hoiTheoGiaThuyetNhomDich(r1, ee, chanSom, ctx = {}) {
  if (!ee || !Array.isArray(chanSom) || !chanSom.length || !chanSom.every((c) => c?.ma === 'so-tay-loai-tru')) return null;
  const h4Ee = nz(ee.hs).slice(0, 4);
  if (h4Ee.length !== 4) return null;
  const dich = new Set(chanSom.map((c) => nz(c.nhom).slice(0, 4)).filter((h) => h.length === 4 && h !== h4Ee));
  if (!dich.size) return null;
  const ds = (Array.isArray(r1?.hypotheses) ? r1.hypotheses : []).filter((h) => {
    const h4 = nz(h?.heading4).slice(0, 4);
    return h4.length === 4 && h4 !== h4Ee && dich.has(h4);
  });
  const nhomDs = new Set(ds.map((h) => nz(h.heading4).slice(0, 4)));
  if (nhomDs.size === 1) {
    const h = ds[0];
    const h4 = nz(h.heading4).slice(0, 4);
    const hs6 = nz(h.subheading6).slice(0, 6);
    const hs = hs6.length === 6 && hs6.startsWith(h4) && coTienToTrongBieu(hs6) ? hs6 : phanNhomDuyNhat(h4);
    if (!hs) return null;
    const tuTin = Number(h.confidence);
    const lyDo = chanSom.filter((c) => nz(c.nhom).slice(0, 4) === h4).map((c) => c.chiTiet).filter(Boolean)[0] || `sổ tay nhóm ${h4Ee} loại trừ sang nhóm ${h4}`;
    return {
      ...ee,
      hs,
      confidence: Number.isFinite(tuTin) ? Math.min(Math.max(0, tuTin), 60) : 50,
      reason: clip(`${ee.reason} — ${lyDo}; đổi sang giả thuyết vòng 1 nhóm ${h4}`, 400),
    };
  }
  if (dich.size < 2) return null;
  const hs6Ee = nz(ee.hs).slice(0, 6);
  const hs = hs6Ee.length === 6 && hs6Ee.startsWith(h4Ee) && coTienToTrongBieu(hs6Ee) ? hs6Ee : phanNhomDuyNhat(h4Ee);
  if (!hs) return null;
  const cumKhop = chanSom.map((c) => c?.matched || String(c?.chiTiet || '').match(/["“]([^"”]+)["”]/)?.[1]).find(Boolean) || '';
  const pName = ctx.productName || r1?.product?.nameVi || cumKhop;
  const pText = ctx.productText || pName;
  const ch = (soTayGates(
    { hs, productText: pText, productName: pName, form: ctx.form || r1?.product?.form || '', pool: [] },
    { loaiTruRequire: 'phrase', dong8: false },
  ).challenges || []).filter((c) => c.gate === 'SO_TAY_LOAI_TRU' && c.matched && dich.has(nz(c.target).slice(0, 4)));
  const nhomCh = new Set(ch.map((c) => nz(c.target).slice(0, 4)));
  if (nhomCh.size < 2 || nhomCh.size !== dich.size) return null;
  if (new Set(ch.map((c) => c.matched)).size !== 1) return null;
  const cauLoaiTru = ch.map((c) => {
    const cauNgan = String(c.questionVi || '').split(/;\s*nếu không\b/i)[0].trim();
    return {
      fact: clip(c.reasonVi || `Loại trừ nhóm ${h4Ee} sang nhóm ${c.target}`, 120),
      question: clip(cauNgan || c.questionVi, 200),
      whereToFind: 'Catalogue / thông số kỹ thuật: công dụng, cấu tạo của hàng.',
    };
  });
  const alts = [
    ...(Array.isArray(ee.alternatives) ? ee.alternatives : []),
    ...ds.map((h) => {
      const h4 = nz(h.heading4).slice(0, 4);
      const hs6 = nz(h.subheading6).slice(0, 6);
      const ma = hs6.length === 6 && hs6.startsWith(h4) && coTienToTrongBieu(hs6) ? hs6 : phanNhomDuyNhat(h4);
      const ld = chanSom.find((c) => nz(c.nhom).slice(0, 4) === h4)?.chiTiet || `giả thuyết vòng 1 nhóm ${h4}`;
      return ma ? { hs: ma, whyNot: `Ứng viên theo loại trừ sổ tay (${ld}) — chờ khách xác nhận.` } : null;
    }).filter(Boolean),
  ];
  const lyDo = chanSom.map((c) => c.chiTiet).filter(Boolean).join('; ') || `sổ tay nhóm ${h4Ee} loại trừ sang các nhóm ${[...nhomCh].join(', ')}`;
  return {
    ...ee,
    hs,
    reason: clip(`${ee.reason} — ${lyDo}; hỏi khách phân biệt giữa các nhóm đích ${[...nhomCh].join(' / ')}`, 400),
    alternatives: alts,
    questions: [...cauLoaiTru, ...(Array.isArray(ee.questions) ? ee.questions : [])].slice(0, 6),
  };
}

/**
 * OZV-1707: kiểm phân nhóm 6 số cho nhánh earlyExitHoi (tất định trước, LLM sau) trước khi dừng hỏi.
 * Vòng 1 chưa đọc chú giải nhóm / sổ tay / dòng biểu thuế / tiền lệ: khi R1 chọn phân nhóm 6 số (nhất là phân nhóm
 * phần còn lại "Loại khác" / "Thiết bị khác" như 848180), máy đối chiếu tất định theo thứ tự:
 *  (1) từ điển tên thương mại (gathered.tradeHints) có duy nhất một phân nhóm 6 số ưu tiên cùng nhóm 4 số (hoặc hs6 bị avoid);
 *  (2) bảng quyết định nhóm 4 số (resolveHeading): đã duyệt → đổi phân nhóm tất định; chưa duyệt mà khác phân nhóm → leo vòng 2 (LLM);
  // (3) Sổ tay / cây phân nhóm 6 số: hs6 lệch vật liệu tiêu đề 6 số (chotDong8 vat-lieu-khac-tieu-de-dich) → đổi tất định;
  //     hoặc hs6 là phân nhóm phần còn lại ("Loại khác" / "Thiết bị khác"…) trong khi phân nhóm 6 số cụ thể cùng nhóm 4 số
  //     khớp chữ tên: khớp chữ tên đơn độc chưa đủ căn cứ ghi đè lựa chọn vòng 1 → chỉ đổi tất định khi có tiền lệ
  //     TB-TCHQ / Oz ở bước (4) cùng nhóm 4 số xác nhận, còn khớp chữ tên đơn độc hoặc tranh chấp thì leo vòng 2 (LLM).
  // (4) Tiền lệ TB-TCHQ (doGiongTenHang.giong) và tiền lệ Oz (cov ≥ 60) trong nhóm 4 số.
 * Trả { ok: true, hs6, doiTu?, nguon? } khi giữ/đổi tất định được phân nhóm 6 số;
 * trả { ok: false, lyDo } khi phát hiện mâu thuẫn phân nhóm mà tất định không chốt được 1 phân nhóm duy nhất → leo vòng 2 (LLM).
 */
function kiemPhanNhomEarlyHoi({ ee, r1, raw = {}, gathered = {}, product = {}, productText = '' } = {}) {
  const hs6 = nz(ee?.hs).slice(0, 6);
  const h4 = hs6.slice(0, 4);
  if (hs6.length !== 6 || !coTienToTrongBieu(hs6)) return { ok: true, hs6 };
  const T = require('./hs-tree.js');
  const { phraseHit, isPartsLine } = require('./so-tay-gates.js');
  const laPn6Khac = (code6) => {
    const n = T.nodeOf(code6);
    const ten = String(n?.tenVi || '').replace(/^[-\s–]+/, '').trim();
    return Boolean(n?.loaiKhac)
      || /^(?:lo[aạ]i|thiết\s+bị|máy(?:\s+móc)?|dụng\s+cụ|sản\s+phẩm|vật\s+phẩm|bộ\s+phận|các\s+loại)\s+kh[aá]c\b/iu.test(ten);
  };
  const isRes6 = laPn6Khac(hs6);
  const avoid = gathered?.tradeHints?.avoidPrefixes || [];
  const prefer = (gathered?.tradeHints?.preferCodes || []).filter((c) => c?.hs && taxData[c.hs] && !biCamTrade(c.hs, avoid));
  const tradeSameH4Pn6 = [...new Set(prefer.filter((c) => nz(c.hs).startsWith(h4)).map((c) => nz(c.hs).slice(0, 6)).filter((s) => s.length === 6 && coTienToTrongBieu(s)))];

  // (1) Từ điển tên thương mại cùng nhóm 4 số (người soạn, có căn cứ pháp lý): khi R1 rơi vào phân nhóm phần còn lại
  // ("Thiết bị khác" 848180 / "Loại khác") hoặc phân nhóm bị avoid, còn từ điển chỉ về duy nhất 1 phân nhóm cụ thể.
  if (tradeSameH4Pn6.length === 1 && tradeSameH4Pn6[0] !== hs6 && (isRes6 || biCamTrade(hs6, avoid))) {
    return { ok: true, hs6: tradeSameH4Pn6[0], doiTu: hs6, nguon: 'trade-synonyms' };
  }
  if (tradeSameH4Pn6.length > 1 && !tradeSameH4Pn6.includes(hs6) && (isRes6 || biCamTrade(hs6, avoid))) {
    return { ok: false, lyDo: 'TRADE_KHAC_PHAN_NHOM' };
  }

  // (2) Bảng quyết định nhóm 4 số.
  try {
    const dec = resolveHeading(h4, { text: productText, parsed: parseCommodityQuery(productText) });
    const decPn6 = nz(dec?.hs).slice(0, 6);
    if (decPn6.length === 6 && decPn6.slice(0, 4) === h4 && decPn6 !== hs6 && coTienToTrongBieu(decPn6)) {
      if (dec.tableVerified) return { ok: true, hs6: decPn6, doiTu: hs6, nguon: 'decision-table' };
      return { ok: false, lyDo: 'BANG_QUYET_DINH_KHAC_PHAN_NHOM' };
    }
  } catch { /* bảng tuỳ chọn */ }

  // (3) Sổ tay / cây phân nhóm 6 số trong cùng nhóm 4 số.
  try {
    const cd = chotDong8({ hs: hs6, productText });
    if (cd?.lyDo === 'vat-lieu-khac-tieu-de-dich' && cd.deXuat && coTienToTrongBieu(cd.deXuat)) {
      return { ok: true, hs6: cd.deXuat, doiTu: hs6, nguon: 'so-tay-vat-lieu-6' };
    }
    const dsPn6 = [...new Set(Object.keys(taxData).filter((k) => k.length === 8 && k.startsWith(h4)).map((k) => k.slice(0, 6)))];
    if (dsPn6.length >= 2 && isRes6) {
      const tenDau = product?.nameVi || raw?.tenHang || productText;
      const laBoPhan = String(product?.form || '').toLowerCase() === 'bộ phận';
      const khopSib = [];
      for (const sib6 of dsPn6) {
        if (sib6 === hs6 || laPn6Khac(sib6)) continue;
        if (isPartsLine(sib6) && !laBoPhan) continue;
        const tenSib = String(T.nodeOf(sib6)?.tenVi || '').replace(/^[-\s–]+/, '').trim();
        if (!tenSib) continue;
        let hit = phraseHit(tenSib, tenDau);
        if (!hit && sib6 === '848120' && /\bvan\b/iu.test(tenDau)
          && /(?:truyền\s+động|xi\s*lanh|hệ\s+thống|điều\s+khiển|đảo\s+chiều|chia\s+khí)[^.;\n]{0,40}(?:khí\s+nén|dầu\s+thủy\s+lực|thủy\s+lực)|van\s+(?:điện\s+từ\s+)?(?:khí\s+nén|thủy\s+lực)/iu.test(productText)) {
          hit = 'truyền động khí nén/thủy lực';
        }
        if (hit && !biCamTrade(sib6, avoid)) khopSib.push(sib6);
      }
      if (khopSib.length > 1) return { ok: false, lyDo: 'SO_TAY_PHAN_NHOM_6_TRANH_CHAP' };

      // (4) Tiền lệ TB-TCHQ & Oz trong cùng nhóm 4 số khi R1 rơi vào phân nhóm 6 số "… khác".
      const hang = {
        tenHang: raw.tenHang || product.nameVi || '',
        moTa: [raw.tenHang, raw.chatLieu, raw.congDung, raw.chucNang, typeof raw.specs === 'string' ? raw.specs : null].filter(Boolean).join('. ') || productText,
      };
      const ungVienH4 = Object.keys(taxData).filter((k) => k.length === 8 && k.startsWith(h4) && !biCamTrade(k, avoid));
      const kc = kiemTruocChotMod.kiemTruocChot({ topHs: null, hang, ungVien: ungVienH4 });
      const tbPn6 = [...new Set((kc.deXuat || []).filter((d) => checkPolarity(d.hs, productText).ok).map((d) => nz(d.hs).slice(0, 6)).filter((s) => s.length === 6 && s.startsWith(h4)))];
      if (tbPn6.length === 1 && tbPn6[0] !== hs6) {
        if (khopSib.length === 1 && khopSib[0] !== tbPn6[0]) {
          return { ok: false, lyDo: 'SO_TAY_PHAN_NHOM_6_TRANH_CHAP' };
        }
        return { ok: true, hs6: tbPn6[0], doiTu: hs6, nguon: 'tien-le-tb-tchq' };
      }
      if (tbPn6.length > 1 && !tbPn6.includes(hs6)) {
        return { ok: false, lyDo: 'TIEN_LE_TB_KHAC_PHAN_NHOM' };
      }
      const ozH4 = (gathered?.ozPrecedents || []).filter((o) => nz(o.hs).length === 8 && nz(o.hs).startsWith(h4) && !biCamTrade(o.hs, avoid));
      if (ozH4.length && !ozH4.some((o) => nz(o.hs).startsWith(hs6))) {
        const ozPn6 = [...new Set(ozH4.filter((o) => (o.cov ?? 0) >= 60 || (o.oz ?? 0) >= 2).map((o) => nz(o.hs).slice(0, 6)).filter((s) => !laPn6Khac(s)))];
        if (ozPn6.length === 1) {
          if (khopSib.length === 1 && khopSib[0] !== ozPn6[0]) {
            return { ok: false, lyDo: 'SO_TAY_PHAN_NHOM_6_TRANH_CHAP' };
          }
          return { ok: true, hs6: ozPn6[0], doiTu: hs6, nguon: 'tien-le-oz' };
        }
      }
      // OZV-2242 (#1870): khớp chữ tên phân nhóm anh em đơn độc (không có tiền lệ/bảng/từ điển xác nhận phân nhóm đó)
      // chưa đủ căn cứ để tự ghi đè lựa chọn vòng 1 → trả ok: false để leo vòng 2 (LLM đọc chú giải + dòng biểu thuế + tiền lệ).
      if (khopSib.length === 1) {
        return { ok: false, lyDo: 'SO_TAY_PHAN_NHOM_6_NGHI' };
      }
    }
  } catch { /* lỗi kiểm phụ → giữ nguyên */ }

  return { ok: true, hs6 };
}

/**
 * OZV-1317: trước early-exit HOI, thử bảng xung đột đã duyệt + cụm detect trên văn bản.
 * Ca cánh quạt tháp giải nhiệt: mô tả TB đã có "riêng rẽ"/"đồng bộ" nhưng R1 vẫn khai unknowns
 * (trục/hướng tâm, đường kính…) → earlyExit HOI 841490, bỏ GIR/TB-TCHQ; hai tiền lệ TB cùng
 * giống 1.0 nên cũng không đôn được. Bảng CF-cooling-tower-fan-blade chốt tất định từ chữ.
 * Trả { decision:'CHOT', hs, ... } hoặc null.
 */
function earlyExitChotTuConflict(productText, r1) {
  try {
    const { conflictTablesDb, attributesDb, conflictsDb } = lazy();
    const {
      resolveConflict, enrichAttrsFromTable, phraseHits, foldProductText, originalProductText,
    } = require('./conflict-resolver.js');
    const tables = conflictTablesDb()?.tables || {};
    const registry = attributesDb() || {};
    // GĐ #1438 lần 3: dùng chung phraseHits — cụm có dấu so trên chuỗi giữ dấu (tránh "tủ đông"≡"tự động").
    const folded = foldProductText(productText);
    const original = originalProductText(productText);
    const hasAny = (phrases) => (phrases || []).some((p) => phraseHits(folded, p, original));
    const hyp4 = nz(r1?.hypotheses?.[0]?.heading4).slice(0, 4);
    for (const [group, table] of Object.entries(tables)) {
      if (!table || table.verified !== true) continue;
      if (Array.isArray(table.requireAny) && table.requireAny.length && !hasAny(table.requireAny)) continue;
      if (Array.isArray(table.requireAlsoAny) && table.requireAlsoAny.length && !hasAny(table.requireAlsoAny)) continue;
      // detect + fromText nằm trong enrichAttrsFromTable (ranh giới từ; không ghi đè attrs sẵn).
      const attrs = enrichAttrsFromTable({}, table, productText);
      if (!Object.keys(attrs).length) continue;
      // Thử từng mã thành viên làm top — resolveConflict cần hs 8 số có group trong conflicts.json.
      const members = (table.members || []).filter((h) => /^\d{8}$/.test(String(h)));
      // Ưu tiên thành viên cùng nhóm 4 số với giả thuyết R1 (nếu có).
      const ordered = [
        ...members.filter((h) => hyp4 && h.startsWith(hyp4)),
        ...members.filter((h) => !hyp4 || !h.startsWith(hyp4)),
      ];
      for (const seed of ordered) {
        if (!conflictsDb()?.[seed]?.group) continue;
        const top = { hs: seed, confidence: 70, reason: 'conflict-seed' };
        // OZV-1382: truyền productText tường minh — không dựa biến chung removeDiacritics (GĐ #1438).
        const r = resolveConflict(top, [top], attrs, {
          conflictsDb: conflictsDb(),
          tablesDb: conflictTablesDb(),
          registry,
          productText,
        });
        if (r?.status === 'RESOLVED' && r.tableVerified && /^\d{8}$/.test(String(r.decidedHs || '')) && taxData[r.decidedHs]) {
          const tuTin = Number(r1?.hypotheses?.[0]?.confidence);
          return {
            decision: 'CHOT',
            hs: r.decidedHs,
            confidence: Number.isFinite(tuTin) ? Math.min(Math.max(tuTin, 70), 90) : 80,
            reason: clip(r.reasonVi || `Bảng xung đột ${group} đã duyệt`, 400),
            gir: r.gir || 'GIR 1',
            basis: [{ stream: 'SUY_LUAN', claim: clip(r.reasonVi || group, 160), evidence: clip(productText, 200), ref: `conflict-table ${group}` }],
            conditions: [],
            alternatives: (table.members || []).filter((h) => h !== r.decidedHs).slice(0, 2).map((h) => ({ hs: h, whyNot: 'mã đối cực cùng bảng xung đột' })),
            questions: [],
            _conflictEarly: { group, decidedHs: r.decidedHs, trace: r.trace || [] },
          };
        }
      }
    }
  } catch { /* bảng tuỳ chọn — lỗi thì earlyExit HOI như cũ */ }
  return null;
}

/**
 * OZV-1341 — early-exit CHOT từ từ điển trade-synonyms khi mục đã gắn high + chotSom.
 * Đo A3 17/11: R1 MiniMax ≥15 s; 2/4 câu top 24h còn tốn R2 23–32 s vì earlyExitHoi bị NHOM_CHUA_KIEM.
 * Mục chotSom do người soạn (đã kiểm prod) → CHOT tất định, bỏ vòng AI; cổng gates() vẫn chạy.
 * Không chotSom (vd giác hút) → null, leo R1+GIR như cũ. Không đụng HS_CLASSIFY_FAST_FIRST (QĐ-4).
 * @returns {{ decision:'CHOT', hs, ... }|null}
 */
function earlyExitChotTuTrade(hints, productText) {
  const pref = tradePreferredHs(hints);
  if (!pref || pref.confidence !== 'high' || pref.chotSom !== true) return null;
  if (!taxData[pref.hs]) return null;
  return {
    decision: 'CHOT',
    hs: pref.hs,
    confidence: 85,
    reason: clip(
      `Theo từ điển tên thương mại (${pref.entryId})${pref.whenVi ? `: ${pref.whenVi}` : ''} — chốt sớm (chotSom), bỏ vòng AI`,
      400,
    ),
    // gir:null — không gắn chuỗi GIR thô; determineGir(llmGir) sẽ biến thành LLM_ASSERTED
    // dù không gọi LLM (OZV-1341 trả thợ). Trích sai tệ hơn không trích.
    gir: null,
    basis: [{
      stream: 'SUY_LUAN',
      claim: `Trade synonym ${pref.entryId} high+chotSom → ${pref.hs}`,
      evidence: clip(productText, 200),
      ref: `data/trade-synonyms.json#${pref.entryId}`,
    }],
    conditions: [],
    alternatives: [],
    questions: [],
    _tradeEarly: { entryId: pref.entryId, hs: pref.hs },
  };
}

/**
 * OZV-1356 — hồ sơ tối thiểu cho earlyExit high+chotSom.
 * Đủ gates (headings / tradeHints / supplier); KHÔNG gọi ozSearch, searchPrecedents,
 * policyLine→buildTaxLookup (96170010 cold ~2s), pack WCO. Đo A3: cốc gatherMs ~3,5s → <50ms.
 */
function gatherChoChotSom(hs, raw, hintsSom) {
  const code = nz(hs);
  const h4 = code.slice(0, 4);
  const supplier = normalizeSupplierHs(raw?.supplierHs);
  const avoid = hintsSom?.avoidPrefixes || [];
  const tradeHints = hintsSom?.matches?.length
    ? {
      entryIds: hintsSom.matches.map((m) => m.entryId),
      avoidPrefixes: avoid,
      preferCodes: hintsSom.preferCodes || [],
    }
    : null;
  return {
    pack: '',
    headings: h4.length === 4 ? [h4] : [],
    codes8: code.length === 8 && taxData[code] ? [code] : [],
    mic: null,
    supplier,
    ozPrecedents: [],
    tables: [],
    poolCodes: (hintsSom?.preferCodes || [])
      .filter((c) => c?.hs && !biCamTrade(c.hs, avoid))
      .map((c) => ({ hs: c.hs, from: 'trade-synonyms' })),
    embedPool: null,
    embedMs: 0,
    tradeHints,
  };
}
/**
 * Cổng tất định FAST-FIRST (xem khối chú thích ở trên): trả ứng viên đủ điều kiện { hs8, tuTin, nguon[], kieu, chiTiet }
 * hoặc { lyDo } ghi vì sao không đủ (đo được, không im lặng). Chỉ đọc dữ liệu đã gom (gathered) — không gọi AI, không mạng.
 */
function fastFirstUngVien({ r1, gathered, productText }) {
  const hyps = Array.isArray(r1?.hypotheses) ? r1.hypotheses : [];
  const top = hyps[0];
  const lyDo = [];
  if (!top) return { lyDo: ['khong-gia-thuyet'] };
  const h4 = nz(top.heading4).slice(0, 4);
  const hs6 = nz(top.subheading6).slice(0, 6);
  const tuTin = Number(top.confidence);
  if (h4.length !== 4) return { lyDo: ['nhom-khong-hop-le'] };
  if (hs6.length !== 6 || !Object.keys(taxData).some((k) => k.startsWith(hs6))) { lyDo.push('phan-nhom-khong-trong-bieu-thue'); return { lyDo }; }
  if (!Number.isFinite(tuTin) || tuTin < FAST_FIRST_TU_TIN) { lyDo.push('tu-tin-duoi-nguong'); return { lyDo }; }
  if ((Array.isArray(r1?.verify?.unknowns) ? r1.verify.unknowns : []).filter(Boolean).length) { lyDo.push('con-du-kien-chua-ro'); return { lyDo }; }
  if (!(gathered?.headings || []).includes(h4)) { lyDo.push('nhom-chua-kiem'); return { lyDo }; } // G4 — về lý không xảy ra (gather luôn nạp nhóm giả thuyết), giữ cho đủ
  const { conflictsDb } = lazy();
  const kq = [];
  // (1) Tiền lệ Oz: khớp ≥ 75% (ngưỡng nguonDocLap) + cùng PHÂN NHÓM 6 SỐ với giả thuyết dẫn đầu + không phải mã dễ nhầm.
  // startsWith(hs6) — không phải h4: vòng 1 đã khoanh phân nhóm 6 số; ứng viên ở phân nhóm 6 số khác (cùng nhóm 4 số)
  // không được gắn confidence của vòng 1 rồi bỏ lời GIR (soát OZV-570, lỗi 2).
  const ozShown = [...new Map((gathered.ozPrecedents || []).map((o) => [o.hs + o.name, o])).values()];
  for (const o of ozShown) {
    const hs8 = nz(o.hs);
    if (hs8.length !== 8 || !hs8.startsWith(hs6) || (o.cov ?? 0) < 75 || conflictsDb()[hs8]) continue;
    const nguon = nguonDocLap(hs8, gathered, productText);
    if (nguon.length) kq.push({ hs8, tuTin, nguon, kieu: 'tien-le-oz', chiTiet: { hs: hs8, ten: o.name, soLan: o.oz, khop: o.cov } });
  }
  // (2) Bảng quyết định ĐÃ DUYỆT ra đúng mã 8 số cùng PHÂN NHÓM 6 SỐ của vòng 1 (cùng cổng nguonDocLap dùng để xác nhận).
  try {
    const dec = resolveHeading(h4, { text: productText, parsed: parseCommodityQuery(productText) });
    const hs8 = nz(dec?.hs);
    if (dec?.status === 'RESOLVED' && dec.tableVerified && hs8.length === 8 && hs8.startsWith(hs6) && !conflictsDb()[hs8]) {
      const nguon = nguonDocLap(hs8, gathered, productText);
      if (nguon.length) kq.push({ hs8, tuTin, nguon, kieu: 'bang-quyet-dinh', chiTiet: { hs: hs8, lyDo: dec.reasonVi } });
    }
  } catch { /* bảng tuỳ chọn — như gates() G5 */ }
  if (!kq.length) { lyDo.push('khong-nguon-doc-lap'); return { lyDo }; }
  // Nguồn độc lập phải đồng ý đúng MỘT mã 8 số: nhiều mã khác nhau cùng lọt vào kq (tiền lệ Oz với bảng quyết định lệch
  // nhau, hay hai tiền lệ Oz hai mã) ⇒ hồ sơ đang mâu thuẫn ⇒ KHÔNG chốt, leo sâu vòng 2 như cũ (soát OZV-570, lỗi 1).
  const uniq = new Set(kq.map((x) => x.hs8));
  if (uniq.size !== 1) { lyDo.push('nguon-doc-lap-mau-thuan'); return { lyDo }; }
  return kq[0];
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
const SYS_DO_THI = 'Bạn là trợ lý phân loại mã HS Việt Nam. Chỉ trả về đúng một đối tượng JSON hợp lệ theo đúng khuôn được yêu cầu.';
const DU_KHOA = Object.freeze({
  luotMot: (j) => !!j && typeof j === 'object' && Array.isArray(j.nhom),
  luotHai: (j) => !!j && typeof j === 'object' && typeof j.nhom === 'string' && Array.isArray(j.canCu),
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

// #725-46 (lỗi 45 còn sót) — NGẮT SUY NGHĨ theo bước. Prod 02/11: MỌI bước lần đầu đều hỏng "No parseable JSON … MiniMax-M3,
// 22279 / 33025 / 30506 ký tự" = phần <think> chạm đúng trần maxTokens (6.000 / 10.000 token ≈ 3,4 ký tự/token) → JSON không
// kịp ra → gọi lại tắt suy nghĩ; tổng 232 s, mà đáp án THẬT vẫn là đáp án tắt suy nghĩ. Tắt suy nghĩ ngay từ đầu cho MỌI lượt
// thì §2c (docs/backlog/09) đã đo: −16 điểm Đ8 khi phần suy nghĩ KỊP xong. Nên máy học từ chính lượt chạy: một bước bị CỤT Ở
// maxTokens (finish_reason=length — không phải lỗi mạng/timeout/JSON hỏng) → trong LOOP_NGAT_SUY_NGHI_MS (mặc định 30 phút)
// các lượt sau của ĐÚNG bước đó gọi tắt suy nghĩ NGAY (không đốt một lượt 60–100 s chắc chắn cụt). Hết hạn → thử lại suy nghĩ
// một lần (lượt dò); vẫn cụt → mở lại. LOOP_NGAT_SUY_NGHI_MS=0 → tắt cơ chế (hành vi như trước).
const NGAT_SUY_NGHI_MS_MAC_DINH = 30 * 60 * 1000;
const ngatSuyNghiMs = () => { const v = process.env.LOOP_NGAT_SUY_NGHI_MS; return v != null && v !== '' && Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : NGAT_SUY_NGHI_MS_MAC_DINH; };
const _ngatSuyNghi = new Map(); // step → { den: ms, lan: số lần cụt liên tiếp, cause }
function ngatSuyNghiDangMo(step) {
  const x = _ngatSuyNghi.get(step || '-');
  if (!x) return false;
  if (Date.now() >= x.den) return false; // hết hạn → lượt dò (giữ bản ghi để đếm `lan` nếu lại cụt)
  return true;
}
function ngatSuyNghiGhiCut(step, cause) {
  const ms = ngatSuyNghiMs();
  if (!ms) return;
  const k = step || '-';
  const cu = _ngatSuyNghi.get(k);
  _ngatSuyNghi.set(k, { den: Date.now() + ms, lan: (cu?.lan || 0) + 1, cause: String(cause || '').slice(0, 120) });
}
function ngatSuyNghiGhiOk(step) { _ngatSuyNghi.delete(step || '-'); }
function ngatSuyNghiTrangThai() {
  const out = {};
  for (const [k, v] of _ngatSuyNghi) out[k] = { mo: Date.now() < v.den, conMs: Math.max(0, v.den - Date.now()), lan: v.lan };
  return out;
}
/** Lỗi / kết quả là JSON CỤT Ở maxTokens (không phải hết giờ, không phải lỗi mạng). */
const laCutMaxTokens = (msgOrR) => (typeof msgOrR === 'string' ? /finish_reason=length/.test(msgOrR) : msgOrR?.finishReason === 'length');

async function callWithFallback(system, user, optsIn, log) {
  // HS_GON_DAU_RA: `kiemKhoa` (DU_KHOA) kiểm khoá bắt buộc của bước — tách khỏi opts để lời gọi nhà cung cấp không đổi.
  // Tắt công tắc → không có kiemKhoa → opts và luồng y như cũ.
  // #725-45: `hanChotMs` (hạn chót tuyệt đối của lượt classify) — mọi lời gọi trong hàm này, kể cả lần "tắt suy nghĩ", không
  // chờ quá hạn đó; truyền tiếp xuống callLLMJson để tầng dự phòng (Gemini) cũng không được chờ thêm một timeout trọn nữa.
  // OZV-570: `thinkingOff` = lời gọi ĐẦU của bước này chạy thinking tắt (fast-first vòng 1) — chỉ gán extraBody cho MiniMax
  // bằng đúng cờ sẵn có bên dưới, không tham số mới; đường Gemini (LOOP_PROVIDER=gemini) không có khái niệm này → bỏ qua.
  const { kiemKhoa, hanChotMs, thinkingOff: _ffOff, ...optsRest } = optsIn;
  const conMs = () => (hanChotMs ? hanChotMs - Date.now() : Infinity);
  // #425: timeout theo bước (LLM_TIMEOUT_MS_<STEP>, trần không vượt ngân sách vòng) — lấy TRƯỚC khi gọi,
  // để lần thử "thinking-off" và log cùng thấy một con số. Không đặt env → y như cũ (timeoutMs của vòng).
  // OZV-1267 / OZV-1271: MiniMax đã ngắt mạch TIMEOUT cho understand|gir → kẹp ≤ 15 s + bỏ thinking-off
  // (không chờ chuỗi dự phòng gemini-free kéo wall 24–55 s).
  const minimaxNgatBuoc = !GEMINI_LOOP && llmTier.ngatMachDangMo('minimax', optsRest.step);
  let timeoutMs = Math.min(llmTier.stepTimeoutMs(optsRest.step, optsRest.timeoutMs), conMs());
  if (minimaxNgatBuoc && optsRest.step === 'understand') timeoutMs = Math.min(timeoutMs, understandFailfastMs(timeoutMs));
  if (minimaxNgatBuoc && optsRest.step === 'gir') timeoutMs = Math.min(timeoutMs, girFailfastMs(timeoutMs));
  const opts = { ...optsRest, timeoutMs, ...(hanChotMs ? { hanChotMs } : {}) };
  const t0 = Date.now();
  const mauTatSuyNghi = () => opts.minimax?.model || process.env[`LLM_STEP_${String(opts.step || '').toUpperCase()}`]?.split(':')[0] || DEFAULT_LOOP_MODEL;
  // OZV-570 FAST-FIRST: lời gọi đầu của bước đánh dấu thinkingOff → gọi thẳng MiniMax với thinking tắt (2–10 s đo được,
  // thay 15–100 s). Mẫu giữ nguyên logic chọn của lượt (LLM_STEP_<BƯỚC> / opts.minimax); chỉ thêm extraBody thinking.
  if (_ffOff && !GEMINI_LOOP && !opts.minimax?.extraBody) {
    opts.minimax = { ...(opts.minimax || {}), model: opts.minimax?.model || mauTatSuyNghi(), extraBody: { thinking: { type: 'disabled' } } };
  }
  // OZV-826: khi tầng dự phòng thắng sau lỗi/bỏ qua chuỗi chính, ghi vào log (chỉ số/mã lỗi, không nội dung câu).
  const ghiChanDoanChuoi = (r) => {
    if (!log || (!r?.loiChuoiChinh && !(r?.boQua && r.boQua.length))) return;
    log.push({
      step: opts.step,
      chuoiChinhLoi: r.loiChuoiChinh || null,
      boQua: Array.isArray(r.boQua) ? r.boQua : [],
      provider: r.provider || null,
      ms: Date.now() - t0,
    });
  };
  // #725-46: bước này vừa bị cụt ở maxTokens trong cửa sổ ngắt → gọi tắt suy nghĩ NGAY (không đốt lượt chắc chắn cụt).
  // OZV-1267: nếu MiniMax đang ngắt mạch TIMEOUT thì bỏ nhánh này — gọi tắt suy nghĩ cũng bị bỏ qua rồi chờ dự phòng.
  if (!GEMINI_LOOP && !minimaxNgatBuoc && ngatSuyNghiDangMo(opts.step)) {
    if (log) log.push({ step: opts.step, thinking: 'off-ngay', cause: `ngắt suy nghĩ: bước ${opts.step} vừa cụt ở maxTokens (${_ngatSuyNghi.get(opts.step)?.lan || 1} lần)`, timeoutMs: opts.timeoutMs });
    const r = await llmTier.callLLMJson(system, user, { ...opts, minimax: { model: mauTatSuyNghi(), extraBody: { thinking: { type: 'disabled' } } } });
    ghiChanDoanChuoi(r);
    return { ...r, fallback: true, thinkingOffNgay: true };
  }
  try {
    const r = await llmTier.callLLMJson(system, user, opts);
    // JSON thiếu khoá bắt buộc (cụt ở maxTokens / mảnh vụn vớt từ <think>) → ném lỗi "parseable JSON" để rơi đúng nhánh
    // gọi lại tắt suy nghĩ bên dưới. Đường Gemini (LOOP_PROVIDER=gemini) không có nhánh đó → giữ hành vi cũ.
    if (kiemKhoa && !GEMINI_LOOP && !kiemKhoa(r?.json)) throw new Error(`No parseable JSON: thiếu khoá bắt buộc của bước ${opts.step} (nghi JSON cụt ở maxTokens ${opts.maxTokens}) [${r?.provider || '?'}${r?.finishReason ? `, finish_reason=${r.finishReason}` : ''}]`);
    if (!GEMINI_LOOP) ngatSuyNghiGhiOk(opts.step);
    ghiChanDoanChuoi(r);
    return r;
  } catch (e) {
    const msg = String(e?.message || e);
    if (!GEMINI_LOOP && laCutMaxTokens(msg)) ngatSuyNghiGhiCut(opts.step, tomTatLoi(msg));
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
    // #725-45: hết ngân sách lượt → không gọi lại (lỗi gốc đi tiếp, động cơ trả ENGINE_TIMEOUT như cũ, nhưng TRONG trần 300 s).
    if (conMs() < THINKING_OFF_MIN_CON_MS) {
      if (log) log.push({ step: opts.step, note: `không gọi lại tắt suy nghĩ — còn ${Math.max(0, Math.round(conMs() / 1000))} s tới hạn chót lượt`, cause: tomTatLoi(msg), ms: Date.now() - t0 });
      throw e;
    }
    // OZV-1267: mạch MiniMax đang mở cho bước này (kể cả vừa mở sau timeout lần này) → bỏ thinking-off.
    if (minimaxNgatBuoc || llmTier.ngatMachDangMo('minimax', opts.step)) {
      if (log) log.push({ step: opts.step, note: 'không gọi lại tắt suy nghĩ — MiniMax đang ngắt mạch TIMEOUT cho bước này', cause: tomTatLoi(msg), ms: Date.now() - t0 });
      throw e;
    }
    const model = mauTatSuyNghi();
    if (log) log.push({ step: opts.step, fallback: 'thinking-off', cause: tomTatLoi(msg), ms: Date.now() - t0, timeoutMs: opts.timeoutMs });
    // #425: lần "thinking-off" có trần riêng (đã timeout một lần thì không đốt thêm phút nữa) — #725-45: 45 s, xem
    // THINKING_OFF_TIMEOUT_MS_MAC_DINH; không vượt timeout của bước và hạn chót lượt.
    const r = await llmTier.callLLMJson(system, user, { ...opts, timeoutMs: Math.min(thinkingOffTimeoutMs(), opts.timeoutMs, conMs()), minimax: { model, extraBody: { thinking: { type: 'disabled' } } } });
    ghiChanDoanChuoi(r);
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

/**
 * OZV-1613 — guard tất định sau vòng 1: khách khai tên TIẾNG VIỆT (không chữ Hán) là cách khách gọi món hàng,
 * nhưng R1 hay "chuẩn hoá" mất danh từ chỉ hàng (khách khai "van fv420" → nameVi "camera giám sát FV420" vì
 * FV420 giống tên model camera). SYS_R1 bị ghim sha256 trong gon test (GĐ 13/11: prompt hệ thống không đổi) nên
 * không đụng prompt — tầng sửa là MÁY, không hy vọng LLM ngoan: hàm này so danh từ chữ ĐẦU TIÊN của tên khách
 * khai (bỏ dấu, bỏ qua token lẫn số) với nameVi — còn thì yên, thiếu thì trả về nameVi đã nối danh từ lên đầu
 * để mọi đường sau (searchVi, searchTextVi, hồ sơ) giữ nó.
 * Có chữ Hán trong tên → tiêu đề Taobao, khách có thể gọi khác bản chất → KHÔNG áp.
 */
function giuDanhTuKhach(tenHang, nameVi) {
  const th = String(tenHang || '').trim();
  const nv = String(nameVi || '').trim();
  if (!th || !nv || /[一-鿿]/.test(th)) return null;
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const coTrong = (t) => { const h = norm(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return new RegExp(`(^|[^a-z0-9])${h}([^a-z0-9]|$)`).test(norm(nv)); };
  // Token thuần chữ (không lẫn số — "fv420"/"2mp" là model/thông số, không phải danh từ) của tên khách khai.
  const tu = th.split(/\s+/).map((t) => t.replace(/[^0-9a-zA-Zà-ỹÀ-Ỹ]/g, '')).filter((t) => /[a-zA-Zà-ỹÀ-Ỹ]{2,}/.test(t) && !/\d/.test(t));
  if (!tu.length) return null;
  if (coTrong(tu[0])) return null; // danh từ đầu còn → không đụng
  // Danh từ đầu bị bỏ nhưng CÒN token chữ khác của tên khách trong nameVi ("1/2 inch van bi" → "van bi inox"
  // còn "van") → vòng 1 đã giữ cách khách gọi, từ đầu chỉ là kích thước/quy cách → không đụng.
  if (tu.slice(1).some(coTrong)) return null;
  return { danhTu: tu[0], nameVi: `${tu[0]} ${nv}` };
}

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
  const img = Array.isArray(raw.imageTexts) ? raw.imageTexts : [];
  if (img.length) L.push(`${N.chuAnh}:\n${img.slice(0, 8).map((t, i) => `[${N.anh} ${i + 1}] ${clip(typeof t === 'string' ? t : t?.text, 500)}`).join('\n')}`);
  return L.join('\n\n');
}

// ───────────────────────── KIỂM CHỨNG (máy chủ) ─────────────────────────
/**
 * Dàn ý chú giải: giữ các mục lớn (A)(B)… đủ tiêu đề và tên ngắn từng mục con (i)(ii)… — để trọng tài
 * thấy TOÀN BỘ bản đồ phân loại của nhóm (vd "(D) Đồ chơi khác … (viii) vũ khí đồ chơi") thay vì vài câu
 * trùng chữ. Gọn (mỗi mục con ≤ itemLen ký tự) và không phụ thuộc từ đồng nghĩa.
 */
function noteOutline(text, itemLen = 90, maxLen = 1800) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const base = clip(t, 450);
  const pat = /(?:^|(?<=[.;:…]\)?)\s)\((?:[A-Z]|[ivxlc]{1,6}|\d{1,2})\)\s/g;
  const all = t.match(pat) || [];
  if (all.length < 2 || (base.match(pat) || []).length >= all.length) return base;
  const parts = t.split(/(?<=[.;:…]\)?)\s(?=\((?:[A-Z]|[ivxlc]{1,6}|\d{1,2})\)\s)/);
  const build = (iLen) => parts.map((raw) => {
    const m = raw.match(/^\(([A-Z]|[ivxlc]{1,6}|\d{1,2})\)\s/);
    if (m && /^[A-Z]$/.test(m[1])) return clip(raw, Math.max(140, iLen));
    if (m) return `  ${clip(raw, iLen)}`;
    return clip(raw, Math.max(160, iLen));
  }).join('\n');
  const len = (s) => s.replace(/…/g, '').replace(/\n\s*/g, '').trim().length;
  const need = len(base);
  let res = build(itemLen);
  if (len(res) < need && itemLen === 90) {
    for (const scale of [140, 180, 240, 320, 450]) {
      res = build(scale);
      if (len(res) >= need) break;
    }
  }
  const finalRes = res.length > maxLen ? `${res.slice(0, maxLen).replace(/\s+$/, '')}…` : res;
  return len(finalRes) < need ? base : finalRes;
}

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
    n.baoGom && `  GỒM: ${noteOutline(n.baoGom)}`,
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
  let codes8 = [...new Set((verify.codes8 || []).map(nz).filter((c) => c.length === 8 && taxData[c]))].slice(0, 8);
  // Nhóm máy chủ đã bổ sung (chốt chặn "nhóm chưa kiểm", nhóm đích sổ tay) không được rơi khỏi trần 4 nhóm —
  // trước đây nhóm bổ sung đứng cuối và bị cắt khi giả thuyết đã đủ 4 nhóm.
  // Nhóm NCC khai (nếu có) luôn phải được xem chú giải + dòng biểu thuế như các nhóm khác — không bị cắt bởi trần 4.
  const supplier = normalizeSupplierHs(raw.supplierHs);
  const validH = (h) => h.length === 4 && Object.keys(taxData).some((k) => k.startsWith(h));
  const base = [...new Set([...hyps.map((h) => nz(h.heading4).slice(0, 4)), ...codes8.map((c) => c.slice(0, 4))].filter(validH))];
  const extra = [...usedHeadings].filter((h) => validH(h) && !base.slice(0, 4).includes(h));
  let headings = [...new Set([...base.slice(0, 4), ...extra])].slice(0, 4 + extra.length);
  if (supplier && !headings.includes(supplier.heading4)) headings.push(supplier.heading4);
  // OZV-1266: từ điển tên thương mại (cùng nguồn /api/suggest) — nạp nhóm/mã ưu tiên, loại hẳn avoid.
  const queryForTrade = [raw.tenHang, product.nameVi, product.purpose, product.material, raw.nameZh].filter(Boolean).join(' ');
  let tradeHints = { matches: [], avoidPrefixes: [], preferHeadings: [], preferCodes: [], packBlock: null };
  try { tradeHints = tradeClassifyHints(queryForTrade); } catch { /* từ điển lỗi → bỏ */ }
  if (tradeHints.matches?.length) {
    for (const h of [...tradeHints.preferHeadings].reverse()) {
      if (validH(h) && !headings.includes(h)) headings.unshift(h);
    }
    const keptH = headings.filter((h) => !biCamTrade(h, tradeHints.avoidPrefixes));
    if (keptH.length) headings = keptH;
    codes8 = codes8.filter((c) => !biCamTrade(c, tradeHints.avoidPrefixes));
    for (const c of [...tradeHints.preferCodes].reverse()) {
      if (taxData[c.hs] && !codes8.includes(c.hs) && !biCamTrade(c.hs, tradeHints.avoidPrefixes)) {
        codes8.unshift(c.hs);
      }
    }
    codes8 = codes8.slice(0, 10);
  }
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

  let tb = [];
  try { tb = searchPrecedents([product.nameVi, product.purpose, product.material, raw.tenHang].filter(Boolean).join(' '), { topK: 4 }); } catch { tb = []; }
  // OZV-517 (GĐ 13/11 — TRẢ THỢ PR #1269): chỉ lấy NHÓM của tiền lệ mà TÊN HÀNG KHỚP với hàng đang phân loại,
  // đo bằng CÙNG thước đo mà luật "mã tiền lệ TB-TCHQ chắc chắn" dùng (lib/giong-ten-hang.js: giong).
  // Trước đây lấy MỌI tiền lệ có similarity ≥ 0.6 ⇒ kéo nhóm KHÁC CHƯƠNG vào hồ sơ (vd ca "dao hái cau" bị
  // chèn "■ NHÓM 2103" — nhóm nước/juice, không liên quan dao) ⇒ nhiễu prompt, loãng chú giải thật.
  // Đo trên bộ 50 ca TB-TCHQ: nhóm của mã đáp án được giữ đủ 5/5 ca cần, nhóm nhiễu giảm 71 → 1.
  const hangGather = { tenHang: raw.tenHang || product.nameVi || '', moTa: [product.nameVi, product.purpose, product.material, raw.tenHang].filter(Boolean).join('. ') };
  for (const x of tb) {
    if ((x.similarity || 0) < 0.6) continue;
    const tenTB = x.precedent?.productNameRaw || x.precedent?.productName || x.productName || '';
    if (!doGiongTenHang(hangGather, tenTB).giong) continue; // tên hàng không khớp ⇒ nhóm này không phải của hàng đang phân loại
    const h4 = nz(x.finalHsCode || x.precedent?.finalHsCode).slice(0, 4);
    if (validH(h4) && !headings.includes(h4)) headings.push(h4);
  }

  // Bắt buộc (AI không được bỏ): chú giải + dòng biểu thuế mọi nhóm nêu; tiền lệ theo mọi tên Việt; bảng quyết định.
  const notes = headings.map((h4) => headingBlock(h4, queryText));
  const oz = [];
  for (const q of searchVi) {
    try { for (const it of (await ozSearch.searchOzByKeyword(q, { limit: 5 })).items || []) oz.push({ q, hs: nz(it.hsCode), name: it.tenHang, oz: it.ozCount, cov: it.matchCoverage }); } catch { /* bỏ qua */ }
  }
  // Tìm theo từ khoá tiếng Việt nhiễu nặng ("dao hái cau" khớp "cầu dao"): chỉ đưa cho AI tiền lệ khớp ≥60% từ khoá.
  const ozLines = [...new Map(oz.map((o) => [o.hs + o.name, o])).values()].filter((o) => o.cov >= 60).sort((a, b) => (b.cov - a.cov) || (b.oz - a.oz)).slice(0, 8)
    .map((o) => `${o.hs} — "${clip(o.name, 90)}" (Oz đã khai ${o.oz} lần; khớp ${o.cov}%) [tờ khai Oz — tham khảo, không phải phán quyết]`);
  const tbLines = tb.map((x) => `${x.finalHsCode || x.precedent?.finalHsCode} — ${clip(x.precedent?.productNameRaw || x.precedent?.productName || x.productName || '', 120)} (${x.precedent?.tbTchqNumber || x.tbTchqNumber || 'TB-TCHQ'}; giống ${Math.round((x.similarity || 0) * 100)}%) [TB-TCHQ — tham khảo]`);
  const { tbTchqGate, conflictsDb } = lazy();
  let codePool = [...new Set([
    ...codes8,
    ...oz.map((o) => o.hs).filter((c) => c.length === 8 && !biCamTrade(c, tradeHints.avoidPrefixes)),
  ])].slice(0, 10);
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
    // OZV-1613: ≥2 shop đồng thuận nhóm N mà vòng 1 không giả thuyết nhóm đó (khách khai "van fv420" → vòng 1
    // neo 8525 camera, shop nói 8481 van) — nhóm N PHẢI vào gói kiểm chứng (chú giải + dòng biểu thuế), không chỉ
    // nằm ở signal:mic. Không nó thì vòng 2 không có mã 8 số hợp lệ của nhóm đấy để chốt/đối chiếu, đành bịa mã 6 số.
    if (mic?.consensus?.heading4 && /^\d{4}$/.test(String(mic.consensus.heading4)) && !headings.includes(String(mic.consensus.heading4))) {
      headings = [String(mic.consensus.heading4), ...headings];
    }
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
    `HỒ SƠ GỐC (nguyên văn — CHỈ được trích câu từ đây):\n${round1Input(raw).slice(0, 2500)}`,
    `HỒ SƠ BẢN CHẤT (AI vòng 1 đọc ra — là diễn giải, KHÔNG phải nguyên văn; đặc tính nào không có câu gốc đi kèm thì coi là CHƯA RÕ):\n${JSON.stringify(product, null, 0).slice(0, 2200)}`,
    `GIẢ THUYẾT VÒNG 1: ${hyps.map((h) => `${h.heading4 || ''}/${h.subheading6 || ''} (${h.confidence ?? '?'}%) — ${clip(h.why, 160)}`).join(' | ')}`,
    tradeHints.packBlock || '',
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
    ...(tradeHints.preferCodes || []).map((c) => ({ hs: c.hs, from: 'trade-synonyms' })),
    ...tb.map((x) => ({ hs: nz(x.finalHsCode || x.precedent?.finalHsCode), from: 'tb-tchq' })),
    ...codePool.flatMap((c) => (conflictsDb()[c]?.confusedWith || []).map((x) => ({ hs: nz(x), from: 'cap-ma-de-nham' }))),
    ...(supplier ? [{ hs: supplier.heading4, from: 'ncc-khai' }] : []),
  ].filter((x) => x.hs.length >= 4 && !biCamTrade(x.hs, tradeHints.avoidPrefixes));
  return {
    pack,
    headings,
    codes8: codePool,
    mic,
    supplier,
    ozPrecedents: oz,
    tables,
    poolCodes,
    embedPool,
    embedMs,
    tradeHints: tradeHints.matches?.length
      ? { entryIds: tradeHints.matches.map((m) => m.entryId), avoidPrefixes: tradeHints.avoidPrefixes, preferCodes: tradeHints.preferCodes }
      : null,
  };
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
    // OZV-1290: nhóm MIC nằm trong avoid của trade-synonyms đã khớp tên hàng → nhiễu model
    // (vd CMR* trên made-in-china đồng thuận 8544 dây/cáp trong khi hàng là camera 85.25). Không chặn.
    const tradeAvoid = gathered.tradeHints?.avoidPrefixes || [];
    if (biCamTrade(mic.heading4, tradeAvoid)) {
      warnings.push(`made-in-china: ${mic.shops} shop ghi nhóm ${mic.heading4} — từ điển tên thương mại đã loại nhóm này (nhiễu model/MIC); không chặn.`);
    } else {
      const addressed = (r2.alternatives || []).some((a) => nz(a.hs).startsWith(mic.heading4)) || /made-in-china|nhà sản xuất|shop/i.test(String(r2.reason || ''));
      // OZV-1389: đường earlyExitHoi (ctx.earlyHoi) dựng HOI chưa chốt mã — câu hỏi khách sẽ phân giải; chặn MIC ở đây chỉ
      // đòi vòng AI R2 giải trình (ca bo mạch 18/11: 2 shop "circuit board" là tủ điện 8537 → R2 thừa 23,9 s). Hạ thành
      // cảnh báo như nhánh nhiễu OZV-1290. CHỈ khi HOI và mã < 8 số: đường CHỐT (mọi vòng R2) vẫn chặn như cũ.
      const hoiSom = ctx.earlyHoi === true && String(r2.decision || '').toUpperCase() === 'HOI' && hs.length < 8;
      if (!addressed && hoiSom) warnings.push(`made-in-china: ${mic.shops} shop ghi nhóm ${mic.heading4} (khác ${h4}) — đang hỏi thêm dữ kiện, chưa chốt mã; đối chiếu khi chốt.`);
      else if (!addressed && round < 3) blocks.push({ gate: 'NHA_SAN_XUAT_KHAC_NHOM', reasonVi: `${mic.shops} shop khác nhau trên made-in-china cùng ghi nhóm ${mic.heading4}, bạn chọn ${h4}. Hãy đối chiếu chú giải hai nhóm và nêu rõ vì sao chọn/không chọn ${mic.heading4}.` });
      else if (!addressed) warnings.push(`made-in-china: ${mic.shops} shop ghi nhóm ${mic.heading4} (khác ${h4}).`);
    }
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
  const stRes = (!blocks.length && soTayMode() !== 'off' && hs.length >= 6)
    ? soTayGates({ hs, productText, productName: ctx.productName, form: ctx.form, pool: ctx.pool || [] })
    : { checked: false, challenges: [] };
  const challenges = stRes.challenges;
  return { blocks, warnings, basis, conditions, tableOverride, tableAdvisory, challenges, soTayChecked: Boolean(stRes.checked) };
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
 * Bước nạp TẤT ĐỊNH nhóm h4 (dùng chung cho nhomChuaKiemTatDinh và earlyExitHoi — OZV-1380): đưa h4 vào usedHeadings, gom lại
 * hồ sơ vụ việc (chú giải + dòng biểu thuế nhóm h4 do gather nạp thật, KHÔNG chèn tay vào gathered.headings), rồi chạy lại TOÀN BỘ
 * gates() trên cùng đáp án. Cổng NHOM_CHUA_KIEM chỉ qua khi gather thật sự nạp được nhóm đó.
 * @returns {Promise<{moi: object, gatherMs: number, g2: object}>}
 */
async function napNhomTatDinh({ h4, r1, ans, raw, gathered, usedHeadings, gateCtx }) {
  usedHeadings.add(h4);
  const keepMic = gathered.mic;
  const gT0 = Date.now();
  const moi = await gather(r1, raw, { usedHeadings, micAllowed: false });
  const gatherMs = Date.now() - gT0;
  moi.mic = keepMic;
  const g2 = gates(ans, { ...gateCtx, gathered: moi, pool: casePool(r1, ans, moi) });
  return { moi, gatherMs, g2 };
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
  const { moi, gatherMs, g2 } = await napNhomTatDinh({ h4, r1, ans: r2, raw, gathered, usedHeadings, gateCtx });
  const hs = nz(r2.hs);
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
/**
 * Cửa vào động cơ. HS_HOI_THEO_SO_TAY tắt (mặc định) → trả NGUYÊN kết quả của classifyLoopGoc (cùng một đối tượng,
 * không thêm/bớt trường nào). Bật → hậu xử lý TẤT ĐỊNH lib/hoi-theo-so-tay.js dựng lại danh sách câu hỏi gửi khách
 * theo sổ tay nhóm 4 số + sổ ranh giới PN6 đã DUYET; không đổi mã HS / độ tự tin / status / quyết định HOI–CHOT.
 * Đặt SAU B1b (b1b-web đọc câu hỏi gốc để tra web — hành vi B1b không đổi); lượt chạy lại B1b đi qua hai lần, lần hai bỏ qua.
 */
/** HS_TIM_TRUOC=do-thi, bước 8: gắn độ tin + cờ + hồ sơ căn cứ. KHÔNG đổi mã; độ tin THAP chỉ bật cờ chuyên viên xem. */
async function tuSoatDoThi(out, rawAttrs, kq) {
  const ma = nz(out?.results?.[0]?.hs);
  if (!out?.engine || ma.length < 4) return;
  const t0 = Date.now();
  let tienLe = null;
  try { tienLe = await require('./do-thi/tien-le-ung-ho.js').tienLeUngHo(duongDoThi.moTaKhach(rawAttrs), ma); } catch { tienLe = null; }
  const s = duongDoThi.soat({ kq, ma, tienLe });
  out.engine.tuSoat = { doTin: s.doTin, co: s.co, ms: Date.now() - t0 };
  if (out.dossier) out.dossier.canCuDoThi = s.hoSo;
  if (s.doTin === 'THAP' && out.review) {
    out.review.needed = true;
    out.review.reasons = [...(out.review.reasons || []), `Tự soát theo đồ thị: ${s.co.join(', ')} — chuyên viên đối chiếu`];
  }
}

async function classifyLoop(rawAttrs, opts = {}) {
  const giuDoThi = timTruocMod.batDoThi() ? {} : null; // HS_TIM_TRUOC=do-thi (mặc định TẮT ⇒ null, opts y như cũ)
  const out = await classifyLoopGoc(rawAttrs, giuDoThi ? { ...opts, _giuDoThi: giuDoThi } : opts);
  if (giuDoThi?.kq) await tuSoatDoThi(out, rawAttrs, giuDoThi.kq);
  return hoiTheoSoTay.bat() ? hoiTheoSoTay.apDung(out, { rawAttrs }) : out;
}

async function classifyLoopGoc(rawAttrs, opts = {}) {
  const t0 = Date.now();
  // opts._b1bHanChot chỉ do chayLaiB1b (HS_MAX_VONG_SUA bật) đặt: lượt chạy lại B1b tính giờ theo hạn của lượt chính.
  // #725-45: hạn chót tuyệt đối truyền xuống mọi lời gọi AI (callWithFallback → callLLMJson) — tổng lượt không vượt ngân sách.
  // OZV-771 + OZV-1314: `opts.hanChotMs` = hạn chót THẬT của bên gọi (api/classify.js: trần 85 s).
  // BUDGET_MS mặc định cũng 85 s — khi bên gọi không nói, động cơ không tự cho mình 285 s nữa.
  // Lấy hạn NGẮN HƠN giữa hai bên. Env CLASSIFY_BUDGET_MS ghi đè khi bench cần dài.
  const hanChot = opts._b1bHanChot || Math.min(opts.hanChotMs || Infinity, t0 + BUDGET_MS);
  const left = () => hanChot - Date.now();
  // Hạn một bước AI: không quá `tran` của bước, chừa `chua` ms cho các bước sau, và KHÔNG BAO GIỜ dài hơn thời gian
  // còn lại — sàn 30 s chỉ áp khi còn ≥ 30 s. Trước OZV-771 sàn là `Math.max(30000, …)` cứng, nên hạn chót ngắn vẫn
  // hứa 30 s cho một bước dù chỉ còn 5 s: hứa quá giờ của bên gọi. Ngân sách 85 s: vòng 1 sàn ~30 s, vòng 2 phần còn;
  // env CLASSIFY_BUDGET_MS=285000 (bench) ⇒ 100 s/160 s như cũ.
  const hanBuoc = (tran, chua) => Math.min(tran, Math.max(Math.min(30000, left()), left() - chua));
  const raw = rawAttrs || {};
  const { groundingSourceOf } = lazy();
  const imgText = (Array.isArray(raw.imageTexts) ? raw.imageTexts : []).map((t) => (typeof t === 'string' ? t : t?.text || '')).join('\n');
  const source = [groundingSourceOf(raw), imgText].filter(Boolean).join('\n');
  const log = [];
  // OZV-826: gom boQua/loiChuoiChinh từ mọi lời gọi AI trong lượt → debug.llm (chỉ khi debug:true).
  const llmDiag = { boQua: [], loiChuoiChinh: [] };
  const nhanChanDoanLlm = (r) => {
    if (!r) return;
    if (Array.isArray(r.boQua)) for (const s of r.boQua) if (s && !llmDiag.boQua.includes(s)) llmDiag.boQua.push(s);
    if (r.loiChuoiChinh && !llmDiag.loiChuoiChinh.includes(r.loiChuoiChinh)) llmDiag.loiChuoiChinh.push(r.loiChuoiChinh);
  };
  // Đo ms từng pha (backlog 09 bước 0): để tối ưu dựa trên số đo thật thay vì phỏng đoán.
  // llmTungVong (OZV-507 việc 2): ms TỪNG VÒNG AI ≥2 (phần tử k = vòng k+2) — cùng phép đo với llmMs (tổng),
  // để đo A3 tách từng lời gọi trên prod cho khoá dịch vụ mà không cần debug:true; chỉ số, không nội dung hồ sơ.
  const phases = { r1Ms: 0, gatherMs: 0, llmMs: 0, llmTungVong: [] };
  const engine = { name: 'loop', rounds: 0, providers: [], gates: log };
  // OZV-1520: chụp số đo SỐNG trả kèm QUA_GIO khi debug=true — trước giờ số đo chỉ nằm trong closure này và bị vứt
  // đúng lúc chậm nhất (lượt hết giờ vẫn chạy nền nên closure vẫn cập nhật). Bên gọi tạo object rỗng truyền qua
  // opts.doTienTrinh; chup() đọc trạng thái tại thời điểm gọi (JS đơn luồng ⇒ không race). Lượt chạy lại B1b
  // (_b1bDaThu) KHÔNG gắn lại để không ghi đè chup của lượt chính. Không đổi phases/engine của phản hồi cuối.
  const buocDangChay = { ten: null, t0: Date.now() };
  const ganBuoc = (ten) => { buocDangChay.ten = ten; buocDangChay.t0 = Date.now(); };
  if (!opts._b1bDaThu && opts.doTienTrinh && typeof opts.doTienTrinh === 'object') {
    opts.doTienTrinh.chup = () => ({
      name: 'loop',
      rounds: engine.rounds,
      providers: [...engine.providers],
      gates: [...log],
      phases: { ...phases, llmTungVong: [...phases.llmTungVong] },
      ...(buocDangChay.ten ? { dangChay: { buoc: buocDangChay.ten, ms: Date.now() - buocDangChay.t0 } } : {}),
      ms: Date.now() - t0,
      llm: {
        timeoutMs: { understand: llmTier.stepTimeoutMs('understand', R1_TIMEOUT_MS), gir: llmTier.stepTimeoutMs('gir', R2_TIMEOUT_MS) },
        ngatMach: llmTier.ngatMachTrangThai(),
        ngatSuyNghi: ngatSuyNghiTrangThai(),
        ...(llmDiag.boQua.length ? { boQua: [...llmDiag.boQua] } : {}),
        ...(llmDiag.loiChuoiChinh.length ? { loiChuoiChinh: [...llmDiag.loiChuoiChinh] } : {}),
      },
    });
  }
  // Tối ưu độ trễ — đọc MỘT lần mỗi món (cả lượt chạy cùng một cấu hình). Cả hai "off" → mọi nhánh dưới y như origin/main.
  const gon = gonDauRa();
  const capVong = maxVongSua();
  // OZV-570 FAST-FIRST — đọc MỘT lần mỗi món; TẮT (mặc định) ⇒ không nhánh nào dưới khác bản trước OZV-570.
  const fastFirst = fastFirstBat();
  let fastFirstTrangThai = fastFirst ? { vong1ThinkingOff: true, boQuaVong2: false } : null;
  const r1MaxTokens = Number(process.env.R1_MAX_TOKENS) || (gon ? R1_MAX_TOKENS_GON : 12000);
  const r2MaxTokens = Number(process.env.GIR_MAX_TOKENS) || (gon ? R2_MAX_TOKENS_GON : 20000);

  // OZV-1341: thử CHOT từ điển high+chotSom TRƯỚC AI — đo prod 4 câu top 24h: R1≥15s, R2 thêm 23–32s.
  let r1 = null;
  let r2 = null;
  let g = null;
  let gathered = null;
  let product = {};
  let productText = '';
  let machinery = false;
  let feedback = '';
  {
    const queryTrade = [raw.tenHang, raw.nameZh, raw.specs, raw.chatLieu, raw.congDung].filter(Boolean).join(' ');
    let hintsSom = null;
    try { hintsSom = tradeClassifyHints(queryTrade); } catch { hintsSom = null; }
    const eeTrade = hintsSom ? earlyExitChotTuTrade(hintsSom, queryTrade) : null;
    if (eeTrade) {
      const h4 = nz(eeTrade.hs).slice(0, 4);
      const r1Fake = {
        product: {
          nameVi: raw.tenHang || '',
          purpose: raw.congDung || '',
          material: raw.chatLieu || '',
          form: null,
          evidence: {},
        },
        hypotheses: [{
          chapter: h4.slice(0, 2),
          heading4: h4,
          subheading6: nz(eeTrade.hs).slice(0, 6),
          why: `từ điển ${eeTrade._tradeEarly.entryId}`,
          confidence: 85,
        }],
        verify: { searchVi: [raw.tenHang].filter(Boolean), codes8: [eeTrade.hs], unknowns: [] },
      };
      const gT0 = Date.now();
      ganBuoc('gather'); // OZV-1520
      // OZV-1356: không gather đầy đủ — cốc 96170010 bị policyLine/buildTaxLookup + oz/precedent phình ~3–9s.
      const gatheredSom = gatherChoChotSom(eeTrade.hs, raw, hintsSom);
      phases.gatherMs = Date.now() - gT0;
      phases.embedMs = 0;
      if (!gatheredSom.headings.includes(h4)) gatheredSom.headings = [h4, ...gatheredSom.headings];
      const productTextSom = [raw.tenHang, raw.nameZh, raw.specs, raw.chatLieu, raw.congDung, imgText].filter(Boolean).join('\n');
      const machinerySom = MACHINERY_CH.has(h4.slice(0, 2));
      // HS_CHOT_SOM_CO_KIEM (L11, mặc định TẮT): trước khi chốt sớm từ điển, xét tín hiệu tất định trái nhóm 4 số
      // (TB-TCHQ khớp tên hàng / sổ tay loại trừ đích danh) — có thì không bỏ vòng 1/2.
      let chanTrade = [];
      if (chotSomCoKiem.bat()) {
        try { chanTrade = chotSomCoKiem.tinHieuTraiNhom({ hs: eeTrade.hs, gathered: gatheredSom, r1: r1Fake, raw, productText: productTextSom, productName: raw.tenHang, form: null }); } catch { chanTrade = []; }
      }
      if (chanTrade.length) {
        log.push({
          round: 0,
          earlyExitTradeChotSom: false,
          lyDo: 'TIN_HIEU_TRAI_NHOM',
          hs: nz(eeTrade.hs),
          entryId: eeTrade._tradeEarly.entryId,
          chanChotSom: [...new Set(chanTrade.map((c) => c.ma))],
          nhomTrai: [...new Set(chanTrade.map((c) => c.nhom))],
          chiTiet: chanTrade.map((c) => c.chiTiet),
        });
      } else {
        const gSom = gates(eeTrade, {
          source,
          productText: productTextSom,
          gathered: gatheredSom,
          machinery: machinerySom,
          round: 2,
          productName: raw.tenHang,
          form: null,
          pool: casePool(r1Fake, eeTrade, gatheredSom),
        });
        if (!gSom.blocks.length && !gSom.challenges.length) {
          r1 = r1Fake;
          r2 = eeTrade;
          g = gSom;
          gathered = gatheredSom;
          product = r1Fake.product;
          productText = productTextSom;
          machinery = machinerySom;
          log.push({ round: 0, earlyExitTradeChotSom: true, hs: nz(eeTrade.hs), entryId: eeTrade._tradeEarly.entryId });
        } else {
          log.push({
            round: 0,
            earlyExitTradeChotSom: false,
            lyDo: [...gSom.blocks.map((b) => b.gate), ...(gSom.challenges.length ? ['SO_TAY'] : [])].join(',') || 'khong-ro',
            hs: nz(eeTrade.hs),
          });
        }
      }
    }
  }

  const usedHeadings = new Set(gathered?.headings || []);
  // Sổ tay: tối đa MỘT lượt giải trình mỗi món; `soTay` ghi kết cục để trả cho ERP + lưu hồ sơ giải trình.
  // OZV-1707: phân biệt "chưa tra" (CHUA_TRA) với "đã tra, không nghi" (DA_TRA_KHONG_NGHI) khi nhánh tối ưu bật;
  // khi cả hai công tắc tắt (!gon && capVong == null) giữ 'NONE' để khớp từng byte golden master 688bf156.
  const soTay = { mode: soTayMode(), challenges: [], outcome: (gon || capVong != null) ? 'CHUA_TRA' : 'NONE', giaiTrinh: [] };
  let pending = null; // { hs, challenges } của lượt vừa yêu cầu giải trình
  let challenged = false;
  let ghiChuNhom = null; // HS_MAX_VONG_SUA: nhóm máy vừa bổ sung tất định → lượt giải trình nhắc AI đọc lại chú giải nhóm đó
  let vongSua = 0; // HS_MAX_VONG_SUA: số vòng sửa THEO LÝ DO BỊ CHẶN đã dùng (lượt giải trình sổ tay không tính)
  let chamTran = 0; // HS_MAX_VONG_SUA: vòng bị trần vòng sửa dừng lại trong khi luồng cũ còn chạy tiếp (0 = không)
  // HS_CHOT_SOM_CO_KIEM: cổng sổ tay (G8) đã xét đáp án của MỘT lượt vòng 2 thật (AI đã đọc gói chú giải + sổ tay) hay chưa.
  // Chỉ để xuất soTay.daTra khi công tắc bật — không tham gia quyết định nào.
  let soTayDaTra = false;

  // VÒNG 1 (+ kiểm chứng + vòng 2) — bỏ qua khi chotSom đã CHOT sạch cổng.
  // HS_TIM_TRUOC (mặc định TẮT — tắt thì timTruocKq luôn null, mọi dòng dưới chạy y như cũ): TRƯỚC vòng 1, máy tìm tất định
  // trong kho bằng mô tả + tên ngắn (lib/tim-truoc.js) → khối DỮ LIỆU ứng viên nối vào đầu vào vòng 1 (lời dặn hệ thống
  // SYS_R1 không đổi); khi HS_TIM_TRUOC_NAP > 0 các nhóm đó còn được nạp vào gather() như ứng viên. Module không chọn mã (L3): vòng 1/vòng 2 quyết.
  let timTruocKq = null;
  if (!r2 && timTruocMod.bat()) {
    ganBuoc('tim-truoc');
    timTruocKq = await timTruocMod.timTruoc(raw);
    engine.timTruoc = timTruocKq.tomTat;
    phases.timTruocMs = timTruocKq.tomTat.ms;
  }
  // HS_TIM_TRUOC=do-thi (mặc định TẮT ⇒ doThiKq luôn null): bước 3–6 theo đồ thị. Đủ căn cứ → r1 của đường này thay vòng 1; không
  // đủ (AI trả sai khuôn, gói rỗng, căn cứ bịa, còn ít giờ) → vòng 1 như cũ, lý do ở engine.doThi.
  let doThiKq = null;
  if (!r2 && timTruocMod.batDoThi() && timTruocKq) {
    const dtT0 = Date.now();
    ganBuoc('do-thi');
    const msLuot = [];
    if (left() < 60000) engine.doThi = { trangThai: 'BO_QUA_IT_GIO' };
    else {
      doThiKq = await duongDoThi.chonNhom({
        raw, timTruoc: timTruocKq,
        goiLLM: async (ten, yeuCau) => {
          const t = Date.now();
          const step = ten === 'luot-mot' ? 'luot_mot' : 'luot_hai';
          const han = Math.min(25000, Math.max(0, left() - 45000)); // luôn chừa ≥ 45 s cho vòng 1 cũ / vòng 2
          if (han < 5000) throw new Error('het gio');
          try {
            const r = await callWithFallback(SYS_DO_THI, yeuCau, { step, minimax: stepModel(step), tier: opts.tier, maxTokens: step === 'luot_mot' ? 2000 : 6000, timeoutMs: han, temperature: 0.1, ...providerOpts(han), kiemKhoa: step === 'luot_mot' ? DU_KHOA.luotMot : DU_KHOA.luotHai, ...(step === 'luot_mot' ? { thinkingOff: true } : {}), hanChotMs: Date.now() + han }, log);
            nhanChanDoanLlm(r);
            engine.rounds += 1; engine.providers.push(r.provider);
            return r.json;
          } finally { msLuot.push({ ten, ms: Date.now() - t }); }
        },
      });
      engine.doThi = { ...doThiKq.tomTat, luot: msLuot };
      if (doThiKq.r1 && opts._giuDoThi) opts._giuDoThi.kq = doThiKq;
    }
    phases.doThiMs = Date.now() - dtT0;
  }
  if (!r2) {
  if (doThiKq?.r1) r1 = doThiKq.r1;
  else try {
    const r1Timeout = hanBuoc(R1_TIMEOUT_MS, 170000);
    const r1T0 = Date.now();
    ganBuoc('r1'); // OZV-1520
    const r1Res = await callWithFallback(gon ? SYS_R1_GON : SYS_R1, timTruocKq?.khoi ? `${round1Input(raw)}\n\n${timTruocKq.khoi}` : round1Input(raw), { step: 'understand', minimax: stepModel('understand'), tier: opts.tier, maxTokens: r1MaxTokens, timeoutMs: r1Timeout, temperature: 0.1, ...providerOpts(r1Timeout), ...(gon ? { kiemKhoa: DU_KHOA.understand } : {}), ...(fastFirst ? { thinkingOff: true } : {}), hanChotMs: hanChot }, log);
    nhanChanDoanLlm(r1Res);
    const { json, provider } = r1Res;
    phases.r1Ms = Date.now() - r1T0;
    r1 = json || {}; engine.rounds += 1; engine.providers.push(provider);
  } catch (e) {
    return withLegal({ ...classifyStatus({ headings: [], engineFailed: 'ENGINE_TIMEOUT' }), results: [], missing: [missingQuaGio(opts.kenhGoi)], candidates: { headings: [], precedentCodes: [] }, engine: { ...engine, error: tomTatLoi(e.message) } });
  }
  product = r1.product || {};
  // OZV-1613: vòng 1 bỏ danh từ khách khai khi viết lại ("van fv420" → "camera giám sát FV420") — máy phục hồi
  // TRƯỚC gather để searchVi / searchTextVi / truy vấn MIC / hồ sơ đều thấy danh từ khách gọi món.
  const giu = giuDanhTuKhach(raw.tenHang, product.nameVi);
  if (giu) {
    product = { ...product, nameVi: giu.nameVi };
    r1 = { ...r1, product };
    log.push({ round: 1, giuDanhTu: giu.danhTu, note: `vòng 1 bỏ danh từ khách khai "${giu.danhTu}" khi viết lại — máy nối lại đầu nameVi` });
  }
  productText = [raw.tenHang, raw.nameZh, raw.specs, raw.chatLieu, raw.congDung, imgText, product.nameVi, product.purpose, product.material, product.mechanism].filter(Boolean).join('\n');
  machinery = (r1.hypotheses || []).some((h) => MACHINERY_CH.has(nz(h.chapter).slice(0, 2) || nz(h.heading4).slice(0, 2)));

  // KIỂM CHỨNG
  const gatherT0 = Date.now();
  ganBuoc('gather'); // OZV-1520
  // HS_TIM_TRUOC + HS_TIM_TRUOC_NAP > 0 (mặc định 0 ⇒ nhomNap rỗng, gather() gọi y như cũ): nhóm ứng viên tìm trước + nhóm dễ
  // nhầm theo sổ tay vào gather() qua usedHeadings (không qua cổng độ giống 0,6).
  gathered = await gather(r1, raw, { micAllowed: opts.mic !== false, ...(timTruocKq?.nhomNap?.length ? { usedHeadings: new Set(timTruocKq.nhomNap) } : {}) });
  phases.gatherMs = Date.now() - gatherT0;
  phases.embedMs = gathered.embedMs || 0; // GĐ1: ms tầng ứng viên (0 = tắt/không có pool)
  for (const h of gathered.headings || []) usedHeadings.add(h);
  // OZV-570 FAST-FIRST: cổng tất định (fastFirstUngVien — xem chú thích đầu mục FAST-FIRST) chạy SAU kiểm chứng, TRƯỚC lời
  // GIR vòng 2. Đủ điều kiện ⇒ dựng đáp án vòng 2 từ kết quả vòng 1 + nguồn độc lập xác nhận, đưa qua TOÀN BỘ chốt chặn
  // gates() như một lượt thật: sạch ⇒ bỏ lời GIR vòng 2 (tiết kiệm ~23 s/lời); cổng nào chặn/nghi ⇒ KHÔNG dùng, gọi vòng 2
  // thinking-on y như cũ — không bao giờ tệ hơn hôm nay.
  let fastKq = fastFirst ? fastFirstUngVien({ r1, gathered, productText }) : null;
  if (fastFirst && fastKq && !fastKq.hs8) fastFirstTrangThai = { ...fastFirstTrangThai, lyDo: (fastKq.lyDo || ['khong-ro']).join(',') };
  for (let round = 2; round <= MAX_ROUNDS; round++) {
    if (round > 2 && left() < RETRY_MIN_LEFT_MS) { log.push({ round, note: 'hết ngân sách thời gian — dừng lặp' }); break; }
    // HS_TIM_TRUOC=do-thi, bước 7: nhóm + phân nhóm chốt bằng cạnh và dòng 8 số tất định → bỏ lời AI vòng 2, NHƯNG vẫn qua đủ chốt
    // chặn, tín hiệu trái nhóm và tiền lệ. Vướng bất kỳ điều gì → vòng 2 như cũ.
    if (round === 2 && doThiKq?.r1 && !pending && !feedback) {
      const ans = duongDoThi.dapAn8({ kq: doThiKq, productText, chotDong8, dong8DuyNhat });
      if (ans) {
        const lyDo = [];
        if (biCamTrade(ans.hs, gathered.tradeHints?.avoidPrefixes || [])) lyDo.push('TU_DIEN_CAM');
        try { lyDo.push(...chotSomCoKiem.tinHieuTraiNhom({ hs: ans.hs, gathered, r1, raw, productText, productName: product.nameVi || raw.tenHang, form: product.form }).map((c) => c.ma)); } catch { lyDo.push('TIN_HIEU_LOI'); }
        try {
          const tl = await require('./do-thi/tien-le-ung-ho.js').tienLeUngHo(duongDoThi.moTaKhach(raw), ans.hs);
          if (tl.biPhanDoi?.length) lyDo.push('TIEN_LE_PHAN_DOI');
          if (tl.ungHo === false) lyDo.push('TIEN_LE_LECH');
        } catch { lyDo.push('TIEN_LE_LOI'); }
        const gDt = lyDo.length ? null : gates(ans, { source, productText, gathered, machinery, round, productName: product.nameVi || raw.tenHang, form: product.form, pool: casePool(r1, ans, gathered) });
        if (gDt && !gDt.blocks.length && !gDt.challenges.length) {
          r2 = ans; g = gDt;
          log.push({ round, doThiChot: true, boQuaVong2: true, hs: ans.hs, nguon: ans._doThi.nguon });
          break;
        }
        log.push({ round, doThiChot: false, hs: ans.hs, lyDo: [...new Set([...lyDo, ...(gDt ? [...gDt.blocks.map((b) => b.gate), ...gDt.challenges.map((c) => c.gate)] : [])])].join(',') });
      }
    }
    if (round === 2 && fastKq?.hs8) {
      // HS_CHOT_SOM_CO_KIEM (L11, mặc định TẮT): trước khi fast-first bỏ vòng 2, kiểm tín hiệu tất định trái nhóm 4 số.
      let chanFast = [];
      if (chotSomCoKiem.bat()) {
        try { chanFast = chotSomCoKiem.tinHieuTraiNhom({ hs: fastKq.hs8, gathered, r1, raw, productText, productName: product.nameVi || raw.tenHang, form: product.form }); } catch { chanFast = []; }
      }
      if (chanFast.length) {
        const nap = chotSomCoKiem.nhomCanNap(chanFast, gathered.headings).filter((t) => !usedHeadings.has(t));
        if (nap.length) {
          for (const t of nap) usedHeadings.add(t);
          const keepMic = gathered.mic; const gT0 = Date.now();
          ganBuoc('gather');
          gathered = await gather(r1, raw, { usedHeadings, micAllowed: false });
          phases.gatherMs += Date.now() - gT0;
          gathered.mic = keepMic;
        }
        fastFirstTrangThai = { ...fastFirstTrangThai, lyDo: 'TIN_HIEU_TRAI_NHOM' };
        log.push({ round, fastFirst: false, lyDo: 'TIN_HIEU_TRAI_NHOM', hs: fastKq.hs8, chanChotSom: [...new Set(chanFast.map((c) => c.ma))], nhomTrai: [...new Set(chanFast.map((c) => c.nhom))], chiTiet: chanFast.map((c) => c.chiTiet), ...(nap.length ? { napNhom: nap } : {}) });
        fastKq = null;
      } else {
        const ff = {
          decision: 'CHOT', hs: fastKq.hs8, confidence: Math.max(0, Math.min(100, fastKq.tuTin)),
          reason: clip(`Vòng 1 (thinking tắt) chọn nhóm ${nz(r1.hypotheses?.[0]?.heading4)} — ${clip(r1.hypotheses?.[0]?.why, 120)}; nguồn độc lập xác nhận: ${fastKq.nguon.join('; ')} [fast-first]`, 400),
          basis: [fastKq.kieu === 'bang-quyet-dinh'
            ? { stream: 'SUY_LUAN', claim: `Bảng quyết định đã duyệt ra đúng mã ${fastKq.hs8}`, evidence: clip(fastKq.chiTiet.lyDo, 200), ref: `bảng quyết định ${fastKq.hs8.slice(0, 4)}` }
            : { stream: 'TIEN_LE', claim: `Tờ khai Oz ${fastKq.hs8} (${fastKq.chiTiet.soLan} lần, khớp ${fastKq.chiTiet.khop}%)`, evidence: clip(fastKq.chiTiet.ten, 200), ref: 'tờ khai Oz' }],
          conditions: [], alternatives: [], questions: [],
        };
        const gFast = gates(ff, { source, productText, gathered, machinery, round, productName: product.nameVi || raw.tenHang, form: product.form, pool: casePool(r1, ff, gathered) });
        if (!gFast.blocks.length && !gFast.challenges.length) {
          r2 = ff; g = gFast; // KHÔNG tăng engine.rounds / llmMs — không có lời AI nào thêm
          fastFirstTrangThai = { ...fastFirstTrangThai, boQuaVong2: true, hs: fastKq.hs8, nguon: fastKq.nguon };
          log.push({ round, fastFirst: true, boQuaVong2: true, hs: fastKq.hs8, nguon: fastKq.nguon });
          break;
        }
        const lyDoChan = [...gFast.blocks.map((b) => b.gate), ...(gFast.challenges.length ? ['SO_TAY'] : [])].join(',');
        fastFirstTrangThai = { ...fastFirstTrangThai, lyDo: lyDoChan };
        log.push({ round, fastFirst: false, lyDo: lyDoChan, hs: fastKq.hs8 });
        fastKq = null; // cổng chặn đáp án fast-path → leo sâu như cũ
      }
    }
    // OZV-1269: early-exit HOI — vòng 1 đã khai unknowns + gonDauRa ⇒ bỏ lời GIR (đo A3 ~21 s).
    // Chỉ vòng 2 đầu, chưa bị chặn/giải trình; cổng chặn/sổ tay nghi ⇒ leo GIR như cũ. Lượt B1b chạy lại vẫn gọi GIR.
    // OZV-1317: nếu bảng xung đột đã duyệt chốt được từ văn bản (vd cánh quạt tháp riêng rẽ → 84149029)
    // thì CHOT tất định — không hỏi unknowns thừa (trục/hướng tâm, Ø…) đã có đủ trong mô tả TB.
    if (round === 2 && gon && !opts._b1bDaThu && !pending && !feedback) {
      let conflictBiChanTraiNhom = false;
      const eeChot = earlyExitChotTuConflict(productText, r1);
      if (eeChot) {
        // HS_CHOT_SOM_CO_KIEM (L11, mặc định TẮT): trước khi chốt sớm theo bảng xung đột, kiểm tín hiệu tất định trái nhóm 4 số.
        let chanConflict = [];
        if (chotSomCoKiem.bat()) {
          try { chanConflict = chotSomCoKiem.tinHieuTraiNhom({ hs: eeChot.hs, gathered, r1, raw, productText, productName: product.nameVi || raw.tenHang, form: product.form }); } catch { chanConflict = []; }
        }
        if (chanConflict.length) {
          conflictBiChanTraiNhom = true;
          const nap = chotSomCoKiem.nhomCanNap(chanConflict, gathered.headings).filter((t) => !usedHeadings.has(t));
          if (nap.length) {
            for (const t of nap) usedHeadings.add(t);
            const keepMic = gathered.mic; const gT0 = Date.now();
            ganBuoc('gather');
            gathered = await gather(r1, raw, { usedHeadings, micAllowed: false });
            phases.gatherMs += Date.now() - gT0;
            gathered.mic = keepMic;
          }
          log.push({ round, earlyExitConflict: false, lyDo: 'TIN_HIEU_TRAI_NHOM', hs: nz(eeChot.hs), group: eeChot._conflictEarly?.group || null, chanChotSom: [...new Set(chanConflict.map((c) => c.ma))], nhomTrai: [...new Set(chanConflict.map((c) => c.nhom))], chiTiet: chanConflict.map((c) => c.chiTiet), ...(nap.length ? { napNhom: nap } : {}) });
        } else {
          const h4Chot = nz(eeChot.hs).slice(0, 4);
          if (h4Chot && !(gathered.headings || []).includes(h4Chot)) gathered.headings = [h4Chot, ...(gathered.headings || [])];
          const gChot = gates(eeChot, { source, productText, gathered, machinery, round, productName: product.nameVi || raw.tenHang, form: product.form, pool: casePool(r1, eeChot, gathered) });
          if (!gChot.blocks.length && !gChot.challenges.length) {
            r2 = eeChot; g = gChot;
            log.push({ round, earlyExitConflict: true, hs: nz(eeChot.hs), group: eeChot._conflictEarly?.group || null });
            break;
          }
          log.push({ round, earlyExitConflict: false, lyDo: [...gChot.blocks.map((b) => b.gate), ...(gChot.challenges.length ? ['SO_TAY'] : [])].join(',') || 'khong-ro', hs: nz(eeChot.hs) });
        }
      }
      const ee = conflictBiChanTraiNhom ? null : earlyExitHoiTuR1(r1);
      // HS_CHOT_SOM_CO_KIEM (mặc định TẮT — tắt thì chanSom luôn rỗng, nhánh dưới chạy y như cũ): hồ sơ vụ việc đã có tín hiệu
      // tất định TRÁI NHÓM 4 SỐ với giả thuyết đứng đầu (tiền lệ Oz đạt ngưỡng cờ review / TB-TCHQ khớp tên hàng / ≥3 shop
      // made-in-china / sổ tay nhóm đó loại trừ đích danh) ⇒ KHÔNG dừng sớm: đi tiếp vòng 2 như đường thường để AI đọc chú
      // giải + sổ tay + chính các tín hiệu đó (gói vòng 2 vốn đã mang chúng). Ca van điện từ khí nén 5/2 qua Cổng 21/11:
      // vòng 1 neo 8412.21, tiền lệ Oz + 3 shop nói 8481, dừng sớm bỏ vòng 2 → khách nhận 84122100.
      let chanSom = [];
      if (ee && chotSomCoKiem.bat()) {
        try { chanSom = chotSomCoKiem.tinHieuTraiNhom({ hs: ee.hs, gathered, r1, raw, productText, productName: product.nameVi || raw.tenHang, form: product.form }); } catch { chanSom = []; }
      }
      if (chanSom.length) {
        // Nhóm trái chiều chưa có chú giải + dòng biểu thuế trong hồ sơ → nạp bằng gather thật (cùng cách lượt giải trình sổ
        // tay nạp nhóm đích), để vòng 2 đối chiếu được và đổi sang đó không vướng chốt chặn "nhóm chưa kiểm".
        const nap = chotSomCoKiem.nhomCanNap(chanSom, gathered.headings).filter((t) => !usedHeadings.has(t));
        if (nap.length) {
          for (const t of nap) usedHeadings.add(t);
          const keepMic = gathered.mic; const gT0 = Date.now();
          ganBuoc('gather');
          gathered = await gather(r1, raw, { usedHeadings, micAllowed: false });
          phases.gatherMs += Date.now() - gT0;
          gathered.mic = keepMic;
        }
        log.push({ round, earlyExitHoi: false, lyDo: 'TIN_HIEU_TRAI_NHOM', hs: nz(ee.hs), chanChotSom: [...new Set(chanSom.map((c) => c.ma))], nhomTrai: [...new Set(chanSom.map((c) => c.nhom))], chiTiet: chanSom.map((c) => c.chiTiet), ...(nap.length ? { napNhom: nap } : {}) });
        // OZV-2224: chỉ sổ tay loại trừ, vòng 1 đã có giả thuyết ở nhóm đích → HOI trên giả thuyết đó, chạy lại ĐỦ cổng G1–G8.
        // Cổng sổ tay trên mã mới chỉ còn nghi loại trừ (SO_TAY_LOAI_TRU) thì không đòi AI giải trình: đáp án là HOI, câu hỏi
        // sổ tay đi thẳng tới khách (soTay.challenges, kết cục UNRESOLVED → chuyên viên xem, y như đường vòng 2 hết giờ).
        const eeDoi = hoiTheoGiaThuyetNhomDich(r1, ee, chanSom, { productText, productName: product.nameVi || raw.tenHang, form: product.form });
        if (eeDoi) {
          const eeCtxDoi = { source, productText, machinery, round, productName: product.nameVi || raw.tenHang, form: product.form, earlyHoi: true };
          let gDoi = gates(eeDoi, { ...eeCtxDoi, gathered, pool: casePool(r1, eeDoi, gathered) });
          if (gDoi.blocks.length && !gDoi.challenges.length && gDoi.blocks.every((b) => b.gate === 'NHOM_CHUA_KIEM')) {
            ganBuoc('gather');
            const napDoi = await napNhomTatDinh({ h4: gDoi.blocks[0].addHeading, r1, ans: eeDoi, raw, gathered, usedHeadings, gateCtx: eeCtxDoi });
            gathered = napDoi.moi; phases.gatherMs += napDoi.gatherMs;
            gDoi = napDoi.g2;
          }
          if (!gDoi.blocks.length && gDoi.challenges.every((c) => c.gate === 'SO_TAY_LOAI_TRU')) {
            r2 = eeDoi; g = gDoi;
            // L11.2: nhánh tối ưu ghi rõ bước nào đã chạy, bước nào CHƯA (không để giá trị khởi tạo 'NONE'/'CHUA_TRA').
            // Cổng sổ tay G8 ĐÃ chạy tất định trên mã mới; lượt AI vòng 2 đọc sổ tay + chú giải nhóm mới và lượt giải
            // trình sổ tay thì CHƯA chạy. Kê khai ở data/luat/dau-noi.json → nhanhBoQua "hoiTheoGiaThuyetNhomDich".
            if (soTay.mode !== 'off') {
              if (gDoi.challenges.length) soTay.challenges = gDoi.challenges;
              soTay.outcome = gDoi.challenges.length ? 'UNRESOLVED' : (gDoi.soTayChecked ? 'DA_TRA_KHONG_NGHI' : 'CHUA_CHAY');
              soTay.nhanhToiUu = { ten: 'hoiTheoGiaThuyetNhomDich', congSoTayG8: gDoi.soTayChecked ? 'DA_CHAY' : 'CHUA_CHAY', aiDocSoTayVaChuGiai: 'CHUA_CHAY', giaiTrinhSoTay: 'CHUA_CHAY' };
            }
            log.push({ round, earlyExitHoi: true, hs: nz(eeDoi.hs), doiTu: nz(ee.hs), nguon: 'so-tay-loai-tru', unknowns: (r1.verify?.unknowns || []).filter(Boolean).length });
            break;
          }
          log.push({ round, earlyExitHoiDoiNhom: false, hs: nz(eeDoi.hs), lyDo: [...gDoi.blocks.map((b) => b.gate), ...gDoi.challenges.map((c) => c.gate)].join(',') || 'khong-ro' });
        }
      } else if (ee) {
        // OZV-1389: earlyHoi = cổng G6 made-in-china chỉ cảnh báo (HOI chưa chốt mã); mọi cổng khác giữ nguyên.
        const eeCtx = { source, productText, machinery, round, productName: product.nameVi || raw.tenHang, form: product.form, earlyHoi: true };
        let gEe = gates(ee, { ...eeCtx, gathered, pool: casePool(r1, ee, gathered) });
        // OZV-1380: cổng DUY NHẤT chặn là NHOM_CHUA_KIEM (R1 đã đủ câu hỏi, chỉ thiếu chú giải nhóm giả thuyết) → máy nạp
        // tất định nhóm đó (gather thật, như nhomChuaKiemTatDinh) rồi chạy lại TOÀN BỘ cổng — không tốn vòng AI R2
        // (ca bo mạch NEED_FACTS 81–118 s, thực địa 18/11). Không chèn tay gathered.headings: chỉ qua khi gather nạp được.
        if (gEe.blocks.length && !gEe.challenges.length && gEe.blocks.every((b) => b.gate === 'NHOM_CHUA_KIEM')) {
          const h4Ee = gEe.blocks[0].addHeading;
          ganBuoc('gather'); // OZV-1520
          const nap = await napNhomTatDinh({ h4: h4Ee, r1, ans: ee, raw, gathered, usedHeadings, gateCtx: eeCtx });
          gathered = nap.moi; phases.gatherMs += nap.gatherMs;
          gEe = nap.g2;
          log.push({ round, tatDinh: 'NHOM_CHUA_KIEM', nhom: h4Ee, hs: nz(ee.hs), buoc: 'earlyExitHoi', blocks: gEe.blocks.map((b) => b.gate), ...(gEe.challenges.length ? { soTay: gEe.challenges.map((c) => c.gate) } : {}) });
        }
        // OZV-1707: sau khi qua G1–G8, kiểm phân nhóm 6 số bằng sổ tay / chú giải / từ điển / tiền lệ (tất định trước, LLM sau) trước khi dừng hỏi.
        if (!gEe.blocks.length && !gEe.challenges.length) {
          const kpn = kiemPhanNhomEarlyHoi({ ee, r1, raw, gathered, product, productText });
          if (!kpn.ok) {
            log.push({ round, earlyExitHoi: false, lyDo: kpn.lyDo || 'PHAN_NHOM_CHUA_CHAC', hs: nz(ee.hs) });
          } else {
            if (kpn.hs6 && kpn.hs6 !== nz(ee.hs)) {
              log.push({ round, kiemPhanNhomEarlyHoi: 'DOI_PHAN_NHOM', tu: nz(ee.hs), den: kpn.hs6, nguon: kpn.nguon });
              ee.hs = kpn.hs6;
              gEe = gates(ee, { ...eeCtx, gathered, pool: casePool(r1, ee, gathered) });
            }
            if (!gEe.blocks.length && !gEe.challenges.length) {
              r2 = ee; g = gEe;
              log.push({ round, earlyExitHoi: true, hs: nz(ee.hs), unknowns: (r1.verify?.unknowns || []).filter(Boolean).length });
              break;
            }
            log.push({ round, earlyExitHoi: false, lyDo: [...gEe.blocks.map((b) => b.gate), ...(gEe.challenges.length ? ['SO_TAY'] : [])].join(',') || 'khong-ro' });
          }
        } else {
          log.push({ round, earlyExitHoi: false, lyDo: [...gEe.blocks.map((b) => b.gate), ...(gEe.challenges.length ? ['SO_TAY'] : [])].join(',') || 'khong-ro' });
        }
      }
    }
    // HS_TIM_TRUOC=goi (mặc định TẮT ⇒ khoiGoi luôn rỗng, đầu vào vòng 2 y như cũ): nối trích dẫn phân biệt giữa các nhóm còn sống.
    let khoiGoi = '';
    if (timTruocMod.batGoi()) {
      try {
        const kp = require('./do-thi/khoi-phan-biet.js').khoiPhanBiet(r1?.hypotheses, timTruocKq?.tomTat?.nhom);
        khoiGoi = kp.khoi; engine.goiPhanBiet = kp.tomTat;
      } catch (e) { engine.goiPhanBiet = { loi: tomTatLoi(e.message) }; }
    }
    const user = `${gathered.pack}${khoiGoi ? `\n\n${khoiGoi}` : ''}${feedback ? `\n\n${pending ? 'LẦN TRƯỚC — ' : `LẦN TRƯỚC BỊ CHẶN (vòng ${round - 1}):\n`}${feedback}` : ''}`;
    try {
      const r2Timeout = hanBuoc(R2_TIMEOUT_MS, 10000);
      const r2T0 = Date.now();
      ganBuoc('vong' + round); // OZV-1520
      const r2Res = await callWithFallback(gon ? SYS_R2_GON : SYS_R2, user, { step: 'gir', minimax: stepModel('gir'), tier: opts.tier, maxTokens: r2MaxTokens, timeoutMs: r2Timeout, temperature: 0.1, ...providerOpts(r2Timeout), ...(gon ? { kiemKhoa: DU_KHOA.gir } : {}), hanChotMs: hanChot }, log);
      nhanChanDoanLlm(r2Res);
      const { json, provider } = r2Res;
      const vongMs = Date.now() - r2T0; // OZV-507 việc 2: ms của riêng vòng này (kể cả lần lùi tắt suy nghĩ trong callWithFallback)
      phases.llmMs += vongMs;
      phases.llmTungVong.push(vongMs);
      r2 = json || {}; engine.rounds += 1; engine.providers.push(provider);
    } catch (e) {
      log.push({ round, error: tomTatLoi(e.message) });
      if (!r2) return withLegal({ ...classifyStatus({ headings: gathered.headings, engineFailed: 'ENGINE_TIMEOUT' }), results: [], missing: [missingQuaGio(opts.kenhGoi)], candidates: { headings: gathered.headings, precedentCodes: [] }, dossier: { product, hypotheses: r1.hypotheses || [] }, engine });
      break;
    }
    g = gates(r2, { source, productText, gathered, machinery, round, productName: product.nameVi || raw.tenHang, form: product.form, pool: casePool(r1, r2, gathered) });
    log.push({ round, decision: r2.decision, hs: nz(r2.hs), blocks: g.blocks.map((b) => b.gate), warnings: g.warnings.length, ...(g.challenges.length ? { soTay: g.challenges.map((c) => c.gate) } : {}) });
    // HS_MAX_VONG_SUA: cổng DUY NHẤT chặn là "nhóm chưa kiểm" → máy gom nhóm đó + kiểm lại tất định trước khi tốn vòng AI
    // (nhomChuaKiemTatDinh: điều kiện nhận, vì sao không nới cổng). Lượt giải trình sổ tay (pending) đi đường cũ.
    let daGom = false;
    if (capVong != null && !pending && g.blocks.length && g.blocks.every((b) => b.gate === 'NHOM_CHUA_KIEM')) {
      ganBuoc('gather'); // OZV-1520
      const td = await nhomChuaKiemTatDinh({ h4: g.blocks[0].addHeading, r1, r2, raw, gathered, usedHeadings, round, gateCtx: { source, productText, machinery, round, productName: product.nameVi || raw.tenHang, form: product.form } });
      gathered = td.gathered; phases.gatherMs += td.gatherMs; daGom = true;
      log.push(td.log);
      if (td.g) { g = td.g; ghiChuNhom = td.ghiChuNhom; }
    }
    soTayDaTra = !g.blocks.length && soTay.mode !== 'off' && nz(r2.hs).length >= 6;
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
        if (targets.length) { for (const t of targets) usedHeadings.add(t); const keepMic = gathered.mic; ganBuoc('gather'); gathered = await gather(r1, raw, { usedHeadings, micAllowed: false }); gathered.mic = keepMic; }
        continue;
      }
      break;
    }
    if (pending) { pending = null; soTay.outcome = 'BLOCKED_AFTER'; } // lượt giải trình lại vướng chốt chặn → xử lý như chặn
    const add = g.blocks.find((b) => b.addHeading)?.addHeading;
    if (add && !daGom) {
      usedHeadings.add(add); const keepMic = gathered.mic;
      ganBuoc('gather'); // OZV-1520
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
  } // hết if (!r2) — đường AI thường

  if (pending) soTay.outcome = 'NO_TIME'; // đã yêu cầu giải trình nhưng hết giờ trước khi AI trả lời
  else if (soTay.outcome === 'CHUA_TRA' && g?.soTayChecked && !(g?.challenges?.length)) soTay.outcome = 'DA_TRA_KHONG_NGHI';
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
    if (chotDong?.checked && (chotDong.ketQua === 'CHOT' || chotDong.ketQua === 'LOAI_KHAC') && chotDong.hs && chotDong.hs !== finalHs
      && !biCamTrade(chotDong.hs, gathered.tradeHints?.avoidPrefixes || [])) {
      finalHs = chotDong.hs;
      chotDong.daDoi = true;
    }
  }
  // OZV-590: Khi R2 trả HOI hoặc mới dừng ở 6 số nhưng chotDong8 chốt tất định được dòng 8 số từ chữ mô tả
  // (hoặc có tiền lệ TB-TCHQ trong poolCodes được chotDong8 xác nhận độc lập trên đúng phân nhóm 6 số),
  // nâng cấp kết cục sang CHOT dòng 8 số (chỉ bật khi capVong != null để giữ nguyên hành vi khi tắt cờ).
  // OZV-1322: không chốt dòng thuộc avoid của trade-synonyms (vd 852581* «Camera truyền hình» tốc độ cao
  // khi từ điển đã chốt 85258920) — để khối promote bên dưới đôn đúng.
  const tradeAvoidChot = gathered.tradeHints?.avoidPrefixes || [];
  // OZV-1648 (hồi quy ca #31 bộ 50 ca TB-TCHQ): R2 còn HOI ở 6 số (máy CHƯA chắc phân nhóm) mà đã có tiền lệ TB-TCHQ
  // khớp TRÙNG KHÍT tên hàng (`chacChan`, cùng phép kiểm với nhánh OZV-822 bên dưới) trỏ sang MÃ KHÁC ⇒ không để
  // chotDong8 nâng HOI → CHOT trên phân nhóm máy còn ngờ. chotDong8 chỉ chọn ĐUÔI 8 số trong phân nhóm 6 số đã cho
  // (GIR 6); chọn nhóm/phân nhóm là việc của GIR 1 — tiền lệ TB-TCHQ đúng hàng đó đã làm. Vd giàn phơi không dùng điện:
  // R2 HOI 847989 → 84798970 «Loại khác, không hoạt động bằng điện» đè tiền lệ 83025000 (TB 4548/TCHQ-TXNK).
  const tienLeChacChanKhac = (maChot) => {
    try {
      const hang = {
        tenHang: raw.tenHang || product.nameVi || '',
        moTa: [raw.tenHang, raw.chatLieu, raw.congDung, raw.chucNang, typeof raw.specs === 'string' ? raw.specs : null].filter(Boolean).join('. ') || product.nameVi || '',
      };
      const ungVien = [...new Set([
        ...(Array.isArray(r2?.alternatives) ? r2.alternatives.map((a) => nz(a.hs)) : []),
        ...(r1?.verify?.codes8 || []).map(nz),
        ...(gathered.poolCodes || []).map((c) => nz(c.hs)),
      ])].filter((h) => /^\d{8}$/.test(h) && Boolean(taxData[h]) && gathered.headings.includes(h.slice(0, 4)));
      const kc = kiemTruocChotMod.kiemTruocChot({ topHs: null, hang, ungVien });
      const chac = (kc.deXuat || []).find((d) => d.chacChan === true) || null;
      if (!chac || chac.hs === maChot || !taxData[chac.hs] || !checkPolarity(chac.hs, productText).ok) return null;
      return Number(chac.diem) >= 1 || checkSubheading(chac.hs, productText).ok ? chac : null;
    } catch { return null; }
  };
  if (capVong != null && !chotDong?.daDoi) {
    const isHoi = String(r2?.decision || '').toUpperCase() === 'HOI';
    if (!blocked.length && finalHs.length >= 6 && (isHoi || finalHs.length === 6)) {
      const cd = chotDong8({ hs: finalHs.slice(0, 6), productText });
      const tienLeKhac = cd?.checked && (cd.ketQua === 'CHOT' || cd.ketQua === 'LOAI_KHAC') && cd.hs && finalHs.length === 6
        ? tienLeChacChanKhac(cd.hs) : null;
      if (tienLeKhac) log.push({ note: 'chot-dong-nhuong-tien-le', chotDong: cd.hs, tienLe: tienLeKhac.hs });
      if (!tienLeKhac && cd?.checked && (cd.ketQua === 'CHOT' || cd.ketQua === 'LOAI_KHAC') && cd.hs && (finalHs.length === 6 || cd.hs === finalHs)
        && !biCamTrade(cd.hs, tradeAvoidChot)) {
        const ktc = kiemTruocChotMod.kiemTruocChot({ hs: cd.hs, productText });
        if (!ktc?.coCo) {
          chotDong = { ...cd, daDoi: true };
          finalHs = cd.hs;
          if (isHoi) r2 = { ...r2, decision: 'CHOT' };
        }
      }
    }
    if (isHoi && !chotDong?.daDoi && blocked.every((b) => b.gate === 'NHOM_CHUA_KIEM')) {
      const tbCand = (gathered.poolCodes || []).find((p) => p.from === 'tb-tchq' && nz(p.hs).length === 8);
      if (tbCand) {
        const tbHs = nz(tbCand.hs);
        const cd = chotDong8({ hs: tbHs.slice(0, 6), productText });
        if (cd?.checked && (cd.ketQua === 'CHOT' || cd.ketQua === 'LOAI_KHAC') && cd.hs === tbHs
          && !biCamTrade(cd.hs, tradeAvoidChot)) {
          const ktc = kiemTruocChotMod.kiemTruocChot({ hs: cd.hs, productText });
          if (!ktc?.coCo) {
            chotDong = { ...cd, daDoi: true };
            finalHs = cd.hs;
            const h4 = cd.hs.slice(0, 4);
            if (!gathered.headings.includes(h4)) gathered.headings.push(h4);
            blocked.length = 0;
            r2 = { ...r2, decision: 'CHOT' };
          }
        }
      }
    }
  }
  // OZV-1266: từ điển trade-synonyms — R2 còn HOI / mã avoid (vd 841490) trong khi từ điển đã
  // chốt high 8 số → đôn mã từ điển (cùng nguồn /api/suggest sau #1371). Không đụng bảng đã duyệt.
  // OZV-1290: thêm (a) MIC nhiễu đúng nhóm avoid → gỡ chặn NSX; (b) HOI/6 số cùng nhánh mã high.
  // OZV-1320: KHÔNG đôn khi earlyExitHoi (ca giác hút #1384 — unknowns cố ý hỏi, bỏ GIR).
  // Còn unknowns sau khi đã leo GIR (vd gemini-free để lại câu hỏi chất liệu) không chặn đôn
  // cùng nhánh high (Zonye AR HOI 848120 → 84812011).
  // OZV-1322: mục từ điển `chotSom` (camera CMR12) vẫn đôn cùng nhánh dù earlyExitHoi;
  // avoid 852581/82/83 → biCam đôn khi AI lệch phân nhóm tốc độ cao/bức xạ/nhìn đêm.
  if (resolver.status !== 'RESOLVED' && !chotDong?.daDoi) {
    try {
      const hints = gathered.tradeHints?.preferCodes
        ? {
          preferCodes: gathered.tradeHints.preferCodes,
          avoidPrefixes: gathered.tradeHints.avoidPrefixes || [],
          matches: (gathered.tradeHints.entryIds || []).map((id) => ({ entryId: id })),
        }
        : tradeClassifyHints([raw.tenHang, product.nameVi, product.purpose, product.material].filter(Boolean).join(' '));
      const pref = tradePreferredHs(hints);
      const decisionNow = String(r2?.decision || '').toUpperCase();
      const biCam = Boolean(finalHs) && biCamTrade(finalHs, hints.avoidPrefixes);
      const micHeading = gathered.mic?.consensus?.heading4;
      const micNhieu = Boolean(micHeading) && biCamTrade(micHeading, hints.avoidPrefixes)
        && blocked.some((b) => b.gate === 'NHA_SAN_XUAT_KHAC_NHOM');
      const daEarlyExitHoi = log.some((l) => l.earlyExitHoi === true);
      // Camera CMR12: HOI 852589 + từ điển high 85258920 → đôn 8 số (kể cả earlyExit nếu chotSom).
      // Giác hút earlyExitHoi (không chotSom) → giữ NEED_FACTS, không promote (#1384).
      const cungNhanhHigh = Boolean(
        pref
        && pref.confidence === 'high'
        && finalHs
        && pref.hs.startsWith(finalHs.slice(0, Math.min(6, finalHs.length)))
        && (decisionNow === 'HOI' || finalHs.length < 8)
        && (!daEarlyExitHoi || pref.chotSom === true),
      );
      const hangKhachTam = {
        tenHang: raw.tenHang || product.nameVi || '',
        moTa: [raw.tenHang, raw.chatLieu, raw.congDung, raw.chucNang, typeof raw.specs === 'string' ? raw.specs : null].filter(Boolean).join('. ') || product.nameVi || '',
      };
      const ungVienKtc = [...new Set([
        finalHs,
        ...(Array.isArray(r2?.alternatives) ? r2.alternatives.map((a) => nz(a.hs)) : []),
        ...(r1?.verify?.codes8 || []).map(nz),
        ...(gathered.poolCodes || []).map((c) => nz(c.hs)),
      ])].filter((h) => /^\d{8}$/.test(h) && Boolean(taxData[h]) && gathered.headings.includes(h.slice(0, 4)));
      const ktcChac = kiemTruocChotMod.kiemTruocChot({ topHs: null, hang: hangKhachTam, ungVien: ungVienKtc });
      const coTienLeChacChan = Boolean((ktcChac.deXuat || []).find((d) => d.chacChan === true));
      const canPromote = !coTienLeChacChan && Boolean(pref && taxData[pref.hs] && (hints.matches || []).length)
        && (biCam || micNhieu || cungNhanhHigh)
        && (decisionNow === 'HOI' || finalHs.length < 8 || biCam || micNhieu);
      if (canPromote) {
        finalHs = pref.hs;
        r2 = {
          ...r2,
          decision: 'DE_XUAT',
          hs: pref.hs,
          confidence: Math.max(Number(r2?.confidence) || 0, 78),
          reason: clip(`Theo từ điển tên thương mại (${pref.entryId}): ${pref.whenVi || pref.hs}`, 400),
        };
        const h4 = pref.hs.slice(0, 4);
        gathered.headings = [h4, ...(gathered.headings || []).filter((h) => h !== h4 && !biCamTrade(h, hints.avoidPrefixes))];
        blocked.length = 0;
        log.push({ note: 'trade-synonyms-promote', from: hs, to: pref.hs, entryId: pref.entryId });
      }
    } catch (e) {
      log.push({ note: 'trade-synonyms-promote lỗi', error: String(e?.message || e).slice(0, 100) });
    }
  }
  // OZV-1313: mã thuộc avoidPrefixes (vd 848110* khi từ điển AR đã chốt 848120) không đưa vào results —
  // nếu chỉ đôn top1 mà vẫn để alt biCam, khách/ERP vẫn thấy 848110* trong top/result.
  const tradeAvoidAlts = gathered.tradeHints?.avoidPrefixes || [];
  const alts = ganLyDoThayThe((Array.isArray(r2?.alternatives) ? r2.alternatives : []).map((a) => ({ hs: nz(a.hs), confidence: null, reason: clip(a.whyNot, 200), source: 'engine-loop:alt' })).filter((a) => a.hs.length >= 6 && a.hs !== finalHs && !biCamTrade(a.hs, tradeAvoidAlts)), { tu: 0 });
  // #725-46 (mục 4): lý do loại do AI viết gán cho dòng chữ tên nguyên văn không có ("dành cho đầu nối có dây dẫn kèm theo") →
  // nhãn AI_CHUA_KIEM, không làm căn cứ loại (chỉ gắn nhãn, không đổi thứ tự/mã).
  for (const a of alts) {
    try {
      const f = kiemTruocChotMod.kiemLyDoLoai(a);
      if (f) { a.lyDoChuaKiem = f; a.reason = clip(`${a.reason} [AI_CHUA_KIEM — ${f.ghiChu} Tên nguyên văn: ${f.tenNguyenVan}]`, 400); }
    } catch { /* kiểm phụ — lỗi thì bỏ nhãn */ }
  }
  // OZV-1388: Ca HOI dừng ở 6 số mà phân nhóm đó chỉ có ĐÚNG MỘT dòng 8 số trong biểu (GIR 6 — chỉ dựa cây biểu,
  // không so chữ dòng; vd 320419 → 32041900) và không thuộc avoid của trade-synonyms → đặt dòng 8 số đó vào
  // results[0] làm mã dự kiến (`duKien: true`) kèm lý do phụ thuộc câu trả lời; `finalHs`/`decision`/`status`
  // giữ nguyên (HOI / NEED_FACTS), câu hỏi giữ nguyên, không đụng `chotDong8`.
  const maDuKien = (
    gonDauRa()
    && resolver.status !== 'RESOLVED'
    && !chotDong?.daDoi
    && !blocked.length
    && String(r2?.decision || '').toUpperCase() === 'HOI'
    && finalHs.length === 6
  ) ? (() => {
    const d8 = dong8DuyNhat(finalHs);
    return d8 && !biCamTrade(d8, tradeAvoidAlts) ? d8 : null;
  })() : null;
  let results = finalHs ? [{
    hs: maDuKien || finalHs,
    confidence: Math.max(0, Math.min(100, Number(r2.confidence) || 0)),
    reason: maDuKien
      ? clip(`Dòng 8 số duy nhất của phân nhóm ${finalHs}, còn phụ thuộc câu trả lời${r2?.reason ? ` — ${r2.reason}` : ''}`, 400)
      : clip(r2.reason, 400),
    ...(maDuKien ? { duKien: true } : {}),
    basis: g?.basis || [],
    conditions: g?.conditions || [], source: 'engine-loop',
    ...(resolver.status === 'RESOLVED' ? { resolverOverride: { from: g.tableOverride.from, ...(resolver.trace?.[0] || {}) }, reason: g.tableOverride.dec.reasonVi || clip(r2.reason, 400), confidence: Math.max(Number(r2.confidence) || 0, 85) } : {}),
    ...(hs !== finalHs ? {} : {}),
  }, ...(resolver.status === 'RESOLVED' && hs !== finalHs ? [{ hs, confidence: Math.min(Number(r2.confidence) || 0, 50), reason: clip(r2.reason, 200), source: 'engine-loop' }] : []), ...alts].slice(0, 3) : [];
  // ── OZV-517: MÃ TIỀN LỆ TB-TCHQ "CHẮC CHẮN" LÊN VỊ TRÍ 1 ──────────────────────────────────────────────────────────
  // NGUYÊN NHÂN CHUNG (đo trên bộ 50 ca TB-TCHQ #1256): `kiemTruocChot` đã tìm được mã tiền lệ có tên hàng khớp
  // gần như TRÙNG KHÍT (độ giống 1.0) nhưng engine-loop LUÔN xếp mã AI chọn ở vị trí 1, mã tiền lệ rơi xuống vị trí 2
  // ⇒ khách thấy mã SAI ở đầu danh sách. Đây là nguyên nhân chung của nhóm ca "mã anh em bị xếp lộn".
  // Sửa: mã tiền lệ CHẮC CHẮN (độ giống = 1.0 + ≥5 từ có nghĩa chung + ứng viên DUY NHẤT) lên vị trí 1, kèm nhãn
  // "theo tiền lệ TB-TCHQ" + evidence để khách thấy căn cứ. KHÔNG bỏ qua cổng nào:
  //   · resolver RESOLVED (bảng quyết định đã chốt) → không đụng;
  //   · chotDong8 đã đổi dòng (chốt theo điều kiện số) → không đụng;
  //   · luật "Loại khác" (#725-46) đang có hiệu lực → không đụng;
  //   · mã không nằm trong `kiemTruocChot.deXuat` (đã qua bộ lọc dòng anh em cùng tiêu đề cha) → không đụng.
  const hangKhach = { tenHang: raw.tenHang || product.nameVi || '', moTa: [raw.tenHang, raw.chatLieu, raw.congDung, raw.chucNang, typeof raw.specs === 'string' ? raw.specs : null].filter(Boolean).join('. ') || product.nameVi || '' };
  let kiemChot = { coCo: false, canhBao: [], deXuat: [] };
  let promoTienLe = null;
  // OZV-517 (GĐ 13/11 TRẢ THỢ lần 2 — ý CHẶN (1)): mã ĐÃ ĐƯỢC ĐÔN lên vị trí 1 (khác mã máy chốt ban đầu).
  // `kiemChot` tính cho mã CŨ nên cảnh báo/dự xuất của nó bám mã CŨ trong khi `results[0]` đã là mã MỚI ⇒ khách/ERP nhận
  // cảnh báo nói về mã A trong khi mã đầu là mã B — căn cứ sai thì tệ hơn không có căn cứ (bằng chứng đưa cho Hải quan).
  // ⇒ đã đôn mã thì LUÔN tính lại `kiemChot` cho mã đang ở vị trí 1 (không đi qua điều kiện `!kiemChot.coCo`).
  let maDaDoi = null;
  let boQuaChanTienLe = false;
  if (finalHs && !blocked.length && /^\d{8}$/.test(finalHs) && resolver.status !== 'RESOLVED' && !chotDong?.daDoi) {
    try {
      const ungVien = [...new Set([finalHs, ...alts.map((a) => a.hs), ...(gathered.poolCodes || []).map((c) => c.hs)])].filter((h) => /^\d{8}$/.test(h));
      kiemChot = kiemTruocChotMod.kiemTruocChot({ topHs: finalHs, hang: hangKhach, ungVien });
      // Mã "chắc chắn" = đề xuất của chính luật tiền lệ, khớp TRÙNG KHÍT và là ứng viên DUY NHẤT (lib/kiem-truoc-chot.js).
      promoTienLe = (kiemChot.deXuat || []).find((d) => d.chacChan === true) || null;
    } catch (e) { log.push({ note: 'kiem-truoc-chot lỗi', error: String(e?.message || e).slice(0, 100) }); }
  } else if (capVong != null && resolver.status !== 'RESOLVED' && !chotDong?.daDoi && (
    (!blocked.length && /^\d{6}$/.test(finalHs))
    || (!finalHs && blocked.length > 0 && blocked.every((b) => b.gate === 'MA_KHONG_TON_TAI'))
    || (blocked.length > 0 && blocked.every((b) => b.gate === 'NHOM_CHUA_KIEM'))
  )) {
    // OZV-822: Khi R2 dừng ở 6 số (HOI, vd stt 6 → 760310), trả hs="" (vd stt 4), hoặc bị chặn lệch nhóm,
    // vẫn xét các ứng viên 8 số hợp lệ trong `tax.json` thuộc nhóm đã gom (`gathered.headings`). Nếu có duy nhất
    // một tiền lệ TB-TCHQ khớp TRÙNG KHÍT CHẮC CHẮN (`chacChan: true`, truyền `topHs: null` tường minh — không dùng mã mồi)
    // và qua cổng đối cực/phân nhóm thì đôn lên vị trí 1 với cờ cục bộ `boQuaChanTienLe = true` (không cắt mảng `g.blocks`).
    try {
      const ungVien = [...new Set([
        ...alts.map((a) => a.hs),
        ...(r1?.verify?.codes8 || []).map(nz),
        ...(gathered.poolCodes || []).map((c) => nz(c.hs)),
      ])].filter((h) => /^\d{8}$/.test(h) && Boolean(taxData[h]) && gathered.headings.includes(h.slice(0, 4)));
      const kcTam = kiemTruocChotMod.kiemTruocChot({ topHs: null, hang: hangKhach, ungVien });
      const ungChac = (kcTam.deXuat || []).find((d) => d.chacChan === true) || null;
      // OZV-1316: tiền lệ TB khớp trùng khít (chacChan + diem ≥ 1) đã chốt mã 8 số theo tên hàng —
      // không đòi checkSubheading theo chữ dòng biểu thuế (vd 39199092 liệt kê «polyme trùng hợp…»
      // trong khi khách chỉ viết «nhãn PET tự dính»). Vẫn giữ polarity; subheading chỉ bắt buộc
      // khi điểm giống < 1 (ứng viên chưa trùng khít tên).
      if (ungChac && taxData[ungChac.hs] && checkPolarity(ungChac.hs, productText).ok) {
        const subOk = Number(ungChac.diem) >= 1 || checkSubheading(ungChac.hs, productText).ok;
        if (subOk) {
          promoTienLe = ungChac;
          boQuaChanTienLe = true;
        }
      }
    } catch (e) { log.push({ note: 'kiem-truoc-chot lỗi', error: String(e?.message || e).slice(0, 100) }); }
  }
  if (promoTienLe && promoTienLe.hs !== finalHs) {
    maDaDoi = promoTienLe.hs;
    const { duKien: _dk, ...co } = results.find((r) => r.hs === promoTienLe.hs) || {};
    results = [{
      ...co,
      hs: promoTienLe.hs,
      confidence: TRAN_TIN_CAY_KIEM_CHOT,
      reason: `Theo tiền lệ TB-TCHQ: ${promoTienLe.reason}`,
      source: 'kiem-truoc-chot:tien-le',
      evidence: promoTienLe.evidence,
      xepHang: 'TIEN_LE_TB_TCHQ',
      basis: [...(co?.basis || []), { stream: 'TIEN_LE_TB_TCHQ', claim: `Mã ${promoTienLe.hs} theo tiền lệ TB-TCHQ có tên hàng khớp trùng khít hàng đang phân loại (độ giống ${promoTienLe.diem}, ${promoTienLe.chung} từ có nghĩa chung)`, evidence: promoTienLe.soTienLe ? `TB ${promoTienLe.soTienLe}` : null, ref: promoTienLe.soTienLe ? `TB ${promoTienLe.soTienLe}` : null, verified: true }],
    }, ...results.filter((r) => r.hs !== promoTienLe.hs)];
  }
  results = validateClassifyResults(results, gathered.headings).results;
  for (const r of results) { r.hsLevel = r.hs.length; const t = tbTchqGate(r.hs); if (t.hasPrecedent) r.tbTchq = t.entries; }
  const top = results[0];
  // #725-46 (mục 4): điều kiện MET phủ định mà AI gán cho dòng biểu thuế chữ tên nguyên văn không có → UNKNOWN + AI_CHUA_KIEM.
  if (top && Array.isArray(top.conditions) && top.conditions.length) {
    try { top.conditions = kiemTruocChotMod.kiemDieuKien(top.conditions, top.hs, alts.map((a) => a.hs)); } catch { /* giữ nguyên */ }
  }
  // #195: dòng do MÁY chốt theo điều kiện số có trích dẫn → tự tin tối thiểu 85 + căn cứ DETERMINISTIC.
  if (top && chotDong?.daDoi) {
    top.confidence = Math.max(Number(top.confidence) || 0, 85);
    top.reason = `${clip(r2?.reason, 200)} — chốt dòng ${chotDong.hs} theo điều kiện số sổ tay (${(chotDong.dieuKien || []).map((c) => (c.donVi ? `${c.fact} ${c.op} ${c.value} ${c.donVi}` : moTaDieuKienNgan(c))).join('; ')})`;
    top.dongChot = { tu: chotDong.tuHs, den: chotDong.hs, traNguon: (chotDong.traNguon || []).slice(0, 2) };
  }

  const questions = (Array.isArray(r2?.questions) ? r2.questions : []).filter((q) => q && (q.question || q.fact)).slice(0, 6)
    .map((q) => ({ attribute: null, fact: clip(q.fact, 120), questionVi: clip(q.question || `Xác nhận: ${q.fact}?`, 200), whereToFind: clip(q.whereToFind, 80) }));
  // #195: cổng chốt dòng thiếu số hồ sơ → câu hỏi dữ kiện có mục tiêu (điều kiện sổ tay nêu đúng ngưỡng cần).
  if (chotDong?.ketQua === 'THIEU_SO_LIEU') {
    for (const m of chotDong.missingFacts || []) {
      questions.push({ attribute: null, fact: m.fact, questionVi: m.cauHoi ? `${m.cauHoi} (để chốt dòng 8 số — sổ tay yêu cầu: ${m.canThoa})` : `Cần ${m.fact.replace(/_/g, ' ')} (${m.donVi}) để chốt dòng 8 số — sổ tay yêu cầu ${m.canThoa} ${m.donVi}.`, whereToFind: 'Thông số trên tem/nhãn hàng hoặc trang bán hàng.' });
    }
  }
  // Điều kiện CHƯA RÕ → câu hỏi: chỉ điều kiện KHẲNG ĐỊNH về hàng ("vận hành bằng tay", "công suất…"). Điều kiện phủ
  // định ("không phải kéo cắt cành…") là loại trừ AI đã cân nhắc, không thể trích nguyên văn → không hỏi khách.
  // Câu loại trừ ("Hàng KHÔNG phải kéo cắt cành…", "không thuộc 8201.50") → AI đã cân nhắc, không hỏi khách.
  // Câu khẳng định có chữ "không" bên trong ("vận hành bằng tay, không có động cơ") vẫn là dữ kiện cần hỏi.
  const NEGATIVE = /^\s*(hàng\s+|sản phẩm\s+|mặt hàng\s+)?(không|ko|chưa|not)\s+(phải|thuộc|là|bị|nằm|a\b|be\b)/i;
  const unknownConds = (top?.conditions || []).filter((c) => String(c.status).toUpperCase() === 'UNKNOWN' && !NEGATIVE.test(c.fact)).map((c) => clip(c.fact, 120)).slice(0, 3);
  const coChan = blocked.length > 0 && !boQuaChanTienLe;
  let missing = [...new Set([...questions.map((q) => q.questionVi), ...unknownConds.filter((f) => !questions.some((q) => q.fact === f)).map((f) => `Cần xác nhận: ${f}`)])];
  if (coChan) missing = [...new Set([...missing, ...blocked.map((b) => `Chưa chốt được: ${clip(b.reasonVi, 160)}`)])];

  const attrsForEcus = { ...raw, tenHang: product.nameVi || raw.tenHang, chatLieu: raw.chatLieu || product.material || null, congDung: raw.congDung || product.purpose || null };
  const ecus = top && top.hs.length === 8 && !top.duKien && !coChan ? buildEcus(top.hs, attrsForEcus) : null;
  let decision = String(r2?.decision || '').toUpperCase();
  if (maDaDoi && top && top.hs === maDaDoi && !coChan && (decision === 'HOI' || !decision)) decision = 'DE_XUAT';
  const needFacts = decision === 'HOI' || (top && (top.hs.length < 8 || top.duKien === true)) || (coChan && questions.length > 0);
  let status;
  if (!top) status = classifyStatus({ headings: gathered.headings, engineFailed: 'LLM_REJECTED' });
  else if (resolver.status === 'RESOLVED') status = classifyStatus({ results, headings: gathered.headings, resolverResolved: true });
  else if (coChan && !needFacts) status = { status: 'NEEDS_EXPERT', nextAction: { type: 'HUMAN_REVIEW', reasonCode: 'GATE_BLOCKED', reasonVi: blocked.map((b) => b.reasonVi).join(' '), optionsHs: results.map((r) => r.hs) } };
  else if (needFacts) status = { status: 'NEED_FACTS', nextAction: { type: 'ASK_USER', questions: questions.length ? questions.map((q) => ({ attribute: null, questionVi: q.questionVi, whereToFind: q.whereToFind })) : missing.map((m) => ({ attribute: null, questionVi: m })), howToAnswerVi: 'Bổ sung dữ kiện (ảnh tem/nhãn, thông số) rồi gọi lại /api/classify.' } };
  else status = { status: 'REVIEW', nextAction: { type: 'USER_CONFIRM', optionsHs: results.map((r) => r.hs) } };

  const review = decision === 'DE_XUAT' && !coChan
    ? { needed: true, reasons: [`Tranh luận phân loại: ${clip(r2.reason, 200)}${alts.length ? ` — mã đối lập ${alts.map((a) => a.hs).join(', ')}` : ''}`] }
    : { needed: false, reasons: [] };
  // Bảng quyết định CHƯA duyệt chỉ về mã khác → chuyên viên xem, mã bảng có mặt trong results để chọn.
  const decisionAdvisory = g?.tableAdvisory || null;
  if (top && !coChan && decisionAdvisory && !decisionAdvisory.agrees && top.hs !== decisionAdvisory.hs) {
    review.needed = true;
    review.reasons.push(decisionAdvisory.noteVi);
    if (!results.some((r) => r.hs === decisionAdvisory.hs)) {
      results = [...results.slice(0, 2), { hs: decisionAdvisory.hs, hsLevel: 8, confidence: null, reason: decisionAdvisory.reasonVi, source: 'decision-table-advisory', tableVerified: false }];
    }
  }
  // Sổ tay: máy nghi mà AI không giải trình được bằng câu trích hồ sơ (hoặc hết giờ) → chuyên viên xem.
  if (top && !coChan && ['UNRESOLVED', 'NO_TIME'].includes(soTay.outcome)) {
    review.needed = true;
    const open = soTay.outcome === 'NO_TIME' ? soTay.challenges : soTay.challenges.filter((c) => !soTay.giaiTrinh.find((x) => x.gate === c.gate && x.verified));
    for (const c of open) review.reasons.push(`Sổ tay chú giải: ${clip(c.reasonVi, 200)}`);
  }
  // #195: điều kiện số chồng lấn (thiếu thuộc tính phân biệt như chất liệu) → chuyên viên chốt dòng.
  if (top && !coChan && chotDong?.ketQua === 'TRANH_CAP') {
    review.needed = true;
    review.reasons.push(`Điều kiện dòng 8 số chồng lấn: ${(chotDong.dongThoa || []).join(', ')} cùng thoả ngưỡng — cần thuộc tính phân biệt (chất liệu/công dụng) để chốt dòng.`);
  }
  // Tiền lệ Oz (tờ khai đã thông quan) xếp NHÓM khác với mã chốt → không chặn (tiền lệ không đè chú giải) nhưng
  // chuyên viên phải xem: đo 07/10 trên 80 tờ khai, 11/24 ca sai-không-cờ là khác nhóm và đều có tiền lệ Oz trái chiều.
  if (top && !coChan) {
    // Chỉ tiền lệ khớp ≥75% từ khoá (tìm theo từ khoá hay nhiễu: "xe đẩy" khớp "bánh xe đẩy" 8302), nhóm dẫn đầu
    // phải chiếm ≥60% trọng số và ≥3 tờ khai. MỘT nguồn ngưỡng: chotSomCoKiem.tienLeOzDanDau — cùng hàm với phép chặn
    // dừng sớm (HS_CHOT_SOM_CO_KIEM), để cờ review và phép chặn không bao giờ lệch nhau.
    const lead = chotSomCoKiem.tienLeOzDanDau(gathered.ozPrecedents);
    if (lead && lead.nhom !== top.hs.slice(0, 4) && !(r2?.alternatives || []).some((a) => nz(a.hs).startsWith(lead.nhom))) {
      review.needed = true;
      review.reasons.push(`Tiền lệ Oz (${lead.soToKhai} tờ khai khớp ≥75% trọng số từ khoá) xếp nhóm ${lead.nhom}, hệ thống chốt ${top.hs.slice(0, 4)} — chuyên viên đối chiếu`);
    }
  }
  // #725-46 — LUẬT TẤT ĐỊNH TRƯỚC KHI CHỐT (lib/kiem-truoc-chot.js): mã sắp chốt là "Loại khác" mà mô tả khớp mạnh dòng/tiêu đề
  // bị trừ, hoặc TB-TCHQ cùng loại hàng kết luận mã khác → không được CHOT / rủi ro THẤP: hạ DE_XUAT, cờ chuyên viên, mã đề nghị
  // xem lên results (kèm tên nguyên văn + số TB). Máy nghi (HEURISTIC) — không đổi mã chốt, không GIR, không canCuPhapLy.
  // OZV-517: `kiemChot` đã tính TRƯỚC khi dựng `results` (mã tiền lệ chắc chắn phải kịp lên vị trí 1, không phải vị trí 2).
  // OZV-517 (GĐ 13/11 — ý CHẶN (1)): đã ĐÔN mã (maDaDoi) thì LUÔN tính lại `kiemChot` cho mã ĐANG Ở VỊ TRÍ 1, không đi qua
  // `!kiemChot.coCo` — nếu không, cảnh báo/dự xuất của mã CŨ bám sang mã MỚI (căn cứ sai). `ungVien` giữ cả mã cũ.
  if ((!kiemChot.coCo || maDaDoi) && top && !coChan && /^\d{8}$/.test(top.hs) && !top.duKien && resolver.status !== 'RESOLVED') {
    try {
      const ungVien = [...new Set([top.hs, finalHs, ...results.map((r) => r.hs), ...alts.map((a) => a.hs), ...(gathered.poolCodes || []).map((c) => c.hs)])].filter((h) => /^\d{8}$/.test(h));
      kiemChot = kiemTruocChotMod.kiemTruocChot({ topHs: top.hs, hang: hangKhach, ungVien });
    } catch (e) { log.push({ note: 'kiem-truoc-chot lỗi', error: String(e?.message || e).slice(0, 100) }); }
  }
  if (kiemChot.coCo) {
    if (decision === 'CHOT') decision = 'DE_XUAT';
    review.needed = true;
    for (const c of kiemChot.canhBao) review.reasons.push(clip(c.noiDung, 300));
    const moi = [];
    for (const d of kiemChot.deXuat) {
      if (d.hs === top.hs) continue; // OZV-517: mã đã lên vị trí 1 (theo tiền lệ TB-TCHQ) — không lặp lại ở vị trí 2
      const co = results.find((r) => r.hs === d.hs);
      const t = tbTchqGate(d.hs);
      moi.push({ ...(co || {}), hs: d.hs, hsLevel: 8, confidence: co?.confidence ?? null, reason: co?.reason ? clip(`${d.reason} | AI vòng 2: ${co.reason}`, 400) : d.reason, source: d.source, evidence: d.evidence, ...(t.hasPrecedent ? { tbTchq: t.entries } : {}) });
    }
    results = [top, ...moi, ...results.slice(1).filter((r) => !moi.some((m) => m.hs === r.hs))].slice(0, 4);
    if (Array.isArray(status.nextAction?.optionsHs)) status.nextAction.optionsHs = results.map((r) => r.hs);
  }
  // OZV-517 (GĐ 13/11 — ý (5)): mã ở vị trí 1 ĐÃ ĐỔI so với mã máy chốt ⇒ phải GIỮ NGUYÊN hành vi "cần hỏi" của #725-46
  // (hạ DE_XUAT + cờ chuyên viên), KHÔNG tự CHOT — nhưng lý do phải bám mã ĐANG Ở VỊ TRÍ 1 (ý (1)): không nhắc tên mã cũ.
  if (maDaDoi && top && top.hs === maDaDoi && !coChan) {
    if (decision === 'CHOT') decision = 'DE_XUAT';
    review.needed = true;
    review.reasons.push(`Mã ${top.hs} ở vị trí 1 theo tiền lệ TB-TCHQ${promoTienLe?.soTienLe ? ` ${promoTienLe.soTienLe}` : ''} (tên hàng khớp trùng khít với mô tả hàng, độ giống ${promoTienLe?.diem ?? '—'}) — chuyên viên đối chiếu với mã đề xuất ở vị trí sau.`);
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
  if (top && !blocked.length && /^\d{8}$/.test(top.hs) && !top.duKien && !kiemChot.coCo) {
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
    // OZV-1356: đường chốt sớm từ điển đã bỏ AI — không quét lại kho tiền lệ (96170010 ~0,8s+).
    if (!log.some((l) => l.earlyExitTradeChotSom === true)) {
      try {
        const snd = countIndependentSources(top.hs, hangKhach);
        if (snd.independent >= 3) {
          top.basis = [...(top.basis || []), {
            stream: 'TIEN_LE',
            claim: `${snd.independent} nguồn độc lập có tên hàng giống hàng đang phân loại (${Object.entries(snd.byLoai).map(([k, v]) => `${k}:${v}`).join(', ')}) cùng kết luận mã ${top.hs}`,
            evidence: (snd.sample || []).map((s) => s.id).filter(Boolean).join(', ') || null,
            ref: null,
            verified: true,
            note: 'Nâng tự tin có kiểm — chỉ đếm tiền lệ tên hàng giống (lib/giong-ten-hang.js) cùng kết luận đúng mã, khác loaiNguon + URL (lib/precedent-search.js), trần 95; là bằng chứng xếp hạng, KHÔNG phải căn cứ GIR.',
          }];
          top.confidence = Math.min(95, (Number(top.confidence) || 0) + 5);
        }
      } catch { /* countIndependentSources lỗi → bỏ nâng tự tin, không chặn động cơ */ }
    }
  }
  // #725-46: luật trước khi chốt bắn → tin cậy không quá TRAN_TIN_CAY_KIEM_CHOT (dưới ngưỡng 75 của rủi ro THẤP).
  if (top && kiemChot.coCo) top.confidence = Math.min(Number(top.confidence) || 0, TRAN_TIN_CAY_KIEM_CHOT);
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
  // OZV-1356: bỏ trên earlyExitTradeChotSom (cùng lý do countIndependentSources ở khối nâng tự tin).
  if (top?.hs && /^\d{8}$/.test(top.hs) && !log.some((l) => l.earlyExitTradeChotSom === true)) {
    try {
      // #725-46: chỉ đếm tiền lệ có TÊN HÀNG GIỐNG hàng đang phân loại và kết luận ĐÚNG mã (không còn đếm mọi TB của mã/nhóm).
      const snd = countIndependentSources(top.hs, hangKhach);
      if (snd.independent >= 2) {
        rankingSignals.push({
          signal: 'signal:soNguonDongThuan',
          hs8: top.hs,
          effect: `${snd.independent} nguồn độc lập có tên hàng giống hàng đang phân loại (${Object.entries(snd.byLoai).map(([k, v]) => `${k}:${v}`).join(', ')}) cùng kết luận mã ${top.hs}`,
          note: 'TÍN HIỆU xếp hạng, không phải căn cứ pháp lý. Chỉ đếm tiền lệ tên hàng giống (lib/giong-ten-hang.js) kết luận đúng mã, khác loaiNguon + URL (lib/precedent-search.js).',
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
    const daChotSomTrade = log.some((l) => l.earlyExitTradeChotSom === true);
    if (top && !coChan && daChotSomTrade) {
      // OZV-1356: bỏ buildDeclarationOptions→buildTaxLookup (96170010 cold ~1–2s). Vẫn 1 phương án CHON từ TAX tĩnh.
      const row = taxData[top.hs] || {};
      declarationOptions = [{
        hs: top.hs,
        nameVi: String(row.vn || '').replace(/^[-\s]+/, '').trim() || null,
        kind: 'CHON',
        canCuVi: clip(top.reason || 'chốt sớm từ điển', 300),
        dieuKienVi: 'Theo từ điển tên thương mại (chotSom) — không gọi AI.',
        ruiRo: 'THAP',
        ruiRoVi: 'Chốt sớm từ điển high+chotSom, cổng gates sạch.',
        thue: { mfn: row.mfn ?? null, acftaCn: null, acftaNoteVi: null, vat: row.vat ?? null },
        coChinhSach: { level: 'NONE', lineVi: null },
        khuyenNghi: true,
      }];
    } else if (top && !coChan) {
      declarationOptions = require('./declaration-options.js').buildDeclarationOptions({
        top: { ...top, gir: r2?.gir || null }, results, dossier: dossierOut, gathered, review,
        materialTexts: [raw.chatLieu, raw.specs], partTexts: [raw.tenHang, raw.nameZh, raw.congDung],
      });
    }
  } catch (e) { log.push({ note: 'declaration-options lỗi', error: String(e?.message || e).slice(0, 100) }); }
  dossierOut.declarationOptions = declarationOptions;
  const loopOut = {
    ...status,
    results,
    missing,
    missingStructured: top?.hs ? missingStructuredFor(top.hs, attrsForEcus) : [],
    antiPatternWarnings: [...(g?.warnings || []).map((w, i) => ({ id: `gate-warning-${i + 1}`, description: w })), ...kiemChot.canhBao.map((c) => ({ id: c.ma, description: c.noiDung }))],
    girRulesApplied: girVerdict.determinations,
    girDisclaimer: girVerdict.disclaimer,
    ecus,
    explanatoryNote: top?.hs?.length === 8 ? getNoteSummaryForHs(top.hs) : null,
    confusionWarning: conflict?.confusedWith?.length ? { riskLevel: conflict.riskLevel, confusedWith: conflict.confusedWith, reasonsVi: conflict.reasonsVi || [] } : null,
    resolver: resolver.status === 'RESOLVED' ? (({ gir: _g, ...rest }) => rest)(resolver) : resolver,
    decisionAdvisory,
    review,
    ...(kiemChot.coCo ? { kiemTruocChot: { canhBao: kiemChot.canhBao, deXuat: kiemChot.deXuat.map(({ hs, source }) => ({ hs, source })) } } : {}),
    ...(soTay.mode !== 'off' ? { soTay: { ...soTay, ...(chotSomCoKiem.bat() ? { ...chotSomCoKiem.soTayDaTra({ daTra: soTayDaTra, log, hs: top?.hs || finalHs }), ...(!soTayDaTra && soTay.nhanhToiUu ? { lyDoChuaTra: soTay.nhanhToiUu.ten } : {}) } : {}), ...(chotDong?.checked ? { chotDong: { ketQua: chotDong.ketQua, tu: chotDong.tuHs || null, den: chotDong.hs || null, lyDo: chotDong.lyDo || null } } : {}), challenges: soTay.challenges.map(({ gate, h4, target, matched, reasonVi, questionVi, legal }) => ({ gate, h4, target, matched: matched || null, reasonVi, questionVi, legal })) } } : {}),
    dossier: dossierOut,
    queryUnderstanding: { applied: true, searchTextVi: product.nameVi || null, productFactsVi: { tenHangVi: product.nameVi, banChat: product.purpose, chatLieu: product.material, congDung: product.purpose } },
    candidates: { headings: gathered.headings, precedentCodes: [...new Map(gathered.ozPrecedents.map((o) => [o.hs, { hs: o.hs, ozCount: o.oz }])).values()].slice(0, 10) },
    rankingSignals,
    engine: {
      ...engine, phases, tier: opts.tier === 'premium' ? 'premium' : 'standard', provider: engine.providers[engine.providers.length - 1] || null, ms: Date.now() - t0,
      // Cấu hình tối ưu độ trễ của lượt này (bench kiểm nhánh đo bật thật, chống no-op) — vắng mặt khi cả hai công tắc "off".
      ...(gon || capVong != null ? { toiUu: { gonDauRa: gon, maxVongSua: capVong, r1MaxTokens, r2MaxTokens } } : {}),
      // OZV-570: dấu vết fast-first đo được trên prod (không cần debug): vong1ThinkingOff luôn đúng khi cờ bật;
      // boQuaVong2 = cổng tất định đã chấp nhận (không có lời GIR vòng 2); lyDo = vì sao leo sâu.
      ...(fastFirstTrangThai ? { fastFirst: fastFirstTrangThai } : {}),
      // #425: debug (body.debug / ?debug=1) → lộ nhật ký từng bước (retry/fallback kèm cause, ms, timeoutMs) + cấu hình
      // timeout theo bước + mạch đang mở, để đo bước nào treo. Không debug → shape như cũ (gates vẫn có).
      // OZV-826: thêm boQua/loiChuoiChinh khi chuỗi chính lỗi/bỏ qua mà tầng dự phòng vẫn thắng (quan sát được từ ngoài).
      ...(opts.debug ? { log, llm: {
        timeoutMs: { understand: llmTier.stepTimeoutMs('understand', R1_TIMEOUT_MS), gir: llmTier.stepTimeoutMs('gir', R2_TIMEOUT_MS) },
        ngatMach: llmTier.ngatMachTrangThai(),
        ngatSuyNghi: ngatSuyNghiTrangThai(),
        ...(llmDiag.boQua.length ? { boQua: llmDiag.boQua } : {}),
        ...(llmDiag.loiChuoiChinh.length ? { loiChuoiChinh: llmDiag.loiChuoiChinh } : {}),
      } } : {}),
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
  // (hanChot = opts._b1bHanChot || min(opts.hanChotMs, t0 + BUDGET_MS) — khai ở đầu classifyLoop, #725-45 +
  //  OZV-771 dùng chung cho mọi lời gọi AI; lượt chạy lại B1b ăn theo hạn của lượt chính, không cấp hạn mới.)
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
    const tB1b = Date.now();
    ganBuoc('b1b'); // OZV-1520
    const kqB1b = await require('./b1b-web.js').b1bApDung(rawAttrs, loopOut, opts, capVong == null
      ? (a) => classifyLoop(a, { ...opts, _b1bDaThu: true })
      : chayLaiB1b);
    const b1bMs = Date.now() - tB1b;
    // OZV-757 / PR #1292: khe ms−engine.ms trước đây trốn ở B1b — ghi rõ phases.b1bMs + phases.timWebMs.
    const ganPhases = (o) => {
      if (!o || !o.engine) return o;
      const ph = { ...(o.engine.phases || {}), b1bMs };
      if (o.webHint && typeof o.webHint.msTimWeb === 'number') ph.timWebMs = o.webHint.msTimWeb;
      else if (o.webHint && typeof o.webHint.msWeb === 'number') ph.timWebMs = o.webHint.msWeb;
      o.engine = { ...o.engine, phases: ph };
      return o;
    };
    return ganPhases(kqB1b);
  } catch (e) {
    // Tầng tuỳ chọn: không bao giờ làm hỏng lượt chính — nhưng KHÔNG nuốt im (c63104c: webHint mất mà không ai biết).
    // MỘT dòng JSON ra stderr, chỉ thông điệp lỗi: không mô tả hàng, không khoá.
    try { process.stderr.write(`${JSON.stringify({ type: 'b1b_error', ts: new Date().toISOString(), msg: String(e?.message || e).slice(0, 200) })}\n`); } catch { /* ghi log hỏng cũng không làm hỏng lượt chính */ }
  }
  return loopOut;
}

module.exports = {
  classifyLoop, callWithFallback, gates, gather, round1Input, casePool, judgeExplanations, challengeText, soTayMode, SYS_R1, SYS_R2, isGeminiBillingError, normalizeSupplierHs, supplierAgree, noteOutline, headingBlock,
  // Tối ưu độ trễ (backlog 09 bước 3+4) — cho test/bench.
  ngatSuyNghiTrangThai, NGAT_SUY_NGHI_MS_MAC_DINH, _resetNgatSuyNghi: () => _ngatSuyNghi.clear(),
  gonDauRa, maxVongSua, SYS_R1_GON, SYS_R2_GON, TRAN, DU_KHOA, R1_MAX_TOKENS_GON, R2_MAX_TOKENS_GON, VONG_SUA_MAC_DINH, B1B_LAI_MIN_MS, nhomChuaKiemTatDinh, nguonDocLap, giuDanhTuKhach,
  // FAST-FIRST (OZV-570) — cho test/bench.
  fastFirstBat, fastFirstUngVien, FAST_FIRST_TU_TIN,
  // OZV-1267 / OZV-1271 — fail-fast understand|gir khi MiniMax ngắt mạch.
  UNDERSTAND_FAILFAST_MS_MAC_DINH, understandFailfastMs,
  GIR_FAILFAST_MS_MAC_DINH, girFailfastMs,
  // OZV-1269 — early-exit HOI khi gon + unknowns.
  earlyExitHoiTuR1,
  hoiTheoGiaThuyetNhomDich,
  kiemPhanNhomEarlyHoi,
  // OZV-1317 — early-exit CHOT từ bảng xung đột (trước HOI).
  earlyExitChotTuConflict,
  // OZV-1341 — early-exit CHOT từ trade-synonyms high+chotSom (trước AI).
  earlyExitChotTuTrade,
  // OZV-1356 — hồ sơ tối thiểu cho đường chốt sớm (test/bench).
  gatherChoChotSom,
  // OZV-1314 — ngân sách mềm mặc định ≤ 85 s (test/bench đọc được).
  BUDGET_MS, BUDGET_MS_MAC_DINH,
};
