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
      params: [q('hs', 'Mã HS 8 số, vd 84137090', true), q('origin', 'Nước xuất xứ ISO-2 để tính ACFTA (mặc định CN)')],
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
      id: 'suggest', tags: ['AI'], auth: bearer,
      summary: 'Gợi ý mã HS bằng AI, kèm audit trail GIR có căn cứ',
      description:
        'Body: `{"description": "tên hàng"}`. Trả `suggestions[]`, `girRulesApplied[]` (mỗi mục có `basis`: ' +
        'RULE_TABLE/DETERMINISTIC là căn cứ chắc, HEURISTIC/LLM_ASSERTED phải kiểm chứng lại), ' +
        '`girDisclaimer`, `rankingSignals[]` (kỹ thuật, không có giá trị pháp lý) và `chapterGuidance[]`. ' +
        'Kèm `decisions[]` (bảng quyết định theo thuộc tính cho các nhóm trong top gợi ý) và `missingFacts[]` — ' +
        'thuộc tính còn thiếu để chốt lá 8 số; ERP/người dùng trả lời bằng body `facts: {...}` rồi gọi lại. ' +
        'Bảng đã verified chốt được lá thì lá đó lên đầu với `decidedByTable`; chưa verified chỉ tư vấn. ' +
        'Kèm `confusionAlerts[]` từ từ điển mâu thuẫn HS (xem /api/confusion-pairs). ' +
        'Cần token vì mỗi lượt gọi tốn chi phí LLM. ' +
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
      id: 'describe', tags: ['AI'], auth: bearer,
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
      id: 'classify', tags: ['AI'], auth: bearer,
      summary: 'Phân loại có cây quyết định + bảng phân giải cụm mã dễ nhầm',
      description: 'Trả `results[]` (mã 8 hoặc 6 số — 6 số nghĩa là còn thiếu dữ kiện, xem `missing[]`), ' +
        '`girRulesApplied[]` (có `basis`), `llmRejectedCodes` khi AI trả mã không có trong biểu thuế.',
      requestBody: CLASSIFY_REQUEST,
      errors: { 400: 'Thiếu tenHang', 502: 'Lỗi phân loại' },
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
};

for (const [resource, [summary, prettyPath]] of Object.entries(DATASET_META)) {
  if (!PUBLIC_DATASET_RESOURCES.has(resource)) continue; // bám sát allowlist
  paths[prettyPath] = {
    get: op({
      id: `dataset_${resource}`, tags: ['Tra cứu'], auth: pub, summary,
      description: `Rewrite tới /api/dataset?resource=${resource}`,
      params: [q('hs', 'Lọc theo mã HS (nếu resource hỗ trợ)')],
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
      '**Cần Bearer token** — nhóm AI (`/api/suggest`, `/api/describe`, `/api/classify`, `/api/match`) vì mỗi lượt gọi tốn chi phí mô hình, và nhóm quản trị.',
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
