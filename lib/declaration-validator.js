const {
  antiPatternsData,
  getChapterRules,
  getCountryByAlpha2,
  getCountryByName,
  getUnitByCode,
} = require('./compliance-data');
const { removeDiacritics } = require('./search-utils');
const { composeWithMeta, ECUS_MAX_LENGTH } = require('./describe-compose');

const TINH_TRANG_ALLOWED = ['Mới 100%', 'Đã qua sử dụng', 'Tân trang', 'Mới đã mở hộp'];
const LEGAL_REFERENCES = [
  'TT 39/2018/TT-BTC mục 1.78 Phụ lục I',
  'CV 5189/TCHQ-GSQL (2019)',
  'CV 755/TCHQ-GSQL (2020)',
];

const GENERIC_RE = /\b(các loại|hàng tiêu dùng|hàng khác|một số|vài chiếc|nhiều loại)\b/i;

function plain(text) {
  return removeDiacritics(String(text || '').toLowerCase());
}

function tokenOverlap(a, b) {
  const ta = new Set(plain(a).split(/\s+/).filter((w) => w.length >= 3));
  const tb = new Set(plain(b).split(/\s+/).filter((w) => w.length >= 3));
  if (!ta.size || !tb.size) return 0;
  let hit = 0;
  for (const t of ta) {
    if (tb.has(t)) hit += 1;
  }
  return hit / Math.max(ta.size, tb.size);
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

  let donViTinh = d.donViTinh || context.unitVi || null;
  if (donViTinh) {
    const unit = getUnitByCode(donViTinh) || { nameVi: donViTinh };
    donViTinh = unit.nameVi || donViTinh;
  }

  const tinhTrangExplicit = d.tinhTrang || context.condition || null;

  return {
    tenHang: d.tenHang || d.productName || context.productName || null,
    xuatXu,
    donViTinh,
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

function validateDeclaration(declaration, hsCode, context = {}) {
  const warnings = [];
  const missingRequired = [];
  const missingRecommended = [];
  const chapterSpecificMissing = [];
  let score = 100;

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
    score -= 30;
  } else if (GENERIC_RE.test(declaration.tenHang)) {
    warnings.push({
      code: 'TOO_GENERIC',
      field: 'tenHang',
      severity: 'error',
      message: "Cấm từ mơ hồ ('các loại', 'một số'...) theo CV 5189/TCHQ-GSQL",
    });
    score -= 20;
  }

  for (const rule of matchAntiPatternRules(declaration.tenHang, 'tenHang')) {
    warnings.push({
      code: rule.code,
      field: 'tenHang',
      severity: rule.severity || 'error',
      message: `Phát hiện pattern không hợp lệ: ${rule.code}`,
    });
    score -= rule.scorePenalty || 10;
  }

  if (!declaration.xuatXu?.code || !declaration.xuatXu?.nameVi) {
    missingRequired.push('xuatXu');
    score -= 25;
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
    score -= 5;
  }

  if (!declaration.donViTinh) {
    missingRequired.push('donViTinh');
    score -= 20;
    warnings.push({
      code: 'UNIT_MISSING',
      field: 'donViTinh',
      severity: 'error',
      message: 'Thiếu đơn vị tính',
    });
  }

  if (!declaration.tinhTrang || !TINH_TRANG_ALLOWED.includes(declaration.tinhTrang)) {
    missingRequired.push('tinhTrang');
    score -= 20;
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
    score -= 20;
  } else if (declaration.tinhTrangDefaulted) {
    warnings.push({
      code: 'CONDITION_DEFAULTED',
      field: 'tinhTrang',
      severity: 'warn',
      message: 'tinhTrang được mặc định "Mới 100%" do input không có — cần xác nhận thực tế lô hàng',
      suggestion: 'Hàng đã qua sử dụng phải khai "Đã qua sử dụng" hoặc "Tân trang"',
    });
    score -= 5;
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
    score -= 8;
  }

  if (!declaration.model && context.model) {
    missingRecommended.push('model');
    score -= 5;
  }

  const specs = declaration.thongSoKyThuat || [];
  if (!specs.length) {
    missingRecommended.push('thongSoKyThuat');
    score -= 5;
  }

  if (chapterNum >= 39 && chapterNum <= 63 && !declaration.thanhPhanCauTao) {
    missingRecommended.push('thanhPhanCauTao');
    warnings.push({
      code: 'MISSING_MATERIAL',
      field: 'thanhPhanCauTao',
      severity: 'warn',
      message: `Chương ${chapter} khuyến nghị ghi thành phần/vật liệu`,
    });
    score -= 10;
  }

  if ((chapter === '84' || chapter === '85') && !specs.length) {
    warnings.push({
      code: 'MISSING_SPEC',
      field: 'thongSoKyThuat',
      severity: 'error',
      message: 'Máy móc/điện phải có ít nhất một thông số kỹ thuật',
    });
    score -= 20;
  }

  // Chapter-specific
  const rules = getChapterRules(chapter);
  for (const key of rules?.chapterSpecificRequired || []) {
    const val = declaration.chapterSpecific?.[key];
    if (val === null || val === undefined || val === '') {
      chapterSpecificMissing.push(key);
      warnings.push({
        code: `MISSING_${key.toUpperCase()}`,
        field: `chapterSpecific.${key}`,
        severity: 'warn',
        message: `Chương ${chapter} yêu cầu ${key}`,
        suggestion: `Bổ sung ${key} từ catalog/spec sheet`,
      });
      score -= 5;
    }
  }

  // HS mismatch (keyword overlap)
  if (context.tariffNameVi && declaration.tenHang) {
    const overlap = tokenOverlap(declaration.tenHang, context.tariffNameVi);
    if (overlap < 0.15) {
      warnings.push({
        code: 'MISMATCH_HS',
        field: 'tenHang',
        severity: 'error',
        message: 'Mô tả có vẻ không khớp tên mã HS trong biểu thuế',
        suggestion: `Tham chiếu: ${context.tariffNameVi}`,
      });
      score -= 25;
    }
  }

  // ECUS 200 ký tự: mô tả đầy đủ vượt limit sẽ bị compose tự rút gọn —
  // cảnh báo để NV biết phần thông số/công dụng có thể không vào tờ khai
  const composedMeta = composeWithMeta(declaration);
  if (composedMeta.fullLength > ECUS_MAX_LENGTH) {
    warnings.push({
      code: 'LENGTH_EXCEEDED',
      field: 'customsDescription',
      severity: 'warn',
      message: `Mô tả đầy đủ ${composedMeta.fullLength} ký tự > ${ECUS_MAX_LENGTH} (giới hạn ECUS) — đã tự rút gọn còn ${composedMeta.length}, giữ nguyên xuất xứ + tình trạng ở cuối`,
      suggestion: `Rút gọn thông số kỹ thuật/công dụng. Phần bị cắt: ${composedMeta.dropped.join(', ') || 'không'}`,
    });
    score -= 5;
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
    score -= 5;
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
    warnings,
    passesCustomsAudit: level !== 'REJECT' && !hasBlockingError,
    legalReferences: LEGAL_REFERENCES,
  };
}

module.exports = {
  validateDeclaration,
  normalizeDeclaration,
  TINH_TRANG_ALLOWED,
};
