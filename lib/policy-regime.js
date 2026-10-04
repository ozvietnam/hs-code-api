// lib/policy-regime.js — soát căn cứ chính sách (KTCN) theo khung 2026.
//
// Ô chính sách `cs` trong biểu thuế dẫn danh mục của từng bộ. Từ 01/7/2026 khung "nhóm 1/nhóm 2"
// bị thay bằng 3 mức rủi ro (NĐ 37/2026/NĐ-CP) và các bộ ra danh mục mới (data/ktcn-regime-2026.json).
// Module này KHÔNG đổi mã HS hay kết luận chính sách: chỉ báo dòng nào còn dẫn căn cứ cũ, văn bản
// mới nào cần đối chiếu, mức tin cậy bao nhiêu — để ERP/nhân viên không khai theo danh mục đã hết.

const fs = require('fs');
const { dataReadPath } = require('./data-paths');

let _regime = null;
function loadRegime() {
  if (_regime) return _regime;
  try {
    const raw = JSON.parse(fs.readFileSync(dataReadPath('ktcn-regime-2026.json'), 'utf8'));
    const lists = new Map((raw.lists || []).map((d) => [d.code, d]));
    const rules = (raw.superseded || []).map((r) => ({ ...r, res: r.patterns.map((p) => new RegExp(p, 'i')) }));
    _regime = { raw, lists, rules };
  } catch {
    _regime = { raw: {}, lists: new Map(), rules: [] };
  }
  return _regime;
}

// Chữ trong `cs` viết đủ kiểu: QĐ/QD, BLĐTBXH/BLDTBXH. Đưa về một dạng trước khi so.
function normalizeCs(text) {
  return String(text || '').toUpperCase().replace(/Đ/g, 'D');
}

function listInfo(code) {
  const d = loadRegime().lists.get(code);
  if (!d) return { code };
  return {
    code: d.code,
    ministry: d.ministry,
    scopeVi: d.scopeVi,
    effectiveDate: d.effectiveDate,
    verification: d.verification,
  };
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * policyBasisReview(csText, { asOf }) → null | {
 *   status: 'OUTDATED_BASIS' | 'NEEDS_REVIEW',
 *   items: [{ id, labelVi, relation, confidence, effectiveFrom, replacedBy:[{code, ministry, scopeVi, effectiveDate, verification}], noteVi }],
 *   noteVi, asOf, dataVersion
 * }
 * OUTDATED_BASIS: có ít nhất một căn cứ đã bị thay (HIGH/MEDIUM) và đã tới ngày hiệu lực.
 * Văn bản thay chưa tới ngày hiệu lực → relation 'UPCOMING', không tính là cũ.
 */
function policyBasisReview(csText, { asOf = today() } = {}) {
  const text = normalizeCs(csText);
  if (!text.trim()) return null;
  const { raw, rules } = loadRegime();
  const items = [];
  for (const r of rules) {
    if (!r.res.some((re) => re.test(text))) continue;
    const pending = r.effectiveFrom && asOf < r.effectiveFrom;
    items.push({
      id: r.id,
      labelVi: r.labelVi,
      relation: pending ? 'UPCOMING' : r.relation,
      confidence: r.confidence,
      effectiveFrom: r.effectiveFrom || null,
      replacedBy: (r.replacedBy || []).map(listInfo),
      noteVi: r.noteVi,
    });
  }
  if (!items.length) return null;
  const outdated = items.some((i) => i.relation === 'REPLACED' || i.relation === 'LIKELY_REPLACED');
  return {
    status: outdated ? 'OUTDATED_BASIS' : 'NEEDS_REVIEW',
    items,
    noteVi: outdated
      ? 'Chính sách của mã này đang dẫn danh mục đã được thay từ khung KTCN 2026 (NĐ 37/2026/NĐ-CP, 3 mức rủi ro). Dữ liệu CHƯA đối chiếu mã với danh mục mới — kiểm tra văn bản mới trước khi khai/đặt hàng.'
      : 'Căn cứ chính sách của mã này cần đối chiếu với văn bản mới năm 2026 (xem items).',
    asOf,
    dataVersion: raw.version || null,
  };
}

/** Trạng thái theo khung 2026 của một số hiệu văn bản (cho legalCitations). */
function regimeStatusForCode(code) {
  const text = normalizeCs(code);
  if (!text) return null;
  const r = loadRegime().rules.find((x) => x.res.some((re) => re.test(text)));
  if (!r) return null;
  return { relation: r.relation, confidence: r.confidence, replacedBy: r.replacedBy, effectiveFrom: r.effectiveFrom };
}

/** Toàn bộ khung (cho /api/dataset + tài liệu). */
function regimeSummary() {
  const { raw } = loadRegime();
  return {
    version: raw.version || null,
    asOf: raw.asOf || null,
    framework: raw.framework || null,
    lists: raw.lists || [],
    superseded: (raw.superseded || []).map(({ patterns, ...rest }) => rest),
    sources: raw.sources || [],
  };
}

module.exports = { policyBasisReview, regimeStatusForCode, regimeSummary, normalizeCs };
