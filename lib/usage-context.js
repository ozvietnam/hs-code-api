// lib/usage-context.js — gom usage (token) của các lượt gọi LLM theo TỪNG request (ozplugin M0).
//
//   const { result, usage } = await withUsage(() => classify(...));
//   // usage: [{ provider, model, inputTokens, outputTokens }, ...] theo thứ tự gọi
//
// recordUsage() gọi từ lib/llm.mjs (chat) và lib/gemini.js sau mỗi lượt nhà cung cấp trả lời.
// Ngoài withUsage() nó là no-op → đường gọi công khai / HS_API_TOKEN không đổi hành vi.
// AsyncLocalStorage nên hai request chạy song song không lẫn usage của nhau.
// Token không biết (nhà cung cấp không trả usage) = -1.

const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

/** Ghi một lượt gọi nhà cung cấp vào ngữ cảnh hiện tại (no-op nếu không có ngữ cảnh). */
function recordUsage(entry) {
  const store = als.getStore();
  if (!store || !entry) return;
  store.push({
    provider: String(entry.provider ?? 'unknown'),
    model: String(entry.model ?? 'unknown'),
    inputTokens: Number.isFinite(entry.inputTokens) ? Math.trunc(entry.inputTokens) : -1,
    outputTokens: Number.isFinite(entry.outputTokens) ? Math.trunc(entry.outputTokens) : -1,
  });
}

/**
 * Chạy fn trong ngữ cảnh usage mới → { result, usage }.
 * fn ném lỗi thì ném lại lỗi đó, kèm err.usage (phần đã ghi) để người gọi vẫn thấy chi phí đã tiêu.
 */
async function withUsage(fn) {
  const store = [];
  try {
    const result = await als.run(store, fn);
    return { result, usage: store.slice() };
  } catch (e) {
    if (e && typeof e === 'object') { try { e.usage = store.slice(); } catch { /* lỗi đóng băng */ } }
    throw e;
  }
}

module.exports = { withUsage, recordUsage };
