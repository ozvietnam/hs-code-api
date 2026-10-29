// lib/describe-core.js — lõi của POST /api/describe, tách khỏi handler để
// /api/declaration-sheet (phiếu hồ sơ khai báo) dùng lại đúng một đường sinh mô tả.
// Trả { status, json } thay vì ghi thẳng vào res.

const { understandQuery } = require('./query-understand');
const { getTaxRecord, normalizeHs } = require('./data');
const { mapTaxRecord } = require('./tax-mapper');
// Gọi qua module (không destructure) để test mock được chuỗi fallback.
const llmTier = require('./llm-tier');
const { SYSTEM_PROMPT, buildChapterFieldsPrompt } = require('./customs-prompt');
const { composeWithMeta, GHI_CHU_HYS } = require('./describe-compose');
const { validateDeclaration, normalizeDeclaration } = require('./declaration-validator');
const { captureError } = require('./error-monitor');
const { checkTrademarkRiskEnriched } = require('./trademark-watch');
const { describeAttributes } = require('./describe-attributes');
const { getDeclarationFieldSpec } = require('./compliance-data');
const { isPrivate } = require('./llm-privacy');
const { thamChieuMoTa, congKhai, chuaCauOz } = require('./describe-references');

// Khoá nhà sản xuất trong thongSo/attributes (Cổng ozplugin gửi thongSo → attributes) — tách ra ô NSX riêng,
// không để rơi vào "thông số kỹ thuật".
const NSX_KEYS = new Set(['nhaSanXuat', 'manufacturer', 'nsx', 'maker']);
function tachNsx(attributes) {
  if (!attributes || typeof attributes !== 'object') return { rest: attributes, nsx: null };
  if (Array.isArray(attributes)) {
    const hit = attributes.find((a) => a && NSX_KEYS.has(a.key));
    return { rest: attributes.filter((a) => !(a && NSX_KEYS.has(a.key))), nsx: hit ? String(hit.valueVi ?? hit.value ?? '').trim() || null : null };
  }
  const rest = {};
  let nsx = null;
  for (const [k, v] of Object.entries(attributes)) {
    if (NSX_KEYS.has(k)) nsx = String(v ?? '').trim() || null; else rest[k] = v;
  }
  return { rest, nsx };
}

// Cấp độ (cùng ngưỡng declaration-validator) — dùng khi hạ điểm sau khi chấm trên chuỗi cuối.
function levelOf(score, missingRequiredCount) {
  let level;
  if (score >= 90) level = 'EXCELLENT';
  else if (score >= 75) level = 'GOOD';
  else if (score >= 60) level = 'ACCEPTABLE';
  else if (score >= 40) level = 'WEAK';
  else level = 'REJECT';
  if (missingRequiredCount >= 2) level = 'REJECT';
  return level;
}

/**
 * Trường bắt buộc validator xếp "thiếu" nhưng có mặt trong chuỗi ghép → chuyển sang "có", trả 8 điểm (cùng mức trừ của
 * validator), bỏ cảnh báo MISSING_<KEY>. Chỉ áp cho trường chương (chapterSpecific.*).
 */
function traLaiTruongCo(compliance, text, hsCode) {
  const spec = getDeclarationFieldSpec(hsCode);
  if (!spec || !compliance?.chapterFields) return [];
  const { khopTruong } = require('./describe-compose');
  const tra = spec.required.filter((f) => compliance.missingRequired.includes(`chapterSpecific.${f.key}`) && khopTruong(text, f));
  for (const f of tra) {
    const path = `chapterSpecific.${f.key}`;
    compliance.missingRequired = compliance.missingRequired.filter((k) => k !== path);
    compliance.chapterSpecificMissing = (compliance.chapterSpecificMissing || []).filter((k) => k !== f.key);
    compliance.chapterFields.missing = compliance.chapterFields.missing.filter((k) => k !== f.key);
    if (!compliance.chapterFields.present.includes(f.key)) compliance.chapterFields.present.push(f.key);
    compliance.warnings = compliance.warnings.filter((w) => !(w.code === `MISSING_${f.key.toUpperCase()}` && w.field === path));
    compliance.score = Math.min(100, compliance.score + 8);
  }
  if (tra.length) {
    compliance.level = levelOf(compliance.score, compliance.missingRequired.length);
    const blocking = compliance.warnings.some((w) => w.severity === 'error') || compliance.missingRequired.length > 0;
    compliance.passesCustomsAudit = compliance.level !== 'REJECT' && !blocking;
  }
  return tra.map((f) => f.key);
}

/**
 * Chấm trên CHUỖI CUỐI khách dán vào ECUS (không chỉ bản cấu trúc): trường bắt buộc của chương mà validator coi là
 * "có" (trong declaration) nhưng KHÔNG có mặt trong customsDescription cuối → hạ điểm + FINAL_STRING_MISSING_FIELD.
 * Giữ nguyên shape hợp đồng (declaration, compliance.score, level, warnings[]).
 */
function chamChuoiCuoi(compliance, text, hsCode) {
  const spec = getDeclarationFieldSpec(hsCode);
  const present = compliance?.chapterFields?.present || [];
  if (!spec || !present.length) return [];
  const { khopTruong } = require('./describe-compose');
  const vang = spec.required.filter((f) => present.includes(f.key) && !khopTruong(text, f));
  if (!vang.length) return [];
  for (const f of vang) {
    compliance.warnings.push({
      code: 'FINAL_STRING_MISSING_FIELD',
      field: `chapterSpecific.${f.key}`,
      severity: 'warn',
      message: `Chuỗi mô tả ECUS cuối không chứa ${f.labelVi} (có trong bản khai cấu trúc nhưng không có mặt trong ${text.length} ký tự sẽ dán vào tờ khai).`,
      suggestion: `Đưa ${f.labelVi} vào mô tả — rút gọn phần khác hoặc tách dòng hàng.`,
    });
    compliance.score -= 8;
  }
  compliance.score = Math.max(0, Math.min(100, compliance.score));
  compliance.level = levelOf(compliance.score, (compliance.missingRequired || []).length);
  if (compliance.level === 'REJECT') compliance.passesCustomsAudit = false;
  compliance.finalStringMissing = vang.map((f) => f.key);
  return compliance.finalStringMissing;
}

const reply = (status, json) => ({ status, json });

/** describeProduct(body) → { status, json } — cùng hợp đồng với POST /api/describe. */
async function describeProduct(body) {
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
  const { rest: attrsInput, nsx: nsxAttr } = tachNsx(body?.attributes);
  const attrs = describeAttributes(attrsInput);
  const context = {
    productName: understood.applied
      ? [understood.facts.tenHangVi, understood.facts.quyCach].filter(Boolean).join(', ')
      : (body?.productName || mapped.nameVi),
    sourceText: [rawName, body?.customerDescription].filter(Boolean).join(' | ') || null,
    detectedOrigin: understood.facts?.noiSanXuat || null,
    brand: body?.brand || attrs.brand || understood.facts?.thuongHieu || null,
    model: body?.model || attrs.model || null,
    manufacturer: body?.manufacturer || body?.nhaSanXuat || nsxAttr || null,
    origin: body?.origin || null,
    material: body?.material || attrs.material || understood.facts?.chatLieu || null,
    condition: body?.condition || null,
    technicalSpec: [body?.technicalSpec, attrs.technicalSpec].filter(Boolean).join('; ') || null,
    purpose: body?.purpose || attrs.purpose || understood.facts?.congDung || null,
    customerDescription: body?.customerDescription || null,
    unitVi: mapped.unitVi,
    tariffNameVi: mapped.nameVi,
  };

  if (nsxAttr) attrs.used.push('nhaSanXuat');

  const started = Date.now();
  let declaration;
  let llmModel = null;
  // Cờ báo LLM lỗi → mô tả rơi về fallback context thô (không im lặng nữa).
  let llmError = null;
  // Đợt 0B: tham chiếu tên/văn phong đã kiểm chứng (kho Oz + TB-TCHQ) — chỉ số lượng/số hiệu ra phản hồi.
  let ref = { oz: [], tbTchq: [], capMa: null };
  let ozDaDung = 0;

  if (body?.declaration && body?.validateOnly) {
    declaration = normalizeDeclaration(body, context);
  } else {
    try {
      ref = await thamChieuMoTa({ hsCode, tenHang: context.productName });
    } catch { /* tham chiếu là tầng tuỳ chọn */ }
    const basePayload = {
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
    const thamChieu = (coOz) => [
      ...(coOz ? ref.oz.map((o) => ({ nguon: 'TO_KHAI_DA_THONG_QUAN', hs: o.hs, moTa: o.moTa })) : []),
      ...ref.tbTchq.map((p) => ({ nguon: 'TB-TCHQ', soHieu: p.soHieu, hs: p.hs, moTa: p.moTa })),
    ];

    const chapterHint = buildChapterFieldsPrompt(hsCode.slice(0, 2), hsCode);
    const systemPrompt = SYSTEM_PROMPT + chapterHint;
    const llmOpts = { step: 'describe', tier: 'standard', timeoutMs: 45000, geminiModelEnv: 'GEMINI_DESCRIBE_MODEL' };
    const goi = (coOz) => {
      const tc = thamChieu(coOz);
      const payload = tc.length ? { ...basePayload, thamChieu: tc } : basePayload;
      // Câu khai Oz là dữ liệu khách: lượt công khai (ngoài withPrivateData) có câu Oz thì ÉP chế độ riêng tư cho
      // lượt gọi này — không bao giờ để câu Oz tới tầng LLM miễn phí. Lượt dịch vụ đã riêng tư sẵn.
      const opts = coOz && ref.oz.length && !isPrivate() ? { ...llmOpts, containsCustomerData: true } : llmOpts;
      return llmTier.callLLMJson(systemPrompt, JSON.stringify(payload, null, 2), opts);
    };
    try {
      // Cùng thứ tự với mọi endpoint (lib/llm-tier.js): MiniMax → … → dự phòng; lượt riêng tư chỉ nhà cung cấp hợp lệ.
      let result;
      try {
        result = await goi(true);
        ozDaDung = ref.oz.length;
      } catch (e) {
        // Lượt công khai, không có nhà cung cấp riêng tư → gọi lại KHÔNG kèm câu Oz (chuỗi công khai như cũ).
        if (e && e.code === 'NO_PRIVATE_LLM' && ref.oz.length && !isPrivate()) {
          result = await goi(false);
          ozDaDung = 0;
        } else throw e;
      }
      llmModel = result.model;
      declaration = normalizeDeclaration(result.json, context);
      const rawDecl = result.json?.declaration || result.json || {};
      declaration.nhaSanXuat = rawDecl.nhaSanXuat || context.manufacturer || null;
    } catch (error) {
      captureError(error, { endpoint: 'describe', hsCode });
      // Hết provider vẫn trả bản khai dựng từ dữ kiện người dùng (degraded),
      // KHÔNG 503 — mô hình/ERP phía trên vẫn có khung để làm việc tiếp.
      declaration = normalizeDeclaration(
        {
          declaration: {
            tenHang: context.productName,
            xuatXu: context.origin,
            donViTinh: context.unitVi,
            tinhTrang: context.condition,
            nhanHieu: context.brand,
            model: context.model,
            thongSoKyThuat: context.technicalSpec ? context.technicalSpec.split(/;\s*/).filter(Boolean) : [],
            thanhPhanCauTao: context.material,
            congDung: context.purpose,
          },
        },
        context
      );
      declaration.nhaSanXuat = context.manufacturer || null;
      llmModel = null;
      ozDaDung = 0;
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
  if (declaration && declaration.nhaSanXuat === undefined) declaration.nhaSanXuat = context.manufacturer || null;

  // Riêng tư: LLM chép nguyên câu khai Oz (của lô/khách khác) vào bản khai → thay bằng dữ kiện đầu vào của chính lượt này.
  let daChanCauOz = false;
  if (ref.oz.length) {
    const thay = { tenHang: context.productName, thanhPhanCauTao: context.material, congDung: context.purpose };
    for (const k of Object.keys(thay)) {
      if (chuaCauOz(declaration[k], ref)) { declaration[k] = thay[k] || null; daChanCauOz = true; }
    }
    if (Array.isArray(declaration.thongSoKyThuat)) {
      const truoc = declaration.thongSoKyThuat.length;
      declaration.thongSoKyThuat = declaration.thongSoKyThuat.filter((t) => !chuaCauOz(t, ref));
      if (declaration.thongSoKyThuat.length !== truoc) daChanCauOz = true;
    }
  }

  // #324: nhóm máy (84/85 — template bắt buộc power/voltage): thông số không bị hy sinh trước phụ đề.
  const CHUONG_MAY = new Set(['84', '85']);
  const keepSpecs = CHUONG_MAY.has(hsCode.slice(0, 2));

  // Vòng 1 (Đợt 0B): biểu thuế dùng để KIỂM tên hàng, không THAY — chỉ thay khi tên mơ hồ/ngoại ngữ
  // (khi đó lấy danh từ cụ thể, không bao giờ chuỗi "các loại"/"hoặc"/"kể cả"). Tên đã chọn ghi vào declaration.tenHang.
  let tenChon = { ten: declaration.tenHang || context.productName, thayDoi: false, lyDo: 'KHONG_CO_CAY', canhBao: [] };
  let gopMoTaPhapLy = null;
  try {
    const { breadcrumbOf } = require('./hs-breadcrumb.js');
    const legal = await import('./describe-legal-head.mjs');
    gopMoTaPhapLy = legal.gopMoTaPhapLy;
    const bc = breadcrumbOf(hsCode) || null;
    if (bc) tenChon = legal.chonTenHang({ tenHangKhach: declaration.tenHang || context.productName, breadcrumb: bc });
  } catch { /* tầng kiểm tên là tuỳ chọn: lỗi ở đây giữ tên LLM */ }
  if (tenChon.thayDoi && tenChon.ten) declaration.tenHang = tenChon.ten;

  const compliance = validateDeclaration(declaration, hsCode, context);
  if (daChanCauOz) {
    compliance.warnings.push({ code: 'REFERENCE_COPY_BLOCKED', field: 'tenHang', severity: 'info', message: 'AI chép nguyên câu tham chiếu đã kiểm chứng vào bản khai — đã thay bằng dữ kiện đầu vào của lượt này.' });
  }
  const hasMismatch = compliance.warnings.some((w) => w.code === 'MISMATCH_HS');
  for (const cb of tenChon.canhBao) {
    if (cb.code === 'TEN_LECH_NHANH' && hasMismatch) continue;
    compliance.warnings.push({ code: cb.code, field: 'tenHang', severity: 'warn', message: cb.messageVi });
  }
  const tenHangMoTa = declaration.tenHang || tenChon.ten;
  const declMoTa = { ...declaration, tenHang: tenHangMoTa };
  const ghep = (maxLength) => (gopMoTaPhapLy
    ? gopMoTaPhapLy({ declaration: declMoTa, hsCode, keepSpecs, maxLength })
    : composeWithMeta(declMoTa, { hsCode, keepSpecs, maxLength }));
  let composed = ghep(200);
  // Trường validator báo thiếu nhưng THỰC CÓ trong chuỗi ghép (vd "model: X" — mẫu validator chỉ dò chữ "model"
  // trong tên/thông số) → không ghi "(thiếu: …)" oan, trả lại điểm.
  try { traLaiTruongCo(compliance, composed.text, hsCode); } catch { /* tuỳ chọn */ }

  // Vòng 2 (CEO 29/10): trường bắt buộc còn thiếu → ghi rõ "(thiếu: X, Y)" bằng NHÃN TIẾNG VIỆT;
  // webFacts tự tìm được thì coi như đã bổ sung, còn thiếu mới mở ngoặc. Tính TRƯỚC khi ghép để chừa chỗ.
  let factTuTim = null;
  let conThieu = [];
  let v2 = null;
  try {
    v2 = await import('./describe-missing-inline.mjs');
    const thieu = v2.nhanTruongThieu(compliance.missingRequired || []);
    if (thieu.length) {
      // Tự tìm 1 lượt web theo nhãn trường thiếu (chỉ khi có key ZAI) — tên hàng + nhãn trường.
      let fact = {};
      try {
        const { webFacts } = require('./web-facts.js');
        const wf = await webFacts({
          model: `${declaration.nhanHieu || ''} ${declaration.model || ''}`.trim() || (context.productName || '').slice(0, 60),
          mucTieu: thieu.map((t) => t.labelVi).join(', ').slice(0, 200),
        });
        if (wf && wf.cauTraLoi) {
          const text = wf.cauTraLoi;
          const esc = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          for (const t of thieu) {
            const re = new RegExp(`${esc(t.labelVi)}[^\n;]{1,60}?([\\w][\\w\\s.,/-]{1,30})`, 'i');
            const m = text.match(re);
            if (m && m[1].trim().length > 1) fact[t.key] = m[1].trim();
          }
        }
      } catch { /* web là tuỳ chọn */ }
      factTuTim = Object.keys(fact).length ? fact : null;
      conThieu = v2.gopVong2({ missingRequired: thieu, factTimDuoc: fact }).conThieu;
    }
  } catch { /* vòng 2 là tầng tuỳ chọn */ }

  // Ghép lại chừa chỗ cho ghi chú "(thiếu: …)" để không phải cắt sau.
  const ghiChu = conThieu.length && v2 ? v2.doanThieu(conThieu) : '';
  if (ghiChu) composed = ghep(200 - ghiChu.length - 1);
  let customsDescriptionV2 = composed.text;
  let moTaDayDu = composed.moTaDayDu;
  if (ghiChu && v2) {
    customsDescriptionV2 = v2.boTruongThieuVaoMoTa({ text: composed.text, missingRequired: conThieu }).text;
    moTaDayDu = v2.boTruongThieuVaoMoTa({ text: composed.moTaDayDu, missingRequired: conThieu, gioiHan: Infinity }).text;
  }

  if (composed.specsVao > 0 && composed.specsRa === 0) {
    compliance.warnings.push({ code: 'SPEC_DROPPED', messageVi: `Toàn bộ ${composed.specsVao} thông số không vừa 200 ký tự ECUS — đã chuyển sang khaiTiepHys (khai tiếp bằng nghiệp vụ HYS); nên rút ngắn tên hàng/thành phần để giữ công suất/điện áp trong ô mô tả.` });
  }
  if (composed.overflow) {
    compliance.warnings.push({
      code: 'CLASSIFICATION_OVERFLOW',
      field: 'customsDescription',
      severity: 'error',
      message: `Riêng tên hàng + đặc trưng phân loại đã vượt 200 ký tự ECUS kể cả sau khi viết tắt — phần đặc trưng không vừa đã chuyển sang khaiTiepHys: ${composed.dropped.join('; ')}.`,
      suggestion: 'Khai phần còn lại bằng nghiệp vụ HYS (chỉ tiêu 1.68 TT 121/2025), hoặc rút gọn tên hàng/chất liệu/công dụng; kiểm lại trước khi dán vào tờ khai.',
    });
  }

  // Không fail-silent: LLM lỗi → mô tả là fallback context thô, báo rõ vào warnings.
  if (llmError) {
    compliance.warnings.push({
      code: 'DESCRIPTION_DEGRADED',
      field: 'customsDescription',
      severity: 'warn',
      message: `Mô tả sinh ở chế độ dự phòng (không qua AI) do LLM lỗi: ${llmError.message}. ${
        llmError.retryable ? 'Lỗi tạm thời — nên gọi lại.' : 'Cần kiểm tra cấu hình/model LLM.'
      }`,
      suggestion: 'Chạy lại /api/describe khi LLM sẵn sàng để có mô tả chuẩn TT 39/2018.',
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

  // Chấm trên chuỗi cuối (Đợt 0B): trường bắt buộc phải thật sự nằm trong chuỗi khách dán.
  try { chamChuoiCuoi(compliance, customsDescriptionV2, hsCode); } catch { /* chấm bổ sung là tuỳ chọn */ }

  return reply(200, {
    declaration,
    customsDescription: customsDescriptionV2,
    descriptionMeta: {
      length: customsDescriptionV2.length,
      maxLength: 200,
      truncated: composed.truncated,
      fullLength: composed.fullLength,
      dropped: composed.dropped,
      ...(composed.truncated ? { fullText: composed.fullText } : {}),
      ...(composed.vietTat?.length ? { vietTat: composed.vietTat } : {}),
      ...(conThieu.length ? { thieu: conThieu.map((t) => t.labelVi) } : {}),
      tenHang: { chon: tenHangMoTa, thayDoi: tenChon.thayDoi, lyDo: tenChon.lyDo },
    },
    // Không âm thầm bỏ dữ kiện (chỉ tiêu 1.68 TT 121/2025): phần không vừa 200 ký tự → khai tiếp bằng nghiệp vụ HYS.
    khaiTiepHys: composed.khaiTiep || null,
    ...(composed.khaiTiep ? { khaiTiepHysGhiChu: GHI_CHU_HYS } : {}),
    // Bản đầy đủ, không viết tắt (chuỗi chính + phần khai tiếp) — bản lưu hồ sơ.
    moTaDayDu,
    compliance,
    trademarkRisk,
    attributesUsed: attrs.used,
    ...(attrs.skipped.length ? { attributesSkipped: attrs.skipped } : {}),
    // Riêng tư: chỉ số câu tờ khai Oz đã dùng làm mẫu (không có nguyên câu); TB-TCHQ công khai → số hiệu + mã.
    thamChieu: congKhai(ref, { ozDaDung }),
    ...(factTuTim ? { factTuTim: Object.keys(factTuTim) } : {}),
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

module.exports = { describeProduct };
