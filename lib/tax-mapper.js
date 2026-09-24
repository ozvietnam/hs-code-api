const { getTaxRecord, normalizeHs } = require('./data');
const { acftaForOrigin } = require('./acfta');
const { getEnrichedForHs } = require('./enriched-data');
const { enrichLegalCitations, getDocByCode } = require('./legal-docs');
const { getTreeMeta } = require('./tree-metadata');
const { expandMinistryCodes, getMinistriesByChapter } = require('./ministries');

function heuristicWarnings(csText) {
  const t = String(csText || '');
  return {
    requiresLicense: /giấy phép|giay phep/i.test(t),
    requiresInspection: /kiểm tra|kiem tra|CR\b/i.test(t),
    requiresQuarantine: /kiểm dịch|kiem dich/i.test(t),
    dualUseControl: /mật mã|mat ma|chuyên dụng|chuyen dung/i.test(t),
    ministryCodes: extractMinistries(t),
    summary: summarizePolicy(t),
  };
}

/**
 * Ô chính sách (`cs`) TRỐNG không có nghĩa là mặt hàng không chịu chính sách
 * quản lý: 3.943 dòng trống, trong đó có insulin (30033100), súng săn
 * (93033010), thuốc nổ chương 36… Trước đây API trả hasPolicyWarning=false —
 * người dùng hiểu là "không cần giấy phép". Nay trả policyStatus rõ ràng.
 */
const HIGH_RISK_CHAPTERS = new Set(['30', '36', '93']); // dược phẩm, thuốc nổ, vũ khí
let _chapterPolicyRatio = null;
function chapterPolicyRatio(ch) {
  if (!_chapterPolicyRatio) {
    const acc = {};
    for (const r of Object.values(require('./data').taxData)) {
      const c = r.hs.slice(0, 2);
      acc[c] = acc[c] || [0, 0];
      acc[c][0] += 1;
      if (String(r.cs || '').trim()) acc[c][1] += 1;
    }
    _chapterPolicyRatio = Object.fromEntries(Object.entries(acc).map(([c, [n, p]]) => [c, p / n]));
  }
  return _chapterPolicyRatio[ch] ?? 0;
}

function policyStatusOf(record) {
  if (String(record.cs || '').trim()) return { policyStatus: 'RECORDED' };
  const ch = record.hs.slice(0, 2);
  const ratio = chapterPolicyRatio(ch);
  const risky = HIGH_RISK_CHAPTERS.has(ch) || ratio >= 0.5;
  return {
    policyStatus: 'NOT_RECORDED',
    policyNoteVi:
      'Dữ liệu CHƯA ghi nhận chính sách quản lý cho mã này — không có nghĩa là không có. ' +
      (risky
        ? `${Math.round(ratio * 100)}% mã cùng chương ${ch} có chính sách quản lý chuyên ngành; bắt buộc kiểm tra giấy phép/kiểm tra chuyên ngành trước khi nhập.`
        : 'Kiểm tra văn bản quản lý chuyên ngành nếu hàng có tính chất đặc thù.'),
    policyNoteSeverity: risky ? 'warning' : 'info',
  };
}

/**
 * Chương 98: mỗi dòng có "mã hàng tương ứng tại Mục I" (trường `ma_tuong_ung`,
 * xem scripts/fix-chapter98-mapped.mjs). VAT, chính sách, tên tiếng Anh theo
 * mã tương ứng — trả kèm để người khai đối chiếu, KHÔNG tự điền vào ô thuế.
 */
function mappedHsOf(record) {
  const raw = String(record.ma_tuong_ung || '').trim();
  if (!raw) return null;
  const noteVi = 'Mã chương 98 — VAT, chính sách quản lý và tên tiếng Anh theo mã hàng tương ứng tại Mục I Phụ lục II.';
  if (/^\d{8}$/.test(raw)) {
    const m = getTaxRecord(raw);
    return {
      hsCode: raw,
      nameVi: m?.vn || null,
      nameEn: m?.en || null,
      unitVi: m?.dvt || null,
      taxVat: m?.vat || null,
      policyByHs: m?.cs || null,
      noteVi,
    };
  }
  if (/^\d{4}$/.test(raw)) return { heading: raw, noteVi };
  return { noteVi: raw };
}

/**
 * 31 dòng (đường, muối, trứng, lá thuốc…) ghi thuế trong/ngoài hạn ngạch gộp
 * một chuỗi: mfn "25 (NHN: 80)" — 25% trong hạn ngạch, 80% ngoài hạn ngạch
 * (NHN). Tách ra để ERP không đọc nhầm số đầu.
 */
function quotaOf(record) {
  const re = /^\s*(\d+(?:\.\d+)?)\s*\(\s*NHN\s*:\s*(\d+(?:\.\d+)?)\s*\)\s*$/i;
  const m = String(record.mfn || '').match(re);
  if (!m) return null;
  const t = String(record.tt || '').match(re);
  return {
    mfnInQuota: Number(m[1]),
    mfnOutQuota: Number(m[2]),
    ...(t ? { ttInQuota: Number(t[1]), ttOutQuota: Number(t[2]) } : {}),
    noteVi: `Mặt hàng áp dụng hạn ngạch thuế quan: ${m[1]}% trong hạn ngạch, ${m[2]}% ngoài hạn ngạch (NHN). Chỉ hưởng mức trong hạn ngạch khi có phân giao hạn ngạch.`,
  };
}

function mapTaxRecord(record) {
  if (!record) return null;

  const hasPolicy = Boolean(record.cs && String(record.cs).trim());
  const enrichedRow = getEnrichedForHs(record.hs);
  const enrichedWarnings = enrichedRow && enrichedRow.warnings && typeof enrichedRow.warnings === 'object'
    ? enrichedRow.warnings
    : null;

  let warnings = null;
  if (enrichedWarnings) {
    warnings = {
      ...enrichedWarnings,
      enrichmentSource: 'gemini',
      enrichedAt: enrichedRow.enrichedAt || null,
      enrichModel: enrichedRow.enrichModel || null,
    };
    // Gắn link tra cứu từ index văn bản pháp luật (data/legal-docs.json)
    if (Array.isArray(warnings.legalDocs)) {
      warnings.legalDocs = warnings.legalDocs.map((d) => {
        const indexed = d.code ? getDocByCode(d.code) : null;
        return {
          ...d,
          url: indexed?.url || `https://vbpl.vn/TW/Pages/vbpq-timkiem.aspx?Keyword=${encodeURIComponent(d.code || '')}`,
          citedInHsCount: indexed?.citedInHsCount,
        };
      });
    }
  } else if (hasPolicy) {
    warnings = {
      ...heuristicWarnings(record.cs),
      enrichmentSource: 'heuristic',
    };
  }

  const legalCitations = hasPolicy ? enrichLegalCitations(record.cs) : [];
  if (warnings && legalCitations.length) {
    warnings.legalCitations = legalCitations;
  }
  if (warnings && warnings.ministryCodes) {
    warnings.ministries = expandMinistryCodes(warnings.ministryCodes);
    delete warnings.ministryCodes;
  } else if (warnings && Array.isArray(warnings.ministries) && warnings.ministries.every((x) => typeof x === 'string')) {
    warnings.ministries = expandMinistryCodes(warnings.ministries);
  }

  const tree = getTreeMeta(record.hs);
  const chapter = record.hs.slice(0, 2);
  const ministries = warnings?.ministries?.length
    ? warnings.ministries
    : getMinistriesByChapter(chapter).map((m) => ({
        code: m.code,
        fullNameVi: m.fullNameVi,
        domain: m.domain || [],
      }));

  return {
    hsCode: record.hs,
    indentationLevel: tree.indentationLevel,
    parentSubheadingCode: tree.parentSubheadingCode,
    siblingHsCodes: tree.siblingHsCodes,
    treeLevel: tree.level,
    nameVi: record.vn || null,
    nameEn: enrichedRow?.nameEn || record.en || null,
    discriminatingFeatures: enrichedRow?.discriminatingFeatures || null,
    unitVi: record.dvt || null,
    taxNkTt: record.tt || null,
    taxNkPreferential: record.mfn || null,
    taxAcfta: record.acfta || null,
    taxAcftaChina: acftaForOrigin(record.acfta, 'CN', record.mfn),
    taxVat: record.vat || null,
    taxBvmt: record.bvmt || null,
    taxVatReduction: record.giam_vat || null,
    policyByHs: record.cs || null,
    hasPolicyWarning: hasPolicy,
    ...policyStatusOf(record),
    warnings,
    ministries,
    ...(record.ma_tuong_ung !== undefined ? { mappedHs: mappedHsOf(record) } : {}),
    ...(quotaOf(record) ? { tariffQuota: quotaOf(record) } : {}),
  };
}

function mapTaxLookup(hs) {
  const code = normalizeHs(hs);
  const record = getTaxRecord(code);
  if (record) {
    return { found: true, ...mapTaxRecord(record) };
  }

  const prefix6 = code.slice(0, 6);
  const related = Object.values(require('./data').taxData)
    .filter((x) => x.hs.startsWith(prefix6))
    .slice(0, 5)
    .map((x) => ({ hsCode: x.hs, nameVi: x.vn }));

  return {
    found: false,
    message: `Không tìm thấy mã ${code}`,
    relatedHsCodes: related,
  };
}

function mapSearchResult(item, full) {
  return {
    hsCode: item.hs,
    nameVi: item.vn,
    taxNkPreferential: full.mfn || null,
    taxAcfta: full.acfta || null,
    taxAcftaChina: acftaForOrigin(full.acfta, 'CN', full.mfn),
    taxVat: full.vat || null,
    hasPolicyWarning: item.cs === '1',
  };
}

function extractMinistries(text) {
  const known = ['BNNPTNT', 'BYT', 'BCT', 'BKHCN', 'BTNMT', 'BCA', 'BQP', 'BTTTT', 'BLDTBXH'];
  return known.filter((code) => text.includes(code));
}

function summarizePolicy(text) {
  const parts = [];
  if (/giấy phép|giay phep/i.test(text)) parts.push('Cần giấy phép NK');
  if (/kiểm dịch|kiem dich/i.test(text)) parts.push('Cần kiểm dịch');
  if (/kiểm tra|kiem tra/i.test(text)) parts.push('Cần kiểm tra chất lượng');
  if (/mật mã|mat ma/i.test(text)) parts.push('Thuộc diện kiểm soát mật mã');
  return parts.length > 0 ? parts.join('; ') : text.slice(0, 180);
}

module.exports = {
  mapTaxRecord,
  mapTaxLookup,
  mapSearchResult,
};
