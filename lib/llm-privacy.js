// lib/llm-privacy.js — chặn dữ liệu khách rò ra tầng LLM miễn phí (#237 mục 2, J1 — CEO chốt 11/10/2026).
//
// VÌ SAO: chuỗi nhà cung cấp (lib/llm-tier.js → lib/llm.mjs) có hai tầng miễn phí — Gemini miễn phí
// (GEMINI_FREE_KEYS; điều khoản cho Google dùng dữ liệu để cải thiện sản phẩm) và OpenRouter mẫu đuôi
// ":free" (một số host huấn luyện trên prompt). Mô tả hàng của khách (qua Cổng OZ, ERP) KHÔNG được đi qua đó.
//
// CÁCH DÙNG:
//   const { withPrivateData } = require('./llm-privacy');
//   await withPrivateData(() => classify(attrs));          // mọi callLLMJson/chat bên trong đều ở chế độ riêng tư
//   callLLMJson(sys, user, { containsCustomerData: true }); // hoặc đặt cờ tường minh cho một lượt
//
// Ở chế độ riêng tư, chỉ nhà cung cấp trong danh sách trắng LLM_NO_TRAIN_PROVIDERS (mặc định: "minimax,gemini" —
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

/** Mẫu miễn phí (OpenRouter "…:free") — không bao giờ nhận dữ liệu khách, kể cả nhà cung cấp trong danh sách trắng. */
function isFreeModel(model) {
  return /:free$/i.test(String(model || '').trim());
}

/**
 * Nhà cung cấp + mẫu này được nhận dữ liệu khách không?
 * 'gemini-free' luôn bị chặn (là tầng miễn phí), dù danh sách trắng có 'gemini' (khoá trả phí).
 */
function privateAllowed(provider, model) {
  const p = String(provider || '').toLowerCase();
  if (!p || p === 'gemini-free') return false;
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

module.exports = { withPrivateData, isPrivate, privateAllowed, isFreeModel, noTrainProviders, noPrivateLlmError, privateAll, DEFAULT_NO_TRAIN };
