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
const { parseAcfta, acftaForOrigin } = require('./acfta');
const { ftaChoXuatXu } = require('./fta'); // #251
const { tariffInfo } = require('./data-freshness');
const { vanBanQuanLyFromText } = require('./legal-docs');

// name/purpose: tên hàng + công dụng do ERP gửi (tuỳ chọn) — chỉ dùng cho cờ theo tên (policyByName).
function buildTaxLookup(hs, { origin = 'CN', xuatXu = null, name = null, purpose = null } = {}) {
  const result = mapTaxLookup(hs, { productNameVi: name, purposeVi: purpose });
  if (!result.found) return result;

  // #328: mảng số hiệu văn bản quản lý sạch (đã khử trùng, đủ đuôi Đ-CP) để cổng OZ
  // dùng cho `tra_thu_tuc_nhap_khau` — không cần tự regex trên policyByHs text nữa.
  const row = taxData[String(hs).replace(/\D/g, '')] || {};
  result.vanBanQuanLy = vanBanQuanLyFromText(row.cs || '');

  // Thủ tục kiểm tra chuyên ngành đã phân tích sẵn từ cột chính sách.
  const enriched = getEnrichedForHs(hs);
  const procedures = enriched?.warnings ? getProcedures(enriched.warnings) : [];
  if (procedures.length > 0) result.policyProcedures = procedures;

  // VAT: 1.561 mã KHÔNG được giảm theo NĐ 174/2025 dù biểu thuế ghi "10/8".
  // `taxVatReduction` đã có từ trước nhưng là văn xuôi — ERP không branch được.
  // Đây là bản đọc được bằng máy: eligible true/false + mức đang áp dụng.
  const vatInfo = vatReductionOf(row);
  if (vatInfo) result.vatReduction = vatInfo;

  // ACFTA: chuỗi "0 (-CN)" nghĩa là hàng Trung Quốc KHÔNG được 0%. Trả bản
  // đọc được bằng máy + mức áp cho nước xuất xứ người gọi hỏi (mặc định CN).
  const acfta = parseAcfta(row?.acfta);
  if (acfta) result.acfta = { ...acfta, forOrigin: acftaForOrigin(row.acfta, origin, row.mfn) };

  // #251: FTA đầy đủ theo xuất xứ — 16 FTA + RCEP 6 nhóm từ biểu gốc 2026.04.05.
  // Trả danh sách FTA áp dụng + mức tốt nhất + so MFN + loại C/O + căn cứ NĐ. KHÔNG khẳng định
  // hàng đạt ROO (quy tắc xuất xứ là điều kiện riêng của từng lô).
  try {
    const fta = ftaChoXuatXu(hs, origin);
    if (fta) {
      result.fta = {
        xuatXu: fta.origin,
        mfn: fta.mfn,
        totNhat: fta.totNhat,
        ghiChu: fta.ghiChu,
        danhSach: fta.ftaList.filter((f) => f.eligible !== false).map(({ fta: k, tenVi, co, eligible, rate, noteVi, canCu, needsReview }) => ({ fta: k, tenVi, co, eligible, rate, noteVi, canCu, needsReview })),
      };
    }
  } catch { /* biểu gốc khuyết → bỏ, không chặn tra thuế */ }

  // Biểu thuế hiệu lực từ ngày nào, đối chiếu lần cuối khi nào — trả lời không
  // có ngày là trả lời không kiểm chứng được (AGENTS.md).
  const tariff = tariffInfo();
  if (tariff) result.tariff = tariff;

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
