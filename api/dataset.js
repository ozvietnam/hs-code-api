const { requireAuthUnlessPublic } = require('../lib/public-access');
const { setCors, handleOptions } = require('../lib/cors');
const { taxData, precedentsData, conflictsData, normalizeHs } = require('../lib/data');
const confusionPairs = require('../lib/confusion-pairs');
const { buildAdminOverview } = require('../lib/admin-overview');
const { getDocByCode, listDocs } = require('../lib/legal-docs');
const { legalDocsInfo } = require('../lib/data-freshness');
const { searchPrecedents, NGUONG_KHOP_TIEN_LE } = require('../lib/precedent-search');
const { searchOzByHs, searchOzByKeyword } = require('../lib/oz-precedent-search');
const { listMinistries, getMinistriesByChapter } = require('../lib/ministries');
const { detectMaterials, listTaxonomySummary } = require('../lib/material-taxonomy');
const { buildChaptersIndex } = require('../lib/chapters-index');
const { kgStatsPayload } = require('../lib/kg-stats');
const { readAuditLog } = require('../lib/admin-update');
const { buildKpiDashboard } = require('../lib/ml-log');
const { getProducts, getGeneratedProducts, isLoaiKhac, getCodeStats, getStatsSummary } = require('../lib/loai-khac-products');
const { getAccuracyStats } = require('../lib/learned-corrections');
const { readErrorLog } = require('../lib/error-monitor');
const { getProcedureByCode, listProcedures, getProcedures } = require('../lib/policy-procedures');
const { detectRepeatedPatterns } = require('../lib/feedback-store');
const { listPromptVersions } = require('../lib/prompt-version');
const { getEnrichedForHs } = require('../lib/enriched-data');
const { searchWatchlist, watchlistStats, checkTrademarkRisk } = require('../lib/trademark-watch');
const { declarationFields, chapterDeclarationFields } = require('../lib/declaration-fields');
const { dictionary: zhSpecDictionary } = require('../lib/zh-specs');
const { regimeSummary } = require('../lib/policy-regime');
const plhq = require('../lib/plhq-registry');
const { aggregateDemand } = require('../lib/demand-signals');
const { buildEvidencePack, validateEvidenceInput } = require('../lib/evidence-pack');
const { serviceCaller } = require('../lib/auth');
const { tongHopNgay, homNayVn } = require('../lib/public-llm-meter');
const fs = require('fs');
const path = require('path');

/** Multi-route handler consolidating several logical endpoints into one function
 * (fewer cold starts, tidy repo — not a plan constraint).
 * Entry: `GET /api/dataset` with `resource` query (set via rewrites from legacy URLs).
 */
/**
 * Ghi số hiệu tra KHÔNG thấy trong sổ cộng đồng (found:false) vào JSONL — bot đêm gom sinh issue.
 * Không gọi GitHub trong request path (tránh tăng độ trễ + lộ token); chỉ append 1 dòng JSON.
 */
function ghiMissSoHieu(danhSach) {
  try {
    const fs_ = require('fs');
    const { dataPath } = require('../lib/data-paths');
    // dataPath(): tôn trọng HS_DATA_DIR — prod ghi vào volume /data (bền qua deploy),
    // không phải /app/data trong ảnh (bị thay mỗi lần deploy).
    const line = JSON.stringify({ ts: new Date().toISOString(), soHieu: danhSach }) + '\n';
    fs_.appendFileSync(dataPath('legal-status-miss.jsonl'), line);
  } catch { /* không bao giờ làm hỏng request vì ghi log */ }
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  const resource = String(req.query.resource || '').trim();
  // Allowlist tường minh trong lib/public-access.js — resource mới mặc định KÍN.
  if (requireAuthUnlessPublic(req, res, { endpoint: 'dataset', resource })) return;
  // Gói căn cứ soát/giải trình (#337): CHỈ POST, KÍN (khoá dịch vụ / HS_API_TOKEN), không gọi LLM.
  // Không nằm trong allowlist lib/public-access.js → requireAuthUnlessPublic ở trên đã đòi Bearer.
  if (resource === 'evidence_pack') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed', hint: 'POST /api/evidence-pack { maHs: string[1..2], moTa, thongSo? }' });
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'DAU_VAO_SAI', chiTiet: ['Body không phải JSON hợp lệ.'] }); }
    }
    const v = validateEvidenceInput(body);
    if (!v.ok) return res.status(400).json({ error: 'DAU_VAO_SAI', chiTiet: v.loi });
    try {
      const pack = buildEvidencePack(v.data);
      const caller = serviceCaller(req);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ...pack, ...(caller ? { usage: [] } : {}) });
    } catch (e) {
      return res.status(500).json({ error: 'evidence pack failed', detail: e.message });
    }
  }

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
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
      return res.status(200).json(kgStatsPayload());
    }

    if (resource === 'chapters') {
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
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
        // Ngưỡng #359: dưới ngưỡng KHÔNG trả match — trả found:false kèm lý do, để người
        // đọc hiểu "không có tiền lệ đủ gần" chứ không phải "hệ thống lỗi". Trước đây
        // top-k trả về bất kể độ liên quan (0,15) nên 20/10 người khai thấy found:true
        // với tiền lệ điều khiển từ xa bảng giá điện tử cho một nắp tủ điện.
        // hs (nếu có) chỉ ưu tiên nhóm 4 số, KHÔNG lọc bỏ tiền lệ nhóm khác.
        const matches = searchPrecedents(searchText, { topK: 5, minSimilarity: NGUONG_KHOP_TIEN_LE, maHs: hs });
        const coWco = matches.some((m) => m.loaiNguon === 'WCO_OP');
        const wcoBanQuyen = coWco ? require('../lib/wco-op').BAN_QUYEN : null;
        if (!matches.length) {
          return res.status(200).json({
            found: false,
            query: searchText,
            total: 0,
            matches: [],
            nguong: NGUONG_KHOP_TIEN_LE,
            lyDo: `không có tiền lệ đủ gần (mọi tiền lệ khớp dưới ngưỡng similarity ${NGUONG_KHOP_TIEN_LE})`,
          });
        }
        return res.status(200).json({
          found: true,
          query: searchText,
          total: matches.length,
          matches,
          nguong: NGUONG_KHOP_TIEN_LE,
          ...(coWco ? { banQuyen: wcoBanQuyen } : {}),
        });
      }
      if (!hs) {
        return res.status(400).json({
          error: 'hs or q (description) parameter required',
          examples: ['/api/precedents?hs=03046200', '/api/precedents?q=máy bơm Pentax'],
        });
      }
      // #538: normalizeHs pad cứng 8 số cho taxData — tiền lệ lại có key nhóm 4/6 số (17+24 key)
      // nên query tiền tố bị pad thành mã không tồn tại (8526 → "No precedents for 85260000"
      // dù nhánh 8526 giữ 6 tiền lệ; 170191 còn pad trùng nhầm key khác). Xử lý TẠI CHỖ theo
      // tiền tố, không đụng normalizeHs dùng chung. found:false trả 200 (thống nhất đường q=;
      // gateway đọc body qua trangThaiHopLe nên 404 cũ cũng chỉ là found:false).
      const hsRaw = String(hs).replace(/\D/g, '');
      if (hsRaw.length === 4 || hsRaw.length === 6) {
        const matchedKeys = Object.keys(precedentsData).filter((k) => k.startsWith(hsRaw)).sort();
        if (matchedKeys.length === 0) {
          return res.status(200).json({
            found: false,
            hsCode: hsRaw,
            prefix: true,
            message: `No precedents under ${hsRaw}`,
          });
        }
        const items = matchedKeys.flatMap((k) => precedentsData[k].map((it) => ({ ...it, tuMa: k })));
        return res.status(200).json({
          found: true,
          hsCode: hsRaw,
          prefix: true,
          matchedKeys,
          total: items.length,
          items,
        });
      }
      const hsCode = normalizeHs(hs);
      const items = precedentsData[hsCode] || [];
      if (items.length === 0) {
        return res.status(200).json({
          found: false,
          hsCode: hsRaw || hsCode,
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

    if (resource === 'confusion_pairs') {
      // Từ điển mâu thuẫn HS (CEO + Grok). KÍN cho tới khi các mục được duyệt (verified).
      const { hs, q, id } = req.query;
      if (id) {
        const entry = confusionPairs.getEntry(id);
        return entry ? res.status(200).json({ found: true, entry }) : res.status(404).json({ found: false, id });
      }
      const text = String(q || '').trim();
      if (text.length >= 3) {
        const hits = confusionPairs.matchByText(text).map((h) => ({ ...confusionPairs.getEntry(h.entry.id), matchedAlias: h.matchedAlias }));
        const alerts = hs ? confusionPairs.confusionAlertsFor(text, [hs]) : [];
        return res.status(200).json({ found: hits.length > 0, query: text, total: hits.length, entries: hits, ...(hs ? { alerts } : {}) });
      }
      if (hs) {
        const hits = confusionPairs.matchByHs(hs).map((h) => ({ ...confusionPairs.getEntry(h.entry.id), side: h.side, matchedPrefix: h.prefix }));
        return res.status(200).json({ found: hits.length > 0, hsCode: String(hs), total: hits.length, entries: hits });
      }
      return res.status(200).json({ ...confusionPairs.stats(), entries: confusionPairs.listEntries() });
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

    // Danh mục trường cần khai theo nhóm hàng (kế hoạch OZSource H6) — dữ liệu tĩnh, công khai.
    if (resource === 'declaration_fields') {
      const code = String(req.query.hs || req.query.heading || '').replace(/\D/g, '');
      if (code.length < 4) {
        return res.status(400).json({ error: 'Thiếu hoặc sai ?hs — cần mã 4, 6 hoặc 8 số, vd ?hs=8413' });
      }
      const spec = declarationFields(code);
      if (!spec) return res.status(404).json({ error: `Chưa có danh mục trường cho ${code}`, hs: code });
      return res.status(200).json(spec);
    }

    // Danh mục trường khai theo CHƯƠNG 2 số (khuôn chung khi chưa có nhóm 4 số) — dữ liệu tĩnh, công khai.
    // data/chapter-declaration-fields.json đã có; đây là cửa đọc theo chương (?chapter=84 hoặc ?hs=8481…).
    if (resource === 'chapter_declaration_fields') {
      const ch = String(req.query.chapter || req.query.hs || '').replace(/\D/g, '');
      if (ch.length < 2) {
        return res.status(400).json({ error: 'Thiếu hoặc sai ?chapter — cần số chương 2 chữ số, vd ?chapter=84' });
      }
      const ch2 = String(parseInt(ch.slice(0, 2), 10)).padStart(2, '0');
      const spec = chapterDeclarationFields(ch);
      if (!spec) return res.status(404).json({ error: `Chưa có danh mục trường cho chương ${ch2}`, chapter: ch2 });
      return res.status(200).json(spec);
    }

    // Từ điển nhãn thông số tiếng Trung → khóa chuẩn (kế hoạch OZSource H2) — dữ liệu mở.
    if (resource === 'attribute_synonyms') {
      const dict = zhSpecDictionary();
      return res.status(200).json({
        version: dict.version,
        updated: dict.updated,
        license: dict.license,
        total: Object.keys(dict.keys || {}).length,
        keys: dict.keys,
      });
    }

    // Nhu cầu bổ sung tri thức từ hàng thật (phiếu hồ sơ khai báo) — gom, không số lượng.
    if (resource === 'demand') {
      const days = Math.min(365, Math.max(7, parseInt(req.query.days, 10) || 90));
      return res.status(200).json(aggregateDemand({ days }));
    }

    // Ý kiến phân loại WCO (Compendium 2022) — CÔNG KHAI từ 11/10/2026 (CEO Oz tuyên bố đã trả phí bản quyền, cho dùng công khai).
    // Chỉ trả ý kiến đã qua cổng mã/thứ tự (lib/wco-op.js#byHs): lý do là ĐỘ CHÍNH XÁC chứ không phải bản quyền.
    //   ?hs=8528|852852|85285200        → danh sách con trỏ (hs6, thứ tự, năm, độ tin cậy) + đường dẫn xem toàn văn
    //   ?hs=852852&n=6                  → toàn văn OCR tiếng Anh + bản dịch tiếng Việt (không chính thức) + nguồn + tuyên bố bản quyền
    //   ?hs=...&chiTiet=1               → như danh sách nhưng kèm toàn văn (tối đa 20 ý kiến)
    // Cây quan hệ HS theo chữ số (#236): vị trí, cha, anh em, con, phạm vi "Loại khác", nguồn gắn vào nút. Công khai, tĩnh.
    if (resource === 'hs_tree') {
      const T = require('../lib/hs-tree');
      const S = require('../lib/hs-tree-sources');
      const rt = require('../lib/so-tay-runtime');
      const hs = String(req.query.hs || '').replace(/\D/g, '');
      if (![2, 4, 5, 6, 7, 8].includes(hs.length)) {
        return res.status(400).json({ error: 'Thiếu hoặc sai ?hs — cần mã 2, 4, 6 hoặc 8 số (5/7 số = nút trung gian)', example: '/api/tree?hs=85044090' });
      }
      const n = T.nodeOf(hs);
      if (!n) return res.status(404).json({ found: false, hs, message: 'Mã không có trong biểu thuế / cây' });
      const nut = (x) => ({ id: x.id, cap: x.cap, ten: T.labelOf(x), tenVi: x.tenVi || null, tenEn: x.tenEn || null, suyRa: Boolean(x.suyRa), ...(x.cap === 8 ? { loaiKhac: Boolean(x.loaiKhac), gach: x.gach } : {}) });
      const cha = n.parent ? T.nodeOf(n.parent) : null;
      const con = n.children.slice(0, 200).map((id) => nut(T.nodeOf(id)));
      const src = S.sourcesOf(n.id);
      const lk = n.cap === 8 && n.loaiKhac ? rt.loaiKhac(n.id) : null;
      return res.status(200).json({
        found: true, hs: n.id,
        nut: nut(n),
        duongDan: T.ancestorsOf(n.id).map(nut),
        cha: cha ? nut(cha) : null,
        anhEm: T.siblingsOf(n.id).slice(0, 100).map(nut),
        con, ...(n.children.length > 200 ? { conConLai: n.children.length - 200 } : {}),
        ...(lk ? { loaiKhac: lk } : {}),
        nguon: src ? src.nguon : {},
        ghiChu: 'Cấu trúc suy từ chữ số của mã (2 chương, 4 nhóm, 5–6 phân nhóm WCO, 7 tiêu đề quốc gia, 8 dòng). Nút suyRa=true là tiêu đề bị lược khi nhập biểu thuế: cấu trúc chắc, tên chưa có — không bịa. Nhãn nguồn: NGUYEN_VAN / DA_KIEM / AI_CHUA_KIEM.',
      });
    }

    if (resource === 'wco_opinions') {
      const wco = require('../lib/wco-op');
      const hs = String(req.query.hs || '').replace(/\D/g, '');
      if (![4, 6, 8].includes(hs.length)) {
        return res.status(400).json({ error: 'Thiếu hoặc sai ?hs — cần mã 4, 6 hoặc 8 số', example: '/api/wco-opinions?hs=852852' });
      }
      if (!wco.available()) {
        return res.status(404).json({ error: 'Kho ý kiến phân loại WCO chưa nạp trên máy chủ này', hs });
      }
      const key = hs.length === 8 ? hs.slice(0, 6) : hs;
      const list = wco.byHs(key);
      const ghiChu = 'Danh sách có thể chưa đủ: ý kiến chưa đối chiếu được mã/số thứ tự in bị loại (đang chờ OCR lại). Không có kết quả KHÔNG có nghĩa là mã này không có ý kiến.';
      if (req.query.n !== undefined && req.query.n !== '') {
        if (key.length !== 6) return res.status(400).json({ error: 'Khi có ?n cần mã 6 số (hs6) để xác định ý kiến', example: '/api/wco-opinions?hs=852852&n=6' });
        const n = parseInt(req.query.n, 10);
        const o = list.find((x) => x.ord === n);
        if (!o) return res.status(404).json({ error: `Không có ý kiến ${key}/${req.query.n} đã qua cổng kiểm`, hs: key, n, ghiChu });
        return res.status(200).json(wco.view(o));
      }
      const full = req.query.chiTiet === '1';
      return res.status(200).json({
        hs: key, total: list.length, daySuDu: !wco.incomplete(), ghiChu, banQuyen: wco.BAN_QUYEN,
        items: list.slice(0, full ? 20 : 100).map((o) => (full ? wco.view(o) : { hs: o.hs, thuTuTrongMa: o.ord, namThongQua: o.adoption || null, doTinCay: wco.doTinCay(o), xemToanVan: `/api/wco-opinions?hs=${o.hs}&n=${o.ord}` })),
        ...(full && list.length > 20 ? { conLai: list.length - 20 } : {}),
      });
    }

    // Khung kiểm tra chuyên ngành 2026 (NĐ 37/2026, danh mục mới từng bộ, căn cứ cũ bị thay) — tĩnh, công khai.
    if (resource === 'ktcn_regime') {
      return res.status(200).json(regimeSummary());
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
      // Mỗi văn bản kèm tình trạng theo sổ cộng đồng oz-wiki-plhq + cờ lệch với thư viện này.
      const items = listDocs({ chapter, status, issuer }).map((d) => ({ ...d, registry: plhq.docRegistry(d.code, d.status) }));
      return res.status(200).json({
        total: items.length,
        chapter: chapter || 'all',
        freshness: legalDocsInfo(),
        registryConflicts: items.filter((d) => d.registry?.statusConflict).length,
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
      return res.status(200).json({
        found: true, ...doc, freshness: legalDocsInfo(), registry: plhq.docRegistry(doc.code, doc.status),
      });
    }

    // Cầu nối sổ đăng ký cộng đồng oz-wiki-plhq: tra hiệu lực theo số hiệu (?so=A,B — tối đa 50).
    // Không có ?so → thông tin bản chụp + các văn bản thư viện riêng đang lệch tình trạng với sổ.
    if (resource === 'legal_status') {
      const meta = plhq.registryMeta();
      if (!meta) return res.status(503).json({ error: 'Chưa có bản chụp sổ cộng đồng (data/plhq-registry.json)' });
      const so = String(req.query.so || '').split(/[,;\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 50);
      const tenQuery = String(req.query.ten || '').trim();
      if (tenQuery && tenQuery.length >= 3) {
        const ketQua = plhq.searchByTen(tenQuery, 10);
        return res.status(200).json({ registry: meta, query: tenQuery, total: ketQua.length, items: ketQua, timTheo: 'ten' });
      }

      if (so.length) {
        const items = so.map((q) => { const r = plhq.lookup(q); return r ? { query: q, found: true, ...r } : { query: q, found: false }; });
        // Ghi miss để bot đêm gom sinh issue nạp văn bản còn thiếu (thiết kế #224/#209).
        const misses = items.filter((x) => !x.found).map((x) => x.query);
        if (misses.length) ghiMissSoHieu(misses);
        return res.status(200).json({ registry: meta, total: items.length, items });
      }
      const conflicts = plhq.libraryConflicts(listDocs());
      return res.status(200).json({
        registry: meta,
        libraryConflicts: conflicts,
        noteVi: 'libraryConflicts: văn bản trong thư viện /api/legal-docs ghi tình trạng khác sổ cộng đồng. Cần đối chiếu nguồn A trước khi sửa bên nào.',
      });
    }

    // Mốc đổi hiệu lực sắp tới (?ngay=YYYY-MM-DD, ?so_ngay=90) — trả VB lên hiệu lực MỚI,
    // hết hiệu lực, hoặc tạm ngưng trong cửa sổ ngày. Công cụ "canh" cho cả hệ thống:
    // TT 142/2026 (16-11-2026), NQ 43/2026 (31-12-2026), TT 154/2026 + Luật 11/2026 (2027).
    if (resource === 'hieu_luc_sap_doi') {
      const meta = plhq.registryMeta();
      if (!meta) return res.status(503).json({ error: 'Chưa có bản chụp sổ cộng đồng (data/plhq-registry.json)' });
      const tu = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.tu || '')) ? req.query.tu : new Date().toISOString().slice(0, 10);
      const soNgay = Math.min(Math.max(Number(req.query.so_ngay) || 90, 1), 3650);
      const denD = new Date(tu); denD.setDate(denD.getDate() + soNgay);
      const den = denD.toISOString().slice(0, 10);
      const items = (plhq.allDocuments ? plhq.allDocuments() : []).flatMap((d) => {
        const out = [];
        if (d.hieuLucTu && d.tinhTrang === 'CHUA_CO_HIEU_LUC' && d.hieuLucTu >= tu && d.hieuLucTu <= den) {
          out.push({ soHieu: d.soHieu, ten: d.ten, tinhTrang: d.tinhTrang, suKien: 'LEN_HIEU_LUC', ngay: d.hieuLucTu, hieuLucTu: d.hieuLucTu, biThayTheBoi: d.biThayTheBoi || null });
        }
        if (d.hetHieuLucTu && d.tinhTrang === 'CON_HIEU_LUC' && d.hetHieuLucTu >= tu && d.hetHieuLucTu <= den) {
          out.push({ soHieu: d.soHieu, ten: d.ten, tinhTrang: d.tinhTrang, suKien: 'HET_HIEU_LUC', ngay: d.hetHieuLucTu, hetHieuLucTu: d.hetHieuLucTu, biThayTheBoi: d.biThayTheBoi || null });
        }
        return out;
      }).sort((a, b) => (a.ngay < b.ngay ? -1 : a.ngay > b.ngay ? 1 : String(a.soHieu).localeCompare(String(b.soHieu))));
      return res.status(200).json({ registry: meta, tu, den, soNgay, total: items.length, items });
    }

    // GET /api/admin/llm-cost?ngay=YYYY-MM-DD (L0j, #547): chi phí LLM lượt công khai theo ngày giờ VN.
    // KÍN — không nằm trong allowlist lib/public-access.js (requireAuthUnlessPublic ở đầu handler đã đòi Bearer).
    if (resource === 'llm_cost') {
      const ngay = String(req.query.ngay || '').trim() || homNayVn();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay) || Number.isNaN(Date.parse(`${ngay}T00:00:00Z`))) {
        return res.status(400).json({ error: 'DAU_VAO_SAI', chiTiet: ['ngay phải dạng YYYY-MM-DD (giờ Việt Nam).'] });
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(tongHopNgay(ngay));
    }

    if (resource === 'kpi') {
      const kpi = buildKpiDashboard();
      return res.status(200).json(kpi);
    }

    if (resource === 'accuracy') {
      return res.status(200).json(getAccuracyStats());
    }

    if (resource === 'data_quality') {
      const reportPath = path.join(process.cwd(), 'data', 'data-quality-report.json');
      if (!fs.existsSync(reportPath)) {
        return res.status(404).json({ error: 'Chưa có report — chạy npm run data:quality-report rồi commit' });
      }
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      // ?category=missingVat → chỉ trả 1 nhóm finding
      const category = req.query.category;
      if (category) {
        const f = report.findings?.[category];
        if (!f) return res.status(404).json({ error: 'Unknown category', available: Object.keys(report.findings || {}) });
        return res.status(200).json({ generatedAt: report.generatedAt, category, ...f });
      }
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).json(report);
    }

    if (resource === 'error_log') {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const entries = readErrorLog(limit);
      return res.status(200).json({ total: entries.length, entries });
    }

    if (resource === 'policy_procedures') {
      const { code, hs } = req.query;
      // ?code=attp → 1 procedure detail
      if (code) {
        const proc = getProcedureByCode(String(code));
        if (!proc) return res.status(404).json({ found: false, code });
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).json({ found: true, ...proc });
      }
      // ?hs=10011100 → procedures applicable to this HS code
      if (hs) {
        const enriched = getEnrichedForHs(hs);
        const procedures = enriched?.warnings ? getProcedures(enriched.warnings) : [];
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).json({ hsCode: String(hs).replace(/\D/g,'').slice(0,8), total: procedures.length, procedures });
      }
      // No params → list all procedure types
      const all = listProcedures();
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).json({ total: all.length, procedures: all });
    }

    if (resource === 'products') {
      const { hs, limit: limitQ } = req.query;
      const limit = Math.min(Math.max(parseInt(limitQ, 10) || 8, 1), 20);

      // Summary mode: ?stats=1 → tổng quan + queue ưu tiên đào (không cần hs)
      if (String(req.query.stats || '') === '1' && !hs) {
        res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
        return res.status(200).json(getStatsSummary());
      }

      // Product corpus is static between deploys
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');

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
          // products = tên hàng thật từ tờ khai; generatedProducts = câu máy sinh, CHƯA kiểm chứng.
          products,
          generatedProducts: getGeneratedProducts(hsCode, limit),
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
          generatedProducts: getGeneratedProducts(hsCode, limit),
        };
      });
      return res.status(200).json({ total: results.length, results });
    }

    if (resource === 'prompt_versions') {
      return res.status(200).json(listPromptVersions());
    }

    if (resource === 'admin_suggestions') {
      const minCount = Math.max(parseInt(req.query.minCount, 10) || 3, 1);
      const patterns = detectRepeatedPatterns(minCount);
      return res.status(200).json({
        total: patterns.length,
        minCount,
        note: 'Patterns with ≥minCount director overrides within feedback. Approve bulk via POST /api/feedback/bulk-approve.',
        patterns,
      });
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
