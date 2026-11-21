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
 *  - NGUỒN RÁC + KHỚP MODEL (OZV-1656): nguồn thuộc data/nguon-chan.json bị bỏ (cả nguồn AI đề xuất, trước khi máy mở lại);
 *    model ngắn chỉ tính khớp khi có ranh giới từ + ngữ cảnh hàng (hãng / danh từ chính); nhãn CORROBORATED với model ngắn
 *    cần ≥2 tên miền mà CẢ HAI trang qua luật khớp đó.
 *  - CÂU HỎI THEO SỔ TAY (OZV-1656): LLM nêu thêm NHÓM 4 số ứng viên (hợp lệ = có data/so-tay/<nhóm>.json). Có nhóm ⇒
 *    (1) một lượt LLM ngắn kiểm ranh giới bằng chính sổ tay nhóm (phạm vi + loại trừ có nhóm đích + câu phân biệt) — chỉ được
 *    đổi sang nhóm mà sổ tay ghi là đích; (2) trường bắt buộc lấy theo NHÓM (data/heading-declaration-fields.json) thay bảng
 *    chương; (3) câu hỏi gửi khách lấy từ `phanBiet[].hoi` của sổ tay, từ điều kiện dòng của sổ ranh giới PN6 đã DUYET, và
 *    từ cổng sổ tay — mỗi câu kèm căn cứ (`canCu`, `nguon`, `trich`, `nhom`); câu mà hồ sơ/dữ kiện đã trả lời thì không hỏi.
 *    Không xác định được nhóm ⇒ đường lùi bảng chương, mỗi câu ghi `canCu: "bang-chuong"` (đo được tỉ lệ rơi qua
 *    `canCuCauHoi`). Công tắc: HS_DINH_DANH_SO_TAY=0 ⇒ bỏ nhánh sổ tay + lượt LLM thứ hai, hỏi theo bảng chương
 *    (KHÔNG trả về hành vi trước PR: danh sách chặn, luật model ngắn, bỏ mặc định 84 vẫn có hiệu lực).
 *  - 84/85 (OZV-1656): không còn mặc định chương 84. Không có tín hiệu chương ⇒ LLM tự chọn; LLM không chọn ⇒ trả
 *    `chuaXacDinh: true`, `frame.chuong: null` — không điền 84.
 */
const { frameFor, frameForNhom, khoaHopLe, doanChuong, tenMien, tamGiacKiemChung, validateFrameInstance } = require('./attribute-frames.js');
const { xacMinhNhieu, khopModel, tuNguCanh, chiChuSo, MODEL_NGAN } = require('./xac-minh-nguon.js'); // #334: máy mở nguồn kiểm chứng
const { isPrivate, privateAllowed } = require('./llm-privacy.js');
const { timBangChungWeb, khoiBangChung, nguonBiChan, SYSTEM_BANG_CHUNG } = require('./dinh-danh-tim-web.js'); // bước 0: tra web thật trước khi hỏi LLM
const { callLLMJson, llmErrorInfo } = (() => { const t = require('./llm-tier.js'); return { callLLMJson: t.callLLMJson, llmErrorInfo: (e) => ({ code: e?.code || 'LLM_FAILED', message: String(e?.message || e).slice(0, 200) }) }; })();

const SYSTEM = `Bạn là chuyên viên định danh hàng hoá nhập khẩu TRƯỚC khi tra mã HS. Bạn KHÔNG chốt mã HS 8 số.
Đầu vào: mô tả hàng (tiếng Việt/Trung), model, thương hiệu, chữ đọc từ ảnh nameplate (nếu có), và KHUNG THUỘC TÍNH của các chương ứng viên.
Trả JSON:
{"chuong":"<2 chữ số ứng viên mạnh nhất; KHÔNG đủ căn cứ thì để chuỗi rỗng>","nhom4":"<4 chữ số NHÓM HS ứng viên; không đủ căn cứ thì bỏ>","pn6":"<6 chữ số phân nhóm, CHỈ khi chắc; không thì bỏ>","model":"...","thuongHieu":"...","truong":{"<key khung>":"<giá trị tiếng Việt, giữ số+đơn vị>"},"nguon":[{"loai":"nsx|phu","url":"...","trich":"câu/ngữ nguyên văn từ nguồn đã DỌC hoặc đã cho trong hồ sơ"}]}
Quy tắc:
- trương phải dùng ĐÚNG key của khung cung cấp; không chế key mới. Trường không biết → bỏ, không bịa.
- NGUYÊN LÝ HOẠT ĐỘNG (nguyenLyHoatDong) là trường quan trọng nhất với máy móc — mô tả cơ chế lõi, không mô tả bề ngoài.
- nguon chỉ liệt kê nguồn THẬT đã đọc (trang NSX, manual PDF, trang đấu giá phòng lab, thông tin kèm hồ sơ). Không bịa URL. Không dùng bách khoa chung, mạng xã hội, trang trò chơi/cá cược làm nguồn.
- loai="nsx" chỉ khi nguồn là trang/manual CHÍNH THỨC của nhà sản xuất.
- chuong chọn theo CHỨC NĂNG CHÍNH của chính món hàng, không theo cái máy mà nó lắp vào, không theo chữ "máy"/"thiết bị" trong tên. KHÔNG mặc định chương 84: hàng làm việc bằng điện/điện tử (điều khiển, biến đổi điện, đóng cắt, nguồn) xét chương 85 trước; dụng cụ đo xét chương 90. Không nhận ra hàng là gì (vd tên chỉ là một mã) → chuong để chuỗi rỗng.
- nhom4 là ỨNG VIÊN để hệ thống mở đúng sổ tay nhóm ra kiểm ranh giới và đặt câu hỏi cho khách — không phải kết luận phân loại.
- Trường BẮT BUỘC của khung mà KHÔNG áp dụng cho loại hàng này (vd công suất với hàng không tiêu thụ/truyền công suất) → ghi "không áp dụng"; không bịa số.`;

// Lượt LLM thứ hai (chỉ khi có nhóm ứng viên hợp lệ): kiểm ranh giới nhóm bằng CHÍNH sổ tay của nhóm + trả lời trước câu phân biệt.
const SYSTEM_RANH_GIOI = `Bạn kiểm RANH GIỚI NHÓM HS cho một món hàng đã định danh. Bạn KHÔNG chốt mã HS 8 số.
Đầu vào: hồ sơ hàng, dữ kiện đã có, NHÓM ỨNG VIÊN và SỔ TAY của nhóm đó (phạm vi, LOẠI TRỪ kèm nhóm đích, câu hỏi phân biệt đánh số). Sổ tay là căn cứ; không dùng trí nhớ để cãi sổ tay.
Trả JSON:
{"nhom4":"<giữ nhóm ứng viên; hoặc nhóm ĐÍCH của một dòng loại trừ / câu phân biệt nếu hàng rơi đúng vào đó>","lyDo":"<1 câu, dẫn ý của sổ tay>","phanBiet":[{"i":<số thứ tự câu>,"traLoi":"co|khong|chua_ro","canCu":"<cụm NGUYÊN VĂN trong hồ sơ/dữ kiện làm căn cứ; chua_ro thì để rỗng>"}],"truong":{"<key trường khai của nhóm còn trống>":"<giá trị, giữ số+đơn vị>"}}
Quy tắc:
- Chỉ trả lời "co"/"khong" khi hồ sơ hoặc dữ kiện đã có nói RÕ; phải suy đoán → "chua_ro".
- Chỉ được đổi nhom4 sang nhóm mà sổ tay ghi là đích (đích loại trừ / đích câu phân biệt). Không tự nghĩ ra nhóm khác.
- truong: chỉ dùng key trong danh sách TRƯỜNG KHAI CỦA NHÓM CÒN TRỐNG. Biết chắc giá trị của đúng model này → ghi; trường KHÔNG áp dụng cho loại hàng này (vd điện áp với hàng không dùng điện) → ghi "không áp dụng"; không biết → bỏ, không bịa số.`;

// HẠN TỔNG của một lượt định danh (Cổng OZ cắt /api/identify ở 95 giây): lượt LLM 1 + lượt kiểm ranh giới + máy mở lại nguồn
// phải nằm gọn dưới HAN_TONG_MS. Mọi lượt LLM nhận `hanChotMs` tuyệt đối (lib/llm-tier.js: tầng dự phòng không được nhận lại
// trọn hạn). Lượt kiểm ranh giới chỉ dùng phần thời gian còn lại, tối đa LUOT_2_TOI_DA_MS; hết thời gian ⇒ bỏ lượt đó, rơi êm.
const HAN_TONG_MS = 80000;
const DANH_CHO_XAC_MINH_MS = 10000; // xacMinhNhieu mở song song, mỗi nguồn trần 8 giây
const LUOT_2_TOI_DA_MS = 15000;
const LUOT_2_TOI_THIEU_MS = 3000;
const SO_CAU_PN6_TOI_DA = 2; // trần câu điều kiện dòng 8 số đem ra hỏi khách ở bước định danh
const SO_PHAN_BIET = 6; // trần số câu phân biệt của sổ tay đem ra kiểm/hỏi mỗi lượt
const so = (x) => String(x ?? '').replace(/\D/g, '');
const cat = (x, n) => { const t = String(x ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n)}…` : t; };
const nhom4Cua = (x) => String(x ?? '').split('|').map((c) => so(c).slice(0, 4)).filter((c) => c.length === 4);

/** Nhánh sổ tay bật? Mặc định BẬT; HS_DINH_DANH_SO_TAY=0|false|off|no ⇒ tắt (hỏi theo bảng chương như trước). */
function soTayBat() {
  return !['0', 'false', 'off', 'no'].includes(String(process.env.HS_DINH_DANH_SO_TAY ?? '').trim().toLowerCase());
}

/** Các nhóm 4 số mà sổ tay của một nhóm ghi là ĐÍCH (loại trừ `sangNhom`, câu phân biệt `neuCo`/`neuKhong`). */
function nhomDichCua(s) {
  const out = new Set();
  for (const x of s?.loaiTru || []) for (const c of nhom4Cua(x.sangNhom)) out.add(c);
  for (const x of s?.phanBiet || []) for (const c of [...nhom4Cua(x.neuCo), ...nhom4Cua(x.neuKhong)]) out.add(c);
  return out;
}

/** Câu phân biệt của sổ tay được phép đem ra hỏi: có lời hỏi + có nguồn, không phải nhãn AI_CHUA_KIEM (lib/nguon-loai.js). */
const phanBietCua = (s) => (s?.phanBiet || []).filter((x) => x && String(x.hoi || '').trim() && String(x.nguon || '').trim() && x.nguonLoai !== 'AI_CHUA_KIEM').slice(0, SO_PHAN_BIET);

/**
 * Lượt LLM kiểm ranh giới nhóm bằng sổ tay (lib/so-tay-gates.js#soTayBlock: phạm vi + loại trừ có nhóm đích).
 * Cùng lượt đó hỏi luôn các trường khai bắt buộc CỦA NHÓM còn trống (lượt 1 chỉ thấy khung chương): điền nếu biết, hoặc ghi
 * "không áp dụng" — để không đem câu vô nghĩa ("Điện áp" của một giác hút cao su) ra hỏi khách.
 * @returns {Promise<{nhom: string, doi: null|{tu:string, lyDo:string}, lyDo: string, traLoi: Map<number,{traLoi:'co'|'khong', canCu:string}>, truongBoSung: Record<string,string>}>}
 */
async function kiemRanhGioiNhom({ hoSo, truong, nhom, timeoutMs, hanChotMs }) {
  const G = require('./so-tay-gates.js');
  const s = G.loadSoTay(nhom);
  const pb = phanBietCua(s);
  const khoi = G.soTayBlock(nhom, { lines: [], maxChars: 2400 }) || '';
  const duKien = Object.entries(truong).map(([k, v]) => `- ${k}: ${v}`).join('\n');
  const cau = pb.map((x, i) => `${i + 1}. ${cat(x.hoi, 220)} (có → ${x.neuCo}; không → ${x.neuKhong})`).join('\n');
  const conTrong = (frameForNhom(nhom)?.truong || []).filter((t) => t.goc === 'NHOM' && t.batBuoc && String(truong[t.key] ?? '').trim() === '');
  const khoiTruong = conTrong.length ? `\n\nTRƯỜNG KHAI CỦA NHÓM CÒN TRỐNG:\n${conTrong.map((t) => `- ${t.key}: ${t.labelVi}${t.ecusHint ? ` (${t.ecusHint})` : ''}`).join('\n')}` : '';
  const user = `${hoSo}\n\nDỮ KIỆN ĐÃ CÓ:\n${duKien || '(chưa có)'}\n\nNHÓM ỨNG VIÊN: ${nhom}\n${khoi}\n\nCÂU HỎI PHÂN BIỆT (trả lời theo số thứ tự):\n${cau || '(sổ tay không có câu phân biệt)'}${khoiTruong}`;
  const { json } = await callLLMJson(SYSTEM_RANH_GIOI, user, { step: 'identify', ...(process.env.LLM_STEP_IDENTIFY ? {} : { minimax: 'MiniMax-M3:off' }), timeoutMs, hanChotMs, temperature: 0 });
  const traLoi = new Map();
  for (const a of Array.isArray(json?.phanBiet) ? json.phanBiet : []) {
    const i = Number(a?.i); const tl = String(a?.traLoi || '').trim().toLowerCase();
    if (Number.isInteger(i) && i >= 1 && i <= pb.length && (tl === 'co' || tl === 'khong')) traLoi.set(i - 1, { traLoi: tl, canCu: cat(a?.canCu, 160) });
  }
  const lyDo = cat(json?.lyDo, 240);
  const moi = so(json?.nhom4).slice(0, 4);
  // Chỉ nhận đổi nhóm khi nhóm mới là ĐÍCH ghi trong sổ tay và chính nó có sổ tay; câu trả lời phân biệt của nhóm cũ bỏ.
  if (moi.length === 4 && moi !== nhom && nhomDichCua(s).has(moi) && G.loadSoTay(moi)) return { nhom: moi, doi: { tu: nhom, lyDo }, lyDo, traLoi: new Map(), truongBoSung: {} };
  const duocDien = new Set(conTrong.map((t) => t.key));
  const truongBoSung = Object.fromEntries(Object.entries(json?.truong && typeof json.truong === 'object' ? json.truong : {}).filter(([k, v]) => duocDien.has(k) && v != null && String(v).trim() !== '').map(([k, v]) => [k, String(v).slice(0, 400)]));
  return { nhom, doi: null, lyDo, traLoi, truongBoSung };
}

/** Mọi fact (khoá từ vựng) mà một điều kiện có kiểu nhắc tới — đi cả nhánh VA / HOAC. */
function factTrong(c) {
  if (!c || typeof c !== 'object') return [];
  if (c.fact) return [String(c.fact)];
  return [...(c.cacDieuKien || []).flatMap(factTrong), ...(c.phuongAn || []).flat().flatMap(factTrong)];
}

/**
 * Căn cứ theo từng fact của một phân nhóm 6 số: đi đường của mọi dòng 8 số trong phân nhóm bằng máy đối chiếu có sẵn
 * (lib/dieu-kien-so.js#doiChieuPhanNhom + doiChieuDong8) rồi gom {nguon, trich} của nút mang điều kiện đó.
 */
function canCuPn6(pn6) {
  const DK = require('./dieu-kien-so.js');
  const m = new Map();
  for (const d of DK.doiChieuPhanNhom(pn6, {}).dong || []) {
    for (const g of DK.doiChieuDong8(d.hs, {}).duongDi || []) {
      const ng = g?.nguon; if (!ng?.ma || !ng?.trich) continue;
      for (const f of factTrong(g.dieuKien)) {
        const ds = m.get(f) || []; if (!ds.some((x) => x.nguon === ng.ma)) ds.push({ nguon: ng.ma, trich: cat(ng.trich, 240) });
        m.set(f, ds);
      }
    }
  }
  return m;
}

/**
 * Câu hỏi gửi khách khi ĐÃ CÓ nhóm 4 số — lấy từ sổ tay nhóm + sổ ranh giới PN6 đã DUYET, mỗi câu kèm căn cứ.
 * Thứ tự: câu phân biệt nhóm → điều kiện dòng PN6 → cổng sổ tay → trường khai theo nhóm → trường định danh (bước 12).
 * Câu điều kiện dòng PN6 chỉ đưa ra khi còn ≥2 dòng 8 số khả dĩ sau khi áp dữ kiện đã có VÀ fact đó còn mở trên một dòng
 * khả dĩ (lib/so-tay-gates.js#dongConKhaDi); tối đa SO_CAU_PN6_TOI_DA câu. Câu cổng sổ tay (ngôn ngữ luật, `askStaff`) KHÔNG
 * phải câu hỏi khách — trả riêng ở `cauHoiChuyenVien`.
 * @returns {{questions: object[], thieuTruong: string[], cauHoiChuyenVien: object[]}}
 */
function cauHoiTheoSoTay({ nhom, pn6, hoSo, truong, nguonDaKiem, traLoiPb, frNhom, fr }) {
  const G = require('./so-tay-gates.js');
  const DK = require('./dieu-kien-so.js');
  const s = G.loadSoTay(nhom);
  const nhan = (k) => fr?.truong.find((t) => t.key === k)?.labelVi || k;
  // Chữ máy được đọc để biết "dữ kiện đã có": hồ sơ + trường đã điền + câu trích của nguồn đã qua xác minh.
  const productText = [hoSo, ...Object.entries(truong).map(([k, v]) => `${nhan(k)}: ${v}`), ...(nguonDaKiem || []).map((n) => String(n?.trich || '')).filter(Boolean)].join('\n').slice(0, 6000);
  const questions = [];

  // (a) Câu phân biệt của sổ tay nhóm. Lượt kiểm ranh giới đã trả lời "ở lại nhóm" kèm căn cứ trong hồ sơ ⇒ không hỏi nữa.
  phanBietCua(s).forEach((x, i) => {
    const a = traLoiPb?.get(i);
    if (a && nhom4Cua(a.traLoi === 'co' ? x.neuCo : x.neuKhong).includes(nhom)) return;
    questions.push({
      key: `phanBiet_${nhom}_${i + 1}`, questionVi: cat(x.hoi, 260), type: 'choice', options: ['Có', 'Không', 'Chưa rõ'], required: true,
      canCu: 'so-tay', nhom, nguon: x.nguon, trich: cat(x.trich, 240), neuCo: String(x.neuCo), neuKhong: String(x.neuKhong),
    });
  });

  // (b)(c)(d) Lõi của /api/so-tay-questions: điều kiện dòng (PN6 chỉ khi sổ ranh giới đã DUYET) + cổng + trường khai theo nhóm.
  const pn6Duyet = pn6 && DK.docRanhGioiDuyet(pn6) ? pn6 : null;
  const kq = G.cauHoiSoTay({ code: pn6Duyet || nhom, productText, facts: truong });
  const ccPn6 = pn6Duyet && (kq?.questions || []).some((q) => q.loai === 'DONG_BIEU') ? canCuPn6(pn6Duyet) : new Map();
  const conMo = pn6Duyet ? G.dongConKhaDi(pn6Duyet, productText) : { khaDi: [], factConMo: new Set() };
  const canHoiDong = conMo.khaDi.length >= 2; // chỉ còn 1 dòng khả dĩ ⇒ không còn gì để phân biệt
  const coTruong = (k) => String(truong[k] ?? '').trim() !== '';
  const thieuTruong = []; const cauHoiChuyenVien = []; let soPn6 = 0;
  const kieu = (q) => (q.type === 'number' || q.options ? q.type : 'text'); // không có phương án ⇒ câu trả lời tự do
  // Trường khai trùng ý với một điều kiện dòng đã hỏi (điện áp, dòng điện, công suất) ⇒ không hỏi khách hai lần.
  const TRUNG_Y = { voltage: ['dienAp', 'dien_ap'], currentRating: ['dongDien', 'dong_dien'], power: ['congSuat', 'cong_suat'] };
  const daHoi = new Set();
  for (const q of kq?.questions || []) {
    if (q.loai === 'DONG_BIEU') {
      if (!canHoiDong || !conMo.factConMo.has(q.key) || soPn6 >= SO_CAU_PN6_TOI_DA) continue;
      if (Object.entries(TRUNG_Y).some(([tr, ds]) => ds.includes(q.key) && coTruong(tr))) continue; // frame.truong đã có dữ kiện trùng ý
      soPn6 += 1;
      const cc = ccPn6.get(q.key)?.[0];
      daHoi.add(q.key);
      questions.push({
        key: q.key, questionVi: q.cauHoiTuVung || q.questionVi, type: kieu(q), ...(q.unit ? { unit: q.unit } : {}), ...(q.options ? { options: q.options } : {}), required: true,
        ...(q.askStaff && !q.cauHoiTuVung ? { askStaff: true } : {}), canCu: 'ranh-gioi-pn6', nhom, pn6: pn6Duyet, nguon: cc?.nguon || q.nguon, trich: cat(cc?.trich || q.trich, 240),
      });
    } else if (q.loai === 'CONG') {
      cauHoiChuyenVien.push({ key: q.key, questionVi: q.questionVi, type: q.type, options: q.options, askStaff: true, canCu: 'so-tay', nhom, nguon: q.nguon, trich: cat(q.trich, 240) });
    } else if (q.loai === 'TT39' && frNhom) { // nhóm chưa có danh mục trường riêng ⇒ KHÔNG lùi về bảng chương để hỏi
      thieuTruong.push(q.key);
      if ((TRUNG_Y[q.key] || []).some((k) => daHoi.has(k))) continue;
      questions.push({ key: q.key, questionVi: q.questionVi, ...(q.questionZh ? { questionZh: q.questionZh } : {}), type: kieu(q), required: true, canCu: 'truong-khai-nhom', nhom, nguon: `Danh mục trường khai theo nhóm ${nhom} (TT 39/2018)` });
    }
  }

  // (e) Trường nghiệp vụ định danh (bước 12) còn trống.
  for (const t of fr?.truong || []) {
    if (t.goc !== 'BUOC12' || !t.batBuoc || String(truong[t.key] ?? '').trim() !== '') continue;
    thieuTruong.push(t.key);
    questions.push({ key: t.key, questionVi: `Cần '${t.labelVi}' để định danh hàng (nhóm ${nhom}).`, required: true, canCu: 'khung-dinh-danh', nhom });
  }
  return { questions, thieuTruong: [...new Set(thieuTruong)], cauHoiChuyenVien };
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
 * @param {object} p {tenHang, model?, thuongHieu?, moTa?, anhUrl[]?, chuong? (gợi ý), facts?}
 * @param {object} opts {timeoutMs=45000, hanTongMs=80000 (hạn tổng cả lượt), boSoTay? (true ⇒ bỏ nhánh sổ tay + lượt LLM thứ hai —
 *   tầng hồ sơ lib/ho-so/nghien-cuu.js không dùng questions/nhom), timWeb? (mũi tiêm test cho bước 0), fetchImpl?, gemini?}
 */
async function identify(p = {}, opts = {}) {
  const t0 = Date.now();
  const hanLlm = t0 + (Number(opts.hanTongMs) > 0 ? Number(opts.hanTongMs) : HAN_TONG_MS) - DANH_CHO_XAC_MINH_MS; // hạn chót tuyệt đối cho MỌI lượt LLM
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

  // Chương ứng viên: gợi ý của bên gọi + từ khoá đặc thù trong hồ sơ. KHÔNG có tín hiệu ⇒ không ưu tiên chương nào:
  // đưa khung 84 và 85 chỉ để LLM có key tham khảo, LLM tự chọn (kể cả chương khác) hoặc để trống.
  const ungVien = (p.chuong ? [String(p.chuong).padStart(2, '0'), ...doanChuong(hoSo).map((x) => x.chuong)] : doanChuong(hoSo).map((x) => x.chuong)).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
  const khungUngVien = ungVien.map((c) => frameFor(c)).filter(Boolean);
  const coTinHieu = khungUngVien.length > 0;
  if (!coTinHieu) khungUngVien.push(frameFor('84'), frameFor('85'));
  else if (khungUngVien.length < 3) {
    const co84 = khungUngVien.some((f) => f.chuong === '84');
    const co85 = khungUngVien.some((f) => f.chuong === '85');
    if (co84 && !co85) khungUngVien.push(frameFor('85'));
    else if (co85 && !co84) khungUngVien.push(frameFor('84'));
  }
  const khungText = khungUngVien.map((f) => `CHƯƠNG ${f.chuong} — ${f.titleVi}\n${f.truong.map((t) => `- ${t.key}${t.batBuoc ? ' (BẮT BUỘC)' : ''}: ${t.labelVi}${t.ecusHint ? ` (${t.ecusHint})` : ''}`).join('\n')}`).join('\n\n');
  const dauKhung = coTinHieu ? 'KHUNG ỨNG VIÊN (dùng key đúng, được đổi chương nếu sai)' : 'CHƯA CÓ TÍN HIỆU CHƯƠNG — hai khung dưới chỉ để tham khảo key, thứ tự KHÔNG phải ưu tiên; tự chọn chương theo chức năng chính của hàng (kể cả chương khác), không chắc thì để chuong rỗng';

  const ngayHomNay = new Date().toISOString().slice(0, 10);
  const web = await choWeb; // null ⇒ prompt + xác minh nguồn giữ NGUYÊN như trước khi có bước 0
  const bangChung = web ? khoiBangChung(web, ngayHomNay) : '';

  try {
    const { json } = await callLLMJson(bangChung ? `${SYSTEM}\n${SYSTEM_BANG_CHUNG}` : SYSTEM, `${hoSo}\n\n${dauKhung}:\n${khungText}${bangChung}`, { step: 'identify', ...(process.env.LLM_STEP_IDENTIFY ? {} : { minimax: 'MiniMax-M3:off' }), timeoutMs: Math.max(1000, Math.min(opts.timeoutMs || 45000, hanLlm - Date.now())), hanChotMs: hanLlm, temperature: 0.1 });
    // Chỉ giữ trường thuộc danh mục key của hệ thống (chống AI chế key) + lọc rỗng.
    const hopLe = khoaHopLe();
    const truong = Object.fromEntries(Object.entries(json?.truong || {}).filter(([k, v]) => hopLe.has(k) && v != null && String(v).trim() !== '').map(([k, v]) => [k, String(v).slice(0, 400)]));

    // ── Nhóm 4 số ứng viên (hợp lệ = có sổ tay) → kiểm ranh giới bằng sổ tay. Lỗi ở nhánh này KHÔNG làm hỏng lượt định danh. ──
    let nhom = null; let pn6 = null; let traLoiPb = new Map(); let kiemRanhGioi = null; let soTayNhom = null;
    const nhomLlm = so(json?.nhom4).length === 4 ? so(json.nhom4) : null;
    if (nhomLlm && soTayBat() && !opts.boSoTay) {
      try {
        const G = require('./so-tay-gates.js');
        soTayNhom = G.loadSoTay(nhomLlm);
        if (soTayNhom) {
          nhom = nhomLlm;
          const conLaiMs = hanLlm - Date.now();
          if (((soTayNhom.loaiTru || []).length || phanBietCua(soTayNhom).length) && conLaiMs < LUOT_2_TOI_THIEU_MS) {
            kiemRanhGioi = { ketQua: 'BO_QUA', lyDo: 'het-han-tong' }; // lượt 1 đã ăn hết hạn ⇒ giữ nhóm, hỏi đủ câu phân biệt
          } else if ((soTayNhom.loaiTru || []).length || phanBietCua(soTayNhom).length) {
            try {
              const ms2 = Math.min(LUOT_2_TOI_DA_MS, conLaiMs, opts.timeoutMs || LUOT_2_TOI_DA_MS);
              const k = await kiemRanhGioiNhom({ hoSo, truong, nhom, timeoutMs: ms2, hanChotMs: Date.now() + ms2 });
              nhom = k.nhom; traLoiPb = k.traLoi; soTayNhom = G.loadSoTay(nhom);
              for (const [kk, vv] of Object.entries(k.truongBoSung || {})) if (String(truong[kk] ?? '').trim() === '') truong[kk] = vv;
              kiemRanhGioi = k.doi ? { ketQua: 'DOI', tu: k.doi.tu, ...(k.lyDo ? { lyDo: k.lyDo } : {}) } : { ketQua: 'GIU', ...(k.lyDo ? { lyDo: k.lyDo } : {}) };
            } catch (e) { kiemRanhGioi = { ketQua: 'LOI', loi: llmErrorInfo(e).code }; } // LLM lỗi ⇒ giữ nhóm, hỏi đủ câu phân biệt
          }
          // Phân nhóm 6 số: phải thuộc nhóm đã chốt và có dòng 8 số trong sổ tay của nhóm.
          const p6 = so(json?.pn6);
          if (p6.length === 6 && p6.startsWith(nhom) && (soTayNhom?.dong8 || []).some((d) => so(d.hs).startsWith(p6))) pn6 = p6;
        }
      } catch { nhom = null; pn6 = null; soTayNhom = null; }
    }

    // ── Chương: theo nhóm nếu có; không thì LLM chọn; LLM không chọn ⇒ từ khoá đặc thù; vẫn không có ⇒ CHƯA XÁC ĐỊNH (không điền 84). ──
    const chuongLlm = /^\d{1,2}$/.test(String(json?.chuong ?? '').trim()) ? String(json.chuong).trim().padStart(2, '0') : null;
    const frChuongLlm = chuongLlm ? frameFor(chuongLlm) : null;
    // LLM chọn chương hợp lệ (01–97) mà hệ thống CHƯA có khung trường cho chương đó (vd 87) ⇒ vẫn giữ chương của LLM, khung rỗng.
    const chuongLlmHopLe = chuongLlm && Number(chuongLlm) >= 1 && Number(chuongLlm) <= 97 ? chuongLlm : null;
    const chuong = nhom ? nhom.slice(0, 2) : (frChuongLlm ? chuongLlm : (chuongLlmHopLe || (coTinHieu ? khungUngVien[0].chuong : null)));
    const frNhom = nhom ? frameForNhom(nhom) : null;
    const fr = frNhom || (chuong ? frameFor(chuong) : null);
    const frame = {
      chuong, titleVi: fr?.titleVi || null, truong,
      ...(nhom ? { nhom } : {}), ...(pn6 ? { pn6 } : {}),
      ...(json?.model ? { model: String(json.model).slice(0, 120) } : {}), ...(json?.thuongHieu ? { thuongHieu: String(json.thuongHieu).slice(0, 80) } : {}),
    };
    // #308: nguon[] bắt buộc retrievedAt (YYYY-MM-DD). LLM không tự đưa → MÁY đóng dấu ngày của lượt xử lý
    // (ngày trích dẫn đi vào hệ thống), tránh mọi lượt identify thật đều dính lỗi validate 'nguon thiếu retrievedAt'.
    // Nguồn do LLM đề xuất cũng qua danh sách chặn nguồn rác TRƯỚC khi máy mở lại — bị chặn thì bỏ hẳn, chỉ đếm.
    const biChan = [];
    const nguonLlm = (Array.isArray(json?.nguon) ? json.nguon : [])
      .filter((n) => { const c = n && typeof n === 'object' && n.url ? nguonBiChan(n.url) : null; if (c) biChan.push(c); return !c; })
      .map((n) => (n && typeof n === 'object' && !String(n.retrievedAt || '').trim() ? { ...n, retrievedAt: ngayHomNay } : n));
    // Bước 0: URL THẬT do máy tìm kiếm trả về cũng vào hàng xác minh — không chỉ URL LLM tự nhớ. Chỉ nhận kết quả mà
    // TIÊU ĐỀ/ĐOẠN TRÍCH nhắc đúng model (không xét URL; model ngắn cần ranh giới từ + ngữ cảnh hàng) làm ứng viên;
    // nhãn loai luôn 'phu', `tu` đánh dấu gốc. Luật nhãn ở dưới.
    const modelDung = String(json?.model || p?.model || '');
    const tdn = json?.truong?.tenDongNghia; // tên đồng nghĩa lượt 1 (có thể kèm tên tiếng Anh) ⇒ thêm từ khoá ngữ cảnh
    const tenKhac = [...(typeof tdn === 'string' ? [tdn] : []), ...(tdn && typeof tdn === 'object' ? Object.values(tdn).flat() : []), json?.truong?.machineFunction].filter((x) => typeof x === 'string');
    const nguCanh = tuNguCanh({ thuongHieu: json?.thuongHieu || p?.thuongHieu, tenHang, model: modelDung, tenKhac });
    const urlLlm = new Set(nguonLlm.map((n) => String(n?.url || '').trim()).filter(Boolean));
    const urlWeb = new Set((web?.ketQua || []).map((k) => k.url));
    const nguonWeb = (web?.ketQua || []).filter((k) => !urlLlm.has(k.url) && khopModel(modelDung, [k.tieuDe, k.doanTrich], nguCanh))
      .map((k) => ({ loai: 'phu', url: k.url, trich: k.doanTrich.slice(0, 200), retrievedAt: ngayHomNay, tu: 'TIM_WEB' }));
    // Hàng xác minh có trần 5: nguồn LLM trích từ kết quả tìm kiếm (URL thật) đi trước, rồi kết quả tìm kiếm, rồi URL LLM tự nhớ.
    const hangXacMinh = [...nguonLlm.filter((n) => n?.url && urlWeb.has(String(n.url).trim())), ...nguonWeb, ...nguonLlm.filter((n) => n?.url && !urlWeb.has(String(n.url).trim()))].slice(0, 5);
    // #334 P0: MÁY MỞ LẠI từng nguồn — chỉ nguồn qua kiểm chứng (200 + trích/model có mặt)
    // mới được tính vào tam giác. Nguồn LLM tự nhớ mà chưa mở được → nhãn CHUA_XAC_MINH.
    let xacMinhKetQua = [];
    try { xacMinhKetQua = await xacMinhNhieu(hangXacMinh, modelDung, opts.fetchImpl, { nguCanh }); } catch { /* lỗi → mọi nguồn CHUA_XAC_MINH */ }
    const xacMinhOk = new Map(xacMinhKetQua.filter((x) => x.xacMinhOk).map((x) => [String(x.url).trim(), x]));
    const llmDaKiem = nguonLlm.filter((n) => xacMinhOk.has(String(n?.url).trim()));
    const nguonChuaKiem = nguonLlm.filter((n) => n?.url && !xacMinhOk.has(String(n.url).trim()));
    // Nguồn từ máy tìm kiếm chỉ được giữ khi NỘI DUNG TRANG mở lại có model chuẩn hoá (đoạn trích của máy tìm kiếm nhắc model
    // là chưa đủ); không đạt thì BỎ HẲN (LLM không hề đề xuất nó).
    const moiKetQua = new Map(xacMinhKetQua.map((x) => [String(x.url).trim(), x]));
    const doDaiModel = chiChuSo(modelDung).length;
    const trangCoModel = (n) => { const x = moiKetQua.get(String(n?.url).trim()); return Boolean(x && x.moDuoc && (x.modelChuanCoMat === true || (doDaiModel < 4 && x.modelCoMat === true))); };
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
    // Model NGẮN (2–5 ký tự chữ-số): trùng ngẫu nhiên rất nhiều ⇒ hai tên miền chỉ tính khi CẢ HAI trang qua luật khớp mới
    // (ranh giới từ + ngữ cảnh hàng). Câu trích khớp trên một trang nói về thứ khác trùng mã không còn đủ để lên CORROBORATED.
    if (kiemChung.muc === 'CORROBORATED' && doDaiModel >= 2 && doDaiModel <= MODEL_NGAN) {
      const mienDat = new Set([...llmDaKiem, ...webDaKiem].filter(trangCoModel).map((n) => tenMien(n.url)).filter(Boolean));
      if (mienDat.size < 2) kiemChung = { ...kiemChung, muc: 'HYPOTHESIS' };
    }
    if (nguonChuaKiem.length) kiemChung.chiTiet.push(...nguonChuaKiem.map((n) => ({ ...n, xacMinh: 'CHUA_XAC_MINH' })));

    // ── Câu hỏi: có nhóm ⇒ theo SỔ TAY (+ PN6 đã duyệt), mỗi câu kèm căn cứ. Không có nhóm ⇒ đường lùi bảng chương. ──
    let questions = []; let thieuTruong = []; let loi = []; let canCuCauHoi = chuong ? 'khong-co-khung' : 'chua-xac-dinh'; let cauHoiChuyenVien = [];
    const v = fr ? validateFrameInstance({ chuong, ...(nhom ? { nhom } : {}), truong, nguon: kiemChung.chiTiet }) : { thieu: [], loi: [] };
    loi = v.loi;
    if (nhom) {
      try {
        const kq = cauHoiTheoSoTay({ nhom, pn6, hoSo, truong, nguonDaKiem: [...llmDaKiem, ...webDaKiem], traLoiPb, frNhom, fr });
        questions = kq.questions; thieuTruong = kq.thieuTruong; cauHoiChuyenVien = kq.cauHoiChuyenVien; canCuCauHoi = 'so-tay';
      } catch { nhom = null; pn6 = null; delete frame.nhom; delete frame.pn6; } // sổ tay hỏng ⇒ rơi về bảng chương bên dưới, frame không còn mang nhóm
    }
    if (!nhom && fr) {
      thieuTruong = v.thieu; canCuCauHoi = 'bang-chuong';
      questions = v.thieu.map((k) => { const t = fr.truong.find((x) => x.key === k); return { key: k, questionVi: `Cần '${t?.labelVi || k}' để định danh hàng (khung chương ${fr.chuong}).`, canCu: t?.goc === 'BUOC12' ? 'khung-dinh-danh' : 'bang-chuong' }; });
    }
    const chuaXacDinh = !chuong;
    if (chuaXacDinh) questions = [{ key: 'loaiHang', questionVi: 'Chưa xác định được đây là hàng gì từ tên/mã đã cho. Hàng này là gì và dùng để làm gì?', canCu: 'chua-xac-dinh' }];
    return {
      frame, xacMinh: { muc: kiemChung.muc, mien: kiemChung.mien, nguon: kiemChung.chiTiet },
      thieuTruong, loi, questions,
      anh: anh.vanBan.length ? { vanBan: anh.vanBan } : null, anhBoVi: anh.boVi,
      goiYChuong: ungVien, xacMinhKetQua,
      // Trường MỚI (chỉ thêm): căn cứ của bộ câu hỏi + nhóm ứng viên + nguồn bị chặn.
      canCuCauHoi,
      ...(chuaXacDinh ? { chuaXacDinh: true } : {}),
      ...(nhomLlm && frame.nhom ? { nhomUngVien: { nhom: frame.nhom, ...(pn6 ? { pn6 } : {}), nguonSoTay: `Sổ tay HS nhóm ${frame.nhom}${soTayNhom?.phienBan ? ` (${soTayNhom.phienBan})` : ''}`, ...(kiemRanhGioi ? { kiemRanhGioi } : {}) } } : {}),
      ...(cauHoiChuyenVien.length ? { cauHoiChuyenVien } : {}),
      ...(biChan.length ? { nguonBiChan: biChan } : {}),
      // Trường TUỲ CHỌN, chỉ có khi bước 0 có kết quả — chỉ số đo, không nội dung.
      ...(web ? { timWeb: { soCau: web.soCau, soKetQua: web.ketQua.length, soNguonThem: webDaKiem.length, ...(web.soBiChan ? { soBiChan: web.soBiChan } : {}), ms: web.ms, quaHan: web.quaHan } } : {}),
      ms: Date.now() - t0,
    };
  } catch (e) {
    return { degraded: true, llmError: llmErrorInfo(e), hoSo: hoSo.slice(0, 400), anhBoVi: anh.boVi, questions: [], ms: Date.now() - t0 };
  }
}

module.exports = { identify, docAnhNameplate, safeImageUrl, soTayBat };
