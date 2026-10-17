// lib/service-rate-limit.js — trần tần suất + trần đồng thời theo KHOÁ gọi (khoá dịch vụ có tên, hoặc HS_API_TOKEN).
//
// VÌ SAO: /api/declaration-check (#338) không gọi LLM nhưng vẫn tốn máy chủ (tra biểu thuế, chú giải… cho tới 50 dòng/lượt),
// và là phần MIỄN PHÍ ở Cổng OZ. Cổng giới hạn theo tài khoản khách; ở đây chặn thêm theo khoá dịch vụ (hướng của #238):
// vượt trần → 429 + Retry-After, Cổng báo VUOT_HAN_MUC và không trừ điểm.
//
// Bộ nhớ trong tiến trình (một máy chủ Coolify) — đủ cho một instance; nhiều instance thì mỗi instance một trần riêng.
// Cấu hình đọc lúc gọi (đổi env không cần khởi động lại test):
//   <PREFIX>_RPM          số lượt tối đa / 60 giây / khoá   (mặc định theo tham số `perMinute`)
//   <PREFIX>_CONCURRENCY  số lượt chạy cùng lúc / khoá      (mặc định theo tham số `maxConcurrent`)

const WINDOW_MS = 60_000;
const state = new Map(); // `${scope}|${key}` → { hits: number[], running: number }

function intEnv(name, dflt) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : dflt;
}

/**
 * Xin một lượt. → { ok: true, release() } | { ok: false, retryAfter (giây), lyDo }
 * Người gọi PHẢI gọi release() khi xong (kể cả lỗi) nếu ok.
 */
function acquireServiceSlot(scope, key, { envPrefix, perMinute = 300, maxConcurrent = 8, now = Date.now() } = {}) {
  const rpm = envPrefix ? intEnv(`${envPrefix}_RPM`, perMinute) : perMinute;
  const conc = envPrefix ? intEnv(`${envPrefix}_CONCURRENCY`, maxConcurrent) : maxConcurrent;
  const id = `${scope}|${key || 'anon'}`;
  let st = state.get(id);
  if (!st) { st = { hits: [], running: 0 }; state.set(id, st); }
  st.hits = st.hits.filter((t) => now - t < WINDOW_MS);
  if (st.hits.length >= rpm) {
    const retryAfter = Math.max(1, Math.ceil((st.hits[0] + WINDOW_MS - now) / 1000));
    return { ok: false, retryAfter, lyDo: `Vượt ${rpm} lượt/phút cho khoá này.` };
  }
  if (st.running >= conc) {
    return { ok: false, retryAfter: 1, lyDo: `Đang chạy đủ ${conc} lượt cùng lúc cho khoá này.` };
  }
  st.hits.push(now);
  st.running += 1;
  let released = false;
  return {
    ok: true,
    release() {
      if (released) return;
      released = true;
      st.running = Math.max(0, st.running - 1);
    },
  };
}

/** Xoá trạng thái (test). */
function resetServiceRate() { state.clear(); }

module.exports = { acquireServiceSlot, resetServiceRate };
