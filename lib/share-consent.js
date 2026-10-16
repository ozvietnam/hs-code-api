/**
 * Cờ đồng ý chia sẻ dữ liệu của khách qua Cổng OZ (#261 — CEO ozplugin báo 12/10).
 *
 * Cổng gửi kèm `X-OZ-Chia-Se` (1 = khách ĐỒNG Ý cho ghi mẫu tin phục vụ cải tiến dữ liệu;
 * 0 hoặc thiếu = KHÔNG đồng ý — mặc định an toàn, "quên chặn = lộ dữ liệu") và `X-OZ-Ma-Luot`
 * (mã lượt gọi để truy vết khi khách đã đồng ý).
 *
 * Khuôn giống lib/llm-privacy.js: AsyncLocalStorage đặt ở cổng vào duy nhất (server.js),
 * nơi ghi log đọc cờ tại chỗ — không phải truyền req qua từng hàm.
 *
 * Hệ quả khi KHÔNG đồng ý (đúng Kết quả cần đạt của #261):
 *   - `ml-log.jsonl`: KHÔNG ghi dòng nào cho lượt đó;
 *   - `access-log.jsonl`: vẫn ghi dòng kỹ thuật (route, ms, hsCode kết quả) nhưng BỎ `querySnippet`
 *     (mô tả hàng của khách);
 *   - log stdout (server.js): URL bị che giá trị tham số `q`, `moTa`, `description` — chỉ giữ độ dài.
 * Khi ĐỒNG Ý: hành vi như cũ + kèm `maLuot` để truy được lượt gọi.
 */
const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

/** Đọc cờ từ header request. Mặc định KHÔNG đồng ý (kể cả service caller thiếu header). */
function doiTuRequest(req) {
  const h = req?.headers || req || {};
  const raw = h['x-oz-chia-se'];
  const chiaSe = String(raw ?? '').trim() === '1';
  const maLuot = String(h['x-oz-ma-luot'] ?? '').trim().slice(0, 40) || null;
  return { chiaSe, maLuot };
}

/** Chạy fn trong ngữ cảnh chia sẻ đã biết (server.js gọi một lần cho mỗi request). */
function runWithConsent(ctx, fn) {
  return als.run({ chiaSe: !!ctx?.chiaSe, maLuot: ctx?.maLuot || null }, fn);
}

/** Lượt hiện tại có đồng ý chia sẻ không? Ngoài ngữ cảnh (script, CLI) → coi như ĐỒNG Ý
 *  (chỉ cổng công khai mới có header; script chạy tay không phải dữ liệu khách). */
function isChiaSe() {
  const st = als.getStore();
  return st ? st.chiaSe : true;
}

/** Mã lượt của ngữ cảnh hiện tại (chỉ có nghĩa khi isChiaSe). */
function maLuotHienTai() {
  const st = als.getStore();
  return st && st.chiaSe ? st.maLuot : null;
}

/** Ghi log được không (ml-log: không ghi khi khách từ chối). */
function mlLogDuocPhep() { return isChiaSe(); }

/** Che các tham số mô tả hàng trong URL log: q, moTa, description → chỉ giữ độ dài. */
function cheUrl(urlStr) {
  const s = String(urlStr || '');
  const qi = s.indexOf('?');
  if (qi < 0) return s;
  const base = s.slice(0, qi);
  // Giữ nguyên chữ Việt trong log (không percent-encode): tách theo '&', thay GIÁ TRỊ của khoá mô tả hàng bằng độ dài.
  const CHE = new Set(['q', 'mota', 'description', 'tenhang']);
  const parts = s.slice(qi + 1).split('&').map((pair) => {
    const eq = pair.indexOf('=');
    if (eq < 0) return pair;
    const k = pair.slice(0, eq).toLowerCase();
    if (!CHE.has(k)) return pair;
    let v = pair.slice(eq + 1);
    try { v = decodeURIComponent(v.replace(/\+/g, ' ')); } catch { /* giữ nguyên */ }
    return `${pair.slice(0, eq)}=độ dài ${v.length}`;
  });
  return parts.length ? `${base}?${parts.join('&')}` : base;
}

module.exports = { doiTuRequest, runWithConsent, isChiaSe, maLuotHienTai, mlLogDuocPhep, cheUrl };
