const { requireAuth } = require('../lib/auth');
const { requireAuthUnlessPublic } = require('../lib/public-access');
const { setCors, handleOptions } = require('../lib/cors');
const { taxData } = require('../lib/data');
const { mapSearchResult } = require('../lib/tax-mapper');
const { searchCandidates } = require('../lib/search-utils');
const { lookupAliases } = require('../lib/hs-aliases');
const { lookupTradeTerms } = require('../lib/trade-synonyms');
const { breadcrumbOf } = require('../lib/hs-breadcrumb');
const { vatReductionOf } = require('../lib/vat-reduction');
const { matchProducts } = require('../lib/product-match');
const { appendAccess } = require('../lib/access-log');
const { filterChapter98 } = require('../lib/chapter98');

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' ? body : null;
}

function handleMatch(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', hint: 'Use POST /api/match' });
  }
  if (requireAuth(req, res, { publicRoute: true })) return;

  const body = parseBody(req);
  if (!body) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const started = Date.now();
  try {
    const payload = matchProducts(body);
    appendAccess({
      route: '/api/match',
      ms: Date.now() - started,
      querySnippet: String(body.titleVi || body.titleZh || '').slice(0, 80),
      hsCode: payload.matches?.[0]?.hsCode || null,
    });
    return res.status(200).json(payload);
  } catch (error) {
    if (error.code === 'VALIDATION') {
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.status(500).json({ ok: false, error: error.message });
  }
}

module.exports = function handler(req, res) {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  const mode = String(req.query.mode || '').trim();
  if (mode === 'match') {
    return handleMatch(req, res);
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // /api/match (mode=match) vẫn cần token — xử lý ở nhánh riêng phía trên.
  if (requireAuthUnlessPublic(req, res, { endpoint: 'search' })) return;

  const { q, cs_only, limit = '20' } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      error: 'Query q must be at least 2 characters',
      examples: ['/api/search?q=bàn+chải', '/api/search?q=8509', '/api/search?q=nhựa&cs_only=1'],
    });
  }

  const limitNum = Math.min(parseInt(limit, 10) || 20, 50);
  const onlyCS = cs_only === '1' || cs_only === 'true';
  // Dữ kiện tường minh cho bảng quyết định: ?facts={"thicknessMm":2,"form":"coil"}.
  // Câu hỏi ở clarifyingQuestionsVi nói cần thuộc tính nào; ERP trả lời bằng đúng tên đó.
  let facts = null;
  if (req.query.facts) {
    try {
      const parsedFacts = JSON.parse(String(req.query.facts));
      if (parsedFacts && typeof parsedFacts === 'object' && !Array.isArray(parsedFacts)) facts = parsedFacts;
    } catch {
      return res.status(400).json({ error: 'facts phải là JSON object, vd facts={"thicknessMm":2}' });
    }
  }
  const started = Date.now();
  const rawCandidates = searchCandidates(q, { topCandidates: limitNum, csOnly: onlyCS, facts });
  // Chương 98 là mã ưu đãi riêng, không phải kết luận phân loại — loại khỏi kết
  // quả trừ khi người dùng chủ động hỏi (gõ "98..." hoặc includeChapter98=1).
  const ch98 = filterChapter98(rawCandidates, {
    query: q,
    include: req.query.includeChapter98 === '1' || req.query.includeChapter98 === 'true',
  });
  const candidates = ch98.items;
  appendAccess({
    route: '/api/search',
    ms: Date.now() - started,
    querySnippet: String(q).slice(0, 80),
    hsCode: candidates[0]?.hsCode || null,
  });
  const results = candidates.map((item) => {
    const full = taxData[item.hsCode] || {};
    const mapped = mapSearchResult(
      {
        hs: item.hsCode,
        vn: item.nameVi,
        cs: item.hasPolicyWarning ? '1' : '0',
      },
      full
    );
    // Mã đến từ tiền lệ tờ khai: nói rõ đã khai bao nhiêu lần để người tra tự
    // cân nhắc. Tên chính thức thường là "Loại khác" nên bản thân nó không đủ
    // căn cứ — tần suất thực tế mới là thứ thuyết phục.
    if (item.aliasMatch) {
      mapped.precedent = {
        matchedPhrase: item.aliasMatch.phrase,
        declarationCount: item.aliasMatch.declarationCount,
        confidence: item.aliasMatch.confidence,
        share: item.aliasMatch.share,
        source: 'tờ khai đã thông quan (ẩn danh)',
      };
    }

    // Mã đến từ từ điển tên thương mại: kèm ĐIỀU KIỆN áp dụng và nguồn dẫn.
    // Không có `whenVi` thì người tra không biết mình thuộc ứng viên nào —
    // riêng nhóm thép làm khuôn, mã đúng phụ thuộc khổ rộng 600 mm.
    if (item.tradeMatch) {
      mapped.tradeTerm = {
        entryId: item.tradeMatch.entryId,
        titleVi: item.tradeMatch.titleVi,
        matchedTerms: item.tradeMatch.matchedTerms,
        appliesWhenVi: item.tradeMatch.whenVi,
        confidence: item.tradeMatch.confidence,
        basis: item.tradeMatch.basis,
        sourceVi: item.tradeMatch.sourceVi,
      };
    }
    // Lá do bảng quyết định chốt bằng thuộc tính (xem `decisions` ở cấp phản hồi).
    if (item.decision) mapped.decision = item.decision;

    // Chuỗi phân cấp: với 25,7% mã tên đúng bằng "Loại khác", dòng kết quả tự
    // nó vô nghĩa. Breadcrumb cho người tra thấy mã nằm ở đâu trong biểu thuế.
    const crumb = breadcrumbOf(item.hsCode);
    if (crumb) {
      mapped.breadcrumb = {
        trail: crumb.trail,
        levels: crumb.levels,
        isResidual: crumb.isResidual,
        ...(crumb.scopeVi ? { scopeVi: crumb.scopeVi } : {}),
        ...(crumb.excludesVi.length ? { excludesVi: crumb.excludesVi } : {}),
      };
    }

    // VAT: 1.561 mã KHÔNG được giảm theo NĐ 174/2025. /api/tax có sẵn ghi chú
    // này từ lâu, nhưng /api/search — nơi người ta thực sự CHỌN mã — thì chưa
    // trả gì. Chọn xong mới biết mình không được giảm thì đã khai mất rồi.
    const vatInfo = vatReductionOf(full);
    if (vatInfo) mapped.vatReduction = vatInfo;

    return mapped;
  });

  // Lệch hình thái nguyên liệu/thành phẩm: phải nói ra, không im lặng bỏ qua.
  // Người hỏi "tấm thép làm khuôn nhựa" mà không thấy gợi ý nào sẽ tưởng kho
  // thiếu dữ liệu, trong khi thực chất ta đang cố tình không đoán bừa.
  const { formWarning } = lookupAliases(q);

  // Từ điển tên thương mại có thể đã LOẠI HẲN vài mã khỏi kết quả (vd 8480 khi
  // hỏi thép tấm làm khuôn). Loại mà không nói là giấu; nói ra kèm lý do thì
  // người tra tự phản biện được.
  // Câu hỏi đã được bóc thành thực thể (lib/query-parse.js): danh từ lõi đem đi
  // tìm, cơ cấu + thông số + mác vật liệu tách riêng. Trả ra để ERP/AI biết hệ
  // thống đã HIỂU câu thế nào — và để người tra thấy ngay nếu bóc sai.
  const parsedQuery = rawCandidates.parsedQuery || null;
  const avoided = rawCandidates.avoidedByTradeRules || [];
  const tradeMatches = rawCandidates.tradeTermMatches || [];
  const tradeExcluded = rawCandidates.tradeTermExcluded || [];
  const decisions = rawCandidates.decisions || [];
  // Câu hỏi gạn: từ từ điển (askVi) + từ bảng quyết định (dữ kiện còn thiếu). Bảng
  // hỏi đúng thuộc tính đang chặn việc chốt lá, kèm tên thuộc tính để ERP trả lời.
  const askVi = [
    ...new Set([
      ...decisions.flatMap((d) => (d.missingFacts || []).map((m) => m.questionVi)),
      ...tradeMatches.flatMap((m) => m.askVi || []),
    ]),
  ];

  return res.status(200).json({
    keyword: q,
    total: results.length,
    results,
    ...(formWarning ? { formWarning } : {}),
    ...(parsedQuery
      ? {
          parsedQuery: {
            coreVi: parsedQuery.coreVi,
            specs: parsedQuery.specs,
            mechanisms: parsedQuery.mechanisms,
            materialGrades: parsedQuery.materialGrades,
          },
        }
      : {}),
    ...(avoided.length
      ? {
          avoidedCodes: avoided.slice(0, 12).map((a) => ({
            hsCode: a.hsCode,
            nameVi: a.nameVi,
            whyVi: a.whyVi,
          })),
          avoidedTotal: avoided.length,
        }
      : {}),
    ...(askVi.length ? { clarifyingQuestionsVi: askVi } : {}),
    ...(decisions.length
      ? {
          decisions: decisions.map((d) => ({
            heading: d.heading,
            titleVi: d.titleVi,
            status: d.status,
            ...(d.hs ? { hsCode: d.hs, ruleId: d.ruleId, reasonVi: d.reasonVi, source: d.source } : {}),
            tableVerified: d.tableVerified,
            basis: d.tableVerified ? 'RULE_TABLE' : 'HEURISTIC',
            narrowed: d.narrowed,
            missingFacts: d.missingFacts,
            factsUsed: d.factsUsed,
          })),
        }
      : {}),
    ...(tradeExcluded.length
      ? {
          tradeTermNotApplied: tradeExcluded.map((x) => ({
            titleVi: x.titleVi,
            matchedTerms: x.matchedTerms,
            reasonVi: x.reasonVi,
          })),
        }
      : {}),
    ...(ch98.removed
      ? {
          chapter98Filtered: {
            removed: ch98.removed,
            reason: ch98.reason,
            hint: 'Thêm &includeChapter98=1 nếu bạn thực sự cần mã thuế ưu đãi riêng.',
          },
        }
      : {}),
  });
};
