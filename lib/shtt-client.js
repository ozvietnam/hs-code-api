/**
 * Kết nối API rủi ro SHTT của OZ SHTT (repo oz-shtt) — `GET /v1/check`.
 *
 * Bối cảnh: watchlist nội bộ (data/trademark-watch.json) chỉ có ~53 nhãn seed.
 * oz-shtt là kho nhãn hiệu VN đầy đủ (robot đang tải, đích ~978k) + tra chữ/tra ảnh,
 * trả về ĐÈN TÍN HIỆU rủi ro (RED/YELLOW/GREEN/UNKNOWN) theo ADR-0010:
 *   🟡 VÀNG  — có nhãn còn hiệu lực/đang chờ, cùng nhóm hàng, khớp tên → cần xác minh.
 *   🟢 XANH  — không thấy nhãn đáng ngờ (kèm độ phủ kho tại thời điểm tra).
 *   ⚪ CHƯA ĐỦ (UNKNOWN) — thiếu tên nhãn, hoặc chưa nối được nhóm hàng cho mã HS.
 *   🔴 ĐỎ   — CHƯA phát (chỉ đặt khi có đăng ký giám sát hải quan; nguồn đó chưa có).
 *
 * NGUYÊN TẮC AN TOÀN: đây là tầng LÀM GIÀU. oz-shtt không trả lời / chưa cấu hình /
 * lỗi mạng / quá thời gian → trả `null` để tầng trên bỏ phần đèn mà KHÔNG làm hỏng
 * luồng tra / phân loại mã HS. Không bao giờ ném lỗi ra ngoài.
 *
 * Cấu hình (biến môi trường):
 *   OZ_SHTT_URL        gốc API, vd http://192.168.1.124:3010  (trống = tắt, bỏ đèn)
 *   OZ_SHTT_API_KEY    khoá x-api-key cấp cho hs-code-api (bỏ giới hạn lượt bên oz-shtt)
 *   OZ_SHTT_TIMEOUT_MS thời gian chờ tối đa (mặc định 1500ms — ngắn để không chặn tra HS)
 *   OZ_SHTT_DEPTH      'free' | 'full' (mặc định 'free')
 */
'use strict';

const DEFAULT_TIMEOUT_MS = 1500;

function baseUrl() {
  return String(process.env.OZ_SHTT_URL || '').trim().replace(/\/+$/, '');
}
function apiKey() {
  return String(process.env.OZ_SHTT_API_KEY || '').trim();
}
function defaultDepth() {
  const d = String(process.env.OZ_SHTT_DEPTH || 'free').trim().toLowerCase();
  return d === 'full' ? 'full' : 'free';
}
function timeoutMs() {
  const n = Number(process.env.OZ_SHTT_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

/** Có cấu hình gốc API hay không (để tầng trên quyết định có gọi hay bỏ qua). */
function isEnabled() {
  return baseUrl().length > 0;
}

/** Chỉ giữ 8 số đầu của mã HS; API oz-shtt đòi đúng 8 số, không đủ → không gọi được. */
function hs8(hsCode) {
  const d = String(hsCode || '').replace(/\D/g, '').slice(0, 8);
  return d.length === 8 ? d : null;
}

/**
 * Chuẩn hoá xuất xứ về mã ISO 2 ký tự (API đòi `origin` dài đúng 2).
 * Không nhận ra → trả null để BỎ tham số (API tự mặc định 'CN').
 */
function normOrigin(origin) {
  const raw = String(origin || '').trim();
  if (!raw) return null;
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  if (raw.includes('中国') || raw.includes('中國')) return 'CN';
  const n = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
  if (/\bchina\b|\bprc\b|trung quoc/.test(n)) return 'CN';
  if (/viet ?nam|\bvn\b/.test(n)) return 'VN';
  return null;
}

/**
 * Gọi `GET /v1/check`. Trả về CheckResult thô (hợp đồng oz-shtt packages/shared check.ts)
 * hoặc `null` nếu: chưa cấu hình, thiếu tên nhãn, mã HS chưa đủ 8 số, hoặc gọi thất bại.
 *
 * @param {object} opts
 * @param {string} [opts.brand]    tên nhãn hiệu (bắt buộc để gọi — không có thì trả null)
 * @param {string} opts.hsCode     mã HS (sẽ lấy 8 số đầu)
 * @param {string} [opts.origin]   xuất xứ ("China"/"CN"/"Trung Quốc"…)
 * @param {string} [opts.importer] tên doanh nghiệp nhập khẩu
 * @param {string} [opts.seller]   tên người bán / nhà cung cấp
 * @param {string} [opts.depth]    'free' | 'full'
 * @param {object} [deps]          tiêm phụ thuộc cho test ({ fetchFn, timeoutMs })
 * @returns {Promise<object|null>}
 */
async function checkRisk(opts = {}, deps = {}) {
  const base = baseUrl();
  if (!base) return null;

  const hs = hs8(opts.hsCode);
  if (!hs) return null;

  const brand = String(opts.brand || '').trim();
  if (!brand) return null; // API đòi tối thiểu tên nhãn/ảnh/link — không có nhãn thì để tầng trên trả UNKNOWN

  const params = new URLSearchParams();
  params.set('hs', hs);
  params.set('brand', brand.slice(0, 200));
  const origin = normOrigin(opts.origin);
  if (origin) params.set('origin', origin);
  if (opts.importer) params.set('importer', String(opts.importer).slice(0, 300));
  if (opts.seller) params.set('seller', String(opts.seller).slice(0, 300));
  params.set('depth', opts.depth === 'full' ? 'full' : defaultDepth());

  const url = `${base}/v1/check?${params.toString()}`;
  const fetchFn = deps.fetchFn || (typeof fetch === 'function' ? fetch : null);
  if (!fetchFn) return null;

  const ac = new AbortController();
  const limit = deps.timeoutMs || timeoutMs();
  const timer = setTimeout(() => ac.abort(), limit);
  try {
    const headers = { accept: 'application/json' };
    const key = apiKey();
    if (key) headers['x-api-key'] = key;
    const res = await fetchFn(url, { method: 'GET', headers, signal: ac.signal });
    if (!res || !res.ok) return null;
    const json = await res.json();
    // Kiểm hợp đồng tối thiểu: phải có level hợp lệ, không thì coi như hỏng → bỏ đèn.
    if (!json || typeof json.level !== 'string') return null;
    if (!['RED', 'YELLOW', 'GREEN', 'UNKNOWN'].includes(json.level)) return null;
    return json;
  } catch {
    // timeout (abort) / lỗi mạng / JSON hỏng — nuốt lỗi, tầng trên bỏ đèn.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  checkRisk,
  isEnabled,
  baseUrl,
  normOrigin,
  hs8,
  DEFAULT_TIMEOUT_MS,
};
