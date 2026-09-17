/**
 * Một hàm duy nhất dựng kết quả tra thuế theo mã — cho CẢ api/tax.js lẫn bản
 * tĩnh scripts/build-static.mjs.
 *
 * VÌ SAO PHẢI GOM: bản tĩnh ghi "Mirror api/tax.js" rồi chép tay ba dòng làm
 * giàu. Khi api/tax.js có thêm vatReduction và breadcrumb, bản tĩnh không có —
 * mặt CDN cho cộng đồng lệch API mà không test nào kêu. Cùng bệnh với
 * lib/kg-stats.js trước đây: chép tay thì trôi, dùng chung một hàm thì không.
 *
 * Trả về đúng shape api/tax.js đang trả. `found: false` thì trả nguyên như thế
 * để handler tự chọn mã HTTP.
 */
const { mapTaxLookup } = require('./tax-mapper');
const { getEnrichedForHs } = require('./enriched-data');
const { getProcedures } = require('./policy-procedures');
const { taxData } = require('./data');
const { breadcrumbOf } = require('./hs-breadcrumb');
const { vatReductionOf } = require('./vat-reduction');

function buildTaxLookup(hs) {
  const result = mapTaxLookup(hs);
  if (!result.found) return result;

  // Thủ tục kiểm tra chuyên ngành đã phân tích sẵn từ cột chính sách.
  const enriched = getEnrichedForHs(hs);
  const procedures = enriched?.warnings ? getProcedures(enriched.warnings) : [];
  if (procedures.length > 0) result.policyProcedures = procedures;

  // VAT: 1.561 mã KHÔNG được giảm theo NĐ 174/2025 dù biểu thuế ghi "10/8".
  // `taxVatReduction` đã có từ trước nhưng là văn xuôi — ERP không branch được.
  // Đây là bản đọc được bằng máy: eligible true/false + mức đang áp dụng.
  const row = taxData[String(hs).replace(/\D/g, '')];
  const vatInfo = vatReductionOf(row);
  if (vatInfo) result.vatReduction = vatInfo;

  // Với mã tên đúng bằng "Loại khác" thì bản thân dòng kết quả vô nghĩa —
  // breadcrumb cho biết mã nằm ở đâu và phạm vi thật của nó là gì.
  const crumb = breadcrumbOf(hs);
  if (crumb) {
    result.breadcrumb = {
      trail: crumb.trail,
      levels: crumb.levels,
      isResidual: crumb.isResidual,
      ...(crumb.scopeVi ? { scopeVi: crumb.scopeVi } : {}),
      ...(crumb.excludesVi.length ? { excludesVi: crumb.excludesVi } : {}),
    };
  }

  return result;
}

module.exports = { buildTaxLookup };
