#!/usr/bin/env node
/**
 * Sinh public/openapi.json từ CHÍNH allowlist trong lib/public-access.js.
 *
 * Vì sao sinh tự động: tài liệu viết tay luôn trôi khỏi code. Dự án này vừa dính
 * đúng bệnh đó — docs/integration-guide.md mô tả girRulesApplied là mảng chuỗi
 * trong khi code trả mảng object suốt nhiều tháng. Sinh từ nguồn sự thật thì
 * không lệch được.
 */
import { createRequire } from 'module';
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { PUBLIC_ENDPOINTS, PUBLIC_DATASET_RESOURCES } = require('../lib/public-access.js');
const { PUBLIC_LLM_ENDPOINTS } = require('../lib/public-llm.js');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const BASE = 'https://hs-kb.uythacnhapkhau.com';

const bearer = [{ bearerAuth: [] }];
const pub = []; // mảng rỗng = không cần xác thực

const json = (schema) => ({ content: { 'application/json': { schema } } });
const errRef = { $ref: '#/components/schemas/Error' };

/**
 * requestBody / response / errors: schema cụ thể để agent (kể cả mô hình nhỏ)
 * gọi tool đúng tham số và đọc đúng trường. Trước đây mọi response chỉ là
 * {type: object} và POST không có requestBody.
 */
function op({ id, summary, description, params = [], auth, tags, requestBody, response, errors = {} }) {
  return {
    operationId: id,
    summary,
    description,
    tags,
    security: auth,
    parameters: params,
    ...(requestBody ? { requestBody: { required: true, ...json(requestBody) } } : {}),
    responses: {
      200: { description: 'Thành công', ...json(response || { type: 'object' }) },
      ...Object.fromEntries(Object.entries(errors).map(([code, d]) => [code, { description: d, ...json(errRef) }])),
      ...(auth === pub ? {} : { 401: { description: 'Thiếu hoặc sai Bearer token', ...json(errRef) } }),
      500: { description: 'Lỗi máy chủ', ...json(errRef) },
    },
  };
}

const str = (description, extra = {}) => ({ type: 'string', description, ...extra });
const nullable = (schema) => ({ ...schema, type: [schema.type, 'null'] });

const SCHEMAS = {
  Error: {
    type: 'object',
    properties: {
      error: str('Thông điệp lỗi'),
      code: str('Mã lỗi ổn định (nếu có), vd INVALID_HS_CODE, FEEDBACK_NOT_PERSISTED'),
      retryable: { type: 'boolean', description: 'true = lỗi tạm thời, gọi lại sau' },
      detail: str('Chi tiết kỹ thuật'),
    },
  },
  AcftaForOrigin: {
    type: 'object',
    description: 'Mức ACFTA áp cho nước xuất xứ. eligible=false → áp MFN; null → biểu gốc có nhiều mức, tra dòng 10 số.',
    properties: {
      origin: str('Mã ISO-2'),
      eligible: { type: ['boolean', 'null'] },
      rate: { type: ['number', 'null'] },
      higherThanMfn: { type: 'boolean', description: 'ACFTA cao hơn MFN — nên khai MFN' },
      noteVi: str('Giải thích để đọc cho người dùng'),
    },
  },
  MissingFact: {
    type: 'object',
    properties: {
      attribute: str('Tên khoá dùng trong facts'),
      questionVi: str('Câu hỏi để hỏi người dùng'),
      type: { type: 'string', enum: ['enum', 'number'] },
      unit: str('Đơn vị khi type=number'),
      optionsVi: {
        type: 'array',
        items: { type: 'object', properties: { index: { type: 'integer' }, value: { type: 'string' }, labelVi: { type: 'string' } } },
        description: 'Lựa chọn hợp lệ. Trả lời bằng value, index hoặc labelVi đều được.',
      },
    },
  },
  CanCuPhapLy: {
    type: 'object',
    description: 'Căn cứ pháp lý theo TT 85/2026/TT-BTC (hiệu lực 15/09/2026): bước nào đã áp dụng, tài liệu nào của Điều 6.1 thật sự có/đã tra. ' +
      'Trích dẫn nguyên văn nằm ở `dieuKhoan` (mỗi điều một lần), các bước chỉ nêu id. KHÔNG phải quyết định phân loại.',
    properties: {
      vanBan: { type: 'object', description: 'TT 85/2026/TT-BTC: số hiệu, ngày ban hành, hiệu lực, Công báo' },
      trangThai: { type: 'string', enum: ['XAC_DINH_THEO_DIEU_4', 'CHUA_CHOT_CAN_XAC_NHAN', 'THIEU_DU_KIEN', 'CHUA_XAC_DINH_DUOC'] },
      cacBuoc: { type: 'array', items: { type: 'object' }, description: 'Bước 1 = Điều 4 (Danh mục VN + Biểu thuế + 6 quy tắc tổng quát); bước 2 = Điều 6.1 (chỉ khi bước 1 chưa ra mã duy nhất), kèm trạng thái từng tài liệu a→d' },
      huongTiep: { type: 'array', items: { type: 'object' }, description: 'Chỉ khi chưa xác định được / thiếu dữ kiện: Điều 6.3, 3.3, 3.1' },
      luuYPhapLy: { type: 'array', items: { type: 'object' }, description: 'Điều 5.2 (thuế theo biểu có hiệu lực tại thời điểm đăng ký tờ khai); Điều 8 khi mô tả có dấu hiệu hàng tháo rời (basis HEURISTIC)' },
      dieuKhoan: { type: 'object', description: 'Từ điển id → {dieu, khoan, diem, tham_chieu, trang, trich nguyên văn}' },
      disclaimer: { type: 'string' },
    },
  },
  GirDetermination: {
    type: 'object',
    properties: {
      rule: str('Quy tắc, vd "GIR 6"'),
      basis: { type: 'string', enum: ['RULE_TABLE', 'DETERMINISTIC', 'HEURISTIC', 'LLM_ASSERTED'] },
      reasonVi: str('Lý do'),
      evidence: { type: 'object' },
      source: str('Nguồn'),
    },
  },
  Suggestion: {
    type: 'object',
    properties: {
      hsCode: str('Mã 8 số — luôn có trong biểu thuế'),
      nameVi: str('Tên trong biểu thuế'),
      confidence: { type: ['number', 'null'], description: 'Điểm mô hình tự khai, CHƯA hiệu chuẩn — không phải xác suất. null ở chế độ deterministic.' },
      reasoning: str('Lý do; số hiệu văn bản chưa kiểm chứng được gắn "[chưa kiểm chứng]"'),
      unverifiedCitations: { type: 'array', items: { type: 'string' } },
      productExamples: { type: 'array', items: { type: 'string' }, description: 'Tên hàng THẬT từ tờ khai (mã Loại khác)' },
      productExamplesGenerated: { type: 'array', items: { type: 'string' }, description: 'Câu máy sinh, chưa kiểm chứng' },
      addedByResidualGuard: { type: 'boolean', description: 'Mã Loại khác do hệ thống chèn thêm để cân nhắc' },
      taxAcftaChina: { $ref: '#/components/schemas/AcftaForOrigin' },
    },
  },
};

const SUGGEST_REQUEST = {
  type: 'object',
  properties: {
    description: str('Tên hàng + chất liệu + công dụng + thông số (≥ 3 ký tự)', { minLength: 3 }),
    facts: {
      type: 'object',
      additionalProperties: true,
      description: 'Trả lời missingFacts: {<attribute>: <value | index | labelVi | số>}',
    },
    options: {
      type: 'object',
      properties: {
        topReranked: { type: 'integer', minimum: 1, maximum: 5, default: 3 },
        topCandidates: { type: 'integer', minimum: 3, maximum: 20, default: 10 },
      },
    },
    items: {
      type: 'array', maxItems: 20,
      description: 'Chế độ batch: [{id, description}] — thay cho description',
      items: { type: 'object', properties: { id: { type: 'string' }, description: { type: 'string' } } },
    },
  },
};

const SUGGEST_RESPONSE = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['NO_CANDIDATES', 'NEED_FACTS', 'NEEDS_EXPERT', 'RESOLVED_BY_TABLE', 'REVIEW'], description: 'Đọc trước tiên' },
    nextAction: {
      type: 'object',
      description: 'Việc agent cần làm tiếp',
      properties: {
        type: { type: 'string', enum: ['REPHRASE', 'ASK_USER', 'HUMAN_REVIEW', 'USER_CONFIRM'] },
        questions: { type: 'array', items: { $ref: '#/components/schemas/MissingFact' } },
        then: { type: 'object', description: 'Lời gọi tiếp theo (endpoint + body mẫu)' },
        optionsHs: { type: 'array', items: { type: 'string' } },
        reasonVi: { type: 'string' },
      },
    },
    suggestions: { type: 'array', items: { $ref: '#/components/schemas/Suggestion' } },
    engine: { type: 'string', enum: ['llm', 'deterministic'] },
    degraded: { type: 'boolean' },
    llmRejectedCodes: { type: 'array', items: { type: 'object', properties: { hsCode: { type: 'string' }, reason: { type: 'string' } } } },
    missingFacts: { type: 'array', items: { $ref: '#/components/schemas/MissingFact' } },
    rejectedFacts: { type: 'array', items: { type: 'object' } },
    decisions: { type: 'array', items: { type: 'object' } },
    girRulesApplied: { type: 'array', items: { $ref: '#/components/schemas/GirDetermination' } },
    canCuPhapLy: { $ref: '#/components/schemas/CanCuPhapLy' },
    residualAdvisory: { type: 'object' },
    antiPatternWarnings: { type: 'array', items: { type: 'object' } },
    confusionWarning: { type: ['object', 'null'] },
    confusionAlerts: { type: 'array', items: { type: 'object' }, description: 'Từ điển mâu thuẫn HS: DN hay khai A, Hải quan hay ấn định B' },
  },
};

const TAX_RESPONSE = {
  type: 'object',
  properties: {
    found: { type: 'boolean' },
    hsCode: str('Mã 8 số'),
    nameVi: str('Tên trong biểu thuế'),
    unitVi: str('Đơn vị tính'),
    taxNkPreferential: str('Thuế NK ưu đãi (MFN), %'),
    taxNkTt: str('Thuế NK thông thường, %'),
    taxAcfta: str('Chuỗi ACFTA nguyên văn — ĐỪNG đọc số đầu, dùng acfta.forOrigin'),
    taxAcftaChina: { $ref: '#/components/schemas/AcftaForOrigin' },
    acfta: {
      type: 'object',
      properties: {
        raw: { type: 'string' }, rate: { type: ['number', 'null'] }, available: { type: ['boolean', 'null'] },
        excludedCountries: { type: 'array', items: { type: 'string' } }, needsReview: { type: 'boolean' },
        forOrigin: { $ref: '#/components/schemas/AcftaForOrigin' },
      },
    },
    taxVat: str('"A/B": A là mức ĐANG áp'),
    vatReduction: { type: 'object', description: 'eligible, rate, validUntil, noteVi, legalBasis' },
    tariffQuota: { type: 'object', description: 'Chỉ có với mặt hàng hạn ngạch: mfnInQuota, mfnOutQuota, noteVi' },
    policyByHs: nullable(str('Chính sách quản lý nguyên văn')),
    policyStatus: { type: 'string', enum: ['RECORDED', 'NOT_RECORDED'], description: 'NOT_RECORDED ≠ không có chính sách — đọc policyNoteVi' },
    policyNoteVi: str('Cảnh báo khi dữ liệu chính sách trống'),
    policyBasisReview: {
      type: 'object',
      description: 'Chỉ có khi ô chính sách còn dẫn danh mục đã/đang bị thay theo khung KTCN 2026 (NĐ 37/2026). KHÔNG đổi policyByHs — báo để đối chiếu. Xem /api/ktcn-regime.',
      properties: {
        status: { type: 'string', enum: ['OUTDATED_BASIS', 'NEEDS_REVIEW'] },
        items: { type: 'array', items: { type: 'object', properties: {
          id: str('Mã quy tắc (plhq:<số hiệu> khi lấy từ sổ cộng đồng)'), labelVi: str('Căn cứ cũ'),
          source: { type: 'string', enum: ['hs-code-api', 'oz-wiki-plhq'], description: 'hs-code-api = quy tắc KTCN 2026; oz-wiki-plhq = sổ đăng ký văn bản cộng đồng' },
          relation: { type: 'string', enum: ['REPLACED', 'LIKELY_REPLACED', 'REVIEW', 'UPCOMING', 'EXPIRED', 'SUSPENDED'] },
          url: str('Trang văn bản trong sổ cộng đồng (nếu có)'),
          confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
          effectiveFrom: str('Ngày văn bản mới có hiệu lực'),
          replacedBy: { type: 'array', items: { type: 'object' } },
          noteVi: str('Hướng dẫn đối chiếu'),
        } } },
        noteVi: str('Tóm tắt cho người khai'), asOf: str('Ngày đánh giá'), dataVersion: str('Phiên bản data/ktcn-regime-2026.json'),
        registryVersion: str('Phiên bản sổ đăng ký cộng đồng oz-wiki-plhq'),
      },
    },
    legalBasisRegistry: {
      type: 'object',
      description: 'Hiệu lực từng văn bản mà cột chính sách dẫn, theo sổ đăng ký cộng đồng oz-wiki-plhq (CC BY 4.0). hieuLucDaDoiChieu=false: chưa đối chiếu nguồn A — hiển thị như cảnh báo.',
      properties: {
        citations: { type: 'array', items: { type: 'object', properties: {
          cited: str('Số hiệu như viết trong cột chính sách'), found: { type: 'boolean' }, soHieu: str('Số hiệu chuẩn'), ten: str('Tên văn bản'),
          tinhTrang: { type: 'string', enum: ['CON_HIEU_LUC', 'HET_HIEU_LUC', 'HET_HIEU_LUC_MOT_PHAN', 'TAM_NGUNG_HIEU_LUC', 'CHUA_CO_HIEU_LUC', 'CHUA_XAC_MINH'] },
          hetHieuLucTu: str('Ngày hết hiệu lực'), biThayTheBoi: { type: 'array', items: { type: 'string' } },
          hieuLucDaDoiChieu: { type: 'boolean' }, url: str('Trang văn bản trong sổ cộng đồng'),
        } } },
        counts: { type: 'object' }, registryVersion: str('Phiên bản sổ'), syncedAt: str('Ngày đồng bộ'),
      },
    },
    hsListings: {
      type: 'array',
      description: 'Văn bản danh mục (phụ lục có mã HS) chứa mã này, theo bảng trích nguyên văn của sổ cộng đồng oz-wiki-plhq (docs/luoc-do-danh-muc-hs.md). Độc lập với cột chính sách cũ của biểu thuế. Chỉ có khi mã nằm trong ít nhất một bảng. match.level HS4/HS6 = khớp theo nhóm — đọc dieuKien. active=false: văn bản hết/chưa có hiệu lực hoặc chưa xác minh — không dùng để kết luận.',
      items: { type: 'object', properties: {
        soHieu: str('Số hiệu văn bản danh mục'), ten: str('Tên văn bản'),
        tinhTrang: { type: 'string', enum: ['CON_HIEU_LUC', 'HET_HIEU_LUC', 'HET_HIEU_LUC_MOT_PHAN', 'TAM_NGUNG_HIEU_LUC', 'CHUA_CO_HIEU_LUC', 'CHUA_XAC_MINH'] },
        active: { type: 'boolean', description: 'Đang áp dụng tại hôm nay (giờ VN)' },
        match: { type: 'object', properties: { level: { type: 'string', enum: ['HS8', 'HS6', 'HS4'] }, code: str('Mã như ghi trong phụ lục') } },
        moTa: str('Mô tả hàng nguyên văn trong phụ lục (dòng đầu tiên của nhóm)'), moTaMau: { type: 'array', items: { type: 'string' }, description: 'Tối đa 3 mô tả mẫu của các dòng đã gộp' }, soDong: { type: 'integer', description: 'Số dòng phụ lục gộp vào mục này (cùng văn bản, phụ lục, loại tác động, mức rủi ro, điều kiện)' }, phuLuc: str('Phụ lục'), nhom: str('Nhóm/STT trong phụ lục'),
        loaiTacDong: { type: 'string', enum: ['KIEM_TRA_ATTP', 'KIEM_TRA_CHAT_LUONG', 'KIEM_DICH_DONG_VAT', 'KIEM_DICH_THUC_VAT', 'GIAY_PHEP', 'CAM_NHAP_KHAU', 'CAM_XUAT_KHAU', 'CONG_BO_HOP_QUY', 'DANG_KY_LUU_HANH', 'PHONG_VE_THUONG_MAI', 'CAT_GIAM_KIEM_TRA', 'KHAC'] },
        mucRuiRo: { type: 'string', enum: ['CAO', 'TRUNG_BINH', 'THAP'] }, dieuKien: str('Giới hạn phạm vi in kèm dòng (nếu có)'),
        trang: { type: 'integer' }, effectiveFrom: str('Ngày hiệu lực'), effectiveTo: str('Ngày hết hiệu lực'),
        hieuLucDaDoiChieu: { type: 'boolean' }, table: { type: 'object' }, url: str('Bảng trong sổ cộng đồng'),
      } },
    },
    reviewByName: { type: 'boolean', description: 'true = có ít nhất một dòng chính sách khớp THEO TÊN (policyByName) — mức NOTICE, hasActionablePolicy=true, ERP hiện "chuyên viên kiểm" chứ không phải cờ đỏ.' },
    policyByName: {
      type: 'array',
      description: 'Cờ theo tên gọi (CEO 08/10/2026): văn bản không có bảng mã HS (data/policy-name-rules.json) hoặc dòng không mã trong sổ cộng đồng khớp cụm từ vào tên dòng biểu thuế / `name` / `purpose`, lọc theo chương. Không khẳng định mã thuộc diện — luôn kèm canCu để NV kiểm.',
      items: { type: 'object', properties: {
        level: { type: 'string', enum: ['REVIEW'] }, source: { type: 'string', enum: ['name'] }, ruleId: str('Mã luật trong policy-name-rules.json (null nếu từ sổ cộng đồng)'),
        soHieu: str('Số hiệu văn bản'), ten: str('Trích dẫn / tên văn bản'), nguon: str('Số hiệu + điều/mục hoặc nơi trích'),
        cumTu: str('Cụm từ đã khớp'), matchedIn: { type: 'string', enum: ['tariffNameVi', 'productNameVi', 'purposeVi'] },
        canCu: str('"<cụm từ>" khớp <tên dòng biểu thuế|tên hàng|công dụng>'), coQuan: str('Mã bộ quản lý'),
        loaiTacDong: { type: 'string' }, ghiChu: str('Ghi chú cho NV kiểm'),
      } },
    },
    mappedHs: { type: 'object', description: 'Chương 98: mã hàng tương ứng tại Mục I' },
    tariff: { type: 'object', description: 'effectiveDate, lastCheckedAt, freshness (OK/DUE/...), noteVi' },
    breadcrumb: { type: 'object' },
  },
};

const DESCRIBE_REQUEST = {
  type: 'object',
  required: ['hsCode'],
  properties: {
    hsCode: str('Mã HS 8 số (có trong biểu thuế)'),
    productName: str('Tên hàng'),
    brand: str('Nhãn hiệu'),
    model: str('Model / ký hiệu'),
    origin: str('Xuất xứ'),
    material: str('Chất liệu / thành phần'),
    condition: str('Tình trạng, vd "Mới 100%"'),
    technicalSpec: str('Thông số kỹ thuật'),
    purpose: str('Công dụng'),
    customerDescription: str('Mô tả gốc của khách'),
  },
};

const DESCRIBE_RESPONSE = {
  type: 'object',
  properties: {
    declaration: { type: 'object', description: 'Các trường khai báo có cấu trúc (TT 39/2018)' },
    customsDescription: str('Mô tả ≤ 200 ký tự để dán ECUS'),
    compliance: {
      type: 'object',
      properties: {
        score: { type: 'number' },
        level: { type: 'string', enum: ['EXCELLENT', 'GOOD', 'ACCEPTABLE', 'WEAK', 'REJECT'] },
        warnings: { type: 'array', items: { type: 'object', properties: { code: { type: 'string' }, severity: { type: 'string' }, message: { type: 'string' }, suggestion: { type: 'string' } } } },
        passesCustomsAudit: { type: 'boolean' },
      },
    },
    degraded: { type: 'boolean', description: 'true = bản khai dựng không qua AI, cần người sửa' },
    llmError: { type: ['object', 'null'] },
  },
};

const CLASSIFY_REQUEST = {
  type: 'object',
  required: ['tenHang'],
  properties: {
    tenHang: str('Tên hàng (≥ 2 ký tự)'),
    chatLieu: str('Chất liệu'),
    congDung: str('Công dụng'),
    chucNang: str('Chức năng'),
    specs: str('Thông số'),
    nameZh: str('Tên tiếng Trung'),
    tier: { type: 'string', enum: ['standard', 'premium'] },
    supplierHs: {
      type: 'object',
      description: 'Mã HS nhà cung cấp tự khai trên trang sản phẩm (made-in-china, 09/10/2026). Mã TQ 8–10 số: chỉ 6 số đầu theo HS ' +
        'quốc tế, đuôi là của TQ → máy chủ dùng làm MỘT nguồn kiểm chứng (nhóm 4 số được xem chú giải + dòng biểu thuế; chọn khác ' +
        'nhóm thì AI phải giải trình, kết quả có `review.needed`; cùng 6 số thì tăng tin cậy). Không bao giờ lấy nguyên mã làm mã VN. ' +
        'Trả `dossier.supplier {code, hs6, heading4, url, agree: SAME6|SAME4|DIFF}` (động cơ loop).',
      properties: { code: str('Chữ số, ≥ 6 (vd "90049090")'), source: str('Nguồn, vd "made-in-china"'), url: str('Link trang sản phẩm của nhà cung cấp') },
      required: ['code'],
    },
  },
};

const q = (name, description, required = false) => ({
  name, in: 'query', required, description, schema: { type: 'string' },
});

const paths = {
  '/api/health': {
    get: op({
      id: 'health', tags: ['Hệ thống'], auth: pub,
      summary: 'Kiểm tra dịch vụ + trạng thái LLM',
      description:
        'Trả 200 khi đủ cả 3 điều kiện: có dữ liệu biểu thuế, có token cấu hình, và còn ít nhất một nhà cung cấp LLM. ' +
        'Thiếu LLM thì trả 503 kèm `checks.llm.note` — /api/suggest và /api/describe chỉ chạy chế độ không AI (degraded).',
    }),
  },
  '/api/tax': {
    get: op({
      id: 'getTax', tags: ['Tra cứu'], auth: pub,
      summary: 'Tra thuế NK/ACFTA/VAT + cảnh báo chính sách theo mã HS',
      description:
        'Trả thuế suất, đơn vị tính và cảnh báo quản lý chuyên ngành kèm liên kết văn bản pháp luật. ' +
        '⚠️ Thuế suất và chính sách thay đổi theo thông tư — luôn đối chiếu văn bản gốc còn hiệu lực khi khai báo. ' +
        'ACFTA: dùng `acfta.forOrigin` (theo `?origin=`, mặc định CN) — chuỗi "0 (-CN)" nghĩa là hàng Trung Quốc KHÔNG được 0%. ' +
        'Ngoài thuế suất và cảnh báo chính sách, trả kèm `vatReduction` — bản đọc được bằng ' +
        'máy của quyền giảm VAT theo NĐ 174/2025. `eligible: false` nghĩa là mã nằm trong phụ ' +
        'lục loại trừ, vẫn phải khai ở mức `rate`; `noteVi` là nguyên văn lý do. Cùng với đó là ' +
        '`breadcrumb` cho biết mã nằm ở đâu trong biểu thuế — cần thiết với các mã có tên chỉ là ' +
        '"Loại khác". Lưu ý quy ước trường `taxVat` dạng "A/B": A là mức ĐANG áp dụng, B là mức còn lại.',
      params: [
        q('hs', 'Mã HS 8 số, vd 84137090', true),
        q('origin', 'Nước xuất xứ ISO-2 để tính ACFTA (mặc định CN)'),
        q('name', 'Tên hàng tiếng Việt (tuỳ chọn) — dò cờ chính sách THEO TÊN: văn bản không có bảng mã HS (vd 05/2022/TT-BYT "kính mắt") → `policyByName[]` + `reviewByName: true`, mức NOTICE "chuyên viên kiểm". Thiếu thì chỉ khớp bằng tên dòng biểu thuế.'),
        q('purpose', 'Công dụng / chức năng chính tiếng Việt (tuỳ chọn) — cùng mục đích với `name`'),
      ],
      response: TAX_RESPONSE,
      errors: { 400: 'Thiếu tham số hs', 404: 'Mã không có trong biểu thuế (kèm relatedHsCodes)' },
    }),
  },
  '/api/search': {
    get: op({
      id: 'search', tags: ['Tra cứu'], auth: pub,
      summary: 'Tìm mã HS theo từ khoá hoặc mã một phần',
      description:
        'Tra được cả tên hàng theo cách người đi khai gọi, không chỉ lời văn biểu thuế. ' +
        'Mỗi kết quả có thể kèm: `precedent` (cụm từ này đã được khai bao nhiêu lần trong ' +
        'tờ khai đã thông quan, kèm mức tập trung), `tradeTerm` (mục từ điển tên thương mại ' +
        'đã khớp — ĐỌC `appliesWhenVi` trước khi dùng, vì mã đúng thường phụ thuộc khổ, dạng ' +
        'hoặc thành phần), `breadcrumb` (Phần → Chương → Nhóm → Phân nhóm; với mã tên là ' +
        '"Loại khác" thì `scopeVi` mới là phạm vi thật và `excludesVi` là các mã anh em bị loại ' +
        'trừ), và `vatReduction` (`eligible: false` nghĩa là KHÔNG được giảm VAT theo ' +
        'NĐ 174/2025 — khai 8% sẽ bị truy thu). ' +
        'Cấp response còn có `avoidedCodes` (mã đã bị loại khỏi kết quả vì là bẫy nhầm lẫn, ' +
        'kèm lý do), `clarifyingQuestionsVi` (dữ kiện còn thiếu để chốt mã), `formWarning` ' +
        '(hỏi nguyên liệu nhưng tiền lệ là thành phẩm) và `tradeTermNotApplied`. ' +
        'Khi có `avoidedCodes` hoặc `clarifyingQuestionsVi`, hãy nói lại cho người dùng thay vì nuốt đi. ' +
        'Tên gọi chỉ đưa tới nhóm 4 số; lá 8 số do BẢNG QUYẾT ĐỊNH theo thuộc tính chốt: `decisions[]` ' +
        '(mỗi nhóm có bảng: `status` RESOLVED/INSUFFICIENT, `hsCode` + `ruleId` + `reasonVi` + `source` khi chốt ' +
        'được, `missingFacts[]` là thuộc tính còn thiếu kèm `questionVi`, `basis` RULE_TABLE chỉ khi bảng đã ' +
        'verified). Kết quả do bảng chốt có `decision` và đứng đầu. Trả lời câu hỏi bằng `facts` để chốt.',
      params: [
        q('q', 'Từ khoá tiếng Việt hoặc mã HS một phần', true),
        q('limit', 'Số kết quả tối đa (mặc định 10)'),
        q('facts', 'JSON object dữ kiện tường minh theo tên thuộc tính trong `missingFacts`, vd {"thicknessMm":2,"form":"coil"}'),
      ],
    }),
  },
  '/api/notes': {
    get: op({
      id: 'getNotes', tags: ['Tra cứu'], auth: pub,
      summary: 'Chú giải chương — căn cứ áp dụng GIR 1',
      params: [q('chapter', 'Số chương, vd 39', true)],
    }),
  },
  '/api/kg_chapter': {
    get: op({
      id: 'listChapterCodes', tags: ['Tra cứu'], auth: pub,
      summary: 'Liệt kê mã HS trong một chương',
      params: [q('chapter', 'Số chương', true)],
    }),
  },
  '/api/customs-types': {
    get: op({
      id: 'customsTypes', tags: ['Tra cứu'], auth: pub,
      summary: 'Mã loại hình xuất nhập khẩu (QĐ 1357/QĐ-TCHQ)',
      params: [q('code', 'Mã loại hình, vd A11')],
    }),
  },
  '/api/suggest': {
    post: op({
      id: 'suggest', tags: ['AI'], auth: pub,
      summary: 'Gợi ý mã HS bằng AI, kèm audit trail GIR có căn cứ',
      description:
        'Body: `{"description": "tên hàng"}`. Trả `suggestions[]`, `girRulesApplied[]` (mỗi mục có `basis`: ' +
        'RULE_TABLE/DETERMINISTIC là căn cứ chắc, HEURISTIC/LLM_ASSERTED phải kiểm chứng lại), ' +
        '`girDisclaimer`, `rankingSignals[]` (kỹ thuật, không có giá trị pháp lý) và `chapterGuidance[]`. ' +
        '`canCuPhapLy` ghi căn cứ TT 85/2026/TT-BTC (Điều 4, Điều 6.1…) và tài liệu nào thật sự có/đã tra. ' +
        'Kèm `decisions[]` (bảng quyết định theo thuộc tính cho các nhóm trong top gợi ý) và `missingFacts[]` — ' +
        'thuộc tính còn thiếu để chốt lá 8 số; ERP/người dùng trả lời bằng body `facts: {...}` rồi gọi lại. ' +
        'Bảng đã verified chốt được lá thì lá đó lên đầu với `decidedByTable`; chưa verified chỉ tư vấn. ' +
        'Kèm `confusionAlerts[]` từ từ điển mâu thuẫn HS (xem /api/confusion-pairs). ' +
        'Mở công khai, không cần token (mỗi lượt gọi tốn chi phí LLM nên hãy gọi có chủ đích). ' +
        'ĐỌC `status` + `nextAction` TRƯỚC: NEED_FACTS → hỏi người dùng rồi gọi lại với `facts`; ' +
        'NEEDS_EXPERT → AI không chạy được, cần chuyên viên; REVIEW → người dùng chọn/xác nhận. ' +
        'Không có trạng thái tự chốt: `confidence` chưa hiệu chuẩn.',
      requestBody: SUGGEST_REQUEST,
      response: SUGGEST_RESPONSE,
      errors: { 400: 'Thiếu description (≥ 3 ký tự) hoặc JSON sai' },
    }),
  },
  '/api/describe': {
    post: op({
      id: 'describe', tags: ['AI'], auth: pub,
      summary: 'Sinh mô tả khai báo Hải quan chuẩn TT 39/2018 (tối đa 200 ký tự ECUS)',
      description:
        'Khi LLM lỗi, trả `degraded: true` + `llmError{code,message,retryable}` + cảnh báo ' +
        '`DESCRIPTION_DEGRADED` — mô tả khi đó là bản dự phòng thô, không được coi là đạt chuẩn.',
      requestBody: DESCRIBE_REQUEST,
      response: DESCRIBE_RESPONSE,
      errors: { 400: 'Thiếu hsCode', 404: 'Mã không có trong biểu thuế' },
    }),
  },
  '/api/classify': {
    post: op({
      id: 'classify', tags: ['AI'], auth: pub,
      summary: 'Phân loại có cây quyết định + bảng phân giải cụm mã dễ nhầm',
      description: 'Đọc `status` + `nextAction` TRƯỚC (cùng bảng với /api/suggest: REVIEW, NEED_FACTS, NEEDS_EXPERT ' +
        '[LOW_CONFIDENCE, FEATURE_CONFLICT, ENGINE_TIMEOUT, LLM_REJECTED], RESOLVED_BY_TABLE, NO_CANDIDATES). ' +
        'Nhận nguyên tiêu đề Taobao tiếng Trung (`queryUnderstanding`). Trả `results[]` (mã 8 hoặc 6 số), ' +
        '`missingStructured[]` (trường bắt buộc còn thiếu theo nhóm 4 số, câu hỏi VI + ZH), `originAssessment`, ' +
        '`girRulesApplied[]` (có `basis`), `llmRejectedCodes` khi AI trả mã không có trong biểu thuế. ' +
        '`dossier.declarationOptions[]` (≤ 4, 10/10/2026): bảng phương án khai cho chuyên viên — `{hs, nameVi, kind: CHON|CUNG_NHOM|' +
        'THEO_VAT_LIEU|KHAC, canCuVi, dieuKienVi, ruiRo: THAP|VUA|CAO, ruiRoVi, thue{mfn, acftaCn (null khi CN bị loại trừ), ' +
        'acftaNoteVi, vat}, coChinhSach{level, lineVi}, khuyenNghi}`; đúng một phương án `khuyenNghi=true` (mã máy chọn). ' +
        'THEO_VAT_LIEU = đường 73.26/76.16/39.26… cho bộ phận/tấm/vỏ — luôn liệt kê kèm rủi ro theo Chú giải 2 Phần XV/XVI/XVII ' +
        '(bộ phận nhận dạng được cho máy/xe phải xếp theo máy/xe), không phải gợi ý khai. Động cơ cũ: chỉ CHON + CUNG_NHOM + THEO_VAT_LIEU.',
      requestBody: CLASSIFY_REQUEST,
      errors: { 400: 'Thiếu tenHang', 502: 'Lỗi phân loại' },
    }),
  },
  '/api/extract-specs': {
    post: op({
      id: 'extractSpecs', tags: ['AI'], auth: bearer,
      summary: 'Rút thông số chuẩn từ chữ tiếng Trung (thông số trang + chữ OCR trong ảnh)',
      description: 'Không nhận ảnh — bên gọi tự OCR rồi gửi chữ. Từ điển mở (/api/attribute-synonyms) trước, AI sau; ' +
        'mỗi thông số có `evidence` (đoạn chữ + link ảnh), AI đưa bằng chứng không có trong chữ nguồn thì bị bỏ. ' +
        'Rewrite tới /api/classify?mode=extract_specs.',
      requestBody: {
        type: 'object',
        properties: {
          titleZh: str('Tiêu đề gốc'),
          specsZh: { type: 'array', items: { type: 'object', properties: { key: str('Nhãn tiếng Trung, vd 材质'), value: str('Giá trị') } } },
          imageTexts: { type: 'array', items: { type: 'object', properties: { url: str('Link ảnh'), text: str('Chữ OCR') } } },
          needKeys: { type: 'array', items: { type: 'string' }, description: 'Khóa chuẩn cần tìm, vd ["material","power"]' },
        },
      },
      errors: { 400: 'Không có chữ nào để đọc', 502: 'Lỗi rút thông số' },
    }),
  },
  '/api/declaration-sheet': {
    post: op({
      id: 'declarationSheet', tags: ['AI'], auth: bearer,
      summary: 'Phiếu hồ sơ khai báo: ô cần khai theo mã HS, điền từ SKU đang chọn + thông số trang + bảng kiện + ảnh (vision/OCR) + mô tả, kèm nguồn',
      description: 'Ô chung TT 39/2018 (công dụng, chất liệu, kích thước, nhãn hiệu, model) + ô theo nhóm hàng. ' +
        'Mỗi ô có valueVi, status (HAVE | UNVERIFIED | UNTRANSLATED | MISSING), source (SITE | IMAGE_OCR | IMAGE_AI | CUSTOMER | SALES | OPS | ADMIN | DOCUMENT), method (DICTIONARY | LLM | SKU_SELECTED | PACKAGING | VISION | MERGED_PARTS | SUPPLEMENT | KNOWN), evidence. ' +
        'Ưu tiên nguồn (09/10/2026): người bổ sung > `skuSelected` (lựa chọn đang chọn, tin 0.95, bằng chứng "SKU đang chọn: nhóm=giá trị", thắng bảng thuộc tính liệt kê nhiều giá trị) > bảng thuộc tính trang > `packaging` (bảng 商品件重尺 → ô riêng packageDimensions/packageWeight/packageVolume, KHÔNG đè kích thước sản phẩm, không vào mô tả ECUS; chỉ điền tạm ô dimensions khi trang không có, đánh dấu `packaging:true`) > ảnh (`images[]` ≤ 3 URL alicdn/aliexpress-media/taobao → Gemini vision, ≤ 2 ảnh một lượt, nguồn IMAGE_AI tin ≤ 0.8, chỉ điền ô còn thiếu; bật/tắt bằng env HS_SHEET_VISION, mặc định bật khi có GEMINI_API_KEY) > `descriptionText` (chỉ dòng "nhãn：giá trị" hoặc có số + đơn vị, ≤ 4.000 ký tự, làm nguồn chữ cho AI). ' +
        '`images[]` cho biết ảnh nào là rác (không có thông số), ảnh nào đã đọc bằng AI (`vision`, `role`, `preview` = chữ AI nhìn thấy). `extraction.vision` = trạng thái đọc ảnh (used, engine, llmError). `missing[]` = ô bắt buộc còn thiếu kèm câu hỏi Việt/Trung. ' +
        '`trademark` = nhãn hiệu + rủi ro SHTT (TT 13/2015 & 13/2020) + chữ gợi hàng nhái. Có hsCode → thêm `description` (mô tả ECUS từ phiếu) và `policy` (mức chính sách). ' +
        'Không lưu gì — bên gọi tự lưu phiếu từng món, gửi lại bổ sung qua `supplements`. Rewrite tới /api/describe?mode=sheet.',
      requestBody: {
        type: 'object',
        properties: {
          titleZh: str('Tiêu đề gốc'), titleVi: str('Tiêu đề đã dịch (nếu có)'),
          specsZh: { type: 'array', items: { type: 'object', properties: { key: str('Nhãn tiếng Trung'), value: str('Giá trị') } } },
          variant: { type: 'array', items: { type: 'object', properties: { label: str('Nhãn'), value: str('Phân loại khách chọn') } } },
          imageTexts: { type: 'array', items: { type: 'object', properties: { url: str('Link ảnh'), text: str('Chữ OCR') } } },
          skuSelected: { type: 'array', description: 'Lựa chọn ĐANG CHỌN trên trang (nguồn mạnh nhất về biến thể; thay cho variant khi có). ≤ 20 mục.', items: { type: 'object', required: ['group', 'value'], properties: { group: str('Nhóm thuộc tính tiếng Trung, vd 颜色分类 / 度数'), value: str('Giá trị đang chọn, vd 商务金【升级防蓝光镜片】'), imageUrl: str('Ảnh của lựa chọn (dùng làm ảnh sku nếu images trống)'), qty: { type: 'number', description: 'Số lượng chọn' } } } },
          packaging: { type: 'object', description: 'Kiện của SKU đang chọn (bảng 商品件重尺 / 包装信息). Vào ô riêng packageDimensions/packageWeight/packageVolume — không phải kích thước sản phẩm.', properties: { sku: { type: 'object', description: 'Thuộc tính SKU của dòng kiện, vd {镜框颜色:"金色"}' }, lengthCm: { type: 'number' }, widthCm: { type: 'number' }, heightCm: { type: 'number' }, volumeCm3: { type: 'number', description: 'Thiếu thì tính từ 3 cạnh' }, weightG: { type: 'number' } } },
          descriptionText: str('Chữ mô tả 商品详情 ≤ 8.000 ký tự — dịch vụ tự lọc dòng có cấu trúc trước khi đưa AI'),
          images: { type: 'array', description: 'Ảnh gửi AI đọc (≤ 3; chỉ host alicdn / aliexpress-media / taobao; role sku ưu tiên trước main; AI đọc tối đa 2 ảnh)', items: { type: 'object', required: ['url'], properties: { url: str('URL ảnh công khai'), role: { type: 'string', enum: ['sku', 'main'], description: 'sku = ảnh của lựa chọn đang chọn; main = ảnh chính' } } } },
          hsCode: str('Mã HS 8 số (bỏ trống = chỉ ô chung, chưa viết mô tả)'),
          supplements: { type: 'array', items: { type: 'object', properties: { key: str('Khóa chuẩn'), valueVi: str('Giá trị tiếng Việt'), source: str('CUSTOMER | SALES | OPS | ADMIN | DOCUMENT') } } },
          known: { type: 'array', items: { type: 'object' }, description: 'Ô đã rút ở lần lập phiếu trước (đỡ một lượt AI)' },
        },
      },
      errors: { 400: 'Không có chữ nào để đọc', 502: 'Lỗi lập phiếu' },
    }),
  },
  '/api/feedback': {
    post: op({
      id: 'feedback', tags: ['AI'], auth: bearer,
      summary: 'Ghi nhận giám đốc sửa mã HS',
      description: 'Phải kiểm tra `ok: true`. 503 FEEDBACK_NOT_PERSISTED = CHƯA lưu được — giữ `record` và gửi lại sau.',
      requestBody: {
        type: 'object', required: ['feedbackType'],
        properties: {
          feedbackType: str('vd "correction"'), productName: str('Tên hàng'),
          hsCodeAtTime: str('Mã AI đã gợi ý'), correctedHsCode: str('Mã đúng (8 số, có trong biểu thuế)'),
          directorNote: str('Ghi chú'), orderCode: str('Mã đơn'),
        },
      },
      response: { type: 'object', properties: { ok: { type: 'boolean' }, feedbackId: { type: 'string' }, persisted: { type: 'boolean' } } },
      errors: { 400: 'Thiếu feedbackType hoặc correctedHsCode không hợp lệ (INVALID_HS_CODE)', 503: 'FEEDBACK_NOT_PERSISTED — bản ghi chưa được lưu' },
    }),
  },
  '/api/confusion-pairs': {
    get: op({
      id: 'confusionPairs', tags: ['Tra cứu'], auth: bearer,
      summary: 'Từ điển mâu thuẫn HS: mặt hàng DN hay khai mã A, Hải quan hay ấn định mã B, kèm tiêu chí phân biệt',
      description:
        'Rewrite tới /api/dataset?resource=confusion_pairs. `q=` nhận diện theo tên hàng, `hs=` tra theo mã ' +
        '(mã đúng hoặc mã hay khai sai), `id=` một mục (MT-049…). Không tham số → thống kê + danh sách. ' +
        'Cùng dữ liệu này, `/api/suggest` và `/api/search` trả `confusionAlerts[]` (HIGH khi gợi ý đầu rơi vào ' +
        'mã DN hay khai sai; CHECK khi tên hàng khớp mục; INFO khi chỉ trùng mã). Nguồn CEO + Grok, các mục ' +
        '`verified:false` cho tới khi duyệt — cần token.',
      params: [q('q', 'Tên hàng'), q('hs', 'Mã HS 4/6/8 số'), q('id', 'Mã mục, vd MT-049')],
    }),
  },
};

// Các resource của /api/dataset — sinh path riêng cho từng cái, đúng theo allowlist.
const DATASET_META = {
  kg_stats: ['Thống kê kho dữ liệu', '/api/kg_stats'],
  chapters: ['Chỉ mục chương HS', '/api/chapters'],
  conflicts: ['Cảnh báo mã dễ nhầm', '/api/conflicts'],
  precedents: ['Tiền lệ phân loại TB-TCHQ', '/api/precedents'],
  materials: ['Phân loại vật liệu', '/api/materials'],
  ministries: ['14 bộ ngành quản lý chuyên ngành', '/api/ministries'],
  legal_docs: ['Thư viện văn bản pháp luật', '/api/legal-docs'],
  policy_procedures: ['Thủ tục kiểm tra chuyên ngành', '/api/policy-procedures'],
  products: ['Corpus sản phẩm cho mã "Loại khác"', '/api/products'],
  accuracy: ['Benchmark độ chính xác (công khai, không tô hồng)', '/api/accuracy'],
  data_quality: ['Báo cáo chất lượng dữ liệu — gồm cả điểm yếu', '/api/data-quality'],
  declaration_fields: ['Danh mục trường cần khai theo nhóm hàng (?hs=4/6/8 số), câu hỏi VI + ZH', '/api/declaration-fields'],
  attribute_synonyms: ['Từ điển nhãn thông số tiếng Trung → khóa chuẩn (dữ liệu mở CC BY 4.0)', '/api/attribute-synonyms'],
  ktcn_regime: ['Khung kiểm tra chuyên ngành 2026 (NĐ 37/2026, 3 mức rủi ro): danh mục mới từng bộ + căn cứ cũ đã bị thay', '/api/ktcn-regime'],
  demand: ['Nhu cầu bổ sung tri thức rút từ hàng thật (phiếu hồ sơ khai báo): mã HS chưa đối chiếu KTCN 2026, nhãn hiệu chưa theo dõi, chữ Trung từ điển chưa hiểu, ô hay thiếu — chỉ mức ưu tiên, không số lượng/tên hàng/khách (?days=90)', '/api/demand'],
  legal_status: ['Hiệu lực văn bản theo sổ đăng ký cộng đồng oz-wiki-plhq (?so=28/2026/TT-BCT,1182/QĐ-BCT); không tham số → văn bản thư viện lệch tình trạng với sổ', '/api/legal-status'],
};

for (const [resource, [summary, prettyPath]] of Object.entries(DATASET_META)) {
  if (!PUBLIC_DATASET_RESOURCES.has(resource)) continue; // bám sát allowlist
  paths[prettyPath] = {
    get: op({
      id: `dataset_${resource}`, tags: ['Tra cứu'], auth: pub, summary,
      description: `Rewrite tới /api/dataset?resource=${resource}`,
      params: resource === 'legal_status'
        ? [q('so', 'Số hiệu văn bản, nhiều số cách nhau dấu phẩy (tối đa 50)')]
        : [q('hs', 'Lọc theo mã HS (nếu resource hỗ trợ)')],
    }),
  };
}

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'HS Knowledge Base API',
    version: pkg.version || '2.0.0',
    summary: 'Kho tri thức mở về mã HS, thuế và pháp lý xuất nhập khẩu Việt Nam',
    description: [
      'API tra mã HS, thuế suất, chính sách mặt hàng và sinh mô tả khai báo Hải quan theo TT 39/2018.',
      '',
      '## Quyền truy cập',
      '',
      `**Không cần token** — nhóm tra cứu (${[...PUBLIC_ENDPOINTS].map((e) => `/api/${e}`).join(', ')} và các resource dữ liệu).`,
      'Đây là kho tri thức mở: bất kỳ AI hay người nào cũng gọi được ngay.',
      '',
      `**Không cần token, không giới hạn lượt** — nhóm AI (${PUBLIC_LLM_ENDPOINTS.map((e) => `\`/api/${e}\``).join(', ')}): gọi POST thẳng, không cần header Authorization. Mỗi lượt tốn chi phí mô hình nên hãy gọi có chủ đích.`,
      '',
      '**Cần Bearer token** — nhóm quản trị và ghi dữ liệu (`/api/feedback`, sửa biểu thuế, dashboard, `extract-specs`, `declaration-sheet`).',
      '',
      '## Đọc kết quả cho đúng',
      '',
      'Mọi trích dẫn quy tắc GIR đều kèm trường `basis`:',
      '',
      '| basis | Nghĩa | Dùng cho hồ sơ giải trình Hải quan? |',
      '|---|---|---|',
      '| `RULE_TABLE` | Bảng quyết định do người soạn, có dẫn văn bản gốc | Được |',
      '| `DETERMINISTIC` | Hệ thống suy ra từ tín hiệu chắc chắn | Được |',
      '| `HEURISTIC` | Dò từ khoá / điểm ước lượng | Cần người kiểm chứng |',
      '| `LLM_ASSERTED` | Mô hình tự khai, chưa kiểm chứng | Không |',
      '',
      '## Miễn trừ trách nhiệm',
      '',
      'Đây là **tài liệu tham khảo nghiệp vụ**, không phải phán quyết phân loại của cơ quan Hải quan và không phải tư vấn pháp lý.',
      'Pháp luật XNK thay đổi liên tục — luôn đối chiếu văn bản gốc còn hiệu lực tại thời điểm khai báo.',
    ].join('\n'),
    license: { name: 'MIT (code) / CC BY-SA 4.0 (dữ liệu)', url: 'https://github.com/ozvietnam/hs-code-api/blob/main/NOTICE.md' },
    contact: { name: 'HS Knowledge Base', url: 'https://github.com/ozvietnam/hs-code-api' },
  },
  servers: [{ url: BASE, description: 'Production' }],
  tags: [
    { name: 'Tra cứu', description: 'Đọc kho tri thức — không cần token' },
    { name: 'AI', description: 'Sinh nội dung bằng mô hình — cần token' },
    { name: 'Hệ thống', description: 'Giám sát' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', description: 'HS_API_TOKEN' },
    },
    schemas: SCHEMAS,
  },
  paths,
  'x-generated': {
    by: 'scripts/build-openapi.mjs',
    at: new Date().toISOString().slice(0, 10),
    note: 'Sinh tự động từ lib/public-access.js — đừng sửa tay, sửa nguồn rồi chạy npm run build.',
  },
};

const out = join(root, 'public', 'openapi.json');
writeFileSync(out, `${JSON.stringify(spec, null, 2)}\n`);
console.log('Đã ghi', out);
console.log(`  ${Object.keys(paths).length} path · công khai: ${PUBLIC_ENDPOINTS.size} endpoint + ${PUBLIC_DATASET_RESOURCES.size} resource`);
