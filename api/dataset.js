const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const { taxData, explanatoryNotesData, precedentsData, conflictsData, normalizeHs } = require('../lib/data');
const { loadIndex } = require('../lib/tariff-versions');
const { enrichedEntryCount } = require('../lib/enriched-data');
const { buildAdminOverview } = require('../lib/admin-overview');
const { getDocByCode, listDocs } = require('../lib/legal-docs');
const { getNotesCoverage } = require('../lib/gir-notes');
const { searchPrecedents } = require('../lib/precedent-search');
const { searchOzByHs, searchOzByKeyword } = require('../lib/oz-precedent-search');
const { listMinistries, getMinistriesByChapter } = require('../lib/ministries');
const { detectMaterials, listTaxonomySummary } = require('../lib/material-taxonomy');
const { buildChaptersIndex } = require('../lib/chapters-index');
const { readAuditLog } = require('../lib/admin-update');
const { buildKpiDashboard } = require('../lib/ml-log');
const { getProducts, isLoaiKhac, getCodeStats, getStatsSummary } = require('../lib/loai-khac-products');
const { searchWatchlist, watchlistStats, checkTrademarkRisk } = require('../lib/trademark-watch');
const fs = require('fs');
const path = require('path');

/** Multi-route handler to stay under Vercel Hobby ~12 Serverless Functions cap.
 * Entry: `GET /api/dataset` with `resource` query (set via rewrites from legacy URLs).
 */
function kgStatsPayload() {
  const rows = Object.values(taxData);
  const chapters = new Set(rows.map((r) => r.hs.slice(0, 2)));
  const withWarnings = rows.filter((r) => r.cs && String(r.cs).trim()).length;
  const enrichedPolicies = enrichedEntryCount();
  const versionIndex = loadIndex();

  const enrichedPath = path.join(process.cwd(), 'data', 'tax-enriched.json');
  let lastEnrichedAt = null;
  if (fs.existsSync(enrichedPath)) {
    lastEnrichedAt = fs.statSync(enrichedPath).mtime.toISOString();
  }

  return {
    totalHsCodes: rows.length,
    chapters: chapters.size,
    tariffCoverage: {
      withMfn: rows.filter((r) => r.mfn !== null && r.mfn !== '').length,
      withAcfta: rows.filter((r) => r.acfta !== null && r.acfta !== '').length,
      withVat: rows.filter((r) => r.vat !== null && r.vat !== '').length,
      withNameEn: rows.filter((r) => r.en && String(r.en).trim()).length,
    },
    withWarnings,
    enrichedPolicies,
    explanatoryNotes: Object.keys(explanatoryNotesData).length,
    precedentHsCodes: Object.keys(precedentsData).length,
    conflictHsCodes: Object.keys(conflictsData).length,
    tariffVersions: versionIndex.versions.length,
    currentTariffVersion: versionIndex.current || null,
    lastEnrichedAt,
    notesCoverage: getNotesCoverage(),
  };
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (requireAuth(req, res)) return;

  const resource = String(req.query.resource || '').trim();
  // GET cho mọi resource; POST chỉ mở cho screening batch nhãn hiệu (số lượng lớn).
  const isTrademarkBatch = req.method === 'POST' && resource === 'trademark';
  if (req.method !== 'GET' && !isTrademarkBatch) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!resource) {
    return res.status(400).json({
      error: 'Missing resource',
      hint: 'Use legacy URLs such as /api/kg_stats — they rewrite here.',
    });
  }

  try {
    if (resource === 'kg_stats') {
      return res.status(200).json(kgStatsPayload());
    }

    if (resource === 'chapters') {
      const chapters = buildChaptersIndex();
      return res.status(200).json({ total: chapters.length, chapters });
    }

    if (resource === 'admin_audit') {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const entries = readAuditLog({ hsCode: req.query.hs || req.query.hsCode, limit });
      return res.status(200).json({ total: entries.length, entries });
    }

    if (resource === 'conflicts') {
      const { hs } = req.query;
      if (!hs) {
        return res.status(400).json({
          error: 'hs parameter required',
          example: '/api/conflicts?hs=19011020',
        });
      }
      const hsCode = normalizeHs(hs);
      const payload = conflictsData[hsCode];
      if (!payload) {
        return res.status(404).json({
          found: false,
          hsCode,
          message: `No conflict data for ${hsCode}`,
        });
      }
      return res.status(200).json({
        found: true,
        hsCode,
        ...payload,
      });
    }

    if (resource === 'precedents') {
      const { hs, q, description } = req.query;
      const searchText = String(q || description || '').trim();
      if (searchText.length >= 3) {
        const matches = searchPrecedents(searchText, { topK: 5 });
        return res.status(200).json({
          found: matches.length > 0,
          query: searchText,
          total: matches.length,
          matches,
        });
      }
      if (!hs) {
        return res.status(400).json({
          error: 'hs or q (description) parameter required',
          examples: ['/api/precedents?hs=03046200', '/api/precedents?q=máy bơm Pentax'],
        });
      }
      const hsCode = normalizeHs(hs);
      const items = precedentsData[hsCode] || [];
      if (items.length === 0) {
        return res.status(404).json({
          found: false,
          hsCode,
          message: `No precedents for ${hsCode}`,
        });
      }
      return res.status(200).json({
        found: true,
        hsCode,
        total: items.length,
        items,
      });
    }

    if (resource === 'admin_overview') {
      return res.status(200).json(buildAdminOverview());
    }

    if (resource === 'oz_precedents') {
      const { hs, q, description } = req.query;
      if (hs) {
        const result = await searchOzByHs(hs, { limit: req.query.limit });
        return res.status(200).json({
          found: result.items.length > 0,
          hsCode: result.hsCode,
          distinctProducts: result.distinctProducts,
          totalDeclarations: result.totalDeclarations,
          items: result.items,
        });
      }
      const searchText = String(q || description || '').trim();
      if (searchText.length < 3) {
        return res.status(400).json({
          error: 'hs or q (description, min 3 chars) parameter required',
          examples: ['/api/oz-precedents?hs=85171300', '/api/oz-precedents?q=điện thoại iPhone'],
        });
      }
      // FREE keyword search (no Gemini) trên gold sạch
      const result = await searchOzByKeyword(searchText, { limit: 10 });
      return res.status(200).json({
        found: result.total > 0,
        query: result.query,
        total: result.total,
        matches: result.items,
      });
    }

    if (resource === 'materials' || resource === 'material_taxonomy') {
      const { q } = req.query;
      if (q && String(q).trim().length >= 2) {
        const materials = detectMaterials(String(q));
        return res.status(200).json({ query: q, total: materials.length, materials });
      }
      const families = listTaxonomySummary();
      return res.status(200).json({
        families,
        totalEntries: families.reduce((n, f) => n + f.count, 0),
      });
    }

    if (resource === 'ministries') {
      const { chapter } = req.query;
      if (chapter) {
        const ch = String(parseInt(chapter, 10)).padStart(2, '0');
        const items = getMinistriesByChapter(ch);
        return res.status(200).json({ chapter: ch, total: items.length, items });
      }
      const items = listMinistries();
      return res.status(200).json({ total: items.length, items });
    }

    if (resource === 'legal_docs') {
      const { chapter, status, issuer } = req.query;
      const items = listDocs({ chapter, status, issuer });
      return res.status(200).json({
        total: items.length,
        chapter: chapter || 'all',
        items,
      });
    }

    if (resource === 'legal_doc') {
      const code = String(req.query.code || '').trim();
      if (!code) {
        return res.status(400).json({ error: 'code query required', example: '/api/legal-docs/08-2023-TT-BCT' });
      }
      const doc = getDocByCode(code);
      if (!doc) {
        return res.status(404).json({ found: false, code, message: 'Legal document not in catalog' });
      }
      return res.status(200).json({ found: true, ...doc });
    }

    if (resource === 'kpi') {
      const kpi = buildKpiDashboard();
      return res.status(200).json(kpi);
    }

    if (resource === 'products') {
      const { hs, limit: limitQ } = req.query;
      const limit = Math.min(Math.max(parseInt(limitQ, 10) || 8, 1), 20);

      // Summary mode: ?stats=1 → tổng quan + queue ưu tiên đào (không cần hs)
      if (String(req.query.stats || '') === '1' && !hs) {
        return res.status(200).json(getStatsSummary());
      }

      // Batch mode: ?hs=84021219,85044090
      const hsCodes = String(hs || '').split(',').map(s => s.trim().replace(/\D/g, '')).filter(s => s.length === 8);
      if (hsCodes.length === 0) {
        return res.status(400).json({
          error: 'hs parameter required (8-digit code or comma-separated list)',
          examples: ['/api/products?hs=84021219', '/api/products?hs=84021219,87032290', '/api/products?stats=1'],
        });
      }

      if (hsCodes.length === 1) {
        const hsCode = hsCodes[0];
        const products = getProducts(hsCode, limit);
        const stats = getCodeStats(hsCode);
        return res.status(200).json({
          found: products.length > 0,
          hsCode,
          isLoaiKhac: isLoaiKhac(hsCode),
          productCount: stats?.productCount ?? products.length,
          potential: stats?.potential ?? null,
          canMine: stats?.canMine ?? null,
          total: products.length,
          products,
        });
      }

      // Multiple codes
      const results = hsCodes.map(hsCode => {
        const stats = getCodeStats(hsCode);
        return {
          hsCode,
          isLoaiKhac: isLoaiKhac(hsCode),
          productCount: stats?.productCount ?? 0,
          potential: stats?.potential ?? null,
          canMine: stats?.canMine ?? null,
          products: getProducts(hsCode, limit),
        };
      });
      return res.status(200).json({ total: results.length, results });
    }

    if (resource === 'trademark') {
      // ── Batch screening (số lượng lớn): POST { items: [{id?,brand?,text?,hs?,origin?}, ...] } ──
      // Trả gọn cho ERP screen hàng loạt: mỗi item 1 cờ rủi ro va chạm nhãn hiệu, không kèm giải trình.
      if (req.method === 'POST') {
        let body = req.body;
        if (typeof body === 'string') {
          try {
            body = JSON.parse(body);
          } catch {
            return res.status(400).json({ error: 'Invalid JSON body' });
          }
        }
        const items = Array.isArray(body?.items) ? body.items : null;
        if (!items) {
          return res.status(400).json({
            error: 'Body phải có items[] — vd { "items": [{ "brand": "ABB", "hs": "85371019", "origin": "China" }] }',
          });
        }
        const MAX = 1000;
        if (items.length > MAX) {
          return res.status(400).json({ error: `Tối đa ${MAX} item/lần (gửi ${items.length}).` });
        }
        const byLevel = {};
        const results = items.map((it, i) => {
          const brand = String(it?.brand || it?.q || '').trim();
          const text = String(it?.text || it?.productName || it?.ten || '').trim();
          const hs = it?.hs || it?.hsCode;
          const origin = it?.origin || it?.xuatXu;
          const r = checkTrademarkRisk({ brand, text, hsCode: hs, origin });
          const top = r.matched ? r.matches[0] : null;
          const level = r.matched ? r.riskLevel : 'NONE';
          byLevel[level] = (byLevel[level] || 0) + 1;
          return {
            id: it?.id ?? i,
            brand: brand || null,
            hs: hs || null,
            origin: origin || null,
            matched: r.matched,
            riskLevel: level,
            mark: top?.mark || null,
            owner: top?.owner || null,
            customsRecorded: top?.customsRecorded ?? false,
            classMatch: top?.classMatch ?? null,
            cnExportLevel: top?.cnExportRisk?.level || null,
            verified: top?.verified ?? false,
            status: top?.status || null,
            regNo: top?.regNo || null,
          };
        });
        const flagged = results.filter((x) => x.matched).length;
        return res.status(200).json({
          total: results.length,
          flagged,
          byLevel,
          results,
          coverageNote:
            'Chỉ phát hiện nhãn CÓ trong watchlist (' +
            watchlistStats().total +
            ' nhãn). "matched:false" KHÔNG chắc là sạch — phụ thuộc độ phủ watchlist.',
          disclaimer: 'Tư vấn tham khảo, không phải phán quyết hải quan.',
        });
      }

      const q = String(req.query.q || req.query.brand || '').trim();
      const hsCode = req.query.hs || req.query.hsCode;
      const origin = req.query.origin || req.query.xuatXu;
      if (String(req.query.stats || '') === '1' && !q) {
        return res.status(200).json(watchlistStats());
      }
      if (q.length < 2) {
        return res.status(400).json({
          error: 'q (nhãn hiệu, tối thiểu 2 ký tự) required',
          examples: [
            '/api/trademark?q=vpower',
            '/api/trademark?q=honda&hs=84073100',
            '/api/trademark?q=honda&origin=CN&risk=1',
            '/api/trademark?stats=1',
          ],
        });
      }
      // risk=1: trả luôn object cảnh báo (dùng khi đã biết hsCode + origin)
      if (String(req.query.risk || '') === '1') {
        return res.status(200).json(checkTrademarkRisk({ brand: q, hsCode, origin }));
      }
      const matches = searchWatchlist(q, { hsCode, origin });
      return res.status(200).json({
        found: matches.length > 0,
        query: q,
        total: matches.length,
        matches,
        disclaimer: 'Tư vấn tham khảo, không phải phán quyết hải quan.',
      });
    }

    return res.status(404).json({ error: 'Unknown resource', resource });
  } catch (e) {
    return res.status(500).json({ error: 'dataset handler failed', detail: e.message });
  }
};
