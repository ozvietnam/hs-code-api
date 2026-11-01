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
const { phatHienTruong, nguonChu, coThongSoTrongChu } = require('./truong-dac-thu');

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

const RESIDUAL_STOP = new Set(['loai', 'khac', 'cac', 'hoac', 'bang', 'cua', 'cho', 'voi', 'khong', 'nhung', 'tren', 'duoi', 'da', 'sen', 'dung', 'chi', 'tiet', 'phan']);

function isResidualName(name) {
  return /^[-\s]*lo[aạ]i kh[aá]c\b/i.test(String(name || '').trim());
}

let _headingVocab = null;
/** Từ vựng (không dấu, ≥3 ký tự) của mọi dòng trong một nhóm 4 số. */
function headingVocab(hs4) {
  if (!_headingVocab) {
    _headingVocab = new Map();
    const { taxData } = require('./data');
    for (const r of Object.values(taxData)) {
      const h = r.hs.slice(0, 4);
      if (!_headingVocab.has(h)) _headingVocab.set(h, new Set());
      const set = _headingVocab.get(h);
      for (const t of plain(r.vn).split(/[^a-z0-9]+/)) {
        if (t.length >= 3 && !RESIDUAL_STOP.has(t)) set.add(t);
      }
    }
  }
  return _headingVocab.get(String(hs4)) || new Set();
}

function headingVocabOverlap(text, hsCode) {
  const vocab = headingVocab(String(hsCode || '').slice(0, 4));
  return plain(text).split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && vocab.has(t)).length;
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

  if (!declaration.donViTinh) {
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

  // HS mismatch (keyword overlap)
  // Mã "Loại khác" có tên dòng chỉ là "- - - Loại khác" → so riêng tên dòng thì
  // MỌI mô tả đúng đều bị báo lệch (VD máy bơm ly tâm → 84137019). Với mã
  // residual: so với từ vựng của cả nhóm 4 số, chỉ báo khi KHÔNG trùng từ nào.
  if (context.tariffNameVi && declaration.tenHang) {
    const residual = isResidualName(context.tariffNameVi);
    const overlap = residual
      ? (headingVocabOverlap(declaration.tenHang, hsCode) > 0 ? 1 : 0)
      : tokenOverlap(declaration.tenHang, context.tariffNameVi);
    if (overlap < 0.15) {
      warnings.push({
        code: 'MISMATCH_HS',
        field: 'tenHang',
        severity: 'error',
        message: 'Mô tả có vẻ không khớp tên mã HS trong biểu thuế',
        suggestion: `Tham chiếu: ${context.tariffNameVi}`,
      });
      tru('MISMATCH_HS', 25);
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
  TINH_TRANG_ALLOWED,
};
