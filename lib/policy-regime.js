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

// Ngày hiệu lực là ngày lịch Việt Nam (UTC+7) — không dùng ngày UTC (lệch 7 giờ đầu mỗi ngày).
const today = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

/**
 * Quy tắc nào khớp đoạn chữ, và khớp vào số hiệu nào (khoá chuẩn, đã bỏ hậu tố phụ lục).
 * Quy tắc có thể gắn với phụ lục (-PL2, M1) nên phải khớp trên chữ ĐẦY ĐỦ rồi mới quy về số hiệu —
 * khớp trên số hiệu trần sẽ trượt.
 */
function ruleHits(csText) {
  const text = normalizeCs(csText);
  const hits = [];
  for (const r of loadRegime().rules) {
    const keys = new Set();
    for (const re of r.res) {
      const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
      for (const m of text.matchAll(g)) {
        // Lấy đoạn từ vị trí khớp tới hết số hiệu để rút khoá chuẩn.
        const tail = text.slice(m.index, m.index + 60);
        for (const c of plhq.trichSoHieu(tail).slice(0, 1)) keys.add(c.khoa);
      }
    }
    if (keys.size) hits.push({ rule: r, keys });
  }
  return hits;
}

function relationAt(rule, asOf) {
  return rule.effectiveFrom && asOf < rule.effectiveFrom ? 'UPCOMING' : rule.relation;
}

/**
 * policyBasisReview(csText, { asOf }) → null | {
 *   status: 'OUTDATED_BASIS' | 'NEEDS_REVIEW',
 *   items: [{ id, labelVi, relation, confidence, effectiveFrom, replacedBy:[{code, ministry, scopeVi, effectiveDate, verification}], noteVi }],
 *   noteVi, asOf, dataVersion
 * }
 * OUTDATED_BASIS: có ít nhất một căn cứ đã bị thay (HIGH/MEDIUM) và đã tới ngày hiệu lực.
 * Văn bản thay chưa tới ngày hiệu lực → relation 'UPCOMING', không tính là cũ.
 */
function policyBasisReview(csText, { asOf = today(), registry } = {}) {
  const text = normalizeCs(csText);
  if (!text.trim()) return null;
  const { raw } = loadRegime();
  const items = [];
  const hits = ruleHits(csText);
  const ruleKeys = new Set(hits.flatMap((h) => [...h.keys]));
  for (const { rule: r } of hits) {
    items.push({
      id: r.id,
      source: 'hs-code-api',
      labelVi: r.labelVi,
      relation: relationAt(r, asOf),
      confidence: r.confidence,
      effectiveFrom: r.effectiveFrom || null,
      replacedBy: (r.replacedBy || []).map(listInfo),
      noteVi: r.noteVi,
    });
  }

  // Sổ đăng ký cộng đồng (oz-wiki-plhq): văn bản được dẫn đã hết hiệu lực / đang tạm ngưng mà quy
  // tắc riêng ở trên chưa bắt. Chưa đối chiếu nguồn A ở kho cộng đồng → tin cậy MEDIUM, không HIGH.
  const reg = registry === undefined ? plhq.registryReview(csText) : registry;
  for (const c of reg?.citations || []) {
    if (!c.found || !['HET_HIEU_LUC', 'TAM_NGUNG_HIEU_LUC'].includes(c.tinhTrang)) continue;
    if (c.hetHieuLucTu && asOf < c.hetHieuLucTu) continue;
    if (ruleKeys.has(plhq.khoa(c.soHieu)) || ruleKeys.has(plhq.khoa(c.cited))) continue; // quy tắc riêng đã báo
    const replacedBy = [...c.biThayTheBoi, ...c.biBaiBoBoi];
    // Chỉ khẳng định "đã bị thay" khi kho cộng đồng đã đối chiếu nguồn A; chưa thì "gần chắc bị thay".
    const replacedRel = c.hieuLucDaDoiChieu ? 'REPLACED' : 'LIKELY_REPLACED';
    items.push({
      id: `plhq:${c.soHieu}`,
      source: 'oz-wiki-plhq',
      labelVi: `${c.soHieu} — ${c.ten}`,
      relation: c.tinhTrang === 'TAM_NGUNG_HIEU_LUC' ? 'SUSPENDED' : replacedBy.length ? replacedRel : 'EXPIRED',
      confidence: c.hieuLucDaDoiChieu ? 'HIGH' : 'MEDIUM',
      effectiveFrom: c.hetHieuLucTu || null,
      replacedBy: replacedBy.map((code) => { const d = plhq.lookup(code); return d ? { code, ten: d.ten } : { code }; }),
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

/**
 * Trạng thái theo khung 2026 của một số hiệu văn bản (cho legalCitations / legalDocs).
 * csText: chữ chính sách đầy đủ của mã HS — cần để phân biệt phụ lục (1182 PL1 ≠ PL2) và M1.
 */
function regimeStatusForCode(code, { csText, asOf = today() } = {}) {
  if (!code) return null;
  const want = plhq.khoa(plhq.trichSoHieu(code)[0]?.raw || code);
  const hits = ruleHits(csText || code).filter((h) => h.keys.has(want));
  if (!hits.length) return null;
  const r = hits[0].rule;
  return { relation: relationAt(r, asOf), confidence: r.confidence, replacedBy: r.replacedBy, effectiveFrom: r.effectiveFrom, ruleId: r.id };
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
