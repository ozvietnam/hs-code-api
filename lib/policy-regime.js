// lib/policy-regime.js — soát căn cứ chính sách (KTCN) theo khung 2026.
//
// Ô chính sách `cs` trong biểu thuế dẫn danh mục của từng bộ. Từ 01/7/2026 khung "nhóm 1/nhóm 2"
// bị thay bằng 3 mức rủi ro (NĐ 37/2026/NĐ-CP) và các bộ ra danh mục mới (data/ktcn-regime-2026.json).
// Module này KHÔNG đổi mã HS hay kết luận chính sách: chỉ báo dòng nào còn dẫn căn cứ cũ, văn bản
// mới nào cần đối chiếu, mức tin cậy bao nhiêu — để ERP/nhân viên không khai theo danh mục đã hết.

const fs = require('fs');
const { dataReadPath } = require('./data-paths');
const plhq = require('./plhq-registry');

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
  const matchedRules = [];
  for (const r of rules) {
    if (!r.res.some((re) => re.test(text))) continue;
    matchedRules.push(r);
    const pending = r.effectiveFrom && asOf < r.effectiveFrom;
    items.push({
      id: r.id,
      source: 'hs-code-api',
      labelVi: r.labelVi,
      relation: pending ? 'UPCOMING' : r.relation,
      confidence: r.confidence,
      effectiveFrom: r.effectiveFrom || null,
      replacedBy: (r.replacedBy || []).map(listInfo),
      noteVi: r.noteVi,
    });
  }

  // Sổ đăng ký cộng đồng (oz-wiki-plhq): văn bản được dẫn đã hết hiệu lực / đang tạm ngưng mà quy
  // tắc riêng ở trên chưa bắt. Chưa đối chiếu nguồn A ở kho cộng đồng → tin cậy MEDIUM, không HIGH.
  const reg = plhq.registryReview(csText);
  for (const c of reg?.citations || []) {
    if (!c.found || !['HET_HIEU_LUC', 'TAM_NGUNG_HIEU_LUC'].includes(c.tinhTrang)) continue;
    if (c.hetHieuLucTu && asOf < c.hetHieuLucTu) continue;
    const cited = normalizeCs(c.cited);
    if (matchedRules.some((r) => r.res.some((re) => re.test(cited)))) continue;
    const replacedBy = [...c.biThayTheBoi, ...c.biBaiBoBoi];
    items.push({
      id: `plhq:${c.soHieu}`,
      source: 'oz-wiki-plhq',
      labelVi: `${c.soHieu} — ${c.ten}`,
      relation: c.tinhTrang === 'TAM_NGUNG_HIEU_LUC' ? 'SUSPENDED' : replacedBy.length ? 'REPLACED' : 'EXPIRED',
      confidence: c.hieuLucDaDoiChieu ? 'HIGH' : 'MEDIUM',
      effectiveFrom: c.hetHieuLucTu || null,
      replacedBy: replacedBy.map((code) => ({ code, ...(plhq.lookup(code) ? { ten: plhq.lookup(code).ten } : {}) })),
      noteVi: `Sổ đăng ký cộng đồng ghi ${c.soHieu} ${c.tinhTrang === 'TAM_NGUNG_HIEU_LUC' ? 'đang tạm ngưng hiệu lực' : 'đã hết hiệu lực'}${c.hetHieuLucTu ? ` từ ${c.hetHieuLucTu}` : ''}${replacedBy.length ? `, thay bởi ${replacedBy.join(', ')}` : ''}.${c.hieuLucDaDoiChieu ? '' : ' Kho cộng đồng CHƯA đối chiếu nguồn A — kiểm lại trước khi dùng.'}`,
      url: c.url,
    });
  }

  if (!items.length) return null;
  const outdated = items.some((i) => ['REPLACED', 'LIKELY_REPLACED', 'EXPIRED', 'SUSPENDED'].includes(i.relation));
  return {
    status: outdated ? 'OUTDATED_BASIS' : 'NEEDS_REVIEW',
    items,
    noteVi: outdated
      ? 'Chính sách của mã này đang dẫn văn bản đã hết hiệu lực hoặc đã được thay (khung KTCN 2026 / sổ đăng ký cộng đồng oz-wiki-plhq). Dữ liệu CHƯA đối chiếu mã với văn bản mới — kiểm tra văn bản mới trước khi khai/đặt hàng.'
      : 'Căn cứ chính sách của mã này cần đối chiếu với văn bản mới năm 2026 (xem items).',
    asOf,
    dataVersion: raw.version || null,
    registryVersion: reg?.registryVersion || null,
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
