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
 *  - CÂU HỎI (OZV-1656, PR B) — hậu xử lý TẤT ĐỊNH, không đổi prompt, không thêm lượt LLM, định danh KHÔNG trả nhóm:
 *    câu hỏi tự nhiên có đơn vị ("Công suất của hàng là bao nhiêu? (W, kW)"); trường không có nhãn tiếng Việt thì không hỏi
 *    (không lộ key thô); tối đa 3 câu, trường định danh (nguyên lý, chức năng) trước trường khai; trường khai bắt buộc của
 *    BẢNG CHƯƠNG chỉ hỏi khi danh mục trường theo NHÓM cũng đòi — nhóm lấy từ bên gọi (`p.nhom`, vd đã có mã từ phan_loai_hs)
 *    hoặc nhóm đầu của tìm kiếm từ khoá không LLM (lib/search-utils.js#searchCandidates). Nhóm đó CHỈ dùng để bớt câu hỏi,
 *    không trả ra ngoài. Không lấy được nhóm ⇒ hỏi theo bảng chương như cũ. `canCuCauHoi` ghi đường nào đã dùng.
 *    Câu hỏi theo sổ tay nhóm vẫn ở đường định danh → phan_loai_hs → so_tay_questions.
 */
const { frameFor, doanChuong, tenMien, tamGiacKiemChung, validateFrameInstance } = require('./attribute-frames.js');
const { xacMinhNhieu } = require('./xac-minh-nguon.js'); // #334: máy mở nguồn kiểm chứng
const { isPrivate, privateAllowed } = require('./llm-privacy.js');
const { timBangChungWeb, khoiBangChung, coModel, SYSTEM_BANG_CHUNG } = require('./dinh-danh-tim-web.js'); // bước 0: tra web thật trước khi hỏi LLM
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

const SO_CAU_HOI_TOI_DA = 3;
// Trường là ĐẠI LƯỢNG (hỏi "là bao nhiêu"); còn lại hỏi "là gì".
const TRUONG_DAI_LUONG = new Set(['power', 'voltage', 'frequency', 'flowRate', 'pressureRating', 'headPressure', 'currentRating', 'coolingCapacity', 'liftCapacity', 'liftHeight', 'operatingWeight', 'rpm', 'voltagePrimary', 'voltageSecondary', 'outputVoltage', 'capacityAh', 'thickness', 'boreDiameter', 'strokeLength', 'pipeDiameter', 'crossSection', 'cableLength', 'volumeMl', 'doChinhXac']);

/**
 * Danh mục trường khai BẮT BUỘC theo nhóm 4 số để đối chiếu với bảng chương (data/heading-declaration-fields.json).
 * Nguồn nhóm: bên gọi truyền (`nhomBenGoi`), không có thì nhóm ĐẦU có danh mục trong 3 nhóm đầu của tìm kiếm từ khoá
 * không LLM. Kết quả CHỈ dùng nội bộ để bớt câu hỏi — định danh không trả nhóm. Không lấy được ⇒ null (dùng bảng chương).
 * @returns {null | {batBuoc: Set<string>, tu: 'ben-goi'|'tim-tu-khoa'}}
 */
function danhMucNhom(tenHang, nhomBenGoi) {
  try {
    const { headingFieldsData } = require('./compliance-data');
    const cua = (h4) => { const r = headingFieldsData?.headings?.[h4]; return r && Array.isArray(r.required) ? new Set(r.required) : null; };
    const h = String(nhomBenGoi ?? '').replace(/\D/g, '').slice(0, 4);
    if (h.length === 4 && cua(h)) return { batBuoc: cua(h), tu: 'ben-goi' };
    const { searchCandidates } = require('./search-utils.js');
    const nhom = [...new Set((searchCandidates(String(tenHang || '').slice(0, 200), { topCandidates: 10 }) || []).map((c) => String(c?.hsCode || '').replace(/\D/g, '').slice(0, 4)).filter((x) => x.length === 4))].slice(0, 3);
    for (const n of nhom) if (cua(n)) return { batBuoc: cua(n), tu: 'tim-tu-khoa' };
  } catch { /* tìm kiếm lỗi ⇒ bảng chương */ }
  return null;
}

/**
 * Câu hỏi của bước định danh từ danh sách trường bắt buộc còn thiếu (validateFrameInstance.thieu). Tất định.
 * @returns {{questions: object[], thieuTruong: string[], canCuCauHoi: 'khong-hoi'|'danh-muc-nhom'|'bang-chuong'}}
 */
function cauHoiDinhDanh({ fr, thieu, tenHang, nhom }) {
  const truongCua = (k) => fr.truong.find((t) => t.key === k);
  const coNhan = (t) => Boolean(t && t.labelVi && t.labelVi !== t.key); // thiếu nhãn tiếng Việt ⇒ không hỏi (không lộ key thô)
  let canCuCauHoi = 'khong-hoi'; let dm; // dm: undefined = chưa tra, null = không có danh mục nhóm
  const giu = [];
  for (const k of thieu) {
    const t = truongCua(k);
    if (!coNhan(t)) continue;
    if (t.goc === 'TT39') {
      if (dm === undefined) dm = danhMucNhom(tenHang, nhom);
      canCuCauHoi = dm ? 'danh-muc-nhom' : 'bang-chuong';
      if (dm && !dm.batBuoc.has(k)) continue; // bảng chương đòi nhưng nhóm của hàng không đòi (vd "Công suất" của cảm biến)
    }
    giu.push(t);
  }
  giu.sort((a, b) => (a.goc === 'BUOC12' ? 0 : 1) - (b.goc === 'BUOC12' ? 0 : 1)); // ổn định: trường định danh trước
  const questions = giu.slice(0, SO_CAU_HOI_TOI_DA).map((t) => ({
    key: t.key,
    questionVi: `${t.labelVi} của hàng là ${TRUONG_DAI_LUONG.has(t.key) ? 'bao nhiêu' : 'gì'}?${t.ecusHint && t.ecusHint !== t.key ? ` (${t.ecusHint})` : ''}`,
    canCu: t.goc === 'BUOC12' ? 'khung-dinh-danh' : canCuCauHoi,
  }));
  return { questions, thieuTruong: giu.map((t) => t.key), canCuCauHoi };
}

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
 * @param {object} p {tenHang, model?, thuongHieu?, moTa?, anhUrl[]?, chuong? (gợi ý), nhom? (4 số bên gọi đã có, vd từ phan_loai_hs —
 *   chỉ dùng để chọn danh mục trường khai, không đưa vào prompt, không trả ra), facts?}
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
    const nguonLlm = (Array.isArray(json?.nguon) ? json.nguon : []).map((n) => (n && typeof n === 'object' && !String(n.retrievedAt || '').trim() ? { ...n, retrievedAt: ngayHomNay } : n));
    // Bước 0: URL THẬT do máy tìm kiếm trả về cũng vào hàng xác minh — không chỉ URL LLM tự nhớ. Chỉ nhận kết quả mà
    // tiêu đề/đoạn trích/URL nhắc ĐÚNG model làm ứng viên; nhãn loai luôn 'phu', `tu` đánh dấu gốc. Luật nhãn ở dưới.
    const modelDung = String(json?.model || p?.model || '');
    const urlLlm = new Set(nguonLlm.map((n) => String(n?.url || '').trim()).filter(Boolean));
    const urlWeb = new Set((web?.ketQua || []).map((k) => k.url));
    const nguonWeb = (web?.ketQua || []).filter((k) => !urlLlm.has(k.url) && coModel(modelDung, k.tieuDe, k.doanTrich, k.url))
      .map((k) => ({ loai: 'phu', url: k.url, trich: k.doanTrich.slice(0, 200), retrievedAt: ngayHomNay, tu: 'TIM_WEB' }));
    // Hàng xác minh có trần 5: nguồn LLM trích từ kết quả tìm kiếm (URL thật) đi trước, rồi kết quả tìm kiếm, rồi URL LLM tự nhớ.
    const hangXacMinh = [...nguonLlm.filter((n) => n?.url && urlWeb.has(String(n.url).trim())), ...nguonWeb, ...nguonLlm.filter((n) => n?.url && !urlWeb.has(String(n.url).trim()))].slice(0, 5);
    // #334 P0: MÁY MỞ LẠI từng nguồn — chỉ nguồn qua kiểm chứng (200 + trích/model có mặt)
    // mới được tính vào tam giác. Nguồn LLM tự nhớ mà chưa mở được → nhãn CHUA_XAC_MINH.
    let xacMinhKetQua = [];
    try { xacMinhKetQua = await xacMinhNhieu(hangXacMinh, modelDung, opts.fetchImpl); } catch { /* lỗi → mọi nguồn CHUA_XAC_MINH */ }
    const xacMinhOk = new Map(xacMinhKetQua.filter((x) => x.xacMinhOk).map((x) => [String(x.url).trim(), x]));
    const llmDaKiem = nguonLlm.filter((n) => xacMinhOk.has(String(n?.url).trim()));
    const nguonChuaKiem = nguonLlm.filter((n) => n?.url && !xacMinhOk.has(String(n.url).trim()));
    // Nguồn từ máy tìm kiếm chỉ được giữ khi NỘI DUNG TRANG mở lại có model chuẩn hoá (đoạn trích của máy tìm kiếm nhắc model
    // là chưa đủ); không đạt thì BỎ HẲN (LLM không hề đề xuất nó).
    const moiKetQua = new Map(xacMinhKetQua.map((x) => [String(x.url).trim(), x]));
    const trangCoModel = (n) => { const x = moiKetQua.get(String(n?.url).trim()); return Boolean(x && x.moDuoc && x.modelChuanCoMat === true); };
    const webDaKiem = nguonWeb.filter(trangCoModel);
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
    const v = validateFrameInstance({ chuong: fr.chuong, truong, nguon: kiemChung.chiTiet });
    const hoi = cauHoiDinhDanh({ fr, thieu: v.thieu, tenHang, nhom: p.nhom });
    const questions = hoi.questions;
    return {
      frame, xacMinh: { muc: kiemChung.muc, mien: kiemChung.mien, nguon: kiemChung.chiTiet },
      thieuTruong: hoi.thieuTruong, loi: v.loi, questions,
      canCuCauHoi: hoi.canCuCauHoi, // 'danh-muc-nhom' | 'bang-chuong' | 'khong-hoi' — đo tỉ lệ rơi về bảng chương
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
