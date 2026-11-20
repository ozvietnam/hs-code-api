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
 *  - BƯỚC 0 (lib/dinh-danh-tim-web.js): tra máy tìm kiếm nội bộ bằng model + thương hiệu + tên hàng TRƯỚC lượt LLM; đoạn trích
 *    + URL thật vào prompt làm bằng chứng (có rào, không phải chỉ dẫn) và vào máy xác minh nguồn. Lỗi/quá giờ/không kết quả/
 *    HS_DINH_DANH_TIM_WEB=0 ⇒ chạy y như trước khi có bước này.
 */
const { frameFor, doanChuong, tenMien, tamGiacKiemChung, validateFrameInstance, laHangKhongCoCongSuat, goiYTimODau } = require('./attribute-frames.js');
const { xacMinhNhieu } = require('./xac-minh-nguon.js'); // #334: máy mở nguồn kiểm chứng
const { isPrivate, privateAllowed } = require('./llm-privacy.js');
const { timBangChungWeb, khoiBangChung, coModel, coHangHoacChucNang, laMienRac, SYSTEM_BANG_CHUNG } = require('./dinh-danh-tim-web.js'); // bước 0: tra web thật trước khi hỏi LLM
const { callLLMJson, llmErrorInfo } = (() => { const t = require('./llm-tier.js'); return { callLLMJson: t.callLLMJson, llmErrorInfo: (e) => ({ code: e?.code || 'LLM_FAILED', message: String(e?.message || e).slice(0, 200) }) }; })();

/** Chương đặc trưng theo danh từ đầu tên hàng (OZV-1670 mục 4: tránh LLM đặt biến tần, PLC vào khung 84 thay vì 85). Dùng ranh giới Unicode (?![\p{L}\p{N}]) thay vì \b cho tiếng Việt có dấu. */
function chuongDacTrungTheoTen(tenHang) {
  const t = String(tenHang || '').trim();
  if (/^(máy\s+|thiết\s+bị\s+|bộ\s+)?(biến\s+tần|inverter|vfd|plc|bộ\s+lập\s+trình|lập\s+trình\s+plc|cảm\s+biến\s+(tiệm\s+cận|quang|điện\s+dung|từ)|rơ\s*-?\s*le|relay|contactor|khởi\s+động\s+từ|biến\s+áp|aptomat|cầu\s+dao)(?![\p{L}\p{N}])/iu.test(t)) return '85';
  if (/^(máy\s+|thiết\s+bị\s+|bộ\s+)?(bơm|máy\s+bơm|máy\s+nén\s+khí|xi\s+lanh\s+khí\s+nén|xy\s+lanh\s+khí\s+nén|giác\s+hút\s+chân\s+không|hộp\s+thao\s+tác|buồng\s+thao\s+tác|hộp\s+găng|glove\s*box)(?![\p{L}\p{N}])/iu.test(t)) return '84';
  if (/^(máy\s+|thiết\s+bị\s+)?cân\s+(phân\s+tích|điện\s+tử|kỹ\s+thuật|vi\s+lượng)(?![\p{L}\p{N}])/iu.test(t)) return '90';
  return null;
}

/** Alias key phổ biến mà LLM hay trả lệch tên chuẩn của khung (chỉ map alias hợp lệ, không nhận key bịa như maLai). */
const ALIAS_TRUONG = {
  congSuat: 'power',
  dienAp: 'voltage',
  nguyenLy: 'nguyenLyHoatDong',
  operatingPrinciple: 'nguyenLyHoatDong',
  chucNang: 'chucNangChinh',
  congDung: 'chucNangChinh',
  mainFunction: 'chucNangChinh',
  duongKinh: 'boreDiameter',
  duongKinhPiston: 'boreDiameter',
  duongKinhXiLanh: 'boreDiameter',
  pistonDiameter: 'boreDiameter',
  bore: 'boreDiameter',
  hanhTrinh: 'strokeLength',
  stroke: 'strokeLength',
  apSuat: 'pressureRating',
  workingPressure: 'pressureRating',
  luuLuong: 'flowRate',
  cotAp: 'headPressure',
  doChinhXac: 'doChinhXac',
  readability: 'doChinhXac',
  accuracy: 'doChinhXac',
};

const GIA_TRI_KHONG_AP_DUNG_RE = /^(\s*(không\s+áp\s+dụng|khong\s+ap\s+dung|n\/?a|none|null|không\s+có|khong\s+co|không\s+dùng\s+điện|không\s+trang\s+bị.*|hoạt\s+động\s+thụ\s+động.*|-)\s*)$/i;

/**
 * Rút bổ sung thông số kỹ thuật từ hồ sơ + các trường đã có + đoạn trích nguồn đã xác minh khi LLM bỏ sót (OZV-1670 mục 2:
 * Festo DSBC-32-100-PPVA-N3 có nguồn VERIFIED nhưng frame.truong rỗng).
 */
function boSungTruongTuBangChung({ truong, hopLe, tenHang, model, moTa, nguonKhop = [] }) {
  const coNguon = nguonKhop.length > 0;
  const vanBan = [tenHang, model, moTa, ...Object.values(truong || {}), ...nguonKhop.map((n) => n?.trich)].filter(Boolean).join(' | ');
  const dat = (k, v) => {
    if (!hopLe.has(k) || !v) return;
    if (truong[k] == null || String(truong[k]).trim() === '') truong[k] = String(v).trim().slice(0, 400);
  };
  if (model) dat('modelNumber', model);

  // Xi lanh khí nén (vd Festo DSBC-32-100-PPVA-N3: piston 32 mm, hành trình 100 mm, tác động kép)
  if (/(?<![\p{L}\p{N}])(xi\s+lanh|xy\s+lanh|pneumatic\s+cylinder|dsbc-\d+-\d+)(?![\p{L}\p{N}])/iu.test(vanBan)) {
    const mDsbc = String(model || vanBan).match(/\b(?:DSBC|DSBF|DNC|ADN|CDQ2[A-Z]?|SC|MAL)-(\d{2,3})-(\d{2,4})\b/i);
    const mBore = vanBan.match(/(?:piston|bore|đường\s*kính(?:\s*piston|\s*xy\s*lanh|\s*xi\s*lanh)?|ø)\s*[:=]?\s*(\d+(?:[.,]\d+)?\s*mm)\b/i);
    const mStroke = vanBan.match(/(?:hành\s*trình|stroke)\s*[:=]?\s*(\d+(?:[.,]\d+)?\s*mm)\b/i);
    if (mBore) dat('boreDiameter', mBore[1].replace(/\s+/g, ' '));
    else if (mDsbc) dat('boreDiameter', `${mDsbc[1]} mm`);
    if (mStroke) dat('strokeLength', mStroke[1].replace(/\s+/g, ' '));
    else if (mDsbc) dat('strokeLength', `${mDsbc[2]} mm`);
    const mPress = vanBan.match(/\b(\d+(?:[.,]\d+)?(?:\s*[-–~]\s*\d+(?:[.,]\d+)?)?\s*(?:bar|mpa))\b/i);
    if (mPress) dat('pressureRating', mPress[1]);
    if (coNguon || /(?<![\p{L}\p{N}])(xi\s+lanh|xy\s+lanh)\s+khí\s+nén(?![\p{L}\p{N}])/iu.test(tenHang)) {
      const tacDongKep = /(?<![\p{L}\p{N}])(tác\s+động\s+kép|double[\s-]+acting)(?![\p{L}\p{N}])/iu.test(vanBan);
      dat('machineFunction', tacDongKep ? 'Xi lanh khí nén tác động kép (cơ cấu truyền động tuyến tính bằng khí nén)' : 'Xi lanh khí nén truyền động tuyến tính');
      dat('nguyenLyHoatDong', tacDongKep ? 'Khí nén cấp luân phiên vào hai đầu buồng xi lanh đẩy piston chuyển động tịnh tiến hai chiều (tác động kép)' : 'Áp suất khí nén tác động lên piston tạo chuyển động thẳng tịnh tiến');
      dat('chucNangChinh', 'Chuyển đổi năng lượng khí nén thành chuyển động thẳng cơ học trong máy và dây chuyền tự động hoá');
    }
  }

  // Điện áp (voltage) từ hồ sơ / đoạn trích nguồn khi LLM quên tách ra key voltage (vd PLC 24V DC, Cảm biến 12-24V DC, Biến tần 380-480V AC)
  if (!truong.voltage && hopLe.has('voltage')) {
    const mVolt = vanBan.match(/\b((?:[13]\s*pha\s*)?\d{1,3}(?:\s*[-–~/]\s*\d{1,3})?\s*V(?:\s*(?:AC|DC)|AC|DC)?)\b/i);
    if (mVolt) dat('voltage', mVolt[1].replace(/\s+/g, ' '));
  }

  // Công suất (power) từ hồ sơ / đoạn trích nguồn hoặc mã model (vd FR-D720-0.75K -> 0.75 kW, GA22 -> 22 kW) cho hàng CÓ công suất
  if (!truong.power && hopLe.has('power') && !laHangKhongCoCongSuat(vanBan)) {
    const mPow = vanBan.match(/\b(\d+(?:[.,]\d+)?\s*(?:kW|HP|W))\b/i);
    if (mPow) dat('power', mPow[1]);
    else if (/\bFR-[A-Z]\d{3}-(\d+(?:\.\d+)?)K\b/i.test(String(model || ''))) {
      const k = String(model).match(/\bFR-[A-Z]\d{3}-(\d+(?:\.\d+)?)K\b/i);
      if (k) dat('power', `${k[1]} kW`);
    }
  }

  // Nếu đã có nguồn xác minh mà LLM vẫn để trống các trường mô tả bắt buộc thì rút từ tên hàng + đoạn trích nguồn
  if (coNguon) {
    const trichGop = nguonKhop.map((n) => n?.trich).filter(Boolean).join('; ').slice(0, 280);
    if (!truong.machineFunction && hopLe.has('machineFunction')) dat('machineFunction', tenHang);
    if (!truong.chucNangChinh && hopLe.has('chucNangChinh')) dat('chucNangChinh', trichGop ? `${tenHang} — ${trichGop}` : tenHang);
    if (!truong.nguyenLyHoatDong && hopLe.has('nguyenLyHoatDong') && trichGop) dat('nguyenLyHoatDong', trichGop);
  }
}

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
 * @param {object} opts {timeoutMs=45000, timWeb? (mũi tiêm test cho bước 0), fetchImpl?, gemini?}
 */
async function identify(p = {}, opts = {}) {
  const t0 = Date.now();
  const tenHang = String(p.tenHang || '').trim();
  if (tenHang.length < 2) return { loi: 'tenHang tối thiểu 2 ký tự' };

  // Bước 0 — tra web thật, chạy SONG SONG với đọc ảnh; tự có trần thời gian, không ném, null = không có bằng chứng.
  const choWeb = timBangChungWeb({ tenHang, model: p.model, thuongHieu: p.thuongHieu }, { timWeb: opts.timWeb });

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
  if (!khungUngVien.length) khungUngVien.push(frameFor('84'), frameFor('85')); // fallback khung máy cơ khí + điện — LLM được tự đổi chương
  else if (khungUngVien.length < 3) {
    const co84 = khungUngVien.some((f) => f.chuong === '84');
    const co85 = khungUngVien.some((f) => f.chuong === '85');
    if (co84 && !co85) khungUngVien.push(frameFor('85'));
    else if (co85 && !co84) khungUngVien.push(frameFor('84'));
  }
  const khungText = khungUngVien.map((f) => `CHƯƠNG ${f.chuong} — ${f.titleVi}\n${f.truong.map((t) => `- ${t.key}${t.batBuoc ? ' (BẮT BUỘC)' : ''}: ${t.labelVi}${t.ecusHint ? ` (${t.ecusHint})` : ''}`).join('\n')}`).join('\n\n');

  const ngayHomNay = new Date().toISOString().slice(0, 10);
  const web = await choWeb; // null ⇒ prompt + xác minh nguồn giữ NGUYÊN như trước khi có bước 0
  const bangChung = web ? khoiBangChung(web, ngayHomNay) : '';

  try {
    const { json } = await callLLMJson(bangChung ? `${SYSTEM}\n${SYSTEM_BANG_CHUNG}` : SYSTEM, `${hoSo}\n\nKHUNG ỨNG VIÊN (dùng key đúng, được đổi chương nếu sai):\n${khungText}${bangChung}`, { step: 'identify', ...(process.env.LLM_STEP_IDENTIFY ? {} : { minimax: 'MiniMax-M3:off' }), timeoutMs: opts.timeoutMs || 45000, temperature: 0.1 });
    const chDacTrung = !p.chuong ? chuongDacTrungTheoTen(tenHang) : null;
    const chLlm = String(json?.chuong || khungUngVien[0].chuong).padStart(2, '0');
    const chuong = chDacTrung && (chLlm === '84' || chLlm === '85') ? chDacTrung : chLlm;
    const fr = frameFor(chuong) || khungUngVien[0];
    // Chỉ giữ trường thuộc khung (chống AI chế key) + map alias hợp lệ + lọc rỗng.
    const hopLe = new Set(fr.truong.map((t) => t.key));
    const rawTruong = json?.truong && typeof json.truong === 'object' ? json.truong : {};
    const truong = {};
    for (const [k0, v] of Object.entries(rawTruong)) {
      if (v == null || String(v).trim() === '') continue;
      const k = hopLe.has(k0) ? k0 : (ALIAS_TRUONG[k0] && hopLe.has(ALIAS_TRUONG[k0]) ? ALIAS_TRUONG[k0] : null);
      if (!k) continue;
      if ( truong[k] == null ) truong[k] = String(v).trim().slice(0, 400);
    }
    // #308: nguon[] bắt buộc retrievedAt (YYYY-MM-DD). LLM không tự đưa → MÁY đóng dấu ngày của lượt xử lý
    // (ngày trích dẫn đi vào hệ thống), tránh mọi lượt identify thật đều dính lỗi validate 'nguon thiếu retrievedAt'.
    // OZV-1670 mục 1: loại miền rác (ga22.games, *.bet, *.casino…) ngay từ đầu.
    const nguonLlm = (Array.isArray(json?.nguon) ? json.nguon : [])
      .filter((n) => n && typeof n === 'object' && !laMienRac(n.url))
      .map((n) => (!String(n.retrievedAt || '').trim() ? { ...n, retrievedAt: ngayHomNay } : n));
    // Bước 0: URL THẬT do máy tìm kiếm trả về cũng vào hàng xác minh — không chỉ URL LLM tự nhớ. Chỉ nhận kết quả mà
    // tiêu đề/đoạn trích/URL nhắc ĐÚNG model VÀ có hãng hoặc từ chức năng (OZV-1670 mục 1); nhãn loai luôn 'phu', `tu` đánh dấu gốc.
    const modelDung = String(json?.model || p?.model || '');
    const boiCanhInput = { tenHang, model: modelDung, thuongHieu: json?.thuongHieu || p?.thuongHieu };
    const urlLlm = new Set(nguonLlm.map((n) => String(n?.url || '').trim()).filter(Boolean));
    const urlWeb = new Set((web?.ketQua || []).map((k) => k.url));
    const nguonWeb = (web?.ketQua || [])
      .filter((k) => !urlLlm.has(k.url) && !laMienRac(k.url) && coModel(modelDung, k.tieuDe, k.doanTrich, k.url) && coHangHoacChucNang(boiCanhInput, k.tieuDe, k.doanTrich, k.url))
      .map((k) => ({ loai: 'phu', url: k.url, trich: k.doanTrich.slice(0, 200), retrievedAt: ngayHomNay, tu: 'TIM_WEB' }));
    // Hàng xác minh có trần 5: nguồn LLM trích từ kết quả tìm kiếm (URL thật) đi trước, rồi kết quả tìm kiếm, rồi URL LLM tự nhớ.
    const hangXacMinh = [...nguonLlm.filter((n) => n?.url && urlWeb.has(String(n.url).trim())), ...nguonWeb, ...nguonLlm.filter((n) => n?.url && !urlWeb.has(String(n.url).trim()))].slice(0, 5);
    // #334 P0: MÁY MỞ LẠI từng nguồn — chỉ nguồn qua kiểm chứng (200 + trích/model có mặt)
    // mới được tính vào tam giác. Nguồn LLM tự nhớ mà chưa mở được → nhãn CHUA_XAC_MINH.
    let xacMinhKetQua = [];
    const kiemBoiCanh = (strip) => coHangHoacChucNang(boiCanhInput, strip);
    try { xacMinhKetQua = await xacMinhNhieu(hangXacMinh, modelDung, opts.fetchImpl, { kiemBoiCanh }); } catch { /* lỗi → mọi nguồn CHUA_XAC_MINH */ }
    const moiKetQua = new Map(xacMinhKetQua.map((x) => [String(x.url).trim(), x]));
    const modelNgan = modelDung.replace(/[^a-z0-9]+/gi, '').length > 0 && modelDung.replace(/[^a-z0-9]+/gi, '').length <= 5;
    // Với nguồn khớp theo model ngắn (<=5 ký tự chữ-số, vd GA22) hoặc từ kết quả tìm kiếm / chỉ khớp model không khớp trích,
    // NỘI DUNG TRANG MỞ LẠI (x.boiCanhCoMat) bắt buộc phải có hãng/từ chức năng và không lạc đề (không dùng n.trich chưa kiểm chứng của LLM để cứu trang lạc đề).
    const phuHopBoiCanh = (n, x) => {
      if (!x || !x.xacMinhOk) return false;
      const tuWeb = urlWeb.has(String(n?.url || '').trim());
      if (modelNgan || tuWeb || x.trichCoMat !== true) return x.boiCanhCoMat === true;
      return true;
    };
    const xacMinhOk = new Map(xacMinhKetQua.filter((x) => x.xacMinhOk).map((x) => [String(x.url).trim(), x]));
    const llmDaKiem = nguonLlm.filter((n) => {
      const x = xacMinhOk.get(String(n?.url).trim());
      return Boolean(x && phuHopBoiCanh(n, x));
    });
    const nguonChuaKiem = nguonLlm.filter((n) => n?.url && !llmDaKiem.includes(n));
    // Nguồn từ máy tìm kiếm chỉ được giữ khi NỘI DUNG TRANG mở lại có model chuẩn hoá VÀ (nếu model ngắn) trang có bối cảnh hãng/chức năng.
    const trangCoModel = (n) => {
      const x = moiKetQua.get(String(n?.url).trim());
      if (!x || !x.moDuoc || x.modelChuanCoMat !== true) return false;
      if (modelNgan && x.boiCanhCoMat === false) return false;
      return true;
    };
    const webDaKiem = nguonWeb.filter(trangCoModel);

    // OZV-1670 mục 2 & 3: rút bổ sung trường từ nguồn đã xác minh (vd Festo DSBC-32-100-PPVA-N3) và bỏ "Không áp dụng" ở power cho hàng không có công suất.
    boSungTruongTuBangChung({ truong, hopLe, tenHang, model: modelDung, moTa: p?.moTa, nguonKhop: [...llmDaKiem, ...webDaKiem] });
    const nguCanhHang = [tenHang, p?.moTa, truong.machineFunction, truong.nguyenLyHoatDong, truong.chucNangChinh, ...[...llmDaKiem, ...webDaKiem].map((n) => n?.trich)].filter(Boolean).join(' ');
    if (truong.power && GIA_TRI_KHONG_AP_DUNG_RE.test(truong.power) && laHangKhongCoCongSuat(nguCanhHang)) {
      delete truong.power;
    }

    const frame = {
      chuong: fr.chuong, titleVi: fr.titleVi, truong,
      ...(json?.model || p?.model ? { model: String(json?.model || p?.model).slice(0, 120) } : {}),
      ...(json?.thuongHieu || p?.thuongHieu ? { thuongHieu: String(json?.thuongHieu || p?.thuongHieu).slice(0, 80) } : {}),
    };
    // Luật nhãn: VERIFIED và mọi nhãn khi KHÔNG có nguồn từ máy tìm kiếm = luật cũ, tính trên nguồn LLM đề xuất.
    // Có nguồn từ máy tìm kiếm: tự nó không bao giờ đưa nhãn vượt HYPOTHESIS, không bao giờ tạo VERIFIED (kể cả tên miền NSX);
    // lên CORROBORATED chỉ khi ≥2 TÊN MIỀN ĐỘC LẬP mà nội dung trang mở lại đều có model chuẩn hoá.
    let kiemChung = tamGiacKiemChung(llmDaKiem);
    if (webDaKiem.length) {
      const gop = tamGiacKiemChung([...llmDaKiem, ...webDaKiem]);
      const mienCoModel = new Set([...llmDaKiem, ...webDaKiem].filter(trangCoModel).map((n) => tenMien(n.url)).filter(Boolean));
      const muc = kiemChung.muc === 'VERIFIED' ? 'VERIFIED' : (kiemChung.muc === 'CORROBORATED' || mienCoModel.size >= 2 ? 'CORROBORATED' : 'HYPOTHESIS');
      kiemChung = { muc, mien: gop.mien, chiTiet: gop.chiTiet };
    }
    if (nguonChuaKiem.length) kiemChung.chiTiet.push(...nguonChuaKiem.map((n) => ({ ...n, xacMinh: 'CHUA_XAC_MINH' })));
    const v = validateFrameInstance({ chuong: fr.chuong, truong, nguon: kiemChung.chiTiet, tenHang, moTa: p?.moTa });
    const questions = v.thieu.map((k) => {
      const t = fr.truong.find((x) => x.key === k);
      const whereToFind = goiYTimODau(k, t);
      return {
        key: k,
        questionVi: `Cần '${t?.labelVi || k}' để định danh hàng (khung chương ${fr.chuong}) — xem tại: ${whereToFind}.`,
        whereToFind,
      };
    });
    return {
      frame, xacMinh: { muc: kiemChung.muc, mien: kiemChung.mien, nguon: kiemChung.chiTiet },
      thieuTruong: v.thieu, loi: v.loi, questions,
      anh: anh.vanBan.length ? { vanBan: anh.vanBan } : null, anhBoVi: anh.boVi,
      goiYChuong: ungVien, xacMinhKetQua,
      // Trường TUỲ CHỌN, chỉ có khi bước 0 có kết quả — chỉ số đo, không nội dung.
      ...(web ? { timWeb: { soCau: web.soCau, soKetQua: web.ketQua.length, soNguonThem: webDaKiem.length, ms: web.ms, quaHan: web.quaHan } } : {}),
      ms: Date.now() - t0,
    };
  } catch (e) {
    return { degraded: true, llmError: llmErrorInfo(e), hoSo: hoSo.slice(0, 400), anhBoVi: anh.boVi, questions: [], ms: Date.now() - t0 };
  }
}

module.exports = { identify, docAnhNameplate, safeImageUrl };
