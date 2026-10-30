/**
 * Định danh hàng hoá TRƯỚC khi phân loại (bước 12 — A-2, #299).
 *
 * Phễu 5 bước đã chạy tay trong case glovebox (15/10): model + HSX tiếng Anh là chìa khoá →
 * đóng khung thuộc tính theo chương (frameFor) → tam giác kiểm chứng (MÁY gán nhãn) → trả frame.
 * Bài học lượt-1-sai: KHÔNG xếp mã khi chưa bóc nguyên lý hoạt động — module này không trả mã HS,
 * chỉ trả frame + mức kiểm chứng; thiếu dữ kiện → câu hỏi.
 *
 * Luật:
 *  - AI chỉ ĐỀ XUẤT nguồn + giá trị trường; nhãn HYPOTHESIS/CORROBORATED/VERIFIED do tamGiacKiemChung gán.
 *  - Ảnh nameplate (≤2, https, host không phải IP nội bộ, ≤3 MB) đọc TRƯỚC bằng vision có sẵn
 *    (GEMINI_VISION_MODEL); thiếu khoá/vision lỗi → ảnh bị bỏ qua có lý do, KHÔNG fail cả lượt.
 *    Lượt riêng tư (withPrivateData) mà gemini ngoài LLM_NO_TRAIN_PROVIDERS → không tải/gửi ảnh (#560).
 *  - LLM lỗi → degraded:true + llmError (không fail-silent, cùng mẫu /api/describe).
 *  - Endpoint phục vụ: api/identify.js (Bearer, rule 2).
 */
const { frameFor, doanChuong, tamGiacKiemChung, validateFrameInstance } = require('./attribute-frames.js');
const { xacMinhNhieu } = require('./xac-minh-nguon.js'); // #334: máy mở nguồn kiểm chứng
const { isPrivate, privateAllowed } = require('./llm-privacy.js');
const { callLLMJson, llmErrorInfo } = (() => { const t = require('./llm-tier.js'); return { callLLMJson: t.callLLMJson, llmErrorInfo: (e) => ({ code: e?.code || 'LLM_FAILED', message: String(e?.message || e).slice(0, 200) }) }; })();

const SYSTEM = `Bạn là chuyên viên định danh hàng hoá nhập khẩu TRƯỚC khi tra mã HS. Bạn KHÔNG chọn mã HS.
Đầu vào: mô tả hàng (tiếng Việt/Trung), model, thương hiệu, chữ đọc từ ảnh nameplate (nếu có), và KHUNG THUỘC TÍNH của các chương ứng viên.
Trả JSON:
{"chuong":"<2 chữ số ứng viên mạnh nhất>","model":"...","thuongHieu":"...","truong":{"<key khung>":"<giá trị tiếng Việt, giữ số+đơn vị>"},"nguon":[{"loai":"nsx|phu","url":"...","trich":"câu/ngữ nguyên văn từ nguồn đã DỌC hoặc đã cho trong hồ sơ"}]}
Quy tắc:
- trương phải dùng ĐÚNG key của khung cung cấp; không chế key mới. Trường không biết → bỏ, không bịa.
- NGUYÊN LÝ HOẠT ĐỘNG (nguyenLyHoatDong) là trường quan trọng nhất với máy móc — mô tả cơ chế lõi, không mô tả bề ngoài.
- nguon chỉ liệt kê nguồn THẬT đã đọc (trang NSX, manual PDF, trang đấu giá phòng lab, thông tin kèm hồ sơ). Không bịa URL.
- loai="nsx" chỉ khi nguồn là trang/manual CHÍNH THỨC của nhà sản xuất.`;

const MAX_IMAGES = 2;
const MAX_BYTES = 3 * 1024 * 1024;

function safeImageUrl(url) {
  try {
    const u = new URL(String(url));
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[?::1)/i.test(u.hostname)) return null; // chống SSRF nội bộ
    return u.href.slice(0, 1000);
  } catch { return null; }
}

/** Đọc chữ nameplate từ ≤2 ảnh (vision có sẵn; lỗi/ko khoá → trả lỗi có lý do, không ném). */
async function docAnhNameplate(anhUrl = [], { gemini, fetchImpl } = {}) {
  const urls = (Array.isArray(anhUrl) ? anhUrl : []).map(safeImageUrl).filter(Boolean).slice(0, MAX_IMAGES);
  if (!urls.length) return { vanBan: [], boVi: ['không có URL ảnh hợp lệ'] };
  // Cổng riêng tư (#560, cùng mẫu lib/image-facts.js — L0a #546): gọi Gemini thẳng đi vòng llm.mjs, nên tự kiểm danh sách
  // trắng ở đây. Không được phép → không tải ảnh, không gọi vision; trả như khi tắt vision, lý do ở boVi.
  if (isPrivate() && !privateAllowed('gemini', process.env.GEMINI_VISION_MODEL || 'gemini-3.8-flash')) {
    return { vanBan: [], boVi: ['RIENG_TU_GEMINI_CHUA_DUOC_PHEP: lượt dữ liệu khách, Gemini vision không thuộc LLM_NO_TRAIN_PROVIDERS — không đọc ảnh'] };
  }
  const mod = gemini || require('./gemini.js');
  if (!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEYS) return { vanBan: [], boVi: ['thiếu khoá vision (GEMINI_API_KEY) — không đọc ảnh'] };
  const vanBan = []; const boVi = [];
  for (const url of urls) {
    try {
      const res = await (fetchImpl || fetch)(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'hs-code-api/identify' } });
      if (!res?.ok) { boVi.push(`tải ảnh lỗi HTTP ${res?.status}`); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_BYTES) { boVi.push('ảnh quá 3 MB'); continue; }
      const mimeType = String(res.headers.get('content-type') || 'image/jpeg').split(';')[0];
      const out = await mod.geminiGenerateWithImages({
        systemPrompt: 'Đọc chữ trên ảnh nameplate/model plate của thiết bị. Trả JSON {"seenText": string[]} — nguyên văn mọi chữ đọc được (model, thương hiệu, thông số, số serial). Không thấy chữ → mảng rỗng.',
        userPrompt: 'Đọc chữ trên ảnh này.',
        images: [{ mimeType, data: buf.toString('base64') }],
        timeoutMs: 15000,
      });
      const j = out && typeof out === 'object' && 'json' in out ? out.json : (typeof out === 'string' ? JSON.parse(out) : out); // geminiRequest trả {json, model, ms}
      for (const t of j?.seenText || []) vanBan.push(String(t).slice(0, 200));
    } catch (e) { boVi.push(String(e?.message || e).slice(0, 80)); }
  }
  return { vanBan: [...new Set(vanBan)], boVi };
}

/**
 * Định danh một món hàng.
 * @param {object} p {tenHang, model?, thuongHieu?, moTa?, anhUrl[]?, chuong? (gợi ý), facts?}
 * @param {object} opts {timeoutMs=45000}
 */
async function identify(p = {}, opts = {}) {
  const t0 = Date.now();
  const tenHang = String(p.tenHang || '').trim();
  if (tenHang.length < 2) return { loi: 'tenHang tối thiểu 2 ký tự' };

  // Ảnh trước: chữ nameplate vào hồ sơ văn bản trước lượt LLM chính.
  let anh = { vanBan: [], boVi: [] };
  if (Array.isArray(p.anhUrl) && p.anhUrl.length) anh = await docAnhNameplate(p.anhUrl, { gemini: opts.gemini, fetchImpl: opts.fetchImpl });

  const hoSo = [
    `Tên hàng: ${tenHang}`,
    p.model ? `Model: ${String(p.model).slice(0, 120)}` : null,
    p.thuongHieu ? `Thương hiệu: ${String(p.thuongHieu).slice(0, 80)}` : null,
    p.moTa ? `Mô tả: ${String(p.moTa).slice(0, 1200)}` : null,
    anh.vanBan.length ? `Chữ ảnh nameplate: ${anh.vanBan.join(' | ')}` : null,
  ].filter(Boolean).join('\n');

  const ungVien = p.chuong ? [String(p.chuong).padStart(2, '0'), ...doanChuong(hoSo).map((x) => x.chuong)].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3) : doanChuong(hoSo).map((x) => x.chuong);
  const khungUngVien = (ungVien.length ? ungVien : doanChuong(tenHang).map((x) => x.chuong)).map((c) => frameFor(c)).filter(Boolean);
  if (!khungUngVien.length) khungUngVien.push(frameFor('84')); // fallback khung máy — LLM được tự đổi chương
  const khungText = khungUngVien.map((f) => `CHƯƠNG ${f.chuong} — ${f.titleVi}\n${f.truong.map((t) => `- ${t.key}${t.batBuoc ? ' (BẮT BUỘC)' : ''}: ${t.labelVi}${t.ecusHint ? ` (${t.ecusHint})` : ''}`).join('\n')}`).join('\n\n');

  try {
    const { json } = await callLLMJson(SYSTEM, `${hoSo}\n\nKHUNG ỨNG VIÊN (dùng key đúng, được đổi chương nếu sai):\n${khungText}`, { step: 'identify', ...(process.env.LLM_STEP_IDENTIFY ? {} : { minimax: 'MiniMax-M3:off' }), timeoutMs: opts.timeoutMs || 45000, temperature: 0.1 });
    const chuong = String(json?.chuong || khungUngVien[0].chuong).padStart(2, '0');
    const fr = frameFor(chuong) || khungUngVien[0];
    // Chỉ giữ trường thuộc khung (chống AI chế key) + lọc rỗng.
    const hopLe = new Set(fr.truong.map((t) => t.key));
    const truong = Object.fromEntries(Object.entries(json?.truong || {}).filter(([k, v]) => hopLe.has(k) && v != null && String(v).trim() !== '').map(([k, v]) => [k, String(v).slice(0, 400)]));
    const frame = {
      chuong: fr.chuong, titleVi: fr.titleVi, truong,
      ...(json?.model ? { model: String(json.model).slice(0, 120) } : {}), ...(json?.thuongHieu ? { thuongHieu: String(json.thuongHieu).slice(0, 80) } : {}),
    };
    // #308: nguon[] bắt buộc retrievedAt (YYYY-MM-DD). LLM không tự đưa → MÁY đóng dấu ngày của lượt xử lý
    // (ngày trích dẫn đi vào hệ thống), tránh mọi lượt identify thật đều dính lỗi validate 'nguon thiếu retrievedAt'.
    const ngayHomNay = new Date().toISOString().slice(0, 10);
    const nguonDeXuat = (Array.isArray(json?.nguon) ? json.nguon : []).map((n) => (n && typeof n === 'object' && !String(n.retrievedAt || '').trim() ? { ...n, retrievedAt: ngayHomNay } : n));
    // #334 P0: MÁY MỞ LẠI từng nguồn — chỉ nguồn qua kiểm chứng (200 + trích/model có mặt)
    // mới được tính vào tam giác. Nguồn LLM tự nhớ mà chưa mở được → nhãn CHUA_XAC_MINH.
    let xacMinhKetQua = [];
    try { xacMinhKetQua = await xacMinhNhieu(nguonDeXuat.filter((n) => n?.url).slice(0, 5), String(json?.model || p?.model || ''), opts.fetchImpl); } catch { /* lỗi → mọi nguồn CHUA_XAC_MINH */ }
    const xacMinhOk = new Map(xacMinhKetQua.filter((x) => x.xacMinhOk).map((x) => [String(x.url).trim(), x]));
    const nguonDaKiem = nguonDeXuat.filter((n) => xacMinhOk.has(String(n.url).trim()));
    const nguonChuaKiem = nguonDeXuat.filter((n) => n?.url && !xacMinhOk.has(String(n.url).trim()));
    const kiemChung = tamGiacKiemChung(nguonDaKiem);
    if (nguonChuaKiem.length) kiemChung.chiTiet.push(...nguonChuaKiem.map((n) => ({ ...n, xacMinh: 'CHUA_XAC_MINH' })));
    const v = validateFrameInstance({ chuong: fr.chuong, truong, nguon: kiemChung.chiTiet });
    const questions = v.thieu.map((k) => ({ key: k, questionVi: `Cần '${fr.truong.find((t) => t.key === k)?.labelVi || k}' để định danh hàng (khung chương ${fr.chuong}).` }));
    return {
      frame, xacMinh: { muc: kiemChung.muc, mien: kiemChung.mien, nguon: kiemChung.chiTiet },
      thieuTruong: v.thieu, loi: v.loi, questions,
      anh: anh.vanBan.length ? { vanBan: anh.vanBan } : null, anhBoVi: anh.boVi,
      goiYChuong: ungVien, xacMinhKetQua, ms: Date.now() - t0,
    };
  } catch (e) {
    return { degraded: true, llmError: llmErrorInfo(e), hoSo: hoSo.slice(0, 400), anhBoVi: anh.boVi, questions: [], ms: Date.now() - t0 };
  }
}

module.exports = { identify, docAnhNameplate, safeImageUrl };
