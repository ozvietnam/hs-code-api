/**
 * Máy mở lại nguồn do AI đề xuất (#334 P0) — xác minh URL + nội dung.
 *
 * Vấn đề: /api/identify nhận nguon[] từ LLM (URL + trích), gán VERIFIED chỉ dựa vào
 * tên miền khớp mẫu NSX — chưa mở URL kiểm tra. URL AI bịa hoặc đã chết → nhãn VERIFIED sai.
 * Trích sai tệ hơn không trích (luật 6).
 *
 * Việc này: cho mỗi nguồn — (1) HTTP GET có timeout + chống SSRF (giữ nguyên luật safeImageUrl);
 * (2) kiểm tra mã 200; (3) kiểm tra đoạn trích (hoặc model) có mặt trong nội dung trả về;
 * (4) ghi retrievedAt + snapshotHash. Chỉ nguồn qua được mới tính vào tam giác kiểm chứng.
 */
const crypto = require('crypto');
const { kiemUrlTinh, fetchCongKhai } = require('./url-cong-khai.js'); // MỘT cổng chống SSRF cho mọi lần máy tự mở URL

const TIMEOUT_MS = 8000;
const MAX_BODY = 512 * 1024; // 512KB đủ cho trang sản phẩm, không tải cả PDF 50MB
const UA = 'hs-code-api/identify-verify (+https://hs-kb.uythacnhapkhau.com)';

/**
 * Chống SSRF — lớp TĨNH của lib/url-cong-khai.js (scheme, cổng, tên nội bộ, IP riêng/loopback/link-local/CGNAT/metadata v4+v6).
 * Lớp DNS + chuyển hướng chạy lúc mở (fetchCongKhai). Trước đây ở đây chỉ có một regex tiền tố tên máy: không bắt được
 * IPv6 ULA/link-local, 100.64/10, 0.0.0.0, tên miền PHÂN GIẢI về địa chỉ nội bộ, và chuyển hướng sang địa chỉ nội bộ.
 */
function urlAnToan(url) {
  const k = kiemUrlTinh(url);
  return k.ok && k.url.length <= 1000 ? k.url : null;
}

/**
 * Mở 1 nguồn và kiểm tra nội dung.
 * @param {{url: string, trich?: string, loai?: string}} nguon
 * @param {string} model — tên model cần tìm trong nội dung (bổ trợ khi trích thiếu)
 * @param {Function} [fetchImpl] — tiêm được cho test
 * @param {{lookup?: Function}} [opts] — bộ phân giải DNS tiêm cho test (mặc định dns.lookup, gắn thẳng vào socket)
 * @returns {Promise<{url, moDuoc: boolean, maTrang: number|null, trichCoMat: boolean|null,
 *   modelCoMat: boolean|null, retrievedAt: string, snapshotHash: string|null, loi?: string}>}
 */
async function xacMinh(nguon, model = '', fetchImpl, opts = {}) {
  const url = urlAnToan(nguon?.url);
  const now = new Date().toISOString();
  const base = { url: String(nguon?.url || ''), moDuoc: false, maTrang: null, trichCoMat: null, modelCoMat: null, retrievedAt: now, snapshotHash: null };
  if (!url) return { ...base, loi: 'URL không hợp lệ hoặc bị chặn SSRF' };

  try {
    // Tự đi từng bước chuyển hướng, mỗi bước kiểm lại URL + địa chỉ phân giải; đường thật nối đúng địa chỉ đã kiểm.
    const res = await fetchCongKhai(url, {
      timeoutMs: TIMEOUT_MS, maxBytes: MAX_BODY,
      headers: { 'user-agent': UA, accept: 'text/html,application/pdf,text/plain,*/*' },
    }, { fetchImpl, lookup: opts.lookup });
    base.maTrang = res?.status ?? null;
    if (!res?.ok) return { ...base, loi: `HTTP ${res.status}` };

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BODY) return { ...base, moDuoc: true, loi: 'nội dung quá 512KB — coi như chưa đọc được' };
    const text = buf.toString('utf8').toLowerCase();

    // snapshotHash — bằng chứng nội dung tại thời điểm mở
    base.snapshotHash = crypto.createHash('sha256').update(buf).digest('hex');
    base.moDuoc = true;

    // Kiểm tra đoạn trích có trong nội dung (bỏ tag HTML, bỏ khoảng trắng thừa)
    const strip = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const trich = String(nguon?.trich || '').trim().toLowerCase();
    if (trich && trich.length >= 8) {
      const trichClean = trich.replace(/\s+/g, ' ');
      base.trichCoMat = strip.includes(trichClean.slice(0, Math.min(120, trichClean.length)));
    }

    // Kiểm tra model có trong nội dung (bổ trợ khi trích không có)
    const m = String(model || '').trim().toLowerCase();
    if (m && m.length >= 2) base.modelCoMat = strip.includes(m);

    return base;
  } catch (e) {
    return { ...base, loi: String(e?.message || e).slice(0, 80) };
  }
}

/**
 * Mở nhiều nguồn song song + gán nhãn kết quả.
 * Chỉ nguồn moDuoc=true VÀ (trichCoMat=true HOẶC modelCoMat=true) → xacMinhOk=true.
 */
async function xacMinhNhieu(danhSach = [], model = '', fetchImpl, opts = {}) {
  const ketQua = await Promise.all(
    danhSach.filter((n) => n?.url).slice(0, 5).map((n) => xacMinh(n, model, fetchImpl, opts))
  );
  return ketQua.map((k) => ({
    ...k,
    xacMinhOk: k.moDuoc && (k.trichCoMat === true || k.modelCoMat === true),
  }));
}

module.exports = { xacMinh, xacMinhNhieu, urlAnToan };
