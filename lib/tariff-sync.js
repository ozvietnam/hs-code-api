/**
 * Logic thuần của scripts/sync-tariff.mjs — tách ra để test được.
 *
 * VÌ SAO VIẾT LẠI (các lỗi làm hỏng biểu thuế của bản cũ):
 *   1. Nguồn XLSX gán cứng `tt:'', bvmt:''` rồi merge `{...current, ...rec}` →
 *      ghi đè thuế thông thường + cờ BVMT của 11.871 dòng thành rỗng. Nay CHỈ
 *      ghi trường mà nguồn THẬT SỰ có cột/khoá.
 *   2. Cột "Thuế xuất khẩu" bị map vào `tt` — nhưng `tt` là thuế NK THÔNG
 *      THƯỜNG (= 150% MFN). Đã bỏ alias sai.
 *   3. Mã 6 số bị đệm "0" thành 8 số (dòng tiêu đề phân nhóm "847130" →
 *      "84713000" — mã không tồn tại). Nay chỉ nhận đúng 8 chữ số.
 *   4. Mã vắng mặt trong file nguồn (file chỉ có một chương) bị XOÁ khỏi biểu.
 *      Nay chỉ xoá khi gọi rõ `allowRemove`.
 */

/** Chỉ nhận mã đúng 8 chữ số (bỏ dấu chấm/khoảng trắng). */
function normalizeHs8(raw) {
  const s = String(raw ?? '').replace(/\D/g, '');
  return s.length === 8 ? s : null;
}

function parseRate(raw) {
  if (raw == null) return '';
  return String(raw).replace(/\s/g, '').trim();
}

// Trường → các tên khoá/tiêu đề cột chấp nhận. KHÔNG có "Thuế xuất khẩu".
const FIELD_ALIASES = {
  vn: ['vn', 'nameVi', 'Mô tả tiếng Việt'],
  en: ['en', 'nameEn', 'Mô tả tiếng Anh'],
  dvt: ['dvt', 'unit', 'Đơn vị'],
  mfn: ['mfn', 'Thuế MFN', 'MFN'],
  tt: ['tt', 'Thuế thông thường'],
  vat: ['vat', 'Thuế VAT', 'VAT'],
  acfta: ['acfta', 'Thuế ACFTA', 'ACFTA'],
  bvmt: ['bvmt', 'Thuế BVMT'],
  cs: ['cs', 'policy', 'Chính sách'],
  giam_vat: ['giam_vat', 'Giảm VAT'],
};
const RATE_FIELDS = new Set(['mfn', 'tt', 'vat', 'acfta', 'bvmt']);

/**
 * Một dòng nguồn JSON → bản ghi CHỈ gồm các trường nguồn có khoá.
 * @returns {object|null}
 */
function recordFromJsonRow(row) {
  const hs = normalizeHs8(row?.hs ?? row?.hsCode ?? row?.['Mã HS']);
  if (!hs) return null;
  const rec = { hs };
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const key = aliases.find((k) => Object.prototype.hasOwnProperty.call(row, k));
    if (key === undefined) continue;
    rec[field] = RATE_FIELDS.has(field) ? parseRate(row[key]) : String(row[key] ?? '').trim();
  }
  return rec;
}

/**
 * Dò cột XLSX theo tiêu đề. Trả map field → tên cột (chỉ các cột tìm thấy).
 */
function detectXlsxColumns(headers) {
  const find = (...cands) => headers.find((h) => cands.some((c) => h.toLowerCase().includes(c.toLowerCase()))) || null;
  const cols = {
    hs: find('Mã HS', 'HS'),
    vn: find('Mô tả', 'Tiếng Việt', 'nameVi'),
    en: find('English', 'Tiếng Anh', 'nameEn'),
    dvt: find('Đơn vị', 'DVT', 'Unit'),
    mfn: find('MFN', 'Most'),
    tt: find('Thông thường'),
    vat: find('VAT', 'Giá trị gia tăng'),
    acfta: find('ACFTA', 'ASEAN-China', 'ASEAN - Trung Quốc'),
    bvmt: find('BVMT', 'Bảo vệ môi trường'),
    cs: find('Chính sách', 'Policy', 'Điều kiện'),
  };
  // "MFN"/"Ưu đãi" và "Thông thường" không được trỏ cùng một cột.
  if (cols.tt && cols.tt === cols.mfn) cols.mfn = null;
  return Object.fromEntries(Object.entries(cols).filter(([, v]) => v));
}

function recordFromXlsxRow(row, cols) {
  const hs = normalizeHs8(row[cols.hs]);
  if (!hs) return null;
  const rec = { hs };
  for (const [field, col] of Object.entries(cols)) {
    if (field === 'hs') continue;
    rec[field] = RATE_FIELDS.has(field) ? parseRate(row[col]) : String(row[col] ?? '').trim();
  }
  return rec;
}

const DIFF_FIELDS = ['vn', 'en', 'dvt', 'mfn', 'tt', 'vat', 'acfta', 'bvmt', 'cs', 'giam_vat'];

/** Diff chỉ trên các trường nguồn có. */
function computeDiff(current, incoming) {
  const added = [];
  const removed = [];
  const changed = [];
  for (const [hs, rec] of Object.entries(incoming)) {
    if (!current[hs]) { added.push(hs); continue; }
    const fields = DIFF_FIELDS.filter((f) => f in rec
      && String(current[hs][f] ?? '').trim() !== String(rec[f] ?? '').trim());
    if (fields.length) {
      changed.push({
        hs,
        fields,
        before: Object.fromEntries(fields.map((f) => [f, current[hs][f]])),
        after: Object.fromEntries(fields.map((f) => [f, rec[f]])),
      });
    }
  }
  for (const hs of Object.keys(current)) if (!incoming[hs]) removed.push(hs);
  return { added, removed, changed };
}

/**
 * Gộp: trường nguồn có → ghi đè; trường nguồn không có → giữ nguyên.
 * Mã mới thiếu trường → điền '' để đủ schema.
 * Mã vắng mặt trong nguồn chỉ bị xoá khi allowRemove.
 */
function mergeTariff(current, incoming, { allowRemove = false } = {}) {
  const merged = { ...current };
  for (const [hs, rec] of Object.entries(incoming)) {
    const base = current[hs] || Object.fromEntries(['hs', ...DIFF_FIELDS].map((f) => [f, '']));
    merged[hs] = { ...base, ...rec, hs };
  }
  let removed = 0;
  if (allowRemove) {
    for (const hs of Object.keys(current)) {
      if (!incoming[hs]) { delete merged[hs]; removed += 1; }
    }
  }
  return { merged, removed };
}

module.exports = {
  normalizeHs8,
  recordFromJsonRow,
  detectXlsxColumns,
  recordFromXlsxRow,
  computeDiff,
  mergeTariff,
  FIELD_ALIASES,
};
