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

// ── Luật khớp model (dùng chung cho đoạn trích máy tìm kiếm và nội dung trang mở lại) ──
// Model NGẮN (≤ 5 ký tự chữ-số sau chuẩn hoá, vd "GA22", "DZ-400") trùng ngẫu nhiên rất nhiều: tên trò chơi, tên khí cầu
// trên bách khoa, mã trong URL. Luật: model ngắn phải khớp theo RANH GIỚI TỪ, và chữ được kiểm phải có thêm NGỮ CẢNH của
// món hàng (hãng, hoặc danh từ chính của tên hàng). Model dài giữ luật cũ (chuẩn hoá chữ-số rồi tìm chuỗi con).
// URL / tên miền KHÔNG bao giờ là chữ được kiểm — bên gọi chỉ đưa tiêu đề, đoạn trích, nội dung trang.
const MODEL_NGAN = 5;
const chiChuSo = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const boDau = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
const thoat = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const modelNgan = (model) => chiChuSo(model).length <= MODEL_NGAN;

/** Biểu thức khớp model theo ranh giới từ: "GA22" ≡ "GA 22" ≡ "GA-22", hai đầu không dính chữ/số ("GA22FF", "XGA22" không khớp). */
function reModelRanhGioi(model) {
  const cum = String(model ?? '').toLowerCase().match(/[a-z]+|[0-9]+/g);
  if (!cum) return null;
  return new RegExp(`(?<![\\p{L}\\p{N}])${cum.join('[\\s\\-_]{0,2}')}(?![\\p{L}\\p{N}])`, 'iu');
}

/**
 * Ngữ cảnh của món hàng để đi kèm model ngắn: hãng + danh từ chính của tên hàng (đã bỏ hãng, model). Trả mảng cụm đã bỏ dấu,
 * chữ thường. Danh từ chính lấy bằng máy tách danh từ đầu có sẵn (lib/so-tay-gates.js#productHead): "Máy nén khí trục vít
 * Atlas Copco GA22" → "may nen".
 */
function tuNguCanh({ thuongHieu, tenHang, model } = {}) {
  const out = [];
  const h = boDau(thuongHieu).replace(/\s+/g, ' ').trim();
  if (h.length >= 2) out.push(h);
  let t = String(tenHang ?? '');
  for (const bo of [model, thuongHieu]) { const b = String(bo ?? '').trim(); if (b.length >= 2) t = t.replace(new RegExp(thoat(b), 'ig'), ' '); }
  try {
    const { productHead } = require('./so-tay-gates.js'); // nạp lười: tránh kéo biểu thuế vào khi chỉ cần urlAnToan
    const am = productHead(t).filter((w) => !/\d/.test(w));
    // Hai âm tiết đầu; nếu cả hai đều là từ rỗng nghĩa ("thiết bị", "bộ phận") thì lấy thêm tới âm tiết có nghĩa đầu tiên.
    const RONG = new Set(['máy', 'thiết', 'bị', 'bộ', 'phận', 'dụng', 'cụ', 'phụ', 'kiện', 'tùng', 'linh', 'sản', 'phẩm', 'hàng', 'cái', 'chiếc', 'loại']);
    let n = Math.min(2, am.length);
    while (n < am.length && n < 4 && am.slice(0, n).every((w) => RONG.has(w))) n += 1;
    const cum = am.slice(0, n);
    if (cum.length && !cum.every((w) => RONG.has(w)) && cum.join('').length >= 3) out.push(boDau(cum.join(' ')));
  } catch { /* không tách được danh từ → chỉ còn hãng */ }
  return [...new Set(out)];
}

const coNguCanh = (chu, nguCanh) => {
  const c = boDau(chu);
  return (Array.isArray(nguCanh) ? nguCanh : []).some((k) => k && new RegExp(`(?<![\\p{L}\\p{N}])${thoat(k).replace(/\s+/g, '\\s+')}(?![\\p{L}\\p{N}])`, 'u').test(c));
};

/**
 * Model có thật sự được nhắc trong các đoạn chữ `chu` không. KHÔNG nhận URL.
 * @param {string} model
 * @param {string|string[]} chu tiêu đề / đoạn trích / nội dung trang
 * @param {string[]} [nguCanh] kết quả tuNguCanh() — bắt buộc có mặt khi model ngắn
 * @param {{toiThieu?: number}} [o] số ký tự chữ-số tối thiểu của model (mặc định 4)
 */
function khopModel(model, chu, nguCanh = [], o = {}) {
  const m = chiChuSo(model);
  if (m.length < (o.toiThieu || 4)) return false; // model quá ngắn dễ trùng ngẫu nhiên
  const ds = (Array.isArray(chu) ? chu : [chu]).map((c) => String(c ?? ''));
  if (m.length > MODEL_NGAN) return ds.some((c) => chiChuSo(c).includes(m));
  const re = reModelRanhGioi(model);
  const gop = ds.join(' \n ');
  return Boolean(re) && re.test(gop) && coNguCanh(gop, nguCanh);
}

/**
 * Mở 1 nguồn và kiểm tra nội dung.
 * @param {{url: string, trich?: string, loai?: string}} nguon
 * @param {string} model — tên model cần tìm trong nội dung (bổ trợ khi trích thiếu)
 * @param {Function} [fetchImpl] — tiêm được cho test
 * @param {{lookup?: Function, nguCanh?: string[]}} [opts] — lookup: bộ phân giải DNS tiêm cho test (mặc định dns.lookup, gắn thẳng
 *   vào socket); nguCanh: hãng + danh từ chính của hàng (tuNguCanh) — model NGẮN chỉ tính có mặt khi trang có thêm ngữ cảnh này
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
    // Model NGẮN (≤5 ký tự chữ-số): chỉ tính khi khớp ranh giới từ VÀ trang có ngữ cảnh món hàng (hãng / danh từ chính) —
    // "ga22" nằm đâu đó trong một trang trò chơi hay bách khoa không còn làm nguồn "qua xác minh". Model dài: luật cũ.
    const m = String(model || '').trim().toLowerCase();
    const mc = chiChuSo(m);
    if (m && m.length >= 2) base.modelCoMat = mc.length <= MODEL_NGAN ? khopModel(m, strip, opts.nguCanh, { toiThieu: 2 }) : strip.includes(m);
    // Model CHUẨN HOÁ (chỉ chữ-số, ≥4 ký tự): "FP-6308 U" ≡ "fp6308u". Trường tuỳ chọn — lib/identify.js dùng cho luật
    // "≥2 tên miền mà NỘI DUNG TRANG có model". Cùng luật khopModel (model ngắn cần ranh giới từ + ngữ cảnh).
    if (mc.length >= 4) base.modelChuanCoMat = khopModel(m, strip, opts.nguCanh);

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

module.exports = { xacMinh, xacMinhNhieu, urlAnToan, khopModel, tuNguCanh, modelNgan, chiChuSo, MODEL_NGAN };
