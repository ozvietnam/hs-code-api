// lib/inflight.js — đếm lượt HTTP đang chạy + trạng thái "đang xả" khi tiến trình nhận SIGTERM (#418).
//
// VÌ SAO: /api/classify mất 2–5 phút. Khi deploy thay container, server.js cũ chỉ chờ 10 giây rồi exit →
// mọi lượt đang chạy dở chết, khách thấy "không kết nối được". Nay: dừng nhận lượt mới, chờ lượt đang chạy
// xong (tối đa HS_DRAIN_MS, mặc định 330 s = trần request 300 s + dư), rồi mới thoát. Docker phải cho đủ
// thời gian: `docker stop -t 360` (hoặc stop_grace_period) — xem docs/deploy-coolify.md.
let dangChay = 0;
let dangXa = false;

function vao() { dangChay += 1; }
function ra() { dangChay = Math.max(0, dangChay - 1); }
function soDangChay() { return dangChay; }
function laDangXa() { return dangXa; }
function datDangXa(v) { dangXa = Boolean(v); }

const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Chờ cho tới khi không còn lượt nào đang chạy hoặc hết maxMs.
 * → { conLai, choMs } — conLai > 0 nghĩa là hết giờ mà vẫn còn lượt (sẽ bị cắt).
 */
async function xa({ maxMs = Number(process.env.HS_DRAIN_MS) || 330000, buocMs = 500, now = Date.now } = {}) {
  datDangXa(true);
  const t0 = now();
  while (dangChay > 0 && now() - t0 < maxMs) await ngu(buocMs);
  return { conLai: dangChay, choMs: now() - t0 };
}

/** Test: đặt lại trạng thái. */
function reset() { dangChay = 0; dangXa = false; }

module.exports = { vao, ra, soDangChay, laDangXa, datDangXa, xa, reset };
