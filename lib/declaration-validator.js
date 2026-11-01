const {
  antiPatternsData,
  getChapterRules,
  getChapterDeclarationSpec,
  getDeclarationFieldSpec,
  getCountryByAlpha2,
  getCountryByName,
  getUnitByCode,
} = require('./compliance-data');
const { detectOrigin } = require('./origin-hints');
const { removeDiacritics } = require('./search-utils');
const { attributeFieldDef } = require('./attributes');
const { composeWithMeta, ECUS_MAX_LENGTH } = require('./describe-compose');
const { citeChiTieu } = require('./legal-basis');
const { phatHienTruong, nguonChu, coThongSoTrongChu, moRongDongNghia } = require('./truong-dac-thu');

const TINH_TRANG_ALLOWED = ['Mới 100%', 'Đã qua sử dụng', 'Tân trang', 'Mới đã mở hộp'];
const LEGAL_REFERENCES = [
  citeChiTieu('1.78.1').tham_chieu, // qua lib/legal-basis.js (luật 7a) — không gõ tay "TT 39/2018 … Phụ lục I" (#548)
  'CV 5189/TCHQ-GSQL (2019)',
  'CV 755/TCHQ-GSQL (2020)',
];

const GENERIC_RE = /\b(các loại|hàng tiêu dùng|hàng khác|một số|vài chiếc|nhiều loại)\b/i;

function plain(text) {
  return removeDiacritics(String(text || '').toLowerCase());
}

/**
 * Trường đặc thù có mặt không — đọc CẢ trường có cấu trúc (model, congDung, thanhPhanCauTao, chapterSpecific) LẪN chữ
 * trong tenHang/mô tả, đọc số kèm đơn vị (lib/truong-dac-thu.js, #725 nhóm A). Chỉ "có" khi có bằng chứng.
 */
function hasChapterFieldValue(declaration, fieldDef, context = {}) {
  return phatHienTruong(fieldDef, declaration, context).co;
}

function collectChapterFieldRequirements(declaration, hsCode, context = {}) {
  const spec = getDeclarationFieldSpec(hsCode);
  if (!spec) {
    return { spec: null, missing: [], present: [], recommendedMissing: [], giaTri: {} };
  }

  const missing = [];
  const present = [];
  const recommendedMissing = [];
  const giaTri = {};
  const chu = nguonChu(declaration, context);

  for (const fieldDef of spec.required) {
    const r = phatHienTruong(fieldDef, declaration, context, chu);
    if (r.co) {
      present.push(fieldDef.key);
      giaTri[fieldDef.key] = r.giaTri;
    } else {
      missing.push(fieldDef);
    }
  }

  for (const fieldDef of spec.recommended) {
    const r = phatHienTruong(fieldDef, declaration, context, chu);
    if (r.co) giaTri[fieldDef.key] = r.giaTri;
    else recommendedMissing.push(fieldDef);
  }

  return { spec, missing, present, recommendedMissing, giaTri };
}

// Từ dừng của so khớp mô tả ↔ biểu thuế (GIỮ DẤU — bỏ dấu làm "thể" trùng "thế/the"). Gồm cả từ chung của mọi nhóm máy
// ("máy", "điện", "thiết bị") — chung một từ như thế không chứng minh mô tả khớp mã.
const TU_DUNG_KHOP = new Set(['các', 'của', 'và', 'hoặc', 'là', 'để', 'trong', 'có', 'không', 'loại', 'khác', 'hàng', 'này', 'một', 'hai',
  'dùng', 'cho', 'với', 'từ', 'đã', 'được', 'khi', 'như', 'bằng', 'trên', 'dưới', 'theo', 'kể', 'cả', 'thuộc', 'nhóm', 'phân', 'chưa', 'hay',
  'vào', 'ra', 'trừ', 'tương', 'tự', 'những', 'phần', 'chi', 'tiết', 'bộ', 'máy', 'thiết', 'bị', 'điện', 'sản', 'phẩm', 'mới', 'cái', 'chiếc',
  'dạng', 'kiểu', 'đó', 'sen', 'nhưng', 'chỉ', 'lại', 'mà', 'cũng', 'gồm', 'riêng', 'chủ', 'yếu', 'trước', 'sau', 'việc']);
const ASCII_DUNG = new Set([...TU_DUNG_KHOP].map((w) => removeDiacritics(w)));
const tachTu = (s, dau) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/)
  .map((w) => (dau ? w : removeDiacritics(w)))
  .filter((w) => w.length >= 2 && !/^\d+$/.test(w) && !(dau ? TU_DUNG_KHOP : ASCII_DUNG).has(w));

let _headingVocab = null;
/** Từ vựng của mọi dòng (tax.json) trong một nhóm 4 số: { dau: Set (giữ dấu), khongDau: Set }. */
function headingVocab(hs4) {
  if (!_headingVocab) {
    _headingVocab = new Map();
    const { taxData } = require('./data');
    for (const r of Object.values(taxData)) {
      const h = r.hs.slice(0, 4);
      if (!_headingVocab.has(h)) _headingVocab.set(h, { dau: new Set(), khongDau: new Set() });
      const v = _headingVocab.get(h);
      for (const t of tachTu(r.vn, true)) v.dau.add(t);
      for (const t of tachTu(r.vn, false)) v.khongDau.add(t);
    }
  }
  return _headingVocab.get(String(hs4)) || { dau: new Set(), khongDau: new Set() };
}

/** Từ vựng tên nhóm/phân nhóm/dòng theo breadcrumb của chính mã (tên nhóm 4 số không nằm trong tax.json). */
function breadcrumbVocab(hsCode) {
  const out = { dau: new Set(), khongDau: new Set() };
  try {
    const { breadcrumbOf } = require('./hs-breadcrumb.js');
    const bc = breadcrumbOf(String(hsCode || '')) || {};
    for (const ten of [bc.headingVi, bc.subheadingVi, bc.scopeVi, bc.selfVi]) {
      for (const t of tachTu(ten, true)) out.dau.add(t);
      for (const t of tachTu(ten, false)) out.khongDau.add(t);
    }
  } catch { /* không có breadcrumb: chỉ dùng tên dòng */ }
  return out;
}

/**
 * Số từ có nghĩa của mô tả (kể cả từ đồng nghĩa biểu thuế) trùng ngôn ngữ biểu thuế của mã: ≥ 1 từ trong tên nhóm/phân
 * nhóm/dòng của chính mã, hoặc ≥ 2 từ trong tên các dòng khác của nhóm 4 số; không thì 0. So GIỮ DẤU; mô tả gõ không dấu
 * thì so bản bỏ dấu.
 */
function headingVocabOverlap(text, hsCode) {
  const v = headingVocab(String(hsCode || '').slice(0, 4));
  const b = breadcrumbVocab(hsCode);
  const coDau = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(String(text || ''));
  const moRong = moRongDongNghia(String(text || '').toLowerCase());
  const tu = tachTu(moRong, coDau);
  const [vocab, vocabB] = coDau ? [v.dau, b.dau] : [v.khongDau, b.khongDau];
  const uniq = [...new Set(tu)];
  const trungTen = uniq.filter((t) => vocabB.has(t)).length; // tên nhóm / phân nhóm / dòng của CHÍNH mã: một từ là đủ
  const trungNhom = uniq.filter((t) => vocab.has(t)).length; // từ vựng các dòng khác trong nhóm: cần ≥ 2 từ
  return trungTen > 0 ? trungTen : (trungNhom >= 2 ? trungNhom : 0);
}

function matchAntiPatternRules(text, field) {
  const hits = [];
  const p = plain(text);
  for (const rule of antiPatternsData.validation || []) {
    if (rule.fields && !rule.fields.includes(field)) continue;
    for (const pat of rule.patterns || []) {
      const re = new RegExp(pat, 'i');
      if (re.test(p) || re.test(plain(text))) {
        hits.push(rule);
        break;
      }
    }
  }
  return hits;
}

function normalizeDeclaration(raw = {}, context = {}) {
  const d = raw.declaration || raw;
  let xuatXu = d.xuatXu;
  if (typeof xuatXu === 'string') {
    const country =
      getCountryByAlpha2(xuatXu) ||
      getCountryByName(xuatXu) ||
      getCountryByAlpha2(context.origin) ||
      getCountryByName(context.origin);
    xuatXu = country
      ? { code: country.alpha2, nameVi: country.nameVi }
      : { code: xuatXu.slice(0, 2).toUpperCase(), nameVi: xuatXu };
  } else if (!xuatXu && context.origin) {
    const country = getCountryByAlpha2(context.origin) || getCountryByName(context.origin);
    xuatXu = country ? { code: country.alpha2, nameVi: country.nameVi } : null;
  }

  // ĐVT (#725 lỗi 19): ĐVT khách khai thắng; không có thì lấy ĐVT biểu thuế. ĐVT ghép kiểu "kg/chiếc", "chiếc/bộ" không
  // phải MỘT ĐVT để khai → để trống + gợi ý từng phần, không bao giờ trả chuỗi ghép.
  const dvtGoc = context.donViTinh || d.donViTinh || context.unitVi || null;
  let donViTinh = null;
  let donViTinhGoiY = null;
  if (dvtGoc) {
    const unit = getUnitByCode(dvtGoc) || { nameVi: dvtGoc };
    const ten = String(unit.nameVi || dvtGoc).trim();
    const phan = ten.split(/\s*\/\s*/).map((x) => x.trim()).filter(Boolean);
    if (phan.length > 1) donViTinhGoiY = [...new Set(phan)];
    else donViTinh = ten;
  }

  // Tình trạng: chuẩn hoá chữ hoa/thường ("mới 100%" = "Mới 100%"); không khai riêng mà câu mô tả đã ghi thì lấy từ câu.
  const chuanTinhTrang = (v) => {
    if (!v) return null;
    const hit = TINH_TRANG_ALLOWED.find((t) => t.toLowerCase() === String(v).trim().toLowerCase());
    return hit || String(v).trim();
  };
  const cauMoTa = [d.tenHang, d.productName, context.productName, context.customerDescription].filter(Boolean).join(' ');
  const tuCau = /(?:mới|moi)\s*100\s*%|\bbrand new\b|\bnew 100\s*%/iu.test(cauMoTa) && !/(?:đã qua sử dụng|(?<!\p{L})cũ(?!\p{L})|tân trang|\bused\b)/iu.test(cauMoTa) ? 'Mới 100%' : null;
  const tinhTrangExplicit = chuanTinhTrang(d.tinhTrang || context.condition) || tuCau;

  return {
    tenHang: d.tenHang || d.productName || context.productName || null,
    xuatXu,
    donViTinh,
    ...(donViTinhGoiY ? { donViTinhGoiY, donViTinhGhiChu: `Biểu thuế ghi ĐVT ghép "${donViTinhGoiY.join('/')}" — chọn MỘT ĐVT theo hoá đơn/chứng từ (khai báo không nhận ĐVT ghép).` } : {}),
    tinhTrang: tinhTrangExplicit || 'Mới 100%',
    tinhTrangDefaulted: !tinhTrangExplicit,
    nhanHieu: d.nhanHieu ?? d.brand ?? context.brand ?? null,
    model: d.model ?? context.model ?? null,
    thongSoKyThuat: Array.isArray(d.thongSoKyThuat)
      ? d.thongSoKyThuat
      : d.technicalSpec
        ? [].concat(d.technicalSpec)
        : context.technicalSpec
          ? [].concat(context.technicalSpec)
          : [],
    thanhPhanCauTao: d.thanhPhanCauTao || d.material || context.material || null,
    congDung: d.congDung || d.purpose || context.purpose || null,
    quyCach: d.quyCach || null,
    chapterSpecific: d.chapterSpecific && typeof d.chapterSpecific === 'object' ? d.chapterSpecific : {},
  };
}

// Giá trị nhãn hiệu chung chung — không phải tên nhãn (cũng không đem đi khớp danh sách nhãn, lib/trademark-watch.js).
const HIEU_CHUNG = /^(?:oem|odm|no ?brand|non ?brand|nobrand|n\/a|none|generic|không|khong|ko|chưa có|không có|không nhãn|không hiệu)$/i;
/**
 * "không hiệu, hiệu X" → { khong, hieu } khi câu vừa phủ nhận nhãn hiệu vừa nêu một nhãn hiệu cụ thể; không thì null.
 */
function nhanHieuMauThuan(text) {
  const t = String(text || '');
  const khong = t.match(/(?:không|khong|ko|chưa có)\s+(?:có\s+)?(?:nhãn hiệu|thương hiệu|nhãn mác|hiệu|nhãn)|\bno ?brand\b|\bnon ?brand\b|\bnobrand\b/iu);
  if (!khong) return null;
  const re = /(?<![\p{L}])(?:nhãn hiệu|thương hiệu|hiệu|brand)\s*:?\s*([\p{L}\p{N}][\p{L}\p{N}&.\-]*)/giu;
  let m;
  while ((m = re.exec(t))) {
    const truoc = t.slice(Math.max(0, m.index - 12), m.index).toLowerCase();
    if (/(?:không|khong|ko|có|chưa)\s*$/u.test(truoc)) continue; // chính cụm "không hiệu"
    const v = m[1].replace(/[.\-]+$/, '');
    if (!v || HIEU_CHUNG.test(v) || /^(?:không|khong|ko|chưa|có)$/iu.test(v)) continue;
    return { khong: khong[0], hieu: v };
  }
  return null;
}

function validateDeclaration(declaration, hsCode, context = {}) {
  const warnings = [];
  const missingRequired = [];
  const missingRecommended = [];
  const chapterSpecificMissing = [];
  let score = 100;
  // Bảng điểm trừ (#725 lỗi 9/22): mọi điểm bị trừ đều có mã — K1 và describe trình cùng một bảng, không còn nhãn
  // "đạt" đi với điểm thấp mà không rõ trừ vì đâu.
  const diemTru = [];
  const tru = (ma, n) => { score -= n; diemTru.push({ ma, diem: n }); };

  const chapter = String(parseInt(String(hsCode || '').slice(0, 2), 10)).padStart(2, '0');
  const chapterNum = parseInt(chapter, 10);

  // Tier 1
  if (!declaration.tenHang || declaration.tenHang.length < 10) {
    missingRequired.push('tenHang');
    warnings.push({
      code: 'TOO_GENERIC',
      field: 'tenHang',
      severity: 'error',
      message: 'Tên hàng quá ngắn (<10 ký tự)',
      suggestion: 'Bổ sung tên thương mại và đặc trưng cơ bản',
    });
    tru('TOO_GENERIC', 30);
  } else if (GENERIC_RE.test(declaration.tenHang)) {
    warnings.push({
      code: 'TOO_GENERIC',
      field: 'tenHang',
      severity: 'error',
      message: "Cấm từ mơ hồ ('các loại', 'một số'...) theo CV 5189/TCHQ-GSQL",
    });
    tru('TOO_GENERIC', 20);
  }

  for (const rule of matchAntiPatternRules(declaration.tenHang, 'tenHang')) {
    warnings.push({
      code: rule.code,
      field: 'tenHang',
      severity: rule.severity || 'error',
      message: `Phát hiện pattern không hợp lệ: ${rule.code}`,
    });
    tru(rule.code, rule.scorePenalty || 10);
  }

  // Mô tả khai ECUS phải là tiếng Việt: chữ Hán (tiêu đề Taobao dán vào) không
  // được chấp nhận trên tờ khai và làm mô tả mơ hồ (CV 5189/TCHQ-GSQL).
  const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;
  const cjkFields = ['tenHang', 'thanhPhanCauTao', 'congDung', 'nhanHieu', 'model']
    .filter((f) => CJK.test(String(declaration[f] || '')));
  if (cjkFields.length || (declaration.thongSoKyThuat || []).some((t) => CJK.test(String(t)))) {
    warnings.push({
      code: 'CJK_IN_DECLARATION',
      field: cjkFields[0] || 'thongSoKyThuat',
      severity: 'error',
      message: 'Mô tả khai báo còn chữ Hán (tiếng Trung) — tờ khai phải bằng tiếng Việt',
      suggestion: 'Dịch tên hàng, thành phần, công dụng sang tiếng Việt; nhãn hiệu ghi bằng chữ Latin như trên bao bì.',
    });
    tru('CJK_IN_DECLARATION', 25);
  }

  // Xuất xứ khai ≠ nước sản xuất mà tiêu đề/mô tả gốc nói tới (vd Coca-Cola 墨西哥
  // mua trên Taobao nhưng khai "xuất xứ Trung Quốc").
  if (context.sourceText && declaration.xuatXu?.code) {
    const origin = detectOrigin(context.sourceText, { llmOrigin: context.detectedOrigin || null });
    if (origin.detectedOrigin && origin.confidence === 'HIGH' && origin.detectedOrigin !== declaration.xuatXu.code) {
      warnings.push({
        code: 'ORIGIN_CONFLICT',
        field: 'xuatXu',
        severity: 'error',
        message: `Khai xuất xứ ${declaration.xuatXu.code} nhưng mô tả gốc cho thấy hàng sản xuất tại ${origin.detectedOrigin} (${origin.evidence.join(', ')})`,
        suggestion: `Khai xuất xứ theo nước sản xuất (${origin.detectedOrigin}); không dùng C/O mẫu E nếu hàng không có xuất xứ Trung Quốc.`,
      });
      tru('ORIGIN_CONFLICT', 25);
    }
  }

  if (!declaration.xuatXu?.code || !declaration.xuatXu?.nameVi) {
    missingRequired.push('xuatXu');
    tru('ORIGIN_MISSING', 25);
    warnings.push({
      code: 'ORIGIN_MISSING',
      field: 'xuatXu',
      severity: 'error',
      message: 'Thiếu xuất xứ (ISO + tên VN)',
    });
  } else if (!getCountryByAlpha2(declaration.xuatXu.code)) {
    warnings.push({
      code: 'ORIGIN_INVALID',
      field: 'xuatXu',
      severity: 'warn',
      message: `Mã quốc gia ${declaration.xuatXu.code} chưa có trong danh mục ISO`,
    });
    tru('ORIGIN_INVALID', 5);
  }

  if (!declaration.donViTinh && Array.isArray(declaration.donViTinhGoiY) && declaration.donViTinhGoiY.length) {
    // ĐVT biểu thuế ghép (kg/chiếc): không phải lỗi mô tả — chỉ nhắc chọn một ĐVT, không trừ điểm.
    warnings.push({
      code: 'UNIT_AMBIGUOUS',
      field: 'donViTinh',
      severity: 'info',
      message: declaration.donViTinhGhiChu || `Chọn một ĐVT trong: ${declaration.donViTinhGoiY.join(', ')}`,
      suggestion: `Khai MỘT đơn vị tính (${declaration.donViTinhGoiY.join(' hoặc ')}) theo hoá đơn.`,
    });
  } else if (!declaration.donViTinh) {
    missingRequired.push('donViTinh');
    tru('UNIT_MISSING', 20);
    warnings.push({
      code: 'UNIT_MISSING',
      field: 'donViTinh',
      severity: 'error',
      message: 'Thiếu đơn vị tính',
    });
  }

  if (!declaration.tinhTrang || !TINH_TRANG_ALLOWED.includes(declaration.tinhTrang)) {
    missingRequired.push('tinhTrang');
    tru('WRONG_CONDITION', 20);
    warnings.push({
      code: 'WRONG_CONDITION',
      field: 'tinhTrang',
      severity: 'error',
      message: `tinhTrang phải là một trong: ${TINH_TRANG_ALLOWED.join(', ')}`,
    });
  }

  const usedHints = /\b(cũ|đã qua sử dụng|used|tân trang)\b/i;
  const nameBlob = `${declaration.tenHang || ''} ${context.customerDescription || ''}`;
  if (usedHints.test(nameBlob) && declaration.tinhTrang === 'Mới 100%') {
    warnings.push({
      code: 'WRONG_CONDITION',
      field: 'tinhTrang',
      severity: 'error',
      message: 'Hàng cũ/đã qua sử dụng phải khai đúng tình trạng',
      suggestion: 'Đặt tinhTrang = "Đã qua sử dụng" hoặc "Tân trang"',
    });
    tru('WRONG_CONDITION', 20);
  } else if (declaration.tinhTrangDefaulted) {
    warnings.push({
      code: 'CONDITION_DEFAULTED',
      field: 'tinhTrang',
      severity: 'warn',
      message: 'tinhTrang được mặc định "Mới 100%" do input không có — cần xác nhận thực tế lô hàng',
      suggestion: 'Hàng đã qua sử dụng phải khai "Đã qua sử dụng" hoặc "Tân trang"',
    });
    tru('CONDITION_DEFAULTED', 5);
  }

  // Nhãn hiệu tự mâu thuẫn (#725 lỗi 21): câu ghi "không hiệu" mà lại ghi "hiệu X" (X không phải OEM/không hiệu…).
  const mauThuanHieu = nhanHieuMauThuan([declaration.tenHang, declaration.nhanHieu ? `nhãn hiệu ${declaration.nhanHieu}` : '', context.customerDescription].filter(Boolean).join('; '));
  if (mauThuanHieu) {
    warnings.push({
      code: 'BRAND_CONTRADICTION',
      field: 'nhanHieu',
      severity: 'warn',
      message: `Nhãn hiệu tự mâu thuẫn: câu khai vừa ghi "${mauThuanHieu.khong}" vừa ghi nhãn hiệu "${mauThuanHieu.hieu}".`,
      suggestion: 'Ghi đúng một nhãn hiệu như trên hàng/bao bì; hàng không có nhãn thì ghi "không nhãn hiệu" và bỏ tên nhãn kia.',
    });
    tru('BRAND_CONTRADICTION', 5);
  }

  // Tier 2
  if (!declaration.nhanHieu && context.brand) {
    missingRecommended.push('nhanHieu');
    warnings.push({
      code: 'MISSING_BRAND',
      field: 'nhanHieu',
      severity: 'warn',
      message: 'Có brand trong input nhưng thiếu trong declaration',
      suggestion: `Bổ sung nhanHieu: ${context.brand}`,
    });
    tru('MISSING_BRAND', 8);
  }

  if (!declaration.model && context.model) {
    missingRecommended.push('model');
    tru('MISSING_MODEL', 5);
  }

  const specs = declaration.thongSoKyThuat || [];
  // Thông số nằm trong tên hàng/mô tả ("12V/10A", "100-240VAC", "14mm") cũng là thông số (#725 lỗi 7).
  const chu = nguonChu(declaration, context);
  const coThongSo = specs.filter(Boolean).length > 0 || coThongSoTrongChu(chu.raw);
  if (!coThongSo) {
    missingRecommended.push('thongSoKyThuat');
    tru('THIEU_THONG_SO_KY_THUAT', 5);
  }

  if (chapterNum >= 39 && chapterNum <= 63 && !phatHienTruong({ key: 'material' }, declaration, context, chu).co) {
    missingRecommended.push('thanhPhanCauTao');
    warnings.push({
      code: 'MISSING_MATERIAL',
      field: 'thanhPhanCauTao',
      severity: 'warn',
      message: `Chương ${chapter} khuyến nghị ghi thành phần/vật liệu`,
    });
    tru('MISSING_MATERIAL', 10);
  }

  if ((chapter === '84' || chapter === '85') && !coThongSo) {
    warnings.push({
      code: 'MISSING_SPEC',
      field: 'thongSoKyThuat',
      severity: 'error',
      message: 'Máy móc/điện phải có ít nhất một thông số kỹ thuật',
    });
    tru('MISSING_SPEC', 20);
  }

  // Chapter-specific ECUS fields (data/chapter-declaration-fields.json)
  const chapterFields = collectChapterFieldRequirements(declaration, hsCode, context);
  for (const fieldDef of chapterFields.missing) {
    const fieldPath = `chapterSpecific.${fieldDef.key}`;
    chapterSpecificMissing.push(fieldDef.key);
    missingRequired.push(fieldPath);
    warnings.push({
      code: `MISSING_${fieldDef.key.toUpperCase()}`,
      field: fieldPath,
      severity: 'warn',
      message: `Nhóm ${chapterFields.spec.heading} — thiếu ${fieldDef.labelVi} trong mô tả ECUS`,
      suggestion: fieldDef.ecusHint || `Bổ sung ${fieldDef.labelVi}`,
    });
    tru(`MISSING_${fieldDef.key.toUpperCase()}`, 8);
  }

  for (const fieldDef of chapterFields.recommendedMissing) {
    missingRecommended.push(`chapterSpecific.${fieldDef.key}`);
    warnings.push({
      code: `RECOMMENDED_${fieldDef.key.toUpperCase()}`,
      field: `chapterSpecific.${fieldDef.key}`,
      severity: 'info',
      message: `Nhóm ${chapterFields.spec.heading} — nên bổ sung ${fieldDef.labelVi}`,
      suggestion: fieldDef.ecusHint || fieldDef.labelVi,
    });
    tru(`RECOMMENDED_${fieldDef.key.toUpperCase()}`, 3);
  }

  // Legacy chapter-specific-rules (chapters chưa có trong chapter-declaration-fields)
  if (!chapterFields.spec) {
    const rules = getChapterRules(chapter);
    for (const key of rules?.chapterSpecificRequired || []) {
      // Map canonical + patterns từ registry (data/attributes.json) thay cho patterns:[] rỗng
      // — nếu không, mọi field EN luôn bị coi là thiếu (cùng lỗi finding 9.3).
      const fieldDef = attributeFieldDef(key);
      if (!hasChapterFieldValue(declaration, fieldDef, context)) {
        chapterSpecificMissing.push(fieldDef.key);
        missingRequired.push(`chapterSpecific.${fieldDef.key}`);
        warnings.push({
          code: `MISSING_${fieldDef.key.toUpperCase()}`,
          field: `chapterSpecific.${fieldDef.key}`,
          severity: 'warn',
          message: `Chương ${chapter} yêu cầu ${fieldDef.labelVi}`,
          suggestion: `Bổ sung ${fieldDef.labelVi} từ catalog/spec sheet`,
        });
        tru(`MISSING_${fieldDef.key.toUpperCase()}`, 5);
      }
    }
  }

  // HS mismatch (#725 lỗi 16). Gốc lỗi cũ: (1) tỉ lệ trùng chia cho số từ của BÊN DÀI HƠN → mô tả càng đầy đủ càng bị
  // báo lệch ("…tinh thể lỏng…" với 8524.91 "Bằng tinh thể lỏng"); (2) chỉ so tên dòng 8 số, mà tên dòng thường là mảnh
  // điều kiện ("Dòng điện dưới 16 A"); (3) bỏ dấu + bỏ từ 2 chữ cái → "cọ vẽ" mất hết từ, "thể" trùng "the"; (4) không có
  // đồng nghĩa thương mại ("cọ" ↔ "bút lông"). Nay: so GIỮ DẤU với từ vựng cả nhóm 4 số + tên nhóm, có bảng đồng nghĩa
  // nhỏ; chỉ báo khi mô tả không chung TỪ CÓ NGHĨA nào với nhóm. Bộ so khớp là heuristic → mức warn, không phải error.
  if (context.tariffNameVi && declaration.tenHang) {
    const overlap = headingVocabOverlap(`${declaration.tenHang} ${declaration.congDung || ''}`, hsCode);
    if (overlap === 0) {
      warnings.push({
        code: 'MISMATCH_HS',
        field: 'tenHang',
        severity: 'warn',
        message: 'Mô tả không có từ nào trùng ngôn ngữ biểu thuế của nhóm 4 số đã khai (so khớp từ khoá, heuristic) — kiểm lại mã.',
        suggestion: `Tham chiếu: ${context.tariffNameVi}`,
      });
      tru('MISMATCH_HS', 10);
    }
  }

  // ECUS 200 ký tự: mô tả đầy đủ vượt limit sẽ bị compose tự rút gọn —
  // cảnh báo để NV biết phần thông số/công dụng có thể không vào tờ khai
  // Cùng tuỳ chọn ghép với /api/describe (context.composeOpts) để con số trong cảnh báo khớp descriptionMeta (#725 lỗi 20).
  const composedMeta = composeWithMeta(declaration, context.composeOpts || {});
  if (composedMeta.fullLength > ECUS_MAX_LENGTH) {
    warnings.push({
      code: 'LENGTH_EXCEEDED',
      field: 'customsDescription',
      severity: 'warn',
      message: `Mô tả đầy đủ ${composedMeta.fullLength} ký tự > ${ECUS_MAX_LENGTH} (giới hạn ECUS) — đã tự rút gọn còn ${composedMeta.length}, giữ nguyên xuất xứ + tình trạng ở cuối`,
      suggestion: `Rút gọn thông số kỹ thuật/công dụng. Phần bị cắt: ${composedMeta.dropped.join(', ') || 'không'}`,
    });
    tru('LENGTH_EXCEEDED', 5);
  }

  // Mixed language heuristic
  const ten = declaration.tenHang || '';
  const hasVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(ten);
  const hasEn = /\b[A-Za-z]{4,}\b/.test(ten);
  if (hasVi && hasEn && !declaration.nhanHieu) {
    warnings.push({
      code: 'MIXED_LANGUAGE',
      field: 'tenHang',
      severity: 'warn',
      message: 'Mô tả trộn Việt-Anh — nên thống nhất hoặc ghi rõ tên thương mại',
    });
    tru('MIXED_LANGUAGE', 5);
  }

  // Chương chưa có checklist trường khai báo (không có template nhóm/chương và
  // không có chapter-specific-rules): điểm cao chỉ phản ánh các trường CHUNG,
  // chưa đánh giá thông số đặc thù → không cho lên EXCELLENT.
  const hasChecklist = Boolean(chapterFields.spec) || Boolean(getChapterRules(chapter)?.chapterSpecificRequired?.length);
  if (!hasChecklist) {
    warnings.push({
      code: 'NO_CHAPTER_CHECKLIST',
      field: 'chapterSpecific',
      severity: 'info',
      message: `Chương ${chapter} chưa có checklist thông số đặc thù — điểm chỉ phản ánh các trường chung (${citeChiTieu('1.78.1').tham_chieu}).`,
      suggestion: 'Tự đối chiếu chú giải chương/nhóm để bổ sung thông số phân biệt mã (chất liệu, kích thước, công suất…).',
    });
    if (score > 85) { diemTru.push({ ma: 'NO_CHAPTER_CHECKLIST', diem: score - 85 }); score = 85; }
  }

  score = Math.max(0, Math.min(100, score));

  let level;
  if (score >= 90) level = 'EXCELLENT';
  else if (score >= 75) level = 'GOOD';
  else if (score >= 60) level = 'ACCEPTABLE';
  else if (score >= 40) level = 'WEAK';
  else level = 'REJECT';

  const hasBlockingError = warnings.some((w) => w.severity === 'error') || missingRequired.length > 0;
  if (missingRequired.length >= 2) level = 'REJECT';

  return {
    score,
    level,
    missingRequired,
    missingRecommended,
    chapterSpecificMissing,
    chapterFields: chapterFields.spec
      ? {
          hsCode: chapterFields.spec.hsCode,
          chapter: chapterFields.spec.chapter,
          heading: chapterFields.spec.heading,
          source: chapterFields.spec.source,
          template: chapterFields.spec.template,
          titleVi: chapterFields.spec.titleVi,
          required: chapterFields.spec.required.map((f) => f.key),
          present: chapterFields.present,
          missing: chapterFields.missing.map((f) => f.key),
          noteVi: chapterFields.spec.noteVi || null,
          giaTri: chapterFields.giaTri,
        }
      : null,
    warnings,
    diemTru,
    passesCustomsAudit: level !== 'REJECT' && !hasBlockingError,
    legalReferences: LEGAL_REFERENCES,
  };
}

module.exports = {
  validateDeclaration,
  normalizeDeclaration,
  collectChapterFieldRequirements,
  hasChapterFieldValue,
  nhanHieuMauThuan,
  HIEU_CHUNG,
  TINH_TRANG_ALLOWED,
};
