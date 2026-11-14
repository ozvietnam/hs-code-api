// lib/llm-privacy.js — chặn dữ liệu RIÊNG TƯ của khách rò ra tầng LLM miễn phí (#237 mục 2, J1 — CEO chốt 11/10/2026;
// định nghĩa thu hẹp 13/11/2026 theo lời anh Thắng, OZV-754).
//
// ĐỊNH NGHĨA (OZV-754, thay #237 J1 cho phần THÔNG TIN HÀNG):
//   - KHÔNG còn riêng tư: tên hàng, mô tả, thông số, chất liệu, công dụng, ảnh hàng, link sàn, hãng, model —
//     "thông tin hàng thì đầy rẫy trên web, chả có gì là bí mật" (anh Thắng 13/11). Lượt của khách mang loại này
//     được đi ĐỦ chuỗi dự phòng như lượt công khai — điều khiển bằng withHangHoa() / HS_KHACH_MO_CHUOI_AI.
//   - VẪN riêng tư: số tờ khai; hoá đơn/invoice đủ thông tin mua bán; số lượng; đơn giá/trị giá; danh tính khách;
//     kho tờ khai Oz (câu Oz, oz-gold). Cửa mang loại này (declaration-check, phiếu khai declaration-sheet,
//     hồ sơ giải trình dispute-draft, các bước lib/ho-so/* dùng câu Oz) LUÔN withPrivateData, không có cờ mở.
//
// CÒN LẠI Ở CHẾ ĐỘ RIÊNG TƯ: chỉ nhà cung cấp trong danh sách trắng LLM_NO_TRAIN_PROVIDERS (mặc định: "minimax,gemini" —
// gemini = KHOÁ TRẢ PHÍ GEMINI_API_KEY, không bao giờ là GEMINI_FREE_KEYS) và mẫu KHÔNG có đuôi ":free" mới được gọi.
// Hermes (cổng LiteLLM chung, chưa xác minh nhà cung cấp phía sau) mặc định bị chặn; CEO muốn mở thì thêm vào
// danh sách trắng. Không còn nhà cung cấp hợp lệ → lỗi NO_PRIVATE_LLM (502), KHÔNG rơi xuống tầng miễn phí.
//
// HS_LLM_PRIVATE_ALL=true → mọi lượt (kể cả công khai, HS_API_TOKEN, script batch) coi là dữ liệu khách.

const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

const DEFAULT_NO_TRAIN = ['minimax', 'gemini'];

/** Danh sách trắng nhà cung cấp "không huấn luyện trên dữ liệu" — tên nhà cung cấp như lib/llm.mjs / lib/llm-tier.js. */
function noTrainProviders() {
  const raw = process.env.LLM_NO_TRAIN_PROVIDERS;
  if (raw == null || !String(raw).trim()) return DEFAULT_NO_TRAIN.slice();
  return String(raw).split(/[,\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function privateAll() {
  return String(process.env.HS_LLM_PRIVATE_ALL || '').toLowerCase() === 'true';
}

// OZV-726 (CEO chốt 13/11/2026): HS_GEMINI_FREE_CHO_KHACH=on → cụm khoá Gemini miễn phí (GEMINI_FREE_KEYS)
// được nhận dữ liệu khách làm LƯỚI CUỐI — chỉ SAU khi các tầng không-huấn-luyện (khoá Gemini trả phí,
// MiniMax) đã thử và lỗi. Lý do thực tế: khoá trả phí hết tiền (402) + MiniMax hết hạn mức tuần (429) làm
// CHẾT toàn bộ đường phân loại của khách dù máy vẫn còn 11 khoá miễn phí. Mặc định TẮT = hành vi cũ nguyên vẹn
// (dữ liệu khách không bao giờ đi tầng miễn phí). Đây là ngoại lệ CÓ Ý THỨC của luật #237 J1, không phải nới lỏng chung.
function geminiFreeChoKhach() {
  const v = String(process.env.HS_GEMINI_FREE_CHO_KHACH ?? '').trim().toLowerCase();
  return ['1', 'true', 'on', 'yes'].includes(v);
}

/** Lượt hiện tại có dữ liệu khách không (theo ngữ cảnh withPrivateData hoặc HS_LLM_PRIVATE_ALL). */
function isPrivate() {
  if (privateAll()) return true;
  const store = als.getStore();
  return Boolean(store && store.private);
}

/** Chạy fn trong ngữ cảnh "dữ liệu khách": mọi lượt LLM bên trong chỉ đi nhà cung cấp hợp lệ. */
function withPrivateData(fn) {
  return als.run({ private: true }, fn);
}

// OZV-754 (anh Thắng 13/11/2026): lượt của khách ở cửa CHỈ mang thông tin hàng (tên/mô tả/thông số/ảnh —
// không số tờ khai, không invoice, không số lượng/giá) được đi đủ chuỗi dự phòng khi QT bật cờ.
// Mặc định TẮT = hành vi #237 J1 nguyên vẹn: mở chuỗi là lượt khách sẽ chạm nhà cung cấp TÍNH TIỀN THEO LƯỢT
// chưa từng chạm (DeepSeek, Hermes, OpenRouter mẫu trả phí) — QT quyết tiền trên .120 rồi mới bật.
// Bật cờ cũng mở đường tra web B1b cho lượt khách (lib/b1b-web.js đọc isPrivate()).
function khachMoChuoiAi() {
  const v = String(process.env.HS_KHACH_MO_CHUOI_AI ?? '').trim().toLowerCase();
  return ['1', 'true', 'on', 'yes'].includes(v);
}

/**
 * Bọc lượt "thông tin hàng" của khoá dịch vụ: cờ bật → chạy thẳng (đủ chuỗi, web B1b chạy);
 * cờ tắt (mặc định) → withPrivateData như cũ. Cửa mang dữ liệu VẪN riêng tư (tờ khai/invoice/số lượng/giá)
 * KHÔNG dùng helper này — dùng withPrivateData trực tiếp.
 */
function withHangHoa(fn) {
  return khachMoChuoiAi() ? fn() : withPrivateData(fn);
}

/** Mẫu miễn phí (OpenRouter "…:free") — không bao giờ nhận dữ liệu khách, kể cả nhà cung cấp trong danh sách trắng. */
function isFreeModel(model) {
  return /:free$/i.test(String(model || '').trim());
}

/**
 * Nhà cung cấp + mẫu này được nhận dữ liệu khách không?
 * 'gemini-free' bị chặn (là tầng miễn phí), dù danh sách trắng có 'gemini' (khoá trả phí).
 * NGOẠI LỆ OZV-726 (CEO 13/11/2026): HS_GEMINI_FREE_CHO_KHACH=on → cụm khoá miễn phí được nhận dữ liệu
 * khách làm lưới cuối, và chỉ khi 'gemini' còn trong danh sách trắng (bỏ 'gemini' khỏi danh sách = chặn
 * hẳn mọi khoá Google, cả trả phí lẫn miễn phí).
 */
function privateAllowed(provider, model) {
  const p = String(provider || '').toLowerCase();
  if (!p) return false;
  if (p === 'gemini-free') return geminiFreeChoKhach() && !isFreeModel(model) && noTrainProviders().includes('gemini');
  if (isFreeModel(model)) return false;
  return noTrainProviders().includes(p);
}

/** Lỗi chuẩn khi không còn nhà cung cấp hợp lệ cho dữ liệu khách. */
function noPrivateLlmError(detail) {
  const err = new Error(`NO_PRIVATE_LLM: không có nhà cung cấp LLM hợp lệ cho dữ liệu khách (danh sách trắng: ${noTrainProviders().join(',') || '∅'})${detail ? ` — ${detail}` : ''}`);
  err.code = 'NO_PRIVATE_LLM';
  err.status = 502;
  return err;
}

module.exports = { withPrivateData, withHangHoa, khachMoChuoiAi, isPrivate, privateAllowed, isFreeModel, noTrainProviders, noPrivateLlmError, privateAll, geminiFreeChoKhach, DEFAULT_NO_TRAIN };
