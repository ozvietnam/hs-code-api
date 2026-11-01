// lib/describe-attributes.js — thông số đã chuẩn hóa (ERP gửi theo khóa chuẩn của
// hs-code-api) → các ô của /api/describe (kế hoạch OZSource H5).
//
// Nhận { material: "inox 304", power: "1500W" } hoặc [{ key, valueVi|value, unit }].
// Giá trị còn chữ Hán bị bỏ: mô tả ECUS không được có chữ Trung (CJK_IN_DECLARATION).

const { dictionary } = require('./zh-specs');
const { fieldCatalog } = require('./compliance-data');
const { resolveCanonical, registry } = require('./attributes');

const CJK = /[㐀-鿿]/;
// Khóa đi vào ô riêng của mô tả; các khóa khác gộp vào thông số kỹ thuật. Nhận cả khoá tiếng Việt camelCase mà Cổng OZ gửi
// (thongSo của sinh_mo_ta_khai_bao: congDung, chatLieu, model, nhanHieu…) — #725 lỗi 13.
const SLOT = {
  material: 'material', chatLieu: 'material', vatLieu: 'material', thanhPhan: 'material',
  brand: 'brand', nhanHieu: 'brand', thuongHieu: 'brand',
  modelNumber: 'model', model: 'model', maModel: 'model', maHang: 'model', partNumber: 'model',
  application: 'purpose', congDung: 'purpose', mucDich: 'purpose',
};
// Khoá tiếng Việt camelCase hay gặp → khoá chuẩn của data/chapter-declaration-fields.json (để lấy nhãn tiếng Việt).
const KHOA_VI = {
  dongDien: 'currentRating', dongDinhMuc: 'currentRating', dienAp: 'voltage', congSuat: 'power', congSuatLaser: 'power',
  tanSo: 'frequency', soCuc: 'poleCount', soChan: 'poleCount', kichThuoc: 'dimensions', apSuat: 'pressureRating',
  doPhanGiai: 'resolution', kichThuocManHinh: 'screenSize', dienApRa: 'outputVoltage', dienApVao: 'voltagePrimary',
  nguyenLy: 'principle', daiDo: 'measurementType', loaiVan: 'valveType', kieuDauNoi: 'connectorType',
};
// Nhãn riêng cho vài khoá mà nhãn chuẩn chưa đúng nghĩa (công suất laser ≠ công suất chung).
const NHAN_RIENG = { congSuatLaser: 'Công suất laser', giaoDien: 'Giao tiếp', giaoTiep: 'Giao tiếp', tocDo: 'Tốc độ', kichThuocBan: 'Kích thước bàn', doChinhXac: 'Độ chính xác' };

/**
 * Nhãn tiếng Việt của một khoá thông số. KHÔNG BAO GIỜ trả lại khoá thô camelCase ("dienAp") — chữ nội bộ không được lọt
 * vào câu khai ECUS (#725 lỗi 15/31). Không biết nhãn → null (giá trị đứng một mình).
 */
function labelOf(key) {
  if (NHAN_RIENG[key]) return NHAN_RIENG[key];
  const canon = KHOA_VI[key] || resolveCanonical(key);
  const nhan = fieldCatalog.fields?.[key]?.labelVi || fieldCatalog.fields?.[canon]?.labelVi
    || dictionary().keys?.[key]?.labelVi || dictionary().keys?.[canon]?.labelVi || registry()[canon]?.labelVi || null;
  if (nhan) return nhan;
  // Khoá đã là chữ thường có dấu/khoảng trắng ("điện áp") thì dùng được; định danh camelCase/ascii thì không.
  return /^[a-z][A-Za-z0-9_]*$/.test(String(key)) && /[A-Z_]|^[a-z0-9]+$/.test(String(key)) ? null : String(key);
}

function entriesOf(input) {
  if (Array.isArray(input)) {
    return input
      .filter((a) => a && a.key)
      .map((a) => [a.key, [a.valueVi ?? a.value, a.unit && !String(a.valueVi ?? a.value).includes(a.unit) ? a.unit : null].filter(Boolean).join(' ')]);
  }
  if (input && typeof input === 'object') return Object.entries(input);
  return [];
}

/**
 * describeAttributes(input) → { material, brand, model, purpose, technicalSpec, used:[key], skipped:[{key, reason}] }
 */
function describeAttributes(input) {
  const out = { material: null, brand: null, model: null, purpose: null, technicalSpec: null, used: [], skipped: [] };
  const specs = [];
  for (const [key, raw] of entriesOf(input)) {
    const value = raw == null ? '' : String(raw).replace(/\s+/g, ' ').trim();
    if (!value) continue;
    if (CJK.test(value)) {
      out.skipped.push({ key, reason: 'Giá trị còn chữ Hán — dịch sang tiếng Việt trước (POST /api/extract-specs) rồi gửi lại' });
      continue;
    }
    const slot = SLOT[key];
    if (slot) out[slot] = value.slice(0, 120);
    else {
      const nhan = labelOf(key);
      specs.push(nhan ? `${nhan}: ${value.slice(0, 80)}` : value.slice(0, 80));
    }
    out.used.push(key);
  }
  out.technicalSpec = specs.length ? specs.join('; ') : null;
  out.specs = specs;
  return out;
}

module.exports = { describeAttributes };
