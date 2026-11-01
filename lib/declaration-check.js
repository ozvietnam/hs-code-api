/**
 * Soát tờ khai nháp — `POST /api/declaration-check` (#338, job H2; thiết kế ozplugin "soát tờ khai và giải trình" mục 4).
 *
 * Nhận các dòng hàng ĐÃ BỎ ĐỊNH DANH (hợp đồng SoatToKhaiInput của Cổng OZ), trả `KetQuaSoat`: mỗi dòng LUÔN có đủ
 * bảy nhóm kiểm K1–K7, mỗi mục có `trangThai` (DAT | CANH_BAO | LOI | CHUA_KIEM) + `basis` + `evidence[]` + `nguon[]`.
 *
 *   K1 Chất lượng mô tả (TT 39/2018)  lib/declaration-validator.js trên CHÍNH CÂU KHÁCH VIẾT (không gọi describe)
 *   K2 Mô tả ↔ mã HS                  chỉ khi `kiemMa: true`: đường lib/classify.js sẵn có, MỖI DÒNG MỘT LƯỢT, + gói căn cứ H1
 *                                     (lib/evidence-pack.js) cho dòng "Loại khác" / tiền lệ mô tả tương tự kết luận mã khác.
 *                                     Không có `kiemMa` → CHUA_KIEM, KHÔNG gọi LLM.
 *                                     L1-5e (#648): mã lát 1 có ranh giới duyệt + HS_HO_SO hiệu lực `on` (cheDoHieuLuc theo người
 *                                     gọi) ⇒ K2 = lib/ho-so/soat.js (CÓ/THIẾU/MÂU THUẪN theo hồ sơ, cauSuaDeXuat, khungNghiNgo); chỉ
 *                                     gọi classify khi còn ranh giới MAU_THUAN/CHUA_SO_HOA. `shadow` ⇒ đường cũ y nguyên + một dòng số
 *                                     đo. Tối đa CANH_BAO; HS_K2_LOI=on mới cho mục coCanCuTatDinh (RULE_TABLE|DETERMINISTIC) là LOI.
 *                                     Hợp đồng: docs/api/ho-so-contract.md mục 8.
 *   K3 Thuế suất khai ↔ biểu thuế     data/tax.json (MFN, thông thường, ACFTA theo xuất xứ — lib/acfta.js)
 *   K4 ACFTA / C/O mẫu E              lib/acfta.js (loại trừ "(-CN)", needsReview), xung đột xuất xứ (lib/origin-hints.js);
 *                                     chứng từ C/O → CHUA_KIEM (chưa nạp văn bản quy tắc xuất xứ ACFTA)
 *   K5 KTCN, giấy phép                chính sách theo mã (lib/tax-lookup.js), nhãn hiệu (lib/trademark-watch.js);
 *                                     theo bản chất hàng → CHUA_KIEM (#243/#322)
 *   K6 Trị giá                        luật tự suy từ chính dữ liệu khách; so giá tham chiếu → luôn CHUA_KIEM (Q5)
 *   K7 Hồ sơ kỹ thuật TT 85/2026      CHỈ qua lib/legal-basis.js (Điều 8, 9.1, 9.2.b khi có dấu hiệu tháo rời; 10.1.d)
 *
 * BẤT BIẾN
 *  - Nhóm/phần không chạy → `trangThai: 'CHUA_KIEM'` + `lyDoChuaKiem`. Không bao giờ bỏ im một nhóm.
 *  - Kết luận chỉ dựa HEURISTIC / LLM_ASSERTED tối đa là CANH_BAO (`chotTrangThai`).
 *  - Không gắn nhãn GIR-* (luật 6); không tự gõ điều khoản TT 85/2026 (luật 7a). girRulesApplied / canCuPhapLy của K2
 *    đi NGUYÊN VĂN từ classify.
 *  - Module không ghi gì xuống đĩa và không log mô tả hàng (X-OZ-Chia-Se, #261).
 */
const { taxData } = require('./data');
const { normalizeDeclaration, validateDeclaration } = require('./declaration-validator');
const { acftaForOrigin, parseAcfta, PARTY_CODES } = require('./acfta');
const { detectOrigin } = require('./origin-hints');
const { buildTaxLookup } = require('./tax-lookup');
const { checkTrademarkRisk } = require('./trademark-watch');
const { tariffInfo } = require('./data-freshness');
const legal = require('./legal-basis');
const soTay = require('./so-tay-runtime');
const { buildEvidencePack } = require('./evidence-pack');
const { withPrivateData } = require('./llm-privacy');
const { withUsage } = require('./usage-context');
const HSAPI = require('./ho-so/api');
const HSI = require('./ho-so/index');
const { soat } = require('./ho-so/soat');

const PHIEN_BAN_BO_KIEM = 'declaration-check@2026-10-17';
const SO_DONG_TOI_DA = 50;
const NHOM = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7'];
const ECUS_MAX = 200;

const text = (v) => String(v == null ? '' : v).trim();
function safe(fn, fallback) { try { return fn(); } catch { return fallback; } }
const src = (duongDan, extra = {}) => ({ backend: 'hs-code-api', duongDan, ...extra });

/** Mục kiểm. Kết luận chỉ dựa HEURISTIC/LLM_ASSERTED không được là LOI → hạ CANH_BAO. */
function muc(nhom, trangThai, ma, noiDung, { basis = 'DETERMINISTIC', evidence = [], nguon, goiYSua, lyDoChuaKiem, ...extra } = {}) {
  let tt = trangThai;
  if (tt === 'LOI' && (basis === 'HEURISTIC' || basis === 'LLM_ASSERTED')) tt = 'CANH_BAO';
  return {
    nhom, trangThai: tt, ma, noiDung,
    ...(goiYSua ? { goiYSua } : {}),
    basis,
    evidence: evidence.filter((e) => text(e)).map(String),
    nguon: nguon && nguon.length ? nguon : [src('lib/declaration-check.js', { phienBan: PHIEN_BAN_BO_KIEM })],
    ...(tt === 'CHUA_KIEM' ? { lyDoChuaKiem: lyDoChuaKiem || noiDung } : {}),
    ...extra,
  };
}
const chuaKiem = (nhom, ma, lyDo, { noiDung, ...opts } = {}) => muc(nhom, 'CHUA_KIEM', ma, noiDung || lyDo, { ...opts, lyDoChuaKiem: lyDo });

// ── Kiểm đầu vào: đúng hợp đồng SoatToKhaiInput (+ kiemMa?: true, maLuotSoat?: uuid; dòng + hoSoId?, duKien? — L1-5e), `.strict()` ở mọi tầng ───────────────
const TOP_KEYS = new Set(['ngayDuKienDangKy', 'loaiHinh', 'dongHang', 'kiemMa', 'maLuotSoat']);
const LINE_KEYS = new Set(['stt', 'maHs', 'moTa', 'xuatXu', 'donViTinh', 'soLuong', 'triGia', 'thueSuatKhai', 'coFormE', 'giayPhepCo', 'thongSo', 'hoSoId', 'duKien']);
const SO_DU_KIEN_TOI_DA = 50;
const TRI_GIA_KEYS = new Set(['soTien', 'tienTe', 'dieuKien']);
const THUE_KEYS = new Set(['nk', 'loai']);
const LOAI_THUE = new Set(['MFN', 'ACFTA', 'THONG_THUONG']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const vang = (v) => v === undefined || v === null; // client MCP hay gửi null cho trường tuỳ chọn: coi như vắng

function ngayCoThat(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
const chuoiTrim = (v, max) => typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= max;

function validateDeclarationCheckInput(body) {
  const loi = [];
  if (!isObj(body)) return { ok: false, loi: ['Body phải là object JSON { dongHang: [...] }.'] };
  for (const k of Object.keys(body)) if (!TOP_KEYS.has(k)) loi.push(`Trường không được phép: ${k}`);
  if (!vang(body.ngayDuKienDangKy) && !ngayCoThat(body.ngayDuKienDangKy)) loi.push('ngayDuKienDangKy phải là ngày có thật dạng YYYY-MM-DD.');
  if (!vang(body.loaiHinh) && !chuoiTrim(body.loaiHinh, 10)) loi.push('loaiHinh (tuỳ chọn) là chuỗi 1–10 ký tự.');
  if (body.kiemMa !== undefined && body.kiemMa !== true) loi.push('kiemMa chỉ nhận giá trị true (bỏ trường này nếu không kiểm mã).');
  if (!vang(body.maLuotSoat) && !(typeof body.maLuotSoat === 'string' && UUID.test(body.maLuotSoat))) loi.push('maLuotSoat (tuỳ chọn) phải là uuid.');
  const dh = body.dongHang;
  if (!Array.isArray(dh) || dh.length < 1 || dh.length > SO_DONG_TOI_DA) {
    loi.push(`dongHang phải là mảng 1–${SO_DONG_TOI_DA} dòng.`);
  } else {
    dh.forEach((d, i) => {
      const p = `dongHang[${i}]`;
      if (!isObj(d)) { loi.push(`${p} phải là object.`); return; }
      for (const k of Object.keys(d)) if (!LINE_KEYS.has(k)) loi.push(`${p}: trường không được phép: ${k}`);
      if (!Number.isInteger(d.stt) || d.stt <= 0) loi.push(`${p}.stt phải là số nguyên dương.`);
      if (typeof d.maHs !== 'string' || !/^\d{8}$/.test(d.maHs)) loi.push(`${p}.maHs phải là chuỗi đúng 8 chữ số.`);
      if (!chuoiTrim(d.moTa, 2000)) loi.push(`${p}.moTa phải là chuỗi 1–2000 ký tự.`);
      if (typeof d.xuatXu !== 'string' || !/^[A-Z]{2}$/.test(d.xuatXu)) loi.push(`${p}.xuatXu là mã ISO 2 chữ hoa, ví dụ CN.`);
      if (!vang(d.donViTinh) && !chuoiTrim(d.donViTinh, 30)) loi.push(`${p}.donViTinh là chuỗi 1–30 ký tự.`);
      if (!vang(d.soLuong) && !(typeof d.soLuong === 'number' && Number.isFinite(d.soLuong) && d.soLuong >= 0)) loi.push(`${p}.soLuong là số không âm.`);
      if (!vang(d.triGia)) {
        const t = d.triGia;
        if (!isObj(t)) loi.push(`${p}.triGia phải là object.`);
        else {
          for (const k of Object.keys(t)) if (!TRI_GIA_KEYS.has(k)) loi.push(`${p}.triGia: trường không được phép: ${k}`);
          if (typeof t.soTien !== 'string' || !/^\d+(\.\d+)?$/.test(t.soTien)) loi.push(`${p}.triGia.soTien phải là chuỗi số, ví dụ "1200.50".`);
          if (typeof t.tienTe !== 'string' || !/^[A-Z]{3}$/.test(t.tienTe)) loi.push(`${p}.triGia.tienTe là mã ISO 4217, ví dụ USD.`);
          if (!vang(t.dieuKien) && !chuoiTrim(t.dieuKien, 20)) loi.push(`${p}.triGia.dieuKien là chuỗi 1–20 ký tự.`);
        }
      }
      if (!vang(d.thueSuatKhai)) {
        const t = d.thueSuatKhai;
        if (!isObj(t)) loi.push(`${p}.thueSuatKhai phải là object.`);
        else {
          for (const k of Object.keys(t)) if (!THUE_KEYS.has(k)) loi.push(`${p}.thueSuatKhai: trường không được phép: ${k}`);
          if (!vang(t.nk) && !chuoiTrim(t.nk, 20)) loi.push(`${p}.thueSuatKhai.nk là chuỗi 1–20 ký tự.`);
          if (!vang(t.loai) && !LOAI_THUE.has(t.loai)) loi.push(`${p}.thueSuatKhai.loai là MFN | ACFTA | THONG_THUONG.`);
        }
      }
      if (!vang(d.coFormE) && typeof d.coFormE !== 'boolean') loi.push(`${p}.coFormE là true/false.`);
      if (!vang(d.giayPhepCo) && !(Array.isArray(d.giayPhepCo) && d.giayPhepCo.length <= 20 && d.giayPhepCo.every((g) => chuoiTrim(g, 200)))) loi.push(`${p}.giayPhepCo là mảng tối đa 20 chuỗi 1–200 ký tự.`);
      if (!vang(d.thongSo) && !(typeof d.thongSo === 'string' && d.thongSo.length <= 2000)) loi.push(`${p}.thongSo là chuỗi tối đa 2000 ký tự.`);
      // L1-5e: hồ sơ của lượt phân loại trước (Cổng gửi theo maLuotPhanLoai) — chỉ hoSoId + duKien, KHÔNG nhận hồ sơ (§8.1)
      if (!vang(d.hoSoId) && !(typeof d.hoSoId === 'string' && UUID.test(d.hoSoId))) loi.push(`${p}.hoSoId (tuỳ chọn) phải là uuid.`);
      if (!vang(d.duKien) && !(Array.isArray(d.duKien) && d.duKien.length <= SO_DU_KIEN_TOI_DA && d.duKien.every((x) => isObj(x) && chuoiTrim(x.fact, 64)))) loi.push(`${p}.duKien (tuỳ chọn) là mảng tối đa ${SO_DU_KIEN_TOI_DA} mục {fact, giaTri, donVi?, nguon?, bangChung?}.`);
    });
  }
  if (loi.length) return { ok: false, loi };
  const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => !vang(v)));
  return {
    ok: true,
    data: {
      ...clean({ ngayDuKienDangKy: body.ngayDuKienDangKy, loaiHinh: body.loaiHinh ? body.loaiHinh.trim() : body.loaiHinh, maLuotSoat: body.maLuotSoat }),
      kiemMa: body.kiemMa === true,
      dongHang: dh.map((d) => clean({
        ...d,
        moTa: d.moTa.trim(),
        donViTinh: typeof d.donViTinh === 'string' ? d.donViTinh.trim() : d.donViTinh,
        triGia: isObj(d.triGia) ? clean(d.triGia) : d.triGia,
        thueSuatKhai: isObj(d.thueSuatKhai) ? clean(d.thueSuatKhai) : d.thueSuatKhai,
      })),
    },
  };
}

// ── K1: TT 39/2018 trên câu khách viết ────────────────────────────────────────────────────────────────────────────────────
// Căn cứ chỉ tiêu 1.78 qua lib/legal-basis.js (luật 7a) — trước đây gõ tay "TT 39/2018 … Phụ lục I" (sai phụ lục, #548).
const NGUON_TT39 = src('lib/declaration-validator.js#validateDeclaration', { phienBan: `${legal.citeChiTieu('1.78.1').tham_chieu}; CV 5189/TCHQ-GSQL (2019); CV 755/TCHQ-GSQL (2020)` });
// Mã cảnh báo của bộ chấm → mức kết luận. Chỉ luật khớp CHỮ chắc chắn (từ cấm CV 5189, chữ Hán) mới được là LOI.
const K1_MAP = {
  TOO_GENERIC: ['LOI', 'DETERMINISTIC', 'Bỏ từ mơ hồ, ghi tên thương mại + chất liệu/công dụng/model cụ thể.'],
  CJK_IN_DECLARATION: ['LOI', 'DETERMINISTIC', 'Dịch toàn bộ sang tiếng Việt; nhãn hiệu ghi bằng chữ Latin như trên bao bì.'],
  ORIGIN_MISSING: ['LOI', 'DETERMINISTIC'],
  ORIGIN_INVALID: ['CANH_BAO', 'DETERMINISTIC'],
  UNIT_MISSING: ['CANH_BAO', 'DETERMINISTIC', 'Bổ sung đơn vị tính theo danh mục đơn vị của Hải quan.'],
  ABBREVIATION_UNCLEAR: ['CANH_BAO', 'HEURISTIC', 'Viết đầy đủ, không dùng chữ viết tắt khó hiểu.'],
  LOCAL_DIALECT: ['CANH_BAO', 'HEURISTIC', 'Dùng tên gọi phổ thông của hàng hoá.'],
  VAGUE_QUANTITY: ['CANH_BAO', 'HEURISTIC'],
  WRONG_CONDITION: ['CANH_BAO', 'HEURISTIC', 'Mô tả có chữ "cũ/đã qua sử dụng": khai đúng tình trạng hàng (và kiểm chính sách hàng đã qua sử dụng).'],
  MISSING_SPEC: ['CANH_BAO', 'HEURISTIC', 'Máy móc, thiết bị điện nên ghi ít nhất một thông số (công suất, điện áp, model…).'],
  MISSING_MATERIAL: ['CANH_BAO', 'HEURISTIC', 'Ghi rõ chất liệu/thành phần.'],
};
// Không trình thành mục riêng (vẫn có trong bảng điểm trừ ở evidence): CONDITION_DEFAULTED (hợp đồng không có ô tình
// trạng), MISMATCH_HS (mô tả ↔ mã là việc của K2), LENGTH_EXCEEDED (đo trên câu máy ghép; K1 tự đo câu khách viết ở
// VUOT_DO_DAI_ECUS), NO_CHAPTER_CHECKLIST (thông tin), MIXED_LANGUAGE (coi mọi từ Latin ≥ 4 chữ là tiếng Anh — báo oan trên câu
// tự do), ORIGIN_CONFLICT (K4 trình), UNIT_MISSING/UNIT_AMBIGUOUS của bộ chấm (K1 tự kiểm ô ĐVT của dòng, mục UNIT_MISSING riêng).
const K1_BO_QUA = new Set(['CONDITION_DEFAULTED', 'MISMATCH_HS', 'LENGTH_EXCEEDED', 'NO_CHAPTER_CHECKLIST', 'MIXED_LANGUAGE', 'ORIGIN_CONFLICT', 'UNIT_MISSING', 'UNIT_AMBIGUOUS']);
// Ngưỡng "đạt" của K1: dưới mức GOOD thì không được dán nhãn "không thấy lỗi" (#725 lỗi 9).
const K1_DIEM_DAT = 75;

/**
 * Một cách chấm cho MỘT dòng (#725 lỗi 22): K1 dựng declaration + context ĐÚNG như /api/describe dựng ở chế độ dự phòng từ
 * cùng câu (tên hàng = câu khách viết, ĐVT của dòng hoặc ĐVT biểu thuế, tên dòng biểu thuế để so khớp) rồi gọi cùng
 * validateDeclaration — nên điểm K1 trùng điểm describe cho cùng câu.
 */
function chamCauKhai(d) {
  const moTa = d.moTa;
  let tariffNameVi = null; let unitVi = null;
  const row = taxData[d.maHs];
  if (row) {
    tariffNameVi = row.vn || null;
    unitVi = safe(() => require('./tax-mapper').mapTaxRecord(row).unitVi, null);
  }
  const context = { productName: moTa, sourceText: moTa, origin: d.xuatXu, tariffNameVi, unitVi, technicalSpec: text(d.thongSo) ? d.thongSo : null, composeOpts: { keepSpecs: ['84', '85'].includes(d.maHs.slice(0, 2)) } };
  const decl = normalizeDeclaration({ tenHang: moTa, xuatXu: d.xuatXu, ...(text(d.donViTinh) ? { donViTinh: d.donViTinh } : {}), thongSoKyThuat: text(d.thongSo) ? [d.thongSo] : [] }, context);
  return { decl, v: validateDeclaration(decl, d.maHs, context) };
}

function kiemK1(d) {
  const moTa = d.moTa;
  const { v } = chamCauKhai(d);
  const bangTru = (v.diemTru || []).map((x) => `${x.ma} −${x.diem}`).join(', ');
  const evDiem = `điểm bộ chấm ${v.score}/100 (${v.level})${bangTru ? `; trừ: ${bangTru}` : ''}`;
  const out = [];
  const seen = new Set();
  const nhomThieu = [];
  const thongTin = [];
  for (const w of v.warnings) {
    if (K1_BO_QUA.has(w.code) || seen.has(w.code)) continue;
    if (w.severity === 'info') { thongTin.push(`${w.code}: ${w.message}`); continue; }
    const map = K1_MAP[w.code];
    if (!map) {
      if (/^MISSING_/.test(w.code)) { nhomThieu.push(w); seen.add(w.code); }
      continue;
    }
    seen.add(w.code);
    const [tt, basis, goiY] = map;
    out.push(muc('K1', tt, w.code, w.message, { basis, evidence: [`Câu khai (${moTa.length} ký tự) — ${w.code}${w.field ? ` ở ${w.field}` : ''}`], nguon: [NGUON_TT39], goiYSua: w.suggestion || goiY }));
  }
  if (nhomThieu.length) {
    const daCo = Object.entries(v.chapterFields?.giaTri || {}).map(([k, g]) => `${k}: "${g}"`);
    out.push(muc('K1', 'CANH_BAO', 'THIEU_THONG_SO_THEO_NHOM', `Mô tả nên có thêm thông số đặc thù của nhóm hàng: ${nhomThieu.map((w) => w.message.replace(/^.*thiếu\s*/i, '')).join('; ')}.`, {
      basis: 'HEURISTIC',
      evidence: [...nhomThieu.map((w) => `${w.code}: ${w.message}`), ...(daCo.length ? [`đã đọc được: ${daCo.join('; ')}`] : [])],
      nguon: [NGUON_TT39, src('data/heading-declaration-fields.json'), src('data/chapter-declaration-fields.json')],
      goiYSua: nhomThieu.map((w) => w.suggestion).filter(Boolean).slice(0, 4).join(' | ') || undefined,
    }));
  }
  if (!text(d.donViTinh)) {
    const goiY = v.warnings.find((w) => w.code === 'UNIT_AMBIGUOUS');
    out.push(muc('K1', 'CANH_BAO', 'UNIT_MISSING', 'Dòng chưa ghi đơn vị tính.', { evidence: [goiY ? goiY.message : 'donViTinh: không ghi'], nguon: [NGUON_TT39], goiYSua: goiY ? goiY.suggestion : 'Bổ sung đơn vị tính theo danh mục đơn vị của Hải quan.' }));
  }
  if (moTa.length > ECUS_MAX) {
    out.push(muc('K1', 'CANH_BAO', 'VUOT_DO_DAI_ECUS', `Mô tả dài ${moTa.length} ký tự, vượt ${ECUS_MAX} ký tự của ô mô tả ECUS: phần cuối có thể bị cắt.`, { evidence: [`độ dài ${moTa.length}`], nguon: [NGUON_TT39], goiYSua: 'Rút gọn, giữ tên hàng, chất liệu/công dụng, model, xuất xứ.' }));
  }
  if (!out.length) {
    if (v.score >= K1_DIEM_DAT) {
      out.push(muc('K1', 'DAT', 'MO_TA_DAT_TT39', 'Bộ chấm mô tả (chỉ tiêu 1.78 mẫu số 01; CV 5189, CV 755) không thấy lỗi trong câu khai.', { evidence: [evDiem, ...thongTin.slice(0, 3)], nguon: [NGUON_TT39] }));
    } else {
      // Điểm thấp mà không có mục nào ở trên: điểm bị trừ ở các mã không trình thành mục riêng → nói rõ, không dán nhãn "đạt".
      out.push(muc('K1', 'CANH_BAO', 'DIEM_MO_TA_THAP', `Điểm mô tả ${v.score}/100 (${v.level}) dưới mức đạt ${K1_DIEM_DAT}: xem bảng điểm trừ.`, { basis: 'HEURISTIC', evidence: [evDiem, ...thongTin.slice(0, 3)], nguon: [NGUON_TT39], goiYSua: 'Bổ sung thông số phân biệt mã (chất liệu, công dụng, model, kích thước…) và kiểm lại mã.' }));
    }
  } else {
    out[0].evidence.push(evDiem);
  }
  for (const m of out) { m.diem = v.score; m.mucDiem = v.level; }
  return out;
}

// ── K2 không kiemMa ───────────────────────────────────────────────────────────────────────────────────────────────────────
const LY_DO_K2 = 'Kiểm mô tả ↔ mã HS bằng AI là công cụ riêng có thu phí (kiem_ma_to_khai, gửi kiemMa: true). Lượt này không gọi AI.';
const k2ChuaKiem = () => [chuaKiem('K2', 'CHUA_KIEM_MA', LY_DO_K2, { noiDung: 'Chưa kiểm mã HS khai có khớp mô tả không.' })];

// ── K3: thuế suất khai ↔ biểu thuế ────────────────────────────────────────────────────────────────────────────────────────
function rate(v) {
  const s = text(v).replace(/%/g, '').replace(',', '.').trim();
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}
const NGUON_BIEU = (hs, ver) => src(`data/tax.json#${hs}`, { phienBan: ver });

function kiemK3(d, row, ctx) {
  const ver = ctx.phienBanBieuThue;
  if (!row) {
    return [muc('K3', 'LOI', 'MA_KHONG_CO_TRONG_BIEU', `Mã ${d.maHs} không có trong biểu thuế đang giữ (hiệu lực ${ver}).`, { basis: 'RULE_TABLE', evidence: [`maHs ${d.maHs}`], nguon: [src('data/tax.json', { phienBan: ver })], goiYSua: 'Kiểm lại mã 8 số theo Danh mục hàng hoá XNK Việt Nam hiện hành.' })];
  }
  const ts = d.thueSuatKhai;
  if (!ts || vang(ts.nk)) return [chuaKiem('K3', 'KHONG_KHAI_THUE_SUAT', 'Dòng không có thuế suất nhập khẩu khai (thueSuatKhai.nk) nên không có gì để so với biểu thuế.', { nguon: [NGUON_BIEU(d.maHs, ver)] })];
  const nk = rate(ts.nk);
  if (nk === null) return [muc('K3', 'CANH_BAO', 'THUE_SUAT_KHAI_KHONG_DOC_DUOC', `Thuế suất khai "${ts.nk}" không phải con số nên không so được với biểu.`, { evidence: [`nk khai: ${ts.nk}`], nguon: [NGUON_BIEU(d.maHs, ver)], goiYSua: 'Ghi thuế suất dạng số phần trăm, ví dụ "5".' })];
  const mfn = rate(row.mfn); const tt = rate(row.tt);
  const ac = row.acfta ? acftaForOrigin(row.acfta, d.xuatXu, row.mfn) : null;
  const ev = [`biểu: MFN ${text(row.mfn) || '∅'}, thông thường ${text(row.tt) || '∅'}, ACFTA "${text(row.acfta) || '∅'}"`, `khai: ${ts.loai || 'không ghi loại'} ${ts.nk}%`, `xuất xứ ${d.xuatXu}`];
  const nguon = [NGUON_BIEU(d.maHs, ver), ...(ts.loai === 'ACFTA' ? [src('lib/acfta.js#acftaForOrigin')] : [])];
  const lech = (ma, msg, goiY) => muc('K3', ctx.namLech ? 'CANH_BAO' : 'LOI', ma, ctx.namLech ? `${msg} (Ngày đăng ký dự kiến khác năm của biểu đang giữ: đối chiếu lại biểu có hiệu lực tại ngày đăng ký.)` : msg, { basis: 'RULE_TABLE', evidence: ev, nguon, goiYSua: goiY });
  const khop = (msg) => muc('K3', 'DAT', 'THUE_SUAT_KHOP_BIEU', msg, { basis: 'RULE_TABLE', evidence: ev, nguon });
  let bieu = null; let ten = '';
  if (ts.loai === 'MFN') { bieu = mfn; ten = 'MFN (ưu đãi)'; }
  else if (ts.loai === 'THONG_THUONG') { bieu = tt; ten = 'thông thường'; }
  else if (ts.loai === 'ACFTA') {
    if (!ac) return [chuaKiem('K3', 'KHONG_CO_DU_LIEU_ACFTA', `Biểu đang giữ không có dữ liệu ACFTA cho mã ${d.maHs}.`, { nguon })];
    if (ac.eligible === null) return [muc('K3', 'CANH_BAO', 'ACFTA_CAN_TRA_DONG_10_SO', ac.noteVi, { evidence: ev, nguon })];
    if (ac.eligible === false) { bieu = mfn; ten = `MFN (hàng xuất xứ ${d.xuatXu} không được hưởng ACFTA: ${ac.noteVi})`; }
    else { bieu = ac.rate; ten = 'ACFTA'; }
  } else {
    const cand = [[mfn, 'MFN'], [tt, 'thông thường'], ...(ac?.eligible ? [[ac.rate, 'ACFTA']] : [])].filter(([r]) => r !== null);
    const hit = cand.find(([r]) => Math.abs(r - nk) < 1e-9);
    if (hit) return [khop(`Thuế suất khai ${ts.nk}% trùng mức ${hit[1]} của biểu (không ghi loại thuế suất).`)];
    return [muc('K3', 'CANH_BAO', 'THUE_SUAT_KHONG_KHOP_MUC_NAO', `Thuế suất khai ${ts.nk}% không trùng mức nào của biểu (${cand.map(([r, n]) => `${n} ${r}%`).join(', ') || 'không có mức số'}); dòng không ghi loại thuế suất nên không kết luận chắc.`, { evidence: ev, nguon, goiYSua: 'Ghi rõ loại thuế suất (MFN, ACFTA, thông thường) và đối chiếu biểu.' })];
  }
  if (bieu === null) return [muc('K3', 'CANH_BAO', 'MUC_BIEU_KHONG_DOC_DUOC', `Mức ${ten} trong biểu không phải con số đơn ("${ts.loai === 'THONG_THUONG' ? row.tt : row.mfn}") — đối chiếu biểu gốc.`, { evidence: ev, nguon })];
  if (Math.abs(bieu - nk) < 1e-9) return [khop(`Thuế suất khai ${ts.nk}% đúng mức ${ten} của biểu đang giữ.`)];
  return [lech('THUE_SUAT_KHAI_LECH_BIEU', `Thuế suất khai ${ts.nk}% khác mức ${ten} ${bieu}% của biểu đang giữ (hiệu lực ${ver}).`, `Sửa thuế suất về ${bieu}% hoặc kiểm lại mã/loại thuế suất.`)];
}

// ── K4: ACFTA / C/O mẫu E ─────────────────────────────────────────────────────────────────────────────────────────────────
function kiemK4(d, row, ctx) {
  const out = [];
  const ts = d.thueSuatKhai || {};
  const claim = ts.loai === 'ACFTA' || d.coFormE === true;
  const nguon = [NGUON_BIEU(d.maHs, ctx.phienBanBieuThue), src('lib/acfta.js#acftaForOrigin')];
  if (!row) {
    out.push(chuaKiem('K4', 'MA_KHONG_CO_TRONG_BIEU', `Mã ${d.maHs} không có trong biểu đang giữ nên không tra được ưu đãi ACFTA.`));
  } else {
    const parsed = parseAcfta(row.acfta);
    const ac = row.acfta ? acftaForOrigin(row.acfta, d.xuatXu, row.mfn) : null;
    const ev = [`ACFTA trong biểu: "${text(row.acfta) || '∅'}"`, `xuất xứ khai ${d.xuatXu}`, `MFN ${text(row.mfn) || '∅'}`, ...(ac ? [ac.noteVi] : [])];
    if (claim) {
      if (!ac) out.push(chuaKiem('K4', 'KHONG_CO_DU_LIEU_ACFTA', `Biểu đang giữ không có dữ liệu ACFTA cho mã ${d.maHs}.`, { nguon }));
      else if (!PARTY_CODES.includes(d.xuatXu)) out.push(muc('K4', 'LOI', 'XUAT_XU_KHONG_THUOC_ACFTA', `Xuất xứ ${d.xuatXu} không thuộc ACFTA: không dùng C/O mẫu E, không hưởng ưu đãi ACFTA.`, { basis: 'RULE_TABLE', evidence: ev, nguon, goiYSua: 'Khai thuế suất MFN (hoặc FTA phù hợp với xuất xứ thật).' }));
      else if (parsed?.available === false) out.push(muc('K4', 'LOI', 'DONG_KHONG_CO_UU_DAI_ACFTA', `Dòng ${d.maHs} không có ưu đãi ACFTA ("*").`, { basis: 'RULE_TABLE', evidence: ev, nguon, goiYSua: 'Khai thuế suất MFN.' }));
      else if (ac.eligible === false) out.push(muc('K4', 'LOI', d.xuatXu === 'CN' ? 'ACFTA_LOAI_TRU_CN' : 'ACFTA_LOAI_TRU_XUAT_XU', ac.noteVi, { basis: 'RULE_TABLE', evidence: ev, nguon, goiYSua: 'Khai thuế suất MFN; C/O mẫu E không giúp được dòng này.' }));
      else if (ac.eligible === null) out.push(muc('K4', 'CANH_BAO', 'ACFTA_CAN_TRA_DONG_10_SO', ac.noteVi, { basis: 'RULE_TABLE', evidence: ev, nguon }));
      else if (ac.higherThanMfn) out.push(muc('K4', 'CANH_BAO', 'ACFTA_CAO_HON_MFN', ac.noteVi, { basis: 'RULE_TABLE', evidence: ev, nguon, goiYSua: 'Khai MFN, không dùng C/O mẫu E.' }));
      else out.push(muc('K4', 'DAT', 'ACFTA_DUOC_HUONG', `Dòng có ưu đãi ACFTA ${ac.rate}% cho xuất xứ ${d.xuatXu} khi có C/O mẫu E hợp lệ.`, { basis: 'RULE_TABLE', evidence: ev, nguon }));
      if (ts.loai === 'ACFTA' && d.coFormE === false) out.push(muc('K4', 'LOI', 'KHAI_ACFTA_KHONG_CO_CO', 'Khai thuế suất ACFTA nhưng ghi không có C/O mẫu E: không đủ điều kiện hưởng ưu đãi.', { evidence: ['thueSuatKhai.loai = ACFTA', 'coFormE = false'], nguon, goiYSua: 'Có C/O mẫu E hợp lệ thì mới khai ACFTA; không có thì khai MFN.' }));
      else if (ts.loai === 'ACFTA' && d.coFormE === undefined) out.push(muc('K4', 'CANH_BAO', 'KHAI_ACFTA_CHUA_RO_CO', 'Khai thuế suất ACFTA nhưng chưa cho biết có C/O mẫu E không.', { evidence: ['thueSuatKhai.loai = ACFTA', 'coFormE: không ghi'], nguon, goiYSua: 'Chỉ khai ACFTA khi có C/O mẫu E hợp lệ.' }));
      out.push(chuaKiem('K4', 'CHUNG_TU_CO', 'Chứng từ C/O (khớp mã 6 số trên C/O, hoá đơn bên thứ ba, vận tải trực tiếp) chưa kiểm: chưa nạp văn bản quy tắc xuất xứ ACFTA.', { nguon }));
    } else if (ac && ac.eligible === true && !ac.higherThanMfn && rate(row.mfn) !== null && ac.rate < rate(row.mfn)) {
      out.push(muc('K4', 'DAT', 'CO_THE_HUONG_ACFTA', `Dòng không khai ACFTA. Biểu có ưu đãi ACFTA ${ac.rate}% (MFN ${row.mfn}%) cho xuất xứ ${d.xuatXu} nếu có C/O mẫu E hợp lệ.`, { basis: 'RULE_TABLE', evidence: ev, nguon, goiYSua: 'Cân nhắc xin C/O mẫu E để hưởng ACFTA.' }));
    } else {
      out.push(muc('K4', 'DAT', 'KHONG_KHAI_ACFTA', 'Dòng không khai ưu đãi ACFTA / C/O mẫu E.', { basis: 'RULE_TABLE', evidence: ev, nguon }));
    }
  }
  // Xung đột xuất xứ: nhận bằng từ khoá trong câu khai → HEURISTIC, tối đa CANH_BAO.
  const o = safe(() => detectOrigin([d.moTa, d.thongSo].filter(text).join(' ')), null);
  if (o && o.detectedOrigin && o.confidence === 'HIGH' && o.detectedOrigin !== d.xuatXu) {
    out.push(muc('K4', 'CANH_BAO', 'ORIGIN_CONFLICT', `Khai xuất xứ ${d.xuatXu} nhưng câu mô tả có dấu hiệu hàng sản xuất tại ${o.detectedOrigin} (${(o.evidence || []).join(', ')}).`, {
      basis: 'HEURISTIC', evidence: (o.evidence || []).map((e) => `từ khoá: ${e}`), nguon: [src('lib/origin-hints.js#detectOrigin')],
      goiYSua: 'Khai xuất xứ theo nước sản xuất thật; không dùng C/O mẫu E nếu hàng không có xuất xứ Trung Quốc/ASEAN.',
    }));
  }
  return out;
}

// ── K5: KTCN, giấy phép ───────────────────────────────────────────────────────────────────────────────────────────────────
function kiemK5(d, tax, ctx) {
  const out = [];
  const nguon = [src(`/api/tax?hs=${d.maHs}`, { phienBan: ctx.phienBanBieuThue })];
  if (!tax || !tax.found) {
    out.push(chuaKiem('K5', 'MA_KHONG_CO_TRONG_BIEU', `Mã ${d.maHs} không có trong biểu đang giữ nên không tra được chính sách theo mã.`, { nguon }));
  } else {
    const lines = Array.isArray(tax.policyLines) ? tax.policyLines : [];
    const blocking = lines.filter((l) => l.level === 'BLOCKING');
    const notice = lines.filter((l) => l.level === 'NOTICE');
    const procs = (tax.policyProcedures || []).map((p) => p.labelShort || p.label).filter(Boolean);
    const ev = [...blocking, ...notice].slice(0, 8).map((l) => `${l.level}: ${text(l.text).slice(0, 200)}`).concat(procs.length ? [`thủ tục: ${procs.join(', ')}`] : []);
    const gp = (d.giayPhepCo || []).filter(text);
    if (tax.policyStatus === 'RECORDED' && (blocking.length || tax.hasActionablePolicy)) {
      if (gp.length) {
        out.push(muc('K5', 'DAT', 'DA_KHAI_GIAY_PHEP', `Mã có nghĩa vụ quản lý chuyên ngành; khách ghi đã có: ${gp.join('; ')}. Máy không đối chiếu được chữ tự do — tự kiểm từng nghĩa vụ ở evidence.`, { basis: 'HEURISTIC', evidence: [...ev, `giayPhepCo: ${gp.length} mục`], nguon }));
      } else {
        out.push(muc('K5', 'CANH_BAO', 'CAN_KTCN_GIAY_PHEP', 'Mã có nghĩa vụ kiểm tra chuyên ngành / giấy phép theo dữ liệu chính sách, dòng chưa ghi giấy phép/KTCN đã có.', { evidence: ev, nguon, goiYSua: 'Chuẩn bị giấy phép / đăng ký kiểm tra chuyên ngành trước khi đăng ký tờ khai, hoặc xác nhận hàng không thuộc diện.' }));
      }
    } else if (tax.policyStatus === 'RECORDED') {
      out.push(muc('K5', 'DAT', notice.length ? 'CO_LUU_Y_CHINH_SACH' : 'CHI_CO_THONG_TIN_CHINH_SACH', notice.length ? 'Không thấy nghĩa vụ bắt buộc theo mã; có lưu ý chính sách cần đọc (evidence).' : 'Không thấy nghĩa vụ bắt buộc theo mã; chỉ có thông tin danh mục liên quan.', { evidence: ev.length ? ev : lines.slice(0, 4).map((l) => `${l.level}: ${text(l.text).slice(0, 200)}`), nguon }));
    } else if (tax.policyNoteSeverity === 'warning') {
      out.push(muc('K5', 'CANH_BAO', 'CHUA_GHI_NHAN_CHINH_SACH_CHUONG_RUI_RO', tax.policyNoteVi, { evidence: [`policyStatus ${tax.policyStatus}`], nguon }));
    } else {
      out.push(muc('K5', 'DAT', 'CHUA_GHI_NHAN_CHINH_SACH', tax.policyNoteVi || 'Dữ liệu chưa ghi nhận chính sách quản lý cho mã này — không có nghĩa là không có.', { evidence: [`policyStatus ${tax.policyStatus}`], nguon }));
    }
  }
  const tm = safe(() => checkTrademarkRisk({ text: [d.moTa, d.thongSo].filter(text).join(' '), hsCode: d.maHs, origin: d.xuatXu }), { matched: false });
  // Danh sách theo dõi khớp theo từ/cụm từ nên dễ trùng chữ thường ("hàn" → HAN): chỉ báo nhãn rủi ro cao hoặc đã đăng ký
  // giám sát hải quan, và không khác nhóm hàng đăng ký.
  const tmNang = (tm?.matched ? tm.matches || [] : []).filter((m) => (m.customsRecorded || ['HIGH', 'CRITICAL'].includes(m.riskLevel)) && m.classMatch !== false);
  if (tmNang.length) {
    out.push(muc('K5', 'CANH_BAO', 'NHAN_HIEU_DUOC_BAO_HO', `Mô tả có nhãn hiệu "${tmNang[0].mark}" có thể được bảo hộ${tmNang[0].customsRecorded ? ' và đã đăng ký giám sát tại hải quan' : ''}: nguy cơ tạm dừng thông quan nếu không chứng minh được quyền sử dụng nhãn.`, {
      basis: 'HEURISTIC',
      evidence: tmNang.slice(0, 3).map((m) => `nhãn "${m.mark}" — ${m.status || '?'}${m.appNo ? `, đơn ${m.appNo}` : ''}${m.customsRecorded ? ', đã đăng ký giám sát hải quan' : ''}, mức ${m.riskLevel}`),
      nguon: [src('lib/trademark-watch.js#checkTrademarkRisk', { phienBan: (tm.legalBasis || [])[0] })],
      goiYSua: (tmNang[0].recommendations || [])[0],
    }));
  }
  out.push(chuaKiem('K5', 'THEO_BAN_CHAT_HANG', 'Nghĩa vụ theo bản chất hàng (nâng người, tiền chất, tiếp xúc thực phẩm…) chưa kiểm: chờ hs-code-api #243/#322.'));
  return out;
}

// ── K6: trị giá (chỉ phần tự suy) ─────────────────────────────────────────────────────────────────────────────────────────
const INCOTERMS = new Set(['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'DAT', 'DAF', 'DES', 'DEQ', 'DDU', 'C&F', 'CNF']);
function kiemK6(d) {
  const out = [];
  const nguon = [src('lib/declaration-check.js#kiemK6', { phienBan: PHIEN_BAN_BO_KIEM })];
  const t = d.triGia;
  if (!t) {
    out.push(chuaKiem('K6', 'KHONG_CO_TRI_GIA', 'Dòng không có trị giá nên chưa kiểm phần tự suy (đơn giá, điều kiện giao hàng).', { nguon }));
  } else {
    const soTien = Number(t.soTien);
    const ev = [`trị giá ${t.soTien} ${t.tienTe}${t.dieuKien ? ` ${t.dieuKien}` : ''}`, ...(vang(d.soLuong) ? [] : [`số lượng ${d.soLuong}${d.donViTinh ? ` ${d.donViTinh}` : ''}`])];
    if (soTien === 0) out.push(muc('K6', 'CANH_BAO', 'TRI_GIA_BANG_0', 'Trị giá khai bằng 0. Hàng miễn phí (FOC) vẫn phải khai trị giá tính thuế.', { evidence: ev, nguon, goiYSua: 'Khai trị giá giao dịch thực tế hoặc trị giá xác định theo quy định trị giá hải quan.' }));
    if (!t.dieuKien) out.push(muc('K6', 'CANH_BAO', 'THIEU_DIEU_KIEN_GIAO_HANG', 'Trị giá chưa ghi điều kiện giao hàng (FOB, CIF…): không xác định được phí vận tải/bảo hiểm cần cộng.', { evidence: ev, nguon, goiYSua: 'Ghi điều kiện giao hàng theo Incoterms trên hợp đồng/hoá đơn.' }));
    else if (!INCOTERMS.has(t.dieuKien.toUpperCase())) out.push(muc('K6', 'CANH_BAO', 'DIEU_KIEN_GIAO_HANG_LA', `Điều kiện giao hàng "${t.dieuKien}" không phải mã Incoterms quen thuộc.`, { basis: 'HEURISTIC', evidence: ev, nguon }));
    if (!vang(d.soLuong)) {
      if (d.soLuong === 0 && soTien > 0) out.push(muc('K6', 'CANH_BAO', 'SO_LUONG_BANG_0', 'Số lượng bằng 0 nhưng có trị giá.', { evidence: ev, nguon }));
      else if (d.soLuong > 0 && soTien > 0) {
        const donGia = soTien / d.soLuong;
        ev.push(`đơn giá ≈ ${Number(donGia.toPrecision(6))} ${t.tienTe}/${d.donViTinh || 'đơn vị'}`);
        if (donGia < 0.01) out.push(muc('K6', 'CANH_BAO', 'DON_GIA_BAT_THUONG', `Đơn giá ≈ ${Number(donGia.toPrecision(4))} ${t.tienTe} trên một đơn vị tính — thấp bất thường, kiểm lại số lượng/đơn vị tính.`, { basis: 'HEURISTIC', evidence: ev, nguon }));
      }
    }
    if (!out.length) out.push(muc('K6', 'DAT', 'TU_SUY_KHONG_THAY_BAT_THUONG', 'Phần tự suy từ dữ liệu khai (đơn giá, điều kiện giao hàng) không thấy bất thường.', { evidence: ev, nguon }));
  }
  out.push(chuaKiem('K6', 'SO_GIA_THAM_CHIEU', 'So với giá tham chiếu: hệ thống chưa có dữ liệu giá tham chiếu (Q5) nên luôn chưa kiểm.', { nguon }));
  return out;
}

// ── K7: hồ sơ kỹ thuật theo TT 85/2026 — CHỈ qua lib/legal-basis.js ───────────────────────────────────────────────────────
const NGUON_TT85 = src('lib/legal-basis.js', { phienBan: `${legal.TT85.soHieu} (${legal.TT85.congBao})` });
function kiemK7(d) {
  const out = [];
  const description = [d.moTa, d.thongSo].filter(text).join('. ');
  const hoSo = legal.canCuHoSo({ description });
  const thaoRoi = hoSo.muc.find((m) => m.canCu.includes('9.2.b'));
  const ch = d.maHs.slice(0, 2);
  const pick = (ids) => Object.fromEntries(ids.filter((id) => hoSo.dieuKhoan[id]).map((id) => [id, hoSo.dieuKhoan[id]]));
  if (thaoRoi && ['84', '85', '90'].includes(ch)) {
    out.push(muc('K7', 'CANH_BAO', 'CO_THE_PHAI_DANG_KY_DANH_MUC', thaoRoi.moTa, {
      basis: 'HEURISTIC', evidence: [`chương ${ch}`, 'mô tả có từ khoá hàng chưa lắp ráp/tháo rời'], nguon: [NGUON_TT85],
      goiYSua: 'Nếu nhập về nhiều chuyến: đăng ký Danh mục (kèm Phiếu theo dõi trừ lùi) trước khi đăng ký tờ khai lô đầu tiên.',
      dieuKhoan: pick(thaoRoi.canCu),
    }));
  } else {
    out.push(muc('K7', 'DAT', 'KHONG_THAY_DAU_HIEU_THAO_ROI', thaoRoi
      ? `Mô tả có từ khoá hàng chưa lắp ráp/tháo rời nhưng mã thuộc chương ${ch} (ngoài 84, 85, 90): xem ${legal.cite('8').tham_chieu} nếu là máy móc, thiết bị.`
      : 'Không thấy dấu hiệu máy móc chưa lắp ráp/tháo rời trong mô tả (nhận bằng từ khoá).', { basis: 'HEURISTIC', evidence: [`chương ${ch}`], nguon: [NGUON_TT85] }));
  }
  const ktk = hoSo.muc.find((m) => m.canCu.includes('10.1.d'));
  out.push(muc('K7', 'DAT', 'TAI_LIEU_KY_THUAT_KHI_LAY_MAU', ktk.moTa, {
    basis: ktk.basis, evidence: [`${legal.cite('10.1.d').tham_chieu}: chỉ áp khi cơ quan hải quan yêu cầu phân tích, phân loại`], nguon: [NGUON_TT85],
    goiYSua: 'Chuẩn bị sẵn catalogue / TDS / MSDS / bản phân tích thành phần cho hàng dễ bị lấy mẫu.',
    dieuKhoan: pick(['10.1.d']),
  }));
  return out;
}

// ── K2 với kiemMa: đường classify sẵn có + gói căn cứ H1 ──────────────────────────────────────────────────────────────────
/** Phần classify của K2 (đường cũ, dùng lại ở nhánh hồ sơ khi còn ranh giới MAU_THUAN / CHUA_SO_HOA): mục KHOP/KHAC_* + gói căn cứ. */
async function phanLoaiK2(d, ctx) {
  const out = [];
  const extra = {};
  const usage = [];
  const nguonCls = src('/api/classify', { phienBan: 'lib/classify.js' });
  let result = null; let loiCls = null;
  try {
    const attrs = { tenHang: d.moTa.slice(0, 500), chatLieu: null, congDung: null, chucNang: null, nameZh: null, specs: d.thongSo || null, facts: [], supplierHs: null };
    // require lúc gọi: dùng đúng export hiện hành của lib/classify.js (test spy được).
    const r = await withUsage(() => withPrivateData(() => require('./classify').classify(attrs, { tier: 'standard' })));
    result = r.result; usage.push(...r.usage);
  } catch (e) {
    loiCls = e; if (Array.isArray(e?.usage)) usage.push(...e.usage);
  }
  const results = Array.isArray(result?.results) ? result.results : [];
  const top = text(results[0]?.hs).replace(/\D/g, '');
  if (result) {
    if ('girRulesApplied' in result) extra.girRulesApplied = result.girRulesApplied;
    if ('canCuPhapLy' in result) extra.canCuPhapLy = result.canCuPhapLy;
    extra.ketQuaPhanLoai = { status: result.status || null, results: results.slice(0, 3).map((x) => ({ hs: x.hs, confidence: x.confidence ?? null })) };
  }
  // Gói căn cứ H1 cho mã khai (+ mã máy chọn nếu khác): "Loại khác", tiền lệ, cặp dễ nhầm. Không LLM.
  const maGoi = [d.maHs, ...(top.length === 8 && top !== d.maHs && taxData[top] ? [top] : [])];
  const pack = safe(() => buildEvidencePack({ maHs: maGoi, moTa: d.moTa, ...(d.thongSo ? { thongSo: d.thongSo } : {}) }), null);
  const goiKhai = pack?.goiCanCu?.[0];
  const goiMay = pack?.goiCanCu?.[1];
  const nguonGoi = src('/api/evidence-pack', { phienBan: pack?.phienBanGoiCanCu });

  if (loiCls) {
    const np = loiCls.code === 'NO_PRIVATE_LLM' || /NO_PRIVATE_LLM/.test(String(loiCls.message));
    out.push(chuaKiem('K2', np ? 'NO_PRIVATE_LLM' : 'LOI_PHAN_LOAI', np ? 'Không có nhà cung cấp AI hợp lệ cho dữ liệu khách (chế độ riêng tư) nên chưa kiểm được mã.' : 'Bước phân loại AI gặp lỗi nên chưa kiểm được mã; thử lại sau.', { nguon: [nguonCls] }));
  } else if (result.status === 'NEED_FACTS') {
    out.push(chuaKiem('K2', 'NEED_FACTS', 'Thiếu dữ kiện về hàng để phân loại chắc (NEED_FACTS): bổ sung dữ kiện rồi kiểm lại.', { nguon: [nguonCls], canBoSung: result.missing || [], ...(result.nextAction ? { nextAction: result.nextAction } : {}) }));
  } else if (!top) {
    out.push(chuaKiem('K2', 'KHONG_CO_UNG_VIEN', `Phân loại không ra mã ứng viên (trạng thái ${result.status || '?'}) nên chưa so được.`, { nguon: [nguonCls] }));
  } else {
    const basis = result.status === 'RESOLVED_BY_TABLE' ? 'RULE_TABLE' : 'LLM_ASSERTED';
    const ev = [`mã khai ${d.maHs}`, `mã hệ thống chọn ${top} (trạng thái ${result.status || '?'}${results[0]?.confidence != null ? `, độ tin ${results[0].confidence}` : ''})`];
    if (results[0]?.reason) ev.push(`lý do (AI): ${text(results[0].reason).slice(0, 200)}`);
    if (goiKhai?.capDeNham?.trangThai === 'CO_CAP_DE_NHAM') ev.push(`mã khai nằm trong bảng cặp dễ nhầm với: ${(goiKhai.capDeNham.confusedWith || []).join(', ')}`);
    if (goiMay?.tienLe?.trangThai === 'CO_TIEN_LE_KHOP') ev.push(`mã hệ thống chọn có ${goiMay.tienLe.items.length} tiền lệ: ${goiMay.tienLe.items.slice(0, 3).map((t) => `${t.soHieu || '?'} (${t.khop})`).join(', ')}`);
    if (top === d.maHs) {
      out.push(muc('K2', 'DAT', 'MA_KHOP', `Mã khai ${d.maHs} trùng mã hệ thống phân loại cho mô tả này.`, { basis, evidence: ev, nguon: [nguonCls] }));
    } else if (top.length < 8 && d.maHs.startsWith(top)) {
      out.push(muc('K2', 'DAT', `KHOP_CAP_${top.length}_SO`, `Hệ thống chỉ chốt được đến ${top.length} số (${top}); mã khai cùng nhánh.`, { basis, evidence: ev, nguon: [nguonCls] }));
    } else {
      const cap = top.slice(0, 4) !== d.maHs.slice(0, 4) ? 'KHAC_NHOM' : top.slice(0, 6) !== d.maHs.slice(0, 6) ? 'KHAC_PHAN_NHOM' : 'KHAC_DONG_8_SO';
      const ten = { KHAC_NHOM: 'khác nhóm 4 số', KHAC_PHAN_NHOM: 'cùng nhóm, khác phân nhóm 6 số', KHAC_DONG_8_SO: 'cùng phân nhóm, khác dòng 8 số' }[cap];
      // MVP: K2 tối đa CANH_BAO (kể cả khi bảng quyết định chốt) — kết luận phụ thuộc dữ kiện AI rút từ câu mô tả.
      out.push(muc('K2', 'CANH_BAO', cap, `Mã khai ${d.maHs} ${ten} so với mã hệ thống chọn ${top}. Xem lại mã trước khi truyền, hoặc chuẩn bị giải trình.`, { basis, evidence: ev, nguon: [nguonCls, nguonGoi], goiYSua: `Đối chiếu chú giải và tiền lệ của ${d.maHs} và ${top} (gói căn cứ /api/evidence-pack).` }));
      if (cap === 'KHAC_NHOM') ctx.goiY.add(`Dòng ${d.stt}: mã khai khác nhóm 4 số với mã hệ thống chọn.`);
      const a = rate(taxData[d.maHs]?.mfn); const b = rate(taxData[top]?.mfn);
      if (a !== null && b !== null && Math.abs(a - b) >= 5) ctx.goiY.add(`Dòng ${d.stt}: chênh lệch thuế MFN giữa mã khai (${a}%) và mã hệ thống chọn (${b}%) ≥ 5 điểm phần trăm.`);
    }
  }
  return { out, extra, usage, goiKhai, nguonGoi };
}

async function kiemK2(d, ctx) {
  const { out, extra, usage, goiKhai, nguonGoi } = await phanLoaiK2(d, ctx);
  const sanPham = { tenHang: d.moTa, specs: d.thongSo || null };
  // Dòng "Loại khác" mà mô tả khớp anh em có tên (máy nghi bằng từ khoá — so-tay-runtime#anhEmKhop).
  const khop = safe(() => soTay.anhEmKhop(d.maHs, sanPham), []);
  if (khop.length) {
    const lk = goiKhai?.loaiKhac;
    const tenAnhEm = (lk?.anhEmCoTen || []).filter((a) => khop.some((k) => k.hs === a.hs)).map((a) => `${a.hs} "${a.tenVi}"`);
    out.push(muc('K2', 'CANH_BAO', 'LOAI_KHAC_KHOP_ANH_EM', `Mã khai ${d.maHs} là dòng "Loại khác"; mô tả khớp tên dòng anh em có tên ${khop.map((k) => `${k.hs} "${k.tenVi}"`).join(', ')}. Phạm vi "Loại khác" = phạm vi tổ tiên có tên trừ mọi dòng có tên ở mọi tầng phủ định (không chỉ anh em cùng cha).`, {
      basis: 'HEURISTIC',
      evidence: [...khop.map((k) => `${k.hs} "${k.tenVi}" — ${k.viSao}`), ...tenAnhEm.map((s) => `tên dòng anh em (biểu thuế, nguyên văn): ${s}`), ...(lk?.cha ? [`dòng cha: ${lk.cha}`] : []), ...(lk?.toTienCoTen?.id && lk.toTienCoTen.id !== lk.cha ? [`tổ tiên có tên: ${lk.toTienCoTen.id}`] : [])],
      nguon: [src('lib/so-tay-runtime.js#anhEmKhop'), nguonGoi],
      goiYSua: 'Xem lại mã trước khi truyền, hoặc chuẩn bị hồ sơ cho thấy hàng không rơi vào dòng anh em có tên.',
    }));
  }
  // Tiền lệ có mô tả tương tự nhưng kết luận nhóm KHÁC (khớp từ vựng) — gói căn cứ H1.
  const nguoc = goiKhai?.tienLe?.tienLeMaKhac || [];
  if (nguoc.length) {
    out.push(muc('K2', 'CANH_BAO', 'TIEN_LE_MO_TA_TUONG_TU_MA_KHAC', `Có ${nguoc.length} tiền lệ mô tả tương tự nhưng kết luận nhóm khác mã khai.`, {
      basis: 'HEURISTIC',
      evidence: nguoc.map((t) => `${t.soHieu || '?'} → ${t.maKetLuan} (độ tương tự ${t.doTuongTu ?? '?'})${t.nguon ? ` ${t.nguon}` : ''}`),
      nguon: [nguonGoi], goiYSua: 'Đọc các tiền lệ này; cần giải trình vì sao hàng không giống.',
    }));
  }
  return { kiem: out, extra, usage };
}

// ── K2 theo hồ sơ phân loại (L1-5e; spec §8.5) — mã lát 1 khi HS_HO_SO hiệu lực = on ──────────────────────────────────
/** HS_K2_LOI=on (mặc định tắt): mục coCanCuTatDinh + basis RULE_TABLE|DETERMINISTIC được LOI. Chỉ bật sau L1-5f (báo oan ≤ 5 %). */
const k2LoiBat = () => ['on', 'true', '1'].includes(String(process.env.HS_K2_LOI || '').trim().toLowerCase());
const BASIS_LOI_K2 = new Set(['RULE_TABLE', 'DETERMINISTIC']);
const fmtMa = (m) => { const x = text(m).replace(/\D/g, ''); return x.length === 8 ? `${x.slice(0, 4)}.${x.slice(4, 6)}.${x.slice(6)}` : x; };
const phienBanHoSo = (h) => { const pb = (h && h.phienBan) || {}; return [pb.hoSo, pb.bieuThue && `biểu ${pb.bieuThue}`, pb.soTay && `sổ tay ${pb.soTay}`, pb.tuVung].filter(Boolean).join('; '); };

/** Mục K2 chính từ kết quả soat(): trạng thái theo ketLuan; mang các trường hồ sơ của hợp đồng (docs/api/ho-so-contract.md §8). */
function mucHoSoK2(d, s, ctx) {
  const h = s.hoSo || {};
  const kl = h.ketLuan || {};
  const nguon = [src('lib/ho-so/soat.js#soat', { phienBan: phienBanHoSo(h) })];
  const dq = s.duKienQuyetDinh || [];
  const ten = (k) => [...new Set(dq.filter((x) => x.ketQua === k).map((x) => x.nhanVi || x.fact))].join('; ');
  const evidence = dq.map((x) => `${x.ketQua} — ${x.nhanVi || x.fact} (ranh giới ${fmtMa(x.nut)}, ${x.chieu})${x.trich ? `: "${x.trich}"` : ''}`);
  const ds = (h.duongDiPhapLy || []).filter((e) => e && e.dieuKien && ['CO', 'THIEU', 'MAU_THUAN'].includes(e.ketQua));
  for (const e of ds) if (e.nguon && e.nguon.trich) evidence.push(`căn cứ ranh giới ${fmtMa(e.nut)} (${e.nguon.nguonLoai || '?'}, ${e.nguon.ma || '?'}): "${e.nguon.trich}"`);
  for (const t of h.tinHieuRuiRo || []) if (t && t.loai === 'CHENH_THUE') evidence.push(`chênh thuế MFN: ${t.maHs} ${t.mfnMaHs}% ↔ ${t.maKhac} ${t.mfnMaKhac}% (biểu thuế)`);
  const them = { coCanCuTatDinh: s.coCanCuTatDinh === true, duKienQuyetDinh: dq, cauSuaDeXuat: s.cauSuaDeXuat, khungNghiNgo: s.khungNghiNgo, hoSo: h, hoSoMeta: s.meta };
  const goiYSua = 'Xem cauSuaDeXuat (câu mô tả viết lại từ hồ sơ; bản nháp khi chưa đủ căn cứ) và duKienQuyetDinh.';
  switch (kl.trangThai) {
    case 'DU_CAN_CU':
      return muc('K2', 'DAT', 'HO_SO_DU_CAN_CU', `Mô tả khai thể hiện đủ dữ kiện quyết định của mã ${d.maHs} (${ds.length} ranh giới đã số hoá, trích nguyên văn).`, { basis: ds.every((e) => e.tatDinh !== false) ? 'RULE_TABLE' : 'LLM_ASSERTED', evidence, nguon, ...them });
    case 'MAU_THUAN': {
      const mt = ds.filter((e) => e.ketQua === 'MAU_THUAN');
      const basis = s.coCanCuTatDinh ? 'RULE_TABLE' : mt.some((e) => e.tatDinh === false) ? 'LLM_ASSERTED' : 'HEURISTIC';
      const tt = k2LoiBat() && s.coCanCuTatDinh && BASIS_LOI_K2.has(basis) ? 'LOI' : 'CANH_BAO';
      const tro = kl.maTroToi ? ` Dữ kiện trong mô tả khớp dòng ${fmtMa(kl.maTroToi)}.` : '';
      if (s.coCanCuTatDinh) ctx.goiY.add(`Dòng ${d.stt}: mô tả mâu thuẫn dữ kiện quyết định của mã khai (ranh giới đã số hoá, trích nguyên văn)${kl.maTroToi ? ` — dữ kiện khớp dòng ${kl.maTroToi}` : ''}.`);
      return muc('K2', tt, 'HO_SO_MAU_THUAN', `Mô tả khai mâu thuẫn dữ kiện quyết định của mã ${d.maHs}: ${ten('MAU_THUAN') || 'xem duKienQuyetDinh'}.${tro} Xem lại mã hoặc sửa mô tả trước khi truyền.`, { basis, evidence, nguon, goiYSua, ...them });
    }
    case 'THIEU_DU_KIEN':
      return muc('K2', 'CANH_BAO', 'HO_SO_THIEU_DU_KIEN', `Mô tả khai chưa thể hiện dữ kiện quyết định của mã ${d.maHs}: ${ten('THIEU') || 'xem duKienQuyetDinh'}. Bổ sung để mô tả đủ căn cứ.`, {
        basis: 'DETERMINISTIC', evidence, nguon, goiYSua: (kl.cauHoi || []).map((q) => q && q.vi).filter(Boolean).slice(0, 4).join(' | ') || goiYSua, ...them,
      });
    case 'CAN_CHUYEN_GIA':
      ctx.goiY.add(`Dòng ${d.stt}: ranh giới của mã khai chưa số hoá / tiền lệ lệch chưa phân xử — cần chuyên gia.`);
      return muc('K2', 'CANH_BAO', 'HO_SO_CAN_CHUYEN_GIA', `Ranh giới của mã ${d.maHs} chưa số hoá hoặc có tiền lệ lệch chưa phân xử (${(kl.chuaChot || []).join(', ') || 'xem hoSo.ketLuan'}): cần chuyên gia xem.`, { basis: 'DETERMINISTIC', evidence, nguon, goiYSua, ...them });
    default:
      return muc('K2', 'CANH_BAO', 'HO_SO_KHONG_RO', `Hồ sơ phân loại mã ${d.maHs} không ra kết luận.`, { basis: 'HEURISTIC', evidence, nguon, ...them });
  }
}

/** Tín hiệu rủi ro của hồ sơ ⇒ mục K2 HEURISTIC (tối đa CANH_BAO). QĐ 2079 là tín hiệu, không bao giờ căn cứ. */
function mucTinHieuK2(d, s, ctx) {
  const out = [];
  const h = s.hoSo || {};
  const ds = h.tinHieuRuiRo || [];
  const qd = ds.filter((t) => t && t.loai === 'DANH_MUC_RUI_RO');
  if (qd.length) {
    out.push(muc('K2', 'CANH_BAO', 'DANH_MUC_RUI_RO', `Mã ${d.maHs} nằm trong cặp mã của Danh mục rủi ro phân loại QĐ 2079/QĐ-TCHQ — tín hiệu cảnh báo, không phải căn cứ pháp lý.`, {
      basis: 'HEURISTIC',
      evidence: qd.slice(0, 5).map((t) => `${t.maKhop || d.maHs} ↔ ${t.maLienQuan || '?'}${t.tenHang ? ` (${t.tenHang})` : ''} — nhãn ${t.nhan}`).concat(qd[0].ghiChu ? [qd[0].ghiChu] : []),
      nguon: [src('lib/rui-ro-phan-loai.js#tinHieuDanhMuc', { phienBan: 'QĐ 2079/QĐ-TCHQ' })],
      goiYSua: 'Đối chiếu kỹ mô tả với tiêu chí phân biệt giữa các mã trong cặp trước khi truyền.',
    }));
  }
  for (const t of ds.filter((x) => x && x.loai === 'TIEN_LE_MO_TA_TUONG_TU_MA_KHAC')) {
    const tl = t.tienLe || [];
    if (!tl.length) continue;
    out.push(muc('K2', 'CANH_BAO', 'TIEN_LE_MO_TA_TUONG_TU_MA_KHAC', `Có ${tl.length} tiền lệ mô tả tương tự nhưng kết luận mã khác mã khai.`, {
      basis: 'HEURISTIC', evidence: tl.map((x) => `${x.soHieu || '?'} → ${x.maKetLuan} (độ tương tự ${x.doTuongTu ?? '?'})${x.nguon ? ` ${x.nguon}` : ''}`),
      nguon: [src('/api/evidence-pack', { phienBan: 'tienLeOf' })], goiYSua: 'Đọc các tiền lệ này; cần giải trình vì sao hàng không giống.',
    }));
  }
  // Nội bộ Oz: chỉ khi người gọi nội bộ (locTheoQuyen đã gỡ cho người khác — kiểm lại ở đây cho chắc).
  if (ctx.quyen && ctx.quyen.noiBo === true) {
    for (const t of ds.filter((x) => x && x.loai === 'MO_TA_GIONG_MA_KHAC')) {
      out.push(muc('K2', 'CANH_BAO', 'MO_TA_GIONG_MA_KHAC', `Kho tờ khai Oz có ${t.demKhoOz} tờ khai mô tả tương tự khai mã khác (nội bộ, chỉ số đếm).`, {
        basis: 'HEURISTIC', evidence: (t.maKhac || []).slice(0, 5).map((m) => `${m.maHs}: ${m.demKhoOz} tờ khai`), nguon: [src('lib/ho-so/doi-chieu.js#ganTinHieu', { phienBan: 'KHO_TO_KHAI_OZ' })],
      }));
    }
  }
  for (const t of ds.filter((x) => x && x.loai === 'CHENH_THUE')) {
    ctx.goiY.add(`Dòng ${d.stt}: chênh lệch thuế MFN giữa mã khai (${t.mfnMaHs}%) và mã ${t.maKhac} (${t.mfnMaKhac}%) ≥ 5 điểm phần trăm.`);
  }
  return out;
}

/** K2 nhánh hồ sơ: mục chính + tín hiệu + (chỉ khi canPhanLoai) classify. Mục coCanCuTatDinh xếp đầu. */
async function kiemK2HoSo(d, ctx, s) {
  const usage = [];
  let extra = {};
  const kiem = [mucHoSoK2(d, s, ctx), ...mucTinHieuK2(d, s, ctx)];
  if (s.canPhanLoai) {
    const pl = await phanLoaiK2(d, ctx);
    kiem.push(...pl.out);
    extra = pl.extra;
    usage.push(...pl.usage);
  }
  const loi = k2LoiBat();
  for (const m of kiem) {
    if (!('coCanCuTatDinh' in m)) m.coCanCuTatDinh = false;
    // chốt chặn: chỉ mục coCanCuTatDinh + basis đã số hoá + HS_K2_LOI bật mới được LOI (muc() vẫn hạ HEURISTIC/LLM_ASSERTED)
    if (m.trangThai === 'LOI' && !(loi && m.coCanCuTatDinh === true && BASIS_LOI_K2.has(m.basis))) m.trangThai = 'CANH_BAO';
  }
  kiem.sort((a, b) => Number(b.coCanCuTatDinh === true) - Number(a.coCanCuTatDinh === true));
  return { kiem, extra, usage };
}

/**
 * K2 theo cờ: off / mã không áp dụng ⇒ đường cũ y nguyên; shadow ⇒ đường cũ + soát chạy song song chỉ để ghi một dòng số đo;
 * on (hoặc chạy thử nội bộ) + mã lát 1 áp dụng ⇒ nhánh hồ sơ; lỗi tầng hồ sơ ⇒ đường cũ + `hoSoMeta.loi` ở cấp dòng.
 */
async function kiemK2TheoCo(d, ctx) {
  const che = ctx.cheDo;
  if (che === 'off') return kiemK2(d, ctx);
  let apDung = false;
  try { apDung = HSI.hoSoApDung(d.maHs); } catch { apDung = false; }
  if (!apDung) {
    if (che === 'shadow') safe(() => HSAPI.ghiKhongApDung('declaration-check', d.maHs, ctx.quyen), null);
    return kiemK2(d, ctx);
  }
  const dauVao = { maHs: d.maHs, moTa: d.moTa, ...(d.thongSo ? { thongSo: d.thongSo } : {}), ...(d.duKien ? { duKien: d.duKien } : {}), ...(d.hoSoId ? { hoSoId: d.hoSoId } : {}) };
  const chaySoat = () => withUsage(() => soat(dauVao, ctx.quyen)).catch((e) => ({ loi: e, usage: Array.isArray(e?.usage) ? e.usage : [] }));
  if (che === 'shadow') {
    const [cu, moi] = await Promise.all([kiemK2(d, ctx), chaySoat()]);
    safe(() => HSAPI.ghiShadowSoat(che, ctx.quyen, moi.loi ? { loi: moi.loi } : moi.result, d.maHs), null);
    return { ...cu, usage: [...cu.usage, ...(moi.usage || [])] };
  }
  const moi = await chaySoat();
  safe(() => HSAPI.ghiShadowSoat(che, ctx.quyen, moi.loi ? { loi: moi.loi } : moi.result, d.maHs), null);
  if (moi.loi) {
    const cu = await kiemK2(d, ctx);
    return { ...cu, extra: { ...cu.extra, hoSoMeta: { apDung: true, cheDo: che, loi: 'HO_SO_LOI' } }, usage: [...(moi.usage || []), ...cu.usage] };
  }
  const k2 = await kiemK2HoSo(d, ctx, moi.result);
  return { ...k2, usage: [...moi.usage, ...k2.usage] };
}

// ── Ghép ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const mucSanSangOf = (kiem) => (kiem.some((m) => m.trangThai === 'LOI') ? 'PHAI_SUA' : kiem.some((m) => m.trangThai === 'CANH_BAO') ? 'NEN_SUA' : 'SAN_SANG');
function homNayVn() { return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10); }

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  const worker = async () => { while (i < items.length) { const k = i; i += 1; out[k] = await fn(items[k], k); } };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, items.length)) }, worker));
  return out;
}

/**
 * @param {object} input  đã qua validateDeclarationCheckInput
 * @param {{ laKhoaDichVu?: boolean }} [opts]
 * @returns {Promise<object>} KetQuaSoat (camelCase)
 */
async function runDeclarationCheck(input, { laKhoaDichVu = false, quyen = {} } = {}) {
  // Dữ liệu tờ khai luôn là dữ liệu khách: mọi lượt LLM (nếu có) chỉ đi nhà cung cấp hợp lệ, bất kể ai gọi.
  return withPrivateData(async () => {
    const tariff = safe(() => tariffInfo(), null);
    const phienBanBieuThue = tariff?.effectiveDate ? String(tariff.effectiveDate) : 'không rõ';
    const ngay = input.ngayDuKienDangKy || homNayVn();
    const namLech = Boolean(tariff?.effectiveDate) && ngay.slice(0, 4) !== String(tariff.effectiveDate).slice(0, 4);
    // L1-5e: chế độ hồ sơ HIỆU LỰC theo người gọi (HS_HO_SO + HS_HO_SO_THU_CALLERS) — cùng quy tắc describe/classify
    const cheDo = safe(() => HSAPI.cheDoHieuLuc(quyen), 'off');
    const ctx = { phienBanBieuThue, namLech, goiY: new Set(), quyen: quyen || {}, cheDo };
    const kiemMa = input.kiemMa === true;
    const par = Math.max(1, Number(process.env.HS_DECL_CHECK_K2_PARALLEL) || 3);
    const usage = [];
    let coAcfta = false;

    const dong = await pool(input.dongHang, kiemMa ? par : 1, async (d) => {
      const row = taxData[d.maHs] || null;
      const tax = row ? safe(() => buildTaxLookup(d.maHs, { origin: d.xuatXu, name: d.moTa.slice(0, 500) }), null) : null;
      if (d.thueSuatKhai?.loai === 'ACFTA' || d.coFormE === true) coAcfta = true;
      let k2 = { kiem: k2ChuaKiem(), extra: {}, usage: [] };
      if (kiemMa) k2 = await kiemK2TheoCo(d, ctx);
      usage.push(...k2.usage);
      const kiem = [...kiemK1(d), ...k2.kiem, ...kiemK3(d, row, ctx), ...kiemK4(d, row, ctx), ...kiemK5(d, tax, ctx), ...kiemK6(d), ...kiemK7(d)];
      for (const n of NHOM) if (!kiem.some((m) => m.nhom === n)) kiem.push(chuaKiem(n, 'KHONG_CHAY', 'Nhóm kiểm không chạy được cho dòng này.'));
      kiem.sort((a, b) => NHOM.indexOf(a.nhom) - NHOM.indexOf(b.nhom));
      const mss = mucSanSangOf(kiem);
      if (mss === 'PHAI_SUA') ctx.goiY.add(`Dòng ${d.stt} có lỗi phải sửa (PHAI_SUA).`);
      if (kiem.some((m) => m.ma === 'CO_THE_PHAI_DANG_KY_DANH_MUC')) ctx.goiY.add(`Dòng ${d.stt}: máy móc chương 84/85/90 có dấu hiệu tháo rời/nhập nhiều chuyến.`);
      return { stt: d.stt, maHs: d.maHs, mucSanSang: mss, kiem, ...k2.extra };
    });

    const all = dong.flatMap((d) => d.kiem);
    const soLoi = all.filter((m) => m.trangThai === 'LOI').length;
    const soCanhBao = all.filter((m) => m.trangThai === 'CANH_BAO').length;
    const chua = all.filter((m) => m.trangThai === 'CHUA_KIEM');
    const tomChua = new Map();
    for (const m of chua) {
      const k = `${m.nhom} ${m.lyDoChuaKiem}`;
      tomChua.set(k, (tomChua.get(k) || 0) + 1);
    }
    const canhBao = [
      'Kết quả soát tự động để tham khảo, không thay thế trách nhiệm của người khai hải quan; cơ quan hải quan có thẩm quyền quyết định.',
      ...(chua.length ? [`Không kiểm được: ${[...tomChua].map(([k, n]) => `${k} (${n} dòng)`).join(' | ')}`] : []),
      ...(coAcfta ? [`Mức ACFTA lấy theo biểu đang giữ (hiệu lực ${phienBanBieuThue}), chưa theo lộ trình từng năm (#336).`] : []),
      ...(namLech ? [`Ngày đăng ký dự kiến ${ngay} khác năm của biểu đang giữ (hiệu lực ${phienBanBieuThue}): lệch thuế suất chỉ báo CANH_BAO, đối chiếu biểu có hiệu lực tại ngày đăng ký (${legal.cite('5.2').tham_chieu}).`] : []),
      ...(tariff?.freshness && tariff.freshness !== 'FRESH' && tariff.noteVi ? [tariff.noteVi] : []),
    ];
    return {
      phienBanBoKiem: PHIEN_BAN_BO_KIEM,
      phienBanBieuThue,
      ...(tariff ? { bieuThue: tariff } : {}),
      ngayDuKienDangKy: ngay,
      ...(input.loaiHinh ? { loaiHinh: input.loaiHinh } : {}),
      ...(input.maLuotSoat ? { maLuotSoat: input.maLuotSoat } : {}),
      kiemMa,
      tongQuan: { soDong: dong.length, soLoi, soCanhBao, soChuaKiem: chua.length, mucSanSang: soLoi ? 'PHAI_SUA' : soCanhBao ? 'NEN_SUA' : 'SAN_SANG' },
      dong,
      canhBao,
      goiYChuyenGia: { nen: ctx.goiY.size > 0, lyDo: [...ctx.goiY] },
      khongDungLlm: !kiemMa,
      ...(laKhoaDichVu ? { usage } : {}),
    };
  });
}

module.exports = { runDeclarationCheck, validateDeclarationCheckInput, PHIEN_BAN_BO_KIEM, SO_DONG_TOI_DA, NHOM };
