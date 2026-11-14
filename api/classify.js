// POST /api/classify — áp mã HS theo phương pháp hs-code-vn (Pha 2).
// POST /api/declaration-check (rewrite → ?mode=check, #338): soát tờ khai — KÍN, xem lib/declaration-check.js.
// Body: { tenHang|name, chatLieu|material, congDung|purpose, chucNang?, nameZh?, specs?, facts?, supplierHs?{code,source,url} }
//   (đến từ OrderItem ERP: name, customerDescription→congDung, nameZh, ...)
// Trả: { results:[{hs, confidence, reason, tbTchq?}], girRulesApplied:[], missing:[], candidates, ms }

const { requireAuth, serviceCaller, laNoiBoOz } = require('../lib/auth');
const { withUsage } = require('../lib/usage-context');
const { withHangHoa } = require('../lib/llm-privacy');
const { withEvalHoldout, wantsEvalHoldout } = require('../lib/holdout');
const { requireAuthOrPublicLlm } = require('../lib/public-llm');
const { demLuotCongKhai } = require('../lib/public-llm-meter');
const { setCors, handleOptions } = require('../lib/cors');
const { classify } = require('../lib/classify');
const { extractSpecs } = require('../lib/extract-specs');
const { runDeclarationCheck, validateDeclarationCheckInput } = require('../lib/declaration-check');
const { acquireServiceSlot } = require('../lib/service-rate-limit');
const { ganHoSoClassify } = require('../lib/ho-so/api');
// OZV-507 việc 1 — cache theo hash hồ sơ cho LƯỢT KHOÁ DỊCH VỤ (Postgres kín; lượt công khai không đụng).
const { cacheBat, khoaCache, docCache, ghiCache, donPhienBanCu, phienBanDuLieu } = require('../lib/classify-cache');

/** `supplierHs`: {code, source?, url?} hoặc chuỗi mã. Trả null khi không đủ 6 chữ số. */
function parseSupplierHs(v) {
  if (!v) return null;
  const o = typeof v === 'object' ? v : { code: v };
  const code = String(o.code || '').replace(/\D/g, '').slice(0, 10);
  if (code.length < 6) return null;
  const url = String(o.url || '').trim().slice(0, 300);
  return { code, source: String(o.source || '').trim().slice(0, 40) || null, url: /^https?:\/\//i.test(url) ? url : null };
}

// ── Cửa trả lời khi HẾT GIỜ (OZV-713) ────────────────────────────────────────────────────────────────────────────
// Cloudflare cắt lượt ~100 s và trả chuỗi `error code: 524` (KHÔNG phải JSON) ⇒ bên gọi parse JSON là ném lỗi và
// đếm thành "lỗi AI". Trần dưới đây ngắn hơn trần Cloudflare để handler TỰ trả lời bằng JSON thật.
// Ngân sách động cơ (CLASSIFY_BUDGET_MS, mặc định 285000) vẫn là trần MỀM khi bên gọi không nói gì.
// OZV-771: trần này được truyền xuống động cơ làm `hanChotMs` (xem `chay()` bên dưới) — động cơ lấy hạn NGẮN HƠN
// giữa hai bên, co hạn từng bước AI và dừng lặp sớm để trả cái nó đã có. Cửa dưới đây vẫn giữ làm lưới chốt cuối
// (lượt đã quá hạn không huỷ được giữa chừng), nhưng bình thường động cơ phải về trước khi cửa chạm trần.
const TRAN_MS_MAC_DINH = 85000;
function tranMs() {
  const v = Number(process.env.HS_CLASSIFY_TRAN_MS);
  return Number.isFinite(v) && v > 0 ? v : TRAN_MS_MAC_DINH;
}
/**
 * Chạy `p` trong hạn `ms`: trả `{ quaGio: true }` khi hết giờ, ngược lại chuyển tiếp kết quả/lỗi y như cũ.
 *
 * GIỚI HẠN ĐÃ BIẾT (OZV-756, ghi lại để đừng ai vá nhầm lần nữa): `setTimeout` là macrotask, chỉ bắn khi event
 * loop rảnh. Nếu đường chạy chiếm CPU ĐỒNG BỘ vắt qua mốc trần thì cửa này KHÔNG cắt được — lượt vẫn trả muộn
 * đúng bằng lúc CPU nhả. Trong một tiến trình Node không có cách nào cắt việc đồng bộ của chính nó; muốn cắt
 * thật phải ở tầng ngoài (proxy / tiến trình khác). Cửa này chỉ bảo đảm MỘT điều, và đó là mục đích gốc của
 * OZV-713: khi quá hạn thì bên gọi nhận JSON thật (503 QUA_GIO) thay vì chuỗi `error code: 524` của Cloudflare.
 *
 * ĐÃ THỬ VÀ BỎ: chốt thêm bằng `Date.now()` sau khi race. Đồng hồ là giờ TƯỜNG, không phải giờ CPU của lượt này
 * ⇒ một lượt khác chặn CPU làm lượt đang chạy ngon bị gắn nhãn quá giờ và VỨT kết quả đã có (đo: lượt việc riêng
 * 100 ms, trần 1000 ms ⇒ main 200 có results, bản vá 503). Mà nó cũng không rút ngắn thời gian trả lời thật
 * (trần 1000 ms, chặn CPU 3000 ms ⇒ vẫn trả ở 3002 ms). Bắt oan mà không chữa được bệnh ⇒ gỡ.
 */
async function trongHan(p, ms) {
  // Hạn đã tiêu hết trước khi chạy: trả ngay, KHÔNG đặt hẹn giờ âm (Node cảnh báo TimeoutNegativeWarning rồi tự hạ
  // xuống 1 ms — dựa vào đó là may rủi). Vẫn để `p` chạy nền như mọi lượt quá hạn khác.
  if (ms <= 0) { Promise.resolve(p).catch(() => {}); return { quaGio: true }; }
  let hen;
  const het = new Promise((r) => { hen = setTimeout(() => r({ quaGio: true }), ms); if (hen.unref) hen.unref(); });
  try {
    const kq = await Promise.race([Promise.resolve(p).then((v) => ({ v }), (loi) => ({ loi })), het]);
    if (kq.quaGio) return kq;
    if (kq.loi) throw kq.loi; // Lỗi thật vẫn ném như cũ (C1/C2: cửa quá giờ không nuốt lỗi).
    return kq;
  } finally { clearTimeout(hen); }
}
/** Thân JSON thật cho lượt quá giờ — 503 + trangThai QUA_GIO. Không có `results`: chưa chốt được mã nào. */
function traLoiQuaGio(res, { ms, tranMs: tran, attrs }) {
  return res.status(503).json({
    trangThai: 'QUA_GIO',
    thongDiep: 'Chưa chốt được mã trong thời gian cho phép, mời thử lại hoặc mô tả rõ hơn (thêm chất liệu, công dụng).',
    ms,
    tranMs: tran,
    attrs,
  });
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed — dùng POST' });
  }
  // POST /api/declaration-check (rewrite → ?mode=check, #338): soát tờ khai. KÍN — chỉ khoá dịch vụ / HS_API_TOKEN,
  // KHÔNG theo chế độ mở công khai của classify (dữ liệu tờ khai của khách).
  if (String(req.query?.mode || '') === 'check') return declarationCheck(req, res);
  // Chế độ phụ ?mode=extract_specs (/api/extract-specs) KHÔNG nằm trong 4 endpoint mở công khai → vẫn Bearer-only.
  const extractMode = String(req.query?.mode || '') === 'extract_specs';
  if (extractMode ? requireAuth(req, res) : requireAuthOrPublicLlm(req, res)) return;

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON body' }); }
  }

  // POST /api/extract-specs (rewrite → ?mode=extract_specs): rút thông số chuẩn từ chữ
  // tiếng Trung + chữ OCR ozsource gửi sang. Gộp vào function này theo pattern routes.json.
  // Chữ trang/ảnh sản phẩm = THÔNG TIN HÀNG, không còn riêng tư khi QT bật HS_KHACH_MO_CHUOI_AI (OZV-754, thay L0a #546).
  if (String(req.query?.mode || '') === 'extract_specs') {
    const hasText = body && (body.titleZh || (Array.isArray(body.specsZh) ? body.specsZh.length : body.specsZh) || (Array.isArray(body.imageTexts) && body.imageTexts.length));
    if (!hasText) {
      return res.status(400).json({ error: 'Cần ít nhất một trong: titleZh, specsZh, imageTexts[{url,text}]' });
    }
    try {
      const started = Date.now();
      const result = await withHangHoa(() => extractSpecs(body));
      return res.status(200).json({ ...result, ms: Date.now() - started });
    } catch (e) {
      return res.status(502).json({ error: 'Extract specs failed', detail: String(e.message).slice(0, 240) });
    }
  }

  const attrs = {
    // structured attrs tuỳ chọn từ ERP (vd { voltage:"220V", gsm:"80" }) — registry sẽ honor.
    // 6 field VN chuẩn dưới đây luôn thắng để giữ shape ổn định.
    ...(body?.attributes && typeof body.attributes === 'object' && !Array.isArray(body.attributes) ? body.attributes : {}),
    tenHang: (body?.tenHang || body?.name || body?.productName || '').trim(),
    chatLieu: body?.chatLieu || body?.material || null,
    congDung: body?.congDung || body?.purpose || body?.customerDescription || null,
    chucNang: body?.chucNang || null,
    nameZh: body?.nameZh || null,
    specs: body?.specs || body?.technicalSpec || null,
    // Dữ kiện có bằng chứng từ phiếu hồ sơ khai báo [{key,labelVi,valueVi,evidence}] — nguồn căn cứ.
    facts: Array.isArray(body?.facts) ? body.facts.slice(0, 30) : [],
    // Mã HS nhà cung cấp tự khai trên trang sản phẩm (made-in-china, 09/10/2026): mã TQ 8–10 số, chỉ 6 số đầu
    // theo HS quốc tế → MỘT nguồn kiểm chứng ở cấp nhóm, không phải đáp án. Phòng thủ: chỉ chữ số, ≥ 6.
    supplierHs: parseSupplierHs(body?.supplierHs),
  };

  // Resolver attrs: canonical + aliasVi từ attributes.json
  try {
    const REG = require('../data/attributes.json').attributes || {};
    for (const [canon, def] of Object.entries(REG)) {
      const v = body?.[canon] ?? (def.aliasVi ? body?.[def.aliasVi] : undefined);
      if (v != null && String(v).trim() !== '') attrs[canon] = String(v).trim();
    }
  } catch { /* registry optional at runtime */ }
  if (!attrs.tenHang || attrs.tenHang.length < 2) {
    return res.status(400).json({ error: 'tenHang (tên hàng) bắt buộc, tối thiểu 2 ký tự' });
  }

  // tier: "auto" của NV (body.auto=true hoặc tier="premium") → Gemini trả phí (nhanh+chính xác); mặc định MiniMax $0
  const tier = (body?.tier === 'premium' || body?.auto === true) ? 'premium' : 'standard';
  // #425: debug (body.debug=true hoặc ?debug=1) → engine.log + engine.llm (timeout theo bước, mạch đang mở). Không lộ khoá.
  const debug = body?.debug === true || String(req.query?.debug || '') === '1';

  try {
    const started = Date.now();
    const tran = tranMs(); // OZV-713: trần trả lời, ngắn hơn trần Cloudflare (~100 s) — xem trongHan/traLoiQuaGio.
    // Khoá dịch vụ có tên (Cổng ozplugin…) nhận thêm `usage` để tính phí; công khai / HS_API_TOKEN thì không.
    // Bench chống rò (R5): header X-OZ-Eval-Holdout: 1 → kho tiền lệ Oz bỏ tập giữ riêng trong lượt này. Chỉ bớt ngữ cảnh.
    const run = wantsEvalHoldout(req) ? (fn) => withEvalHoldout(fn) : (fn) => fn();
    // L1-5d (#648): cờ HS_HO_SO=on + mã top thuộc lát 1 ⇒ thêm `hoSo`, khối `ecus` sinh bằng vietMoTa; off/shadow ⇒ kết quả y cũ.
    // Trường mới của bên gọi (loaiToKhai, manufacturer…) chỉ đi vào động cơ hồ sơ, không vào `attrs` của phản hồi.
    const attrsHoSo = { ...attrs, loaiToKhai: body?.loaiToKhai, manufacturer: body?.manufacturer, dimensions: body?.dimensions, condition: body?.condition, packaging: body?.packaging, brand: body?.brand, model: body?.model, duKien: body?.duKien };
    // #725-45: kenhGoi = tên khoá dịch vụ (null = công khai/HS_API_TOKEN) — chỉ ERP (có nút "Áp mã") nhận câu "bấm Áp mã lại".
    const kenhGoi = serviceCaller(req);
    // OZV-771: nói cho động cơ biết hạn chót THẬT của lượt HTTP này (= trần trả lời). Động cơ tự co hạn từng bước
    // AI và dừng lặp sớm để trả cái nó đã có, thay vì tự cho mình 285 s rồi chạy tiếp sau khi cửa đã trả 503.
    const chay = (quyen) => classify(attrs, { tier, debug, kenhGoi, hanChotMs: started + tran }).then((kq) => ganHoSoClassify(kq, attrsHoSo, quyen));
    if (serviceCaller(req) !== null) {
      // OZV-754: classify chỉ mang THÔNG TIN HÀNG (tên, chất liệu, công dụng…) — withHangHoa: đủ chuỗi dự phòng
      // khi QT bật HS_KHACH_MO_CHUOI_AI, mặc định giữ #237 J1. (declaration-check ?mode=check vẫn withPrivateData — tờ khai.)
      // OZV-507 việc 1 — cache kết quả theo hash hồ sơ (đã đo bước 0: 13,6% lượt trùng ≥ 10%, OZV-511).
      // Chỉ khoá dịch vụ; debug/holdout đổi shape + ngữ cảnh ⇒ bỏ qua cache. Lượt cold giữ nguyên hành vi
      // (không đụng dòng nào phía trên); lượt trúng trả nguyên phản hồi + cached:true, KHÔNG gọi LLM.
      const dungCache = cacheBat() && !debug && !wantsEvalHoldout(req);
      const pb = dungCache ? phienBanDuLieu() : null;
      const khoa = dungCache
        ? khoaCache(attrs, attrsHoSo, { tier, kenhGoi, noiBo: laNoiBoOz(req) })
        : null;
      if (dungCache) {
        const tram = await docCache(khoa, pb);
        if (tram) {
          // Trúng cache: không có lượt LLM nào ⇒ usage rỗng (không tính phí token cho lượt này).
          return res.status(200).json({ ...tram, attrs, usage: [], ms: Date.now() - started, cached: true, phienBanDuLieu: pb });
        }
        donPhienBanCu(pb); // đổi phiên bản dữ liệu ⇒ dọn dòng cũ (một lần mỗi tiến trình, không ném)
      }
      // Lượt quá hạn vẫn chạy nền tới khi xong và vẫn TỐN tiền LLM như thường. Gắn ghi cache vào chính promise đó
      // để tiền đã tiêu không mất trắng: lượt sau cùng hồ sơ trúng cache, khỏi gọi LLM lại (OZV-507 việc 1).
      const chayCoCache = run(() => withHangHoa(() => withUsage(() => chay({ noiBo: laNoiBoOz(req), caller: serviceCaller(req) }))))
        .then((kq2) => { if (dungCache) ghiCache(khoa, pb, kq2.result); return kq2; }); // lỗi DB nuốt trong lib
      const kq = await trongHan(chayCoCache, tran - (Date.now() - started));
      if (kq.quaGio) return traLoiQuaGio(res, { ms: Date.now() - started, tranMs: tran, attrs });
      const { result, usage } = kq.v;
      return res.status(200).json({ ...result, attrs, usage, ms: Date.now() - started });
    }
    // Lượt công khai / HS_API_TOKEN: đếm chi phí LLM (L0j, #547 — chỉ đếm, không chặn). Shape phản hồi không đổi.
    const kq = await trongHan(run(() => demLuotCongKhai('classify', () => chay({ noiBo: false }), { req })), tran - (Date.now() - started));
    if (kq.quaGio) return traLoiQuaGio(res, { ms: Date.now() - started, tranMs: tran, attrs });
    return res.status(200).json({ ...kq.v, attrs, ms: Date.now() - started });
  } catch (e) {
    return res.status(502).json({ error: 'Classify failed', detail: String(e.message).slice(0, 240) });
  }
};

/** POST /api/declaration-check — KetQuaSoat (lib/declaration-check.js). Không kiemMa → không gọi LLM. */
async function declarationCheck(req, res) {
  if (requireAuth(req, res)) return;
  const caller = serviceCaller(req);
  // Trần theo khoá gọi (hướng #238): vượt → 429 + Retry-After; Cổng báo VUOT_HAN_MUC, không trừ điểm.
  const slot = acquireServiceSlot('declaration-check', caller || 'hs-api-token', { envPrefix: 'HS_DECL_CHECK', perMinute: 300, maxConcurrent: 8 });
  if (!slot.ok) {
    res.setHeader('Retry-After', String(slot.retryAfter));
    return res.status(429).json({ error: 'VUOT_HAN_MUC', chiTiet: [slot.lyDo], retryAfter: slot.retryAfter });
  }
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'DAU_VAO_SAI', chiTiet: ['Body không phải JSON hợp lệ.'] }); }
    }
    const v = validateDeclarationCheckInput(body);
    if (!v.ok) return res.status(400).json({ error: 'DAU_VAO_SAI', chiTiet: v.loi });
    const started = Date.now();
    const kq = await runDeclarationCheck(v.data, { laKhoaDichVu: caller !== null, quyen: { noiBo: laNoiBoOz(req), caller } });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ...kq, ms: Date.now() - started });
  } catch (e) {
    return res.status(502).json({ error: 'Declaration check failed', detail: String(e.message).slice(0, 240) });
  } finally {
    slot.release();
  }
}
