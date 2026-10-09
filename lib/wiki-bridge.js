// lib/wiki-bridge.js — cầu nối tới oz-wiki-plhq (wiki/sources/*.md) cho output API.
//
// Mục tiêu: thêm `wikiSummary` + `relatedConcepts` + `wikiUrl` vào các mục của
// `policyBasisReview` và `legalBasisRegistry` để agent/consultant đọc chi tiết
// ngay trong response API, không cần sang repo wiki.
//
// Nguồn: `data/plhq-wiki-summaries.json` (sinh bởi `node scripts/sync-plhq.mjs
// --wiki-sources-from <path>`). Schema mỗi mục:
//   {
//     soHieu: '07-2026-tt-bct' (slug),
//     title: '...',
//     summary: '... 2-3 dòng tóm tắt ý chính',
//     relatedConcepts: ['concept-slug-1', 'concept-slug-2'],
//     sourceFile: 'wiki/sources/07-2026-tt-bct.md',
//     updated: '2026-10-09'
//   }
//
// Tra cứu nhanh: slug-to-... Map; tra cứu ngược soHieu→slug qua plhq-registry.

const fs = require('fs');
const { dataReadPath } = require('./data-paths');

let _idx = null;
function load() {
  if (_idx) return _idx;
  try {
    const raw = JSON.parse(fs.readFileSync(dataReadPath('plhq-wiki-summaries.json'), 'utf8'));
    const bySlug = new Map();
    const bySoHieu = new Map();
    for (const d of raw.documents || []) {
      bySlug.set(d.soHieu, d);
      // Aliases — cho phép tra cứu qua nhiều dạng số hiệu.
      for (const alias of d.aliases || []) bySoHieu.set(alias, d);
    }
    _idx = { bySlug, bySoHieu, total: raw.total || (raw.documents || []).length, syncedAt: raw.syncedAt };
  } catch {
    _idx = { bySlug: new Map(), bySoHieu: new Map(), total: 0, syncedAt: null };
  }
  return _idx;
}

/** Tóm tắt wiki từ số hiệu văn bản (nhiều dạng). Trả null nếu chưa sync. */
function summaryBySoHieu(soHieu) {
  if (!soHieu) return null;
  // Thử tra thẳng vào bySoHieu (đã build từ aliases).
  let d = load().bySoHieu.get(String(soHieu).toUpperCase());
  if (d) return d;
  // Thử chuẩn hoá (bỏ khoảng trắng, /, . → -)
  const norm = String(soHieu).toUpperCase().replace(/[\s./]+/g, '-');
  d = load().bySoHieu.get(norm);
  return d || null;
}

/** Tra tóm tắt từ slug. */
function summaryBySlug(slug) {
  if (!slug) return null;
  return load().bySlug.get(slug) || null;
}

/** Trả về đoạn JSON gọn để gắn vào output API:
 *   { wikiSummary: 'TT 07/2026/TT-BCT ngày 24/2/2026...',
 *     relatedConcepts: ['nhap-khau-thuoc-la'],
 *     wikiUrl: 'https://github.com/ozvietnam/oz-wiki-plhq/blob/main/wiki/sources/07-2026-tt-bct.md' }
 * Trả null nếu không có dữ liệu.
 */
function enrich(soHieu) {
  const d = summaryBySoHieu(soHieu);
  if (!d) return null;
  return {
    wikiSummary: d.summary || null,
    relatedConcepts: d.relatedConcepts || [],
    wikiUrl: d.url || `https://github.com/ozvietnam/oz-wiki-plhq/blob/main/${d.sourceFile || `wiki/sources/${d.soHieu}.md`}`,
  };
}

/** Bọc 1 mảng objects, gắn thêm trường wiki nếu match. */
function enrichList(items, soHieuKey = 'code') {
  if (!Array.isArray(items)) return items;
  for (const it of items) {
    if (!it || !it[soHieuKey]) continue;
    const e = enrich(it[soHieuKey]);
    if (e) Object.assign(it, e);
  }
  return items;
}

module.exports = { load, summaryBySoHieu, summaryBySlug, enrich, enrichList };
