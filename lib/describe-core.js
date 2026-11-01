// lib/describe-core.js — lõi của POST /api/describe, tách khỏi handler để
// /api/declaration-sheet (phiếu hồ sơ khai báo) dùng lại đúng một đường sinh mô tả.
// Trả { status, json } thay vì ghi thẳng vào res.

const { understandQuery } = require('./query-understand');
const { getTaxRecord, normalizeHs } = require('./data');
const { mapTaxRecord } = require('./tax-mapper');
// Gọi qua module (không destructure) để test mock được chuỗi fallback.
const llmTier = require('./llm-tier');
const { SYSTEM_PROMPT, buildChapterFieldsPrompt } = require('./customs-prompt');
const { composeWithMeta, daCoTrongTen } = require('./describe-compose');
const { validateDeclaration, normalizeDeclaration } = require('./declaration-validator');
const { captureError } = require('./error-monitor');
const { checkTrademarkRiskEnriched } = require('./trademark-watch');
const { describeAttributes } = require('./describe-attributes');

const reply = (status, json) => ({ status, json });

// Nhãn tiếng Việt của trường thiếu (không bao giờ trả khoá camelCase ra ngoài — #725 lỗi 15).
const NHAN_TRUONG_CHUNG = { tenHang: 'Tên hàng', xuatXu: 'Xuất xứ', donViTinh: 'Đơn vị tính', tinhTrang: 'Tình trạng', nhanHieu: 'Nhãn hiệu', model: 'Model', thongSoKyThuat: 'Thông số kỹ thuật', thanhPhanCauTao: 'Thành phần/chất liệu', congDung: 'Công dụng' };
function nhanTruong(key) {
  if (NHAN_TRUONG_CHUNG[key]) return NHAN_TRUONG_CHUNG[key];
  try {
    const { fieldCatalog } = require('./compliance-data');
    const n = fieldCatalog.fields?.[key]?.labelVi;
    if (n) return n;
  } catch { /* không có danh mục */ }
  return 'thông số đặc thù';
}

/**
 * describeProduct(body, quyen?) → { status, json } — cùng hợp đồng với POST /api/describe. Rẽ nhánh cờ HS_HO_SO (L1-5d, #648):
 * off / mã không thuộc lát 1 ⇒ đúng phản hồi đường cũ (describeProductCu); shadow ⇒ tính hồ sơ, ghi số đo, trả đường cũ;
 * on ⇒ đường cũ + sáu khối + hoSo (lib/ho-so/api.js#describeTheoCo). `quyen.noiBo` — khoá nội bộ Oz (lib/auth.js#laNoiBoOz).
 */
async function describeProduct(body, quyen = {}) {
  return require('./ho-so/api').describeTheoCo(body, quyen || {}, describeProductCu);
}

/** Đường cũ của /api/describe (trước hồ sơ phân loại) — phiếu khai báo và chế độ cờ off dùng thẳng. */
async function describeProductCu(body) {
  const hsCode = normalizeHs(body?.hsCode || body?.hs);
  if (!hsCode || hsCode === '00000000') {
    return reply(400, { error: 'hsCode is required' });
  }

  const tariff = getTaxRecord(hsCode);
  if (!tariff) {
    return reply(404, {
      found: false,
      message: `HS code ${hsCode} not found in tariff data`,
    });
  }

  const mapped = mapTaxRecord(tariff);
  // Tên hàng tiếng Trung (tiêu đề Taobao) → tên hàng tiếng Việt trước khi soạn mô
  // tả; bản gốc giữ lại để kiểm xuất xứ (vd 墨西哥 → hàng Mexico, không phải TQ).
  const rawName = String(body?.productName || '').trim();
  const understood = rawName ? await understandQuery(rawName) : { applied: false, facts: null };
  // H5: thông số đã chuẩn hóa từ ERP (khóa chuẩn → giá trị tiếng Việt) — dùng thay chữ
  // Trung thô khi soạn mô tả. Giá trị còn chữ Hán bị bỏ, báo lại ở attributesSkipped.
  const attrs = describeAttributes(body?.attributes);
  const context = {
    productName: understood.applied
      ? [understood.facts.tenHangVi, understood.facts.quyCach].filter(Boolean).join(', ')
      : (body?.productName || mapped.nameVi),
    sourceText: [rawName, body?.customerDescription].filter(Boolean).join(' | ') || null,
    detectedOrigin: understood.facts?.noiSanXuat || null,
    brand: body?.brand || attrs.brand || understood.facts?.thuongHieu || null,
    model: body?.model || attrs.model || null,
    origin: body?.origin || null,
    material: body?.material || attrs.material || understood.facts?.chatLieu || null,
    condition: body?.condition || null,
    technicalSpec: [body?.technicalSpec, attrs.technicalSpec].filter(Boolean).join('; ') || null,
    purpose: body?.purpose || attrs.purpose || understood.facts?.congDung || null,
    customerDescription: body?.customerDescription || null,
    // ĐVT khách khai (Cổng/ERP gửi donViTinh) thắng ĐVT biểu thuế (#725 lỗi 19).
    donViTinh: body?.donViTinh || body?.unit || null,
    unitVi: mapped.unitVi,
    tariffNameVi: mapped.nameVi,
  };

  const started = Date.now();
  let declaration;
  let llmModel = null;
  // Cờ báo LLM lỗi → mô tả rơi về fallback context thô (không im lặng nữa).
  let llmError = null;

  if (body?.declaration && body?.validateOnly) {
    declaration = normalizeDeclaration(body, context);
  } else {
    const payload = {
      hsCode,
      chapter: hsCode.slice(0, 2),
      ...context,
      tariffContext: {
        nameVi: mapped.nameVi,
        unitVi: mapped.unitVi,
        policyByHs: mapped.policyByHs,
        warnings: mapped.warnings,
      },
    };

    const chapterHint = buildChapterFieldsPrompt(hsCode.slice(0, 2), hsCode);
    const systemPrompt = SYSTEM_PROMPT + chapterHint;
    const userPrompt = JSON.stringify(payload, null, 2);
    try {
      // Cùng thứ tự với mọi endpoint (lib/llm-tier.js): Gemini miễn phí → dự phòng
      // (MiniMax…) → khóa Gemini trả phí chỉ khi không còn đường nào.
      const result = await llmTier.callLLMJson(systemPrompt, userPrompt, {
        step: 'describe', tier: 'standard', timeoutMs: 45000, geminiModelEnv: 'GEMINI_DESCRIBE_MODEL',
      });
      llmModel = result.model;
      declaration = normalizeDeclaration(result.json, context);
    } catch (error) {
      captureError(error, { endpoint: 'describe', hsCode });
      // Hết provider vẫn trả bản khai dựng từ dữ kiện người dùng (degraded),
      // KHÔNG 503 — mô hình/ERP phía trên vẫn có khung để làm việc tiếp.
      // Dự phòng (#725 nhóm C): GIỮ NGUYÊN tên hàng khách khai — không neo sang tên nhóm/dòng biểu thuế (tên dòng biểu thuế
      // là phạm vi pháp lý, không phải tên hàng: "cọ vẽ" ≠ "bút lông… dùng cho việc trang điểm"). Thông số tách từng mục để
      // khi rút gọn bỏ được từng mục theo ranh giới cụm.
      const specsDuPhong = [...(Array.isArray(body?.thongSoKyThuat) ? body.thongSoKyThuat : []), ...String(body?.technicalSpec || '').split(/\s*;\s*/), ...attrs.specs]
        .map((x) => String(x || '').trim()).filter(Boolean);
      declaration = normalizeDeclaration(
        {
          declaration: {
            tenHang: context.productName,
            xuatXu: context.origin,
            donViTinh: context.donViTinh || context.unitVi,
            tinhTrang: context.condition,
            nhanHieu: context.brand,
            model: context.model,
            thongSoKyThuat: [...new Set(specsDuPhong)],
            thanhPhanCauTao: context.material,
            congDung: context.purpose,
          },
        },
        context
      );
      llmModel = null;
      // Phân loại lỗi tạm thời (nên retry) vs vĩnh viễn — để MCP/ERP xử đúng.
      const errText = `${error.code || ''} ${error.status || ''} ${error.message || ''}`;
      const retryable = /429|rate|quota|timeout|etimedout|econnreset|503|500|overload|unavailable/i.test(errText);
      llmError = {
        code: error.code || 'GEMINI_ERROR',
        message: error.message || 'LLM generation failed',
        retryable,
      };
    }
  }

  // #324: nhóm máy (84/85 — template bắt buộc power/voltage): thông số không bị hy sinh trước phụ đề.
  const CHUONG_MAY = new Set(['84', '85']);
  // Cùng tuỳ chọn ghép cho bộ chấm và cho câu khai → cảnh báo LENGTH_EXCEEDED khớp descriptionMeta (#725 lỗi 20).
  context.composeOpts = { keepSpecs: CHUONG_MAY.has(hsCode.slice(0, 2)), ...(llmError ? { uuTien: 'duPhong' } : {}) };
  const compliance = validateDeclaration(declaration, hsCode, context);
  // Trường đặc thù đọc được (từ trường có cấu trúc + chữ) đi vào chapterSpecific — không để {} khi đã có (#725 lỗi 13).
  const daDoc = compliance.chapterFields?.giaTri || {};
  if (Object.keys(daDoc).length) {
    declaration.chapterSpecific = { ...Object.fromEntries(Object.entries(daDoc).filter(([, v]) => v)), ...(declaration.chapterSpecific || {}) };
  }
  // Vòng 1 (CEO 28/10): neo mô tả vào NGÔN NGỮ BIỂU THUẾ — tên đúng nhánh 2/4/6/8,
  // dòng "Loại khác" dùng phạm vi thật. KHÔNG còn mệnh đề "không gồm": mã anh em bị trừ lấy từ data/hs-context.json
  // (AI_CHUA_KIEM) — không vào mô tả khai báo (L0c #556); loại trừ quay lại ở L1-5c từ hoSo.loaiTru đã kiểm.
  let legalHead = null;
  try {
    const { breadcrumbOf } = require('./hs-breadcrumb.js');
    const { anchorTenBieuThue, gopMoTaPhapLy } = await import('./describe-legal-head.mjs');
    const bc = llmError ? null : (breadcrumbOf(hsCode) || null); // dự phòng: không neo tên biểu thuế (#725 nhóm C)
    if (bc) {
      const neo = anchorTenBieuThue({ tenHangKhach: declaration.tenHang || context.productName, breadcrumb: bc });
      const nhanDien = [declaration.nhanHieu && declaration.nhanHieu !== 'N/A' ? `nhãn hiệu ${declaration.nhanHieu}` : null, declaration.model ? `model ${declaration.model}` : null].filter(Boolean);
      const thongSoBatBuoc = CHUONG_MAY.has(hsCode.slice(0, 2))
        ? (Array.isArray(declaration.thongSoKyThuat) ? declaration.thongSoKyThuat.filter(Boolean).filter((sp) => /\b\d+(?:[.,]\d+)?\s*(kw|w|hp|kva|v|a)\b/i.test(sp)) : []).slice(0, 2)
        : [];
      const duoi = [declaration.xuatXu?.nameVi ? `xuất xứ ${declaration.xuatXu.nameVi}` : null, declaration.tinhTrang].filter(Boolean);
      legalHead = gopMoTaPhapLy({ neo, nhanDien, thongSoBatBuoc, loaiTranh: [], duoi });
      if (legalHead && legalHead.text) legalHead._breadcrumb = { selfVi: bc.selfVi, scopeVi: bc.scopeVi || null, headingVi: bc.headingVi };
    }
  } catch { /* tầng neo pháp lý là tuỳ chọn: lỗi ở đây giữ mô tả compose cũ */ }
  const ghepDu = composeWithMeta(declaration, context.composeOpts);
  const composed = legalHead && legalHead.text
    // Bản neo tên biểu thuế (vòng 1) là câu riêng, không phải bản cắt; chỉ khi bản ghép đủ trường vượt 200 (bộ chấm báo
    // LENGTH_EXCEEDED) thì descriptionMeta mang độ dài bản đầy đủ để con số khớp cảnh báo.
    ? (ghepDu.fullLength > ghepDu.maxLength
      ? { text: legalHead.text, length: legalHead.text.length, fullText: ghepDu.fullText, fullLength: ghepDu.fullLength, truncated: true, dropped: legalHead.dropped, maxLength: 200 }
      : { text: legalHead.text, length: legalHead.text.length, fullText: legalHead.text, fullLength: legalHead.text.length, truncated: false, dropped: legalHead.dropped, maxLength: 200 })
    : ghepDu;
  // Con số của LENGTH_EXCEEDED lấy đúng từ bản khai trả về (descriptionMeta), không từ một lượt ghép khác (#725 lỗi 20).
  for (const w of compliance.warnings) {
    if (w.code !== 'LENGTH_EXCEEDED') continue;
    w.message = `Mô tả đầy đủ ${composed.fullLength} ký tự > ${composed.maxLength} (giới hạn ECUS) — bản khai đã rút gọn còn ${composed.length}, giữ nguyên xuất xứ + tình trạng ở cuối`;
    w.suggestion = `Rút gọn thông số kỹ thuật/công dụng. Phần bị cắt: ${composed.dropped.join(', ') || 'không'}`;
  }
  // SPEC_DROPPED (#725 lỗi 36): chỉ đếm thông số THẬT SỰ vắng mặt trong câu khai trả về — thông số đã nằm trong tên hàng
  // (khử lặp ở describe-compose) không phải "bị cắt".
  const specsVao = Array.isArray(declaration?.thongSoKyThuat) ? declaration.thongSoKyThuat.filter(Boolean) : [];
  const specsMat = specsVao.filter((sp) => !daCoTrongTen(composed.text, sp));
  if (specsVao.length > 0 && specsMat.length === specsVao.length && composed.dropped.some((d) => d.startsWith('thongSoKyThuat'))) {
    compliance.warnings.push({ code: 'SPEC_DROPPED', messageVi: `Toàn bộ ${specsMat.length} thông số bị cắt cho vừa 200 ký tự ECUS — rút ngắn tên hàng/thành phần hoặc tách dòng để giữ công suất/điện áp (trường bắt buộc theo template chương).` });
  }

  // Luật rẻ của soat_to_khai (#725 lỗi 40): "Loại khác" mà mô tả khớp dòng/tiêu đề bị trừ; "bo mạch đã lắp" khai 8542. Cùng hàm
  // lib/soat-luat-re.js#canhBaoLuatRe, cùng câu chữ. Chỉ là cảnh báo HEURISTIC: không gắn GIR, không vào canCuPhapLy, không đổi
  // điểm/mức (một dòng một điểm với K1). Đọc trên câu KHÁCH viết, không trên câu LLM soạn lại.
  try {
    const { canhBaoLuatRe } = require('./soat-luat-re');
    const cauKhach = [rawName, body?.customerDescription].filter(Boolean).join('. ') || declaration.tenHang || '';
    for (const c of canhBaoLuatRe(hsCode, cauKhach, context.technicalSpec || null)) {
      compliance.warnings.push({
        code: c.ma,
        field: 'hsCode',
        severity: 'warn',
        basis: 'HEURISTIC',
        message: c.noiDung,
        suggestion: c.goiYSua,
        evidence: c.evidence,
        nguon: c.nguon.map((n) => n.duongDan),
        ...(c.maDeNghiXem ? { maDeNghiXem: c.maDeNghiXem } : {}),
      });
    }
  } catch { /* luật rẻ là tầng tuỳ chọn: lỗi ở đây giữ phản hồi như cũ */ }

  // Không fail-silent: LLM lỗi → mô tả là fallback context thô, báo rõ vào warnings.
  if (llmError) {
    compliance.warnings.push({
      code: 'DESCRIPTION_DEGRADED',
      field: 'customsDescription',
      severity: 'warn',
      message: `Mô tả sinh ở chế độ dự phòng (không qua AI) do LLM lỗi: ${llmError.message}. ${
        llmError.retryable ? 'Lỗi tạm thời — nên gọi lại.' : 'Cần kiểm tra cấu hình/model LLM.'
      }`,
      suggestion: 'Chạy lại /api/describe khi LLM sẵn sàng để có mô tả đầy đủ.',
    });
  }

  // P2: cảnh báo rủi ro nhãn hiệu được bảo hộ (TT 13/2015 & 13/2020).
  // Tách trục riêng với điểm compliance TT 39/2018 — chỉ thêm 1 cảnh báo mềm.
  const trademarkRisk = await checkTrademarkRiskEnriched({
    brand: declaration.nhanHieu || context.brand,
    text: `${declaration.tenHang || ''} ${context.customerDescription || ''}`,
    hsCode,
    origin: declaration.xuatXu?.nameVi || declaration.xuatXu?.code || context.origin,
    importer: context.importer || context.importerName || undefined,
  });
  if (trademarkRisk.matched) {
    compliance.warnings.push({
      code: 'TRADEMARK_WATCH',
      field: 'nhanHieu',
      severity: trademarkRisk.riskLevel === 'CRITICAL' || trademarkRisk.riskLevel === 'HIGH' ? 'error' : 'warn',
      message: trademarkRisk.summary,
      suggestion: trademarkRisk.matches[0]?.recommendations?.[0],
    });
  }

  // Vòng 2 (CEO 29/10): trường bắt buộc còn thiếu → ghi chú "(thiếu: X, Y)" cho người duyệt; webFacts tự tìm được thì
  // bổ sung trước, còn thiếu mới ghi. #725 lỗi 15/31: ghi chú này là chữ NỘI BỘ — KHÔNG ghép vào customsDescription (ô mô tả
  // ECUS), chỉ trả ở descriptionMeta.thieuTruong / descriptionMeta.banNhapCoGhiChu, nhãn tiếng Việt (không khoá camelCase).
  const customsDescriptionV2 = composed.text;
  let factTuTim = null;
  let thieuTruong = [];
  let banNhapCoGhiChu = null;
  try {
    const { boTruongThieuVaoMoTa, gopVong2, rutGiaTriTheoNhan } = await import('./describe-missing-inline.mjs');
    const thieu = (compliance.missingRequired || []).map((k) => {
      const key = String(k).split('.').pop();
      return { key, labelVi: nhanTruong(key) };
    });
    if (thieu.length) {
      // Tự tìm 1 lượt web theo nhãn trường thiếu (chỉ khi có key ZAI) — CHỈ nhãn hiệu/model + khoá trường,
      // không bao giờ tên hàng của khách (L0a #546): không hiệu/model thì không tra web.
      let fact = {};
      try {
        const brand = declaration.nhanHieu && declaration.nhanHieu !== 'N/A' ? declaration.nhanHieu : null;
        const model = declaration.model || null;
        const { webFacts } = require('./web-facts.js');
        const wf = (brand || model) ? await webFacts({
          brand,
          model,
          mucTieu: thieu.map((t) => t.key).join(', ').slice(0, 200), // khoá từ vựng (riêng tư: webFacts chỉ nhận khoá, không chữ tự do)
        }) : null;
        if (wf && wf.cauTraLoi) {
          const text = wf.cauTraLoi;
          for (const t of thieu) {
            const giaTri = rutGiaTriTheoNhan(text, t.labelVi) || rutGiaTriTheoNhan(text, t.key);
            if (giaTri) fact[t.key] = giaTri;
          }
        }
      } catch { /* web là tuỳ chọn */ }
      factTuTim = Object.keys(fact).length ? fact : null;
      const { conThieu } = gopVong2({ missingRequired: thieu, factTimDuoc: fact });
      if (conThieu.length) {
        thieuTruong = conThieu.map((t) => ({ key: t.key, labelVi: t.labelVi }));
        banNhapCoGhiChu = boTruongThieuVaoMoTa({ text: composed.text, missingRequired: conThieu, gioiHan: 400 }).text;
      }
    }
  } catch { /* vòng 2 là tầng tuỳ chọn */ }

  return reply(200, {
    declaration,
    customsDescription: customsDescriptionV2,
    descriptionMeta: {
      length: composed.length,
      maxLength: composed.maxLength,
      truncated: composed.truncated,
      fullLength: composed.fullLength,
      dropped: composed.dropped,
      ...(composed.trungLap && composed.trungLap.length ? { trungLap: composed.trungLap } : {}),
      ...(composed.truncated ? { fullText: composed.fullText } : {}),
      ...(thieuTruong.length ? { thieuTruong, banNhapCoGhiChu } : {}),
    },
    compliance,
    trademarkRisk,
    attributesUsed: attrs.used,
    ...(attrs.skipped.length ? { attributesSkipped: attrs.skipped } : {}),
    llmModel,
    degraded: llmError !== null,
    llmError,
    contextUsed: {
      tariffFound: true,
      policyByHs: mapped.policyByHs,
      hsCode,
    },
    ms: Date.now() - started,
  });
}

module.exports = { describeProduct, describeProductCu };
