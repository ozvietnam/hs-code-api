const { requireAuthUnlessPublic } = require('../lib/public-access');
const { setCors, handleOptions } = require('../lib/cors');
const { mapTaxLookup } = require('../lib/tax-mapper');
const { getEnrichedForHs } = require('../lib/enriched-data');
const { getProcedures } = require('../lib/policy-procedures');
const { taxData } = require('../lib/data');
const { breadcrumbOf } = require('../lib/hs-breadcrumb');
const { vatReductionOf } = require('../lib/vat-reduction');

module.exports = function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (requireAuthUnlessPublic(req, res, { endpoint: 'tax' })) return;

  const { hs } = req.query;
  if (!hs) {
    return res.status(400).json({
      error: 'Missing hs parameter',
      example: '/api/tax?hs=39261000',
    });
  }

  const result = mapTaxLookup(hs);
  if (!result.found) {
    return res.status(404).json(result);
  }

  // Attach structured policy procedures when available
  const enriched = getEnrichedForHs(hs);
  const procedures = enriched?.warnings ? getProcedures(enriched.warnings) : [];
  if (procedures.length > 0) {
    result.policyProcedures = procedures;
  }

  // VAT: 1.561 mã KHÔNG được giảm theo NĐ 174/2025 dù biểu thuế ghi "10/8".
  // `taxVatReduction` phía trên đã có sẵn từ trước, nhưng là văn xuôi — ERP
  // không branch được trên đoạn văn. Đây là bản đọc được bằng máy: eligible
  // false/true, cộng với việc nói rõ thuế suất nào đang áp dụng.
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

  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
  return res.status(200).json(result);
};
